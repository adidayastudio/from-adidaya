/**
 * Overtime API Route
 * Server-side handlers for overtime requests/logs
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

// GET - List overtime logs
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
            .from('overtime_logs')
            .select(`
                ${OVERTIME_COLUMNS},
                profiles!user_id (username, full_name, avatar_url)
            `)
            .order('date', { ascending: false })
            .limit(limit);

        if (myRequests) {
            query = query.eq('user_id', currentUserId);
        } else if (userId) {
            query = query.eq('user_id', userId);
        }

        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);
        if (status) query = query.eq('status', status);

        const { data, error } = await query;
        if (error) throw error;

        const mapped = (data || []).map((log: any) => ({
            ...log,
            user_name: log.profiles?.full_name || log.profiles?.username,
            user_avatar: log.profiles?.avatar_url,
            profiles: undefined
        }));

        return successResponse(mapped);
    } catch (error: any) {
        console.error('Error fetching overtime logs:', error);
        return errorResponse(error.message, 500);
    }
}

// POST - Create overtime request
export async function POST(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const supabase = createServerClient();
    const body = await request.json();

    const {
        date,
        start_time,
        end_time,
        project_id,
        description,
        photo_url
    } = body;

    if (!date || !start_time || !end_time || !description) {
        return errorResponse('date, start_time, end_time, and description are required', 400);
    }

    try {
        const { data, error } = await supabase
            .from('overtime_logs')
            .insert({
                user_id: userId,
                date,
                start_time,
                end_time,
                project_id,
                description,
                photo_url,
                status: 'pending'
            })
            .select(OVERTIME_COLUMNS)
            .single();

        if (error) throw error;
        return successResponse(data, 201);
    } catch (error: any) {
        console.error('Error creating overtime request:', error);
        return errorResponse(error.message, 500);
    }
}
