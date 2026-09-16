// The four Yoto players (house-test/yoto.mjs): one in each kid's bedroom, each
// sitting on something real in the export and each with somewhere the pet can
// actually stand to press E. Run against the real house with a stub three.js —
// only the placing and the switching is under test, not the boxes it is drawn
// from. The episode file is read too: it has to parse, and a placeholder one
// (no episode yet) must say so rather than try to play nothing.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WalkingWorld} from '../house-test/physics.mjs';
import {yotoInteractions} from '../house-test/yoto.mjs';

const data=JSON.parse(fs.readFileSync(new URL('../house-test/house.json',import.meta.url),'utf8'));
const world=new WalkingWorld(data.colliders,{height:1.05});
const feedText=fs.readFileSync(new URL('../house-test/yoto-daily.json',import.meta.url),'utf8');
const feed=JSON.parse(feedText);                      // must always parse: the page fetches it
for(const key of ['title','date','audio','link','fetched'])assert(key in feed,`yoto-daily.json has no ${key}`);

// Just enough three.js and DOM to be built out of.
const vec=()=>({x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z;}});
class Obj {constructor(){this.position=vec();this.rotation=vec();this.children=[];this.visible=true;} add(...o){this.children.push(...o);}}
const THREE={Group:Obj,Mesh:class extends Obj {constructor(g,m){super();this.geometry=g;this.material=m;}},
  BoxGeometry:class{},CylinderGeometry:class{},
  MeshStandardMaterial:class{constructor(o={}){Object.assign(this,o);}}};
globalThis.Audio=class {constructor(){this.paused=true;this.src='';}load(){}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}addEventListener(){}};
globalThis.fetch=async()=>({ok:true,json:async()=>JSON.parse(feedText)});

const scene={add(){}},list=[],ticking=[],said=[];
const life={say:t=>said.push(t)},sounds={click(){}};
yotoInteractions({THREE,scene,world,life,list,ticking,sounds,reducedMotion:false});

const ids=['yoto-jeannie','yoto-ellie','yoto-cory','yoto-kieran'];
assert.deepEqual(list.map(i=>i.id).sort(),[...ids].sort(),'there is not one Yoto player per kid');
for(const it of list){
  assert(it.kind==='toggle'&&it.icon==='🎧'&&typeof it.start==='function',`${it.id} is not a toggle you can press`);
  // Somewhere to stand: on that floor, not inside anything.
  const a=it.at,floor=world.floor(a.x,a.z,a.y);
  assert(Number.isFinite(floor)&&Math.abs(floor-a.y)<.03&&!world.blocked(a.x,a.z,floor),
    `${it.id}: nowhere to stand at ${JSON.stringify(a)} (${world.blocked(a.x,a.z,floor)||'no floor'})`);
  // The cube itself: within reach of that spot, and resting on a real surface
  // between knee and shoulder height rather than floating in the room.
  const f=it.face,reach=Math.hypot(f.x-a.x,f.z-a.z);
  assert(reach<it.radius,`${it.id}: the player is ${reach.toFixed(2)} m away, outside its own ${it.radius} m radius`);
  const shelf=data.colliders.filter(b=>f.x>=b.min[0]-.02&&f.x<=b.max[0]+.02&&f.z>=b.min[2]-.02&&f.z<=b.max[2]+.02&&b.max[1]>a.y+.3&&b.max[1]<a.y+1.25)
    .sort((p,q)=>q.max[1]-p.max[1])[0];
  assert(shelf,`${it.id}: nothing under the player to stand it on`);
  assert(it.label()==='Play Yoto Daily',`${it.id}: the pill does not offer to play`);
}
// Pressing one: with a placeholder episode it says so and plays nothing.
const jeannie=list.find(i=>i.id==='yoto-jeannie');
jeannie.start();
assert(jeannie.label()==='Pause the Yoto','pressing it did not switch it on');
await new Promise(r=>setTimeout(r,10));
if(!feed.title){
  assert(said.some(t=>/hasn't arrived/.test(t)),`no episode yet, but it said ${JSON.stringify(said)}`);
  assert(jeannie.label()==='Play Yoto Daily','with no episode it should not sit there "playing"');
} else {
  assert(said.some(t=>t.includes(feed.title.slice(0,20))),'it never said what the episode was');
  // Only one at a time: starting Cory's stops Jeannie's.
  const cory=list.find(i=>i.id==='yoto-cory');cory.start();
  await new Promise(r=>setTimeout(r,10));
  assert(jeannie.label()==='Play Yoto Daily'&&cory.label()==='Pause the Yoto','two Yotos played at once');
  cory.start();
  assert(cory.label()==='Play Yoto Daily','E again did not pause it');
}
// Every frame runs without the players' displays complaining.
for(let i=0;i<120;i++)for(const f of ticking)f(1/60);

console.log(`PASS yoto: ${list.length} players placed on real shelves, all standable; yoto-daily.json parses (${feed.title?`episode "${feed.title}"`:'no episode yet'})`);
