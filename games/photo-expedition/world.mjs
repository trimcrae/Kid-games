/* ===========================================================
   Photo Expedition — the 3D worlds (three.js).
   -----------------------------------------------------------
   One square of wilderness per expedition, 480 m on a side and
   split into an 8 × 8 grid (A–H across, 1–8 down) that the maps
   use. Everything is procedural: the ground is a height-field made
   of noise and shaped per biome (a water hole, a river, a volcano,
   a valley); the trees, grass and rocks are instanced meshes built
   from primitives; the landmarks (baobab, pyramids, sphinx, geyser,
   icebergs, wreck…) are put together from boxes, cones and spheres;
   the sky is a shader on a big sphere that knows where the sun is.

     const world = buildWorld(THREE, site, quality);
     world.scene, world.heightAt(x, z), world.update(dt, clock, playerPos)
     world.landmarks  → [{ subject, pos, radius }] for the photo scorer
   =========================================================== */

import { taperedCurve, blade, mergeForms } from './forms.mjs';
import { barkMaterial, foliageMaterial, leafCloud, broadleafTree, pineTree } from './vegetation.mjs';

export const SIZE = 480;          // metres across
export const GRID = 8;            // squares per side
export const CELL = SIZE / GRID;  // 60 m

/* ---------------- noise ---------------- */
function makeNoise(seed) {
  const perm = new Uint8Array(512);
  let s = seed >>> 0 || 1;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const p = [];
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const grad = (h, x, y) => { switch (h & 3) { case 0: return x + y; case 1: return -x + y; case 2: return x - y; default: return -x - y; } };
  function n2(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const A = perm[X] + Y, B = perm[X + 1] + Y;
    const l1 = grad(perm[A], x, y) + u * (grad(perm[B], x - 1, y) - grad(perm[A], x, y));
    const l2 = grad(perm[A + 1], x, y - 1) + u * (grad(perm[B + 1], x - 1, y - 1) - grad(perm[A + 1], x, y - 1));
    return l1 + v * (l2 - l1);
  }
  function fbm(x, y, oct, lac, gain) {
    let a = 1, f = 1, sum = 0, norm = 0;
    for (let i = 0; i < (oct || 4); i++) { sum += a * n2(x * f, y * f); norm += a; a *= (gain || 0.5); f *= (lac || 2); }
    return sum / norm;
  }
  function ridge(x, y, oct) {
    let a = 1, f = 1, sum = 0, norm = 0;
    for (let i = 0; i < (oct || 4); i++) { sum += a * (1 - Math.abs(n2(x * f, y * f))); norm += a; a *= 0.5; f *= 2; }
    return sum / norm;
  }
  return { n2, fbm, ridge, rnd };
}

/* ---------------- biome recipes ---------------- */
/* Every biome answers: how high is the ground at (x, z)? what colour is it?
   where is the water? what grows? Heights in metres, x/z in −240…240.  */
const BIOMES = {
  savanna: {
    seed: 11, water: 0.6, amp: 7, fog: 0.0016,
    colours: { grass: [0.78, 0.66, 0.34], dry: [0.62, 0.5, 0.25], dirt: [0.5, 0.36, 0.2], rock: [0.45, 0.42, 0.38] },
    height(N, x, z) {
      let h = N.fbm(x / 160, z / 160, 4) * 7 + N.fbm(x / 40, z / 40, 3) * 1.2 + 4;
      // the water hole: a shallow bowl west of centre
      const d = Math.hypot(x + 60, z - 30);
      h -= Math.max(0, 1 - d / 55) * 7.5;
      // a low kopje (rocky hill) in the north-east
      const k = Math.hypot(x - 130, z + 120);
      h += Math.max(0, 1 - k / 60) ** 1.5 * 16;
      return h;
    },
    colour(b, h, slope, x, z, n) {
      if (slope > 0.55 || h > 16) return b.rock;
      const wet = Math.max(0, 1 - Math.hypot(x + 60, z - 30) / 70);
      return mix(mix(b.dry, b.grass, n * 0.7 + wet * 0.6), b.dirt, Math.max(0, 0.6 - h) * 0.4);
    },
    trees: [{ type: "acacia", count: 90 }, { type: "bush", count: 160 }, { type: "rock", count: 60 }],
    grass: 7000, grassColour: [0.8, 0.7, 0.35], sky: "warm",
    landmarks: [{ subject: "baobab", x: 95, z: -20 }],
    spawn: { player: [-20, 120] }
  },
  rainforest: {
    seed: 23, water: 1.2, amp: 9, fog: 0.0055,
    colours: { grass: [0.18, 0.36, 0.12], dry: [0.3, 0.42, 0.14], dirt: [0.34, 0.24, 0.13], rock: [0.36, 0.36, 0.3] },
    height(N, x, z) {
      let h = N.fbm(x / 120, z / 120, 4) * 9 + N.fbm(x / 30, z / 30, 3) * 1.5 + 5;
      // the river: winds from north to south with a big bend in the east
      const rx = 40 + Math.sin(z / 110) * 80 + Math.sin(z / 37) * 12;
      const d = Math.abs(x - rx);
      h -= Math.max(0, 1 - d / 34) ** 0.8 * 8.5;
      return h;
    },
    colour(b, h, slope, x, z, n) {
      if (slope > 0.6) return b.rock;
      if (h < 1.6) return b.dirt;
      return mix(b.grass, b.dry, n);
    },
    trees: [{ type: "kapok", count: 170 }, { type: "palm", count: 120 }, { type: "fern", count: 500 }, { type: "rock", count: 20 }],
    grass: 4000, grassColour: [0.25, 0.45, 0.15], sky: "humid",
    landmarks: [{ subject: "temple", x: 142, z: 172 }],
    spawn: { player: [-120, 150] }
  },
  reef: {
    seed: 37, water: 30, amp: 6, fog: 0.011, underwater: true,
    colours: { grass: [0.75, 0.72, 0.55], dry: [0.7, 0.66, 0.5], dirt: [0.55, 0.5, 0.4], rock: [0.4, 0.38, 0.32] },
    height(N, x, z) {
      let h = N.fbm(x / 90, z / 90, 4) * 6 + N.fbm(x / 25, z / 25, 3) * 1.5 + 12;
      // a deep channel down the west side, where the wreck lies
      const d = Math.abs(x + 150 + Math.sin(z / 80) * 25);
      h -= Math.max(0, 1 - d / 60) * 9;
      // a big coral head in the centre
      h += Math.max(0, 1 - Math.hypot(x, z) / 40) ** 1.4 * 6;
      return h;
    },
    colour(b, h, slope, x, z, n) { return mix(b.grass, b.dirt, Math.min(1, Math.max(0, (14 - h) / 12))); },
    trees: [{ type: "coral", count: 420 }, { type: "brain", count: 160 }, { type: "seaweed", count: 500 }, { type: "anemone", count: 120 }, { type: "rock", count: 40 }],
    grass: 0, sky: "sea",
    landmarks: [{ subject: "coral", x: 0, z: 0 }, { subject: "wreck", x: -150, z: 60 }],
    spawn: { player: [60, 120] }
  },
  arctic: {
    seed: 41, water: 0.4, amp: 10, fog: 0.0025,
    colours: { grass: [0.92, 0.94, 0.97], dry: [0.86, 0.9, 0.95], dirt: [0.55, 0.5, 0.45], rock: [0.42, 0.4, 0.4] },
    height(N, x, z) {
      // flat sea ice in the south, mountains in the north
      let h = N.fbm(x / 80, z / 80, 3) * 1.2 + 2.5;
      const north = Math.max(0, (-z - 40) / 200);
      h += north * north * 70 * (0.6 + N.ridge(x / 90 + 3, z / 90, 4));
      if (z > 120) h -= (z - 120) / 40 * 4;      // shelf edge into open water
      return h;
    },
    colour(b, h, slope, x, z, n) {
      if (slope > 0.75) return b.rock;
      if (slope > 0.5) return mix(b.rock, b.dirt, 0.4);
      return mix(b.grass, b.dry, n);
    },
    trees: [{ type: "rock", count: 50 }, { type: "icechunk", count: 90 }],
    grass: 0, sky: "cold", aurora: true,
    landmarks: [{ subject: "sledge", x: 40, z: 110 }],
    spawn: { player: [-40, 20] }
  },
  volcanic: {
    seed: 53, water: 2, amp: 8, fog: 0.002,
    colours: { grass: [0.35, 0.42, 0.2], dry: [0.5, 0.45, 0.28], dirt: [0.12, 0.1, 0.1], rock: [0.2, 0.18, 0.18] },
    height(N, x, z) {
      // an island: a volcano cone in the middle, sea at the edges
      const d = Math.hypot(x - 20, z + 20);
      let h = Math.max(0, 1 - d / 250) * 14 + N.fbm(x / 70, z / 70, 4) * 5 - 2;
      const cone = Math.max(0, 1 - d / 120);
      h += cone ** 1.6 * 62;
      if (d < 22) h -= (1 - d / 22) * 24;        // the crater
      return h;
    },
    colour(b, h, slope, x, z, n) {
      if (h < 3.5) return mix(b.dirt, [0.2, 0.18, 0.16], n);   // black sand
      if (slope > 0.5 || h > 40) return mix(b.rock, b.dirt, n);
      return mix(b.grass, b.dry, n);
    },
    trees: [{ type: "cactus", count: 120 }, { type: "bush", count: 90 }, { type: "rock", count: 110 }],
    grass: 2500, grassColour: [0.55, 0.55, 0.3], sky: "warm",
    landmarks: [{ subject: "volcano", x: 20, z: -20 }, { subject: "pirate", x: 205, z: -5 }],
    spawn: { player: [-150, 120] }
  },
  mountain: {
    seed: 67, water: 0.5, amp: 30, fog: 0.0022,
    colours: { grass: [0.45, 0.52, 0.28], dry: [0.55, 0.5, 0.35], dirt: [0.45, 0.4, 0.32], rock: [0.5, 0.48, 0.46] },
    height(N, x, z) {
      // a valley running north-south with a stream; big slopes either side
      const side = Math.abs(x + 20 + Math.sin(z / 90) * 30);
      let h = (side / 220) ** 1.7 * 90 + N.ridge(x / 130, z / 130, 5) * 25 + N.fbm(x / 30, z / 30, 3) * 3;
      h += Math.max(0, (-z - 60) / 180) ** 2 * 60;  // climbing to the north
      h += 2;
      return h;
    },
    colour(b, h, slope, x, z, n) {
      if (h > 60 + n * 10) return [0.95, 0.96, 1];      // snow line
      if (slope > 0.6) return b.rock;
      if (h > 35) return mix(b.rock, b.dry, 0.5);
      return mix(b.grass, b.dry, n);
    },
    trees: [{ type: "pine", count: 100 }, { type: "rock", count: 150 }, { type: "bush", count: 80 }],
    grass: 3000, grassColour: [0.5, 0.55, 0.3], sky: "cold", peaks: true,
    landmarks: [{ subject: "everest", x: 0, z: -900 }],
    spawn: { player: [-10, 170] }
  },
  desert: {
    seed: 79, water: -5, amp: 9, fog: 0.0014,
    colours: { grass: [0.9, 0.76, 0.5], dry: [0.86, 0.68, 0.42], dirt: [0.8, 0.62, 0.4], rock: [0.6, 0.5, 0.36] },
    height(N, x, z) {
      // dunes: ridged noise stretched along the wind
      let h = N.ridge(x / 90 + z / 260, z / 60, 3) * 11 + N.fbm(x / 200, z / 200, 3) * 5 + 3;
      const flat = Math.max(0, 1 - Math.hypot(x + 60, z + 70) / 130);   // the flat plateau of Giza
      h = h * (1 - flat * 0.85) + flat * 5;
      return h;
    },
    colour(b, h, slope, x, z, n) { return mix(b.grass, b.dry, n * 0.8 + slope); },
    trees: [{ type: "palm", count: 24, near: [150, 140, 40] }, { type: "rock", count: 30 }],
    grass: 400, grassColour: [0.6, 0.55, 0.3], sky: "warm",
    landmarks: [{ subject: "pyramids", x: -100, z: -100 }, { subject: "sphinx", x: -30, z: -40 }, { subject: "pyramid2", x: -170, z: -40 }, { subject: "oasis", x: 150, z: 140 }],
    spawn: { player: [60, 120] }
  },
  yellowstone: {
    seed: 83, water: 0.8, amp: 12, fog: 0.0018,
    colours: { grass: [0.5, 0.6, 0.26], dry: [0.68, 0.62, 0.34], dirt: [0.45, 0.35, 0.22], rock: [0.5, 0.48, 0.44] },
    height(N, x, z) {
      let h = N.fbm(x / 140, z / 140, 4) * 12 + N.fbm(x / 35, z / 35, 3) * 1.5 + 4;
      // a lazy river through the meadow, east to west
      const rz = 60 + Math.sin(x / 120) * 40;
      h -= Math.max(0, 1 - Math.abs(z - rz) / 22) * 5;
      // the geyser mound and the hot-spring terrace
      h += Math.max(0, 1 - Math.hypot(x - 20, z + 90) / 30) * 2;
      h -= Math.max(0, 1 - Math.hypot(x - 120, z + 130) / 26) * 1.5;   // hot spring pool
      h += Math.max(0, (-z - 150) / 90) ** 2 * 40;                      // pine hills to the north
      return h;
    },
    colour(b, h, slope, x, z, n) {
      if (Math.hypot(x - 20, z + 90) < 22) return [0.8, 0.78, 0.7];         // geyser sinter
      if (slope > 0.6) return b.rock;
      return mix(b.grass, b.dry, n);
    },
    trees: [{ type: "pine", count: 260 }, { type: "bush", count: 80 }, { type: "rock", count: 60 }],
    grass: 6000, grassColour: [0.55, 0.62, 0.28], sky: "clear",
    landmarks: [{ subject: "geyser", x: 20, z: -90 }, { subject: "hotspring", x: 120, z: -130 }],
    spawn: { player: [-60, 150] }
  },
  antarctic: {
    seed: 97, water: 0.3, amp: 6, fog: 0.002,
    colours: { grass: [0.94, 0.96, 1], dry: [0.88, 0.92, 0.98], dirt: [0.4, 0.33, 0.28], rock: [0.35, 0.3, 0.28] },
    height(N, x, z) {
      // ice shelf in the west, a rocky point in the south-east, open sea north
      let h = N.fbm(x / 90, z / 90, 3) * 1.5 + 2.5;
      const rock = Math.max(0, 1 - Math.hypot(x - 150, z - 150) / 110);
      h += rock ** 1.3 * 18 + rock * N.fbm(x / 20, z / 20, 3) * 4;
      if (z < -60) h -= (-60 - z) / 30 * 3;               // shelf edge into the sea
      h += Math.max(0, (-x - 120) / 120) * 12;             // the ice cap rising to the west
      return h;
    },
    colour(b, h, slope, x, z, n) {
      const rock = Math.max(0, 1 - Math.hypot(x - 150, z - 150) / 100);
      if (rock > 0.15 && h > 2.2) return mix(b.dirt, b.rock, n);
      return mix(b.grass, b.dry, n);
    },
    trees: [{ type: "icechunk", count: 80 }, { type: "rock", count: 40, near: [150, 150, 90] }],
    grass: 0, sky: "cold",
    landmarks: [{ subject: "iceberg", x: -60, z: -180 }, { subject: "iceberg2", x: 120, z: -200 }, { subject: "hut", x: 190, z: 175 }],
    spawn: { player: [-20, 80] }
  }
};

function mix(a, b, t) { t = Math.max(0, Math.min(1, t)); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

/* ---------------- textures drawn on canvases ---------------- */
function noiseTexture(THREE, size, base, spread, seed) {
  const c = document.createElement("canvas"); c.width = c.height = size;
  const g = c.getContext("2d"); const img = g.createImageData(size, size);
  const N = makeNoise(seed || 5);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    // three octaves of grit: pebbles, clumps and broad patches
    const n = N.fbm(x / 7 + 3, y / 7 + 9, 3) * 0.45 + N.fbm(x / 23 + 40, y / 23, 3) * 0.35 + N.fbm(x / 61, y / 61 + 70, 2) * 0.2;
    const v = Math.max(0, Math.min(255, base + n * spread));
    const i = (y * size + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // mirrored repeat makes any texture seamless, so no torus tricks are needed
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
/* leafy canopy texture: blotches of darker and lighter green on a base */
function leafBlotchTexture(THREE, base, dark, light, seed) {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d");
  let s = seed || 9; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 260; i++) {
    g.fillStyle = rnd() < 0.5 ? dark : light; g.globalAlpha = 0.35 + rnd() * 0.4;
    const x = rnd() * 256, y = rnd() * 256, r = 6 + rnd() * 16;
    g.beginPath(); g.ellipse(x, y, r, r * (0.5 + rnd() * 0.5), rnd() * 3, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(2, 2);
  return t;
}
function grassBladeTexture(THREE) {
  const c = document.createElement("canvas"); c.width = 64; c.height = 128;
  const g = c.getContext("2d");
  g.clearRect(0, 0, 64, 128);
  for (let i = 0; i < 11; i++) {
    const x = 5 + i * 5.4, lean = (i - 5) * 4 + (Math.random() - 0.5) * 6, h = 55 + Math.random() * 70;
    const grad = g.createLinearGradient(0, 128, 0, 128 - h); grad.addColorStop(0, "rgba(120,120,120,1)"); grad.addColorStop(1, "rgba(255,255,255,1)");
    g.strokeStyle = grad; g.lineWidth = 1.6 + Math.random() * 1.4; g.lineCap = "round";
    g.beginPath(); g.moveTo(x, 128); g.quadraticCurveTo(x + lean * 0.3, 128 - h * 0.55, x + lean, 128 - h); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function waterNormals(THREE) {
  const n=128,c=document.createElement('canvas');c.width=c.height=n;
  const ctx=c.getContext('2d'),img=ctx.createImageData(n,n);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const u=x/n*Math.PI*2,v=y/n*Math.PI*2;
    const dx=Math.cos(u*3+Math.sin(v*2))*.22+Math.cos(u*7-v*5)*.08;
    const dy=Math.cos(v*4+Math.sin(u*2))*.18-Math.cos(u*7-v*5)*.08;
    const l=Math.hypot(dx,dy,1),i=(y*n+x)*4;
    img.data[i]=(dx/l*.5+.5)*255;img.data[i+1]=(dy/l*.5+.5)*255;img.data[i+2]=(1/l*.5+.5)*255;img.data[i+3]=255;
  }
  ctx.putImageData(img,0,0);const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;return tex;
}
function leafTexture(THREE, fill) {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = fill;
  for (let i = 0; i < 26; i++) {
    const x = 64 + (Math.random() - 0.5) * 90, y = 64 + (Math.random() - 0.5) * 90, r = 10 + Math.random() * 16;
    g.globalAlpha = 0.7 + Math.random() * 0.3;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c); return t;
}

/* ---------------- geometry helpers ---------------- */
function paintVertexColours(THREE, geo, fn) {
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) { const c = fn(pos.getX(i), pos.getY(i), pos.getZ(i), i); col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2]; }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return geo;
}
function bumpy(THREE, geo, amount, seed) {
  const N = makeNoise(seed || 3); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = N.fbm(x * 1.7 + 4, y * 1.7 + z * 1.3, 3);
    p.setXYZ(i, x * (1 + n * amount), y * (1 + n * amount), z * (1 + n * amount));
  }
  geo.computeVertexNormals(); return geo;
}

/* ============================================================
   buildWorld
   ============================================================ */
export function buildWorld(THREE, site, quality) {
  const B = BIOMES[site.biome];
  const N = makeNoise(B.seed);
  const q = quality || 1;                   // 0.6 phone … 1 desktop
  const scene = new THREE.Scene();
  const group = new THREE.Group(); scene.add(group);
  const landmarks = [];
  const colliders = [];                     // {x,z,r} things you can't walk through
  const updaters = [];

  /* ---- height field ---- */
  const RES = 161;
  const heights = new Float32Array(RES * RES);
  for (let j = 0; j < RES; j++) for (let i = 0; i < RES; i++) {
    const x = (i / (RES - 1) - 0.5) * SIZE, z = (j / (RES - 1) - 0.5) * SIZE;
    heights[j * RES + i] = B.height(N, x, z);
  }
  function heightAt(x, z) {
    const fx = ((x / SIZE) + 0.5) * (RES - 1), fz = ((z / SIZE) + 0.5) * (RES - 1);
    const i = Math.max(0, Math.min(RES - 2, Math.floor(fx))), j = Math.max(0, Math.min(RES - 2, Math.floor(fz)));
    const u = Math.max(0, Math.min(1, fx - i)), v = Math.max(0, Math.min(1, fz - j));
    const h00 = heights[j * RES + i], h10 = heights[j * RES + i + 1], h01 = heights[(j + 1) * RES + i], h11 = heights[(j + 1) * RES + i + 1];
    return (h00 * (1 - u) + h10 * u) * (1 - v) + (h01 * (1 - u) + h11 * u) * v;
  }
  function slopeAt(x, z) {
    const e = 2; const dx = heightAt(x + e, z) - heightAt(x - e, z), dz = heightAt(x, z + e) - heightAt(x, z - e);
    return Math.hypot(dx, dz) / (2 * e);
  }
  const waterLevel = B.water;

  /* ---- terrain mesh ---- */
  const tgeo = new THREE.PlaneGeometry(SIZE, SIZE, RES - 1, RES - 1);
  tgeo.rotateX(-Math.PI / 2);
  {
    const p = tgeo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, heightAt(p.getX(i), p.getZ(i)));
    tgeo.computeVertexNormals();
    paintVertexColours(THREE, tgeo, (x, y, z) => {
      const n = N.fbm(x / 18 + 50, z / 18, 3) * 0.5 + 0.5;
      return B.colour(B.colours, y, slopeAt(x, z), x, z, n);
    });
  }
  const detail = noiseTexture(THREE, 256, 222, 36, B.seed);
  detail.repeat.set(48, 48);
  const tmat = new THREE.MeshStandardMaterial({ vertexColors: true, map: detail, roughness: 0.95, metalness: 0 });
  const terrain = new THREE.Mesh(tgeo, tmat);
  terrain.receiveShadow = true; terrain.castShadow = false;
  group.add(terrain);

  /* the world beyond the fences: a huge ring of the same ground so the
     horizon never shows an edge, and distant peaks for the mountains */
  {
    const far = new THREE.Mesh(new THREE.CircleGeometry(SIZE * 6, 48), new THREE.MeshStandardMaterial({ color: new THREE.Color(...mix(B.colours.grass, B.colours.dry, 0.5)), roughness: 1 }));
    far.rotation.x = -Math.PI / 2; far.position.y = (B.underwater ? 0 : Math.min(waterLevel, 1)) - 0.5;
    group.add(far);
    // Continuous rolling terrain beyond the walkable square adds depth.
    if (!B.underwater) {
      const pos=[],uv=[],idx=[],rows=14,cols=128;
      const amp=B.peaks?65:site.biome==='rainforest'?48:site.biome==='desert'?32:site.biome==='antarctic'?24:18;
      for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
        const a=i/cols*Math.PI*2,r=340+j/rows*1800,x=Math.cos(a)*r,z=Math.sin(a)*r;
        const fade=Math.min(1,j/3),h=far.position.y+fade*(amp*.7+N.fbm(x/280,z/280,4)*amp);
        pos.push(x,h,z);uv.push(x/480,z/480);
      }
      for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+cols+1;idx.push(a,a+1,b,a+1,b+1,b)}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();
      group.add(new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:new THREE.Color(...mix(B.colours.grass,B.colours.dry,.45)),roughness:1})));
    }
    if (B.peaks || site.biome === "arctic" || site.biome === "volcanic") {
      const ring = new THREE.Group();
      const n = 22, R = SIZE * 1.15;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + N.rnd() * 0.2;
        if (site.biome === "volcanic") break;
        const h = (B.peaks ? 180 : 60) * (0.5 + N.rnd()), r = 60 + N.rnd() * 90;
        const g = bumpy(THREE, new THREE.ConeGeometry(r, h, 9, 5), 0.28, i + 9);
        paintVertexColours(THREE, g, (x, y) => (y > h * 0.1 ? [0.95, 0.96, 1] : [0.45, 0.44, 0.44]));
        const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
        m.position.set(Math.cos(a) * R * (0.9 + N.rnd() * 0.5), h / 2 - 10, Math.sin(a) * R * (0.9 + N.rnd() * 0.5));
        m.scale.set(1 + N.rnd() * 1.4, 1, 1 + N.rnd() * 1.4); m.rotation.y = N.rnd() * Math.PI;
        ring.add(m);
      }
      group.add(ring);
    }
  }

  /* ---- water ---- */
  let water = null;
  if (!B.underwater && waterLevel > -4) {
    const wn = waterNormals(THREE); wn.repeat.set(40, 40);
    const wm = new THREE.MeshPhysicalMaterial({ color: site.biome === "arctic" || site.biome === "antarctic" ? 0x3a6f8f : 0x2b7fb0, transparent: true, opacity: 0.82, roughness: 0.12, metalness: 0.05, normalMap: wn, normalScale: new THREE.Vector2(0.35, 0.35) });
    water = new THREE.Mesh(new THREE.PlaneGeometry(SIZE * 8, SIZE * 8), wm);
    water.rotation.x = -Math.PI / 2; water.position.y = waterLevel;
    group.add(water);
    updaters.push((dt, t) => { wn.offset.x = t * 0.01; wn.offset.y = t * 0.007; });
  }
  if (B.underwater) {
    // the sea surface, seen from below, with a moving caustic-ish texture
    const wn = noiseTexture(THREE, 128, 150, 100, 78); wn.repeat.set(30, 30);
    const surf = new THREE.Mesh(new THREE.PlaneGeometry(SIZE * 4, SIZE * 4), new THREE.MeshBasicMaterial({ color: 0x9fdcff, map: wn, transparent: true, opacity: 0.55, side: THREE.BackSide }));
    surf.rotation.x = -Math.PI / 2; surf.position.y = waterLevel; group.add(surf);
    updaters.push((dt, t) => { wn.offset.x = t * 0.02; wn.offset.y = t * 0.013; });
    // sand ripples / caustic light on the floor
    detail.repeat.set(60, 60);
    updaters.push((dt, t) => { detail.offset.x = Math.sin(t * 0.3) * 0.02; detail.offset.y = t * 0.004; });
  }

  /* ---- vegetation, rocks & scatter ---- */
  const scatter = makeScatterLibrary(THREE, B, site);
  const placed = [];
  function canPlace(x, z, r, tries) {
    if (Math.abs(x) > SIZE / 2 - 4 || Math.abs(z) > SIZE / 2 - 4) return false;
    const h = heightAt(x, z);
    if (!B.underwater && h < waterLevel + 0.4) return false;
    if (slopeAt(x, z) > 0.7) return false;
    for (const l of landmarks) if (Math.hypot(l.pos.x - x, l.pos.z - z) < l.radius + r) return false;
    for (const p of placed) if (Math.hypot(p[0] - x, p[1] - z) < p[2] + r) return false;
    const sp = B.spawn.player; if (Math.hypot(sp[0] - x, sp[1] - z) < 10) return false;
    return true;
  }
  // landmarks go first so nothing grows through them
  for (const L of B.landmarks) {
    const obj = buildLandmark(THREE, L.subject, site, N);
    if (!obj) continue;
    const y = L.subject === "everest" ? 0 : (L.subject.startsWith("iceberg") ? waterLevel : heightAt(L.x, L.z));
    obj.mesh.position.set(L.x, y + (obj.lift || 0), L.z);
    group.add(obj.mesh);
    const lm = { subject: L.subject, pos: new THREE.Vector3(L.x, y + (obj.centreY || obj.radius * 0.5), L.z), radius: obj.radius, height: obj.height || obj.radius, mesh: obj.mesh, active: obj.active };
    landmarks.push(lm);
    if (obj.collide !== false && L.subject !== "everest") colliders.push({ x: L.x, z: L.z, r: obj.collide || obj.radius * 0.7 });
    if (obj.update) updaters.push(obj.update);
  }
  for (const T of B.trees) {
    const lib = scatter[T.type]; if (!lib) continue;
    const count = Math.round(T.count * q);
    for (const part of lib.parts) if(part.mat.userData.wind) updaters.push((dt,t)=>{part.mat.userData.wind.value=t});
    const m = new THREE.Matrix4(), pos = new THREE.Vector3(), rot = new THREE.Euler(), scl = new THREE.Vector3(), quat = new THREE.Quaternion();
    // Spatial batches let both the camera and shadow camera skip trees behind
    // them. One world-sized instance batch kept drawing the entire forest.
    const batches = new Map();
    let n = 0, tries = 0;
    while (n < count && tries < count * 30) {
      tries++;
      let x, z;
      if (T.near) { const a = N.rnd() * Math.PI * 2, r = Math.sqrt(N.rnd()) * T.near[2]; x = T.near[0] + Math.cos(a) * r; z = T.near[1] + Math.sin(a) * r; }
      else { x = (N.rnd() - 0.5) * SIZE * 0.96; z = (N.rnd() - 0.5) * SIZE * 0.96; }
      if (lib.where && !lib.where(x, z, heightAt(x, z), slopeAt(x, z), N)) continue;
      if (!canPlace(x, z, lib.spacing, tries)) continue;
      const s = lib.scale[0] + N.rnd() * (lib.scale[1] - lib.scale[0]);
      const h = heightAt(x, z);
      const y = B.underwater ? h : h - 0.15;
      rot.set(0, N.rnd() * Math.PI * 2, 0); quat.setFromEuler(rot); pos.set(x, y, z); scl.set(s, s, s);
      m.compose(pos, quat, scl);
      const cell = Math.floor((x+SIZE/2)/120)+4*Math.floor((z+SIZE/2)/120);
      if(!batches.has(cell))batches.set(cell,[]);
      batches.get(cell).push(m.clone());
      placed.push([x, z, lib.spacing * 0.6]);
      if (lib.collide) colliders.push({ x, z, r: lib.collide * s });
      n++;
    }
    for(const matrices of batches.values())for(const part of lib.parts){
      const meshes=[];
      for(const far of part.farGeo?[false,true]:[false]){
        const im=new THREE.InstancedMesh(far?part.farGeo:part.geo,part.mat,matrices.length);
        im.castShadow=part.shadow!==false&&!far;im.receiveShadow=true;
        matrices.forEach((matrix,i)=>im.setMatrixAt(i,matrix));
        im.instanceMatrix.needsUpdate=true;im.computeBoundingSphere();
        im.boundingSphere.radius+=.5;group.add(im);meshes.push(im);
      }
      if(meshes.length===2){
        let last=-Infinity;
        updaters.push((dt,t,env,p)=>{
          if(!p||t-last<.35)return;last=t;
          let nearCount=0,farCount=0;
          for(const matrix of matrices){const e=matrix.elements,near=Math.hypot(e[12]-p.x,e[14]-p.z)<100;meshes[near?0:1].setMatrixAt(near?nearCount++:farCount++,matrix)}
          meshes[0].count=nearCount;meshes[1].count=farCount;
          for(const im of meshes)im.instanceMatrix.needsUpdate=true;
        });
        meshes[1].count=0;
      }
    }
  }
  // grass tufts: cheap crossed planes, in enormous numbers
  if (B.grass) {
    const count = Math.round(B.grass * 1.6 * q);
    const tex = grassBladeTexture(THREE);
    const gc = B.grassColour;
    const gmat = new THREE.MeshStandardMaterial({ map: tex, color: new THREE.Color(gc[0], gc[1], gc[2]), alphaTest: 0.4, alphaToCoverage: true, side: THREE.DoubleSide, roughness: 1 });
    const wind={value:0};
    gmat.onBeforeCompile=shader=>{
      shader.uniforms.expeditionWind=wind;
      shader.vertexShader='uniform float expeditionWind;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        float phase=instanceMatrix[3].x*.17+instanceMatrix[3].z*.11;
        transformed.x+=sin(expeditionWind*1.6+phase)*uv.y*uv.y*.12;`);
    };
    updaters.push((dt,t)=>{wind.value=t});
    const grassH=site.biome==='savanna'?1.15:.85;
    const g1 = new THREE.PlaneGeometry(1.1, grassH); g1.translate(0, grassH*.5, 0);
    const g2 = g1.clone(); g2.rotateY(Math.PI / 2);
    const im1 = new THREE.InstancedMesh(g1, gmat, count), im2 = new THREE.InstancedMesh(g2, gmat, count);
    im1.frustumCulled = im2.frustumCulled = false;
    const m = new THREE.Matrix4(), pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3(), rot = new THREE.Euler();
    let n = 0, tries = 0;
    while (n < count && tries < count * 4) {
      tries++;
      const x = (N.rnd() - 0.5) * SIZE * 0.98, z = (N.rnd() - 0.5) * SIZE * 0.98;
      const h = heightAt(x, z);
      if (h < waterLevel + 0.3 || slopeAt(x, z) > 0.6) continue;
      if (site.biome === "mountain" && h > 55) continue;
      if (site.biome === "volcanic" && (h < 4 || h > 30)) continue;
      const s = 0.55 + N.rnd() * 0.7;
      rot.set(0, N.rnd() * Math.PI, 0); quat.setFromEuler(rot); pos.set(x, h - 0.05, z); scl.set(s, s * (0.8 + N.rnd() * 0.6), s);
      m.compose(pos, quat, scl); im1.setMatrixAt(n, m); im2.setMatrixAt(n, m); n++;
    }
    im1.count = im2.count = n; group.add(im1); group.add(im2);
  }

  /* ---- sky ---- */
  const sky = buildSky(THREE, B);
  scene.add(sky.mesh);

  /* ---- lights ---- */
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.castShadow = true;
  const sm = q >= 1 ? 2048 : 1024;
  sun.shadow.mapSize.set(sm, sm);
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 400;
  const sr = 110; sun.shadow.camera.left = -sr; sun.shadow.camera.right = sr; sun.shadow.camera.top = sr; sun.shadow.camera.bottom = -sr;
  sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.6;
  scene.add(sun); scene.add(sun.target);
  const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x6b5a3a, 0.9);
  scene.add(hemi);
  scene.fog = new THREE.FogExp2(0xcfe3f5, B.fog);

  /* particles: bubbles under water, snow in the cold, fireflies at night in the jungle */
  const particles = buildParticles(THREE, B, site);
  if (particles) { scene.add(particles.points); updaters.push(particles.update); }

  /* ---- environment: colours for a given clock ---- */
  const env = { sunDir: new THREE.Vector3(0, 1, 0), elevation: 1, golden: 0, night: 0, isNight: false, label: "day" };
  const tmpC = new THREE.Color();
  function setClock(clock, playerPos) {
    // clock: 0 = sunrise … 0.5 = noon … 1 = sunset, then 1 … 1.25 night, wraps
    const day = clock % 1.25;
    let el, az;
    if (day <= 1) { el = Math.sin(day * Math.PI) * 1.05; az = -Math.PI * 0.5 + day * Math.PI; }
    else { const nt = (day - 1) / 0.25; el = -0.25 * Math.sin(nt * Math.PI) - 0.02; az = Math.PI * 0.5 + nt * Math.PI; }
    // high-latitude sites get a low sun all day
    if (site.biome === "arctic" || site.biome === "antarctic") el *= 0.42;
    const sd = new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el));
    env.sunDir.copy(sd); env.elevation = el;
    const above = Math.max(0, Math.sin(el));
    env.golden = Math.max(0, 1 - Math.abs(above - 0.12) / 0.16);          // 1 at a low sun
    env.night = 1 - Math.max(0, Math.min(1, (el + 0.05) / 0.12));         // 1 after the sun has set
    env.isNight = env.night > 0.6;
    env.label = env.isNight ? "night" : (el < 0.35 ? (day < 0.5 ? "dawn" : "dusk") : "day");
    env.clock = day;

    const warm = tmpC.setRGB(1, 0.62 + 0.38 * Math.min(1, above * 3), 0.35 + 0.65 * Math.min(1, above * 2.2));
    sun.color.copy(warm);
    sun.intensity = (0.4 + 2.4 * Math.min(1, above * 2.5)) * (B.underwater ? 0.7 : 1) * (1 - env.night * 0.93);
    sun.position.copy(sd).multiplyScalar(180).add(playerPos || new THREE.Vector3());
    if (playerPos) sun.target.position.copy(playerPos);
    const skyCol = skyColours(B, above, env.night);
    hemi.color.copy(skyCol.zenith).lerp(tmpC.setRGB(1,1,1),.45); hemi.groundColor.copy(skyCol.ground).lerp(tmpC.setRGB(.5,.45,.35),.35);
    hemi.intensity = (B.underwater ? 1.6 : 1.15 + 0.85 * above) * (1 - env.night * 0.86) + 0.12;
    scene.fog.color.copy(B.underwater ? skyCol.horizon : skyCol.horizon);
    sky.set(sd, skyCol, env.night, day);
    if (water) water.material.color.copy(skyCol.horizon).multiplyScalar(0.5).add(tmpC.set(0x123a55).multiplyScalar(0.5));
    if (particles && particles.setNight) particles.setNight(env.night);
  }

  function update(dt, t, clock, playerPos) {
    setClock(clock, playerPos);
    for (const u of updaters) u(dt, t, env, playerPos);
    sky.mesh.position.copy(playerPos || new THREE.Vector3());
  }

  function dispose() {
    scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((m) => { for (const k in m) if (m[k] && m[k].isTexture) m[k].dispose(); m.dispose(); }); } });
  }

  return { scene, group, heightAt, slopeAt, waterLevel, underwater: !!B.underwater, landmarks, colliders, update, env, sun, dispose, spawn: B.spawn, biome: B, noise: N };
}

/* ============================================================
   sky
   ============================================================ */
function skyColours(B, above, night) {
  const c = (r, g, b) => ({ r, g, b });
  const k = B.sky;
  let zen, hor, grd;
  if (k === "cold") { zen = c(0.35, 0.55, 0.85); hor = c(0.78, 0.86, 0.95); grd = c(0.75, 0.78, 0.82); }
  else if (k === "humid") { zen = c(0.45, 0.62, 0.85); hor = c(0.82, 0.86, 0.85); grd = c(0.25, 0.32, 0.18); }
  else if (k === "sea") { zen = c(0.05, 0.3, 0.55); hor = c(0.1, 0.42, 0.62); grd = c(0.1, 0.35, 0.5); }
  else if (k === "clear") { zen = c(0.28, 0.5, 0.9); hor = c(0.78, 0.86, 0.95); grd = c(0.4, 0.42, 0.28); }
  else { zen = c(0.32, 0.55, 0.9); hor = c(0.9, 0.85, 0.72); grd = c(0.55, 0.45, 0.28); }
  // low sun: warm the horizon, deepen the zenith
  const low = Math.max(0, 1 - above * 2.5);
  const lerp = (a, b, t) => a + (b - a) * t;
  const o = {
    zenith: { r: lerp(zen.r, 0.18, low * 0.6), g: lerp(zen.g, 0.25, low * 0.6), b: lerp(zen.b, 0.55, low * 0.5) },
    horizon: { r: lerp(hor.r, 1.0, low * 0.8), g: lerp(hor.g, 0.55, low * 0.8), b: lerp(hor.b, 0.35, low * 0.8) },
    ground: grd
  };
  const nd = 1 - night * 0.9;
  const T = { zenith: new THREE_Color(o.zenith.r * (1 - night) + 0.02 * night, o.zenith.g * (1 - night) + 0.03 * night, o.zenith.b * (1 - night) + 0.08 * night),
              horizon: new THREE_Color(o.horizon.r * nd + 0.04, o.horizon.g * nd + 0.05, o.horizon.b * nd + 0.1),
              ground: new THREE_Color(grd.r * nd, grd.g * nd, grd.b * nd) };
  if (B.underwater) { T.horizon.setRGB(0.05 + 0.1 * above, 0.3 + 0.2 * above, 0.5 + 0.2 * above); T.zenith.setRGB(0.1, 0.45, 0.7); }
  // The palette is in display colours; the sky shader now uses the same
  // colour management as the terrain and wildlife.
  T.zenith.convertSRGBToLinear(); T.horizon.convertSRGBToLinear(); T.ground.convertSRGBToLinear();
  return T;
}
let THREE_Color = null;

function buildSky(THREE, B) {
  THREE_Color = THREE.Color;
  const uniforms = {
    sunDir: { value: new THREE.Vector3(0, 1, 0) },
    zenith: { value: new THREE.Color(0.3, 0.5, 0.9) },
    horizon: { value: new THREE.Color(0.9, 0.85, 0.7) },
    night: { value: 0 }, time: { value: 0 }, aurora: { value: B.aurora ? 1 : 0 }, underwater: { value: B.underwater ? 1 : 0 },
    cloudCover: { value: B.sky==='humid'?.57:B.sky==='clear'?.28:.43 }
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }`,
    fragmentShader: `
      uniform vec3 sunDir; uniform vec3 zenith; uniform vec3 horizon; uniform float night; uniform float time; uniform float aurora; uniform float underwater; uniform float cloudCover;
      varying vec3 vDir;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
      float cloudNoise(vec2 p){ return noise(p)*.53+noise(p*2.07+13.2)*.27+noise(p*4.13+7.6)*.13+noise(p*8.31)*.07; }
      void main(){
        vec3 d = normalize(vDir);
        float up = max(d.y, 0.0);
        vec3 col = mix(horizon, zenith, pow(up, 0.55));
        if (underwater > 0.5) { col = mix(horizon, zenith, pow(up, 0.8)); }
        float sd = max(dot(d, sunDir), 0.0);
        float sunUp = max(sunDir.y, -0.1);
        // sun disc and its glow, warmer and bigger when low
        float disc = smoothstep(0.99982, 0.99996, sd);
        float glow = pow(sd, 32.0) * .22 + pow(sd, 4.0) * .045;
        vec3 sunCol = mix(vec3(1.0, 0.48, 0.19), vec3(1.0, 0.96, 0.85), clamp(sunUp * 2.5, 0.0, 1.0));
        col += sunCol * (disc * 3.0 + glow) * (1.0 - night) * (1.0 - underwater*.7);
        // Perspective cloud banks with lit rims and shaded interiors, all in
        // the sky pass: no camera-facing cotton-ball sprites or extra draws.
        float cloudMask=1.0;
        if(underwater < .5 && d.y > .015){
          vec2 p=d.xz/(d.y+.22)*2.3+vec2(time*.004,time*.0015);
          float n=cloudNoise(p),edge=1.0-cloudCover;
          float density=smoothstep(edge,edge+.18,n)*smoothstep(.015,.12,d.y);
          cloudMask=1.0-density;
          float light=clamp((n-cloudNoise(p+sunDir.xz*.12))*3.0+.65,.25,1.0);
          vec3 shade=mix(vec3(.29,.37,.49),vec3(.94,.96,1.0),light);
          shade=mix(shade,shade*vec3(1.12,.76,.48),pow(1.0-max(sunDir.y,0.0),5.0)*.65);
          shade=mix(shade,vec3(.035,.05,.085),night*.94);
          col=mix(col,shade,density*.94);
          col+=sunCol*pow(sd,80.0)*density*(1.0-density)*.5*(1.0-night);
        }
        // ground haze below the horizon
        col = mix(col, horizon, (1.0-smoothstep(-0.15, 0.0, d.y)) * 0.7);
        // stars: an equal-angle grid over the sky dome, one small round
        // point per cell, each with its own size, tint, twinkle phase and
        // speed so they shimmer independently instead of pulsing in unison
        if (night > 0.05 && d.y > 0.0) {
          vec3 moonDir=normalize(vec3(-sunDir.x,max(.22,-sunDir.y),-sunDir.z));
          float moon=smoothstep(.99972,.99994,dot(d,moonDir));
          float maria=.75+.25*noise(d.xz*700.0);
          col+=vec3(.72,.79,.91)*moon*maria*night*cloudMask;
          float el = asin(clamp(d.y, 0.0, 1.0));
          float az = atan(d.x, d.z);
          float rowf = el * 40.0;
          float row = floor(rowf);
          float cols = max(6.0, floor(250.0 * cos((row + 0.5) / 40.0)));
          float colf = (az + 3.14159265) / 6.2831853 * cols;
          vec2 cell = vec2(floor(colf), row);
          float s = hash(cell);
          if (s > 0.955) {
            vec2 f = vec2(fract(colf), fract(rowf));
            vec2 off = vec2(hash(cell + 7.7), hash(cell + 3.3)) * 0.6 + 0.2;
            float r = length(f - off);
            float mag = hash(cell + 17.3);
            float phase = hash(cell + 41.7) * 6.2832;
            float rate = 0.6 + hash(cell + 93.1) * 2.4;
            float twinkle = 0.7 + 0.3 * sin(time * rate + phase);
            float size = 0.07 + mag * mag * 0.1;
            vec3 tint = mix(vec3(1.0, 0.92, 0.8), vec3(0.8, 0.9, 1.0), hash(cell + 5.5));
            float star = (1.0-smoothstep(size*.25,size,r)) * (0.3 + 0.7 * mag) * twinkle * smoothstep(0.0, 0.25, d.y);
            col += tint * star * night * cloudMask;
          }
        }
        // aurora: ribbons of green light across the northern sky at night
        if (aurora > 0.5 && night > 0.2 && d.y > 0.05 && d.z < 0.2) {
          float band = d.y;
          float w = noise(vec2(d.x * 3.0 + time * 0.05, band * 6.0 - time * 0.08)) * 0.6 + noise(vec2(d.x * 9.0 - time * 0.1, band * 12.0)) * 0.4;
          float curtain = smoothstep(0.15, 0.35, band) * (1.0-smoothstep(0.45, 0.8, band)) * pow(w, 2.2) * 2.2;
          curtain *= 1.0-smoothstep(-0.4, 0.2, d.z);
          vec3 ac = mix(vec3(0.1, 0.9, 0.4), vec3(0.6, 0.2, 0.9), smoothstep(0.35, 0.7, band));
          col += ac * curtain * night * cloudMask;
        }
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), mat);
  mesh.frustumCulled = false; mesh.renderOrder = -10;
  return {
    mesh,
    set(sunDir, cols, night, day) {
      uniforms.sunDir.value.copy(sunDir); uniforms.zenith.value.copy(cols.zenith); uniforms.horizon.value.copy(cols.horizon);
      uniforms.night.value = night; uniforms.time.value = performance.now() / 1000;
    }
  };
}

function dotTexture(THREE) {
  const c = document.createElement("canvas"); c.width = c.height = 32; const g = c.getContext("2d");
  const rg = g.createRadialGradient(16, 16, 0, 16, 16, 16); rg.addColorStop(0, "rgba(255,255,255,1)"); rg.addColorStop(0.5, "rgba(255,255,255,0.6)"); rg.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = rg; g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

function buildParticles(THREE, B, site) {
  let kind = null;
  if (B.underwater) kind = "bubbles"; else if (site.biome === "arctic" || site.biome === "antarctic" || site.biome === "mountain") kind = "snow"; else if (site.biome === "rainforest") kind = "fireflies";
  if (!kind) return null;
  const n = kind === "snow" ? 900 : 260;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3), vel = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 80; pos[i * 3 + 1] = Math.random() * 30; pos[i * 3 + 2] = (Math.random() - 0.5) * 80; vel[i] = 0.5 + Math.random(); }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ size: kind === "fireflies" ? 0.5 : 0.35, color: kind === "fireflies" ? 0xffe066 : 0xffffff, transparent: true, opacity: kind === "bubbles" ? 0.5 : 0.85, sizeAttenuation: true, depthWrite: false, map: dotTexture(THREE) });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return {
    points,
    setNight(nt) { if (kind === "fireflies") mat.opacity = nt * 0.9; },
    update(dt, t, env, p) {
      const a = geo.attributes.position.array;
      const cx = p ? p.x : 0, cz = p ? p.z : 0, cy = p ? p.y : 0;
      for (let i = 0; i < n; i++) {
        let y = a[i * 3 + 1];
        if (kind === "bubbles") { y += vel[i] * 1.5 * dt; a[i * 3] += Math.sin(t * 2 + i) * 0.2 * dt; if (y > cy + 25) y = cy - 8; }
        else if (kind === "snow") { y -= vel[i] * 1.6 * dt; a[i * 3] += Math.sin(t + i) * 0.4 * dt; if (y < cy - 5) y = cy + 25; }
        else { y += Math.sin(t * 1.5 + i) * 0.3 * dt; a[i * 3] += Math.cos(t + i * 0.7) * 0.4 * dt; a[i * 3 + 2] += Math.sin(t * 0.8 + i * 1.3) * 0.4 * dt; if (y > cy + 8 || y < cy - 2) y = cy + 1 + Math.random() * 3; }
        a[i * 3 + 1] = y;
        // keep the cloud of particles around the player
        if (a[i * 3] - cx > 40) a[i * 3] -= 80; if (a[i * 3] - cx < -40) a[i * 3] += 80;
        if (a[i * 3 + 2] - cz > 40) a[i * 3 + 2] -= 80; if (a[i * 3 + 2] - cz < -40) a[i * 3 + 2] += 80;
      }
      geo.attributes.position.needsUpdate = true;
    }
  };
}

/* ============================================================
   scatter library: instanced trees, rocks, bushes, coral…
   Each entry: parts [{geo, mat}] sharing one instance matrix,
   scale range, spacing, optional placement rule.
   ============================================================ */
function makeScatterLibrary(THREE, B, site) {
  const lib = {};
  const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.9, metalness: 0 }, o));
  const bark = barkMaterial(THREE);
  const leaves = foliageMaterial(THREE), needles = foliageMaterial(THREE,true);
  const treeParts=kind=>{
    const make=distant=>kind==='pine'?pineTree(THREE,needles,bark,distant):broadleafTree(THREE,kind,leaves,bark,distant);
    const near=make(false),far=make(true);
    near.forEach((part,i)=>{part.farGeo=far[i].geo});return near;
  };

  // Open, branching canopies with individual leafy sprays.
  lib.acacia = { parts: treeParts('acacia'), scale:[.7,1.5], spacing:9, collide:.6 };
  lib.bush = { parts:[{geo:leafCloud(THREE,[[0,.85,0,1.1,.65,1.1,75,.7]],8,'#82944f'),mat:leaves}],scale:[.6,1.6],spacing:3,shadow:true };
  // rock
  {
    const g = bumpy(THREE, new THREE.DodecahedronGeometry(1.2, 1), 0.25, 12); g.translate(0, 0.4, 0);
    const col = B.colours.rock;
    lib.rock = { parts: [{ geo: g, mat: std({ color: new THREE.Color(col[0], col[1], col[2]), flatShading: true }) }], scale: [0.4, 2.6], spacing: 3, collide: 0.9 };
  }
  // ice chunk
  {
    const g = bumpy(THREE, new THREE.DodecahedronGeometry(1.4, 1), 0.3, 13); g.scale(1.4, 0.7, 1); g.translate(0, 0.4, 0);
    lib.icechunk = { parts: [{ geo: g, mat: std({ color: 0xd8f0ff, flatShading: true, roughness: 0.4 }) }], scale: [0.5, 3], spacing: 4, collide: 1.2, where: (x, z, h) => h < 12 };
  }
  lib.pine = { parts:treeParts('pine'),scale:[.7,1.7],spacing:5,collide:.5,
    where:(x,z,h,s)=>site.biome==='mountain'?(h<50&&s<.6):(site.biome==='yellowstone'?(z< -40||h>12||(x>120&&z>100)):true) };
  lib.kapok = { parts:treeParts('kapok'),scale:[.8,1.6],spacing:10,collide:1.2,where:(x,z,h)=>h>2.5 };
  // palm
  {
    const trunk = new THREE.CylinderGeometry(0.18, 0.32, 8, 6); trunk.translate(0, 4, 0); trunk.rotateZ(0.08);
    const parts = [{ geo: trunk, mat: barkMaterial(THREE,"#a98b64") }];
    const fronds = [];
    for (let i=0;i<8;i++){
      const a=i*Math.PI/4;
      const stem=taperedCurve(THREE,[[0,0,0],[0,.8,1.8],[0,-1.3,4.5]],.035,.008,10,5);stem.rotateY(a);stem.translate(.6,7.8,0);fronds.push(stem);
      for(let j=1;j<9;j++)for(const sx of [-1,1]){
        const t=j/10,len=.9*Math.sin(Math.PI*t)+.2;
        const f=blade(THREE,len,.22,-.12,0,4);f.rotateY(sx*1.15);f.translate(0,Math.sin(t*Math.PI)*.9-t*t*1.3,4.5*t);f.rotateY(a);f.translate(.6,7.8,0);fronds.push(f);
      }
    }
    const merged = mergeForms(THREE, fronds);
    parts.push({ geo: merged, mat: std({ color: 0x3f8a3a, side: THREE.DoubleSide, roughness:.8 }) });
    lib.palm = { parts, scale: [0.7, 1.4], spacing: 5, collide: 0.4, where: (x, z, h) => site.biome === "desert" ? true : h > 1.5 && h < 6 };
  }
  // fern
  {
    const parts = [];
    const leaves=[];for(let i=0;i<6;i++)for(let j=1;j<6;j++)for(const sx of [-1,1]){
      const t=j/6,l=blade(THREE,.36*Math.sin(t*Math.PI)+.05,.12,.025,0,2);l.rotateY(sx*1.05);l.translate(0,Math.sin(t*Math.PI)*.55,t*1.5);l.rotateY(i*Math.PI*2/6);leaves.push(l);
    }
    parts.push({ geo: mergeForms(THREE, leaves), mat: std({ color: 0x3c7f2c, side: THREE.DoubleSide }), shadow: false });
    lib.fern = { parts, scale: [0.6, 1.6], spacing: 1.5 };
  }
  // cactus / dry scrub for the volcanic island
  {
    const g = new THREE.CylinderGeometry(0.35, 0.45, 2.6, 7); g.translate(0, 1.3, 0);
    const a1 = new THREE.CylinderGeometry(0.2, 0.25, 1.4, 6); a1.translate(0.75, 2, 0); a1.rotateZ(0.15);
    lib.cactus = { parts: [{ geo: mergeGeos(THREE, [g, a1]), mat: std({ color: 0x5f8a44 }) }], scale: [0.5, 1.4], spacing: 3, collide: 0.4, where: (x, z, h) => h > 4 && h < 34 };
  }
  // coral: branching staghorn clusters, round brain corals, waving kelp and anemones
  {
    const branches = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2, len = 1.4 + (i % 3) * 0.5;
      const b = new THREE.CylinderGeometry(0.05, 0.14, len, 5); b.translate(0, len / 2, 0); b.rotateZ(0.5 + (i % 2) * 0.35); b.rotateY(a); branches.push(b);
      const tip = new THREE.SphereGeometry(0.12, 5, 4); tip.translate(0, len, 0); tip.rotateZ(0.5 + (i % 2) * 0.35); tip.rotateY(a); branches.push(tip);
      for(const sx of [-1,1]){const fork=taperedCurve(THREE,[[0,len*.55,0],[sx*.3,len*.8,0],[sx*.55,len*.98,.15]],.075,.018,5,5);fork.rotateZ(.5+(i%2)*.35);fork.rotateY(a);branches.push(fork)}
    }
    const base = bumpy(THREE, new THREE.SphereGeometry(0.7, 8, 6), 0.3, 31); base.scale(1, 0.5, 1); branches.push(base);
    const geo = mergeGeos(THREE, branches);
    paintVertexColours(THREE, geo, (x, y, z) => { const pal = [[1, 0.45, 0.55], [1, 0.7, 0.3], [0.65, 0.35, 0.85], [0.35, 0.85, 0.7], [0.95, 0.9, 0.5]]; return pal[Math.floor(Math.abs(Math.sin(x * 3 + z * 5)) * 5) % 5]; });
    lib.coral = { parts: [{ geo, mat: std({ vertexColors: true, roughness: 0.7, emissive: 0x442233, emissiveIntensity: 0.35 }) }], scale: [0.7, 2.6], spacing: 2.5, collide: 0.6, where: (x, z, h) => h > 8 };
    const brain = bumpy(THREE, new THREE.SphereGeometry(1.2, 12, 9, 0, Math.PI * 2, 0, Math.PI / 2), 0.12, 33);
    paintVertexColours(THREE, brain, (x, y, z) => { const t = Math.sin(x * 9) * Math.cos(z * 9) > 0 ? 0.85 : 0.55; return [0.95 * t, 0.75 * t, 0.35 * t]; });
    lib.brain = { parts: [{ geo: brain, mat: std({ vertexColors: true, roughness: 0.8, emissive: 0x332211, emissiveIntensity: 0.4 }) }], scale: [0.5, 2], spacing: 3, collide: 0.8, where: (x, z, h) => h > 8 };
    const kelpTex = grassBladeTexture(THREE);
    const w = new THREE.PlaneGeometry(1.2, 3.6); w.translate(0, 1.7, 0);
    const w2 = w.clone(); w2.rotateY(Math.PI / 2);
    lib.seaweed = { parts: [{ geo: mergeGeos(THREE, [w, w2]), mat: std({ map: kelpTex, color: 0x2f8f4a, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }), shadow: false }], scale: [0.6, 1.8], spacing: 1.2 };
    const tent = [];
    for (let i = 0; i < 14; i++) { const t = new THREE.CylinderGeometry(0.04, 0.07, 0.9, 4); t.translate(0, 0.45, 0); t.rotateX(0.5 + (i % 3) * 0.3); t.rotateY((i / 14) * Math.PI * 2); tent.push(t); }
    const disc = new THREE.CylinderGeometry(0.4, 0.3, 0.2, 10); disc.translate(0, 0.1, 0); tent.push(disc);
    lib.anemone = { parts: [{ geo: mergeGeos(THREE, tent), mat: std({ color: 0xe0a0ff, roughness: 0.6 }) }], scale: [0.6, 1.6], spacing: 1.5, where: (x, z, h) => h > 8 };
  }
  return lib;
}

function mergeGeos(THREE, geos) {
  // tiny merge: all geometries must be non-indexed-compatible PlaneGeometry/Cylinder etc; we convert to non-indexed
  const parts = geos.map((g) => g.toNonIndexed());
  let total = 0; for (const g of parts) total += g.attributes.position.count;
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), uv = new Float32Array(total * 2);
  let o = 0;
  for (const g of parts) {
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3)); out.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return out;
}

/* ============================================================
   landmarks
   ============================================================ */
function buildLandmark(THREE, id, site, N) {
  const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.9, metalness: 0 }, o));
  const g = new THREE.Group();
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };

  if (id === "baobab") {
    const trunk = bumpy(THREE, new THREE.CylinderGeometry(2.2, 4.2, 16, 12, 6), 0.06, 5); trunk.translate(0, 8, 0);
    const wood=[trunk],crowns=[];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2, len = 6 + N.rnd() * 5;
      const x=Math.cos(a)*(1.5+len*.72),z=Math.sin(a)*(1.5+len*.72),y=15.5+len*.62;
      wood.push(taperedCurve(THREE,[[Math.cos(a),12,Math.sin(a)],[x*.45,17,z*.45],[x,y,z]],1,.14,12,8));
      crowns.push([x,y,z,2.9,1.2,2.9,66,1.7]);
    }
    add(mergeForms(THREE,wood),barkMaterial(THREE,'#ad9a85'));
    const leafMat=foliageMaterial(THREE);
    add(leafCloud(THREE,crowns,41,'#809952'),leafMat);
    return { mesh: g, radius: 11, height: 24, centreY: 13, collide: 4.5 };
  }
  if (id === "temple") {
    const stone = std({ color: 0x8c8c7a, flatShading: true });
    for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(18 - i * 4, 1.6, 18 - i * 4), stone, 0, 0.8 + i * 1.6, 0);
    for (const [x, z] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) add(new THREE.CylinderGeometry(0.7, 0.8, 6, 8), stone, x, 9.4, z);
    add(new THREE.BoxGeometry(11, 1, 11), stone, 0, 12.9, 0);
    const idol = add(new THREE.SphereGeometry(0.9, 10, 8), std({ color: 0xffc83d, metalness: 0.9, roughness: 0.25 }), 0, 7.3, 0);
    idol.scale.set(1, 1.3, 0.8);
    const moss = std({ color: 0x3f6b2a });
    for (let i = 0; i < 10; i++) add(bumpy(THREE, new THREE.SphereGeometry(1.5, 6, 5), 0.3, i), moss, (N.rnd() - 0.5) * 16, 1 + N.rnd() * 5, (N.rnd() - 0.5) * 16);
    return { mesh: g, radius: 12, height: 14, centreY: 6, collide: 9 };
  }
  if (id === "wreck") {
    const wood = std({ color: 0x4a3a2a });
    const hull = new THREE.CylinderGeometry(4, 2, 26, 10, 1, false); hull.rotateZ(Math.PI / 2); hull.scale(1, 1, 0.55);
    const h = add(hull, wood, 0, 3, 0); h.rotation.x = 0.35; h.rotation.y = 0.4;
    const mast = add(new THREE.CylinderGeometry(0.25, 0.35, 22, 6), wood, 2, 12, 0); mast.rotation.z = 0.25;
    add(new THREE.BoxGeometry(2.4, 1.6, 1.6), std({ color: 0x8a5a2a }), 6, 1.5, 3);   // the chest
    add(new THREE.BoxGeometry(2.6, 0.5, 1.8), std({ color: 0xffc83d, metalness: 0.8, roughness: 0.3 }), 6, 2.5, 3);
    return { mesh: g, radius: 16, height: 22, centreY: 6, collide: 8 };
  }
  if (id === "sledge" || id === "hut" || id === "pirate") {
    const wood = std({ color: 0x6b4a2a });
    if (id === "sledge") { add(new THREE.BoxGeometry(3, 0.3, 1.4), wood, 0, 0.6, 0); add(new THREE.BoxGeometry(3.2, 0.15, 0.2), wood, 0, 0.15, -0.6); add(new THREE.BoxGeometry(3.2, 0.15, 0.2), wood, 0, 0.15, 0.6); add(new THREE.BoxGeometry(0.2, 0.5, 1.4), wood, 1.3, 1, 0); return { mesh: g, radius: 3, height: 1.5, centreY: 0.6, collide: 1.2 }; }
    if (id === "pirate") { add(new THREE.BoxGeometry(2, 1.2, 1.3), wood, 0, 0.4, 0); add(new THREE.CylinderGeometry(0.65, 0.65, 2, 10, 1, false, 0, Math.PI), std({ color: 0x8a5a2a }), 0, 1, 0).rotation.z = Math.PI / 2; const rock = add(bumpy(THREE, new THREE.SphereGeometry(5, 9, 7), 0.25, 44), std({ color: 0x2a2626, flatShading: true }), 6, 1, -4); rock.scale.set(1.6, 0.9, 1); return { mesh: g, radius: 9, height: 5, centreY: 1, collide: 2 }; }
    add(new THREE.BoxGeometry(8, 3.6, 6), wood, 0, 1.8, 0);
    const roof = add(new THREE.ConeGeometry(6, 2.4, 4), std({ color: 0x3a2a1a }), 0, 4.8, 0); roof.rotation.y = Math.PI / 4;
    add(new THREE.BoxGeometry(1.2, 2.2, 0.2), std({ color: 0x2a1a0a }), 0, 1.1, 3.05);
    return { mesh: g, radius: 8, height: 6, centreY: 2.5, collide: 5.5 };
  }
  if (id === "volcano") return { mesh: g, radius: 120, height: 70, centreY: 40, collide: false };
  if (id === "everest") {
    // the great peak, far beyond the north edge, with the famous plume of snow
    const geo = bumpy(THREE, new THREE.ConeGeometry(420, 520, 9, 6), 0.14, 88);
    paintVertexColours(THREE, geo, (x, y) => (y > -120 ? [0.97, 0.98, 1] : [0.42, 0.4, 0.4]));
    const m = new THREE.Mesh(geo, std({ vertexColors: true, flatShading: true })); m.position.y = 160;
    g.add(m);
    for (let i = 0; i < 4; i++) {
      const geo2 = bumpy(THREE, new THREE.ConeGeometry(260, 330, 8, 4), 0.14, 90 + i);
      paintVertexColours(THREE, geo2, (x, y) => (y > -60 ? [0.95, 0.96, 1] : [0.45, 0.43, 0.43]));
      const s = new THREE.Mesh(geo2, std({ vertexColors: true, flatShading: true })); s.position.set((i - 1.5) * 380, 90, 120 + i * 40);
      g.add(s);
    }
    return { mesh: g, radius: 420, height: 700, centreY: 400, collide: false };
  }
  if (id === "pyramids" || id === "pyramid2") {
    const big = id === "pyramids";
    const geo = new THREE.ConeGeometry(big ? 115 : 80, big ? 73 : 52, 4, 1);
    const m = add(geo, std({ color: 0xd3b787, flatShading: true }), 0, (big ? 73 : 52) / 2 - 1, 0); m.rotation.y = Math.PI / 4;
    return { mesh: g, radius: big ? 90 : 62, height: big ? 73 : 52, centreY: big ? 30 : 22, collide: big ? 82 : 58 };
  }
  if (id === "sphinx") {
    const stone = std({ color: 0xc9a97a });
    const body = add(new THREE.BoxGeometry(14, 8, 36), stone, 0, 4, 0);
    add(new THREE.BoxGeometry(6, 8, 14), stone, -5, 3, 13); add(new THREE.BoxGeometry(6, 8, 14), stone, 5, 3, 13);   // paws
    add(new THREE.BoxGeometry(10, 12, 9), stone, 0, 12, 6);   // head
    add(new THREE.BoxGeometry(14, 6, 3), stone, 0, 16, 5);    // headdress
    add(new THREE.BoxGeometry(4, 3, 2), stone, 0, 11, 10.5);  // nose
    return { mesh: g, radius: 22, height: 20, centreY: 8, collide: 18 };
  }
  if (id === "geyser") {
    add(new THREE.ConeGeometry(6, 2.5, 12), std({ color: 0xd9d2c2 }), 0, 1.2, 0);
    // the eruption: a column of white particles that rises every so often
    const n = 400, geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, transparent: true, opacity: 0.8, depthWrite: false, map: dotTexture(THREE) }));
    pts.frustumCulled = false; g.add(pts);
    const state = { active: false, phase: 0 };
    const period = 150, dur = 24;
    const update = (dt, t) => {
      const cyc = t % period; state.active = cyc < dur; pts.visible = state.active;
      if (!state.active) return;
      const power = Math.sin(Math.min(1, cyc / dur) * Math.PI);
      const a = geo.attributes.position.array;
      for (let i = 0; i < n; i++) {
        const life = ((t * 1.7 + i * 0.37) % 1);
        const h = life * 50 * power;
        a[i * 3] = Math.sin(i * 7.1) * (0.6 + life * 4); a[i * 3 + 1] = 2 + h; a[i * 3 + 2] = Math.cos(i * 3.3) * (0.6 + life * 4);
      }
      geo.attributes.position.needsUpdate = true;
    };
    return { mesh: g, radius: 12, height: 50, centreY: 20, collide: 6, update, active: () => state.active };
  }
  if (id === "hotspring") {
    const geo = new THREE.CircleGeometry(24, 40);
    paintVertexColours(THREE, geo, (x, y) => { const d = Math.hypot(x, y) / 24; return d < 0.45 ? [0.1, 0.5, 0.85] : d < 0.65 ? [0.2, 0.75, 0.6] : d < 0.82 ? [0.9, 0.75, 0.1] : [0.85, 0.35, 0.1]; });
    const m = add(geo, std({ vertexColors: true, roughness: 0.2 }), 0, 0.3, 0); m.rotation.x = -Math.PI / 2;
    return { mesh: g, radius: 24, height: 2, centreY: 0.5, collide: 22 };
  }
  if (id === "oasis") {
    const geo = new THREE.CircleGeometry(22, 32);
    const m = add(geo, std({ color: 0x2f7fa0, roughness: 0.1, transparent: true, opacity: 0.85 }), 0, 0.2, 0); m.rotation.x = -Math.PI / 2;
    return { mesh: g, radius: 24, height: 2, centreY: 0.5, collide: 20 };
  }
  if (id === "iceberg" || id === "iceberg2") {
    const geo = bumpy(THREE, new THREE.DodecahedronGeometry(id === "iceberg" ? 34 : 22, 1), 0.3, id === "iceberg" ? 51 : 52);
    geo.scale(1.5, 0.75, 1);
    const m = add(geo, std({ color: 0xe6f5ff, flatShading: true, roughness: 0.35 }), 0, id === "iceberg" ? 8 : 4, 0);
    return { mesh: g, radius: id === "iceberg" ? 50 : 34, height: 34, centreY: 12, collide: false, lift: 0 };
  }
  return null;
}
