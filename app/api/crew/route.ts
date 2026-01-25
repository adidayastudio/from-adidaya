/**
 * Crew API Route
 * Server-side handlers for crew member operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/server/supabase';
import { requireAuth, successResponse, errorResponse, jsonResponse } from '@/lib/server/auth';

// Explicit columns to select for crew members
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

// GET - List crew members or get by ID
export async function GET(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const id = searchParams.get('id');
    const workspaceId = searchParams.get('workspace_id');
    const status = searchParams.get('status');
    const role = searchParams.get('role');
    const projectCode = searchParams.get('project_code');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    try {
        // Single crew member by ID
        if (id) {
            const { data, error } = await supabase
                .from('crew_members')
                .select(CREW_SELECT_COLUMNS)
                .eq('id', id)
                .single();

            if (error) throw error;
            return successResponse(data);
        }

        // List with filters
        let query = supabase
            .from('crew_members')
            .select(CREW_SELECT_COLUMNS)
            .order('name', { ascending: true })
            .range(offset, offset + limit - 1);

        if (workspaceId) query = query.eq('workspace_id', workspaceId);
        if (status) query = query.eq('status', status);
        if (role) query = query.eq('role', role);
        if (projectCode) query = query.eq('current_project_code', projectCode);
        if (search) query = query.ilike('name', `%${search}%`);

        const { data, error } = await query;
        if (error) throw error;

        return successResponse(data || []);
    } catch (error: any) {
        console.error('Error fetching crew members:', error);
        return errorResponse(error.message, 500);
    }
}

// POST - Create crew member
export async function POST(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const supabase = createServerClient();
    const body = await request.json();

    const {
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
        current_project_code
    } = body;

    if (!name || !role) {
        return errorResponse('Name and role are required', 400);
    }

    // Generate initials if not provided
    const generatedInitials = initials || name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

    try {
        const { data, error } = await supabase
            .from('crew_members')
            .insert({
                workspace_id,
                name,
                initials: generatedInitials,
                nik,
                phone,
                email,
                avatar_url,
                role,
                skill_tags: skill_tags || [],
                status: status || 'ACTIVE',
                join_date,
                notes,
                base_daily_rate: base_daily_rate || 0,
                overtime_daily_rate: overtime_daily_rate || 0,
                ot_rate_1: ot_rate_1 || 0,
                ot_rate_2: ot_rate_2 || 0,
                ot_rate_3: ot_rate_3 || 0,
                bank_name,
                bank_account,
                current_project_code
            })
            .select(CREW_SELECT_COLUMNS)
            .single();

        if (error) throw error;
        return successResponse(data, 201);
    } catch (error: any) {
        console.error('Error creating crew member:', error);
        return errorResponse(error.message, 500);
    }
}
