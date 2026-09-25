import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../house-test/vendor/three.module.min.js';
import {WalkingWorld,Body} from '../house-test/physics.mjs';
import {createInteractions,carPoint} from '../house-test/interactions.mjs';

const data=JSON.parse(fs.readFileSync(new URL('../house-test/house.json',import.meta.url),'utf8'));
globalThis.THREE=THREE;
const pill={hidden:true},label={textContent:''};
globalThis.document={getElementById:id=>id==='interact'?pill:id==='interact-label'?label:null,
  createElement:()=>({width:0,height:0,getContext:()=>new Proxy({},{get:(o,k)=>k==='fillText'||k==='fillRect'||k==='beginPath'||k==='roundRect'||k==='fill'||k==='ellipse'?()=>{}:undefined,set:(o,k,v)=>(o[k]=v,true)})})};
globalThis.window={};
globalThis.Audio=class {addEventListener(){} pause(){} set volume(v){} set preload(v){}};

const world=new WalkingWorld(data.colliders,{height:1.05});
const player={x:1.05,y:-.06,z:1.4},body=new Body(world),keys=new Set();
let ride=null;
const life={say(){},hop(){},face(){},ride:v=>{ride=v;},airborne(){},rest(){return 30;}};
const tour={setCameraRig(){},hint(){}};
const api=createInteractions({scene:new THREE.Scene(),world,renderer:{render:{},getDrawingBufferSize:s=>s.set(800,600)},data,propMeshes:{},player,keys,life,body,tour,bindButton(){}});
let now=1;
function near(id,p){Object.assign(player,p);body.reset(player);api.tick(1/60,++now);assert.equal(api.near?.id,id,`near ${id}: ${api.near?.id}`);}
function walking(dt=1/60){api.tick(dt,++now);body.step(player,0,0,dt);}

// The porch chair is elevated: starting must leave the pet at the floor and
// climb beside the arm before it crosses the seat.
near('rocker-porch-a',{x:1.05,y:-.06,z:1.4});
api.start();assert(Math.abs(player.x-1.05)<.01&&Math.abs(player.y+.06)<.01,'rocker mount snapped to seat');
api.tick(.08,++now);assert(player.y>-.06&&Math.abs(player.x-1.05)<.02,'rocker did not rise beside the seat');
for(let i=0;i<30;i++)api.tick(1/60,++now);
assert(Math.abs(player.x-.55)<.02&&Math.abs(player.y-.53)<.02&&ride?.pose?.sit===1,'rocker did not seat pet');
api.stop();const rockerAt={...player};
assert(Math.hypot(player.x-rockerAt.x,player.z-rockerAt.z)<.01,'rocker exit jumped');
for(let i=0;i<60;i++)walking();
assert(Math.hypot(player.x-1.05,player.z-1.4)<.2&&Math.abs(player.y-(-.06))<.04,'rocker exit did not land on porch floor');
near('rocker-porch-a',{x:1.05,y:-.06,z:1.4});api.start();
for(let i=0;i<31;i++)api.tick(1/60,++now);
api.stop();player.y+=2;const jumpedRocker={...player};walking();
assert(Math.hypot(player.x-jumpedRocker.x,player.z-jumpedRocker.z)<.01,'rocker exit pulled back after Rooms jump');
for(const [id,spot] of [['rocker-porch-b',{x:1,y:-.06,z:.6}],['rocker-nursery',{x:12.5,y:1.26,z:-1.33}]]){
  near(id,spot);api.start();for(let i=0;i<31;i++)api.tick(1/60,++now);api.stop();
  for(let i=0;i<65;i++)walking();
  assert(Math.hypot(player.x-spot.x,player.z-spot.z)<.2&&Math.abs(player.y-spot.y)<.04,
    `${id} exit did not reach its floor: ${JSON.stringify(player)}`);
}

// Piano exit starts from the visible cushion height and crosses its edge
// before lowering to the floor.
near('piano',{x:10.8,y:-1.05,z:-1.6});api.start();
for(let i=0;i<31;i++)api.tick(1/60,++now);
assert(ride?.dy>.3,'piano pet is not on cushion');
const pianoX=player.x,pianoZ=player.z;api.stop();
assert(Math.abs(player.y-(-1.05+.35))<.08,'piano exit dropped pet through cushion');
assert(Math.hypot(player.x-pianoX,player.z-pianoZ)<.01,'piano exit jumped sideways');
for(let i=0;i<28;i++)walking();
assert(player.z<-1.85&&player.y<-1.0,'piano pet did not step off cushion');
near('piano',{x:10.8,y:-1.05,z:-1.6});api.start();
for(let i=0;i<31;i++)api.tick(1/60,++now);
api.stop();keys.add('ArrowUp');const interrupted={...player};walking();keys.clear();
assert(Math.hypot(player.x-interrupted.x,player.z-interrupted.z)<.01,'piano exit pulled against walking input');

// The fridge's moving collision box remains queryable after its door leaves
// its original grid cell, and closing pauses against the pet.
near('fridge',{x:2.68,y:0,z:-6.23});api.start();
for(let i=0;i<60;i++)api.tick(1/60,++now);
const doors=world.boxes.filter(b=>/^French door/.test(b.name)&&b.min[0]<100);
assert.equal(doors.length,2,'fridge collision proxies missing');
const left=doors.find(b=>/\.001$/.test(b.name));
assert(left.min[2]<-5.55,'open fridge door collision stayed in closed position');
const mid={x:(left.min[0]+left.max[0])/2,z:(left.min[2]+left.max[2])/2};
assert(world.nearby(mid.x,mid.z).includes(left),'moving door lost its spatial index');
assert(/French door/.test(world.blocked(mid.x,mid.z,0)),'open door is not solid');
player.x=2.51;player.z=-5.66;api.start();
for(let i=0;i<90;i++)api.tick(1/60,++now);
assert(left.min[2]<-5.48,'fridge closed through the pet');

// Steering changes the shell heading and places the rider using that same
// heading, including after the car has turned away from its parking pose.
near('car',{x:-5.97,y:-.16,z:-3.77});api.start();
keys.add('ArrowUp');keys.add('ArrowLeft');
for(let i=0;i<45;i++)api.tick(1/60,++now);
keys.clear();
const car=api.state.cars.car;
assert(Math.abs(car.heading)>.05,`car never steered (${JSON.stringify(car)})`);
const seat=carPoint(0,0,-.42,.15,car.heading);
assert(Math.abs(ride.dx-seat.x)<.02&&Math.abs(ride.dz-seat.z)<.02,'rider turned opposite car shell');
api.stop();

console.log('PASS props pass 2: rocker mount/exit, piano cushion exit, moving fridge doors, turning car rider');
