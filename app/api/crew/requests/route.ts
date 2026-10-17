/**
 * Crew Requests API Route
 * Server-side handlers for crew leave/kasbon requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/server/supabase';
import { requireAuth, successResponse, errorResponse } from '@/lib/server/auth';

const REQUEST_COLUMNS = `
    id,
    workspace_id,
    crew_id,
    project_code,
    type,
    amount,
    start_date,
    end_date,
    reason,
    proof_url,
    status,
    approved_by,
    created_at,
    updated_at
`;

// GET - List crew requests
export async function GET(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const workspaceId = searchParams.get('workspace_id');
    const projectCode = searchParams.get('project_code');
    const crewId = searchParams.get('crew_id');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    if (!workspaceId) {
        return errorResponse('workspace_id is required', 400);
    }

    try {
        let query = supabase
            .from('crew_requests')
            .select(`
                ${REQUEST_COLUMNS},
                crew_members!crew_id (name, role)
            `)
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false });

        if (projectCode) query = query.eq('project_code', projectCode);
        if (crewId) query = query.eq('crew_id', crewId);
        if (status) query = query.eq('status', status);
        if (type) query = query.eq('type', type);

        const { data, error } = await query;
        if (error) throw error;

        // Map crew info
        const mapped = (data || []).map((req: any) => ({
            ...req,
            crew_name: req.crew_members?.name,
            crew_role: req.crew_members?.role,
            crew_members: undefined
        }));

        return successResponse(mapped);
    } catch (error: any) {
        console.error('Error fetching crew requests:', error);
        return errorResponse(error.message, 500);
    }
}

// POST - Create crew request
export async function POST(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const supabase = createServerClient();
    const body = await request.json();

    const {
        workspace_id,
        crew_id,
        project_code,
        type,
        amount,
        start_date,
        end_date,
        reason,
        proof_url
    } = body;

    if (!workspace_id || !crew_id || !type || !start_date || !reason) {
        return errorResponse('workspace_id, crew_id, type, start_date, and reason are required', 400);
    }

    try {
        const { data, error } = await supabase
            .from('crew_requests')
            .insert({
                workspace_id,
                crew_id,
                project_code,
                type,
                amount,
                start_date,
                end_date,
                reason,
                proof_url,
                status: 'PENDING'
            })
            .select(REQUEST_COLUMNS)
            .single();

        if (error) throw error;
        return successResponse(data, 201);
    } catch (error: any) {
        console.error('Error creating crew request:', error);
        return errorResponse(error.message, 500);
    }
}
