/**
 * Crew Request by ID API Route
 * Server-side handlers for individual crew request operations
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

type RouteParams = { params: Promise<{ id: string }> };

// PATCH - Update request (status, approval, etc.)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const { id } = await params;
    const supabase = createServerClient();
    const body = await request.json();

    const updateData: Record<string, any> = {};

    // Allow updating these fields
    if (body.status !== undefined) updateData.status = body.status;
    if (body.reason !== undefined) updateData.reason = body.reason;
    if (body.proof_url !== undefined) updateData.proof_url = body.proof_url;
    if (body.amount !== undefined) updateData.amount = body.amount;
    if (body.start_date !== undefined) updateData.start_date = body.start_date;
    if (body.end_date !== undefined) updateData.end_date = body.end_date;

    // If approving/rejecting, record who did it
    if (body.status === 'APPROVED' || body.status === 'REJECTED') {
        updateData.approved_by = userId;
    }

    try {
        const { data, error } = await supabase
            .from('crew_requests')
            .update(updateData)
            .eq('id', id)
            .select(REQUEST_COLUMNS)
            .single();

        if (error) throw error;
        return successResponse(data);
    } catch (error: any) {
        console.error('Error updating crew request:', error);
        return errorResponse(error.message, 500);
    }
}

// DELETE - Delete crew request
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const supabase = createServerClient();

    try {
        const { error } = await supabase
            .from('crew_requests')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return successResponse({ success: true });
    } catch (error: any) {
        console.error('Error deleting crew request:', error);
        return errorResponse(error.message, 500);
    }
}
