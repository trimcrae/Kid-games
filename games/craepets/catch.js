/* ===========================================================
   Craepets — SKY CATCH, the valley's arcade game.
   -----------------------------------------------------------
   Things fall out of the sky. You run your Craepet left and
   right underneath and catch ONLY the ones the rule asks for:
   "the even numbers", "the vowels", "the letter A", "the stars".
   Catch a right one and score; catch a wrong one and lose one.
   Forty seconds, and the sky gets busier as it goes.

   It is the one place in the valley where quick fingers matter
   as well as a quick mind — a real mini-game, the way a pet
   site has a games room — and the rule is still a lesson: it is
   sorting, at the player's level, at speed.

       CPCatch.start(canvas, { tier, draw(cv, cx), onEnd(result) })
       CPCatch.stop()
       CPCatch.state()   -> the live game, for the play-test robot
   =========================================================== */
window.CPCatch = (function () {
  "use strict";

  var DURATION = 40000;                 // ms
  var VOWELS = "AEIOU", CONSONANTS = "BCDFGHJKLMNPRSTVWYZ";
  var PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];
  var SQUARES = [1, 4, 9, 16, 25, 36, 49];

  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function range(lo, hi) { return lo + rnd(hi - lo + 1); }
  function digits(n) { return String(n).split("").reduce(function (s, d) { return s + Number(d); }, 0); }

  /* Each rule: what it says, how to make a GOOD thing and a BAD thing,
     and what to say about it afterwards. Labels are what is drawn on
     the falling blob. */
  function numRule(text, good, bad, why) {
    return { text: text, why: why,
      good: function () { return { label: String(pick(good)), ok: true }; },
      bad: function () { return { label: String(pick(bad)), ok: false }; } };
  }
  function numsWhere(lo, hi, fn) { var a = []; for (var i = lo; i <= hi; i++) if (fn(i)) a.push(i); return a; }

  var RULES = {
    tot: [
      { text: "Catch the ⭐ stars!", why: "Stars, not rocks.",
        good: function () { return { label: "⭐", ok: true }; }, bad: function () { return { label: pick(["🪨", "🪨", "🍂"]), ok: false }; } },
      { text: "Catch the 🍓 strawberries!", why: "Strawberries, not rocks.",
        good: function () { return { label: "🍓", ok: true }; }, bad: function () { return { label: pick(["🪨", "🍂"]), ok: false }; } }
    ],
    early: [
      { text: "Catch the letter A!", why: "Only the A's.",
        good: function () { return { label: "A", ok: true }; }, bad: function () { return { label: pick(["B", "C", "D", "M", "S", "T"]), ok: false }; } },
      { text: "Catch the 🔴 red ones!", why: "Red, not the other colours.",
        good: function () { return { label: "🔴", ok: true }; }, bad: function () { return { label: pick(["🔵", "🟢", "🟡"]), ok: false }; } },
      { text: "Catch the numbers, not the letters!", why: "Numbers are 1, 2, 3… letters are A, B, C.",
        good: function () { return { label: String(range(1, 9)), ok: true }; }, bad: function () { return { label: pick("ABCDEFGH".split("")), ok: false }; } },
      { text: "Catch the ⭐ stars!", why: "Stars, not rocks.",
        good: function () { return { label: "⭐", ok: true }; }, bad: function () { return { label: pick(["🪨", "🍂", "🌰"]), ok: false }; } }
    ],
    mid: [
      numRule("Catch the EVEN numbers!", numsWhere(2, 20, function (n) { return n % 2 === 0; }), numsWhere(1, 19, function (n) { return n % 2 === 1; }), "Even numbers end in 0, 2, 4, 6 or 8."),
      numRule("Catch the ODD numbers!", numsWhere(1, 19, function (n) { return n % 2 === 1; }), numsWhere(2, 20, function (n) { return n % 2 === 0; }), "Odd numbers end in 1, 3, 5, 7 or 9."),
      numRule("Catch numbers BIGGER than 10!", numsWhere(11, 30, function () { return true; }), numsWhere(1, 10, function () { return true; }), "11 and up."),
      numRule("Catch the multiples of 5!", numsWhere(5, 50, function (n) { return n % 5 === 0; }), numsWhere(1, 49, function (n) { return n % 5 !== 0; }), "Multiples of 5 end in 0 or 5."),
      numRule("Catch the multiples of 2!", numsWhere(2, 30, function (n) { return n % 2 === 0; }), numsWhere(1, 29, function (n) { return n % 2 === 1; }), "Multiples of 2 are the even numbers."),
      { text: "Catch the VOWELS!", why: "A, E, I, O, U.",
        good: function () { return { label: pick(VOWELS.split("")), ok: true }; }, bad: function () { return { label: pick(CONSONANTS.split("")), ok: false }; } }
    ],
    big: [
      numRule("Catch the multiples of 3!", numsWhere(3, 36, function (n) { return n % 3 === 0; }), numsWhere(1, 35, function (n) { return n % 3 !== 0; }), "3, 6, 9, 12… add the digits: a multiple of 3 gives a multiple of 3."),
      numRule("Catch the multiples of 4!", numsWhere(4, 48, function (n) { return n % 4 === 0; }), numsWhere(1, 47, function (n) { return n % 4 !== 0; }), "4, 8, 12, 16…"),
      numRule("Catch the PRIME numbers!", PRIMES.filter(function (p) { return p <= 30; }), numsWhere(4, 30, function (n) { return PRIMES.indexOf(n) === -1; }), "A prime only divides by 1 and itself: 2, 3, 5, 7, 11, 13…"),
      numRule("Catch the SQUARE numbers!", SQUARES.slice(0, 6), numsWhere(2, 35, function (n) { return SQUARES.indexOf(n) === -1; }), "1, 4, 9, 16, 25, 36 — a number times itself."),
      numRule("Catch numbers whose digits add up to 9!", numsWhere(9, 90, function (n) { return digits(n) === 9; }), numsWhere(10, 89, function (n) { return digits(n) !== 9; }), "18 → 1 + 8 = 9. 27, 36, 45, 54…"),
      { text: "Catch the VOWELS!", why: "A, E, I, O, U.",
        good: function () { return { label: pick(VOWELS.split("")), ok: true }; }, bad: function () { return { label: pick(CONSONANTS.split("")), ok: false }; } }
    ],
    grown: [
      numRule("Catch the PRIME numbers!", PRIMES, numsWhere(4, 49, function (n) { return PRIMES.indexOf(n) === -1; }), "2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47."),
      numRule("Catch the multiples of 7!", numsWhere(7, 84, function (n) { return n % 7 === 0; }), numsWhere(8, 83, function (n) { return n % 7 !== 0; }), "7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77, 84."),
      numRule("Catch the multiples of 8!", numsWhere(8, 96, function (n) { return n % 8 === 0; }), numsWhere(9, 95, function (n) { return n % 8 !== 0; }), "8, 16, 24, 32, 40, 48…"),
      numRule("Catch the SQUARE numbers!", SQUARES, numsWhere(2, 50, function (n) { return SQUARES.indexOf(n) === -1; }), "1, 4, 9, 16, 25, 36, 49."),
      numRule("Catch numbers whose digits add up to 10!", numsWhere(19, 91, function (n) { return digits(n) === 10; }), numsWhere(10, 99, function (n) { return digits(n) !== 10; }), "19, 28, 37, 46, 55, 64, 73, 82, 91."),
      numRule("Catch numbers that divide by 6!", numsWhere(6, 72, function (n) { return n % 6 === 0; }), numsWhere(7, 71, function (n) { return n % 6 !== 0; }), "Even AND a multiple of 3: 6, 12, 18, 24…")
    ]
  };

  var G = null;          // the live game
  var raf = 0;

  function ruleFor(tier) { return pick(RULES[tier] || RULES.mid); }

  function start(canvas, opts) {
    stop();
    var rect = canvas.getBoundingClientRect();
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    var scale = Math.max(2, Math.floor(canvas.height / 26));
    G = { cv: canvas, g: canvas.getContext("2d"), dpr: dpr, rule: ruleFor(opts.tier), tier: opts.tier,
          draw: opts.draw, onEnd: opts.onEnd, sfx: opts.sfx || function () {},
          x: canvas.width / 2, tx: canvas.width / 2, speed: canvas.width / 90,
          petW: 16 * scale, petH: 16 * scale, scale: scale,
          items: [], score: 0, right: 0, wrong: 0, best: 0, combo: 0,
          t0: performance.now(), last: performance.now(), nextSpawn: 600, flashes: [],
          over: false, little: opts.tier === "tot" || opts.tier === "early" };
    bindInput(canvas);
    raf = requestAnimationFrame(tick);
    return G;
  }
  function stop() {
    cancelAnimationFrame(raf);
    if (G && G.cv) unbindInput(G.cv);
    G = null;
  }

  /* ---- input: drag anywhere on the canvas, or the arrow keys ---- */
  function onPointer(ev) {
    if (!G) return;
    var r = G.cv.getBoundingClientRect();
    var px = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
    G.tx = Math.max(G.petW / 2, Math.min(G.cv.width - G.petW / 2, px * G.dpr));
    if (ev.cancelable) ev.preventDefault();
  }
  function onKey(ev) {
    if (!G) return;
    if (ev.key === "ArrowLeft") { G.tx = Math.max(G.petW / 2, G.x - G.cv.width * 0.18); ev.preventDefault(); }
    if (ev.key === "ArrowRight") { G.tx = Math.min(G.cv.width - G.petW / 2, G.x + G.cv.width * 0.18); ev.preventDefault(); }
  }
  function bindInput(cv) {
    cv.addEventListener("pointerdown", onPointer);
    cv.addEventListener("pointermove", onPointer);
    cv.addEventListener("touchstart", onPointer, { passive: false });
    cv.addEventListener("touchmove", onPointer, { passive: false });
    document.addEventListener("keydown", onKey);
  }
  function unbindInput(cv) {
    cv.removeEventListener("pointerdown", onPointer);
    cv.removeEventListener("pointermove", onPointer);
    cv.removeEventListener("touchstart", onPointer);
    cv.removeEventListener("touchmove", onPointer);
    document.removeEventListener("keydown", onKey);
  }

  function spawn() {
    var good = Math.random() < 0.5;
    var it = good ? G.rule.good() : G.rule.bad();
    var r = G.scale * 2.2;
    it.x = r + Math.random() * (G.cv.width - 2 * r);
    it.y = -r;
    it.r = r;
    it.vy = (G.cv.height / 2600) * (1 + elapsed() / DURATION * 1.2) * (G.little ? 0.7 : 1);
    it.hue = good ? 0 : 0;   // colour is NOT a clue — that would be cheating
    it.tint = pick(["#ffd166", "#9bf6ff", "#ffb3c6", "#caffbf", "#bde0fe", "#d0bfff"]);
    G.items.push(it);
  }
  function elapsed() { return performance.now() - G.t0; }

  function tick(now) {
    if (!G) return;
    var dt = Math.min(50, now - G.last);
    G.last = now;
    var e = elapsed();
    // the pet runs toward where the finger is
    var d = G.tx - G.x;
    var step = G.speed * dt / 16;
    if (Math.abs(d) <= step) G.x = G.tx; else G.x += d < 0 ? -step : step;
    // things fall; the sky gets busier
    G.nextSpawn -= dt;
    if (G.nextSpawn <= 0 && !G.over) {
      spawn();
      G.nextSpawn = Math.max(380, (G.little ? 1100 : 900) - e / 60);
    }
    var catchY = G.cv.height - G.petH * 0.75;
    for (var i = G.items.length - 1; i >= 0; i--) {
      var it = G.items[i];
      it.y += it.vy * dt;
      var caught = it.y + it.r >= catchY && it.y - it.r <= G.cv.height && Math.abs(it.x - G.x) < G.petW * 0.55;
      if (caught) {
        G.items.splice(i, 1);
        if (it.ok) {
          G.score++; G.right++; G.combo++;
          G.flashes.push({ x: it.x, y: it.y, t: 1, text: "+1", col: "#3ddc84" });
          G.sfx(G.combo >= 3 ? "streak" : "good", G.combo);
        } else {
          G.combo = 0;
          if (!G.little) G.score = Math.max(0, G.score - 1);
          G.wrong++;
          G.flashes.push({ x: it.x, y: it.y, t: 1, text: G.little ? "not that one" : "−1", col: "#ff5d6c" });
          G.sfx("nope");
        }
      } else if (it.y - it.r > G.cv.height) {
        G.items.splice(i, 1);
      }
    }
    for (var f = G.flashes.length - 1; f >= 0; f--) { G.flashes[f].t -= dt / 700; if (G.flashes[f].t <= 0) G.flashes.splice(f, 1); }
    render(e);
    if (e >= DURATION && !G.over) {
      G.over = true;
      var res = { score: G.score, right: G.right, wrong: G.wrong, rule: G.rule };
      var cb = G.onEnd;
      setTimeout(function () { stop(); cb && cb(res); }, 400);
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  function render(e) {
    var g = G.g, W = G.cv.width, H = G.cv.height;
    // sky
    var sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#8fd3ff"); sky.addColorStop(1, "#e8f7ff");
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.fillStyle = "#a8dd8f"; g.fillRect(0, H - G.scale * 1.2, W, G.scale * 1.2);
    // falling things
    g.textAlign = "center"; g.textBaseline = "middle";
    G.items.forEach(function (it) {
      g.fillStyle = it.tint;
      g.beginPath(); g.arc(it.x, it.y, it.r, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "rgba(43,36,64,0.35)"; g.lineWidth = Math.max(1, G.scale * 0.25); g.stroke();
      g.fillStyle = "#2b2440";
      g.font = "bold " + Math.round(it.r * (it.label.length > 1 ? 1.0 : 1.25)) + "px sans-serif";
      g.fillText(it.label, it.x, it.y + it.r * 0.05);
    });
    // the pet
    G.draw(G.cv, G.x, G.scale);
    // scores and the clock
    G.flashes.forEach(function (f) {
      g.globalAlpha = Math.max(0, f.t);
      g.fillStyle = f.col; g.font = "bold " + Math.round(G.scale * 2) + "px sans-serif";
      g.fillText(f.text, f.x, f.y - (1 - f.t) * G.scale * 4);
      g.globalAlpha = 1;
    });
    var left = Math.max(0, DURATION - e);
    var barW = W * 0.5, bx = W * 0.25, by = G.scale * 0.8, bh = G.scale * 0.9;
    g.fillStyle = "rgba(255,255,255,0.7)"; g.fillRect(bx, by, barW, bh);
    g.fillStyle = left < 8000 ? "#ff5d6c" : "#8a5cff"; g.fillRect(bx, by, barW * left / DURATION, bh);
    g.fillStyle = "#2b2440"; g.font = "bold " + Math.round(G.scale * 1.8) + "px sans-serif";
    g.textAlign = "left"; g.fillText("⭐ " + G.score, G.scale, by + bh * 0.6);
    g.textAlign = "right"; g.fillText(Math.ceil(left / 1000) + "s", W - G.scale, by + bh * 0.6);
    if (e < 1800) {
      g.textAlign = "center"; g.fillStyle = "rgba(43,36,64,0.85)";
      g.font = "bold " + Math.round(G.scale * 2.2) + "px sans-serif";
      g.fillText(G.rule.text, W / 2, H * 0.4);
    }
  }

  return { start: start, stop: stop, state: function () { return G; }, RULES: RULES, DURATION: DURATION, ruleFor: ruleFor };
})();
