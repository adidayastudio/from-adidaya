import { repairPlanningHierarchy, validHierarchyRecode, validOrderedRecode, renumberPlanningWork } from '@/lib/projectRegisterPlanningV3';
import { STAGE_MASTERS_V3, validMasterRecode } from '@/lib/projectStageMastersV3';
import { initializeRegisterMasters } from '@/lib/projectKOMasterV3';
import { supabase } from '@/lib/supabase';
import { canDeleteRegisterWork, emptyRegister, RegisterV3, validateRegisterItem } from '@/lib/projectRegisterV3';
function stableJSON(value: unknown): string {
    const sort = (item: any): any => Array.isArray(item) ? item.map(sort) : item && typeof item === 'object' ? Object.fromEntries(Object.keys(item).filter(key => item[key] !== undefined).sort().map(key => [key, sort(item[key])])) : item;
    return JSON.stringify(sort(value));
}
export async function loadProjectRegisterV3(projectId: string): Promise<RegisterV3> {
    for (let attempt = 0; attempt < 3; attempt++) {
        const { data, error } = await supabase.from('projects').select('meta').eq('id', projectId).single();
        if (error || !data) throw new Error(error?.message || 'Unable to load register.');
        const current: RegisterV3 = data.meta?.projectRegisterV3 || emptyRegister();
        let initialized = repairPlanningHierarchy(initializeRegisterMasters(current, () => globalThis.crypto.randomUUID()));
        for (const stage of Object.keys(STAGE_MASTERS_V3)) {
            for (const category of new Set(initialized.items.filter(item => item.stage === stage).map(item => item.category))) initialized = renumberPlanningWork(initialized,stage,category);
        }
        if (initialized === current) return current;
        try {
            await saveProjectRegisterV3(projectId, current, initialized);
            return initialized;
        } catch (reason) {
            if (attempt === 2 || !(reason instanceof Error) || !/changed elsewhere/i.test(reason.message)) throw reason;
        }
    }
    throw new Error('Unable to initialize register. Please reload.');
}
export async function saveProjectRegisterV3(projectId: string, baseline: RegisterV3, next: RegisterV3): Promise<void> {
    next.items.forEach(validateRegisterItem);
    if (new Set(next.items.map(item => item.code)).size !== next.items.length || new Set(next.items.map(item => item.id)).size !== next.items.length)
        throw new Error('Duplicate item code or ID.');
    const { data, error } = await supabase.from('projects').select('meta, updated_at').eq('id', projectId).single();
    if (error || !data)
        throw new Error(error?.message || 'Unable to read project.');
    const meta = data.meta || {}, current = meta.projectRegisterV3 || emptyRegister();
    if (stableJSON(current) !== stableJSON(baseline))
        throw new Error('Register changed elsewhere. Reload before saving.');
    if (stableJSON((next.planningRevisions || []).slice(0,(current.planningRevisions || []).length)) !== stableJSON(current.planningRevisions || [])) throw new Error('Stage revision history must be preserved.');
    for (const item of current.items) {
        const updated = next.items.find(row => row.id === item.id);
        if (!updated && canDeleteRegisterWork(current, item.id)) continue;
        if (!updated || (updated.code !== item.code && !validMasterRecode(item,updated) && !validHierarchyRecode(item,updated,current) && !validOrderedRecode(item,updated,next)) || stableJSON(updated.versions.slice(0, item.versions.length)) !== stableJSON(item.versions))
            throw new Error('Existing identities and published history must be preserved.');
    }
    // Keep optimistic concurrency filters bounded: project metadata can exceed URL limits.
    // Advance the timestamp explicitly, including when two saves occur within one millisecond.
    const previousTime = Date.parse(data.updated_at || '') || 0;
    const updatedAt = new Date(Math.max(Date.now(), previousTime + 1)).toISOString();
    let query = supabase.from('projects').update({ meta: { ...meta, projectRegisterV3: next }, updated_at: updatedAt }).eq('id', projectId);
    query = data.updated_at == null ? query.is('updated_at', null) : query.eq('updated_at', data.updated_at);
    const { data: saved, error: writeError } = await query.select('id').single();
    if (writeError || !saved)
        throw new Error(writeError?.message || 'Project changed elsewhere. Retry saving.');
}
