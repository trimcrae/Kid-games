// Paw-print directions (route-search.mjs) find a way to every indoor room's
// activity from the house's main hubs, and through the narrow aisle between
// the parents' tall chest and the bassinet to their ensuite.
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
  else{const end=path[path.length-1];if(Math.hypot(end.x-to.x,end.z-to.z)>.05)failures.push(`${label}: ends ${end.x.toFixed(2)},${(-end.z).toFixed(2)}`);}
}
// The parents' ensuite is reached only through the slot beside the bassinet.
const parents=room("Mom & Dad's bedroom"),ensuite=room("Mom & Dad's bathroom");
const bath=at(ensuite[2],ensuite[3],ensuite[4]);
for(const [x,y] of [[parents[6][0],parents[6][1]],[parents[2],parents[3]],[11.5,4.01],[13.47,4.01]])
  expect(`ensuite from ${x},${y}`,at(x,y,parents[4]),bath);
// Every indoor station from its floor's hub (the room list's first room there).
const hubs={};
for(const r of rooms.filter(q=>q[0]!=='Outside'))hubs[r[0]]??=r;
for(const r of rooms.filter(q=>q[0]!=='Outside')){
  const hub=hubs[r[0]];if(hub===r)continue;
  expect(`${r[1]} from ${hub[1]}`,at(hub[2],hub[3],hub[4]),at(r[2],r[3],r[4]));
}
assert.deepEqual(failures,[],failures.join('\n'));
console.log(`PASS wayfinding: ${searched} paw-print routes found (every indoor station from its floor's hub; the parents' ensuite through the bassinet aisle); slowest ${longest.toFixed(0)} ms`);
