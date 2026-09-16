// The Marauder's Map draws each floor from the walking world's own boxes:
// every floor of the house must come out with a floor to stand on, walls to
// draw and some furniture to sketch, each room's name must land on the floor
// it belongs to, and whoever is in the house must be placed on a floor.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WalkingWorld} from '../house-test/physics.mjs';
import {FLOORS,createFloorFinder,classify} from '../house-test/marauders-map.mjs';
import {rooms} from '../house-test/rooms.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../house-test/house.json',import.meta.url),'utf8'));
const world=new WalkingWorld(data.colliders,{height:1.05}),floorOf=createFloorFinder(world);
const counts={};
for(const [name,L] of FLOORS){
  const c={floor:0,wall:0,furniture:0};
  for(const b of world.boxes){const k=classify(b,L);if(k)c[k]++;}
  counts[name]=c;
  assert(c.floor>=1&&c.wall>=4&&c.furniture>=3,`${name}: nothing much to draw ${JSON.stringify(c)}`);
}
// The main floor's stair-bay front wall is one of the walls drawn on both the
// main floor and downstairs (it runs from the family room floor to the ceiling).
const bay=world.boxes.find(b=>b.name==='Stair bay front wall');
assert(bay&&classify(bay,0)==='wall'&&classify(bay,-1.05)==='wall','the stair bay front wall is missing from the map');
// Room names go on the floor their spot is at; the street stays off the map.
for(const r of rooms){const f=floorOf({x:r[2],y:r[4],z:-r[3]});assert.equal(f,r[0]==='Craepet street'?'Outside':r[0],`${r[1]} lands on the wrong floor`);}
assert.equal(floorOf({x:14.6,y:1.85,z:-5.6}),'Upstairs','a pet asleep on the big bed is upstairs');
assert.equal(floorOf({x:8.9,y:-.47,z:-7.0}),'Downstairs','a pet on a downstairs bed is downstairs');
assert.equal(floorOf({x:.64,y:.5,z:-1.83}),'Main floor','a pet on the couch is on the main floor');
assert.equal(floorOf({x:4.6,y:-.1,z:-11}),'Main floor','a cat at the sunroom door is on the main floor');
assert.equal(floorOf({x:6,y:-.82,z:-15}),'Outside','the back lawn is outside');
assert.equal(floorOf({x:8.6,y:-.5,z:-2.62}),'Downstairs','halfway down the flight to the family room');
console.log(`PASS marauders map: ${FLOORS.length} floors drawn ${JSON.stringify(counts)}`);
