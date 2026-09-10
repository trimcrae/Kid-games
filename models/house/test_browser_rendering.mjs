// Real WebGL compilation of every finish and the lighting/probe path, without
// needing a .blend or rebuilt house. Full house frame times and tour comparison
// still require the existing desktop/phone walkthrough checks.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../../',import.meta.url));
const fixture=`<!doctype html><html><head><link rel="icon" href="data:,"><style>
body{margin:0;background:#b5c1bd}canvas{display:block;width:100vw;height:100vh}</style></head><body><script type="module">
import * as THREE from '/house-test/vendor/three.module.min.js';
import {createHouseMaterial} from '/house-test/materials.mjs';
import {createHouseLighting} from '/house-test/lighting.mjs';
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setSize(innerWidth,innerHeight);renderer.toneMapping=THREE.AgXToneMapping;
document.body.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#b5c1bd');
const camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,.05,100);
camera.position.set(0,7,13);camera.lookAt(0,0,0);
const mobile=new URLSearchParams(location.search).has('mobile');
const lighting=createHouseLighting(scene,renderer,{mobile});
const surfaces=['wood','fabric','carpet','blocks','siding','shakes','roof','lawn','mineral','stone','paint','ceramic','brushed','foliage','glass','screen','metal','panels'];
const geometry=new THREE.SphereGeometry(.53,24,16);
for(const [index,surface] of surfaces.entries()){
  const finish={surface,roughness:surface==='metal'?.04:.48,
    metalness:['metal','brushed'].includes(surface)?1:0,
    clearcoat:['wood','ceramic','screen'].includes(surface)?.5:0,
    sheen:['fabric','carpet'].includes(surface)?.6:0,
    grainAxis:index%2?'y':'x',panelSize:[1.2,.6,.01],panelOffset:0,mortarColor:[.48,.44,.36]};
  const mat=createHouseMaterial({name:'Fixture / '+surface,color:[.32,.24,.12],finish});
  const mesh=new THREE.Mesh(geometry,mat);mesh.position.set((index%6-2.5)*1.35,.64,(Math.floor(index/6)-1)*1.6);
  mesh.castShadow=mesh.receiveShadow=surface!=='glass';mesh.layers.enable(1);scene.add(mesh);
}
const floor=new THREE.Mesh(new THREE.BoxGeometry(10,.1,8),createHouseMaterial({name:'Fixture / oak',color:[.4,.22,.09],finish:{surface:'wood',roughness:.32,clearcoat:.3}}));
floor.layers.enable(1);floor.receiveShadow=true;scene.add(floor);
lighting.load({colliders:[],lights:[{name:'Fixture ceiling',type:'area',power:55,size:2,angle:1.35,
  position:[0,3,0],direction:[0,-1,0],color:[1,.8,.58]},
  {name:'Fixture lamp',type:'point',power:42,position:[-3,2,0],direction:[0,-1,0],color:[1,.8,.58]}]});
const position={x:0,y:0,z:4};
lighting.setRoom('Loading room',position);
lighting.tick(position,performance.now()+2000,false);
if(lighting.diagnostics().reflectionProbes!==0)throw Error('Room captures delayed initial controls');
for(let room=0;room<5;room++){
  lighting.setRoom('Fixture '+room,position);
  lighting.tick(position,performance.now()+2000+room*2000);
  renderer.render(scene,camera);
}
const gl=renderer.getContext(),pixel=new Uint8Array(innerWidth*innerHeight*4);
gl.readPixels(0,0,innerWidth,innerHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
let min=255,max=0;for(let i=0;i<pixel.length;i+=4){min=Math.min(min,pixel[i]);max=Math.max(max,pixel[i]);}
window.rendererResult={...lighting.diagnostics(),programs:renderer.info.programs.length,
  textures:renderer.info.memory.textures,drawCalls:renderer.info.render.calls,pixelRange:max-min,
  glError:gl.getError()};
</script></body></html>`;

const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://local');
    if(url.pathname==='/'){res.setHeader('Content-Type','text/html');res.end(fixture);return;}
    const path=resolve(root,'.'+url.pathname);
    if(!path.startsWith(resolve(root)+sep)){res.writeHead(403).end();return;}
    const bytes=await readFile(path);
    res.setHeader('Content-Type',['.js','.mjs'].includes(extname(path))?'text/javascript':'application/octet-stream');res.end(bytes);
  }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  for(const mobile of [false,true]){
    const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1100,height:760},isMobile:mobile,hasTouch:mobile});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto('http://127.0.0.1:'+server.address().port+'/'+(mobile?'?mobile':''));
    await page.waitForFunction(()=>window.rendererResult,{},{timeout:60000});
    const result=await page.evaluate(()=>window.rendererResult);
    assert.equal(errors.length,0,errors.map(message=>message.slice(0,900)).join('\n'));
    assert.equal(result.glError,0);
    assert(result.programs>0&&result.programs<=30,'Finish families compiled redundant PBR shaders');
    assert(result.pixelRange>40,'Fixture did not produce shaded pixels');
    assert.equal(result.reflectionProbes,3);assert.equal(result.shadowedLight,'Fixture ceiling');
    assert.equal(result.shadowMapSize,mobile?1024:2048);
    if(process.env.HOUSE_RENDER_CAPTURE&&!mobile)await page.screenshot({path:process.env.HOUSE_RENDER_CAPTURE});
    console.log('PASS',mobile?'phone':'desktop',JSON.stringify(result));await page.close();
  }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
