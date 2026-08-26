/* ===========================================================
   Number Grid Builder — BUILD-YOUR-OWN grid + Quick Count
   -----------------------------------------------------------
   Just like the Color Grid, except the columns are NUMBERS.
   A word belongs in column 5 because it HAS 5 letters.

   There are three tabs, and they're a deliberate ladder:

     ✍️ Build        guess a length, type a word, watch the game
                     count it out — T¹ I² G³ E⁴ R⁵ = 5 — and drop
                     it in the right square. A wrong guess is
                     explained in words ("you said 4, but CANDY is
                     5 — one more than you thought").
     ⚡ Quick Count   the game supplies the words. Level 1 is
                     count-only (no typing, so Ellie can play),
                     level 2 compares two words (longer? how many
                     more?), level 3 is the grown-up tier — big
                     words plus difference and total questions.
     📊 Stats        what the finished grid says: mode (most common
                     length), mean, longest word, squares filled,
                     and a bar chart of the whole column.

   Everything is saved in the browser, per kid. The storage keys
   from the first version are read and written unchanged, so an
   old grid comes straight back.
   =========================================================== */

(function () {
  "use strict";

  var LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  var NUMS = LENGTHS.map(function (l) { return l.n; });
  var MAXLEN = NUMS[NUMS.length - 1];          // the last column is "that many OR MORE"
  var TOTAL_SQUARES = LETTERS.length * NUMS.length;
  var BY_NUM = {};
  LENGTHS.forEach(function (l) { BY_NUM[l.n] = l; });

  var REDUCE = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  // Each player gets their own saved grid. Shannon plays too — she starts
  // on the grown-up level with the big-words pack.
  var KIDS = [
    { id: "jeannie", name: "Jeannie", emoji: "📚", color: "#d43d76" },
    { id: "cory",    name: "Cory",    emoji: "🟦", color: "#1e6fd9" },
    { id: "ellie",   name: "Ellie",   emoji: "👑", color: "#8331ad" },
    { id: "shannon", name: "Mum",     emoji: "👩", color: "#00807f" }
  ];
  var KID_DEFAULTS = {
    ellie:   { level: "count",   pack: "animals" },
    cory:    { level: "compare", pack: "mine" },
    jeannie: { level: "compare", pack: "all" },
    shannon: { level: "grown",   pack: "big" }
  };
  var CURRENT_KID_KEY = "mcrae.currentKid";

  // Three ways to file a word: by its first letter, a middle letter, or its
  // last letter. Each variant keeps its OWN grid so the lists don't mix.
  var VARIANTS = [
    { id: "start",  label: "Start",  emoji: "🏁", desc: "first letter" },
    { id: "middle", label: "Middle", emoji: "🎯", desc: "a middle letter" },
    { id: "end",    label: "End",    emoji: "🔚", desc: "last letter" }
  ];
  var VARIANT_KEY = "numberGrid.variant";

  // The Quick Count ladder.
  var LEVELS = [
    { id: "count",   label: "Count",    emoji: "🔢", desc: "how many letters?" },
    { id: "compare", label: "Compare",  emoji: "⚖️", desc: "longer? how many more?" },
    { id: "grown",   label: "Grown-up", emoji: "🧠", desc: "big words & maths" }
  ];
  // Which question kinds each level rotates through.
  var LEVEL_KINDS = {
    count:   ["count", "count", "count"],
    compare: ["longer", "count", "diff", "shorter", "diff", "count"],
    grown:   ["diff", "total", "count", "diff", "longer", "total"]
  };

  var ALL_PACK = { id: "all", label: "Everything", emoji: "🌈" };
  var PACKS = [ALL_PACK].concat(typeof THEMES !== "undefined" ? THEMES : []);

  // emoji lookup so starter words (and re-typed favourites) show a picture
  var EMOJI = {};
  if (typeof ENTRIES !== "undefined") {
    ENTRIES.forEach(function (e) { if (e.e) EMOJI[e.w.toLowerCase()] = e.e; });
  }

  var MILESTONES = [10, 25, 50, 100, 150, 200, 250];
  var NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five",
                      "six", "seven", "eight", "nine", "ten"];

  /* ---------- elements ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var kidRow = $("kid-row");
  var packRow = $("pack-row");
  var packsBox = $("packs");
  var packsSummary = $("packs-summary");
  var variantRow = $("variant-row");
  var numRow = $("num-row");
  var levelRow = $("level-row");
  var form = $("add-form");
  var input = $("word-input");
  var hint = $("hint");
  var howEl = $("how");
  var chooser = $("chooser");
  var countoutEl = $("countout");
  var countEl = $("count");
  var scoreEl = $("score");
  var triesEl = $("tries");
  var streakEl = $("streak");
  var bestStreakEl = $("best-streak");
  var gridBody = $("grid-body");
  var gridHead = $("grid-head");
  var gridFoot = $("grid-foot");
  var starterBtn = $("starter");
  var clearBtn = $("clear");
  var questEl = $("quest");
  var questTextEl = $("quest-text");
  var questHintBtn = $("quest-hint");
  var questNewBtn = $("quest-new");
  var starsEl = $("stars");
  var qcard = $("qcard");
  var streakLine = $("streak-line");
  var quizSkipBtn = $("quiz-skip");
  var statCards = $("stat-cards");
  var barsEl = $("bars");
  var chartNote = $("chart-note");
  var progressLabel = $("progress-label");
  var progressFill = $("progress-fill");
  var filterBtn = $("filter-empty");
  var gridScroll = document.querySelector(".grid-scroll");

  var TABS = [
    { btn: $("tab-build"), panel: $("panel-build"), id: "build" },
    { btn: $("tab-quiz"),  panel: $("panel-quiz"),  id: "quiz" },
    { btn: $("tab-stats"), panel: $("panel-stats"), id: "stats" }
  ];

  /* ---------- who's playing ---------- */
  var currentKid = localStorage.getItem(CURRENT_KID_KEY) || "cory";
  if (!KIDS.some(function (k) { return k.id === currentKid; })) currentKid = "cory";

  var activeVariant = readKey(VARIANT_KEY, "start");
  if (!VARIANTS.some(function (v) { return v.id === activeVariant; })) activeVariant = "start";

  var activePack = "all";
  var activeLevel = "count";
  var activeTab = readKey("numberGrid.tab", "build");
  if (!TABS.some(function (t) { return t.id === activeTab; })) activeTab = "build";

  // grid data: { "C|5": ["Candy", "Crown"], ... }
  var grid = {};
  var activeGuess = 5;   // the number the kid currently has picked
  var rowEls = {};       // letter -> <tr>, so we can hide empty rows fast
  var tallyEls = {};     // column number -> <td> in the footer
  var quizQ = null;      // the live Quick Count question
  var quizTimer = null;

  /* ---------- tiny storage helpers (never throw) ---------- */
  function readKey(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v === null ? fallback : v;
    } catch (e) { return fallback; }
  }
  function writeKey(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }

  /* ---------- counting letters ---------- */
  // Only A–Z counts, so "Spider-Man" is 9 and "X-ray" is 4.
  function lettersOf(word) { return String(word).toUpperCase().match(/[A-Z]/g) || []; }
  function lenOf(word) { return lettersOf(word).length; }
  // Which column a word lives in (everything long piles into the last one).
  function columnFor(n) { return Math.min(n, MAXLEN); }
  function labelFor(num) { return BY_NUM[num] ? BY_NUM[num].label : String(num); }
  // "C-A-N-D-Y" — the way we say it out loud
  function spellOut(word) { return lettersOf(word).join("-"); }
  function numberWord(n) { return NUMBER_WORDS[n] || String(n); }
  function plural(n) { return n === 1 ? "letter" : "letters"; }

  /* ---------- storage (namespaced per kid + variant) ---------- */
  function storageKey() {
    var base = "numberGrid.v1:" + currentKid;
    return activeVariant === "start" ? base : base + ":" + activeVariant;
  }
  function load() {
    try {
      var raw = localStorage.getItem(storageKey());
      var obj = raw ? JSON.parse(raw) : {};
      // be defensive: a hand-edited or half-written save must never crash us
      if (!obj || typeof obj !== "object") return {};
      Object.keys(obj).forEach(function (k) {
        if (!Array.isArray(obj[k])) delete obj[k];
      });
      return obj;
    } catch (e) { return {}; }
  }
  function save() {
    writeKey(storageKey(), JSON.stringify(grid));
  }
  function keyFor(letter, num) { return letter + "|" + num; }

  /* ---------- per-kid settings ---------- */
  function loadKidSettings() {
    var d = KID_DEFAULTS[currentKid] || { level: "count", pack: "all" };
    activePack = readKey("numberGrid.pack:" + currentKid, d.pack);
    if (!PACKS.some(function (p) { return p.id === activePack; })) activePack = "all";
    activeLevel = readKey("numberGrid.level:" + currentKid, d.level);
    if (!LEVELS.some(function (l) { return l.id === activeLevel; })) activeLevel = "count";
  }

  /* ---------- quest stars (per kid) ---------- */
  function starsKey() { return "numberGrid.stars:" + currentKid; }
  function loadStars() { return parseInt(readKey(starsKey(), "0"), 10) || 0; }
  function addStar() {
    writeKey(starsKey(), String(loadStars() + 1));
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
    writeKey(scoreKey(), JSON.stringify(s));
    bumpStreak(wasRight);
    renderScore();
  }
  function renderScore() {
    var s = loadScore();
    scoreEl.textContent = String(s.right);
    triesEl.textContent = String(s.tries);
  }

  /* ---------- streaks (per kid) — a reason to keep going ---------- */
  function streakKey() { return "numberGrid.streak:" + currentKid; }
  function loadStreak() {
    try {
      var raw = JSON.parse(localStorage.getItem(streakKey()));
      if (raw && typeof raw.cur === "number" && typeof raw.best === "number") return raw;
    } catch (e) {}
    return { cur: 0, best: 0 };
  }
  function bumpStreak(wasRight) {
    var s = loadStreak();
    s.cur = wasRight ? s.cur + 1 : 0;
    if (s.cur > s.best) s.best = s.cur;
    writeKey(streakKey(), JSON.stringify(s));
    renderStreak();
    if (wasRight && s.cur >= 3) {
      window.SFX && SFX.streak && SFX.streak(s.cur);
      if (s.cur === 5 || s.cur === 10 || s.cur === 20) {
        window.Confetti && Confetti.burst({ count: 50 });
      }
    }
    return s;
  }
  function renderStreak() {
    var s = loadStreak();
    streakEl.textContent = String(s.cur);
    bestStreakEl.textContent = String(s.best);
  }

  /* ---------- pickers ---------- */
  function pillButton(cls, html, aria) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "pill " + cls;
    b.innerHTML = html;
    b.setAttribute("aria-pressed", "false");
    if (aria) b.setAttribute("aria-label", aria);
    return b;
  }
  function markPressed(container, attr, value) {
    [].forEach.call(container.children, function (b) {
      b.setAttribute("aria-pressed", b.dataset[attr] === value ? "true" : "false");
    });
  }

  KIDS.forEach(function (kid) {
    var btn = pillButton("kid-pick",
      '<span aria-hidden="true">' + kid.emoji + "</span> " + kid.name,
      kid.name + "'s grid");
    btn.style.setProperty("--kc", kid.color);
    btn.dataset.kid = kid.id;
    btn.addEventListener("click", function () { setKid(kid.id); });
    kidRow.appendChild(btn);
  });

  function setKid(id) {
    currentKid = id;
    writeKey(CURRENT_KID_KEY, id);
    markPressed(kidRow, "kid", id);
    loadKidSettings();
    markPressed(packRow, "pack", activePack);
    markPressed(levelRow, "level", activeLevel);
    updatePackSummary();
    hideChooser();
    hideCountout();
    grid = load();
    renderAll();
    renderStars();
    renderScore();
    renderStreak();
    initQuest();
    newQuizQuestion();
    renderStatsPanel();
    var kid = KIDS.filter(function (k) { return k.id === id; })[0];
    flashHint(kid.name + "'s grid — " + updateCount() + " words so far. ✨", false);
  }

  PACKS.forEach(function (p) {
    var btn = pillButton("pack-pick",
      '<span aria-hidden="true">' + p.emoji + "</span> " + p.label,
      "Word pack: " + p.label);
    btn.dataset.pack = p.id;
    btn.addEventListener("click", function () { setPack(p.id); });
    packRow.appendChild(btn);
  });

  function packById(id) {
    return PACKS.filter(function (p) { return p.id === id; })[0] || ALL_PACK;
  }
  function updatePackSummary() {
    var p = packById(activePack);
    packsSummary.innerHTML = '<span aria-hidden="true">🎒</span> Word pack: <b>' +
      escapeHtml(p.label) + "</b> " + p.emoji;
  }
  function setPack(id) {
    activePack = id;
    writeKey("numberGrid.pack:" + currentKid, id);
    markPressed(packRow, "pack", id);
    updatePackSummary();
    newQuizQuestion();
    flashHint("Word pack: " + packById(id).label + " " + packById(id).emoji, false);
  }

  VARIANTS.forEach(function (v) {
    var btn = pillButton("variant-pick",
      '<span aria-hidden="true">' + v.emoji + "</span> " + v.label +
      "<small>" + v.desc + "</small>",
      v.label + " — file each word by its " + v.desc);
    btn.dataset.variant = v.id;
    btn.addEventListener("click", function () { setVariant(v.id); });
    variantRow.appendChild(btn);
  });

  function setVariant(id) {
    activeVariant = id;
    writeKey(VARIANT_KEY, id);
    markPressed(variantRow, "variant", id);
    hideChooser();
    hideCountout();
    grid = load();
    renderAll();
    initQuest();
    renderStatsPanel();
    updateHow();
  }

  LEVELS.forEach(function (l) {
    var btn = pillButton("level-pick",
      '<span aria-hidden="true">' + l.emoji + "</span> " + l.label +
      "<small>" + l.desc + "</small>",
      l.label + " level — " + l.desc);
    btn.dataset.level = l.id;
    btn.addEventListener("click", function () { setLevel(l.id); });
    levelRow.appendChild(btn);
  });

  function setLevel(id) {
    activeLevel = id;
    writeKey("numberGrid.level:" + currentKid, id);
    markPressed(levelRow, "level", id);
    newQuizQuestion();
  }

  function updateHow() {
    var v = VARIANTS.filter(function (x) { return x.id === activeVariant; })[0];
    var where = v.id === "start" ? "the row for its <b>first</b> letter"
      : v.id === "end" ? "the row for its <b>last</b> letter"
      : "a row you pick for one of its <b>middle</b> letters";
    howEl.innerHTML =
      "Guess <b>how many letters</b> a word has — we count them out together " +
      "(C-A-N-D-Y = 5) and it lands in " + where + ", in the column for its " +
      "<b>length</b>. Try <b>⚡ Quick Count</b> for no-typing rounds and " +
      "<b>📊 Stats</b> to see what your grid says. ✨";
  }

  /* ---------- build the number picker ---------- */
  LENGTHS.forEach(function (l) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "num-pick";
    btn.style.background = l.hex;
    btn.style.color = l.dark ? "#2b2440" : "#fff";
    btn.textContent = l.label;
    btn.setAttribute("aria-pressed", "false");
    btn.setAttribute("aria-label", l.n === MAXLEN
      ? "Guess " + l.n + " letters or more"
      : "Guess " + l.n + " letters");
    btn.dataset.num = String(l.n);
    btn.addEventListener("click", function () { setGuess(l.n, true); });
    numRow.appendChild(btn);
  });

  function setGuess(num, fromUser) {
    if (!BY_NUM[num]) return;
    activeGuess = num;
    var l = BY_NUM[num];
    markPressed(numRow, "num", String(num));
    // tint the input so the guess is obvious
    input.style.borderColor = l.hex;
    input.style.background = l.hex + "22";
    if (fromUser) input.focus();
  }

  /* ---------- build the grid table ---------- */
  function buildGrid() {
    // header: corner + one column per word length
    var headRow = document.createElement("tr");
    headRow.appendChild(cell("th", "", "corner"));
    LENGTHS.forEach(function (l) {
      var th = document.createElement("th");
      th.className = "col-head";
      th.scope = "col";
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
      var th = cell("th", letter, "row-head");
      th.scope = "row";
      tr.appendChild(th);
      NUMS.forEach(function (n) {
        var td = document.createElement("td");
        td.className = "cell";
        td.id = "c-" + letter + "-" + n;
        tr.appendChild(td);
      });
      rowEls[letter] = tr;
      gridBody.appendChild(tr);
    });

    // a live tally along the bottom — how many words in each column
    var footRow = document.createElement("tr");
    var lab = cell("th", "Σ", "tally-head");
    lab.scope = "row";
    lab.setAttribute("aria-label", "Words in each column");
    footRow.appendChild(lab);
    NUMS.forEach(function (n) {
      var td = document.createElement("td");
      td.className = "tally";
      td.textContent = "0";
      tallyEls[n] = td;
      footRow.appendChild(td);
    });
    gridFoot.appendChild(footRow);
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
    var l = BY_NUM[num];
    words.forEach(function (word, i) {
      var chip = document.createElement("span");
      chip.className = "chip";
      chip.style.background = l.hex;
      chip.style.color = l.dark ? "#2b2440" : "#fff";
      var emoji = EMOJI[String(word).toLowerCase()];
      chip.innerHTML = (emoji ? '<span aria-hidden="true">' + emoji + "</span>" : "") +
        "<span>" + escapeHtml(word) + "</span>" +
        '<button class="chip-x" type="button" aria-label="Remove ' + escapeHtml(word) + '">×</button>';
      chip.querySelector(".chip-x").addEventListener("click", function () {
        removeWord(letter, num, i);
      });
      td.appendChild(chip);
    });
  }

  function markRowEmpty(letter) {
    var tr = rowEls[letter];
    if (!tr) return;
    var any = NUMS.some(function (n) {
      var w = grid[keyFor(letter, n)];
      return w && w.length;
    });
    tr.dataset.empty = any ? "0" : "1";
  }

  function renderAll() {
    LETTERS.forEach(function (letter) {
      NUMS.forEach(function (n) { renderCell(letter, n); });
      markRowEmpty(letter);
    });
    updateCount();
  }

  function columnTotals() {
    var totals = {};
    NUMS.forEach(function (n) { totals[n] = 0; });
    Object.keys(grid).forEach(function (k) {
      var n = parseInt(k.split("|")[1], 10);
      if (totals[n] !== undefined) totals[n] += grid[k].length;
    });
    return totals;
  }

  function updateCount() {
    var total = 0, filled = 0;
    Object.keys(grid).forEach(function (k) {
      total += grid[k].length;
      if (grid[k].length) filled += 1;
    });
    countEl.textContent = String(total);

    var totals = columnTotals();
    NUMS.forEach(function (n) {
      if (tallyEls[n]) tallyEls[n].textContent = String(totals[n]);
    });

    progressLabel.textContent = "Squares filled: " + filled + " of " + TOTAL_SQUARES;
    progressFill.style.width = Math.round((filled / TOTAL_SQUARES) * 100) + "%";
    return total;
  }

  /* ---------- count the letters out on screen ----------
     T¹ I² G³ E⁴ R⁵  =  5 letters — the whole point of the game. */
  function countRow(word, delayStart) {
    var letters = lettersOf(word);
    var l = BY_NUM[columnFor(letters.length)] || BY_NUM[MAXLEN];
    var row = document.createElement("div");
    row.className = "co-row";
    letters.forEach(function (ch, i) {
      var span = document.createElement("span");
      span.className = "co-letter";
      span.style.setProperty("--cc", l.hex);
      span.style.color = l.dark ? "#2b2440" : "#fff";
      span.style.animationDelay = ((delayStart + i) * 0.11) + "s";
      span.innerHTML = escapeHtml(ch) + "<b>" + (i + 1) + "</b>";
      row.appendChild(span);
    });
    var total = document.createElement("span");
    total.className = "co-total";
    total.style.animationDelay = ((delayStart + letters.length) * 0.11) + "s";
    total.textContent = "= " + letters.length + " " + plural(letters.length);
    row.appendChild(total);
    return { el: row, next: delayStart + letters.length + 1 };
  }

  // words: one or two words to count out. why: the plain-language verdict.
  function showCountout(words, whyHtml, whyClass) {
    countoutEl.innerHTML = "";
    countoutEl.style.display = "flex";
    var delay = 0;
    words.forEach(function (w) {
      var r = countRow(w, delay);
      delay = r.next;
      countoutEl.appendChild(r.el);
    });
    if (whyHtml) {
      var why = document.createElement("p");
      why.className = "co-why " + (whyClass || "");
      why.style.animationDelay = (delay * 0.11) + "s";
      why.style.margin = "0.2rem 0 0";
      why.innerHTML = whyHtml;
      countoutEl.appendChild(why);
    }
  }
  function hideCountout() {
    countoutEl.style.display = "none";
    countoutEl.innerHTML = "";
  }

  /* ---------- explaining a guess in words ----------
     "You said 4, but C-A-N-D-Y is 5 — one more than you thought." */
  function explainGuess(word, guess) {
    var len = lenOf(word);
    var col = columnFor(len);
    var spelled = "<b>" + escapeHtml(spellOut(word)) + "</b>";
    if (guess === col) {
      return {
        right: true,
        html: "🎯 Spot on! You said <b>" + labelFor(guess) + "</b> and " + spelled +
              " really is <b>" + len + "</b> " + plural(len) + "."
      };
    }
    var gap = Math.abs(len - guess);
    // "10+" is a range, so talk about it as a range rather than a gap of N
    if (guess === MAXLEN && col !== MAXLEN) {
      return {
        right: false,
        html: "You said <b>10 or more</b>, but " + spelled + " is only <b>" + len +
              "</b> " + plural(len) + " — that's the <b>" + labelFor(col) + "</b> column."
      };
    }
    if (col === MAXLEN && guess !== MAXLEN) {
      return {
        right: false,
        html: "You said <b>" + guess + "</b>, but " + spelled + " is <b>" + len +
              "</b> " + plural(len) + " — that's a whopping <b>" + numberWord(Math.min(gap, 10)) +
              (gap > 10 ? "+" : "") + " more</b> than you thought, so it goes in <b>10+</b>."
      };
    }
    var dir = len > guess ? "more" : "fewer";
    return {
      right: false,
      html: "You said <b>" + guess + "</b>, but " + spelled + " is <b>" + len + "</b> — " +
            "<b>" + numberWord(gap) + " " + dir + "</b> than you thought."
    };
  }

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
    writeKey(questKey(), JSON.stringify(quest));
    renderQuest();
  }

  // reload the saved quest (or roll a fresh one) for this kid + variant
  function initQuest() {
    quest = null;
    try {
      var raw = localStorage.getItem(questKey());
      if (raw) quest = JSON.parse(raw);
    } catch (e) { quest = null; }
    // a saved quest must still point at a real square
    if (quest && (!BY_NUM[quest.num] || LETTERS.indexOf(quest.letter) === -1)) quest = null;
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
    var inCell = (grid[key] || []).map(function (w) { return String(w).toLowerCase(); });
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
    var word = String(raw).trim().replace(/\s+/g, " ").slice(0, 40);
    if (!word) {
      flashHint("Type a word first! 🙂", true);
      shake();
      return;
    }

    var letters = lettersOf(word);
    if (!letters.length) {
      flashHint("Try a word with some letters in it! 🙂", true);
      shake();
      window.SFX && SFX.nope();
      return;
    }

    if (activeVariant === "start") {
      placeWord(word, letters[0], activeGuess);
    } else if (activeVariant === "end") {
      placeWord(word, letters[letters.length - 1], activeGuess);
    } else {
      // middle: for short words the middle is obvious; longer ones need a pick.
      if (letters.length <= 3) {
        placeWord(word, letters[Math.floor(letters.length / 2)], activeGuess);
      } else {
        showChooser(word, letters);
      }
    }
  }

  // File `word` into the row for `letter`. The COLUMN is never a choice —
  // it's however many letters the word really has. Pass guess = null to
  // file a word without it counting as a guess (the Quick Count rounds do
  // their own scoring).
  function placeWord(word, letter, guess) {
    var letters = lettersOf(word);
    var len = letters.length;
    var num = columnFor(len);
    var key = keyFor(letter, num);
    if (!grid[key]) grid[key] = [];

    // avoid exact duplicates in the same cell
    var exists = grid[key].some(function (w) {
      return String(w).toLowerCase() === word.toLowerCase();
    });
    if (!exists) grid[key].push(word);

    save();
    renderCell(letter, num);
    markRowEmpty(letter);
    var total = updateCount();
    renderStatsPanel();

    var verdict = guess === null ? null : explainGuess(word, guess);
    if (guess !== null && !exists) bumpScore(verdict.right);

    var how = activeVariant === "end" ? "ends in " + letter
      : activeVariant === "middle" ? "counts as " + letter
      : "starts with " + letter;

    if (exists) {
      // Already in this square — say so instead of quietly scoring it again.
      showCountout([word],
        "🔁 <b>" + escapeHtml(word) + "</b> is already in row <b>" + letter +
        "</b>, column <b>" + labelFor(num) + "</b>. Try a different word!", "wrong");
      flashHint('"' + word + '" is already in your grid — try another! 🔁', false);
      window.SFX && SFX.nope();
    } else if (verdict) {
      showCountout([word], verdict.html + '<br><span style="font-weight:normal">It ' + how +
        ", so it lands in row <b>" + letter + "</b>.</span>",
        verdict.right ? "right" : "wrong");
      flashHint(verdict.right
        ? '🎯 Spot on! "' + word + '" has ' + len + " " + plural(len) + "!"
        : '"' + word + '" really has ' + len + " " + plural(len) + " — into the " +
          labelFor(num) + " column it goes!", false);
      window.SFX && (verdict.right ? SFX.coin() : SFX.good());
    } else {
      showCountout([word],
        "✅ <b>" + escapeHtml(word) + "</b> " + how + " and has <b>" + len + "</b> " +
        plural(len) + " — into row <b>" + letter + "</b> it goes!", "right");
    }

    var td = document.getElementById("c-" + letter + "-" + num);
    if (td) {
      td.classList.remove("flash");
      void td.offsetWidth; // restart animation
      td.classList.add("flash");
      revealCell(td);
    }

    input.value = "";

    // did that finish the quest? (any NEW word in the quest square counts)
    if (!exists && quest && quest.letter === letter && quest.num === num) {
      questComplete();
    }
    if (!exists && MILESTONES.indexOf(total) !== -1) {
      // grid-size milestone party
      flashHint("🎉 " + total + " words in the grid — amazing!", false);
      window.SFX && SFX.win();
      window.Confetti && Confetti.burst({ count: 60 });
    }
    return !exists;
  }

  // Scroll the grid box (never the page) so the kid sees where the word landed.
  function revealCell(td) {
    if (!gridScroll) return;
    try {
      var b = gridScroll.getBoundingClientRect();
      var t = td.getBoundingClientRect();
      var padTop = 48, padLeft = 44, dx = 0, dy = 0;
      if (t.top < b.top + padTop) dy = t.top - b.top - padTop;
      else if (t.bottom > b.bottom) dy = t.bottom - b.bottom + 8;
      if (t.left < b.left + padLeft) dx = t.left - b.left - padLeft;
      else if (t.right > b.right) dx = t.right - b.right + 8;
      if (dx || dy) {
        gridScroll.scrollBy({ left: dx, top: dy, behavior: REDUCE ? "auto" : "smooth" });
      }
    } catch (e) { /* older browsers just don't scroll */ }
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
    var firstReal = null;
    letters.forEach(function (ch, idx) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "letter-pick";
      b.textContent = ch;
      if (idx === 0 || idx === letters.length - 1) {
        // first & last aren't "middle" — show them, but greyed out
        b.classList.add("edge");
        b.disabled = true;
        b.setAttribute("aria-label", ch + " — not a middle letter");
      } else {
        b.setAttribute("aria-label", "File " + word + " in row " + ch);
        b.addEventListener("click", function () {
          hideChooser();
          placeWord(word, ch, activeGuess);
        });
        if (!firstReal) firstReal = b;
      }
      row.appendChild(b);
    });
    chooser.appendChild(row);
    chooser.style.display = "flex";
    flashHint("Tap a middle letter to file it. 👆", false);
    if (firstReal) firstReal.focus();
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
    markRowEmpty(letter);
    updateCount();
    renderStatsPanel();
    window.SFX && SFX.pop();
  }

  /* =========================================================
     QUICK COUNT — the game supplies the words
     ========================================================= */

  function quizPool() {
    if (typeof ENTRIES === "undefined") return [];
    var pool = ENTRIES.filter(function (e) {
      return lenOf(e.w) >= 2 && (activePack === "all" || e.t === activePack);
    });
    if (activeLevel === "grown") {
      // the grown-up tier prefers chunky words, but never runs dry
      var big = pool.filter(function (e) { return lenOf(e.w) >= 6; });
      if (big.length >= 8) pool = big;
    } else if (activeLevel === "count") {
      // level 1 stays inside the friendly 2–8 range
      var small = pool.filter(function (e) { return lenOf(e.w) <= 8; });
      if (small.length >= 8) pool = small;
    }
    if (pool.length < 4 && typeof ENTRIES !== "undefined") pool = ENTRIES.slice();
    return pool;
  }

  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function shuffle(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = list[i]; list[i] = list[j]; list[j] = t;
    }
    return list;
  }

  // two entries whose TRUE lengths differ (so "longer" and "how many more"
  // always have one clean answer)
  function pickPair(pool) {
    for (var tries = 0; tries < 60; tries++) {
      var a = pick(pool), b = pick(pool);
      if (!a || !b) return null;
      var la = lenOf(a.w), lb = lenOf(b.w);
      if (la !== lb && Math.abs(la - lb) <= 9) return la > lb ? [a, b] : [b, a]; // longer first
    }
    return null;
  }

  var kindIndex = 0;
  function nextKind() {
    var kinds = LEVEL_KINDS[activeLevel] || LEVEL_KINDS.count;
    var k = kinds[kindIndex % kinds.length];
    kindIndex++;
    return k;
  }

  function makeQuestion() {
    var pool = quizPool();
    if (pool.length < 2) return null;
    var kind = nextKind();

    if (kind === "count") {
      var e = pick(pool);
      return { kind: "count", words: [e.w], emoji: e.e, answer: columnFor(lenOf(e.w)) };
    }

    var pair = pickPair(pool);
    if (!pair) {
      var f = pick(pool);
      return { kind: "count", words: [f.w], emoji: f.e, answer: columnFor(lenOf(f.w)) };
    }
    var longW = pair[0].w, shortW = pair[1].w;
    var lLong = lenOf(longW), lShort = lenOf(shortW);

    if (kind === "longer" || kind === "shorter") {
      var wantLonger = kind === "longer";
      return {
        kind: "pick-word",
        words: shuffle([longW, shortW]),
        answer: wantLonger ? longW : shortW,
        ask: "Which word is <b>" + (wantLonger ? "LONGER" : "SHORTER") + "</b>?",
        showBoth: [longW, shortW]
      };
    }
    if (kind === "diff") {
      return {
        kind: "number",
        words: [longW, shortW],
        answer: lLong - lShort,
        ask: "How many <b>MORE</b> letters does <b>" + escapeHtml(longW.toUpperCase()) +
             "</b> have than <b>" + escapeHtml(shortW.toUpperCase()) + "</b>?",
        why: function () {
          return escapeHtml(longW.toUpperCase()) + " is <b>" + lLong + "</b> and " +
                 escapeHtml(shortW.toUpperCase()) + " is <b>" + lShort + "</b>. " +
                 lLong + " − " + lShort + " = <b>" + (lLong - lShort) + "</b>.";
        }
      };
    }
    // total
    return {
      kind: "number",
      words: [longW, shortW],
      answer: lLong + lShort,
      ask: "How many letters are in <b>" + escapeHtml(longW.toUpperCase()) + "</b> and <b>" +
           escapeHtml(shortW.toUpperCase()) + "</b> <b>ALTOGETHER</b>?",
      why: function () {
        return escapeHtml(longW.toUpperCase()) + " is <b>" + lLong + "</b> and " +
               escapeHtml(shortW.toUpperCase()) + " is <b>" + lShort + "</b>. " +
               lLong + " + " + lShort + " = <b>" + (lLong + lShort) + "</b>.";
      }
    };
  }

  // four plausible answers around the right one
  function numberOptions(answer) {
    var opts = [answer];
    var spread = [1, -1, 2, -2, 3, -3, 4];
    for (var i = 0; i < spread.length && opts.length < 4; i++) {
      var v = answer + spread[i];
      if (v >= 0 && opts.indexOf(v) === -1) opts.push(v);
    }
    return shuffle(opts);
  }

  function newQuizQuestion() {
    if (quizTimer) { clearTimeout(quizTimer); quizTimer = null; }
    quizQ = makeQuestion();
    renderQuiz();
  }

  function renderQuiz() {
    qcard.innerHTML = "";
    if (!quizQ) {
      qcard.innerHTML = '<p class="qask">This word pack is too small for a quiz — pick another pack. 🎒</p>';
      return;
    }
    var ask = document.createElement("p");
    ask.className = "qask";

    if (quizQ.kind === "count") {
      ask.innerHTML = "How many letters?";
      qcard.appendChild(ask);
      var w = document.createElement("div");
      w.className = "qword";
      w.textContent = (quizQ.emoji ? quizQ.emoji + " " : "") + quizQ.words[0].toUpperCase();
      qcard.appendChild(w);
      var row = document.createElement("div");
      row.className = "qopts";
      LENGTHS.forEach(function (l) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "qopt";
        b.style.background = l.hex;
        b.style.color = l.dark ? "#2b2440" : "#fff";
        b.textContent = l.label;
        b.dataset.value = String(l.n);
        b.setAttribute("aria-label", l.n === MAXLEN ? "10 letters or more" : l.n + " letters");
        b.addEventListener("click", function () { answerQuiz(l.n, b); });
        row.appendChild(b);
      });
      qcard.appendChild(row);

    } else if (quizQ.kind === "pick-word") {
      ask.innerHTML = quizQ.ask;
      qcard.appendChild(ask);
      var pairRow = document.createElement("div");
      pairRow.className = "qpair";
      quizQ.words.forEach(function (word, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "qword-btn";
        b.style.setProperty("--wc", LENGTHS[(i * 4 + 3) % LENGTHS.length].hex);
        b.textContent = word.toUpperCase();
        b.dataset.value = word;
        b.addEventListener("click", function () { answerQuiz(word, b); });
        pairRow.appendChild(b);
      });
      qcard.appendChild(pairRow);

    } else {
      ask.innerHTML = quizQ.ask;
      qcard.appendChild(ask);
      var opts = document.createElement("div");
      opts.className = "qopts";
      numberOptions(quizQ.answer).forEach(function (v) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "qopt";
        b.textContent = String(v);
        b.dataset.value = String(v);
        b.setAttribute("aria-label", String(v));
        b.addEventListener("click", function () { answerQuiz(v, b); });
        opts.appendChild(b);
      });
      qcard.appendChild(opts);
    }
    renderStreakLine();
  }

  function renderStreakLine(msg) {
    var s = loadStreak();
    var fire = s.cur >= 3 ? ' <span class="fire">' + (s.cur >= 10 ? "🔥🔥🔥" : s.cur >= 5 ? "🔥🔥" : "🔥") + "</span>" : "";
    streakLine.innerHTML = (msg ? msg + " · " : "") + "Streak: <b>" + s.cur + "</b>" + fire +
      " · Best: <b>" + s.best + "</b>";
  }

  function answerQuiz(value, btn) {
    if (!quizQ || quizQ.done) return;
    quizQ.done = true;
    var right = String(value) === String(quizQ.answer);

    // lock every option, mark right/wrong
    var buttons = qcard.querySelectorAll(".qopt, .qword-btn");
    [].forEach.call(buttons, function (b) {
      b.disabled = true;
      if (b.classList.contains("qopt")) {
        if (String(b.dataset.value) === String(quizQ.answer)) b.classList.add("ok");
        else if (b === btn) b.classList.add("no");
      } else if (String(b.dataset.value) === String(quizQ.answer)) {
        b.style.setProperty("--wc", "#2f8d3e");
      } else if (b === btn) {
        b.style.setProperty("--wc", "#c62d2d");
      }
    });

    bumpScore(right);
    window.SFX && (right ? SFX.coin() : SFX.nope());

    // ALWAYS count the words out — that's the lesson, win or lose
    var showWords = quizQ.showBoth || quizQ.words;
    var why;
    if (quizQ.kind === "count") {
      why = explainGuess(quizQ.words[0], value).html;
    } else if (quizQ.why) {
      why = (right ? "✅ Yes! " : "Not quite. ") + quizQ.why();
    } else {
      var lens = showWords.map(function (w) { return lenOf(w); });
      why = (right ? "✅ Yes! " : "Not quite — ") +
        "<b>" + escapeHtml(String(quizQ.answer).toUpperCase()) + "</b> is <b>" +
        Math.max.apply(null, lens) + "</b> letters and the other is <b>" +
        Math.min.apply(null, lens) + "</b>.";
    }
    showCountout(showWords, why, right ? "right" : "wrong");

    // a right answer files the word(s) into the grid — the grid grows either way you play
    if (right) {
      showWords.forEach(function (w) {
        var letters = lettersOf(w);
        if (!letters.length) return;
        placeWord(w, starterLetter(w), null);
      });
    }
    renderStreakLine(right ? "✅ Right!" : "Try the next one");

    // a clear way forward, plus a gentle auto-advance when they got it right
    var next = document.createElement("button");
    next.type = "button";
    next.className = "btn";
    next.style.marginTop = "0.7rem";
    next.textContent = "Next word ▶️";
    next.addEventListener("click", newQuizQuestion);
    qcard.appendChild(next);
    next.focus();
    if (right) quizTimer = setTimeout(newQuizQuestion, 2600);
  }

  quizSkipBtn.addEventListener("click", newQuizQuestion);

  /* =========================================================
     STATS — what the finished grid actually says
     ========================================================= */
  function gridWords() {
    var out = [];
    Object.keys(grid).forEach(function (k) {
      grid[k].forEach(function (w) { out.push(w); });
    });
    return out;
  }

  function statCard(big, cap) {
    var d = document.createElement("div");
    d.className = "stat-card";
    d.innerHTML = '<span class="big">' + escapeHtml(String(big)) + '</span><span class="cap">' +
      escapeHtml(cap) + "</span>";
    return d;
  }

  function renderStatsPanel() {
    var words = gridWords();
    var totals = columnTotals();
    statCards.innerHTML = "";
    barsEl.innerHTML = "";

    if (!words.length) {
      statCards.appendChild(statCard("0", "words yet"));
      chartNote.textContent = "Add some words (or hit “Load starter words”) and the numbers appear here.";
      NUMS.forEach(function (n) { barsEl.appendChild(barColumn(n, 0, 1, false)); });
      return;
    }

    var lens = words.map(lenOf);
    var totalLetters = lens.reduce(function (a, b) { return a + b; }, 0);
    var mean = totalLetters / words.length;
    var longest = words.slice().sort(function (a, b) { return lenOf(b) - lenOf(a); })[0];
    var shortest = words.slice().sort(function (a, b) { return lenOf(a) - lenOf(b); })[0];

    var max = 0, mode = NUMS[0];
    NUMS.forEach(function (n) { if (totals[n] > max) { max = totals[n]; mode = n; } });

    var filled = 0;
    Object.keys(grid).forEach(function (k) { if (grid[k].length) filled += 1; });

    statCards.appendChild(statCard(words.length, "words in the grid"));
    statCards.appendChild(statCard(totalLetters, "letters altogether"));
    statCards.appendChild(statCard(labelFor(mode), "most common length (the mode)"));
    statCards.appendChild(statCard(mean.toFixed(1), "average length (the mean)"));
    statCards.appendChild(statCard(longest, "longest word (" + lenOf(longest) + ")"));
    statCards.appendChild(statCard(shortest, "shortest word (" + lenOf(shortest) + ")"));
    statCards.appendChild(statCard(filled + "/" + TOTAL_SQUARES, "squares filled"));

    NUMS.forEach(function (n) {
      barsEl.appendChild(barColumn(n, totals[n], Math.max(max, 1), n === mode));
    });

    chartNote.innerHTML = "The tallest bar is <b>" + labelFor(mode) + " letters</b> (" + max +
      " words) — that's the <b>mode</b>. Add up every letter (" + totalLetters +
      ") and share it between " + words.length + " words and you get a <b>mean</b> of <b>" +
      mean.toFixed(1) + "</b>.";
  }

  function barColumn(n, value, max, isTop) {
    var l = BY_NUM[n];
    var col = document.createElement("div");
    col.className = "bar-col";
    var num = document.createElement("span");
    num.className = "bar-n";
    num.textContent = String(value);
    var bar = document.createElement("div");
    bar.className = "bar" + (isTop && value > 0 ? " top" : "");
    bar.style.background = l.hex;
    bar.style.height = Math.round((value / max) * 100) + "%";
    var lab = document.createElement("span");
    lab.className = "bar-lab";
    lab.textContent = l.label;
    col.appendChild(num);
    col.appendChild(bar);
    col.appendChild(lab);
    col.setAttribute("aria-label", value + " words with " + l.label + " letters");
    return col;
  }

  /* ---------- helpers ---------- */
  function flashHint(msg, isError) {
    hint.textContent = msg;
    hint.style.color = isError ? "#c62d2d" : "#6b41c9";
  }
  function shake() {
    input.classList.remove("shake");
    void input.offsetWidth;
    input.classList.add("shake");
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
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
    var added = 0;
    var pack = activePack;
    ENTRIES.forEach(function (e) {
      if (pack !== "all" && e.t !== pack) return;
      var letters = lettersOf(e.w);
      if (!letters.length) return;
      var key = keyFor(starterLetter(e.w), columnFor(letters.length));
      if (!grid[key]) grid[key] = [];
      var exists = grid[key].some(function (w) {
        return String(w).toLowerCase() === e.w.toLowerCase();
      });
      if (!exists) { grid[key].push(e.w); added++; }
    });
    save();
    renderAll();
    renderStatsPanel();
    initQuest(); // the starter words may have filled the quest square
    flashHint(added
      ? "Loaded " + added + " " + packById(pack).label.toLowerCase() +
        " words — add your own too! ✨"
      : "Those words are all in your grid already — try another pack! 🎒", false);
  });

  clearBtn.addEventListener("click", function () {
    if (!window.confirm("Clear the whole grid? This can't be undone.")) return;
    hideChooser();
    hideCountout();
    grid = {};
    save();
    renderAll();
    renderStatsPanel();
    newQuest();
    flashHint("Fresh grid — start typing! ✨", false);
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    addWord(input.value);
    input.focus();
  });

  /* ---------- "only rows with words" ---------- */
  filterBtn.addEventListener("click", function () {
    var on = gridBody.classList.toggle("hide-empty");
    filterBtn.setAttribute("aria-pressed", on ? "true" : "false");
    filterBtn.textContent = on ? "Show every row 🔤" : "Only rows with words 👀";
  });

  /* ---------- tabs ---------- */
  function setTab(id) {
    activeTab = id;
    writeKey("numberGrid.tab", id);
    TABS.forEach(function (t) {
      var on = t.id === id;
      t.btn.setAttribute("aria-selected", on ? "true" : "false");
      t.panel.hidden = !on;
    });
    hideCountout();
    if (id === "stats") renderStatsPanel();
    if (id === "quiz" && !quizQ) newQuizQuestion();
  }
  TABS.forEach(function (t) {
    t.btn.addEventListener("click", function () { setTab(t.id); });
  });

  /* ---------- keyboard play ---------- */
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key;
    if (!/^[0-9]$/.test(k)) return;
    var target = e.target || {};
    if (activeTab === "build") {
      // 2–9 pick a guess, 0 means "10 or more"
      var n = k === "0" ? MAXLEN : parseInt(k, 10);
      if (!BY_NUM[n]) return;
      e.preventDefault();
      setGuess(n, target !== input);
      return;
    }
    if (activeTab === "quiz") {
      // 1–9 pick the nth answer button
      var idx = parseInt(k, 10) - 1;
      if (idx < 0) return;
      var opts = qcard.querySelectorAll(".qopt:not([disabled]), .qword-btn:not([disabled])");
      if (opts[idx]) { e.preventDefault(); opts[idx].click(); }
    }
  });

  /* ---------- go ---------- */
  loadKidSettings();
  grid = load();
  buildGrid();
  renderAll();
  renderStars();
  renderScore();
  renderStreak();
  initQuest();
  setGuess(activeGuess, false);
  updateHow();
  updatePackSummary();
  markPressed(kidRow, "kid", currentKid);
  markPressed(packRow, "pack", activePack);
  markPressed(variantRow, "variant", activeVariant);
  markPressed(levelRow, "level", activeLevel);
  newQuizQuestion();
  renderStatsPanel();
  setTab(activeTab);
  if (updateCount() === 0) {
    flashHint("Your grid is empty — guess a number and type your first word! 🔢", false);
  } else {
    flashHint("Welcome back — " + updateCount() + " words in your grid. ✨", false);
  }
})();
