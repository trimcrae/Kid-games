/* Offline crossword compiler. Feed each theme a list of {answer, clue};
   greedily place words so they interlock (crossings only, no illegal
   adjacency). Output a normalized grid + numbered across/down entries.
   Deterministic (no randomness) so output is stable. */

/* place a given ordered list of words; multi-pass so words that can't
   cross anything yet get retried after more words land. Returns
   {grid, placed, unplaced}. */
function layout(orderedWords) {
  const grid = new Map();          // "r,c" -> letter
  const placed = [];               // {answer, clue, cells:[{r,c}], dir}
  const key = (r, c) => r + "," + c;
  const get = (r, c) => grid.get(key(r, c));

  function cellsFor(word, r0, c0, dir) {
    const cells = [];
    for (let i = 0; i < word.length; i++) {
      cells.push(dir === "across" ? { r: r0, c: c0 + i } : { r: r0 + i, c: c0 });
    }
    return cells;
  }

  function valid(word, r0, c0, dir) {
    const cells = cellsFor(word, r0, c0, dir);
    let crossings = 0;
    // cell just before start and just after end must be empty
    const before = dir === "across" ? { r: r0, c: c0 - 1 } : { r: r0 - 1, c: c0 };
    const afterCell = cells[cells.length - 1];
    const after = dir === "across" ? { r: afterCell.r, c: afterCell.c + 1 } : { r: afterCell.r + 1, c: afterCell.c };
    if (get(before.r, before.c)) return null;
    if (get(after.r, after.c)) return null;

    for (let i = 0; i < cells.length; i++) {
      const { r, c } = cells[i];
      const existing = get(r, c);
      if (existing) {
        if (existing !== word[i]) return null;     // conflict
        crossings++;
      } else {
        // perpendicular neighbours of a NON-crossing cell must be empty
        const n1 = dir === "across" ? get(r - 1, c) : get(r, c - 1);
        const n2 = dir === "across" ? get(r + 1, c) : get(r, c + 1);
        if (n1 || n2) return null;
      }
    }
    return { cells, crossings };
  }

  function apply(word, clue, r0, c0, dir, cells) {
    cells.forEach((cell, i) => grid.set(key(cell.r, cell.c), word[i]));
    placed.push({ answer: word, clue, cells, dir });
  }

  function tryPlace(item) {
    const word = item.answer;
    let best = null;
    for (const [k, L] of grid) {
      const [r, c] = k.split(",").map(Number);
      for (let i = 0; i < word.length; i++) {
        if (word[i] !== L) continue;
        for (const dir of ["down", "across"]) {
          const r0 = dir === "down" ? r - i : r;
          const c0 = dir === "across" ? c - i : c;
          const v = valid(word, r0, c0, dir);
          if (!v || v.crossings < 1) continue;
          const score = v.crossings * 100 - (Math.abs(r0) + Math.abs(c0));
          if (!best || score > best.score) best = { r0, c0, dir, cells: v.cells, score };
        }
      }
    }
    if (best) { apply(word, item.clue, best.r0, best.c0, best.dir, best.cells); return true; }
    return false;
  }

  // seed with the first word, then multi-pass over the rest until no progress
  apply(orderedWords[0].answer, orderedWords[0].clue, 0, 0, "across",
        cellsFor(orderedWords[0].answer, 0, 0, "across"));
  let remaining = orderedWords.slice(1);
  let progress = true;
  while (progress && remaining.length) {
    progress = false;
    const still = [];
    for (const item of remaining) {
      if (tryPlace(item)) progress = true; else still.push(item);
    }
    remaining = still;
  }
  return { grid, placed, unplaced: remaining.map(w => w.answer) };
}

function normalize(theme, placed, grid) {
  const key = (r, c) => r + "," + c;
  // normalize coordinates to start at 0,0
  let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
  for (const k of grid.keys()) {
    const [r, c] = k.split(",").map(Number);
    minR = Math.min(minR, r); minC = Math.min(minC, c);
    maxR = Math.max(maxR, r); maxC = Math.max(maxC, c);
  }
  const rows = maxR - minR + 1, cols = maxC - minC + 1;
  const cells = Array.from({ length: rows }, () => new Array(cols).fill(null));
  for (const [k, L] of grid) {
    const [r, c] = k.split(",").map(Number);
    cells[r - minR][c - minC] = L;
  }

  // numbering
  const numAt = {};
  let num = 0;
  const startsAcross = (r, c) => cells[r][c] && (c === 0 || !cells[r][c - 1]) && (c + 1 < cols && cells[r][c + 1]);
  const startsDown = (r, c) => cells[r][c] && (r === 0 || !cells[r - 1][c]) && (r + 1 < rows && cells[r + 1][c]);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (startsAcross(r, c) || startsDown(r, c)) { num++; numAt[r + "," + c] = num; }
  }

  // entries with their numbers (match placed words by normalized start + dir)
  const entries = placed.map(p => {
    const first = p.cells[0];
    const r = first.r - minR, c = first.c - minC;
    return { num: numAt[r + "," + c], dir: p.dir, row: r, col: c, answer: p.answer, clue: p.clue };
  }).sort((a, b) => a.num - b.num || (a.dir === "across" ? -1 : 1));

  return {
    name: theme.name, emoji: theme.emoji, blurb: theme.blurb,
    rows, cols,
    cells,                       // letters or null
    numbers: numAt,              // "r,c" -> number
    entries,
  };
}

/* try every word as the seed; keep the layout that places the most
   words (tie-break: smallest grid area). */
function compile(theme) {
  const base = theme.words.map(w => ({
    answer: w.answer.toUpperCase().replace(/[^A-Z]/g, ""), clue: w.clue,
  }));
  let bestRun = null;
  for (let s = 0; s < base.length; s++) {
    const ordered = [base[s], ...base.filter((_, i) => i !== s).sort((a, b) => b.answer.length - a.answer.length)];
    const run = layout(ordered);
    const area = (() => {
      let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
      for (const k of run.grid.keys()) { const [r, c] = k.split(",").map(Number); minR = Math.min(minR, r); minC = Math.min(minC, c); maxR = Math.max(maxR, r); maxC = Math.max(maxC, c); }
      return (maxR - minR + 1) * (maxC - minC + 1);
    })();
    const placedCount = run.placed.length;
    if (!bestRun || placedCount > bestRun.placedCount || (placedCount === bestRun.placedCount && area < bestRun.area)) {
      bestRun = { run, area, placedCount };
    }
  }
  const norm = normalize(theme, bestRun.run.placed, bestRun.run.grid);
  norm.unplaced = bestRun.run.unplaced;
  return norm;
}

const THEMES = [
  {
    name: "Minecraft Mash", emoji: "🟩", blurb: "Blocks, mobs and tools!",
    words: [
      { answer: "CREEPER", clue: "Green mob that goes SSSS… then BOOM!" },
      { answer: "DIAMOND", clue: "The shiny blue gem you dig for deep down." },
      { answer: "SWORD", clue: "You craft this to fight mobs." },
      { answer: "TORCH", clue: "Place this to keep the dark (and mobs) away." },
      { answer: "ZOMBIE", clue: "Green undead mob that moans at night." },
      { answer: "PICKAXE", clue: "The tool you mine stone and ore with." },
      { answer: "ENDER", clue: "An ___man teleports when you look at it." },
    ],
  },
  {
    name: "Bluey Time", emoji: "🐶", blurb: "Play games with the Heeler family!",
    words: [
      { answer: "BLUEY", clue: "The big blue puppy this show is named after." },
      { answer: "BINGO", clue: "Bluey's little orange sister." },
      { answer: "BANDIT", clue: "Bluey's dad who loves to play." },
      { answer: "CHILLI", clue: "Bluey's mum." },
      { answer: "MUFFIN", clue: "Bluey's silly little cousin." },
      { answer: "DANCE", clue: "Move to music — there's a Bluey ___ mode!" },
    ],
  },
  {
    name: "Animal Friends", emoji: "🦁", blurb: "Creatures big and small.",
    words: [
      { answer: "TIGER", clue: "A big orange cat with black stripes." },
      { answer: "ZEBRA", clue: "A horse-like animal in black and white." },
      { answer: "PANDA", clue: "A bear that munches bamboo." },
      { answer: "SNAKE", clue: "A long animal with no legs." },
      { answer: "EAGLE", clue: "A huge bird with sharp eyes." },
      { answer: "HORSE", clue: "An animal you can ride that says 'neigh'." },
      { answer: "OTTER", clue: "A playful river animal that floats on its back." },
    ],
  },
  {
    name: "Frozen Magic", emoji: "❄️", blurb: "Adventures in Arendelle.",
    words: [
      { answer: "ELSA", clue: "The queen with icy magic powers." },
      { answer: "ANNA", clue: "Elsa's brave younger sister." },
      { answer: "OLAF", clue: "The happy snowman who loves warm hugs." },
      { answer: "SVEN", clue: "Kristoff's reindeer buddy." },
      { answer: "SNOW", clue: "White fluffy stuff Elsa can make." },
      { answer: "MAGIC", clue: "Elsa's special icy power." },
      { answer: "WINTER", clue: "The cold, snowy season." },
    ],
  },
  {
    name: "Book Heroes", emoji: "📚", blurb: "Stars from favourite kids' books.",
    words: [
      { answer: "GREG", clue: "The main kid in 'Diary of a Wimpy Kid'." },
      { answer: "ROWLEY", clue: "Greg's best friend in the Wimpy Kid books." },
      { answer: "CALVIN", clue: "The boy with a stuffed tiger named Hobbes." },
      { answer: "HOBBES", clue: "Calvin's tiger, real to him!" },
      { answer: "NORY", clue: "The wonky-magic hero of 'Upside Down Magic'." },
      { answer: "DOGMAN", clue: "Part dog, part cop, all hero! (one word)" },
    ],
  },
  {
    name: "Taekwondo Class", emoji: "🥋", blurb: "Kicks, belts and respect!",
    words: [
      { answer: "WHITE", clue: "The belt colour you start with as a beginner." },
      { answer: "BELT", clue: "The coloured band tied around your uniform." },
      { answer: "KICK", clue: "Striking with your foot — taekwondo's specialty!" },
      { answer: "PUNCH", clue: "A straight strike with your fist." },
      { answer: "BOW", clue: "You do this to show respect before you spar." },
      { answer: "BLOCK", clue: "Move your arm to stop an attack." },
      { answer: "KOREA", clue: "The country where taekwondo began." },
      { answer: "SPAR", clue: "To practice-fight a partner." },
      { answer: "FORM", clue: "A set pattern of moves you practice (a 'poomsae')." },
    ],
  },
];

const out = THEMES.map(compile);
console.log(JSON.stringify(out.map(o => ({
  name: o.name, emoji: o.emoji, blurb: o.blurb,
  rows: o.rows, cols: o.cols, cells: o.cells, numbers: o.numbers, entries: o.entries,
}))));
console.error("Generated crosswords:");
out.forEach(o => {
  console.error(`\n${o.name}: ${o.cols}x${o.rows}, ${o.entries.length} entries, unplaced: [${o.unplaced.join(", ")}]`);
  console.error(o.cells.map(row => row.map(x => x || ".").join(" ")).join("\n"));
});
