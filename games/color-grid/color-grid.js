/* ===========================================================
   Color Grid Quest — BUILD-YOUR-OWN grid
   -----------------------------------------------------------
   Cory picks a colour, types any word he likes, and it drops
   into the grid automatically in the row for its first letter.
   Everything he types is saved in the browser so his grid is
   still there next time he comes back.
   =========================================================== */

(function () {
  var LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  var COLOR_KEYS = Object.keys(COLORS);

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
    { id: "start",  label: "Start", emoji: "🏁", desc: "first letter" },
    { id: "middle", label: "Middle", emoji: "🎯", desc: "a middle letter" },
    { id: "end",    label: "End",   emoji: "🔚", desc: "last letter" }
  ];
  var VARIANT_KEY = "colorGrid.variant";

  // emoji lookup so starter words (and re-typed favourites) show a picture
  var EMOJI = {};
  if (typeof ENTRIES !== "undefined") {
    ENTRIES.forEach(function (e) { if (e.e) EMOJI[e.w.toLowerCase()] = e.e; });
  }

  var MILESTONES = [10, 25, 50, 100, 150, 200];

  var kidRow = document.getElementById("kid-row");
  var variantRow = document.getElementById("variant-row");
  var colorRow = document.getElementById("color-row");
  var form = document.getElementById("add-form");
  var input = document.getElementById("word-input");
  var hint = document.getElementById("hint");
  var howEl = document.getElementById("how");
  var chooser = document.getElementById("chooser");
  var countEl = document.getElementById("count");
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

  // grid data: { "C|green": ["Creeper", "Cactus"], ... }
  var grid = load();
  var activeColor = COLOR_KEYS[0];

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
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }
  function save() {
    try { localStorage.setItem(storageKey(), JSON.stringify(grid)); } catch (e) {}
  }
  function keyFor(letter, color) { return letter + "|" + color; }

  /* ---------- quest stars (per kid) ---------- */
  function starsKey() { return "colorGrid.stars:" + currentKid; }
  function loadStars() {
    try { return parseInt(localStorage.getItem(starsKey()), 10) || 0; } catch (e) { return 0; }
  }
  function addStar() {
    try { localStorage.setItem(starsKey(), String(loadStars() + 1)); } catch (e) {}
    renderStars();
  }
  function renderStars() { starsEl.textContent = String(loadStars()); }

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
    grid = load();
    renderAll();
    renderStars();
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
      "Tap your name and a <b>variant</b> (Start, Middle or End), then pick a " +
      "<b>colour</b>, type any word that's that colour, and press <b>Add</b> — " +
      "it lands in " + where + "! ✨";
  }

  /* ---------- build the colour picker ---------- */
  COLOR_KEYS.forEach(function (key) {
    var c = COLORS[key];
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "color-pick";
    btn.style.background = c.hex;
    btn.style.color = c.dark ? "#2b2440" : "#fff";
    btn.textContent = c.name;
    btn.setAttribute("aria-label", "Use the colour " + c.name);
    btn.addEventListener("click", function () { setColor(key); });
    btn.dataset.key = key;
    colorRow.appendChild(btn);
  });

  function setColor(key) {
    activeColor = key;
    var c = COLORS[key];
    [].forEach.call(colorRow.children, function (b) {
      b.classList.toggle("selected", b.dataset.key === key);
    });
    // tint the input so he can see which colour he's adding
    input.style.borderColor = c.hex;
    input.style.background = c.hex + "22";
    input.focus();
  }

  /* ---------- build the grid table ---------- */
  function buildGrid() {
    // header: corner + colour columns
    var headRow = document.createElement("tr");
    headRow.appendChild(cell("th", "", "corner"));
    COLOR_KEYS.forEach(function (key) {
      var c = COLORS[key];
      var th = cell("th", c.name, "col-head");
      th.style.background = c.hex;
      th.style.color = c.dark ? "#2b2440" : "#fff";
      headRow.appendChild(th);
    });
    gridHead.appendChild(headRow);

    // one row per letter
    LETTERS.forEach(function (letter) {
      var tr = document.createElement("tr");
      tr.appendChild(cell("th", letter, "row-head"));
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
    var words = grid[keyFor(letter, color)] || [];
    words.forEach(function (word, i) {
      var chip = document.createElement("span");
      chip.className = "chip";
      var c = COLORS[color];
      chip.style.background = c.hex;
      chip.style.color = c.dark ? "#2b2440" : "#fff";
      var emoji = EMOJI[word.toLowerCase()];
      chip.innerHTML = (emoji ? '<span aria-hidden="true">' + emoji + "</span>" : "") +
        "<span>" + escapeHtml(word) + "</span>" +
        '<button class="chip-x" aria-label="Remove ' + escapeHtml(word) + '">×</button>';
      chip.querySelector(".chip-x").addEventListener("click", function () {
        removeWord(letter, color, i);
      });
      td.appendChild(chip);
    });
  }

  function renderAll() {
    LETTERS.forEach(function (letter) {
      COLOR_KEYS.forEach(function (key) { renderCell(letter, key); });
    });
    updateCount();
  }

  function updateCount() {
    var total = 0;
    Object.keys(grid).forEach(function (k) { total += grid[k].length; });
    countEl.textContent = String(total);
    return total;
  }

  /* ---------- word quests ----------
     A little challenge: "add a Green word to row B!" Quests are only
     drawn from (letter, colour) pairs that the starter list proves have
     an answer, and only for cells that are still empty. Completing one
     earns a star (saved per kid). */
  var quest = null;

  function questKey() { return "colorGrid.quest:" + currentKid + ":" + activeVariant; }

  // every (letter,colour) pair that ENTRIES can answer under this variant
  function questPairs() {
    var byKey = {};
    if (typeof ENTRIES !== "undefined") {
      ENTRIES.forEach(function (e) {
        var letter = starterLetter(e.w, e.l);
        var k = keyFor(letter, e.c);
        (byKey[k] = byKey[k] || []).push(e);
      });
    }
    return byKey;
  }

  // prefer cells that are still empty; once the grid is well fed, any
  // provable (letter, colour) pair works — "add ANOTHER word to…"
  function questCandidates() {
    var byKey = questPairs();
    var empty = [], all = [];
    Object.keys(byKey).forEach(function (k) {
      var bits = k.split("|");
      var cand = { letter: bits[0], color: bits[1] };
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
    quest = { letter: q.letter, color: q.color };
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
    if (quest && !COLORS[quest.color]) quest = null;
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
    var c = COLORS[quest.color];
    var another = (grid[keyFor(quest.letter, quest.color)] || []).length ? "another" : "a";
    questTextEl.innerHTML = "⭐ Quest: add " + another + ' <b class="qcolor" style="background:' + c.hex +
      ";color:" + (c.dark ? "#2b2440" : "#fff") + '">' + c.name + "</b> word to row <b>" +
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
    var key = keyFor(quest.letter, quest.color);
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

    var letters = word.toUpperCase().match(/[A-Z]/g);
    if (!letters || !letters.length) {
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

  // File `word` into the row for `letter` in the active colour.
  function placeWord(word, letter) {
    var key = keyFor(letter, activeColor);
    if (!grid[key]) grid[key] = [];

    // avoid exact duplicates in the same cell
    var exists = grid[key].some(function (w) {
      return w.toLowerCase() === word.toLowerCase();
    });
    if (!exists) grid[key].push(word);

    save();
    renderCell(letter, activeColor);
    var total = updateCount();

    var td = document.getElementById("c-" + letter + "-" + activeColor);
    td.classList.remove("flash");
    void td.offsetWidth; // restart animation
    td.classList.add("flash");
    td.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });

    var how = activeVariant === "end" ? "ends in " + letter + " →"
      : activeVariant === "middle" ? "counts as " + letter + " →"
      : "goes in";
    flashHint('"' + word + '" ' + how + " row " + letter + "! ✨", false);
    window.SFX && SFX.good();
    input.value = "";
    input.focus();

    // did that finish the quest? (any NEW word in the quest square counts)
    if (!exists && quest && quest.letter === letter && quest.color === activeColor) {
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

  function removeWord(letter, color, index) {
    var key = keyFor(letter, color);
    if (!grid[key]) return;
    grid[key].splice(index, 1);
    if (grid[key].length === 0) delete grid[key];
    save();
    renderCell(letter, color);
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
  function starterLetter(word, fallbackFirst) {
    var letters = word.toUpperCase().match(/[A-Z]/g);
    if (!letters || !letters.length) return fallbackFirst;
    if (activeVariant === "end") return letters[letters.length - 1];
    if (activeVariant === "middle") return letters[Math.floor(letters.length / 2)];
    return letters[0];
  }

  starterBtn.addEventListener("click", function () {
    if (typeof ENTRIES === "undefined") return;
    ENTRIES.forEach(function (e) {
      var letter = starterLetter(e.w, e.l);
      var key = keyFor(letter, e.c);
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
  initQuest();
  setColor(activeColor);
  updateHow();
  if (updateCount() === 0) {
    flashHint("Your grid is empty — pick a colour and type your first word! 🎨", false);
  }
  [].forEach.call(kidRow.children, function (b) {
    b.classList.toggle("selected", b.dataset.kid === currentKid);
  });
  [].forEach.call(variantRow.children, function (b) {
    b.classList.toggle("selected", b.dataset.variant === activeVariant);
  });
})();
