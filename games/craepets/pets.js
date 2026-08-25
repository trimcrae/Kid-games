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

  var SPECIES = [
    { id: "blorb",     name: "Blorb",     grid: BLORB,     blurb: "Round, bouncy and permanently pleased." },
    { id: "snorbit",   name: "Snorbit",   grid: SNORBIT,   blurb: "Long ears, quick hops, endless snacking." },
    { id: "flarn",     name: "Flarn",     grid: FLARN,     blurb: "A pocket dragon. Warm, not dangerous." },
    { id: "twiggle",   name: "Twiggle",   grid: TWIGGLE,   blurb: "A leafy little fawn from the deep woods." },
    { id: "puddlepop", name: "Puddlepop", grid: PUDDLEPOP, blurb: "Half kitten, half raindrop, all trouble." },
    { id: "zibbit",    name: "Zibbit",    grid: ZIBBIT,    blurb: "A star frog with an enormous grin." },
    { id: "glimmr",    name: "Glimmr",    grid: GLIMMR,    blurb: "A wisp of a sprite that hums when happy." }
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

  function bake(rows, pal, scale) {
    var w = 0, i;
    for (i = 0; i < rows.length; i++) if (rows[i].length > w) w = rows[i].length;
    var h = rows.length;
    var cv = document.createElement("canvas");
    cv.width = w * scale;
    cv.height = h * scale;
    var g = cv.getContext("2d");
    for (var y = 0; y < h; y++) {
      var row = rows[y];
      for (var x = 0; x < row.length; x++) {
        var ch = row[x];
        var col = FIXED[ch] !== undefined ? FIXED[ch] : pal[ch];
        if (col === undefined) continue;              // "." and unknown = transparent
        if (typeof col === "function") col = col(x, y, w, h);
        g.fillStyle = col;
        g.fillRect(x * scale, y * scale, scale, scale);
      }
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
     DRAWING a pet into a canvas the page owns.
     opts: { frame, level, scale, bob }
     ========================================================= */
  function draw(canvas, speciesId, colourId, opts) {
    opts = opts || {};
    var g = canvas.getContext("2d");
    var scale = opts.scale || Math.max(2, Math.floor(Math.min(canvas.width, canvas.height) / 20));
    var body = sprite(speciesId, colourId, opts.frame || "idle", scale);
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, canvas.width, canvas.height);

    var bob = opts.bob || 0;
    var x = Math.round((canvas.width - body.width) / 2);
    var y = Math.round(canvas.height - body.height - scale) + bob;

    // a soft shadow so the pet sits on the ground instead of floating
    g.globalAlpha = 0.18;
    g.fillStyle = "#2b2440";
    var sw = body.width * 0.72, sh = scale * 1.4;
    g.beginPath();
    g.ellipse(canvas.width / 2, canvas.height - scale * 0.4, sw / 2, sh / 2, 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;

    g.drawImage(body, x, y);

    var level = opts.level || 1;
    var sp = species(speciesId);
    if (level >= 5) {
      // level 5 earns a scarf; level 12 swaps it for a crown
      var acc = accessory(level >= 12 ? "crown" : "tiara", scale);
      g.drawImage(acc,
        Math.round(x + 8 * scale - acc.width / 2),
        Math.round(y + eyeTop(sp) * scale - acc.height));
    }
    return { x: x, y: y, w: body.width, h: body.height, scale: scale };
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
  function chip(speciesId, colourId, px) {
    px = px || 48;
    var scale = Math.max(1, Math.round(px / 16));
    var body = sprite(speciesId, colourId, "idle", scale);
    var cv = document.createElement("canvas");
    cv.width = body.width;
    cv.height = body.height;
    var g = cv.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.drawImage(body, 0, 0);
    return cv.toDataURL();
  }

  return {
    SPECIES: SPECIES,
    COLOURS: COLOURS,
    species: species,
    colour: colour,
    sprite: sprite,
    draw: draw,
    chip: chip
  };
})();
