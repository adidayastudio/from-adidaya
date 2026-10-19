import { supabase } from '@/lib/supabase';
/** Synchronize structural edits only when publishing; drafts never touch live rows. */
export async function synchronizeWBSStructure(projectId: string, existing: any[], items: any[]) {
    const removed = existing.filter(row => !items.some(item => item.id === row.id)).sort((a, b) => Number(b.level ?? b.wbs_code.split('.').length - 1) - Number(a.level ?? a.wbs_code.split('.').length - 1));
    for (const row of removed) {
        const { error } = await supabase.from('project_wbs_items').delete().eq('project_id', projectId).eq('id', row.id);
        if (error) throw new Error(`WBS submission not finalized. Unable to remove ${row.wbs_code}: ${error.message}`);
    }
    const kept = existing.filter(row => items.some(item => item.id === row.id));
    // Temporarily free changed codes so moving a subtree cannot collide with its old codes.
    for (const row of kept.filter(row => items.find(item => item.id === row.id)?.wbs_code !== row.wbs_code)) {
        const { error: volumeError } = await supabase.from('project_volume_calcs').update({ wbs_code: `pending-${row.id}` }).eq('project_id', projectId).eq('wbs_code', row.wbs_code);
        if (volumeError) throw new Error(`Unable to move volume calculations: ${volumeError.message}`);
        const { data, error } = await supabase.from('project_wbs_items').update({ wbs_code: `pending-${row.id}` }).eq('project_id', projectId).eq('id', row.id).select('id').single();
        if (error || !data) throw new Error(`WBS submission not finalized. ${error?.message || 'Unable to move work. Retry Submit.'}`);
    }
    const additions = items.filter(item => !existing.some(row => row.id === item.id)).sort((a, b) => Number(a.level ?? a.wbs_code.split('.').length - 1) - Number(b.level ?? b.wbs_code.split('.').length - 1));
    for (const item of additions) {
        const record = { id: item.id, project_id: projectId, parent_id: item.parent_id || null, wbs_code: item.wbs_code, title: item.title, title_en: item.title_en || '', level: Number(item.level || 0), position: Number(item.position || 0), is_leaf: !items.some(child => child.parent_id === item.id), quantity: item.quantity ?? 0, unit: item.unit || null, notes: item.notes || null, meta: item.meta || {} };
        const { data, error } = await supabase.from('project_wbs_items').upsert(record, { onConflict: 'id' }).select('id').single();
        if (error || !data) throw new Error(`WBS submission not finalized. ${error?.message || 'Unable to add work. Retry Submit.'}`);
    }
    const result: any[] = [];
    for (const row of kept) {
        const item = items.find(item => item.id === row.id);
        const structure = { parent_id: item.parent_id || null, wbs_code: item.wbs_code, position: Number(item.position || 0), level: Number(item.level || 0), is_leaf: !items.some(child => child.parent_id === item.id) };
        if (Object.entries(structure).some(([key, value]) => (key === 'parent_id' ? row[key] || null : row[key]) !== value)) {
            const { data, error } = await supabase.from('project_wbs_items').update(structure).eq('project_id', projectId).eq('id', row.id).select('id').single();
            if (error || !data) throw new Error(`WBS submission not finalized. ${error?.message || 'Unable to save hierarchy. Retry Submit.'}`);
        }
        if (row.wbs_code !== structure.wbs_code) {
            const { error: volumeError } = await supabase.from('project_volume_calcs').update({ wbs_code: structure.wbs_code }).eq('project_id', projectId).eq('wbs_code', `pending-${row.id}`);
            if (volumeError) throw new Error(`Unable to finalize volume calculations: ${volumeError.message}`);
        }
        result.push({ ...row, ...structure });
    }
    return [...result, ...additions];
}
