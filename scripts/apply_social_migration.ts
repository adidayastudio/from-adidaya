import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const migrationFile = path.join(process.cwd(), 'supabase/migrations/089_social_module_persistence.sql');

async function applyMigration() {
    console.log("Connecting to database at " + connectionString);
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log("CONNECTED.");

        const sql = fs.readFileSync(migrationFile, 'utf8');
        console.log("READING: " + migrationFile);

        await client.query(sql);
        console.log("SUCCESS: Social module persistence migration applied.");

    } catch (err: any) {
        console.error("FAILED:", err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

applyMigration();
