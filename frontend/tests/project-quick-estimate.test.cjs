const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path');
function loader(mocks={}){const cache={};const load=file=>{file=path.resolve(file);if(cache[file])return cache[file];const exports={};cache[file]=exports;vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:name=>name in mocks?mocks[name]:load((name.startsWith('@/')?path.resolve(name.slice(2)):path.resolve(path.dirname(file),name))+'.ts')});return exports;};return load;}
const core=loader()('lib/projectQuickEstimate.ts');
const wbs=[{id:'s',wbs_code:'S',title:'Structure'},{id:'s1',parent_id:'s',wbs_code:'S.1',title:'Preparation'},{id:'s11',parent_id:'s1',wbs_code:'S.1.1',title:'Child should not appear'},{id:'a',wbs_code:'A',title:'Architecture'},{id:'a1',parent_id:'a',wbs_code:'A.1',title:'Wall'}];
const rows=core.quickEstimateRows(wbs);
function input(){return {...core.quickEstimateInput(null,rows),area:undefined,baseBudget:1000000,regionalFactor:1.2,difficultyFactor:1.1,percentages:{s:40,s1:100,a:60,a1:100}};}
function client(responses){const writes=[];const q={select(){return this;},eq(){return this;},filter(){return this;},is(){return this;},order(){return this;},range(){return this;},update(data){writes.push(data);return this;},single(){return Promise.resolve(responses.shift());},then(resolve,reject){return Promise.resolve(responses.shift()).then(resolve,reject);}};const api=loader({'@/lib/supabase':{supabase:{from:()=>q}}})('lib/api/projectQuickEstimate.ts');return {...api,writes};}
test('Quick Estimates keeps WBS at discipline and level 2 and calculates percentages without quantities',()=>{assert.equal(rows.length,4);assert.ok(!rows.some(row=>row.code==='S.1.1'));const value=input();assert.equal(core.validateQuickEstimate(value,rows),1320000);assert.equal(core.quickEstimateAmount(value,rows.find(row=>row.id==='s1')),528000);assert.equal(core.quickEstimateAmount(value,rows.find(row=>row.id==='a')),792000);});
test('percentage totals and factors are validated; defaults and template IDs remain stable',()=>{assert.throws(()=>core.validateQuickEstimate({...input(),percentages:{...input().percentages,s:70}},rows),/100%/);assert.throws(()=>core.validateQuickEstimate({...input(),difficultyFactor:0},rows),/valid location/);assert.throws(()=>core.validateQuickEstimate({...input(),baseBudget:1e308},rows));const fallback=core.quickEstimateRows([]);assert.equal(fallback[0].id,'template:S');assert.equal(fallback.find(row=>row.code==='S.1').parentId,'template:S');});
test('allocation follows stable IDs after WBS numbering changes',()=>{const renamed=core.quickEstimateRows(wbs.map(row=>({...row,wbs_code:row.id==='s1'?'S.9':row.wbs_code})));assert.equal(core.quickEstimateInput(input(),renamed).percentages.s,40);});
test('Quick Estimates saves independently from RAB prices and published versions',async()=>{const meta={estimateValues:{S:{volume:5,unitPrice:100}},wbsWorkflow:{versions:[{version:1,items:wbs}]},planningRevisions:{rab:{draft:false,versions:[{version:1}]}},other:'keep'};const c=client([{data:{meta}},{data:{meta:{saved:true}}}]);await c.saveProjectQuickEstimate('p',undefined,input());assert.equal(c.writes[0].meta.quickEstimate.total,1320000);assert.equal(c.writes[0].meta.estimateValues.S.unitPrice,100);assert.equal(c.writes[0].meta.planningRevisions.rab.versions[0].version,1);assert.equal(c.writes[0].meta.other,'keep');});
test('stale estimates, invalid allocations and denied writes fail without reporting success',async()=>{const invalid=client([{data:{meta:{wbsWorkflow:{versions:[{items:wbs}]}}}}]);await assert.rejects(invalid.saveProjectQuickEstimate('p',null,{...input(),baseBudget:-1}),/positive budget/);assert.equal(invalid.writes.length,0);const conflict=client([{data:{meta:{quickEstimate:{total:1}}}}]);await assert.rejects(conflict.saveProjectQuickEstimate('p',null,input()),/changed elsewhere/);assert.equal(conflict.writes.length,0);const denied=client([{data:{meta:{wbsWorkflow:{versions:[{items:wbs}]}}}},{error:{message:'Denied'}}]);await assert.rejects(denied.saveProjectQuickEstimate('p',null,input()),/Denied/);});
const {currencyWords}=loader()('lib/currencyWords.ts');
test('currency words cover English and Indonesian zero, irregular hundreds, thousands and fractions',()=>{assert.equal(currencyWords(0).en,'Zero rupiah');assert.equal(currencyWords(1100).id,'Seribu seratus rupiah');assert.equal(currencyWords(1250000000).en,'One billion two hundred fifty million rupiah');assert.equal(currencyWords(12.5).id,'Dua belas rupiah lima puluh sen');assert.equal(currencyWords(99.999).en,'One hundred rupiah');assert.equal(currencyWords(-1).id,'—');});

test('area, class and adjustment derive the budget using legacy per-m² prices',()=>{
 const value=core.quickEstimateInput({area:200,buildingClass:'C',adjustmentFactor:90,regionalFactor:0.99,difficultyFactor:1},rows);
 assert.equal(value.baseBudget,1012500000);assert.equal(core.validateQuickEstimate(value,rows),1002375000);
 assert.equal(core.quickRatePerM2('B',rows),7875000);assert.equal(core.QUICK_LEVELS.A,'Luxury');
});
test('server recomputes the budget instead of trusting the supplied amount',async()=>{
 const value={...input(),area:100,buildingClass:'C',adjustmentFactor:100,baseBudget:1};
 const c=client([{data:{meta:{wbsWorkflow:{versions:[{items:wbs}]}}}},{data:{meta:{saved:true}}}]);await c.saveProjectQuickEstimate('p',null,value);
 assert.equal(c.writes[0].meta.quickEstimate.baseBudget,562500000);assert.equal(c.writes[0].meta.quickEstimate.total,742500000);
});

test('legacy bilingual fallback never leaks the English name into ID',()=>{
 const translated=core.quickEstimateRows([{id:'s',wbs_code:'S',title:'Structure (Struktur)'},{id:'s1',parent_id:'s',wbs_code:'S.1',title:'Preparation (Persiapan)'}]);
 assert.equal(translated[0].title,'Structure');assert.equal(translated[0].titleId,'Struktur');assert.equal(translated[1].titleId,'Persiapan');
 const noTranslation=core.quickEstimateRows([{id:'s',wbs_code:'S',title:'Structure'}]);assert.equal(noTranslation[0].titleId,'');
});
test('Information fields prefill class, area and nested location',()=>{
 const value=core.quickEstimateInput({rabClass:'A',buildingArea:'1,500 m2',locationDetails:{province:'DKI Jakarta',city:'Jakarta Selatan'}},rows);
 assert.equal(value.area,1500);assert.equal(value.buildingClass,'A');assert.equal(value.location,'DKI Jakarta|Jakarta Selatan');assert.equal(value.regionalFactor,0.99);
});
test('manual amount and percentage rebalance siblings and propagate amounts to descendants',()=>{
 const allocationRows=[...rows,{id:'s2',code:'S.2',title:'Other',parentId:'s'}];
 const initial={...input(),baseBudget:1e9,regionalFactor:1,difficultyFactor:1,percentages:{s:50,a:50,s1:50,s2:50,a1:100}};
 const changed=core.changeQuickAllocation(initial,allocationRows,'s1',275000000,'amount');assert.equal(changed.s1,55);assert.equal(changed.s2,45);assert.equal(changed.s,50);assert.equal(initial.percentages.s1,50);
 const state={...initial,percentages:changed};assert.equal(core.quickEstimateAmount(state,allocationRows.find(row=>row.id==='s1')),275000000);
 const next={...state,percentages:core.changeQuickAllocation(state,allocationRows,'s',55,'percent')};assert.equal(next.percentages.a,45);assert.equal(core.quickEstimateAmount(next,allocationRows.find(row=>row.id==='s1')),302500000);assert.equal(core.validateQuickEstimate(next,allocationRows),1000000000);
 assert.throws(()=>core.changeQuickAllocation(state,allocationRows,'s1',600000000,'amount'),/parent budget/);assert.throws(()=>core.changeQuickAllocation(state,allocationRows,'a1',50,'percent'),/only item/);
});
test('manual bilingual names persist independently from WBS names',async()=>{
 const value={...input(),names:{s1:{en:'Custom preparation',id:'Persiapan khusus'}}};const c=client([{data:{meta:{wbsWorkflow:{versions:[{items:wbs}]}}}},{data:{meta:{saved:true}}}]);await c.saveProjectQuickEstimate('p',null,value);assert.equal(c.writes[0].meta.quickEstimate.names.s1.id,'Persiapan khusus');assert.equal(c.writes[0].meta.wbsWorkflow.versions[0].items[1].title,'Preparation');
});

test('Information city names resolve against legacy location factors without mixing city and regency',()=>{
 const city=core.quickEstimateInput({location:{province:'Jawa Barat',city:'Kota Bekasi'}},rows);assert.equal(city.location,'Jawa Barat|Bekasi Kota');assert.equal(city.regionalFactor,0.95);
 const regency=core.quickEstimateInput({location:JSON.stringify({province:'Jawa Barat',city:'Kabupaten Bekasi'})},rows);assert.equal(regency.location,'Jawa Barat|Bekasi Kab');
 const jakarta=core.quickEstimateInput({locationDetails:{province:'DKI Jakarta',city:'Kota Jakarta Timur'}},rows);assert.equal(jakarta.location,'DKI Jakarta|Jakarta Timur');assert.equal(jakarta.regionalFactor,0.96);
});
