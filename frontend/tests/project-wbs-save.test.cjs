const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
function client(responses) {
 const writes = [], filters = [];
 const chain = { select() { return this; }, eq(...args) { filters.push(args); return this; }, is(...args) { filters.push(args); return this; }, filter(...args) { filters.push(args); return this; }, order() { return this; }, range() { return this; }, upsert(value) { writes.push(value); return this; }, update(value) { writes.push(value); return this; }, single() { return Promise.resolve(responses.shift()); }, then(resolve, reject) { return Promise.resolve(responses.shift()).then(resolve, reject); } };
 const exports = {};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/api/projectWBS.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports, require: () => ({ supabase: { from: () => chain } }) });
 return { ...exports, writes, filters };
}
const rows = [{ id: 'one', wbs_code: 'S.1', title: 'Original', title_en: 'Asli', quantity: 174.51, unit: 'm1' }], drafts = { one: { title: 'Updated', title_en: 'Baru' } };
test('inline save updates names with project and original-value guards; no volume writes', async () => {
 const api = client([{ data: { id: 'one' } }]); await api.saveProjectWBS('p', rows, drafts);
 assert.equal(api.writes[0].title, 'Updated'); assert.equal(api.writes[0].quantity, undefined); assert.ok(api.filters.some(item => item[0] === 'project_id' && item[1] === 'p')); assert.ok(api.filters.some(item => item[0] === 'title' && item[1] === 'Original'));
});
test('submit persists versioned database snapshot while retaining other project metadata', async () => {
 const api = client([{ data: { id: 'one' } }, { data: { meta: { preserve: 1, wbsSubmission: { version: 2 } } } }, { data: [{ ...rows[0], ...drafts.one }] }, { data: { meta: { wbsSubmission: { version: 3 } } } }]);
 const saved = await api.saveProjectWBS('p', rows, drafts, true); assert.equal(saved.version, 3); assert.equal(api.writes[1].meta.preserve, 1); assert.equal(api.writes[1].meta.wbsSubmission.items[0].title, 'Updated');
});
test('invalid names are blocked before writes and denied updates do not submit', async () => {
 const invalid = client([]); await assert.rejects(invalid.saveProjectWBS('p', rows, { one: { title: '', title_en: '' } }), /English/); assert.equal(invalid.writes.length, 0);
 const denied = client([{ data: null, error: { message: 'Denied' } }, { data: rows[0] }]); await assert.rejects(denied.saveProjectWBS('p', rows, drafts, true), /Submission not completed/); assert.equal(denied.writes.length, 1);
});
test('retry accepts an identical already-saved row after partial failure', async () => {
 const api = client([{ data: null }, { data: drafts.one }]); await assert.doesNotReject(api.saveProjectWBS('p', rows, drafts));
});

test('bilingual names initialize from legacy parentheses and keep explicit translations', () => {
 const exports = {}; vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/projectWBSNames.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });
 const split = exports.splitWBSNames;
 assert.equal(split({ title: 'Structure (Struktur)' }).title, 'Structure');
 assert.equal(split({ title: 'Structure (Struktur)' }).title_en, 'Struktur');
 assert.equal(split({ title: 'Preparation (Persiapan)', title_en: 'Custom' }).title_en, 'Custom');
 assert.equal(split({ title: 'Interior' }).title, 'Interior');
});
test('add task and nested subtask assign stable unique codes and correct parent IDs', () => {
 const exports = {}; vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/projectWBSNames.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });
 const root = { id: 's', wbs_code: 'S', level: 0 }, group = { id: 's1', wbs_code: 'S.1', parent_id: 's', level: 1 };
 const a = exports.newWBSWork([root, group], group, true, 'a'); assert.equal(a.wbs_code, 'S.1.1'); assert.equal(a.parent_id, 's1');
 const b = exports.newWBSWork([root, group, a], a, true, 'b'); assert.equal(b.wbs_code, 'S.1.1.1'); assert.equal(b.parent_id, 'a');
 const c = exports.newWBSWork([root, group, a, b], a, false, 'c'); assert.equal(c.wbs_code, 'S.1.2'); assert.equal(c.parent_id, 's1');
});
test('missing legacy descendants are filled from saved hierarchy without replacing project names', () => {
 const catalog = {}, exports = {};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/legacy-rab/wbs-estimates.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: catalog });
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/projectWBSHierarchy.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, require: () => catalog });
 let id = 0; const rows = [{ id: 's', wbs_code: 'S', title: 'Custom Structure' }, { id: 's1', parent_id: 's', wbs_code: 'S.1', level: 1 }];
 const fallback = exports.missingLegacyWBS(rows, {}, () => `id${++id}`); assert.ok(fallback.some(row => row.wbs_code === 'S.1.1')); assert.equal(fallback[0].parent_id, 's1');
 const saved = exports.missingLegacyWBS(rows, { wbsTree: [{ code: 'S', children: [{ code: 'S.1', children: [{ code: 'S.1.99', nameEn: 'Custom Legacy Leaf' }] }] }] }, () => `id${++id}`);
 assert.equal(saved.length, 1); assert.equal(saved[0].title, 'Custom Legacy Leaf');
});
test('new work is persisted before its parent leaf flag is cleared', async () => {
 const row = { id: 'new', wbs_code: 'S.1.1', parent_id: 'one', title: 'Child', title_en: '', level: 2 };
 const api = client([{ data: { id: 'new' } }, { data: { id: 'one' } }]); await api.saveProjectWBS('p', rows, {}, false, [row]);
 assert.equal(api.writes[0].project_id, 'p'); assert.equal(api.writes[0].parent_id, 'one'); assert.equal(api.writes[1].is_leaf, false);
});
