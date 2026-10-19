export type WBSVersion = { version: number; submittedAt: string; items: any[] };
export type WBSWorkflow = { draft: { items: any[]; savedAt: string; baseVersion: number } | null; versions: WBSVersion[] };
export function readWBSWorkflow(meta: any): WBSWorkflow {
    if (meta?.wbsWorkflow) return meta.wbsWorkflow;
    const previous = meta?.wbsSubmission;
    return { draft: null, versions: previous?.items?.length ? [{ version: Number(previous.version) || 1, submittedAt: previous.submittedAt, items: previous.items }] : [] };
}
export function validateWBSItems(items: any[]) {
    if (!items.length) throw new Error('Add work before saving WBS.');
    const ids = new Set<string>(), codes = new Set<string>();
    for (const item of items) {
        if (!item.id || ids.has(item.id) || !item.wbs_code || codes.has(item.wbs_code)) throw new Error('WBS identities and codes must be unique.');
        if (!item.title?.trim()) throw new Error(`Enter a work name for ${item.wbs_code}.`);
        ids.add(item.id); codes.add(item.wbs_code);
    }
    for (const item of items) {
        const seen = new Set([item.id]); let parentId = item.parent_id;
        while (parentId) {
            const parent = items.find(row => row.id === parentId);
            if (!parent || seen.has(parentId)) throw new Error('WBS hierarchy contains a missing parent or a cycle.');
            seen.add(parentId); parentId = parent.parent_id;
        }
    }
}
export function nextWBSWorkflow(current: WBSWorkflow, items: any[], submit: boolean): WBSWorkflow {
    validateWBSItems(items);
    const snapshot = JSON.parse(JSON.stringify(items));
    const version = Math.max(0, ...current.versions.map(row => row.version));
    if (submit) snapshot.forEach((item: any) => { if (item.meta?.wbsSourceCode) { const { wbsSourceCode: _, ...meta } = item.meta; item.meta = meta; } });
    if (submit) return { draft: null, versions: [...current.versions, { version: version + 1, submittedAt: new Date().toISOString(), items: snapshot }] };
    return { ...current, draft: { items: snapshot, savedAt: new Date().toISOString(), baseVersion: version } };
}
export function publishedWBSRows(meta: any, databaseRows: any[]): any[] {
    const versions = readWBSWorkflow(meta).versions;
    if (!versions.length) return databaseRows;
    return versions[versions.length - 1].items.map(item => {
        const live = databaseRows.find(row => row.id === item.id) || (!item.id ? databaseRows.find(row => row.wbs_code === item.wbs_code) : undefined);
        return live ? { ...item, quantity: live.quantity, unit: live.unit } : item;
    });
}
