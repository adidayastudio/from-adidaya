const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/projectSorting.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
const { compareProjectNumbers } = context.exports;
const project = { title: 'New', number: '001' };
test('numeric project order handles padding and puts missing numbers last', () => {
    assert.ok(compareProjectNumbers({ ...project, number: '9' }, { ...project, number: '010' }) < 0);
    assert.ok(compareProjectNumbers({ ...project, number: '' }, project) > 0);
});
