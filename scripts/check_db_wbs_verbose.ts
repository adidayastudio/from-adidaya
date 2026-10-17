
import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWBS() {
    console.log("Checking WBS in DB (Verbose)...");
    const { data: workspace } = await supabase.from('workspaces').select('id').limit(1).single();
    if (!workspace) { console.log("No workspace found!"); return; }

    console.log(`Using Workspace ID: ${workspace.id}`);

    const { data, error } = await supabase
        .from('work_breakdown_structure')
        .select('*')
        .eq('workspace_id', workspace.id)
        .limit(5);

    if (error) {
        console.error("Error fetching WBS:", error);
        return;
    }

    console.log(`First 5 Items found:`);
    console.log(JSON.stringify(data, null, 2));

    // Check total count
    const countRes = await supabase
        .from('work_breakdown_structure')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspace.id);

    console.log(`Total count in workspace: ${countRes.count}`);
}

checkWBS();
