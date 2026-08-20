/**
 * DCR API — Daily Construction Report
 * CRUD operations for DCR master reports and section data (materials, etc.)
 */

import { supabase } from "@/lib/supabaseClient";

// ============================================
// TYPES
// ============================================

export interface DCRReport {
    id: string;
    workspaceId: string;
    projectCode: string;
    reportDate: string;
    notes: string | null;
    nextPlan: string | null;
    preparedBy: string | null;
    approvedBy: string | null;
    status: "draft" | "submitted" | "approved";
    createdAt: string;
    updatedAt: string;
}

export interface DCRMaterial {
    id: string;
    dcrId: string;
    resourceId: string | null;
    category: "MATERIAL" | "EQUIPMENT" | "SERVICE";
    name: string;
    unit: string;
    incoming: number;
    used: number;
    stock: number;
    sortOrder: number;
    createdAt: string;
}

// ============================================
// MAPPERS
// ============================================

function mapDbToDCRReport(row: any): DCRReport {
    return {
        id: row.id,
        workspaceId: row.workspace_id,
        projectCode: row.project_code,
        reportDate: row.report_date,
        notes: row.notes,
        nextPlan: row.next_plan,
        preparedBy: row.prepared_by,
        approvedBy: row.approved_by,
        status: row.status || "draft",
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapDbToDCRMaterial(row: any): DCRMaterial {
    return {
        id: row.id,
        dcrId: row.dcr_id,
        resourceId: row.resource_id,
        category: row.category || "MATERIAL",
        name: row.name,
        unit: row.unit || "unit",
        incoming: Number(row.incoming) || 0,
        used: Number(row.used) || 0,
        stock: Number(row.stock) || 0,
        sortOrder: row.sort_order || 0,
        createdAt: row.created_at,
    };
}

// ============================================
// DCR MASTER REPORT
// ============================================

/**
 * Fetch or auto-create a DCR report for a given workspace + project + date.
 * Returns the existing or newly created DCR master row.
 */
export async function fetchOrCreateDCR(
    workspaceId: string,
    projectCode: string,
    reportDate: string // YYYY-MM-DD
): Promise<DCRReport | null> {
    try {
        console.log("fetchOrCreateDCR inputs:", { workspaceId, projectCode, reportDate });

        if (!workspaceId || workspaceId === "undefined" || workspaceId === "null") {
            console.error("fetchOrCreateDCR error: workspaceId is invalid UUID", workspaceId);
            return null;
        }

        // Try to find existing
        const { data: existing, error: fetchError } = await supabase
            .from("dcr_daily_reports")
            .select("*")
            .eq("workspace_id", workspaceId)
            .eq("project_code", projectCode)
            .eq("report_date", reportDate)
            .maybeSingle();

        if (fetchError) {
            console.error("Error fetching DCR:", {
                message: fetchError.message,
                details: fetchError.details,
                hint: fetchError.hint,
                code: fetchError.code
            });
            return null;
        }

        if (existing) {
            return mapDbToDCRReport(existing);
        }

        // Auto-create if not exists
        const { data: created, error: createError } = await supabase
            .from("dcr_daily_reports")
            .insert({
                workspace_id: workspaceId,
                project_code: projectCode,
                report_date: reportDate,
                status: "draft",
            })
            .select()
            .single();

        if (createError) {
            console.error("Error creating DCR:", {
                message: createError.message,
                details: createError.details,
                hint: createError.hint,
                code: createError.code
            });
            return null;
        }

        return mapDbToDCRReport(created);
    } catch (err) {
        console.error("fetchOrCreateDCR error:", err);
        return null;
    }
}

/**
 * Fetch DCR report without auto-creating (read-only lookup)
 */
export async function fetchDCR(
    workspaceId: string,
    projectCode: string,
    reportDate: string
): Promise<DCRReport | null> {
    try {
        const { data, error } = await supabase
            .from("dcr_daily_reports")
            .select("*")
            .eq("workspace_id", workspaceId)
            .eq("project_code", projectCode)
            .eq("report_date", reportDate)
            .maybeSingle();

        if (error) {
            console.error("Error fetching DCR:", error);
            return null;
        }

        return data ? mapDbToDCRReport(data) : null;
    } catch (err) {
        console.error("fetchDCR error:", err);
        return null;
    }
}

/**
 * Update DCR master fields (notes, nextPlan, preparedBy, approvedBy, status)
 */
export async function updateDCRReport(
    dcrId: string,
    patch: {
        notes?: string;
        nextPlan?: string;
        preparedBy?: string;
        approvedBy?: string;
        status?: "draft" | "submitted" | "approved";
    }
): Promise<boolean> {
    const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
    };

    if (patch.notes !== undefined) updateData.notes = patch.notes;
    if (patch.nextPlan !== undefined) updateData.next_plan = patch.nextPlan;
    if (patch.preparedBy !== undefined) updateData.prepared_by = patch.preparedBy;
    if (patch.approvedBy !== undefined) updateData.approved_by = patch.approvedBy;
    if (patch.status !== undefined) updateData.status = patch.status;

    const { error } = await supabase
        .from("dcr_daily_reports")
        .update(updateData)
        .eq("id", dcrId);

    if (error) {
        console.error("Error updating DCR report:", error);
        return false;
    }

    return true;
}

// ============================================
// DCR MATERIALS (50 00 00)
// ============================================

/**
 * Fetch all material entries for a DCR report
 */
export async function fetchDCRMaterials(dcrId: string): Promise<DCRMaterial[]> {
    try {
        const { data, error } = await supabase
            .from("dcr_materials")
            .select("*")
            .eq("dcr_id", dcrId)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Error fetching DCR materials:", error);
            return [];
        }

        return (data || []).map(mapDbToDCRMaterial);
    } catch (err) {
        console.error("fetchDCRMaterials error:", err);
        return [];
    }
}

/**
 * Save (insert or update) a single material entry
 */
export async function saveDCRMaterial(
    dcrId: string,
    item: {
        id?: string;
        resourceId?: string | null;
        category?: "MATERIAL" | "EQUIPMENT" | "SERVICE";
        name: string;
        unit?: string;
        incoming?: number;
        used?: number;
        stock?: number;
        sortOrder?: number;
    }
): Promise<DCRMaterial | null> {
    try {
        if (item.id) {
            // Update existing
            const { data, error } = await supabase
                .from("dcr_materials")
                .update({
                    resource_id: item.resourceId ?? null,
                    category: item.category || "MATERIAL",
                    name: item.name,
                    unit: item.unit || "unit",
                    incoming: item.incoming || 0,
                    used: item.used || 0,
                    stock: item.stock || 0,
                    sort_order: item.sortOrder || 0,
                })
                .eq("id", item.id)
                .select()
                .single();

            if (error) {
                console.error("Error updating DCR material:", error);
                return null;
            }

            return mapDbToDCRMaterial(data);
        } else {
            // Insert new
            const { data, error } = await supabase
                .from("dcr_materials")
                .insert({
                    dcr_id: dcrId,
                    resource_id: item.resourceId ?? null,
                    category: item.category || "MATERIAL",
                    name: item.name,
                    unit: item.unit || "unit",
                    incoming: item.incoming || 0,
                    used: item.used || 0,
                    stock: item.stock || 0,
                    sort_order: item.sortOrder || 0,
                })
                .select()
                .single();

            if (error) {
                console.error("Error inserting DCR material:", error);
                return null;
            }

            return mapDbToDCRMaterial(data);
        }
    } catch (err) {
        console.error("saveDCRMaterial error:", err);
        return null;
    }
}

/**
 * Bulk save materials (replace all entries for a DCR)
 */
export async function bulkSaveDCRMaterials(
    dcrId: string,
    items: Array<{
        id?: string;
        resourceId?: string | null;
        category?: "MATERIAL" | "EQUIPMENT" | "SERVICE";
        name: string;
        unit?: string;
        incoming?: number;
        used?: number;
        stock?: number;
        sortOrder?: number;
    }>
): Promise<boolean> {
    try {
        // Delete existing entries
        const { error: deleteError } = await supabase
            .from("dcr_materials")
            .delete()
            .eq("dcr_id", dcrId);

        if (deleteError) {
            console.error("Error clearing DCR materials:", deleteError);
            return false;
        }

        if (items.length === 0) return true;

        // Insert all new entries
        const insertData = items.map((item, idx) => ({
            dcr_id: dcrId,
            resource_id: item.resourceId ?? null,
            category: item.category || "MATERIAL",
            name: item.name,
            unit: item.unit || "unit",
            incoming: item.incoming || 0,
            used: item.used || 0,
            stock: item.stock || 0,
            sort_order: item.sortOrder ?? idx,
        }));

        const { error: insertError } = await supabase
            .from("dcr_materials")
            .insert(insertData);

        if (insertError) {
            console.error("Error bulk inserting DCR materials:", insertError);
            return false;
        }

        return true;
    } catch (err) {
        console.error("bulkSaveDCRMaterials error:", err);
        return false;
    }
}

/**
 * Delete a single material entry
 */
export async function deleteDCRMaterial(id: string): Promise<boolean> {
    const { error } = await supabase
        .from("dcr_materials")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting DCR material:", error);
        return false;
    }

    return true;
}
