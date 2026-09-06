import * as THREE from './vendor/three.module.min.js';
import {WalkingWorld} from './physics.mjs';

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

// Positions are eye-independent floor coordinates in the Blender house plan.
const rooms=[
  ['Main floor','Front entry',5.65,.7,0,0],
  ['Main floor','Living room',5.8,2.0,0,-1.25],
  ['Main floor','Kitchen',2,6.8,0,1.4],
  ['Main floor','Dining room',5.6,7.5,0,Math.PI],
  ['Main floor','Sunroom',5.0,8.6,-.10,0],
  ['Main floor','Garage',-.7,7.5,-.16,1.4],
  ['Upstairs','Upstairs hall',11.5,4.01,1.26,-Math.PI/2],
  ['Upstairs','Master bedroom',13.45,5.1,1.26,0],
  ['Upstairs','Master bathroom',12.98,8.9,1.26,0],
  ['Upstairs','Green bathroom',11.57,4.85,1.26,0],
  ['Upstairs','Nursery',12.5,3.0,1.26,Math.PI],
  ['Upstairs','End bedroom',15.8,4.1,1.26,-Math.PI/2],
  ['Downstairs','Family room',10.3,2.7,-1.05,-Math.PI/2],
  ['Downstairs','Shared bedroom entry',11.5,5.1,-1.05,0],
  ['Downstairs','Pink-curtain bedroom',10.4,6.2,-1.05,Math.PI/2],
  ['Downstairs','White-curtain bedroom',12.6,5.75,-1.05,-Math.PI/2],
  ['Downstairs','Downstairs bathroom',11.5,7.0,-1.05,0],
  ['Basement','Basement playroom',2.2,6.4,-3.15,Math.PI],
  ['Basement','Basement office',5.7,6.55,-3.15,Math.PI/2],
  ['Basement','Laundry',6.3,6.6,-3.15,0],
  ['Outside','Front porch',6.6,-2.0,-.06,Math.PI],
  ['Outside','Front yard',6.5,-5.9,-.82,Math.PI],
  ['Outside','Back yard',5.1,13.5,-.82,0],
];
let world,player={x:5.65,y:.03,z:-.7},yaw=0,pitch=0,eyeY=1.63,active=false,ready=false,failed=false;
const keys=new Set();let joy={x:0,y:0},last=performance.now(),drag=null;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;

function teleport(room){
  const p=world.safeSpot(room[2],room[4],-room[3]);
  if(!p){$('hint').textContent='That starting point is unavailable. Choose a nearby room.';return false;}
  player=p;yaw=room[5];pitch=0;eyeY=p.y+1.60;
  $('location').textContent=room[1];$('level').textContent=room[0].toUpperCase();
  $('hint').textContent='WASD to walk · Mouse to look · Esc for controls';
  render();return true;
}
function pause(){active=false;keys.clear();joy={x:0,y:0};document.exitPointerLock?.();welcome.hidden=false;start.textContent='Continue exploring';$('touch-controls').style.visibility='hidden';}
async function resume(){
  if(!ready)return;active=true;welcome.hidden=true;$('rooms').hidden=true;
  $('rooms-button').setAttribute('aria-expanded','false');$('touch-controls').style.visibility='visible';canvas.focus();
  if(matchMedia('(pointer:fine)').matches){try{await canvas.requestPointerLock();}catch{ $('hint').textContent='Drag to look · WASD to walk'; }}
}
function showRooms(show){
  $('rooms').hidden=!show;$('rooms-button').setAttribute('aria-expanded',String(show));
  if(show){active=false;keys.clear();document.exitPointerLock?.();welcome.hidden=true;$('touch-controls').style.visibility='hidden';}
  else if(ready){active=true;$('touch-controls').style.visibility='visible';canvas.focus();}
}
let section='';
for(const room of rooms){
  if(room[0]!==section){section=room[0];const h=document.createElement('h3');h.textContent=section.toUpperCase();$('room-list').append(h);}
  const b=document.createElement('button');b.textContent=room[1];bindButton(b,()=>{if(ready&&teleport(room)){showRooms(false);resume();}});$('room-list').append(b);
}
bindButton(start,()=>failed?location.reload():resume());bindButton($('pause-button'),pause);bindButton($('help'),pause);
bindButton($('rooms-button'),()=>showRooms($('rooms').hidden));bindButton($('close-rooms'),()=>showRooms(false));
bindButton($('reset'),()=>{if(ready){teleport(rooms[0]);resume();}});
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&active&&matchMedia('(pointer:fine)').matches)$('hint').textContent='Drag to look · WASD to walk · Controls to pause';});
document.addEventListener('keydown',e=>{
  if(e.code==='Escape'){if(!$('rooms').hidden)showRooms(false);else pause();return;}
  if(!active)return;
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}
});
document.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();joy={x:0,y:0};});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&ready)pause();});
function look(dx,dy){yaw-=dx*.0026;pitch=THREE.MathUtils.clamp(pitch-dy*.0026,-1.4,1.4);}
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
function render(){camera.position.set(player.x,eyeY,player.z);camera.rotation.set(pitch,yaw,0,'YXZ');renderer.render(scene,camera);}
function updateLocation(){
  let closest=null,d=Infinity;
  for(const r of rooms){const dist=Math.hypot(player.x-r[2],player.z+r[3])+Math.abs(player.y-r[4])*12;if(dist<d){d=dist;closest=r;}}
  if(closest){$('location').textContent=closest[1];$('level').textContent=closest[0].toUpperCase();}
}
let frames=0;
function animate(now){
  requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;
  if(active&&world){
    let right=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+joy.x;
    let forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-joy.y;
    const n=Math.max(1,Math.hypot(right,forward));right/=n;forward/=n;
    const speed=(keys.has('ShiftLeft')||keys.has('ShiftRight')?3.1:1.9)*dt;
    world.move(player,(right*Math.cos(yaw)-forward*Math.sin(yaw))*speed,(-right*Math.sin(yaw)-forward*Math.cos(yaw))*speed);
    eyeY=THREE.MathUtils.lerp(eyeY,player.y+1.6,reducedMotion?1:1-Math.exp(-dt*16));
    if(++frames%15===0)updateLocation();
  }
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
    world=new WalkingWorld(data.colliders);ready=true;teleport(rooms[0]);
    start.disabled=false;start.textContent='Start exploring';$('loading').textContent='Ready when you are';
    // Read-only diagnostic snapshot for repeatable local QA and family testing.
    window.houseTest={get state(){return {ready,active,position:{...player},yaw,pitch,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};}};
  }catch(error){failed=true;console.error(error);$('loading').textContent='The house could not load. Refresh to try again.';start.textContent='Reload the house';start.disabled=false;}
}
animate(performance.now());load();
