#!/usr/bin/env node
"use strict";
// Actual exported furniture, actual house materials. Lightweight WebGL coverage
// complements the full walkthrough/collision suites without loading the jungle.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require('playwright-core');
const root = path.resolve(__dirname, '..');
const out = process.env.HOUSE_UPHOLSTERY_VISUAL_DIR || '/tmp/house-upholstery-visuals';
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/__upholstery__.html') {
      res.setHeader('Content-Type', 'text/html');
      res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><style>body{margin:0}canvas{display:block}</style>');
      return;
    }
    const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    res.setHeader('Content-Type', /\.m?js$/.test(file) ? 'text/javascript' : 'application/octet-stream');
    res.end(await fs.readFile(file));
  } catch { res.writeHead(404).end(); }
});
(async () => {
  await fs.mkdir(out, {recursive:true});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',
      headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
    for (const mobile of [false,true]) {
      const page = await browser.newPage({viewport:mobile?{width:390,height:540}:{width:800,height:600},isMobile:mobile,hasTouch:mobile});
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => {if(m.type()==='error') errors.push(m.text());});
      await page.goto('http://127.0.0.1:'+server.address().port+'/__upholstery__.html');
      const metrics = await page.evaluate(async () => {
        const THREE = await import('/house-test/vendor/three.module.min.js');
        const {createHouseMaterial} = await import('/house-test/materials.mjs');
        const data = await (await fetch('/house-test/house.json')).json();
        const response = await fetch('/house-test/house.mesh.gz');
        const binary = await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
        const renderer = new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
        renderer.setSize(innerWidth,innerHeight);renderer.toneMapping=THREE.AgXToneMapping;
        document.body.append(renderer.domElement);
        const scene = new THREE.Scene();scene.background=new THREE.Color('#e3dfd6');
        scene.add(new THREE.HemisphereLight('#eaf4ff','#897965',2.2));
        const sun = new THREE.DirectionalLight('#fff3e2',3);sun.position.set(2,4,3);scene.add(sun);
        const checks=[];
        // Family sofa and sunroom cushions formerly exported as single-cut
        // bevels. They now retain a curved silhouette and smooth edge normals.
        for(const prefix of ['06 | Sunroom furniture','13 | Lower family room furniture']) {
          const g=data.groups.find(g=>g.name===prefix+' / Sunroom blue grey cushions');
          if(!g)throw Error('Missing upholstery '+prefix);
          const buffer=new THREE.InterleavedBuffer(new Float32Array(binary,g.offset,g.count*6),6);
          const geometry=new THREE.BufferGeometry();
          geometry.setAttribute('position',new THREE.InterleavedBufferAttribute(buffer,3,0));
          geometry.setAttribute('normal',new THREE.InterleavedBufferAttribute(buffer,3,3));
          geometry.computeBoundingBox();
          const material=createHouseMaterial(g),mesh=new THREE.Mesh(geometry,material);
          const centre=geometry.boundingBox.getCenter(new THREE.Vector3());
          const extent=Math.max(...geometry.boundingBox.getSize(new THREE.Vector3()).toArray());
          mesh.position.copy(centre).negate();scene.add(mesh);
          const camera=new THREE.PerspectiveCamera(35,innerWidth/innerHeight,.01,50);
          camera.position.set(extent*.95,extent*.55,extent*1.5);camera.lookAt(0,0,0);
          // Portrait aspect needs more distance for the full sofa silhouette.
          if(innerWidth<innerHeight)camera.position.multiplyScalar(1.3);
          renderer.render(scene,camera);
          const gl=renderer.getContext(),pixels=new Uint8Array(innerWidth*innerHeight*4);
          gl.readPixels(0,0,innerWidth,innerHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
          let min=255,max=0;for(let i=0;i<pixels.length;i+=4){min=Math.min(min,pixels[i]);max=Math.max(max,pixels[i]);}
          checks.push({name:g.name,draws:renderer.info.render.calls,triangles:renderer.info.render.triangles,
            pixelRange:max-min,glError:gl.getError(),programs:renderer.info.programs.length});
          mesh.removeFromParent();geometry.dispose();material.dispose();
          if(renderer.info.memory.geometries!==0)throw Error('Upholstery geometry leaked');
        }
        // Keep the last rendered frame for the runner's screenshot.
        return checks;
      });
      assert.deepEqual(errors,[],'House material/shader errors');
      for(const m of metrics){assert.equal(m.glError,0);assert.equal(m.draws,1);assert(m.triangles>1000);assert(m.triangles<30000);assert(m.pixelRange>45);assert(m.programs<=2);}
      await page.screenshot({path:path.join(out,mobile?'phone.png':'desktop.png')});
      console.log('PASS exported house upholstery',mobile?'phone':'desktop',JSON.stringify(metrics));
      await page.close();
    }
  } finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
