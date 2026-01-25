/**
 * Crew Daily Logs API Route
 * Server-side handlers for daily attendance/work logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/server/supabase';
import { requireAuth, successResponse, errorResponse } from '@/lib/server/auth';

const DAILY_LOG_COLUMNS = `
    id,
    workspace_id,
    crew_id,
    project_code,
    date,
    status,
    regular_hours,
    ot1_hours,
    ot2_hours,
    ot3_hours,
    rating,
    created_at,
    updated_at
`;

// GET - List daily logs
export async function GET(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const workspaceId = searchParams.get('workspace_id');
    const projectCode = searchParams.get('project_code');
    const date = searchParams.get('date');
    const crewId = searchParams.get('crew_id');

    if (!workspaceId) {
        return errorResponse('workspace_id is required', 400);
    }

    try {
        let query = supabase
            .from('crew_daily_logs')
            .select(DAILY_LOG_COLUMNS)
            .eq('workspace_id', workspaceId)
            .order('date', { ascending: false });

        if (projectCode) query = query.eq('project_code', projectCode);
        if (date) query = query.eq('date', date);
        if (crewId) query = query.eq('crew_id', crewId);

        const { data, error } = await query;
        if (error) throw error;

        return successResponse(data || []);
    } catch (error: any) {
        console.error('Error fetching daily logs:', error);
        return errorResponse(error.message, 500);
    }
}

// POST - Create or update daily log (upsert)
export async function POST(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const supabase = createServerClient();
    const body = await request.json();

    const {
        workspace_id,
        crew_id,
        project_code,
        date,
        status,
        regular_hours,
        ot1_hours,
        ot2_hours,
        ot3_hours,
        rating
    } = body;

    if (!workspace_id || !crew_id || !project_code || !date) {
        return errorResponse('workspace_id, crew_id, project_code, and date are required', 400);
    }

    try {
        const { data, error } = await supabase
            .from('crew_daily_logs')
            .upsert({
                workspace_id,
                crew_id,
                project_code,
                date,
                status: status || 'PRESENT',
                regular_hours: regular_hours || 0,
                ot1_hours: ot1_hours || 0,
                ot2_hours: ot2_hours || 0,
                ot3_hours: ot3_hours || 0,
                rating
            }, {
                onConflict: 'crew_id,date,project_code'
            })
            .select(DAILY_LOG_COLUMNS)
            .single();

        if (error) throw error;
        return successResponse(data, 201);
    } catch (error: any) {
        console.error('Error upserting daily log:', error);
        return errorResponse(error.message, 500);
    }
}

// DELETE - Delete daily log
export async function DELETE(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const crewId = searchParams.get('crew_id');
    const date = searchParams.get('date');
    const projectCode = searchParams.get('project_code');

    if (!crewId || !date) {
        return errorResponse('crew_id and date are required', 400);
    }

    try {
        let query = supabase
            .from('crew_daily_logs')
            .delete()
            .eq('crew_id', crewId)
            .eq('date', date);

        if (projectCode) {
            query = query.eq('project_code', projectCode);
        }

        const { error } = await query;
        if (error) throw error;

        return successResponse({ success: true });
    } catch (error: any) {
        console.error('Error deleting daily log:', error);
        return errorResponse(error.message, 500);
    }
}
