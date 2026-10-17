const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
test('direct report editor saves and closes through host callbacks without browser navigation', () => {
    let closes = 0, saves = 0;
    const value = { params: new URLSearchParams('type=daily&id=report-id'), onClose: () => closes++, onSaved: () => saves++ };
    const react = { createContext: () => ({}), useContext: () => value };
    const output = ts.transpileModule(fs.readFileSync('report-editor/navigation.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    const module = { exports: {} };
    vm.runInNewContext(output, { exports: module.exports, module, URLSearchParams, require: () => react });
    const api = module.exports;
    assert.equal(api.useSearchParams().get('id'), 'report-id');
    api.useRouter().push('/flow/reports/daily');
    api.useRouter().replace('/flow/reports/daily');
    api.useRouter().back();
    assert.equal(saves, 2); assert.equal(closes, 1);
});
