/* ===========================================================
   Life Lab — Conway's Game of Life
   -----------------------------------------------------------
   A cellular-automaton playground: paint cells, stamp famous
   patterns, and change the birth/survival rules live.
   Rendering is a smooth 60fps canvas loop (cells ease in and
   out, colour shows a cell's age) while the simulation ticks
   at an adjustable generations-per-second rate.
   =========================================================== */
(function () {
  "use strict";

  const STORE_KEY = "life-lab-v1";
  const STAMP_MAX = 24;   // biggest square a saved stamp may cover

  const SIZES = {
    tiny:   { label: "🔎 Tiny",   cols: 24,  rows: 16 },
    small:  { label: "🟩 Small",  cols: 48,  rows: 30 },
    medium: { label: "🟨 Medium", cols: 72,  rows: 45 },
    large:  { label: "🟦 Big",    cols: 108, rows: 68 },
  };

  /* Honour the OS "reduce motion" setting: no eased fades, no confetti. */
  const REDUCE = !!(window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* Patterns are drawn with O = alive. Stamped centred on the tap.
     `kind` groups them in the pattern library and `desc` is the one-line
     science lesson shown whenever a brush is picked. */
  const PATTERNS = [
    { key: "pencil", name: "✏️ Pencil", cells: null,
      desc: "Draw one cell at a time. Tap an empty square to bring it to life, or tap a living cell to rub it out. Drag to draw a line!" },
    { key: "eraser", name: "🧽 Eraser", cells: null,
      desc: "Rubs cells out wherever you drag. Handy for tidying up a busy world." },
    { key: "inspect", name: "🔍 Inspect", cells: null,
      desc: "Tap any square and the game counts its 8 neighbours for you and explains — in words — whether it lives, dies or is born next turn." },
    { key: "block", name: "🧊 Block", kind: "Still life", cells: [
      "OO",
      "OO",
    ], desc: "A still life: every cell has exactly 3 neighbours, so all four survive and no empty square has 3. It never, ever changes." },
    { key: "beehive", name: "🍯 Beehive", kind: "Still life", cells: [
      ".OO.",
      "O..O",
      ".OO.",
    ], desc: "Another still life. Each of the 6 cells has exactly 2 neighbours — just enough to survive, never enough to grow." },
    { key: "blinker", name: "💡 Blinker", kind: "Oscillator", cells: [
      "OOO",
    ], desc: "An oscillator with period 2: it flips between lying down and standing up, over and over, forever." },
    { key: "toad", name: "🐸 Toad", kind: "Oscillator", cells: [
      ".OOO",
      "OOO.",
    ], desc: "A period-2 oscillator too, but fatter — it puffs out and sucks back in like a breathing frog." },
    { key: "glider", name: "🚀 Glider", kind: "Spaceship", cells: [
      ".O.",
      "..O",
      "OOO",
    ], desc: "A spaceship! It repeats its own shape every 4 generations, but one square diagonally further on. Nothing is moving — cells just keep being born in front and dying behind." },
    { key: "lwss", name: "🛸 Spaceship", kind: "Spaceship", cells: [
      ".O..O",
      "O....",
      "O...O",
      "OOOO.",
    ], desc: "The lightweight spaceship: it travels straight sideways, 2 squares every 4 generations — twice as fast as a glider." },
    { key: "rpent", name: "🌪️ Chaos Seed", kind: "Methuselah", cells: [
      ".OO",
      "OO.",
      ".O.",
    ], desc: "The R-pentomino — only 5 cells, but it explodes into chaos for over a thousand generations before it settles. Tiny start, huge story." },
    { key: "acorn", name: "🌰 Acorn", kind: "Methuselah", cells: [
      ".O.....",
      "...O...",
      "OO..OOO",
    ], desc: "7 cells that grow for more than 5,000 generations. Turn wrap OFF and a big world ON to see it run properly." },
    { key: "pulsar", name: "💫 Pulsar", kind: "Oscillator",
      desc: "A big period-3 oscillator with beautiful symmetry — one of the most common oscillators you'll find in a random world.",
      cells: [
      "..OOO...OOO..",
      ".............",
      "O....O.O....O",
      "O....O.O....O",
      "O....O.O....O",
      "..OOO...OOO..",
      ".............",
      "..OOO...OOO..",
      "O....O.O....O",
      "O....O.O....O",
      "O....O.O....O",
      ".............",
      "..OOO...OOO..",
    ]},
    { key: "penta", name: "⚡ Sparkler", kind: "Oscillator", cells: [
      "..O....O..",
      "OO.OOOO.OO",
      "..O....O..",
    ], desc: "The pentadecathlon — an oscillator with period 15. Count the beats: it takes 15 generations to look the same again." },
    { key: "gun", name: "🏭 Glider Factory", kind: "Gun",
      desc: "Gosper's glider gun: it pops out a brand new glider every 30 generations, forever. It proved that Life can grow without limit.",
      cells: [
      "........................O...........",
      "......................O.O...........",
      "............OO......OO............OO",
      "...........O...O....OO............OO",
      "OO........O.....O...OO..............",
      "OO........O...O.OO....O.O...........",
      "..........O.....O.......O...........",
      "...........O...O....................",
      "............OO......................",
    ]},
  ];

  /* Discovery badges — earned automatically when the world does
     something scientifically interesting. Saved with the world. */
  const BADGES = [
    { key: "still",    emoji: "🗿", name: "Still Life",
      desc: "Find a shape that NEVER changes — it just sits there, perfectly balanced. (Psst: try the 🧊 Block, then press Play.)" },
    { key: "osc",      emoji: "🔁", name: "Oscillator",
      desc: "Find a shape that flips back and forth forever. The 💡 Blinker and 🐸 Toad are famous ones." },
    { key: "boom",     emoji: "🎆", name: "Population Boom",
      desc: "Get 1,000 cells alive at the same moment. A big world and 🎲 Random help!" },
    { key: "marathon", emoji: "🏃", name: "Marathon",
      desc: "Keep one world running all the way to generation 500." },
    { key: "quiet",    emoji: "🌙", name: "The Big Quiet",
      desc: "Watch a living world fade away until zero cells are left." },
    { key: "wizard",   emoji: "🧙", name: "Rule Wizard",
      desc: "Invent your OWN rule in the Rule Lab — one that isn't a famous recipe." },
    { key: "stamps",   emoji: "📚", name: "Stamp Collector",
      desc: "Stamp every creature in the Stamp Shop at least once." },
    { key: "seer",     emoji: "🔮", name: "Fortune Teller",
      desc: "Get 3 predictions perfect in a row in Predict the Next Generation. Now you ARE the computer!" },
    { key: "detective",emoji: "🕵️", name: "Cell Detective",
      desc: "Use the 🔍 Inspect tool on 10 different squares to see why they live or die." },
  ];

  const PRESETS = [
    { key: "classic",  name: "🟢 Classic Life",  b: [3],          s: [2, 3] },
    { key: "highlife", name: "✨ HighLife",      b: [3, 6],       s: [2, 3] },
    { key: "maze",     name: "🌀 Maze",          b: [3],          s: [1, 2, 3, 4, 5] },
    { key: "coral",    name: "🪸 Coral",         b: [3],          s: [4, 5, 6, 7, 8] },
    { key: "seeds",    name: "🌱 Seeds",         b: [2],          s: [] },
    { key: "daynight", name: "🌗 Day & Night",   b: [3, 6, 7, 8], s: [3, 4, 6, 7, 8] },
  ];

  /* ---------- state ---------- */
  const state = {
    sizeKey: "medium",
    cols: 0, rows: 0,
    cells: null,      // Uint8Array 0/1 — the simulation truth
    next: null,       // scratch buffer for stepping
    age: null,        // Uint16Array — generations alive (drives colour)
    energy: null,     // Float32Array 0..1 — eased brightness for drawing
    colorIdx: null,   // Uint8Array — last colour, so dying cells fade in place
    birth: new Array(9).fill(false),
    survive: new Array(9).fill(false),
    wrap: true,
    speed: 10,        // generations per second
    playing: false,
    generation: 0,
    brush: "pencil",
    rot: 0,           // stamp rotation, quarter turns clockwise
    badges: {},       // discovery badges earned (key -> true)
    stampsUsed: {},   // stamp brushes tried at least once
    myPatterns: [],   // stamps the player saved themselves
    cursor: null,     // {x,y} keyboard cursor on the world
    inspected: {},    // squares looked at with the 🔍 tool (key "x,y")
    predStreak: 0,
    predBest: 0,
    stampSeq: 0,      // ever-increasing, so two saved stamps never share a name
  };
  state.birth[3] = true;
  state.survive[2] = state.survive[3] = true;

  /* ---------- DOM ---------- */
  const $ = (id) => document.getElementById(id);
  const canvas = $("world");
  const ctx = canvas.getContext("2d");
  const genCountEl = $("genCount");
  const popCountEl = $("popCount");
  const playBtn = $("playBtn");
  const backBtn = $("backBtn");
  const speedInput = $("speed");
  const speedLabel = $("speedLabel");
  const ruleStringEl = $("ruleString");
  const wrapToggle = $("wrapToggle");

  /* ---------- grid setup ---------- */
  function allocate(cols, rows, keepOld) {
    const old = keepOld ? { cols: state.cols, rows: state.rows, cells: state.cells, age: state.age } : null;
    state.cols = cols;
    state.rows = rows;
    state.cells = new Uint8Array(cols * rows);
    state.next = new Uint8Array(cols * rows);
    state.age = new Uint16Array(cols * rows);
    state.energy = new Float32Array(cols * rows);
    state.colorIdx = new Uint8Array(cols * rows);
    if (old && old.cells) {
      // keep the middle of the old world when resizing
      const dx = Math.floor((cols - old.cols) / 2);
      const dy = Math.floor((rows - old.rows) / 2);
      for (let y = 0; y < old.rows; y++) {
        const ny = y + dy;
        if (ny < 0 || ny >= rows) continue;
        for (let x = 0; x < old.cols; x++) {
          const nx = x + dx;
          if (nx < 0 || nx >= cols) continue;
          const v = old.cells[y * old.cols + x];
          if (!v) continue;
          const i = ny * cols + nx;
          state.cells[i] = 1;
          state.age[i] = old.age[y * old.cols + x];
          state.energy[i] = 1;
          state.colorIdx[i] = colorIndexForAge(state.age[i]);
        }
      }
    }
  }

  /* ---------- colours ---------- */
  /* Newborns glow yellow-green, then shift through teal to deep
     purple as they get older. Colours are precomputed strings. */
  const PAL_N = 48;
  const palette = [];
  for (let i = 0; i < PAL_N; i++) {
    const t = i / (PAL_N - 1);
    const h = 78 + 210 * t;
    const l = 66 - 14 * t;
    palette.push("hsl(" + Math.round(h) + " 95% " + Math.round(l) + "%)");
  }
  function colorIndexForAge(a) {
    // ease: young cells change colour fast, elders settle down
    const t = 1 - Math.exp(-Math.max(0, a - 1) / 12);
    return Math.min(PAL_N - 1, Math.round(t * (PAL_N - 1)));
  }

  /* ---------- simulation ----------
     THE RULE lives between the markers below and nowhere else: the world,
     the 🔍 inspector and the 🔮 prediction puzzle all call these two
     functions, so what the game teaches is literally what the game runs.
     (tests/ extracts this block straight out of the file and checks it.) */
  /* @rule-core-start */
  // How many of the 8 squares touching (x, y) are alive?
  function countNeighbours(cells, cols, rows, x, y, wrap) {
    let n = 0;
    for (let dy = -1; dy <= 1; dy++) {
      let ny = y + dy;
      if (ny < 0 || ny >= rows) {
        if (!wrap) continue;
        ny = (ny + rows) % rows;
      }
      const row = ny * cols;
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        let nx = x + dx;
        if (nx < 0 || nx >= cols) {
          if (!wrap) continue;
          nx = (nx + cols) % cols;
        }
        n += cells[row + nx];
      }
    }
    return n;
  }

  // One whole generation, all at once. Every cell reads the OLD board
  // (`cells`) and writes to a SEPARATE board (`out`) — no cell is ever
  // allowed to see a half-updated world.
  function stepBoard(cells, cols, rows, birth, survive, wrap, out) {
    const dst = out || new Uint8Array(cols * rows);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const n = countNeighbours(cells, cols, rows, x, y, wrap);
        const i = y * cols + x;
        dst[i] = cells[i] ? (survive[n] ? 1 : 0) : (birth[n] ? 1 : 0);
      }
    }
    return dst;
  }
  /* @rule-core-end */

  function step() {
    const { cols, rows, cells, next, age, colorIdx, birth, survive, wrap } = state;
    pushPast(cells);   // so ⏪ Back can wind this generation off again
    stepBoard(cells, cols, rows, birth, survive, wrap, next);
    // commit + bookkeeping (and fingerprint the world for discoveries)
    let pop = 0, h = 2166136261;
    for (let i = 0; i < cells.length; i++) {
      if (next[i]) {
        age[i] = cells[i] ? Math.min(age[i] + 1, 60000) : 1;
        colorIdx[i] = colorIndexForAge(age[i]);
        pop++;
        h ^= i; h = Math.imul(h, 16777619);
      } else {
        age[i] = 0;
      }
      cells[i] = next[i];
    }
    state.generation++;
    pushPop(pop);
    checkDiscoveries(pop, h);
  }

  /* ---------- population history (drives the little graph) ---------- */
  const POP_HIST_MAX = 260;
  let popHist = [];
  function pushPop(p) {
    popHist.push(p);
    if (popHist.length > POP_HIST_MAX) popHist.shift();
  }
  function resetPopHist() { popHist = []; }

  /* ---------- ⏪ the rewind film ----------
     Every generation the world leaves behind is kept for a while, so a
     player can wind it back one step at a time and watch the same move
     again slowly. Editing by hand wipes the film (see forgetPast), so
     Back can never contradict what you just drew. */
  const PAST_MAX = 150;
  let past = [];
  function pushPast(cells) {
    past.push(cells.slice());
    if (past.length > PAST_MAX) past.shift();
  }
  function forgetPast() { if (past.length) past.length = 0; }

  function stepBack() {
    if (!past.length) return false;
    setPlaying(false);
    const prev = past.pop();
    const { cells, age, colorIdx } = state;
    for (let i = 0; i < cells.length; i++) {
      cells[i] = prev[i];
      age[i] = prev[i] ? 1 : 0;
      if (prev[i]) colorIdx[i] = 0;
    }
    state.generation = Math.max(0, state.generation - 1);
    if (popHist.length > 1) popHist.pop();
    forgetHistory();   // the still-life / oscillator watch restarts here
    updateStats();
    if (inspectCell) showInspect(inspectCell.x, inspectCell.y);
    scheduleSave();
    return true;
  }

  /* Grey the Back button out when there is nothing left to rewind. */
  let backWasOn = null;
  function refreshBackBtn() {
    const on = past.length > 0;
    if (on === backWasOn) return;
    backWasOn = on;
    backBtn.disabled = !on;
    backBtn.title = on
      ? "Go back one generation (" + PAST_MAX + " remembered at most)"
      : "Nothing to rewind yet — press ⏭️ Step or ▶️ Play first";
  }

  /* ---------- discovery detection ----------
     Compare the world's fingerprint with the last two generations:
     unchanged ⇒ still life, same-as-2-ago ⇒ period-2 oscillator. */
  let hash1 = null, hash2 = null, hadLife = false;
  function forgetHistory() { hash1 = null; hash2 = null; }

  function checkDiscoveries(pop, h) {
    if (pop > 0) {
      hadLife = true;
      if (hash1 !== null && h === hash1) award("still");
      else if (hash2 !== null && h === hash2 && h !== hash1) award("osc");
      if (pop >= 1000) award("boom");
      if (state.generation >= 500) award("marathon");
    } else if (hadLife) {
      hadLife = false;
      award("quiet");
    }
    hash2 = hash1;
    hash1 = h;
  }

  function population() {
    let p = 0;
    const c = state.cells;
    for (let i = 0; i < c.length; i++) p += c[i];
    return p;
  }

  const worldMsg = $("worldMsg");

  function updateStats() {
    refreshBackBtn();
    genCountEl.textContent = state.generation;
    const p = population();
    popCountEl.textContent = p;
    // A gentle nudge when every last cell has died out.
    const empty = p === 0 && state.generation > 0;
    if (empty) worldMsg.textContent = "🌙 The world went quiet… stamp a creature or press 🎲 Random!";
    worldMsg.hidden = !empty;
  }

  /* ---------- painting & stamping ---------- */
  function setCell(x, y, v) {
    if (x < 0 || x >= state.cols || y < 0 || y >= state.rows) return;
    const i = y * state.cols + x;
    state.cells[i] = v;
    state.age[i] = v ? 1 : 0;
    if (v) state.colorIdx[i] = 0;
    forgetHistory(); // hand-edits reset the still-life/oscillator watch
    forgetPast();    // …and Back must never undo a cell you just drew
  }

  function rotate90(pat) {
    const h = pat.length, w = pat[0].length;
    const out = [];
    for (let x = 0; x < w; x++) {
      let row = "";
      for (let y = h - 1; y >= 0; y--) row += pat[y][x];
      out.push(row);
    }
    return out;
  }

  /* Look up the active brush — either a built-in pattern/tool or one of
     the player's own saved stamps ("my:<id>"). */
  function brushDef(key) {
    key = key || state.brush;
    const p = PATTERNS.find((x) => x.key === key);
    if (p) return p;
    const m = state.myPatterns.find((x) => "my:" + x.id === key);
    if (m) return { key: key, name: m.name, cells: m.cells, kind: "Yours",
                    desc: "One of your own creations — you saved this shape yourself. 🌟" };
    return PATTERNS[0];
  }
  function isTool(key) { return !brushDef(key).cells; }

  // The active brush's pattern, turned by the current rotation.
  function brushPattern() {
    let pat = brushDef().cells;
    if (!pat) return null;
    for (let i = 0; i < state.rot % 4; i++) pat = rotate90(pat);
    return pat;
  }

  function stampPattern(pat, cx, cy) {
    const h = pat.length, w = pat[0].length;
    let ox = cx - Math.floor(w / 2);
    let oy = cy - Math.floor(h / 2);
    ox = Math.max(0, Math.min(state.cols - w, ox));
    oy = Math.max(0, Math.min(state.rows - h, oy));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (pat[y][x] === "O") setCell(ox + x, oy + y, 1);
      }
    }
  }

  function randomize() {
    const { cells, age, colorIdx } = state;
    for (let i = 0; i < cells.length; i++) {
      const v = Math.random() < 0.22 ? 1 : 0;
      cells[i] = v;
      age[i] = v;
      if (v) colorIdx[i] = 0;
    }
    state.generation = 0;
    forgetHistory();
    forgetPast();
    resetPopHist();
  }

  function clearWorld() {
    state.cells.fill(0);
    state.age.fill(0);
    state.generation = 0;
    forgetHistory();
    forgetPast();
    resetPopHist();
    hadLife = false;
  }

  /* First visit: a glider factory already at work, plus a pulsar —
     the world should feel alive the moment the page opens. */
  function seedShowcase() {
    clearWorld();
    const pat = (k) => PATTERNS.find((p) => p.key === k).cells;
    const cx = (f) => Math.floor(state.cols * f);
    const cy = (f) => Math.floor(state.rows * f);
    if (state.cols >= 60) {
      stampPattern(pat("gun"),    cx(0.30), cy(0.22));
      stampPattern(pat("pulsar"), cx(0.72), cy(0.68));
      stampPattern(pat("glider"), cx(0.18), cy(0.75));
    } else if (state.cols >= 40) {
      stampPattern(pat("pulsar"), cx(0.66), cy(0.42));
      stampPattern(pat("glider"), cx(0.12), cy(0.18));
      stampPattern(pat("penta"),  cx(0.28), cy(0.80));
    } else {
      // A Tiny world: one of each family, so the first thing a small
      // player sees is "some stay, some blink, some fly".
      stampPattern(pat("block"),   cx(0.16), cy(0.22));
      stampPattern(pat("blinker"), cx(0.55), cy(0.22));
      stampPattern(pat("toad"),    cx(0.82), cy(0.55));
      stampPattern(pat("glider"),  cx(0.20), cy(0.70));
    }
  }

  /* ---------- canvas sizing & static grid layer ---------- */
  let dpr = 1, cssW = 0, cssH = 0, cellPx = 0;
  const gridLayer = document.createElement("canvas");
  let lastLayout = "";

  /* The canvas is width:100%, so its OWN box is the honest width — the
     parent's clientWidth still includes the panel padding, which used to
     make every cell very slightly taller than it was wide. */
  function canvasWidth() {
    const w = canvas.getBoundingClientRect().width;
    if (w > 0) return w;
    const parent = canvas.parentElement;
    const cs = window.getComputedStyle(parent);
    return parent.clientWidth - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0);
  }

  function resizeCanvas() {
    const w = canvasWidth();
    if (w <= 0) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const sig = Math.round(w) + "|" + state.cols + "|" + state.rows + "|" + dpr;
    if (sig === lastLayout) return;   // nothing changed — don't thrash
    lastLayout = sig;
    cssW = w;
    cellPx = cssW / state.cols;
    cssH = Math.round(cellPx * state.rows);
    canvas.style.height = cssH + "px";
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    buildGridLayer();
    resizeGraph();
  }

  /* ---------- population graph ---------- */
  const graphCanvas = $("popGraph");
  const graphCap = $("graphCap");
  let gW = 0, gH = 0;
  function resizeGraph() {
    if (!graphCanvas) return;
    const w = graphCanvas.getBoundingClientRect().width || cssW;
    if (w <= 0) return;
    gW = w; gH = 62;
    graphCanvas.width = Math.round(gW * dpr);
    graphCanvas.height = Math.round(gH * dpr);
  }

  const GRAPH_IDLE = "📈 Population graph — press ▶️ Play and watch the line wiggle!";
  let lastCap = "";
  function setCap(html) {
    if (html === lastCap) return;   // don't touch the DOM 60 times a second
    lastCap = html;
    graphCap.innerHTML = html;
  }

  function drawGraph() {
    if (!graphCanvas || !graphCanvas.width) return;
    const g = graphCanvas.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, gW, gH);
    const n = popHist.length;
    if (n < 2) { setCap(GRAPH_IDLE); return; }
    let max = 1;
    for (let i = 0; i < n; i++) if (popHist[i] > max) max = popHist[i];
    const px = (i) => (i / (n - 1)) * gW;
    const py = (v) => gH - 4 - (v / max) * (gH - 10);
    // filled area under the curve
    g.beginPath();
    g.moveTo(0, gH);
    for (let i = 0; i < n; i++) g.lineTo(px(i), py(popHist[i]));
    g.lineTo(gW, gH);
    g.closePath();
    g.fillStyle = "rgba(61, 220, 132, 0.22)";
    g.fill();
    // the line itself
    g.beginPath();
    for (let i = 0; i < n; i++) (i ? g.lineTo : g.moveTo).call(g, px(i), py(popHist[i]));
    g.strokeStyle = "#3ddc84";
    g.lineWidth = 2;
    g.stroke();
    setCap("📈 Population over the last <b>" + n +
      "</b> generation" + (n === 1 ? "" : "s") + " — highest so far <b>" + max + "</b>");
  }

  function buildGridLayer() {
    gridLayer.width = canvas.width;
    gridLayer.height = canvas.height;
    const g = gridLayer.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = "#151129";
    g.fillRect(0, 0, cssW, cssH);
    g.strokeStyle = "rgba(255,255,255,0.06)";
    g.lineWidth = 1;
    g.beginPath();
    for (let x = 1; x < state.cols; x++) {
      const px = Math.round(x * cellPx) + 0.5;
      g.moveTo(px, 0); g.lineTo(px, cssH);
    }
    for (let y = 1; y < state.rows; y++) {
      const py = Math.round(y * cellPx) + 0.5;
      g.moveTo(0, py); g.lineTo(cssW, py);
    }
    g.stroke();
  }

  /* ---------- render loop ---------- */
  let lastT = 0, acc = 0;
  let hoverCell = null; // {x,y} while a pointer is over the canvas

  function frame(t) {
    const dt = Math.min(0.1, (t - lastT) / 1000 || 0);
    lastT = t;

    if (state.playing) {
      acc += dt * state.speed;
      let steps = 0;
      while (acc >= 1 && steps < 8) { step(); acc -= 1; steps++; }
      if (acc > 8) acc = 0;
      if (steps) updateStats();
    }

    // ease every cell's brightness toward its true state
    // (with "reduce motion" on, cells simply snap — no fading)
    const k = REDUCE ? 1 : 1 - Math.exp(-dt * 14);
    const { cells, energy } = state;
    for (let i = 0; i < cells.length; i++) {
      energy[i] += (cells[i] - energy[i]) * k;
    }

    draw();
    drawGraph();
    requestAnimationFrame(frame);
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(gridLayer, 0, 0, cssW, cssH);

    const { cols, rows, energy, colorIdx } = state;
    const r = Math.max(1, cellPx * 0.16);

    // glow pass — a soft halo behind every bright cell
    ctx.globalCompositeOperation = "lighter";
    for (let y = 0; y < rows; y++) {
      const py = y * cellPx;
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const e = energy[i];
        if (e < 0.04) continue;
        ctx.globalAlpha = e * 0.22;
        ctx.fillStyle = palette[colorIdx[i]];
        const pad = -cellPx * 0.32;
        ctx.fillRect(x * cellPx + pad, py + pad, cellPx - 2 * pad, cellPx - 2 * pad);
      }
    }
    ctx.globalCompositeOperation = "source-over";

    // cell pass — rounded squares that pop in and shrink away
    const canRound = typeof ctx.roundRect === "function";
    for (let y = 0; y < rows; y++) {
      const py = y * cellPx;
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const e = energy[i];
        if (e < 0.04) continue;
        const s = cellPx * (0.55 + 0.35 * e); // newborn pops, dying shrinks
        const off = (cellPx - s) / 2;
        ctx.globalAlpha = Math.min(1, e * 1.25);
        ctx.fillStyle = palette[colorIdx[i]];
        if (canRound) {
          ctx.beginPath();
          ctx.roundRect(x * cellPx + off, py + off, s, s, r);
          ctx.fill();
        } else {
          ctx.fillRect(x * cellPx + off, py + off, s, s);
        }
      }
    }
    ctx.globalAlpha = 1;

    // the 🔍 inspector ring: the square being explained plus its 8 neighbours
    if (inspectCell) {
      ctx.strokeStyle = "rgba(255,209,102,0.55)";
      ctx.lineWidth = 2;
      ctx.strokeRect((inspectCell.x - 1) * cellPx, (inspectCell.y - 1) * cellPx,
                     cellPx * 3, cellPx * 3);
      ctx.strokeStyle = "#ffd166";
      ctx.lineWidth = 3;
      ctx.strokeRect(inspectCell.x * cellPx + 1, inspectCell.y * cellPx + 1,
                     cellPx - 2, cellPx - 2);
    }

    // ghost preview of the selected stamp under the pointer / keyboard cursor
    const marker = hoverCell || state.cursor;
    const pat = marker && !isTool(state.brush) ? brushPattern() : null;
    if (marker && pat) {
      const h = pat.length, w = pat[0].length;
      let ox = marker.x - Math.floor(w / 2);
      let oy = marker.y - Math.floor(h / 2);
      ox = Math.max(0, Math.min(cols - w, ox));
      oy = Math.max(0, Math.min(rows - h, oy));
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (pat[y][x] !== "O") continue;
          ctx.fillRect((ox + x) * cellPx + 1, (oy + y) * cellPx + 1, cellPx - 2, cellPx - 2);
        }
      }
    } else if (marker) {
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 2;
      ctx.strokeRect(marker.x * cellPx + 1, marker.y * cellPx + 1, cellPx - 2, cellPx - 2);
    }
    // the keyboard cursor always gets a bright ring of its own
    if (state.cursor) {
      ctx.strokeStyle = "#ffd166";
      ctx.lineWidth = 3;
      ctx.strokeRect(state.cursor.x * cellPx + 1.5, state.cursor.y * cellPx + 1.5,
                     cellPx - 3, cellPx - 3);
    }
  }

  /* ================= 🔍 THE INSPECTOR =================
     Tap a square and the game does the maths out loud: counts the 8
     neighbours and says, in plain words, which half of the rule applies.
     Everything it says is read from the LIVE rule arrays, so it stays
     honest even after a trip to the Rule Lab. */
  const inspectBox = $("inspectBox");
  const inspGrid = $("inspGrid");
  const inspHead = $("inspHead");
  const inspWhy = $("inspWhy");
  let inspectCell = null;

  for (let i = 0; i < 9; i++) inspGrid.appendChild(document.createElement("i"));

  function listOf(arr) {
    const ns = arr.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
    if (!ns.length) return "no number at all";
    if (ns.length === 1) return String(ns[0]);
    return ns.slice(0, -1).join(", ") + " or " + ns[ns.length - 1];
  }

  function cellAt(x, y) {
    if (state.wrap) {
      x = (x + state.cols) % state.cols;
      y = (y + state.rows) % state.rows;
    } else if (x < 0 || x >= state.cols || y < 0 || y >= state.rows) return 0;
    return state.cells[y * state.cols + x];
  }

  function showInspect(x, y) {
    inspectCell = { x: x, y: y };
    const alive = !!cellAt(x, y);
    const n = countNeighbours(state.cells, state.cols, state.rows, x, y, state.wrap);
    const lives = alive ? !!state.survive[n] : !!state.birth[n];

    // mini 3×3 picture of the neighbourhood
    const boxes = inspGrid.children;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const el = boxes[(dy + 1) * 3 + (dx + 1)];
        el.className = (cellAt(x + dx, y + dy) ? "on" : "") + (dx === 0 && dy === 0 ? " mid" : "");
      }
    }

    let head, why;
    if (alive) {
      head = "🟢 This cell is ALIVE and has " + n + " neighbour" + (n === 1 ? "" : "s") + ".";
      if (lives) {
        why = "Living cells survive with <b>" + listOf(state.survive) + "</b> neighbours — " + n +
              " is on the list, so it <b>stays alive</b> next turn. ✅";
      } else {
        const surv = state.survive.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
        const lonely = surv.length && n < surv[0];
        why = "Living cells only survive with <b>" + listOf(state.survive) + "</b> neighbours. " +
              n + " isn't on the list, so it <b>disappears</b> — " +
              (lonely ? "too lonely. 💤" : "too crowded. 😵") ;
      }
    } else {
      head = "⬛ This square is EMPTY and has " + n + " neighbour" + (n === 1 ? "" : "s") + ".";
      why = lives
        ? "A new cell is born in an empty square with <b>" + listOf(state.birth) +
          "</b> neighbours — " + n + " matches, so a cell is <b>BORN</b> here! 🐣"
        : "A birth needs exactly <b>" + listOf(state.birth) + "</b> neighbours. " + n +
          " isn't enough of a match, so this square <b>stays empty</b>.";
    }
    inspHead.textContent = head;
    inspWhy.innerHTML = why;
    inspectBox.hidden = false;

    if (Object.keys(state.inspected).length < 40) state.inspected[x + "," + y] = true;
    if (Object.keys(state.inspected).length >= 10) award("detective");
    scheduleSave();
  }

  function hideInspect() { inspectCell = null; inspectBox.hidden = true; }

  /* ---------- pointer input ---------- */
  let painting = false, paintValue = 1, lastPaint = null;

  function cellFromEvent(ev) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((ev.clientX - rect.left) / rect.width) * state.cols);
    const y = Math.floor(((ev.clientY - rect.top) / rect.height) * state.rows);
    if (x < 0 || x >= state.cols || y < 0 || y >= state.rows) return null;
    return { x, y };
  }

  function paintLine(a, b, v) {
    // Bresenham so fast finger swipes leave no gaps
    let x0 = a.x, y0 = a.y;
    const x1 = b.x, y1 = b.y;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      setCell(x0, y0, v);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  canvas.addEventListener("pointerdown", (ev) => {
    ev.preventDefault();
    // preventDefault stops the browser focusing the canvas by itself, and
    // the arrow-key controls we advertise need that focus — so take it here.
    try { canvas.focus({ preventScroll: true }); } catch (e) { canvas.focus(); }
    const c = cellFromEvent(ev);
    if (!c) return;
    try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* synthetic pointer */ }
    state.cursor = null;
    if (state.brush === "inspect") {
      showInspect(c.x, c.y);
      window.SFX && SFX.pop && SFX.pop();
    } else if (state.brush === "pencil" || state.brush === "eraser") {
      painting = true;
      paintValue = state.brush === "eraser" ? 0
                 : (state.cells[c.y * state.cols + c.x] ? 0 : 1);
      setCell(c.x, c.y, paintValue);
      lastPaint = c;
      window.SFX && SFX.pop && SFX.pop();
    } else {
      stampPattern(brushPattern(), c.x, c.y);
      state.stampsUsed[state.brush] = true;
      if (PATTERNS.filter((p) => p.cells).every((p) => state.stampsUsed[p.key])) award("stamps");
      window.SFX && SFX.good && SFX.good();
    }
    updateStats();
    scheduleSave();
  });

  canvas.addEventListener("pointermove", (ev) => {
    const c = cellFromEvent(ev);
    hoverCell = c;
    if (!painting || !c) return;
    if (lastPaint && (lastPaint.x !== c.x || lastPaint.y !== c.y)) {
      paintLine(lastPaint, c, paintValue);
      lastPaint = c;
      updateStats();
      scheduleSave();
    }
  });

  /* ---------- keyboard play ----------
     Focus the world, then drive it with the arrow keys — no mouse or
     finger needed, and the cursor is big and bright enough to follow. */
  function moveCursor(dx, dy) {
    const c = state.cursor || { x: Math.floor(state.cols / 2), y: Math.floor(state.rows / 2) };
    state.cursor = {
      x: Math.max(0, Math.min(state.cols - 1, c.x + dx)),
      y: Math.max(0, Math.min(state.rows - 1, c.y + dy)),
    };
    hoverCell = null;
  }

  const ARROWS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

  canvas.addEventListener("keydown", (ev) => {
    const arrow = ARROWS[ev.key];
    if (arrow) {
      ev.preventDefault();
      const jump = ev.shiftKey ? 5 : 1;
      moveCursor(arrow[0] * jump, arrow[1] * jump);
      return;
    }
    if (ev.key === " " || ev.key === "Enter") {
      ev.preventDefault();
      if (!state.cursor) moveCursor(0, 0);
      const c = state.cursor;
      if (state.brush === "inspect" || isTool(state.brush)) {
        if (state.brush !== "inspect") {
          const on = state.cells[c.y * state.cols + c.x];
          setCell(c.x, c.y, state.brush === "eraser" ? 0 : (on ? 0 : 1));
        }
        // always explain what just happened — this is also the
        // screen-reader's only way to hear the state of a square
        showInspect(c.x, c.y);
      } else {
        stampPattern(brushPattern(), c.x, c.y);
        state.stampsUsed[state.brush] = true;
        if (PATTERNS.filter((p) => p.cells).every((p) => state.stampsUsed[p.key])) award("stamps");
      }
      window.SFX && SFX.pop && SFX.pop();
      updateStats();
      scheduleSave();
      return;
    }
    const k = ev.key.toLowerCase();
    if (k === "s") { ev.preventDefault(); doStep(); }
    else if (k === "b") { ev.preventDefault(); doStepBack(); }
    else if (k === "p") { ev.preventDefault(); setPlaying(!state.playing); }
    else if (k === "escape") { state.cursor = null; canvas.blur(); }
  });

  canvas.addEventListener("blur", () => { state.cursor = null; });

  function endPaint() { painting = false; lastPaint = null; }
  canvas.addEventListener("pointerup", endPaint);
  canvas.addEventListener("pointercancel", endPaint);
  canvas.addEventListener("pointerleave", () => { hoverCell = null; endPaint(); });

  /* ---------- controls ---------- */
  function setPlaying(on) {
    state.playing = on;
    playBtn.textContent = on ? "⏸️ Pause" : "▶️ Play";
    playBtn.classList.toggle("running", on);
    if (!on) scheduleSave();
  }

  playBtn.addEventListener("click", () => {
    setPlaying(!state.playing);
    window.SFX && SFX.good && SFX.good();
  });

  function doStep() {
    setPlaying(false);
    step();
    updateStats();
    // keep the inspector's explanation in sync with the new generation
    if (inspectCell) showInspect(inspectCell.x, inspectCell.y);
    scheduleSave();
  }
  $("stepBtn").addEventListener("click", doStep);

  function doStepBack() {
    if (stepBack()) {
      window.SFX && SFX.pop && SFX.pop();
    } else {
      toast("⏪ Nothing to rewind yet — press ⏭️ Step or ▶️ Play first!");
      window.SFX && SFX.nope && SFX.nope();
    }
  }
  backBtn.addEventListener("click", doStepBack);

  $("randomBtn").addEventListener("click", () => {
    randomize();
    updateStats();
    scheduleSave();
    window.SFX && SFX.good && SFX.good();
  });

  $("clearBtn").addEventListener("click", () => {
    setPlaying(false);
    clearWorld();
    hideInspect();
    updateStats();
    scheduleSave();
  });

  speedInput.addEventListener("input", () => {
    state.speed = Number(speedInput.value);
    speedLabel.textContent = state.speed;
    scheduleSave();
  });

  wrapToggle.addEventListener("change", () => {
    state.wrap = wrapToggle.checked;
    if (inspectCell) showInspect(inspectCell.x, inspectCell.y);
    scheduleSave();
  });

  window.addEventListener("keydown", (ev) => {
    if (ev.code === "Space" && ev.target === document.body) {
      ev.preventDefault();
      setPlaying(!state.playing);
    }
  });

  /* ---------- brush chips + the pattern library ---------- */
  const brushRow = $("brushRow");
  const brushInfo = $("brushInfo");
  const mineRow = $("mineRow");

  // Turn the stamp a quarter turn — aim gliders wherever you like!
  const rotateChip = document.createElement("button");
  rotateChip.className = "chip";
  rotateChip.textContent = "↻ Turn";
  rotateChip.setAttribute("aria-label", "Rotate the stamp a quarter turn");
  rotateChip.addEventListener("click", () => {
    state.rot = (state.rot + 1) % 4;
    window.SFX && SFX.pop && SFX.pop();
  });

  /* One sentence of real science for whatever brush is selected. */
  function refreshBrushInfo() {
    const d = brushDef();
    brushInfo.innerHTML =
      "<b>" + d.name + (d.kind ? " — " + d.kind : "") + "</b><br>" + (d.desc || "");
    const tool = isTool(state.brush);
    rotateChip.disabled = tool;
    rotateChip.style.opacity = tool ? 0.45 : 1;
    document.querySelectorAll("#brushRow .chip[data-brush], #mineRow .chip[data-brush]")
      .forEach((el) => el.setAttribute("aria-pressed", String(el.dataset.brush === state.brush)));
  }

  function selectBrush(key) {
    state.brush = key;
    if (key !== "inspect") hideInspect();
    refreshBrushInfo();
    scheduleSave();
  }

  function makeBrushChip(key, label, extraClass) {
    const b = document.createElement("button");
    b.className = "chip" + (extraClass ? " " + extraClass : "");
    b.textContent = label;
    b.dataset.brush = key;
    b.setAttribute("aria-pressed", String(key === state.brush));
    b.addEventListener("click", () => selectBrush(key));
    return b;
  }

  PATTERNS.forEach((p) => brushRow.appendChild(makeBrushChip(p.key, p.name)));
  brushRow.appendChild(rotateChip);

  /* ---------- the player's own saved stamps ---------- */
  function boundingPattern() {
    let minX = state.cols, minY = state.rows, maxX = -1, maxY = -1;
    for (let y = 0; y < state.rows; y++) {
      for (let x = 0; x < state.cols; x++) {
        if (!state.cells[y * state.cols + x]) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    if (maxX < 0) return null;
    // Keep saved stamps small enough that eight of them can never fill the
    // browser's storage box: 24x24 is 25 short strings, about 600 bytes.
    let clipped = false;
    if (maxX - minX > STAMP_MAX - 1) { maxX = minX + STAMP_MAX - 1; clipped = true; }
    if (maxY - minY > STAMP_MAX - 1) { maxY = minY + STAMP_MAX - 1; clipped = true; }
    const out = [];
    for (let y = minY; y <= maxY; y++) {
      let row = "";
      for (let x = minX; x <= maxX; x++) row += state.cells[y * state.cols + x] ? "O" : ".";
      out.push(row);
    }
    return { cells: out, clipped: clipped };
  }

  function refreshMineRow() {
    mineRow.textContent = "";
    state.myPatterns.forEach((m) => {
      mineRow.appendChild(makeBrushChip("my:" + m.id, m.name, "mine"));
      const del = document.createElement("button");
      del.type = "button";
      del.className = "chip del-chip";
      del.textContent = "✕";
      del.setAttribute("aria-label", "Delete the stamp " + m.name);
      del.addEventListener("click", () => {
        state.myPatterns = state.myPatterns.filter((x) => x.id !== m.id);
        if (state.brush === "my:" + m.id) selectBrush("pencil");
        refreshMineRow();
        refreshBrushInfo();
        window.SFX && SFX.nope && SFX.nope();
        scheduleSave();
      });
      mineRow.appendChild(del);
    });
    const save = document.createElement("button");
    save.className = "chip";
    save.id = "saveStampBtn";
    save.textContent = "💾 Save this world";
    save.addEventListener("click", () => {
      const got = boundingPattern();
      if (!got) {
        toast("😴 Nothing to save — draw some cells first!");
        window.SFX && SFX.nope && SFX.nope();
        return;
      }
      const id = String(Date.now()).slice(-7) + "-" + (state.stampSeq + 1);
      state.stampSeq = (state.stampSeq || 0) + 1;
      state.myPatterns.push({ id: id, name: "⭐ Mine " + state.stampSeq, cells: got.cells });
      const dropped = trimMyPatterns();   // never keep more than the cap
      refreshMineRow();
      selectBrush("my:" + id);
      toast(got.clipped
        ? "💾 Saved! It was huge, so the stamp keeps a " + STAMP_MAX + "×" + STAMP_MAX + " corner of it."
        : dropped
          ? "💾 Saved! Only " + MAX_STAMPS + " stamps fit, so your oldest one made way."
          : "💾 Saved! It's now a stamp you can use.");
      window.SFX && SFX.good && SFX.good();
      saveNow();   // write it through now, so a full storage box says so at once
    });
    mineRow.appendChild(save);
  }

  /* ---------- rule lab ---------- */
  const birthRow = $("birthRow");
  const surviveRow = $("surviveRow");

  function makeNumButtons(row, arr) {
    for (let n = 0; n <= 8; n++) {
      const b = document.createElement("button");
      b.className = "num-btn";
      b.textContent = n;
      b.dataset.n = n;
      b.addEventListener("click", () => {
        arr[n] = !arr[n];
        b.setAttribute("aria-pressed", String(arr[n]));
        refreshRuleUI();
        if (inspectCell) showInspect(inspectCell.x, inspectCell.y);
        // Rule Wizard: a hand-made rule that isn't one of the famous recipes
        const rs = ruleString();
        if (state.birth.some(Boolean) && state.survive.some(Boolean) &&
            !PRESETS.some((p) => "B" + p.b.join("") + "/S" + p.s.join("") === rs)) {
          award("wizard");
        }
        scheduleSave();
      });
      row.appendChild(b);
    }
  }
  makeNumButtons(birthRow, state.birth);
  makeNumButtons(surviveRow, state.survive);

  function ruleString() {
    const list = (arr) => arr.map((v, i) => (v ? i : "")).join("");
    return "B" + list(state.birth) + "/S" + list(state.survive);
  }

  function refreshRuleUI() {
    birthRow.querySelectorAll(".num-btn").forEach((b) =>
      b.setAttribute("aria-pressed", String(state.birth[Number(b.dataset.n)])));
    surviveRow.querySelectorAll(".num-btn").forEach((b) =>
      b.setAttribute("aria-pressed", String(state.survive[Number(b.dataset.n)])));
    ruleStringEl.textContent = ruleString();
    const rs = ruleString();
    presetRow.querySelectorAll(".chip").forEach((el) => {
      el.setAttribute("aria-pressed", String(el.dataset.rule === rs));
    });
  }

  const presetRow = $("presetRow");
  PRESETS.forEach((p) => {
    const b = document.createElement("button");
    b.className = "chip";
    b.textContent = p.name;
    b.dataset.rule =
      "B" + p.b.join("") + "/S" + p.s.join("");
    b.addEventListener("click", () => {
      // mutate in place — the number buttons hold references to these arrays
      state.birth.fill(false);
      state.survive.fill(false);
      p.b.forEach((n) => (state.birth[n] = true));
      p.s.forEach((n) => (state.survive[n] = true));
      refreshRuleUI();
      if (inspectCell) showInspect(inspectCell.x, inspectCell.y);
      scheduleSave();
      window.SFX && SFX.good && SFX.good();
    });
    presetRow.appendChild(b);
  });

  /* ---------- size chips ---------- */
  const sizeRow = $("sizeRow");
  Object.keys(SIZES).forEach((key) => {
    const b = document.createElement("button");
    b.className = "chip";
    b.textContent = SIZES[key].label;
    b.dataset.size = key;
    b.setAttribute("aria-pressed", String(key === state.sizeKey));
    b.addEventListener("click", () => {
      if (key === state.sizeKey) return;
      state.sizeKey = key;
      allocate(SIZES[key].cols, SIZES[key].rows, true);
      // the old fingerprints and the old rewind film belong to a grid that
      // no longer exists — start both again on the new one
      forgetHistory();
      forgetPast();
      resetPopHist();
      pushPop(population());
      resizeCanvas();
      sizeRow.querySelectorAll(".chip").forEach((el) => el.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
      updateStats();
      scheduleSave();
    });
    sizeRow.appendChild(b);
  });

  function refreshSizeUI() {
    sizeRow.querySelectorAll(".chip").forEach((el) =>
      el.setAttribute("aria-pressed", String(el.dataset.size === state.sizeKey)));
  }

  /* ---------- discovery badges UI ---------- */
  const badgeGrid = $("badgeGrid");
  const badgeCount = $("badgeCount");
  const toastEl = $("toast");
  let toastTimer = null;

  BADGES.forEach((b) => {
    const el = document.createElement("div");
    el.className = "badge";
    el.dataset.key = b.key;
    el.innerHTML =
      '<span class="b-emoji">' + b.emoji + "</span>" +
      '<span><span class="b-name">' + b.name + "</span>" +
      '<br><span class="b-desc">' + b.desc + "</span></span>";
    badgeGrid.appendChild(el);
  });

  function refreshBadges() {
    badgeGrid.querySelectorAll(".badge").forEach((el) =>
      el.classList.toggle("earned", !!state.badges[el.dataset.key]));
    const n = BADGES.filter((b) => state.badges[b.key]).length;
    badgeCount.textContent = "— " + n + " of " + BADGES.length + " earned";
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3400);
  }

  function party(count) {
    if (REDUCE) return;   // respect "reduce motion"
    window.Confetti && Confetti.burst && Confetti.burst({ count: count || 70 });
  }

  function award(key) {
    if (state.badges[key]) return;
    state.badges[key] = true;
    const b = BADGES.find((x) => x.key === key);
    toast("🏅 Discovery! " + b.emoji + " " + b.name);
    window.SFX && SFX.win && SFX.win();
    party(70);
    refreshBadges();
    scheduleSave();
  }

  /* ================= 🔮 PREDICT THE NEXT GENERATION =================
     The heart of the learning. We show a small world, the player marks
     which squares they think will be alive next turn, and the game marks
     it — showing the neighbour count on every square they got wrong.
     Puzzles always run Conway's original B3/S23 so the lesson is stable
     even when the Rule Lab is set to something silly. */
  // 6x6 is deliberate: on a 390px phone that makes every square about
  // 48px across — a real tap target for a six-year-old — while still
  // leaving a one-square margin so the answer is exact.
  const PSIZE = 6;
  const P_BIRTH = new Array(9).fill(false); P_BIRTH[3] = true;
  const P_SURV  = new Array(9).fill(false); P_SURV[2] = P_SURV[3] = true;

  const PUZZLE_SEEDS = [
    ["OOO"],
    ["OO", "OO"],
    [".O.", "O.O", ".O."],
    ["OO.", "O.O", ".O."],
    [".O.", "..O", "OOO"],
    ["OO.", ".OO"],
    [".OOO", "OOO."],
    ["O.O", ".O.", "O.O"],
    ["OOO", ".O."],
    ["O..", ".O.", "..O"],
    ["OO", "O.", "O."],
    [".OO.", "O..O", ".OO."],
  ];

  const pboardEl = $("pboard");
  const predResult = $("predResult");
  const predStreakEl = $("predStreak");
  const predBestEl = $("predBest");
  let predBoard = new Uint8Array(PSIZE * PSIZE);   // the generation shown
  let predGuess = new Uint8Array(PSIZE * PSIZE);   // what the player says
  let predAnswer = new Uint8Array(PSIZE * PSIZE);  // the truth
  let predChecked = false, predRevealed = false;
  const pcells = [];

  pboardEl.style.gridTemplateColumns = "repeat(" + PSIZE + ", 1fr)";
  for (let i = 0; i < PSIZE * PSIZE; i++) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pcell";
    b.dataset.i = i;
    b.addEventListener("click", () => {
      predGuess[i] = predGuess[i] ? 0 : 1;
      predChecked = false;
      predRevealed = false;
      predResult.textContent = "";
      predResult.className = "predict-result";
      renderPBoard();
      window.SFX && SFX.pop && SFX.pop();
    });
    pcells.push(b);
    pboardEl.appendChild(b);
  }

  function renderPBoard() {
    for (let i = 0; i < pcells.length; i++) {
      const b = pcells[i];
      const x = i % PSIZE, y = (i / PSIZE) | 0;
      const wasAlive = !!predBoard[i];
      const right = predGuess[i] === predAnswer[i];
      b.className = "pcell" + (wasAlive ? " was" : "") +
                    (predChecked ? (right ? " right" : " wrong") : "");
      b.setAttribute("aria-pressed", String(!!predGuess[i]));
      if (predChecked && !right) {
        b.textContent = String(countNeighbours(predBoard, PSIZE, PSIZE, x, y, false));
      } else {
        b.textContent = "";
      }
      b.setAttribute("aria-label",
        "Row " + (y + 1) + " column " + (x + 1) + ", " +
        (wasAlive ? "alive now" : "empty now") + ", " +
        (predGuess[i] ? "you predict alive" : "you predict empty") +
        (predChecked ? (right ? ", correct" : ", wrong") : ""));
    }
  }

  function newPuzzle() {
    predBoard = new Uint8Array(PSIZE * PSIZE);
    const seed = PUZZLE_SEEDS[Math.floor(Math.random() * PUZZLE_SEEDS.length)];
    const h = seed.length, w = seed[0].length;
    const ox = 1 + Math.floor(Math.random() * Math.max(1, PSIZE - 1 - w));
    const oy = 1 + Math.floor(Math.random() * Math.max(1, PSIZE - 1 - h));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (seed[y][x] === "O") predBoard[(oy + y) * PSIZE + (ox + x)] = 1;
      }
    }
    // once you're on a roll, sprinkle a couple of extra cells to think about
    if (state.predStreak >= 2) {
      for (let k = 0; k < 2; k++) {
        const x = 1 + Math.floor(Math.random() * (PSIZE - 2));
        const y = 1 + Math.floor(Math.random() * (PSIZE - 2));
        predBoard[y * PSIZE + x] = 1;
      }
    }
    predAnswer = stepBoard(predBoard, PSIZE, PSIZE, P_BIRTH, P_SURV, false);
    predGuess = predBoard.slice();     // start from "nothing changes"
    predChecked = false;
    predRevealed = false;
    predResult.textContent = "Yellow dashed squares are alive right now. Tap to show what's alive NEXT turn.";
    predResult.className = "predict-result";
    renderPBoard();
  }

  function checkPuzzle() {
    let right = 0;
    for (let i = 0; i < predAnswer.length; i++) if (predGuess[i] === predAnswer[i]) right++;
    predChecked = true;
    const total = predAnswer.length;
    const perfect = right === total;
    if (perfect && !predRevealed) {
      state.predStreak++;
      if (state.predStreak > state.predBest) state.predBest = state.predStreak;
      predResult.textContent = "🎉 Perfect! All " + total + " squares right. Streak " + state.predStreak + "!";
      predResult.className = "predict-result good";
      window.SFX && SFX.win && SFX.win();
      party(60);
      if (state.predStreak >= 3) award("seer");
    } else if (perfect) {
      predResult.textContent = "👀 That's the right answer — now try the next one without peeking!";
      predResult.className = "predict-result good";
    } else {
      state.predStreak = 0;
      const wrong = total - right;
      predResult.textContent = "You got " + right + " of " + total + " right. The " + wrong +
        " red square" + (wrong === 1 ? "" : "s") + " show" + (wrong === 1 ? "s" : "") +
        " their neighbour count — check each one against the rule: born on 3, survive on 2 or 3.";
      predResult.className = "predict-result bad";
      window.SFX && SFX.nope && SFX.nope();
    }
    renderPBoard();
    refreshPredStats();
    scheduleSave();
  }

  function refreshPredStats() {
    predStreakEl.textContent = state.predStreak;
    predBestEl.textContent = state.predBest;
  }

  $("newPuzzleBtn").addEventListener("click", () => { newPuzzle(); refreshPredStats(); });
  $("checkBtn").addEventListener("click", checkPuzzle);
  $("resetPredBtn").addEventListener("click", () => {
    predGuess = predBoard.slice();
    predChecked = false;
    predResult.textContent = "Back to the start — every square set to how it looks right now.";
    predResult.className = "predict-result";
    renderPBoard();
  });
  $("showBtn").addEventListener("click", () => {
    predGuess = predAnswer.slice();
    predChecked = true;
    predRevealed = true;
    state.predStreak = 0;
    predResult.textContent = "👀 Here's the answer. Look at each square that changed and count its neighbours — that's the whole secret.";
    predResult.className = "predict-result";
    renderPBoard();
    refreshPredStats();
    scheduleSave();
  });

  /* ---------- save / load ----------
     Everything lives in ONE localStorage record, and the whole arcade
     shares a single origin — so the box really can fill up. Three defences:
       1. hard caps, so this game's record can never grow without limit;
       2. if the browser still refuses, drop the world (much the biggest
          field) and keep the badges, stamps, rule and best streak;
       3. if even that fails, say so once, in words a child can read,
          instead of failing silently. */
  const MAX_STAMPS = 8;         // saved stamps kept, oldest thrown away first
  const STAMP_BUDGET = 24000;   // …and a hard ceiling on their total size
  let saveTimer = null;
  let storageComplained = false;

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 500);
  }

  /* Enforce the caps. Returns true if anything had to be thrown away. */
  function trimMyPatterns() {
    let dropped = false;
    if (state.myPatterns.length > MAX_STAMPS) {
      state.myPatterns.splice(0, state.myPatterns.length - MAX_STAMPS);
      dropped = true;
    }
    while (state.myPatterns.length > 1 &&
           JSON.stringify(state.myPatterns).length > STAMP_BUDGET) {
      state.myPatterns.shift();
      dropped = true;
    }
    return dropped;
  }

  function saveRecord(includeWorld) {
    const live = [];
    if (includeWorld) {
      for (let i = 0; i < state.cells.length; i++) if (state.cells[i]) live.push(i);
    }
    return {
      sizeKey: state.sizeKey,
      cols: state.cols,
      rows: state.rows,
      live: live,
      birth: state.birth,
      survive: state.survive,
      wrap: state.wrap,
      speed: state.speed,
      generation: includeWorld ? state.generation : 0,
      badges: state.badges,
      stampsUsed: state.stampsUsed,
      brush: state.brush,
      rot: state.rot,
      myPatterns: state.myPatterns,
      stampSeq: state.stampSeq,
      inspected: state.inspected,
      predStreak: state.predStreak,
      predBest: state.predBest,
    };
  }

  /* One friendly message per visit — never a wall of repeated toasts. */
  function storageTrouble(msg) {
    if (storageComplained) return;
    storageComplained = true;
    toast(msg);
  }

  function saveNow() {
    trimMyPatterns();
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(saveRecord(true)));
      storageComplained = false;
      return true;
    } catch (e) {
      // The list of living cells is by far the biggest thing we store.
      // Give it up so the badges, stamps and best streak still survive.
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(saveRecord(false)));
        storageTrouble("💾 Your world is too big to save, so only your badges and stamps will come back.");
        return true;
      } catch (e2) {
        storageTrouble("💾 This browser's memory box is full, so today can't be saved. Everything still works!");
        return false;
      }
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      if (!d || !SIZES[d.sizeKey] || !Array.isArray(d.live)) return false;
      state.sizeKey = d.sizeKey;
      allocate(SIZES[d.sizeKey].cols, SIZES[d.sizeKey].rows, false);
      // Only trust the saved cell list if it was written for this exact
      // grid — otherwise the indices would land in the wrong squares.
      const gridMatches = (d.cols === undefined && d.rows === undefined) ||
        (d.cols === state.cols && d.rows === state.rows);
      if (gridMatches) {
        d.live.forEach((i) => {
          if (i >= 0 && i < state.cells.length) {
            state.cells[i] = 1;
            state.age[i] = 1;
            state.energy[i] = 1;
          }
        });
      }
      if (Array.isArray(d.birth) && d.birth.length === 9)
        d.birth.forEach((v, i) => (state.birth[i] = !!v));
      if (Array.isArray(d.survive) && d.survive.length === 9)
        d.survive.forEach((v, i) => (state.survive[i] = !!v));
      state.wrap = d.wrap !== false;
      state.speed = Math.min(30, Math.max(1, Number(d.speed) || 10));
      state.generation = Number(d.generation) || 0;
      if (d.badges && typeof d.badges === "object") state.badges = Object.assign({}, d.badges);
      if (d.stampsUsed && typeof d.stampsUsed === "object") state.stampsUsed = Object.assign({}, d.stampsUsed);
      if (d.inspected && typeof d.inspected === "object") state.inspected = Object.assign({}, d.inspected);
      if (Array.isArray(d.myPatterns)) {
        state.myPatterns = d.myPatterns.filter((m) =>
          m && typeof m.id === "string" && typeof m.name === "string" &&
          Array.isArray(m.cells) && m.cells.length && m.cells.length <= STAMP_MAX &&
          m.cells.every((r) => typeof r === "string" && r.length <= STAMP_MAX)
        ).slice(-MAX_STAMPS);
        trimMyPatterns();
      }
      state.stampSeq = Math.max(state.myPatterns.length,
        Math.min(99999, Math.max(0, Number(d.stampSeq) || 0)));
      state.rot = Math.max(0, Math.min(3, Number(d.rot) || 0));
      if (typeof d.brush === "string" &&
          (PATTERNS.some((p) => p.key === d.brush) ||
           state.myPatterns.some((m) => "my:" + m.id === d.brush))) {
        state.brush = d.brush;
      }
      state.predStreak = Math.max(0, Number(d.predStreak) || 0);
      state.predBest = Math.max(0, Number(d.predBest) || 0);
      return true;
    } catch (e) {
      return false;
    }
  }

  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveNow();
  });

  /* ---------- boot ---------- */
  const restored = load();
  if (!restored) {
    // Phones get the Tiny world by default: 24 columns means fat, juicy
    // squares you can actually hit with a three-year-old's finger.
    state.sizeKey = (window.innerWidth || 1024) < 560 ? "tiny" : "medium";
    allocate(SIZES[state.sizeKey].cols, SIZES[state.sizeKey].rows, false);
    seedShowcase();
  }
  speedInput.value = state.speed;
  speedLabel.textContent = state.speed;
  wrapToggle.checked = state.wrap;
  refreshRuleUI();
  refreshSizeUI();
  refreshBadges();
  refreshMineRow();
  refreshBrushInfo();
  refreshPredStats();
  newPuzzle();
  resizeCanvas();
  updateStats();
  pushPop(population());
  // A world you came back to stays PAUSED so your drawing is still there
  // when you look at it; a brand-new showcase world plays straight away.
  setPlaying(!restored);
  if (restored) {
    worldMsg.hidden = false;
    worldMsg.textContent = "👋 Welcome back — your world is exactly where you left it. Press ▶️ Play!";
  }

  if (window.ResizeObserver) {
    new ResizeObserver(() => { resizeCanvas(); resizeGraph(); }).observe(canvas.parentElement);
  } else {
    window.addEventListener("resize", () => { resizeCanvas(); resizeGraph(); });
  }

  requestAnimationFrame((t) => { lastT = t; requestAnimationFrame(frame); });
})();
