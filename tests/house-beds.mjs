// Sleeping in the beds (house-test/beds.mjs): every mattress in the export is
// a bed you can use with E; each has somewhere beside it to stand on that
// floor; the bunks come out as a top and a bottom; and a sleep puts energy
// back a little at a time, wakes on its own once rested, and puts the pet
// back where it got on. Run against the real house with a stub of the page.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WalkingWorld} from '../house-test/physics.mjs';
import {findBeds,besideBed,bedReach,bedInteractions,REST_PER_SECOND} from '../house-test/beds.mjs';

const data=JSON.parse(fs.readFileSync(new URL('../house-test/house.json',import.meta.url),'utf8'));
const world=new WalkingWorld(data.colliders,{height:1.05});
const beds=findBeds(data.colliders,world);
// The four real beds, the crib, the bassinet and both bunks at the least.
assert(beds.length>=8,`only ${beds.length} beds found`);
for(const what of ['the crib','the bassinet','the top bunk','the bottom bunk'])assert(beds.some(b=>b.what===what),`no ${what}`);
assert.equal(beds.filter(b=>b.what==='the bed').length,4,"four ordinary beds expected (Mom & Dad's, Cory's, Jeannie's, Ellie's)");
// The bunks are stacked, the top over the bottom, and nothing else is.
const top=beds.find(b=>b.what==='the top bunk'),bottom=beds.find(b=>b.what==='the bottom bunk');
assert(top.below===bottom&&bottom.above===top&&top.top>bottom.top+.9,'the bunks are not stacked');
assert(beds.every(b=>b===top||b===bottom||(!b.above&&!b.below)),'a bed other than the bunks is stacked');
// The bunk's made cover is what you lie on, not the mattress under it.
assert(bottom.top>bottom.box.max[1],'the bottom bunk ignores its made cover');

// Somewhere beside every bed to stand, on its floor, from which it is in reach.
for(const bed of beds){
  let stand=null;
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const w=(bed.box.max[0]-bed.box.min[0])/2+.35,l=(bed.box.max[2]-bed.box.min[2])/2+.35;
    // (safeSpot walks outwards from the side of the bed to floor the pet fits on.)
    const spot=world.safeSpot(bed.x+dx*w,bed.top-.6,bed.z+dz*l);
    if(spot&&bedReach(bed,spot)&&besideBed(bed,spot)<.9){stand=spot;break;}
  }
  if(bed===top)continue;                                    // reached from the bottom bunk, below
  assert(stand,`${bed.what} at ${bed.x.toFixed(1)},${bed.z.toFixed(1)}: nowhere to stand beside it`);
  assert(bedReach(bed,stand)&&besideBed(bed,stand)<.9,`${bed.what}: out of reach from beside it (${(bed.top-stand.y).toFixed(2)} m up, ${besideBed(bed,stand).toFixed(2)} m off)`);
  // Lying on it: headroom for a pet (the crib rails and the bunk above clear its back).
  assert(world.headroom(bed.x,bed.z,bed.top)-bed.top>.5,`${bed.what}: no room to lie on it`);
}
// From the bottom bunk the top one is in reach, and is the one E means.
const onBottom={x:bottom.x,y:bottom.top,z:bottom.z};
assert(bedReach(top,onBottom),'the top bunk is out of reach from the bottom one');

// The interaction itself, with a stub page.
let energy=30,done=0,said=[],rideNow=null,rig=null,hops=0;
const life={say:t=>said.push(t),ride:v=>{rideNow=v;},face(){},hop(){hops++;},rest(n,fin){energy=Math.min(100,energy+n);if(fin)done++;return energy;}};
const veil={classes:new Set(),classList:{add(c){veil.classes.add(c);},remove(c){veil.classes.delete(c);}}};
globalThis.document={getElementById:id=>id==='sleep'?veil:null};globalThis.window={};
const list=[],player={x:0,y:0,z:0};
const body={resets:0,reset(){this.resets++;}};
bedInteractions({world,data,player,life,body,tour:{setCameraRig(r){rig=r;}},reducedMotion:false,list,ticking:[],sounds:{click(){}}});
assert.equal(list.length,beds.length,'not every bed can be used');
for(const it of list)assert(it.kind==='ride'&&it.icon==='😴'&&/^Sleep in the /.test(it.name)&&it.off==='Wake up',`${it.id} is not a bed you can sleep in`);
// Standing beside Cory's bed (the end bedroom, upstairs).
const cory=beds.find(b=>b.what==='the bed'&&b.x>15.5&&b.top>1.5),it=list.find(i=>i.id===cory.id);
const start={x:cory.box.min[0]-.4,y:1.26,z:cory.z};Object.assign(player,start);
assert(it.distance(player)<it.radius,'beside the bed, E is not offered');
assert(Math.abs(it.at.y-player.y)<.01,'the bed is reported on another floor');
player.y=-1.05;assert(it.distance(player)===Infinity,'a bed a floor up is offered');
Object.assign(player,start);
it.start();
assert(Math.hypot(player.x-start.x,player.z-start.z)<.01,'the climb snapped to the bed');
for(let i=0;i<21;i++){
  it.tick(1/60);
  const inside=player.x>cory.box.min[0]&&player.x<cory.box.max[0]&&player.z>cory.box.min[2]&&player.z<cory.box.max[2];
  if(inside)assert(player.y>=cory.top-.01,'the climb passes through the mattress cover');
}
assert(player.x>start.x&&player.x<cory.x&&player.y>start.y,'the pet did not travel over the bed');
for(let i=0;i<21;i++)it.tick(1/60);
assert(Math.abs(player.x-cory.x)<.01&&Math.abs(player.y-cory.top)<.01&&Math.abs(player.z-cory.z)<.01,'the pet did not get onto the bed');
assert(rideNow&&rideNow.sleeping&&rideNow.pose.lie===1&&rideNow.expression==='sleep'&&rideNow.emote==='zz','the pet is not asleep');
assert(veil.classes.has('on'),'the lights did not go down');
assert(rig&&rig.boom>2,'the camera did not step back');
// Ten seconds asleep: energy up by the second, not all at once.
let out=null;for(let i=0;i<10*60&&!out?.done;i++)out=it.tick(1/60);
assert.equal(energy,30+REST_PER_SECOND*10,`ten seconds asleep gave ${energy-30} energy`);
assert(!out?.done,'it woke before it was rested');
// Wakes by itself once full.
for(let i=0;i<20*60&&!out?.done;i++)out=it.tick(1/60);
assert.equal(energy,100);assert(out?.done,'rested, but it slept on');
it.stop();
assert.equal(done,1,'the sleep did not count as a Rest');
assert(rideNow===null&&!veil.classes.has('on')&&rig===null,'waking did not put things back');
assert(Math.hypot(player.x-start.x,player.z-start.z)<.3&&Math.abs(player.y-start.y)<.05,`the pet woke somewhere else: ${JSON.stringify(player)}`);
assert(body.resets===1&&hops===1&&said.some(t=>/rested/i.test(t)),'no wake-up');
// Woken early (E, or a step) it keeps what it slept for.
energy=20;Object.assign(player,start);it.start();it.tick(.7);for(let i=0;i<3.5*60;i++)it.tick(1/60);it.stop();
assert.equal(energy,20+REST_PER_SECOND*3);assert(said.some(t=>/nap/.test(t)),'an early wake did not say what it got');
// On the bottom bunk, the top bunk wins the tie for E.
const topIt=list.find(i=>i.id===top.id),bottomIt=list.find(i=>i.id===bottom.id);
Object.assign(player,onBottom);
assert(topIt.distance(player)<bottomIt.distance(player),'on the bottom bunk, E would sleep there again instead of climbing up');
const floorSpot={x:bottom.box.min[0]-.4,y:bottom.top-.6,z:bottom.z};
Object.assign(player,floorSpot);
assert(bottomIt.distance(player)<topIt.distance(player),'from the floor, the top bunk comes before the bottom one');
Object.assign(player,onBottom);topIt.start();
let rose=false;
for(let i=0;i<42;i++){
  topIt.tick(1/60);
  const inside=player.x>top.box.min[0]&&player.x<top.box.max[0]&&player.z>top.box.min[2]&&player.z<top.box.max[2];
  if(player.y>onBottom.y+.12){rose=true;assert(!inside||player.y>=top.top-.01,'the climb rises through the upper bunk');}
}
assert(rose&&Math.abs(player.y-top.top)<.01,'the top bunk climb did not arrive on its mattress');topIt.stop();
console.log(`PASS beds: ${beds.length} beds (${beds.map(b=>b.what).join(', ')}), all standable beside; sleep rests ${REST_PER_SECOND}/s and wakes itself when full`);
