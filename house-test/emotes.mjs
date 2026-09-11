import * as THREE from './vendor/three.module.min.js';

// A small cream thought bubble over a pet's head that says how it feels —
// "z z" asleep, a bowl when hungry, dust when grubby, a heart when happy.
// Drawn in code on a canvas; one sprite, one draw call, only while shown.
// It lives in the scene, not on the pet, so it never changes the pet's size.
const GLYPHS={zz:['z z','#5b8fd6','bold 46px ui-rounded, system-ui'],food:['🍽️','#000','44px system-ui'],heart:['♥','#e8546f','bold 64px system-ui'],dust:['dust','#8a7a6a',''],note:['♪','#7a5cc8','bold 60px system-ui'],sparkle:['✨','#000','52px system-ui']};
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
  // Drawn over the scene (never cut by a door frame); callers show it only in plain sight.
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,depthWrite:false,depthTest:false,sizeAttenuation:false,opacity:0,fog:false,toneMapped:false}));
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

// A shopkeeper's line in a cream speech bubble over their head: one at a
// time, a few seconds, constant size on screen, wrapped to a short width.
export function createSpeech(scene){
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,depthWrite:false,depthTest:false,sizeAttenuation:false,opacity:0,fog:false,toneMapped:false}));
  sprite.center.set(.5,0);sprite.renderOrder=4;sprite.visible=false;sprite.name='host speech';scene.add(sprite);
  let left=0,texture=null,anchor=null,opacity=0,text='';
  function draw(words){
    const c=document.createElement('canvas'),g=c.getContext('2d'),font='600 30px ui-rounded,"Nunito","Trebuchet MS",system-ui,sans-serif';g.font=font;
    const lines=[];let line='';for(const w of words.split(' ')){const tryLine=line?line+' '+w:w;if(g.measureText(tryLine).width>440&&line){lines.push(line);line=w;}else line=tryLine;}lines.push(line);
    const w=Math.ceil(Math.max(...lines.map(l=>g.measureText(l).width)))+56,h=lines.length*38+34;c.width=w;c.height=h+22;
    g.font=font;g.fillStyle='#fff8ec';g.strokeStyle='#e8dcc8';g.lineWidth=5;g.beginPath();g.roundRect(3,3,w-6,h-6,24);g.fill();g.stroke();
    g.beginPath();g.moveTo(w/2-14,h-5);g.lineTo(w/2,h+18);g.lineTo(w/2+14,h-5);g.closePath();g.fill();g.stroke();g.fillRect(w/2-12,h-10,24,8);
    g.fillStyle='#3b2e25';g.textAlign='center';g.textBaseline='middle';lines.forEach((l,i)=>g.fillText(l,w/2,20+19+i*38));
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return {t,aspect:c.width/c.height,lines:c.height/38};
  }
  return {
    say(words,at,seconds=4.5){text=words;texture?.t.dispose();texture=draw(words);sprite.material.map=texture.t;sprite.material.needsUpdate=true;
      const hgt=.03*texture.lines;sprite.scale.set(hgt*texture.aspect,hgt,1);left=seconds;anchor=at;},
    update(dt,at,visible=true,reduced=false){
      if(at)anchor=at;left-=dt;const want=left>0&&visible?1:0;opacity=reduced?want:opacity+(want-opacity)*(1-Math.exp(-dt*9));
      sprite.material.opacity=opacity;sprite.visible=opacity>.02;if(anchor)sprite.position.set(anchor.x,anchor.y+.1,anchor.z);
    },
    get text(){return left>0?text:null;},
    dispose(){texture?.t.dispose();sprite.material.dispose();sprite.removeFromParent();},
  };
}