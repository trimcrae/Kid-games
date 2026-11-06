import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as THREE from '../house-test/vendor/three.module.min.js';
import {WalkingWorld} from '../house-test/physics.mjs';
import {kimBoxes,kimModel} from '../house-test/master-kim-layout.mjs';
import {createKimDoors} from '../house-test/master-kim.mjs';
import {createDoorMotion,transformBounds,movingDoorGuard} from '../house-test/moving-doors.mjs';
import {prepareGarageDoor,garagePanelMatrix} from '../house-test/garage-door.mjs';
import {readStudio,saveStudio,uniformFor,dobokParts,studioKey} from '../house-test/taekwondo-uniform.mjs';
import {creature,PET_SCALE} from '../house-test/creatures.mjs';
const source=JSON.stringify(kimBoxes),world=new WalkingWorld(kimBoxes,{height:1.05}),player={x:0,y:0,z:0},doors=createKimDoors(world,player),guard=movingDoorGuard(doors);
for(const d of doors){
 const definition=kimModel.doors.find(v=>v.id===d.id),x=definition.at[0],z=definition.at[2];
 const p={x,y:-.82,z:z-1.1};world.move(p,0,2.2);assert(p.z<z-.15,d.id+' closed door must block walking');
 assert(guard.blocked({x,y:.3,z:z-1},{x,y:.3,z:z+1}),d.id+' closed door camera guard');
 // A pet in the door sweep prevents even an instant reduced-motion toggle.
 Object.assign(player,{x:x+.2,y:-.82,z:z+.3});d.setOpen(true);d.update(1,true);assert(d.blocked,d.id+' must stop for a pet');assert.equal(d.fraction,0);d.setOpen(false);assert.equal(d.blocked,false,'Cancelling a paused movement clears its warning');d.setOpen(true);
 Object.assign(player,{x:0,y:0,z:0});d.update(1,true);assert.equal(d.fraction,1);assert(!guard.blocked({x,y:.3,z:z-1},{x,y:.3,z:z+1}),d.id+' camera remains blocked after opening');
 Object.assign(p,{x,y:-.82,z:z-1.1});world.move(p,0,2.2);assert(p.z>z+1,d.id+' open door must allow entry');world.move(p,0,-2.2);assert(p.z<z-1,d.id+' open door must allow return');
 Object.assign(player,{x,y:-.82,z:z+.15});d.setOpen(false);d.update(1,true);assert(d.blocked);assert.equal(d.fraction,1);
 Object.assign(player,{x:0,y:0,z:0});for(let i=0;i<60;i++)d.update(1/60);assert.equal(d.fraction,0);
}
assert.equal(JSON.stringify(kimBoxes),source,'Runtime doors mutated shared source geometry');assert(world.dynamicRevision>4);
console.log('PASS all four studio doors: closed/open walking and camera collision, two-way traversal, obstruction interlock, smooth/reduced motion, immutable source');
const data=JSON.parse(fs.readFileSync(new URL('../house-test/house.json',import.meta.url))),binary=gunzipSync(fs.readFileSync(new URL('../house-test/house.mesh.gz',import.meta.url)));
const untouched=structuredClone(data);prepareGarageDoor(data);const panels=data.colliders.filter(b=>b.prop?.startsWith('garage-door-')).sort((a,b)=>a.prop.localeCompare(b.prop));
const groups=data.groups.filter(g=>g.dynamicDoor);assert.equal(groups.length,5);
for(let i=0;i<5;i++){const a=new Float32Array(binary.buffer,binary.byteOffset+groups[i].offset,36*6);for(let k=0;k<3;k++){const v=Array.from({length:36},(_,n)=>a[n*6+k]);assert(Math.abs(Math.min(...v)-panels[i].min[k])<1e-5);assert(Math.abs(Math.max(...v)-panels[i].max[k])<1e-5);}}
assert.equal(data.groups.reduce((n,g)=>n+g.count,0),untouched.groups.reduce((n,g)=>n+g.count,0));
const garage=new WalkingWorld(data.colliders,{height:1.05}),pet={x:-3.5,y:-.16,z:2.5},car={min:[-4,-.16,1.2],max:[-3,1,2.3]};let carIn=false;
const motion=createDoorMotion({world:garage,originals:panels,player:pet,initial:1,obstacles:()=>carIn?[car]:[],sample:f=>panels.map((p,i)=>transformBounds(p,garagePanelMatrix(p,i,f)))});
const carGuard=movingDoorGuard([motion]);assert(!garage.blocked(-3.5,1.77,-.16));motion.setOpen(false);motion.update(1,true);assert.equal(motion.fraction,0);assert(garage.blocked(-3.5,1.77,-.16));assert(carGuard.blocked({x:-3.5,y:.5,z:2.5},{x:-3.5,y:.5,z:.9}));
motion.setOpen(true);motion.update(1,true);assert.equal(motion.fraction,1);assert(!garage.blocked(-3.5,1.77,-.16));assert(!carGuard.blocked({x:-3.5,y:.5,z:2.5},{x:-3.5,y:.5,z:.9}));
carIn=true;motion.setOpen(false);motion.update(1,true);assert(motion.blocked);assert.equal(motion.fraction,1);carIn=false;Object.assign(pet,{z:1.77});motion.update(1,true);assert(motion.blocked);Object.assign(pet,{z:2.5});motion.update(1,true);assert.equal(motion.fraction,0);
console.log('PASS garage original mesh/panel correspondence, unchanged vertex offsets, passage/camera open/closed, vehicle and pet interlocks');
const memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};const petData={species:'blorb',name:'Practice Pet',wear:{neck:'medal',head:'partyhat'}};const before=JSON.stringify(petData);
assert.equal(uniformFor('cory',{x:42,y:-.82,z:40},petData,storage),null);saveStudio('cory',{uniform:true,belt:'blue',signedIn:'2026-11-03'},storage);assert.equal(uniformFor('cory',{x:42,y:-.82,z:40},petData,storage).belt,'blue');assert.equal(uniformFor('cory',{x:1,y:0,z:1},petData,storage),null);assert.equal(uniformFor('ellie',{x:42,y:-.82,z:40},petData,storage),null);assert.equal(uniformFor('cory',{x:42,y:-.82,z:40},{...petData,egg:true},storage),null);assert.equal(JSON.stringify(petData),before);memory.set(studioKey('bad'),'{');assert.equal(readStudio('bad',storage).uniform,false);assert.throws(()=>saveStudio('bad',{belt:'unknown'},storage));assert.equal(memory.get(studioKey('bad')),'{');memory.delete(studioKey('bad'));saveStudio('bad',{belt:'unknown'},storage);assert.equal(readStudio('bad',storage).belt,'white');
// The Snorbit's ears can naturally reach above .85 m in some random gait
// phases, even without a uniform. Compare matched animation phases instead of
// making clothing coverage depend on that unrelated random pose.
const random=Math.random;
try{
 for(const species of ['craepet','snorbit','puddlepop','flarn','twiggle','glimmr','zibbit','blorb'])for(const seed of [1,17,29,40]){
  const bounds=[];
  for(const dressed of [false,true]){
   let n=seed;Math.random=()=>{n=(1664525*n+1013904223)>>>0;return n/2**32;};
   const p=creature({species},{body:'#71ad9c',accent:'#e2efe0'},dressed?dobokParts({jacket:'#b63f3d',belt:'black'}):[]);
   p.scale.setScalar(PET_SCALE);for(let i=0;i<60;i++)p.userData.rig.update(1/60,{moving:true,speed:1.9});p.updateMatrixWorld(true);
   const b=new THREE.Box3().setFromObject(p,true);assert([...b.min.toArray(),...b.max.toArray()].every(Number.isFinite));
   let meshes=0;p.traverse(o=>{if(o.isMesh)meshes++;});assert(meshes<=3);bounds.push(b);
  }
  assert(bounds[1].max.y<=bounds[0].max.y+.02,species+' uniform enlarged the creature height at seed '+seed);
 }
}finally{Math.random=random;}
console.log('PASS uniform opt-in, location scope, per-profile persistence, eggs/malformed storage, wardrobe preservation and all eight creature rigs');
