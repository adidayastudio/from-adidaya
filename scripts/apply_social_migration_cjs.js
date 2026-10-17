const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const migrationFile = path.join(process.cwd(), 'supabase/migrations/089_social_module_persistence.sql');

async function applyMigration() {
    console.log("Connecting to database...");
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log("CONNECTED.");

        const sql = fs.readFileSync(migrationFile, 'utf8');
        console.log("READING: " + migrationFile);

        await client.query(sql);
        console.log("SUCCESS: Social module persistence migration applied.");

    } catch (err) {
        console.error("FAILED:", err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

applyMigration();
