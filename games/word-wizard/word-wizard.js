/* ===========================================================
   Word Wizard — a spelling & vocabulary game (for Jeannie!)
   -----------------------------------------------------------
   Read a clue, then build the word from a bank of letters by
   tapping (or typing). Correct spellings cast a "spell", earn a
   star, and teach a new word. Progress is saved in localStorage
   so you keep your stars and unlocked spellbooks.

   No build step, no dependencies — plain vanilla JS.
   =========================================================== */

(function () {
  "use strict";

  /* ---------- the spellbooks (levels) ----------
     Each word has a clue (definition); its picture is hand-authored
     pixel art drawn by WordArt.draw(word) (word-art.js). The game
     teaches MEANING as well as spelling. Tuned UP for a strong
     ~4th-grade reader — longer words, silent letters and double
     letters — getting trickier book by book. The `icon` is the word
     whose pixel art represents the whole spellbook on the cover. */
  const LEVELS = [
    {
      name: "Animal Spells",
      icon: "leopard",
      color: "#3ddc84",
      words: [
        { word: "leopard",  clue: "A big spotted wild cat that can climb trees." },
        { word: "penguin",  clue: "A black-and-white bird that swims but can't fly." },
        { word: "squirrel", clue: "A bushy-tailed animal that buries acorns." },
        { word: "flamingo", clue: "A tall pink bird that stands on one leg." },
        { word: "elephant", clue: "The largest land animal, with a long trunk." },
        { word: "hedgehog", clue: "A small animal covered in sharp prickly spines." },
      ],
    },
    {
      name: "Nature Spells",
      icon: "volcano",
      color: "#38b6ff",
      words: [
        { word: "volcano",   clue: "A mountain that can erupt with hot melted rock." },
        { word: "iceberg",   clue: "A giant floating mountain of ice in the sea." },
        { word: "tornado",   clue: "A spinning funnel of wind that touches the ground." },
        { word: "waterfall", clue: "Water that tumbles down over the edge of a cliff." },
        { word: "glacier",   clue: "A slow-moving river of ancient, frozen ice." },
        { word: "canyon",    clue: "A deep valley carved out by a river over time." },
      ],
    },
    {
      name: "Castle Spells",
      icon: "dragon",
      color: "#8a5cff",
      words: [
        { word: "dragon",  clue: "A huge winged beast that breathes fire." },
        { word: "castle",  clue: "A giant stone fortress for a king or queen." },
        { word: "wizard",  clue: "A person who casts spells and does real magic." },
        { word: "knight",  clue: "A warrior in armour who serves the king." },
        { word: "shield",  clue: "What a knight holds up to block an attack." },
        { word: "goblet",  clue: "A fancy cup for drinking at a royal feast." },
      ],
    },
    {
      name: "Space Spells",
      icon: "rocket",
      color: "#6a5cff",
      words: [
        { word: "comet",     clue: "A ball of ice and dust with a glowing tail." },
        { word: "planet",    clue: "A big round world that orbits around a star." },
        { word: "rocket",    clue: "A machine that blasts off to fly into space." },
        { word: "galaxy",    clue: "A huge swirl of billions of stars." },
        { word: "asteroid",  clue: "A rocky lump that tumbles through space." },
        { word: "telescope", clue: "A tube you look through to see far-off stars." },
      ],
    },
    {
      name: "Ocean Spells",
      icon: "dolphin",
      color: "#1ec8c8",
      words: [
        { word: "dolphin",    clue: "A smart sea mammal that leaps from the waves." },
        { word: "octopus",    clue: "A sea creature with eight wiggly arms." },
        { word: "seahorse",   clue: "A tiny curly fish with a horse-shaped head." },
        { word: "anchor",     clue: "A heavy hook that holds a ship in place." },
        { word: "jellyfish",  clue: "A see-through sea animal that can sting." },
        { word: "lighthouse", clue: "A tall tower that shines a light to guide ships." },
      ],
    },
    {
      name: "Garden Spells",
      icon: "ladybug",
      color: "#ff5d8f",
      words: [
        { word: "ladybug",     clue: "A little red beetle dotted with black spots." },
        { word: "beetle",      clue: "An insect with a hard, shiny shell on its back." },
        { word: "spider",      clue: "An eight-legged creature that spins silky webs." },
        { word: "caterpillar", clue: "A wriggly bug that turns into a butterfly." },
        { word: "dragonfly",   clue: "A fast insect with four see-through wings." },
        { word: "mushroom",    clue: "A little umbrella-shaped fungus on the ground." },
      ],
    },
    {
      name: "Music Spells",
      icon: "guitar",
      color: "#ff8c42",
      words: [
        { word: "trumpet", clue: "A brass horn you blow to play loud, bright notes." },
        { word: "guitar",  clue: "An instrument with strings that you strum." },
        { word: "violin",  clue: "A small wooden instrument played with a bow." },
        { word: "drum",    clue: "You hit it with sticks to keep the beat." },
        { word: "piano",   clue: "A big instrument with black and white keys." },
        { word: "harp",    clue: "A tall instrument with strings you pluck." },
      ],
    },
    {
      name: "Master Spells",
      icon: "treasure",
      color: "#ffd166",
      words: [
        { word: "treasure",  clue: "Gold and jewels that a pirate hides away." },
        { word: "compass",   clue: "A tool with a needle that always points north." },
        { word: "pyramid",   clue: "A giant pointed stone tomb built in Egypt." },
        { word: "dinosaur",  clue: "A giant reptile that lived long, long ago." },
        { word: "umbrella",  clue: "What you hold over your head to stay dry." },
        { word: "butterfly", clue: "An insect with big, colourful, fluttering wings." },
      ],
    },
  ];

  /* ---------- saved progress ---------- */
  const SAVE_KEY = "wordWizard.v1";
  const DEFAULT_SAVE = { stars: 0, mastered: {}, unlocked: 1 };

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && typeof s === "object") {
        return {
          stars: s.stars | 0,
          mastered: s.mastered && typeof s.mastered === "object" ? s.mastered : {},
          unlocked: Math.max(1, s.unlocked | 0),
        };
      }
    } catch (e) { /* ignore corrupt save */ }
    return JSON.parse(JSON.stringify(DEFAULT_SAVE));
  }
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }

  const state = load();

  /* ---------- element refs ---------- */
  const $ = (id) => document.getElementById(id);
  const el = {
    stars: $("stars"), learned: $("learned"),
    levels: $("levels"), levelGrid: $("level-grid"),
    play: $("play"), feedback: $("feedback"),
    clueEmoji: $("clue-emoji"), clueText: $("clue-text"),
    slots: $("slots"), bank: $("bank"),
    hear: $("hear-btn"), clear: $("clear-btn"), skip: $("skip-btn"), quit: $("quit-btn"),
    win: $("win"), winBig: $("win-big"), winTitle: $("win-title"), winText: $("win-text"),
    winNext: $("win-next"), winMenu: $("win-menu"),
  };

  /* ---------- live play state ---------- */
  let levelIndex = 0;
  let wordIndex = 0;
  let current = null;     // the current word object
  let typed = [];         // array of {char, btn} placed in slots
  let locked = false;     // true while showing success / transitioning

  /* ---------- helpers ---------- */
  function countMastered() { return Object.keys(state.mastered).length; }

  function updateHud() {
    el.stars.textContent = state.stars;
    el.learned.textContent = countMastered();
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function show(section) {
    el.levels.classList.toggle("hidden", section !== "levels");
    el.play.classList.toggle("hidden", section !== "play");
    el.win.classList.toggle("hidden", section !== "win");
  }

  // Play a pre-rendered neural-voice clip from this game's audio/ folder.
  function playClip(name) {
    if (window.Voice) Voice.play("audio/" + name + ".mp3");
  }

  function sparkleBurst() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const emojis = ["✨", "⭐", "🌟", "💫"];
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    for (let i = 0; i < 12; i++) {
      const s = document.createElement("div");
      s.className = "sparkle";
      s.textContent = emojis[i % emojis.length];
      s.style.left = (cx + (Math.random() - 0.5) * 260) + "px";
      s.style.top = (cy + (Math.random() - 0.5) * 120) + "px";
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 900);
    }
  }

  /* ---------- level select ---------- */
  function renderLevels() {
    el.levelGrid.innerHTML = "";
    LEVELS.forEach((lv, i) => {
      const unlocked = i < state.unlocked;
      const done = lv.words.every((w) => state.mastered[w.word]);
      const card = document.createElement(unlocked ? "button" : "div");
      card.className = "level-card" + (unlocked ? "" : " locked") + (done ? " done" : "");
      card.style.setProperty("--accent", lv.color);
      const learnedHere = lv.words.filter((w) => state.mastered[w.word]).length;
      card.innerHTML =
        '<span class="lv-emoji" aria-hidden="true">' +
          (unlocked ? WordArt.draw(lv.icon) : '<span class="lv-lock">🔒</span>') + "</span>" +
        "<h3>" + lv.name + "</h3>" +
        '<span class="lv-progress">' +
          (unlocked ? (learnedHere + " / " + lv.words.length + (done ? " ✓" : ""))
                    : "Finish " + LEVELS[i - 1].name + " to open!") +
        "</span>";
      if (unlocked) {
        card.type = "button";
        card.addEventListener("click", () => startLevel(i));
      }
      el.levelGrid.appendChild(card);
    });
  }

  /* ---------- play a level ---------- */
  function startLevel(i) {
    levelIndex = i;
    // start at the first word that isn't mastered yet, else the beginning
    const lv = LEVELS[i];
    const firstNew = lv.words.findIndex((w) => !state.mastered[w.word]);
    wordIndex = firstNew === -1 ? 0 : firstNew;
    show("play");
    loadWord();
  }

  function loadWord() {
    const lv = LEVELS[levelIndex];
    current = lv.words[wordIndex];
    typed = [];
    locked = false;
    el.feedback.textContent = "";
    el.feedback.style.color = "var(--green)";
    el.clueEmoji.innerHTML = WordArt.draw(current.word);
    el.clueText.textContent = current.clue;

    // slots — one per letter, tagged with the answer so the game (and tests) can check
    el.slots.className = "slots";
    el.slots.dataset.word = current.word;
    el.slots.innerHTML = "";
    for (let k = 0; k < current.word.length; k++) {
      const sl = document.createElement("div");
      sl.className = "slot";
      el.slots.appendChild(sl);
    }

    // letter bank — the word's letters plus a few decoy letters, shuffled
    const letters = current.word.split("");
    const alphabet = "abcdefghijklmnopqrstuvwxyz".split("");
    const decoyCount = Math.min(3, Math.max(2, 8 - letters.length));
    let guard = 0;
    while (letters.length < current.word.length + decoyCount && guard++ < 200) {
      const c = alphabet[Math.floor(Math.random() * 26)];
      if (current.word.indexOf(c) === -1) letters.push(c);
    }
    el.bank.innerHTML = "";
    shuffle(letters).forEach((c) => {
      const b = document.createElement("button");
      b.className = "letter";
      b.type = "button";
      b.textContent = c;
      b.dataset.letter = c;
      b.addEventListener("click", () => placeLetter(c, b));
      el.bank.appendChild(b);
    });
  }

  function renderSlots() {
    const slots = el.slots.children;
    for (let k = 0; k < slots.length; k++) {
      const t = typed[k];
      slots[k].textContent = t ? t.char : "";
      slots[k].classList.toggle("filled", !!t);
    }
  }

  function placeLetter(c, btn) {
    if (locked || btn.disabled) return;
    if (typed.length >= current.word.length) return;
    btn.disabled = true;
    typed.push({ char: c, btn: btn });
    renderSlots();
    if (typed.length === current.word.length) checkAnswer();
  }

  function removeLast() {
    if (locked || typed.length === 0) return;
    const last = typed.pop();
    last.btn.disabled = false;
    el.slots.classList.remove("wrong");
    renderSlots();
  }

  function clearAll() {
    if (locked) return;
    while (typed.length) removeLast();
  }

  function checkAnswer() {
    const guess = typed.map((t) => t.char).join("");
    if (guess === current.word) {
      win();
    } else {
      el.slots.classList.add("wrong");
      el.feedback.style.color = "var(--pink)";
      el.feedback.textContent = "Not quite — try again! 💪";
      setTimeout(() => { clearAll(); el.feedback.textContent = ""; }, 800);
    }
  }

  function win() {
    locked = true;
    const slots = el.slots.children;
    for (let k = 0; k < slots.length; k++) slots[k].classList.add("good");
    const firstTime = !state.mastered[current.word];
    if (firstTime) state.mastered[current.word] = true;
    state.stars += 1;
    save();
    updateHud();
    el.feedback.style.color = "var(--green)";
    el.feedback.textContent = firstTime ? "✨ New word learned! ✨" : "✅ Spelled it!";
    sparkleBurst();
    window.SFX && SFX.good();
    playClip("word-" + current.word);
    setTimeout(nextWord, 1300);
  }

  function nextWord() {
    const lv = LEVELS[levelIndex];
    if (wordIndex < lv.words.length - 1) {
      wordIndex += 1;
      loadWord();
    } else {
      finishLevel();
    }
  }

  function finishLevel() {
    // unlock the next spellbook
    if (state.unlocked < Math.min(LEVELS.length, levelIndex + 2)) {
      state.unlocked = Math.min(LEVELS.length, levelIndex + 2);
      save();
    }
    renderLevels();
    const lv = LEVELS[levelIndex];
    el.winBig.innerHTML = WordArt.draw(lv.icon);
    el.winTitle.textContent = lv.name + " mastered!";
    const hasNext = levelIndex < LEVELS.length - 1;
    el.winText.textContent = hasNext
      ? "You learned " + lv.words.length + " words. A new spellbook is unlocked!"
      : "Wow — you finished every spellbook! You're a true Word Wizard. 🪄";
    el.winNext.style.display = hasNext ? "" : "none";
    show("win");
    window.SFX && SFX.win();
    window.Confetti && Confetti.burst({ count: 120 });
    playClip("you-did-it");
  }

  /* ---------- keyboard support (for big kids who like typing) ---------- */
  document.addEventListener("keydown", (e) => {
    if (el.play.classList.contains("hidden")) return;
    if (e.key === "Backspace") { e.preventDefault(); removeLast(); return; }
    if (e.key === "Escape") { clearAll(); return; }
    const k = e.key.toLowerCase();
    if (k.length === 1 && k >= "a" && k <= "z") {
      // find an enabled bank button for this letter that isn't used yet
      const btns = el.bank.querySelectorAll(".letter:not(:disabled)");
      for (const b of btns) {
        if (b.dataset.letter === k) { placeLetter(k, b); break; }
      }
    }
  });

  /* ---------- wire up buttons ---------- */
  el.clear.addEventListener("click", clearAll);
  el.hear.addEventListener("click", () => { if (current) playClip("word-" + current.word); });
  el.skip.addEventListener("click", () => { if (!locked) nextWord(); });
  el.quit.addEventListener("click", () => { renderLevels(); show("levels"); });
  el.winMenu.addEventListener("click", () => { renderLevels(); show("levels"); });
  el.winNext.addEventListener("click", () => {
    if (levelIndex < LEVELS.length - 1) startLevel(levelIndex + 1);
    else { renderLevels(); show("levels"); }
  });

  /* ---------- go ---------- */
  updateHud();
  renderLevels();
  show("levels");
})();
