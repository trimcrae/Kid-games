// Pets have to read as pets in the real-size house: measured against the
// model's own dining table, chair seats and front door.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../house-test/vendor/three.module.min.js';
import {creature,petpet,PET_SCALE} from '../house-test/creatures.mjs';

const {colliders}=JSON.parse(fs.readFileSync(new URL('../house-test/house.json',import.meta.url),'utf8'));
const box=name=>colliders.find(b=>b.name===name);
const dining=box('Tabletop.005'),seat=box('Chair seat'),door=box('Red door slab');
const table=dining.max[1],chair=seat.max[1],doorWidth=door.max[0]-door.min[0];
assert(table>.7&&table<.85&&chair>.4&&chair<.6&&doorWidth>.8,'Reference furniture moved');

function size(object){let root=object;while(root.parent)root=root.parent;root.updateMatrixWorld(true);return new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());}
const species=['snorbit','puddlepop','flarn','twiggle','glimmr','zibbit','blorb'];
for(const sp of species){
  const pet=creature({species:sp});pet.scale.setScalar(PET_SCALE);const s=size(pet);
  const egg=creature({species:sp,egg:true});egg.scale.setScalar(PET_SCALE);
  assert(s.y<table+.05,`${sp} stands ${s.y.toFixed(2)} m, over the ${table.toFixed(2)} m dining table`);
  assert(s.x<doorWidth*.8,`${sp} is ${s.x.toFixed(2)} m wide for a ${doorWidth.toFixed(2)} m door`);
  assert(size(egg).y<s.y,`${sp} egg is not smaller than the hatched pet`);
}
// A round-eared blorb, without tall ears or crests, stands between the seat
// and the table top.
const plain=creature({species:'blorb'});plain.scale.setScalar(PET_SCALE);
const head=size(plain).y;
assert(head>chair-.05&&head<table,`Blorb height ${head.toFixed(2)} m`);
// A petpet rides along at its pet's scale.
const owner=creature({species:'blorb'});owner.add(petpet('duckling'));owner.scale.setScalar(PET_SCALE);
assert(size(owner.children.at(-1)).y<head/2,'Petpet outgrew its owner');
console.log(`PASS pet scale ${PET_SCALE}: blorb ${head.toFixed(2)} m between ${chair.toFixed(2)} m seat and ${table.toFixed(2)} m table; all species fit a ${doorWidth.toFixed(2)} m door`);
