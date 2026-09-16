import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {WalkingWorld,Body} from '../../house-test/physics.mjs';
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
 // Approach around the window-wall worktop restored from H60/H63.
 ['Kitchen to garage',[[1.5,6.8,0],[.84,7.32,0],[.78,7.56,0],[-.5,7.56,-.16]]],
 ['Upstairs flight',[[7.5,4.01,0],[8.8,4.01,.2],[10.9,4.01,1.26],[13.0,4.01,1.26]]],
 ['Downstairs flight',[[7.5,2.63,0],[9.0,2.63,-.5],[10.3,2.63,-1.05]]],
 ['Lower bedroom entry',[[11.5,4.2,-1.05],[11.5,5.2,-1.05],[11.5,6.2,-1.05],[10.2,6.2,-1.05]]],
 ['White bedroom doorway',[[11.5,5.7,-1.05],[13.0,5.7,-1.05]]],
 ['Basement flight',[[10.2,4.01,-1.05],[9.5,4.01,-1.35],[8.5,4.01,-2.3],[6.6,4.01,-3.15]]],
 ['Basement direct play approach',[[6.55,4.01,-3.15],[4.8,3.55,-3.15]]],
 ['Basement direct office approach',[[6.55,4.01,-3.15],[4.7,6.0,-3.15]]],
 ['Sunroom to backyard',[[4.65,10.7,-.10],[4.65,11.7,-.22],[4.65,15.6,-.82]]],
 ['Front porch steps',[[4.25,-.95,-.06],[4.25,-3.3,-.82]]],
 ['Driveway to garage',[[ -3.5,-5.0,-.82],[-3.5,-1.5,-.16]]],
 ['Green bathroom',[[11.57,4.01,1.26],[11.4,4.9,1.26],[11.0,5.2,1.26]]],
 // H139 puts the bassinet at the entry half of the bed foot. Follow the
 // real aisle around it, including the turn after the entry-side closet.
 // The tall chest stands on the closet/ensuite wall (House Tour 137.5/141s), so
 // the aisle runs between it and the bassinet at the bed's side.
 ['Ensuite doorway',[[13.47,5.0,1.26],[13.47,5.3,1.26],[12.99,5.35,1.26],[12.99,7.55,1.26],[12.7,8.02,1.26],[11.4,8.15,1.26]]],
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
// ----- jumping (physics.mjs Body) -----------------------------------------
// Space hops the pet onto the furniture. The same Body the browser runs, at
// the same 30 fps, so a change in the jump that puts the beds, couches and
// tables out of reach — or drops the pet through a floor — fails here.
const walk=new WalkingWorld(data.colliders,{height:1.05});
// `to` is the middle of the piece and `press` how far out the player presses
// Space — about half a metre from its near edge, so a wide table is earlier.
function hopOnto(name,from,to,top,press){
  const start=walk.floor(from.x,from.z,from.y);
  assert(Number.isFinite(start)&&!walk.blocked(from.x,from.z,start),`${name}: nowhere to stand at the start`);
  const p={x:from.x,y:start,z:from.z},body=new Body(walk);body.reset(p);
  const dt=1/30;let jumped=false;
  for(let i=0;i<120;i++){
    const dx=to.x-p.x,dz=to.z-p.z,n=Math.hypot(dx,dz);
    // Walk at it and press Space about half a metre out, as a player would.
    if(!jumped&&n<press){body.jump();if(body.airborne)jumped=true;}
    const step=Math.min(n,3.1*dt);
    body.step(p,n?dx/n*step:0,n?dz/n*step:0,dt);
    if(jumped&&!body.airborne)break;
  }
  assert(jumped,`${name}: never left the ground`);
  assert(!body.airborne,`${name}: still falling at ${p.y.toFixed(2)}`);
  assert(p.y>=top-.02,`${name}: landed at ${p.y.toFixed(2)}, not up on ${top}`);
  console.log('PASS jump onto',name);
}
for(const [name,from,to,top,press] of [
  ['the living-room couch',{x:1.20,y:0,z:-1.83},{x:.64,z:-1.83},.50,.75],
  ['the coffee table',{x:3.30,y:0,z:-2.30},{x:1.82,z:-2.30},.51,1.15],
  ['the dining table',{x:7.04,y:0,z:-5.51},{x:5.52,z:-6.38},.79,1.45],
  ['the big bed',{x:16.41,y:1.29,z:-5.42},{x:14.63,z:-5.65},1.84,1.50],
  ['a basement bunk',{x:2.86,y:-3.12,z:-2.68},{x:1.05,z:-2.68},-2.61,1.25],
])hopOnto(name,from,to,top,press);
// Standing on the table, walking off the edge drops the pet back to the floor
// rather than stopping it in mid-air.
{
  const p={x:5.52,y:.79,z:-6.38},body=new Body(walk);body.reset(p);
  for(let i=0;i<90;i++)body.step(p,.09,0,1/30);
  assert(!body.airborne&&p.y<.1,`Stuck on the table at ${p.y.toFixed(2)}`);
  console.log('PASS walking off the table');
}
// Jumping anywhere in the house must never drop the pet out of the world.
{
  let seed=20260916;const rnd=()=>(seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff;
  const {rooms}=await import('../../house-test/rooms.mjs');
  let lowest=Infinity;
  for(const room of rooms){
    const start=walk.safeSpot(room[2],room[4],-room[3]);if(!start)continue;
    for(let t=0;t<6;t++){
      const p={...start},body=new Body(walk);body.reset(p);let a=rnd()*Math.PI*2;
      for(let i=0;i<600;i++){
        if(i%17===0)a+=(rnd()-.5)*2;
        if(rnd()<.3)body.jump();
        body.step(p,Math.cos(a)*3.1/30,Math.sin(a)*3.1/30,1/30);
        assert(!body.lost(p),`Fell out of the world from ${room[1]} at ${JSON.stringify(p)}`);
        lowest=Math.min(lowest,p.y);
      }
    }
  }
  // The basement slab is the lowest floor there is.
  assert(lowest>-3.5,`Jumped below the basement floor to ${lowest.toFixed(2)}`);
  console.log('PASS jumping stays inside the house');
}
const registry=fs.readFileSync(new URL('../../assets/js/games.js',import.meta.url),'utf8');
assert(!registry.includes('house-test'),'Walkthrough leaked into arcade registry');
if(failures)process.exit(1);
