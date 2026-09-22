// Numeric stance/IK regression and close-up visual evidence, using real meshes.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out=process.env.PHOTO_ART_DIR;assert(out,'Set PHOTO_ART_DIR outside the checkout');
(async()=>{
  const hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',hourCycle:'h23'}).format(new Date()));
  assert(hour<6||hour>=10,'Browser checks restricted 06:00–10:00 New York time');
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:950}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
    await page.goto((process.env.PHOTO_BASE||'http://127.0.0.1:8766')+'/games/photo-expedition/#pick');
    const result=await page.evaluate(async(stepDt)=>{
      const THREE=await import('../../assets/vendor/three/three.module.min.js');
      const {makeCreature}=await import('./creatures.mjs');const {updateWalk}=await import('./locomotion.mjs');
      const {barkMaterial,foliageMaterial,broadleafTree,pineTree}=await import('./vegetation.mjs');
      document.body.innerHTML='<main id="sheet"></main><main id="walks"></main>';document.head.insertAdjacentHTML('beforeend','<style>body{background:#e1dfd6}main{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}figure{margin:0}figure img{width:100%;display:block}figcaption{text-align:center;font:16px system-ui;padding:8px}</style>');
      const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(720,540);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;
      function studio(){const scene=new THREE.Scene();scene.background=new THREE.Color('#d4d6cd');scene.add(new THREE.HemisphereLight('#f4f6ff','#6f6750',2));const sun=new THREE.DirectionalLight('#ffeed4',3);sun.position.set(5,9,7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-8;sun.shadow.camera.right=8;sun.shadow.camera.top=8;sun.shadow.camera.bottom=-8;scene.add(sun);const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#c4c5b4',roughness:1}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);return scene}
      function capture(scene,subject,label,angle=new THREE.Vector3(1.4,.45,1.6)){
        const bounds=new THREE.Box3().setFromObject(subject),size=bounds.getSize(new THREE.Vector3()),centre=bounds.getCenter(new THREE.Vector3()),extent=Math.max(size.x,size.y,size.z);
        const camera=new THREE.PerspectiveCamera(34,4/3,.01,400);camera.position.copy(centre).add(angle.clone().normalize().multiplyScalar(extent*2));camera.lookAt(centre);renderer.render(scene,camera);
        const f=document.createElement('figure');f.innerHTML='<img><figcaption></figcaption>';f.firstChild.src=renderer.domElement.toDataURL('image/jpeg',.92);f.lastChild.textContent=label;document.querySelector('#sheet').append(f);
      }
      const metrics=[];
      for(const id of [...new Set(SITES.flatMap(s=>s.subjects))].filter(id=>SUBJECTS[id].kind==='animal')){
        const cr=makeCreature(THREE,id);if(!cr.parts.walk)continue;
        cr.scale=1;cr.heading=0;cr.pos=new THREE.Vector3();cr.fleeing=false;cr.seed=0;
        const scene=studio();scene.add(cr.group);let maxSlip=0,maxGap=0,maxGroundError=0;
        const previous=new Map(),floor=(x,z)=>.07*z+.04*Math.sin(x);
        for(let i=0;i<720;i++){
          const dt=stepDt,moving=i<600;cr.fleeing=i>=360&&i<480;
          if(moving){cr.heading=i>180?(i-180)*.002:0;const speed=Math.min(cr.spec.speed*(cr.fleeing?2.5:1),cr.spec.sh*(cr.fleeing?4.5:1.8));cr.pos.x+=Math.sin(cr.heading)*speed*dt;cr.pos.z+=Math.cos(cr.heading)*speed*dt}
          cr.group.position.copy(cr.pos);cr.group.position.y=floor(cr.pos.x,cr.pos.z);cr.group.rotation.set(-Math.atan(.07)*Math.cos(cr.heading),cr.heading,0);
          updateWalk(THREE,cr,dt,floor);cr.group.updateMatrixWorld(true);
          for(const leg of cr.parts.walk.legs){
            const actual=new THREE.Vector3().setFromMatrixPosition(leg.foot.matrixWorld),last=previous.get(leg);
            if(!leg.swing&&!last?.swing){if(last)maxSlip=Math.max(maxSlip,actual.distanceTo(last.pos));maxGroundError=Math.max(maxGroundError,Math.abs(actual.y-leg.footH-floor(actual.x,actual.z)))}
            const ankle=new THREE.Vector3(0,-1,0).applyMatrix4(leg.lower.matrixWorld);maxGap=Math.max(maxGap,ankle.distanceTo(actual));
            if(!actual.toArray().every(Number.isFinite))throw Error(id+' invalid foot');
            previous.set(leg,{pos:actual,swing:leg.swing});
          }
        }
        metrics.push({id,maxSlip,maxGap,maxGroundError});
        // Reset the rig on a level studio floor for a detailed portrait.
        cr.parts.walk.previous=null;for(const l of cr.parts.walk.legs)l.planted=null;cr.pos.set(0,0,0);cr.group.position.set(0,0,0);cr.heading=0;cr.group.rotation.set(0,0,0);updateWalk(THREE,cr,1/60,()=>0);
        capture(scene,cr.group,id);
        if(['lion','elephant','zebra'].includes(id)){
          cr.fleeing=false;cr.parts.walk.phase=0;
          let next=1.1,shot=0;
          for(let frame=0;frame<600&&shot<4;frame++){
            cr.pos.z+=Math.min(cr.spec.speed,cr.spec.sh*1.8)/60;cr.group.position.z=cr.pos.z;
            updateWalk(THREE,cr,1/60,()=>0);
            if(cr.parts.walk.phase>=next){capture(scene,cr.group,id+' · step '+(++shot),new THREE.Vector3(1,.22,.3));document.querySelector('#walks').append(document.querySelector('#sheet').lastChild);next+=.25}
          }
        }
        scene.traverse(o=>{o.geometry?.dispose();if(o.material){for(const value of Object.values(o.material))if(value?.isTexture)value.dispose();o.material.dispose()}});
      }
      for(const kind of ['acacia','kapok','pine']){
        const scene=studio(),bark=barkMaterial(THREE),leaves=foliageMaterial(THREE,kind==='pine'),group=new THREE.Group();
        const parts=kind==='pine'?pineTree(THREE,leaves,bark):broadleafTree(THREE,kind,leaves,bark);
        for(const p of parts){const m=new THREE.Mesh(p.geo,p.mat);m.castShadow=true;group.add(m)}scene.add(group);capture(scene,group,kind,new THREE.Vector3(1,.28,1.6));
      }
      renderer.dispose();return metrics;
    },Number(process.env.PHOTO_MOTION_DT||1/60));
    await page.locator('#sheet').screenshot({path:path.join(out,'closeups.jpg')});
    await page.locator('#walks').screenshot({path:path.join(out,'walking.jpg')});
    fs.writeFileSync(path.join(out,'motion.json'),JSON.stringify(result,null,2));
    assert.deepEqual(errors,[]);
    for(const m of result){assert(m.maxSlip<.005,`${m.id} stance slip ${m.maxSlip}`);assert(m.maxGroundError<.005,`${m.id} foot height ${m.maxGroundError}`);assert(m.maxGap<.02,`${m.id} IK gap ${m.maxGap}`)}
    console.log(JSON.stringify({quadrupeds:result.length,maxSlip:Math.max(...result.map(m=>m.maxSlip)),maxGap:Math.max(...result.map(m=>m.maxGap)),errors}));
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
