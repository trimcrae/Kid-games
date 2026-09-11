import * as THREE from './vendor/three.module.min.js';
import {WalkingWorld} from './physics.mjs';
import {createHouseLife} from './house-life.mjs';
import {rooms} from './rooms.mjs';
import {createHouseMaterial} from './materials.mjs';
import {createHouseLighting} from './lighting.mjs';
import {createContactShadows} from './contact-shadows.mjs';
import {createGpuTimer} from './gpu-timer.mjs';
import {installPostPass} from './post-aa.mjs';
import {loadHouseOcclusion} from './ambient-occlusion.mjs';
import {warmupCast} from './creatures.mjs';
import {createCameraGuard,guardGroups,nearPlaneReach,boomCamera,craneExtra,arrivalHeading} from './camera-guard.mjs';

const $=id=>document.getElementById(id);
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
// same 70° cap), so the pet doesn't fill the screen and more of the room shows.
let baseFov=57,lensFov=57;
function fitLens(){
  camera.aspect=innerWidth/innerHeight;
  baseFov=THREE.MathUtils.clamp(2*Math.atan(Math.tan(41*Math.PI/180)/camera.aspect)*180/Math.PI,50,70);
  camera.fov=lensFov=baseFov;
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
  // The pass also carries the highlight grade, so MSAA keeps a grade-only pass.
  installPostPass(renderer,camera,{mode:RENDER.aa==='msaa'?'grade':RENDER.aa});
  gpuTimer=createGpuTimer(renderer,camera);
} catch(error) {
  $('loading').textContent='This browser could not start 3D graphics. Try a current browser with WebGL enabled.';
  start.textContent='3D graphics unavailable';
  throw error;
}
const lighting=createHouseLighting(scene,renderer,{mobile:matchMedia('(pointer:coarse)').matches,camera,petLight:query.get('petlight')!=='0'});
if(query.get('shadow')==='basic')renderer.shadowMap.type=THREE.BasicShadowMap;

let guard=null,cameraClearance=lensClearance();
let world,life,player={x:5.65,y:.03,z:-.7},yaw=0,pitch=-.18,focusY=.03,active=false,ready=false,failed=false;
const keys=new Set();let joy={x:0,y:0},velocity={x:0,z:0},last=performance.now(),drag=null;
// The eased follow-camera state: crane swing and boom length.
let rigState=null,crane=null,arrivalYaw=null;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;

// Every way of putting the pet somewhere new — a jump, a family switch, a
// reload or an imported save — comes through here, so the camera, room name
// and lighting arrive with the pet instead of sweeping across floors to it.
function placePlayer(p,heading){
  Object.assign(player,p);pitch=-.18;focusY=p.y;velocity={x:0,z:0};rigState=null;crane=null;
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
  $('hint').textContent='WASD to walk · Mouse to aim · E for activities · R for rooms';
  render();return true;
}
// Desktop mouse look. Pointer lock pins the cursor and reports relative
// movement, so the view keeps turning as long as the mouse keeps moving —
// past a full turn, not just to the edge of the screen. Some hosts can refuse
// the lock (some in-app browsers, a sandboxed iframe, or Chrome's short
// cool-down straight after Escape); we never pretend it worked, we say so and
// hold-and-drag looking takes over.
const LOOK_SPEED=.0024,PITCH_MIN=-.8,PITCH_MAX=.42;
const finePointer=()=>matchMedia('(pointer:fine)').matches;
const mouseLocked=()=>document.pointerLockElement===canvas;
let lockWanted=false,lockPending=false,lockDenied=false,lockFair=false,lastUnlock=-Infinity,turned=0;
const CAPTURED_HINT='Mouse to aim · WASD to walk · E to interact · R for rooms · Esc to release';
const CLICK_HINT='Click the view to capture the mouse · WASD to walk';
const DRAG_HINT='Mouse capture was blocked here, so hold the button and drag to look. For full game-style mouse look, open this page in a regular Chrome or Edge tab';
// The hint line only shows when it asks for something (a click to capture the
// mouse, or the drag fallback). Everyday controls are taught by one-off coach
// marks in house-life.mjs instead of a permanent line of shortcuts.
function setHint(text,show=false){const h=$('hint');h.textContent=text;h.toggleAttribute('data-show',show);}
// Only a refusal of a fair request — made from a click, not straight after an
// unlock — means the host blocks capture. Anything else just needs a click.
function lockFailed(){
  document.body.classList.remove('mouse-look');
  if(lockFair)lockDenied=true;
  if(active)setHint(lockDenied?DRAG_HINT:CLICK_HINT,true);
}
async function captureMouse(){
  if(!finePointer()||!active||mouseLocked()||lockPending)return;
  const gesture=navigator.userActivation?navigator.userActivation.isActive:true;
  if(!gesture){setHint(lockDenied?DRAG_HINT:CLICK_HINT,true);return;}
  lockFair=performance.now()-lastUnlock>1500;lockPending=true;
  try{
    // Raw deltas keep the sensitivity steady across operating-system pointer
    // acceleration; not every platform offers them.
    try{await canvas.requestPointerLock({unadjustedMovement:true});}
    catch(error){
      if(error&&(error.name==='NotSupportedError'||error.name==='TypeError'))await canvas.requestPointerLock();
      else throw error;
    }
  }catch{lockFailed();}
  finally{lockPending=false;}
}
function suspend(){active=false;keys.clear();endJoy();drag=null;lockWanted=false;velocity={x:0,z:0};if(mouseLocked())document.exitPointerLock?.();$('touch-controls').style.visibility='hidden';}
// Pause is its own small sheet (the same #welcome overlay in pause mode, so
// the ids players, tests and tools rely on stay put): no onboarding copy.
function pause(){suspend();welcome.dataset.mode='pause';welcome.hidden=false;start.textContent='Keep playing';start.focus();}
async function resume(){
  if(!ready)return;if(life&&!life.hasPet()){life.adopt();return;}active=true;welcome.hidden=true;$('rooms').hidden=true;
  $('rooms-button').setAttribute('aria-expanded','false');$('touch-controls').style.visibility='visible';canvas.focus();
  setHint(finePointer()?CAPTURED_HINT:'Drag to look · left pad to walk · tap an activity');
  if(!finePointer())return;
  lockWanted=true;await captureMouse();
  if(active&&!mouseLocked())setHint(lockDenied?DRAG_HINT:CLICK_HINT,true);
}
function showRooms(show){
  const wasOpen=!$('rooms').hidden;
  $('rooms').hidden=!show;$('rooms-button').setAttribute('aria-expanded',String(show));
  if(show){suspend();welcome.hidden=true;}
  // Only closing the open panel returns to walking with the mouse; other
  // callers just tidy the panel away on the way to an activity.
  else if(ready){active=true;$('touch-controls').style.visibility='visible';canvas.focus();if(wasOpen&&finePointer()){lockWanted=true;captureMouse();}}
}
// A quick soft fade into the new room instead of a hard cut. The jump itself
// happens at once (inside the click, so the mouse capture still counts as a
// user gesture); the cream veil then lifts over ~0.3 s.
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
bindButton(start,()=>failed?location.reload():resume());bindButton($('pause-button'),pause);
bindButton($('rooms-button'),()=>showRooms($('rooms').hidden));bindButton($('close-rooms'),()=>showRooms(false));
bindButton($('welcome-rooms'),()=>{if(ready)showRooms(true);});bindButton($('welcome-family'),()=>{if(ready)$('family-button').click();});
bindButton($('reset'),()=>jumpTo(rooms[0]));
document.addEventListener('pointerlockchange',()=>{
  // A lock that lands after the house was paused (a panel opened while the
  // request was in flight) is handed straight back.
  if(mouseLocked()&&(!active||!lockWanted)){document.exitPointerLock();return;}
  const captured=mouseLocked();
  document.body.classList.toggle('mouse-look',captured);
  if(captured){lockDenied=false;drag=null;if(active)setHint(CAPTURED_HINT);return;}
  lastUnlock=performance.now();
  // Escape, a tab switch or a lost window all release the lock: park the house
  // behind the welcome card rather than leaving an invisible cursor walking.
  if(lockWanted&&active&&finePointer())pause();
});
document.addEventListener('pointerlockerror',lockFailed);
document.addEventListener('keydown',e=>{
  if(!$('activity-choices').hidden){if(e.code==='Escape')$('close-choices').click();return;}
  if(!$('activity-panel').hidden||!$('family-panel').hidden||!$('save-panel').hidden)return;
  if(e.code==='Escape'){if(!$('rooms').hidden)showRooms(false);else pause();return;}
  if(!active)return;
  if(e.code==='KeyR'){e.preventDefault();showRooms(true);return;}
  if(e.code==='KeyF'){e.preventDefault();$('family-button').click();return;}
  if(e.code==='KeyC'){e.preventDefault();$('pet-button').click();return;}
  if(e.code==='KeyE'){e.preventDefault();life?.interact();return;}
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}
});
document.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();joy={x:0,y:0};});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&ready)pause();});
function look(dx,dy){
  // Every report counts in full, so a fast flick turns as far as it travelled.
  const turn=dx*LOOK_SPEED;
  yaw-=turn;turned+=turn;
  // Horizontal turning is unlimited; the angle only wraps to stay precise.
  if(yaw>Math.PI||yaw<-Math.PI)yaw-=Math.PI*2*Math.round(yaw/(Math.PI*2));
  pitch=THREE.MathUtils.clamp(pitch-dy*LOOK_SPEED,PITCH_MIN,PITCH_MAX);
  // The view orbits freely; the pet only turns when it walks, so you can
  // circle round and see its face.
}
document.addEventListener('mousemove',e=>{if(active&&mouseLocked())look(e.movementX,e.movementY);});
// Fingers need a bigger turn per pixel than a mouse: a full swipe across a
// phone turns about 140°, whatever the screen width. Mouse dragging (the
// refused-lock fallback) keeps the desktop rate.
const touchLookGain=()=>THREE.MathUtils.clamp(2.6*390/innerWidth,1,2.6);
const joystick=$('joystick'),knob=joystick.firstElementChild;let joyId=null;
canvas.addEventListener('pointerdown',e=>{
  if(!active)return;
  // A mouse press asks for the lock and starts a drag; whichever the browser
  // allows takes effect, and a granted lock cancels the drag.
  if(e.pointerType==='mouse'&&!mouseLocked()){lockWanted=true;captureMouse();}
  if(e.pointerType==='mouse'&&mouseLocked())return;
  // A thumb landing low on the left becomes the walking pad right there.
  if(e.pointerType==='touch'&&joyId===null&&e.clientX<innerWidth*.42&&e.clientY>innerHeight*.4){
    const s=joystick.offsetWidth/2;joystick.style.left=(e.clientX-s)+'px';joystick.style.top=(e.clientY-s)+'px';joystick.style.bottom='auto';joystick.classList.add('floating');
    joyId=e.pointerId;try{canvas.setPointerCapture(e.pointerId);}catch{}updateJoy(e);return;
  }
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,gain:e.pointerType==='touch'?touchLookGain():1};
  // A pointer lock landing in the same moment makes capture throw; the lock then drives the view.
  try{canvas.setPointerCapture(e.pointerId);}catch{}
});
canvas.addEventListener('pointermove',e=>{if(e.pointerId===joyId){updateJoy(e);return;}if(!active||mouseLocked())return;if(drag?.id===e.pointerId){look((e.clientX-drag.x)*drag.gain,(e.clientY-drag.y)*drag.gain);drag.x=e.clientX;drag.y=e.clientY;}});
function endDrag(e){if(e&&e.pointerId===joyId){endJoy();return;}drag=null;}canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);
// A small dead zone so a resting thumb doesn't creep the pet along.
function updateJoy(e){const r=joystick.getBoundingClientRect();let x=(e.clientX-r.x-r.width/2)/40,y=(e.clientY-r.y-r.height/2)/40;const m=Math.hypot(x,y),n=Math.max(1,m);
  joy=m<.15?{x:0,y:0}:{x:x/n,y:y/n};knob.style.transform=`translate(${x/n*34}px,${y/n*34}px)`;}
joystick.addEventListener('pointerdown',e=>{if(!active)return;joyId=e.pointerId;joystick.setPointerCapture(e.pointerId);updateJoy(e);});
joystick.addEventListener('pointermove',e=>{if(e.pointerId===joyId)updateJoy(e);});
function endJoy(){joyId=null;joy={x:0,y:0};knob.style.transform='';if(joystick.classList.contains('floating')){joystick.classList.remove('floating');joystick.style.left=joystick.style.top=joystick.style.bottom='';}}
joystick.addEventListener('pointerup',endJoy);joystick.addEventListener('pointercancel',endJoy);
window.addEventListener('resize',()=>{fitLens();cameraClearance=lensClearance();renderer.setSize(innerWidth,innerHeight);});
// Follow camera. The guard's answer is where the camera may go this frame; it
// pulls in at once but eases back out and swings up/down smoothly, so walking
// past a door jamb no longer pops the view by a metre in one frame. Anything
// shown lies on a guarded boom no further out than the guard allowed.
function placeCamera(dt){
  const focus={x:player.x,y:focusY,z:player.z};
  // The full crane ladder is searched every few frames (or at once when the
  // chosen swing stops fitting); in between only the chosen swing is placed,
  // which keeps tight rooms as cheap as open ones.
  let pick;
  if(!crane||crane.age++>=3){const c=craneExtra(focus,yaw,pitch,world,guard,cameraClearance);crane={extra:c.extra,age:0};pick=c.view;}
  else{pick=boomCamera(focus,yaw,Math.max(-1.45,pitch+crane.extra),world,guard,cameraClearance);if(pick.distance<1.2)crane.age=3;}
  if(!rigState||reducedMotion)rigState={extra:crane.extra,distance:pick.distance};
  rigState.extra+=(crane.extra-rigState.extra)*(1-Math.exp(-dt*4));
  if(Math.abs(rigState.extra-crane.extra)<.004)rigState.extra=crane.extra;
  const view=rigState.extra===crane.extra?pick:boomCamera(focus,yaw,Math.max(-1.45,pitch+rigState.extra),world,guard,cameraClearance);
  const eased=rigState.distance+(view.distance-rigState.distance)*(1-Math.exp(-dt*3.5));
  rigState.distance=Math.min(view.distance,eased);
  if(rigState.distance>=view.distance-1e-4||view.distance<1e-4)return view;
  const s=rigState.distance/view.distance,t=view.target,p=view.position;
  const position={x:t.x+(p.x-t.x)*s,y:t.y+(p.y-t.y)*s,z:t.z+(p.z-t.z)*s};
  // A point inside the guarded boom can still pass close to a jamb edge. Step
  // out along the boom only as far as the near plane needs, rather than
  // jumping to the full length in one frame.
  if(guard&&guard.clearanceAt(position)<cameraClearance-.015){
    for(let d=rigState.distance+.08;d<view.distance;d+=.08){
      const k=d/view.distance,q={x:t.x+(p.x-t.x)*k,y:t.y+(p.y-t.y)*k,z:t.z+(p.z-t.z)*k};
      if(guard.clearanceAt(q)>=cameraClearance-.015){rigState.distance=d;return {target:t,position:q};}
    }
    rigState.distance=view.distance;return view;
  }
  return {target:t,position};
}
let lastRender=performance.now();
function render(){
  // A room probe renders six views. It must not hold up the activity iframe
  // and adoption controls while they are still loading.
  const now=performance.now(),dt=Math.min((now-lastRender)/1000,.1);lastRender=now;
  lighting.tick(player,now,ready);
  const view=placeCamera(dt);
  camera.position.set(view.position.x,view.position.y,view.position.z);camera.lookAt(view.target.x,view.target.y,view.target.z);
  const boom=Math.hypot(view.position.x-view.target.x,view.position.y-view.target.y,view.position.z-view.target.z);
  const wantFov=baseFov+THREE.MathUtils.clamp((1.4-boom)/.8,0,1)*(Math.min(70,baseFov+13)-baseFov);
  lensFov+=(wantFov-lensFov)*(reducedMotion?1:1-Math.exp(-dt*4));
  if(Math.abs(camera.fov-lensFov)>.05){camera.fov=lensFov;camera.updateProjectionMatrix();}
  renderer.render(scene,camera);
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
let frames=0,lastDraw=0;
// GPU budget per walking frame at the 30 fps cap, leaving room for the page
// compositor and the activity iframe. Fill cost scales with pixel count.
const GPU_TARGET_MS=25,GPU_HIGH_MS=30,PIXEL_FLOOR=.6;
function adaptResolution(now){
  gpuTimer?.poll();
  if(!active||!ready){qualitySince=now;qualityFrames=0;return;}
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
  adaptResolution(now);
  const dt=Math.min((now-last)/1000,.05);last=now;
  if(active&&world){
    let right=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+joy.x;
    let forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-joy.y;
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
    world.move(player,velocity.x*dt,velocity.z*dt);
    // Keep only the speed the walls actually allowed.
    if(dt>0){velocity.x=(player.x-before.x)/dt;velocity.z=(player.z-before.z)/dt;}
    life?.movement(player.x-before.x,player.z-before.z,Math.hypot(velocity.x,velocity.z));
    // The camera follows a smoothed floor height, so stairs don't jolt it.
    focusY=THREE.MathUtils.lerp(focusY,player.y,reducedMotion?1:1-Math.exp(-dt*12));
    if(++frames%15===0)updateLocation();
  }
  life?.tick(dt,now/1000,active);
  render();
}
let shading={};
async function warmShaders(){
  try{if(renderer.compileAsync)await renderer.compileAsync(scene,camera);}
  catch(error){console.warn('Shader warm-up skipped:',error.message);}
}
async function load(){
  try{
    const response=await fetch('./house.json');if(!response.ok)throw new Error('Model manifest unavailable');const data=await response.json();
    $('loading').textContent='Loading rooms and gardens…';
    const meshResponse=await fetch('./house.mesh.gz');if(!meshResponse.ok)throw new Error('Model geometry unavailable');
    const binary=await new Response(meshResponse.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    let occlusion=null;
    try{occlusion=await loadHouseOcclusion(data,binary);}
    catch(error){console.warn('House ambient occlusion skipped:',error.message);}
    // Load milestones for QA (performance.getEntriesByType('mark')).
    performance.mark('house:occlusion');
    for(const g of data.groups){
      const array=new Float32Array(binary,g.offset,g.count*6),buffer=new THREE.InterleavedBuffer(array,6);
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.InterleavedBufferAttribute(buffer,3,0));geometry.setAttribute('normal',new THREE.InterleavedBufferAttribute(buffer,3,3));
      geometry.computeBoundingSphere();
      if(occlusion)geometry.setAttribute('houseOcclusion',new THREE.BufferAttribute(
        occlusion.bytes.subarray(g.offset/24,g.offset/24+g.count),1,true));
      const material=createHouseMaterial(g,{ambientOcclusionStrength:occlusion?.strength??0,nearFade:query.get('nearfade')==='1'});
      const mesh=new THREE.Mesh(geometry,material);mesh.name=g.name;
      mesh.castShadow=!material.transparent;mesh.receiveShadow=!material.transparent;
      mesh.layers.enable(1);scene.add(mesh);
    }
    performance.mark('house:meshes');
    lighting.load(data);
    const contact=createContactShadows(scene,data.colliders||[]);
    // Compile the house shaders in parallel on the GPU process while the main
    // thread builds the camera guard and walking world. Only the screen
    // variants gate Start; the reflection-probe variants finish in the
    // background (the welcome card is up) and the first room probe waits
    // for them instead of compiling in-frame.
    performance.mark('house:lights');
    // The pets' shared fur shader (and their tags') compile alongside the house's.
    const cast=warmupCast();scene.add(cast);
    const warming=warmShaders();lighting.warm();
    performance.mark('house:compile-issued');
    guard=createCameraGuard(binary,guardGroups(data.groups));
    world=new WalkingWorld(data.colliders,{height:1.05});
    performance.mark('house:guard');
    await warming;scene.remove(cast);
    performance.mark('house:shaders');
    teleport(rooms[0]);
    // Capture the first room's reflections while the loading message is up.
    lighting.prime(player);
    performance.mark('house:probe');
    $('loading').textContent='Welcoming your Craepets…';
    life=await createHouseLife({scene,camera,world,player,rooms,teleport,place(p,heading){placePlayer(p,Number.isFinite(heading)?heading:yaw);render();},suspend,resume,showRooms,bindButton,photo(){render();return canvas.toDataURL('image/png');},get active(){return active;},get yaw(){return yaw;},reducedMotion});
    life.face(yaw+Math.PI,true);performance.mark('house:life');
    // The house follows the game's clock and weather (same as the HUD). The
    // lighting already starts on this hour's phase, so this rarely re-probes.
    if(life.sky){lighting.setClock(()=>life.sky());lighting.prime(player);}
    // Pets, labels and markers bring their own materials.
    await warmShaders();performance.mark('house:pets-compiled');render();performance.mark('house:first-frame');
    shading={contactShadows:contact?.count??0};
    ready=true;
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
    window.houseTest={get state(){return {ready,active,position:{...player},camera:camera.position.toArray(),cameraClearance:guard?guard.clearanceAt(camera.position):null,yaw,pitch,arrivalYaw,fov:camera.fov,
      mouseLocked:mouseLocked(),mouseLockDenied:lockDenied,turned,pixelRatio,ambientOcclusion:!!occlusion,ambientOcclusionStrength:occlusion?.strength??0,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,gpuMs:gpuTimer?.median(1)??null,antialias:RENDER.aa,...shading,...lighting.diagnostics(),...life.diagnostics()};}};
  }catch(error){failed=true;console.error(error);$('loading').textContent='The house could not load. Refresh to try again.';start.textContent='Reload the house';start.disabled=false;}
}
animate(performance.now());load();
