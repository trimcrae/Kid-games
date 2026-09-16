// The shipped baked-light data (house-test/house.json bakedLight): it belongs
// to the shipped mesh, covers every vertex, keeps each triangle either wholly
// baked or wholly on live light (a mixed triangle would smear a lightmap UV
// across the sentinel), keeps UVs inside the atlas, and its files match their
// hashes and sizes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {checkBakedLight,UNBAKED} from '../house-test/baked-light.mjs';

const dir=new URL('../house-test/',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,dir));
const sha=b=>createHash('sha256').update(b).digest('hex');
const data=JSON.parse(read('house.json'));
const d=data.bakedLight;
if(!d){console.log('PASS baked light data: none shipped');process.exit(0);}
const {uv,pages,count}=checkBakedLight(d,data);
const mesh=gunzipSync(read('house.mesh.gz'));
assert.equal(sha(mesh),data.meshSha256,'The mesh is not the one the manifest describes');
assert.equal(mesh.byteLength,count*24);
if(data.ambientOcclusion)assert.equal(data.ambientOcclusion.meshSha256,data.meshSha256,'AO and bake belong to different meshes');
const raw=gunzipSync(read(uv.url));
assert.equal(raw.byteLength,count*4);assert.equal(sha(raw),uv.sha256);
const coords=new Uint16Array(raw.buffer,raw.byteOffset,raw.byteLength/2);
let baked=0,mixed=0,triangles=0,outside=0;
for(const g of data.groups){
  const first=g.offset/24;
  assert.equal(g.count%3,0,'A group is not whole triangles: '+g.name);
  for(let t=0;t<g.count;t+=3){
    let n=0;
    for(let k=0;k<3;k++){const i=(first+t+k)*2,u=coords[i],v=coords[i+1];
      const sentinel=u===UNBAKED&&v===UNBAKED;
      if(!sentinel){n++;if(u>=UNBAKED||v>=UNBAKED)outside++;}
      else if(u!==v)outside++;}
    triangles++;baked+=n;if(n&&n!==3)mixed++;
    // moving parts stay live (the runtime ignores their UVs anyway)
    if(g.prop)assert.equal(n,0,'A moving part carries baked light: '+g.name);
  }
}
assert.equal(mixed,0,`${mixed} triangles mix baked and live vertices`);
assert.equal(outside,0,`${outside} lightmap UVs are malformed`);
assert.equal(baked,uv.bakedVertices,'bakedVertices does not match the sidecar');
assert(baked>0);
for(const id of ['day','night']){
  const p=pages[id],png=read(p.url);
  assert.equal(sha(png),p.sha256,id+' page hash');
  assert.equal(png.readUInt32BE(16),p.width,id+' width');assert.equal(png.readUInt32BE(20),p.height,id+' height');
}
const bytes=['house.lightuv.gz',pages.day.url,pages.night.url].reduce((a,n)=>a+read(n).length,0);
assert(bytes<16*2**20,'The bake downloads '+(bytes/2**20).toFixed(1)+' MB');
console.log(`PASS baked light data: ${baked} of ${count} vertices baked in ${triangles} triangles, none mixed; UVs well-formed; pages ${pages.day.width}x${pages.day.height} match their hashes; ${(bytes/2**20).toFixed(2)} MB to download`);
