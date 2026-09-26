import test from 'node:test';
import assert from 'node:assert/strict';
import {driveCar} from '../house-test/car-driving.mjs';
import fs from 'node:fs';
import {WalkingWorld} from '../house-test/physics.mjs';
import {createInteractions} from '../house-test/interactions.mjs';
import {neighborhoodBoxes} from '../house-test/neighborhood-layout.mjs';

const clear=()=>({n:0,ground:0});
const car=()=>({x:0,y:0,z:0,heading:0,speed:0,steering:0});
function run(c,input,seconds,frame=1/60,fit=clear){
  let hit=false;
  for(let t=0;t<seconds-1e-9;){const dt=Math.min(frame,seconds-t);hit=driveCar(c,input,dt,fit).hit||hit;t+=dt;}
  return hit;
}

const house=JSON.parse(fs.readFileSync(new URL('../house-test/house.json',import.meta.url),'utf8'));
function withHouseCar(key,extraBoxes,check){
  const priorDocument=globalThis.document,priorWindow=globalThis.window,priorAudio=globalThis.Audio;
  const canvasContext=new Proxy({}, {get:(target,name)=>name==='measureText'?()=>({width:50}):()=>{}});
  globalThis.document={getElementById:()=>({hidden:false,textContent:''}),createElement:()=>({width:0,height:0,getContext:()=>canvasContext})};
  globalThis.window={};globalThis.Audio=class {addEventListener(){} pause(){}};
  try{
    const data=structuredClone(house),world=new WalkingWorld(data.colliders,{height:1.05});
    if(extraBoxes.length)world.addBoxes(structuredClone(extraBoxes));
    const b=data.props[key],player={x:(b.min[0]+b.max[0])/2,y:b.min[1]+.08,z:(b.min[2]+b.max[2])/2};
    let throttle=0;
    const api=createInteractions({scene:{add(){}},world,renderer:{render:{},getDrawingBufferSize(v){v.set(1280,720);}},data,propMeshes:{},player,keys:new Set(),life:{face(){},ride(){},say(){},airborne(){},hop(){}},body:{reset(){},vy:0,airborne:false},tour:{setCameraRig(){},hint(){}},bindButton(){},getDriveInput:()=>({throttle,steer:0})});
    api.tick(.016,1);
    assert.equal(api.near?.id,key);
    api.start();
    check({api,world,player,home:{...player},setThrottle:value=>{throttle=value;},step:(seconds,frame=1/60)=>{for(let t=0;t<seconds-1e-9;){const dt=Math.min(frame,seconds-t);api.tick(dt,1+t);t+=dt;}}});
  }finally{globalThis.document=priorDocument;globalThis.window=priorWindow;globalThis.Audio=priorAudio;}
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

test('a stopped car settles onto its support after descending a grade',()=>{
  const c=car(),fit=(x,z)=>({n:0,ground:Math.max(-.8,z/10)});
  run(c,{throttle:1},.6,1/60,fit);
  const support=fit(c.x,c.z).ground;
  assert.ok(c.y>support+.01,'motion smoothing initially leaves a small gap');
  c.speed=0;
  run(c,{throttle:0},1,1/60,fit);
  assert.ok(Math.abs(c.y-support)<.002,'the car settles even with no horizontal motion');
});

test('both exported cars descend the garage apron at common frame sizes',()=>{
  for(const frame of [1/120,1/60,1/30,.05])for(const key of ['car','car2'])
    withHouseCar(key,[],({api,setThrottle,step})=>{
      setThrottle(-1);step(6,frame);
      const c=api.state.cars[key];
      assert.ok(c.z>7,`${key} reaches driveway at ${frame}: ${JSON.stringify(c)}`);
      assert.ok(c.y<-.55&&c.y>-.9,`${key} follows the apron at ${frame}: ${JSON.stringify(c)}`);
      setThrottle(1);step(6,frame);
      const back=api.state.cars[key];
      assert.ok(back.z<-2,`${key} drives back up the apron at ${frame}: ${JSON.stringify(back)}`);
      assert.ok(Math.abs(back.y+.16)<.08,`${key} returns to the garage slab at ${frame}: ${JSON.stringify(back)}`);
    });
});

test('a broad low obstacle stops the car without lifting it',()=>{
  const bush={name:'Broad bush test',min:[-5.9,-.82,6],max:[-3.3,-.02,7.2]};
  withHouseCar('car',[bush],({api,setThrottle,step})=>{
    setThrottle(-1);step(7);
    const c=api.state.cars.car;
    assert.ok(c.z<4.1,`car stops before the bush: ${JSON.stringify(c)}`);
    assert.equal(c.speed,0);
    assert.ok(c.y<-.25,`the body never climbs onto the bush: ${JSON.stringify(c)}`);
  });
});

test('the driveway connects to the generated neighborhood ground',()=>{
  withHouseCar('car',neighborhoodBoxes,({api,setThrottle,step})=>{
    setThrottle(-1);step(12);
    const c=api.state.cars.car;
    assert.ok(c.z>20,`car reaches Craepet Street: ${JSON.stringify(c)}`);
    assert.ok(c.y<-.7&&c.y>-.9,`car stays grounded on the neighborhood: ${JSON.stringify(c)}`);
  });
});

test('parking twice moves original collider indices without ghosts',()=>{
  withHouseCar('car',[],({api,world,home,setThrottle,step})=>{
    const count=world.boxes.length;
    const parkedAt=(x,z)=>world.nearby(x,z,.1).some(b=>b.prop==='car');
    const other=house.props.car2,otherX=(other.min[0]+other.max[0])/2,otherZ=(other.min[2]+other.max[2])/2;
    const otherIndexed=()=>world.nearby(otherX,otherZ,.1).some(b=>b.prop==='car2');
    assert.equal(parkedAt(home.x,home.z),false,'driving removes the initial parked collider');
    assert.ok(otherIndexed(),'the other car stays solid while this one drives');
    setThrottle(-1);step(5);api.stop();
    const first=api.state.cars.car;
    assert.ok(parkedAt(first.x,first.z));
    assert.equal(parkedAt(home.x,home.z),false,'garage home no longer contains the car');
    api.start();setThrottle(-1);step(2);api.stop();
    const second=api.state.cars.car;
    assert.ok(second.z>first.z+1);
    assert.ok(parkedAt(second.x,second.z));
    assert.equal(parkedAt(first.x,first.z),false,'first parking spot no longer blocks walking');
    assert.ok(otherIndexed(),'reparking leaves the other car intact');
    assert.equal(world.boxes.length,count,'parking never appends collision boxes');
  });
});
