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
const cone=new THREE.ConeGeometry(1,1,12);
export function creature(pet,palette={body:'#57c4ff',accent:'#dcf3ff'}) {
  const root=new THREE.Group(),body=new THREE.Group();root.add(body);
  const fur=new THREE.MeshStandardMaterial({color:palette.body,roughness:.95});
  if(palette.pattern){const cv=document.createElement('canvas');cv.width=16;cv.height=22;const ctx=cv.getContext('2d');palette.pattern.forEach((row,y)=>row.forEach((col,x)=>{ctx.fillStyle=col;ctx.fillRect(x,y,1,1);}));fur.map=new THREE.CanvasTexture(cv);fur.map.colorSpace=THREE.SRGBColorSpace;fur.color.set('#ffffff');}
  const accent=new THREE.MeshStandardMaterial({color:palette.accent,roughness:.85});
  const dark=new THREE.MeshStandardMaterial({color:'#192a37',roughness:.3});
  const white=new THREE.MeshStandardMaterial({color:'#fffdf3'});
  const limbs=[];
  function part(mat,pos,size,shape=sphere){const m=new THREE.Mesh(shape,mat);m.position.set(...pos);m.scale.set(...size);body.add(m);return m;}
  if(pet.egg){
    part(accent,[0,.30,0],[.24,.32,.24]);
    for(let i=0;i<7;i++){let a=i*2.4;part(fur,[Math.sin(a)*.225,.22+(i%3)*.09,Math.cos(a)*.225],[.045,.045,.025]);}
  }else{
    part(fur,[0,.36,0],[.26,.30,.22]);
    part(accent,[0,.35,.182],[.17,.21,.055]);
    part(fur,[0,.66,.025],[.255,.225,.22]);
    for(const side of [-1,1]){
      limbs.push(part(fur,[side*.16,.09,.07],[.105,.10,.15]));
      part(white,[side*.105,.70,.218],[.077,.082,.035]);
      part(dark,[side*.105,.70,.248],[.037,.051,.022]);
      part(white,[side*.115,.721,.265],[.012,.016,.009]);
      limbs.push(part(fur,[side*.255,.35,.015],[.075,.16,.085]));
    }
    part(dark,[0,.57,.236],[.045,.016,.012]);
    const sp=pet.species;
    if(sp==='snorbit')for(const side of [-1,1]){const ear=part(fur,[side*.14,1.02,0],[.085,.32,.07]);ear.rotation.z=-side*.2;const inner=part(accent,[side*.15,1.03,.052],[.043,.24,.025]);inner.rotation.z=-side*.2;}
    if(sp==='puddlepop'||sp==='flarn')for(const side of [-1,1]){const ear=part(sp==='flarn'?accent:fur,[side*.19,.89,0],[.10,.23,.10],cone);ear.rotation.z=-side*.23;}
    if(sp==='twiggle')for(const side of [-1,1]){part(accent,[side*.15,.94,0],[.025,.31,.025],cone);const leaf=part(fur,[side*.25,.99,0],[.14,.047,.075]);leaf.rotation.z=side*.4;}
    if(sp==='flarn'||sp==='glimmr')for(const side of [-1,1]){const wing=part(accent,[side*.35,.50,-.13],[.23,.12,.035]);wing.rotation.z=side*.45;}
    if(sp==='zibbit')for(const side of [-1,1]){part(fur,[side*.18,.82,.03],[.12,.13,.12]);part(accent,[side*.25,.08,.15],[.17,.055,.17]);}
    if(sp==='blorb')for(const side of [-1,1])part(fur,[side*.19,.83,-.01],[.10,.12,.085]);
    if(sp==='flarn'||sp==='puddlepop'||sp==='twiggle') {const tail=part(fur,[0,.3,-.32],[.07,.08,.25]);tail.rotation.x=-.4;}
    if(sp==='glimmr')part(accent,[0,.97,0],[.07,.25,.07],cone);
    const wear=pet.wear||{};
    if(wear.head){
      const h=wear.head,hat=new THREE.MeshStandardMaterial({color:/crown|princess|halo|helmet/.test(h)?'#ffd863':/chef/.test(h)?'#fffdf3':/santa|bow/.test(h)?'#ef627b':'#996bdd'});
      if(h==='halo'){const ring=new THREE.Mesh(new THREE.TorusGeometry(.23,.025,8,24),hat);ring.rotation.x=Math.PI/2;ring.position.y=1.01;body.add(ring);}
      else if(h==='bow'){for(const side of [-1,1])part(hat,[side*.1,.9,.04],[.12,.075,.05]);}
      else if(h==='bunnyears'){for(const side of [-1,1])part(hat,[side*.11,1.02,0],[.065,.23,.06]);}
      else if(/crown|princess/.test(h)){part(hat,[0,.86,0],[.23,.045,.20]);for(let i=0;i<5;i++)part(hat,[(i-2)*.08,.96,.08],[.04,.16,.04],cone);}
      else {part(hat,[0,.87,0],[.27,.045,.23]);part(hat,[0,1,0],[.18,.23,.16],/party|wizard|santa/.test(h)?cone:sphere);}
    }
    if(wear.face)for(const side of [-1,1]){const mat=new THREE.MeshStandardMaterial({color:wear.face==='heartglasses'?'#ff5d8f':wear.face==='starglasses'?'#ffd166':'#242035'});const rim=new THREE.Mesh(new THREE.TorusGeometry(.088,.012,8,20),mat);rim.position.set(side*.105,.7,.258);body.add(rim);if(wear.face==='sunglasses')part(mat,[side*.105,.7,.263],[.075,.073,.012]);}
    if(wear.neck){const mat=new THREE.MeshStandardMaterial({color:wear.neck==='bluescarf'?'#57c4ff':wear.neck==='medal'?'#ffd166':wear.neck==='pearls'?'#fff6f0':wear.neck==='bowtie'?'#8a5cff':'#ff5d6c'});part(mat,[0,.49,.05],[.265,.035,.20]);if(wear.neck==='medal')part(mat,[0,.4,.23],[.07,.07,.015]);else if(wear.neck==='bowtie')for(const side of [-1,1])part(mat,[side*.055,.49,.23],[.065,.04,.025]);}
  }
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(.28,24),new THREE.MeshBasicMaterial({color:'#183127',transparent:true,opacity:.22,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;shadow.position.y=.012;root.add(shadow);
  root.userData.animate=(time,moving,reduced)=>{
    body.position.y=reduced?0:pet.species==='glimmr'&&!pet.egg? .06+Math.sin(time*2)*.035 : moving?Math.abs(Math.sin(time*9))*.035:Math.sin(time*2)*.008;
    limbs.forEach((m,i)=>m.rotation.x=moving&&!reduced?Math.sin(time*9+(i%2)*Math.PI)*.35:0);
  };
  return root;
}
export function disposeCreature(root){
  const mats=new Set();root.traverse(m=>{if(m.material)mats.add(m.material);if(m.geometry&&m.geometry!==sphere&&m.geometry!==cone)m.geometry.dispose();});mats.forEach(m=>{m.map?.dispose();m.dispose();});root.removeFromParent();
}
export function petpet(id){
  const palette={duckling:['#ffd863','#ff9f45'],snail:['#c99a6b','#ffe2bd'],blobbin:['#6fdc8c','#e0ffe9'],moth:['#c9a7f5','#fff0c9'],kit:['#ffb28a','#fff0e6'],hedge:['#8f684e','#e3cdae'],wisp:['#c6edff','#ffffff'],starling:['#ffd863','#fff8de']}[id]||['#ffe6a2','#fff8de'];
  const species={moth:'glimmr',kit:'puddlepop',wisp:'glimmr',hedge:'twiggle',starling:'zibbit'}[id]||'blorb';
  const root=creature({species},{body:palette[0],accent:palette[1]});root.scale.setScalar(.35);
  if(id==='duckling'||id==='snail'){const mat=new THREE.MeshStandardMaterial({color:palette[1]});const detail=new THREE.Mesh(sphere,mat);detail.position.set(0,id==='duckling'?.6:.45,id==='duckling'?.29:-.18);detail.scale.set(id==='duckling'?.10:.29,id==='duckling'?.045:.29,id==='duckling'?.10:.23);root.add(detail);}
  return root;
}
export function labelSprite(text,color='#e0ecc1'){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#153a32ee';ctx.beginPath();ctx.roundRect(0,0,512,96,22);ctx.fill();ctx.fillStyle=color;ctx.font='bold 30px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,48,475);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:true}));s.scale.set(1.65,.31,1);return s;
}
