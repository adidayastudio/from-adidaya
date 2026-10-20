import master from '@/constants/projectRegisterV3.json';
export const REGISTER_STAGES = master.stages;
export const REGISTER_CATEGORIES = master.categories;
export const REGISTER_EXAMPLES = master.examples;
export type RegisterStatus = 'Not Started' | 'Draft' | 'In Progress' | 'In Review' | 'Approved';
export interface RegisterRevision {
    id: string;
    version: number;
    revision: string;
    title: string;
    code: string;
    url: string;
    publishedAt: string;
    notes: string;
    relatedModule?: string;
}
export interface RegisterItem {
    masterSourceKey?: string;
    legacySources?: { legacyCode: string }[];
    codeAliases?: string[];
    titleId?: string;
    weight?: number;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    parentId?: string;
    position?: number;
    excluded?: boolean;
    id: string;
    stage: string;
    category: string;
    group: string;
    sequence: string;
    suffix: string;
    code: string;
    title: string;
    status: RegisterStatus;
    revision: string;
    url: string;
    notes: string;
    pic: string;
    deadline: string;
    relatedModule?: string;
    versions: RegisterRevision[];
}
export interface RegisterV3 {
    appliedMasters?: Record<string, number>;
    planningRevisions?: { id: string; stage: string; createdAt: string; items: RegisterItem[] }[];
    schemaVersion: 3;
    items: RegisterItem[];
    groups: {
        stage: string;
        category: string;
        code: string;
        name: string;
    }[];
}
export const emptyRegister = (): RegisterV3 => ({ schemaVersion: 3, items: [], groups: [] });
export function readRegisterV3(meta: any): RegisterV3 { const value = meta?.projectRegisterV3; return value?.schemaVersion === 3 && Array.isArray(value.items) ? { ...value, groups: value.groups || [] } : emptyRegister(); }
export function registerGroups(category: string, state: RegisterV3, stage: string) {
    const base = (master.groups as Record<string, {
        code: string;
        name: string;
    }[]>)[category] || [];
    const all = new Map(base.map(group => [group.code, group]));
    state.groups.filter(group => group.stage === stage && group.category === category).forEach(group => all.set(group.code, group));
    state.items.filter(item => item.stage === stage && item.category === category).forEach(item => { if (!all.has(item.group))
        all.set(item.group, { code: item.group, name: `Group ${item.group}` }); });
    return [...all.values()].sort((a, b) => a.code.localeCompare(b.code));
}
export function validateRegisterItem(item: RegisterItem) {
    if (!REGISTER_STAGES.some(stage => stage.code === item.stage))
        throw new Error('Choose a valid stage.');
    if (!REGISTER_CATEGORIES.some(category => category.code === item.category) && !['E', 'P'].includes(item.category))
        throw new Error('Choose a valid category.');
    if (!/^\d{2}$/.test(item.group) || !/^(0[1-9]|[1-9]\d)(-(0[1-9]|[1-9]\d))*$/.test(item.sequence) || !/^[A-Z]*$/.test(item.suffix))
        throw new Error('Use group 00–99 and sequence 01–99.');
    if (item.code !== `${item.stage}${item.category}-${item.group}-${item.sequence}${item.suffix}`)
        throw new Error('Document code does not match its register.');
    if (item.weight !== undefined && (!Number.isFinite(item.weight) || item.weight < 0)) throw new Error('Weight must be zero or more.');
    if (item.priority && !['low','medium','high','urgent'].includes(item.priority)) throw new Error('Choose a valid priority.');
    if (!item.title.trim())
        throw new Error('Enter a title.');
    if (!['Not Started', 'Draft', 'In Progress', 'In Review', 'Approved'].includes(item.status))
        throw new Error('Choose a valid status.');
    if (item.url && !/^https?:\/\//i.test(item.url))
        throw new Error('Use an http or https file link.');
}
export function addRegisterItem(state: RegisterV3, stage: string, category: string, group: string, title: string, id: string): RegisterV3 {
    const reserved = state.items.flatMap(item => [item.code, ...(item.codeAliases || []), ...item.versions.map(version => version.code)]);
    let sequence = 1;
    while (sequence <= 99 && reserved.includes(`${stage}${category}-${group}-${String(sequence).padStart(2, '0')}`))
        sequence++;
    if (sequence > 99)
        throw new Error('This group already uses all 99 numbers. Add another group.');
    const seq = String(sequence).padStart(2, '0');
    const item: RegisterItem = { id, stage, category, group, sequence: seq, suffix: '', code: `${stage}${category}-${group}-${seq}`, title: title.trim(), status: 'Not Started', revision: '00', url: '', notes: '', pic: '', deadline: '', versions: [] };
    validateRegisterItem(item);
    return { ...state, items: [...state.items, item] };
}
export function updateRegisterItem(state: RegisterV3, item: RegisterItem): RegisterV3 {
    const old = state.items.find(row => row.id === item.id);
    if (!old)
        throw new Error('Item no longer exists.');
    if (old.versions.length && old.revision === old.versions.at(-1)?.revision)
        throw new Error('Create a revision before editing a published item.');
    if (item.code !== old.code || item.id !== old.id || JSON.stringify(item.versions) !== JSON.stringify(old.versions))
        throw new Error('Codes and published versions cannot be changed here.');
    validateRegisterItem(item);
    return { ...state, items: state.items.map(row => row.id === item.id ? item : row) };
}
export function publishRegisterItem(state: RegisterV3, id: string, revisionId: string, now: string): RegisterV3 {
    const item = state.items.find(row => row.id === id);
    if (!item)
        throw new Error('Item no longer exists.');
    validateRegisterItem(item);
    if (item.status !== 'Approved')
        throw new Error('Approve the item before publishing.');
    if (!item.url && !item.relatedModule)
        throw new Error('Link a file or an existing module before publishing.');
    if (item.versions.some(version => version.revision === item.revision))
        throw new Error('Create a new revision first.');
    const snapshot: RegisterRevision = { id: revisionId, version: item.versions.length + 1, revision: item.revision, title: item.title, code: item.code, url: item.url, notes: item.notes, relatedModule: item.relatedModule, publishedAt: now };
    return { ...state, items: state.items.map(row => row.id === id ? { ...row, versions: [...row.versions, snapshot] } : row) };
}
export function reviseRegisterItem(state: RegisterV3, id: string): RegisterV3 {
    const item = state.items.find(row => row.id === id);
    if (!item?.versions.length || item.revision !== item.versions.at(-1)?.revision)
        throw new Error('This item already has a draft or has not been published.');
    const revision = String(Number(item.revision) + 1).padStart(2, '0');
    return { ...state, items: state.items.map(row => row.id === id ? { ...row, revision, status: 'Draft' } : row) };
}
export function addRegisterGroup(state: RegisterV3, stage: string, category: string, code: string, name: string): RegisterV3 {
    if (!/^\d{2}$/.test(code) || !name.trim())
        throw new Error('Enter a group number 00–99 and a name.');
    if (registerGroups(category, state, stage).some(group => group.code === code))
        throw new Error('Group number already exists.');
    return { ...state, groups: [...state.groups, { stage, category, code, name: name.trim() }] };
}
export function registerItemStatus(item: RegisterItem) { return item.versions.at(-1)?.revision === item.revision ? 'Published' : item.status; }

// Published records and master sources remain recoverable through exclusion.
export function canDeleteRegisterWork(state: RegisterV3, id: string): boolean {
    const item = state.items.find(row => row.id === id);
    return !!item && !item.masterSourceKey && !item.legacySources?.length && !item.versions.length && !state.items.some(row => row.parentId === id);
}
export function deleteRegisterWork(state: RegisterV3, id: string): RegisterV3 {
    if (!canDeleteRegisterWork(state, id)) throw new Error('Master or published work must be excluded instead.');
    const parent = state.items.find(row => row.id === id)?.parentId;
    return { ...state, items: state.items.filter(row => row.id !== id).map(row => row.parentId === id ? { ...row, parentId: parent } : row) };
}

export function canDeleteRegisterGroup(state: RegisterV3, stage: string, category: string, code: string): boolean {
    const standard = (master.groups as Record<string, {code:string;name:string}[]>)[category] || [];
    return state.groups.some(group => group.stage === stage && group.category === category && group.code === code)
        && !standard.some(group => group.code === code)
        && !state.items.some(item => item.stage === stage && item.category === category && item.group === code);
}
export function deleteRegisterGroup(state: RegisterV3, stage: string, category: string, code: string): RegisterV3 {
    if (!canDeleteRegisterGroup(state, stage, category, code)) throw new Error('Only empty custom groups can be deleted.');
    return {...state, groups: state.groups.filter(group => !(group.stage === stage && group.category === category && group.code === code))};
}
