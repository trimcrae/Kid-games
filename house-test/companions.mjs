// House companions: the family's other pets, and only theirs (the valley's
// shopkeepers stay in their own games). Each has places that mean something
// in this house — its owner's bed and rug, the living-room sofa — and a small
// routine there by day and a nap at night. They walk a real route round the
// furniture between them, turn smoothly, look up and hop hello when you come
// over, and step aside for your pet instead of being shoved. Nobody idles
// within 0.9 m of a room's arrival spot or activity station, so they never
// block the camera or the spot you walk up to. Pure logic (no Three), tested
// against the real walking world.
import {routeSearch,walkable} from './route-search.mjs?v=20260915-arrows';
import {easeRoute} from './route-ease.mjs';
const TAU=Math.PI*2;
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
// Blender plan (x, y) -> Three (x, z = -y).
export const plan=(x,y)=>({x,z:-y});
export const KEEP_CLEAR=.9;

// Who can live here as a companion: a family profile (the game's D.PROFILES)
// with its own adopted pet. The Visitor ('guest') plays as themselves but is
// a guest, not family, so their pet never moves in when someone else plays.
export const isFamily=id=>!!id&&id!=='guest';
// Places, by day and by night, in plan coordinates of the Blender house and
// its lived-in dressing (models/house/dressing.py), for each family member.
// `up` hops onto the furniture top found there (a bed, a sofa seat, a chair);
// `act` is what they do there.
const s=(room,x,y,act,more={})=>({room,at:[x,y],act,...more});
export const ROUTINES={
  cory:{day:[s("Cory's bedroom",17.2,3.2,'play'),s("Cory's bedroom",16.9,1.9,'play')],night:[s("Cory's bedroom",16.74,.96,'nap',{up:true})]},
  kieran:{day:[s("Kieran's bedroom",12.85,2.45,'play'),s("Kieran's bedroom",13.3,2.6,'look')],night:[s("Kieran's bedroom",11.55,2.1,'nap',{up:true})]},
  ellie:{day:[s("Ellie's bedroom",10.25,6.83,'play'),s("Ellie's bedroom",8.4,6.1,'look')],night:[s("Ellie's bedroom",9.05,7.1,'nap',{up:true})]},
  jeannie:{day:[s("Jeannie's bedroom",13.85,7.1,'read'),s("Jeannie's bedroom",14.55,6.95,'read',{up:true})],night:[s("Jeannie's bedroom",15.9,6.9,'nap',{up:true})]},
  shannon:{day:[s('Living room',.64,2.13,'sit',{up:true}),s('Living room',2.35,2.3,'play')],night:[s("Mom & Dad's bedroom",14.25,5.45,'nap',{up:true})]},
  tristan:{day:[s('Living room',.63,2.96,'sit',{up:true}),s('Living room',1.9,1.8,'play')],night:[s("Mom & Dad's bedroom",15.0,5.45,'nap',{up:true})]},
  // The house cats. By day they sit side by side on the mat at the sunroom's
  // back door watching the garden (as in the photo), or potter about — Bubba
  // to the kitchen window, Beebs up on a sunroom wicker chair; at night Bubba
  // curls up at the foot of the big bed and Beebs at the foot of Cory's.
  bubba:{day:[s('Sunroom',4.30,11.0,'sit',{face:[4.4,15]}),s('Kitchen',1.0,7.0,'look',{face:[.2,7.2]})],night:[s("Mom & Dad's bedroom",14.2,6.3,'nap',{up:true})]},
  beebs:{day:[s('Sunroom',4.95,11.0,'sit',{face:[4.9,15]}),s('Sunroom',6.7,9.67,'sit',{up:true})],night:[s("Cory's bedroom",17.3,1.1,'nap',{up:true})]},
};
// Bubba and Beebs live here whoever is playing: real cats, not Craepets, so
// they have no save slot, no owner and no egg — a coat colour and a name.
export const HOUSE_CATS=[
  {id:'bubba',name:'Bubba',pet:{species:'cat',name:'Bubba'},palette:{body:'#d98a3d',accent:'#fff6e8',eyes:'#e0b23a'}},
  {id:'beebs',name:'Beebs',pet:{species:'cat',name:'Beebs'},palette:{body:'#2a2629',accent:'#fff6e8',eyes:'#8fc24c'}},
];
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
export function createCompanion({id,egg=false,day,night,start,random=Math.random}){
  const first=(day&&day[0])||(night&&night[0])||null;
  const at=start||first;
  const c={id,egg,day:day||[],night:night||[],spot:first,point:at?{x:at.x,y:at.y,z:at.z}:null,heading:first?.face??random()*TAU,
    face:null,mode:'at',t:0,dwell:20+random()*20,walking:false,speed:0,vel:0,distance:0,greetIn:1+random()*2,happy:0,
    target:null,path:null,search:null,stuck:0,out:null,sleeping:false,up:!!first?.up,act:first?.act||'look',phase:random()*6,aside:null,crowded:false,watching:false};
  if(c.up)c.standFrom={...first.stand};
  return c;
}
// ctx: {world, player, night, seen(point)->bool, random, reduced, camera?:{x,z}}
export function updateCompanion(c,dt,ctx){
  const {world,player,night=false,reduced=false,random=Math.random}=ctx;
  const visible=point=>ctx.seen?ctx.seen(point):true;
  const seen=visible(c.point);
  const tripVisible=spot=>seen||visible(spot.up?spot.stand:spot);
  c.t+=dt;c.dwell-=dt;c.greetIn-=dt;c.happy=Math.max(0,c.happy-dt);
  const out={expression:'idle',pose:{},look:[0,0],hop:0,emote:null};
  const gap=Math.hypot(c.point.x-player.x,c.point.z-player.z),sameFloor=Math.abs(c.point.y-player.y)<(c.up?1:.6);
  const toYou=Math.atan2(player.x-c.point.x,player.z-c.point.z),toPlayer=wrap(toYou-c.heading);
  // An unhatched egg waits where it was laid: it only wobbles.
  if(c.egg){c.walking=false;c.speed=0;c.out=out;return {out,gap};}
  // Which list of places applies now; pick a new place when the time comes.
  const list=(night&&c.night.length?c.night:c.day);
  const visiting=c.spot?.temp&&c.t<c.spot.until;
  if(!visiting&&(!list.includes(c.spot)||(!night&&c.dwell<=0&&list.length>1&&c.mode==='at'))){
    const choices=list.filter(p=>p!==c.spot);const next=choices.length?choices[Math.floor(random()*choices.length)]:list[0];
    c.dwell=25+random()*25;
    if(next&&next!==c.spot){c.spot=next;goTo(c,next,tripVisible(next));}
  }
  const spot=c.spot;
  // Make room for your pet: two smooth steps away rather than a shove —
  // straight back, or off at an angle when the furniture is behind it.
  // (A pet that came over to greet you stands close on purpose.) Once it has
  // made room it stays beside you, stepping off again only if you bump right
  // into it; boxed in, it just stays and watches you. Either way it doesn't
  // try again every few seconds, and once you've moved off it goes back to
  // its place.
  if(c.crowded&&(gap>1.5||!sameFloor||c.t>c.crowdedUntil))c.crowded=false;
  const home=spot&&(spot.up?spot.stand:spot);
  // Left standing somewhere else (it made room, or gave up a walk a moment
  // ago): back to its place once you're not right beside it.
  if(home&&c.mode==='at'&&!c.crowded&&(gap>1.5||!sameFloor)&&c.t>(c.restUntil||0)&&(spot.up?!c.up:Math.hypot(home.x-c.point.x,home.z-c.point.z)>.3)){
    // After an unsuccessful route, stay calm until there is a walkable way
    // again; a door or another mover clearing immediately releases the hold.
    if(c.unreachable!==spot)goTo(c,spot,tripVisible(spot));
    else if(c.t>=(c.retryAt||0)){
      const probe={...c.point};world.move(probe,home.x-probe.x,home.z-probe.z);
      if(Math.hypot(probe.x-home.x,probe.z-home.z)<.06)goTo(c,spot,tripVisible(spot));
    }
  }
  if(!c.up&&sameFloor&&gap<(c.spot?.temp?.45:.7)&&c.mode!=='aside'&&c.mode!=='hop'&&(!c.crowded||c.crowded==='made room'&&gap<.45)){
    // (Not back into the camera trailing behind you, where it would vanish.)
    const away=Math.atan2(c.point.x-player.x,c.point.z-player.z),left=Math.max(.25,1-gap),cam=ctx.camera;let angle,backup;
    for(const a of [0,.7,-.7,1.4,-1.4].map(o=>away+o)){const q={...c.point};world.move(q,Math.sin(a)*left,Math.cos(a)*left);
      if(Math.hypot(q.x-c.point.x,q.z-c.point.z)<=left*.6)continue;if(!cam||Math.hypot(q.x-cam.x,q.z-cam.z)>.8){angle=a;break;}backup??=a;}
    angle??=backup;
    if(angle===undefined){c.crowded='boxed in';c.crowdedUntil=c.t+8;}
    else{c.aside={angle,left,back:3,moved:0};c.mode='aside';c.path=c.search=null;}
  }
  if(c.mode==='aside'){
    const step=Math.min(c.aside.left,1.3*dt),before={...c.point};
    if(step>0)world.move(c.point,Math.sin(c.aside.angle)*step,Math.cos(c.aside.angle)*step);
    const moved=Math.hypot(c.point.x-before.x,c.point.z-before.z);c.distance+=moved;c.aside.moved+=moved;
    // It backs off still facing you (turning away for half a metre and back
    // again read as a twitch).
    c.aside.left-=step;c.face=toYou;c.walking=moved>1e-4;c.speed=moved/Math.max(dt,1e-4);
    if(c.aside.left<=0||moved<step*.3){c.aside.left=0;c.aside.back-=dt;c.walking=false;c.speed=0;
      // Then back to its place once you've moved off, or it just stays here and watches you.
      if(c.aside.back<=0){const made=c.aside.moved>.1;c.aside=null;if(gap>1.2&&spot&&c.unreachable!==spot)goTo(c,spot,tripVisible(spot));else{c.mode='at';c.crowded=made?'made room':'boxed in';c.crowdedUntil=c.t+8;}}}
  }else if(c.mode==='travel'){
    const tgt=c.target;
    if(!seen&&!visible(tgt)&&(Math.hypot(tgt.x-c.point.x,tgt.z-c.point.z)>.1||Math.abs(tgt.y-c.point.y)>.3)){Object.assign(c.point,tgt);c.path=c.search=null;arrive(c);}
    else walk(c,dt,world,seen||visible(tgt),reduced);
  }else if(c.mode==='hop'){
    // Up onto (or down from) a bed, a seat or a chair in a short arc.
    const h=c.hop;h.t=Math.min(1,h.t+dt/(reduced?.01:.45));
    const k=h.t*h.t*(3-2*h.t);c.point.x=h.from.x+(h.to.x-h.from.x)*k;c.point.z=h.from.z+(h.to.z-h.from.z)*k;
    c.point.y=h.from.y+(h.to.y-h.from.y)*k+(reduced?0:Math.sin(Math.PI*h.t)*.12);c.walking=false;
    if(h.t>=1){c.up=h.up;c.mode=h.then||'at';if(c.mode==='travel'&&!c.target)c.mode='at';}
  }else{
    c.walking=false;c.speed=0;c.vel=0;
    if(spot&&c.mode!=='at')c.mode='at';
  }
  // What the body shows at its place.
  const act=c.mode==='at'?(spot?.act||'look'):c.mode;
  const napping=act==='nap';c.sleeping=napping;
  if(napping){out.expression='sleep';out.pose={lie:1};out.emote='zz';c.watching=false;if(spot?.face!=null)c.face=spot.face;}
  else if(c.mode==='at'){
    c.phase+=dt;
    if(act==='read'){out.pose={sit:.8};out.look=[0,-.35];}
    else if(act==='sit'){out.pose={sit:1};}
    else if(act==='play'){if(!reduced&&(c.phase%3.2)<dt*1.5)out.hop=.55;out.look=[Math.sin(c.phase*1.2)*.7,.05];if((c.phase%6.4)<1.2)out.expression='happy';}
    else out.look=reduced?[.5,0]:[Math.sin(c.phase*.8)*.8,Math.sin(c.phase*.5)*.08];
    // Notice you while you're about (it keeps watching until you're a little
    // farther off than where it first noticed you): look up, and a hello hop
    // the first time you come over. It turns only once you're well round to
    // one side, and then most of the way, toward a fixed angle. (Choosing
    // between you and its place's facing from its own heading every frame
    // see-sawed the body several times a second while you stood to one side.)
    c.watching=sameFloor&&gap<(c.watching?3.5:3);
    if(c.watching){
      if(Math.abs(toPlayer)<1.1)out.look=[toPlayer,.15];
      if(!c.up&&act!=='read'){const off=wrap(toYou-(c.face??c.heading));if(Math.abs(off)>1.2)c.face=toYou-Math.sign(off)*.45;}
      if(gap<2.4&&c.greetIn<=0){c.greetIn=30;c.happy=1.8;out.hop=reduced?0:(c.up?.4:1);if(!c.up)c.face=toYou;}
    }else if(spot?.face!=null)c.face=spot.face;
  }
  // Happy to see you: a heart over its head, whatever it's doing (unless asleep).
  if(c.happy>0&&!napping){out.expression='happy';out.emote='heart';}
  // Turn smoothly toward where it wants to face (never a one-frame flip),
  // easing into the last few degrees rather than stopping dead.
  if(c.face!=null){const d=wrap(c.face-c.heading);c.heading+=reduced?d:Math.sign(d)*Math.min(Math.abs(d),6*dt,Math.max(Math.abs(d)*(1-Math.exp(-dt*9)),1.2*dt));}
  c.out=out;
  return {out,gap};
}
// The fewest straight legs along a found route that the pet can really walk
// (the search's grid steps would have it zig-zag every 10–20 cm).
function straighten(world,path){
  const out=[path[0]];
  for(let i=0;i<path.length-1;){
    let next=i+1;const step=Math.max(1,Math.floor((path.length-1-i)/8));
    for(let j=path.length-1;j>i+1;j-=step){const q=walkable(world,path[i],path[j].x,path[j].z);if(q&&Math.abs(q.y-path[j].y)<.06){next=j;break;}}
    out.push(path[next]);i=next;
  }
  return out;
}
// Along a real route to c.target, found a couple of milliseconds a frame by
// the paw prints' own search (route-search.mjs, with their elbow room at
// jambs), from both ends at once: the search's grid lines up with where it
// starts, so a bed-side spot in a slot between the sofa and the coffee table
// is found from the slot, not into it. It turns toward where it's going
// meanwhile, eases into a walk, slows for a sharp turn and settles to a stop
// at its place, instead of walking straight into the bed it means to hop
// onto, marching on the spot against it and giving up where it stood.
function walk(c,dt,world,seen,reduced){
  const tgt=c.target;
  if(!c.path&&!c.search){const here={...c.point},there={x:tgt.x,y:tgt.y,z:tgt.z};
    c.search=[routeSearch(world,here,there,{maxNodes:2500}),routeSearch(world,there,here,{maxNodes:2500})];c.searchT=0;}
  if(c.search){
    c.searchT+=dt;let found=null;
    c.search.forEach((s,i)=>{if(found)return;if(s.state==='searching')s.run(1);if(s.state==='found')found=i?s.path.slice().reverse():s.path;});
    if(found){c.path=easeRoute(world,straighten(world,found)).slice(1);c.search=null;if(!c.path.length){arrive(c);return;}}
    else if(c.search.every(s=>s.state==='failed')||c.searchT>2){c.path=[{x:tgt.x,y:tgt.y,z:tgt.z}];c.search=null;}
    else{c.walking=false;c.speed=0;c.vel=0;c.face=Math.atan2(tgt.x-c.point.x,tgt.z-c.point.z);return;}
  }
  // On to the next point once it's there, or a little before one where the
  // route only bends gently (elbow room round a bed), so that rounds into a
  // curve instead of three small swerves; real corners are walked to.
  let wp=c.path[0],dx=wp.x-c.point.x,dz=wp.z-c.point.z,d=Math.hypot(dx,dz);
  while(c.path.length>1){
    const n=c.path[1],bend=Math.abs(wrap(Math.atan2(n.x-wp.x,n.z-wp.z)-Math.atan2(dx,dz)));
    if(!(d<.07||(d<.3&&bend<.8)))break;
    c.path.shift();wp=c.path[0];dx=wp.x-c.point.x;dz=wp.z-c.point.z;d=Math.hypot(dx,dz);
  }
  const last=c.path.length===1;
  if(last&&d<.06){c.path=null;arrive(c);return;}
  // Its feet keep to the route; its body starts turning for the next leg
  // over the last 40 cm, the way an animal leans into a corner.
  const n=c.path[1],k=n?Math.max(0,1-d/.4):0;
  c.face=Math.atan2(wp.x+(n?(n.x-wp.x)*k*.5:0)-c.point.x,wp.z+(n?(n.z-wp.z)*k*.5:0)-c.point.z);
  const pace=c.spot?.temp?1.1:.55,turning=Math.abs(wrap(c.face-c.heading));
  const want=(last?Math.max(.15,Math.min(pace,d*2.2)):pace)*(turning>1.2?.15:1-turning*.6);
  c.vel+=(want-c.vel)*(reduced?1:1-Math.exp(-dt*6));
  const step=Math.min(d,c.vel*dt),before={...c.point};world.move(c.point,dx/d*step,dz/d*step);
  const moved=Math.hypot(c.point.x-before.x,c.point.z-before.z);c.distance+=moved;c.walking=moved>1e-4;c.speed=moved/Math.max(dt,1e-4);
  c.stuck=moved<step*.3?c.stuck+dt:0;
  if(c.stuck>.8){c.stuck=0;
    if(!seen){Object.assign(c.point,tgt);c.path=null;arrive(c);}
    // Something new in the way: look for the way once more from here, then settle where it is.
    else if(!c.replanned){c.replanned=true;c.path=null;}
    else{
      // Try one short side step with a genuinely clear remaining leg. This
      // lets a pet round a chair corner when the grid route touched its edge.
      const angle=Math.atan2(tgt.x-c.point.x,tgt.z-c.point.z);
      let detour=null;
      for(const offset of [Math.PI/2,-Math.PI/2,2.2,-2.2]){
        const q={...c.point};world.move(q,Math.sin(angle+offset)*.45,Math.cos(angle+offset)*.45);
        if(Math.hypot(q.x-c.point.x,q.z-c.point.z)<.25||Math.abs(q.y-c.point.y)>.26)continue;
        const probe={...q};world.move(probe,tgt.x-q.x,tgt.z-q.z);
        if(Math.hypot(probe.x-tgt.x,probe.z-tgt.z)<.06&&Math.abs(probe.y-tgt.y)<.3){detour=q;break;}
      }
      if(detour){c.path=[detour,{...tgt}];c.vel=0;c.stuck=0;}
      else{c.path=null;c.mode='at';c.walking=false;c.speed=0;c.vel=0;c.unreachable=c.spot;c.retryAt=c.t+1;}
    }
  }
}
function goTo(c,spot,seen){
  if(c.unreachable!==spot)c.unreachable=null;
  c.target=spot.up?spot.stand:{x:spot.x,y:spot.y,z:spot.z};c.stuck=0;c.path=c.search=null;c.replanned=false;c.vel=0;
  if(!seen){ // nobody's looking: just be there
    Object.assign(c.point,spot.up?{x:spot.x,y:spot.y,z:spot.z}:c.target);c.up=!!spot.up;c.standFrom=spot.up?{...spot.stand}:null;
    c.mode='at';if(spot.face!=null)c.face=spot.face;return;
  }
  if(c.up&&c.standFrom){c.mode='hop';c.hop={t:0,from:{...c.point},to:{...c.standFrom},up:false,then:'travel'};return;}
  c.mode='travel';
}
function arrive(c){
  const spot=c.spot;c.walking=false;c.speed=0;c.vel=0;
  if(spot&&spot.up&&!c.up){c.mode='hop';c.standFrom={...spot.stand};c.hop={t:0,from:{...c.point},to:{x:spot.x,y:spot.y,z:spot.z},up:true,then:'at'};return;}
  c.mode='at';if(spot?.face!=null)c.face=spot.face;
}// You just arrived in its room and it can't be seen from where you stand:
// it trots over to say hello at point (in front of you) and stays a few
// seconds before going back to what it was doing. Sleepers stay asleep.
export function callOver(c,point,seconds=9){
  if(c.egg||c.sleeping||!point)return false;
  const spot={room:c.spot?.room,act:'look',up:false,x:point.x,y:point.y,z:point.z,stand:{...point},face:point.face??null,temp:true,until:c.t+seconds};
  c.spot=spot;c.greetIn=0;c.crowded=false;goTo(c,spot,true);return true;
}
// Could a companion at this point be on screen: the same floor within 16 m,
// or just up or down the stairs within 3.5 m (`margin` widens both, so one
// at the edge isn't drawn and hidden on alternate frames). Drawing and
// walking share this one test: a companion that is drawn never jumps
// straight to its place (a shorter walking range once let pets 9–16 m
// away across the open main floor and yard hop metres in a frame).
export function seenFrom(player,point,margin=0){
  const dy=Math.abs(point.y-player.y),d=Math.hypot(point.x-player.x,point.z-player.z);
  return dy<1.1?d<16+margin:dy<2.6&&d<3.5+margin;
}

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
