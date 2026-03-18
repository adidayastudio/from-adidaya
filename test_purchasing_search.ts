// test_purchasing_search.ts
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // or public anon key
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSearch(q: string) {
    console.log("Searching for:", q);
    let matchingRequestIds: string[] = [];
    const { data: itemMatches } = await supabase
        .from("purchasing_items")
        .select("request_id")
        .ilike("name", `%${q}%`);
    if (itemMatches && itemMatches.length > 0) {
        matchingRequestIds = itemMatches.map(i => i.request_id);
    }
    
    let query = supabase
        .from("purchasing_requests")
        .select(`id, description, vendor`);
        
    if (matchingRequestIds.length > 0) {
        const idsStr = matchingRequestIds.join(',');
        query = query.or(`description.ilike.%${q}%,vendor.ilike.%${q}%,id.in.(${idsStr})`);
    } else {
        query = query.or(`description.ilike.%${q}%,vendor.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Results count:", data?.length);
        console.log("Results data:", data);
    }
}

testSearch('grc');
testSearch('Grc 4ml');
