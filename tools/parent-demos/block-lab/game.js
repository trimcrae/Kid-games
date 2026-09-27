import * as THREE from '../../../assets/vendor/three/three.module.min.js';
import { MATERIALS, GRID_SIZE, MAX_HEIGHT, MISSIONS, BEACONS, key, freshState, restoreState, assess, placeBlock, mineBlock } from './logic.mjs';

const $ = id => document.getElementById(id);
const storageKey = 'parent-preview-block-bloom-v1';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let state;
try { state = restoreState(JSON.parse(localStorage.getItem(storageKey))); } catch { state = freshState(); }
let selected = { x: 2, y: 1, z: 2 };
let selectedMaterial = state.stage === 1 ? 'moss' : state.stage === 2 ? 'stone' : 'amber';
let tool = 'build';
let blueprint = false;
let passed = false;
let hintCount = 0;
let renderer, scene, camera, selectionMesh, blueprintGroup, buildGroup, resourceGroup;
let sceneAvailable = false;
let raycaster;
let hitObjects = [];
const builtMeshes = new Map();
const resourceMeshes = [];
const orbit = { angle: 0.70, elevation: 0.86, distance: 19 };
let pendingRender = false;
let particles = [];
let textures = [];
let sharedCube;
let blockMaterials;
const mapButtons = [];

function guide(text) { $('guide-text').textContent = text; }
function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
    $('save-status').textContent = 'Saved on this device only';
  } catch { $('save-status').textContent = 'Storage unavailable · keep this tab open to keep progress'; }
}
function titleCase(word) { return word[0].toUpperCase() + word.slice(1); }
function isProtected(x, z) {
  return !state.freeplay && MISSIONS.slice(0, state.stage).some(m => m.targets.some(b => b.x === x && b.z === z));
}

function updateSelection(x = selected.x, y = selected.y, z = selected.z) {
  selected = { x: Math.max(1, Math.min(GRID_SIZE, Math.round(x) || 1)), y: Math.max(1, Math.min(MAX_HEIGHT, Math.round(y) || 1)), z: Math.max(1, Math.min(GRID_SIZE, Math.round(z) || 1)) };
  $('coord-x').value = selected.x;
  $('coord-y').value = selected.y;
  $('coord-z').value = selected.z;
  $('coordinate-tag').textContent = `ACROSS ${selected.x} · ALONG ${selected.z} · LAYER ${selected.y}`;
  const block = state.blocks.find(b => b.x === selected.x && b.y === selected.y && b.z === selected.z);
  $('selected-description').textContent = `${titleCase(selectedMaterial)} selected · ${block ? `${block.material} here` : 'empty square'}`;
  if (selectionMesh) {
    selectionMesh.position.set(selected.x - 4.5, selected.y - 0.5, selected.z - 4.5);
    selectionMesh.material.color.set(tool === 'mine' ? 0xd6855a : 0xfff2bf);
  }
  updateMap();
  requestRender();
}

function readCoordinateFields(normalize = false) {
  const fields = ['x', 'y', 'z'].map(axis => $(`coord-${axis}`).value.trim());
  const values = fields.map(value => value === '' ? NaN : Number(value));
  // Leave empty or unfinished input untouched while the player is typing.
  // Explicit coordinate actions normalize every displayed field before acting.
  if (!normalize && !values.every((value, index) => Number.isInteger(value) && value >= 1 && value <= (index === 1 ? MAX_HEIGHT : GRID_SIZE))) return;
  updateSelection(...values);
}

function chooseMaterial(material) {
  selectedMaterial = material;
  document.querySelectorAll('[data-material]').forEach(button => {
    const active = button.dataset.material === material;
    button.classList.toggle('selected', active);
    button.setAttribute('aria-pressed', String(active));
  });
  updateSelection();
}

function setTool(next) {
  tool = next;
  for (const mode of ['build', 'mine']) {
    $(`tool-${mode}`).classList.toggle('active', mode === tool);
    $(`tool-${mode}`).setAttribute('aria-pressed', String(mode === tool));
  }
  $('world-help').textContent = `Drag to orbit · click to ${tool} · right-click to mine · scroll to zoom`;
  updateSelection();
}

function gather(material) {
  const before = state.inventory[material];
  state.inventory[material] = Math.min(999, before + 4);
  chooseMaterial(material);
  guide(`You gathered ${state.inventory[material] - before} ${material} blocks. Your pouch now holds ${state.inventory[material]}. The island supply grows back, so there is always enough.`);
  updateInventory();
  save();
  const source = resourceMeshes.find(m => m.userData.resource === material);
  if (source) burst(source.position, material, 8);
}

function build() {
  if (state.completed && !state.freeplay) { state.freeplay = true; showMission(); }
  if (isProtected(selected.x, selected.z)) { guide('This square belongs to a finished mission. Keep it safe for now; all blocks unlock after the sun tower is finished.'); return; }
  const error = placeBlock(state, selected.x, selected.y, selected.z, selectedMaterial);
  if (error) { guide(error); return; }
  if (sceneAvailable) {
    addBuiltMesh(state.blocks[state.blocks.length - 1]);
    burst(new THREE.Vector3(selected.x - 4.5, selected.y - 0.3, selected.z - 4.5), selectedMaterial, 5);
  }
  afterEdit();
  const result = assess(state.stage, state.blocks);
  if (result.complete && !state.completed) guide('Your build looks ready! Press “Check my build” to explain what you made and finish this mission.');
  else if (state.freeplay) guide(`Placed ${selectedMaterial} at (${selected.x}, ${selected.z}), layer ${selected.y}. Your whole island is yours to reshape!`);
  else guide(`Placed ${selectedMaterial} at (${selected.x}, ${selected.z}), layer ${selected.y}. ${result.matched} of ${result.total} mission spaces filled.`);
}

function mine() {
  if (state.completed && !state.freeplay) { state.freeplay = true; showMission(); }
  if (isProtected(selected.x, selected.z)) { guide('That block is part of a completed mission. Finish the tower to unlock free building and reshape anything.'); return; }
  const original = state.blocks.find(b => b.x === selected.x && b.y === selected.y && b.z === selected.z);
  const error = mineBlock(state, selected.x, selected.y, selected.z);
  if (error) { guide(error); return; }
  if (sceneAvailable) {
    const mesh = builtMeshes.get(key(selected.x, selected.y, selected.z));
    if (mesh) { buildGroup.remove(mesh); builtMeshes.delete(key(selected.x, selected.y, selected.z)); }
    rebuildHitObjects();
    burst(new THREE.Vector3(selected.x - 4.5, selected.y - 0.5, selected.z - 4.5), original.material, 8);
  }
  guide(`Mined one ${original.material} block. It is back in your pouch—trying a new idea costs nothing.`);
  afterEdit();
}

function afterEdit() {
  if (passed && !assess(state.stage, state.blocks).complete) {
    passed = false;
    $('check-build').innerHTML = 'Check my build <span>→</span>';
  }
  updateInventory();
  updateProgress();
  updateSelection();
  updateBlueprint();
  save();
}

function updateInventory() { for (const material of MATERIALS) $(`count-${material}`).textContent = state.inventory[material]; }

function updateProgress() {
  const result = assess(state.stage, state.blocks);
  $('progress-label').textContent = state.stage === 2 ? `${result.stone} stone + ${result.amber} amber` : `${result.matched} ${state.stage === 0 ? 'beacons' : 'garden squares'} in place`;
  $('progress-fraction').textContent = `${result.matched} / ${result.total}`;
  $('progress-fill').style.width = `${100 * result.matched / result.total}%`;
  if (state.stage === 0) {
    document.querySelectorAll('.coordinate-chip').forEach((button, index) => {
      const [x, z] = BEACONS[index];
      button.classList.toggle('done', state.blocks.some(b => b.x === x && b.z === z && b.y === 1 && b.material === 'amber'));
    });
  }
}

function showMission() {
  const mission = MISSIONS[state.stage];
  $('mission-number').textContent = state.completed ? '03 / 03' : `0${state.stage + 1} / 03`;
  $('mission-title').textContent = state.freeplay ? 'Your island, your ideas' : mission.name;
  $('mission-subject').textContent = state.freeplay ? 'Free building · all blocks unlocked' : mission.subject;
  $('mission-icon').textContent = state.freeplay ? '✦' : mission.icon;
  $('mission-brief').textContent = state.freeplay ? 'Build a bridge, plant a forest, or invent a new tower. Can you make a 24-block structure two different ways?' : mission.brief;
  $('mission-instruction').textContent = state.freeplay ? 'Try changing the shape while keeping the same number of blocks. What stays the same? What changes?' : mission.instruction;
  const detail = $('mission-detail');
  detail.replaceChildren();
  if (state.stage === 0 && !state.freeplay) {
    for (const [x, z] of BEACONS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'coordinate-chip';
      button.textContent = `(${x}, ${z})`;
      button.title = `Select across ${x}, along ${z}, layer 1`;
      button.addEventListener('click', () => updateSelection(x, 1, z));
      detail.append(button);
    }
  } else if (!state.freeplay) {
    detail.innerHTML = state.stage === 1
      ? '<div class="dimension-card">3 × 4<small>ACROSS × ALONG</small></div><div class="dimension-card">12<small>SQUARE BLOCKS</small></div>'
      : '<div class="dimension-card">2 × 2 × 3<small>ACROSS × ALONG × HIGH</small></div><div class="dimension-card">8 : 4<small>STONE : AMBER</small></div>';
  }
  document.querySelectorAll('.mission-steps li').forEach((li, index) => {
    const done = index < state.stage || state.completed;
    li.classList.toggle('done', done);
    li.classList.toggle('current', index === state.stage && !state.completed);
    if (index === state.stage && !state.completed) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    li.querySelector('span').textContent = done ? '✓' : index + 1;
  });
  document.querySelector('.mission-panel').classList.toggle('finished', state.completed && !state.freeplay);
  $('completion').hidden = !state.completed || state.freeplay;
  $('check-build').hidden = state.freeplay;
  $('hint').hidden = state.freeplay;
  $('check-build').innerHTML = 'Check my build <span>→</span>';
  if (state.freeplay) guide('You have earned your architect badge. All finished builds are unlocked, and there is always more material in the island supply.');
  else if (state.completed) guide(mission.success);
  else if (state.stage === 0) guide('Pick amber, then build the three trail markers. You have four of every material to begin!');
  else if (state.stage === 1) guide('Think in rows: three moss blocks in each row, with four rows altogether. Your trail markers will stay safe while you work.');
  else guide('Build from the ground up. Two stone layers and one amber layer make the recipe, or invent another arrangement with the same mix.');
  updateProgress();
  updateBlueprint();
  updateMap();
}

function checkBuild() {
  if (state.freeplay) return;
  if (passed) {
    state.stage++;
    passed = false;
    hintCount = 0;
    chooseMaterial(state.stage === 1 ? 'moss' : 'stone');
    const first = MISSIONS[state.stage].targets[0];
    updateSelection(first.x, first.y, first.z);
    showMission();
    save();
    return;
  }
  const result = assess(state.stage, state.blocks);
  if (result.extra) {
    const b = result.extra;
    guide(`You have an extra layer at (${b.x}, ${b.z}). ${state.stage === 1 ? 'A garden is one layer high: we are measuring flat area.' : 'This tower should be exactly three layers high.'} Mine the top block and check again.`);
    updateSelection(b.x, b.y, b.z);
    return;
  }
  if (result.missing) {
    const b = result.missing;
    const existing = state.blocks.find(actual => actual.x === b.x && actual.y === b.y && actual.z === b.z);
    guide(`${existing ? `There is ${existing.material} where we need ${state.stage === 2 ? 'stone or amber' : b.material}.` : 'There is still a space to fill.'} Look at (${b.x}, ${b.z}), layer ${b.y}. ${result.matched} of ${result.total} mission spaces are ready.`);
    updateSelection(b.x, b.y, b.z);
    return;
  }
  if (!result.complete) {
    guide(`The tower shape is right! Now check its recipe: you used ${result.stone} stone and ${result.amber} amber. We need 8 stone and 4 amber—two stone for every amber.`);
    return;
  }
  guide(MISSIONS[state.stage].success);
  if (state.stage === 2) {
    state.completed = true;
    showMission();
    if (sceneAvailable) burst(new THREE.Vector3(2, 3.8, 0), 'amber', 55);
  } else {
    passed = true;
    $('check-build').innerHTML = `Next: ${MISSIONS[state.stage + 1].name} <span>→</span>`;
    if (sceneAvailable) burst(new THREE.Vector3(0, 2, 0), state.stage === 0 ? 'amber' : 'moss', 28);
  }
  save();
}

function showHint() {
  hintCount++;
  const hints = [
    ['Coordinates are an address. In (6, 2), move 6 across (X), then 2 along (Z). Choose amber and layer 1.', 'Tap a coordinate on this card to select that exact square. Press Place, or use the map below.', 'Turn on “Show blueprint” to see the three marker locations. Gather +4 amber if your pouch is empty.'],
    ['Start at (2, 3). Put moss at (2, 3), (3, 3), and (4, 3). That is your first row of three.', 'Repeat that row at along 4, 5, and 6. Four rows of three cover 12 squares.', 'Keep every garden block on layer 1. A second layer measures height; this mission is about flat area.'],
    ['Each layer is four blocks: (6, 4), (7, 4), (6, 5), and (7, 5). Start on layer 1.', 'One easy recipe: stone on layers 1 and 2, then amber on layer 3. That makes 8 stone and 4 amber.', 'The complete shape holds 2 × 2 × 3 = 12 blocks. Eight stone divided by four amber is 2—your mix is 2 to 1.'],
  ];
  guide(hints[state.stage][Math.min(2, hintCount - 1)]);
  if (hintCount >= 2 && !blueprint) toggleBlueprint();
}

function toggleBlueprint() {
  blueprint = !blueprint;
  $('blueprint').setAttribute('aria-pressed', String(blueprint));
  $('blueprint').textContent = blueprint ? '◆ Hide blueprint' : '◇ Show blueprint';
  updateBlueprint();
  updateMap();
}

function createMap() {
  for (let z = 1; z <= GRID_SIZE; z++) {
    for (let x = 1; x <= GRID_SIZE; x++) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${x},${z}`;
      button.addEventListener('click', () => updateSelection(x, selected.y, z));
      mapButtons.push({ button, x, z });
      $('map-grid').append(button);
    }
  }
}
function updateMap() {
  const map = new Map(state.blocks.map(b => [key(b.x, b.y, b.z), b]));
  for (const { button, x, z } of mapButtons) {
    const block = map.get(key(x, selected.y, z));
    const target = blueprint && !state.freeplay && MISSIONS[state.stage].targets.some(b => b.x === x && b.z === z && b.y === selected.y);
    const active = selected.x === x && selected.z === z;
    button.dataset.block = block?.material || '';
    button.classList.toggle('selected', active);
    button.classList.toggle('target', Boolean(target));
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', `Across ${x}, along ${z}, layer ${selected.y}: ${block ? block.material : 'empty'}${target ? ', mission target' : ''}`);
  }
  $('map-caption').textContent = `Map shows layer ${selected.y}. Select a square, then Place or Mine.`;
}

// Original procedural textures and simple voxel geometry; no franchise assets.
function pixelTexture(base, flecks, seed) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 32;
  const context = canvas.getContext('2d');
  context.fillStyle = base; context.fillRect(0, 0, 32, 32);
  let n = seed;
  const random = () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; };
  for (let i = 0; i < 85; i++) {
    context.fillStyle = flecks[Math.floor(random() * flecks.length)];
    const size = Math.floor(random() * 3) + 1;
    context.fillRect(Math.floor(random() * 16) * 2, Math.floor(random() * 16) * 2, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter; texture.minFilter = THREE.NearestFilter; texture.colorSpace = THREE.SRGBColorSpace;
  textures.push(texture);
  return texture;
}

function makeMaterial(color, options = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 1, ...options }); }
function cube(x, y, z, sx, sy, sz, material, parent = scene) {
  const mesh = new THREE.Mesh(sharedCube, material);
  mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function label(text, x, y, z, scale = 0.8, ink = '#eaf4d9', background = null) {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 96;
  const context = canvas.getContext('2d');
  if (background) { context.fillStyle = background; context.roundRect(5, 5, 246, 86, 14); context.fill(); }
  context.font = 'bold 38px system-ui'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillStyle = ink; context.fillText(text, 128, 50);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: true, transparent: true }));
  sprite.position.set(x, y, z); sprite.scale.set(scale * 2.66, scale, 1); scene.add(sprite); return sprite;
}

function makeIsland() {
  const dirtTexture = pixelTexture('#8d785d', ['#7e6d53', '#a18a6b', '#897452'], 6);
  const stoneTexture = pixelTexture('#a1b2ad', ['#b5c1b9', '#8ea39d', '#a9bbb1'], 12);
  const mossTexture = pixelTexture('#90b264', ['#a8c87a', '#83a458', '#9cbd6f'], 7);
  const amberTexture = pixelTexture('#e0b65c', ['#f1d483', '#cda147', '#ecca70'], 10);
  const dirt = makeMaterial(0xffffff, { map: dirtTexture });
  const grass = makeMaterial(0xffffff, { map: mossTexture });
  const stone = makeMaterial(0xffffff, { map: stoneTexture });
  const amber = makeMaterial(0xffffff, { map: amberTexture, emissive: 0x88621e, emissiveIntensity: 0.09 });
  blockMaterials = { moss: [dirt, dirt, grass, dirt, dirt, dirt], stone, amber };
  const islandTop = makeMaterial(0x75935b);
  const islandSide = makeMaterial(0x887350);
  const islandBottom = makeMaterial(0x627a67);
  // A stepped, suspended island with an uninterrupted, readable 8-by-8 plot.
  cube(-0.5, -0.85, 0, 14, 1.5, 12, [islandSide, islandSide, islandTop, islandSide, islandSide, islandSide]);
  cube(-0.3, -1.95, -0.3, 11.9, 0.9, 10.5, islandBottom);
  cube(-0.5, -2.65, -0.2, 9.8, 0.55, 8.8, makeMaterial(0x607966));
  cube(-1.0, -3.12, -0.3, 7.2, 0.5, 6.8, makeMaterial(0x58715f));
  const floorA = makeMaterial(0xb7c994); const floorB = makeMaterial(0xb0c18c);
  for (let x = 1; x <= 8; x++) for (let z = 1; z <= 8; z++) {
    const tile = cube(x - 4.5, -0.065, z - 4.5, 0.97, 0.15, 0.97, (x + z) % 2 ? floorA : floorB);
    tile.userData = { ground: true, x, z }; hitObjects.push(tile);
  }
  const rim = makeMaterial(0x566d4e);
  cube(0, 0.015, -4.06, 8.2, 0.15, 0.12, rim); cube(0, 0.015, 4.06, 8.2, 0.15, 0.12, rim);
  cube(-4.06, 0.015, 0, 0.12, 0.15, 8.2, rim); cube(4.06, 0.015, 0, 0.12, 0.15, 8.2, rim);
  for (let i = 1; i <= 8; i++) {
    label(String(i), i - 4.5, 0.17, 4.47, 0.32, '#39513c');
    label(String(i), -4.45, 0.17, i - 4.5, 0.32, '#39513c');
  }
  label('ACROSS →', 0, -0.08, 5.18, 0.43, '#e7f0d3', '#56724a');
  const bark = makeMaterial(0x866d4d), leaves = makeMaterial(0x527d50), tips = makeMaterial(0x81a368);
  function tree(x, z, height = 1) {
    cube(x, 0.55 * height, z, 0.34 * height, 1.2 * height, 0.34 * height, bark);
    cube(x, 1.32 * height, z, 1.7 * height, 0.7 * height, 1.7 * height, leaves);
    cube(x, 1.87 * height, z, 1.28 * height, 0.6 * height, 1.28 * height, leaves);
    cube(x, 2.34 * height, z, 0.78 * height, 0.5 * height, 0.78 * height, tips);
  }
  tree(-5.45, -4.35, 1.0); tree(-3.6, -5.06, 0.77); tree(4.85, -4.68, 1.15); tree(5.38, 3.48, 0.8);
  const water = makeMaterial(0x70bdbb, { roughness: 0.4, transparent: true, opacity: 0.88 });
  cube(5.35, -0.025, -0.55, 1.5, 0.08, 4.3, water);
  cube(5.7, -0.1, 1.45, 0.75, 0.12, 1, water);
  cube(5.8, -1.35, 2.0, 0.65, 2.4, 0.12, makeMaterial(0x99d7cf, { transparent: true, opacity: 0.65 }));
  const path = makeMaterial(0xc0ad7c);
  for (let i = 0; i < 7; i++) cube(-5.42, 0, -2.2 + i * 0.75, 0.77, 0.06, 0.57, path);
  // Three harvestable voxel deposits, matched to the accessible supply buttons.
  for (const [index, material] of MATERIALS.entries()) {
    const z = -2.45 + index * 2.25;
    const group = new THREE.Group(); resourceGroup.add(group);
    const main = cube(-6.15, 0.39, z, 0.82, 0.82, 0.82, blockMaterials[material], group);
    main.userData = { resource: material }; resourceMeshes.push(main);
    const side = cube(-6.55, 0.18, z + 0.4, 0.5, 0.5, 0.5, blockMaterials[material], group);
    side.userData = { resource: material }; resourceMeshes.push(side);
    const top = cube(-6.0, 0.88, z, 0.47, 0.35, 0.47, blockMaterials[material], group);
    top.userData = { resource: material }; resourceMeshes.push(top);
    label(material.toUpperCase(), -6.3, 1.36, z, 0.28, '#35523e', '#f2f4dfee');
  }
  // Small, original meadow details keep the world friendly without hiding cells.
  const flowerStem = makeMaterial(0x647d4b), flowerPetals = [makeMaterial(0xe7c966), makeMaterial(0xf5e6b4), makeMaterial(0xb68d91)];
  for (let i = 0; i < 18; i++) {
    const x = i < 10 ? -3.7 + i * 0.77 : 4.5 + (i % 3) * 0.45;
    const z = i < 10 ? -5.1 + (i % 2) * 0.2 : -3.4 + (i - 10) * 0.77;
    cube(x, 0.13, z, 0.055, 0.32, 0.055, flowerStem);
    cube(x, 0.32, z, 0.18, 0.1, 0.18, flowerPetals[i % 3]);
  }
  const wood = makeMaterial(0xa48758);
  cube(3.8, 0.46, -5.28, 0.1, 0.92, 0.1, bark);
  cube(3.8, 0.95, -5.28, 1.3, 0.58, 0.1, wood);
  label('SUNSEED', 3.8, 0.98, -5.15, 0.21, '#f7efcf');
  const cloudMaterial = makeMaterial(0xffffff, { transparent: true, opacity: 0.86 });
  for (const [x, y, z, scale] of [[-12, 2.7, -11, 1], [7, 5, -13, 0.85], [12, 0, 8, 0.8], [-11, -1, 9, 0.75]]) {
    cube(x, y, z, 3.7 * scale, 0.55 * scale, 1.4 * scale, cloudMaterial);
    cube(x - 0.5, y + 0.37 * scale, z, 1.8 * scale, 0.4 * scale, 1.2 * scale, cloudMaterial);
  }
  const selectionEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.035, 1.035, 1.035));
  selectionMesh = new THREE.LineSegments(selectionEdges, new THREE.LineBasicMaterial({ color: 0xfff2bf, depthTest: false, transparent: true, opacity: 0.95 }));
  selectionMesh.renderOrder = 8; scene.add(selectionMesh);
  for (const block of state.blocks) addBuiltMesh(block);
  rebuildHitObjects();
}

function addBuiltMesh(block) {
  const mesh = cube(block.x - 4.5, block.y - 0.5, block.z - 4.5, 0.97, 0.97, 0.97, blockMaterials[block.material], buildGroup);
  mesh.userData = { block: true, x: block.x, y: block.y, z: block.z, material: block.material };
  builtMeshes.set(key(block.x, block.y, block.z), mesh);
  rebuildHitObjects();
}
function rebuildHitObjects() { hitObjects = [...hitObjects.filter(o => o.userData.ground), ...builtMeshes.values(), ...resourceMeshes]; }

function updateBlueprint() {
  if (!sceneAvailable) return;
  for (const object of [...blueprintGroup.children]) { blueprintGroup.remove(object); object.geometry.dispose(); object.material.dispose(); }
  if (blueprint && !state.freeplay) {
    const map = new Map(state.blocks.map(b => [key(b.x, b.y, b.z), b]));
    for (const target of MISSIONS[state.stage].targets) {
      if (map.has(key(target.x, target.y, target.z))) continue;
      const geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.92, 0.92, 0.92));
      const wire = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: target.material === 'amber' ? 0xe2a232 : target.material === 'moss' ? 0x5b8637 : 0x728f91, transparent: true, opacity: 0.72 }));
      wire.position.set(target.x - 4.5, target.y - 0.5, target.z - 4.5); blueprintGroup.add(wire);
    }
  }
  requestRender();
}

function initScene() {
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.17;
    $('viewport').append(renderer.domElement);
    scene = new THREE.Scene(); scene.background = new THREE.Color(0xbce0e3); scene.fog = new THREE.Fog(0xbce0e3, 30, 70);
    sharedCube = new THREE.BoxGeometry(1, 1, 1);
    camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    scene.add(new THREE.HemisphereLight(0xe9fcff, 0x7f9070, 2.7));
    const sun = new THREE.DirectionalLight(0xfff1cc, 3.3); sun.position.set(-8, 16, 9); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -12; sun.shadow.camera.right = 12; sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -12;
    sun.shadow.normalBias = 0.035; sun.shadow.bias = -0.0002; scene.add(sun);
    const fill = new THREE.DirectionalLight(0xbfe0ff, 0.7); fill.position.set(9, 5, -8); scene.add(fill);
    buildGroup = new THREE.Group(); blueprintGroup = new THREE.Group(); resourceGroup = new THREE.Group();
    scene.add(buildGroup, blueprintGroup, resourceGroup);
    raycaster = new THREE.Raycaster();
    sceneAvailable = true;
    makeIsland();
    updateCamera();
    new ResizeObserver(resizeScene).observe($('viewport'));
    resizeScene();
    renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); sceneAvailable = false; $('renderer-notice').hidden = false; });
    renderer.domElement.addEventListener('webglcontextrestored', () => { sceneAvailable = true; $('renderer-notice').hidden = true; requestRender(); });
  } catch (error) {
    sceneAvailable = false;
    $('renderer-notice').hidden = false;
    $('world-help').textContent = 'Open the map below, or build with the coordinate controls.';
    document.querySelector('.map-details').open = true;
    console.warn('Block & Bloom: 3D view unavailable; coordinate building remains available.', error.message);
  }
}

function updateCamera() {
  if (!sceneAvailable) return;
  const distance = orbit.distance * Math.max(1, 1.22 / camera.aspect);
  const horizontal = Math.cos(orbit.elevation) * distance;
  camera.position.set(Math.sin(orbit.angle) * horizontal - 0.7, Math.sin(orbit.elevation) * distance + 0.3, Math.cos(orbit.angle) * horizontal);
  camera.lookAt(-0.7, 0.35, 0);
  requestRender();
}
function resizeScene() {
  if (!sceneAvailable) return;
  const rect = $('viewport').getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  renderer.setSize(rect.width, rect.height, false);
  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();
  updateCamera();
}
function resetView() { Object.assign(orbit, { angle: 0.70, elevation: 0.86, distance: 19 }); updateCamera(); }
function requestRender() {
  if (!sceneAvailable || pendingRender || document.hidden) return;
  pendingRender = true;
  requestAnimationFrame(renderFrame);
}
let lastFrame = 0;
function renderFrame(now) {
  pendingRender = false;
  if (!sceneAvailable || document.hidden) return;
  const dt = Math.min((now - lastFrame) / 1000, 0.04); lastFrame = now;
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    particle.life -= dt; particle.velocity.y -= dt * 3.4;
    particle.mesh.position.addScaledVector(particle.velocity, dt);
    particle.mesh.rotation.x += dt * 2; particle.mesh.rotation.z += dt;
    particle.mesh.scale.setScalar(Math.max(0, particle.life / particle.maxLife) * particle.size);
    if (particle.life <= 0) { scene.remove(particle.mesh); particle.mesh.material.dispose(); particles.splice(i, 1); }
  }
  renderer.render(scene, camera);
  if (particles.length) requestRender();
}
function burst(position, material, count) {
  if (!sceneAvailable || reducedMotion) { requestRender(); return; }
  const colors = { moss: 0xa2c779, stone: 0xbbcfc5, amber: 0xf0c567 };
  while (particles.length > 100 - count) { const old = particles.shift(); scene.remove(old.mesh); old.mesh.material.dispose(); }
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(sharedCube, makeMaterial(colors[material])); mesh.position.copy(position); scene.add(mesh);
    const life = 0.55 + Math.random() * 0.65, size = 0.08 + Math.random() * 0.07;
    mesh.scale.setScalar(size);
    particles.push({ mesh, life, maxLife: life, size, velocity: new THREE.Vector3((Math.random() - 0.5) * 2.4, 1.2 + Math.random() * 2.2, (Math.random() - 0.5) * 2.4) });
  }
  requestRender();
}

function pick(event, forceMine = false) {
  if (!sceneAvailable) return;
  const rect = $('viewport').getBoundingClientRect();
  const pointer = new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(hitObjects, false)[0];
  if (!hit) return;
  const data = hit.object.userData;
  if (data.resource) { gather(data.resource); return; }
  const action = forceMine ? 'mine' : tool;
  if (data.ground) {
    updateSelection(data.x, 1, data.z);
  } else if (data.block) {
    if (action === 'mine') updateSelection(data.x, data.y, data.z);
    else {
      const normal = hit.face.normal;
      const next = { x: data.x + Math.round(normal.x), y: data.y + Math.round(normal.y), z: data.z + Math.round(normal.z) };
      if (next.x < 1 || next.x > 8 || next.z < 1 || next.z > 8 || next.y < 1 || next.y > 4) { guide('Build inside the 8 by 8 map, up to 4 layers high.'); return; }
      updateSelection(next.x, next.y, next.z);
    }
  }
  if (action === 'mine') mine(); else build();
}

function wireEvents() {
  document.querySelectorAll('[data-material]').forEach(button => button.addEventListener('click', () => chooseMaterial(button.dataset.material)));
  document.querySelectorAll('[data-gather]').forEach(button => button.addEventListener('click', () => gather(button.dataset.gather)));
  $('place').addEventListener('click', () => { readCoordinateFields(true); build(); });
  $('mine').addEventListener('click', () => { readCoordinateFields(true); mine(); });
  $('tool-build').addEventListener('click', () => setTool('build')); $('tool-mine').addEventListener('click', () => setTool('mine'));
  $('blueprint').addEventListener('click', toggleBlueprint); $('check-build').addEventListener('click', checkBuild); $('hint').addEventListener('click', showHint);
  for (const axis of ['x', 'y', 'z']) {
    $(`coord-${axis}`).addEventListener('input', () => readCoordinateFields());
    $(`coord-${axis}`).addEventListener('change', () => readCoordinateFields(true));
  }
  $('orbit-left').addEventListener('click', () => { orbit.angle -= Math.PI / 6; updateCamera(); });
  $('orbit-right').addEventListener('click', () => { orbit.angle += Math.PI / 6; updateCamera(); });
  $('reset-view').addEventListener('click', resetView);
  $('free-build').addEventListener('click', () => { state.freeplay = true; showMission(); save(); });
  $('restart').addEventListener('click', () => $('restart-dialog').showModal());
  $('cancel-restart').addEventListener('click', () => $('restart-dialog').close());
  $('confirm-restart').addEventListener('click', () => {
    state = freshState(); passed = false; hintCount = 0;
    if (sceneAvailable) { for (const mesh of builtMeshes.values()) buildGroup.remove(mesh); builtMeshes.clear(); rebuildHitObjects(); }
    if (blueprint) toggleBlueprint();
    chooseMaterial('amber'); setTool('build'); updateSelection(2, 1, 2); showMission(); updateInventory(); resetView(); save(); $('restart-dialog').close();
  });
  const viewport = $('viewport');
  let gesture = null;
  viewport.addEventListener('pointerdown', event => {
    if (event.button !== 0 && event.button !== 2) return;
    viewport.focus({ preventScroll: true });
    gesture = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, dragged: false, button: event.button };
    viewport.setPointerCapture(event.pointerId);
  });
  viewport.addEventListener('pointermove', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > 7) gesture.dragged = true;
    if (gesture.dragged) {
      orbit.angle -= (event.clientX - gesture.x) * 0.008;
      orbit.elevation = Math.min(1.32, Math.max(0.42, orbit.elevation + (event.clientY - gesture.y) * 0.006));
      updateCamera();
    }
    gesture.x = event.clientX; gesture.y = event.clientY;
  });
  viewport.addEventListener('pointerup', event => {
    if (!gesture || gesture.id !== event.pointerId) return;
    if (!gesture.dragged) pick(event, gesture.button === 2);
    gesture = null;
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
  });
  viewport.addEventListener('pointercancel', () => { gesture = null; });
  viewport.addEventListener('lostpointercapture', () => { gesture = null; });
  viewport.addEventListener('contextmenu', event => event.preventDefault());
  viewport.addEventListener('wheel', event => { event.preventDefault(); orbit.distance = Math.min(28, Math.max(12, orbit.distance + Math.sign(event.deltaY) * 0.8)); updateCamera(); }, { passive: false });
  viewport.addEventListener('keydown', event => {
    const keyName = event.key.toLowerCase();
    const movement = { arrowleft: [-1, 0, 0], arrowright: [1, 0, 0], arrowup: [0, 0, -1], arrowdown: [0, 0, 1], pageup: [0, 1, 0], pagedown: [0, -1, 0] };
    if (movement[keyName]) { event.preventDefault(); const [dx, dy, dz] = movement[keyName]; updateSelection(selected.x + dx, selected.y + dy, selected.z + dz); }
    else if (keyName === ' ') { event.preventDefault(); if (!event.repeat) build(); }
    else if (keyName === 'm') { event.preventDefault(); if (!event.repeat) mine(); }
    else if (['1', '2', '3'].includes(keyName)) { event.preventDefault(); chooseMaterial(MATERIALS[Number(keyName) - 1]); }
    else if (keyName === 'q' || keyName === 'e') { event.preventDefault(); orbit.angle += keyName === 'q' ? -0.12 : 0.12; updateCamera(); }
    else if (['+', '=', '-'].includes(keyName)) { event.preventDefault(); orbit.distance = Math.max(12, Math.min(28, orbit.distance + (keyName === '-' ? 0.5 : -0.5))); updateCamera(); }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) requestRender(); });
}

createMap();
wireEvents();
initScene();
chooseMaterial(selectedMaterial);
if (state.stage > 0) { const start = MISSIONS[state.stage].targets[0]; updateSelection(start.x, start.y, start.z); }
showMission();
updateInventory();
save();
