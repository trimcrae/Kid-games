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
  var book = load();
  var curPage = 0;
  var selPanel = 0;
  var selItemId = null;
  var seq = 1;
  var history = [];
  var future = [];
  var coKey = null, coTime = 0;     // history coalescing
  var editingSession = false;       // text-edit history guard

  /* ---------- drawing tool state ---------- */
  var drawMode  = true;             // tab "draw" => draw on the panel; other tabs => move items
  var tool      = "brush";          // brush | eraser | fill
  var penColor  = PAINT_COLORS[0];  // current brush / fill colour
  var penSize   = 12;               // brush / eraser width in panel pixels

  /* ---------- storage ---------- */
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return newBook();
  }
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(book));
    } catch (e) {
      flash("⚠️ Out of room! Print/Save your comic, then start a new book.");
    }
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

  /* ---------- history / undo-redo ---------- */
  function snapshot() {
    return JSON.stringify({ book: book, curPage: curPage, selPanel: selPanel });
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
  function applySnapshot(str) {
    var obj = JSON.parse(str);
    book = obj.book;
    curPage = Math.min(obj.curPage || 0, book.pages.length - 1);
    selPanel = obj.selPanel || 0;
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

  function strokeStyleFor(ctx) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = penSize;
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.fillStyle = "rgba(0,0,0,1)";
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

  /* ---------- print ---------- */
  document.getElementById("print").addEventListener("click", function () {
    selItemId = null; refreshSelection();
    flash("Tip: choose 'Save as PDF' to keep your comic! 🖨️");
    setTimeout(function () { window.print(); }, 60);
  });

  /* ---------- example & new book ---------- */
  document.getElementById("new-book").addEventListener("click", function () {
    if (!confirm("Start a brand new book? Your current one will be erased.")) return;
    pushHistory();
    book = newBook(); seq = 1; save();
    titleEl.textContent = book.title; goPage(0);
    flash("Fresh book — happy storytelling! ✨");
  });
  document.getElementById("example").addEventListener("click", function () {
    if (!confirm("Load an example comic? This replaces your current book.")) return;
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

  /* ---------- keep canvases sized to the page on resize ---------- */
  var resizeTimer = null;
  window.addEventListener("resize", function () {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderPage, 200);
  });

  /* ---------- go! ---------- */
  renderPage();
  updateUndoButtons();
})();
