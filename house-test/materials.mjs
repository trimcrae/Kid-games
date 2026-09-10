import * as THREE from './vendor/three.module.min.js';

// The colours in the export are already linear RGB. No photographs, texture
// downloads or generated pictures: these subtle patterns are evaluated in metres
// on the code-built geometry. Geometric board/tile boundaries remain in the mesh.
const SURFACES={wood:1,fabric:2,carpet:2,blocks:3,siding:4,shakes:5,roof:6,
  lawn:7,mineral:8,stone:9,paint:10,ceramic:10,brushed:11,foliage:12,panels:13};

export function finishDescription(group){
  if(group.finish)return group.finish;
  // Old manifests still load, including the former "glass" classification bug.
  const name=group.name?.split(' / ').at(-1)||'';
  if(name==='Dark appliance glass')return {surface:'screen',roughness:.09,clearcoat:1};
  if(name==='Window glass'||group.glass)return {surface:'glass',roughness:.08,opacity:.2,clearcoat:1};
  if(/stainless|brass|Silver mirror/i.test(name))return {surface:/stainless/i.test(name)?'brushed':'metal',metalness:1,roughness:/mirror/i.test(name)?.035:.3};
  if(/oak|walnut|pine|wicker|joists|laminate planks|tree bark/i.test(name))return {surface:'wood',roughness:.36,clearcoat:.25};
  if(/carpet|upholstery|curtains|bedding|cushions|sofa|olive chair/i.test(name))return {surface:'fabric',roughness:.9,sheen:.5};
  return {surface:'plain',roughness:.75};
}

const SURFACE_GLSL=/* glsl */`
varying vec3 vHousePosition;
varying vec3 vHouseNormal;
float houseHash(vec3 p){
  p=fract(p*.1031);p+=dot(p,p.yzx+33.33);
  return fract((p.x+p.y)*p.z);
}
float houseNoise(vec3 p){
  vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(mix(houseHash(i),houseHash(i+vec3(1,0,0)),f.x),
                 mix(houseHash(i+vec3(0,1,0)),houseHash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(houseHash(i+vec3(0,0,1)),houseHash(i+vec3(1,0,1)),f.x),
                 mix(houseHash(i+vec3(0,1,1)),houseHash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float houseFine(vec3 p){
  return mix(.5,houseNoise(p),clamp(1.0-length(fwidth(p))*.7,0.0,1.0));
}
vec2 housePlane(vec3 p,vec3 n){
  n=abs(n);
  if(n.y>n.x&&n.y>n.z)return p.xz;
  return n.x>n.z?p.zy:p.xy;
}
float houseSeam(float p,float course,float width){
  float f=fract(p/course),d=min(f,1.0-f)*course;
  return 1.0-smoothstep(width,width+max(fwidth(p),.0004),d);
}
#if HOUSE_SURFACE == 13
uniform vec3 housePanelSize;
uniform vec3 houseMortarColor;
uniform float housePanelOffset;
float housePanelSeam(vec3 p){
  // The Blender finish projects (X+Y,Z); Three's axes are (X,Z,-Y).
  vec2 uv=vec2(p.x-p.z,p.y);
  uv.x+=mod(floor(uv.y/housePanelSize.y),2.0)*housePanelOffset*housePanelSize.x;
  return max(houseSeam(uv.x,housePanelSize.x,housePanelSize.z),
             houseSeam(uv.y,housePanelSize.y,housePanelSize.z));
}
#endif
// Return relative albedo, roughness variation and surface height in metres.
vec3 houseSurface(vec3 p,vec3 n){
  vec2 uv=housePlane(p,n);
  float tone=1.0,rough=0.0,height=0.0;
#if HOUSE_SURFACE == 1
  #ifdef HOUSE_VERTICAL_GRAIN
    p=p.yxz;
  #endif
  float grain=houseFine(p*vec3(.65,38.0,38.0));
  float bands=sin(p.z*72.0+houseNoise(p*1.8)*6.0+p.x*.32);
  bands*=clamp(1.0-fwidth(p.z*72.0)*.4,0.0,1.0);
  tone=.89+grain*.22+bands*.035;
  rough=(grain-.5)*.10;height=(grain-.5)*.00055;
#elif HOUSE_SURFACE == 2
  float pile=houseFine(p*210.0),mottle=houseFine(p*38.0);
  vec2 weave=sin(uv*1500.0)*clamp(vec2(1.0)-fwidth(uv*1500.0)*.4,0.0,1.0);
  tone=.94+mottle*.12+(weave.x*weave.y)*.018;
  rough=(pile-.5)*.06;height=(pile-.5)*.0012;
#elif HOUSE_SURFACE == 3 || HOUSE_SURFACE == 5 || HOUSE_SURFACE == 6
  #if HOUSE_SURFACE == 3
    vec2 size=vec2(.406,.203);float joint=.0045;
  #elif HOUSE_SURFACE == 5
    vec2 size=vec2(.16,.28);float joint=.002;
  #else
    vec2 size=vec2(.34,.145);float joint=.002;
  #endif
  uv.x+=mod(floor(uv.y/size.y),2.0)*size.x*.5;
  float seam=max(houseSeam(uv.x,size.x,joint),houseSeam(uv.y,size.y,joint));
  float cell=houseHash(vec3(floor(uv/size),0.0));
  tone=.96+cell*.08-seam*.20;
  rough=seam*.10;height=-seam*.0025+(houseFine(p*65.0)-.5)*.0006;
#elif HOUSE_SURFACE == 4
  float seam=houseSeam(p.y,.20,.003);
  tone=.98+houseNoise(p*3.0)*.04-seam*.17;
  height=-seam*.0018;
#elif HOUSE_SURFACE == 7
  float lawnTone=houseNoise(p*.8),blade=houseFine(p*85.0);
  tone=.79+lawnTone*.40+(blade-.5)*.10;
  height=(blade-.5)*.002;
#elif HOUSE_SURFACE == 8
  float grain=houseFine(p*95.0);
  tone=.94+houseNoise(p*3.0)*.10+(grain-.5)*.06;
  rough=(grain-.5)*.06;height=(grain-.5)*.001;
#elif HOUSE_SURFACE == 9
  float cloud=houseNoise(p*2.0),vein=sin((p.x+p.z)*9.0+cloud*8.0);
  tone=.985-smoothstep(.87,1.0,vein)*.13+(houseFine(p*40.0)-.5)*.018;
  rough=(cloud-.5)*.045;
#elif HOUSE_SURFACE == 10
  height=(houseFine(p*145.0)-.5)*.00018;
#elif HOUSE_SURFACE == 11
  float brush=houseFine(p*vec3(.6,650.0,.6));
  rough=(brush-.5)*.15;height=(brush-.5)*.00012;
#elif HOUSE_SURFACE == 12
  tone=.82+houseNoise(p*3.0)*.36;
#elif HOUSE_SURFACE == 13
  float seam=housePanelSeam(p);
  tone=.97+houseNoise(p*2.0)*.06;
  rough=seam*.08;height=-seam*.0015;
#endif
  return vec3(tone,rough,height);
}
vec3 houseBump(vec3 position,vec3 normal,float height){
  vec3 dx=dFdx(position),dy=dFdy(position);
  vec3 r1=cross(dy,normal),r2=cross(normal,dx);
  float determinant=dot(dx,r1);
  vec3 gradient=sign(determinant)*(dFdx(height)*r1+dFdy(height)*r2);
  return normalize(max(abs(determinant),1e-10)*normal-gradient);
}
`;

export function createHouseMaterial(group){
  const f=finishDescription(group),glass=f.surface==='glass';
  const material=new THREE.MeshPhysicalMaterial({
    color:new THREE.Color(...group.color),roughness:f.roughness??.7,
    metalness:f.metalness??0,clearcoat:f.clearcoat??0,
    clearcoatRoughness:f.clearcoatRoughness??.2,
    sheen:f.sheen??0,sheenColor:new THREE.Color(...group.color),sheenRoughness:.7,
    emissive:new THREE.Color(...(f.emissive||[0,0,0])),
    emissiveIntensity:f.emissiveIntensity??0,
    side:THREE.DoubleSide,transparent:glass,opacity:glass?(f.opacity??.2):1,
    depthWrite:!glass,envMapIntensity:glass?.8:1,
  });
  material.name=group.name;
  // Transparent panes stay a single pass; their closed thin boxes do not need
  // the default two-pass physical-glass path on phones.
  material.forceSinglePass=true;
  material.userData.houseFinish={...f};
  // If a new panel shader has no measured/exported grid, retain its matte
  // finish without inventing seams. Brick Texture dimensions supply the grid.
  const family=f.surface==='panels'&&!f.panelSize?SURFACES.paint:SURFACES[f.surface];
  if(family){
    material.customProgramCacheKey=()=>`house-finish-v1-${family}-${f.grainAxis==='y'?'y':'x'}`;
    material.onBeforeCompile=shader=>{
      shader.defines.HOUSE_SURFACE=family;
      if(family===13){
        shader.uniforms.housePanelSize={value:new THREE.Vector3(...f.panelSize)};
        shader.uniforms.housePanelOffset={value:f.panelOffset??0};
        shader.uniforms.houseMortarColor={value:new THREE.Color(...(f.mortarColor||group.color))};
      }
      if(f.grainAxis==='y')shader.defines.HOUSE_VERTICAL_GRAIN=1;
      shader.vertexShader=shader.vertexShader.replace('#include <common>',
        '#include <common>\nvarying vec3 vHousePosition;\nvarying vec3 vHouseNormal;')
        .replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
          vHousePosition=(modelMatrix*vec4(transformed,1.0)).xyz;
          vHouseNormal=normalize(mat3(modelMatrix)*objectNormal);`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
        '#include <common>\n'+SURFACE_GLSL)
        .replace('#include <color_fragment>',`#include <color_fragment>
          vec3 houseDetail=houseSurface(vHousePosition,normalize(vHouseNormal));
          diffuseColor.rgb*=houseDetail.x;
          #if HOUSE_SURFACE == 13
            diffuseColor.rgb=mix(diffuseColor.rgb,houseMortarColor,housePanelSeam(vHousePosition));
          #endif`)
        .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
          roughnessFactor=clamp(roughnessFactor+houseDetail.y,.045,1.0);`)
        .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
          normal=houseBump(-vViewPosition,normal,houseDetail.z);`);
    };
  }
  return material;
}
