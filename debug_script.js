
const { createClient } = require('@supabase/supabase-js');

// Hardcoded from .env.local
const supabaseUrl = "https://fmgcvwximerhgjgctpsp.supabase.co";
const supabaseKey = "sb_publishable_xG7rkz6EztqCnJhSxOxVow_mtP-udQQ"; // Using the key found in .env.local

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugData() {
    const username = 'Adi Nur Khamim';
    console.log(`Searching for user: ${username}`);

    // 1. Get Profile ID
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', `%${username}%`);

    if (profileError) {
        console.error("Profile Error:", profileError);
        return;
    }

    if (!profiles || profiles.length === 0) {
        console.error("No profile found");
        return;
    }

    const userId = profiles[0].id;
    console.log(`Found User ID: ${userId}`);

    const date = '2026-01-28';
    console.log(`Checking data for date: ${date}`);

    // 2. Check Attendance Records
    const { data: records, error: recordError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date);

    console.log("\n--- Attendance Records ---");
    console.log(records);

    // 3. Check Sessions
    const { data: sessions, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date);

    console.log("\n--- Sessions ---");
    console.log(sessions);

    // 4. Check Logs (Range for that day in UTC? Or just string match?)
    // Trying string match on timestamp
    const { data: logs, error: logError } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_id', userId)
        .ilike('timestamp', `${date}%`);

    console.log("\n--- Logs ---");
    console.log(logs);
}

debugData();
