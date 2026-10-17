const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const env = { ...dotenv.parse(fs.readFileSync(path.join(__dirname, '../.env.local'))), ...process.env };
const base = env.EXPO_PUBLIC_ADIDAYA_SUPABASE_URL;
const key = env.EXPO_PUBLIC_ADIDAYA_SUPABASE_ANON_KEY;
if (!base || !key) throw new Error('Adidaya configuration is missing.');
const headers = { apikey: key, Authorization: `Bearer ${key}` };
const tables = {
  profiles: 'id,department', user_roles: 'user_id,role', tenants: 'id,name,company_code', workspaces: 'id,tenant_id,name',
  tenant_members: 'tenant_id,user_id,role', projects: 'id,project_code,project_name', project_wbs_items: 'id,project_id,parent_id,wbs_code,title,is_leaf,level',
  tasks: 'id,title,status', actions: 'id,title,status', attendance_sessions: 'id,user_id,clock_in,clock_out', attendance_records: 'id,user_id,date',
  purchasing_requests: 'id,paid_amount,approval_status,financial_status', reimbursement_requests: 'id,status', resource_inventory: 'id', chat_channels: 'id', chat_messages: 'id', announcements: 'id', notifications: 'id,user_id,title,description,category,is_read,link,metadata', project_reports: 'id,report_type,content', reimbursement_invoices: 'id,request_id,invoice_url', funding_sources: 'id,provider,account_number,name', funding_source_transactions: 'id,reference_id', organization_role_permissions: 'id,can_manage_people', organization_system_roles: 'id,code', attendance_logs: 'id,user_id,type', work_schedules: 'id,start_time,end_time',
};
async function probe(table, columns) {
  const start = Date.now();
  try {
    const res = await fetch(`${base}/rest/v1/${table}?select=${encodeURIComponent(columns)}&limit=0`, { headers, signal: AbortSignal.timeout(12000) });
    const error = !res.ok ? await res.json().catch(() => ({})) : null;
    return { table, columns, status: res.status, accessibleSchema: res.ok, errorCode: error?.code, milliseconds: Date.now() - start };
  } catch (error) { return { table, columns, accessibleSchema: false, error: error.name }; }
}
(async () => {
  const entries = Object.entries(tables), results = [];
  for (let i = 0; i < entries.length; i += 4) results.push(...await Promise.all(entries.slice(i, i + 4).map(([table, columns]) => probe(table, columns))));
  const report = { checkedAt: new Date().toISOString(), mode: 'read-only anonymous schema probe; RLS may hide rows', results };
  fs.writeFileSync(path.join(__dirname, '../docs/schema-audit.json'), JSON.stringify(report, null, 2) + '\n');
  for (const result of results) console.log(result.table + ': ' + (result.accessibleSchema ? 'schema available' : result.errorCode || result.error || result.status));
  // Tenant identity is configuration, never inferred from an arbitrary first tenant.
  const response = await fetch(`${base}/rest/v1/tenants?select=id,name,company_code&name=ilike.*adidaya*&limit=2`, { headers, signal: AbortSignal.timeout(12000) });
  if (response.ok) {
    const rows = await response.json();
    console.log('Visible matching Adidaya organization records:', rows.length);
    if (rows.length === 1 && process.argv.includes('--configure-tenant')) {
      const envFile = path.join(__dirname, '../.env.local');
      let config = fs.readFileSync(envFile, 'utf8').replace(/^EXPO_PUBLIC_ADIDAYA_TENANT_ID=.*\n?/m, '');
      config += `EXPO_PUBLIC_ADIDAYA_TENANT_ID=${rows[0].id}\n`;
      fs.writeFileSync(envFile, config, { mode: 0o600 });
      console.log('Configured the verified Adidaya tenant UUID (no database writes).');
    }
  }
})().catch(error => { console.error(error.name + ': database probe could not complete.'); process.exitCode = 1; });
