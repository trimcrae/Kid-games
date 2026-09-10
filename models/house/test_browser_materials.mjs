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
const panels=createHouseMaterial(group('Weathered dark exterior panels',{surface:'panels',roughness:.82,
  panelSize:[1.2,.6,.01],panelOffset:0,mortarColor:[.48,.44,.36]}));
const panelShader={vertexShader:THREE.ShaderLib.physical.vertexShader,
  fragmentShader:THREE.ShaderLib.physical.fragmentShader,defines:{},uniforms:{}};
panels.onBeforeCompile(panelShader);
assert.equal(panelShader.uniforms.houseSurfaceKind.value,13);
assert.deepEqual(panelShader.uniforms.housePanelSize.value.toArray(),[1.2,.6,.01]);
assert.equal(panelShader.uniforms.housePanelOffset.value,0);
assert.equal(panelShader.uniforms.houseMortarColor.value.r,.48);
assert.equal(panelShader.uniforms.houseDetailMap.value.generateMipmaps,true);
assert.equal(panelShader.uniforms.houseDetailMap.value.image.width,256);
const samePanels=createHouseMaterial(group('Second panel wall',{surface:'panels',panelSize:[1.2,.6,.01]}));
const sameShader={vertexShader:THREE.ShaderLib.physical.vertexShader,
  fragmentShader:THREE.ShaderLib.physical.fragmentShader,uniforms:{}};
samePanels.onBeforeCompile(sameShader);
assert.equal(sameShader.uniforms.houseDetailMap.value,panelShader.uniforms.houseDetailMap.value,
  'Repeated room groups must share finish texture memory');
samePanels.dispose();
panels.dispose();

// Long wood fibres should survive tiling without visible edge lines, and
// their subtle modulation must preserve each exported board/cabinet colour.
const wood=createHouseMaterial(group('Oak floor board tone 02',{surface:'wood'}));
const woodShader={vertexShader:THREE.ShaderLib.physical.vertexShader,
  fragmentShader:THREE.ShaderLib.physical.fragmentShader,uniforms:{}};
wood.onBeforeCompile(woodShader);
const {data:woodPixels,width:woodSize}=woodShader.uniforms.houseDetailMap.value.image;
const tone=(x,y)=>woodPixels[(y*woodSize+x)*4];
let along=0,across=0,edgeX=0,edgeY=0;
for(let y=0;y<woodSize;y++)for(let x=0;x<woodSize;x++){
  const value=tone(x,y)*2/255;
  assert(value>.85&&value<1.15,'Grain overwhelms the exported wood colour');
  if(x)along+=Math.abs(tone(x,y)-tone(x-1,y));
  if(y)across+=Math.abs(tone(x,y)-tone(x,y-1));
}
for(let i=0;i<woodSize;i++){
  edgeX+=Math.abs(tone(0,i)-tone(woodSize-1,i));
  edgeY+=Math.abs(tone(i,0)-tone(i,woodSize-1));
}
along/=woodSize*(woodSize-1);across/=woodSize*(woodSize-1);
assert(across>along*3,'Wood fibres lost their elongated direction');
assert(edgeX/woodSize<along*2+.5&&edgeY/woodSize<across*2+.5,
  'The repeating wood tile has a visible discontinuity at its boundary');
wood.dispose();

for(const surface of ['wood','fabric','carpet','blocks','siding','shakes','roof','lawn','mineral','stone','paint','ceramic','brushed','foliage']){
  const material=createHouseMaterial(group(surface,{surface,roughness:.6}));
  const shader={vertexShader:THREE.ShaderLib.physical.vertexShader,
    fragmentShader:THREE.ShaderLib.physical.fragmentShader,defines:{}};
  material.onBeforeCompile(shader);
  assert(shader.vertexShader.includes('vHousePosition=(modelMatrix*vec4(transformed,1.0)).xyz'));
  assert(shader.fragmentShader.includes('normal=houseBump(-vViewPosition,normal,houseDetail.z)'));
  assert(shader.uniforms.houseSurfaceKind.value>0);
  assert.equal(material.customProgramCacheKey(),panels.customProgramCacheKey(),
    'Finish families should share programs; the surface selector is a uniform');
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
