/**
 * Seed script: reads resources_level.json and inserts into pricing_resources.
 * Each level4 item + variant combo becomes a unique row.
 * 
 * Usage: node scripts/seed-resource-taxonomy.js
 * 
 * NOTE: allow_custom_additions = true — this is just baseline data.
 * Users can always add custom items via the UI.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Map taxonomy level1 → DB category value
const CATEGORY_MAP = {
    'Material': 'material',
    'Tools': 'tool',
    'Assets': 'asset',
    'Services': 'service'
};

// Default units per category
const DEFAULT_UNITS = {
    'material': 'pcs',
    'tool': 'unit',
    'asset': 'unit',
    'service': 'ls'
};

async function seed() {
    const jsonPath = path.join(__dirname, '..', 'data', 'resources_level.json');
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const taxonomy = JSON.parse(raw);

    console.log(`[Seed] Loaded taxonomy v${taxonomy.version}: ${taxonomy.data.length} items`);
    console.log(`[Seed] Custom additions allowed: ${taxonomy.allow_custom_additions}`);

    // Get workspace ID (use first project's workspace)
    const { data: project } = await supabase
        .from('projects')
        .select('workspace_id')
        .limit(1)
        .single();

    if (!project) {
        console.error('[Seed] No project found — cannot determine workspace_id');
        process.exit(1);
    }

    const workspaceId = project.workspace_id;
    console.log(`[Seed] Using workspace: ${workspaceId}`);

    // Flatten: each level4 item → one row per variant
    const rows = [];
    for (const item of taxonomy.data) {
        const category = CATEGORY_MAP[item.level1];
        if (!category) {
            console.warn(`[Seed] Unknown category "${item.level1}", skipping`);
            continue;
        }

        const subcategory = item.level2;
        const groupName = item.level3;
        const baseName = item.level4;
        const unit = DEFAULT_UNITS[category] || 'pcs';

        if (item.variants && item.variants.length > 0) {
            for (const variant of item.variants) {
                rows.push({
                    workspace_id: workspaceId,
                    name: `${baseName} - ${variant}`,
                    category,
                    subcategory,
                    group_name: groupName,
                    unit,
                    price_default: 0,
                    description: `${item.level1} > ${subcategory} > ${groupName} > ${baseName} (${variant})`
                });
            }
        } else {
            // No variants — insert base item
            rows.push({
                workspace_id: workspaceId,
                name: baseName,
                category,
                subcategory,
                group_name: groupName,
                unit,
                price_default: 0,
                description: `${item.level1} > ${subcategory} > ${groupName} > ${baseName}`
            });
        }
    }

    console.log(`[Seed] Total rows to insert: ${rows.length}`);

    // Check existing count
    const { count: existingCount } = await supabase
        .from('pricing_resources')
        .select('*', { count: 'exact', head: true });
    console.log(`[Seed] Existing resources in DB: ${existingCount}`);

    // Insert in batches of 50, skip duplicates by name
    let inserted = 0;
    let skipped = 0;
    const batchSize = 50;

    for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(rows.length / batchSize);

        // Check which names already exist
        const names = batch.map(r => r.name);
        const { data: existing } = await supabase
            .from('pricing_resources')
            .select('name')
            .in('name', names);

        const existingNames = new Set((existing || []).map(e => e.name));
        const newRows = batch.filter(r => !existingNames.has(r.name));
        const batchSkipped = batch.length - newRows.length;
        skipped += batchSkipped;

        if (newRows.length > 0) {
            const { error } = await supabase
                .from('pricing_resources')
                .insert(newRows);

            if (error) {
                console.error(`[Seed] Batch ${batchNum}/${totalBatches} ERROR:`, error.message);
            } else {
                inserted += newRows.length;
                console.log(`[Seed] Batch ${batchNum}/${totalBatches}: +${newRows.length} inserted, ${batchSkipped} skipped`);
            }
        } else {
            console.log(`[Seed] Batch ${batchNum}/${totalBatches}: all ${batchSkipped} already exist`);
        }
    }

    // Final count
    const { count: finalCount } = await supabase
        .from('pricing_resources')
        .select('*', { count: 'exact', head: true });

    console.log(`\n[Seed] ✅ Done!`);
    console.log(`[Seed]   Inserted: ${inserted}`);
    console.log(`[Seed]   Skipped (duplicates): ${skipped}`);
    console.log(`[Seed]   Total in DB: ${finalCount}`);
}

seed().catch(err => {
    console.error('[Seed] Fatal error:', err);
    process.exit(1);
});
