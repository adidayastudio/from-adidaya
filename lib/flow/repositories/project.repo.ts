/**
 * PROJECT REPOSITORY
 * SSOT data access for projects
 */

import { supabase } from "@/lib/supabaseClient";

export async function fetchProject(projectId: string) {
    const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

    if (error) throw error;
    return data;
}

/**
 * Fetch project by slug format: "number-code" (e.g., "036-PRG")
 */
export async function fetchProjectBySlug(slug: string) {
    if (!slug) return null;
    const cleanSlug = decodeURIComponent(slug).trim();

    // 1. Check if UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(cleanSlug)) {
        return fetchProject(cleanSlug).catch(() => null);
    }

    // 2. Parse number-code format e.g. "036-PRG" or "019-FKS"
    const dashIndex = cleanSlug.indexOf("-");
    if (dashIndex !== -1) {
        const number = cleanSlug.substring(0, dashIndex);
        const code = cleanSlug.substring(dashIndex + 1);

        const { data } = await supabase
            .from("projects")
            .select("*")
            .ilike("project_number", number)
            .ilike("project_code", code)
            .maybeSingle();

        if (data) return data;
    }

    // 3. Fallback: query by project_code (e.g., "PRG" or "FKS")
    const { data: codeData } = await supabase
        .from("projects")
        .select("*")
        .ilike("project_code", cleanSlug)
        .maybeSingle();

    if (codeData) return codeData;

    // 4. Final attempt: query by id directly
    return fetchProject(cleanSlug).catch(() => null);
}

export async function fetchProjectsByWorkspace(workspaceId?: string) {
    // If no workspaceId provided, fetch all projects (single-workspace app)
    let query = supabase
        .from("projects")
        .select("*")
        .order("project_number", { ascending: true });

    if (workspaceId) {
        query = query.eq("workspace_id", workspaceId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data ?? [];
}

export async function createProject(params: {
    workspaceId: string;
    projectCode: string;
    projectNumber: string;
    projectName: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    location?: Record<string, any>;
    meta?: Record<string, any>;
    createdBy?: string;
}) {
    const { data, error } = await supabase
        .from("projects")
        .insert({
            workspace_id: params.workspaceId,
            project_code: params.projectCode,
            project_number: params.projectNumber,
            project_name: params.projectName,
            status: params.status ?? "active",
            start_date: params.startDate,
            end_date: params.endDate,
            location: params.location ?? {},
            meta: params.meta ?? {},
            created_by: params.createdBy,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateProject(
    projectId: string,
    patch: {
        projectName?: string;
        status?: string;
        startDate?: string;
        endDate?: string;
        location?: Record<string, any>;
        meta?: Record<string, any>;
    }
) {
    const updateData: Record<string, any> = {};

    if (patch.projectName) updateData.project_name = patch.projectName;
    if (patch.status) updateData.status = patch.status;
    if (patch.startDate !== undefined) updateData.start_date = patch.startDate;
    if (patch.endDate !== undefined) updateData.end_date = patch.endDate;
    if (patch.location) updateData.location = patch.location;
    if (patch.meta) updateData.meta = patch.meta;

    const { data, error } = await supabase
        .from("projects")
        .update(updateData)
        .eq("id", projectId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteProject(projectId: string) {
    const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

    if (error) throw error;
    return true;
}
