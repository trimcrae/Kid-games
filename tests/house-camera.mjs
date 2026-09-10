import assert from 'node:assert/strict';
import {companionBlocksCamera} from '../house-test/house-life.mjs';

const body={minY:0,maxY:1.2,radius:.35},origin={x:0,y:0,z:0};
// The former distance-to-feet check missed a head beside the camera.
const besideHead={x:.08,y:1.1,z:.1};
assert(Math.hypot(besideHead.x,besideHead.y,besideHead.z)>.85);
assert(companionBlocksCamera(origin,besideHead,body));
assert(companionBlocksCamera(origin,{x:0,y:1.42,z:.2},body),'Tall ears/animation margin');
assert(!companionBlocksCamera(origin,{x:1.2,y:1.1,z:0},body),'Normally separated companion');
assert(!companionBlocksCamera(origin,{x:0,y:3,z:0},body),'Companion on another floor');
assert(companionBlocksCamera({x:5,y:-3.15,z:-4},{x:5.1,y:-2.1,z:-4.1},body));
console.log('PASS companion head/ear camera clearance and normal distant visibility');
