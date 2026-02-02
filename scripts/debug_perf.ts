
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
    const userId = "056164a2-3936-4e5e-ae1a-13c5bb83e158";
    console.log(`Fetching snapshots for ${userId}...`);

    const { data, error } = await supabase
        .from('people_performance_snapshots')
        .select('*')
        .eq('user_id', userId)
        .limit(1)
        .single();

    if (error) {
        console.error("Error Details:", JSON.stringify(error, null, 2));
    } else {
        console.log("Success:", data);
    }
}

testFetch();
