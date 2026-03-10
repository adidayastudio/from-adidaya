import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSourceData() {
    console.log("--- Checking Source Data ---");

    // 1. Check Purchasing Items
    const { data: pItems, error: pErr } = await supabase
        .from('purchasing_items')
        .select(`
            id, name, qty,
            purchasing_requests!inner(purchase_stage, financial_status, type)
        `);

    if (pErr) {
        console.error("Error fetching purchasing items:", pErr.message);
    } else {
        console.log(`Found ${pItems?.length || 0} purchasing items total.`);
        const receivedData = pItems?.filter(i => i.purchasing_requests?.purchase_stage === 'RECEIVED');
        console.log(`Purchasing items with 'RECEIVED' stage: ${receivedData?.length || 0}`);
        if (receivedData && receivedData.length > 0) {
            console.log("Sample Received Item:", receivedData[0]);
        }
    }

    // 2. Check Reimbursement Items
    const { data: rItems, error: rErr } = await supabase
        .from('reimbursement_items')
        .select(`
            id, name, qty,
            reimbursement_requests!inner(status, category)
        `);

    if (rErr) {
        console.error("Error fetching reimbursement items:", rErr.message);
    } else {
        console.log(`Found ${rItems?.length || 0} reimbursement items total.`);
        const approvedPaidData = rItems?.filter(i => ['APPROVED', 'PAID'].includes(i.reimbursement_requests?.status));
        console.log(`Reimbursement items with 'APPROVED'/'PAID' status: ${approvedPaidData?.length || 0}`);
        if (approvedPaidData && approvedPaidData.length > 0) {
            console.log("Sample Approved/Paid Item:", approvedPaidData[0]);
        }
    }

    // 3. Check Sync Log
    const { data: syncLogs, error: sErr } = await supabase.from('resource_sync_log').select('*');
    if (sErr) {
        console.error("Error fetching sync logs:", sErr.message);
    } else {
        console.log(`Found ${syncLogs?.length || 0} sync logs.`);
    }

    // 4. Check Inventory
    const { data: inventory, error: iErr } = await supabase.from('resource_inventory').select('*');
    if (iErr) {
        console.error("Error fetching inventory:", iErr.message);
    } else {
        console.log(`Found ${inventory?.length || 0} items in resource_inventory.`);
    }

    // 5. Check Pricing Resources
    const { data: resources, error: resErr } = await supabase.from('pricing_resources').select('*');
    if (resErr) {
        console.error("Error fetching pricing_resources:", resErr.message);
    } else {
        console.log(`Found ${resources?.length || 0} pricing_resources.`);
    }
}

checkSourceData().catch(err => console.error(err));
