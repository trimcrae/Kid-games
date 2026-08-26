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
    cell.classList.remove("plan", "dug");
    cell.innerHTML = blockHTML(type, animate && !reduceMotion ? "drop" : "");
    if (cell.dataset.base) cell.setAttribute("aria-label", `${cell.dataset.base} — ${type} block`);
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
      ? `<b>You swapped them!</b> That square is ${coordChip(guess.x, guess.y, "bad")} —
         ${names[0]} always comes first.`
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
     opts:
       lo       lowest coordinate (default 1). Negative -> four
                quadrants, with the x=0 / y=0 lines tinted so kids
                can SEE the axes cross at the origin.
       flipY    numbers grow DOWNWARD instead of upward — that is
                exactly how Minecraft's Z axis works on a map
                (+Z is south), so it gets its own mode.
       xName/yName   axis letters ("X"/"Y", or "X"/"Z").
       numbers  start with the axis numbers visible?

     Keyboard: the grid is one tab stop (roving tabindex). Tab into
     it, arrow around, Enter/Space to place. Arrow keys are only
     swallowed while the grid itself has focus, so the page still
     scrolls normally everywhere else. */
  function makeBoard(n, onTap, opts) {
    opts = opts || {};
    const lo = opts.lo === undefined ? 1 : opts.lo;
    const hi = lo + n - 1;
    const flipY = !!opts.flipY;
    const xName = opts.xName || "X";
    const yName = opts.yName || "Y";
    let numsOn = opts.numbers === undefined ? save.numbersOn : opts.numbers;

    const board = document.createElement("div");
    board.className = "board";
    board.style.setProperty("--n", n);
    board.setAttribute("role", "group");
    board.setAttribute("aria-label",
      `${n} by ${n} block grid. ${xName} runs ${lo} to ${hi} across, ` +
      `${yName} runs ${lo} to ${hi} ${flipY ? "downward" : "upward"}. ` +
      "Use the arrow keys to move and Enter to choose.");
    if (!numsOn) board.classList.add("nonums");

    const cellMap = {}, xLabels = {}, yLabels = {};
    const rowVal = (r) => (flipY ? lo + r : hi - r);
    const rowOf = (y) => (flipY ? y - lo : hi - y);

    for (let r = 0; r < n; r++) {
      const y = rowVal(r);
      const yl = document.createElement("div");
      yl.className = "axis y"; yl.textContent = y; yLabels[y] = yl;
      if (y === 0) yl.classList.add("zero");
      board.appendChild(yl);
      for (let x = lo; x <= hi; x++) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "cell";
        cell.tabIndex = -1;
        cell.dataset.x = x; cell.dataset.y = y;
        cell.dataset.base = `${xName} ${x}, ${yName} ${y}`;
        if (lo < 1 && (x === 0 || y === 0)) cell.classList.add("zl");
        if (lo < 1 && x === 0 && y === 0) cell.classList.add("origin");
        cell.setAttribute("aria-label", cell.dataset.base);
        cell.addEventListener("click", () => onTap(x, y, cell));
        cell.addEventListener("mouseenter", () => trace(x, y, true));
        cell.addEventListener("mouseleave", () => trace(x, y, false));
        cell.addEventListener("focus", () => { rove(x, y); trace(x, y, true); });
        cell.addEventListener("blur", () => trace(x, y, false));
        cellMap[x + "," + y] = cell;
        board.appendChild(cell);
      }
    }
    const corner = document.createElement("div");
    corner.className = "corner";
    corner.textContent = `${yName}${flipY ? "↓" : "↑"}/${xName}→`;
    board.appendChild(corner);
    for (let x = lo; x <= hi; x++) {
      const xl = document.createElement("div");
      xl.className = "axis x"; xl.textContent = x; xLabels[x] = xl;
      if (x === 0) xl.classList.add("zero");
      board.appendChild(xl);
    }

    /* --- roving tabindex: the grid behaves as ONE tab stop --- */
    let focusX = lo, focusY = rowVal(n - 1);   // visual bottom-left
    function rove(x, y) {
      const next = cellMap[x + "," + y];
      if (!next) return;
      const cur = cellMap[focusX + "," + focusY];
      if (cur) cur.tabIndex = -1;
      next.tabIndex = 0;
      focusX = x; focusY = y;
    }
    rove(focusX, focusY);
    board.addEventListener("keydown", (e) => {
      let dc = 0, dr = 0;
      switch (e.key) {
        case "ArrowRight": dc = 1; break;
        case "ArrowLeft":  dc = -1; break;
        case "ArrowUp":    dr = -1; break;
        case "ArrowDown":  dr = 1; break;
        case "Home": case "End": break;
        default: return;
      }
      e.preventDefault();
      let c = focusX - lo, r = rowOf(focusY);
      if (e.key === "Home") { c = 0; r = n - 1; }
      else if (e.key === "End") { c = n - 1; r = 0; }
      else { c = clamp(c + dc, 0, n - 1); r = clamp(r + dr, 0, n - 1); }
      const cell = cellMap[(lo + c) + "," + rowVal(r)];
      if (cell) cell.focus();
    });

    /* --- responsive sizing: never wider than the screen, never
           smaller than a fingertip we can help it --- */
    function size() {
      const host = $("app");
      const avail = Math.min((host && host.clientWidth) || 360, 560);
      const chrome = 24 /*label col*/ + 20 /*padding*/ + 2 * (n + 1) /*gaps*/;
      const cell = clamp(Math.floor((avail - chrome) / n), 24, 58);
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
    function setNums(on) {
      numsOn = !!on;
      board.classList.toggle("nonums", !numsOn);
    }
    function flash(x, y, ms) {
      const t = cellMap[x + "," + y];
      if (!t) return;
      t.classList.add("target-pulse");
      setTimeout(() => t.classList.remove("target-pulse"), ms || 2100);
    }
    return { board, cellMap, xLabels, yLabels, size, litAxis, trace, setNums,
             flash, focusAt: rove, lo, hi, names: [xName, yName], flipY };
  }

  /* Reset a cell back to bare grass-less ground without wiping the
     axis/origin classes that make the quadrant board readable. */
  function clearCell(cell) {
    cell.classList.remove("filled", "dug", "plan", "trace", "target-pulse", "shake");
    cell.innerHTML = "";
    if (cell.dataset.base) cell.setAttribute("aria-label", cell.dataset.base);
  }

  let boardCtx = null;
  window.addEventListener("resize", () => { if (boardCtx) boardCtx.size(); });

  /* ============================================================
     SCREENS
     ============================================================ */
  const app = $("app");
  function clearScreen() { boardCtx = null; app.innerHTML = ""; say(""); }

  /* ---------- menu ---------- */
  function renderMenu() {
    clearScreen();
    const stars = LEVELS.filter((l) => save.done[l.id]).length;
    const perfects = LEVELS.filter((l) => save.perfect[l.id]).length;
    const allDone = stars === LEVELS.length;
    const tBest = save.treasureBest === null ? "" : ` · best: ${save.treasureBest} wrong`;
    const qBest = save.quadBest === null ? "" : ` · best: ${save.quadBest} wrong`;
    const wBest = save.walkBest[save.tier] ? ` · best: ${save.walkBest[save.tier]}` : "";
    const fBest = save.f3Best[save.tier] ? ` · best: ${save.f3Best[save.tier]}` : "";
    const blocks = save.stats.blocks || 0;
    const rank = rankOf(blocks), nxt = nextRank(blocks);
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <p class="intro">
        Read the grid like Minecraft! Every block has a spot:
        <b>(X, Y)</b> means count <b>across →</b> <i>first</i>, then <b>up ↑</b>
        from the bottom-left corner. Build pictures, dig for treasure,
        walk the world in steps, or brave the four quadrants where
        numbers go <b>negative</b>.
      </p>

      <div class="rank-card">
        <span class="rk-emoji" aria-hidden="true">${rank.emoji}</span>
        <span class="rk-text">
          <b>${rank.name}</b>
          <small>${blocks} blocks mined${nxt ? ` · ${nxt.at - blocks} to ${nxt.emoji} ${nxt.name}` : " · top rank!"}${
            save.stats.bestStreak ? ` · best streak ${save.stats.bestStreak}🔥` : ""}</small>
        </span>
        <button class="pill tiny" id="m-help" aria-expanded="false"
          aria-controls="helpbox">❓ How do I read (X, Y)?</button>
      </div>

      <div id="helpbox" class="helpbox" hidden></div>

      <div class="tier-row" role="group" aria-label="Difficulty">
        <span class="tier-lab">Difficulty:</span>
        ${TIERS.map((t) => `<button class="pill tier${t.id === save.tier ? " on" : ""}"
            data-tier="${t.id}" aria-pressed="${t.id === save.tier}"
            title="${t.note}">${t.emoji} ${t.name}</button>`).join("")}
      </div>
      <p class="tier-note">${tierMeta().emoji} <b>${tierMeta().name}</b> — ${tierMeta().note}.</p>

      ${allDone ? `<p class="intro" style="color:var(--green);font-weight:bold">
        🏆 MASTER BUILDER — every blueprint complete!${perfects === LEVELS.length ? " And every one PERFECT! 🌟" : ""} 🏆</p>` : ""}

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
        <button class="mode-btn" id="m-walk" style="--accent:var(--pink)">
          <span class="big">🚶</span><span class="name">Steps &amp; Distance</span>
          <span class="desc">Move N blocks, measure the gap${wBest}</span>
        </button>
        <button class="mode-btn" id="m-f3" style="--accent:var(--blue)">
          <span class="big">🧊</span><span class="name">X, Y, Z</span>
          <span class="desc">Real Minecraft coords — Y is height!${fBest}</span>
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
    $("m-walk").onclick = startWalk;
    $("m-f3").onclick = startF3;
    $("m-free").onclick = startFree;
    wrap.querySelectorAll(".pill.tier").forEach((b) => {
      b.onclick = () => {
        save.tier = b.dataset.tier; numsOverride = null; persist();
        sfx("pop"); renderMenu();
      };
    });
    const help = $("helpbox"), hbtn = $("m-help");
    hbtn.onclick = () => {
      const open = help.hidden;
      if (open && !help.dataset.built) { help.innerHTML = helpHTML(); help.dataset.built = "1"; }
      help.hidden = !open;
      hbtn.setAttribute("aria-expanded", String(open));
      if (open) help.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
    };
  }

  /* A tiny always-there lesson: an SVG showing "across first, then up". */
  function helpHTML() {
    const g = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      g.push(`<rect x="${30 + c * 30}" y="${10 + r * 30}" width="28" height="28" rx="3"
        fill="${(r === 1 && c === 2) ? "#56d6d0" : "rgba(255,255,255,.08)"}"
        stroke="rgba(255,255,255,.18)"/>`);
    }
    for (let i = 1; i <= 4; i++) {
      g.push(`<text x="${44 + (i - 1) * 30}" y="146" fill="#ffd98a" font-size="14"
        text-anchor="middle" font-weight="bold">${i}</text>`);
      g.push(`<text x="18" y="${29 + (4 - i) * 30}" fill="#ffd98a" font-size="14"
        text-anchor="middle" font-weight="bold">${i}</text>`);
    }
    return `
      <h3>Reading a coordinate</h3>
      <div class="help-flex">
        <svg viewBox="0 0 170 158" width="170" height="158" role="img"
             aria-label="A four by four grid with a diamond at x 3, y 3">
          <rect x="0" y="0" width="170" height="158" rx="10" fill="#2a3047"/>
          ${g.join("")}
          <path d="M30 128 H 104" stroke="#3ddc84" stroke-width="4" fill="none"
                marker-end="url(#ar)"/>
          <path d="M104 128 V 58" stroke="#ff5d8f" stroke-width="4" fill="none"
                marker-end="url(#ar2)"/>
          <defs>
            <marker id="ar" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
              <path d="M0 0 L7 3.5 L0 7 z" fill="#3ddc84"/></marker>
            <marker id="ar2" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
              <path d="M0 0 L7 3.5 L0 7 z" fill="#ff5d8f"/></marker>
          </defs>
        </svg>
        <ul class="help-list">
          <li><b>X first</b> — walk <span class="hx">across →</span> the bottom. Here: 3.</li>
          <li><b>Y second</b> — then climb <span class="hy">up ↑</span>. Here: 3.</li>
          <li>So the diamond is at <span class="coord">(3, 3)</span>.
              <b>(1, 4)</b> would be a totally different block!</li>
          <li><b>(0, 0)</b> is the <b>origin</b> — where the two axes cross.</li>
          <li>Going <b>left</b> of 0 or <b>below</b> 0 gives <b>negative</b> numbers,
              like <span class="coord">(-2, -1)</span>.</li>
          <li>In <b>Minecraft</b> it's X, Y and Z: X is east/west, Z is
              north/south, and <b>Y is how high up you are</b>.</li>
        </ul>
      </div>
      <p class="help-kb">⌨️ On a keyboard: press <b>Tab</b> until the grid lights up,
         move with the <b>arrow keys</b>, and press <b>Enter</b> to place a block.</p>`;
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
        star.className = "star";
        star.textContent = save.perfect[lvl.id] ? "🌟" : "⭐";
        card.appendChild(star);
      }
      card.appendChild(miniGrid(lvl, 7));
      const nm = document.createElement("span");
      nm.className = "lvname"; nm.textContent = lvl.name;
      const sz = document.createElement("span");
      sz.className = "lvsize"; sz.textContent = lvl.size + "×" + lvl.size;
      card.appendChild(nm); card.appendChild(sz);
      card.setAttribute("aria-label",
        `Build the ${lvl.name}, ${lvl.size} by ${lvl.size} grid` +
        (save.perfect[lvl.id] ? ", built perfectly" : save.done[lvl.id] ? ", built" : ""));
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
    let pos = 0, misses = 0, streak = 0, totalMisses = 0;
    let nums = save.numbersOn;

    const hud = document.createElement("div");
    hud.className = "hud";
    hud.innerHTML = `
      <button class="pill" id="b-back">← Levels</button>
      <button class="pill ${nums ? "on" : ""}" id="b-nums" aria-pressed="${nums}">
        Numbers: ${nums ? "On" : "Off"}</button>`;
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
    prog.className = "progress";
    prog.innerHTML = '<i></i>';
    prog.setAttribute("role", "progressbar");
    prog.setAttribute("aria-label", "Blocks placed");
    prog.setAttribute("aria-valuemin", "0");
    prog.setAttribute("aria-valuemax", String(steps.length));
    prog.setAttribute("aria-valuenow", "0");
    app.appendChild(prog);

    const ctx = makeBoard(lvl.size, onTap, { numbers: nums });
    boardCtx = ctx;
    const bw = document.createElement("div");
    bw.className = "board-wrap"; bw.appendChild(ctx.board);
    app.appendChild(bw);
    ctx.size();

    const explain = makeExplain();
    app.appendChild(explain);

    // faint blueprint outline (footprint only — no colours given away)
    steps.forEach((s) => {
      const cell = ctx.cellMap[s.x + "," + s.y];
      if (cell) cell.classList.add("plan");
    });

    $("b-back").onclick = renderLevelPicker;
    $("b-nums").onclick = () => { nums = toggleNums(ctx, $("b-nums"), nums); };
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
        `<span class="coord">(${s.x}, ${s.y})</span> ` +
        `<span class="step-of">block ${pos + 1} of ${steps.length}</span>`;
      instr.setAttribute("aria-label",
        `Place a ${s.type} block at X ${s.x}, Y ${s.y}. Block ${pos + 1} of ${steps.length}.`);
      misses = 0;
    }
    function onTap(x, y, cell) {
      if (pos >= steps.length) return;
      const s = steps[pos];
      if (x === s.x && y === s.y) {
        place(cell, s.type, true);
        streak++; noteStreak(streak);
        Sound.place(streak);
        if (streak % 5 === 0) sfx("good");
        pos++;
        prog.firstChild.style.width = (pos / steps.length * 100) + "%";
        prog.setAttribute("aria-valuenow", String(pos));
        hideExplain(explain);
        updateCombo();
        showStep();
      } else {
        shake(cell); Sound.dig(); streak = 0; misses++; totalMisses++; updateCombo();
        ctx.litAxis(s.x, s.y, true);
        setTimeout(() => ctx.litAxis(s.x, s.y, false), 1500);
        // Say WHAT went wrong, not just "nope".
        showExplain(explain, explainMiss({ x, y }, s, { thing: "next block" }));
        say(explainText({ x, y }, s));
        if (misses >= tier().hintAfter) ctx.flash(s.x, s.y);
      }
    }
    function finish() {
      instr.innerHTML = `You built a ${lvl.name}! ${lvl.emoji}`;
      hideExplain(explain);
      const firstTime = !save.done[lvl.id];
      const perfect = totalMisses === 0;
      const firstPerfect = perfect && !save.perfect[lvl.id];
      save.done[lvl.id] = true;
      if (perfect) save.perfect[lvl.id] = true;
      addBlocks(steps.length);   // persists
      // ripple the finished picture, then celebrate
      steps.forEach((s, i) => {
        setTimeout(() => bounce(ctx.cellMap[s.x + "," + s.y]), i * 40);
      });
      setTimeout(() => { sfx("win"); sparkle(lvl.emoji); window.Confetti && Confetti.burst({ count: 100 }); }, Math.min(steps.length * 40, 500));
      say(firstPerfect ? "PERFECT build — 🌟 earned!"
        : firstTime ? "New blueprint complete — ⭐ earned!" : "Built it again — nice!");

      const banner = document.createElement("div");
      banner.className = "win-banner";
      const next = LEVELS[idx + 1];
      banner.innerHTML = `
        <div style="font-size:2.6rem">${lvl.emoji}</div>
        <h2>${lvl.name} complete!</h2>
        <p>${perfect ? "🌟 Perfect — every block first try!"
             : `${steps.length} blocks placed · ${totalMisses} wrong tap${totalMisses === 1 ? "" : "s"}`}</p>
        ${!perfect ? '<p style="color:#6a6385;font-size:.9rem">Build it again with no mistakes to earn a 🌟</p>' : ""}
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
    const cfg = tier(), cap = maxGrid();
    // grid grows with the difficulty tier, but never off the screen
    const half = quad ? Math.max(2, Math.min(cfg.half, Math.floor((cap - 1) / 2))) : 0;
    const n = quad ? half * 2 + 1 : Math.max(5, Math.min(cfg.dig, cap));
    const lo = quad ? -half : 1;
    const hi = lo + n - 1;
    const TARGETS = quad ? Math.max(4, Math.min(cfg.rounds, 8)) : Math.max(4, Math.min(cfg.rounds, 8));
    const spots = [], used = {};
    if (quad) {
      // one treasure in every quadrant, so all four sign combos get practised
      [[1, 1], [-1, 1], [-1, -1], [1, -1]].forEach(([sx, sy]) => {
        const x = sx * (1 + Math.floor(Math.random() * half));
        const y = sy * (1 + Math.floor(Math.random() * half));
        used[x + "," + y] = true; spots.push({ x, y });
      });
      // ...then one ON each axis, because (0, 3) and (-2, 0) trip everyone up
      const ax = Math.max(1, Math.floor(Math.random() * half + 1)) * (Math.random() < 0.5 ? -1 : 1);
      [{ x: 0, y: ax }, { x: ax, y: 0 }].forEach((s) => {
        const k = s.x + "," + s.y;
        if (!used[k]) { used[k] = true; spots.push(s); }
      });
    }
    let guard = 0;
    while (spots.length < TARGETS && guard++ < 500) {
      const x = lo + Math.floor(Math.random() * n);
      const y = lo + Math.floor(Math.random() * n);
      const key = x + "," + y;
      if (!used[key]) { used[key] = true; spots.push({ x, y }); }
    }
    spots.length = Math.min(spots.length, TARGETS);
    const total = spots.length;
    let idx = 0, wrong = 0, misses = 0, streak = 0;
    let nums = startNums();

    const hud = document.createElement("div");
    hud.className = "hud";
    hud.innerHTML = `<button class="pill" id="t-back">← Modes</button>
      <button class="pill ${nums ? "on" : ""}" id="t-nums" aria-pressed="${nums}">Numbers: ${nums ? "On" : "Off"}</button>
      <span class="pill flat">${tierMeta().emoji} ${tierMeta().name} · ${n}×${n}</span>`;
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

    const prog = document.createElement("div");
    prog.className = "progress"; prog.innerHTML = "<i></i>";
    app.appendChild(prog);

    const ctx = makeBoard(n, onTap, { lo, numbers: nums });
    boardCtx = ctx;
    const bw = document.createElement("div");
    bw.className = "board-wrap"; bw.appendChild(ctx.board);
    app.appendChild(bw);
    ctx.size();

    const explain = makeExplain();
    app.appendChild(explain);

    $("t-back").onclick = renderMenu;
    $("t-nums").onclick = () => { nums = toggleNums(ctx, $("t-nums"), nums); };
    showClue();

    function showClue() {
      if (idx >= total) return done();
      const s = spots[idx];
      misses = 0;
      instr.innerHTML =
        `💎 Treasure is buried at <span class="coord">(${s.x}, ${s.y})</span> — dig there! ` +
        `<span class="step-of">${idx}/${total} found${streak >= 3 ? " · 🔥" + streak : ""}</span>`;
      instr.setAttribute("aria-label",
        `Dig at X ${s.x}, Y ${s.y}. ${idx} of ${total} found.`);
      prog.firstChild.style.width = (idx / total * 100) + "%";
    }
    function onTap(x, y, cell) {
      if (idx >= total || cell.classList.contains("filled")) return;
      const s = spots[idx];
      if (x === s.x && y === s.y) {
        cell.classList.remove("dug");
        place(cell, "diamond", true);
        Sound.gem(); idx++; streak++; noteStreak(streak); addBlocks(1);
        hideExplain(explain);
        say("Found it! 💎");
        showClue();
      } else {
        if (!cell.classList.contains("dug")) cell.classList.add("dug");
        shake(cell); Sound.dig(); wrong++; misses++; streak = 0;
        ctx.litAxis(s.x, s.y, true);
        setTimeout(() => ctx.litAxis(s.x, s.y, false), 1500);
        showExplain(explain, explainMiss({ x, y }, s, { thing: "treasure" }));
        say(explainText({ x, y }, s));
        if (misses >= cfg.hintAfter) ctx.flash(s.x, s.y);
      }
    }
    function done() {
      instr.innerHTML = `All ${total} treasures found! 💎✨`;
      prog.firstChild.style.width = "100%";
      hideExplain(explain);
      const bestKey = quad ? "quadBest" : "treasureBest";
      const isBest = save[bestKey] === null || wrong < save[bestKey];
      if (isBest) save[bestKey] = wrong;
      save.stats.quests = (save.stats.quests || 0) + 1;
      persist();
      sfx("win"); sparkle(quad ? "🧭" : "💎"); window.Confetti && Confetti.burst({ count: 100 });
      const banner = document.createElement("div");
      banner.className = "win-banner";
      banner.innerHTML = `
        <div style="font-size:2.6rem">${quad ? "🧭" : "💎"}</div>
        <h2>${quad ? "Quadrant Quest complete!" : "Treasure found!"}</h2>
        <p>${wrong === 0 ? "Perfect dig — no wrong holes! 🌟" : "Wrong digs: " + wrong}</p>
        <p style="color:#6a6385">Best ever: ${save[bestKey]} wrong digs${isBest && wrong > 0 ? " (new best!)" : ""}</p>
        <div class="row-btns">
          <button class="pill on" id="t-again">Dig again</button>
          <button class="pill" id="t-menu">Modes</button>
        </div>`;
      app.appendChild(banner);
      $("t-again").onclick = () => startTreasure(quad);
      $("t-menu").onclick = renderMenu;
    }
  }

  /* ===========================================================
     STEPS & DISTANCE  —  the "do something WITH a coordinate" mode
     Three question shapes, mixed and ramped by tier:
       walk : start somewhere, move N across and N up  →  translation
       read : a chest sits on the grid, pick its coordinate (the
              swapped (y, x) is always one of the choices)
       far  : how many blocks between two points      →  distance
     =========================================================== */
  function startWalk() {
    clearScreen();
    const cfg = tier(), cap = maxGrid();
    const neg = cfg.neg;
    const half = Math.max(2, Math.min(cfg.half, Math.floor((cap - 1) / 2)));
    const n = neg ? half * 2 + 1 : Math.max(6, Math.min(cfg.dig, cap));
    const lo = neg ? -half : 1;
    const hi = lo + n - 1;
    const total = cfg.rounds;
    const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

    let round = 0, score = 0, wrong = 0, misses = 0, streak = 0;
    let nums = startNums();
    let q = null;

    const hud = document.createElement("div");
    hud.className = "hud";
    hud.innerHTML = `<button class="pill" id="k-back">← Modes</button>
      <button class="pill ${nums ? "on" : ""}" id="k-nums" aria-pressed="${nums}">Numbers: ${nums ? "On" : "Off"}</button>
      <span class="pill flat">${tierMeta().emoji} ${tierMeta().name} · ${n}×${n}</span>`;
    app.appendChild(hud);

    const instr = document.createElement("div");
    instr.className = "instruction"; app.appendChild(instr);

    const prog = document.createElement("div");
    prog.className = "progress"; prog.innerHTML = "<i></i>";
    app.appendChild(prog);

    const ctx = makeBoard(n, onTap, { lo, numbers: nums });
    boardCtx = ctx;
    const bw = document.createElement("div");
    bw.className = "board-wrap"; bw.appendChild(ctx.board);
    app.appendChild(bw);
    ctx.size();

    const choices = document.createElement("div");
    choices.className = "choices"; choices.hidden = true;
    app.appendChild(choices);

    const explain = makeExplain();
    app.appendChild(explain);

    $("k-back").onclick = renderMenu;
    $("k-nums").onclick = () => { nums = toggleNums(ctx, $("k-nums"), nums); };
    nextRound();

    function clearBoard() {
      Object.values(ctx.cellMap).forEach(clearCell);
      choices.hidden = true; choices.innerHTML = "";
    }
    function mark(x, y, emoji, label) {
      const c = ctx.cellMap[x + "," + y];
      if (!c) return;
      c.classList.add("filled");
      c.innerHTML = `<span class="marker">${emoji}</span>`;
      c.setAttribute("aria-label", `${label} at X ${x}, Y ${y}`);
    }
    function pickKind() {
      const bag = save.tier === "easy" ? ["walk", "read", "walk", "far"]
        : save.tier === "normal" ? ["walk", "read", "far", "walk", "read", "far"]
        : ["walk", "far", "read", "walk", "far", "walk", "read", "far"];
      return bag[round % bag.length];
    }
    function nextRound() {
      if (round >= total) return done();
      clearBoard(); hideExplain(explain);
      misses = 0;
      prog.firstChild.style.width = (round / total * 100) + "%";
      const kind = pickKind();
      q = kind === "walk" ? makeWalk() : kind === "read" ? makeRead() : makeFar();
      instr.innerHTML = q.html + ` <span class="step-of">round ${round + 1}/${total}` +
        (streak >= 3 ? ` · 🔥${streak}` : "") + "</span>";
      instr.setAttribute("aria-label", q.aria);
      if (q.choices) renderChoices(q);
    }
    /* --- question builders --- */
    function makeWalk() {
      const sx = rnd(lo, hi - 1), sy = rnd(lo, hi - 1);
      let dx = rnd(neg ? -3 : 1, 3), dy = rnd(neg ? -3 : 1, 3);
      if (!dx) dx = 1;
      if (!dy) dy = 1;
      let tx = clamp(sx + dx, lo, hi), ty = clamp(sy + dy, lo, hi);
      // never ask someone to "walk" zero blocks in both directions
      if (tx === sx && ty === sy) tx = sx < hi ? sx + 1 : sx - 1;
      dx = tx - sx; dy = ty - sy;
      mark(sx, sy, "🚶", "You");
      const wordX = dx === 0 ? "" : `${Math.abs(dx)} block${Math.abs(dx) > 1 ? "s" : ""} ${dx > 0 ? "right →" : "left ←"}`;
      const wordY = dy === 0 ? "" : `${Math.abs(dy)} block${Math.abs(dy) > 1 ? "s" : ""} ${dy > 0 ? "up ↑" : "down ↓"}`;
      const words = [wordX, wordY].filter(Boolean).join(" and then ");
      return {
        kind: "walk", target: { x: tx, y: ty }, start: { x: sx, y: sy }, dx, dy,
        html: `🚶 You're standing at <span class="coord">(${sx}, ${sy})</span> — walk ${words}, then tap where you land!`,
        aria: `You are at X ${sx}, Y ${sy}. Walk ${words}. Tap where you land.`,
        maths: `${sx} ${dx < 0 ? "−" : "+"} ${Math.abs(dx)} = ${tx} across, and ` +
               `${sy} ${dy < 0 ? "−" : "+"} ${Math.abs(dy)} = ${ty} up.`,
      };
    }
    function makeRead() {
      const tx = rnd(lo, hi), ty = rnd(lo, hi);
      mark(tx, ty, "💎", "Diamond");
      const opts = [{ x: tx, y: ty }];
      const add = (p) => {
        if (p.x < lo || p.x > hi || p.y < lo || p.y > hi) return;
        if (opts.some((o) => o.x === p.x && o.y === p.y)) return;
        opts.push(p);
      };
      add({ x: ty, y: tx });                       // the classic swap
      add({ x: tx + (tx < hi ? 1 : -1), y: ty });  // one across
      add({ x: tx, y: ty + (ty < hi ? 1 : -1) });  // one up
      add({ x: tx + 1, y: ty + 1 });
      while (opts.length < 4) add({ x: rnd(lo, hi), y: rnd(lo, hi) });
      opts.length = 4;
      for (let i = opts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opts[i], opts[j]] = [opts[j], opts[i]];
      }
      return {
        kind: "read", target: { x: tx, y: ty },
        html: `💎 Where is the diamond? Pick its coordinate.`,
        aria: "Where is the diamond? Choose its coordinate.",
        choices: opts.map((o) => ({ label: `(${o.x}, ${o.y})`, value: o, ok: o.x === tx && o.y === ty })),
        maths: `Count across to ${tx} first, then up to ${ty}.`,
      };
    }
    function makeFar() {
      const taxi = save.tier === "expert" || save.tier === "master";
      let a, b, answer, how;
      if (taxi) {
        a = { x: rnd(lo, hi), y: rnd(lo, hi) };
        b = { x: rnd(lo, hi), y: rnd(lo, hi) };
        let tries = 0;
        while ((a.x === b.x && a.y === b.y) && tries++ < 50) b = { x: rnd(lo, hi), y: rnd(lo, hi) };
        answer = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
        how = `${Math.abs(b.x - a.x)} across + ${Math.abs(b.y - a.y)} up = ${answer} blocks of walking.`;
      } else {
        const horiz = Math.random() < 0.5;
        if (horiz) {
          const y = rnd(lo, hi);
          let x1 = rnd(lo, hi - 2), x2 = rnd(x1 + 2, hi);
          a = { x: x1, y }; b = { x: x2, y };
          answer = x2 - x1;
          how = `${x2} − ${x1} = ${answer} blocks. Same row, so only X changes!`;
        } else {
          const x = rnd(lo, hi);
          let y1 = rnd(lo, hi - 2), y2 = rnd(y1 + 2, hi);
          a = { x, y: y1 }; b = { x, y: y2 };
          answer = y2 - y1;
          how = `${y2} − ${y1} = ${answer} blocks. Same column, so only Y changes!`;
        }
      }
      mark(a.x, a.y, "🏠", "Home");
      mark(b.x, b.y, "🧰", "Chest");
      const set = new Set([answer]);
      while (set.size < 4) {
        const d = answer + rnd(-3, 3);
        if (d > 0 && d !== answer) set.add(d);
      }
      const opts = [...set].sort(() => Math.random() - 0.5);
      return {
        kind: "far", a, b, answer,
        html: `📏 How many blocks is it from 🏠 <span class="coord">(${a.x}, ${a.y})</span> ` +
              `to 🧰 <span class="coord">(${b.x}, ${b.y})</span> ?` +
              (taxi ? ' <span class="step-of">(walk across, then up)</span>' : ""),
        aria: `How many blocks from home at X ${a.x}, Y ${a.y} to the chest at X ${b.x}, Y ${b.y}?`,
        choices: opts.map((d) => ({ label: String(d), value: d, ok: d === answer })),
        maths: how,
      };
    }
    /* --- answering --- */
    function renderChoices(question) {
      choices.hidden = false;
      choices.innerHTML = "";
      question.choices.forEach((c) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "choice";
        b.textContent = c.label;
        b.onclick = () => answerChoice(c, b);
        choices.appendChild(b);
      });
    }
    function answerChoice(c, btn) {
      if (!q || !q.choices) return;
      if (c.ok) {
        btn.classList.add("right");
        good();
      } else {
        btn.classList.add("wrong"); btn.disabled = true;
        misses++; wrong++; streak = 0; Sound.dig(); sfx("nope");
        if (q.kind === "read") {
          showExplain(explain, explainMiss(c.value, q.target, { thing: "diamond" }) +
            `<div class="ex-line ex-move">${q.maths}</div>`);
          say(explainText(c.value, q.target));
        } else {
          showExplain(explain,
            `<div class="ex-line">Not ${c.label}. Count the squares between them.</div>
             <div class="ex-line ex-move">${q.maths}</div>`);
          say(`Not ${c.label}. ${q.maths}`);
        }
        if (misses >= cfg.hintAfter && q.kind === "far") {
          traceBetween(q.a, q.b);
        }
      }
    }
    function traceBetween(a, b) {
      const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x);
      const y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
      for (let x = x0; x <= x1; x++) ctx.flash(x, a.y, 1600);
      for (let y = y0; y <= y1; y++) ctx.flash(b.x, y, 1600);
    }
    function onTap(x, y, cell) {
      if (!q) return;
      if (q.choices) { say("Tap one of the answer buttons below the grid."); return; }
      if (x === q.target.x && y === q.target.y) {
        place(cell, "gold", true);
        good();
      } else {
        shake(cell); Sound.dig(); misses++; wrong++; streak = 0;
        ctx.litAxis(q.target.x, q.target.y, true);
        setTimeout(() => ctx.litAxis(q.target.x, q.target.y, false), 1500);
        showExplain(explain, explainMiss({ x, y }, q.target, { thing: "landing square" }) +
          `<div class="ex-line ex-move">${q.maths}</div>`);
        say(explainText({ x, y }, q.target));
        if (misses >= cfg.hintAfter) ctx.flash(q.target.x, q.target.y);
      }
    }
    function good() {
      if (misses === 0) score++;
      streak++; noteStreak(streak); addBlocks(1);
      Sound.gem(); sfx("good");
      hideExplain(explain);
      say(misses === 0 ? "Spot on! ⭐" : "Got it! 💪");
      round++;
      setTimeout(nextRound, reduceMotion ? 250 : 650);
    }
    function done() {
      q = null;
      clearBoard(); hideExplain(explain);
      prog.firstChild.style.width = "100%";
      instr.innerHTML = `Explorer run finished! 🚶✨`;
      const best = save.walkBest[save.tier] || 0;
      const isBest = score > best;
      if (isBest) save.walkBest[save.tier] = score;
      save.stats.quests = (save.stats.quests || 0) + 1;
      persist();
      sfx("win"); sparkle("🚶"); window.Confetti && Confetti.burst({ count: 90 });
      const banner = document.createElement("div");
      banner.className = "win-banner";
      banner.innerHTML = `
        <div style="font-size:2.6rem">🚶</div>
        <h2>${score} / ${total} first try</h2>
        <p>${wrong === 0 ? "Flawless walking! 🌟" : `${wrong} wrong tap${wrong === 1 ? "" : "s"} along the way`}</p>
        <p style="color:#6a6385">Best on ${tierMeta().name}: ${save.walkBest[save.tier]}/${total}${isBest ? " (new best!)" : ""}</p>
        <div class="row-btns">
          <button class="pill on" id="k-again">Walk again</button>
          <button class="pill" id="k-menu">Modes</button>
        </div>`;
      app.appendChild(banner);
      $("k-again").onclick = startWalk;
      $("k-menu").onclick = renderMenu;
    }
  }

  /* ===========================================================
     X, Y, Z  —  real Minecraft coordinates
     Y is HEIGHT. X is east/west. Z is north/south, and on the map
     +Z points SOUTH — i.e. downward — so that board's numbers grow
     downward too. Cory will recognise the F3 screen.
     =========================================================== */
  function startF3() {
    clearScreen();
    const cfg = tier(), cap = maxGrid();
    const n = Math.max(6, Math.min(cfg.dig, cap));
    const total = cfg.rounds;
    const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    let round = 0, score = 0, wrong = 0, misses = 0, quizIdx = 0;
    let nums = startNums();
    let q = null, ctx = null;

    const hud = document.createElement("div");
    hud.className = "hud";
    hud.innerHTML = `<button class="pill" id="z-back">← Modes</button>
      <button class="pill ${nums ? "on" : ""}" id="z-nums" aria-pressed="${nums}">Numbers: ${nums ? "On" : "Off"}</button>
      <span class="pill flat">${tierMeta().emoji} ${tierMeta().name}</span>`;
    app.appendChild(hud);

    const tip = document.createElement("p");
    tip.className = "intro f3tip";
    tip.innerHTML = `🧊 Press <b>F3</b> in Minecraft and you see three numbers:
      <b class="hx">X</b> = east ↔ west, <b class="hy">Y</b> = <b>how high up you are</b>,
      <b class="hz">Z</b> = north ↕ south. On the map, <b>bigger Z is further south (↓)</b>.`;
    app.appendChild(tip);

    const instr = document.createElement("div");
    instr.className = "instruction"; app.appendChild(instr);

    const prog = document.createElement("div");
    prog.className = "progress"; prog.innerHTML = "<i></i>";
    app.appendChild(prog);

    const boardHost = document.createElement("div");
    boardHost.className = "board-wrap";
    app.appendChild(boardHost);

    const choices = document.createElement("div");
    choices.className = "choices"; choices.hidden = true;
    app.appendChild(choices);

    const explain = makeExplain();
    app.appendChild(explain);

    $("z-back").onclick = renderMenu;
    $("z-nums").onclick = () => { nums = toggleNums(ctx, $("z-nums"), nums); };
    nextRound();

    const QUIZ = [
      { q: "Which number tells you <b>how high up</b> you are?",
        opts: ["X", "Y", "Z"], ok: "Y",
        why: "Y is height. Sea level is about Y = 62, and diamonds hide near Y = -59." },
      { q: "You climb <b>up</b> a ladder 5 blocks. Which number goes <b>up by 5</b>?",
        opts: ["X", "Y", "Z"], ok: "Y",
        why: "Climbing changes only your height, and height is Y." },
      { q: "You walk <b>east</b> 10 blocks. Which number changes?",
        opts: ["X", "Y", "Z"], ok: "X",
        why: "X is the east–west number. East makes X bigger." },
      { q: "You walk <b>south</b> 8 blocks. Which number changes?",
        opts: ["X", "Y", "Z"], ok: "Z",
        why: "Z is the north–south number. South makes Z bigger." },
      { q: "You're at Y = 11 and your friend is at Y = 70. Who is <b>higher</b>?",
        opts: ["Me", "My friend", "Same"], ok: "My friend",
        why: "70 is a bigger number than 11, and bigger Y means higher up." },
      { q: "Which pair is the <b>map</b> position (forget height)?",
        opts: ["X and Y", "X and Z", "Y and Z"], ok: "X and Z",
        why: "Looking down at a map you only need east–west (X) and north–south (Z)." },
    ];
    const quizBag = QUIZ.slice().sort(() => Math.random() - 0.5);

    function nextRound() {
      if (round >= total) return done();
      hideExplain(explain);
      choices.hidden = true; choices.innerHTML = "";
      boardHost.innerHTML = "";
      misses = 0;
      prog.firstChild.style.width = (round / total * 100) + "%";
      const kind = ["side", "top", "quiz"][round % 3];
      if (kind === "quiz") return askQuiz();
      if (kind === "side") return askSide();
      return askTop();
    }
    function buildBoard(opts) {
      ctx = makeBoard(n, onTap, Object.assign({ numbers: nums }, opts));
      boardCtx = ctx;
      boardHost.appendChild(ctx.board);
      ctx.size();
    }
    function askSide() {
      buildBoard({ xName: "X", yName: "Y" });
      ctx.board.classList.add("sideview");
      const x = rnd(1, n), y = rnd(1, n);
      q = { kind: "side", target: { x, y }, names: ["X", "Y"],
            maths: `X = ${x} means ${x} across. Y = ${y} means ${y} blocks HIGH.` };
      instr.innerHTML = `⛏️ <b>Side view</b> (you can see the height!). The diamonds are at ` +
        `<span class="coord">X ${x}</span> <span class="coord">Y ${y}</span> — dig there. ` +
        `<span class="step-of">round ${round + 1}/${total}</span>`;
      instr.setAttribute("aria-label", `Side view. Dig at X ${x}, height Y ${y}.`);
    }
    function askTop() {
      buildBoard({ xName: "X", yName: "Z", flipY: true });
      ctx.board.classList.add("topview");
      const x = rnd(1, n), z = rnd(1, n);
      q = { kind: "top", target: { x, y: z }, names: ["X", "Z"],
            maths: `X = ${x} goes east →. Z = ${z} goes south ↓ (bigger Z is further down the map).` };
      instr.innerHTML = `🗺️ <b>Map view</b> (looking straight down). The village is at ` +
        `<span class="coord">X ${x}</span> <span class="coord">Z ${z}</span> — tap it. ` +
        `<span class="step-of">round ${round + 1}/${total}</span>`;
      instr.setAttribute("aria-label", `Map view. Tap X ${x}, Z ${z}. Bigger Z is further down.`);
    }
    function askQuiz() {
      const item = quizBag[quizIdx++ % quizBag.length];
      q = { kind: "quiz", item };
      ctx = null;
      instr.innerHTML = `🧊 ${item.q} <span class="step-of">round ${round + 1}/${total}</span>`;
      instr.setAttribute("aria-label", item.q.replace(/<[^>]+>/g, ""));
      choices.hidden = false;
      item.opts.slice().sort(() => Math.random() - 0.5).forEach((o) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "choice big"; b.textContent = o;
        b.onclick = () => {
          if (o === item.ok) { b.classList.add("right"); good(); }
          else {
            b.classList.add("wrong"); b.disabled = true;
            misses++; wrong++; sfx("nope"); Sound.dig();
            showExplain(explain,
              `<div class="ex-line">Not <b>${o}</b>.</div>
               <div class="ex-line ex-move">${item.why}</div>`);
            say(`Not ${o}. ${item.why.replace(/<[^>]+>/g, "")}`);
          }
        };
        choices.appendChild(b);
      });
    }
    function onTap(x, y, cell) {
      if (!q || q.kind === "quiz") return;
      if (x === q.target.x && y === q.target.y) {
        place(cell, q.kind === "side" ? "diamond" : "planks", true);
        good();
      } else {
        shake(cell); Sound.dig(); misses++; wrong++;
        ctx.litAxis(q.target.x, q.target.y, true);
        setTimeout(() => ctx.litAxis(q.target.x, q.target.y, false), 1500);
        showExplain(explain,
          explainMiss({ x, y }, q.target, { names: q.names, thing: q.kind === "side" ? "diamond" : "village" }) +
          `<div class="ex-line ex-move">${q.maths}</div>`);
        say(explainText({ x, y }, q.target, q.names));
        if (misses >= cfg.hintAfter) ctx.flash(q.target.x, q.target.y);
      }
    }
    function good() {
      if (misses === 0) score++;
      Sound.gem(); sfx("good"); addBlocks(1);
      hideExplain(explain);
      say(misses === 0 ? "Yes! ⭐" : "That's it! 💪");
      round++;
      setTimeout(nextRound, reduceMotion ? 250 : 700);
    }
    function done() {
      q = null; ctx = null;
      boardHost.innerHTML = ""; choices.hidden = true; choices.innerHTML = "";
      hideExplain(explain);
      prog.firstChild.style.width = "100%";
      instr.innerHTML = "F3 run complete! 🧊";
      const best = save.f3Best[save.tier] || 0;
      const isBest = score > best;
      if (isBest) save.f3Best[save.tier] = score;
      save.stats.quests = (save.stats.quests || 0) + 1;
      persist();
      sfx("win"); sparkle("🧊"); window.Confetti && Confetti.burst({ count: 90 });
      const banner = document.createElement("div");
      banner.className = "win-banner";
      banner.innerHTML = `
        <div style="font-size:2.6rem">🧊</div>
        <h2>${score} / ${total} first try</h2>
        <p>${wrong === 0 ? "Perfect coordinates! 🌟" : `${wrong} slip${wrong === 1 ? "" : "s"}`}</p>
        <p style="color:#6a6385">Best on ${tierMeta().name}: ${save.f3Best[save.tier]}/${total}${isBest ? " (new best!)" : ""}</p>
        <div class="row-btns">
          <button class="pill on" id="z-again">Play again</button>
          <button class="pill" id="z-menu">Modes</button>
        </div>`;
      app.appendChild(banner);
      $("z-again").onclick = startF3;
      $("z-menu").onclick = renderMenu;
    }
  }

  /* ---------- free build ---------- */
  function startFree() {
    clearScreen();
    const n = 8;
    const BLOCKS = ["grass", "dirt", "stone", "cobble", "planks", "log", "leaves",
      "water", "sand", "diamond", "gold", "red", "purple", "pink", "white", "black"];
    let selected = BLOCKS[0];
    let nums = save.numbersOn;
    const grid = (save.free && save.free.n === n && save.free.cells) ? save.free.cells : {};

    const hud = document.createElement("div");
    hud.className = "hud";
    hud.innerHTML = `<button class="pill" id="f-back">← Modes</button>
      <button class="pill" id="f-clear">🧹 Clear all</button>
      <button class="pill ${nums ? "on" : ""}" id="f-nums" aria-pressed="${nums}">Numbers: ${nums ? "On" : "Off"}</button>`;
    app.appendChild(hud);

    const tip = document.createElement("p");
    tip.className = "intro"; tip.style.margin = "0.5rem 0";
    tip.innerHTML = "Pick a block, then tap the grid. Tap the same block again to erase it. " +
      "Your world saves itself — come back and it'll still be here.";
    app.appendChild(tip);

    const readout = document.createElement("div");
    readout.className = "readout";
    readout.innerHTML = `<span class="coord">(–, –)</span>`;
    app.appendChild(readout);

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

    const ctx = makeBoard(n, onTap, { numbers: nums });
    boardCtx = ctx;
    const bw = document.createElement("div");
    bw.className = "board-wrap"; bw.appendChild(ctx.board);
    app.appendChild(bw);
    ctx.size();

    // live "where am I?" readout — names the square under your finger
    ctx.board.addEventListener("pointerover", (e) => {
      const c = e.target.closest && e.target.closest(".cell");
      if (c) readout.innerHTML = `<span class="coord">(${c.dataset.x}, ${c.dataset.y})</span>`;
    });
    ctx.board.addEventListener("focusin", (e) => {
      const c = e.target.closest && e.target.closest(".cell");
      if (c) readout.innerHTML = `<span class="coord">(${c.dataset.x}, ${c.dataset.y})</span>`;
    });

    Object.keys(grid).forEach((key) => {
      const cell = ctx.cellMap[key];
      if (cell) place(cell, grid[key], false);
    });

    $("f-back").onclick = renderMenu;
    $("f-nums").onclick = () => { nums = toggleNums(ctx, $("f-nums"), nums); };
    $("f-clear").onclick = () => {
      Object.keys(grid).forEach((k) => delete grid[k]);
      Object.values(ctx.cellMap).forEach(clearCell);
      persistFree(); say("Cleared! Fresh grid.");
    };
    function persistFree() { save.free = { n, cells: grid }; persist(); }
    function onTap(x, y, cell) {
      const key = x + "," + y;
      readout.innerHTML = `<span class="coord">(${x}, ${y})</span>`;
      if (grid[key] === selected) {
        delete grid[key]; clearCell(cell);
        say(`Cleared (${x}, ${y})`);
      } else {
        grid[key] = selected; place(cell, selected, true); Sound.place(0);
        say(`You placed a ${selected} block at (${x}, ${y})`);
      }
      persistFree();
    }
  }

  /* ---------- shared: numbers toggle ----------
     Returns the new state so each mode can keep its own copy — the
     grown-up tier starts with the numbers hidden without stomping
     on the saved preference. */
  function toggleNums(ctx, btn, cur) {
    const on = !cur;
    save.numbersOn = on; numsOverride = on; persist();
    if (ctx && ctx.setNums) ctx.setNums(on);
    btn.classList.toggle("on", on);
    btn.setAttribute("aria-pressed", String(on));
    btn.textContent = "Numbers: " + (on ? "On" : "Off");
    return on;
  }

  /* ---------------- go! ---------------- */
  renderMenu();
})();
