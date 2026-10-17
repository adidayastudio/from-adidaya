const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '../.env.local');
dotenv.config({ path: envPath });

async function run() {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;
    if (!connectionString) {
        console.error("❌ No database URL found in .env.local (checked DATABASE_URL, POSTGRES_URL, SUPABASE_DB_URL)");
        process.exit(1);
    }

    console.log("Connecting to database...");
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ Connected.");

        const sql = "ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS attachment_urls TEXT;";
        console.log("Executing SQL:", sql);
        await client.query(sql);
        console.log("✅ Migration applied successfully: attachment_urls column added.");

    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        await client.end();
    }
}

run();
