/* ===========================================================
   🏃 MATH MOB RUN
   -----------------------------------------------------------
   A "crowd runner" — the genre Cory loves from the ads — but
   the gates are MATH. Steer your mob left/right and pick the
   operation (+, −, ×, ÷) that grows your crew the most. It's
   sneaky mental-math practice: is "+8" better than "×2"? It
   depends on how many guys you have right now!

   Every so often a ⚔️ NUMBER WALL blocks the track — you punch
   through only if your mob is BIGGER than the wall's number, so
   you're always comparing your crew to a target. Keep picking
   the bigger gate to build a 🔥 streak for bonus coins.

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
    muted: false,
    mode: "medium",
    upg: { crew: 0, coin: 0, shield: 0, magnet: 0 },
    stats: { runs: 0, walls: 0, quizCorrect: 0, upgradesBought: 0, bestCombo: 0, hardBestDist: 0 },
    ach: [],
    skin: "classic",
    skinsOwned: ["classic"],
  });

  // ---- Crew skins (cosmetic, bought with coins) -----------------------
  const SKINS = [
    { id: "classic", name: "Classic Crew", ico: "🏃", body: "#3a6ff0", head: "#ffd9a8", cost: 0 },
    { id: "knights", name: "Knights",      ico: "🛡️", body: "#8a93a6", head: "#dde4ee", cost: 150 },
    { id: "kittens", name: "Kittens",      ico: "🐱", body: "#ff9e3d", head: "#ffe0b8", cost: 200 },
    { id: "royals",  name: "Royals",       ico: "👑", body: "#ff5d8f", head: "#ffe0ec", cost: 200 },
    { id: "robots",  name: "Robots",       ico: "🤖", body: "#2bb6a8", head: "#d6f5f0", cost: 250, blocky: true },
    { id: "blocky",  name: "Blocky Buddies",ico: "🟩", body: "#5bbf57", head: "#83d97e", cost: 300, blocky: true },
  ];
  const currentSkin = () => SKINS.find(s => s.id === save.skin) || SKINS[0];

  // ---- Difficulty modes -----------------------------------------------
  // Same game, three brains: gentle for the littles, spicy for the bigs.
  const MODES = {
    easy:   { label: "🌱 Easy",   sub: "add & double", speed: 120, smax: 175, barrier: 0.20, bossBase: 4, bossK: 0.04 },
    medium: { label: "⭐ Medium", sub: "add & times",  speed: 150, smax: 235, barrier: 0.30, bossBase: 6, bossK: 0.07 },
    hard:   { label: "🔥 Hard",   sub: "all 4 ops",    speed: 185, smax: 300, barrier: 0.36, bossBase: 9, bossK: 0.10 },
  };
  const mode = () => MODES[save.mode] || MODES.medium;

  // Respect "reduce motion" (skip screen shake, fewer particles), and add
  // a gentle phone buzz on big moments.
  const reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return defaultSave();
      const s = Object.assign(defaultSave(), JSON.parse(raw));
      s.upg = Object.assign(defaultSave().upg, s.upg || {});
      s.stats = Object.assign(defaultSave().stats, s.stats || {});
      if (!Array.isArray(s.ach)) s.ach = [];
      if (!Array.isArray(s.skinsOwned) || !s.skinsOwned.length) s.skinsOwned = ["classic"];
      if (!s.skin) s.skin = "classic";
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

  // ---- Achievements ---------------------------------------------------
  // Goals that outlast a single run. `s` is a snapshot of lifetime stats
  // plus the just-finished run's peaks.
  const ACHIEVEMENTS = [
    { id: "first",   ico: "🏁", name: "First Steps",     desc: "Finish your first run.",        ok: s => s.runs >= 1 },
    { id: "run100",  ico: "👟", name: "Getting Going",    desc: "Run 100 m in one go.",          ok: s => s.bestDist >= 100 },
    { id: "run500",  ico: "🏃", name: "Marathoner",       desc: "Run 500 m in one go.",          ok: s => s.bestDist >= 500 },
    { id: "mob100",  ico: "👥", name: "Big Crowd",        desc: "Grow a mob of 100.",            ok: s => s.bestCrew >= 100 },
    { id: "mob1000", ico: "🌊", name: "Huge Crowd",       desc: "Grow a mob of 1,000!",          ok: s => s.bestCrew >= 1000 },
    { id: "walls10", ico: "⚔️", name: "Wall Breaker",     desc: "Smash 10 number walls.",        ok: s => s.walls >= 10 },
    { id: "quiz25",  ico: "🧠", name: "Quiz Whiz",        desc: "Answer 25 quiz gates right.",   ok: s => s.quizCorrect >= 25 },
    { id: "combo6",  ico: "🔥", name: "On Fire",          desc: "Reach a 6× streak.",            ok: s => s.bestCombo >= 6 },
    { id: "spend5",  ico: "🛒", name: "Big Spender",      desc: "Buy 5 upgrades.",               ok: s => s.upgradesBought >= 5 },
    { id: "hard200", ico: "💪", name: "Hard Mode Hero",   desc: "Run 200 m on Hard.",            ok: s => s.hardBestDist >= 200 },
  ];

  function statsSnapshot() {
    return Object.assign({ bestDist: save.bestDist, bestCrew: save.bestCrew }, save.stats);
  }
  // Returns the achievement defs newly unlocked by the current stats.
  function checkAchievements() {
    const snap = statsSnapshot();
    const fresh = [];
    for (const a of ACHIEVEMENTS) {
      if (!save.ach.includes(a.id) && a.ok(snap)) {
        save.ach.push(a.id);
        fresh.push(a);
      }
    }
    return fresh;
  }

  // ---- DOM refs -------------------------------------------------------
  const $ = id => document.getElementById(id);
  const stage   = $("stage");
  const canvas  = $("game");
  const ctx     = canvas.getContext("2d");
  const hud      = $("hud");
  const crewEl   = $("crew");
  const runCoinsEl = $("run-coins");
  const distEl   = $("dist");
  const comboPill = $("combo-pill");
  const comboEl   = $("combo");
  const muteBtn   = $("mute-btn");

  const menu     = $("menu");
  const shopScreen = $("shop-screen");
  const badgesScreen = $("badges-screen");
  const skinsScreen = $("skins-screen");
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

  // ---- Tiny WebAudio sound kit (no files needed) ----------------------
  let actx = null, master = null;
  function initAudio() {
    if (actx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    actx = new AC();
    master = actx.createGain();
    master.gain.value = save.muted ? 0 : 0.5;
    master.connect(actx.destination);
  }
  function tone(freq, dur, type, vol, slideTo, when) {
    if (!actx) return;
    const t0 = actx.currentTime + (when || 0);
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.4, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }
  function noise(dur, vol, cut) {
    if (!actx) return;
    const len = Math.floor(actx.sampleRate * dur);
    const buf = actx.createBuffer(1, len, actx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = actx.createBufferSource(); s.buffer = buf;
    const f = actx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = cut || 1100;
    const g = actx.createGain(); g.gain.value = vol || 0.4;
    s.connect(f); f.connect(g); g.connect(master);
    s.start();
  }
  const sfx = {
    coin()  { tone(880, 0.07, "triangle", 0.25); tone(1320, 0.08, "triangle", 0.22, null, 0.05); },
    good(c) { const base = 480 + Math.min(c, 8) * 60; tone(base, 0.12, "square", 0.3, base * 1.5); },
    bad()   { tone(300, 0.22, "sawtooth", 0.3, 110); },
    barrier(){ noise(0.25, 0.5, 700); tone(150, 0.18, "square", 0.25, 80); },
    bossWin(){ [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, "square", 0.28, null, i * 0.07)); noise(0.4, 0.4, 1600); },
    lose()  { tone(440, 0.6, "sawtooth", 0.35, 70); noise(0.5, 0.35, 500); },
  };
  function applyMuteUI() { muteBtn.textContent = save.muted ? "🔇" : "🔊"; }
  function toggleMute() {
    save.muted = !save.muted; persist();
    if (master) master.gain.value = save.muted ? 0 : 0.5;
    applyMuteUI();
  }
  muteBtn.onclick = toggleMute;

  // ---- Game state -----------------------------------------------------
  const MAX_CREW = 99999;
  let state = "menu";          // menu | playing | over
  let crew = 1;
  let crewX = 0, targetX = 0;
  let dist = 0, runCoins = 0;
  let bestCrewThisRun = 1;
  let shieldsLeft = 0;
  let speed = 0;
  let rows = [], coins = [], floaters = [], particles = [];
  let spawnAccum = 0, coinAccum = 0;
  let keyDir = 0;
  let lastT = 0, now = 0;
  let combo = 0, bestComboThisRun = 0;
  let worldScroll = 0;         // for scrolling speed-chevrons
  let shake = 0;               // screen-shake magnitude
  let labelScale = 1;          // little pop on the crew counter when it changes
  let nextBossDist = 220;      // distance of the next number wall
  let bossPending = false;

  const playerY = () => H * 0.80;
  const bandH = 64;

  // ---- Helpers --------------------------------------------------------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand  = (a, b) => a + Math.random() * (b - a);
  const pick  = arr => arr[(Math.random() * arr.length) | 0];

  function makeOp(type, val) {
    const COL = { add: "#2e9bd6", mul: "#8a5cff", sub: "#ff7a3d", div: "#ff4d6d" };
    const SY  = { add: "+", mul: "×", sub: "−", div: "÷" };
    return {
      type, val, color: COL[type], label: SY[type] + val,
      apply(n) {
        if (type === "add") return n + val;
        if (type === "mul") return n * val;
        if (type === "sub") return Math.max(0, n - val);
        return Math.floor(n / val);
      },
    };
  }

  function makeGatePair() {
    let a, b;
    const r = Math.random();
    if (save.mode === "easy") {
      // Just adding and doubling — no take-aways. Gentle for little ones.
      if (r < 0.7) { a = makeOp("add", pick([2, 3, 4, 5])); b = makeOp("add", pick([6, 8, 10])); }
      else         { a = makeOp("mul", 2); b = makeOp("add", pick([3, 4, 5])); }
    } else if (save.mode === "hard") {
      // Big numbers and all four operations, including traps.
      if (r < 0.35)      { a = makeOp("mul", pick([2, 3, 4, 5])); b = makeOp("add", pick([15, 20, 25, 30, 40])); }
      else if (r < 0.6)  { a = makeOp("mul", pick([3, 4])); b = makeOp("div", pick([2, 3])); }
      else if (r < 0.8)  { a = makeOp("add", pick([20, 30, 40])); b = makeOp("sub", pick([5, 8, 12])); }
      else               { a = makeOp("mul", pick([2, 3])); b = makeOp("mul", pick([4, 5])); }
    } else {
      // Medium — ramps a little with distance.
      const tier = dist < 200 ? 1 : 2;
      if (tier === 1) {
        if (r < 0.5)      { a = makeOp("add", pick([3, 5])); b = makeOp("add", pick([8, 10])); }
        else if (r < 0.8) { a = makeOp("mul", 2); b = makeOp("add", pick([4, 5, 6])); }
        else              { a = makeOp("mul", pick([2, 3])); b = makeOp("add", pick([8, 10, 12])); }
      } else {
        if (r < 0.45)     { a = makeOp("mul", pick([2, 3])); b = makeOp("add", pick([10, 12, 15, 20])); }
        else if (r < 0.8) { a = makeOp("add", pick([10, 15, 20])); b = makeOp("sub", pick([3, 5, 8])); }
        else              { a = makeOp("mul", 2); b = makeOp("mul", 3); }
      }
    }
    return Math.random() < 0.5 ? [a, b] : [b, a];
  }

  // A direct "what's the answer?" gate — explicit arithmetic practice.
  const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  function makeWrong(c) {
    const cands = [c + 1, c - 1, c + 2, c - 2, c + rint(3, 6), c - rint(3, 6), c + 10];
    let w;
    do { w = pick(cands); } while (w < 0 || w === c);
    return w;
  }
  function makeQuiz() {
    let aN, bN, res, sym;
    const r = Math.random();
    if (save.mode === "easy") {
      if (r < 0.6) { aN = rint(1, 12); bN = rint(1, 8); res = aN + bN; sym = "+"; }
      else         { aN = rint(5, 15); bN = rint(1, aN); res = aN - bN; sym = "−"; }
    } else if (save.mode === "hard") {
      if (r < 0.55)     { aN = rint(2, 12); bN = rint(2, 12); res = aN * bN; sym = "×"; }
      else if (r < 0.8) { bN = rint(2, 9); res = rint(2, 9); aN = bN * res; sym = "÷"; } // aN÷bN
      else              { aN = rint(15, 40); bN = rint(8, 25); res = aN + bN; sym = "+"; }
    } else {
      if (r < 0.4)      { aN = rint(5, 25); bN = rint(4, 18); res = aN + bN; sym = "+"; }
      else if (r < 0.7) { aN = rint(2, 5); bN = rint(2, 5); res = aN * bN; sym = "×"; }
      else              { aN = rint(10, 30); bN = rint(1, aN - 1); res = aN - bN; sym = "−"; }
    }
    const wrong = makeWrong(res);
    const leftCorrect = Math.random() < 0.5;
    return {
      qText: `${aN} ${sym} ${bN}`, answer: res,
      left: leftCorrect ? res : wrong,
      right: leftCorrect ? wrong : res,
      correctSide: leftCorrect ? "L" : "R",
    };
  }

  function spawnRow() {
    // A number wall is due?
    const M = mode();
    if (bossPending) {
      bossPending = false;
      const need = Math.max(3, Math.round(M.bossBase + dist * M.bossK));
      rows.push({ kind: "boss", y: -bandH, need, done: false });
      nextBossDist = dist + rand(200, 280);
      return;
    }
    const barrierChance = dist < 80 ? 0 : M.barrier;
    if (Math.random() < barrierChance) {
      const side = Math.random() < 0.5 ? "L" : "R";
      rows.push({ kind: "barrier", y: -bandH, side, done: false });
    } else if (dist > 60 && Math.random() < 0.25) {
      rows.push(Object.assign({ kind: "quiz", y: -bandH, done: false }, makeQuiz()));
    } else {
      rows.push({ kind: "gate", y: -bandH, ops: makeGatePair(), done: false });
    }
  }

  function spawnCoin() {
    coins.push({ x: rand(W * 0.12, W * 0.88), y: -16, r: 11, got: false });
  }

  function addFloater(x, y, text, color, big) {
    floaters.push({ x, y, text, color, life: 1, big: !!big });
  }
  function burst(x, y, color, n, power) {
    if (reduceMotion) n = Math.ceil(n / 3);
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(0.2, 1) * (power || 220);
      particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
        life: rand(0.4, 0.9), color, size: rand(3, 6),
      });
    }
  }
  function addShake(m) { if (!reduceMotion) shake = Math.max(shake, m); }
  function popLabel(m) { labelScale = Math.max(labelScale, m || 1.35); }

  // ---- Start / end ----------------------------------------------------
  function startRun() {
    initAudio();
    if (actx && actx.state === "suspended") actx.resume();
    resize();
    crew = 1 + upgLevel("crew");
    crewX = targetX = W / 2;
    dist = 0; runCoins = 0; bestCrewThisRun = crew;
    shieldsLeft = upgLevel("shield");
    speed = mode().speed;
    rows = []; coins = []; floaters = []; particles = [];
    spawnAccum = 0; coinAccum = 0; worldScroll = 0; shake = 0; labelScale = 1;
    keyDir = 0; combo = 0; bestComboThisRun = 0;
    nextBossDist = 220; bossPending = false;
    state = "playing";
    hide(menu); hide(shopScreen); hide(gameover);
    hud.style.display = "flex";
    setCombo(0);
    syncHud();
    lastT = performance.now();
    requestAnimationFrame(loop);
  }

  function endRun() {
    state = "over";
    hud.style.display = "none";
    sfx.lose();

    const earned = Math.round(runCoins * (1 + upgLevel("coin") * 0.25));
    save.coins += earned;
    const distR = Math.round(dist);
    const newBestDist = distR > save.bestDist;
    const newBestCrew = bestCrewThisRun > save.bestCrew;
    if (newBestDist) save.bestDist = distR;
    if (newBestCrew) save.bestCrew = bestCrewThisRun;

    // Lifetime stats for badges.
    save.stats.runs++;
    save.stats.bestCombo = Math.max(save.stats.bestCombo, bestComboThisRun);
    if (save.mode === "hard") save.stats.hardBestDist = Math.max(save.stats.hardBestDist, distR);
    const freshBadges = checkAchievements();
    persist();

    $("go-dist").textContent = distR;
    $("go-crew").textContent = bestCrewThisRun;
    $("go-coins").textContent = earned;
    const badgeBox = $("go-badges");
    badgeBox.innerHTML = "";
    for (const a of freshBadges) {
      const d = document.createElement("div");
      d.className = "new-badge";
      d.textContent = `🏅 New badge: ${a.ico} ${a.name}!`;
      badgeBox.appendChild(d);
    }
    $("go-title").textContent = newBestDist ? "New record! 🏆" : "Run finished! 🏁";
    $("go-best").textContent =
      `Best: ${save.bestDist} m • biggest mob 🏃 ${save.bestCrew}` +
      (earned !== runCoins ? "  (coin boost on!)" : "");
    show(gameover);
  }

  // ---- Main loop ------------------------------------------------------
  function loop(t) {
    if (state !== "playing") return;
    let dt = (t - lastT) / 1000;
    lastT = t;
    if (dt > 0.05) dt = 0.05;
    now += dt;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  function update(dt) {
    const M = mode();
    // Gentle ramp: eases in over the first ~250 m instead of spiking early.
    speed = M.speed + Math.min(dist * 0.42, M.smax - M.speed);
    const dy = speed * dt;
    dist += dy / 20;
    worldScroll += dy;

    if (dist >= nextBossDist) bossPending = true;

    if (keyDir !== 0) targetX = clamp(targetX + keyDir * 620 * dt, 0, W);
    crewX += (targetX - crewX) * Math.min(1, dt * 12);
    crewX = clamp(crewX, mobRadius() + 6, W - mobRadius() - 6);

    spawnAccum += dy;
    const rowGap = clamp(H * 0.95 - dist * 0.25, H * 0.62, H * 1.1);
    if (spawnAccum >= rowGap) { spawnAccum = 0; spawnRow(); }

    coinAccum += dy;
    if (coinAccum >= H * 0.16) { coinAccum = 0; spawnCoin(); }

    const py = playerY();
    for (const row of rows) {
      row.y += dy;
      if (!row.done && row.y >= py) {
        row.done = true;
        if (row.kind === "gate") applyGate(row);
        else if (row.kind === "barrier") applyBarrier(row);
        else if (row.kind === "quiz") applyQuiz(row);
        else applyBoss(row);
      }
    }
    rows = rows.filter(r => r.y < H + bandH * 2);

    const pull = mobRadius() + 26 + upgLevel("magnet") * 26;
    for (const c of coins) {
      c.y += dy;
      if (!c.got) {
        if (upgLevel("magnet") > 0 && Math.abs(c.y - py) < 150) {
          c.x += clamp(crewX - c.x, -260 * dt, 260 * dt);
        }
        if (Math.hypot(c.x - crewX, c.y - py) < pull) {
          c.got = true; runCoins++; sfx.coin();
          addFloater(c.x, c.y, "🪙", "#c98a00");
          burst(c.x, c.y, "#ffd166", 7, 150);
        }
      }
    }
    coins = coins.filter(c => !c.got && c.y < H + 30);

    // Dust kicked up by the running mob.
    if (Math.random() < 0.6) {
      particles.push({
        x: crewX + rand(-mobRadius(), mobRadius()), y: py + mobRadius() * 0.5,
        vx: rand(-20, 20), vy: rand(20, 70), life: rand(0.3, 0.6),
        color: "rgba(255,255,255,0.6)", size: rand(2, 4),
      });
    }
    for (const p of particles) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 320 * dt; p.life -= dt;
    }
    particles = particles.filter(p => p.life > 0);

    for (const f of floaters) { f.y -= 40 * dt; f.life -= dt * 1.1; }
    floaters = floaters.filter(f => f.life > 0);

    shake *= Math.pow(0.0025, dt);   // smooth decay toward 0
    if (shake < 0.3) shake = 0;
    labelScale += (1 - labelScale) * Math.min(1, dt * 9);   // ease back to 1

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

    const delta = crew - before;
    popLabel(delta >= 0 ? 1.4 : 1.2);
    addFloater(crewX, playerY() - 30, (delta >= 0 ? "+" : "") + delta,
               delta >= 0 ? "#2bb673" : "#ff4d6d");
    burst(crewX, playerY() - 24, chosen.color, 10, 200);

    const mine = chosen.apply(before), theirs = other.apply(before);
    if (mine > theirs && before > 0) {
      combo++;
      const bonus = Math.min(combo, 6);
      runCoins += bonus;
      setCombo(combo);
      sfx.good(combo);
      addFloater(crewX + 34, playerY() - 56,
                 (combo >= 2 ? combo + "x " : "") + "Smart! +" + bonus + "🪙", "#8a5cff");
    } else if (mine < theirs) {
      if (combo >= 2) addFloater(crewX - 34, playerY() - 56, "streak lost", "#ff7a3d");
      combo = 0; setCombo(0);
      sfx.bad();
    }
  }

  function applyQuiz(row) {
    const side = crewX >= W / 2 ? "R" : "L";
    const before = crew;
    if (side === row.correctSide) {
      crew = clamp(Math.round(crew * 1.3) + 5, 0, MAX_CREW);
      popLabel(1.5);
      combo++;
      save.stats.quizCorrect++;
      const bonus = Math.min(combo, 6);
      runCoins += bonus;
      setCombo(combo);
      sfx.good(combo);
      addFloater(crewX, playerY() - 30, "Correct! +" + (crew - before), "#2bb673", true);
      addFloater(crewX + 30, playerY() - 58, "+" + bonus + "🪙", "#c98a00");
      burst(crewX, playerY() - 24, "#2bb673", 14, 240);
    } else {
      crew = Math.max(0, Math.round(crew * 0.7));
      popLabel(1.2);
      combo = 0; setCombo(0);
      sfx.bad();
      addFloater(crewX, playerY() - 30, "Oops!", "#ff4d6d", true);
      addFloater(W / 2, playerY() - 60, row.qText + " = " + row.answer, "#6a6385");
      burst(crewX, playerY() - 24, "#ff4d6d", 12, 220);
    }
  }

  function applyBarrier(row) {
    const onRight = crewX >= W / 2;
    const hit = (row.side === "R") === onRight;
    if (!hit) return;
    if (shieldsLeft > 0) {
      shieldsLeft--;
      addFloater(crewX, playerY() - 30, "🛡️ blocked!", "#38b6ff");
      burst(crewX, playerY() - 24, "#38b6ff", 12, 220);
      sfx.coin();
      return;
    }
    const before = crew;
    crew = Math.max(0, Math.ceil(crew * 0.6) - 1);
    popLabel(1.25);
    combo = 0; setCombo(0);
    addFloater(crewX, playerY() - 30, "-" + (before - crew), "#ff4d6d", true);
    burst(crewX, playerY() - 24, "#ff4d6d", 18, 300);
    addShake(10);
    buzz(40);
    sfx.barrier();
  }

  function applyBoss(row) {
    const before = crew;
    if (crew > row.need) {
      crew = crew - row.need;          // punch through, lose its strength
      save.stats.walls++;
      popLabel(1.5);
      buzz(60);
      runCoins += 12 + Math.round(row.need / 2);
      addFloater(W / 2, playerY() - 36, "SMASH! 🏆", "#2bb673", true);
      addFloater(W / 2, playerY() - 64, "+" + (12 + Math.round(row.need / 2)) + "🪙", "#c98a00");
      burst(W / 2, playerY() - 24, "#ffd166", 30, 360);
      burst(W / 2, playerY() - 24, "#2bb673", 20, 320);
      addShake(8);
      sfx.bossWin();
    } else {
      crew = 0;                        // wall was too strong → run ends
      addFloater(W / 2, playerY() - 36, "Need more than " + row.need + "!", "#ff4d6d", true);
      burst(W / 2, playerY() - 24, "#ff4d6d", 26, 320);
      addShake(14);
    }
  }

  // ---- Rendering ------------------------------------------------------
  function mobRadius() {
    return clamp(14 + Math.sqrt(Math.max(1, crew)) * 3.4, 16, W * 0.32);
  }

  const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

  function render() {
    ctx.save();
    if (shake > 0) ctx.translate(rand(-shake, shake), rand(-shake, shake));

    const py = playerY();

    drawBackground(py);
    drawChevrons();
    drawLaneDivider();
    drawCoins();

    for (const row of rows) {
      if (row.kind === "gate") drawGate(row);
      else if (row.kind === "barrier") drawBarrier(row);
      else if (row.kind === "quiz") drawQuiz(row);
      else drawBoss(row);
    }

    drawParticles();
    drawMob();
    drawFloaters();

    ctx.restore();
  }

  // Soft sky-to-track gradient, grassy verges and scrolling ground bands that
  // sell the sense of speed without any artwork files.
  function drawBackground(py) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#dff4ff");
    g.addColorStop(0.55, "#c7ecff");
    g.addColorStop(1, "#b6e4ff");
    ctx.fillStyle = g;
    ctx.fillRect(-20, -20, W + 40, H + 40);

    // Faint scrolling road tiles for motion.
    const band = 130;
    const off = worldScroll % (band * 2);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    for (let y = off - band * 2; y < H + band; y += band * 2) {
      ctx.fillRect(-20, y, W + 40, band);
    }

    // Grassy verges with scrolling tufts down each edge.
    const vw = Math.max(10, W * 0.05);
    const gg = ctx.createLinearGradient(0, 0, vw, 0);
    gg.addColorStop(0, "#7ccb8f");
    gg.addColorStop(1, "#a3e1b3");
    ctx.fillStyle = gg;
    ctx.fillRect(-20, -20, vw + 20, H + 40);
    ctx.save();
    ctx.translate(W, 0); ctx.scale(-1, 1);
    ctx.fillStyle = gg;
    ctx.fillRect(-20, -20, vw + 20, H + 40);
    ctx.restore();

    const tuft = 50;
    const to = worldScroll % tuft;
    ctx.fillStyle = "rgba(34,120,60,0.22)";
    for (let y = to - tuft; y < H; y += tuft) {
      ctx.fillRect(-20, y, vw + 20, 9);
      ctx.fillRect(W - vw, y, vw + 20, 9);
    }

    // A warm finish-strip of ground where the mob runs, so they read as
    // standing on something solid.
    const R = mobRadius();
    const fg = ctx.createLinearGradient(0, py - R, 0, H);
    fg.addColorStop(0, "rgba(255,255,255,0)");
    fg.addColorStop(1, "rgba(120,200,255,0.22)");
    ctx.fillStyle = fg;
    ctx.fillRect(-20, py - R, W + 40, H - (py - R) + 20);
  }

  function drawChevrons() {
    const spacing = 84;
    const off = worldScroll % spacing;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    for (const cx of [W * 0.25, W * 0.75]) {
      for (let y = off - spacing; y < H; y += spacing) {
        const a = clamp(0.10 + 0.22 * (1 - Math.abs(y / H - 0.45) * 1.6), 0.05, 0.32);
        ctx.strokeStyle = `rgba(255,255,255,${a})`;
        ctx.beginPath();
        ctx.moveTo(cx - 18, y); ctx.lineTo(cx, y + 16); ctx.lineTo(cx + 18, y);
        ctx.stroke();
      }
    }
    ctx.lineCap = "butt";
  }

  function drawLaneDivider() {
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 4;
    ctx.setLineDash([18, 16]);
    ctx.lineDashOffset = -(worldScroll % 34);
    ctx.beginPath();
    ctx.moveTo(W / 2, -20); ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
  }

  // Spinning, shiny coins.
  function drawCoins() {
    for (const c of coins) {
      if (c.got) continue;
      const spin = Math.abs(Math.cos(now * 4 + c.x * 0.05));
      const wsc = 0.22 + spin * 0.78;     // squash for the spin
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(wsc, 1);
      const rg = ctx.createRadialGradient(-c.r * 0.35, -c.r * 0.35, 1, 0, 0, c.r);
      rg.addColorStop(0, "#fff1bf");
      rg.addColorStop(0.6, "#ffd166");
      rg.addColorStop(1, "#eaa92c");
      ctx.beginPath();
      ctx.arc(0, 0, c.r, 0, Math.PI * 2);
      ctx.fillStyle = rg; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = "#d49a1f"; ctx.stroke();
      ctx.fillStyle = "#b7860b";
      ctx.font = "bold 12px " + FONT;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("$", 0, 1);
      ctx.restore();
      // Glint stays unscaled so it always catches the eye.
      ctx.globalAlpha = 0.7 * spin;
      ctx.beginPath();
      ctx.arc(c.x - c.r * 0.3 * wsc, c.y - c.r * 0.35, c.r * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = "#fff"; ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life * 1.6, 0, 1);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color; ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFloaters() {
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const f of floaters) {
      const appear = clamp((1 - f.life) / 0.12, 0, 1);   // quick pop-in
      const sc = 0.55 + appear * 0.45;
      ctx.globalAlpha = clamp(f.life * 1.3, 0, 1);
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.scale(sc, sc);
      ctx.font = "bold " + (f.big ? 28 : 21) + "px " + FONT;
      ctx.lineWidth = 4; ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.strokeText(f.text, 0, 0);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function drawGate(row) {
    const y = row.y, h = bandH;
    const onRight = crewX >= W / 2;
    const halves = [
      { x: 0, w: W / 2, op: row.ops[0], side: "L" },
      { x: W / 2, w: W / 2, op: row.ops[1], side: "R" },
    ];
    for (const half of halves) {
      const col = half.op.color;
      const active = (half.side === "R") === onRight;
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, hexA(col, 0.92));
      g.addColorStop(1, hexA(col, 0.62));
      ctx.fillStyle = g;
      ctx.fillRect(half.x, y, half.w, h);
      // bright neon lip on top
      ctx.fillStyle = hexA(col, 1);
      ctx.fillRect(half.x, y, half.w, 5);
      // breathing highlight on the lane you're aimed at
      if (active) {
        ctx.globalAlpha = 0.16 + 0.10 * Math.sin(now * 6);
        ctx.fillStyle = "#fff";
        ctx.fillRect(half.x, y, half.w, h);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = "#fff";
      ctx.font = "bold 32px " + FONT;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.28)"; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
      ctx.fillText(half.op.label, half.x + half.w / 2, y + h / 2 + 2);
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    }
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillRect(W / 2 - 3, y - 4, 6, h + 8);
  }

  function drawBarrier(row) {
    const y = row.y, h = bandH;
    const x = row.side === "L" ? 0 : W / 2;
    const w = W / 2;
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, hexA("#ff6b85", 0.95));
    g.addColorStop(1, hexA("#e23355", 0.95));
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    // hazard stripes
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (let i = -h; i < w; i += 26) {
      ctx.beginPath();
      ctx.moveTo(x + i, y); ctx.lineTo(x + i + 12, y);
      ctx.lineTo(x + i + 12 + h, y + h); ctx.lineTo(x + i + h, y + h);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // pulsing danger glow on the rim
    ctx.globalAlpha = 0.35 + 0.25 * Math.sin(now * 8);
    ctx.fillStyle = "#fff";
    ctx.fillRect(x, y, w, 4);
    ctx.fillRect(x, y + h - 4, w, 4);
    ctx.globalAlpha = 1;
    ctx.font = "bold 28px " + FONT;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = 4;
    ctx.fillText("⛔", x + w / 2, y + h / 2 + 1);
    ctx.shadowBlur = 0;
  }

  function drawQuiz(row) {
    const y = row.y, h = bandH;
    // Both halves the same teal — colour must not give away the answer.
    const col = "#0fa3a3";
    const onRight = crewX >= W / 2;
    [[0, row.left, "L"], [W / 2, row.right, "R"]].forEach(([x, val, side]) => {
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, hexA(col, 0.92));
      g.addColorStop(1, hexA(col, 0.66));
      ctx.fillStyle = g;
      ctx.fillRect(x, y, W / 2, h);
      ctx.fillStyle = hexA(col, 1);
      ctx.fillRect(x, y, W / 2, 5);
      if ((side === "R") === onRight) {
        ctx.globalAlpha = 0.14 + 0.10 * Math.sin(now * 6);
        ctx.fillStyle = "#fff";
        ctx.fillRect(x, y, W / 2, h);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = "#fff";
      ctx.font = "bold 32px " + FONT;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.28)"; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
      ctx.fillText(val, x + W / 4, y + h / 2 + 2);
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    });
    ctx.fillStyle = "#fff";
    ctx.fillRect(W / 2 - 3, y - 4, 6, h + 8);

    // Question banner floating just above the answer band.
    const text = row.qText + " = ?";
    ctx.font = "bold 22px " + FONT;
    const tw = ctx.measureText(text).width + 28;
    const bx = W / 2 - tw / 2, by = y - 38;
    ctx.fillStyle = "#fff";
    ctx.roundRect(bx, by, tw, 32, 16); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = col; ctx.stroke();
    ctx.fillStyle = "#1c6e6e";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, W / 2, by + 17);
  }

  function drawBoss(row) {
    const y = row.y, h = bandH + 10;
    // Dark stone wall across the whole track
    const grad = ctx.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, "#5b4b8a");
    grad.addColorStop(1, "#2b2440");
    ctx.fillStyle = grad;
    ctx.fillRect(0, y, W, h);
    // brick lines
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    for (let bx = 0; bx < W; bx += 46) {
      ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(bx, y + h); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(0, y + h / 2); ctx.lineTo(W, y + h / 2); ctx.stroke();
    // Required number — beat it to smash through. Glows green once you can.
    const big = crew > row.need;
    ctx.save();
    ctx.font = "bold 34px " + FONT;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (big) {
      ctx.shadowColor = "rgba(120,255,170,0.9)";
      ctx.shadowBlur = 14 + 6 * Math.sin(now * 7);
      ctx.fillStyle = "#aaffc4";
    } else {
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 5;
      ctx.fillStyle = "#ff9db0";
    }
    ctx.fillText("⚔️ " + row.need, W / 2, y + h / 2 + 1);
    ctx.restore();
  }

  function drawMob() {
    const py = playerY();
    const R = mobRadius();
    const show = Math.min(crew, 28);

    // One soft shadow for the whole crowd.
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#1d2740";
    ctx.beginPath();
    ctx.ellipse(crewX, py + R * 0.5 + 8, R + 8, R * 0.42 + 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Build the crowd, then draw back-to-front so nearer runners overlap.
    const guys = [];
    for (let i = 0; i < show; i++) {
      const ang = i * 2.399963;
      const rad = (i === 0) ? 0 : R * Math.sqrt(i / show);
      guys.push({
        x: crewX + Math.cos(ang) * rad,
        y: py + Math.sin(ang) * rad * 0.55,
        i,
      });
    }
    guys.sort((a, b) => a.y - b.y);
    for (const g of guys) drawRunner(g.x, g.y, g.i);

    // Crew counter, popping when it changes.
    ctx.save();
    ctx.translate(crewX, py - R - 16);
    ctx.scale(labelScale, labelScale);
    ctx.fillStyle = "#2b2440";
    ctx.font = "bold 26px " + FONT;
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.lineWidth = 5; ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(255,255,255,0.95)";
    const label = currentSkin().ico + " " + crew;
    ctx.strokeText(label, 0, 0);
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }

  function drawRunner(x, y, i) {
    // A little runner with a full running cycle — bouncing body plus swinging
    // arms and legs — drawn in the chosen skin.
    const sk = currentSkin();
    const phase = now * 11 + i * 1.7;
    const bob = Math.abs(Math.sin(phase)) * 2.3;   // springy up-down
    const swing = Math.sin(phase) * 3.4;           // limb swing
    y -= bob;

    if (sk.blocky) {
      // Blocky buddies: square limbs that piston up and down.
      ctx.fillStyle = sk.body;
      ctx.fillRect(x - 4 + swing * 0.4, y + 3, 3, 6 - Math.abs(swing) * 0.4);
      ctx.fillRect(x + 1 - swing * 0.4, y + 3, 3, 6 - Math.abs(swing) * 0.4);
      ctx.fillRect(x - 4, y - 4, 8, 9);            // body
      ctx.fillStyle = sk.head;
      ctx.fillRect(x - 4.5, y - 12, 9, 8);         // head
      return;
    }

    // Legs.
    ctx.strokeStyle = sk.body;
    ctx.lineWidth = 2.6; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y + 3); ctx.lineTo(x - 2.4 + swing * 0.6, y + 9);
    ctx.moveTo(x, y + 3); ctx.lineTo(x + 2.4 - swing * 0.6, y + 9);
    ctx.stroke();
    // Arms.
    ctx.beginPath();
    ctx.moveTo(x, y - 1); ctx.lineTo(x - 3.2 - swing * 0.5, y + 3);
    ctx.moveTo(x, y - 1); ctx.lineTo(x + 3.2 + swing * 0.5, y + 3);
    ctx.stroke();
    // Body.
    ctx.fillStyle = sk.body;
    ctx.beginPath();
    ctx.roundRect(x - 3.6, y - 4, 7.2, 9, 3);
    ctx.fill();
    // Head.
    ctx.beginPath();
    ctx.arc(x, y - 8, 4.3, 0, Math.PI * 2);
    ctx.fillStyle = sk.head;
    ctx.fill();
    ctx.lineCap = "butt";
  }

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
  function setCombo(n) {
    comboEl.textContent = n;
    comboPill.classList.toggle("on", n >= 2);
    if (n > bestComboThisRun) bestComboThisRun = n;
  }

  // ---- Input ----------------------------------------------------------
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

  // Pause cleanly when the tab/app loses focus.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    if (state === "playing") { lastT = performance.now(); }
  });

  // ---- Overlays / shop UI ---------------------------------------------
  function show(el) { el.classList.remove("hidden"); }
  function hide(el) { el.classList.add("hidden"); }

  function refreshMenu() {
    $("bank").textContent = save.coins;
    $("best-line").textContent = save.bestDist
      ? `Best run: ${save.bestDist} m • biggest mob 🏃 ${save.bestCrew}`
      : "Your first run awaits!";
    renderModes();
  }

  function renderModes() {
    const wrap = $("modes");
    wrap.innerHTML = "";
    for (const key of ["easy", "medium", "hard"]) {
      const m = MODES[key];
      const btn = document.createElement("button");
      btn.className = "mode-btn" + (save.mode === key ? " sel" : "");
      btn.innerHTML = `<b>${m.label}</b><small>${m.sub}</small>`;
      btn.onclick = () => { save.mode = key; persist(); renderModes(); };
      wrap.appendChild(btn);
    }
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
          save.stats.upgradesBought++;
          checkAchievements();
          persist();
          initAudio(); sfx.coin();
          renderShop();
        };
      }
      row.appendChild(btn);
      shop.appendChild(row);
    }
  }

  function renderSkins() {
    $("bank3").textContent = save.coins;
    const wrap = $("skins");
    wrap.innerHTML = "";
    for (const sk of SKINS) {
      const owned = save.skinsOwned.includes(sk.id);
      const selected = save.skin === sk.id;
      const row = document.createElement("div");
      row.className = "shop-row";
      row.innerHTML = `
        <span class="ico">${sk.ico}</span>
        <span class="info"><b>${sk.name}</b><small>${owned ? (selected ? "Wearing now" : "Tap to wear") : "Cosmetic crew"}</small></span>`;
      const btn = document.createElement("button");
      btn.className = "buy-btn" + (selected ? " maxed" : "");
      if (selected) { btn.textContent = "Wearing ✓"; btn.disabled = true; }
      else if (owned) {
        btn.textContent = "Wear";
        btn.onclick = () => { save.skin = sk.id; persist(); renderSkins(); };
      } else {
        btn.textContent = `🪙 ${sk.cost}`;
        btn.disabled = save.coins < sk.cost;
        btn.onclick = () => {
          if (save.coins < sk.cost) return;
          save.coins -= sk.cost;
          save.skinsOwned.push(sk.id);
          save.skin = sk.id;
          persist();
          initAudio(); sfx.coin();
          renderSkins();
        };
      }
      row.appendChild(btn);
      wrap.appendChild(row);
    }
  }

  function renderBadges() {
    const wrap = $("badges");
    wrap.innerHTML = "";
    for (const a of ACHIEVEMENTS) {
      const got = save.ach.includes(a.id);
      const row = document.createElement("div");
      row.className = "badge-row" + (got ? "" : " locked");
      row.innerHTML = `
        <span class="ico">${a.ico}</span>
        <span class="info"><b>${a.name}</b><small>${a.desc}</small></span>
        <span class="tick">${got ? "✓" : "🔒"}</span>`;
      wrap.appendChild(row);
    }
  }

  // ---- Button wiring --------------------------------------------------
  $("play-btn").onclick    = startRun;
  $("again-btn").onclick   = startRun;
  $("shop-btn").onclick    = () => { renderShop(); hide(menu); show(shopScreen); };
  $("go-shop-btn").onclick = () => { renderShop(); hide(gameover); show(shopScreen); };
  $("shop-back").onclick   = () => { hide(shopScreen); refreshMenu(); show(menu); };
  $("badges-btn").onclick  = () => { renderBadges(); hide(menu); show(badgesScreen); };
  $("badges-back").onclick = () => { hide(badgesScreen); refreshMenu(); show(menu); };
  $("skins-btn").onclick   = () => { renderSkins(); hide(menu); show(skinsScreen); };
  $("skins-back").onclick  = () => { hide(skinsScreen); refreshMenu(); show(menu); };

  // ---- Boot -----------------------------------------------------------
  resize();
  applyMuteUI();
  refreshMenu();
})();
