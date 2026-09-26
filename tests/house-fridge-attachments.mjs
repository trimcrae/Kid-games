import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../house-test/vendor/three.module.min.js';
import {WalkingWorld,Body} from '../house-test/physics.mjs';
import {createInteractions} from '../house-test/interactions.mjs';

const source=JSON.parse(fs.readFileSync(new URL('../house-test/house.json',import.meta.url),'utf8'));
globalThis.THREE=THREE;
globalThis.document={getElementById:()=>({hidden:true,textContent:''}),
  createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}})})};
globalThis.window={};
globalThis.Audio=class {addEventListener(){} pause(){} set volume(v){} set preload(v){}};

function fridgePose(withShelf){
  const data=structuredClone(source);
  if(withShelf){
    data.props['fridge-b'].min[2]=Math.min(data.props['fridge-b'].min[2],-5.46);
    data.colliders.push({name:'Water dispenser shelf',prop:'fridge-b',
      min:[2.74,1.068,-5.46],max:[2.96,1.082,-5.38]});
  }
  const world=new WalkingWorld(data.colliders,{height:1.05});
  const player={x:2.68,y:0,z:-6.23},body=new Body(world),keys=new Set();
  const scene=new THREE.Scene(),meshA=new THREE.Object3D(),meshB=new THREE.Object3D();
  const life={say(){},hop(){},face(){},ride(){},airborne(){},rest(){return 30;}};
  const api=createInteractions({scene,world,renderer:{render:{},getDrawingBufferSize:s=>s.set(800,600)},
    data,propMeshes:{'fridge-a':[meshA],'fridge-b':[meshB]},player,keys,life,body,
    tour:{setCameraRig(){},hint(){}},bindButton(){},reducedMotion:true});
  const inside=scene.children.find(o=>o.geometry instanceof THREE.PlaneGeometry);
  assert(inside,'fridge inside plane missing');
  api.tick(1/60,1);
  assert.equal(api.near?.id,'fridge');
  api.start();api.tick(1/60,2);
  return {plane:[inside.position.x,inside.position.z],
    doorA:[...meshA.matrix.elements],doorB:[...meshB.matrix.elements]};
}

const bare=fridgePose(false),attached=fridgePose(true);
assert.deepEqual(attached,bare,'dispenser attachment shifted the fridge hinge or inside plane');
const panelA=source.colliders.find(b=>b.prop==='fridge-a'&&/^French door(?:\.\d+)?$/.test(b.name));
const panelB=source.colliders.find(b=>b.prop==='fridge-b'&&/^French door(?:\.\d+)?$/.test(b.name));
const expectedFront=Math.min(panelA.min[2],panelB.min[2]);
assert(Math.abs(bare.plane[1]-(expectedFront+.075))<1e-6,'inside plane did not use door-panel front');
assert(Math.abs(bare.plane[0]-(panelA.max[0]+panelB.min[0])/2)<1e-6,
  'inside plane did not use door-panel centre');
console.log('PASS fridge attachments do not shift door hinges or inside plane');
