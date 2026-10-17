const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function deleteHandler(moduleType, error = null, canManageSetup = true) {
  const source = ts.createSourceFile('setup.tsx', fs.readFileSync('app/people-setup/[id].tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handler;
  function visit(node) { if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'executeDelete') handler = node.initializer.getText(source); ts.forEachChild(node, visit); }
  visit(source);
  const calls = []; let refreshes = 0;
  const context = { canManageSetup, exports: {}, activeModule: moduleType, fetchData: async () => { refreshes++; }, supabase: { from(table) { return { delete() { return { eq: async (column, value) => { calls.push({ table, column, value }); return { error }; } }; } }; } } };
  vm.runInNewContext(ts.transpileModule('exports.run = ' + handler, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context);
  return { run: context.exports.run, calls, refreshes: () => refreshes };
}
test('setup deletion targets only the chosen record and never unlinks employee assignments', async () => {
  for (const [moduleType, table] of Object.entries({ departments: 'organization_departments', positions: 'organization_positions', levels: 'organization_levels', contract_types: 'employment_types', work_statuses: 'work_status' })) {
    const h = deleteHandler(moduleType);
    assert.equal(h.calls.length, 0);
    await h.run({ id: 'chosen-record' });
    assert.equal(h.calls.length, 1);
    assert.equal(h.calls[0].table, table);
    assert.equal(h.calls[0].column, 'id');
    assert.equal(h.calls[0].value, 'chosen-record');
    assert.equal(h.refreshes(), 1);
  }
});
test('a rejected deletion surfaces the failure without claiming a successful refresh', async () => {
  const error = new Error('Record is still referenced');
  const h = deleteHandler('departments', error);
  await assert.rejects(h.run({ id: 'chosen-record' }), /still referenced/);
  assert.equal(h.refreshes(), 0);
});
test('an empty selection never writes to the database', async () => {
  const h = deleteHandler('departments'); await h.run(null);
  assert.equal(h.calls.length, 0);
});

test('non-management callers cannot delete People setup records', async () => {
  const h = deleteHandler('departments', null, false);
  await assert.rejects(h.run({ id: 'chosen-record' }), /access is required/);
  assert.equal(h.calls.length, 0);
});
