import assert from 'node:assert/strict';
import {freshState, placeBlock, mineBlock, assess, restoreState} from '../tools/parent-demos/block-lab/logic.mjs';
import {normalizeState, checkMixture, correctOrder} from '../tools/parent-demos/spellbound/logic.mjs';

// Build through the same inventory/support rules as a player, using independently
// specified coordinates rather than copying the mission's expected-target array.
const island = freshState();
island.inventory = {moss:20,stone:20,amber:20};
const place = (x,y,z,material) => assert.equal(placeBlock(island,x,y,z,material),null);
assert(placeBlock(island,6,2,4,'stone'), 'Floating blocks must need support');
assert(placeBlock(island,0,1,4,'stone'), 'Coordinates are bounded');
place(2,1,2,'amber'); place(6,1,2,'amber');
assert.equal(assess(0,island.blocks).complete,false,'Two beacons are not three');
place(6,1,6,'amber');
assert.equal(assess(0,island.blocks).complete,true);
for (let x=2;x<=4;x++) for(let z=3;z<=6;z++) place(x,1,z,'moss');
assert.equal(assess(1,island.blocks).complete,true);
place(2,2,3,'moss');
assert.equal(assess(1,island.blocks).complete,false,'An extra layer is not a flat garden');
assert.equal(mineBlock(island,2,2,3),null);
for (let y=1;y<=3;y++) for (let x=6;x<=7;x++) for(let z=4;z<=5;z++) place(x,y,z,y===3?'amber':'stone');
assert.equal(assess(2,island.blocks).complete,true);
assert(mineBlock(island,6,1,4),'Cannot undermine the tower');
const amberBefore = island.inventory.amber;
assert.equal(mineBlock(island,6,3,4),null);
assert.equal(island.inventory.amber,amberBefore+1,'Mining returns the material');
place(6,3,4,'stone');
assert.equal(assess(2,island.blocks).complete,false,'Correct volume with 9:3 mix must fail');
assert.equal(mineBlock(island,6,3,4),null); place(6,3,4,'amber');
island.stage=2; island.completed=true;
assert.deepEqual(restoreState(JSON.parse(JSON.stringify(island))),island,'Completed work survives reload');
const broken = {...island, blocks:island.blocks.filter(b=>!(b.x===2&&b.z===2)), stage:0};
assert.equal(restoreState(broken).completed,false,'Completion requires earlier constructions');
const sandbox = restoreState({...broken, freeplay:true});
assert.equal(sandbox.completed,true,'Earned completion remains after free building changes the island');
assert.equal(sandbox.freeplay,true);
assert.deepEqual(restoreState(JSON.parse(JSON.stringify(sandbox))),sandbox);
assert.equal(restoreState({version:1,blocks:[{x:2,y:4,z:2,material:'stone'}]}).blocks.length,0,'Unsupported saved blocks are discarded');
assert.equal(restoreState({version:99,blocks:[]}).stage,0,'Unknown saves start fresh');

for(let dew=0;dew<=8;dew++) for(let mint=0;mint<=8;mint++) {
  assert.equal(checkMixture(dew,mint).correct,dew===4&&mint===2,`${dew} dew / ${mint} mint`);
}
for (const order of [['warm','stir','ring'],['warm','ring','stir'],['stir','warm','ring'],['stir','ring','warm'],['ring','warm','stir'],['ring','stir','warm'],[],['warm','stir']]) {
  assert.equal(correctOrder(order),order.join('|')==='warm|stir|ring');
}
for(let bits=0;bits<32;bits++) {
  const input=Object.fromEntries(['archive','roots','potion','complete','started'].map((key,i)=>[key,Boolean(bits&(1<<i))]));
  const saved=normalizeState(input);
  assert(!saved.complete||saved.potion); assert(!saved.potion||saved.roots); assert(!saved.roots||saved.archive);
  assert.deepEqual(normalizeState(JSON.parse(JSON.stringify(saved))),saved);
}
console.log('PASS: actual builds, ratios, mining, support, persistence, potion mixture/order, and story prerequisites.');
