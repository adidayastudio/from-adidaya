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
    const { data: members } = await supabase.from('crew_members').select('*').ilike('name', '%didin%');
    console.log("MEMBERS:", members);

    for (const m of members) {
        const { data: reqs } = await supabase.from('crew_requests').select('*').eq('crew_id', m.id);
        console.log("REQS:", reqs);

        const { data: hist } = await supabase.from('crew_project_history').select('*').eq('crew_member_id', m.id);
        console.log("HISTORY:", hist);
    }
}
main();
