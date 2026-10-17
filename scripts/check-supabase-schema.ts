/**
 * Script to check Supabase database schema
 * This script queries the database to retrieve all tables and their columns
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log("🔍 Fetching database schema...\n");

    // Query to get all tables and their columns
    const { data: tables, error } = await supabase.rpc("get_schema_info");

    if (error) {
        // If RPC doesn't exist, use information_schema
        console.log("📋 Querying information_schema...\n");

        const query = `
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `;

        const { data, error: schemaError } = await supabase.rpc('exec_sql', { sql: query });

        if (schemaError) {
            console.log("⚠️  Direct query not available. Trying table introspection...\n");
            await checkTablesDirectly();
            return;
        }

        console.log(JSON.stringify(data, null, 2));
        return;
    }

    console.log(JSON.stringify(tables, null, 2));
}

async function checkTablesDirectly() {
    // List of known tables from migrations
    const knownTables = [
        'workspaces',
        'workspace_members',
        'projects',
        'project_stages',
        'project_wbs_items',
        'project_rab_versions',
        'project_rab_items',
        'project_schedule_versions',
        'project_schedule_tasks',
        'project_schedule_dependencies',
        'project_tasks',
        'project_docs',
        'project_type_templates',
        'stage_templates',
        'wbs_templates',
        'rab_price_templates',
        'schedule_templates'
    ];

    console.log("📊 Checking known tables:\n");

    for (const tableName of knownTables) {
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(0);

        if (error) {
            console.log(`❌ ${tableName}: Table not found or no access`);
            console.log(`   Error: ${error.message}\n`);
        } else {
            console.log(`✅ ${tableName}: Exists and accessible`);
        }
    }

    // Try to get column info for projects table specifically
    console.log("\n🔍 Detailed check for 'projects' table:");
    const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .limit(1);

    if (projectsError) {
        console.log(`❌ Error: ${projectsError.message}`);
    } else {
        if (projectsData && projectsData.length > 0) {
            console.log("Columns found in projects table:");
            console.log(Object.keys(projectsData[0]).join(', '));
        } else {
            console.log("Table exists but is empty. Trying insert to see required columns...");

            const { error: insertError } = await supabase
                .from('projects')
                .insert({})
                .select();

            if (insertError) {
                console.log(`Insert error reveals required columns: ${insertError.message}`);
            }
        }
    }
}

// Run the check
checkSchema().catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
});
