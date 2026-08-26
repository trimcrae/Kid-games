/* ===========================================================
   Rock Detective — the specimen data + all the pure logic.
   -----------------------------------------------------------
   This file has NO DOM in it on purpose, so the exact same
   numbers and rules power both the game in the browser AND the
   little node script that checks the science (validate.js).

     browser:  <script src="rocks.js"></script>  ->  window.ROCK_DATA
     node:     const D = require("./rocks.js");

   EVERY number in here is meant to be correct. If you change
   a hardness, a streak or a "fizzes", run validate.js again.
   =========================================================== */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ROCK_DATA = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ---------------------------------------------------------------
  // The clue groups — a real dichotomous key.
  // Groups marked single:true are "pick one" (a rock can only have
  // ONE hardness band, ONE streak colour, ONE lustre...), which is
  // what makes the key actually narrow things down.
  // ---------------------------------------------------------------
  var GROUPS = [
    {
      id: "grain", title: "🔎 Crystals & grains", single: true,
      help: "Look really close — even with a magnifying glass.",
      clues: [
        { key: "g-big",    label: "🔷 Big crystals you can see" },
        { key: "g-cube",   label: "🧊 Cube crystals" },
        { key: "g-point",  label: "💠 Pointy prism crystals" },
        { key: "g-sheet",  label: "📄 Peels into sheets" },
        { key: "g-sand",   label: "🏖️ Sandy grains" },
        { key: "g-pebble", label: "🪨 Pebbles or chunks" },
        { key: "g-none",   label: "🚫 Too fine to see grains" }
      ]
    },
    {
      id: "lustre", title: "✨ Shine (lustre)", single: true,
      help: "How does light bounce off it?",
      clues: [
        { key: "l-glass", label: "🪞 Glassy" },
        { key: "l-metal", label: "🔩 Metallic" },
        { key: "l-dull",  label: "🥔 Dull / earthy" },
        { key: "l-pearl", label: "🐚 Pearly / silky" }
      ]
    },
    {
      id: "colour", title: "🎨 Colour", single: true,
      help: "Careful — colour is the WORST clue. Lots of rocks fake it!",
      clues: [
        { key: "c-dark",   label: "⚫ Dark" },
        { key: "c-pale",   label: "⚪ Pale" },
        { key: "c-bright", label: "🌈 Bright colour" },
        { key: "c-gold",   label: "🟡 Gold / brassy" }
      ]
    },
    {
      id: "hard", title: "💪 Hardness (scratch test)", single: true,
      help: "Find the softest thing that still scratches it.",
      clues: [
        { key: "h1", label: "🖐️ A fingernail scratches it" },
        { key: "h2", label: "🪙 A copper coin scratches it" },
        { key: "h3", label: "🔩 An iron nail scratches it" },
        { key: "h4", label: "🪟 It scratches glass" },
        { key: "h5", label: "💎 As hard as quartz" },
        { key: "h6", label: "👑 It scratches quartz" }
      ]
    },
    {
      id: "streak", title: "⬜ Streak (rub it on a tile)", single: true,
      help: "The powder colour. It's a MINERAL test — rocks are mixtures, so streak isn't used on them.",
      clues: [
        { key: "s-white",  label: "⬜ White / colourless" },
        { key: "s-dark",   label: "⬛ Grey or black" },
        { key: "s-red",    label: "🟥 Red-brown" },
        { key: "s-yellow", label: "🟨 Yellow" },
        { key: "s-rock",   label: "🪨 It's a rock (no streak)" }
      ]
    },
    {
      id: "tests", title: "🧪 Lab tests", single: false,
      help: "Real geologists carry vinegar and a magnet!",
      clues: [
        { key: "t-fizz",   label: "🫧 Fizzes in vinegar" },
        { key: "t-magnet", label: "🧲 A magnet sticks" },
        { key: "t-float",  label: "🌊 Floats on water" },
        { key: "t-heavy",  label: "⚖️ Very heavy for its size" },
        { key: "t-light",  label: "🪶 Very light for its size" },
        { key: "t-soapy",  label: "🧼 Feels soapy or greasy" },
        { key: "t-marks",  label: "✏️ It marks paper" },
        { key: "t-smell",  label: "👃 Rotten-egg smell" },
        { key: "t-salty",  label: "🧂 Tastes salty" },
        { key: "t-double", label: "👀 Makes a double image" },
        { key: "t-glow",   label: "🔦 Glows under UV light" }
      ]
    },
    {
      id: "looks", title: "🔍 Extra clues", single: false,
      help: "Little details that crack the case.",
      clues: [
        { key: "t-layers",  label: "🥞 Stripes or layers" },
        { key: "t-holes",   label: "🕳️ Full of holes" },
        { key: "t-sharp",   label: "🔪 Curved, razor-sharp flakes" },
        { key: "t-splits",  label: "📐 Splits into flat sheets" },
        { key: "t-speckled",label: "🐦 Evenly speckled, no stripes" },
        { key: "t-specks",  label: "🔸 A few big crystals in fine rock" },
        { key: "t-round",   label: "🥚 Rounded pebbles" },
        { key: "t-angular", label: "🔺 Sharp broken chunks" }
      ]
    }
  ];

  // ---- Hardness bands, the way a real field kit works ------------
  // fingernail 2.5 · copper coin 3.5 · iron nail 4.5 · glass 5.5
  var BANDS = [
    { key: "h1", max: 2.5,      name: "1–2½ · a fingernail scratches it" },
    { key: "h2", max: 3.5,      name: "3 · a copper coin scratches it" },
    { key: "h3", max: 5.49,     name: "4–5 · an iron nail scratches it" },
    { key: "h4", max: 6.99,     name: "5½–6½ · it scratches glass" },
    { key: "h5", max: 7.99,     name: "7 · as hard as quartz" },
    { key: "h6", max: 10,       name: "8–10 · it scratches quartz" }
  ];
  function bandOf(mohs) {
    for (var i = 0; i < BANDS.length; i++) if (mohs <= BANDS[i].max) return BANDS[i].key;
    return "h6";
  }
  function bandName(key) {
    for (var i = 0; i < BANDS.length; i++) if (BANDS[i].key === key) return BANDS[i].name;
    return "";
  }

  // ---- The scratch kit (used by the Lab) -------------------------
  var TOOLS = [
    { key: "nail",  label: "🖐️ Fingernail",   h: 2.5 },
    { key: "coin",  label: "🪙 Copper coin",   h: 3.5 },
    { key: "iron",  label: "🔩 Iron nail",     h: 4.5 },
    { key: "glass", label: "🪟 Glass plate",   h: 5.5 },
    { key: "file",  label: "🛠️ Steel file",    h: 6.5 }
  ];

  var FAMILY = {
    Igneous:     { glyph: "🌋", blurb: "Cooled from melted rock (magma or lava)." },
    Sedimentary: { glyph: "🥞", blurb: "Bits and pieces settled in layers and got cemented." },
    Metamorphic: { glyph: "🔥", blurb: "Another rock cooked and squeezed until it changed." },
    Mineral:     { glyph: "💎", blurb: "A single pure ingredient — rocks are made OF minerals." }
  };

  // ---------------------------------------------------------------
  // THE COLLECTION
  //   mohs   – representative Mohs hardness
  //   streak – powder colour (minerals only; rocks are mixtures)
  //   lustre / breaks – real descriptive properties
  //   k      – the clue keys the specimen honestly matches
  //   forms  – how it is made (the rock-cycle story)
  // ---------------------------------------------------------------
  var ROCKS = [
    /* ---------------- IGNEOUS ---------------- */
    {
      name: "Granite", type: "Igneous", pattern: "speckled",
      c1: "#e9dcd0", c2: "#b07f6b", c3: "#5a5560", mohs: 6.5,
      streak: null, lustre: "Glassy glints from quartz and mica",
      breaks: "Breaks rough and blocky, right around the crystals",
      k: ["g-big", "l-glass", "c-pale", "h4", "s-rock", "t-speckled"],
      fact: "Speckled salt-and-pepper rock full of crystals you can see.",
      forms: "Magma cools SLOWLY, deep underground — slow cooling gives crystals time to grow big.",
      more: "Its three main minerals are <b>quartz</b> (glassy grey), <b>feldspar</b> (pink or white blocks) and <b>mica</b> (black shiny flakes). Tough enough for kitchen worktops. 🍳"
    },
    {
      name: "Rhyolite", type: "Igneous", pattern: "porphyry",
      c1: "#e3cfc6", c2: "#8a6b62", c3: "#f4ebe5", mohs: 6,
      streak: null, lustre: "Dull, sometimes with glassy specks",
      breaks: "Breaks with a rough, even surface",
      k: ["g-none", "l-dull", "c-pale", "h4", "s-rock", "t-specks"],
      fact: "Granite's fast twin: same recipe, but the crystals are too small to see.",
      forms: "The SAME magma as granite, but it erupted and cooled fast at the surface.",
      more: "Sometimes a few big crystals grew underground first and got carried up — you see them as <b>specks floating in fine rock</b>. Granite and rhyolite prove the rule: slow = big crystals, fast = tiny ones. ⏱️"
    },
    {
      name: "Gabbro", type: "Igneous", pattern: "speckled",
      c1: "#4a4f48", c2: "#cfd4c8", c3: "#2f332e", mohs: 6,
      streak: null, lustre: "Glinting dark crystals",
      breaks: "Rough and blocky",
      k: ["g-big", "l-glass", "c-dark", "h4", "s-rock", "t-speckled"],
      fact: "Dark, heavy rock with crystals big enough to see — basalt's slow twin.",
      forms: "The same magma as basalt, but it cooled SLOWLY in a magma chamber underground.",
      more: "Most of the deep ocean crust, under the basalt lid, is gabbro. Put granite, rhyolite, basalt and gabbro side by side and you have the whole <b>cooling-speed puzzle</b>. 🧩"
    },
    {
      name: "Basalt", type: "Igneous", pattern: "fine",
      c1: "#3a3a42", c2: "#2a2a30", mohs: 6,
      streak: null, lustre: "Dull",
      breaks: "Breaks with a rough, even surface",
      k: ["g-none", "l-dull", "c-dark", "h4", "s-rock"],
      fact: "Dark, heavy, super-fine-grained rock — no crystals you can see.",
      forms: "Runny lava cools FAST at the surface, so its crystals never get bigger than dust.",
      more: "Nearly the whole <b>ocean floor</b> is basalt, which makes it the most common rock in Earth's crust. It has tiny grains of magnetite in it, so a strong magnet can give a lump of basalt a gentle tug. 🌊"
    },
    {
      name: "Obsidian", type: "Igneous", pattern: "glassy",
      c1: "#1c1620", c2: "#000000", mohs: 5.5,
      streak: null, lustre: "Bright glassy shine",
      breaks: "Conchoidal — curved, shell-shaped, razor-sharp flakes",
      k: ["g-none", "l-glass", "c-dark", "h4", "s-rock", "t-sharp"],
      fact: "Black volcanic GLASS with razor edges — not a single crystal inside.",
      forms: "Lava froze so fast the atoms never got to line up into crystals at all.",
      more: "It's the same recipe as rhyolite, just chilled instantly. People chipped it into <b>arrowheads and blades</b> — an obsidian edge can be sharper than a steel scalpel. 🏹"
    },
    {
      name: "Pumice", type: "Igneous", pattern: "holey",
      c1: "#d9cfc2", c2: "#b3a897", mohs: 6,
      streak: null, lustre: "Dull and frothy",
      breaks: "Crumbles — it's a foam of glass threads",
      k: ["g-none", "l-dull", "c-pale", "h4", "s-rock", "t-float", "t-holes", "t-light"],
      fact: "Frothy, holey lava foam so full of air that it FLOATS.",
      forms: "Gas-filled lava froze while it was still fizzing, trapping the bubbles forever.",
      more: "The glass threads themselves are hard (about 6), but the froth crumbles in your hand. Rafts of floating pumice have drifted across whole oceans after eruptions. 🛁"
    },

    /* ---------------- SEDIMENTARY ---------------- */
    {
      name: "Sandstone", type: "Sedimentary", pattern: "gritty",
      c1: "#e6c489", c2: "#c39a52", mohs: 6.5,
      streak: null, lustre: "Dull",
      breaks: "Crumbles AROUND the grains — you can rub sand off it",
      k: ["g-sand", "l-dull", "c-pale", "h4", "s-rock", "t-layers"],
      fact: "Zillions of sand grains glued together — feels like sandpaper.",
      forms: "Sand piles up on a beach, river or desert, gets buried, and minerals cement the grains.",
      more: "The grains are usually quartz (hardness 7), but the <b>glue between them is weak</b>, so the rock crumbles. That's exactly how you tell sandstone from quartzite. 🏜️"
    },
    {
      name: "Conglomerate", type: "Sedimentary", pattern: "pebbles",
      c1: "#c9a97e", c2: "#8f6b4a", c3: "#e0d3c0", mohs: 6,
      streak: null, lustre: "Dull",
      breaks: "Breaks around the pebbles",
      k: ["g-pebble", "l-dull", "c-pale", "h4", "s-rock", "t-round"],
      fact: "ROUNDED pebbles cemented together — nature's own concrete.",
      forms: "A fast river tumbled the pebbles smooth, dropped them, and mud cemented the pile.",
      more: "The round shape is the clue: rounded means the pebbles <b>travelled a long way</b> in water before they settled. 🌊"
    },
    {
      name: "Breccia", type: "Sedimentary", pattern: "angular",
      c1: "#c2a882", c2: "#7d5f42", c3: "#e2d4bf", mohs: 6,
      streak: null, lustre: "Dull",
      breaks: "Breaks around the chunks",
      k: ["g-pebble", "l-dull", "c-pale", "h4", "s-rock", "t-angular"],
      fact: "Say 'BRETCH-ee-a': sharp, ANGULAR chunks cemented together.",
      forms: "Rock shattered — in a cliff fall, a fault, or a volcano — and was cemented before it could get tumbled.",
      more: "Conglomerate's pebbles are round because they travelled. Breccia's chunks are still <b>sharp</b>, so they were buried close to home. Same rock, one clue apart. 🔺"
    },
    {
      name: "Shale", type: "Sedimentary", pattern: "layered",
      c1: "#7c7d74", c2: "#5c5d55", mohs: 3,
      streak: null, lustre: "Dull",
      breaks: "Splits along its flat mud layers; can be crumbly",
      k: ["g-none", "l-dull", "c-dark", "h2", "s-rock", "t-layers", "t-splits"],
      fact: "Hardened mud that splits into thin flat pages.",
      forms: "The finest mud settled in still, quiet water — a lake bed or deep sea floor — and got squashed.",
      more: "Because it settles so gently it often traps whole <b>fossils</b> between its pages, like a stone book. A copper coin scratches it easily. 🐟"
    },
    {
      name: "Limestone", type: "Sedimentary", pattern: "smooth",
      c1: "#e8e4d6", c2: "#cfc9b4", mohs: 3,
      streak: null, lustre: "Dull",
      breaks: "Breaks rough and blocky",
      k: ["g-none", "l-dull", "c-pale", "h2", "s-rock", "t-fizz"],
      fact: "Pale rock made of ancient shells and coral — it FIZZES in vinegar.",
      forms: "Sea creatures made shells of calcite; the shells piled up on the sea floor for millions of years.",
      more: "It's mostly the mineral <b>calcite</b>, and that's why it fizzes: the acid attacks calcite and lets carbon dioxide gas escape. Rain slowly dissolves it into <b>caves</b>. 🦕"
    },
    {
      name: "Chalk", type: "Sedimentary", pattern: "smooth",
      c1: "#fbfaf5", c2: "#e6e3d6", mohs: 1.5,
      streak: null, lustre: "Dull and powdery",
      breaks: "Crumbles into white dust",
      k: ["g-none", "l-dull", "c-pale", "h1", "s-rock", "t-fizz", "t-marks"],
      fact: "Super-soft white limestone — your fingernail digs straight in.",
      forms: "Trillions of microscopic sea-algae shells (coccoliths) drifted down and made a white ooze.",
      more: "It fizzes just like limestone because it's calcite too — but it's <b>much softer</b>, so the scratch test tells them apart. (Fun fact: most classroom 'chalk' today is actually gypsum!) 🥚"
    },
    {
      name: "Coal", type: "Sedimentary", pattern: "fine",
      c1: "#242024", c2: "#0d0a0d", mohs: 2.5,
      streak: null, lustre: "Dull to slightly shiny black",
      breaks: "Breaks into blocks; leaves black dust on your hands",
      k: ["g-none", "l-dull", "c-dark", "h1", "s-rock", "t-light"],
      fact: "Black rock made from squashed ancient plants — and it burns.",
      forms: "Swamp forests died, got buried before they could rot away, and heat squeezed out the water.",
      more: "It's surprisingly <b>light</b> for a black rock, because it's mostly carbon from plants. Coal from about <b>300 million years</b> ago is stored sunshine. ⚡"
    },
    {
      name: "Flint", type: "Sedimentary", pattern: "glassy",
      c1: "#4f4a44", c2: "#2e2b27", mohs: 7,
      streak: null, lustre: "Waxy to glassy",
      breaks: "Conchoidal — curved, sharp flakes, like obsidian",
      k: ["g-none", "l-glass", "c-dark", "h5", "s-rock", "t-sharp"],
      fact: "Dark, waxy, very hard rock that chips into sharp curved flakes.",
      forms: "Silica from sponges and other sea creatures re-formed into hard nodules inside chalk and limestone.",
      more: "It's made of quartz crystals far too small to see, so it is quartz-hard (7). Stone-age people made <b>tools and fire sparks</b> from it. 🔥"
    },

    /* ---------------- METAMORPHIC ---------------- */
    {
      name: "Marble", type: "Metamorphic", pattern: "smooth",
      c1: "#f2eee8", c2: "#cdbfc9", mohs: 3,
      streak: null, lustre: "Sugary sparkle from interlocking calcite",
      breaks: "Breaks across the crystals, rough and grainy",
      parent: ["Limestone"],
      k: ["g-big", "l-glass", "c-pale", "h2", "s-rock", "t-fizz"],
      fact: "Limestone re-crystallised into a swirly, sugary, sparkling stone.",
      forms: "Heat and pressure re-grew limestone's tiny calcite grains into big interlocking crystals.",
      more: "It still fizzes in vinegar, because it is still calcite — the atoms just got rearranged. Sculptors love it because it's soft (3) and has no layers to split. 🏛️"
    },
    {
      name: "Slate", type: "Metamorphic", pattern: "layered",
      c1: "#4a5560", c2: "#333c45", mohs: 4,
      streak: null, lustre: "Dull, slightly satiny",
      breaks: "Splits into big flat sheets and RINGS when you tap it",
      parent: ["Shale"],
      k: ["g-none", "l-dull", "c-dark", "h3", "s-rock", "t-splits"],
      fact: "Shale cooked hard — it splits into smooth flat sheets and rings like a bell.",
      forms: "Shale was squeezed sideways until its clay flakes all lined up in one new direction.",
      more: "Its flat splitting is <b>not</b> the old mud layers — it's brand-new 'slaty cleavage' that can cut straight across them. Harder than shale, so an iron nail scratches it but a coin won't. 🎓"
    },
    {
      name: "Schist", type: "Metamorphic", pattern: "flaky",
      c1: "#a9a696", c2: "#e3ddc6", c3: "#6e6d5c", mohs: 4,
      streak: null, lustre: "Pearly, silky mica sheen",
      breaks: "Splits into wavy, glittery flakes",
      parent: ["Shale", "Slate"],
      k: ["g-big", "l-pearl", "c-pale", "h3", "s-rock", "t-splits", "t-layers"],
      fact: "Wavy, glittery rock packed with mica flakes big enough to see.",
      forms: "Slate cooked hotter still, until its clay grew into thousands of shiny mica crystals.",
      more: "It sparkles because all those tiny <b>mica mirrors</b> line up the same way. Shale → slate → schist → gneiss is the whole cooking ladder. ✨"
    },
    {
      name: "Gneiss", type: "Metamorphic", pattern: "banded",
      c1: "#ddd3c6", c2: "#4a4550", c3: "#b58f6f", mohs: 6.5,
      streak: null, lustre: "Glassy glints, like granite",
      breaks: "Tough — breaks across the bands, not along them",
      parent: ["Granite", "Schist"],
      k: ["g-big", "l-glass", "c-pale", "h4", "s-rock", "t-layers"],
      fact: "Say 'nice'! Wavy light-and-dark STRIPES squeezed into the rock.",
      forms: "The hottest, deepest squeezing of all — minerals separated out into pale and dark bands.",
      more: "It does not split along the stripes the way slate does; it's welded solid. The oldest rock ever found on Earth (about 4 billion years) is a gneiss. ⏳"
    },
    {
      name: "Quartzite", type: "Metamorphic", pattern: "smooth",
      c1: "#eee6e0", c2: "#d8c6d0", mohs: 7,
      streak: null, lustre: "Glassy, sugary",
      breaks: "Breaks straight THROUGH the grains, leaving a shiny surface",
      parent: ["Sandstone"],
      k: ["g-big", "l-glass", "c-pale", "h5", "s-rock"],
      fact: "Sandstone welded solid — the grains fused into one glassy mass.",
      forms: "Heat and pressure melted the sand grains into each other with no cement left between.",
      more: "Here's the detective test: sandstone breaks <b>around</b> its grains (sand rubs off), quartzite breaks <b>through</b> them (shiny, no crumbs). It's so tough it forms mountain ridges. ⛰️"
    },

    /* ---------------- MINERALS (the Mohs scale, in order!) ---------------- */
    {
      name: "Talc", type: "Mineral", pattern: "smooth",
      c1: "#eef0ea", c2: "#d3d8cf", mohs: 1,
      streak: "White", lustre: "Pearly to greasy",
      breaks: "Perfect cleavage into flakes; feels soapy",
      k: ["g-none", "l-pearl", "c-pale", "h1", "s-white", "t-soapy"],
      fact: "Number 1 on the Mohs scale — the softest mineral there is.",
      forms: "Grows when hot watery fluids change magnesium-rich rocks deep in the crust.",
      more: "It feels <b>soapy</b> because its sheets slide over each other. Ground up it becomes talcum powder. 🍼"
    },
    {
      name: "Graphite", type: "Mineral", pattern: "sheets",
      c1: "#55565c", c2: "#2e2f33", mohs: 1.5,
      streak: "Grey-black", lustre: "Metallic to dull",
      breaks: "Perfect cleavage into slippery sheets",
      k: ["g-sheet", "l-metal", "c-dark", "h1", "s-dark", "t-marks", "t-soapy"],
      fact: "Pencil 'lead'! Soft, greasy, and it leaves grey marks on everything.",
      forms: "Carbon (often old plant carbon) cooked deep underground at high temperature.",
      more: "Graphite and diamond are <b>both pure carbon</b> — same atoms! In graphite the atoms sit in slippery sheets (hardness 1½); in diamond they lock into a 3-D cage (hardness 10). 🤯"
    },
    {
      name: "Gypsum", type: "Mineral", pattern: "crystal",
      c1: "#f6f2e9", c2: "#ded6c4", mohs: 2,
      streak: "White", lustre: "Glassy to silky",
      breaks: "One perfect cleavage — peels into bendy sheets",
      k: ["g-point", "l-glass", "c-pale", "h1", "s-white", "t-splits"],
      fact: "Number 2 on the Mohs scale — a fingernail scratches it easily.",
      forms: "A salty sea or lake dried up and gypsum crystallised out of the water first.",
      more: "Clear gypsum is called <b>selenite</b>. Baked and powdered it becomes plaster and plasterboard — so most houses have gypsum in the walls. 🏠"
    },
    {
      name: "Sulfur", type: "Mineral", pattern: "crystal",
      c1: "#f7e04a", c2: "#c9a91a", mohs: 2,
      streak: "Pale yellow", lustre: "Resinous, like hard honey",
      breaks: "Brittle — crumbles easily",
      k: ["g-big", "l-glass", "c-bright", "h1", "s-yellow", "t-smell"],
      fact: "Blazing yellow crystals that smell like rotten eggs.",
      forms: "Grows straight out of volcanic gas around hot vents and craters.",
      more: "It's one of the few minerals that is a <b>single element</b> (just S). Warm it in your hand and the smell gets stronger. 🌋"
    },
    {
      name: "Halite", type: "Mineral", pattern: "cubes",
      c1: "#eef0f2", c2: "#d5d0e0", mohs: 2.5,
      streak: "White", lustre: "Glassy",
      breaks: "Perfect cleavage in 3 directions — it breaks into little CUBES",
      k: ["g-cube", "l-glass", "c-pale", "h1", "s-white", "t-salty"],
      fact: "Rock SALT — clear cubes, and yes, it tastes salty.",
      forms: "An ancient sea evaporated and left its salt behind in thick underground beds.",
      more: "It is exactly the same stuff as the salt on your chips. Because its atoms sit in a cube grid, it <b>breaks into cubes</b> too. (Geologists really do taste it — but never lick a rock you don't know!) 🧂"
    },
    {
      name: "Galena", type: "Mineral", pattern: "cubes",
      c1: "#b9bcc4", c2: "#7d8189", mohs: 2.5,
      streak: "Grey-black", lustre: "Bright metallic, like a mirror",
      breaks: "Perfect cubic cleavage — silvery cubes",
      k: ["g-cube", "l-metal", "c-dark", "h1", "s-dark", "t-heavy"],
      fact: "Shiny silver cubes that feel MUCH heavier than they look.",
      forms: "Crystallises out of hot mineral-rich water squeezing through cracks in limestone.",
      more: "It's lead sulfide, and lead is why it's so heavy — a galena cube weighs about <b>three times</b> a quartz crystal the same size. 🥇"
    },
    {
      name: "Mica", type: "Mineral", pattern: "sheets",
      c1: "#ded8c6", c2: "#aaa38c", mohs: 2.5,
      streak: "White", lustre: "Pearly, mirror-bright",
      breaks: "One perfect cleavage — peels into see-through sheets",
      k: ["g-sheet", "l-pearl", "c-pale", "h1", "s-white", "t-splits"],
      fact: "Peels into paper-thin, see-through, shiny sheets.",
      forms: "Grows in cooling granite magma and in cooking metamorphic rocks like schist.",
      more: "The silvery see-through kind is <b>muscovite</b> (old windows were made of it); the black kind is biotite. You can split a sheet with a fingernail. 💄"
    },
    {
      name: "Calcite", type: "Mineral", pattern: "rhomb",
      c1: "#f3ead7", c2: "#e0cfa8", mohs: 3,
      streak: "White", lustre: "Glassy",
      breaks: "Perfect cleavage in 3 directions — leaning rhomb blocks, not cubes",
      k: ["g-big", "l-glass", "c-pale", "h2", "s-white", "t-fizz", "t-double"],
      fact: "Number 3 on the Mohs scale — fizzes in vinegar and doubles your view.",
      forms: "Crystallises from sea water, cave drips and shells; it builds limestone and marble.",
      more: "Look through a clear piece and you see <b>two</b> of everything, because it splits light in half. Its blocks lean over — halite's are square cubes, calcite's are squashed. 👀"
    },
    {
      name: "Fluorite", type: "Mineral", pattern: "cubes",
      c1: "#9d6fd6", c2: "#6fbfa8", mohs: 4,
      streak: "White", lustre: "Glassy",
      breaks: "Perfect cleavage in 4 directions — chips into little octahedra",
      k: ["g-cube", "l-glass", "c-bright", "h3", "s-white", "t-glow"],
      fact: "Number 4 on the Mohs scale — purple and green cubes that GLOW under UV.",
      forms: "Grows from hot watery fluids in veins and cracks, often with galena.",
      more: "The word <b>fluorescent</b> comes from fluorite, because it was the first thing people noticed glowing in ultraviolet light. 🔦"
    },
    {
      name: "Apatite", type: "Mineral", pattern: "crystal",
      c1: "#8fd6a8", c2: "#4f9f78", mohs: 5,
      streak: "White", lustre: "Glassy",
      breaks: "Poor cleavage; breaks unevenly",
      k: ["g-point", "l-glass", "c-bright", "h3", "s-white"],
      fact: "Number 5 on the Mohs scale — and it's what YOUR TEETH are made of.",
      forms: "Crystallises in igneous rocks, and animals build it into bones and teeth.",
      more: "Tooth enamel is apatite, so your teeth really are hardness 5. That's why they can crunch ice (hardness 1½) but a grain of <b>sand</b> (7) hurts. 🦷"
    },
    {
      name: "Feldspar", type: "Mineral", pattern: "crystal",
      c1: "#e8b6a8", c2: "#c98a78", mohs: 6,
      streak: "White", lustre: "Glassy to pearly",
      breaks: "Two cleavages meeting at right angles — flat shiny steps",
      k: ["g-big", "l-glass", "c-pale", "h4", "s-white", "t-splits"],
      fact: "Number 6 on the Mohs scale — and the MOST common mineral in Earth's crust.",
      forms: "Crystallises from almost every magma — it's the pink or white blocks in granite.",
      more: "About <b>half</b> of the crust is feldspar. When it weathers it turns into clay, which becomes mud, which becomes shale — the rock cycle in action. 🧱"
    },
    {
      name: "Pyrite", type: "Mineral", pattern: "cubes",
      c1: "#d4af37", c2: "#a8862a", mohs: 6.5,
      streak: "Greenish-black", lustre: "Bright metallic",
      breaks: "Brittle — it shatters. Real gold just bends.",
      k: ["g-cube", "l-metal", "c-gold", "h4", "s-dark", "t-heavy"],
      fact: "'Fool's Gold' — brassy cubes that fooled a lot of miners.",
      forms: "Grows from sulfur-rich fluids, in veins, in coal beds and even inside fossils.",
      more: "The streak test busts it instantly: pyrite's powder is <b>greenish-black</b>, real gold's powder is golden. Pyrite is also hard (6½) and brittle; gold is soft (2½) and squishy. 😅"
    },
    {
      name: "Magnetite", type: "Mineral", pattern: "crystal",
      c1: "#4a4a55", c2: "#2b2b33", mohs: 6,
      streak: "Black", lustre: "Metallic",
      breaks: "Breaks unevenly; often grows as eight-sided octahedra",
      k: ["g-big", "l-metal", "c-dark", "h4", "s-dark", "t-magnet", "t-heavy"],
      fact: "The one mineral a magnet jumps onto. 🧲",
      forms: "Crystallises in igneous and metamorphic rocks, and settles in dark 'black sand' on beaches.",
      more: "Naturally magnetised lumps are called <b>lodestone</b>, and they were the world's first compasses. Drag a magnet through beach sand and you'll collect magnetite. 🧭"
    },
    {
      name: "Hematite", type: "Mineral", pattern: "smooth",
      c1: "#6b5a58", c2: "#9c4b3c", mohs: 5.5,
      streak: "Red-brown", lustre: "Metallic or earthy",
      breaks: "Breaks unevenly; often lumpy and kidney-shaped",
      k: ["g-none", "l-metal", "c-dark", "h4", "s-red", "t-heavy"],
      fact: "Looks silvery-black, but its streak is always RUST RED.",
      forms: "Forms where iron meets oxygen — in ancient oxygen-rich seas and in rusty weathered rock.",
      more: "This is why <b>Mars is red</b>: its dust is full of hematite. It's the world's main iron ore, and the streak test is the only easy way to tell it from magnetite (magnetite's streak is black, and it's magnetic). 🔴"
    },
    {
      name: "Quartz", type: "Mineral", pattern: "crystal",
      c1: "#eaf3f7", c2: "#c3dbe6", mohs: 7,
      streak: "White", lustre: "Glassy",
      breaks: "No cleavage — conchoidal (curved, shell-like) fracture",
      k: ["g-point", "l-glass", "c-pale", "h5", "s-white", "t-sharp"],
      fact: "Number 7 on the Mohs scale — six-sided glassy points.",
      forms: "Crystallises last from cooling magma and grows in veins and geodes from hot water.",
      more: "It scratches glass and steel easily and it doesn't cleave — it fractures in curves. Squeeze a quartz crystal and it makes electricity, which is how <b>quartz watches</b> keep time. ⌚"
    },
    {
      name: "Amethyst", type: "Mineral", pattern: "crystal",
      c1: "#9b6fd4", c2: "#6f45b0", mohs: 7,
      streak: "White", lustre: "Glassy",
      breaks: "No cleavage — conchoidal fracture, same as quartz",
      k: ["g-point", "l-glass", "c-bright", "h5", "s-white", "t-sharp"],
      fact: "Purple quartz — same mineral, same hardness, different colour.",
      forms: "Grows point-down inside gas bubbles in old lava, making geodes.",
      more: "The purple comes from a trace of <b>iron</b> plus natural radiation. Heat it and it turns golden — that's citrine. February's birthstone. 💜"
    },
    {
      name: "Topaz", type: "Mineral", pattern: "crystal",
      c1: "#f5d78a", c2: "#d1a44c", mohs: 8,
      streak: "White", lustre: "Glassy",
      breaks: "One perfect cleavage straight across the crystal",
      k: ["g-point", "l-glass", "c-bright", "h6", "s-white", "t-splits"],
      fact: "Number 8 on the Mohs scale — it scratches quartz.",
      forms: "Grows from hot vapours in the last cracks of a cooling granite.",
      more: "Even though it's harder than quartz, one clean tap in the wrong direction <b>splits it in half</b>, because of its perfect cleavage. Hard is not the same as tough! 💛"
    },
    {
      name: "Corundum", type: "Mineral", pattern: "crystal",
      c1: "#d0524f", c2: "#9c2f2e", mohs: 9,
      streak: "White", lustre: "Glassy to brilliant",
      breaks: "No cleavage; very tough, breaks unevenly",
      k: ["g-big", "l-glass", "c-bright", "h6", "s-white", "t-heavy"],
      fact: "Number 9 on the Mohs scale — rubies AND sapphires are both corundum.",
      forms: "Grows in aluminium-rich rocks cooked at very high temperature and pressure.",
      more: "Red corundum is a <b>ruby</b>, every other colour is a <b>sapphire</b> — same mineral, tiny colour impurities. Its grit is glued onto sandpaper and nail files. 💍"
    },
    {
      name: "Diamond", type: "Mineral", pattern: "crystal",
      c1: "#e6f7ff", c2: "#bfe6f5", mohs: 10,
      streak: "White", lustre: "Adamantine — the brightest shine of all",
      breaks: "Perfect cleavage in 4 directions — that's how gem cutters split it",
      k: ["g-point", "l-glass", "c-pale", "h6", "s-white", "t-splits"],
      fact: "Number 10 — the hardest natural material on Earth. Pure carbon.",
      forms: "Crystallises about 150 km down in the mantle and rides up fast in volcanic pipes.",
      more: "Same element as pencil graphite, but its atoms lock into a rigid 3-D cage, so <b>only a diamond can scratch a diamond</b>. Jump from 9 to 10 and the hardness roughly quadruples. 💎"
    }
  ];

  // ---- Derived, so a property can never contradict a clue tag ----
  ROCKS.forEach(function (r) {
    r.tags = r.k.slice();
    r.fizz = r.k.indexOf("t-fizz") >= 0;
    r.magnetic = r.k.indexOf("t-magnet") >= 0;
    r.floats = r.k.indexOf("t-float") >= 0;
    r.band = bandOf(r.mohs);
    r.isRock = r.type !== "Mineral";
    r.glyph = FAMILY[r.type].glyph;
  });

  var BY_NAME = {};
  ROCKS.forEach(function (r) { BY_NAME[r.name] = r; });

  // ---------------------------------------------------------------
  // Look-alike sets — the pairs real geologists have to TEST apart.
  // The Lab picks one of these so tests actually matter.
  // ---------------------------------------------------------------
  var LOOKALIKES = [
    { title: "Shiny metal lumps", names: ["Pyrite", "Galena", "Magnetite", "Hematite", "Graphite"] },
    { title: "Clear glassy crystals", names: ["Quartz", "Calcite", "Halite", "Fluorite", "Gypsum"] },
    { title: "Pale dusty rocks", names: ["Limestone", "Chalk", "Marble", "Sandstone"] },
    { title: "Melted-rock family", names: ["Granite", "Gabbro", "Rhyolite", "Basalt"] },
    { title: "Stripy squashed rocks", names: ["Shale", "Slate", "Schist", "Gneiss"] },
    { title: "Dark mystery lumps", names: ["Obsidian", "Flint", "Coal", "Basalt"] },
    { title: "Grains & pebbles", names: ["Sandstone", "Quartzite", "Conglomerate", "Breccia"] },
    { title: "Super-soft minerals", names: ["Talc", "Gypsum", "Mica", "Graphite"] },
    { title: "Really hard gems", names: ["Quartz", "Topaz", "Corundum", "Diamond"] },
    { title: "Light-as-air rocks", names: ["Pumice", "Coal", "Chalk", "Shale"] }
  ];

  // ---------------------------------------------------------------
  // Why the wrong answer was wrong — a REAL explanation, please.
  // ---------------------------------------------------------------
  var PAIRS = {
    "Basalt|Granite": "Granite cooled <b>slowly</b> deep underground, so its crystals had time to grow big enough to see. Basalt cooled <b>fast</b> at the surface, so its crystals are too tiny to spot.",
    "Gabbro|Rhyolite": "Same idea, other way round: gabbro is dark magma cooled slowly (big crystals), rhyolite is pale magma cooled fast (no visible crystals).",
    "Basalt|Gabbro": "Same dark magma — gabbro cooled slowly underground (crystals you can see), basalt erupted and froze fast (crystals too small to see).",
    "Granite|Rhyolite": "Same pale magma — granite cooled slowly underground (big crystals), rhyolite erupted and cooled fast (too fine to see).",
    "Quartzite|Sandstone": "Break them! Sandstone breaks <b>around</b> its grains and rubs off as sand. Quartzite breaks straight <b>through</b> the grains and leaves a shiny surface.",
    "Limestone|Marble": "Both fizz in vinegar because both are calcite. But marble was cooked, so its crystals are big and sugary; limestone is dull and fine.",
    "Chalk|Limestone": "Both fizz. Scratch them: your <b>fingernail</b> digs into chalk (1½), but a fingernail can't touch limestone (3) — you need a copper coin.",
    "Shale|Slate": "Slate got cooked, so it's harder: an iron nail scratches slate but a copper coin won't. A coin scratches shale easily, and slate rings when you tap it.",
    "Breccia|Conglomerate": "Look at the chunk shapes. Conglomerate's pebbles are <b>rounded</b> (they travelled far in water); breccia's chunks are <b>sharp</b> (they broke close to home).",
    "Diamond|Graphite": "Both are pure carbon! In graphite the atoms are in slippery sheets (hardness 1½, marks paper); in diamond they lock in a 3-D cage (hardness 10).",
    "Calcite|Quartz": "Drop vinegar on it: calcite <b>fizzes</b>, quartz does nothing. And a copper coin scratches calcite (3), while quartz (7) scratches steel.",
    "Hematite|Magnetite": "Streak test! Both look silvery-black, but hematite's powder is <b>red-brown</b> and magnetite's is black. A magnet also sticks to magnetite.",
    "Halite|Quartz": "Halite is soft (2½) and breaks into perfect cubes; quartz is hard (7) and fractures in curves. Halite also dissolves in water.",
    "Obsidian|Flint": "Both chip into curved sharp flakes, but flint is harder (7 — it scratches glass easily) and waxy, while obsidian is bright volcanic glass (5½).",
    "Mica|Talc": "Both are soft and pale. Talc feels <b>soapy</b> and is the softest mineral (1); mica peels into springy see-through sheets (2½).",
    "Gneiss|Granite": "Granite is evenly speckled with no pattern. Gneiss has been squeezed until the minerals lined up into wavy <b>light and dark stripes</b>.",
    "Coal|Obsidian": "Obsidian is glassy, hard (5½) and razor-sharp when it breaks. Coal is dull, soft (a fingernail marks it) and very light for its size."
  };

  function pairKey(a, b) { return [a, b].sort().join("|"); }

  function explainDiff(picked, correct) {
    if (!picked || !correct || picked.name === correct.name) return "";
    var pre = PAIRS[pairKey(picked.name, correct.name)];
    if (pre) return pre;
    if (picked.fizz !== correct.fizz) {
      var f = picked.fizz ? picked : correct, nf = picked.fizz ? correct : picked;
      return "Try the vinegar test: <b>" + f.name + "</b> fizzes (it's made of calcite), but <b>" + nf.name + "</b> doesn't fizz at all.";
    }
    if (picked.magnetic !== correct.magnetic) {
      var m = picked.magnetic ? picked : correct, nm = picked.magnetic ? correct : picked;
      return "Try a magnet: it jumps onto <b>" + m.name + "</b>, but ignores <b>" + nm.name + "</b>.";
    }
    if (picked.floats !== correct.floats) {
      var fl = picked.floats ? picked : correct, sk = picked.floats ? correct : picked;
      return "Drop them in water: <b>" + fl.name + "</b> floats because it's full of trapped bubbles; <b>" + sk.name + "</b> sinks.";
    }
    if (picked.streak && correct.streak && picked.streak !== correct.streak) {
      return "Rub them on a tile: <b>" + picked.name + "</b> leaves a " + picked.streak.toLowerCase() +
        " streak, but <b>" + correct.name + "</b> leaves a " + correct.streak.toLowerCase() + " one.";
    }
    if (picked.band !== correct.band) {
      var harder = picked.mohs > correct.mohs ? picked : correct;
      var softer = picked.mohs > correct.mohs ? correct : picked;
      return "Scratch test: <b>" + softer.name + "</b> is only " + softer.mohs + " on the Mohs scale (" +
        bandName(softer.band) + "), while <b>" + harder.name + "</b> is " + harder.mohs + " (" + bandName(harder.band) + ").";
    }
    if (picked.type !== correct.type) {
      return "<b>" + picked.name + "</b> is " + FAMILY[picked.type].glyph + " " + picked.type.toLowerCase() +
        " — " + picked.forms + " <b>" + correct.name + "</b> is " + FAMILY[correct.type].glyph + " " +
        correct.type.toLowerCase() + " — " + correct.forms;
    }
    return "<b>" + picked.name + "</b>: " + picked.fact + " <b>" + correct.name + "</b>: " + correct.fact;
  }

  // ---------------------------------------------------------------
  // Quiz question factory. Pure — hand it a random function and it
  // hands you back a question with EXACTLY one correct option.
  // ---------------------------------------------------------------
  var TIERS = [
    { id: "explorer",  label: "🐣 Explorer",  opts: 3, hint: "full",   kinds: ["name", "family"] },
    { id: "rockhound", label: "⛏️ Rockhound", opts: 4, hint: "family", kinds: ["name", "family", "fizz", "harder", "parent", "forms", "magnet", "float"] },
    { id: "geologist", label: "🎓 Geologist", opts: 4, hint: "none",   kinds: ["name", "name", "family", "fizz", "harder", "parent", "forms", "streak", "band", "magnet"] }
  ];
  function tierById(id) {
    for (var i = 0; i < TIERS.length; i++) if (TIERS[i].id === id) return TIERS[i];
    return TIERS[1];
  }

  function pick(rng, list) { return list[Math.floor(rng() * list.length)]; }
  function shuffle(rng, list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function sample(rng, list, n) { return shuffle(rng, list).slice(0, n); }

  // opts: [{ text, rock, correct }]
  function makeQuestion(tierId, rng, avoidName) {
    var tier = tierById(tierId);
    var kind = pick(rng, tier.kinds);
    var n = tier.opts;
    var pool = ROCKS.filter(function (r) { return r.name !== avoidName; });
    if (!pool.length) pool = ROCKS;

    if (kind === "name") {
      var target = pick(rng, pool);
      var wrongPool;
      if (tierId === "geologist") {
        var sets = LOOKALIKES.filter(function (s) { return s.names.indexOf(target.name) >= 0; });
        var fromSet = sets.length
          ? pick(rng, sets).names.filter(function (nm) { return nm !== target.name; }).map(function (nm) { return BY_NAME[nm]; })
          : [];
        wrongPool = fromSet.concat(ROCKS.filter(function (r) {
          return r.name !== target.name && fromSet.indexOf(r) < 0;
        }));
      } else if (tierId === "explorer") {
        wrongPool = shuffle(rng, ROCKS.filter(function (r) { return r.name !== target.name && r.type !== target.type; }));
      } else {
        wrongPool = shuffle(rng, ROCKS.filter(function (r) { return r.name !== target.name; }));
      }
      return finish("What is this specimen?", target, wrongPool.slice(0, n - 1), target, "name");
    }

    if (kind === "family") {
      var t2 = pick(rng, pool);
      var fams = shuffle(rng, Object.keys(FAMILY));
      return {
        kind: "family", rock: t2, showRock: true,
        prompt: "Which family does <b>" + t2.name + "</b> belong to?",
        hintText: t2.fact,
        options: fams.map(function (f) {
          return { text: FAMILY[f].glyph + " " + f, family: f, correct: f === t2.type };
        }),
        answerText: t2.type,
        explainFor: function (o) {
          return "<b>" + t2.name + "</b> is " + FAMILY[t2.type].glyph + " <b>" + t2.type +
            "</b>. " + t2.forms + " (" + FAMILY[o && o.family ? o.family : t2.type].glyph + " " +
            (o && o.family ? o.family : t2.type) + ": " + FAMILY[o && o.family ? o.family : t2.type].blurb + ")";
        }
      };
    }

    if (kind === "fizz") {
      var fizzers = ROCKS.filter(function (r) { return r.fizz; });
      var others = ROCKS.filter(function (r) { return !r.fizz; });
      var yes = pick(rng, fizzers);
      return finish("🫧 You drip vinegar on four specimens. Which one FIZZES?",
        null, sample(rng, others, n - 1), yes, "fizz");
    }

    if (kind === "magnet") {
      var mags = ROCKS.filter(function (r) { return r.magnetic; });
      var nonmags = ROCKS.filter(function (r) { return !r.magnetic; });
      var mg = pick(rng, mags);
      return finish("🧲 Which one does the magnet stick to?",
        null, sample(rng, nonmags, n - 1), mg, "magnet");
    }

    if (kind === "float") {
      var fs = ROCKS.filter(function (r) { return r.floats; });
      var sinks = ROCKS.filter(function (r) { return !r.floats; });
      var fo = pick(rng, fs);
      return finish("🌊 Which one FLOATS on water?", null, sample(rng, sinks, n - 1), fo, "float");
    }

    if (kind === "harder") {
      var four = sample(rng, ROCKS, n);
      // make sure the hardest one is unique
      var guard = 0;
      while (guard++ < 60) {
        var sorted = four.slice().sort(function (a, b) { return b.mohs - a.mohs; });
        if (sorted[0].mohs > sorted[1].mohs) break;
        four = sample(rng, ROCKS, n);
      }
      var best = four.slice().sort(function (a, b) { return b.mohs - a.mohs; })[0];
      return finish("💪 Which of these is the HARDEST?", null,
        four.filter(function (r) { return r !== best; }), best, "harder");
    }

    if (kind === "band") {
      var t3 = pick(rng, pool);
      var opts = shuffle(rng, BANDS).slice(0, n);
      if (opts.indexOf(bandOfObj(t3)) < 0) { opts[0] = bandOfObj(t3); opts = shuffle(rng, opts); }
      return {
        kind: "band", rock: t3, showRock: true,
        prompt: "🔬 <b>" + t3.name + "</b> is " + t3.mohs + " on the Mohs scale. Which scratch test fits?",
        hintText: "",
        options: opts.map(function (b) {
          return { text: b.name, correct: b.key === t3.band };
        }),
        answerText: bandName(t3.band),
        explainFor: function () {
          return "<b>" + t3.name + "</b> is hardness " + t3.mohs + ", so: " + bandName(t3.band) + ".";
        }
      };
    }

    if (kind === "streak") {
      var minerals = ROCKS.filter(function (r) { return r.streak; });
      var tm = pick(rng, minerals);
      var diff = minerals.filter(function (r) { return r.streak !== tm.streak; });
      return finish("⬜ Which mineral leaves a <b>" + tm.streak.toLowerCase() + "</b> streak?",
        null, sample(rng, diff, n - 1), tm, "streak");
    }

    if (kind === "parent") {
      var kids = ROCKS.filter(function (r) { return r.parent && r.parent.length; });
      var kid = pick(rng, kids);
      var mum = BY_NAME[kid.parent[0]];
      var notParents = ROCKS.filter(function (r) {
        return r.name !== kid.name && kid.parent.indexOf(r.name) < 0 && r.type !== "Mineral";
      });
      return finish("🔥 Which rock gets cooked and squeezed into <b>" + kid.name + "</b>?",
        kid, sample(rng, notParents, n - 1), mum, "parent");
    }

    // kind === "forms"
    var tf = pick(rng, pool);
    var wrongF = ROCKS.filter(function (r) { return r.name !== tf.name && r.forms !== tf.forms; });
    return finish("🌍 Which one formed like this?<br><i>“" + tf.forms + "”</i>",
      null, sample(rng, wrongF, n - 1), tf, "forms");

    function bandOfObj(r) {
      for (var i = 0; i < BANDS.length; i++) if (BANDS[i].key === r.band) return BANDS[i];
      return BANDS[0];
    }

    function finish(prompt, showRockObj, wrongs, right, kindName) {
      var all = shuffle(rng, wrongs.concat([right]));
      return {
        kind: kindName,
        rock: showRockObj || (kindName === "name" ? right : null),
        showRock: kindName === "name" || !!showRockObj,
        prompt: prompt,
        hintText: kindName === "name"
          ? (tier.hint === "full" ? FAMILY[right.type].glyph + " It's " + articleFor(right.type) + " " + right.type.toLowerCase() + " — " + right.fact
            : tier.hint === "family" ? FAMILY[right.type].glyph + " It's " + articleFor(right.type) + " " + right.type.toLowerCase() + "."
              : "")
          : "",
        options: all.map(function (r) {
          return { text: r.name, rock: r, correct: r.name === right.name };
        }),
        answerText: right.name,
        answerRock: right,
        explainFor: function (o) {
          if (!o || !o.rock) return "";
          return explainDiff(o.rock, right);
        }
      };
    }
  }

  function articleFor(type) { return type === "Igneous" ? "an" : "a"; }

  // ---- Lab: run a real test on a specimen ------------------------
  function runTest(rock, testKey) {
    var tool = null;
    for (var i = 0; i < TOOLS.length; i++) if (TOOLS[i].key === testKey) tool = TOOLS[i];
    if (tool) {
      if (tool.h > rock.mohs) return tool.label + " scratches it. ✔️";
      if (tool.h === rock.mohs) return tool.label + " only just marks it. 🤏";
      return tool.label + " leaves no mark. ✖️";
    }
    switch (testKey) {
      case "streak": return rock.streak
        ? "Streak plate: it leaves a <b>" + rock.streak.toLowerCase() + "</b> powder."
        : "Streak plate: it's a rock (a mixture of minerals), so streak isn't a useful test here.";
      case "vinegar": return rock.fizz
        ? "Vinegar: it <b>FIZZES</b> — that means calcite. 🫧"
        : "Vinegar: nothing happens. No fizz.";
      case "magnet": return rock.magnetic
        ? "Magnet: it <b>sticks</b>! 🧲"
        : "Magnet: no pull at all.";
      case "water": return rock.floats
        ? "Water: it <b>floats</b>! 🌊"
        : "Water: it sinks straight down.";
      case "heft": return rock.k.indexOf("t-heavy") >= 0
        ? "Heft: surprisingly <b>heavy</b> for its size. ⚖️"
        : rock.k.indexOf("t-light") >= 0
          ? "Heft: surprisingly <b>light</b> for its size. 🪶"
          : "Heft: about what you'd expect.";
      case "lens": return "Hand lens: " + rock.lustre.toLowerCase() + ". " + rock.breaks + ".";
      default: return "";
    }
  }

  var LAB_TESTS = [
    { key: "lens",    label: "🔍 Hand lens" },
    { key: "nail",    label: "🖐️ Fingernail" },
    { key: "coin",    label: "🪙 Copper coin" },
    { key: "iron",    label: "🔩 Iron nail" },
    { key: "glass",   label: "🪟 Glass plate" },
    { key: "file",    label: "🛠️ Steel file" },
    { key: "streak",  label: "⬜ Streak plate" },
    { key: "vinegar", label: "🍋 Vinegar drop" },
    { key: "magnet",  label: "🧲 Magnet" },
    { key: "water",   label: "🌊 Water tank" },
    { key: "heft",    label: "⚖️ Weigh it" }
  ];

  return {
    ROCKS: ROCKS, BY_NAME: BY_NAME, GROUPS: GROUPS, BANDS: BANDS, TOOLS: TOOLS,
    FAMILY: FAMILY, LOOKALIKES: LOOKALIKES, TIERS: TIERS, LAB_TESTS: LAB_TESTS,
    bandOf: bandOf, bandName: bandName, explainDiff: explainDiff,
    makeQuestion: makeQuestion, runTest: runTest, tierById: tierById,
    shuffle: shuffle
  };
});
