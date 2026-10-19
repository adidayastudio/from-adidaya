import { supabase } from '@/lib/supabase';
import { StageWorkLayout, validateStageLayout } from '@/lib/legacy-stages/layout';
export async function saveStageWorkLayout(projectId: string, stage: string, layout: StageWorkLayout, baseline: any, revision = false) {
    validateStageLayout(layout);
    const { data, error } = await supabase.from('projects').select('meta').eq('id', projectId).single();
    if (error) throw error;
    const meta = data.meta || {};
    if (JSON.stringify(meta.stageWorkLayouts?.[stage] ?? null) !== JSON.stringify(baseline ?? null)) throw new Error('This stage layout was changed by another user. Reload before saving; your edits have been kept.');
    const revisions = meta.stageWorkRevisions?.[stage] || [];
    const version = revisions.reduce((max: number, item: any) => Math.max(max, Number(item.version) || 0), 0) + 1;
    const next = { ...meta, stageWorkLayouts: { ...meta.stageWorkLayouts, [stage]: layout }, ...(revision ? { stageWorkRevisions: { ...meta.stageWorkRevisions, [stage]: [...revisions, { version, createdAt: new Date().toISOString(), layout }] } } : {}) };
    let query = supabase.from('projects').update({ meta: next }).eq('id', projectId);
    query = data.meta === null ? query.is('meta', null) : query.filter('meta', 'eq', JSON.stringify(data.meta));
    const { data: saved, error: updateError } = await query.select('meta').single();
    if (updateError || !saved) throw new Error(updateError?.message || 'The stage layout was not saved.');
    return saved.meta;
}
