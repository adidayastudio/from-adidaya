/**
 * Leave Requests API Route
 * Server-side handlers for leave/cuti requests
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

// GET - List leave requests
export async function GET(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId: currentUserId } = authResult;

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const userId = searchParams.get('user_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const status = searchParams.get('status');
    const myRequests = searchParams.get('my_requests') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    try {
        let query = supabase
            .from('leave_requests')
            .select(`
                ${LEAVE_COLUMNS},
                profiles!user_id (username, full_name, avatar_url)
            `)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (myRequests) {
            query = query.eq('user_id', currentUserId);
        } else if (userId) {
            query = query.eq('user_id', userId);
        }

        if (startDate) query = query.gte('start_date', startDate);
        if (endDate) query = query.lte('end_date', endDate);
        if (status) query = query.eq('status', status);

        const { data, error } = await query;
        if (error) throw error;

        // Map user info
        const mapped = (data || []).map((req: any) => ({
            ...req,
            user_name: req.profiles?.full_name || req.profiles?.username,
            user_avatar: req.profiles?.avatar_url,
            profiles: undefined
        }));

        return successResponse(mapped);
    } catch (error: any) {
        console.error('Error fetching leave requests:', error);
        return errorResponse(error.message, 500);
    }
}

// POST - Create leave request
export async function POST(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const supabase = createServerClient();
    const body = await request.json();

    const {
        type,
        start_date,
        end_date,
        reason,
        file_url
    } = body;

    if (!type || !start_date || !end_date || !reason) {
        return errorResponse('type, start_date, end_date, and reason are required', 400);
    }

    try {
        const { data, error } = await supabase
            .from('leave_requests')
            .insert({
                user_id: userId,
                type,
                start_date,
                end_date,
                reason,
                file_url,
                status: 'pending'
            })
            .select(LEAVE_COLUMNS)
            .single();

        if (error) throw error;
        return successResponse(data, 201);
    } catch (error: any) {
        console.error('Error creating leave request:', error);
        return errorResponse(error.message, 500);
    }
}

// DELETE - Delete leave request
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
            .from('leave_requests')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return successResponse({ success: true });
    } catch (error: any) {
        console.error('Error deleting leave request:', error);
        return errorResponse(error.message, 500);
    }
}
