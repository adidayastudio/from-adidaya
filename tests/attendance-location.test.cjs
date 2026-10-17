const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load() {
    let succeed, fail, calls = 0;
    const timers = new Map();
    let timerId = 0;
    const context = {
        exports: {}, Date, Promise, Error,
        require: name => name === 'react-native' ? { Platform: { OS: 'web' } } : {},
        navigator: { geolocation: { getCurrentPosition(ok, error) { calls++; succeed = ok; fail = error; } } },
        setTimeout: callback => { timers.set(++timerId, callback); return timerId; },
        clearTimeout: id => timers.delete(id),
    };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/attendanceLocation.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
    return { api: context.exports, timers, succeed: value => succeed(value), fail: error => fail(error), calls: () => calls };
}
test('waiting for browser Allow is not cancelled by the app deadline', async () => {
    const h = load();
    const pending = h.api.getAttendancePosition();
    assert.equal(h.timers.size, 0);
    const position = { coords: { latitude: -6.2, longitude: 106.8 }, timestamp: Date.now() };
    h.succeed(position);
    assert.equal(await pending, position);
});
test('app warming and clock share the same request and valid cache', async () => {
    const h = load();
    const first = h.api.getAttendancePosition();
    const second = h.api.getAttendancePosition();
    assert.equal(first, second);
    const position = { coords: { latitude: -6.2, longitude: 106.8 }, timestamp: Date.now() };
    h.succeed(position); await first;
    assert.equal(await h.api.getAttendancePosition(), position);
    assert.equal(h.calls(), 1);
});
test('denied permission is not cached and can recover on the next attempt', async () => {
    const h = load();
    const first = h.api.getAttendancePosition();
    h.fail({ code: 1 });
    await assert.rejects(first, /enable location/);
    const second = h.api.getAttendancePosition(true);
    const position = { coords: { latitude: -6.2, longitude: 106.8 }, timestamp: Date.now() };
    h.succeed(position); assert.equal(await second, position);
    assert.equal(h.calls(), 2);
});
