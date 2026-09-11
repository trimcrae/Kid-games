import * as THREE from './vendor/three.module.min.js';

// Live, code-built counterparts of the seven Blender species: spheres, cones
// and tubes. No generated pictures, downloads, or remote model dependencies.
// Every pet in the house — yours, the family's and the neighbours' — is drawn
// at this scale. At 1.0 a hatched Craepet's head stood 0.89 m tall, above the
// 0.80 m dining table and level with the chair backs, which made the real-size
// rooms read as a doll's house. At 0.6 the head is ~0.53 m: above a 0.52 m
// chair seat, below the table, like a big friendly dog. Shapes, eggs and
// petpets keep their proportions to each other.
export const PET_SCALE=.6;
const sphere=new THREE.SphereGeometry(1,16,12);
const roundSphere=new THREE.SphereGeometry(1,24,16);
const cone=new THREE.ConeGeometry(1,1,12);
// Half a ring: a smile, a sleeping eye (turned over) or a happy ^ eye.
const arc=new THREE.TorusGeometry(1,.22,6,14,Math.PI);
const shared=new Set([sphere,roundSphere,cone,arc]);

// ---------------------------------------------------------------------------
// Rig. Each creature is two skinned meshes (fur, and everything else) on one
// small skeleton, plus its contact shadow: three draw calls instead of the ~20
// separate spheres it used to be, and every part can still move on its own —
// a head that looks round, eyes that blink or close, ears that droop, feet
// that step. At rest every vertex sits exactly where the old spheres did, so
// the measured sizes of every species are unchanged.
// ---------------------------------------------------------------------------
const BONES=[
  // name, parent, rest position (creature units, feet at 0)
  ['root',null,[0,0,0]],['body','root',[0,0,0]],['torso','body',[0,0,0]],['head','body',[0,.50,.02]],
  ['earL','head',[-.14,.79,0]],['earR','head',[.14,.79,0]],
  ['eyes','head',[0,.70,.24]],['sleepEyes','head',[0,.695,.25]],['happyEyes','head',[0,.69,.25]],
  ['mouth','head',[0,.556,.22]],['mouthOpen','head',[0,.542,.218]],
  ['armL','body',[-.24,.46,.015]],['armR','body',[.24,.46,.015]],
  ['tail','body',[0,.27,-.14]],['wingL','body',[-.2,.52,-.12]],['wingR','body',[.2,.52,-.12]],
  ['legL','root',[-.16,.12,.07]],['legR','root',[.16,.12,.07]],
];
const boneIndex=Object.fromEntries(BONES.map((b,i)=>[b[0],i]));
function makeSkeleton(){
  const bones=BONES.map(([name])=>{const b=new THREE.Bone();b.name=name;return b;});
  BONES.forEach(([name,parent,pos],i)=>{
    const b=bones[i];
    if(parent){const p=BONES[boneIndex[parent]][2];b.position.set(pos[0]-p[0],pos[1]-p[1],pos[2]-p[2]);bones[boneIndex[parent]].add(b);}
  });
  bones.forEach(b=>{b.userData.rest=b.position.clone();b.rotation.order='YXZ';});
  return bones;
}

// Merge parts (already placed in creature space) into one skinned geometry.
const _v=new THREE.Vector3(),_n=new THREE.Vector3(),_nm=new THREE.Matrix3();
function mergeParts(parts,{surface=false}={}){
  let verts=0,indices=0;
  for(const p of parts){verts+=p.geo.attributes.position.count;indices+=p.geo.index.count;}
  const pos=new Float32Array(verts*3),nor=new Float32Array(verts*3),uv=new Float32Array(verts*2),col=new Float32Array(verts*3);
  const skinIndex=new Uint16Array(verts*4),skinWeight=new Float32Array(verts*4),surf=surface?new Float32Array(verts*2):null;
  const index=new Uint32Array(indices);
  let v=0,ix=0;
  for(const p of parts){
    const g=p.geo,P=g.attributes.position,N=g.attributes.normal,U=g.attributes.uv;_nm.getNormalMatrix(p.matrix);
    for(let i=0;i<g.index.count;i++)index[ix++]=g.index.array[i]+v;
    for(let i=0;i<P.count;i++,v++){
      _v.fromBufferAttribute(P,i).applyMatrix4(p.matrix);pos.set([_v.x,_v.y,_v.z],v*3);
      _n.fromBufferAttribute(N,i).applyMatrix3(_nm).normalize();nor.set([_n.x,_n.y,_n.z],v*3);
      if(U)uv.set([U.getX(i),U.getY(i)],v*2);
      col.set([p.color.r,p.color.g,p.color.b],v*3);
      skinIndex[v*4]=p.bone;skinWeight[v*4]=1;
      if(surf)surf.set([p.rough,p.emit],v*2);
    }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(nor,3));
  geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));geo.setAttribute('color',new THREE.BufferAttribute(col,3));
  geo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndex,4));geo.setAttribute('skinWeight',new THREE.BufferAttribute(skinWeight,4));
  if(surf)geo.setAttribute('aSurf',new THREE.BufferAttribute(surf,2));
  geo.setIndex(new THREE.BufferAttribute(index,1));
  geo.computeBoundingBox();geo.computeBoundingSphere();
  return geo;
}

// Soft-real fur, still two draw calls: clumps of fur and fine strands from
// procedural noise (darker roots between clumps, lighter tips, a slightly
// richer colour like the painted adoption art), the same clumps bumping the
// normal so light breaks up across the coat, a velvet sheen at grazing angles
// (MeshPhysical sheen) and a soft textured fringe at the silhouette instead
// of a vinyl highlight. Grime (a dirty pet) shows as mud specks, not a blur.
const FUR_NOISE=`
float cpH(vec3 p){p=fract(p*0.3183099+0.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float cpN(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.0-2.0*f);
  return mix(mix(mix(cpH(i),cpH(i+vec3(1,0,0)),f.x),mix(cpH(i+vec3(0,1,0)),cpH(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(cpH(i+vec3(0,0,1)),cpH(i+vec3(1,0,1)),f.x),mix(cpH(i+vec3(0,1,1)),cpH(i+vec3(1,1,1)),f.x),f.y),f.z);}`;
const FUR_FRAGMENT=`
  float furLike=FURLIKE;
  vec3 clumpP=vFur*vec3(15.0,11.0,15.0);
  float clump=cpN(clumpP);
  float strand=cpN(vFur*vec3(58.0,21.0,58.0));
  float fiber=mix(clump,strand,0.45);
  float baseLum=dot(diffuseColor.rgb,vec3(0.2126,0.7152,0.0722));
  vec3 furCol=diffuseColor.rgb*mix(mix(0.52,0.8,smoothstep(0.3,0.85,baseLum)),1.04,fiber);
  float furLum=dot(furCol,vec3(0.2126,0.7152,0.0722));
  furCol=max(mix(vec3(furLum),furCol,1.28),0.0);
  diffuseColor.rgb=mix(diffuseColor.rgb,furCol,furLike);
  float speck=step(0.84,cpH(floor(vFur*34.0)))*step(0.35,clump);
  diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(0.86,0.8,0.72),uGrime*0.6*furLike);
  diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.26,0.19,0.13),uGrime*speck*0.85*furLike);`;
const FUR_NORMAL=`
  {float d=0.35;vec3 g=vec3(cpN(clumpP+vec3(d,0.0,0.0)),cpN(clumpP+vec3(0.0,d,0.0)),cpN(clumpP+vec3(0.0,0.0,d)))-clump;
   normal=normalize(normal-(mat3(viewMatrix)*g)*0.9*furLike);}`;
function creatureMaterial(kind,map=null,sheenColor='#ffffff'){
  const detail=kind==='detail';
  const material=new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:1,metalness:0,map,sheen:1,sheenRoughness:.55,
    sheenColor:new THREE.Color(sheenColor).lerp(new THREE.Color('#ffffff'),.35).multiplyScalar(detail?.6:.85)});
  const uniforms={uRim:{value:detail?.12:.16},uGrime:{value:0}};
  material.userData.uniforms=uniforms;
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>','#include <common>\nvarying vec3 vFur;'+(detail?'\nattribute vec2 aSurf;\nvarying vec2 vSurf;':''))
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvFur=position;'+(detail?'\nvSurf=aSurf;':''));
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>','#include <common>\nvarying vec3 vFur;\nuniform float uRim;\nuniform float uGrime;'+(detail?'\nvarying vec2 vSurf;':'')+FUR_NOISE)
      .replace('#include <color_fragment>','#include <color_fragment>'+FUR_FRAGMENT.replace('FURLIKE',detail?'smoothstep(0.75,0.92,vSurf.x)':'1.0'))
      .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>'+(detail?'\nroughnessFactor=vSurf.x;':''))
      .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>'+FUR_NORMAL)
      .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>'+(detail?'\ntotalEmissiveRadiance+=diffuseColor.rgb*vSurf.y;':''))
      .replace('#include <lights_physical_fragment>','#include <lights_physical_fragment>\n#ifdef USE_SHEEN\nmaterial.sheenColor*=furLike;\n#endif')
      .replace('#include <opaque_fragment>',`float furF=pow(1.0-clamp(dot(normalize(normal),normalize(vViewPosition)),0.0,1.0),2.2);
  outgoingLight*=1.0-0.28*furF*(1.0-fiber)*furLike;
  outgoingLight+=mix(diffuseColor.rgb,vec3(1.0),0.25)*uRim*furF*furLike*(0.6+0.4*strand);
#include <opaque_fragment>`);
  };
  material.customProgramCacheKey=()=>'craepet-fur2-'+kind;
  return material;
}
// A soft contact shadow: a warm dark core under the feet fading out past the
// body, so the pet reads as standing on oak, tile, carpet or lawn. One shared
// texture, built from numbers (it also works outside a browser, in tests).
let shadowTexture=null;
function contactShadowTexture(){
  if(shadowTexture)return shadowTexture;
  const size=64,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const r=Math.hypot(x+.5-size/2,y+.5-size/2)/(size/2);
    const a=Math.max(0,.5*Math.pow(Math.max(0,1-r),1.6)+.5*Math.exp(-Math.pow(r/.42,2))*(r<1?1:0));
    data.set([34,24,18,Math.round(Math.min(1,a)*255)],(y*size+x)*4);
  }
  shadowTexture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
  shadowTexture.magFilter=shadowTexture.minFilter=THREE.LinearFilter;shadowTexture.colorSpace=THREE.SRGBColorSpace;
  shadowTexture.needsUpdate=true;shadowTexture.userData.shared=true;
  return shadowTexture;
}
const SHADOW_OPACITY=.78;
function contactShadow(width=.74,depth=.64){
  const geometry=new THREE.PlaneGeometry(width,depth);geometry.rotateX(-Math.PI/2);geometry.translate(0,.006,0);
  // The shadow is decoration on the floor, not part of the body: it keeps the
  // old 0.28 m disc's bounds so every measured pet size stays the same.
  geometry.boundingBox=new THREE.Box3(new THREE.Vector3(-.28,.012,-.28),new THREE.Vector3(.28,.012,.28));
  const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map:contactShadowTexture(),transparent:true,opacity:SHADOW_OPACITY,depthWrite:false,
    polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-4}));
  mesh.name='contact shadow';mesh.renderOrder=-1;
  return mesh;
}

// A worn item the same colour as the fur disappears (a blue scarf on a blue
// pet). Nudge its lightness until it reads against the body.
function readable(hex,body){
  const c=new THREE.Color(hex),b=new THREE.Color(body);
  const l=v=>.2126*v.r+.7152*v.g+.0722*v.b;
  if(Math.abs(l(c)-l(b))>.08||Math.hypot(c.r-b.r,c.g-b.g,c.b-b.b)>.25)return c;
  const hsl={};c.getHSL(hsl);c.setHSL(hsl.h,hsl.s,l(b)>.3?Math.max(0,hsl.l-.28):Math.min(1,hsl.l+.28));return c;
}

const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export function creature(pet,palette={body:'#57c4ff',accent:'#dcf3ff'},extras=[]) {
  const root=new THREE.Group();
  const bones=makeSkeleton(),B=Object.fromEntries(bones.map(b=>[b.name,b]));
  root.add(bones[0]);
  let furMap=null;
  if(palette.pattern){const cv=document.createElement('canvas');cv.width=16;cv.height=22;const ctx=cv.getContext('2d');palette.pattern.forEach((row,y)=>row.forEach((col,x)=>{ctx.fillStyle=col;ctx.fillRect(x,y,1,1);}));furMap=new THREE.CanvasTexture(cv);furMap.colorSpace=THREE.SRGBColorSpace;}
  const FUR=furMap?'#ffffff':palette.body,ACCENT=palette.accent;
  const furParts=[],detailParts=[];
  const _m=new THREE.Matrix4(),_q=new THREE.Quaternion(),_e=new THREE.Euler();
  function place(pos,size,rot){_e.set(rot?.[0]||0,rot?.[1]||0,rot?.[2]||0);return new THREE.Matrix4().compose(new THREE.Vector3(...pos),_q.setFromEuler(_e).clone(),new THREE.Vector3(...size));}
  // part(kind, bone, position, size, {shape, rot, color, rough, emit})
  function part(kind,bone,pos,size,{shape=sphere,rot=null,color=null,rough=.95,emit=0}={}){
    const fur=kind==='fur';
    (fur?furParts:detailParts).push({geo:shape,matrix:place(pos,size,rot),bone:boneIndex[bone],color:new THREE.Color(fur?FUR:(color||ACCENT)),rough,emit});
  }
  const sp=pet.species,rig={species:sp,egg:!!pet.egg,hopper:sp==='snorbit'&&!pet.egg,floater:sp==='glimmr'&&!pet.egg,
    ears:false,tail:false,wings:false};
  const DARK='#33242b',WHITE='#fffdf3';
  if(pet.egg){
    part('detail','body',[0,.30,0],[.24,.32,.24],{shape:roundSphere,rough:.7});
    for(let i=0;i<7;i++){let a=i*2.4;part('fur','body',[Math.sin(a)*.225,.22+(i%3)*.09,Math.cos(a)*.225],[.045,.045,.025]);}
  }else{
    part('fur','torso',[0,.36,0],[.26,.30,.22],{shape:roundSphere});
    part('detail','torso',[0,.35,.182],[.17,.21,.055]);
    part('fur','head',[0,.66,.025],[.255,.225,.22],{shape:roundSphere});
    for(const side of [-1,1]){
      const L=side<0?'L':'R';
      part('fur','leg'+L,[side*.16,.09,.07],[.105,.10,.15]);
      part('fur','arm'+L,[side*.255,.35,.015],[.075,.16,.085]);
      // Eyes after the 2D Craepets: white, a warm brown iris, a dark pupil
      // and a bright spark, looking gently forward rather than apart.
      part('detail','eyes',[side*.105,.70,.218],[.072,.08,.034],{color:WHITE,rough:.45});
      part('detail','eyes',[side*.099,.694,.245],[.052,.062,.018],{color:'#5b3a26',rough:.3});
      part('detail','eyes',[side*.098,.691,.258],[.030,.037,.010],{color:'#1a120e',rough:.25});
      part('detail','eyes',[side*.105+.02,.72,.266],[.016,.02,.008],{color:WHITE,rough:.2,emit:.55});
      // Closed eyes: a soft curve for sleeping, ^ for happy.
      part('detail','sleepEyes',[side*.105,.70,.254],[.05,.03,.05],{shape:arc,rot:[0,0,Math.PI],color:DARK,rough:.6});
      part('detail','happyEyes',[side*.105,.685,.254],[.048,.05,.05],{shape:arc,color:DARK,rough:.6});
      // Rosy cheeks.
      part('detail','head',[side*.168,.598,.176],[.046,.028,.012],{rot:[0,side*.72,0],color:'#f39cae',rough:.9});
    }
    part('detail','head',[0,.573,.232],[.036,.022,.016],{color:DARK,rough:.35});
    // A small smile, and an open mouth for yawns and giggles.
    part('detail','mouth',[0,.556,.224],[.036,.03,.036],{shape:arc,rot:[.2,0,Math.PI],color:DARK,rough:.6});
    part('detail','mouthOpen',[0,.542,.214],[.032,.028,.014],{color:'#5a2a33',rough:.5});
    part('detail','mouthOpen',[0,.532,.222],[.019,.011,.008],{color:'#f07a8c',rough:.5});
    if(sp==='snorbit'){rig.ears=true;for(const side of [-1,1]){const E='ear'+(side<0?'L':'R');part('fur',E,[side*.14,1.02,0],[.085,.32,.07],{rot:[0,0,-side*.2]});part('detail',E,[side*.15,1.03,.052],[.043,.24,.025],{rot:[0,0,-side*.2]});}}
    if(sp==='puddlepop'||sp==='flarn'){rig.ears=true;for(const side of [-1,1])part(sp==='flarn'?'detail':'fur','ear'+(side<0?'L':'R'),[side*.19,.89,0],[.10,.23,.10],{shape:cone,rot:[0,0,-side*.23]});}
    if(sp==='twiggle'){rig.ears=true;for(const side of [-1,1]){const E='ear'+(side<0?'L':'R');part('detail',E,[side*.15,.94,0],[.025,.31,.025],{shape:cone});part('fur',E,[side*.25,.99,0],[.14,.047,.075],{rot:[0,0,side*.4]});}}
    if(sp==='flarn'||sp==='glimmr'){rig.wings=true;for(const side of [-1,1])part('detail','wing'+(side<0?'L':'R'),[side*.35,.50,-.13],[.23,.12,.035],{rot:[0,0,side*.45]});}
    if(sp==='zibbit'){rig.ears=true;for(const side of [-1,1]){part('fur','ear'+(side<0?'L':'R'),[side*.18,.82,.03],[.12,.13,.12]);part('detail','leg'+(side<0?'L':'R'),[side*.25,.08,.15],[.17,.055,.17]);}}
    if(sp==='blorb'){rig.ears=true;for(const side of [-1,1])part('fur','ear'+(side<0?'L':'R'),[side*.19,.83,-.01],[.10,.12,.085]);}
    if(sp==='flarn'||sp==='puddlepop'||sp==='twiggle'){rig.tail=true;part('fur','tail',[0,.3,-.32],[.07,.08,.25],{rot:[-.4,0,0]});}
    if(sp==='glimmr')part('detail','head',[0,.97,0],[.07,.25,.07],{shape:cone});
    const wear=pet.wear||{},body=palette.body;
    if(wear.head){
      const h=wear.head,hat=readable(/crown|princess|halo|helmet/.test(h)?'#ffd863':/chef/.test(h)?'#fffdf3':/santa|bow/.test(h)?'#ef627b':'#996bdd',body).getStyle();
      const o={color:hat,rough:.55};
      if(h==='halo')part('detail','head',[0,1.01,0],[.23,.23,.23],{shape:new THREE.TorusGeometry(1,.11,8,24),rot:[Math.PI/2,0,0],...o});
      else if(h==='bow'){for(const side of [-1,1])part('detail','head',[side*.1,.9,.04],[.12,.075,.05],o);}
      else if(h==='bunnyears'){for(const side of [-1,1])part('detail','head',[side*.11,1.02,0],[.065,.23,.06],o);}
      else if(/crown|princess/.test(h)){part('detail','head',[0,.86,0],[.23,.045,.20],o);for(let i=0;i<5;i++)part('detail','head',[(i-2)*.08,.96,.08],[.04,.16,.04],{shape:cone,...o});}
      else {part('detail','head',[0,.87,0],[.27,.045,.23],o);part('detail','head',[0,1,0],[.18,.23,.16],{shape:/party|wizard|santa/.test(h)?cone:sphere,...o});}
    }
    if(wear.face){const color=readable(wear.face==='heartglasses'?'#ff5d8f':wear.face==='starglasses'?'#ffd166':'#242035',body).getStyle();
      for(const side of [-1,1]){part('detail','head',[side*.105,.7,.258],[.088,.088,.088],{shape:new THREE.TorusGeometry(1,.136,8,20),color,rough:.4});if(wear.face==='sunglasses')part('detail','head',[side*.105,.7,.263],[.075,.073,.012],{color,rough:.2});}}
    if(wear.neck){const color=readable(wear.neck==='bluescarf'?'#57c4ff':wear.neck==='medal'?'#ffd166':wear.neck==='pearls'?'#fff6f0':wear.neck==='bowtie'?'#8a5cff':'#ff5d6c',body).getStyle();
      part('detail','torso',[0,.49,.05],[.265,.035,.20],{color,rough:.8});if(wear.neck==='medal')part('detail','torso',[0,.4,.23],[.07,.07,.015],{color,rough:.3});else if(wear.neck==='bowtie')for(const side of [-1,1])part('detail','torso',[side*.055,.49,.23],[.065,.04,.025],{color,rough:.8});}
  }
  for(const x of extras)part('detail',x.bone||'head',x.pos,x.size,{color:x.color,rough:x.rough??.9});
  // Build the two skinned meshes on one skeleton.
  root.updateMatrixWorld(true);
  const skeleton=new THREE.Skeleton(bones);
  const meshes=[];
  for(const [list,kind] of [[furParts,'fur'],[detailParts,'detail']]){
    if(!list.length)continue;
    const geo=mergeParts(list,{surface:kind==='detail'});
    const mesh=new THREE.SkinnedMesh(geo,creatureMaterial(kind,kind==='fur'?furMap:null,furMap?'#ffffff':palette.body));
    mesh.name='creature '+kind;mesh.bind(skeleton,new THREE.Matrix4());
    // At rest the skinned body is exactly the merged geometry; animation only
    // ever moves parts a few centimetres, so a padded sphere culls safely.
    // Bounds are measured the way the separate spheres always were (each part's
    // own box, turned with it), so every size the tests and camera use is kept.
    const box=new THREE.Box3();for(const p of list){if(!p.geo.boundingBox)p.geo.computeBoundingBox();box.union(p.geo.boundingBox.clone().applyMatrix4(p.matrix));}
    mesh.boundingBox=box;mesh.boundingSphere=geo.boundingSphere.clone();mesh.boundingSphere.radius*=1.3;
    root.add(mesh);meshes.push(mesh);
  }
  const shadow=contactShadow();root.add(shadow);
  for(const name of ['sleepEyes','happyEyes','mouthOpen'])B[name].scale.setScalar(1e-4);

  // ----- animation state -------------------------------------------------
  const st={t:Math.random()*10,phase:0,walk:0,run:0,bob:0,bobVel:0,lastBob:0,lift:0,hopT:-1,hopK:1,lean:0,roll:0,lastYaw:null,lastTime:null,
    sit:0,lie:0,stretch:0,sniff:0,shake:0,scratch:0,fold:0,lookYaw:0,lookPitch:0,
    expr:{sleep:0,happy:0,tired:0,yawn:0,sad:0},blinkIn:1+Math.random()*3,blink:0,wobbleIn:3+Math.random()*4,wobble:0,
    want:{expression:'idle',pose:{},look:[0,0],fold:0,grime:0}};
  function setExpression(name){st.want.expression=name||'idle';}
  function setPose(pose){st.want.pose=pose||{};}
  function look(yaw=0,pitch=0){st.want.look=[clamp(yaw,-1.1,1.1),clamp(pitch,-.5,.6)];}
  function hop(strength=1){if(st.hopT<0||st.hopT>.6){st.hopT=0;st.hopK=strength;}}
  function fold(v){st.want.fold=v;}
  function setGrime(v){st.want.grime=clamp(v,0,1);}
  const approach=(cur,target,k)=>cur+(target-cur)*k;
  function update(dt,{moving=false,speed=0,reduced=false}={}){
    dt=clamp(dt,0,.1);st.t+=dt;
    const k=reduced?1:1-Math.exp(-dt*8),kSlow=reduced?1:1-Math.exp(-dt*3);
    // Turning rate from the heading the caller set, for leaning into turns.
    const yaw=root.rotation.y,turnRate=st.lastYaw===null||dt===0?0:wrap(yaw-st.lastYaw)/dt;st.lastYaw=yaw;
    const w=st.want,ex=w.expression,pose=w.pose;
    for(const key of ['sit','lie','stretch','sniff','shake','scratch'])st[key]=approach(st[key],pose[key]||0,k);
    const targets={sleep:ex==='sleep'?1:0,happy:ex==='happy'||ex==='squint'?1:0,tired:ex==='tired'||ex==='yawn'?1:0,yawn:ex==='yawn'?1:0,sad:ex==='sad'?1:0};
    for(const key in targets)st.expr[key]=approach(st.expr[key],targets[key],reduced?1:1-Math.exp(-dt*10));
    st.lookYaw=approach(st.lookYaw,w.look[0],reduced?1:1-Math.exp(-dt*5));st.lookPitch=approach(st.lookPitch,w.look[1],reduced?1:1-Math.exp(-dt*5));
    st.fold=approach(st.fold,w.fold,1-Math.exp(-dt*10));
    for(const m of meshes)m.material.userData.uniforms.uGrime.value=w.grime;
    // Gait: the feet advance with the distance actually covered, so a stroll
    // pads and a run scurries instead of both skating at one tempo.
    st.walk=approach(st.walk,moving?1:0,reduced?1:1-Math.exp(-dt*12));
    const v=moving?speed:0;st.run=approach(st.run,clamp((v-1.9)/1.2,0,1),k);
    if(moving){const stride=.45+.08*v;st.phase+=v*dt/stride*Math.PI*2;}
    const walkW=st.walk,P=st.phase;
    // Hop impulse (hello, joy, a stair tread).
    let hopLift=0,hopSquash=0;
    if(st.hopT>=0){st.hopT+=dt/(.42+.1*st.hopK);const h=st.hopT;
      if(h>=1)st.hopT=-1;
      else if(!reduced){hopLift=Math.sin(Math.PI*h)*.16*st.hopK;hopSquash=(h<.15?-(.15-h)/.15:h>.85?-(h-.85)/.15:0)*.12*st.hopK;}}
    if(rig.egg){
      // An egg only wobbles: now and then on its own, harder when tapped or
      // greeted, and rocks along when you carry it about.
      st.wobbleIn-=dt;if(st.wobbleIn<=0){st.wobbleIn=5+Math.random()*4;st.wobble=1;}
      st.wobble=Math.max(0,st.wobble-dt/.7);
      const wob=reduced?0:(Math.sin(st.t*18)*.07*st.wobble+Math.sin(P)*.08*walkW+(st.hopT>=0?Math.sin(st.hopT*Math.PI*4)*.14*st.hopK:0));
      B.body.rotation.z=wob;B.body.rotation.x=reduced?0:Math.sin(st.t*1.3)*.01;
      B.body.position.y=reduced?0:hopLift*.25;
      shadow.scale.setScalar(1);shadow.material.opacity=SHADOW_OPACITY;
      return;
    }
    // Body height: step bob, the snorbit's hop, a glimmr's float, hops.
    let lift;
    if(rig.hopper)lift=Math.max(0,Math.sin(P))*(.05+.02*v)*walkW;
    else lift=Math.abs(Math.sin(P))*(.018+.009*v)*walkW;
    const float=rig.floater?(.06+(reduced?0:Math.sin(st.t*2)*.035)):0;
    if(reduced)lift=0;
    const breathe=reduced?0:(1-walkW)*Math.sin(st.t*(st.expr.sleep>.5?2.8:5.6))*(st.expr.sleep>.5?.03:.018);
    st.bobVel=dt>0?(lift-st.lastBob)/dt:0;st.lastBob=lift;
    const squash=reduced?0:clamp(st.bobVel*.5,-.07,.07)+hopSquash;
    const sy=(1+squash+breathe)*(1-.08*st.sit-.2*st.lie)*(1-.06*st.stretch),sxz=1/Math.sqrt(Math.max(.5,1+squash))*(1+.1*st.lie);
    // Breathing and squash only change the torso; the head, arms, wings and
    // tail ride on its top so nothing grows taller than the pet at rest.
    B.torso.scale.set(sxz,sy,sxz*(1+.08*st.stretch));
    for(const name of ['head','armL','armR','tail','wingL','wingR']){const r=B[name].userData.rest;B[name].position.set(r.x,r.y*Math.min(sy,1+breathe*.3),r.z);}
    B.body.position.set(0,lift+hopLift+float-.05*st.sit-.1*st.lie,0);
    st.lean=approach(st.lean,reduced?0:v*.035*walkW,k);
    st.roll=approach(st.roll,reduced?0:clamp(-turnRate*.06,-.2,.2)*walkW,k);
    const shake=reduced?0:Math.sin(st.t*30)*.32*st.shake;
    B.body.rotation.set(st.lean+.22*st.sniff+.3*st.stretch,shake,st.roll);
    // Head: look, sniff the floor, droop when tired or asleep, tilt to scratch.
    const nod=reduced?0:Math.sin(st.t*14)*.05*st.sniff;
    B.head.rotation.set(-st.lookPitch+.4*st.sniff+.3*st.lie+.12*st.expr.tired-.25*st.expr.yawn+nod-.3*st.stretch,st.lookYaw-shake*1.4,(reduced?0:Math.sin(st.t*9))*.05*st.scratch+.1*st.scratch);
    // Feet and arms.
    const A=(.06+.015*v)*walkW*(reduced?.5:1),lift2=.05*walkW*(reduced?0:1);
    const hopFeet=rig.hopper;
    for(const [name,side,off] of [['legL',-1,0],['legR',1,Math.PI]]){
      const ph=P+(hopFeet?0:off),rest=B[name].userData.rest;
      B[name].position.set(rest.x*(1+.2*st.lie),rest.y+Math.max(0,Math.cos(ph))*lift2+float+(st.scratch&&side>0?.05*st.scratch:0),rest.z+Math.sin(ph)*A+.05*st.sit+.06*st.lie);
    }
    for(const [name,side,off] of [['armL',-1,Math.PI],['armR',1,0]]){
      B[name].rotation.set((reduced?0:-Math.sin(P+off)*.55*walkW)-1.1*st.stretch-.3*st.sit,0,side*(.15*st.lie+(reduced?0:.08*st.shake*Math.sin(st.t*30))));
    }
    // Ears: bounce a beat behind the body, droop when tired, sad or asleep.
    if(rig.ears){const droop=.35*st.expr.tired+.45*st.expr.sad+.3*st.lie,flick=reduced?0:clamp(-st.bobVel*.8,-.25,.25)+(st.scratch?Math.sin(st.t*22)*.2*st.scratch:0);
      B.earL.rotation.set(flick+.2*droop,0,droop);B.earR.rotation.set(flick+.2*droop,0,-droop);}
    if(rig.tail){const wagAmp=.15+.35*st.expr.happy+.1*walkW,wagRate=3+9*st.expr.happy+4*walkW;
      B.tail.rotation.set(-.25*st.run+.6*st.fold,(reduced?0:Math.sin(st.t*wagRate))*wagAmp*(1-st.lie*.8),0);}
    if(rig.wings){const flap=reduced?0:Math.sin(st.t*(rig.floater?9:12))*(.12+.25*walkW+.3*st.expr.happy)*(1-st.fold);
      B.wingL.rotation.set(0,.9*st.fold,-flap);B.wingR.rotation.set(0,-.9*st.fold,flap);}
    // Face: blink every few seconds; closed eyes when asleep; ^ ^ when happy.
    st.blinkIn-=dt;if(st.blinkIn<=0){st.blink=.14;st.blinkIn=2.5+Math.random()*3.5;}
    st.blink=Math.max(0,st.blink-dt);
    const closed=Math.max(st.expr.sleep,st.expr.happy);
    const open=(1-closed)*(st.blink>0?.08:1)*(1-.45*st.expr.tired);
    B.eyes.scale.set(1,Math.max(1e-4,open),Math.max(1e-4,closed>.98?0:1));
    B.sleepEyes.scale.setScalar(Math.max(1e-4,st.expr.sleep));
    B.happyEyes.scale.setScalar(Math.max(1e-4,st.expr.happy*(1-st.expr.sleep)));
    const mouthOpen=Math.max(st.expr.yawn*1.35,st.expr.happy*.75);
    B.mouthOpen.scale.set(Math.max(1e-4,mouthOpen),Math.max(1e-4,mouthOpen*(1+st.expr.yawn*.6)),Math.max(1e-4,mouthOpen));
    B.mouth.scale.set(1,Math.max(1e-4,(1-st.expr.sad*1.6)*(1-st.expr.yawn)),1);
    // The contact shadow shrinks and fades while the body is off the floor.
    const air=hopLift+float+lift*.5;
    shadow.scale.setScalar(1-clamp(air*1.4,0,.45));shadow.material.opacity=SHADOW_OPACITY*(1-clamp(air*2.2,0,.55));
  }
  Object.assign(rig,{bones:B,skeleton,meshes,shadow,head:B.head,setExpression,setPose,look,hop,fold,setGrime,update,
    get state(){return {expression:st.want.expression,pose:{...st.want.pose},sleep:+st.expr.sleep.toFixed(2),happy:+st.expr.happy.toFixed(2)};}});
  root.userData.rig=rig;root.userData.head=B.head;
  // Older callers (and companions) still just say "time, walking?".
  root.userData.animate=(time,moving,reduced,speed)=>{
    const dt=st.lastTime===null?0:time-st.lastTime;st.lastTime=time;
    update(dt,{moving,speed:moving?(speed??.45):0,reduced});
  };
  return root;
}
export function disposeCreature(root){
  const mats=new Set();
  root.traverse(m=>{if(m.material)mats.add(m.material);if(m.geometry&&!shared.has(m.geometry))m.geometry.dispose();if(m.isSkinnedMesh)m.skeleton?.dispose();});
  mats.forEach(m=>{if(m.map&&!m.map.userData.shared)m.map.dispose();m.dispose();});root.removeFromParent();
}
export function petpet(id){
  const palette={duckling:['#ffd863','#ff9f45'],snail:['#c99a6b','#ffe2bd'],blobbin:['#6fdc8c','#e0ffe9'],moth:['#c9a7f5','#fff0c9'],kit:['#ffb28a','#fff0e6'],hedge:['#8f684e','#e3cdae'],wisp:['#c6edff','#ffffff'],starling:['#ffd863','#fff8de']}[id]||['#ffe6a2','#fff8de'];
  const species={moth:'glimmr',kit:'puddlepop',wisp:'glimmr',hedge:'twiggle',starling:'zibbit'}[id]||'blorb';
  // A duckling's beak and a snail's shell ride on the same few draw calls.
  const extras=id==='duckling'?[{bone:'head',pos:[0,.6,.29],size:[.10,.045,.10],color:palette[1]}]:id==='snail'?[{bone:'body',pos:[0,.45,-.18],size:[.29,.29,.23],color:palette[1]}]:[];
  const root=creature({species},{body:palette[0],accent:palette[1]},extras);root.scale.setScalar(.35);
  return root;
}
// A small cream name pill (the HUD's own look), sized to its text.
export function labelSprite(text,color='#3b2e25'){
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  const font='800 44px ui-rounded,"Nunito","Trebuchet MS",system-ui,sans-serif';ctx.font=font;
  const w=Math.min(1000,Math.ceil(ctx.measureText(text).width)+64),h=76;canvas.width=w;canvas.height=h;
  ctx.font=font;ctx.fillStyle='#fff8ec';ctx.strokeStyle='#e8dcc8';ctx.lineWidth=5;
  ctx.beginPath();ctx.roundRect(3,3,w-6,h-6,(h-6)/2);ctx.fill();ctx.stroke();
  ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,w/2,h/2+2,w-40);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:true,transparent:true}));s.scale.set(.3*w/h,.3,1);s.userData.aspect=w/h;return s;
}
