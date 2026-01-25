/**
 * Leave Request by ID API Route
 * Server-side handler for individual leave request operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/server/supabase';
import { requireAuth, successResponse, errorResponse } from '@/lib/server/auth';

const LEAVE_COLUMNS = `
    id,
    user_id,
    type,
    start_date,
    end_date,
    status,
    reason,
    reject_reason,
    file_url,
    created_at,
    updated_at
`;

type RouteParams = { params: Promise<{ id: string }> };

// PATCH - Update leave request (approve/reject/update)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const supabase = createServerClient();
    const body = await request.json();

    const updateData: Record<string, any> = {};
    const allowedFields = ['status', 'reject_reason', 'reason', 'start_date', 'end_date', 'file_url'];

    for (const field of allowedFields) {
        if (body[field] !== undefined) {
            updateData[field] = body[field];
        }
    }

    try {
        const { data, error } = await supabase
            .from('leave_requests')
            .update(updateData)
            .eq('id', id)
            .select(LEAVE_COLUMNS)
            .single();

        if (error) throw error;
        return successResponse(data);
    } catch (error: any) {
        console.error('Error updating leave request:', error);
        return errorResponse(error.message, 500);
    }
}
