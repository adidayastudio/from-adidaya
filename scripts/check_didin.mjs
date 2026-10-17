import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/(^['"]|['"]$)/g, '');
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Searching for crew member 'Didin'...");
    const { data: members, error: mErr } = await supabase
        .from('crew_members')
        .select('*')
        .ilike('name', '%didin%');

    if (mErr) {
        console.error("Error fetching crew member:", mErr);
        return;
    }

    console.log("Found members:", JSON.stringify(members, null, 2));

    for (const member of (members || [])) {
        console.log(`\n========================================`);
        console.log(`Member: ${member.name} (${member.id})`);
        console.log(`current_project_code: ${member.current_project_code}`);
        
        // 1. Project History (Assignment)
        const { data: history } = await supabase
            .from('crew_project_history')
            .select('*')
            .eq('crew_member_id', member.id);
        console.log("\nAssignment History (crew_project_history):", JSON.stringify(history, null, 2));

        // 2. Daily Logs
        const { data: logs } = await supabase
            .from('crew_daily_logs')
            .select('*')
            .eq('crew_id', member.id);
        console.log("\nDaily Logs (crew_daily_logs):", JSON.stringify(logs, null, 2));

        // 3. Crew Requests
        const { data: requests } = await supabase
            .from('crew_requests')
            .select('*')
            .eq('crew_id', member.id);
        console.log("\nCrew Requests (crew_requests):", JSON.stringify(requests, null, 2));
    }
}

main().catch(console.error);
