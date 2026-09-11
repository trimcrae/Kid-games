// After-activity moments: fed → trot to the kitchen feeding mat and munch;
// bathed → shake; rested → stretch; played → chase a ball. Short, ended by
// any step you take, and without trotting or rolling under reduced motion.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WalkingWorld} from '../house-test/physics.mjs';
import {rooms} from '../house-test/rooms.mjs';
import {aftermathFor,createAftermath} from '../house-test/aftermath.mjs';

const data=JSON.parse(fs.readFileSync(new URL('../house-test/house.json',import.meta.url),'utf8'));
const world=new WalkingWorld(data.colliders,{height:1.05});
const pet=o=>({hunger:50,happy:50,energy:50,clean:50,...o});
assert.equal(aftermathFor(pet(),pet({hunger:70})),'feed');assert.equal(aftermathFor(pet(),pet({clean:90})),'bath');
assert.equal(aftermathFor(pet(),pet({energy:80})),'rest');assert.equal(aftermathFor(pet(),pet({happy:60})),'play');
assert.equal(aftermathFor(pet(),pet()),null);assert.equal(aftermathFor({},{}),null,'missing needs are not a change');
const kitchen=rooms.find(r=>r[1]==='Kitchen'),start=world.safeSpot(kitchen[2],0,-kitchen[3]);
const mat={x:2.85,y:world.floor(2.85,-7.15,0),z:-7.15};
function run(kind,{reduced=false,cancelAt=null}={}){
  const a=createAftermath(),p={...start};let heading=0,t=0;const seen=[];
  a.start(kind,{pet:{...p},heading,mat,world,reduced});
  for(;t<9&&a.active;t+=1/30){
    const o=a.update(1/30,{moving:cancelAt!==null&&t>=cancelAt,pet:p,heading});if(!o)break;
    if(o.move)world.move(p,o.move.dx,o.move.dz);if(o.face!=null)heading=o.face;seen.push({...o,p:{...p}});
  }
  return {seen,p,t,active:a.active};
}
{const {seen,p,t}=run('feed');
  assert(Math.hypot(p.x-mat.x,p.z-mat.z)<.2,'did not reach the feeding mat');
  assert(seen.some(o=>o.phase==='munch'&&o.emote==='food'),'no munching');assert(seen.some(o=>o.hop>0),'no happy hop');
  assert(t<7,'aftermath too long: '+t.toFixed(1));}
{const {seen,p}=run('feed',{reduced:true});
  assert(Math.hypot(p.x-start.x,p.z-start.z)<1e-6,'moved under reduced motion');assert(seen.some(o=>o.prop?.kind==='bowl'),'no bowl');
  assert(seen.every(o=>!o.hop),'hopped under reduced motion');}
{const {active,t}=run('feed',{cancelAt:.3});assert(!active&&t<.5,'a step did not end it');}
{const {seen}=run('bath');assert(seen.some(o=>o.pose.shake&&o.emote==='sparkle'),'no shake');}
{const {seen}=run('rest');assert(seen.some(o=>o.pose.stretch>.5),'no stretch');assert(seen.some(o=>o.expression==='yawn'),'no yawn');}
{const {seen,p}=run('play');assert(seen.some(o=>o.prop?.kind==='ball'),'no ball');assert(Math.hypot(p.x-start.x,p.z-start.z)>.4,'did not chase the ball');}
console.log('PASS aftermath: feed trots to the mat and munches, bath shakes, rest stretches, play chases a ball; a step ends it; reduced motion stays put');
