/* ===========================================================
   Princess Dress-Up — answer the puzzle, earn an outfit piece.
   Built for Ellie (3): letters, numbers, counting, colours and
   shapes, wrapped in a princess she gets to dress herself.

   Pre-reader friendly:
     • every letter/number prompt is SPOKEN with the warm Piper voice
     • the colour & shape rounds are purely PICTORIAL — a big sample
       sits in the prompt and she taps the gem that matches, so no
       reading (and no narration clip) is needed
     • she can never get stuck: one miss wobbles, two misses light up
       the right gem, three misses fade the wrong ones away

   Older kids get more: 4 choices, look-alike distractors, counting
   to ten and matching CAPITAL letters to their little letters.

   Everything persists in localStorage — the star count, the mute
   setting, the half-dressed princess she left behind, and the gown
   and scene she picked.
   =========================================================== */

(function () {
  "use strict";

  var STARS_KEY = "princess.stars";   // unchanged — old star counts still load
  var MUTE_KEY  = "princess.muted";   // unchanged
  var SAVE_KEY  = "princess.save";    // new: the princess in progress

  /* ---------- outfit pieces ---------- */
  // Nine pieces exist; each princess wears six of them, so no two
  // princesses are dressed quite the same. The crown always comes first.
  var ALL_SLOTS = ["crown", "flower", "hairbow", "necklace", "gloves",
                   "bouquet", "wand", "shoes", "sparkle"];
  var SLOT_ICONS = {
    crown: "👑", flower: "🌼", hairbow: "🎀", necklace: "📿", gloves: "🧤",
    bouquet: "💐", wand: "🪄", shoes: "👠", sparkle: "✨"
  };
  var SLOT_NAMES = {
    crown: "crown", flower: "flower", hairbow: "bow", necklace: "necklace",
    gloves: "gloves", bouquet: "bouquet", wand: "wand", shoes: "shoes",
    sparkle: "sparkles"
  };
  var PIECES_PER_PRINCESS = 6;

  /* ---------- her wardrobe (grows by one gown per princess) ---------- */
  var GOWNS = [
    { name: "purple",    hex: "#9b3fc4" },
    { name: "pink",      hex: "#ff6fa5" },
    { name: "blue",      hex: "#38b6ff" },
    { name: "green",     hex: "#3ddc84" },
    { name: "sunshine",  hex: "#ffcc33" },
    { name: "red",       hex: "#ff5d5d" },
    { name: "orange",    hex: "#ff9f43" },
    { name: "teal",      hex: "#1fc8bf" },
    { name: "midnight",  hex: "#5468ff" },
    { name: "rose gold", hex: "#f4a6a0" }
  ];
  var FREE_GOWNS = 4;

  var SCENES = [
    { id: "garden",   icon: "🌷", label: "the flower garden" },
    { id: "ballroom", icon: "🏰", label: "the ballroom" },
    { id: "sunset",   icon: "🌅", label: "the sunset beach" },
    { id: "night",    icon: "🌙", label: "the starry night" }
  ];

  /* ---------- what she can be asked ---------- */
  var LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  var NUMBERS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
  var PRAISE  = ["Yay!", "Hooray!", "Wonderful!", "You did it!", "So pretty!", "Great job!"];

  var PAINTS = [
    { name: "pink",   hex: "#ff5d8f" },
    { name: "purple", hex: "#8a5cff" },
    { name: "blue",   hex: "#38b6ff" },
    { name: "green",  hex: "#3ddc84" },
    { name: "yellow", hex: "#ffd166" },
    { name: "orange", hex: "#ff8c42" },
    { name: "red",    hex: "#ff4d4d" }
  ];
  var SHAPE_NAMES = ["circle", "square", "triangle", "star", "heart", "diamond"];

  // look-alike sets: once she has a few stars, distractors get sneakier
  var SIMILAR = {
    B: ["D", "P", "R"], D: ["B", "O", "Q"], E: ["F", "B"], F: ["E", "P"],
    I: ["L", "J", "T"], J: ["I", "L"], L: ["I", "J"], M: ["N", "W"],
    N: ["M", "Z"], O: ["Q", "C", "D"], Q: ["O", "G"], P: ["B", "R"],
    R: ["P", "B"], U: ["V", "W"], V: ["U", "W", "Y"], W: ["V", "M"],
    C: ["G", "O"], G: ["C", "Q"], S: ["Z", "G"], Z: ["S", "N"],
    T: ["I", "F"], K: ["X", "H"], H: ["K", "N"], X: ["K", "Y"],
    Y: ["X", "V"], A: ["H", "V"],
    "1": ["7", "4"], "2": ["5", "3"], "3": ["8", "2"], "4": ["1", "7"],
    "5": ["2", "6"], "6": ["9", "8"], "7": ["1", "4"], "8": ["6", "3"],
    "9": ["6", "10"], "10": ["1", "9"]
  };

  // deep, jewel-bright gem colours — every one of them clears the
  // contrast bar against the big white letters sitting on top
  var GEM_COLORS = ["#d6336c", "#7048c8", "#1c7ed6", "#2b8a3e", "#b8620a", "#c2255c"];

  /* ---------- elements ---------- */
  var princessEl  = document.getElementById("princess");
  var sceneEl     = document.getElementById("scene");
  var promptLabel = document.getElementById("prompt-label");
  var targetEl    = document.getElementById("target-char");
  var sampleEl    = document.getElementById("target-sample");
  var choicesEl   = document.getElementById("choices");
  var starsEl     = document.getElementById("stars");
  var muteBtn     = document.getElementById("mute");
  var wardrobeBtn = document.getElementById("wardrobe-btn");
  var overlay     = document.getElementById("overlay");
  var overlayEmoji= document.getElementById("overlay-emoji");
  var overlayTitle= document.getElementById("overlay-title");
  var overlayText = document.getElementById("overlay-text");
  var overlayStars= document.getElementById("overlay-stars");
  var progressEl  = document.getElementById("progress");
  var wardrobeEl  = document.getElementById("wardrobe");
  var scenePickEl = document.getElementById("scene-picker");
  var startBtn    = document.getElementById("start-btn");

  /* ---------- state ---------- */
  var stars = parseInt(localStorage.getItem(STARS_KEY) || "0", 10) || 0;
  var muted = localStorage.getItem(MUTE_KEY) === "1";
  var saved = readSave();

  var slots      = Array.isArray(saved.slots) && saved.slots.length === PIECES_PER_PRINCESS
                     ? saved.slots.filter(validSlot) : null;
  if (!slots || slots.length !== PIECES_PER_PRINCESS) slots = rollSlots();
  var slotIndex  = clamp(parseInt(saved.slotIndex, 10) || 0, 0, PIECES_PER_PRINCESS);
  var gownIdx    = clamp(parseInt(saved.gown, 10) || 0, 0, GOWNS.length - 1);
  var sceneIdx   = clamp(parseInt(saved.scene, 10) || 0, 0, SCENES.length - 1);

  var round = null;
  var usedTargets = [];      // no repeated question within one princess
  var lastKind = null;
  var wrongTries = 0;
  var currentClip = null;    // the prompt clip, replayed if she goes quiet
  var idleTimer = null;
  var locked = true;         // nothing is tappable while the overlay is up
  var overlayMode = "intro";

  /* ---------- little helpers ---------- */
  function rand(n) { return Math.floor(Math.random() * n); }
  function pick(arr) { return arr[rand(arr.length)]; }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, isNaN(n) ? lo : n)); }
  function validSlot(s) { return ALL_SLOTS.indexOf(s) !== -1; }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = rand(i + 1);
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.min(255, Math.max(0, (n >> 16) + amt));
    var g = Math.min(255, Math.max(0, ((n >> 8) & 255) + amt));
    var b = Math.min(255, Math.max(0, (n & 255) + amt));
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // one mute switch for EVERYTHING — narration and the little beeps alike
  function playClip(name) {
    if (muted || !name) return;
    if (window.Voice) Voice.play("audio/" + name + ".mp3");
  }
  function sfx(which, arg) {
    if (muted || !window.SFX || !SFX[which]) return;
    try { SFX[which](arg); } catch (e) { /* ignore */ }
  }

  /* ---------- saving ---------- */
  function readSave() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      var o = raw ? JSON.parse(raw) : null;
      return (o && typeof o === "object") ? o : {};
    } catch (e) { return {}; }
  }
  function persist() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        v: 1, slots: slots, slotIndex: slotIndex, gown: gownIdx, scene: sceneIdx
      }));
    } catch (e) { /* private mode — just play on */ }
  }

  function rollSlots() {
    var rest = shuffle(ALL_SLOTS.filter(function (s) { return s !== "crown"; }));
    return ["crown"].concat(rest.slice(0, PIECES_PER_PRINCESS - 1));
  }

  /* ---------- tiny SVG picture kit (no image files anywhere) ---------- */
  function svgWrap(inner) {
    return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">' + inner + "</svg>";
  }
  function starD() {
    var d = [], n = 5, R = 44, r = 18, cx = 50, cy = 52;
    for (var i = 0; i < n * 2; i++) {
      var rad = (i % 2 === 0) ? R : r;
      var a = Math.PI * i / n - Math.PI / 2;
      d.push((i ? "L " : "M ") + (cx + rad * Math.cos(a)).toFixed(1) + " " + (cy + rad * Math.sin(a)).toFixed(1));
    }
    return d.join(" ") + " Z";
  }
  var SHAPE_D = {
    circle:   'M 50 8 A 42 42 0 1 1 49.9 8 Z',
    square:   'M 12 12 H 88 V 88 H 12 Z',
    triangle: 'M 50 9 L 92 85 L 8 85 Z',
    star:     starD(),
    heart:    'M 50 89 C 8 62 6 29 27 19 C 39 13 50 21 50 33 C 50 21 61 13 73 19 C 94 29 92 62 50 89 Z',
    diamond:  'M 50 7 L 91 50 L 50 93 L 9 50 Z'
  };
  function shapePic(name, fill) {
    return svgWrap('<path d="' + SHAPE_D[name] + '" fill="' + fill + '" stroke="' +
      shade(fill, -55) + '" stroke-width="4" stroke-linejoin="round"/>');
  }
  // a little gown silhouette — the colour rounds are "match the dress"
  function gownPic(hex) {
    return svgWrap(
      '<path d="M 50 11 C 42 11 38 17 38 25 L 30 44 C 20 59 14 75 12 90 L 88 90 ' +
      'C 86 75 80 59 70 44 L 62 25 C 62 17 58 11 50 11 Z" fill="' + hex +
      '" stroke="' + shade(hex, -60) + '" stroke-width="4" stroke-linejoin="round"/>' +
      '<path d="M 33 40 Q 50 50 67 40" fill="none" stroke="' + shade(hex, 70) +
      '" stroke-width="5" stroke-linecap="round"/>'
    );
  }

  /* ---------- outfit progress row ---------- */
  var progressItems = [];
  function buildProgress() {
    progressEl.innerHTML = "";
    progressItems = [];
    slots.forEach(function (slot) {
      var it = document.createElement("span");
      it.className = "op-item";
      it.textContent = SLOT_ICONS[slot] || "✨";
      it.title = SLOT_NAMES[slot] || slot;
      it.setAttribute("aria-hidden", "true");
      progressEl.appendChild(it);
      progressItems.push(it);
    });
    updateProgress();
  }
  function updateProgress() {
    progressItems.forEach(function (it, i) { it.classList.toggle("done", i < slotIndex); });
    progressEl.setAttribute("aria-label",
      slotIndex + " of " + slots.length + " outfit pieces earned");
  }

  /* ---------- praise word popping up over the princess ---------- */
  function showPraise(text) {
    var p = document.createElement("span");
    p.className = "praise-pop";
    p.textContent = text;
    princessEl.appendChild(p);
    setTimeout(function () { p.remove(); }, 950);
  }

  /* ---------- idle nudge: repeat the prompt if she's gone quiet ---------- */
  function armIdleNudge() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      if (locked || !overlay.classList.contains("hidden")) return;
      playClip(currentClip);
      wiggleTarget();
      armIdleNudge();
    }, 10000);
  }
  function wiggleTarget() {
    [targetEl, sampleEl].forEach(function (n) {
      n.classList.remove("nudge");
      void n.offsetWidth;
      n.classList.add("nudge");
    });
  }

  /* ---------- difficulty ramp ---------- */
  function choiceCount() { return stars >= 3 ? 4 : 3; }
  function trickyMode() { return stars >= 5; }
  function kindsForStars() {
    var k = ["letter", "number", "color", "shape"];
    if (stars >= 2) k.push("count");
    if (stars >= 5) k.push("lower");
    return k;
  }

  /* ---------- question builders ---------- */
  function freshPick(pool, tag) {
    var guard = 0, t;
    do { t = pick(pool); } while (usedTargets.indexOf(tag + t) !== -1 && guard++ < 60);
    usedTargets.push(tag + t);
    return t;
  }

  function glyphDistractors(pool, target, howMany) {
    var out = [];
    if (trickyMode() && SIMILAR[target]) {
      SIMILAR[target].forEach(function (d) {
        if (out.length < howMany && pool.indexOf(d) !== -1 && d !== target) out.push(d);
      });
    }
    var guard = 0;
    while (out.length < howMany && guard++ < 80) {
      var d = pick(pool);
      if (d !== target && out.indexOf(d) === -1) out.push(d);
    }
    return out.slice(0, howMany);
  }

  function buildGlyph(kind) {
    var lower = (kind === "lower");
    var letters = (kind !== "number");
    var pool = letters ? LETTERS : NUMBERS;
    var t = freshPick(pool, letters ? "L" : "N");
    var all = shuffle([t].concat(glyphDistractors(pool, t, choiceCount() - 1)));
    return {
      label: lower ? "Find the little letter:" : (letters ? "Find the letter:" : "Find the number:"),
      clip: (letters ? "find-letter-" : "find-number-") + t.toLowerCase(),
      charText: t,
      choices: all.map(function (c) {
        return {
          key: c,
          text: lower ? c.toLowerCase() : c,
          aria: (letters ? "letter " : "number ") + (lower ? c.toLowerCase() : c)
        };
      }),
      correct: t
    };
  }

  // counting: she HEARS "find the number five", then counts the dots
  function buildCount() {
    var max = trickyMode() ? 10 : 6;
    var t = freshPick(NUMBERS.slice(0, max), "C");
    var n = parseInt(t, 10);
    var near = [n - 1, n + 1, n - 2, n + 2, n + 3, n - 3].filter(function (v) {
      return v >= 1 && v <= max && v !== n;
    });
    var ds = shuffle(near).slice(0, choiceCount() - 1);
    var all = shuffle([n].concat(ds));
    return {
      label: "Count the dots! Find:",
      clip: "find-number-" + t,
      charText: t,
      choices: all.map(function (v) {
        return { key: String(v), dots: v, aria: v + (v === 1 ? " dot" : " dots") };
      }),
      correct: String(n)
    };
  }

  // colours: no words needed — a gown in the prompt, gowns on the gems
  function buildColor() {
    var t = PAINTS[rand(PAINTS.length)];
    var ds = shuffle(PAINTS.filter(function (p) { return p.name !== t.name; })).slice(0, choiceCount() - 1);
    var all = shuffle([t].concat(ds));
    return {
      label: "Tap the same colour:",
      clip: null,
      charText: t.name,
      charIsWord: true,
      sample: gownPic(t.hex),
      choices: all.map(function (p) {
        return { key: p.name, svg: gownPic(p.hex), aria: p.name + " gown" };
      }),
      correct: t.name
    };
  }

  // shapes: every shape the same purple, so only the SHAPE can tell them apart
  function buildShape() {
    var t = pick(SHAPE_NAMES);
    var ds = shuffle(SHAPE_NAMES.filter(function (s) { return s !== t; })).slice(0, choiceCount() - 1);
    var all = shuffle([t].concat(ds));
    var ink = "#8a5cff";
    return {
      label: "Tap the same shape:",
      clip: null,
      charText: t,
      charIsWord: true,
      sample: shapePic(t, ink),
      choices: all.map(function (s) {
        return { key: s, svg: shapePic(s, ink), aria: s };
      }),
      correct: t
    };
  }

  function makeRound() {
    // the first two pieces of every princess are always a SPOKEN round,
    // so a pre-reader always hears the game start talking to her
    var kinds = (slotIndex < 2) ? ["letter", "number"] : kindsForStars();
    var opts = kinds.filter(function (k) { return k !== lastKind; });
    var kind = pick(opts.length ? opts : kinds);
    lastKind = kind;
    if (kind === "count") return buildCount();
    if (kind === "color") return buildColor();
    if (kind === "shape") return buildShape();
    return buildGlyph(kind);
  }

  /* ---------- rounds ---------- */
  function newRound() {
    if (slotIndex >= slots.length) { finishPrincess(); return; }
    locked = false;
    wrongTries = 0;
    round = makeRound();

    promptLabel.textContent = round.label;
    targetEl.textContent = round.charText;
    targetEl.classList.toggle("word", !!round.charIsWord);
    if (round.sample) { sampleEl.innerHTML = round.sample; sampleEl.hidden = false; }
    else { sampleEl.innerHTML = ""; sampleEl.hidden = true; }

    currentClip = round.clip;
    playClip(currentClip);
    armIdleNudge();

    var palette = shuffle(GEM_COLORS);
    choicesEl.innerHTML = "";
    round.choices.forEach(function (c, i) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "gem";
      if (c.svg) {
        btn.classList.add("picture");
        btn.innerHTML = c.svg;
      } else if (c.dots) {
        btn.style.background = palette[i % palette.length];
        btn.innerHTML = '<span class="dots">' + new Array(c.dots + 1).join("<i></i>") + "</span>";
      } else {
        btn.style.background = palette[i % palette.length];
        btn.textContent = c.text;
        if (String(c.text).length > 1) btn.classList.add("two-char");
      }
      btn.setAttribute("aria-label", c.aria);
      btn.addEventListener("click", function () { choose(c, btn); });
      choicesEl.appendChild(btn);
    });
  }

  function choose(c, btn) {
    if (locked || !round) return;

    if (c.key === round.correct) {
      locked = true;
      clearTimeout(idleTimer);
      btn.classList.add("correct");
      sfx("good");
      revealSlot(slots[slotIndex]);
      slotIndex += 1;
      updateProgress();
      persist();
      var pi = rand(PRAISE.length);
      playClip("praise-" + pi);
      showPraise(PRAISE[pi]);
      setTimeout(newRound, 900);
      return;
    }

    // ---- a miss is never a failure, just a smaller puzzle ----
    wrongTries += 1;
    btn.classList.add("wrong");
    sfx("nope");
    setTimeout(function () { btn.classList.remove("wrong"); }, 500);

    var gems = [].slice.call(choicesEl.children);
    if (wrongTries === 1) {
      playClip("try-again");
    } else if (wrongTries === 2) {
      // light up the right gem so little fingers can find it
      gems.forEach(function (g, i) {
        g.classList.toggle("hint", round.choices[i].key === round.correct);
      });
      playClip(currentClip || "try-again");
    } else {
      // third miss: the wrong gems step aside — the next tap must succeed
      gems.forEach(function (g, i) {
        if (round.choices[i].key !== round.correct) g.classList.add("faded");
        else g.classList.add("hint");
      });
      playClip("try-again");
    }
    armIdleNudge();
  }

  function revealSlot(slot, silent) {
    var parts = princessEl.querySelectorAll('.acc[data-slot="' + slot + '"]');
    [].forEach.call(parts, function (el) { el.classList.add("on"); });
    if (!silent) setTimeout(function () { sfx("coin"); }, 250);
  }

  // put back exactly the pieces she has already earned (no sound, no fuss)
  function showEarnedPieces() {
    [].forEach.call(princessEl.querySelectorAll(".acc"), function (el) {
      el.classList.remove("on");
    });
    for (var i = 0; i < slotIndex && i < slots.length; i++) revealSlot(slots[i], true);
  }

  function starLine() {
    return stars <= 10 ? "⭐".repeat(stars) : "⭐ × " + stars;
  }

  /* ---------- finishing a princess ---------- */
  function finishPrincess() {
    clearTimeout(idleTimer);
    locked = true;
    var unlockedBefore = gownsUnlocked();
    stars += 1;
    try { localStorage.setItem(STARS_KEY, String(stars)); } catch (e) {}
    starsEl.textContent = String(stars);

    // let her admire the finished princess for a beat BEFORE the overlay
    princessEl.classList.remove("twirl");
    void princessEl.offsetWidth;
    princessEl.classList.add("twirl");
    sfx("win");
    if (window.Confetti) Confetti.burst({ count: 110 });
    playClip("beautiful");

    var newGown = gownsUnlocked() > unlockedBefore ? GOWNS[unlockedBefore] : null;
    persist();

    // she keeps admiring the finished princess; the next one is rolled
    // only when she taps "Dress Another"
    setTimeout(function () { openOverlay("won", newGown); }, 1900);
  }

  /* ---------- the dressing room (overlay) ---------- */
  function gownsUnlocked() { return Math.min(GOWNS.length, FREE_GOWNS + stars); }

  function buildWardrobe() {
    wardrobeEl.innerHTML = "";
    var unlocked = gownsUnlocked();
    GOWNS.forEach(function (g, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "swatch" + (i === gownIdx ? " picked" : "") + (i < unlocked ? "" : " locked");
      b.style.background = g.hex;
      b.setAttribute("aria-label", i < unlocked
        ? g.name + " gown" + (i === gownIdx ? " (chosen)" : "")
        : g.name + " gown — dress one more princess to unlock");
      b.addEventListener("click", function () {
        if (i >= gownsUnlocked()) {
          b.classList.remove("shake");
          void b.offsetWidth;
          b.classList.add("shake");
          sfx("nope");
          return;
        }
        gownIdx = i;
        persist();
        if (window.PrincessArt) PrincessArt.setDress(GOWNS[i].hex);
        sfx("pop");
        buildWardrobe();
      });
      wardrobeEl.appendChild(b);
    });
  }

  function buildScenePicker() {
    scenePickEl.innerHTML = "";
    SCENES.forEach(function (s, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "swatch swatch-scene" + (i === sceneIdx ? " picked" : "");
      b.textContent = s.icon;
      b.setAttribute("aria-label", s.label + (i === sceneIdx ? " (chosen)" : ""));
      b.addEventListener("click", function () {
        sceneIdx = i;
        persist();
        applyScene();
        sfx("pop");
        buildScenePicker();
      });
      scenePickEl.appendChild(b);
    });
  }

  function applyScene() { sceneEl.setAttribute("data-scene", SCENES[sceneIdx].id); }

  function openOverlay(mode, newGown) {
    overlayMode = mode;
    locked = true;
    clearTimeout(idleTimer);
    if (window.Voice && mode !== "won") Voice.stop();

    if (mode === "won") {
      overlayEmoji.textContent = "👑👸✨";
      overlayTitle.textContent = "Beautiful! 🎉";
      overlayText.textContent = newGown
        ? "You dressed the whole princess! A new " + newGown.name + " gown is in the wardrobe."
        : "You dressed the whole princess! Want to dress another one?";
      startBtn.textContent = "Dress Another 👗";
    } else if (mode === "resume") {
      overlayEmoji.textContent = "👸💭";
      overlayTitle.textContent = "Welcome back!";
      overlayText.textContent = "Your princess still needs " +
        (slots.length - slotIndex) + " more piece" + (slots.length - slotIndex === 1 ? "" : "s") + ".";
      startBtn.textContent = "Keep Going ▶";
    } else if (mode === "wardrobe") {
      overlayEmoji.textContent = "👗✨";
      overlayTitle.textContent = "The Dressing Room";
      overlayText.textContent = "Pick a gown and a place to twirl, then carry on.";
      startBtn.textContent = "Back to Play ▶";
    } else {
      overlayEmoji.textContent = "👸✨";
      overlayTitle.textContent = "Let's dress a princess!";
      overlayText.textContent = "Find the letters, numbers, colours and shapes to give her a crown, a wand, and more!";
      startBtn.textContent = "Start ▶";
    }

    overlayStars.textContent = stars > 0 ? starLine() : "";
    buildWardrobe();
    buildScenePicker();
    overlay.classList.remove("hidden");
    try { startBtn.focus({ preventScroll: true }); } catch (e) { startBtn.focus(); }
  }

  function closeOverlay() {
    overlay.classList.add("hidden");
    if (window.PrincessArt) PrincessArt.setDress(GOWNS[gownIdx].hex);
    applyScene();

    if (overlayMode === "wardrobe" && round) {
      // straight back into the round she was already playing
      locked = false;
      playClip(currentClip);
      armIdleNudge();
      return;
    }
    if (overlayMode === "resume") {
      showEarnedPieces();     // put her half-finished outfit back on
    } else {
      // a brand-new princess, in a fresh six-piece outfit
      slots = rollSlots();
      slotIndex = 0;
      usedTargets = [];
      lastKind = null;
      persist();
      buildProgress();
      showEarnedPieces();
    }
    newRound();
  }

  /* ---------- buttons ---------- */
  muteBtn.addEventListener("click", function () {
    muted = !muted;
    try { localStorage.setItem(MUTE_KEY, muted ? "1" : "0"); } catch (e) {}
    muteBtn.textContent = muted ? "🔇" : "🔊";
    muteBtn.setAttribute("aria-pressed", muted ? "true" : "false");
    if (muted && window.Voice) Voice.stop();
    else playClip(currentClip);
  });

  wardrobeBtn.addEventListener("click", function () {
    if (!overlay.classList.contains("hidden")) return;
    openOverlay("wardrobe");
  });

  startBtn.addEventListener("click", closeOverlay);

  /* ---------- boot ---------- */
  starsEl.textContent = String(stars);
  muteBtn.textContent = muted ? "🔇" : "🔊";
  muteBtn.setAttribute("aria-pressed", muted ? "true" : "false");
  applyScene();
  if (window.PrincessArt) PrincessArt.setDress(GOWNS[gownIdx].hex);
  buildProgress();
  showEarnedPieces();          // a half-dressed princess survives a reload
  persist();
  openOverlay(slotIndex > 0 && slotIndex < slots.length ? "resume" : "intro");
})();
