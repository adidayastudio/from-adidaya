// Fixed upstream only. No arbitrary target, no service-role key, no redirect following.
function backendProxy({ env = process.env, fetchImpl = fetch } = {}) {
    return async (req, res) => {
        const fail = (status, error) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error })); };
        res.setHeader('Cache-Control', 'no-store');
        let upstream;
        try {
            upstream = new URL(env.ADIDAYA_BACKEND_ORIGIN);
            if (upstream.pathname !== '/' || upstream.search || upstream.hash || upstream.username || upstream.password) throw Error();
            const local = ['localhost', '127.0.0.1'].includes(upstream.hostname);
            if (upstream.protocol !== 'https:' && !(env.NODE_ENV !== 'production' && local && upstream.protocol === 'http:')) throw Error();
            if (upstream.host === req.headers.host) throw Error();
        } catch { return fail(503, 'Adidaya backend origin is not configured correctly.'); }
        const token = req.headers.authorization;
        if (!token || !/^Bearer \S+$/.test(token)) return fail(401, 'Authentication required.');
        const supabaseUrl = env.EXPO_PUBLIC_ADIDAYA_SUPABASE_URL;
        const publicKey = env.EXPO_PUBLIC_ADIDAYA_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !publicKey) return fail(503, 'Adidaya authentication is not configured.');
        try {
            const auth = await fetchImpl(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, { headers: { apikey: publicKey, Authorization: token }, signal: AbortSignal.timeout(10000), redirect: 'error' });
            if (!auth.ok) return fail(401, 'Session is invalid or expired.');
            const user = await auth.json();
            if (!user.id) return fail(401, 'Session is invalid.');
            const target = new URL(req.url, 'https://frontend.invalid');
            if (!target.pathname.startsWith('/api/')) return fail(404, 'Unknown API route.');
            if (target.pathname.startsWith('/api/admin/')) return fail(403, 'Administrative endpoints are not exposed through this frontend.');
            const headers = { Authorization: token, Accept: req.headers.accept || 'application/json' };
            if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];
            let body;
            if (!['GET', 'HEAD'].includes(req.method)) {
                if (req.body !== undefined) body = Buffer.isBuffer(req.body) || typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
                else { const chunks = []; let size = 0; for await (const chunk of req) { size += chunk.length; if (size > 10 * 1024 * 1024) return fail(413, 'Request body too large.'); chunks.push(chunk); } body = Buffer.concat(chunks); }
                if (Buffer.byteLength(body) > 10 * 1024 * 1024) return fail(413, 'Request body too large.');
            }
            const response = await fetchImpl(new URL(target.pathname + target.search, upstream), { method: req.method, headers, body, redirect: 'manual', signal: AbortSignal.timeout(55000) });
            if (response.status >= 300 && response.status < 400) return fail(502, 'Backend redirected the API request.');
            if ((response.headers.get('content-type') || '').includes('text/html')) return fail(502, 'Backend returned a page instead of an API response.');
            res.statusCode = response.status;
            res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
            if (response.headers.get('content-disposition')) res.setHeader('Content-Disposition', response.headers.get('content-disposition'));
            res.end(Buffer.from(await response.arrayBuffer()));
        } catch { return fail(502, 'Adidaya backend is unavailable. Please try again.'); }
    };
}
module.exports = { backendProxy };
