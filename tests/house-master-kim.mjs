import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {WalkingWorld} from '../house-test/physics.mjs';
import {glazingBoxes} from '../house-test/glazing.mjs';
import {rooms} from '../house-test/rooms.mjs';
import {routeSearch,walkable} from '../house-test/route-search.mjs';
import {neighborhoodBoxes} from '../house-test/neighborhood-layout.mjs';
import {kimRooms,kimModel,kimBoxes,inKim,restoreKimPosition,kimLayoutVersion} from '../house-test/master-kim-layout.mjs';
import {createKimDoors} from '../house-test/master-kim.mjs';
import {createFloorFinder} from '../house-test/marauders-map.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../house-test/house.json',import.meta.url)));
const world=new WalkingWorld(data.colliders,{height:1.05});
const mesh=gunzipSync(fs.readFileSync(new URL('../house-test/house.mesh.gz',import.meta.url)));
world.addBoxes(glazingBoxes(mesh.buffer.slice(mesh.byteOffset,mesh.byteOffset+mesh.byteLength),data.groups,world));
world.addBoxes(neighborhoodBoxes);
const doorMotions=createKimDoors(world,{x:0,y:0,z:0});for(const d of doorMotions){d.setOpen(true);d.update(1,true);}
const floorOf=createFloorFinder(world);
const roomPoint=name=>{const r=rooms.find(r=>r[1]===name),[x,z]=r[6]||[r[2],r[3]];return world.safeSpot(x,r[4],-z);};
for(const [a,b] of [['Living room',"Master Kim's dojang"],["Master Kim's dojang",'Shoe & gear room'],['Shoe & gear room','Living room']]){
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

// Right means camera-right when entering, not the map's screen-right.
const entrance=kimRooms[0],gear=kimRooms.find(r=>r[1]==='Shoe & gear room');
const dx=gear[2]-entrance[2],dz=-gear[3]+entrance[3];
assert(dx*Math.cos(entrance[5])-dz*Math.sin(entrance[5])>3,'Gear must be to the entering visitor’s right');
for(const [x,step,target] of [[42.55,-3,39.55],[39.55,3,42.55]]){
  const p={x,y:-.82,z:24.85};world.move(p,step,0);assert(Math.abs(p.x-target)<.01,'Gear doorway blocks entry or return');
}
for(const [x,z,step] of [[42,26.4,-3],[47,24.85,3]]){
  const p={x,y:-.82,z};world.move(p,step,0);assert(Math.abs(p.x-x)<1,'New gear side wall / former doorway is not solid');
}
const old={x:50.2,y:-.82,z:25,yaw:-Math.PI/2},moved=restoreKimPosition(old);
assert.equal(floorOf(old),'Outside','Former gear footprint must not remain on the school map');
assert.equal(floorOf(moved),"Master Kim's");
assert.equal(moved.x,gear[2]);assert.equal(moved.z,-gear[3]);assert(!world.blocked(moved.x,moved.z,moved.y));
assert.equal(restoreKimPosition({...old,y:-.2}).x,gear[2],'Old mid-jump gear save must also recover');
assert.equal(restoreKimPosition({...old,y:2}).x,old.x,'A saved position above the former roof must stay put');
assert.equal(restoreKimPosition({...old,kimLayout:kimLayoutVersion}).x,old.x,'Current outdoor saves must stay put');
for(const p of [roomPoint('Living room'),roomPoint('Taekwondo office'),roomPoint("Master Kim's dojang"),null])assert.equal(restoreKimPosition(p),p,'Unrelated saved position changed');
assert.deepEqual(old,{x:50.2,y:-.82,z:25,yaw:-Math.PI/2},'Migration mutated saved data');
console.log('PASS gear on entrant-right, two-way doorway, solid walls, map location and narrowly scoped old-position recovery');

for(const x of [41.4,47]){const p={x,y:-.82,z:22.4,kimLayout:2},m=restoreKimPosition(p);assert.equal(m.x,42.55);assert.equal(m.z,22.3);assert(!world.blocked(m.x,m.z,m.y));assert.equal(restoreKimPosition({...p,kimLayout:3}).x,x);}
console.log('PASS old wide-vestibule positions recover inside the narrow entrance; current outdoor saves unchanged');

const seats=kimModel.parts.filter(p=>p.name==='chair cushion'),backs=kimModel.parts.filter(p=>p.name==='chair curved back');assert.equal(seats.length,backs.length);seats.forEach((s,i)=>assert(backs[i].position[2]<s.position[2]-.15,'Spectator chair faces away from mats'));
