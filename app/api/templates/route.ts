/**
 * Templates API Route
 * Server-side handlers for project templates (types, stages, WBS, RAB, schedule)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/server/supabase';
import { requireAuth, successResponse, errorResponse } from '@/lib/server/auth';

// GET - Fetch templates (project types, stage templates, etc.)
export async function GET(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const type = searchParams.get('type'); // 'project_types', 'stages', 'wbs', 'rab_prices', 'schedule'
    const workspaceId = searchParams.get('workspace_id');
    const projectTypeId = searchParams.get('project_type_id');

    try {
        // Get default workspace if not provided
        let wsId = workspaceId;
        if (!wsId) {
            const { data: ws } = await supabase
                .from('workspaces')
                .select('id')
                .limit(1)
                .single();
            wsId = ws?.id;
        }

        if (!wsId) {
            return errorResponse('No workspace found', 400);
        }

        switch (type) {
            case 'project_types': {
                const { data, error } = await supabase
                    .from('project_type_templates')
                    .select('id, workspace_id, project_type_id, code, name, description, icon, color, is_active, created_at, updated_at')
                    .eq('workspace_id', wsId)
                    .eq('is_active', true)
                    .order('name');
                if (error) throw error;
                return successResponse(data || []);
            }

            case 'stages': {
                if (!projectTypeId) {
                    return errorResponse('project_type_id is required for stages', 400);
                }
                const { data, error } = await supabase
                    .from('stage_templates')
                    .select('id, workspace_id, project_type_id, stage_code, stage_name, stage_name_id, display_code, position, weight_default, is_active, category, description, created_at')
                    .eq('workspace_id', wsId)
                    .eq('project_type_id', projectTypeId)
                    .eq('is_active', true)
                    .order('position');
                if (error) throw error;
                return successResponse(data || []);
            }

            case 'wbs': {
                if (!projectTypeId) {
                    return errorResponse('project_type_id is required for WBS template', 400);
                }
                const { data, error } = await supabase
                    .from('wbs_templates')
                    .select('id, workspace_id, project_type_id, stage_code, wbs_structure, created_at, updated_at')
                    .eq('workspace_id', wsId)
                    .eq('project_type_id', projectTypeId)
                    .single();
                if (error && error.code !== 'PGRST116') throw error;
                return successResponse(data || null);
            }

            case 'rab_prices': {
                const { data, error } = await supabase
                    .from('rab_price_templates')
                    .select('id, workspace_id, wbs_code, title, unit, unit_price, material_cost, labor_cost, equipment_cost, is_active, created_at, updated_at')
                    .eq('workspace_id', wsId)
                    .eq('is_active', true)
                    .order('wbs_code');
                if (error) throw error;
                return successResponse(data || []);
            }

            case 'schedule': {
                if (!projectTypeId) {
                    return errorResponse('project_type_id is required for schedule template', 400);
                }
                const { data, error } = await supabase
                    .from('schedule_templates')
                    .select('id, workspace_id, project_type_id, stage_code, default_duration_days, created_at, updated_at')
                    .eq('workspace_id', wsId)
                    .eq('project_type_id', projectTypeId)
                    .order('stage_code');
                if (error) throw error;
                return successResponse(data || []);
            }

            default:
                return errorResponse('Invalid type. Use: project_types, stages, wbs, rab_prices, schedule', 400);
        }
    } catch (error: any) {
        console.error('Error fetching templates:', error);
        return errorResponse(error.message, 500);
    }
}

// POST - Create template
export async function POST(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const supabase = createServerClient();
    const body = await request.json();
    const { type, ...data } = body;

    try {
        switch (type) {
            case 'project_type': {
                const { data: result, error } = await supabase
                    .from('project_type_templates')
                    .insert({
                        workspace_id: data.workspace_id,
                        project_type_id: data.project_type_id || data.code,
                        code: data.code,
                        name: data.name,
                        description: data.description,
                        icon: data.icon,
                        color: data.color,
                        is_active: true
                    })
                    .select()
                    .single();
                if (error) throw error;
                return successResponse(result, 201);
            }

            case 'stage': {
                const { data: result, error } = await supabase
                    .from('stage_templates')
                    .insert({
                        workspace_id: data.workspace_id,
                        project_type_id: data.project_type_id,
                        stage_code: data.stage_code,
                        stage_name: data.stage_name,
                        stage_name_id: data.stage_name_id,
                        display_code: data.display_code || data.stage_code,
                        position: data.position || 0,
                        weight_default: data.weight_default || 0,
                        is_active: true,
                        category: data.category,
                        description: data.description
                    })
                    .select()
                    .single();
                if (error) throw error;
                return successResponse(result, 201);
            }

            case 'wbs': {
                const { data: result, error } = await supabase
                    .from('wbs_templates')
                    .upsert({
                        workspace_id: data.workspace_id,
                        project_type_id: data.project_type_id,
                        wbs_structure: data.wbs_structure
                    }, { onConflict: 'workspace_id,project_type_id' })
                    .select()
                    .single();
                if (error) throw error;
                return successResponse(result, 201);
            }

            case 'rab_price': {
                const { data: result, error } = await supabase
                    .from('rab_price_templates')
                    .insert({
                        workspace_id: data.workspace_id,
                        wbs_code: data.wbs_code,
                        title: data.title,
                        unit: data.unit,
                        unit_price: data.unit_price || 0,
                        material_cost: data.material_cost || 0,
                        labor_cost: data.labor_cost || 0,
                        equipment_cost: data.equipment_cost || 0,
                        is_active: true
                    })
                    .select()
                    .single();
                if (error) throw error;
                return successResponse(result, 201);
            }

            default:
                return errorResponse('Invalid type', 400);
        }
    } catch (error: any) {
        console.error('Error creating template:', error);
        return errorResponse(error.message, 500);
    }
}

// PATCH - Update template
export async function PATCH(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const supabase = createServerClient();
    const body = await request.json();
    const { type, id, workspace_id, ...updateData } = body;

    if (!type || !id) {
        return errorResponse('type and id are required', 400);
    }

    try {
        const tableMap: Record<string, string> = {
            project_type: 'project_type_templates',
            stage: 'stage_templates',
            wbs: 'wbs_templates',
            rab_price: 'rab_price_templates',
            schedule: 'schedule_templates'
        };

        const table = tableMap[type];
        if (!table) {
            return errorResponse('Invalid type', 400);
        }

        const { data, error } = await supabase
            .from(table)
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return successResponse(data);
    } catch (error: any) {
        console.error('Error updating template:', error);
        return errorResponse(error.message, 500);
    }
}

// DELETE - Delete template
export async function DELETE(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
        return errorResponse('type and id are required', 400);
    }

    try {
        const tableMap: Record<string, string> = {
            project_type: 'project_type_templates',
            stage: 'stage_templates',
            wbs: 'wbs_templates',
            rab_price: 'rab_price_templates',
            schedule: 'schedule_templates'
        };

        const table = tableMap[type];
        if (!table) {
            return errorResponse('Invalid type', 400);
        }

        const { error } = await supabase
            .from(table)
            .delete()
            .eq('id', id);

        if (error) throw error;
        return successResponse({ success: true });
    } catch (error: any) {
        console.error('Error deleting template:', error);
        return errorResponse(error.message, 500);
    }
}
