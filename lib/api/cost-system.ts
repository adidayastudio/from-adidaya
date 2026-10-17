import { supabase } from "@/lib/supabaseClient";

export interface CostTemplate {
    id: string;
    workspaceId: string;
    name: string;
    description: string;
    type: 'general' | 'typology';
    typologyId?: string;
    currency: string;
    // Legacy single field kept for backward compat, but we prefer unitConfig now
    unitBasis?: string;
    defaultResetBehavior: 'stage' | 'project';
    defaultDisciplines: string[];
    unitConfig: Record<string, string>; // { length: 'm', area: 'm2', ... }
    isActive: boolean;
    createdAt?: string;

    // Rules (Joined)
    rules?: CostTemplateRule[];
}

export interface CostTemplateRule {
    id?: string;
    costTemplateId?: string;
    ruleType: 'stage_wbs' | 'components' | 'factors' | 'validation';
    config: any;
}

// -- FETCHING --

export async function fetchCostTemplates(workspaceId: string): Promise<CostTemplate[]> {
    const { data, error } = await supabase
        .from("cost_templates")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(mapDbToTemplate);
}

export async function fetchCostTemplate(id: string): Promise<CostTemplate | null> {
    const { data, error } = await supabase
        .from("cost_templates")
        .select(`
            *,
            rules:cost_template_rules(*)
        `)
        .eq("id", id)
        .single();

    if (error) return null;
    return mapDbToTemplate(data);
}

// -- SAVING --

export async function upsertCostTemplate(
    template: Partial<CostTemplate> & { workspaceId: string },
    rules: CostTemplateRule[]
): Promise<string | null> {
    // 1. Upsert Template
    const dbTemplate = {
        workspace_id: template.workspaceId,
        name: template.name,
        description: template.description,
        type: template.type,
        typology_id: template.typologyId,
        currency: template.currency,
        unit_basis: template.unitConfig?.['area'] || 'm2', // Fallback to area for legacy column
        default_reset_behavior: template.defaultResetBehavior,
        default_disciplines: template.defaultDisciplines,
        unit_config: template.unitConfig,
        is_active: true,
        updated_at: new Date().toISOString()
    };

    // If ID exists, add it for update
    if (template.id && template.id !== 'new') {
        // @ts-ignore
        dbTemplate.id = template.id;
    }

    const { data: savedTemplate, error: tmplError } = await supabase
        .from("cost_templates")
        .upsert(dbTemplate)
        .select()
        .single();

    if (tmplError) throw tmplError;
    if (!savedTemplate) return null;

    const templateId = savedTemplate.id;

    // 2. Upsert Rules
    if (rules.length > 0) {
        const dbRules = rules.map(r => ({
            cost_template_id: templateId,
            rule_type: r.ruleType,
            config: r.config,
            updated_at: new Date().toISOString()
        }));

        // We need to upsert by (cost_template_id, rule_type) unique constraint
        const { error: rulesError } = await supabase
            .from("cost_template_rules")
            .upsert(dbRules, { onConflict: 'cost_template_id, rule_type' });

        if (rulesError) throw rulesError;
    }

    return templateId;
}

export async function deleteCostTemplate(id: string): Promise<boolean> {
    const { error } = await supabase
        .from("cost_templates")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting template:", error);
        return false;
    }
    return true;
}

// -- MAPPERS --

function mapDbToTemplate(row: any): CostTemplate {
    return {
        id: row.id,
        workspaceId: row.workspace_id,
        name: row.name,
        description: row.description,
        type: row.type,
        typologyId: row.typology_id,
        currency: row.currency,
        unitBasis: row.unit_basis,
        defaultResetBehavior: row.default_reset_behavior,
        defaultDisciplines: row.default_disciplines || [],
        unitConfig: row.unit_config || {},
        isActive: row.is_active,
        createdAt: row.created_at,
        rules: Array.isArray(row.rules) ? row.rules.map(mapDbToRule) : []
    };
}

function mapDbToRule(row: any): CostTemplateRule {
    return {
        id: row.id,
        costTemplateId: row.cost_template_id,
        ruleType: row.rule_type,
        config: row.config
    };
}
