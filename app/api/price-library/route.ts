/**
 * Price Library API Route
 * Server-side handlers for price library items
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/server/supabase';
import { requireAuth, successResponse, errorResponse } from '@/lib/server/auth';

const PRICE_COLUMNS = `
    id,
    workspace_id,
    code,
    name,
    category,
    sub_category,
    unit,
    unit_price,
    material_cost,
    labor_cost,
    equipment_cost,
    overhead_percent,
    profit_percent,
    description,
    is_active,
    created_at,
    updated_at
`;

// GET - List price library items
export async function GET(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const workspaceId = searchParams.get('workspace_id');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    try {
        let query = supabase
            .from('price_library')
            .select(PRICE_COLUMNS)
            .eq('is_active', true)
            .order('code')
            .range(offset, offset + limit - 1);

        if (workspaceId) query = query.eq('workspace_id', workspaceId);
        if (category) query = query.eq('category', category);
        if (search) query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);

        const { data, error } = await query;
        if (error) throw error;

        return successResponse(data || []);
    } catch (error: any) {
        console.error('Error fetching price library:', error);
        return errorResponse(error.message, 500);
    }
}

// POST - Create price item
export async function POST(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const supabase = createServerClient();
    const body = await request.json();

    const {
        workspace_id, code, name, category, sub_category, unit,
        unit_price, material_cost, labor_cost, equipment_cost,
        overhead_percent, profit_percent, description
    } = body;

    if (!workspace_id || !code || !name || !unit) {
        return errorResponse('workspace_id, code, name, and unit are required', 400);
    }

    try {
        const { data, error } = await supabase
            .from('price_library')
            .insert({
                workspace_id,
                code,
                name,
                category,
                sub_category,
                unit,
                unit_price: unit_price || 0,
                material_cost: material_cost || 0,
                labor_cost: labor_cost || 0,
                equipment_cost: equipment_cost || 0,
                overhead_percent: overhead_percent || 0,
                profit_percent: profit_percent || 0,
                description,
                is_active: true
            })
            .select(PRICE_COLUMNS)
            .single();

        if (error) throw error;
        return successResponse(data, 201);
    } catch (error: any) {
        console.error('Error creating price item:', error);
        return errorResponse(error.message, 500);
    }
}

// PATCH - Update price item
export async function PATCH(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const supabase = createServerClient();
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
        return errorResponse('id is required', 400);
    }

    try {
        const { data, error } = await supabase
            .from('price_library')
            .update(updateData)
            .eq('id', id)
            .select(PRICE_COLUMNS)
            .single();

        if (error) throw error;
        return successResponse(data);
    } catch (error: any) {
        console.error('Error updating price item:', error);
        return errorResponse(error.message, 500);
    }
}

// DELETE - Soft delete (deactivate) price item
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
            .from('price_library')
            .update({ is_active: false })
            .eq('id', id);

        if (error) throw error;
        return successResponse({ success: true });
    } catch (error: any) {
        console.error('Error deleting price item:', error);
        return errorResponse(error.message, 500);
    }
}
