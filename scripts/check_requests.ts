import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRequests() {
    console.log("--- Checking Requests ---");

    const { data: pRequests, error: pErr } = await supabase.from('purchasing_requests').select('id, description, purchase_stage, approval_status').limit(5);
    if (pErr) console.error("Purchasing Requests Error:", pErr.message);
    else console.log(`Found ${pRequests?.length || 0} purchasing requests. Sample:`, pRequests[0]);

    const { data: rRequests, error: rErr } = await supabase.from('reimbursement_requests').select('id, description, status').limit(5);
    if (rErr) console.error("Reimbursement Requests Error:", rErr.message);
    else console.log(`Found ${rRequests?.length || 0} reimbursement requests. Sample:`, rRequests[0]);
}

checkRequests();
