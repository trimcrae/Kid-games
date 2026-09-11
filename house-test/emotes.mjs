import * as THREE from './vendor/three.module.min.js';

// A small cream thought bubble over a pet's head that says how it feels —
// "z z" asleep, a bowl when hungry, dust when grubby, a heart when happy.
// Drawn in code on a canvas; one sprite, one draw call, only while shown.
// It lives in the scene, not on the pet, so it never changes the pet's size.
const GLYPHS={zz:['z z','#5b8fd6','bold 46px ui-rounded, system-ui'],food:['🍽️','#000','44px system-ui'],heart:['♥','#e8546f','bold 64px system-ui'],dust:['dust','#8a7a6a',''],note:['♪','#7a5cc8','bold 60px system-ui']};
function bubble(name){
  const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
  g.fillStyle='#fff8ec';g.strokeStyle='#e8dcc8';g.lineWidth=6;
  g.beginPath();g.arc(64,58,50,0,Math.PI*2);g.fill();g.stroke();
  g.beginPath();g.arc(38,112,9,0,Math.PI*2);g.fill();g.stroke();
  const [text,color,font]=GLYPHS[name];
  if(name==='dust'){g.fillStyle=color;for(const [x,y,r] of [[44,66,13],[64,52,16],[84,66,12],[70,74,9]]){g.globalAlpha=.75;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();}g.globalAlpha=1;}
  else{g.fillStyle=color;g.font=font;g.textAlign='center';g.textBaseline='middle';g.fillText(text,64,62);}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
export function createEmotes(scene){
  const textures={};let current=null,opacity=0;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,depthWrite:false,sizeAttenuation:false,opacity:0}));
  sprite.scale.set(.066,.066,1);sprite.visible=false;sprite.renderOrder=3;sprite.name='pet emote';scene.add(sprite);
  return {
    // name: a GLYPHS key or null; at: world position of the head top.
    update(dt,name,at,visible=true,reduced=false){
      if(name&&GLYPHS[name]&&name!==current){current=name;textures[name]??=bubble(name);sprite.material.map=textures[name];sprite.material.needsUpdate=true;}
      const want=name&&visible?1:0;opacity=reduced?want:opacity+(want-opacity)*(1-Math.exp(-dt*8));
      if(!name&&opacity<.02)current=null;
      sprite.material.opacity=opacity;sprite.visible=opacity>.02&&!!current;
      if(at)sprite.position.set(at.x+.12,at.y+.12+(reduced?0:Math.sin(performance.now()/500)*.015),at.z);
    },
    get showing(){return sprite.visible?current:null;},
    dispose(){Object.values(textures).forEach(t=>t.dispose());sprite.material.dispose();sprite.removeFromParent();},
  };
}
