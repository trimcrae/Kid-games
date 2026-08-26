/* ===========================================================
   Color Grid Builder — build a grid, or play Colour Detective
   -----------------------------------------------------------
   WHAT IT TEACHES
     • colour words (every colour is always written out, never
       shown as a swatch on its own — good for colour-blind eyes)
     • sorting & categorising (which colour is this thing?)
     • letter position / spelling (first, middle and last letter,
       spelled out on screen so you SEE why a word landed where
       it did)
     • word length, for the tougher quests

   TWO MODES
     🧱 Build     — pick a colour, type a word, it drops into the
                    grid row for its first / middle / last letter.
     🔎 Detective — the game names a thing ("Flamingo") and the
                    player has to work out its colour. Two tiers:
                    Easy (picture + 4 choices) and Tricky (word
                    only, all ten colours) for the big kids & mum.

   Everything is saved in localStorage, per kid and per variant,
   so a grid is still there next time.
   =========================================================== */

(function () {
  "use strict";

  var LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  var COLOR_KEYS = Object.keys(COLORS);

  // Each kid gets their own saved grid.
  var KIDS = [
    { id: "jeannie", name: "Jeannie", emoji: "📚", color: "#ff6fa5" },
    { id: "cory",    name: "Cory",    emoji: "🟦", color: "#2b8cff" },
    { id: "ellie",   name: "Ellie",   emoji: "👑", color: "#9b3fc4" },
    { id: "shannon", name: "Mum",     emoji: "👩", color: "#3aa84a" }
  ];
  var CURRENT_KID_KEY = "mcrae.currentKid";

  // Three ways to file a word: by its first letter, a middle letter, or its
  // last letter. Each variant keeps its OWN grid so the lists don't mix.
  var VARIANTS = [
    { id: "start",  label: "Start",  emoji: "🏁", desc: "first letter" },
    { id: "middle", label: "Middle", emoji: "🎯", desc: "a middle letter" },
    { id: "end",    label: "End",    emoji: "🔚", desc: "last letter" }
  ];
  var VARIANT_KEY = "colorGrid.variant";

  var MODES = [
    { id: "build",     label: "Build",     emoji: "🧱", desc: "type your own words" },
    { id: "detective", label: "Detective", emoji: "🔎", desc: "guess the colour" }
  ];
  var MODE_KEY = "colorGrid.mode";

  var TIERS = [
    { id: "easy",   label: "Easy 🌈",   desc: "with a picture, 4 colours" },
    { id: "tricky", label: "Tricky ⭐", desc: "word only, all 10 colours" }
  ];

  var MILESTONES = [10, 25, 50, 100, 150, 200];
  var MAX_WORD = 30;
  var STARTER_BATCH = 12;

  /* ---------- look-ups built from the word list ---------- */
  var ALL_ENTRIES = (typeof ENTRIES !== "undefined") ? ENTRIES : [];
  var EMOJI = {};        // "flamingo" -> "🦩"
  var BY_WORD = {};      // "flamingo" -> entry
  ALL_ENTRIES.forEach(function (e) {
    if (e.e) EMOJI[e.w.toLowerCase()] = e.e;
    BY_WORD[e.w.toLowerCase()] = e;
  });

  /* ---------- elements ---------- */
  var kidRow = document.getElementById("kid-row");
  var modeRow = document.getElementById("mode-row");
  var variantRow = document.getElementById("variant-row");
  var colorRow = document.getElementById("color-row");
  var form = document.getElementById("add-form");
  var input = document.getElementById("word-input");
  var hint = document.getElementById("hint");
  var howEl = document.getElementById("how");
  var chooser = document.getElementById("chooser");
  var countEl = document.getElementById("count");
  var rainbowEl = document.getElementById("rainbow");
  var gridBody = document.getElementById("grid-body");
  var gridHead = document.getElementById("grid-head");
  var starterBtn = document.getElementById("starter");
  var undoBtn = document.getElementById("undo");
  var rowFilterBtn = document.getElementById("rowfilter");
  var clearBtn = document.getElementById("clear");
  var buildPanel = document.getElementById("build-panel");
  var questEl = document.getElementById("quest");
  var questTextEl = document.getElementById("quest-text");
  var questHintBtn = document.getElementById("quest-hint");
  var questNewBtn = document.getElementById("quest-new");
  var starsEl = document.getElementById("stars");
  var spellEl = document.getElementById("spellout");
  var detPanel = document.getElementById("detective");
  var tierRow = document.getElementById("tier-row");
  var detCard = document.getElementById("det-card");
  var detEmoji = document.getElementById("det-emoji");
  var detWordEl = document.getElementById("det-word");
  var detAskEl = document.getElementById("det-ask");
  var detTellBtn = document.getElementById("det-tell");
  var detSkipBtn = document.getElementById("det-skip");
  var detScoreEl = document.getElementById("det-score");

  /* ---------- current selections ---------- */
  var currentKid = readStr(CURRENT_KID_KEY, "cory");
  if (!KIDS.some(function (k) { return k.id === currentKid; })) currentKid = "cory";

  var activeVariant = readStr(VARIANT_KEY, "start");
  if (!VARIANTS.some(function (v) { return v.id === activeVariant; })) activeVariant = "start";

  var activeMode = readStr(MODE_KEY, "build");
  if (!MODES.some(function (m) { return m.id === activeMode; })) activeMode = "build";

  var rowsFilter = readStr("colorGrid.rows", "all") === "filled";

  // grid data: { "C|green": ["Creeper", "Cactus"], ... }
  var grid = load();
  var activeColor = COLOR_KEYS[0];
  var undoStack = [];
  var questTimer = null;
  var detTimer = null;
  var clearArmTimer = null;

  /* ---------- tiny storage helpers (never throw) ---------- */
  function readStr(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v === null ? fallback : v;
    } catch (e) { return fallback; }
  }
  function writeStr(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }
  function dropKey(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }

  /* ---------- storage (namespaced per kid + variant) ---------- */
  function storageKey() {
    var base = "colorGrid.v1:" + currentKid;
    // "start" keeps the original key so existing grids carry over.
    return activeVariant === "start" ? base : base + ":" + activeVariant;
  }
  function load() {
    try {
      var raw = localStorage.getItem(storageKey());
      // one-time migration of Cory's old un-namespaced grid (start variant only)
      if (!raw && activeVariant === "start" && currentKid === "cory") {
        var legacy = localStorage.getItem("coryColorGrid.v1");
        if (legacy) { localStorage.setItem(storageKey(), legacy); raw = legacy; }
      }
      var data = raw ? JSON.parse(raw) : {};
      return sanitise(data);
    } catch (e) { return {}; }
  }
  // A saved grid could be from an older/garbled version — keep only sane cells.
  function sanitise(data) {
    var out = {};
    if (!data || typeof data !== "object") return out;
    Object.keys(data).forEach(function (k) {
      var bits = String(k).split("|");
      if (bits.length !== 2) return;
      if (LETTERS.indexOf(bits[0]) === -1 || !COLORS[bits[1]]) return;
      var list = data[k];
      if (Object.prototype.toString.call(list) !== "[object Array]") return;
      var words = [];
      for (var i = 0; i < list.length; i++) {
        var w = String(list[i]).trim().replace(/\s+/g, " ").slice(0, MAX_WORD);
        if (!w) continue;
        var dup = words.some(function (x) { return x.toLowerCase() === w.toLowerCase(); });
        if (!dup) words.push(w);
      }
      if (words.length) out[k] = words;
    });
    return out;
  }
  function save() { writeStr(storageKey(), JSON.stringify(grid)); }
  function keyFor(letter, color) { return letter + "|" + color; }

  /* ---------- undo (covers deletes, clears and starter batches) ---------- */
  function pushUndo(what) {
    undoStack.push({ what: what, snap: JSON.stringify(grid) });
    if (undoStack.length > 12) undoStack.shift();
    undoBtn.hidden = false;
    undoBtn.textContent = "Undo " + what + " ↩️";
  }
  function clearUndo() {
    undoStack = [];
    undoBtn.hidden = true;
  }
  undoBtn.addEventListener("click", function () {
    var last = undoStack.pop();
    if (!last) { undoBtn.hidden = true; return; }
    try { grid = sanitise(JSON.parse(last.snap)); } catch (e) { grid = {}; }
    save();
    renderAll();
    if (undoStack.length) {
      undoBtn.textContent = "Undo " + undoStack[undoStack.length - 1].what + " ↩️";
    } else {
      undoBtn.hidden = true;
    }
    flashHint("Put it back! ↩️", false);
    window.SFX && SFX.pop();
  });

  /* ---------- quest stars (per kid) ---------- */
  function starsKey() { return "colorGrid.stars:" + currentKid; }
  function loadStars() { return parseInt(readStr(starsKey(), "0"), 10) || 0; }
  function addStar() {
    writeStr(starsKey(), String(loadStars() + 1));
    renderStars();
  }
  function renderStars() { starsEl.textContent = String(loadStars()); }

  /* ---------- kid picker ---------- */
  KIDS.forEach(function (kid) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "kid-pick";
    btn.style.setProperty("--kc", kid.color);
    btn.innerHTML = '<span aria-hidden="true">' + kid.emoji + "</span> " + kid.name;
    btn.dataset.kid = kid.id;
    btn.setAttribute("aria-label", kid.name + "'s grid");
    btn.addEventListener("click", function () { setKid(kid.id); });
    kidRow.appendChild(btn);
  });

  function setKid(id) {
    currentKid = id;
    writeStr(CURRENT_KID_KEY, id);
    markSelected(kidRow, "kid", id);
    stopTimers();
    hideChooser();
    hideSpellout();
    clearUndo();
    grid = load();
    renderAll();
    renderStars();
    initQuest();
    setColor(readStr(colorKey(), COLOR_KEYS[0]), true);
    syncTiers();
    if (activeMode === "detective") nextDetective();
    var kid = KIDS.filter(function (k) { return k.id === id; })[0];
    flashHint(kid.name + "'s grid — off you go! ✨", false);
  }

  /* ---------- mode picker (Build / Detective) ---------- */
  MODES.forEach(function (m) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mode-pick";
    btn.innerHTML = '<span aria-hidden="true">' + m.emoji + "</span> " + m.label +
      "<small>" + m.desc + "</small>";
    btn.dataset.mode = m.id;
    btn.setAttribute("aria-label", m.label + " — " + m.desc);
    btn.addEventListener("click", function () { setMode(m.id); });
    modeRow.appendChild(btn);
  });

  function setMode(id) {
    activeMode = id;
    writeStr(MODE_KEY, id);
    markSelected(modeRow, "mode", id);
    stopTimers();
    hideChooser();
    hideSpellout();
    resetColorDim();
    var det = id === "detective";
    buildPanel.hidden = det;
    detPanel.hidden = !det;
    colorRow.classList.toggle("answering", det);
    updateHow();
    if (det) {
      syncTiers();
      nextDetective();
    } else {
      setColor(activeColor, true);
      renderQuest();
      flashHint("Type a word and watch where it lands! ✨", false);
    }
  }

  /* ---------- variant picker ---------- */
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
    writeStr(VARIANT_KEY, id);
    markSelected(variantRow, "variant", id);
    stopTimers();
    hideChooser();
    hideSpellout();
    clearUndo();
    grid = load();
    renderAll();
    initQuest();
    updateHow();
    if (activeMode === "detective") nextDetective();
  }

  function updateHow() {
    var v = VARIANTS.filter(function (x) { return x.id === activeVariant; })[0];
    var where = v.id === "start" ? "the row for its <b>first</b> letter"
      : v.id === "end" ? "the row for its <b>last</b> letter"
      : "a row you pick for one of its <b>middle</b> letters";
    if (activeMode === "detective") {
      howEl.innerHTML =
        "🔎 <b>Colour Detective:</b> read the thing, work out what colour it is, " +
        "and tap that colour. Get it right and it joins your grid in " + where + "!";
    } else {
      howEl.innerHTML =
        "Pick a <b>colour</b>, type a word that <b>is</b> that colour, and press " +
        "<b>Add</b> — it lands in " + where + ". Watch the letters spell out to see why! ✨";
    }
  }

  /* ---------- colour picker ---------- */
  COLOR_KEYS.forEach(function (key) {
    var c = COLORS[key];
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "color-pick";
    btn.style.background = c.hex;
    btn.style.color = c.dark ? "#2b2440" : "#fff";
    btn.innerHTML = '<span class="cname">' + c.name + '</span><span class="tick" aria-hidden="true"></span>';
    btn.setAttribute("aria-label", "Colour " + c.name);
    btn.dataset.key = key;
    btn.addEventListener("click", function () { onColorTap(key, btn); });
    colorRow.appendChild(btn);
  });

  function onColorTap(key, btn) {
    if (activeMode === "detective") answerDetective(key, btn);
    else setColor(key);
  }

  function colorKey() { return "colorGrid.color:" + currentKid; }

  function setColor(key, quiet) {
    if (!COLORS[key]) key = COLOR_KEYS[0];
    activeColor = key;
    writeStr(colorKey(), key);
    var c = COLORS[key];
    [].forEach.call(colorRow.children, function (b) {
      var on = b.dataset.key === key && activeMode !== "detective";
      b.classList.toggle("selected", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    // tint the input so it's obvious which colour is being added
    input.style.borderColor = c.hex;
    input.style.background = c.hex + "22";
    if (!quiet && activeMode !== "detective") {
      flashHint("Colour picked: " + c.name + " — now type something that's " +
        c.name.toLowerCase() + "! 🎨", false);
      try { input.focus(); } catch (e) {}
    }
  }

  function resetColorDim() {
    [].forEach.call(colorRow.children, function (b) {
      b.classList.remove("dim", "wrongpick");
      b.disabled = false;
    });
  }

  function markSelected(row, dataName, id) {
    [].forEach.call(row.children, function (b) {
      var on = b.dataset[dataName] === id;
      b.classList.toggle("selected", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  /* ---------- build the grid table ---------- */
  function buildGrid() {
    var headRow = document.createElement("tr");
    var corner = cell("th", "", "corner");
    corner.setAttribute("scope", "col");
    corner.innerHTML = '<span class="sr-only">Letter</span>';
    headRow.appendChild(corner);
    COLOR_KEYS.forEach(function (key) {
      var c = COLORS[key];
      var th = document.createElement("th");
      th.className = "col-head";
      th.setAttribute("scope", "col");
      th.style.background = c.hex;
      th.style.color = c.dark ? "#2b2440" : "#fff";
      th.innerHTML = escapeHtml(c.name) + '<span class="ccount" id="cc-' + key + '"></span>';
      headRow.appendChild(th);
    });
    gridHead.appendChild(headRow);

    LETTERS.forEach(function (letter) {
      var tr = document.createElement("tr");
      tr.id = "row-" + letter;
      var th = cell("th", letter, "row-head");
      th.setAttribute("scope", "row");
      tr.appendChild(th);
      COLOR_KEYS.forEach(function (key) {
        var td = document.createElement("td");
        td.className = "cell";
        td.id = "c-" + letter + "-" + key;
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
  function renderCell(letter, color) {
    var td = document.getElementById("c-" + letter + "-" + color);
    if (!td) return;
    td.innerHTML = "";
    var c = COLORS[color];
    var words = grid[keyFor(letter, color)] || [];
    words.forEach(function (word, i) {
      var chip = document.createElement("span");
      chip.className = "chip";
      chip.style.background = c.hex;
      chip.style.color = c.dark ? "#2b2440" : "#fff";
      chip.title = word + " — " + c.name;
      var emoji = EMOJI[word.toLowerCase()];
      chip.innerHTML = (emoji ? '<span aria-hidden="true">' + emoji + "</span>" : "") +
        "<span>" + escapeHtml(word) + "</span>" +
        '<span class="sr-only">, ' + escapeHtml(c.name) + ", row " + letter + "</span>" +
        '<button class="chip-x" type="button" aria-label="Remove ' +
          escapeHtml(word) + " from " + c.name + ', row ' + letter + '">×</button>';
      chip.querySelector(".chip-x").addEventListener("click", function () {
        removeWord(letter, color, i, word);
      });
      td.appendChild(chip);
    });
  }

  function renderAll() {
    LETTERS.forEach(function (letter) {
      COLOR_KEYS.forEach(function (key) { renderCell(letter, key); });
    });
    updateCount();
    updateColorStats();
    applyRowFilter();
  }

  function updateCount() {
    var total = 0;
    Object.keys(grid).forEach(function (k) { total += grid[k].length; });
    countEl.textContent = String(total);
    return total;
  }

  // per-colour tallies: a tick on the colour button + a count in the column head
  function updateColorStats() {
    var used = 0;
    COLOR_KEYS.forEach(function (key) {
      var n = 0;
      LETTERS.forEach(function (letter) {
        var list = grid[keyFor(letter, key)];
        if (list) n += list.length;
      });
      if (n) used++;
      var head = document.getElementById("cc-" + key);
      if (head) head.textContent = n ? n + (n === 1 ? " word" : " words") : "";
      var btn = colorRow.querySelector('.color-pick[data-key="' + key + '"] .tick');
      if (btn) btn.textContent = n ? " ✓" : "";
    });
    rainbowEl.textContent = String(used);
    return used;
  }

  function rowTotal(letter) {
    var n = 0;
    COLOR_KEYS.forEach(function (key) {
      var list = grid[keyFor(letter, key)];
      if (list) n += list.length;
    });
    return n;
  }

  function applyRowFilter() {
    LETTERS.forEach(function (letter) {
      var tr = document.getElementById("row-" + letter);
      if (!tr) return;
      tr.hidden = rowsFilter && rowTotal(letter) === 0;
    });
    rowFilterBtn.textContent = rowsFilter ? "Show all rows 🔎" : "Hide empty rows 🔍";
    rowFilterBtn.setAttribute("aria-pressed", rowsFilter ? "true" : "false");
  }

  rowFilterBtn.addEventListener("click", function () {
    rowsFilter = !rowsFilter;
    writeStr("colorGrid.rows", rowsFilter ? "filled" : "all");
    applyRowFilter();
    flashHint(rowsFilter ? "Showing only the rows you've filled. 🔍"
                         : "Showing all 26 letter rows. 🔎", false);
  });

  /* ---------- letters of a word ---------- */
  // { chars: ["F","l","a"...], letters: [{ch:"F", pos:0}, ...] }
  function letterInfo(word) {
    var chars = String(word).split("");
    var letters = [];
    chars.forEach(function (ch, i) {
      if (/[A-Za-z]/.test(ch)) letters.push({ ch: ch.toUpperCase(), pos: i });
    });
    return { chars: chars, letters: letters };
  }

  // Which letter (index into `letters`) files this word under the active variant?
  function autoIndex(letters) {
    if (activeVariant === "end") return letters.length - 1;
    if (activeVariant === "middle") {
      if (letters.length < 3) return 0;
      var mid = Math.floor(letters.length / 2);
      return Math.min(Math.max(mid, 1), letters.length - 2);
    }
    return 0;
  }

  function autoLetter(word, fallback) {
    var letters = letterInfo(word).letters;
    if (!letters.length) return fallback;
    return letters[autoIndex(letters)].ch;
  }

  /* ---------- word quests ----------
     "Add a Green word to row B — with 6 or more letters!"  Quests only
     use (letter, colour) pairs the word list proves have an answer, and
     prefer squares that are still empty. Finishing one earns a star. */
  var quest = null;

  function questKey() { return "colorGrid.quest:" + currentKid + ":" + activeVariant; }

  // every (letter, colour) pair the word list can answer under this variant
  function questPairs() {
    var byKey = {};
    ALL_ENTRIES.forEach(function (e) {
      var letter = autoLetter(e.w, e.l);
      var k = keyFor(letter, e.c);
      (byKey[k] = byKey[k] || []).push(e);
    });
    return byKey;
  }

  function wordLetterCount(w) {
    var m = String(w).toUpperCase().match(/[A-Z]/g);
    return m ? m.length : 0;
  }

  function questCandidates() {
    var byKey = questPairs();
    var empty = [], all = [];
    Object.keys(byKey).forEach(function (k) {
      var bits = k.split("|");
      var cand = { letter: bits[0], color: bits[1], answers: byKey[k] };
      all.push(cand);
      if (!grid[k] || !grid[k].length) empty.push(cand);
    });
    return empty.length ? empty : all;
  }

  function newQuest() {
    var cands = questCandidates();
    if (!cands.length) {
      quest = null;
      dropKey(questKey());
      renderQuest();
      return;
    }
    var q = cands[Math.floor(Math.random() * cands.length)];
    var min = 0;
    // Half the time make it a spelling challenge: "…with 6+ letters!"
    if (Math.random() < 0.5) {
      var feasible = [4, 6, 8].filter(function (n) {
        return q.answers.some(function (a) { return wordLetterCount(a.w) >= n; });
      });
      if (feasible.length) min = feasible[Math.floor(Math.random() * feasible.length)];
    }
    quest = { letter: q.letter, color: q.color, min: min };
    writeStr(questKey(), JSON.stringify(quest));
    renderQuest();
  }

  // reload the saved quest (or roll a fresh one) for this kid + variant
  function initQuest() {
    quest = null;
    try {
      var raw = localStorage.getItem(questKey());
      if (raw) quest = JSON.parse(raw);
    } catch (e) { quest = null; }
    if (quest && (!COLORS[quest.color] || LETTERS.indexOf(quest.letter) === -1)) quest = null;
    if (quest) {
      quest.min = parseInt(quest.min, 10) || 0;
      renderQuest();
    } else {
      newQuest();
    }
  }

  function renderQuest() {
    questEl.classList.remove("done");
    if (!quest) {
      questTextEl.innerHTML = "🏆 Wow — you've filled every quest square! Free play time!";
      questHintBtn.hidden = true;
      questNewBtn.hidden = true;
      return;
    }
    questHintBtn.hidden = false;
    questNewBtn.hidden = false;
    var c = COLORS[quest.color];
    var another = (grid[keyFor(quest.letter, quest.color)] || []).length ? "another"
      : (/^[AEIOU]/.test(c.name) ? "an" : "a");
    var extra = quest.min ? " with <b>" + quest.min + " or more letters</b>" : "";
    questTextEl.innerHTML = "⭐ Quest: add " + another + ' <b class="qcolor" style="background:' + c.hex +
      ";color:" + (c.dark ? "#2b2440" : "#fff") + '">' + c.name + "</b> word to row <b>" +
      quest.letter + "</b>" + extra + "!";
  }

  function questComplete() {
    addStar();
    questEl.classList.add("done");
    questTextEl.innerHTML = "🌟 Quest complete! You earned a star!";
    questHintBtn.hidden = true;
    window.SFX && SFX.win();
    window.Confetti && Confetti.burst({ count: 70 });
    clearTimeout(questTimer);
    questTimer = setTimeout(newQuest, 1800);
  }

  questHintBtn.addEventListener("click", function () {
    if (!quest) return;
    var key = keyFor(quest.letter, quest.color);
    var answers = (questPairs()[key] || []).filter(function (a) {
      return wordLetterCount(a.w) >= (quest.min || 0);
    });
    var inCell = (grid[key] || []).map(function (w) { return w.toLowerCase(); });
    var fresh = answers.filter(function (a) { return inCell.indexOf(a.w.toLowerCase()) === -1; });
    var list = fresh.length ? fresh : answers;
    if (!list.length) { flashHint("Any word you like will do — it's your grid! 🙂", false); return; }
    var a = list[Math.floor(Math.random() * list.length)];
    flashHint('Psst… how about "' + a.w + '"? ' + (a.e || "💡"), false);
    try { input.focus(); } catch (e) {}
  });

  questNewBtn.addEventListener("click", function () {
    clearTimeout(questTimer);
    newQuest();
    flashHint("New quest! 🔄", false);
  });

  /* ---------- add a word (Build mode) ---------- */
  function addWord(raw) {
    var word = String(raw).trim().replace(/\s+/g, " ");
    if (!word) {
      flashHint("Type something first — anything that's " +
        COLORS[activeColor].name.toLowerCase() + "! ✏️", true);
      shake();
      return;
    }
    if (word.length > MAX_WORD) {
      word = word.slice(0, MAX_WORD);
      flashHint("That's a LONG one — keeping the first " + MAX_WORD + " letters. ✂️", false);
    }

    var info = letterInfo(word);
    var letters = info.letters;
    if (!letters.length) {
      flashHint("Try a word with some letters in it! 🙂", true);
      shake();
      window.SFX && SFX.nope();
      return;
    }

    if (activeVariant === "middle") {
      if (letters.length < 3) {
        flashHint('"' + word + '" is too short to have a MIDDLE letter — ' +
          "it needs at least 3. Try a longer word! 🎯", true);
        shake();
        window.SFX && SFX.nope();
        return;
      }
      if (letters.length > 3) { showChooser(word, info); return; }
      placeWord(word, info, 1);
      return;
    }
    placeWord(word, info, activeVariant === "end" ? letters.length - 1 : 0);
  }

  /* File `word` into the row for letters[idx] in the active colour. */
  function placeWord(word, info, idx, colorOverride, silent) {
    var color = colorOverride || activeColor;
    var letters = info.letters;
    var letter = letters[idx].ch;
    var key = keyFor(letter, color);
    if (!grid[key]) grid[key] = [];

    var already = grid[key].some(function (w) {
      return w.toLowerCase() === word.toLowerCase();
    });

    // Same word, different colour? That's allowed — say so, it's a real lesson.
    var elsewhere = null;
    if (!already) {
      COLOR_KEYS.forEach(function (k) {
        if (k === color || elsewhere) return;
        var l = grid[keyFor(letter, k)];
        if (l && l.some(function (w) { return w.toLowerCase() === word.toLowerCase(); })) elsewhere = k;
      });
    }

    if (!already) grid[key].push(word);
    save();
    renderCell(letter, color);
    var total = updateCount();
    updateColorStats();
    applyRowFilter();

    var td = document.getElementById("c-" + letter + "-" + color);
    if (td) {
      td.classList.remove("flash");
      void td.offsetWidth; // restart animation
      td.classList.add("flash");
      try { td.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" }); } catch (e) {}
      if (already) {
        var chips = td.querySelectorAll(".chip");
        for (var i = 0; i < chips.length; i++) {
          if (chips[i].textContent.toLowerCase().indexOf(word.toLowerCase()) !== -1) {
            chips[i].classList.remove("bump");
            void chips[i].offsetWidth;
            chips[i].classList.add("bump");
            break;
          }
        }
      }
    }

    showSpellout(word, info, idx, color);

    if (already) {
      // Honest feedback — no happy "ding" for something that didn't happen.
      flashHint('"' + word + '" is already in that square — look, it just wiggled! 👀', true);
      window.SFX && SFX.nope();
    } else if (elsewhere) {
      flashHint('"' + word + '" can be ' + COLORS[elsewhere].name + " AND " +
        COLORS[color].name + " — now it's in both! 🌈", false);
      window.SFX && SFX.good();
    } else if (!silent) {
      window.SFX && SFX.good();
    }

    input.value = "";
    if (activeMode === "build") { try { input.focus(); } catch (e) {} }

    if (silent) return !already;

    if (!already && quest && quest.letter === letter && quest.color === color) {
      if (letters.length >= (quest.min || 0)) {
        questComplete();
      } else {
        flashHint("Good word! The quest wants " + quest.min +
          "+ letters though — \"" + word + "\" has " + letters.length + ". Keep going! 💪", false);
      }
    } else if (!already && MILESTONES.indexOf(total) !== -1) {
      flashHint("🎉 " + total + " words in the grid — amazing!", false);
      window.SFX && SFX.win();
      window.Confetti && Confetti.burst({ count: 60 });
    }
    return !already;
  }

  /* ---------- the "why did it land there?" spell-out strip ---------- */
  function showSpellout(word, info, idx, color) {
    var c = COLORS[color];
    var pickPos = info.letters[idx].pos;
    var letter = info.letters[idx].ch;
    spellEl.innerHTML = "";
    spellEl.style.display = "flex";

    var strip = document.createElement("div");
    strip.className = "so-letters";
    info.chars.forEach(function (ch, i) {
      var span = document.createElement("span");
      span.className = "so-letter" + (/[A-Za-z]/.test(ch) ? "" : " gap") +
        (i === pickPos ? " pickme" + (c.dark ? " onlight" : "") : "");
      span.style.setProperty("--sc", c.hex);
      span.style.animationDelay = Math.min(i * 0.07, 1.4) + "s";
      span.textContent = /\s/.test(ch) ? "" : ch;
      strip.appendChild(span);
    });
    spellEl.appendChild(strip);

    var why = document.createElement("div");
    why.className = "so-why";
    var v = activeVariant;
    var reason = v === "end" ? "ends with" : v === "middle" ? "has a middle letter" : "starts with";
    var swatch = '<b class="swatch" style="background:' + c.hex + ";color:" +
      (c.dark ? "#2b2440" : "#fff") + '">' + escapeHtml(c.name) + "</b>";
    why.innerHTML = "<b>" + escapeHtml(word) + "</b> " + reason + " <b>" + letter +
      "</b> → row <b>" + letter + "</b>, and it's " + swatch + " → the " +
      escapeHtml(c.name) + " column. " +
      "<span>(" + info.letters.length + " letter" + (info.letters.length === 1 ? "" : "s") + ")</span>";
    spellEl.appendChild(why);

    // Gentle "did you know" when the word list usually calls this something else.
    // It never blocks the choice — it's the player's grid — it just teaches.
    var known = BY_WORD[String(word).toLowerCase()];
    if (known && known.c !== color && (known.also || []).indexOf(color) === -1) {
      var usual = COLORS[known.c];
      var note = document.createElement("div");
      note.className = "so-why";
      note.style.fontSize = "0.92rem";
      note.style.opacity = "0.9";
      note.innerHTML = "💡 Most people say " + escapeHtml(word) + " is <b class=\"swatch\" style=\"background:" +
        usual.hex + ";color:" + (usual.dark ? "#2b2440" : "#fff") + "\">" + escapeHtml(usual.name) +
        "</b> — but it's your grid, so you decide!";
      spellEl.appendChild(note);
    }
  }
  function hideSpellout() {
    spellEl.style.display = "none";
    spellEl.innerHTML = "";
  }

  /* ---------- middle-variant "which letter?" chooser ---------- */
  function showChooser(word, info) {
    var letters = info.letters;
    chooser.innerHTML = "";
    var label = document.createElement("div");
    label.className = "chooser-label";
    label.textContent = 'Which middle letter should "' + word + '" count as?';
    chooser.appendChild(label);

    var row = document.createElement("div");
    row.className = "chooser-letters";
    letters.forEach(function (item, idx) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "letter-pick";
      b.textContent = item.ch;
      if (idx === 0 || idx === letters.length - 1) {
        // first & last aren't "middle" — show them, but greyed out
        b.classList.add("edge");
        b.disabled = true;
        b.setAttribute("aria-label", item.ch + " is the " +
          (idx === 0 ? "first" : "last") + " letter, not a middle one");
      } else {
        b.setAttribute("aria-label", "File " + word + " in row " + item.ch);
        b.addEventListener("click", function () {
          hideChooser();
          placeWord(word, info, idx);
        });
      }
      row.appendChild(b);
    });
    chooser.appendChild(row);

    var cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "mini-btn";
    cancel.textContent = "Never mind ✖️";
    cancel.addEventListener("click", function () {
      hideChooser();
      flashHint("Okay — try another word! 🙂", false);
      try { input.focus(); } catch (e) {}
    });
    chooser.appendChild(cancel);

    chooser.style.display = "flex";
    flashHint("Tap a middle letter to file it. 👆", false);
    var firstLive = chooser.querySelector(".letter-pick:not(.edge)");
    if (firstLive) { try { firstLive.focus(); } catch (e) {} }
  }

  function hideChooser() {
    chooser.style.display = "none";
    chooser.innerHTML = "";
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && chooser.style.display === "flex") {
      hideChooser();
      try { input.focus(); } catch (err) {}
    }
  });

  function removeWord(letter, color, index, word) {
    var key = keyFor(letter, color);
    if (!grid[key]) return;
    pushUndo("delete");
    grid[key].splice(index, 1);
    if (grid[key].length === 0) delete grid[key];
    save();
    renderCell(letter, color);
    updateCount();
    updateColorStats();
    applyRowFilter();
    flashHint('Took "' + word + '" out of ' + COLORS[color].name + ", row " + letter +
      ". Undo if that was a mistake! ↩️", false);
    window.SFX && SFX.pop();
  }

  /* ---------- Colour Detective ---------- */
  var detEntry = null;
  var detTries = 0;
  var detStreak = 0;
  var detBusy = false;

  function tierKey() { return "colorGrid.tier:" + currentKid; }
  function seenKey() { return "colorGrid.seen:" + currentKid; }
  function bestKey() { return "colorGrid.best:" + currentKid; }

  function activeTier() {
    var fallback = (currentKid === "jeannie" || currentKid === "shannon") ? "tricky" : "easy";
    var t = readStr(tierKey(), fallback);
    return TIERS.some(function (x) { return x.id === t; }) ? t : "easy";
  }

  TIERS.forEach(function (t) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "tier-pick";
    b.dataset.tier = t.id;
    b.textContent = t.label;
    b.setAttribute("aria-label", t.label + " — " + t.desc);
    b.addEventListener("click", function () {
      writeStr(tierKey(), t.id);
      syncTiers();
      nextDetective();
    });
    tierRow.appendChild(b);
  });

  function syncTiers() {
    markSelected(tierRow, "tier", activeTier());
  }

  function loadSeen() {
    try {
      var v = JSON.parse(readStr(seenKey(), "[]"));
      return (v && typeof v.length === "number") ? v : [];
    } catch (e) { return []; }
  }
  function markSeen(word) {
    var s = loadSeen();
    if (s.indexOf(word) === -1) s.push(word);
    writeStr(seenKey(), JSON.stringify(s));
  }

  function nextDetective() {
    clearTimeout(detTimer);
    detBusy = false;
    detTries = 0;
    resetColorDim();
    detCard.classList.remove("right", "wrong");

    var seen = loadSeen();
    var pool = ALL_ENTRIES.filter(function (e) { return seen.indexOf(e.w) === -1; });
    if (!pool.length) {
      writeStr(seenKey(), "[]");
      pool = ALL_ENTRIES.slice();
      flashHint("You've met every word — round two! 🔁", false);
    }
    detEntry = pool[Math.floor(Math.random() * pool.length)];

    var easy = activeTier() === "easy";
    detEmoji.textContent = easy ? (detEntry.e || "❓") : "🔎";
    detWordEl.textContent = detEntry.w;
    detAskEl.textContent = "What colour is it? Tap a colour up above ↑";

    if (easy) {
      // 4 choices: the right one plus three decoys
      var right = detEntry.c;
      var others = COLOR_KEYS.filter(function (k) {
        return k !== right && (detEntry.also || []).indexOf(k) === -1;
      });
      shuffle(others);
      var allowed = [right].concat(others.slice(0, 3));
      [].forEach.call(colorRow.children, function (b) {
        var ok = allowed.indexOf(b.dataset.key) !== -1;
        b.classList.toggle("dim", !ok);
        b.disabled = !ok;
      });
    }
    renderDetScore();
  }

  function renderDetScore() {
    var best = parseInt(readStr(bestKey(), "0"), 10) || 0;
    detScoreEl.textContent = "Streak: " + detStreak + " 🔥   ·   Best streak: " + best + " 🏅";
  }

  function answerDetective(key, btn) {
    if (detBusy || !detEntry) return;
    var right = detEntry.c;
    var ok = key === right || (detEntry.also || []).indexOf(key) !== -1;
    var info = letterInfo(detEntry.w);

    if (!ok) {
      detTries++;
      detStreak = 0;
      renderDetScore();
      detCard.classList.add("wrong");
      btn.classList.remove("wrongpick");
      void btn.offsetWidth;
      btn.classList.add("wrongpick");
      window.SFX && SFX.nope();
      if (detTries === 1) {
        flashHint("Not quite — a " + detEntry.w.toLowerCase() + " isn't " +
          COLORS[key].name + ". Have another look! 🤔", true);
      } else {
        flashHint("Close! Think again — is a " + detEntry.w.toLowerCase() +
          " more like " + COLORS[right].name + "? Tap “Tell me 💡” if you're stuck.", true);
      }
      return;
    }

    detBusy = true;
    detStreak++;
    var best = parseInt(readStr(bestKey(), "0"), 10) || 0;
    if (detStreak > best) writeStr(bestKey(), String(detStreak));
    renderDetScore();
    markSeen(detEntry.w);
    detCard.classList.remove("wrong");
    detCard.classList.add("right");
    addStar();
    window.SFX && (detStreak >= 3 ? SFX.win() : SFX.good());
    if (detStreak >= 3 && window.Confetti) Confetti.burst({ count: 50 });

    var idx = autoIndex(info.letters);
    placeWord(detEntry.w, info, idx, key, true);
    flashHint("✅ Yes! A " + detEntry.w.toLowerCase() + " is " + COLORS[key].name +
      ". It joins your grid in row " + info.letters[idx].ch + "!", false);
    detAskEl.textContent = "✅ " + COLORS[key].name + " — correct!";

    detTimer = setTimeout(nextDetective, 1900);
  }

  detTellBtn.addEventListener("click", function () {
    if (detBusy || !detEntry) return;
    detBusy = true;
    var right = detEntry.c;
    var info = letterInfo(detEntry.w);
    var idx = autoIndex(info.letters);
    detStreak = 0;
    renderDetScore();
    markSeen(detEntry.w);
    detCard.classList.remove("wrong");
    detAskEl.textContent = "💡 A " + detEntry.w.toLowerCase() + " is " + COLORS[right].name + ".";
    placeWord(detEntry.w, info, idx, right, true);
    flashHint("💡 A " + detEntry.w.toLowerCase() + " is " + COLORS[right].name +
      " — now you know! It's in your grid.", false);
    detTimer = setTimeout(nextDetective, 2100);
  });

  detSkipBtn.addEventListener("click", function () {
    if (detEntry) markSeen(detEntry.w);
    nextDetective();
    flashHint("New word! 🔎", false);
  });

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  /* ---------- helpers ---------- */
  function flashHint(msg, isError) {
    hint.textContent = msg;
    hint.style.color = isError ? "#c72c2c" : "#6a3ed6";
  }
  function shake() {
    input.classList.remove("shake");
    void input.offsetWidth;
    input.classList.add("shake");
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function stopTimers() {
    clearTimeout(questTimer);
    clearTimeout(detTimer);
    disarmClear();
  }

  /* ---------- starter words (a fresh handful each tap) ---------- */
  starterBtn.addEventListener("click", function () {
    if (!ALL_ENTRIES.length) return;
    // only words this grid doesn't have yet, so tapping again always helps
    var missing = ALL_ENTRIES.filter(function (e) {
      var key = keyFor(autoLetter(e.w, e.l), e.c);
      var list = grid[key];
      return !list || !list.some(function (w) { return w.toLowerCase() === e.w.toLowerCase(); });
    });
    if (!missing.length) {
      flashHint("Every starter word is already in your grid — you're a champion! 🏆", false);
      starterBtn.textContent = "All starters loaded 🏆";
      return;
    }
    pushUndo("starter words");
    shuffle(missing);
    var batch = missing.slice(0, STARTER_BATCH);
    batch.forEach(function (e) {
      var key = keyFor(autoLetter(e.w, e.l), e.c);
      if (!grid[key]) grid[key] = [];
      grid[key].push(e.w);
    });
    save();
    renderAll();
    initQuest(); // the starter words may have filled the quest square
    var left = missing.length - batch.length;
    flashHint("Added " + batch.length + " starter words ✨ (" + left + " more waiting)", false);
    starterBtn.textContent = left ? "Add " + Math.min(STARTER_BATCH, left) + " more starters ✨"
                                  : "All starters loaded 🏆";
    window.SFX && SFX.coin();
  });

  /* ---------- clear grid (two-tap, and undoable) ---------- */
  var clearArmed = false;
  function disarmClear() {
    clearArmed = false;
    clearTimeout(clearArmTimer);
    clearBtn.textContent = "Clear grid 🗑️";
    clearBtn.classList.remove("armed");
  }
  clearBtn.addEventListener("click", function () {
    if (!clearArmed) {
      clearArmed = true;
      clearBtn.textContent = "Really clear it? 🗑️";
      clearBtn.classList.add("armed");
      flashHint("Tap again to empty the whole grid — or wait, and nothing happens.", true);
      clearArmTimer = setTimeout(disarmClear, 5000);
      return;
    }
    disarmClear();
    pushUndo("clear");
    hideChooser();
    hideSpellout();
    grid = {};
    save();
    renderAll();
    newQuest();
    starterBtn.textContent = "Load starter words ✨";
    flashHint("Fresh grid — start typing! (Undo is right there ↩️)", false);
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    addWord(input.value);
  });

  /* ---------- go ---------- */
  buildGrid();
  renderAll();
  renderStars();
  initQuest();
  syncTiers();
  markSelected(kidRow, "kid", currentKid);
  markSelected(variantRow, "variant", activeVariant);
  markSelected(modeRow, "mode", activeMode);
  setColor(readStr(colorKey(), COLOR_KEYS[0]), true);
  buildPanel.hidden = activeMode === "detective";
  detPanel.hidden = activeMode !== "detective";
  colorRow.classList.toggle("answering", activeMode === "detective");
  updateHow();
  if (activeMode === "detective") nextDetective();

  if (updateCount() === 0) {
    flashHint("Your grid is empty — pick a colour and type your first word! 🎨", false);
  } else {
    flashHint("Welcome back — " + updateCount() + " words waiting for you. ✨", false);
  }
})();
