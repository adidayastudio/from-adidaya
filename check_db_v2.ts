
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

async function checkData() {
    if (!supabaseUrl || !supabaseKey) {
        console.error("Missing Supabase URL or Key");
        return;
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log("Checking database...");
    
    const { data: fsData, error: fsError } = await supabase.from("funding_sources").select("id, name, type, workspace_id, project_id");
    const { data: pData, error: pError } = await supabase.from("projects").select("id, project_name, workspace_id");

    console.log(`Funding Sources found: ${fsData?.length || 0}`);
    console.log(`Projects found: ${pData?.length || 0}`);

    if (fsError) console.error("FS Error:", fsError);
    if (pError) console.error("P Error:", pError);

    if (fsData && fsData.length > 0) {
        console.log("FS Sample:", fsData[0]);
    }
}

checkData();
