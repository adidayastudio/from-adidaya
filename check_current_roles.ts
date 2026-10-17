import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: roles } = await supabase.from('user_roles').select('role, user_id');
    console.log("All User Roles (unique):", [...new Set(roles?.map(r => r.role))]);
}
check();
