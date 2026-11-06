import { LEVELS, newState, restore, serialize, isSolved, peers, conflicts, logicalHint } from './engine.mjs';

const $ = id => document.getElementById(id);
const players = ['jeannie', 'cory', 'shannon', 'tristan'];
const sessions = new Map();
let player = 'jeannie', state, history = [], noteMode = false, marked = [], pendingHint = null;
let savedRaw = null, saveBlocked = false, saveWarning = '', pendingLevel = null;
const key = () => `mcrae.sudoku.v1.${player}`;
const freshSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];
function say(text) { $('message').textContent = text; }
function showSave() {
  $('save-status').textContent = saveWarning || `Saved on this device for ${$('player').selectedOptions[0].textContent}.`;
  $('save-status').classList.toggle('warning', !!saveWarning);
}
function save() {
  if (!saveBlocked) {
    try {
      if (localStorage.getItem(key()) !== savedRaw) {
        saveBlocked = true;
        saveWarning = 'This puzzle changed in another tab. Reload to see that save. Your moves here will not overwrite it.';
      } else {
        const raw = serialize(state);
        localStorage.setItem(key(), raw);
        savedRaw = raw;
        saveWarning = '';
      }
    } catch (_) { saveWarning = 'Saving is unavailable. You can keep playing, but keep this tab open to keep your progress.'; }
  }
  showSave();
}
function loadPlayer() {
  history = []; noteMode = false; marked = []; pendingHint = null; saveBlocked = false; saveWarning = ''; savedRaw = null;
  let loaded = false;
  try {
    savedRaw = localStorage.getItem(key());
    if (savedRaw !== null) { state = restore(savedRaw); loaded = true; }
  } catch (_) {
    saveBlocked = true;
    saveWarning = savedRaw !== null
      ? 'This saved puzzle could not be read, so it is kept untouched. Play here without saving, or choose New puzzle to replace it.'
      : 'Saved puzzles could not be read. You can play here, but progress will not be saved.';
  }
  if (!loaded) state = newState(player === 'shannon' || player === 'tristan' ? 'classic' : 'mini', freshSeed());
  $('level').value = state.puzzle.level;
  buildBoard(); render(); save();
  say(loaded ? 'Welcome back. Your puzzle is just as you left it.' : 'Start with a row, column or box that has only a few empty squares.');
}
function buildBoard() {
  const { size, box } = state.puzzle;
  const board = $('board');
  board.replaceChildren(); board.style.setProperty('--size', size); board.style.setProperty('--box', box);
  board.classList.toggle('mini', size === 4);
  for (let i = 0; i < size * size; i++) {
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.index = i;
    button.addEventListener('click', () => select(i));
    button.addEventListener('keydown', onKey);
    board.append(button);
  }
  $('keypad').replaceChildren();
  $('keypad').style.gridTemplateColumns = `repeat(${size === 4 ? 4 : 5}, 1fr)`;
  for (let n = 1; n <= size; n++) {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = n; button.dataset.value = n;
    button.setAttribute('aria-label', `Enter ${n}`);
    button.addEventListener('click', () => enter(n));
    $('keypad').append(button);
  }
}
function render() {
  const { size, box, givens } = state.puzzle, selectedValue = state.board[state.selected];
  const related = new Set(peers(state.selected, size)), duplicates = new Set(conflicts(state.board, size));
  [...$('board').children].forEach((button, i) => {
    const row = Math.floor(i / size), col = i % size, value = state.board[i];
    button.className = [
      givens[i] ? 'given' : '', related.has(i) ? 'peer' : '',
      selectedValue && value === selectedValue ? 'matching' : '', i === state.selected ? 'selected' : '',
      duplicates.has(i) ? 'conflict' : '', marked.includes(i) ? 'wrong' : '',
      col % box === box - 1 ? 'box-right' : '', row % box === box - 1 ? 'box-bottom' : '',
      col === size - 1 ? 'last-col' : '', row === size - 1 ? 'last-row' : '',
    ].filter(Boolean).join(' ');
    button.tabIndex = i === state.selected ? 0 : -1;
    button.setAttribute('aria-pressed', String(i === state.selected));
    const notes = Array.from({ length: size }, (_, n) => n + 1).filter(n => state.notes[i] & (1 << (n - 1)));
    button.setAttribute('aria-label', `Row ${row + 1}, column ${col + 1}, ${value ? `${value}${givens[i] ? ', fixed clue' : ''}` : 'empty'}${notes.length ? `, notes ${notes.join(', ')}` : ''}${duplicates.has(i) ? ', repeated number' : ''}${marked.includes(i) ? ', check this number' : ''}`);
    button.replaceChildren();
    if (value) button.textContent = value;
    else if (notes.length) {
      const pencil = document.createElement('span'); pencil.className = 'pencil'; pencil.setAttribute('aria-hidden', 'true');
      for (let n = 1; n <= size; n++) { const digit = document.createElement('span'); digit.textContent = notes.includes(n) ? n : ''; pencil.append(digit); }
      button.append(pencil);
    }
  });
  $('puzzle-title').textContent = `${LEVELS[state.puzzle.level].name} · ${size} × ${size}`;
  $('progress').textContent = `${state.board.filter(Boolean).length} / ${size * size} filled`;
  $('rule').textContent = `Use 1–${size} once in every row, column and ${box} × ${box} box. No adding needed, just logic.`;
  $('selection').textContent = `Row ${Math.floor(state.selected / size) + 1}, column ${state.selected % size + 1}${givens[state.selected] ? ' · Fixed clue. Choose an empty square.' : noteMode ? ' · Pencil notes' : ' · Enter a number'}`;
  $('notes').textContent = `✎ Notes: ${noteMode ? 'on' : 'off'}`;
  $('notes').setAttribute('aria-pressed', String(noteMode));
  $('undo').disabled = !history.length;
  const solved = isSolved(state);
  $('finished').hidden = !solved;
  $('erase').disabled = solved || !!givens[state.selected] || !state.board[state.selected] && !state.notes[state.selected];
  $('notes').disabled = solved;
  $('hint').disabled = solved;
  [...$('keypad').children].forEach(button => {
    button.disabled = solved || !!givens[state.selected];
    button.setAttribute('aria-label', `${noteMode ? 'Toggle note' : 'Enter'} ${button.dataset.value}`);
  });
  $('hint-panel').hidden = !pendingHint;
  if (pendingHint) {
    const { index, value, reason } = pendingHint;
    $('hint-text').textContent = `Row ${Math.floor(index / size) + 1}, column ${index % size + 1}: ${reason} Try ${value}.`;
    $('place-hint').textContent = `Place ${value} for me`;
  }
}
function select(index, focus = false) {
  state.selected = index; render();
  if (focus) $('board').children[index].focus({ preventScroll: true });
}
function remember() {
  history.push({ board: [...state.board], notes: [...state.notes], selected: state.selected, hints: state.hints });
  if (history.length > 100) history.shift();
}
function changed(message) {
  pendingHint = null; marked = [];
  render(); save();
  say(isSolved(state) ? `Puzzle solved! Every number fits.${state.hints ? ` You used ${state.hints} placed clue${state.hints === 1 ? '' : 's'}.` : ' All your own reasoning.'}` : message);
}
function enter(value, fromHint = false) {
  const index = state.selected;
  if (isSolved(state) || state.puzzle.givens[index]) return;
  if (noteMode && !fromHint) {
    if (state.board[index]) { say('Erase this number first if you want to pencil in possibilities.'); return; }
    remember(); state.notes[index] ^= 1 << (value - 1);
    changed(`Note ${value} ${state.notes[index] & (1 << (value - 1)) ? 'added' : 'removed'}.`); return;
  }
  if (state.board[index] === value) return;
  remember(); state.board[index] = value; state.notes[index] = 0;
  peers(index, state.puzzle.size).forEach(i => { state.notes[i] &= ~(1 << (value - 1)); });
  if (fromHint) state.hints++;
  changed(conflicts(state.board, state.puzzle.size).includes(index) ? 'This number repeats in its row, column or box. Look for the ! marks and try another.' : `${value} placed. Keep following the clues.`);
}
function erase() {
  const index = state.selected;
  if (state.puzzle.givens[index] || isSolved(state) || !state.board[index] && !state.notes[index]) return;
  remember(); state.board[index] = 0; state.notes[index] = 0; changed('Square cleared.');
}
function undo() {
  const previous = history.pop();
  if (!previous) return;
  Object.assign(state, previous); changed('Last move undone.');
}
function toggleNotes() { if (!isSolved(state)) { noteMode = !noteMode; render(); say(noteMode ? 'Notes on. Numbers you tap are pencil possibilities.' : 'Notes off. Numbers you tap are answers.'); } }
function onKey(event) {
  if (event.altKey) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); undo(); return; }
  if (event.ctrlKey || event.metaKey) return;
  const { size } = state.puzzle, index = state.selected, col = index % size;
  const next = { ArrowLeft: col ? index - 1 : index, ArrowRight: col < size - 1 ? index + 1 : index,
    ArrowUp: index >= size ? index - size : index, ArrowDown: index < size * (size - 1) ? index + size : index,
    Home: index - col, End: index - col + size - 1 }[event.key];
  if (next !== undefined) { event.preventDefault(); select(next, true); }
  else if (/^[1-9]$/.test(event.key) && Number(event.key) <= size) { event.preventDefault(); enter(Number(event.key)); }
  else if (['Backspace', 'Delete', '0'].includes(event.key)) { event.preventDefault(); erase(); }
  else if (event.key.toLowerCase() === 'n') { event.preventDefault(); toggleNotes(); }
}
function check() {
  pendingHint = null;
  marked = state.board.flatMap((n, i) => n && n !== state.puzzle.solution[i] ? [i] : []);
  render();
  say(marked.length ? `${marked.length} number${marked.length === 1 ? ' needs' : 's need'} another look. The ! marks show where. Erase or change one to keep going.` : isSolved(state) ? 'Everything fits. Puzzle solved!' : 'All the numbers you have placed are right so far. Keep going!');
}
function hint() {
  if (isSolved(state)) return;
  if (state.board.some((n, i) => n && n !== state.puzzle.solution[i])) { check(); say('Let’s check the marked numbers first. A wrong number can hide the next logical step.'); return; }
  pendingHint = logicalHint(state.board, state.puzzle.size);
  if (!pendingHint) {
    const index = state.board[state.selected] ? state.board.indexOf(0) : state.selected;
    pendingHint = { index, value: state.puzzle.solution[index], reason: 'This challenge needs more than a one-step clue here. Here is one number from its unique solution to help you move on.' };
  }
  state.selected = pendingHint.index; render();
  say($('hint-text').textContent + ' Place it yourself, or use the Place button.');
}
function requestFresh(level) {
  if ($('confirm-dialog').open) return;
  pendingLevel = level;
  $('level').value = state.puzzle.level;
  const edited = state.board.some((n, i) => n !== state.puzzle.givens[i]) || state.notes.some(Boolean);
  if (saveBlocked || edited && !isSolved(state)) {
    $('confirm-text').textContent = saveBlocked
      ? 'This will replace this player’s saved puzzle, including any unreadable or newer saved progress. Other players’ puzzles are kept.'
      : 'This will replace this player’s current puzzle and pencil notes. Other players’ puzzles are kept.';
    $('confirm-dialog').showModal();
  } else startFresh();
}
function startFresh(level = pendingLevel) {
  pendingLevel = null;
  if (!level) return;
  // A replacement is explicit. Read again before writing; never clear other saves.
  try { savedRaw = localStorage.getItem(key()); saveBlocked = false; saveWarning = ''; }
  catch (_) { saveBlocked = true; saveWarning = 'Saving is unavailable. This new puzzle will stay in this tab only.'; }
  state = newState(level, freshSeed());
  history = []; noteMode = false; marked = []; pendingHint = null;
  $('level').value = level; buildBoard(); render(); save(); say('A fresh puzzle is ready. What can you rule out?');
}
$('player').addEventListener('change', () => {
  // Preserve even unsaved progress when someone else takes a turn.
  sessions.set(player, { state, history, noteMode, marked, pendingHint, savedRaw, saveBlocked, saveWarning });
  player = players.includes($('player').value) ? $('player').value : 'jeannie';
  if (sessions.has(player)) {
    ({ state, history, noteMode, marked, pendingHint, savedRaw, saveBlocked, saveWarning } = sessions.get(player));
    $('level').value = state.puzzle.level;
    buildBoard(); render(); save(); say('Welcome back. Your puzzle is just as you left it.');
  } else loadPlayer();
});
$('level').addEventListener('change', () => requestFresh($('level').value));
$('new').addEventListener('click', () => requestFresh(state.puzzle.level));
$('notes').addEventListener('click', toggleNotes);
$('erase').addEventListener('click', erase);
$('undo').addEventListener('click', undo);
$('check').addEventListener('click', check);
$('hint').addEventListener('click', hint);
$('place-hint').addEventListener('click', () => { if (pendingHint) { const { index, value } = pendingHint; state.selected = index; enter(value, true); } });
$('confirm-dialog').querySelector('form').addEventListener('submit', event => {
  event.preventDefault();
  const level = pendingLevel, replace = event.submitter?.value === 'replace';
  pendingLevel = null;
  $('confirm-dialog').close();
  if (replace) startFresh(level);
});
// Handle Escape synchronously. A queued `close` event must never cancel a
// newer dialog or borrow its choice when the player moves quickly.
$('confirm-dialog').addEventListener('cancel', () => { pendingLevel = null; });
window.addEventListener('storage', event => {
  if ((event.key === key() || event.key === null) && event.newValue !== savedRaw) {
    saveBlocked = true; saveWarning = 'This puzzle changed in another tab. Reload to see that save. Your moves here will not overwrite it.'; showSave();
  }
});
loadPlayer();
