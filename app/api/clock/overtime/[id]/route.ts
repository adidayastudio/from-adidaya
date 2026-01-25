/**
 * Overtime by ID API Route
 * Server-side handler for individual overtime operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/server/supabase';
import { requireAuth, successResponse, errorResponse } from '@/lib/server/auth';

const OVERTIME_COLUMNS = `
    id,
    user_id,
    date,
    start_time,
    end_time,
    project_id,
    status,
    description,
    photo_url,
    approved_start_time,
    approved_end_time,
    reject_reason,
    created_at,
    updated_at
`;

type RouteParams = { params: Promise<{ id: string }> };

// PATCH - Update overtime (approve/reject/update)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const supabase = createServerClient();
    const body = await request.json();

    const updateData: Record<string, any> = {};
    const allowedFields = [
        'status', 'reject_reason', 'description', 'date',
        'start_time', 'end_time', 'approved_start_time', 'approved_end_time',
        'photo_url', 'project_id'
    ];

    for (const field of allowedFields) {
        if (body[field] !== undefined) {
            updateData[field] = body[field];
        }
    }

    try {
        const { data, error } = await supabase
            .from('overtime_logs')
            .update(updateData)
            .eq('id', id)
            .select(OVERTIME_COLUMNS)
            .single();

        if (error) throw error;
        return successResponse(data);
    } catch (error: any) {
        console.error('Error updating overtime:', error);
        return errorResponse(error.message, 500);
    }
}

// DELETE - Delete overtime request
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const supabase = createServerClient();

    try {
        const { error } = await supabase
            .from('overtime_logs')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return successResponse({ success: true });
    } catch (error: any) {
        console.error('Error deleting overtime:', error);
        return errorResponse(error.message, 500);
    }
}
