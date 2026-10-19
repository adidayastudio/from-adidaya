import { supabase } from '@/lib/supabase';
import { nextWBSWorkflow, readWBSWorkflow } from '@/lib/projectWBSWorkflow';
import { synchronizeWBSStructure } from './projectWBSStructure';
import { saveProjectWBS } from './projectWBS';
export async function persistWBSWorkflow(projectId: string, baseline: any, items: any[], submit: boolean) {
    const { data: project, error } = await supabase.from('projects').select('meta').eq('id', projectId).single();
    if (error || !project) throw new Error(error?.message || 'Unable to load WBS.');
    const meta = project.meta || {};
    if (JSON.stringify(meta.wbsWorkflow ?? null) !== JSON.stringify(baseline ?? null)) throw new Error('WBS changed elsewhere. Reload before saving; your edits are still here.');
    const workflow = nextWBSWorkflow(readWBSWorkflow(meta), items, submit);
    if (submit) {
        const existing: any[] = [];
        for (let offset = 0; ; offset += 500) {
            const { data, error: readError } = await supabase.from('project_wbs_items').select('*').eq('project_id', projectId).order('id').range(offset, offset + 499);
            if (readError) throw readError;
            existing.push(...(data || [])); if (!data || data.length < 500) break;
        }
        const synchronized = await synchronizeWBSStructure(projectId, existing, items);
        const drafts: Record<string, { title: string; title_en: string }> = {};
        for (const item of items) {
            const row = existing.find(row => row.id === item.id);
            if (row && (row.title !== item.title || (row.title_en || '') !== (item.title_en || ''))) drafts[item.id] = { title: item.title, title_en: item.title_en || '' };
        }
        await saveProjectWBS(projectId, synchronized, drafts, false, []);
    }
    let publishedMeta = meta;
    if (submit && meta.estimateValues) {
        const source = meta.estimateValues, remapped = { ...source };
        const latest = readWBSWorkflow(meta).versions.slice(-1)[0];
        const changes = items.map(item => ({ old: item.meta?.wbsSourceCode || latest?.items.find(row => row.id === item.id)?.wbs_code || item.wbs_code, next: item.wbs_code })).filter(change => change.old !== change.next);
        changes.forEach(change => delete remapped[change.old]);
        changes.forEach(change => { if (Object.prototype.hasOwnProperty.call(source, change.old)) remapped[change.next] = source[change.old]; });
        publishedMeta = { ...meta, estimateValues: remapped };
    }
    let query = supabase.from('projects').update({ meta: { ...publishedMeta, wbsWorkflow: workflow } }).eq('id', projectId);
    query = project.meta == null ? query.is('meta', null) : query.filter('meta', 'eq', JSON.stringify(project.meta));
    const { data: saved, error: saveError } = await query.select('meta').single();
    if (saveError || !saved) throw new Error(`${submit ? 'WBS items synchronized, but submission was not finalized. Retry Submit. ' : ''}${saveError?.message || 'Project changed elsewhere. Reload before saving.'}`);
    return saved.meta.wbsWorkflow;
}
