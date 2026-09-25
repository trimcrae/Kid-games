import * as THREE from './vendor/three.module.min.js';
import {WalkingWorld,Body} from './physics.mjs?v=20260916-use2';
import {createHouseLife} from './house-life.mjs?v=20260918-petpet';
import {rooms} from './rooms.mjs';
import {createHouseMaterial} from './materials.mjs?v=20260916-light';
import {createHouseLighting} from './lighting.mjs?v=20260918-sky';
import {createJungle} from './jungle.mjs?v=20260918-leaves';
import {createContactShadows} from './contact-shadows.mjs';
import {createGpuTimer} from './gpu-timer.mjs';
import {installPostPass} from './post-aa.mjs?v=20260916-use3';
import {installDepthPrepass} from './depth-prepass.mjs';
import {loadHouseOcclusion} from './ambient-occlusion.mjs?v=20260916-light';
import {loadBakedLight,UNBAKED} from './baked-light.mjs?v=20260916-light';
import {warmupCast} from './creatures.mjs?v=20260918-petpet';
import {createCameraGuard,guardGroups,nearPlaneReach,createFollowRig,arrivalHeading} from './camera-guard.mjs?v=20260916-use2';
import {glazingBoxes} from './glazing.mjs';
import {createMonitor} from './monitor.mjs?v=20260916-use3';
import {createMaraudersMap} from './marauders-map.mjs?v=20260916-use2';
import {createInteractions} from './interactions.mjs?v=20260918-car';

import {GAME_MODE,GAME_URL} from './play-mode.mjs';

const $=id=>document.getElementById(id);
// Loading steps are reported to the watchdog in boot.js, which says so when a
// step goes quiet and offers "Try again" / "Back to the Craepets game".
const boot=window.houseBoot||{step(){},alive(){},ready(){},fail(){}};
boot.step('the 3D house');
// Opened from the Craepets game, the house is part of the game (its own saves,
// and a way back from the top bar, the pause card and any loading problem).
document.body.classList.toggle('from-game',GAME_MODE);
if(GAME_MODE)document.title='Craepets · Walk around the house';
let leaveHouse=()=>{};
for(const link of document.querySelectorAll('[data-back-to-game]'))link.addEventListener('click',e=>{
  e.preventDefault();
  // Finish any activity and save the valley before the page goes.
  try{leaveHouse();}catch(error){console.warn(error);}
  location.href=GAME_URL;
});
// Touch buttons act on pointerup, so a finger doesn't wait for the click. The
// browser's own click for that tap still follows ~0–300 ms later and lands on
// whatever is now under the finger — once a panel has hidden, that was the
// HUD button beneath it (tapping "Back to walking" opened Rooms). So after any
// touch activation, every click for the next moment is swallowed, whichever
// element it hits.
let swallowClicksUntil=0;
document.addEventListener('click',e=>{if(e.isTrusted&&performance.now()<swallowClicksUntil){e.stopPropagation();e.preventDefault();}},true);
function bindButton(node,action){
  node.addEventListener('pointerup',e=>{if(e.pointerType==='touch'&&!node.disabled){swallowClicksUntil=performance.now()+450;e.preventDefault();action();}});
  node.addEventListener('click',()=>{if(performance.now()>=swallowClicksUntil)action();});
}
const canvas=$('view'), welcome=$('welcome'), start=$('start');
const scene=new THREE.Scene();
scene.background=new THREE.Color('#c2d5d5');
scene.fog=new THREE.Fog('#c2d5d5',35,85);
const camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.045,120);
camera.rotation.order='YXZ';
// A game lens rather than an interior-photography one: about 82° across on
// any screen shape, which is ~57° vertical at 16:10. Portrait phones keep the
// old 70° cap, so the widest near plane the clearance test assumes still holds.
// In a tight spot, where the boom is short, the lens eases wider (up to the
// same 70° cap) and the view tips up past the pet by up to AIM_LIFT — never
// above level (LEVEL_KEEP), so a close view shows the room rather than the
// ceiling. (lensClose: 0 at the full boom, 1 close.)
const AIM_LIFT=13*Math.PI/180,LEVEL_KEEP=1.5*Math.PI/180;
let baseFov=57,lensClose=0,cameraLift=0;
function fitLens(){
  camera.aspect=innerWidth/innerHeight;
  baseFov=THREE.MathUtils.clamp(2*Math.atan(Math.tan(41*Math.PI/180)/camera.aspect)*180/Math.PI,50,70);
  camera.fov=baseFov+lensClose*(Math.min(70,baseFov+13)-baseFov);
  camera.updateProjectionMatrix();
}
// Near-plane clearance for the widest lens the camera may ease to.
function lensClearance(){const fov=camera.fov;camera.fov=Math.min(70,baseFov+13);const reach=nearPlaneReach(camera);camera.fov=fov;return reach+.015;}
fitLens();
// Renderer look and cost. ?aa=fxaa|msaa|off and ?tone=agx/neutral for QA.
const query=new URLSearchParams(location.search);
const aaMode=({1:'msaa',0:'off',msaa:'msaa',off:'off',fxaa:'fxaa'})[query.get('aa')]||'fxaa';
const RENDER={
  // Edges: an FXAA pass on the finished frame (about 1-2 ms) instead of MSAA,
  // which cost 15-22 % of a frame on integrated graphics. See post-aa.mjs.
  aa:aaMode,antialias:aaMode==='msaa',
  // AgX keeps the warm palette from turning orange (Neutral measured sat 0.6+).
  toneMapping:query.get('tone')==='neutral'?THREE.NeutralToneMapping:THREE.AgXToneMapping,
  exposure:query.get('tone')==='neutral'?1:1.22,
};
let renderer,gpuTimer=null;
const maxPixelRatio=Math.min(devicePixelRatio,1.35);
let pixelRatio=Math.min(maxPixelRatio,1),qualitySince=0,qualityFrames=0,lastQualityChange=0;
try {
  renderer=new THREE.WebGLRenderer({canvas,antialias:RENDER.antialias,powerPreference:'high-performance'});
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(innerWidth,innerHeight);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=RENDER.toneMapping;
  renderer.toneMappingExposure=RENDER.exposure;
  // Hidden house surfaces are rejected before shading (?prepass=0 for QA).
  installDepthPrepass(renderer,camera,{enabled:query.get('prepass')!=='0'});
  // The pass also carries the highlight grade, so MSAA keeps a grade-only pass.
  installPostPass(renderer,camera,{mode:RENDER.aa==='msaa'?'grade':RENDER.aa});
  gpuTimer=createGpuTimer(renderer,camera);
} catch(error) {
  $('loading').textContent='This browser could not start 3D graphics. Try a current browser with WebGL enabled — the Craepets game itself still works here.';
  start.textContent='3D graphics unavailable';document.body.classList.add('house-failed');
  boot.fail(error,$('loading').textContent);
  throw error;
}
const lighting=createHouseLighting(scene,renderer,{mobile:matchMedia('(pointer:coarse)').matches,camera,petLight:query.get('petlight')!=='0',reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});
if(query.get('shadow')==='basic')renderer.shadowMap.type=THREE.BasicShadowMap;
// Baked bounce light: ?bakegain= scales it and ?bakemix= sets how much of the
// ambient it replaces (QA). ?phase=day|dawn|dusk|night and ?weather= pin the
// sky for matched before/after captures.
// The export's data files are cached by content: the manifest by release, and
// the mesh, AO and lightmaps by their own hashes from that manifest, so a new
// manifest never meets an old mesh from a browser or offline cache.
const DATA_VERSION='20260916-use3';
// How long a ready house waits for a bake still downloading (?bakegrace= ms).
const BAKE_GRACE=THREE.MathUtils.clamp(Number(query.get('bakegrace'))||3000,0,15000);
// Calibrated against the matched captures (September 16): the day bake at 0.75,
// and the night bake at half of that again, so evenings keep their mood.
// ?bakegain= and ?bakenight= override them for QA.
const BAKE_NIGHT=Number(query.get('bakenight'))||.5;
const BAKE_GAIN=Number(query.get('bakegain'))||.75,BAKE_REPLACE=THREE.MathUtils.clamp(Number(query.get('bakemix')??1)||0,0,1);
const PINNED_SKY=query.get('phase')?{time:query.get('phase'),weather:query.get('weather')||'sunny'}:null;

let guard=null,cameraClearance=lensClearance(),monitor=null,map=null,interactions=null;
// The movable parts of the house (export_walkthrough.py props), by key.
const propMeshes={};
let world,life,player={x:5.65,y:.03,z:-.7},yaw=0,pitch=0,focusY=.03,active=false,ready=false,failed=false;
// A graphics reset (the driver restarting) loses the 3D context: the house
// would stay blank, or wait for ever on shaders that can no longer finish.
// Say so and offer a reload instead. Saves are untouched (the game saves as
// you play).
canvas.addEventListener('webglcontextlost',event=>{
  event.preventDefault();console.error('The 3D graphics context was lost.');
  if(!ready){boot.fail(new Error('WebGL context lost'),'The 3D graphics stopped while the house was opening (the computer\'s graphics reset). Try again, or go back to the Craepets game.');failed=true;return;}
  failed=true;if(active)pause();
  $('loading').textContent='The 3D graphics stopped (the computer\'s graphics reset). Reload the house to carry on — your pet, coins and things are saved.';
  start.textContent='Reload the house';start.disabled=false;document.body.classList.add('house-failed');
});
const keys=new Set();let joy={x:0,y:0},velocity={x:0,z:0},last=performance.now(),drag=null,turnRate=0;
// Jumping (Body, physics.mjs): Space hops the pet up and gravity brings it
// down onto whatever is underneath — the floor, or the bed, couch or table it
// cleared.
let body=null;
function requestJump(){if(active&&ready)body?.jump();}
// What the pet is standing on right now (for QA: "bed", "couch", "table"…).
function standingOn(){
  if(!world||body?.airborne)return null;
  const under=world.nearby(player.x,player.z).filter(b=>Math.abs(b.max[1]-player.y)<.02
    &&player.x>=b.min[0]-.01&&player.x<=b.max[0]+.01&&player.z>=b.min[2]-.01&&player.z<=b.max[2]+.01);
  return under.length?under[0].name:null;
}
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
// The follow camera: on the player's own sightline, walls only shorten the boom; see camera-guard.mjs.
const followRig=createFollowRig({reducedMotion});let arrivalYaw=null;
// The rainforest beyond the fences, the ground under it and the hills on the
// horizon (jungle.mjs). Built now so its two shaders compile with the house's.
const jungle=createJungle(scene,{reducedMotion});

// Every way of putting the pet somewhere new — a jump, a family switch, a
// reload or an imported save — comes through here, so the camera, room name
// and lighting arrive with the pet instead of sweeping across floors to it.
function placePlayer(p,heading){
  // A new spot always starts standing still on solid ground, never mid-jump.
  Object.assign(player,p);pitch=0;focusY=p.y;velocity={x:0,z:0};followRig.reset();
  body?.reset(player);life?.airborne?.(false);interactions?.stop();
  yaw=arrivalYaw=arrivalHeading(player,heading,pitch,world,guard,cameraClearance);life?.face(yaw+Math.PI,true);
  updateLocation();
}
function teleport(room){
  const [ax,ay,heading]=room[6]||[room[2],room[3],room[5]];
  const p=world.safeSpot(ax,room[4],-ay)||world.safeSpot(room[2],room[4],-room[3]);
  if(!p){$('hint').textContent='That starting point is unavailable. Choose a nearby room.';return false;}
  placePlayer(p,heading);
  $('location').textContent=room[1];$('level').textContent=room[0].toUpperCase();
  lighting.setRoom(room[1],player);
  $('hint').textContent='Arrow keys to walk and turn · Space to jump · E for activities · R rooms · M map';
  render();return true;
}
// Steering is the arrow keys: ↑/↓ walk forward and back, ←/→ turn (Shift
// runs). The mouse is for the buttons and panels only — no pointer capture,
// nothing to drift. Phones and tablets walk with the pad and swipe to look.
const LOOK_SPEED=.0024,PITCH_MIN=-.8,PITCH_MAX=.42;
const finePointer=()=>matchMedia('(pointer:fine)').matches;
let turned=0;
const TURN_SPEED=1.9;   // rad/s for keyboard turning (about a third of a turn a second)
const KEYS_HINT='Arrow keys to walk and turn · Space to jump · E to use · R rooms · M map · Esc to pause';
// Everyday controls are taught by one-off coach marks in house-life.mjs and
// on the welcome/pause card, not by a permanent line of shortcuts.
function setHint(text,show=false){const h=$('hint');h.textContent=text;h.toggleAttribute('data-show',show);}
// Every way of stopping (pause, a panel, a lost window) drops all input at once.
function releaseInput(){keys.clear();endJoy();drag=null;velocity={x:0,z:0};turnRate=0;body?.reset(player);}
function suspend(){active=false;releaseInput();interactions?.stop();$('touch-controls').style.visibility='hidden';}
// Pause is its own small sheet (the same #welcome overlay in pause mode, so
// the ids players, tests and tools rely on stay put): no onboarding copy.
function pause(){suspend();welcome.dataset.mode='pause';welcome.hidden=false;start.textContent='Keep playing';start.focus();}
async function resume(){
  if(!ready)return;if(life&&!life.hasPet()){life.adopt();return;}active=true;welcome.hidden=true;$('rooms').hidden=true;
  $('rooms-button').setAttribute('aria-expanded','false');$('touch-controls').style.visibility='visible';canvas.focus();
  setHint(finePointer()?KEYS_HINT:'Drag to look · left pad to walk · 🐾 to jump · tap an activity');
}
function showRooms(show){
  const wasOpen=!$('rooms').hidden;
  $('rooms').hidden=!show;$('rooms-button').setAttribute('aria-expanded',String(show));
  if(show){suspend();welcome.hidden=true;$('room-list').querySelector('button')?.focus();}
  // Closing the panel returns to walking; other callers just tidy it away on
  // the way to an activity.
  else if(ready){active=true;$('touch-controls').style.visibility='visible';canvas.focus();}
}
// A quick soft fade into the new room instead of a hard cut. The jump itself
// happens at once; the cream veil then lifts over ~0.3 s.
function jumpTo(room){
  if(!ready)return;
  const veil=$('fade');if(!reducedMotion)veil.classList.add('on');
  if(teleport(room)){life?.pinRoom?.(room[1],room[0]);showRooms(false);resume();}
  requestAnimationFrame(()=>requestAnimationFrame(()=>veil.classList.remove('on')));
}
// Rooms travel board: floor sections of room cards. Every card stays in the
// document (the floor chips only scroll), so "Jump to X" is always reachable.
let section='',floor=null;
for(const room of rooms){
  if(room[0]!==section){
    section=room[0];const id='floor-'+section.toLowerCase().replace(/[^a-z]+/g,'-');
    const h=document.createElement('h3');h.textContent=section;h.id=id;$('room-list').append(h);
    floor=document.createElement('div');floor.className='floor';$('room-list').append(floor);
    const tab=document.createElement('button');tab.textContent=section;tab.dataset.floor=id;
    bindButton(tab,()=>{for(const t of $('floor-tabs').children)t.setAttribute('aria-current',String(t===tab));h.scrollIntoView({block:'start',behavior:reducedMotion?'auto':'smooth'});});
    $('floor-tabs').append(tab);
  }
  const row=document.createElement('div');row.className='room-row';row.dataset.room=room[1];
  const b=document.createElement('button');b.setAttribute('aria-label','Jump to '+room[1]);
  const icons=document.createElement('span');icons.className='room-icons';icons.setAttribute('aria-hidden','true');
  const name=document.createElement('span');name.className='room-name';name.textContent=room[1];
  b.append(icons,name);bindButton(b,()=>jumpTo(room));row.append(b);floor.append(row);
}
bindButton(start,()=>failed||boot.state==='failed'||boot.state==='stalled'?location.reload():resume());boot.startBound=true;bindButton($('pause-button'),pause);
bindButton($('rooms-button'),()=>showRooms($('rooms').hidden));bindButton($('close-rooms'),()=>showRooms(false));
bindButton($('welcome-rooms'),()=>{if(ready)showRooms(true);});bindButton($('welcome-family'),()=>{if(ready)$('family-button').click();});
bindButton($('reset'),()=>jumpTo(rooms[0]));
// The panels take over the house controls. Keep keyboard focus in the visible
// panel, including when a player tabs out of the activity iframe.
const panelOrder=['activity-panel','save-panel','activity-choices','family-panel','map','rooms','welcome'];
const panelFocusables='button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),iframe,[tabindex]:not([tabindex="-1"])';
function openPanel(){
  for(const id of panelOrder){
    const panel=$(id);
    if(!panel.hidden&&(id!=='map'||map?.isOpen))return panel;
  }
  return null;
}
function panelTabStops(panel){
  return [...panel.querySelectorAll(panelFocusables)].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
}
document.addEventListener('keydown',e=>{
  if(e.code!=='Tab')return;
  const panel=openPanel();if(!panel)return;
  const stops=panelTabStops(panel);if(!stops.length)return;
  const current=document.activeElement,index=stops.indexOf(current);
  if(index<0||e.shiftKey&&index===0||!e.shiftKey&&index===stops.length-1){
    e.preventDefault();
    (e.shiftKey?stops[stops.length-1]:stops[0]).focus();
  }
},true);
document.addEventListener('focusin',e=>{
  const panel=openPanel();
  if(panel&&!panel.contains(e.target))panelTabStops(panel)[0]?.focus();
});
document.addEventListener('keydown',e=>{
  if(!$('activity-choices').hidden){if(e.code==='Escape')$('close-choices').click();return;}
  if(!$('save-panel').hidden){if(e.code==='Escape'){e.preventDefault();$('close-saves').click();}return;}
  if(!$('activity-panel').hidden||!$('family-panel').hidden)return;
  // The Marauder's Map: M (or Escape) folds it away again; nothing else while it's open.
  if(map?.isOpen){if(e.code==='Escape'||e.code==='KeyM'){e.preventDefault();map.close();}return;}
  if(e.code==='Escape'&&!interactions?.active){if(!$('rooms').hidden)showRooms(false);else pause();return;}
  if(!active)return;
  // An active instrument or vehicle gets its keys before house shortcuts.
  if(interactions?.active){
    if(e.code==='KeyE'||e.code==='Escape'){e.preventDefault();interactions.stop();return;}
    if(interactions.key(e.code)){e.preventDefault();return;}
  }
  if(e.code==='KeyR'){e.preventDefault();showRooms(true);return;}
  if(e.code==='KeyM'){e.preventDefault();map?.open();return;}
  if(e.code==='KeyF'){e.preventDefault();$('family-button').click();return;}
  if(e.code==='KeyC'){e.preventDefault();$('pet-button').click();return;}
  // E uses what's here: gets you off whatever you're on, on to what's in
  // reach (interactions.mjs), or into the room's activity.
  if(e.code==='KeyE'){e.preventDefault();if(!interactions?.start())life?.interact();return;}
  // Space jumps. The browser's own key repeat comes through while it is held,
  // which simply hops again on landing — exactly what a held key should do.
  if(e.code==='Space'){e.preventDefault();requestJump();return;}
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}
});
document.addEventListener('keyup',e=>keys.delete(e.code));
// A lost window (alt-tab, a click into another app) stops everything: no key,
// drag or pad left "held" to walk or turn on its own when you come back.
window.addEventListener('blur',releaseInput);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&ready)pause();});
// Touch look: a finger swiping the view turns it (phones and tablets have no
// arrow keys).
function look(dx,dy){
  const turn=dx*LOOK_SPEED;
  yaw-=turn;turned+=turn;
  // Horizontal turning is unlimited; the angle only wraps to stay precise.
  if(yaw>Math.PI||yaw<-Math.PI)yaw-=Math.PI*2*Math.round(yaw/(Math.PI*2));
  pitch=THREE.MathUtils.clamp(pitch-dy*LOOK_SPEED,PITCH_MIN,PITCH_MAX);
}
// Fingers need a bigger turn per pixel: a full swipe across a phone turns
// about 140°, whatever the screen width.
const touchLookGain=()=>THREE.MathUtils.clamp(2.6*390/innerWidth,1,2.6);
const joystick=$('joystick'),knob=joystick.firstElementChild;let joyId=null;
canvas.addEventListener('pointerdown',e=>{
  // The mouse only clicks buttons and panels; it never steers.
  if(!active||e.pointerType==='mouse')return;
  // A thumb landing low on the left becomes the walking pad right there.
  if(e.pointerType==='touch'&&joyId===null&&e.clientX<innerWidth*.42&&e.clientY>innerHeight*.4){
    const s=joystick.offsetWidth/2;joystick.style.left=(e.clientX-s)+'px';joystick.style.top=(e.clientY-s)+'px';joystick.style.bottom='auto';joystick.classList.add('floating');
    joyId=e.pointerId;try{canvas.setPointerCapture(e.pointerId);}catch{}updateJoy(e);return;
  }
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,gain:e.pointerType==='touch'?touchLookGain():1};
  try{canvas.setPointerCapture(e.pointerId);}catch{}
});
canvas.addEventListener('pointermove',e=>{if(e.pointerId===joyId){updateJoy(e);return;}if(!active)return;if(drag?.id===e.pointerId){
  look((e.clientX-drag.x)*drag.gain,(e.clientY-drag.y)*drag.gain);drag.x=e.clientX;drag.y=e.clientY;}});
function endDrag(e){if(e&&e.pointerId===joyId){endJoy();return;}drag=null;}canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);
// A release anywhere (over the HUD too) or a lost capture ends the drag.
document.addEventListener('pointerup',e=>{if(drag?.id===e.pointerId)drag=null;});
canvas.addEventListener('lostpointercapture',e=>{if(drag?.id===e.pointerId)drag=null;});
// A small dead zone so a resting thumb doesn't creep the pet along.
function updateJoy(e){const r=joystick.getBoundingClientRect();let x=(e.clientX-r.x-r.width/2)/40,y=(e.clientY-r.y-r.height/2)/40;const m=Math.hypot(x,y),n=Math.max(1,m);
  joy=m<.15?{x:0,y:0}:{x:x/n,y:y/n};knob.style.transform=`translate(${x/n*34}px,${y/n*34}px)`;}
joystick.addEventListener('pointerdown',e=>{if(!active)return;joyId=e.pointerId;joystick.setPointerCapture(e.pointerId);updateJoy(e);});
joystick.addEventListener('pointermove',e=>{if(e.pointerId===joyId)updateJoy(e);});
function endJoy(){joyId=null;joy={x:0,y:0};knob.style.transform='';if(joystick.classList.contains('floating')){joystick.classList.remove('floating');joystick.style.left=joystick.style.top=joystick.style.bottom='';}}
joystick.addEventListener('pointerup',endJoy);joystick.addEventListener('pointercancel',endJoy);
// The jump paw, for fingers. It acts the instant it is touched (a jump that
// waited for the finger to lift would always be too late), and the browser's
// own click for that same tap is ignored; a click with no touch behind it —
// keyboard or assistive activation of the button — still jumps.
const jumpButton=$('jump');let jumpTapped=0;
jumpButton.addEventListener('pointerdown',e=>{e.preventDefault();jumpTapped=performance.now();requestJump();});
jumpButton.addEventListener('click',()=>{if(performance.now()-jumpTapped>600)requestJump();});
window.addEventListener('resize',()=>{fitLens();cameraClearance=lensClearance();renderer.setSize(innerWidth,innerHeight);});
// Follow camera. The camera stays on the player's own sightline to the pet
// (their heading and tilt, so it turns exactly with the arrow keys); a wall or
// cupboard behind the pet only shortens the boom, never swings it up over the
// pet. It pulls in at once but eases back out. The rig lives in
// camera-guard.mjs so the camera tests replay exactly this placement.
let cameraBoom=0;
function placeCamera(dt){
  return followRig.place({x:player.x,y:focusY,z:player.z},yaw,pitch,dt,world,guard,cameraClearance);
}
let lastRender=performance.now();
function render(){
  // A room probe renders six views. It must not hold up the activity iframe
  // and adoption controls while they are still loading.
  const now=performance.now(),dt=Math.min((now-lastRender)/1000,.1);lastRender=now;
  lighting.tick(player,now,ready);
  const view=placeCamera(dt);
  camera.position.set(view.position.x,view.position.y,view.position.z);camera.lookAt(view.target.x,view.target.y,view.target.z);
  cameraBoom=Math.hypot(view.position.x-view.target.x,view.position.y-view.target.y,view.position.z-view.target.z);
  // Close in, the lens widens and the view tips up past the pet (eased
  // together). Only the aim turns: the camera stays where the guard put it, so
  // its near-plane clearance holds whichever way it looks.
  lensClose+=(THREE.MathUtils.clamp((1.4-cameraBoom)/.8,0,1)-lensClose)*(reducedMotion?1:1-Math.exp(-dt*4));
  // The lift never takes the view above level (it would show ceiling instead
  // of the room): it may use up what the view is currently looking down by,
  // less a shade, and no more than AIM_LIFT.
  const down=-camera.rotation.x;
  cameraLift=lensClose*Math.min(AIM_LIFT,Math.max(0,down-LEVEL_KEEP));
  camera.rotation.x+=cameraLift;
  const fov=baseFov+lensClose*(Math.min(70,baseFov+13)-baseFov);
  if(Math.abs(camera.fov-fov)>.05){camera.fov=fov;camera.updateProjectionMatrix();}
  fadePet(dt);
  monitor?.tick();
  renderer.render(scene,camera);
}
// Close in, your own pet would cover the bottom of the screen: as it covers
// more of it, the pet fades (eased, with a little hysteresis, so it never
// flickers) to a see-through ghost, and out of sight as the lens reaches it
// (house-life.mjs then hides it outright), so a tight spot still shows the
// room ahead. It is solid again as soon as the camera has room. The pet is
// found as the creature standing exactly where you are (house-life.mjs puts
// it there every tick); its coat draws in the transparent pass from then on,
// opaque until it fades, so fading never compiles a shader mid-walk.
// (Creatures cast no shadow-map shadows, only their floor decal, which stays.)
// (Screen shares of the box round the pet: it starts to fade past `from`, is
// a ghost by `ghost` and gone by `gone`; once it has faded it holds for HOLD
// seconds before it may come back, so a boom that breathes in and out beside
// furniture never makes it blink.)
const PET_FADE={from:.28,ghost:.5,gone:.85,ghostOpacity:.3,hold:.3};
const pet={avatar:null,coats:[],low:0,high:0,radius:0,opacity:1,cover:0,hold:0},_corner=new THREE.Vector3(),_eye=new THREE.Vector3();
function playerPet(){
  if(pet.avatar?.parent===scene)return pet.avatar;
  pet.avatar=scene.children.find(o=>o.userData.rig&&Math.abs(o.position.x-player.x)<1e-4&&Math.abs(o.position.z-player.z)<1e-4)||null;
  pet.coats=[];if(!pet.avatar)return null;
  const a=pet.avatar;a.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(a),size=box.getSize(new THREE.Vector3());
  pet.low=box.min.y-a.position.y;pet.high=box.max.y-a.position.y;pet.radius=Math.max(size.x,size.z)/2;
  a.traverse(m=>{if(m.isMesh&&m.name==='creature'){m.material.transparent=true;m.material.needsUpdate=true;pet.coats.push(m.material);}});
  pet.opacity=1;pet.hold=0;return a;
}
// The share of the screen covered by the box round the pet (all of it once
// the lens is inside that box).
function petCover(a){
  camera.updateMatrixWorld();let x0=1,x1=-1,y0=1,y1=-1;
  for(let i=0;i<8;i++){
    _corner.set(a.position.x+(i&1?pet.radius:-pet.radius),a.position.y+(i&2?pet.high:pet.low),a.position.z+(i&4?pet.radius:-pet.radius));
    if(_eye.copy(_corner).applyMatrix4(camera.matrixWorldInverse).z>-camera.near)return 1;
    _corner.project(camera);x0=Math.min(x0,_corner.x);x1=Math.max(x1,_corner.x);y0=Math.min(y0,_corner.y);y1=Math.max(y1,_corner.y);
  }
  return Math.max(0,Math.min(1,x1)-Math.max(-1,x0))*Math.max(0,Math.min(1,y1)-Math.max(-1,y0))/4;
}
function fadePet(dt){
  const a=playerPet();if(!a)return;
  const c=pet.cover=petCover(a),S=THREE.MathUtils.smoothstep;
  const want=1-(1-PET_FADE.ghostOpacity)*S(c,PET_FADE.from,PET_FADE.ghost)-PET_FADE.ghostOpacity*S(c,PET_FADE.ghost+.1,PET_FADE.gone);
  // Fading out is quick (the pet is in the way now), and immediate once the
  // lens is inside the pet's box (never a look at the inside of its coat);
  // coming back waits out the hold.
  if(want<pet.opacity-.01){pet.hold=PET_FADE.hold;pet.opacity=c>=1?0:pet.opacity+(want-pet.opacity)*(reducedMotion?1:1-Math.exp(-dt*10));}
  else if((pet.hold-=dt)<=0)pet.opacity+=(want-pet.opacity)*(reducedMotion?1:1-Math.exp(-dt*6));
  if(pet.opacity>.995)pet.opacity=1;else if(pet.opacity<.005)pet.opacity=0;
  for(const m of pet.coats){m.opacity=pet.opacity;m.visible=pet.opacity>0;}
}
function updateLocation(){
  // The room you're in is the nearest room spot you can actually see — no
  // wall, floor or window between — not merely the nearest one: on the
  // living-room rug the porch spot is closer, but through the front wall.
  // The name, the room lighting and its reflection probe all follow this.
  const ranked=rooms.map(r=>({r,d:Math.hypot(player.x-r[2],player.z+r[3])+Math.abs(player.y-r[4])*12})).sort((a,b)=>a.d-b.d);
  let closest=ranked[0]?.r;
  const eye={x:player.x,y:player.y+1.2,z:player.z};
  for(const {r} of ranked.slice(0,6)){
    if(Math.abs(r[4]-player.y)>.7)continue;
    if(!guard||!guard.blocked(eye,{x:r[2],y:r[4]+1.2,z:-r[3]},true)){closest=r;break;}
  }
  if(closest){$('location').textContent=closest[1];$('level').textContent=closest[0].toUpperCase();lighting.setRoom(closest[1],player);}
}
// framesDrawn: frames the house actually drew (walking is capped at 30 fps; the
// browser's own animation callbacks run faster). Read-only QA diagnostic.
let frames=0,lastDraw=0,framesDrawn=0;
// GPU budget per walking frame at the 30 fps cap, leaving room for the page
// compositor and the activity iframe. Fill cost scales with pixel count.
const GPU_TARGET_MS=25,GPU_HIGH_MS=30,PIXEL_FLOOR=.6;
// ?pr=<ratio> pins the render scale for QA comparisons.
const PINNED_PR=+query.get('pr')||0;
if(PINNED_PR){pixelRatio=PINNED_PR;renderer.setPixelRatio(pixelRatio);}
function adaptResolution(now){
  gpuTimer?.poll();
  if(PINNED_PR||!active||!ready){qualitySince=now;qualityFrames=0;return;}
  qualityFrames++;
  const elapsed=now-qualitySince;
  if(elapsed<1200)return;
  const fps=qualityFrames*1000/elapsed;
  qualityFrames=0;qualitySince=now;
  const floor=Math.min(PIXEL_FLOOR,maxPixelRatio);
  let next=pixelRatio;
  // Change only render size, never material/shadow shader features mid-walk.
  const gpu=gpuTimer?.median();
  if(gpu!=null){
    // Measured GPU time says how far the ratio can move: step straight toward
    // the size that fits the budget, down at once, up after a short settle.
    const fit=pixelRatio*Math.sqrt(GPU_TARGET_MS/Math.max(gpu,1));
    if(gpu>GPU_HIGH_MS)next=Math.max(floor,Math.min(pixelRatio*.92,fit));
    else if(gpu<GPU_TARGET_MS*.85&&fps>27&&now-lastQualityChange>2500)next=Math.min(maxPixelRatio,pixelRatio+Math.min(.12,fit-pixelRatio));
  }
  // Without a GPU timer, hysteresis avoids oscillating around the 30 fps cap.
  else if(fps<26)next=Math.max(floor,pixelRatio*.84);
  else if(fps>29.5&&now-lastQualityChange>8000)next=Math.min(maxPixelRatio,pixelRatio+.06);
  if(Math.abs(next-pixelRatio)>.015){pixelRatio=next;renderer.setPixelRatio(pixelRatio);lastQualityChange=now;gpuTimer?.reset();}
}
function animate(now){
  requestAnimationFrame(animate);
  // Leave CPU/GPU time for the learning games and touch input. The paused
  // house needs only a still backdrop; walking is capped at a steady 30 fps.
  const interval=active?1000/30:1000,elapsed=now-lastDraw;
  if(elapsed<interval-.5)return;
  lastDraw+=Math.floor((elapsed+.5)/interval)*interval;
  framesDrawn++;
  adaptResolution(now);
  const dt=Math.min((now-last)/1000,.05);last=now;
  if(active&&world){
    // ←/→ turn the view: a tap turns a little, holding turns steadily, and it
    // stops the moment the key is let go — no drift after release. Both
    // together cancel. ↑/↓ walk forward and back.
    // On something (a swing, the car, the piano) the interaction moves the
    // pet and may steer the view; the walking below is skipped.
    const riding=interactions?.controls();
    const turnKeys=riding?0:(keys.has('ArrowLeft')?1:0)-(keys.has('ArrowRight')?1:0);
    if(turnKeys){turnRate+=(turnKeys*TURN_SPEED-turnRate)*(reducedMotion?1:1-Math.exp(-dt*10));yaw+=turnRate*dt;
      if(yaw>Math.PI||yaw<-Math.PI)yaw-=Math.PI*2*Math.round(yaw/(Math.PI*2));}
    else turnRate=0;
    const keyForward=(keys.has('ArrowUp')?1:0)-(keys.has('ArrowDown')?1:0);
    // (The touch pad still walks in any direction relative to the view.)
    let right=joy.x,forward=keyForward-joy.y;
    const n=Math.max(1,Math.hypot(right,forward));right/=n;forward/=n;
    const speed=keys.has('ShiftLeft')||keys.has('ShiftRight')?3.1:1.9;
    // A short ramp (~0.15 s) up to speed and down to a stop, like a creature
    // with some weight, rather than a cursor. Reduced motion keeps it instant.
    const want={x:(right*Math.cos(yaw)-forward*Math.sin(yaw))*speed,z:(-right*Math.sin(yaw)-forward*Math.cos(yaw))*speed};
    // Stopping is quicker than starting, so the pet halts where you let go.
    const blend=reducedMotion?1:1-Math.exp(-dt*(want.x||want.z?14:30));
    velocity.x+=(want.x-velocity.x)*blend;velocity.z+=(want.z-velocity.z)*blend;
    if(Math.hypot(velocity.x,velocity.z)<.02&&!want.x&&!want.z)velocity={x:0,z:0};
    const before={x:player.x,z:player.z};
    const steer=interactions?.tick(dt,now/1000);
    if(riding){
      velocity={x:0,z:0};if(steer&&Number.isFinite(steer.yaw)){yaw=steer.yaw;}
    }else{
      // Walk, jump and fall (physics.mjs). Take-off and touchdown bounce the body.
      const bounce=body.step(player,velocity.x*dt,velocity.z*dt,dt);
      if(bounce)life?.hop?.(bounce==='jump'?.6:.45);
      interactions?.landed(bounce);
      if(body.lost(player)){const safe=world.safeSpot(before.x,0,before.z)||world.safeSpot(player.x,0,player.z);if(safe)placePlayer(safe,yaw);}
    }
    life?.airborne?.(body.airborne);
    // Keep only the speed the walls actually allowed.
    if(dt>0){velocity.x=(player.x-before.x)/dt;velocity.z=(player.z-before.z)/dt;}
    life?.movement(player.x-before.x,player.z-before.z,Math.hypot(velocity.x,velocity.z));
    // Arrow steering: the pet faces where it is heading — it turns with the
    // view and backs up facing forward instead of spinning round.
    if(!riding&&(turnKeys||keyForward))life?.face(yaw+Math.PI);
    // The camera follows a smoothed floor height, so stairs don't jolt it; a
    // jump is quick and deliberate, so it keeps up more closely with that.
    focusY=THREE.MathUtils.lerp(focusY,player.y,reducedMotion?1:1-Math.exp(-dt*(body.airborne?20:12)));
    // (Not while riding something: hanging from the bars a metre up would
    // read as the floor above.)
    if(++frames%15===0&&!riding)updateLocation();
  }
  life?.tick(dt,now/1000,active);
  render();
}
let shading={};
// Warming shaders is only a head start (otherwise they compile on the first
// frames), so it never holds the house up for long: some graphics drivers
// are slow to report a finished compile, and three.js would wait for ever.
// A driver that never reported the first warm-up won't report the next one
// either, so after one time-out the pets' warm-up waits only briefly.
const WARM_LIMIT=query.get('bootwatch')==='fast'?3000:40000;
let warmTimedOut=false;
async function warmShaders(){
  if(!renderer.compileAsync)return;
  const limit=warmTimedOut?Math.min(WARM_LIMIT,3000):WARM_LIMIT;
  let timer;
  try{await Promise.race([renderer.compileAsync(scene,camera),new Promise(resolve=>{timer=setTimeout(()=>{warmTimedOut=true;
    console.warn(`Shader warm-up still running after ${limit/1000} s; opening the house without waiting for it.`);resolve();},limit);})]);}
  catch(error){console.warn('Shader warm-up skipped:',error.message);}
  finally{clearTimeout(timer);}
}
async function load(){
  try{
    boot.step('the house plan','Opening the front door…');
    const response=await fetch('./house.json?v='+DATA_VERSION);if(!response.ok)throw new Error('Model manifest unavailable');const data=await response.json();
    boot.step('the rooms','Loading rooms and gardens…');
    const meshResponse=await fetch('./house.mesh.gz?v='+data.meshSha256.slice(0,16));if(!meshResponse.ok)throw new Error('Model geometry unavailable');
    // Count the download (8 MB) so a slow connection shows progress, not a stall.
    const total=Number(meshResponse.headers.get('content-length'))||0;let got=0,shown=-1;
    const counted=meshResponse.body.pipeThrough(new TransformStream({transform(chunk,out){
      got+=chunk.byteLength;const pct=total?Math.min(99,Math.floor(got*100/total)):-1;
      if(total&&pct!==shown){shown=pct;boot.alive(`Loading rooms and gardens… ${pct}%`);}else boot.alive();
      out.enqueue(chunk);}}));
    const binaryPromise=new Response(counted.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    // Baked bounce light (baked-light.mjs; ?bake=0 turns it off for A/B) starts
    // downloading alongside the mesh. It is optional: once the house is ready
    // it waits at most BAKE_GRACE more, and any problem means the usual light.
    const bakeAbort=new AbortController();
    const bakedPending=query.get('bake')!=='0'&&data.bakedLight
      ?loadBakedLight(data,binaryPromise,{signal:bakeAbort.signal,timeoutMs:30000}).catch(error=>{console.warn('Baked lighting skipped:',error.message);return null;})
      :Promise.resolve(null);
    const binary=await binaryPromise;
    boot.step('the light and shade','Loading rooms and gardens…');
    let occlusion=null;
    try{occlusion=await loadHouseOcclusion(data,binary);}
    catch(error){console.warn('House ambient occlusion skipped:',error.message);}
    // Load milestones for QA (performance.getEntriesByType('mark')).
    performance.mark('house:occlusion');
    let bakedLight=null,baked=await Promise.race([bakedPending,new Promise(resolve=>setTimeout(resolve,BAKE_GRACE,'late'))]);
    if(baked==='late'){bakeAbort.abort();baked=null;}
    if(baked){
      // No mipmaps: the atlas packs thousands of islands a few texels apart, and
      // smaller mip levels would average neighbouring islands into each other.
      // Bounce light is soft, so plain bilinear filtering holds up at distance.
      const page=p=>{const t=new THREE.Texture(p.image);t.colorSpace=THREE.NoColorSpace;t.flipY=false;
        t.minFilter=THREE.LinearFilter;t.magFilter=THREE.LinearFilter;t.generateMipmaps=false;t.needsUpdate=true;return t;};
      bakedLight={houseLightDay:{value:page(baked.pages.day)},houseLightNight:{value:page(baked.pages.night)},
        houseLightScale:{value:new THREE.Vector2(baked.pages.day.scale,baked.pages.night.scale*BAKE_NIGHT)},
        houseLightBlend:{value:new THREE.Vector3(1,Math.PI*BAKE_GAIN,BAKE_REPLACE)}};
      lighting.useBakedLight(bakedLight.houseLightBlend.value);
    }
    performance.mark('house:baked-light');
    for(const g of data.groups){
      const array=new Float32Array(binary,g.offset,g.count*6),buffer=new THREE.InterleavedBuffer(array,6);
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.InterleavedBufferAttribute(buffer,3,0));geometry.setAttribute('normal',new THREE.InterleavedBufferAttribute(buffer,3,3));
      geometry.computeBoundingSphere();
      if(occlusion)geometry.setAttribute('houseOcclusion',new THREE.BufferAttribute(
        occlusion.bytes.subarray(g.offset/24,g.offset/24+g.count),1,true));
      // Moving parts (doors, swings) keep live light: their bake would stay put.
      if(baked)geometry.setAttribute('houseLightUV',new THREE.BufferAttribute(g.prop?new Uint16Array(g.count*2).fill(UNBAKED)
        :baked.uv.subarray(g.offset/12,g.offset/12+g.count*2),2,true));
      const material=createHouseMaterial(g,{ambientOcclusionStrength:occlusion?.strength??0,nearFade:query.get('nearfade')==='1',bakedLight});
      const mesh=new THREE.Mesh(geometry,material);mesh.name=g.name;
      mesh.castShadow=!material.transparent;mesh.receiveShadow=!material.transparent;
      mesh.layers.enable(1);scene.add(mesh);
      // A movable part: never frustum-culled by its old bounds, and left out of
      // the depth prepass, whose merged depth would stay where it was modelled.
      if(g.prop){(propMeshes[g.prop]??=[]).push(mesh);mesh.frustumCulled=false;material.userData.houseFinish=false;}
    }
    performance.mark('house:meshes');
    lighting.load(data);
    // The living-room computer, playing Craepets (monitor.mjs). Its screen is
    // the 'Monitor screen' box in build.py: on the desk in the front-window
    // corner, facing +x into the room.
    monitor=createMonitor(scene,renderer,{x:.352,y:1.05,z:-.66,w:.56,h:.32,facing:[1,0,0]});
    const contact=createContactShadows(scene,data.colliders||[]);
    // Compile the house shaders in parallel on the GPU process while the main
    // thread builds the camera guard and walking world. Only the screen
    // variants gate Start; the reflection-probe variants finish in the
    // background (the welcome card is up) and the first room probe waits
    // for them instead of compiling in-frame.
    performance.mark('house:lights');
    boot.step('the lights and colours','Getting the lights and colours ready…');
    // The pets' shared fur shader (and their tags') compile alongside the house's.
    const cast=warmupCast();scene.add(cast);
    const warming=warmShaders();lighting.warm();
    performance.mark('house:compile-issued');
    guard=createCameraGuard(binary,guardGroups(data.groups));
    world=new WalkingWorld(data.colliders,{height:1.05});
    body=new Body(world);
    // The sunroom's glass walls block walking too (see glazing.mjs).
    world.addBoxes(glazingBoxes(binary,data.groups,world));
    performance.mark('house:guard');
    await warming;scene.remove(cast);
    performance.mark('house:shaders');
    teleport(rooms[0]);
    // Capture the first room's reflections while the loading message is up.
    lighting.prime(player);
    performance.mark('house:probe');
    boot.step('your Craepets','Welcoming your Craepets…');
    life=await createHouseLife({scene,camera,world,player,rooms,teleport,place(p,heading){placePlayer(p,Number.isFinite(heading)?heading:yaw);render();},suspend,resume,showRooms,bindButton,photo(){render();return canvas.toDataURL('image/png');},get active(){return active;},get yaw(){return yaw;},reducedMotion});
    life.face(yaw+Math.PI,true);performance.mark('house:life');
    leaveHouse=()=>life.leave();
    // The Marauder's Map (marauders-map.mjs): where everyone in the house is.
    // Open, it takes over like the Rooms board; closed, walking carries on.
    map=createMaraudersMap({world,rooms,everyone:()=>life.everyone(),bindButton,reducedMotion,
      onOpen(){if(!$('rooms').hidden)showRooms(false);suspend();welcome.hidden=true;$('map-button').setAttribute('aria-expanded','true');},
      onClose(){$('map-button').setAttribute('aria-expanded','false');if(ready)resume();}});
    bindButton($('map-button'),()=>map.toggle());
    // Things to use with E (interactions.mjs): swings, the car, the fridge…
    interactions=createInteractions({scene,world,renderer,data,propMeshes,player,keys,life,body,bindButton,reducedMotion,
      tour:{setCameraRig(r){followRig.setRig(r);},hint(text,show){if(text)setHint(text,show);else setHint(finePointer()?KEYS_HINT:'Drag to look · left pad to walk · 🐾 to jump · tap an activity');}}});
    // The house follows the game's clock and weather (same as the HUD). The
    // lighting already starts on this hour's phase, so this rarely re-probes.
    if(life.sky){lighting.setClock(()=>PINNED_SKY||life.sky());lighting.prime(player);}
    // Pets, labels and markers bring their own materials.
    boot.step('your Craepets\' fur');
    await warmShaders();performance.mark('house:pets-compiled');render();performance.mark('house:first-frame');
    shading={contactShadows:contact?.count??0};
    if(failed)return;   // the graphics were lost while opening; boot.js offers a retry
    ready=true;boot.ready();
    start.disabled=false;start.textContent='Come play at home';$('loading').textContent='Your house is ready';
    // The ceiling light's soft shadow compiles in the background while the
    // welcome card is up, instead of adding to the load.
    // On this GPU (ANGLE/D3D11) a background compile still stalls frames for
    // ~2 s, so it starts only at the first pause, Rooms menu or activity after
    // play has begun (the scene is behind a panel then), and the switch waits
    // for a moment when nobody is walking.
    let playedOnce=false;
    const keyShadowLater=()=>{playedOnce||=active;if(!playedOnce||active){setTimeout(keyShadowLater,700);return;}lighting.enableKeyShadow(()=>active);};
    setTimeout(keyShadowLater,700);
    // Read-only diagnostic snapshot for repeatable local QA and family testing.
    // QA: jump to a room and look a given way (yaw/pitch in radians), so a
    // headless browser can photograph any corner of the house.
    window.houseTest={go(where,y=null,p=0){
        if(typeof where==='string'){const room=rooms.find(r=>r[1]===where);if(!room||!teleport(room))return false;}
        else{const spot=world.safeSpot(where.x,where.y,where.z);if(!spot)return false;placePlayer(spot,y??yaw);}
        if(y!==null)yaw=y;pitch=p;followRig.reset();render();return true;},
      get state(){return {ready,active,position:{...player},camera:camera.position.toArray(),cameraClearance:guard?guard.clearanceAt(camera.position):null,cameraBoom,cameraLift:cameraLift*180/Math.PI,cameraForward:camera.getWorldDirection(new THREE.Vector3()).toArray(),petCover:pet.cover,petOpacity:pet.avatar?pet.opacity:null,petShown:pet.avatar?pet.avatar.visible&&pet.opacity>0:null,yaw,pitch,arrivalYaw,fov:camera.fov,
      airborne:!!body?.airborne,verticalSpeed:body?.vy??0,jumps:body?.jumps??0,standingOn:standingOn(),
      map:map&&{open:map.isOpen,floor:map.floor,shown:map.shown},everyone:life.everyone(),interactions:interactions?.state??null,
      turned,pixelRatio,ambientOcclusion:!!occlusion,ambientOcclusionStrength:occlusion?.strength??0,framesDrawn,bakedLight:baked?{vertices:baked.bakedVertices,blend:bakedLight.houseLightBlend.value.toArray()}:null,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,jungleTriangles:jungle.triangles,gpuMs:gpuTimer?.median(1)??null,antialias:RENDER.aa,depthPrepass:{...renderer.houseDepthPrepass},programs:renderer.info.programs?.length??null,...shading,...lighting.diagnostics(),...life.diagnostics()};}};
  }catch(error){failed=true;console.error(error);$('loading').textContent='The house could not load. Try again, or go back to the Craepets game.';start.textContent='Try again';start.disabled=false;document.body.classList.add('house-failed');
    boot.fail(error,$('loading').textContent);}
}
// Loading starts before the first frame, so a problem drawing can't stop it.
load();animate(performance.now());
