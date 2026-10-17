/**
 * Script to run SQL migrations directly to Supabase
 * Usage: npx tsx scripts/run-migration.ts <migration-file>
 */

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

async function runMigration(migrationFile: string) {
    console.log(`🚀 Running migration: ${migrationFile}\n`);

    // Read SQL file
    const sqlPath = path.join(process.cwd(), migrationFile);

    if (!fs.existsSync(sqlPath)) {
        console.error(`❌ Migration file not found: ${sqlPath}`);
        process.exit(1);
    }

    const sqlContent = fs.readFileSync(sqlPath, "utf-8");

    console.log("📄 SQL Content Preview:");
    console.log("─".repeat(50));
    console.log(sqlContent.substring(0, 500) + "...\n");
    console.log("─".repeat(50));
    console.log(`Total length: ${sqlContent.length} characters\n`);

    console.log("⚙️  Executing migration...\n");

    // Split SQL by semicolons and execute each statement
    const statements = sqlContent
        .split(";")
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith("--"));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];

        // Skip comment-only lines
        if (statement.startsWith("--")) continue;

        console.log(`📝 Statement ${i + 1}/${statements.length}:`);
        const preview = statement.substring(0, 80).replace(/\n/g, " ");
        console.log(`   ${preview}${statement.length > 80 ? "..." : ""}`);

        try {
            const { data, error } = await supabase.rpc("exec_sql", {
                query: statement + ";"
            });

            if (error) {
                // Try alternative method - direct query
                const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "apikey": supabaseKey,
                        "Authorization": `Bearer ${supabaseKey}`
                    },
                    body: JSON.stringify({ query: statement + ";" })
                });

                if (!response.ok) {
                    console.log(`   ❌ Error: ${error.message}\n`);
                    errorCount++;

                    // For critical errors, stop execution
                    if (error.code && error.code !== "42P07") { // 42P07 = already exists
                        console.error("\n🛑 Critical error encountered. Stopping migration.");
                        process.exit(1);
                    }
                } else {
                    console.log(`   ✅ Success\n`);
                    successCount++;
                }
            } else {
                console.log(`   ✅ Success\n`);
                successCount++;
            }
        } catch (err: any) {
            console.log(`   ⚠️  Skipped (${err.message})\n`);
        }
    }

    console.log("─".repeat(50));
    console.log(`\n✨ Migration complete!`);
    console.log(`   Success: ${successCount} statements`);
    console.log(`   Errors: ${errorCount} statements\n`);

    if (errorCount === 0) {
        console.log("🎉 All statements executed successfully!");
    } else {
        console.log("⚠️  Some statements failed. Check errors above.");
    }
}

// Get migration file from command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
    console.error("❌ Usage: npx tsx scripts/run-migration.ts <migration-file>");
    console.error("   Example: npx tsx scripts/run-migration.ts supabase/migrations/002_templates_system.sql");
    process.exit(1);
}

runMigration(migrationFile).catch((error) => {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
});
