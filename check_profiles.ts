
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

async function checkProfiles() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    // Try to see if there are ANY profiles
    const { data: profiles, error } = await supabase.from("profiles").select("workspace_id, full_name");
    console.log("Profiles raw search:", profiles || [], error || "No error");
    
    // Check if workspaces table exists and what it contains
    const { data: workspaces } = await supabase.from("workspaces").select("*");
    console.log("Workspaces in DB:", workspaces?.length || 0);
    if (workspaces) {
        workspaces.forEach(w => console.log(`Workspace: ${w.id}, Name: ${w.name}`));
    }
}

checkProfiles();
