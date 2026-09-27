import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const prefix = '/tools/parent-demos/';
const types = {'.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.txt':'text/plain; charset=utf-8'};
export function allowedPath(urlPath) {
  let decoded;
  try { decoded = decodeURIComponent(urlPath); } catch { return null; }
  if (decoded.includes('\\') || decoded.split('/').some(p => p === '..' || p.startsWith('.'))) return null;
  if (decoded === '/') return `${prefix}index.html`;
  if (decoded.endsWith('/')) decoded += 'index.html';
  const demo = /^\/tools\/parent-demos\/(?:index\.html|preview\.css|preview-guard\.js|(?:block-lab|spellbound)\/(?:index\.html|game\.js|style\.css|logic\.mjs))$/;
  const asset = /^\/assets\/(?:css\/style\.css|vendor\/three\/(?:three\.(?:module|core)\.min\.js|THREE-LICENSE\.txt))$/;
  return demo.test(decoded) || asset.test(decoded) ? decoded : null;
}

export async function startServer(port = 4175) {
  const server = http.createServer(async (req, res) => {
    const end = (code, value) => { res.writeHead(code, {'Content-Type':'text/plain; charset=utf-8'}); res.end(value); };
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (!['GET','HEAD'].includes(req.method)) return end(405, 'Read-only preview server.');
    if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host || '')) return end(403, 'Local preview only.');
    if (req.headers['sec-fetch-site'] === 'cross-site') return end(403, 'Open the local preview address directly.');
    let url;
    try { url = new URL(req.url, 'http://127.0.0.1'); } catch { return end(400, 'Invalid URL.'); }
    if (url.pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }
    // Keep relative imports correct when the root shortcut is used.
    if (url.pathname === '/') { res.writeHead(302, {Location:prefix}); return res.end(); }
    if ([prefix.slice(0,-1), prefix+'block-lab', prefix+'spellbound'].includes(url.pathname)) {
      res.writeHead(302, {Location:url.pathname+'/'}); return res.end();
    }
    const selected = allowedPath(url.pathname);
    if (!selected) return end(404, 'Not part of this parent preview.');
    try {
      const body = await readFile(path.join(root, selected.slice(1)));
      res.writeHead(200, {'Content-Type':types[path.extname(selected)], 'Content-Length':body.length});
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch { end(404, 'Preview file not found.'); }
  });
  await new Promise((resolve,reject) => { server.once('error',reject); server.listen(port,'127.0.0.1',resolve); });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const port = Number(process.env.DEMO_PORT || 4175);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('DEMO_PORT must be between 1024 and 65535.');
  const server = await startServer(port);
  console.log(`Parent previews: http://127.0.0.1:${server.address().port}${prefix}`);
}
