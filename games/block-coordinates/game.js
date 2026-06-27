/* ===========================================================
   Block Coordinates  —  a Minecraft-themed coordinate-plane
   builder for Cory (and anyone who likes blocks!).

   Teaches: reading & plotting (X, Y) coordinates on a grid —
   column first (X, →), then row (Y, ↑). Origin is the
   bottom-left corner, just like the math coordinate plane.

   Pure vanilla JS, no build step. Blocks are drawn with CSS
   (no image files). Progress saved in localStorage.
   =========================================================== */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const sfx = (m, ...a) => { try { if (window.SFX && SFX[m]) SFX[m](...a); } catch (e) {} };
  const reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- chunky block sound (local Web Audio) ---------------- */
  const Sound = (() => {
    let ctx = null;
    function ac() {
      try {
        if (!ctx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return null;
          ctx = new AC();
        }
        if (ctx.state === "suspended" && ctx.resume) ctx.resume();
        return ctx;
      } catch (e) { return null; }
    }
    function blip(freq, dur, type, gain) {
      const c = ac(); if (!c) return;
      try {
        const o = c.createOscillator(), g = c.createGain();
        o.type = type || "square";
        o.frequency.value = freq;
        o.connect(g); g.connect(c.destination);
        const t = c.currentTime;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain || 0.1, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.start(t); o.stop(t + dur + 0.02);
      } catch (e) {}
    }
    return {
      // a satisfying "thock" that rises a little with your streak
      place(streak) {
        if (reduceMotion) return;
        const base = 150 + Math.min(streak || 0, 14) * 12;
        blip(base, 0.09, "square", 0.09);
        blip(base * 0.6, 0.13, "triangle", 0.07);
      },
      dig() { if (reduceMotion) return; blip(95, 0.18, "sawtooth", 0.07); },
      gem() { if (reduceMotion) return; blip(880, 0.1, "sine", 0.12); blip(1320, 0.16, "sine", 0.09); },
    };
  })();

  /* ---------------- block colours (for dust, previews, swatches) ---------------- */
  const TYPE_COLOR = {
    grass: "#74b24a", dirt: "#7c5235", stone: "#9a9a9a", cobble: "#8a8a8a",
    planks: "#b3823f", log: "#6e4a28", leaves: "#3f8a34", diamond: "#56d6d0",
    gold: "#f0c63f", red: "#cf3b3b", water: "#3f7fd6", sand: "#e3d49a",
    purple: "#9a55cf", black: "#2a2436", white: "#ece7dc", pink: "#e58cb6",
  };
  const blockHTML = (type, extra) =>
    `<i class="b b-${type}${extra ? " " + extra : ""}"></i>`;

  /* ---------------- save / load ---------------- */
  const KEY = "block-coordinates.v2";
  const defaults = () => ({
    done: {}, numbersOn: true, treasureBest: null, free: null,
  });
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(defaults(), JSON.parse(raw));
    } catch (e) {}
    return defaults();
  }
  let save = load();
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }

  /* ---------------- blueprints ----------------
     Art rows are typed top → bottom; '.' is empty.
     Each letter maps (via the level's legend) to a block type. */
  const LEVELS = [
    {
      id: "heart", name: "Heart", emoji: "❤️", size: 6,
      legend: { R: "red" },
      art: ["RR..RR", "RRRRRR", "RRRRRR", ".RRRR.", "..RR..", "......"],
    },
    {
      id: "tree", name: "Tree", emoji: "🌳", size: 6,
      legend: { G: "leaves", W: "log" },
      art: [".GGGG.", "GGGGGG", "GGGGGG", ".GGGG.", "..WW..", "..WW.."],
    },
    {
      id: "creeper", name: "Creeper", emoji: "🟩", size: 6,
      legend: { G: "grass", K: "black" },
      art: ["GGGGGG", "GKKGKK", "GKKGKK", "GGKKGG", "GKKKKG", "GGGGGG"],
    },
    {
      id: "house", name: "House", emoji: "🏠", size: 8,
      legend: { R: "red", O: "planks", B: "water", D: "log" },
      art: [
        "...RR...", "..RRRR..", ".RRRRRR.", "RRRRRRRR",
        "OOOOOOOO", "OBOOOOBO", "OOODDOOO", "OOODDOOO",
      ],
    },
    {
      id: "sword", name: "Sword", emoji: "🗡️", size: 8,
      legend: { B: "diamond", Y: "gold", W: "log" },
      art: [
        "...BB...", "...BB...", "...BB...", "...BB...",
        "..YYYY..", "...WW...", "...WW...", "...WW...",
      ],
    },
    {
      id: "diamond", name: "Diamond", emoji: "💎", size: 10,
      legend: { B: "diamond", S: "white" },
      art: [
        "....BB....", "...BBBB...", "..BBSBBB..", ".BBBBBBBB.", "BBBBBBBBBB",
        "BBBBBBBBBB", ".BBBBBBBB.", "..BBBBBB..", "...BBBB...", "....BB....",
      ],
    },
    {
      id: "flower", name: "Flower", emoji: "🌸", size: 10,
      legend: { P: "purple", Y: "gold", G: "grass", W: "dirt" },
      art: [
        "....PP....", "...PYYP...", "..PPYYPP..", "...PPPP...", "....GG....",
        "...GGGG...", "....GG....", "....GG....", "....GG....", "WWWWWWWWWW",
      ],
    },
  ];

  // Build order: ground up (low Y first), then left → right.
  function cellsOf(lvl) {
    const H = lvl.art.length;
    const out = [];
    lvl.art.forEach((row, i) => {
      const y = H - i;
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        if (ch && ch !== "." && ch !== " ") {
          out.push({ x: c + 1, y, type: lvl.legend[ch] || "stone" });
        }
      }
    });
    out.sort((a, b) => a.y - b.y || a.x - b.x);
    return out;
  }

  // a tiny non-interactive preview of a blueprint
  function miniGrid(lvl, px) {
    const H = lvl.art.length, W = lvl.art[0].length;
    const wrap = document.createElement("div");
    wrap.className = "mini";
    wrap.style.gridTemplateColumns = `repeat(${W}, ${px}px)`;
    wrap.style.gridTemplateRows = `repeat(${H}, ${px}px)`;
    lvl.art.forEach((row) => {
      for (const ch of row) {
        const i = document.createElement("i");
        if (ch && ch !== "." && ch !== " ") {
          i.className = "mb";
          i.style.setProperty("--c", TYPE_COLOR[lvl.legend[ch]] || "#888");
        }
        wrap.appendChild(i);
      }
    });
    return wrap;
  }

  /* ---------------- block placement + particles ---------------- */
  function place(cell, type, animate) {
    cell.classList.add("filled");
    cell.classList.remove("plan");
    cell.innerHTML = blockHTML(type, animate && !reduceMotion ? "drop" : "");
    if (animate) dust(cell, TYPE_COLOR[type] || "#fff");
  }
  function dust(cell, color) {
    if (reduceMotion) return;
    const r = cell.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const sz = Math.max(4, r.width * 0.16);
    for (let i = 0; i < 6; i++) {
      const d = document.createElement("i");
      d.className = "dust";
      d.style.width = sz + "px"; d.style.height = sz + "px";
      d.style.background = color;
      d.style.left = cx + "px"; d.style.top = cy + "px";
      d.style.transition = "transform .5s ease-out, opacity .5s ease-out";
      document.body.appendChild(d);
      const ang = Math.random() * Math.PI * 2;
      const dist = r.width * (0.5 + Math.random());
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist - r.height * 0.4;
      requestAnimationFrame(() => {
        d.style.transform = `translate(${dx}px, ${dy}px)`;
        d.style.opacity = "0";
      });
      setTimeout(() => d.remove(), 520);
    }
  }
  function bounce(cell) {
    const b = cell.querySelector(".b");
    if (!b || reduceMotion) return;
    b.classList.remove("drop"); void b.offsetWidth; b.classList.add("drop");
  }
  function shake(cell) {
    if (reduceMotion) return;
    cell.classList.remove("shake"); void cell.offsetWidth; cell.classList.add("shake");
  }
  function say(msg) { const s = $("say"); if (s) s.textContent = msg || ""; }

  function sparkle(emoji) {
    if (reduceMotion) return;
    const chars = ["✨", emoji, "⭐", "💚", "✨"];
    for (let i = 0; i < 16; i++) {
      const s = document.createElement("span");
      s.textContent = chars[i % chars.length];
      s.style.cssText =
        "position:fixed;left:" + (10 + Math.random() * 80) + "vw;top:" +
        (18 + Math.random() * 40) + "vh;font-size:" + (1.4 + Math.random() * 1.7) +
        "rem;pointer-events:none;z-index:70;transition:transform 1s ease,opacity 1s ease;";
      document.body.appendChild(s);
      requestAnimationFrame(() => {
        s.style.transform = "translateY(-130px) rotate(" + (Math.random() * 180 - 90) + "deg)";
        s.style.opacity = "0";
      });
      setTimeout(() => s.remove(), 1100);
    }
  }

  /* ---------------- shared board widget ---------------- */
  function makeBoard(n, onTap) {
    const board = document.createElement("div");
    board.className = "board";
    board.style.setProperty("--n", n);
    if (!save.numbersOn) board.classList.add("nonums");

    const cellMap = {}, xLabels = {}, yLabels = {};

    for (let r = 0; r < n; r++) {
      const y = n - r;
      const yl = document.createElement("div");
      yl.className = "axis y"; yl.textContent = y; yLabels[y] = yl;
      board.appendChild(yl);
      for (let x = 1; x <= n; x++) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "cell";
        cell.dataset.x = x; cell.dataset.y = y;
        cell.setAttribute("aria-label", `column ${x}, row ${y}`);
        cell.addEventListener("click", () => onTap(x, y, cell));
        cell.addEventListener("mouseenter", () => trace(x, y, true));
        cell.addEventListener("mouseleave", () => trace(x, y, false));
        cellMap[x + "," + y] = cell;
        board.appendChild(cell);
      }
    }
    const corner = document.createElement("div");
    corner.className = "corner"; corner.textContent = "y/x";
    board.appendChild(corner);
    for (let x = 1; x <= n; x++) {
      const xl = document.createElement("div");
      xl.className = "axis x"; xl.textContent = x; xLabels[x] = xl;
      board.appendChild(xl);
    }

    function size() {
      const host = $("app");
      const avail = Math.min((host && host.clientWidth) || 360, 560);
      const cell = Math.max(26, Math.min(58, Math.floor((avail - 40) / n) - 2));
      board.style.setProperty("--cell", cell + "px");
    }
    function litAxis(x, y, on) {
      [xLabels[x], yLabels[y]].forEach((el) => el && el.classList.toggle("lit", !!on));
    }
    // highlight the whole row & column — "count across, then up"
    function trace(x, y, on) {
      for (let i = 1; i <= n; i++) {
        const a = cellMap[x + "," + i], b = cellMap[i + "," + y];
        if (a) a.classList.toggle("trace", on);
        if (b) b.classList.toggle("trace", on);
      }
      litAxis(x, y, on);
    }
    return { board, cellMap, xLabels, yLabels, size, litAxis, trace };
  }

  /* ---------------- keyboard cursor (accessibility) ---------------- */
  let kbCursor = null;
  function enableCursor(n, ctx, tap) { kbCursor = { x: 1, y: 1, n, ctx, tap }; paintCursor(); }
  function disableCursor() {
    if (kbCursor) kbCursor.ctx.trace(kbCursor.x, kbCursor.y, false);
    kbCursor = null;
  }
  function paintCursor(prev) {
    if (!kbCursor) return;
    Object.values(kbCursor.ctx.cellMap).forEach((c) => c.classList.remove("cursor"));
    if (prev) kbCursor.ctx.trace(prev.x, prev.y, false);
    kbCursor.ctx.trace(kbCursor.x, kbCursor.y, true);
    const c = kbCursor.ctx.cellMap[kbCursor.x + "," + kbCursor.y];
    if (c) c.classList.add("cursor");
  }
  document.addEventListener("keydown", (e) => {
    if (!kbCursor) return;
    const prev = { x: kbCursor.x, y: kbCursor.y };
    const k = e.key;
    if (k === "ArrowRight") kbCursor.x = Math.min(kbCursor.n, kbCursor.x + 1);
    else if (k === "ArrowLeft") kbCursor.x = Math.max(1, kbCursor.x - 1);
    else if (k === "ArrowUp") kbCursor.y = Math.min(kbCursor.n, kbCursor.y + 1);
    else if (k === "ArrowDown") kbCursor.y = Math.max(1, kbCursor.y - 1);
    else if (k === "Enter" || k === " ") {
      const cell = kbCursor.ctx.cellMap[kbCursor.x + "," + kbCursor.y];
      if (cell) kbCursor.tap(kbCursor.x, kbCursor.y, cell);
      e.preventDefault(); return;
    } else return;
    e.preventDefault();
    paintCursor(prev);
  });

  let boardCtx = null;
  window.addEventListener("resize", () => { if (boardCtx) boardCtx.size(); });

  /* ============================================================
     SCREENS
     ============================================================ */
  const app = $("app");
  function clearScreen() { disableCursor(); boardCtx = null; app.innerHTML = ""; say(""); }

  /* ---------- menu ---------- */
  function renderMenu() {
    clearScreen();
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <p class="intro">
        Read the grid like Minecraft! Every block has a spot:
        <b>(X, Y)</b> means count <b>across →</b> then <b>up ↑</b>
        from the bottom-left corner. Build pictures, dig for treasure,
        or make whatever you like.
      </p>
      <div class="mode-grid">
        <button class="mode-btn" id="m-build" style="--accent:var(--green)">
          <span class="big">🏗️</span><span class="name">Build</span>
          <span class="desc">Follow the blueprint to make a picture</span>
        </button>
        <button class="mode-btn" id="m-treasure" style="--accent:var(--blue)">
          <span class="big">💎</span><span class="name">Treasure Dig</span>
          <span class="desc">Read the clue, dig the right spot</span>
        </button>
        <button class="mode-btn" id="m-free" style="--accent:var(--purple)">
          <span class="big">🧱</span><span class="name">Free Build</span>
          <span class="desc">Place any blocks you want</span>
        </button>
      </div>`;
    app.appendChild(wrap);
    $("m-build").onclick = renderLevelPicker;
    $("m-treasure").onclick = startTreasure;
    $("m-free").onclick = startFree;
  }

  /* ---------- build: level picker ---------- */
  function renderLevelPicker() {
    clearScreen();
    const stars = LEVELS.filter((l) => save.done[l.id]).length;
    const head = document.createElement("div");
    head.innerHTML = `
      <button class="pill" id="back-menu">← Modes</button>
      <p class="intro" style="margin-top:1rem">
        Pick a blueprint to build. You've earned <b>${stars} ⭐</b> of ${LEVELS.length}!
      </p>`;
    app.appendChild(head);
    $("back-menu").onclick = renderMenu;

    const grid = document.createElement("div");
    grid.className = "levels";
    LEVELS.forEach((lvl, i) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "level-card";
      if (save.done[lvl.id]) {
        const star = document.createElement("span");
        star.className = "star"; star.textContent = "⭐";
        card.appendChild(star);
      }
      card.appendChild(miniGrid(lvl, 7));
      const nm = document.createElement("span");
      nm.className = "lvname"; nm.textContent = lvl.name;
      const sz = document.createElement("span");
      sz.className = "lvsize"; sz.textContent = lvl.size + "×" + lvl.size;
      card.appendChild(nm); card.appendChild(sz);
      card.onclick = () => startBuild(i);
      grid.appendChild(card);
    });
    app.appendChild(grid);
  }

  /* ---------- build: play a blueprint ---------- */
  function startBuild(idx) {
    clearScreen();
    const lvl = LEVELS[idx];
    const steps = cellsOf(lvl);
    let pos = 0, misses = 0, streak = 0;

    const hud = document.createElement("div");
    hud.className = "hud";
    hud.innerHTML = `
      <button class="pill" id="b-back">← Levels</button>
      <button class="pill ${save.numbersOn ? "on" : ""}" id="b-nums">
        Numbers: ${save.numbersOn ? "On" : "Off"}</button>`;
    app.appendChild(hud);

    // top row: blueprint preview + live combo
    const top = document.createElement("div");
    top.className = "toprow";
    const bp = document.createElement("div");
    bp.className = "blueprint";
    bp.innerHTML = `<div class="bp-title">Blueprint: ${lvl.name}</div>`;
    bp.appendChild(miniGrid(lvl, Math.max(6, Math.floor(110 / lvl.size))));
    const combo = document.createElement("div");
    combo.className = "combo";
    top.appendChild(bp); top.appendChild(combo);
    app.appendChild(top);

    const instr = document.createElement("div");
    instr.className = "instruction";
    app.appendChild(instr);

    const prog = document.createElement("div");
    prog.className = "progress"; prog.innerHTML = "<i></i>";
    app.appendChild(prog);

    const ctx = makeBoard(lvl.size, onTap);
    boardCtx = ctx;
    const bw = document.createElement("div");
    bw.className = "board-wrap"; bw.appendChild(ctx.board);
    app.appendChild(bw);
    ctx.size();
    enableCursor(lvl.size, ctx, onTap);

    // faint blueprint outline (footprint only — no colours given away)
    steps.forEach((s) => {
      const cell = ctx.cellMap[s.x + "," + s.y];
      if (cell) cell.classList.add("plan");
    });

    $("b-back").onclick = renderLevelPicker;
    $("b-nums").onclick = () => toggleNums(ctx, $("b-nums"));
    updateCombo();
    showStep();

    function updateCombo() {
      combo.innerHTML = streak >= 3
        ? `<span class="flame">🔥</span> ${streak} streak!`
        : (pos > 0 ? `${pos} placed` : "");
    }
    function showStep() {
      if (pos >= steps.length) return finish();
      const s = steps[pos];
      instr.innerHTML =
        `Place <span class="ib">${blockHTML(s.type)}</span> at ` +
        `<span class="coord">(${s.x}, ${s.y})</span>`;
      misses = 0;
    }
    function onTap(x, y, cell) {
      if (pos >= steps.length) return;
      const s = steps[pos];
      if (x === s.x && y === s.y) {
        place(cell, s.type, true);
        streak++;
        Sound.place(streak);
        if (streak % 5 === 0) sfx("good");
        pos++;
        prog.firstChild.style.width = (pos / steps.length * 100) + "%";
        updateCombo();
        showStep();
      } else {
        shake(cell); Sound.dig(); streak = 0; misses++; updateCombo();
        ctx.litAxis(s.x, s.y, true);
        setTimeout(() => ctx.litAxis(s.x, s.y, false), 1500);
        say(misses === 1
          ? `Not quite — count across to ${s.x}, then up to ${s.y}.`
          : `Find where column ${s.x} and row ${s.y} meet ✨`);
        if (misses >= 2) {
          const t = ctx.cellMap[s.x + "," + s.y];
          if (t) { t.classList.add("target-pulse"); setTimeout(() => t.classList.remove("target-pulse"), 2100); }
        }
      }
    }
    function finish() {
      instr.innerHTML = `You built a ${lvl.name}! ${lvl.emoji}`;
      const firstTime = !save.done[lvl.id];
      save.done[lvl.id] = true; persist();
      disableCursor();
      // ripple the finished picture, then celebrate
      steps.forEach((s, i) => {
        setTimeout(() => bounce(ctx.cellMap[s.x + "," + s.y]), i * 40);
      });
      setTimeout(() => { sfx("win"); sparkle(lvl.emoji); }, Math.min(steps.length * 40, 500));
      say(firstTime ? "New blueprint complete — ⭐ earned!" : "Built it again — nice!");

      const banner = document.createElement("div");
      banner.className = "win-banner";
      const next = LEVELS[idx + 1];
      banner.innerHTML = `
        <div style="font-size:2.6rem">${lvl.emoji}</div>
        <h2>${lvl.name} complete!</h2>
        <div class="row-btns">
          <button class="pill on" id="w-again">Build again</button>
          ${next ? '<button class="pill on" id="w-next">Next ▶ ' + next.emoji + "</button>" : ""}
          <button class="pill" id="w-levels">All levels</button>
        </div>`;
      app.appendChild(banner);
      banner.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
      $("w-again").onclick = () => startBuild(idx);
      $("w-levels").onclick = renderLevelPicker;
      if (next) $("w-next").onclick = () => startBuild(idx + 1);
    }
  }

  /* ---------- treasure dig ---------- */
  function startTreasure() {
    clearScreen();
    const n = 8, TARGETS = 5;
    const spots = [], used = {};
    while (spots.length < TARGETS) {
      const x = 1 + Math.floor(Math.random() * n);
      const y = 1 + Math.floor(Math.random() * n);
      const key = x + "," + y;
      if (!used[key]) { used[key] = true; spots.push({ x, y }); }
    }
    let idx = 0, wrong = 0;

    const hud = document.createElement("div");
    hud.className = "hud";
    hud.innerHTML = `<button class="pill" id="t-back">← Modes</button>
      <button class="pill ${save.numbersOn ? "on" : ""}" id="t-nums">Numbers: ${save.numbersOn ? "On" : "Off"}</button>`;
    app.appendChild(hud);

    const instr = document.createElement("div");
    instr.className = "instruction"; app.appendChild(instr);

    const ctx = makeBoard(n, onTap);
    boardCtx = ctx;
    const bw = document.createElement("div");
    bw.className = "board-wrap"; bw.appendChild(ctx.board);
    app.appendChild(bw);
    ctx.size();
    enableCursor(n, ctx, onTap);

    $("t-back").onclick = renderMenu;
    $("t-nums").onclick = () => toggleNums(ctx, $("t-nums"));
    showClue();

    function showClue() {
      if (idx >= spots.length) return done();
      const s = spots[idx];
      instr.innerHTML =
        `💎 Treasure is buried at <span class="coord">(${s.x}, ${s.y})</span> — dig there! ` +
        `<span style="font-size:.9rem;color:#6a6385;font-weight:normal">(${idx}/${TARGETS} found)</span>`;
    }
    function onTap(x, y, cell) {
      if (idx >= spots.length || cell.classList.contains("filled") || cell.classList.contains("dug")) return;
      const s = spots[idx];
      if (x === s.x && y === s.y) {
        place(cell, "diamond", true);
        Sound.gem(); idx++; say("Found it! 💎"); showClue();
      } else {
        cell.classList.add("dug"); shake(cell); Sound.dig(); wrong++;
        ctx.litAxis(s.x, s.y, true);
        setTimeout(() => ctx.litAxis(s.x, s.y, false), 1500);
        say(`Just dirt! Count across to ${s.x}, then up to ${s.y}.`);
      }
    }
    function done() {
      instr.innerHTML = `All ${TARGETS} treasures found! 💎✨`;
      const best = save.treasureBest;
      if (best === null || wrong < best) { save.treasureBest = wrong; persist(); }
      sfx("win"); sparkle("💎"); disableCursor();
      const banner = document.createElement("div");
      banner.className = "win-banner";
      banner.innerHTML = `
        <div style="font-size:2.6rem">💎</div>
        <h2>Treasure found!</h2>
        <p>${wrong === 0 ? "Perfect dig — no wrong holes! 🌟" : "Wrong digs: " + wrong}</p>
        <p style="color:#6a6385">Best ever: ${save.treasureBest} wrong digs</p>
        <div class="row-btns">
          <button class="pill on" id="t-again">Dig again</button>
          <button class="pill" id="t-menu">Modes</button>
        </div>`;
      app.appendChild(banner);
      $("t-again").onclick = startTreasure;
      $("t-menu").onclick = renderMenu;
    }
  }

  /* ---------- free build ---------- */
  function startFree() {
    clearScreen();
    const n = 8;
    const BLOCKS = ["grass", "dirt", "stone", "cobble", "planks", "log", "leaves",
      "water", "sand", "diamond", "gold", "red", "purple", "pink", "white", "black"];
    let selected = BLOCKS[0];
    const grid = (save.free && save.free.n === n && save.free.cells) ? save.free.cells : {};

    const hud = document.createElement("div");
    hud.className = "hud";
    hud.innerHTML = `<button class="pill" id="f-back">← Modes</button>
      <button class="pill" id="f-clear">🧹 Clear all</button>
      <button class="pill ${save.numbersOn ? "on" : ""}" id="f-nums">Numbers: ${save.numbersOn ? "On" : "Off"}</button>`;
    app.appendChild(hud);

    const tip = document.createElement("p");
    tip.className = "intro"; tip.style.margin = "0.5rem 0";
    tip.innerHTML = "Pick a block, then tap the grid. Tap a block again to erase it.";
    app.appendChild(tip);

    const pal = document.createElement("div");
    pal.className = "palette";
    BLOCKS.forEach((b, i) => {
      const sw = document.createElement("button");
      sw.type = "button";
      sw.className = "swatch" + (i === 0 ? " sel" : "");
      sw.innerHTML = blockHTML(b);
      sw.setAttribute("aria-label", "block: " + b);
      sw.onclick = () => {
        selected = b;
        pal.querySelectorAll(".swatch").forEach((s) => s.classList.remove("sel"));
        sw.classList.add("sel");
      };
      pal.appendChild(sw);
    });
    app.appendChild(pal);

    const ctx = makeBoard(n, onTap);
    boardCtx = ctx;
    const bw = document.createElement("div");
    bw.className = "board-wrap"; bw.appendChild(ctx.board);
    app.appendChild(bw);
    ctx.size();
    enableCursor(n, ctx, onTap);

    Object.keys(grid).forEach((key) => {
      const cell = ctx.cellMap[key];
      if (cell) place(cell, grid[key], false);
    });

    $("f-back").onclick = renderMenu;
    $("f-nums").onclick = () => toggleNums(ctx, $("f-nums"));
    $("f-clear").onclick = () => {
      Object.keys(grid).forEach((k) => delete grid[k]);
      Object.values(ctx.cellMap).forEach((c) => { c.className = "cell"; c.innerHTML = ""; });
      persistFree(); say("Cleared! Fresh grid.");
    };
    function persistFree() { save.free = { n, cells: grid }; persist(); }
    function onTap(x, y, cell) {
      const key = x + "," + y;
      if (grid[key] === selected) {
        delete grid[key]; cell.className = "cell"; cell.innerHTML = "";
        say(`Cleared (${x}, ${y})`);
      } else {
        grid[key] = selected; place(cell, selected, true); Sound.place(0);
        say(`You placed a block at (${x}, ${y})`);
      }
      persistFree();
    }
  }

  /* ---------- shared: numbers toggle ---------- */
  function toggleNums(ctx, btn) {
    save.numbersOn = !save.numbersOn; persist();
    ctx.board.classList.toggle("nonums", !save.numbersOn);
    btn.classList.toggle("on", save.numbersOn);
    btn.textContent = "Numbers: " + (save.numbersOn ? "On" : "Off");
  }

  /* ---------------- go! ---------------- */
  renderMenu();
})();
