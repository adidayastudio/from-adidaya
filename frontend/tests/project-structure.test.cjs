const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const cache = new Map();
function load(file) {
    file = path.resolve(file.endsWith('.ts') ? file : `${file}.ts`);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    vm.runInNewContext(output, { module, exports: module.exports, require: spec => load(path.resolve(path.dirname(file), spec)) });
    return module.exports;
}
const { documentFolderCode } = load('lib/projectDocumentFolders');
const { calculateVolume } = load('lib/projectVolume');
const { buildWBSTree } = load('lib/legacy-rab/wbs-mapper');
test('uploaded and generated documents use the same explicit subwork folder', () => {
    assert.equal(documentFolderCode({ subwork_code: '01', origin: 'upload' }), '01');
    assert.equal(documentFolderCode({ subworkCode: '01', origin: 'generated' }), '01');
    assert.equal(documentFolderCode({ folder: '00 - Kickoff & Administration/01 - Client & Brief' }), '01');
});
test('unclassified and legacy letter stages remain in Inbox without guessed mappings', () => {
    assert.equal(documentFolderCode({ stage_code: 'KO', name: '11 - Drawing.pdf' }), null);
    assert.equal(documentFolderCode({ name: 'report.pdf' }), null);
    assert.equal(documentFolderCode({ stage_code: '00' }), '00');
});
test('WBS builds parents and sorts codes even when stored rows are shuffled', () => {
    const tree = buildWBSTree([{ id: 'child', wbs_code: 'S.1.2', title: 'Second' }, { id: 'root', wbs_code: 'S', title: 'Structure' }, { id: 'parent', wbs_code: 'S.1', title: 'Preparation' }, { id: 'first', wbs_code: 'S.1.1', title: 'First' }]);
    assert.equal(tree[0].code, 'S');
    assert.equal(tree[0].children[0].children[0].code, 'S.1.1');
    assert.equal(tree[0].children[0].children[1].code, 'S.1.2');
});
test('all six volume formulas match legacy calculations', () => {
    const p = { length: 10, width: 2, height: 3, count: 2, topWidth: 1, bottomWidth: 3, manualVolume: 174.51 };
    const expected = { BOX: 120, COLUMN_BEAM: 120, AREA: 40, LINE: 20, TRAPEZOIDAL: 120, MANUAL: 349.02 };
    for (const [formula, value] of Object.entries(expected)) assert.equal(calculateVolume({ formula_type: formula, parameters: p }), value);
});
test('volume rounds per row and rejects invalid or negative dimensions', () => {
    assert.equal(calculateVolume({ formula_type: 'MANUAL', parameters: { manualVolume: 1.23456, count: 1 } }), 1.235);
    assert.throws(() => calculateVolume({ formula_type: 'AREA', parameters: { length: -2, width: -2, count: 1 } }));
    assert.throws(() => calculateVolume({ formula_type: 'LINE', parameters: { length: NaN, count: 1 } }));
});
