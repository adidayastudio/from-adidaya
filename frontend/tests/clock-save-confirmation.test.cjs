const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadClock(failingTable) {
    const sessions = [];
    let sessionWrites = 0;
    const db = {
        auth: { getUser: async () => ({ data: { user: { id: 'user' } } }) },
        from(table) {
            let operation = 'read';
            let payload;
            const query = {
                select() { return this; }, eq() { return this; }, order() { return this; },
                single() { return this; }, maybeSingle() { return this; },
                insert(value) { operation = 'insert'; payload = value; return this; },
                upsert(value) { operation = 'upsert'; payload = value; return this; },
                then(resolve, reject) {
                    if (operation === 'read') {
                        return Promise.resolve({ data: table === 'attendance_sessions' ? sessions : null, error: null }).then(resolve, reject);
                    }
                    const error = table === failingTable ? new Error('Storage failure') : null;
                    if (!error && table === 'attendance_sessions') {
                        sessions.push({ id: 'session', ...payload });
                        sessionWrites++;
                    }
                    return Promise.resolve({ data: null, error }).then(resolve, reject);
                }
            };
            return query;
        }
    };
    const context = { exports: {}, require: () => ({ supabase: db }), Date, Set, console };
    const output = ts.transpileModule(fs.readFileSync('lib/api/adidayaClock.ts', 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
    }).outputText;
    vm.runInNewContext(output, context);
    return { api: context.exports, sessionWrites: () => sessionWrites };
}
const evidence = { photoUrl: 'photo', latitude: 1, longitude: 1 };
for (const table of ['attendance_logs', 'attendance_records']) {
    test(`saved session is confirmed when ${table} fails without inviting a repeat clock in`, async () => {
        const { api, sessionWrites } = loadClock(table);
        const result = await api.writeAdidayaClock('user', 'IN', evidence);
        assert.equal(result.success, true);
        assert.match(result.warning, /Tidak perlu mengulang/);
        const repeated = await api.writeAdidayaClock('user', 'IN', evidence);
        assert.ok(repeated.error);
        assert.equal(sessionWrites(), 1);
    });
}
test('failed session insertion never reports success even when other writes succeed', async () => {
    const { api, sessionWrites } = loadClock('attendance_sessions');
    const result = await api.writeAdidayaClock('user', 'IN', evidence);
    assert.ok(result.error);
    assert.equal(result.success, undefined);
    assert.equal(sessionWrites(), 0);
});
function loadSessions(rows, error = null) {
    const query = { select() { return this; }, eq() { return this; }, then(resolve, reject) { return Promise.resolve({ data: rows, error }).then(resolve, reject); } };
    const context = { exports: {}, require: () => ({ supabase: { from: () => query } }), Date, console };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/api/attendance.ts', 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
    }).outputText, context);
    return context.exports;
}
test('unordered sessions resolve to the latest open session', async () => {
    const date = new Date().toLocaleDateString('en-CA');
    const rows = [
        { id: 'latest', user_id: 'user', date, clock_in: `${date}T09:00:00Z`, clock_out: null },
        { id: 'first', user_id: 'user', date, clock_in: `${date}T08:00:00Z`, clock_out: `${date}T08:30:00Z` }
    ];
    const sessions = await loadSessions(rows).fetchTodaySessions('user');
    assert.equal(sessions[sessions.length - 1].id, 'latest');
    assert.equal(sessions[sessions.length - 1].clockOut, null);
});
test('a failed status read is not converted to a false checked-out state', async () => {
    await assert.rejects(loadSessions(null, new Error('Offline')).fetchTodaySessions('user'), /Offline/);
});
