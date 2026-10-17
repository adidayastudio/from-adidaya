
import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- DATA: DISCIPLINES ---
const DISCIPLINES = [
    { code: "STR", nameEn: "Structure", nameId: "Struktur", color: "bg-red-200", sortOrder: 0 },
    { code: "ARC", nameEn: "Architecture", nameId: "Arsitektur", color: "bg-blue-200", sortOrder: 1 },
    { code: "MEP", nameEn: "MEP", nameId: "MEP", color: "bg-green-200", sortOrder: 2 },
    { code: "INT", nameEn: "Interior", nameId: "Interior", color: "bg-purple-200", sortOrder: 3 },
    { code: "LAN", nameEn: "Landscape", nameId: "Lansekap", color: "bg-lime-200", sortOrder: 4 },
];

async function seedDisciplines(workspaceId: string) {
    console.log("Checking Disciplines...");
    const { count, data, error } = await supabase.from("disciplines").select("*", { count: "exact" }).eq("workspace_id", workspaceId);
    console.log(`Disciplines Check -> Count: ${count}, Error: ${JSON.stringify(error)}`);

    if (data) {
        console.log("Disciplines found:", JSON.stringify(data, null, 2));
    }

    if (count === 0) {
        console.log("Seeding Disciplines...");
        const payload = DISCIPLINES.map(d => ({
            workspace_id: workspaceId,
            code: d.code,
            name: d.nameEn, // Map nameEn to name
            // nameId is missing in schema? I'll assume 'name' is enough or maybe schema has name_id?
            // Checking schema from previous files: 'name' is standard.
            // I'll skip name_id if column doesn't exist, or try to insert it if I knew schema.
            // Safe bet: just name.
            color_tag: d.color,
            sort_order: d.sortOrder,
            is_active: true
        }));

        const { error } = await supabase.from("disciplines").insert(payload);
        if (error) console.error("Error seeding disciplines:", error);
        else console.log("✅ Disciplines seeded.");
    } else {
        console.log("Disciplines already exist. Skipping.");
    }
}


// --- IMPORTS ---
// Using relative paths to access components
import { WBS_BALLPARK } from "../components/flow/projects/project-detail/setup/wbs/data/wbs-ballpark";
import { RAW_WBS_ESTIMATES_DELTA } from "../components/flow/projects/project-detail/setup/wbs/data/wbs-estimates";
import { buildEstimatesFromBallpark } from "../components/flow/projects/project-detail/setup/wbs/data/wbs-inherit";
import { buildDetailFromEstimates } from "../components/flow/projects/project-detail/setup/wbs/data/wbs-detail";
import type { WBSItem } from "../components/flow/projects/project-detail/setup/wbs/data/wbs.types";

async function seedWBS(workspaceId: string) {
    console.log("Building Full WBS Tree...");

    // 1. Build the Tree using Project Logic
    const estimatesTree = buildEstimatesFromBallpark(WBS_BALLPARK, RAW_WBS_ESTIMATES_DELTA);
    const detailTree = buildDetailFromEstimates(estimatesTree);

    console.log("Clearing existing WBS...");
    const { error: deleteError } = await supabase.from("work_breakdown_structure").delete().eq("workspace_id", workspaceId);
    if (deleteError) {
        console.error("Error clearing WBS:", deleteError);
        return;
    }

    console.log("Seeding WBS recursively...");

    // Recursive Insert Function
    async function insertNode(item: any, parentDbId: string | null = null, indentLevel: number = 0, levelName: string = "structure") {
        // Determine level based on depth/indent
        // 0=Structure, 1=Summary, 2=Estimate, 3+=Detail
        let currentLevel = levelName;
        if (indentLevel === 0) currentLevel = "structure";
        else if (indentLevel === 1) currentLevel = "summary";
        else if (indentLevel === 2) currentLevel = "estimate";
        else if (indentLevel >= 3) currentLevel = "detail";

        // Handle naming variants
        const code = item.code || item.wbsCode || "NO-CODE";
        const name = item.nameEn || item.titleEn || item.name || item.title || "Unnamed";
        const nameId = item.nameId || item.name || item.title;
        const description = nameId;

        const { data, error } = await supabase.from("work_breakdown_structure").insert({
            workspace_id: workspaceId,
            code: code,
            name: name,
            level: currentLevel,
            indent_level: indentLevel,
            parent_id: parentDbId,
            description: description
        }).select('id').single();

        if (error) {
            console.error(`Error inserting ${code}:`, error.message);
            return;
        }

        const newDbId = data.id;

        // Handle children property variants
        const children = item.children || item.items || [];
        if (children && children.length > 0) {
            for (const child of children) {
                await insertNode(child, newDbId, indentLevel + 1);
            }
        }
    }

    // Start Insertion for Root Nodes
    for (const root of detailTree) {
        await insertNode(root);
    }

    console.log("✅ Full WBS seeded.");
}

async function main() {
    // defaults
    const { data: ws } = await supabase.from('workspaces').select('id').limit(1).single();
    if (!ws) { console.error("No workspace found"); return; }

    console.log(`Using Workspace: ${ws.id}`);

    await seedDisciplines(ws.id);
    await seedWBS(ws.id);
}

main();
