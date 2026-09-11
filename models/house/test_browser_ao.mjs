import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {loadHouseOcclusion} from '../../house-test/ambient-occlusion.mjs';
import {createHouseMaterial} from '../../house-test/materials.mjs';
import * as THREE from '../../house-test/vendor/three.module.min.js';
const hash=bytes=>createHash('sha256').update(new Uint8Array(bytes)).digest('hex');
const binary=new Float32Array(18).buffer,bytes=Uint8Array.from([255,128,0]);
const data={meshSha256:hash(binary),groups:[{offset:0,count:3}]};
let requests=0;
const fetcher=async()=>{requests++;return new Response(gzipSync(bytes));};
assert.equal(await loadHouseOcclusion(data,binary,fetcher),null);
assert.equal(requests,0,'Old manifests must not request an AO sidecar');
data.ambientOcclusion={url:'house.ao.gz',encoding:'uint8',vertexCount:3,
  meshSha256:data.meshSha256,sha256:hash(bytes),strength:.35,bake:{rays:8}};
const result=await loadHouseOcclusion(data,binary,fetcher);
assert.deepEqual(result.bytes,bytes);assert.equal(result.strength,.35);
const attribute=new THREE.BufferAttribute(result.bytes,1,true);
assert.equal(attribute.getX(0),1);assert.equal(attribute.getX(2),0);
assert(Math.abs(attribute.getX(1)-128/255)<1e-8);
const alter=patch=>({...data,ambientOcclusion:{...data.ambientOcclusion,...patch}});
await assert.rejects(loadHouseOcclusion(alter({vertexCount:4}),binary,fetcher),/vertex count/);
await assert.rejects(loadHouseOcclusion(alter({meshSha256:'f'.repeat(64)}),binary,fetcher),/descriptor/);
await assert.rejects(loadHouseOcclusion(data,new Float32Array(18).fill(1).buffer,fetcher),/different mesh/);
await assert.rejects(loadHouseOcclusion({...data,groups:[{offset:24,count:3}]},binary,fetcher),/group coverage/);
await assert.rejects(loadHouseOcclusion(data,binary,async()=>new Response(gzipSync(Uint8Array.from([1,2])))),/byte count/);
await assert.rejects(loadHouseOcclusion(alter({sha256:'f'.repeat(64)}),binary,fetcher),/checksum/);
await assert.rejects(loadHouseOcclusion(alter({strength:1}),binary,fetcher),/descriptor/);
const group={name:'AO fixture',color:[.4,.4,.4],finish:{surface:'paint'}};
const material=createHouseMaterial(group,{ambientOcclusionStrength:.35});
const shader={vertexShader:THREE.ShaderLib.physical.vertexShader,
  fragmentShader:THREE.ShaderLib.physical.fragmentShader,uniforms:{}};
material.onBeforeCompile(shader);
assert.equal(shader.defines.HOUSE_AO,1);
assert.equal(shader.uniforms.houseOcclusionStrength.value,.35);
assert(shader.fragmentShader.includes('reflectedLight.indirectDiffuse*=houseAO'));
assert(shader.fragmentShader.includes('reflectedLight.indirectSpecular*=houseAO'));
// Design change (render pass): a bounded share of the occlusion also darkens
// direct diffuse light so furniture sits in its own shadow; specular stays.
assert(!/reflectedLight\.direct(?:Diffuse|Specular)\s*\*=\s*houseAO\s*;/.test(shader.fragmentShader),'Direct light must not take full occlusion');
assert(shader.fragmentShader.includes('reflectedLight.directDiffuse*=mix(1.0,houseAO,houseOcclusionShape.z)'));
assert(!/reflectedLight\.directSpecular\s*\*=/.test(shader.fragmentShader));
assert(shader.uniforms.houseOcclusionShape.value.z>0&&shader.uniforms.houseOcclusionShape.value.z<.6);
const ordinary=createHouseMaterial(group),plainShader={vertexShader:THREE.ShaderLib.physical.vertexShader,
  fragmentShader:THREE.ShaderLib.physical.fragmentShader,uniforms:{},defines:{}};
ordinary.onBeforeCompile(plainShader);assert.equal(plainShader.defines.HOUSE_AO,undefined);
material.dispose();ordinary.dispose();
console.log('PASS optional AO loading, raw mesh binding, payload integrity, normalized values and ambient + partial direct occlusion hook');
