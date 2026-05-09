import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: roles } = await supabase
        .from('user_roles')
        .select('role_id, user_id, role')
        .eq('role', 'supervisor');
    
    console.log("Supervisor roles found:", roles);

    if (roles && roles.length > 0) {
        const roleId = roles[0].role_id;
        const { data: perms } = await supabase
            .from('organization_role_permissions')
            .select('*')
            .eq('role_id', roleId);
        
        console.log("Permissions for role_id " + roleId + ":", perms);
    }
}

check();
