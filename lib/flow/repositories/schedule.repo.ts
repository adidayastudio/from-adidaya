/**
 * SCHEDULE REPOSITORY
 * SSOT data access for project schedule (versions, tasks, dependencies)
 */

import { supabase } from "@/lib/supabaseClient";

// ============================================
// SCHEDULE VERSIONS
// ============================================

export async function fetchScheduleVersions(projectId: string) {
    const { data, error } = await supabase
        .from("project_schedule_versions")
        .select("*")
        .eq("project_id", projectId)
        .order("version_no", { ascending: false });

    if (error) throw error;
    return data ?? [];
}

export async function createScheduleVersion(params: {
    projectId: string;
    stageId?: string;
    name?: string;
    versionNo: number;
    calendarMode?: string;
    notes?: string;
    createdBy?: string;
}) {
    const { data, error } = await supabase
        .from("project_schedule_versions")
        .insert({
            project_id: params.projectId,
            stage_id: params.stageId,
            name: params.name ?? "Current",
            version_no: params.versionNo,
            calendar_mode: params.calendarMode ?? "weekly",
            is_locked: false,
            notes: params.notes,
            created_by: params.createdBy,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ============================================
// SCHEDULE TASKS
// ============================================

export async function fetchScheduleTasks(scheduleVersionId: string) {
    const { data, error } = await supabase
        .from("project_schedule_tasks")
        .select("*, project_wbs_items(wbs_code, title)")
        .eq("schedule_version_id", scheduleVersionId)
        .order("position", { ascending: true });

    if (error) throw error;
    return data ?? [];
}

export async function createScheduleTask(params: {
    projectId: string;
    scheduleVersionId: string;
    wbsItemId?: string;
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    durationDays?: number;
    weight?: number;
    position: number;
}) {
    const { data, error } = await supabase
        .from("project_schedule_tasks")
        .insert({
            project_id: params.projectId,
            schedule_version_id: params.scheduleVersionId,
            wbs_item_id: params.wbsItemId,
            name: params.name,
            description: params.description,
            start_date: params.startDate,
            end_date: params.endDate,
            duration_days: params.durationDays,
            progress: 0,
            weight: params.weight,
            position: params.position,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateScheduleTask(
    taskId: string,
    patch: {
        name?: string;
        description?: string;
        startDate?: string;
        endDate?: string;
        durationDays?: number;
        progress?: number;
        weight?: number;
        position?: number;
    }
) {
    const updateData: Record<string, any> = {};

    if (patch.name) updateData.name = patch.name;
    if (patch.description !== undefined) updateData.description = patch.description;
    if (patch.startDate !== undefined) updateData.start_date = patch.startDate;
    if (patch.endDate !== undefined) updateData.end_date = patch.endDate;
    if (patch.durationDays !== undefined) updateData.duration_days = patch.durationDays;
    if (patch.progress !== undefined) updateData.progress = patch.progress;
    if (patch.weight !== undefined) updateData.weight = patch.weight;
    if (patch.position !== undefined) updateData.position = patch.position;

    const { data, error } = await supabase
        .from("project_schedule_tasks")
        .update(updateData)
        .eq("id", taskId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteScheduleTask(taskId: string) {
    const { error } = await supabase
        .from("project_schedule_tasks")
        .delete()
        .eq("id", taskId);

    if (error) throw error;
    return true;
}

// ============================================
// DEPENDENCIES
// ============================================

export async function fetchScheduleDependencies(scheduleVersionId: string) {
    const { data, error } = await supabase
        .from("project_schedule_dependencies")
        .select("*")
        .eq("schedule_version_id", scheduleVersionId);

    if (error) throw error;
    return data ?? [];
}

export async function createDependency(params: {
    projectId: string;
    scheduleVersionId: string;
    predecessorTaskId: string;
    successorTaskId: string;
    depType?: string;
    lagDays?: number;
}) {
    const { data, error } = await supabase
        .from("project_schedule_dependencies")
        .insert({
            project_id: params.projectId,
            schedule_version_id: params.scheduleVersionId,
            predecessor_task_id: params.predecessorTaskId,
            successor_task_id: params.successorTaskId,
            dep_type: params.depType ?? "FS",
            lag_days: params.lagDays ?? 0,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteDependency(depId: string) {
    const { error } = await supabase
        .from("project_schedule_dependencies")
        .delete()
        .eq("id", depId);

    if (error) throw error;
    return true;
}
