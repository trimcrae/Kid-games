// Sudoku's pure rules are shared by the browser and its regression tests.
export const LEVELS = Object.freeze({
  mini: { name: 'Little grid', size: 4, box: 2, clues: 7, singles: true },
  gentle: { name: 'Gentle', size: 9, box: 3, clues: 42, singles: true },
  classic: { name: 'Classic', size: 9, box: 3, clues: 32, singles: true },
  challenge: { name: 'Challenge', size: 9, box: 3, clues: 26, singles: false },
});

function random(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function shuffle(values, rng) {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
export function peers(index, size) {
  const box = Math.sqrt(size), row = Math.floor(index / size), col = index % size;
  const set = new Set();
  for (let k = 0; k < size; k++) {
    set.add(row * size + k);
    set.add(k * size + col);
    set.add((Math.floor(row / box) * box + Math.floor(k / box)) * size + Math.floor(col / box) * box + k % box);
  }
  set.delete(index);
  return [...set];
}
export function candidates(board, index, size) {
  if (board[index]) return [];
  const used = new Set(peers(index, size).map(i => board[i]));
  return Array.from({ length: size }, (_, i) => i + 1).filter(n => !used.has(n));
}
export function conflicts(board, size) {
  return board.flatMap((value, i) => value && peers(i, size).some(j => board[j] === value) ? [i] : []);
}
export function countSolutions(input, size, limit = 2) {
  if (conflicts(input, size).length) return 0;
  const board = [...input];
  let found = 0;
  function visit() {
    let best = -1, choices;
    for (let i = 0; i < board.length; i++) if (!board[i]) {
      const options = candidates(board, i, size);
      if (!options.length) return;
      if (!choices || options.length < choices.length) { best = i; choices = options; }
      if (options.length === 1) break;
    }
    if (best < 0) { found++; return; }
    for (const value of choices) {
      board[best] = value;
      visit();
      if (found >= limit) break;
    }
    board[best] = 0;
  }
  visit();
  return found;
}
export function logicalHint(board, size) {
  const options = board.map((_, i) => candidates(board, i, size));
  for (let i = 0; i < board.length; i++) if (!board[i] && options[i].length === 1) {
    return { index: i, value: options[i][0], reason: 'Look along this row, down this column, and inside this box. They rule out every other number.' };
  }
  const box = Math.sqrt(size), groups = [];
  for (let k = 0; k < size; k++) {
    groups.push(['row', Array.from({ length: size }, (_, c) => k * size + c)]);
    groups.push(['column', Array.from({ length: size }, (_, r) => r * size + k)]);
    groups.push(['box', Array.from({ length: size }, (_, j) => (Math.floor(k / box) * box + Math.floor(j / box)) * size + (k % box) * box + j % box)]);
  }
  for (const [name, indices] of groups) for (let value = 1; value <= size; value++) {
    const places = indices.filter(i => options[i].includes(value));
    if (places.length === 1) return { index: places[0], value, reason: `In this ${name}, this is the only empty square where ${value} can go.` };
  }
  return null;
}
export function solvesWithSingles(input, size) {
  const board = [...input];
  while (board.includes(0)) {
    const hint = logicalHint(board, size);
    if (!hint) return false;
    board[hint.index] = hint.value;
  }
  return conflicts(board, size).length === 0;
}
export function createPuzzle(level = 'mini', seed = 1) {
  if (!Object.hasOwn(LEVELS, level)) throw new Error('Unknown Sudoku level');
  const { size, box, clues, singles } = LEVELS[level];
  const rng = random(seed);
  const range = n => Array.from({ length: n }, (_, i) => i);
  const order = () => shuffle(range(box), rng).flatMap(b => shuffle(range(box), rng).map(r => b * box + r));
  const rows = order(), cols = order(), digits = shuffle(range(size).map(n => n + 1), rng);
  const solution = rows.flatMap(r => cols.map(c => digits[(r * box + Math.floor(r / box) + c) % size]));
  const givens = [...solution];
  let remaining = givens.length;
  for (const index of shuffle(range(givens.length), rng)) {
    if (remaining <= clues) break;
    const value = givens[index];
    givens[index] = 0;
    if (countSolutions(givens, size) !== 1 || singles && !solvesWithSingles(givens, size)) givens[index] = value;
    else remaining--;
  }
  return { level, seed: seed >>> 0, size, box, givens, solution };
}
export function newState(level, seed) {
  const puzzle = createPuzzle(level, seed);
  return { puzzle, board: [...puzzle.givens], notes: Array(puzzle.givens.length).fill(0), selected: puzzle.givens.indexOf(0), hints: 0 };
}
export function isSolved(state) { return state.board.every((n, i) => n === state.puzzle.solution[i]); }
export function serialize(state) {
  return JSON.stringify({ version: 1, level: state.puzzle.level, seed: state.puzzle.seed, board: state.board, notes: state.notes, selected: state.selected, hints: state.hints });
}
export function restore(raw) {
  const data = JSON.parse(raw);
  if (!data || data.version !== 1 || !Object.hasOwn(LEVELS, data.level) || !Number.isInteger(data.seed) || data.seed < 0 || data.seed > 0xffffffff) throw new Error('Unreadable puzzle');
  const state = newState(data.level, data.seed), { size, givens } = state.puzzle;
  if (!Array.isArray(data.board) || data.board.length !== givens.length || !data.board.every((n, i) => Number.isInteger(n) && n >= 0 && n <= size && (!givens[i] || n === givens[i]))) throw new Error('Invalid numbers');
  if (!Array.isArray(data.notes) || data.notes.length !== givens.length || !data.notes.every((n, i) => Number.isInteger(n) && n >= 0 && n < (1 << size) && (!data.board[i] || n === 0))) throw new Error('Invalid notes');
  if (!Number.isInteger(data.selected) || data.selected < 0 || data.selected >= givens.length || !Number.isInteger(data.hints) || data.hints < 0 || data.hints > 1000000) throw new Error('Invalid progress');
  return { ...state, board: [...data.board], notes: [...data.notes], selected: data.selected, hints: data.hints };
}
