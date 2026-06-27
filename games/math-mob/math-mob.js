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
  const comboPill = $("combo-pill");
  const comboEl   = $("combo");
  const muteBtn   = $("mute-btn");

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
  let combo = 0;
  let worldScroll = 0;         // for scrolling speed-chevrons
  let shake = 0;               // screen-shake magnitude
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
    const tier = dist < 150 ? 1 : dist < 450 ? 2 : 3;
    let a, b;
    const r = Math.random();
    if (tier === 1) {
      if (r < 0.6) { a = makeOp("add", pick([2, 3, 5])); b = makeOp("add", pick([6, 8, 10])); }
      else         { a = makeOp("mul", 2); b = makeOp("add", pick([3, 4, 5])); }
    } else if (tier === 2) {
      if (r < 0.45)      { a = makeOp("mul", pick([2, 3])); b = makeOp("add", pick([8, 10, 12, 15])); }
      else if (r < 0.8)  { a = makeOp("add", pick([10, 15, 20])); b = makeOp("sub", pick([3, 5, 8])); }
      else               { a = makeOp("mul", 2); b = makeOp("mul", 3); }
    } else {
      if (r < 0.4)       { a = makeOp("mul", pick([2, 3, 4])); b = makeOp("add", pick([15, 20, 25, 30])); }
      else if (r < 0.7)  { a = makeOp("mul", pick([3, 4])); b = makeOp("div", 2); }
      else               { a = makeOp("add", pick([20, 30])); b = makeOp("mul", pick([2, 3])); }
    }
    return Math.random() < 0.5 ? [a, b] : [b, a];
  }

  function spawnRow() {
    // A number wall is due?
    if (bossPending) {
      bossPending = false;
      const need = Math.max(5, Math.round(6 + dist * 0.07));
      rows.push({ kind: "boss", y: -bandH, need, done: false });
      nextBossDist = dist + rand(200, 280);
      return;
    }
    const barrierChance = dist < 80 ? 0 : 0.30;
    if (Math.random() < barrierChance) {
      const side = Math.random() < 0.5 ? "L" : "R";
      rows.push({ kind: "barrier", y: -bandH, side, done: false });
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
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(0.2, 1) * (power || 220);
      particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
        life: rand(0.4, 0.9), color, size: rand(3, 6),
      });
    }
  }
  function addShake(m) { shake = Math.max(shake, m); }

  // ---- Start / end ----------------------------------------------------
  function startRun() {
    initAudio();
    if (actx && actx.state === "suspended") actx.resume();
    resize();
    crew = 1 + upgLevel("crew");
    crewX = targetX = W / 2;
    dist = 0; runCoins = 0; bestCrewThisRun = crew;
    shieldsLeft = upgLevel("shield");
    speed = 240;
    rows = []; coins = []; floaters = []; particles = [];
    spawnAccum = 0; coinAccum = 0; worldScroll = 0; shake = 0;
    keyDir = 0; combo = 0;
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
    persist();

    $("go-dist").textContent = distR;
    $("go-crew").textContent = bestCrewThisRun;
    $("go-coins").textContent = earned;
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
    speed = 240 + Math.min(dist * 0.9, 380);
    const dy = speed * dt;
    dist += dy / 26;
    worldScroll += dy;

    if (dist >= nextBossDist) bossPending = true;

    if (keyDir !== 0) targetX = clamp(targetX + keyDir * 620 * dt, 0, W);
    crewX += (targetX - crewX) * Math.min(1, dt * 12);
    crewX = clamp(crewX, mobRadius() + 6, W - mobRadius() - 6);

    spawnAccum += dy;
    const rowGap = clamp(H * 0.95 - dist * 0.4, H * 0.55, H * 1.1);
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
    combo = 0; setCombo(0);
    addFloater(crewX, playerY() - 30, "-" + (before - crew), "#ff4d6d", true);
    burst(crewX, playerY() - 24, "#ff4d6d", 18, 300);
    addShake(10);
    sfx.barrier();
  }

  function applyBoss(row) {
    const before = crew;
    if (crew > row.need) {
      crew = crew - row.need;          // punch through, lose its strength
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

  function render() {
    ctx.save();
    if (shake > 0) ctx.translate(rand(-shake, shake), rand(-shake, shake));

    const py = playerY();
    ctx.clearRect(-20, -20, W + 40, H + 40);

    // Track + grassy strip
    ctx.fillStyle = "#cdeffd";
    ctx.fillRect(-20, -20, W + 40, H + 40);
    ctx.fillStyle = "#8fd6a6";
    ctx.fillRect(-20, py + mobRadius() + 8, W + 40, H);

    // Scrolling speed chevrons in each lane (sense of motion)
    drawChevrons();

    // Lane divider
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 4;
    ctx.setLineDash([18, 16]);
    ctx.lineDashOffset = -(worldScroll % 34);
    ctx.beginPath();
    ctx.moveTo(W / 2, -20); ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;

    // Coins
    for (const c of coins) {
      if (c.got) continue;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fillStyle = "#ffd166"; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = "#e0a92e"; ctx.stroke();
      ctx.fillStyle = "#b7860b";
      ctx.font = "bold 12px " + FONT;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("$", c.x, c.y + 1);
    }

    // Rows
    for (const row of rows) {
      if (row.kind === "gate") drawGate(row);
      else if (row.kind === "barrier") drawBarrier(row);
      else drawBoss(row);
    }

    // Particles (under the mob number, over the track)
    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life * 1.5, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    drawMob();

    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const f of floaters) {
      ctx.globalAlpha = clamp(f.life, 0, 1);
      ctx.fillStyle = f.color;
      ctx.font = "bold " + (f.big ? 26 : 20) + "px " + FONT;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

  function drawChevrons() {
    const spacing = 90;
    const off = worldScroll % spacing;
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 5;
    for (const cx of [W * 0.25, W * 0.75]) {
      for (let y = off - spacing; y < H; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(cx - 16, y); ctx.lineTo(cx, y + 14); ctx.lineTo(cx + 16, y);
        ctx.stroke();
      }
    }
  }

  function drawGate(row) {
    const y = row.y, h = bandH;
    const halves = [
      { x: 0, w: W / 2, op: row.ops[0] },
      { x: W / 2, w: W / 2, op: row.ops[1] },
    ];
    for (const half of halves) {
      ctx.fillStyle = hexA(half.op.color, 0.78);
      ctx.fillRect(half.x, y, half.w, h);
      ctx.fillStyle = hexA(half.op.color, 1);
      ctx.fillRect(half.x, y, half.w, 6);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 30px " + FONT;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(half.op.label, half.x + half.w / 2, y + h / 2 + 2);
    }
    ctx.fillStyle = "#fff";
    ctx.fillRect(W / 2 - 3, y - 4, 6, h + 8);
  }

  function drawBarrier(row) {
    const y = row.y, h = bandH;
    const x = row.side === "L" ? 0 : W / 2;
    const w = W / 2;
    ctx.fillStyle = hexA("#ff4d6d", 0.9);
    ctx.fillRect(x, y, w, h);
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
    // Required number — beat it to smash through
    const big = crew > row.need;
    ctx.fillStyle = big ? "#8fffb0" : "#ff9db0";
    ctx.font = "bold 34px " + FONT;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("⚔️ " + row.need, W / 2, y + h / 2 + 1);
  }

  function drawMob() {
    const py = playerY();
    const R = mobRadius();
    const show = Math.min(crew, 28);
    for (let i = 0; i < show; i++) {
      const ang = i * 2.399963;
      const rad = (i === 0) ? 0 : R * Math.sqrt(i / show);
      const gx = crewX + Math.cos(ang) * rad;
      const gy = py + Math.sin(ang) * rad * 0.55;
      drawRunner(gx, gy, i);
    }
    ctx.fillStyle = "#2b2440";
    ctx.font = "bold 26px " + FONT;
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.lineWidth = 5; ctx.strokeStyle = "rgba(255,255,255,0.95)";
    const label = "🏃 " + crew;
    ctx.strokeText(label, crewX, py - R - 14);
    ctx.fillText(label, crewX, py - R - 14);
  }

  function drawRunner(x, y, i) {
    // little blue runner with a gentle running bob
    const bob = Math.sin(now * 12 + i * 1.3) * 1.6;
    y += bob;
    ctx.fillStyle = "#3a6ff0";
    ctx.beginPath();
    ctx.roundRect(x - 4, y - 4, 8, 13, 3);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y - 9, 4.6, 0, Math.PI * 2);
    ctx.fillStyle = "#ffd9a8";
    ctx.fill();
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
          initAudio(); sfx.coin();
          renderShop();
        };
      }
      row.appendChild(btn);
      shop.appendChild(row);
    }
  }

  // ---- Button wiring --------------------------------------------------
  $("play-btn").onclick    = startRun;
  $("again-btn").onclick   = startRun;
  $("shop-btn").onclick    = () => { renderShop(); hide(menu); show(shopScreen); };
  $("go-shop-btn").onclick = () => { renderShop(); hide(gameover); show(shopScreen); };
  $("shop-back").onclick   = () => { hide(shopScreen); refreshMenu(); show(menu); };

  // ---- Boot -----------------------------------------------------------
  resize();
  applyMuteUI();
  refreshMenu();
})();
