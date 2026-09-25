import assert from 'node:assert/strict';
import {WalkingWorld} from '../house-test/physics.mjs';
import {createCompanion,updateCompanion} from '../house-test/companions.mjs';
import {createFollowRig} from '../house-test/camera-guard.mjs';

const box=(name,min,max)=>({name,min,max});
// At a landing seam, borrowed support may bridge a gap on the same level;
// it must not lift feet onto the next tread before reaching that tread.
const stairs=new WalkingWorld([
  box('lower tread',[0,-.1,0],[1,0,1]),
  box('upper tread',[1.1,0,0],[2,.2,1]),
],{radius:.17,height:1.05});
const foot={x:.95,y:0,z:.5};
assert(stairs.tryMove(foot,1.05,.5));
assert.equal(foot.y,0,'borrowed support at the stair seam raised the pet too early');
assert(stairs.tryMove(foot,1.11,.5));
assert.equal(foot.y,.2,'the pet did not climb when its feet reached the upper tread');

// A visible destination must be approached by walking even when the starting
// room is outside the drawn range. Otherwise a pet appears in view in one frame.
const floor=new WalkingWorld([box('floor',[-5,-.1,-5],[5,0,5])],{height:1.05});
const home={x:0,y:0,z:0,act:'look'},destination={x:2,y:0,z:0,act:'look'};
const companion=createCompanion({id:'test',day:[home,destination],random:()=>.5});
companion.dwell=-1;
updateCompanion(companion,1/30,{world:floor,player:{x:4,y:0,z:0},seen:p=>p.x>1,random:()=>0});
assert.equal(companion.mode,'travel');
assert(companion.point.x<.1,'companion teleported into the visible destination');

// A blocked route stops its foot animation and stays settled until the routine
// selects a new place, instead of marching into the same obstacle every 4 s.
companion.mode='travel';companion.target=destination;companion.path=[destination];companion.search=null;
companion.replanned=true;companion.stuck=.9;companion.point={x:0,y:0,z:0};
const blocked=Object.create(floor);blocked.move=()=>{};
updateCompanion(companion,1/30,{world:blocked,player:{x:4,y:0,z:0},seen:()=>true});
assert.equal(companion.mode,'at');assert.equal(companion.walking,false);
assert.equal(companion.unreachable,companion.spot);
updateCompanion(companion,1/30,{world:blocked,player:{x:4,y:0,z:0},seen:()=>true});
assert.equal(companion.mode,'at');
blocked.move=WalkingWorld.prototype.move;
updateCompanion(companion,1.1,{world:blocked,player:{x:4,y:0,z:0},seen:()=>true});
assert.equal(companion.mode,'travel','companion did not resume after the way cleared');

// If a short clear side step opens a real line around a chair corner, take it
// and complete the trip rather than settling permanently at the obstruction.
const chairWorld=new WalkingWorld([
  box('floor',[-5,-.1,-5],[5,0,5]),
  box('chair corner',[.5,0,-.05],[.8,1,.05]),
],{height:1.05});
const around=createCompanion({id:'around',day:[home,destination],random:()=>0});
around.spot=destination;around.mode='travel';around.target=destination;
around.point={x:.33,y:0,z:0};around.path=[destination];around.replanned=true;around.stuck=.9;around.vel=.55;
updateCompanion(around,1/30,{world:chairWorld,player:{x:4,y:0,z:0},seen:()=>true});
assert.equal(around.mode,'travel');
assert(Math.abs(around.path[0].z)>.2,'companion did not choose a side route round the chair: '+JSON.stringify({point:around.point,path:around.path,stuck:around.stuck}));
for(let i=0;i<360&&around.mode==='travel';i++)
  updateCompanion(around,1/30,{world:chairWorld,player:{x:4,y:0,z:0},seen:()=>true});
assert.equal(around.mode,'at','side route did not bring companion to its place');
assert(Math.hypot(around.point.x-destination.x,around.point.z-destination.z)<.1);

// A stopped arrow turn must release a wall preview. The player's yaw stays
// exact; only the camera's distance recovers.
const viewWorld={cameraFraction(_from,to){return to.x>.3?.6:1;},nearby(){return [];}};
const rig=createFollowRig();
const player={x:0,y:0,z:0};
rig.place(player,0,-.18,.1,viewWorld,null,0);
const turning=rig.place(player,.1,-.18,.1,viewWorld,null,0);
const stopped=rig.place(player,0,-.18,.1,viewWorld,null,0);
assert(turning.distance<2,'test did not trigger the obstruction preview');
assert(stopped.distance>turning.distance,'stale wall preview kept pulling in after the turn stopped');
assert(Math.abs(Math.atan2(stopped.position.x,stopped.position.z))<1e-6,'camera drifted off the arrow heading');
console.log('PASS world motion: stair support, visible companion arrival, stuck route, stopped camera turn');
