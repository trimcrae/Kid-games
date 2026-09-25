import test from 'node:test';
import assert from 'node:assert/strict';
import {driveCar} from '../house-test/car-driving.mjs';
import fs from 'node:fs';
import {WalkingWorld} from '../house-test/physics.mjs';
import {createInteractions} from '../house-test/interactions.mjs';

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

test('partial joystick pressure settles at a proportional speed',()=>{
  const speeds=[];
  for(const throttle of [.25,.5,1]){
    const c=car();run(c,{throttle},4);
    speeds.push(c.speed);
    assert.ok(Math.abs(c.speed-5.2*throttle)<.08,`forward throttle ${throttle}`);
  }
  assert.ok(speeds[0]<speeds[1]&&speeds[1]<speeds[2]);
  const c=car();run(c,{throttle:-.25},4);
  assert.ok(Math.abs(c.speed+.7)<.08,'partial reverse throttle');
  run(c,{throttle:-1},.3);
  run(c,{throttle:-.25},.7);
  assert.ok(Math.abs(c.speed+.7)<.08,'releasing a held joystick slows to its new target');
});

test('synthetic garage geometry permits straight reverse at ordinary frame sizes',()=>{
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

test('both exported cars respect the garage rear wall and reverse out through its opening',()=>{
  const source=JSON.parse(fs.readFileSync(new URL('../house-test/house.json',import.meta.url),'utf8'));
  const priorDocument=globalThis.document;
  const priorWindow=globalThis.window;
  const priorAudio=globalThis.Audio;
  const canvasContext=new Proxy({}, {get:(target,key)=>key==='measureText'?()=>({width:50}):()=>{}});
  globalThis.document={
    getElementById:()=>({hidden:false,textContent:''}),
    createElement:()=>({width:0,height:0,getContext:()=>canvasContext}),
  };
  globalThis.window={};
  globalThis.Audio=class {addEventListener(){} pause(){}};
  try{
    for(const key of ['car','car2']){
      const data=structuredClone(source);
      const world=new WalkingWorld(data.colliders,{height:1.05});
      const b=data.props[key];
      const player={x:(b.min[0]+b.max[0])/2,y:b.min[1]+.08,z:(b.min[2]+b.max[2])/2};
      const lane=player.x;
      const scene={add(){}};
      const renderer={render:{},getDrawingBufferSize(v){v.set(1280,720);}};
      const life={face(){},ride(){},say(){},airborne(){},hop(){}};
      const body={reset(){},vy:0,airborne:false};
      const tour={setCameraRig(){},hint(){}};
      let throttle=1;
      const api=createInteractions({scene,world,renderer,data,propMeshes:{},player,keys:new Set(),life,body,tour,bindButton(){},getDriveInput:()=>({throttle,steer:0})});
      api.tick(.016,1);
      assert.equal(api.near?.id,key,`${key} should be nearest at its own center`);
      api.start();
      for(let i=0;i<180;i++)api.tick(1/60,1+i/60);
      const rear=api.state.cars[key];
      assert.ok(rear.z>-6,`${key} should stop at the garage rear wall: ${JSON.stringify(rear)}`);
      assert.equal(rear.speed,0,`${key} should have exhausted speed against the rear wall`);
      throttle=-1;
      for(let i=0;i<480;i++)api.tick(1/60,4+i/60);
      const actual=api.state.cars[key];
      assert.ok(actual.z>1.5,`${key} should reverse past the garage opening: ${JSON.stringify(actual)}`);
      assert.ok(actual.speed<0,`${key} remains in reverse`);
      assert.ok(Math.abs(actual.x-lane)<.01,`${key} preserves its lane`);
    }
  }finally{globalThis.document=priorDocument;globalThis.window=priorWindow;globalThis.Audio=priorAudio;}
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
