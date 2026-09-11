// Furnish & decorate pieces go to fixed places in the living room and foyer,
// not a showroom grid: each slot is on free floor (or against a wall for
// pictures), clear of the walking lanes (same lanes as tests/house-dressing.mjs)
// and of every activity station and arrival spot.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WalkingWorld} from '../house-test/physics.mjs';
import {rooms} from '../house-test/rooms.mjs';
import {DECOR_SLOTS,placeDecor,decorKind} from '../house-test/decor-slots.mjs';

const data=JSON.parse(fs.readFileSync(new URL('../house-test/house.json',import.meta.url),'utf8'));
const world=new WalkingWorld(data.colliders,{height:1.05});
const lanes=[[[5.30,-.90],[5.60,.70],[5.60,4.90],[5.50,5.30]],[[5.60,2.60],[7.60,2.60]],[[5.60,2.60],[7.60,4.00]],
  [[4.60,3.60],[4.60,5.25],[3.00,5.90],[2.00,6.80],[.90,7.35],[-.70,7.50]],[[5.60,7.50],[5.20,8.10],[4.90,9.00],[4.65,11.30]]];
function seg(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
const laneDistance=p=>Math.min(...lanes.flatMap(l=>l.slice(1).map((b,i)=>seg(p,l[i],b))));
const spots=rooms.filter(r=>r[4]===0).flatMap(r=>[[r[2],r[3]],...(r[6]?[[r[6][0],r[6][1]]]:[])]);
const failures=[];let n=0;
for(const [kind,list] of Object.entries(DECOR_SLOTS))for(const s of list){
  n++;const [x,y]=s.at;
  const lane=laneDistance(s.at),spot=Math.min(...spots.map(q=>Math.hypot(q[0]-x,q[1]-y)));
  if(!s.hang&&lane<.6)failures.push(`${kind} ${s.at}: ${lane.toFixed(2)} m from a lane`);
  if(spot<.9)failures.push(`${kind} ${s.at}: ${spot.toFixed(2)} m from a station/arrival`);
  const f=world.floor(x,-y,0);
  if(s.hang){ // a wall right behind the picture, at picture height
    const behind=[.1,.15,.2,.25].some(d=>world.blocked(x-Math.sin(s.turn)*d,-(y)-Math.cos(s.turn)*d,.9));
    if(!behind)failures.push(`${kind} ${s.at}: no wall behind the picture`);
  }else if(!Number.isFinite(f)||Math.abs(f)>.1||world.blocked(x,-y,f))failures.push(`${kind} ${s.at}: not on free floor`);
}
assert.deepEqual(failures,[],failures.join('\n'));
// Kinds and overflow: 30 mixed items fill the slots once each, never twice.
const items=['Cloud Bed','Fern Plant','Floor Lamp','Rainbow Rug','Book Shelf','Star Poster','Wall Clock','Toy Chest','Cushion','Bonsai'].map((name,i)=>({id:'i'+i,name}));
assert.equal(decorKind({id:'x',name:'Star Poster'}),'wall');
const placed=placeDecor([...items,...items,...items]);
const keys=placed.map(p=>p.kind+':'+DECOR_SLOTS[p.kind].indexOf(p.slot));
assert.equal(new Set(keys).size,keys.length,'two pieces in one slot');
assert(placed.length<=n,'more pieces than slots');
console.log(`PASS decor slots: ${n} places in the living room and foyer, clear of lanes and stations; ${placed.length} of 30 pieces placed, one per slot`);
