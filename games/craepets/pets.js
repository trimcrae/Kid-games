/* ===========================================================
   Craepets — THE CREATURES.
   -----------------------------------------------------------
   Every pet in this game is hand-authored right here as a pixel
   grid: one character per pixel, looked up in a palette. At load
   the grid is baked into an off-screen <canvas> that the page
   blits — no image files, no downloads, no dependencies.

   Because the colour is only a palette lookup, the SAME creature
   can be baked in a dozen different colours (classic palette
   swapping). That is exactly how the Rainbow Pool re-paints a
   pet: a Berry Red Blorb and a Starry Blorb are one grid and two
   palettes.

   Grid legend (shared by every creature):
       .  transparent     O  outline (dark edge)
       B  body            b  body shade      L  body highlight
       A  accent (belly, ears, wings)        a  accent shade
       W  eye white       K  pupil           M  mouth
       N  nose / cheek blush

       CPPets.draw(canvas, "blorb", "berry", {frame:"idle"})
       CPPets.chip("blorb", "grape", 48)   -> a small data-URL face
   =========================================================== */
window.CPPets = (function () {
  "use strict";

  /* =========================================================
     THE SIX CREATURES  (16 x 16 each, standing on the bottom row)
     ========================================================= */

  /* Every creature shares one FACE — three-pixel eyes with a centred
     pupil, blush, and a two-row smile — so they read as a family.
     What makes each one itself is the silhouette above and around it:
     ears, horns, leaves, a tail, a star, a tuft. */

  /* Blorb — a round, bouncy blob. No ears at all, and quite pleased. */
  var BLORB = [
    "................",
    ".....OOOOOO.....",
    "...OOBBBBBBOO...",
    "..OBBBBBBBBBBO..",
    ".OBBBBBBBBBBBBO.",
    ".OBWWWBBBBWWWBO.",
    ".OBWKWBBBBWKWBO.",
    ".OBWWWBBBBWWWBO.",
    ".OBNBBMBBMBBNBO.",
    ".OBBBBMMMMBBBBO.",
    ".OBbAAAAAAAAbBO.",
    ".OBbAAAAAAAAbBO.",
    "..ObbAAAAAAbbO..",
    "...OOBBBBBBOO...",
    "...OBBO..OBBO...",
    "...OOOO..OOOO..."
  ];

  /* Snorbit — two tall ears and enormous back feet. */
  var SNORBIT = [
    "...OOO....OOO...",
    "...OAO....OAO...",
    "...OAO....OAO...",
    "...OAO....OAO...",
    "...OAO....OAO...",
    "..OOBBBBBBBBOO..",
    ".OBBBBBBBBBBBBO.",
    ".OBWWWBBBBWWWBO.",
    ".OBWKWBBBBWKWBO.",
    ".OBWWWBBBBWWWBO.",
    ".OBNBBMBBMBBNBO.",
    ".OBBBBMMMMBBBBO.",
    ".OBbAAAAAAAAbBO.",
    "..ObbAAAAAAbbO..",
    "...OOBBBBBBOO...",
    "..OOOO....OOOO.."
  ];

  /* Flarn — a pocket dragon: two horns, two folded wings. */
  var FLARN = [
    "...OO......OO...",
    "..OOAO....OAOO..",
    "..OOAOOOOOOAOO..",
    ".OBBBBBBBBBBBBO.",
    ".OBWWWBBBBWWWBO.",
    ".OBWKWBBBBWKWBO.",
    ".OBWWWBBBBWWWBO.",
    ".OBNBBMBBMBBNBO.",
    ".OBBBBMMMMBBBBO.",
    "OAaBBBBBBBBBBaAO",
    "OAaBbAAAAAAbBaAO",
    "OAaBbAAAAAAbBaAO",
    ".OOBbAAAAAAbBOO.",
    "...OOBBBBBBOO...",
    "...OBBO..OBBO...",
    "...OOOO..OOOO..."
  ];

  /* Twiggle — a woodland fawn wearing two leaves for ears. */
  var TWIGGLE = [
    "..OO........OO..",
    ".OAaO......OaAO.",
    "..OAO......OAO..",
    "..OOBBBBBBBBOO..",
    ".OBBBBBBBBBBBBO.",
    ".OBWWWBBBBWWWBO.",
    ".OBWKWBBBBWKWBO.",
    ".OBWWWBBBBWWWBO.",
    ".OBNBBMBBMBBNBO.",
    ".OBBBBMMMMBBBBO.",
    ".OBbAAAAAAAAbBO.",
    ".OBbAAAAAAAAbBO.",
    "..ObbAAAAAAbbO..",
    "...OOBBBBBBOO...",
    "...OBBO..OBBO...",
    "...OOOO..OOOO..."
  ];

  /* Puddlepop — pointed kitten ears and a curl of tail. */
  var PUDDLEPOP = [
    "....O......O....",
    "...OAO....OAO...",
    "..OAAOOOOOOAAO..",
    "..OBBBBBBBBBBO..",
    "..OBWWWBBWWWBO..",
    "..OBWKWBBWKWBO..",
    "..OBWWWBBWWWBO..",
    "..OBNBMBBMBNBO..",
    "..OBBBBMMBBBBO..",
    "..OBBBBBBBBBBO..",
    "..OBbAAAAAAbBO..",
    "..OBbAAAAAAbBOOO",
    "..OBbAAAAAAbBOBO",
    "...OOBBBBBBOOBO.",
    "...OBBO..OBBOO..",
    "...OOOO..OOOO..."
  ];

  /* Zibbit — a star frog: wide flat head, webbed feet, huge grin. */
  var ZIBBIT = [
    ".......OO.......",
    "......OAAO......",
    "...OOOAaaAOOO...",
    "....OAOOOOAO....",
    "..OOBBBBBBBBOO..",
    ".OWWWBBBBBBWWWO.",
    ".OWKWBBBBBBWKWO.",
    ".OWWWBBBBBBWWWO.",
    ".OBBBBBBBBBBBBO.",
    ".OBNOMMMMMMONBO.",
    ".OBBOOMMMMOOBBO.",
    ".OBbAAAAAAAAbBO.",
    "..ObbAAAAAAbbO..",
    "...OOBBBBBBOO...",
    "..OBBBO..OBBBO..",
    "..OOOOO..OOOOO.."
  ];

  /* Glimmr — a cloud sprite with a tuft and two sparkle wings. */
  var GLIMMR = [
    ".......OO.......",
    "......OAAO......",
    ".....OOOOOO.....",
    "...OOBBBBBBOO...",
    "..OBBBBBBBBBBO..",
    ".OBBBBBBBBBBBBO.",
    ".OBWWWBBBBWWWBO.",
    ".OBWKWBBBBWKWBO.",
    ".OBWWWBBBBWWWBO.",
    ".OBNBBMBBMBBNBO.",
    ".OBBBBMMMMBBBBO.",
    "..OBbAAAAAAbBO..",
    "...ObbAAAAbbO...",
    "....OBBBBBBO....",
    ".....OBBBBO.....",
    "......OOOO......"
  ];

  /* Every species has a personality: three foods it LOVES (double the
     joy, and it says so) and a favourite place in the valley (a couple
     of extra coins for every right answer there). Reading the card and
     remembering "Snorbits love carrots" is the whole lesson. */
  var SPECIES = [
    { id: "blorb",     name: "Blorb",     grid: BLORB,     blurb: "Round, bouncy and permanently pleased.",
      likes: ["cookie", "cake", "pie"], fav: "pool", trait: "a sweet tooth and a soft spot for puddles" },
    { id: "snorbit",   name: "Snorbit",   grid: SNORBIT,   blurb: "Long ears, quick hops, endless snacking.",
      likes: ["carrot", "apple", "grapes"], fav: "farm", trait: "crunchy things and anything that grows" },
    { id: "flarn",     name: "Flarn",     grid: FLARN,     blurb: "A pocket dragon. Warm, not dangerous.",
      likes: ["pizza", "taco", "curry"], fav: "well", trait: "spicy food and a good long story" },
    { id: "twiggle",   name: "Twiggle",   grid: TWIGGLE,   blurb: "A leafy little fawn from the deep woods.",
      likes: ["salad", "broccoli", "pear"], fav: "well", trait: "green leaves and old words" },
    { id: "puddlepop", name: "Puddlepop", grid: PUDDLEPOP, blurb: "Half kitten, half raindrop, all trouble.",
      likes: ["cheese", "noodles", "sushi"], fav: "pool", trait: "cheese, noodles and splashing about" },
    { id: "zibbit",    name: "Zibbit",    grid: ZIBBIT,    blurb: "A star frog with an enormous grin.",
      likes: ["mushroomcap", "popcorn", "peanuts"], fav: "farm", trait: "little snacks and big skies" },
    { id: "glimmr",    name: "Glimmr",    grid: GLIMMR,    blurb: "A wisp of a sprite that hums when happy.",
      likes: ["candyfloss", "icecream", "cloudfloss"], fav: "well", trait: "fluffy food and a good tune" }
  ];

  /* =========================================================
     THE COLOURS — palette swaps, exactly like a paint brush.
     A palette value can be a colour string OR a function
     (x, y) -> colour, which is how Rainbow and Starry work.
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
      pal: { O: "#6b4a00", B: gradientY("#ffe9a0", "#e0a41f"), b: "#c8871a", L: "#fff6d0", A: "#fff0b8", a: "#e8b93a" } },
    { id: "rainbow", name: "Rainbow",    swatch: "linear-gradient(90deg,#ff5d6c,#ffd863,#6fdc8c,#57c4ff,#8a5cff)", cost: 500,
      pal: { O: "#3a2b52", B: rainbowRows(0), b: rainbowRows(-18), L: rainbowRows(22), A: "#fffdf5", a: "#e9e2ff" } },
    { id: "starry", name: "Starry Night", swatch: "linear-gradient(140deg,#1b2559,#4b3f9e)", cost: 500,
      pal: { O: "#0a0f2b", B: starry("#26306e", "#8ea2ff"), b: "#1a2150", L: "#5b6bd6", A: "#111a44", a: "#0d1436" } },
    { id: "shadow", name: "Shadow",      swatch: "linear-gradient(140deg,#3a3350,#6b6390)", cost: 500,
      pal: { O: "#241f36", B: "#5a5378", b: "#443d63", L: "#7a72a0", A: "#6f6796", a: "#57507c" } }
  ];

  /* Fixed features that never change with the paint brush. */
  var FIXED = { W: "#ffffff", K: "#241f36", M: "#3a2036", N: "#ff9db5" };

  function gradientY(top, bottom) {
    return function (x, y, w, h) { return mix(top, bottom, h > 1 ? y / (h - 1) : 0); };
  }
  function rainbowRows(shift) {
    return function (x, y, w, h) {
      var c = RAINBOW[y % RAINBOW.length];
      return shift ? shade(c, shift) : c;
    };
  }
  function starry(base, star) {
    // a deterministic sprinkle of stars — same pet, same sky, every time
    return function (x, y) { return ((x * 7 + y * 13 + x * y * 3) % 11 === 0) ? star : base; };
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
     BAKING — grid -> canvas
     ========================================================= */
  var cache = {};

  /* Closed eyes for the blink frame: every W/K pixel becomes body,
     and the lowest eye row gets a dark line drawn across it. */
  function blinkGrid(rows) {
    var eyeRows = [];
    rows.forEach(function (r, i) { if (/[WK]/.test(r)) eyeRows.push(i); });
    var lastEye = eyeRows.length ? eyeRows[eyeRows.length - 1] : -1;
    return rows.map(function (row, i) {
      if (!/[WK]/.test(row)) return row;
      var out = "";
      for (var x = 0; x < row.length; x++) {
        var ch = row[x];
        if (ch === "W" || ch === "K") out += (i === lastEye ? "O" : "B");
        else out += ch;
      }
      return out;
    });
  }

  /* A sleepy frame: closed eyes AND a smaller, softer mouth. */
  function sleepGrid(rows) {
    return blinkGrid(rows).map(function (row) { return row.replace(/MM/g, "BB").replace(/M/g, "B"); });
  }

  /* A walking frame: the left foot lifts (its outline row goes, the
     foot row above it becomes ground-shadow-free), so alternating
     idle/walk reads as a trot. Works on any creature whose feet are
     the last two rows, which is all of them. */
  function walkGrid(rows) {
    var out = rows.slice();
    var last = out.length - 1, above = last - 1;
    var m = /^(\.*)(O+)(\.+)(O+)(\.*)$/.exec(out[last]);   // two separate feet on the floor row
    if (!m) return out;
    var lx = m[1].length, lw = m[2].length;
    // lift the left foot one row: clear it from the floor row, and turn
    // the row above it into the foot (so it looks raised, not missing)
    out[last] = m[1] + repeat(".", lw) + m[3] + m[4] + m[5];
    var ab = out[above].split("");
    for (var x = lx; x < lx + lw; x++) if (ab[x] !== undefined && ab[x] !== ".") ab[x] = "O";
    out[above] = ab.join("");
    return out;
  }
  /* A happy frame: each eye becomes a closed, smiling arch (^ ^). */
  function happyGrid(rows) {
    var eyeRows = [];
    rows.forEach(function (r, i) { if (/[WK]/.test(r)) eyeRows.push(i); });
    if (eyeRows.length < 2) return rows;
    var top = eyeRows[0];
    return rows.map(function (row, i) {
      if (!/[WK]/.test(row)) return row;
      var out = "", inEye = 0;
      for (var x = 0; x < row.length; x++) {
        var ch = row[x];
        if (ch === "W" || ch === "K") {
          var col = (row[x - 1] === "W" || row[x - 1] === "K") ? inEye + 1 : 0;   // 0,1,2 across the eye
          inEye = col;
          var arch = (i === top && col === 1) || (i === top + 1 && col !== 1);
          out += arch ? "O" : "B";
        } else { out += ch; inEye = 0; }
      }
      return out;
    });
  }
  function repeat(ch, n) { var s = ""; while (n-- > 0) s += ch; return s; }

  /* Scale2x (a.k.a. EPX): doubles a grid while rounding off the
     staircase corners, so a 16-pixel creature bakes as a 32-pixel one
     with the same silhouette and no new art. Compares characters, not
     colours, so a palette function still sees the ORIGINAL grid. */
  function scale2x(rows) {
    var h = rows.length, w = 0, i;
    for (i = 0; i < h; i++) if (rows[i].length > w) w = rows[i].length;
    function at(x, y) {
      if (x < 0 || y < 0 || y >= h || x >= rows[y].length) return ".";
      return rows[y][x];
    }
    var out = [];
    for (var y = 0; y < h; y++) {
      var r1 = "", r2 = "";
      for (var x = 0; x < w; x++) {
        var P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
        var p1 = P, p2 = P, p3 = P, p4 = P;
        if (C === A && C !== D && A !== B) p1 = A;
        if (A === B && A !== C && B !== D) p2 = B;
        if (D === C && D !== B && C !== A) p3 = C;
        if (B === D && B !== A && D !== C) p4 = D;
        r1 += p1 + p2; r2 += p3 + p4;
      }
      out.push(r1, r2);
    }
    return out;
  }

  /* Paint a grid into a fresh canvas. `scale` is the size of ONE grid
     cell in device pixels; the picture is smoothed with Scale2x so each
     cell is really a 2x2 of half-size pixels. Odd scales can't halve
     cleanly, so they bake at 1px per sub-cell and stretch (nearest
     neighbour) — the same thing the CSS does to every chip anyway. */
  function bake(rows, pal, scale, opts) {
    var w = 0, i;
    for (i = 0; i < rows.length; i++) if (rows[i].length > w) w = rows[i].length;
    var h = rows.length;
    var smooth = !(opts && opts.raw) && scale >= 2;
    var grid = smooth ? scale2x(rows) : rows;
    var div = smooth ? 2 : 1;                       // sub-cells per cell
    var exact = !smooth || scale % 2 === 0;
    var unit = exact ? scale / div : 1;             // device px per sub-cell
    var cv = document.createElement("canvas");
    cv.width = exact ? w * scale : w * div;
    cv.height = exact ? h * scale : h * div;
    var g = cv.getContext("2d");
    for (var y = 0; y < grid.length; y++) {
      var row = grid[y];
      for (var x = 0; x < row.length; x++) {
        var ch = row[x];
        var col = FIXED[ch] !== undefined ? FIXED[ch] : pal[ch];
        if (col === undefined) continue;              // "." and unknown = transparent
        if (typeof col === "function") col = col(Math.floor(x / div), Math.floor(y / div), w, h);
        g.fillStyle = col;
        g.fillRect(x * unit, y * unit, unit, unit);
      }
    }
    if (!exact) {
      var big = document.createElement("canvas");
      big.width = w * scale;
      big.height = h * scale;
      var gg = big.getContext("2d");
      gg.imageSmoothingEnabled = false;
      gg.drawImage(cv, 0, 0, big.width, big.height);
      cv = big;
    }
    cv.pxW = w;
    cv.pxH = h;
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

  /* Returns a baked canvas for one species+colour+frame, cached. */
  function sprite(speciesId, colourId, frame, scale) {
    scale = scale || 8;
    var key = speciesId + "|" + colourId + "|" + frame + "|" + scale;
    if (cache[key]) return cache[key];
    var sp = species(speciesId);
    var rows = sp.grid;
    if (frame === "blink") rows = blinkGrid(rows);
    else if (frame === "sleep") rows = sleepGrid(rows);
    else if (frame === "walk") rows = walkGrid(rows);
    else if (frame === "happy") rows = happyGrid(rows);
    else if (frame === "happywalk") rows = walkGrid(happyGrid(rows));
    var cv = bake(rows, colour(colourId).pal, scale);
    cache[key] = cv;
    return cv;
  }

  /* ---- accessories earned by levelling up ---- */
  var TIARA = [
    ".O.O.O.",
    "OYYYYYO",
    "OOOOOOO"
  ];
  var CROWN = [
    "O.O.O.O.O",
    "OYYYYYYYO",
    "OYGYRYGYO",
    "OOOOOOOOO"
  ];
  var ACC_PAL = { R: "#ff5d6c", r: "#d63f52", O: "#3a2036", Y: "#ffd863", G: "#6fdc8c" };

  function accessory(kind, scale) {
    var key = "acc|" + kind + "|" + scale;
    if (cache[key]) return cache[key];
    var cv = bake(kind === "crown" ? CROWN : TIARA, ACC_PAL, scale);
    cache[key] = cv;
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

     Head things are pixel grids, anchored just above the eyes,
     the same way the level-up tiara is. Face and neck things
     are drawn from the creature's own grid instead — every
     species has its eyes and its belly in a different place,
     and glasses that miss the eyes are not glasses.
     ========================================================= */
  var WEAR = [
    /* --- hats: the bottom row sits just above the eyes --- */
    { id: "partyhat", name: "Party Hat", emoji: "🥳", cost: 40, slot: "head",
      pal: { S: "#ffd863", P: "#ff5d8f", Y: "#ffd863", O: "#7a1f2c" },
      grid: ["...S...", "..OPO..", "..OYO..", ".OPPPO.", ".OYYYO.", "OOOOOOO"] },
    { id: "bow", name: "Big Bow", emoji: "🎀", cost: 30, slot: "head", dx: 3,
      pal: { P: "#ff6ec7", p: "#e560ae", O: "#77234f" },
      grid: ["OO...OO", "OPPOPPO", "OPPpPPO", "OPPOPPO", "OO...OO"] },
    { id: "flowercrown", name: "Flower Crown", emoji: "🌸", cost: 45, slot: "head",
      pal: { P: "#ff8fd0", Y: "#ffd863", G: "#3fb469" },
      grid: ["P.Y.P.Y.P", "GGGGGGGGG", ".G.G.G.G."] },
    { id: "beanie", name: "Bobble Hat", emoji: "🧢", cost: 35, slot: "head",
      pal: { B: "#57c4ff", W: "#ffffff", O: "#14496b" },
      grid: ["...OWO...", "..OBBBO..", ".OBBBBBO.", ".OBWBWBO.", "OBBBBBBBO"] },
    { id: "chef", name: "Chef's Hat", emoji: "👨‍🍳", cost: 50, slot: "head",
      pal: { W: "#ffffff", O: "#8a8fa8" },
      grid: [".OWWWWWO.", "OWWWWWWWO", "OWWWWWWWO", ".OWWWWWO.", ".OOOOOOO."] },
    { id: "helmet", name: "Miner's Helmet", emoji: "⛏️", cost: 60, slot: "head",
      pal: { Y: "#ffd166", W: "#ffffff", O: "#6d4a06" },
      grid: ["...OOO...", "..OYYYO..", ".OYYWYYO.", ".OYYYYYO.", "OYYYYYYYO"] },
    { id: "cowboy", name: "Cowboy Hat", emoji: "🤠", cost: 60, slot: "head",
      pal: { C: "#c99a6b", D: "#7a4a1f", O: "#4a3018" },
      grid: ["...OOOOO...", "...OCCCO...", "...OCCCO...", "OOOOCDCOOOO", "OCCCCCCCCCO", ".OOOOOOOOO."] },
    { id: "tophat", name: "Top Hat", emoji: "🎩", cost: 70, slot: "head",
      pal: { K: "#2b2440", R: "#ff5d6c", O: "#111018" },
      grid: [".OOOOO.", ".OKKKO.", ".OKKKO.", ".ORRRO.", "OOOOOOO"] },
    { id: "bunnyears", name: "Bunny Ears", emoji: "🐰", cost: 45, slot: "head",
      pal: { W: "#ffffff", P: "#ffb3d9", O: "#7a5a6a" },
      grid: ["OWO.....OWO", "OWPO...OPWO", "OWPO...OPWO", "OWPO...OPWO", ".OWO...OWO.", "..OOOOOOO.."] },
    { id: "pirate", name: "Pirate Hat", emoji: "🏴‍☠️", cost: 80, slot: "head",
      pal: { K: "#2b2440", W: "#ffffff", O: "#111018" },
      grid: ["O.........O", "OKO.....OKO", ".OKKKWKKKO.", ".OKKWWWKKO.", "OOOOOOOOOOO"] },
    { id: "wizard", name: "Wizard Hat", emoji: "🧙", cost: 90, slot: "head",
      pal: { B: "#5b3fa8", S: "#ffd863", O: "#2b1a5e" },
      grid: ["....OO...", "...OBBO..", "...OBSO..", "..OBBBBO.", "..OSBBBO.", "OBBBBBBBO"] },
    { id: "princess", name: "Princess Tiara", emoji: "👸", cost: 120, slot: "head",
      pal: { P: "#ff8fd0", G: "#9bf6ff", O: "#77234f" },
      grid: ["P...P...P", "OP.OPO.PO", "OPPPPPPPO", ".OGOGOGO."] },
    { id: "halo", name: "Golden Halo", emoji: "😇", cost: 150, slot: "head", dy: 1, rare: true,
      pal: { Y: "#ffe27a", O: "#d9a300" },
      grid: [".OYYYYYO.", "OY.....YO", ".OYYYYYO."] },
    { id: "starcrown", name: "Crown of Stars", emoji: "🌟", cost: 200, slot: "head", rare: true,
      pal: { S: "#ffe27a", Y: "#ffd166", O: "#6d4a06" },
      grid: ["S...S...S", "OSOOSOOSO", "OYYYYYYYO", ".OOOOOOO."] },
    /* --- the seasonal ones: on the shelf in their season, a present on the day --- */
    { id: "santahat", name: "Santa Hat", emoji: "🎅", cost: 50, slot: "head", season: "winter",
      pal: { R: "#e8384f", r: "#b8323f", W: "#ffffff", O: "#7a1f2c" },
      grid: [".......OWO", "......OWWO", "....OORRO.", "...ORRRRO.", "..ORRrRRO.", ".ORRRRRRO.", "OWWWWWWWWO"] },
    { id: "pumpkinhat", name: "Pumpkin Hat", emoji: "🎃", cost: 50, slot: "head", season: "autumn",
      pal: { P: "#ff8c1a", p: "#d9701a", G: "#3fb469", K: "#241f36", O: "#7a4010" },
      grid: ["....OGO....", "..OOOGOOO..", ".OPPpPpPPO.", "OPKPPPPPKPO", "OPPPKKKPPPO", ".OPpPPPpPO.", "..OOOOOOO.."] },

    /* --- glasses: drawn around wherever THIS creature's eyes are --- */
    { id: "glasses", name: "Round Glasses", emoji: "👓", cost: 40, slot: "face", style: "round", colour: "#2b2440" },
    { id: "sunglasses", name: "Sunglasses", emoji: "🕶️", cost: 55, slot: "face", style: "shades", colour: "#111018", lens: "#241f36" },
    { id: "heartglasses", name: "Heart Glasses", emoji: "💕", cost: 60, slot: "face", style: "round", colour: "#ff5d8f" },
    { id: "starglasses", name: "Star Glasses", emoji: "🤩", cost: 90, slot: "face", style: "round", colour: "#ffd166", rare: true },

    /* --- round the neck: drawn across the top of the belly --- */
    { id: "scarf", name: "Cosy Scarf", emoji: "🧣", cost: 35, slot: "neck", style: "scarf", colour: "#ff5d6c", dark: "#b8323f" },
    { id: "bluescarf", name: "Sky Scarf", emoji: "🧣", cost: 35, slot: "neck", style: "scarf", colour: "#57c4ff", dark: "#2f9fe0" },
    { id: "bowtie", name: "Bow Tie", emoji: "🎀", cost: 45, slot: "neck", style: "bowtie", colour: "#8a5cff", dark: "#5b3fa8" },
    { id: "pearls", name: "Pearl Necklace", emoji: "📿", cost: 60, slot: "neck", style: "pearls", colour: "#fff6f0", dark: "#c9c0d6" },
    { id: "medal", name: "Gold Medal", emoji: "🏅", cost: 80, slot: "neck", style: "medal", colour: "#ffd166", dark: "#ff5d6c" }
  ];
  var SLOTS = ["head", "face", "neck"];

  /* =========================================================
     THE EGG — what a Craepet is before it is a Craepet.
     Painted in the colour you chose, with spots in the accent
     colour, so a Berry Red egg hatches a Berry Red Blorb. It
     cracks in two stages as the hatching gets close.
     ========================================================= */
  var EGG = [
    "................",
    "......OOOO......",
    "....OOBBBBOO....",
    "...OBBLBBBBBO...",
    "..OBBLBBBABBBO..",
    "..OBBBBBBBBABO..",
    ".OBBABBBBBBBBBO.",
    ".OBBBBBBBBBBABO.",
    ".OBBBBBABBBBBBO.",
    ".OBBABBBBBBBBBO.",
    ".OBBBBBBBBABBBO.",
    "..OBBBBABBBBBO..",
    "..ObbBBBBBBbbO..",
    "...ObbbbbbbbO...",
    "....OObbbbOO....",
    "......OOOO......"
  ];
  /* The cracks, as cells to paint: first a hairline, then a gap. */
  var CRACK1 = [[7, 6], [8, 7], [7, 8], [8, 9], [9, 10]];
  var CRACK2 = CRACK1.concat([[6, 5], [9, 8], [10, 9], [6, 7], [5, 8], [10, 11], [9, 12]]);
  function eggGrid(crack) {
    if (!crack) return EGG;
    var cells = crack >= 2 ? CRACK2 : CRACK1;
    var rows = EGG.map(function (r) { return r.split(""); });
    cells.forEach(function (c) { if (rows[c[1]] && rows[c[1]][c[0]] !== ".") rows[c[1]][c[0]] = crack >= 2 && CRACK1.indexOf(c) === -1 ? "W" : "O"; });
    return rows.map(function (r) { return r.join(""); });
  }
  function eggSprite(colourId, crack, scale) {
    var key = "egg|" + colourId + "|" + crack + "|" + scale;
    if (cache[key]) return cache[key];
    var pal = colour(colourId).pal;
    var cv = bake(eggGrid(crack), { O: pal.O, B: pal.B, b: pal.b, L: pal.L, A: pal.A, W: "#fff" }, scale);
    cache[key] = cv;
    return cv;
  }
  /* Draw the egg where the pet would stand. opts: { scale, cx, bob, tilt (radians), crack } */
  function drawEgg(canvas, colourId, opts) {
    opts = opts || {};
    var g = canvas.getContext("2d");
    var scale = opts.scale || 8;
    var sp = eggSprite(colourId, opts.crack | 0, scale);
    var cx = (opts.cx === undefined || opts.cx === null) ? canvas.width / 2 : opts.cx;
    var x = Math.round(cx - sp.width / 2);
    var y = Math.round(canvas.height - sp.height - scale) + (opts.bob || 0);
    g.imageSmoothingEnabled = false;
    if (!opts.keep) g.clearRect(0, 0, canvas.width, canvas.height);
    g.globalAlpha = 0.18; g.fillStyle = "#2b2440";
    g.beginPath(); g.ellipse(cx, canvas.height - scale * 0.4, sp.width * 0.34, scale * 1.2, 0, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;
    g.save();
    // rock about the bottom of the egg
    g.translate(cx, canvas.height - scale);
    g.rotate(opts.tilt || 0);
    g.drawImage(sp, x - cx, y - (canvas.height - scale));
    g.restore();
  }
  function eggChip(colourId, px, crack) {
    var scale = Math.max(1, Math.round((px || 48) / 16));
    return eggSprite(colourId, crack | 0, scale).toDataURL();
  }

  /* =========================================================
     PETPETS — a pet for your pet.

     Tiny companions, eight pixels wide, that trot along behind
     the Craepet wherever it wanders, each with a name of its
     own. Bought at the Market's 🐾 shelf, kept for ever, one out
     at a time. Their palettes are their own — a duckling is
     yellow whatever colour the Craepet is.
     ========================================================= */
  var PETPETS = [
    { id: "duckling", name: "Duckling", emoji: "🐥", cost: 60, blurb: "Follows anything bigger than itself.",
      pal: { O: "#7a5a06", B: "#ffe066", b: "#f0c93a", A: "#ff9f45", W: "#fff", K: "#241f36" },
      grid: ["..OOO...", ".OBBBO..", "OBWKBBOA", "OBBBBBO.", ".OBbBBO.", "OBBBBBBO", ".OOOOOO.", "..OA.OA."] },
    { id: "snail", name: "Snail", emoji: "🐌", cost: 45, blurb: "Slow, but never left behind for long.",
      pal: { O: "#4a3018", B: "#c99a6b", b: "#a2764a", A: "#ff8fd0", a: "#e560ae", W: "#fff", K: "#241f36" },
      grid: ["......OO", "...OOOOK", "..OAaAOO", ".OAaAaAO", ".OAAaAAO", "OBOAaAOB", "OBBOOOBB", ".OOOOOOO"] },
    { id: "blobbin", name: "Blobbin", emoji: "🟢", cost: 50, blurb: "A drop of something green and friendly.",
      pal: { O: "#14522f", B: "#6fdc8c", b: "#3fb469", W: "#fff", K: "#241f36" },
      grid: ["........", "...OO...", "..OBBO..", ".OBBBBO.", "OBWKBWKO", "OBBBBBBO", "OBbBBbBO", ".OOOOOO."] },
    { id: "moth", name: "Moth", emoji: "🦋", cost: 55, blurb: "Flutters. Loves a lamp.",
      pal: { O: "#38215e", B: "#a97dff", b: "#8a5cff", A: "#ffd863", W: "#fff", K: "#241f36" },
      grid: ["O......O", "OBO..OBO", "OBBOOBBO", ".OBAABO.", ".OBAABO.", "OBbOObBO", "OO....OO", "........"] },
    { id: "kit", name: "Kit", emoji: "🐱", cost: 70, blurb: "A pocket kitten. Purrs at a level 5.",
      pal: { O: "#4a3018", B: "#f4b16f", b: "#d9924f", A: "#ffd7db", W: "#fff", K: "#241f36" },
      grid: ["O.....O.", "OO...OO.", "OBBBBBO.", "OWKBWKO.", "OBBBBBOO", ".OBBBBOB", ".OBbBbOO", ".OO.OO.."] },
    { id: "hedge", name: "Hedgehog", emoji: "🦔", cost: 65, blurb: "Prickly outside, soft inside.",
      pal: { O: "#3a2a1a", B: "#8a6a4a", b: "#5a4030", A: "#f4d3b0", W: "#fff", K: "#241f36" },
      grid: ["...bObOb", "..bObObO", ".ObBBBBB", "OBBBBBBB", "OAWKABBB", "OAAAABBB", ".OAOOBBO", "..OO.OO."] },
    { id: "wisp", name: "Wisp", emoji: "👻", cost: 90, rare: true, blurb: "Glows in the dark. Not scary. Mostly.",
      pal: { O: "#5b6bd6", B: "#dfe6ff", b: "#b9c6ff", W: "#fff", K: "#3a2b52" },
      grid: ["...OO...", "..OBBO..", ".OBBBBO.", ".OWKWKO.", ".OBBBBO.", ".OBbBbO.", ".OBBBBO.", ".O.OO.O."] },
    { id: "starling", name: "Starling", emoji: "⭐", cost: 120, rare: true, blurb: "A fallen star that decided to stay.",
      pal: { O: "#8a6200", B: "#ffe27a", b: "#ffc93d", W: "#fff", K: "#241f36" },
      grid: ["...OO...", "...OBO..", "OOOOBBOO", ".OBBBBBO", "..OWKBO.", "..OBBBBO", ".OBOOOBO", "OO.....O"] }
  ];
  function petpetById(id) {
    for (var i = 0; i < PETPETS.length; i++) if (PETPETS[i].id === id) return PETPETS[i];
    return null;
  }
  function petpetSprite(item, scale) {
    var key = "pp|" + item.id + "|" + scale;
    if (cache[key]) return cache[key];
    var cv = bake(item.grid, item.pal, scale);
    cache[key] = cv;
    return cv;
  }
  /* Draw a petpet standing on the same floor, its middle at cx. */
  function drawPetpet(canvas, id, opts) {
    var it = petpetById(id);
    if (!it) return;
    opts = opts || {};
    var g = canvas.getContext("2d");
    var scale = opts.scale || 4;
    var sp = petpetSprite(it, scale);
    var cx = opts.cx === undefined ? canvas.width / 2 : opts.cx;
    var x = Math.round(cx - sp.width / 2);
    var y = Math.round(canvas.height - sp.height - scale) + (opts.bob || 0);
    g.imageSmoothingEnabled = false;
    g.globalAlpha = 0.16;
    g.fillStyle = "#2b2440";
    g.beginPath();
    g.ellipse(cx, canvas.height - scale * 0.4, sp.width * 0.4, scale * 0.9, 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
    g.save();
    if (opts.flip) { g.translate(2 * cx, 0); g.scale(-1, 1); }
    g.drawImage(sp, x, y);
    g.restore();
  }
  /* A small picture of a petpet for a shop shelf or a card. */
  function petpetChip(id, px) {
    var it = petpetById(id);
    if (!it) return "";
    var scale = Math.max(1, Math.round((px || 40) / 8));
    return petpetSprite(it, scale).toDataURL();
  }

  function wearById(id) {
    for (var i = 0; i < WEAR.length; i++) if (WEAR[i].id === id) return WEAR[i];
    return null;
  }

  function hatSprite(item, scale) {
    var key = "wear|" + item.id + "|" + scale;
    if (cache[key]) return cache[key];
    var cv = bake(item.grid, item.pal, scale);
    cache[key] = cv;
    return cv;
  }

  /* Where the eyes are on this creature: the row they start on and the
     first column of each eye, read off the grid. */
  function eyeSpots(sp) {
    var row = eyeTop(sp), line = sp.grid[row] || "";
    var runs = [], inRun = false;
    for (var x = 0; x < line.length; x++) {
      if (line[x] === "W" && !inRun) { runs.push(x); inRun = true; }
      if (line[x] !== "W") inRun = false;
    }
    return { row: row, eyes: runs };
  }
  /* The top of the belly: the first accent row under the mouth. That is
     where a scarf goes on every creature, whatever shape it is. */
  function bellyTop(sp) {
    var g = sp.grid, lastMouth = rowOf(g, /M/, true);
    for (var i = lastMouth + 1; i < g.length; i++) if (/A/.test(g[i])) return i;
    return lastMouth + 1;
  }
  /* The body's left and right edge on one row, inside the outline. */
  function bodySpan(sp, row) {
    var line = sp.grid[row] || "";
    var l = -1, r = -1;
    for (var x = 0; x < line.length; x++) {
      if (line[x] !== ".") { if (l < 0) l = x; r = x; }
    }
    return l < 0 ? null : { l: l + 1, r: r - 1 };
  }

  function px(g, x, y, s, col) {
    g.fillStyle = col;
    g.fillRect(Math.round(x), Math.round(y), s, s);
  }

  function drawFace(g, sp, item, ox, oy, s) {
    var e = eyeSpots(sp);
    if (!e.eyes.length) return;
    var col = item.colour;
    e.eyes.forEach(function (ex) {
      // a ring one pixel outside the 3×3 eye
      for (var dx = -1; dx <= 3; dx++) {
        px(g, ox + (ex + dx) * s, oy + (e.row - 1) * s, s, col);
        px(g, ox + (ex + dx) * s, oy + (e.row + 3) * s, s, col);
      }
      for (var dy = 0; dy <= 2; dy++) {
        px(g, ox + (ex - 1) * s, oy + (e.row + dy) * s, s, col);
        px(g, ox + (ex + 3) * s, oy + (e.row + dy) * s, s, col);
      }
      if (item.style === "shades") {
        for (var yy = 0; yy <= 2; yy++) for (var xx = 0; xx <= 2; xx++) {
          px(g, ox + (ex + xx) * s, oy + (e.row + yy) * s, s, item.lens);
        }
        px(g, ox + ex * s, oy + e.row * s, s, "#8f88b0");   // a glint
      }
    });
    // the bridge between the two lenses
    if (e.eyes.length >= 2) {
      var a = e.eyes[0] + 4, b = e.eyes[e.eyes.length - 1] - 2;
      for (var bx = a; bx <= b; bx++) px(g, ox + bx * s, oy + (e.row + 1) * s, s, col);
    }
  }

  function drawNeck(g, sp, item, ox, oy, s) {
    var row = bellyTop(sp), span = bodySpan(sp, row);
    if (!span) return;
    var mid = Math.floor((span.l + span.r) / 2);
    var x;
    if (item.style === "scarf") {
      for (x = span.l; x <= span.r; x++) px(g, ox + x * s, oy + row * s, s, (x % 3 === 1) ? item.dark : item.colour);
      // a tail hanging down on one side
      px(g, ox + (span.l + 1) * s, oy + (row + 1) * s, s, item.colour);
      px(g, ox + (span.l + 1) * s, oy + (row + 2) * s, s, item.dark);
      px(g, ox + (span.l + 2) * s, oy + (row + 1) * s, s, item.dark);
    } else if (item.style === "bowtie") {
      var bt = ["PP.PP", "PPDPP", "PP.PP"];
      for (var yy = 0; yy < 3; yy++) for (var xx = 0; xx < 5; xx++) {
        var ch = bt[yy][xx];
        if (ch === ".") continue;
        px(g, ox + (mid - 2 + xx) * s, oy + (row + yy) * s, s, ch === "D" ? item.dark : item.colour);
      }
    } else if (item.style === "pearls") {
      for (x = span.l; x <= span.r; x++) {
        var lift = (x === span.l || x === span.r) ? -1 : 0;   // a gentle curve
        px(g, ox + x * s, oy + (row + lift) * s, s, (x % 2) ? item.colour : item.dark);
      }
    } else if (item.style === "medal") {
      for (x = span.l; x <= span.r; x++) px(g, ox + x * s, oy + row * s, s, item.dark);
      var md = [".YY.", "YYYY", "YYYY", ".YY."];
      for (var my = 0; my < 4; my++) for (var mx = 0; mx < 4; mx++) {
        if (md[my][mx] === "Y") px(g, ox + (mid - 1 + mx) * s, oy + (row + 1 + my) * s, s, item.colour);
      }
      px(g, ox + mid * s, oy + (row + 2) * s, s, "#fff3c4");
    }
  }

  /* Everything the pet has on, drawn over the body. `wear` is
     {head, face, neck} of item ids (any may be empty); `level` decides
     the free tiara / crown that shows when nothing is on the head. */
  function drawWear(g, sp, ox, oy, scale, wear, level) {
    wear = wear || {};
    var head = wear.head && wearById(wear.head);
    if (head && head.grid) {
      var hs = hatSprite(head, scale);
      g.drawImage(hs,
        Math.round(ox + (8 + (head.dx || 0)) * scale - hs.width / 2),
        Math.round(oy + (eyeTop(sp) - (head.dy || 0)) * scale - hs.height));
    } else if ((level || 1) >= 5) {
      var acc = accessory(level >= 12 ? "crown" : "tiara", scale);
      g.drawImage(acc,
        Math.round(ox + 8 * scale - acc.width / 2),
        Math.round(oy + eyeTop(sp) * scale - acc.height));
    }
    var face = wear.face && wearById(wear.face);
    if (face) drawFace(g, sp, face, ox, oy, scale);
    var neck = wear.neck && wearById(wear.neck);
    if (neck) drawNeck(g, sp, neck, ox, oy, scale);
  }

  /* =========================================================
     DRAWING a pet into a canvas the page owns.
     opts: { frame, level, scale, bob, wear,
             cx   — where the pet's middle is, in pixels (default: centred),
             flip — true to face left }
     ========================================================= */
  function draw(canvas, speciesId, colourId, opts) {
    opts = opts || {};
    var g = canvas.getContext("2d");
    var scale = opts.scale || Math.max(2, Math.floor(Math.min(canvas.width, canvas.height) / 20));
    var body = sprite(speciesId, colourId, opts.frame || "idle", scale);
    g.imageSmoothingEnabled = false;
    if (!opts.keep) g.clearRect(0, 0, canvas.width, canvas.height);   // keep: draw over a scene

    var bob = opts.bob || 0;
    var cx = (opts.cx === undefined || opts.cx === null) ? canvas.width / 2 : opts.cx;
    var x = Math.round(cx - body.width / 2);
    var y = Math.round(canvas.height - body.height - scale) + bob;

    // a soft shadow so the pet sits on the ground instead of floating
    g.globalAlpha = 0.18;
    g.fillStyle = "#2b2440";
    var sw = body.width * 0.72, sh = scale * 1.4;
    g.beginPath();
    g.ellipse(cx, canvas.height - scale * 0.4, sw / 2, sh / 2, 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;

    // facing left is the same picture mirrored about its own middle
    g.save();
    if (opts.flip) { g.translate(2 * cx, 0); g.scale(-1, 1); }
    g.drawImage(body, x, y);
    // level 5 earns a tiara and level 12 a crown — unless a hat from the
    // wardrobe is on, which sits in the same place
    drawWear(g, species(speciesId), x, y, scale, opts.wear, opts.level || 1);
    g.restore();
    return { x: x, y: y, w: body.width, h: body.height, scale: scale };
  }

  /* How many rows of headroom a chip needs, so a hat is not cropped. */
  function headroom(sp, wear, level) {
    var head = wear && wear.head && wearById(wear.head);
    if (head && head.grid) return Math.max(0, head.grid.length + (head.dy || 0) - eyeTop(sp));
    if ((level || 1) >= 5) return Math.max(0, (level >= 12 ? 4 : 3) - eyeTop(sp));
    return 0;
  }

  /* Anchors read straight off the grid: the crown sits just above the
     eyes, the scarf across the top of the belly. Draw a new creature
     and both land in the right place with no tuning. */
  function rowOf(grid, re, last) {
    var found = -1;
    for (var i = 0; i < grid.length; i++) {
      if (re.test(grid[i])) { found = i; if (!last) return i; }
    }
    return found;
  }
  function eyeTop(sp) { var r = rowOf(sp.grid, /W/, false); return r < 0 ? 4 : r; }

  /* A small square face for chips, buttons and the family board. */
  function chip(speciesId, colourId, pxSize, wear, level) {
    pxSize = pxSize || 48;
    var scale = Math.max(1, Math.round(pxSize / 16));
    var sp = species(speciesId);
    var body = sprite(speciesId, colourId, "idle", scale);
    var top = headroom(sp, wear, level) * scale;
    var cv = document.createElement("canvas");
    cv.width = body.width;
    cv.height = body.height + top;
    var g = cv.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.drawImage(body, 0, top);
    drawWear(g, sp, 0, top, scale, wear, level || 1);
    return cv.toDataURL();
  }

  return {
    SPECIES: SPECIES,
    COLOURS: COLOURS,
    WEAR: WEAR,
    SLOTS: SLOTS,
    PETPETS: PETPETS,
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
