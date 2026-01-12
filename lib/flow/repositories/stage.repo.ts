/**
 * STAGE REPOSITORY
 * SSOT data access for project stages
 */

import { supabase } from "@/lib/supabaseClient";

export async function fetchProjectStages(projectId: string) {
    const { data, error } = await supabase
        .from("project_stages")
        .select("*")
        .eq("project_id", projectId)
        .order("position", { ascending: true });

    if (error) throw error;
    return data ?? [];
}

export async function createStage(params: {
    projectId: string;
    stageCode: string;
    stageName: string;
    stageNameId?: string;
    position: number;
    isActive?: boolean;
    startDate?: string;
    endDate?: string;
}) {
    const { data, error } = await supabase
        .from("project_stages")
        .insert({
            project_id: params.projectId,
            stage_code: params.stageCode,
            stage_name: params.stageName,
            stage_name_id: params.stageNameId,
            position: params.position,
            is_active: params.isActive ?? true,
            start_date: params.startDate,
            end_date: params.endDate,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateStage(
    stageId: string,
    patch: {
        stageName?: string;
        stageNameId?: string;
        isActive?: boolean;
        startDate?: string;
        endDate?: string;
    }
) {
    const updateData: Record<string, any> = {};

    if (patch.stageName) updateData.stage_name = patch.stageName;
    if (patch.stageNameId !== undefined) updateData.stage_name_id = patch.stageNameId;
    if (patch.isActive !== undefined) updateData.is_active = patch.isActive;
    if (patch.startDate !== undefined) updateData.start_date = patch.startDate;
    if (patch.endDate !== undefined) updateData.end_date = patch.endDate;

    const { data, error } = await supabase
        .from("project_stages")
        .update(updateData)
        .eq("id", stageId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteStage(stageId: string) {
    const { error } = await supabase
        .from("project_stages")
        .delete()
        .eq("id", stageId);

    if (error) throw error;
    return true;
}

/**
 * Bulk create stages for a new project from template
 */
export async function createStagesFromTemplate(
    projectId: string,
    stages: Array<{
        stageCode: string;
        stageName: string;
        stageNameId?: string;
    }>
) {
    const stagesData = stages.map((s, idx) => ({
        project_id: projectId,
        stage_code: s.stageCode,
        stage_name: s.stageName,
        stage_name_id: s.stageNameId,
        position: idx,
        is_active: true,
    }));

    const { data, error } = await supabase
        .from("project_stages")
        .insert(stagesData)
        .select();

    if (error) throw error;
    return data ?? [];
}
