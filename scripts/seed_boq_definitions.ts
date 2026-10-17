import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Supabase
console.log("CWD:", process.cwd());
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Trying the key that worked in the other script first, or fallback to service key if defined
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- Definition Templates ---

const TEMPLATES = {
    // 1. STANDARD BOX (Concrete, Excavation)
    BOX: {
        name: "Volume Box (P x L x T)",
        unit: "m3",
        elements: [
            { name: "Panjang", symbol: "P", unit: "m" },
            { name: "Lebar", symbol: "L", unit: "m" },
            { name: "Tinggi/Dalam", symbol: "T", unit: "m" },
            { name: "Jumlah", symbol: "N", unit: "bh" }
        ]
    },
    // 2. AREA (Walls, Floors, Painting, Formwork)
    AREA: {
        name: "Luas Persegi (P x L)",
        unit: "m2",
        elements: [
            { name: "Panjang", symbol: "P", unit: "m" },
            { name: "Lebar/Tinggi", symbol: "L", unit: "m" },
            { name: "Jumlah", symbol: "N", unit: "bh" }
        ]
    },
    // 3. LINEAR (Pipes, Wiring, Skirting, Lis)
    LINEAR: {
        name: "Panjang Linear",
        unit: "m",
        elements: [
            { name: "Panjang", symbol: "P", unit: "m" },
            { name: "Jumlah", symbol: "N", unit: "bh" }
        ]
    },
    // 4. COUNT (Points, Accessories)
    COUNT: {
        name: "Jumlah Unit (Count)",
        unit: "bh", // or 'titik', 'unit'
        elements: [
            { name: "Jumlah", symbol: "N", unit: "bh" }
        ]
    },
    // 5. WEIGHT (Rebar) - Simple kg input
    WEIGHT: {
        name: "Berat Besi",
        unit: "kg",
        elements: [
            { name: "Berat Total", symbol: "W", unit: "kg" }
        ]
    },
    // 6. LUMPSUM
    LUMPSUM: {
        name: "Lumpsum",
        unit: "ls",
        elements: [
            { name: "Nilai (1.0)", symbol: "LS", unit: "ls" }
        ]
    },
    // 7. FOUNDATION (Trapezoid)
    FOUNDATION: {
        name: "Pondasi Batu Kali (Trapesium)",
        unit: "m3",
        elements: [
            { name: "Lebar Atas", symbol: "La", unit: "m" },
            { name: "Lebar Bawah", symbol: "Lb", unit: "m" },
            { name: "Tinggi", symbol: "T", unit: "m" },
            { name: "Panjang", symbol: "P", unit: "m" }
        ]
    }
};

// --- Keyword Mapping ---
// Maps keywords in WBS Name to a Template Key
const KEYWORD_MAP = [
    // FOUNDATION
    { keys: ['batu kali', 'pondasi lajur'], template: 'FOUNDATION' },
    { keys: ['galian'], template: 'BOX' },
    { keys: ['urugan'], template: 'BOX' },

    // CONCRETE (Sloof, Kolom, Balok usually m3, but could be m2 for formwork? Usually concrete work)
    { keys: ['beton', 'sloof', 'kolom', 'balok', 'plat', 'tangga'], template: 'BOX' },

    // WALLS
    { keys: ['dinding', 'bata', 'plester', 'aci', 'cat', 'painting'], template: 'AREA' },

    // FLOORS
    { keys: ['lantai', 'keramik', 'granit', 'parquet', 'plafond', 'ceiling'], template: 'AREA' },
    { keys: ['waterproof'], template: 'AREA' },

    // ROOFing
    { keys: ['atap', 'genteng', 'seng'], template: 'AREA' },
    { keys: ['kuda-kuda', 'reng', 'usuk'], template: 'LINEAR' }, // Or m2/m3 depending, assume Linear/Area? Let's say Area for whole roof structure usually or m3 wood. Hard to guess. 
    // Let's safe bet for structural wood/steel: Linear or Weight. 
    // For 'Kuda-kuda baja', usually kg. 
    { keys: ['baja'], template: 'WEIGHT' },

    // MEP
    { keys: ['pipa', 'kabel', 'lis', 'plint'], template: 'LINEAR' },
    { keys: ['kunci', 'sanitar', 'kran', 'shower', 'lampu', 'saklar', 'stop kontak'], template: 'COUNT' },

    // PRELIMINARY
    { keys: ['persiapan', 'pembersihan', 'mobilisasi'], template: 'LUMPSUM' },
];

async function seedBOQDefinitions() {
    console.log("Starting BOQ Definition Seeding...");

    // 1. Fetch Default Workspace
    const { data: workspaces } = await supabase.from('workspaces').select('id').limit(1);
    const workspaceId = workspaces?.[0]?.id;

    if (!workspaceId) {
        console.error("No workspace found.");
        return;
    }
    console.log(`Using Workspace: ${workspaceId}`);

    // 2. Clear Existing Definitions? 
    // Maybe better to upsert or check existing to avoid duplicates if run multiple times.
    // For this script, we'll try to find existing templates by Code first.

    const templateIds: Record<string, string> = {};

    for (const [key, tpl] of Object.entries(TEMPLATES)) {
        const code = `TPL_${key}`; // Unique code for our template

        // Check exist
        const { data: existing } = await supabase
            .from('boq_definitions')
            .select('id')
            .eq('workspace_id', workspaceId)
            .eq('code', code)
            .single();

        let defId = existing?.id;

        if (!defId) {
            console.log(`Creating Template: ${tpl.name} (${key})`);
            // Create Definition
            const { data: newDef, error: defError } = await supabase
                .from('boq_definitions')
                .insert({
                    workspace_id: workspaceId,
                    code: code,
                    name: tpl.name,
                    unit: tpl.unit
                })
                .select()
                .single();

            if (defError) {
                console.error(`Error creating def ${key}:`, defError);
                continue;
            }
            defId = newDef.id;

            // Create Elements
            const elementsPayload = tpl.elements.map(el => ({
                definition_id: defId,
                name: el.name,
                symbol: el.symbol,
                unit: el.unit
            }));

            const { error: elError } = await supabase.from('boq_elements').insert(elementsPayload);
            if (elError) console.error(`Error creating elements for ${key}:`, elError);
        } else {
            console.log(`Template existing: ${key}`);
        }

        templateIds[key] = defId;
    }

    // 3. WBS Processing
    // Fetch WBS items that don't have a definition yet? Or overwrite? 
    // Let's fetch ALL 'detail' items.
    const { data: wbsItems } = await supabase
        .from('work_breakdown_structure')
        .select('id, name, indent_level, boq_definition_id')
        .eq('workspace_id', workspaceId)
        // .is('boq_definition_id', null) // Only undefined ones? Or overwrite to fix users request
        .order('indent_level', { ascending: false }); // Process leaves first? Doesn't matter much.

    if (!wbsItems) return;

    console.log(`Processing ${wbsItems.length} WBS Items...`);

    let updatedCount = 0;

    for (const item of wbsItems) {
        // Logic: Simple Keyword Matching
        const name = item.name.toLowerCase();
        let matchedTemplateKey = null;

        // Special Case: If Level < 2, maybe Lumpsum or nothing (Group)?
        // User script usually puts items in Level 2-5.

        for (const map of KEYWORD_MAP) {
            if (map.keys.some(k => name.includes(k))) {
                matchedTemplateKey = map.template;
                break;
            }
        }

        // Default fallback?
        if (!matchedTemplateKey) {
            // If explicitly "pekerjaan ...", maybe LS? 
            // Default to BOX if unknown detailed item? Or leave null?
            // Let's leave null to allow manual review, OR default to 'LUMPSUM' if uncertain.
            // User asked "kira2 elemennya apa saja".
            // Better to leave NULL if unsure, to avoid noise.
            continue;
        }

        const defId = templateIds[matchedTemplateKey];
        if (defId && defId !== item.boq_definition_id) {
            await supabase.from('work_breakdown_structure').update({ boq_definition_id: defId }).eq('id', item.id);
            updatedCount++;
        }
    }

    console.log(`Seeding Complete. Updated ${updatedCount} items.`);
}

seedBOQDefinitions();
