/* ===========================================================
   Comic Maker — build your own graphic novel!
   -----------------------------------------------------------
   Jeannie picks a panel, drops in character stickers, adds
   talk/thought/shout bubbles and story captions, chooses a
   scene background, and flips through pages of her story.
   Everything is saved in the browser, and she can print the
   whole book to PDF.

   Data model (saved as JSON in localStorage):
     book  = { title, pages:[ page ] }
     page  = { layout, panels:[ panel ] }
     panel = { scene, items:[ item ] }
     item  = { id, type, x, y, size, flip, text, z }
   Positions x/y are PERCENT of the panel (centre of the item).
   =========================================================== */

(function () {
  "use strict";

  var STORAGE_KEY = "jeannieComicMaker.v1";
  var PANELS_FOR = { "1": 1, "2v": 2, "2h": 2, "3": 3, "4": 4 };
  var SCENE_MAP = {};
  SCENES.forEach(function (s) { SCENE_MAP[s.key] = s; });

  /* ---------- elements ---------- */
  var pageEl     = document.getElementById("page");
  var titleEl    = document.getElementById("book-title");
  var hintEl     = document.getElementById("hint");
  var pageLabel  = document.getElementById("page-label");
  var prevBtn    = document.getElementById("prev-page");
  var nextBtn    = document.getElementById("next-page");
  var catRow     = document.getElementById("cat-row");
  var stickerPad = document.getElementById("sticker-pad");
  var scenePad   = document.getElementById("scene-pad");
  var layoutRow  = document.getElementById("layout-row");

  /* ---------- state ---------- */
  var book = load();
  var curPage = 0;
  var selPanel = 0;
  var selItemId = null;
  var seq = 1; // id counter

  /* ---------- storage ---------- */
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return newBook();
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(book)); } catch (e) {}
  }
  function newBook() {
    return { title: "My Comic", pages: [ newPage("4") ] };
  }
  function newPage(layout) {
    var n = PANELS_FOR[layout] || 4;
    var panels = [];
    for (var i = 0; i < n; i++) panels.push({ scene: "sky", items: [] });
    return { layout: layout, panels: panels };
  }
  function nextId() { return "i" + (seq++); }

  function page() { return book.pages[curPage]; }
  function panel() { return page().panels[selPanel]; }

  /* ---------- build the toolbox (once) ---------- */
  // category buttons + first sticker pad
  var curCat = 0;
  STICKERS.forEach(function (cat, idx) {
    var b = document.createElement("button");
    b.className = "cat" + (idx === 0 ? " on" : "");
    b.textContent = cat.tab + " " + cat.name;
    b.addEventListener("click", function () {
      curCat = idx;
      [].forEach.call(catRow.children, function (c, i) { c.classList.toggle("on", i === idx); });
      buildStickerPad();
    });
    catRow.appendChild(b);
  });

  function buildStickerPad() {
    stickerPad.innerHTML = "";
    var list = STICKERS[curCat].items.trim().split(/\s+/);
    list.forEach(function (emoji) {
      var b = document.createElement("button");
      b.className = "sticker-btn";
      b.textContent = emoji;
      b.setAttribute("aria-label", "Add sticker");
      b.addEventListener("click", function () { addSticker(emoji); });
      stickerPad.appendChild(b);
    });
  }

  // scene swatches
  SCENES.forEach(function (s) {
    var b = document.createElement("button");
    b.className = "scene-btn" + (s.dark ? " dark" : "");
    b.style.background = s.css;
    b.textContent = s.name;
    b.setAttribute("aria-label", "Scene " + s.name);
    b.addEventListener("click", function () { setScene(s.key); });
    scenePad.appendChild(b);
  });

  buildStickerPad();

  /* ---------- tabs ---------- */
  var tabs = document.querySelectorAll(".tab");
  [].forEach.call(tabs, function (t) {
    t.addEventListener("click", function () {
      var name = t.dataset.tab;
      [].forEach.call(tabs, function (x) { x.classList.toggle("on", x === t); });
      ["stickers", "words", "scenes", "page", "book"].forEach(function (n) {
        document.getElementById("tray-" + n).classList.toggle("hide", n !== name);
      });
    });
  });

  /* ---------- render the comic page ---------- */
  function renderPage() {
    var p = page();
    pageEl.className = "page l-" + p.layout;
    pageEl.innerHTML = "";
    if (selPanel >= p.panels.length) selPanel = 0;

    p.panels.forEach(function (pan, pi) {
      var pe = document.createElement("div");
      pe.className = "panel" + (pi === selPanel ? " sel" : "") + (pan.items.length ? "" : " empty");
      pe.style.background = (SCENE_MAP[pan.scene] || SCENE_MAP.sky).css;
      pe.dataset.index = pi;

      // tap empty panel area = select this panel & deselect item
      pe.addEventListener("pointerdown", function (ev) {
        if (ev.target === pe) {
          selPanel = pi;
          selItemId = null;
          refreshSelection();
        }
      });

      // draw items (sorted by z so stacking is stable)
      pan.items.slice().sort(function (a, b) { return (a.z || 0) - (b.z || 0); })
        .forEach(function (it) { pe.appendChild(buildItem(it, pan, pi)); });

      pageEl.appendChild(pe);
    });

    updatePageNav();
    syncLayoutButtons();
  }

  function buildItem(it, pan, panelIdx) {
    var el = document.createElement("div");
    var isText = it.type !== "sticker";
    el.className = "item " + it.type + (isText ? " text" : "") + (it.flip ? " flip" : "");
    el.dataset.id = it.id;
    el.style.left = it.x + "%";
    el.style.top = it.y + "%";
    el.style.setProperty("--sz", it.size);
    el.style.zIndex = String(10 + (it.z || 0));

    if (isText) {
      var txt = document.createElement("div");
      txt.className = "txt";
      txt.contentEditable = "true";
      txt.spellcheck = false;
      txt.textContent = it.text || "";
      txt.addEventListener("input", function () {
        it.text = txt.textContent;
        save();
      });
      txt.addEventListener("focus", function () { selectItem(it.id, panelIdx); });
      // typing/tapping the text must not start a drag
      txt.addEventListener("pointerdown", function (ev) { ev.stopPropagation(); selectItem(it.id, panelIdx); });
      el.appendChild(txt);

      var grip = document.createElement("div");
      grip.className = "grip";
      grip.textContent = "✥";
      grip.title = "Drag to move";
      grip.addEventListener("pointerdown", function (ev) { startDrag(ev, it, el, panelIdx); });
      el.appendChild(grip);
    } else {
      var em = document.createElement("span");
      em.className = "emoji";
      em.textContent = it.text;
      el.appendChild(em);
      el.addEventListener("pointerdown", function (ev) { startDrag(ev, it, el, panelIdx); });
    }

    el.appendChild(buildItemTools(it, pan, panelIdx));
    return el;
  }

  function buildItemTools(it, pan, panelIdx) {
    var bar = document.createElement("div");
    bar.className = "item-tools";
    var isText = it.type !== "sticker";

    function mkBtn(label, cls, fn) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = cls || "";
      b.textContent = label;
      b.addEventListener("pointerdown", function (ev) { ev.stopPropagation(); });
      b.addEventListener("click", function (ev) { ev.stopPropagation(); fn(); });
      return b;
    }

    bar.appendChild(mkBtn("－", "", function () { resize(it, -1); }));
    bar.appendChild(mkBtn("＋", "", function () { resize(it, +1); }));
    if (!isText) bar.appendChild(mkBtn("⇄", "", function () { it.flip = !it.flip; save(); renderPage(); refreshSelection(); }));
    bar.appendChild(mkBtn("⬆", "", function () { bringFront(it, pan); }));
    bar.appendChild(mkBtn("🗑", "del", function () { deleteItem(it, pan, panelIdx); }));
    return bar;
  }

  function resize(it, dir) {
    var isText = it.type !== "sticker";
    var step = isText ? 0.8 : 2;
    var min = isText ? 3 : 6;
    var max = isText ? 14 : 42;
    it.size = Math.max(min, Math.min(max, (it.size || (isText ? 5.5 : 14)) + dir * step));
    save();
    var el = pageEl.querySelector('.item[data-id="' + it.id + '"]');
    if (el) el.style.setProperty("--sz", it.size);
  }

  function bringFront(it, pan) {
    var maxZ = 0;
    pan.items.forEach(function (o) { if ((o.z || 0) > maxZ) maxZ = o.z || 0; });
    it.z = maxZ + 1;
    save();
    renderPage();
    refreshSelection();
  }

  function deleteItem(it, pan, panelIdx) {
    var i = pan.items.indexOf(it);
    if (i >= 0) pan.items.splice(i, 1);
    selItemId = null;
    save();
    renderPage();
    selPanel = panelIdx;
    refreshSelection();
  }

  /* ---------- selection ---------- */
  function selectItem(id, panelIdx) {
    selItemId = id;
    if (typeof panelIdx === "number") selPanel = panelIdx;
    refreshSelection();
  }

  function refreshSelection() {
    [].forEach.call(pageEl.querySelectorAll(".panel"), function (pe, i) {
      pe.classList.toggle("sel", i === selPanel);
    });
    [].forEach.call(pageEl.querySelectorAll(".item"), function (el) {
      el.classList.toggle("sel", el.dataset.id === selItemId);
    });
  }

  /* ---------- dragging ---------- */
  function startDrag(ev, it, el, panelIdx) {
    ev.preventDefault();
    ev.stopPropagation();
    selectItem(it.id, panelIdx);

    var panelEl = el.parentNode;
    var rect = panelEl.getBoundingClientRect();
    var moved = false;
    try { el.setPointerCapture(ev.pointerId); } catch (e) {}

    function onMove(e) {
      moved = true;
      var px = (e.clientX - rect.left) / rect.width * 100;
      var py = (e.clientY - rect.top) / rect.height * 100;
      it.x = clamp(px, 2, 98);
      it.y = clamp(py, 2, 98);
      el.style.left = it.x + "%";
      el.style.top = it.y + "%";
    }
    function onUp() {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      if (moved) save();
    }
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* ---------- adding things ---------- */
  function addSticker(emoji) {
    panel().items.push({
      id: nextId(), type: "sticker", text: emoji,
      x: 50, y: 55, size: 16, flip: false, z: topZ() + 1
    });
    save();
    renderPage();
    selectLastItem();
    flash("Drag it where you want! ✋");
  }

  var DEFAULT_TEXT = {
    speech: "Hi!", thought: "Hmm…", shout: "WOW!", caption: "And then…"
  };
  function addBubble(type) {
    panel().items.push({
      id: nextId(), type: type, text: DEFAULT_TEXT[type] || "…",
      x: type === "caption" ? 50 : 38,
      y: type === "caption" ? 12 : 28,
      size: type === "caption" ? 5 : 6, z: topZ() + 1
    });
    save();
    renderPage();
    selectLastItem();
    flash("Tap the bubble and type your words! ⌨️");
  }

  function topZ() {
    var m = 0;
    panel().items.forEach(function (o) { if ((o.z || 0) > m) m = o.z || 0; });
    return m;
  }
  function selectLastItem() {
    var items = panel().items;
    if (items.length) selItemId = items[items.length - 1].id;
    refreshSelection();
  }

  function setScene(key) {
    panel().scene = key;
    save();
    var pe = pageEl.querySelector('.panel[data-index="' + selPanel + '"]');
    if (pe) pe.style.background = SCENE_MAP[key].css;
    flash("Scene changed! 🎨");
  }

  /* ---------- page navigation ---------- */
  function updatePageNav() {
    pageLabel.textContent = "Page " + (curPage + 1) + " of " + book.pages.length;
    prevBtn.disabled = curPage === 0;
    nextBtn.disabled = curPage === book.pages.length - 1;
  }
  function goPage(i) {
    curPage = clamp(i, 0, book.pages.length - 1);
    selPanel = 0;
    selItemId = null;
    renderPage();
  }

  prevBtn.addEventListener("click", function () { goPage(curPage - 1); });
  nextBtn.addEventListener("click", function () { goPage(curPage + 1); });

  document.getElementById("add-page").addEventListener("click", function () {
    book.pages.splice(curPage + 1, 0, newPage(page().layout));
    save();
    goPage(curPage + 1);
    flash("New page added — keep the story going! 📖");
  });

  document.getElementById("del-page").addEventListener("click", function () {
    if (book.pages.length === 1) {
      if (!confirm("This is the only page. Clear it and start fresh?")) return;
      book.pages[0] = newPage(page().layout);
      save();
      goPage(0);
      return;
    }
    if (!confirm("Delete this whole page?")) return;
    book.pages.splice(curPage, 1);
    save();
    goPage(Math.max(0, curPage - 1));
  });

  document.getElementById("clear-panel").addEventListener("click", function () {
    if (!panel().items.length) { flash("This panel is already empty 🙂"); return; }
    if (!confirm("Clear everything in the selected panel?")) return;
    panel().items = [];
    selItemId = null;
    save();
    renderPage();
    refreshSelection();
  });

  /* ---------- layout ---------- */
  layoutRow.addEventListener("click", function (ev) {
    var btn = ev.target.closest("[data-layout]");
    if (!btn) return;
    setLayout(btn.dataset.layout);
  });

  function setLayout(layout) {
    var p = page();
    if (p.layout === layout) return;
    var want = PANELS_FOR[layout];
    var panels = p.panels.slice(0, want);
    while (panels.length < want) panels.push({ scene: "sky", items: [] });
    p.layout = layout;
    p.panels = panels;
    if (selPanel >= want) selPanel = 0;
    save();
    renderPage();
    refreshSelection();
  }

  function syncLayoutButtons() {
    [].forEach.call(layoutRow.querySelectorAll(".layout-btn"), function (b) {
      b.classList.toggle("on", b.dataset.layout === page().layout);
    });
  }

  /* ---------- words buttons ---------- */
  [].forEach.call(document.querySelectorAll("[data-add]"), function (b) {
    b.addEventListener("click", function () { addBubble(b.dataset.add); });
  });

  /* ---------- book title ---------- */
  titleEl.textContent = book.title || "My Comic";
  titleEl.addEventListener("input", function () {
    book.title = titleEl.textContent.trim() || "My Comic";
    save();
  });
  titleEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); titleEl.blur(); }
  });

  /* ---------- print ---------- */
  document.getElementById("print").addEventListener("click", function () {
    selItemId = null;
    refreshSelection();
    flash("Tip: choose 'Save as PDF' to keep your comic! 🖨️");
    setTimeout(function () { window.print(); }, 60);
  });

  /* ---------- example & new book ---------- */
  document.getElementById("new-book").addEventListener("click", function () {
    if (!confirm("Start a brand new book? Your current one will be erased.")) return;
    book = newBook();
    seq = 1;
    save();
    titleEl.textContent = book.title;
    goPage(0);
    flash("Fresh book — happy storytelling! ✨");
  });

  document.getElementById("example").addEventListener("click", function () {
    if (!confirm("Load an example comic? This replaces your current book.")) return;
    book = exampleBook();
    save();
    titleEl.textContent = book.title;
    goPage(0);
    flash("Here's an example — now make it your own! ✏️");
  });

  function exampleBook() {
    var z = 0;
    function it(type, text, x, y, size, flip) {
      return { id: nextId(), type: type, text: text, x: x, y: y, size: size, flip: !!flip, z: ++z };
    }
    return {
      title: "The Brave Little Dragon",
      pages: [
        {
          layout: "4",
          panels: [
            { scene: "castle", items: [
              it("caption", "Once upon a time…", 50, 12, 4.5),
              it("sticker", "🐉", 40, 60, 22),
              it("sticker", "🏰", 75, 62, 20),
              it("speech", "I want an adventure!", 42, 28, 5.5)
            ]},
            { scene: "forest", items: [
              it("sticker", "🐉", 30, 58, 20),
              it("sticker", "🦊", 70, 64, 16, true),
              it("speech", "Can you help me?", 64, 26, 5)
            ]},
            { scene: "ocean", items: [
              it("sticker", "🐉", 35, 50, 20),
              it("sticker", "🐙", 70, 65, 18),
              it("shout", "WHOA!", 60, 24, 6)
            ]},
            { scene: "sunset", items: [
              it("caption", "…and they were friends forever.", 50, 14, 4.2),
              it("sticker", "🐉", 38, 60, 20),
              it("sticker", "🦊", 62, 62, 16, true),
              it("sticker", "❤️", 50, 38, 10)
            ]}
          ]
        }
      ]
    };
  }

  /* ---------- click empty space deselects item ---------- */
  document.addEventListener("pointerdown", function (ev) {
    if (!ev.target.closest(".page") && !ev.target.closest(".item-tools")) {
      if (selItemId) { selItemId = null; refreshSelection(); }
    }
  });

  /* ---------- little hint helper ---------- */
  var hintTimer = null;
  function flash(msg) {
    hintEl.textContent = msg;
    if (hintTimer) clearTimeout(hintTimer);
    hintTimer = setTimeout(function () {
      hintEl.textContent = "Tap a panel, then add stickers & words ✨";
    }, 2600);
  }

  /* ---------- make sure id counter is ahead of saved ids ---------- */
  (function primeSeq() {
    var max = 0;
    book.pages.forEach(function (p) {
      p.panels.forEach(function (pan) {
        pan.items.forEach(function (it) {
          var n = parseInt(String(it.id).replace(/\D/g, ""), 10);
          if (n > max) max = n;
        });
      });
    });
    seq = max + 1;
  })();

  /* ---------- go! ---------- */
  renderPage();
})();
