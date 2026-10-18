const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(updateError = null, noRows = false) {
    let row = { id: 'project-1', project_name: 'Original', project_number: '001', project_code: 'ABC', status: 'active', meta: { existing: true } };
    const writes = [], cache = new Map();
    const db = { from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }),
        update: payload => ({ eq: () => ({ select: () => ({ maybeSingle: async () => {
            writes.push(payload);
            if (!updateError) row = { ...row, ...payload };
            return { error: updateError, data: updateError || noRows ? null : { id: row.id } };
        } }) }) }),
    }) };
    const context = { exports: {}, console, require: name => {
        if (name === '../supabase') return { supabase: db, APP_MODE: 'adidaya' };
        if (name === './tasks') return { WBS_TEMPLATES: [] };
        if (name === 'base64-arraybuffer') return {};
        if (name === '@react-native-async-storage/async-storage') return { default: { getItem: async key => cache.get(key) || null, setItem: async (key, value) => cache.set(key, value) } };
        throw Error(name);
    } };
    vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/api/projects.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, context);
    return { api: context.exports, writes, cache };
}
test('Adidaya settings persist identity, dates and merged metadata to database', async () => {
    const x = load();
    const saved = await x.api.updateProjectApi('project-1', { title: 'Updated', number: '061', startDate: '2026-10-01', targetDate: '2026-12-01', meta: { projectLeadId: 'lead', trackingMethod: 'tasks' } });
    assert.equal(x.writes[0].project_name, 'Updated');
    assert.equal(x.writes[0].name, undefined);
    assert.equal(x.writes[0].end_date, '2026-12-01');
    assert.equal(x.writes[0].meta.existing, true);
    assert.equal(x.writes[0].meta.projectLeadId, 'lead');
    assert.equal(saved.title, 'Updated');
    assert.equal(saved.number, '061');
    assert.equal(saved.meta.targetDate, '2026-12-01');
});
test('permission and missing-column errors cannot report success or update local cache', async () => {
    for (const code of ['42501', 'PGRST204']) {
        const x = load({ code, message: 'Database rejected save' });
        await assert.rejects(x.api.updateProjectApi('project-1', { title: 'Blocked', meta: { changed: true } }), error => error.code === code);
        assert.equal(x.cache.size, 0);
    }
});
test('metadata-only module settings save remotely and can be reloaded', async () => {
    const x = load();
    await x.api.updateProjectApi('project-1', { meta: { costSystem: { enabled: true } } });
    const saved = await x.api.getProjectById('project-1');
    assert.equal(saved.meta.costSystem.enabled, true);
    assert.equal(x.writes.length, 1);
});

test('a zero-row update is not reported as a successful save', async () => {
    const x = load(null, true);
    await assert.rejects(x.api.updateProjectApi('project-1', { meta: { changed: true } }), /not updated/);
    assert.equal(x.cache.size, 0);
});
