const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.createSourceFile('context.tsx', fs.readFileSync('context/FinanceContext.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function action(name, fail = false) {
    let initializer;
    function visit(node) { if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) initializer = node.initializer; ts.forEachChild(node, visit); }
    visit(source);
    const state = { refreshes: 0, rows: [{ id: 'request', statusTag: 'pending' }] };
    const saved = async () => { if (fail) throw Error('Write failed'); return { id: 'request' }; };
    const context = { exports: {}, console, user: { id: 'user' }, purchasingRequests: state.rows, reimbursementRequests: state.rows,
        refreshData: async background => { assert.equal(background, true); state.refreshes++; await new Promise(() => {}); },
        createPurchasingRequest: saved, createReimburseRequest: saved, updatePurchasingRequestApi: saved, updateReimburseRequestApi: saved,
        updatePurchasingStatus: saved, updateReimburseStatus: saved,
        setMePurchasing: fn => { state.rows = fn(state.rows); }, setTeamPurchasing() {}, setMeReimbursement: fn => { state.rows = fn(state.rows); }, setTeamReimbursement() {},
        require: () => ({ syncFinanceTaskOnResubmit: async () => new Promise(() => {}), syncFinanceActionOnDecision: async () => new Promise(() => {}) })
    };
    vm.runInNewContext(ts.transpileModule(`exports.run = ${initializer.getText(source)};`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
    return { run: context.exports.run, state };
}
async function completes(promise) {
    let timer;
    try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Blocked by background work')), 100); })]); }
    finally { clearTimeout(timer); }
}
for (const name of ['addPurchasingRequest', 'addReimburseRequest', 'updatePurchasingRequest', 'updateReimburseRequest']) {
    test(`${name} confirms the saved write without waiting for dashboard refresh or task sync`, async () => {
        const { run, state } = action(name);
        await completes(name.startsWith('add') ? run({}) : run('request', {}));
        assert.equal(state.refreshes, 1);
    });
}
for (const status of ['approved', 'revision']) {
    test(`${status} completes after the server write and updates the local row immediately`, async () => {
        const { run, state } = action('updateRequestStatus');
        await completes(run('request', 'purchasing', status, status));
        assert.equal(state.rows[0].statusTag, status);
        assert.equal(state.refreshes, 1);
    });
}
test('a rejected status write never updates local status or starts refresh', async () => {
    const { run, state } = action('updateRequestStatus', true);
    await assert.rejects(run('request', 'purchasing', 'approved', 'approved'), /Write failed/);
    assert.equal(state.rows[0].statusTag, 'pending');
    assert.equal(state.refreshes, 0);
});
test('HEIC preview is decoded to JPEG and ordinary images bypass conversion', async () => {
    let conversions = 0;
    const context = { exports: {}, require: () => ({ default: async () => { conversions++; return { type: 'image/jpeg' }; } }) };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/decodeFinanceImage.web.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
    assert.equal((await context.exports.decodeFinanceImage({ type: 'image/heic' }, 'IMG_5279.HEIC')).type, 'image/jpeg');
    const png = { type: 'image/png' };
    assert.equal(await context.exports.decodeFinanceImage(png, 'photo.png'), png);
    assert.equal(conversions, 1);
});
test('web upload sends the original File without base64 conversion and reuses an already uploaded path', async () => {
    const file = { size: 123, type: 'image/heic' };
    let uploads = 0;
    const context = { exports: {}, require: name => {
        if (name === 'react-native') return { Platform: { OS: 'web' } };
        if (name === './api/finance') return { uploadFinanceFile: async body => { assert.equal(body, file); uploads++; return 'purchase/original.heic'; }, uploadFinanceFileBase64: () => { throw Error('Unexpected base64 conversion'); } };
        return {};
    } };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/uploadFinanceAttachment.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
    const asset = { uri: 'blob:local-file', name: 'original.HEIC', mimeType: 'image/heic', file };
    const path = await context.exports.uploadFinanceAttachment(asset, 'purchase');
    assert.equal(path, 'purchase/original.heic');
    assert.equal(await context.exports.uploadFinanceAttachment({ ...asset, uploadedPath: path }, 'purchase'), path);
    assert.equal(uploads, 1);
});
test('uploads use the existing finance_attachments bucket first', async () => {
    const buckets = [];
    const blob = { type: 'image/heic' };
    const context = { exports: {}, Date, Math, Number, require: name => name === '../supabase' ? { supabase: { storage: { from: bucket => ({ upload: async (_path, body) => { buckets.push(bucket); assert.equal(body, blob); return { error: null }; } }) } } } : {} };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/api/finance.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
    await context.exports.uploadFinanceFile(blob, 'heic', 'image/heic', 'purchase');
    assert.deepEqual(buckets, ['finance_attachments']);
});
