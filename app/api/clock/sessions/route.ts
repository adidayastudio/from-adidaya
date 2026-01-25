/**
 * Attendance Sessions API Route
 * Server-side handlers for clock in/out sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/server/supabase';
import { requireAuth, successResponse, errorResponse } from '@/lib/server/auth';

const SESSION_COLUMNS = `
    id,
    user_id,
    date,
    session_number,
    clock_in,
    clock_out,
    duration_minutes,
    is_overtime,
    latitude,
    longitude,
    location_code,
    location_type,
    remote_mode,
    location_status,
    created_at
`;

// GET - List attendance sessions
export async function GET(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId: currentUserId } = authResult;

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const userId = searchParams.get('user_id');
    const date = searchParams.get('date');
    const myRecords = searchParams.get('my_records') === 'true';

    try {
        let query = supabase
            .from('attendance_sessions')
            .select(SESSION_COLUMNS)
            .order('clock_in', { ascending: true });

        if (myRecords) {
            query = query.eq('user_id', currentUserId);
        } else if (userId) {
            query = query.eq('user_id', userId);
        }

        if (date) query = query.eq('date', date);

        const { data, error } = await query;
        if (error) throw error;

        return successResponse(data || []);
    } catch (error: any) {
        console.error('Error fetching sessions:', error);
        return errorResponse(error.message, 500);
    }
}
