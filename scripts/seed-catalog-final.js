const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    console.log('Fetching workspace ID...');
    const { data: wsData, error: wsError } = await supabase.from('workspaces').select('id').limit(1).single();
    if (wsError) { console.error('WS Error:', wsError); process.exit(1); }
    const workspaceId = wsData.id;

    const jsonPath = path.join(process.cwd(), 'data/maspetruk_material_semarang.json');
    const materials = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    console.log('Fetching existing materials to avoid duplicates...');
    const { data: existing } = await supabase
        .from('pricing_resources')
        .select('name, category')
        .eq('workspace_id', workspaceId);

    const existingKeys = new Set((existing || []).map(e => `${e.name.toLowerCase().trim()}-${e.category}`));

    console.log(`Processing ${materials.length} materials...`);
    const toInsert = materials.filter(m => {
        const key = `${m.name.toLowerCase().trim()}-${m.category || 'material'}`;
        return !existingKeys.has(key);
    });

    console.log(`Inserting ${toInsert.length} new items...`);
    const insertData = toInsert.map(m => ({
        workspace_id: workspaceId,
        name: m.name,
        category: m.category || 'material',
        unit: m.unit,
        price_default: m.price || 0,
        updated_at: new Date().toISOString()
    }));

    const batchSize = 50;
    for (let i = 0; i < insertData.length; i += batchSize) {
        const batch = insertData.slice(i, i + batchSize);
        console.log(`Inserting batch ${i / batchSize + 1}...`);
        const { error } = await supabase.from('pricing_resources').insert(batch);
        if (error) console.error('Insert Error:', error);
    }

    console.log('Seeding completed!');
}
seed();
