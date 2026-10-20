const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const templates=require('../constants/projectDocumentTemplates.json');
const c={exports:{},require:name=>name.includes('TemplateBlocks') ? require('../constants/projectDocumentTemplateBlocks.json') : templates};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/projectDocumentTemplates.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,c);
const {createTemplateDocument}=c.exports;
test('all seven source templates are in the correct kickoff subfolders with full editable content',()=>{
assert.deepEqual(templates.map(x=>`${x.code}:${x.folder}`),['PIF:01','CDB:01','SSR:02','FST:03','SFP:04','SPK:05','PKD:08']);
for(const t of templates){assert.ok(t.content.includes('DOCUMENT CONTROL'));assert.ok(t.content.length>1000);assert.match(t.sourceUrl,/docs.google.com\/document/);}
});
test('creating a project document preserves template and allocates its own project number',()=>{
const original=templates[0].content;
const doc=createTemplateDocument(templates[0],{code:'008-RWM',title:'Rumah Rawamangun'},[{documentNumber:'PIF-008-RWM-01-002'}],'new');
assert.equal(doc.documentNumber,'PIF-008-RWM-01-003');assert.ok(doc.content.includes(doc.documentNumber));assert.equal(doc.subworkCode,'01');assert.equal(doc.projectName,'Rumah Rawamangun');assert.equal(templates[0].content,original);
});
test('all template number placeholders are replaced for their own document type',()=>{
for(const t of templates){const doc=createTemplateDocument(t,{code:'008'},[],'new');assert.ok(doc.content.includes(`${t.code}-008-${t.folder}-001`),t.code);}
});

test('structured templates retain original table rows and project document control',()=>{
const {templateDocumentBlocks,documentBlocksText}=c.exports;
for(const t of templates){const number=`${t.code}-RWM-${t.folder}-001`;const blocks=templateDocumentBlocks(t.code,number);assert.ok(blocks.some(block=>block.type==='table'),t.code);assert.ok(documentBlocksText(blocks).includes(number),t.code);assert.ok(documentBlocksText(blocks).includes('DOCUMENT CONTROL'),t.code);}
});
