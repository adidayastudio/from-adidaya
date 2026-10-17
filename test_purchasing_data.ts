// test_purchasing_data.ts
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testData() {
    console.log("Fetching items:");
    const { data: items, error: itemsErr } = await supabase
        .from("purchasing_items")
        .select("*")
        .limit(5);
    console.log(items, itemsErr);

    console.log("Fetching requests:");
    const { data: reqs, error: reqsErr } = await supabase
        .from("purchasing_requests")
        .select("id, description, vendor")
        .limit(5);
    console.log(reqs, reqsErr);
}

testData();
