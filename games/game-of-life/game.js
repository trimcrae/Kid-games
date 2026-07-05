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

  const SIZES = {
    small:  { label: "🟩 Small",  cols: 48,  rows: 30 },
    medium: { label: "🟨 Medium", cols: 72,  rows: 45 },
    large:  { label: "🟦 Big",    cols: 108, rows: 68 },
  };

  /* Patterns are drawn with O = alive. Stamped centred on the tap. */
  const PATTERNS = [
    { key: "pencil", name: "✏️ Pencil", cells: null },
    { key: "glider", name: "🚀 Glider", cells: [
      ".O.",
      "..O",
      "OOO",
    ]},
    { key: "lwss", name: "🛸 Spaceship", cells: [
      ".O..O",
      "O....",
      "O...O",
      "OOOO.",
    ]},
    { key: "rpent", name: "🌪️ Chaos Seed", cells: [
      ".OO",
      "OO.",
      ".O.",
    ]},
    { key: "acorn", name: "🌰 Acorn", cells: [
      ".O.....",
      "...O...",
      "OO..OOO",
    ]},
    { key: "pulsar", name: "💫 Pulsar", cells: [
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
    { key: "penta", name: "⚡ Sparkler", cells: [
      "..O....O..",
      "OO.OOOO.OO",
      "..O....O..",
    ]},
    { key: "gun", name: "🏭 Glider Factory", cells: [
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

  /* ---------- simulation ---------- */
  function step() {
    const { cols, rows, cells, next, age, colorIdx, birth, survive, wrap } = state;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
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
        const i = y * cols + x;
        next[i] = cells[i] ? (survive[n] ? 1 : 0) : (birth[n] ? 1 : 0);
      }
    }
    // commit + bookkeeping
    for (let i = 0; i < cells.length; i++) {
      if (next[i]) {
        age[i] = cells[i] ? Math.min(age[i] + 1, 60000) : 1;
        colorIdx[i] = colorIndexForAge(age[i]);
      } else {
        age[i] = 0;
      }
      cells[i] = next[i];
    }
    state.generation++;
  }

  function population() {
    let p = 0;
    const c = state.cells;
    for (let i = 0; i < c.length; i++) p += c[i];
    return p;
  }

  function updateStats() {
    genCountEl.textContent = state.generation;
    popCountEl.textContent = population();
  }

  /* ---------- painting & stamping ---------- */
  function setCell(x, y, v) {
    if (x < 0 || x >= state.cols || y < 0 || y >= state.rows) return;
    const i = y * state.cols + x;
    state.cells[i] = v;
    state.age[i] = v ? 1 : 0;
    if (v) state.colorIdx[i] = 0;
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
  }

  function clearWorld() {
    state.cells.fill(0);
    state.age.fill(0);
    state.generation = 0;
  }

  /* First visit: a glider factory already at work, plus a pulsar —
     the world should feel alive the moment the page opens. */
  function seedShowcase() {
    clearWorld();
    const gun = PATTERNS.find((p) => p.key === "gun").cells;
    const pulsar = PATTERNS.find((p) => p.key === "pulsar").cells;
    const glider = PATTERNS.find((p) => p.key === "glider").cells;
    stampPattern(gun, Math.floor(state.cols * 0.3), Math.floor(state.rows * 0.22));
    stampPattern(pulsar, Math.floor(state.cols * 0.72), Math.floor(state.rows * 0.68));
    stampPattern(glider, Math.floor(state.cols * 0.18), Math.floor(state.rows * 0.75));
  }

  /* ---------- canvas sizing & static grid layer ---------- */
  let dpr = 1, cssW = 0, cssH = 0, cellPx = 0;
  const gridLayer = document.createElement("canvas");

  function resizeCanvas() {
    const w = canvas.parentElement.clientWidth - 0; // panel padding already outside
    if (w <= 0) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cssW = w;
    cellPx = cssW / state.cols;
    cssH = Math.round(cellPx * state.rows);
    canvas.style.height = cssH + "px";
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    buildGridLayer();
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
    const k = 1 - Math.exp(-dt * 14);
    const { cells, energy } = state;
    for (let i = 0; i < cells.length; i++) {
      energy[i] += (cells[i] - energy[i]) * k;
    }

    draw();
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

    // ghost preview of the selected stamp under the pointer
    if (hoverCell && state.brush !== "pencil") {
      const pat = PATTERNS.find((p) => p.key === state.brush).cells;
      const h = pat.length, w = pat[0].length;
      let ox = hoverCell.x - Math.floor(w / 2);
      let oy = hoverCell.y - Math.floor(h / 2);
      ox = Math.max(0, Math.min(cols - w, ox));
      oy = Math.max(0, Math.min(rows - h, oy));
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (pat[y][x] !== "O") continue;
          ctx.fillRect((ox + x) * cellPx + 1, (oy + y) * cellPx + 1, cellPx - 2, cellPx - 2);
        }
      }
    } else if (hoverCell) {
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 2;
      ctx.strokeRect(hoverCell.x * cellPx + 1, hoverCell.y * cellPx + 1, cellPx - 2, cellPx - 2);
    }
  }

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
    const c = cellFromEvent(ev);
    if (!c) return;
    canvas.setPointerCapture(ev.pointerId);
    if (state.brush === "pencil") {
      painting = true;
      paintValue = state.cells[c.y * state.cols + c.x] ? 0 : 1;
      setCell(c.x, c.y, paintValue);
      lastPaint = c;
    } else {
      const pat = PATTERNS.find((p) => p.key === state.brush).cells;
      stampPattern(pat, c.x, c.y);
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

  $("stepBtn").addEventListener("click", () => {
    setPlaying(false);
    step();
    updateStats();
    scheduleSave();
  });

  $("randomBtn").addEventListener("click", () => {
    randomize();
    updateStats();
    scheduleSave();
    window.SFX && SFX.good && SFX.good();
  });

  $("clearBtn").addEventListener("click", () => {
    setPlaying(false);
    clearWorld();
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
    scheduleSave();
  });

  window.addEventListener("keydown", (ev) => {
    if (ev.code === "Space" && ev.target === document.body) {
      ev.preventDefault();
      setPlaying(!state.playing);
    }
  });

  /* ---------- brush chips ---------- */
  const brushRow = $("brushRow");
  PATTERNS.forEach((p) => {
    const b = document.createElement("button");
    b.className = "chip";
    b.textContent = p.name;
    b.setAttribute("aria-pressed", String(p.key === state.brush));
    b.addEventListener("click", () => {
      state.brush = p.key;
      brushRow.querySelectorAll(".chip").forEach((el) => el.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
    });
    brushRow.appendChild(b);
  });

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

  /* ---------- save / load ---------- */
  let saveTimer = null;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 500);
  }

  function saveNow() {
    try {
      const live = [];
      for (let i = 0; i < state.cells.length; i++) if (state.cells[i]) live.push(i);
      localStorage.setItem(STORE_KEY, JSON.stringify({
        sizeKey: state.sizeKey,
        live,
        birth: state.birth,
        survive: state.survive,
        wrap: state.wrap,
        speed: state.speed,
        generation: state.generation,
      }));
    } catch (e) { /* storage full or blocked — no problem */ }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      if (!d || !SIZES[d.sizeKey] || !Array.isArray(d.live)) return false;
      state.sizeKey = d.sizeKey;
      allocate(SIZES[d.sizeKey].cols, SIZES[d.sizeKey].rows, false);
      d.live.forEach((i) => {
        if (i >= 0 && i < state.cells.length) {
          state.cells[i] = 1;
          state.age[i] = 1;
        }
      });
      if (Array.isArray(d.birth) && d.birth.length === 9)
        d.birth.forEach((v, i) => (state.birth[i] = !!v));
      if (Array.isArray(d.survive) && d.survive.length === 9)
        d.survive.forEach((v, i) => (state.survive[i] = !!v));
      state.wrap = d.wrap !== false;
      state.speed = Math.min(30, Math.max(1, Number(d.speed) || 10));
      state.generation = Number(d.generation) || 0;
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
    allocate(SIZES[state.sizeKey].cols, SIZES[state.sizeKey].rows, false);
    seedShowcase();
  }
  speedInput.value = state.speed;
  speedLabel.textContent = state.speed;
  wrapToggle.checked = state.wrap;
  refreshRuleUI();
  refreshSizeUI();
  resizeCanvas();
  updateStats();
  setPlaying(true);

  if (window.ResizeObserver) {
    new ResizeObserver(() => resizeCanvas()).observe(canvas.parentElement);
  } else {
    window.addEventListener("resize", resizeCanvas);
  }

  requestAnimationFrame((t) => { lastT = t; requestAnimationFrame(frame); });
})();
