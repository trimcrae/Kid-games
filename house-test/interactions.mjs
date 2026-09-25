import * as THREE from './vendor/three.module.min.js';
import {createMonitor} from './monitor.mjs?v=20260916-use3';
import {hangBarInteractions} from './hang-bar.mjs?v=20260925-motion';
import {roombaInteractions} from './roomba.mjs?v=20260925-motion';
import {yotoInteractions} from './yoto.mjs?v=20260916-use3';
import {bedInteractions} from './beds.mjs?v=20260925-motion2';

// Things in the house you can use with E: swing on the swings, bounce on the
// trampoline, drive the burgundy car out of the garage, open the fridge, play
// the piano, switch the televisions and the ceiling fans on, rock in the
// rocking chairs, flush the toilets, sleep in any bed. The parts that move (fridge doors, car,
// swings, fan blades) come out of the export as their own draw groups and
// collision boxes tagged with a prop key (export_walkthrough.py); everything
// else is a spot in the house and a bit of behaviour. A prompt pill shows
// what E does here; while you're on something, E gets you off again.
//
// Three kinds: `toggle` acts at once (a door, a switch, a flush); `ride` puts
// the pet on something that moves it (a swing, a rocking chair) until any key;
// `drive` and `play` take the keys over (the car; the piano) until E or Esc.
const $=id=>document.getElementById(id);
// Plan (Blender) coordinates to the browser's: x, height, -y.
const at=(x,y,h)=>({x,y:h,z:-y});
const TAU=Math.PI*2;
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
// Match THREE.Matrix4.makeRotationY: local +X turns toward world -Z.
export const carPoint=(x,z,dx,dz,h)=>({x:x+dx*Math.cos(h)+dz*Math.sin(h),z:z-dx*Math.sin(h)+dz*Math.cos(h)});

// A tiny synth: piano notes, a car engine and horn, a fridge click, a flush.
// (No audio files; nothing to download.) Silent until the first press, as
// browsers require.
function createSounds(){
  let ctx=null;
  const ac=()=>{try{ctx??=new (window.AudioContext||window.webkitAudioContext)();if(ctx.state==='suspended')ctx.resume();}catch{}return ctx;};
  function tone(freq,{type='triangle',dur=.6,gain=.12,attack=.01,slide=null}={}){
    const c=ac();if(!c)return;const t=c.currentTime,o=c.createOscillator(),g=c.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(slide,t+dur);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+attack);g.gain.exponentialRampToValueAtTime(.0005,t+dur);
    o.connect(g).connect(c.destination);o.start(t);o.stop(t+dur+.05);
  }
  function noise(dur=1.2,gain=.1,from=1800,to=300){
    const c=ac();if(!c)return;const t=c.currentTime,n=Math.floor(c.sampleRate*dur),buf=c.createBuffer(1,n,c.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);
    const src=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();src.buffer=buf;f.type='lowpass';f.frequency.setValueAtTime(from,t);f.frequency.exponentialRampToValueAtTime(to,t+dur);
    g.gain.value=gain;src.connect(f).connect(g).connect(c.destination);src.start(t);
  }
  let engine=null;
  return {
    note(freq){tone(freq,{type:'triangle',dur:.9,gain:.14});tone(freq*2,{type:'sine',dur:.5,gain:.04});},
    click(){tone(900,{type:'square',dur:.05,gain:.05,attack:.002});},
    flush(){noise(1.6,.14,2200,200);tone(180,{type:'sine',dur:1.2,gain:.06,slide:60});},
    horn(){tone(392,{type:'sawtooth',dur:.35,gain:.09});tone(494,{type:'sawtooth',dur:.35,gain:.09});},
    boing(){tone(220,{type:'sine',dur:.35,gain:.08,slide:440});},
    // A soft, low hum: a triangle wave through a low-pass filter, silent
    // while the car stands still and never more than a murmur at full speed.
    // (The old raw sawtooth buzzed for the whole drive.)
    engine(rpm){
      const c=ac();if(!c)return;
      if(rpm===null){if(engine){engine.g.gain.setTargetAtTime(0,c.currentTime,.08);engine.o.stop(c.currentTime+.5);engine=null;}return;}
      if(!engine){
        const o=c.createOscillator(),f=c.createBiquadFilter(),g=c.createGain();
        o.type='triangle';f.type='lowpass';f.frequency.value=180;f.Q.value=.4;g.gain.value=0;
        o.connect(f).connect(g).connect(c.destination);o.start();engine={o,f,g};
      }
      engine.o.frequency.setTargetAtTime(38+rpm*50,c.currentTime,.15);
      engine.g.gain.setTargetAtTime(rpm<.02?0:.004+rpm*.012,c.currentTime,.2);
    },
  };
}

export function createInteractions({scene,world,renderer,data,propMeshes,player,keys,life,body,tour,bindButton,reducedMotion=false}){
  const sounds=createSounds();
  const pill=$('interact'),label=$('interact-label');
  const info=data.props||{},propBoxes={};
  for(const b of data.colliders)if(b.prop)(propBoxes[b.prop]??=[]).push(b);
  const meshesOf=key=>propMeshes[key]||[];
  // Pose a prop's meshes with one matrix (they were exported in place).
  function pose(key,matrix){for(const m of meshesOf(key)){m.matrixAutoUpdate=false;m.matrix.copy(matrix);m.matrixWorldNeedsUpdate=true;}}
  const _m=new THREE.Matrix4(),_a=new THREE.Matrix4(),_b=new THREE.Matrix4(),_v=new THREE.Vector3();
  // A turn about an axis through a point.
  function hinge(point,axis,angle){return _m.makeTranslation(point.x,point.y,point.z).multiply(_a.makeRotationAxis(axis,angle)).multiply(_b.makeTranslation(-point.x,-point.y,-point.z));}
  const list=[],ticking=[],debug={};
  let active=null,near=null,nearAt=0;

  // ----- the fridge: both French doors swing open, and there are the snacks.
  {
    const cx=(info['fridge-a']&&info['fridge-b'])?(info['fridge-a'].max[0]+info['fridge-b'].min[0])/2:2.68;
    const doors=[['fridge-a',info['fridge-a']?.min[0]??2.23,1],['fridge-b',info['fridge-b']?.max[0]??3.13,-1]];
    const front=Math.min(info['fridge-a']?.min[2]??-5.38,info['fridge-b']?.min[2]??-5.38);
    // What's inside, painted on the cabinet front where the doors were.
    const c=document.createElement('canvas');c.width=256;c.height=384;const g=c.getContext('2d');
    g.fillStyle='#eef3f5';g.fillRect(0,0,256,384);
    for(const y of [120,230,330]){g.fillStyle='#c9d3d8';g.fillRect(12,y,232,8);}
    const item=(x,y,w,h,col,r=6)=>{g.fillStyle=col;g.beginPath();g.roundRect(x,y,w,h,r);g.fill();};
    item(20,52,44,68,'#fdfdfd');item(20,52,44,14,'#4c8fd6');           // milk
    item(72,44,50,76,'#f6a53a');g.fillStyle='#fff';g.font='bold 22px sans-serif';g.fillText('🧃',80,100);
    item(132,66,52,54,'#ee6c6c',26);item(190,60,44,60,'#7cc05a');      // apples, pickles
    item(20,168,64,62,'#f7e07a');item(96,178,60,52,'#fff');item(96,178,60,10,'#e8b04a');   // cheese, eggs
    g.fillStyle='#e0dcd2';for(let i=0;i<6;i++){g.beginPath();g.ellipse(106+i*10,205,6,8,0,0,TAU);g.fill();}
    item(170,166,64,64,'#a3d3f0',30);g.fillStyle='#2f7f78';g.font='16px sans-serif';g.fillText('🐟',192,210);
    item(20,262,90,68,'#ef8f6a');item(120,270,50,60,'#c9e6a3');item(180,258,54,72,'#f2c7e0');   // pizza, broccoli, cake
    g.fillStyle='#3b2e25';g.font='bold 15px ui-rounded,system-ui,sans-serif';g.fillText('Cat food · Bubba & Beebs',22,368);
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
    const inside=new THREE.Mesh(new THREE.PlaneGeometry(.88,1.28),new THREE.MeshStandardMaterial({map:tex,roughness:.7,emissive:'#ffffff',emissiveMap:tex,emissiveIntensity:.25}));
    inside.position.set(cx,1.235,front+.075);inside.rotation.y=Math.PI;inside.visible=false;scene.add(inside);
    let open=false,angle=0;
    // The export's static door boxes remain indexed at their closed position.
    // Register a second set over the whole swing, then move those boxes with
    // the drawn doors; the walking world's grid has no removal operation.
    const movingDoors=doors.map(([key,hx,dir])=>{
      const originals=propBoxes[key]||[];
      const rotated=(b,a)=>{
        const s=Math.sin(dir*a*1.75),c=Math.cos(dir*a*1.75),zs=front+.04;
        const points=[];
        for(const x of [b.min[0],b.max[0]])for(const z of [b.min[2],b.max[2]])points.push([hx+(x-hx)*c+(z-zs)*s,zs-(x-hx)*s+(z-zs)*c]);
        return {min:[Math.min(...points.map(p=>p[0])),b.min[1],Math.min(...points.map(p=>p[1]))],max:[Math.max(...points.map(p=>p[0])),b.max[1],Math.max(...points.map(p=>p[1]))]};
      };
      const boxes=originals.map(b=>{
        const closed={min:[...b.min],max:[...b.max]},end=rotated(closed,1);
        const sweep={name:b.name,min:[Math.min(closed.min[0],end.min[0])-1,closed.min[1],Math.min(closed.min[2],end.min[2])-1],max:[Math.max(closed.max[0],end.max[0])+1,closed.max[1],Math.max(closed.max[2],end.max[2])+1]};
        world.addBoxes([sweep]);
        b.min=[1e6,1e6,1e6];b.max=[1e6+1,1e6+1,1e6+1];
        return {source:closed,box:sweep};
      });
      return {key,hx,dir,boxes,rotated};
    });
    const doorBounds=a=>movingDoors.flatMap(d=>d.boxes.map(v=>d.rotated(v.source,a)));
    const touchesPet=a=>doorBounds(a).some(b=>player.y<b.max[1]&&player.y+world.height>b.min[1]&&
      Math.hypot(player.x-Math.max(b.min[0],Math.min(player.x,b.max[0])),player.z-Math.max(b.min[2],Math.min(player.z,b.max[2])))<world.radius+.03);
    list.push({id:'fridge',icon:'🧊',name:'Open the fridge',kind:'toggle',at:{x:cx,y:0,z:front-.85},radius:1.2,face:{x:cx,z:front},
      label:()=>open?'Close the fridge':'Open the fridge',
      start(){open=!open;sounds.click();if(open)life.say(['Mmm, snacks!','Cheese!','Who ate the cake?','Cat food for Bubba and Beebs.'][Math.floor(Math.random()*4)],2600);}});
    ticking.push(dt=>{
      const want=open?1:0,next=angle+(want-angle)*(reducedMotion?1:1-Math.exp(-dt*7));
      // Closing pauses when the pet stands in either door's path.
      if(open||!touchesPet(next))angle=next;
      inside.visible=angle>.02;
      for(const d of movingDoors){
        pose(d.key,hinge({x:d.hx,y:0,z:front+.04},new THREE.Vector3(0,1,0),d.dir*angle*1.75));
        for(const v of d.boxes){const b=d.rotated(v.source,angle);v.box.min=b.min;v.box.max=b.max;}
      }
    });
  }
  // ----- ceiling fans spin up (and down) when you switch them.
  for(const [key,name,room,radius] of [['fan-family','the family room fan',{x:12.24,y:-1.05,z:-2.3},1.7],['fan-primary',"Mom & Dad's fan",{x:13.99,y:1.26,z:-6.71},2.4]]){
    const b=info[key];if(!b)continue;
    const centre={x:(b.min[0]+b.max[0])/2,y:(b.min[1]+b.max[1])/2,z:(b.min[2]+b.max[2])/2};let on=false,speed=0,spin=0;
    list.push({id:key,icon:'🌀',name:'Switch on '+name,kind:'toggle',at:room,radius,label:()=>(on?'Switch off ':'Switch on ')+name,start(){on=!on;sounds.click();}});
    ticking.push(dt=>{speed+=((on?7:0)-speed)*(reducedMotion?1:1-Math.exp(-dt*1.2));if(speed<.01&&!on)return;spin=(spin+speed*dt)%TAU;pose(key,hinge(centre,new THREE.Vector3(0,1,0),spin));});
  }
  // ----- the televisions show Craepets (the same frame as the screen).
  for(const [id,name,screen,room] of [
    ['tv-living','the living-room TV',{x:2.75,y:.985,z:-4.03,w:.95,h:.53,facing:[0,0,1]},{x:2.75,y:0,z:-3.05}],
    ['tv-family','the family-room TV',{x:14.505,y:.82,z:-2.3,w:1.56,h:.55,facing:[-1,0,0]},{x:13.3,y:-1.05,z:-2.3}]]){
    const tv=createMonitor(scene,renderer,screen);tv.setOn(false);
    list.push({id,icon:'📺',name:'Switch on '+name,kind:'toggle',at:room,radius:1.6,face:{x:screen.x,z:screen.z},label:()=>(tv.on?'Switch off ':'Switch on ')+name,start(){tv.setOn(!tv.on);sounds.click();}});
    ticking.push(()=>tv.tick());
  }
  // ----- toilets flush. (Kids.)
  for(const [id,spot,face] of [['flush-up',{x:10.66,y:1.26,z:-5.9},{x:10.36,z:-6.5}],['flush-down',{x:11.41,y:-1.05,z:-7.66},{x:11.55,z:-8.46}]]){
    list.push({id,icon:'🚽',name:'Flush',kind:'toggle',at:spot,radius:1.0,face,start(){sounds.flush();life.say('Whooooosh!',2000);life.hop(.8);}});
  }
  // ----- the swings: sit on one and it swings you, higher and higher.
  for(const key of ['swing-a','swing-b']){
    const b=info[key];if(!b)continue;
    const px=(b.min[0]+b.max[0])/2,top=1.16,seatY=-.38,seatZ=-24.92,pivot={x:px,y:top,z:-25.0},rope=top-seatY;
    let t=0,amp=0,mount=0,from=null,riding=false,settle=0,dismount=null;
    const swingPose=a=>pose(key,hinge(pivot,new THREE.Vector3(1,0,0),-a));
    ticking.push(dt=>{
      if(dismount){
        if(!body.airborne||Math.hypot(player.x-dismount.x,player.z-dismount.z)>1.5)dismount=null;
        else{
          dismount.t=Math.min(1,dismount.t+dt/(reducedMotion ? .01 : .32));
          player.x=dismount.x+(dismount.spot.x-dismount.x)*dismount.t;
          player.z=dismount.z+(dismount.spot.z-dismount.z)*dismount.t;
          if(dismount.t>=1)dismount=null;
        }
      }
      if(riding||settle<=0)return;
      t+=dt;settle=Math.max(0,settle-dt);
      const a=reducedMotion?0:Math.sin(t*Math.sqrt(9.8/rope))*amp*(settle/2);
      swingPose(a);
      if(!settle){amp=0;swingPose(0);}
    });
    list.push({id:key,icon:'🎠',name:'Swing',kind:'ride',at:{x:px,y:-.82,z:-23.95},radius:1.2,
      start(){from={...player};t=0;amp=0;mount=0;riding=true;settle=0;dismount=null;},
      tick(dt){
        t+=dt;mount=Math.min(1,mount+dt/.55);amp+=(0.95-amp)*(reducedMotion?1:1-Math.exp(-dt*.5));
        const a=reducedMotion?0:Math.sin(t*Math.sqrt(9.8/rope))*amp;
        swingPose(a);
        // The seat hangs under the pivot, out along the swing's angle.
        const k=mount*mount*(3-2*mount);
        player.x=from.x+(px-from.x)*k;player.y=from.y+(pivot.y-Math.cos(a)*rope+.03-from.y)*k;player.z=from.z+(pivot.z+Math.sin(a)*rope+.08-from.z)*k;
        life.face(0);life.ride({dx:0,dy:0,dz:0,tilt:-a*.6,pose:{sit:k},expression:amp>.5?'happy':undefined});
        if((Math.abs(a)>.7&&Math.sign(a)!==Math.sign(lastA)))sounds.boing();lastA=a;
        // Look from the open side of each swing. The former sides put a tree
        // trunk and a front frame leg over the rider through much of the arc.
        return {yaw:key==='swing-a'?Math.PI/2:-Math.PI/2};
      },
      stop(){
        riding=false;settle=reducedMotion?0:2;life.ride(null);
        // Push clear of the seat while falling, instead of leaving the pet
        // standing on its moving collider above the lawn.
        const spot=world.safeSpot(from.x,from.y,from.z)||from;
        dismount={x:player.x,z:player.z,spot,t:0};player.y+=.2;
        body.airborne=true;body.vy=0;
        if(!settle)swingPose(0);
      }});
  }
  let lastA=0;
  // ----- rocking chairs: sit and rock.
  for(const [id,seat,heading,spot] of [['rocker-nursery',{x:13.1,y:1.84,z:-1.33},-Math.PI/2,{x:12.5,y:1.26,z:-1.33}],['rocker-porch-a',{x:.55,y:.53,z:1.3},-Math.PI/2,{x:1.05,y:-.06,z:1.4}],['rocker-porch-b',{x:.55,y:.53,z:.42},-Math.PI/2,{x:1.0,y:-.06,z:.6}]]){
    let t=0,from=null,mount=0,dismount=null;
    ticking.push(dt=>{
      if(!dismount)return;
      if(active||['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].some(k=>keys.has(k))||
         Math.hypot(player.x-dismount.lastX,player.z-dismount.lastZ)>.45||
         Math.abs(player.y-dismount.lastY)>1){dismount=null;return;}
      dismount.t=Math.min(1,dismount.t+dt/(reducedMotion?.01:.36));
      const k=dismount.t*dismount.t*(3-2*dismount.t);
      player.x=dismount.x+(dismount.spot.x-dismount.x)*k;
      player.z=dismount.z+(dismount.spot.z-dismount.z)*k;
      // The old seat may catch the paws during the horizontal departure.
      // Keep the body in its fall until it is clear of the rocker.
      body.airborne=true;
      dismount.lastX=player.x;dismount.lastY=player.y;dismount.lastZ=player.z;
      if(dismount.t===1)dismount=null;
    });
    list.push({id,icon:'🪑',name:'Rock in the chair',kind:'ride',at:spot,radius:1.0,
      start(){t=0;mount=0;from={...player};dismount=null;life.face(heading+Math.PI);},
      tick(dt){t+=dt;mount=Math.min(1,mount+dt/(reducedMotion?.01:.5));const k=mount*mount*(3-2*mount);
        // Rise beside the arm first, then pass over the seat, then settle.
        const across=Math.max(0,Math.min(1,(k-.28)/.62));
        player.x=from.x+(seat.x-from.x)*across;player.z=from.z+(seat.z-from.z)*across;
        player.y=k<.28?from.y+(seat.y+.08-from.y)*(k/.28):k<.9?seat.y+.08:seat.y+.08*(1-(k-.9)/.1);
        const rock=reducedMotion?0:Math.sin(t*2.2)*.12;
        life.ride({dy:Math.abs(rock)*.05,tilt:rock*k,pose:{sit:k}});
      },
      stop(){life.ride(null);const landing=world.safeSpot(from.x,from.y,from.z)||spot;
        dismount={x:player.x,z:player.z,lastX:player.x,lastY:player.y,lastZ:player.z,spot:landing,t:0};
        body.airborne=true;body.vy=0;
      }});
  }
  // ----- the piano: E to sit down, then the keys play a scale.
  {
    const notes=[['C',261.63],['D',293.66],['E',329.63],['F',349.23],['G',392.0],['A',440.0],['B',493.88],['C',523.25]];
    const codes={Digit1:0,Digit2:1,Digit3:2,Digit4:3,Digit5:4,Digit6:5,Digit7:6,Digit8:7,KeyA:0,KeyS:1,KeyD:2,KeyF:3,KeyG:4,KeyH:5,KeyJ:6,KeyK:7};
    let from=null,mount=0,dismount=null;
    const cushion=data.colliders.find(b=>b.name==='Clean folded green floor cushion');
    ticking.push(dt=>{
      if(!dismount)return;
      if(active||['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].some(k=>keys.has(k))||
         Math.hypot(player.x-dismount.lastX,player.z-dismount.lastZ)>.45||
         Math.abs(player.y-dismount.lastY)>1){dismount=null;return;}
      dismount.t=Math.min(1,dismount.t+dt/(reducedMotion?.01:.42));
      const k=dismount.t*dismount.t*(3-2*dismount.t);
      player.x=dismount.x+(dismount.spot.x-dismount.x)*k;
      player.z=dismount.z+(dismount.spot.z-dismount.z)*k;
      const inside=cushion&&player.x>=cushion.min[0]-.1&&player.x<=cushion.max[0]+.1&&player.z>=cushion.min[2]-.1&&player.z<=cushion.max[2]+.1;
      if(inside)player.y=Math.max(player.y,cushion.max[1]+.03);
      else{dismount.cleared??=k;player.y=dismount.seatY+(dismount.spot.y-dismount.seatY)*Math.min(1,(k-dismount.cleared)/Math.max(.01,1-dismount.cleared));}
      dismount.lastX=player.x;dismount.lastY=player.y;dismount.lastZ=player.z;
      if(dismount.t===1){player.y=dismount.spot.y;body.reset(player);dismount=null;}
    });
    list.push({id:'piano',icon:'🎹',name:'Play the piano',kind:'play',at:{x:10.8,y:-1.05,z:-1.6},radius:1.2,face:{x:10.3,z:-1.41},
      hint:'Play with 1–8 (or A S D F G H J K): C D E F G A B C · E when you\'re done',
      start(){from={...player};mount=0;dismount=null;life.face(-Math.PI/2);},
      tick(dt){mount=Math.min(1,mount+dt/.5);const k=mount*mount*(3-2*mount);
        player.x=from.x+(10.75-from.x)*k;player.z=from.z+(-1.43-from.z)*k;player.y=from.y;
        // The floor cushion here is 35 cm high; put the body on it, facing
        // the keybed instead of leaving a seated pose standing by the piano.
        life.ride({dy:.35*k,pose:{sit:k}});
        return {yaw:Math.PI};
      },
      key(code){const i=codes[code];if(i===undefined)return false;const [name,f]=notes[i];sounds.note(f);life.hop(.35);life.say(`♪ ${name}`,700);return true;},
      stop(){if(from){const spot=world.safeSpot(from.x,from.y,from.z)||from;
        const seated=mount*mount*(3-2*mount);
        player.y+=.35*seated;life.ride(null);
        dismount={x:player.x,z:player.z,seatY:player.y,lastX:player.x,lastY:player.y,lastZ:player.z,spot,t:0,cleared:null};
        body.airborne=true;body.vy=0;
      }else life.ride(null);}});
  }
  // ----- the cars: get in either and drive it out of the garage.
  debug.cars={};
  for(const [key,colour,glass] of [['car','burgundy','#1e2b33'],['car2','black','#171d22']]){
    const b=info[key];if(!b)continue;
    const home={x:(b.min[0]+b.max[0])/2,y:b.min[1]+.08,z:(b.min[2]+b.max[2])/2};
    // It stands on the garage floor (its tyres were modelled a touch below it).
    {const f=world.floor(home.x,home.z,b.min[1]+.3);if(Number.isFinite(f))home.y=f;}
    const halfW=(b.max[0]-b.min[0])/2-.05,halfL=(b.max[2]-b.min[2])/2-.05;
    const car={x:home.x,y:home.y,z:home.z,heading:0,speed:0,parked:true,lastFit:null};
    debug.cars[key]=car;
    const boxes=propBoxes[key]||[],saved=boxes.map(x=>({min:[...x.min],max:[...x.max]}));
    // Glass you can see the driver through.
    for(const m of meshesOf(key))if(/glass/i.test(m.name))m.material=new THREE.MeshPhysicalMaterial({color:glass,roughness:.12,metalness:.1,transparent:true,opacity:.45});
    // Turned about where it was modelled, then moved by how far it has gone.
    function place(){pose(key,_m.makeTranslation(car.x-home.x,car.y-home.y,car.z-home.z).multiply(_a.makeTranslation(home.x,home.y,home.z)).multiply(_b.makeRotationY(car.heading)).multiply(new THREE.Matrix4().makeTranslation(-home.x,-home.y,-home.z)));}
    function corner(dx,dz,h=car.heading){return carPoint(car.x,car.z,dx,dz,h);}
    // Where the car is tested against the world: the corners, the middle of
    // each end, the centre and halfway along each side (so a wall's end cannot
    // slip between two samples when the car swings round).
    const SAMPLES=[[0,0],[halfW,halfL],[-halfW,halfL],[halfW,-halfL],[-halfW,-halfL],[0,halfL],[0,-halfL],[halfW,halfL/2],[-halfW,halfL/2],[halfW,-halfL/2],[-halfW,-halfL/2]];
    // What the car drives over. It is a toy car in a kids' game, so it is
    // generous: anything flat up to CLIMB above its wheels it simply rides up
    // onto (kerbs, the graded apron, the porch, a garden bed, a bush, the
    // bus-stop bench), and any *thing* lower than CLEAR it barrels straight
    // over (garden chairs, the front steps, the toy house, tree stakes,
    // bins). Walls are still walls, though: a thin, long box that stands
    // tall or floats above the ground — a wall, a sill, a fence or porch rail
    // — is solid from kerb height (KERB) up, so the car can never mount a
    // window sill and drive into the living room. Tall things (the mailbox,
    // the swing frame, poles, trees, the other car) stop it too.
    const CLIMB=.8,CLEAR=1.1,KERB=.3;
    const shape=b=>b.carShape??=(()=>{const w=b.max[0]-b.min[0],d=b.max[2]-b.min[2],h=b.max[1]-b.min[1];return {thin:Math.min(w,d)<=.35&&Math.max(w,d)>=1.2,tall:h>=.3,broad:Math.min(w,d)>=.5,slab:h<=.12};})();
    // Ground is anything broad, or a thin slab lying about the car's level
    // (the strips of a graded ramp): never a rail floating above it.
    const ground=b=>{const s=shape(b);return s.broad||(s.slab&&b.min[1]<=car.y+KERB);};
    const wall=(b,y)=>{const s=shape(b);return s.thin&&(s.tall||b.min[1]>y+KERB);};
    // The ground under one point of the car: the highest such top not far
    // above the body, however far below (the driveway falls away under the
    // back of a car nosing out of the garage; the old walking-step test saw
    // "no floor" there and the car stuck at the threshold).
    const groundAt=(px,pz)=>{
      let top=-Infinity;
      for(const b of world.nearby(px,pz,.1)){
        if(b.max[1]>car.y+CLIMB||b.max[1]<car.y-1.5||!ground(b))continue;
        if(px>=b.min[0]-.10&&px<=b.max[0]+.10&&pz>=b.min[2]-.10&&pz<=b.max[2]+.10)top=Math.max(top,b.max[1]);
      }
      return Number.isFinite(top)?top:null;
    };
    // How far one point of the car is pushed into anything solid at body
    // height: the overlap with each box (the walking radius outside it, and
    // deeper still inside), so pressing further in always reads worse and
    // easing out always reads better.
    const R=world.radius;
    function squeeze(px,pz,y){
      let d=0;
      for(const b of world.nearby(px,pz,R)){
        if(b.max[1]<=y+(wall(b,y)?KERB:CLEAR)||b.min[1]>=y+world.height)continue;
        const ix=Math.min(px-b.min[0],b.max[0]-px),iz=Math.min(pz-b.min[2],b.max[2]-pz);
        const sd=ix>=0&&iz>=0?-Math.min(ix,iz):Math.hypot(Math.max(0,-ix),Math.max(0,-iz));
        if(sd<R)d+=R-sd;
      }
      return d;
    }
    // How badly the car would sit at (x,z,heading): the sample points' total
    // squeeze against walls and such. A point over nothing at all is a seam
    // between the exported lawn pieces or the brink of the world: fine while
    // most of the car is still on something (it may hang over an edge but
    // not drive off into the void). A move is allowed when it makes things
    // no worse — so the car can always slide along a wall it has met at an
    // angle, and one that has somehow ended up in a wall can always back out
    // (the old blocked-corner count let it grind on through instead, or
    // pinned it where no move changed the count).
    function trouble(x,z,h){
      let n=0,off=0,sum=0,k=0;
      for(const [dx,dz] of SAMPLES){
        const {x:px,z:pz}=carPoint(x,z,dx,dz,h),g=groundAt(px,pz);
        if(g===null){off++;continue;}
        sum+=g;k++;n+=squeeze(px,pz,g);
      }
      if(off>SAMPLES.length/2)n+=off;
      return {n,ground:k?sum/k:null};
    }
    // The knock of meeting something, at most a couple of times a second
    // rather than every frame the car leans on a wall.
    let lastBump=-1;
    function bump(){const t=performance.now();if(t-lastBump<600)return;lastBump=t;sounds.click();}
    function parkBoxes(){
      // The car's boxes move with it: one box round the parked car.
      const cs=[corner(halfW,halfL),corner(-halfW,halfL),corner(halfW,-halfL),corner(-halfW,-halfL)];
      const minX=Math.min(...cs.map(c=>c.x)),maxX=Math.max(...cs.map(c=>c.x)),minZ=Math.min(...cs.map(c=>c.z)),maxZ=Math.max(...cs.map(c=>c.z));
      boxes.forEach((bx,i)=>{const dy0=saved[i].min[1]-home.y,dy1=saved[i].max[1]-home.y;bx.min=[minX,car.y+dy0,minZ];bx.max=[maxX,car.y+dy1,maxZ];});
      world.addBoxes(boxes.map(bx=>({name:bx.name,min:bx.min,max:bx.max,prop:key})));
      // (The old entries stay in the grid but their boxes now sit here.)
    }
    const door=()=>corner(-(halfW+.45),.3);
    // In reach from any side of the car, not just the driver's door.
    function beside(p){const s=Math.sin(car.heading),c=Math.cos(car.heading),dx=p.x-car.x,dz=p.z-car.z;
      const lx=dx*c-dz*s,lz=dx*s+dz*c;return Math.hypot(Math.max(0,Math.abs(lx)-halfW),Math.max(0,Math.abs(lz)-halfL));}
    list.push({id:key,icon:'🚗',name:`Drive the ${colour} car`,kind:'drive',radius:1.0,distance:beside,
      get at(){const d=door();return {x:d.x,y:car.y,z:d.z};},
      hint:'↑ ↓ drive · ← → steer · Space honks · E to get out',
      start(){
        car.speed=0;car.parked=false;
        for(const bx of boxes){bx.min=[1e6,1e6,1e6];bx.max=[1e6+1,1e6+1,1e6+1];}   // out of the way while it moves
        // The view looks down on the car from over its roof (a boom aimed
        // at the driver would start inside the car's own baked panels).
        tour.setCameraRig({target:1.75,boom:5.0,height:2.5});
        sounds.engine(0);life.say('Vroom!',1500);
      },
      tick(dt){
        const fwd=(keys.has('ArrowUp')?1:0)-(keys.has('ArrowDown')?1:0),steer=(keys.has('ArrowLeft')?1:0)-(keys.has('ArrowRight')?1:0);
        const top=fwd>=0?4.5:2.2;
        car.speed+=((fwd*top)-car.speed)*(1-Math.exp(-dt*(fwd?1.6:3)));
        if(Math.abs(car.speed)<.03&&!fwd)car.speed=0;
        if(car.speed){
          const turn=steer*Math.min(1.4,Math.abs(car.speed)*.55)*Math.sign(car.speed)*dt;
          const h=wrap(car.heading+turn),step=car.speed*dt;
          const now=trouble(car.x,car.z,car.heading);
          // Straight on; failing that, glance off to either side, so a wall
          // met at an angle slides the car along it instead of stopping it
          // dead; failing that, at least turn on the spot so the steering
          // can always work the car free.
          let moved=false;
          for(const [dir,scale] of [[h,1],[h+.6,.7],[h-.6,.7],[h,0]]){
            const nx=car.x-Math.sin(dir)*step*scale,nz=car.z-Math.cos(dir)*step*scale,next=trouble(nx,nz,h);
            if(next.n>now.n+1e-9)continue;
            car.x=nx;car.z=nz;car.heading=h;if(next.ground!==null)car.y+=(next.ground-car.y)*Math.min(1,dt*6);
            moved=scale>0;break;
          }
          car.lastFit=moved;
          if(!moved){car.speed*=.3;if(Math.abs(car.speed)<.3)car.speed=0;bump();}
        }
         place();
        player.x=car.x;player.y=car.y;player.z=car.z;
        const seat=carPoint(0,0,-.42,.15,car.heading);
         life.face(car.heading+Math.PI);life.ride({dx:seat.x,dy:.62,dz:seat.z,pose:{sit:.8}});
        sounds.engine(Math.abs(car.speed)/4.5);
        return {yaw:car.heading};
      },
      key(code){if(code==='Space'){sounds.horn();return true;}return false;},
      stop(){
        car.speed=0;car.parked=true;sounds.engine(null);place();parkBoxes();tour.setCameraRig(null);life.ride(null);
        // Out by the driver's door — the other side if that's against a wall.
        for(const side of [-(halfW+.45),halfW+.45]){const d=corner(side,.3),spot=world.safeSpot(d.x,car.y,d.z);if(spot&&Math.hypot(spot.x-d.x,spot.z-d.z)<1){player.x=spot.x;player.y=spot.y;player.z=spot.z;break;}}
      }});
  }
  // ----- the trampoline bounces you (hold ↓ to stop).
  const trampoline={boxes:data.colliders.filter(b=>/Trampoline jumping mat/.test(b.name)),bounces:0};
  function onMat(){return trampoline.boxes.some(b=>player.x>=b.min[0]&&player.x<=b.max[0]&&player.z>=b.min[2]&&player.z<=b.max[2]&&Math.abs(player.y-b.max[1])<.15);}

  // ----- more things, each in its own module (hang-bar.mjs, roomba.mjs,
  // yoto.mjs, beds.mjs): given the same tools, they push their own entries
  // onto `list` (an interaction: {id, icon, name, kind:'toggle'|'ride'|'play'|
  // 'drive', at:{x,y,z}, radius, face?, label?(), hint?, off?, start(),
  // tick?(dt) → null | {yaw?, done?}, key?(code), stop()}) and per-frame work
  // onto `ticking` (dt=>{}). `off` is what the pill says while you're on it;
  // a tick returning {done:true} gets off by itself.
  const ctx={THREE,scene,world,renderer,data,player,keys,life,body,tour,reducedMotion,list,ticking,sounds,propMeshes,meshesOf,pose,hinge,isBusy:()=>!!active};
  for(const extend of [hangBarInteractions,roombaInteractions,yotoInteractions,bedInteractions]){try{extend(ctx);}catch(error){console.warn('An interaction module failed to load:',error);}}
  // Which one is in reach: the nearest on this floor within its radius.
  function findNear(){
    let best=null,bd=Infinity;
    for(const it of list){const a=it.at;if(!a||Math.abs(a.y-player.y)>.8)continue;const d=it.distance?it.distance(player):Math.hypot(a.x-player.x,a.z-player.z);if(d<it.radius&&d<bd){bd=d;best=it;}}
    return best;
  }
  function showPill(text){if(!text){pill.hidden=true;return;}if(label.textContent!==text)label.textContent=text;pill.hidden=false;}
  const api={
    get active(){return active;},get near(){return near;},
    controls(){return active&&(active.kind==='ride'||active.kind==='drive'||active.kind==='play');},
    start(it=near){
      if(!it)return false;
      if(it.face)life.face(Math.atan2(it.face.x-player.x,it.face.z-player.z));
      if(it.kind==='toggle'){it.start();return true;}
      active=it;it.start?.();body.reset(player);life.airborne(false);
      showPill(it.off||(it.kind==='drive'?'Get out':it.kind==='play'?'Stop playing':'Get off'));
      if(it.hint)tour.hint(it.hint,true);
      return true;
    },
    stop(){if(!active)return;const it=active;active=null;it.stop?.();life.ride(null);tour.hint(null);},
    key(code){if(!active||!active.key)return false;return active.key(code);},
    // Every frame while walking: what's here, and whatever is moving.
    tick(dt,now){
      for(const f of ticking)f(dt);
      if(active){
        // A ride ends the moment you try to walk off it.
        if(active.kind==='ride'&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].some(k=>keys.has(k))){api.stop();return null;}
        if(active.kind==='play'&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].some(k=>keys.has(k))){api.stop();return null;}
        const out=active.tick?active.tick(dt):null;
        if(out?.done){api.stop();return null;}
        return out;
      }
      if(now-nearAt>.12){nearAt=now;near=findNear();showPill(near?`${near.icon} ${near.label?near.label():near.name}`:null);}
      return null;
    },
    // After a step on foot: standing on the trampoline throws you up (hold ↓
    // to stand still on it).
    landed(){
      if(!body.airborne&&onMat()&&!keys.has('ArrowDown')){body.vy=7;body.airborne=true;trampoline.bounces++;sounds.boing();life.hop(.9);if(trampoline.bounces===1)life.say('Boing!',1200);}
    },
    // For QA.
     get state(){return {near:near?.id??null,active:active?.id??null,bounces:trampoline.bounces,keys:[...keys],cars:Object.fromEntries(Object.entries(debug.cars||{}).map(([k,c])=>[k,{x:+c.x.toFixed(2),y:+c.y.toFixed(2),z:+c.z.toFixed(2),heading:+c.heading.toFixed(2),speed:+c.speed.toFixed(2),lastFit:c.lastFit}]))};},
  };
  bindButton(pill,()=>{if(active)api.stop();else api.start();});
  return api;
}
