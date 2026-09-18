import * as THREE from './vendor/three.module.min.js';
// (The same URL as walkthrough.js and lighting.mjs, so the shared light
// uniforms — the exterior dim and the leaf fill — are one copy.)
import {EXTERIOR,FOLIAGE} from './materials.mjs?v=20260916-light';

// The jungle beyond the garden. The exported house stops at the property's
// edge (its yard is a photo study, see models/house/yard.py), so past the back
// fence there was only the sky sphere's flat ground colour. This fills the
// world outside the lot with an imaginary rainforest, code-drawn like Craepet
// Street's cottages (neighborhood.mjs): palms, broad canopy trees, giant
// emergents with buttress roots, banana plants, ferns, flowering bushes,
// hanging lianas and a few parrots, densest behind the back fence and along
// the sides of the back garden, thinning to a scatter beside the street, with
// a ring of misty hills on the horizon and a ground plane so no direction ends
// in a void. Everything is merged into a handful of vertex-coloured draw calls;
// nothing here collides (the fences and the lawn's edge already stop walking),
// so routes, the map and the camera guard are untouched. Leaves sway a little
// in a vertex shader (still under prefers-reduced-motion). None of it is the
// real neighbourhood: no houses, streets or anything from the photographs.
const GROUND=-.82;
// The lot, in scene metres (x, z): the lawns and Craepet Street's ground.
const LOT={minX:-9,maxX:23};
// Under the house the basement is below grade: the ground plane leaves it out.
const CELLAR={minX:-.8,maxX:17.3,minZ:-9.8,maxZ:7.4};

// Deterministic randomness: the jungle is the same every visit.
function rng(seed){let s=seed>>>0||1;return ()=>{s+=0x6D2B79F5;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};}

const GREENS=['#3f8a3c','#4d9a45','#357a38','#5aa54a','#2f6f35','#469246'];
const DEEP=['#2b6332','#2f6f35','#26592f'];
const FLOWERS=['#ff5f8f','#ff9f43','#ffe14d','#c86dff','#ff4d4d','#ff7ad9'];
const TRUNK=['#6e5139','#7a5c42','#5e4733'],PALM_TRUNK='#8f7a5c',FERN='#4f9b43',BANANA=['#6cbf4e','#7fd15a','#5fb347'];

// --- Parts: a geometry, a transform, a colour and how much it sways ---------
const _q=new THREE.Quaternion(),_qx=new THREE.Quaternion(),_e=new THREE.Euler(),_one=new THREE.Vector3(1,1,1),_v=new THREE.Vector3(),_up=new THREE.Vector3(0,1,0);
function part(geo,x,y,z,color,{yaw=0,tilt=0,roll=0,scale=null,sway=0,shade=null}={}){
  // tilt (about x) first, then yaw (about y): a leaf leans out, then turns.
  _q.setFromAxisAngle(_up,yaw).multiply(_qx.setFromEuler(_e.set(tilt,0,roll)));
  const matrix=new THREE.Matrix4().compose(_v.set(x,y,z),_q,scale||_one);
  return {geo,color,sway,shade,matrix};
}
// A segment between two points (trunks, branches, lianas).
function limb(a,b,r0,r1,color,sides=7){
  const dir=new THREE.Vector3().subVectors(b,a),len=dir.length();
  const geo=new THREE.CylinderGeometry(r1,r0,len,sides,1,true);
  const q=new THREE.Quaternion().setFromUnitVectors(_up,dir.clone().normalize());
  const matrix=new THREE.Matrix4().compose(new THREE.Vector3().addVectors(a,b).multiplyScalar(.5),q,_one);
  return {geo,color,sway:0,shade:null,matrix};
}
// A leaf: a lanceolate blade along +z with a raised spine, drooping toward the
// tip. width/length in metres, droop = how far the tip falls.
function leafGeometry(length,width,droop,segments=4){
  const pos=[],idx=[];
  for(let i=0;i<=segments;i++){
    const t=i/segments,w=width*Math.pow(Math.sin(Math.PI*Math.min(.999,t*.92+.04)),.7)*.5;
    const z=length*t,y=-droop*t*t;
    pos.push(-w,y-.01,z, 0,y+.025,z, w,y-.01,z);
  }
  for(let i=0;i<segments;i++){const a=i*3,b=a+3;idx.push(a,b,a+1, a+1,b,b+1, a+1,b+1,a+2, a+2,b+1,b+2);}
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);
  geo.computeVertexNormals();return geo;
}
const ball=(r,sy=1)=>{const g=new THREE.SphereGeometry(r,8,6);if(sy!==1)g.scale(1,sy,1);return g;};

// Merge parts into one geometry: position, normal, colour and sway per vertex.
// shade: [dark,light] tints a part by how much each vertex faces up (a cheap
// canopy self-shadow: bright tops, dark undersides).
function merge(parts){
  const baked=[];let count=0;
  for(const p of parts){const g=p.geo.index?p.geo.toNonIndexed():p.geo;if(g!==p.geo)p.geo.dispose();g.applyMatrix4(p.matrix);count+=g.attributes.position.count;baked.push({g,p});}
  const pos=new Float32Array(count*3),nor=new Float32Array(count*3),col=new Float32Array(count*3),sway=new Float32Array(count);
  const c=new THREE.Color(),dark=new THREE.Color(),light=new THREE.Color();let o=0;
  for(const {g,p} of baked){
    const n=g.attributes.position.count,na=g.attributes.normal.array;
    pos.set(g.attributes.position.array,o*3);nor.set(na,o*3);
    if(p.shade){dark.set(p.shade[0]);light.set(p.shade[1]);}else c.set(p.color);
    for(let i=0;i<n;i++){
      if(p.shade){const f=THREE.MathUtils.clamp(na[i*3+1]*.6+.5,0,1);c.copy(dark).lerp(light,f);}
      col[(o+i)*3]=c.r;col[(o+i)*3+1]=c.g;col[(o+i)*3+2]=c.b;sway[o+i]=p.sway;
    }
    o+=n;g.dispose();
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(nor,3));
  geo.setAttribute('color',new THREE.BufferAttribute(col,3));geo.setAttribute('sway',new THREE.BufferAttribute(sway,1));
  geo.computeBoundingSphere();geo.computeBoundingBox();return geo;
}

// --- Plants --------------------------------------------------------------
// Each returns {solid:[parts], leaf:[parts], perch?:Vector3} in world metres.
function palm(x,z,h,r){
  const solid=[],leaf=[];
  const lean=new THREE.Vector3(r()-.5,0,r()-.5).multiplyScalar(.35*h/8);
  const pts=[];for(let i=0;i<=4;i++){const t=i/4;pts.push(new THREE.Vector3(x+lean.x*t*t,GROUND+h*t,z+lean.z*t*t));}
  for(let i=0;i<4;i++)solid.push(limb(pts[i],pts[i+1],.17-.02*i,.15-.02*i,PALM_TRUNK));
  const top=pts[4],fronds=8+Math.floor(r()*3),start=r()*Math.PI*2;
  for(let k=0;k<fronds;k++){
    // Fronds leave the crown between level and 45° up, then arc down.
    const yaw=start+k*Math.PI*2/fronds+(r()-.5)*.3,tilt=-(.25+r()*.5)+(k%2)*.22;
    const len=h*.34+r()*.8;
    leaf.push(part(leafGeometry(len,len*.3,len*.6,5),top.x,top.y-.05,top.z,k%2?'#4f9c48':'#3c8340',{yaw,tilt,sway:1}));
  }
  for(let k=0;k<3;k++){const a=k*2.1;solid.push(part(ball(.13),top.x+Math.cos(a)*.16,top.y-.22,top.z+Math.sin(a)*.16,'#6b4a2b'));}
  return {solid,leaf,perch:new THREE.Vector3(top.x,top.y+.1,top.z)};
}
function canopyTree(x,z,h,w,r,{deep=false}={}){
  const solid=[],leaf=[],trunk=TRUNK[Math.floor(r()*TRUNK.length)];
  const base=new THREE.Vector3(x,GROUND-.05,z),fork=new THREE.Vector3(x+(r()-.5)*.4,GROUND+h*.42,z+(r()-.5)*.4);
  solid.push(limb(base,fork,.32*w/9+.08,.22*w/9+.06,trunk));
  const branches=3+Math.floor(r()*3),greens=deep?DEEP:GREENS,start=r()*Math.PI*2;
  let perch=null;
  for(let k=0;k<branches;k++){
    const a=start+k*Math.PI*2/branches+(r()-.5)*.6,reach=w*(.18+r()*.14);
    const tip=new THREE.Vector3(fork.x+Math.cos(a)*reach,fork.y+h*(.22+r()*.2),fork.z+Math.sin(a)*reach);
    solid.push(limb(fork,tip,.11,.05,trunk,6));
    if(!perch&&k===1)perch=tip.clone().add(new THREE.Vector3(0,.12,0));
    const g=greens[Math.floor(r()*greens.length)],g2=deep?'#1f4a28':'#2c5e2f';
    leaf.push(part(ball(w*(.2+r()*.1),.72),tip.x,tip.y+w*.06,tip.z,g,{sway:.45,shade:[g2,g]}));
  }
  // A crown over the branches and one lower blob so the shape reads as a tree.
  const g=greens[Math.floor(r()*greens.length)];
  leaf.push(part(ball(w*.27,.6),fork.x,fork.y+h*.42,fork.z,g,{sway:.5,shade:[deep?'#1f4a28':'#2c5e2f',g]}));
  leaf.push(part(ball(w*.2,.7),fork.x+(r()-.5)*w*.3,fork.y+h*.16,fork.z+(r()-.5)*w*.3,greens[0],{sway:.4,shade:['#2c5e2f',greens[1]]}));
  return {solid,leaf,perch};
}
function emergent(x,z,h,w,r){
  const solid=[],leaf=[];
  const base=new THREE.Vector3(x,GROUND-.05,z),top=new THREE.Vector3(x+(r()-.5)*.6,GROUND+h*.62,z+(r()-.5)*.6);
  solid.push(limb(base,top,.5,.3,'#5e4733',8));
  // Buttress roots: fins leaning against the trunk.
  for(let k=0;k<4;k++){const a=k*Math.PI/2+r()*.5;solid.push(part(new THREE.ConeGeometry(.42,2.6,4),x+Math.cos(a)*.55,GROUND+1.25,z+Math.sin(a)*.55,'#5e4733',{tilt:-.28,yaw:a+Math.PI/2}));}
  const arms=5;
  for(let k=0;k<arms;k++){
    const a=k*Math.PI*2/arms+r()*.5,reach=w*(.26+r()*.1);
    const tip=new THREE.Vector3(top.x+Math.cos(a)*reach,top.y+h*.14+r()*1.5,top.z+Math.sin(a)*reach);
    solid.push(limb(top,tip,.15,.06,'#5e4733',6));
    const g=DEEP[Math.floor(r()*DEEP.length)];
    leaf.push(part(ball(w*.24,.5),tip.x,tip.y+.4,tip.z,g,{sway:.35,shade:['#1b4224',g]}));
  }
  leaf.push(part(ball(w*.3,.45),top.x,top.y+h*.2,top.z,'#357a38',{sway:.4,shade:['#1b4224','#3f8a3c']}));
  return {solid,leaf};
}
function bananaPlant(x,z,r){
  const leaf=[],solid=[],n=5+Math.floor(r()*3),start=r()*Math.PI*2,h=.9+r()*.6;
  solid.push(limb(new THREE.Vector3(x,GROUND,z),new THREE.Vector3(x,GROUND+h,z),.07,.05,'#8fb060',6));
  for(let k=0;k<n;k++){
    const yaw=start+k*Math.PI*2/n+(r()-.5)*.4,len=1.4+r()*.9;
    leaf.push(part(leafGeometry(len,len*.36,len*.5,5),x,GROUND+h*(.7+r()*.3),z,BANANA[k%3],{yaw,tilt:-(.5+r()*.6),sway:.8}));
  }
  return {solid,leaf};
}
function fern(x,z,r,scale=1){
  const leaf=[],n=8+Math.floor(r()*4),start=r()*Math.PI*2;
  for(let k=0;k<n;k++){
    const yaw=start+k*Math.PI*2/n+(r()-.5)*.3,len=(.8+r()*.5)*scale;
    leaf.push(part(leafGeometry(len,len*.22,len*.45,4),x,GROUND+.05,z,k%3?FERN:'#5fae4a',{yaw,tilt:-(.35+r()*.6),sway:.6}));
  }
  return {solid:[],leaf};
}
function flowerBush(x,z,r){
  const leaf=[],solid=[],s=.6+r()*.5,g=GREENS[Math.floor(r()*GREENS.length)],flower=FLOWERS[Math.floor(r()*FLOWERS.length)];
  leaf.push(part(ball(s,.8),x,GROUND+s*.6,z,g,{sway:.3,shade:['#2c5e2f',g]}));
  leaf.push(part(ball(s*.7,.8),x+s*.6,GROUND+s*.45,z+(r()-.5)*s,g,{sway:.3,shade:['#2c5e2f',g]}));
  leaf.push(part(ball(s*.6,.8),x-s*.55,GROUND+s*.4,z-(r()-.5)*s,g,{sway:.3,shade:['#2c5e2f',g]}));
  const blooms=5+Math.floor(r()*5);
  for(let k=0;k<blooms;k++){const a=r()*Math.PI*2,d=s*(.5+r()*.6),y=GROUND+s*(.5+r()*.7);
    solid.push(part(new THREE.SphereGeometry(.09,6,4),x+Math.cos(a)*d,y,z+Math.sin(a)*d,flower));}
  return {solid,leaf};
}
// A parrot on a perch: body, head, beak, tail and folded wings. Storybook
// sized (about twice life) so it can be spotted from the lawn.
function parrot(at,yaw,colours){
  const [body,wing,tail,belly]=colours,solid=[],k=1.9;
  const s=(g,dx,dy,dz,color,o={})=>{g.scale(k,k,k);solid.push(part(g,at.x+(Math.cos(yaw)*dx-Math.sin(yaw)*dz)*k,at.y+dy*k,at.z+(Math.sin(yaw)*dx+Math.cos(yaw)*dz)*k,color,{yaw,...o}));};
  s(ball(.11,1.35),0,.18,0,body);
  s(ball(.075),0,.33,.06,belly);            // chest patch reads from the front
  s(ball(.085),0,.36,0,body);
  s(new THREE.ConeGeometry(.035,.09,6),0,.34,.1,'#2b2b2b',{tilt:Math.PI/2});
  s(ball(.06,1.1),.1,.2,-.02,wing,{scale:new THREE.Vector3(.5,1,1.3)});
  s(ball(.06,1.1),-.1,.2,-.02,wing,{scale:new THREE.Vector3(.5,1,1.3)});
  s(new THREE.BoxGeometry(.06,.03,.26),0,.08,-.16,tail,{tilt:-.45});
  return {solid,leaf:[]};
}
const PARROTS=[['#e63946','#f4a261','#1d6fd1','#ffd166'],['#2a6fdb','#1b4fa8','#2a6fdb','#ffd93d'],['#3cb44b','#2a8f3a','#e63946','#ffe14d'],['#1e1e24','#1e1e24','#1e1e24','#ff9f1c'],['#f4a261','#e76f51','#264653','#ffe8a3']];

export function createJungle(scene,{reducedMotion=false}={}){
  const r=rng(20260918),solid=[],leaf=[],perches=[];
  function add(p){solid.push(...p.solid);leaf.push(...p.leaf);if(p.perch)perches.push(p.perch);}
  function undergrowth(x,z,k){
    const pick=(k+Math.floor(r()*2))%4;
    if(pick===0)add(bananaPlant(x,z,r));else if(pick===1)add(fern(x,z,r,1.1));else if(pick===2)add(flowerBush(x,z,r));
    else{add(fern(x+.6,z,r,.8));add(flowerBush(x-.7,z+.3,r));}
  }
  function midTree(x,z,tall=1){
    if(r()<.45)add(palm(x,z,(7+r()*3)*tall,r));else add(canopyTree(x,z,(7.5+r()*3)*tall,(7+r()*3)*tall,r));
  }
  function bigTree(x,z){
    if(r()<.5)add(emergent(x,z,13+r()*5,11+r()*4,r));else add(canopyTree(x,z,10+r()*3,10+r()*3,r,{deep:true}));
  }
  const j=a=>(r()-.5)*a;
  // Behind the back fence (z < -28): undergrowth at the fence, then rows of
  // trees, then the giants, across the whole width and round both corners.
  for(let x=-24;x<=38;x+=2.1)undergrowth(x+j(.8),-29.3+j(.6),Math.round(x));
  for(let x=-24;x<=38;x+=3.1)midTree(x+j(1.2),-31.8+j(1.4));
  for(let x=-23;x<=38;x+=3.6)midTree(x+j(1.4),-36.5+j(1.8),1.15);
  for(let x=-24;x<=38;x+=4.4)bigTree(x+j(1.6),-42+j(2.2));
  for(let x=-22;x<=38;x+=5)bigTree(x+j(1.8),-48.5+j(2.4));
  // Both sides of the back garden and along the house: undergrowth just past
  // the boundary planting, trees behind it, thinning toward the street.
  for(const side of [-1,1]){
    const edge=side<0?LOT.minX:LOT.maxX;
    for(let z=-28;z<=4;z+=2.6){
      const thin=z>-8?.55:1;
      if(r()<thin)undergrowth(edge+side*(1.6+r()*.6),z+j(.9),Math.round(z));
      if(r()<thin)midTree(edge+side*(4.2+r()*1.5),z+j(1.2));
      if(z<0)midTree(edge+side*(8.5+r()*2),z+j(1.4),1.1);
      if(z<2)bigTree(edge+side*(13.5+r()*3),z+j(2));
    }
    // Beside the front garden and Craepet Street: a scatter, not a wall.
    for(let z=6;z<=30;z+=4.5){
      if(r()<.7)midTree(edge+side*(6+r()*3),z+j(1.5));
      bigTree(edge+side*(13+r()*4),z+j(2));
    }
  }
  // Beyond Craepet Street the forest closes the view again.
  for(let x=-22;x<=36;x+=3.4)midTree(x+j(1.2),35.5+j(1.4));
  for(let x=-24;x<=38;x+=4.6)bigTree(x+j(1.6),41+j(2.2));
  // Lianas: ropes hanging between the tall trees behind the fence.
  for(let k=0;k<14;k++){
    const x=-20+k*4.3+j(1.5),z=-38+j(4),span=3+r()*3,a=new THREE.Vector3(x,GROUND+9+r()*5,z),b=new THREE.Vector3(x+span,a.y-1+r()*3,z+j(2));
    const mid=a.clone().lerp(b,.5);mid.y-=1.5+r()*1.5;
    const curve=new THREE.CatmullRomCurve3([a,mid,b]);
    leaf.push({geo:new THREE.TubeGeometry(curve,10,.035,4,false),color:'#6b5a3a',sway:.3,shade:null,matrix:new THREE.Matrix4()});
  }
  // Parrots on the crowns nearest the garden, where the kids will spot them.
  const seats=perches.filter(p=>p.z>-35&&p.z<-29&&p.x>-12&&p.x<26).sort((a,b)=>a.x-b.x);
  const step=Math.max(1,Math.floor(seats.length/5));
  for(let i=0,k=0;i<seats.length&&k<5;i+=step,k++)add(parrot(seats[i],Math.PI+j(1.2),PARROTS[k%PARROTS.length]));

  // Materials: vertex colours; leaves are two-sided and sway; both follow the
  // house's exterior dim (moonlit garden seen from a lit room) and the leaves
  // take the same after-dark fill as the yard's own trees.
  const time={value:0};
  function jungleMaterial(leaves){
    const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.88,metalness:0,side:leaves?THREE.DoubleSide:THREE.FrontSide});
    material.customProgramCacheKey=()=>leaves?'jungle-leaf':'jungle-solid';
    material.onBeforeCompile=shader=>{
      shader.uniforms.houseExteriorDim=EXTERIOR.dim;shader.uniforms.jungleTime=time;shader.uniforms.houseLeafFill=FOLIAGE.fill;
      shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
          attribute float sway;uniform float jungleTime;`)
        .replace('#include <begin_vertex>',`#include <begin_vertex>
          if(sway>0.0){
            float t=jungleTime,ph=position.x*.35+position.z*.27;
            transformed.x+=sway*(.11*sin(t*.9+ph)+.04*sin(t*2.3+ph*2.1));
            transformed.z+=sway*(.08*cos(t*.7+ph*1.3)+.03*sin(t*1.9+ph));
            transformed.y+=sway*.03*sin(t*1.4+ph*1.7);
          }`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
          uniform float houseExteriorDim;uniform float houseLeafFill;`)
        .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
          ${leaves?'totalEmissiveRadiance+=diffuseColor.rgb*houseLeafFill*.7;':''}`)
        .replace('#include <opaque_fragment>',`outgoingLight*=houseExteriorDim;
          #include <opaque_fragment>`);
    };
    return material;
  }
  const group=new THREE.Group();group.name='Jungle';scene.add(group);
  function mesh(geo,material,{shadow=true,layer1=true}={}){
    const m=new THREE.Mesh(geo,material);m.castShadow=shadow;m.receiveShadow=shadow;
    if(layer1)m.layers.enable(1);group.add(m);return m;
  }
  const solidMaterial=jungleMaterial(false);
  const solidMesh=mesh(merge(solid),solidMaterial),leafMesh=mesh(merge(leaf),jungleMaterial(true));
  // The clock for the sway (one uniform, no per-frame work otherwise).
  leafMesh.onBeforeRender=()=>{if(!reducedMotion)time.value=(performance.now()*.001)%10000;};

  // The ground: one big plane a hair under the lawns (they overlap it, so no
  // seam shows) with the basement's footprint cut out.
  const R=170,shape=new THREE.Shape();
  shape.moveTo(-R,-R);shape.lineTo(R,-R);shape.lineTo(R,R);shape.lineTo(-R,R);shape.closePath();
  const hole=new THREE.Path();hole.moveTo(CELLAR.minX,-CELLAR.maxZ);hole.lineTo(CELLAR.maxX,-CELLAR.maxZ);hole.lineTo(CELLAR.maxX,-CELLAR.minZ);hole.lineTo(CELLAR.minX,-CELLAR.minZ);hole.closePath();
  shape.holes.push(hole);
  const groundGeo=new THREE.ShapeGeometry(shape);groundGeo.rotateX(-Math.PI/2);groundGeo.translate(0,GROUND-.015,0);
  // Same material as the trunks (vertex colours, the exterior dim): it needs a
  // colour and a zero sway per vertex.
  const gn=groundGeo.attributes.position.count,gc=new Float32Array(gn*3),earth=new THREE.Color('#6b984a');
  for(let i=0;i<gn;i++){gc[i*3]=earth.r;gc[i*3+1]=earth.g;gc[i*3+2]=earth.b;}
  groundGeo.setAttribute('color',new THREE.BufferAttribute(gc,3));groundGeo.setAttribute('sway',new THREE.BufferAttribute(new Float32Array(gn),1));
  const ground=mesh(groundGeo,solidMaterial);ground.castShadow=false;

  // Misty hills on the horizon, all round: mostly fog, so they read as
  // distance rather than as a wall.
  const hills=[];
  for(let k=0;k<18;k++){
    const a=k*Math.PI*2/18+j(.12),dist=54+r()*12,cx=6+Math.cos(a)*dist,cz=-4+Math.sin(a)*dist;
    const rx=14+r()*14,ry=6+r()*9,rz=10+r()*10;
    const g=new THREE.SphereGeometry(1,14,8);g.scale(rx,ry,rz);
    hills.push(part(g,cx,GROUND-ry*.3,cz,k%2?'#4a7a55':'#41704e',{yaw:r()*Math.PI,shade:['#3d6647',k%2?'#5a8a5e':'#527f58']}));
  }
  const hillMesh=mesh(merge(hills),new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}),{shadow:false});
  hillMesh.geometry.deleteAttribute('sway');

  return {group,
    // Triangle count, for the diagnostics snapshot.
    get triangles(){return [solidMesh,leafMesh,hillMesh,ground].reduce((n,m)=>n+(m.geometry.index?m.geometry.index.count:m.geometry.attributes.position.count)/3,0);},
    dispose(){scene.remove(group);group.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});}};
}
