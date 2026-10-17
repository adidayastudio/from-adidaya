const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function run() {
    if (!url || !key) {
        console.error("Missing credentials");
        return;
    }

    try {
        console.log("Fetching schema info via PostgREST OpenAPI using native fetch with headers...");
        const res = await fetch(`${url}/rest/v1/`, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });
        if (!res.ok) {
            console.error(`HTTP error: ${res.status} ${res.statusText}`);
            return;
        }
        const json = await res.json();
        const tasksSchema = json.definitions?.tasks;
        if (tasksSchema) {
            console.log("Tasks columns and types:");
            const props = tasksSchema.properties;
            Object.keys(props).sort().forEach(col => {
                const info = props[col];
                console.log(`- ${col}: ${info.type} (${info.format || 'no format'})`);
            });
        } else {
            console.log("Tasks schema not found in OpenAPI definition.");
        }
    } catch (err) {
        console.error("REST inspection failed:", err);
    }
}

run();
