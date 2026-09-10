import * as THREE from './vendor/three.module.min.js';

// The colours in the export are already linear RGB. No photographs or texture
// downloads: these code-built patterns are evaluated in metres
// on the code-built geometry. Geometric board/tile boundaries remain in the mesh.
const SURFACES={wood:1,fabric:2,carpet:2,blocks:3,siding:4,shakes:5,roof:6,
  lawn:7,mineral:8,stone:9,paint:10,ceramic:10,brushed:11,foliage:12,panels:13};

// Small deterministic data tiles hold relative albedo, roughness and height.
// They are generated once per finish family, shared by every matching material,
// mipmapped for distant surfaces, and sampled in world metres rather than UVs.
const tiles=new Map();
const tileSettings={
  0:[1,1,0],1:[3.2,.4,.00055],2:[.12,.12,.0012],3:[.812,.406,.0025],
  4:[2,.4,.0018],5:[.32,.56,.0025],6:[.68,.29,.0025],7:[4,4,.002],
  8:[.6,.6,.001],9:[1.6,1.6,0],10:[.1,.1,.00018],11:[.3,.12,.00012],
  12:[1,1,0],13:[1.2,.6,.0015],
};
const seedPixels=new Uint8Array(128*128);
let seed=173;
for(let i=0;i<seedPixels.length;i++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;seedPixels[i]=seed>>>24;
}
function noise(x,y){
  const ix=Math.floor(x),iy=Math.floor(y);let fx=x-ix,fy=y-iy;
  fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);
  const at=(a,b)=>seedPixels[((b&127)*128)+(a&127)]/255;
  return (at(ix,iy)*(1-fx)+at(ix+1,iy)*fx)*(1-fy)
    +(at(ix,iy+1)*(1-fx)+at(ix+1,iy+1)*fx)*fy;
}
function detailTile(family){
  if(tiles.has(family))return tiles.get(family);
  const size=family?256:1,bytes=new Uint8Array(size*size*4);
  const wave=(v)=>Math.sin(v*Math.PI*2);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=(x+.5)/size,v=(y+.5)/size;
    let tone=1,rough=0,height=0;
    if(family===1){
      const grain=noise(u*4,v*44),bands=wave(v*18+noise(u*4,v*4)*.4);
      tone=.9+grain*.2+bands*.025;rough=(grain-.5)*.1;height=grain-.5;
    }else if(family===2){
      const pile=noise(u*56,v*56),weave=wave(u*64)*wave(v*64);
      tone=.95+noise(u*12,v*12)*.1+weave*.018;rough=(pile-.5)*.06;height=pile-.5;
    }else if([3,5,6].includes(family)){
      const row=Math.floor(v*2),xx=(u*2+row*.5)%1,yy=(v*2)%1;
      const seam=Math.min(xx,1-xx)<.012||Math.min(yy,1-yy)<.022?1:0;
      tone=.96+noise(Math.floor(u*2+row*.5)*5,row*5)*.08-seam*.2;
      rough=seam*.1;height=-seam*.8+(noise(u*24,v*24)-.5)*.2;
    }else if(family===4){
      const seam=(v*2)%1<.025?1:0;tone=.99-seam*.17;height=-seam;
    }else if(family===7){
      const blade=noise(u*100,v*100);tone=.82+noise(u*5,v*5)*.36+(blade-.5)*.1;height=blade-.5;
    }else if(family===8){
      const grain=noise(u*64,v*64);tone=.94+noise(u*5,v*5)*.1+(grain-.5)*.06;
      rough=(grain-.5)*.06;height=grain-.5;
    }else if(family===9){
      const cloud=noise(u*4,v*4),vein=wave((u+v)*3+cloud);
      tone=.985-Math.max(0,(vein-.87)/.13)*.13;rough=(cloud-.5)*.045;
    }else if(family===10){height=noise(u*48,v*48)-.5;
    }else if(family===11){const brush=noise(u*2,v*110);rough=(brush-.5)*.15;height=brush-.5;
    }else if(family===12){tone=.82+noise(u*6,v*6)*.36;
    }else if(family===13){tone=.97+noise(u*5,v*5)*.06;}
    const i=(y*size+x)*4;
    bytes[i]=Math.round(Math.max(0,Math.min(1,tone*.5))*255);
    bytes[i+1]=Math.round(Math.max(0,Math.min(1,.5+rough))*255);
    bytes[i+2]=Math.round(Math.max(0,Math.min(1,.5+height*.5))*255);bytes[i+3]=255;
  }
  const texture=new THREE.DataTexture(bytes,size,size);
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps=true;texture.needsUpdate=true;
  const tile={texture,scale:new THREE.Vector2(...tileSettings[family].slice(0,2)),height:tileSettings[family][2]};
  tiles.set(family,tile);return tile;
}

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
uniform int houseSurfaceKind;
uniform bool houseVerticalGrain;
uniform sampler2D houseDetailMap;
uniform vec2 houseDetailScale;
uniform float houseHeight;
uniform vec3 housePanelSize;
uniform vec3 houseMortarColor;
uniform float housePanelOffset;
vec2 housePlane(vec3 p,vec3 n){
  n=abs(n);
  if(n.y>n.x&&n.y>n.z)return p.xz;
  return n.x>n.z?p.zy:p.xy;
}
float houseSeam(float p,float course,float width){
  float f=fract(p/course),d=min(f,1.0-f)*course;
  return 1.0-smoothstep(width,width+max(fwidth(p),.0004),d);
}
float housePanelSeam(vec3 p){
  // The Blender finish projects (X+Y,Z); Three's axes are (X,Z,-Y).
  vec2 uv=vec2(p.x-p.z,p.y);
  uv.x+=mod(floor(uv.y/housePanelSize.y),2.0)*housePanelOffset*housePanelSize.x;
  return max(houseSeam(uv.x,housePanelSize.x,housePanelSize.z),
             houseSeam(uv.y,housePanelSize.y,housePanelSize.z));
}
vec3 houseSurface(vec3 p,vec3 n){
  vec2 uv=housePlane(p,n);
  if(houseVerticalGrain)uv=uv.yx;
  vec3 detail=texture2D(houseDetailMap,uv/houseDetailScale).rgb;
  return vec3(detail.r*2.0,detail.g-.5,(detail.b*2.0-1.0)*houseHeight);
}
vec3 houseBump(vec3 position,vec3 normal,float height){
  vec3 dx=dFdx(position),dy=dFdy(position);
  vec3 r1=cross(dy,normal),r2=cross(normal,dx);
  float determinant=dot(dx,r1);
  vec3 gradient=sign(determinant)*(dFdx(height)*r1+dFdy(height)*r2);
  return normalize(max(abs(determinant),1e-10)*normal-gradient);
}
`;

export function createHouseMaterial(group,{ambientOcclusionStrength=0}={}){
  const f=finishDescription(group),glass=f.surface==='glass';
  const aoStrength=THREE.MathUtils.clamp(ambientOcclusionStrength,0,.5);
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
  const family=(f.surface==='panels'&&!f.panelSize?SURFACES.paint:SURFACES[f.surface])||0;
  {
    // Uniform branches are coherent across each draw. A material family or
    // wood-grain direction must not compile another copy of the PBR shader.
    material.customProgramCacheKey=()=> aoStrength>0?'house-finish-v3-ao':'house-finish-v3';
    material.onBeforeCompile=shader=>{
      shader.uniforms??={};
      if(aoStrength>0){
        shader.defines??={};shader.defines.HOUSE_AO=1;
        shader.uniforms.houseOcclusionStrength={value:aoStrength};
      }
      shader.uniforms.houseSurfaceKind={value:family};
      const tile=detailTile(family);
      shader.uniforms.houseDetailMap={value:tile.texture};
      shader.uniforms.houseDetailScale={value:tile.scale};
      shader.uniforms.houseHeight={value:tile.height};
      shader.uniforms.houseVerticalGrain={value:f.grainAxis==='y'};
      shader.uniforms.housePanelSize={value:new THREE.Vector3(...(f.panelSize||[1,.6,.01]))};
      shader.uniforms.housePanelOffset={value:f.panelOffset??0};
      shader.uniforms.houseMortarColor={value:new THREE.Color(...(f.mortarColor||group.color))};
      shader.vertexShader=shader.vertexShader.replace('#include <common>',
        `#include <common>
          varying vec3 vHousePosition;varying vec3 vHouseNormal;
          #ifdef HOUSE_AO
            attribute float houseOcclusion;varying float vHouseOcclusion;
          #endif`)
        .replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
          vHousePosition=(modelMatrix*vec4(transformed,1.0)).xyz;
          vHouseNormal=normalize(mat3(modelMatrix)*objectNormal);
          #ifdef HOUSE_AO
            vHouseOcclusion=houseOcclusion;
          #endif`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
        `#include <common>
          #ifdef HOUSE_AO
            varying float vHouseOcclusion;uniform float houseOcclusionStrength;
          #endif\n`+SURFACE_GLSL)
        .replace('#include <color_fragment>',`#include <color_fragment>
          vec3 houseDetail=houseSurface(vHousePosition,normalize(vHouseNormal));
          diffuseColor.rgb*=houseDetail.x;
          if(houseSurfaceKind==13){
            float panelSeam=housePanelSeam(vHousePosition);
            diffuseColor.rgb=mix(diffuseColor.rgb,houseMortarColor,panelSeam);
            houseDetail.y+=panelSeam*.08;houseDetail.z-=panelSeam*.0015;
          }`)
        .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
          roughnessFactor=clamp(roughnessFactor+houseDetail.y,.045,1.0);`)
        .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
          if(houseSurfaceKind>0)normal=houseBump(-vViewPosition,normal,houseDetail.z);`)
        .replace('#include <aomap_fragment>',`#include <aomap_fragment>
          #ifdef HOUSE_AO
            float houseAO=mix(1.0,clamp(vHouseOcclusion,0.0,1.0),houseOcclusionStrength);
            reflectedLight.indirectDiffuse*=houseAO;
            reflectedLight.indirectSpecular*=houseAO;
            #ifdef USE_CLEARCOAT
              clearcoatSpecularIndirect*=houseAO;
            #endif
            #ifdef USE_SHEEN
              sheenSpecularIndirect*=houseAO;
            #endif
          #endif`);
    };
  }
  return material;
}
