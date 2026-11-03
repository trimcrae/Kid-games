import * as THREE from './vendor/three.module.min.js';
import {createCameraGuard} from './camera-guard.mjs?v=20261103-studio-life';
export function transformBounds(b,m){const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],v=new THREE.Vector3();for(const x of [b.min[0],b.max[0]])for(const y of [b.min[1],b.max[1]])for(const z of [b.min[2],b.max[2]]){v.set(x,y,z).applyMatrix4(m);for(let i=0;i<3;i++){min[i]=Math.min(min[i],v.getComponent(i));max[i]=Math.max(max[i],v.getComponent(i));}}return {name:b.name,min,max};}
export function hingeMatrix(p,angle){return new THREE.Matrix4().makeTranslation(...p).multiply(new THREE.Matrix4().makeRotationY(angle)).multiply(new THREE.Matrix4().makeTranslation(-p[0],-p[1],-p[2]));}
const overlaps=(a,b)=>a.min.every((n,i)=>n<b.max[i]&&a.max[i]>b.min[i]);
export function touchesPlayer(b,p,r=.17,h=1.05){return p.y<b.max[1]&&p.y+h>b.min[1]&&Math.hypot(p.x-Math.max(b.min[0],Math.min(p.x,b.max[0])),p.z-Math.max(b.min[2],Math.min(p.z,b.max[2])))<r+.035;}
// Register the whole swept area once, then update the same indexed boxes.
// Both collision and the camera use each leaf's current pose, not its old one.
export function createDoorMotion({world,originals=[],sample,apply=()=>{},player,obstacles=()=>[],initial=0,onSettled=()=>{}}){
  let fraction=initial,target=initial,blocked=false,revision=0;
  const poses=Array.from({length:21},(_,i)=>sample(i/20));
  const boxes=poses[0].map((b,i)=>({name:b.name,min:b.min.map((v,k)=>Math.min(...poses.map(p=>p[i].min[k]))-.02),max:b.max.map((v,k)=>Math.max(...poses.map(p=>p[i].max[k]))+.02)}));
  world.addBoxes(boxes);
  for(const b of originals){const i=world.boxes.indexOf(b);if(i>=0)world.boxes[i]={...b,min:[1e6,1e6,1e6],max:[1e6+1,1e6+1,1e6+1]};}
  function place(f){const posed=sample(f);posed.forEach((b,i)=>{boxes[i].min=b.min;boxes[i].max=b.max;});apply(f);world.dynamicRevision=(world.dynamicRevision||0)+1;revision++;}
  place(initial);
  return {boxes,get fraction(){return fraction;},get target(){return target;},get blocked(){return blocked;},get revision(){return revision;},
    setOpen(open){target=open?1:0;blocked=false;},toggle(){target=target>.5?0:1;blocked=false;},
    update(dt,reduced=false){if(fraction===target)return;const next=reduced?target:fraction+Math.sign(target-fraction)*Math.min(Math.abs(target-fraction),dt*1.6);
      const steps=Math.max(1,Math.ceil(Math.abs(next-fraction)/.025));blocked=false;
      for(let i=1;i<=steps;i++){const f=fraction+(next-fraction)*i/steps;if(sample(f).some(b=>(player&&touchesPlayer(b,player,world.radius,world.height))||obstacles().some(o=>overlaps(b,o)))){blocked=true;break;}}
      if(blocked)return;fraction=next;place(fraction);if(fraction===target)onSettled();
    }};
}
// A lazy camera guard shared by all moving doors; rebuilt only after a pose
// changes. Door-sized AABBs are conservative at intermediate hinge angles.
export function movingDoorGuard(motions){let last='',guard=null;function current(){if(!motions.length)return {triangles:0,fraction:()=>1,firstHit:()=>Infinity,clearanceAt:()=>Infinity,blocked:()=>false,softClear:()=>true,softTriangles:()=>0};const stamp=motions.map(d=>d.revision).join(',');if(stamp===last&&guard)return guard;last=stamp;const arrays=[],groups=[];let bytes=0;for(const d of motions)for(const b of d.boxes){const g=new THREE.BoxGeometry(...b.max.map((v,i)=>v-b.min[i])).toNonIndexed();g.translate(...b.min.map((v,i)=>(v+b.max[i])/2));const p=g.attributes.position,n=g.attributes.normal,a=new Float32Array(p.count*6);for(let i=0;i<p.count;i++)a.set([p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i)],i*6);groups.push({name:b.name,offset:bytes,count:p.count});arrays.push(a);bytes+=a.byteLength;g.dispose();}const all=new Float32Array(bytes/4);let at=0;for(const a of arrays){all.set(a,at);at+=a.length;}guard=createCameraGuard(all.buffer,groups);return guard;}
  return {get triangles(){return current().triangles;},fraction:(...a)=>current().fraction(...a),firstHit:(...a)=>current().firstHit(...a),clearanceAt:(...a)=>current().clearanceAt(...a),blocked:(...a)=>current().blocked(...a),softClear:(...a)=>current().softClear(...a),softTriangles:()=>current().softTriangles()};
}
