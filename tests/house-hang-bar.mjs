// The monkey bars (hang-bar.mjs): the rungs must come out of the export, there
// must be somewhere under them the pet can stand, and the ride must actually
// hang it off a rung — paws at bar height, body below, swinging along the bars
// and nowhere near the floor — then leave it somewhere it can land.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WalkingWorld} from '../house-test/physics.mjs';
import {hangBarInteractions} from '../house-test/hang-bar.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../house-test/house.json',import.meta.url),'utf8'));
const world=new WalkingWorld(data.colliders,{height:1.05});
const rods=data.colliders.filter(b=>/^Overhead monkey bar/.test(b.name));
assert(rods.length>=6,`only ${rods.length} monkey bar rungs in the export`);
const barY=(rods[0].min[1]+rods[0].max[1])/2;

const list=[],ticking=[],player={x:0,y:0,z:0},body={airborne:false,vy:0};
const rides=[];const life={hop(){},say(){},face(){},ride(v){rides.push(v);}};
hangBarInteractions({world,data,player,life,body,reducedMotion:false,list,ticking,sounds:{boing(){}}});
const bars=list.filter(it=>it.id==='monkey-bars');
assert.equal(bars.length,1,'hang-bar.mjs did not add exactly one interaction');
const it=bars[0];
assert.equal(it.kind,'ride');
// Somewhere to stand: on the sunroom floor, under the frame, not inside it.
const spot=world.safeSpot(it.at.x,it.at.y,it.at.z);
assert(spot&&Math.hypot(spot.x-it.at.x,spot.z-it.at.z)<.05,`nowhere to stand at ${JSON.stringify(it.at)}`);
assert(it.at.y<.2&&barY-it.at.y>1.5,'the spot is not the floor under the bars');
// In reach from under the bars, out of reach from across the room.
assert(it.distance({x:it.at.x,y:it.at.y,z:it.at.z})===0,'the spot itself is not in reach');
assert(it.distance({x:2.8,y:0,z:-9.2})<it.radius,'you cannot reach the bars from the north side');
assert(it.distance({x:2.8,y:0,z:-13})>it.radius,'the bars are in reach from the far side of the sunroom');
// Ride it for four seconds: the pet ends up hanging, and swinging.
Object.assign(player,{x:2.8,y:it.at.y,z:-9.2});
it.start();
let low=Infinity,high=-Infinity,zLow=Infinity,zHigh=-Infinity;
for(let i=0;i<240;i++){
  const steer=it.tick(1/60);
  assert(Number.isFinite(steer.yaw),'the ride does not steer the camera');
  if(i>40){low=Math.min(low,player.y);high=Math.max(high,player.y);zLow=Math.min(zLow,player.z);zHigh=Math.max(zHigh,player.z);}
}
// Straight down it is a body's length under the rung; at the ends of the
// swing the arc carries it up a little, as a pendulum does.
assert(Math.abs(barY-low-.58)<.06,`the pet hangs ${(barY-low).toFixed(2)} m under the rung, not a body's length`);
assert(high<barY-.4&&low>it.at.y+.8,'the pet is not hanging clear between the rung and the floor');
assert(zHigh-zLow>.4&&zHigh-zLow<1.0,`the swing is ${(zHigh-zLow).toFixed(2)} m end to end`);
const last=rides[rides.length-1];
assert(last.pose&&last.pose.stretch===1,'the pet is not reaching up');
// Letting go: over floor it can land on, and falling rather than teleporting.
it.stop();
const land=world.floor(player.x,player.z,it.at.y);
assert(Number.isFinite(land)&&!world.blocked(player.x,player.z,land),'it lets go over something it cannot land on');
assert(body.airborne&&player.y>land+.5,'it does not drop, it teleports');
console.log(`PASS monkey bars: ${rods.length} rungs at y ${barY.toFixed(2)}; hangs ${(barY-low).toFixed(2)} m below, swings ${(zHigh-zLow).toFixed(2)} m, lands on ${land.toFixed(2)}`);
