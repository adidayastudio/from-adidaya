// Serve the exported web candidate without opening a browser or running Metro twice.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

for (const line of (fs.existsSync(path.resolve(__dirname, '../.env.local')) ? fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf8') : '').split('\n')) {
  const match = line.match(/^([A-Z_]+)=(.*)$/); if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
}
const { backendProxy } = require('../server/backend-proxy.cjs');
const proxy = backendProxy({ env: { ...process.env, ADIDAYA_BACKEND_ORIGIN: process.env.ADIDAYA_BACKEND_ORIGIN || 'http://127.0.0.1:3000' } });
const root = path.resolve(__dirname, '../dist');
const port = Number(process.env.PORT || 8082);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.wasm': 'application/wasm' };
if (!fs.existsSync(path.join(root, 'index.html'))) throw new Error('Run npm run build before starting the preview.');
const server = http.createServer(async (req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); res.end(); return; }
  if (pathname.startsWith('/api/')) { await proxy(req, res); return; }
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return; }
  // API routes remain on the original backend, never fall back to SPA HTML.
  if (pathname === '/api' || pathname.startsWith('/api/')) { res.writeHead(404); res.end('API services run on the Adidaya backend.'); return; }
  const candidate = path.resolve(root, '.' + pathname);
  if (candidate !== root && !candidate.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  let file = candidate;
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    if (path.extname(pathname)) { res.writeHead(404); res.end(); return; }
    file = path.join(root, 'index.html');
  }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Content-Length': fs.statSync(file).size, 'Cache-Control': pathname.startsWith('/_expo/static/') ? 'public, max-age=31536000, immutable' : 'no-cache', 'X-Content-Type-Options': 'nosniff' });
  if (req.method === 'HEAD') res.end();
  else fs.createReadStream(file).pipe(res);
});
server.listen(port, '127.0.0.1', () => console.log(`Adidaya preview: http://localhost:${port} (existing app remains on port 3000)`));
