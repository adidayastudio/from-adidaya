import masters from '@/constants/projectStageMastersV3.json';
import type { RegisterItem, RegisterV3 } from './projectRegisterV3';
export const STAGE_MASTERS_V3 = masters;
export const stageMasterItems = (stage: string) => (masters as unknown as Record<string, typeof masters.SD>)[stage]?.items || [];
type TracedItem = RegisterItem & { legacySources?: { legacyCode: string }[]; codeAliases?: string[]; masterSourceKey?: string };
export function reconcileStageMasters(state: RegisterV3, makeId: () => string): RegisterV3 {
    let next = state;
    for (const stage of Object.keys(masters)) {
        if ((next.appliedMasters?.[stage] || 0) >= 2) continue;
        const master = (masters as unknown as Record<string, typeof masters.SD>)[stage];
        const updated = new Map<string, TracedItem>();
        master.items.forEach((source, index) => {
            const sources = new Set(source.legacySources.map(row => row.legacyCode));
            const candidates = next.items.filter((item: TracedItem) => item.stage === stage && (item.masterSourceKey === `${stage}:${source.legacyOrder}` || item.legacySources?.some(row => sources.has(row.legacyCode)) || (item.title === source.title && (item.code === source.code || source.previousCodes.includes(item.code)))));
            if (candidates.length > 1) throw new Error(`Master mapping needs review: multiple existing items for ${source.title}. No records were merged.`);
            const old = candidates[0] as TracedItem | undefined;
            if (old && updated.has(old.id)) throw new Error('A legacy source matches multiple master items. Review mapping first.');
            const parts = source.code.split('-');
            const item = { ...(old || { id: makeId(), title: source.title, titleId: source.titleId, weight: source.weight, priority: source.priority, status: 'Not Started', revision: '00', url: '', notes: '', pic: '', deadline: '', versions: [] }),
                stage, category: source.code[2], group: parts[1], sequence: parts[2], suffix: '', code: source.code, position: index + 1,
                legacySources: old?.legacySources || source.legacySources, masterSourceKey: `${stage}:${source.legacyOrder}`,
                codeAliases: [...new Set([...(old?.codeAliases || []), ...(old && old.code !== source.code ? [old.code] : [])])],
            } as TracedItem;
            updated.set(item.id, item);
        });
        const items = next.items.map(item => updated.get(item.id) || item);
        updated.forEach(item => { if (!items.some(old => old.id === item.id)) items.push(item); });
        if (new Set(items.map(item => item.code)).size !== items.length) throw new Error(`Master ${stage} has a code collision with an existing project item. Existing data was kept; review the mapping.`);
        const groups = master.groups.filter(group => !next.groups.some(old => old.stage === stage && old.category === group.category && old.code === group.code));
        next = { ...next, items, groups: [...next.groups,...groups], appliedMasters: {...next.appliedMasters,[stage]:2} };
    }
    return next;
}
export function validMasterRecode(old: RegisterItem, item: RegisterItem): boolean {
    if (!Object.prototype.hasOwnProperty.call(masters,old.stage) || item.stage !== old.stage || !(item as TracedItem).codeAliases?.includes(old.code)) return false;
    return stageMasterItems(old.stage).some(source => source.code === item.code && (item as TracedItem).masterSourceKey === `${old.stage}:${source.legacyOrder}` && ((old as TracedItem).legacySources?.some(row => source.legacySources.some(ref => ref.legacyCode === row.legacyCode)) || (old.title === source.title && source.previousCodes.includes(old.code))));
}
