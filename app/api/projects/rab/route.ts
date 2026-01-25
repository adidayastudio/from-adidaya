/**
 * RAB (Rencana Anggaran Biaya) API Route
 * Server-side handlers for RAB versions and items
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/server/supabase';
import { requireAuth, successResponse, errorResponse } from '@/lib/server/auth';

const RAB_VERSION_COLUMNS = `
    id,
    project_id,
    version_number,
    name,
    status,
    total_amount,
    created_by,
    approved_by,
    approved_at,
    notes,
    created_at,
    updated_at
`;

const RAB_ITEM_COLUMNS = `
    id,
    rab_version_id,
    wbs_id,
    wbs_code,
    name,
    unit,
    quantity,
    unit_price,
    total_price,
    category,
    notes,
    created_at
`;

// GET - List RAB versions or items
export async function GET(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const projectId = searchParams.get('project_id');
    const rabVersionId = searchParams.get('rab_version_id');
    const getItems = searchParams.get('items') === 'true';

    try {
        // Get RAB items for a version
        if (getItems && rabVersionId) {
            const { data, error } = await supabase
                .from('rab_items')
                .select(RAB_ITEM_COLUMNS)
                .eq('rab_version_id', rabVersionId)
                .order('wbs_code', { ascending: true });

            if (error) throw error;
            return successResponse(data || []);
        }

        // Get RAB versions for a project
        if (!projectId) {
            return errorResponse('project_id is required', 400);
        }

        const { data, error } = await supabase
            .from('rab_versions')
            .select(RAB_VERSION_COLUMNS)
            .eq('project_id', projectId)
            .order('version_number', { ascending: false });

        if (error) throw error;
        return successResponse(data || []);
    } catch (error: any) {
        console.error('Error fetching RAB:', error);
        return errorResponse(error.message, 500);
    }
}

// POST - Create RAB version
export async function POST(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const supabase = createServerClient();
    const body = await request.json();

    const { project_id, version_number, name, status, total_amount, notes } = body;

    if (!project_id || !name) {
        return errorResponse('project_id and name are required', 400);
    }

    try {
        const { data, error } = await supabase
            .from('rab_versions')
            .insert({
                project_id,
                version_number: version_number || 1,
                name,
                status: status || 'DRAFT',
                total_amount: total_amount || 0,
                created_by: userId,
                notes
            })
            .select(RAB_VERSION_COLUMNS)
            .single();

        if (error) throw error;
        return successResponse(data, 201);
    } catch (error: any) {
        console.error('Error creating RAB version:', error);
        return errorResponse(error.message, 500);
    }
}
