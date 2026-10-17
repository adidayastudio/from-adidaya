import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials");
    process.exit(1);
}

async function runSQL() {
    const migrationFile = 'supabase/migrations/089_social_module_persistence.sql';
    const sqlContent = fs.readFileSync(migrationFile, 'utf8');

    console.log(`🚀 Running SQL from ${migrationFile}...`);

    try {
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
            process.exit(1);
        }

        console.log("✅ Migration applied successfully!");
    } catch (error: any) {
        console.error("❌ Request failed:", error.message);
        process.exit(1);
    }
}

runSQL();
