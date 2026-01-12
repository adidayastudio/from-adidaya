
import dotenv from 'dotenv';
import path from 'path';
import { Client } from 'pg';
import fs from 'fs';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
    // Try multiple keys
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;

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
        console.log("✅ Connected.");

        const sqlPath = path.resolve(process.cwd(), 'supabase/migrations/026_add_wbs_sort_order.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("Running Migration: 026_add_wbs_sort_order.sql");
        await client.query(sql);
        console.log("✅ Migration applied successfully.");

    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        await client.end();
    }
}

run();
