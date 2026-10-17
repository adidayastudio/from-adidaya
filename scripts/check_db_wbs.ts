
import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWBS() {
    console.log("Checking WBS in DB...");
    const { data: workspace } = await supabase.from('workspaces').select('id').limit(1).single();
    if (!workspace) { console.log("No workspace"); return; }

    const { data, error } = await supabase
        .from('work_breakdown_structure')
        .select('level, indent_level')
        .eq('workspace_id', workspace.id);

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log(`Total Items: ${data.length}`);

    // Group by level
    const byLevel: Record<string, number> = {};
    const byIndent: Record<number, number> = {};

    data.forEach((item: any) => {
        const lvl = item.level || 'unknown';
        byLevel[lvl] = (byLevel[lvl] || 0) + 1;

        const ind = item.indent_level;
        byIndent[ind] = (byIndent[ind] || 0) + 1;
    });

    console.log("By Level:", byLevel);
    console.log("By Indent:", byIndent);
}

checkWBS();
