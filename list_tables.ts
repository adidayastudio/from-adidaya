
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env.local");
let envContent = "";
if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf-8");
}

const getEnv = (key: string) => {
    const match = envContent.match(new RegExp(`${key}=(.*)`));
    return match ? match[1].trim() : process.env[key];
};

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL") || "";
const supabaseKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") || "";

async function listTables() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // We can't list tables directly with anon key easily without RPC or standard tables
    // But we can try common ones
    const tables = ["profiles", "workspaces", "workspace_members", "user_roles", "projects"];
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select("*").limit(1);
        if (error) {
            console.log(`Table ${table} error:`, error.message);
        } else {
            console.log(`Table ${table} exists. Columns:`, Object.keys(data[0] || {}));
        }
    }
}

listTables();
