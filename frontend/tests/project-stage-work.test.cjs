const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
function loader(mocks = {}) {
 const cache = {};
 function load(file) {
  file = path.resolve(file); if (cache[file]) return cache[file];
  const exports = {}; cache[file] = exports;
  const req = name => { if (name in mocks) return mocks[name]; let target = name.startsWith('@/') ? path.resolve(name.slice(2)) : path.resolve(path.dirname(file), name); if (!fs.existsSync(target + '.ts')) target += '/index'; return load(target + '.ts'); };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports, require: req }); return exports;
 }
 return load;
}
const load = loader(), lib = load('lib/legacy-stages/layout.ts');
test('all seven legacy stage catalogs retain bilingual work and exact KO values', () => {
 assert.equal(lib.LEGACY_STAGE_KEYS.length, 7);
 for (const stage of lib.LEGACY_STAGE_KEYS) { const value = lib.buildStageWorkLayout(stage, []); assert.ok(value.sections.length); assert.ok(value.tasks.length); lib.validateStageLayout(value); }
 const ko = lib.buildStageWorkLayout('KO', []); assert.equal(ko.sections[0].weight, 30); assert.equal(ko.tasks[0].name, 'Cover'); assert.equal(ko.tasks[0].nameId, 'Sampul'); assert.equal(ko.tasks[0].weight, 4);
});
test('project records overlay defaults, preserve extra work and saved layouts win', () => {
 const value = lib.buildStageWorkLayout('KO', [{ id: 'db-cover', stage_code: '01-KO', section_code: 'KO-01', code: '01-01', name: 'Custom Cover', weight: 0, priority: 'high' }, { id: 'extra', stage_code: 'KO', name: 'Extra' }]);
 assert.equal(value.tasks.find(task => task.id === 'db-cover').weight, 0); assert.equal(value.tasks.find(task => task.id === 'db-cover').name, 'Custom Cover'); assert.ok(value.tasks.some(task => task.id === 'extra'));
 const saved = { sections: [], tasks: [] }; assert.equal(lib.buildStageWorkLayout('KO', [], saved).tasks.length, 0);
});
test('subtree deletion and renumber preserve nested work ordering', () => {
 const tasks = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B', parentId: 'a' }, { id: 'c', name: 'C', parentId: 'b' }, { id: 'd', name: 'D' }];
 assert.equal(lib.removeStageTask(tasks, 'a').length, 1);
 assert.equal(lib.renumberStageTasks(tasks, 'KO-01')[2].code, '01-01-01-01');
});
test('invalid hierarchies, negative weights and empty names cannot be saved', () => {
 const layout = lib.buildStageWorkLayout('KO', []);
 assert.throws(() => lib.validateStageLayout({ ...layout, tasks: [{ ...layout.tasks[0], parentId: 'missing' }] }), /parent/);
 assert.throws(() => lib.validateStageLayout({ ...layout, tasks: [{ ...layout.tasks[0], weight: -1 }] }), /weights/);
 assert.throws(() => lib.validateStageLayout({ ...layout, tasks: [{ ...layout.tasks[0], name: '' }] }), /English/);
});
test('CSV exports bilingual fields and escapes spreadsheet formulas and quotes', () => {
 const layout = lib.buildStageWorkLayout('KO', []); layout.tasks[0].name = '=SUM(1,2)'; layout.tasks[0].nameId = 'A "quoted" name';
 const csv = lib.stageWorkCSV(layout); assert.ok(csv.includes("\"'=SUM(1,2)\"")); assert.ok(csv.includes('A ""quoted"" name')); assert.ok(csv.includes('Task (ID)'));
});
function api(responses) {
 const writes = [], filters = [];
 const chain = { select() { return this; }, eq() { return this; }, is(...args) { filters.push(args); return this; }, filter(...args) { filters.push(args); return this; }, update(value) { writes.push(value); return this; }, async single() { return responses.shift(); } };
 const module = loader({ '@/lib/supabase': { supabase: { from: () => chain } } })('lib/api/projectStageWork.ts'); return { ...module, writes, filters };
}
test('save preserves other metadata, adds revision and uses compare-and-swap', async () => {
 const layout = lib.buildStageWorkLayout('KO', []), meta = { unrelated: 42 };
 const client = api([{ data: { meta } }, { data: { meta: { ...meta, stageWorkLayouts: { KO: layout } } } }]);
 await client.saveStageWorkLayout('project', 'KO', layout, null, true);
 assert.equal(client.writes[0].meta.unrelated, 42); assert.equal(client.writes[0].meta.stageWorkRevisions.KO[0].version, 1); assert.equal(client.filters[0][0], 'meta');
});
test('concurrent changes and denied writes report failure', async () => {
 const layout = lib.buildStageWorkLayout('KO', []);
 const conflict = api([{ data: { meta: { stageWorkLayouts: { KO: layout } } } }]);
 await assert.rejects(conflict.saveStageWorkLayout('p', 'KO', layout, null), /another user/); assert.equal(conflict.writes.length, 0);
 const denied = api([{ data: { meta: null } }, { data: null, error: { message: 'Permission denied' } }]);
 await assert.rejects(denied.saveStageWorkLayout('p', 'KO', layout, null), /Permission denied/);
});
test('PDF HTML escapes work names and XLS rows preserve numeric weights', () => {
 const layout = lib.buildStageWorkLayout('KO', []); layout.tasks[0].name = '<script>bad</script>';
 const html = lib.stageWorkHTML(layout, 'A & B'); assert.ok(html.includes('A &amp; B')); assert.ok(!html.includes('<script>')); assert.ok(html.includes('&lt;script&gt;'));
 const xlsx = require('xlsx'), workbook = xlsx.utils.book_new(); xlsx.utils.book_append_sheet(workbook, xlsx.utils.aoa_to_sheet(lib.stageWorkRows(layout)), 'KO');
 const restored = xlsx.read(xlsx.write(workbook, { type: 'buffer', bookType: 'biff8' }));
 assert.equal(restored.Sheets.KO.F2.v, 4); assert.equal(restored.Sheets.KO.D2.v, '<script>bad</script>');
});
