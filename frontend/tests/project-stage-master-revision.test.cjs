const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path');
function loader(mocks={}){const cache={};const load=file=>{file=path.resolve(file);if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));if(cache[file])return cache[file];const exports={};cache[file]=exports;vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{exports,require:name=>name in mocks?mocks[name]:load((name.startsWith('@/')?path.resolve(name.slice(2)):path.resolve(path.dirname(file),name))+(name.endsWith('.json')?'':'.ts'))});return exports;};return load;}

const {reconcileStageMasters,validMasterRecode}=loader()('lib/projectStageMastersV3.ts');
const masters=require('../constants/projectStageMastersV3.json');
test('KO SD DD approval/signoff/notes all belong to final Report group with unchanged source content',()=>{
for(const stage of ['KO','SD','DD']){const items=masters[stage].items;assert.equal(items.length,stage==='KO'?23:30);let previous='';for(const item of items){const approval=/approval|signoff|^notes$/i.test(item.title);if(approval){assert.equal(item.code[2],'R');assert.ok(item.code.includes('-99-'));}const source=item.legacySources[0];for(const field of ['title','titleId','weight','priority'])assert.equal(item[field],source[field]);const category=item.code[2];const prior=items.slice(0,items.indexOf(item)).filter(x=>x.code[2]===category).at(-1);if(prior)assert.ok(prior.legacyOrder<=item.legacyOrder);}assert.equal(items.at(-1).title,'Notes');}
});
test('existing project identity/custom fields and published code snapshots survive recoding',()=>{
const old={id:'stable',stage:'KO',category:'X',group:'04',sequence:'02',suffix:'',code:'KOX-04-02',title:'Custom client approval',titleId:'Custom ID',weight:123,priority:'urgent',status:'Approved',revision:'00',url:'https://example.com/r0',notes:'Keep notes',pic:'Adi',deadline:'2026-12-01',versions:[{id:'pub',code:'KOX-04-02',title:'Client Approval',revision:'00'}],legacySources:[{legacyCode:'08-02'}]};const state={schemaVersion:3,items:[old],groups:[],appliedMasters:{KO:1}};let n=0;const next=reconcileStageMasters(state,()=>`new-${++n}`);const updated=next.items.find(x=>x.id==='stable');assert.equal(updated.code,'KOR-99-02');for(const field of ['title','titleId','weight','priority','url','notes','pic','deadline'])assert.equal(updated[field],old[field]);assert.deepEqual(updated.versions,old.versions);assert.ok(updated.codeAliases.includes(old.code));assert.ok(validMasterRecode(old,updated));assert.equal(state.items[0].code,'KOX-04-02');assert.equal(reconcileStageMasters(next,()=>{throw Error('repeat');}),next);
});
test('already-applied stages are untouched and conflicting codes do not overwrite project items',()=>{const item={id:'ed',stage:'ED',code:'EDS-01-01',versions:[]};const base={schemaVersion:3,items:[item],groups:[],appliedMasters:{ED:2}};let n=0;const next=reconcileStageMasters(base,()=>`id-${++n}`);assert.equal(next.items.find(x=>x.id==='ed'),item);const conflicting={schemaVersion:3,items:[{id:'custom',stage:'KO',code:'KOR-99-01',title:'Different custom output',versions:[]}],groups:[]};assert.throws(()=>reconcileStageMasters(conflicting,()=>`id-${++n}`),/collision/);assert.equal(conflicting.items.length,1);});

test('renumbered legacy aliases are reserved against reuse by newly added work',()=>{const core=loader()('lib/projectRegisterV3.ts');let n=0;const state=reconcileStageMasters({schemaVersion:3,items:[{id:'notes',stage:'KO',code:'KOG-01-04',title:'Notes',versions:[],legacySources:[{legacyCode:'08-03'}]}],groups:[],appliedMasters:{KO:1}},()=>`id-${++n}`);const next=core.addRegisterItem(state,'KO','G','01','Extra content','extra');assert.equal(next.items.at(-1).code,'KOG-01-05');});

test('ED PR CN HO import every supplied row with original bilingual content, weights and priority',()=>{
for(const [stage,count] of Object.entries({ED:102,PR:24,CN:18,HO:15})){
const master=masters[stage];assert.equal(master.legacyRows.length,count);assert.equal(master.items.length,count);
assert.equal(new Set(master.items.map(item=>item.code)).size,count);
for(const item of master.items){
const source=master.legacyRows.find(row=>row.legacyCode===item.legacySources[0].legacyCode);assert.ok(source);
for(const key of ['title','titleId','weight','priority'])assert.equal(item[key],source[key]);
assert.equal(item.legacyOrder,source.legacyCode);
if(/approval|sign[- ]?off|^notes$|^project closure$/i.test(item.title)){assert.ok(item.code.startsWith(stage+'R-99-'));}
const previous=master.items.slice(0,master.items.indexOf(item)).filter(row=>row.code[2]===item.code[2]).at(-1);
if(previous)assert.ok(previous.legacyOrder<=item.legacyOrder);
}
if(stage!=='CN')assert.ok(master.items.at(-1).code.startsWith(stage+'R-99-'));
}
assert.equal(masters.CN.items.find(item=>item.title==='Daily Progress Report').weight,1187);
});
test('all seven stage masters initialize once and preserve existing ED custom fields and published history',()=>{
const source=masters.ED.items.find(item=>item.code==='EDG-01-01');
const item={id:'ed-existing',stage:'ED',code:source.code,title:source.title,titleId:'Custom cover',weight:777,priority:'urgent',versions:[{id:'published',code:source.code}],url:'https://example.com/custom.pdf'};
let n=0;const state={schemaVersion:3,items:[item],groups:[]};const next=reconcileStageMasters(state,()=>`new-${++n}`);
assert.equal(next.items.length,242);
assert.deepEqual(Object.keys(next.appliedMasters).sort(),['CN','DD','ED','HO','KO','PR','SD']);
const updated=next.items.find(row=>row.id===item.id);assert.equal(updated.titleId,item.titleId);assert.equal(updated.weight,777);assert.deepEqual(updated.versions,item.versions);assert.equal(updated.url,item.url);
assert.equal(reconcileStageMasters(next,()=>{throw Error('must not reapply');}),next);
});
