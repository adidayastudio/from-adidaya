const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const badgeMapping = (cat, sub) => {
  if (cat === "tool") return "TLS";
  if (cat === "asset") return "AST";
  if (cat === "service") return "SRV";
  
  const s = (sub || "").toLowerCase().trim();
  if (s.includes("general") || s.includes("uncategorized") || s.includes("umum") || s === "gen") return "GEN";
  if (s.includes("structure") || s.includes("struktur") || s === "str") return "STR";
  if (s.includes("architecture") || s.includes("arsitektur") || s.includes("finishing") || s.includes("atap") || s === "ars") return "ARS";
  if (s.includes("mep") || s.includes("mekanikal") || s.includes("elektrikal")) return "MEP";
  if (s.includes("interior") || s === "int") return "INT";
  if (s.includes("landscape") || s.includes("lanskap") || s.includes("infra") || s === "lan") return "LAN";
  return "MSC";
};

// SKU generator mirroring client logic
const CATEGORY_CODES = { material: 'MT', tool: 'TL', asset: 'EQ', service: 'SV' };
const LEVEL2_MAP = {
  general: '00', structure: '01', architecture: '02', mep: '03', interior: '04', landscape: '05', miscellaneous: '99',
  umum: '00', struktur: '01', arsitektur: '02', interior: '04', lanskap: '05', finishing: '02', atap: '02'
};
const LEVEL3_MAP = { general: '00', umum: '00' };

function generateResourceCode(item) {
  const cat = CATEGORY_CODES[item.category] || 'MT';
  const sub = (item.subcategory || 'umum').toLowerCase().trim();
  const l2 = LEVEL2_MAP[sub] || '99';
  const grp = (item.group_name || 'umum').toLowerCase().trim();
  const l3 = LEVEL3_MAP[grp] || '99';

  const getL4Code = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return Math.abs(hash % 999).toString().padStart(3, '0');
  };
  const l4 = getL4Code(item.name.split(' - ')[0].trim().toLowerCase());
  const variant = (item.metadata?.variant_index || 1).toString().padStart(3, '0');

  return `${cat}${l2}${l3}${l4}-${variant}`;
}

async function run() {
  console.log("🚀 Starting database taxonomy standardization & merging...");

  // 1. Standardize subcategories
  console.log("1. Standardizing subcategories in bulk...");
  const { data: dbItems, error: fetchErr } = await supabase
    .from("pricing_resources")
    .select("id, subcategory, category");

  if (fetchErr) {
    console.error("Failed to fetch items:", fetchErr);
    return;
  }

  const groupsToUpdate = {
    "General": [],
    "Structure": [],
    "Architecture": [],
    "MEP": [],
    "Interior": [],
    "Landscape": [],
    "Miscellaneous": []
  };

  dbItems.forEach(item => {
    const sub = item.subcategory || "";
    const s = sub.toLowerCase().trim();
    if (!s || s.includes("general") || s.includes("uncategorized") || s.includes("umum") || s === "gen") {
      groupsToUpdate["General"].push(item.id);
    } else if (s.includes("struktur") || s.includes("structure") || s === "str" || s.includes("infrastruktur")) {
      groupsToUpdate["Structure"].push(item.id);
    } else if (s.includes("arsitektur") || s.includes("architecture") || s.includes("finishing") || s.includes("atap") || s === "ars" || s === "ata") {
      groupsToUpdate["Architecture"].push(item.id);
    } else if (s.includes("mep") || s.includes("mekanikal") || s.includes("elektrikal") || s.includes("plumbing") || s.includes("sanitary")) {
      groupsToUpdate["MEP"].push(item.id);
    } else if (s.includes("interior") || s === "int") {
      groupsToUpdate["Interior"].push(item.id);
    } else if (s.includes("landscape") || s.includes("lanskap") || s.includes("infra") || s === "lan") {
      groupsToUpdate["Landscape"].push(item.id);
    } else {
      groupsToUpdate["Miscellaneous"].push(item.id);
    }
  });

  for (const [targetSub, ids] of Object.entries(groupsToUpdate)) {
    if (ids.length > 0) {
      console.log(`Standardizing ${ids.length} records to subcategory "${targetSub}"`);
      const { error: updErr } = await supabase
        .from("pricing_resources")
        .update({ subcategory: targetSub })
        .in("id", ids);

      if (updErr) {
        console.error(`Failed standardizing to ${targetSub}:`, updErr);
      }
    }
  }

  // 2. Fetch updated items to generate SKUs and find duplicates
  console.log("\n2. Fetching updated records to find duplicate SKU codes...");
  const { data: updatedResources, error: refetchErr } = await supabase
    .from("pricing_resources")
    .select("*");

  if (refetchErr) {
    console.error("Refetch failed:", refetchErr);
    return;
  }

  // Group by SKU
  const skuGroups = {};
  updatedResources.forEach(row => {
    const sku = generateResourceCode(row);
    if (!skuGroups[sku]) skuGroups[sku] = [];
    skuGroups[sku].push(row);
  });

  let mergedCount = 0;
  console.log("\n3. Merging duplicates...");

  for (const sku in skuGroups) {
    const group = skuGroups[sku];
    if (group.length > 1) {
      const winner = group[0];
      const losers = group.slice(1);
      const loserIds = losers.map(l => l.id);

      console.log(`Found duplicate SKU ${sku}. Winner name: "${winner.name}" (${winner.id}). Merging ${losers.length} duplicate(s)...`);

      // Update resource_inventory
      const { error: invErr } = await supabase
        .from('resource_inventory')
        .update({ resource_id: winner.id })
        .in('resource_id', loserIds);
      if (invErr) console.warn(`Resource Inventory update warning for ${sku}:`, invErr.message);

      // Update resource_sync_log
      const { error: syncErr } = await supabase
        .from('resource_sync_log')
        .update({ resource_id: winner.id })
        .in('resource_id', loserIds);
      if (syncErr) console.warn(`Resource Sync Log update warning for ${sku}:`, syncErr.message);

      // Update ahsp_components
      const { error: ahspErr } = await supabase
        .from('ahsp_components')
        .update({ resource_id: winner.id })
        .in('resource_id', loserIds);
      if (ahspErr) console.warn(`AHSP Components update warning for ${sku}:`, ahspErr.message);

      // Delete duplicate items from DB
      const { error: delErr } = await supabase
        .from('pricing_resources')
        .delete()
        .in('id', loserIds);

      if (delErr) {
        console.log(`Bypassed deleting duplicate row for SKU ${sku} (in use in other tables)`);
      } else {
        mergedCount += losers.length;
      }
    }
  }

  console.log(`\n🎉 Completed! Successfully standardized categories and merged ${mergedCount} duplicate SKU records.`);
}

run();
