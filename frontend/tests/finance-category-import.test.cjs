const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}) {
    const context = { exports: {}, console, require: name => { if (name === '../financePayments') return load('lib/financePayments.ts', { './financeAttachments': load('lib/financeAttachments.ts', {}) }); if (!(name in mocks)) throw Error(name); return mocks[name]; } };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
    return context.exports;
}
const legacy = load('components/finance/constants.ts');
const helpers = load('lib/financeTransactionCategories.ts', { '@/components/finance/constants': legacy });
test('every existing purchasing and reimbursement code is imported with its children', () => {
    const imported = helpers.importAdidayaTransactionCategories([]);
    for (const [workflow, categories, children] of [['purchasing', legacy.CATEGORY_OPTIONS, legacy.SUBCATEGORY_OPTIONS], ['reimbursement', legacy.REIMBURSE_CATEGORY_OPTIONS, legacy.REIMBURSE_SUBCATEGORY_OPTIONS]]) {
        for (const old of categories) {
            const category = imported.find(item => item.legacyValues?.[workflow] === old.value);
            assert.ok(category);
            assert.equal(helpers.transactionCategoryValue(category, workflow), old.value);
            for (const sub of children[old.value] || []) assert.ok(category.subcategories.some(item => helpers.transactionCategoryValue(item, workflow) === sub.value));
        }
    }
});
test('migration preserves existing custom fields and archived status without duplicates', () => {
    const existing = [{ id: 'my-material', code: 'CUSTOM', name: 'Material', defaultExpenseType: 'My expense', resourceMapping: 'Assets', isArchived: true, subcategories: [] }];
    const first = helpers.importAdidayaTransactionCategories(existing);
    const second = helpers.importAdidayaTransactionCategories(first);
    assert.equal(JSON.stringify(first), JSON.stringify(second));
    const material = first.find(item => item.id === 'my-material');
    assert.equal(material.code, 'CUSTOM'); assert.equal(material.defaultExpenseType, 'My expense'); assert.equal(material.isArchived, true);
    assert.equal(existing[0].subcategories.length, 0);
});
test('one-time migration does not resurrect a category deleted after import', async () => {
    const memory = new Map();
    const api = load('lib/api/financeSetup.ts', { '@/lib/financeTransactionCategories': helpers, '../supabase': {}, '@react-native-async-storage/async-storage': { default: { getItem: async key => memory.get(key) || null, setItem: async (key, value) => memory.set(key, value) } } });
    const initial = await api.getFinanceCategories();
    const removed = initial[0].id;
    await api.saveFinanceCategories(initial.filter(item => item.id !== removed));
    const next = await api.getFinanceCategories();
    assert.equal(next.some(item => item.id === removed), false);
});
test('purchasing contains the original eight categories, separate from reimbursements', () => {
    const items = helpers.importAdidayaTransactionCategories([]);
    const purchasing = helpers.transactionCategoriesFor(items, 'purchasing');
    assert.equal(purchasing.length, 8);
    assert.deepEqual(Array.from(purchasing, item => helpers.transactionCategoryValue(item, 'purchasing')), Array.from(legacy.CATEGORY_OPTIONS, item => item.value));
    assert.equal(helpers.transactionCategoriesFor(items, 'reimbursement').length, legacy.REIMBURSE_CATEGORY_OPTIONS.length);
});
