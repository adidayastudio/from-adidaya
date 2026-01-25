/**
 * Business Trip by ID API Route
 * Server-side handler for individual business trip operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/server/supabase';
import { requireAuth, successResponse, errorResponse } from '@/lib/server/auth';

const TRIP_COLUMNS = `
    id,
    user_id,
    destination,
    start_date,
    end_date,
    purpose,
    project_id,
    transportation,
    accommodation,
    estimated_cost,
    status,
    reject_reason,
    file_url,
    notes,
    created_at,
    updated_at
`;

type RouteParams = { params: Promise<{ id: string }> };

// PATCH - Update business trip (approve/reject/update)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const supabase = createServerClient();
    const body = await request.json();

    const updateData: Record<string, any> = {};
    const allowedFields = [
        'status', 'reject_reason', 'destination', 'start_date', 'end_date',
        'purpose', 'project_id', 'transportation', 'accommodation',
        'estimated_cost', 'file_url', 'notes'
    ];

    for (const field of allowedFields) {
        if (body[field] !== undefined) {
            updateData[field] = body[field];
        }
    }

    try {
        const { data, error } = await supabase
            .from('business_trips')
            .update(updateData)
            .eq('id', id)
            .select(TRIP_COLUMNS)
            .single();

        if (error) throw error;
        return successResponse(data);
    } catch (error: any) {
        console.error('Error updating business trip:', error);
        return errorResponse(error.message, 500);
    }
}

// DELETE - Delete business trip
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const supabase = createServerClient();

    try {
        const { error } = await supabase
            .from('business_trips')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return successResponse({ success: true });
    } catch (error: any) {
        console.error('Error deleting business trip:', error);
        return errorResponse(error.message, 500);
    }
}
