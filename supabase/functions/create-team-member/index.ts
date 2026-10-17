// @ts-nocheck Deno Edge Function is deployed outside the Expo TypeScript runtime.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (request) => {
    if (request.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');

        if (!supabaseUrl || !serviceRoleKey || !token) {
            throw new Error('Unauthorized');
        }

        const admin = createClient(supabaseUrl, serviceRoleKey);
        const { data: { user: caller }, error: callerError } = await admin.auth.getUser(token);
        if (callerError || !caller) throw new Error('Unauthorized');

        const { tenantId, fullName, email, password, role, status = 'active' } = await request.json();
        if (!tenantId || !fullName || !email || !password || !role) {
            throw new Error('Missing required member information.');
        }

        const { data: callerMembership, error: membershipError } = await admin
            .from('tenant_members')
            .select('role')
            .eq('tenant_id', tenantId)
            .eq('user_id', caller.id)
            .maybeSingle();

        if (membershipError) throw membershipError;
        const callerRole = String(callerMembership?.role || '').toLowerCase();
        if (!['owner', 'admin', 'super admin', 'super_admin', 'superadmin'].includes(callerRole)) {
            throw new Error('You do not have permission to add team members.');
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const { data: existingProfile, error: profileLookupError } = await admin
            .from('profiles')
            .select('id')
            .eq('email', normalizedEmail)
            .maybeSingle();
        if (profileLookupError) throw profileLookupError;

        let userId = existingProfile?.id;
        if (!userId) {
            const username = String(fullName).trim().toLowerCase().replace(/\s+/g, '_');
            const { data: created, error: createError } = await admin.auth.admin.createUser({
                email: normalizedEmail,
                password,
                email_confirm: true,
                user_metadata: { full_name: String(fullName).trim(), username },
            });
            if (createError) throw createError;
            userId = created.user.id;

            const { error: profileError } = await admin.from('profiles').upsert({
                id: userId,
                email: normalizedEmail,
                full_name: String(fullName).trim(),
                username,
                status,
            });
            if (profileError) throw profileError;
        } else {
            const { error: confirmError } = await admin.auth.admin.updateUserById(userId, {
                email_confirm: true,
            });
            if (confirmError) throw confirmError;
        }

        const { data: existingMembership, error: existingMembershipError } = await admin
            .from('tenant_members')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('user_id', userId)
            .maybeSingle();
        if (existingMembershipError) throw existingMembershipError;

        const membershipQuery = existingMembership?.id
            ? admin.from('tenant_members').update({ role, status }).eq('id', existingMembership.id)
            : admin.from('tenant_members').insert({ tenant_id: tenantId, user_id: userId, role, status });
        const { error: saveMembershipError } = await membershipQuery;
        if (saveMembershipError) throw saveMembershipError;

        return new Response(JSON.stringify({ userId }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
