/**
 * Team Members API Route
 * Server-side handler for fetching team member profiles (for dropdowns, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/server/supabase';
import { requireAuth, successResponse, errorResponse } from '@/lib/server/auth';

// GET - List team members
export async function GET(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const supabase = createServerClient();

    try {
        // Parallel fetch for speed
        const [profilesResult, rolesResult] = await Promise.all([
            supabase.from('profiles').select('id, username, full_name, avatar_url, department'),
            supabase.from('user_roles').select('user_id, role')
        ]);

        const { data: profiles, error: profileError } = profilesResult;
        const { data: roles, error: roleError } = rolesResult;

        if (profileError) throw profileError;
        if (roleError) console.error('Error fetching roles:', roleError);

        // Merge roles into profiles
        const roleMap = new Map<string, string>();
        if (roles) {
            roles.forEach((r: any) => roleMap.set(r.user_id, r.role));
        }

        const members = (profiles || []).map((p: any) => ({
            id: p.id,
            username: p.full_name || p.username || 'Unknown',
            avatar_url: p.avatar_url,
            department: p.department,
            role: roleMap.get(p.id) || 'staff'
        }));

        return successResponse(members);
    } catch (error: any) {
        console.error('Error fetching team members:', error);
        return errorResponse(error.message, 500);
    }
}
