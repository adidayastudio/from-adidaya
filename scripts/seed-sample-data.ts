/**
 * SEED SCRIPT
 * Creates sample data in Supabase for testing
 * 
 * Run with: npx tsx scripts/seed-sample-data.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing env variables. Run with:");
    console.error("   NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=... npx tsx scripts/seed-sample-data.ts");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// SAMPLE DATA
// ============================================

const WORKSPACE = {
    slug: "adidaya-studio",
    name: "Adidaya Studio",
};

const PROJECT = {
    project_code: "PRG",
    project_number: "001",
    project_name: "Precision Gym Jakarta",
    status: "active",
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    location: {
        province: "DKI Jakarta",
        city: "Jakarta Selatan",
        address: "Jl. Senopati No. 45, Kebayoran Baru",
    },
    meta: {
        type: "design-build",
        buildType: "renovation",
        disciplines: ["interior", "mep"],
        landArea: 1500,
        buildingArea: 1200,
        floors: 3,
        rabClass: "B",
        clientName: "PT Fitness Indo",
        progress: 65,
    },
};

const STAGES = [
    { stage_code: "KO", stage_name: "Kickoff", stage_name_id: "Kickoff", position: 0 },
    { stage_code: "SD", stage_name: "Schematic Design", stage_name_id: "Desain Skematik", position: 1 },
    { stage_code: "DD", stage_name: "Design Development", stage_name_id: "Pengembangan Desain", position: 2 },
    { stage_code: "ED", stage_name: "Engineering Design", stage_name_id: "Desain Rekayasa", position: 3 },
    { stage_code: "PC", stage_name: "Procurement", stage_name_id: "Pengadaan", position: 4 },
    { stage_code: "CN", stage_name: "Construction", stage_name_id: "Konstruksi", position: 5 },
    { stage_code: "HO", stage_name: "Handover", stage_name_id: "Serah Terima", position: 6 },
];

const WBS_ITEMS = [
    // Level 0 - Root disciplines
    { wbs_code: "S", title: "Struktur", title_en: "Structure", level: 0, position: 0, is_leaf: false },
    { wbs_code: "A", title: "Arsitektur", title_en: "Architecture", level: 0, position: 1, is_leaf: false },
    { wbs_code: "M", title: "MEP", title_en: "MEP", level: 0, position: 2, is_leaf: false },
    { wbs_code: "I", title: "Interior", title_en: "Interior", level: 0, position: 3, is_leaf: false },
    { wbs_code: "L", title: "Lansekap", title_en: "Landscape", level: 0, position: 4, is_leaf: false },

    // Level 1 - Structure children
    { wbs_code: "S.1", title: "Persiapan", title_en: "Preparation", level: 1, position: 0, is_leaf: true, parent_code: "S" },
    { wbs_code: "S.2", title: "Tanah", title_en: "Earthworks", level: 1, position: 1, is_leaf: true, parent_code: "S" },
    { wbs_code: "S.3", title: "Fondasi", title_en: "Foundations", level: 1, position: 2, is_leaf: true, parent_code: "S" },
    { wbs_code: "S.4", title: "Struktur Utama", title_en: "Main Structure", level: 1, position: 3, is_leaf: true, parent_code: "S" },
    { wbs_code: "S.5", title: "Struktur Atap", title_en: "Roof Structure", level: 1, position: 4, is_leaf: true, parent_code: "S" },

    // Level 1 - Architecture children
    { wbs_code: "A.1", title: "Pasangan Dinding", title_en: "Wall Construction", level: 1, position: 0, is_leaf: true, parent_code: "A" },
    { wbs_code: "A.2", title: "Penutup Dinding", title_en: "Wall Finishes", level: 1, position: 1, is_leaf: true, parent_code: "A" },
    { wbs_code: "A.3", title: "Penutup Lantai", title_en: "Floor Finishes", level: 1, position: 2, is_leaf: true, parent_code: "A" },
    { wbs_code: "A.4", title: "Plafond", title_en: "Ceiling", level: 1, position: 3, is_leaf: true, parent_code: "A" },
    { wbs_code: "A.5", title: "Penutup Atap", title_en: "Roof Covering", level: 1, position: 4, is_leaf: true, parent_code: "A" },
    { wbs_code: "A.6", title: "Pengecatan", title_en: "Painting", level: 1, position: 5, is_leaf: true, parent_code: "A" },

    // Level 1 - MEP children
    { wbs_code: "M.1", title: "Pemipaan", title_en: "Plumbing", level: 1, position: 0, is_leaf: true, parent_code: "M" },
    { wbs_code: "M.2", title: "Elektrikal", title_en: "Electrical", level: 1, position: 1, is_leaf: true, parent_code: "M" },
    { wbs_code: "M.3", title: "HVAC", title_en: "HVAC", level: 1, position: 2, is_leaf: true, parent_code: "M" },

    // Level 1 - Interior children
    { wbs_code: "I.1", title: "Interior Khusus", title_en: "Special Interior", level: 1, position: 0, is_leaf: true, parent_code: "I" },
    { wbs_code: "I.2", title: "Material Khusus", title_en: "Special Materials", level: 1, position: 1, is_leaf: true, parent_code: "I" },

    // Level 1 - Landscape children
    { wbs_code: "L.1", title: "Pekerasan", title_en: "Hardscape", level: 1, position: 0, is_leaf: true, parent_code: "L" },
    { wbs_code: "L.2", title: "Tanaman", title_en: "Softscape", level: 1, position: 1, is_leaf: true, parent_code: "L" },
];

// ============================================
// SEED FUNCTIONS
// ============================================

async function seed() {
    console.log("🌱 Starting seed...\n");

    // 1. Create workspace
    console.log("Creating workspace...");
    const { data: workspace, error: wsError } = await supabase
        .from("workspaces")
        .upsert(WORKSPACE, { onConflict: "slug" })
        .select()
        .single();

    if (wsError) {
        console.error("❌ Failed to create workspace:", wsError.message);
        return;
    }
    console.log(`✅ Workspace: ${workspace.name} (${workspace.id})\n`);

    // 2. Create project
    console.log("Creating project...");
    const { data: project, error: projError } = await supabase
        .from("projects")
        .upsert(
            { ...PROJECT, workspace_id: workspace.id },
            { onConflict: "workspace_id,project_code" }
        )
        .select()
        .single();

    if (projError) {
        console.error("❌ Failed to create project:", projError.message);
        return;
    }
    console.log(`✅ Project: ${project.project_name} (${project.id})\n`);

    // 3. Create stages
    console.log("Creating stages...");
    const stagesData = STAGES.map((s) => ({
        ...s,
        project_id: project.id,
        is_active: true,
    }));

    // Delete existing stages first
    await supabase.from("project_stages").delete().eq("project_id", project.id);

    const { data: stages, error: stgError } = await supabase
        .from("project_stages")
        .insert(stagesData)
        .select();

    if (stgError) {
        console.error("❌ Failed to create stages:", stgError.message);
        return;
    }
    console.log(`✅ Stages: ${stages.length} created\n`);

    // 4. Create WBS items
    console.log("Creating WBS items...");

    // Delete existing WBS first
    await supabase.from("project_wbs_items").delete().eq("project_id", project.id);

    // First pass: create root items (level 0)
    const rootItems = WBS_ITEMS.filter((w) => w.level === 0).map((w) => ({
        project_id: project.id,
        wbs_code: w.wbs_code,
        title: w.title,
        title_en: w.title_en,
        level: w.level,
        position: w.position,
        is_leaf: w.is_leaf,
        meta: {},
    }));

    const { data: roots, error: rootErr } = await supabase
        .from("project_wbs_items")
        .insert(rootItems)
        .select();

    if (rootErr) {
        console.error("❌ Failed to create root WBS:", rootErr.message);
        return;
    }

    // Map code to ID
    const codeToId = new Map(roots.map((r) => [r.wbs_code, r.id]));

    // Second pass: create children with parent_id
    const childItems = WBS_ITEMS.filter((w) => w.level > 0).map((w) => ({
        project_id: project.id,
        parent_id: codeToId.get((w as any).parent_code),
        wbs_code: w.wbs_code,
        title: w.title,
        title_en: w.title_en,
        level: w.level,
        position: w.position,
        is_leaf: w.is_leaf,
        meta: {},
    }));

    const { data: children, error: childErr } = await supabase
        .from("project_wbs_items")
        .insert(childItems)
        .select();

    if (childErr) {
        console.error("❌ Failed to create child WBS:", childErr.message);
        return;
    }

    console.log(`✅ WBS Items: ${roots.length + children.length} created\n`);

    // 5. Create RAB Version
    console.log("Creating RAB version...");
    const { data: rabVersion, error: rabErr } = await supabase
        .from("project_rab_versions")
        .upsert(
            {
                project_id: project.id,
                name: "Initial Budget",
                version_no: 1,
                pricing_mode: "ballpark",
                currency: "IDR",
                building_class: "B",
                is_locked: false,
            },
            { onConflict: "project_id,version_no" }
        )
        .select()
        .single();

    if (rabErr) {
        console.error("❌ Failed to create RAB version:", rabErr.message);
    } else {
        console.log(`✅ RAB Version: ${rabVersion.name}\n`);
    }

    // 6. Create Schedule Version
    console.log("Creating Schedule version...");
    const { data: schedVersion, error: schedErr } = await supabase
        .from("project_schedule_versions")
        .upsert(
            {
                project_id: project.id,
                name: "Master Schedule",
                version_no: 1,
                calendar_mode: "weekly",
                is_locked: false,
            },
            { onConflict: "project_id,version_no" }
        )
        .select()
        .single();

    if (schedErr) {
        console.error("❌ Failed to create Schedule version:", schedErr.message);
    } else {
        console.log(`✅ Schedule Version: ${schedVersion.name}\n`);
    }

    // Done
    console.log("═".repeat(50));
    console.log("🎉 SEED COMPLETE!");
    console.log("═".repeat(50));
    console.log(`\nProject ID: ${project.id}`);
    console.log(`Access at: /flow/projects/${project.id}`);
    console.log("");
}

seed().catch(console.error);
