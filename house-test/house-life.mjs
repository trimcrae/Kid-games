import * as THREE from './vendor/three.module.min.js';
import {activities,destinationFor} from './activities.mjs';
import {creature,petpet,disposeCreature,labelSprite,PET_SCALE} from './creatures.mjs?v=20260925-motion2';
import {createPetpetFollow} from './petpet-follow.mjs?v=20260925-motion2';
import {furnishing} from './furnishings.mjs?v=20260925-motion2';
import {familyRooms} from './rooms.mjs';
import {setupSaves} from './save-panel.mjs';
import {createNeighborhood} from './neighborhood.mjs?v=20260925-motion2';
import {ROUTINES,HOUSE_CATS,isFamily,resolveSpots,createCompanion,updateCompanion,seenFrom,freeSpot,plan,lineOfSight,callOver} from './companions.mjs?v=20260925-motion2';
import {createGround} from './pet-ground.mjs?v=20260925-motion2';
import {createPetBehaviour,angleTo,needsOf,needValue} from './pet-behaviour.mjs?v=20260925-motion2';
import {createEmotes} from './emotes.mjs';
import {createRouter,createPawTrail} from './wayfinding.mjs?v=20260925-motion';
import {easeRoute} from './route-ease.mjs';
import {aftermathFor,createAftermath} from './aftermath.mjs?v=20260925-motion2';
import {placeDecor} from './decor-slots.mjs';
import {GAME_MODE} from './play-mode.mjs';
const $=id=>document.getElementById(id);
export function companionBlocksCamera(point,camera,bounds){
  const vertical=Math.max(point.y+bounds.minY-camera.y,camera.y-point.y-bounds.maxY,0);
  return Math.hypot(camera.x-point.x,camera.z-point.z,vertical)<bounds.radius+.30;
}
export async function createHouseLife(tour){
  const {scene,world,player,rooms,bindButton}=tour;
  const frame=$('activity-frame');
  // The iframe is a local activity runtime, with no scene navigation. Keeping
  // its DOM separate preserves every existing mini-game and keyboard handler.
  let api;
  const began=performance.now();
  while(!api?.ready()){
    api=frame.contentWindow?.HouseActivity;
    if(performance.now()-began>30000)throw Error('Craepets activity engine did not load');
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  const engine=frame.contentWindow.Craepets;
  const neighborhood=createNeighborhood(scene,world);
  const startNew=()=>showActivity({id:'adopt',room:$('location').textContent||'Living room',icon:'🥚',name:'Welcome to the family',view:'nest'});
  const recovery=setupSaves({api,engine,tour,refresh:()=>sync(true),startNew});
  let avatar,avatarSize=null,avatarBounds=null,avatarKey='',roamKey='',roamers=[],near=[],selected=null,destination=null,moving=false,inAir=false,ride=null,hopNow=0,speed=0,heading=Math.PI,wantHeading=Math.PI,syncAt=0,lastWho=null,decorKey='';
  const markers=[],decor=new THREE.Group();scene.add(decor);let sayTimer;
  // Pets stand on the visible floor finish (boards and tile sit above the
  // walking boxes), so their feet and contact shadows aren't buried.
  const ground=createGround(scene);let avatarLift=0;
  // Your pet's own idle life and needs (pet-behaviour.mjs) and its thought bubble.
  const emotes=createEmotes(scene);let petLife=null,petNeeds=null,petOut=null,visY=null,stepHop=null,foldIn=0,foldAmount=0;
  const headAt=new THREE.Vector3();
  const stations=activities.map(a=>{
    const room=rooms.find(r=>r[1]===a.room),point=world.safeSpot(room[2],room[4],-room[3]);
    if(!point)throw Error('Activity has no safe floor: '+a.id);
    return {...a,point,roomData:room};
  });
  // Companions keep 0.9 m clear of every station and arrival spot while idle.
  const keepClear=[];
  for(const r of rooms){if(/street|Craepet house/i.test(r[1]))continue;for(const [x,y] of [[r[2],r[3]],...(r[6]?[[r[6][0],r[6][1]]]:[])]){const p=world.safeSpot(x,r[4],-y);if(p)keepClear.push(p);}}
  // After-activity moments (aftermath.mjs) and their little props.
  const aftermath=createAftermath();let beforePet=null,arrivePop=false;
  const feedMat=(()=>{const m=plan(2.85,7.15),f=world.floor(m.x,m.z,0);return Number.isFinite(f)?{x:m.x,y:f,z:m.z}:null;})();
  const props=new THREE.Group();scene.add(props);
  const ball=new THREE.Mesh(new THREE.SphereGeometry(.065,16,10),new THREE.MeshStandardMaterial({color:'#f07a5f',roughness:.6}));
  const bowl=new THREE.Group();{const dish=new THREE.Mesh(new THREE.CylinderGeometry(.11,.08,.06,20),new THREE.MeshStandardMaterial({color:'#3f8f8a',roughness:.5}));dish.position.y=.03;
    const food=new THREE.Mesh(new THREE.SphereGeometry(.085,14,6,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:'#e0b04a',roughness:.9}));food.scale.y=.35;food.position.y=.05;bowl.add(dish,food);}
  props.add(ball,bowl);ball.visible=bowl.visible=false;
  const positionKey=id=>'craepets.house.position.'+id;
  // The view direction is saved alongside the spot (an additive field; older
  // saves without it still load), so a reload doesn't stare at a wall.
  function savePosition(){try{localStorage.setItem(positionKey(engine.who()),JSON.stringify({x:player.x,y:player.y,z:player.z,yaw:tour.yaw}));}catch{}}
  function restorePosition(id,switching=false){
    try{const p=JSON.parse(localStorage.getItem(positionKey(id)));if(p&&[p.x,p.y,p.z].every(Number.isFinite)){const safe=world.safeSpot(p.x,p.y,p.z);if(safe){tour.place(safe,p.yaw);return;}}}catch{}
    // Switching to someone who hasn't played here yet: their pet is waiting in
    // their own room, not back at the front door.
    tour.teleport((switching&&rooms.find(r=>r[1]===familyRooms[id]))||rooms[0]);
  }
  // In-world cues: no floor rings or floating signs. Each activity spot has a
  // small cream bubble with its emoji, drawn at a constant size on screen and
  // shown only on the same floor 2–5 m away, plus an [E] keycap once you're in
  // reach. A soft warm glow on the floor appears only in reach or while the
  // Rooms directions lead there.
  const finePointer=()=>matchMedia('(pointer:fine)').matches;
  function bubbleTexture(icons,key){
    const n=[...icons].length?Math.max(1,Array.from(new Intl.Segmenter().segment(icons)).length):1;
    const h=128,w=h+(n-1)*78+(key?70:0),c=document.createElement('canvas');c.width=w;c.height=h+18;const ctx=c.getContext('2d');
    ctx.fillStyle='#fff8ec';ctx.strokeStyle='#e8dcc8';ctx.lineWidth=7;
    ctx.beginPath();ctx.roundRect(5,5,w-10,h-10,(h-10)/2);ctx.fill();ctx.stroke();
    // A little tail pointing down at the spot.
    ctx.beginPath();ctx.moveTo(w/2-14,h-8);ctx.lineTo(w/2,h+12);ctx.lineTo(w/2+14,h-8);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillRect(w/2-12,h-14,24,8);
    ctx.font='64px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(icons,(w-(key?70:0))/2,h/2+4);
    if(key){const x=w-78,y=h/2-26;ctx.fillStyle='#fff';ctx.strokeStyle='#3b2e25';ctx.lineWidth=5;ctx.beginPath();ctx.roundRect(x,y,52,54,10);ctx.fill();ctx.stroke();
      ctx.fillStyle='#3b2e25';ctx.font='800 36px ui-rounded,"Nunito","Trebuchet MS",system-ui,sans-serif';ctx.fillText('E',x+26,y+29);}
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return {texture:t,aspect:w/(h+18)};
  }
  const glowTexture=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(64,64,4,64,64,62);
    g.addColorStop(0,'rgba(255,214,140,.85)');g.addColorStop(.55,'rgba(255,196,110,.35)');g.addColorStop(1,'rgba(255,190,100,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;})();
  const roomNames=[...new Set([...stations.map(s=>s.room),...Object.values(familyRooms)])];
  for(const name of roomNames){
    const room=rooms.find(r=>r[1]===name),here=stations.filter(s=>s.room===name),a=here[0]||{icon:'🛏️',point:world.safeSpot(room[2],room[4],-room[3])};
    const icons=here.length?here.map(s=>s.icon).join(''):a.icon;
    const plain=bubbleTexture(icons,false);
    const bubble=new THREE.Sprite(new THREE.SpriteMaterial({map:plain.texture,sizeAttenuation:false,transparent:true,depthTest:true}));
    bubble.center.set(.5,0);bubble.position.set(a.point.x,a.point.y+.95,a.point.z);bubble.renderOrder=2;bubble.visible=false;scene.add(bubble);
    const glow=new THREE.Mesh(new THREE.CircleGeometry(.6,32),new THREE.MeshBasicMaterial({map:glowTexture,transparent:true,depthWrite:false,opacity:.9}));
    glow.rotation.x=-Math.PI/2;glow.position.set(a.point.x,a.point.y+.02,a.point.z);glow.renderOrder=1;glow.visible=false;scene.add(glow);
    markers.push({name,bubble,glow,plain,point:a.point,stations:here});
  }
  // Room emoji for cards without an activity of their own.
  const roomIcon=name=>/bedroom/i.test(name)?'🛏️':/bath/i.test(name)?'🛁':/hall|entry/i.test(name)?'🚪':/laundry/i.test(name)?'🧺':/street/i.test(name)?'🏘️':/yard|porch/i.test(name)?'🌳':'🏠';
  for(const row of $('room-list').querySelectorAll('.room-row')){
    const list=stations.filter(s=>s.room===row.dataset.room);
    const room=rooms.find(r=>r[1]===row.dataset.room);
    const roomButton=row.querySelector('button'),icons=roomButton.querySelector('.room-icons');
    if(icons)icons.textContent=list.length?list.map(s=>s.icon).join(''):roomIcon(room[1]);
    if(list.length)roomButton.title=list.map(s=>s.name).join(' · ');
    const walk=document.createElement('button');walk.className='walk-here';walk.textContent='🐾';walk.title='Walk there';walk.setAttribute('aria-label','Walk to '+room[1]);bindButton(walk,()=>guide(list[0]||{room:room[1],name:room[1],point:world.safeSpot(room[2],room[4],-room[3]),roomData:room}));row.append(walk);
  }
  // "Walk there": a route over the real walking world, shown as paw prints.
  const trail=createPawTrail(scene),router=createRouter(world,[stations[0].point,(stations.find(s=>s.id==='games')||stations[0]).point]);let route=null,replanAt=0,arrivedAt=0;
  function planRoute(){route=destination?.point?router.request({x:player.x,y:player.y,z:player.z},destination.point):null;trail.clear();}
  function stopGuide(){destination=null;route=null;arrivedAt=0;trail.clear();$('journey').hidden=true;}
  function guide(station){destination=stations.find(a=>a.id===station.id)||station;arrivedAt=0;planRoute();closeActivity(false);$('family-panel').hidden=true;tour.showRooms(false);tour.resume();}
  function showActivity(station){
    $('activity-choices').hidden=true;
    // Someone else's empty plot: say so in the world, don't open the save form.
    if(station.owner&&!api.family().find(p=>p.id===station.owner)?.pet){
      const who=api.profiles().find(p=>p.id===station.owner)?.name||'They';
      $('activity-choices').hidden=true;if(!tour.active)tour.resume();
      say(station.owner===engine.who()?"You haven't adopted a Craepet yet — let's get you one!":`${who} hasn't adopted a Craepet yet. Pick ${who} in Family to adopt one!`,5000);
      return;
    }
    savePosition();tour.suspend();$('welcome').hidden=true;tour.showRooms(false);tour.suspend();$('family-panel').hidden=true;
    aftermath.stop();beforePet=api.snapshot().pet;
    selected=station;api.enter(station);$('activity-title').textContent=station.icon+' '+station.name;$('activity-room').textContent=station.room;
    $('activity-panel').hidden=false;$('nearby').hidden=true;document.body.classList.add('in-activity');
    if(station.id!=='adopt')coachDone('use');
    frame.contentWindow.scrollTo(0,0);$('close-activity').focus();
  }
  function closeActivity(resume=true){
    const wasAdopting=selected?.id==='adopt';
    if(!$('activity-panel').hidden){api.leave();$('activity-panel').hidden=true;selected=null;sync(true);}
    document.body.classList.remove('in-activity');
    // Leaving adoption without a pet (e.g. after switching to a pet-less
    // player) goes back to Family to pick someone else; resuming would only
    // start adoption again, with no way out but adopting or reloading.
    if(resume&&wasAdopting&&!engine.state().pet){openFamily(false);return;}
    if(resume)tour.resume();
    // Straight after adopting: turn the new pet round to say hello to you,
    // before the camera settles in behind it.
    if(resume&&wasAdopting&&avatar&&tour.active){heading=wantHeading=tour.yaw;say(`Hi! I'm ${engine.state().pet?.name||'here'}!`,4000);}
    // Fed, bathed, rested or played with: show it in the house for a moment.
    const kind=resume&&!wasAdopting&&avatar&&beforePet?aftermathFor(beforePet,api.snapshot().pet):null;beforePet=null;
    if(kind)aftermath.start(kind,{pet:{...player},heading,mat:feedMat,world,reduced:tour.reducedMotion});
  }
  function say(text,ms=3500){$('pet-speech').textContent=text;$('pet-speech').hidden=false;clearTimeout(sayTimer);sayTimer=setTimeout(()=>$('pet-speech').hidden=true,ms);}
  function hush(){clearTimeout(sayTimer);$('pet-speech').hidden=true;}
  // After a Rooms jump the toast and label name the room you picked, until
  // you've walked ~1.5 m (the arrival spot can stand closest to a neighbour's
  // room spot, e.g. Front entry's on the living-room rug).
  let pinned=null,lastTickSpot=null;
  window.houseBridge={
    route(view,action){
      if(view==='map'){closeActivity(false);tour.showRooms(true);return;}
      const station=view==='home'&&!action?stations.find(s=>s.owner===engine.who()):destinationFor(view,action);if(station)guide(station);
    },close:closeActivity,photo:tour.photo,
    say(text){say(text);}
  };
  bindButton($('close-activity'),()=>closeActivity());
  bindButton($('close-choices'),()=>{$('activity-choices').hidden=true;tour.resume();});
  bindButton($('pet-button'),()=>{if(engine.state().pet){api.cuddle();petLife?.react('hello');}});
  bindButton($('cancel-journey'),stopGuide);
  // Family doubles as the first-visit "Who's playing?" picker. Until someone
  // has picked a name this visit, a profile with no pet is asked who it is
  // before adopting, instead of silently adopting for whoever was last.
  // Opened from the Craepets game, the player is already chosen there.
  let picked=GAME_MODE;
  function openFamily(first=false){
    closeActivity(false);tour.suspend();$('welcome').hidden=true;$('rooms').hidden=true;
    $('family-panel').classList.toggle('first',first);
    $('family-title').textContent=first?"Who's playing?":'Family';
    $('family-note').textContent=first?'Tap your name. Everyone has their own Craepet and their own progress.':'Switch player. Everyone keeps their own Craepet and progress.';
    $('family-panel').hidden=false;
    ($('family-list').querySelector('[aria-pressed=true]')||$('family-list').querySelector('button'))?.focus();
  }
  function closeFamily(){
    const first=$('family-panel').classList.contains('first');$('family-panel').hidden=true;
    if(first&&!engine.state().pet){$('welcome').hidden=false;return;}
    tour.resume();
  }
  bindButton($('family-button'),()=>openFamily(false));
  bindButton($('player-chip'),()=>openFamily(false));
  bindButton($('close-family'),closeFamily);
  document.addEventListener('keydown',e=>{if(e.code==='Escape'&&!$('family-panel').hidden)closeFamily();else if(e.code==='Escape'&&!$('activity-panel').hidden)closeActivity();});
  for(const p of api.profiles()){
    const b=document.createElement('button');b.dataset.profile=p.id;
    const face=document.createElement('span');face.className='face';face.setAttribute('aria-hidden','true');face.textContent=p.emoji;
    const text=document.createElement('span');const name=document.createElement('b');name.textContent=p.name;const pet=document.createElement('small');text.append(name,pet);b.append(face,text);
    bindButton(b,()=>{hush();const switching=p.id!==engine.who();picked=true;savePosition();aftermath.stop();api.select(p.id);if(switching){arrivePop=true;lastWho=p.id;}restorePosition(p.id,switching);stopGuide();sync(true);$('family-panel').hidden=true;tour.resume();});$('family-list').append(b);
  }
  try{const probe='craepets.house.storage-check';localStorage.setItem(probe,'1');localStorage.removeItem(probe);}catch{$('save-status').textContent='Saving is unavailable in this browser. Keep this tab open to keep playing.';}
  function updateAvatar(snapshot){
    petNeeds=needsOf(snapshot.pet);
    const key=JSON.stringify(snapshot.pet&&[snapshot.who,snapshot.pet.species,snapshot.pet.colour,!!snapshot.pet.egg,snapshot.pet.wear,snapshot.pet.petpet]);
    if(key===avatarKey)return;avatarKey=key;
    if(avatar)disposeCreature(avatar);avatar=null;
    if(!snapshot.pet)return;
    avatar=creature(snapshot.pet,api.palette(snapshot.pet.colour));avatar.scale.setScalar(PET_SCALE);scene.add(avatar);
    // The petpet trots at the pet's heel; its height is its own, a beat
    // behind (petpet-follow.mjs), so a jump is two jumps, not one lump.
    if(snapshot.pet.petpet){const id=snapshot.pet.petpet.id,friend=petpet(id);friend.position.set(.4,0,-.3);avatar.add(friend);avatar.userData.petpet=friend;
      avatar.userData.follow=createPetpetFollow({flies:/^(moth|wisp|starling)$/.test(id)});}
    petLife=createPetBehaviour({egg:!!snapshot.pet.egg});visY=null;stepHop=null;
    // A family switch: the new pet pops in happy to see you.
    if(arrivePop){arrivePop=false;petLife.react('hello');}
    const box=new THREE.Box3().setFromObject(avatar);avatarSize=box.getSize(new THREE.Vector3());
    avatarBounds={minY:box.min.y,maxY:box.max.y,radius:Math.max(avatarSize.x,avatarSize.z)/2};
  }
  // The family's other pets, and only theirs (companions.mjs): each family
  // member's own saved pet except the one you're playing. api.family() reads
  // every save afresh from this edition's slots (the house's own, or the
  // game's with ?from=game), so a pet adopted, renamed or dressed in another
  // tab turns up at the next sync, and a profile with no pet has no
  // companion. The valley's shopkeepers stay in their own games, and the
  // Visitor's pet stays with the Visitor. Companions are kept by id: a new
  // name, outfit, colour or hatching rebuilds only that body (it stays where
  // it was), a switch of player adds and removes only the pets that changed
  // hands, and a body that leaves is disposed with its name and bubble.
  function updateRoamers(){
    // …and the house cats, who are always home (companions.mjs HOUSE_CATS).
    const family=[...api.family().filter(p=>isFamily(p.id)&&p.id!==engine.who()&&p.pet&&typeof p.pet==='object'),...HOUSE_CATS];
    const looks=family.map(p=>JSON.stringify([p.pet.name,p.pet.species,p.pet.colour,p.pet.wear,!!p.pet.egg]));
    const key=JSON.stringify(family.map((p,i)=>[p.id,looks[i]]));if(key===roamKey)return;roamKey=key;
    const was=new Map(roamers.map(r=>[r.id,r]));roamers=[];
    family.forEach((p,i)=>{
      const old=was.get(p.id);was.delete(p.id);
      if(old&&old.look===looks[i]){roamers.push(old);return;}
      if(old)dropRoamer(old);
      const r=makeRoamer(p,looks[i],old?.c);if(r)roamers.push(r);
    });
    was.forEach(dropRoamer);
  }
  function dropRoamer(r){r.label.material.map.dispose();r.emote?.dispose();disposeCreature(r.mesh);}
  function makeRoamer(p,look,c){
    if(c)c.egg=!!p.pet.egg; // hatched (or dressed) elsewhere: same place, same routine
    else{
      const homeName=familyRooms[p.id]||'Living room',home=rooms.find(r=>r[1]===homeName);
      const where={world,colliders:world.boxes,rooms,avoid:keepClear},routine=ROUTINES[p.id];
      let day=resolveSpots(routine?.day,where),night=resolveSpots(routine?.night,where);
      if(!day.length){const f=freeSpot(world,home[2],-home[3],home[4],keepClear);if(!f)return null;day=[{room:homeName,act:'look',up:false,...f,stand:f,face:null}];}
      c=createCompanion({id:p.id,egg:!!p.pet.egg,day,night});
    }
    const mesh=creature(p.pet,p.palette||api.palette(p.pet.colour));mesh.scale.setScalar(PET_SCALE);
    // Cache the body bounds before adding the name sprite. A floor-origin
    // distance misses tall ears/heads even when they intersect the camera.
    const bounds=new THREE.Box3().setFromObject(mesh);
    const cameraBounds={minY:bounds.min.y,maxY:bounds.max.y,
      radius:Math.hypot(Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x)),
        Math.max(Math.abs(bounds.min.z),Math.abs(bounds.max.z)))};
    // The name tag rides on the pet but keeps its readable world size,
    // floating just above the tallest ears.
    // A constant on-screen size, so a pet right by the camera doesn't wear a giant tag.
    const label=labelSprite(p.pet.name||p.name);label.material.sizeAttenuation=false;label.center.set(.5,0);label.scale.set(.044*label.userData.aspect/PET_SCALE,.044/PET_SCALE,1);label.position.y=.78/PET_SCALE;mesh.add(label);scene.add(mesh);
    // Drawn over the scene (a door frame never cuts it in half); it's only
    // shown while its anchor is in plain sight (see the companion loop).
    label.material.depthTest=false;label.renderOrder=6;
    return {id:p.id,name:p.pet.name||p.name,kind:p.pet.species==='cat'?'cat':'pet',look,mesh,label,labelY:label.position.y,cameraBounds,c,emote:null,los:false,losAt:0,losWas:null,near:false,drawn:false,visY:null};
  }
  let lastPlace=null,arriveAt=0,lifeClock=0;const _ndc=new THREE.Vector3();
  function inSight(r){const cam=tour.camera,p=r.c.point,h=r.cameraBounds.maxY;_ndc.set(p.x,r.mesh.position.y+h*.6,p.z).project(cam);
    return _ndc.z<1&&Math.abs(_ndc.x)<.9&&Math.abs(_ndc.y)<.9&&[h*.9,h*.5].some(y=>lineOfSight(world.boxes,cam.position,{x:p.x,y:r.mesh.position.y+y,z:p.z}));}
  function welcomeParty(){
    const room=$('location').textContent;
    const here=roamers.filter(r=>!r.c.egg&&!r.c.sleeping&&r.c.day[0]?.room===room&&Math.abs(r.c.point.y-player.y)<.6&&Math.hypot(r.c.point.x-player.x,r.c.point.z-player.z)<7);
    const r=here.find(r=>familyRooms[r.id]===room)||here[0];if(!r||inSight(r))return;
    const cam=tour.camera.position,fx=player.x-cam.x,fz=player.z-cam.z,fl=Math.hypot(fx,fz)||1;
    for(const d of [1.35,1.1,1.6])for(const a of [0,.35,-.35,.6,-.6,.9,-.9]){
      const ux=(fx*Math.cos(a)-fz*Math.sin(a))/fl,uz=(fx*Math.sin(a)+fz*Math.cos(a))/fl,x=player.x+ux*d,z=player.z+uz*d;
      const f=freeSpot(world,x,z,player.y,[],0,0);if(!f)continue;
      const g=Math.hypot(f.x-player.x,f.z-player.z);if(g<.55||g>2.2)continue;
      _ndc.set(f.x,f.y+.3,f.z).project(tour.camera);if(_ndc.z>1||Math.abs(_ndc.x)>.8||Math.abs(_ndc.y)>.85)continue;
      if(!lineOfSight(world.boxes,cam,{x:f.x,y:f.y+.4,z:f.z}))continue;
      f.face=Math.atan2(player.x-f.x,player.z-f.z);callOver(r.c,f);return;
    }
  }
  // A companion's name pill that would sit on a station's bubble lifts just
  // clear of it, in screen space (the bubbles belong to the HUD; only read).
  const _pa=new THREE.Vector3(),_pb=new THREE.Vector3();
  function clearBubble(r){
    r.label.position.y=r.labelY;
    const cam=tour.camera,tanH=Math.tan(cam.fov*Math.PI/360);
    r.label.getWorldPosition(_pa);const depth=_pa.distanceTo(cam.position);_pa.project(cam);
    const ph=.044/tanH,pw=ph*(r.label.userData.aspect||4)/cam.aspect;
    for(const m of markers){
      if(!m.bubble.visible)continue;
      _pb.copy(m.bubble.position).project(cam);if(_pb.z>1)continue;
      const bh=m.bubble.scale.y/tanH,bw=m.bubble.scale.x/tanH/cam.aspect;
      if(Math.abs(_pa.x-_pb.x)<(pw+bw)/2&&_pa.y<_pb.y+bh&&_pa.y+ph>_pb.y){const lift=_pb.y+bh+.012-_pa.y;r.label.position.y+=lift*tanH*depth/PET_SCALE;_pa.y+=lift;}
    }
  }
  // Furnishing remains the same economy and slots. The equipped pieces stand
  // where they belong in the living room and foyer (decor-slots.mjs): a pet
  // corner, beside the chair and sofa, under the window, pictures on the wall.
  function updateDecor(){
    const items=api.placed(),style=api.style(),key=JSON.stringify([items.map(i=>i.id),style]);if(key===decorKey)return;decorKey=key;
    scene.traverse(mesh=>{if(!mesh.isMesh||!mesh.material?.color)return;if(!mesh.userData.houseBaseColor&&mesh.name)mesh.userData.houseBaseColor=mesh.material.color.clone();if(!style)return;
      if(/architectural walls|Cutaway walls/.test(mesh.name)&&/Pale sage/.test(mesh.name))mesh.material.color.set(style.wall.a);
      if(/Floors and split levels \/ Oak floor/.test(mesh.name))mesh.material.color.copy(mesh.userData.houseBaseColor).lerp(new THREE.Color(style.floor.a),.65);
    });
    [...decor.children].forEach(child=>{child.material?.map?.dispose();disposeCreature(child);});
    placeDecor(items).forEach(({item,slot},i)=>{
      let at=plan(...slot.at);const floor=world.floor(at.x,at.z,0),piece=furnishing(item,i,{label:false});
      // A picture goes flat against the wall behind its slot.
      if(slot.hang){const bx=-Math.sin(slot.turn),bz=-Math.cos(slot.turn);for(let d=0;d<.4;d+=.01)if(world.blocked(at.x+bx*d,at.z+bz*d,.9)){at={x:at.x+bx*(d+.14),z:at.z+bz*(d+.14)};break;}}
      piece.scale.setScalar(slot.hang?.8:.85);piece.rotation.y=slot.turn;
      // Pictures hang on the wall; everything else stands on the floor finish.
      piece.position.set(at.x,slot.hang?slot.hang-.46*.8:(Number.isFinite(floor)?floor:0)+ground.offset({x:at.x,y:Number.isFinite(floor)?floor:0,z:at.z},.015),at.z);
      if(slot.hang)piece.traverse(m=>{if(m.isMesh&&m.position.y<.25)m.visible=false;});
      decor.add(piece);
    });
  }
  function sync(force=false){
    const s=api.snapshot();
    if(lastWho!==s.who){lastWho=s.who;restorePosition(s.who);}
    updateAvatar(s);updateRoamers();updateDecor();neighborhood.update(api.neighborhood());
    const profile=api.profiles().find(p=>p.id===s.who);
    // Pet badge: who is playing, the pet's name and coins, today's weather.
    $('chip-face').textContent=profile.emoji;
    $('pet-status').textContent=s.pet?s.pet.name:profile.name;
    $('chip-coins').textContent=s.pet?`🪙 ${s.coins}`:'Adopt a Craepet';
    $('player-chip').setAttribute('aria-label',`${profile.name} playing${s.pet?` with ${s.pet.name}, ${s.coins} coins`:''}. Open family`);
    const weather=engine.weather();$('weather-status').textContent=weather.emoji;$('weather-status').setAttribute('aria-label',weather.name);$('weather-status').title=weather.name;
    updateNeeds(s.pet);
    $('welcome-pet').textContent=s.pet?`${s.pet.egg?'Your egg':s.pet.name} is waiting for you inside.`:'';
    $('pet-button').querySelector('.label').textContent=s.pet?.egg?'Tap egg':'Say hello';
    const family=api.family();
    for(const b of $('family-list').children){
      b.setAttribute('aria-pressed',String(b.dataset.profile===s.who));
      const pet=family.find(p=>p.id===b.dataset.profile)?.pet;b.querySelector('small').textContent=pet?pet.name:'New pet';
    }
    if(force)updateNearby(true);
  }
  // Four little meters in the activity cards' colours; the numbers live in
  // each meter's accessible label rather than on screen.
  const NEEDS=[['hunger','Food','🍽️','--hunger'],['happy','Fun','😊','--fun'],['energy','Energy','⚡','--energy'],['clean','Clean','🫧','--clean']];
  let needsKey='';
  function updateNeeds(pet){
    const key=JSON.stringify(pet&&[pet.egg,...NEEDS.map(([k])=>Math.round(needValue(pet,k)))]);if(key===needsKey)return;needsKey=key;
    const box=$('pet-needs');box.replaceChildren();
    if(!pet)return;
    if(pet.egg){const note=document.createElement('span');note.className='egg-note';note.textContent='🥚 Tap your egg or learn to hatch it';box.append(note);return;}
    for(const [k,label,icon,colour] of NEEDS){
      const v=Math.max(0,Math.min(100,Math.round(needValue(pet,k)))),m=document.createElement('span');
      m.className='meter'+(v<30?' low':'');m.setAttribute('role','meter');m.setAttribute('aria-label',`${label} ${v} of 100`);m.setAttribute('aria-valuenow',v);m.setAttribute('aria-valuemin',0);m.setAttribute('aria-valuemax',100);m.title=`${label} ${v}`;
      const b=document.createElement('b');b.textContent=icon;b.setAttribute('aria-hidden','true');
      const bar=document.createElement('span'),fill=document.createElement('i');fill.style.width=v+'%';fill.style.setProperty('--c',`var(${colour})`);bar.append(fill);
      m.append(b,bar);box.append(m);
    }
  }
  function inReach(s){return Math.abs(player.y-s.point.y)<.35 && Math.hypot(player.x-s.point.x,player.z-s.point.z)<1.5;}
  function updateNearby(force=false){
    // A short collision-tested path prevents a marker activating through a
    // partition just because the two rooms happen to be close together.
    const reachable=stations.filter(s=>{
      if(!inReach(s))return false;
      const probe={...player};world.move(probe,s.point.x-probe.x,s.point.z-probe.z);
      return Math.hypot(probe.x-s.point.x,probe.z-s.point.z)<.2;
    });
    if(force||reachable.map(s=>s.id).join()!==near.map(s=>s.id).join()){
      near=reachable;$('nearby-actions').replaceChildren();
      for(const s of near){const b=document.createElement('button');b.dataset.activity=s.id;b.textContent=s.icon+' '+s.name;bindButton(b,()=>showActivity(s));$('nearby-actions').append(b);}
      // Lead with the key on a keyboard; a finger just taps the button.
      $('nearby-room').replaceChildren();
      if(near.length&&finePointer()){const k=document.createElement('kbd');k.textContent='E';k.title='Press E';$('nearby-room').append(k);}
    }
    $('nearby').hidden=!tour.active||!near.length;
  }
  window.addEventListener('beforeunload',savePosition);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){savePosition();if(!$('activity-panel').hidden)closeActivity(false);}});
  // Coach marks: one short tip at a time, only until the player has done it
  // once (remembered per browser), replacing the old permanent shortcut line.
  const coachKey='craepets.house.coach';let coached={};try{coached=JSON.parse(localStorage.getItem(coachKey))||{};}catch{}
  let walked=0,lastSpot=null,menuTipAt=0,jumpTipAt=0,coachText='';
  function coachDone(step){if(coached[step])return;coached[step]=1;try{localStorage.setItem(coachKey,JSON.stringify(coached));}catch{}}
  function showCoach(parts){
    const text=parts.join('');if(text===coachText)return;coachText=text;const el=$('coach');el.replaceChildren();
    if(!parts.length){el.hidden=true;return;}
    for(const p of parts){if(p.startsWith('[')&&p.endsWith(']')){const k=document.createElement('kbd');k.textContent=p.slice(1,-1);el.append(k);}else el.append(p);}
    el.hidden=false;
  }
  function coach(time,active){
    if(!active||!avatar||!engine.state().pet){showCoach([]);return;}
    // Count real steps only: a Rooms jump is not the player learning to walk.
    const step=lastSpot?Math.hypot(player.x-lastSpot.x,player.z-lastSpot.z):0;if(step<.6&&Math.abs(player.y-(lastSpot?.y??player.y))<.5)walked+=step;lastSpot={...player};
    const touch=!finePointer();
    if(!coached.walk){
      if(walked>2.5){coachDone('walk');}
      else return showCoach(touch?['Drag the pad to walk · swipe the screen to look around']
        :['[↑]',' walk · ','[↓]',' back up · ','[←]','[→]',' turn']);
    }
    // Jumping is the one control nothing else teaches, and the whole point of
    // it is the furniture — so say so once, until they try it.
    if(!coached.jump){if(!jumpTipAt)jumpTipAt=time;if(time-jumpTipAt>12)coachDone('jump');
      else return showCoach(touch?['Tap 🐾 to jump — up onto the beds, couches and tables']
        :['[Space]',' jumps — up onto the beds, couches and tables']);}
    if(!coached.use&&near.length)return showCoach(touch?[`Tap ${near[0].icon} ${near[0].name} to play`]:['Press ','[E]',` for ${near[0].icon} ${near[0].name}`]);
    if(coached.use&&!coached.menu&&!touch){if(!menuTipAt)menuTipAt=time;if(time-menuTipAt>7)coachDone('menu');else return showCoach(['[R]',' opens Rooms · ','[F]',' Family · ','[Esc]',' pauses']);}
    showCoach([]);
  }
  // The pet's speech rides above its head (projected each frame), with a tail;
  // if the pet is off screen or hidden it falls back to a free bubble up top.
  const headPoint=new THREE.Vector3();
  function placeSpeech(){
    const el=$('pet-speech');if(el.hidden)return;
    let free=true;
    if(avatar&&avatar.visible){
      headPoint.set(player.x,(avatar?avatar.position.y:player.y)+(avatarSize?.y??.55)+.08,player.z).project(tour.camera);
      if(headPoint.z<1&&Math.abs(headPoint.x)<1.05&&Math.abs(headPoint.y)<1.05){
        const x=(headPoint.x+1)/2*innerWidth,y=(1-headPoint.y)/2*innerHeight,half=Math.min(el.offsetWidth/2+8,innerWidth/2);
        // Sit above the thought bubble when the pet is also showing one.
        const lift=emotes.showing?40:0;
        el.style.left=Math.max(half,Math.min(innerWidth-half,x))+'px';el.style.top=Math.max(el.offsetHeight+100,y-lift)+'px';free=false;
      }
    }
    if(free){el.style.left='50%';el.style.top='34%';}
    el.classList.toggle('free',free);
  }
  // Room name as a short toast when you walk (or jump) into a new room.
  let roomShown='',toastTimer=0;
  function roomToast(active){
    const name=$('location').textContent;if(!active||name===roomShown)return;roomShown=name;
    const el=document.querySelector('.location');el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2200);
  }
  const overlayIds=['welcome','family-panel','save-panel','activity-choices','rooms','activity-panel','map'];
  // Which room you're in: the nearest room spot on this floor you can see at
  // head height without looking through a wall. Also notes whether the
  // "walk there" destination's bubble is in plain sight.
  let hereRoom=null,roomAt=0;
  function whereAmI(){
    const eye={x:player.x,y:player.y+1.2,z:player.z};let best=null,bd=Infinity,any=null,ad=Infinity;
    for(const r of rooms){
      if(Math.abs(r[4]-player.y)>.65)continue;const x=r[2],z=-r[3],d=Math.hypot(x-player.x,z-player.z);if(d>11)continue;
      if(d<ad){ad=d;any=r[1];}
      if(d<bd&&world.cameraFraction(eye,{x,y:r[4]+1.2,z})>.97){bd=d;best=r[1];}
    }
    hereRoom=best||any;
    for(const m of markers)m.inSight=destination?.room===m.name&&Math.abs(m.point.y-player.y)<.65&&world.cameraFraction(eye,{x:m.point.x,y:m.point.y+1.2,z:m.point.z})>.97;
  }
  // Idle fade for the round top-right buttons (A1): a menu key, the cursor
  // moving over the page, or a tap outside the play area wakes them.
  let hudWakeAt=performance.now();const wakeHud=()=>{hudWakeAt=performance.now();};
  document.addEventListener('pointerdown',e=>{if(!e.target.closest?.('#view,#touch-controls'))wakeHud();},true);
  document.addEventListener('pointermove',e=>{if(!document.pointerLockElement&&e.pointerType==='mouse')wakeHud();},{passive:true});
  document.addEventListener('keydown',e=>{if(/^(KeyR|KeyF|KeyC|Escape|Tab)$/.test(e.code))wakeHud();});
  document.addEventListener('focusin',wakeHud);
  sync(true);
  return {
    // The game clock and weather the HUD shows, for the 3D time of day.
    sky:()=>({time:engine.timeOfDay(),weather:engine.weather()?.id}),
    hasPet:()=>!!engine.state().pet,
    // Going back to the Craepets game: finish any activity and save the
    // valley, and remember where the pet was standing in the house.
    leave(){closeActivity(false);api.leave();savePosition();},
    // A Rooms jump names the room you picked (see pinned, above).
    pinRoom(name,level){pinned={name,level:String(level).toUpperCase(),x:player.x,y:player.y,z:player.z};hush();},
    // First visit asks who is playing; after that, a pet-less profile goes
    // straight to adoption. Bringing saves over is a small link, not a wall.
    adopt:()=>{if(!picked)openFamily(true);else startNew();},
    face(angle,instant=false){wantHeading=angle;if(instant)heading=angle;},
    movement(dx,dz,rate=0){moving=Math.hypot(dx,dz)>.0001;speed=rate;if(moving)wantHeading=Math.atan2(dx,dz);},
    // Off the ground (a jump, or a fall off the table it climbed onto): the
    // paws stop padding, and the body follows the walking height exactly
    // instead of easing to it a tread at a time.
    airborne(flag){if(flag&&!inAir)coachDone('jump');inAir=!!flag;},
    // Riding something (interactions.mjs): the body sits where it's told —
    // offset from the walking position, tilted along — instead of standing.
    ride(v){ride=v||null;if(ride)aftermath.stop();},
    say(text,ms){say(text,ms);},
    // Asleep in a bed (beds.mjs): energy back, a little at a time; `done`
    // marks the end of the sleep for the pet's wishes. Returns the energy now.
    rest(amount,done=false){if(!engine.state().pet)return null;const e=api.rest?.(amount,done);if(done)sync(true);return typeof e==='number'?e:null;},
    // A squash of the body on take-off and again as the paws touch down.
    hop(strength=1){hopNow=Math.max(hopNow,strength);},
    interact(){
      if(!near.length)return;
      const target=near.find(s=>destination?.id===s.id);
      if(target||near.length===1){showActivity(target||near[0]);return;}
      tour.suspend();$('activity-choices').hidden=false;$('choices-room').textContent=near[0].room;$('choices-list').replaceChildren();
      for(const s of near){const b=document.createElement('button');b.dataset.choice=s.id;b.textContent=s.icon+' '+s.name;bindButton(b,()=>showActivity(s));$('choices-list').append(b);}
      $('choices-list').querySelector('button').focus();
    },
    tick(dt,time,active){
      lifeClock=time;
      if(time>syncAt){syncAt=time+.8;sync();if(active)savePosition();updateNearby();}
      ground.frame();
      if(avatar){
        const reduced=tour.reducedMotion,rig=avatar.userData.rig,follow=avatar.userData.follow;let walking=active&&moving&&!inAir&&!ride,gait=speed;
        // Every squash of the pet's body is echoed by its petpet a beat later.
        const hopRig=s=>{rig.hop(s);follow?.hop(time,s);};
        if(hopNow){hopRig(hopNow);hopNow=0;}
        // What the pet feels like doing: look back at you, sniff, sit, yawn,
        // doze off when tired… (pet-behaviour.mjs), from its real needs.
        let friend=null,best=3;
        for(const r of roamers){const p=r.c.point,d=Math.hypot(p.x-player.x,p.z-player.z);if(d<best&&Math.abs(p.y-player.y)<.5){best=d;friend={angle:angleTo(player,heading,p)};}}
        petOut=petLife.update(dt,{moving:walking,ride:!!ride,needs:petNeeds,camera:{angle:angleTo(player,heading,tour.camera.position)},friend,night:engine.timeOfDay?.()==='night',reduced});
        if(petOut.turnTo!==null&&!walking)wantHeading=heading+petOut.turnTo;
        // Straight after Feed / Bath / Rest / Play: a short scene in the house
        // (aftermath.mjs) that any step of yours ends.
        const after=active?aftermath.update(dt,{moving:walking,pet:player,heading}):null;
        if(after){
          if(after.move){world.move(player,after.move.dx,after.move.dz);walking=true;gait=after.speed||1.1;}
          if(after.face!=null)wantHeading=after.face;
          petOut={...petOut,expression:after.expression,pose:after.pose,look:after.look||petOut.look,hop:after.hop,emote:after.emote,state:'after-'+after.kind};
        }
        const prop=after?.prop;
        ball.visible=!!prop&&prop.kind==='ball'&&!prop.caught;bowl.visible=!!prop&&prop.kind==='bowl';
        if(prop){const target=prop.kind==='ball'?ball:bowl,py=world.floor(prop.x,prop.z,player.y);target.position.set(prop.x,(Number.isFinite(py)?py:player.y)+avatarLift+(prop.kind==='ball'?.065:0),prop.z);if(prop.kind==='ball')ball.rotation.x+=dt*8;}
        // Turn along the shorter way at a creature's pace (fast, eased),
        // never a one-frame about-face.
        const turn=Math.atan2(Math.sin(wantHeading-heading),Math.cos(wantHeading-heading));
        heading+=reduced?turn:Math.sign(turn)*Math.min(Math.abs(turn),Math.max(Math.abs(turn)*(1-Math.exp(-dt*(walking?10:5))),dt*2));
        avatarLift=ground.offset(player,avatarLift);
        // Stair treads: the walking height steps 18 cm at a time; the body
        // hops up (or down) each tread in a short arc instead of teleporting.
        const floorY=player.y+avatarLift;
        if(visY===null||reduced||inAir||Math.abs(floorY-visY)>.6){visY=floorY;stepHop=null;}
        else if(Math.abs(floorY-(stepHop?stepHop.to:visY))>.06)stepHop={from:visY,to:floorY,t:0};
        if(stepHop){stepHop.t+=dt/.18;const k=Math.min(1,stepHop.t);visY=stepHop.from+(stepHop.to-stepHop.from)*k*k*(3-2*k)+Math.sin(Math.PI*k)*.045;if(k>=1){visY=stepHop.to;stepHop=null;}}
        else visY=floorY;
        avatar.position.set(player.x,visY,player.z);avatar.rotation.y=heading;avatar.rotation.x=0;
        if(ride){avatar.position.set(player.x+(ride.dx||0),player.y+(ride.dy||0),player.z+(ride.dz||0));avatar.rotation.x=ride.tilt||0;visY=avatar.position.y;stepHop=null;
          if(ride.pose)petOut={...petOut,pose:ride.pose,expression:ride.expression||petOut.expression,emote:ride.emote===undefined?petOut.emote:ride.emote};}
        rig.setExpression(petOut.expression);rig.setPose(petOut.pose);rig.look(...petOut.look);if(petOut.hop)hopRig(petOut.hop);
        rig.setGrime(petNeeds&&petNeeds.clean<35?.35+.65*(35-petNeeds.clean)/35:0);
        // Wings and tails tuck in beside a wall instead of poking through it.
        if(rig.wings||rig.tail){foldIn-=dt;if(foldIn<=0){foldIn=.2;const s=Math.sin(heading),c=Math.cos(heading);
          foldAmount=[[c,-s],[-c,s],[-s,-c]].some(([x,z])=>world.blocked(player.x+x*.22,player.z+z*.22,player.y))?1:0;}rig.fold(foldAmount);}
        // Physics, rather than an expressive hop timer, decides when the paws
        // should tuck in. A seated ride keeps its own pose.
        rig.setAirborne?.(!ride&&(inAir||!!stepHop));
        avatar.userData.animate(time,walking,reduced,gait);
        const pal=avatar.userData.petpet;
        if(pal){
          // Follow the heel through turns as well as jumps, returning local
          // offsets because the petpet lives inside the scaled avatar.
          const f=follow.update(time,dt,avatar.position.y,{reduced,
            leader:{x:avatar.position.x,z:avatar.position.z,heading:avatar.rotation.y,scale:PET_SCALE,
              airborne:!ride&&(inAir||!!stepHop)}});
          pal.position.x=f.offsetX;pal.position.z=f.offsetZ;
          pal.position.y=(f.y-avatar.position.y)/PET_SCALE;
          pal.userData.followState=f;
          if(f.hop)pal.userData.rig.hop(f.hop);
          pal.userData.rig.setAirborne(f.airborne);
          pal.userData.animate(time,f.moving&&!f.airborne,reduced,f.speed);
        }
        // Only if the camera is actually inside the pet (backed right up to a
        // wall) does the pet step aside from view; nearer than that it fades
        // (walkthrough.js).
        const eye=tour.camera.position,rise=eye.y-avatar.position.y;
        avatar.visible=!avatarBounds||Math.hypot(eye.x-player.x,eye.z-player.z)>avatarBounds.radius+.06||rise>avatarBounds.maxY+.08||rise<avatarBounds.minY-.05;
        avatar.userData.head.getWorldPosition(headAt);headAt.y=avatar.position.y+avatarBounds.maxY+.04;
        emotes.update(dt,petOut.emote,headAt,avatar.visible,reduced);
      }else emotes.update(dt,null,null,false,true);
      // Companions: their places and routines (companions.mjs). The ones you
      // could see (seenFrom: this floor within 16 m, or just up or down the
      // stairs) are drawn, walked and animated every frame; that same test
      // tells their routine whether it may skip a walk, so a pet on screen
      // never jumps to its place. The rest are hidden (floors hide them
      // anyway; nothing culls by occlusion) and their routines tick twice a
      // second so they are where they should be when you arrive. While the
      // house is paused behind a menu, the pause card or an activity, the
      // ones on screen hold still (only breathing), rather than finishing
      // their walks in a jump the moment nobody is "playing".
      const night=engine.timeOfDay?.()==='night',reduced=tour.reducedMotion;
      // Just arrived in a room (a jump)? If the pet who lives here can't be
      // seen from the arrival view, it trots over to say hello.
      if(lastPlace&&Math.hypot(player.x-lastPlace.x,player.z-lastPlace.z)>1.5)arriveAt=time+.7;
      lastPlace={x:player.x,y:player.y,z:player.z};
      if(arriveAt&&time>arriveAt&&active){arriveAt=0;welcomeParty();}
      for(const r of roamers){
        const c=r.c,p=c.point;
        // A little wider once drawn, so one at the edge isn't shown and hidden on alternate frames.
        const inView=r.drawn=seenFrom(player,p,r.drawn?.5:0);
        r.logicAt=(r.logicAt||0)+dt;
        if(!inView&&r.logicAt<.5){r.mesh.visible=r.label.visible=r.near=false;r.emote?.update(dt,null,null,false,true);continue;}
        const hold=inView&&!active,step=hold?0:inView?dt:r.logicAt;r.logicAt=0;
        const {out,gap}=updateCompanion(c,step,{world,player,night,reduced,seen:point=>seenFrom(player,point,r.drawn?.5:0),camera:tour.camera.position});
        // Feet on the visible floor finish (found per 25 cm patch): eased over
        // a rug's edge or a threshold rather than popping a few centimetres
        // (quicker going up, so feet don't sink into the step); a hop onto
        // furniture is already its own arc.
        const onFurniture=c.up||c.mode==='hop',floorY=p.y+(onFurniture?0:ground.offset(p,Math.min(.05,Math.max(0,(r.visY??p.y)-p.y))));
        r.visY=r.visY===null||reduced||onFurniture||!inView||Math.abs(floorY-r.visY)>.15?floorY:r.visY+(floorY-r.visY)*(1-Math.exp(-step*(floorY>r.visY?30:10)));
        r.mesh.position.set(p.x,r.visY,p.z);r.mesh.rotation.y=c.heading;
        const rig=r.mesh.userData.rig;
        if(rig&&!c.egg){rig.setExpression(out.expression);rig.setPose(out.pose);rig.look(...out.look);if(out.hop)rig.hop(out.hop);}
        else if(rig&&c.egg&&gap<3&&Math.abs(p.y-player.y)<.6&&!r.wobbled){r.wobbled=true;rig.hop(.6);}else if(gap>4)r.wobbled=false;
        // Every frame it's updated (a family's few pets; the 5 Hz pose for far
        // ones read as a stutter across the open main floor and yard).
        rig?.setAirborne?.(c.mode==='hop');
        r.mesh.userData.animate(time,c.walking&&!hold,reduced,c.speed);
        // Hide a companion only while its body overlaps the camera's space.
        r.mesh.visible=inView&&!companionBlocksCamera(p,tour.camera.position,r.cameraBounds);
        // Names only for companions you're standing near, with a margin each
        // way so pottering about at the edge doesn't blink the pill.
        r.near=r.mesh.visible&&(r.near?gap>.8&&gap<3.4:gap>.95&&gap<3.2);r.label.visible=r.near;
        // Pills and bubbles draw over door frames, so they need a clear line
        // of sight from the camera (checked a few times a second; once shown,
        // two checks in a row must agree before it changes, so a door jamb
        // sweeping past doesn't flicker it), and a pill sitting on a station's
        // bubble lifts clear of it.
        if(r.label.visible||out.emote||r.emote?.showing){
          // Any part of the companion in view (head, middle, either side) is
          // enough: a pet seen past a door jamb gets its whole pill, drawn over
          // the jamb; one fully behind a wall gets none.
          r.losAt-=dt;if(r.losAt<=0){r.losAt=.15;const cam=tour.camera.position,y0=r.mesh.position.y,h=r.cameraBounds.maxY,sx=(p.z-cam.z),sz=-(p.x-cam.x),sl=Math.hypot(sx,sz)||1;
            const clear=[[0,h*.9],[0,h*.5],[.18,h*.5],[-.18,h*.5]].some(([o,y])=>lineOfSight(world.boxes,cam,{x:p.x+sx/sl*o,y:y0+y,z:p.z+sz/sl*o}));
            if(r.losWas===null||clear===r.losWas)r.los=clear;r.losWas=clear;}
        }else{r.losAt=0;r.losWas=null;}
        // No name pill while it's in plain sight but out of view.
        if(r.label.visible&&!r.los)r.label.visible=false;
        if(r.label.visible)clearBubble(r);
        if(out.emote||r.emote){r.emote??=createEmotes(scene);headAt.set(p.x,r.mesh.position.y+r.cameraBounds.maxY+.04,p.z);r.emote.update(dt,out.emote,headAt,r.mesh.visible&&r.los,reduced);}
      }
      // Activity bubbles: in reach (with [E]), or 2–5 m away in the room you're
      // in — not a neighbouring room's glimpsed through an open doorway — plus
      // the "walk there" destination whenever it's in plain sight.
      if(time>roomAt){roomAt=time+.4;whereAmI();}
      const nearRooms=new Set(near.map(s=>s.room));
      for(const m of markers){
        const distance=Math.hypot(player.x-m.point.x,player.z-m.point.z),sameFloor=Math.abs(player.y-m.point.y)<.65,reach=nearRooms.has(m.name);
        const guided=destination?.room===m.name&&m.inSight;
        m.bubble.visible=active&&sameFloor&&(reach||(m.name===hereRoom&&distance>=2&&distance<=5.5)||(guided&&distance<=10));
        // The action pill at the bottom already carries the [E]; the bubble just marks the spot.
        const map=m.plain;if(m.bubble.material.map!==map.texture){m.bubble.material.map=map.texture;m.bubble.material.needsUpdate=true;}
        const size=reach?.085:.07;m.bubble.scale.set(size*map.aspect,size,1);
        if(reach&&!tour.reducedMotion)m.bubble.position.y=m.point.y+.95+Math.sin(time*3)*.03;
        m.glow.visible=sameFloor&&(reach||destination?.room===m.name)&&distance<8;
      }
      $('nearby').hidden=!active||!near.length;
      if(destination){
        // Search a little each frame (a few ms), then lay paw prints along the
        // next few metres of the route; plan again if the pet wanders off it.
        // (A worker answers between frames; the in-page fallback inside run().)
        if(route?.state==='searching')route.run(6);
        // Prints get elbow room at jambs and the sunroom slider (route-ease.mjs).
        if(route?.state==='found'&&!route.eased){route.eased=true;route.path=easeRoute(world,route.path);}
        if(route?.state==='found'&&route.shown!==route.path){route.shown=route.path;trail.setPath(route.path);}
        const off=trail.update(player);
        if(route?.state==='found'&&off>1.8&&time>replanAt){replanAt=time+1.5;planRoute();}
        const here=inReach(destination),dy=destination.point.y-player.y,floors=Math.abs(dy)>.6?(dy>0?' · up the stairs':' · down the stairs'):'';
        let text;
        if(here){text=`🐾 ${destination.room} — you're here!`;if(!arrivedAt)arrivedAt=time;trail.clear();if(route)route.shown=route.path;}
        else if(route?.state==='found')text=innerWidth<700||innerHeight<500?`🐾 ${destination.room}${floors}`:`🐾 Follow the paw prints to ${destination.room}${floors}`;
        else if(route?.state==='searching')text=`🐾 Sniffing out the way to ${destination.room}…`;
        else{const angle=Math.atan2(destination.point.x-player.x,player.z-destination.point.z)+tour.yaw;
          const arrows=['⬆','⬈','➡','⬊','⬇','⬋','⬅','⬉'];
          text=`${arrows[((Math.round(angle/(Math.PI/4))%8)+8)%8]} ${destination.room} · ${Math.max(1,Math.round(Math.hypot(player.x-destination.point.x,player.z-destination.point.z)))} m${floors}`;}
        $('journey').hidden=!active;$('journey-text').textContent=text;
        // Arrived: the trail has done its job.
        if(arrivedAt&&time-arrivedAt>2.5)stopGuide();
      }else $('journey').hidden=true;
      // The round buttons step back after a few quiet seconds of play.
      document.body.classList.toggle('hud-quiet',active&&performance.now()-hudWakeAt>4000);
      if(!active)hudWakeAt=performance.now();
      document.body.classList.toggle('overlay-open',overlayIds.some(id=>!$(id).hidden));
      // Anything the pet was saying about the place it just left (a jump, a
      // restored spot, a family switch) is no longer true here.
      if(lastTickSpot&&Math.hypot(player.x-lastTickSpot.x,player.z-lastTickSpot.z,player.y-lastTickSpot.y)>1.2)hush();
      lastTickSpot={x:player.x,y:player.y,z:player.z};
      if(pinned){
        if(Math.hypot(player.x-pinned.x,player.z-pinned.z)>1.5||Math.abs(player.y-pinned.y)>.5)pinned=null;
        else{if($('location').textContent!==pinned.name)$('location').textContent=pinned.name;if($('level').textContent!==pinned.level)$('level').textContent=pinned.level;}
      }
      coach(time,active);placeSpeech();roomToast(active);
    },
    // The top of your pet's head (above its ears), for anchoring a speech bubble.
    // Everyone in the house for the Marauder's Map: you (your pet), the
    // family's pets and the cats — where they are, which way they face and
    // whether they're on the move or asleep.
    everyone(){
      const list=[],pet=engine.state().pet;
      if(pet)list.push({id:'you',name:pet.egg?'Your egg':pet.name,kind:'you',x:player.x,y:player.y,z:player.z,heading,walking:moving&&tour.active&&!ride,sleeping:!!ride?.sleeping});
      for(const r of roamers)list.push({id:r.id,name:r.name,kind:r.kind,x:r.c.point.x,y:r.c.point.y,z:r.c.point.z,heading:r.c.heading,walking:r.c.walking,sleeping:!!r.c.sleeping});
      return list;
    },
    petHeadWorld(target=new THREE.Vector3()){if(!avatar)return null;avatar.userData.head.getWorldPosition(target);target.y=avatar.position.y+avatarBounds.maxY;return target;},
    diagnostics:()=>({hereRoom,petHeading:heading,bubbles:markers.filter(m=>m.bubble.visible).map(m=>m.name),route:route&&{state:route.state,points:route.path?.length??0,expanded:route.expanded,workerMs:route.ms??null,worker:!route.local},pawPrints:trail.count,petBehaviour:petOut&&{state:petOut.state,expression:petOut.expression,emote:emotes.showing,mood:petOut.mood},pet:engine.state().pet?.name,profile:engine.who(),station:selected?.id,nearby:near.map(s=>s.id),destination:destination?.id,avatar:!!avatar,avatarSize:avatar&&avatarSize.toArray(),petpet:avatar?.userData.petpet?{lift:+(avatar.userData.petpet.position.y*PET_SCALE).toFixed(3),offset:[avatar.userData.petpet.position.x,avatar.userData.petpet.position.z],moving:!!avatar.userData.petpet.userData.followState?.moving,airborne:!!avatar.userData.petpet.userData.followState?.airborne}:null,appearance:avatarKey,furniture:decor.children.length,roamers:roamers.map(r=>({id:r.id,name:r.name,position:{...r.c.point},distance:r.c.distance,height:r.cameraBounds.maxY-r.cameraBounds.minY,mode:r.c.mode,act:r.c.spot?.act,up:r.c.up,visible:r.mesh.visible,heading:r.c.heading,
        // What a steadiness check samples each frame: where it wants to face, its gait, drawn height, name pill and bubble.
        face:r.c.face,walking:r.c.walking,speed:r.c.speed,y:r.mesh.position.y,label:r.label.visible,emote:r.emote?.showing??null,egg:r.c.egg})),
      // The life clock of the last tick, and every creature body in the scene (yours plus companions: no leftovers after a switch).
      lifeClock,sceneCreatures:scene.children.filter(o=>o.userData.rig).length,
      aftermath:aftermath.active?aftermath.kind+':'+aftermath.phase:null,
      // Draw calls spent on creatures this frame (their meshes that are drawn, before frustum culling).
      creatureMeshes:[avatar,...roamers.map(r=>r.mesh)].reduce((n,o)=>{if(!o||!o.visible)return n;o.traverse(m=>{if((m.isMesh||m.isSprite)&&m.visible)n++;});return n;},0),stations:stations.map(s=>({id:s.id,room:s.room,point:s.point}))})
  };
}
