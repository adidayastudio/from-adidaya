import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("🔍 Checking columns in 'tasks' table...");
    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .limit(1);

    if (error) {
        console.error("❌ Error fetching task row:", error.message);
        process.exit(1);
    }

    if (data && data.length > 0) {
        console.log("✅ Columns in 'tasks' table:");
        console.log(Object.keys(data[0]).sort().join(', '));
    } else {
        console.log("⚠️ Table exists but is empty. Fetching table columns via select description if possible...");
        // If empty, let's try a dummy insert that fails, which might reveal columns,
        // or try to fetch schema via rest endpoint
        const { data: colsData, error: colsError } = await supabase
            .from('tasks')
            .select('id, title, description, project_id, wbs_id, deadline_date, deadline_time, status, priority, created_by, created_at, updated_at, attachment_urls, subtasks')
            .limit(0);
        if (colsError) {
            console.log("❌ attachment_urls column does not exist or error:", colsError.message);
        } else {
            console.log("✅ attachment_urls column exists!");
        }
    }
}

run();
