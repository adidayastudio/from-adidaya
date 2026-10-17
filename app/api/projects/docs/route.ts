/**
 * Project Docs API Route
 * Server-side handlers for project documents
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/server/supabase';
import { requireAuth, successResponse, errorResponse } from '@/lib/server/auth';

const DOC_COLUMNS = `
    id,
    project_id,
    name,
    type,
    category,
    file_url,
    file_size,
    uploaded_by,
    notes,
    created_at,
    updated_at
`;

// GET - List project docs
export async function GET(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const projectId = searchParams.get('project_id');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!projectId) {
        return errorResponse('project_id is required', 400);
    }

    try {
        let query = supabase
            .from('project_docs')
            .select(DOC_COLUMNS)
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (category) query = query.eq('category', category);

        const { data, error } = await query;
        if (error) throw error;

        return successResponse(data || []);
    } catch (error: any) {
        console.error('Error fetching docs:', error);
        return errorResponse(error.message, 500);
    }
}

// POST - Create doc
export async function POST(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId } = authResult;

    const supabase = createServerClient();
    const body = await request.json();

    const { project_id, name, type, category, file_url, file_size, notes } = body;

    if (!project_id || !name || !file_url) {
        return errorResponse('project_id, name, and file_url are required', 400);
    }

    try {
        const { data, error } = await supabase
            .from('project_docs')
            .insert({
                project_id,
                name,
                type: type || 'OTHER',
                category: category || 'GENERAL',
                file_url,
                file_size: file_size || 0,
                uploaded_by: userId,
                notes
            })
            .select(DOC_COLUMNS)
            .single();

        if (error) throw error;
        return successResponse(data, 201);
    } catch (error: any) {
        console.error('Error creating doc:', error);
        return errorResponse(error.message, 500);
    }
}

// DELETE - Delete doc
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
            .from('project_docs')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return successResponse({ success: true });
    } catch (error: any) {
        console.error('Error deleting doc:', error);
        return errorResponse(error.message, 500);
    }
}
