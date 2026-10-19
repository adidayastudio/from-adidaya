const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.createSourceFile('drawer.tsx', fs.readFileSync('components/finance/CreateRequestDrawer.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function handler(name, values = {}) {
    let initializer;
    function visit(node) { if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) initializer = node.initializer; ts.forEachChild(node, visit); }
    visit(source);
    const state = {};
    const context = { exports: {}, Date, Number, console, ...values };
    for (const setter of initializer.getText(source).match(/\bset[A-Z]\w*/g) || []) context[setter] = value => { state[setter] = value; };
    vm.runInNewContext(ts.transpileModule(`exports.run = ${initializer.getText(source)};`, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
    return { run: context.exports.run, state };
}
test('editing a legacy request without item rows retains its description and actual amount', () => {
    const { run, state } = handler('applyEditRequest');
    run({ id: 'legacy', project_id: 'p', type: 'MATERIAL', description: 'Tx 15 mm', amount: -12.5 }, [{ id: 'p', project_code: 'PRG' }]);
    assert.equal(state.setPurchaseItems[0].name, 'Tx 15 mm');
    assert.equal(state.setPurchaseItems[0].price, -12.5);
    assert.equal(state.setProjectCode, 'PRG');
});
function submit(overrides = {}) {
    const errors = [], saves = [], closed = [];
    const items = [{ id: '1', name: 'Tx 15 mm', qty: 1, price: 10.5, unit: 'pcs' }];
    const env = {
        submitInFlight: { current: false }, projects: [{ id: 'p', project_code: 'PRG' }], departments: [], projectCode: 'PRG', departmentId: '',
        category: 'MATERIAL', subcategory: '', activeItems: items, purchaseItems: items, activeTab: 'purchase', purchaseImages: [], reimburseImages: [],
        showFormError: (title, message) => errors.push(message), saveAccountToggle: false, bankName: '', accountNumber: '', accountName: '',
        editRequest: { id: 'existing', statusTag: 'pending' }, isEditMode: true, invoiceDate: '2026-10-19', targetDate: '', priority: 'MEDIUM',
        totalAmount: 10.5, stage: 'PLANNED', vendorName: '', notes: '', isLocalFinanceAttachment: () => false,
        updatePurchasingRequest: async (id, payload) => { saves.push({ id, payload }); }, Alert: { alert() {} }, onClose: () => closed.push(true), ...overrides,
    };
    return { ...handler('handleSubmit', env), env, errors, saves, closed };
}
test('Save Changes calls the update API and closes only after it succeeds', async () => {
    const { run, saves, closed, state } = submit();
    await run(false);
    assert.equal(saves.length, 1);
    assert.equal(saves[0].id, 'existing');
    assert.equal(saves[0].payload.amount, 10.5);
    assert.equal(closed.length, 1);
    assert.equal(state.setIsSubmitting, false);
});
test('validation and server errors remain visible and save unlocks for retry', async () => {
    const missing = submit({ projectCode: '' });
    await missing.run(false);
    assert.match(missing.errors[0], /Project or Department/);
    assert.equal(missing.saves.length, 0);
    const failed = submit({ updatePurchasingRequest: async () => { throw Error('Server rejected attachment'); } });
    await failed.run(false);
    assert.match(failed.errors[0], /Server rejected attachment/);
    assert.equal(failed.env.submitInFlight.current, false);
    assert.equal(failed.closed.length, 0);
});

test('a legacy request with multiple units keeps its total when editing an attachment', () => {
    const { run, state } = handler('applyEditRequest');
    run({ id: 'legacy', project_id: 'p', type: 'MATERIAL', description: 'Items', quantity: 2, amount: 100.5 }, [{ id: 'p', project_code: 'PRG' }]);
    const item = state.setPurchaseItems[0];
    assert.equal(item.qty * item.price, 100.5);
});
