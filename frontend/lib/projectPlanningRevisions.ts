import { readWBSWorkflow } from './projectWBSWorkflow';
export type PlanningModule = 'volume' | 'rab';
export type PlanningImpact = { id: string; code: string; title: string; kind: 'added' | 'removed' | 'unit' | 'structure' | 'volume'; volumeReview: boolean; rabReview: boolean };
export type PlanningVersion = { version: number; publishedAt: string; wbsVersion: number; volumeVersion?: number; snapshot: { wbs: any[]; calculations: any[]; meta: any } };
export type PlanningRevision = { draft: boolean; versions: PlanningVersion[] };
export function planningRevision(meta: any, module: PlanningModule): PlanningRevision { return meta?.planningRevisions?.[module] || { draft: true, versions: [] }; }
export function wbsPlanningImpact(previous: any[], next: any[]): PlanningImpact[] {
    const leaf = (rows: any[], id: string) => !rows.some(row => row.parent_id === id);
    const result: PlanningImpact[] = [];
    for (const old of previous) {
        const item = next.find(row => row.id === old.id);
        if (!item && leaf(previous, old.id)) result.push({ id: old.id, code: old.wbs_code, title: old.title, kind: 'removed', volumeReview: true, rabReview: true });
    }
    for (const item of next) {
        const old = previous.find(row => row.id === item.id);
        const kind = !old ? 'added' : (old.unit || '') !== (item.unit || '') ? 'unit' : leaf(previous, old.id) !== leaf(next, item.id) ? 'structure' : null;
        if (kind && (leaf(next, item.id) || (old && leaf(previous, old.id)))) result.push({ id: item.id, code: item.wbs_code, title: item.title, kind, volumeReview: true, rabReview: true });
    }
    return result;
}
export function applyWBSPlanningRevision(meta: any, previous: any[], next: any[], version: number) {
    const changes = previous.length ? wbsPlanningImpact(previous, next) : [];
    const pending: PlanningImpact[] = (meta.planningImpact?.items || []).map((impact: PlanningImpact) => {
        const item = next.find(row => row.id === impact.id);
        return item ? { ...impact, code: item.wbs_code, title: item.title } : impact;
    });
    changes.forEach(change => { const index = pending.findIndex(item => item.id === change.id); if (index < 0) pending.push(change); else pending[index] = change; });
    return { ...meta, planningImpact: { wbsVersion: version, updatedAt: new Date().toISOString(), items: pending, structureUpdated: previous.length > 0 }, planningRevisions: { ...meta.planningRevisions, volume: { ...planningRevision(meta, 'volume'), draft: true }, rab: { ...planningRevision(meta, 'rab'), draft: true } } };
}
export function resolvePlanningImpact(meta: any, module: PlanningModule, id: string) {
    const key = module === 'volume' ? 'volumeReview' : 'rabReview';
    const items = (meta.planningImpact?.items || []).map((item: PlanningImpact) => item.id === id ? { ...item, [key]: false } : item);
    return { ...meta, planningImpact: { ...meta.planningImpact, items } };
}
export function publishPlanningRevision(meta: any, module: PlanningModule, wbs: any[], calculations: any[]) {
    const state = planningRevision(meta, module), wbsVersion = readWBSWorkflow(meta).versions.slice(-1)[0]?.version;
    if (!state.draft) throw new Error('Start a revision before publishing.');
    if (!wbsVersion) throw new Error('Submit WBS before publishing.');
    if ((meta.planningImpact?.items || []).some((item: PlanningImpact) => module === 'volume' ? item.volumeReview : item.rabReview || item.volumeReview)) throw new Error('Review all affected items before publishing.');
    const volume = planningRevision(meta, 'volume'), volumeVersion = volume.versions.slice(-1)[0];
    if (module === 'rab' && (!volumeVersion || volume.draft || volumeVersion.wbsVersion !== wbsVersion)) throw new Error('Publish the current Volume revision before publishing RAB.');
    const { planningRevisions: _revisions, planningImpact: _impact, wbsWorkflow: _wbs, ...snapshotMeta } = meta;
    const snapshot = JSON.parse(JSON.stringify({ wbs, calculations, meta: snapshotMeta }));
    const published: PlanningVersion = { version: Math.max(0, ...state.versions.map(item => item.version)) + 1, publishedAt: new Date().toISOString(), wbsVersion, ...(module === 'rab' ? { volumeVersion: volumeVersion!.version } : {}), snapshot };
    return { ...meta, planningRevisions: { ...meta.planningRevisions, [module]: { draft: false, versions: [...state.versions, published] }, ...(module === 'volume' ? { rab: { ...planningRevision(meta, 'rab'), draft: true } } : {}) } };
}
