const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/projectScope.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
const { scopeOptions, resolveProjectScope } = context.exports;
const options = scopeOptions([
    { id: 'uuid-dnb', projectTypeId: 'design-build', name: 'Design-Build', code: 'DNB', isActive: true },
    { id: 'uuid-build', projectTypeId: 'build', name: 'Build Only', code: 'BLD', isActive: true },
    { id: 'disabled', name: 'Old Scope', isActive: false },
]);
test('Adidaya options preserve active scope IDs rather than generic project categories', () => {
    assert.equal(options.length, 2); assert.equal(options[0].id, 'design-build');
});
test('saved legacy scope takes precedence over generic type and typology', () => {
    assert.equal(resolveProjectScope({ type: 'design-build', projectType: 'Client Project', typology: 'Residential' }, options).name, 'Design-Build');
    assert.equal(resolveProjectScope({ projectType: 'bld' }, options).id, 'build');
    assert.equal(resolveProjectScope({ projectType: 'Client Project', typology: 'Residential' }, options), undefined);
});
