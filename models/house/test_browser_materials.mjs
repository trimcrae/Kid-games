import assert from 'node:assert/strict';
import * as THREE from '../../house-test/vendor/three.module.min.js';
import {createHouseMaterial,finishDescription} from '../../house-test/materials.mjs';
import {segmentBlocked,choosePracticalLights} from '../../house-test/lighting.mjs';

const group=(name,finish)=>({name:'Fixture / '+name,color:[.25,.5,.75],glass:name.endsWith('glass'),finish});
const screen=createHouseMaterial(group('Dark appliance glass'));
assert.equal(screen.transparent,false);assert.equal(screen.opacity,1);
assert.equal(screen.depthWrite,true);assert(screen.roughness<.15);
const window=createHouseMaterial(group('Window glass'));
assert.equal(window.transparent,true);assert(window.opacity<.4);
assert.equal(window.depthWrite,false);
const steel=createHouseMaterial(group('Brushed stainless'));
assert.equal(steel.metalness,1);assert.equal(steel.color.r,.25,'Linear RGB was converted twice');
const lamp=createHouseMaterial(group('Warm glowing bulb',{surface:'plain',roughness:.4,
  emissive:[1,.79,.52],emissiveIntensity:3}));
assert.equal(lamp.emissive.r,1);assert.equal(lamp.emissiveIntensity,3);
assert.equal(finishDescription(group('New finish',{surface:'fabric',roughness:.94})).roughness,.94);

for(const surface of ['wood','fabric','carpet','blocks','siding','shakes','roof','lawn','mineral','stone','paint','ceramic','brushed','foliage']){
  const material=createHouseMaterial(group(surface,{surface,roughness:.6}));
  const shader={vertexShader:THREE.ShaderLib.physical.vertexShader,
    fragmentShader:THREE.ShaderLib.physical.fragmentShader,defines:{}};
  material.onBeforeCompile(shader);
  assert(shader.vertexShader.includes('vHousePosition=(modelMatrix*vec4(transformed,1.0)).xyz'));
  assert(shader.fragmentShader.includes('normal=houseBump(-vViewPosition,normal,houseDetail.z)'));
  assert(shader.defines.HOUSE_SURFACE>0);
  material.dispose();
}

const wall={min:[-.2,-1,1],max:[.2,4,1.2]};
assert(segmentBlocked([0,1,0],[0,2,3],[wall]));
assert(!segmentBlocked([1,1,0],[1,2,3],[wall]));
assert(!segmentBlocked([0,1,0],[0,1,.9],[wall]));
const source=(name,position)=>({name,position,power:40,type:'area'});
const lights=[source('Same room',[0,2,0]),source('Behind wall',[0,2,2]),
  source('Other floor',[0,5,0]),source('Distant',[10,2,0])];
assert.deepEqual(choosePracticalLights(lights,{x:0,y:0,z:0},[wall]).map(light=>light.name),['Same room']);
assert.equal(choosePracticalLights(Array.from({length:10},(_,i)=>source(String(i),[i*.1,2,0])),{x:0,y:0,z:0},[],3).length,3);
for(const material of [screen,window,steel,lamp])material.dispose();
console.log('PASS opaque displays, linear PBR finishes, all procedural shader hooks, room occlusion and bounded lights');
