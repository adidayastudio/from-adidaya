const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function preview(response) {
    const context = { exports: {}, fetch: async () => response };
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
    await assert.rejects(preview({ ok: false, status: 404 })('url'), /tidak ditemukan/);
    await assert.rejects(preview({ ok: false, status: 403 })('url'), /belum bisa diakses/);
    await assert.rejects(preview({ ok: true, blob: async () => ({ type: 'image/png', size: 0 }) })('url'), /kosong/);
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
