const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
    console.log('Finding duplicates in pricing_resources...');
    const { data: allResources, error: fetchErr } = await supabase
        .from('pricing_resources')
        .select('id, workspace_id, name, category');

    if (fetchErr) {
        console.error('Fetch error:', fetchErr);
        return;
    }

    const groups = {};
    allResources.forEach(r => {
        const key = `${r.workspace_id}-${r.name.toLowerCase().trim()}-${r.category}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(r);
    });

    for (const key in groups) {
        const group = groups[key];
        if (group.length > 1) {
            console.log(`Merging ${group.length} entries for: ${key}`);
            const winner = group[0];
            const losers = group.slice(1);
            const loserIds = losers.map(l => l.id);

            console.log(`Winner ID: ${winner.id}, Loser IDs: ${loserIds.join(', ')}`);

            // 1. Update resource_inventory
            const { error: invErr } = await supabase.from('resource_inventory').update({ resource_id: winner.id }).in('resource_id', loserIds);
            if (invErr) console.error(`Resource Inventory Update Error for ${key}:`, invErr);

            // 2. Update resource_sync_log
            const { error: syncErr } = await supabase.from('resource_sync_log').update({ resource_id: winner.id }).in('resource_id', loserIds);
            if (syncErr) console.error(`Resource Sync Log Update Error for ${key}:`, syncErr);

            // 3. Update ahsp_components
            const { error: ahspErr } = await supabase.from('ahsp_components').update({ resource_id: winner.id }).in('resource_id', loserIds);
            if (ahspErr) console.error(`AHSP Components Update Error for ${key}:`, ahspErr);

            // 4. Delete losers
            const { error: delErr } = await supabase.from('pricing_resources').delete().in('id', loserIds);
            if (delErr) {
                console.error(`Error deleting losers for ${key}:`, delErr);
            } else {
                console.log(`Successfully merged ${key}`);
            }
        }
    }

    console.log('Cleanup completed!');
}

cleanup();
