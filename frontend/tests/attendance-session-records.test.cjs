const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const context = { exports: {}, Date, Map };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/attendanceSessionRecords.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText, context);
const { reconcileAttendanceSessions: merge } = context.exports;
const session = { id: 's1', user_id: 'u1', date: '2026-10-19', clock_in: '2026-10-19T01:00:00Z', clock_out: null, photo_url: 'IN-photo', profiles: { full_name: 'Member' } };
test('a saved session without a summary is present and retains identity, time and evidence', () => {
    const [record] = merge([], [session]);
    assert.equal(record.status, 'present');
    assert.equal(record.clock_in, session.clock_in);
    assert.equal(record.profiles.full_name, 'Member');
    assert.equal(record.check_in_photo_url, 'IN-photo');
    assert.equal(record.summary_pending, true);
    assert.equal(record.total_minutes, 0);
});
test('a stale absent summary cannot hide a saved clock in', () => {
    const [record] = merge([{ id: 'r1', user_id: 'u1', date: session.date, status: 'absent', notes: 'Absent', clock_in: null }], [session]);
    assert.equal(record.id, 'r1');
    assert.equal(record.status, 'present');
    assert.equal(record.notes, undefined);
    assert.equal(record.summary_pending, false);
});
test('multiple sessions merge into one daily row with the first IN and latest open session', () => {
    const later = { ...session, id: 's2', clock_in: '2026-10-19T03:00:00Z', photo_url: 'later-IN' };
    const earlier = { ...session, clock_out: '2026-10-19T02:00:00Z', duration_minutes: 60 };
    const records = merge([], [later, earlier]);
    assert.equal(records.length, 1);
    assert.equal(records[0].clock_in, session.clock_in);
    assert.equal(records[0].clock_out, null);
    assert.equal(records[0].total_minutes, 60);
    assert.equal(records[0].check_in_photo_url, 'IN-photo');
    assert.equal(records[0].check_out_photo_url, undefined);
});
test('finalized summaries retain corrections, lateness, paid minutes and independent OUT photo', () => {
    const summary = { id: 'r1', user_id: 'u1', date: session.date, status: 'late', clock_in: '2026-10-19T01:05:00Z', clock_out: '2026-10-19T10:00:00Z', total_minutes: 480, overtime_minutes: 30, check_out_photo_url: 'OUT-photo' };
    const [record] = merge([summary], [{ ...session, clock_out: '2026-10-19T09:00:00Z' }]);
    assert.equal(record.status, 'late');
    assert.equal(record.clock_in, summary.clock_in);
    assert.equal(record.clock_out, summary.clock_out);
    assert.equal(record.total_minutes, 480);
    assert.equal(record.overtime_minutes, 30);
    assert.equal(record.check_out_photo_url, 'OUT-photo');
});
test('users and dates remain separate and a new session reopens the stale daily summary', () => {
    const rows = merge([{ id: 'r1', user_id: 'u1', date: session.date, clock_in: session.clock_in, clock_out: '2026-10-19T02:00:00Z', status: 'ontime' }], [session, { ...session, id: 's2', user_id: 'u2' }, { ...session, id: 's3', date: '2026-10-18' }]);
    assert.equal(rows.length, 3);
    assert.equal(rows.find(row => row.id === 'r1').clock_out, null);
    assert.equal(rows[2].date, '2026-10-18');
});
function loadApi({ records = [], sessions = [], failedTable = null } = {}) {
    const db = { from(table) {
        const filters = [];
        const query = {
            select() { return this; }, order() { return this; },
            eq(field, value) { filters.push(row => row[field] === value); return this; },
            gte(field, value) { filters.push(row => row[field] >= value); return this; },
            lte(field, value) { filters.push(row => row[field] <= value); return this; },
            then(resolve, reject) {
                const source = table === 'attendance_records' ? records : sessions;
                return Promise.resolve({ data: source.filter(row => filters.every(filter => filter(row))), error: table === failedTable ? new Error('Read failed') : null }).then(resolve, reject);
            }
        };
        return query;
    } };
    const apiContext = { exports: {}, require: name => name === '../attendanceSessionRecords' ? context.exports : ({ supabase: db }), Date, console };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/api/attendance.ts', 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
    }).outputText, apiContext);
    return apiContext.exports;
}
test('timesheet API includes session-only rows while preserving user and date filters', async () => {
    const api = loadApi({ sessions: [session, { ...session, user_id: 'other' }, { ...session, date: '2026-09-30' }] });
    const rows = await api.fetchAttendanceRecords('u1', '2026-10-01', '2026-10-31');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].userId, 'u1');
    assert.equal(rows[0].userName, 'Member');
    assert.equal(rows[0].status, 'present');
    assert.equal(rows[0].summaryPending, true);
});
test('failed summary and session reads reject instead of manufacturing absence', async () => {
    for (const failedTable of ['attendance_records', 'attendance_sessions']) {
        await assert.rejects(loadApi({ failedTable }).fetchAttendanceRecords('u1', '2026-10-01', '2026-10-31'), /Read failed/);
    }
});
test('session-only system and performance-excluded accounts stay excluded', async () => {
    const api = loadApi({ sessions: [session, { ...session, user_id: 'system', profiles: { account_type: 'system' } }, { ...session, user_id: 'excluded', profiles: { include_in_performance: false } }] });
    assert.equal((await api.fetchAttendanceRecords(undefined, '2026-10-01', '2026-10-31')).length, 1);
});
