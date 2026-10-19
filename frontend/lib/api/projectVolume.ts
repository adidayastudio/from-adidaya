import { supabase } from '@/lib/supabase';
import { calculateVolume, VolumeCalc } from '@/lib/projectVolume';

export async function saveProjectVolume(projectId: string, code: string, unit: string, rows: VolumeCalc[], originalIds: string[]) {
    if (!unit.trim()) throw new Error('Select an item unit.');
    const records = rows.map(row => ({ ...row, project_id: projectId, wbs_code: code, calculated_volume: calculateVolume(row) }));
    const total = records.reduce((sum, row) => sum + row.calculated_volume, 0);
    const { data: project, error: readError } = await supabase.from('projects').select('meta').eq('id', projectId).single();
    if (readError) throw readError;
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
    const next = { ...meta, estimateValues: { ...estimates, [code]: { ...entry, volume: total, unit, explicit: true } } };
    let query = supabase.from('projects').update({ meta: next }).eq('id', projectId);
    query = project.meta === null ? query.is('meta', null) : query.filter('meta', 'eq', JSON.stringify(project.meta));
    const { error: metaError } = await query.select('id').single();
    if (metaError) throw new Error(`Calculations saved, but RAB was not updated. Retry Save: ${metaError.message}`);
    const { data: wbsSaved, error: wbsError } = await supabase.from('project_wbs_items').update({ quantity: total, unit }).eq('project_id', projectId).eq('wbs_code', code).select('id');
    if (wbsError || !wbsSaved?.length) throw new Error(`Calculations and RAB saved, but WBS sync failed. Retry Save: ${wbsError?.message || 'No matching WBS item was updated.'}`);
    return { total, records, meta: next };
}
