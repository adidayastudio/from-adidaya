/**
 * TEMPLATES API - EXTENDED
 * CRUD for disciplines, classes, typologies, location factors
 */

import { supabase } from "@/lib/supabaseClient";

// ============================================
// DISCIPLINES
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

export async function fetchDisciplines(workspaceId: string): Promise<Discipline[]> {
    const { data, error } = await supabase
        .from("disciplines")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order");

    if (error) throw error;
    return (data || []).map(mapDbToDiscipline);
}

export async function createDiscipline(workspaceId: string, discipline: Omit<Discipline, "id" | "workspaceId" | "createdAt">): Promise<Discipline | null> {
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

export async function deleteDiscipline(id: string, workspaceId: string): Promise<boolean> {
    const { error } = await supabase
        .from("disciplines")
        .delete()
        .eq("id", id)
        .eq("workspace_id", workspaceId);

    return !error;
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

// ============================================
// CLASSES
// ============================================

// ============================================
// CLASSES
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
    // Dynamic values keyed by discipline code
    values: Record<string, { cost: number; percentage: number }>;
}

export async function fetchClasses(workspaceId: string): Promise<ClassTemplate[]> {
    // 1. Fetch Classes
    const { data: classes, error: classError } = await supabase
        .from("classes")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order");

    if (classError) throw classError;

    // 2. Fetch Values
    const { data: values, error: valError } = await supabase
        .from("class_discipline_values")
        .select("*")
        .eq("workspace_id", workspaceId);

    if (valError) throw valError;

    // 3. Merge
    console.log(`[Ballpark] Fetched ${classes?.length} classes and ${values?.length} values for workspace ${workspaceId}`);
    if (values && values.length > 0) {
        console.log("[Ballpark] First value sample:", values[0]);
    } else {
        console.log("[Ballpark] No values found!");
    }

    return (classes || []).map(cls => {
        const clsValues: Record<string, { cost: number; percentage: number }> = {};

        // Find matching values for this class
        const myValues = values?.filter((v: any) => v.class_id === cls.id) || [];

        myValues.forEach((v: any) => {
            clsValues[v.discipline_code] = {
                cost: parseFloat(v.cost_per_m2),
                percentage: parseFloat(v.percentage)
            };
        });

        return {
            id: cls.id,
            workspaceId: cls.workspace_id,
            classCode: cls.class_code,
            description: cls.description,
            finishLevel: cls.finish_level,
            sortOrder: cls.sort_order,
            isActive: cls.is_active,
            createdAt: cls.created_at,
            values: clsValues
        };
    });
}

export async function createClass(workspaceId: string, classData: Omit<ClassTemplate, "id" | "workspaceId" | "createdAt" | "values">): Promise<ClassTemplate | null> {
    const { data, error } = await supabase
        .from("classes")
        .insert({
            workspace_id: workspaceId,
            class_code: classData.classCode,
            description: classData.description,
            finish_level: classData.finishLevel,
            sort_order: classData.sortOrder,
            is_active: classData.isActive,
        })
        .select()
        .single();

    if (error) throw error;
    // Return with empty values since it's new
    return data ? {
        id: data.id,
        workspaceId: data.workspace_id,
        classCode: data.class_code,
        description: data.description,
        finishLevel: data.finish_level,
        sortOrder: data.sort_order,
        isActive: data.is_active,
        createdAt: data.created_at,
        values: {}
    } : null;
}

export async function updateClass(id: string, workspaceId: string, patch: Partial<ClassTemplate>): Promise<boolean> {
    // 1. Update basic fields
    const updateData: Record<string, any> = {};
    if (patch.classCode) updateData.class_code = patch.classCode;
    if (patch.description) updateData.description = patch.description;
    if (patch.finishLevel) updateData.finish_level = patch.finishLevel;
    if (patch.isActive !== undefined) updateData.is_active = patch.isActive;

    if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
            .from("classes")
            .update(updateData)
            .eq("id", id)
            .eq("workspace_id", workspaceId);

        if (error) return false;
    }

    // 2. Update dynamic values if provided
    if (patch.values) {
        // Prepare upsert rows
        const upsertRows: any[] = [];

        Object.entries(patch.values).forEach(([code, val]) => {
            upsertRows.push({
                workspace_id: workspaceId,
                class_id: id,
                discipline_code: code,
                cost_per_m2: val.cost,
                percentage: val.percentage,
                updated_at: new Date().toISOString()
            });
        });

        if (upsertRows.length > 0) {
            const { error: valError } = await supabase
                .from("class_discipline_values")
                .upsert(upsertRows, { onConflict: 'class_id, discipline_code' });

            if (valError) throw valError;
        }
    }

    return true;
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
// TYPOLOGIES (Formerly Categories)
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
    subTypologies?: Typology[]; // For UI tree structure
}

export async function fetchTypologies(workspaceId: string): Promise<Typology[]> {
    const { data, error } = await supabase
        .from("typologies")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order");

    if (error) throw error;

    const allTypologies = (data || []).map(mapDbToTypology);

    // Build tree in-memory
    const rootMap: Record<string, Typology> = {};
    const roots: Typology[] = [];

    // First pass
    allTypologies.forEach(t => {
        rootMap[t.id] = { ...t, subTypologies: [] };
    });

    // Second pass: link to parents
    allTypologies.forEach(t => {
        if (t.parentId && rootMap[t.parentId]) {
            rootMap[t.parentId].subTypologies?.push(rootMap[t.id]);
        } else {
            roots.push(rootMap[t.id]);
        }
    });

    return roots;
}

export async function createTypology(workspaceId: string, typology: Omit<Typology, "id" | "workspaceId" | "createdAt" | "subTypologies">): Promise<Typology | null> {
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
// LOCATION FACTORS
// ============================================

export interface LocationFactor {
    id: string;
    workspaceId: string;
    code?: string;
    province: string;
    city?: string;
    regionalFactor: number;
    difficultyFactor: number;
    isActive: boolean;
    createdAt: string;
}

export async function fetchLocationFactors(workspaceId: string): Promise<LocationFactor[]> {
    const { data, error } = await supabase
        .from("location_factors")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("province");

    if (error) throw error;
    return (data || []).map(mapDbToLocationFactor);
}

export async function createLocationFactor(workspaceId: string, location: Omit<LocationFactor, "id" | "workspaceId" | "createdAt">): Promise<LocationFactor | null> {
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
    if (patch.city) updateData.city = patch.city;
    if (patch.regionalFactor !== undefined) updateData.regional_factor = patch.regionalFactor;
    if (patch.difficultyFactor !== undefined) updateData.difficulty_factor = patch.difficultyFactor;
    if (patch.isActive !== undefined) updateData.is_active = patch.isActive;

    const { error } = await supabase
        .from("location_factors")
        .update(updateData)
        .eq("id", id)
        .eq("workspace_id", workspaceId);

    return !error;
}

export async function deleteLocationFactor(id: string, workspaceId: string): Promise<boolean> {
    const { error } = await supabase
        .from("location_factors")
        .delete()
        .eq("id", id)
        .eq("workspace_id", workspaceId);

    return !error;
}

// ============================================
// MAPPERS
// ============================================

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

// function mapDbToClass deleted

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

function mapDbToLocationFactor(row: any): LocationFactor {
    return {
        id: row.id,
        workspaceId: row.workspace_id,
        code: row.code,
        province: row.province,
        city: row.city,
        regionalFactor: parseFloat(row.regional_factor),
        difficultyFactor: parseFloat(row.difficulty_factor),
        isActive: row.is_active,
        createdAt: row.created_at,
    };
}


// ============================================
// STAGE WEIGHTS & TASKS (Migration 005)
// ============================================

export interface StageWeight {
    id: string;
    stageId: string;
    disciplineCode: string;
    weightPercentage: number;
    basis: "Progress" | "Fee";
}

// -- STAGE TASKS --

// -- STAGE WEIGHTS --

export async function fetchStageWeights(stageId: string): Promise<StageWeight[]> {
    const { data, error } = await supabase
        .from("stage_weights")
        .select("*")
        .eq("stage_id", stageId);

    if (error) throw error;
    return (data || []).map((row: any) => ({
        id: row.id,
        stageId: row.stage_id,
        disciplineCode: row.discipline_code,
        weightPercentage: parseFloat(row.weight_percentage),
        basis: row.basis
    }));
}

export async function upsertStageWeight(
    stageId: string,
    disciplineCode: string,
    weightPercentage: number,
    basis: "Progress" | "Fee" = "Progress"
): Promise<boolean> {
    const { error } = await supabase
        .from("stage_weights")
        .upsert({
            stage_id: stageId,
            discipline_code: disciplineCode,
            weight_percentage: weightPercentage,
            basis: basis,
            updated_at: new Date().toISOString()
        }, { onConflict: 'stage_id, discipline_code, basis' });

    return !error;
}

export async function deleteStageWeight(id: string): Promise<boolean> {
    const { error } = await supabase
        .from("stage_weights")
        .delete()
        .eq("id", id);
    return !error;
}

// -- STAGE SECTIONS --

export interface StageSectionTemplate {
    id: string;
    stageId: string;
    sectionCode: string;
    sectionName: string;
    weightDefault: number;
    sequenceOrder: number;
}

export async function fetchStageSectionTemplates(stageId: string): Promise<StageSectionTemplate[]> {
    const { data, error } = await supabase
        .from("stage_section_templates")
        .select("*")
        .eq("stage_id", stageId)
        .order("sequence_order");

    if (error) throw error;
    return (data || []).map((row: any) => ({
        id: row.id,
        stageId: row.stage_id,
        sectionCode: row.section_code,
        sectionName: row.section_name,
        weightDefault: parseFloat(row.weight_default),
        sequenceOrder: row.sequence_order
    }));
}

export async function upsertStageSectionTemplate(
    item: Omit<StageSectionTemplate, "id"> & { id?: string }
): Promise<StageSectionTemplate | null> {
    const { data, error } = await supabase
        .from("stage_section_templates")
        .upsert({
            id: item.id,
            stage_id: item.stageId,
            section_code: item.sectionCode,
            section_name: item.sectionName,
            weight_default: item.weightDefault,
            sequence_order: item.sequenceOrder,
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) throw error;
    return data ? {
        id: data.id,
        stageId: data.stage_id,
        sectionCode: data.section_code,
        sectionName: data.section_name,
        weightDefault: parseFloat(data.weight_default),
        sequenceOrder: data.sequence_order
    } : null;
}

export async function deleteStageSectionTemplate(id: string): Promise<boolean> {
    const { error } = await supabase
        .from("stage_section_templates")
        .delete()
        .eq("id", id);
    return !error;
}


// -- STAGE TASKS --

export interface StageTaskTemplate {
    id: string;
    stageId: string;
    taskName: string;
    disciplineCode: string; // 'ALL' or specific
    weightDefault: number;
    sequenceOrder: number;
    isMandatory: boolean;
    parentId?: string | null; // For Subtasks
    sectionId?: string | null; // Link to Section
}

export async function fetchStageTaskTemplates(stageId: string): Promise<StageTaskTemplate[]> {
    const { data, error } = await supabase
        .from("stage_task_templates")
        .select("*")
        .eq("stage_id", stageId)
        .order("sequence_order");

    if (error) throw error;
    return (data || []).map((row: any) => ({
        id: row.id,
        stageId: row.stage_id,
        taskName: row.task_name,
        disciplineCode: row.discipline_code,
        weightDefault: parseFloat(row.weight_default),
        sequenceOrder: row.sequence_order,
        isMandatory: row.is_mandatory,
        parentId: row.parent_id,
        sectionId: row.section_id
    }));
}

export async function createStageTaskTemplate(
    item: Omit<StageTaskTemplate, "id">
): Promise<StageTaskTemplate | null> {
    const { data, error } = await supabase
        .from("stage_task_templates")
        .insert({
            stage_id: item.stageId,
            task_name: item.taskName,
            discipline_code: item.disciplineCode,
            weight_default: item.weightDefault,
            sequence_order: item.sequenceOrder,
            is_mandatory: item.isMandatory,
            parent_id: item.parentId,
            section_id: item.sectionId
        })
        .select()
        .single();

    if (error) throw error;
    return data ? {
        id: data.id,
        stageId: data.stage_id,
        taskName: data.task_name,
        disciplineCode: data.discipline_code,
        weightDefault: parseFloat(data.weight_default),
        sequenceOrder: data.sequence_order,
        isMandatory: data.is_mandatory,
        parentId: data.parent_id,
        sectionId: data.section_id
    } : null;
}

export async function updateStageTaskTemplate(
    id: string,
    patch: Partial<StageTaskTemplate>
): Promise<boolean> {
    const updateData: Record<string, any> = {};
    if (patch.taskName) updateData.task_name = patch.taskName;
    if (patch.disciplineCode) updateData.discipline_code = patch.disciplineCode;
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

// -- BULK OPERATIONS --

export async function bulkUpdateStageSections(
    stageId: string,
    sections: (StageSectionTemplate & { isDeleted?: boolean })[]
): Promise<boolean> {
    // 1. Delete removed sections (explicitly marked or implied?)
    // Strategy: We trust the list contains ALL valid sections.
    // However, if we only send dirty ones, we can't do "NOT IN".
    // Let's assume the UI sends the FULL structure.

    // Get current IDs in DB
    const { data: current } = await supabase.from('stage_section_templates').select('id').eq('stage_id', stageId);
    const incomingIds = new Set(sections.map(s => s.id));
    const toDelete = current?.filter(c => !incomingIds.has(c.id)).map(c => c.id) || [];

    if (toDelete.length > 0) {
        const { error: delErr } = await supabase.from('stage_section_templates').delete().in('id', toDelete);
        if (delErr) throw delErr;
    }

    // 2. Upsert incoming
    if (sections.length > 0) {
        const upsertData = sections.map(s => ({
            id: s.id,
            stage_id: stageId,
            section_code: s.sectionCode,
            section_name: s.sectionName,
            weight_default: s.weightDefault,
            sequence_order: s.sequenceOrder,
            updated_at: new Date().toISOString()
        }));

        const { error: upErr } = await supabase.from('stage_section_templates').upsert(upsertData);
        if (upErr) throw upErr;
    }

    return true;
}

export async function bulkUpdateStageTasks(
    stageId: string,
    tasks: StageTaskTemplate[]
): Promise<boolean> {
    // 1. Delete removed tasks
    const { data: current } = await supabase.from('stage_task_templates').select('id').eq('stage_id', stageId);
    const incomingIds = new Set(tasks.map(t => t.id));
    const toDelete = current?.filter(c => !incomingIds.has(c.id)).map(c => c.id) || [];

    if (toDelete.length > 0) {
        const { error: delErr } = await supabase.from('stage_task_templates').delete().in('id', toDelete);
        if (delErr) throw delErr;
    }

    // 2. Upsert incoming - Must sort by hierarchy depth to avoid FK errors
    // (Parent must exist before child)
    // We can't easily query depth, but we can infer it from visual structure or sort top-down.
    // Or, simpler: Multiple passes.
    // Pass 1: Roots (parentId is null).
    // Pass 2: Level 1 (parentId in Roots).
    // Pass 3: ...
    // Or just sort by string code length? No, code is generated by us.
    // Topological sort based on parentId.

    const sortedTasks = [...tasks];
    // Simple sort: items with no parent first. Then items whose parent is already in "seen" set.
    // Actually, just sorting by (parentId ? 1 : 0) isn't enough for deep nesting.

    // Let's do a robust topological sort
    const idMap = new Map<string, StageTaskTemplate>();
    tasks.forEach(t => idMap.set(t.id, t));

    const depth = (t: StageTaskTemplate): number => {
        if (!t.parentId) return 0;
        const parent = idMap.get(t.parentId);
        if (!parent) return 0; // Should not happen if data is consistent
        return 1 + depth(parent);
    };

    // Sort by depth ascending
    sortedTasks.sort((a, b) => depth(a) - depth(b));

    if (sortedTasks.length > 0) {
        const upsertData = sortedTasks.map(t => ({
            id: t.id,
            stage_id: stageId,
            task_name: t.taskName,
            discipline_code: t.disciplineCode,
            weight_default: t.weightDefault,
            sequence_order: t.sequenceOrder,
            is_mandatory: t.isMandatory || false,
            parent_id: t.parentId,
            section_id: t.sectionId,
            updated_at: new Date().toISOString()
        }));

        const { error: upErr } = await supabase.from('stage_task_templates').upsert(upsertData);
        if (upErr) throw upErr;
    }



    return true;
}
