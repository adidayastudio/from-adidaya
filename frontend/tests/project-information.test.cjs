const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/projectInformation.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
const { parseProjectLocation, projectInformationDetails, resizeBuildingMasses, validateProjectInformation } = context.exports;
test('legacy location retains complete address, map coordinates and unknown fields', () => {
    const source = { address: 'Jalan Kolonel T.B. Suwandi No. 12B', province: 'Banten', city: 'Kota Serang', mapsLink: 'https://maps.example/test', latitude: '-6.1255504', longitude: '106.1515037', reference: 'keep' };
    assert.equal(parseProjectLocation(JSON.stringify(source)).reference, 'keep');
    assert.equal(parseProjectLocation(source).latitude, source.latitude);
    assert.equal(parseProjectLocation('A plain legacy address').address, 'A plain legacy address');
});
test('all legacy specification, scope, client and mass data initialize without discarding zero or site work', () => {
    const input = { locationDetails: { address: 'Stored address' }, location: 'Formatted city', buildingMassCount: 1, buildingMasses: [{ code: 'A', name: 'Main Building', buildingArea: 2085, floors: 3 }, { code: 'B', name: 'Site Work', isSiteWork: true, buildingArea: '', floors: '' }], meta: { category: 'RES', disciplines: ['Architecture', 'Structure', 'MEP', 'Landscape'], landArea: 1170, buildingArea: 2085, floors: 3, rabClass: 'A', clientName: 'Novi', clientContact: '', buildingMassCount: 2 } };
    const result = projectInformationDetails(input);
    assert.equal(result.location.address, 'Stored address');
    assert.equal(result.category, 'RES'); assert.equal(result.clientName, 'Novi');
    assert.equal(result.landArea, '1170'); assert.equal(result.buildingArea, '2085');
    assert.equal(result.floors, '3'); assert.equal(result.rabClass, 'A');
    assert.equal(result.buildingMassCount, 1); assert.equal(result.buildingMasses[1].isSiteWork, true);
    assert.equal(projectInformationDetails({ meta: { landArea: 0 } }).landArea, '0');
});
test('mass resize retains existing data and places Site Work after the building codes', () => {
    const masses = resizeBuildingMasses([{ code: 'A', name: 'Custom Building', buildingArea: '200', floors: '2', custom: 'preserve' }, { code: 'B', name: 'Custom Site', buildingArea: '', floors: '', isSiteWork: true }], 2);
    assert.equal(masses[0].name, 'Custom Building'); assert.equal(masses[0].custom, 'preserve');
    assert.equal(masses[1].code, 'B'); assert.equal(masses[2].code, 'C'); assert.equal(masses[2].name, 'Custom Site');
});
test('invalid coordinates, dimensions and mass counts are rejected', () => {
    const value = projectInformationDetails({ meta: {} });
    assert.doesNotThrow(() => validateProjectInformation(value));
    assert.throws(() => validateProjectInformation({ ...value, location: { latitude: '91' } }));
    assert.throws(() => validateProjectInformation({ ...value, buildingArea: '-2' }));
    assert.throws(() => resizeBuildingMasses([], 0));
});
test('empty stored masses generate Main Building and Site Work using project specifications', () => {
    const details = projectInformationDetails({ buildingMassCount: 1, buildingMasses: [], meta: { buildingArea: 344, floors: 4, buildingMasses: [] } });
    assert.equal(details.buildingMasses.length, 2);
    assert.equal(details.buildingMasses[0].name, 'Main Building');
    assert.equal(details.buildingMasses[0].buildingArea, '344');
    assert.equal(details.buildingMasses[0].floors, '4');
    assert.equal(details.buildingMasses[1].code, 'B');
    assert.equal(details.buildingMasses[1].isSiteWork, true);
});
test('empty database mass array does not hide valid legacy metadata masses', () => {
    const details = projectInformationDetails({ buildingMasses: [], meta: { buildingMasses: [{ code: 'A', name: 'Existing Mass', buildingArea: 100, floors: 2 }] } });
    assert.equal(details.buildingMasses[0].name, 'Existing Mass');
    assert.equal(details.buildingMasses[0].buildingArea, '100');
    assert.equal(details.buildingMasses[1].isSiteWork, true);
});
test('current stage matches legacy full and short codes and retains unknown stages', () => {
    const { currentStageCode } = context.exports;
    assert.equal(currentStageCode('SD', ['01-KO', '02-SD']), '02-SD');
    assert.equal(currentStageCode('02-sd', ['01-KO', '02-SD']), '02-SD');
    assert.equal(currentStageCode('', ['01-KO', '02-SD']), '01-KO');
    assert.equal(currentStageCode('UNKNOWN', ['01-KO', '02-SD']), undefined);
});
