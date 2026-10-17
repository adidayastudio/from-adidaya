import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const sqlPath = path.resolve(__dirname, "../supabase/migrations/20260728_add_report_category.sql");
    const sqlContent = fs.readFileSync(sqlPath, "utf-8");

    console.log("Running SQL via RPC...");
    const { data, error } = await supabase.rpc("exec_sql", { sql: sqlContent });

    if (error) {
        console.error("❌ Error running migration via RPC exec_sql:", error);
    } else {
        console.log("✅ Migration applied successfully!", data);
    }
}

run();
