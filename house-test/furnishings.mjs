import * as THREE from './vendor/three.module.min.js';
import {labelSprite} from './creatures.mjs?v=20261001-visuals';
// Pet-sized furniture, with the original ownership, slots and bonuses. Parts
// are baked into one mesh per finish, rather than one draw call per book/leg.
// These small models keep the old footprint; no new walking colliders/lights.
const FABRICS=['#84bca6','#b6a2dc','#e7a0ab','#e2c887'];
const BOOKS=['#638fab','#cb845a','#829d70','#b18bb2','#d5b668'];
const detailMaps=new Map();
function detailMap(kind){
  if(detailMaps.has(kind))return detailMaps.get(kind);
  const size=64,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    // Subtle relative tones, not large stripes: mipmaps keep these quiet when
    // a cottage is viewed from the street. No downloaded texture assets.
    const variation=kind==='wood'?Math.sin(y*.8+Math.sin(x*.18)*1.2)*3+Math.sin(y*2.3+x*.06)*2:((x+y)%2?2:-2);
    const tone=Math.round(248+variation),i=(y*size+x)*4;
    data[i]=data[i+1]=data[i+2]=tone;data[i+3]=255;
  }
  const texture=new THREE.DataTexture(data,size,size);
  texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps=true;texture.needsUpdate=true;texture.userData.shared=true;
  detailMaps.set(kind,texture);return texture;
}
function roundedBox(w,h,d,r){
  r=Math.min(r,w/5,h/5,d/5);
  const x=w/2-r,y=h/2-r,c=r;
  const shape=new THREE.Shape();
  shape.moveTo(-x+c,-y);shape.lineTo(x-c,-y);shape.quadraticCurveTo(x,-y,x,-y+c);
  shape.lineTo(x,y-c);shape.quadraticCurveTo(x,y,x-c,y);shape.lineTo(-x+c,y);
  shape.quadraticCurveTo(-x,y,-x,y-c);shape.lineTo(-x,-y+c);shape.quadraticCurveTo(-x,-y,-x+c,-y);
  const geo=new THREE.ExtrudeGeometry(shape,{depth:d-2*r,steps:1,bevelEnabled:true,bevelSize:r,bevelThickness:r,bevelSegments:2,curveSegments:2});
  geo.translate(0,0,-d/2+r);return geo;
}
export function furnishing(item,index=0,{label:named=true}={}){
  const root=new THREE.Group(),id=((item.id||'')+' '+(item.name||'')).toLowerCase();
  root.name='Furnishing: '+(item.name||item.id||'decoration');
  const fabric=FABRICS[((index%4)+4)%4],wood='#ad7c50',darkWood='#795338',cream='#f1e8d8';
  const finishes={wood:{roughness:.72,map:detailMap('wood')},fabric:{roughness:.98,map:detailMap('fabric')},plain:{roughness:.8},metal:{roughness:.36,metalness:.5},glow:{roughness:.8,emissive:'#ffdda0',emissiveIntensity:.28}};
  const parts=new Map();
  function part(geometry,x,y,z,color,kind='wood',rotation=null){
    if(rotation)geometry.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rotation)));
    geometry.translate(x,y,z);
    if(!parts.has(kind))parts.set(kind,[]);parts.get(kind).push({geometry,color});
  }
  const box=(x,y,z,w,h,d,color=wood,kind='wood',r=.012,rotation=null)=>part(r?roundedBox(w,h,d,r):new THREE.BoxGeometry(w,h,d),x,y,z,color,kind,rotation);
  const ball=(x,y,z,sx,sy,sz,color=fabric,kind='fabric',rotation=null)=>{const g=new THREE.SphereGeometry(1,12,8);g.scale(sx,sy,sz);part(g,x,y,z,color,kind,rotation);};
  const cyl=(x,y,z,top,bottom,height,color=wood,kind='wood',rotation=null)=>part(new THREE.CylinderGeometry(top,bottom,height,12),x,y,z,color,kind,rotation);
  function legs(w,d,height=.15){for(const x of [-w,w])for(const z of [-d,d])cyl(x,height/2,z,.026,.018,height,darkWood);}
  function cushion(x,y,z,w,h,d,color=fabric,rotation=null){box(x,y,z,w,h,d,color,'fabric',.04,rotation);}
  function books(y){for(let j=0;j<5;j++){
    const x=-.24+j*.12,h=.18+(j%3)*.025;
    box(x,y+h/2,0,.092,h,.2,BOOKS[(j+index)%BOOKS.length],'fabric',.004);
    // A recessed page block and a pale spine band give each book a front.
    box(x,y+h/2,.102,.069,h-.034,.008,cream,'plain',0);
    box(x,y+h*.25,-.105,.073,.012,.008,cream,'plain',0);
  }}
  if(/sofa|couch/.test(id)){
    legs(.30,.18,.13);box(0,.20,0,.78,.15,.50);
    cushion(0,.45,-.20,.76,.38,.14);cushion(-.19,.31,.035,.35,.13,.42);cushion(.19,.31,.035,.35,.13,.42);
    for(const x of [-.36,.36])cushion(x,.37,.015,.12,.27,.49);
    cushion(-.21,.49,-.10,.19,.21,.10,cream,[0,0,-.18]);cushion(.22,.47,-.10,.17,.18,.10,BOOKS[(index+1)%5],[0,0,.17]);
  }else if(/bed/.test(id)){
    legs(.30,.20,.11);box(0,.15,0,.79,.12,.55);
    box(0,.33,-.245,.79,.43,.055,wood,'wood',.016);
    cushion(0,.25,.015,.73,.14,.49,cream);cushion(0,.325,.08,.73,.08,.32);
    cushion(0,.335,-.16,.37,.10,.15,cream);
    box(0,.37,-.025,.71,.012,.025,cream,'fabric',.002);
  }else if(/chair|seat|throne/.test(id)){
    legs(.17,.16,.23);box(0,.255,0,.47,.07,.43);
    cushion(0,.31,.015,.43,.09,.40);cushion(0,.51,-.17,.43,.38,.09);
    for(const x of [-.21,.21]){box(x,.35,0,.045,.17,.04);box(x,.435,.015,.065,.065,.37);}
  }else if(/beanbag|cushion|pillow/.test(id)){
    ball(0,.19,0,.34,.20,.29);ball(0,.32,-.10,.29,.28,.21);
    // A light inset on the seat reads as sewn upholstery rather than a sphere.
    cushion(0,.235,.10,.43,.06,.25,cream,[.10,0,0]);
  }else if(/plant|flower|tree|fern|bonsai|cactus|herb/.test(id)){
    cyl(0,.135,0,.16,.115,.27,'#bf795a','plain');cyl(0,.255,0,.175,.175,.05,'#cd8967','plain');
    cyl(0,.284,0,.145,.145,.013,'#574130','plain');cyl(0,.49,0,.014,.02,.41,darkWood);
    // Tapered leaves radiate from the stem; varied size/direction creates a
    // planted silhouette and visible gaps instead of three green balls.
    for(let j=0;j<7;j++){
      const a=j*2.399,r=.14+(j%2)*.035,y=.40+j*.047;
      ball(Math.cos(a)*r,y,Math.sin(a)*r,.055,.18,.022,j%2?'#7eaa68':'#598d54','plain',[Math.sin(a)*.65,0,-Math.cos(a)*.65]);
    }
    ball(0,.77,0,.04,.12,.018,'#7eaa68','plain',[0,0,.10]);
  }else if(/lamp|light|lantern|candle/.test(id)){
    if(/candle/.test(id)){
      cyl(0,.035,0,.13,.15,.07,darkWood);cyl(0,.18,0,.06,.062,.24,cream,'plain');
      ball(0,.33,0,.025,.055,.025,'#fff0b5','glow');
    }else{
      cyl(0,.025,0,.14,.16,.05,'#5e625b','metal');cyl(0,.36,0,.014,.019,.65,'#766953','metal');
      // An open shade has a dark inner rim and a diffuser, not a solid cone.
      const shade=new THREE.CylinderGeometry(.12,.23,.27,20,1,true);
      part(shade,0,.77,0,cream,'plain');
      part(new THREE.TorusGeometry(.23,.009,5,20),0,.635,0,'#c9bca5','plain',[Math.PI/2,0,0]);
      cyl(0,.65,0,.207,.207,.014,'#fff0bd','glow');
      cyl(0,.918,0,.02,.02,.03,'#766953','metal');
    }
  }else if(/rug|mat|carpet/.test(id)){
    box(0,.02,0,.85,.03,.65,fabric,'fabric',.006);
    // A woven border follows the rug, rather than a thick wooden panel on it.
    for(const x of [-.355,.355])box(x,.037,0,.018,.005,.53,cream,'fabric',0);
    for(const z of [-.265,.265])box(0,.037,z,.71,.005,.018,cream,'fabric',0);
    if(/rainbow/.test(id))for(let j=0;j<5;j++)box(-.25+j*.125,.038,0,.115,.004,.42,BOOKS[j],'fabric',0);
    for(const x of [-.435,.435])for(let j=0;j<9;j++)box(x,.021,-.25+j*.0625,.035,.01,.008,cream,'fabric',0);
  }else if(/shelf|book/.test(id)){
    box(0,.40,-.155,.74,.77,.035,darkWood);
    for(const x of [-.36,.36])box(x,.40,0,.055,.79,.35);
    for(const y of [.055,.40,.78])box(0,y,0,.77,.055,.35);
    books(.09);books(.43);
  }else if(/desk|table/.test(id)){
    legs(.30,.14,.43);box(0,.46,0,.76,.07,.43);box(0,.39,-.10,.64,.095,.19);
    box(0,.39,.006,.07,.014,.02,'#bba374','metal',.003);
    box(.19,.505,.04,.19,.012,.23,cream,'plain',.002);
  }else if(/basket|chest/.test(id)){
    box(0,.18,0,.58,.34,.40,wood,'wood',.022);
    box(0,.345,0,.58,.045,.40,darkWood,'wood',.015);
    for(const x of [-.25,.25])box(x,.17,.207,.025,.28,.014,cream,'plain',.003);
    box(0,.275,.218,.07,.06,.018,'#c4a36a','metal',.005);
    if(/basket/.test(id)){
      ball(-.11,.43,.04,.10,.10,.085,fabric);ball(.10,.42,-.015,.10,.09,.08,BOOKS[(index+1)%5],'fabric');
      for(const y of [.10,.17,.24])box(0,y,.208,.51,.014,.009,darkWood,'wood',.002);
    }
  }else if(item.hang||/poster|picture|clock|map|painting|mirror/.test(id)){
    box(0,.46,0,.65,.57,.045,darkWood,'wood',.01);box(0,.46,.028,.55,.47,.012,cream,'plain',.002);
    const picture=labelSprite(named?(item.emoji||'🖼️')+' '+(item.name||''):item.emoji||'🖼️');
    picture.position.set(0,.46,.045);picture.scale.set(.48,.34,1);root.add(picture);
  }else{
    // Keep unfamiliar collectibles as a display object, with a plinth and
    // soft silhouette, rather than pretending every item is the same sofa.
    box(0,.06,0,.48,.12,.36,wood,'wood',.015);
    ball(0,.28,0,.19,.20,.16);ball(-.14,.42,0,.065,.065,.06);ball(.14,.42,0,.065,.065,.06);
  }
  let triangles=0;
  for(const [kind,list] of parts){
    const baked=list.map(({geometry,color})=>{const g=geometry.index?geometry.toNonIndexed():geometry; if(g!==geometry)geometry.dispose();return {g,color:new THREE.Color(color)};});
    const count=baked.reduce((sum,{g})=>sum+g.attributes.position.count,0);
    const positions=new Float32Array(count*3),normals=new Float32Array(count*3),colors=new Float32Array(count*3),uvs=new Float32Array(count*2);
    let offset=0;
    for(const {g,color} of baked){const n=g.attributes.position.count;positions.set(g.attributes.position.array,offset*3);normals.set(g.attributes.normal.array,offset*3);if(g.attributes.uv)uvs.set(g.attributes.uv.array,offset*2);
      for(let i=0;i<n;i++){colors[(offset+i)*3]=color.r;colors[(offset+i)*3+1]=color.g;colors[(offset+i)*3+2]=color.b;}offset+=n;g.dispose();}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2));
    geometry.computeBoundingBox();const centre=geometry.boundingBox.getCenter(new THREE.Vector3());geometry.translate(-centre.x,-centre.y,-centre.z);geometry.computeBoundingSphere();
    // Centre each batch on its geometry: wall-mounted pieces keep their
    // existing mounting-height behaviour in house-life.mjs.
    const material=new THREE.MeshStandardMaterial({vertexColors:true,...finishes[kind]});if(kind==='plain')material.side=THREE.DoubleSide;
    const mesh=new THREE.Mesh(geometry,material);mesh.name=root.name+' / '+kind;mesh.position.copy(centre);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);triangles+=count/3;
  }
  root.userData.furnishing={meshes:parts.size,triangles};
  if(named){const label=labelSprite((item.emoji||'')+' '+(item.name||''));label.scale.set(.85,.16,1);label.position.y=1;root.add(label);}
  return root;
}
