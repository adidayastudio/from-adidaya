const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks, globals = {}) {
    const context = { exports: {}, console, ...globals, require(name) { if (!(name in mocks)) throw Error('Unexpected dependency: ' + name); return mocks[name]; } };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
    return context.exports;
}
test('Setup bank accounts continue reading real Adidaya Funding Sources', async () => {
    const tables = [];
    const api = load('lib/api/financeSetup.ts', {
        '@/lib/financeTransactionCategories': {}, '@react-native-async-storage/async-storage': {},
        '../supabase': { supabase: { from(table) { tables.push(table); return { select() { return this; }, async order() { return { data: [ { id: 'fund-1', type: 'BANK', provider: 'Bank', account_number: '123', name: 'Operating', position: 0 }, { id: 'cash-1', type: 'PETTY_CASH' } ], error: null }; } }; } } },
    });
    const accounts = await api.getFinanceBankAccounts();
    assert.equal(tables[0], 'funding_sources');
    assert.equal(accounts.length, 1);
    assert.equal(accounts[0].id, 'fund-1');
    assert.equal(accounts[0].accountNumber, '123');
    await assert.rejects(api.saveFinanceBankAccounts(accounts), /Funding Sources/);
});
test('web destructive setup actions require a positive confirmation', () => {
    let confirmed = false, mutations = 0;
    const api = load('lib/alertUtils.ts', { 'react-native': { Platform: { OS: 'web' } } }, { window: { confirm: () => confirmed } });
    const action = { title: 'Delete', message: 'Delete setting?', onConfirm: () => mutations++ };
    api.confirmDestructiveAction(action); assert.equal(mutations, 0);
    confirmed = true;
    api.confirmDestructiveAction(action); assert.equal(mutations, 1);
});
