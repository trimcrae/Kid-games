import * as THREE from './vendor/three.module.min.js';
import {lots,neighborhoodBoxes} from './neighborhood-layout.mjs';
import {disposeCreature} from './creatures.mjs';
import {furnishing} from './furnishings.mjs';
// Craepet Street: an imaginary lane of little cottages beyond the real front
// yard, one per family profile. The walking colliders are the plain boxes in
// neighborhood-layout.mjs (tests use them); everything drawn here is dressing
// around them — gabled roofs, trim, framed windows with shutters and flower
// boxes, an open coloured door, chimneys, bushes, mailboxes and street lamps —
// merged into a handful of draw calls. Walls, floor and roof take each
// resident's saved home colours.

// Static pieces built once and merged: each part is a box/shape geometry with
// a transform and a colour, written into one vertex-coloured mesh.
function mergeParts(parts){
  let count=0;
  const baked=parts.map(p=>{const g=p.geo.index?p.geo.toNonIndexed():p.geo.clone();p.geo.dispose();g.applyMatrix4(p.matrix);count+=g.attributes.position.count;return {g,color:p.color};});
  const pos=new Float32Array(count*3),nor=new Float32Array(count*3),col=new Float32Array(count*3);
  let o=0;const c=new THREE.Color();
  for(const {g,color} of baked){
    const n=g.attributes.position.count;pos.set(g.attributes.position.array,o*3);nor.set(g.attributes.normal.array,o*3);
    if(color){c.set(color);for(let i=0;i<n;i++)col.set([c.r,c.g,c.b],(o+i)*3);}
    o+=n;g.dispose();
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(nor,3));geo.setAttribute('color',new THREE.BufferAttribute(col,3));
  geo.computeBoundingSphere();return geo;
}
const q=new THREE.Quaternion(),e=new THREE.Euler(),one=new THREE.Vector3(1,1,1);
function part(geo,x,y,z,color,rx=0,ry=0,rz=0){return {geo,color,matrix:new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),q.setFromEuler(e.set(rx,ry,rz)),one)};}
const box=(w,h,d,x,y,z,color,rx,ry,rz)=>part(new THREE.BoxGeometry(w,h,d),x,y,z,color,rx,ry,rz);
const ball=(r,x,y,z,color,sy=1)=>{const g=new THREE.SphereGeometry(r,10,7);g.scale(1,sy,1);return part(g,x,y,z,color);};
const cyl=(r,h,x,y,z,color)=>part(new THREE.CylinderGeometry(r,r,h,10),x,y,z,color);
function gable(width,rise,depth,x,y,z,color){
  const s=new THREE.Shape();s.moveTo(-width/2,0);s.lineTo(width/2,0);s.lineTo(0,rise);s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:false});g.translate(0,0,-depth/2);return part(g,x,y,z,color);
}

// A painted wooden sign on posts, standing in the world like a real street
// sign, instead of a floating UI tag. The board's face is redrawn when a
// resident's pet or home changes.
function signBoard(width,height,posts,props,at){
  const canvas=document.createElement('canvas');canvas.width=Math.round(256*width/height);canvas.height=256;
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  const wood=new THREE.MeshStandardMaterial({color:'#9a6b45',roughness:.85}),face=new THREE.MeshStandardMaterial({map:texture,roughness:.8});
  const board=new THREE.Mesh(new THREE.BoxGeometry(width,height,.05),[wood,wood,wood,wood,face,face]);
  board.position.set(at.x,at.y+.95+height/2,at.z);board.castShadow=true;
  for(const x of posts)props.push(box(.07,.95+height,.07,at.x+x,at.y+(.95+height)/2,at.z-.04,'#8a5d3a'));
  function draw(title,sub){
    const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
    ctx.fillStyle='#fff3dd';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#c99a6a';ctx.lineWidth=14;ctx.strokeRect(7,7,w-14,h-14);
    ctx.fillStyle='#3b2e25';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font='800 92px ui-rounded,"Nunito","Trebuchet MS",system-ui,sans-serif';ctx.fillText(title,w/2,sub?h*.38:h/2,w-60);
    if(sub){ctx.fillStyle='#6e5d4f';ctx.font='700 58px ui-rounded,"Nunito","Trebuchet MS",system-ui,sans-serif';ctx.fillText(sub,w/2,h*.74,w-60);}
    texture.needsUpdate=true;
  }
  return {board,draw};
}

const DOORS=['#e27d6a','#3f8f8a','#e0b04a','#6f8fd0','#d49aa0','#7fae5a','#b0567a'];
const FLOWERS=['#f29fb7','#f6d25c','#ffffff','#b58ee0','#ef8a6a'];
const TRIM='#f5efe3',GROUND=-.82;

export function createNeighborhood(scene,world){
  world.addBoxes(neighborhoodBoxes);
  const group=new THREE.Group();group.name='Craepet street';scene.add(group);
  const props=[],glass=[],glow=[];
  const plain=color=>new THREE.MeshStandardMaterial({color,roughness:.9});
  function mesh(geo,material,{shadow=true}={}){const m=new THREE.Mesh(geo,material);m.castShadow=shadow;m.receiveShadow=true;group.add(m);return m;}
  // Street, pavement, curbs and a dashed centre line.
  const ground=neighborhoodBoxes.find(b=>b.name==='Neighborhood ground');
  mesh(new THREE.BoxGeometry(...ground.max.map((v,i)=>v-ground.min[i])),plain('#86ad55')).position.set(...ground.max.map((v,i)=>(v+ground.min[i])/2));
  props.push(box(47,.015,3,8,GROUND+.009,17.6,'#8c9392'),box(47,.02,1.5,8,GROUND+.019,20.25,'#e5dac4'));
  for(const z of [16.08,19.12])props.push(box(47,.06,.12,8,GROUND+.03,z,'#d9d4c9'));
  for(let x=-14;x<=30;x+=2.2)props.push(box(1.1,.004,.12,x,GROUND+.018,17.6,'#f3efe2'));
  const homes=new Map();
  lots.forEach((p,i)=>{
    const {x,z}=p,front=z-2.5,door=DOORS[i%DOORS.length];
    const walls=neighborhoodBoxes.filter(b=>b.name.startsWith(p.id+' ')&&!/ceiling/.test(b.name));
    // Outside walls from the collider boxes (one mesh per cottage, recoloured
    // by the resident's style), plus a slightly lit inner lining so a visit
    // reads as a warm room rather than a grey box.
    const outer=mergeParts(walls.map(b=>box(...b.max.map((v,k)=>v-b.min[k]+(k===1?.04:0)),...b.max.map((v,k)=>(v+b.min[k])/2+(k===1?.02:0)))));
    const wallMat=plain('#f0dbab'),lining=new THREE.MeshStandardMaterial({color:'#f0dbab',roughness:.95,emissive:'#f0dbab',emissiveIntensity:.22});
    mesh(outer,wallMat);
    mesh(mergeParts([box(4.42,2.5,.02,x,.43,z+2.41),box(.02,2.5,4.82,x-2.21,.43,z),box(.02,2.5,4.82,x+2.21,.43,z),
      box(1.6,2.5,.02,x-1.48,.43,front+.09),box(1.6,2.5,.02,x+1.48,.43,front+.09),box(1.2,.44,.02,x,1.46,front+.09),box(4.44,.02,4.84,x,1.7,z)]),lining,{shadow:false});
    const floorMat=plain('#ceaa7f'),roofMat=new THREE.MeshStandardMaterial({color:'#7c9b92',roughness:.8}),rugMat=plain(door);
    mesh(new THREE.BoxGeometry(4.44,.025,4.83),floorMat).position.set(x,GROUND+.024,z);
    const rug=mesh(new THREE.CylinderGeometry(1.05,1.05,.012,28),rugMat,{shadow:false});rug.position.set(x,GROUND+.043,z+.2);
    // Gabled roof: two sloped slabs with overhanging eaves, gable ends in the
    // wall colour, facing the street like a storybook cottage.
    const half=2.68,rise=1.45,run=Math.hypot(half,rise),pitch=Math.atan2(rise,half),eave=1.72;
    const roof=mergeParts([box(run+.14,.12,5.8,x-half/2,eave+rise/2+.04,z,null,0,0,pitch),box(run+.14,.12,5.8,x+half/2,eave+rise/2+.04,z,null,0,0,-pitch)]);
    mesh(roof,roofMat);
    const gables=mergeParts([gable(4.76,rise-.02,.12,x,eave,front+.02),gable(4.76,rise-.02,.12,x,eave,z+2.48)]);
    mesh(gables,wallMat);
    // Trim, frames, doorstep, foundation and chimney.
    const stone='#b9b1a4';props.push(box(4.9,.16,.12,x,GROUND+.07,z+2.62,stone),box(.12,.16,5.3,x-2.44,GROUND+.07,z,stone),box(.12,.16,5.3,x+2.44,GROUND+.07,z,stone),box(1.72,.16,.12,x-1.54,GROUND+.07,front-.11,stone),box(1.72,.16,.12,x+1.54,GROUND+.07,front-.11,stone));
    for(const sx of [-1,1])for(const sz of [-1,1])props.push(box(.1,2.56,.1,x+sx*2.36,.45,z+sz*2.56,TRIM));
    props.push(box(.1,2.12,.08,x-.62,GROUND+1.06,front-.07,TRIM),box(.1,2.12,.08,x+.62,GROUND+1.06,front-.07,TRIM),box(1.44,.12,.09,x,GROUND+2.14,front-.07,TRIM));
    props.push(box(1.3,.025,3.8,x,GROUND+.022,22.1,'#e2d6bd'));
    props.push(box(1.4,.08,.5,x,GROUND+.04,front-.3,'#c8bfb1'),box(.9,.012,.55,x,GROUND+.086,front-.32,'#a4724d'));
    props.push(box(.46,1.3,.46,x+1.25,2.75,z+1.3,'#b0674f'),box(.56,.1,.56,x+1.25,3.43,z+1.3,'#8e5340'));
    // The door stands open inwards; its colour runs through the shutters.
    const hinge=new THREE.Vector3(x-.58,GROUND+1.0,front+.1);
    props.push(box(.92,2.0,.05,hinge.x+.45*Math.cos(-1.4),hinge.y,hinge.z-.45*Math.sin(-1.4),door,0,-1.4,0));
    props.push(ball(.035,hinge.x+.8*Math.cos(-1.4)+.04,GROUND+.95,hinge.z-.8*Math.sin(-1.4),'#e9c46a'));
    for(const sx of [-1,1]){
      const wx=x+sx*1.48,wy=.6,wz=front-.09;
      glass.push(box(.72,.75,.02,wx,wy,front-.085));
      props.push(box(.84,.06,.05,wx,wy+.41,wz,TRIM),box(.84,.06,.05,wx,wy-.41,wz,TRIM),box(.06,.82,.05,wx-.41,wy,wz,TRIM),box(.06,.82,.05,wx+.41,wy,wz,TRIM),box(.04,.76,.04,wx,wy,wz-.01,TRIM),box(.74,.04,.04,wx,wy,wz-.01,TRIM));
      props.push(box(.3,.84,.04,wx-.6,wy,wz+.01,door),box(.3,.84,.04,wx+.6,wy,wz+.01,door));
      props.push(box(.86,.17,.2,wx,wy-.53,front-.17,'#9c6b45'));
      for(let f=0;f<5;f++)props.push(ball(.06,wx-.32+f*.16,wy-.4,front-.17,FLOWERS[(f+i)%FLOWERS.length]),ball(.05,wx-.26+f*.14,wy-.44,front-.12,'#6fa05a',.7));
      // Side windows.
      const sxw=x+sx*2.39;
      glass.push(box(.02,.75,.9,sxw,wy,z+.4));
      props.push(box(.05,.06,1.02,sxw+sx*.01,wy+.41,z+.4,TRIM),box(.05,.06,1.02,sxw+sx*.01,wy-.41,z+.4,TRIM),box(.05,.82,.06,sxw+sx*.01,wy,z-.1,TRIM),box(.05,.82,.06,sxw+sx*.01,wy,z+.9,TRIM));
      // Garden: a pair of round bushes either side of the path.
      props.push(ball(.42,x+sx*1.55,GROUND+.3,front-.75,'#5f9444',.8),ball(.32,x+sx*1.95,GROUND+.24,front-.55,'#7fae5a',.8),ball(.28,x+sx*1.2,GROUND+.2,front-.95,'#4f8a3e',.75));
    }
    // Mailbox by the path.
    props.push(box(.06,1.0,.06,x-.95,GROUND+.5,front-2.3,'#8a5d3a'),box(.34,.24,.46,x-.95,GROUND+1.1,front-2.3,door),box(.02,.12,.08,x-.77,GROUND+1.2,front-2.18,'#e05a4f'));
    const home={walls:[wallMat],lining,floor:floorMat,roof:roofMat,rug:rugMat,decor:new THREE.Group(),key:''};
    group.add(home.decor);
    home.sign=signBoard(1.2,.34,[-.45,.45],props,new THREE.Vector3(x+1.55,GROUND+.02,23.3));group.add(home.sign.board);home.sign.draw(p.name+"'s house");
    homes.set(p.id,home);
  });
  // A street lamp between every pair of cottages; the heads glow softly.
  for(let k=0;k<=lots.length;k++){const lx=lots[0].x-3+k*6;props.push(cyl(.05,2.7,lx,GROUND+1.35,21.1,'#3d4a4a'),box(.5,.05,.05,lx+.22,GROUND+2.65,21.1,'#3d4a4a'));glow.push(ball(.16,lx+.45,GROUND+2.52,21.1));}
  // Trees behind and between the cottages.
  for(let k=0;k<=lots.length;k++){const tx=lots[0].x-3+k*6,tz=30.6+(k%2)*.8;props.push(cyl(.09,1.8,tx,GROUND+.9,tz,'#6e5038'),ball(.9,tx,GROUND+2.3,tz,k%2?'#6e9f48':'#5f9444',.9),ball(.6,tx+.5,GROUND+1.9,tz+.2,'#7fae5a',.9));}
  const street=signBoard(2,.5,[-.85,.85],props,new THREE.Vector3(4.4,GROUND+.02,19.9));group.add(street.board);
  street.draw('Craepet Street →','Visit, decorate and give presents');
  mesh(mergeParts(props),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85}));
  mesh(mergeParts(glass),new THREE.MeshStandardMaterial({color:'#bfe3e8',roughness:.2,metalness:.1,emissive:'#fff2c8',emissiveIntensity:.18}),{shadow:false});
  mesh(mergeParts(glow),new THREE.MeshStandardMaterial({color:'#fff3cf',emissive:'#ffd98a',emissiveIntensity:1.2}),{shadow:false});
  return {update(residents){for(const p of residents){const h=homes.get(p.id);if(!h)continue;const key=JSON.stringify([p.pet?.name,p.home,p.house?.id,p.style,p.items?.map(i=>i.id)]);if(key===h.key)continue;h.key=key;
    const wall=p.style?.wall.a||'#f0dbab';h.walls.forEach(m=>m.color.set(wall));h.lining.color.set(wall);h.lining.emissive.set(wall);
    h.floor.color.set(p.style?.floor.a||'#ceaa7f');h.roof.color.set(p.style?.wall.b||'#7c9b92');
    [...h.decor.children].forEach(disposeCreature);
    // The resident's furniture stands along the walls, not in a showroom grid.
    const lot=lots.find(l=>l.id===p.id),spots=[];
    for(let k=0;k<5;k++)spots.push([lot.x-1.7+k*.85,lot.z+1.85,Math.PI]);
    for(let k=0;k<4;k++)spots.push([lot.x-1.75,lot.z-1.2+k*.85,Math.PI/2],[lot.x+1.75,lot.z-1.2+k*.85,-Math.PI/2]);
    (p.items||[]).slice(0,spots.length).forEach((it,k)=>{const m=furnishing(it,k);m.traverse(c=>{if(c.isSprite&&c.position.y>=.99)c.visible=false;});
      const [sx,sz,ry]=spots[k];m.scale.setScalar(.65);m.position.set(sx,GROUND+.03,sz);m.rotation.y=ry;h.decor.add(m);});
    if(p.pet)h.sign.draw(p.pet.name,p.home||lot.name+"'s house");else h.sign.draw(lot.name+"'s plot",'No saved pet yet');
  }}};
}
