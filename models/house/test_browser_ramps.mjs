// Feed Python-exported ramp boxes to the actual walking engine, in both
// directions. This guards the original whole-apron AABB "wall" regression.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {WalkingWorld} from '../../house-test/physics.mjs';
const python=process.env.PYTHON||'python';
const boxes=JSON.parse(execFileSync(python,['-B','-c',`
import json
from browser_materials import ramp_colliders
print(json.dumps(ramp_colliders('Apron', [(-6.75,-4.8,-.795),(-.25,-4.8,-.795),
    (-.25,-1.8,-.16),(-6.75,-1.8,-.16)], 'y')))
`],{cwd:fileURLToPath(new URL('./',import.meta.url)),encoding:'utf8'}));
assert.equal(boxes.length,30);
const world=new WalkingWorld([
  {name:'Driveway',min:[-6.75,-.84,4.8],max:[-.25,-.7925,16]},
  ...boxes,
  {name:'Garage floor',min:[-6.9,-.32,-8.1],max:[-.1,-.16,1.8]},
],{height:1.05});
for(const [start,end] of [[5.3,1.4],[1.4,5.3]]){
  const p=world.safeSpot(-3.5,start>4.8?-.7925:-.16,start);
  assert(p,'Safe ramp endpoint');
  for(let i=0;i<200&&Math.abs(p.z-end)>.015;i++){
    world.move(p,0,Math.sign(end-p.z)*Math.min(.025,Math.abs(end-p.z)));
    if(p.z>1.8&&p.z<4.8){
      const surface=-.795+(4.8-p.z)/3*.635;
      assert(Math.abs(p.y-surface)<.04,'Walking feet departed from visible ramp');
    }
  }
  assert(Math.abs(p.z-end)<.02,'Apron behaved like a wall');
  assert(Math.abs(p.y-(end>4.8?-.7925:-.16))<.02,'Wrong floor at ramp endpoint');
}
console.log('PASS exported 30-strip apron walks uphill/downhill against actual WalkingWorld');
