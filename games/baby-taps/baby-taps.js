/* ===========================================================
   Baby Taps — the arcade's first game for Kieran.
   -----------------------------------------------------------
   The whole design brief is "a baby cannot get this wrong":

     • giant targets (a third of the screen), nothing small
     • no timer, no score to lose, no game-over, no menus a
       baby can get stuck in
     • every single tap does something happy — hitting the
       background still makes sparkles, so bashing works
     • one thing pops, another floats in; it never runs out
     • the only way OUT is to press and HOLD the corner button
       for a second, so a palm-mash can never leave the game

   What it teaches: cause and effect (I tap → something
   happens), colour names, shape names, animals and the sounds
   they make, letter sounds ("A is for apple"), counting out
   loud to ten, and first words — every word is shown big AND
   said out loud.

   The words are spoken with the browser's own voice (the same
   way Mad Libs reads its stories) so the game needs no audio
   files and works offline the moment the page is cached. The
   🔊 button turns it off. Notes come from a pentatonic scale,
   so however wildly a baby bashes, it always sounds nice — and
   every sound goes through one compressor so a ten-finger palm
   smash can never blast out of the speaker.
   =========================================================== */
(function () {
  "use strict";

  const SAVE_KEY = "baby-taps.v1";
  const MAX_THINGS = 6;
  const MODES = ["shapes", "animals", "letters", "numbers", "mix"];

  /* ---------------- what can appear ---------------- */
  // `hex` is the big bright fill; `ink` is the darker version used for
  // letters, numerals and dots so text always has readable contrast.
  const COLORS = [
    { name: "red",    hex: "#ff4d4d", ink: "#d62b2b" },
    { name: "orange", hex: "#ff9f1c", ink: "#c56a00" },
    { name: "yellow", hex: "#f0b429", ink: "#a9760a" },
    { name: "green",  hex: "#2fc46f", ink: "#17864a" },
    { name: "blue",   hex: "#38b6ff", ink: "#0b6f9e" },
    { name: "purple", hex: "#8a5cff", ink: "#6b3fd6" },
    { name: "pink",   hex: "#ff5d8f", ink: "#d62f63" },
    { name: "brown",  hex: "#a2703f", ink: "#7a4f24" }
  ];

  // Shapes are drawn as SVG so they stay crisp and huge.
  const SHAPES = {
    circle:    function (c) { return '<circle cx="60" cy="60" r="54" fill="' + c + '"/>'; },
    square:    function (c) { return '<rect x="8" y="8" width="104" height="104" rx="14" fill="' + c + '"/>'; },
    rectangle: function (c) { return '<rect x="4" y="26" width="112" height="68" rx="12" fill="' + c + '"/>'; },
    triangle:  function (c) { return '<polygon points="60,8 114,110 6,110" fill="' + c + '"/>'; },
    star:      function (c) { return '<polygon fill="' + c + '" points="60,6 74,45 116,45 82,70 95,110 60,86 25,110 38,70 4,45 46,45"/>'; },
    heart:     function (c) { return '<path fill="' + c + '" d="M60 110C20 82 8 62 8 44a30 30 0 0 1 52-20 30 30 0 0 1 52 20c0 18-12 38-52 66z"/>'; },
    oval:      function (c) { return '<ellipse cx="60" cy="60" rx="55" ry="38" fill="' + c + '"/>'; },
    diamond:   function (c) { return '<polygon points="60,4 116,60 60,116 4,60" fill="' + c + '"/>'; },
    hexagon:   function (c) { return '<polygon points="60,6 110,33 110,87 60,114 10,87 10,33" fill="' + c + '"/>'; },
    moon:      function (c) { return '<path fill="' + c + '" d="M78 8a56 56 0 1 0 0 104 44 44 0 0 1 0-104z"/>'; }
  };
  const SHAPE_NAMES = Object.keys(SHAPES);

  const ANIMALS = [
    { face: "🐮", name: "cow",      says: "Moo!" },
    { face: "🐶", name: "dog",      says: "Woof woof!" },
    { face: "🐱", name: "cat",      says: "Meow!" },
    { face: "🐤", name: "chick",    says: "Cheep cheep!" },
    { face: "🐸", name: "frog",     says: "Ribbit!" },
    { face: "🐷", name: "pig",      says: "Oink oink!" },
    { face: "🐘", name: "elephant", says: "Toot!" },
    { face: "🦁", name: "lion",     says: "Roar!" },
    { face: "🐑", name: "sheep",    says: "Baa!" },
    { face: "🦆", name: "duck",     says: "Quack quack!" },
    { face: "🐝", name: "bee",      says: "Buzzzz!" },
    { face: "🐴", name: "horse",    says: "Neigh!" },
    { face: "🐵", name: "monkey",   says: "Ooh ooh ah ah!" },
    { face: "🦉", name: "owl",      says: "Hoot hoot!" },
    { face: "🐭", name: "mouse",    says: "Squeak!" },
    { face: "🐍", name: "snake",    says: "Hissss!" },
    { face: "🐻", name: "bear",     says: "Grrr!" },
    { face: "🐓", name: "rooster",  says: "Cock a doodle doo!" },
    { face: "🐐", name: "goat",     says: "Maa!" },
    { face: "🐺", name: "wolf",     says: "Awoooo!" },
    { face: "🐬", name: "dolphin",  says: "Eee eee!" },
    { face: "🐧", name: "penguin",  says: "Squawk!" },
    { face: "🐯", name: "tiger",    says: "Rawr!" },
    { face: "🐢", name: "turtle",   says: "Slow and steady!" }
  ];

  // A–Z. Each letter shows its capital AND its little letter, plus a
  // picture word that really does start with that sound.
  const LETTERS = [
    ["a", "apple", "🍎"], ["b", "ball", "⚽"], ["c", "cat", "🐱"], ["d", "dog", "🐶"],
    ["e", "egg", "🥚"], ["f", "fish", "🐟"], ["g", "goat", "🐐"], ["h", "hat", "👒"],
    ["i", "ice cream", "🍦"], ["j", "juice", "🧃"], ["k", "key", "🔑"], ["l", "lion", "🦁"],
    ["m", "moon", "🌙"], ["n", "nose", "👃"], ["o", "orange", "🍊"], ["p", "pig", "🐷"],
    ["q", "queen", "👑"], ["r", "rainbow", "🌈"], ["s", "sun", "☀️"], ["t", "tree", "🌳"],
    ["u", "umbrella", "☂️"], ["v", "van", "🚐"], ["w", "whale", "🐳"], ["x", "fox", "🦊"],
    ["y", "yo-yo", "🪀"], ["z", "zebra", "🦓"]
  ];
  const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five",
                        "six", "seven", "eight", "nine", "ten"];

  /* ---------------- saved bits ---------------- */
  let save = { pops: 0, mode: "shapes", voice: true, found: {} };
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (raw && typeof raw === "object") save = Object.assign(save, raw);
  } catch (e) { /* first visit */ }
  // sanity-check anything that came out of storage — a corrupt save must
  // never be able to give a baby a blank screen.
  if (typeof save.pops !== "number" || !isFinite(save.pops) || save.pops < 0) save.pops = 0;
  save.pops = Math.floor(save.pops);
  if (MODES.indexOf(save.mode) === -1) save.mode = "shapes";
  save.voice = save.voice !== false;
  if (!save.found || typeof save.found !== "object") save.found = {};

  let persistT = null;
  function persist() {
    // batched: a ten-finger smash shouldn't hit localStorage ten times
    if (persistT) return;
    persistT = setTimeout(function () {
      persistT = null;
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
    }, 120);
  }
  function persistNow() {
    clearTimeout(persistT); persistT = null;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
  }

  const el = {
    pit: document.getElementById("pit"),
    word: document.getElementById("word"),
    count: document.getElementById("count"),
    found: document.getElementById("found"),
    cheer: document.getElementById("cheer"),
    bar: document.getElementById("grown-ups"),
    voiceBtn: document.getElementById("voice-btn"),
    exit: document.getElementById("exit-link")
  };

  const rmq = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduce = !!(rmq && rmq.matches);
  if (rmq && rmq.addEventListener) {
    rmq.addEventListener("change", function (e) { reduce = e.matches; });
  }

  /* =========================================================
     SOUND — a pentatonic scale, so any bashing sounds musical.
     Everything runs through one gain + compressor, so however
     many fingers land at once it stays gentle.
     ========================================================= */
  const SCALE = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 784.00];
  let ctx = null, master = null, voices = 0;

  function audio() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!ctx) {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.5;
        let out = master;
        if (ctx.createDynamicsCompressor) {
          const comp = ctx.createDynamicsCompressor();
          comp.threshold.value = -18;
          comp.ratio.value = 12;
          master.connect(comp);
          out = comp;
        }
        out.connect(ctx.destination);
      }
      if (ctx.state === "suspended" && ctx.resume) ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }

  function tone(freq, opt) {
    const c = audio();
    if (!c || !master) return;
    if (voices > 10) return;            // palm-mash guard
    opt = opt || {};
    try {
      const t = c.currentTime + (opt.delay || 0);
      const dur = opt.dur || 0.5;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = opt.type || "sine";
      o.frequency.setValueAtTime(freq, t);
      if (opt.glide) o.frequency.exponentialRampToValueAtTime(Math.max(40, opt.glide), t + dur * 0.9);
      o.connect(g); g.connect(master);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(opt.gain || 0.18, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t); o.stop(t + dur + 0.05);
      voices++;
      o.onended = function () { voices = Math.max(0, voices - 1); };
    } catch (e) { /* silent is fine */ }
  }

  // Kinds get their own voice so a baby hears the difference:
  // shapes ring, animals hum low, letters chime bright, numbers
  // climb the scale (1 is low, 10 is high — counting you can hear).
  function popSound(kind, step, value) {
    if (kind === "number" && value) {
      tone(196 * Math.pow(2, (value - 1) / 7), { type: "triangle", dur: 0.6, gain: 0.2 });
      return;
    }
    const f = SCALE[step % SCALE.length];
    if (kind === "animal") tone(f / 2, { type: "sawtooth", dur: 0.45, gain: 0.1, glide: f / 2.4 });
    else if (kind === "letter") tone(f * 2, { type: "triangle", dur: 0.45, gain: 0.13 });
    else tone(f, { type: "sine", dur: 0.5, gain: 0.18 });
    tone(f * 1.5, { type: "sine", dur: 0.3, gain: 0.06, delay: 0.04 });
  }
  function tapSound(step) {
    tone(SCALE[step % SCALE.length] * 2, { type: "sine", dur: 0.22, gain: 0.07 });
  }
  function chime() {
    [0, 2, 4, 7].forEach(function (n, i) {
      tone(523.25 * Math.pow(2, n / 12), { type: "triangle", dur: 0.5, gain: 0.12, delay: i * 0.09 });
    });
  }
  function fanfare() {
    [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
      tone(f, { type: "sine", dur: 0.6, gain: 0.16, delay: i * 0.13 });
    });
  }

  /* ---- speaking ---- */
  let lastSaid = 0, preferredVoice = null, voicePicked = false;
  function pickVoice() {
    if (voicePicked) return preferredVoice;
    try {
      const list = speechSynthesis.getVoices() || [];
      if (!list.length) return null;      // try again on the next tap
      voicePicked = true;
      const en = list.filter(function (v) { return /^en/i.test(v.lang || ""); });
      const nice = en.filter(function (v) { return /female|samantha|karen|zira|google us/i.test(v.name || ""); });
      preferredVoice = nice[0] || en[0] || null;
    } catch (e) { voicePicked = true; }
    return preferredVoice;
  }

  function say(text) {
    if (!save.voice || !text) return;
    try {
      if (!window.speechSynthesis) return;
      const now = Date.now();
      // A baby mashes faster than anyone can talk. Cutting every word off
      // mid-syllable just makes noise, so ignore requests that arrive on
      // top of one we only just started.
      if (now - lastSaid < 320) return;
      lastSaid = now;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const v = pickVoice();
      if (v) u.voice = v;
      u.rate = 0.85;
      u.pitch = 1.15;
      u.volume = 1;
      speechSynthesis.speak(u);
    } catch (e) { /* no voice on this device — the word is still on screen */ }
  }

  /* =========================================================
     THINGS IN THE PIT
     ========================================================= */
  let noteStep = 0;

  function pitSize() {
    const r = el.pit.getBoundingClientRect();
    return { w: Math.max(1, r.width), h: Math.max(1, r.height) };
  }

  // Targets scale with the room available so they are always as big as
  // they can be without overlapping — never smaller than a baby's palm.
  function thingSize(size) {
    const fit = Math.sqrt((size.w * size.h) / (MAX_THINGS * 2.9));
    let d = Math.min(200, Math.max(96, fit));
    d = Math.min(d, Math.max(96, Math.min(size.w, size.h) * 0.82));
    return Math.round(d);
  }

  // Pick a spot that doesn't sit on top of another thing, so every shape
  // is its own clear target. Falls back to "anywhere" if the pit is full.
  function freeSpot(d, size) {
    const taken = [];
    el.pit.querySelectorAll(".thing:not(.gone)").forEach(function (t) {
      taken.push({ x: parseFloat(t.style.left) || 0, y: parseFloat(t.style.top) || 0, d: t.offsetWidth || d });
    });
    const maxX = Math.max(0, size.w - d - 8);
    const maxY = Math.max(0, size.h - d - 8);
    let best = null, bestGap = -Infinity;
    for (let i = 0; i < 30; i++) {
      const x = Math.round(Math.random() * maxX) + 4;
      const y = Math.round(Math.random() * maxY) + 4;
      let gap = Infinity;
      taken.forEach(function (t) {
        const dx = (x + d / 2) - (t.x + t.d / 2);
        const dy = (y + d / 2) - (t.y + t.d / 2);
        gap = Math.min(gap, Math.sqrt(dx * dx + dy * dy) - (d + t.d) / 2);
      });
      if (gap > bestGap) { bestGap = gap; best = { x: x, y: y }; }
      if (gap > 8) break;               // clear of everything — good enough
    }
    return best || { x: 4, y: 4 };
  }

  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  function buildShape(b, d) {
    const c = pick(COLORS);
    const s = pick(SHAPE_NAMES);
    b.dataset.kind = "shape";
    b.dataset.word = c.name + " " + s;
    b.dataset.say = c.name + " " + s;
    b.dataset.show = c.name + " " + s + "!";
    b.setAttribute("aria-label", c.name + " " + s);
    b.innerHTML = '<svg viewBox="0 0 120 120" width="' + d + '" height="' + d + '" aria-hidden="true">' +
      SHAPES[s](c.hex) + "</svg>";
  }

  function buildAnimal(b, d) {
    const a = pick(ANIMALS);
    b.dataset.kind = "animal";
    b.dataset.word = a.name;
    b.dataset.say = a.name + ". " + a.says;
    b.dataset.show = a.face + " " + a.name + "! " + a.says;
    b.setAttribute("aria-label", a.name + ", " + a.says);
    const span = document.createElement("span");
    span.className = "face";
    span.style.fontSize = Math.round(d * 0.7) + "px";
    span.textContent = a.face;
    b.appendChild(span);
  }

  function buildLetter(b, d) {
    const L = pick(LETTERS);
    const big = L[0].toUpperCase();
    b.dataset.kind = "letter";
    b.dataset.word = L[0] + " " + L[1];
    b.dataset.say = big + ". " + big + " is for " + L[1] + ".";
    b.dataset.show = big + " is for " + L[1] + " " + L[2];
    b.setAttribute("aria-label", "letter " + big + ", " + big + " is for " + L[1]);
    const c = COLORS[LETTERS.indexOf(L) % COLORS.length];
    b.classList.add("plate");
    b.style.setProperty("--plate", c.hex);
    const g = document.createElement("span");
    g.className = "glyph";
    g.style.fontSize = Math.round(d * 0.4) + "px";
    g.style.color = c.ink;
    g.textContent = big + L[0];
    const s = document.createElement("span");
    s.className = "sub";
    s.style.fontSize = Math.round(d * 0.3) + "px";
    s.textContent = L[2];
    b.appendChild(g);
    b.appendChild(s);
  }

  function buildNumber(b, d) {
    const n = 1 + Math.floor(Math.random() * 10);
    const word = NUMBER_WORDS[n];
    const c = COLORS[(n - 1) % COLORS.length];
    b.dataset.kind = "number";
    b.dataset.value = String(n);
    b.dataset.word = word;
    // counting out loud: the number, then every one of them
    b.dataset.say = word + ". " + NUMBER_WORDS.slice(1, n + 1).join(", ") + ".";
    b.dataset.show = n + " = " + word + "!";
    b.setAttribute("aria-label", word + ", " + n + " dots");
    b.classList.add("plate");
    b.style.setProperty("--plate", c.hex);
    const g = document.createElement("span");
    g.className = "glyph";
    g.style.fontSize = Math.round(d * 0.4) + "px";
    g.style.color = c.ink;
    g.textContent = String(n);
    b.appendChild(g);
    // the dots always come in rows of five, so 7 reads as 5 + 2 —
    // the same way little fingers count them
    const dot = Math.max(6, Math.round(d * 0.1));
    const gap = Math.max(3, Math.round(d * 0.03));
    const pips = document.createElement("span");
    pips.className = "pips";
    pips.style.width = (dot * 5 + gap * 5) + "px";
    pips.style.gap = gap + "px";
    pips.style.color = c.ink;
    for (let i = 0; i < n; i++) {
      const p = document.createElement("i");
      p.style.width = dot + "px";
      p.style.height = dot + "px";
      pips.appendChild(p);
    }
    b.appendChild(pips);
  }

  const BUILDERS = { shapes: buildShape, animals: buildAnimal, letters: buildLetter, numbers: buildNumber };

  function makeThing() {
    const size = pitSize();
    const d = thingSize(size);
    const mode = save.mode === "mix"
      ? pick(["shapes", "animals", "letters", "numbers"])
      : save.mode;

    const b = document.createElement("button");
    b.type = "button";
    b.className = "thing" + (reduce ? "" : " bob");
    b.style.width = d + "px";
    b.style.height = d + "px";
    const spot = freeSpot(d, size);
    b.style.left = spot.x + "px";
    b.style.top = spot.y + "px";
    b.style.animationDelay = "0s, " + (Math.random() * 2).toFixed(2) + "s";   // stagger the glow

    (BUILDERS[mode] || buildShape)(b, d);

    // Once in a while one arrives wearing a golden glow. Popping it
    // showers confetti — a small surprise to keep the game interesting.
    if (Math.random() < 0.05) {
      b.classList.add("special");
      b.dataset.special = "1";
    }

    el.pit.appendChild(b);
    return b;
  }

  function fill() {
    try {
      let guard = 0;
      while (el.pit.querySelectorAll(".thing:not(.gone)").length < MAX_THINGS && guard++ < MAX_THINGS + 2) {
        makeThing();
      }
    } catch (e) {
      // never leave a baby staring at an empty pit
      try { el.pit.appendChild(document.createTextNode("")); } catch (e2) {}
    }
  }

  function sparkle(x, y, glyph, n) {
    if (el.pit.querySelectorAll(".spark").length > 70) return;   // mash guard
    const count = n || (reduce ? 2 : 6);
    const glyphs = ["✨", "⭐", "🌟", "💫"];
    for (let i = 0; i < count; i++) {
      const s = document.createElement("span");
      s.className = "spark";
      s.textContent = glyph || glyphs[i % glyphs.length];
      s.style.left = x + "px";
      s.style.top = y + "px";
      s.style.setProperty("--dx", Math.round((Math.random() - 0.5) * 140) + "px");
      s.style.setProperty("--dy", Math.round((Math.random() - 0.7) * 140) + "px");
      el.pit.appendChild(s);
      setTimeout(function () { s.remove(); }, 750);
    }
  }

  let cheerT = null;
  function cheer(text) {
    if (!el.cheer) return;
    el.cheer.textContent = text;
    el.cheer.classList.remove("show");
    void el.cheer.offsetWidth;          // restart the animation
    el.cheer.classList.add("show");
    clearTimeout(cheerT);
    cheerT = setTimeout(function () { el.cheer.classList.remove("show"); }, 2100);
  }

  function foundCount() { return Object.keys(save.found).length; }
  function drawTallies() {
    el.count.textContent = save.pops + (save.pops === 1 ? " pop" : " pops");
    el.found.textContent = "🏅 " + foundCount() + " found";
  }

  function popThing(thing, x, y) {
    if (!thing || thing.classList.contains("gone")) return;
    thing.classList.add("gone");

    const kind = thing.dataset.kind || "shape";
    const value = parseInt(thing.dataset.value || "0", 10);
    popSound(kind, noteStep++, value);
    say(thing.dataset.say);

    const special = thing.dataset.special === "1";
    el.word.textContent = (special ? "✨ " : "") + thing.dataset.show;
    sparkle(x, y, null, special && !reduce ? 10 : undefined);

    save.pops++;

    // "Found" is the quiet collection underneath: every different shape,
    // colour, animal, letter and number a kid discovers is remembered.
    const key = kind + ":" + (thing.dataset.word || "?");
    let isNew = false;
    if (!save.found[key]) { save.found[key] = 1; isNew = true; }
    persist();
    drawTallies();

    if (special) {
      chime();
      if (window.Confetti && !reduce) Confetti.burst({ count: 50 });
    } else if (isNew) {
      sparkle(x, y, "🏅", 2);
    }

    if (save.pops % 10 === 0) {
      cheer("🌈 " + save.pops + " pops!");
      fanfare();
      if (window.Confetti && !reduce) Confetti.burst({ count: 60 });
    } else if (isNew && foundCount() % 10 === 0) {
      cheer("🏅 " + foundCount() + " things found!");
      chime();
    }

    setTimeout(function () { thing.remove(); fill(); }, 420);
  }

  /* =========================================================
     TAPS — a thing pops; the background still sparkles.
     Every finger of a palm-mash is its own pointer event, and
     nothing here depends on a pointerup, so a tap can never
     get "stuck" half-done.
     ========================================================= */
  function local(e, fallbackEl) {
    const r = el.pit.getBoundingClientRect();
    const p = (e.touches && e.touches[0]) || e;
    if (typeof p.clientX === "number" && (p.clientX !== 0 || p.clientY !== 0)) {
      return { x: p.clientX - r.left, y: p.clientY - r.top };
    }
    // keyboard / assistive activation: aim at the middle of the thing
    if (fallbackEl) {
      const b = fallbackEl.getBoundingClientRect();
      return { x: b.left + b.width / 2 - r.left, y: b.top + b.height / 2 - r.top };
    }
    return { x: r.width / 2, y: r.height / 2 };
  }

  function handle(e) {
    const thing = e.target && e.target.closest ? e.target.closest(".thing") : null;
    const at = local(e, thing);
    if (thing) {
      thing.classList.add("press");
      popThing(thing, at.x, at.y);
    } else {
      tapSound(noteStep++);
      sparkle(at.x, at.y, "✨", reduce ? 2 : 4);
    }
  }

  let lastPointer = 0;
  el.pit.addEventListener("pointerdown", function (e) {
    lastPointer = Date.now();
    if (e.pointerType !== "mouse") e.preventDefault();
    handle(e);
  }, { passive: false });
  // keyboard / assistive activation (and any click without a pointerdown)
  el.pit.addEventListener("click", function (e) {
    if (Date.now() - lastPointer < 700) return;
    handle(e);
  });
  // belt and braces: never let the browser show a text-selection or
  // long-press menu over the play area
  el.pit.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  el.pit.addEventListener("dragstart", function (e) { e.preventDefault(); });

  /* =========================================================
     THE GROWN-UP STRIP
     ========================================================= */
  el.bar.addEventListener("click", function (e) {
    const b = e.target.closest(".mode-btn");
    if (!b) return;
    if (b === el.voiceBtn) {
      save.voice = !save.voice;
      persistNow();
      drawVoiceBtn();
      if (!save.voice && window.speechSynthesis) { try { speechSynthesis.cancel(); } catch (err) {} }
      else say("Words on!");
      return;
    }
    if (!b.dataset.mode || save.mode === b.dataset.mode) return;
    save.mode = b.dataset.mode;
    persistNow();
    applyMode();
    el.pit.querySelectorAll(".thing, .spark").forEach(function (t) { t.remove(); });
    fill();
  });

  function drawVoiceBtn() {
    el.voiceBtn.setAttribute("aria-pressed", String(save.voice));
    el.voiceBtn.textContent = save.voice ? "🔊 Words" : "🔇 Quiet";
  }

  function applyMode() {
    el.bar.querySelectorAll(".mode-btn[data-mode]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.mode === save.mode));
    });
  }

  /* ---- press-and-hold to leave (a baby's palm can't do this) ---- */
  (function () {
    if (!el.exit) return;
    let holdT = null, done = false;
    function start(e) {
      if (e && e.button > 0) return;
      done = false;
      el.exit.classList.add("holding");
      clearTimeout(holdT);
      holdT = setTimeout(function () {
        done = true;
        el.exit.classList.remove("holding");
        window.location.href = el.exit.getAttribute("href");
      }, 1100);
    }
    function stop() {
      clearTimeout(holdT);
      holdT = null;
      el.exit.classList.remove("holding");
    }
    el.exit.addEventListener("pointerdown", start);
    el.exit.addEventListener("pointerup", stop);
    el.exit.addEventListener("pointercancel", stop);
    el.exit.addEventListener("pointerleave", stop);
    el.exit.addEventListener("click", function (e) {
      // A real keyboard activation (Enter/Space) has no pointer behind it —
      // let that through so the page stays reachable without a mouse.
      if (e.detail === 0 || done) return;
      e.preventDefault();
      cheer("Hold the button 🔒");
    });
  })();

  /* =========================================================
     KEEPING THE PIT TIDY
     ========================================================= */
  // Only rebuild when the pit really changed size (a phone hiding its
  // address bar fires resize constantly — that must not yank the
  // shapes out from under a baby's finger).
  let lastBox = { w: 0, h: 0 };
  function clampAll(size) {
    el.pit.querySelectorAll(".thing").forEach(function (t) {
      const d = t.offsetWidth || 96;
      const x = Math.min(Math.max(4, parseFloat(t.style.left) || 0), Math.max(4, size.w - d - 4));
      const y = Math.min(Math.max(4, parseFloat(t.style.top) || 0), Math.max(4, size.h - d - 4));
      t.style.left = x + "px";
      t.style.top = y + "px";
    });
  }
  let resizeT = null;
  function onResize() {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () {
      const s = pitSize();
      if (Math.abs(s.w - lastBox.w) < 32 && Math.abs(s.h - lastBox.h) < 32) {
        clampAll(s);
        return;
      }
      lastBox = s;
      el.pit.querySelectorAll(".thing, .spark").forEach(function (t) { t.remove(); });
      fill();
    }, 250);
  }
  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", onResize);

  // hush the voice if the game goes into the background, and make sure
  // the tally is written down before the tab is closed
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
      persistNow();
    }
  });
  window.addEventListener("pagehide", persistNow);

  if (window.speechSynthesis && "onvoiceschanged" in speechSynthesis) {
    speechSynthesis.onvoiceschanged = function () { voicePicked = false; pickVoice(); };
  }

  applyMode();
  drawVoiceBtn();
  drawTallies();
  lastBox = pitSize();
  fill();
})();
