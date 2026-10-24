const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
function load(os='web',response={ok:true,headers:{get:()=>null},arrayBuffer:async()=>Uint8Array.from([1,2,255]).buffer}){
 const uploads=[],reads=[];const context={exports:{},fetch:async()=>response,require:name=>({'react-native':{Platform:{OS:os}},'expo-file-system/legacy':{EncodingType:{Base64:'base64'},readAsStringAsync:async uri=>{reads.push(uri);return 'native-bytes';}},'base64-arraybuffer':{encode:bytes=>Buffer.from(bytes).toString('base64')},'@/lib/api/attendance':{uploadCrewFileBase64:async(...args)=>{uploads.push(args);return 'https://storage.example/proof';}}})[name]};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/crewAttachments.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,context);return {api:context.exports,uploads,reads};
}
for(const [name,mime] of [['receipt.pdf','application/pdf'],['photo.png','image/png'],['photo.jpg','image/jpeg']])test(`web uploads ${name} without native file APIs`,async()=>{
 const x=load();assert.equal(await x.api.uploadCrewProofFile({name,uri:'blob:attachment',mimeType:mime}),'https://storage.example/proof');assert.equal(x.reads.length,0);assert.equal(x.uploads[0][0],'AQL/');assert.equal(x.uploads[0][2],mime);
});
test('existing remote attachments are reused',async()=>{const x=load();assert.equal(await x.api.uploadCrewProofFile({name:'receipt.pdf',uri:'https://storage.example/existing.pdf'}),'https://storage.example/existing.pdf');assert.equal(x.uploads.length,0);assert.equal(x.reads.length,0);});
test('native camera/document attachments keep the native read path',async()=>{const x=load('ios');await x.api.uploadCrewProofFile({name:'receipt.pdf',uri:'file:///receipt.pdf'});assert.equal(x.reads.length,1);assert.equal(x.uploads[0][0],'native-bytes');assert.equal(x.uploads[0][2],'application/pdf');});
test('web read failures prevent uploads',async()=>{const x=load('web',{ok:false});await assert.rejects(x.api.uploadCrewProofFile({name:'a.pdf',uri:'blob:expired'}),/select it again/);assert.equal(x.uploads.length,0);});
function crewUploader(error = null) {
 const source = fs.readFileSync('lib/api/attendance.ts', 'utf8');
 const ast = ts.createSourceFile('attendance.ts', source, ts.ScriptTarget.Latest, true);
 const fn = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'uploadCrewFileBase64');
 const buckets = [];
 const context = { exports: {}, decode: () => new ArrayBuffer(1), supabase: { storage: { from: bucket => {
  buckets.push(bucket);
  return { upload: async () => ({ error }), getPublicUrl: path => ({ data: { publicUrl: 'https://storage.example/crew-documents/' + path } }) };
 } } } };
 vm.runInNewContext(ts.transpileModule(fn.getText(ast), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
 return { upload: context.exports.uploadCrewFileBase64, buckets };
}
test('Crew uploads use the dedicated public crew bucket', async () => {
 const x = crewUploader(); const url = await x.upload('bytes', 'jpg', 'image/jpeg');
 assert.match(url, /crew-documents\/reimbursements\//); assert.deepEqual(x.buckets, ['crew-documents', 'crew-documents']);
});
test('Crew upload failures stop saving instead of storing a fake attachment', async () => {
 const x = crewUploader({ message: 'Bucket not found' });
 await assert.rejects(x.upload('bytes', 'jpg', 'image/jpeg'), /upload failed/);
 assert.deepEqual(x.buckets, ['crew-documents']);
});
