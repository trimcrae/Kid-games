// The family-room Roomba (house-test/roomba.mjs): it must park on the carpet
// beside the hearth, and once it is switched on it must stay in the family
// room — off the hearth, off the stairs, out of the furniture — however long
// it trundles, and it must turn away from the pet rather than through it.
// The module is run here against the real export with a stub three.js: only
// the driving is under test, not the cylinders it is drawn from.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {WalkingWorld} from '../house-test/physics.mjs';
import {roombaInteractions} from '../house-test/roomba.mjs';

const data = JSON.parse(fs.readFileSync(new URL('../house-test/house.json', import.meta.url), 'utf8'));
const world = new WalkingWorld(data.colliders, {height: 1.05});
globalThis.window = globalThis.window || {};      // no AudioContext: the hum stays quiet

// Just enough three.js to be built out of: a group of meshes with a transform.
const vec = () => ({x: 0, y: 0, z: 0, set(x, y, z) {this.x = x; this.y = y; this.z = z;}});
class Obj {constructor() {this.position = vec(); this.rotation = vec(); this.children = [];} add(...o) {this.children.push(...o);}}
const THREE = {Group: Obj, Mesh: class extends Obj {constructor(g, m) {super(); this.geometry = g; this.material = m;}},
  CylinderGeometry: class {}, TorusGeometry: class {},
  MeshStandardMaterial: class {constructor(o = {}) {Object.assign(this, o);}}};
const scene = {add() {}}, list = [], ticking = [];
const player = {x: 13.0, y: -1.03, z: -3.0};
const said = [];
const life = {say: t => said.push(t), hop() {}};
roombaInteractions({THREE, scene, world, player, life, list, ticking, reducedMotion: false});

const it = list.find(i => i.id === 'roomba');
assert(it && it.kind === 'toggle' && typeof it.start === 'function', 'no roomba toggle interaction');
// Parked on the family-room carpet, within arm's reach of the hearth.
const hearth = data.colliders.find(b => b.name === 'Fireplace hearth');
assert(hearth, 'no fireplace hearth in the export');
const park = it.at, floor = world.floor(park.x, park.z, park.y);
assert(Number.isFinite(floor) && Math.abs(floor - park.y) < .02 && !world.blocked(park.x, park.z, floor),
  `the roomba is not parked anywhere it could stand (${JSON.stringify(park)})`);
const near = Math.hypot(Math.max(0, Math.max(hearth.min[0] - park.x, park.x - hearth.max[0])),
  Math.max(0, Math.max(hearth.min[2] - park.z, park.z - hearth.max[2])));
assert(near < 1.0, `the roomba is ${near.toFixed(2)} m from the hearth, not beside the fireplace`);
assert(it.label() === 'Switch on the Roomba', 'the pill does not offer to switch it on');

// Switched on and left to it for two minutes of frames.
it.start();
assert(it.label() === 'Switch off the Roomba' && said.length === 1, 'switching it on said nothing');
const dt = 1 / 60;
player.x = 99; player.z = 99;                     // the pet is elsewhere for now
for (let i = 0; i < 120 * 60; i++) {
  for (const f of ticking) f(dt);
  const p = it.at, f = world.floor(p.x, p.z, -1.03);
  assert(p.x > 9.8 && p.x < 14.6 && p.z > -4.55 && p.z < -.1, `it left the family room (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`);
  assert(Number.isFinite(f) && Math.abs(f + 1.03) < .06, `it climbed onto something at ${f} (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`);
  assert(!world.blocked(p.x, p.z, f, .02), `it drove into ${world.blocked(p.x, p.z, f, .02)}`);
  for(let j=0;j<8;j++){
    const x=p.x+Math.sin(j*Math.PI/4)*.17,z=p.z+Math.cos(j*Math.PI/4)*.17,edge=world.floor(x,z,-1.03);
    assert(x>9.85&&x<14.58&&z>-4.5&&z<-.15&&Number.isFinite(edge)&&Math.abs(edge+1.03)<.05&&!world.blocked(x,z,edge,.015),
      `the Roomba bumper clipped furniture or left the carpet at ${x.toFixed(2)}, ${z.toFixed(2)}`);
  }
}
const ran = globalThis.window.houseRoomba();
assert(ran.on && ran.bumps > 3, `it barely moved (${ran.bumps} bumps)`);
assert(Math.hypot(ran.x - park.x, ran.z - park.z) > .3 || ran.bumps > 3, 'it never went anywhere');

// It gets out of the pet's way: with the pet stood in the middle of the room
// for a minute, it never comes right up against its paws.
const startPet=[{x:12.7,z:-2.4},{x:11.5,z:-2.2},{x:13.2,z:-1.2}].sort((a,b)=>Math.hypot(b.x-it.at.x,b.z-it.at.z)-Math.hypot(a.x-it.at.x,a.z-it.at.z))[0];
player.x=startPet.x; player.z=startPet.z;
let closest = 9;
for (let i = 0; i < 60 * 60; i++) {
  for (const f of ticking) f(dt);
  closest = Math.min(closest, Math.hypot(player.x - it.at.x, player.z - it.at.z));
}
assert(closest > .22, `it came within ${closest.toFixed(2)} m of the pet`);
// And E again stops it where it stands.
it.start();
const stopped = it.at;
for (let i = 0; i < 120; i++) for (const f of ticking) f(dt);
assert(Math.hypot(it.at.x - stopped.x, it.at.z - stopped.z) < 1e-9, 'switching it off did not stop it');

console.log(`PASS roomba: parked ${near.toFixed(2)} m from the hearth; 2½ minutes of roaming stayed on the family-room carpet (${ran.bumps} bumps); stops on E`);
