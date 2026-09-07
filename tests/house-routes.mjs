import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WalkingWorld} from '../house-test/physics.mjs';
import {rooms} from '../house-test/rooms.mjs';
import {activities} from '../house-test/activities.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../house-test/house.json',import.meta.url)));
const world=new WalkingWorld(data.colliders,{height:1.05});
const targets=activities.map(a=>{const r=rooms.find(r=>r[1]===a.room);return {...a,point:world.safeSpot(r[2],r[4],-r[3])};});
assert(targets.every(a=>a.point),'Unsafe activity spawn');
// Flood the actual collision world from the entry, following floors and steps.
// Unlike a spawn check, this proves every service can be reached on foot.
const key=p=>`${Math.round((p.x-5.65)*10)},${Math.round(p.y*20)},${Math.round((p.z+.7)*10)}`;
const queue=[world.safeSpot(5.65,0,-.7)],seen=new Set([key(queue[0])]);
const pending=new Set(targets.map(a=>a.id));
for(let i=0;i<queue.length&&pending.size;i++){
  const p=queue[i];
  for(const a of targets){if(!pending.has(a.id)||Math.abs(a.point.y-p.y)>.3||Math.hypot(a.point.x-p.x,a.point.z-p.z)>.8)continue;
    const q={...p};world.move(q,a.point.x-p.x,a.point.z-p.z);
    if(Math.hypot(q.x-a.point.x,q.z-a.point.z)<.1){pending.delete(a.id);console.log('PASS on foot:',a.id,a.room);}
  }
  for(const [dx,dz] of [[.1,0],[-.1,0],[0,.1],[0,-.1]]){
    const q={...p};world.move(q,dx,dz);if(Math.hypot(q.x-p.x-dx,q.z-p.z-dz)>.01)continue;
    const k=key(q);if(!seen.has(k)){seen.add(k);queue.push(q);}
  }
  assert(queue.length<200000,'Walk graph escaped the house grounds');
}
if(pending.size){console.log('Explored',queue.length,'positions; bounds',queue.reduce((b,p)=>({minX:Math.min(b.minX,p.x),maxX:Math.max(b.maxX,p.x),minZ:Math.min(b.minZ,p.z),maxZ:Math.max(b.maxZ,p.z)}),{minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity}));for(const id of pending){const t=targets.find(a=>a.id===id);const near=[...queue].sort((a,b)=>Math.hypot(a.x-t.point.x,a.z-t.point.z)-Math.hypot(b.x-t.point.x,b.z-t.point.z))[0];console.log('Closest',id,near);}}
assert.deepEqual([...pending],[],'Services disconnected from the walkable house');
const wall=new WalkingWorld([{name:'camera wall',min:[-2,0,1],max:[2,3,1.1]}]);
const fraction=wall.cameraFraction({x:0,y:1,z:0},{x:0,y:1.5,z:3});
assert(fraction>0&&fraction<.34,'Camera went through a wall');
assert.equal(wall.cameraFraction({x:0,y:1,z:0},{x:0,y:1,z:-2}),1,'Open camera space was blocked');
console.log(`PASS ${targets.length} activities reachable; ${seen.size} floor positions; camera collision`);
