// Baked bounce light: the loader's checks (house-test/baked-light.mjs). A bake
// that is missing, belongs to another mesh, is truncated, corrupt, the wrong
// size or too slow is refused with an error the house turns into "usual light";
// a good one comes back with its UVs and both pages.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {loadBakedLight,checkBakedLight,UNBAKED} from '../house-test/baked-light.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
// A tiny mesh: two groups, five vertices (24 bytes each).
const binary=new ArrayBuffer(5*24);new Float32Array(binary).forEach((_,i,a)=>{a[i]=i*.01;});
const uv=new Uint16Array([100,200, UNBAKED,UNBAKED, 300,400, 500,600, UNBAKED,UNBAKED]);
const uvBytes=Buffer.from(uv.buffer);
const png={day:Buffer.from('fake-day-png'),night:Buffer.from('fake-night-png')};
function manifest(change={}){
  const d={version:1,encoding:'gamma2.2',meshSha256:sha(Buffer.from(binary)),
    uv:{url:'house.lightuv.gz',encoding:'uint16-pair',vertexCount:5,bakedVertices:3,sha256:sha(uvBytes)},
    pages:[{id:'day',url:'house.light.day.png',width:64,height:32,sha256:sha(png.day),scale:1.5},
           {id:'night',url:'house.light.night.png',width:64,height:32,sha256:sha(png.night),scale:.7}]};
  change.d?.(d);
  return {meshSha256:d.meshSha256,groups:[{offset:0,count:2},{offset:48,count:3}],bakedLight:d};
}
const files={'./house.lightuv.gz':gzipSync(uvBytes),'./house.light.day.png':png.day,'./house.light.night.png':png.night};
// (The loader keys each file by its hash in a ?v= query; the stubs look up the file.)
const fetcher=(over={})=>async(requested,{signal}={})=>{
  const url=requested.split('?')[0];
  if(over.hang===url)return new Promise((_,reject)=>signal?.addEventListener('abort',()=>reject(Error('aborted'))));
  const body=(over[url]??files[url]);
  if(!body)return new Response(null,{status:404});
  return new Response(body);
};
const decode=async bytes=>({width:64,height:32,bytes});
const load=(data,opts={})=>loadBakedLight(data,binary,{fetcher:fetcher(opts.files),decode:opts.decode||decode,timeoutMs:opts.timeoutMs||2000});

// No bake in the manifest: nothing is requested.
assert.equal(await loadBakedLight({meshSha256:'x',groups:[]},binary,{fetcher:()=>{throw Error('requested');}}),null);

// A good bake — every request carries its file's hash.
{const seen=[];await loadBakedLight(manifest(),binary,{fetcher:async(u,o)=>{seen.push(u);return fetcher()(u,o);},decode});
  assert(seen.length===3&&seen.every(u=>/\?v=[a-f0-9]{16}$/.test(u)),'Lightmap requests are not keyed by hash: '+seen);}
// A good bake.
const good=await load(manifest());
assert.equal(good.bakedVertices,3);
assert.deepEqual([...good.uv],[...uv]);
assert.equal(good.pages.day.scale,1.5);assert.equal(good.pages.night.scale,.7);
assert.equal(good.pages.day.image.width,64);

// Refused before any request.
const refuse=async(data,pattern,opts)=>assert.rejects(()=>load(data,opts),pattern);
await refuse(manifest({d:d=>{d.version=2;}}),/descriptor/);
// A bake for another export than this manifest's mesh…
{const data=manifest();data.bakedLight.meshSha256='0'.repeat(64);await refuse(data,/descriptor/);}
// …and a manifest (with its bake) that doesn't match the mesh actually downloaded.
await refuse(manifest({d:d=>{d.meshSha256='0'.repeat(64);}}),/different mesh/);
await refuse(manifest({d:d=>{d.uv.url='../secret.gz';}}),/UV descriptor/);
await refuse(manifest({d:d=>{d.uv.vertexCount=4;}}),/vertex count/);
await refuse(manifest({d:d=>{d.pages.pop();}}),/page: night/);
await refuse(manifest({d:d=>{d.pages[1].width=128;}}),/differ in size/);
await refuse(manifest({d:d=>{d.pages[0].scale=0;}}),/page: day/);
assert.throws(()=>checkBakedLight(manifest().bakedLight,{...manifest(),groups:[{offset:0,count:2},{offset:24,count:3}]}),/coverage/);

// Refused on the data.
{const data=manifest();const other=new ArrayBuffer(5*24);
  await assert.rejects(()=>loadBakedLight(data,other,{fetcher:fetcher(),decode}),/different mesh/);}
// A missing file (404).
await assert.rejects(()=>loadBakedLight(manifest(),binary,{fetcher:async u=>u.split('?')[0].endsWith('lightuv.gz')?new Response(null,{status:404}):new Response(files[u.split('?')[0]]),decode}),/unavailable/);
await refuse(manifest(),/UV size/,{files:{'./house.lightuv.gz':gzipSync(uvBytes.subarray(0,8))}});
{const bad=Buffer.from(uvBytes);bad[0]^=1;await refuse(manifest(),/UV checksum/,{files:{'./house.lightuv.gz':gzipSync(bad)}});}
{const none=Buffer.from(new Uint16Array(10).fill(UNBAKED).buffer);
  await refuse(manifest({d:d=>{d.uv.sha256=sha(none);}}),/covers no vertices/,{files:{'./house.lightuv.gz':gzipSync(none)}});}
await refuse(manifest(),/checksum mismatch: day/,{files:{'./house.light.day.png':Buffer.from('tampered')}});
await refuse(manifest(),/size mismatch: night/,{decode:async b=>({width:Buffer.from(b).toString().includes('night')?63:64,height:32})});
// A failure releases whatever was already decoded, and stops the rest.
{const made=[];const tracking=async b=>{const img={width:Buffer.from(b).toString().includes('night')?63:64,height:32,closed:false,close(){this.closed=true;}};made.push(img);return img;};
  await refuse(manifest(),/size mismatch: night/,{decode:tracking});
  assert(made.length>0&&made.every(i=>i.closed),'Decoded pages were not released after a failure');}
// The mesh may still be downloading: a promise of it works.
{const late=await loadBakedLight(manifest(),new Promise(r=>setTimeout(()=>r(binary),50)),{fetcher:fetcher(),decode});
  assert.equal(late.bakedVertices,3);}
// The house was ready and won't wait: the caller's abort ends it at once.
{const ctl=new AbortController();const began=Date.now();
  const p=loadBakedLight(manifest(),binary,{fetcher:fetcher({hang:'./house.light.day.png'}),decode,signal:ctl.signal,timeoutMs:5000});
  setTimeout(()=>ctl.abort(),60);
  await assert.rejects(p,/not needed/);
  assert(Date.now()-began<1000,'An abort did not end the load promptly');}
// A stalled page never holds the house up.
{const began=Date.now();
  await refuse(manifest(),/timed out/,{files:{hang:'./house.light.night.png'},timeoutMs:150});
  assert(Date.now()-began<1500,'The timeout did not bound the load');}

console.log('PASS baked light loader: absent bake makes no request; a good bake returns UVs and both pages; bad descriptor, other mesh, coverage, missing/truncated/corrupt UVs, empty bake, tampered or wrong-size pages and a stalled request are all refused (bounded)');
