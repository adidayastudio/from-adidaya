/**
 * Schedule API Route
 * Server-side handlers for schedule versions and tasks
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/server/supabase';
import { requireAuth, successResponse, errorResponse } from '@/lib/server/auth';

const SCHEDULE_VERSION_COLUMNS = `
    id,
    project_id,
    version_number,
    name,
    status,
    start_date,
    end_date,
    created_by,
    notes,
    created_at,
    updated_at
`;

const SCHEDULE_TASK_COLUMNS = `
    id,
    schedule_version_id,
    wbs_id,
    name,
    start_date,
    end_date,
    duration_days,
    progress,
    dependencies,
    assignees,
    status,
    notes,
    created_at
`;

// GET - List schedule versions or tasks
export async function GET(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const projectId = searchParams.get('project_id');
    const scheduleVersionId = searchParams.get('schedule_version_id');
    const getTasks = searchParams.get('tasks') === 'true';

    try {
        // Get schedule tasks for a version
        if (getTasks && scheduleVersionId) {
            const { data, error } = await supabase
                .from('schedule_tasks')
                .select(SCHEDULE_TASK_COLUMNS)
                .eq('schedule_version_id', scheduleVersionId)
                .order('start_date', { ascending: true });

            if (error) throw error;
            return successResponse(data || []);
        }

        // Get schedule versions for a project
        if (!projectId) {
            return errorResponse('project_id is required', 400);
        }

        const { data, error } = await supabase
            .from('schedule_versions')
            .select(SCHEDULE_VERSION_COLUMNS)
            .eq('project_id', projectId)
            .order('version_number', { ascending: false });

        if (error) throw error;
        return successResponse(data || []);
    } catch (error: any) {
        console.error('Error fetching schedule:', error);
        return errorResponse(error.message, 500);
    }
}

// POST - Create schedule version or task
export async function POST(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const supabase = createServerClient();
    const body = await request.json();

    // Determine if creating version or task
    if (body.schedule_version_id) {
        // Create task
        const { schedule_version_id, wbs_id, name, start_date, end_date, duration_days, dependencies, assignees, notes } = body;

        if (!schedule_version_id || !name) {
            return errorResponse('schedule_version_id and name are required', 400);
        }

        try {
            const { data, error } = await supabase
                .from('schedule_tasks')
                .insert({
                    schedule_version_id,
                    wbs_id,
                    name,
                    start_date,
                    end_date,
                    duration_days: duration_days || 1,
                    progress: 0,
                    dependencies: dependencies || [],
                    assignees: assignees || [],
                    status: 'PENDING',
                    notes
                })
                .select(SCHEDULE_TASK_COLUMNS)
                .single();

            if (error) throw error;
            return successResponse(data, 201);
        } catch (error: any) {
            console.error('Error creating schedule task:', error);
            return errorResponse(error.message, 500);
        }
    } else {
        // Create version
        const { project_id, version_number, name, status, start_date, end_date, notes } = body;

        if (!project_id || !name) {
            return errorResponse('project_id and name are required', 400);
        }

        try {
            const { data, error } = await supabase
                .from('schedule_versions')
                .insert({
                    project_id,
                    version_number: version_number || 1,
                    name,
                    status: status || 'DRAFT',
                    start_date,
                    end_date,
                    created_by: userId,
                    notes
                })
                .select(SCHEDULE_VERSION_COLUMNS)
                .single();

            if (error) throw error;
            return successResponse(data, 201);
        } catch (error: any) {
            console.error('Error creating schedule version:', error);
            return errorResponse(error.message, 500);
        }
    }
}
