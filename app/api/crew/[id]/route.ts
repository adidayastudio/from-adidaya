/**
 * Crew Member by ID API Route
 * Server-side handlers for individual crew member operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/server/supabase';
import { requireAuth, successResponse, errorResponse } from '@/lib/server/auth';

// Explicit columns to select
const CREW_SELECT_COLUMNS = `
    id,
    workspace_id,
    name,
    initials,
    nik,
    phone,
    email,
    avatar_url,
    role,
    skill_tags,
    status,
    join_date,
    notes,
    base_daily_rate,
    overtime_daily_rate,
    ot_rate_1,
    ot_rate_2,
    ot_rate_3,
    bank_name,
    bank_account,
    current_project_code,
    created_at,
    updated_at
`;

type RouteParams = { params: Promise<{ id: string }> };

// GET - Get single crew member
export async function GET(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const supabase = createServerClient();

    try {
        const { data, error } = await supabase
            .from('crew_members')
            .select(CREW_SELECT_COLUMNS)
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return errorResponse('Crew member not found', 404);

        return successResponse(data);
    } catch (error: any) {
        console.error('Error fetching crew member:', error);
        return errorResponse(error.message, 500);
    }
}

// PUT - Full update crew member
export async function PUT(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const supabase = createServerClient();
    const body = await request.json();

    const updateData: Record<string, any> = {};
    const allowedFields = [
        'name', 'initials', 'nik', 'phone', 'email', 'avatar_url',
        'role', 'skill_tags', 'status', 'join_date', 'notes',
        'base_daily_rate', 'overtime_daily_rate', 'ot_rate_1', 'ot_rate_2', 'ot_rate_3',
        'bank_name', 'bank_account', 'current_project_code'
    ];

    for (const field of allowedFields) {
        if (body[field] !== undefined) {
            updateData[field] = body[field];
        }
    }

    try {
        const { data, error } = await supabase
            .from('crew_members')
            .update(updateData)
            .eq('id', id)
            .select(CREW_SELECT_COLUMNS)
            .single();

        if (error) throw error;
        return successResponse(data);
    } catch (error: any) {
        console.error('Error updating crew member:', error);
        return errorResponse(error.message, 500);
    }
}

// PATCH - Partial update (status, project assignment, etc.)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const supabase = createServerClient();
    const body = await request.json();

    try {
        const { data, error } = await supabase
            .from('crew_members')
            .update(body)
            .eq('id', id)
            .select(CREW_SELECT_COLUMNS)
            .single();

        if (error) throw error;
        return successResponse(data);
    } catch (error: any) {
        console.error('Error patching crew member:', error);
        return errorResponse(error.message, 500);
    }
}

// DELETE - Delete crew member
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const supabase = createServerClient();

    try {
        const { error } = await supabase
            .from('crew_members')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return successResponse({ success: true });
    } catch (error: any) {
        console.error('Error deleting crew member:', error);
        return errorResponse(error.message, 500);
    }
}
