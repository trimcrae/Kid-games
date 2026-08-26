/* ===========================================================
   Word Bridge — THE STAGE (renderer + game loop)
   -----------------------------------------------------------
   A small 2D engine for one job: look down a plank bridge that
   runs away from you into a canyon, and walk along it.

   How it works, in the usual game way:

     • one <canvas>, one requestAnimationFrame loop, drawn back
       to front every frame (sky → canyon → island → planks →
       characters);
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
  var CAM_BACK = 128;    // how far the camera trails the walker
  var CAM_Y = 50;        // camera height above the planks
  var FOCAL = 150;       // recomputed from the canvas width in resize(), so a
                         // phone gets the same framing as a laptop, just smaller
  var FAR = 1000;        // don't bother drawing past this depth

  var canvas, ctx, W = 0, H = 0, dpr = 1, horizon = 0, axis = 0;
  var raf = null, last = 0, clock = 0;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // everything the stage knows how to draw
  var world = {
    finish: 60,
    skin: "wood",
    hero: "jeannie",
    you: { planks: [], at: 0, target: 0, moving: false },
    bot: { planks: [], at: 0, target: 0, moving: false },
    camZ: -CAM_BACK,
    shake: 0,
    labels: []      // the word you just answered, floating over its planks
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
    world.you = { planks: [], at: 0, target: 0, moving: false };
    world.bot = { planks: [], at: 0, target: 0, moving: false };
    world.camZ = -CAM_BACK;
    world.labels = [];
    world.done = false;
  }

  function setSkin(id) { world.skin = id; }
  function setHero(id) { world.hero = id; }

  // Drop a word's letters in front of somebody. They appear one at a
  // time (that's `bornAt`), which the draw loop turns into a little
  // slam-down animation.
  function addPlanks(who, letters, word) {
    var side = world[who];
    var t = clock;
    var step = reduced ? 0 : 0.07;
    var from = side.planks.length;
    for (var i = 0; i < letters.length; i++) {
      side.planks.push({ ch: letters[i], bornAt: t + i * step });
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

  // Walk to the end of what's been built.
  function walk(who) {
    var side = world[who];
    side.target = Math.max(0, side.planks.length - 1);
    side.moving = side.target > side.at;
    return Math.abs(side.target - side.at) * 90 + 300;
  }

  function count(who) { return world[who].planks.length; }

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
    ["you", "bot"].forEach(function (who) {
      var side = world[who];
      if (side.at < side.target) {
        // planks per second — a brisk but readable walking pace.
        // Reduced-motion kids get put down at the far end instead.
        side.at = reduced ? side.target : Math.min(side.target, side.at + dt * 7);
        side.moving = !reduced;
      } else {
        side.moving = false;
      }
    });
    // camera eases along behind you
    var want = world.you.at * GAP - CAM_BACK;
    world.camZ += (want - world.camZ) * (reduced ? 1 : Math.min(1, dt * 3.4));
    if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 2);
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
    drawBridges();
    drawLabels();
    ctx.restore();
  }

  function drawSky() {
    var g = ctx.createLinearGradient(0, 0, 0, horizon + 30);
    g.addColorStop(0, "#5fc6f5");
    g.addColorStop(0.55, "#a9e4ff");
    g.addColorStop(1, "#ffe6bd");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, horizon + 30);

    // sun
    ctx.fillStyle = "#fff3c4";
    ctx.beginPath();
    ctx.arc(W * 0.76, horizon * 0.45, Math.max(12, H * 0.05), 0, 6.284);
    ctx.fill();

    // clouds drift very slowly with the camera (parallax)
    var cloud = WBSprites.get("cloud");
    var drift = (world.camZ * 0.06) % (W + 120);
    [[0.12, 0.28, 3], [0.52, 0.18, 2.2], [0.82, 0.34, 2.6]].forEach(function (c, i) {
      var x = ((c[0] * W - drift) % (W + 120) + W + 120) % (W + 120) - 60;
      blit(cloud, x, horizon * c[1], c[2] * (H / 260), 0.9);
    });
  }

  function drawCanyon() {
    // far ridge, near ridge, then the gorge itself — three flat layers
    // of colour that read as depth without costing anything.
    layerRidge(horizon + 2, "#8fb7c9", 0.5, 26);
    layerRidge(horizon + 11, "#6d9bb4", 0.9, 20);

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
    ctx.globalAlpha = 1;
  }

  // A jagged skyline drawn from a repeatable sawtooth — same shape
  // every frame, so it never shimmers.
  function layerRidge(baseY, colour, parallax, height) {
    var shift = (world.camZ * parallax * 0.25) % 160;
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(0, baseY + 40);
    for (var x = -160; x <= W + 160; x += 40) {
      var k = Math.abs(((x + shift) / 40) % 4 - 2);      // 0..2 sawtooth
      ctx.lineTo(x, baseY - k * (height / 2));
    }
    ctx.lineTo(W + 160, baseY + 40);
    ctx.closePath();
    ctx.fill();
  }

  function drawIsland() {
    var img = WBSprites.get("island");
    var z = world.finish * GAP + 40;
    var p = project(0, 0, z);
    if (p.s <= 0) return;
    var scale = (p.s * 260) / img.pxW;
    blit(img, p.x - (img.pxW * scale) / 2, p.y - img.pxH * scale, scale, 1);
  }

  function drawBridges() {
    // furthest planks first so nearer ones overlap them correctly
    var maxLen = Math.max(world.you.planks.length, world.bot.planks.length);
    for (var i = maxLen - 1; i >= 0; i--) {
      drawPlank("bot", i);
      drawPlank("you", i);
    }
    // the walkers, nearest last
    var order = world.bot.at > world.you.at ? ["bot", "you"] : ["you", "bot"];
    order.forEach(drawWalker);
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

  function drawPlank(who, i) {
    var side = world[who];
    var p = side.planks[i];
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
    var img = WBSprites.get("plank." + (who === "you" ? world.skin : "wood"));

    blit(img, cx - w / 2, near.y - h - lift, null, alpha, w, h + h * 0.5);
    if (w > 22) drawLetter(p.ch, cx, near.y - h - lift, w, h);
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
    var side = world[who];
    var frames = who === "you"
      ? WBSprites.get("hero." + world.hero + ".walk")
      : WBSprites.get("bot.walk");
    var z = side.at * GAP + PLANK_LEN * 0.5;
    var p = project(who === "you" ? -LANE_X : LANE_X, 0, z);
    if (p.d < 16) return;
    var scale = (HERO_H * p.s) / frames[0].pxH;
    var w = frames[0].pxW * scale;
    var h = frames[0].pxH * scale;
    if (h < 6) return;

    // walk cycle: stride, pass, stride, pass
    var order = [0, 1, 2, 1];
    var f = side.moving ? order[Math.floor(clock * 9) % 4] % frames.length : 1 % frames.length;
    var bob = side.moving ? Math.abs(Math.sin(clock * 9)) * h * 0.06 : 0;

    // a soft shadow so they read as standing ON the plank
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#0d2233";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, w * 0.34, Math.max(1.5, h * 0.07), 0, 0, 6.284);
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
    addPlanks: addPlanks,
    walk: walk,
    count: count,
    at: function (who) { return world[who].at; },
    bump: function () { world.shake = 1; },
    world: world
  };
})();
