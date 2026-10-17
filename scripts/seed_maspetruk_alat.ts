import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedEquipment() {
    console.log("🚀 Seeding Equipment Data for Kota Semarang...");

    const { data: workspaces } = await supabase.from('workspaces').select('id').limit(1);
    const workspaceId = workspaces?.[0]?.id;

    if (!workspaceId) {
        console.error("❌ No workspace found.");
        process.exit(1);
    }

    const jsonPath = path.join(process.cwd(), "data/maspetruk_alat_semarang.json");
    if (!fs.existsSync(jsonPath)) {
        console.error("❌ JSON file not found:", jsonPath);
        process.exit(1);
    }
    const rawData = fs.readFileSync(jsonPath, "utf-8");
    const items = JSON.parse(rawData);

    console.log(`Found ${items.length} equipment items to insert.`);

    // Payload
    const payload = items.map((item: any) => ({
        workspace_id: workspaceId,
        name: item.name,
        category: 'equipment',
        unit: item.unit,
        price_default: item.price,
        source: 'MasPetruk - Kota Semarang 2025',
        description: 'Auto-imported from MasPetruk (ALAT)'
    }));

    let insertedCount = 0;
    let skippedCount = 0;

    for (const item of payload) {
        // Check for duplicates
        const { data: existing } = await supabase
            .from('pricing_resources')
            .select('id')
            .eq('workspace_id', workspaceId)
            .eq('name', item.name)
            .eq('category', 'equipment')
            .limit(1);

        if (existing && existing.length > 0) {
            skippedCount++;
            continue;
        }

        const { error } = await supabase.from('pricing_resources').insert(item);
        if (error) {
            console.error(`Error inserting ${item.name}:`, error.message);
        } else {
            insertedCount++;
        }
    }

    console.log(`\n✨ Done!`);
    console.log(`   Inserted: ${insertedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
}

seedEquipment();
