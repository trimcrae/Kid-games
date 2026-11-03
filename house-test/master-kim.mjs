import * as THREE from './vendor/three.module.min.js';
import {createDoorMotion,hingeMatrix,transformBounds,movingDoorGuard} from './moving-doors.mjs?v=20261103-studio-life';
import {Reflector} from './vendor/Reflector.mjs';
import {kimModel,KIM} from './master-kim-layout.mjs?v=20261103-studio-life';
import {createCameraGuard} from './camera-guard.mjs?v=20261103-studio-life';

// Every surface is code-authored. No source photographs or remote assets.
const ATLAS=['logo','welcome','exterior','exit','motto','tenets','olympic','rings','us','korea','tenetPoster','promise','award','abstract','best','gear','office','training','street','bathroom','supplies','signin'];
function geometry(p){
  const g=p.shape==='cylinder'?new THREE.CylinderGeometry(p.size[0],p.size[2],p.size[1],12):new THREE.BoxGeometry(...p.size);
  const matrix=new THREE.Matrix4().compose(new THREE.Vector3(...p.position),new THREE.Quaternion().setFromEuler(new THREE.Euler(...p.rotation)),new THREE.Vector3(1,1,1));
  g.applyMatrix4(matrix);const out=g.toNonIndexed();g.dispose();return out;
}
function merge(parts){
  const n=parts.reduce((n,p)=>n+p.g.attributes.position.count,0),out=new THREE.BufferGeometry();
  for(const [key,size] of [['position',3],['normal',3],['uv',2],['color',3]]){
    const array=new Float32Array(n*size);let at=0;
    for(const {g,color} of parts){
      const count=g.attributes.position.count;
      if(key==='color'){const c=new THREE.Color(color||'#ffffff');for(let k=0;k<count;k++)array.set([c.r,c.g,c.b],at+k*3);}
      else array.set(g.attributes[key].array,at);
      at+=count*size;
    }
    out.setAttribute(key,new THREE.BufferAttribute(array,size));
  }
  parts.forEach(p=>p.g.dispose());out.computeBoundingSphere();return out;
}
function material(finish){
  const m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:({metal:.4,mat:.55,wood:.52,glass:.18,glow:.5})[finish]??.88,
    metalness:finish==='metal'?.6:0,emissive:'#dce6eb',emissiveIntensity:finish==='glow'?1.6:.015});
  if(finish==='glass'){m.transparent=true;m.opacity=.12;m.depthWrite=false;}
  m.onBeforeCompile=s=>{
    // This building is outside the house sun-shadow atlas. Its opaque roof
    // excludes direct sun; the existing nearby practical lights and sky fill
    // light the interior without an unshadowed sun bleaching the floor.
    s.fragmentShader=s.fragmentShader.replace('#include <lights_fragment_begin>',THREE.ShaderChunk.lights_fragment_begin.replace('getDirectionalLightInfo( directionalLight, directLight );','getDirectionalLightInfo( directionalLight, directLight ); directLight.color *= 0.04;'));
    // Fine code-drawn carpet fibres / vinyl grain, in metre coordinates.
    if(['carpet','mat','wood','fabric'].includes(finish)){
      s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 kimP;').replace('#include <begin_vertex>','#include <begin_vertex>\nkimP=position;');
      s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 kimP;').replace('#include <color_fragment>',`#include <color_fragment>
        float grain=fract(sin(dot(floor(kimP*${finish==='wood'?'vec3(95.,5.,5.)':'vec3(190.)'}),vec3(12.9898,78.233,42.71)))*43758.5453);
        diffuseColor.rgb *= .92+.16*grain;`);
    }
  };m.customProgramCacheKey=()=>`kim-${finish}`;
  return m;
}
// The guard uses the exact drawn boxes, not just their broad walking bounds.
// Exposed independently so route/camera tests can use the game's geometry.
export function kimGuardData(){
  const groups=[],arrays=[];let bytes=0;
  for(const p of kimModel.parts){
    if(p.door)continue;
    const g=geometry(p),a=g.attributes.position,n=g.attributes.normal,out=new Float32Array(a.count*6);
    for(let i=0;i<a.count;i++)out.set([a.getX(i),a.getY(i),a.getZ(i),n.getX(i),n.getY(i),n.getZ(i)],i*6);
    // Low spectator furniture follows the house camera's soft-furniture rule.
    const furniture=/chair|bench|desk|trophy/.test(p.name);
    groups.push({name:(furniture?'Furniture':'Master Kim')+' / '+p.name,offset:bytes,count:a.count});
    arrays.push(out);bytes+=out.byteLength;g.dispose();
  }
  const all=new Float32Array(bytes/4);let offset=0;for(const a of arrays){all.set(a,offset);offset+=a.length;}
  return {binary:all.buffer,groups};
}
export function combineGuards(...guards){
  return {triangles:guards.reduce((n,g)=>n+g.triangles,0),
    fraction:(...a)=>Math.min(...guards.map(g=>g.fraction(...a))),
    firstHit:(...a)=>Math.min(...guards.map(g=>g.firstHit(...a))),
    clearanceAt:(...a)=>Math.min(...guards.map(g=>g.clearanceAt(...a))),
    blocked:(...a)=>guards.some(g=>g.blocked(...a)),softClear:(...a)=>guards.every(g=>g.softClear(...a)),
    softTriangles:()=>guards.reduce((n,g)=>n+g.softTriangles(),0)};
}
export function createKimDoors(world,player,apply=()=>{},onSettled=()=>{}){
  return kimModel.doors.map(d=>{const originals=world.boxes.filter(b=>b.door===d.id),source=originals.map(b=>({name:b.name,min:[...b.min],max:[...b.max]}));
    if(!source.length)throw Error('Missing school door collider: '+d.id);
    const motion=createDoorMotion({world,originals,player,onSettled,sample:f=>source.map(b=>transformBounds(b,hingeMatrix(d.pivot,d.openAngle*f))),apply:f=>apply(d,f)});
    return Object.assign(motion,{id:d.id,label:d.label,at:{x:d.at[0],y:d.at[1],z:d.at[2]}});
  });
}
export async function createMasterKim(scene,{mobile=false,mirror=true}={}){
  const group=new THREE.Group();group.name="Master Kim's Taekwondo";scene.add(group);
  const buckets=new Map();
  for(const p of kimModel.parts){
    if(p.finish==='mirror'||p.door)continue;
    const list=buckets.get(p.finish)||[];list.push({g:geometry(p),color:p.color});buckets.set(p.finish,list);
  }
  for(const [finish,parts] of buckets){
    const m=new THREE.Mesh(merge(parts),material(finish));m.name='Master Kim / '+finish;
    m.receiveShadow=true;m.castShadow=!['glass','glow'].includes(finish);m.layers.enable(1);group.add(m);
  }
  const atlas=await new THREE.TextureLoader().loadAsync(new URL('./master-kim/signs.png?v=20261103-studio-life',import.meta.url).href);
  atlas.colorSpace=THREE.SRGBColorSpace;atlas.anisotropy=4;
  const signs=kimModel.signs.map(p=>{
    const g=new THREE.PlaneGeometry(...p.size).toNonIndexed(),uv=g.attributes.uv,index=ATLAS.indexOf(p.kind),cols=6,rows=4;
    for(let i=0;i<uv.count;i++)uv.setXY(i,((index%cols)+.004+uv.getX(i)*.992)/cols,1-(Math.floor(index/cols)+.004+(1-uv.getY(i))*.992)/rows);
    if(p.roll)g.rotateZ(p.roll);
    if(Number.isFinite(p.pitch))g.rotateX(p.pitch);else if(p.floor)g.rotateX(-Math.PI/2);else g.rotateY(p.yaw);g.translate(...p.position);return {g};
  });
  const signMaterial=new THREE.MeshStandardMaterial({map:atlas,roughness:.8,emissiveMap:atlas,emissive:'#ffffff',emissiveIntensity:.16});
  const signMesh=new THREE.Mesh(merge(signs),signMaterial);signMesh.name='Master Kim / code-drawn signage';signMesh.layers.enable(1);group.add(signMesh);
  const mirrorGeo=new THREE.PlaneGeometry(16.2,2.13),glass=mirror?new Reflector(mirrorGeo,{textureWidth:mobile?384:768,textureHeight:mobile?384:768,multisample:0,color:0x899193,clipBias:.003}):new THREE.Mesh(mirrorGeo,new THREE.MeshStandardMaterial({color:'#b6cbcf',metalness:.85,roughness:.12}));
  glass.name='Master Kim / mirror';glass.position.set(32.18,KIM.floor+1.63,44.4);glass.rotation.y=Math.PI/2;group.add(glass);
  // Reflections only for the player/preview camera inside the school. Cube
  // probes and other render targets never recurse through the mirror.
  if(mirror){const reflect=glass.onBeforeRender;glass.onBeforeRender=function(renderer,s,c){
    if(renderer.getRenderTarget()||c.position.x<29||c.position.z<20||c.position.z>54)return;
    reflect.call(this,renderer,s,c);
  };}
  const doorMeshes=new Map();
  for(const d of kimModel.doors){const parts=kimModel.parts.filter(p=>p.door===d.id).map(p=>({g:geometry(p),color:p.color}));const mesh=new THREE.Mesh(merge(parts),material('paint'));mesh.name=d.label;mesh.matrixAutoUpdate=false;mesh.frustumCulled=false;group.add(mesh);doorMeshes.set(d.id,mesh);}
  const motions=[];const doorGuard=movingDoorGuard(motions);
  function connectDoors(world,player,onSettled){if(motions.length)return motions;
    motions.push(...createKimDoors(world,player,(d,f)=>{doorMeshes.get(d.id).matrix.copy(hingeMatrix(d.pivot,d.openAngle*f));doorMeshes.get(d.id).matrixWorldNeedsUpdate=true;},onSettled));return motions;
  }
  const data=kimGuardData();
  return {group,guard:combineGuards(createCameraGuard(data.binary,data.groups),doorGuard),lights:kimModel.lights,connectDoors,doors:motions,doorMeshes,
    triangles:[...buckets.values()].reduce((n,ps)=>n+ps.reduce((n,p)=>n+(p.g.attributes.position?.count||0)/3,0),0),
    dispose(){glass.dispose?.();group.traverse(o=>{o.geometry?.dispose();if(o.material&&!o.isReflector)o.material.dispose();});atlas.dispose();scene.remove(group);}};
}
