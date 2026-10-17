const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function harness(fail = false) {
    const source = fs.readFileSync('lib/api/chat.ts', 'utf8');
    const start = source.indexOf('export async function sendChatMessage(');
    const end = source.indexOf('const USER_DELETED_MSGS_PREFIX', start);
    const js = ts.transpileModule(source.slice(start, end).replace('export async', 'async'), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
    const writes = [], cache = [];
    const userId = '11111111-1111-4111-8111-111111111111';
    const client = {
        auth: { getUser: async () => ({ data: { user: { id: userId } } }) },
        from: () => ({ insert: async row => { writes.push(row); return { error: fail ? { message: 'Database rejected message' } : null }; } }),
        channel: () => ({ httpSend: async () => {} }),
    };
    const context = {
        console: { warn() {} },
        isValidUUID: value => typeof value === 'string' && /^[a-f0-9-]{36}$/i.test(value),
        isAdidayaTenant: () => true,
        supabaseAdidaya: client, supabaseForma: client, supabase: client,
        STORAGE_PREFIX: 'messages:', LAST_MSG_PREFIX: 'last:',
        AsyncStorage: { getItem: async () => null, setItem: async (...args) => cache.push(args) },
        ensureChatChannelExists: async () => {},
        transformRowToChatMessage: row => ({ id: row.id, text: row.text, sender: row.sender_name }),
        formatMessagePreviewSnippet: row => row.text,
    };
    vm.createContext(context);
    vm.runInContext(js + '\nthis.send = sendChatMessage;', context);
    return { send: context.send, writes, cache, userId };
}

test('Adidaya chat persists sender_id/content before caching success', async () => {
    const h = harness();
    const result = await h.send('000-general', { text: 'Test', userId: h.userId, senderName: 'Member' });
    assert.equal(h.writes[0].sender_id, h.userId);
    assert.equal(h.writes[0].content, 'Test');
    assert.equal('text' in h.writes[0], false);
    assert.equal('user_id' in h.writes[0], false);
    assert.equal(result.text, 'Test');
    assert.equal(h.cache.length, 2);
});

test('A failed database send rejects and never caches a successful message', async () => {
    const h = harness(true);
    await assert.rejects(h.send('000-general', { text: 'Test', userId: h.userId }), /Database rejected/);
    assert.equal(h.cache.length, 0);
});

test('Chat cannot send using another user identity', async () => {
    const h = harness();
    await assert.rejects(h.send('000-general', { text: 'Test', userId: '22222222-2222-4222-8222-222222222222' }), /Sesi Chat/);
    assert.equal(h.writes.length, 0);
    assert.equal(h.cache.length, 0);
});
