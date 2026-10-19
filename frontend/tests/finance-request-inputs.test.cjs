const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}, globals = {}) {
    const context = { exports: {}, console, Date, Map, Set, Number, URL, setTimeout, clearTimeout, ...globals,
        require: name => { if (name === '../financePayments') return load('lib/financePayments.ts', { './financeAttachments': load('lib/financeAttachments.ts', {}) }); if (!(name in mocks)) throw Error(`Unexpected import ${name}`); return mocks[name]; } };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
    }).outputText, context);
    return context.exports;
}
function financeApi(deleteFailure = false) {
    const writes = [];
    const db = { from(table) {
        let operation, payload;
        const query = {
            insert(value) { operation = 'insert'; payload = value; return this; },
            update(value) { operation = 'update'; payload = value; return this; },
            delete() { operation = 'delete'; return this; },
            select() { return this; }, eq() { return this; }, single() { return this; },
            then(resolve, reject) {
                writes.push({ table, operation, payload });
                return Promise.resolve({ data: { id: 'saved-request' }, error: deleteFailure && operation === 'delete' ? new Error('Delete failed') : null }).then(resolve, reject);
            }
        };
        return query;
    } };
    const attachments = load('lib/financeAttachments.ts');
    const presentation = load('lib/financeRequestPresentation.ts', { './financeAttachments': attachments });
    return { writes, presentation, api: load('lib/api/finance.ts', {
        '@/lib/financeAccess': {}, '@react-native-async-storage/async-storage': {}, './financeSetup': {},
        '../financeRequestPresentation': presentation, '../supabase': { supabase: db }, 'base64-arraybuffer': {}
    }) };
}
const payload = {
    department_id: 'dept-1', project_id: null, date: '2026-10-19', description: 'Adjustment', type: 'MATERIAL', category: 'GENERAL',
    amount: -12.5, invoice_url: 'invoice.pdf', expense_proof_url: 'proof.png',
    beneficiary_bank: 'Bank', beneficiary_number: '123', beneficiary_name: 'Owner',
    items: [{ name: 'Adjustment', qty: 0.5, unit: 'pcs', unitPrice: -25, unit_price: -25, total: -12.5 }]
};
for (const method of ['createPurchasingRequest', 'createReimburseRequest']) {
    for (const target of [{ project_id: 'project-1', department_id: null }, { project_id: null, department_id: 'dept-1' }, { project_id: 'project-1', department_id: 'dept-1' }]) {
        test(`${method} accepts either target and preserves signed decimals (${JSON.stringify(target)})`, async () => {
            const { api, writes, presentation } = financeApi();
            await api[method]('user', { ...payload, ...target });
            const request = writes.find(write => write.table.endsWith('_requests'));
            assert.equal(request.payload[0].amount, -12.5);
            assert.equal(request.payload[0].project_id, target.project_id);
            if (target.department_id) assert.equal(presentation.readPurchasingNotes(request.payload[0].notes).commercial.department_id, 'dept-1');
            const items = writes.find(write => write.table.endsWith('_items'));
            assert.equal(items.payload[0].unit_price, -25);
            assert.equal(items.payload[0].qty, 0.5);
        });
    }
    test(`${method} rejects missing targets before writing`, async () => {
        const { api, writes } = financeApi();
        await assert.rejects(api[method]('user', { ...payload, project_id: null, department_id: null }), /Project or Department/);
        assert.equal(writes.length, 0);
    });
}
test('reimbursement totals include negative adjustments and decimals without clamping', async () => {
    const { api, writes } = financeApi();
    await api.createReimburseRequest('user', { ...payload, amount: 999, items: [
        { name: 'Expense', qty: 1.5, unitPrice: 100.25 }, { name: 'Adjustment', qty: 1, unitPrice: -10.125 }
    ] });
    assert.equal(writes[0].payload[0].amount, 140.25);
});
test('reimbursement rejects non-finite values and retains invoice/proof requirements', async () => {
    const { api, writes } = financeApi();
    for (const bad of [NaN, Infinity]) await assert.rejects(api.createReimburseRequest('user', { ...payload, items: [{ name: 'Bad', qty: 1, unitPrice: bad }] }), /valid numbers/);
    await assert.rejects(api.createReimburseRequest('user', { ...payload, invoice_url: '' }), /Invoice/);
    await assert.rejects(api.createReimburseRequest('user', { ...payload, expense_proof_url: '' }), /proof/);
    assert.equal(writes.length, 0);
});
test('a reimbursement draft can save zero estimates before documents are available', async () => {
    const { api, writes } = financeApi();
    await api.createReimburseRequest('user', { ...payload, status: 'DRAFT', invoice_url: '', expense_proof_url: '', items: [{ name: 'Draft', qty: 1, unitPrice: 0 }] });
    assert.equal(writes[0].payload[0].status, 'DRAFT');
    assert.equal(writes[0].payload[0].amount, 0);
    assert.equal(writes[1].payload[0].unit_price, 0);
});
test('failed deletion stops item replacement rather than duplicating rows', async () => {
    for (const method of ['updatePurchasingRequest', 'updateReimburseRequest']) {
        const { api, writes } = financeApi(true);
        await assert.rejects(api[method]('user', 'request', payload), /previous rows could not be replaced/);
        assert.equal(writes.some(write => write.table.endsWith('_items') && write.operation === 'insert'), false);
    }
});
const setup = load('lib/api/financeSetup.ts', { '@/lib/financeTransactionCategories': {}, '@react-native-async-storage/async-storage': {}, '../supabase': {} });
test('configured project and department requirements accept one selection', () => {
    const rules = { request: { project: true, department: true } };
    for (const target of [{ projectId: 'p' }, { departmentId: 'd' }]) {
        assert.equal(setup.validateFinanceForm('request', { title: 'Request', items: [{}], ...target }, rules).isValid, true);
    }
    assert.equal(setup.validateFinanceForm('request', { title: 'Request', items: [{}] }, rules).isValid, false);
});
function uploader(platform = 'web', readFailure = false) {
    const writes = [], reads = [];
    const api = load('lib/uploadFinanceAttachment.ts', {
        'react-native': { Platform: { OS: platform } },
        'expo-file-system/legacy': { EncodingType: { Base64: 'base64' }, readAsStringAsync: async uri => { reads.push(uri); if (readFailure) throw Error('Read failed'); return 'native-base64'; } },
        'base64-arraybuffer': { encode: bytes => Buffer.from(bytes).toString('base64') },
        './api/finance': { uploadFinanceFileBase64: async (...args) => { writes.push(args); return 'saved/attachment'; } }
    }, { fetch: async uri => { reads.push(uri); if (readFailure) throw Error('Read failed'); return { ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }; } });
    return { api, writes, reads };
}
test('web blob PDF is uploaded with original filename extension and MIME', async () => {
    const { api, writes } = uploader();
    assert.equal(await api.uploadFinanceAttachment({ uri: 'blob:temporary', name: 'invoice.PDF', mimeType: 'application/pdf' }, 'purchase'), 'saved/attachment');
    assert.deepEqual(writes[0], ['AQID', 'pdf', 'application/pdf', 'purchase']);
});
test('web data image and native content PDF are persisted as file contents', async () => {
    const web = uploader();
    await web.api.uploadFinanceAttachment({ uri: 'data:image/png;base64,AQID' }, 'reimburse');
    assert.deepEqual(web.writes[0], ['AQID', 'png', 'image/png', 'reimburse']);
    const native = uploader('android');
    await native.api.uploadFinanceAttachment({ uri: 'content://cache/123', fileName: 'proof.pdf' }, 'reimburse');
    assert.deepEqual(native.writes[0], ['native-base64', 'pdf', 'application/pdf', 'reimburse']);
});
test('already saved attachments are retained and read failures never produce temporary URLs', async () => {
    const saved = uploader();
    assert.equal(await saved.api.uploadFinanceAttachment({ uri: 'https://saved.example/receipt.pdf', path: 'purchase/receipt.pdf' }, 'purchase'), 'purchase/receipt.pdf');
    assert.equal(saved.writes.length, 0);
    const broken = uploader('web', true);
    await assert.rejects(broken.api.uploadFinanceAttachment({ uri: 'blob:temporary', name: 'invoice.pdf' }, 'purchase'), /Read failed/);
    assert.equal(broken.writes.length, 0);
});
test('upload progress advances only after storage confirms the file', async () => {
    let confirmStorage;
    let progress = 0;
    const api = load('lib/uploadFinanceAttachment.ts', {
        'react-native': { Platform: { OS: 'web' } }, 'expo-file-system/legacy': {}, 'base64-arraybuffer': {},
        './api/finance': { uploadFinanceFileBase64: () => new Promise(resolve => { confirmStorage = resolve; }) }
    });
    const pending = api.uploadFinanceAttachment({ uri: 'data:image/png;base64,AQID', name: 'receipt.png' }, 'purchase', () => { progress++; });
    assert.equal(progress, 0);
    confirmStorage('saved/receipt.png');
    assert.equal(await pending, 'saved/receipt.png');
    assert.equal(progress, 1);
    await api.uploadFinanceAttachment({ uri: 'saved/receipt.png' }, 'purchase', () => { progress++; });
    assert.equal(progress, 1);
});
test('failed storage keeps the upload incomplete and identifies the failed file', async () => {
    let progress = 0;
    const api = load('lib/uploadFinanceAttachment.ts', {
        'react-native': { Platform: { OS: 'web' } }, 'expo-file-system/legacy': {}, 'base64-arraybuffer': {},
        './api/finance': { uploadFinanceFileBase64: async () => { throw Error('Storage unavailable'); } }
    });
    await assert.rejects(api.uploadFinanceAttachment({ uri: 'data:application/pdf;base64,AQID', name: 'invoice.pdf' }, 'purchase', () => { progress++; }), /invoice.pdf.*Storage unavailable/);
    assert.equal(progress, 0);
});
test('multiple invoice paths remain available if the nested attachment query is unavailable', () => {
    const attachments = load('lib/financeAttachments.ts');
    const presentation = load('lib/financeRequestPresentation.ts', { './financeAttachments': attachments });
    const rows = presentation.requestAttachments({ invoice_url: 'purchase/a.pdf,purchase/b.png,purchase/c.pdf' });
    assert.equal(rows.length, 3);
    assert.equal(rows[2].invoice_url, 'purchase/c.pdf');
});

for (const method of ['createPurchasingRequest', 'updatePurchasingRequest']) {
    test(`${method} sends only the actual purchasing item name column`, async () => {
        const { api, writes } = financeApi();
        if (method === 'createPurchasingRequest') await api[method]('user', payload);
        else await api[method]('user', 'request', payload);
        const insert = writes.find(write => write.table === 'purchasing_items' && write.operation === 'insert');
        assert.equal(insert.payload[0].name, 'Adjustment');
        assert.equal('item_name' in insert.payload[0], false);
        assert.equal(api.PURCHASING_COLUMNS.includes('item_name'), false);
    });
}
