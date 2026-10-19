const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const cache = new Map();
let responses = [], writes = [];
const mockClient = { from: () => { const query = { select: () => query, eq: () => query, is: () => query, filter: (...args) => { writes.push(args); return query; }, update: value => { writes.push(value); return query; }, single: async () => responses.shift() }; return query; } };
function load(file) {
    file = path.resolve(file.endsWith('.ts') ? file : `${file}.ts`);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    vm.runInNewContext(js, { module, exports: module.exports, require: spec => spec === '@/lib/supabase' ? { supabase: mockClient } : load(spec.startsWith('@/') ? path.resolve(spec.slice(2)) : path.resolve(path.dirname(file), spec)), console });
    return module.exports;
}
const { legacyProjectInfo, legacyRABView } = load('lib/legacy-rab/project-view.ts');
const wbs = [
    { id: 's', wbs_code: 'S', title: 'Struktur' },
    { id: 'prep', parent_id: 's', wbs_code: 'S.1', title: 'Persiapan' },
    { id: 'measure', parent_id: 'prep', wbs_code: 'S.1.1', title: 'Pengukuran & Bouwplank', quantity: 174.51, unit: 'm¹' },
    { id: 'clean', parent_id: 'prep', wbs_code: 'S.1.2', title: 'Pembersihan & Perataan Lahan', quantity: 800, unit: 'm²' },
];
const project = { id: 'ruby', code: 'RBH', meta: { estimateValues: { '1.1': { volume: 0, unitPrice: 118377, unit: 'm¹' } } } };
test('legacy resolves zero metadata volume against project WBS and full discipline code', () => {
    const view = legacyRABView(legacyProjectInfo(project, wbs, 'DETAIL'), 'disc_S');
    const leaf = view.rows.find(row => row.code === 'S.1.1');
    assert.equal(leaf.title, 'Pengukuran & Bouwplank');
    assert.equal(leaf.volume, 174.51);
    assert.equal(leaf.unitPrice, 118377);
    assert.equal(Math.round(leaf.total_price), 20657970);
    assert.equal(view.rows[0].isSection, true);
    assert.equal(view.rows[1].code, 'S.1');
    assert.equal(view.rows.find(row => row.code === 'S.1.2').volume, 800);
    assert.equal(view.subtotal, leaf.total_price);
    assert.equal(leaf.weight, 100);
});
test('nonzero exact saved values override WBS and all discipline tabs remain available', () => {
    const info = legacyProjectInfo({ ...project, meta: { estimateValues: { 'S.1.1': { volume: 200, unitPrice: 100, unit: 'm' } } } }, wbs, 'DETAIL');
    const view = legacyRABView(info, 'disc_S');
    assert.equal(view.rows.find(row => row.code === 'S.1.1').total_price, 20000);
    assert.equal(view.tabs.length, 5);
    assert.equal(legacyRABView(info, 'rekap_samil').subtotal, 20000);
});
test('project database tree takes precedence over metadata custom tree', () => {
    const info = legacyProjectInfo({ ...project, meta: { wbsTree: [{ code: 'OTHER' }] } }, wbs, 'DETAIL');
    assert.equal(info.wbsTree[0].code, 'S');
});
test('all-work view includes every discipline and totals only leaf rows', () => {
    const rows = [...wbs, { id: 'a', wbs_code: 'A', title: 'Arsitektur' }, { id: 'a1', wbs_code: 'A.8', title: 'Dinding', quantity: 2, unit_price: 100 }];
    const info = legacyProjectInfo(project, rows, 'DETAIL');
    const view = legacyRABView(info, 'all');
    assert.ok(view.rows.some(row => row.code === 'S.1.1'));
    assert.ok(view.rows.some(row => row.code === 'A.8'));
    assert.equal(view.subtotal, 174.51 * 118377 + 2 * 125);
    assert.equal(view.rows.at(-1).rowIdx, view.rows.length + 6);
});

const { mergeRABDrafts } = load('lib/legacy-rab/editing.ts');
const { saveProjectRAB } = load('lib/api/projectRAB.ts');
test('edits including explicit zero survive rebuilding the new RAB', () => {
    const baseRows = legacyRABView(legacyProjectInfo(project, wbs, 'DETAIL'), 'all').rows;
    const nextMeta = mergeRABDrafts(project.meta, { 'S.1.1': { volume: '0', unitPrice: '0', title: 'Survey baru', unit: 'm' } }, baseRows, true);
    const view = legacyRABView(legacyProjectInfo({ ...project, meta: nextMeta }, wbs, 'DETAIL'), 'all');
    const row = view.rows.find(row => row.code === 'S.1.1');
    assert.equal(row.title, 'Survey baru');
    assert.equal(row.volume, 0);
    assert.equal(row.unitPrice, 0);
    assert.equal(row.total_price, 0);
});
test('invalid numeric edits and section edits cannot be saved', () => {
    const rows = legacyRABView(legacyProjectInfo(project, wbs, 'DETAIL'), 'all').rows;
    assert.throws(() => mergeRABDrafts(project.meta, { 'S.1.1': { volume: 'abc' } }, rows, true));
    assert.throws(() => mergeRABDrafts(project.meta, { S: { volume: '1' } }, rows, true));
    assert.throws(() => mergeRABDrafts(project.meta, { 'S.1.1': { unitPrice: '-1' } }, rows, true));
});
test('save merges fresh unrelated metadata and performs a guarded database update', async () => {
    writes = [];
    const currentMeta = { ...project.meta, documents: [{ id: 'keep-me' }] };
    responses = [{ data: { meta: currentMeta }, error: null }, { data: { id: 'ruby', meta: { ...currentMeta, saved: true } }, error: null }];
    const rows = legacyRABView(legacyProjectInfo(project, wbs, 'DETAIL'), 'all').rows;
    const saved = await saveProjectRAB('ruby', project.meta, { 'S.1.1': { volume: '200' } }, rows);
    assert.equal(saved.saved, true);
    assert.equal(writes[0].meta.documents[0].id, 'keep-me');
    assert.equal(writes[0].meta.estimateValues['S.1.1'].volume, 200);
    assert.equal(writes[1][0], 'meta');
    assert.equal(writes[1][2], JSON.stringify(currentMeta));
});
test('save rejects concurrent estimate edits without writing', async () => {
    writes = []; responses = [{ data: { meta: { estimateValues: { other: { volume: 5 } } } }, error: null }];
    await assert.rejects(() => saveProjectRAB('ruby', project.meta, {}, []), /another user/);
    assert.equal(writes.length, 0);
});
test('save never reports success if database update is denied', async () => {
    responses = [{ data: { meta: project.meta }, error: null }, { data: null, error: { message: 'permission denied' } }];
    const rows = legacyRABView(legacyProjectInfo(project, wbs, 'DETAIL'), 'all').rows;
    await assert.rejects(() => saveProjectRAB('ruby', project.meta, { 'S.1.1': { volume: '200' } }, rows), /permission denied/);
});
