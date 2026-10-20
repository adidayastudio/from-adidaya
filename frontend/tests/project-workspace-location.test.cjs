const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const exports_={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/projectWorkspaceLocation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exports_});
const {readProjectWorkspaceLocation:read,projectWorkspaceParams:params}=exports_;
test('refresh restores project, focus, selected page and register version from URL',()=>{
const url=new URL('http://localhost:8082/projects?project=project-123&focus=1&section=planning%3Astages&register=2');
const restored=read(Object.fromEntries(url.searchParams));
assert.equal(restored.projectId,'project-123');assert.equal(restored.focus,true);assert.equal(restored.section,'planning:stages');assert.equal(restored.registerVersion,2);
});
test('opening another project resets the previous project view and closing removes restoration',()=>{
const open=read(params('next'));assert.equal(open.projectId,'next');assert.equal(open.section,'overview');assert.equal(open.focus,false);assert.equal(open.registerVersion,3);
assert.equal(read(params()).projectId,'');
});
test('invalid pages fall back safely, array params normalize, and exiting focus remains off after reload',()=>{
const result=read({project:['one','two'],section:'unknown',focus:'0',register:'invalid'});
assert.equal(result.projectId,'one');assert.equal(result.section,'overview');assert.equal(result.focus,false);assert.equal(result.registerVersion,3);
for(const section of ['work','docs','planning:rab','planning:schedule','settings:general','module:finance','module:resources','module:report'])assert.equal(read({section}).section,section);
});
