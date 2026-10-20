const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path'),React=require('react');
function load(file,mocks={},cache={}){file=path.resolve(file);if(cache[file])return cache[file];const exports={};cache[file]=exports;vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,{exports,require:name=>name in mocks?mocks[name]:load((name.startsWith('@/')?path.resolve(name.slice(2)):path.resolve(path.dirname(file),name))+(name.endsWith('.json')?'':'.ts'),mocks,cache)});return exports;}
function api(responses){const calls=[];return{calls,...load('lib/api/projectModules.ts',{'@/lib/supabase':{supabase:{from(table){const call={table};calls.push(call);return{select(value){call.select=value;return this;},eq(column,value){call.filter=[column,value];return this;},order(){return this;},range(from,to){call.range=[from,to];return Promise.resolve(responses[table].shift());}};}}}})};}
test('Finance fetches both request types filtered at source to the current project',async()=>{
const client=api({purchasing_requests:[{data:[{id:'p',project_id:'project',date:'2026-10-20',amount:'250',description:'Concrete',approval_status:'approved'}]}],reimbursement_requests:[{data:[{id:'r',project_id:'project',date:'2026-10-21',amount:75,description:'Travel',status:'paid'}]}]});
const rows=await client.getProjectModuleRows('finance','project');assert.equal(rows.length,2);assert.equal(rows[0].type,'Reimbursement');assert.equal(rows.reduce((sum,row)=>sum+row.amount,0),325);assert.notEqual(rows[0].id,rows[1].id);client.calls.forEach(call=>assert.deepEqual(call.filter,['project_id','project']));
});
test('Resources reads project inventory and computes availability without mixing catalog stock',async()=>{
const client=api({resource_inventory:[{data:[{id:'i',project_id:'project',quantity_in:'20',quantity_used:'7',quantity_manual_adj:'-2',resource:{name:'Cement',category:'material',unit:'bag'}}]}]});const rows=await client.getProjectModuleRows('resources','project');assert.equal(rows[0].quantity,11);assert.equal(rows[0].unit,'bag');assert.equal(rows[0].title,'Cement');assert.deepEqual(client.calls[0].filter,['project_id','project']);
});
test('Report queries stay project-scoped on every pagination page and preserve content',async()=>{
const batch=Array.from({length:500},(_,i)=>({id:String(i),project_id:'project',title:'Daily report',content:'Notes',report_date:'2026-10-21'}));const client=api({project_reports:[{data:batch},{data:[{...batch[0],id:'last'}]}]});const rows=await client.getProjectModuleRows('report','project');assert.equal(rows.length,501);assert.equal(rows[500].content,'Notes');assert.deepEqual(client.calls[1].range,[500,999]);client.calls.forEach(call=>assert.deepEqual(call.filter,['project_id','project']));
});
test('missing project and API failures never return company-wide or demo data',async()=>{
const client=api({resource_inventory:[{error:{message:'No access'}}]});await assert.rejects(client.getProjectModuleRows('resources',''),/Select a project/);assert.equal(client.calls.length,0);await assert.rejects(client.getProjectModuleRows('resources','project'),/No access/);
});
test('Module menu selects an inline project section and excludes People and Clock',()=>{
const component=props=>React.createElement('div',null,props.children);let selected;
const {ProjectFocusNavigation}=load('components/projects/ProjectFocusNavigation.tsx',{'react':React,'react-native':{ScrollView:component,Text:component,TouchableOpacity:component,View:component},'@expo/vector-icons':{Ionicons:component},'@/components/ui/PlatformContextMenu':{__esModule:true,default:component}});
const tree=ProjectFocusNavigation({section:'module:finance',isDark:true,onSelect:value=>selected=value});
const find=node=>node?.props?.title==='Module'?node:React.Children.toArray(node?.props?.children).map(find).find(Boolean);
const menu=find(tree);assert.deepEqual(Array.from(menu.props.actions,item=>item.title),['Finance','Resources','Report']);assert.equal(menu.props.actions[0].selected,true);menu.props.onPress({nativeEvent:{index:1}});assert.equal(selected,'module:resources');
});
