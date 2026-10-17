const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}, globals = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    reportDiagnostics: true,
  });
  assert.equal(source.diagnostics.length, 0, file + ' syntax');
  vm.runInNewContext(source.outputText, { module, exports: module.exports, require: id => id in mocks ? mocks[id] : require(id), process: { env: {} }, console, setTimeout, clearTimeout, ...globals }, { filename: file });
  return module.exports;
}
const storage = { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} };

test('one Adidaya client; saved Forma selection and Forma environment cannot switch databases', () => {
  const calls = [];
  const sdk = { createClient: (...args) => { calls.push(args); return { auth: {} }; } };
  const api = load('lib/supabase.ts', { '@supabase/supabase-js': sdk, '@react-native-async-storage/async-storage': storage, 'react-native': { Platform: { OS: 'web' } } }, {
    process: { env: { EXPO_PUBLIC_APP_MODE: 'forma', EXPO_PUBLIC_FORMA_SUPABASE_URL: 'https://wrong.example', EXPO_PUBLIC_ADIDAYA_SUPABASE_URL: 'https://adidaya.example', EXPO_PUBLIC_ADIDAYA_SUPABASE_ANON_KEY: 'public-test-key' } },
    window: { localStorage: { getItem: () => 'forma' } },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'https://adidaya.example');
  assert.equal(calls[0][2].auth.storageKey, 'adidaya-preview-auth-token');
  assert.equal(api.supabase, api.supabaseAdidaya);
  assert.equal(api.supabaseForma, api.supabaseAdidaya);
  assert.equal(api.APP_MODE, 'adidaya');
  assert.equal(api.getActiveBackend(), 'adidaya');
  assert.throws(() => api.setActiveClient('forma'), /only supports/);
});

test('missing configuration fails explicitly, without falling back to Forma', () => {
  assert.throws(() => load('lib/supabase.ts', { '@supabase/supabase-js': {}, '@react-native-async-storage/async-storage': storage, 'react-native': { Platform: { OS: 'web' } } }), /configuration is missing/);
});

test('role normalization preserves finance/staff, and unknown roles never become admin', () => {
  const file = ts.createSourceFile('UserProvider.tsx', fs.readFileSync('context/UserProvider.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let initializer;
  function visit(node) { if (ts.isVariableDeclaration(node) && node.name.getText(file) === 'normalizeRole') initializer = node.initializer.getText(file); ts.forEachChild(node, visit); }
  visit(file); assert.ok(initializer);
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule('module.exports = ' + initializer, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module });
  const normalize = module.exports;
  assert.equal(normalize(null), 'staff');
  assert.equal(normalize('unrecognized-role'), 'staff');
  assert.equal(normalize('staff'), 'staff');
  assert.equal(normalize('finance'), 'finance');
  assert.equal(normalize('administrator'), 'administrator');
  assert.equal(normalize('owner'), 'owner');
});

function queryClient() {
  const calls = [];
  const client = { from(table) {
    calls.push(['from', table]);
    const query = new Proxy({}, { get(_, name) {
      if (name === 'then') return (resolve, reject) => Promise.resolve({ data: [], error: null }).then(resolve, reject);
      return (...args) => { calls.push([name, ...args]); return query; };
    } });
    return query;
  } };
  return { client, calls };
}

test('Projects stays on the dedicated query path even with a real organization UUID', async () => {
  const { client, calls } = queryClient();
  const api = load('lib/api/projects.ts', { '../supabase': { supabase: client, supabaseAdidaya: client, supabaseForma: client, APP_MODE: 'adidaya' }, './tasks': { WBS_TEMPLATES: [] }, '@react-native-async-storage/async-storage': storage });
  assert.equal((await api.getProjects('0b29e53c-1419-4764-95e0-fc52c5ee45da')).length, 0);
  assert.equal(calls.filter(call => call[0] === 'or').length, 0);
});

test('legacy Tasks, Actions and assignees do not lose null-tenant records to Forma filters', async () => {
  const { client, calls } = queryClient();
  const api = load('lib/api/tasks.ts', { '../supabase': { supabase: client, APP_MODE: 'adidaya' }, './notifications': { addLocalNotification: async () => {} } });
  await api.getTasks('organization-id'); await api.getActions('organization-id'); await api.getProfiles('organization-id');
  assert.equal(calls.filter(call => ['or', 'eq'].includes(call[0]) && /tenant_id|workspace_id/.test(String(call[1]))).length, 0);
});

test('app-entry location and Clock share one request, then reuse a recent location', async () => {
  const requests = [];
  const api = load('lib/attendanceLocation.ts', { 'react-native': { Platform: { OS: 'web' } }, 'expo-location': {} }, { navigator: { geolocation: { getCurrentPosition: (ok, fail, options) => requests.push({ ok, fail, options }) } } });
  const first = api.getAttendancePosition(), second = api.getAttendancePosition();
  assert.equal(first, second); assert.equal(requests.length, 1);
  requests[0].ok({ coords: { latitude: -6.2, longitude: 106.8, accuracy: 20 }, timestamp: Date.now() });
  await first; await api.getAttendancePosition();
  assert.equal(requests.length, 1);
  const fresh = api.getAttendancePosition(true);
  assert.equal(requests[1].options.maximumAge, 0);
  requests[1].fail({ code: 1 });
  await assert.rejects(fresh, /enable location/);
  assert.equal(requests.length, 2);
});

test('native location watchdog ends a stalled request', async () => {
  let expire;
  const api = load('lib/attendanceLocation.ts', { 'react-native': { Platform: { OS: 'ios' } }, 'expo-location': { requestForegroundPermissionsAsync: async () => ({ status: 'granted' }), getCurrentPositionAsync: () => new Promise(() => {}), Accuracy: { Balanced: 3 } } }, { setTimeout: callback => { expire = callback; return 1; }, clearTimeout() {} });
  const pending = api.getAttendancePosition(); expire();
  await assert.rejects(pending, /timed out/);
});

test('attendance and geofence reminder entry points cannot send notifications', async () => {
  const api = load('lib/notificationService.ts', { './supabase': { APP_MODE: 'adidaya' }, '@react-native-async-storage/async-storage': storage, 'react-native': { Platform: { OS: 'web' } }, 'expo-constants': {}, './api/attendance': new Proxy({}, { get: () => () => { throw new Error('Must not query attendance for disabled reminders'); } }), './constants/holidays': { HOLIDAYS_2026: [] } });
  await api.checkLocalAttendanceNotifications('test-user');
  await api.checkGeofenceNotification(0, 0, 'test-user');
});

test('app-entry location prompts only once even after permission denial', async () => {
  let calls = 0;
  const api = load('lib/attendanceLocation.ts', { 'expo-location': {}, 'react-native': { Platform: { OS: 'web' } } }, { navigator: { geolocation: { getCurrentPosition: (_ok, fail) => { calls++; fail({ code: 1 }); } } } });
  api.prepareAttendancePositionOnce();
  await new Promise(resolve => setImmediate(resolve));
  api.prepareAttendancePositionOnce();
  assert.equal(calls, 1);
});

test('Forma broadcasts and browser schedulers cannot write Adidaya notifications', async () => {
 const api = load('lib/api/notifications.ts', { '../supabase': { APP_MODE: 'adidaya', supabase: { auth: { getUser() { throw Error('unexpected call'); } } } }, '@react-native-async-storage/async-storage': storage, './crew': {}, 'date-fns': { format() {} } });
 assert.equal(await api.addLocalNotification({ text: 'test', category: 'system' }), null);
 await api.checkAndTriggerSchedulers('workspace');
});

test('Reports read Adidaya project_reports with pagination and preserve content', async () => {
 const calls = []; let page = 0;
 const client = { from(table) { calls.push(table); const q = { select() { return q; }, order() { return q; }, range(a, b) { calls.push([a,b]); return Promise.resolve({ data: page++ === 0 ? Array.from({ length: 500 }, (_, id) => ({ id })) : [{ id: 'last' }], error: null }); } }; return q; } };
 const api = load('lib/api/projectReports.ts', { '@/lib/supabase': { supabase: client } });
 assert.equal((await api.getAdidayaProjectReports()).length, 501);
 assert.deepEqual(JSON.parse(JSON.stringify(calls)), ['project_reports',[0,499],'project_reports',[500,999]]);
 assert.equal(api.reportContentFields('{"notes":"Actual Adidaya report"}')[0][1], 'Actual Adidaya report');
 assert.equal(api.reportContentFields('Legacy report notes')[0][1], 'Legacy report notes');
});

test('Reports surface database failures instead of displaying mock maintenance data', async () => {
 const q = { select() { return q; }, order() { return q; }, range() { return Promise.resolve({ data: null, error: new Error('Access denied') }); } };
 const api = load('lib/api/projectReports.ts', { '@/lib/supabase': { supabase: { from() { return q; } } } });
 await assert.rejects(api.getAdidayaProjectReports(), /Access denied/);
});

test('finance merges related and legacy receipts without dropping or duplicating files', () => {
 const api = load('lib/financeAttachments.ts');
 const rows = api.financeReceipts({ existingInvoices: [{ invoice_url: 'a.pdf', invoice_name: 'Invoice A' }, { invoice_url: 'b.pdf', invoice_name: 'Invoice B' }], invoices: [{ invoice_url: 'a.pdf' }], invoice_url: 'a.pdf, c.pdf' });
 assert.equal(rows.length, 3); assert.equal(rows[1].name, 'Invoice B');
 assert.deepEqual(Array.from(rows, r => r.path), ['a.pdf', 'b.pdf', 'c.pdf']);
});
test('finance parses arrays, JSON and comma-separated proofs and ignores empty values', () => {
 const api = load('lib/financeAttachments.ts');
 const rows = api.financeProofs({ payment_proof_url: ' a.pdf, b.pdf, ', proof_url: '["b.pdf", "c.pdf"]', expense_proof_url: { url: 'd.pdf', name: 'Expense proof' } });
 assert.deepEqual(Array.from(rows, r => r.path), ['a.pdf', 'b.pdf', 'c.pdf', 'd.pdf']);
 assert.equal(api.normalizeFinanceAttachments('data:image/png;base64,AAAA').length, 1);
 assert.equal(api.financeReceipts(null).length, 0);
});
