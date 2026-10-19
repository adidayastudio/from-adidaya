import { planningRevision } from '@/lib/projectPlanningRevisions';
import { supabase } from '@/lib/supabase';
import { calculateVolume, VolumeCalc } from '@/lib/projectVolume';

export async function saveProjectVolume(projectId: string, code: string, unit: string, rows: VolumeCalc[], originalIds: string[]) {
    if (!unit.trim()) throw new Error('Select an item unit.');
    if (rows.some(row => !row.name.trim())) throw new Error('Enter a description for every calculation row.');
    const records = rows.map(({ details: _, ...row }) => ({ ...row, project_id: projectId, wbs_code: code, calculated_volume: calculateVolume(row) }));
    const total = Number(records.reduce((sum, row) => sum + row.calculated_volume, 0).toFixed(3));
    const { data: project, error: readError } = await supabase.from('projects').select('meta').eq('id', projectId).single();
    if (readError) throw readError;
    if (!planningRevision(project?.meta, 'volume').draft) throw new Error('Volume is published. Add a revision before editing.');
    // Keep record IDs stable across retries; never delete all project calculations.
    if (records.length) {
        const { error } = await supabase.from('project_volume_calcs').upsert(records, { onConflict: 'id' });
        if (error) throw error;
    }
    const removed = originalIds.filter(id => !rows.some(row => row.id === id));
    if (removed.length) {
        const { error } = await supabase.from('project_volume_calcs').delete().eq('project_id', projectId).in('id', removed);
        if (error) throw new Error(`Calculations saved, but removed rows could not be cleared: ${error.message}`);
    }
    const meta = project.meta || {}, estimates = meta.estimateValues || {};
    const entry = estimates[code] || estimates[code.replace(/^[A-Z]\./, '')] || {};
    const rowDetails = { ...meta.volumeRowDetails };
    removed.forEach(id => delete rowDetails[id]);
    rows.forEach(row => { if (row.details) rowDetails[row.id] = row.details; });
    const sourceItem = meta.wbsWorkflow?.versions?.slice(-1)[0]?.items?.find((item: any) => item.wbs_code === code);
    const impacts = [...(meta.planningImpact?.items || [])];
    if (sourceItem) {
        const index = impacts.findIndex((item: any) => item.id === sourceItem.id);
        if (index >= 0) impacts[index] = { ...impacts[index], rabReview: true };
        else impacts.push({ id: sourceItem.id, code, title: sourceItem.title, kind: 'volume', volumeReview: false, rabReview: true });
    }
    const next = { ...meta, ...(sourceItem ? { planningImpact: { ...meta.planningImpact, items: impacts } } : {}), planningRevisions: { ...meta.planningRevisions, rab: { ...planningRevision(meta, 'rab'), draft: true } }, ...(Object.keys(rowDetails).length || meta.volumeRowDetails ? { volumeRowDetails: rowDetails } : {}), estimateValues: { ...estimates, [code]: { ...entry, volume: total, unit, explicit: true } } };
    let query = supabase.from('projects').update({ meta: next }).eq('id', projectId);
    query = project.meta === null ? query.is('meta', null) : query.filter('meta', 'eq', JSON.stringify(project.meta));
    const { error: metaError } = await query.select('id').single();
    if (metaError) throw new Error(`Calculations saved, but RAB was not updated. Retry Save: ${metaError.message}`);
    const { data: wbsSaved, error: wbsError } = await supabase.from('project_wbs_items').update({ quantity: total, unit }).eq('project_id', projectId).eq('wbs_code', code).select('id');
    if (wbsError || !wbsSaved?.length) throw new Error(`Calculations and RAB saved, but WBS sync failed. Retry Save: ${wbsError?.message || 'No matching WBS item was updated.'}`);
    return { total, records, meta: next };
}
