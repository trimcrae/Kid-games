/* ===========================================================
   Number Grid Builder — word data
   -----------------------------------------------------------
   Same idea as the Color Grid, but the columns are NUMBERS:
   a word belongs in column 5 if it HAS 5 letters.

   Nothing here says how long a word is — the game counts the
   letters itself, so a word can never end up in the wrong
   column. To add more starter words just add lines:

     { w: "Creeper", e: "🟩" }
   w = the word
   e = an emoji (optional — leave it out if there's no good one)

   Only A–Z letters are counted, so spaces, dashes and
   apostrophes are free: "Spider-Man" counts as 9.
   =========================================================== */

/* The columns of the grid. `n` is the number of letters;
   the last one (10) is really "10 or more". */
const LENGTHS = [
  { n: 2,  label: "2",   hex: "#e23b3b", dark: false },
  { n: 3,  label: "3",   hex: "#f4892b", dark: false },
  { n: 4,  label: "4",   hex: "#ffd23f", dark: true  },
  { n: 5,  label: "5",   hex: "#3aa84a", dark: false },
  { n: 6,  label: "6",   hex: "#2b8cff", dark: false },
  { n: 7,  label: "7",   hex: "#9b3fc4", dark: false },
  { n: 8,  label: "8",   hex: "#ff6fa5", dark: false },
  { n: 9,  label: "9",   hex: "#00a3a3", dark: false },
  { n: 10, label: "10+", hex: "#8a5a3c", dark: false }
];

const ENTRIES = [
  // --- 2 letters ---
  { w: "Ox", e: "🐂" },
  { w: "Ax", e: "🪓" },
  { w: "Up", e: "⬆️" },
  { w: "Pi", e: "🥧" },
  { w: "Hi", e: "👋" },
  { w: "Me", e: "🙋" },

  // --- 3 letters ---
  { w: "Cat", e: "🐱" },
  { w: "Dog", e: "🐶" },
  { w: "Sun", e: "☀️" },
  { w: "Pig", e: "🐷" },
  { w: "Bee", e: "🐝" },
  { w: "Cow", e: "🐄" },
  { w: "Owl", e: "🦉" },
  { w: "Bat", e: "🦇" },
  { w: "Fox", e: "🦊" },
  { w: "Ant", e: "🐜" },
  { w: "Egg", e: "🥚" },
  { w: "Ice", e: "🧊" },
  { w: "Jam", e: "🍯" },
  { w: "Key", e: "🔑" },
  { w: "Map", e: "🗺️" },
  { w: "Net", e: "🥅" },
  { w: "Pie", e: "🥧" },
  { w: "Van", e: "🚐" },
  { w: "Web", e: "🕸️" },
  { w: "Yam", e: "🍠" },
  { w: "Zip", e: "🤐" },
  { w: "Hat", e: "🎩" },
  { w: "Bus", e: "🚌" },

  // --- 4 letters ---
  { w: "Bear", e: "🐻" },
  { w: "Frog", e: "🐸" },
  { w: "Lion", e: "🦁" },
  { w: "Moon", e: "🌕" },
  { w: "Star", e: "⭐" },
  { w: "Fish", e: "🐟" },
  { w: "Cake", e: "🍰" },
  { w: "Duck", e: "🦆" },
  { w: "Corn", e: "🌽" },
  { w: "Rain", e: "🌧️" },
  { w: "Tree", e: "🌳" },
  { w: "Wolf", e: "🐺" },
  { w: "Kite", e: "🪁" },
  { w: "Crab", e: "🦀" },
  { w: "Goat", e: "🐐" },
  { w: "Iron", e: "🔩" },
  { w: "Jeep", e: "🚙" },
  { w: "Ship", e: "🚢" },
  { w: "Book", e: "📚" },
  { w: "Drum", e: "🥁" },
  { w: "Quiz", e: "❓" },
  { w: "X-ray", e: "🩻" },

  // --- 5 letters ---
  { w: "Apple", e: "🍎" },
  { w: "Tiger", e: "🐯" },
  { w: "Zebra", e: "🦓" },
  { w: "Horse", e: "🐴" },
  { w: "Snake", e: "🐍" },
  { w: "Mouse", e: "🐭" },
  { w: "Whale", e: "🐳" },
  { w: "Beach", e: "🏖️" },
  { w: "Pizza", e: "🍕" },
  { w: "Robot", e: "🤖" },
  { w: "Candy", e: "🍬" },
  { w: "Ghost", e: "👻" },
  { w: "Igloo", e: "🛖" },
  { w: "Lemon", e: "🍋" },
  { w: "Ocean", e: "🌊" },
  { w: "Piano", e: "🎹" },
  { w: "Queen", e: "👑" },
  { w: "River", e: "🏞️" },
  { w: "Sheep", e: "🐑" },
  { w: "Train", e: "🚂" },
  { w: "Watch", e: "⌚" },
  { w: "Grape", e: "🍇" },
  { w: "Quilt", e: "🧵" },
  { w: "Nurse", e: "👩‍⚕️" },

  // --- 6 letters ---
  { w: "Banana", e: "🍌" },
  { w: "Carrot", e: "🥕" },
  { w: "Donkey", e: "🫏" },
  { w: "Flower", e: "🌸" },
  { w: "Guitar", e: "🎸" },
  { w: "Hammer", e: "🔨" },
  { w: "Jungle", e: "🌴" },
  { w: "Kitten", e: "🐈" },
  { w: "Monkey", e: "🐵" },
  { w: "Orange", e: "🍊" },
  { w: "Parrot", e: "🦜" },
  { w: "Rabbit", e: "🐰" },
  { w: "Rocket", e: "🚀" },
  { w: "Spider", e: "🕷️" },
  { w: "Turtle", e: "🐢" },
  { w: "Violin", e: "🎻" },
  { w: "Walrus", e: "🦭" },
  { w: "Cheese", e: "🧀" },
  { w: "Castle", e: "🏰" },
  { w: "Dragon", e: "🐉" },
  { w: "Pencil", e: "✏️" },
  { w: "Yogurt", e: "🥛" },
  { w: "Zipper", e: "🤐" },

  // --- 7 letters ---
  { w: "Balloon", e: "🎈" },
  { w: "Cupcake", e: "🧁" },
  { w: "Dolphin", e: "🐬" },
  { w: "Giraffe", e: "🦒" },
  { w: "Hamster", e: "🐹" },
  { w: "Iceberg", e: "🧊" },
  { w: "Leopard", e: "🐆" },
  { w: "Monster", e: "👾" },
  { w: "Octopus", e: "🐙" },
  { w: "Penguin", e: "🐧" },
  { w: "Rainbow", e: "🌈" },
  { w: "Volcano", e: "🌋" },
  { w: "Unicorn", e: "🦄" },
  { w: "Peacock", e: "🦚" },
  { w: "Pumpkin", e: "🎃" },
  { w: "Diamond", e: "💎" },
  { w: "Vulture", e: "🦅" },

  // --- 8 letters ---
  { w: "Dinosaur", e: "🦕" },
  { w: "Elephant", e: "🐘" },
  { w: "Kangaroo", e: "🦘" },
  { w: "Mushroom", e: "🍄" },
  { w: "Squirrel", e: "🐿️" },
  { w: "Sandwich", e: "🥪" },
  { w: "Baseball", e: "⚾" },
  { w: "Notebook", e: "📓" },
  { w: "Football", e: "🏈" },
  { w: "Tortoise", e: "🐢" },
  { w: "Reindeer", e: "🦌" },
  { w: "Sunshine", e: "🌞" },
  { w: "Airplane", e: "✈️" },
  { w: "Computer", e: "💻" },
  { w: "Hedgehog", e: "🦔" },
  { w: "Lollipop", e: "🍭" },
  { w: "Umbrella", e: "☂️" },
  { w: "Zucchini", e: "🥒" },

  // --- 9 letters ---
  { w: "Astronaut", e: "👩‍🚀" },
  { w: "Butterfly", e: "🦋" },
  { w: "Crocodile", e: "🐊" },
  { w: "Chocolate", e: "🍫" },
  { w: "Jellyfish", e: "🪼" },
  { w: "Pineapple", e: "🍍" },
  { w: "Waterfall", e: "🏞️" },
  { w: "Telescope", e: "🔭" },
  { w: "Blueberry", e: "🫐" },
  { w: "Spaceship", e: "🚀" },
  { w: "Xylophone", e: "🎼" },
  { w: "Dandelion", e: "🌼" },
  { w: "Alligator", e: "🐊" },
  { w: "Raspberry", e: "🍇" },

  // --- 10 or more letters ---
  { w: "Trampoline", e: "🤸" },
  { w: "Strawberry", e: "🍓" },
  { w: "Helicopter", e: "🚁" },
  { w: "Watermelon", e: "🍉" },
  { w: "Basketball", e: "🏀" },
  { w: "Rhinoceros", e: "🦏" },
  { w: "Skateboard", e: "🛹" },
  { w: "Playground", e: "🛝" },
  { w: "Toothbrush", e: "🪥" },
  { w: "Caterpillar", e: "🐛" },
  { w: "Grasshopper", e: "🦗" },
  { w: "Marshmallow", e: "🍡" },
  { w: "Firefighter", e: "🧑‍🚒" },
  { w: "Hippopotamus", e: "🦛" },
  { w: "Cheeseburger", e: "🍔" },
  { w: "Thunderstorm", e: "⛈️" }
];
