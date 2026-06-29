import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    const connectionString = process.env.SUPABASE_DB_URL;
    if (!connectionString) {
        console.error("Missing SUPABASE_DB_URL");
        return;
    }

    const client = new Client({
        connectionString,
    });

    try {
        await client.connect();
        const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '20260630_vendor_sharing.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running SQL...');
        await client.query(sql);
        console.log('SQL executed successfully.');
    } catch (err) {
        console.error('Error executing SQL:', err);
    } finally {
        await client.end();
    }
}

run();
