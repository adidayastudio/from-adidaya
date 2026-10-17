/**
 * Business Trips API Route
 * Server-side handlers for business trip requests
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

// GET - List business trips
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
            .from('business_trips')
            .select(`
                ${TRIP_COLUMNS},
                profiles!user_id (username, full_name, avatar_url)
            `)
            .order('start_date', { ascending: false })
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

        const mapped = (data || []).map((trip: any) => ({
            ...trip,
            user_name: trip.profiles?.full_name || trip.profiles?.username,
            user_avatar: trip.profiles?.avatar_url,
            profiles: undefined
        }));

        return successResponse(mapped);
    } catch (error: any) {
        console.error('Error fetching business trips:', error);
        return errorResponse(error.message, 500);
    }
}

// POST - Create business trip request
export async function POST(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const supabase = createServerClient();
    const body = await request.json();

    const {
        destination,
        start_date,
        end_date,
        purpose,
        project_id,
        transportation,
        accommodation,
        estimated_cost,
        file_url,
        notes
    } = body;

    if (!destination || !start_date || !end_date || !purpose) {
        return errorResponse('destination, start_date, end_date, and purpose are required', 400);
    }

    try {
        const { data, error } = await supabase
            .from('business_trips')
            .insert({
                user_id: userId,
                destination,
                start_date,
                end_date,
                purpose,
                project_id,
                transportation,
                accommodation,
                estimated_cost,
                file_url,
                notes,
                status: 'pending'
            })
            .select(TRIP_COLUMNS)
            .single();

        if (error) throw error;
        return successResponse(data, 201);
    } catch (error: any) {
        console.error('Error creating business trip:', error);
        return errorResponse(error.message, 500);
    }
}
