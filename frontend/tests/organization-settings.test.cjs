const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(fetchImpl) {
  const context = { exports: {}, Date, ArrayBuffer, fetch: fetchImpl, require: name => ({ 'react-native': { Platform: { OS: 'web' } }, 'expo-file-system/legacy': {}, 'base64-arraybuffer': {} })[name] };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/organizationSettings.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
  return context.exports;
}
const current = { id: 'org-1', name: 'Adidaya Studio', company_code: 'ADY' };
function client({ row = true, error = null, uploadError = null } = {}) {
  const writes = [], uploads = [];
  return { writes, uploads,
    auth: { getUser: async () => ({ data: { user: { id: 'admin-1' } } }) },
    from(table) { return { update(value) { writes.push({ table, value }); return { eq(column, id) { writes.at(-1).id = id; return { select() { return { maybeSingle: async () => ({ data: row ? { ...current, ...value } : null, error }) }; } }; } }; } }; },
    storage: { from(bucket) { return { upload: async (path, body, options) => { uploads.push({ bucket, path, body, options }); return { error: uploadError }; }, getPublicUrl: path => ({ data: { publicUrl: 'https://storage.example/avatars/' + path } }) }; } }
  };
}
test('saves real schema fields and uses the returned database row', async () => {
  const api = load(); const db = client();
  const saved = await api.saveOrganization(db, current, current.id, 'admin', { name: ' Adidaya Updated ', primary_color: '#007AFF', contact_email: 'hello@adidaya.example', latitude: 0, longitude: 0, attendance_radius: 50, role: 'owner', company_code: 'ADY' });
  assert.equal(saved.name, 'Adidaya Updated'); assert.equal(db.writes[0].table, 'tenants'); assert.equal(db.writes[0].id, current.id);
  assert.equal(db.writes[0].value.latitude, 0); assert.equal(db.writes[0].value.role, undefined); assert.equal(db.writes[0].value.company_code, undefined);
});
test('zero updated rows and database rejection never report success', async () => {
  const api = load();
  await assert.rejects(api.saveOrganization(client({ row: false }), current, current.id, 'admin', { name: 'Update' }), /not updated/);
  await assert.rejects(api.saveOrganization(client({ error: new Error('RLS rejected') }), current, current.id, 'admin', { name: 'Update' }), /RLS rejected/);
});
test('only authorized admins can update the active organization', async () => {
  const api = load(); const db = client();
  for (const role of ['staff', 'lead', 'viewer']) await assert.rejects(api.saveOrganization(db, current, current.id, role, { name: 'Update' }), /access/);
  await assert.rejects(api.saveOrganization(db, current, 'another-org', 'admin', { name: 'Update' }), /access/);
  assert.equal(db.writes.length, 0);
});
test('invalid values and identity changes are rejected before database writes', async () => {
  const api = load(); const db = client();
  for (const payload of [{ name: '' }, { primary_color: '#oops' }, { latitude: NaN }, { longitude: 181 }, { attendance_radius: 0 }, { contact_email: 'invalid' }, { company_code: 'NEW' }]) await assert.rejects(api.saveOrganization(db, current, current.id, 'admin', payload));
  assert.equal(db.writes.length, 0);
});
test('maps logo alias to the real column without reuploading a stored URL', async () => {
  const api = load(); const db = client();
  await api.saveOrganization(db, current, current.id, 'admin', { logo_url: 'https://storage.example/logo.png' });
  assert.equal(db.writes[0].value.branding_logo_url, 'https://storage.example/logo.png'); assert.equal(db.writes[0].value.logo_url, undefined); assert.equal(db.uploads.length, 0);
});
test('uploads local logo bytes and stores a durable URL', async () => {
  const api = load(async () => ({ ok: true, headers: { get: () => 'image/png' }, arrayBuffer: async () => new ArrayBuffer(8) })); const db = client();
  await api.saveOrganization(db, current, current.id, 'admin', { branding_logo_url: 'blob:local-image' });
  assert.equal(db.uploads.length, 1); assert.equal(db.uploads[0].bucket, 'avatars'); assert.match(db.uploads[0].path, /^organization\/org-1\/admin-1\//); assert.match(db.writes[0].value.branding_logo_url, /^https:\/\//);
});
test('failed logo upload retains the unsaved draft and prevents a false database save', async () => {
  const api = load(async () => ({ ok: true, headers: { get: () => 'image/png' }, arrayBuffer: async () => new ArrayBuffer(8) })); const db = client({ uploadError: new Error('Upload denied') });
  await assert.rejects(api.saveOrganization(db, current, current.id, 'admin', { branding_logo_url: 'blob:local-image' }), /Upload denied/);
  assert.equal(db.writes.length, 0);
});

test('super admin role aliases keep edit access while supervisor never becomes superadmin', () => {
  const api = load();
  for (const role of ['superadmin', 'SUPER ADMIN', 'super_admin', 'Super-Admin']) {
    assert.equal(api.canEditOrganization(role), true);
    assert.equal(api.organizationRoleLabel(role), 'SUPER ADMIN');
  }
  for (const role of ['supervisor', 'admin assistant', 'member']) assert.equal(api.canEditOrganization(role), false);
  assert.equal(api.organizationRoleLabel('supervisor'), 'SUPERVISOR');
});

test('organization roles use membership then linked profile without operational-role substitution', () => {
 const api = load();
 assert.equal(api.resolveOrganizationRole({role:'Super Admin',status:'active'}, 'supervisor'), 'superadmin');
 assert.equal(api.resolveOrganizationRole({role:'Admin',status:'active'}, 'member'), 'admin');
 assert.equal(api.resolveOrganizationRole({role:'Member',status:'active'}, 'superadmin'), 'member');
 assert.equal(api.resolveOrganizationRole({role:'Super Admin',status:'inactive'}, 'superadmin'), 'member');
 assert.equal(api.resolveOrganizationRole(null, 'Super Admin'), 'superadmin');
 assert.equal(api.resolveOrganizationRole(null, null), 'member');
});

test('role and status use the atomic organization RPC',async()=>{
 const api=load();
 const client={async rpc(name,args){assert.equal(name,'adidaya_save_organization_member');return {data:{role:args.new_role,status:args.new_status},error:null};}};
 for(const status of ['active','inactive','archived']) await api.saveOrganizationMember(client,'org','user','Super Admin',status);
 await assert.rejects(api.saveOrganizationMember({async rpc(){return {error:{code:'PGRST202'}};}},'org','user','Admin','active'),/setup must be applied/);
});
test('Forma role options normalize aliases and never silently replace a legacy role', () => {
 const api=load();
 assert.deepEqual(Array.from(api.organizationRoleOptions('super_admin')), ['Member','Super Admin','Admin','Viewer','System']);
 assert.deepEqual(Array.from(api.organizationRoleOptions('Supervisor')), ['Member','Super Admin','Admin','Viewer','System','Supervisor']);
 assert.equal(api.organizationRoleLabel('viewer'),'VIEWER');
 assert.equal(api.organizationRoleLabel('system'),'SYSTEM');
});
