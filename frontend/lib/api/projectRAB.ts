import { planningRevision } from '@/lib/projectPlanningRevisions';
import { supabase } from '@/lib/supabase';
import { mergeRABDrafts, RABDrafts } from '@/lib/legacy-rab/editing';

export async function saveProjectRAB(projectId: string, baselineMeta: any, drafts: RABDrafts, rows: any[]) {
    const { data: current, error } = await supabase.from('projects').select('meta').eq('id', projectId).single();
    if (error) throw error;
    const meta = current.meta || {};
    if (!planningRevision(meta, 'rab').draft) throw new Error('RAB is published. Add a revision before editing.');
    if (JSON.stringify(meta.estimateValues || {}) !== JSON.stringify(baselineMeta.estimateValues || {})) {
        throw new Error('This RAB was changed by another user. Reload before saving; your edits have been kept.');
    }
    const next = mergeRABDrafts(meta, drafts, rows, true);
    let query = supabase.from('projects').update({ meta: next }).eq('id', projectId);
    query = current.meta === null ? query.is('meta', null) : query.filter('meta', 'eq', JSON.stringify(current.meta));
    const { data: saved, error: saveError } = await query.select('id, meta').single();
    if (saveError || !saved) throw new Error(saveError?.message || 'The data changed or access was denied. Your changes have not been saved.');
    return saved.meta;
}
