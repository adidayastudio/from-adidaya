/**
 * Project Stages API Route
 * Server-side handlers for project stages
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/server/supabase';
import { requireAuth, successResponse, errorResponse } from '@/lib/server/auth';

const STAGE_COLUMNS = `
    id,
    project_id,
    code,
    name,
    order_index,
    status,
    start_date,
    end_date,
    progress,
    notes,
    created_at,
    updated_at
`;

// GET - List project stages
export async function GET(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    if (!projectId) {
        return errorResponse('project_id is required', 400);
    }

    try {
        const { data, error } = await supabase
            .from('project_stages')
            .select(STAGE_COLUMNS)
            .eq('project_id', projectId)
            .order('order_index', { ascending: true });

        if (error) throw error;
        return successResponse(data || []);
    } catch (error: any) {
        console.error('Error fetching stages:', error);
        return errorResponse(error.message, 500);
    }
}

// POST - Create stage
export async function POST(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const supabase = createServerClient();
    const body = await request.json();

    const { project_id, code, name, order_index, status, start_date, end_date, notes } = body;

    if (!project_id || !code || !name) {
        return errorResponse('project_id, code, and name are required', 400);
    }

    try {
        const { data, error } = await supabase
            .from('project_stages')
            .insert({
                project_id,
                code,
                name,
                order_index: order_index || 0,
                status: status || 'PENDING',
                start_date,
                end_date,
                progress: 0,
                notes
            })
            .select(STAGE_COLUMNS)
            .single();

        if (error) throw error;
        return successResponse(data, 201);
    } catch (error: any) {
        console.error('Error creating stage:', error);
        return errorResponse(error.message, 500);
    }
}

// PATCH - Update stage
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
            .from('project_stages')
            .update(updateData)
            .eq('id', id)
            .select(STAGE_COLUMNS)
            .single();

        if (error) throw error;
        return successResponse(data);
    } catch (error: any) {
        console.error('Error updating stage:', error);
        return errorResponse(error.message, 500);
    }
}
