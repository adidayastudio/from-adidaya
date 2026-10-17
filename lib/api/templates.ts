import { supabase as supabaseClient, supabaseAdidaya } from '../supabase';
const supabase = (supabaseAdidaya || supabaseClient) as any;

// ============================================
// COMMON & WORKSPACE
// ============================================

export async function fetchDefaultWorkspaceId(): Promise<string | null> {
    try {
        const { data, error } = await supabase
            .from("workspaces")
            .select("id")
            .limit(1)
            .single();

        if (error) return "f39364e8-1376-4ff7-a716-78277e8d25b3";
        return data?.id || "f39364e8-1376-4ff7-a716-78277e8d25b3";
    } catch {
        return "f39364e8-1376-4ff7-a716-78277e8d25b3";
    }
}

// ============================================
// 1. PROJECT TYPE TEMPLATES (Scope)
// ============================================

export interface ProjectTypeTemplate {
    id: string;
    workspaceId: string;
    projectTypeId: string;
    code?: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

function mapDbToProjectType(row: any): ProjectTypeTemplate {
    return {
        id: row.id,
        workspaceId: row.workspace_id,
        projectTypeId: row.project_type_id,
        code: row.code,
        name: row.name,
        description: row.description,
        icon: row.icon,
        color: row.color,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export async function fetchProjectTypes(workspaceId: string): Promise<ProjectTypeTemplate[]> {
    try {
        const { data, error } = await supabase
            .from("project_type_templates")
            .select("*")
            .eq("workspace_id", workspaceId)
            .eq("is_active", true)
            .order("name");

        if (error) {
            return [];
        }
        return (data || []).map(mapDbToProjectType);
    } catch {
        return [];
    }
}

export async function createProjectType(
    workspaceId: string,
    type: Omit<ProjectTypeTemplate, "id" | "workspaceId" | "createdAt" | "updatedAt">
): Promise<ProjectTypeTemplate | null> {
    const { data, error } = await supabase
        .from("project_type_templates")
        .insert({
            workspace_id: workspaceId,
            project_type_id: type.projectTypeId,
            code: type.code,
            name: type.name,
            description: type.description,
            icon: type.icon || "Building2",
            color: type.color || "bg-blue-500",
            is_active: type.isActive,
        })
        .select()
        .single();

    if (error) throw error;
    return data ? mapDbToProjectType(data) : null;
}

export async function updateProjectType(
    projectTypeId: string,
    workspaceId: string,
    patch: Partial<ProjectTypeTemplate>
): Promise<boolean> {
    const updateData: Record<string, any> = {};

    if (patch.name) updateData.name = patch.name;
    if (patch.code !== undefined) updateData.code = patch.code;
    if (patch.description !== undefined) updateData.description = patch.description;
    if (patch.icon) updateData.icon = patch.icon;
    if (patch.color) updateData.color = patch.color;
    if (patch.isActive !== undefined) updateData.is_active = patch.isActive;

    const { error } = await supabase
        .from("project_type_templates")
        .update(updateData)
        .eq("project_type_id", projectTypeId)
        .eq("workspace_id", workspaceId);

    return !error;
}

export async function deleteProjectType(projectTypeId: string, workspaceId: string): Promise<boolean> {
    // 1. Fetch all stage IDs linked to this projectTypeId
    const { data: stagesData } = await supabase
        .from("stage_templates")
        .select("id")
        .eq("project_type_id", projectTypeId);
        
    const stageIds = (stagesData || []).map((s: any) => s.id);
    
    if (stageIds.length > 0) {
        // 2. Delete all task templates for these stages
        await supabase
            .from("stage_task_templates")
            .delete()
            .in("stage_id", stageIds);
            
        // 3. Delete all stage templates
        await supabase
            .from("stage_templates")
            .delete()
            .eq("project_type_id", projectTypeId);
    }

    // 4. Delete the project type template itself
    const { error } = await supabase
        .from("project_type_templates")
        .delete()
        .eq("project_type_id", projectTypeId)
        .eq("workspace_id", workspaceId);

    return !error;
}

// ============================================
// 2. TYPOLOGIES
// ============================================

export interface Typology {
    id: string;
    workspaceId: string;
    code: string;
    name: string;
    parentId?: string | null;
    linkedProjectTypes: string[];
    complexityLevel?: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
    subTypologies?: Typology[];
}

function mapDbToTypology(row: any): Typology {
    return {
        id: row.id,
        workspaceId: row.workspace_id,
        code: row.code,
        name: row.name,
        parentId: row.parent_id,
        linkedProjectTypes: row.linked_project_types || [],
        complexityLevel: row.complexity_level,
        sortOrder: row.sort_order,
        isActive: row.is_active,
        createdAt: row.created_at,
    };
}

export async function fetchTypologies(workspaceId: string): Promise<Typology[]> {
    try {
        const { data, error } = await supabase
            .from("typologies")
            .select("*")
            .eq("workspace_id", workspaceId)
            .eq("is_active", true)
            .order("sort_order");

        if (error) {
            return [];
        }

        const allTypologies = (data || []).map(mapDbToTypology);

        const rootMap: Record<string, Typology> = {};
        const roots: Typology[] = [];

        allTypologies.forEach((t: Typology) => {
            rootMap[t.id] = { ...t, subTypologies: [] };
        });

        allTypologies.forEach((t: Typology) => {
            if (t.parentId && rootMap[t.parentId]) {
                rootMap[t.parentId].subTypologies?.push(rootMap[t.id]);
            } else {
                roots.push(rootMap[t.id]);
            }
        });

        return roots;
    } catch {
        return [];
    }
}

export async function createTypology(
    workspaceId: string,
    typology: Omit<Typology, "id" | "workspaceId" | "createdAt" | "subTypologies">
): Promise<Typology | null> {
    const { data, error } = await supabase
        .from("typologies")
        .insert({
            workspace_id: workspaceId,
            code: typology.code,
            name: typology.name,
            parent_id: typology.parentId,
            linked_project_types: typology.linkedProjectTypes,
            complexity_level: typology.complexityLevel,
            sort_order: typology.sortOrder,
            is_active: typology.isActive,
        })
        .select()
        .single();

    if (error) throw error;
    return data ? mapDbToTypology(data) : null;
}

export async function updateTypology(id: string, workspaceId: string, patch: Partial<Typology>): Promise<boolean> {
    const updateData: Record<string, any> = {};
    if (patch.code) updateData.code = patch.code;
    if (patch.name) updateData.name = patch.name;
    if (patch.parentId !== undefined) updateData.parent_id = patch.parentId;
    if (patch.complexityLevel) updateData.complexity_level = patch.complexityLevel;
    if (patch.sortOrder !== undefined) updateData.sort_order = patch.sortOrder;
    if (patch.isActive !== undefined) updateData.is_active = patch.isActive;

    const { error } = await supabase
        .from("typologies")
        .update(updateData)
        .eq("id", id)
        .eq("workspace_id", workspaceId);

    return !error;
}

export async function deleteTypology(id: string, workspaceId: string): Promise<boolean> {
    const { error } = await supabase
        .from("typologies")
        .delete()
        .eq("id", id)
        .eq("workspace_id", workspaceId);

    return !error;
}

// ============================================
// 3. DISCIPLINES
// ============================================

export interface Discipline {
    id: string;
    workspaceId: string;
    code: string;
    nameEn: string;
    nameId?: string;
    color?: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
}

function mapDbToDiscipline(row: any): Discipline {
    return {
        id: row.id,
        workspaceId: row.workspace_id,
        code: row.code,
        nameEn: row.name_en,
        nameId: row.name_id,
        color: row.color,
        sortOrder: row.sort_order,
        isActive: row.is_active,
        createdAt: row.created_at,
    };
}

export async function fetchDisciplines(workspaceId: string): Promise<Discipline[]> {
    try {
        const { data, error } = await supabase
            .from("disciplines")
            .select("*")
            .eq("workspace_id", workspaceId)
            .eq("is_active", true)
            .order("sort_order");

        if (error) {
            return [];
        }
        return (data || []).map(mapDbToDiscipline);
    } catch {
        return [];
    }
}

export async function createDiscipline(
    workspaceId: string,
    discipline: Omit<Discipline, "id" | "workspaceId" | "createdAt">
): Promise<Discipline | null> {
    const { data, error } = await supabase
        .from("disciplines")
        .insert({
            workspace_id: workspaceId,
            code: discipline.code,
            name_en: discipline.nameEn,
            name_id: discipline.nameId,
            color: discipline.color || "bg-neutral-500",
            sort_order: discipline.sortOrder,
            is_active: discipline.isActive,
        })
        .select()
        .single();

    if (error) throw error;
    return data ? mapDbToDiscipline(data) : null;
}

export async function updateDiscipline(id: string, workspaceId: string, patch: Partial<Discipline>): Promise<boolean> {
    const updateData: Record<string, any> = {};
    if (patch.code) updateData.code = patch.code;
    if (patch.nameEn) updateData.name_en = patch.nameEn;
    if (patch.nameId) updateData.name_id = patch.nameId;
    if (patch.color) updateData.color = patch.color;
    if (patch.sortOrder !== undefined) updateData.sort_order = patch.sortOrder;
    if (patch.isActive !== undefined) updateData.is_active = patch.isActive;

    const { error } = await supabase
        .from("disciplines")
        .update(updateData)
        .eq("id", id)
        .eq("workspace_id", workspaceId);

    return !error;
}

export async function deleteDiscipline(id: string, workspaceId: string): Promise<boolean> {
    const { error } = await supabase
        .from("disciplines")
        .delete()
        .eq("id", id)
        .eq("workspace_id", workspaceId);

    return !error;
}

// ============================================
// 4. CLASSES
// ============================================

export interface ClassTemplate {
    id: string;
    workspaceId: string;
    classCode: string;
    description?: string;
    finishLevel?: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
    costMultiplierS?: number;
    costMultiplierA?: number;
    costMultiplierM?: number;
    costMultiplierI?: number;
    costMultiplierL?: number;
}

function mapDbToClass(row: any): ClassTemplate {
    return {
        id: row.id,
        workspaceId: row.workspace_id,
        classCode: row.class_code,
        description: row.description,
        finishLevel: row.finish_level,
        sortOrder: row.sort_order,
        isActive: row.is_active,
        createdAt: row.created_at,
        costMultiplierS: row.cost_multiplier_s,
        costMultiplierA: row.cost_multiplier_a,
        costMultiplierM: row.cost_multiplier_m,
        costMultiplierI: row.cost_multiplier_i,
        costMultiplierL: row.cost_multiplier_l,
    };
}

export async function fetchClasses(workspaceId?: string): Promise<ClassTemplate[]> {
    try {
        if (workspaceId) {
            const { data } = await supabase
                .from("classes")
                .select("*")
                .eq("workspace_id", workspaceId)
                .eq("is_active", true)
                .order("sort_order");
            if (data && data.length > 0) return data.map(mapDbToClass);
        }
        const { data } = await supabase
            .from("classes")
            .select("*")
            .eq("is_active", true)
            .order("sort_order");
        return (data || []).map(mapDbToClass);
    } catch {
        return [];
    }
}

export async function createClass(
    workspaceId: string,
    classData: Omit<ClassTemplate, "id" | "workspaceId" | "createdAt">
): Promise<ClassTemplate | null> {
    const { data, error } = await supabase
        .from("classes")
        .insert({
            workspace_id: workspaceId,
            class_code: classData.classCode,
            description: classData.description,
            finish_level: classData.finishLevel,
            cost_multiplier_s: classData.costMultiplierS || 0,
            cost_multiplier_a: classData.costMultiplierA || 0,
            cost_multiplier_m: classData.costMultiplierM || 0,
            cost_multiplier_i: classData.costMultiplierI || 0,
            cost_multiplier_l: classData.costMultiplierL || 0,
            sort_order: classData.sortOrder,
            is_active: classData.isActive,
        })
        .select()
        .single();

    if (error) throw error;
    return data ? mapDbToClass(data) : null;
}

export async function updateClass(id: string, workspaceId: string, patch: Partial<ClassTemplate>): Promise<boolean> {
    const updateData: Record<string, any> = {};
    if (patch.classCode) updateData.class_code = patch.classCode;
    if (patch.description) updateData.description = patch.description;
    if (patch.finishLevel) updateData.finish_level = patch.finishLevel;
    if (patch.isActive !== undefined) updateData.is_active = patch.isActive;
    if (patch.sortOrder !== undefined) updateData.sort_order = patch.sortOrder;
    if (patch.costMultiplierS !== undefined) updateData.cost_multiplier_s = patch.costMultiplierS;
    if (patch.costMultiplierA !== undefined) updateData.cost_multiplier_a = patch.costMultiplierA;
    if (patch.costMultiplierM !== undefined) updateData.cost_multiplier_m = patch.costMultiplierM;
    if (patch.costMultiplierI !== undefined) updateData.cost_multiplier_i = patch.costMultiplierI;
    if (patch.costMultiplierL !== undefined) updateData.cost_multiplier_l = patch.costMultiplierL;

    const { error } = await supabase
        .from("classes")
        .update(updateData)
        .eq("id", id);

    return !error;
}

export async function deleteClass(id: string, workspaceId: string): Promise<boolean> {
    const { error } = await supabase
        .from("classes")
        .delete()
        .eq("id", id);

    return !error;
}

// ============================================
// 5. LOCATION FACTORS
// ============================================

export interface LocationFactor {
    id: string;
    workspaceId: string;
    code?: string;
    province: string;
    city?: string | null;
    regionalFactor: number;
    difficultyFactor: number;
    isActive: boolean;
    createdAt?: string;
}

function mapDbToLocationFactor(row: any): LocationFactor {
    return {
        id: row.id,
        workspaceId: row.workspace_id,
        code: row.code,
        province: row.province,
        city: row.city,
        regionalFactor: parseFloat(row.regional_factor || 1),
        difficultyFactor: parseFloat(row.difficulty_factor || 1),
        isActive: row.is_active,
        createdAt: row.created_at,
    };
}

export async function fetchLocationFactors(workspaceId?: string): Promise<LocationFactor[]> {
    try {
        if (workspaceId) {
            const { data } = await supabase
                .from("location_factors")
                .select("*")
                .eq("workspace_id", workspaceId)
                .eq("is_active", true)
                .order("province");
            if (data && data.length > 0) return data.map(mapDbToLocationFactor);
        }
        const { data } = await supabase
            .from("location_factors")
            .select("*")
            .eq("is_active", true)
            .order("province");
        return (data || []).map(mapDbToLocationFactor);
    } catch {
        return [];
    }
}

export async function createLocationFactor(
    workspaceId: string,
    location: Omit<LocationFactor, "id" | "workspaceId" | "createdAt">
): Promise<LocationFactor | null> {
    const { data, error } = await supabase
        .from("location_factors")
        .insert({
            workspace_id: workspaceId,
            code: location.code,
            province: location.province,
            city: location.city,
            regional_factor: location.regionalFactor,
            difficulty_factor: location.difficultyFactor,
            is_active: location.isActive,
        })
        .select()
        .single();

    if (error) throw error;
    return data ? mapDbToLocationFactor(data) : null;
}

export async function updateLocationFactor(id: string, workspaceId: string, patch: Partial<LocationFactor>): Promise<boolean> {
    const updateData: Record<string, any> = {};
    if (patch.code) updateData.code = patch.code;
    if (patch.province) updateData.province = patch.province;
    if (patch.city !== undefined) updateData.city = patch.city;
    if (patch.regionalFactor !== undefined) updateData.regional_factor = patch.regionalFactor;
    if (patch.difficultyFactor !== undefined) updateData.difficulty_factor = patch.difficultyFactor;
    if (patch.isActive !== undefined) updateData.is_active = patch.isActive;

    const { error } = await supabase
        .from("location_factors")
        .update(updateData)
        .eq("id", id);

    return !error;
}

export async function deleteLocationFactor(id: string, workspaceId: string): Promise<boolean> {
    const { error } = await supabase
        .from("location_factors")
        .delete()
        .eq("id", id);

    return !error;
}

// ============================================
// STAGE TEMPLATES (Needed for Scope applicability)
// ============================================

export interface StageTemplate {
    id: string;
    workspaceId: string;
    projectTypeId: string;
    stageCode: string;
    stageName: string;
    stageNameId?: string;
    displayCode: string;
    position: number;
    weightDefault: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    category?: string | null;
    description?: string | null;
    rules?: any;
    lockable?: boolean;
}

function mapDbToStageTemplate(row: any): StageTemplate {
    return {
        id: row.id,
        workspaceId: row.workspace_id,
        projectTypeId: row.project_type_id,
        stageCode: row.stage_code,
        stageName: row.stage_name,
        stageNameId: row.stage_name_id,
        displayCode: row.display_code,
        position: row.position,
        weightDefault: parseFloat(row.weight_default || "0"),
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        category: row.category,
        description: row.description,
        rules: row.rules,
        lockable: row.lockable,
    };
}

export async function fetchStageTemplates(
    workspaceId: string,
    projectTypeId: string
): Promise<StageTemplate[]> {
    const { data, error } = await supabase
        .from("stage_templates")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("project_type_id", projectTypeId)
        .order("position");

    if (error) throw error;
    return (data || []).map(mapDbToStageTemplate);
}

export async function fetchAllStageTemplates(workspaceId: string): Promise<StageTemplate[]> {
    const { data, error } = await supabase
        .from("stage_templates")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("position");

    if (error) throw error;
    return (data || []).map(mapDbToStageTemplate);
}

export async function createStageTemplate(
    workspaceId: string,
    projectTypeId: string,
    stage: Omit<StageTemplate, "id" | "workspaceId" | "createdAt" | "updatedAt" | "projectTypeId">
): Promise<StageTemplate | null> {
    const { data, error } = await supabase
        .from("stage_templates")
        .insert({
            workspace_id: workspaceId,
            project_type_id: projectTypeId,
            stage_code: stage.stageCode,
            stage_name: stage.stageName,
            stage_name_id: stage.stageNameId,
            display_code: stage.displayCode,
            position: stage.position,
            weight_default: stage.weightDefault,
            is_active: stage.isActive,
            category: stage.category || null,
            description: stage.description || null,
            rules: stage.rules || {},
            lockable: stage.lockable ?? true,
        })
        .select()
        .single();

    if (error) throw error;
    return data ? mapDbToStageTemplate(data) : null;
}

export async function updateStageTemplate(
    stageId: string,
    workspaceId: string,
    patch: Partial<StageTemplate>
): Promise<boolean> {
    const updateData: Record<string, any> = {};
    if (patch.stageCode !== undefined) updateData.stage_code = patch.stageCode;
    if (patch.stageName !== undefined) updateData.stage_name = patch.stageName;
    if (patch.stageNameId !== undefined) updateData.stage_name_id = patch.stageNameId;
    if (patch.displayCode !== undefined) updateData.display_code = patch.displayCode;
    if (patch.position !== undefined) updateData.position = patch.position;
    if (patch.weightDefault !== undefined) updateData.weight_default = patch.weightDefault;
    if (patch.isActive !== undefined) updateData.is_active = patch.isActive;
    if (patch.category !== undefined) updateData.category = patch.category;
    if (patch.description !== undefined) updateData.description = patch.description;
    if (patch.rules !== undefined) updateData.rules = patch.rules;
    if (patch.lockable !== undefined) updateData.lockable = patch.lockable;

    const { error } = await supabase
        .from("stage_templates")
        .update(updateData)
        .eq("id", stageId)
        .eq("workspace_id", workspaceId);

    return !error;
}

export async function deleteStageTemplate(stageId: string, workspaceId: string): Promise<boolean> {
    // Delete all linked stage task templates first
    await supabase
        .from("stage_task_templates")
        .delete()
        .eq("stage_id", stageId);

    // Now delete the stage itself
    const { error } = await supabase
        .from("stage_templates")
        .delete()
        .eq("id", stageId)
        .eq("workspace_id", workspaceId);

    return !error;
}

// ============================================
// STAGE TASK TEMPLATES
// ============================================

export interface StageTaskTemplate {
    id: string;
    stageId: string | null;
    taskName: string;
    disciplineCode: string;
    weightDefault: number;
    sequenceOrder: number;
    isMandatory: boolean;
    createdAt: string;
    updatedAt: string;
    parentId?: string | null;
    sectionId?: string | null;
}

function mapDbToStageTaskTemplate(row: any): StageTaskTemplate {
    return {
        id: row.id,
        stageId: row.stage_id,
        taskName: row.task_name,
        disciplineCode: row.discipline_code || "ALL",
        weightDefault: parseFloat(row.weight_default || "0"),
        sequenceOrder: row.sequence_order || 0,
        isMandatory: row.is_mandatory || false,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        parentId: row.parent_id,
        sectionId: row.section_id,
    };
}

export async function fetchStageTaskTemplates(stageId: string): Promise<StageTaskTemplate[]> {
    const { data, error } = await supabase
        .from("stage_task_templates")
        .select("*")
        .eq("stage_id", stageId)
        .order("sequence_order");

    if (error) throw error;
    return (data || []).map(mapDbToStageTaskTemplate);
}

export async function createStageTaskTemplate(
    task: Omit<StageTaskTemplate, "id" | "createdAt" | "updatedAt">
): Promise<StageTaskTemplate | null> {
    const { data, error } = await supabase
        .from("stage_task_templates")
        .insert({
            stage_id: task.stageId,
            task_name: task.taskName,
            discipline_code: task.disciplineCode || "ALL",
            weight_default: task.weightDefault,
            sequence_order: task.sequenceOrder || 0,
            is_mandatory: task.isMandatory || false,
            parent_id: task.parentId || null,
            section_id: task.sectionId || null,
        })
        .select()
        .single();

    if (error) throw error;
    return data ? mapDbToStageTaskTemplate(data) : null;
}

export async function updateStageTaskTemplate(
    id: string,
    patch: Partial<StageTaskTemplate>
): Promise<boolean> {
    const updateData: Record<string, any> = {};
    if (patch.stageId !== undefined) updateData.stage_id = patch.stageId;
    if (patch.taskName !== undefined) updateData.task_name = patch.taskName;
    if (patch.disciplineCode !== undefined) updateData.discipline_code = patch.disciplineCode;
    if (patch.weightDefault !== undefined) updateData.weight_default = patch.weightDefault;
    if (patch.sequenceOrder !== undefined) updateData.sequence_order = patch.sequenceOrder;
    if (patch.isMandatory !== undefined) updateData.is_mandatory = patch.isMandatory;
    if (patch.parentId !== undefined) updateData.parent_id = patch.parentId;
    if (patch.sectionId !== undefined) updateData.section_id = patch.sectionId;

    const { error } = await supabase
        .from("stage_task_templates")
        .update(updateData)
        .eq("id", id);

    return !error;
}

export async function deleteStageTaskTemplate(id: string): Promise<boolean> {
    const { error } = await supabase
        .from("stage_task_templates")
        .delete()
        .eq("id", id);

    return !error;
}
