const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.createSourceFile('finance.tsx', fs.readFileSync('app/(tabs)/home/finance.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let handler;
function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'getActionButtons') handler = node.initializer.getText(source);
    ts.forEachChild(node, visit);
}
visit(source);
function actions(item, user = { id: 'owner' }) {
    const context = { exports: {}, user, hasTeamAccess: false, activeScope: 'personal' };
    vm.runInNewContext(ts.transpileModule(`exports.run = ${handler}`, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
    return Array.from(context.exports.run(item), action => action.id);
}
for (const status of ['Need Revision', 'NEED_REVISION', 'REVISION', 'REVISED', 'Rejected']) {
    test(`reimbursement owner can edit and resubmit ${status}`, () => {
        assert.deepEqual(actions({ user_id: 'owner', status }), ['delete', 'edit', 'submit']);
    });
}
test('purchasing owner retains revision actions', () => {
    assert.deepEqual(actions({ created_by: 'owner', status: 'Need Revision' }), ['delete', 'edit', 'submit']);
});
test('another staff member cannot edit the reimbursement', () => {
    assert.deepEqual(actions({ user_id: 'other', status: 'Need Revision' }), []);
});
test('a signed-out user cannot become owner of a request without an owner', () => {
    assert.deepEqual(actions({ status: 'Need Revision' }, null), []);
});
