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
    // Parse slug: "036-PRG" -> number="036", code="PRG"
    const dashIndex = slug.indexOf("-");
    if (dashIndex === -1) {
        // Fallback: try as UUID
        return fetchProject(slug);
    }

    const number = slug.substring(0, dashIndex);
    const code = slug.substring(dashIndex + 1);

    const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("project_number", number)
        .eq("project_code", code)
        .single();

    if (error) throw error;
    return data;
}

export async function fetchProjectsByWorkspace(workspaceId: string) {
    const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("project_number", { ascending: true });

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
