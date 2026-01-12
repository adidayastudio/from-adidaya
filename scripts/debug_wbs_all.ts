
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugWBS() {
    console.log("Fetching all WBS Templates...");

    // Fetch Project Types to map names
    const { data: types } = await supabase.from("project_type_templates").select("project_type_id, name");
    const typeMap = new Map();
    types?.forEach(t => typeMap.set(t.project_type_id, t.name));

    const { data: wbsList, error } = await supabase
        .from("wbs_templates")
        .select("*");

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log(`Found ${wbsList.length} WBS templates:`);
    wbsList.forEach((wbs, idx) => {
        const typeName = typeMap.get(wbs.project_type_id) || "Unknown Type";
        console.log(`\n[${idx + 1}] ID: ${wbs.id}`);
        console.log(`    Project Type: ${typeName} (${wbs.project_type_id})`);

        const structure = wbs.wbs_structure || [];
        console.log(`    Root Items: ${structure.length}`);

        // Check for specific items the user mentioned
        const sNode = structure.find((n: any) => n.code === 'S');
        if (sNode) {
            console.log(`    Has 'S' node. Children:`);
            sNode.children?.forEach((child: any) => {
                console.log(`      - ${child.code}: ${child.nameEn}`);
            });
        } else {
            console.log("    NO 'S' node found.");
        }
    });
}

debugWBS();
