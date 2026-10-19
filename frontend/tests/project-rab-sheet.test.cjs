const test=require('node:test'),assert=require('node:assert/strict'),React=require('react'),{renderToString}=require('react-dom/server'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
function render(mode='both',closed=false){
 const cache={};const View=props=>React.createElement('div',{'aria-label':props.accessibilityLabel},props.children),Text=props=>React.createElement('span',null,props.children);
 const mocks={react:{...React,useState:init=>React.useState(init==='en'?mode:closed&&typeof init==='function'?()=>new Set(['S']):init)},'react-native':{View,Text,TouchableOpacity:View,ScrollView:View,TextInput:props=>React.createElement('input',{'aria-label':props.accessibilityLabel,value:props.value,readOnly:!props.editable,onChange:()=>{}}),PanResponder:{create:()=>({panHandlers:{}})}},'@expo/vector-icons':{Ionicons:props=>React.createElement('i',null,props.name)},'@/components/ui/PlatformContextMenu':{default:View,__esModule:true},'@/components/ui/InstantTooltip':{InstantTooltip:View}};
 function load(file){file=path.resolve(file);if(cache[file])return cache[file];const exports={};cache[file]=exports;vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports,require:name=>name in mocks?mocks[name]:load((name.startsWith('@/')?path.resolve(name.slice(2)):path.resolve(path.dirname(file),name))+(fs.existsSync((name.startsWith('@/')?path.resolve(name.slice(2)):path.resolve(path.dirname(file),name))+'.tsx')?'.tsx':'.ts'))});return exports;}
 const {ProjectRABSheet}=load('components/projects/ProjectRABSheet.tsx');
 return renderToString(React.createElement(ProjectRABSheet,{rows:[{code:'S',title:'Structure',isSection:true},{code:'S.1',title:'Legacy combined',volume:2,unit:'m²',unitPrice:10}],wbs:[{wbs_code:'S',title:'Structure',title_en:'Struktur'},{wbs_code:'S.1',title:'Floor',title_en:'Lantai'}],meta:{estimateValues:{}},drafts:{},isDark:true,editable:true,onEdit(){}}));
}
test('RAB sheet separates bilingual cells, starts at 1 and offers AHSP per item and column resizing',()=>{const html=render();assert.ok(html.includes('Description · EN'));assert.ok(html.includes('Deskripsi · ID'));assert.ok(html.includes('value="Floor"'));assert.ok(html.includes('value="Lantai"'));assert.ok(html.includes('>1</span>'));assert.ok(html.includes('Choose AHSP for S.1'));assert.ok(html.includes('Drag to resize column'));assert.ok(html.includes('chevron-down'));});
test('RAB language selection hides either description column independently',()=>{const en=render('en');assert.ok(en.includes('Description · EN'));assert.ok(!en.includes('Deskripsi · ID'));const id=render('id');assert.ok(id.includes('Deskripsi · ID'));assert.ok(!id.includes('Description · EN'));});
test('collapsing a WBS group hides descendants without hiding the group',()=>{const html=render('both',true);assert.ok(html.includes('value="Structure"'));assert.ok(!html.includes('value="Floor"'));assert.ok(html.includes('chevron-forward'));});

test('EN is the default language and numeric columns use compact widths',()=>{const html=render('en');assert.ok(!html.includes('Deskripsi · ID'));assert.ok(!html.includes('>A</span>'));});

test('RAB sheet rolls up total amount and weight for WBS groups and subgroups',()=>{
 const cache={};const View=props=>React.createElement('div',{'aria-label':props.accessibilityLabel},props.children),Text=props=>React.createElement('span',null,props.children);
 const mocks={react:{...React,useState:init=>React.useState(init)},'react-native':{View,Text,TouchableOpacity:View,ScrollView:View,TextInput:props=>React.createElement('input',{'aria-label':props.accessibilityLabel,value:props.value,readOnly:!props.editable,onChange:()=>{}}),PanResponder:{create:()=>({panHandlers:{}})}},'@expo/vector-icons':{Ionicons:props=>React.createElement('i',null,props.name)},'@/components/ui/PlatformContextMenu':{default:View,__esModule:true},'@/components/ui/InstantTooltip':{InstantTooltip:View}};
 function load(file){file=path.resolve(file);if(cache[file])return cache[file];const exports={};cache[file]=exports;vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports,require:name=>name in mocks?mocks[name]:load((name.startsWith('@/')?path.resolve(name.slice(2)):path.resolve(path.dirname(file),name))+(fs.existsSync((name.startsWith('@/')?path.resolve(name.slice(2)):path.resolve(path.dirname(file),name))+'.tsx')?'.tsx':'.ts'))});return exports;}
 const {ProjectRABSheet}=load('components/projects/ProjectRABSheet.tsx');
 const html=renderToString(React.createElement(ProjectRABSheet,{
   rows:[
     {code:'S',title:'Structure',isSection:true},
     {code:'S.2',title:'Earthworks',isSection:true},
     {code:'S.2.1',title:'Excavation',volume:10,unit:'m3',unitPrice:2000},
     {code:'S.2.2',title:'Compaction',volume:5,unit:'m3',unitPrice:4000},
     {code:'S.3',title:'Foundation',isSection:true},
     {code:'S.3.1',title:'Piles',volume:10,unit:'pcs',unitPrice:6000},
   ],
   wbs:[],meta:{estimateValues:{}},drafts:{},isDark:true,editable:true,onEdit(){}
 }));
 // S.2 total = 20.000 + 20.000 = 40.000 (40,00%)
 assert.ok(html.includes('>40.000</span>'));
 assert.ok(html.includes('>40.00</span>'));
 // S total = 100.000 (100,00%)
 assert.ok(html.includes('>100.000</span>'));
 assert.ok(html.includes('>100.00</span>'));
 // Children amounts = 20.000 and 60.000
 assert.ok(html.includes('>20.000</span>'));
 assert.ok(html.includes('>60.000</span>'));
});
