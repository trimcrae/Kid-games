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
       color:  "#38b6ff",           // card highlight colour
       ready:  true                 // false = "Coming soon" card
     }

   The newest games go at the TOP of the list.
   =========================================================== */

const GAMES = [
  {
    title: "Mad Libs",
    emoji: "📝",
    blurb: "Give silly words — a noun, a verb, a goofy adjective — then watch them fill a story you've never seen and hear it read aloud! Parts of speech & grammar. For everyone!",
    url:   "games/mad-libs/",
    ages:  "6+",
    color: "#ffd166",
    ready: true
  },

  {
    title: "Choose Your Own Adventure",
    emoji: "🗺️",
    blurb: "Branching read-aloud story-books with pictures & voice — YOU pick what happens! Colours, counting, logic, vocabulary & nature. For everyone!",
    url:   "games/adventure/",
    ages:  "3+",
    color: "#8a5cff",
    ready: true
  },

  {
    title: "Money Machine",
    emoji: "💰",
    blurb: "Watch your money grow itself with compound interest! Pick a bank, add savings & see what you could buy — like If You Made a Million. For Cory!",
    url:   "games/money-machine/",
    ages:  "6+",
    color: "#3ddc84",
    ready: true
  },

  {
    title: "Pumpkin Pies Roster",
    emoji: "🥧",
    blurb: "Coach tool for Shannon — fair Pumpkin Pies soccer line-ups for 2, 4 or 8 periods with even playing time & rotating goalies. Easy to print!",
    url:   "games/soccer-roster/",
    ages:  "Grown-ups",
    color: "#f4791f",
    ready: true
  },

  {
    title: "Crossword",
    emoji: "✏️",
    blurb: "Themed mini crosswords — Minecraft, Bluey, Frozen, taekwondo & more. Read a clue, fill the grid! Spelling & vocabulary.",
    url:   "games/crossword/",
    ages:  "6+",
    color: "#ff5d8f",
    ready: true
  },

  {
    title: "Word Strands",
    emoji: "🧶",
    blurb: "Trace the hidden theme words through a grid of letters — every letter belongs to a word! Find the golden spangram.",
    url:   "games/strands/",
    ages:  "6+",
    color: "#38b6ff",
    ready: true
  },

  {
    title: "Spelling Bee",
    emoji: "🐝",
    blurb: "Make as many words as you can from a honeycomb of letters — every word uses the middle letter! Spelling & vocabulary.",
    url:   "games/spelling-bee/",
    ages:  "6+",
    color: "#ffd166",
    ready: true
  },

  {
    title: "Connections",
    emoji: "🔗",
    blurb: "Sort 16 cards into 4 secret groups of 4 — Pokémon, Bluey, books & more. Builds logic & categories!",
    url:   "games/connections/",
    ages:  "6+",
    color: "#8a5cff",
    ready: true
  },

  {
    title: "Word Guess",
    emoji: "🟩",
    blurb: "Guess the secret 5-letter word in 6 tries, with colour clues and hints — a kid-friendly Wordle. Spelling & reasoning.",
    url:   "games/word-guess/",
    ages:  "6+",
    color: "#3ddc84",
    ready: true
  },

  {
    title: "Math Mob Run",
    emoji: "🏃",
    blurb: "Steer your crew through +, −, ×, ÷ gates to grow the biggest mob — mental math on the run, with upgrades that save!",
    url:   "games/math-mob/",
    ages:  "6+",
    color: "#3ddc84",
    ready: true
  },

  {
    title: "Spooky Princess Stories",
    emoji: "👻",
    blurb: "Friendly-spooky read-aloud storybooks starring Ellie & her siblings — tap the pictures to play! For Ellie!",
    url:   "games/spooky-stories/",
    ages:  "3+",
    color: "#8a5cff",
    ready: true
  },

  {
    title: "Princess Dress-Up",
    emoji: "👑",
    blurb: "Find letters & numbers to dress a princess — letters, numbers & lots of sparkle! For Ellie!",
    url:   "games/princess-dressup/",
    ages:  "3+",
    color: "#9b3fc4",
    ready: true
  },

  {
    title: "Comic Maker",
    emoji: "💥",
    blurb: "Make your own graphic novel — panels, characters, talk bubbles & captions! For Jeannie!",
    url:   "games/comic-maker/",
    ages:  "6+",
    color: "#ff5d8f",
    ready: true
  },

  {
    title: "Number Bubble Pop",
    emoji: "🫧",
    blurb: "Find and pop the matching number — practice counting & number recognition!",
    url:   "games/bubble-pop/",
    ages:  "3+",
    color: "#38b6ff",
    ready: true
  },

  {
    title: "Color Grid Builder",
    emoji: "🌈",
    blurb: "Type your own colour words and watch them fill the grid — Cory's idea!",
    url:   "games/color-grid/",
    ages:  "5+",
    color: "#9b3fc4",
    ready: true
  },

  {
    title: "Word Wizard",
    emoji: "📚",
    blurb: "Read a clue, then spell the magic word from a bank of letters — vocabulary & spelling for big readers. For Jeannie!",
    url:   "games/word-wizard/",
    ages:  "7+",
    color: "#ff5d8f",
    ready: true
  }

  // ---- Coming soon: add new ideas here with ready: false ----
];
