import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY; // Using generic publishable key, ideally use service role if available for seeding but this works if policies allow or if we use service role env var

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key in .env.local');
    process.exit(1);
}

// Initialize Supabase Client
const supabase = createClient(supabaseUrl, supabaseKey);

// Define interfaces for the JSON structure
interface JakartaHSPItem {
    success: boolean;
    message: string;
    data: {
        id: number;
        pekerjaan: string; // "5.1.2.4 Pemasangan 1 Unit..."
        satuan: { id: number; nama: string };
        kategori_material: JakartaCategory[];
    };
}

interface JakartaCategory {
    kategori_material_id: number;
    kategori_material_nama: string; // "Tenaga Kerja", "Material", "Peralatan"
    detail: JakartaComponent[];
}

interface JakartaComponent {
    id: number;
    koefisien: string; // "1.167"
    harga_satuan: string; // "251920"
    material: { id: number; nama_material: string };
    satuan: { id: number; nama: string };
    kode_material: string | null;
}

const CATEGORY_MAP: Record<string, string> = {
    'Tenaga Kerja': 'labor',
    'Material': 'material',
    'Peralatan': 'equipment',
};

async function seedJakartaAHSP() {
    console.log('🚀 Starting Jakarta AHSP Import...');

    const filePath = path.join(process.cwd(), 'data/hsp_details.json');
    if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        process.exit(1);
    }

    const rawData = fs.readFileSync(filePath, 'utf-8');
    let items: JakartaHSPItem[] = [];
    try {
        items = JSON.parse(rawData);
    } catch (e) {
        console.error('❌ Failed to parse JSON', e);
        process.exit(1);
    }

    console.log(`📦 Found ${items.length} AHSP items to process.`);

    // 1. Get Workspace ID (Adding to default workspace)
    const { data: workspaces } = await supabase.from('workspaces').select('id').limit(1);
    if (!workspaces || workspaces.length === 0) {
        console.error('❌ No workspace found.');
        return;
    }
    const workspaceId = workspaces[0].id;

    // 2. Pre-fetch existing resources to minimize DB calls (optional, but good for performance if list isn't huge.
    // Given potential size, we'll upsert or check existence dynamically to be safe).
    // Actually, let's process AHSP by AHSP.

    let processedCount = 0;
    let errorCount = 0;

    for (const item of items) {
        const ahspData = item.data;
        if (!ahspData) continue;

        const fullTitle = ahspData.pekerjaan.trim();
        // Try to extract code if present, e.g. "5.1.2.4 Pemasangan..."
        const codeMatch = fullTitle.match(/^([\d.]+)\s+(.+)$/);
        const code = codeMatch ? codeMatch[1] : null;
        const name = codeMatch ? codeMatch[2] : fullTitle;
        const unit = ahspData.satuan?.nama || 'ls';

        try {
            // A. Check if Master exists
            const { data: existingMaster } = await supabase
                .from('ahsp_masters')
                .select('id')
                .eq('workspace_id', workspaceId)
                .eq('name', name)
                .maybeSingle();

            let master = existingMaster;

            if (!master) {
                const { data: newMaster, error: masterError } = await supabase
                    .from('ahsp_masters')
                    .insert({
                        workspace_id: workspaceId,
                        name: name,
                        code: code,
                        unit: unit,
                        overhead_percent: 10,
                    })
                    .select()
                    .single();

                if (masterError) {
                    console.error(`Error creating master ${name}:`, masterError);
                    errorCount++;
                    continue;
                }
                master = newMaster;
            }

            // B. Process Components
            if (!master) continue;

            // Flatten components from all categories
            const allComponents = ahspData.kategori_material.flatMap(cat =>
                cat.detail.map(det => ({
                    ...det,
                    categoryKey: cat.kategori_material_nama // "Tenaga Kerja" etc.
                }))
            );

            for (const comp of allComponents) {
                const resourceName = comp.material?.nama_material;
                const resourceUnit = comp.satuan?.nama;
                const resourcePrice = parseFloat(comp.harga_satuan) || 0;
                const resourceCategory = CATEGORY_MAP[comp.categoryKey] || 'other';

                if (!resourceName) continue;

                // B.1 Upsert Resource
                // We use a simplified check-then-insert or explicit UPSERT if we have a unique constraint.
                // `pricing_resources` usually has (workspace_id, name) or similar uniqueness.
                // Let's try upserting based on name to update price if needed, or ignore if exists.

                // Check if resource exists first to get ID
                let resourceId: string | null = null;

                const { data: existingResource } = await supabase
                    .from('pricing_resources')
                    .select('id')
                    .eq('workspace_id', workspaceId)
                    .eq('name', resourceName)
                    .eq('source', 'Jakarta 2024')
                    .single();

                if (existingResource) {
                    resourceId = existingResource.id;
                } else {
                    // Create new
                    const { data: newResource, error: resError } = await supabase
                        .from('pricing_resources')
                        .insert({
                            workspace_id: workspaceId,
                            name: resourceName,
                            unit: resourceUnit,
                            price_default: resourcePrice,
                            category: resourceCategory,
                            source: 'Jakarta 2024',
                            description: `Imported from Jakarta AHSP. Code: ${comp.kode_material || '-'}`,
                        })
                        .select()
                        .single();

                    if (resError) {
                        console.error(`Error creating resource ${resourceName}:`, resError);
                        continue;
                    }
                    resourceId = newResource.id;
                }

                if (!resourceId) continue;

                // B.2 Create AHSP Component
                const coefficient = parseFloat(comp.koefisien) || 0;

                await supabase
                    .from('ahsp_components')
                    .insert({
                        ahsp_id: master.id,
                        resource_id: resourceId,
                        coefficient: coefficient
                    });
            }

            processedCount++;
            if (processedCount % 10 === 0) {
                console.log(`✅ Processed ${processedCount}/${items.length} AHSPs...`);
            }

        } catch (err) {
            console.error(`Unexpected error processing ${name}:`, err);
            errorCount++;
        }
    }

    console.log(`🎉 Import Complete!`);
    console.log(`Summmary: ${processedCount} imported, ${errorCount} failed.`);
}

seedJakartaAHSP();
