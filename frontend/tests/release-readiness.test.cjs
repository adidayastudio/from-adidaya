const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { backendProxy } = require('../server/backend-proxy.cjs');
function load(file, mocks) {
    const module = { exports: {} };
    const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
    vm.runInNewContext(compiled.outputText, { exports: module.exports, module, require: name => { if (name in mocks) return mocks[name]; throw Error('Unexpected import '+name); }, console, process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://db.example', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-key' } }, Date, Set, Map, URL, Number, setTimeout, clearTimeout });
    return module.exports;
}
function response() { return { statusCode: 0, headers: {}, setHeader(k,v) { this.headers[k] = v; }, end(body) { this.body = body; } }; }
const env = { ADIDAYA_BACKEND_ORIGIN: 'https://old-backend.example', EXPO_PUBLIC_ADIDAYA_SUPABASE_URL: 'https://db.example', EXPO_PUBLIC_ADIDAYA_SUPABASE_ANON_KEY: 'public-key', NODE_ENV: 'production' };
test('API proxy rejects an unconfigured upstream, recursive target and unauthenticated calls', async () => {
    let calls=0;const fetchImpl=async()=>{calls++;throw Error('must not fetch');};
    for(const [overrides,headers,status] of [[{ADIDAYA_BACKEND_ORIGIN:''},{host:'new.example'},503],[{ADIDAYA_BACKEND_ORIGIN:'https://new.example'},{host:'new.example'},503],[{}, {host:'new.example'},401]]) {
        const res=response();await backendProxy({ env:{...env,...overrides}, fetchImpl })({url:'/api/resources/merge',method:'POST',headers},res);assert.equal(res.statusCode,status);
    }assert.equal(calls,0);
});
test('API proxy verifies the user JWT and forwards only to the fixed backend with caller identity', async()=>{
    const calls=[];const proxy=backendProxy({env,fetchImpl:async(url,init)=>{calls.push({url:String(url),init});return calls.length===1?new Response(JSON.stringify({id:'user-1'}),{status:200}):new Response(JSON.stringify({success:true}),{headers:{'Content-Type':'application/json'}});}});
    const res=response();await proxy({url:'/api/resources/merge?mode=test',method:'POST',headers:{host:'new.example',authorization:'Bearer valid-test-token','content-type':'application/json',cookie:'secret-cookie'},body:{a:1}},res);
    assert.equal(res.statusCode,200);assert.equal(calls[1].url,'https://old-backend.example/api/resources/merge?mode=test');assert.equal(calls[1].init.headers.Authorization,'Bearer valid-test-token');assert.equal(calls[1].init.headers.cookie,undefined);assert.equal(calls[1].init.redirect,'manual');
});
test('inbox reads only signed-in user rows, paginates, preserves read state and scopes read updates',async()=>{
    const calls=[];const query={select(){return query;},eq(...args){calls.push(args);return query;},order(){return query;},range(){return Promise.resolve({data:[{id:'n-1',user_id:'u-1',title:'Approved',description:'Request approved',category:'finance',is_read:true,created_at:'2026-10-16T00:00:00Z',link:'/flow/finance?requestId=r-1'}],error:null});},update(){return query;},then(resolve){resolve({error:null});}};
    const api=load('lib/api/notifications.ts',{'../supabase':{APP_MODE:'adidaya',supabase:{auth:{getUser:async()=>({data:{user:{id:'u-1'}},error:null})},from(){return query;}}},'@react-native-async-storage/async-storage':{},'date-fns':{format:()=> '16/10/2026, 07:00:00'},'./crew':{}});
    const rows=await api.getLocalNotifications('u-1');assert.equal(rows[0].unread,false);assert.equal(rows[0].link,'/flow/finance?requestId=r-1');await api.markNotificationAsRead('db-n-1');assert.ok(calls.some(([key,value])=>key==='id'&&value==='n-1'));assert.equal(calls.filter(([key,value])=>key==='user_id'&&value==='u-1').length,2);
});
test('finance mutations reject staff approvals and cross-user changes but preserve authorized Finance roles',async()=>{
    let currentRole='staff',owner='other-user';
    const q={select(){return q;},eq(){return q;},maybeSingle:async()=>({data:{role:currentRole}}),single:async()=>({data:{created_by:owner,approval_status:'DRAFT'}})};
    const api=load('lib/financeAccess.ts',{'@/lib/supabase':{supabase:{auth:{getUser:async()=>({data:{user:{id:'u-1'}}})},from(){return q;}}},'@/lib/auth-utils':{canAccessFinanceTeam:role=>['admin','finance'].includes(role)}});
    await assert.rejects(api.assertFinanceMutation('purchasing','r-1',{approval_status:'APPROVED'}),/another user/);
    owner='u-1';await assert.rejects(api.assertFinanceMutation('purchasing','r-1',{approval_status:'APPROVED'}),/authorized/);
    await api.assertFinanceMutation('purchasing','r-1',{approval_status:'SUBMITTED'});
    currentRole='finance';await api.assertFinanceMutation('purchasing','r-1',{approval_status:'APPROVED'});
});
test('Clock rejects another identity, missing evidence and never writes through a Forma fallback',async()=>{
    let calls=0;const api=load('lib/api/adidayaClock.ts',{'@/lib/supabase':{supabase:{auth:{getUser:async()=>({data:{user:{id:'u-1'}}})},from(){calls++;throw Error('Unexpected write');}}}});
    assert.match((await api.writeAdidayaClock('other','IN',{})).error,/own attendance/);
    assert.match((await api.writeAdidayaClock('u-1','IN',{})).error,/photo/);assert.equal(calls,0);
});
test('notification destination maps legacy module links and rejects external or unknown URLs',()=>{
    const api=load('lib/notificationDestination.ts',{});
    assert.equal(api.notificationDestination('/flow/finance?requestId=r-1'),'/home/finance?requestId=r-1');
    for(const link of ['https://evil.example','//evil.example/path','/api/admin/run-migration','/\\evil.example'])assert.equal(api.notificationDestination(link),null);
});
test('payment preserves legacy request-only accounting, retains proofs, and detects concurrent changes',async()=>{
    const writes=[];let conflict=false;
    const request={id:'r-1',amount:100,approved_amount:100,paid_amount:20,approval_status:'APPROVED',financial_status:'PARTIALLY_PAID',payment_proof_url:'old.pdf'};
    const client={auth:{getUser:async()=>({data:{user:{id:'u-1'}}})},from(table){const q={select(){return q;},eq(){return q;},is(){return q;},single:async()=>({data:table==='funding_sources'?{id:'fund-1'}:request}),update(value){writes.push({table,value});return q;},maybeSingle:async()=>({data:conflict?null:{id:'r-1'},error:null})};return q;}};
    const api=load('lib/api/finance.ts',{'@/lib/financeAccess':{assertFinanceMutation:async()=>{}},'@react-native-async-storage/async-storage':{},'./financeSetup':{},'../financeRequestPresentation':{},'../supabase':{supabase:client},'base64-arraybuffer':{}});
    await api.payFinanceRequest('u-1','r-1','purchasing',{amount:30,source_of_fund_id:'fund-1',payment_date:'2026-10-16',payment_proof_url:'new.pdf'});
    assert.equal(writes.length,1);assert.equal(writes[0].table,'purchasing_requests');assert.equal(writes[0].value.paid_amount,50);assert.equal(writes[0].value.financial_status,'PARTIALLY_PAID');assert.equal(writes[0].value.payment_proof_url,'old.pdf,new.pdf');
    await assert.rejects(api.payFinanceRequest('u-1','r-1','purchasing',{amount:90,source_of_fund_id:'fund-1',payment_date:'2026-10-16',payment_proof_url:'new.pdf'}),/outstanding/);
    conflict=true;await assert.rejects(api.payFinanceRequest('u-1','r-1','purchasing',{amount:30,source_of_fund_id:'fund-1',payment_date:'2026-10-16',payment_proof_url:'new.pdf'}),/changed during payment/);
});
test('Clock reports critical storage failures instead of a false success',async()=>{
    const client={auth:{getUser:async()=>({data:{user:{id:'u-1'}}})},from(table){let writing=false;const q=new Proxy({}, {get(_,key){if(key==='then')return(resolve,reject)=>Promise.resolve(writing?{error:table==='attendance_sessions'?new Error('Session insert failed'):null}:{data:table==='profiles'?{work_schedules:null}:table==='attendance_sessions'?[]:null,error:null}).then(resolve,reject);return()=>{if(['insert','upsert','update'].includes(key))writing=true;return q;};}});return q;}};
    const api=load('lib/api/adidayaClock.ts',{'@/lib/supabase':{supabase:client}});
    const result=await api.writeAdidayaClock('u-1','IN',{photoUrl:'https://files.example/photo.jpg',latitude:0,longitude:0});
    assert.match(result.error,/could not be fully saved/);assert.equal(result.success,undefined);
});

test('preserved Next backend accepts caller JWT while retaining legacy cookie authentication', async () => {
 const calls=[];let bearer='Bearer user-jwt';
 const client={auth:{getUser:async token=>{calls.push(token);return {data:{user:{id:'u-1'}}};}}};
 const cookieClient={auth:{getUser:async()=>({data:{user:{id:'cookie-user'}}})}};
 const api=load(fs.existsSync('../utils/supabase/server.ts') ? '../utils/supabase/server.ts' : '../from-adidaya/utils/supabase/server.ts',{'@supabase/ssr':{createServerClient:()=>cookieClient},'next/headers':{headers:async()=>({get:()=>bearer}),cookies:async()=>({getAll:()=>[]})},'@supabase/supabase-js':{createClient:(_url,_key,options)=>{assert.equal(options.global.headers.Authorization,'Bearer user-jwt');return client;}}});
 assert.equal((await (await api.createClient()).auth.getUser()).data.user.id,'u-1');assert.equal(calls[0],'user-jwt');
 bearer=null;assert.equal((await (await api.createClient()).auth.getUser()).data.user.id,'cookie-user');
});
test('reimbursement payment uses its actual legacy schema without a paid_amount column',async()=>{
    const fields=[];let update;
    const client={auth:{getUser:async()=>({data:{user:{id:'u-1'}}})},from(table){const q={select(){return q;},eq(key){fields.push(key);return q;},is(key){fields.push(key);return q;},single:async()=>({data:table==='funding_sources'?{id:'fund-1'}:{id:'r-1',amount:100,status:'APPROVED'}}),update(value){update=value;return q;},maybeSingle:async()=>({data:{id:'r-1'},error:null})};return q;}};
    const api=load('lib/api/finance.ts',{'@/lib/financeAccess':{assertFinanceMutation:async()=>{}},'@react-native-async-storage/async-storage':{},'./financeSetup':{},'../financeRequestPresentation':{},'../supabase':{supabase:client},'base64-arraybuffer':{}});
    await assert.rejects(api.payFinanceRequest('u-1','r-1','reimbursement',{amount:50,source_of_fund_id:'fund-1',payment_date:'2026-10-16',payment_proof_url:'proof.pdf'}),/in full/);
    await api.payFinanceRequest('u-1','r-1','reimbursement',{amount:100,source_of_fund_id:'fund-1',payment_date:'2026-10-16',payment_proof_url:'proof.pdf'});
    assert.equal(update.status,'PAID');assert.equal('paid_amount' in update,false);assert.equal(fields.includes('paid_amount'),false);
});

test('mark-all-read is scoped to the authenticated inbox and propagates database failures', async () => {
    const filters = [];
    let failure = null;
    const query = { update(){ return query; }, eq(...args){ filters.push(args); return query; }, then(resolve){ resolve({ error: failure }); } };
    const api = load('lib/api/notifications.ts', {
        '../supabase': { APP_MODE: 'adidaya', supabase: { auth: { getUser: async () => ({ data: { user: { id: 'me' } }, error: null }) }, from: () => query } },
        '@/lib/financeTransactionCategories': {}, '@react-native-async-storage/async-storage': {}, 'date-fns': {}, './crew': {},
    });
    await api.markNotificationsAsRead();
    assert.ok(filters.some(([column,value]) => column === 'user_id' && value === 'me'));
    assert.ok(filters.some(([column,value]) => column === 'is_read' && value === false));
    failure = new Error('Update failed');
    await assert.rejects(api.markNotificationsAsRead(), /Update failed/);
});

test('push notification clicks map legacy links and reject external destinations', async () => {
    const listeners = {}, destinations = [];
    vm.runInNewContext(fs.readFileSync('public/sw.js', 'utf8'), {
        URL,
        self: { location: { origin: 'https://preview.example' }, addEventListener: (name, handler) => { listeners[name] = handler; }, clients: { matchAll: async () => [], openWindow: async url => destinations.push(url) } },
    });
    async function click(link) { let done; listeners.notificationclick({ notification: { close(){}, data: { link } }, waitUntil(promise){ done = promise; } }); await done; }
    await click('/flow/finance?requestId=abc');
    await click('https://untrusted.example/path');
    assert.equal(destinations[0], 'https://preview.example/home/finance?requestId=abc');
    assert.equal(destinations[1], 'https://preview.example/notifications');
});
