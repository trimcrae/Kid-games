/* ===========================================================
   Photo Expedition — the animals.
   -----------------------------------------------------------
   Every creature is built from spheres, cylinders, cones and
   boxes with a hand-drawn canvas texture for stripes, spots and
   markings — no models are downloaded. A few parametric rigs
   cover the whole zoo:

     quad      four legs, neck, head, tail, plus extras (mane, trunk,
               tusks, horns, antlers, hump, ears of every size)
     blob      seals, sea lions, walruses: a body that flops along
     shelled   tortoise
     lizard    marine iguana
     upright   penguins
     bird      anything that flies (wings flap, feet tuck)
     fish      turtle, shark, clownfish, manta, whale
     flutter   butterflies

   Then a little brain: wander, graze, follow the herd, and RUN if
   the photographer gets too close. The shyness is the tier's
   difficulty knob. Rare animals only come out at the time of day
   the field guide says.
   =========================================================== */

/* ---------------- textures ---------------- */
function patternTexture(THREE, base, kind, colour2, seed) {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  let s = seed || 7; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  g.fillStyle = colour2 || "#000";
  if (kind === "stripes") {
    for (let i = 0; i < 14; i++) {
      const x = i * 9 + rnd() * 4, w = 3 + rnd() * 3;
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w, 0); g.lineTo(x + w + 8 * Math.sin(i), 128); g.lineTo(x + 8 * Math.sin(i), 128); g.closePath(); g.fill();
    }
  } else if (kind === "spots") {
    for (let i = 0; i < 40; i++) { const x = rnd() * 128, y = rnd() * 128, r = 3 + rnd() * 6; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  } else if (kind === "rosettes") {
    g.lineWidth = 2.2; g.strokeStyle = colour2 || "#000";
    for (let i = 0; i < 30; i++) { const x = rnd() * 128, y = rnd() * 128, r = 4 + rnd() * 4; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(x, y, 1.4, 0, Math.PI * 2); g.fill(); }
  } else if (kind === "patches") {
    for (let i = 0; i < 18; i++) { const x = rnd() * 128, y = rnd() * 128, r = 8 + rnd() * 12; g.beginPath(); g.ellipse(x, y, r, r * 0.7, rnd() * 3, 0, Math.PI * 2); g.fill(); }
  } else if (kind === "belly") {
    // dark back, pale front (penguins, orcas, sharks): top half of the texture is the back
    g.fillRect(0, 0, 128, 64);
  } else if (kind === "bands") {
    for (let i = 0; i < 3; i++) g.fillRect(20 + i * 40, 0, 12, 128);
  } else if (kind === "shaggy") {
    for (let i = 0; i < 400; i++) { g.globalAlpha = 0.25; g.fillRect(rnd() * 128, rnd() * 128, 2, 6 + rnd() * 8); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/* ---------------- species ---------------- */
/* Sizes are metres. len = body length, sh = shoulder height. */
const SPECIES = {
  lion:      { rig: "quad", len: 1.9, sh: 1.05, w: 0.6, colour: "#c9a15c", belly: "#e0c48e", head: 0.42, snout: 0.5, neck: [0.35, 0.3], legs: 0.22, ears: 0.12, tail: [1.0, 0.06, "tuft"], mane: true, speed: 1.2, flee: 5.5, alert: 26, herd: 3, graze: 0.5, habitat: "dry" },
  elephant:  { rig: "quad", len: 4.2, sh: 3.1, w: 1.8, colour: "#8a8583", head: 0.9, snout: 0, neck: [0.2, 0.1], legs: 0.45, ears: 0.9, bigEars: true, tail: [1.4, 0.05], trunk: true, tusks: true, speed: 1.0, flee: 4.5, alert: 22, herd: 4, graze: 0.5, habitat: "any" },
  giraffe:   { rig: "quad", len: 2.4, sh: 3.0, w: 0.8, colour: "#e0a95c", pattern: ["patches", "#8a5a2a"], head: 0.4, snout: 0.5, neck: [2.3, 1.05], legs: 0.2, ears: 0.14, ossicones: true, tail: [1.0, 0.04, "tuft"], speed: 1.4, flee: 6, alert: 24, herd: 3, graze: 0.4, browse: true, habitat: "any" },
  zebra:     { rig: "quad", len: 2.1, sh: 1.35, w: 0.65, colour: "#f4f4f2", pattern: ["stripes", "#1a1a1a"], head: 0.36, snout: 0.5, neck: [0.7, 0.75], legs: 0.16, ears: 0.14, maneRidge: true, tail: [0.7, 0.04, "tuft"], speed: 1.6, flee: 7, alert: 28, herd: 6, graze: 0.6, habitat: "dry" },
  jaguar:    { rig: "quad", len: 1.6, sh: 0.7, w: 0.5, colour: "#d9a441", pattern: ["rosettes", "#2a1a0a"], belly: "#f0e0c0", head: 0.34, snout: 0.4, neck: [0.3, 0.2], legs: 0.16, ears: 0.1, tail: [1.0, 0.05], speed: 1.3, flee: 7, alert: 34, herd: 1, graze: 0.2, habitat: "riverbank", rare: true },
  capybara:  { rig: "quad", len: 1.2, sh: 0.55, w: 0.5, colour: "#8a6a3a", head: 0.3, snout: 0.45, boxHead: true, neck: [0.15, 0.1], legs: 0.12, ears: 0.08, tail: null, speed: 0.8, flee: 3.5, alert: 12, herd: 4, graze: 0.6, habitat: "riverbank" },
  polarbear: { rig: "quad", len: 2.5, sh: 1.35, w: 0.9, colour: "#f3f1ea", head: 0.4, snout: 0.5, neck: [0.5, 0.15], legs: 0.28, ears: 0.1, tail: null, hump: 0.3, speed: 1.1, flee: 5.5, alert: 40, herd: 1, graze: 0.3, habitat: "any" },
  walrus:    { rig: "blob", len: 3.2, sh: 1.2, w: 1.5, colour: "#8a6a58", head: 0.5, tusks: true, whiskers: true, speed: 0.3, flee: 1.2, alert: 12, herd: 5, habitat: "shore" },
  arcticfox: { rig: "quad", len: 0.8, sh: 0.32, w: 0.25, colour: "#f8f8f8", head: 0.18, snout: 0.5, neck: [0.15, 0.3], legs: 0.06, ears: 0.1, tail: [0.5, 0.08], speed: 1.8, flee: 8, alert: 22, herd: 1, graze: 0.3, habitat: "any" },
  reindeer:  { rig: "quad", len: 1.7, sh: 1.0, w: 0.6, colour: "#9a8a76", belly: "#e0dcd0", head: 0.3, snout: 0.5, neck: [0.6, 0.6], legs: 0.13, ears: 0.12, antlers: 0.8, tail: [0.2, 0.05], speed: 1.3, flee: 6, alert: 20, herd: 5, graze: 0.6, habitat: "any" },
  tortoise:  { rig: "shelled", len: 1.4, sh: 0.6, w: 1.0, colour: "#5a5040", shell: "#4a4030", speed: 0.15, flee: 0.15, alert: 3, herd: 2, habitat: "any" },
  iguana:    { rig: "lizard", len: 1.2, sh: 0.2, w: 0.25, colour: "#2a2a28", speed: 0.6, flee: 2.5, alert: 8, herd: 5, habitat: "shore" },
  booby:     { rig: "bird", len: 0.8, span: 1.6, colour: "#8a7a5a", belly: "#ffffff", beak: "#6a7a8a", feet: "#3aa0ff", perch: "ground", speed: 9, alert: 10, herd: 3, habitat: "shore" },
  sealion:   { rig: "blob", len: 2.2, sh: 0.8, w: 0.9, colour: "#5a4030", head: 0.35, ears: true, speed: 0.6, flee: 2.5, alert: 8, herd: 4, habitat: "shore" },
  snowleopard: { rig: "quad", len: 1.3, sh: 0.6, w: 0.45, colour: "#d8d4cc", pattern: ["rosettes", "#3a3630"], head: 0.3, snout: 0.4, neck: [0.3, 0.2], legs: 0.15, ears: 0.09, tail: [1.1, 0.09], speed: 1.4, flee: 8, alert: 45, herd: 1, graze: 0.1, habitat: "ridge", rare: true },
  yak:       { rig: "quad", len: 2.3, sh: 1.5, w: 1.0, colour: "#2a221c", pattern: ["shaggy", "#000"], head: 0.4, snout: 0.5, neck: [0.4, 0.1], legs: 0.25, ears: 0.1, horns: "curved", hump: 0.35, skirt: true, tail: [0.6, 0.15], speed: 0.9, flee: 4, alert: 16, herd: 4, graze: 0.7, habitat: "any" },
  monal:     { rig: "bird", len: 0.6, span: 1.0, colour: "#1a4a8a", belly: "#0a2a1a", beak: "#4a4a4a", feet: "#6a6a4a", perch: "ground", iridescent: true, speed: 7, alert: 12, herd: 2, habitat: "any" },
  redpanda:  { rig: "quad", len: 0.6, sh: 0.3, w: 0.25, colour: "#b5451b", belly: "#2a1a10", head: 0.17, snout: 0.35, faceWhite: true, neck: [0.1, 0.2], legs: 0.06, ears: 0.08, tail: [0.5, 0.09, "bands"], speed: 0.9, flee: 4, alert: 14, herd: 1, graze: 0.4, habitat: "trees" },
  camel:     { rig: "quad", len: 2.6, sh: 2.0, w: 0.8, colour: "#c8a06a", head: 0.36, snout: 0.6, neck: [1.3, 0.9], legs: 0.16, ears: 0.1, hump: 0.7, tail: [0.6, 0.04, "tuft"], speed: 1.2, flee: 5, alert: 16, herd: 4, graze: 0.4, habitat: "any" },
  fennec:    { rig: "quad", len: 0.4, sh: 0.2, w: 0.15, colour: "#e8d4a8", head: 0.12, snout: 0.5, neck: [0.08, 0.3], legs: 0.04, ears: 0.14, bigEars: true, tail: [0.3, 0.05], speed: 2.2, flee: 9, alert: 20, herd: 1, graze: 0.3, habitat: "any", rare: true },
  vulture:   { rig: "bird", len: 0.7, span: 1.7, colour: "#f0ede0", belly: "#f0ede0", wingtips: "#1a1a1a", beak: "#e0b030", feet: "#b0a080", perch: "sky", speed: 10, alert: 20, herd: 2, habitat: "any" },
  bison:     { rig: "quad", len: 3.0, sh: 1.8, w: 1.1, colour: "#4a3220", pattern: ["shaggy", "#000"], head: 0.55, snout: 0.5, neck: [0.5, -0.1], legs: 0.25, ears: 0.1, horns: "short", hump: 0.6, beard: true, tail: [0.6, 0.05, "tuft"], speed: 1.0, flee: 6, alert: 20, herd: 6, graze: 0.7, habitat: "meadow" },
  elk:       { rig: "quad", len: 2.4, sh: 1.5, w: 0.7, colour: "#8a6a4a", belly: "#c0a888", head: 0.32, snout: 0.5, neck: [0.9, 0.7], legs: 0.14, ears: 0.14, antlers: 1.2, tail: [0.15, 0.05], speed: 1.5, flee: 7, alert: 26, herd: 4, graze: 0.6, habitat: "meadow" },
  grizzly:   { rig: "quad", len: 2.1, sh: 1.1, w: 0.9, colour: "#6a4a2a", head: 0.38, snout: 0.5, neck: [0.4, 0.2], legs: 0.26, ears: 0.1, hump: 0.4, tail: null, speed: 1.2, flee: 6, alert: 38, herd: 1, graze: 0.5, habitat: "meadow", rare: true },
  eagle:     { rig: "bird", len: 0.9, span: 2.1, colour: "#3a2a1a", belly: "#3a2a1a", headWhite: true, beak: "#f0c020", feet: "#f0c020", perch: "tree", speed: 12, alert: 24, herd: 1, habitat: "any" },
  emperor:   { rig: "upright", len: 0.5, sh: 1.15, w: 0.45, colour: "#1a1a22", belly: "#ffffff", cheek: "#f0c030", speed: 0.5, flee: 1.5, alert: 5, herd: 8, habitat: "ice" },
  seal:      { rig: "blob", len: 2.8, sh: 0.8, w: 1.1, colour: "#6a6a68", pattern: ["spots", "#3a3a3a"], head: 0.35, speed: 0.2, flee: 0.8, alert: 5, herd: 3, habitat: "ice" },
  toucan:    { rig: "bird", len: 0.55, span: 1.0, colour: "#111111", belly: "#ffffff", beak: "#ff8c1a", bigBeak: true, feet: "#4a6a9a", perch: "tree", speed: 8, alert: 14, herd: 2, habitat: "trees" },
  macaw:     { rig: "bird", len: 0.8, span: 1.1, colour: "#e0202a", belly: "#e0202a", wingtips: "#2050e0", wingMid: "#f0c020", beak: "#e8e0d0", longTail: true, feet: "#4a4a4a", perch: "tree", speed: 9, alert: 14, herd: 3, habitat: "trees" },
  morpho:    { rig: "flutter", len: 0.15, colour: "#2a7fff", speed: 1.5, alert: 3, herd: 3, habitat: "any", rare: true },
  turtle:    { rig: "fish", shape: "turtle", len: 1.1, colour: "#4a6a3a", shell: "#5a5a3a", speed: 1.0, flee: 2.2, alert: 6, herd: 1, habitat: "water" },
  clownfish: { rig: "fish", shape: "fish", len: 0.12, colour: "#ff7a1a", pattern: ["bands", "#ffffff"], speed: 0.6, flee: 1.5, alert: 2.5, herd: 6, habitat: "coral", tiny: true },
  reefshark: { rig: "fish", shape: "shark", len: 1.5, colour: "#8a9aa0", belly: "#e0e8e8", speed: 2.2, flee: 4, alert: 8, herd: 1, habitat: "water" },
  manta:     { rig: "fish", shape: "manta", len: 4.5, colour: "#2a2a30", belly: "#e8e8ea", speed: 2.4, flee: 3.5, alert: 6, herd: 1, habitat: "water", rare: true },
  humpback:  { rig: "fish", shape: "whale", len: 14, colour: "#2a2f38", belly: "#c8ccd0", speed: 3, flee: 3, alert: 10, herd: 1, habitat: "sea", breach: true, rare: true }
};

/* a little lumpiness for manes and shaggy things */
function bumpyGeo(THREE, geo, amount) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const n = Math.sin(x * 9.1) * Math.cos(y * 7.3 + z * 5.7); p.setXYZ(i, x * (1 + n * amount), y * (1 + n * amount), z * (1 + n * amount)); }
  geo.computeVertexNormals(); return geo;
}

/* ---------------- builders ---------------- */
export function makeCreature(THREE, id) {
  const S = SPECIES[id];
  const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.85, metalness: 0 }, o));
  const g = new THREE.Group();
  const parts = { legs: [], wings: [], head: null, neck: null, tail: null, jaw: null, fins: [] };
  const M = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; m.receiveShadow = false; return m; };
  let skin;
  if (S.pattern) {
    const tex = patternTexture(THREE, S.colour, S.pattern[0], S.pattern[1], id.length * 31);
    // spots and rosettes are small on a big cat: tile the pattern over long bodies
    if (S.pattern[0] !== "stripes" && S.pattern[0] !== "belly") { const r = Math.max(1, Math.round(S.len * 1.6)); tex.repeat.set(r, Math.max(1, Math.round(r * 0.6))); }
    skin = std({ map: tex });
  } else skin = std({ color: S.colour });
  const plain = std({ color: S.colour });
  const dark = std({ color: 0x1a1612 });
  const eyeGeo = new THREE.SphereGeometry(1, 6, 5);
  const addEyes = (parent, r, x, y, z) => { for (const sx of [-1, 1]) { const e = M(eyeGeo, dark, sx * x, y, z); e.scale.setScalar(r); parent.add(e); } };
  let radius = S.len * 0.6, height = S.sh || S.len, eyeY = S.sh || S.len * 0.5;

  if (S.rig === "quad") {
    const bodyY = S.sh * 0.72;
    const body = M(new THREE.SphereGeometry(1, 20, 14), skin, 0, bodyY, 0);
    body.scale.set(S.w, S.sh * 0.34, S.len * 0.5);
    g.add(body);
    if (S.belly) { const b = M(new THREE.SphereGeometry(1, 10, 8), std({ color: S.belly }), 0, bodyY - S.sh * 0.1, 0); b.scale.set(S.w * 0.82, S.sh * 0.3, S.len * 0.42); g.add(b); }
    if (S.hump) { const h = M(new THREE.SphereGeometry(1, 10, 8), skin, 0, bodyY + S.sh * 0.2, S.len * (id === "camel" ? 0.05 : 0.22)); h.scale.set(S.w * 0.7, S.hump, S.len * 0.28); g.add(h); }
    if (S.skirt) { const sk = M(new THREE.CylinderGeometry(S.w * 1.05, S.w * 1.15, S.sh * 0.5, 12), skin, 0, bodyY - S.sh * 0.25, 0); sk.scale.z = S.len * 0.45 / S.w; g.add(sk); }
    // legs
    const legLen = bodyY;
    for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const pivot = new THREE.Group(); pivot.position.set(sx * S.w * 0.55, bodyY - S.sh * 0.05, sz * S.len * 0.32);
      const leg = M(new THREE.CylinderGeometry(S.legs * 0.8, S.legs, legLen, 7), skin, 0, -legLen / 2, 0);
      pivot.add(leg);
      const foot = M(new THREE.SphereGeometry(S.legs * 1.25, 7, 5), skin, 0, -legLen + S.legs * 0.4, S.legs * 0.3); foot.scale.y = 0.6; pivot.add(foot);
      g.add(pivot); parts.legs.push(pivot);
    }
    // neck + head
    const [nl, na] = S.neck;
    const neck = new THREE.Group(); neck.position.set(0, bodyY + S.sh * 0.1, S.len * 0.45);
    neck.rotation.x = -na;
    const neckMesh = M(new THREE.CylinderGeometry(S.head * 0.55, S.head * 0.85, nl, 8), skin, 0, nl / 2, 0);
    neck.add(neckMesh);
    const head = new THREE.Group(); head.position.set(0, nl, 0); head.rotation.x = na - 0.1;
    const skull = M(S.boxHead ? new THREE.BoxGeometry(S.head * 1.6, S.head * 1.4, S.head * 2) : new THREE.SphereGeometry(S.head, 12, 9), S.faceWhite ? std({ color: "#f0e6d8" }) : skin, 0, 0, 0);
    head.add(skull);
    if (S.snout) { const sn = M(new THREE.SphereGeometry(S.head * 0.65, 9, 7), S.faceWhite ? std({ color: "#f0e6d8" }) : plain, 0, -S.head * 0.15, S.head * S.snout * 1.5); sn.scale.set(0.9, 0.75, 1.4); head.add(sn); const nose = M(new THREE.SphereGeometry(S.head * 0.22, 6, 5), dark, 0, -S.head * 0.05, S.head * S.snout * 1.5 + S.head * 0.8); head.add(nose); }
    addEyes(head, S.head * 0.16, S.head * 0.55, S.head * 0.2, S.head * 0.7);
    // ears
    const earGeo = S.bigEars ? new THREE.SphereGeometry(S.ears, 8, 6) : new THREE.ConeGeometry(S.ears * 0.8, S.ears * 2, 6);
    for (const sx of [-1, 1]) {
      const e = M(earGeo, skin, sx * S.head * (S.bigEars ? 0.95 : 0.6), S.head * (S.bigEars ? 0.1 : 0.85), S.bigEars ? -S.head * 0.2 : 0);
      if (S.bigEars) e.scale.set(0.25, 1.3, 1); else e.rotation.z = -sx * 0.35;
      head.add(e);
    }
    if (S.mane) { const mane = M(bumpyGeo(THREE, new THREE.SphereGeometry(S.head * 1.35, 14, 10), 0.12), std({ color: "#7a4a1e" }), 0, -S.head * 0.15, -S.head * 0.55); mane.scale.set(1, 1.05, 0.85); head.add(mane); }
    if (S.maneRidge) { const r = M(new THREE.BoxGeometry(0.06, 0.22, nl), dark, 0, nl / 2 + S.head * 0.6, 0); neck.add(r); }
    if (S.beard) { const b = M(new THREE.SphereGeometry(S.head * 0.6, 8, 6), skin, 0, -S.head * 0.8, S.head * 0.3); b.scale.set(0.8, 1.4, 0.9); head.add(b); }
    if (S.trunk) {
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -S.head * 0.2, S.head * 0.8), new THREE.Vector3(0, -S.head * 1.2, S.head * 1.1), new THREE.Vector3(0, -S.head * 2.4, S.head * 1.0), new THREE.Vector3(0, -S.head * 3.2, S.head * 1.3)]);
      const tr = M(new THREE.TubeGeometry(curve, 12, S.head * 0.28, 8), skin); head.add(tr); parts.trunk = tr;
    }
    if (S.tusks) for (const sx of [-1, 1]) { const t = M(new THREE.ConeGeometry(S.head * 0.12, S.head * 1.4, 7), std({ color: "#f0e8d0" }), sx * S.head * 0.45, -S.head * 0.7, S.head * 1.1); t.rotation.x = -Math.PI / 2 - 0.4; head.add(t); }
    if (S.ossicones) for (const sx of [-1, 1]) { const o = M(new THREE.CylinderGeometry(0.05, 0.04, 0.3, 6), std({ color: "#5a3a1a" }), sx * 0.12, S.head * 1.1, -0.05); head.add(o); const k = M(new THREE.SphereGeometry(0.07, 6, 5), dark, sx * 0.12, S.head * 1.3, -0.05); head.add(k); }
    if (S.horns) for (const sx of [-1, 1]) { const h = M(new THREE.ConeGeometry(S.head * 0.14, S.head * (S.horns === "curved" ? 1.6 : 0.8), 7), std({ color: "#3a3028" }), sx * S.head * 0.8, S.head * 0.6, 0); h.rotation.z = -sx * (S.horns === "curved" ? 1.3 : 0.8); h.rotation.x = -0.4; head.add(h); }
    if (S.antlers) {
      const mat = std({ color: "#6a5238" });
      for (const sx of [-1, 1]) {
        const main = M(new THREE.CylinderGeometry(0.03, 0.05, S.antlers, 6), mat, sx * S.head * 0.45, S.head * 0.7 + S.antlers * 0.45, -S.head * 0.2); main.rotation.z = -sx * 0.5; main.rotation.x = 0.5; head.add(main);
        for (let i = 0; i < 3; i++) { const tine = M(new THREE.CylinderGeometry(0.02, 0.035, S.antlers * 0.45, 5), mat, sx * (S.head * 0.45 + S.antlers * (0.15 + i * 0.12)), S.head * 0.7 + S.antlers * (0.35 + i * 0.22), -S.head * 0.2 - i * 0.05); tine.rotation.z = -sx * 1.4 + sx * i * 0.3; head.add(tine); }
      }
    }
    neck.add(head); g.add(neck); parts.neck = neck; parts.head = head; parts.neckAngle = na;
    // tail
    if (S.tail) {
      const [tl, tr, style] = S.tail;
      const tail = new THREE.Group(); tail.position.set(0, bodyY + S.sh * 0.12, -S.len * 0.48); tail.rotation.x = 0.9 + (style === "tuft" ? 0.4 : 0);
      const tm = M(new THREE.CylinderGeometry(tr * 0.6, tr, tl, 6), style === "bands" ? std({ map: patternTexture(THREE, S.colour, "stripes", "#3a2010", 5) }) : skin, 0, -tl / 2, 0); tail.add(tm);
      if (style === "tuft") tail.add(M(new THREE.SphereGeometry(tr * 2.2, 6, 5), dark, 0, -tl, 0));
      g.add(tail); parts.tail = tail;
    }
    radius = Math.max(S.len * 0.55, S.w); height = S.sh + (S.neck[0] * Math.sin(S.neck[1] + 0.3)) + S.head; eyeY = S.sh * 0.9 + S.neck[0] * Math.sin(S.neck[1]);
    parts.bodyY = bodyY;
  }
  else if (S.rig === "blob") {
    const body = M(new THREE.SphereGeometry(1, 14, 10), skin, 0, S.sh * 0.5, 0); body.scale.set(S.w * 0.5, S.sh * 0.5, S.len * 0.5); g.add(body);
    const head = new THREE.Group(); head.position.set(0, S.sh * 0.75, S.len * 0.45);
    head.add(M(new THREE.SphereGeometry(S.head, 10, 8), skin, 0, 0, 0));
    addEyes(head, S.head * 0.15, S.head * 0.5, S.head * 0.25, S.head * 0.7);
    head.add(M(new THREE.SphereGeometry(S.head * 0.2, 6, 5), dark, 0, -S.head * 0.05, S.head * 0.95));
    if (S.tusks) for (const sx of [-1, 1]) { const t = M(new THREE.ConeGeometry(S.head * 0.12, S.head * 1.6, 6), std({ color: "#f0e8d0" }), sx * S.head * 0.3, -S.head * 0.9, S.head * 0.6); t.rotation.x = Math.PI; head.add(t); }
    if (S.ears) for (const sx of [-1, 1]) head.add(M(new THREE.SphereGeometry(S.head * 0.15, 5, 4), skin, sx * S.head * 0.8, S.head * 0.3, 0));
    g.add(head); parts.head = head;
    for (const sx of [-1, 1]) { const f = M(new THREE.SphereGeometry(1, 7, 5), skin, sx * S.w * 0.55, S.sh * 0.15, S.len * 0.15); f.scale.set(S.len * 0.08, S.sh * 0.06, S.len * 0.2); g.add(f); parts.fins.push(f); }
    const tf = M(new THREE.SphereGeometry(1, 7, 5), skin, 0, S.sh * 0.15, -S.len * 0.5); tf.scale.set(S.w * 0.35, S.sh * 0.08, S.len * 0.15); g.add(tf);
    radius = S.len * 0.55; height = S.sh; eyeY = S.sh * 0.75;
  }
  else if (S.rig === "shelled") {
    const shell = M(new THREE.SphereGeometry(1, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), std({ color: S.shell, flatShading: true }), 0, S.sh * 0.35, 0); shell.scale.set(S.w * 0.55, S.sh * 0.65, S.len * 0.5); g.add(shell);
    const under = M(new THREE.CylinderGeometry(S.w * 0.5, S.w * 0.5, S.sh * 0.3, 14), plain, 0, S.sh * 0.3, 0); under.scale.z = S.len / S.w; g.add(under);
    for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const p = new THREE.Group(); p.position.set(sx * S.w * 0.4, S.sh * 0.3, sz * S.len * 0.3); p.add(M(new THREE.CylinderGeometry(S.len * 0.08, S.len * 0.1, S.sh * 0.3, 7), plain, 0, -S.sh * 0.15, 0)); g.add(p); parts.legs.push(p); }
    const neck = new THREE.Group(); neck.position.set(0, S.sh * 0.35, S.len * 0.42); neck.rotation.x = -0.5;
    neck.add(M(new THREE.CylinderGeometry(S.len * 0.07, S.len * 0.1, S.len * 0.4, 7), plain, 0, S.len * 0.2, 0));
    const head = new THREE.Group(); head.position.set(0, S.len * 0.4, 0); head.add(M(new THREE.SphereGeometry(S.len * 0.11, 8, 6), plain)); addEyes(head, S.len * 0.02, S.len * 0.06, S.len * 0.04, S.len * 0.08);
    neck.add(head); g.add(neck); parts.neck = neck; parts.head = head; parts.neckAngle = 0.5;
    radius = S.len * 0.55; height = S.sh; eyeY = S.sh * 0.6;
  }
  else if (S.rig === "lizard") {
    const body = M(new THREE.SphereGeometry(1, 10, 8), plain, 0, S.sh * 0.6, 0); body.scale.set(S.w * 0.5, S.sh * 0.5, S.len * 0.32); g.add(body);
    const tail = new THREE.Group(); tail.position.set(0, S.sh * 0.5, -S.len * 0.3);
    tail.add(M(new THREE.ConeGeometry(S.w * 0.3, S.len * 0.7, 6), plain, 0, 0, -S.len * 0.35)).rotation.x = Math.PI / 2; g.add(tail); parts.tail = tail;
    const head = new THREE.Group(); head.position.set(0, S.sh * 0.6, S.len * 0.32); head.add(M(new THREE.BoxGeometry(S.w * 0.8, S.sh * 0.7, S.len * 0.2), plain, 0, 0, S.len * 0.08)); addEyes(head, S.sh * 0.15, S.w * 0.4, S.sh * 0.25, S.len * 0.1); g.add(head); parts.head = head;
    for (let i = 0; i < 8; i++) g.add(M(new THREE.ConeGeometry(0.02, 0.09, 4), std({ color: "#5a5a4a" }), 0, S.sh * 1.05, S.len * 0.3 - i * S.len * 0.07));
    for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const p = new THREE.Group(); p.position.set(sx * S.w * 0.5, S.sh * 0.5, sz * S.len * 0.2); const l = M(new THREE.CylinderGeometry(0.03, 0.035, S.sh * 0.6, 5), plain, sx * S.sh * 0.3, -S.sh * 0.2, 0); l.rotation.z = -sx * 1.0; p.add(l); g.add(p); parts.legs.push(p); }
    radius = S.len * 0.5; height = S.sh * 1.2; eyeY = S.sh * 0.7;
  }
  else if (S.rig === "upright") {
    const back = std({ color: S.colour }), front = std({ color: S.belly });
    const body = M(new THREE.SphereGeometry(1, 14, 12), back, 0, S.sh * 0.5, 0); body.scale.set(S.w * 0.5, S.sh * 0.5, S.w * 0.5); g.add(body);
    const belly = M(new THREE.SphereGeometry(1, 12, 10), front, 0, S.sh * 0.46, S.w * 0.12); belly.scale.set(S.w * 0.42, S.sh * 0.42, S.w * 0.42); g.add(belly);
    const head = new THREE.Group(); head.position.set(0, S.sh * 0.95, 0.02); head.add(M(new THREE.SphereGeometry(S.w * 0.32, 10, 8), back));
    for (const sx of [-1, 1]) head.add(M(new THREE.SphereGeometry(S.w * 0.13, 7, 5), std({ color: S.cheek }), sx * S.w * 0.22, -S.w * 0.05, S.w * 0.18));
    const beak = M(new THREE.ConeGeometry(S.w * 0.08, S.w * 0.4, 6), std({ color: "#2a2a2a" }), 0, -S.w * 0.05, S.w * 0.45); beak.rotation.x = Math.PI / 2; head.add(beak);
    addEyes(head, S.w * 0.05, S.w * 0.15, S.w * 0.1, S.w * 0.28);
    g.add(head); parts.head = head;
    for (const sx of [-1, 1]) { const w = M(new THREE.SphereGeometry(1, 7, 5), back, sx * S.w * 0.52, S.sh * 0.55, 0); w.scale.set(S.w * 0.08, S.sh * 0.32, S.w * 0.18); g.add(w); parts.wings.push(w); }
    for (const sx of [-1, 1]) g.add(M(new THREE.SphereGeometry(S.w * 0.14, 6, 4), std({ color: "#2a2a2a" }), sx * S.w * 0.18, S.w * 0.05, S.w * 0.15));
    radius = S.w * 0.6; height = S.sh; eyeY = S.sh * 0.95;
  }
  else if (S.rig === "bird") {
    const back = std({ color: S.colour }), front = std({ color: S.belly || S.colour });
    const body = M(new THREE.SphereGeometry(1, 12, 9), back, 0, 0, 0); body.scale.set(S.len * 0.22, S.len * 0.22, S.len * 0.45); g.add(body);
    const bl = M(new THREE.SphereGeometry(1, 10, 8), front, 0, -S.len * 0.05, S.len * 0.05); bl.scale.set(S.len * 0.19, S.len * 0.18, S.len * 0.38); g.add(bl);
    const head = new THREE.Group(); head.position.set(0, S.len * 0.2, S.len * 0.42);
    head.add(M(new THREE.SphereGeometry(S.len * 0.16, 10, 8), S.headWhite ? std({ color: "#ffffff" }) : back));
    const beakLen = S.bigBeak ? S.len * 0.7 : S.len * 0.18;
    const beak = M(new THREE.ConeGeometry(S.bigBeak ? S.len * 0.09 : S.len * 0.05, beakLen, 7), std({ color: S.beak }), 0, S.bigBeak ? -S.len * 0.05 : 0, S.len * 0.16 + beakLen / 2); beak.rotation.x = Math.PI / 2; head.add(beak);
    addEyes(head, S.len * 0.03, S.len * 0.1, S.len * 0.05, S.len * 0.1);
    g.add(head); parts.head = head;
    // wings: flat boxes hinged at the body
    const wingMat = S.iridescent ? std({ color: "#20a070", metalness: 0.6, roughness: 0.3 }) : back;
    for (const sx of [-1, 1]) {
      const pivot = new THREE.Group(); pivot.position.set(sx * S.len * 0.15, S.len * 0.08, 0);
      const wing = M(new THREE.BoxGeometry(S.span * 0.5, S.len * 0.03, S.len * 0.32), wingMat, sx * S.span * 0.25, 0, -S.len * 0.05); pivot.add(wing);
      if (S.wingtips) { const tip = M(new THREE.BoxGeometry(S.span * 0.18, S.len * 0.032, S.len * 0.3), std({ color: S.wingtips }), sx * S.span * 0.42, 0, -S.len * 0.06); pivot.add(tip); }
      if (S.wingMid) { const mid = M(new THREE.BoxGeometry(S.span * 0.14, S.len * 0.032, S.len * 0.3), std({ color: S.wingMid }), sx * S.span * 0.26, 0, -S.len * 0.06); pivot.add(mid); }
      g.add(pivot); parts.wings.push(pivot);
    }
    const tail = M(new THREE.BoxGeometry(S.len * 0.18, S.len * 0.02, S.longTail ? S.len * 0.6 : S.len * 0.3), S.wingtips ? std({ color: S.wingtips }) : back, 0, 0, -S.len * (S.longTail ? 0.65 : 0.5)); g.add(tail);
    for (const sx of [-1, 1]) { const f = M(new THREE.BoxGeometry(S.len * 0.06, S.len * 0.12, S.len * 0.12), std({ color: S.feet }), sx * S.len * 0.08, -S.len * 0.24, S.len * 0.05); g.add(f); parts.fins.push(f); }
    radius = S.span * 0.5; height = S.len * 0.5; eyeY = S.len * 0.2;
  }
  else if (S.rig === "fish") {
    const back = std({ color: S.colour }), front = std({ color: S.belly || S.colour });
    if (S.shape === "turtle") {
      const shell = M(new THREE.SphereGeometry(1, 12, 9), std({ color: S.shell, flatShading: true }), 0, 0, 0); shell.scale.set(S.len * 0.42, S.len * 0.18, S.len * 0.5); g.add(shell);
      const head = new THREE.Group(); head.position.set(0, 0, S.len * 0.55); head.add(M(new THREE.SphereGeometry(S.len * 0.12, 8, 6), plain)); addEyes(head, S.len * 0.025, S.len * 0.07, S.len * 0.04, S.len * 0.08); g.add(head); parts.head = head;
      for (const [sx, sz] of [[-1, 0.25], [1, 0.25], [-1, -0.3], [1, -0.3]]) { const p = new THREE.Group(); p.position.set(sx * S.len * 0.38, -S.len * 0.02, sz * S.len); const fl = M(new THREE.SphereGeometry(1, 7, 5), plain, sx * S.len * 0.2, 0, 0); fl.scale.set(S.len * (sz > 0 ? 0.28 : 0.16), S.len * 0.03, S.len * 0.1); fl.rotation.y = sx * 0.6; p.add(fl); g.add(p); parts.fins.push(p); }
      radius = S.len * 0.6; height = S.len * 0.3;
    } else if (S.shape === "manta") {
      const wing = new THREE.Shape(); wing.moveTo(0, 0.5); wing.lineTo(1, 0.15); wing.lineTo(0.6, -0.35); wing.lineTo(0, -0.5); wing.lineTo(-0.6, -0.35); wing.lineTo(-1, 0.15); wing.closePath();
      const geo = new THREE.ShapeGeometry(wing); geo.rotateX(-Math.PI / 2); geo.scale(S.len * 0.5, 1, S.len * 0.5);
      const top = M(geo, std({ color: S.colour, side: THREE.DoubleSide }), 0, 0, 0); g.add(top);
      const body = M(new THREE.SphereGeometry(1, 10, 8), back, 0, 0, 0); body.scale.set(S.len * 0.1, S.len * 0.05, S.len * 0.3); g.add(body);
      const tail = M(new THREE.CylinderGeometry(0.02, 0.05, S.len * 0.5, 5), back, 0, 0, -S.len * 0.5); tail.rotation.x = Math.PI / 2; g.add(tail);
      parts.mantaWing = top; radius = S.len * 0.5; height = S.len * 0.1;
    } else {
      const bodyLen = S.len;
      const body = M(new THREE.SphereGeometry(1, 12, 9), back, 0, 0, 0); body.scale.set(bodyLen * 0.12, bodyLen * 0.16, bodyLen * 0.5);
      if (S.shape === "whale") body.scale.set(bodyLen * 0.12, bodyLen * 0.13, bodyLen * 0.5);
      if (S.shape === "fish") body.scale.set(bodyLen * 0.12, bodyLen * 0.25, bodyLen * 0.5);
      if (S.pattern) body.material = skin;
      g.add(body);
      const belly = M(new THREE.SphereGeometry(1, 10, 8), front, 0, -bodyLen * 0.04, 0); belly.scale.set(bodyLen * 0.1, bodyLen * 0.12, bodyLen * 0.42); if (S.shape !== "fish") g.add(belly);
      const tail = new THREE.Group(); tail.position.set(0, 0, -bodyLen * 0.45);
      const fluke = M(new THREE.BoxGeometry(S.shape === "shark" ? bodyLen * 0.05 : bodyLen * 0.4, S.shape === "shark" ? bodyLen * 0.35 : bodyLen * 0.04, bodyLen * 0.2), back, 0, 0, -bodyLen * 0.12); tail.add(fluke); g.add(tail); parts.tail = tail;
      if (S.shape === "shark") { const dorsal = M(new THREE.ConeGeometry(bodyLen * 0.1, bodyLen * 0.22, 4), back, 0, bodyLen * 0.2, 0); dorsal.rotation.y = Math.PI / 4; g.add(dorsal); const tipMat = std({ color: "#1a1a1a" }); g.add(M(new THREE.ConeGeometry(bodyLen * 0.035, bodyLen * 0.06, 4), tipMat, 0, bodyLen * 0.32, 0)); }
      for (const sx of [-1, 1]) { const f = M(new THREE.BoxGeometry(bodyLen * (S.shape === "whale" ? 0.32 : 0.16), bodyLen * 0.02, bodyLen * 0.1), back, sx * bodyLen * (S.shape === "whale" ? 0.25 : 0.16), -bodyLen * 0.05, bodyLen * 0.12); f.rotation.z = sx * 0.4; g.add(f); parts.fins.push(f); }
      addEyes(g, bodyLen * 0.02, bodyLen * 0.1, bodyLen * 0.04, bodyLen * 0.38);
      radius = bodyLen * 0.5; height = bodyLen * 0.3;
      if (S.shape === "whale") { const bumps = std({ color: S.colour }); for (let i = 0; i < 6; i++) g.add(M(new THREE.SphereGeometry(bodyLen * 0.02, 5, 4), bumps, (i % 2 ? 1 : -1) * bodyLen * 0.04, bodyLen * 0.1, bodyLen * 0.3 + i * 0.03)); }
    }
    eyeY = 0;
  }
  else if (S.rig === "flutter") {
    const wingMat = std({ color: S.colour, side: THREE.DoubleSide, metalness: 0.3, roughness: 0.4 });
    for (const sx of [-1, 1]) {
      const pivot = new THREE.Group();
      const w = M(new THREE.PlaneGeometry(S.len, S.len * 0.9), wingMat, sx * S.len * 0.5, 0, 0); w.rotation.x = -Math.PI / 2; w.castShadow = false; pivot.add(w);
      g.add(pivot); parts.wings.push(pivot);
    }
    g.add(M(new THREE.CylinderGeometry(0.01, 0.01, S.len * 0.7, 5), dark).rotateX(Math.PI / 2));
    radius = S.len; height = S.len * 0.3; eyeY = 0;
  }

  return { group: g, parts, spec: S, radius, height, eyeY };
}

/* ---------------- animation ---------------- */
function animate(cr, t, moving, dt) {
  const P = cr.parts, S = cr.spec, gait = moving ? 1 : 0;
  const f = S.rig === "quad" ? (2.6 + 6 / (S.len + 1)) * (cr.fleeing ? 1.8 : 1) : 4;
  if (S.rig === "quad" || S.rig === "shelled" || S.rig === "lizard") {
    P.legs.forEach((leg, i) => { leg.rotation.x = Math.sin(t * f + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI * 0.5 : 0)) * 0.5 * gait; });
    if (P.neck) {
      const graze = cr.grazing ? (S.browse ? -0.6 : 1.0) : 0;
      P.neck.rotation.x += ((-P.neckAngle + graze) - P.neck.rotation.x) * Math.min(1, dt * 2);
      if (P.head) P.head.rotation.y = Math.sin(t * 0.7 + cr.seed) * 0.25 * (1 - gait);
    }
    if (P.tail) P.tail.rotation.z = Math.sin(t * 2 + cr.seed) * 0.25;
    if (P.trunk) P.trunk.rotation.x = Math.sin(t * 1.3 + cr.seed) * 0.15;
    cr.group.position.y += Math.abs(Math.sin(t * f)) * 0.03 * gait * S.len;
  } else if (S.rig === "blob") {
    cr.group.position.y += Math.abs(Math.sin(t * 3)) * 0.08 * gait;
    P.fins.forEach((f, i) => { f.rotation.y = Math.sin(t * 3 + i) * 0.4 * gait; });
    if (P.head) P.head.rotation.x = Math.sin(t * 0.8 + cr.seed) * 0.2 - 0.2;
  } else if (S.rig === "upright") {
    cr.group.rotation.z = Math.sin(t * 5) * 0.12 * gait;
    P.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (0.15 + Math.sin(t * 5) * 0.25 * gait); });
    if (P.head) P.head.rotation.y = Math.sin(t * 0.9 + cr.seed) * 0.4 * (1 - gait);
  } else if (S.rig === "bird") {
    const flying = cr.flying;
    const flap = flying ? Math.sin(t * (cr.gliding ? 1.2 : 9)) * (cr.gliding ? 0.12 : 0.8) : 0.05;
    P.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * flap; });
    P.fins.forEach((f) => { f.visible = !flying; });
    if (P.head) P.head.rotation.y = flying ? 0 : Math.sin(t * 1.5 + cr.seed) * 0.5;
  } else if (S.rig === "fish") {
    if (P.tail) P.tail.rotation.y = Math.sin(t * (S.tiny ? 12 : 3) + cr.seed) * 0.4;
    P.fins.forEach((f, i) => { f.rotation.x = Math.sin(t * 2 + i) * 0.3; });
    if (P.mantaWing) { P.mantaWing.rotation.z = 0; P.mantaWing.scale.y = 1; cr.group.rotation.z = Math.sin(t * 1.2) * 0.25; }
    cr.group.rotation.x = -(cr.vy || 0) * 0.4;
  } else if (S.rig === "flutter") {
    P.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (0.2 + Math.sin(t * 14) * 0.9); });
  }
}

/* ============================================================
   the brains: a manager that owns every creature in a world
   ============================================================ */
export function createCreatureManager(THREE, world, site, tier, subjectIds) {
  const N = world.noise;
  const list = [];
  const shy = tier.shy;
  const tmp = new THREE.Vector3();

  function habitatOK(kind, x, z) {
    if (Math.abs(x) > 230 || Math.abs(z) > 230) return false;
    const h = world.heightAt(x, z), s = world.slopeAt(x, z);
    const wl = world.waterLevel;
    for (const c of world.colliders) if (Math.hypot(c.x - x, c.z - z) < c.r + 1.5) return false;
    if (kind === "water") return world.underwater ? h < wl - 3 : h < wl - 0.5;
    if (kind === "coral") return world.underwater && h > 8 && h < wl - 2;
    if (kind === "sea") return h < wl - 6;
    if (world.underwater) return h < wl - 2;
    if (h < wl + 0.3) return false;
    if (kind === "shore") return h < wl + 4 && s < 0.5;
    if (kind === "riverbank") return h < wl + 3.5 && s < 0.55;
    if (kind === "ridge") return h > 30 && s > 0.15;
    if (kind === "meadow") return h < 14 && s < 0.35;
    if (kind === "trees") return s < 0.5 && (site.biome !== "rainforest" || h > 2.5);
    if (kind === "ice") return h < 8 && s < 0.2;
    if (kind === "dry") return s < 0.45;
    return s < 0.5;
  }
  function pickSpot(kind, near, r) {
    for (let i = 0; i < 60; i++) {
      const x = near && r ? near.x + (N.rnd() - 0.5) * 2 * r : (N.rnd() - 0.5) * 440;
      const z = near && r ? near.z + (N.rnd() - 0.5) * 2 * r : (N.rnd() - 0.5) * 440;
      if (habitatOK(kind, x, z)) return new THREE.Vector3(x, 0, z);
    }
    return null;
  }

  /* spawn one group per subject */
  for (const id of subjectIds) {
    const S = SPECIES[id]; if (!S) continue;
    const info = SUBJECTS[id];
    const groups = S.tiny ? 5 : (S.herd >= 4 ? 2 : (S.rare ? 1 : 2));
    for (let gi = 0; gi < groups; gi++) {
      const home = pickSpot(S.habitat); if (!home) continue;
      const n = S.herd;
      let leader = null;
      for (let i = 0; i < n; i++) {
        const cr = makeCreature(THREE, id);
        cr.id = id; cr.info = info; cr.seed = N.rnd() * 100;
        cr.home = home.clone(); cr.leader = leader;
        cr.target = null; cr.state = "wander"; cr.timer = N.rnd() * 3; cr.speed = 0; cr.heading = N.rnd() * Math.PI * 2;
        cr.pos = home.clone().add(new THREE.Vector3((N.rnd() - 0.5) * 12, 0, (N.rnd() - 0.5) * 12));
        cr.flying = S.rig === "bird" && S.perch === "sky"; cr.alt = 0; cr.present = true;
        cr.scale = 0.85 + N.rnd() * 0.3; cr.group.scale.setScalar(cr.scale);
        cr.when = info.when; cr.rare = info.rare;
        if (S.rig === "fish" || S.rig === "bird") cr.alt = S.rig === "fish" ? (world.underwater ? 6 + N.rnd() * 10 : -2) : 20 + N.rnd() * 20;
        if (S.rig === "fish" && S.shape === "whale") cr.alt = -3;
        world.scene.add(cr.group);
        list.push(cr);
        if (!leader) leader = cr;
      }
    }
  }

  const flee = new THREE.Vector3();
  function update(dt, t, player, env, sneaking, running) {
    for (const cr of list) {
      const S = cr.spec;
      // time-of-day gating for rare animals
      const want = cr.when === "any" || (cr.when === "day" && !env.isNight) || (cr.when === "dawn" && (env.label === "dawn" || env.label === "dusk")) || (cr.when === "dusk" && (env.label === "dusk" || env.label === "night")) || (cr.when === "night" && env.isNight);
      if (want !== cr.present) { cr.present = want; cr.group.visible = want; if (want) { const sp = pickSpot(S.habitat); if (sp) { cr.home.copy(sp); cr.pos.copy(sp); } } }
      if (!cr.present) continue;

      const dx = cr.pos.x - player.x, dz = cr.pos.z - player.z;
      const dist = Math.hypot(dx, dz);
      const alertR = S.alert * shy * (sneaking ? 0.55 : 1) * (running ? 1.6 : 1);
      cr.timer -= dt;
      cr.fleeing = cr.state === "flee";
      cr.grazing = cr.state === "graze";

      if (dist < alertR && S.flee > 0 && cr.state !== "flee" && S.rig !== "flutter") {
        cr.state = "flee"; cr.timer = 3 + N.rnd() * 4;
        flee.set(dx, 0, dz).normalize();
        cr.target = cr.pos.clone().add(flee.multiplyScalar(40 + N.rnd() * 30));
        if (S.rig === "bird" && !cr.flying) { cr.flying = true; cr.alt = 6; }
        cr.spotted = true;
      }
      if (cr.state === "flee" && cr.timer <= 0) { cr.state = "wander"; cr.timer = 1; }

      /* ---- birds ---- */
      if (S.rig === "bird") {
        if (cr.flying) {
          if (!cr.target || cr.pos.distanceTo(cr.target) < 6) {
            cr.target = pickSpot("any", cr.home, 70) || cr.home.clone();
            cr.alt = S.perch === "sky" ? 25 + N.rnd() * 25 : 12 + N.rnd() * 12;
            cr.gliding = N.rnd() < 0.5;
          }
          cr.circle = (cr.circle || 0) + dt * 0.5;
          // land sometimes
          if (S.perch !== "sky" && cr.state !== "flee" && cr.timer <= 0 && N.rnd() < 0.3) { cr.flying = false; cr.timer = 8 + N.rnd() * 14; cr.target = null; cr.perchAt = pickSpot(S.perch === "tree" ? "trees" : "shore", cr.home, 50) || cr.home.clone(); }
          if (S.perch === "sky" && cr.timer <= 0) cr.timer = 4 + N.rnd() * 6;
          const sp = S.speed * (cr.state === "flee" ? 1.5 : 1);
          steer(cr, cr.target, sp, dt, 2.5);
          const groundY = world.heightAt(cr.pos.x, cr.pos.z);
          const wantY = Math.max(groundY + cr.alt, world.waterLevel + cr.alt);
          cr.y = cr.y == null ? wantY : cr.y + (wantY - cr.y) * Math.min(1, dt * 1.2);
        } else {
          if (cr.perchAt) {
            const perchY = world.heightAt(cr.perchAt.x, cr.perchAt.z) + (S.perch === "tree" ? 7 : 0.05);
            cr.pos.x += (cr.perchAt.x - cr.pos.x) * Math.min(1, dt * 3); cr.pos.z += (cr.perchAt.z - cr.pos.z) * Math.min(1, dt * 3);
            cr.y = cr.y == null ? perchY : cr.y + (perchY - cr.y) * Math.min(1, dt * 3);
            cr.speed = 0;
          }
          if (cr.timer <= 0) { cr.flying = true; cr.target = null; cr.timer = 5; }
        }
        cr.group.position.set(cr.pos.x, cr.y || 0, cr.pos.z);
        cr.group.rotation.y = cr.heading;
        cr.group.rotation.z = cr.flying ? -cr.turn * 0.6 : 0;
        animate(cr, t, cr.flying, dt);
        continue;
      }

      /* ---- fish & whales ---- */
      if (S.rig === "fish") {
        if (!cr.target || cr.pos.distanceTo(cr.target) < 4 || cr.timer <= 0) {
          const kind = S.habitat; const sp = pickSpot(kind, cr.leader && cr.leader !== cr ? cr.leader.pos : cr.home, cr.leader && cr.leader !== cr ? 8 : (S.tiny ? 6 : 60));
          cr.target = sp || cr.home.clone(); cr.timer = 6 + N.rnd() * 8;
          cr.alt = world.underwater ? (S.tiny ? 1 + N.rnd() * 2 : 3 + N.rnd() * 12) : -(2 + N.rnd() * 3);
        }
        steer(cr, cr.target, S.speed * (cr.state === "flee" ? 2 : 1), dt, S.tiny ? 4 : 1.2);
        let wantY;
        if (world.underwater) { const floor = world.heightAt(cr.pos.x, cr.pos.z); wantY = Math.min(world.waterLevel - 1.5, Math.max(floor + 1.2, floor + cr.alt)); }
        else wantY = world.waterLevel + cr.alt;
        // a breaching whale: every so often it rockets up out of the sea
        if (S.breach) {
          cr.breachT = (cr.breachT || 0) + dt;
          const period = 45, len = 3.2;
          const ph = cr.breachT % period;
          if (ph < len) { const k = ph / len; wantY = world.waterLevel - 4 + Math.sin(k * Math.PI) * 14; cr.breaching = true; cr.group.rotation.x = -0.9 + k * 1.8; }
          else { cr.breaching = false; cr.group.rotation.x = 0; }
        }
        cr.vy = cr.y == null ? 0 : (wantY - cr.y);
        cr.y = cr.y == null ? wantY : cr.y + (wantY - cr.y) * Math.min(1, dt * (S.breach ? 3 : 1.5));
        cr.group.position.set(cr.pos.x, cr.y, cr.pos.z);
        cr.group.rotation.y = cr.heading;
        animate(cr, t, true, dt);
        if (S.breach) cr.group.rotation.x = cr.breaching ? cr.group.rotation.x : 0;
        continue;
      }

      /* ---- butterflies ---- */
      if (S.rig === "flutter") {
        if (!cr.target || cr.timer <= 0) { cr.target = pickSpot("any", cr.home, 12) || cr.home.clone(); cr.timer = 2 + N.rnd() * 3; }
        steer(cr, cr.target, S.speed, dt, 5);
        const gy = world.heightAt(cr.pos.x, cr.pos.z) + 1 + Math.sin(t * 3 + cr.seed) * 0.5 + N.rnd() * 0.1;
        cr.y = cr.y == null ? gy : cr.y + (gy - cr.y) * Math.min(1, dt * 3);
        cr.group.position.set(cr.pos.x, cr.y, cr.pos.z); cr.group.rotation.y = cr.heading;
        animate(cr, t, true, dt);
        continue;
      }

      /* ---- walkers ---- */
      if (cr.state === "wander" || cr.state === "graze") {
        if (cr.timer <= 0) {
          const r = N.rnd();
          if (r < S.graze) { cr.state = "graze"; cr.timer = 3 + N.rnd() * 6; cr.target = null; }
          else {
            cr.state = "wander"; cr.timer = 4 + N.rnd() * 8;
            const near = cr.leader && cr.leader !== cr ? cr.leader.pos : cr.home;
            // now and then the herd leader walks the herd down to the water to drink
            const thirsty = !world.underwater && world.waterLevel > -3 && (!cr.leader || cr.leader === cr) && S.rig === "quad" && r > 1 - 0.18;
            cr.target = (thirsty && pickSpot("riverbank", null, 0)) || pickSpot(S.habitat, near, cr.leader && cr.leader !== cr ? 10 : 45);
            if (thirsty && cr.target) cr.timer = 14 + N.rnd() * 10;
          }
        }
      }
      let moving = false;
      if (cr.target && cr.state !== "graze") {
        const sp = S.speed * (cr.state === "flee" ? S.flee / S.speed : 1);
        moving = steer(cr, cr.target, sp, dt, cr.state === "flee" ? 3 : 1.5, true);
        if (cr.target && cr.pos.distanceTo(cr.target) < 1.5) { cr.target = null; if (cr.state !== "flee") cr.timer = Math.min(cr.timer, 0.5); }
      }
      const gy = world.heightAt(cr.pos.x, cr.pos.z);
      cr.group.position.set(cr.pos.x, Math.max(gy, world.waterLevel - (S.rig === "blob" ? 0.3 : 0)), cr.pos.z);
      cr.group.rotation.y = cr.heading;
      // tilt with the ground a little
      const ahead = world.heightAt(cr.pos.x + Math.sin(cr.heading) * 2, cr.pos.z + Math.cos(cr.heading) * 2);
      cr.group.rotation.x = -Math.atan2(ahead - gy, 2) * 0.7;
      animate(cr, t, moving, dt);
    }
  }

  /* turn towards a target and move; returns true if it moved */
  function steer(cr, target, speed, dt, turnRate, ground) {
    const dx = target.x - cr.pos.x, dz = target.z - cr.pos.z;
    const want = Math.atan2(dx, dz);
    let d = want - cr.heading; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    const turn = Math.max(-turnRate * dt, Math.min(turnRate * dt, d));
    cr.heading += turn; cr.turn = turn / dt / turnRate;
    const step = speed * dt * 2.2;
    const nx = cr.pos.x + Math.sin(cr.heading) * step, nz = cr.pos.z + Math.cos(cr.heading) * step;
    if (ground) {
      // don't walk into water, off the map, or through rocks
      if (!habitatOK(cr.spec.habitat === "sea" ? "sea" : cr.spec.habitat, nx, nz) && !habitatOK("any", nx, nz)) { cr.target = null; cr.timer = 0.2; return false; }
    }
    cr.pos.x = nx; cr.pos.z = nz;
    return true;
  }

  return { list, update, species: SPECIES };
}
