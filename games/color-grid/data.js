/* ===========================================================
   Color Grid Quest — word data
   -----------------------------------------------------------
   These started as Cory's own answers from his hand-drawn
   color/letter grid! Each entry is a word that IS a certain
   colour and STARTS with a certain letter.

   To add more words, just add lines to ENTRIES:
     { c: "green", l: "C", w: "Creeper", e: "🟩" }

   c    = colour key (must match a key in COLORS below)
   l    = the letter it starts with (CAPITAL)
   w    = the word
   e    = an emoji (optional — leave it out if there's no good one)
   also = OTHER colours this thing really can be (optional).
          The Colour Detective quiz marks any of them correct, so
          a kid who says an apple is green isn't told they're wrong.
   =========================================================== */

const COLORS = {
  red:    { name: "Red",    hex: "#e23b3b", dark: false },
  orange: { name: "Orange", hex: "#f4892b", dark: false },
  yellow: { name: "Yellow", hex: "#ffd23f", dark: true  },
  green:  { name: "Green",  hex: "#3aa84a", dark: false },
  blue:   { name: "Blue",   hex: "#2b8cff", dark: false },
  purple: { name: "Purple", hex: "#9b3fc4", dark: false },
  pink:   { name: "Pink",   hex: "#ff6fa5", dark: false },
  white:  { name: "White",  hex: "#f3f3f6", dark: true  },
  black:  { name: "Black",  hex: "#3a3a3a", dark: false },
  brown:  { name: "Brown",  hex: "#8a5a3c", dark: false }
};

const ENTRIES = [
  // --- RED ---
  { c: "red", l: "A", w: "Apple",      e: "🍎", also: ["green", "yellow"] },
  { c: "red", l: "B", w: "Blood",      e: "🩸" },
  { c: "red", l: "C", w: "Cherry",     e: "🍒" },
  { c: "red", l: "E", w: "Elmo",       e: "🔴" },
  { c: "red", l: "F", w: "Fire Truck", e: "🚒" },
  { c: "red", l: "H", w: "Heart",      e: "❤️", also: ["pink"] },
  { c: "red", l: "L", w: "Ladybug",    e: "🐞" },
  { c: "red", l: "M", w: "Mars",       e: "🔴" },
  { c: "red", l: "R", w: "Redstone",   e: "🔴" },
  { c: "red", l: "R", w: "Ruby",       e: "💎" },
  { c: "red", l: "S", w: "Spider-Man", e: "🕷️" },
  { c: "red", l: "T", w: "Tomato",     e: "🍅", also: ["green"] },
  { c: "red", l: "W", w: "Wine",       e: "🍷" },

  // --- ORANGE ---
  { c: "orange", l: "A", w: "Apricot",           e: "🍑" },
  { c: "orange", l: "B", w: "Basketball",        e: "🏀" },
  { c: "orange", l: "B", w: "Brick",             e: "🧱", also: ["red"] },
  { c: "orange", l: "C", w: "Carrot",            e: "🥕" },
  { c: "orange", l: "F", w: "Fox",               e: "🦊", also: ["red", "brown"] },
  { c: "orange", l: "G", w: "Goldfish",          e: "🐠" },
  { c: "orange", l: "L", w: "Lava",              e: "🌋", also: ["red"] },
  { c: "orange", l: "M", w: "Monarch Butterfly", e: "🦋" },
  { c: "orange", l: "N", w: "Nectarine",         e: "🍑" },
  { c: "orange", l: "O", w: "Orange",            e: "🍊" },
  { c: "orange", l: "P", w: "Pumpkin",           e: "🎃" },
  { c: "orange", l: "S", w: "Sunset",            e: "🌇", also: ["red", "pink"] },
  { c: "orange", l: "T", w: "Tiger",             e: "🐯" },

  // --- YELLOW ---
  { c: "yellow", l: "A", w: "Amber",        e: "🟡" },
  { c: "yellow", l: "B", w: "Banana",       e: "🍌" },
  { c: "yellow", l: "C", w: "Cheese",       e: "🧀" },
  { c: "yellow", l: "C", w: "Crown",        e: "👑" },
  { c: "yellow", l: "D", w: "Dandelion",    e: "🌼" },
  { c: "yellow", l: "D", w: "Duckling",     e: "🐤" },
  { c: "yellow", l: "F", w: "French Fries", e: "🍟" },
  { c: "yellow", l: "G", w: "Golden Eagle", e: "🦅", also: ["brown"] },
  { c: "yellow", l: "H", w: "Honey",        e: "🍯", also: ["brown"] },
  { c: "yellow", l: "L", w: "Lemon",        e: "🍋" },
  { c: "yellow", l: "P", w: "Pineapple",    e: "🍍" },
  { c: "yellow", l: "Q", w: "Quiche",       e: "🥧", also: ["brown"] },
  { c: "yellow", l: "S", w: "Sun",          e: "☀️", also: ["orange"] },

  // --- GREEN ---
  { c: "green", l: "A", w: "Arborvitae",  e: "🌲" },
  { c: "green", l: "B", w: "Bell Pepper", e: "🫑", also: ["red", "yellow", "orange"] },
  { c: "green", l: "C", w: "Cactus",      e: "🌵" },
  { c: "green", l: "C", w: "Creeper",     e: "🟩" },
  { c: "green", l: "E", w: "Emerald",     e: "💚" },
  { c: "green", l: "F", w: "Frog",        e: "🐸" },
  { c: "green", l: "G", w: "Grass",       e: "🌱" },
  { c: "green", l: "K", w: "Kale",        e: "🥬" },
  { c: "green", l: "L", w: "Lime",        e: "🟢" },
  { c: "green", l: "O", w: "Oscar",       e: "🟢" },
  { c: "green", l: "P", w: "Palm Tree",   e: "🌴", also: ["brown"] },
  { c: "green", l: "S", w: "Swamp",       e: "🐊", also: ["brown"] },
  { c: "green", l: "T", w: "Turtle",      e: "🐢", also: ["brown"] },
  { c: "green", l: "Z", w: "Zombie",      e: "🧟" },

  // --- BLUE ---
  { c: "blue", l: "A", w: "Aquarium",       e: "🐟" },
  { c: "blue", l: "B", w: "Blueberry",      e: "🫐", also: ["purple"] },
  { c: "blue", l: "C", w: "Cookie Monster", e: "🔵" },
  { c: "blue", l: "D", w: "Diamond",        e: "💎", also: ["white"] },
  { c: "blue", l: "E", w: "Earth",          e: "🌍", also: ["green"] },
  { c: "blue", l: "G", w: "Great Lakes",    e: "🌊" },
  { c: "blue", l: "I", w: "Ice",            e: "🧊", also: ["white"] },
  { c: "blue", l: "J", w: "Jeans",          e: "👖" },
  { c: "blue", l: "M", w: "Manatee",        e: "🐳", also: ["brown"] },
  { c: "blue", l: "N", w: "Neptune",        e: "🔵" },
  { c: "blue", l: "S", w: "Sea",            e: "🌊" },
  { c: "blue", l: "U", w: "Uranus",         e: "🔵" },
  { c: "blue", l: "W", w: "Whale",          e: "🐳" },

  // --- PURPLE ---
  { c: "purple", l: "A", w: "Amethyst", e: "💜" },
  { c: "purple", l: "D", w: "Dusk",     e: "🌆", also: ["pink", "orange"] },
  { c: "purple", l: "E", w: "Eggplant", e: "🍆" },
  { c: "purple", l: "G", w: "Grapes",   e: "🍇", also: ["green"] },
  { c: "purple", l: "I", w: "Iris",     e: "🪻" },
  { c: "purple", l: "J", w: "Jelly",    e: "🟣", also: ["red", "pink"] },
  { c: "purple", l: "L", w: "Lilac",    e: "🪻", also: ["pink"] },
  { c: "purple", l: "N", w: "Nebula",   e: "🌌", also: ["pink", "blue"] },
  { c: "purple", l: "O", w: "Octopus",  e: "🐙", also: ["pink", "red"] },
  { c: "purple", l: "P", w: "Plum",     e: "🟣", also: ["red"] },
  { c: "purple", l: "S", w: "Shulker",  e: "🟪" },
  { c: "purple", l: "V", w: "Violet",   e: "🟣" },

  // --- PINK ---
  { c: "pink", l: "A", w: "Axolotl",      e: "🩷" },
  { c: "pink", l: "B", w: "Bubble Gum",   e: "🫧" },
  { c: "pink", l: "C", w: "Cotton Candy", e: "🍬", also: ["blue"] },
  { c: "pink", l: "D", w: "Dawn",         e: "🌅", also: ["orange"] },
  { c: "pink", l: "E", w: "Eraser",       e: "🩹" },
  { c: "pink", l: "F", w: "Flamingo",     e: "🦩" },
  { c: "pink", l: "G", w: "Grapefruit",   e: "🍈", also: ["yellow"] },
  { c: "pink", l: "J", w: "Jellyfish",    e: "🪼", also: ["purple"] },
  { c: "pink", l: "L", w: "Lily",         e: "🌸", also: ["white"] },
  { c: "pink", l: "P", w: "Peony",        e: "🌺" },
  { c: "pink", l: "P", w: "Pig",          e: "🐷" },
  { c: "pink", l: "P", w: "Piglin",       e: "🐽" },
  { c: "pink", l: "R", w: "Ribbon",       e: "🎀", also: ["red"] },
  { c: "pink", l: "T", w: "Tongue",       e: "👅", also: ["red"] },

  // --- WHITE ---
  { c: "white", l: "A", w: "Angel",       e: "👼" },
  { c: "white", l: "C", w: "Cloud",       e: "☁️" },
  { c: "white", l: "E", w: "Egg",         e: "🥚", also: ["brown"] },
  { c: "white", l: "G", w: "Goose",       e: "🦢" },
  { c: "white", l: "I", w: "Igloo",       e: "🛖" },
  { c: "white", l: "M", w: "Marshmallow", e: "🍡" },
  { c: "white", l: "M", w: "Moon",        e: "🌕", also: ["yellow"] },
  { c: "white", l: "P", w: "Paper",       e: "📄" },
  { c: "white", l: "Q", w: "Quartz",      e: "💎", also: ["pink"] },
  { c: "white", l: "S", w: "Sheep",       e: "🐑", also: ["black", "brown"] },
  { c: "white", l: "S", w: "Snow",        e: "❄️" },
  { c: "white", l: "T", w: "Teeth",       e: "🦷" },
  { c: "white", l: "U", w: "Unicorn",     e: "🦄", also: ["pink"] },

  // --- BLACK ---
  { c: "black", l: "A", w: "Asphalt",    e: "🛣️" },
  { c: "black", l: "B", w: "Bat",        e: "🦇", also: ["brown"] },
  { c: "black", l: "B", w: "Blackberry", e: "🫐", also: ["purple"] },
  { c: "black", l: "C", w: "Cow",        e: "🐄", also: ["brown", "white"] },
  { c: "black", l: "E", w: "Elephant",   e: "🐘" },
  { c: "black", l: "G", w: "Gorilla",    e: "🦍" },
  { c: "black", l: "I", w: "Ink",        e: "🖤", also: ["blue"] },
  { c: "black", l: "N", w: "Night",      e: "🌃", also: ["blue"] },
  { c: "black", l: "O", w: "Olives",     e: "🫒", also: ["green"] },
  { c: "black", l: "P", w: "Pepper",     e: "⚫", also: ["red", "green"] },
  { c: "black", l: "S", w: "Stone",      e: "🪨", also: ["white", "brown"] },
  { c: "black", l: "V", w: "Vampire",    e: "🧛" },
  { c: "black", l: "W", w: "Wither",     e: "💀" },
  { c: "black", l: "X", w: "X-ray",      e: "🩻", also: ["white"] },
  { c: "black", l: "Z", w: "Zebra",      e: "🦓", also: ["white"] },

  // --- BROWN ---
  { c: "brown", l: "A", w: "Acorn",      e: "🌰" },
  { c: "brown", l: "B", w: "Bear",       e: "🐻", also: ["black", "white"] },
  { c: "brown", l: "C", w: "Chocolate",  e: "🍫" },
  { c: "brown", l: "C", w: "Coconut",    e: "🥥" },
  { c: "brown", l: "D", w: "Dirt Block", e: "🟫" },
  { c: "brown", l: "G", w: "Gravy",      e: "🟤" },
  { c: "brown", l: "H", w: "Hawk",       e: "🦅" },
  { c: "brown", l: "K", w: "KitKat",     e: "🍫" },
  { c: "brown", l: "M", w: "Mushroom",   e: "🍄", also: ["red", "white"] },
  { c: "brown", l: "O", w: "Owl",        e: "🦉" },
  { c: "brown", l: "P", w: "Peanut",     e: "🥜" },
  { c: "brown", l: "R", w: "Root",       e: "🪵" },
  { c: "brown", l: "T", w: "Trunk",      e: "🪵" },
  { c: "brown", l: "W", w: "Wombat",     e: "🐾" },
  { c: "brown", l: "Y", w: "Yam",        e: "🍠", also: ["orange", "purple"] }
];
