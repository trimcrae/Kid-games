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
      chip.innerHTML = "<span>" + escapeHtml(word) + "</span>" +
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
  }

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
    updateCount();

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
    flashHint("Loaded some starter words — add your own too! ✨", false);
  });

  clearBtn.addEventListener("click", function () {
    if (!window.confirm("Clear the whole grid? This can't be undone.")) return;
    hideChooser();
    grid = {};
    save();
    renderAll();
    flashHint("Fresh grid — start typing! ✨", false);
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    addWord(input.value);
  });

  /* ---------- go ---------- */
  buildGrid();
  renderAll();
  setColor(activeColor);
  updateHow();
  [].forEach.call(kidRow.children, function (b) {
    b.classList.toggle("selected", b.dataset.kid === currentKid);
  });
  [].forEach.call(variantRow.children, function (b) {
    b.classList.toggle("selected", b.dataset.variant === activeVariant);
  });
})();
