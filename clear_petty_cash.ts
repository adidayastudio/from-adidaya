
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Try to find .env.local
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

async function clearData() {
    if (!supabaseUrl || !supabaseKey) {
        console.error("Missing Supabase URL or Key");
        return;
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log("DELETING Petty Cash data as requested...");
    
    // First clear transactions due to foreign key
    const { error: txError } = await supabase.from("funding_source_transactions").delete().neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all
    if (txError) console.error("Error deleting transactions:", txError);
    else console.log("Cleared transactions.");

    const { error: fsError } = await supabase.from("funding_sources").delete().neq("id", "00000000-0000-0000-0000-000000000000"); 
    if (fsError) console.error("Error deleting funding sources:", fsError);
    else console.log("Cleared funding sources.");

    console.log("Database cleanup complete.");
}

clearData();
