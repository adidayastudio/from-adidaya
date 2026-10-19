const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
let responses = [], calls = [];
const client = { from(table) {
    calls.push(['from', table]);
    const q = { then: (resolve, reject) => Promise.resolve(responses.shift()).then(resolve, reject), single: async () => responses.shift() };
    for (const method of ['select', 'eq', 'is', 'filter', 'delete', 'in', 'upsert', 'update']) q[method] = (...args) => { calls.push([method, ...args]); return q; };
    return q;
} };
const cache = new Map();
function load(file) {
    file = path.resolve(file.endsWith('.ts') ? file : `${file}.ts`);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    vm.runInNewContext(output, { module, exports: module.exports, require: spec => spec === '@/lib/supabase' ? { supabase: client } : load(spec.startsWith('@/') ? spec.slice(2) : path.resolve(path.dirname(file), spec)) });
    return module.exports;
}
const { saveProjectVolume } = load('lib/api/projectVolume');
const row = { id: 'stable-id', name: 'Main Calculation', formula_type: 'LINE', parameters: { length: 174.51, count: 1 } };
test('volume save keeps IDs, removes only specified rows and applies full-code RAB/WBS updates', async () => {
    calls = [];
    responses = [
        { data: { meta: { documents: [{ id: 'keep' }], estimateValues: { 'S.1.1': { unitPrice: 118377 } } } }, error: null },
        { error: null }, { error: null }, { data: { id: 'project' }, error: null }, { data: [{ id: 'wbs' }], error: null },
    ];
    const result = await saveProjectVolume('project', 'S.1.1', 'm¹', [row], ['removed-id']);
    assert.equal(result.total, 174.51);
    assert.equal(result.records[0].id, 'stable-id');
    assert.equal(result.meta.documents[0].id, 'keep');
    assert.equal(result.meta.estimateValues['S.1.1'].unitPrice, 118377);
    assert.equal(result.meta.estimateValues['S.1.1'].volume, 174.51);
    assert.equal(result.meta.estimateValues['1.1'], undefined);
    assert.ok(calls.some(call => call[0] === 'in' && call[1] === 'id' && call[2][0] === 'removed-id'));
    assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'wbs_code' && call[2] === 'S.1.1'));
});
test('denied calculation save stops before RAB or WBS mutations', async () => {
    calls = []; responses = [{ data: { meta: {} }, error: null }, { error: { message: 'permission denied' } }];
    await assert.rejects(() => saveProjectVolume('project', 'S.1.1', 'm¹', [row], []));
    assert.equal(calls.filter(call => call[0] === 'update').length, 0);
});
test('partial synchronization errors are reported and never returned as success', async () => {
    responses = [{ data: { meta: {} }, error: null }, { error: null }, { data: null, error: { message: 'conflict' } }];
    await assert.rejects(() => saveProjectVolume('project', 'S.1.1', 'm¹', [row], []), /Calculations saved, but RAB was not updated/);
});
test('calculation notes persist as project metadata and never become unsupported table columns',async()=>{
 calls=[];responses=[{data:{meta:{other:'keep'}},error:null},{error:null},{data:{id:'project'},error:null},{data:[{id:'wbs'}],error:null}];
 const result=await saveProjectVolume('project','S.1.1','m',[{...row,details:{notes:'Drawing A-01'}}],[]);
 const record=calls.find(call=>call[0]==='upsert')[1][0];assert.equal(record.details,undefined);assert.equal(result.meta.volumeRowDetails['stable-id'].notes,'Drawing A-01');assert.equal(result.meta.other,'keep');
});
test('empty row descriptions are rejected before any database access',async()=>{calls=[];await assert.rejects(saveProjectVolume('p','S.1.1','m',[{...row,name:' '}],[]),/description/);assert.equal(calls.length,0);});
test('published Volume rejects edits before mutating calculations',async()=>{
 calls=[]; responses=[{data:{meta:{planningRevisions:{volume:{draft:false,versions:[{version:1}]}}}}}];
 await assert.rejects(saveProjectVolume('p','S.1.1','m',[row],[]),/Add a revision/);
 assert.equal(calls.filter(call=>call[0]==='upsert'||call[0]==='update').length,0);
});
test('saving a Volume revision retains published RAB and flags its stable item for review',async()=>{
 const previous={version:1,snapshot:{meta:{estimateValues:{'S.1.1':{volume:1}}}}};
 const meta={wbsWorkflow:{versions:[{version:1,items:[{id:'work-id',wbs_code:'S.1.1',title:'Work'}]}]},planningRevisions:{volume:{draft:true,versions:[]},rab:{draft:false,versions:[previous]}}};
 calls=[];responses=[{data:{meta}},{error:null},{data:{id:'p'}},{data:[{id:'work-id'}]}];
 const result=await saveProjectVolume('p','S.1.1','m',[row],[]);
 assert.equal(result.meta.planningRevisions.rab.draft,true);
 assert.equal(result.meta.planningRevisions.rab.versions[0].snapshot.meta.estimateValues['S.1.1'].volume,1);
 assert.equal(result.meta.planningImpact.items[0].id,'work-id');assert.equal(result.meta.planningImpact.items[0].rabReview,true);
});
