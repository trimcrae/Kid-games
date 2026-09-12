// Paw-print directions (route-search.mjs) find a way to every indoor room's
// activity from the house's main hubs, through the narrow aisle between the
// parents' tall chest and the bassinet to their ensuite, and past Ellie's bed
// foot into the back of her room.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WalkingWorld} from '../house-test/physics.mjs';
import {routeSearch} from '../house-test/route-search.mjs';
import {rooms} from '../house-test/rooms.mjs';
import {neighborhoodBoxes} from '../house-test/neighborhood-layout.mjs';

const data=JSON.parse(fs.readFileSync(new URL('../house-test/house.json',import.meta.url),'utf8'));
const world=new WalkingWorld(data.colliders,{height:1.05});world.addBoxes(neighborhoodBoxes);
const at=(x,y,floor)=>{const p=world.safeSpot(x,floor,-y);assert(p,`no safe spot at ${x},${y}`);return p;};
const room=name=>{const r=rooms.find(q=>q[1]===name);assert(r,name);return r;};
function route(from,to){
  const r=routeSearch(world,from,to);let state;
  for(let i=0;i<2000&&(state=r.run(50))==='searching';i++);
  return {state,path:r.path};
}
const failures=[];let searched=0,longest=0;
function expect(label,from,to){
  const began=performance.now(),{state,path}=route(from,to);searched++;longest=Math.max(longest,performance.now()-began);
  if(state!=='found')failures.push(`${label}: ${state}`);
  else{
    const end=path[path.length-1];if(Math.hypot(end.x-to.x,end.z-to.z)>.05)failures.push(`${label}: ends ${end.x.toFixed(2)},${(-end.z).toFixed(2)}`);
    // The drawn prints stay walkable for the pet all the way (smoothing never
    // cuts a corner into furniture, so following them exactly never wedges).
    for(let i=0;i<path.length-1;i++)for(let t=0;t<=1;t+=.1){
      const p=path[i],q=path[i+1],x=p.x+(q.x-p.x)*t,z=p.z+(q.z-p.z)*t;
      if(world.blocked(x,z,world.floor(x,z,p.y))){failures.push(`${label}: prints cut into furniture at ${x.toFixed(2)},${(-z).toFixed(2)}`);i=path.length;break;}
    }
  }
}
// The parents' ensuite is reached only through the slot beside the bassinet.
const parents=room("Mom & Dad's bedroom"),ensuite=room("Mom & Dad's bathroom");
const bath=at(ensuite[2],ensuite[3],ensuite[4]);
for(const [x,y] of [[parents[6][0],parents[6][1]],[parents[2],parents[3]],[11.5,4.01],[13.47,4.01]])
  expect(`ensuite from ${x},${y}`,at(x,y,parents[4]),bath);
// Ellie's rear half (dress rail, bookcase, window corner) past the bed foot
// and her pine cabinet, from the doorway.
const ellie=room("Ellie's bedroom");
expect("Ellie's rear aisle from her doorway",at(ellie[2],ellie[3],ellie[4]),at(9.0,8.15,ellie[4]));
// Every indoor station from its floor's hub (the room list's first room there).
const hubs={};
for(const r of rooms.filter(q=>q[0]!=='Outside'))hubs[r[0]]??=r;
for(const r of rooms.filter(q=>q[0]!=='Outside')){
  const hub=hubs[r[0]];if(hub===r)continue;
  expect(`${r[1]} from ${hub[1]}`,at(hub[2],hub[3],hub[4]),at(r[2],r[3],r[4]));
}
assert.deepEqual(failures,[],failures.join('\n'));
console.log(`PASS wayfinding: ${searched} paw-print routes found (every indoor station from its floor's hub; the parents' ensuite through the bassinet aisle; the back of Ellie's room); slowest ${longest.toFixed(0)} ms`);
