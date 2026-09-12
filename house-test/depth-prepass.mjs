import * as THREE from './vendor/three.module.min.js';

// Depth prepass for the player camera. The house draws as a few hundred big
// material groups that the renderer can only sort coarsely, so rooms behind a
// wall, and floors under furniture, were fully shaded by the physical shader
// and then painted over: at render scale 1.0 that overdraw was over half the
// frame on integrated graphics (kitchen 66 -> 25 ms of GPU time).
//
// Before the normal frame, one cheap depth-only draw lays down the house's
// large surfaces (the triangles of opaque, non-dissolving groups bigger than
// MIN_AREA: ~18 % of the triangles, 97 % of the surface area), merged into a
// single static mesh so it costs one draw call and no scene traversal. The
// colour pass then tests against that depth, so hidden fragments are rejected
// before shading. Positions are copied bit for bit from the house groups and
// transformed by the same three.js vertex code; the prepass sits one depth
// step behind (polygon offset) so the visible surface always passes.
// The freed GPU time lets the resolution controller run at a higher render
// scale, which is what keeps sub-pixel bevels, trim and seams from breaking
// into dotted lines (they are clean at scale 1.0, dashed at 0.6).
const MIN_AREA=.005;
export function eligible(mesh){
  const m=mesh.material;
  return mesh.isMesh&&!!m?.userData?.houseFinish&&!m.transparent&&m.colorWrite!==false
    &&!m.defines?.HOUSE_FOLIAGE&&!m.defines?.HOUSE_NEAR_FADE&&!!mesh.geometry.attributes.position;
}
// Merge the big triangles of every eligible house mesh into one Float32Array.
function scan(mesh,minArea){
  const attr=mesh.geometry.attributes.position;
  const src=attr.isInterleavedBufferAttribute?attr.data.array:attr.array;
  const stride=attr.isInterleavedBufferAttribute?attr.data.stride:3,offset=attr.offset||0;
  const tris=Math.floor(attr.count/3),keep=new Uint8Array(tris),limit=4*minArea*minArea;let kept=0;
  for(let t=0;t<tris;t++){
    const a=t*3*stride+offset,b=a+stride,c=b+stride;
    const ux=src[b]-src[a],uy=src[b+1]-src[a+1],uz=src[b+2]-src[a+2];
    const vx=src[c]-src[a],vy=src[c+1]-src[a+1],vz=src[c+2]-src[a+2];
    const cx=uy*vz-uz*vy,cy=uz*vx-ux*vz,cz=ux*vy-uy*vx;
    if(cx*cx+cy*cy+cz*cz>limit){keep[t]=1;kept++;}
  }
  return kept?{src,stride,offset,keep,kept,matrix:mesh.matrixWorld.clone()}:null;
}
function copy(part,out,o){
  const {src,stride,offset,keep,matrix}=part,identity=matrix.equals(IDENTITY),v=new THREE.Vector3();
  for(let t=0;t<keep.length;t++){
    if(!keep[t])continue;
    for(let k=0;k<3;k++){
      const i=(t*3+k)*stride+offset;
      if(identity){out[o++]=src[i];out[o++]=src[i+1];out[o++]=src[i+2];}
      else{v.set(src[i],src[i+1],src[i+2]).applyMatrix4(matrix);out[o++]=v.x;out[o++]=v.y;out[o++]=v.z;}
    }
  }
  return o;
}
export function mergeOccluders(meshes,minArea=MIN_AREA){
  const parts=meshes.map(m=>scan(m,minArea)).filter(Boolean);
  const out=new Float32Array(parts.reduce((n,p)=>n+p.kept,0)*9);let o=0;
  for(const part of parts)o=copy(part,out,o);
  return out;
}
// The same, in slices of a few milliseconds so loading never stalls on it
// (the whole house is ~0.4 s of work on a slow laptop while shaders compile).
async function mergeInSlices(meshes,isCurrent,minArea=MIN_AREA,budget=6){
  await new Promise(r=>setTimeout(r,0));
  const parts=[];let since=performance.now();
  const breathe=async()=>{if(performance.now()-since>budget){await new Promise(r=>setTimeout(r,0));since=performance.now();}return isCurrent();};
  for(const mesh of meshes){const part=scan(mesh,minArea);if(part)parts.push(part);if(!await breathe())return null;}
  const out=new Float32Array(parts.reduce((n,p)=>n+p.kept,0)*9);let o=0;
  for(const part of parts){o=copy(part,out,o);if(!await breathe())return null;}
  return out;
}
const IDENTITY=new THREE.Matrix4();
export function installDepthPrepass(renderer,camera,{enabled=true}={}){
  const material=new THREE.MeshBasicMaterial({colorWrite:false,side:THREE.DoubleSide,fog:false,
    polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
  const depthScene=new THREE.Scene();
  const control={enabled,ready:false,triangles:0,meshes:0};
  let seen=-1,build=0;
  function schedule(scene){
    const meshes=[];scene.traverse(o=>{if(eligible(o))meshes.push(o);});
    if(meshes.length===control.meshes)return;
    control.meshes=meshes.length;const id=++build;
    // Off the frame that added the meshes; until then frames draw as before.
    const t=performance.now();
    mergeInSlices(meshes,()=>id===build).then(positions=>{
      if(!positions)return;
      control.buildMs=Math.round(performance.now()-t);
      for(const old of [...depthScene.children]){old.geometry.dispose();depthScene.remove(old);}
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
      const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;mesh.matrixAutoUpdate=false;
      depthScene.add(mesh);depthScene.updateMatrixWorld(true);
      control.triangles=positions.length/9;
      // Its one small program compiles off the frame (parallel compile where
      // the browser offers it); frames draw without the prepass until then.
      const done=()=>{control.ready=positions.length>0;};
      (renderer.compileAsync?renderer.compileAsync(depthScene,camera):Promise.resolve()).then(done,done);
    });
  }
  const inner=renderer.render.bind(renderer);
  renderer.render=(scene,cam)=>{
    if(cam!==camera||renderer.getRenderTarget()!==null)return inner(scene,cam);
    if(scene.children.length!==seen){seen=scene.children.length;schedule(scene);}
    if(!control.enabled||!control.ready)return inner(scene,cam);
    // Depth only: no colour clear, no shadow-map refresh, no background.
    const sm=renderer.shadowMap,needs=sm.needsUpdate,auto=sm.autoUpdate,color=renderer.autoClearColor;
    sm.needsUpdate=false;sm.autoUpdate=false;renderer.autoClearColor=false;
    inner(depthScene,cam);
    sm.needsUpdate=needs;sm.autoUpdate=auto;renderer.autoClearColor=color;
    const depth=renderer.autoClearDepth;renderer.autoClearDepth=false;
    try{inner(scene,cam);}finally{renderer.autoClearDepth=depth;}
  };
  renderer.houseDepthPrepass=control;
  return control;
}
