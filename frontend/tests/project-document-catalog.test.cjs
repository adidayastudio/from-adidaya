const test=require('node:test'),assert=require('node:assert/strict');
const catalog=require('../constants/projectDocumentCatalog.json');
const fs=require('node:fs');
test('catalog contains all stable 00–99 codes and ten final documents',()=>{
assert.equal(catalog.entries.length,100);assert.equal(new Set(catalog.entries.map(x=>x.code)).size,100);
for(let i=0;i<100;i++){const code=String(i).padStart(2,'0');const entry=catalog.entries.find(x=>x.code===code);assert.ok(entry);assert.equal(entry.parentCode,i%10===0?null:String(Math.floor(i/10)*10).padStart(2,'0'));}
assert.equal(catalog.entries.filter(x=>x.code.endsWith('9')).length,10);
});
test('final outlines have sequential unique chapter codes, pending review and markdown coverage',()=>{
const md=fs.readFileSync('docs/project-stages-document-master-plan.md','utf8');
assert.equal(new Set(catalog.chapters.map(x=>x.code)).size,catalog.chapters.length);
for(let i=0;i<10;i++){const code=String(i*10+9).padStart(2,'0');const chapters=catalog.chapters.filter(x=>x.parentCode===code);assert.ok(chapters.length>=12);chapters.forEach((chapter,n)=>{assert.equal(chapter.code,`${code}.${String(n+1).padStart(2,'0')}`);assert.equal(chapter.reviewStatus,'pending');assert.ok(md.includes(chapter.code+' · '+chapter.name));});}
assert.equal(catalog.chapters.filter(x=>x.parentCode==='19').length,13);assert.equal(catalog.chapters.filter(x=>x.parentCode==='99').length,14);
for(const entry of catalog.entries)assert.ok(md.includes(entry.name));
});
