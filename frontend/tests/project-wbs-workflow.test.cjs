const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
function load(file, mocks = {}) { const exports = {}; vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports, require: name => { if (name in mocks) return mocks[name]; throw new Error(name); } }); return exports; }
const core = load('lib/projectWBSWorkflow.ts');
const revisions = load('lib/projectPlanningRevisions.ts', { './projectWBSWorkflow': core });
const items = [{ id: 's', wbs_code: 'S', title: 'Structure' }, { id: 's1', parent_id: 's', wbs_code: 'S.1', title: 'Preparation' }];
test('template -> saved draft -> save changes -> submit v1 -> revision draft -> submit v2 preserves v1', () => {
 let state = core.readWBSWorkflow({}); state = core.nextWBSWorkflow(state, items, false); assert.equal(state.versions.length, 0); assert.equal(state.draft.items[1].title, 'Preparation');
 const edited = items.map(item => ({ ...item, title: item.title + ' edited' })); state = core.nextWBSWorkflow(state, edited, false); assert.equal(state.versions.length, 0);
 state = core.nextWBSWorkflow(state, edited, true); assert.equal(state.draft, null); assert.equal(state.versions[0].version, 1);
 state = core.nextWBSWorkflow(state, items, false); assert.equal(state.versions[0].items[1].title, 'Preparation edited'); assert.equal(state.draft.baseVersion, 1);
 state = core.nextWBSWorkflow(state, items, true); assert.equal(state.versions.length, 2); assert.equal(state.versions[1].version, 2); assert.equal(state.versions[0].items[1].title, 'Preparation edited');
});
test('published WBS ignores revision draft while retaining live volume values', () => {
 let state = core.nextWBSWorkflow(core.readWBSWorkflow({}), items, true); state = core.nextWBSWorkflow(state, [{ ...items[0], title: 'Draft name' }], false);
 const result = core.publishedWBSRows({ wbsWorkflow: state }, [{ ...items[0], title: 'Other name', quantity: 7, unit: 'm2' }]); assert.equal(result[0].title, 'Structure'); assert.equal(result[0].quantity, 7);
});
test('legacy submitted snapshot is preserved and invalid hierarchy cannot submit', () => {
 assert.equal(core.readWBSWorkflow({ wbsSubmission: { version: 3, items } }).versions[0].version, 3);
 assert.throws(() => core.nextWBSWorkflow({ versions: [], draft: null }, [{ ...items[0], parent_id: 'missing' }], true), /missing parent/);
});
function api(responses) {
 const writes = [], sync = [];
 const query = { select() { return this; }, eq() { return this; }, is() { return this; }, filter() { return this; }, order() { return this; }, range() { return this; }, update(data) { writes.push(data); return this; }, single() { return Promise.resolve(responses.shift()); }, then(resolve, reject) { return Promise.resolve(responses.shift()).then(resolve, reject); } };
 const module = load('lib/api/projectWBSWorkflow.ts', { '@/lib/supabase': { supabase: { from: () => query } }, '@/lib/projectWBSWorkflow': core, '@/lib/projectPlanningRevisions': revisions, './projectWBSStructure': { synchronizeWBSStructure: async (_, rows, items) => [...rows, ...items.filter(item => !rows.some(row => row.id === item.id))] }, './projectWBS': { saveProjectWBS: async (...args) => sync.push(args) } }); return { ...module, writes, sync };
}
test('Save Draft writes only draft metadata and preserves unrelated fields', async () => {
 const state = core.nextWBSWorkflow(core.readWBSWorkflow({}), items, false);
 const client = api([{ data: { meta: { preserve: 1 } } }, { data: { meta: { wbsWorkflow: state } } }]); await client.persistWBSWorkflow('p', null, items, false);
 assert.equal(client.sync.length, 0); assert.equal(client.writes[0].meta.preserve, 1); assert.equal(client.writes[0].meta.wbsWorkflow.versions.length, 0);
});
test('Submit synchronizes new work before publishing version metadata', async () => {
 const state = core.nextWBSWorkflow(core.readWBSWorkflow({}), items, true);
 const client = api([{ data: { meta: {} } }, { data: [items[0]] }, { data: { meta: { wbsWorkflow: state } } }]); await client.persistWBSWorkflow('p', null, items, true);
 assert.equal(client.sync.length, 1); assert.equal(client.sync[0][1][1].id, 's1'); assert.equal(client.writes[0].meta.wbsWorkflow.versions[0].version, 1);
});
test('concurrent workflow and denied writes do not report success', async () => {
 const conflict = api([{ data: { meta: { wbsWorkflow: { changed: true } } } }]); await assert.rejects(conflict.persistWBSWorkflow('p', null, items, false), /changed elsewhere/); assert.equal(conflict.writes.length, 0);
 const denied = api([{ data: { meta: {} } }, { data: null, error: { message: 'Denied' } }]); await assert.rejects(denied.persistWBSWorkflow('p', null, items, false), /Denied/);
});
