import { createClient } from "@supabase/supabase-js";
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkClockIn() {
    // First find Bimo Prabowo's user_id
    const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, full_name")
        .ilike("full_name", "%bimo%");

    console.log("=== Searching for Bimo Prabowo ===");
    console.log("Profiles found:", JSON.stringify(profiles, null, 2));
    
    if (profiles && profiles.length > 0) {
        const userId = profiles[0].id;
        
        // Check attendance records for January 15, 2026
        const { data: records, error: recordError } = await supabase
            .from("attendance_records")
            .select("*")
            .eq("user_id", userId)
            .gte("date", "2026-01-15")
            .lte("date", "2026-01-15");

        console.log("\n=== Attendance Records for 2026-01-15 ===");
        console.log("Records:", JSON.stringify(records, null, 2));
        if (recordError) console.log("Error:", recordError);

        // Also check attendance_logs
        const { data: logs, error: logError } = await supabase
            .from("attendance_logs")
            .select("*")
            .eq("user_id", userId)
            .gte("timestamp", "2026-01-15T00:00:00")
            .lte("timestamp", "2026-01-15T23:59:59");

        console.log("\n=== Attendance Logs for 2026-01-15 ===");
        console.log("Logs:", JSON.stringify(logs, null, 2));
        if (logError) console.log("Error:", logError);
    } else {
        console.log("User Bimo not found");
    }
}

checkClockIn();
