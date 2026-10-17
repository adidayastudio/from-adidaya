const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/clock/location-utils.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
const api = context.exports;
test('the Adidaya location matcher recognizes its registered JPF site', async () => {
    const result = await api.detectLocation({ latitude: -6.269871, longitude: 106.796965 });
    assert.equal(result.status, 'inside'); assert.equal(result.location.code, 'JPF');
});
test('outside remains outside, rather than inventing a registered location', async () => {
    const result = await api.detectLocation({ latitude: 0, longitude: 0 });
    assert.equal(result.status, 'outside'); assert.equal(result.location, undefined);
});
