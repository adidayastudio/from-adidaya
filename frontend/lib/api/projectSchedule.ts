import { supabase } from '@/lib/supabase';
import { saveProjectMeta } from './projects';

export async function saveProjectSchedule(
    projectId: string,
    scheduleValues: Record<string, any>,
    scheduleConfig?: Record<string, any>
): Promise<any> {
    const { data, error } = await supabase.from('projects').select('meta').eq('id', projectId).single();
    if (error) throw error;
    const meta = data?.meta || {};

    const nextMeta = {
        ...meta,
        scheduleValues: {
            ...(meta.scheduleValues || {}),
            ...scheduleValues,
        },
        ...(scheduleConfig ? { scheduleConfig: { ...(meta.scheduleConfig || {}), ...scheduleConfig } } : {}),
    };

    let query = supabase.from('projects').update({ meta: nextMeta }).eq('id', projectId);
    query = data?.meta === null ? query.is('meta', null) : query.filter('meta', 'eq', JSON.stringify(data.meta));
    const { data: saved, error: updateError } = await query.select('meta').single();
    if (updateError || !saved) {
        // Fallback without optimistic filter if concurrent write happens
        const { data: fallbackSaved, error: fallbackError } = await supabase.from('projects').update({ meta: nextMeta }).eq('id', projectId).select('meta').single();
        if (fallbackError || !fallbackSaved) {
            throw new Error(fallbackError?.message || updateError?.message || 'Unable to save schedule data.');
        }
        await saveProjectMeta(projectId, { scheduleValues, scheduleConfig });
        return fallbackSaved.meta;
    }

    await saveProjectMeta(projectId, { scheduleValues, scheduleConfig });
    return saved.meta;
}
