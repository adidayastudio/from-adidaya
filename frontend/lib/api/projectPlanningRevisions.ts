import { supabase } from '@/lib/supabase';
import { PlanningModule, planningRevision, publishPlanningRevision, resolvePlanningImpact } from '@/lib/projectPlanningRevisions';
import { publishedWBSRows } from '@/lib/projectWBSWorkflow';
import { loadVolumeDraft, volumeUnitMismatch, volumeDraftTotal, displayVolumeUnit } from '@/lib/projectVolumeEditor';
export async function persistPlanningRevision(projectId: string, module: PlanningModule, action: 'start' | 'publish' | 'review', itemId?: string) {
    const { data: project, error } = await supabase.from('projects').select('meta').eq('id', projectId).single();
    if (error || !project) throw new Error(error?.message || 'Unable to load revisions.');
    const meta = project.meta || {};
    let next = meta;
    if (action === 'start') next = { ...meta, planningRevisions: { ...meta.planningRevisions, [module]: { ...planningRevision(meta, module), draft: true } } };
    if (action === 'review') {
        const impact = meta.planningImpact?.items?.find((item: any) => item.id === itemId);
        if (!impact) throw new Error('This review no longer exists. Reload the project.');
        if (module === 'rab' && impact.volumeReview) throw new Error('Review this item in Volume first.');
        if (module === 'volume' && impact.kind !== 'removed') {
            const { data: rows, error: readError } = await supabase.from('project_wbs_items').select('*').eq('project_id', projectId).eq('id', itemId);
            if (readError) throw readError;
            const row = rows?.[0], entry = row && meta.estimateValues?.[row.wbs_code];
            if (row && row.is_leaf !== false && (!entry?.explicit || entry.unit !== row.unit)) throw new Error('Save a calculation with the current item unit before marking it reviewed.');
        }
        next = resolvePlanningImpact(meta, module, itemId!);
    }
    if (action === 'publish') {
        const read = async (table: string) => {
            const rows: any[] = [];
            for (let offset = 0; ; offset += 500) {
                const { data, error } = await supabase.from(table).select('*').eq('project_id', projectId).order('id').range(offset, offset + 499);
                if (error) throw error;
                rows.push(...(data || [])); if (!data || data.length < 500) return rows;
            }
        };
        const wbs = publishedWBSRows(meta, await read('project_wbs_items')), calculations = await read('project_volume_calcs');
        if (module === 'volume') for (const item of wbs.filter(row => !wbs.some(child => child.parent_id === row.id))) {
            const draft = loadVolumeDraft({ ...item, code: item.wbs_code }, calculations, meta);
            const entry = meta.estimateValues?.[item.wbs_code];
            if (!draft.calculated || !entry?.explicit) throw new Error(`Calculate and save ${item.wbs_code} before publishing. Zero is allowed when explicitly saved.`);
            if (volumeUnitMismatch(draft) || volumeDraftTotal(draft.rows) == null) throw new Error(`Check the formula and unit for ${item.wbs_code}.`);
            if (Number(entry.volume) !== volumeDraftTotal(draft.rows) || displayVolumeUnit(entry.unit) !== draft.unit) throw new Error(`Save ${item.wbs_code} again to apply its latest calculation to RAB.`);
        }
        next = publishPlanningRevision(meta, module, wbs, calculations);
    }
    let query = supabase.from('projects').update({ meta: next }).eq('id', projectId);
    query = project.meta == null ? query.is('meta', null) : query.filter('meta', 'eq', JSON.stringify(project.meta));
    const { data: saved, error: saveError } = await query.select('meta').single();
    if (saveError || !saved) throw new Error(saveError?.message || 'Project changed elsewhere. Reload before continuing.');
    return saved.meta;
}
