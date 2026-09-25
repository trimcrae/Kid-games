import test from 'node:test';
import assert from 'node:assert/strict';
import {driveCar} from '../house-test/car-driving.mjs';

const clear=()=>({n:0,ground:0});
const car=()=>({x:0,y:0,z:0,heading:0,speed:0,steering:0});
function run(c,input,seconds,frame=1/60,fit=clear){
  let hit=false;
  for(let t=0;t<seconds-1e-9;){const dt=Math.min(frame,seconds-t);hit=driveCar(c,input,dt,fit).hit||hit;t+=dt;}
  return hit;
}

test('forward, coast, braking, and reverse have distinct responses',()=>{
  const c=car();
  run(c,{throttle:1},1.5);
  assert.ok(c.speed>4&&c.z<-2,'accelerates forward along local -Z');
  const cruising=c.speed;
  run(c,{throttle:0},.3);
  assert.ok(c.speed>0&&c.speed<cruising,'release coasts to a stop');
  run(c,{throttle:-1},.25);
  assert.ok(c.speed<cruising-1,'opposite pedal applies strong brake');
  run(c,{throttle:-1},1.4);
  assert.ok(c.speed<-.5,'continued pedal selects reverse');
});

test('reverses straight out of a two-car garage at ordinary frame sizes',()=>{
  for(const frame of [1/120,1/60,1/30,.05]){
    for(const x of [-1.15,1.15]){
      const c={...car(),x};
      // Side walls and a closed rear wall. +Z is the garage opening.
      const fit=(px,pz)=>({n:Math.max(0,Math.abs(px)-1.9)+Math.max(0,-4-pz),ground:0});
      run(c,{throttle:-1},2.8,frame,fit);
      assert.ok(c.z>4.3,`car ${x} exits through +Z at frame ${frame}`);
      assert.ok(Math.abs(c.x-x)<.001,'straight reverse preserves lane');
      assert.ok(c.speed<0,'reverse stays selected');
    }
  }
});

test('steering follows pedal direction and frame rate',()=>{
  const states=[];
  for(const frame of [1/120,1/60,1/30,.05]){
    const c=car();run(c,{throttle:1,steer:1},1.6,frame);states.push(c);
    assert.ok(c.heading>.5&&c.x<-.5,'left while moving forward curves left');
  }
  for(const c of states.slice(1)){
    assert.ok(Math.hypot(c.x-states[0].x,c.z-states[0].z)<.1,'path varies little by frame rate');
    assert.ok(Math.abs(c.heading-states[0].heading)<.06,'yaw varies little by frame rate');
  }
  const reverse=car();run(reverse,{throttle:-1,steer:1},1.5);
  assert.ok(reverse.heading<-.3&&reverse.x<-.2,'left while reversing turns the nose right and rear left');
});

test('solid wall stops impact, and oblique motion slides along it',()=>{
  const wall=(x,z)=>({n:Math.max(0,-1.6-z),ground:0});
  const straight=car();
  assert.equal(run(straight,{throttle:1},2,1/30,wall),true);
  assert.ok(straight.z>=-1.600001,'cannot drive through wall');
  assert.equal(straight.speed,0,'impact dissipates speed');
  const glancing={...car(),heading:.45};
  assert.equal(run(glancing,{throttle:1},2,1/30,wall),true);
  assert.ok(glancing.z>=-1.600001,'glancing turn cannot cross wall');
  assert.ok(glancing.x<-.5,'wall contact preserves tangential travel');
});
