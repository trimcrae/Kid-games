// House companions: the family's other pets and the valley's shopkeepers.
// Each has places that mean something in this house — its owner's bed and
// rug, Farmer Fen's vegetable bed, Mossbeard's desk, Dizzy's games rug — and
// a small routine there by day and a nap at night. They turn smoothly, look
// up and hop hello when you come over, shopkeepers say one of their real
// lines, and they step aside for your pet instead of being shoved. Nobody
// idles within 0.9 m of a room's arrival spot or activity station, so they
// never block the camera or the spot you walk up to. Pure logic (no Three),
// tested against the real walking world.
const TAU=Math.PI*2;
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Blender plan (x, y) -> Three (x, z = -y).
export const plan=(x,y)=>({x,z:-y});
export const KEEP_CLEAR=.9;

// The valley's shopkeepers, as in the 2D game (engine NPCS), each at the
// station they run. `view` picks their lines from lines.js NPC.
const straw='#e2c27a',ink='#2b2433';
export const HOSTS=[
  {id:'fen',name:'Farmer Fen',pet:{species:'snorbit',colour:'meadow'},room:'Back yard',view:'farm',
    extras:[{bone:'head',pos:[0,.86,0],size:[.33,.035,.29],color:straw},{bone:'head',pos:[0,.93,0],size:[.19,.1,.17],color:straw}]},
  {id:'dizzy',name:'Dizzy',pet:{species:'glimmr',colour:'bubble'},room:'Basement playroom',view:'games'},
  {id:'marigold',name:'Mrs Marigold',pet:{species:'blorb',colour:'sunbeam'},room:'Garage',view:'market',
    extras:[{bone:'torso',pos:[0,.30,.205],size:[.19,.2,.04],color:'#f4efe6'},{bone:'torso',pos:[0,.47,.19],size:[.2,.03,.05],color:'#e85f7d'}]},
  {id:'moss',name:'Mossbeard',pet:{species:'twiggle',colour:'cocoa',wear:{face:'glasses'}},room:"Mom & Dad's office",view:'well',
    extras:[{bone:'head',pos:[0,.5,.18],size:[.12,.09,.07],color:'#7fae5a'},{bone:'armR',pos:[.16,.33,.2],size:[.13,.09,.025],color:'#9b3d3d'}]},
  {id:'splish',name:'Splish',pet:{species:'puddlepop',colour:'sky'},room:'Sunroom',view:'pool'},
  {id:'penny',name:'Mr Pennyworth',pet:{species:'flarn',colour:'gold'},room:"Mom & Dad's office",view:'bank',
    extras:[{bone:'head',pos:[0,.86,0],size:[.25,.03,.22],color:ink},{bone:'head',pos:[0,.97,0],size:[.15,.12,.14],color:ink}]},
  {id:'rook',name:'Referee Rook',pet:{species:'zibbit',colour:'grape'},room:'Front yard',view:'arena',
    extras:[{bone:'torso',pos:[0,.45,.2],size:[.03,.03,.03],color:'#c0c6cc'},{bone:'torso',pos:[0,.36,.03],size:[.27,.04,.23],color:ink}]},
  {id:'quill',name:'Postmaster Quill',pet:{species:'glimmr',colour:'snow'},room:'Dining room',view:'quests',
    extras:[{bone:'torso',pos:[.22,.3,.06],size:[.1,.12,.07],color:'#8a5a34'}]},
];
// Places, by day and by night, in plan coordinates of the Blender house and
// its lived-in dressing (models/house/dressing.py). `up` hops onto the
// furniture top found there (a bed, a sofa seat, a chair); `act` is what
// they do there.
const s=(room,x,y,act,more={})=>({room,at:[x,y],act,...more});
export const ROUTINES={
  cory:{day:[s("Cory's bedroom",17.2,3.2,'play'),s("Cory's bedroom",16.9,1.9,'play')],night:[s("Cory's bedroom",16.74,.96,'nap',{up:true})]},
  kieran:{day:[s("Kieran's bedroom",12.85,2.45,'play'),s("Kieran's bedroom",13.3,2.6,'look')],night:[s("Kieran's bedroom",11.55,2.1,'nap',{up:true})]},
  ellie:{day:[s("Ellie's bedroom",10.25,6.83,'play'),s("Ellie's bedroom",8.4,6.1,'look')],night:[s("Ellie's bedroom",9.05,7.1,'nap',{up:true})]},
  jeannie:{day:[s("Jeannie's bedroom",13.85,7.1,'read'),s("Jeannie's bedroom",14.55,6.95,'read',{up:true})],night:[s("Jeannie's bedroom",15.9,6.9,'nap',{up:true})]},
  shannon:{day:[s('Living room',.64,2.13,'sit',{up:true}),s('Living room',2.35,2.3,'play')],night:[s("Mom & Dad's bedroom",14.25,5.45,'nap',{up:true})]},
  tristan:{day:[s('Living room',.63,2.96,'sit',{up:true}),s('Living room',1.9,1.8,'play')],night:[s("Mom & Dad's bedroom",15.0,5.45,'nap',{up:true})]},
  guest:{day:[s('Living room',2.35,2.3,'play')],night:[s('Living room',2.85,2.93,'nap',{up:true})]},
  fen:{day:[s('Back yard',7.5,15.7,'tend',{face:[6.15,15.75]}),s('Back yard',4.8,15.7,'tend',{face:[6.15,15.75]})],night:[s('Back yard',7.5,15.2,'nap')]},
  dizzy:{day:[s('Basement playroom',4.75,2.6,'play'),s('Basement playroom',2.6,3.0,'play')],night:[s('Basement playroom',2.6,3.0,'nap')]},
  marigold:{day:[s('Garage',-2.7,7.4,'stand',{face:[-1.39,7.62]}),s('Garage',-.4,3.7,'arrange',{face:[-.4,3.05]})],night:[s('Garage',-.4,3.7,'nap')]},
  moss:{day:[s("Mom & Dad's office",1.3,7.2,'read',{up:true,face:[2.96,7.43]})],night:[s("Mom & Dad's office",1.3,7.2,'nap',{up:true})]},
  splish:{day:[s('Sunroom',5.85,9.6,'play'),s('Sunroom',4.3,9.4,'look')],night:[s('Sunroom',5.85,9.6,'nap')]},
  penny:{day:[s("Mom & Dad's office",3.55,6.6,'stand',{face:[3.55,7.2]})],night:[s("Mom & Dad's office",3.55,6.6,'nap')]},
  rook:{day:[s('Front yard',7.6,-5.0,'play'),s('Front yard',5.4,-4.6,'look')],night:[s('Front yard',7.6,-5.0,'nap')]},
  quill:{day:[s('Dining room',6.6,6.7,'stand',{face:[6.8,7.4]})],night:[s('Dining room',6.6,6.7,'nap')]},
};
// The top of the furniture at a spot: the highest collision box containing
// it whose top is a pet's hop above the floor (a bed, a seat, a beanbag).
export function furnitureTop(colliders,x,z,floor){
  let top=null;
  for(const b of colliders){
    if(x<b.min[0]||x>b.max[0]||z<b.min[2]||z>b.max[2])continue;
    const t=b.max[1];if(t>floor+.12&&t<floor+.92&&b.min[1]<t-.02&&(top===null||t>top))top=t;
  }
  return top;
}
// Nearest free floor point to (x,z) on this floor, keeping `clear` metres
// from every point in `avoid` on the same floor.
export function freeSpot(world,x,z,floor,avoid=[],clear=KEEP_CLEAR,from=0){
  for(let r=from;r<=1.8;r+=.1){
    const n=r===0?1:Math.max(8,Math.round(r*40));
    for(let i=0;i<n;i++){
      const px=x+Math.cos(i/n*TAU)*r,pz=z+Math.sin(i/n*TAU)*r,f=world.floor(px,pz,floor);
      if(!Number.isFinite(f)||Math.abs(f-floor)>.35||world.blocked(px,pz,f))continue;
      if(avoid.some(a=>Math.abs(a.y-f)<.6&&Math.hypot(a.x-px,a.z-pz)<clear))continue;
      return {x:px,y:f,z:pz};
    }
  }
  return null;
}
// Turn a routine's plan places into real spots in this house.
export function resolveSpots(list,{world,colliders,rooms,avoid}){
  const out=[];
  for(const spec of list||[]){
    const room=rooms.find(r=>r[1]===spec.room);if(!room)continue;
    const floor=room[4],d=plan(...spec.at),look=spec.face?plan(...spec.face):null;
    const top=spec.up?furnitureTop(colliders,d.x,d.z,floor):null;
    if(top!==null){
      const stand=freeSpot(world,d.x,d.z,floor,avoid,.45,.2);
      // On a bed or a seat they face into the room (toward its station), not the wall.
      const room0=plan(room[2],room[3]);
      if(stand){out.push({room:spec.room,act:spec.act,up:true,x:d.x,y:top,z:d.z,stand,
        face:look?Math.atan2(look.x-d.x,look.z-d.z):Math.atan2(room0.x-d.x,room0.z-d.z)});continue;}
    }
    const p=freeSpot(world,d.x,d.z,floor,avoid);if(!p)continue;
    const target=look||(Math.hypot(p.x-d.x,p.z-d.z)>.15?d:null);
    out.push({room:spec.room,act:spec.act,up:false,x:p.x,y:p.y,z:p.z,stand:p,face:target?Math.atan2(target.x-p.x,target.z-p.z):null});
  }
  return out;
}

// One companion's life. `c` is created by createCompanion and carries its
// place in the world; update() moves it and returns what its body shows.
export function createCompanion({id,egg=false,host=null,day,night,start,random=Math.random}){
  const first=(day&&day[0])||(night&&night[0])||null;
  const at=start||first;
  const c={id,egg,host,day:day||[],night:night||[],spot:first,point:at?{x:at.x,y:at.y,z:at.z}:null,heading:first?.face??random()*TAU,
    face:null,mode:'at',t:0,dwell:20+random()*20,walking:false,speed:0,distance:0,greetIn:1+random()*2,sayIn:0,happy:0,hopNow:0,
    target:null,stuck:0,last:null,out:null,sleeping:false,up:!!first?.up,act:first?.act||'look',phase:random()*6,aside:null,say:null};
  if(c.up)c.standFrom={...first.stand};
  return c;
}
// ctx: {world, player, night, seen(point)->bool, random, reduced}
export function updateCompanion(c,dt,ctx){
  const {world,player,night=false,reduced=false,random=Math.random}=ctx;
  const seen=ctx.seen?ctx.seen(c.point):true;
  c.t+=dt;c.dwell-=dt;c.greetIn-=dt;c.sayIn-=dt;c.happy=Math.max(0,c.happy-dt);c.say=null;
  const out={expression:'idle',pose:{},look:[0,0],hop:0,emote:null};
  const gap=Math.hypot(c.point.x-player.x,c.point.z-player.z),sameFloor=Math.abs(c.point.y-player.y)<(c.up?1:.6);
  const toPlayer=wrap(Math.atan2(player.x-c.point.x,player.z-c.point.z)-c.heading);
  // An unhatched egg waits where it was laid: it only wobbles.
  if(c.egg){c.walking=false;c.speed=0;c.out=out;return {out,gap};}
  // Which list of places applies now; pick a new place when the time comes.
  const list=(night&&c.night.length?c.night:c.day);
  const visiting=c.spot?.temp&&c.t<c.spot.until;
  if(!visiting&&(!list.includes(c.spot)||(!night&&c.dwell<=0&&list.length>1&&c.mode==='at'))){
    const choices=list.filter(p=>p!==c.spot);const next=choices.length?choices[Math.floor(random()*choices.length)]:list[0];
    c.dwell=25+random()*25;
    if(next&&next!==c.spot){c.spot=next;goTo(c,next,seen);}
  }
  const spot=c.spot;
  // Make room for your pet: two smooth steps away rather than a shove.
  // (A pet that came over to greet you stands close on purpose.)
  if(!c.up&&sameFloor&&gap<(c.spot?.temp?.45:.7)&&c.mode!=='aside'&&c.mode!=='hop'){
    const away=Math.atan2(c.point.x-player.x,c.point.z-player.z);
    c.aside={angle:away,left:Math.max(.25,1-gap),back:3};c.mode='aside';
  }
  if(c.mode==='aside'){
    const step=Math.min(c.aside.left,1.3*dt),before={...c.point};
    world.move(c.point,Math.sin(c.aside.angle)*step,Math.cos(c.aside.angle)*step);
    const moved=Math.hypot(c.point.x-before.x,c.point.z-before.z);c.distance+=moved;
    c.aside.left-=step;c.face=c.aside.angle;c.walking=moved>1e-4;c.speed=moved/Math.max(dt,1e-4);
    if(c.aside.left<=0||moved<step*.3){c.aside.back-=dt;c.walking=false;c.face=Math.atan2(player.x-c.point.x,player.z-c.point.z);
      // Then back to its place once you've moved off, or it just stays here and watches you.
      if(c.aside.back<=0){if(gap>1.2&&spot)goTo(c,spot,seen);else{c.mode='at';c.aside=null;}}}
  }else if(c.mode==='travel'){
    const tgt=c.target,dx=tgt.x-c.point.x,dz=tgt.z-c.point.z,d=Math.hypot(dx,dz);
    if(!seen&&(d>.1||Math.abs(tgt.y-c.point.y)>.3)){Object.assign(c.point,tgt);arrive(c);}
    else if(d<.06){arrive(c);}
    else{
      const pace=c.spot?.temp?1.1:.55,step=Math.min(d,pace*dt),before={...c.point};world.move(c.point,dx/d*step,dz/d*step);
      const moved=Math.hypot(c.point.x-before.x,c.point.z-before.z);c.distance+=moved;c.walking=true;c.speed=pace;c.face=Math.atan2(dx,dz);
      c.stuck=moved<step*.3?c.stuck+dt:0;
      if(c.stuck>.8){c.stuck=0;if(!seen){Object.assign(c.point,tgt);arrive(c);}else{c.mode='at';c.walking=false;c.dwell=4;}}
    }
  }else if(c.mode==='hop'){
    // Up onto (or down from) a bed, a seat or a chair in a short arc.
    const h=c.hop;h.t=Math.min(1,h.t+dt/(reduced?.01:.45));
    const k=h.t*h.t*(3-2*h.t);c.point.x=h.from.x+(h.to.x-h.from.x)*k;c.point.z=h.from.z+(h.to.z-h.from.z)*k;
    c.point.y=h.from.y+(h.to.y-h.from.y)*k+(reduced?0:Math.sin(Math.PI*h.t)*.12);c.walking=false;
    if(h.t>=1){c.up=h.up;c.mode=h.then||'at';if(c.mode==='travel'&&!c.target)c.mode='at';}
  }else{
    c.walking=false;c.speed=0;
    if(spot&&c.mode!=='at')c.mode='at';
    if(spot?.face!=null&&c.mode==='at')c.face=spot.face;
  }
  // What the body shows at its place.
  const act=c.mode==='at'?(spot?.act||'look'):c.mode;
  const napping=act==='nap';c.sleeping=napping;
  if(napping){out.expression='sleep';out.pose={lie:1};out.emote='zz';}
  else if(c.mode==='at'){
    c.phase+=dt;
    if(act==='tend'){const dig=(c.phase%4.5)<3;out.pose=dig?{sniff:1}:{};out.look=dig?[0,-.2]:[Math.sin(c.phase)*.5,.1];}
    else if(act==='read'){out.pose={sit:.8};out.look=[0,-.35];}
    else if(act==='sit'){out.pose={sit:1};}
    else if(act==='play'){if(!reduced&&(c.phase%3.2)<dt*1.5)out.hop=.55;out.look=[Math.sin(c.phase*1.2)*.7,.05];if((c.phase%6.4)<1.2)out.expression='happy';}
    else if(act==='arrange'){const turned=(c.phase%6)<3;c.face=turned&&spot.face!=null?spot.face:(spot.face??0)+Math.PI;out.pose={sniff:turned?.6:0};}
    else out.look=reduced?[.5,0]:[Math.sin(c.phase*.8)*.8,Math.sin(c.phase*.5)*.08];
    // Notice you: look up, and a hello hop the first time you come over.
    if(sameFloor&&gap<3){
      if(Math.abs(toPlayer)<1.1)out.look=[clamp(toPlayer,-1.1,1.1),.15];
      else if(!c.up&&act!=='tend'&&act!=='read')c.face=Math.atan2(player.x-c.point.x,player.z-c.point.z)-Math.sign(toPlayer)*.5;
      if(gap<2.4&&c.greetIn<=0){c.greetIn=30;c.happy=1.8;out.hop=reduced?0:(c.up?.4:1);
        if(c.host&&c.sayIn<=0){c.sayIn=25;c.say=c.host;}
        if(!c.up)c.face=Math.atan2(player.x-c.point.x,player.z-c.point.z);}
    }
    if(c.happy>0){out.expression='happy';out.emote='heart';}
  }
  // Turn smoothly toward where it wants to face (never a one-frame flip).
  if(c.face!=null){const d=wrap(c.face-c.heading);c.heading+=reduced?d:clamp(d,-6*dt,6*dt);}
  c.out=out;
  return {out,gap};
}
function goTo(c,spot,seen){
  c.target=spot.up?spot.stand:{x:spot.x,y:spot.y,z:spot.z};c.stuck=0;
  if(!seen){ // nobody's looking: just be there
    Object.assign(c.point,spot.up?{x:spot.x,y:spot.y,z:spot.z}:c.target);c.up=!!spot.up;c.standFrom=spot.up?{...spot.stand}:null;
    c.mode='at';if(spot.face!=null)c.face=spot.face;return;
  }
  if(c.up&&c.standFrom){c.mode='hop';c.hop={t:0,from:{...c.point},to:{...c.standFrom},up:false,then:'travel'};return;}
  c.mode='travel';
}
function arrive(c){
  const spot=c.spot;c.walking=false;c.speed=0;
  if(spot&&spot.up&&!c.up){c.mode='hop';c.standFrom={...spot.stand};c.hop={t:0,from:{...c.point},to:{x:spot.x,y:spot.y,z:spot.z},up:true,then:'at'};return;}
  c.mode='at';if(spot?.face!=null)c.face=spot.face;
}// You just arrived in its room and it can't be seen from where you stand:
// it trots over to say hello at point (in front of you) and stays a few
// seconds before going back to what it was doing. Sleepers stay asleep.
export function callOver(c,point,seconds=9){
  if(c.egg||c.sleeping||!point)return false;
  const spot={room:c.spot?.room,act:'look',up:false,x:point.x,y:point.y,z:point.z,stand:{...point},face:point.face??null,temp:true,until:c.t+seconds};
  c.spot=spot;c.greetIn=0;goTo(c,spot,true);return true;
}
// Is a point on screen-relevant ground for the player: the same floor and
// near enough to be seen (companions elsewhere move without walking).
export function seenFrom(player,point,range=9){return Math.abs(point.y-player.y)<1.1&&Math.hypot(point.x-player.x,point.z-player.z)<range;}

// Is the segment from the camera to a point clear of every collision box?
// Name pills and bubbles draw over door frames (no depth test), so they are
// shown only when their anchor is in plain sight. `stop` leaves the last bit
// of the way (the companion's own bed or seat) out of the test.
export function lineOfSight(boxes,a,b,stop=.9){
  const d=[b.x-a.x,b.y-a.y,b.z-a.z],o=[a.x,a.y,a.z];
  for(const box of boxes){
    // A box the camera itself sits in (a coarse furniture or trim box) can't hide anything.
    if(a.x>=box.min[0]&&a.x<=box.max[0]&&a.y>=box.min[1]&&a.y<=box.max[1]&&a.z>=box.min[2]&&a.z<=box.max[2])continue;
    let near=0,far=stop,hit=true;
    for(let i=0;i<3;i++){
      if(Math.abs(d[i])<1e-9){if(o[i]<box.min[i]||o[i]>box.max[i]){hit=false;break;}continue;}
      let t1=(box.min[i]-o[i])/d[i],t2=(box.max[i]-o[i])/d[i];if(t1>t2)[t1,t2]=[t2,t1];
      near=Math.max(near,t1);far=Math.min(far,t2);if(near>far){hit=false;break;}
    }
    if(hit&&far>0)return false;
  }
  return true;
}