const test=require('node:test'),assert=require('node:assert/strict'),React=require('react'),{renderToString}=require('react-dom/server'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path');
function load(file,react=React){file=path.resolve(file);if(!fs.existsSync(file)&&file.endsWith('.ts'))file=file.slice(0,-3)+'/index.ts';if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));const exports={};const component=props=>React.createElement('div',{'aria-label':props.accessibilityLabel},props.children);vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,{exports,require:name=>{
if(name==='@/context/TenantContext')return {useTenantContext:()=>({activeTenant:null})};if(name==='@/lib/supabase'||name==='./supabase')return {supabase:{}};if(name==='react')return react;
if(name==='react-native')return{StyleSheet:{create:value=>value},View:component,Text:component,ScrollView:component,Modal:props=>props.visible?component(props):null,ActivityIndicator:()=>null,TextInput:props=>React.createElement('input',{'aria-label':props.accessibilityLabel,defaultValue:props.value}),TouchableOpacity:component,Platform:{OS:'web'},Linking:{openURL:()=>{}}};
if(name==='@react-native-community/datetimepicker')return {__esModule:true,default:component};if(name==='@expo/vector-icons')return{Ionicons:()=>null,Feather:()=>null};
if(name.includes('HeaderToolbar'))return{HeaderToolbar:component};
if(name.includes('PlatformContextMenu'))return{__esModule:true,default:component};
if(name.includes('legacy-stages/layout'))return {stageWorkCSV:()=>'',stageWorkHTML:()=>'',stageWorkRows:()=>[]};
if(name.includes('SegmentedControl'))return{SegmentedControl:props=>React.createElement('nav',null,props.segments.map(x=>React.createElement('span',{key:x.id},x.label)))};
if(name.includes('/api/projectRegisterV3'))return{loadProjectRegisterV3:async()=>({schemaVersion:3,items:[],groups:[]}),saveProjectRegisterV3:async()=>{}};
return load(path.resolve(name.startsWith('@/')?name.slice(2):path.join(path.dirname(file),name))+(name.endsWith('.json')?'':fs.existsSync(path.resolve(name.startsWith('@/')?name.slice(2):path.join(path.dirname(file),name))+'.tsx')?'.tsx':'.ts'),react);
}});return exports;}
const {ProjectRegisterWorkspace}=load('components/projects/register-v3/ProjectRegisterWorkspace.tsx');
test('V3 opens at KO rather than ED',()=>{const html=renderToString(React.createElement(ProjectRegisterWorkspace,{projectId:'p',mode:'work',isDark:true})).replace(/<!--.*?-->/g,'');for(const stage of ['KO','SD','DD','ED','PR','CN','HO'])assert.ok(html.includes('>'+stage+'<'));assert.ok(html.includes('>KO<'));assert.ok(!html.includes('Detailed Engineering Design'));});
const {ProjectRegisterStagePlanning}=load('components/projects/register-v3/ProjectRegisterStagePlanning.tsx');
test('V3 stage planning uses Legacy 2.0 columns, editable work, weights, priorities and section accordions',()=>{
const item={id:'one',stage:'KO',category:'G',group:'01',sequence:'01',suffix:'',code:'KOG-01-01',title:'Project information',titleId:'Informasi proyek',weight:4,priority:'low',versions:[]};
const html=renderToString(React.createElement(ProjectRegisterStagePlanning,{state:{schemaVersion:3,items:[item],groups:[]},stage:'KO',isDark:true,saving:false,onSave:async()=>true,onDirtyChange:()=>{}})).replace(/<!--.*?-->/g,'');
for(const label of ['Code','Work (EN)','Work (ID)','Weight','Priority','KOG-01-01','Project information','Informasi proyek','Add Subtask','Add Revision','Export'])assert.ok(html.includes(label),label);
assert.ok(html.includes('KOM'));assert.ok(!html.includes('>KOE<'));assert.ok(!html.includes('>KOP<'));
});
test('work and documents start without category navigation pages or browse-master step',()=>{for(const mode of ['work','documents']){const html=renderToString(React.createElement(ProjectRegisterWorkspace,{projectId:'p',mode,isDark:false}));assert.ok(!html.includes('Browse master categories'));assert.ok(!html.includes('All categories'));if(mode==='documents')assert.ok(!html.includes('<nav>'));}});

test('empty custom group appears directly with add work and delete action',()=>{
const state={schemaVersion:3,items:[],groups:[{stage:'KO',category:'G',code:'03',name:'Extra project information'}]};
const html=renderToString(React.createElement(ProjectRegisterStagePlanning,{state,stage:'KO',isDark:true,saving:false,onSave:async()=>true,onDirtyChange:()=>{}})).replace(/<!--.*?-->/g,'');
assert.ok(html.includes('KOG-03'));assert.ok(html.includes('Extra project information'));assert.ok(html.includes('No subtasks yet'));
});

const {ProjectRegisterTree}=load('components/projects/register-v3/ProjectRegisterTree.tsx');
const treeState={schemaVersion:3,groups:[{stage:'KO',category:'G',code:'01',name:'General information'}],items:[{id:'item',stage:'KO',category:'G',group:'01',sequence:'01',code:'KOG-01-01',title:'Cover',versions:[]}]};
test('deliverables show category, task and items inline and use toggles instead of navigation',()=>{
const html=renderToString(React.createElement(ProjectRegisterTree,{state:treeState,stage:'KO',isDark:true,search:'',expanded:['KOG','KOG-01'],onToggle:()=>{},renderItem:item=>React.createElement('span',null,item.title),onAdd:()=>{}})).replace(/<!--.*?-->/g,'');
for(const label of ['Toggle KOG','Toggle KOG-01','General information','Cover','Add Deliverable'])assert.ok(html.includes(label),label);
const closed=renderToString(React.createElement(ProjectRegisterTree,{state:treeState,stage:'KO',isDark:true,search:'',expanded:[],onToggle:()=>{},renderItem:item=>React.createElement('span',null,item.title)}));assert.ok(!closed.includes('Cover'));
});
test('documents use all seven stage folders, count published files and retain empty task folders',()=>{
const html=renderToString(React.createElement(ProjectRegisterTree,{state:treeState,stage:'',isDark:true,documents:true,search:'',expanded:['KO','KOG','KOG-01'],onToggle:()=>{},renderItem:item=>React.createElement('span',null,item.title)})).replace(/<!--.*?-->/g,'');
for(const stage of ['KO','SD','DD','ED','PR','CN','HO'])assert.ok(html.includes(`Toggle ${stage}`));
assert.ok(html.includes('0 documents'));assert.ok(html.includes('No published documents yet.'));assert.ok(!html.includes('>Cover<'));
const published={...treeState,items:[{...treeState.items[0],excluded:true,versions:[{code:'KOG-01-01',publishedAt:'2026-10-21'}]}]};
const issued=renderToString(React.createElement(ProjectRegisterTree,{state:published,stage:'',isDark:true,documents:true,search:'',expanded:['KO','KOG','KOG-01'],onToggle:()=>{},renderItem:item=>React.createElement('span',null,item.title)})).replace(/<!--.*?-->/g,'');assert.ok(issued.includes('1 documents'));assert.ok(issued.includes('Cover'));
});

test('header settles when parent recreates navigation callback and retains the newest callback',()=>{
const slots=[];let cursor=0,queued=[],pending=false,header=null,headerUpdates=0,renderCount=0;
const same=(a,b)=>a&&b&&a.length===b.length&&a.every((value,index)=>Object.is(value,b[index]));
const memo=(fn,deps)=>{const index=cursor++;if(!slots[index]||!same(slots[index].deps,deps))slots[index]={deps,value:fn()};return slots[index].value;};
const hooks={...React,useState(initial){const index=cursor++;if(!slots[index])slots[index]={value:typeof initial==='function'?initial():initial};return [slots[index].value,value=>{const next=typeof value==='function'?value(slots[index].value):value;if(!Object.is(slots[index].value,next)){slots[index].value=next;pending=true;}}];},useRef(value){return memo(()=>({current:value}),[]);},useMemo:memo,useCallback:(fn,deps)=>memo(()=>fn,deps),useEffect(){cursor++;},useLayoutEffect(fn,deps){const index=cursor++;if(!slots[index]||!same(slots[index].deps,deps)){slots[index]={deps};queued.push(fn);}}};
const Component=load('components/projects/register-v3/ProjectRegisterWorkspace.tsx',hooks).ProjectRegisterWorkspace;
const setHeader=value=>{if(value!==header){header=value;headerUpdates++;pending=true;}};
const title=()=>{};let navigated;
do{pending=false;cursor=0;queued=[];const current=++renderCount;Component({projectId:'p',mode:'documents',isDark:true,onHeaderTrailingChange:setHeader,onTitleAccessoryChange:title,onNavigate:section=>{navigated=[current,section];}});queued.forEach(fn=>fn());assert.ok(renderCount<8,'header should settle instead of recursively updating');}while(pending);
assert.equal(headerUpdates,1);
const findActions=node=>node?.props?.actions||React.Children.toArray(node?.props?.children).map(findActions).find(Boolean);
findActions(header).find(action=>action.id==='add').onPress();assert.deepEqual(navigated,[renderCount,'work']);
});

test('desktop detail occupies inline width and animates alongside table without a modal or backdrop',()=>{
const {DeliverableEditorSheet}=load('components/projects/register-v3/DeliverableEditorSheet.tsx');
const props={visible:true,isDark:true,onClose:()=>{},children:React.createElement('span',null,'Detail fields')};
const open=DeliverableEditorSheet(props),closed=DeliverableEditorSheet({...props,visible:false});
assert.equal(open.props.accessibilityLabel,'Deliverable detail panel');assert.equal(open.props.style.width,'36%');assert.equal(closed.props.style.width,0);assert.equal(open.props.style.transitionDuration,'220ms');
const html=renderToString(open);assert.ok(html.includes('Detail fields'));assert.ok(!html.includes('Close deliverable detail'));assert.ok(!renderToString(closed).includes('Detail fields'));
});

test('V3 reuses Legacy document pages with V3 codes and project information',()=>{
const {RegisterDocumentEditor}=load('components/projects/register-v3/RegisterDocumentEditor.tsx');
for(const [title,expected] of [['Cover','Cover Subtitle / Notes:'],['Table of Contents','KOG-01-01'],['Design Summary','Page Description / Content:']]){
const state={...treeState,items:[{...treeState.items[0],title,pageContent:{description:'Existing content'}}]};
const html=renderToString(React.createElement(RegisterDocumentEditor,{state,item:state.items[0],project:{title:'Actual project',code:'ACT',number:'042'},isDark:true,readOnly:false,onChange:()=>{}}));
assert.ok(html.includes(expected),expected);assert.ok(html.includes('KOG-01-01'));assert.ok(html.includes('Actual project'));assert.ok(!html.includes('Pages in Section'));assert.ok(!html.includes('Rumah Rawamangun'));assert.ok(!html.includes('Mark this deliverable page as complete'));
}
});

test('deadline uses an empty-capable native date input, keeps local dates and can clear',()=>{
const {PlatformDatePicker}=load('components/people/member-profile/components/PlatformDatePicker.tsx');let selected,cleared=false;
const element=PlatformDatePicker({value:new Date(NaN),pill:true,isDark:true,disabled:true,onChange:value=>{selected=value},onClear:()=>{cleared=true}});
const field=element.props.children;assert.equal(field.type,'input');assert.equal(field.props.type,'date');assert.equal(field.props.value,'');assert.equal(field.props.disabled,true);assert.equal(field.props.style.height,40);
field.props.onChange({target:{value:'2026-10-25'}});assert.equal(selected.getFullYear(),2026);assert.equal(selected.getMonth(),9);assert.equal(selected.getDate(),25);field.props.onChange({target:{value:''}});assert.equal(cleared,true);
});
test('detail presents labelled editor action, date picker, priority, compact notes and document preview',()=>{
const item={...treeState.items[0],title:'Design Summary',suffix:'',status:'Not Started',revision:'00',url:'',notes:'',pic:'',deadline:'',priority:'high',pageContent:{description:'Saved document contents'}};
const state={...treeState,items:[item]};
const mock={...React,useState:initial=>{let value=typeof initial==='function'?initial():initial;if(value?.schemaVersion===3)value=state;else if(value===null)value=item;else if(value===true)value=false;return [value,()=>{}]},useEffect:()=>{},useLayoutEffect:()=>{},useMemo:callback=>callback(),useCallback:callback=>callback,useRef:initial=>({current:initial})};
const {ProjectRegisterWorkspace:Workspace}=load('components/projects/register-v3/ProjectRegisterWorkspace.tsx',mock);
const html=renderToString(React.createElement(Workspace,{projectId:'project',mode:'work',isDark:true}));
for(const label of ['Open editor','Deadline','Priority','High','Notes','Expand notes','Preview','Saved document contents','Add link'])assert.ok(html.includes(label),label);
assert.ok(html.includes('type="date"'));assert.ok(!html.includes('File / link · https://'));assert.ok(!html.includes('Notes / linked source reference'));
});
