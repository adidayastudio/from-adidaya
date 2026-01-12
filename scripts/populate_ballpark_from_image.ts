
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Based on User Image for 'Standard/Premium' (Class B likely)
const BASE_VALUES: Record<string, number> = {
    "S.1": 309000,
    "S.2": 526000,
    "S.3": 709000,
    "S.4": 1158000,
    "S.5": 421000,

    "A.1": 420000,
    "A.2": 625000,
    "A.3": 729000,
    "A.4": 509000,
    "A.5": 321000,
    "A.6": 318000,
    "A.7": 635000,
    "A.8": 428000,
    "A.9": 500000,  // Est Sanitary
    "A.10": 231000, // Est Misc

    // MEP (Total ~2.6m distributed)
    "M.1": 437500,
    "M.2": 437500,
    "M.3": 437500,
    "M.4": 437500,
    "M.5": 437500,
    "M.6": 437500,

    // Interior (Total ~2.8m distributed)
    "I.1": 945000,
    "I.2": 945000,
    "I.3": 945000,

    // Landscape (Total ~1.3m distributed)
    "L.1": 455000,
    "L.2": 455000,
    "L.3": 455000
};

// Scaling Factors based on Class A/B/C ratios
const CLASS_SCALES: Record<string, number> = {
    "A": 1.43,
    "B": 1.00,
    "C": 0.68,
    "D": 0.51,
    "E": 0.34
};

async function populate() {
    console.log("Starting population...");

    // 1. Get Workspace
    const { data: workspaces } = await supabase.from("workspaces").select("id").limit(1);
    const workspaceId = workspaces?.[0]?.id;
    if (!workspaceId) throw new Error("No workspace found");

    // 2. Get Classes
    const { data: classes } = await supabase.from("classes").select("*").eq("workspace_id", workspaceId);
    if (!classes || classes.length === 0) throw new Error("No classes found");

    console.log(`Found ${classes.length} classes.`);

    for (const cls of classes) {
        const factor = CLASS_SCALES[cls.class_code] || 1.0;
        console.log(`Processing Class ${cls.class_code} (Factor: ${factor})...`);

        // Calculate Total for this class to compute percentages
        let classTotal = 0;
        Object.values(BASE_VALUES).forEach(v => classTotal += v * factor);

        const updates = [];

        for (const [code, baseCost] of Object.entries(BASE_VALUES)) {
            const cost = Math.round(baseCost * factor);
            const percentage = classTotal > 0 ? (cost / classTotal) * 100 : 0;

            updates.push({
                workspace_id: workspaceId,
                class_id: cls.id,
                discipline_code: code,
                cost_per_m2: cost,
                percentage: percentage
            });
        }

        // Upsert
        const { error } = await supabase
            .from("class_discipline_values")
            .upsert(updates, { onConflict: "class_id, discipline_code" });

        if (error) console.error(`Error updating Class ${cls.class_code}:`, error);
        else console.log(`Updated ${updates.length} items for Class ${cls.class_code}`);
    }

    console.log("Done!");
}

populate().catch(console.error);
