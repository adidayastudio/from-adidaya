/**
 * Workspaces API Route
 * Server-side handler for workspace operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/server/supabase';
import { requireAuth, successResponse, errorResponse } from '@/lib/server/auth';

// GET - Get workspaces (or default workspace)
export async function GET(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const getDefault = searchParams.get('default') === 'true';

    try {
        if (getDefault) {
            const { data, error } = await supabase
                .from('workspaces')
                .select('id, name, slug, created_at')
                .limit(1)
                .single();

            if (error) throw error;
            return successResponse(data);
        }

        const { data, error } = await supabase
            .from('workspaces')
            .select('id, name, slug, created_at')
            .order('name');

        if (error) throw error;
        return successResponse(data || []);
    } catch (error: any) {
        console.error('Error fetching workspaces:', error);
        return errorResponse(error.message, 500);
    }
}
