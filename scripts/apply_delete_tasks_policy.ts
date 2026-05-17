import dotenv from 'dotenv';
import path from 'path';
import { Client } from 'pg';
import fs from 'fs';

// Load env relative to script location to support any terminal Cwd
const envPath = fs.existsSync(".env.local") ? ".env.local" : path.resolve(__dirname, "../.env.local");
dotenv.config({ path: envPath });

async function run() {
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;

    if (!dbUrl) {
        console.error("❌ No database URL found in .env.local (checked DATABASE_URL, POSTGRES_URL, SUPABASE_DB_URL)");
        process.exit(1);
    }

    console.log("Connecting to DB...");

    const client = new Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected.");

        const sqlPath = path.resolve(__dirname, '../supabase/migrations/20260518_add_delete_tasks_policy.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("Running Migration: 20260518_add_delete_tasks_policy.sql");
        await client.query(sql);
        console.log("✅ Migration applied successfully.");

    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        await client.end();
    }
}

run();
