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
    g.clearRect(0, 0, canvas.width, canvas.height);

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
    species: species,
    colour: colour,
    wearById: wearById,
    sprite: sprite,
    draw: draw,
    chip: chip
  };
})();
