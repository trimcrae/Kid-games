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
  }
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
  { key: "plain",   name: "Plain",   css: "#ffffff" }
];
