/**
 * Projects API Route
 * Server-side handlers for project CRUD operations
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

// GET - List projects
export async function GET(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const id = searchParams.get('id');
    const workspaceId = searchParams.get('workspace_id');
    const status = searchParams.get('status');
    const projectType = searchParams.get('project_type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    try {
        // Single project by ID
        if (id) {
            const { data, error } = await supabase
                .from('projects')
                .select(PROJECT_COLUMNS)
                .eq('id', id)
                .single();

            if (error) throw error;
            return successResponse(data);
        }

        // List with filters
        let query = supabase
            .from('projects')
            .select(PROJECT_COLUMNS)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (workspaceId) query = query.eq('workspace_id', workspaceId);
        if (status) query = query.eq('status', status);
        if (projectType) query = query.eq('project_type', projectType);

        const { data, error } = await query;
        if (error) throw error;

        return successResponse(data || []);
    } catch (error: any) {
        console.error('Error fetching projects:', error);
        return errorResponse(error.message, 500);
    }
}

// POST - Create project
export async function POST(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const supabase = createServerClient();
    const body = await request.json();

    const {
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
        stages
    } = body;

    if (!workspace_id || !project_code || !project_name) {
        return errorResponse('workspace_id, project_code, and project_name are required', 400);
    }

    try {
        const { data, error } = await supabase
            .from('projects')
            .insert({
                workspace_id,
                project_code,
                project_name,
                project_type: project_type || 'CONSTRUCTION',
                client_id,
                client_name,
                location,
                status: status || 'ACTIVE',
                start_date,
                target_date,
                budget: budget || 0,
                description,
                stages: stages || []
            })
            .select(PROJECT_COLUMNS)
            .single();

        if (error) throw error;
        return successResponse(data, 201);
    } catch (error: any) {
        console.error('Error creating project:', error);
        return errorResponse(error.message, 500);
    }
}
