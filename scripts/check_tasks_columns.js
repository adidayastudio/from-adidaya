const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

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
        console.log("⚠️ Table exists but is empty. Verifying attachment_urls via direct select...");
        const { data: colsData, error: colsError } = await supabase
            .from('tasks')
            .select('id, attachment_urls')
            .limit(0);
        if (colsError) {
            console.log("❌ attachment_urls column does not exist or error:", colsError.message);
        } else {
            console.log("✅ attachment_urls column exists!");
        }
    }
}

run();
