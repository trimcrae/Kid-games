/* ===========================================================
   Word Bridge — THE STAGE (renderer + game loop)
   -----------------------------------------------------------
   A small 2D engine for one job: look down a plank bridge that
   runs away from you into a canyon, and walk along it.

   How it works, in the usual game way:

     • one <canvas>, one requestAnimationFrame loop, drawn back
       to front every frame (sky → canyon → island → cliff →
       planks + handrails → characters → floating words);
     • a camera at (0, camY, camZ) with a focal length, so a
       world point (x, y, z) projects to
             s  = f / (z - camZ)
             sx = W/2 + x*s        sy = horizon + (camY - y)*s
       which is what makes the bridge narrow towards the island
       and the planks bunch up in the distance;
     • sprites from sprites.js blitted with smoothing off, so
       the pixel art stays crisp at any size;
     • characters tween between planks and cycle their walk
       frames while they move.

   The game logic (word-bridge.js) never draws anything — it
   just tells the stage "these planks now exist" and "walk to
   plank 12", and the stage animates it.
   =========================================================== */
window.WBStage = (function () {
  "use strict";

  /* The camera is PITCHED down at the bridge rather than just parked up
     high. That matters for one reason: the letters are painted on the top
     face of each plank, so if that face lands on screen as a thin sliver
     the letters can't be read. Tilting the view keeps the faces close to
     square over a long stretch of the bridge, instead of only right under
     the camera — so you get readable letters AND a bridge that runs off
     into the distance. */
  var PITCH = 27 * Math.PI / 180;
  var SIN = Math.sin(PITCH), COS = Math.cos(PITCH);

  var GAP = 30;          // world units between plank centres
  var PLANK_LEN = 25;    // how deep one plank is
  var PLANK_W = 26;      // half-width of one bridge
  var LANE_X = 62;       // how far each lane sits from the middle
  var HERO_H = 40;       // character height in world units
  var RAIL_H = 24;       // handrail post height
  var RAIL_EVERY = 3;    // a post every N planks
  var CAM_BACK = 128;    // how far the camera trails the walker
  var CAM_Y = 50;        // camera height above the planks
  var FOCAL = 150;       // recomputed from the canvas width in resize(), so a
                         // phone gets the same framing as a laptop, just smaller
  var FAR = 1000;        // don't bother drawing past this depth

  // what the rival's bridge is made of — each bot builds in its own style
  var BOT_SKIN = { gentle: "wood", speedy: "stone", pro: "lava" };

  var canvas, ctx, W = 0, H = 0, dpr = 1, horizon = 0, axis = 0;
  var raf = null, last = 0, clock = 0;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // everything the stage knows how to draw
  var world = {
    finish: 60,
    skin: "wood",
    hero: "jeannie",
    botKind: "speedy",   // which rival: gentle / speedy / pro
    you: { planks: [], at: 0, target: 0, moving: false, cheer: -9 },
    bot: { planks: [], at: 0, target: 0, moving: false, cheer: -9 },
    camZ: -CAM_BACK,
    shake: 0,
    labels: [],     // the word you just answered, floating over its planks
    pops: [],       // little "+9" coin pops
    sparks: []      // confetti at the finish
  };
  /* ---------- setup ---------- */
  function init(el) {
    canvas = el;
    ctx = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
    if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
  }

  function resize() {
    if (!canvas) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    var box = canvas.getBoundingClientRect();
    W = Math.max(200, Math.round(box.width));
    H = Math.max(140, Math.round(box.height));
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    FOCAL = Math.max(70, W * 0.21);
    horizon = Math.round(H * 0.24);              // where the ground vanishes
    axis = Math.round(horizon + FOCAL * Math.tan(PITCH));
  }

  /* ---------- the camera projection ----------
     Standard pinhole camera, pitched down by PITCH: rotate the point into
     camera space, then divide by depth. `axis` is where the camera's own
     axis lands on screen; the ground's vanishing point (the horizon) sits
     FOCAL*tan(PITCH) above it, which is what resize() works backwards from. */
  function project(x, y, z) {
    var dz = z - world.camZ;          // distance ahead of the camera
    var dy = y - CAM_Y;               // height relative to the camera
    var zc = dz * COS - dy * SIN;     // depth into the screen
    if (zc < 12) zc = 12;
    var yc = dz * SIN + dy * COS;     // up, in camera space
    var s = FOCAL / zc;
    return { x: W / 2 + x * s, y: axis - yc * s, s: s, d: zc };
  }

  /* ---------- what the game tells us ---------- */
  function reset(opts) {
    opts = opts || {};
    world.finish = opts.finish || 60;
    world.skin = opts.skin || "wood";
    world.hero = opts.hero || "jeannie";
    world.botKind = opts.bot || "speedy";
    world.you = { planks: [], at: 0, target: 0, moving: false, cheer: -9 };
    world.bot = { planks: [], at: 0, target: 0, moving: false, cheer: -9 };
    world.camZ = -CAM_BACK;
    world.labels = [];
    world.pops = [];
    world.sparks = [];
    world.done = false;
  }

  function setSkin(id) { world.skin = id; }
  function setHero(id) { world.hero = id; }
  function setBot(id) { world.botKind = id; }
  function side(who) { return who === "you" ? world.you : world.bot; }

  // Drop a word's letters in front of somebody. They appear one at a
  // time (that's `bornAt`), which the draw loop turns into a little
  // slam-down animation.
  function addPlanks(who, letters, word) {
    var s = side(who);
    var t = clock;
    var step = reduced ? 0 : 0.07;
    var from = s.planks.length;
    for (var i = 0; i < letters.length; i++) {
      s.planks.push({ ch: letters[i], bornAt: t + i * step });
    }
    if (word) {
      world.labels.push({
        text: String(word).toUpperCase(), who: who,
        z: (from + letters.length / 2) * GAP,
        bornAt: t, life: 2.6
      });
    }
    return (letters.length * step + (reduced ? 0 : 0.3)) * 1000;
  }

  // A little rising "+9" over somebody's head (coins, bonuses).
  function pop(who, text, colour) {
    var s = side(who);
    world.pops.push({
      text: String(text), who: who, colour: colour || "#ffe066",
      z: Math.max(s.planks.length - 1, 0) * GAP, bornAt: clock, life: 1.6
    });
  }

  // Walk to the end of what's been built.
  function walk(who) {
    var s = side(who);
    s.target = Math.max(0, s.planks.length - 1);
    s.moving = s.target > s.at;
    return Math.abs(s.target - s.at) * 90 + 300;
  }

  // Somebody made it: they jump for joy and the confetti flies.
  function celebrate(who) {
    var s = side(who);
    s.cheer = clock;
    world.done = true;
    if (reduced) return;
    var p = project(who === "you" ? -LANE_X : LANE_X, HERO_H, s.at * GAP);
    for (var i = 0; i < 46; i++) {
      world.sparks.push({
        x: p.x, y: p.y, vx: (Math.random() - 0.5) * 240, vy: -90 - Math.random() * 220,
        c: ["#ff5d8f", "#ffd166", "#3ddc84", "#38b6ff", "#8a5cff", "#fff"][i % 6],
        bornAt: clock, life: 1.6 + Math.random() * 0.8, r: 2 + Math.random() * 3
      });
    }
  }

  function count(who) { return side(who).planks.length; }

  /* ---------- the loop ---------- */
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!last) last = now;
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += dt;
    update(dt);
    draw();
  }

  function update(dt) {
    [world.you, world.bot].forEach(function (s) {
      if (s.at < s.target) {
        // planks per second — a brisk but readable walking pace.
        // Reduced-motion kids get put down at the far end instead.
        s.at = reduced ? s.target : Math.min(s.target, s.at + dt * 7);
        s.moving = !reduced;
      } else {
        s.moving = false;
      }
    });
    // camera eases along behind you
    var want = world.you.at * GAP - CAM_BACK;
    world.camZ += (want - world.camZ) * (reduced ? 1 : Math.min(1, dt * 3.4));
    if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 2);
    world.sparks.forEach(function (k) {
      k.x += k.vx * dt; k.y += k.vy * dt; k.vy += 260 * dt;
    });
    world.sparks = world.sparks.filter(function (k) { return clock - k.bornAt < k.life; });
  }

  /* ---------- drawing ---------- */
  function draw() {
    if (!ctx) return;
    ctx.save();
    if (world.shake > 0) {
      ctx.translate(Math.sin(clock * 60) * world.shake * 3, 0);
    }
    drawSky();
    drawCanyon();
    drawIsland();
    drawCliff();
    drawBridges();
    drawLabels();
    drawSparks();
    ctx.restore();
  }

  // How far along the crossing we are, 0..1 — the day brightens as you go.
  function progress() {
    return Math.max(0, Math.min(1, world.you.at / Math.max(1, world.finish - 1)));
  }

  function lerpColour(a, b, t) {
    var pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
    var pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
    var c = pa.map(function (v, i) { return Math.round(v + (pb[i] - v) * t); });
    return "rgb(" + c.join(",") + ")";
  }

  function drawSky() {
    var t = progress();
    var g = ctx.createLinearGradient(0, 0, 0, horizon + 30);
    g.addColorStop(0, lerpColour("#4aa7e8", "#3a8fe0", t));
    g.addColorStop(0.55, lerpColour("#9cdcff", "#b3e6ff", t));
    g.addColorStop(1, lerpColour("#ffd9a8", "#fff1cf", t));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, horizon + 30);

    // the sun climbs as the day goes on
    var sx = W * (0.7 + t * 0.12), sy = horizon * (0.62 - t * 0.3);
    var sr = Math.max(12, H * 0.05);
    ctx.fillStyle = "rgba(255,240,180,0.35)";
    ctx.beginPath(); ctx.arc(sx, sy, sr * 1.7, 0, 6.284); ctx.fill();
    ctx.fillStyle = "#fff3c4";
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 6.284); ctx.fill();

    // clouds drift very slowly with the camera (parallax)
    var cloud = WBSprites.get("cloud");
    var drift = (world.camZ * 0.06 + clock * 4) % (W + 120);
    [[0.12, 0.28, 3], [0.52, 0.18, 2.2], [0.82, 0.34, 2.6], [0.3, 0.5, 1.6]].forEach(function (c) {
      var x = ((c[0] * W - drift) % (W + 120) + W + 120) % (W + 120) - 60;
      blit(cloud, x, horizon * c[1], c[2] * (H / 260), 0.9);
    });

    // a few gulls wheeling over the water
    if (!reduced) {
      var bird = WBSprites.get("bird");
      [[0.0, 0.42, 1.0], [0.35, 0.55, 0.8], [0.7, 0.38, 1.2]].forEach(function (b, i) {
        var speed = 18 + i * 6;
        var x = ((b[0] * W + clock * speed) % (W + 80) + W + 80) % (W + 80) - 40;
        var y = horizon * b[1] + Math.sin(clock * 1.3 + i) * 4;
        var f = Math.floor(clock * 4 + i) % 2;
        blit(bird[f], x, y, b[2] * (H / 260), 0.75);
      });
    }
  }

  function drawCanyon() {
    // far ridge, near ridge, then the gorge itself — three flat layers
    // of colour that read as depth without costing anything.
    layerRidge(horizon + 2, "#8fb7c9", 0.5, 26, true);
    layerRidge(horizon + 11, "#6d9bb4", 0.9, 20, false);

    var g = ctx.createLinearGradient(0, horizon + 10, 0, H);
    g.addColorStop(0, "#4a7f9c");
    g.addColorStop(0.45, "#2b5f7e");
    g.addColorStop(1, "#123449");
    ctx.fillStyle = g;
    ctx.fillRect(0, horizon + 10, W, H - horizon - 10);

    // ripples: closer together near the horizon, so the water has depth
    ctx.fillStyle = "#ffffff";
    for (var i = 1; i <= 9; i++) {
      var t = i / 9;
      var y = horizon + 14 + t * t * (H - horizon) * 0.95;
      ctx.globalAlpha = 0.05 + t * 0.06;
      ctx.fillRect(0, y + Math.sin(clock * 0.6 + i) * 1.5, W, 1 + t * 2);
    }
    // sun glitter on the water
    if (!reduced) {
      var sx = W * (0.7 + progress() * 0.12);
      for (var k = 0; k < 14; k++) {
        var tt = (k + 1) / 15;
        var yy = horizon + 16 + tt * tt * (H - horizon) * 0.7;
        var phase = Math.sin(clock * 2.2 + k * 1.7);
        if (phase < 0.3) continue;
        ctx.globalAlpha = (phase - 0.3) * 0.35;
        var wobble = Math.sin(clock * 0.9 + k) * 18 * tt;
        ctx.fillRect(sx + wobble + (k % 3 - 1) * 24 * tt, yy, 3 + tt * 12, 1.5);
      }
    }
    ctx.globalAlpha = 1;
  }

  // A jagged skyline drawn from a repeatable sawtooth — same shape
  // every frame, so it never shimmers. The far ridge wears snow.
  function layerRidge(baseY, colour, parallax, height, snow) {
    var shift = (world.camZ * parallax * 0.25) % 160;
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(0, baseY + 40);
    var x, k;
    for (x = -160; x <= W + 160; x += 40) {
      k = Math.abs(((x + shift) / 40) % 4 - 2);      // 0..2 sawtooth
      ctx.lineTo(x, baseY - k * (height / 2));
    }
    ctx.lineTo(W + 160, baseY + 40);
    ctx.closePath();
    ctx.fill();
    if (!snow) return;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    for (x = -160; x <= W + 160; x += 40) {
      k = Math.abs(((x + shift) / 40) % 4 - 2);
      if (k > 1.9) {
        ctx.beginPath();
        ctx.moveTo(x - 7, baseY - k * (height / 2) + 4);
        ctx.lineTo(x, baseY - k * (height / 2));
        ctx.lineTo(x + 7, baseY - k * (height / 2) + 4);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  function drawIsland() {
    var img = WBSprites.get("island");
    var z = world.finish * GAP + 40;
    var p = project(0, 0, z);
    if (p.s <= 0) return;
    var scale = (p.s * 300) / img.pxW;
    blit(img, p.x - (img.pxW * scale) / 2, p.y - img.pxH * scale, scale, 1);

    // finish flags on both lanes, flapping
    var flag = WBSprites.get("flag");
    var f = reduced ? 0 : Math.floor(clock * 5) % 2;
    [-LANE_X, LANE_X].forEach(function (x) {
      var q = project(x, 0, world.finish * GAP + 4);
      if (q.d < 16 || q.d > FAR) return;
      var fs = (p.s * 34) / flag[0].pxH;
      blit(flag[f], q.x - 2 * fs, q.y - flag[0].pxH * fs, fs, 1);
    });

    // a banner across the finish, once you're near enough to read it
    if (p.s > 0.45) {
      var size = Math.round(Math.min(30, 20 * p.s));
      ctx.save();
      ctx.font = "900 " + size + "px 'Trebuchet MS', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(3, size * 0.3);
      ctx.strokeStyle = "#241c33";
      var by = p.y - img.pxH * scale - size * 1.4;
      ctx.strokeText("FINISH", p.x, by);
      ctx.fillStyle = "#ffe066";
      ctx.fillText("FINISH", p.x, by);
      ctx.restore();
    }
  }

  // The grassy ledge everyone sets off from. Seen from behind and above
  // it's just its top face, so it gets a stone lip, a dirt path down the
  // middle and a few tufts — and it falls away behind you as you walk.
  function drawCliff() {
    var half = LANE_X + PLANK_W + 22;
    var farZ = PLANK_LEN * 0.8;
    // the near edge always sits just in front of the camera, so the ledge
    // fills the bottom of the frame while you're standing on it
    var nearZ = Math.min(farZ - 8, Math.max(world.camZ + 36, farZ - 360));
    var c = project(half, 0, farZ), d = project(-half, 0, farZ);
    if (c.d < 14 || c.d > FAR) return;
    var a = project(-half, 0, nearZ), b = project(half, 0, nearZ);

    function quad(z0, z1, x0, x1, colour) {
      var p0 = project(x0, 0, z0), p1 = project(x1, 0, z0);
      var p2 = project(x1, 0, z1), p3 = project(x0, 0, z1);
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
      ctx.fill();
    }

    // grass
    ctx.fillStyle = "#5cb843";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fill();
    // darker mown stripes, fixed in the world so they slide past
    for (var z = Math.ceil(nearZ / 40) * 40; z < farZ - 10; z += 40) {
      quad(z, Math.min(z + 18, farZ - 10), -half, half, "rgba(0,60,20,0.10)");
    }
    // a trodden path up to each lane's first plank
    quad(nearZ, farZ - 6, -LANE_X - 9, -LANE_X + 9, "#b98a5a");
    quad(nearZ, farZ - 6, LANE_X - 9, LANE_X + 9, "#b98a5a");
    // tufts
    ctx.fillStyle = "#3f9a2f";
    for (var i = 0; i < 12; i++) {
      var tz = farZ - 14 - ((i * 37) % 300);
      if (tz < nearZ) continue;
      var tx = ((i * 53) % (half * 2)) - half;
      if (Math.abs(Math.abs(tx) - LANE_X) < 12) continue;
      var t = project(tx, 0, tz);
      if (t.d < 14) continue;
      ctx.fillRect(t.x - 2 * t.s, t.y - 4 * t.s, 4 * t.s, 4 * t.s);
    }
    // the stone lip along the drop
    quad(farZ - 6, farZ, -half, half, "#8b8a80");
    ctx.fillStyle = "#4a3a30";
    ctx.beginPath();
    ctx.moveTo(d.x, d.y); ctx.lineTo(c.x, c.y);
    ctx.lineTo(c.x, c.y + Math.max(2, 4 * c.s)); ctx.lineTo(d.x, d.y + Math.max(2, 4 * c.s));
    ctx.closePath();
    ctx.fill();
  }

  function drawBridges() {
    // furthest planks first so nearer ones overlap them correctly
    var maxLen = Math.max(world.you.planks.length, world.bot.planks.length);
    for (var i = maxLen - 1; i >= 0; i--) {
      drawPlank("bot", i);
      drawPlank("you", i);
    }
    drawRails("bot");
    drawRails("you");
    // the walkers, nearest last
    var order = world.bot.at > world.you.at ? ["bot", "you"] : ["you", "bot"];
    order.forEach(drawWalker);
    drawPops();
  }

  // Rope handrails: a post every few planks with a rope slung between
  // them. They're what make it read as a bridge and not a row of tiles.
  function drawRails(who) {
    var s = side(who);
    var n = s.planks.length;
    if (n < 1) return;
    var laneX = who === "you" ? -LANE_X : LANE_X;
    var last = Math.floor((n - 1) / RAIL_EVERY) * RAIL_EVERY;
    [-1, 1].forEach(function (sideSign) {
      var x = laneX + sideSign * (PLANK_W - 2);
      var prev = null;
      for (var i = 0; i <= last; i += RAIL_EVERY) {
        var pl = s.planks[i];
        if (!pl || clock - pl.bornAt < 0.3) break;
        var z = i * GAP + PLANK_LEN * 0.5;
        var base = project(x, 0, z);
        var top = project(x, RAIL_H, z);
        // A post right under the camera projects as a huge leaning stick
        // and its rope slices across the frame, so the rails start a
        // little way ahead — where the perspective looks like a bridge.
        if (base.d < 75 || top.d < 75 || base.d > FAR) { prev = null; continue; }
        // the post
        ctx.lineWidth = Math.max(1, 3 * base.s);
        ctx.strokeStyle = "#5a3a22";
        ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(top.x, top.y); ctx.stroke();
        // the rope, sagging a touch between posts
        if (prev) {
          ctx.lineWidth = Math.max(1, 1.6 * base.s);
          ctx.strokeStyle = "#d9b98a";
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.quadraticCurveTo((prev.x + top.x) / 2, (prev.y + top.y) / 2 + 3 * base.s, top.x, top.y);
          ctx.stroke();
        }
        prev = top;
      }
    });
  }

  // The word itself, floating over the planks it just built and rising
  // away — so the letters underfoot join up into something readable.
  function drawLabels() {
    world.labels = world.labels.filter(function (l) { return clock - l.bornAt < l.life; });
    world.labels.forEach(function (l) {
      var age = clock - l.bornAt;
      var t = age / l.life;
      var p = project(l.who === "you" ? -LANE_X : LANE_X, 26 + age * 9, l.z);
      if (p.d < 16 || p.d > FAR) return;
      var size = Math.max(11, Math.min(34, 42 * p.s));
      ctx.save();
      ctx.globalAlpha = t < 0.7 ? 1 : (1 - t) / 0.3;
      ctx.font = "900 " + Math.round(size) + "px 'Trebuchet MS', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(3, size * 0.34);
      ctx.strokeStyle = "#241c33";
      ctx.strokeText(l.text, p.x, p.y);
      ctx.fillStyle = l.who === "you" ? "#ffe9a8" : "#dfe9f2";
      ctx.fillText(l.text, p.x, p.y);
      ctx.restore();
    });
  }

  function drawPops() {
    world.pops = world.pops.filter(function (l) { return clock - l.bornAt < l.life; });
    world.pops.forEach(function (l) {
      var age = clock - l.bornAt;
      var t = age / l.life;
      var p = project(l.who === "you" ? -LANE_X : LANE_X, HERO_H + 8 + age * 22, l.z);
      if (p.d < 16 || p.d > FAR) return;
      var size = Math.max(10, Math.min(26, 30 * p.s));
      ctx.save();
      ctx.globalAlpha = t < 0.6 ? 1 : (1 - t) / 0.4;
      ctx.font = "900 " + Math.round(size) + "px 'Trebuchet MS', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(2, size * 0.3);
      ctx.strokeStyle = "#241c33";
      ctx.strokeText(l.text, p.x, p.y);
      ctx.fillStyle = l.colour;
      ctx.fillText(l.text, p.x, p.y);
      ctx.restore();
    });
  }

  function drawSparks() {
    if (!world.sparks.length) return;
    world.sparks.forEach(function (k) {
      var t = (clock - k.bornAt) / k.life;
      ctx.globalAlpha = t < 0.7 ? 1 : (1 - t) / 0.3;
      ctx.fillStyle = k.c;
      ctx.fillRect(k.x - k.r / 2, k.y - k.r / 2, k.r, k.r * 1.4);
    });
    ctx.globalAlpha = 1;
  }

  function drawPlank(who, i) {
    var s = side(who);
    var p = s.planks[i];
    if (!p) return;
    var z = i * GAP;
    var near = project(0, 0, z);
    var far = project(0, 0, z + PLANK_LEN);
    if (near.d < 16 || near.d > FAR || near.y < horizon - 4) return;

    // slam-down: a new plank falls the last little bit into place
    var age = clock - p.bornAt;
    if (age < 0) return;
    var drop = age < 0.3 ? (1 - age / 0.3) : 0;
    var lift = drop * drop * 40 * near.s;
    var alpha = age < 0.12 ? age / 0.12 : 1;

    var laneX = who === "you" ? -LANE_X : LANE_X;
    var cx = W / 2 + laneX * near.s;
    var w = PLANK_W * 2 * near.s;
    var h = Math.max(2, near.y - far.y);
    var skin = who === "you" ? world.skin : (BOT_SKIN[world.botKind] || "wood");
    var img = WBSprites.get("plank." + skin) || WBSprites.get("plank.wood");

    // a soft shadow on the water underneath, so the plank sits ON something
    if (w > 10) {
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = "#061a2a";
      ctx.fillRect(cx - w / 2 + 2 * near.s, near.y - h + 3 * near.s, w, h * 1.5);
      ctx.globalAlpha = 1;
    }
    blit(img, cx - w / 2, near.y - h - lift, null, alpha, w, h + h * 0.5);
    if (w > 22) drawLetter(p.ch, cx, near.y - h - lift, w, h);

    // dust puffs as it lands
    if (!reduced && age >= 0.3 && age < 0.75) {
      var t = (age - 0.3) / 0.45;
      ctx.globalAlpha = (1 - t) * 0.6;
      ctx.fillStyle = "#f6e7c8";
      var r = (3 + t * 9) * near.s;
      ctx.beginPath();
      ctx.arc(cx - w / 2 - r * 0.4, near.y - r * t, r, 0, 6.284);
      ctx.arc(cx + w / 2 + r * 0.4, near.y - r * t, r, 0, 6.284);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // The letter is painted ON the plank, so it gets squashed exactly as
  // much as the plank is — that's what sells it as lying flat.
  function drawLetter(ch, cx, top, w, h) {
    // No squashing: the plank face is tall enough to hold a real letter.
    var size = Math.round(Math.min(w * 0.52, h * 0.92, 74));
    if (size < 7) return;

    ctx.save();
    ctx.translate(cx, top + h * 0.5);
    ctx.font = "900 " + size + "px 'Trebuchet MS', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // A dark plaque under the letter, so it reads the same on pale
    // planks (ice, candy, gold) as it does on wood.
    var pw = size * 0.78, ph = size * 0.88, r = size * 0.2;
    ctx.fillStyle = "rgba(28,22,42,0.26)";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-pw / 2, -ph / 2, pw, ph, r);
    else ctx.rect(-pw / 2, -ph / 2, pw, ph);
    ctx.fill();

    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(2, size * 0.16);
    ctx.strokeStyle = "#241c33";
    ctx.strokeText(ch, 0, 0);
    ctx.fillStyle = "#fffdf5";
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  }

  function drawWalker(who) {
    var s = side(who);
    var frames = who === "you"
      ? WBSprites.get("hero." + world.hero + ".walk")
      : (WBSprites.get("bot." + world.botKind + ".walk") || WBSprites.get("bot.walk"));
    var z = s.at * GAP + PLANK_LEN * 0.5;
    var p = project(who === "you" ? -LANE_X : LANE_X, 0, z);
    if (p.d < 16) return;
    var scale = (HERO_H * p.s) / frames[0].pxH;
    var w = frames[0].pxW * scale;
    var h = frames[0].pxH * scale;
    if (h < 6) return;

    // walk cycle: stride, pass, stride, pass
    var order = [0, 1, 2, 1];
    var f = s.moving ? order[Math.floor(clock * 9) % 4] % frames.length : 1 % frames.length;
    var bob = s.moving ? Math.abs(Math.sin(clock * 9)) * h * 0.06 : 0;
    // jumping for joy at the finish
    var cheering = !reduced && clock - s.cheer < 2.4;
    if (cheering) {
      bob = Math.abs(Math.sin((clock - s.cheer) * 7)) * h * 0.35;
      f = order[Math.floor(clock * 14) % 4] % frames.length;
    }

    // a soft shadow so they read as standing ON the plank
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#0d2233";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, w * 0.34 * (1 - bob / h * 0.5), Math.max(1.5, h * 0.07), 0, 0, 6.284);
    ctx.fill();
    ctx.globalAlpha = 1;

    blit(frames[f], p.x - w / 2, p.y - h - bob, scale, 1);
  }

  /* ---------- blit a baked sprite ---------- */
  function blit(img, x, y, scale, alpha, forceW, forceH) {
    if (!img) return;
    var w = forceW != null ? forceW : img.pxW * scale;
    var h = forceH != null ? forceH : img.pxH * scale;
    if (!(w > 0) || !(h > 0)) return;
    if (alpha != null && alpha < 1) ctx.globalAlpha = alpha;
    ctx.drawImage(img, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    if (alpha != null && alpha < 1) ctx.globalAlpha = 1;
  }

  return {
    init: init,
    reset: reset,
    setSkin: setSkin,
    setHero: setHero,
    setBot: setBot,
    addPlanks: addPlanks,
    pop: pop,
    walk: walk,
    celebrate: celebrate,
    count: count,
    at: function (who) { return side(who).at; },
    bump: function () { world.shake = 1; },
    world: world
  };
})();
