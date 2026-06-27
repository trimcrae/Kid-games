/* ===========================================================
   Spelling Bee — a kid-friendly version of the NYT word game.
   -----------------------------------------------------------
   Make as many words as you can from a honeycomb of 7 letters.
   • Every word must use the GOLDEN middle letter.
   • Words are at least 4 letters long, letters can repeat.
   • Use all 7 letters in one word for a "Pangram" bonus! 🌟

   Each hive has its OWN list of allowed words, so there's no
   giant dictionary to download — and we know every word is one
   the kids will actually know. Found words & score are saved in
   localStorage per hive.

   To ADD A HIVE: copy a block in PUZZLES. The letters array is
   [centre, ...six outer]. List every accepted word in `words`.
   =========================================================== */

(function () {
  "use strict";

  const MIN_LEN = 4;

  /* ---------- the hives ----------
     letters[0] is the golden centre letter (required in every word). */
  const PUZZLES = [
    {
      name: "Dolphin Dive",
      emoji: "🐬",
      letters: ["o", "d", "l", "p", "h", "i", "n"],
      words: [
        "dolphin", "hold", "hood", "hoop", "idol", "lion", "loin",
        "loop", "plod", "polo", "pond", "pool", "hippo",
      ],
    },
    {
      name: "Family Time",
      emoji: "👪",
      letters: ["a", "r", "t", "s", "p", "e", "n"],
      words: [
        "parents", "apart", "area", "arts", "ears", "near", "neat",
        "pant", "pants", "paper", "parent", "part", "parts", "past",
        "paste", "pasta", "pear", "pears", "rant", "rants", "rate",
        "rates", "tear", "tears", "treat", "treats", "spare", "spear",
        "star", "stare", "start", "snare", "raters", "eaten", "paste",
      ],
    },
    {
      name: "Carrot Patch",
      emoji: "🥕",
      letters: ["t", "c", "a", "r", "o", "n", "s"],
      words: [
        "cartons", "actor", "actors", "carrot", "carrots", "cart",
        "carts", "cats", "coast", "coat", "coats", "cost", "oats",
        "rats", "roast", "rots", "sort", "start", "taco", "tacos",
        "tart", "toast", "tons", "torn", "carton", "ascot",
      ],
    },
    {
      name: "Rainbow Bright",
      emoji: "🌈",
      letters: ["n", "r", "a", "i", "b", "o", "w"],
      words: [
        "rainbow", "rain", "brain", "bran", "barn", "born", "born",
        "iron", "wain", "warn", "worn", "brown", "robin", "ration",
        "bairn", "noir", "rabbi", "broil", "rainbow", "brawn",
      ],
    },
    {
      name: "Treehouse",
      emoji: "🌳",
      letters: ["e", "t", "h", "o", "u", "s", "r"],
      words: [
        "treehouse", "house", "horse", "shore", "store", "sherbet",
        "those", "three", "threes", "tree", "trees", "hero", "heroes",
        "here", "hose", "rose", "rote", "rust", "ruse", "rush", "ether",
        "other", "others", "shoe", "shore", "shorter", "sort", "sore",
        "tore", "true", "truest", "user", "shout", "south", "route",
        "rouse", "thee", "rest", "test", "tester", "torte", "stretch",
      ],
    },
    {
      name: "In the Garden",
      emoji: "🌻",
      letters: ["a", "g", "r", "d", "e", "n", "s"],
      words: [
        "gardens", "garden", "danger", "dangers", "dare", "dares",
        "dear", "dears", "drag", "drags", "earn", "earns", "grade",
        "grades", "grand", "grands", "near", "nears", "range", "ranges",
        "read", "reads", "sand", "sane", "sear", "snare", "anger",
        "angers", "sedan", "area", "grades", "sander", "darn", "darns",
      ],
    },
    {
      name: "Birthday Party",
      emoji: "🎉",
      letters: ["t", "p", "a", "r", "i", "e", "s"],
      words: [
        "parties", "part", "parts", "past", "paste", "pirate", "pirates",
        "rate", "rates", "tear", "tears", "tire", "tires", "tart",
        "taste", "taper", "tapers", "trip", "trips", "trap", "traps",
        "treat", "stir", "strip", "stripe", "stripes", "spit", "spite",
        "star", "start", "taps", "tips", "pita", "pitas", "trait",
      ],
    },
    {
      name: "Monster Mash",
      emoji: "👹",
      letters: ["s", "m", "o", "n", "t", "e", "r"],
      words: [
        "monster", "monsters", "most", "nest", "nests", "rest", "rests",
        "rose", "roses", "sent", "snore", "snores", "some", "sore",
        "sores", "sort", "sorts", "stem", "stems", "stern", "stone",
        "stones", "store", "stores", "storm", "storms", "toes", "tons",
        "moms", "most", "noses", "tester", "rents", "stress",
      ],
    },
  ];

  /* ---------- saved progress (per hive) ---------- */
  const SAVE_KEY = "spellingBee.v1";
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && typeof s === "object") return s;
    } catch (e) { /* ignore */ }
    return {};
  }
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(saved)); } catch (e) {} }
  const saved = load();

  /* normalise puzzle word lists: lowercase, unique, valid (uses only
     puzzle letters, contains centre, >= MIN_LEN). This makes the data
     forgiving of typos in the lists above. */
  PUZZLES.forEach((p) => {
    const set = new Set(p.letters);
    const centre = p.letters[0];
    const ok = [];
    const seen = new Set();
    p.words.forEach((w) => {
      w = String(w).toLowerCase();
      if (w.length < MIN_LEN) return;
      if (w.indexOf(centre) === -1) return;
      if (![...w].every((c) => set.has(c))) return;
      if (seen.has(w)) return;
      seen.add(w);
      ok.push(w);
    });
    p.valid = ok;
    p.pangrams = ok.filter((w) => new Set(w).size === 7);
  });

  /* ---------- scoring & ranks ---------- */
  function wordScore(w) {
    if (w.length === 4) return 1;
    let s = w.length;                 // 5 letters = 5 pts, etc.
    if (new Set(w).size === 7) s += 7; // pangram bonus
    return s;
  }
  function maxScore(p) { return p.valid.reduce((t, w) => t + wordScore(w), 0); }

  const RANKS = [
    [0, "Beginner 🐣"], [0.05, "Good Start 🌱"], [0.12, "Nice 🙂"],
    [0.25, "Buzzing 🐝"], [0.4, "Great 😄"], [0.55, "Amazing 🤩"],
    [0.75, "Genius 🧠"], [1, "Queen Bee 👑"],
  ];
  function rankFor(p, score) {
    const m = maxScore(p) || 1;
    const frac = score / m;
    let label = RANKS[0][1];
    for (const [t, l] of RANKS) if (frac >= t) label = l;
    return label;
  }

  /* ---------- element refs ---------- */
  const $ = (id) => document.getElementById(id);
  const el = {
    puzzles: $("puzzles"), puzGrid: $("puz-grid"), play: $("play"),
    score: $("score"), wordcount: $("wordcount"), rank: $("rank"),
    feedback: $("feedback"), entry: $("entry"), hive: $("hive"),
    del: $("delete-btn"), shuffle: $("shuffle-btn"), enter: $("enter-btn"),
    quit: $("quit-btn"), foundList: $("found-list"),
  };

  let pi = 0;           // current puzzle index
  let typed = "";       // the word being built
  let outerOrder = [];  // shuffled positions of the 6 outer letters

  function progressFor(i) {
    const id = "p" + i;
    if (!saved[id]) saved[id] = { found: [], score: 0 };
    return saved[id];
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let k = a.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [a[k], a[j]] = [a[j], a[k]];
    }
    return a;
  }

  function show(section) {
    el.puzzles.classList.toggle("hidden", section !== "puzzles");
    el.play.classList.toggle("hidden", section !== "play");
  }

  function speak(text) {
    try {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.85; u.pitch = 1.15;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  function sparkleBurst() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const emojis = ["✨", "🍯", "🌟", "🐝"];
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    for (let i = 0; i < 10; i++) {
      const s = document.createElement("div");
      s.className = "sparkle";
      s.textContent = emojis[i % emojis.length];
      s.style.left = (cx + (Math.random() - 0.5) * 240) + "px";
      s.style.top = (cy + (Math.random() - 0.5) * 120) + "px";
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 900);
    }
  }

  /* ---------- puzzle picker ---------- */
  function renderPuzzles() {
    el.puzGrid.innerHTML = "";
    PUZZLES.forEach((p, i) => {
      const prog = progressFor(i);
      const total = p.valid.length;
      const done = prog.found.length >= total && total > 0;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "puz-card" + (done ? " done" : "");
      card.innerHTML =
        '<span class="pz-emoji" aria-hidden="true">' + p.emoji + "</span>" +
        "<h3>" + p.name + "</h3>" +
        '<span class="pz-progress">' + prog.found.length + " / " + total +
        " words" + (done ? " ✓" : "") + "</span>";
      card.addEventListener("click", () => startPuzzle(i));
      el.puzGrid.appendChild(card);
    });
  }

  /* ---------- play ---------- */
  function startPuzzle(i) {
    pi = i;
    typed = "";
    outerOrder = shuffle([1, 2, 3, 4, 5, 6]);
    renderHive();
    renderEntry();
    renderFound();
    updateHud();
    el.feedback.textContent = "";
    el.play.dataset.sample = PUZZLES[pi].valid[0] || ""; // play-test hook
    show("play");
  }

  function renderHive() {
    const p = PUZZLES[pi];
    el.hive.innerHTML = "";
    // centre
    el.hive.appendChild(makeCell(p.letters[0], true, "center"));
    // six outer in their shuffled spots
    outerOrder.forEach((letterIdx, pos) => {
      el.hive.appendChild(makeCell(p.letters[letterIdx], false, "p" + pos));
    });
  }
  function makeCell(letter, isCenter, posClass) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "cell " + posClass + (isCenter ? " center" : "");
    b.dataset.letter = letter;
    b.innerHTML = '<span class="hex">' + letter + "</span>";
    b.addEventListener("click", () => addLetter(letter));
    return b;
  }

  function renderEntry() {
    const p = PUZZLES[pi];
    if (!typed) {
      el.entry.innerHTML = '<span class="ghosttext">type or tap letters…</span>';
      return;
    }
    el.entry.innerHTML = [...typed].map((c) =>
      c === p.letters[0] ? '<span class="center">' + c + "</span>" : c
    ).join("");
  }

  function updateHud() {
    const prog = progressFor(pi);
    el.score.textContent = prog.score;
    el.wordcount.textContent = prog.found.length;
    el.rank.textContent = rankFor(PUZZLES[pi], prog.score);
  }

  function renderFound() {
    const prog = progressFor(pi);
    const p = PUZZLES[pi];
    el.foundList.innerHTML = "";
    // newest first
    prog.found.slice().reverse().forEach((w) => {
      const chip = document.createElement("span");
      chip.className = "found-chip" + (new Set(w).size === 7 ? " pangram" : "");
      chip.textContent = w;
      el.foundList.appendChild(chip);
    });
  }

  function addLetter(c) {
    if (typed.length >= 19) return;
    typed += c;
    renderEntry();
  }
  function deleteLetter() { typed = typed.slice(0, -1); renderEntry(); }

  function flash(msg, color) {
    el.feedback.style.color = color;
    el.feedback.textContent = msg;
  }
  function shakeEntry() {
    el.entry.classList.remove("shake");
    void el.entry.offsetWidth;
    el.entry.classList.add("shake");
  }

  function submit() {
    const p = PUZZLES[pi];
    const w = typed.toLowerCase();
    const prog = progressFor(pi);
    if (w.length === 0) return;
    if (w.length < MIN_LEN) { flash("Too short — 4 letters or more! ✋", "var(--pink)"); shakeEntry(); return; }
    if (w.indexOf(p.letters[0]) === -1) { flash("Must use the golden letter 🟡", "var(--pink)"); shakeEntry(); return; }
    if (![...w].every((ch) => p.letters.indexOf(ch) !== -1)) { flash("Only use the hive letters!", "var(--pink)"); shakeEntry(); typed = ""; renderEntry(); return; }
    if (prog.found.indexOf(w) !== -1) { flash("Already found that one! 🙂", "#b8860b"); typed = ""; renderEntry(); return; }
    if (p.valid.indexOf(w) === -1) { flash("Hmm, not in this hive — keep trying! 🐝", "var(--pink)"); shakeEntry(); return; }

    // a good word!
    const pts = wordScore(w);
    const pangram = new Set(w).size === 7;
    prog.found.push(w);
    prog.score += pts;
    save();
    typed = "";
    renderEntry();
    renderFound();
    updateHud();
    if (pangram) { flash("🌟 PANGRAM! +" + pts + " 🌟", "var(--green)"); sparkleBurst(); speak("Pangram!"); if (window.SFX) SFX.win(); window.Confetti && Confetti.burst({ count: 110 }); }
    else { flash("Nice! +" + pts + " 🍯", "var(--green)"); if (window.SFX) SFX.good(); }
  }

  /* ---------- keyboard ---------- */
  document.addEventListener("keydown", (e) => {
    if (el.play.classList.contains("hidden")) return;
    if (e.key === "Enter") { e.preventDefault(); submit(); return; }
    if (e.key === "Backspace") { e.preventDefault(); deleteLetter(); return; }
    const k = e.key.toLowerCase();
    if (k.length === 1 && k >= "a" && k <= "z" && PUZZLES[pi].letters.indexOf(k) !== -1) {
      addLetter(k);
    }
  });

  /* ---------- buttons ---------- */
  el.del.addEventListener("click", deleteLetter);
  el.enter.addEventListener("click", submit);
  el.shuffle.addEventListener("click", () => { outerOrder = shuffle(outerOrder); renderHive(); });
  el.quit.addEventListener("click", () => { renderPuzzles(); show("puzzles"); });

  /* ---------- go ---------- */
  renderPuzzles();
  show("puzzles");
})();
