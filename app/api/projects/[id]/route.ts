/**
 * Project by ID API Route
 * Server-side handlers for individual project operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/server/supabase';
import { requireAuth, successResponse, errorResponse } from '@/lib/server/auth';

const PROJECT_COLUMNS = `
    id,
    workspace_id,
    project_code,
    project_name,
    project_type,
    client_id,
    client_name,
    location,
    status,
    start_date,
    target_date,
    budget,
    description,
    stages,
    created_at,
    updated_at
`;

type RouteParams = { params: Promise<{ id: string }> };

// GET - Get single project
export async function GET(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const supabase = createServerClient();

    try {
        const { data, error } = await supabase
            .from('projects')
            .select(PROJECT_COLUMNS)
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return errorResponse('Project not found', 404);

        return successResponse(data);
    } catch (error: any) {
        console.error('Error fetching project:', error);
        return errorResponse(error.message, 500);
    }
}

// PUT/PATCH - Update project
export async function PUT(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const supabase = createServerClient();
    const body = await request.json();

    const updateData: Record<string, any> = {};
    const allowedFields = [
        'project_code', 'project_name', 'project_type', 'client_id', 'client_name',
        'location', 'status', 'start_date', 'target_date', 'budget', 'description', 'stages'
    ];

    for (const field of allowedFields) {
        if (body[field] !== undefined) {
            updateData[field] = body[field];
        }
    }

    try {
        const { data, error } = await supabase
            .from('projects')
            .update(updateData)
            .eq('id', id)
            .select(PROJECT_COLUMNS)
            .single();

        if (error) throw error;
        return successResponse(data);
    } catch (error: any) {
        console.error('Error updating project:', error);
        return errorResponse(error.message, 500);
    }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    return PUT(request, { params });
}

// DELETE - Delete project
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const supabase = createServerClient();

    try {
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return successResponse({ success: true });
    } catch (error: any) {
        console.error('Error deleting project:', error);
        return errorResponse(error.message, 500);
    }
}
