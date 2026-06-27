/* ===========================================================
   Color Grid Quest — word data
   -----------------------------------------------------------
   These are Cory's own answers from his hand-drawn color/letter
   grid! Each entry is a word that IS a certain colour and STARTS
   with a certain letter.

   To add more words, just add lines to ENTRIES:
     { c: "green", l: "C", w: "Creeper", e: "🟩" }
   c = colour key (must match a key in COLORS below)
   l = the letter it starts with (CAPITAL)
   w = the word
   e = an emoji (optional — leave it out if there's no good one)
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
  { c: "red", l: "A", w: "Apple",      e: "🍎" },
  { c: "red", l: "B", w: "Blood",      e: "🩸" },
  { c: "red", l: "C", w: "Cherry",     e: "🍒" },
  { c: "red", l: "E", w: "Elmo",       e: "🔴" },
  { c: "red", l: "L", w: "Ladybug",    e: "🐞" },
  { c: "red", l: "M", w: "Mars",       e: "🔴" },
  { c: "red", l: "R", w: "Ruby",       e: "💎" },
  { c: "red", l: "S", w: "Spider-Man", e: "🕷️" },
  { c: "red", l: "T", w: "Tomato",     e: "🍅" },
  { c: "red", l: "W", w: "Wine",       e: "🍷" },

  // --- ORANGE ---
  { c: "orange", l: "A", w: "Apricot",          e: "🍑" },
  { c: "orange", l: "B", w: "Brick",            e: "🧱" },
  { c: "orange", l: "C", w: "Carrot",           e: "🥕" },
  { c: "orange", l: "F", w: "Fox",              e: "🦊" },
  { c: "orange", l: "G", w: "Goldfish",         e: "🐠" },
  { c: "orange", l: "M", w: "Monarch Butterfly", e: "🦋" },
  { c: "orange", l: "N", w: "Nectarine",        e: "🍑" },
  { c: "orange", l: "O", w: "Orange",           e: "🍊" },
  { c: "orange", l: "T", w: "Tiger",            e: "🐯" },

  // --- YELLOW ---
  { c: "yellow", l: "A", w: "Amber",        e: "🟡" },
  { c: "yellow", l: "B", w: "Banana",       e: "🍌" },
  { c: "yellow", l: "C", w: "Crown",        e: "👑" },
  { c: "yellow", l: "D", w: "Dandelion",    e: "🌼" },
  { c: "yellow", l: "F", w: "French Fries", e: "🍟" },
  { c: "yellow", l: "G", w: "Golden Eagle", e: "🦅" },
  { c: "yellow", l: "L", w: "Lemon",        e: "🍋" },
  { c: "yellow", l: "P", w: "Pineapple",    e: "🍍" },
  { c: "yellow", l: "S", w: "Sun",          e: "☀️" },

  // --- GREEN ---
  { c: "green", l: "A", w: "Arborvitae",  e: "🌲" },
  { c: "green", l: "B", w: "Bell Pepper", e: "🫑" },
  { c: "green", l: "C", w: "Creeper",     e: "🟩" },
  { c: "green", l: "F", w: "Frog",        e: "🐸" },
  { c: "green", l: "G", w: "Grass",       e: "🌱" },
  { c: "green", l: "K", w: "Kale",        e: "🥬" },
  { c: "green", l: "L", w: "Lime",        e: "🟢" },
  { c: "green", l: "O", w: "Oscar",       e: "🟢" },
  { c: "green", l: "P", w: "Palm Tree",   e: "🌴" },
  { c: "green", l: "S", w: "Swamp",       e: "🐊" },

  // --- BLUE ---
  { c: "blue", l: "A", w: "Aquarium",      e: "🐟" },
  { c: "blue", l: "B", w: "Blueberry",     e: "🫐" },
  { c: "blue", l: "C", w: "Cookie Monster", e: "🔵" },
  { c: "blue", l: "E", w: "Earth",         e: "🌍" },
  { c: "blue", l: "G", w: "Great Lakes",   e: "🌊" },
  { c: "blue", l: "M", w: "Manatee",       e: "🐳" },
  { c: "blue", l: "N", w: "Neptune",       e: "🔵" },
  { c: "blue", l: "S", w: "Sea",           e: "🌊" },
  { c: "blue", l: "U", w: "Uranus",        e: "🔵" },
  { c: "blue", l: "W", w: "Whale",         e: "🐳" },

  // --- PURPLE ---
  { c: "purple", l: "A", w: "Amethyst", e: "💜" },
  { c: "purple", l: "E", w: "Eggplant", e: "🍆" },
  { c: "purple", l: "G", w: "Grapes",   e: "🍇" },
  { c: "purple", l: "J", w: "Jelly",    e: "🟣" },
  { c: "purple", l: "L", w: "Lilac",    e: "🪻" },

  // --- PINK ---
  { c: "pink", l: "A", w: "Axolotl",      e: "🩷" },
  { c: "pink", l: "B", w: "Bubble Gum",   e: "🫧" },
  { c: "pink", l: "C", w: "Cotton Candy", e: "🍬" },
  { c: "pink", l: "D", w: "Dawn",         e: "🌅" },
  { c: "pink", l: "E", w: "Eraser",       e: "🩹" },
  { c: "pink", l: "F", w: "Flamingo",     e: "🦩" },
  { c: "pink", l: "G", w: "Grapefruit",   e: "🍈" },
  { c: "pink", l: "J", w: "Jellyfish",    e: "🪼" },
  { c: "pink", l: "L", w: "Lily",         e: "🌸" },
  { c: "pink", l: "P", w: "Peony",        e: "🌺" },
  { c: "pink", l: "P", w: "Pig",          e: "🐷" },
  { c: "pink", l: "T", w: "Tongue",       e: "👅" },

  // --- WHITE ---
  { c: "white", l: "A", w: "Angel",       e: "👼" },
  { c: "white", l: "C", w: "Cloud",       e: "☁️" },
  { c: "white", l: "E", w: "Egg",         e: "🥚" },
  { c: "white", l: "G", w: "Goose",       e: "🦢" },
  { c: "white", l: "I", w: "Igloo",       e: "🛖" },
  { c: "white", l: "M", w: "Marshmallow", e: "🍡" },
  { c: "white", l: "M", w: "Moon",        e: "🌕" },
  { c: "white", l: "P", w: "Paper",       e: "📄" },
  { c: "white", l: "S", w: "Sheep",       e: "🐑" },
  { c: "white", l: "T", w: "Teeth",       e: "🦷" },
  { c: "white", l: "U", w: "Unicorn",     e: "🦄" },

  // --- BLACK ---
  { c: "black", l: "A", w: "Asphalt",    e: "🛣️" },
  { c: "black", l: "B", w: "Blackberry", e: "🫐" },
  { c: "black", l: "C", w: "Cow",        e: "🐄" },
  { c: "black", l: "E", w: "Elephant",   e: "🐘" },
  { c: "black", l: "G", w: "Gorilla",    e: "🦍" },
  { c: "black", l: "O", w: "Olives",     e: "🫒" },
  { c: "black", l: "P", w: "Pepper",     e: "⚫" },
  { c: "black", l: "S", w: "Stone",      e: "🪨" },
  { c: "black", l: "V", w: "Vampire",    e: "🧛" },
  { c: "black", l: "W", w: "Wither",     e: "💀" },
  { c: "black", l: "Z", w: "Zebra",      e: "🦓" },

  // --- BROWN ---
  { c: "brown", l: "B", w: "Bear",     e: "🐻" },
  { c: "brown", l: "C", w: "Coconut",  e: "🥥" },
  { c: "brown", l: "G", w: "Gravy",    e: "🟤" },
  { c: "brown", l: "H", w: "Hawk",     e: "🦅" },
  { c: "brown", l: "K", w: "KitKat",   e: "🍫" },
  { c: "brown", l: "M", w: "Mushroom", e: "🍄" },
  { c: "brown", l: "P", w: "Peanut",   e: "🥜" },
  { c: "brown", l: "R", w: "Root",     e: "🪵" },
  { c: "brown", l: "T", w: "Trunk",    e: "🪵" },
  { c: "brown", l: "W", w: "Wombat",   e: "🐾" },
  { c: "brown", l: "Y", w: "Yam",      e: "🍠" }
];
