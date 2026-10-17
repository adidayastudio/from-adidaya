import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/(^['"]|['"]$)/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
    const { data: members } = await supabase.from('crew_members').select('id, name, current_project_code');
    const { data: logs } = await supabase.from('crew_daily_logs').select('crew_id, project_code, date').order('date', { ascending: false });
    const { data: hist } = await supabase.from('crew_project_history').select('crew_member_id, project_code, start_date').order('start_date', { ascending: false });

    console.log("=== CHECKING CREW MEMBERS PROJECT SYNC ===");
    for (const m of members) {
        const memberLogs = logs.filter(l => l.crew_id === m.id);
        const latestLog = memberLogs[0];
        const memberHist = hist.filter(h => h.crew_member_id === m.id);
        const latestHist = memberHist[0];

        console.log(`\nCrew: ${m.name}`);
        console.log(`  current_project_code in DB: ${m.current_project_code}`);
        console.log(`  latest assignment in DB: ${latestHist ? `${latestHist.project_code} (${latestHist.start_date})` : 'NONE'}`);
        console.log(`  latest daily log in DB: ${latestLog ? `${latestLog.project_code} (${latestLog.date})` : 'NONE'}`);
    }
}
main();
