/**
 * RAB REPOSITORY
 * SSOT data access for project RAB (versions & items)
 */

import { supabase } from "@/lib/supabaseClient";

// ============================================
// RAB VERSIONS
// ============================================

export async function fetchRABVersions(projectId: string) {
    const { data, error } = await supabase
        .from("project_rab_versions")
        .select("*")
        .eq("project_id", projectId)
        .order("version_no", { ascending: false });

    if (error) throw error;
    return data ?? [];
}

export async function fetchRABVersion(versionId: string) {
    const { data, error } = await supabase
        .from("project_rab_versions")
        .select("*")
        .eq("id", versionId)
        .single();

    if (error) throw error;
    return data;
}

export async function createRABVersion(params: {
    projectId: string;
    stageId?: string;
    name?: string;
    versionNo: number;
    pricingMode?: string;
    currency?: string;
    rf?: number;
    df?: number;
    buildingClass?: string;
    notes?: string;
    createdBy?: string;
}) {
    const { data, error } = await supabase
        .from("project_rab_versions")
        .insert({
            project_id: params.projectId,
            stage_id: params.stageId,
            name: params.name ?? "Current",
            version_no: params.versionNo,
            pricing_mode: params.pricingMode ?? "ballpark",
            currency: params.currency ?? "IDR",
            rf: params.rf,
            df: params.df,
            building_class: params.buildingClass,
            is_locked: false,
            notes: params.notes,
            created_by: params.createdBy,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function lockRABVersion(versionId: string) {
    const { data, error } = await supabase
        .from("project_rab_versions")
        .update({ is_locked: true })
        .eq("id", versionId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ============================================
// RAB ITEMS
// ============================================

export async function fetchRABItems(rabVersionId: string) {
    const { data, error } = await supabase
        .from("project_rab_items")
        .select("*, project_wbs_items(wbs_code, title)")
        .eq("rab_version_id", rabVersionId);

    if (error) throw error;
    return data ?? [];
}

export async function createRABItem(params: {
    projectId: string;
    rabVersionId: string;
    wbsItemId: string;
    unit?: string;
    qty: number;
    unitPrice: number;
    materialCost?: number;
    laborCost?: number;
    equipmentCost?: number;
    notes?: string;
    meta?: Record<string, any>;
}) {
    const { data, error } = await supabase
        .from("project_rab_items")
        .insert({
            project_id: params.projectId,
            rab_version_id: params.rabVersionId,
            wbs_item_id: params.wbsItemId,
            unit: params.unit,
            qty: params.qty,
            unit_price: params.unitPrice,
            material_cost: params.materialCost,
            labor_cost: params.laborCost,
            equipment_cost: params.equipmentCost,
            notes: params.notes,
            meta: params.meta ?? {},
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateRABItem(
    itemId: string,
    patch: {
        qty?: number;
        unitPrice?: number;
        unit?: string;
        materialCost?: number;
        laborCost?: number;
        equipmentCost?: number;
        notes?: string;
    }
) {
    const updateData: Record<string, any> = {};

    if (patch.qty !== undefined) updateData.qty = patch.qty;
    if (patch.unitPrice !== undefined) updateData.unit_price = patch.unitPrice;
    if (patch.unit !== undefined) updateData.unit = patch.unit;
    if (patch.materialCost !== undefined) updateData.material_cost = patch.materialCost;
    if (patch.laborCost !== undefined) updateData.labor_cost = patch.laborCost;
    if (patch.equipmentCost !== undefined) updateData.equipment_cost = patch.equipmentCost;
    if (patch.notes !== undefined) updateData.notes = patch.notes;

    const { data, error } = await supabase
        .from("project_rab_items")
        .update(updateData)
        .eq("id", itemId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteRABItem(itemId: string) {
    const { error } = await supabase
        .from("project_rab_items")
        .delete()
        .eq("id", itemId);

    if (error) throw error;
    return true;
}
