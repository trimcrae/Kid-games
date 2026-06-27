/* ===========================================================
   Choose Your Own Adventure — STORY DATA
   -----------------------------------------------------------
   Each story is a little "map" of nodes. The engine shows a
   node's picture + words, reads them aloud, then shows the
   CHOICE buttons. Tapping a choice jumps to another node.

   A node with no `choices` is an ENDING (shows ⭐ The End).
   Every path leads somewhere happy.

   story = {
     id, title, emoji, color, ages, who, teaches, blurb,
     cover: ()=>svg,          // picture for the library card
     start: "node-id",
     nodes: {
       id: {
         art: ()=>svg,        // the scene (viewBox 0 0 400 300)
         text: "what happens",
         choices: [ {label, to}, ... ]   // omit on endings
         end: "Ending name"   // optional, only on endings
       }
     }
   }
   =========================================================== */
(function () {
  "use strict";
  const A = window.ART;
  const svg = inner => inner; // identity — the engine wraps in <svg>

  /* =======================================================
     1) ELLIE & THE RAINBOW DRAGON  (3+, colours & counting)
     ======================================================= */
  const rainbow = {
    id: "rainbow",
    title: "Ellie & the Rainbow Dragon",
    emoji: "🐉",
    color: "#ff7eb6",
    ages: "3+",
    who: "Ellie",
    teaches: "colours, counting & kindness",
    blurb: "Help a little grey dragon find all its colours!",
    cover: () => A.skyDay({ hills: true }) + A.castle(320, 150, .55) +
      A.dragon({ x: 140, y: 150, scale: 1.3, color: "#b06ad9" }) +
      A.princess({ x: 70, y: 230, scale: 1, dress: "#ff5d8f" }),
    start: "meet",
    nodes: {
      meet: {
        art: () => A.meadow() + A.castle(330, 150, .5) +
          A.dragon({ x: 250, y: 200, scale: 1, color: "#b9b9c4", mood: "sad" }) +
          A.princess({ x: 90, y: 235, scale: 1.05, dress: "#ff5d8f" }),
        text: "Princess Ellie skips through the meadow. A little dragon sits all alone — and it is grey all over! It looks sad.",
        choices: [
          { label: "👋 Wave and say hello", to: "hello" },
          { label: "🌸 Pick it a flower", to: "flower" }
        ]
      },
      flower: {
        art: () => A.meadow() +
          A.dragon({ x: 250, y: 200, scale: 1, color: "#b9b9c4" }) +
          A.princess({ x: 110, y: 235, scale: 1.05, dress: "#ff5d8f" }) +
          A.flower(180, 210, "#ff5d8f"),
        text: "Ellie picks a pink flower and holds it out. The dragon sniffs it and smiles a tiny smile. \"Thank you,\" it whispers.",
        choices: [{ label: "💬 Ask what's wrong", to: "hello" }]
      },
      hello: {
        art: () => A.meadow() +
          A.dragon({ x: 250, y: 200, scale: 1.05, color: "#b9b9c4" }) +
          A.princess({ x: 110, y: 235, scale: 1.05, dress: "#ff5d8f" }),
        text: "\"I lost all my colours,\" sniffs the dragon. \"To get them back, I must eat the rainbow fruit. Which one should we find first?\"",
        choices: [
          { label: "🍎 Red apples", to: "red" },
          { label: "🫐 Blue berries", to: "blue" }
        ]
      },
      red: {
        art: () => A.meadow() +
          A.tree(320, 220, 1.1, "#3bb36a") +
          A.dragon({ x: 220, y: 200, scale: 1.05, color: "#ff6b6b" }) +
          A.princess({ x: 90, y: 235, scale: 1, dress: "#ff5d8f" }) +
          A.flower(150, 250, "#e8584f") + A.flower(185, 258, "#e8584f") + A.flower(120, 258, "#e8584f"),
        text: "They find shiny red apples. Count with Ellie: one… two… three! The dragon gobbles them up and its WINGS turn bright RED! What next?",
        choices: [
          { label: "🍌 Yellow bananas", to: "yellow" },
          { label: "🦋 Fly up now!", to: "flyEarly" }
        ]
      },
      blue: {
        art: () => A.sea({}) /*placeholder*/ ,
        text: "",
        // overwritten below
        choices: []
      },
      yellow: {
        art: () => A.meadow() +
          A.dragon({ x: 220, y: 200, scale: 1.1, color: "#ffd23e" }) +
          A.princess({ x: 90, y: 235, scale: 1, dress: "#ff5d8f" }) +
          A.flower(150, 250, "#ffd166") + A.flower(185, 258, "#ffd166"),
        text: "Sweet yellow bananas! One, two! The dragon's tummy glows sunny YELLOW. Just one more colour to go — let's get green!",
        choices: [{ label: "🌿 Green leaves!", to: "green" }]
      },
      green: {
        art: () => A.forest() +
          A.dragon({ x: 210, y: 210, scale: 1.15, color: "#7ed957" }),
        text: "Crunchy green leaves make the dragon's tail GREEN. Red, yellow, green… Ellie claps. \"You're almost a rainbow! Ready to FLY?\"",
        choices: [{ label: "🌈 Yes — fly to the rainbow!", to: "rainbowEnd" }]
      },
      flyEarly: {
        art: () => A.skyDay({}) + A.cloud(120, 120, 1) + A.cloud(300, 90, .8) +
          A.dragon({ x: 200, y: 160, scale: 1.3, color: "#ff6b6b" }) +
          A.princess({ x: 200, y: 150, scale: .7, dress: "#ff5d8f", crown: true }),
        text: "Ellie hops on and the red dragon soars over the clouds! It isn't a whole rainbow yet — but flying with a friend is the best feeling in the world. ❤️",
        end: "A Red Sky Ride"
      },
      rainbowEnd: {
        art: () => A.skyDay({ sun: true }) + A.cloud(90, 90, .9) + A.cloud(320, 70, .8) +
          A.castle(330, 250, .5) +
          `<path d="M40 280 A 180 180 0 0 1 360 280" fill="none" stroke="#ff5d8f" stroke-width="9"/>
           <path d="M40 290 A 170 170 0 0 1 360 290" fill="none" stroke="#ffd166" stroke-width="9"/>
           <path d="M40 300 A 160 160 0 0 1 360 300" fill="none" stroke="#7ed957" stroke-width="9"/>` +
          A.dragon({ x: 200, y: 150, scale: 1.4, color: "#b06ad9" }) +
          A.princess({ x: 200, y: 140, scale: .7, dress: "#ff5d8f", crown: true }),
        text: "WHOOSH! Every colour swirls together and the dragon shines like a RAINBOW! Ellie rides it over the castle while everyone cheers. What a sparkly day! 🌈",
        end: "Rainbow Flight"
      }
    }
  };
  // fill the blue branch (kept here so the apples/berries read symmetrically)
  rainbow.nodes.blue = {
    art: () => A.meadow() +
      A.dragon({ x: 220, y: 200, scale: 1.05, color: "#5aa9ff" }) +
      A.princess({ x: 90, y: 235, scale: 1, dress: "#ff5d8f" }) +
      A.flower(150, 252, "#4a8fe0") + A.flower(185, 258, "#4a8fe0") + A.flower(120, 258, "#4a8fe0"),
    text: "They find a bush of blueberries. Count them: one… two… three! Munch munch — the dragon's tail turns deep BLUE! What colour next?",
    choices: [
      { label: "🍌 Yellow bananas", to: "yellow" },
      { label: "🍎 Red apples", to: "red" }
    ]
  };

  /* =======================================================
     2) BLOCK WORLD: THE DIAMOND QUEST (6+, logic & counting)
     ======================================================= */
  const blockworld = {
    id: "blockworld",
    title: "Block World: Diamond Quest",
    emoji: "⛏️",
    color: "#5cb85c",
    ages: "6+",
    who: "Cory",
    teaches: "planning, counting & logic",
    blurb: "Mine, build and explore a blocky world — Cory style!",
    cover: () => A.skyDay({ hills: false }) + A.grassBlocks(180) +
      A.boy({ x: 120, y: 175, scale: 1.1, shirt: "#4a8fe0" }) +
      A.diamond(300, 140, 1.6) + A.pickaxe(300, 200, 1.2),
    start: "spawn",
    nodes: {
      spawn: {
        art: () => A.skyDay({}) + A.grassBlocks(190) +
          A.tree(330, 190, 1, "#2f9e57") +
          A.boy({ x: 110, y: 188, scale: 1.1, shirt: "#4a8fe0" }),
        text: "A new blocky world! The sun is up but night comes fast. Cory needs tools and a safe place. What's the smart first move?",
        choices: [
          { label: "🌳 Chop a tree for wood", to: "wood" },
          { label: "⛏️ Dig straight down", to: "dig" }
        ]
      },
      wood: {
        art: () => A.skyDay({}) + A.grassBlocks(190) +
          A.block(60, 120, 30, "#a06a3a", "#7a4a28") + A.block(90, 120, 30, "#a06a3a", "#7a4a28") +
          A.block(75, 150, 30, "#a06a3a", "#7a4a28") + A.block(105, 150, 30, "#a06a3a", "#7a4a28") +
          A.boy({ x: 230, y: 188, scale: 1.1, shirt: "#4a8fe0" }),
        text: "Chop chop! Cory collects 4 wood blocks and makes a crafting table. With wood you can craft a tool. Which one?",
        choices: [
          { label: "⛏️ Craft a pickaxe (to mine)", to: "pick" },
          { label: "🗡️ Craft a sword (to be brave)", to: "sword" }
        ]
      },
      dig: {
        art: () => A.cave({}) +
          A.boy({ x: 130, y: 210, scale: 1.05, shirt: "#4a8fe0", mood: "surprised" }) +
          A.fizzer({ x: 290, y: 180, scale: 1 }) + A.torch(60, 150),
        text: "Whee — DOWN Cory goes! (Top miner tip: never dig straight down for real!) He lands in a cave… and a green Fizzer goes \"hisssss!\" — but it just wants to play.",
        choices: [
          { label: "🧱 Place blocks to make stairs out", to: "stairs" },
          { label: "🏃 Explore deeper into the cave", to: "deeper" }
        ]
      },
      pick: {
        art: () => A.cave({}) +
          A.boy({ x: 120, y: 210, scale: 1.05, shirt: "#4a8fe0" }) + A.pickaxe(160, 180, 1) +
          `<path d="M250 120 q30 60 0 130 h60 v-130Z" fill="#ff7a3c" opacity=".9"/>` +
          A.diamond(320, 200, 1.3) + A.torch(70, 150),
        text: "Cory mines into the hill and finds a cave. Sparkly DIAMONDS glow on the far side — but a river of orange lava is in the way! He has exactly 3 blocks.",
        choices: [
          { label: "🧱 Build a 3-block bridge over the lava", to: "bridge" },
          { label: "⛏️ Dig a tunnel around the lava", to: "around" }
        ]
      },
      sword: {
        art: () => A.night({ ground: false }) + A.grassBlocks(200) +
          A.boy({ x: 110, y: 196, scale: 1.05, shirt: "#4a8fe0" }) +
          A.fizzer({ x: 290, y: 188, scale: 1.05 }),
        text: "Night falls and a Fizzer wobbles closer. Cory grips his new sword — but the Fizzer looks more lonely than scary. What should he do?",
        choices: [
          { label: "🤫 Sneak away quietly", to: "sneak" },
          { label: "🧱 Build a wall and wait for morning", to: "wall" }
        ]
      },
      bridge: {
        art: () => A.cave({}) +
          A.block(170, 200, 30, "#9a9a9a", "#6a6a6a") + A.block(200, 200, 30, "#9a9a9a", "#6a6a6a") + A.block(230, 200, 30, "#9a9a9a", "#6a6a6a") +
          A.boy({ x: 110, y: 210, scale: 1, shirt: "#4a8fe0" }) +
          A.diamond(320, 200, 1.4),
        text: "One, two, three blocks — the bridge fits perfectly across the lava! Cory taps the diamonds: 1, 2, 3, 4, 5! Five diamonds, just enough for amazing gear.",
        choices: [{ label: "💎 Carry the diamonds home", to: "diamondEnd" }]
      },
      around: {
        art: () => A.cave({}) +
          A.boy({ x: 130, y: 210, scale: 1, shirt: "#4a8fe0" }) +
          A.torch(80, 160) + A.torch(300, 150) + A.diamond(320, 205, 1.3),
        text: "Careful and clever, Cory tunnels around the lava and places torches so it stays bright. Slow and safe wins — he reaches the diamonds with no trouble at all!",
        choices: [{ label: "💎 Carry the diamonds home", to: "diamondEnd" }]
      },
      stairs: {
        art: () => A.cave({}) +
          A.block(150, 210, 30, "#a06a3a", "#7a4a28") + A.block(180, 180, 30, "#a06a3a", "#7a4a28") + A.block(210, 150, 30, "#a06a3a", "#7a4a28") +
          A.boy({ x: 120, y: 215, scale: 1, shirt: "#4a8fe0" }),
        text: "Step by step, Cory builds a staircase of blocks back up to the daylight. Smart thinking gets you out of any hole!",
        choices: [{ label: "🏠 Build a cosy house up top", to: "houseEnd" }]
      },
      deeper: {
        art: () => A.cave({}) +
          A.mushroom(60, 220, "#5aa9ff") + A.mushroom(330, 230, "#a368d8") +
          A.boy({ x: 150, y: 215, scale: 1, shirt: "#4a8fe0" }) +
          A.puppy({ x: 250, y: 215, scale: .9, color: "#9a9a9a" }) + A.torch(90, 160),
        text: "Deeper down, glowing mushrooms light a secret room — and a shivering little wolf is lost in the dark! Cory shares a bone he crafted from bones.",
        choices: [{ label: "🐺 Tame the wolf as a friend", to: "wolfEnd" }]
      },
      sneak: {
        art: () => A.skyDay({}) + A.grassBlocks(200) +
          A.castle(320, 200, .42) +
          A.boy({ x: 120, y: 196, scale: 1, shirt: "#4a8fe0" }),
        text: "Tip-toe… tip-toe… Cory slips away safe. At dawn he spots a friendly village and trades his wood for fresh bread and a shiny map. Adventure ahead!",
        end: "Village Explorer"
      },
      wall: {
        art: () => A.skySunset({}) + A.grassBlocks(200) +
          `<g>${A.block(250, 140, 30, "#9a9a9a", "#6a6a6a")}${A.block(250, 170, 30, "#9a9a9a", "#6a6a6a")}${A.block(280, 140, 30, "#9a9a9a", "#6a6a6a")}${A.block(280, 170, 30, "#9a9a9a", "#6a6a6a")}</g>` +
          A.boy({ x: 130, y: 196, scale: 1, shirt: "#4a8fe0" }) +
          A.fizzer({ x: 320, y: 188, scale: .9 }),
        text: "Cory stacks a sturdy wall and waits cosily till sunrise. The Fizzer waits too — and by morning they're buddies! Being safe AND kind: that's a real pro move.",
        end: "Fizzer's Friend"
      },
      diamondEnd: {
        art: () => A.skyDay({}) + A.grassBlocks(200) +
          A.boy({ x: 130, y: 196, scale: 1.05, shirt: "#4a8fe0" }) +
          A.diamond(250, 150, 1.2) + A.diamond(285, 160, 1.2) + A.diamond(310, 140, 1.2) +
          A.diamond(265, 185, 1.2) + A.diamond(300, 185, 1.2),
        text: "Back in the sunshine with FIVE sparkling diamonds! Cory crafts a diamond pickaxe, a shield, and the coolest blocky castle in the whole world. Quest complete! 💎",
        end: "Diamond Champion"
      },
      houseEnd: {
        art: () => A.skySunset({}) + A.grassBlocks(200) +
          `<g>${A.block(230, 130, 36, "#c98a4a", "#a06a3a")}${A.block(266, 130, 36, "#c98a4a", "#a06a3a")}${A.block(302, 130, 36, "#c98a4a", "#a06a3a")}${A.block(230, 166, 36, "#c98a4a", "#a06a3a")}${A.block(302, 166, 36, "#c98a4a", "#a06a3a")}<rect x="266" y="166" width="36" height="36" fill="#5a3a22"/><path d="M224 130 l60 -28 l60 28Z" fill="#e8584f"/></g>` +
          A.boy({ x: 120, y: 196, scale: 1, shirt: "#4a8fe0" }) + A.torch(190, 175),
        text: "Cory builds a warm little house with a torch by the door. Safe, snug, and ready for tomorrow's adventure. Home sweet blocky home! 🏠",
        end: "Master Builder"
      },
      wolfEnd: {
        art: () => A.skyDay({}) + A.grassBlocks(200) +
          A.boy({ x: 120, y: 196, scale: 1.05, shirt: "#4a8fe0" }) +
          A.puppy({ x: 220, y: 205, scale: 1, color: "#cfcfcf" }),
        text: "The wolf wags its tail — a loyal friend forever! Together they head up to the surface to explore Block World side by side. Best buddies! 🐺",
        end: "Wolf Tamer"
      }
    }
  };

  /* =======================================================
     3) THE WHISPERING LIBRARY (7+, vocabulary & spelling)
     ======================================================= */
  const libraryStory = {
    id: "library",
    title: "The Whispering Library",
    emoji: "📚",
    color: "#a368d8",
    ages: "7+",
    who: "Jeannie",
    teaches: "vocabulary, spelling & reasoning",
    blurb: "Solve the mystery of the books that vanish each night!",
    cover: () => A.library({}) +
      A.princess({ x: 200, y: 250, scale: 1.05, dress: "#a368d8", hair: "#3a2a1a" }) +
      `<text x="200" y="40" font-size="26" text-anchor="middle" fill="#ffd166">🔍</text>`,
    start: "case",
    nodes: {
      case: {
        art: () => A.library({}) +
          A.princess({ x: 120, y: 255, scale: 1.05, dress: "#a368d8", hair: "#3a2a1a" }) +
          `<rect x="250" y="150" width="110" height="58" rx="4" fill="#1a1008"/>`,
        text: "Every morning, books VANISH from the old library — gone without a trace. Detective Jeannie takes the case. (To vanish means to disappear completely.) A trail of glowing letters drifts in the air.",
        choices: [
          { label: "🔦 Follow the glowing letters", to: "trail" },
          { label: "🦉 Ask Professor Hoot the owl", to: "hoot" }
        ]
      },
      trail: {
        art: () => A.library({}) +
          `<g font-size="30" font-weight="bold" fill="#ffe066" text-anchor="middle">
            <text x="90" y="130">S</text><text x="140" y="120">E</text><text x="190" y="135">C</text>
            <text x="240" y="118">R</text><text x="290" y="132">?</text><text x="340" y="122">T</text></g>` +
          A.princess({ x: 130, y: 258, scale: .95, dress: "#a368d8", hair: "#3a2a1a" }),
        text: "The letters spell a word with one missing: S · E · C · R · _ · T. Jeannie whispers it aloud. Which letter completes the word SECRET?",
        choices: [
          { label: "Letter A", to: "trailWrong" },
          { label: "Letter E", to: "door" },
          { label: "Letter I", to: "trailWrong" }
        ]
      },
      trailWrong: {
        art: () => A.library({}) +
          A.princess({ x: 180, y: 258, scale: 1, dress: "#a368d8", hair: "#3a2a1a", mood: "surprised" }),
        text: "Hmm, that doesn't sound right. Say it slowly: SEC-R-E-T. The missing letter makes the 'eh' sound. Try once more!",
        choices: [{ label: "↩️ Look at the letters again", to: "trail" }]
      },
      hoot: {
        art: () => A.library({}) +
          A.owl({ x: 290, y: 150, scale: 1.5 }) +
          A.princess({ x: 110, y: 258, scale: .95, dress: "#a368d8", hair: "#3a2a1a" }),
        text: "\"Whooo took the books?\" hoots the wise owl. \"The thief is NOCTURNAL — that means awake at night while we sleep. Search the dark Reading Nook behind the velvet curtain.\"",
        choices: [{ label: "🚪 Open the hidden door", to: "door" }]
      },
      door: {
        art: () => `<rect width="400" height="300" fill="#1c130a"/>` +
          `<rect x="150" y="60" width="120" height="200" rx="8" fill="#3a2718" stroke="#6b4a2f" stroke-width="4"/>
           <circle cx="250" cy="160" r="6" fill="#ffd166"/>
           <path d="M170 70 q40 -16 80 0 v6 q-40 -14 -80 0Z" fill="#ffe066" opacity=".5"/>` +
          A.princess({ x: 90, y: 250, scale: .95, dress: "#a368d8", hair: "#3a2a1a" }),
        text: "Behind the curtain, a tiny golden door glows. Jeannie peeks inside — and gasps! A small creature in a pointy hat sits reading by candlelight, surrounded by ALL the missing books.",
        choices: [
          { label: "👋 Say hello, kindly", to: "hello" },
          { label: "📖 Read a story aloud to it", to: "readAloud" }
        ]
      },
      hello: {
        art: () => A.library({}) +
          A.princess({ x: 110, y: 255, scale: 1, dress: "#a368d8", hair: "#3a2a1a" }) +
          `<g transform="translate(280 210)"><ellipse cx="0" cy="6" rx="20" ry="22" fill="#6fb86f"/>
            <path d="M-16 -14 l16 -26 l16 26Z" fill="#a368d8"/><circle cx="-6" cy="2" r="2.4" fill="#2b2440"/>
            <circle cx="6" cy="2" r="2.4" fill="#2b2440"/><path d="M-5 10 q5 4 10 0" stroke="#2b6e3a" stroke-width="2" fill="none"/></g>`,
        text: "\"I'm the Tome Gnome,\" it squeaks shyly. \"I don't STEAL the books — I just love them SO much I read them all night and tidy them back by dawn. I'm sorry I worried everyone.\"",
        choices: [
          { label: "🌙 Start a night-time Story Club", to: "clubEnd" },
          { label: "📚 Make the gnome the Night Librarian", to: "libEnd" }
        ]
      },
      readAloud: {
        art: () => A.library({}) +
          A.princess({ x: 130, y: 255, scale: 1, dress: "#a368d8", hair: "#3a2a1a" }) +
          `<rect x="150" y="240" width="40" height="28" rx="3" fill="#ffd166" transform="rotate(-8 170 254)"/>`,
        text: "Jeannie opens a book and reads in her warmest voice. The shy creature creeps closer, eyes shining. \"Nobody ever read TO me before,\" it whispers happily. A new friendship begins.",
        choices: [{ label: "🌙 Start a night-time Story Club", to: "clubEnd" }]
      },
      clubEnd: {
        art: () => A.night({ ground: false }) +
          A.library({}).replace('fill="#3a2718"', 'fill="#2a1b3a"') +
          A.princess({ x: 110, y: 255, scale: 1, dress: "#a368d8", hair: "#3a2a1a" }) +
          A.boy({ x: 200, y: 255, scale: .9, shirt: "#4a8fe0" }) +
          A.princess({ x: 290, y: 258, scale: .8, dress: "#ff5d8f" }),
        text: "Mystery solved! Now every night the library hums with cocoa and stories. Jeannie, the Tome Gnome, and friends read together until the moon goes down. Case closed — and everyone's a reader! 🌙📖",
        end: "Story Club Founder"
      },
      libEnd: {
        art: () => A.library({}) +
          A.princess({ x: 120, y: 255, scale: 1, dress: "#a368d8", hair: "#3a2a1a" }) +
          `<g transform="translate(280 215)"><ellipse cx="0" cy="6" rx="20" ry="22" fill="#6fb86f"/>
            <path d="M-16 -14 l16 -26 l16 26Z" fill="#ffd166"/><circle cx="-6" cy="2" r="2.4" fill="#2b2440"/>
            <circle cx="6" cy="2" r="2.4" fill="#2b2440"/></g>`,
        text: "With a tiny badge and a lantern, the Tome Gnome becomes the world's first NIGHT LIBRARIAN — guarding and loving the books while the town sleeps. Jeannie made a friend and solved the case. Brilliant detective work! 🔍",
        end: "Master Detective"
      }
    }
  };

  /* =======================================================
     4) THE GREAT FAMILY CAMPOUT (all ages, togetherness)
     ======================================================= */
  const campout = {
    id: "campout",
    title: "The Great Family Campout",
    emoji: "🏕️",
    color: "#f4791f",
    ages: "All ages",
    who: "the whole family",
    teaches: "nature, teamwork & wonder",
    blurb: "A starry night, s'mores, and a little lost puppy!",
    cover: () => A.night({}) + A.tent(90, 240, 1, "#e8584f") + A.campfire(220, 240, 1.2) +
      A.puppy({ x: 320, y: 245, scale: .9 }),
    start: "camp",
    nodes: {
      camp: {
        art: () => A.night({}) + A.tent(80, 250, .9, "#e8584f") + A.tent(150, 252, .8, "#4a8fe0") +
          A.campfire(210, 250, 1) +
          A.princess({ x: 280, y: 256, scale: .8, dress: "#ff5d8f" }) +
          A.boy({ x: 330, y: 256, scale: .8, shirt: "#3ddc84" }) +
          A.baby({ x: 200, y: 200, scale: .8 }),
        text: "Under a million stars, the whole family sits by the campfire. Suddenly — a tiny WHIMPER comes from the dark woods. Baby Kieran points. What should they do?",
        choices: [
          { label: "🔦 Explore the woods together", to: "explore" },
          { label: "🍫 Stay and make s'mores", to: "smores" }
        ]
      },
      explore: {
        art: () => A.forest().replace('#bff0d8', '#2a3a4a').replace('#e9fff2', '#1a2430') +
          A.princess({ x: 90, y: 250, scale: .85, dress: "#ff5d8f" }) +
          A.boy({ x: 150, y: 252, scale: .85, shirt: "#3ddc84" }) +
          A.puppy({ x: 290, y: 250, scale: .9 }) +
          `<circle cx="120" cy="120" r="50" fill="#ffe066" opacity=".18"/>`,
        text: "Flashlights on! Jeannie and Cory tip-toe between the trees. In a beam of light they find a shivering little PUPPY, all alone. Its big eyes look up at them.",
        choices: [
          { label: "🐶 Scoop it up to keep it warm", to: "warm" },
          { label: "🐾 Follow where it wants to go", to: "follow" }
        ]
      },
      smores: {
        art: () => A.night({}) + A.campfire(200, 250, 1.3) +
          A.smore(120, 220, 1) +
          A.princess({ x: 300, y: 256, scale: .85, dress: "#ff5d8f" }) +
          A.boy({ x: 80, y: 256, scale: .85, shirt: "#3ddc84" }),
        text: "Marshmallows toast to golden brown — squish them with chocolate! Cory counts the stars: 1, 2, 3… too many! An owl hoots (owls are awake at night). Then the puppy trots right into camp.",
        choices: [
          { label: "🌟 Make a wish on a shooting star", to: "wish" },
          { label: "🐶 Help the lost puppy", to: "warm" }
        ]
      },
      follow: {
        art: () => A.forest().replace('#bff0d8', '#2a3a4a').replace('#e9fff2', '#1a2430') +
          A.fox({ x: 270, y: 245, scale: 1 }) +
          A.puppy({ x: 200, y: 250, scale: .85 }) +
          A.princess({ x: 90, y: 252, scale: .8, dress: "#ff5d8f" }),
        text: "The puppy leads them to a cosy den where a gentle FOX family lives! The fox isn't scary at all — it had been keeping the lost puppy safe and warm all night. What kind neighbours!",
        choices: [{ label: "🦊 Thank the fox and head back", to: "foxEnd" }]
      },
      warm: {
        art: () => A.night({}) + A.campfire(220, 250, 1.1) +
          A.puppy({ x: 130, y: 248, scale: 1 }) +
          A.princess({ x: 300, y: 256, scale: .8, dress: "#ff5d8f" }),
        text: "They wrap the puppy in a soft blanket by the fire. It stops shivering and licks Jeannie's nose! There's a little collar with a name tag. Should they check it?",
        choices: [
          { label: "🔖 Read the name tag", to: "tag" },
          { label: "🏡 Search for its family at dawn", to: "tag" }
        ]
      },
      tag: {
        art: () => A.skyDay({}) + A.tent(80, 250, .9, "#e8584f") +
          A.puppy({ x: 200, y: 252, scale: 1 }) +
          A.princess({ x: 280, y: 256, scale: .8, dress: "#ff5d8f" }) +
          A.boy({ x: 130, y: 256, scale: .8, shirt: "#3ddc84" }),
        text: "The tag says \"BISCUIT\" with a campsite number nearby! At sunrise the family walks Biscuit home, where a worried little kid bursts into a huge happy hug. Hooray!",
        choices: [{ label: "🎉 Celebrate the happy reunion", to: "reuniteEnd" }]
      },
      wish: {
        art: () => A.night({}) +
          `<path d="M40 60 L120 100" stroke="#fff3b0" stroke-width="3" stroke-linecap="round"/><circle cx="40" cy="60" r="4" fill="#fff"/>` +
          A.campfire(200, 250, 1.1) +
          A.princess({ x: 300, y: 256, scale: .8, dress: "#ff5d8f" }) +
          A.boy({ x: 90, y: 256, scale: .8, shirt: "#3ddc84" }) +
          A.baby({ x: 200, y: 205, scale: .7 }),
        text: "A shooting star streaks across the sky! Everyone squeezes their eyes shut and wishes together. Cory wishes the puppy finds its home — and in the morning, it does. Some wishes really do come true. 🌠",
        choices: [{ label: "🐶 See the puppy go home", to: "reuniteEnd" }]
      },
      foxEnd: {
        art: () => A.skyDay({}) + A.tent(90, 250, .9, "#e8584f") +
          A.fox({ x: 320, y: 250, scale: .85 }) +
          A.princess({ x: 130, y: 256, scale: .85, dress: "#ff5d8f" }) +
          A.boy({ x: 200, y: 256, scale: .85, shirt: "#3ddc84" }),
        text: "Back at camp, the family tells the tale of the kind woodland fox over breakfast. They learned that wild animals can be gentle and that helping each other is what families — and forests — do best. 🦊",
        end: "Friends of the Forest"
      },
      reuniteEnd: {
        art: () => A.skyDay({}) + A.tent(80, 250, .9, "#e8584f") + A.campfire(160, 252, .8) +
          A.puppy({ x: 230, y: 252, scale: .9 }) +
          A.princess({ x: 300, y: 256, scale: .85, dress: "#ff5d8f" }) +
          A.boy({ x: 120, y: 256, scale: .85, shirt: "#3ddc84" }) +
          A.baby({ x: 200, y: 205, scale: .7 }),
        text: "Biscuit is safely home, and the family heads back to camp for pancakes. Cory, Jeannie, Ellie and baby Kieran all agree: the best part of any adventure is doing it TOGETHER. The End — for now! ❤️",
        end: "Heroes of the Campout"
      }
    }
  };

  /* =======================================================
     5) PIZZA PLANET RESCUE (all ages, silly counting & space)
     ======================================================= */
  const pizza = {
    id: "pizza",
    title: "Pizza Planet Rescue",
    emoji: "🍕",
    color: "#ffb142",
    ages: "All ages",
    who: "everyone",
    teaches: "counting, colours & space facts",
    blurb: "Blast off to feed hungry aliens across the galaxy!",
    cover: () => A.space({}) + A.planet(310, 90, 36, "#e8584f") + A.planet(70, 220, 28, "#4a8fe0", true) +
      A.rocket({ x: 200, y: 170, scale: 1.3, color: "#e8584f", flame: true }),
    start: "launch",
    nodes: {
      launch: {
        art: () => A.space({}) + A.planet(320, 80, 30, "#e8584f") + A.planet(70, 90, 26, "#4a8fe0") +
          A.planet(200, 250, 34, "#ffd166", true) +
          A.rocket({ x: 200, y: 150, scale: 1.2, color: "#e8584f", flame: true }),
        text: "Captain, this is Pizza Control! Three planets full of HUNGRY aliens need lunch. Your pizza rocket is fuelled and ready. Which planet shall we zoom to first?",
        choices: [
          { label: "🔴 The Red Planet", to: "red" },
          { label: "🔵 The Blue Water Planet", to: "blue" }
        ]
      },
      red: {
        art: () => A.space({}) + A.planet(200, 250, 70, "#e8584f") +
          A.rocket({ x: 90, y: 110, scale: .8, color: "#ffd166" }) +
          A.alien({ x: 200, y: 200, scale: 1, color: "#ff9a8f" }) +
          A.alien({ x: 280, y: 215, scale: .8, color: "#ff7a6f" }),
        text: "Touchdown on the Red Planet — it's dusty and red, a bit like Mars! The aliens here have THREE eyes and they're starving. They each want pizza. How shall we top it?",
        choices: [
          { label: "🌶️ Spicy hot-sauce stars", to: "spicy" },
          { label: "🧀 Extra gooey cheese", to: "cheese" }
        ]
      },
      blue: {
        art: () => A.space({}) + A.planet(200, 250, 72, "#4a8fe0") +
          A.rocket({ x: 90, y: 100, scale: .8, color: "#e8584f" }) +
          A.fish({ x: 210, y: 200, scale: 1.1, color: "#9be15d" }) +
          A.fish({ x: 290, y: 220, scale: .8, color: "#ffd166" }),
        text: "Splash! The Blue Planet is ALL water and the aliens are giggly jelly-fish folk who float everywhere. A normal pizza would sink! How do we serve it?",
        choices: [
          { label: "🥏 Toss it like a flying disc", to: "frisbee" },
          { label: "🚤 Float it on a pizza-boat", to: "boat" }
        ]
      },
      spicy: {
        art: () => A.space({}) + A.planet(200, 260, 70, "#e8584f") +
          A.alien({ x: 150, y: 200, scale: 1, color: "#ff9a8f" }) +
          A.alien({ x: 250, y: 205, scale: 1, color: "#ff7a6f" }),
        text: "Spicy star pizza! The three-eyed aliens take a bite and blast happy steam out of their ears like little whistles — TOOT TOOT! \"DELICIOUS!\" they cheer. On to the next stop!",
        choices: [{ label: "🚀 Blast to the last planet", to: "ring" }]
      },
      cheese: {
        art: () => A.space({}) + A.planet(200, 260, 70, "#e8584f") +
          A.alien({ x: 160, y: 200, scale: 1, color: "#ff9a8f" }) +
          A.alien({ x: 250, y: 205, scale: .9, color: "#ff7a6f" }),
        text: "So much gooey cheese it stretches loooong strings! The aliens count their slices: 1, 2, 3, 4, 5 — five each! They do a happy three-eyed wink. Yummy success!",
        choices: [{ label: "🚀 Blast to the last planet", to: "ring" }]
      },
      frisbee: {
        art: () => A.space({}) + A.planet(200, 270, 80, "#4a8fe0") +
          `<circle cx="200" cy="110" r="22" fill="#ffd166" stroke="#e8584f" stroke-width="4"/>` +
          A.fish({ x: 130, y: 200, scale: 1, color: "#9be15d" }) +
          A.fish({ x: 270, y: 210, scale: 1, color: "#ffd166" }),
        text: "WHEE! Captain spins the pizza like a flying disc and the jelly-fish aliens leap and catch slices mid-float. Best pizza game in the galaxy! They wobble with joy.",
        choices: [{ label: "🚀 Blast to the last planet", to: "ring" }]
      },
      boat: {
        art: () => A.space({}) + A.planet(200, 270, 80, "#4a8fe0") +
          `<path d="M170 180 h60 l-10 16 h-40Z" fill="#c98a4a"/><circle cx="200" cy="176" r="12" fill="#ffd166"/>` +
          A.fish({ x: 120, y: 210, scale: 1, color: "#9be15d" }),
        text: "A little pizza-boat sails across the water world, dropping warm slices to every floating alien. Not one slice gets soggy — clever Captain! They blow bubbly thank-yous.",
        choices: [{ label: "🚀 Blast to the last planet", to: "ring" }]
      },
      ring: {
        art: () => A.space({}) + A.planet(200, 150, 60, "#a368d8", true) +
          A.rocket({ x: 90, y: 230, scale: .8, color: "#e8584f", flame: true }),
        text: "Last stop: a purple planet wrapped in shiny RINGS, just like Saturn! Count the rings with me: one, two, three glittering rings. The ring-aliens are throwing a party. Should we join?",
        choices: [
          { label: "🎉 Invite EVERYONE to a pizza party", to: "partyEnd" },
          { label: "🏁 Race home to bake even more", to: "moreEnd" }
        ]
      },
      partyEnd: {
        art: () => A.space({}) + A.planet(330, 70, 24, "#e8584f") + A.planet(60, 80, 22, "#4a8fe0") +
          A.planet(200, 250, 50, "#a368d8", true) +
          A.alien({ x: 110, y: 200, scale: .9, color: "#ff9a8f" }) +
          A.fish({ x: 290, y: 200, scale: 1, color: "#9be15d" }) +
          A.alien({ x: 200, y: 170, scale: 1, color: "#ffd166" }) +
          `<text x="200" y="40" font-size="28" text-anchor="middle">🎉</text>`,
        text: "Captain beams every alien aboard for the BIGGEST space pizza party ever — red ones, blue ones, ringed ones, all sharing slices among the stars. The whole galaxy is full and happy. Mission complete, Captain! 🍕🚀",
        end: "Galactic Pizza Hero"
      },
      moreEnd: {
        art: () => A.space({}) +
          A.planet(70, 220, 30, "#4a8fe0", true) +
          A.rocket({ x: 230, y: 150, scale: 1.3, color: "#e8584f", flame: true }),
        text: "\"There are MORE hungry planets out there!\" Captain zooms home, ovens already glowing, ready to bake a thousand more pizzas. The galaxy will never go hungry on YOUR watch. To infinity… and pepperoni! 🍕",
        end: "Pizza Captain Forever"
      }
    }
  };

  /* ---- export the library, ordered for the picker ---- */
  window.STORIES = [rainbow, campout, pizza, blockworld, libraryStory];
})();
