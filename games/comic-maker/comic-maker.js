/* ===========================================================
   Comic Maker — build your own graphic novel!
   -----------------------------------------------------------
   Jeannie picks a panel, drops in character stickers and comic
   sound words, adds talk/thought/shout bubbles and story
   captions, chooses a scene background, and flips through pages
   of her story. Items can be dragged, resized, spun, flipped,
   copied and deleted, with full Undo / Redo. Everything is
   saved in the browser, and she can print the book to PDF.

   Data model (saved as JSON in localStorage):
     book  = { title, pages:[ page ] }
     page  = { layout, panels:[ panel ] }
     panel = { scene, draw, items:[ item ] }
     item  = { id, type, x, y, size, rot, flip, tail, color, text, z }
   Positions x/y are PERCENT of the panel (centre of the item).
   `draw` is a PNG data-URL of the freehand drawing on that panel
   (the MS-Paint-style layer that sits under the stickers).
   =========================================================== */

(function () {
  "use strict";

  var STORAGE_KEY = "jeannieComicMaker.v1";
  var PANELS_FOR = { "1": 1, "2v": 2, "2h": 2, "3": 3, "4": 4 };
  var TAILS = ["bl", "br", "tr", "tl"];
  var TEXT_TYPES = { speech: 1, thought: 1, shout: 1, caption: 1, sfx: 1 };
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
  var sfxPad     = document.getElementById("sfx-pad");
  var scenePad   = document.getElementById("scene-pad");
  var layoutRow  = document.getElementById("layout-row");
  var itemBar    = document.getElementById("item-bar");
  var undoBtn    = document.getElementById("undo");
  var redoBtn    = document.getElementById("redo");

  /* ---------- state ---------- */
  var seq = 1;                      // must exist before load() sanitises ids
  var book = load();
  var curPage = 0;
  var selPanel = 0;
  var selItemId = null;
  var history = [];
  var future = [];
  var coKey = null, coTime = 0;     // history coalescing
  var editingSession = false;       // text-edit history guard

  /* ---------- drawing tool state ---------- */
  var drawMode  = true;             // tab "draw" => draw on the panel; other tabs => move items
  var tool      = "brush";          // brush | eraser | fill
  var penColor  = PAINT_COLORS[0];  // current brush / fill colour
  var penSize   = 12;               // brush / eraser width in panel pixels

  /* ---------- save-to-file state ---------- */
  var supportsFS = (typeof window.showSaveFilePicker === "function") &&
                   (typeof window.showOpenFilePicker === "function");
  var fileHandle = null;            // FileSystemFileHandle (Chromium browsers)
  var fileBound  = false;           // we hold read/write permission this session
  var fileName   = "";
  var fileSaveTimer = null;

  /* ---------- storage ---------- */
  var LEGACY_KEYS = ["jeannieComicMaker", "comicMaker.v1", "comic-maker.v1"];

  function load() {
    var raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    if (!raw) {
      // Older builds used other key names — keep those comics instead of orphaning them.
      for (var i = 0; i < LEGACY_KEYS.length && !raw; i++) {
        try {
          raw = localStorage.getItem(LEGACY_KEYS[i]);
          if (raw) localStorage.setItem(STORAGE_KEY, raw);
        } catch (e) {}
      }
    }
    if (raw) {
      try { return sanitizeBook(JSON.parse(raw)); } catch (e) {}
    }
    return newBook();
  }

  /* A half-written or hand-edited save used to be able to soft-lock the page
     (no pages, a panel count that doesn't match the layout, items with no id).
     Everything that comes in from storage or a file goes through here first. */
  var sanCount = 0;
  function sanitizeBook(b) {
    sanCount = 0;
    if (!b || typeof b !== "object") return newBook();
    var out = { title: typeof b.title === "string" ? b.title : "My Comic", pages: [] };
    var pages = Array.isArray(b.pages) ? b.pages : [];
    pages.forEach(function (p) {
      if (!p || typeof p !== "object") return;
      var layout = PANELS_FOR[p.layout] ? p.layout : "4";
      var want = PANELS_FOR[layout];
      var panels = (Array.isArray(p.panels) ? p.panels : []).slice(0, want).map(function (pan) {
        pan = (pan && typeof pan === "object") ? pan : {};
        return {
          scene: SCENE_MAP[pan.scene] ? pan.scene : "sky",
          draw: typeof pan.draw === "string" && pan.draw.indexOf("data:image") === 0 ? pan.draw : null,
          items: (Array.isArray(pan.items) ? pan.items : []).filter(function (it) {
            return it && typeof it === "object" && (it.type === "sticker" || isText(it.type));
          }).map(function (it) {
            return {
              // ids are internal only, so hand out fresh ones — that makes
              // duplicate/missing ids from an old save impossible.
              id: "i" + (++sanCount),
              type: it.type,
              text: typeof it.text === "string" ? it.text : "",
              x: num(it.x, 50, 2, 98), y: num(it.y, 50, 2, 98),
              size: num(it.size, isText(it.type) ? 6 : 16, 2, 60),
              rot: num(it.rot, 0, -360, 360),
              flip: !!it.flip,
              tail: TAILS.indexOf(it.tail) >= 0 ? it.tail : "bl",
              color: typeof it.color === "string" ? it.color : undefined,
              z: num(it.z, 0, 0, 9999)
            };
          })
        };
      });
      while (panels.length < want) panels.push({ scene: "sky", draw: null, items: [] });
      out.pages.push({ layout: layout, panels: panels });
    });
    if (!out.pages.length) out.pages.push(newPage("4"));
    seq = sanCount + 1;
    return out;
  }
  function num(v, dflt, lo, hi) {
    v = typeof v === "number" && isFinite(v) ? v : dflt;
    return Math.max(lo, Math.min(hi, v));
  }
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(book));
    } catch (e) {
      // Browser store is full (~5 MB). If we're saving to a real file, that's fine.
      if (!fileBound) {
        flash("⚠️ Out of room! Use 💾 Save to computer (in the 📚 Book tab) to keep big comics.");
      }
    }
    scheduleFileSave();
  }
  function newBook() { return { title: "My Comic", pages: [ newPage("4") ] }; }
  function newPage(layout) {
    var n = PANELS_FOR[layout] || 4;
    var panels = [];
    for (var i = 0; i < n; i++) panels.push({ scene: "sky", draw: null, items: [] });
    return { layout: layout, panels: panels };
  }
  function nextId() { return "i" + (seq++); }

  function page() { return book.pages[curPage]; }
  function panel() { return page().panels[selPanel]; }
  function isText(t) { return !!TEXT_TYPES[t]; }

  /* ---------- history / undo-redo ----------
     A snapshot used to be JSON.stringify(book) — which re-copied every
     panel's PNG data-URL on *every single brush stroke*. On a tablet that
     meant multi-megabyte strings and visible stutter while drawing.
     Now we shallow-clone the structure and simply re-point at the same
     (immutable) drawing strings, so history is cheap. */
  function cloneBook(b) {
    return {
      title: b.title,
      pages: b.pages.map(function (p) {
        return {
          layout: p.layout,
          panels: p.panels.map(function (pan) {
            return {
              scene: pan.scene,
              draw: pan.draw,                 // shared string, never copied
              items: pan.items.map(function (it) {
                var o = {}; for (var k in it) if (it.hasOwnProperty(k)) o[k] = it[k];
                return o;
              })
            };
          })
        };
      })
    };
  }
  function snapshot() {
    return { book: cloneBook(book), curPage: curPage, selPanel: selPanel };
  }
  function pushHistory(coalesce) {
    var now = Date.now();
    if (coalesce && coalesce === coKey && (now - coTime) < 800) { coTime = now; return; }
    coKey = coalesce || null; coTime = now;
    history.push(snapshot());
    if (history.length > 60) history.shift();
    future = [];
    updateUndoButtons();
  }
  function applySnapshot(snap) {
    book = cloneBook(snap.book);
    curPage = Math.max(0, Math.min(snap.curPage || 0, book.pages.length - 1));
    selPanel = snap.selPanel || 0;
    selItemId = null;
    titleEl.textContent = book.title || "My Comic";
    renderPage();
  }
  function undo() {
    if (!history.length) return;
    future.push(snapshot());
    applySnapshot(history.pop());
    save(); updateUndoButtons();
    flash("Undone ↶");
  }
  function redo() {
    if (!future.length) return;
    history.push(snapshot());
    applySnapshot(future.pop());
    save(); updateUndoButtons();
    flash("Redone ↷");
  }
  function updateUndoButtons() {
    undoBtn.disabled = history.length === 0;
    redoBtn.disabled = future.length === 0;
  }
  undoBtn.addEventListener("click", undo);
  redoBtn.addEventListener("click", redo);

  /* ---------- build sticker palette ---------- */
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
    STICKERS[curCat].items.trim().split(/\s+/).forEach(function (emoji) {
      var b = document.createElement("button");
      b.className = "sticker-btn";
      b.textContent = emoji;
      b.setAttribute("aria-label", "Add sticker");
      b.addEventListener("click", function () { addSticker(emoji); });
      stickerPad.appendChild(b);
    });
  }
  buildStickerPad();

  /* ---------- build sound-effect palette ---------- */
  SFX.forEach(function (s) {
    var b = document.createElement("button");
    b.className = "sfx-btn";
    b.textContent = s.w;
    b.style.color = s.c;
    b.setAttribute("aria-label", "Add sound word " + s.w);
    b.addEventListener("click", function () { addSfx(s.w, s.c); });
    sfxPad.appendChild(b);
  });

  /* ---------- build scene palette ---------- */
  SCENES.forEach(function (s) {
    var b = document.createElement("button");
    b.className = "scene-btn" + (s.dark ? " dark" : "");
    b.style.background = s.css;
    b.textContent = s.name;
    b.setAttribute("aria-label", "Scene " + s.name);
    b.addEventListener("click", function () { setScene(s.key); });
    scenePad.appendChild(b);
  });

  /* ---------- build draw-tool controls ---------- */
  var colorPad   = document.getElementById("color-pad");
  var toolRow    = document.getElementById("tool-row");
  var sizeRow    = document.getElementById("size-row");
  var customColor = document.getElementById("custom-color");

  PAINT_COLORS.forEach(function (col, idx) {
    var b = document.createElement("button");
    b.className = "color-btn" + (idx === 0 ? " on" : "");
    b.style.background = col;
    b.dataset.color = col;
    b.setAttribute("aria-label", "Draw with this colour");
    b.addEventListener("click", function () { pickColor(col); });
    colorPad.appendChild(b);
  });

  function pickColor(col) {
    penColor = col;
    if (tool !== "brush" && tool !== "fill") setTool("brush");  // grabbing a colour means painting
    [].forEach.call(colorPad.children, function (c) {
      c.classList.toggle("on", c.dataset.color === col);
    });
  }

  function setTool(t) {
    tool = t;
    [].forEach.call(toolRow.children, function (c) { c.classList.toggle("on", c.dataset.tool === t); });
    if (t === "eraser") flash("Eraser ready — wipe back to the background 🧽");
    else if (t === "fill") flash("Fill ready — tap an area to flood it 🪣");
    else if (t === "rainbow") flash("Rainbow brush! Every stroke changes colour 🌈");
  }
  toolRow.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-tool]");
    if (b) setTool(b.dataset.tool);
  });
  sizeRow.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-size]");
    if (!b) return;
    penSize = parseInt(b.dataset.size, 10) || 12;
    [].forEach.call(sizeRow.children, function (c) { c.classList.toggle("on", c === b); });
  });
  customColor.addEventListener("input", function () {
    penColor = customColor.value;
    if (tool !== "brush" && tool !== "fill") setTool("brush");
    [].forEach.call(colorPad.children, function (c) { c.classList.remove("on"); });
  });
  document.getElementById("draw-clear").addEventListener("click", function () {
    var pan = panel();
    if (!pan.draw) { flash("Nothing drawn here yet 🙂"); return; }
    if (!confirm("Erase the drawing in this panel? (Stickers stay.)")) return;
    pushHistory();
    pan.draw = null;
    save(); renderPage();
    flash("Drawing cleared ✏️");
  });

  /* ---------- tabs ---------- */
  var tabs = document.querySelectorAll(".tab");
  [].forEach.call(tabs, function (t) {
    t.addEventListener("click", function () {
      var name = t.dataset.tab;
      [].forEach.call(tabs, function (x) { x.classList.toggle("on", x === t); });
      ["draw", "stickers", "words", "sounds", "scenes", "page", "book"].forEach(function (n) {
        document.getElementById("tray-" + n).classList.toggle("hide", n !== name);
      });
      setDrawMode(name === "draw");
    });
  });

  // Draw tab => paint on the panel; any other tab => move/place items.
  function setDrawMode(on) {
    drawMode = on;
    pageEl.classList.toggle("drawing", on);
    if (on) {
      selItemId = null;
      refreshSelection();
      flash("Pick a colour and draw right on the panel! ✏️");
    }
  }

  /* ---------- build the floating item control bar ---------- */
  var BAR_BUTTONS = [
    { act: "smaller", label: "－",  title: "Smaller" },
    { act: "bigger",  label: "＋",  title: "Bigger" },
    { act: "rotL",    label: "↺",   title: "Spin left",  forSticker: true, forSfx: true },
    { act: "rotR",    label: "↻",   title: "Spin right", forSticker: true, forSfx: true },
    { act: "flip",    label: "⇄",   title: "Flip",       forSticker: true },
    { act: "tail",    label: "↘",   title: "Move the tail", forTail: true },
    { act: "dupe",    label: "⧉",   title: "Make a copy" },
    { act: "front",   label: "⬆",   title: "Bring to front" },
    { act: "del",     label: "🗑",  title: "Delete", cls: "del" }
  ];
  var barBtnEls = {};
  BAR_BUTTONS.forEach(function (spec) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = spec.label;
    b.title = spec.title;
    b.setAttribute("aria-label", spec.title);
    if (spec.cls) b.className = spec.cls;
    b.addEventListener("click", function () { itemAction(spec.act); });
    itemBar.appendChild(b);
    barBtnEls[spec.act] = { el: b, spec: spec };
  });

  function updateItemBar() {
    var sel = findSelected();
    if (!sel) { itemBar.classList.remove("show"); return; }
    var it = sel.item;
    var tailable = it.type === "speech" || it.type === "thought";
    Object.keys(barBtnEls).forEach(function (act) {
      var spec = barBtnEls[act].spec, show = true;
      if (spec.forSticker || spec.forSfx) {
        show = (spec.forSticker && it.type === "sticker") || (spec.forSfx && it.type === "sfx");
      }
      if (spec.forTail) show = tailable;
      barBtnEls[act].el.classList.toggle("hide", !show);
    });
    itemBar.classList.add("show");
  }

  /* ---------- render the comic page ---------- */
  function renderPage() {
    var p = page();
    pageEl.className = "page l-" + p.layout + (drawMode ? " drawing" : "");
    pageEl.innerHTML = "";
    if (selPanel >= p.panels.length) selPanel = 0;

    var canvases = [];
    p.panels.forEach(function (pan, pi) {
      var pe = document.createElement("div");
      var empty = !pan.items.length && !pan.draw;
      pe.className = "panel" + (pi === selPanel ? " sel" : "") + (empty ? " empty" : "");
      pe.style.background = (SCENE_MAP[pan.scene] || SCENE_MAP.sky).css;
      pe.dataset.index = pi;
      pe.addEventListener("pointerdown", function (ev) {
        if (ev.target === pe) { selPanel = pi; selItemId = null; refreshSelection(); }
      });

      // drawing layer — sits under the stickers/bubbles
      var canvas = document.createElement("canvas");
      canvas.className = "draw-canvas";
      pe.appendChild(canvas);
      canvases.push({ canvas: canvas, pan: pan, pi: pi });

      pan.items.slice().sort(function (a, b) { return (a.z || 0) - (b.z || 0); })
        .forEach(function (it) { pe.appendChild(buildItem(it, pi)); });
      pageEl.appendChild(pe);
    });

    // size every canvas to its panel (now that they're laid out) and wire drawing
    canvases.forEach(function (c) {
      fitCanvas(c.canvas, c.pan);
      attachDrawing(c.canvas, c.pi, c.pan);
    });

    updatePageNav();
    syncLayoutButtons();
    refreshSelection();
  }

  function buildItem(it, panelIdx) {
    var el = document.createElement("div");
    var text = isText(it.type);
    el.className = "item " + it.type + (text ? " text" : "") + (it.flip ? " flip" : "");
    el.dataset.id = it.id;
    el.style.left = it.x + "%";
    el.style.top = it.y + "%";
    el.style.setProperty("--sz", it.size);
    el.style.zIndex = String(10 + (it.z || 0));

    var content = document.createElement("div");
    content.className = "content";
    content.style.transform = "rotate(" + (it.rot || 0) + "deg)";

    if (text) {
      var bubble = document.createElement("div");
      bubble.className = "bubble " + it.type + (it.type === "speech" || it.type === "thought" ? " tail-" + (it.tail || "bl") : "");

      var txt = document.createElement("div");
      txt.className = "txt";
      txt.contentEditable = "true";
      txt.spellcheck = false;
      txt.textContent = it.text || "";
      if (it.type === "sfx" && it.color) txt.style.color = it.color;
      txt.addEventListener("input", function () { it.text = txt.textContent; save(); });
      txt.addEventListener("focus", function () {
        if (!editingSession) { pushHistory(); editingSession = true; }
        selectItem(it.id, panelIdx);
      });
      txt.addEventListener("blur", function () { editingSession = false; });
      txt.addEventListener("pointerdown", function (ev) { ev.stopPropagation(); selectItem(it.id, panelIdx); });
      bubble.appendChild(txt);

      if (it.type === "speech" || it.type === "thought") {
        var tail = document.createElement("div");
        tail.className = "tail";
        bubble.appendChild(tail);
      }
      content.appendChild(bubble);
      el.appendChild(content);

      el.addEventListener("pointerdown", function (ev) {
        if (ev.target === el || ev.target === content || ev.target === bubble) selectItem(it.id, panelIdx);
      });

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
      content.appendChild(em);
      el.appendChild(content);
      el.addEventListener("pointerdown", function (ev) { startDrag(ev, it, el, panelIdx); });
    }
    return el;
  }

  function elFor(id) { return pageEl.querySelector('.item[data-id="' + id + '"]'); }

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
    updateItemBar();
  }
  function findSelected() {
    if (!selItemId) return null;
    var pans = page().panels;
    for (var i = 0; i < pans.length; i++) {
      for (var j = 0; j < pans[i].items.length; j++) {
        if (pans[i].items[j].id === selItemId) return { item: pans[i].items[j], pan: pans[i], pi: i };
      }
    }
    return null;
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
      if (!moved) { pushHistory(); moved = true; }
      it.x = clamp((e.clientX - rect.left) / rect.width * 100, 2, 98);
      it.y = clamp((e.clientY - rect.top) / rect.height * 100, 2, 98);
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

  /* ===========================================================
     DRAWING — the MS-Paint-style freehand layer
     =========================================================== */

  // Match the canvas backing store to the panel's on-screen size,
  // then redraw whatever was saved (stretched to fit the new size).
  function fitCanvas(canvas, pan) {
    var w = Math.max(1, Math.round(canvas.clientWidth));
    var h = Math.max(1, Math.round(canvas.clientHeight));
    canvas.width = w;
    canvas.height = h;
    if (pan.draw) {
      var ctx = canvas.getContext("2d");
      var img = new Image();
      img.onload = function () { ctx.clearRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h); };
      img.src = pan.draw;
    }
  }

  function hexToRgb(hex) {
    var h = String(hex).replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  var rainbowHue = 0;               // 🌈 brush cycles through the whole rainbow
  function strokeStyleFor(ctx) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = penSize;
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.fillStyle = "rgba(0,0,0,1)";
    } else if (tool === "rainbow") {
      ctx.globalCompositeOperation = "source-over";
      var c = "hsl(" + rainbowHue + ", 92%, 55%)";
      rainbowHue = (rainbowHue + 4) % 360;
      ctx.strokeStyle = c;
      ctx.fillStyle = c;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = penColor;
      ctx.fillStyle = penColor;
    }
  }

  function drawDot(ctx, x, y) {
    strokeStyleFor(ctx);
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.5, penSize / 2), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }

  function drawSeg(ctx, x0, y0, x1, y1) {
    strokeStyleFor(ctx);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  }

  // Flood fill (bucket) with a little colour tolerance.
  function floodFill(ctx, sx, sy, rgb) {
    var w = ctx.canvas.width, h = ctx.canvas.height;
    if (sx < 0 || sy < 0 || sx >= w || sy >= h) return;
    var img = ctx.getImageData(0, 0, w, h);
    var d = img.data;
    function at(x, y) { return (y * w + x) * 4; }
    var s = at(sx, sy);
    var tr = d[s], tg = d[s + 1], tb = d[s + 2], ta = d[s + 3];
    var fr = rgb.r, fg = rgb.g, fb = rgb.b;
    if (tr === fr && tg === fg && tb === fb && ta === 255) return; // already that colour
    var tol = 48;
    function match(i) {
      return Math.abs(d[i] - tr) <= tol && Math.abs(d[i + 1] - tg) <= tol &&
             Math.abs(d[i + 2] - tb) <= tol && Math.abs(d[i + 3] - ta) <= tol;
    }
    var stack = [sx, sy];
    while (stack.length) {
      var y = stack.pop(), x = stack.pop();
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      var i = at(x, y);
      if (!match(i)) continue;
      d[i] = fr; d[i + 1] = fg; d[i + 2] = fb; d[i + 3] = 255;
      stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
    }
    ctx.putImageData(img, 0, 0);
  }

  function attachDrawing(canvas, pi, pan) {
    var ctx = canvas.getContext("2d");
    var painting = false, lastX = 0, lastY = 0;

    function pos(e) {
      var r = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) * (canvas.width / r.width),
        y: (e.clientY - r.top) * (canvas.height / r.height)
      };
    }
    function commit() {
      pan.draw = canvas.toDataURL("image/png");
      save();
      var pe = canvas.parentNode;
      if (pe) pe.classList.remove("empty");
    }

    canvas.addEventListener("pointerdown", function (e) {
      if (!drawMode) return;
      e.preventDefault();
      selPanel = pi; selItemId = null; refreshSelection();
      var p = pos(e);
      if (tool === "fill") {
        pushHistory();
        floodFill(ctx, Math.round(p.x), Math.round(p.y), hexToRgb(penColor));
        commit();
        flash("Filled! 🪣");
        return;
      }
      pushHistory();
      painting = true;
      lastX = p.x; lastY = p.y;
      drawDot(ctx, p.x, p.y);
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    });

    canvas.addEventListener("pointermove", function (e) {
      if (!painting) return;
      var p = pos(e);
      drawSeg(ctx, lastX, lastY, p.x, p.y);
      lastX = p.x; lastY = p.y;
    });

    function end() {
      if (!painting) return;
      painting = false;
      commit();
    }
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
  }

  /* ---------- item actions (from the floating bar) ---------- */
  function itemAction(act) {
    var sel = findSelected();
    if (!sel) return;
    var it = sel.item, el = elFor(it.id);

    if (act === "bigger" || act === "smaller") {
      pushHistory("size");
      var t = isText(it.type);
      var step = t ? 0.8 : 2, min = t ? 3 : 6, max = t ? 18 : 46;
      it.size = clamp((it.size || (t ? 6 : 16)) + (act === "bigger" ? step : -step), min, max);
      if (el) el.style.setProperty("--sz", it.size);
      save();
    } else if (act === "rotL" || act === "rotR") {
      pushHistory("rot");
      it.rot = ((it.rot || 0) + (act === "rotR" ? 15 : -15)) % 360;
      if (el) el.querySelector(".content").style.transform = "rotate(" + it.rot + "deg)";
      save();
    } else if (act === "flip") {
      pushHistory();
      it.flip = !it.flip;
      if (el) el.classList.toggle("flip", it.flip);
      save();
    } else if (act === "tail") {
      pushHistory();
      var idx = TAILS.indexOf(it.tail || "bl");
      it.tail = TAILS[(idx + 1) % TAILS.length];
      var bub = el && el.querySelector(".bubble");
      if (bub) { TAILS.forEach(function (d) { bub.classList.remove("tail-" + d); }); bub.classList.add("tail-" + it.tail); }
      save();
    } else if (act === "front") {
      pushHistory();
      it.z = topZ(sel.pan) + 1;
      save(); renderPage();
    } else if (act === "dupe") {
      pushHistory();
      var copy = JSON.parse(JSON.stringify(it));
      copy.id = nextId();
      copy.x = clamp(it.x + 6, 2, 98);
      copy.y = clamp(it.y + 6, 2, 98);
      copy.z = topZ(sel.pan) + 1;
      sel.pan.items.push(copy);
      selItemId = copy.id;
      save(); renderPage();
      flash("Copied! ⧉");
    } else if (act === "del") {
      pushHistory();
      var i = sel.pan.items.indexOf(it);
      if (i >= 0) sel.pan.items.splice(i, 1);
      selItemId = null;
      save(); renderPage();
    }
  }

  /* ---------- adding things ---------- */
  function topZ(pan) {
    var m = 0;
    (pan || panel()).items.forEach(function (o) { if ((o.z || 0) > m) m = o.z || 0; });
    return m;
  }
  function addSticker(emoji) {
    pushHistory();
    panel().items.push({ id: nextId(), type: "sticker", text: emoji, x: 50, y: 55, size: 18, rot: 0, flip: false, z: topZ() + 1 });
    save(); renderPage(); selectLastItem();
    flash("Drag it where you want! ✋");
  }
  var DEFAULT_TEXT = { speech: "Hi!", thought: "Hmm…", shout: "WOW!", caption: "And then…" };
  function addBubble(type) {
    pushHistory();
    panel().items.push({
      id: nextId(), type: type, text: DEFAULT_TEXT[type] || "…",
      x: type === "caption" ? 50 : 38, y: type === "caption" ? 12 : 28,
      size: type === "caption" ? 5 : 6, tail: "bl", z: topZ() + 1
    });
    save(); renderPage(); selectLastItem();
    flash("Tap the bubble and type your words! ⌨️");
  }
  function addSfx(word, color) {
    pushHistory();
    panel().items.push({ id: nextId(), type: "sfx", text: word, color: color, x: 52, y: 46, size: 11, rot: -8, z: topZ() + 1 });
    save(); renderPage(); selectLastItem();
    flash("BOOM! Drag, spin or re-type it 💥");
  }
  function selectLastItem() {
    var items = panel().items;
    if (items.length) selItemId = items[items.length - 1].id;
    refreshSelection();
  }
  function setScene(key) {
    pushHistory();
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
    selPanel = 0; selItemId = null;
    renderPage();
  }
  prevBtn.addEventListener("click", function () { goPage(curPage - 1); });
  nextBtn.addEventListener("click", function () { goPage(curPage + 1); });

  document.getElementById("add-page").addEventListener("click", function () {
    pushHistory();
    book.pages.splice(curPage + 1, 0, newPage(page().layout));
    save(); goPage(curPage + 1);
    flash("New page added — keep the story going! 📖");
  });
  document.getElementById("dupe-page").addEventListener("click", function () {
    pushHistory();
    var copy = JSON.parse(JSON.stringify(page()));
    copy.panels.forEach(function (pan) { pan.items.forEach(function (it) { it.id = nextId(); }); });
    book.pages.splice(curPage + 1, 0, copy);
    save(); goPage(curPage + 1);
    flash("Page copied! ⧉");
  });
  document.getElementById("del-page").addEventListener("click", function () {
    pushHistory();
    if (book.pages.length === 1) {
      if (!confirm("This is the only page. Clear it and start fresh?")) { history.pop(); updateUndoButtons(); return; }
      book.pages[0] = newPage(page().layout);
      save(); goPage(0); return;
    }
    if (!confirm("Delete this whole page?")) { history.pop(); updateUndoButtons(); return; }
    book.pages.splice(curPage, 1);
    save(); goPage(Math.max(0, curPage - 1));
  });
  document.getElementById("clear-panel").addEventListener("click", function () {
    var pan = panel();
    if (!pan.items.length && !pan.draw) { flash("This panel is already empty 🙂"); return; }
    if (!confirm("Clear everything in the selected panel? (Drawing + stickers)")) return;
    pushHistory();
    pan.items = []; pan.draw = null; selItemId = null;
    save(); renderPage();
  });

  /* ---------- layout ---------- */
  layoutRow.addEventListener("click", function (ev) {
    var btn = ev.target.closest("[data-layout]");
    if (btn) setLayout(btn.dataset.layout);
  });
  function setLayout(layout) {
    var p = page();
    if (p.layout === layout) return;
    pushHistory();
    var want = PANELS_FOR[layout];
    var panels = p.panels.slice(0, want);
    while (panels.length < want) panels.push({ scene: "sky", draw: null, items: [] });
    p.layout = layout; p.panels = panels;
    if (selPanel >= want) selPanel = 0;
    save(); renderPage();
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
  titleEl.addEventListener("focus", function () {
    if (!editingSession) { pushHistory(); editingSession = true; }
  });
  titleEl.addEventListener("input", function () {
    book.title = titleEl.textContent.trim() || "My Comic"; save();
  });
  titleEl.addEventListener("blur", function () { editingSession = false; });
  titleEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); titleEl.blur(); }
  });

  /* ===========================================================
     EXPORT AS PICTURE — paint the whole page onto one big canvas
     -----------------------------------------------------------
     Re-draws every panel (scene, freehand drawing, stickers,
     bubbles & sound words) at high resolution and downloads a
     PNG Jeannie can share, text to Grandma, or use as wallpaper.
     =========================================================== */
  var EXPORT_W = 1240;                       // page width in px (3:4 page)
  var EXPORT_SCALE = EXPORT_W / 620;         // vs the on-screen 620px page

  // Panel rectangles for each layout, mirroring the CSS grid.
  function panelRects(layout, W, H) {
    var pad = 14 * EXPORT_SCALE, gap = 12 * EXPORT_SCALE;
    var iw = W - 2 * pad, ih = H - 2 * pad;
    var halfW = (iw - gap) / 2, halfH = (ih - gap) / 2;
    var x0 = pad, y0 = pad, x1 = pad + halfW + gap, y1 = pad + halfH + gap;
    if (layout === "1")  return [{ x: x0, y: y0, w: iw, h: ih }];
    if (layout === "2v") return [{ x: x0, y: y0, w: halfW, h: ih }, { x: x1, y: y0, w: halfW, h: ih }];
    if (layout === "2h") return [{ x: x0, y: y0, w: iw, h: halfH }, { x: x0, y: y1, w: iw, h: halfH }];
    if (layout === "3")  return [
      { x: x0, y: y0, w: iw, h: halfH },
      { x: x0, y: y1, w: halfW, h: halfH }, { x: x1, y: y1, w: halfW, h: halfH }
    ];
    return [ // "4"
      { x: x0, y: y0, w: halfW, h: halfH }, { x: x1, y: y0, w: halfW, h: halfH },
      { x: x0, y: y1, w: halfW, h: halfH }, { x: x1, y: y1, w: halfW, h: halfH }
    ];
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Turn a scene's CSS ("linear-gradient(#a, #b 55%)" or "#fff") into a fill.
  function sceneFill(ctx, css, rect) {
    var m = String(css).match(/#[0-9a-fA-F]{3,8}(\s+\d+%)?/g);
    if (!m || !m.length) return "#ffffff";
    if (m.length === 1 && css.indexOf("gradient") === -1) return m[0].trim();
    var grad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    m.forEach(function (stop, i) {
      var parts = stop.trim().split(/\s+/);
      var at = parts[1] ? parseFloat(parts[1]) / 100 : (m.length === 1 ? 0 : i / (m.length - 1));
      try { grad.addColorStop(Math.min(1, Math.max(0, at)), parts[0]); } catch (e) {}
    });
    return grad;
  }

  function loadImg(src) {
    return new Promise(function (resolve) {
      if (!src) return resolve(null);
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  function wrapText(ctx, text, maxW) {
    var words = String(text || "").split(/\s+/).filter(Boolean);
    if (!words.length) return [""];
    var lines = [], line = words[0];
    for (var i = 1; i < words.length; i++) {
      var probe = line + " " + words[i];
      if (ctx.measureText(probe).width <= maxW) line = probe;
      else { lines.push(line); line = words[i]; }
    }
    lines.push(line);
    return lines;
  }

  // The shout burst uses the same star polygon as the CSS clip-path.
  var BURST_PTS = [[50,0],[61,18],[82,12],[76,33],[98,38],[80,50],[98,62],[76,67],[82,88],[61,82],[50,100],[39,82],[18,88],[24,67],[2,62],[20,50],[2,38],[24,33],[18,12],[39,18]];
  function drawBurst(ctx, w, h, grow, color) {
    ctx.beginPath();
    BURST_PTS.forEach(function (pt, i) {
      var x = (pt[0] / 100) * (w + 2 * grow) - w / 2 - grow;
      var y = (pt[1] / 100) * (h + 2 * grow) - h / 2 - grow;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  var BODY_FONT = null;
  function bodyFont() {
    if (!BODY_FONT) {
      BODY_FONT = getComputedStyle(document.body).fontFamily || "sans-serif";
    }
    return BODY_FONT;
  }

  function drawExportItem(ctx, it, rect) {
    var cq = Math.min(rect.w, rect.h) / 100;      // = 1cqmin of this panel
    var cx = rect.x + (it.x / 100) * rect.w;
    var cy = rect.y + (it.y / 100) * rect.h;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((it.rot || 0) * Math.PI / 180);

    if (it.type === "sticker") {
      if (it.flip) ctx.scale(-1, 1);
      ctx.font = ((it.size || 16) * cq) + "px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(it.text || "", 0, 0);
    } else if (it.type === "sfx") {
      var fs = (it.size || 10) * cq;
      ctx.font = "italic 900 " + fs + "px " + bodyFont();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.lineWidth = 1.4 * cq;
      ctx.strokeStyle = "#1c1830";
      ctx.strokeText(it.text || "", 0, 0);
      ctx.fillStyle = it.color || "#ff3b3b";
      ctx.fillText(it.text || "", 0, 0);
    } else {
      // speech / thought / shout / caption boxes
      var fSize = (it.size || 6) * cq;
      ctx.font = "700 " + fSize + "px " + bodyFont();
      var lines = wrapText(ctx, it.text, 56 * cq);
      var lineH = fSize * 1.15;
      var textW = 0;
      lines.forEach(function (l) { textW = Math.max(textW, ctx.measureText(l).width); });
      var padX = (it.type === "shout" ? 4.4 : 3.2) * cq;
      var padY = (it.type === "shout" ? 3.6 : 2.4) * cq;
      var bw = textW + 2 * padX, bh = lines.length * lineH + 2 * padY;
      var border = 0.6 * cq;

      if (it.type === "shout") {
        drawBurst(ctx, bw, bh, 1.4 * cq, "#ffce3a");
        drawBurst(ctx, bw, bh, -0.4 * cq, "#ffffff");
        ctx.fillStyle = "#1c1830";
      } else if (it.type === "caption") {
        ctx.lineWidth = 0.5 * cq;
        ctx.strokeStyle = "#d8b94a";
        ctx.fillStyle = "#fff3c4";
        roundRectPath(ctx, -bw / 2, -bh / 2, bw, bh, 2 * cq);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#5a4a00";
      } else {
        // speech & thought share a white box; the tail differs
        var tail = it.tail || "bl";
        var tx = (tail === "bl" || tail === "tl") ? -bw * 0.34 : bw * 0.34;
        var ty = (tail === "tl" || tail === "tr") ? -bh / 2 : bh / 2;
        var dir = ty > 0 ? 1 : -1;
        ctx.lineWidth = border;
        ctx.strokeStyle = "#1c1830";
        ctx.fillStyle = "#ffffff";
        roundRectPath(ctx, -bw / 2, -bh / 2, bw, bh, (it.type === "thought" ? 8 : 4) * cq);
        ctx.fill(); ctx.stroke();
        if (it.type === "speech") {
          ctx.beginPath();
          ctx.moveTo(tx - 1.8 * cq, ty);
          ctx.lineTo(tx + 1.8 * cq, ty);
          ctx.lineTo(tx, ty + dir * 3.4 * cq);
          ctx.closePath();
          ctx.fill(); ctx.stroke();
          // hide the border line behind the tail mouth
          ctx.fillRect(tx - 1.6 * cq, ty - border, 3.2 * cq, 2 * border);
        } else {
          [2.6, 4.8].forEach(function (off, i) {
            ctx.beginPath();
            ctx.arc(tx - i * 1.6 * cq, ty + dir * off * cq, (1.6 - i * 0.5) * cq, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
          });
        }
        ctx.fillStyle = "#1c1830";
      }

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      lines.forEach(function (l, i) {
        ctx.fillText(l, 0, (i - (lines.length - 1) / 2) * lineH);
      });
    }
    ctx.restore();
  }

  function drawExportPanel(ctx, rect, pan) {
    return loadImg(pan.draw).then(function (img) {
      ctx.save();
      roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, 10 * EXPORT_SCALE);
      ctx.clip();
      ctx.fillStyle = sceneFill(ctx, (SCENE_MAP[pan.scene] || SCENE_MAP.sky).css, rect);
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      if (img) ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h);
      pan.items.slice().sort(function (a, b) { return (a.z || 0) - (b.z || 0); })
        .forEach(function (it) { drawExportItem(ctx, it, rect); });
      ctx.restore();
      // panel border on top
      roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, 10 * EXPORT_SCALE);
      ctx.strokeStyle = "#2b2440";
      ctx.lineWidth = 3 * EXPORT_SCALE;
      ctx.stroke();
    });
  }

  function exportPagePNG() {
    var W = EXPORT_W, H = Math.round(W * 4 / 3);
    var cvs = document.createElement("canvas");
    cvs.width = W; cvs.height = H;
    var ctx = cvs.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    var p = page();
    var rects = panelRects(p.layout, W, H);
    var work = Promise.resolve();
    p.panels.forEach(function (pan, i) {
      work = work.then(function () { return drawExportPanel(ctx, rects[i], pan); });
    });
    work.then(function () {
      var name = (book.title || "My Comic").replace(/[\\/:*?"<>|]+/g, " ").trim() || "My Comic";
      var a = document.createElement("a");
      a.download = name + " - page " + (curPage + 1) + ".png";
      a.href = cvs.toDataURL("image/png");
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      flash("Picture saved — share your comic! 🖼️");
    })["catch"](function () {
      flash("Hmm, couldn't make the picture. Try again? 🤔");
    });
  }
  document.getElementById("export-png").addEventListener("click", exportPagePNG);

  /* ---------- print ---------- */
  document.getElementById("print").addEventListener("click", function () {
    selItemId = null; refreshSelection();
    flash("Tip: choose 'Save as PDF' to keep your comic! 🖨️");
    setTimeout(function () { window.print(); }, 60);
  });

  /* ---------- example & new book ---------- */
  document.getElementById("new-book").addEventListener("click", function () {
    if (!confirm("Start a brand new book? Your current one will be erased.")) return;
    unbindFile();        // a new book gets its own file, don't overwrite the old one
    pushHistory();
    book = newBook(); seq = 1; save();
    titleEl.textContent = book.title; goPage(0);
    flash("Fresh book — happy storytelling! ✨");
  });
  document.getElementById("example").addEventListener("click", function () {
    if (!confirm("Load an example comic? This replaces your current book.")) return;
    unbindFile();        // don't let the example overwrite a comic she saved to a file
    pushHistory();
    book = exampleBook(); save();
    titleEl.textContent = book.title; goPage(0);
    flash("Here's an example — now make it your own! ✏️");
  });

  function exampleBook() {
    var z = 0;
    function it(type, text, x, y, size, extra) {
      var o = { id: nextId(), type: type, text: text, x: x, y: y, size: size, z: ++z };
      if (extra) for (var k in extra) o[k] = extra[k];
      return o;
    }
    return {
      title: "The Brave Little Dragon",
      pages: [{
        layout: "4",
        panels: [
          { scene: "castle", items: [
            it("caption", "Once upon a time…", 50, 12, 4.5),
            it("sticker", "🐉", 40, 62, 24),
            it("sticker", "🏰", 76, 64, 22),
            it("speech", "I want an adventure!", 44, 30, 5.5, { tail: "bl" })
          ]},
          { scene: "forest", items: [
            it("sticker", "🐉", 30, 60, 22),
            it("sticker", "🦊", 72, 66, 18, { flip: true }),
            it("speech", "Can you help me?", 66, 26, 5, { tail: "br" })
          ]},
          { scene: "ocean", items: [
            it("sticker", "🐉", 34, 52, 22),
            it("sticker", "🐙", 72, 66, 20),
            it("sfx", "SPLASH!", 58, 30, 11, { color: "#1d9bf0", rot: -10 })
          ]},
          { scene: "sunset", items: [
            it("caption", "…and they were friends forever.", 50, 14, 4.2),
            it("sticker", "🐉", 38, 62, 22),
            it("sticker", "🦊", 62, 64, 18, { flip: true }),
            it("sticker", "❤️", 50, 40, 11)
          ]}
        ]
      }]
    };
  }

  /* ===========================================================
     SAVE TO THE COMPUTER  (File System Access API + fallback)
     -----------------------------------------------------------
     Save the whole comic — drawings and all — to a real file on
     the computer, with NO ~5 MB browser limit, and keep editing
     that same file straight from the web page. In Chrome/Edge the
     page holds a handle to the file and writes straight to it;
     other browsers fall back to download + re-upload.
     =========================================================== */
  var saveFileBtn = document.getElementById("save-file");
  var openFileBtn = document.getElementById("open-file");
  var resumeBtn   = document.getElementById("resume-file");
  var fileStatus  = document.getElementById("file-status");
  var openInput   = document.getElementById("open-file-input");

  function setStatus(msg, cls) {
    fileStatus.textContent = msg || "";
    fileStatus.className = "file-status" + (cls ? " " + cls : "");
  }
  function defaultStatus() {
    if (fileBound) {
      setStatus("Editing “" + fileName + "” — every change saves to this file. 💾", "saved");
    } else if (supportsFS) {
      setStatus("Tip: 💾 Save to computer to keep big comics (no size limit) and edit them again later.");
    } else {
      setStatus("Tip: 💾 Save to computer downloads a comic file you can re-open here anytime.");
    }
  }
  function suggestedName() {
    var t = (book.title || "My Comic").replace(/[\\/:*?"<>|]+/g, " ").trim() || "My Comic";
    return t + ".comic.json";
  }
  function serialize() { return JSON.stringify(book); }

  /* ---- tiny IndexedDB store, just to remember the file handle ---- */
  function idb(run) {
    return new Promise(function (resolve, reject) {
      var open = indexedDB.open("comicMakerFiles", 1);
      open.onupgradeneeded = function () { open.result.createObjectStore("kv"); };
      open.onerror = function () { reject(open.error); };
      open.onsuccess = function () {
        try { run(open.result, resolve, reject); } catch (e) { reject(e); }
      };
    });
  }
  function idbSet(key, val) {
    return idb(function (db, resolve, reject) {
      var tx = db.transaction("kv", "readwrite");
      tx.objectStore("kv").put(val, key);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  }
  function idbGet(key) {
    return idb(function (db, resolve, reject) {
      var tx = db.transaction("kv", "readonly");
      var rq = tx.objectStore("kv").get(key);
      rq.onsuccess = function () { resolve(rq.result); };
      rq.onerror = function () { reject(rq.error); };
    });
  }
  function idbDel(key) {
    return idb(function (db, resolve, reject) {
      var tx = db.transaction("kv", "readwrite");
      tx.objectStore("kv").delete(key);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  }

  function writeToHandle() {
    return fileHandle.createWritable().then(function (w) {
      return w.write(new Blob([serialize()], { type: "application/json" }))
              .then(function () { return w.close(); });
    });
  }

  // Debounced auto-save to the bound file — this is what beats the ~5 MB cap.
  function scheduleFileSave() {
    if (!fileBound || !fileHandle) return;
    if (fileSaveTimer) clearTimeout(fileSaveTimer);
    fileSaveTimer = setTimeout(function () {
      writeToHandle().then(function () {
        setStatus("Saved to “" + fileName + "” ✓", "saved");
      }).catch(function () {
        fileBound = false;
        setStatus("⚠️ Lost access to the file — tap 💾 Save to computer again.", "warn");
      });
    }, 1000);
  }

  function loadBookText(text) {
    var obj = JSON.parse(text);
    if (!obj || !Array.isArray(obj.pages) || !obj.pages.length) {
      throw new Error("That doesn't look like a comic file.");
    }
    pushHistory();
    book = obj;
    curPage = 0; selPanel = 0; selItemId = null;
    primeSeq();
    titleEl.textContent = book.title || "My Comic";
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(book)); } catch (e) {}
    renderPage();
  }

  function unbindFile() {
    fileHandle = null; fileBound = false; fileName = "";
    if (fileSaveTimer) { clearTimeout(fileSaveTimer); fileSaveTimer = null; }
    hideResume();
    if (window.indexedDB) idbDel("handle")["catch"](function () {});
    defaultStatus();
  }

  /* ---- Save ---- */
  function doSave() {
    if (!supportsFS) { downloadFallback(); return; }
    var picker = fileHandle
      ? Promise.resolve(fileHandle)
      : window.showSaveFilePicker({
          suggestedName: suggestedName(),
          types: [{ description: "Comic book", accept: { "application/json": [".json"] } }]
        });
    picker.then(function (h) {
      fileHandle = h; fileName = h.name; fileBound = true;
      return idbSet("handle", h)["catch"](function () {}).then(writeToHandle);
    }).then(function () {
      hideResume();
      setStatus("Saved to “" + fileName + "” — every change now saves to this file. 💾", "saved");
      flash("Saved to your computer! 💾");
    })["catch"](function (e) {
      if (e && e.name === "AbortError") return;
      setStatus("Couldn't save: " + (e && e.message ? e.message : e), "warn");
    });
  }

  /* ---- Open ---- */
  function doOpen() {
    if (!supportsFS) { openInput.click(); return; }
    window.showOpenFilePicker({
      types: [{ description: "Comic book", accept: { "application/json": [".json"] } }],
      multiple: false
    }).then(function (handles) {
      var h = handles[0];
      fileHandle = h; fileName = h.name;
      return idbSet("handle", h)["catch"](function () {}).then(function () { return h.getFile(); });
    }).then(function (file) {
      return file.text();
    }).then(function (text) {
      loadBookText(text);
      fileBound = true;
      hideResume();
      setStatus("Editing “" + fileName + "” — every change saves to this file. 💾", "saved");
      flash("Opened " + fileName + " — keep drawing! ✏️");
    })["catch"](function (e) {
      if (e && e.name === "AbortError") return;
      setStatus("Couldn't open: " + (e && e.message ? e.message : e), "warn");
    });
  }

  /* ---- Fallbacks for browsers without the File System Access API ---- */
  function downloadFallback() {
    var blob = new Blob([serialize()], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = suggestedName();
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    setStatus("Downloaded your comic. Re-open it here with 📂 Open from computer.", "saved");
    flash("Saved a comic file to your downloads! 💾");
  }
  openInput.addEventListener("change", function () {
    var f = openInput.files && openInput.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        loadBookText(String(reader.result));
        fileName = f.name;
        setStatus("Opened “" + f.name + "”. Use 💾 Save to computer to keep your edits.", "saved");
        flash("Opened " + f.name + "! ✏️");
      } catch (e) {
        setStatus("Couldn't open that file: " + e.message, "warn");
      }
    };
    reader.readAsText(f);
    openInput.value = "";
  });

  /* ---- Resume editing a remembered file after a page reload ---- */
  function hideResume() { resumeBtn.style.display = "none"; resumeBtn.classList.add("hide"); }
  function showResume() { resumeBtn.style.display = "inline-block"; resumeBtn.classList.remove("hide"); }

  function bindStoredHandle(h, readNow) {
    fileHandle = h; fileName = h.name; fileBound = true;
    hideResume();
    function done() {
      setStatus("Editing “" + fileName + "” — every change saves to this file. 💾", "saved");
      flash("Back to “" + fileName + "” — keep going! ✏️");
    }
    if (readNow) {
      h.getFile().then(function (f) { return f.text(); })
        .then(function (t) { loadBookText(t); done(); })
        ["catch"](function () { defaultStatus(); });
    } else { done(); }
  }

  function restoreHandle() {
    if (!supportsFS || !window.indexedDB) { defaultStatus(); return; }
    idbGet("handle").then(function (h) {
      if (!h) { defaultStatus(); return; }
      fileHandle = h; fileName = h.name;
      var q = h.queryPermission ? h.queryPermission({ mode: "readwrite" }) : Promise.resolve("prompt");
      Promise.resolve(q).then(function (perm) {
        if (perm === "granted") {
          bindStoredHandle(h, true);
        } else {
          showResume();
          setStatus("You have a saved comic “" + fileName + "”. Tap “Keep editing” to continue. 📂");
        }
      });
    })["catch"](function () { defaultStatus(); });
  }

  resumeBtn.addEventListener("click", function () {
    if (!fileHandle) return;
    var req = fileHandle.requestPermission
      ? fileHandle.requestPermission({ mode: "readwrite" })
      : Promise.resolve("granted");
    Promise.resolve(req).then(function (perm) {
      if (perm === "granted") bindStoredHandle(fileHandle, true);
      else setStatus("Couldn't get permission to the file. Try 📂 Open from computer.", "warn");
    });
  });

  saveFileBtn.addEventListener("click", doSave);
  openFileBtn.addEventListener("click", doOpen);

  /* ---------- keyboard helpers ---------- */
  document.addEventListener("keydown", function (e) {
    var ae = document.activeElement;
    var typing = ae && ae.isContentEditable;
    var meta = e.ctrlKey || e.metaKey;

    if (meta && (e.key === "z" || e.key === "Z")) {
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
      return;
    }
    if (meta && (e.key === "y" || e.key === "Y")) { e.preventDefault(); redo(); return; }
    if (typing) return;

    var sel = findSelected();
    if (!sel) return;
    var it = sel.item, el = elFor(it.id);

    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault(); itemAction("del");
    } else if (e.key.indexOf("Arrow") === 0) {
      e.preventDefault();
      pushHistory("nudge");
      var d = e.shiftKey ? 5 : 1.5;
      if (e.key === "ArrowLeft")  it.x = clamp(it.x - d, 2, 98);
      if (e.key === "ArrowRight") it.x = clamp(it.x + d, 2, 98);
      if (e.key === "ArrowUp")    it.y = clamp(it.y - d, 2, 98);
      if (e.key === "ArrowDown")  it.y = clamp(it.y + d, 2, 98);
      if (el) { el.style.left = it.x + "%"; el.style.top = it.y + "%"; }
      save();
    }
  });

  /* ---------- click empty space deselects ---------- */
  document.addEventListener("pointerdown", function (ev) {
    if (!ev.target.closest(".page") && !ev.target.closest(".item-bar")) {
      if (selItemId) { selItemId = null; refreshSelection(); }
    }
  });

  /* ---------- hint helper ---------- */
  var hintTimer = null;
  function flash(msg) {
    hintEl.textContent = msg;
    if (hintTimer) clearTimeout(hintTimer);
    hintTimer = setTimeout(function () {
      hintEl.textContent = "Tap a panel, then add stickers, sounds & words ✨";
    }, 2600);
  }

  /* ---------- keep id counter ahead of saved ids ---------- */
  function primeSeq() {
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
  }
  primeSeq();

  /* ---------- keep canvases sized to the page on resize ---------- */
  var resizeTimer = null;
  window.addEventListener("resize", function () {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderPage, 200);
  });

  /* ---------- go! ---------- */
  renderPage();
  updateUndoButtons();
  restoreHandle();
})();
