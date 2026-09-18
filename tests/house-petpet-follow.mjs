// A petpet is not welded to its Craepet. When the pet jumps, the petpet
// jumps a beat later and lands a beat later; a flier drifts after it; the
// pet's take-off and landing squashes reach the petpet on the same delay;
// a teleport (a Rooms jump) never leaves it hanging in the old room's air;
// and with reduced motion it simply rides along. Also: a petpet's feet go
// round quicker than the pet's, so the two never march in step.
import assert from 'node:assert/strict';
import {createPetpetFollow,BEAT} from '../house-test/petpet-follow.mjs';
import {creature,petpet} from '../house-test/creatures.mjs';

const DT=1/60;
// The pet's height through a jump: up 0.9 m and back down over 0.9 s.
const jump=t=>t<0||t>.9?0:Math.sin(Math.PI*t/.9)*.9;
function ride(f,seconds,leaderY,opts){const out=[];for(let i=0;i*DT<=seconds;i++){const t=i*DT;out.push({t,...f.update(t,DT,leaderY(t),opts)});}return out;}

{ // A walker copies the jump exactly, one beat late.
  const f=createPetpetFollow(),path=ride(f,2,jump);
  const peakPet=.45,peakPal=path.reduce((a,b)=>b.y>a.y?b:a);
  assert(Math.abs(peakPal.y-.9)<.02,`petpet peaks at ${peakPal.y.toFixed(3)} m, pet at 0.9`);
  assert(Math.abs(peakPal.t-(peakPet+BEAT))<DT*1.5,`petpet peaks at ${peakPal.t.toFixed(3)} s, pet at ${peakPet}`);
  const landed=path.find(p=>p.t>1&&p.y<1e-6);
  assert(landed&&landed.t>.9+BEAT-DT&&landed.t<.9+BEAT+DT*2,`petpet lands at ${landed?.t}`);
  // Never below the floor, never above the pet's own arc.
  for(const p of path)assert(p.y>=-1e-9&&p.y<=.9+1e-9,`height ${p.y} at ${p.t}`);
}
{ // Squashes are echoed on the same delay, a touch softer, at most one a frame.
  const f=createPetpetFollow();f.hop(.5,.6);
  const path=ride(f,1.5,jump);
  const echo=path.filter(p=>p.hop);
  assert.equal(echo.length,1,'one echo');
  assert(Math.abs(echo[0].t-(.5+BEAT))<DT,`echo at ${echo[0].t}`);
  assert(Math.abs(echo[0].hop-.54)<1e-9,`echo strength ${echo[0].hop}`);
}
{ // A flier drifts after the pet and settles without a bump: always behind on
  // the way up, always above on the way down, and back on the floor after.
  const f=createPetpetFollow({flies:true}),path=ride(f,2,jump);
  const up=path.filter(p=>p.t>.05&&p.t<.4),down=path.filter(p=>p.t>.65&&p.t<.9);
  for(const p of up)assert(p.y<jump(p.t),`flier ahead of the pet at ${p.t}`);
  for(const p of down)assert(p.y>jump(p.t),`flier below the pet at ${p.t}`);
  assert(path[path.length-1].y<.01,'flier still up after the jump');
  assert(!path.some(p=>p.hop),'a flier never squashes');
}
{ // A teleport up a floor: the petpet is there at once, not a beat later.
  const f=createPetpetFollow();
  for(let i=0;i<20;i++)f.update(i*DT,DT,0);
  const {y}=f.update(20*DT,DT,3.1);
  assert.equal(y,3.1,'left behind by a teleport');
}
{ // Reduced motion: welded, no echoes.
  const f=createPetpetFollow();f.hop(0,1);
  for(let i=0;i<30;i++){const r=f.update(i*DT,DT,jump(i*DT),{reduced:true});assert.equal(r.y,jump(i*DT));assert.equal(r.hop,0);}
}
{ // Feet: at a walk the petpet's legs go round faster than the Craepet's.
  function hz(root){const rig=root.userData.rig,leg=rig.bones.legL,z0=leg.userData.rest.z;let crossings=0,last=null;
    for(let t=0;t<2;t+=1/30){rig.update(1/30,{moving:true,speed:1.5});const s=Math.sign(leg.position.z-z0);if(last!==null&&s!==last&&s!==0)crossings++;if(s!==0)last=s;}
    return crossings/2/2;}
  const pet=hz(creature({species:'blorb'})),pal=hz(petpet('duckling'));
  assert(pal>pet*1.4&&pal<pet*2,`petpet steps at ${pal} Hz, pet at ${pet} Hz`);
}
console.log('petpet follow OK');
