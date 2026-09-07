import * as THREE from './vendor/three.module.min.js';
import {lots,neighborhoodBoxes} from './neighborhood-layout.mjs';
import {labelSprite,disposeCreature} from './creatures.mjs';
import {furnishing} from './furnishings.mjs';
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
    home.label=labelSprite(p.name+"'s Craepet house");home.label.position.set(p.x,2,23.85);group.add(home.label);
  }
  const sign=labelSprite('Craepet street → · Visit, decorate & give presents');sign.scale.set(4.8,.72,1);sign.position.set(8,1.15,20.4);group.add(sign);
  return {update(residents){for(const p of residents){const h=homes.get(p.id);if(!h)continue;const key=JSON.stringify([p.pet?.name,p.home,p.house?.id,p.style,p.items?.map(i=>i.id)]);if(key===h.key)continue;h.key=key;
    h.walls.forEach(m=>m.material.color.set(p.style?.wall.a||'#dbd8ce'));h.floor.material.color.set(p.style?.floor.a||'#ceaa7f');h.roof.material.color.set(p.style?.wall.b||'#7c9b92');
    [...h.decor.children].forEach(disposeCreature);
    const lot=lots.find(l=>l.id===p.id);(p.items||[]).slice(0,24).forEach((it,i)=>{const m=furnishing(it,i);m.scale.setScalar(.65);m.position.set(lot.x-1.5+i%4, -.78+Math.floor(i/8)*.6,lot.z+.5+Math.floor(i%8/4));h.decor.add(m);});
    disposeCreature(h.label);h.label=labelSprite(p.pet?`${p.pet.name} · ${p.home}`:`${lot.name}'s plot · No saved pet`);h.label.scale.set(3.5,.5,1);h.label.position.set(lot.x,2,23.85);group.add(h.label);
  }}};
}
