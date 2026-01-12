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

async function seedLabor() {
    console.log("🚀 Seeding Labor Data for Kota Semarang...");

    // 1. Get Workspace ID (Assuming first workspace)
    const { data: workspaces } = await supabase.from('workspaces').select('id').limit(1);
    const workspaceId = workspaces?.[0]?.id;

    if (!workspaceId) {
        console.error("❌ No workspace found.");
        process.exit(1);
    }

    console.log(`target workspace: ${workspaceId}`);

    // 2. Read JSON
    const jsonPath = path.join(process.cwd(), "data/maspetruk_labor_semarang.json");
    if (!fs.existsSync(jsonPath)) {
        console.error("❌ JSON file not found:", jsonPath);
        process.exit(1);
    }
    const rawData = fs.readFileSync(jsonPath, "utf-8");
    const laborItems = JSON.parse(rawData);

    console.log(`Found ${laborItems.length} items to insert.`);

    // 3. Prepare Payload
    const payload = laborItems.map((item: any) => ({
        workspace_id: workspaceId,
        name: item.name,
        category: 'labor', // Hardcoded category
        unit: item.unit,
        price_default: item.price,
        source: 'MasPetruk - Kota Semarang 2025',
        description: 'Auto-imported from MasPetruk (UPAH)'
    }));

    // 4. Insert (Upsert based on name + workspace? No, ID is random. Insert new.)
    // We should probably check if exists first to avoid dupes, or just wipe?
    // Let's check for dupes by name.

    let insertedCount = 0;
    let skippedCount = 0;

    for (const item of payload) {
        // Check exist
        const { data: existing } = await supabase
            .from('pricing_resources')
            .select('id')
            .eq('workspace_id', workspaceId)
            .eq('name', item.name)
            .eq('category', 'labor')
            .eq('unit', item.unit)
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
    console.log(`   Skipped (Duplicate): ${skippedCount}`);
}

seedLabor();
