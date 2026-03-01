const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
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
        const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '20260228_create_tasks_and_actions.sql');
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
