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
     Each word has a clue (definition) and a picture emoji so the
     game teaches MEANING as well as spelling. Tuned for a strong
     ~2nd–4th-grade reader, getting trickier book by book. */
  const LEVELS = [
    {
      name: "Animal Spells",
      emoji: "🦊",
      color: "#3ddc84",
      words: [
        { word: "fox",    clue: "A clever orange animal with a bushy tail.",        pic: "🦊" },
        { word: "frog",   clue: "A green hopper that says 'ribbit'.",               pic: "🐸" },
        { word: "tiger",  clue: "A big striped cat from the jungle.",               pic: "🐯" },
        { word: "whale",  clue: "The giant gentle animal of the deep sea.",         pic: "🐳" },
        { word: "panda",  clue: "A black-and-white bear that loves bamboo.",        pic: "🐼" },
        { word: "snake",  clue: "A long animal with no legs that slithers.",        pic: "🐍" },
      ],
    },
    {
      name: "Nature Spells",
      emoji: "🌈",
      color: "#38b6ff",
      words: [
        { word: "river",   clue: "Water that flows along the land to the sea.",     pic: "🏞️" },
        { word: "cloud",   clue: "A fluffy white shape floating in the sky.",       pic: "☁️" },
        { word: "flower",  clue: "A pretty bloom that grows on a plant.",           pic: "🌸" },
        { word: "thunder", clue: "The loud rumble you hear in a storm.",            pic: "⛈️" },
        { word: "rainbow", clue: "An arch of colours after the rain.",              pic: "🌈" },
        { word: "mountain",clue: "A very tall hill made of rock.",                  pic: "⛰️" },
      ],
    },
    {
      name: "Feeling Spells",
      emoji: "😊",
      color: "#ff5d8f",
      words: [
        { word: "brave",   clue: "Not afraid, even when things are scary.",         pic: "🦁" },
        { word: "kind",    clue: "Friendly and caring to other people.",            pic: "💗" },
        { word: "curious", clue: "Wanting to learn or know more about things.",     pic: "🔍" },
        { word: "joyful",  clue: "Feeling very, very happy.",                       pic: "😄" },
        { word: "gentle",  clue: "Soft and careful, never rough.",                  pic: "🕊️" },
        { word: "clever",  clue: "Quick at learning and solving problems.",         pic: "💡" },
      ],
    },
    {
      name: "Wizard Spells",
      emoji: "🪄",
      color: "#8a5cff",
      words: [
        { word: "magic",   clue: "Amazing powers that seem impossible.",           pic: "✨" },
        { word: "potion",  clue: "A magic drink mixed in a bubbling pot.",          pic: "🧪" },
        { word: "dragon",  clue: "A huge winged beast that breathes fire.",         pic: "🐉" },
        { word: "castle",  clue: "A giant stone home for a king or queen.",         pic: "🏰" },
        { word: "wizard",  clue: "A person who can do real magic.",                 pic: "🧙" },
        { word: "sparkle", clue: "To shine with tiny bright flashes of light.",     pic: "🌟" },
      ],
    },
    {
      name: "Tricky Spells",
      emoji: "🧠",
      color: "#ffd166",
      words: [
        { word: "friend",   clue: "Someone you like and play with.",               pic: "🧑‍🤝‍🧑" },
        { word: "because",  clue: "The word that gives a reason: 'I smiled ___…'",  pic: "💬" },
        { word: "beautiful",clue: "Very, very pretty to look at.",                  pic: "🌺" },
        { word: "favorite", clue: "The one you like the most of all.",             pic: "⭐" },
        { word: "different",clue: "Not the same as something else.",                pic: "🔀" },
        { word: "adventure",clue: "An exciting journey full of surprises.",         pic: "🗺️" },
      ],
    },
    {
      name: "Space Spells",
      emoji: "🚀",
      color: "#6a5cff",
      words: [
        { word: "comet",    clue: "A ball of ice and dust with a glowing tail.",     pic: "☄️" },
        { word: "planet",   clue: "A big round world that circles a star.",          pic: "🪐" },
        { word: "rocket",   clue: "What blasts off to fly into space.",              pic: "🚀" },
        { word: "galaxy",   clue: "A huge group of millions of stars.",              pic: "🌌" },
        { word: "gravity",  clue: "The pull that keeps your feet on the ground.",    pic: "🍎" },
        { word: "astronaut",clue: "A person who travels into outer space.",          pic: "👩‍🚀" },
      ],
    },
    {
      name: "Ocean Spells",
      emoji: "🌊",
      color: "#1ec8c8",
      words: [
        { word: "coral",    clue: "Colourful rock-like homes for sea creatures.",    pic: "🪸" },
        { word: "dolphin",  clue: "A smart, friendly animal that leaps from waves.", pic: "🐬" },
        { word: "octopus",  clue: "A sea animal with eight wiggly arms.",            pic: "🐙" },
        { word: "treasure", clue: "Gold and jewels a pirate hides away.",            pic: "💰" },
        { word: "current",  clue: "Water that flows and moves in the sea.",          pic: "🌊" },
        { word: "jellyfish",clue: "A see-through sea animal that can sting.",        pic: "🪼" },
      ],
    },
    {
      name: "Master Spells",
      emoji: "🏆",
      color: "#ff8c42",
      words: [
        { word: "whisper",   clue: "To talk very, very quietly.",                    pic: "🤫" },
        { word: "ancient",   clue: "Very, very old — from long, long ago.",          pic: "🏛️" },
        { word: "creature",  clue: "Any living animal or being.",                    pic: "🦕" },
        { word: "enormous",  clue: "Super huge — even bigger than big!",             pic: "🐘" },
        { word: "delicious", clue: "Tasting really, really yummy.",                  pic: "🍰" },
        { word: "imagine",   clue: "To picture something fun in your mind.",         pic: "💭" },
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
    win: $("win"), winTitle: $("win-title"), winText: $("win-text"),
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

  function speak(text) {
    if (window.Speech) Speech.speak(text);
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
        '<span class="lv-emoji" aria-hidden="true">' + (unlocked ? lv.emoji : "🔒") + "</span>" +
        "<h3>" + lv.name + "</h3>" +
        '<span class="lv-progress">' +
          (unlocked ? (learnedHere + " / " + lv.words.length + (done ? " ✓" : "")) : "Locked") +
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
    el.clueEmoji.textContent = current.pic || "✨";
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
    speak(current.word);
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
    el.winTitle.textContent = lv.emoji + " " + lv.name + " mastered!";
    const hasNext = levelIndex < LEVELS.length - 1;
    el.winText.textContent = hasNext
      ? "You learned " + lv.words.length + " words. A new spellbook is unlocked!"
      : "Wow — you finished every spellbook! You're a true Word Wizard. 🪄";
    el.winNext.style.display = hasNext ? "" : "none";
    show("win");
    window.SFX && SFX.win();
    window.Confetti && Confetti.burst({ count: 120 });
    speak("You did it!");
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
  el.hear.addEventListener("click", () => speak(current ? current.word : ""));
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
