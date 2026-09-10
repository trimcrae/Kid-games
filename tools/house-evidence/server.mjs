import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {load,save,report,maxSessionBytes,privateWorkspace,validate} from './core.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const types = {'.mp4':'video/mp4','.m4v':'video/mp4','.mov':'video/quicktime','.webm':'video/webm','.mkv':'video/x-matroska','.jpg':'image/jpeg'};
export function byteRange(header,size) {
  if (!header) return {start:0,end:size-1,partial:false};
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return null;
  const suffix = !match[1];
  const start = suffix ? Math.max(0,size-Number(match[2])) : Number(match[1]);
  const end = suffix || !match[2] ? size-1 : Math.min(size-1,Number(match[2]));
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || start < 0 || end < start) return null;
  return {start,end,partial:true};
}
export async function startServer(location,port=8766) {
  const workspace = privateWorkspace(location);
  const errors = validate(load(workspace));
  if (errors.length) throw new Error(errors.join('\n'));
  const server = http.createServer(async (req,res) => {
    const origin = `http://127.0.0.1:${server.address().port}`;
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; media-src 'self'; img-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    const json = (status,value) => { res.writeHead(status,{'Content-Type':'application/json'}); res.end(JSON.stringify(value)); };
    try {
      if (req.headers.host !== new URL(origin).host || (req.headers.origin && req.headers.origin !== origin) || req.headers['sec-fetch-site'] === 'cross-site') {
        return json(403,{error:'Use the local review address printed by the CLI.'});
      }
      const url = new URL(req.url,origin);
      if (req.method === 'GET' && url.pathname === '/api/session') return json(200,load(workspace));
      if (req.method === 'GET' && url.pathname === '/api/report') return json(200,report(load(workspace)));
      if (req.method === 'PUT' && url.pathname === '/api/session') {
        if (!req.headers['content-type']?.startsWith('application/json')) return json(415,{error:'JSON required'});
        let count=0; const chunks=[];
        for await (const chunk of req) {
          count+=chunk.length;
          if (count > maxSessionBytes) { json(413,{error:'Session exceeds 8 MiB limit'}); req.resume(); return; }
          chunks.push(chunk);
        }
        return json(200,save(workspace,JSON.parse(Buffer.concat(chunks).toString('utf8'))));
      }
      if (['GET','HEAD'].includes(req.method) && url.pathname.startsWith('/media/')) {
        const video = load(workspace).videos.find(v => v.id === url.pathname.slice('/media/'.length));
        if (!video) return json(404,{error:'Unknown video'});
        const stat = fs.statSync(video.path);
        if (stat.size !== video.bytes || (video.mtimeMs != null && stat.mtimeMs !== video.mtimeMs)) return json(409,{error:'Original source changed; verify its fingerprint before reviewing.'});
        const range = byteRange(req.headers.range,stat.size);
        if (!range) { res.writeHead(416,{'Content-Range':`bytes */${stat.size}`}); return res.end(); }
        const headers = {'Content-Type':types[path.extname(video.path).toLowerCase()] || 'application/octet-stream',
          'Accept-Ranges':'bytes','Content-Length':range.end-range.start+1};
        if (range.partial) headers['Content-Range'] = `bytes ${range.start}-${range.end}/${stat.size}`;
        res.writeHead(range.partial ? 206 : 200,headers);
        if (req.method === 'HEAD') return res.end();
        const stream = fs.createReadStream(video.path,{start:range.start,end:range.end});
        stream.on('error',() => res.destroy()); res.on('close',() => stream.destroy()); stream.pipe(res); return;
      }
      const files = {'/':['review.html','text/html; charset=utf-8'],'/review.js':['review.js','text/javascript; charset=utf-8'],'/review.css':['review.css','text/css; charset=utf-8']};
      if (req.method === 'GET' && files[url.pathname]) {
        const [file,type] = files[url.pathname];
        const content = fs.readFileSync(path.join(here,file));
        res.writeHead(200,{'Content-Type':type}); return res.end(content);
      }
      if (url.pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }
      return json(404,{error:'Not found'});
    } catch (error) {
      if (res.headersSent) return res.destroy();
      json(error.status || 400,{error:error.code === 'ENOENT' ? 'Local file not found. Check that the source is still at its registered path.' : error.message});
    }
  });
  await new Promise((resolve,reject) => {server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  return server;
}
