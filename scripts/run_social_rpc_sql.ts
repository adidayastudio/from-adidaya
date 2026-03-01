import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role for DDL

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials (URL or Service Role Key)");
    process.exit(1);
}

async function runSQL() {
    const migrationFile = 'supabase/migrations/089_social_module_persistence.sql';
    const sqlContent = fs.readFileSync(migrationFile, 'utf8');

    console.log(`🚀 Running SQL from ${migrationFile} via RPC...`);

    try {
        // Many Supabase setups have an 'exec_sql' or similar RPC for internal use
        // If not, we might need a different approach, but let's try this standard admin pattern
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({ query: sqlContent })
        });

        const result = await response.text();
        if (!response.ok) {
            console.error("❌ SQL Error:", result);
            console.log("Note: If 'exec_sql' doesn't exist, you may need to run this manually in Supabase SQL Editor.");
            process.exit(1);
        }

        console.log("✅ Migration applied successfully!");
    } catch (error: any) {
        console.error("❌ Request failed:", error.message);
        process.exit(1);
    }
}

runSQL();
