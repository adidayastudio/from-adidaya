
import dotenv from 'dotenv';
import path from 'path';
import { Client } from 'pg';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
    // Try keys
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;

    // Fallback if env keys masked or missing in that file?
    // User env: NEXT_PUBLIC_SUPABASE_URL...
    // We need CONNECTION STRING.
    // If not found, we simply exit.

    if (!dbUrl) {
        console.error("❌ No database URL found in .env.local");
        process.exit(1);
    }

    const client = new Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const sqlPath = path.resolve(process.cwd(), 'supabase/migrations/027_add_boq_formula.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log("Running Migration: 027_add_boq_formula.sql");
        await client.query(sql);
        console.log("✅ Migration applied successfully.");
    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        await client.end();
    }
}

run();
