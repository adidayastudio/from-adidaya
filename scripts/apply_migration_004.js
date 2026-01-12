const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const migrationFile = path.join(__dirname, '../supabase/migrations/004_refactor_terminology.sql');

async function applyMigration() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log("Connected to database.");

        const sql = fs.readFileSync(migrationFile, 'utf8');
        console.log("Read migration file.");

        await client.query(sql);
        console.log("Migration applied successfully.");

    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await client.end();
    }
}

applyMigration();
