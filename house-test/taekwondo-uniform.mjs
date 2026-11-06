import * as THREE from './vendor/three.module.min.js';
import {inKim} from './master-kim-layout.mjs?v=20261103-studio-life';
export const BELTS={white:'#f3edda',yellow:'#e8c542',green:'#397956',blue:'#356ba6',red:'#bd4d42',black:'#25282c'};
const box=new THREE.BoxGeometry(1,1,1),jacket=new THREE.CylinderGeometry(.28,.30,.44,20),belt=new THREE.CylinderGeometry(.306,.306,.062,20,1,true);
export const studioKey=id=>'craepets.house.master-kim.'+id;
const blankStudio=()=>({uniform:false,belt:'white',signedIn:null});
function loadStudio(id,storage){
  const raw=storage.getItem(studioKey(id));
  if(raw===null)return blankStudio();
  const p=JSON.parse(raw);
  if(!p||typeof p!=='object'||Array.isArray(p)||
    (p.uniform!==undefined&&typeof p.uniform!=='boolean')||
    (p.belt!==undefined&&!Object.hasOwn(BELTS,p.belt))||
    (p.signedIn!==undefined&&p.signedIn!==null&&typeof p.signedIn!=='string')){
    throw Error('Saved practice choices could not be read safely');
  }
  return {uniform:p.uniform===true,belt:p.belt??'white',signedIn:p.signedIn??null};
}
export function readStudio(id,storage){
  try{return loadStudio(id,storage??globalThis.localStorage);}catch{return blankStudio();}
}
export function saveStudio(id,patch,storage){
  storage??=globalThis.localStorage;
  // Rendering can fall back to ordinary clothes, but saving must not turn a
  // failed read or damaged record into a new profile and erase its old bytes.
  const p={...loadStudio(id,storage),...patch};
  if(!Object.hasOwn(BELTS,p.belt))p.belt='white';
  storage.setItem(studioKey(id),JSON.stringify(p));return p;
}
export function uniformFor(id,position,pet,storage){if(!pet||pet.egg||!inKim(position))return null;const s=readStudio(id,storage);return s.uniform?{jacket:'#eeeade',belt:s.belt}:null;}
// These cloth pieces join the creature's existing skinned mesh and skeleton.
// The player's saved wardrobe is never changed. Sleeves and trouser legs move
// on the same bones as the paws, including all playable species.
export function dobokParts(style){
  if(!style)return [];
  const color=style.jacket||'#eeeade',b=Object.hasOwn(BELTS,style.belt)?BELTS[style.belt]:BELTS.white,trim=color==='#b63f3d'?'#262b30':'#c9c5ba';
  const parts=[{bone:'torso',pos:[0,.36,0],size:[1,1,.86],shape:jacket,color},
    {bone:'torso',pos:[0,.278,0],size:[1,1,.86],shape:belt,color:b},
    {bone:'torso',pos:[0,.278,.277],size:[.078,.055,.045],shape:box,color:b}];
  for(const side of [-1,1]){
    parts.push({bone:'torso',pos:[side*.033,.195,.279],size:[.030,.15,.018],shape:box,rot:[0,0,side*.15],color:b});
    parts.push({bone:'torso',pos:[side*.058,.458,.253],size:[.028,.195,.027],shape:box,rot:[0,0,-side*.57],color:trim});
    parts.push({bone:side<0?'armL':'armR',pos:[side*.276,.421,.015],size:[.119,.16,.125],rot:[0,0,side*.24],color});
    parts.push({bone:side<0?'legL':'legR',pos:[side*.16,.135,.065],size:[.118,.115,.125],color});
  }
  return parts;
}
