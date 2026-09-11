// Companion routines against the real house: every place resolves to free
// floor (or a bed/seat top) and keeps 0.9 m clear of stations and arrival
// spots; family pets nap on their owner's bed at night; companions mostly
// stay put doing their thing, turn smoothly, hop hello and step aside rather
// than being shoved; shopkeepers speak; eggs never move.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WalkingWorld} from '../house-test/physics.mjs';
import {rooms} from '../house-test/rooms.mjs';
import {neighborhoodBoxes} from '../house-test/neighborhood-layout.mjs';
import {HOSTS,ROUTINES,resolveSpots,createCompanion,updateCompanion,KEEP_CLEAR,lineOfSight,callOver,freeSpot} from '../house-test/companions.mjs';

const data=JSON.parse(fs.readFileSync(new URL('../house-test/house.json',import.meta.url),'utf8'));
const world=new WalkingWorld(data.colliders,{height:1.05});world.addBoxes(neighborhoodBoxes);
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
assert(spots.fen.day.every(s=>s.act==='tend'),'Farmer Fen does not tend the vegetable bed');
assert(spots.moss.day[0].act==='read'&&spots.moss.day[0].up,'Mossbeard does not read at the desk');
assert.equal(HOSTS.length,8,'all eight valley hosts are in the house');
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
// 4. You walk up: it turns to you smoothly, hops hello, a shopkeeper speaks.
{
  const c=make('fen',{host:{view:'farm',name:'Farmer Fen'}}),spot=spots.fen.day[0];c.greetIn=0;
  const player={x:spot.x+1.6,y:spot.y,z:spot.z};let hop=0,said=null,maxTurn=0,last=c.heading;
  for(let i=0;i<45;i++){const {out}=updateCompanion(c,1/30,{world,player,night:false,seen:()=>true});if(out.hop)hop=out.hop;if(c.say)said=c.say;
    maxTurn=Math.max(maxTurn,Math.abs(wrap(c.heading-last)));last=c.heading;}
  assert(hop>0,'no hello hop');assert.equal(said?.view,'farm','Farmer Fen did not speak');
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
console.log(`PASS routines: ${Object.keys(ROUTINES).length} companions' day and night places resolve clear of stations; bedtime naps, calm days, smooth hellos, host lines, stepping aside, eggs stay`);
