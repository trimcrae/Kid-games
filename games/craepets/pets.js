/* ===========================================================
   Craepets — THE CREATURES.
   -----------------------------------------------------------
   Every pet in this game is a little clay toy, rendered by Blender
   from code (tools/craepets-art/render.py) into the sprite sheets
   in art/. Nothing here is drawn by an image model: the creatures
   are spheres, cones and tubes lit like a toy photo, and this file
   is what puts them on the page.

   The sheets hold each creature in WHITE clay plus a colour-ID mask
   (red = body, green = accent), so the SAME render can be painted in
   a dozen different colours — exactly how the Rainbow Pool re-paints
   a pet: a Berry Red Blorb and a Starry Blorb are one picture and
   two palettes, tinted right here through the render's own light
   and shade.

   Palette keys (shared by every creature):
       B  body            b  body shade      L  body highlight
       A  accent (belly, ears, wings)        a  accent shade
       O  outline colour (now only used for the crayon pages)

       CPPets.draw(canvas, "blorb", "berry", {frame:"idle"})
       CPPets.chip("blorb", "grape", 48)   -> a small data-URL face
       CPPets.ready(fn)                    -> fn() once the sheets are in

   A creature tile is 16 x 20 cells (feet on the bottom edge, room for
   a hat on top); a petpet tile is 8 x 8. `scale` is device px per cell.
   =========================================================== */
window.CPPets = (function () {
  "use strict";

  /* =========================================================
     THE SEVEN CREATURES
     ========================================================= */

  /* Every species has a personality: three foods it LOVES (double the
     joy, and it says so) and a favourite place in the valley (a couple
     of extra coins for every right answer there). Reading the card and
     remembering "Snorbits love carrots" is the whole lesson. */
  var SPECIES = [
    { id: "blorb",     name: "Blorb",     blurb: "Round, bouncy and permanently pleased.",
      likes: ["cookie", "cake", "pie"], fav: "pool", trait: "a sweet tooth and a soft spot for puddles" },
    { id: "snorbit",   name: "Snorbit",   blurb: "Long ears, quick hops, endless snacking.",
      likes: ["carrot", "apple", "grapes"], fav: "farm", trait: "crunchy things and anything that grows" },
    { id: "flarn",     name: "Flarn",     blurb: "A pocket dragon. Warm, not dangerous.",
      likes: ["pizza", "taco", "curry"], fav: "well", trait: "spicy food and a good long story" },
    { id: "twiggle",   name: "Twiggle",   blurb: "A leafy little fawn from the deep woods.",
      likes: ["salad", "broccoli", "pear"], fav: "well", trait: "green leaves and old words" },
    { id: "puddlepop", name: "Puddlepop", blurb: "Half kitten, half raindrop, all trouble.",
      likes: ["cheese", "noodles", "sushi"], fav: "pool", trait: "cheese, noodles and splashing about" },
    { id: "zibbit",    name: "Zibbit",    blurb: "A star frog with an enormous grin.",
      likes: ["mushroomcap", "popcorn", "peanuts"], fav: "farm", trait: "little snacks and big skies" },
    { id: "glimmr",    name: "Glimmr",    blurb: "A wisp of a sprite that hums when happy.",
      likes: ["candyfloss", "icecream", "cloudfloss"], fav: "well", trait: "fluffy food and a good tune" }
  ];

  /* =========================================================
     THE COLOURS — palette swaps, exactly like a paint brush.
     A palette value can be a colour string OR a function
     (x, y, w, h) -> colour, which is how Rainbow and Starry work.
     ========================================================= */
  var RAINBOW = ["#ff5d6c", "#ff9f45", "#ffd863", "#6fdc8c", "#57c4ff", "#8a5cff", "#ff8fd0"];

  var COLOURS = [
    { id: "berry",  name: "Berry Red",   swatch: "#ff5d6c", free: true,
      pal: { O: "#7a1f2c", B: "#ff5d6c", b: "#d63f52", L: "#ff9aa4", A: "#ffd7db", a: "#f2a3ad" } },
    { id: "sky",    name: "Sky Blue",    swatch: "#57c4ff", free: true,
      pal: { O: "#14496b", B: "#57c4ff", b: "#2f9fe0", L: "#9fe0ff", A: "#dcf3ff", a: "#a5dcf7" } },
    { id: "meadow", name: "Meadow Green", swatch: "#6fdc8c", free: true,
      pal: { O: "#14522f", B: "#6fdc8c", b: "#3fb469", L: "#a8f0bd", A: "#e0ffe9", a: "#a9eec1" } },
    { id: "bubble", name: "Bubblegum",   swatch: "#ff8fd0", free: true,
      pal: { O: "#77234f", B: "#ff8fd0", b: "#e560ae", L: "#ffbde4", A: "#ffe6f5", a: "#ffb9e0" } },
    { id: "sunbeam", name: "Sunbeam",    swatch: "#ffd863", cost: 120,
      pal: { O: "#6d4a06", B: "#ffd863", b: "#eab128", L: "#ffeaa6", A: "#fff6d8", a: "#ffe49b" } },
    { id: "grape",  name: "Grape",       swatch: "#a97dff", cost: 120,
      pal: { O: "#38215e", B: "#a97dff", b: "#8a5cff", L: "#cdb4ff", A: "#ede2ff", a: "#cbb4ff" } },
    { id: "cocoa",  name: "Cocoa",       swatch: "#c99a6b", cost: 120,
      pal: { O: "#4a3018", B: "#c99a6b", b: "#a2764a", L: "#e3bd92", A: "#f4e1c9", a: "#dcbb95" } },
    { id: "snow",   name: "Snow",        swatch: "#eef1ff", cost: 150,
      pal: { O: "#4a5070", B: "#eef1ff", b: "#cbd3ee", L: "#ffffff", A: "#ffffff", a: "#dde3ff" } },
    { id: "mint",   name: "Mint Cream",  swatch: "#9ff0e0", cost: 150,
      pal: { O: "#12594f", B: "#9ff0e0", b: "#5fd4bf", L: "#cbfbf1", A: "#eafffb", a: "#b6f5e9" } },
    { id: "gold",   name: "Gold",        swatch: "#ffce3d", cost: 400,
      pal: { O: "#6b4a00", B: gradientY("#ffe9a0", "#e0a41f"), b: gradientY("#e8bd4a", "#b07a12"), L: "#fff6d0", A: "#fff0b8", a: "#e8b93a" } },
    { id: "rainbow", name: "Rainbow",    swatch: "linear-gradient(90deg,#ff5d6c,#ffd863,#6fdc8c,#57c4ff,#8a5cff)", cost: 500,
      pal: { O: "#3a2b52", B: rainbowRows(0), b: rainbowRows(-28), L: rainbowRows(30), A: "#fffdf5", a: "#e9e2ff" } },
    { id: "starry", name: "Starry Night", swatch: "linear-gradient(140deg,#1b2559,#4b3f9e)", cost: 500,
      pal: { O: "#0a0f2b", B: starry("#26306e", "#8ea2ff"), b: starry("#161c48", "#6d7fe0"), L: starry("#4552a8", "#ffffff"), A: "#111a44", a: "#0d1436" } },
    { id: "shadow", name: "Shadow",      swatch: "linear-gradient(140deg,#3a3350,#6b6390)", cost: 500,
      pal: { O: "#241f36", B: "#5a5378", b: "#3a3552", L: "#8a82b0", A: "#6f6796", a: "#57507c" } },

    /* --- more plain colours --- */
    { id: "tangerine", name: "Tangerine", swatch: "#ff9f45", free: true,
      pal: { O: "#7a3d08", B: "#ff9f45", b: "#e07a22", L: "#ffc48a", A: "#ffe9d2", a: "#ffcda3" } },
    { id: "lavender", name: "Lavender",   swatch: "#c9a7f5", free: true,
      pal: { O: "#4b2f7a", B: "#c9a7f5", b: "#a37fdc", L: "#e2ccff", A: "#f3ebff", a: "#dcc9f7" } },
    { id: "peach",  name: "Peach",        swatch: "#ffb28a", cost: 120,
      pal: { O: "#7a4020", B: "#ffb28a", b: "#e58a5e", L: "#ffd2b8", A: "#fff0e6", a: "#ffd6c0" } },
    { id: "lime",   name: "Lime Fizz",    swatch: "#b5e847", cost: 120,
      pal: { O: "#3f5c0a", B: "#b5e847", b: "#86bf1f", L: "#d6f58f", A: "#f3ffd8", a: "#d9f5a6" } },
    { id: "ocean",  name: "Ocean Teal",   swatch: "#3ec9c0", cost: 120,
      pal: { O: "#0f4f4a", B: "#3ec9c0", b: "#1f9f97", L: "#8ae6df", A: "#e0fbf8", a: "#a9ece6" } },
    { id: "cherry", name: "Cherry",       swatch: "#e63946", cost: 120,
      pal: { O: "#5a0f18", B: "#e63946", b: "#b8232f", L: "#ff7a84", A: "#ffe3e6", a: "#ffb8bf" } },
    { id: "plum",   name: "Plum",         swatch: "#8a4fa3", cost: 150,
      pal: { O: "#3a1a48", B: "#8a4fa3", b: "#66357c", L: "#b58ac9", A: "#efdff7", a: "#d5b8e3" } },
    { id: "slate",  name: "Stormy Slate", swatch: "#7c8ba1", cost: 150,
      pal: { O: "#2c3442", B: "#7c8ba1", b: "#586579", L: "#a9b6c8", A: "#e4e9f0", a: "#c3cbd8" } },
    { id: "iceblue", name: "Ice Blue", swatch: "#b8e8ff", cost: 150,
      pal: { O: "#2e5a7a", B: "#b8e8ff", b: "#86c6ea", L: "#e0f6ff", A: "#ffffff", a: "#d6f1ff" } },

    /* --- patterns: a paint brush that does something clever --- */
    { id: "silver", name: "Silver",       swatch: "linear-gradient(180deg,#f4f6fb,#9aa3b5)", cost: 400,
      pal: { O: "#3d4455", B: gradientY("#f2f4f9", "#9aa3b5"), b: gradientY("#c3c9d6", "#6c7487"), L: "#ffffff", A: "#f6f7fb", a: "#c9cfdb" } },
    { id: "copper", name: "Copper",       swatch: "linear-gradient(180deg,#f0a06a,#9a4a1c)", cost: 400,
      pal: { O: "#4a2008", B: gradientY("#f5b07e", "#a0521f"), b: gradientY("#c97d4a", "#6e3410"), L: "#ffd9b8", A: "#ffe6cf", a: "#e2b58f" } },
    { id: "sunset", name: "Sunset",       swatch: "linear-gradient(180deg,#ffd166,#ff6b6b,#a06cd5)", cost: 500,
      pal: { O: "#4a1e5e", B: gradientStops(["#ffd166", "#ff8c5a", "#ff6b8b", "#a06cd5"]), A: "#fff3d6", a: "#ffd9a8" } },
    { id: "aurora", name: "Aurora",       swatch: "linear-gradient(180deg,#5ef2c8,#4b8bff,#c06cff)", cost: 500,
      pal: { O: "#1e2a5e", B: gradientStops(["#5ef2c8", "#4b8bff", "#8a6cff", "#d06cff"]), A: "#e8fff8", a: "#b8f0e2" } },
    { id: "candy",  name: "Candy Stripe", swatch: "repeating-linear-gradient(180deg,#ff8fd0 0 6px,#fff 6px 12px)", cost: 500,
      pal: { O: "#77234f", B: bands(["#ff8fd0", "#ffffff"], 1.5), A: "#ffe6f5", a: "#ffb9e0" } },
    { id: "tiger",  name: "Tiger",        swatch: "repeating-linear-gradient(180deg,#ff9f45 0 8px,#3a2036 8px 11px)", cost: 500,
      pal: { O: "#3a2036", B: bands(["#ff9f45", "#ff9f45", "#3a2036"], 0.9), A: "#fff0dc", a: "#ffd6a8" } },
    { id: "cheetah", name: "Cheetah",     swatch: "radial-gradient(circle at 30% 30%,#3a2a1a 15%,transparent 16%),radial-gradient(circle at 70% 65%,#3a2a1a 15%,transparent 16%),#e8b96a", cost: 500,
      pal: { O: "#3a2a1a", B: spots("#e8b96a", "#3a2a1a", 4, 11), A: "#fff2d9", a: "#f0d7a8" } },
    { id: "sprinkles", name: "Sprinkles", swatch: "radial-gradient(circle at 25% 30%,#ff5d6c 12%,transparent 13%),radial-gradient(circle at 70% 60%,#57c4ff 12%,transparent 13%),radial-gradient(circle at 45% 80%,#ffd863 12%,transparent 13%),#fff7ee", cost: 500,
      pal: { O: "#7a5a4a", B: sprinkles("#fff7ee"), A: "#ffffff", a: "#f3e6dc" } },
    { id: "galaxy", name: "Galaxy",       swatch: "linear-gradient(140deg,#2b1055,#7597de)", cost: 500,
      pal: { O: "#120a2e", B: galaxy(), b: "#231a5a", L: "#a58cff", A: "#1b1244", a: "#130c33" } },
    { id: "ember",  name: "Ember",        swatch: "radial-gradient(circle at 40% 40%,#ff9f45 10%,transparent 11%),#3a2a2a", cost: 500,
      pal: { O: "#1a0f0f", B: spots("#4a3535", "#ff9f45", 5, 8), b: "#2a1c1c", L: "#ffb36b", A: "#5a4040", a: "#3d2c2c" } }
  ];

  function gradientY(top, bottom) {
    return function (x, y, w, h) { return mix(top, bottom, h > 1 ? y / (h - 1) : 0); };
  }
  /* Rainbow stripes: one colour per grid cell of height, like the old
     pixel rows, so the bands stay bold whatever size the pet is drawn. */
  function rainbowRows(shift) {
    return function (x, y, w, h) {
      var band = Math.floor(y / (h / 20)) % RAINBOW.length;
      var c = RAINBOW[band];
      return shift ? shade(c, shift) : c;
    };
  }
  /* A deterministic sprinkle of little stars — same pet, same sky, every time. */
  function starry(base, star) {
    return function (x, y) {
      var cx = Math.floor(x / 5), cy = Math.floor(y / 5);
      return ((cx * 7 + cy * 13 + cx * cy * 3) % 17 === 0) ? star : base;
    };
  }
  /* A smooth top-to-bottom blend through several colours. */
  function gradientStops(stops) {
    return function (x, y, w, h) {
      var t = h > 1 ? y / (h - 1) : 0, n = stops.length - 1;
      var i = Math.min(n - 1, Math.floor(t * n));
      return mix(stops[i], stops[i + 1], t * n - i);
    };
  }
  /* Horizontal stripes, `cells` grid cells tall each, cycling through `cols`. */
  function bands(cols, cells) {
    return function (x, y, w, h) {
      return cols[Math.floor(y / (CELL * cells)) % cols.length];
    };
  }
  /* A fixed scramble of a grid square, so spots land where they land and
     never line up into stripes. */
  function scatter(cx, cy) {
    var n = (cx * 374761393 + cy * 668265263) | 0;
    n = ((n ^ (n >>> 13)) * 1274126177) | 0;
    return (n ^ (n >>> 16)) >>> 0;
  }
  /* Round-ish spots on a base colour: one in every `every` grid squares of
     `size` px, placed by a fixed hash so the pattern never flickers. */
  function spots(base, spot, every, size) {
    return function (x, y) {
      var cx = Math.floor(x / size), cy = Math.floor(y / size);
      if (scatter(cx, cy) % every !== 0) return base;
      // only the middle of the square, so the spot is round rather than boxy
      var dx = x - (cx + 0.5) * size, dy = y - (cy + 0.5) * size;
      return (dx * dx + dy * dy <= (size * 0.42) * (size * 0.42)) ? spot : base;
    };
  }
  /* Rainbow hundreds-and-thousands on a cream base. */
  function sprinkles(base) {
    var cols = ["#ff5d6c", "#57c4ff", "#ffd863", "#6fdc8c", "#ff8fd0", "#8a5cff"];
    return function (x, y) {
      var size = 7, cx = Math.floor(x / size), cy = Math.floor(y / size);
      if (scatter(cx, cy) % 5 !== 0) return base;
      var dx = x - (cx + 0.5) * size, dy = y - (cy + 0.5) * size;
      // a little oblong, tilted one way or the other
      var tilt = ((cx + cy) % 2) ? 1 : -1;
      var u = (dx + tilt * dy) * 0.7, v = (dx - tilt * dy) * 0.7;
      return (u * u / 12 + v * v / 3 <= 1) ? cols[(cx * 3 + cy * 5) % cols.length] : base;
    };
  }
  /* Deep space: a purple-to-blue wash with a scatter of stars. */
  function galaxy() {
    var wash = gradientStops(["#2b1055", "#4b2a8a", "#3d5fb8", "#7597de"]);
    var star = starry("#000000", "#ffffff");
    return function (x, y, w, h) {
      return star(x, y) === "#ffffff" ? "#ffffff" : wash(x, y, w, h);
    };
  }

  function hex(c) {
    c = c.replace("#", "");
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
  }
  function rgb(a) {
    return "#" + a.map(function (n) {
      var v = Math.max(0, Math.min(255, Math.round(n))).toString(16);
      return v.length < 2 ? "0" + v : v;
    }).join("");
  }
  function mix(a, b, t) {
    var A = hex(a), B = hex(b);
    return rgb([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
  }
  function shade(c, amt) {
    var A = hex(c);
    return rgb([A[0] + amt, A[1] + amt, A[2] + amt]);
  }

  /* =========================================================
     THE SHEETS — loading the clay renders
     ========================================================= */
  var ART = window.CPArt || null;        // art/manifest.js, loaded before us
  var CELL = ART ? ART.cell : 12;
  var FRAME = ART ? ART.frame : [16, 20];        // a creature tile, in cells
  var PPFRAME = ART ? ART.petpetFrame : [8, 8];  // a petpet tile, in cells
  var images = {};                       // sheet id -> HTMLImageElement (loaded)
  var pending = 0, readyFns = [], isReady = false;

  function artBase() {
    // the sheets live next to this script, whatever page includes it
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].getAttribute("src") || "";
      if (/(^|\/)pets\.js(\?|$)/.test(src)) return src.replace(/pets\.js.*$/, "") + "art/";
    }
    return "art/";
  }

  function loadSheets() {
    if (!ART || !ART.sheets) { finishReady(); return; }
    var base = artBase();
    Object.keys(ART.sheets).forEach(function (id) {
      pending++;
      var img = new Image();
      img.onload = function () { images[id] = img; done(); };
      img.onerror = function () { done(); };
      img.src = base + ART.sheets[id].file;
    });
    if (!pending) finishReady();
    function done() { pending--; if (pending <= 0) finishReady(); }
  }
  function finishReady() {
    if (isReady) return;
    isReady = true;
    var fns = readyFns; readyFns = [];
    fns.forEach(function (f) { try { f(); } catch (e) {} });
  }
  /* Call fn once every sheet has loaded (or failed) — or straight away
     if they already have. The game boots behind this. */
  function ready(fn) { if (isReady) fn(); else readyFns.push(fn); }

  /* Where a tile is on its sheet: { img, sx, sy, w, h } or null. */
  function tileOf(sheetId, name) {
    var sheet = ART && ART.sheets && ART.sheets[sheetId];
    var img = images[sheetId];
    if (!sheet || !img || !sheet.tiles[name]) return null;
    var cr = sheet.tiles[name];
    return { img: img, sx: cr[0] * sheet.tile[0], sy: cr[1] * sheet.tile[1], w: sheet.tile[0], h: sheet.tile[1] };
  }

  /* =========================================================
     TINTING — painting the white clay in a palette
     ========================================================= */
  var cache = {};

  function pixelsOf(t) {
    var cv = document.createElement("canvas");
    cv.width = t.w; cv.height = t.h;
    var g = cv.getContext("2d", { willReadFrequently: true });
    g.drawImage(t.img, t.sx, t.sy, t.w, t.h, 0, 0, t.w, t.h);
    return g.getImageData(0, 0, t.w, t.h);
  }

  /* The render's light and shade, read off the white clay, become a
     position on a three-stop ramp: deep shade -> the palette's shade ->
     base -> highlight. LO/HI are where white clay sits in that render. */
  var LO = 0.22, HI = 0.98;
  function rampColours(pal, key, x, y, w, h) {
    var base = pal[key], sh = pal[key === "B" ? "b" : "a"], hi = key === "B" ? pal.L : null;
    if (typeof base === "function") base = base(x, y, w, h);
    if (typeof sh === "function") sh = sh(x, y, w, h);
    if (typeof hi === "function") hi = hi(x, y, w, h);
    if (!sh) sh = shade(base, -40);
    if (!hi) hi = shade(base, 45);
    return [hex(shade(sh, -30)), hex(sh), hex(base), hex(hi)];
  }
  function rampAt(stops, t) {
    // stops: [deep, shade, base, highlight] at t = 0, .3, .62, 1
    var p, q, u;
    if (t < 0.3) { p = stops[0]; q = stops[1]; u = t / 0.3; }
    else if (t < 0.62) { p = stops[1]; q = stops[2]; u = (t - 0.3) / 0.32; }
    else { p = stops[2]; q = stops[3]; u = (t - 0.62) / 0.38; }
    return [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, p[2] + (q[2] - p[2]) * u];
  }

  /* Paint one tile of white clay in a palette: returns a canvas the size
     of the tile, or null if the sheet isn't here yet. */
  function tint(sheetId, name, pal) {
    var lit = tileOf(sheetId, name), id = tileOf(sheetId, name + "-id");
    if (!lit || !id) return null;
    var L = pixelsOf(lit), M = pixelsOf(id);
    var w = L.width, h = L.height, d = L.data, m = M.data;
    var stopsB = null, stopsA = null, lastKeyB = "", lastKeyA = "";
    var fnB = typeof pal.B === "function" || typeof pal.b === "function" || typeof pal.L === "function";
    var fnA = typeof pal.A === "function" || typeof pal.a === "function";
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4;
        if (d[i + 3] === 0) continue;
        var body = m[i] / 255, acc = m[i + 1] / 255;
        if (m[i + 3] === 0) { body = 0; acc = 0; }
        if (body + acc <= 0.002) continue;                // eyes, mouth, cheeks: as rendered
        var fixed = Math.max(0, 1 - body - acc);
        var lum = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
        var t = Math.max(0, Math.min(1, (lum - LO) / (HI - LO)));
        var r = d[i] * fixed, g = d[i + 1] * fixed, b = d[i + 2] * fixed;
        if (body > 0) {
          if (!stopsB || fnB) stopsB = rampColours(pal, "B", x, y, w, h);
          var cb = rampAt(stopsB, t);
          r += cb[0] * body; g += cb[1] * body; b += cb[2] * body;
        }
        if (acc > 0) {
          if (!stopsA || fnA) stopsA = rampColours(pal, "A", x, y, w, h);
          var ca = rampAt(stopsA, t);
          r += ca[0] * acc; g += ca[1] * acc; b += ca[2] * acc;
        }
        d[i] = r; d[i + 1] = g; d[i + 2] = b;
      }
    }
    var cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    cv.getContext("2d").putImageData(L, 0, 0);
    return cv;
  }

  function species(id) {
    for (var i = 0; i < SPECIES.length; i++) if (SPECIES[i].id === id) return SPECIES[i];
    return SPECIES[0];
  }
  function colour(id) {
    for (var i = 0; i < COLOURS.length; i++) if (COLOURS[i].id === id) return COLOURS[i];
    return COLOURS[0];
  }

  /* A painted creature tile (native size), cached. `scale` is accepted
     for old callers but the picture is drawn to size by draw(). */
  function sprite(speciesId, colourId, frame) {
    frame = frame || "idle";
    var key = speciesId + "|" + colourId + "|" + frame;
    if (cache[key]) return cache[key];
    var cv = tint(speciesId, frame, colour(colourId).pal);
    if (!cv && frame !== "idle") return sprite(speciesId, colourId, "idle");
    if (cv) cache[key] = cv;
    return cv;
  }

  /* =========================================================
     THE WARDROBE — hats, glasses and scarves the pet WEARS.

     Bought once at the Market and kept for ever, like a paint
     brush, and drawn straight onto the creature everywhere it
     appears: the nest, the arena, the family board, the little
     chip next to your name. Three slots — head, face, neck —
     so a Craepet can be in a wizard hat, heart glasses and a
     scarf all at once, which is exactly what a three-year-old
     will do.

     Every item is rendered ON every species (its body hidden but
     still in the way) into that species' sheet, so a hat sits on a
     Zibbit's flat head and between a Snorbit's ears without any
     tuning here: the tile is simply drawn over the creature.
     ========================================================= */
  var WEAR = [
    /* --- hats --- */
    { id: "partyhat", name: "Party Hat", emoji: "🥳", cost: 40, slot: "head" },
    { id: "bow", name: "Big Bow", emoji: "🎀", cost: 30, slot: "head" },
    { id: "flowercrown", name: "Flower Crown", emoji: "🌸", cost: 45, slot: "head" },
    { id: "beanie", name: "Bobble Hat", emoji: "🧢", cost: 35, slot: "head" },
    { id: "chef", name: "Chef's Hat", emoji: "👨‍🍳", cost: 50, slot: "head" },
    { id: "helmet", name: "Miner's Helmet", emoji: "⛏️", cost: 60, slot: "head" },
    { id: "cowboy", name: "Cowboy Hat", emoji: "🤠", cost: 60, slot: "head" },
    { id: "tophat", name: "Top Hat", emoji: "🎩", cost: 70, slot: "head" },
    { id: "bunnyears", name: "Bunny Ears", emoji: "🐰", cost: 45, slot: "head" },
    { id: "pirate", name: "Pirate Hat", emoji: "🏴‍☠️", cost: 80, slot: "head" },
    { id: "wizard", name: "Wizard Hat", emoji: "🧙", cost: 90, slot: "head" },
    { id: "princess", name: "Princess Tiara", emoji: "👸", cost: 120, slot: "head" },
    { id: "halo", name: "Golden Halo", emoji: "😇", cost: 150, slot: "head", rare: true },
    { id: "starcrown", name: "Crown of Stars", emoji: "🌟", cost: 200, slot: "head", rare: true },
    /* --- the seasonal ones: on the shelf in their season, a present on the day --- */
    { id: "santahat", name: "Santa Hat", emoji: "🎅", cost: 50, slot: "head", season: "winter" },
    { id: "pumpkinhat", name: "Pumpkin Hat", emoji: "🎃", cost: 50, slot: "head", season: "autumn" },

    /* --- glasses --- */
    { id: "glasses", name: "Round Glasses", emoji: "👓", cost: 40, slot: "face", colour: "#2b2440" },
    { id: "sunglasses", name: "Sunglasses", emoji: "🕶️", cost: 55, slot: "face", colour: "#111018" },
    { id: "heartglasses", name: "Heart Glasses", emoji: "💕", cost: 60, slot: "face", colour: "#ff5d8f" },
    { id: "starglasses", name: "Star Glasses", emoji: "🤩", cost: 90, slot: "face", colour: "#ffd166", rare: true },

    /* --- round the neck --- */
    { id: "scarf", name: "Cosy Scarf", emoji: "🧣", cost: 35, slot: "neck", colour: "#ff5d6c" },
    { id: "bluescarf", name: "Sky Scarf", emoji: "🧣", cost: 35, slot: "neck", colour: "#57c4ff" },
    { id: "bowtie", name: "Bow Tie", emoji: "🎀", cost: 45, slot: "neck", colour: "#8a5cff" },
    { id: "pearls", name: "Pearl Necklace", emoji: "📿", cost: 60, slot: "neck", colour: "#fff6f0" },
    { id: "medal", name: "Gold Medal", emoji: "🏅", cost: 80, slot: "neck", colour: "#ffd166" }
  ];
  var SLOTS = ["head", "face", "neck"];

  function wearById(id) {
    for (var i = 0; i < WEAR.length; i++) if (WEAR[i].id === id) return WEAR[i];
    return null;
  }

  /* Draw one wardrobe tile over the creature at the same place. */
  function drawTile(g, sheetId, name, x, y, w, h) {
    var t = tileOf(sheetId, name);
    if (!t) return false;
    g.drawImage(t.img, t.sx, t.sy, t.w, t.h, x, y, w, h);
    return true;
  }

  /* Everything the pet has on, drawn over the body. `wear` is
     {head, face, neck} of item ids (any may be empty); `level` decides
     the free tiara / crown that shows when nothing is on the head. */
  function drawWear(g, speciesId, x, y, w, h, wear, level) {
    wear = wear || {};
    var head = wear.head && wearById(wear.head);
    if (head) drawTile(g, speciesId, "wear-" + head.id, x, y, w, h);
    else if ((level || 1) >= 5) drawTile(g, speciesId, level >= 12 ? "wear-crown" : "wear-tiara", x, y, w, h);
    var face = wear.face && wearById(wear.face);
    if (face) drawTile(g, speciesId, "wear-" + face.id, x, y, w, h);
    var neck = wear.neck && wearById(wear.neck);
    if (neck) drawTile(g, speciesId, "wear-" + neck.id, x, y, w, h);
  }

  /* Does anything sit on the head? Then a chip keeps the tile's headroom. */
  function hasHat(wear, level) {
    return !!((wear && wear.head && wearById(wear.head)) || (level || 1) >= 5);
  }

  /* =========================================================
     DRAWING a pet into a canvas the page owns.
     opts: { frame, level, scale, bob, wear,
             cx   — where the pet's middle is, in pixels (default: centred),
             flip — true to face left,
             keep — don't clear the canvas first (draw over a scene) }
     ========================================================= */
  function draw(canvas, speciesId, colourId, opts) {
    opts = opts || {};
    var g = canvas.getContext("2d");
    var scale = opts.scale || Math.max(2, Math.floor(Math.min(canvas.width, canvas.height) / 20));
    var body = sprite(speciesId, colourId, opts.frame || "idle");
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
    if (!opts.keep) g.clearRect(0, 0, canvas.width, canvas.height);

    var w = FRAME[0] * scale, h = FRAME[1] * scale;
    var bob = opts.bob || 0;
    var cx = (opts.cx === undefined || opts.cx === null) ? canvas.width / 2 : opts.cx;
    var x = Math.round(cx - w / 2);
    var y = Math.round(canvas.height - h - scale) + bob;

    // a soft shadow so the pet sits on the ground instead of floating
    g.globalAlpha = 0.18;
    g.fillStyle = "#2b2440";
    var sw = w * 0.72, sh = scale * 1.4;
    g.beginPath();
    g.ellipse(cx, canvas.height - scale * 0.4, sw / 2, sh / 2, 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;

    // facing left is the same picture mirrored about its own middle
    g.save();
    if (opts.flip) { g.translate(2 * cx, 0); g.scale(-1, 1); }
    if (body) g.drawImage(body, x, y, w, h);
    // level 5 earns a tiara and level 12 a crown — unless a hat from the
    // wardrobe is on, which sits in the same place
    drawWear(g, speciesId, x, y, w, h, opts.wear, opts.level || 1);
    g.restore();
    return { x: x, y: y, w: w, h: h, scale: scale };
  }

  /* A small picture for chips, buttons and the family board. `pxSize`
     is the width it will be shown at; it is drawn at double that so it
     stays crisp on a retina screen. */
  function chip(speciesId, colourId, pxSize, wear, level) {
    pxSize = pxSize || 48;
    var scale = Math.min(CELL, Math.max(2, Math.ceil(pxSize * 2 / FRAME[0])));
    var w = FRAME[0] * scale, h = FRAME[1] * scale;
    var top = hasHat(wear, level) ? 0 : (FRAME[1] - FRAME[0]) * scale;   // crop the empty headroom
    var cv = document.createElement("canvas");
    cv.width = w; cv.height = h - top;
    var g = cv.getContext("2d");
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
    var body = sprite(speciesId, colourId, "idle");
    if (body) g.drawImage(body, 0, -top, w, h);
    drawWear(g, speciesId, 0, -top, w, h, wear, level || 1);
    return cv.toDataURL();
  }

  /* =========================================================
     THE EGG — what a Craepet is before it is a Craepet.
     Painted in the colour you chose, with spots in the accent
     colour, so a Berry Red egg hatches a Berry Red Blorb. It
     cracks in two stages as the hatching gets close.
     ========================================================= */
  function eggSprite(colourId, crack) {
    var key = "egg|" + colourId + "|" + crack;
    if (cache[key]) return cache[key];
    var cv = tint("egg", "crack" + (crack | 0), colour(colourId).pal);
    if (cv) cache[key] = cv;
    return cv;
  }
  /* Draw the egg where the pet would stand. opts: { scale, cx, bob, tilt (radians), crack } */
  function drawEgg(canvas, colourId, opts) {
    opts = opts || {};
    var g = canvas.getContext("2d");
    var scale = opts.scale || 8;
    var sp = eggSprite(colourId, opts.crack | 0);
    var w = FRAME[0] * scale, h = FRAME[1] * scale;
    var cx = (opts.cx === undefined || opts.cx === null) ? canvas.width / 2 : opts.cx;
    var x = Math.round(cx - w / 2);
    var y = Math.round(canvas.height - h - scale) + (opts.bob || 0);
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
    if (!opts.keep) g.clearRect(0, 0, canvas.width, canvas.height);
    g.globalAlpha = 0.18; g.fillStyle = "#2b2440";
    g.beginPath(); g.ellipse(cx, canvas.height - scale * 0.4, w * 0.34, scale * 1.2, 0, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;
    if (!sp) return;
    g.save();
    // rock about the bottom of the egg
    g.translate(cx, canvas.height - scale);
    g.rotate(opts.tilt || 0);
    g.drawImage(sp, x - cx, y - (canvas.height - scale), w, h);
    g.restore();
  }
  function eggChip(colourId, px, crack) {
    px = px || 48;
    var scale = Math.min(CELL, Math.max(2, Math.ceil(px * 2 / FRAME[0])));
    var w = FRAME[0] * scale, h = FRAME[1] * scale, top = (FRAME[1] - FRAME[0]) * scale;
    var cv = document.createElement("canvas");
    cv.width = w; cv.height = h - top;
    var g = cv.getContext("2d");
    g.imageSmoothingEnabled = true;
    var sp = eggSprite(colourId, crack | 0);
    if (sp) g.drawImage(sp, 0, -top, w, h);
    return cv.toDataURL();
  }

  /* =========================================================
     PETPETS — a pet for your pet.

     Tiny companions that trot along behind the Craepet wherever it
     wanders, each with a name of its own. Bought at the Market's 🐾
     shelf, kept for ever, one out at a time. Their colours are their
     own — a duckling is yellow whatever colour the Craepet is.
     ========================================================= */
  var PETPETS = [
    { id: "duckling", name: "Duckling", emoji: "🐥", cost: 60, blurb: "Follows anything bigger than itself." },
    { id: "snail", name: "Snail", emoji: "🐌", cost: 45, blurb: "Slow, but never left behind for long." },
    { id: "blobbin", name: "Blobbin", emoji: "🟢", cost: 50, blurb: "A drop of something green and friendly." },
    { id: "moth", name: "Moth", emoji: "🦋", cost: 55, blurb: "Flutters. Loves a lamp." },
    { id: "kit", name: "Kit", emoji: "🐱", cost: 70, blurb: "A pocket kitten. Purrs at a level 5." },
    { id: "hedge", name: "Hedgehog", emoji: "🦔", cost: 65, blurb: "Prickly outside, soft inside." },
    { id: "wisp", name: "Wisp", emoji: "👻", cost: 90, rare: true, blurb: "Glows in the dark. Not scary. Mostly." },
    { id: "starling", name: "Starling", emoji: "⭐", cost: 120, rare: true, blurb: "A fallen star that decided to stay." }
  ];
  function petpetById(id) {
    for (var i = 0; i < PETPETS.length; i++) if (PETPETS[i].id === id) return PETPETS[i];
    return null;
  }
  /* Draw a petpet standing on the same floor, its middle at cx. */
  function drawPetpet(canvas, id, opts) {
    var it = petpetById(id);
    if (!it) return;
    opts = opts || {};
    var g = canvas.getContext("2d");
    var scale = opts.scale || 4;
    var w = PPFRAME[0] * scale, h = PPFRAME[1] * scale;
    var cx = opts.cx === undefined ? canvas.width / 2 : opts.cx;
    var x = Math.round(cx - w / 2);
    var y = Math.round(canvas.height - h - scale) + (opts.bob || 0);
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
    g.globalAlpha = 0.16;
    g.fillStyle = "#2b2440";
    g.beginPath();
    g.ellipse(cx, canvas.height - scale * 0.4, w * 0.4, scale * 0.9, 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
    g.save();
    if (opts.flip) { g.translate(2 * cx, 0); g.scale(-1, 1); }
    drawTile(g, "petpets", it.id, x, y, w, h);
    g.restore();
  }
  /* A small picture of a petpet for a shop shelf or a card. */
  function petpetChip(id, px) {
    var it = petpetById(id);
    if (!it) return "";
    var scale = Math.min(CELL, Math.max(2, Math.ceil((px || 40) * 2 / PPFRAME[0])));
    var cv = document.createElement("canvas");
    cv.width = PPFRAME[0] * scale; cv.height = PPFRAME[1] * scale;
    var g = cv.getContext("2d");
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
    drawTile(g, "petpets", it.id, 0, 0, cv.width, cv.height);
    return cv.toDataURL();
  }

  loadSheets();

  return {
    SPECIES: SPECIES,
    COLOURS: COLOURS,
    WEAR: WEAR,
    SLOTS: SLOTS,
    PETPETS: PETPETS,
    ready: ready,
    drawEgg: drawEgg,
    eggChip: eggChip,
    petpetById: petpetById,
    drawPetpet: drawPetpet,
    petpetChip: petpetChip,
    species: species,
    colour: colour,
    wearById: wearById,
    sprite: sprite,
    draw: draw,
    chip: chip
  };
})();
