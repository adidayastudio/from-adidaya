/**
 * WBS REPOSITORY
 * SSOT data access for project WBS items
 */

import { supabase } from "@/lib/supabaseClient";

export async function fetchProjectWBS(projectId: string, stageId?: string) {
    let query = supabase
        .from("project_wbs_items")
        .select("*")
        .eq("project_id", projectId);

    if (stageId) {
        query = query.eq("stage_id", stageId);
    }

    const { data, error } = await query
        .order("level", { ascending: true })
        .order("position", { ascending: true });

    if (error) throw error;
    return data ?? [];
}

export async function fetchWBSItem(itemId: string) {
    const { data, error } = await supabase
        .from("project_wbs_items")
        .select("*")
        .eq("id", itemId)
        .single();

    if (error) throw error;
    return data;
}

export async function createWBSItem(params: {
    projectId: string;
    stageId?: string;
    parentId?: string;
    wbsCode: string;
    title: string;
    titleEn?: string;
    level: number;
    position: number;
    isLeaf?: boolean;
    quantity?: number;
    unit?: string;
    notes?: string;
    meta?: Record<string, any>;
}) {
    const { data, error } = await supabase
        .from("project_wbs_items")
        .insert({
            project_id: params.projectId,
            stage_id: params.stageId,
            parent_id: params.parentId,
            wbs_code: params.wbsCode,
            title: params.title,
            title_en: params.titleEn,
            level: params.level,
            position: params.position,
            is_leaf: params.isLeaf ?? false,
            quantity: params.quantity,
            unit: params.unit,
            notes: params.notes,
            meta: params.meta ?? {},
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateWBSItem(
    itemId: string,
    patch: {
        wbsCode?: string;
        title?: string;
        titleEn?: string;
        position?: number;
        isLeaf?: boolean;
        quantity?: number;
        unit?: string;
        notes?: string;
        meta?: Record<string, any>;
    }
) {
    const updateData: Record<string, any> = {};

    if (patch.wbsCode) updateData.wbs_code = patch.wbsCode;
    if (patch.title) updateData.title = patch.title;
    if (patch.titleEn !== undefined) updateData.title_en = patch.titleEn;
    if (patch.position !== undefined) updateData.position = patch.position;
    if (patch.isLeaf !== undefined) updateData.is_leaf = patch.isLeaf;
    if (patch.quantity !== undefined) updateData.quantity = patch.quantity;
    if (patch.unit !== undefined) updateData.unit = patch.unit;
    if (patch.notes !== undefined) updateData.notes = patch.notes;
    if (patch.meta) updateData.meta = patch.meta;

    const { data, error } = await supabase
        .from("project_wbs_items")
        .update(updateData)
        .eq("id", itemId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteWBSItem(itemId: string) {
    const { error } = await supabase
        .from("project_wbs_items")
        .delete()
        .eq("id", itemId);

    if (error) throw error;
    return true;
}

/**
 * Bulk create WBS items from template
 */
export async function createWBSFromTemplate(
    projectId: string,
    items: Array<{
        wbsCode: string;
        title: string;
        titleEn?: string;
        parentWbsCode?: string;
        level: number;
        position: number;
        isLeaf?: boolean;
    }>
) {
    // First pass: create all items to get their IDs
    const insertData = items.map((item) => ({
        project_id: projectId,
        wbs_code: item.wbsCode,
        title: item.title,
        title_en: item.titleEn,
        parent_id: null, // Set in second pass
        level: item.level,
        position: item.position,
        is_leaf: item.isLeaf ?? false,
        meta: {},
    }));

    const { data, error } = await supabase
        .from("project_wbs_items")
        .insert(insertData)
        .select();

    if (error) throw error;

    // Second pass: update parent_id based on wbs_code hierarchy
    const codeToId = new Map(data!.map((d) => [d.wbs_code, d.id]));

    for (const item of items) {
        if (item.parentWbsCode) {
            const parentId = codeToId.get(item.parentWbsCode);
            const itemId = codeToId.get(item.wbsCode);

            if (parentId && itemId) {
                await supabase
                    .from("project_wbs_items")
                    .update({ parent_id: parentId })
                    .eq("id", itemId);
            }
        }
    }

    return data ?? [];
}
