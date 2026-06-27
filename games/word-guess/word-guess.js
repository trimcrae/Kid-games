/* ===========================================================
   Word Guess — a kid-friendly version of Wordle.
   -----------------------------------------------------------
   Guess the secret 5-letter word in 6 tries. After each guess:
     🟩 green  = right letter, right spot
     🟨 yellow = right letter, wrong spot
     ⬜ grey   = letter not in the word
   There's a 💡 Hint button (a category + emoji) so younger
   readers don't get stuck. Streak & wins are saved.

   Teaches: spelling, letter patterns and a little deduction.

   To ADD WORDS: drop entries in ANSWERS (the secret words, each
   with a kid-friendly hint) and/or EXTRA_GUESSES (words kids are
   allowed to *type* as a guess). Everything is 5 letters.
   =========================================================== */

(function () {
  "use strict";

  let LEN = 5;       // letters per word — 5 (Normal) or 4 (Easy)
  const TRIES = 6;

  /* secret words + a gentle hint for each */
  const ANSWERS = [
    { word: "apple", emoji: "🍎", hint: "A crunchy red or green fruit" },
    { word: "happy", emoji: "😊", hint: "How you feel on your birthday" },
    { word: "tiger", emoji: "🐯", hint: "A big striped jungle cat" },
    { word: "water", emoji: "💧", hint: "You drink it when you're thirsty" },
    { word: "candy", emoji: "🍬", hint: "A sweet treat on Halloween" },
    { word: "cloud", emoji: "☁️", hint: "A fluffy white thing in the sky" },
    { word: "dance", emoji: "💃", hint: "Moving your body to music" },
    { word: "dream", emoji: "💤", hint: "A story in your head while you sleep" },
    { word: "eagle", emoji: "🦅", hint: "A huge bird with sharp eyes" },
    { word: "fairy", emoji: "🧚", hint: "A tiny magical creature with wings" },
    { word: "grape", emoji: "🍇", hint: "A small round purple fruit" },
    { word: "heart", emoji: "❤️", hint: "The shape that means love" },
    { word: "juice", emoji: "🧃", hint: "A fruity drink in a box" },
    { word: "lemon", emoji: "🍋", hint: "A sour yellow fruit" },
    { word: "magic", emoji: "✨", hint: "Wizards and fairies use it" },
    { word: "mouse", emoji: "🐭", hint: "A tiny animal that likes cheese" },
    { word: "ocean", emoji: "🌊", hint: "The huge salty water with whales" },
    { word: "panda", emoji: "🐼", hint: "A black-and-white bear that loves bamboo" },
    { word: "queen", emoji: "👑", hint: "A king's royal partner" },
    { word: "robot", emoji: "🤖", hint: "A machine that can move and beep" },
    { word: "snake", emoji: "🐍", hint: "A long animal with no legs" },
    { word: "train", emoji: "🚂", hint: "It runs on tracks: choo-choo!" },
    { word: "zebra", emoji: "🦓", hint: "A striped animal like a horse" },
    { word: "sword", emoji: "⚔️", hint: "A blade knights and Minecraft heroes use" },
    { word: "crown", emoji: "👑", hint: "A queen wears it on her head" },
    { word: "ghost", emoji: "👻", hint: "A friendly-spooky 'boo!' creature" },
    { word: "pizza", emoji: "🍕", hint: "Cheesy round food with slices" },
    { word: "puppy", emoji: "🐶", hint: "A baby dog" },
    { word: "bunny", emoji: "🐰", hint: "A hoppy animal with long ears" },
    { word: "sheep", emoji: "🐑", hint: "A farm animal that says 'baa'" },
    { word: "koala", emoji: "🐨", hint: "A sleepy animal that hugs trees" },
    { word: "plant", emoji: "🪴", hint: "It grows in soil and needs sun" },
    { word: "music", emoji: "🎵", hint: "Songs you listen and dance to" },
    { word: "smile", emoji: "🙂", hint: "What your mouth does when happy" },
    { word: "story", emoji: "📖", hint: "A tale in a book" },
    { word: "beach", emoji: "🏖️", hint: "Sandy place by the sea" },
  ];

  /* extra real words kids are allowed to TYPE as a guess
     (they won't be the secret answer, but they're not "wrong word"). */
  const EXTRA_GUESSES = [
    "about", "above", "actor", "again", "alarm", "angel", "angry", "apron",
    "arrow", "baker", "bakes", "bears", "bench", "berry", "bingo", "black",
    "blame", "blank", "blast", "block", "blocks", "bloom", "board", "boats",
    "bones", "books", "boots", "brain", "brave", "bread", "brick", "brush",
    "bunny", "cabin", "cakes", "camel", "cards", "catch", "chair", "chalk",
    "charm", "chase", "cheek", "chess", "chest", "chick", "chief", "child",
    "chimp", "clean", "clear", "click", "climb", "clock", "color", "creek",
    "crisp", "crumb", "daisy", "diary", "drink", "drums", "ducks", "earth",
    "eight", "elbow", "every", "field", "fifty", "fight", "first", "flame",
    "flash", "float", "floor", "flour", "flute", "found", "fries", "front",
    "fruit", "funny", "games", "giant", "glass", "globe", "glove", "goats",
    "grass", "great", "green", "happy", "hello", "hills", "hippo", "honey",
    "horse", "house", "igloo", "jelly", "jolly", "jumbo", "kitty", "knife",
    "lamps", "laugh", "learn", "light", "lions", "llama", "lucky", "lunch",
    "mango", "maple", "march", "marry", "metal", "mixer", "money", "month",
    "moose", "mouth", "mummy", "music", "night", "noise", "north", "olive",
    "otter", "paint", "party", "peach", "pearl", "pedal", "penny", "phone",
    "piano", "pilot", "pixel", "plane", "plums", "polar", "pouch", "power",
    "press", "price", "pride", "prize", "proud", "quick", "quiet", "quilt",
    "radio", "rainy", "ranch", "reach", "ready", "river", "roads", "rocks",
    "round", "royal", "salad", "sandy", "scarf", "scout", "seeds", "shape",
    "share", "shark", "sheet", "shell", "shine", "shirt", "shoes", "shore",
    "sight", "skate", "slide", "slime", "small", "smart", "snack", "snail",
    "sneak", "snowy", "socks", "solar", "space", "spark", "spell", "spend",
    "spice", "spoon", "sport", "spray", "stamp", "stars", "start", "steam",
    "stick", "stone", "stork", "storm", "straw", "stump", "sugar", "sunny",
    "swing", "table", "teddy", "teeth", "thumb", "tiger", "toast", "today",
    "tooth", "torch", "tower", "trees", "trick", "truck", "trunk", "tulip",
    "twins", "uncle", "vivid", "watch", "whale", "wheel", "witch", "world",
    "worms", "yummy",
  ];

  /* ---- Easy mode: 4-letter words ---- */
  const ANSWERS4 = [
    { word: "frog", emoji: "🐸", hint: "A green animal that says 'ribbit'" },
    { word: "fish", emoji: "🐟", hint: "It swims and breathes underwater" },
    { word: "star", emoji: "⭐", hint: "A twinkly light in the night sky" },
    { word: "moon", emoji: "🌙", hint: "It glows in the sky at night" },
    { word: "cake", emoji: "🍰", hint: "A sweet treat with candles on birthdays" },
    { word: "bear", emoji: "🐻", hint: "A big furry animal that loves honey" },
    { word: "duck", emoji: "🦆", hint: "A bird that says 'quack'" },
    { word: "tree", emoji: "🌳", hint: "It has leaves, branches and a trunk" },
    { word: "snow", emoji: "❄️", hint: "Cold white fluff that falls in winter" },
    { word: "ball", emoji: "⚽", hint: "You kick or throw this round toy" },
    { word: "king", emoji: "🤴", hint: "A queen's royal partner" },
    { word: "lion", emoji: "🦁", hint: "The big cat that's king of the jungle" },
    { word: "milk", emoji: "🥛", hint: "A white drink cows give us" },
    { word: "rain", emoji: "🌧️", hint: "Water that falls from clouds" },
    { word: "boat", emoji: "⛵", hint: "It floats and carries you on water" },
    { word: "bird", emoji: "🐦", hint: "An animal with feathers that can fly" },
    { word: "swan", emoji: "🦢", hint: "A graceful white water bird" },
    { word: "kite", emoji: "🪁", hint: "You fly this on a windy day" },
    { word: "drum", emoji: "🥁", hint: "You bang it to make a beat" },
    { word: "gold", emoji: "🪙", hint: "Shiny treasure pirates love" },
    { word: "wolf", emoji: "🐺", hint: "A wild animal like a big grey dog" },
    { word: "ship", emoji: "🚢", hint: "A very big boat" },
  ];
  const EXTRA4 = [
    "bake", "bell", "blue", "book", "calm", "camp", "card", "cave", "city",
    "club", "coat", "cold", "cool", "corn", "cube", "dark", "deer", "desk",
    "dive", "doll", "door", "down", "drop", "easy", "farm", "fast", "feet",
    "film", "fire", "flag", "foot", "frog", "game", "gate", "gift", "girl",
    "goat", "good", "grow", "hand", "hare", "hill", "home", "hope", "hour",
    "jump", "kind", "lake", "lamp", "land", "leaf", "left", "lime", "love",
    "mask", "maze", "mint", "mole", "nest", "nice", "nose", "note", "palm",
    "park", "pear", "pink", "play", "plum", "pony", "pool", "rain", "rice",
    "ring", "road", "rock", "rose", "sand", "seal", "seed", "ship", "shoe",
    "sing", "sled", "slow", "song", "soft", "swan", "swim", "tail", "team",
    "toad", "town", "toys", "warm", "wave", "wind", "wing", "wolf", "yard",
    "zoom",
  ];

  /* allowed guess sets, keyed by word length */
  function buildAllowed(len, answers, extra) {
    const s = new Set();
    answers.forEach((a) => { if (a.word.length === len) s.add(a.word); });
    extra.forEach((w) => { if (w.length === len) s.add(w); });
    return s;
  }
  const ALLOWED5 = buildAllowed(5, ANSWERS, EXTRA_GUESSES);
  const ALLOWED4 = buildAllowed(4, ANSWERS4, EXTRA4);
  function answersFor() { return (LEN === 4 ? ANSWERS4 : ANSWERS).filter((a) => a.word.length === LEN); }
  function allowedFor() { return LEN === 4 ? ALLOWED4 : ALLOWED5; }

  /* ---------- saved stats ---------- */
  const SAVE_KEY = "wordGuess.v1";
  function load() {
    try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && typeof s === "object") return s; }
    catch (e) {}
    return { streak: 0, wins: 0, last: { 4: -1, 5: -1 } };
  }
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(stats)); } catch (e) {} }
  const stats = load();
  if (!stats.last || typeof stats.last !== "object") stats.last = { 4: -1, 5: -1 };

  /* ---------- refs ---------- */
  const $ = (id) => document.getElementById(id);
  const el = {
    streak: $("streak"), wins: $("wins"), hint: $("hint"), feedback: $("feedback"),
    grid: $("grid"), kb: $("kb"), hintBtn: $("hint-btn"), newBtn: $("new-btn"),
    easyBtn: $("easy-btn"), normalBtn: $("normal-btn"),
  };

  /* ---------- live state ---------- */
  let answer = null;     // current ANSWERS entry
  let row = 0;
  let guess = "";
  let over = false;
  const keyState = {};   // letter -> best status

  function pickAnswer() {
    const pool = answersFor();
    let i = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && i === stats.last[LEN]) i = (i + 1) % pool.length;
    stats.last[LEN] = i; save();
    return pool[i];
  }

  function buildGrid() {
    el.grid.innerHTML = "";
    for (let r = 0; r < TRIES; r++) {
      const rowEl = document.createElement("div");
      rowEl.className = "row";
      rowEl.dataset.row = r;
      rowEl.style.gridTemplateColumns = "repeat(" + LEN + ", 1fr)";
      for (let c = 0; c < LEN; c++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        rowEl.appendChild(cell);
      }
      el.grid.appendChild(rowEl);
    }
  }

  const KB_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
  function buildKeyboard() {
    el.kb.innerHTML = "";
    KB_ROWS.forEach((line, idx) => {
      const r = document.createElement("div");
      r.className = "kb-row";
      if (idx === 2) r.appendChild(makeKey("Enter", "enter", true));
      [...line].forEach((c) => r.appendChild(makeKey(c, c, false)));
      if (idx === 2) r.appendChild(makeKey("⌫", "back", true));
      el.kb.appendChild(r);
    });
  }
  function makeKey(label, key, wide) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "key" + (wide ? " wide" : "");
    b.textContent = label;
    b.dataset.key = key;
    b.addEventListener("click", () => handleKey(key));
    return b;
  }
  function paintKeys() {
    el.kb.querySelectorAll(".key").forEach((b) => {
      const k = b.dataset.key;
      if (k.length !== 1) return;
      b.classList.remove("correct", "present", "absent");
      if (keyState[k]) b.classList.add(keyState[k]);
    });
  }

  function rowCells(r) { return el.grid.children[r].children; }

  function render() {
    const cells = rowCells(row);
    for (let c = 0; c < LEN; c++) {
      cells[c].textContent = guess[c] || "";
      cells[c].classList.toggle("filled", !!guess[c]);
    }
  }

  function flash(msg, color) { el.feedback.style.color = color; el.feedback.textContent = msg; }

  function handleKey(key) {
    if (over) return;
    if (key === "enter") return submit();
    if (key === "back") { guess = guess.slice(0, -1); render(); return; }
    if (key.length === 1 && key >= "a" && key <= "z") {
      if (guess.length < LEN) { guess += key; render(); }
    }
  }

  function submit() {
    if (guess.length < LEN) { flash("Need " + LEN + " letters!", "var(--pink)"); badRow(); return; }
    if (!allowedFor().has(guess)) { flash("Hmm, not a word I know — try another! 🤔", "var(--pink)"); badRow(); return; }

    const target = answer.word;
    const result = scoreGuess(guess, target);
    const cells = rowCells(row);
    for (let c = 0; c < LEN; c++) {
      const cell = cells[c];
      cell.classList.add("flip", result[c]);
      const letter = guess[c];
      // upgrade keyboard colour (correct > present > absent)
      const cur = keyState[letter];
      if (result[c] === "correct" || (result[c] === "present" && cur !== "correct") ||
          (result[c] === "absent" && !cur)) {
        keyState[letter] = result[c];
      }
    }
    paintKeys();

    if (guess === target) { win(); return; }
    row += 1;
    guess = "";
    if (row >= TRIES) { lose(); }
  }

  /* two-pass scoring so duplicate letters colour correctly */
  function scoreGuess(g, target) {
    const res = new Array(LEN).fill("absent");
    const counts = {};
    for (const ch of target) counts[ch] = (counts[ch] || 0) + 1;
    for (let c = 0; c < LEN; c++) if (g[c] === target[c]) { res[c] = "correct"; counts[g[c]]--; }
    for (let c = 0; c < LEN; c++) {
      if (res[c] === "correct") continue;
      if (counts[g[c]] > 0) { res[c] = "present"; counts[g[c]]--; }
    }
    return res;
  }

  function badRow() {
    const r = el.grid.children[row];
    r.classList.remove("bad"); void r.offsetWidth; r.classList.add("bad");
  }

  function sparkleBurst() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const emojis = ["✨", "🟩", "🌟", "🎉"];
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    for (let i = 0; i < 12; i++) {
      const s = document.createElement("div");
      s.className = "sparkle"; s.textContent = emojis[i % emojis.length];
      s.style.left = (cx + (Math.random() - 0.5) * 260) + "px";
      s.style.top = (cy + (Math.random() - 0.5) * 120) + "px";
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 900);
    }
  }

  function win() {
    over = true;
    stats.wins += 1; stats.streak += 1; save();
    updateHud();
    flash("🎉 You got it in " + (row + 1) + "! The word was " + answer.word.toUpperCase(), "var(--green)");
    el.hint.textContent = answer.emoji + " " + answer.word.toUpperCase();
    sparkleBurst();
    if (window.SFX) SFX.win();
  }
  function lose() {
    over = true;
    stats.streak = 0; save();
    updateHud();
    flash("Out of tries — the word was " + answer.word.toUpperCase() + " " + answer.emoji + ". Try a new one!", "var(--pink)");
    if (window.SFX) SFX.nope();
  }

  function updateHud() { el.streak.textContent = stats.streak; el.wins.textContent = stats.wins; }

  function setMode(len) {
    if (LEN === len) { newGame(); return; }
    LEN = len;
    el.easyBtn.classList.toggle("on", LEN === 4);
    el.normalBtn.classList.toggle("on", LEN === 5);
    newGame();
  }

  function newGame() {
    answer = pickAnswer();
    row = 0; guess = ""; over = false;
    for (const k in keyState) delete keyState[k];
    el.feedback.textContent = "";
    el.hint.textContent = "";
    buildGrid();
    buildKeyboard();
    updateHud();
  }

  /* ---------- physical keyboard ---------- */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { handleKey("enter"); return; }
    if (e.key === "Backspace") { handleKey("back"); return; }
    const k = e.key.toLowerCase();
    if (k.length === 1 && k >= "a" && k <= "z") handleKey(k);
  });

  /* ---------- buttons ---------- */
  el.hintBtn.addEventListener("click", () => {
    if (!answer) return;
    el.hint.textContent = answer.emoji + "  " + answer.hint;
  });
  el.newBtn.addEventListener("click", newGame);
  el.easyBtn.addEventListener("click", () => setMode(4));
  el.normalBtn.addEventListener("click", () => setMode(5));

  /* ---------- go ---------- */
  el.normalBtn.classList.add("on");
  newGame();
})();
