
import dotenv from 'dotenv';
import path from 'path';
import { Client } from 'pg';
import fs from 'fs';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;

    if (!dbUrl) {
        console.error("❌ No database URL found in .env.local (checked DATABASE_URL, POSTGRES_URL, SUPABASE_DB_URL)");
        process.exit(1);
    }

    console.log("Connecting to DB...");
    // console.log("URL:", dbUrl); // Sensitive

    const client = new Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false } // Required for Supabase usually
    });

    try {
        await client.connect();
        console.log("✅ Connected.");

        const sqlPath = path.resolve(process.cwd(), 'supabase/migrations/025_fix_wbs_rls.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("Running Migration: 025_fix_wbs_rls.sql");
        await client.query(sql);
        console.log("✅ Migration applied successfully.");

    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        await client.end();
    }
}

run();
