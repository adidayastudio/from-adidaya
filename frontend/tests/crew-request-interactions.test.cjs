const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
function initializer(file,name){const text=fs.readFileSync(file,'utf8');const ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let found;function walk(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)===name)found=n.initializer.getText(ast);ts.forEachChild(n,walk);}walk(ast);assert.ok(found,name);return found;}
function compile(code,context){vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,context);return context.handler;}
test('desktop request selection shows read-only pane; Edit opens form',()=>{
 const source=initializer('app/(tabs)/home/crew-module.tsx','renderDesktopRightPane');
 const base={React:{createElement:(type,props,...children)=>({type,props,children})},activeSegment:'requests',selectedRequestForEdit:{id:'r'},View:'View',CrewRequestModal:'EditForm',setRequestDetailContainer:()=>{},setRequestModalVisible:()=>{},handleSaveRequest:()=>{},crewMembers:[],projects:[]};
 for(const visible of [false,true]){const ctx={...base,requestModalVisible:visible};const fn=compile('var handler='+source,ctx);assert.equal(fn().type,visible?'EditForm':'View');}
});
for(const [name,callback] of [['handleApprovePress','onApproveRequest'],['handleDeletePress','onDeleteRequest']])test(`${name} honors web confirmation`,()=>{
 const source=initializer('components/crew/CrewRequestsTab.tsx',name);let calls=[];let answer=false;const ctx={Platform:{OS:'web'},window:{confirm:()=>answer},[callback]:(...args)=>calls.push(args)};const fn=compile('var handler='+source,ctx);fn('r');assert.equal(calls.length,0);answer=true;fn('r');assert.deepEqual(calls,[['r']]);
});
test('web rejection preserves cancellation and entered reason',()=>{
 let answer=null,calls=[];const ctx={Platform:{OS:'web'},window:{prompt:()=>answer},onRejectRequest:(...args)=>calls.push(args)};const fn=compile('var handler='+initializer('components/crew/CrewRequestsTab.tsx','handleRejectPress'),ctx);fn('r');assert.equal(calls.length,0);answer='Wrong amount';fn('r');assert.deepEqual(calls,[['r','Wrong amount']]);
});
