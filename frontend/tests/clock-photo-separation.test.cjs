const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
function load({storedIn=null,readError=null}={}){
 const writes=[];const session={id:'session',clock_in:new Date(Date.now()-60000).toISOString(),clock_out:null,photo_url:'photo-IN',is_overtime:false};
 const db={auth:{async getUser(){return {data:{user:{id:'user'}}};}},from(table){let operation='read',payload;const q={select(columns){if(table==='attendance_records')assert.equal(columns.includes('check_in_notes'),false);return this;},eq(){return this;},order(){return this;},update(p){operation='update';payload=p;return this;},upsert(p){operation='upsert';payload=p;return this;},insert(p){operation='insert';payload=p;return this;},then(resolve,reject){let result;if(operation!=='read'){writes.push({table,operation,payload});result={data:null,error:null};}else result=table==='attendance_sessions'?{data:[session],error:null}:table==='attendance_records'?{data:{check_in_photo_url:storedIn},error:readError}:{data:null,error:null};return Promise.resolve(result).then(resolve,reject);},single(){return this;},maybeSingle(){return this;}};return q;}};
 const context={exports:{},require:()=>({supabase:db}),Date,Set,console};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/api/adidayaClock.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,context);
 return {api:context.exports,writes};
}
for(const storedIn of ['original-IN',null])test(`clock out preserves an independent IN photo (${storedIn||'session recovery'})`,async()=>{
 const {api,writes}=load({storedIn});const result=await api.writeAdidayaClock('user','OUT',{photoUrl:'photo-OUT',latitude:1,longitude:1});assert.equal(result.success,true);
 const record=writes.find(w=>w.table==='attendance_records');assert.equal(record.payload.check_in_photo_url,storedIn||'photo-IN');assert.equal(record.payload.check_out_photo_url,'photo-OUT');assert.equal('check_in_notes' in record.payload,false);assert.notEqual(record.payload.check_in_photo_url,record.payload.check_out_photo_url);
 const session=writes.find(w=>w.table==='attendance_sessions');assert.equal(session.payload.photo_url,undefined);
});
test('failed IN-photo lookup never replaces it with OUT photo',async()=>{
 const {api,writes}=load({readError:new Error('Read failed')});const result=await api.writeAdidayaClock('user','OUT',{photoUrl:'photo-OUT',latitude:1,longitude:1});assert.ok(result.error);assert.equal(writes.some(w=>w.table==='attendance_records'),false);
});

test('plain PostgREST errors retain the backend reason in the clock failure message',async()=>{
 const {api}=load({readError:{code:'42703',message:'Missing attendance field'}});const result=await api.writeAdidayaClock('user','OUT',{photoUrl:'photo-OUT',latitude:1,longitude:1});assert.match(result.error,/Missing attendance field/);
});
