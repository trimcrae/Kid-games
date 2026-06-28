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
    bestLevel: 1,
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
  // Speed is a single constant per mode now — it never ramps up. The challenge
  // comes from the math and the brick-wall finale at the end of each level, not
  // from the track getting faster.
  //   levelBase/levelStep — metres to the finish line (grows each level)
  //   wallBase/wallStep   — how strong the finale's brick walls are (and how
  //                         much each one grows per level)
  const MODES = {
    easy:   { label: "🌱 Easy",   sub: "add & double", speed: 135, barrier: 0.18,
              levelBase: 300, levelStep: 70,  wallBase: 7,  wallStep: 4 },
    medium: { label: "⭐ Medium", sub: "add & times",  speed: 155, barrier: 0.28,
              levelBase: 360, levelStep: 90,  wallBase: 11, wallStep: 7 },
    hard:   { label: "🔥 Hard",   sub: "all 4 ops",    speed: 180, barrier: 0.34,
              levelBase: 420, levelStep: 110, wallBase: 16, wallStep: 10 },
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
    { id: "walls10", ico: "🧱", name: "Wall Breaker",     desc: "Smash 10 brick walls.",         ok: s => s.walls >= 10 },
    { id: "level5",  ico: "🏰", name: "Level Five",        desc: "Reach Level 5.",                ok: s => s.bestLevel >= 5 },
    { id: "quiz25",  ico: "🧠", name: "Quiz Whiz",        desc: "Answer 25 quiz gates right.",   ok: s => s.quizCorrect >= 25 },
    { id: "combo6",  ico: "🔥", name: "On Fire",          desc: "Reach a 6× streak.",            ok: s => s.bestCombo >= 6 },
    { id: "spend5",  ico: "🛒", name: "Big Spender",      desc: "Buy 5 upgrades.",               ok: s => s.upgradesBought >= 5 },
    { id: "hard200", ico: "💪", name: "Hard Mode Hero",   desc: "Run 200 m on Hard.",            ok: s => s.hardBestDist >= 200 },
  ];

  function statsSnapshot() {
    return Object.assign(
      { bestDist: save.bestDist, bestCrew: save.bestCrew, bestLevel: save.bestLevel || 1 },
      save.stats);
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
  const levelEl  = $("level");
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
    buildScenery();
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
  let rows = [], coins = [], floaters = [], particles = [], bricks = [];
  let spawnAccum = 0, coinAccum = 0;
  let keyDir = 0;
  let lastT = 0, now = 0;
  let combo = 0, bestComboThisRun = 0;
  let worldScroll = 0;         // for scrolling speed-chevrons
  let shake = 0;               // screen-shake magnitude
  let flash = 0;               // white impact-flash magnitude (0..1)
  let labelScale = 1;          // little pop on the crew counter when it changes
  let mobSquash = 1;           // squash/stretch on the whole mob when crew jumps

  // Levels & the brick-wall finale.
  let level = 1;
  let levelTarget = 400;       // metres to the finish line for this level
  let phase = "run";           // run | finale | clear
  let phaseT = 0;              // timer for timed phase transitions (seconds)
  let wallsSmashedThisRun = 0;
  let finaleTotal = 0, finaleSmashed = 0, finaleSpawned = 0;
  let finaleGap = 0;           // spawn spacing accumulator for finale walls
  let banner = null;           // { text, sub, life, color } big centre banner

  // Parallax scenery (built once at boot, scrolls at fractions of run speed).
  let hills = [], clouds = [];

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

  // During the run we only ever spawn the mob-growers: math gates, quiz gates,
  // and the occasional barrier to dodge. The brick walls live in the finale.
  function spawnRow() {
    const M = mode();
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

  // How strong the i-th brick wall of this level's gauntlet is. Walls escalate
  // within the gauntlet and get tougher every level, so you must keep building a
  // bigger mob to keep advancing.
  function wallNeed(i) {
    const M = mode();
    const base = M.wallBase + (level - 1) * M.wallStep;
    return Math.max(3, Math.round(base * (1 + i * 0.55)));
  }
  function levelTargetFor(lv) {
    const M = mode();
    return M.levelBase + (lv - 1) * M.levelStep;
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
    rows = []; coins = []; floaters = []; particles = []; bricks = [];
    spawnAccum = 0; coinAccum = 0; worldScroll = 0; shake = 0; flash = 0;
    labelScale = 1; mobSquash = 1;
    keyDir = 0; combo = 0; bestComboThisRun = 0;
    level = 1; levelTarget = levelTargetFor(1); phase = "run"; phaseT = 0;
    wallsSmashedThisRun = 0; finaleTotal = 0; finaleSmashed = 0;
    finaleSpawned = 0; finaleGap = 0;
    banner = { text: "Level 1", sub: "", life: 1.6, color: "#8a5cff" };
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
    const newBestLevel = level > (save.bestLevel || 1);
    if (newBestDist) save.bestDist = distR;
    if (newBestCrew) save.bestCrew = bestCrewThisRun;
    if (newBestLevel) save.bestLevel = level;

    // Lifetime stats for badges.
    save.stats.runs++;
    save.stats.bestCombo = Math.max(save.stats.bestCombo, bestComboThisRun);
    if (save.mode === "hard") save.stats.hardBestDist = Math.max(save.stats.hardBestDist, distR);
    const freshBadges = checkAchievements();
    persist();

    $("go-level").textContent = level;
    $("go-walls").textContent = wallsSmashedThisRun;
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
    $("go-title").textContent = newBestLevel ? "New record! 🏆" : "Run finished! 🏁";
    $("go-best").textContent =
      `Best: Level ${save.bestLevel} • biggest mob 🏃 ${save.bestCrew}` +
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
    speed = M.speed;                 // constant — the track never speeds up
    const dy = speed * dt;
    worldScroll += dy;

    // Eye-candy timers that tick in every phase.
    if (banner) { banner.life -= dt; if (banner.life <= 0) banner = null; }
    flash *= Math.pow(0.015, dt); if (flash < 0.01) flash = 0;
    mobSquash += (1 - mobSquash) * Math.min(1, dt * 10);

    // Steering (harmless in the finale, where walls span the whole track).
    if (keyDir !== 0) targetX = clamp(targetX + keyDir * 620 * dt, 0, W);
    crewX += (targetX - crewX) * Math.min(1, dt * 12);
    crewX = clamp(crewX, mobRadius() + 6, W - mobRadius() - 6);

    // ---- phase machine ----
    if (phase === "run") {
      dist += dy / 20;
      if (dist >= levelTarget) {
        enterFinale();
      } else {
        spawnAccum += dy;
        if (spawnAccum >= H * 0.9) { spawnAccum = 0; spawnRow(); }
        coinAccum += dy;
        if (coinAccum >= H * 0.16) { coinAccum = 0; spawnCoin(); }
      }
    } else if (phase === "finale") {
      finaleGap += dy;
      if (finaleSpawned < finaleTotal && finaleGap >= bandH * 3.4) {
        finaleGap = 0;
        rows.push({ kind: "wall", y: -bandH - 12, need: wallNeed(finaleSpawned),
                    idx: finaleSpawned, done: false });
        finaleSpawned++;
      }
      // Gauntlet beaten once every wall has spawned and smashed away.
      if (finaleSpawned >= finaleTotal && !rows.some(r => r.kind === "wall")) {
        enterClear();
      }
    } else if (phase === "clear") {
      phaseT -= dt;
      if (phaseT <= 0) startNextLevel();
    }

    // ---- move rows & resolve contacts ----
    const py = playerY();
    for (const row of rows) {
      row.y += dy;
      if (!row.done && row.y >= py) {
        row.done = true;
        if (row.kind === "gate") applyGate(row);
        else if (row.kind === "barrier") applyBarrier(row);
        else if (row.kind === "quiz") applyQuiz(row);
        else if (row.kind === "wall") applyWall(row);
        // "finish" rows are cosmetic — they just scroll by.
      }
    }
    rows = rows.filter(r => !r.dead && r.y < H + bandH * 3);

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

    // Brick debris from smashed walls — tumbling chunks with gravity & bounce.
    const ground = py + mobRadius() * 0.5 + 6;
    for (const b of bricks) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 900 * dt;
      b.rot += b.vr * dt; b.life -= dt;
      if (b.y > ground && b.vy > 0) { b.y = ground; b.vy *= -0.42; b.vx *= 0.6; b.vr *= 0.6; }
    }
    bricks = bricks.filter(b => b.life > 0);

    for (const f of floaters) { f.y -= 40 * dt; f.life -= dt * 1.1; }
    floaters = floaters.filter(f => f.life > 0);

    shake *= Math.pow(0.0025, dt);   // smooth decay toward 0
    if (shake < 0.3) shake = 0;
    labelScale += (1 - labelScale) * Math.min(1, dt * 9);   // ease back to 1

    bestCrewThisRun = Math.max(bestCrewThisRun, crew);
    syncHud();

    if (crew <= 0 && state === "playing") { crew = 0; syncHud(); endRun(); }
  }

  // ---- Level / finale flow --------------------------------------------
  function enterFinale() {
    phase = "finale";
    finaleTotal = Math.min(8, 3 + level);
    finaleSmashed = 0; finaleSpawned = 0; finaleGap = 0;
    rows = [];   // clear leftover gates/quizzes/barriers — the finish line wipes the track
    rows.push({ kind: "finish", y: -bandH - 4, done: true });
    banner = { text: "FINAL WALLS! 🧱", sub: "smash through!", life: 1.6, color: "#ff7a3d" };
    addShake(4);
  }

  function applyWall(row) {
    const py = playerY();
    const before = crew;
    if (crew > row.need) {
      crew = clamp(crew - row.need, 0, MAX_CREW);
      finaleSmashed++; wallsSmashedThisRun++; save.stats.walls++;
      const reward = Math.min(40, 6 + row.need);   // capped — no runaway score
      runCoins += reward;
      smashWall(row, true);
      addFloater(W / 2, py - 38, "SMASH! 🧱", "#2bb673", true);
      addFloater(W / 2, py - 70, "+" + reward + "🪙", "#c98a00");
      popLabel(1.5); mobSquash = 1.45; addShake(9);
      flash = Math.max(flash, 0.45); buzz(50); sfx.bossWin();
    } else {
      crew = 0;
      smashWall(row, false);
      addFloater(W / 2, py - 38, "Wall held! Needed " + (row.need + 1), "#ff4d6d", true);
      addShake(16); flash = Math.max(flash, 0.7); buzz(120);
    }
    row.dead = true;     // the intact wall vanishes into flying bricks
  }

  // Burst a wall into tumbling brick chunks + a dust cloud.
  function smashWall(row, success) {
    const y = playerY() - 6;
    const n = reduceMotion ? 14 : 42;
    const palette = success
      ? ["#b5572f", "#9c4a28", "#c46a3d", "#8a4022", "#a85433"]
      : ["#6f6385", "#574d6b", "#7c7090"];
    for (let i = 0; i < n; i++) {
      bricks.push({
        x: rand(W * 0.04, W * 0.96), y: y + rand(-bandH * 0.6, 12),
        vx: rand(-300, 300), vy: rand(-420, -90),
        rot: rand(0, Math.PI * 2), vr: rand(-14, 14),
        life: rand(0.7, 1.4), w: rand(9, 18), h: rand(7, 12),
        color: pick(palette),
      });
    }
    burst(W / 2, y, "rgba(150,120,95,0.55)", reduceMotion ? 8 : 24, 280);
  }

  function enterClear() {
    phase = "clear"; phaseT = 1.8;
    banner = { text: "Level " + level + " cleared! 🎉",
               sub: "crew lives on: 🏃 " + crew, life: 1.8, color: "#2bb673" };
    flash = Math.max(flash, 0.35); addShake(6);
    burst(W / 2, playerY() - 30, "#ffd166", reduceMotion ? 10 : 26, 320);
    sfx.bossWin();
  }

  function startNextLevel() {
    level++;
    if (level > (save.bestLevel || 1)) { save.bestLevel = level; persist(); }
    levelTarget = levelTargetFor(level);
    dist = 0; phase = "run"; phaseT = 0;
    spawnAccum = 0; coinAccum = 0;
    rows = []; coins = [];
    finaleTotal = 0; finaleSmashed = 0; finaleSpawned = 0; finaleGap = 0;
    banner = { text: "Level " + level, sub: "tougher walls ahead", life: 1.5, color: "#8a5cff" };
  }

  function applyGate(row) {
    const onRight = crewX >= W / 2;
    const chosen = onRight ? row.ops[1] : row.ops[0];
    const other  = onRight ? row.ops[0] : row.ops[1];
    const before = crew;
    crew = clamp(chosen.apply(crew) || 0, 0, MAX_CREW);   // || 0 guards NaN

    const delta = crew - before;
    popLabel(delta >= 0 ? 1.4 : 1.2);
    mobSquash = delta >= 0 ? 1.35 : 0.78;
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
      popLabel(1.5); mobSquash = 1.4;
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
      popLabel(1.2); mobSquash = 0.78;
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
    popLabel(1.25); mobSquash = 0.7;
    combo = 0; setCombo(0);
    addFloater(crewX, playerY() - 30, "-" + (before - crew), "#ff4d6d", true);
    burst(crewX, playerY() - 24, "#ff4d6d", 18, 300);
    addShake(10);
    buzz(40);
    sfx.barrier();
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
      else if (row.kind === "wall") drawWall(row);
      else if (row.kind === "finish") drawFinish(row);
    }

    drawParticles();
    drawMob();
    drawBricks();
    drawFloaters();

    ctx.restore();   // brick debris + flash + vignette + banner sit above shake

    drawVignette();
    if (flash > 0) {
      ctx.fillStyle = "rgba(255,255,255," + clamp(flash, 0, 0.85) + ")";
      ctx.fillRect(0, 0, W, H);
    }
    drawBanner();
  }

  // Roadside scenery + cloud shadows, scattered once so they loop seamlessly.
  // `sceneSpan` is how tall the looping band is; objects wrap within it.
  let sceneSpan = 0, trees = [], cloudShadows = [];
  function buildScenery() {
    sceneSpan = Math.max(600, H * 2);
    trees = [];
    const vw = Math.max(12, W * 0.07);
    const treeKinds = ["#5bbf6a", "#4aa85b", "#6fd07e", "#3f9e52"];
    for (let s = 0; s < 2; s++) {                 // left & right verge
      const n = Math.max(6, Math.round(sceneSpan / 120));
      for (let i = 0; i < n; i++) {
        trees.push({
          side: s,
          x: (s === 0 ? rand(2, vw - 6) : W - rand(2, vw - 6)),
          y: rand(0, sceneSpan),
          r: rand(9, 17),
          c: pick(treeKinds),
          flower: Math.random() < 0.4,
        });
      }
    }
    cloudShadows = [];
    for (let i = 0; i < 4; i++) {
      cloudShadows.push({ x: rand(0, W), y: rand(0, sceneSpan), r: rand(70, 140) });
    }
  }

  // Bright field, cool running track down the middle, grassy verges with trees,
  // scrolling tiles for speed and a soft drifting cloud shadow for life.
  function drawBackground(py) {
    // Grass field underneath everything.
    const grass = ctx.createLinearGradient(0, 0, 0, H);
    grass.addColorStop(0, "#8ed79b");
    grass.addColorStop(1, "#71c684");
    ctx.fillStyle = grass;
    ctx.fillRect(-20, -20, W + 40, H + 40);

    // The running track.
    const vw = Math.max(12, W * 0.07);
    const road = ctx.createLinearGradient(0, 0, 0, H);
    road.addColorStop(0, "#cdecfb");
    road.addColorStop(0.5, "#bbe4fa");
    road.addColorStop(1, "#a9dcf7");
    ctx.fillStyle = road;
    ctx.fillRect(vw, -20, W - vw * 2, H + 40);
    // Soft inner shadow where the track meets the grass (adds depth).
    const edge = ctx.createLinearGradient(vw, 0, vw + 16, 0);
    edge.addColorStop(0, "rgba(40,90,120,0.18)");
    edge.addColorStop(1, "rgba(40,90,120,0)");
    ctx.fillStyle = edge; ctx.fillRect(vw, -20, 16, H + 40);
    ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1);
    ctx.fillStyle = edge; ctx.fillRect(vw, -20, 16, H + 40);
    ctx.restore();

    // Faint scrolling road tiles for motion.
    const band = 130;
    const off = worldScroll % (band * 2);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    for (let y = off - band * 2; y < H + band; y += band * 2) {
      ctx.fillRect(vw, y, W - vw * 2, band);
    }

    // Drifting cloud shadows over the whole field (very soft).
    if (sceneSpan) {
      for (const cl of cloudShadows) {
        const yy = ((cl.y + worldScroll * 0.35) % sceneSpan) - cl.r;
        const rg = ctx.createRadialGradient(cl.x, yy, 1, cl.x, yy, cl.r);
        rg.addColorStop(0, "rgba(60,90,110,0.06)");
        rg.addColorStop(1, "rgba(60,90,110,0)");
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(cl.x, yy, cl.r, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Roadside trees & flowers, scrolling with the track and looping.
    if (sceneSpan) {
      for (const t of trees) {
        const yy = ((t.y + worldScroll) % sceneSpan) - 30;
        if (yy < -30 || yy > H + 30) continue;
        // shadow
        ctx.fillStyle = "rgba(30,70,40,0.18)";
        ctx.beginPath(); ctx.ellipse(t.x + 2, yy + t.r * 0.5, t.r, t.r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
        // canopy with a little shading
        const cg = ctx.createRadialGradient(t.x - t.r * 0.3, yy - t.r * 0.3, 1, t.x, yy, t.r);
        cg.addColorStop(0, "#c7f0cf"); cg.addColorStop(0.5, t.c); cg.addColorStop(1, "#2f8244");
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.arc(t.x, yy, t.r, 0, Math.PI * 2); ctx.fill();
        if (t.flower) {
          ctx.fillStyle = "#ffd5e6";
          ctx.beginPath(); ctx.arc(t.x + t.r * 0.4, yy - t.r * 0.4, 2.4, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    // Warm ground glow where the mob runs so they read as standing on something.
    const R = mobRadius();
    const fg = ctx.createLinearGradient(0, py - R, 0, H);
    fg.addColorStop(0, "rgba(255,255,255,0)");
    fg.addColorStop(1, "rgba(120,200,255,0.22)");
    ctx.fillStyle = fg;
    ctx.fillRect(vw, py - R, W - vw * 2, H - (py - R) + 20);
  }

  // Soft dark corners for a polished, focused frame (screen-space).
  function drawVignette() {
    const rg = ctx.createRadialGradient(W / 2, H * 0.52, H * 0.34, W / 2, H * 0.52, H * 0.78);
    rg.addColorStop(0, "rgba(0,0,0,0)");
    rg.addColorStop(1, "rgba(20,16,40,0.26)");
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
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
    // Additive blending makes sparks and dust glow like real light.
    ctx.globalCompositeOperation = "lighter";
    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life * 1.6, 0, 1);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color; ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
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

  // A real masonry brick wall spanning the track. Cracks deepen as it nears the
  // mob; it glows green once your crew is big enough to smash it.
  function drawWall(row) {
    const h = bandH + 18, y = row.y;
    const can = crew > row.need;
    const near = clamp((row.y + h) / playerY(), 0, 1);   // 0 far → 1 at the mob

    // Brick body.
    const grad = ctx.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, "#c2693c");
    grad.addColorStop(1, "#9c4a28");
    ctx.fillStyle = grad;
    ctx.fillRect(0, y, W, h);

    // Mortar courses + offset bricks.
    const bh = h / 3, bw = 46;
    ctx.lineWidth = 3; ctx.strokeStyle = "rgba(60,30,18,0.55)";
    for (let r = 0; r < 3; r++) {
      const ry = y + r * bh;
      ctx.beginPath(); ctx.moveTo(0, ry); ctx.lineTo(W, ry); ctx.stroke();
      const shift = (r % 2) * (bw / 2);
      for (let bx = -bw + shift; bx < W; bx += bw) {
        ctx.beginPath(); ctx.moveTo(bx, ry); ctx.lineTo(bx, ry + bh); ctx.stroke();
        // brick highlight
        ctx.fillStyle = "rgba(255,255,255,0.10)";
        ctx.fillRect(bx + 2, ry + 2, bw - 5, 3);
      }
    }
    ctx.beginPath(); ctx.moveTo(0, y + h); ctx.lineTo(W, y + h); ctx.stroke();
    // top lip
    ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(0, y, W, 3);

    // Stress cracks that grow as the wall approaches (jagged lightning lines).
    if (near > 0.45) {
      ctx.save();
      ctx.globalAlpha = clamp((near - 0.45) * 1.8, 0, 0.8);
      ctx.strokeStyle = "rgba(20,10,6,0.85)"; ctx.lineWidth = 2;
      for (let k = 0; k < 3; k++) {
        const sx = W * (0.25 + k * 0.25);
        ctx.beginPath(); ctx.moveTo(sx, y);
        let cx = sx;
        for (let yy = y; yy < y + h; yy += 9) {
          cx += (((k * 7 + (yy | 0)) % 5) - 2) * 3;
          ctx.lineTo(cx, yy);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // Number plate — glows green when you can break through.
    ctx.save();
    ctx.font = "bold 34px " + FONT;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (can) {
      ctx.shadowColor = "rgba(120,255,170,0.95)";
      ctx.shadowBlur = 16 + 7 * Math.sin(now * 7);
      ctx.fillStyle = "#d7ffe5";
    } else {
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 5;
      ctx.fillStyle = "#ffe0e6";
    }
    ctx.lineWidth = 5; ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(40,20,12,0.7)";
    ctx.strokeText("🧱 " + row.need, W / 2, y + h / 2 + 1);
    ctx.fillText("🧱 " + row.need, W / 2, y + h / 2 + 1);
    ctx.restore();
  }

  // Black-and-white checkered finish line that streams in before the walls.
  function drawFinish(row) {
    const h = 26, y = row.y, sq = 13;
    for (let r = 0; r < 2; r++) {
      for (let x = 0, i = 0; x < W; x += sq, i++) {
        ctx.fillStyle = ((i + r) % 2) ? "#2b2440" : "#fff";
        ctx.fillRect(x, y + r * sq, sq, sq);
      }
    }
    ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fillRect(0, y + h, W, 4);
  }

  // Tumbling brick chunks from a smashed wall.
  function drawBricks() {
    for (const b of bricks) {
      ctx.save();
      ctx.globalAlpha = clamp(b.life * 1.4, 0, 1);
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.fillStyle = b.color;
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, 2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // Big celebratory / status banner across the centre (screen-space).
  function drawBanner() {
    if (!banner) return;
    const a = clamp(banner.life * 1.5, 0, 1) * clamp((1.8 - banner.life) * 4, 0, 1);
    const pop = 0.85 + clamp((1.8 - banner.life) * 3, 0, 0.15);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(W / 2, H * 0.34);
    ctx.scale(pop, pop);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "bold 36px " + FONT;
    ctx.lineWidth = 7; ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.strokeText(banner.text, 0, 0);
    ctx.fillStyle = banner.color;
    ctx.fillText(banner.text, 0, 0);
    if (banner.sub) {
      ctx.font = "bold 18px " + FONT;
      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.strokeText(banner.sub, 0, 30);
      ctx.fillStyle = "#3a3358";
      ctx.fillText(banner.sub, 0, 30);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawMob() {
    const py = playerY();
    const R = mobRadius();
    const show = Math.min(crew, 40);   // a fuller-looking crowd

    // Speed streaks trailing the mob to sell the constant pace.
    if (!reduceMotion) {
      const so = (worldScroll * 1.5) % 40;
      ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = 2;
      for (let k = -2; k <= 2; k++) {
        const sx = crewX + k * (R * 0.5);
        const sy = py + R + 6 + ((k + 2) * 11 + so) % 40;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + 13); ctx.stroke();
      }
    }

    // One soft shadow for the whole crowd.
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = "#1d2740";
    ctx.beginPath();
    ctx.ellipse(crewX, py + R * 0.5 + 8, R + 8, R * 0.42 + 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Squash/stretch the whole crowd when the count jumps or drops.
    const sy = clamp(mobSquash, 0.6, 1.6);
    const sx = 1 / Math.sqrt(sy);
    ctx.save();
    ctx.translate(crewX, py);
    ctx.scale(sx, sy);
    ctx.translate(-crewX, -py);

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
    ctx.restore();

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

  // Tiny per-runner shading helper: lighten/darken a #rrggbb hex by amt (-1..1).
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = c => clamp(Math.round(c + 255 * amt), 0, 255);
    return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
  }

  function drawRunner(x, y, i) {
    // A little runner with a full running cycle — bouncing body plus swinging
    // arms and legs — drawn in the chosen skin, with soft shading and a touch
    // of per-runner variation so the crowd reads as individuals.
    const sk = currentSkin();
    const vary = ((i * 2654435761) % 100) / 100;   // stable pseudo-random 0..1
    const sc = 0.86 + vary * 0.3;                  // slight size variation
    const phase = now * 11 + i * 1.7;
    const bob = Math.abs(Math.sin(phase)) * 2.3;   // springy up-down
    const swing = Math.sin(phase) * 3.4;           // limb swing
    y -= bob;
    const body = shade(sk.body, (vary - 0.5) * 0.12);

    // Soft contact shadow under each runner for depth.
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = "#16203a";
    ctx.beginPath(); ctx.ellipse(x, y + 9, 4.6 * sc, 1.8 * sc, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    if (sk.blocky) {
      // Blocky buddies: square limbs that piston up and down.
      ctx.fillStyle = shade(body, -0.08);
      ctx.fillRect(x - 4 * sc + swing * 0.4, y + 3, 3 * sc, 6 - Math.abs(swing) * 0.4);
      ctx.fillRect(x + 1 * sc - swing * 0.4, y + 3, 3 * sc, 6 - Math.abs(swing) * 0.4);
      const bg = ctx.createLinearGradient(x - 4, y - 4, x + 4, y + 5);
      bg.addColorStop(0, shade(body, 0.12)); bg.addColorStop(1, shade(body, -0.1));
      ctx.fillStyle = bg;
      ctx.fillRect(x - 4 * sc, y - 4, 8 * sc, 9);  // body
      ctx.fillStyle = sk.head;
      ctx.fillRect(x - 4.5 * sc, y - 12, 9 * sc, 8); // head
      return;
    }

    // Legs.
    ctx.strokeStyle = shade(body, -0.08);
    ctx.lineWidth = 2.6 * sc; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y + 3); ctx.lineTo(x - 2.4 + swing * 0.6, y + 9);
    ctx.moveTo(x, y + 3); ctx.lineTo(x + 2.4 - swing * 0.6, y + 9);
    ctx.stroke();
    // Arms.
    ctx.strokeStyle = body;
    ctx.beginPath();
    ctx.moveTo(x, y - 1); ctx.lineTo(x - 3.2 - swing * 0.5, y + 3);
    ctx.moveTo(x, y - 1); ctx.lineTo(x + 3.2 + swing * 0.5, y + 3);
    ctx.stroke();
    // Body — shaded torso with a subtle outline.
    const bg = ctx.createLinearGradient(x - 4, y - 4, x + 4, y + 5);
    bg.addColorStop(0, shade(body, 0.14)); bg.addColorStop(1, shade(body, -0.12));
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.roundRect(x - 3.6 * sc, y - 4, 7.2 * sc, 9, 3); ctx.fill();
    // Head with a tiny highlight.
    ctx.beginPath(); ctx.arc(x, y - 8, 4.3 * sc, 0, Math.PI * 2);
    ctx.fillStyle = sk.head; ctx.fill();
    ctx.globalAlpha = 0.5; ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(x - 1.3 * sc, y - 9.2, 1.3 * sc, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
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
    levelEl.textContent = level;
    if (phase === "run") {
      const left = Math.max(0, Math.ceil(levelTarget - dist));
      distEl.textContent = left + "m";
    } else {
      distEl.textContent = "🧱";    // in the wall finale
    }
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
