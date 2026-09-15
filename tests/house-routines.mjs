// Companion routines against the real house: only the family's own pets have
// places here (no shopkeepers); every place resolves to free floor (or a
// bed/seat top) and keeps 0.9 m clear of stations and arrival spots; family
// pets nap on their owner's bed at night; companions mostly stay put doing
// their thing, turn smoothly and once (never see-sawing while you stand to one
// side), hop hello, step aside rather than being shoved (and not again every
// few seconds when they can't), walk a real route to every place; eggs never move.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {glazingBoxes} from '../house-test/glazing.mjs';
import {WalkingWorld} from '../house-test/physics.mjs';
import {rooms} from '../house-test/rooms.mjs';
import {neighborhoodBoxes} from '../house-test/neighborhood-layout.mjs';
import {ROUTINES,isFamily,resolveSpots,createCompanion,updateCompanion,KEEP_CLEAR,lineOfSight,callOver,freeSpot} from '../house-test/companions.mjs';

const data=JSON.parse(fs.readFileSync(new URL('../house-test/house.json',import.meta.url),'utf8'));
// The game's own walking world: the sunroom's glass walls block walking too.
const meshBytes=gunzipSync(fs.readFileSync(new URL('../house-test/house.mesh.gz',import.meta.url)));
const world=new WalkingWorld(data.colliders,{height:1.05});world.addBoxes(glazingBoxes(meshBytes.buffer.slice(meshBytes.byteOffset,meshBytes.byteOffset+meshBytes.byteLength),data.groups,world));world.addBoxes(neighborhoodBoxes);
const avoid=[];
for(const r of rooms){if(/street|Craepet house/i.test(r[1]))continue;for(const [x,y] of [[r[2],r[3]],...(r[6]?[[r[6][0],r[6][1]]]:[])]){const p=world.safeSpot(x,r[4],-y);if(p)avoid.push(p);}}
const where={world,colliders:world.boxes,rooms,avoid};
function seeded(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const spots={};
// 1. Places resolve, and idle places keep clear of stations and arrivals.
for(const [id,rt] of Object.entries(ROUTINES)){
  for(const k of ['day','night']){
    const got=resolveSpots(rt[k],where);
    assert.equal(got.length,rt[k].length,`${id} ${k}: ${rt[k].length-got.length} place(s) did not resolve`);
    for(const s of got){
      const floor=rooms.find(r=>r[1]===s.room)[4];
      if(s.up){assert(s.y>floor+.12&&s.y<floor+.92,`${id} ${s.act} top ${s.y}`);assert(!world.blocked(s.stand.x,s.stand.z,s.stand.y),`${id} stand blocked`);}
      else{
        assert(!world.blocked(s.x,s.z,s.y),`${id} ${s.act} blocked`);
        const near=Math.min(...avoid.filter(a=>Math.abs(a.y-s.y)<.6).map(a=>Math.hypot(a.x-s.x,a.z-s.z)));
        assert(near>=KEEP_CLEAR-1e-6,`${id} ${k} ${s.act} is ${near.toFixed(2)} m from a station/arrival`);
      }
    }
    spots[id]={...spots[id],[k]:got};
  }
}
for(const id of ['cory','ellie','jeannie','shannon','tristan'])assert(spots[id].night.every(s=>s.act==='nap'&&s.up),`${id} does not nap on a bed at night`);
// Only the family's own pets live here: a routine for each family member,
// none for the valley's shopkeepers, and the Visitor's pet isn't family.
assert.deepEqual(Object.keys(ROUTINES).sort(),['cory','ellie','jeannie','kieran','shannon','tristan'],'a routine for someone outside the family');
assert(Object.keys(ROUTINES).every(isFamily)&&!isFamily('guest'),'the Visitor counted as family');
const make=(id,o={})=>createCompanion({id,day:spots[id].day,night:spots[id].night,random:seeded(3),...o});
const far={x:0,y:-50,z:0};
// 2. By day a companion mostly stays at its places, doing its thing.
{
  const c=make('cory');let walked=0,frames=0,farthest=0;
  for(let i=0;i<30*90;i++){updateCompanion(c,1/30,{world,player:far,night:false,random:seeded(i)});frames++;if(c.walking)walked++;
    farthest=Math.max(farthest,Math.min(...spots.cory.day.map(s=>Math.hypot(c.point.x-s.x,c.point.z-s.z))));}
  assert(walked/frames<.35,`walked ${(walked/frames*100).toFixed(0)}% of the time`);
  assert(farthest<1.6,`strayed ${farthest.toFixed(2)} m from its places`);
}
// 3. At night it naps on its owner's bed: straight there when nobody's
// looking, or a walk and a hop up onto the bed when you are.
{
  const c=make('cory'),bed=spots.cory.night[0];
  updateCompanion(c,1/30,{world,player:far,night:true,seen:()=>false});
  assert(c.up&&Math.abs(c.point.y-bed.y)<1e-6,'not on the bed at night');
  const out=updateCompanion(c,1/30,{world,player:far,night:true,seen:()=>false}).out;
  assert.equal(out.expression,'sleep');assert.equal(out.emote,'zz');
  const w=make('cory');let hopped=false;
  for(let i=0;i<30*20&&!w.up;i++){updateCompanion(w,1/30,{world,player:far,night:true,seen:()=>true});if(w.mode==='hop')hopped=true;}
  assert(w.up&&hopped,'watched companion never hopped onto the bed');
}
// 4. You walk up: it turns to you smoothly and hops hello.
{
  const c=make('kieran'),spot=spots.kieran.day[0];c.greetIn=0;
  const player={x:spot.x+1.6,y:spot.y,z:spot.z};let hop=0,heart=false,maxTurn=0,last=c.heading;
  for(let i=0;i<45;i++){const {out}=updateCompanion(c,1/30,{world,player,night:false,seen:()=>true});if(out.hop)hop=out.hop;if(out.emote==='heart')heart=true;
    maxTurn=Math.max(maxTurn,Math.abs(wrap(c.heading-last)));last=c.heading;}
  assert(hop>0&&heart,'no hello hop');
  assert(maxTurn<=6/30+1e-6,'turned faster than a creature can');
  // Walk right up to a family pet: it steps aside, never jumps.
  const d=make('ellie');const s0={...d.point};const me={...s0};let maxStep=0,prev={...d.point};
  for(let i=0;i<60;i++){updateCompanion(d,1/30,{world,player:me,night:false,seen:()=>true});maxStep=Math.max(maxStep,Math.hypot(d.point.x-prev.x,d.point.z-prev.z));prev={...d.point};}
  assert(Math.hypot(d.point.x-me.x,d.point.z-me.z)>.55,'did not make room');assert(maxStep<1.3/30+.01,`shoved ${maxStep.toFixed(3)} m in one frame`);
}
// 5. An egg waits where it was laid.
{
  const e=make('kieran',{egg:true}),start={...e.point};
  for(let i=0;i<30*30;i++)updateCompanion(e,1/30,{world,player:{...start},night:i>450,seen:()=>true});
  assert.equal(Math.hypot(e.point.x-start.x,e.point.z-start.z),0,'egg moved');
}
// 6. On a bed or a seat they face into the room, not the wall behind it.
for(const [id,list] of Object.entries(spots))for(const s of [...list.day,...list.night].filter(s=>s.up&&!ROUTINES[id].day.concat(ROUTINES[id].night).find(q=>q.face&&q.act===s.act))){
  const room=rooms.find(r=>r[1]===s.room),cx=room[2]-s.x,cz=-room[3]-s.z;
  assert(Math.abs(wrap(Math.atan2(cx,cz)-s.face))<.2,`${id} ${s.act} on furniture faces away from the room`);
}
// 7. Line of sight: clear across a room, blocked through a wall; a pet you
// can't see from the doorway trots over to say hello (callOver).
{
  const cory=rooms.find(r=>r[1]==="Cory's bedroom"),from={x:cory[2],y:cory[4]+1.3,z:-cory[3]};
  assert(lineOfSight(world.boxes,from,{x:spots.cory.day[0].x,y:spots.cory.day[0].y+.4,z:spots.cory.day[0].z}),'no line of sight across Cory\'s room');
  const kitchen=rooms.find(r=>r[1]==='Kitchen');assert(!lineOfSight(world.boxes,from,{x:kitchen[2],y:kitchen[4]+.5,z:-kitchen[3]}),'saw the kitchen through the upstairs walls');
  const c=make('ellie'),room=rooms.find(r=>r[1]==="Ellie's bedroom"),player={x:room[6][0],y:room[4],z:-room[6][1]};
  const f=freeSpot(world,player.x,player.z,room[4],[{...player}],.75,.8);f.face=Math.atan2(player.x-f.x,player.z-f.z);
  assert(callOver(c,f),'callOver refused');let greeted=false;
  for(let i=0;i<30*8;i++){const {out}=updateCompanion(c,1/30,{world,player,night:false,seen:()=>true});if(out.emote==='heart')greeted=true;}
  assert(greeted&&Math.hypot(c.point.x-f.x,c.point.z-f.z)<.3,'called-over pet did not come and say hello');
  for(let i=0;i<30*15;i++)updateCompanion(c,1/30,{world,player:{x:0,y:-50,z:0},night:false,seen:()=>true});
  assert(!c.spot.temp,'called-over pet never went back to its routine');
}
// 8. You stand off to one side of a pet at its place (well round from the way
// its place faces): it turns toward you once and stays turned. It used to
// pick between you and its place's facing from its own heading every frame,
// see-sawing ±11° at 15–30 Hz for as long as you stood there.
const flipsOf=hs=>{let flips=0,sign=0;for(let i=1;i<hs.length;i++){const d=wrap(hs[i]-hs[i-1]);if(Math.abs(d)>.004){if(sign&&Math.sign(d)!==sign)flips++;sign=Math.sign(d);}}return flips;};
let seeSaw=0;
for(const id of ['kieran','ellie']){
  const spot=spots[id].day.find(s=>!s.up&&s.face!=null);assert(spot,`${id} has no faced place to test`);
  for(const side of [1,-1]){
    const c=make(id),a=spot.face+side*1.8,player={x:spot.x+Math.sin(a)*2,y:spot.y,z:spot.z+Math.cos(a)*2};c.greetIn=99;c.dwell=99;
    const hs=[];for(let i=0;i<30*5;i++){updateCompanion(c,1/30,{world,player,night:false,seen:()=>true});hs.push(c.heading);}
    const flips=flipsOf(hs),settle=Math.abs(wrap(hs.at(-1)-hs.at(-30)));seeSaw=Math.max(seeSaw,flips);
    assert(flips<=1&&settle<.01,`${id} see-sawed with you to its ${side>0?'left':'right'}: ${flips} reversals in 5 s, still turning ${(settle*57.3).toFixed(1)}° in the last second`);
    assert(Math.abs(wrap(Math.atan2(player.x-c.point.x,player.z-c.point.z)-c.heading))<1.1,`${id} did not turn toward you`);
  }
}
// 9. Backed against the furniture it can't step aside: it stays beside you
// and watches, instead of trying again every three seconds.
{
  const wall=Object.assign(Object.create(world),{move:p=>p});
  const c=make('ellie'),me={x:c.point.x+.5,y:c.point.y,z:c.point.z};c.dwell=99;let asides=0,last=c.mode;
  for(let i=0;i<30*20;i++){updateCompanion(c,1/30,{world:wall,player:me,night:false,seen:()=>true});if(c.mode==='aside'&&last!=='aside')asides++;last=c.mode;}
  assert(asides<=1,`tried to step aside ${asides} times in 20 s against a wall`);
  // Once you've moved off it goes back to its place.
  const far2={x:c.point.x+3,y:c.point.y,z:c.point.z};for(let i=0;i<30*12;i++)updateCompanion(c,1/30,{world,player:far2,night:false,seen:()=>true});
  assert(Math.hypot(c.point.x-spots.ellie.day[0].x,c.point.z-spots.ellie.day[0].z)<.1,'did not go back to its place after you moved off');
  // Having made room, it stays beside you — and steps off again if you bump right into it.
  const d=make('ellie'),you={x:d.point.x+.5,y:d.point.y,z:d.point.z};d.dwell=99;let modes=0,lastMode=d.mode;
  for(let i=0;i<30*6;i++){updateCompanion(d,1/30,{world,player:you,night:false,seen:()=>true});if(d.mode!==lastMode)modes++;lastMode=d.mode;}
  assert(modes<=2&&d.crowded==='made room','did not make room once and stay');
  const gx=you.x-d.point.x,gz=you.z-d.point.z,gl=Math.hypot(gx,gz),bump={x:d.point.x+gx/gl*.3,y:you.y,z:d.point.z+gz/gl*.3};
  for(let i=0;i<30*2;i++)updateCompanion(d,1/30,{world,player:bump,night:false,seen:()=>true});
  assert(Math.hypot(d.point.x-bump.x,d.point.z-bump.z)>.45,'let you walk right into it');
}
// 10. Between its places each family pet walks a real route round the
// furniture: every walk ends at the place it set out for (a bed or the sofa
// by a hop up from beside it); none marches into a bed or the coffee table
// and gives up where it stands.
const walked={};
for(const id of ['cory','kieran','ellie','jeannie','shannon','tristan']){
  const c=make(id);let last=c.mode,walks=0,short=0,hops=0,maxTurn=0,prev=c.heading;
  for(let i=0;i<30*300;i++){updateCompanion(c,1/30,{world,player:far,night:false,seen:()=>true,random:seeded(i)});
    if(last==='travel'&&c.mode!=='travel'){walks++;if(Math.hypot(c.point.x-c.target.x,c.point.z-c.target.z)>.1)short++;}
    if(last!=='hop'&&c.mode==='hop'&&c.hop.up)hops++;
    maxTurn=Math.max(maxTurn,Math.abs(wrap(c.heading-prev)));prev=c.heading;last=c.mode;}
  assert(walks>=2,`${id} walked only ${walks} times in 5 minutes`);
  assert.equal(short,0,`${id} gave up ${short} of ${walks} walks short of its place`);
  if(spots[id].day.some(s=>s.up))assert(hops>0,`${id} never hopped up onto its ${spots[id].day.find(s=>s.up).act} place`);
  assert(maxTurn<=6/30+1e-6,`${id} turned faster than a creature can`);
  walked[id]=`${walks}/${hops}`;
}
console.log(`PASS routines: ${Object.keys(ROUTINES).length} family companions' day and night places resolve clear of stations; no shopkeepers; bedtime naps, calm days, smooth hellos, stepping aside once, no see-saw (max ${seeSaw} reversal), routed walks (walks/hops ${JSON.stringify(walked)}), eggs stay`);
