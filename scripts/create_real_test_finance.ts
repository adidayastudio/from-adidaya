import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createData() {
    console.log("--- Creating Real-like Test Finance Data ---");

    // We will use an arbitrary UUID for created_by and project_id since RLS allows anon insert with ANY UUID.
    const fakeUserId = "11111111-1111-1111-1111-111111111111";
    
    // Get a project, or use a fake one if none
    const { data: projects } = await supabase.from('projects').select('id').limit(1);
    const projectId = projects?.[0]?.id || "22222222-2222-2222-2222-222222222222";

    const requests = [
        {
            project_id: projectId,
            date: "2026-05-25",
            description: "Pembelian Semen Holcim",
            type: "MATERIAL",
            amount: 5000000,
            approval_status: "APPROVED",
            purchase_stage: "RECEIVED",
            financial_status: "PAID",
            created_by: fakeUserId
        },
        {
            project_id: projectId,
            date: "2026-05-26",
            description: "Sewa Excavator PC200",
            type: "ALAT",
            amount: 12000000,
            approval_status: "APPROVED",
            purchase_stage: "PLANNED",
            financial_status: "UNPAID",
            created_by: fakeUserId
        },
        {
            project_id: projectId,
            date: "2026-05-27",
            description: "Pembelian Besi Beton 10mm",
            type: "MATERIAL",
            amount: 8500000,
            approval_status: "SUBMITTED",
            purchase_stage: "PLANNED",
            financial_status: "UNPAID",
            created_by: fakeUserId
        }
    ];

    for (const req of requests) {
        const { data, error } = await supabase.from('purchasing_requests').insert([req]).select().single();
        if (error) {
            console.error("Error creating request:", req.description, error.message);
        } else {
            console.log("Created:", req.description, data.id);
            // Insert item
            await supabase.from('purchasing_items').insert([{
                request_id: data.id,
                name: "Item for " + req.description,
                qty: 1,
                unit: "ls",
                unit_price: req.amount,
                total: req.amount
            }]);
        }
    }
    console.log("Done inserting purchasing requests.");
}

createData();
