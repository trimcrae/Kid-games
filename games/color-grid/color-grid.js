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

  var kidRow = document.getElementById("kid-row");
  var colorRow = document.getElementById("color-row");
  var form = document.getElementById("add-form");
  var input = document.getElementById("word-input");
  var hint = document.getElementById("hint");
  var countEl = document.getElementById("count");
  var gridBody = document.getElementById("grid-body");
  var gridHead = document.getElementById("grid-head");
  var starterBtn = document.getElementById("starter");
  var clearBtn = document.getElementById("clear");

  var currentKid = localStorage.getItem(CURRENT_KID_KEY) || "cory";
  if (!KIDS.some(function (k) { return k.id === currentKid; })) currentKid = "cory";

  // grid data: { "C|green": ["Creeper", "Cactus"], ... }
  var grid = load();
  var activeColor = COLOR_KEYS[0];

  /* ---------- storage (namespaced per kid) ---------- */
  function storageKey() { return "colorGrid.v1:" + currentKid; }
  function load() {
    try {
      var raw = localStorage.getItem(storageKey());
      // one-time migration of Cory's old un-namespaced grid
      if (!raw && currentKid === "cory") {
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
    grid = load();
    renderAll();
    var kid = KIDS.filter(function (k) { return k.id === id; })[0];
    flashHint(kid.name + "'s grid — type away! ✨", false);
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

    var first = word.toUpperCase().match(/[A-Z]/);
    if (!first) {
      flashHint("Try a word that starts with a letter! 🙂", true);
      shake();
      window.SFX && SFX.nope();
      return;
    }
    var letter = first[0];
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

    flashHint('"' + word + '" goes in row ' + letter + "! ✨", false);
    window.SFX && SFX.good();
    input.value = "";
    input.focus();
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
  starterBtn.addEventListener("click", function () {
    if (typeof ENTRIES === "undefined") return;
    ENTRIES.forEach(function (e) {
      var key = keyFor(e.l, e.c);
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
  [].forEach.call(kidRow.children, function (b) {
    b.classList.toggle("selected", b.dataset.kid === currentKid);
  });
})();
