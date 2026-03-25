
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

async function checkWorkspaceMembers() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    // Since we know the table exists but select(*) returned [], maybe it needs specific columns or it's empty
    const { data: members, error } = await supabase.from("workspace_members").select("*");
    console.log("Workspace Members:", members || [], error || "No error");
    
    // Check if there's any other table like 'users' or 'people' that has workspace_id
    const { data: people } = await supabase.from("people").select("*").limit(1);
    if (people && people.length > 0) {
        console.log("People Columns:", Object.keys(people[0]));
    }
}

checkWorkspaceMembers();
