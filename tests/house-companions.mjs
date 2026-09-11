// House companions against the real walking world: hatched pets stroll near
// their room; an unhatched egg stays exactly where it was laid, even when
// your pet walks right through its spot.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WalkingWorld} from '../house-test/physics.mjs';
import {rooms} from '../house-test/rooms.mjs';
import {stepCompanion} from '../house-test/companions.mjs';

const {colliders}=JSON.parse(fs.readFileSync(new URL('../house-test/house.json',import.meta.url),'utf8'));
const world=new WalkingWorld(colliders,{height:1.05});
function seeded(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function companion(roomName,egg){
  const room=rooms.find(r=>r[1]===roomName),anchor=world.safeSpot(room[2],room[4],-room[3]);
  assert(anchor,'No floor in '+roomName);
  return {point:{...anchor},anchor,angle:0,timer:.5,walking:!egg,egg,distance:0};
}
const egg=companion("Kieran's bedroom",true),pet=companion("Cory's bedroom",false);
const eggStart={...egg.point},random=seeded(7);
let eggWalked=false,farthest=0;
for(let i=0;i<30*40;i++){
  const t=i/30;
  // Your pet paces back and forth straight across the egg's spot.
  const player={x:eggStart.x+Math.sin(t*.8)*1.2,y:eggStart.y,z:eggStart.z+.1};
  stepCompanion(egg,1/30,world,player,random);eggWalked||=egg.walking;
  stepCompanion(pet,1/30,world,{x:0,y:-50,z:0},random);
  farthest=Math.max(farthest,Math.hypot(pet.point.x-pet.anchor.x,pet.point.z-pet.anchor.z));
}
const eggMoved=Math.hypot(egg.point.x-eggStart.x,egg.point.z-eggStart.z);
assert.equal(eggMoved,0,`Egg moved ${eggMoved.toFixed(3)} m`);
assert(!eggWalked,'Egg was set walking');
assert(pet.distance>.15,'Hatched companion did not roam');
assert(farthest<2.6,`Companion wandered ${farthest.toFixed(2)} m from its room spot`);
console.log(`PASS companions: egg stayed put for 40 s beside a passing pet; hatched pet strolled ${pet.distance.toFixed(1)} m within ${farthest.toFixed(2)} m of home`);
