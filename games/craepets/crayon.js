/* ===========================================================
   Craepets — THE CRAYON BOX.
   -----------------------------------------------------------
   Hand-drawn pictures for the places where a Craepet would draw
   one itself: its diary, the Quest Board posters, a letter to a
   cousin. Everything is wobbly on purpose — each line is drawn
   two or three times with a little jitter, and shapes are filled
   with scribbled diagonal strokes, the way a six-year-old fills
   in a sun. A seed makes the same picture come out the same
   wobble every time, so a diary page does not redraw itself
   differently every time you open it.

       CPCrayon.diaryPage(canvas, { speciesId, colourId, place,
                                    food, text, seed })
       CPCrayon.poster(canvas, { title, speciesId, colourId, seed })
   =========================================================== */
window.CPCrayon = (function () {
  "use strict";

  function rng(seed) {
    var a = (seed | 0) || 1;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* A pen: every method jitters with this pen's own random stream. */
  function Pen(g, seed, wob) {
    this.g = g; this.r = rng(seed); this.wob = wob || 6;
  }
  Pen.prototype.j = function (v, a) { return v + (this.r() - 0.5) * (a === undefined ? this.wob : a); };
  /* Draw a polyline (closed or open) `passes` times with jitter. */
  Pen.prototype.stroke = function (pts, close, col, w, alpha, passes) {
    var g = this.g, self = this;
    passes = passes || 2;
    for (var p = 0; p < passes; p++) {
      g.beginPath(); g.strokeStyle = col; g.lineWidth = w; g.globalAlpha = alpha === undefined ? 0.9 : alpha;
      g.lineCap = "round"; g.lineJoin = "round";
      pts.forEach(function (pt, i) { var x = self.j(pt[0]), y = self.j(pt[1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
      if (close) g.closePath();
      g.stroke();
    }
    g.globalAlpha = 1;
  };
  /* Scribble-fill a polygon with parallel wobbly lines at `angle`. */
  Pen.prototype.fill = function (pts, col, gap, w, alpha, angle) {
    var g = this.g, self = this;
    g.save();
    g.beginPath(); pts.forEach(function (pt, i) { if (i) g.lineTo(pt[0], pt[1]); else g.moveTo(pt[0], pt[1]); }); g.closePath(); g.clip();
    g.strokeStyle = col; g.lineWidth = w || 4; g.globalAlpha = alpha === undefined ? 0.8 : alpha; g.lineCap = "round";
    var c = Math.cos(angle || 0.8), s = Math.sin(angle || 0.8);
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    pts.forEach(function (p) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); });
    var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, R = Math.hypot(maxX - minX, maxY - minY) / 2 + 10;
    for (var k = -R; k <= R; k += gap || 7) {
      var px = cx + k * c, py = cy + k * s;            // a point on the perpendicular
      g.beginPath();
      g.moveTo(self.j(px - s * R, 4), self.j(py + c * R, 4));
      g.lineTo(self.j(px + s * R, 4), self.j(py - c * R, 4));
      g.stroke();
    }
    g.restore();
  };
  Pen.prototype.ellipse = function (cx, cy, rx, ry, n) {
    var a = []; n = n || 28;
    for (var i = 0; i < n; i++) { var t = i / n * Math.PI * 2; a.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]); }
    return a;
  };
  /* A filled, outlined blob in one go. */
  Pen.prototype.blob = function (pts, fill, line, w, gap) {
    this.fill(pts, fill, gap || 7, (w || 4) + 1, 0.8, 0.8);
    this.stroke(pts, true, line, w || 4, 0.9, 2);
  };
  /* Handwriting. If a line is too long for `maxW`, the pen writes smaller. */
  Pen.prototype.text = function (str, x, y, size, col, align, maxW) {
    var g = this.g;
    g.fillStyle = col || "#3a2f5a"; g.textAlign = align || "left"; g.textBaseline = "alphabetic";
    var font = function (px) { return px + "px 'Patrick Hand', 'Comic Sans MS', 'Chalkboard SE', 'Segoe Print', cursive"; };
    g.font = font(size);
    if (maxW) { var wdt = g.measureText(str).width; if (wdt > maxW) g.font = font(Math.max(10, Math.floor(size * maxW / wdt))); }
    g.fillText(str, x, y);
  };

  /* ---------- paper ---------- */
  function paper(g, w, h, kind) {
    g.fillStyle = kind === "poster" ? "#fff6dc" : "#fffdf5";
    g.fillRect(0, 0, w, h);
    if (kind === "ruled") {
      g.strokeStyle = "rgba(87,196,255,.35)"; g.lineWidth = Math.max(1, h / 300);
      for (var y = h * 0.16; y < h; y += h * 0.12) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.strokeStyle = "rgba(255,93,108,.35)"; g.beginPath(); g.moveTo(w * 0.07, 0); g.lineTo(w * 0.07, h); g.stroke();
    }
  }

  /* ---------- a crayon Craepet, species by silhouette ---------- */
  function petColours(colourId) {
    var c = window.CPPets ? CPPets.colour(colourId) : null;
    var pal = c ? c.pal : { B: "#ff5d6c", O: "#7a1f2c", A: "#ffd7db" };
    function hex(v, fallback) { return typeof v === "string" ? v : fallback; }
    var body = hex(pal.B, c && /^#/.test(c.swatch) ? c.swatch : "#a97dff");
    return { body: body, line: hex(pal.O, "#3a2b52"), belly: hex(pal.A, "#fff"), shade: hex(pal.b, body) };
  }
  function drawPet(pen, cx, cy, s, speciesId, colourId) {
    // s = body radius. cy = centre of the body.
    var k = petColours(colourId), sp = speciesId || "blorb";
    var body = pen.ellipse(cx, cy, s, s * 0.96, 36);
    // ears/horns first so the body draws over their roots
    if (sp === "snorbit") { [-0.45, 0.45].forEach(function (d) { var e = [[cx + d * s - s * 0.16, cy - s * 0.7], [cx + d * s - s * 0.1, cy - s * 1.75], [cx + d * s + s * 0.1, cy - s * 1.75], [cx + d * s + s * 0.16, cy - s * 0.7]]; pen.blob(e, k.body, k.line, 3, 6); }); }
    if (sp === "flarn") { [-0.55, 0.55].forEach(function (d) { pen.blob([[cx + d * s - s * 0.15, cy - s * 0.75], [cx + d * s, cy - s * 1.35], [cx + d * s + s * 0.15, cy - s * 0.75]], k.belly, k.line, 3, 5); }); }
    if (sp === "puddlepop") { [-0.55, 0.55].forEach(function (d) { pen.blob([[cx + d * s - s * 0.25, cy - s * 0.65], [cx + d * s, cy - s * 1.3], [cx + d * s + s * 0.25, cy - s * 0.65]], k.body, k.line, 3, 5); }); }
    if (sp === "twiggle") { [-0.7, 0.7].forEach(function (d) { pen.blob(pen.ellipse(cx + d * s, cy - s * 0.95, s * 0.28, s * 0.14, 14), "#6fdc8c", "#3fb469", 3, 5); }); }
    if (sp === "zibbit") { var st = []; for (var i = 0; i < 10; i++) { var rr = i % 2 ? s * 0.16 : s * 0.34, a = i / 10 * Math.PI * 2 - Math.PI / 2; st.push([cx + Math.cos(a) * rr, cy - s * 1.2 + Math.sin(a) * rr]); } pen.blob(st, "#ffd863", "#eab128", 3, 5); }
    if (sp === "glimmr") { pen.stroke([[cx, cy - s * 0.9], [cx + s * 0.15, cy - s * 1.25], [cx - s * 0.05, cy - s * 1.5]], false, k.line, 4, 0.9, 2); }
    pen.blob(body, k.body, k.line, 4, 8);
    if (sp === "flarn") { [-1, 1].forEach(function (d) { pen.blob([[cx + d * s * 0.85, cy - s * 0.1], [cx + d * s * 1.35, cy - s * 0.35], [cx + d * s * 1.25, cy + s * 0.4], [cx + d * s * 0.85, cy + s * 0.45]], k.belly, k.line, 3, 6); }); }
    pen.fill(pen.ellipse(cx, cy + s * 0.42, s * 0.6, s * 0.34, 24), k.belly, 6, 5, 0.95, 0.8);
    // face — the shared family face
    [[-0.4, -0.2], [0.4, -0.2]].forEach(function (e) {
      var ex = cx + e[0] * s, ey = cy + e[1] * s;
      var eye = pen.ellipse(ex, ey, s * 0.2, s * 0.2, 16);
      pen.g.globalAlpha = 0.95; pen.g.fillStyle = "#fff"; pen.g.beginPath(); eye.forEach(function (p, i) { if (i) pen.g.lineTo(p[0], p[1]); else pen.g.moveTo(p[0], p[1]); }); pen.g.fill(); pen.g.globalAlpha = 1;
      pen.stroke(eye, true, k.line, 3, 0.9, 2);
      pen.fill(pen.ellipse(ex + s * 0.03, ey + s * 0.03, s * 0.09, s * 0.09, 10), "#241f36", 3, 3, 1, 0.3);
    });
    [[-0.68, 0.12], [0.68, 0.12]].forEach(function (b) { pen.fill(pen.ellipse(cx + b[0] * s, cy + b[1] * s, s * 0.13, s * 0.08, 10), "#ff9db5", 4, 3, 0.9, 0); });
    var mouth = []; for (var m = 0; m <= 10; m++) { var t = m / 10; mouth.push([cx - s * 0.26 + t * s * 0.52, cy + s * 0.12 + Math.sin(t * Math.PI) * s * 0.22]); }
    pen.stroke(mouth, false, "#3a2036", 4, 0.95, 2);
    // feet
    [[-0.62, 0.86], [0.1, 0.86]].forEach(function (f) { var fx = cx + f[0] * s, fy = cy + f[1] * s, fp = [[fx, fy], [fx + s * 0.5, fy], [fx + s * 0.5, fy + s * 0.2], [fx, fy + s * 0.2]]; pen.blob(fp, k.body, k.line, 3, 6); });
  }

  /* ---------- the places, as a child would draw them ---------- */
  function drawPlace(pen, place, w, h) {
    var g = pen.g;
    var groundY = h * 0.68;
    // sun, always
    var sun = pen.ellipse(w * 0.86, h * 0.2, h * 0.08, h * 0.08, 20);
    pen.blob(sun, "#ffd400", "#f2a300", 4, 7);
    for (var r = 0; r < 9; r++) { var a = r / 9 * Math.PI * 2; pen.stroke([[w * 0.86 + Math.cos(a) * h * 0.11, h * 0.2 + Math.sin(a) * h * 0.11], [w * 0.86 + Math.cos(a) * h * 0.16, h * 0.2 + Math.sin(a) * h * 0.16]], false, "#f2a300", 3, 0.85, 1); }
    // a hill
    var hill = [[w * 0.05, groundY + h * 0.05], [w * 0.2, groundY - h * 0.12], [w * 0.45, groundY - h * 0.18], [w * 0.7, groundY - h * 0.1], [w * 0.95, groundY + h * 0.02], [w * 0.95, h * 0.95], [w * 0.05, h * 0.95]];
    pen.fill(hill, "#6fdc8c", 9, 5, 0.6, 0.5); pen.stroke(hill.slice(0, 5), false, "#3fb469", 4, 0.85, 2);
    if (place === "pool") {
      var pool = pen.ellipse(w * 0.6, h * 0.8, w * 0.28, h * 0.1, 32);
      pen.fill(pool, "#57c4ff", 7, 5, 0.75, -0.4); pen.stroke(pool, true, "#2f9fe0", 4, 0.85, 2);
      ["#ff5d6c", "#ff9f45", "#ffd863", "#6fdc8c", "#57c4ff"].forEach(function (c, i) { var pts = []; for (var k = 0; k <= 16; k++) { var t = Math.PI + k / 16 * Math.PI; pts.push([w * 0.6 + Math.cos(t) * (w * 0.2 - i * w * 0.02), h * 0.72 + Math.sin(t) * (h * 0.32 - i * h * 0.035)]); } pen.stroke(pts, false, c, 6, 0.75, 1); });
    } else if (place === "farm") {
      for (var f = 0; f < 6; f++) { var fx = w * 0.12 + f * w * 0.15; pen.stroke([[fx, groundY + h * 0.02], [fx, groundY - h * 0.12]], false, "#c99a6b", 5, 0.9, 2); }
      pen.stroke([[w * 0.1, groundY - h * 0.08], [w * 0.9, groundY - h * 0.08]], false, "#c99a6b", 4, 0.9, 2);
      for (var c2 = 0; c2 < 5; c2++) { var cx2 = w * 0.55 + c2 * w * 0.08, cy2 = h * 0.84; pen.blob([[cx2 - 6, cy2], [cx2 + 6, cy2], [cx2, cy2 + h * 0.07]], "#ff8c1a", "#d9701a", 3, 4); pen.stroke([[cx2, cy2], [cx2 - 5, cy2 - h * 0.05]], false, "#3fb469", 3, 0.9, 1); pen.stroke([[cx2, cy2], [cx2 + 4, cy2 - h * 0.05]], false, "#3fb469", 3, 0.9, 1); }
      var barn = [[w * 0.72, groundY - h * 0.06], [w * 0.72, groundY - h * 0.26], [w * 0.82, groundY - h * 0.36], [w * 0.92, groundY - h * 0.26], [w * 0.92, groundY - h * 0.06]];
      pen.blob(barn, "#e8384f", "#b8323f", 4, 7);
    } else if (place === "well") {
      var well = [[w * 0.62, groundY - h * 0.02], [w * 0.62, groundY - h * 0.2], [w * 0.8, groundY - h * 0.2], [w * 0.8, groundY - h * 0.02]];
      pen.blob(well, "#8f88b0", "#5a5378", 4, 7);
      pen.blob([[w * 0.6, groundY - h * 0.22], [w * 0.71, groundY - h * 0.36], [w * 0.82, groundY - h * 0.22]], "#ff5d6c", "#7a1f2c", 4, 6);
      pen.stroke([[w * 0.64, groundY - h * 0.22], [w * 0.64, groundY - h * 0.34]], false, "#5a5378", 4, 0.9, 2); pen.stroke([[w * 0.78, groundY - h * 0.22], [w * 0.78, groundY - h * 0.34]], false, "#5a5378", 4, 0.9, 2);
    } else if (place === "market") {
      var awn = [[w * 0.58, groundY - h * 0.3], [w * 0.92, groundY - h * 0.3], [w * 0.92, groundY - h * 0.2], [w * 0.58, groundY - h * 0.2]];
      pen.fill(awn, "#ff5d6c", 8, 5, 0.8, 1.2); pen.stroke(awn, true, "#d63f52", 4, 0.9, 2);
      pen.blob([[w * 0.6, groundY - h * 0.2], [w * 0.9, groundY - h * 0.2], [w * 0.9, groundY], [w * 0.6, groundY]], "#ffd863", "#c99a6b", 4, 7);
    } else if (place === "arena" || place === "tower") {
      for (var fl = 0; fl < 4; fl++) { var flx = w * 0.55 + fl * w * 0.11; pen.stroke([[flx, groundY - h * 0.05], [flx, groundY - h * 0.35]], false, "#5a5378", 4, 0.9, 2); pen.blob([[flx, groundY - h * 0.35], [flx + w * 0.07, groundY - h * 0.31], [flx, groundY - h * 0.27]], ["#ff5d6c", "#ffd863", "#57c4ff", "#8a5cff"][fl], "#3a2b52", 3, 4); }
    } else {
      // home: a little house
      var house = [[w * 0.66, groundY], [w * 0.66, groundY - h * 0.22], [w * 0.9, groundY - h * 0.22], [w * 0.9, groundY]];
      pen.blob(house, "#ffe9c9", "#b98549", 4, 7);
      pen.blob([[w * 0.63, groundY - h * 0.22], [w * 0.78, groundY - h * 0.38], [w * 0.93, groundY - h * 0.22]], "#ff5d6c", "#7a1f2c", 4, 6);
    }
    g.globalAlpha = 1;
  }

  var FOOD_LOOK = {
    cookie: ["#e0a45a", "#7a4a1f", "dots"], cake: ["#ff8fd0", "#e560ae", "candle"], pie: ["#e0a45a", "#a2764a", "lattice"],
    carrot: ["#ff8c1a", "#d9701a", "carrot"], apple: ["#ff5d6c", "#d63f52", "stem"], grapes: ["#a97dff", "#8a5cff", "dots"],
    pizza: ["#ffd863", "#e8384f", "slice"], taco: ["#ffd863", "#c99a6b", "slice"], curry: ["#ff9f45", "#d9701a", "bowl"],
    salad: ["#6fdc8c", "#3fb469", "leaf"], broccoli: ["#3fb469", "#14522f", "leaf"], pear: ["#c8e07a", "#8ab34a", "stem"],
    cheese: ["#ffd863", "#eab128", "holes"], noodles: ["#ffe6a0", "#c99a6b", "bowl"], sushi: ["#fff", "#241f36", "roll"],
    mushroomcap: ["#ff5d6c", "#fff", "dots"], popcorn: ["#fff6d8", "#ffd863", "dots"], peanuts: ["#c99a6b", "#7a4a1f", "dots"],
    candyfloss: ["#ffbde4", "#ff8fd0", "cloud"], icecream: ["#ffd7db", "#e0a45a", "cone"], cloudfloss: ["#eaf6ff", "#9fe0ff", "cloud"]
  };
  function drawFood(pen, x, y, r, food) {
    var look = FOOD_LOOK[food] || ["#ffd863", "#c99a6b", "dots"], fill = look[0], line = look[1], style = look[2];
    if (style === "carrot") { pen.blob([[x - r * 0.5, y - r], [x + r * 0.5, y - r], [x, y + r]], fill, line, 3, 5); pen.stroke([[x, y - r], [x - r * 0.4, y - r * 1.7]], false, "#3fb469", 3, 0.9, 1); pen.stroke([[x, y - r], [x + r * 0.4, y - r * 1.7]], false, "#3fb469", 3, 0.9, 1); return; }
    if (style === "slice") { pen.blob([[x - r, y + r * 0.6], [x + r, y + r * 0.6], [x, y - r]], fill, line, 3, 5); for (var d = 0; d < 3; d++) pen.fill(pen.ellipse(x + (d - 1) * r * 0.4, y + r * 0.1 + (d % 2) * r * 0.2, r * 0.16, r * 0.16, 8), line, 2, 2, 1, 0.5); return; }
    if (style === "cone") { pen.blob([[x - r * 0.6, y], [x + r * 0.6, y], [x, y + r * 1.4]], "#e0a45a", "#a2764a", 3, 5); pen.blob(pen.ellipse(x, y - r * 0.3, r * 0.7, r * 0.7, 14), fill, "#ff9db5", 3, 5); return; }
    var shape = style === "cloud" ? pen.ellipse(x, y, r * 1.2, r * 0.8, 16) : pen.ellipse(x, y, r, r * 0.9, 16);
    pen.blob(shape, fill, line, 3, 5);
    if (style === "dots" || style === "holes") [[-0.35, -0.25], [0.3, 0.15], [-0.05, 0.4], [0.35, -0.4]].forEach(function (d) { pen.fill(pen.ellipse(x + d[0] * r, y + d[1] * r, r * 0.16, r * 0.16, 8), line, 2, 2, 1, 0.4); });
    if (style === "candle") pen.stroke([[x, y - r * 0.9], [x, y - r * 1.5]], false, "#57c4ff", 3, 0.9, 2);
    if (style === "stem") pen.stroke([[x, y - r * 0.9], [x + r * 0.2, y - r * 1.4]], false, "#7a4a1f", 3, 0.9, 2);
    if (style === "leaf") pen.stroke([[x - r * 0.6, y], [x + r * 0.6, y]], false, line, 2, 0.8, 2);
  }

  /* ---------- pages ---------- */
  /* opts: { speciesId, colourId, place, food, count, text (array of lines), sign, seed } */
  function diaryPage(cv, opts) {
    opts = opts || {};
    var g = cv.getContext("2d"), w = cv.width, h = cv.height;
    var pen = new Pen(g, opts.seed || 7, Math.max(3, h / 55));
    paper(g, w, h, "ruled");
    // picture area is the lower two thirds
    g.save(); g.translate(0, h * 0.28); g.beginPath(); g.rect(0, 0, w, h * 0.72); g.clip();
    drawPlace(pen, opts.place, w, h * 0.72);
    var s = h * 0.13;
    drawPet(pen, w * 0.3, h * 0.72 * 0.66, s, opts.speciesId, opts.colourId);
    var n = Math.min(5, Math.max(0, opts.count | 0));
    for (var i = 0; i < n; i++) drawFood(pen, w * 0.5 + i * s * 0.75, h * 0.72 * 0.86 - (i % 2) * s * 0.3, s * 0.3, opts.food);
    // a heart or two
    var hearts = 1 + Math.floor(pen.r() * 2);
    for (var hh = 0; hh < hearts; hh++) { var hx = w * (0.42 + hh * 0.06), hy = h * 0.72 * (0.28 + hh * 0.1), hr = s * 0.18;
      pen.stroke([[hx, hy + hr], [hx - hr, hy], [hx - hr * 0.5, hy - hr * 0.8], [hx, hy - hr * 0.3], [hx + hr * 0.5, hy - hr * 0.8], [hx + hr, hy]], true, "#ff5d6c", 3, 0.9, 2); }
    g.restore();
    // words
    var lines = opts.text || [];
    var size = Math.round(h * 0.075);
    lines.slice(0, 2).forEach(function (line, i) { pen.text(line, w * 0.09, h * 0.16 + i * h * 0.12 - h * 0.02, size, "#3a2f5a", "left", w * 0.86); });
    if (opts.sign) {
      // a strip of paper behind the signature so it reads over the grass
      g.fillStyle = "rgba(255,253,245,0.82)"; g.fillRect(w * 0.07, h * 0.9, w * 0.6, h * 0.085);
      pen.text(opts.sign, w * 0.09, h * 0.965, Math.round(size * 0.7), "#7c7793", "left", w * 0.56);
    }
  }

  /* A poster for the Quest Board: title, a sketch, a pin. */
  function poster(cv, opts) {
    opts = opts || {};
    var g = cv.getContext("2d"), w = cv.width, h = cv.height;
    var pen = new Pen(g, opts.seed || 11, Math.max(3, h / 60));
    paper(g, w, h, "poster");
    var edge = [[w * 0.03, h * 0.03], [w * 0.97, h * 0.02], [w * 0.98, h * 0.97], [w * 0.02, h * 0.98]];
    pen.stroke(edge, true, "#c99a6b", 3, 0.7, 2);
    // pin
    pen.blob(pen.ellipse(w * 0.5, h * 0.07, w * 0.04, w * 0.04, 12), "#ff5d6c", "#7a1f2c", 3, 4);
    pen.text(opts.title || "WANTED", w * 0.5, h * 0.3, Math.round(h * 0.16), "#3a2f5a", "center", w * 0.9);
    if (opts.line) pen.text(opts.line, w * 0.5, h * 0.44, Math.round(h * 0.09), "#7c7793", "center", w * 0.9);
    drawPet(pen, w * 0.5, h * 0.7, h * 0.15, opts.speciesId, opts.colourId);
    if (opts.food) drawFood(pen, w * 0.78, h * 0.72, h * 0.06, opts.food);
  }

  /* A small sketch of a pet on plain paper — for letters and cards. */
  function sketch(cv, opts) {
    opts = opts || {};
    var g = cv.getContext("2d"), w = cv.width, h = cv.height;
    var pen = new Pen(g, opts.seed || 3, Math.max(3, h / 60));
    if (!opts.transparent) paper(g, w, h, "plain");
    drawPet(pen, w * 0.5, h * 0.55, Math.min(w, h) * 0.26, opts.speciesId, opts.colourId);
  }

  return { diaryPage: diaryPage, poster: poster, sketch: sketch, Pen: Pen, drawPet: drawPet, drawPlace: drawPlace, drawFood: drawFood };
})();
