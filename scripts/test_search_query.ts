import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // use service role!
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSearch() {
    const q = "grc";
    let orString = `description.ilike.%${q}%,vendor.ilike.%${q}%,beneficiary_name.ilike.%${q}%,subcategory.ilike.%${q}%,notes.ilike.%${q}%`;

    console.log("Testing with OR string:", orString);

    const { data, error } = await supabase
        .from('purchasing_requests')
        .select(`
            id, description, vendor, beneficiary_name, subcategory, notes,
            project:projects!inner(id, project_name),
            items:purchasing_items(id, name)
        `)
        .or(orString)
        .limit(10);

    if (error) {
        console.error("Query Error:", error);
    } else {
        console.log("Found matches:", data?.length);
        console.log("Data:", JSON.stringify(data, null, 2));
    }
}

testSearch();
