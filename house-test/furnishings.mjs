import * as THREE from './vendor/three.module.min.js';
import {labelSprite} from './creatures.mjs';
// Pet-sized furniture displayed in the living-room collection. The original
// item IDs, ownership, storage, home capacities and bonuses stay in the engine.
export function furnishing(item,index,{label:named=true}={}){
  const root=new THREE.Group(),id=(item.id+' '+item.name).toLowerCase();
  const wood=new THREE.MeshStandardMaterial({color:'#b8834f',roughness:.9});
  const fabric=new THREE.MeshStandardMaterial({color:['#84bca6','#b6a2dc','#e7a0ab','#e2c887'][index%4],roughness:1});
  function box(x,y,z,w,h,d,mat=wood){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);root.add(m);return m;}
  function ball(x,y,z,r,mat=fabric){const m=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),mat);m.position.set(x,y,z);root.add(m);return m;}
  if(/bed|sofa|couch|cushion|pillow/.test(id)){
    box(0,.16,0,.8,.18,.52);box(0,.28,0,.75,.12,.48,fabric);box(0,.46,-.22,.8,.36,.09,fabric);ball(-.24,.38,.05,.12);ball(.24,.38,.05,.12);
  }else if(/plant|flower|tree|fern|bonsai/.test(id)){
    box(0,.16,0,.3,.3,.3);box(0,.45,0,.04,.4,.04);const leaf=new THREE.MeshStandardMaterial({color:'#69ac71'});ball(0,.65,0,.24,leaf);ball(-.15,.48,0,.17,leaf);ball(.16,.5,.05,.17,leaf);
  }else if(/lamp|light|lantern|candle/.test(id)){
    box(0,.04,0,.32,.06,.32);box(0,.38,0,.04,.7,.04);const shade=new THREE.Mesh(new THREE.ConeGeometry(.23,.32,16),new THREE.MeshStandardMaterial({color:'#ffe9a9',emissive:'#8f6d28',emissiveIntensity:.3}));shade.position.y=.77;root.add(shade);
  }else if(/rug|mat|carpet/.test(id)){
    box(0,.025,0,.85,.035,.65,fabric);box(0,.048,0,.66,.015,.46);
  }else if(/shelf|book|desk|table/.test(id)){
    box(0,.45,0,.75,.08,.38);for(const x of [-.3,.3])box(x,.23,0,.07,.44,.32);for(let j=0;j<5;j++)box(-.23+j*.11,.64,0,.08,.30,.22,j%2?wood:fabric);
  }else if(item.hang||/poster|picture|clock|map|painting/.test(id)){
    box(0,.46,0,.65,.57,.045);const picture=labelSprite(named?item.emoji+' '+item.name:item.emoji||'🖼️');picture.position.set(0,.46,.03);picture.scale.set(.60,.40,1);root.add(picture);box(0,.1,0,.06,.2,.06);
  }else{
    box(0,.12,0,.55,.22,.40,fabric);ball(0,.37,0,.2);ball(-.2,.27,.10,.09);ball(.2,.27,.10,.09);
  }
  // In the house the pieces stand where they belong, without name tags.
  if(named){const label=labelSprite(item.emoji+' '+item.name);label.scale.set(.85,.16,1);label.position.y=1;root.add(label);}
  return root;
}
