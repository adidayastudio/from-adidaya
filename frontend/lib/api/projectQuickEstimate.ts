import { readWBSWorkflow } from '@/lib/projectWBSWorkflow';
import { supabase } from '@/lib/supabase';
import { QUICK_LEVELS, QuickEstimate, quickEstimateRows, quickEstimateInput, validateQuickEstimate } from '@/lib/projectQuickEstimate';
export async function saveProjectQuickEstimate(projectId: string, baseline: any, input: QuickEstimate) {
    const { data: project, error } = await supabase.from('projects').select('meta').eq('id', projectId).single();
    if (error || !project) throw new Error(error?.message || 'Unable to load project.');
    if (JSON.stringify(project.meta?.quickEstimate ?? null) !== JSON.stringify(baseline ?? null)) throw new Error('Quick Estimates changed elsewhere. Reload before saving.');
    // Use the submitted project hierarchy, never a caller-supplied allocation structure.
    let source = readWBSWorkflow(project.meta).versions.slice(-1)[0]?.items;
    if (!source) {
        source = [];
        for (let offset = 0; ; offset += 500) {
            const { data, error: sourceError } = await supabase.from('project_wbs_items').select('*').eq('project_id', projectId).order('id').range(offset, offset + 499);
            if (sourceError) throw sourceError;
            source.push(...(data || [])); if (!data || data.length < 500) break;
        }
    }
    const rows = quickEstimateRows(source);
    if (input.area !== undefined && (!Number.isFinite(input.area) || input.area <= 0 || !Object.prototype.hasOwnProperty.call(QUICK_LEVELS, input.buildingClass || '') || !Number.isFinite(input.adjustmentFactor) || input.adjustmentFactor! <= 0)) throw new Error('Enter a valid area, class and price adjustment.');
    const normalized = input.area !== undefined ? quickEstimateInput(input, rows) : input;
    const total = validateQuickEstimate(normalized, rows);
    const meta = { ...project.meta, quickEstimate: { ...normalized, total, savedAt: new Date().toISOString() } };
    let query = supabase.from('projects').update({ meta }).eq('id', projectId);
    query = project.meta == null ? query.is('meta', null) : query.filter('meta', 'eq', JSON.stringify(project.meta));
    const { data, error: saveError } = await query.select('meta').single();
    if (saveError || !data) throw new Error(saveError?.message || 'Project changed elsewhere. Try again.');
    return data.meta;
}
