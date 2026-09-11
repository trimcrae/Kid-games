// Lived-in dressing (models/house/dressing.py) must stay out of the way:
// blocking props keep clear of the walking lanes and of every activity station
// and arrival spot, the dressing stays inside its triangle and draw-call
// budget, and the young front-yard trees collide only at their staked trunks.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {rooms} from '../house-test/rooms.mjs';

const data=JSON.parse(fs.readFileSync(new URL('../house-test/house.json',import.meta.url),'utf8'));
// Blender plan (x, y) and floor height -> Three (x, z = -y), y up.
const P=(x,y)=>({x,z:-y});
// Lane polylines through every room, in Blender plan coordinates, with the
// floor they belong to (null = graded yard; any height).
const lanes=[
  [0,[[5.30,-.90],[5.60,.70],[5.60,4.90],[5.50,5.30]]],
  [0,[[5.60,2.60],[7.60,2.60]]],[0,[[5.60,2.60],[7.60,4.00]]],
  [0,[[4.60,3.60],[4.60,5.25],[3.00,5.90],[2.00,6.80],[.90,7.35],[-.70,7.50]]],
  [0,[[5.60,7.50],[5.20,8.10],[4.90,9.00],[4.65,11.30]]],
  [1.26,[[11.00,4.00],[15.40,4.00]]],[1.26,[[11.57,4.56],[11.10,5.00]]],
  [1.26,[[13.47,4.56],[13.45,5.43],[12.56,5.38],[12.24,7.50]]],
  [1.26,[[12.50,3.46],[12.50,2.10]]],[1.26,[[15.49,4.00],[16.30,4.00]]],
  [-1.05,[[9.70,4.00],[10.30,2.70]]],[-1.05,[[9.70,4.00],[11.45,4.50],[11.50,5.10]]],
  [-1.05,[[11.50,5.10],[10.85,6.20],[9.97,6.20]]],[-1.05,[[11.50,5.10],[12.15,5.70],[13.50,5.75]]],
  [-1.05,[[11.50,5.10],[11.50,7.00]]],
  [-3.15,[[7.50,4.00],[4.80,3.95],[5.10,5.00],[4.70,6.00],[6.30,6.60]]],
  [null,[[4.65,11.50],[4.65,11.75],[4.92,12.70],[5.52,13.55],[6.15,14.75]]],
  [null,[[4.80,-2.40],[6.50,-5.90]]],
];
function rectDistance(b,p){
  const dx=Math.max(b.min[0]-p.x,0,p.x-b.max[0]),dz=Math.max(b.min[2]-p.z,0,p.z-b.max[2]);
  return Math.hypot(dx,dz);
}
function laneDistance(b,points){
  let best=Infinity;
  for(let i=0;i+1<points.length;i++){
    const a=P(...points[i]),c=P(...points[i+1]),n=Math.max(1,Math.ceil(Math.hypot(c.x-a.x,c.z-a.z)/.04));
    for(let k=0;k<=n;k++)best=Math.min(best,rectDistance(b,{x:a.x+(c.x-a.x)*k/n,z:a.z+(c.z-a.z)*k/n}));
  }
  return best;
}
const sameLevel=(b,floor)=>floor===null||(b.min[1]<floor+1.05&&b.max[1]>floor+.02&&b.min[1]>floor-.4);
const blocking=data.colliders.filter(c=>c.dressing);
assert(blocking.length>=6,'Expected the blocking dressing props (baskets, bench, easel, beanbag, veg bed...)');
const failures=[];
for(const b of blocking){
  const clearance=b.stationProp?.4:.6,spot=b.stationProp?.4:.9;
  for(const [floor,points] of lanes){
    if(!sameLevel(b,floor))continue;
    const d=laneDistance(b,points);
    if(d<clearance)failures.push(`${b.name}: ${d.toFixed(2)} m from lane ${JSON.stringify(points[0])}...`);
  }
  for(const r of rooms){
    if(/street|Craepet house/i.test(r[1])||!sameLevel(b,r[4]))continue;
    for(const [x,y] of [[r[2],r[3]],...(r[6]?[[r[6][0],r[6][1]]]:[])]){
      const d=rectDistance(b,P(x,y));
      if(d<spot)failures.push(`${b.name}: ${d.toFixed(2)} m from ${r[1]} station/arrival`);
    }
  }
}
assert.deepEqual(failures,[],failures.join('\n'));
// The Garden & maths station faces its raised bed.
const farm=blocking.find(b=>b.stationProp==='farm'),garden=rooms.find(r=>r[1]==='Back yard');
assert(farm,'Raised vegetable bed must be tagged as the farm station prop');
assert(rectDistance(farm,P(garden[2],garden[3]))<1.0,'Garden & maths station must stand at the vegetable bed');
// Budgets: one draw group per dressing finish; <= 60k triangles, <= 30 draw calls.
const groups=data.groups.filter(g=>g.name.startsWith('Lived-in dressing / '));
const tris=groups.reduce((s,g)=>s+g.count/3,0);
assert(groups.length>0&&groups.length<=30,`Dressing draw groups: ${groups.length}`);
assert(tris<=60000,`Dressing triangles: ${tris}`);
assert(!data.groups.some(g=>/^4[4-8] \|/.test(g.name)),'Dressing collections must export through the shared dressing groups');
// Young trees: crown and twigs never collide; the staked trunk does, wide
// enough (with the 0.17 m walker radius) that a pet stays outside the guard.
assert(!data.colliders.some(c=>/Young fruit tree leaves|Young tree lateral branches/.test(c.name)),'Sapling canopy still collides');
const stakes=data.colliders.filter(c=>/^Young tree support stakes/.test(c.name));
assert.equal(stakes.length,2,'Each young tree needs a staked trunk collider');
for(const s of stakes)assert(s.max[0]-s.min[0]>=.40&&s.max[2]-s.min[2]>=.40,'Sapling stakes collider too narrow');
console.log(`PASS ${blocking.length} blocking dressing props clear of ${lanes.length} lanes and all stations; `+
  `${groups.length} dressing draw groups, ${tris} triangles; sapling crowns walkable, trunks guarded`);
