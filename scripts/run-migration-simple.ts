/**
 * Simple SQL runner - executes SQL file as single query
 */

import * as fs from "fs";
import * as dotenv from "dotenv";
import * as path from "path";

const envPath = fs.existsSync(".env.local") ? ".env.local" : path.resolve(__dirname, "../.env.local");
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials");
    process.exit(1);
}

async function runSQL(sqlFile: string) {
    console.log(`🚀 Running SQL: ${sqlFile}\n`);

    const sqlContent = fs.readFileSync(sqlFile, "utf-8");

    console.log("📄 SQL Preview:");
    console.log("─".repeat(50));
    console.log(sqlContent.substring(0, 300) + "...\n");

    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": supabaseKey,
                "Authorization": `Bearer ${supabaseKey}`,
                "Prefer": "return=representation"
            },
            body: JSON.stringify({ sql: sqlContent })
        });

        const result = await response.text();

        if (!response.ok) {
            console.error("❌ Error:", result);
            process.exit(1);
        }

        console.log("✅ Success!");
        if (result) {
            console.log("📊 Result:", result);
        }
    } catch (error: any) {
        console.error("❌ Request failed:", error.message);
        process.exit(1);
    }
}

const sqlFile = process.argv[2];
if (!sqlFile) {
    console.error("Usage: npx tsx scripts/run-migration-simple.ts <sql-file>");
    process.exit(1);
}

runSQL(sqlFile);
