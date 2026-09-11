import * as THREE from './vendor/three.module.min.js';

// Soft contact shadows under furniture, built once from the exported walking
// colliders: every box that stands on (or hovers just above) a floor gets a
// rounded, feathered darkening of the floor beneath it. Parts of the same
// object are merged first so a sofa is one shadow, not five stacked ones.
// One instanced draw call, multiply-blended, drawn after the opaque house.
const STRUCTURE=/wall|partition|floor|slab|subfloor|foundation|ceiling|roof|siding|stair|tread|riser|landing|step|walk|paver|lawn|path|sidewalk|door|window|sill|header|pier|skirting|trim|handrail|curb|edging|apron|joist|beam|fence|\bmat\b|carpet|rug|hearth|mulch|grout|tile|bank|strip|ramp|glass|mirror|wall art|pipe|gable|vent|louver|shutter|chimney|mantel|light|lamp|fan|bulb|curtain|blind|rail|chain|rope|net|leaf|leaves|branch|stem|plant|canopy|shrub|swing|monkey|hook|coat|towel|picture|frame face|bezel|television|monitor|keyboard/i;
const MAX_GAP=.95;

export function contactShadowBoxes(colliders){
  const supports=colliders.filter(b=>(b.max[0]-b.min[0])*(b.max[2]-b.min[2])>=.8);
  const floorUnder=(x,z,y)=>{
    let top=-Infinity;
    for(const s of supports)if(s.max[1]<=y+.03&&s.max[1]>top&&x>=s.min[0]&&x<=s.max[0]&&z>=s.min[2]&&z<=s.max[2])top=s.max[1];
    return top;
  };
  const items=[];
  for(const b of colliders){
    const w=b.max[0]-b.min[0],d=b.max[2]-b.min[2],h=b.max[1]-b.min[1],area=w*d;
    if(area<.02||area>6||h<.02||Math.max(w,d)>4.2||STRUCTURE.test(b.name))continue;
    const cx=(b.min[0]+b.max[0])/2,cz=(b.min[2]+b.max[2])/2;
    const floor=floorUnder(cx,cz,b.min[1]);
    const gap=b.min[1]-floor;
    if(!Number.isFinite(floor)||gap<-.03||gap>MAX_GAP)continue;
    items.push({min:[b.min[0],b.min[2]],max:[b.max[0],b.max[2]],floor,gap:Math.max(0,gap)});
  }
  // Merge parts of one object: same floor and heavy footprint overlap.
  const overlap=(a,b)=>{
    const ox=Math.min(a.max[0],b.max[0])-Math.max(a.min[0],b.min[0]),oz=Math.min(a.max[1],b.max[1])-Math.max(a.min[1],b.min[1]);
    if(ox<=0||oz<=0)return 0;
    const small=Math.min((a.max[0]-a.min[0])*(a.max[1]-a.min[1]),(b.max[0]-b.min[0])*(b.max[1]-b.min[1]));
    return ox*oz/small;
  };
  const merged=[];
  for(const it of items.sort((a,b)=>a.gap-b.gap)){
    const host=merged.find(m=>Math.abs(m.floor-it.floor)<.02&&overlap(m,it)>.5);
    if(host){
      host.min=[Math.min(host.min[0],it.min[0]),Math.min(host.min[1],it.min[1])];
      host.max=[Math.max(host.max[0],it.max[0]),Math.max(host.max[1],it.max[1])];
      host.gap=Math.min(host.gap,it.gap);
    }else merged.push({...it,min:[...it.min],max:[...it.max]});
  }
  return merged;
}

export function createContactShadows(scene,colliders,{strength=.5,tint=[.38,.33,.30]}={}){
  const boxes=contactShadowBoxes(colliders);
  if(!boxes.length)return null;
  const geometry=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2);
  const inner=new Float32Array(boxes.length*2),power=new Float32Array(boxes.length);
  const mesh=new THREE.InstancedMesh(geometry,null,boxes.length);
  const m=new THREE.Matrix4();
  boxes.forEach((b,i)=>{
    const w=b.max[0]-b.min[0],d=b.max[1]-b.min[1];
    // Higher objects cast a wider, fainter shadow.
    const margin=.07+b.gap*.32+Math.sqrt(w*d)*.06;
    m.makeScale(w+margin*2,1,d+margin*2).setPosition((b.min[0]+b.max[0])/2,b.floor+.004,(b.min[1]+b.max[1])/2);
    mesh.setMatrixAt(i,m);
    inner[i*2]=w/(w+margin*2);inner[i*2+1]=d/(d+margin*2);
    power[i]=strength*Math.pow(1-b.gap/MAX_GAP,1.3)*(w*d<.12?.7:1);
  });
  geometry.setAttribute('shadowInner',new THREE.InstancedBufferAttribute(inner,2));
  geometry.setAttribute('shadowPower',new THREE.InstancedBufferAttribute(power,1));
  mesh.material=new THREE.ShaderMaterial({
    uniforms:{shadowTint:{value:new THREE.Vector3(...tint)},shadowScale:{value:1}},
    transparent:true,depthWrite:false,blending:THREE.MultiplyBlending,premultipliedAlpha:true,
    polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4,toneMapped:false,fog:false,
    vertexShader:/* glsl */`
      attribute vec2 shadowInner;attribute float shadowPower;
      varying vec2 vUv;varying vec2 vInner;varying float vPower;
      void main(){
        vUv=uv*2.0-1.0;vInner=shadowInner;vPower=shadowPower;
        gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);
      }`,
    fragmentShader:/* glsl */`
      uniform vec3 shadowTint;uniform float shadowScale;
      varying vec2 vUv;varying vec2 vInner;varying float vPower;
      void main(){
        vec2 q=max(abs(vUv)-vInner*.7,0.0)/max(1.0-vInner*.7,1e-3);
        float a=1.0-smoothstep(0.0,1.0,length(q));
        a*=a*vPower*shadowScale;
        gl_FragColor=vec4(mix(vec3(1.0),shadowTint,a),1.0);
      }`,
  });
  mesh.userData.role='contact-shadows'; // unnamed: house-life recolours named meshes
  mesh.frustumCulled=false;mesh.renderOrder=-10;
  mesh.castShadow=mesh.receiveShadow=false;
  scene.add(mesh);
  return {mesh,count:boxes.length,set(scale){mesh.material.uniforms.shadowScale.value=scale;},
    dispose(){scene.remove(mesh);geometry.dispose();mesh.material.dispose();}};
}
