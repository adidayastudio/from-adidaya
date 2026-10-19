const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path'), ts = require('typescript');
const cache = {};
function load(file) { file = path.resolve(file); if(cache[file]) return cache[file]; const exports={};cache[file]=exports;vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:name=>load(path.resolve(path.dirname(file),name)+'.ts')});return exports; }
const lib=load('lib/projectVolumeEditor.ts');
test('unit aliases choose dimensionally correct initial formulas',()=>{assert.equal(lib.defaultVolumeFormula('m1'),'LINE');assert.equal(lib.defaultVolumeFormula('m²'),'AREA');assert.equal(lib.defaultVolumeFormula('m3'),'BOX');assert.equal(lib.defaultVolumeFormula('pcs'),'MANUAL');});
test('legacy quantity becomes explicit manual value without invented dimensions',()=>{const draft=lib.loadVolumeDraft({code:'S.1.1',quantity:174.51,unit:'m1'},[],{});assert.equal(draft.rows[0].formula_type,'MANUAL');assert.equal(lib.volumeDraftTotal(draft.rows),174.51);assert.equal(draft.applied,174.51);assert.equal(draft.dirty,false);});
test('exact-code records win over compatibility aliases and notes reload by stable row ID',()=>{const calculations=[{id:'exact',wbs_code:'S.1.1',name:'North',formula_type:'AREA',parameters:{length:5,width:4,count:2}},{id:'alias',wbs_code:'1.1',name:'Wrong',formula_type:'MANUAL',parameters:{manualVolume:999}}];const draft=lib.loadVolumeDraft({code:'S.1.1',unit:'m2'},calculations,{estimateValues:{'S.1.1':{volume:0,unit:'m2',explicit:true}},volumeRowDetails:{exact:{notes:'Reference A'}}});assert.equal(draft.rows[0].id,'exact');assert.equal(lib.volumeDraftTotal(draft.rows),40);assert.equal(draft.applied,0);assert.equal(draft.rows[0].details.notes,'Reference A');assert.equal(draft.originalIds.length,1);});
test('zero quantity stays zero and incomplete or negative dimensions have no misleading total',()=>{const row={id:'r',name:'A',formula_type:'BOX',parameters:{length:2,width:3,height:4,count:0}};assert.equal(lib.volumeDraftTotal([row]),0);assert.equal(lib.volumeDraftTotal([{...row,parameters:{...row.parameters,height:NaN}}]),null);assert.equal(lib.volumeDraftTotal([{...row,parameters:{...row.parameters,width:-1}}]),null);});
test('mixed dimensional formulas cannot be applied to one item unit',()=>{const row={id:'r',name:'A',formula_type:'AREA',parameters:{length:2,width:3,count:1}};assert.equal(lib.volumeUnitMismatch({rows:[row],unit:'m3'}),true);assert.equal(lib.volumeUnitMismatch({rows:[row],unit:'m²'}),false);assert.equal(lib.volumeUnitMismatch({rows:[{...row,formula_type:'MANUAL',parameters:{manualVolume:3,count:1}}],unit:'pcs'}),false);});
test('top unit selection drives formulas and preserves quantity and notes',()=>{const draft=lib.loadVolumeDraft({code:'S.1.1',unit:'m1'},[],{});draft.rows[0].parameters.count=3;draft.rows[0].details={notes:'Keep'};const next=lib.setVolumeItemUnit(draft,'m2');assert.equal(next.unit,'m²');assert.equal(next.rows[0].formula_type,'AREA');assert.equal(next.rows[0].parameters.count,3);assert.equal(next.rows[0].details.notes,'Keep');assert.equal(next.dirty,true);assert.equal(draft.unit,'m');assert.equal(lib.setVolumeItemUnit(next,'m3').rows[0].formula_type,'BOX');const manual=lib.applyVolumeFormula(next,next.rows[0].id,'MANUAL');assert.equal(manual.unit,'m²');assert.equal(manual.rows[0].formula_type,'MANUAL');});

test('volume status distinguishes untouched inputs, pending calculations and applied values including zero',()=>{
 const blank=lib.loadVolumeDraft({code:'S.1',unit:'m2'},[],{});
 assert.equal(lib.volumeDraftStatus(blank),'Not calculated');
 assert.equal(lib.volumeDraftStatus({...blank,dirty:true}),'Not calculated');
 const entered={...blank,dirty:true,rows:[{...blank.rows[0],parameters:{length:2,width:3,count:0}}]};
 assert.equal(lib.volumeDraftStatus(entered),'Unsaved');
 assert.equal(lib.volumeDraftStatus({...entered,calculated:true,dirty:false,applied:0}),'Saved');
 assert.equal(lib.volumeDraftStatus({...entered,calculated:true}),'Unsaved');
});
