import * as THREE from './vendor/three.module.min.js';
import {WalkingWorld} from './physics.mjs';
import {createHouseLife} from './house-life.mjs';
import {rooms} from './rooms.mjs';
import {createHouseMaterial} from './materials.mjs';
import {createHouseLighting} from './lighting.mjs';
import {loadHouseOcclusion} from './ambient-occlusion.mjs';

const $=id=>document.getElementById(id);
function bindButton(node,action){
  let lastTouch=-Infinity;
  node.addEventListener('pointerup',e=>{if(e.pointerType==='touch'&&!node.disabled){lastTouch=performance.now();e.preventDefault();action();}});
  node.addEventListener('click',()=>{if(performance.now()-lastTouch>500)action();});
}
const canvas=$('view'), welcome=$('welcome'), start=$('start');
const scene=new THREE.Scene();
scene.background=new THREE.Color('#c2d5d5');
scene.fog=new THREE.Fog('#c2d5d5',35,85);
const camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.045,120);
camera.rotation.order='YXZ';
let renderer;
const maxPixelRatio=Math.min(devicePixelRatio,1.35);
let pixelRatio=Math.min(maxPixelRatio,1),qualitySince=0,qualityFrames=0,lastQualityChange=0;
try {
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(innerWidth,innerHeight);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.AgXToneMapping;
  renderer.toneMappingExposure=1.05;
} catch(error) {
  $('loading').textContent='This browser could not start 3D graphics. Try a current browser with WebGL enabled.';
  start.textContent='3D graphics unavailable';
  throw error;
}
const lighting=createHouseLighting(scene,renderer,{mobile:matchMedia('(pointer:coarse)').matches});

let world,life,player={x:5.65,y:.03,z:-.7},yaw=0,pitch=-.18,eyeY=1.63,active=false,ready=false,failed=false;
const keys=new Set();let joy={x:0,y:0},last=performance.now(),drag=null;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;

function teleport(room){
  const p=world.safeSpot(room[2],room[4],-room[3]);
  if(!p){$('hint').textContent='That starting point is unavailable. Choose a nearby room.';return false;}
  Object.assign(player,p);yaw=room[5];pitch=-.18;eyeY=p.y+1.60;
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
// Only a refusal of a fair request — made from a click, not straight after an
// unlock — means the host blocks capture. Anything else just needs a click.
function lockFailed(){
  document.body.classList.remove('mouse-look');
  if(lockFair)lockDenied=true;
  if(active)$('hint').textContent=lockDenied?DRAG_HINT:CLICK_HINT;
}
async function captureMouse(){
  if(!finePointer()||!active||mouseLocked()||lockPending)return;
  const gesture=navigator.userActivation?navigator.userActivation.isActive:true;
  if(!gesture){$('hint').textContent=lockDenied?DRAG_HINT:CLICK_HINT;return;}
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
function suspend(){active=false;keys.clear();endJoy();drag=null;lockWanted=false;if(mouseLocked())document.exitPointerLock?.();$('touch-controls').style.visibility='hidden';}
function pause(){suspend();welcome.hidden=false;start.textContent='Continue exploring';}
async function resume(){
  if(!ready)return;if(life&&!life.hasPet()){life.adopt();return;}active=true;welcome.hidden=true;$('rooms').hidden=true;
  $('rooms-button').setAttribute('aria-expanded','false');$('touch-controls').style.visibility='visible';canvas.focus();
  $('hint').textContent=finePointer()?CAPTURED_HINT:'Drag to look · left pad to walk · tap an activity';
  if(!finePointer())return;
  lockWanted=true;await captureMouse();
  if(active&&!mouseLocked())$('hint').textContent=lockDenied?DRAG_HINT:CLICK_HINT;
}
function showRooms(show){
  const wasOpen=!$('rooms').hidden;
  $('rooms').hidden=!show;$('rooms-button').setAttribute('aria-expanded',String(show));
  if(show){suspend();welcome.hidden=true;}
  // Only closing the open panel returns to walking with the mouse; other
  // callers just tidy the panel away on the way to an activity.
  else if(ready){active=true;$('touch-controls').style.visibility='visible';canvas.focus();if(wasOpen&&finePointer()){lockWanted=true;captureMouse();}}
}
let section='';
for(const room of rooms){
  if(room[0]!==section){section=room[0];const h=document.createElement('h3');h.textContent=section.toUpperCase();$('room-list').append(h);}
  const row=document.createElement('div');row.className='room-row';row.dataset.room=room[1];
  const b=document.createElement('button');b.textContent=room[1];b.setAttribute('aria-label','Jump to '+room[1]);bindButton(b,()=>{if(ready&&teleport(room)){showRooms(false);resume();}});row.append(b);$('room-list').append(row);
}
bindButton(start,()=>failed?location.reload():resume());bindButton($('pause-button'),pause);bindButton($('help'),pause);
bindButton($('rooms-button'),()=>showRooms($('rooms').hidden));bindButton($('close-rooms'),()=>showRooms(false));
bindButton($('welcome-rooms'),()=>{if(ready)showRooms(true);});bindButton($('welcome-family'),()=>{if(ready)$('family-button').click();});
bindButton($('reset'),()=>{if(ready){teleport(rooms[0]);resume();}});
document.addEventListener('pointerlockchange',()=>{
  // A lock that lands after the house was paused (a panel opened while the
  // request was in flight) is handed straight back.
  if(mouseLocked()&&(!active||!lockWanted)){document.exitPointerLock();return;}
  const captured=mouseLocked();
  document.body.classList.toggle('mouse-look',captured);
  if(captured){lockDenied=false;drag=null;if(active)$('hint').textContent=CAPTURED_HINT;return;}
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
  life?.face(yaw+Math.PI);
}
document.addEventListener('mousemove',e=>{if(active&&mouseLocked())look(e.movementX,e.movementY);});
canvas.addEventListener('pointerdown',e=>{
  if(!active)return;
  // A mouse press asks for the lock and starts a drag; whichever the browser
  // allows takes effect, and a granted lock cancels the drag.
  if(e.pointerType==='mouse'&&!mouseLocked()){lockWanted=true;captureMouse();}
  if(e.pointerType==='mouse'&&mouseLocked())return;
  drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{if(!active||mouseLocked())return;if(drag?.id===e.pointerId){look(e.clientX-drag.x,e.clientY-drag.y);drag.x=e.clientX;drag.y=e.clientY;}});
function endDrag(){drag=null;}canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);
const joystick=$('joystick'),knob=joystick.firstElementChild;let joyId=null;
function updateJoy(e){const r=joystick.getBoundingClientRect();let x=(e.clientX-r.x-r.width/2)/38,y=(e.clientY-r.y-r.height/2)/38;const n=Math.max(1,Math.hypot(x,y));joy={x:x/n,y:y/n};knob.style.transform=`translate(${joy.x*32}px,${joy.y*32}px)`;}
joystick.addEventListener('pointerdown',e=>{if(!active)return;joyId=e.pointerId;joystick.setPointerCapture(e.pointerId);updateJoy(e);});
joystick.addEventListener('pointermove',e=>{if(e.pointerId===joyId)updateJoy(e);});
function endJoy(){joyId=null;joy={x:0,y:0};knob.style.transform='';}joystick.addEventListener('pointerup',endJoy);joystick.addEventListener('pointercancel',endJoy);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
const cameraTarget=new THREE.Vector3(),cameraDesired=new THREE.Vector3();
function render(){
  // A room probe renders six views. It must not hold up the activity iframe
  // and adoption controls while they are still loading.
  lighting.tick(player,performance.now(),ready);
  cameraTarget.set(player.x,player.y+.65,player.z);
  cameraDesired.set(player.x+Math.sin(yaw)*1.9*Math.cos(pitch),player.y+1.15-Math.sin(pitch)*1.9,player.z+Math.cos(yaw)*1.9*Math.cos(pitch));
  const fraction=world?world.cameraFraction(cameraTarget,cameraDesired):1;
  camera.position.copy(cameraTarget).lerp(cameraDesired,fraction);camera.lookAt(cameraTarget);
  renderer.render(scene,camera);
}
function updateLocation(){
  let closest=null,d=Infinity;
  for(const r of rooms){const dist=Math.hypot(player.x-r[2],player.z+r[3])+Math.abs(player.y-r[4])*12;if(dist<d){d=dist;closest=r;}}
  if(closest){$('location').textContent=closest[1];$('level').textContent=closest[0].toUpperCase();lighting.setRoom(closest[1],player);}
}
let frames=0,lastDraw=0;
function adaptResolution(now){
  if(!active||!ready){qualitySince=now;qualityFrames=0;return;}
  qualityFrames++;
  const elapsed=now-qualitySince;
  if(elapsed<1800)return;
  const fps=qualityFrames*1000/elapsed;
  qualityFrames=0;qualitySince=now;
  let next=pixelRatio;
  // Change only render size, never material/shadow shader features mid-walk.
  // Hysteresis avoids oscillating around the 30 fps cap or a room capture.
  if(fps<26)next=Math.max(Math.min(.6,maxPixelRatio),pixelRatio*.84);
  else if(fps>29.5&&now-lastQualityChange>8000)next=Math.min(maxPixelRatio,pixelRatio+.06);
  if(Math.abs(next-pixelRatio)>.015){pixelRatio=next;renderer.setPixelRatio(pixelRatio);lastQualityChange=now;}
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
    const speed=(keys.has('ShiftLeft')||keys.has('ShiftRight')?3.1:1.9)*dt;
    const before={x:player.x,z:player.z};
    world.move(player,(right*Math.cos(yaw)-forward*Math.sin(yaw))*speed,(-right*Math.sin(yaw)-forward*Math.cos(yaw))*speed);
    life?.movement(player.x-before.x,player.z-before.z);
    eyeY=THREE.MathUtils.lerp(eyeY,player.y+1.6,reducedMotion?1:1-Math.exp(-dt*16));
    if(++frames%15===0)updateLocation();
  }
  life?.tick(dt,now/1000,active);
  render();
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
    for(const g of data.groups){
      const array=new Float32Array(binary,g.offset,g.count*6),buffer=new THREE.InterleavedBuffer(array,6);
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.InterleavedBufferAttribute(buffer,3,0));geometry.setAttribute('normal',new THREE.InterleavedBufferAttribute(buffer,3,3));
      geometry.computeBoundingSphere();
      if(occlusion)geometry.setAttribute('houseOcclusion',new THREE.BufferAttribute(
        occlusion.bytes.subarray(g.offset/24,g.offset/24+g.count),1,true));
      const material=createHouseMaterial(g,{ambientOcclusionStrength:occlusion?.strength??0});
      const mesh=new THREE.Mesh(geometry,material);mesh.name=g.name;
      mesh.castShadow=!material.transparent;mesh.receiveShadow=!material.transparent;
      mesh.layers.enable(1);scene.add(mesh);
    }
    lighting.load(data);
    world=new WalkingWorld(data.colliders,{height:1.05});teleport(rooms[0]);
    $('loading').textContent='Welcoming your Craepets…';
    life=await createHouseLife({scene,camera,world,player,rooms,teleport,suspend,resume,showRooms,bindButton,photo(){render();return canvas.toDataURL('image/png');},get active(){return active;},get yaw(){return yaw;},reducedMotion});
    ready=true;
    start.disabled=false;start.textContent='Come play at home';$('loading').textContent='Your house is ready';
    // Read-only diagnostic snapshot for repeatable local QA and family testing.
    window.houseTest={get state(){return {ready,active,position:{...player},camera:camera.position.toArray(),yaw,pitch,
      mouseLocked:mouseLocked(),mouseLockDenied:lockDenied,turned,pixelRatio,ambientOcclusion:!!occlusion,ambientOcclusionStrength:occlusion?.strength??0,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,...lighting.diagnostics(),...life.diagnostics()};}};
  }catch(error){failed=true;console.error(error);$('loading').textContent='The house could not load. Refresh to try again.';start.textContent='Reload the house';start.disabled=false;}
}
animate(performance.now());load();
