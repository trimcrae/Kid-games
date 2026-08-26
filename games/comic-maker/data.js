/* ===========================================================
   Comic Maker — STICKERS & SCENES
   -----------------------------------------------------------
   Want more characters or backdrops? Just add to these lists!
   - STICKERS: groups of emoji you can drop into a panel.
   - SCENES:   background gradients for each panel.
   =========================================================== */

const STICKERS = [
  {
    name: "People",
    tab: "🧒",
    items: "🧒 👦 👧 🧑 👩 👨 👵 👴 👶 🦸‍♀️ 🦸‍♂️ 🦹‍♀️ 🦹‍♂️ 🥷 🧙‍♀️ 🧙‍♂️ 🧚‍♀️ 🧛‍♂️ 🧜‍♀️ 🤴 👸 👮‍♀️ 👩‍🚀 👨‍🚀 👩‍🍳 🧑‍🎤 🕵️‍♀️ 🤡"
  },
  {
    name: "Animals",
    tab: "🐶",
    items: "🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🦉 🦇 🐝 🦋 🐢 🐍 🐙 🦕 🦖 🐳 🐬 🐠 🦈 🦄 🐴 🐉"
  },
  {
    name: "Magic",
    tab: "✨",
    items: "🐉 🦄 🧚‍♀️ 🧜‍♀️ 🧞‍♂️ 👻 👽 🤖 👾 🎃 💀 🔮 🗡️ 🛡️ 👑 ⚡ ✨ 🌟 💫 ⭐ 💥 🔥 ❤️ 💔 💤 ❗ ❓ 💬 💭"
  },
  {
    name: "Nature",
    tab: "🌳",
    items: "🌳 🌲 🌴 🌵 🌻 🌹 🌷 🌸 🌼 🍄 🍂 🍁 ☘️ 🌿 🪴 🌈 ⛰️ 🏔️ 🌊 💧 ❄️ ⛄ 🌙 ☀️ ☁️ ⛅ 🌧️ ⛈️ 🌪️ 🌋"
  },
  {
    name: "Places",
    tab: "🏰",
    items: "🏰 🏠 🏡 ⛺ 🏖️ 🗻 🌉 🎡 🎢 🚗 🚕 🚌 🚓 🚒 🚀 🛸 ✈️ 🚁 ⛵ 🚲 🛹 🚦 🚧 🗺️ 🧭 🚪 🪜 🏁"
  },
  {
    name: "Things",
    tab: "🎁",
    items: "🎈 🎁 🎂 🎉 🎊 🪄 💎 🔑 🗝️ 💡 📚 ✏️ 🖍️ 🎨 🎸 🥁 🎺 ⚽ 🏀 🎮 🧩 🧸 🪁 ⏰ 📱 💰 🛒 🔭 🔬 🧪"
  },
  {
    name: "Yummy",
    tab: "🍎",
    items: "🍎 🍌 🍓 🍇 🍉 🍑 🍒 🥕 🌽 🍞 🧀 🍕 🍔 🌭 🌮 🍟 🥨 🍩 🍪 🍰 🧁 🍦 🍭 🍫 🍿 🍯 🥤 ☕ 🧃 🍉"
  },
  {
    name: "Faces",
    tab: "😀",
    items: "😀 😂 😍 😎 🤩 😴 😱 😭 🥺 😡 🤔 🙃 😜 🤗 😇 🤠 🥳 🤫 😬 🤢 🥶 🥵 😈 🤯 😳 🙄 😤 🤤"
  },
  {
    name: "Princess",
    tab: "👑",
    items: "👸 🤴 👗 👠 💃 🕺 👑 💍 🪞 🌹 🦄 🐴 🏰 🎀 💖 💜 💎 🧚‍♀️ 🪄 ✨ 🦢 🕊️ 🍰 🫖 🎂 💐 🌺 👒"
  },
  {
    name: "Blocks",
    tab: "🧱",
    items: "🧱 ⬛ ⬜ 🟫 🟩 🟦 🟨 🟥 🟪 🟧 ⛏️ 🪓 🗡️ 🛡️ 🏹 🧨 💣 🔦 🪟 🚪 📦 🛏️ 🕯️ 🔥 💎 🪙 🐷 🐮 🐔 🕷️ 🧟 💀"
  },
  {
    name: "Space",
    tab: "🚀",
    items: "🚀 🛸 👽 👾 🤖 🪐 🌍 🌑 🌒 🌓 🌔 🌕 ⭐ 🌟 💫 ☄️ 🔭 🧑‍🚀 👩‍🚀 🛰️ 🌌 🌠 🪨 ⚡ 🧲 🔋"
  },
  {
    name: "Under sea",
    tab: "🐠",
    items: "🐠 🐟 🐡 🦈 🐬 🐳 🐋 🐙 🦑 🦐 🦀 🦞 🐚 🪸 🐢 🧜‍♀️ 🧜‍♂️ ⚓ 🚢 ⛵ 🏝️ 🌊 💧 🫧 🗺️ 💰"
  },
  {
    name: "Music",
    tab: "🎵",
    items: "🎵 🎶 🎼 🎤 🎧 🎸 🥁 🎺 🎷 🎻 🪕 🪈 🎹 📻 🔔 📣 🎙️ 💃 🕺 🎫 🎪 🌟"
  },
  {
    name: "Jobs",
    tab: "👩‍⚕️",
    items: "👩‍⚕️ 👨‍⚕️ 👩‍🚒 👨‍🚒 👮‍♀️ 👨‍🌾 👩‍🍳 👨‍🏫 👩‍🔬 👨‍🎨 👩‍✈️ 🧑‍🚀 👷‍♀️ 🕵️‍♂️ 🧑‍⚖️ 💼 🩺 🚒 🚑 🚓 🧰 📚 🎨 ✈️"
  },
  {
    name: "Sports",
    tab: "⚽",
    items: "⚽ 🏀 🏈 ⚾ 🎾 🏐 🏓 🏸 🥅 🥍 🏒 ⛸️ 🛼 🏊‍♀️ 🚴‍♀️ 🤸‍♀️ 🏆 🥇 🥈 🥉 🎯 🎳 🤺 🧗‍♀️ 🏄‍♀️ ⛷️ 🤾‍♀️ 🏇"
  }
];

/* Comic "sound" word-art — tap one to drop a chunky SFX word you can
   re-type, spin and resize. Each has its own bright colour. */
const SFX = [
  { w: "POW!",    c: "#ff3b3b" },
  { w: "BAM!",    c: "#ff8c1a" },
  { w: "ZAP!",    c: "#ffcf1a" },
  { w: "BOOM!",   c: "#8a5cff" },
  { w: "WHAM!",   c: "#2aa7ff" },
  { w: "POP!",    c: "#ff5db1" },
  { w: "ZOOM!",   c: "#27c46b" },
  { w: "CRASH!",  c: "#e23b3b" },
  { w: "KAPOW!",  c: "#b14cff" },
  { w: "SPLASH!", c: "#1d9bf0" },
  { w: "HAHA!",   c: "#ff5db1" },
  { w: "ZZZ…",    c: "#27c46b" },
  { w: "YUM!",    c: "#ff8c1a" },
  { w: "TA-DA!",  c: "#ffcf1a" },
  { w: "OH NO!",  c: "#e23b3b" },
  { w: "WHOOSH!", c: "#2aa7ff" },
  { w: "CREAK…",  c: "#7a4a1f" },
  { w: "DING!",   c: "#ffcf1a" },
  { w: "GASP!",   c: "#b14cff" },
  { w: "THUMP!",  c: "#8a5cff" },
  { w: "YAY!",    c: "#27c46b" },
  { w: "SWOOSH!", c: "#1d9bf0" },
  { w: "CLANG!",  c: "#7a7a7a" },
  { w: "MUNCH!",  c: "#ff8c1a" },
  { w: "SNIFF…",  c: "#b14cff" },
  { w: "RUMBLE…", c: "#7a4a1f" },
  { w: "TWINKLE", c: "#ffcf1a" },
  { w: "EEK!",    c: "#ff5db1" },
  { w: "SLURP!",  c: "#27c46b" },
  { w: "TAP TAP", c: "#2aa7ff" },
  { w: "HOORAY!", c: "#ff3b3b" }
];

/* Paint colours for the Draw tools — tap one to start drawing.
   The first colour is the default brush colour. */
const PAINT_COLORS = [
  "#222222", "#7a7a7a", "#ffffff",
  "#e23b3b", "#ff8c1a", "#ffcf1a",
  "#27c46b", "#2aa7ff", "#1d4ed8",
  "#8a5cff", "#ff5db1", "#7a4a1f",
  "#ffd6a5", "#9bf6ff", "#caffbf"
];

const SCENES = [
  { key: "sky",     name: "Sky",     css: "linear-gradient(#aee3ff, #e9f8ff)" },
  { key: "sunset",  name: "Sunset",  css: "linear-gradient(#ffd16e, #ff7eb3)" },
  { key: "forest",  name: "Forest",  css: "linear-gradient(#c7f2c9, #6fc36f)" },
  { key: "ocean",   name: "Ocean",   css: "linear-gradient(#9fe0ff, #1d7fd6)", dark: true },
  { key: "space",   name: "Space",   css: "linear-gradient(#2b1b5e, #0a0a2a)", dark: true },
  { key: "night",   name: "Night",   css: "linear-gradient(#3a4880, #11163a)", dark: true },
  { key: "castle",  name: "Castle",  css: "linear-gradient(#ecdcff, #b89cff)" },
  { key: "city",    name: "City",    css: "linear-gradient(#d6e6ff, #9bb6e0)" },
  { key: "desert",  name: "Desert",  css: "linear-gradient(#ffe7a8, #f3bf63)" },
  { key: "snow",    name: "Snow",    css: "linear-gradient(#eef8ff, #cfe6f5)" },
  { key: "candy",   name: "Candy",   css: "linear-gradient(#ffd6f0, #fff0c7)" },
  { key: "rainbow", name: "Rainbow", css: "linear-gradient(120deg,#ffadad,#ffd6a5,#fdffb6,#caffbf,#9bf6ff,#bdb2ff)" },
  { key: "beach",   name: "Beach",   css: "linear-gradient(#9fe0ff 55%, #ffe7a8 55%)" },
  { key: "lava",    name: "Volcano", css: "linear-gradient(#5a2a2a, #ff5b1f)", dark: true },
  { key: "meadow",  name: "Meadow",  css: "linear-gradient(#d6f6ff 55%, #8fd97a 55%)" },
  { key: "jungle",  name: "Jungle",  css: "linear-gradient(#bff0a0, #2f7d32)", dark: true },
  { key: "cave",    name: "Cave",    css: "linear-gradient(#4a4a5a, #17171f)", dark: true },
  { key: "school",  name: "School",  css: "linear-gradient(#ffe9c9 60%, #c58f5a 60%)" },
  { key: "home",    name: "Bedroom", css: "linear-gradient(#ffe3f2 62%, #b98a5f 62%)" },
  { key: "moon",    name: "Moon",    css: "linear-gradient(#1a1030 58%, #cfcfd8 58%)", dark: true },
  { key: "deep",    name: "Deep sea",css: "linear-gradient(#1d7fd6, #06264a)", dark: true },
  { key: "storm",   name: "Storm",   css: "linear-gradient(#7f8aa3, #3b4356)", dark: true },
  { key: "spooky",  name: "Spooky",  css: "linear-gradient(#5b3f7a, #1b1030)", dark: true },
  { key: "farm",    name: "Farm",    css: "linear-gradient(#cfe9ff 55%, #a9d96b 55%)" },
  { key: "plain",   name: "Plain",   css: "#ffffff" }
];

/* ===========================================================
   STORY COACH DATA — the "teaching" half of Comic Maker
   -----------------------------------------------------------
   STORY_SPARKS  : ingredients for a random story idea.
   STARTERS      : sentence starters sorted by beginning / middle / end,
                   so a comic actually has a story shape.
   JUICY_WORDS   : vocabulary banks — swap a boring word for a vivid one.
   =========================================================== */

const STORY_SPARKS = {
  who: [
    "a brave little dragon", "a princess who hates dresses", "a robot chef",
    "twin detectives", "a very sleepy cat", "a builder called Cory",
    "a girl who can talk to birds", "a lost baby penguin", "a knight with a wobbly sword",
    "a mermaid who can't swim", "a wizard's clumsy apprentice", "a dog who found a rocket",
    "a fox in a wizard hat", "a giant who is scared of mice", "a bookworm called Jeannie",
    "a unicorn with a broken horn", "three noisy goats", "a snowman who wants summer"
  ],
  where: [
    "in a cave full of diamonds", "on the top of a rainbow", "inside a giant birthday cake",
    "at the bottom of the sea", "in a haunted library", "on a floating island",
    "in a candy forest", "at a castle sleepover", "on the moon",
    "in a jungle nobody has mapped", "in a city made of blocks", "under Grandma's bed",
    "at a very strange school", "on a pirate ship", "inside a video game"
  ],
  problem: [
    "when the lights all went out", "but the door was locked",
    "and then the ground started shaking", "when a giant shadow appeared",
    "but nobody believed them", "and the map blew away in the wind",
    "when the magic stopped working", "but the bridge was broken",
    "and something was snoring in the dark", "when the treasure went missing",
    "but they were late — very late", "and it started to rain marshmallows"
  ],
  ending: [
    "So they made a plan…", "So they asked a friend for help…",
    "So they were brave and tried anyway…", "So they used what was in their pocket…",
    "So they thought really, really hard…", "So they shared it with everyone…"
  ]
};

const STARTERS = {
  begin: [
    "Once upon a time…", "One rainy morning…", "Long, long ago…",
    "It all started when…", "At the edge of the forest…", "Deep under the sea…",
    "On the very first day of…"
  ],
  middle: [
    "But then…", "Suddenly…", "All at once…", "Just when things looked bad…",
    "Meanwhile…", "The next thing they knew…", "So they decided to…",
    "After that…", "Without warning…"
  ],
  end: [
    "Finally…", "In the end…", "And that is how…", "From that day on…",
    "…and they were friends forever.", "…and they never forgot that day.",
    "The End."
  ]
};

const JUICY_WORDS = [
  { name: "Moving words", tab: "🏃", words: "sprinted dashed tiptoed stomped crept galloped tumbled soared wriggled scrambled leapt wandered" },
  { name: "Big words",    tab: "🐘", words: "enormous gigantic massive tiny microscopic towering endless narrow colossal mighty" },
  { name: "Feeling words",tab: "💖", words: "nervous delighted furious puzzled brave lonely curious proud terrified grateful hopeful jealous" },
  { name: "Shiny words",  tab: "✨", words: "shimmering glowing sparkling gleaming dazzling twinkling shadowy misty golden velvet" },
  { name: "Sound words",  tab: "👂", words: "whispered shouted mumbled giggled roared squeaked groaned hollered muttered cheered" },
  { name: "Joining words",tab: "🔗", words: "because suddenly however meanwhile although until instead finally therefore" }
];
