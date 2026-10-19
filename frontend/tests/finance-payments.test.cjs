const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, db, extras = {}) {
    const context = { exports: {}, Date, Math, Number, Set, console, require: name => {
        if (name === '../supabase') return { supabase: db };
        if (name === '../financePayments') return load('lib/financePayments.ts', db);
        if (name === './financeAttachments') return load('lib/financeAttachments.ts', db);
        if (name === '../financeRequestPresentation') return load('lib/financeRequestPresentation.ts', db);
        if (name === '@/lib/financeAccess') return { assertSuperadminFinanceEdit: async () => {}, assertFinanceMutation: async () => {}, ...extras };
        return {};
    } };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
    return context.exports;
}
const helpers = load('lib/financePayments.ts');
const payment = (id, amount, date = '2026-10-19') => ({ id, amount, date, proofs: [{ path: `payment-proof/${id}.pdf`, name: `${id}.pdf` }] });

test('partial/full payments and cents calculate cumulative paid and outstanding correctly', () => {
    assert.equal(helpers.validateFinancePayments([payment('a', 30), payment('b', 20)], 100).remaining, 50);
    assert.equal(helpers.validateFinancePayments([payment('a', 0.1), payment('b', 0.2)], 0.3).status, 'PAID');
    assert.equal(helpers.validateFinancePayments([], 100).paid, 0);
    for (const rows of [[payment('a', 101)], [payment('a', -1)], [payment('a', 0)], [payment('a', NaN)], [payment('a', 5, '2026-02-30')], [{ ...payment('a', 5), proofs: [] }]]) {
        assert.throws(() => helpers.validateFinancePayments(rows, 100));
    }
});
test('legacy aggregate proofs stay grouped; recorded/audited installments retain their actual amounts', () => {
    const legacy = helpers.financePaymentRecords({ id: 'legacy', paid_amount: 30, payment_date: '2026-10-01', payment_proof_url: 'a.pdf,b.pdf' });
    assert.equal(legacy.length, 1);
    assert.equal(legacy[0].amount, 30);
    assert.equal(legacy[0].proofs.length, 2);
    const audited = helpers.financePaymentRecords({ _payment_history: [{ id: 'audit', action: 'payment_processed', details: { amount: 20, payment_date: '2026-10-02', payment_proof_url: 'c.pdf' } }] });
    assert.equal(audited[0].amount, 20);
    assert.equal(audited[0].proofs[0].path, 'c.pdf');
});
function database(row) {
    const writes = [];
    return { writes, auth: { getUser: async () => ({ data: { user: { id: 'user' } } }) }, from(table) {
        let updates;
        const query = { select() { return this; }, eq() { return this; }, is() { return this; },
            update(payload) { updates = payload; return this; },
            single: async () => ({ data: table === 'funding_sources' ? { id: 'fund' } : row, error: null }),
            maybeSingle: async () => { if (updates) writes.push({ table, updates }); return { data: { id: 'request' }, error: null }; },
            then(resolve) { if (updates) writes.push({ table, updates }); return Promise.resolve({ error: null }).then(resolve); },
        }; return query;
    } };
}
for (const type of ['purchasing', 'reimbursement']) {
    test(`${type} admin installments roundtrip with amounts, dates, proof associations and derived status`, async () => {
        const db = database({ approval_status: 'APPROVED', financial_status: 'PAID', status: 'PAID', notes: '' });
        const api = load('lib/api/finance.ts', db);
        const rows = [payment('a', 30, '2026-10-01'), payment('b', 20, '2026-10-02')];
        const method = type === 'purchasing' ? 'updatePurchasingRequest' : 'updateReimburseRequest';
        await api[method]('user', 'request', { adminEdit: true, amount: 100, title: 'Transaction', payment_records: rows });
        const saved = db.writes[0].updates;
        const presentation = load('lib/financeRequestPresentation.ts');
        const read = presentation.readPurchasingNotes(saved.notes);
        assert.equal(read.commercial.payment_records[1].amount, 20);
        assert.equal(read.commercial.payment_records[1].proofs[0].path, 'payment-proof/b.pdf');
        assert.equal(saved.payment_date, '2026-10-02');
        assert.equal(saved.payment_proof_url, 'payment-proof/a.pdf,payment-proof/b.pdf');
        if (type === 'purchasing') { assert.equal(saved.paid_amount, 50); assert.equal(saved.financial_status, 'UNPAID'); }
        else assert.equal(saved.status, 'APPROVED');
        await assert.rejects(api[method]('user', 'request', { adminEdit: true, amount: 100, payment_records: [payment('over', 101)] }), /cannot exceed/);
        await assert.rejects(api[method]('user', 'request', { amount: 100, payment_records: rows }), /Only Superadmin/);
        assert.equal(db.writes.length, 1);
    });
}
test('a subsequent Pay appends the next installment without losing earlier proof/amount/date', async () => {
    const presentation = load('lib/financeRequestPresentation.ts');
    const old = payment('first', 30, '2026-10-01');
    const db = database({ id: 'request', amount: 100, approved_amount: 100, paid_amount: 30, financial_status: 'UNPAID', approval_status: 'APPROVED', payment_proof_url: old.proofs[0].path, notes: presentation.writePurchasingNotes('Keep notes', { payment_records: [old] }) });
    await load('lib/api/finance.ts', db).payFinanceRequest('user', 'request', 'purchasing', { amount: 20, payment_date: '2026-10-02', payment_proof_url: 'second.pdf', source_of_fund_id: 'fund' });
    const saved = db.writes[0].updates;
    const records = presentation.readPurchasingNotes(saved.notes).commercial.payment_records;
    assert.equal(records.length, 2);
    assert.equal(records[0].amount, 30);
    assert.equal(records[1].amount, 20);
    assert.equal(records[1].proofs[0].path, 'second.pdf');
    assert.equal(saved.paid_amount, 50);
    assert.equal(saved.financial_status, 'UNPAID');
});
test('normal field edits preserve existing payment records', async () => {
    const presentation = load('lib/financeRequestPresentation.ts');
    const db = database({ notes: presentation.writePurchasingNotes('Original notes', { payment_records: [payment('existing', 30)] }) });
    await load('lib/api/finance.ts', db).updatePurchasingRequest('user', 'request', { title: 'Corrected title', amount: 100, notes: 'Updated notes' });
    assert.equal(presentation.readPurchasingNotes(db.writes[0].updates.notes).commercial.payment_records[0].amount, 30);
});
