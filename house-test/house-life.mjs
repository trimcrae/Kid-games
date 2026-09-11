import * as THREE from './vendor/three.module.min.js';
import {activities,destinationFor} from './activities.mjs';
import {creature,petpet,disposeCreature,labelSprite,PET_SCALE} from './creatures.mjs';
import {furnishing} from './furnishings.mjs';
import {familyRooms} from './rooms.mjs';
import {setupSaves} from './save-panel.mjs';
import {createNeighborhood} from './neighborhood.mjs';
import {stepCompanion} from './companions.mjs';
import {createGround} from './pet-ground.mjs';
import {createPetBehaviour,angleTo} from './pet-behaviour.mjs';
import {createEmotes} from './emotes.mjs';
import {routeSearch,createPawTrail} from './wayfinding.mjs';
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
  const startNew=()=>showActivity({id:'adopt',room:'Living room',icon:'🥚',name:'Welcome to the family',view:'nest'});
  const recovery=setupSaves({api,engine,tour,refresh:()=>sync(true),startNew});
  let avatar,avatarSize=null,avatarBounds=null,avatarKey='',roamKey='',roamers=[],near=[],selected=null,destination=null,moving=false,speed=0,heading=Math.PI,wantHeading=Math.PI,syncAt=0,lastWho=null,decorKey='';
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
  const positionKey=id=>'craepets.house.position.'+id;
  // The view direction is saved alongside the spot (an additive field; older
  // saves without it still load), so a reload doesn't stare at a wall.
  function savePosition(){try{localStorage.setItem(positionKey(engine.who()),JSON.stringify({x:player.x,y:player.y,z:player.z,yaw:tour.yaw}));}catch{}}
  function restorePosition(id){
    try{const p=JSON.parse(localStorage.getItem(positionKey(id)));if(p&&[p.x,p.y,p.z].every(Number.isFinite)){const safe=world.safeSpot(p.x,p.y,p.z);if(safe){tour.place(safe,p.yaw);return;}}}catch{}
    tour.teleport(rooms[0]);
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
    const plain=bubbleTexture(icons,false),keyed=bubbleTexture(icons,true);
    const bubble=new THREE.Sprite(new THREE.SpriteMaterial({map:plain.texture,sizeAttenuation:false,transparent:true,depthTest:true}));
    bubble.center.set(.5,0);bubble.position.set(a.point.x,a.point.y+.95,a.point.z);bubble.renderOrder=2;bubble.visible=false;scene.add(bubble);
    const glow=new THREE.Mesh(new THREE.CircleGeometry(.6,32),new THREE.MeshBasicMaterial({map:glowTexture,transparent:true,depthWrite:false,opacity:.9}));
    glow.rotation.x=-Math.PI/2;glow.position.set(a.point.x,a.point.y+.02,a.point.z);glow.renderOrder=1;glow.visible=false;scene.add(glow);
    markers.push({name,bubble,glow,plain,keyed,point:a.point,stations:here});
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
  const trail=createPawTrail(scene);let route=null,replanAt=0,arrivedAt=0;
  function planRoute(){route=destination?.point?routeSearch(world,{x:player.x,y:player.y,z:player.z},destination.point):null;trail.clear();}
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
    selected=station;api.enter(station);$('activity-title').textContent=station.icon+' '+station.name;$('activity-room').textContent=station.room;
    $('activity-panel').hidden=false;$('nearby').hidden=true;document.body.classList.add('in-activity');
    if(station.id!=='adopt')coachDone('use');
    frame.contentWindow.scrollTo(0,0);$('close-activity').focus();
  }
  function closeActivity(resume=true){
    const wasAdopting=selected?.id==='adopt';
    if(!$('activity-panel').hidden){api.leave();$('activity-panel').hidden=true;selected=null;sync(true);}
    document.body.classList.remove('in-activity');
    if(resume)tour.resume();
    // Straight after adopting: turn the new pet round to say hello to you,
    // before the camera settles in behind it.
    if(resume&&wasAdopting&&avatar&&tour.active){heading=wantHeading=tour.yaw;say(`Hi! I'm ${engine.state().pet?.name||'here'}!`,4000);}
  }
  function say(text,ms=3500){$('pet-speech').textContent=text;$('pet-speech').hidden=false;clearTimeout(sayTimer);sayTimer=setTimeout(()=>$('pet-speech').hidden=true,ms);}
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
  let picked=false;
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
    bindButton(b,()=>{picked=true;savePosition();api.select(p.id);restorePosition(p.id);stopGuide();sync(true);$('family-panel').hidden=true;tour.resume();});$('family-list').append(b);
  }
  try{const probe='craepets.house.storage-check';localStorage.setItem(probe,'1');localStorage.removeItem(probe);}catch{$('save-status').textContent='Saving is unavailable in this browser. Keep this tab open to keep playing.';}
  function updateAvatar(snapshot){
    petNeeds=snapshot.pet&&!snapshot.pet.egg?snapshot.pet:null;
    const key=JSON.stringify(snapshot.pet&&[snapshot.who,snapshot.pet.species,snapshot.pet.colour,!!snapshot.pet.egg,snapshot.pet.wear,snapshot.pet.petpet]);
    if(key===avatarKey)return;avatarKey=key;
    if(avatar)disposeCreature(avatar);avatar=null;
    if(!snapshot.pet)return;
    avatar=creature(snapshot.pet,api.palette(snapshot.pet.colour));avatar.scale.setScalar(PET_SCALE);scene.add(avatar);
    if(snapshot.pet.petpet){const friend=petpet(snapshot.pet.petpet.id);friend.position.set(.4,0,-.3);avatar.add(friend);avatar.userData.petpet=friend;}
    petLife=createPetBehaviour({egg:!!snapshot.pet.egg});visY=null;stepHop=null;
    const box=new THREE.Box3().setFromObject(avatar);avatarSize=box.getSize(new THREE.Vector3());
    avatarBounds={minY:box.min.y,maxY:box.max.y,radius:Math.max(avatarSize.x,avatarSize.z)/2};
  }
  function updateRoamers(){
    const family=api.family().filter(p=>p.id!==engine.who()&&p.pet);
    const cast=family.concat([
      {id:'fen',name:'Farmer Fen',pet:{species:'snorbit',colour:'meadow'},room:'Back yard'},
      {id:'dizzy',name:'Dizzy',pet:{species:'glimmr',colour:'bubble'},room:'Basement playroom'},
      {id:'marigold',name:'Mrs Marigold',pet:{species:'blorb',colour:'sunbeam'},room:'Garage'},
      {id:'moss',name:'Mossbeard',pet:{species:'twiggle',colour:'cocoa'},room:"Mom & Dad's office"},
    ]);
    const key=JSON.stringify(cast.map(p=>[p.id,p.pet.species,p.pet.colour,p.pet.wear,!!p.pet.egg]));if(key===roamKey)return;roamKey=key;
    roamers.forEach(r=>{r.label.material.map.dispose();disposeCreature(r.mesh);});roamers=[];
    cast.forEach((p,i)=>{
      const home=rooms.find(r=>r[1]===(p.room||familyRooms[p.id]||'Living room'));
      const anchor=world.safeSpot(home[2],home[4],-home[3]);if(!anchor)return;
      const mesh=creature(p.pet,api.palette(p.pet.colour));mesh.scale.setScalar(PET_SCALE);
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
      roamers.push({id:p.id,mesh,label,cameraBounds,point:{...anchor},anchor,angle:i*1.7,timer:.5+i*.4,walking:!p.pet.egg,egg:!!p.pet.egg,distance:0});
    });
  }
  // Furnishing remains the same economy and slots. Display the equipped pieces
  // as miniature objects on a dedicated shelf inside the real living room.
  function updateDecor(){
    const items=api.placed(),style=api.style(),key=JSON.stringify([items.map(i=>i.id),style]);if(key===decorKey)return;decorKey=key;
    scene.traverse(mesh=>{if(!mesh.isMesh)return;if(!mesh.userData.houseBaseColor&&mesh.name)mesh.userData.houseBaseColor=mesh.material.color.clone();if(!style)return;
      if(/architectural walls|Cutaway walls/.test(mesh.name)&&/Pale sage/.test(mesh.name))mesh.material.color.set(style.wall.a);
      if(/Floors and split levels \/ Oak floor/.test(mesh.name))mesh.material.color.copy(mesh.userData.houseBaseColor).lerp(new THREE.Color(style.floor.a),.65);
    });
    [...decor.children].forEach(child=>{child.material?.map?.dispose();disposeCreature(child);});
    const origin=stations.find(s=>s.id==='home').point;
    items.slice(0,24).forEach((it,i)=>{
      const piece=furnishing(it,i);piece.scale.setScalar(.5);piece.position.set(origin.x+.62+(i%4)*.48,origin.y+Math.floor(i/4)*.56,origin.z+.72);decor.add(piece);
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
    const key=JSON.stringify(pet&&[pet.egg,...NEEDS.map(([k])=>Math.round(pet[k]??0))]);if(key===needsKey)return;needsKey=key;
    const box=$('pet-needs');box.replaceChildren();
    if(!pet)return;
    if(pet.egg){const note=document.createElement('span');note.className='egg-note';note.textContent='🥚 Tap your egg or learn to hatch it';box.append(note);return;}
    for(const [k,label,icon,colour] of NEEDS){
      const v=Math.max(0,Math.min(100,Math.round(pet[k]??0))),m=document.createElement('span');
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
  let walked=0,lastSpot=null,menuTipAt=0,coachText='';
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
      else return showCoach(touch?['Drag the pad to walk · swipe the screen to look around']:['[W]','[A]','[S]','[D]',' to walk · move the mouse to look around']);
    }
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
  const overlayIds=['welcome','family-panel','save-panel','activity-choices','rooms','activity-panel'];
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
    // First visit asks who is playing; after that, a pet-less profile goes
    // straight to adoption. Bringing saves over is a small link, not a wall.
    adopt:()=>{if(!picked)openFamily(true);else startNew();},
    face(angle,instant=false){wantHeading=angle;if(instant)heading=angle;},
    movement(dx,dz,rate=0){moving=Math.hypot(dx,dz)>.0001;speed=rate;if(moving)wantHeading=Math.atan2(dx,dz);},
    interact(){
      if(!near.length)return;
      const target=near.find(s=>destination?.id===s.id);
      if(target||near.length===1){showActivity(target||near[0]);return;}
      tour.suspend();$('activity-choices').hidden=false;$('choices-room').textContent=near[0].room;$('choices-list').replaceChildren();
      for(const s of near){const b=document.createElement('button');b.dataset.choice=s.id;b.textContent=s.icon+' '+s.name;bindButton(b,()=>showActivity(s));$('choices-list').append(b);}
      $('choices-list').querySelector('button').focus();
    },
    tick(dt,time,active){
      if(time>syncAt){syncAt=time+.8;sync();if(active)savePosition();updateNearby();}
      ground.frame();
      if(avatar){
        const reduced=tour.reducedMotion,walking=active&&moving,rig=avatar.userData.rig;
        // What the pet feels like doing: look back at you, sniff, sit, yawn,
        // doze off when tired… (pet-behaviour.mjs), from its real needs.
        let friend=null,best=3;
        for(const r of roamers){const d=Math.hypot(r.point.x-player.x,r.point.z-player.z);if(d<best&&Math.abs(r.point.y-player.y)<.5){best=d;friend={angle:angleTo(player,heading,r.point)};}}
        petOut=petLife.update(dt,{moving:walking,needs:petNeeds,camera:{angle:angleTo(player,heading,tour.camera.position)},friend,night:engine.timeOfDay?.()==='night',reduced});
        if(petOut.turnTo!==null&&!walking)wantHeading=heading+petOut.turnTo;
        // Turn along the shorter way at a creature's pace (fast, eased),
        // never a one-frame about-face.
        const turn=Math.atan2(Math.sin(wantHeading-heading),Math.cos(wantHeading-heading));
        heading+=reduced?turn:Math.sign(turn)*Math.min(Math.abs(turn),Math.max(Math.abs(turn)*(1-Math.exp(-dt*(walking?10:5))),dt*2));
        avatarLift=ground.offset(player,avatarLift);
        // Stair treads: the walking height steps 18 cm at a time; the body
        // hops up (or down) each tread in a short arc instead of teleporting.
        const floorY=player.y+avatarLift;
        if(visY===null||reduced||Math.abs(floorY-visY)>.6){visY=floorY;stepHop=null;}
        else if(Math.abs(floorY-(stepHop?stepHop.to:visY))>.06)stepHop={from:visY,to:floorY,t:0};
        if(stepHop){stepHop.t+=dt/.18;const k=Math.min(1,stepHop.t);visY=stepHop.from+(stepHop.to-stepHop.from)*k*k*(3-2*k)+Math.sin(Math.PI*k)*.045;if(k>=1){visY=stepHop.to;stepHop=null;}}
        else visY=floorY;
        avatar.position.set(player.x,visY,player.z);avatar.rotation.y=heading;
        rig.setExpression(petOut.expression);rig.setPose(petOut.pose);rig.look(...petOut.look);if(petOut.hop)rig.hop(petOut.hop);
        rig.setGrime(petNeeds&&petNeeds.clean<35?.35+.65*(35-petNeeds.clean)/35:0);
        // Wings and tails tuck in beside a wall instead of poking through it.
        if(rig.wings||rig.tail){foldIn-=dt;if(foldIn<=0){foldIn=.2;const s=Math.sin(heading),c=Math.cos(heading);
          foldAmount=[[c,-s],[-c,s],[-s,-c]].some(([x,z])=>world.blocked(player.x+x*.22,player.z+z*.22,player.y))?1:0;}rig.fold(foldAmount);}
        avatar.userData.animate(time,walking,reduced,speed);
        avatar.userData.petpet?.userData.animate(time,walking,reduced,speed);
        // Only if the camera is actually inside the pet (the last resort after
        // the crane has looked down from above) does the pet step aside from view.
        const eye=tour.camera.position,rise=eye.y-avatar.position.y;
        avatar.visible=!avatarBounds||Math.hypot(eye.x-player.x,eye.z-player.z)>avatarBounds.radius+.06||rise>avatarBounds.maxY+.08||rise<avatarBounds.minY-.05;
        avatar.userData.head.getWorldPosition(headAt);headAt.y=avatar.position.y+avatarBounds.maxY+.04;
        emotes.update(dt,petOut.emote,headAt,avatar.visible,reduced);
      }else emotes.update(dt,null,null,false,true);
      for(const r of roamers){
        const gap=stepCompanion(r,dt,world,player);
        r.mesh.position.set(r.point.x,r.point.y+ground.offset(r.point,r.mesh.position.y-r.point.y),r.point.z);r.mesh.rotation.y=r.angle;r.mesh.userData.animate(time,r.walking,tour.reducedMotion);
        // Hide a companion only while its body overlaps the camera's space.
        r.mesh.visible=!companionBlocksCamera(r.point,tour.camera.position,r.cameraBounds);
        // Names only for companions you're standing near.
        r.label.visible=r.mesh.visible&&gap>.9&&gap<3.2;
      }
      // Activity bubbles: in reach (with [E]), or 2–5 m away in the room you're
      // in — not a neighbouring room's glimpsed through an open doorway — plus
      // the "walk there" destination whenever it's in plain sight.
      if(time>roomAt){roomAt=time+.4;whereAmI();}
      const nearRooms=new Set(near.map(s=>s.room)),keyed=finePointer();
      for(const m of markers){
        const distance=Math.hypot(player.x-m.point.x,player.z-m.point.z),sameFloor=Math.abs(player.y-m.point.y)<.65,reach=nearRooms.has(m.name);
        const guided=destination?.room===m.name&&m.inSight;
        m.bubble.visible=active&&sameFloor&&(reach||(m.name===hereRoom&&distance>=2&&distance<=5.5)||(guided&&distance<=10));
        const map=(reach&&keyed?m.keyed:m.plain);if(m.bubble.material.map!==map.texture){m.bubble.material.map=map.texture;m.bubble.material.needsUpdate=true;}
        const size=reach?.085:.07;m.bubble.scale.set(size*map.aspect,size,1);
        if(reach&&!tour.reducedMotion)m.bubble.position.y=m.point.y+.95+Math.sin(time*3)*.03;
        m.glow.visible=sameFloor&&(reach||destination?.room===m.name)&&distance<8;
      }
      $('nearby').hidden=!active||!near.length;
      if(destination){
        // Search a little each frame (a few ms), then lay paw prints along the
        // next few metres of the route; plan again if the pet wanders off it.
        if(route?.state==='searching'&&route.run(6)==='found')trail.setPath(route.path);
        const off=trail.update(player);
        if(route?.state==='found'&&off>1.8&&time>replanAt){replanAt=time+1.5;planRoute();}
        const here=inReach(destination),dy=destination.point.y-player.y,floors=Math.abs(dy)>.6?(dy>0?' · up the stairs':' · down the stairs'):'';
        let text;
        if(here){text=`🐾 ${destination.room} — you're here!`;if(!arrivedAt)arrivedAt=time;trail.clear();}
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
      coach(time,active);placeSpeech();roomToast(active);
    },
    // The top of your pet's head (above its ears), for anchoring a speech bubble.
    petHeadWorld(target=new THREE.Vector3()){if(!avatar)return null;avatar.userData.head.getWorldPosition(target);target.y=avatar.position.y+avatarBounds.maxY;return target;},
    diagnostics:()=>({hereRoom,bubbles:markers.filter(m=>m.bubble.visible).map(m=>m.name),route:route&&{state:route.state,points:route.path?.length??0,expanded:route.expanded},pawPrints:trail.count,petBehaviour:petOut&&{state:petOut.state,expression:petOut.expression,emote:emotes.showing,mood:petOut.mood},pet:engine.state().pet?.name,profile:engine.who(),station:selected?.id,nearby:near.map(s=>s.id),destination:destination?.id,avatar:!!avatar,avatarSize:avatar&&avatarSize.toArray(),appearance:avatarKey,furniture:decor.children.length,roamers:roamers.map(r=>({id:r.id,position:{...r.point},distance:r.distance,height:r.cameraBounds.maxY-r.cameraBounds.minY})),stations:stations.map(s=>({id:s.id,room:s.room,point:s.point}))})
  };
}
