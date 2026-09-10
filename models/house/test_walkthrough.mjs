import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {WalkingWorld} from '../../house-test/physics.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../../house-test/house.json',import.meta.url),'utf8'));
const inventory=JSON.parse(fs.readFileSync(new URL('./inventory.json',import.meta.url),'utf8'));
assert.equal(data.generator,inventory.generator_sha256,'Stale browser export');
const mesh=gunzipSync(fs.readFileSync(new URL('../../house-test/house.mesh.gz',import.meta.url)));
assert.equal(createHash('sha256').update(mesh).digest('hex'),data.meshSha256,'Mesh/manifest mismatch');
const world=new WalkingWorld(data.colliders);
function point(x,y,z){return {x,y:z,z:-y};}
function route(name,waypoints){
  const first=point(...waypoints[0]);let p=world.safeSpot(first.x,first.y,first.z);
  assert(p,`${name}: start blocked`);
  for(const waypoint of waypoints.slice(1)){
    const target=point(...waypoint);
    for(let i=0;i<1000&&Math.hypot(target.x-p.x,target.z-p.z)>.045;i++){
      const dx=target.x-p.x,dz=target.z-p.z,n=Math.hypot(dx,dz);
      world.move(p,dx/n*.025,dz/n*.025);
    }
    const error=Math.hypot(target.x-p.x,target.z-p.z);
    assert(error<.09,`${name}: stopped ${error.toFixed(2)}m before ${JSON.stringify(target)} at ${JSON.stringify(p)}; next obstruction: ${world.blocked(p.x+(target.x-p.x)*.1,p.z+(target.z-p.z)*.1,p.y)}`);
    if(waypoint===waypoints.at(-1))assert(Math.abs(p.y-target.y)<.28,`${name}: wrong floor ${p.y}`);
  }
  console.log('PASS',name);
}
const routes=[
 ['Front door',[[6.6,.7,0],[6.6,-.95,0],[4.25,-.95,-.06]]],
 ['Kitchen to garage',[[1.2,7.56,0],[-.5,7.56,-.16]]],
 ['Upstairs flight',[[7.5,4.01,0],[8.8,4.01,.2],[10.9,4.01,1.26],[13.0,4.01,1.26]]],
 ['Downstairs flight',[[7.5,2.63,0],[9.0,2.63,-.5],[10.3,2.63,-1.05]]],
 ['Lower bedroom entry',[[11.5,4.2,-1.05],[11.5,5.2,-1.05],[11.5,6.2,-1.05],[10.2,6.2,-1.05]]],
 ['White bedroom doorway',[[11.5,5.7,-1.05],[13.0,5.7,-1.05]]],
 ['Basement flight',[[10.2,4.01,-1.05],[9.5,4.01,-1.35],[8.5,4.01,-2.3],[6.6,4.01,-3.15]]],
 ['Basement direct play approach',[[6.55,4.01,-3.15],[4.8,3.55,-3.15]]],
 ['Basement direct office approach',[[6.55,4.01,-3.15],[4.7,6.0,-3.15]]],
 ['Sunroom to backyard',[[4.65,10.7,-.10],[4.65,11.7,-.27],[4.65,12.8,-.82]]],
 ['Front porch steps',[[4.25,-.95,-.06],[4.25,-3.3,-.82]]],
 ['Driveway to garage',[[ -3.5,-5.0,-.82],[-3.5,-1.5,-.16]]],
 ['Green bathroom',[[11.57,4.01,1.26],[11.4,4.9,1.26],[11.0,5.2,1.26]]],
 // H139 puts the bassinet at the entry half of the bed foot. Follow the
 // real aisle around it, including the turn after the entry-side closet.
 ['Ensuite doorway',[[13.47,5.0,1.26],[13.47,5.38,1.26],[12.56,5.38,1.26],[12.56,6.95,1.26],[12.7,8.02,1.26],[11.4,8.15,1.26]]],
 ['Nursery doorway',[[12.5,4.01,1.26],[12.5,2.7,1.26]]],
 ['Master doorway',[[13.47,4.01,1.26],[13.47,5.0,1.26]]],
 ['End bedroom doorway',[[15.0,4.01,1.26],[16.5,4.01,1.26]]],
 ['Cory bedroom beside bed',[[15.8,4.01,1.26],[16.6,4.01,1.26],[16.6,3.3,1.26],[17.5,3.3,1.26]]],
 ['Downstairs bathroom',[[11.5,6.1,-1.05],[11.25,6.9,-1.05],[11.25,7.7,-1.05]]],
];
let failures=0;
for(const [name,points] of routes){
  for(const [label,path] of [[name,points],[name+' return',[...points].reverse()]]){
    try{route(label,path);}catch(e){failures++;console.error('FAIL',e.message);}
  }
}
// Solid walls must stop movement, even with a large elapsed frame.
const wallWorld=new WalkingWorld([{name:'ground',min:[-5,-.1,-5],max:[5,0,5]},{name:'wall',min:[1,0,-5],max:[1.1,3,5]}]);
const p={x:0,y:0,z:0};wallWorld.move(p,4,0);assert(p.x<.84,'Tunnels through walls');
assert(!wallWorld.safeSpot(1.05,0,0)||wallWorld.safeSpot(1.05,0,0).x!==1.05,'Unsafe spawn');
console.log('PASS wall collision and safe spawn');
const registry=fs.readFileSync(new URL('../../assets/js/games.js',import.meta.url),'utf8');
assert(!registry.includes('house-test'),'Walkthrough leaked into arcade registry');
if(failures)process.exit(1);
