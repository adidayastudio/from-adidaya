const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function preview(response) {
    const context = { exports: {}, fetch: async () => response, require: () => ({ decodeFinanceImage: async blob => blob }) };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/financeAttachmentPreview.ts', 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS }
    }).outputText, context);
    return context.exports.loadFinanceAttachmentPreview;
}
for (const [mime, name, kind] of [['application/pdf', 'invoice.pdf', 'pdf'], ['image/png', 'receipt.png', 'image']]) {
    test(`${name} uses its proper preview renderer`, async () => {
        const load = preview({ ok: true, headers: { get: () => mime }, blob: async () => ({ type: mime, size: 100 }) });
        assert.equal((await load(`https://files.example/${name}?token=signed`)).kind, kind);
    });
}
test('missing, inaccessible and empty files report errors instead of a black preview', async () => {
    await assert.rejects(preview({ ok: false, status: 404 })('url'), /not found/);
    await assert.rejects(preview({ ok: false, status: 403 })('url'), /unavailable/);
    await assert.rejects(preview({ ok: true, blob: async () => ({ type: 'image/png', size: 0 }) })('url'), /empty/);
});
test('the web SwiftUI adapter never loads native modules', () => {
    const context = { exports: {}, require: name => {
        if (name === 'react') return { createElement() {} };
        if (name === 'react-native') return { View() {}, Text() {}, TouchableOpacity() {}, TextInput() {}, Switch() {}, ActivityIndicator() {} };
        throw Error(`Native module loaded on web: ${name}`);
    } };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/swiftui.web.ts', 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS }
    }).outputText, context);
    assert.equal(typeof context.exports.Host, 'function');
    assert.equal(typeof context.exports.Button, 'function');
});
test('private storage URLs are signed with the current session before retrying', async () => {
    const calls = [];
    const origin = 'https://storage.example';
    const context = { exports: {}, URL, fetch: async url => {
        calls.push(url);
        return url.includes('/sign/')
            ? { ok: true, headers: { get: () => 'application/pdf' }, blob: async () => ({ type: 'application/pdf', size: 10 }) }
            : { ok: false, status: 400 };
    }, require: name => name === './supabase' ? { ADIDAYA_SUPABASE_URL: origin, supabase: {
        supabaseUrl: origin,
        storage: { from: bucket => ({ createSignedUrl: async path => {
            assert.equal(bucket, 'finance_attachments'); assert.equal(path, 'receipt.pdf');
            return { data: { signedUrl: origin + '/storage/v1/object/sign/finance_attachments/receipt.pdf?token=test' } };
        } }) },
    } } : { decodeFinanceImage: async blob => blob } };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/financeAttachmentPreview.ts', 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
    }).outputText, context);
    const result = await context.exports.loadFinanceAttachmentPreview(origin + '/storage/v1/object/public/finance_attachments/receipt.pdf');
    assert.equal(result.kind, 'pdf'); assert.equal(calls.length, 2);
});
