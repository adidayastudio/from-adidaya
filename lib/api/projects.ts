/**
 * PROJECT API LAYER
 * SSOT data access aligned with Supabase schema
 */

import { supabase } from "@/lib/supabaseClient";
import type {
    Project,
    ProjectStage,
    WBSItem,
    RABVersion,
    RABItem,
    ScheduleVersion,
    ScheduleTask,
    ProjectTask,
    ProjectDoc,
    ProjectType,
    ProjectLocation,
} from "@/types/project";
import { getStagesForProjectType } from "@/types/project";

// ============================================
// PROJECT CRUD
// ============================================

export async function fetchProject(projectId: string): Promise<Project | null> {
    const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

    if (error || !data) return null;
    return mapDbToProject(data);
}

export async function fetchProjectsByWorkspace(workspaceId: string): Promise<Project[]> {
    const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("project_number", { ascending: true });

    if (error || !data) return [];
    return data.map(mapDbToProject);
}

export async function fetchAllProjects(): Promise<Project[]> {
    const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("project_number", { ascending: true });

    if (error || !data) return [];
    return data.map(mapDbToProject);
}

export async function createProject(
    workspaceId: string,
    project: Omit<Project, "id" | "workspaceId" | "createdAt" | "updatedAt">
): Promise<Project | null> {
    const { data, error } = await supabase
        .from("projects")
        .insert({
            workspace_id: workspaceId,
            project_code: project.projectCode,
            project_number: project.projectNumber,
            project_name: project.projectName,
            status: project.status,
            start_date: project.startDate,
            end_date: project.endDate,
            location: project.location,
            meta: project.meta,
            created_by: project.createdBy,
        })
        .select()
        .single();

    if (error || !data) return null;

    // Auto-instantiate stages based on project type
    const projectType = (project.meta?.type as ProjectType) || "design-build";
    await instantiateStagesForProject(data.id, projectType);

    return mapDbToProject(data);
}

export async function updateProject(
    projectId: string,
    patch: Partial<Project>
): Promise<boolean> {
    const updateData: Record<string, any> = {};

    if (patch.projectNumber) updateData.project_number = patch.projectNumber;
    if (patch.projectCode) updateData.project_code = patch.projectCode;
    if (patch.projectName) updateData.project_name = patch.projectName;
    if (patch.status) updateData.status = patch.status;
    if (patch.startDate !== undefined) updateData.start_date = patch.startDate;
    if (patch.endDate !== undefined) updateData.end_date = patch.endDate;
    if (patch.location) updateData.location = patch.location;
    if (patch.meta) updateData.meta = patch.meta;

    const { error } = await supabase
        .from("projects")
        .update(updateData)
        .eq("id", projectId);

    return !error;
}

// ============================================
// STAGE CRUD
// ============================================

export async function fetchProjectStages(projectId: string): Promise<ProjectStage[]> {
    const { data, error } = await supabase
        .from("project_stages")
        .select("*")
        .eq("project_id", projectId)
        .order("position", { ascending: true });

    if (error || !data) return [];
    return data.map(mapDbToStage);
}

export async function instantiateStagesForProject(
    projectId: string,
    projectType: ProjectType
): Promise<void> {
    const templates = getStagesForProjectType(projectType);

    const stagesData = templates.map((t, idx) => ({
        project_id: projectId,
        stage_code: t.code,
        stage_name: t.name,
        stage_name_id: t.nameId,
        position: idx,
        is_active: true,
    }));

    await supabase.from("project_stages").insert(stagesData);
}

export async function updateStage(
    stageId: string,
    patch: Partial<ProjectStage>
): Promise<boolean> {
    const { error } = await supabase
        .from("project_stages")
        .update({
            stage_name: patch.stageName,
            stage_name_id: patch.stageNameId,
            is_active: patch.isActive,
            start_date: patch.startDate,
            end_date: patch.endDate,
        })
        .eq("id", stageId);

    return !error;
}

// ============================================
// WBS CRUD
// ============================================

export async function fetchProjectWBS(projectId: string): Promise<WBSItem[]> {
    const { data, error } = await supabase
        .from("project_wbs_items")
        .select("*")
        .eq("project_id", projectId)
        .order("level", { ascending: true })
        .order("position", { ascending: true });

    if (error || !data) return [];

    return buildWBSTree(data.map(mapDbToWBS));
}

export async function createWBSItem(
    item: Omit<WBSItem, "id" | "createdAt" | "updatedAt" | "children">
): Promise<WBSItem | null> {
    const { data, error } = await supabase
        .from("project_wbs_items")
        .insert({
            project_id: item.projectId,
            stage_id: item.stageId,
            parent_id: item.parentId,
            wbs_code: item.wbsCode,
            title: item.title,
            title_en: item.titleEn,
            level: item.level,
            position: item.position,
            is_leaf: item.isLeaf,
            quantity: item.quantity,
            unit: item.unit,
            notes: item.notes,
            meta: item.meta || {},
        })
        .select()
        .single();

    if (error || !data) return null;
    return mapDbToWBS(data);
}

export async function updateWBSItem(
    id: string,
    patch: Partial<WBSItem>
): Promise<boolean> {
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

    const { error } = await supabase
        .from("project_wbs_items")
        .update(updateData)
        .eq("id", id);

    return !error;
}

export async function deleteWBSItem(id: string): Promise<boolean> {
    const { error } = await supabase
        .from("project_wbs_items")
        .delete()
        .eq("id", id);

    return !error;
}

// ============================================
// RAB CRUD
// ============================================

export async function fetchRABVersions(projectId: string): Promise<RABVersion[]> {
    const { data, error } = await supabase
        .from("project_rab_versions")
        .select("*")
        .eq("project_id", projectId)
        .order("version_no", { ascending: false });

    if (error || !data) return [];
    return data.map(mapDbToRABVersion);
}

export async function fetchRABItems(rabVersionId: string): Promise<RABItem[]> {
    const { data, error } = await supabase
        .from("project_rab_items")
        .select("*")
        .eq("rab_version_id", rabVersionId);

    if (error || !data) return [];
    return data.map(mapDbToRABItem);
}

export async function createRABVersion(
    version: Omit<RABVersion, "id" | "createdAt">
): Promise<RABVersion | null> {
    const { data, error } = await supabase
        .from("project_rab_versions")
        .insert({
            project_id: version.projectId,
            stage_id: version.stageId,
            name: version.name,
            version_no: version.versionNo,
            pricing_mode: version.pricingMode,
            currency: version.currency,
            rf: version.rf,
            df: version.df,
            building_class: version.buildingClass,
            is_locked: version.isLocked,
            notes: version.notes,
            created_by: version.createdBy,
        })
        .select()
        .single();

    if (error || !data) return null;
    return mapDbToRABVersion(data);
}

// ============================================
// SCHEDULE CRUD
// ============================================

export async function fetchScheduleVersions(projectId: string): Promise<ScheduleVersion[]> {
    const { data, error } = await supabase
        .from("project_schedule_versions")
        .select("*")
        .eq("project_id", projectId)
        .order("version_no", { ascending: false });

    if (error || !data) return [];
    return data.map(mapDbToScheduleVersion);
}

export async function fetchScheduleTasks(scheduleVersionId: string): Promise<ScheduleTask[]> {
    const { data, error } = await supabase
        .from("project_schedule_tasks")
        .select("*")
        .eq("schedule_version_id", scheduleVersionId)
        .order("position", { ascending: true });

    if (error || !data) return [];
    return data.map(mapDbToScheduleTask);
}

// ============================================
// TASKS CRUD
// ============================================

export async function fetchProjectTasks(projectId: string): Promise<ProjectTask[]> {
    const { data, error } = await supabase
        .from("project_tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map(mapDbToTask);
}

// ============================================
// DOCS CRUD
// ============================================

export async function fetchProjectDocs(projectId: string): Promise<ProjectDoc[]> {
    const { data, error } = await supabase
        .from("project_docs")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map(mapDbToDoc);
}

// ============================================
// MAPPERS (DB <-> TypeScript)
// ============================================

function mapDbToProject(row: any): Project {
    return {
        id: row.id,
        workspaceId: row.workspace_id,
        projectCode: row.project_code,
        projectNumber: row.project_number,
        projectName: row.project_name,
        status: row.status,
        startDate: row.start_date,
        endDate: row.end_date,
        location: row.location || {},
        meta: row.meta || {},
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapDbToStage(row: any): ProjectStage {
    return {
        id: row.id,
        projectId: row.project_id,
        stageCode: row.stage_code,
        stageName: row.stage_name,
        stageNameId: row.stage_name_id,
        position: row.position,
        isActive: row.is_active,
        startDate: row.start_date,
        endDate: row.end_date,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapDbToWBS(row: any): WBSItem {
    return {
        id: row.id,
        projectId: row.project_id,
        stageId: row.stage_id,
        parentId: row.parent_id,
        wbsCode: row.wbs_code,
        title: row.title,
        titleEn: row.title_en,
        level: row.level,
        position: row.position,
        isLeaf: row.is_leaf,
        quantity: row.quantity,
        unit: row.unit,
        notes: row.notes,
        meta: row.meta || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapDbToRABVersion(row: any): RABVersion {
    return {
        id: row.id,
        projectId: row.project_id,
        stageId: row.stage_id,
        name: row.name,
        versionNo: row.version_no,
        pricingMode: row.pricing_mode,
        currency: row.currency,
        rf: row.rf,
        df: row.df,
        buildingClass: row.building_class,
        isLocked: row.is_locked,
        notes: row.notes,
        createdBy: row.created_by,
        createdAt: row.created_at,
    };
}

function mapDbToRABItem(row: any): RABItem {
    return {
        id: row.id,
        projectId: row.project_id,
        rabVersionId: row.rab_version_id,
        wbsItemId: row.wbs_item_id,
        unit: row.unit,
        qty: row.qty,
        unitPrice: row.unit_price,
        subtotal: row.subtotal,
        materialCost: row.material_cost,
        laborCost: row.labor_cost,
        equipmentCost: row.equipment_cost,
        notes: row.notes,
        meta: row.meta || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapDbToScheduleVersion(row: any): ScheduleVersion {
    return {
        id: row.id,
        projectId: row.project_id,
        stageId: row.stage_id,
        name: row.name,
        versionNo: row.version_no,
        calendarMode: row.calendar_mode,
        isLocked: row.is_locked,
        notes: row.notes,
        createdBy: row.created_by,
        createdAt: row.created_at,
    };
}

function mapDbToScheduleTask(row: any): ScheduleTask {
    return {
        id: row.id,
        projectId: row.project_id,
        scheduleVersionId: row.schedule_version_id,
        wbsItemId: row.wbs_item_id,
        name: row.name,
        description: row.description,
        startDate: row.start_date,
        endDate: row.end_date,
        durationDays: row.duration_days,
        progress: row.progress,
        weight: row.weight,
        position: row.position,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapDbToTask(row: any): ProjectTask {
    return {
        id: row.id,
        projectId: row.project_id,
        stageId: row.stage_id,
        wbsItemId: row.wbs_item_id,
        title: row.title,
        description: row.description,
        status: row.status,
        priority: row.priority,
        dueAt: row.due_at,
        assigneeId: row.assignee_id,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapDbToDoc(row: any): ProjectDoc {
    return {
        id: row.id,
        projectId: row.project_id,
        stageId: row.stage_id,
        wbsItemId: row.wbs_item_id,
        title: row.title,
        docType: row.doc_type,
        url: row.url,
        storagePath: row.storage_path,
        content: row.content,
        tags: row.tags || [],
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// ============================================
// TREE BUILDER
// ============================================

function buildWBSTree(items: WBSItem[]): WBSItem[] {
    const map = new Map<string, WBSItem>();
    const roots: WBSItem[] = [];

    items.forEach((item) => {
        map.set(item.id, { ...item, children: [] });
    });

    items.forEach((item) => {
        const node = map.get(item.id)!;
        if (item.parentId && map.has(item.parentId)) {
            map.get(item.parentId)!.children!.push(node);
        } else {
            roots.push(node);
        }
    });

    const sortChildren = (nodes: WBSItem[]) => {
        nodes.sort((a, b) => a.position - b.position);
        nodes.forEach((n) => {
            if (n.children?.length) sortChildren(n.children);
        });
    };
    sortChildren(roots);

    return roots;
}
