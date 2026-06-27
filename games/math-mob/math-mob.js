/* ===========================================================
   🏃 MATH MOB RUN
   -----------------------------------------------------------
   A "crowd runner" — the genre Cory loves from the ads — but
   the gates are MATH. Steer your mob left/right and pick the
   operation (+, −, ×, ÷) that grows your crew the most. It's
   sneaky mental-math practice: is "+8" better than "×2"? It
   depends on how many guys you have right now!

   Earn coins, buy upgrades, and your progress is saved to the
   browser with localStorage. No ads, ever. 🎉
   =========================================================== */

(() => {
  "use strict";

  // ---- Save / load progress -------------------------------------------
  const SAVE_KEY = "mcrae-math-mob-v1";
  const defaultSave = () => ({
    coins: 0,
    bestDist: 0,
    bestCrew: 0,
    upg: { crew: 0, coin: 0, shield: 0, magnet: 0 },
  });

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return defaultSave();
      const s = Object.assign(defaultSave(), JSON.parse(raw));
      s.upg = Object.assign(defaultSave().upg, s.upg || {});
      return s;
    } catch (e) {
      return defaultSave();
    }
  }
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
  }
  let save = loadSave();

  // ---- Upgrade definitions --------------------------------------------
  // Each upgrade: friendly name, what it does, max level, cost per level.
  const UPGRADES = [
    {
      key: "crew", ico: "👥", name: "Starting Crew", max: 8,
      desc: l => `Begin each run with ${1 + l} ${1 + l === 1 ? "runner" : "runners"}.`,
      cost: l => 40 + l * 35,
    },
    {
      key: "coin", ico: "🪙", name: "Coin Boost", max: 6,
      desc: l => `Earn ${Math.round((1 + l * 0.25) * 100)}% coins.`,
      cost: l => 60 + l * 45,
    },
    {
      key: "shield", ico: "🛡️", name: "Shield", max: 3,
      desc: l => l === 0 ? "Shrug off one barrier hit per run."
                         : `Shrug off ${l} barrier hit${l === 1 ? "" : "s"} per run.`,
      cost: l => 90 + l * 70,
    },
    {
      key: "magnet", ico: "🧲", name: "Coin Magnet", max: 5,
      desc: l => l === 0 ? "Pull in nearby coins as you run."
                         : `Pull in coins from much farther away (Lv ${l}).`,
      cost: l => 55 + l * 40,
    },
  ];
  const upgLevel = key => save.upg[key] || 0;

  // ---- DOM refs -------------------------------------------------------
  const $ = id => document.getElementById(id);
  const stage   = $("stage");
  const canvas  = $("game");
  const ctx     = canvas.getContext("2d");
  const hud      = $("hud");
  const crewEl   = $("crew");
  const runCoinsEl = $("run-coins");
  const distEl   = $("dist");

  const menu     = $("menu");
  const shopScreen = $("shop-screen");
  const gameover = $("gameover");

  // ---- Canvas sizing (crisp on retina) --------------------------------
  let W = 0, H = 0, DPR = 1;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const r = stage.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener("resize", resize);

  // ---- Game state -----------------------------------------------------
  const MAX_CREW = 9999;
  let state = "menu";          // menu | playing | over
  let crew = 1;                // how many runners
  let crewX = 0;               // centre x of the mob (pixels)
  let targetX = 0;             // where the mob is sliding toward
  let dist = 0;                // metres travelled
  let runCoins = 0;            // coins collected this run
  let bestCrewThisRun = 1;
  let shieldsLeft = 0;
  let speed = 0;               // world scroll speed (px/sec)
  let rows = [];               // gates + barriers
  let coins = [];              // collectible coins
  let floaters = [];           // little "+3" pop texts
  let spawnAccum = 0;          // pixels until next gate/barrier row
  let coinAccum = 0;           // pixels until next coin
  let keyDir = 0;              // -1 / 0 / +1 from arrow keys
  let lastT = 0;

  const playerY = () => H * 0.80;     // the trigger line / where the mob runs
  const bandH = 64;                    // height of a gate/barrier band

  // ---- Helpers --------------------------------------------------------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand  = (a, b) => a + Math.random() * (b - a);
  const pick  = arr => arr[(Math.random() * arr.length) | 0];

  // An "operation" applied by a gate.
  function makeOp(type, val) {
    const COL = {
      add: "#2e9bd6",   // blue  = grow by adding
      mul: "#8a5cff",   // purple = grow by multiplying
      sub: "#ff7a3d",   // orange = careful, takes some away
      div: "#ff4d6d",   // red   = careful, splits you up
    };
    const SY = { add: "+", mul: "×", sub: "−", div: "÷" };
    return {
      type, val, color: COL[type], label: SY[type] + val,
      apply(n) {
        if (type === "add") return n + val;
        if (type === "mul") return n * val;
        if (type === "sub") return Math.max(0, n - val);
        return Math.floor(n / val);              // div
      },
    };
  }

  // Build a pair of gates that makes for an interesting choice.
  function makeGatePair() {
    const tier = dist < 150 ? 1 : dist < 450 ? 2 : 3;
    let a, b;
    const r = Math.random();

    if (tier === 1) {
      // Easy: compare two additions, or add vs a small ×2.
      if (r < 0.6) {
        const v1 = pick([2, 3, 5]), v2 = pick([6, 8, 10]);
        a = makeOp("add", v1); b = makeOp("add", v2);
      } else {
        a = makeOp("mul", 2); b = makeOp("add", pick([3, 4, 5]));
      }
    } else if (tier === 2) {
      // Medium: add vs multiply, or sneak in a subtraction trap.
      if (r < 0.45) {
        a = makeOp("mul", pick([2, 3])); b = makeOp("add", pick([8, 10, 12, 15]));
      } else if (r < 0.8) {
        a = makeOp("add", pick([10, 15, 20])); b = makeOp("sub", pick([3, 5, 8]));
      } else {
        a = makeOp("mul", 2); b = makeOp("mul", 3);
      }
    } else {
      // Spicy: big multipliers, division traps, the works.
      if (r < 0.4) {
        a = makeOp("mul", pick([2, 3, 4])); b = makeOp("add", pick([15, 20, 25, 30]));
      } else if (r < 0.7) {
        a = makeOp("mul", pick([3, 4])); b = makeOp("div", 2);
      } else {
        a = makeOp("add", pick([20, 30])); b = makeOp("mul", pick([2, 3]));
      }
    }
    // Randomise which side is left/right.
    return Math.random() < 0.5 ? [a, b] : [b, a];
  }

  function spawnRow() {
    const r = Math.random();
    // After a little distance, mix in barriers to dodge.
    const barrierChance = dist < 80 ? 0 : 0.32;
    if (r < barrierChance) {
      const side = Math.random() < 0.5 ? "L" : "R"; // blocked half
      rows.push({ kind: "barrier", y: -bandH, side, done: false });
    } else {
      rows.push({ kind: "gate", y: -bandH, ops: makeGatePair(), done: false });
    }
  }

  function spawnCoin() {
    coins.push({ x: rand(W * 0.12, W * 0.88), y: -16, r: 11, got: false });
  }

  function addFloater(x, y, text, color) {
    floaters.push({ x, y, text, color, life: 1 });
  }

  // ---- Start / end ----------------------------------------------------
  function startRun() {
    resize();
    crew = 1 + upgLevel("crew");
    crewX = targetX = W / 2;
    dist = 0; runCoins = 0; bestCrewThisRun = crew;
    shieldsLeft = upgLevel("shield");
    speed = 240;
    rows = []; coins = []; floaters = [];
    spawnAccum = 0; coinAccum = 0;
    keyDir = 0;
    state = "playing";
    hide(menu); hide(shopScreen); hide(gameover);
    hud.style.display = "flex";
    syncHud();
    lastT = performance.now();
    requestAnimationFrame(loop);
  }

  function endRun() {
    state = "over";
    hud.style.display = "none";

    // Bank coins (with the Coin Boost upgrade applied).
    const earned = Math.round(runCoins * (1 + upgLevel("coin") * 0.25));
    save.coins += earned;

    const distR = Math.round(dist);
    const newBestDist = distR > save.bestDist;
    const newBestCrew = bestCrewThisRun > save.bestCrew;
    if (newBestDist) save.bestDist = distR;
    if (newBestCrew) save.bestCrew = bestCrewThisRun;
    persist();

    $("go-dist").textContent = distR;
    $("go-crew").textContent = bestCrewThisRun;
    $("go-coins").textContent = earned;
    $("go-title").textContent = newBestDist ? "New record! 🏆" : "Run finished! 🏁";
    $("go-best").textContent =
      `Best: ${save.bestDist} m • biggest mob 🏃 ${save.bestCrew}` +
      (earned !== runCoins ? `  (coin boost on!)` : "");
    show(gameover);
  }

  // ---- Main loop ------------------------------------------------------
  function loop(t) {
    if (state !== "playing") return;
    let dt = (t - lastT) / 1000;
    lastT = t;
    if (dt > 0.05) dt = 0.05;         // clamp big gaps (tab switches)
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  function update(dt) {
    // Speed creeps up the farther you get.
    speed = 240 + Math.min(dist * 0.9, 360);
    const dy = speed * dt;
    dist += dy / 26;                  // pixels -> "metres"

    // Steer the mob.
    if (keyDir !== 0) targetX = clamp(targetX + keyDir * 620 * dt, 0, W);
    crewX += (targetX - crewX) * Math.min(1, dt * 12);
    crewX = clamp(crewX, mobRadius() + 6, W - mobRadius() - 6);

    // Spawn gates/barriers on a spacing that tightens as you speed up.
    spawnAccum += dy;
    const rowGap = clamp(H * 0.95 - dist * 0.4, H * 0.55, H * 1.1);
    if (spawnAccum >= rowGap) { spawnAccum = 0; spawnRow(); }

    // Sprinkle coins between rows.
    coinAccum += dy;
    if (coinAccum >= H * 0.16) { coinAccum = 0; spawnCoin(); }

    // Move + resolve rows.
    const py = playerY();
    for (const row of rows) {
      row.y += dy;
      if (!row.done && row.y >= py) {
        row.done = true;
        if (row.kind === "gate") applyGate(row);
        else applyBarrier(row);
      }
    }
    rows = rows.filter(r => r.y < H + bandH * 2);

    // Move + collect coins.
    const pull = mobRadius() + 26 + upgLevel("magnet") * 26;
    for (const c of coins) {
      c.y += dy;
      if (!c.got) {
        // Magnet: drift nearby coins toward the mob.
        if (upgLevel("magnet") > 0 && Math.abs(c.y - py) < 150) {
          c.x += clamp(crewX - c.x, -260 * dt, 260 * dt);
        }
        const dx = c.x - crewX, dyc = c.y - py;
        if (Math.hypot(dx, dyc) < pull) {
          c.got = true; runCoins++; addFloater(c.x, c.y, "🪙", "#c98a00");
        }
      }
    }
    coins = coins.filter(c => !c.got && c.y < H + 30);

    // Floating texts fade upward.
    for (const f of floaters) { f.y -= 40 * dt; f.life -= dt * 1.3; }
    floaters = floaters.filter(f => f.life > 0);

    bestCrewThisRun = Math.max(bestCrewThisRun, crew);
    syncHud();

    if (crew <= 0) { crew = 0; syncHud(); endRun(); }
  }

  function applyGate(row) {
    const onRight = crewX >= W / 2;
    const chosen = onRight ? row.ops[1] : row.ops[0];
    const other  = onRight ? row.ops[0] : row.ops[1];
    const before = crew;
    crew = clamp(chosen.apply(crew), 0, MAX_CREW);

    // Reward smart choices with a couple of bonus coins — reinforces the math.
    const gotBigger = chosen.apply(before) > other.apply(before);
    const delta = crew - before;
    const msg = delta >= 0 ? "+" + delta : "" + delta;
    addFloater(crewX, playerY() - 30, msg, delta >= 0 ? "#2bb673" : "#ff4d6d");
    if (gotBigger && before > 0) {
      runCoins += 2;
      addFloater(crewX + 30, playerY() - 56, "Smart! +2🪙", "#8a5cff");
    }
  }

  function applyBarrier(row) {
    const onRight = crewX >= W / 2;
    const hit = (row.side === "R") === onRight;   // mob is on the blocked half
    if (!hit) return;
    if (shieldsLeft > 0) {
      shieldsLeft--;
      addFloater(crewX, playerY() - 30, "🛡️ blocked!", "#38b6ff");
      return;
    }
    const before = crew;
    crew = Math.max(0, Math.ceil(crew * 0.6) - 1);  // lose ~40%
    addFloater(crewX, playerY() - 30, "-" + (before - crew), "#ff4d6d");
  }

  // ---- Rendering ------------------------------------------------------
  function mobRadius() {
    // The mob's footprint grows a little with the crowd (cosmetic).
    return clamp(14 + Math.sqrt(Math.max(1, crew)) * 3.4, 16, W * 0.32);
  }

  function render() {
    // Sky / ground
    ctx.clearRect(0, 0, W, H);
    const py = playerY();

    // Ground track
    ctx.fillStyle = "#cdeffd";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#8fd6a6";
    ctx.fillRect(0, py + mobRadius() + 8, W, H);   // grassy finish strip behind

    // Lane divider (dashed line down the middle)
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 4;
    ctx.setLineDash([18, 16]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    // Coins
    for (const c of coins) {
      if (c.got) continue;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fillStyle = "#ffd166";
      ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = "#e0a92e"; ctx.stroke();
      ctx.fillStyle = "#b7860b";
      ctx.font = "bold 12px " + FONT;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("$", c.x, c.y + 1);
    }

    // Rows (gates + barriers)
    for (const row of rows) {
      if (row.kind === "gate") drawGate(row);
      else drawBarrier(row);
    }

    // The mob of runners
    drawMob();

    // Floating texts
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const f of floaters) {
      ctx.globalAlpha = clamp(f.life, 0, 1);
      ctx.fillStyle = f.color;
      ctx.font = "bold 20px " + FONT;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

  function drawGate(row) {
    const y = row.y, h = bandH;
    const halves = [
      { x: 0, w: W / 2, op: row.ops[0] },
      { x: W / 2, w: W / 2, op: row.ops[1] },
    ];
    for (const half of halves) {
      // translucent coloured band
      ctx.fillStyle = hexA(half.op.color, 0.78);
      ctx.fillRect(half.x, y, half.w, h);
      // bright top edge
      ctx.fillStyle = hexA(half.op.color, 1);
      ctx.fillRect(half.x, y, half.w, 6);
      // label
      ctx.fillStyle = "#fff";
      ctx.font = "bold 30px " + FONT;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(half.op.label, half.x + half.w / 2, y + h / 2 + 2);
    }
    // post in the middle
    ctx.fillStyle = "#fff";
    ctx.fillRect(W / 2 - 3, y - 4, 6, h + 8);
  }

  function drawBarrier(row) {
    const y = row.y, h = bandH;
    const x = row.side === "L" ? 0 : W / 2;
    const w = W / 2;
    // hazard block
    ctx.fillStyle = hexA("#ff4d6d", 0.9);
    ctx.fillRect(x, y, w, h);
    // hazard stripes
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (let i = -h; i < w; i += 26) {
      ctx.beginPath();
      ctx.moveTo(x + i, y); ctx.lineTo(x + i + 12, y);
      ctx.lineTo(x + i + 12 + h, y + h); ctx.lineTo(x + i + h, y + h);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = "#fff";
    ctx.font = "bold 26px " + FONT;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("⛔", x + w / 2, y + h / 2 + 1);
  }

  function drawMob() {
    const py = playerY();
    const R = mobRadius();
    // How many little runners to actually draw (cap for performance).
    const show = Math.min(crew, 28);
    // Arrange them in a tidy huddle around the centre.
    for (let i = 0; i < show; i++) {
      const ang = i * 2.399963;                 // golden-angle spread
      const rad = (i === 0) ? 0 : R * Math.sqrt(i / show);
      const gx = crewX + Math.cos(ang) * rad;
      const gy = py + Math.sin(ang) * rad * 0.55;
      drawRunner(gx, gy);
    }
    // Big crew number floating above the mob.
    ctx.fillStyle = "#2b2440";
    ctx.font = "bold 26px " + FONT;
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.lineWidth = 5; ctx.strokeStyle = "rgba(255,255,255,0.95)";
    const label = "🏃 " + crew;
    ctx.strokeText(label, crewX, py - R - 14);
    ctx.fillText(label, crewX, py - R - 14);
  }

  function drawRunner(x, y) {
    // little blue runner: body + head
    ctx.fillStyle = "#3a6ff0";
    ctx.beginPath();
    ctx.roundRect(x - 4, y - 4, 8, 13, 3);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y - 9, 4.6, 0, Math.PI * 2);
    ctx.fillStyle = "#ffd9a8";
    ctx.fill();
  }

  // roundRect polyfill for older canvases
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      this.beginPath();
      this.moveTo(x + r, y);
      this.arcTo(x + w, y, x + w, y + h, r);
      this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r);
      this.arcTo(x, y, x + w, y, r);
      this.closePath();
      return this;
    };
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  // ---- HUD ------------------------------------------------------------
  function syncHud() {
    crewEl.textContent = crew;
    runCoinsEl.textContent = runCoins;
    distEl.textContent = Math.round(dist);
  }

  // ---- Input ----------------------------------------------------------
  // Drag / swipe: the mob follows your finger or mouse.
  let pointerDown = false;
  function pointerPos(e) {
    const r = canvas.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    return clamp(cx, 0, W);
  }
  function onDown(e) {
    if (state !== "playing") return;
    pointerDown = true; targetX = pointerPos(e); e.preventDefault();
  }
  function onMove(e) {
    if (!pointerDown || state !== "playing") return;
    targetX = pointerPos(e); e.preventDefault();
  }
  function onUp() { pointerDown = false; }

  canvas.addEventListener("mousedown", onDown);
  canvas.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
  canvas.addEventListener("touchstart", onDown, { passive: false });
  canvas.addEventListener("touchmove", onMove, { passive: false });
  window.addEventListener("touchend", onUp);

  window.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft" || e.key === "a") keyDir = -1;
    else if (e.key === "ArrowRight" || e.key === "d") keyDir = 1;
    else if (e.key === " " && state !== "playing") startRun();
  });
  window.addEventListener("keyup", e => {
    if (["ArrowLeft", "ArrowRight", "a", "d"].includes(e.key)) keyDir = 0;
  });

  // ---- Overlays / shop UI ---------------------------------------------
  function show(el) { el.classList.remove("hidden"); }
  function hide(el) { el.classList.add("hidden"); }

  function refreshMenu() {
    $("bank").textContent = save.coins;
    $("best-line").textContent = save.bestDist
      ? `Best run: ${save.bestDist} m • biggest mob 🏃 ${save.bestCrew}`
      : "Your first run awaits!";
  }

  function renderShop() {
    $("bank2").textContent = save.coins;
    const shop = $("shop");
    shop.innerHTML = "";
    for (const u of UPGRADES) {
      const lvl = upgLevel(u.key);
      const maxed = lvl >= u.max;
      const cost = u.cost(lvl);
      const row = document.createElement("div");
      row.className = "shop-row";
      row.innerHTML = `
        <span class="ico">${u.ico}</span>
        <span class="info">
          <b>${u.name}<span class="lvl">Lv ${lvl}/${u.max}</span></b>
          <small>${u.desc(lvl)}</small>
        </span>`;
      const btn = document.createElement("button");
      btn.className = "buy-btn" + (maxed ? " maxed" : "");
      if (maxed) { btn.textContent = "MAX"; btn.disabled = true; }
      else {
        btn.textContent = `🪙 ${cost}`;
        btn.disabled = save.coins < cost;
        btn.onclick = () => {
          if (save.coins < cost) return;
          save.coins -= cost;
          save.upg[u.key] = lvl + 1;
          persist();
          renderShop();
        };
      }
      row.appendChild(btn);
      shop.appendChild(row);
    }
  }

  // ---- Button wiring --------------------------------------------------
  $("play-btn").onclick   = startRun;
  $("again-btn").onclick  = startRun;
  $("shop-btn").onclick   = () => { renderShop(); hide(menu); show(shopScreen); };
  $("go-shop-btn").onclick = () => { renderShop(); hide(gameover); show(shopScreen); };
  $("shop-back").onclick  = () => {
    hide(shopScreen);
    refreshMenu(); show(menu);
  };

  // ---- Boot -----------------------------------------------------------
  resize();
  refreshMenu();
})();
