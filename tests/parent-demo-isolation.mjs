import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import http from 'node:http';
import {startServer, allowedPath} from '../tools/parent-demos/serve.mjs';

const root = new URL('../', import.meta.url);
const read = relative => readFile(new URL(relative,root),'utf8');
for (const file of ['assets/js/games.js','assets/js/app.js','index.html','sw.js']) {
  assert.doesNotMatch(await read(file), /parent-demos|block-lab|spellbound/i, `${file} exposes a preview`);
}
const guard = (await read('tools/parent-demos/preview-guard.js')).replace('export const','const');
for (const page of ['index.html','block-lab/index.html','spellbound/index.html']) {
  assert.match(await read(`tools/parent-demos/${page}`), /<meta name="robots" content="noindex,\s*nofollow">/, `${page} must request no indexing`);
}
for (const demo of ['block-lab','spellbound']) {
  const html = await read(`tools/parent-demos/${demo}/index.html`);
  assert.match(html, /<main id="demo" hidden>/, 'Game must be hidden before scripts load');
  assert.match(html, /if \(previewAllowed\) import\('\.\/game\.js'\)/, 'Game import must be conditional');
  assert.doesNotMatch(html, /<script[^>]+src=["'][^"']*game\.js/, 'No unguarded game script');
  assert.match(await read(`tools/parent-demos/${demo}/style.css`), /\[hidden\]\s*\{\s*display:\s*none\s*!important/, 'Author CSS must preserve hidden');
}
for (const [hostname,protocol,allowed] of [
  ['trimcrae.github.io','https:',true], ['trimcrae.github.io','http:',false],
  ['trimcrae.github.io.evil.test','https:',false], ['example.com','https:',false],
  ['127.0.0.1.evil.test','http:',false], ['localhost.evil.test','http:',false],
  ['127.0.0.1','http:',true], ['localhost','http:',true], ['[::1]','http:',true],
  ['localhost','https:',true], ['','file:',false],
]) {
  const elements = {demo:{hidden:true,removed:false,remove(){this.removed=true;},removeAttribute(key){if(key==='hidden')this.hidden=false;}},'preview-lock':{textContent:'',removed:false,remove(){this.removed=true;}}};
  vm.runInNewContext(guard,{location:{hostname,protocol},document:{getElementById:key=>elements[key]}});
  assert.equal(elements.demo.hidden,!allowed);
  assert.equal(elements.demo.removed,!allowed);
  assert.equal(elements['preview-lock'].removed,allowed);
}
assert.equal(allowedPath('/tools/parent-demos/../serve.mjs'),null);
assert.equal(allowedPath('/tools/parent-demos/%2e%2e/serve.mjs'),null);
assert.equal(allowedPath('/tools/parent-demos/%5c..%5cserve.mjs'),null);
assert.equal(allowedPath('/tools/parent-demos/%ZZ'),null);
const server = await startServer(0);
const port = server.address().port;
const request = (urlPath, headers={}) => new Promise((resolve,reject)=>{
  http.get({hostname:'127.0.0.1',port,path:urlPath,headers},res=>{
    const chunks=[]; res.on('data',c=>chunks.push(c)); res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString()}));
  }).on('error',reject);
});
try {
  for (const url of ['/','/tools/parent-demos','/tools/parent-demos/block-lab','/tools/parent-demos/spellbound']) assert.equal((await request(url)).status,302,url);
  for (const url of ['/tools/parent-demos/','/tools/parent-demos/preview-guard.js','/assets/vendor/three/three.module.min.js','/assets/vendor/three/three.core.min.js','/assets/css/style.css']) assert.equal((await request(url)).status,200,url);
  for (const demo of ['block-lab','spellbound']) for (const file of ['index.html','game.js','logic.mjs','style.css']) assert.equal((await request(`/tools/parent-demos/${demo}/${file}`)).status,200,`${demo}/${file}`);
  for (const url of ['/CLAUDE.md','/.git/config','/tools/parent-demos/serve.mjs','/tools/parent-demos/../../cleanup-report.json','/games/craepets/','/tools/parent-demos/%2e%2e/serve.mjs']) assert.equal((await request(url)).status,404,url);
  assert.equal((await request('/tools/parent-demos/',{Host:'evil.test'})).status,403);
  assert.equal((await request('/tools/parent-demos/',{'Sec-Fetch-Site':'cross-site'})).status,403);
  assert.equal((await request('/tools/parent-demos/')).headers['cache-control'],'no-store');
  console.log('PASS: direct-link online previews enabled; no arcade discovery or search indexing requested; local server stays scoped.');
} finally { await new Promise(resolve=>server.close(resolve)); }
