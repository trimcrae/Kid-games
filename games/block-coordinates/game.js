/* ===========================================================
   Block Coordinates  —  a Minecraft-themed coordinate-plane
   builder for Cory (and anyone who likes blocks!).

   Teaches: reading & plotting (X, Y) coordinates on a grid —
   column first (X, →), then row (Y, ↑). Origin is the
   bottom-left corner, just like the math coordinate plane.

   Pure vanilla JS, no build step. Sound via the shared
   window.SFX helper. Progress saved in localStorage.
   =========================================================== */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const sfx = (m, ...a) => { try { if (window.SFX && SFX[m]) SFX[m](...a); } catch (e) {} };
  const reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- save / load ---------------- */
  const KEY = "block-coordinates.v1";
  const defaults = () => ({
    done: {},            // { levelId: true } completed build levels (a star each)
    numbersOn: true,     // show the axis numbers?
    treasureBest: null,  // fewest wrong digs in a treasure round
    free: null,          // saved free-build grid
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
     Art rows are typed top → bottom. A '.' is empty.
     Each letter maps (via the level's legend) to a block emoji.
     Levels are ordered easy → hard; the grid grows as you go. */
  const LEVELS = [
    {
      id: "heart", name: "Heart", emoji: "❤️", size: 6,
      legend: { R: "🟥" },
      art: [
        "RR..RR",
        "RRRRRR",
        "RRRRRR",
        ".RRRR.",
        "..RR..",
        "......",
      ],
    },
    {
      id: "tree", name: "Tree", emoji: "🌳", size: 6,
      legend: { G: "🟩", W: "🟫" },
      art: [
        ".GGGG.",
        "GGGGGG",
        "GGGGGG",
        ".GGGG.",
        "..WW..",
        "..WW..",
      ],
    },
    {
      id: "creeper", name: "Creeper", emoji: "🟩", size: 6,
      legend: { G: "🟩", K: "⬛" },
      art: [
        "GGGGGG",
        "GKKGKK",
        "GKKGKK",
        "GGKKGG",
        "GKKKKG",
        "GGGGGG",
      ],
    },
    {
      id: "house", name: "House", emoji: "🏠", size: 8,
      legend: { R: "🟥", O: "🟧", B: "🟦", D: "🟫" },
      art: [
        "...RR...",
        "..RRRR..",
        ".RRRRRR.",
        "RRRRRRRR",
        "OOOOOOOO",
        "OBOOOOBO",
        "OOODDOOO",
        "OOODDOOO",
      ],
    },
    {
      id: "sword", name: "Sword", emoji: "🗡️", size: 8,
      legend: { B: "🟦", Y: "🟨", W: "🟫" },
      art: [
        "...BB...",
        "...BB...",
        "...BB...",
        "...BB...",
        "..YYYY..",
        "...WW...",
        "...WW...",
        "...WW...",
      ],
    },
    {
      id: "diamond", name: "Diamond", emoji: "💎", size: 10,
      legend: { B: "🟦", S: "⬜" },
      art: [
        "....BB....",
        "...BBBB...",
        "..BBSBBB..",
        ".BBBBBBBB.",
        "BBBBBBBBBB",
        "BBBBBBBBBB",
        ".BBBBBBBB.",
        "..BBBBBB..",
        "...BBBB...",
        "....BB....",
      ],
    },
    {
      id: "flower", name: "Flower", emoji: "🌸", size: 10,
      legend: { P: "🟪", Y: "🟨", G: "🟩", W: "🟫" },
      art: [
        "....PP....",
        "...PYYP...",
        "..PPYYPP..",
        "...PPPP...",
        "....GG....",
        "...GGGG...",
        "....GG....",
        "....GG....",
        "....GG....",
        "WWWWWWWWWW",
      ],
    },
  ];

  // Turn a blueprint's art into a coordinate list, built from the
  // ground up (low Y first, then left-to-right) — like real building.
  function cellsOf(lvl) {
    const H = lvl.art.length;
    const out = [];
    lvl.art.forEach((row, i) => {
      const y = H - i;
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        if (ch && ch !== "." && ch !== " ") {
          out.push({ x: c + 1, y, block: lvl.legend[ch] || ch });
        }
      }
    });
    out.sort((a, b) => a.y - b.y || a.x - b.x);
    return out;
  }

  /* ---------------- shared board widget ---------------- */
  // Builds an n×n grid of cells with X (bottom) and Y (left) axis
  // labels. Returns helpers for the game modes to drive it.
  function makeBoard(n, onTap) {
    const board = document.createElement("div");
    board.className = "board";
    board.style.setProperty("--n", n);
    if (!save.numbersOn) board.classList.add("nonums");

    const cellMap = {};      // "x,y" -> cell element
    const xLabels = {};      // x -> label element
    const yLabels = {};      // y -> label element

    // rows top (y = n) down to (y = 1)
    for (let r = 0; r < n; r++) {
      const y = n - r;
      const yl = document.createElement("div");
      yl.className = "axis y";
      yl.textContent = y;
      yLabels[y] = yl;
      board.appendChild(yl);
      for (let x = 1; x <= n; x++) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "cell";
        cell.dataset.x = x;
        cell.dataset.y = y;
        cell.setAttribute("aria-label", `column ${x}, row ${y}`);
        cell.addEventListener("click", () => onTap(x, y, cell));
        cellMap[x + "," + y] = cell;
        board.appendChild(cell);
      }
    }
    // bottom axis row: corner + X labels
    const corner = document.createElement("div");
    corner.className = "corner";
    corner.textContent = "y/x";
    board.appendChild(corner);
    for (let x = 1; x <= n; x++) {
      const xl = document.createElement("div");
      xl.className = "axis x";
      xl.textContent = x;
      xLabels[x] = xl;
      board.appendChild(xl);
    }

    function size() {
      const host = $("app");
      const avail = Math.min((host && host.clientWidth) || 360, 540);
      const cell = Math.max(24, Math.min(56, Math.floor((avail - 38) / n) - 3));
      board.style.setProperty("--cell", cell + "px");
    }

    // light up the axis labels for a coordinate (the hint)
    function litAxis(x, y, on) {
      [xLabels[x], yLabels[y]].forEach((el) => {
        if (!el) return;
        el.classList.toggle("lit", !!on);
      });
    }

    return { board, cellMap, xLabels, yLabels, size, litAxis };
  }

  function place(cell, block, pop) {
    cell.classList.add("filled");
    cell.innerHTML = `<span class="blk">${block}</span>`;
    if (pop && !reduceMotion) {
      cell.classList.remove("pop");
      void cell.offsetWidth;
      cell.classList.add("pop");
    }
  }
  function shake(cell) {
    if (reduceMotion) return;
    cell.classList.remove("shake");
    void cell.offsetWidth;
    cell.classList.add("shake");
  }
  function say(msg) { const s = $("say"); if (s) s.textContent = msg || ""; }

  /* ---------------- celebration sparkles ---------------- */
  function sparkle(emoji) {
    if (reduceMotion) return;
    const chars = ["✨", emoji, "⭐", "💚", "✨"];
    for (let i = 0; i < 14; i++) {
      const s = document.createElement("span");
      s.textContent = chars[i % chars.length];
      s.style.cssText =
        "position:fixed;left:" + (10 + Math.random() * 80) + "vw;top:" +
        (20 + Math.random() * 40) + "vh;font-size:" + (1.4 + Math.random() * 1.6) +
        "rem;pointer-events:none;z-index:50;transition:transform 1s ease,opacity 1s ease;";
      document.body.appendChild(s);
      requestAnimationFrame(() => {
        s.style.transform = "translateY(-120px) rotate(" + (Math.random() * 180 - 90) + "deg)";
        s.style.opacity = "0";
      });
      setTimeout(() => s.remove(), 1100);
    }
  }

  /* ---------------- keyboard cursor (accessibility) ---------------- */
  let kbCursor = null; // {x,y,n,board,cellMap,tap}
  function enableCursor(n, ctx, tap) {
    kbCursor = { x: 1, y: 1, n, ctx, tap };
    paintCursor();
  }
  function disableCursor() { kbCursor = null; }
  function paintCursor() {
    if (!kbCursor) return;
    Object.values(kbCursor.ctx.cellMap).forEach((c) => c.classList.remove("cursor"));
    const c = kbCursor.ctx.cellMap[kbCursor.x + "," + kbCursor.y];
    if (c) c.classList.add("cursor");
  }
  document.addEventListener("keydown", (e) => {
    if (!kbCursor) return;
    const k = e.key;
    if (k === "ArrowRight") kbCursor.x = Math.min(kbCursor.n, kbCursor.x + 1);
    else if (k === "ArrowLeft") kbCursor.x = Math.max(1, kbCursor.x - 1);
    else if (k === "ArrowUp") kbCursor.y = Math.min(kbCursor.n, kbCursor.y + 1);
    else if (k === "ArrowDown") kbCursor.y = Math.max(1, kbCursor.y - 1);
    else if (k === "Enter" || k === " ") {
      const cell = kbCursor.ctx.cellMap[kbCursor.x + "," + kbCursor.y];
      if (cell) kbCursor.tap(kbCursor.x, kbCursor.y, cell);
      e.preventDefault();
      return;
    } else return;
    e.preventDefault();
    paintCursor();
  });

  window.addEventListener("resize", () => { if (boardCtx) boardCtx.size(); });
  let boardCtx = null;

  /* ============================================================
     SCREENS
     ============================================================ */
  const app = $("app");

  function clearScreen() {
    disableCursor();
    boardCtx = null;
    app.innerHTML = "";
    say("");
  }

  /* ---------- menu ---------- */
  function renderMenu() {
    clearScreen();
    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <p class="intro">
        Read the grid like Minecraft! Every block has a spot:
        <b>(X, Y)</b> means count <b>across →</b> then <b>up ↑</b>.
        Place blocks to build pictures, dig for treasure, or build whatever you like.
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
      </div>
    `;
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
      card.innerHTML = `
        ${save.done[lvl.id] ? '<span class="star">⭐</span>' : ""}
        <span class="lvemoji">${lvl.emoji}</span>
        <span class="lvname">${lvl.name}</span>
        <span class="lvsize">${lvl.size}×${lvl.size}</span>`;
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
    let pos = 0;
    let misses = 0;

    const hud = document.createElement("div");
    hud.className = "hud";
    hud.innerHTML = `
      <button class="pill" id="b-back">← Levels</button>
      <button class="pill ${save.numbersOn ? "on" : ""}" id="b-nums">
        Numbers: ${save.numbersOn ? "On" : "Off"}</button>`;
    app.appendChild(hud);

    const instr = document.createElement("div");
    instr.className = "instruction";
    app.appendChild(instr);

    const prog = document.createElement("div");
    prog.className = "progress";
    prog.innerHTML = "<i></i>";
    app.appendChild(prog);

    const ctx = makeBoard(lvl.size, onTap);
    boardCtx = ctx;
    const bw = document.createElement("div");
    bw.className = "board-wrap";
    bw.appendChild(ctx.board);
    app.appendChild(bw);
    ctx.size();
    enableCursor(lvl.size, ctx, onTap);

    // faint "hologram" ghost of the finished picture
    steps.forEach((s) => {
      const cell = ctx.cellMap[s.x + "," + s.y];
      if (cell) cell.innerHTML = `<span class="blk ghost">${s.block}</span>`;
    });

    $("b-back").onclick = renderLevelPicker;
    $("b-nums").onclick = () => {
      save.numbersOn = !save.numbersOn;
      persist();
      ctx.board.classList.toggle("nonums", !save.numbersOn);
      const btn = $("b-nums");
      btn.classList.toggle("on", save.numbersOn);
      btn.textContent = "Numbers: " + (save.numbersOn ? "On" : "Off");
    };

    showStep();

    function showStep() {
      if (pos >= steps.length) return finish();
      const s = steps[pos];
      instr.innerHTML =
        `Place <span class="blk">${s.block}</span> at ` +
        `<span class="coord">(${s.x}, ${s.y})</span>`;
      misses = 0;
    }

    function onTap(x, y, cell) {
      if (pos >= steps.length) return;
      const s = steps[pos];
      if (x === s.x && y === s.y) {
        place(cell, s.block, true);
        sfx("good");
        pos++;
        prog.firstChild.style.width = (pos / steps.length * 100) + "%";
        showStep();
      } else {
        shake(cell);
        sfx("nope");
        misses++;
        // scaffold: first miss lights the axes; second pulses the cell
        ctx.litAxis(s.x, s.y, true);
        setTimeout(() => ctx.litAxis(s.x, s.y, false), 1600);
        say(misses === 1
          ? `Not quite — count across to ${s.x}, then up to ${s.y}.`
          : `Look where column ${s.x} and row ${s.y} meet ✨`);
        if (misses >= 2) {
          const t = ctx.cellMap[s.x + "," + s.y];
          if (t) { t.classList.add("target-pulse"); setTimeout(() => t.classList.remove("target-pulse"), 1800); }
        }
      }
    }

    function finish() {
      instr.innerHTML = `You built a ${lvl.name}! ${lvl.emoji}`;
      const firstTime = !save.done[lvl.id];
      save.done[lvl.id] = true;
      persist();
      sfx("win");
      sparkle(lvl.emoji);
      say(firstTime ? "New blueprint complete — ⭐ earned!" : "Built it again — nice!");
      disableCursor();

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
    const n = 8;
    const TARGETS = 5;

    // pick unique random spots
    const spots = [];
    const used = {};
    while (spots.length < TARGETS) {
      const x = 1 + Math.floor(Math.random() * n);
      const y = 1 + Math.floor(Math.random() * n);
      const key = x + "," + y;
      if (!used[key]) { used[key] = true; spots.push({ x, y }); }
    }
    let idx = 0;
    let wrong = 0;

    const hud = document.createElement("div");
    hud.className = "hud";
    hud.innerHTML = `<button class="pill" id="t-back">← Modes</button>
      <button class="pill ${save.numbersOn ? "on" : ""}" id="t-nums">Numbers: ${save.numbersOn ? "On" : "Off"}</button>`;
    app.appendChild(hud);

    const instr = document.createElement("div");
    instr.className = "instruction";
    app.appendChild(instr);

    const ctx = makeBoard(n, onTap);
    boardCtx = ctx;
    const bw = document.createElement("div");
    bw.className = "board-wrap";
    bw.appendChild(ctx.board);
    app.appendChild(bw);
    ctx.size();
    enableCursor(n, ctx, onTap);

    $("t-back").onclick = renderMenu;
    $("t-nums").onclick = () => {
      save.numbersOn = !save.numbersOn; persist();
      ctx.board.classList.toggle("nonums", !save.numbersOn);
      const b = $("t-nums"); b.classList.toggle("on", save.numbersOn);
      b.textContent = "Numbers: " + (save.numbersOn ? "On" : "Off");
    };

    showClue();

    function showClue() {
      if (idx >= spots.length) return done();
      const s = spots[idx];
      instr.innerHTML =
        `💎 Treasure is buried at <span class="coord">(${s.x}, ${s.y})</span> — dig there! ` +
        `<span style="font-size:.9rem;color:#6a6385">(${idx}/${TARGETS} found)</span>`;
    }

    function onTap(x, y, cell) {
      if (idx >= spots.length || cell.classList.contains("filled") || cell.classList.contains("dug")) return;
      const s = spots[idx];
      if (x === s.x && y === s.y) {
        place(cell, "💎", true);
        sfx("good");
        idx++;
        say("Found it! 💎");
        showClue();
      } else {
        cell.classList.add("dug");
        cell.innerHTML = '<span class="blk">🟫</span>';
        shake(cell);
        sfx("nope");
        wrong++;
        ctx.litAxis(s.x, s.y, true);
        setTimeout(() => ctx.litAxis(s.x, s.y, false), 1500);
        say(`Just dirt! Count across to ${s.x}, then up to ${s.y}.`);
      }
    }

    function done() {
      instr.innerHTML = `All ${TARGETS} treasures found! 💎✨`;
      const best = save.treasureBest;
      if (best === null || wrong < best) { save.treasureBest = wrong; persist(); }
      sfx("win"); sparkle("💎");
      disableCursor();
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
    const BLOCKS = ["🟩", "🟫", "⬛", "⬜", "🟦", "🟥", "🟨", "🟧", "🟪"];
    let selected = BLOCKS[0];

    const grid = (save.free && save.free.n === n && save.free.cells) ? save.free.cells : {};

    const hud = document.createElement("div");
    hud.className = "hud";
    hud.innerHTML = `<button class="pill" id="f-back">← Modes</button>
      <button class="pill" id="f-clear">🧹 Clear all</button>
      <button class="pill ${save.numbersOn ? "on" : ""}" id="f-nums">Numbers: ${save.numbersOn ? "On" : "Off"}</button>`;
    app.appendChild(hud);

    const tip = document.createElement("p");
    tip.className = "intro";
    tip.style.margin = "0.5rem 0";
    tip.innerHTML = "Pick a block, then tap the grid. Tap a block twice to erase it.";
    app.appendChild(tip);

    const pal = document.createElement("div");
    pal.className = "palette";
    BLOCKS.forEach((b, i) => {
      const sw = document.createElement("button");
      sw.type = "button";
      sw.className = "swatch" + (i === 0 ? " sel" : "");
      sw.textContent = b;
      sw.setAttribute("aria-label", "block " + (i + 1));
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
    bw.className = "board-wrap";
    bw.appendChild(ctx.board);
    app.appendChild(bw);
    ctx.size();
    enableCursor(n, ctx, onTap);

    // restore saved blocks
    Object.keys(grid).forEach((key) => {
      const cell = ctx.cellMap[key];
      if (cell) place(cell, grid[key], false);
    });

    $("f-back").onclick = renderMenu;
    $("f-nums").onclick = () => {
      save.numbersOn = !save.numbersOn; persist();
      ctx.board.classList.toggle("nonums", !save.numbersOn);
      const b = $("f-nums"); b.classList.toggle("on", save.numbersOn);
      b.textContent = "Numbers: " + (save.numbersOn ? "On" : "Off");
    };
    $("f-clear").onclick = () => {
      Object.keys(grid).forEach((k) => delete grid[k]);
      Object.values(ctx.cellMap).forEach((c) => { c.className = "cell"; c.innerHTML = ""; });
      persistFree();
      say("Cleared! Fresh grid.");
    };

    function persistFree() { save.free = { n, cells: grid }; persist(); }

    function onTap(x, y, cell) {
      const key = x + "," + y;
      if (grid[key] === selected) {
        // erase
        delete grid[key];
        cell.className = "cell";
        cell.innerHTML = "";
        say(`Cleared (${x}, ${y})`);
      } else {
        grid[key] = selected;
        place(cell, selected, true);
        sfx("good");
        say(`You placed a block at (${x}, ${y})`);
      }
      persistFree();
    }
  }

  /* ---------------- go! ---------------- */
  renderMenu();
})();
