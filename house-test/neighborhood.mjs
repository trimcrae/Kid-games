import * as THREE from './vendor/three.module.min.js';
import {lots,neighborhoodBoxes} from './neighborhood-layout.mjs';
import {disposeCreature} from './creatures.mjs';
import {furnishing} from './furnishings.mjs';
// A painted wooden sign on posts, standing in the world like a real street
// sign, instead of a floating UI tag. The board's face is redrawn when a
// resident's pet or home changes.
function signBoard(width,height,posts){
  const group=new THREE.Group(),wood=new THREE.MeshStandardMaterial({color:'#9a6b45',roughness:.85});
  const canvas=document.createElement('canvas');canvas.width=Math.round(256*width/height);canvas.height=256;
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  const face=new THREE.MeshStandardMaterial({map:texture,roughness:.8});
  const board=new THREE.Mesh(new THREE.BoxGeometry(width,height,.05),[wood,wood,wood,wood,face,face]);board.position.y=.95+height/2;board.castShadow=true;group.add(board);
  for(const x of posts){const post=new THREE.Mesh(new THREE.BoxGeometry(.07,.95+height,.07),wood);post.position.set(x,(.95+height)/2,-.04);post.castShadow=true;group.add(post);}
  function draw(title,sub){
    const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
    ctx.fillStyle='#fff3dd';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#c99a6a';ctx.lineWidth=14;ctx.strokeRect(7,7,w-14,h-14);
    ctx.fillStyle='#3b2e25';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font='800 92px ui-rounded,"Nunito","Trebuchet MS",system-ui,sans-serif';ctx.fillText(title,w/2,sub?h*.38:h/2,w-60);
    if(sub){ctx.fillStyle='#6e5d4f';ctx.font='700 58px ui-rounded,"Nunito","Trebuchet MS",system-ui,sans-serif';ctx.fillText(sub,w/2,h*.74,w-60);}
    texture.needsUpdate=true;
  }
  return {group,draw};
}
export function createNeighborhood(scene,world){
  world.addBoxes(neighborhoodBoxes);
  const group=new THREE.Group();scene.add(group);const homes=new Map();
  function block(w,h,d,x,y,z,color){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.9}));m.position.set(x,y,z);group.add(m);return m;}
  for(const b of neighborhoodBoxes){const size=b.max.map((v,i)=>v-b.min[i]),center=b.max.map((v,i)=>(v+b.min[i])/2);const m=block(...size,...center,b.name==='Neighborhood ground'?'#84a56c':'#f0dbab');const id=b.name.split(' ')[0];if(!homes.has(id))homes.set(id,{walls:[],decor:new THREE.Group(),key:''});homes.get(id).walls.push(m);}
  block(47,.015,3,8,-.811,17.6,'#8a9290');block(47,.02,1.5,8,-.801,20.25,'#e2d6bd');
  for(const p of lots){
    const home=homes.get(p.id);group.add(home.decor);
    block(1.3,.025,3.8,p.x,-.798,22.1,'#e2d6bd');
    home.floor=block(4.44,.025,4.83,p.x,-.796,p.z,'#ceaa7f');
    // Open front door, a broad roof and bright windows make the plots readable.
    const roof=new THREE.Mesh(new THREE.ConeGeometry(3.65,1.5,4),new THREE.MeshStandardMaterial({color:'#7c9b92'}));roof.rotation.y=Math.PI/4;roof.position.set(p.x,2.5,p.z);group.add(roof);home.roof=roof;
    for(const side of [-1,1])block(.72,.75,.035,p.x+side*1.48,.6,23.895,'#b7e4e4');
    // A name sign by the garden path, facing the street.
    home.sign=signBoard(1.2,.34,[-.45,.45]);home.sign.group.position.set(p.x+1.55,-.8,23.3);group.add(home.sign.group);
    home.sign.draw(p.name+"'s house");
  }
  const street=signBoard(2,.5,[-.85,.85]);street.group.position.set(4.4,-.8,19.9);group.add(street.group);
  street.draw('Craepet Street →','Visit, decorate and give presents');
  return {update(residents){for(const p of residents){const h=homes.get(p.id);if(!h)continue;const key=JSON.stringify([p.pet?.name,p.home,p.house?.id,p.style,p.items?.map(i=>i.id)]);if(key===h.key)continue;h.key=key;
    h.walls.forEach(m=>m.material.color.set(p.style?.wall.a||'#dbd8ce'));h.floor.material.color.set(p.style?.floor.a||'#ceaa7f');h.roof.material.color.set(p.style?.wall.b||'#7c9b92');
    [...h.decor.children].forEach(disposeCreature);
    const lot=lots.find(l=>l.id===p.id);(p.items||[]).slice(0,24).forEach((it,i)=>{const m=furnishing(it,i);m.scale.setScalar(.65);m.position.set(lot.x-1.5+i%4, -.78+Math.floor(i/8)*.6,lot.z+.5+Math.floor(i%8/4));h.decor.add(m);});
    if(p.pet)h.sign.draw(p.pet.name,p.home||lot.name+"'s house");else h.sign.draw(lot.name+"'s plot",'No saved pet yet');
  }}};
}
