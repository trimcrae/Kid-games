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
  const recovery=setupSaves({api,engine,tour,refresh:()=>sync(true),startNew:()=>showActivity({id:'adopt',room:'Living room',icon:'🥚',name:'Welcome to the family',view:'nest'})});
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
  function savePosition(){try{localStorage.setItem(positionKey(engine.who()),JSON.stringify(player));}catch{}}
  function restorePosition(id){
    try{const p=JSON.parse(localStorage.getItem(positionKey(id)));if(p&&[p.x,p.y,p.z].every(Number.isFinite)){const safe=world.safeSpot(p.x,p.y,p.z);if(safe){Object.assign(player,safe);return;}}}catch{}
    tour.teleport(rooms[0]);
  }
  const roomNames=[...new Set([...stations.map(s=>s.room),...Object.values(familyRooms)])];
  for(const name of roomNames){
    const room=rooms.find(r=>r[1]===name),a=stations.find(s=>s.room===name)||{icon:'🛏️',point:world.safeSpot(room[2],room[4],-room[3])},node=new THREE.Group();node.position.set(a.point.x,a.point.y+.025,a.point.z);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.40,.025,6,32),new THREE.MeshBasicMaterial({color:'#d7ec8b'}));ring.rotation.x=-Math.PI/2;node.add(ring);
    const label=labelSprite(a.icon+' '+name);label.position.y=1.35;node.add(label);scene.add(node);markers.push({node,label,name,point:a.point});
  }
  for(const row of $('room-list').children){
    if(!row.dataset.room)continue;
    const list=stations.filter(s=>s.room===row.dataset.room);
    const room=rooms.find(r=>r[1]===row.dataset.room);
    const roomButton=row.querySelector('button');roomButton.textContent=room[1]+' ↗';
    if(list.length){const info=document.createElement('small');info.textContent=list.map(s=>s.icon+' '+s.name).join(' · ');row.append(info);}
    const walk=document.createElement('button');walk.className='walk-here';walk.textContent='Walk here';walk.setAttribute('aria-label','Walk to '+room[1]);bindButton(walk,()=>guide(list[0]||{room:room[1],name:room[1],point:world.safeSpot(room[2],room[4],-room[3]),roomData:room}));row.append(walk);
  }
  function guide(station){destination=stations.find(a=>a.id===station.id)||station;closeActivity(false);$('family-panel').hidden=true;tour.showRooms(false);tour.resume();}
  function showActivity(station){
    $('activity-choices').hidden=true;
    if(station.owner&&!api.family().find(p=>p.id===station.owner)?.pet){recovery.open();return;}
    savePosition();tour.suspend();$('welcome').hidden=true;tour.showRooms(false);tour.suspend();$('family-panel').hidden=true;
    selected=station;api.enter(station);$('activity-title').textContent=station.icon+' '+station.name;$('activity-room').textContent=station.room;
    $('activity-panel').hidden=false;$('nearby').hidden=true;
    frame.contentWindow.scrollTo(0,0);$('close-activity').focus();
  }
  function closeActivity(resume=true){
    if(!$('activity-panel').hidden){api.leave();$('activity-panel').hidden=true;selected=null;sync(true);}
    if(resume)tour.resume();
  }
  window.houseBridge={
    route(view,action){
      if(view==='map'){closeActivity(false);tour.showRooms(true);return;}
      const station=view==='home'&&!action?stations.find(s=>s.owner===engine.who()):destinationFor(view,action);if(station)guide(station);
    },close:closeActivity,photo:tour.photo,
    say(text){$('pet-speech').textContent=text;$('pet-speech').hidden=false;clearTimeout(sayTimer);sayTimer=setTimeout(()=>$('pet-speech').hidden=true,3500);}
  };
  bindButton($('close-activity'),()=>closeActivity());
  bindButton($('close-choices'),()=>{$('activity-choices').hidden=true;tour.resume();});
  bindButton($('pet-button'),()=>{if(engine.state().pet){api.cuddle();petLife?.react('hello');}});
  bindButton($('cancel-journey'),()=>{destination=null;$('journey').hidden=true;});
  bindButton($('family-button'),()=>{
    closeActivity(false);tour.suspend();$('welcome').hidden=true;$('rooms').hidden=true;$('family-panel').hidden=false;
    $('family-list').querySelector('button')?.focus();
  });
  bindButton($('close-family'),()=>{$('family-panel').hidden=true;tour.resume();});
  document.addEventListener('keydown',e=>{if(e.code==='Escape'&&!$('family-panel').hidden){$('family-panel').hidden=true;tour.resume();}else if(e.code==='Escape'&&!$('activity-panel').hidden)closeActivity();});
  for(const p of api.profiles()){
    const b=document.createElement('button');b.textContent=p.emoji+' '+p.name;b.dataset.profile=p.id;
    bindButton(b,()=>{savePosition();api.select(p.id);restorePosition(p.id);destination=null;sync(true);$('family-panel').hidden=true;tour.resume();});$('family-list').append(b);
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
      const label=labelSprite(p.pet.name||p.name);label.scale.set(1.14/PET_SCALE,.215/PET_SCALE,1);label.position.y=.95/PET_SCALE;mesh.add(label);scene.add(mesh);
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
    $('pet-status').textContent=s.pet?`${profile.name} · ${s.pet.name} · 🪙 ${s.coins}`:`${profile.name} · Adopt your Craepet`;
    $('pet-needs').textContent=s.pet?(s.pet.egg?'🥚 Walk with your egg · Learn or tap to hatch':`🍽 ${Math.round(s.pet.hunger)}   😊 ${Math.round(s.pet.happy)}   ⚡ ${Math.round(s.pet.energy)}   🫧 ${Math.round(s.pet.clean)}`):'';
    $('pet-button').textContent=s.pet?.egg?'Tap your egg (C)':'Say hello (C)';
    $('weather-status').textContent=engine.weather().emoji+' '+engine.weather().name+' · '+engine.timeOfDay();
    for(const b of $('family-list').children)b.setAttribute('aria-pressed',String(b.dataset.profile===s.who));
    if(force)updateNearby(true);
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
      $('nearby-room').textContent=near.length?near[0].room+' · E to interact':'';
    }
    $('nearby').hidden=!tour.active||!near.length;
  }
  window.addEventListener('beforeunload',savePosition);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){savePosition();if(!$('activity-panel').hidden)closeActivity(false);}});
  sync(true);
  return {
    hasPet:()=>!!engine.state().pet,
    adopt:()=>recovery.open(),
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
        // If a tight corner still brings the camera right up to the pet, let
        // the view see past it rather than fill the screen with fur.
        avatar.visible=!avatarBounds||!companionBlocksCamera(player,tour.camera.position,{...avatarBounds,radius:avatarBounds.radius-.1});
        avatar.userData.head.getWorldPosition(headAt);headAt.y=avatar.position.y+avatarBounds.maxY+.04;
        emotes.update(dt,petOut.emote,headAt,avatar.visible,reduced);
      }else emotes.update(dt,null,null,false,true);
      for(const r of roamers){
        const gap=stepCompanion(r,dt,world,player);
        r.mesh.position.set(r.point.x,r.point.y+ground.offset(r.point,r.mesh.position.y-r.point.y),r.point.z);r.mesh.rotation.y=r.angle;r.mesh.userData.animate(time,r.walking,tour.reducedMotion);
        // Hide a companion only while its body overlaps the camera's space.
        r.mesh.visible=!companionBlocksCamera(r.point,tour.camera.position,r.cameraBounds);
        r.label.visible=r.mesh.visible&&gap>1.6&&gap<5;
      }
      for(const m of markers){const distance=Math.hypot(player.x-m.point.x,player.z-m.point.z);m.label.visible=Math.abs(player.y-m.point.y)<.65&&distance>1.8&&distance<6;}
      $('nearby').hidden=!active||!near.length;
      if(destination){
        const d=Math.hypot(player.x-destination.point.x,player.z-destination.point.z),dy=destination.point.y-player.y;
        const angle=Math.atan2(destination.point.x-player.x,player.z-destination.point.z)+tour.yaw;
        const arrows=['↑','↗','→','↘','↓','↙','←','↖'];const arrow=arrows[((Math.round(angle/(Math.PI/4))%8)+8)%8];
        $('journey').hidden=false;$('journey-text').textContent=`${arrow} ${destination.room} · ${Math.round(d)} m${Math.abs(dy)>.6?(dy>0?' · Go upstairs':' · Go downstairs'):''}${inReach(destination)?' · You’re here!':''}`;
      }else $('journey').hidden=true;
    },
    // The top of your pet's head (above its ears), for anchoring a speech bubble.
    petHeadWorld(target=new THREE.Vector3()){if(!avatar)return null;avatar.userData.head.getWorldPosition(target);target.y=avatar.position.y+avatarBounds.maxY;return target;},
    diagnostics:()=>({petBehaviour:petOut&&{state:petOut.state,expression:petOut.expression,emote:emotes.showing,mood:petOut.mood},pet:engine.state().pet?.name,profile:engine.who(),station:selected?.id,nearby:near.map(s=>s.id),destination:destination?.id,avatar:!!avatar,avatarSize:avatar&&avatarSize.toArray(),appearance:avatarKey,furniture:decor.children.length,roamers:roamers.map(r=>({id:r.id,position:{...r.point},distance:r.distance,height:r.cameraBounds.maxY-r.cameraBounds.minY})),stations:stations.map(s=>({id:s.id,room:s.room,point:s.point}))})
  };
}
