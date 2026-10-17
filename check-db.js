const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) { console.error("Missing credentials"); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data, error } = await supabase
        .from('reimbursement_requests')
        .select('id, description, status, invoice_url, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(3);

    if (error) console.error("Error:", error);
    else console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
