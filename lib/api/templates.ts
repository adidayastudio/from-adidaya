/**
 * TEMPLATES API
 * CRUD operations for project templates (types, stages, WBS, RAB, schedule)
 * Updated to match DB Schema Migration 002 & 003
 */

import { supabase } from "@/lib/supabaseClient";

// ============================================
// 1. PROJECT TYPE TEMPLATES
// ============================================

// ... imports

// ... imports

export async function fetchDefaultWorkspaceId(): Promise<string | null> {
    const { data, error } = await supabase
        .from("workspaces")
        .select("id")
        .limit(1)
        .single();

    if (error) return null;
    return data?.id || null;
}

export interface ProjectTypeTemplate {
    id: string;
    workspaceId: string;
    projectTypeId: string; // Renamed from typeId
    code?: string; // Added
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export async function fetchProjectTypes(workspaceId: string): Promise<ProjectTypeTemplate[]> {
    const { data, error } = await supabase
        .from("project_type_templates")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("name");

    if (error) throw error;
    return (data || []).map(mapDbToProjectType);
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
            code: type.code, // Added
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
    if (patch.code !== undefined) updateData.code = patch.code; // Added
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
    const { error } = await supabase
        .from("project_type_templates")
        .delete()
        .eq("project_type_id", projectTypeId)
        .eq("workspace_id", workspaceId);

    return !error;
}

// ============================================
// 2. STAGE TEMPLATES
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
    // Extended fields
    category?: string;
    description?: string;
    rules?: any; // JSONB
    lockable?: boolean;
}

export async function fetchStageTemplates(
    workspaceId: string,
    projectTypeId: string,
    options?: { includeInactive?: boolean }
): Promise<StageTemplate[]> {
    let query = supabase
        .from("stage_templates")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("project_type_id", projectTypeId)
        .order("position");

    if (!options?.includeInactive) {
        query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map(mapDbToStageTemplate);
}

export async function createStageTemplate(
    workspaceId: string,
    stage: Omit<StageTemplate, "id" | "workspaceId" | "createdAt" | "updatedAt">
): Promise<StageTemplate | null> {
    const { data, error } = await supabase
        .from("stage_templates")
        .insert({
            workspace_id: workspaceId,
            project_type_id: stage.projectTypeId,
            stage_code: stage.stageCode,
            stage_name: stage.stageName,
            stage_name_id: stage.stageNameId,
            display_code: stage.displayCode,
            position: stage.position,
            weight_default: stage.weightDefault,
            is_active: stage.isActive,
            category: stage.category,
            description: stage.description,
            rules: stage.rules,
            lockable: stage.lockable
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

    if (patch.stageName) updateData.stage_name = patch.stageName;
    if (patch.stageNameId !== undefined) updateData.stage_name_id = patch.stageNameId;
    if (patch.displayCode) updateData.display_code = patch.displayCode;
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
    const { error } = await supabase
        .from("stage_templates")
        .delete()
        .eq("id", stageId)
        .eq("workspace_id", workspaceId);

    return !error;
}

export async function bulkUpdateStageTemplates(
    workspaceId: string,
    projectTypeId: string,
    stages: StageTemplate[]
): Promise<boolean> {
    // Delete all existing stages for this type
    await supabase
        .from("stage_templates")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("project_type_id", projectTypeId);

    // Insert new stages
    const stagesData = stages.map((s, idx) => ({
        workspace_id: workspaceId,
        project_type_id: projectTypeId,
        stage_code: s.stageCode,
        stage_name: s.stageName,
        stage_name_id: s.stageNameId,
        display_code: s.displayCode,
        position: idx + 1,
        weight_default: s.weightDefault,
        is_active: s.isActive,
        category: s.category,
        description: s.description,
        rules: s.rules,
        lockable: s.lockable
    }));

    const { error } = await supabase.from("stage_templates").insert(stagesData);

    return !error;
}

// ... existing code ...

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
        weightDefault: parseFloat(row.weight_default),
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        category: row.category,
        description: row.description,
        rules: row.rules,
        lockable: row.lockable
    };
}

// ============================================
// 3. WBS TEMPLATES
// ============================================

export interface WbsTemplate {
    id: string;
    workspaceId: string;
    projectTypeId: string;
    stageCode?: string;
    wbsStructure: any; // JSONB
    createdAt: string;
    updatedAt: string;
}

export async function fetchWbsTemplate(
    workspaceId: string,
    projectTypeId: string
): Promise<WbsTemplate | null> {
    const { data, error } = await supabase
        .from("wbs_templates")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("project_type_id", projectTypeId)
        .single();

    // It's okay if not found, return null
    if (error && error.code !== 'PGRST116') throw error;
    return data ? mapDbToWbsTemplate(data) : null;
}

export async function saveWbsTemplate(
    workspaceId: string,
    projectTypeId: string,
    wbsStructure: any
): Promise<WbsTemplate | null> {
    // Upsert based on project_type_id (assuming one WBS per project type for now)
    // Note: The schema allows stage_code, but for now we often treat it as global per type

    // Check if exists
    const existing = await fetchWbsTemplate(workspaceId, projectTypeId);

    let result;
    if (existing) {
        const { data, error } = await supabase
            .from("wbs_templates")
            .update({ wbs_structure: wbsStructure, updated_at: new Date().toISOString() })
            .eq("id", existing.id)
            .select()
            .single();
        if (error) throw error;
        result = data;
    } else {
        const { data, error } = await supabase
            .from("wbs_templates")
            .insert({
                workspace_id: workspaceId,
                project_type_id: projectTypeId,
                wbs_structure: wbsStructure
            })
            .select()
            .single();
        if (error) throw error;
        result = data;
    }

    return result ? mapDbToWbsTemplate(result) : null;
}

// ============================================
// 4. RAB / PRICE TEMPLATES
// ============================================

export interface RabPriceTemplate {
    id: string;
    workspaceId: string;
    wbsCode: string;
    title: string;
    unit: string;
    unitPrice: number;
    materialCost: number;
    laborCost: number;
    equipmentCost: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

// ... (previous code)

export async function fetchRabPriceTemplates(workspaceId: string): Promise<RabPriceTemplate[]> {
    const { data, error } = await supabase
        .from("rab_price_templates")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("wbs_code");

    if (error) throw error;
    return (data || []).map(mapDbToRabPriceTemplate);
}

export async function createRabPriceTemplate(
    workspaceId: string,
    price: Omit<RabPriceTemplate, "id" | "workspaceId" | "createdAt" | "updatedAt">
): Promise<RabPriceTemplate | null> {
    const { data, error } = await supabase
        .from("rab_price_templates")
        .insert({
            workspace_id: workspaceId,
            wbs_code: price.wbsCode,
            title: price.title,
            unit: price.unit,
            unit_price: price.unitPrice,
            material_cost: price.materialCost,
            labor_cost: price.laborCost,
            equipment_cost: price.equipmentCost,
            is_active: price.isActive,
        })
        .select()
        .single();

    if (error) throw error;
    return data ? mapDbToRabPriceTemplate(data) : null;
}

export async function updateRabPriceTemplate(
    id: string,
    workspaceId: string,
    patch: Partial<RabPriceTemplate>
): Promise<boolean> {
    const updateData: Record<string, any> = {};
    if (patch.wbsCode) updateData.wbs_code = patch.wbsCode;
    if (patch.title) updateData.title = patch.title;
    if (patch.unit) updateData.unit = patch.unit;
    if (patch.unitPrice !== undefined) updateData.unit_price = patch.unitPrice;
    if (patch.materialCost !== undefined) updateData.material_cost = patch.materialCost;
    if (patch.laborCost !== undefined) updateData.labor_cost = patch.laborCost;
    if (patch.equipmentCost !== undefined) updateData.equipment_cost = patch.equipmentCost;
    if (patch.isActive !== undefined) updateData.is_active = patch.isActive;

    const { error } = await supabase
        .from("rab_price_templates")
        .update(updateData)
        .eq("id", id)
        .eq("workspace_id", workspaceId);

    return !error;
}

export async function deleteRabPriceTemplate(id: string, workspaceId: string): Promise<boolean> {
    const { error } = await supabase
        .from("rab_price_templates")
        .delete()
        .eq("id", id)
        .eq("workspace_id", workspaceId);

    return !error;
}

// ============================================
// 5. SCHEDULE TEMPLATES
// ============================================

export interface ScheduleTemplate {
    id: string;
    workspaceId: string;
    projectTypeId: string;
    stageCode: string;
    defaultDurationDays: number;
    createdAt: string;
    updatedAt: string;
}

export async function fetchScheduleTemplates(
    workspaceId: string,
    projectTypeId: string
): Promise<ScheduleTemplate[]> {
    const { data, error } = await supabase
        .from("schedule_templates")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("project_type_id", projectTypeId);

    if (error) throw error;
    return (data || []).map(mapDbToScheduleTemplate);
}

export async function upsertScheduleTemplate(
    workspaceId: string,
    projectTypeId: string,
    stageCode: string,
    defaultDurationDays: number
): Promise<boolean> {
    const { error } = await supabase
        .from("schedule_templates")
        .upsert({
            workspace_id: workspaceId,
            project_type_id: projectTypeId,
            stage_code: stageCode,
            default_duration_days: defaultDurationDays,
            updated_at: new Date().toISOString()
        }, { onConflict: 'workspace_id, project_type_id, stage_code' });

    return !error;
}


// ============================================
// 6. MASTER DATA (Disciplines, Classes, etc.)
// ============================================

export interface Discipline {
    id: string;
    workspaceId: string;
    code: string;
    nameEn: string;
    nameId?: string;
    color: string;
    sortOrder: number;
    isActive: boolean;
}

export async function fetchDisciplines(workspaceId: string): Promise<Discipline[]> {
    const { data, error } = await supabase
        .from("disciplines")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order");

    if (error) throw error;
    return (data || []).map((row: any) => ({
        id: row.id,
        workspaceId: row.workspace_id,
        code: row.code,
        nameEn: row.name_en,
        nameId: row.name_id,
        color: row.color,
        sortOrder: row.sort_order,
        isActive: row.is_active
    }));
}

export async function createDiscipline(
    workspaceId: string,
    item: Omit<Discipline, "id" | "workspaceId">
): Promise<Discipline | null> {
    const { data, error } = await supabase
        .from("disciplines")
        .insert({
            workspace_id: workspaceId,
            code: item.code,
            name_en: item.nameEn,
            name_id: item.nameId,
            color: item.color,
            sort_order: item.sortOrder,
            is_active: item.isActive,
        })
        .select()
        .single();

    if (error) throw error;
    return data ? {
        id: data.id,
        workspaceId: data.workspace_id,
        code: data.code,
        nameEn: data.name_en,
        nameId: data.name_id,
        color: data.color,
        sortOrder: data.sort_order,
        isActive: data.is_active
    } : null;
}

export async function updateDiscipline(
    id: string,
    workspaceId: string,
    patch: Partial<Discipline>
): Promise<boolean> {
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

// CLASSES

export interface ClassTemplate {
    id: string;
    workspaceId: string;
    classCode: string;
    description?: string;
    costMultiplierS: number;
    costMultiplierA: number;
    costMultiplierM: number;
    costMultiplierI: number;
    costMultiplierL: number;
    finishLevel?: string;
    sortOrder: number;
    isActive: boolean;
}

export async function fetchClasses(workspaceId: string): Promise<ClassTemplate[]> {
    const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order");

    if (error) throw error;
    return (data || []).map((row: any) => ({
        id: row.id,
        workspaceId: row.workspace_id,
        classCode: row.class_code,
        description: row.description,
        costMultiplierS: parseFloat(row.cost_multiplier_s || 0),
        costMultiplierA: parseFloat(row.cost_multiplier_a || 0),
        costMultiplierM: parseFloat(row.cost_multiplier_m || 0),
        costMultiplierI: parseFloat(row.cost_multiplier_i || 0),
        costMultiplierL: parseFloat(row.cost_multiplier_l || 0),
        finishLevel: row.finish_level,
        sortOrder: row.sort_order,
        isActive: row.is_active
    }));
}

export async function createClass(
    workspaceId: string,
    item: Omit<ClassTemplate, "id" | "workspaceId">
): Promise<ClassTemplate | null> {
    const { data, error } = await supabase
        .from("classes")
        .insert({
            workspace_id: workspaceId,
            class_code: item.classCode,
            description: item.description,
            cost_multiplier_s: item.costMultiplierS,
            cost_multiplier_a: item.costMultiplierA,
            cost_multiplier_m: item.costMultiplierM,
            cost_multiplier_i: item.costMultiplierI,
            cost_multiplier_l: item.costMultiplierL,
            finish_level: item.finishLevel,
            sort_order: item.sortOrder,
            is_active: item.isActive,
        })
        .select()
        .single();

    if (error) throw error;
    return data ? {
        id: data.id,
        workspaceId: data.workspace_id,
        classCode: data.class_code,
        description: data.description,
        costMultiplierS: parseFloat(data.cost_multiplier_s || 0),
        costMultiplierA: parseFloat(data.cost_multiplier_a || 0),
        costMultiplierM: parseFloat(data.cost_multiplier_m || 0),
        costMultiplierI: parseFloat(data.cost_multiplier_i || 0),
        costMultiplierL: parseFloat(data.cost_multiplier_l || 0),
        finishLevel: data.finish_level,
        sortOrder: data.sort_order,
        isActive: data.is_active
    } : null;
}

export async function updateClass(
    id: string,
    workspaceId: string,
    patch: Partial<ClassTemplate>
): Promise<boolean> {
    const updateData: Record<string, any> = {};
    if (patch.classCode) updateData.class_code = patch.classCode;
    if (patch.description) updateData.description = patch.description;
    if (patch.costMultiplierS !== undefined) updateData.cost_multiplier_s = patch.costMultiplierS;
    if (patch.costMultiplierA !== undefined) updateData.cost_multiplier_a = patch.costMultiplierA;
    if (patch.costMultiplierM !== undefined) updateData.cost_multiplier_m = patch.costMultiplierM;
    if (patch.costMultiplierI !== undefined) updateData.cost_multiplier_i = patch.costMultiplierI;
    if (patch.costMultiplierL !== undefined) updateData.cost_multiplier_l = patch.costMultiplierL;
    if (patch.finishLevel) updateData.finish_level = patch.finishLevel;
    if (patch.sortOrder !== undefined) updateData.sort_order = patch.sortOrder;
    if (patch.isActive !== undefined) updateData.is_active = patch.isActive;

    const { error } = await supabase
        .from("classes")
        .update(updateData)
        .eq("id", id)
        .eq("workspace_id", workspaceId);

    return !error;
}

export async function deleteClass(id: string, workspaceId: string): Promise<boolean> {
    const { error } = await supabase
        .from("classes")
        .delete()
        .eq("id", id)
        .eq("workspace_id", workspaceId);

    return !error;
}

// ============================================
// MAPPERS
// ============================================

function mapDbToProjectType(row: any): ProjectTypeTemplate {
    return {
        id: row.id,
        workspaceId: row.workspace_id,
        projectTypeId: row.project_type_id, // Updated
        code: row.code, // Added
        name: row.name,
        description: row.description,
        icon: row.icon,
        color: row.color,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}



function mapDbToWbsTemplate(row: any): WbsTemplate {
    return {
        id: row.id,
        workspaceId: row.workspace_id,
        projectTypeId: row.project_type_id,
        stageCode: row.stage_code,
        wbsStructure: row.wbs_structure,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapDbToRabPriceTemplate(row: any): RabPriceTemplate {
    return {
        id: row.id,
        workspaceId: row.workspace_id,
        wbsCode: row.wbs_code,
        title: row.title,
        unit: row.unit,
        unitPrice: parseFloat(row.unit_price),
        materialCost: parseFloat(row.material_cost),
        laborCost: parseFloat(row.labor_cost),
        equipmentCost: parseFloat(row.equipment_cost),
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function mapDbToScheduleTemplate(row: any): ScheduleTemplate {
    return {
        id: row.id,
        workspaceId: row.workspace_id,
        projectTypeId: row.project_type_id,
        stageCode: row.stage_code,
        defaultDurationDays: row.default_duration_days,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
