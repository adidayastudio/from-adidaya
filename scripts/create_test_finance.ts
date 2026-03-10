import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestFinanceData() {
    console.log("--- Creating Test Finance Data ---");

    // 1. Get a project
    const { data: projects } = await supabase.from('projects').select('id, workspace_id').limit(1);
    if (!projects?.[0]) {
        console.error("No projects found.");
        return;
    }
    const projectId = projects[0].id;
    const workspaceId = projects[0].workspace_id;

    // 2. Get a user
    const { data: users } = await supabase.from('profiles').select('id').limit(1);
    const userId = users?.[0]?.id;

    // 3. Create Purchasing Request
    console.log("Creating purchasing_request...");
    const { data: request, error: rErr } = await supabase.from('purchasing_requests').insert([{
        project_id: projectId,
        date: new Date().toISOString().split('T')[0],
        description: "Test Sync Purchase",
        type: "MATERIAL",
        amount: 500000,
        approval_status: "APPROVED",
        purchase_stage: "RECEIVED",
        financial_status: "PAID",
        created_by: userId
    }]).select().single();

    if (rErr) {
        console.error("Error creating request:", rErr.message);
        // If it's RLS, try to find a way to insert without checking (unlikely without service key)
        return;
    }

    console.log("Created request:", request.id);

    // 4. Create Purchasing Item
    console.log("Creating purchasing_item...");
    const { data: item, error: iErr } = await supabase.from('purchasing_items').insert([{
        request_id: request.id,
        name: "Semen Holcim 50kg",
        qty: 10,
        unit: "bag",
        unit_price: 50000,
        total: 500000
    }]).select().single();

    if (iErr) {
        console.error("Error creating item:", iErr.message);
        return;
    }

    console.log("Created item:", item.id);
    console.log("Success! Data created. You can now sync in the UI.");
}

createTestFinanceData();
