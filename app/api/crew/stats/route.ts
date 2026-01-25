/**
 * Crew Stats API Route
 * Server-side handler for crew statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/server/supabase';
import { requireAuth, successResponse, errorResponse } from '@/lib/server/auth';

const SKILLED_ROLES = ['FOREMAN', 'LEADER', 'SKILLED', 'OPERATOR'];

// GET - Get crew statistics
export async function GET(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');

    try {
        // Build base query
        let query = supabase
            .from('crew_members')
            .select('id, role, status');

        if (workspaceId) {
            query = query.eq('workspace_id', workspaceId);
        }

        const { data, error } = await query;
        if (error) throw error;

        const members = data || [];
        const total = members.length;
        const active = members.filter(m => m.status === 'ACTIVE').length;
        const skilled = members.filter(m => SKILLED_ROLES.includes(m.role)).length;
        const unskilled = total - skilled;

        return successResponse({
            total,
            active,
            skilled,
            unskilled
        });
    } catch (error: any) {
        console.error('Error fetching crew stats:', error);
        return errorResponse(error.message, 500);
    }
}
