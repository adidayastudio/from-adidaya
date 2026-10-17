import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Try standard port 5432
const connectionString = "postgresql://postgres:postgres@127.0.0.1:5432/postgres";
const migrationFile = path.join(process.cwd(), 'supabase/migrations/006_project_tasks.sql');

async function applyMigration() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log("Connected to database on port 5432.");

        const sql = fs.readFileSync(migrationFile, 'utf8');
        console.log("Read migration file.");

        await client.query(sql);
        console.log("Migration applied successfully.");

    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

applyMigration();
