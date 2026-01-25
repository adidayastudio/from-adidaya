/**
 * WBS (Work Breakdown Structure) API Route
 * Server-side handlers for WBS items
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/server/supabase';
import { requireAuth, successResponse, errorResponse } from '@/lib/server/auth';

const WBS_COLUMNS = `
    id,
    project_id,
    parent_id,
    code,
    name,
    order_index,
    level,
    unit,
    quantity,
    unit_price,
    is_leaf,
    stage_code,
    notes,
    created_at,
    updated_at
`;

// GET - List WBS items for a project
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
            .from('wbs_items')
            .select(WBS_COLUMNS)
            .eq('project_id', projectId)
            .order('code', { ascending: true });

        if (error) throw error;
        return successResponse(data || []);
    } catch (error: any) {
        console.error('Error fetching WBS:', error);
        return errorResponse(error.message, 500);
    }
}

// POST - Create WBS item
export async function POST(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const supabase = createServerClient();
    const body = await request.json();

    const {
        project_id, parent_id, code, name, order_index,
        level, unit, quantity, unit_price, is_leaf, stage_code, notes
    } = body;

    if (!project_id || !code || !name) {
        return errorResponse('project_id, code, and name are required', 400);
    }

    try {
        const { data, error } = await supabase
            .from('wbs_items')
            .insert({
                project_id,
                parent_id,
                code,
                name,
                order_index: order_index || 0,
                level: level || 0,
                unit,
                quantity: quantity || 0,
                unit_price: unit_price || 0,
                is_leaf: is_leaf ?? true,
                stage_code,
                notes
            })
            .select(WBS_COLUMNS)
            .single();

        if (error) throw error;
        return successResponse(data, 201);
    } catch (error: any) {
        console.error('Error creating WBS item:', error);
        return errorResponse(error.message, 500);
    }
}

// PUT - Update WBS item
export async function PUT(request: NextRequest) {
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
            .from('wbs_items')
            .update(updateData)
            .eq('id', id)
            .select(WBS_COLUMNS)
            .single();

        if (error) throw error;
        return successResponse(data);
    } catch (error: any) {
        console.error('Error updating WBS item:', error);
        return errorResponse(error.message, 500);
    }
}

// DELETE - Delete WBS item
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
            .from('wbs_items')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return successResponse({ success: true });
    } catch (error: any) {
        console.error('Error deleting WBS item:', error);
        return errorResponse(error.message, 500);
    }
}
