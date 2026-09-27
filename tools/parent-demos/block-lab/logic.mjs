export const MATERIALS = ['moss', 'stone', 'amber'];
export const GRID_SIZE = 8;
export const MAX_HEIGHT = 4;
export const key = (x, y, z) => `${x},${y},${z}`;
export const cell = (x, y, z, material) => ({ x, y, z, material });
export const BEACONS = [[2, 2], [6, 2], [6, 6]];
export const MISSIONS = [
  {
    name: 'Mark the trail', subject: 'Coordinates', icon: '⌖',
    brief: 'The island needs a trail! Put an amber beacon at each map coordinate. Build on layer 1.',
    instruction: 'Across first, then along the numbered grid.',
    targets: BEACONS.map(([x, z]) => cell(x, 1, z, 'amber')),
    success: 'Three pairs, three places! You read each coordinate as across, then along the grid. The trail is ready.',
  },
  {
    name: 'Plant the garden', subject: 'Area · 3 × 4', icon: '▦',
    brief: 'Make a garden that is 3 blocks across and 4 blocks long. Start at (2, 3), and use moss on layer 1.',
    instruction: 'Across: 2–4. Along: 3–6. How many squares will cover it?',
    targets: Array.from({ length: 12 }, (_, i) => cell(2 + i % 3, 1, 3 + Math.floor(i / 3), 'moss')),
    success: 'Your garden covers 12 square blocks: 3 in every row × 4 rows. That is its area. A living garden for our island!',
  },
  {
    name: 'Raise the sun tower', subject: 'Volume · a 2:1 mix', icon: '▥',
    brief: 'Build a solid tower: 2 across × 2 long × 3 high. Use 8 stone blocks and 4 amber blocks.',
    instruction: 'Across: 6–7. Along: 4–5. Layers: 1–3. That is 2 stone for every 1 amber.',
    targets: Array.from({ length: 12 }, (_, i) => cell(6 + i % 2, 1 + Math.floor(i / 4), 4 + Math.floor(i / 2) % 2, i < 8 ? 'stone' : 'amber')),
    success: '12 cubic blocks! Each layer holds 4, and 3 layers make 12. Your 8 stone : 4 amber recipe simplifies to 2 : 1.',
  },
];

export function freshState() {
  return { version: 1, blocks: [], inventory: { moss: 4, stone: 4, amber: 4 }, stage: 0, completed: false, freeplay: false, placements: 0 };
}

export function validCell(x, y, z) {
  return [x, y, z].every(Number.isInteger) && x >= 1 && x <= GRID_SIZE && z >= 1 && z <= GRID_SIZE && y >= 1 && y <= MAX_HEIGHT;
}

// Stored progress is untrusted. Validate sizes, coordinates, materials, duplicates,
// support, and inventory before letting it influence scene creation.
export function restoreState(value) {
  const state = freshState();
  if (!value || value.version !== 1 || !Array.isArray(value.blocks)) return state;
  const seen = new Set();
  for (const block of value.blocks.slice(0, GRID_SIZE * GRID_SIZE * MAX_HEIGHT).sort((a, b) => (a?.y || 0) - (b?.y || 0))) {
    if (!block || !validCell(block.x, block.y, block.z) || !MATERIALS.includes(block.material)) continue;
    const address = key(block.x, block.y, block.z);
    if (seen.has(address) || block.y > 1 && !seen.has(key(block.x, block.y - 1, block.z))) continue;
    seen.add(address);
    state.blocks.push(cell(block.x, block.y, block.z, block.material));
  }
  for (const material of MATERIALS) {
    if (Number.isInteger(value.inventory?.[material])) state.inventory[material] = Math.max(0, Math.min(999, value.inventory[material]));
  }
  state.stage = Number.isInteger(value.stage) ? Math.max(0, Math.min(2, value.stage)) : 0;
  state.completed = value.completed === true;
  if (state.completed) state.stage = 2;
  state.freeplay = state.completed && value.freeplay === true;
  state.placements = Number.isInteger(value.placements) ? Math.max(0, value.placements) : state.blocks.length;
  // Advancing a saved lesson requires the work that preceded it to still exist.
  if (!state.freeplay) {
    for (let stage = 0; stage < state.stage; stage++) {
      if (!assess(stage, state.blocks).complete) { state.stage = stage; state.completed = false; break; }
    }
    if (state.completed && !assess(2, state.blocks).complete) state.completed = false;
  }
  return state;
}

export function assess(stage, blocks) {
  const mission = MISSIONS[stage];
  const map = new Map(blocks.map(block => [key(block.x, block.y, block.z), block]));
  let matched = 0;
  let missing = null;
  for (const target of mission.targets) {
    const actual = map.get(key(target.x, target.y, target.z));
    const good = actual && (stage === 2 ? actual.material === 'stone' || actual.material === 'amber' : actual.material === target.material);
    if (good) matched++; else missing ||= target;
  }
  const zone = stage === 1
    ? blocks.filter(b => b.x >= 2 && b.x <= 4 && b.z >= 3 && b.z <= 6)
    : stage === 2 ? blocks.filter(b => b.x >= 6 && b.x <= 7 && b.z >= 4 && b.z <= 5) : [];
  const extra = zone.find(b => b.y > (stage === 1 ? 1 : 3));
  const stone = stage === 2 ? zone.filter(b => b.y <= 3 && b.material === 'stone').length : 0;
  const amber = stage === 2 ? zone.filter(b => b.y <= 3 && b.material === 'amber').length : 0;
  const total = mission.targets.length;
  const complete = matched === total && !extra && (stage !== 2 || stone === 8 && amber === 4);
  return { matched, total, complete, missing, extra, stone, amber };
}

export function placeBlock(state, x, y, z, material) {
  if (!validCell(x, y, z)) return 'Choose a map square from 1 to 8 and a layer from 1 to 4.';
  if (!MATERIALS.includes(material)) return 'Choose a building material.';
  if (state.blocks.some(b => b.x === x && b.y === y && b.z === z)) return 'There is already a block here. Mine it first, or move up a layer.';
  if (y > 1 && !state.blocks.some(b => b.x === x && b.y === y - 1 && b.z === z)) return 'This block needs support. Build the layer underneath first.';
  if (state.inventory[material] < 1) return `Your ${material} pouch is empty. Gather some from the island supply.`;
  state.blocks.push(cell(x, y, z, material));
  state.inventory[material]--;
  state.placements++;
  return null;
}

export function mineBlock(state, x, y, z) {
  const index = state.blocks.findIndex(b => b.x === x && b.y === y && b.z === z);
  if (index < 0) return 'This square is empty. The island floor stays in place.';
  if (state.blocks.some(b => b.x === x && b.z === z && b.y > y)) return 'Mine from the top down so the tower stays supported.';
  const [block] = state.blocks.splice(index, 1);
  state.inventory[block.material] = Math.min(999, state.inventory[block.material] + 1);
  return null;
}
