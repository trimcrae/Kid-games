/* ===========================================================
   Number Grid Builder — BUILD-YOUR-OWN grid
   -----------------------------------------------------------
   Just like the Color Grid, except the columns are NUMBERS.
   A word belongs in column 5 because it HAS 5 letters.

   The kid guesses how many letters their word has, types it,
   and the game counts the letters out loud on screen —
   T¹ I² G³ E⁴ R⁵ = 5 — then drops the word into the row for
   its letter and the column for its true length. A right guess
   scores a point; a wrong one still lands in the right square,
   so the grid is always true.

   Everything is saved in the browser, per kid.
   =========================================================== */

(function () {
  var LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  var NUMS = LENGTHS.map(function (l) { return l.n; });
  var MAXLEN = NUMS[NUMS.length - 1];          // the last column is "that many OR MORE"
  var BY_NUM = {};
  LENGTHS.forEach(function (l) { BY_NUM[l.n] = l; });

  // Each kid gets their own saved grid.
  var KIDS = [
    { id: "jeannie", name: "Jeannie", emoji: "📚", color: "#ff6fa5" },
    { id: "cory",    name: "Cory",    emoji: "🟦", color: "#2b8cff" },
    { id: "ellie",   name: "Ellie",   emoji: "👑", color: "#9b3fc4" }
  ];
  var CURRENT_KID_KEY = "mcrae.currentKid";

  // Three ways to file a word: by its first letter, a middle letter, or its
  // last letter. Each variant keeps its OWN grid so the lists don't mix.
  var VARIANTS = [
    { id: "start",  label: "Start",  emoji: "🏁", desc: "first letter" },
    { id: "middle", label: "Middle", emoji: "🎯", desc: "a middle letter" },
    { id: "end",    label: "End",    emoji: "🔚", desc: "last letter" }
  ];
  var VARIANT_KEY = "numberGrid.variant";

  // emoji lookup so starter words (and re-typed favourites) show a picture
  var EMOJI = {};
  if (typeof ENTRIES !== "undefined") {
    ENTRIES.forEach(function (e) { if (e.e) EMOJI[e.w.toLowerCase()] = e.e; });
  }

  var MILESTONES = [10, 25, 50, 100, 150, 200];

  var kidRow = document.getElementById("kid-row");
  var variantRow = document.getElementById("variant-row");
  var numRow = document.getElementById("num-row");
  var form = document.getElementById("add-form");
  var input = document.getElementById("word-input");
  var hint = document.getElementById("hint");
  var howEl = document.getElementById("how");
  var chooser = document.getElementById("chooser");
  var countoutEl = document.getElementById("countout");
  var countEl = document.getElementById("count");
  var scoreEl = document.getElementById("score");
  var triesEl = document.getElementById("tries");
  var gridBody = document.getElementById("grid-body");
  var gridHead = document.getElementById("grid-head");
  var starterBtn = document.getElementById("starter");
  var clearBtn = document.getElementById("clear");
  var questEl = document.getElementById("quest");
  var questTextEl = document.getElementById("quest-text");
  var questHintBtn = document.getElementById("quest-hint");
  var questNewBtn = document.getElementById("quest-new");
  var starsEl = document.getElementById("stars");

  var currentKid = localStorage.getItem(CURRENT_KID_KEY) || "cory";
  if (!KIDS.some(function (k) { return k.id === currentKid; })) currentKid = "cory";

  var activeVariant = localStorage.getItem(VARIANT_KEY) || "start";
  if (!VARIANTS.some(function (v) { return v.id === activeVariant; })) activeVariant = "start";

  // grid data: { "C|5": ["Candy", "Crown"], ... }
  var grid = load();
  var activeGuess = 5;   // the number the kid currently has picked

  /* ---------- counting letters ---------- */
  // Only A–Z counts, so "Spider-Man" is 9 and "X-ray" is 4.
  function lettersOf(word) { return word.toUpperCase().match(/[A-Z]/g) || []; }
  // Which column a word lives in (everything long piles into the last one).
  function columnFor(n) { return Math.min(n, MAXLEN); }

  /* ---------- storage (namespaced per kid + variant) ---------- */
  function storageKey() {
    var base = "numberGrid.v1:" + currentKid;
    return activeVariant === "start" ? base : base + ":" + activeVariant;
  }
  function load() {
    try {
      var raw = localStorage.getItem(storageKey());
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }
  function save() {
    try { localStorage.setItem(storageKey(), JSON.stringify(grid)); } catch (e) {}
  }
  function keyFor(letter, num) { return letter + "|" + num; }

  /* ---------- quest stars (per kid) ---------- */
  function starsKey() { return "numberGrid.stars:" + currentKid; }
  function loadStars() {
    try { return parseInt(localStorage.getItem(starsKey()), 10) || 0; } catch (e) { return 0; }
  }
  function addStar() {
    try { localStorage.setItem(starsKey(), String(loadStars() + 1)); } catch (e) {}
    renderStars();
  }
  function renderStars() { starsEl.textContent = String(loadStars()); }

  /* ---------- guessing score (per kid) ---------- */
  function scoreKey() { return "numberGrid.score:" + currentKid; }
  function loadScore() {
    try {
      var raw = JSON.parse(localStorage.getItem(scoreKey()));
      if (raw && typeof raw.right === "number" && typeof raw.tries === "number") return raw;
    } catch (e) {}
    return { right: 0, tries: 0 };
  }
  function bumpScore(wasRight) {
    var s = loadScore();
    s.tries += 1;
    if (wasRight) s.right += 1;
    try { localStorage.setItem(scoreKey(), JSON.stringify(s)); } catch (e) {}
    renderScore();
  }
  function renderScore() {
    var s = loadScore();
    scoreEl.textContent = String(s.right);
    triesEl.textContent = String(s.tries);
  }

  /* ---------- build the kid picker ---------- */
  KIDS.forEach(function (kid) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "kid-pick";
    btn.style.setProperty("--kc", kid.color);
    btn.innerHTML = '<span aria-hidden="true">' + kid.emoji + "</span> " + kid.name;
    btn.dataset.kid = kid.id;
    btn.addEventListener("click", function () { setKid(kid.id); });
    kidRow.appendChild(btn);
  });

  function setKid(id) {
    currentKid = id;
    localStorage.setItem(CURRENT_KID_KEY, id);
    [].forEach.call(kidRow.children, function (b) {
      b.classList.toggle("selected", b.dataset.kid === id);
    });
    hideChooser();
    hideCountout();
    grid = load();
    renderAll();
    renderStars();
    renderScore();
    initQuest();
    var kid = KIDS.filter(function (k) { return k.id === id; })[0];
    flashHint(kid.name + "'s grid — type away! ✨", false);
  }

  /* ---------- build the variant picker ---------- */
  VARIANTS.forEach(function (v) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "variant-pick";
    btn.innerHTML = '<span aria-hidden="true">' + v.emoji + "</span> " + v.label +
      "<small>" + v.desc + "</small>";
    btn.dataset.variant = v.id;
    btn.setAttribute("aria-label", v.label + " — file each word by its " + v.desc);
    btn.addEventListener("click", function () { setVariant(v.id); });
    variantRow.appendChild(btn);
  });

  function setVariant(id) {
    activeVariant = id;
    localStorage.setItem(VARIANT_KEY, id);
    [].forEach.call(variantRow.children, function (b) {
      b.classList.toggle("selected", b.dataset.variant === id);
    });
    hideChooser();
    hideCountout();
    grid = load();
    renderAll();
    initQuest();
    updateHow();
  }

  function updateHow() {
    var v = VARIANTS.filter(function (x) { return x.id === activeVariant; })[0];
    var where = v.id === "start" ? "the row for its <b>first</b> letter"
      : v.id === "end" ? "the row for its <b>last</b> letter"
      : "a row you pick for one of its <b>middle</b> letters";
    howEl.innerHTML =
      "Tap your name and a <b>variant</b> (Start, Middle or End), guess <b>how many " +
      "letters</b> your word has, then type it and press <b>Add</b> — we count the " +
      "letters together and it lands in " + where + ", in the column for its " +
      "<b>length</b>! ✨";
  }

  /* ---------- build the number picker ---------- */
  LENGTHS.forEach(function (l) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "num-pick";
    btn.style.background = l.hex;
    btn.style.color = l.dark ? "#2b2440" : "#fff";
    btn.textContent = l.label;
    btn.setAttribute("aria-label", l.n === MAXLEN
      ? "Guess " + l.n + " letters or more"
      : "Guess " + l.n + " letters");
    btn.dataset.num = String(l.n);
    btn.addEventListener("click", function () { setGuess(l.n); });
    numRow.appendChild(btn);
  });

  function setGuess(num) {
    activeGuess = num;
    var l = BY_NUM[num];
    [].forEach.call(numRow.children, function (b) {
      b.classList.toggle("selected", b.dataset.num === String(num));
    });
    // tint the input so the guess is obvious
    input.style.borderColor = l.hex;
    input.style.background = l.hex + "22";
    input.focus();
  }

  /* ---------- build the grid table ---------- */
  function buildGrid() {
    // header: corner + one column per word length
    var headRow = document.createElement("tr");
    headRow.appendChild(cell("th", "", "corner"));
    LENGTHS.forEach(function (l) {
      var th = document.createElement("th");
      th.className = "col-head";
      th.style.background = l.hex;
      th.style.color = l.dark ? "#2b2440" : "#fff";
      th.innerHTML = l.label + "<small>letter" + (l.n === 1 ? "" : "s") +
        (l.n === MAXLEN ? " or more" : "") + "</small>";
      headRow.appendChild(th);
    });
    gridHead.appendChild(headRow);

    // one row per letter
    LETTERS.forEach(function (letter) {
      var tr = document.createElement("tr");
      tr.appendChild(cell("th", letter, "row-head"));
      NUMS.forEach(function (n) {
        var td = document.createElement("td");
        td.className = "cell";
        td.id = "c-" + letter + "-" + n;
        tr.appendChild(td);
      });
      gridBody.appendChild(tr);
    });
  }

  function cell(tag, text, cls) {
    var el = document.createElement(tag);
    el.className = cls;
    el.textContent = text;
    return el;
  }

  /* ---------- render words into a cell ---------- */
  function renderCell(letter, num) {
    var td = document.getElementById("c-" + letter + "-" + num);
    if (!td) return;
    td.innerHTML = "";
    var words = grid[keyFor(letter, num)] || [];
    words.forEach(function (word, i) {
      var chip = document.createElement("span");
      chip.className = "chip";
      var l = BY_NUM[num];
      chip.style.background = l.hex;
      chip.style.color = l.dark ? "#2b2440" : "#fff";
      var emoji = EMOJI[word.toLowerCase()];
      chip.innerHTML = (emoji ? '<span aria-hidden="true">' + emoji + "</span>" : "") +
        "<span>" + escapeHtml(word) + "</span>" +
        '<button class="chip-x" aria-label="Remove ' + escapeHtml(word) + '">×</button>';
      chip.querySelector(".chip-x").addEventListener("click", function () {
        removeWord(letter, num, i);
      });
      td.appendChild(chip);
    });
  }

  function renderAll() {
    LETTERS.forEach(function (letter) {
      NUMS.forEach(function (n) { renderCell(letter, n); });
    });
    updateCount();
  }

  function updateCount() {
    var total = 0;
    Object.keys(grid).forEach(function (k) { total += grid[k].length; });
    countEl.textContent = String(total);
    return total;
  }

  /* ---------- count the letters out on screen ----------
     T¹ I² G³ E⁴ R⁵  =  5 letters — the whole point of the game. */
  function showCountout(word, letters, num, guess) {
    var l = BY_NUM[columnFor(num)];
    countoutEl.innerHTML = "";
    countoutEl.style.display = "flex";
    letters.forEach(function (ch, i) {
      var span = document.createElement("span");
      span.className = "co-letter";
      span.style.setProperty("--cc", l.hex);
      span.style.color = l.dark ? "#2b2440" : "#fff";
      span.style.animationDelay = (i * 0.13) + "s";
      span.innerHTML = escapeHtml(ch) + "<b>" + (i + 1) + "</b>";
      countoutEl.appendChild(span);
    });
    var total = document.createElement("span");
    total.className = "co-total " + (guess === columnFor(num) ? "right" : "wrong");
    total.style.animationDelay = (letters.length * 0.13) + "s";
    total.textContent = "= " + num + " letter" + (num === 1 ? "" : "s") +
      (guess === columnFor(num) ? "  ✅ you guessed it!" : "  (you guessed " + labelFor(guess) + ")");
    countoutEl.appendChild(total);
  }
  function hideCountout() {
    countoutEl.style.display = "none";
    countoutEl.innerHTML = "";
  }
  function labelFor(num) { return BY_NUM[num] ? BY_NUM[num].label : String(num); }

  /* ---------- word quests ----------
     "add a 6-letter word to row B!" Quests only use (letter, length)
     pairs the starter list proves have an answer, and prefer squares
     that are still empty. Completing one earns a star (saved per kid). */
  var quest = null;

  function questKey() { return "numberGrid.quest:" + currentKid + ":" + activeVariant; }

  // every (letter, length) pair that ENTRIES can answer under this variant
  function questPairs() {
    var byKey = {};
    if (typeof ENTRIES !== "undefined") {
      ENTRIES.forEach(function (e) {
        var letters = lettersOf(e.w);
        if (!letters.length) return;
        var k = keyFor(starterLetter(e.w), columnFor(letters.length));
        (byKey[k] = byKey[k] || []).push(e);
      });
    }
    return byKey;
  }

  // prefer squares that are still empty; once the grid is well fed, any
  // provable pair works — "add ANOTHER word to…"
  function questCandidates() {
    var byKey = questPairs();
    var empty = [], all = [];
    Object.keys(byKey).forEach(function (k) {
      var bits = k.split("|");
      var cand = { letter: bits[0], num: parseInt(bits[1], 10) };
      all.push(cand);
      if (!grid[k] || !grid[k].length) empty.push(cand);
    });
    return empty.length ? empty : all;
  }

  function newQuest() {
    var cands = questCandidates();
    if (!cands.length) {
      quest = null;
      try { localStorage.removeItem(questKey()); } catch (e) {}
      renderQuest();
      return;
    }
    var q = cands[Math.floor(Math.random() * cands.length)];
    quest = { letter: q.letter, num: q.num };
    try { localStorage.setItem(questKey(), JSON.stringify(quest)); } catch (e) {}
    renderQuest();
  }

  // reload the saved quest (or roll a fresh one) for this kid + variant
  function initQuest() {
    quest = null;
    try {
      var raw = localStorage.getItem(questKey());
      if (raw) quest = JSON.parse(raw);
    } catch (e) { quest = null; }
    if (quest && !BY_NUM[quest.num]) quest = null;
    if (quest) renderQuest();
    else newQuest();
  }

  function renderQuest() {
    questEl.classList.remove("done");
    if (!quest) {
      questTextEl.innerHTML = "🏆 Wow — you've filled every quest square! Free play time!";
      questHintBtn.style.display = "none";
      questNewBtn.style.display = "none";
      return;
    }
    questHintBtn.style.display = "";
    questNewBtn.style.display = "";
    var l = BY_NUM[quest.num];
    var another = (grid[keyFor(quest.letter, quest.num)] || []).length ? "another" : "a";
    questTextEl.innerHTML = "⭐ Quest: add " + another + ' <b class="qnum" style="background:' + l.hex +
      ";color:" + (l.dark ? "#2b2440" : "#fff") + '">' + l.label + "-letter</b> word to row <b>" +
      quest.letter + "</b>!";
  }

  function questComplete() {
    addStar();
    questEl.classList.add("done");
    questTextEl.innerHTML = "🌟 Quest complete! You earned a star!";
    questHintBtn.style.display = "none";
    window.SFX && SFX.win();
    window.Confetti && Confetti.burst({ count: 70 });
    setTimeout(newQuest, 1800);
  }

  questHintBtn.addEventListener("click", function () {
    if (!quest) return;
    var key = keyFor(quest.letter, quest.num);
    var answers = questPairs()[key] || [];
    // suggest a word that isn't already in the square
    var inCell = (grid[key] || []).map(function (w) { return w.toLowerCase(); });
    var fresh = answers.filter(function (a) { return inCell.indexOf(a.w.toLowerCase()) === -1; });
    var list = fresh.length ? fresh : answers;
    if (!list.length) return;
    var a = list[Math.floor(Math.random() * list.length)];
    flashHint('Psst… how about "' + a.w + '"? ' + (a.e || "💡"), false);
    input.focus();
  });

  questNewBtn.addEventListener("click", function () {
    newQuest();
    flashHint("New quest! 🔄", false);
  });

  /* ---------- add / remove ---------- */
  function addWord(raw) {
    var word = raw.trim().replace(/\s+/g, " ");
    if (!word) return;

    var letters = lettersOf(word);
    if (!letters.length) {
      flashHint("Try a word with some letters in it! 🙂", true);
      shake();
      window.SFX && SFX.nope();
      return;
    }

    if (activeVariant === "start") {
      placeWord(word, letters[0]);
    } else if (activeVariant === "end") {
      placeWord(word, letters[letters.length - 1]);
    } else {
      // middle: for short words the middle is obvious; longer ones need a pick.
      if (letters.length <= 3) {
        placeWord(word, letters[Math.floor(letters.length / 2)]);
      } else {
        showChooser(word, letters);
      }
    }
  }

  // File `word` into the row for `letter`. The COLUMN is never a choice —
  // it's however many letters the word really has.
  function placeWord(word, letter) {
    var letters = lettersOf(word);
    var len = letters.length;
    var num = columnFor(len);
    var guessedRight = num === activeGuess;
    var key = keyFor(letter, num);
    if (!grid[key]) grid[key] = [];

    // avoid exact duplicates in the same cell
    var exists = grid[key].some(function (w) {
      return w.toLowerCase() === word.toLowerCase();
    });
    if (!exists) grid[key].push(word);

    save();
    renderCell(letter, num);
    var total = updateCount();
    bumpScore(guessedRight);
    showCountout(word, letters, len, activeGuess);

    var td = document.getElementById("c-" + letter + "-" + num);
    td.classList.remove("flash");
    void td.offsetWidth; // restart animation
    td.classList.add("flash");
    td.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });

    var how = activeVariant === "end" ? "ends in " + letter
      : activeVariant === "middle" ? "counts as " + letter
      : "starts with " + letter;
    if (guessedRight) {
      flashHint('🎯 Spot on! "' + word + '" has ' + len + " letters and " + how + "!", false);
      window.SFX && SFX.coin();
    } else {
      flashHint('"' + word + '" really has ' + len + " letters — into the " +
        labelFor(num) + " column it goes! " + how.charAt(0).toUpperCase() + how.slice(1) + ".", false);
      window.SFX && SFX.good();
    }
    input.value = "";
    input.focus();

    // did that finish the quest? (any NEW word in the quest square counts)
    if (!exists && quest && quest.letter === letter && quest.num === num) {
      questComplete();
    } else if (!exists && MILESTONES.indexOf(total) !== -1) {
      // grid-size milestone party
      flashHint("🎉 " + total + " words in the grid — amazing!", false);
      window.SFX && SFX.win();
      window.Confetti && Confetti.burst({ count: 60 });
    }
  }

  /* ---------- middle-variant "which letter?" chooser ---------- */
  function showChooser(word, letters) {
    chooser.innerHTML = "";
    var label = document.createElement("div");
    label.className = "chooser-label";
    label.textContent = 'Which middle letter should "' + word + '" count as?';
    chooser.appendChild(label);

    var row = document.createElement("div");
    row.className = "chooser-letters";
    letters.forEach(function (ch, idx) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "letter-pick";
      b.textContent = ch;
      if (idx === 0 || idx === letters.length - 1) {
        // first & last aren't "middle" — show them, but greyed out
        b.classList.add("edge");
        b.disabled = true;
      } else {
        b.setAttribute("aria-label", "File " + word + " in row " + ch);
        b.addEventListener("click", function () {
          hideChooser();
          placeWord(word, ch);
        });
      }
      row.appendChild(b);
    });
    chooser.appendChild(row);
    chooser.style.display = "flex";
    flashHint("Tap a middle letter to file it. 👆", false);
  }

  function hideChooser() {
    chooser.style.display = "none";
    chooser.innerHTML = "";
  }

  function removeWord(letter, num, index) {
    var key = keyFor(letter, num);
    if (!grid[key]) return;
    grid[key].splice(index, 1);
    if (grid[key].length === 0) delete grid[key];
    save();
    renderCell(letter, num);
    updateCount();
    window.SFX && SFX.pop();
  }

  /* ---------- helpers ---------- */
  function flashHint(msg, isError) {
    hint.textContent = msg;
    hint.style.color = isError ? "#e23b3b" : "#7a52d6";
  }
  function shake() {
    input.classList.remove("shake");
    void input.offsetWidth;
    input.classList.add("shake");
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* ---------- starter words & clear ---------- */
  // Which letter a starter word lands in depends on the active variant.
  function starterLetter(word) {
    var letters = lettersOf(word);
    if (!letters.length) return "A";
    if (activeVariant === "end") return letters[letters.length - 1];
    if (activeVariant === "middle") return letters[Math.floor(letters.length / 2)];
    return letters[0];
  }

  starterBtn.addEventListener("click", function () {
    if (typeof ENTRIES === "undefined") return;
    ENTRIES.forEach(function (e) {
      var letters = lettersOf(e.w);
      if (!letters.length) return;
      var key = keyFor(starterLetter(e.w), columnFor(letters.length));
      if (!grid[key]) grid[key] = [];
      var exists = grid[key].some(function (w) {
        return w.toLowerCase() === e.w.toLowerCase();
      });
      if (!exists) grid[key].push(e.w);
    });
    save();
    renderAll();
    initQuest(); // the starter words may have filled the quest square
    flashHint("Loaded some starter words — add your own too! ✨", false);
  });

  clearBtn.addEventListener("click", function () {
    if (!window.confirm("Clear the whole grid? This can't be undone.")) return;
    hideChooser();
    hideCountout();
    grid = {};
    save();
    renderAll();
    newQuest();
    flashHint("Fresh grid — start typing! ✨", false);
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    addWord(input.value);
  });

  /* ---------- go ---------- */
  buildGrid();
  renderAll();
  renderStars();
  renderScore();
  initQuest();
  setGuess(activeGuess);
  updateHow();
  if (updateCount() === 0) {
    flashHint("Your grid is empty — guess a number and type your first word! 🔢", false);
  }
  [].forEach.call(kidRow.children, function (b) {
    b.classList.toggle("selected", b.dataset.kid === currentKid);
  });
  [].forEach.call(variantRow.children, function (b) {
    b.classList.toggle("selected", b.dataset.variant === activeVariant);
  });
})();
