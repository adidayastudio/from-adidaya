const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/projectPlanningData.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
const { savedPlanningRows, rabItemAmount } = context.exports;

test('reads legacy active RAB values and resolves WBS title without losing zero', () => {
    const [row] = savedPlanningRows('rab', { estimateValues: { 'S.1': { volume: 0, unitPrice: '12000', unit: 'm3' } } }, [{ wbs_code: 'S.1', title: 'Foundation' }]);
    assert.equal(row.title, 'Foundation');
    assert.equal(row.quantity, 0);
    assert.equal(rabItemAmount(row), 0);
});
test('per-area overrides stay distinct from item unit prices', () => {
    const [row] = savedPlanningRows('rab', { priceOverrides: { 'S.1': 500000 } });
    assert.equal(row.price_override, 500000);
    assert.equal(rabItemAmount(row), null);
});
test('schedule reads legacy start/duration/progress, not operational tasks', () => {
    const [row] = savedPlanningRows('schedule', { scheduleValues: { 'A.2': { start: '2026-10-01', duration: 14, progress: 0 } } });
    assert.equal(row.start_date, '2026-10-01');
    assert.equal(row.duration_days, 14);
    assert.equal(row.progress, 0);
});
test('saved estimates are not presented as WBS or report records', () => {
    assert.equal(savedPlanningRows('reports', { estimateValues: { X: { volume: 10 } } }).length, 0);
    assert.equal(savedPlanningRows('wbs', { estimateValues: { X: { volume: 10 } } }).length, 0);
});
test('RAB database quantities use qty; missing prices stay unknown', () => {
    assert.equal(rabItemAmount({ qty: '2.5', unit_price: '12000' }), 30000);
    assert.equal(rabItemAmount({ qty: 2, unit_price: null }), null);
    assert.equal(rabItemAmount({ qty: 2, unit_price: 4, total_price: '0' }), 0);
});
