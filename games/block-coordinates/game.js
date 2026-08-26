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

  /* ---------------- save / load ----------------
     Same storage key as before, so every ⭐ / best score a kid has
     already earned still loads. New fields are merged in with
     defaults, and nested objects are repaired if an old save is
     missing them. */
  const KEY = "block-coordinates.v2";
  const defaults = () => ({
    done: {},            // levelId -> true   (built at least once)
    perfect: {},         // levelId -> true   (built with zero misses)
    numbersOn: true,
    treasureBest: null,  // fewest wrong digs
    quadBest: null,
    free: null,
    tier: "normal",      // easy | normal | expert | master
    walkBest: {},        // tier -> best score
    f3Best: {},          // tier -> best score
    stats: { blocks: 0, bestStreak: 0, quests: 0 },
  });
  function normalize(s) {
    const d = defaults();
    if (!s || typeof s !== "object") return d;
    const out = Object.assign(d, s);
    ["done", "perfect", "walkBest", "f3Best"].forEach((k) => {
      if (!out[k] || typeof out[k] !== "object") out[k] = {};
    });
    out.stats = Object.assign({ blocks: 0, bestStreak: 0, quests: 0 }, out.stats || {});
    if (!TIER_CFG[out.tier]) out.tier = "normal";
    return out;
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return normalize(JSON.parse(raw));
    } catch (e) {}
    return defaults();
  }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }

  /* ---------------- difficulty ladder ----------------
     One tier choice drives every quest mode: how big the world is,
     how soon a hint appears, and whether the axis numbers are given
     to you. "Grown-up" is a real challenge for mum. */
  const TIERS = [
    { id: "easy",   name: "Easy",     emoji: "🐣", note: "small world, quick hints" },
    { id: "normal", name: "Normal",   emoji: "⭐", note: "the classic grid" },
    { id: "expert", name: "Expert",   emoji: "🔥", note: "big world, negatives" },
    { id: "master", name: "Grown-up", emoji: "👑", note: "huge world, numbers hidden" },
  ];
  const TIER_CFG = {
    easy:   { dig: 6,  half: 3, rounds: 4,  hintAfter: 1, hideNums: false, neg: false },
    normal: { dig: 8,  half: 4, rounds: 6,  hintAfter: 1, hideNums: false, neg: false },
    expert: { dig: 10, half: 5, rounds: 8,  hintAfter: 2, hideNums: false, neg: true  },
    master: { dig: 12, half: 6, rounds: 10, hintAfter: 3, hideNums: true,  neg: true  },
  };
  let save = load();
  const tier = () => TIER_CFG[save.tier] || TIER_CFG.normal;
  const tierMeta = () => TIERS.find((t) => t.id === save.tier) || TIERS[1];

  // Numbers stay hidden on the grown-up tier until the player asks for
  // them; the choice lasts for this visit only.
  let numsOverride = null;
  function startNums() {
    if (numsOverride !== null) return numsOverride;
    return tier().hideNums ? false : save.numbersOn;
  }

  /* Biggest grid that still leaves finger-sized squares on this screen.
     Phones quietly get a smaller world instead of an off-screen one. */
  function maxGrid() {
    const host = $("app");
    const avail = Math.min((host && host.clientWidth) || 360, 560);
    return Math.max(6, Math.min(13, Math.floor((avail - 46) / 30)));
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------------- rank (a reason to come back) ---------------- */
  const RANKS = [
    { at: 0,   name: "Wood Pick",    emoji: "🪵" },
    { at: 40,  name: "Stone Pick",   emoji: "🪨" },
    { at: 120, name: "Iron Pick",    emoji: "⚙️" },
    { at: 260, name: "Gold Pick",    emoji: "🥇" },
    { at: 450, name: "Diamond Pick", emoji: "💎" },
    { at: 700, name: "Netherite",    emoji: "🖤" },
  ];
  function rankOf(blocks) {
    let r = RANKS[0];
    for (const x of RANKS) if (blocks >= x.at) r = x;
    return r;
  }
  function nextRank(blocks) { return RANKS.find((x) => x.at > blocks) || null; }
  function addBlocks(n) {
    save.stats.blocks = (save.stats.blocks || 0) + n;
    persist();
  }
  function noteStreak(s) {
    if (s > (save.stats.bestStreak || 0)) { save.stats.bestStreak = s; persist(); }
  }

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
      id: "mushroom", name: "Mushroom", emoji: "🍄", size: 6,
      legend: { R: "red", W: "white" },
      art: [".RRRR.", "RWRRWR", "RRRRRR", "..WW..", "..WW..", "..WW.."],
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
      id: "pickaxe", name: "Pickaxe", emoji: "⛏️", size: 8,
      legend: { D: "diamond", W: "log" },
      art: [
        "DDDDDDDD", "D..WW..D", "...WW...", "...WW...",
        "...WW...", "...WW...", "...WW...", "...WW...",
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
    {
      id: "rocket", name: "Rocket", emoji: "🚀", size: 10,
      legend: { W: "white", B: "water", R: "red", Y: "gold" },
      art: [
        "....WW....", "...WWWW...", "...WBBW...", "...WBBW...", "...WWWW...",
        "...WWWW...", "..RWWWWR..", ".RRWWWWRR.", ".R.YYYY.R.", "...Y..Y...",
      ],
    },
    {
      id: "castle", name: "Castle", emoji: "🏰", size: 10,
      legend: { S: "stone", C: "cobble", D: "log", G: "grass", R: "red" },
      art: [
        "R........R", "SS......SS", "SS.S..S.SS", "SSSSSSSSSS", "SS.SSSS.SS",
        "SSSSSSSSSS", "CCC.DD.CCC", "CCCCDDCCCC", "CCCCDDCCCC", "GGGGGGGGGG",
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

  /* ===========================================================
     EXPLAIN A WRONG ANSWER
     The most important teaching bit: never just "nope". Say what
     the tapped square actually *is*, name the mistake if it's the
     classic X/Y swap, then say exactly how far to move.
     =========================================================== */
  const coordChip = (x, y, cls) =>
    `<span class="coord${cls ? " " + cls : ""}">(${x}, ${y})</span>`;

  function walkWords(x, y, names) {
    const nx = (names && names[0]) || "X", ny = (names && names[1]) || "Y";
    const ax = x < 0 ? `${Math.abs(x)} left ←` : `${x} across →`;
    const ay = y < 0 ? `${Math.abs(y)} down ↓` : `${y} up ↑`;
    return `${ax} (${nx} = ${x}) and ${ay} (${ny} = ${y})`;
  }

  // guess & target are {x,y}. Returns HTML for the explain panel.
  function explainMiss(guess, target, opts) {
    opts = opts || {};
    const names = opts.names || ["X", "Y"];
    const thing = opts.thing || "chest";
    const dx = target.x - guess.x, dy = target.y - guess.y;
    const moves = [];
    if (dx) moves.push(`${Math.abs(dx)} block${Math.abs(dx) > 1 ? "s" : ""} ${dx > 0 ? "right →" : "left ←"}`);
    if (dy) moves.push(`${Math.abs(dy)} block${Math.abs(dy) > 1 ? "s" : ""} ${dy > 0 ? "up ↑" : "down ↓"}`);
    const move = moves.join(" and ");
    const swapped = guess.x === target.y && guess.y === target.x && target.x !== target.y;
    const head = swapped
      ? `<b>You swapped them!</b> ${names[0]} always comes first.`
      : `That square is ${coordChip(guess.x, guess.y, "bad")}.`;
    return `
      <div class="ex-line">${head}</div>
      <div class="ex-line">You went ${walkWords(guess.x, guess.y, names)}.</div>
      <div class="ex-line">The ${thing} is at ${coordChip(target.x, target.y, "good")} —
        ${walkWords(target.x, target.y, names)}.</div>
      ${move ? `<div class="ex-line ex-move">Move ${move} and you're there!</div>` : ""}`;
  }

  // plain-text version for the aria-live line (screen readers / Ellie's ears)
  function explainText(guess, target, names) {
    names = names || ["X", "Y"];
    const swapped = guess.x === target.y && guess.y === target.x && target.x !== target.y;
    return (swapped ? "You swapped them! " : "") +
      `You tapped (${guess.x}, ${guess.y}). It is at (${target.x}, ${target.y}).`;
  }

  function makeExplain() {
    const el = document.createElement("div");
    el.className = "explain";
    el.hidden = true;
    return el;
  }
  function showExplain(el, html) {
    if (!el) return;
    el.innerHTML = html;
    el.hidden = false;
  }
  function hideExplain(el) { if (el) { el.hidden = true; el.innerHTML = ""; } }

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

  /* ---------------- shared board widget ----------------
     lo is the lowest coordinate (default 1). Pass a negative lo
     to get a four-quadrant board: the x=0 / y=0 lines are tinted
     so kids can SEE the axes cross at the origin. */
  function makeBoard(n, onTap, lo) {
    lo = lo === undefined ? 1 : lo;
    const hi = lo + n - 1;
    const board = document.createElement("div");
    board.className = "board";
    board.style.setProperty("--n", n);
    if (!save.numbersOn) board.classList.add("nonums");

    const cellMap = {}, xLabels = {}, yLabels = {};

    for (let r = 0; r < n; r++) {
      const y = hi - r;
      const yl = document.createElement("div");
      yl.className = "axis y"; yl.textContent = y; yLabels[y] = yl;
      if (y === 0) yl.classList.add("zero");
      board.appendChild(yl);
      for (let x = lo; x <= hi; x++) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "cell";
        cell.dataset.x = x; cell.dataset.y = y;
        if (lo < 1 && (x === 0 || y === 0)) cell.classList.add("zl");
        if (lo < 1 && x === 0 && y === 0) cell.classList.add("origin");
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
    for (let x = lo; x <= hi; x++) {
      const xl = document.createElement("div");
      xl.className = "axis x"; xl.textContent = x; xLabels[x] = xl;
      if (x === 0) xl.classList.add("zero");
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
      for (let i = lo; i <= hi; i++) {
        const a = cellMap[x + "," + i], b = cellMap[i + "," + y];
        if (a) a.classList.toggle("trace", on);
        if (b) b.classList.toggle("trace", on);
      }
      litAxis(x, y, on);
    }
    return { board, cellMap, xLabels, yLabels, size, litAxis, trace, lo, hi };
  }

  /* ---------------- keyboard cursor (accessibility) ---------------- */
  let kbCursor = null;
  // The cursor stays hidden (active:false) until the player actually presses a
  // key — otherwise mouse/touch players see a stray yellow box and a tinted
  // row+column at (1,1) that look like random mis-coloured squares.
  function enableCursor(n, ctx, tap) {
    kbCursor = { x: ctx.lo, y: ctx.lo, lo: ctx.lo, hi: ctx.hi, ctx, tap, active: false };
  }
  function disableCursor() {
    if (kbCursor && kbCursor.active) {
      kbCursor.ctx.trace(kbCursor.x, kbCursor.y, false);
      const c = kbCursor.ctx.cellMap[kbCursor.x + "," + kbCursor.y];
      if (c) c.classList.remove("cursor");
    }
    kbCursor = null;
  }
  function paintCursor(prev) {
    if (!kbCursor || !kbCursor.active) return;
    Object.values(kbCursor.ctx.cellMap).forEach((c) => c.classList.remove("cursor"));
    if (prev) kbCursor.ctx.trace(prev.x, prev.y, false);
    kbCursor.ctx.trace(kbCursor.x, kbCursor.y, true);
    const c = kbCursor.ctx.cellMap[kbCursor.x + "," + kbCursor.y];
    if (c) c.classList.add("cursor");
  }
  document.addEventListener("keydown", (e) => {
    if (!kbCursor) return;
    const k = e.key;
    const nav = k === "ArrowRight" || k === "ArrowLeft" || k === "ArrowUp" || k === "ArrowDown";
    const act = k === "Enter" || k === " ";
    if (!nav && !act) return;
    // First key reveals the cursor where it already sits — no jump, no surprise.
    if (!kbCursor.active) {
      kbCursor.active = true;
      paintCursor();
      e.preventDefault();
      return;
    }
    const prev = { x: kbCursor.x, y: kbCursor.y };
    if (k === "ArrowRight") kbCursor.x = Math.min(kbCursor.hi, kbCursor.x + 1);
    else if (k === "ArrowLeft") kbCursor.x = Math.max(kbCursor.lo, kbCursor.x - 1);
    else if (k === "ArrowUp") kbCursor.y = Math.min(kbCursor.hi, kbCursor.y + 1);
    else if (k === "ArrowDown") kbCursor.y = Math.max(kbCursor.lo, kbCursor.y - 1);
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
    const stars = LEVELS.filter((l) => save.done[l.id]).length;
    const allDone = stars === LEVELS.length;
    const tBest = save.treasureBest === null ? "" : ` · best: ${save.treasureBest} wrong`;
    const qBest = save.quadBest === null ? "" : ` · best: ${save.quadBest} wrong`;
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <p class="intro">
        Read the grid like Minecraft! Every block has a spot:
        <b>(X, Y)</b> means count <b>across →</b> then <b>up ↑</b>
        from the bottom-left corner. Build pictures, dig for treasure,
        or brave the four quadrants where numbers go <b>negative</b>!
      </p>
      ${allDone ? `<p class="intro" style="color:var(--green);font-weight:bold">
        🏆 MASTER BUILDER — every blueprint complete! 🏆</p>` : ""}
      <div class="mode-grid">
        <button class="mode-btn" id="m-build" style="--accent:var(--green)">
          <span class="big">🏗️</span><span class="name">Build</span>
          <span class="desc">Follow the blueprint — ⭐ ${stars}/${LEVELS.length} built</span>
        </button>
        <button class="mode-btn" id="m-treasure" style="--accent:var(--blue)">
          <span class="big">💎</span><span class="name">Treasure Dig</span>
          <span class="desc">Read the clue, dig the right spot${tBest}</span>
        </button>
        <button class="mode-btn" id="m-quad" style="--accent:var(--yellow)">
          <span class="big">🧭</span><span class="name">Quadrant Quest</span>
          <span class="desc">Negative numbers! Dig around (0, 0)${qBest}</span>
        </button>
        <button class="mode-btn" id="m-free" style="--accent:var(--purple)">
          <span class="big">🧱</span><span class="name">Free Build</span>
          <span class="desc">Place any blocks you want</span>
        </button>
      </div>`;
    app.appendChild(wrap);
    $("m-build").onclick = renderLevelPicker;
    $("m-treasure").onclick = () => startTreasure(false);
    $("m-quad").onclick = () => startTreasure(true);
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
      setTimeout(() => { sfx("win"); sparkle(lvl.emoji); window.Confetti && Confetti.burst({ count: 100 }); }, Math.min(steps.length * 40, 500));
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

  /* ---------- treasure dig (and Quadrant Quest) ----------
     quad=false: the classic 1..8 grid.
     quad=true:  a 9×9 world from -4 to 4 with (0,0) in the middle —
     negative X means count LEFT, negative Y means count DOWN. */
  function startTreasure(quad) {
    clearScreen();
    const n = quad ? 9 : 8, lo = quad ? -4 : 1;
    const TARGETS = quad ? 6 : 5;
    const spots = [], used = {};
    if (quad) {
      // one treasure in every quadrant, so all four sign combos get practised
      [[1, 1], [-1, 1], [-1, -1], [1, -1]].forEach(([sx, sy]) => {
        const x = sx * (1 + Math.floor(Math.random() * 4));
        const y = sy * (1 + Math.floor(Math.random() * 4));
        used[x + "," + y] = true; spots.push({ x, y });
      });
    }
    while (spots.length < TARGETS) {
      const x = lo + Math.floor(Math.random() * n);
      const y = lo + Math.floor(Math.random() * n);
      const key = x + "," + y;
      if (!used[key]) { used[key] = true; spots.push({ x, y }); }
    }
    let idx = 0, wrong = 0;

    const hud = document.createElement("div");
    hud.className = "hud";
    hud.innerHTML = `<button class="pill" id="t-back">← Modes</button>
      <button class="pill ${save.numbersOn ? "on" : ""}" id="t-nums">Numbers: ${save.numbersOn ? "On" : "Off"}</button>`;
    app.appendChild(hud);

    if (quad) {
      const tip = document.createElement("p");
      tip.className = "intro"; tip.style.margin = "0.3rem auto 0.4rem";
      tip.innerHTML = "🧭 This world has a middle! <b>(0, 0)</b> is the <b>origin</b>. " +
        "Negative X? Count <b>← left</b>. Negative Y? Count <b>↓ down</b>.";
      app.appendChild(tip);
    }

    const instr = document.createElement("div");
    instr.className = "instruction"; app.appendChild(instr);

    const ctx = makeBoard(n, onTap, lo);
    boardCtx = ctx;
    const bw = document.createElement("div");
    bw.className = "board-wrap"; bw.appendChild(ctx.board);
    app.appendChild(bw);
    ctx.size();
    enableCursor(n, ctx, onTap);

    $("t-back").onclick = renderMenu;
    $("t-nums").onclick = () => toggleNums(ctx, $("t-nums"));
    showClue();

    function dirHint(s) {
      const xs = s.x < 0 ? "left ←" : "across →", ys = s.y < 0 ? "down ↓" : "up ↑";
      return `Count ${xs} to ${s.x}, then ${ys} to ${s.y}`;
    }
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
        say(`Just dirt! ${dirHint(s)}.`);
      }
    }
    function done() {
      instr.innerHTML = `All ${TARGETS} treasures found! 💎✨`;
      const bestKey = quad ? "quadBest" : "treasureBest";
      if (save[bestKey] === null || wrong < save[bestKey]) { save[bestKey] = wrong; persist(); }
      sfx("win"); sparkle(quad ? "🧭" : "💎"); window.Confetti && Confetti.burst({ count: 100 }); disableCursor();
      const banner = document.createElement("div");
      banner.className = "win-banner";
      banner.innerHTML = `
        <div style="font-size:2.6rem">${quad ? "🧭" : "💎"}</div>
        <h2>${quad ? "Quadrant Quest complete!" : "Treasure found!"}</h2>
        <p>${wrong === 0 ? "Perfect dig — no wrong holes! 🌟" : "Wrong digs: " + wrong}</p>
        <p style="color:#6a6385">Best ever: ${save[bestKey]} wrong digs</p>
        <div class="row-btns">
          <button class="pill on" id="t-again">Dig again</button>
          <button class="pill" id="t-menu">Modes</button>
        </div>`;
      app.appendChild(banner);
      $("t-again").onclick = () => startTreasure(quad);
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
