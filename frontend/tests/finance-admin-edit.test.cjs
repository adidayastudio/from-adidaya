const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks) {
    const context = { exports: {}, console, require: name => name === '../financePayments' ? load('lib/financePayments.ts', { './financeAttachments': load('lib/financeAttachments.ts', {}) }) : name === '@/lib/financeRoles' ? load('lib/financeRoles.ts', {}) : mocks[name] || {} };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
    return context.exports;
}
for (const role of ['superadmin', 'finance', 'admin', 'owner', null]) {
    test(`transaction correction authorizes the signed-in role: ${role}`, async () => {
        const db = { auth: { getUser: async () => ({ data: { user: { id: 'signed-in' } }, error: null }) }, from: () => ({
            select() { return this; }, eq(column, id) { assert.equal(id, 'signed-in'); return this; }, maybeSingle: async () => ({ data: { role }, error: null }),
        }) };
        const api = load('lib/financeAccess.ts', { '@/lib/supabase': { supabase: db } });
        if (role === 'superadmin') await api.assertSuperadminFinanceEdit();
        else await assert.rejects(api.assertSuperadminFinanceEdit(), /Only Superadmin/);
    });
}
for (const type of ['purchasing', 'reimbursement']) {
    test(`${type} correction changes request fields and proofs while preserving its paid workflow`, async () => {
        const writes = [];
        let authorized = false;
        const state = type === 'purchasing' ? { approval_status: 'APPROVED', financial_status: 'PAID', notes: '' } : { status: 'PAID', notes: '' };
        const db = { from: table => {
            const query = { update(payload) { assert.equal(authorized, true); writes.push({ table, payload }); return this; },
                select() { return this; }, eq() { return this; }, single: async () => ({ data: state, error: null }),
                then: resolve => resolve({ error: null }),
            }; return query;
        } };
        const presentation = load('lib/financeRequestPresentation.ts', {});
        const api = load('lib/api/finance.ts', { '../supabase': { supabase: db }, '../financeRequestPresentation': presentation,
            '@/lib/financeAccess': { assertSuperadminFinanceEdit: async () => { authorized = true; } },
        });
        await api[type === 'purchasing' ? 'updatePurchasingRequest' : 'updateReimburseRequest']('user', 'request', {
            adminEdit: true, title: 'Corrected title', description: 'Old title', amount: 500, notes: 'Corrected notes',
            date: '2026-10-19', approval_status: 'SUBMITTED', status: 'SUBMITTED', statusTag: 'pending',
            beneficiary_bank: 'BCA', beneficiary_number: '123', beneficiary_name: 'Account Holder',
            invoice_url: 'purchase/replacement.pdf', payment_proof_url: 'payment-proof/replacement.pdf', payment_date: '2026-10-18',
        });
        const saved = writes[0].payload;
        assert.equal(saved.description, 'Corrected title');
        assert.equal(saved.amount, 500);
        assert.equal(saved.payment_proof_url, 'payment-proof/replacement.pdf');
        assert.equal(saved.payment_date, '2026-10-18');
        assert.equal(saved.invoice_url, 'purchase/replacement.pdf');
        assert.equal(saved.beneficiary_number, '123');
        if (type === 'purchasing') { assert.equal(saved.approval_status, 'APPROVED'); assert.equal(saved.financial_status, 'PAID'); }
        else assert.equal(saved.status, 'PAID');
        assert.equal('adminEdit' in saved, false);
        assert.equal('paid_amount' in saved, false);
        assert.equal(writes.length, 1);
    });
}
test('web isolates native SwiftUI without redirecting wrapper imports back to themselves', () => {
    const context = { module: { exports: {} }, __dirname: process.cwd(), require: name => {
        if (name === 'expo/metro-config') return { getDefaultConfig: () => ({ resolver: {} }) };
        if (name === 'fs') return { existsSync: () => false };
        return require(name);
    } };
    vm.runInNewContext(fs.readFileSync('metro.config.js', 'utf8'), context);
    const resolve = context.module.exports.resolver.resolveRequest;
    const resolver = { resolveRequest: (_, name, platform) => ({ name, platform }) };
    assert.equal(resolve(resolver, './WorkSchedulePresetModal.ios', 'web').name, './WorkSchedulePresetModal.ios');
    assert.equal(resolve(resolver, './TransactionSheet.ios', 'ios').name, './TransactionSheet.ios');
    assert.match(resolve(resolver, '@expo/ui/swift-ui', 'web').filePath, /swiftui.web.ts$/);
    assert.match(resolve(resolver, '@expo/ui/swift-ui/modifiers', 'web').filePath, /swiftui.web.ts$/);
    assert.equal(resolve(resolver, '@expo/ui/swift-ui', 'ios').name, '@expo/ui/swift-ui');
});

for (const [membership, accountRole, allowed] of [
    [{ role: 'Super Admin', status: 'active' }, 'staff', true],
    [{ role: 'Member', status: 'active' }, 'superadmin', false],
    [{ role: 'Super Admin', status: 'inactive' }, 'superadmin', false],
    [null, 'superadmin', true],
]) {
    test(`organization role controls editing: ${JSON.stringify(membership)} / ${accountRole}`, async () => {
        const db = { auth: { getUser: async () => ({ data: { user: { id: 'signed-in' } }, error: null }) }, from: table => ({
            select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: table === 'adidaya_organization_members' ? membership : { role: accountRole }, error: null }),
        }) };
        const api = load('lib/financeAccess.ts', { '@/lib/supabase': { supabase: db } });
        if (allowed) await api.assertSuperadminFinanceEdit();
        else await assert.rejects(api.assertSuperadminFinanceEdit(), /Superadmin|inactive/);
    });
}

for (const role of ['SUPER ADMIN', 'Super Admin', 'superadmin', 'super_admin', 'super-admin', ' SuperAdmin ']) {
    test(`Superadmin spelling is normalized: ${role}`, () => {
        assert.equal(load('lib/financeRoles.ts', {}).isFinanceSuperadmin(role), true);
    });
}
for (const role of ['SUPERVISOR', 'supervisor', 'admin', 'administrator', 'finance', 'member', 'owner', 'ceo', null]) {
    test(`different role is not promoted to Superadmin: ${role}`, () => {
        assert.equal(load('lib/financeRoles.ts', {}).isFinanceSuperadmin(role), false);
    });
}
