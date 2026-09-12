// The orbit camera must never end up behind a drawn wall, ceiling or window,
// nor close enough to one for the near plane to cut a see-through hole.
// Replays the walkthrough's own camera placement from every room start at 24
// headings and three pitches against the real exported triangles.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {WalkingWorld} from '../house-test/physics.mjs';
import {rooms} from '../house-test/rooms.mjs';
import {neighborhoodBoxes} from '../house-test/neighborhood-layout.mjs';
import {createCameraGuard,guardGroups,nearPlaneReach,orbitCamera,craneExtra,arrivalHeading,createFollowRig,lookDown,PITCH_FLOOR,SOFT_CLEAR} from '../house-test/camera-guard.mjs';
import {glazingBoxes} from '../house-test/glazing.mjs';
import {routeSearch} from '../house-test/route-search.mjs';
import {easeRoute} from '../house-test/route-ease.mjs';

const data=JSON.parse(fs.readFileSync(new URL('../house-test/house.json',import.meta.url),'utf8'));
const mesh=gunzipSync(fs.readFileSync(new URL('../house-test/house.mesh.gz',import.meta.url)));
const binary=mesh.buffer.slice(mesh.byteOffset,mesh.byteOffset+mesh.byteLength);
let began=performance.now();
const guard=createCameraGuard(binary,guardGroups(data.groups));
const built=performance.now()-began;
// The walkthrough's own walking world: the exported colliders, the sunroom's
// glass walls and the neighbourhood.
const world=new WalkingWorld(data.colliders,{height:1.05});const glazing=glazingBoxes(binary,data.groups,world);world.addBoxes(glazing);world.addBoxes(neighborhoodBoxes);
const inside=p=>world.boxes.some(b=>p.x>b.min[0]+.02&&p.x<b.max[0]-.02&&p.y>b.min[1]+.02&&p.y<b.max[1]-.02&&p.z>b.min[2]+.02&&p.z<b.max[2]-.02);
// The walkthrough's lens: 70° vertical at the widest common desktop aspect.
// The widest near plane any screen can get: the lens is about 82° across, capped
// to 50–70° vertical, and eases up to 13° wider (to the 70° cap) in tight spots.
const lens=a=>Math.min(70,Math.min(70,Math.max(50,2*Math.atan(Math.tan(41*Math.PI/180)/a)*180/Math.PI))+13);
const reach=Math.max(...[.46,.75,1,1.33,1.6,1.78,2.16,2.33,2.8,3.56].map(aspect=>nearPlaneReach({fov:lens(aspect),near:.045,aspect}))),clearance=reach+.015;

let views=0,placing=0;const failures=[],distances=[];
for(const room of rooms.filter(r=>!/street|Craepet house/i.test(r[1]))){
  const player=world.safeSpot(room[2],room[4],-room[3]);assert(player,room[1]+' has no start');
  for(let i=0;i<24;i++)for(const pitch of [-.8,-.18,.42]){
    const yaw=i/24*Math.PI*2;views++;
    began=performance.now();const {target,position}=orbitCamera(player,yaw,pitch,world,guard,clearance);placing+=performance.now()-began;
    distances.push(Math.hypot(position.x-target.x,position.y-target.y,position.z-target.z));
    const at=`${room[1]} yaw ${yaw.toFixed(2)} pitch ${pitch}`;
    if(guard.blocked(target,position,true))failures.push(at+': camera behind a wall, floor, ceiling, window or tall furniture');
    else if(guard.blocked(target,position)&&position.y-target.y<SOFT_CLEAR)failures.push(at+': camera looks through low furniture without being above it');
    else if(inside(position))failures.push(at+': camera inside a collider');
    else{const gap=guard.clearanceAt(position);if(gap<reach)failures.push(`${at}: ${gap.toFixed(3)} m from a surface, near plane reaches ${reach.toFixed(3)} m`);}
  }
}
assert.equal(failures.length,0,failures.slice(0,12).join('\n'));
// Arriving in any room (a jump or the first frame) never parks the camera
// inside the pet: the arrival heading always leaves a real third-person view.
const cramped=[];
for(const room of rooms.filter(r=>!/street|Craepet house/i.test(r[1]))){
  const [ax,ay,heading]=room[6]||[room[2],room[3],room[5]];
  const player=world.safeSpot(ax,room[4],-ay),station=world.safeSpot(room[2],room[4],-room[3]);
  const view=orbitCamera(player,arrivalHeading(player,heading,-.18,world,guard,clearance),-.18,world,guard,clearance);
  const distance=Math.hypot(view.position.x-view.target.x,view.position.y-view.target.y,view.position.z-view.target.z);
  if(distance<1.2)cramped.push(`${room[1]} ${distance.toFixed(2)} m`);
  // An arrival spot stays within reach of the room's activity station.
  assert(Math.abs(player.y-station.y)<.35&&Math.hypot(player.x-station.x,player.z-station.z)<1.45,room[1]+' arrives out of reach of its station');
  for(let i=0;i<24;i++)for(const pitch of [-.8,-.18,.42]){
    const v=orbitCamera(player,i/24*Math.PI*2,pitch,world,guard,clearance);
    assert(!guard.blocked(v.target,v.position,true)&&guard.clearanceAt(v.position)>=reach&&!inside(v.position),room[1]+' arrival view behind a surface');
  }
}
assert.equal(cramped.length,0,'Arrival camera too close: '+cramped.join(', '));
// The walkthrough's frame-by-frame follow rig, turning a full circle on the
// spot (a steady mouse pan and sudden 45° flicks) in every room: every frame
// stays clear of every surface, the view never tips past about 60° down (no
// plan-view "overhead pops"), and the crane never jerks the view up or down.
const MAX_LOOK=lookDown(PITCH_FLOOR)*180/Math.PI+.5,MAX_LOOK_STEP=2.5,dt=1/30;
let rigFrames=0,rigMs=0,worstLook=0,worstStep=0,escapes=0;const rigFailures=[];
for(const room of rooms.filter(r=>!/street|Craepet house/i.test(r[1]))){
  const [ax,ay]=room[6]||[room[2],room[3]];
  for(const player of [world.safeSpot(room[2],room[4],-room[3]),world.safeSpot(ax,room[4],-ay)])for(const pitch of [-.18,.07]){
    const rig=createFollowRig(),yaws=[];
    for(let i=0;i<120;i++)yaws.push(room[5]+i*Math.PI/60);
    for(let k=0;k<8;k++)for(let i=0;i<12;i++)yaws.push(room[5]-(k+1)*Math.PI/4);
    let last=null,lastYaw=null;
    for(const yaw of yaws){
      // A 45° flick is a cut anyway; the crane's own swing is judged on steady pans.
      const steadyPan=lastYaw!==null&&Math.abs(yaw-lastYaw)<.1;lastYaw=yaw;
      began=performance.now();const v=rig.place(player,yaw,pitch,dt,world,guard,clearance);rigMs+=performance.now()-began;rigFrames++;
      const at=`${room[1]} rig yaw ${yaw.toFixed(2)} pitch ${pitch}`,p=v.position,t=v.target;
      // (The angle means nothing with the camera jammed against the pet.)
      const look=Math.hypot(p.x-t.x,p.y-t.y,p.z-t.z)<.3?null:Math.atan2(p.y-t.y,Math.hypot(p.x-t.x,p.z-t.z))*180/Math.PI;
      // Jammed against a wall or bed by the turn, the crane leaves its easing to
      // get out of the pet (counted, and rare).
      if(v.escaped)escapes++;const judged=steadyPan&&!v.escaped;
      if(look!==null){worstLook=Math.max(worstLook,look);if(last!==null&&judged&&!v.boosted)worstStep=Math.max(worstStep,Math.abs(look-last));}
      if(guard.blocked(t,p,true))rigFailures.push(at+': camera behind a wall, floor, ceiling, window or tall furniture');
      else if(guard.blocked(t,p)&&p.y-t.y<SOFT_CLEAR)rigFailures.push(at+': camera looks through low furniture without being above it');
      else if(inside(p))rigFailures.push(at+': camera inside a collider');
      else if(Math.hypot(p.x-t.x,p.y-t.y,p.z-t.z)>1e-3&&guard.clearanceAt(p)<reach)rigFailures.push(`${at}: ${guard.clearanceAt(p).toFixed(3)} m from a surface`);
      if(look!==null&&look>MAX_LOOK)rigFailures.push(`${at}: looks ${look.toFixed(0)}° down`);
      // (A boom squeezed against the pet swings up out of it faster, still eased.)
      if(look!==null&&last!==null&&judged&&Math.abs(look-last)>(v.boosted?3*MAX_LOOK_STEP:MAX_LOOK_STEP))rigFailures.push(`${at}: view tipped ${Math.abs(look-last).toFixed(1)}° in one frame`);
      last=look;
    }
    // Back at the starting heading, the camera settles back down to where a
    // fresh arrival would put it (it does not stay craned up after a turn).
    for(let i=0;i<60;i++)rig.place(player,room[5],pitch,dt,world,guard,clearance);
    const settled=craneExtra(player,room[5],pitch,world,guard,clearance);
    if(settled.view.distance>=1.6&&rig.crane<settled.extra-.12)rigFailures.push(`${room[1]} pitch ${pitch}: still craned ${rig.crane.toFixed(2)} after turning back (${settled.extra} would do)`);
  }
}
assert.equal(rigFailures.length,0,rigFailures.slice(0,12).join('\n'));
// The guided walk out to the back yard (QA F4-3): the paw route leaves the
// sunroom through the open slider, not through a closed pane, and the follow
// camera stays behind the pet all the way down the step (it collapsed onto
// the pet there while the route crossed the glass).
assert(glazing.some(b=>b.min[0]<5.3&&b.max[0]>5.3&&b.min[2]<-11.39&&b.max[2]>-11.41),'The sunroom’s closed slider has no walking box');
const yard=world.safeSpot(6.15,-.73,-14.75);let yardWalks=0,yardFrames=0,yardMin=Infinity;
for(const [from,[x,planY,y]] of Object.entries({'Kitchen':[2,6.8,0],'Living room':[5.8,2.0,0],'Sunroom':[4.85,9.4,-.1],'Dining room':[6.05,7.25,0]})){
  const a=world.safeSpot(x,y,-planY),search=routeSearch(world,a,yard);let state;for(let i=0;i<4000&&(state=search.run(50))==='searching';i++);
  assert.equal(state,'found',`No paw route from the ${from} to the back yard`);
  const path=search.path;
  for(let i=1;i<path.length;i++){const p=path[i-1],q=path[i];if(p.z>-11.4&&q.z<=-11.4){const k=(-11.4-p.z)/(q.z-p.z),cx=p.x+(q.x-p.x)*k;
    assert(!glazing.some(b=>cx>b.min[0]-.17&&cx<b.max[0]+.17&&b.min[2]<-11.39&&b.max[2]>-11.41),`The ${from} route crosses the sunroom glass at x ${cx.toFixed(2)}`);}}
  // Follow the prints as the player sees them (eased at the slider's jamb,
  // as house-life.mjs shows them) like a player holding W and aiming a
  // little ahead along them (QA F4's pursuit follower, which wedged on the
  // jamb before the easing), the focus height eased as in walkthrough.js.
  const prints=easeRoute(world,path);
  const lengths=[0];for(let i=1;i<prints.length;i++)lengths.push(lengths[i-1]+Math.hypot(prints[i].x-prints[i-1].x,prints[i].z-prints[i-1].z));
  const along=d=>{let i=0;while(i<lengths.length-2&&lengths[i+1]<d)i++;const t=Math.min(1,(d-lengths[i])/Math.max(1e-6,lengths[i+1]-lengths[i]));return {x:prints[i].x+(prints[i+1].x-prints[i].x)*t,z:prints[i].z+(prints[i+1].z-prints[i].z)*t};};
  const onRoute=p=>{let best=Infinity,at=0;for(let i=0;i<prints.length-1;i++){const a=prints[i],b=prints[i+1],dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz||1e-9,k=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/l2)),d=Math.hypot(a.x+dx*k-p.x,a.z+dz*k-p.z)+Math.abs(a.y-p.y)*2;if(d<best){best=d;at=lengths[i]+(lengths[i+1]-lengths[i])*k;}}return at;};
  const rig=createFollowRig(),player={...a};let yaw=null,focusY=a.y,progress=0,lastProgress=0;
  for(let f=0;f<1800&&Math.hypot(player.x-yard.x,player.z-yard.z)>=.3;f++){
    const s=onRoute(player);if(s>progress+.05){progress=s;lastProgress=f;}
    assert(f-lastProgress<75,`The ${from} walk wedged at (${player.x.toFixed(2)}, ${(-player.z).toFixed(2)})`);
    if(f%2===0){const ahead=along(Math.min(lengths.at(-1),s+.45));yaw=Math.atan2(player.x-ahead.x,player.z-ahead.z);}
    world.move(player,-Math.sin(yaw)*1.9*dt,-Math.cos(yaw)*1.9*dt);focusY+=(player.y-focusY)*(1-Math.exp(-dt*12));
    const v=rig.place({x:player.x,y:focusY,z:player.z},yaw,-.18,dt,world,guard,clearance),p=v.position,t=v.target,d=Math.hypot(p.x-t.x,p.y-t.y,p.z-t.z);
    const at=`${from} to the back yard at (${player.x.toFixed(2)}, ${(-player.z).toFixed(2)})`;yardFrames++;
    if(player.z<-10.6&&player.z>-12.2)yardMin=Math.min(yardMin,d);
    assert(!guard.blocked(t,p,true)&&!inside(p),`${at}: camera behind a surface`);
    assert(guard.clearanceAt(p)>=reach,`${at}: camera ${guard.clearanceAt(p).toFixed(3)} m from a surface`);
    assert(d>=.35,`${at}: camera collapsed onto the pet (${d.toFixed(2)} m)`);
  }
  assert(Math.hypot(player.x-yard.x,player.z-yard.z)<.3,`The ${from} walk did not reach the back yard`);
  yardWalks++;
}
distances.sort((a,b)=>a-b);
const median=distances[distances.length>>1];
// Open rooms still get a proper third-person view, not a camera jammed into the pet.
assert(median>1.1,`Median camera distance fell to ${median.toFixed(2)} m`);
assert(placing/views<8,`Camera placement took ${(placing/views).toFixed(2)} ms`);
// The lower hall's floor runs unbroken from the family room doorway to the
// bathroom: no slit to see down through at either threshold.
for(const x of [10.9,11.5,11.95])for(let planY=4.55;planY<=6.70;planY+=.005)
  assert(guard.blocked({x,y:-.7,z:-planY},{x,y:-1.3,z:-planY}),`Floor slit at x ${x}, plan Y ${planY.toFixed(3)}`);
assert(rigMs/rigFrames<8,`Follow rig took ${(rigMs/rigFrames).toFixed(2)} ms per frame`);
console.log(`PASS ${views} views clear of every surface (near-plane reach ${reach.toFixed(3)} m); median distance ${median.toFixed(2)} m; ${(placing/views).toFixed(2)} ms per placement; follow rig ${rigFrames} turning frames clear, at most ${worstLook.toFixed(1)}° down, ${worstStep.toFixed(2)}° per frame (${escapes} jam escapes), ${(rigMs/rigFrames).toFixed(2)} ms per frame; ${yardWalks} guided walks to the back yard (${yardFrames} frames) keep the camera ≥ ${yardMin.toFixed(2)} m behind the pet at the sunroom step; guard built in ${built.toFixed(0)} ms over ${guard.triangles} triangles`);
