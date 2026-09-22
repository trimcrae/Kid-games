// Distance-driven quadruped locomotion. Stance feet stay in world space;
// only a lifted foot travels to the next foothold. Two-bone IK fits the leg.
export function createWalkRig(THREE, legs) {
  return { legs, phase: 0, previous: null, inverse: new THREE.Matrix4(),
    down: new THREE.Vector3(0, -1, 0), direction: new THREE.Vector3(),
    bend: new THREE.Vector3(), joint: new THREE.Vector3(), target: new THREE.Vector3(),
    yaw: new THREE.Quaternion(), undo: new THREE.Quaternion() };
}

export function updateWalk(THREE, cr, dt, heightAt) {
  const rig = cr.parts.walk;
  if (!rig) return;
  const scale = cr.scale || 1, S = cr.spec;
  const travelled = rig.previous ? rig.previous.distanceTo(cr.pos) : 0;
  const teleported = travelled > Math.max(3, S.len * 2);
  if (!rig.previous) rig.previous = cr.pos.clone();
  rig.previous.copy(cr.pos);
  const stride = Math.max(.12, S.sh * (S.trunk ? .55 : cr.fleeing ? .95 : .65)) * scale;
  const advance = teleported ? 0 : travelled / stride;
  rig.phase += advance;
  const duty = cr.fleeing && !S.trunk ? .55 : .7;
  // Lateral four-beat walk; a diagonal trot for running cats and ungulates.
  const offsets = cr.fleeing && !S.trunk ? [0, .5, .5, 0] : [0, .5, .75, .25];
  cr.group.updateMatrixWorld(true);
  rig.inverse.copy(cr.group.matrixWorld).invert();
  rig.yaw.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, cr.heading || 0);
  rig.undo.copy(cr.group.quaternion).invert().multiply(rig.yaw);
  const moving = advance > .00001;
  for (let i = 0; i < rig.legs.length; i++) {
    const leg = rig.legs[i];
    const phase = (rig.phase + offsets[i]) % 1;
    const wantsSwing = moving && phase >= duty;
    const neutral = rig.target.copy(leg.hip).applyMatrix4(cr.group.matrixWorld);
    neutral.y = heightAt(neutral.x, neutral.z) + leg.footH * scale;
    if (!leg.planted || teleported) {
      leg.planted = neutral.clone(); leg.from = neutral.clone(); leg.to = neutral.clone();
      leg.swing = false; leg.wasSwing = false; leg.progress = 0;
    }
    const needsStep = moving && Math.hypot(neutral.x-leg.planted.x,neutral.z-leg.planted.z) > stride*duty*.6;
    if (((wantsSwing && !leg.wasSwing) || needsStep) && !leg.swing) {
      leg.swing = true; leg.progress = 0; leg.from.copy(leg.planted);
      leg.to.copy(neutral);
      leg.to.x += Math.sin(cr.heading) * stride * (1-duty*.5);
      leg.to.z += Math.cos(cr.heading) * stride * (1-duty*.5);
      leg.to.y = heightAt(leg.to.x, leg.to.z) + leg.footH * scale;
    }
    leg.wasSwing = wantsSwing;
    if (leg.swing) {
      // Finish a step gently if the animal stops halfway through it.
      leg.progress = Math.min(1, leg.progress + (moving ? advance / (1-duty) : dt * 4));
      const u = leg.progress, smooth = u*u*(3-2*u);
      leg.planted.lerpVectors(leg.from, leg.to, smooth);
      leg.planted.y += Math.sin(Math.PI*u) ** 2 * S.sh * (S.trunk ? .09 : .16) * scale;
      if (u >= 1) leg.swing = false;
    }
    // Feet stay fixed during stance, including when the body turns.
    const end = rig.target.copy(leg.planted).applyMatrix4(rig.inverse).sub(leg.hip);
    const distance = Math.max(.001, end.length());
    // A little soft extension absorbs a long frame or a sharp turn without
    // detaching the ankle from its planted foot. It settles on the next step.
    const extension = Math.min(1.18, Math.max(1, distance/(leg.upperLength+leg.lowerLength)+.0001));
    const a = leg.upperLength*extension, b = leg.lowerLength*extension;
    leg.upper.scale.y=a;leg.lower.scale.y=b;
    const d = Math.min(a+b-.0001, Math.max(Math.abs(a-b)+.0001, distance));
    rig.direction.copy(end).divideScalar(distance);
    const along = (a*a-b*b+d*d)/(2*d), rise = Math.sqrt(Math.max(0,a*a-along*along));
    rig.bend.set(0,0,leg.front ? -1 : 1);
    rig.bend.addScaledVector(rig.direction,-rig.bend.dot(rig.direction)).normalize();
    rig.joint.copy(rig.direction).multiplyScalar(along).addScaledVector(rig.bend,rise);
    leg.upper.quaternion.setFromUnitVectors(rig.down,rig.direction.copy(rig.joint).normalize());
    leg.lower.position.copy(rig.joint);
    leg.lower.quaternion.setFromUnitVectors(rig.down,rig.direction.copy(end).sub(rig.joint).normalize());
    leg.foot.position.copy(end); leg.foot.quaternion.copy(rig.undo);
  }
}
