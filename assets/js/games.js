/* ===========================================================
   GAME LIST  —  this is the ONLY file you edit to add a game!
   -----------------------------------------------------------
   Every game should TEACH something — counting, letters, spelling,
   shapes, music, geography, logic, etc. Put that in the "blurb".

   To add a new game, copy one block and fill it in:

     {
       title:  "My Cool Game",      // shown on the card
       emoji:  "🚀",                // a fun icon
       blurb:  "Learn X by doing Y",// what it teaches, one sentence
       url:    "games/my-game/",    // folder with its index.html
       ages:   "7+",                // who it's good for
       kids:   ["jeannie","cory"],  // whose "Who's playing?" tab shows it
       color:  "#38b6ff",           // card highlight colour
       ready:  true                 // false = "Coming soon" card
     }

   The newest games go at the TOP of the list.
   =========================================================== */

const GAMES = [
  {
    title: "Number Grid Builder",
    emoji: "🔢",
    blurb: "Like the Color Grid, but with NUMBERS! Guess how many letters your word has, then watch the game count them out — C-A-N-D-Y = 5 — and drop it in the right row and column. Counting, spelling & word length. For Cory & Jeannie!",
    url:   "games/number-grid/",
    ages:  "5+",
    kids:  ["cory","jeannie","ellie"],
    color: "#2b8cff",
    ready: true
  },

  {
    title: "Baby Taps",
    emoji: "👶",
    blurb: "Kieran's game! Giant shapes and animals to bash — every tap pops, sparkles, plays a note and says the word out loud. Colours, shapes, animal sounds & first words. Nothing to lose, nothing to get wrong.",
    url:   "games/baby-taps/",
    ages:  "Babies",
    kids:  ["kieran","ellie"],
    color: "#ffd166",
    ready: true
  },

  {
    title: "Music Lab",
    emoji: "🎹",
    blurb: "A real piano you can play! Learn the note names, echo tunes back by ear, play whole songs as the next key glows, read notes on the staff — and record a tune of your own. For everyone!",
    url:   "games/music-lab/",
    ages:  "3+",
    kids:  ["jeannie","cory","ellie","kieran"],
    color: "#8a5cff",
    ready: true
  },

  {
    title: "World Trek",
    emoji: "🌍",
    blurb: "Tap the seven continents & five oceans on a pixel world map, hunt down all 50 states on the puzzle map, learn their capitals — and read a true fact about every single place. For Jeannie & Cory!",
    url:   "games/world-trek/",
    ages:  "5+",
    kids:  ["jeannie","cory"],
    color: "#3ddc84",
    ready: true
  },

  {
    title: "Rock Detective",
    emoji: "🪨",
    blurb: "Found a cool rock? Tap the clues you see & feel to identify it like a real geologist, browse the illustrated rock book, or take the naming quiz — igneous, sedimentary, metamorphic & minerals. For Jeannie & Cory!",
    url:   "games/rock-detective/",
    ages:  "6+",
    kids:  ["jeannie","cory"],
    color: "#a97c50",
    ready: true
  },

  {
    title: "Unit Converter",
    emoji: "📏",
    blurb: "Type a number and see it in EVERY other unit at once — with the × and ÷ maths shown for each — then win quiz stars guessing things like how many cm make a foot. For Cory!",
    url:   "games/unit-converter/",
    ages:  "6+",
    kids:  ["cory"],
    color: "#38b6ff",
    ready: true
  },

  {
    title: "Family Tree",
    emoji: "🌳",
    blurb: "Grow our family tree! Start with Mom, Dad & the kids, then add grandparents, cousins & more forever — and learn words like nephew, great-grandma & 2nd cousin. One shared tree for everyone — and you can print it as a poster to hang up!",
    url:   "games/family-tree/",
    ages:  "3+",
    kids:  ["jeannie","cory","ellie"],
    color: "#3ddc84",
    ready: true
  },

  {
    title: "Life Lab",
    emoji: "🦠",
    blurb: "Conway's Game of Life! Paint cells that live or die by counting their neighbours — stamp gliders & factories, then invent your own rules in the Rule Lab. Counting, logic & patterns. For Cory!",
    url:   "games/game-of-life/",
    ages:  "6+",
    kids:  ["cory"],
    color: "#3ddc84",
    ready: true
  },

  {
    title: "Mad Libs",
    emoji: "📝",
    blurb: "Give silly words — a noun, a verb, a goofy adjective — then watch them fill a story you've never seen and hear it read aloud! Parts of speech & grammar. For everyone!",
    url:   "games/mad-libs/",
    ages:  "6+",
    kids:  ["jeannie","cory"],
    color: "#ffd166",
    ready: true
  },

  {
    title: "Block Coordinates",
    emoji: "⛏️",
    blurb: "Build pixel-art scenes the Minecraft way! Read (X, Y) coordinates to place blocks on the grid — learn the coordinate plane. For Cory!",
    url:   "games/block-coordinates/",
    ages:  "6+",
    kids:  ["cory"],
    color: "#3ddc84",
    ready: true
  },

  {
    title: "Choose Your Own Adventure",
    emoji: "🗺️",
    blurb: "Branching read-aloud story-books with pictures & voice — YOU pick what happens! Colours, counting, logic, vocabulary & nature. For everyone!",
    url:   "games/adventure/",
    ages:  "3+",
    kids:  ["jeannie","cory","ellie"],
    color: "#8a5cff",
    ready: true
  },

  {
    title: "Money Machine",
    emoji: "💰",
    blurb: "Watch your money grow itself with compound interest! Pick a bank, add savings, chase challenge trophies & learn the Rule of 72 — like If You Made a Million. For Cory!",
    url:   "games/money-machine/",
    ages:  "6+",
    kids:  ["cory"],
    color: "#3ddc84",
    ready: true
  },

  {
    title: "Pumpkin Pies Roster",
    emoji: "🥧",
    blurb: "Coach tool for Shannon — fair Pumpkin Pies soccer line-ups for 2, 4 or 8 periods with even playing time & rotating goalies. Easy to print!",
    url:   "games/soccer-roster/",
    ages:  "Grown-ups",
    kids:  [],
    color: "#f4791f",
    ready: true
  },

  {
    title: "Crossword",
    emoji: "✏️",
    blurb: "Themed mini crosswords — Minecraft, Bluey, Frozen, taekwondo & more. Read a clue, fill the grid! Spelling & vocabulary.",
    url:   "games/crossword/",
    ages:  "6+",
    kids:  ["jeannie","cory"],
    color: "#ff5d8f",
    ready: true
  },

  {
    title: "Word Strands",
    emoji: "🧶",
    blurb: "Trace the hidden theme words through a grid of letters — every letter belongs to a word! Find the golden spangram.",
    url:   "games/strands/",
    ages:  "6+",
    kids:  ["jeannie","cory"],
    color: "#38b6ff",
    ready: true
  },

  {
    title: "Spelling Bee",
    emoji: "🐝",
    blurb: "Make as many words as you can from a honeycomb of letters — every word uses the middle letter! Spelling & vocabulary.",
    url:   "games/spelling-bee/",
    ages:  "6+",
    kids:  ["jeannie"],
    color: "#ffd166",
    ready: true
  },

  {
    title: "Connections",
    emoji: "🔗",
    blurb: "Sort 16 cards into 4 secret groups of 4 — Pokémon, Bluey, books & more. Builds logic & categories!",
    url:   "games/connections/",
    ages:  "6+",
    kids:  ["jeannie","cory"],
    color: "#8a5cff",
    ready: true
  },

  {
    title: "Word Guess",
    emoji: "🟩",
    blurb: "Guess the secret 5-letter word in 6 tries, with colour clues and hints — a kid-friendly Wordle. Spelling & reasoning.",
    url:   "games/word-guess/",
    ages:  "6+",
    kids:  ["jeannie","cory"],
    color: "#3ddc84",
    ready: true
  },

  {
    title: "Math Mob Run",
    emoji: "🏃",
    blurb: "Steer your crew through +, −, ×, ÷ gates across five lands, hit answer streaks to spark COIN FEVER, and smash the brick wall at every finish — mental math on the run, with upgrades & badges that save!",
    url:   "games/math-mob/",
    ages:  "6+",
    kids:  ["cory"],
    color: "#3ddc84",
    ready: true
  },

  {
    title: "Spooky Princess Stories",
    emoji: "👻",
    blurb: "Friendly-spooky read-aloud storybooks starring Ellie & her siblings — tap the pictures to play! For Ellie!",
    url:   "games/spooky-stories/",
    ages:  "3+",
    kids:  ["ellie"],
    color: "#8a5cff",
    ready: true
  },

  {
    title: "Princess Dress-Up",
    emoji: "👑",
    blurb: "Find letters & numbers to dress a princess — letters, numbers & lots of sparkle! For Ellie!",
    url:   "games/princess-dressup/",
    ages:  "3+",
    kids:  ["ellie"],
    color: "#9b3fc4",
    ready: true
  },

  {
    title: "Comic Maker",
    emoji: "💥",
    blurb: "Draw your own graphic novel — paint right in the panels, then add bubbles & captions! For Jeannie!",
    url:   "games/comic-maker/",
    ages:  "6+",
    kids:  ["jeannie"],
    color: "#ff5d8f",
    ready: true
  },

  {
    title: "Number Bubble Pop",
    emoji: "🫧",
    blurb: "Find and pop the matching number — or letter in ABC mode, or count the dots in Dots mode! Practice counting, number & letter recognition. For Ellie!",
    url:   "games/bubble-pop/",
    ages:  "3+",
    kids:  ["ellie"],
    color: "#38b6ff",
    ready: true
  },

  {
    title: "Color Grid Builder",
    emoji: "🌈",
    blurb: "Type your own colour words and watch them fill the grid by their start, middle, or end letter — Cory's idea!",
    url:   "games/color-grid/",
    ages:  "5+",
    kids:  ["cory","ellie"],
    color: "#9b3fc4",
    ready: true
  },

  {
    title: "Word Wizard",
    emoji: "📚",
    blurb: "Read a clue, then spell the magic word from a bank of letters — vocabulary & spelling for big readers. For Jeannie!",
    url:   "games/word-wizard/",
    ages:  "7+",
    kids:  ["jeannie"],
    color: "#ff5d8f",
    ready: true
  }

  // ---- Coming soon: add new ideas here with ready: false ----
];
