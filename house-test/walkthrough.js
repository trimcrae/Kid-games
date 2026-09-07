import * as THREE from './vendor/three.module.min.js';
import {WalkingWorld} from './physics.mjs';
import {createHouseLife} from './house-life.mjs';
import {rooms} from './rooms.mjs';

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
try {
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
  renderer.setSize(innerWidth,innerHeight);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.18;
} catch(error) {
  $('loading').textContent='This browser could not start 3D graphics. Try a current browser with WebGL enabled.';
  start.textContent='3D graphics unavailable';
  throw error;
}
scene.add(new THREE.HemisphereLight(0xe8f2ff,0x9c8669,2.1));
const sun=new THREE.DirectionalLight(0xffeed1,2.2);sun.position.set(-10,28,15);scene.add(sun);
const fill=new THREE.DirectionalLight(0xd9e7ff,.65);fill.position.set(15,8,-15);scene.add(fill);

let world,life,player={x:5.65,y:.03,z:-.7},yaw=0,pitch=-.18,eyeY=1.63,active=false,ready=false,failed=false;
const keys=new Set();let joy={x:0,y:0},last=performance.now(),drag=null;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;

function teleport(room){
  const p=world.safeSpot(room[2],room[4],-room[3]);
  if(!p){$('hint').textContent='That starting point is unavailable. Choose a nearby room.';return false;}
  Object.assign(player,p);yaw=room[5];pitch=-.18;eyeY=p.y+1.60;
  $('location').textContent=room[1];$('level').textContent=room[0].toUpperCase();
  $('hint').textContent='WASD to walk · Drag to orbit · E for activities';
  render();return true;
}
function suspend(){active=false;keys.clear();endJoy();drag=null;document.exitPointerLock?.();$('touch-controls').style.visibility='hidden';}
function pause(){suspend();welcome.hidden=false;start.textContent='Continue exploring';}
async function resume(){
  if(!ready)return;if(life&&!life.hasPet()){life.adopt();return;}active=true;welcome.hidden=true;$('rooms').hidden=true;
  $('rooms-button').setAttribute('aria-expanded','false');$('touch-controls').style.visibility='visible';canvas.focus();
  $('hint').textContent='WASD to walk · Drag to orbit · E for activities';
}
function showRooms(show){
  $('rooms').hidden=!show;$('rooms-button').setAttribute('aria-expanded',String(show));
  if(show){suspend();welcome.hidden=true;}
  else if(ready){active=true;$('touch-controls').style.visibility='visible';canvas.focus();}
}
let section='';
for(const room of rooms){
  if(room[0]!==section){section=room[0];const h=document.createElement('h3');h.textContent=section.toUpperCase();$('room-list').append(h);}
  const row=document.createElement('div');row.className='room-row';row.dataset.room=room[1];
  const b=document.createElement('button');b.textContent=room[1];b.setAttribute('aria-label','Jump to '+room[1]);bindButton(b,()=>{if(ready&&teleport(room)){showRooms(false);resume();}});row.append(b);$('room-list').append(row);
}
bindButton(start,()=>failed?location.reload():resume());bindButton($('pause-button'),pause);bindButton($('help'),pause);
bindButton($('rooms-button'),()=>showRooms($('rooms').hidden));bindButton($('close-rooms'),()=>showRooms(false));
bindButton($('reset'),()=>{if(ready){teleport(rooms[0]);resume();}});
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&active&&matchMedia('(pointer:fine)').matches)$('hint').textContent='Drag to look · WASD to walk · Controls to pause';});
document.addEventListener('keydown',e=>{
  if(!$('activity-panel').hidden||!$('family-panel').hidden)return;
  if(e.code==='Escape'){if(!$('rooms').hidden)showRooms(false);else pause();return;}
  if(!active)return;
  if(e.code==='KeyE'){e.preventDefault();life?.interact();return;}
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}
});
document.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();joy={x:0,y:0};});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&ready)pause();});
function look(dx,dy){yaw-=dx*.0026;pitch=THREE.MathUtils.clamp(pitch-dy*.0026,-.8,.4);}
document.addEventListener('mousemove',e=>{if(active&&document.pointerLockElement===canvas)look(e.movementX,e.movementY);});
canvas.addEventListener('pointerdown',e=>{if(!active)return;if(!document.pointerLockElement){drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}});
canvas.addEventListener('pointermove',e=>{if(active&&drag?.id===e.pointerId){look(e.clientX-drag.x,e.clientY-drag.y);drag.x=e.clientX;drag.y=e.clientY;}});
function endDrag(){drag=null;}canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);
const joystick=$('joystick'),knob=joystick.firstElementChild;let joyId=null;
function updateJoy(e){const r=joystick.getBoundingClientRect();let x=(e.clientX-r.x-r.width/2)/38,y=(e.clientY-r.y-r.height/2)/38;const n=Math.max(1,Math.hypot(x,y));joy={x:x/n,y:y/n};knob.style.transform=`translate(${joy.x*32}px,${joy.y*32}px)`;}
joystick.addEventListener('pointerdown',e=>{if(!active)return;joyId=e.pointerId;joystick.setPointerCapture(e.pointerId);updateJoy(e);});
joystick.addEventListener('pointermove',e=>{if(e.pointerId===joyId)updateJoy(e);});
function endJoy(){joyId=null;joy={x:0,y:0};knob.style.transform='';}joystick.addEventListener('pointerup',endJoy);joystick.addEventListener('pointercancel',endJoy);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
const cameraTarget=new THREE.Vector3(),cameraDesired=new THREE.Vector3();
function render(){
  cameraTarget.set(player.x,player.y+.65,player.z);
  cameraDesired.set(player.x+Math.sin(yaw)*1.9*Math.cos(pitch),player.y+1.15-Math.sin(pitch)*1.9,player.z+Math.cos(yaw)*1.9*Math.cos(pitch));
  const fraction=world?world.cameraFraction(cameraTarget,cameraDesired):1;
  camera.position.copy(cameraTarget).lerp(cameraDesired,fraction);camera.lookAt(cameraTarget);
  renderer.render(scene,camera);
}
function updateLocation(){
  let closest=null,d=Infinity;
  for(const r of rooms){const dist=Math.hypot(player.x-r[2],player.z+r[3])+Math.abs(player.y-r[4])*12;if(dist<d){d=dist;closest=r;}}
  if(closest){$('location').textContent=closest[1];$('level').textContent=closest[0].toUpperCase();}
}
let frames=0,lastDraw=0;
function animate(now){
  requestAnimationFrame(animate);
  // Leave CPU/GPU time for the learning games and touch input. The paused
  // house needs only a still backdrop; walking is capped at a steady 30 fps.
  if(now-lastDraw<(active?1000/30:1000))return;lastDraw=now;
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
    for(const g of data.groups){
      const array=new Float32Array(binary,g.offset,g.count*6),buffer=new THREE.InterleavedBuffer(array,6);
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.InterleavedBufferAttribute(buffer,3,0));geometry.setAttribute('normal',new THREE.InterleavedBufferAttribute(buffer,3,3));
      geometry.computeBoundingSphere();
      const material=new THREE.MeshStandardMaterial({color:new THREE.Color(...g.color),roughness:.83,metalness:0,
        side:THREE.DoubleSide,transparent:g.glass,opacity:g.glass?.13:1,depthWrite:!g.glass});
      const mesh=new THREE.Mesh(geometry,material);mesh.name=g.name;scene.add(mesh);
    }
    world=new WalkingWorld(data.colliders,{height:1.05});teleport(rooms[0]);
    $('loading').textContent='Welcoming your Craepets…';
    life=await createHouseLife({scene,camera,world,player,rooms,teleport,suspend,resume,showRooms,bindButton,photo(){render();return canvas.toDataURL('image/png');},get active(){return active;},get yaw(){return yaw;},reducedMotion});
    ready=true;
    start.disabled=false;start.textContent='Come play at home';$('loading').textContent='Your house is ready';
    // Read-only diagnostic snapshot for repeatable local QA and family testing.
    window.houseTest={get state(){return {ready,active,position:{...player},camera:camera.position.toArray(),yaw,pitch,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,...life.diagnostics()};}};
  }catch(error){failed=true;console.error(error);$('loading').textContent='The house could not load. Refresh to try again.';start.textContent='Reload the house';start.disabled=false;}
}
animate(performance.now());load();
