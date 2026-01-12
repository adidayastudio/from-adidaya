/**
 * Script to get detailed column information from specific tables
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getTableColumns(tableName: string) {
    console.log(`\n📋 Table: ${tableName}`);
    console.log("=".repeat(50));

    const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

    if (error) {
        console.log(`❌ Error: ${error.message}\n`);
        return;
    }

    if (data && data.length > 0) {
        const columns = Object.keys(data[0]);
        console.log(`✅ Found ${columns.length} columns:\n`);
        columns.forEach((col, index) => {
            const value = data[0][col];
            const type = typeof value;
            console.log(`  ${index + 1}. ${col} (${type === 'object' && value !== null ? 'json' : type})`);
        });
    } else {
        console.log(`⚠️  Table exists but is empty - cannot determine columns\n`);
    }
}

async function main() {
    console.log("🔍 Detailed Column Information\n");

    const tablesToCheck = [
        'projects',
        'project_stages',
        'stage_templates',
        'wbs_templates',
        'workspaces'
    ];

    for (const table of tablesToCheck) {
        await getTableColumns(table);
    }

    console.log("\n" + "=".repeat(50));
    console.log("✅ Schema inspection complete!");
}

main().catch(console.error);
