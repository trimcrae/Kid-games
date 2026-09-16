// The depth prepass (house-test/depth-prepass.mjs) must only ever save work:
// it may reject hidden fragments, never change a visible pixel.
//  1. Unit: which meshes and triangles become occluders, copied bit for bit.
//  2. Browser, real house: the prepass is built and compiled after load, and
//     one frame rendered with and without it is the same picture at the low
//     render scale the resolution controller uses and at full scale.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import * as THREE from '../../house-test/vendor/three.module.min.js';
import {eligible,mergeOccluders} from '../../house-test/depth-prepass.mjs';
import {createHouseMaterial} from '../../house-test/materials.mjs';

// 1. Unit ---------------------------------------------------------------
const soup=(tris)=>{const a=new Float32Array(tris.flat(1).flatMap(p=>[...p,0,1,0]));
  const g=new THREE.BufferGeometry(),b=new THREE.InterleavedBuffer(a,6);
  g.setAttribute('position',new THREE.InterleavedBufferAttribute(b,3,0));g.setAttribute('normal',new THREE.InterleavedBufferAttribute(b,3,3));return g;};
const big=[[[0,0,0],[1,0,0],[0,1.3,0]]],tiny=[[[0,0,0],[.05,0,0],[0,.05,0]]];
const house=f=>createHouseMaterial({name:'Test / '+f.surface,color:[.5,.5,.5],finish:f});
const wall=new THREE.Mesh(soup([...big,...tiny]),house({surface:'paint',roughness:.6}));
const glass=new THREE.Mesh(soup(big),house({surface:'glass',roughness:.08,opacity:.2}));
const leaves=new THREE.Mesh(soup(big),house({surface:'foliage',roughness:.8}));
const pet=new THREE.Mesh(soup(big),new THREE.MeshStandardMaterial());
for(const m of [wall,glass,leaves,pet])m.updateMatrixWorld(true);
assert.deepEqual([wall,glass,leaves,pet].map(eligible),[true,false,false,false],'only opaque, non-dissolving house groups occlude');
const merged=mergeOccluders([wall]);
assert.equal(merged.length,9,'the big triangle is kept and the 12.5 cm² one dropped');
assert.deepEqual([...merged],big.flat(2).map(v=>Math.fround(v)),'occluder positions are the house positions, bit for bit');
const moved=new THREE.Mesh(wall.geometry,wall.material);moved.position.set(2,0,0);moved.updateMatrixWorld(true);
assert.equal(mergeOccluders([moved])[0],2,'a transformed group is merged in world space');
console.log('PASS unit: eligibility, area threshold, exact positions');

// 2. Browser ------------------------------------------------------------
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../../',import.meta.url));
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://local');
    let path=resolve(root,'.'+decodeURIComponent(url.pathname));
    if(url.pathname.endsWith('/'))path=resolve(path,'index.html');
    if(!path.startsWith(resolve(root)+sep)){res.writeHead(403).end();return;}
    let bytes=await readFile(path);
    // Hand the test the live renderer (the page itself exposes only state).
    if(url.pathname==='/house-test/walkthrough.js')bytes=bytes.toString()+'\nwindow.__prepassTest={renderer,scene,camera};\n';
    res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');res.end(bytes);
  }catch{res.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
let browser;
try{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args:['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist']});
  const page=await browser.newPage({viewport:{width:1100,height:700}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(()=>{localStorage.setItem('craepets.house.who','tristan');
    localStorage.setItem('craepets.house.v1.tristan',JSON.stringify({v:1,pet:{name:'Pip',species:'craepet',colour:'blue',egg:false},coins:20}));});
  await page.goto('http://127.0.0.1:'+server.address().port+'/house-test/');
  await page.waitForFunction(()=>window.houseTest&&!document.getElementById('start').disabled,null,{timeout:240000});
  await page.waitForFunction(()=>window.houseTest.state.depthPrepass?.ready,null,{timeout:30000});
  const state=await page.evaluate(()=>window.houseTest.state);
  assert(state.depthPrepass.enabled,'prepass on by default');
  assert(state.depthPrepass.triangles>50000&&state.depthPrepass.triangles<250000,'occluder mesh size '+state.depthPrepass.triangles);
  // 32 until the use-with-E props, the monitor and the house cats (e234ba9) added their own;
  // the baked-light variants replace the unbaked ones one for one.
  assert(state.programs<=37,'program count '+state.programs);
  const compare=await page.evaluate(async()=>{
    const {renderer,scene,camera}=window.__prepassTest,gl=renderer.getContext(),control=renderer.houseDepthPrepass,out=[];
    const grab=()=>{renderer.render(scene,camera);const w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,p=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,p);return p;};
    const ratio=renderer.getPixelRatio();
    for(const pr of [.6,1]){
      renderer.setPixelRatio(pr);
      control.enabled=true;const a=grab();control.enabled=false;const b=grab();control.enabled=true;
      let big=0,n=a.length/4;for(let i=0;i<a.length;i+=4)if(Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]))>24)big++;
      out.push({pr,differing:big/n,glError:gl.getError()});
    }
    renderer.setPixelRatio(ratio);return out;
  });
  for(const c of compare){
    assert.equal(c.glError,0);
    assert(c.differing<.0005,`prepass changed ${(c.differing*100).toFixed(3)} % of pixels at scale ${c.pr}`);
  }
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS browser',JSON.stringify({prepass:state.depthPrepass,programs:state.programs,compare}));
}finally{await browser?.close();await new Promise(done=>server.close(done));}
