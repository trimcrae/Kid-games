import assert from 'node:assert/strict';
import { LEVELS, createPuzzle, countSolutions, candidates, peers, conflicts, logicalHint, solvesWithSingles, newState, serialize, restore, isSolved } from '../games/sudoku/engine.mjs';

// Independent backtracking oracle: no calls to the game's candidates/peers.
function oracle(input, n, limit = 2) {
  const board = [...input], box = Math.sqrt(n); let found = 0;
  function legal(index, value) {
    const row = Math.floor(index / n), col = index % n;
    for (let k = 0; k < n; k++) {
      if (board[row * n + k] === value || board[k * n + col] === value) return false;
      const r = row - row % box + Math.floor(k / box), c = col - col % box + k % box;
      if (board[r * n + c] === value) return false;
    }
    return true;
  }
  function run() {
    let at = -1, best;
    for (let i = 0; i < board.length; i++) if (!board[i]) {
      const choices = Array.from({ length: n }, (_, j) => j + 1).filter(value => legal(i, value));
      if (!choices.length) return;
      if (!best || choices.length < best.length) { at = i; best = choices; }
      if (best.length === 1) break;
    }
    if (at < 0) { found++; return; }
    for (const value of best) { board[at] = value; run(); if (found >= limit) break; }
    board[at] = 0;
  }
  run(); return found;
}
for (const level of Object.keys(LEVELS)) {
  for (const seed of [0, 1, 2, 3, 17, 42, 123, 2026, 98765, 0xffffffff]) {
    const puzzle = createPuzzle(level, seed), { size, box, givens, solution } = puzzle;
    assert.deepEqual(createPuzzle(level, seed), puzzle, 'seeded puzzle is reproducible');
    assert.equal(solution.length, size * size);
    const sorted = Array.from({ length: size }, (_, i) => i + 1).join(',');
    for (let k = 0; k < size; k++) {
      const groups = [solution.slice(k * size, (k + 1) * size), Array.from({ length: size }, (_, r) => solution[r * size + k]),
        Array.from({ length: size }, (_, j) => solution[(Math.floor(k / box) * box + Math.floor(j / box)) * size + k % box * box + j % box])];
      for (const group of groups) assert.equal(group.sort((a,b) => a-b).join(','), sorted, 'all rows, columns, boxes contain the full digit set');
    }
    assert.equal(oracle(givens, size), 1, `${level}/${seed}: independent oracle confirms exactly one solution`);
    assert.equal(countSolutions(givens, size), 1);
    assert.ok(givens.filter(Boolean).length >= LEVELS[level].clues);
    assert.ok(givens.includes(0));
    if (LEVELS[level].singles) {
      assert.ok(solvesWithSingles(givens, size));
      const board = [...givens];
      while (board.includes(0)) {
        const hint = logicalHint(board, size);
        assert.ok(hint); assert.equal(hint.value, solution[hint.index]);
        board[hint.index] = hint.value;
      }
    }
    const state = newState(level, seed), empty = givens.indexOf(0);
    state.notes[empty] = 3;
    assert.deepEqual(restore(serialize(state)), state);
    state.notes[empty] = 0; state.board = [...solution];
    assert.ok(isSolved(state));
    assert.ok(isSolved(restore(serialize(state))));
  }
  console.log(`${level}: ten seeded grids, independent uniqueness, valid rows/columns/boxes, hints and save round trips passed.`);
}
const base = newState('mini', 42), original = JSON.parse(serialize(base));
for (const bad of [null, '{', '{}', '[]', 'true']) assert.throws(() => restore(bad));
for (const patch of [{version:2}, {level:'constructor'}, {seed:-1}, {seed:1.5}, {seed:2**32}, {board:[]}, {notes:[]}, {selected:16}, {hints:-1}]) assert.throws(() => restore(JSON.stringify({...original,...patch})));
for (const field of ['board', 'notes']) {
  for (const value of [null, -1, 1.1, 999, '1']) {
    const copy = structuredClone(original); copy[field][0] = value;
    assert.throws(() => restore(JSON.stringify(copy)));
  }
}
const clue = base.puzzle.givens.findIndex(Boolean), empty = base.puzzle.givens.indexOf(0);
const changedClue = structuredClone(original); changedClue.board[clue] = 0; assert.throws(() => restore(JSON.stringify(changedClue)));
const notedClue = structuredClone(original); notedClue.notes[clue] = 1; assert.throws(() => restore(JSON.stringify(notedClue)));
const duplicate = [...base.puzzle.solution]; duplicate[empty] = duplicate[peers(empty,4)[0]];
assert.ok(conflicts(duplicate,4).length); assert.equal(countSolutions(duplicate,4), 0);
assert.deepEqual(candidates(base.puzzle.givens, clue, 4), []);
assert.equal(new Set(peers(0,9)).size, 20); assert.equal(new Set(peers(0,4)).size, 7);
assert.notDeepEqual(createPuzzle('classic', 11).givens, createPuzzle('classic', 12).givens);
console.log('Sudoku save validation, conflicts, peer geometry and distinct seeds passed.');
