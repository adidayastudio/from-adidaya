
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

async function checkMapping() {
    if (!supabaseUrl || !supabaseKey) {
        console.error("Missing Supabase URL or Key");
        return;
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log("Checking Mapping...");
    
    // 1. Check all projects and their workspaces
    const { data: projects } = await supabase.from("projects").select("id, project_name, workspace_id");
    console.log("Projects in DB:", projects?.length || 0);
    if (projects && projects.length > 0) {
        const workspaces = Array.from(new Set(projects.map(p => p.workspace_id)));
        console.log("Unique Workspaces with projects:", workspaces);
    }

    // 2. Check profiles
    const { data: profiles } = await supabase.from("profiles").select("id, workspace_id, full_name");
    console.log("Profiles in DB:", profiles?.length || 0);
    if (profiles && profiles.length > 0) {
        profiles.forEach(p => {
            console.log(`Profile: ${p.full_name}, Workspace: ${p.workspace_id}`);
        });
    }
}

checkMapping();
