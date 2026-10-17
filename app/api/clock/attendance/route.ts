/**
 * Attendance API Route
 * Server-side handlers for attendance records
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/server/supabase';
import { requireAuth, successResponse, errorResponse } from '@/lib/server/auth';

const ATTENDANCE_COLUMNS = `
    id,
    user_id,
    date,
    clock_in,
    clock_out,
    status,
    total_minutes,
    overtime_minutes,
    check_in_latitude,
    check_in_longitude,
    check_in_location_code,
    check_in_location_type,
    check_in_remote_mode,
    check_in_location_status,
    notes,
    created_at,
    updated_at
`;

// GET - List attendance records
export async function GET(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId: currentUserId } = authResult;

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const userId = searchParams.get('user_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const myRecords = searchParams.get('my_records') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    try {
        let query = supabase
            .from('attendance_records')
            .select(`
                ${ATTENDANCE_COLUMNS},
                profiles!user_id (username, full_name, avatar_url, department)
            `)
            .order('date', { ascending: false })
            .range(offset, offset + limit - 1);

        // Filter by user
        if (myRecords) {
            query = query.eq('user_id', currentUserId);
        } else if (userId) {
            query = query.eq('user_id', userId);
        }

        // Date range
        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);

        const { data, error } = await query;
        if (error) throw error;

        // Map user info
        const mapped = (data || []).map((record: any) => ({
            ...record,
            user_name: record.profiles?.full_name || record.profiles?.username,
            user_avatar: record.profiles?.avatar_url,
            user_department: record.profiles?.department,
            profiles: undefined
        }));

        return successResponse(mapped);
    } catch (error: any) {
        console.error('Error fetching attendance records:', error);
        return errorResponse(error.message, 500);
    }
}

// POST - Create attendance record (admin use)
export async function POST(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const supabase = createServerClient();
    const body = await request.json();

    const {
        user_id,
        date,
        clock_in,
        clock_out,
        status,
        total_minutes,
        overtime_minutes,
        notes
    } = body;

    if (!user_id || !date) {
        return errorResponse('user_id and date are required', 400);
    }

    try {
        const { data, error } = await supabase
            .from('attendance_records')
            .upsert({
                user_id,
                date,
                clock_in,
                clock_out,
                status: status || 'present',
                total_minutes: total_minutes || 0,
                overtime_minutes: overtime_minutes || 0,
                notes
            }, {
                onConflict: 'user_id,date'
            })
            .select(ATTENDANCE_COLUMNS)
            .single();

        if (error) throw error;
        return successResponse(data, 201);
    } catch (error: any) {
        console.error('Error creating attendance record:', error);
        return errorResponse(error.message, 500);
    }
}
