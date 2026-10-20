const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path');
function loader(mocks={}){const cache={};const load=file=>{file=path.resolve(file);if(cache[file])return cache[file];const exports={};cache[file]=exports;vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:name=>name in mocks?mocks[name]:load((name.startsWith('@/')?path.resolve(name.slice(2)):path.resolve(path.dirname(file),name))+'.ts')});return exports;};return load;}

const {buildTrackingItems}=loader()('lib/projectWBSTracking.ts');
const wbs=[{id:'root',wbs_code:'S',title:'Structure',position:1,is_leaf:false},{id:'group',parent_id:'root',wbs_code:'S.1',title:'Preparation',position:1,is_leaf:false},{id:'one',parent_id:'group',wbs_code:'S.1.1',title:'Survey',title_en:'Pengukuran',position:1,is_leaf:true,quantity:2,unit:'m'},{id:'two',parent_id:'group',wbs_code:'S.1.2',title:'Clearing',position:2,is_leaf:true,quantity:1,unit:'m²'}];
const project={id:'p',meta:{estimateValues:{'S.1.1':{volume:2,unit:'m',unitPrice:100},'S.1.2':{volume:1,unit:'m²',unitPrice:300}},scheduleValues:{'S.1.1':{start:'2026-10-01',duration:2},'S.1.2':{start:'2026-10-03',duration:2}}}};
test('tracking preserves WBS parent-first hierarchy and never generates legacy duplicates',()=>{
const rows=buildTrackingItems(project,wbs);assert.deepEqual(Array.from(rows,x=>x.code),['S','S.1','S.1.1','S.1.2']);assert.equal(rows[2].titleEn,'Survey');assert.equal(rows[2].titleId,'Pengukuran');assert.equal(rows[2].level,2);assert.equal(buildTrackingItems(project,[]).length,0);
});
test('tracking joins saved RAB and Schedule, with cost weighted parent progress',()=>{
const rows=buildTrackingItems(project,wbs,{one:{constProgress:50},two:{constProgress:100}});assert.equal(rows[2].cost,200);assert.equal(rows[2].weight,40);assert.equal(rows[0].cost,500);assert.equal(rows[0].constProgress,80);assert.equal(rows[0].startDate,'2026-10-01');assert.equal(rows[0].finishDate,'2026-10-04');
});
test('stable IDs retain progress across WBS code changes and excluded RAB items have no weight',()=>{
const changed=wbs.map(row=>({...row,wbs_code:row.wbs_code.replace('S','A')}));assert.equal(buildTrackingItems(project,changed,{one:{constProgress:40}})[2].constProgress,40);
const rows=buildTrackingItems({...project,meta:{...project.meta,rabExcludedIds:['two']}},wbs);assert.equal(rows[3].cost,0);assert.equal(rows[3].weight,0);assert.equal(rows[2].weight,100);
});
