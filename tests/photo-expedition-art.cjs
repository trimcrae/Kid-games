// Visual contact sheets of every species and biome, using the game's actual
// geometry, materials and lighting. PHOTO_ART_DIR points outside the checkout.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const out = process.env.PHOTO_ART_DIR;
assert(out, 'Set PHOTO_ART_DIR to a private evidence directory');
const base = process.env.PHOTO_BASE || 'http://127.0.0.1:8766';
(async () => {
  const hour = Number(new Intl.DateTimeFormat('en-US', {timeZone:'America/New_York',hour:'2-digit',hourCycle:'h23'}).format(new Date()));
  assert(hour < 6 || hour >= 10, 'Browser work is restricted 06:00–10:00 New York time');
  fs.mkdirSync(out, {recursive:true});
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:900}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
    await page.goto(base+'/games/photo-expedition/#pick');
    const metrics = await page.evaluate(async () => {
      const THREE=await import('../../assets/vendor/three/three.module.min.js');
      const {makeCreature}=await import('./creatures.mjs');
      document.body.innerHTML='<main id="sheet"></main>';
      document.head.insertAdjacentHTML('beforeend','<style>body{background:#e8e5dc}#sheet{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}figure{margin:0;background:#f4f2ec}figure img{display:block;width:100%}figcaption{padding:6px;font:16px system-ui;text-align:center}</style>');
      const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(480,360);renderer.toneMapping=THREE.ACESFilmicToneMapping;
      const metrics=[];
      for(const id of [...new Set(SITES.flatMap(s=>s.subjects))].filter(id=>['animal','bird','swimmer','flutter'].includes(SUBJECTS[id].kind))) {
        const scene=new THREE.Scene();scene.background=new THREE.Color('#e4e4dc');
        scene.add(new THREE.HemisphereLight('#e5f2ff','#8e765b',2));
        const sun=new THREE.DirectionalLight('#fff0da',3);sun.position.set(4,7,5);scene.add(sun);
        const cr=makeCreature(THREE,id);scene.add(cr.group);scene.updateMatrixWorld(true);
        const bounds=new THREE.Box3().setFromObject(cr.group),size=bounds.getSize(new THREE.Vector3()),centre=bounds.getCenter(new THREE.Vector3());
        const extent=Math.max(size.x,size.y,size.z),cam=new THREE.PerspectiveCamera(36,4/3,.01,extent*20);
        cam.position.copy(centre).add(new THREE.Vector3(1,.5,1.5).normalize().multiplyScalar(extent*2.1));cam.lookAt(centre);
        let triangles=0,meshes=0;cr.group.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;assertFinite(o.geometry.attributes.position.array)}});
        function assertFinite(a){for(const v of a)if(!Number.isFinite(v))throw Error(id+' has invalid geometry')}
        renderer.render(scene,cam);
        const f=document.createElement('figure');f.innerHTML='<img><figcaption></figcaption>';f.firstChild.src=renderer.domElement.toDataURL('image/jpeg',.9);f.lastChild.textContent=id;document.querySelector('#sheet').append(f);
        metrics.push({id,triangles,meshes});
        scene.traverse(o=>{o.geometry?.dispose();if(o.material){o.material.map?.dispose();o.material.dispose()}});
      }
      renderer.dispose();return metrics;
    });
    await page.screenshot({path:path.join(out,'animals.jpg'),fullPage:true});
    await page.goto(base+'/games/photo-expedition/#pick');
    const worlds=await page.evaluate(async()=>{
      const THREE=await import('../../assets/vendor/three/three.module.min.js');const {buildWorld}=await import('./world.mjs');
      const {createCreatureManager}=await import('./creatures.mjs');
      document.body.innerHTML='<main id="sheet"></main>';document.head.insertAdjacentHTML('beforeend','<style>body{background:#e8e5dc}#sheet{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}figure{margin:0}figure img{display:block;width:100%}figcaption{padding:6px;text-align:center}</style>');
      const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(640,400);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
      const metrics=[];
      for(const site of SITES){
        const world=buildWorld(THREE,site,.6);const p=world.spawn.player;const y=world.underwater?world.waterLevel-6:world.heightAt(...p)+2;
        const pos=new THREE.Vector3(p[0],y,p[1]),cam=new THREE.PerspectiveCamera(65,1.6,.1,2600);cam.position.copy(pos);cam.lookAt(0,y+4,0);
        world.update(0,0,.32,pos);renderer.render(world.scene,cam);
        const f=document.createElement('figure');f.innerHTML='<img><figcaption></figcaption>';f.firstChild.src=renderer.domElement.toDataURL('image/jpeg',.9);f.lastChild.textContent=site.name;document.querySelector('#sheet').append(f);
        metrics.push({id:site.id,draws:renderer.info.render.calls,triangles:renderer.info.render.triangles});
        const ids=site.subjects.filter(id=>['animal','bird','swimmer','flutter'].includes(SUBJECTS[id].kind));
        const zoo=createCreatureManager(THREE,world,site,{shy:.8},ids);
        for(let i=0;i<180;i++){
          world.update(.1,i*.1,[.08,.45,.95,1.125][Math.floor(i/45)],pos);
          zoo.update(.1,i*.1,pos,world.env,i%2===0,false);
          for(const cr of zoo.list)if([...cr.group.position.toArray(),...cr.group.quaternion.toArray()].some(v=>!Number.isFinite(v)))throw Error(site.id+'/'+cr.id+' has invalid animation');
        }
        world.dispose();
      }
      renderer.dispose();return metrics;
    });
    await page.screenshot({path:path.join(out,'worlds.jpg'),fullPage:true});
    await page.goto(base+'/games/photo-expedition/#pick');
    await page.evaluate(async()=>{
      const THREE=await import('../../assets/vendor/three/three.module.min.js');const {buildWorld}=await import('./world.mjs');
      document.body.innerHTML='<main id="sheet"></main>';document.head.insertAdjacentHTML('beforeend','<style>#sheet{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}figure{margin:0}figure img{width:100%;display:block}figcaption{text-align:center}</style>');
      const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(480,360);renderer.toneMapping=THREE.ACESFilmicToneMapping;
      for(const id of ['serengeti','amazon','arctic']){
        const world=buildWorld(THREE,SITES.find(s=>s.id===id),.6),pos=new THREE.Vector3(0,25,0),cam=new THREE.PerspectiveCamera(75,4/3,.1,2600);cam.position.copy(pos);
        for(const [label,clock] of [['Dawn',.05],['Day',.5],['Dusk',.95],['Night',1.125]]){
          world.update(0,30,clock,pos);cam.lookAt(pos.clone().add(new THREE.Vector3(0,.65,-1)));
          renderer.toneMappingExposure=1.05-world.env.night*.35;renderer.render(world.scene,cam);
          const f=document.createElement('figure');f.innerHTML='<img><figcaption></figcaption>';f.firstChild.src=renderer.domElement.toDataURL('image/jpeg',.9);f.lastChild.textContent=id+' · '+label;document.querySelector('#sheet').append(f);
        }
        world.dispose();
      }
      renderer.dispose();
    });
    await page.screenshot({path:path.join(out,'sky.jpg'),fullPage:true});
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out,'metrics.json'),JSON.stringify({animals:metrics,worlds},null,2));
    console.log(JSON.stringify({species:metrics.length,biomes:worlds.length,maxAnimalTriangles:Math.max(...metrics.map(m=>m.triangles)),maxWorldDraws:Math.max(...worlds.map(m=>m.draws)),errors}));
  } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
