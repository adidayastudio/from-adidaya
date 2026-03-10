import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectPurchasing() {
    console.log("--- Inspecting Purchasing Requests ---");
    const { data, error, count } = await supabase
        .from('purchasing_requests')
        .select('purchase_stage, type, approval_status', { count: 'exact' });

    if (error) {
        console.error("Error:", error.message);
        return;
    }

    console.log(`Total Records: ${count}`);

    const stageCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    const approvalCounts: Record<string, number> = {};

    data?.forEach(r => {
        stageCounts[r.purchase_stage] = (stageCounts[r.purchase_stage] || 0) + 1;
        typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
        approvalCounts[r.approval_status] = (approvalCounts[r.approval_status] || 0) + 1;
    });

    console.log("Purchase Stages:", stageCounts);
    console.log("Item Types:", typeCounts);
    console.log("Approval Statuses:", approvalCounts);

    const received = data?.filter(r => r.purchase_stage === 'RECEIVED');
    console.log(`Records with 'RECEIVED': ${received?.length || 0}`);
}

inspectPurchasing();
