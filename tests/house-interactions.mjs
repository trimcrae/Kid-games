// The things you can use with E (interactions.mjs) rest on the export: the
// parts that move must come out as their own tagged draw groups and
// collision boxes (both fridge doors, both swings, both fans, the burgundy
// car), the trampoline mat must be standable (its thin tubes used to box the
// whole mat off), and every spot you use something from must be a place the
// pet can stand on that floor.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WalkingWorld} from '../house-test/physics.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../house-test/house.json',import.meta.url),'utf8'));
const world=new WalkingWorld(data.colliders,{height:1.05});
const props=data.props||{};
for(const key of ['fridge-a','fridge-b','swing-a','swing-b','fan-family','fan-primary','car']){
  assert(props[key],`prop ${key} missing from the export`);
  assert(data.groups.some(g=>g.prop===key),`prop ${key} has no draw group`);
  assert(data.colliders.some(b=>b.prop===key),`prop ${key} has no collision box`);
}
// The doors are side by side, each a door wide; the swings hang either side of the frame.
assert(props['fridge-a'].max[0]<props['fridge-b'].min[0]+.02&&props['fridge-a'].max[0]-props['fridge-a'].min[0]<.6,'the fridge doors are not split into left and right');
assert(props['swing-a'].max[0]<props['swing-b'].min[0]&&props['swing-a'].max[1]>1&&props['swing-b'].max[1]>1,'each swing does not have its own seat and chains');
// Nothing but the car is tagged as the car, and it is car-sized.
// (Its extent takes in the door mirrors, so it is a little wider than the body.)
const car=props.car;assert(car.max[0]-car.min[0]<2.4&&car.max[2]-car.min[2]>4&&car.max[2]-car.min[2]<4.8,'the car prop is not the burgundy crossover');
// Spots to use things from: standable, on that floor.
const spots={fridge:[2.68,0,-6.23],'fan-family':[12.24,-1.05,-2.3],'tv-living':[2.75,0,-3.05],'tv-family':[13.3,-1.05,-2.3],'flush-up':[10.66,1.26,-5.9],'flush-down':[11.41,-1.05,-7.66],
  'swing-a':[15.85,-.82,-23.95],'swing-b':[17.15,-.82,-23.95],'rocker-nursery':[12.5,1.26,-1.33],'rocker-porch-a':[1.05,-.06,1.4],'rocker-porch-b':[1.0,-.06,.6],piano:[10.8,-1.05,-1.6],car:[-5.97,-.16,-3.77]};
for(const [id,[x,y,z]] of Object.entries(spots)){
  const s=world.safeSpot(x,y,z);
  assert(s&&Math.hypot(s.x-x,s.z-z)<.8&&Math.abs(s.y-y)<.35,`${id}: nowhere to stand near ${[x,y,z]} (${s?JSON.stringify(s):'none'})`);
}
// The trampoline mat: standable in the middle, and a jump reaches it from the lawn.
const mat=data.colliders.find(b=>b.name==='Trampoline jumping mat');assert(mat,'no trampoline mat');
const cx=(mat.min[0]+mat.max[0])/2,cz=(mat.min[2]+mat.max[2])/2,top=world.floor(cx,cz,mat.max[1]);
assert(Number.isFinite(top)&&!world.blocked(cx,cz,top),'the trampoline mat is boxed off');
assert(top-(-.82)<.92,`the trampoline is out of jumping reach (${(top+.82).toFixed(2)} m up)`);
console.log(`PASS interactions: 7 movable props exported; ${Object.keys(spots).length} spots standable; trampoline mat ${(top+.82).toFixed(2)} m up and clear`);
