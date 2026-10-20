const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path');
function loader(mocks={}){const cache={};const load=file=>{file=path.resolve(file);if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));if(cache[file])return cache[file];const exports={};cache[file]=exports;vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{exports,require:name=>name in mocks?mocks[name]:load((name.startsWith('@/')?path.resolve(name.slice(2)):path.resolve(path.dirname(file),name))+(name.endsWith('.json')?'':'.ts'))});return exports;};return load;}
const core=loader()('lib/projectRegisterV3.ts');
const add=(state=core.emptyRegister(),title='Foundation',id='one')=>core.addRegisterItem(state,'ED','S','01',title,id);
test('seven stages and twelve categories follow supplied master; E/P stay under MEP',()=>{
assert.equal(core.REGISTER_STAGES.map(x=>x.code).join(','),'KO,SD,DD,ED,PR,CN,HO');assert.equal(core.REGISTER_CATEGORIES.map(x=>x.code).join(','),'G,X,D,A,S,M,I,L,V,B,T,R');assert.equal(core.registerGroups('S',core.emptyRegister(),'ED').length,10);assert.equal(core.registerGroups('X',core.emptyRegister(),'ED').length,0);
});
test('register starts empty without importing legacy entries or draft master examples',()=>{
assert.equal(core.readRegisterV3({documents:[{code:'01'}],stageWorkLayouts:{KO:{}}}).items.length,0);assert.ok(core.REGISTER_EXAMPLES.length>30);
});
test('sequence zero pads per stage/category/group and cannot exceed 99',()=>{
let state=add();state=add(state,'Detail','two');state=core.addRegisterItem(state,'ED','E','01','Lighting','three');assert.equal(state.items.map(x=>x.code).join(','),'EDS-01-01,EDS-01-02,EDE-01-01');for(let i=3;i<=99;i++)state=add(state,'Sheet '+i,'item-'+i);assert.throws(()=>add(state),/99/);assert.throws(()=>core.addRegisterItem(state,'ED','S','100','Bad','bad'),/group/);
});
test('project-specific groups 10–99 are allowed; codes and master group meanings stay stable',()=>{
let state=core.addRegisterGroup(core.emptyRegister(),'ED','S','10','Retaining Walls');assert.ok(core.registerGroups('S',state,'ED').some(x=>x.code==='10'));assert.throws(()=>core.addRegisterGroup(state,'ED','S','01','Rename'),/exists/);state=core.addRegisterGroup(state,'KO','X','01','Client brief');assert.equal(core.registerGroups('X',state,'SD').length,0);
});
test('published snapshots stay immutable while a new revision is edited',()=>{
let state=add();state=core.updateRegisterItem(state,{...state.items[0],status:'Approved',url:'https://example.org/foundation-r00.pdf'});state=core.publishRegisterItem(state,'one','rev0','2026-10-21T10:00:00Z');assert.equal(core.registerItemStatus(state.items[0]),'Published');assert.throws(()=>core.updateRegisterItem(state,{...state.items[0],title:'Bad'}),/revision/);state=core.reviseRegisterItem(state,'one');assert.equal(state.items[0].revision,'01');state=core.updateRegisterItem(state,{...state.items[0],title:'Revised foundation'});assert.equal(state.items[0].versions[0].title,'Foundation');assert.throws(()=>core.updateRegisterItem(state,{...state.items[0],code:'EDS-02-01'}),/Codes/);assert.equal(state.items[0].versions[0].url,'https://example.org/foundation-r00.pdf');
});
test('publish requires approval and source; suffix is not revision',()=>{
let state=add();assert.throws(()=>core.publishRegisterItem(state,'one','rev','now'),/Approve/);state=core.updateRegisterItem(state,{...state.items[0],status:'Approved'});assert.throws(()=>core.publishRegisterItem(state,'one','rev','now'),/Link/);assert.throws(()=>core.updateRegisterItem(state,{...state.items[0],url:'javascript:alert(1)'}),/https/);
});
function api(responses){const writes=[],filters=[];const q={select(){return this;},eq(...args){filters.push(['eq',...args]);return this;},filter(...args){filters.push(['filter',...args]);return this;},is(...args){filters.push(['is',...args]);return this;},update(value){writes.push(value);return this;},single(){return Promise.resolve(responses.shift());}};return{...loader({'@/lib/supabase':{supabase:{from:()=>q}}})('lib/api/projectRegisterV3.ts'),writes,filters};}
test('V3 saves only namespaced register and preserves legacy 2.0 metadata',async()=>{
const legacy={documents:[{id:'old'}],stageWorkLayouts:{KO:{tasks:[]}},wbsTracking:{old:{}}};const client=api([{data:{meta:legacy}},{data:{id:'p'}}]);await client.saveProjectRegisterV3('p',core.emptyRegister(),add());assert.deepEqual(client.writes[0].meta.documents,legacy.documents);assert.deepEqual(client.writes[0].meta.stageWorkLayouts,legacy.stageWorkLayouts);assert.equal(client.writes[0].meta.projectRegisterV3.items[0].code,'EDS-01-01');
});
test('concurrent register writes fail without overwriting',async()=>{const client=api([{data:{meta:{projectRegisterV3:add()}}}]);await assert.rejects(client.saveProjectRegisterV3('p',core.emptyRegister(),add()),/changed elsewhere/);assert.equal(client.writes.length,0);});
test('save rejects deletion or edits to published snapshot',async()=>{let current=add();current=core.updateRegisterItem(current,{...current.items[0],status:'Approved',url:'https://example.org/file'});current=core.publishRegisterItem(current,'one','v','now');const client=api([{data:{meta:{projectRegisterV3:current}}}]);await assert.rejects(client.saveProjectRegisterV3('p',current,core.emptyRegister()),/preserved/);assert.equal(client.writes.length,0);});

test('JSONB property order does not cause a false conflict on subsequent saves',async()=>{
const baseline=add();const reorder=value=>Array.isArray(value)?value.map(reorder):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).reverse().map(key=>[key,reorder(value[key])])):value;
const client=api([{data:{meta:{projectRegisterV3:reorder(baseline)}}},{data:{id:'p'}}]);await client.saveProjectRegisterV3('p',baseline,add(baseline,'Detail','two'));assert.equal(client.writes.length,1);
});

const planning=loader()('lib/projectRegisterPlanningV3.ts');
test('planning supports EN/ID, weight, priority, subtask, ordering and recoverable exclusion with stable identities',()=>{
let state=planning.addPlanningWork(core.emptyRegister(),'KO','G','01','first');state=planning.editPlanningItem(state,'first',{title:'Info',titleId:'Informasi',weight:8,priority:'high'});state=planning.addPlanningWork(state,'KO','G','01','second','first','above');assert.equal(planning.planningRows(state,'KO','G')[0].id,'second');assert.equal(state.items.find(x=>x.id==='first').code,'KOG-01-02');state=planning.addPlanningWork(state,'KO','G','01','child','first','subtask');assert.equal(state.items.find(x=>x.id==='child').parentId,'first');state=planning.planningWorkAction(state,'first','exclude');assert.equal(state.items.filter(x=>x.excluded).length,2);assert.equal(state.items.length,3);assert.equal(planning.planningRows(state,'KO','G').length,1);assert.throws(()=>planning.editPlanningItem(state,'first',{weight:-1}),/Weight/);
});
test('moving existing items with no position metadata renumbers codes to match order',()=>{let state=add();state=add(state,'Detail','two');state=planning.planningWorkAction(state,'two','up');assert.equal(planning.planningRows(state,'ED','S')[0].id,'two');assert.equal(state.items[0].code,'EDS-01-02');});

test('large project metadata stays in request body with bounded timestamp concurrency filter',async()=>{
const timestamp='2026-10-21T00:00:00.123456+00:00';
const legacy={documentTemplates:'x'.repeat(200000)};
const client=api([{data:{meta:legacy,updated_at:timestamp}},{data:{id:'p'}}]);
await client.saveProjectRegisterV3('p',core.emptyRegister(),add());
assert.deepEqual(client.filters,[['eq','id','p'],['eq','id','p'],['eq','updated_at',timestamp]]);
assert.equal(client.writes[0].meta.documentTemplates,legacy.documentTemplates);
assert.ok(Date.parse(client.writes[0].updated_at)>Date.parse(timestamp));
assert.ok(JSON.stringify(client.filters).length<200);
});
test('a timestamp conflict during write fails instead of silently reporting saved',async()=>{
const client=api([{data:{meta:{},updated_at:'2026-10-21T00:00:00Z'}},{data:null}]);
await assert.rejects(client.saveProjectRegisterV3('p',core.emptyRegister(),add()),/changed elsewhere/);
});

test('custom leaf work can be deleted but parents with subtasks remain protected',async()=>{
let state=add();state=planning.addPlanningWork(state,'ED','S','01','child','one','subtask');
assert.throws(()=>core.deleteRegisterWork(state,'one'),/excluded/);
const next=core.deleteRegisterWork(state,'child');
assert.equal(next.items.length,1);assert.equal(next.items[0].id,'one');
const client=api([{data:{meta:{projectRegisterV3:state}}},{data:{id:'p'}}]);
await client.saveProjectRegisterV3('p',state,next);
assert.equal(client.writes[0].meta.projectRegisterV3.items.length,1);
});
test('master sources cannot be deleted in the model or during persistence',async()=>{
for(const source of [{masterSourceKey:'KO:1'},{legacySources:[{legacyCode:'01-01'}]}]){
const state=add();Object.assign(state.items[0],source);
assert.equal(core.canDeleteRegisterWork(state,'one'),false);
assert.throws(()=>core.deleteRegisterWork(state,'one'),/excluded/);
const client=api([{data:{meta:{projectRegisterV3:state}}}]);
await assert.rejects(client.saveProjectRegisterV3('p',state,core.emptyRegister()),/preserved/);
assert.equal(client.writes.length,0);
}
});
test('custom KOG-03 and KOG-04 groups generate independent item codes',()=>{
let state=core.addRegisterGroup(core.emptyRegister(),'KO','G','03','Project references');
state=core.addRegisterGroup(state,'KO','G','04','Additional information');
state=planning.addPlanningWork(state,'KO','G','03','custom03');
state=planning.addPlanningWork(state,'KO','G','04','custom04');
assert.equal(state.items[0].code,'KOG-03-01');assert.equal(state.items[1].code,'KOG-04-01');
assert.throws(()=>core.addRegisterGroup(state,'KO','G','03','Duplicate'),/already exists/);
assert.equal(core.registerGroups('G',state,'KO').find(row=>row.code==='04').name,'Additional information');
});
test('empty custom groups can be deleted without deleting work or standard groups',()=>{
const initial=core.emptyRegister();let state=core.addRegisterGroup(initial,'KO','G','03','Extra');
assert.equal(core.canDeleteRegisterGroup(state,'KO','G','03'),true);
assert.equal(core.deleteRegisterGroup(state,'KO','G','03').groups.length,0);
state=planning.addPlanningWork(state,'KO','G','03','child');
assert.throws(()=>core.deleteRegisterGroup(state,'KO','G','03'),/empty custom/);
state.items[0].excluded=true;
assert.throws(()=>core.deleteRegisterGroup(state,'KO','G','03'),/empty custom/);
assert.throws(()=>core.deleteRegisterGroup(initial,'KO','G','01'),/empty custom/);
});
test('subtasks extend the complete parent code at every depth and siblings stay at same depth',()=>{
let state=planning.addPlanningWork(core.emptyRegister(),'KO','G','01','root');
state=planning.addPlanningWork(state,'KO','G','01','child','root','subtask');
state=planning.addPlanningWork(state,'KO','G','01','grandchild','child','subtask');
state=planning.addPlanningWork(state,'KO','G','01','sibling','child','below');
assert.equal(state.items.find(x=>x.id==='root').code,'KOG-01-01');
assert.equal(state.items.find(x=>x.id==='child').code,'KOG-01-01-01');
assert.equal(state.items.find(x=>x.id==='grandchild').code,'KOG-01-01-01-01');
assert.equal(state.items.find(x=>x.id==='sibling').code,'KOG-01-01-02');
state.items.forEach(core.validateRegisterItem);
});
test('flat-numbered draft children repair recursively without losing IDs or legacy code references',async()=>{
let state=planning.addPlanningWork(core.emptyRegister(),'KO','G','01','root');
state=planning.addPlanningWork(state,'KO','G','01','child');state.items[1].parentId='root';
state=planning.addPlanningWork(state,'KO','G','01','grandchild');state.items[2].parentId='child';
const next=planning.repairPlanningHierarchy(state);
assert.equal(next.items[1].code,'KOG-01-01-01');assert.equal(next.items[2].code,'KOG-01-01-01-01');
assert.equal(next.items[1].id,'child');assert.ok(next.items[1].codeAliases.includes('KOG-01-02'));
assert.equal(planning.repairPlanningHierarchy(next),next);next.items.forEach(core.validateRegisterItem);
const client=api([{data:{meta:{projectRegisterV3:state}}},{data:{id:'p'}}]);await client.saveProjectRegisterV3('p',state,next);
});
test('Add Below inserts consecutive sibling codes and shifts descendants, preserving published snapshots',async()=>{
let state=core.emptyRegister();for(const id of ['one','two','three'])state=planning.addPlanningWork(state,'KO','G','01',id);
state=planning.addPlanningWork(state,'KO','G','01','child','three','subtask');
state.items.find(row=>row.id==='three').versions=[{id:'snapshot',code:'KOG-01-03',revision:'00',title:'Original'}];
const old=state;
const next=planning.addPlanningWork(state,'KO','G','01','inserted','two','below');
const rows=planning.planningRows(next,'KO','G');
assert.deepEqual(Array.from(rows,row=>row.code),['KOG-01-01','KOG-01-02','KOG-01-03','KOG-01-04','KOG-01-04-01']);
assert.equal(next.items.find(row=>row.id==='three').versions[0].code,'KOG-01-03');
assert.equal(next.items.find(row=>row.id==='child').parentId,'three');
const client=api([{data:{meta:{projectRegisterV3:old}}},{data:{id:'p'}}]);await client.saveProjectRegisterV3('p',old,next);
assert.equal(client.writes.length,1);
});
test('renumber repairs an existing 02 05 03 order without changing names, weights or IDs',()=>{
let state=core.emptyRegister();for(const id of ['one','two','three','four'])state=planning.addPlanningWork(state,'KO','G','01',id);
state.items[2].sequence='05';state.items[2].code='KOG-01-05';state.items[2].title='Inserted';state.items[2].weight=17;
const next=planning.renumberPlanningWork(state,'KO','G');
assert.equal(next.items[2].code,'KOG-01-03');assert.equal(next.items[2].id,'three');assert.equal(next.items[2].title,'Inserted');assert.equal(next.items[2].weight,17);
assert.equal(planning.renumberPlanningWork(next,'KO','G'),next);
});
const treeModel=loader()('lib/projectRegisterTreeV3.ts');
test('inline tree searches descendants with ancestors, combines MEP, and keeps excluded published documents accessible',()=>{
let state=planning.addPlanningWork(core.emptyRegister(),'KO','G','01','parent');state=planning.editPlanningItem(state,'parent',{title:'Parent'});
state=planning.addPlanningWork(state,'KO','G','01','child','parent','subtask');state=planning.editPlanningItem(state,'child',{title:'Unique leaf'});
const searched=treeModel.registerTreeSections(state,'KO','Unique leaf');
assert.deepEqual(Array.from(searched[0].tasks[0].items,item=>item.id),['parent','child']);
assert.equal(treeModel.registerTreeSections(state,'KO','Kickoff').length,1);
state.items[1].excluded=true;state.items[1].versions=[{code:state.items[1].code,publishedAt:'2026-10-21'}];
assert.equal(treeModel.registerTreeSections(state,'KO')[0].tasks[0].items.length,1);
assert.equal(treeModel.registerTreeSections(state,'KO','',true)[0].tasks[0].items.length,2);
for(const category of ['M','E','P'])state=planning.addPlanningWork(state,'ED',category,'01',category);
const mep=treeModel.registerTreeSections(state,'ED');assert.equal(mep.length,1);assert.equal(mep[0].name,'MEP');assert.equal(mep[0].tasks.length,3);
});

test('PIC supports multiple People, deselection and initials without dropping legacy names',()=>{
const pic=loader()('lib/projectDeliverablePIC.ts');let item={pic:''};item={...item,...pic.togglePIC(item,{id:'a',name:'Ayu Putri'})};item={...item,...pic.togglePIC(item,{id:'b',name:'Budi Santoso'})};assert.equal(item.pic,'Ayu Putri, Budi Santoso');assert.equal(item.assignees.length,2);assert.equal(pic.picInitials('Ayu Putri'),'AP');assert.equal(pic.picInitials('Budi'),'BU');item={...item,...pic.togglePIC(item,{id:'a',name:'Ayu Putri'})};assert.equal(item.pic,'Budi Santoso');assert.equal(pic.selectedPIC({pic:'Previous Person'})[0].name,'Previous Person');
});
test('weighted progress counts parent weight once and excludes excluded subtrees',()=>{
const progress=loader()('lib/projectDeliverableProgress.ts');let state=add();const parent={...state.items[0],weight:10,status:'Not Started'};const child={...parent,id:'child',parentId:parent.id,weight:2,status:'Approved'};const other={...parent,id:'other',weight:30,status:'Not Started'};state={...state,items:[parent,child,other]};assert.equal(progress.deliverableProgress(state,'ED').percent,25);assert.throws(()=>progress.setDeliverableStatus(state,parent.id,'Approved'));state.items[0]={...parent,excluded:true};assert.equal(progress.deliverableProgress(state,'ED').percent,0);
});

test('deliverable upload uses tenant/project/item path, unique files and propagates storage errors',async()=>{
let failure=null,captured;const exports={};const bucket={upload:async(...args)=>{captured=args;return {error:failure}},getPublicUrl:path=>({data:{publicUrl:'https://files.example/'+path}})};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/api/projectDeliverableFile.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,crypto:{randomUUID:()=> 'unique'},require:()=>({supabase:{storage:{from:name=>{assert.equal(name,'project-files');return bucket}}}})});
const url=await exports.uploadDeliverableFile('tenant','project','item','Site plan.pdf','application/pdf',new ArrayBuffer(2));assert.ok(url.endsWith('/tenant/projects/project/deliverables/item/unique/Site_plan.pdf'));assert.equal(captured[2].upsert,false);failure=new Error('Storage denied');await assert.rejects(()=>exports.uploadDeliverableFile('tenant','project','item','a.pdf','',new ArrayBuffer(2)),/Storage denied/);await assert.rejects(()=>exports.uploadDeliverableFile('','project','item','a.pdf','',new ArrayBuffer(2)),/context/);
});

test('Legacy-style document content saves in V3 and is frozen in published revisions',()=>{
let state=add();state=core.updateRegisterItem(state,{...state.items[0],status:'Approved',pageContent:{description:'Original page'}});state=core.publishRegisterItem(state,'one','rev','now');assert.equal(state.items[0].versions[0].pageContent.description,'Original page');state=core.reviseRegisterItem(state,'one');state=core.updateRegisterItem(state,{...state.items[0],pageContent:{description:'Revised page'}});assert.equal(state.items[0].versions[0].pageContent.description,'Original page');assert.equal(state.items[0].pageContent.description,'Revised page');
});
