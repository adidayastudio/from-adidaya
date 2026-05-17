const { Client } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '../.env.local');
dotenv.config({ path: envPath });

async function run() {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;
    if (!connectionString) {
        console.error("Missing database URL");
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const sql = `
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'tasks' AND table_schema = 'public';
        `;
        const res = await client.query(sql);
        console.log("Tasks table columns:");
        res.rows.forEach(row => {
            console.log(`- ${row.column_name} (${row.data_type})`);
        });
    } catch (err) {
        console.error("Error inspecting database:", err);
    } finally {
        await client.end();
    }
}

run();
