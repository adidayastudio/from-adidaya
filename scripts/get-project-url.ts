import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env variables");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data, error } = await supabase
        .from("projects")
        .select("id, project_name")
        .limit(1);

    if (error) {
        console.error("Error fetching project:", error.message);
        return;
    }

    if (data && data.length > 0) {
        console.log(`\nFound Project: ${data[0].project_name}`);
        console.log(`URL: http://localhost:3000/flow/projects/${data[0].id}\n`);
        console.log(`ID: ${data[0].id}\n`);
    } else {
        console.log("No projects found.");
    }
}

main();
