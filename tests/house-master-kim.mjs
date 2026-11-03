import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {WalkingWorld} from '../house-test/physics.mjs';
import {glazingBoxes} from '../house-test/glazing.mjs';
import {rooms} from '../house-test/rooms.mjs';
import {routeSearch,walkable} from '../house-test/route-search.mjs';
import {neighborhoodBoxes} from '../house-test/neighborhood-layout.mjs';
import {kimRooms,kimModel,kimBoxes,inKim} from '../house-test/master-kim-layout.mjs';
import {createFloorFinder} from '../house-test/marauders-map.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../house-test/house.json',import.meta.url)));
const world=new WalkingWorld(data.colliders,{height:1.05});
const mesh=gunzipSync(fs.readFileSync(new URL('../house-test/house.mesh.gz',import.meta.url)));
world.addBoxes(glazingBoxes(mesh.buffer.slice(mesh.byteOffset,mesh.byteOffset+mesh.byteLength),data.groups,world));
world.addBoxes(neighborhoodBoxes);
const floorOf=createFloorFinder(world);
const roomPoint=name=>{const r=rooms.find(r=>r[1]===name),[x,z]=r[6]||[r[2],r[3]];return world.safeSpot(x,r[4],-z);};
for(const [a,b] of [['Living room',"Master Kim's dojang"],["Master Kim's dojang",'Living room']]){
  const start=roomPoint(a),end=roomPoint(b),search=routeSearch(world,start,end);
  while(search.run(100)==='searching'){}
  assert.equal(search.state,'found',`${a} → ${b} is disconnected`);
  const player={...start};
  for(const p of search.path.slice(1)){
    world.move(player,p.x-player.x,p.z-player.z);
    assert(Math.hypot(player.x-p.x,player.z-p.z)<.03,'House-school route crosses a solid surface');
  }
  assert(Math.hypot(player.x-end.x,player.z-end.z)<.03);
  console.log('PASS complete walking route',a,'→',b,search.path.length,'points');
}
let from=world.safeSpot(26,-.82,21);
for(const r of kimRooms){
  const to=world.safeSpot(r[2],r[4],-r[3]);assert(to,r[1]+' lacks floor');
  assert.equal(to.x,r[2]);assert.equal(to.z,-r[3]);assert(inKim(to));assert.equal(floorOf(to),"Master Kim's");
  const search=routeSearch(world,from,to);while(search.run(100)==='searching'){}
  assert.equal(search.state,'found',r[1]+' is disconnected from Craepet Street');
  for(let i=1;i<search.path.length;i++)assert(walkable(world,search.path[i-1],search.path[i].x,search.path[i].z),r[1]+' route crosses solid furniture');
  console.log('PASS walking route',r[1],search.path.length,'points');from=to;
}
const doorway={x:42.02,y:-.82,z:34};world.move(doorway,0,3);assert(doorway.z>36.9);
const glass={x:45.5,y:-.82,z:34};world.move(glass,0,3);assert(glass.z<34.8,'Observation glass must stop pets');
for(const direction of [1,-1]){
  const entry={x:42.55,y:-.82,z:direction===1?20:25};world.move(entry,0,direction*5);assert(Math.abs(entry.z-(direction===1?25:20))<.01,'Glazed entry must work both ways');
}
assert(kimBoxes.every(b=>b.min.every(Number.isFinite)&&b.max.every((v,i)=>Number.isFinite(v)&&v>=b.min[i])));
assert(kimModel.parts.length<2500,'Model geometry budget exceeded');assert(kimModel.lights.length<60);
console.log('PASS school entry/re-entry, observation glass, geometry bounds;',kimModel.parts.length,'parts,',kimBoxes.length,'colliders');
