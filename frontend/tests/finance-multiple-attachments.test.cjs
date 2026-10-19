const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}) {
    const context = { exports: {}, console, Date, Map, Set, Promise, require: name => { if (name === '../financePayments') return load('lib/financePayments.ts', { './financeAttachments': load('lib/financeAttachments.ts', {}) }); if (!(name in mocks)) throw Error(name); return mocks[name]; } };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
    return context.exports;
}
const attachments = load('lib/financeAttachments.ts');
test('all invoice and proof paths are retained across arrays, strings and duplicate sources', () => {
    const request = { invoices: [{ invoice_url: 'a.pdf', invoice_name: 'A' }, { invoice_url: 'b.png', invoice_name: 'B' }], invoice_url: 'a.pdf,c.pdf', payment_proof_url: ['p1.pdf', 'p2.png'], expense_proof_url: 'p3.pdf,p4.png' };
    assert.equal(attachments.financeReceipts(request).length, 3);
    assert.equal(attachments.financeProofs(request).length, 4);
});
test('every file starts loading and a failed file does not hide successful files', async () => {
    const started = [];
    const result = await attachments.resolveFinanceAttachments([
        { path: 'a.pdf', name: 'A' }, { path: 'missing.pdf', name: 'Missing' }, { path: 'b.png', name: 'B' }
    ], async path => { started.push(path); if (path === 'missing.pdf') throw Error('Missing'); return 'signed/' + path; });
    assert.equal(started.length, 3);
    assert.equal(result.length, 2);
    assert.equal(result[0].name, 'A');
    assert.equal(result[1].path, 'b.png');
});
test('fallback purchasing query retrieves all attachment rows even when the parent stores only one path', async () => {
    let requestReads = 0;
    const invoiceRows = ['a.pdf', 'b.png', 'c.pdf'].map((path, index) => ({ request_id: 'request', invoice_url: path, invoice_name: `File ${index + 1}` }));
    const db = { from(table) {
        const q = { select() { return this; }, eq() { return this; }, in() { return this; }, order() { return this; }, range() { return this; },
            then(resolve, reject) {
                let response = { data: [], error: null };
                if (table === 'purchasing_requests') response = ++requestReads === 1 ? { data: null, error: { message: 'Nested relationship unavailable' } } : { data: [{ id: 'request', description: 'Invoice', invoice_url: 'a.pdf', request_number: 1 }], error: null };
                if (table === 'purchasing_invoices') response = { data: invoiceRows, error: null };
                return Promise.resolve(response).then(resolve, reject);
            }
        }; return q;
    } };
    const presentation = load('lib/financeRequestPresentation.ts', { './financeAttachments': attachments });
    const api = load('lib/api/finance.ts', {
        '@/lib/financeAccess': {}, '@react-native-async-storage/async-storage': { getItem: async () => null },
        './financeSetup': { fetchOrganizationDepartments: async () => [], getFinanceCategories: async () => [], getFinanceDocumentRules: async () => ({ purchasing: { levels: { request: { customCode: 'PR', sequenceLength: 5 } } } }) },
        '../financeRequestPresentation': presentation, '../supabase': { supabase: db }, 'base64-arraybuffer': {}
    });
    const requests = await api.fetchPurchasingRequests('user', true);
    assert.equal(requests[0].invoices.length, 3);
    assert.equal(presentation.requestAttachments(requests[0]).length, 3);
});
