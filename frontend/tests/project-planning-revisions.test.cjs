const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript'), path = require('node:path');
function loader(mocks = {}) {
 const cache = {};
 const load = file => { file = path.resolve(file); if (cache[file]) return cache[file]; const exports = {}; cache[file] = exports; vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports, require: name => name in mocks ? mocks[name] : load((name.startsWith('@/') ? path.resolve(name.slice(2)) : path.resolve(path.dirname(file), name)) + '.ts') }); return exports; }; return load;
}
const core = loader()('lib/projectPlanningRevisions.ts');
const wbs = [{ id: 'd', wbs_code: 'S', title: 'Structure' }, { id: 'a', wbs_code: 'S.1', title: 'Concrete', parent_id: 'd', unit: 'm³' }];
const base = () => ({ preserve: 'keep', rabClass: 'A', wbsWorkflow: { draft: null, versions: [{ version: 1, items: wbs }] }, estimateValues: { 'S.1': { volume: 4, unit: 'm³', explicit: true, unitPrice: 100 } } });
test('rename and reorder use stable IDs and do not require arithmetic review', () => {
 const next = wbs.map(row => ({ ...row, wbs_code: row.id === 'a' ? 'A.4' : row.wbs_code, title: row.title + ' renamed', position: 3 }));
 assert.equal(core.wbsPlanningImpact(wbs, next).length, 0);
});
test('add, remove, unit and leaf-to-parent changes identify affected stable IDs', () => {
 const next = [{ ...wbs[0] }, { ...wbs[1], unit: 'm²' }, { id: 'b', wbs_code: 'S.2', title: 'New', parent_id: 'd', unit: 'm' }];
 assert.equal(core.wbsPlanningImpact(wbs, next).find(row => row.id === 'a').kind, 'unit');
 assert.equal(core.wbsPlanningImpact(wbs, next).find(row => row.id === 'b').kind, 'added');
 assert.equal(core.wbsPlanningImpact(wbs, [wbs[0]])[0].kind, 'removed');
 assert.ok(core.wbsPlanningImpact(wbs, [...wbs, { id: 'b', parent_id: 'a', wbs_code: 'S.1.1', title: 'Child' }]).some(row => row.id === 'a' && row.kind === 'structure'));
});
test('WBS revisions retain unresolved reviews across renumbering and start downstream drafts', () => {
 const meta = core.applyWBSPlanningRevision(base(), wbs, [{ ...wbs[0] }, { ...wbs[1], unit: 'm²' }], 2);
 const again = core.applyWBSPlanningRevision(meta, wbs, [{ ...wbs[0] }, { ...wbs[1], wbs_code: 'S.9' }], 3);
 assert.equal(again.planningImpact.items[0].code, 'S.9'); assert.equal(again.planningImpact.items[0].volumeReview, true);
 assert.equal(core.planningRevision(again, 'rab').draft, true);
 assert.equal(meta.planningImpact.items[0].code, 'S.1');
});
test('published Volume and RAB snapshots retain source versions and cannot be overwritten', () => {
 let meta = core.publishPlanningRevision(base(), 'volume', wbs, []);
 const v1 = JSON.stringify(meta.planningRevisions.volume.versions[0]);
 assert.equal(meta.planningRevisions.volume.draft, false);
 assert.throws(() => core.publishPlanningRevision(meta, 'volume', wbs, []), /Start a revision/);
 meta = core.publishPlanningRevision(meta, 'rab', wbs, []);
 assert.equal(meta.planningRevisions.rab.versions[0].volumeVersion, 1);
 assert.equal(meta.planningRevisions.rab.versions[0].snapshot.meta.rabClass, 'A');
 meta.planningRevisions.volume.draft = true;
 meta.estimateValues['S.1'].volume = 8;
 meta = core.publishPlanningRevision(meta, 'volume', wbs, []);
 assert.equal(meta.planningRevisions.volume.versions[1].version, 2);
 assert.equal(JSON.stringify(meta.planningRevisions.volume.versions[0]), v1);
 assert.equal(meta.planningRevisions.rab.versions[0].snapshot.meta.estimateValues['S.1'].volume, 4);
 assert.equal(meta.planningRevisions.rab.draft, true);
});
test('publication waits for affected-item reviews and the current published Volume', () => {
 let meta = core.applyWBSPlanningRevision(base(), wbs, [{ ...wbs[0] }, { ...wbs[1], unit: 'm²' }], 2);
 assert.throws(() => core.publishPlanningRevision(meta, 'volume', wbs, []), /Review all/);
 meta = core.resolvePlanningImpact(meta, 'volume', 'a');
 assert.equal(meta.planningImpact.items[0].rabReview, true);
 assert.throws(() => core.publishPlanningRevision(meta, 'rab', wbs, []), /Review all/);
 meta = core.resolvePlanningImpact(meta, 'rab', 'a');
 assert.throws(() => core.publishPlanningRevision(meta, 'rab', wbs, []), /Publish the current Volume/);
});
function api(responses) {
 const writes = [], calls = [];
 const q = { select(){return this;}, eq(){return this;}, filter(){return this;}, is(){return this;}, order(){return this;}, range(){return this;}, update(data){writes.push(data);return this;}, single(){return Promise.resolve(responses.shift());}, then(resolve,reject){return Promise.resolve(responses.shift()).then(resolve,reject);} };
 const load = loader({ '@/lib/supabase': { supabase: { from(table){calls.push(table);return q;} } } });
 return { ...load('lib/api/projectPlanningRevisions.ts'), writes, calls };
}
test('review cannot bypass Volume save or upstream review; denied metadata writes fail', async () => {
 const meta = core.applyWBSPlanningRevision(base(), wbs, [{ ...wbs[0] }, { ...wbs[1], unit: 'm²' }], 2);
 const rab = api([{ data: { meta } }]); await assert.rejects(rab.persistPlanningRevision('p','rab','review','a'), /Volume first/); assert.equal(rab.writes.length,0);
 const volume = api([{data:{meta}},{data:[{...wbs[1],unit:'m²',is_leaf:true}]}]); await assert.rejects(volume.persistPlanningRevision('p','volume','review','a'), /Save a calculation/);
 const denied = api([{data:{meta:base()}},{data:null,error:{message:'Denied'}}]); await assert.rejects(denied.persistPlanningRevision('p','volume','start'),/Denied/);
 assert.equal(denied.writes[0].meta.preserve,'keep');
});
test('publishing rejects untouched work and permits explicitly saved zero volume', async () => {
 const blank = base(); delete blank.estimateValues;
 const empty = api([{data:{meta:blank}},{data:wbs},{data:[]}]);
 await assert.rejects(empty.persistPlanningRevision('p','volume','publish'),/Calculate and save S.1/); assert.equal(empty.writes.length,0);
 const meta = base(); meta.estimateValues['S.1'].volume=0;
 const saved = api([{data:{meta}},{data:wbs},{data:[]},{data:{meta:{published:true}}}]);
 await saved.persistPlanningRevision('p','volume','publish');
 assert.equal(saved.writes[0].meta.planningRevisions.volume.versions[0].snapshot.meta.estimateValues['S.1'].volume,0);
});
test('publishing cannot mistake a partial calculation save for an applied RAB volume', async () => {
 const meta=base();
 const calcs=[{id:'c',wbs_code:'S.1',name:'Changed',formula_type:'BOX',parameters:{length:2,width:2,height:2,count:1}}];
 const client=api([{data:{meta}},{data:wbs},{data:calcs}]);
 await assert.rejects(client.persistPlanningRevision('p','volume','publish'),/Save S.1 again/);
 assert.equal(client.writes.length,0);
});
