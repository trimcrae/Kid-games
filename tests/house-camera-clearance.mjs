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
import {createCameraGuard,guardGroups,nearPlaneReach,orbitCamera,arrivalHeading,SOFT_CLEAR} from '../house-test/camera-guard.mjs';

const data=JSON.parse(fs.readFileSync(new URL('../house-test/house.json',import.meta.url),'utf8'));
const mesh=gunzipSync(fs.readFileSync(new URL('../house-test/house.mesh.gz',import.meta.url)));
const binary=mesh.buffer.slice(mesh.byteOffset,mesh.byteOffset+mesh.byteLength);
let began=performance.now();
const guard=createCameraGuard(binary,guardGroups(data.groups));
const built=performance.now()-began;
const world=new WalkingWorld(data.colliders,{height:1.05});world.addBoxes(neighborhoodBoxes);
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
distances.sort((a,b)=>a-b);
const median=distances[distances.length>>1];
// Open rooms still get a proper third-person view, not a camera jammed into the pet.
assert(median>1.1,`Median camera distance fell to ${median.toFixed(2)} m`);
assert(placing/views<8,`Camera placement took ${(placing/views).toFixed(2)} ms`);
// The lower hall's floor runs unbroken from the family room doorway to the
// bathroom: no slit to see down through at either threshold.
for(const x of [10.9,11.5,11.95])for(let planY=4.55;planY<=6.70;planY+=.005)
  assert(guard.blocked({x,y:-.7,z:-planY},{x,y:-1.3,z:-planY}),`Floor slit at x ${x}, plan Y ${planY.toFixed(3)}`);
console.log(`PASS ${views} views clear of every surface (near-plane reach ${reach.toFixed(3)} m); median distance ${median.toFixed(2)} m; ${(placing/views).toFixed(2)} ms per placement; guard built in ${built.toFixed(0)} ms over ${guard.triangles} triangles`);
