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

   What it teaches: cause and effect (I tap → something
   happens), colour names, shape names, animals and the sounds
   they make, and first words — the word is shown big and said
   out loud.

   The words are spoken with the browser's own voice (the same
   way Mad Libs reads its stories) so the game needs no audio
   files and works offline the moment the page is cached. The
   🔊 button turns it off. Notes come from a pentatonic scale,
   so however wildly a baby bashes, it always sounds nice.
   =========================================================== */
(function () {
  "use strict";

  const SAVE_KEY = "baby-taps.v1";
  const MAX_THINGS = 6;

  /* ---------------- what can appear ---------------- */
  const COLORS = [
    { name: "red", hex: "#ff4d4d" },
    { name: "orange", hex: "#ff9f1c" },
    { name: "yellow", hex: "#ffd166" },
    { name: "green", hex: "#3ddc84" },
    { name: "blue", hex: "#38b6ff" },
    { name: "purple", hex: "#8a5cff" },
    { name: "pink", hex: "#ff5d8f" }
  ];

  // Shapes are drawn as SVG so they stay crisp and huge.
  const SHAPES = {
    circle:   function (c) { return '<circle cx="60" cy="60" r="54" fill="' + c + '"/>'; },
    square:   function (c) { return '<rect x="8" y="8" width="104" height="104" rx="14" fill="' + c + '"/>'; },
    triangle: function (c) { return '<polygon points="60,8 114,110 6,110" fill="' + c + '"/>'; },
    star:     function (c) { return '<polygon fill="' + c + '" points="60,6 74,45 116,45 82,70 95,110 60,86 25,110 38,70 4,45 46,45"/>'; },
    heart:    function (c) { return '<path fill="' + c + '" d="M60 110C20 82 8 62 8 44a30 30 0 0 1 52-20 30 30 0 0 1 52 20c0 18-12 38-52 66z"/>'; }
  };
  const SHAPE_NAMES = Object.keys(SHAPES);

  const ANIMALS = [
    { face: "🐮", name: "cow",   says: "Moo!" },
    { face: "🐶", name: "dog",   says: "Woof!" },
    { face: "🐱", name: "cat",   says: "Meow!" },
    { face: "🐤", name: "chick", says: "Cheep!" },
    { face: "🐸", name: "frog",  says: "Ribbit!" },
    { face: "🐷", name: "pig",   says: "Oink!" },
    { face: "🐘", name: "elephant", says: "Toot!" },
    { face: "🦁", name: "lion",  says: "Roar!" },
    { face: "🐑", name: "sheep", says: "Baa!" },
    { face: "🦆", name: "duck",  says: "Quack!" },
    { face: "🐝", name: "bee",   says: "Buzz!" },
    { face: "🐴", name: "horse", says: "Neigh!" }
  ];

  /* ---------------- saved bits ---------------- */
  let save = { pops: 0, mode: "shapes", voice: true };
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (raw && typeof raw === "object") save = Object.assign(save, raw);
  } catch (e) { /* first visit */ }
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
  }

  const el = {
    pit: document.getElementById("pit"),
    word: document.getElementById("word"),
    count: document.getElementById("count"),
    bar: document.getElementById("grown-ups"),
    voiceBtn: document.getElementById("voice-btn")
  };

  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* =========================================================
     SOUND — a pentatonic scale, so any bashing sounds musical
     ========================================================= */
  const SCALE = [261.63, 293.66, 349.23, 392.00, 440.00, 523.25, 587.33, 698.46];
  let ctx = null;

  function blip(i) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!ctx) ctx = new AC();
      if (ctx.state === "suspended" && ctx.resume) ctx.resume();
      const f = SCALE[i % SCALE.length];
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.2, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.start(t); o.stop(t + 0.55);
    } catch (e) { /* silent is fine */ }
  }

  function say(text) {
    if (!save.voice) return;
    try {
      if (!window.speechSynthesis) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.85;
      u.pitch = 1.15;
      speechSynthesis.speak(u);
    } catch (e) { /* no voice on this device — the word is still on screen */ }
  }

  /* =========================================================
     THINGS IN THE PIT
     ========================================================= */
  let noteStep = 0;

  function pitSize() {
    const r = el.pit.getBoundingClientRect();
    return { w: r.width, h: r.height };
  }

  // Pick a spot that doesn't sit on top of another thing, so every shape
  // is its own clear target. Falls back to "anywhere" if the pit is full.
  function freeSpot(d, size) {
    const taken = [];
    el.pit.querySelectorAll(".thing:not(.gone)").forEach(function (t) {
      taken.push({ x: parseFloat(t.style.left) || 0, y: parseFloat(t.style.top) || 0, d: t.offsetWidth || d });
    });
    const maxX = Math.max(1, size.w - d - 8);
    const maxY = Math.max(1, size.h - d - 8);
    let best = null, bestGap = -1;
    for (let i = 0; i < 24; i++) {
      const x = Math.round(Math.random() * maxX);
      const y = Math.round(Math.random() * maxY);
      let gap = Infinity;
      taken.forEach(function (t) {
        const dx = (x + d / 2) - (t.x + t.d / 2);
        const dy = (y + d / 2) - (t.y + t.d / 2);
        gap = Math.min(gap, Math.sqrt(dx * dx + dy * dy) - (d + t.d) / 2);
      });
      if (gap > bestGap) { bestGap = gap; best = { x: x, y: y }; }
      if (gap > 8) break;               // clear of everything — good enough
    }
    return best || { x: 0, y: 0 };
  }

  function makeThing() {
    const size = pitSize();
    const mode = save.mode;
    const useAnimal = mode === "animals" || (mode === "mix" && Math.random() < 0.5);
    const d = Math.round(Math.min(150, Math.max(96, Math.min(size.w, size.h) * 0.26)));

    const b = document.createElement("button");
    b.type = "button";
    b.className = "thing" + (reduce ? "" : " bob");
    b.style.width = d + "px";
    b.style.height = d + "px";
    const spot = freeSpot(d, size);
    b.style.left = spot.x + "px";
    b.style.top = spot.y + "px";
    b.style.animationDelay = "0s, " + (Math.random() * 2).toFixed(2) + "s";   // stagger the glow

    if (useAnimal) {
      const a = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
      b.dataset.kind = "animal";
      b.dataset.word = a.name;
      b.dataset.say = a.name + ". " + a.says;
      b.dataset.show = a.face + " " + a.name + "! " + a.says;
      b.setAttribute("aria-label", a.name);
      const span = document.createElement("span");
      span.className = "face";
      span.style.fontSize = Math.round(d * 0.72) + "px";
      span.textContent = a.face;
      b.appendChild(span);
    } else {
      const c = COLORS[Math.floor(Math.random() * COLORS.length)];
      const s = SHAPE_NAMES[Math.floor(Math.random() * SHAPE_NAMES.length)];
      b.dataset.kind = "shape";
      b.dataset.word = c.name + " " + s;
      b.dataset.say = c.name + " " + s;
      b.dataset.show = c.name + " " + s + "!";
      b.setAttribute("aria-label", c.name + " " + s);
      b.innerHTML = '<svg viewBox="0 0 120 120" width="' + d + '" height="' + d + '" aria-hidden="true">' +
        SHAPES[s](c.hex) + "</svg>";
    }

    el.pit.appendChild(b);
    return b;
  }

  function fill() {
    let guard = 0;
    while (el.pit.querySelectorAll(".thing:not(.gone)").length < MAX_THINGS && guard++ < MAX_THINGS) {
      makeThing();
    }
  }

  function sparkle(x, y, glyph) {
    const n = reduce ? 2 : 6;
    for (let i = 0; i < n; i++) {
      const s = document.createElement("span");
      s.className = "spark";
      s.textContent = glyph || (["✨", "⭐", "🌟", "💫"][i % 4]);
      s.style.left = x + "px";
      s.style.top = y + "px";
      s.style.setProperty("--dx", Math.round((Math.random() - 0.5) * 140) + "px");
      s.style.setProperty("--dy", Math.round((Math.random() - 0.7) * 140) + "px");
      el.pit.appendChild(s);
      setTimeout(function () { s.remove(); }, 750);
    }
  }

  function popThing(thing, x, y) {
    if (thing.classList.contains("gone")) return;
    thing.classList.add("gone");
    blip(noteStep++);
    say(thing.dataset.say);
    el.word.textContent = thing.dataset.show;
    sparkle(x, y);

    save.pops++;
    persist();
    el.count.textContent = save.pops + (save.pops === 1 ? " pop" : " pops");

    if (save.pops % 10 === 0) {
      el.word.textContent = "🌈 " + save.pops + " pops! 🎉";
      if (window.Confetti) Confetti.burst({ count: 60 });
      say("Hooray!");
    }

    setTimeout(function () { thing.remove(); fill(); }, 420);
  }

  /* =========================================================
     TAPS — a thing pops; the background still sparkles
     ========================================================= */
  function local(e) {
    const r = el.pit.getBoundingClientRect();
    const p = e.touches && e.touches[0] ? e.touches[0] : e;
    return { x: (p.clientX || r.width / 2) - r.left, y: (p.clientY || r.height / 2) - r.top };
  }

  let lastPointer = 0;
  function handle(e) {
    const at = local(e);
    const thing = e.target.closest ? e.target.closest(".thing") : null;
    if (thing) popThing(thing, at.x, at.y);
    else { blip(noteStep++); sparkle(at.x, at.y, "✨"); }
  }

  el.pit.addEventListener("pointerdown", function (e) {
    lastPointer = Date.now();
    if (e.pointerType !== "mouse") e.preventDefault();
    handle(e);
  });
  // keyboard / assistive activation (and any click without a pointerdown)
  el.pit.addEventListener("click", function (e) {
    if (Date.now() - lastPointer < 700) return;
    handle(e);
  });

  /* =========================================================
     THE GROWN-UP STRIP
     ========================================================= */
  el.bar.addEventListener("click", function (e) {
    const b = e.target.closest(".mode-btn");
    if (!b) return;
    if (b === el.voiceBtn) {
      save.voice = !save.voice;
      persist();
      el.voiceBtn.setAttribute("aria-pressed", String(save.voice));
      el.voiceBtn.textContent = save.voice ? "🔊 Words" : "🔇 Quiet";
      if (!save.voice && window.speechSynthesis) { try { speechSynthesis.cancel(); } catch (err) {} }
      return;
    }
    save.mode = b.dataset.mode;
    persist();
    applyMode();
    el.pit.innerHTML = "";
    fill();
  });

  function applyMode() {
    el.bar.querySelectorAll(".mode-btn[data-mode]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.mode === save.mode));
    });
  }

  // keep the pit full when the screen turns or resizes
  let resizeT = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () {
      el.pit.querySelectorAll(".thing").forEach(function (t) { t.remove(); });
      fill();
    }, 250);
  });

  applyMode();
  el.voiceBtn.setAttribute("aria-pressed", String(save.voice));
  el.voiceBtn.textContent = save.voice ? "🔊 Words" : "🔇 Quiet";
  el.count.textContent = save.pops + (save.pops === 1 ? " pop" : " pops");
  fill();
})();
