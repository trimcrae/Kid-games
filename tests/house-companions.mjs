// House companions against the real walking world: a hatched pet moves
// between its places over a few minutes; an unhatched egg stays exactly
// where it was laid, even when your pet walks right through its spot.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WalkingWorld} from '../house-test/physics.mjs';
import {rooms} from '../house-test/rooms.mjs';
import {ROUTINES,resolveSpots,createCompanion,updateCompanion} from '../house-test/companions.mjs';

const data=JSON.parse(fs.readFileSync(new URL('../house-test/house.json',import.meta.url),'utf8'));
const world=new WalkingWorld(data.colliders,{height:1.05});
function seeded(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const where={world,colliders:world.boxes,rooms,avoid:[]};
const spots=id=>({day:resolveSpots(ROUTINES[id].day,where),night:resolveSpots(ROUTINES[id].night,where)});
const random=seeded(7);
const egg=createCompanion({id:'kieran',egg:true,...spots('kieran'),random}),pet=createCompanion({id:'cory',...spots('cory'),random});
const eggStart={...egg.point};let visited=new Set();
for(let i=0;i<30*180;i++){
  const t=i/30;
  // Your pet paces back and forth straight across the egg's spot.
  const player={x:eggStart.x+Math.sin(t*.8)*1.2,y:eggStart.y,z:eggStart.z+.1};
  updateCompanion(egg,1/30,{world,player,night:false,seen:()=>true,random});
  updateCompanion(pet,1/30,{world,player:{x:0,y:-50,z:0},night:false,seen:()=>true,random});
  if(pet.mode==='at')visited.add(pet.spot);
}
const eggMoved=Math.hypot(egg.point.x-eggStart.x,egg.point.z-eggStart.z);
assert.equal(eggMoved,0,`Egg moved ${eggMoved.toFixed(3)} m`);
assert(!egg.walking,'Egg was set walking');
assert(pet.distance>.5&&visited.size>=2,`Hatched companion did not move between its places (${pet.distance.toFixed(2)} m, ${visited.size} places)`);
console.log(`PASS companions: egg stayed put for 3 min beside a passing pet; hatched pet walked ${pet.distance.toFixed(1)} m between ${visited.size} places`);
