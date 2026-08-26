/* ===========================================================
   Word Bridge — THE ART.
   -----------------------------------------------------------
   Every sprite in this game is hand-authored here as a pixel
   grid: one character per pixel, looked up in a palette. At
   load, each grid is baked once into an off-screen <canvas>
   that the renderer blits — the same way a real 2D game uses a
   sprite sheet, except the sheet is written down instead of
   drawn in an image editor. Nothing is downloaded and nothing
   is generated: no image files, no emoji, no dependencies.

   Because colour is just a palette lookup, the SAME grid can
   be baked several times with different palettes — that's how
   the three kids share one body, and how the bridge skins in
   the shop are made (classic palette swapping).

       WBSprites.get("hero.jeannie.walk")  -> [canvas, canvas, …]
       WBSprites.get("plank.candy")        -> canvas

   Grid legend (used by everything below):
       .  transparent      O  outline
       H/h hair + shade    S  skin        C/c clothes + shade
       P/p pack + strap    B  boot        W  white
       M  metal      m  metal shade   V  visor    R  red
       G/g green + shade   Y  yellow     T  trunk/wood dark
   =========================================================== */
window.WBSprites = (function () {
  "use strict";

  /* ---------- bake a grid into a canvas ---------- */
  function bake(rows, palette, scale) {
    scale = scale || 1;
    var w = 0, i;
    for (i = 0; i < rows.length; i++) if (rows[i].length > w) w = rows[i].length;
    var c = document.createElement("canvas");
    c.width = w * scale;
    c.height = rows.length * scale;
    var g = c.getContext("2d");
    for (var y = 0; y < rows.length; y++) {
      var row = rows[y];
      for (var x = 0; x < row.length; x++) {
        var col = palette[row[x]];
        if (!col) continue;
        g.fillStyle = col;
        g.fillRect(x * scale, y * scale, scale, scale);
      }
    }
    c.pxW = w;
    c.pxH = rows.length;
    return c;
  }

  /* =========================================================
     THE KIDS — back view, walking away from the camera down
     the bridge. The body is drawn once; only the legs change
     per frame, which is all a walk cycle needs at this size.
     ========================================================= */
  var HERO_BODY = [
    "....OOOOOOOO....",
    "..OOHHHHHHHHOO..",
    ".OHHHHHHHHHHHHO.",
    ".OHHHHHHHHHHHHO.",
    ".OHHHHHHHHHHHHO.",
    ".OSHHHHHHHHHHSO.",
    ".OhHHHHHHHHHHhO.",
    "..OHHHHHHHHHHO..",
    "...OSSSSSSSSO...",
    "..OCCCCCCCCCCO..",
    ".OCCPPPPPPPPCCO.",
    ".OCCPppppppPCCO.",
    ".OCCPPPPPPPPCCO.",
    ".OCCPPPPPPPPCCO.",
    "..OCCCCCCCCCCO..",
    "..OccccccccccO.."
  ];

  // four rows of legs, three poses: stride, together, stride (other foot)
  var HERO_LEGS = [
    [ // left foot forward
      "..OSSO....OSSO..",
      "..OSSO....OSSO..",
      ".OBBBO....OBBO..",
      ".OOOOO....OOOO.."
    ],
    [ // passing
      "...OSSO..OSSO...",
      "...OSSO..OSSO...",
      "...OBBO..OBBO...",
      "...OOOO..OOOO..."
    ],
    [ // right foot forward
      "..OSSO....OSSO..",
      "..OSSO....OSSO..",
      "..OBBO....OBBBO.",
      "..OOOO....OOOOO."
    ]
  ];

  // little bits that sit on top of the head
  var HATS = {
    crown: [
      ".Y..Y..Y..Y.",
      ".YYYYYYYYYY.",
      ".YYWYYYYWYY.",
      "..YYYYYYYY.."
    ],
    cap: [
      "..GGGGGGGG..",
      ".GGGGGGGGGG.",
      "GGGGGGGGGGGG",
      "gggggggggggg"
    ],
    band: [
      "............",
      "..RRRRRRRR..",
      ".RRRRRRRRRR.",
      "..RRRRRRRR.."
    ],
    // a hair bun, seen from behind — grown-ups get one too
    bun: [
      "....OOOO....",
      "...OHHHHO...",
      "...OHHHHO...",
      "....OOOO...."
    ]
  };

  var KID_PALETTES = {
    jeannie: { O: "#2b2440", H: "#8a5230", h: "#6d3f24", S: "#f6c9a0",
               C: "#2fb0a0", c: "#23887c", P: "#e8544a", p: "#b93c34",
               B: "#5a3a22", W: "#ffffff", R: "#e8544a", Y: "#ffcf3f", G: "#3aa84a", g: "#2c7d38" },
    cory:    { O: "#2b2440", H: "#3b2a1c", h: "#2a1d13", S: "#f2c39a",
               C: "#2b8cff", c: "#1f6cc9", P: "#8a5a33", p: "#6b4527",
               B: "#3d3a45", W: "#ffffff", R: "#e8544a", Y: "#ffcf3f", G: "#3aa84a", g: "#2c7d38" },
    ellie:   { O: "#2b2440", H: "#f5d06b", h: "#d9ad42", S: "#f9d3b0",
               C: "#ff6fa5", c: "#d94f83", P: "#9b6bff", p: "#7a4fd6",
               B: "#c94f86", W: "#ffffff", R: "#e8544a", Y: "#ffcf3f", G: "#3aa84a", g: "#2c7d38" },
    // Mum plays too — same body, her own colours and a hair bun.
    shannon: { O: "#2b2440", H: "#5d3a26", h: "#42281a", S: "#f4c8a2",
               C: "#12a594", c: "#0d7d70", P: "#f2a03d", p: "#c97c26",
               B: "#4a4455", W: "#ffffff", R: "#e8544a", Y: "#ffcf3f", G: "#3aa84a", g: "#2c7d38" }
  };

  var KID_HATS = { jeannie: "band", cory: "cap", ellie: "crown", shannon: "bun" };

  function heroFrames(kidId) {
    var pal = KID_PALETTES[kidId] || KID_PALETTES.jeannie;
    var hat = HATS[KID_HATS[kidId]];
    return HERO_LEGS.map(function (legs) {
      var rows = HERO_BODY.concat(legs);
      var c = bake(rows, pal);
      if (hat) {                       // sit the hat on the head
        var h = bake(hat, pal);
        c.getContext("2d").drawImage(h, 2, 0);
      }
      return c;
    });
  }

  /* =========================================================
     THE RIVAL — a little robot that trundles on treads.
     ========================================================= */
  var BOT_BODY = [
    ".......OO.......",
    "......OYYO......",
    ".......OO.......",
    "...OOOOOOOO.....",
    "..OMMMMMMMMO....",
    "..OMVVVVVVMO....",
    "..OMVWVVWVMO....",
    "..OMVVVVVVMO....",
    "..OMMMMMMMMO....",
    "...OOOOOOOO.....",
    "..OMMMMMMMMO....",
    ".OMMmRRRRmMMO...",
    ".OMMmRRRRmMMO...",
    ".OMMMMMMMMMMO...",
    "..OMMMMMMMMO....",
    "...OMMMMMMO....."
  ];

  var BOT_TREADS = [
    [
      "..OOOOOOOOOO....",
      ".OmMmMmMmMmMO...",
      ".OMmMmMmMmMmO...",
      "..OOOOOOOOOO...."
    ],
    [
      "..OOOOOOOOOO....",
      ".OMmMmMmMmMmO...",
      ".OmMmMmMmMmMO...",
      "..OOOOOOOOOO...."
    ]
  ];

  var BOT_PALETTE = {
    O: "#2b2440", M: "#b9c3cc", m: "#8d99a4", V: "#2b8cff",
    W: "#dff2ff", R: "#e8544a", Y: "#ffcf3f"
  };

  function botFrames() {
    return BOT_TREADS.map(function (t) { return bake(BOT_BODY.concat(t), BOT_PALETTE); });
  }

  /* =========================================================
     BRIDGE PLANKS — one grid, many materials. The renderer
     stretches these across the bridge, so they're drawn wide
     and shallow with a plain top face and a shaded front edge.
     ========================================================= */
  var PLANK = [
    "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO",
    "OAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAO",
    "OAAWAAAAAAAWAAAAAAWAAAAAAAAWAAAO",
    "OAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAO",
    "OAAAAAWAAAAAAAAWAAAAAAAAAAAAAAAO",
    "OBBAAAAAAAAAAAAAAAAAAAAAAAAAABBO",
    "OBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBO",
    "OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO",
    ".OCCCCCCCCCCCCCCCCCCCCCCCCCCCCO.",
    "..OOOOOOOOOOOOOOOOOOOOOOOOOOOO.."
  ];

  var PLANK_SKINS = {
    wood:    { O: "#4a3220", A: "#b98a5a", W: "#a97b4d", B: "#a2764a", C: "#7d5836" },
    stone:   { O: "#3d444b", A: "#9aa4ad", W: "#8b959e", B: "#87929c", C: "#6d7681" },
    candy:   { O: "#a33468", A: "#ff9ec9", W: "#ffd1e6", B: "#f07fb2", C: "#c9538c" },
    ice:     { O: "#2f6f8f", A: "#9fe4ff", W: "#e2f7ff", B: "#7fd0f0", C: "#4f9cc0" },
    rainbow: { O: "#5a3f8f", A: "#ff8fbf", W: "#ffe38f", B: "#8fd7ff", C: "#7a5bb5" },
    gold:    { O: "#8a6410", A: "#ffcf3f", W: "#fff0b0", B: "#e5b31f", C: "#b58a12" }
  };

  /* =========================================================
     SCENERY
     ========================================================= */
  var ISLAND = [
    "................GG..............",
    "..............GGGGGG............",
    "...........GGGGgGGGGGG..........",
    "..............GGTTGG............",
    "................TT..............",
    "................TT..............",
    "...............TTT..............",
    "......YYYY.....TT...YYYY........",
    "...YYYYYYYYYYYYYYYYYYYYYYY......",
    ".YYYYYYYYYYYYYYYYYYYYYYYYYYY....",
    "YYYYYYYYYYYYYYYYYYYYYYYYYYYYY...",
    ".yyyyyyyyyyyyyyyyyyyyyyyyyyy...."
  ];
  var ISLAND_PAL = { G: "#3aa84a", g: "#2c7d38", T: "#8a5a33", Y: "#ffd98a", y: "#e0b665" };

  var CLOUD = [
    "....WWWW....",
    "..WWWWWWWW..",
    ".WWWWWWWWWW.",
    "WWWWWWWWWWWW",
    ".WWWWWWWWWW."
  ];
  var CLOUD_PAL = { W: "#ffffff" };

  var COIN = [
    "..OOOO..",
    ".OYYYYO.",
    "OYYWWYYO",
    "OYWYYWYO",
    "OYWYYWYO",
    "OYYWWYYO",
    ".OYYYYO.",
    "..OOOO.."
  ];
  var COIN_PAL = { O: "#8a6410", Y: "#ffcf3f", W: "#fff3c4" };

  /* =========================================================
     BUILD EVERYTHING ONCE
     ========================================================= */
  var CACHE = null;

  function build() {
    if (CACHE) return CACHE;
    CACHE = {};
    Object.keys(KID_PALETTES).forEach(function (k) {
      CACHE["hero." + k + ".walk"] = heroFrames(k);
    });
    CACHE["bot.walk"] = botFrames();
    Object.keys(PLANK_SKINS).forEach(function (s) {
      CACHE["plank." + s] = bake(PLANK, PLANK_SKINS[s]);
    });
    CACHE["island"] = bake(ISLAND, ISLAND_PAL);
    CACHE["cloud"] = bake(CLOUD, CLOUD_PAL);
    CACHE["coin"] = bake(COIN, COIN_PAL);
    return CACHE;
  }

  // A fresh copy of a sprite, scaled up, for use in the page chrome
  // (the cached ones belong to the renderer and must stay put).
  function thumb(id, scale, frame) {
    var src = build()[id];
    if (Array.isArray(src)) src = src[frame || 0];
    if (!src) return null;
    var c = document.createElement("canvas");
    c.width = src.width * scale;
    c.height = src.height * scale;
    var g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.drawImage(src, 0, 0, c.width, c.height);
    return c;
  }

  return {
    get: function (id) { return build()[id]; },
    thumb: thumb,
    all: build,
    bake: bake,
    skins: Object.keys(PLANK_SKINS),
    skinColours: PLANK_SKINS
  };
})();
