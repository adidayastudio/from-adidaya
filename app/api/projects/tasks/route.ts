/**
 * Project Tasks API Route
 * Server-side handlers for project tasks
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/server/supabase';
import { requireAuth, successResponse, errorResponse } from '@/lib/server/auth';

const TASK_COLUMNS = `
    id,
    project_id,
    title,
    description,
    status,
    priority,
    due_date,
    assignee_id,
    created_by,
    tags,
    created_at,
    updated_at
`;

// GET - List project tasks
export async function GET(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const projectId = searchParams.get('project_id');
    const status = searchParams.get('status');
    const assigneeId = searchParams.get('assignee_id');
    const limit = parseInt(searchParams.get('limit') || '50');

    try {
        let query = supabase
            .from('project_tasks')
            .select(TASK_COLUMNS)
            .order('due_date', { ascending: true })
            .limit(limit);

        if (projectId) query = query.eq('project_id', projectId);
        if (status) query = query.eq('status', status);
        if (assigneeId) query = query.eq('assignee_id', assigneeId);

        const { data, error } = await query;
        if (error) throw error;

        return successResponse(data || []);
    } catch (error: any) {
        console.error('Error fetching tasks:', error);
        return errorResponse(error.message, 500);
    }
}

// POST - Create task
export async function POST(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const supabase = createServerClient();
    const body = await request.json();

    const { project_id, title, description, status, priority, due_date, assignee_id, tags } = body;

    if (!project_id || !title) {
        return errorResponse('project_id and title are required', 400);
    }

    try {
        const { data, error } = await supabase
            .from('project_tasks')
            .insert({
                project_id,
                title,
                description,
                status: status || 'TODO',
                priority: priority || 'MEDIUM',
                due_date,
                assignee_id,
                created_by: userId,
                tags: tags || []
            })
            .select(TASK_COLUMNS)
            .single();

        if (error) throw error;
        return successResponse(data, 201);
    } catch (error: any) {
        console.error('Error creating task:', error);
        return errorResponse(error.message, 500);
    }
}

// PATCH - Update task
export async function PATCH(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const supabase = createServerClient();
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
        return errorResponse('id is required', 400);
    }

    try {
        const { data, error } = await supabase
            .from('project_tasks')
            .update(updateData)
            .eq('id', id)
            .select(TASK_COLUMNS)
            .single();

        if (error) throw error;
        return successResponse(data);
    } catch (error: any) {
        console.error('Error updating task:', error);
        return errorResponse(error.message, 500);
    }
}

// DELETE - Delete task
export async function DELETE(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return errorResponse('id is required', 400);
    }

    try {
        const { error } = await supabase
            .from('project_tasks')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return successResponse({ success: true });
    } catch (error: any) {
        console.error('Error deleting task:', error);
        return errorResponse(error.message, 500);
    }
}
