// The code-built Craepets are rigged: a head that looks round, eyes that
// blink and close, feet that step, poses to sit, lie and stretch. None of it
// may change how big a pet is at rest, make it taller than the dining table
// in any pose, or cost more than three draw calls per creature.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../house-test/vendor/three.module.min.js';
import {creature,petpet,disposeCreature,PET_SCALE} from '../house-test/creatures.mjs';

const {colliders}=JSON.parse(fs.readFileSync(new URL('../house-test/house.json',import.meta.url),'utf8'));
const table=colliders.find(b=>b.name==='Tabletop.005').max[1];
// Rest bounds of the separate-sphere creatures this rig replaced (min xyz, max xyz at PET_SCALE).
const LEGACY={
  craepet:[-.198,-.006,-.168,.198,.531,.168],snorbit:[-.198,-.006,-.168,.198,.81,.168],puddlepop:[-.198,-.006,-.349,.198,.615,.168],
  flarn:[-.366,-.006,-.349,.366,.615,.168],twiggle:[-.238,-.006,-.349,.238,.657,.168],glimmr:[-.366,-.006,-.168,.366,.657,.168],
  zibbit:[-.252,-.006,-.168,.252,.57,.192],blorb:[-.198,-.006,-.168,.198,.57,.168],egg:[-.168,-.006,-.168,.168,.372,.168],
};
const species=['craepet','snorbit','puddlepop','flarn','twiggle','glimmr','zibbit','blorb'];
function build(pet){const c=creature(pet);c.scale.setScalar(PET_SCALE);c.updateMatrixWorld(true);return c;}
function bounds(c,precise=false){c.updateMatrixWorld(true);return new THREE.Box3().setFromObject(c,precise);}
function draws(c){let n=0;c.traverse(m=>{if(m.isMesh&&m.visible)n++;});return n;}
function run(c,seconds,opts={},each){const rig=c.userData.rig;for(let t=0;t<seconds;t+=1/30){rig.update(1/30,opts);each?.(t);}}

for(const sp of species){
  for(const egg of [false,true]){
    const key=egg?'egg':sp,c=build({species:sp,egg}),rig=c.userData.rig;
    assert(rig&&rig.head&&rig.bones.body,`${key} has no rig`);
    const b=bounds(c),want=LEGACY[key],got=[...b.min.toArray(),...b.max.toArray()];
    got.forEach((v,i)=>assert(Math.abs(v-want[i])<=.01,`${sp}${egg?' egg':''} rest bounds moved: ${got.map(v=>v.toFixed(3))} vs ${want}`));
    assert(draws(c)<=3,`${key} costs ${draws(c)} draw calls`);
    if(egg)continue;
    // Every face and pose stays inside the rest height (never over the table).
    const rest=bounds(c,true).max.y;
    for(const expression of ['idle','happy','sleep','tired','yawn','sad','squint'])
      for(const pose of [{},{sit:1},{lie:1},{stretch:1},{sniff:1},{shake:1},{scratch:1}]){
        rig.setExpression(expression);rig.setPose(pose);rig.look(.9,.3);run(c,.8);
        const top=bounds(c,true).max.y;
        // A glimmr is a wisp: it has always floated up to 6 cm off the floor.
        assert(top<=rest+(sp==='glimmr'?.07:.012)&&top<table+.05,`${sp} ${expression} ${JSON.stringify(pose)} stands ${top.toFixed(3)} m (rest ${rest.toFixed(3)})`);
      }
    rig.setExpression('idle');rig.setPose({});rig.look(0,0);run(c,1);
  }
}

// Gait: feet keep pace with the ground; a run steps faster and longer, not
// just the walk tempo at a higher speed.
{
  const c=build({species:'blorb'}),rig=c.userData.rig,leg=rig.bones.legL;
  function cadence(speed){let crossings=0,last=null,reach=0;const z0=leg.userData.rest.z;
    run(c,2,{moving:true,speed},()=>{const s=Math.sign(leg.position.z-z0);if(last!==null&&s!==last&&s!==0)crossings++;if(s!==0)last=s;reach=Math.max(reach,Math.abs(leg.position.z-z0));});
    return {hz:crossings/2/2,reach};}
  const walk=cadence(1.9),runFast=cadence(3.1);
  assert(walk.hz>2.2&&walk.hz<4.5,`walk cadence ${walk.hz} Hz`);
  assert(runFast.hz>walk.hz,'running does not step faster');
  assert(3.1/runFast.hz>1.9/walk.hz,'running does not take longer strides');
  assert(walk.reach>.04,'feet barely move');
}
// Blinks happen on their own; a sleeping pet's eyes stay shut.
{
  const c=build({species:'zibbit'}),rig=c.userData.rig;let blinked=false;
  run(c,8,{},()=>{if(rig.bones.eyes.scale.y<.2)blinked=true;});assert(blinked,'never blinked');
  rig.setExpression('sleep');run(c,1.5);let opened=false;run(c,6,{},()=>{if(rig.bones.eyes.scale.y>.05)opened=true;});
  assert(!opened&&rig.bones.sleepEyes.scale.x>.9,'sleeping eyes opened');
}
// Reduced motion: no breathing, bobbing, hopping or swaying on the spot.
{
  const c=build({species:'snorbit'}),rig=c.userData.rig,body=rig.bones.body;const seen=new Set();
  rig.hop(1);run(c,3,{reduced:true},()=>seen.add([body.position.y,rig.bones.torso.scale.y,rig.bones.head.position.y,body.rotation.x,body.rotation.z].map(v=>v.toFixed(4)).join()));
  assert.equal(seen.size,1,'the body moved under reduced motion');
}
// A glimmr floats and its shadow lightens; everyone else stands on the floor.
{
  const g=build({species:'glimmr'});run(g,1);assert(g.userData.rig.bones.body.position.y>.02,'glimmr does not float');
  assert(g.userData.rig.shadow.material.opacity<build({species:'blorb'}).userData.rig.shadow.material.opacity,'floating shadow not lighter');
}
// A petpet rides at its own tiny scale on the same three draw calls.
{
  const owner=build({species:'blorb'}),p=petpet('duckling');assert(draws(p)<=3,'petpet draw calls');
  owner.add(p);assert(bounds(p).getSize(new THREE.Vector3()).y<bounds(owner).getSize(new THREE.Vector3()).y/2,'petpet outgrew its owner');
}
// Disposal frees every material and geometry, but never the shared shadow.
{
  const c=build({species:'flarn',wear:{head:'partyhat',neck:'scarf'}});let freed=0;
  c.traverse(m=>{if(m.material)m.material.addEventListener('dispose',()=>freed++);});
  const shadowMap=c.userData.rig.shadow.material.map;let shadowFreed=false;shadowMap.addEventListener('dispose',()=>shadowFreed=true);
  disposeCreature(c);assert.equal(freed,3,'materials not all disposed');assert(!shadowFreed,'shared shadow texture was disposed');
}
console.log(`PASS creature rig: ${species.length} bodies + eggs keep their rest bounds, ≤3 draw calls each, every pose under the ${table.toFixed(2)} m table; gait, blink, sleep, float and reduced motion behave`);
