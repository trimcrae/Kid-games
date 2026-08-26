/* ===========================================================
   Choose Your Own Adventure — WORD TREASURE (glossary)
   -----------------------------------------------------------
   Every one of these words really appears in the stories. The
   reader underlines them with a soft dotted line; tapping one
   pops open a kid-sized definition, banks the word in the
   player's "word treasure", and (after an ending) feeds the
   Word Challenge quiz.

   Entry format:
     { w: "headword", d: "kid-friendly meaning", f: [extra forms] }

   `w` plus every string in `f` is matched case-insensitively;
   a trailing "s" and a possessive ('s / ’s) are matched too, so
   most entries need no `f` at all.

   Keep definitions SHORT, concrete and true — Jeannie (7) reads
   them herself and Shannon should not have to correct them.
   =========================================================== */
(function (global) {
  "use strict";

  const WORDS = [
    // --- how people speak & act -------------------------------------
    { w: "announced", d: "Said something out loud so that everybody could hear it.", f: ["announce", "announces", "announcing"] },
    { w: "declared", d: "Said something firmly, as if it were official and settled.", f: ["declare", "declares", "declaring"] },
    { w: "insisted", d: "Said the same thing again and again and would not change their mind.", f: ["insist", "insists", "insisting"] },
    { w: "whispered", d: "Spoke very, very quietly — almost just breath.", f: ["whisper", "whispers", "whispering"] },
    { w: "grumbling", d: "Complaining in a low, muttery voice.", f: ["grumble", "grumbles", "grumbled", "grumpily", "grumpy"] },
    { w: "gasped", d: "Sucked in a quick breath because something surprised you.", f: ["gasp", "gasps", "gasping"] },
    { w: "yawned", d: "Opened your mouth wide because you are sleepy.", f: ["yawn", "yawns", "yawning"] },
    { w: "sniffled", d: "Sniffed with a runny nose, the way you do when you have been crying.", f: ["sniffle", "sniffles", "sniffling", "sniffed"] },
    { w: "proudly", d: "In a way that shows you are really pleased with what you did.", f: ["proud"] },
    { w: "grandly", d: "In a big, showy, important-looking way.", f: ["grand"] },
    { w: "marvels", d: "To be filled with wonder at something amazing.", f: ["marvel", "marvelled", "marveled", "marvelling", "marveling", "marvelously", "marvellously"] },
    { w: "accused", d: "Said out loud that someone did something wrong.", f: ["accuse", "accuses", "accusing"] },
    { w: "perched", d: "Sat right on the edge of something, the way a bird does.", f: ["perch", "perches", "perching"] },
    { w: "lumbers", d: "Walks slowly and heavily, the way a very big animal walks.", f: ["lumber", "lumbered", "lumbering"] },

    // --- describing words -------------------------------------------
    { w: "enormous", d: "Really, REALLY big — much bigger than usual." },
    { w: "magnificent", d: "So grand and beautiful that it makes you say “wow”." },
    { w: "legendary", d: "So famous that people keep telling stories about it for years." },
    { w: "gleaming", d: "Shining bright and clean, like polished gold.", f: ["gleam", "gleams", "gleamed"] },
    { w: "glimmers", d: "Shines with a small, wobbly light — a shy little sparkle.", f: ["glimmer", "glimmered", "glimmering"] },
    { w: "shimmer", d: "To shine with a light that trembles and shifts, like sun on water.", f: ["shimmers", "shimmered", "shimmering"] },
    { w: "sturdy", d: "Strong and solid — it will not break or wobble." },
    { w: "wobbly", d: "Shaky and not steady, tipping side to side.", f: ["wobble", "wobbles", "wobbled"] },
    { w: "ancient", d: "Extremely old — from a time long, long before now." },
    { w: "suspicious", d: "Making you think that something sneaky might be going on.", f: ["suspiciously"] },
    { w: "curious", d: "Really wanting to find out more about something.", f: ["curiously", "curiosity"] },
    { w: "clever", d: "Quick at thinking and good at working things out.", f: ["cleverly"] },
    { w: "gentle", d: "Soft and careful, never rough.", f: ["gently"] },
    { w: "immediately", d: "Right away, with no waiting at all." },
    { w: "definitely", d: "For sure, with no doubt whatsoever." },
    { w: "rightful", d: "Truly belonging to that person, by right." },
    { w: "heroic", d: "Brave and helpful, the way a hero acts.", f: ["heroically"] },
    { w: "delighted", d: "Very, very pleased and happy.", f: ["delight", "delights", "delightful"] },
    { w: "furiously", d: "In a fast, fierce, full-of-feeling way.", f: ["furious"] },

    // --- story & language words --------------------------------------
    { w: "prophecy", d: "A message that tells what is going to happen in the future.", f: ["prophecies"] },
    { w: "oracle", d: "Someone people ask about the future, who answers with riddles and wisdom." },
    { w: "ballad", d: "A long song that tells a whole story from start to finish." },
    { w: "riddle", d: "A puzzling question that is fun to work out.", f: ["riddles"] },
    { w: "myth", d: "A very old story people told long ago, often about gods and heroes.", f: ["myths", "mythos"] },
    { w: "wisdom", d: "Knowing the smart, kind thing to do, learned from experience.", f: ["wise"] },
    { w: "courage", d: "Being brave enough to do a hard thing even when you feel scared.", f: ["courageous"] },
    { w: "scroll", d: "A long sheet of paper rolled into a tube, with writing inside." },
    { w: "quill", d: "A feather sharpened into a pen and dipped in ink to write with.", f: ["quill-pen"] },
    { w: "verse", d: "One chunk of a song or poem — like one paragraph of singing.", f: ["verses"] },
    { w: "signature", d: "Your own name written the special way only you write it.", f: ["signatures", "signed"] },
    { w: "reputation", d: "What most people think of you, based on what you usually do." },

    // --- mystery words ----------------------------------------------
    { w: "detective", d: "Someone whose job is solving mysteries by hunting for clues.", f: ["detectives"] },
    { w: "clue", d: "A little piece of evidence that helps you work out what happened.", f: ["clues"] },
    { w: "evidence", d: "Facts and things you can point at that show what really happened." },
    { w: "alibi", d: "Proof that you were somewhere else when something happened, so it wasn’t you.", f: ["alibis"] },
    { w: "suspect", d: "A person you think MIGHT have done it — but you are not sure yet.", f: ["suspects"] },
    { w: "verdict", d: "The final decision about who did it, once all the clues are in." },
    { w: "portrait", d: "A painting or photo of a person, usually showing their face.", f: ["portraits"] },
    { w: "breadcrumbs", d: "Tiny bits of bread — or little clues dropped to mark the way back.", f: ["breadcrumb"] },

    // --- places & things ---------------------------------------------
    { w: "cellar", d: "A cool, dark room built underneath a house." },
    { w: "cupboard", d: "A cabinet with shelves and a door, for keeping things in.", f: ["cupboards"] },
    { w: "candlestick", d: "A holder that keeps a candle standing up straight.", f: ["candlesticks"] },
    { w: "lantern", d: "A light in a case you can carry, so the wind can’t blow it out.", f: ["lanterns"] },
    { w: "fortress", d: "A strong, thick-walled building made to keep people safe.", f: ["fortresses"] },
    { w: "bunker", d: "A safe shelter with strong walls, often dug underground.", f: ["bunkers"] },
    { w: "temple", d: "A special building where people go to honour their gods.", f: ["temples"] },
    { w: "summit", d: "The very tip-top of a mountain." },
    { w: "crater", d: "A big bowl-shaped hollow in the ground, often punched out by something crashing.", f: ["craters"] },
    { w: "volcano", d: "A mountain with an opening that hot melted rock can burst out of.", f: ["volcanoes", "volcanos"] },
    { w: "geode", d: "A plain-looking rock that is hollow inside and lined with crystals.", f: ["geodes"] },
    { w: "crystal", d: "A hard, clear stone with flat, shiny sides and sharp edges.", f: ["crystals"] },
    { w: "cavern", d: "A very large cave.", f: ["caverns"] },
    { w: "swamp", d: "Soft, soggy ground where the water and the land are mixed together.", f: ["swamps", "swampy"] },
    { w: "reef", d: "A ridge of coral or rock just under the surface of the sea.", f: ["reefs"] },
    { w: "coral", d: "A stony sea-shape built by thousands of tiny animals living together." },
    { w: "treasure", d: "A hoard of precious things, like gold, jewels or something you love.", f: ["treasures"] },
    { w: "anvil", d: "A heavy iron block a blacksmith hammers hot metal on.", f: ["anvils"] },
    { w: "pickaxe", d: "A tool with a pointed metal head, swung to break rock apart.", f: ["pickaxes"] },
    { w: "plank", d: "A long, flat piece of cut wood.", f: ["planks"] },
    { w: "lever", d: "A bar you pull or push to make a machine do something.", f: ["levers"] },
    { w: "engineer", d: "Someone who designs and builds machines that solve problems.", f: ["engineers", "engineering"] },
    { w: "crafting", d: "Making something new by hand out of the materials you have gathered.", f: ["craft", "crafts", "crafted"] },
    { w: "redstone", d: "In Block World, the glowing dust that carries power around, like electricity in a wire." },
    { w: "streamers", d: "Long strips of coloured paper hung up to make a party look festive.", f: ["streamer"] },
    { w: "frosting", d: "The sweet, creamy topping spread over the top of a cake." },
    { w: "fireworks", d: "Bursts of coloured light and bangs set off in the night sky.", f: ["firework"] },

    // --- sky & sea ----------------------------------------------------
    { w: "galaxy", d: "A gigantic swirl of billions of stars travelling through space together.", f: ["galaxies"] },
    { w: "meteor", d: "A lump of space rock that streaks burning-bright through the sky.", f: ["meteors"] },
    { w: "astronaut", d: "A person trained to travel and work out in space.", f: ["astronauts"] },
    { w: "gravity", d: "The invisible pull that holds you down on the ground instead of floating away." },
    { w: "echo", d: "A sound that bounces off something far away and comes back to you.", f: ["echoes", "echoed", "echoing"] },
    { w: "harmony", d: "Different notes sung together that sound lovely side by side.", f: ["harmonies"] },
    { w: "rhythm", d: "The steady beat you can clap along to in music.", f: ["rhythms"] },
    { w: "thunder", d: "The deep rumble you hear after a flash of lightning.", f: ["thunders", "thundered", "thundering"] },
    { w: "pegasus", d: "A magical winged horse from the old Greek myths." },
    { w: "cyclops", d: "A giant from Greek myth with a single eye in the middle of his forehead." }
  ];

  /* Build the lookup: every form -> its entry. */
  const MAP = Object.create(null);
  function add(form, entry) {
    const k = form.toLowerCase();
    if (!MAP[k]) MAP[k] = entry;
  }
  WORDS.forEach(function (e) {
    const forms = [e.w].concat(e.f || []);
    forms.forEach(function (f) {
      add(f, e);
      if (!/s$/i.test(f)) add(f + "s", e);
      add(f + "'s", e);
      add(f + "’s", e);
    });
  });

  /* Look a word up. Handles capitals, possessives and curly quotes. */
  function lookup(raw) {
    if (!raw) return null;
    let k = String(raw).toLowerCase().replace(/[’']s$/, "").replace(/^[^a-z]+|[^a-z-]+$/g, "");
    return MAP[k] || MAP[k.replace(/-.*$/, "")] || null;
  }

  global.GLOSSARY = { words: WORDS, lookup: lookup, size: WORDS.length };
})(window);
