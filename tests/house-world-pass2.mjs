import assert from 'node:assert/strict';
import {WalkingWorld} from '../house-test/physics.mjs';
import {createCompanion,updateCompanion,lineOfSight} from '../house-test/companions.mjs';
import {createGround} from '../house-test/pet-ground.mjs';
import * as THREE from '../house-test/vendor/three.module.min.js';

const box=(name,min,max)=>({name,min,max});
const world=new WalkingWorld([
  box('floor',[-5,-.1,-5],[5,0,5]),
  box('bed',[.35,0,-.4],[1.2,.55,.4]),
],{height:1.05});
const floorSpot={x:0,y:0,z:0,act:'look'};
const bedSpot={x:.85,y:.55,z:0,stand:{...floorSpot},up:true,act:'nap'};
const c=createCompanion({id:'bed',day:[floorSpot,bedSpot],random:()=>0});
c.spot=bedSpot;c.target=floorSpot;c.mode='hop';c.hop={t:0,from:{...floorSpot},to:{x:bedSpot.x,y:bedSpot.y,z:bedSpot.z},up:true,then:'at'};
for(let i=0;i<18;i++){
  updateCompanion(c,1/30,{world,player:{x:4,y:0,z:4},seen:()=>true});
  if(c.point.x>.35&&c.point.x<.85)
    assert(c.point.y>=bedSpot.y-.005,'companion crossed the mattress edge below its top');
}
assert.equal(c.mode,'at');assert.equal(c.point.y,.55);
// A temporary obstacle added after the bed spot was chosen must not receive a
// dismounting pet inside itself.
const dismount=createCompanion({id:'dismount',day:[bedSpot],random:()=>0});
dismount.point={x:bedSpot.x,y:bedSpot.y,z:bedSpot.z};dismount.mode='hop';
dismount.hop={t:0,from:{...dismount.point},to:{...floorSpot},up:false,then:'at'};
world.addBoxes([box('new stool',[-.15,0,-.15],[.15,.8,.15])]);
for(let i=0;i<25;i++)updateCompanion(dismount,1/30,{world,player:{x:4,y:0,z:4},seen:()=>true});
assert(!world.blocked(dismount.point.x,dismount.point.z,dismount.point.y),'dismount placed companion inside new furniture');
assert.equal(dismount.up,false,'dismount did not find a new clear landing');

// A trip may cross the screen even when both endpoints are off it.
const open=new WalkingWorld([box('floor',[-5,-.1,-5],[5,0,5])],{height:1.05});
const a={x:0,y:0,z:0,act:'look'},b={x:2,y:0,z:0,act:'look'};
const crossing=createCompanion({id:'crossing',day:[a,b],random:()=>0});
crossing.dwell=-1;
updateCompanion(crossing,1/30,{world:open,player:{x:4,y:0,z:4},seen:p=>p.x>.85&&p.x<1.15,random:()=>0});
assert.equal(crossing.mode,'travel');
assert(crossing.point.x<.2,'trip through view jumped in one frame');
// A hard wall close to the label anchor still hides it; a pet's own chair can
// occupy the final part of the ray without hiding its bubble.
const eye={x:0,y:.6,z:0},label={x:2,y:.6,z:0};
assert(!lineOfSight([box('wall',[1.86,0,-.2],[1.9,2,.2])],eye,label));
assert(lineOfSight([box('chair',[1.86,0,-.2],[1.9,1,.2])],eye,label));
// Two finishes within one former 25 cm cache patch have different heights.
const scene=new THREE.Scene();
for(const [x,height] of [[0,.01],[.2,.03]]){
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.2,.4),new THREE.MeshBasicMaterial());
  mesh.name='floor finish';mesh.rotation.x=-Math.PI/2;mesh.position.set(x,height,0);mesh.layers.enable(1);scene.add(mesh);
}
scene.updateMatrixWorld(true);
const ground=createGround(scene);ground.frame();
const low=ground.offset({x:.01,y:0,z:0}),high=ground.offset({x:.12,y:0,z:0});
assert(low<.02&&high>.025,`ground cache reused finish from across the seam: ${low}, ${high}`);
console.log('PASS companion mattress clearance, visible crossing, hard-wall label occlusion, and finish seams');
