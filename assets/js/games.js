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
    title: "The Post Office",
    emoji:  "📮",
    blurb:  "Send real mail to the rest of the family! Pick who you are, write a proper letter — greeting, message, closing and signature — choose your paper, stick on a stamp, address the envelope and post it. It lands in their mailbox on this device the moment they pick their name: they open the envelope, read it and write back. Letter-writing, reading, spelling and dates: every letter gets a postmark with the day it was posted. Tap-a-sentence quick words for the little ones, and a stamp album to fill up.",
    url:    "games/post-office/",
    ages:   "3+",
    kids:   ["jeannie","cory","ellie","kieran","shannon","tristan"],
    color:  "#e63946",
    ready:  true
  },

  {
    title: "Craepets",
    emoji: "🥚",
    blurb: "Adopt a little clay creature (rendered in Blender, from code) and raise it — the whole economy runs on learning. Five levels from toddler to grown-up, and the questions HEAT UP as you get better: five right in a row turns the heat up a rung (bigger sums, more coins, and at the top a peek at the level above). Climb The Shade's Shadow Tower: his shadow army on six floors, then The Shade himself, darker every time you beat him — with charged critical hits, snacks from your bag, a family Craepet as your ally, tricks, and loot only he can drop. The little levels are now read aloud in a real storyteller's voice: every question, every lesson, the pet's chatter and The Shade's sneers. A whole pet world now: it starts as an EGG that hatches when it hears you learning; a painted valley MAP you tap to travel; a Valley Times front page and a family records board; dress your Craepet up in hats, glasses and scarves that fit every head; a PETPET that trots along behind it; every species with its own favourite foods and place; it wanders the room, asks for wishes, writes a diary you can add to; visit the family's houses and post them presents; a Bank that pays 3% a night (a real compounding lesson); random events on the paths; a photo booth; the real calendar (seasons change the weather, the crops and the Market, holidays hang garlands and leave presents, Advent counts the sleeps, and every Craepet gets a hatch-day party); a Games Room with two real games — SKY CATCH (run under the falling sky and catch only the even numbers, the vowels, the letter A or the stars) and MEMORY MATCH (pairs are a sum and its answer, an animal and its baby, a word and its opposite); daily weather that rains on the window; a named Craepet behind every counter; and a first-steps list for new players. Over 700 hand-written questions plus endless generated sums, 37 homes, 200+ pieces of furniture, painted views, and a different Market for everyone.",
    url:   "games/craepets/",
    ages:  "2+",
    kids:  ["jeannie","cory","ellie","kieran","shannon","tristan"],
    color: "#5ec6a8",
    ready: true
  },

  {
    title: "Word Bridge",
    emoji: "🌉",
    blurb: "Our own Word Bridge! \"Name an animal that lives in the ocean\" — every LETTER of your answer becomes a plank, so JELLYFISH gets you twice as far as CRAB. Race the bot across the canyon, build streaks and spend your coins on bridge skins. Get one wrong and it tells you why. Vocabulary, spelling & word length. Ellie taps pictures in 58 categories; Mum gets the Pro bot.",
    url:   "games/word-bridge/",
    ages:  "3+",
    kids:  ["jeannie","cory","ellie","shannon","tristan"],
    color: "#ff9f45",
    ready: true
  },

  {
    title: "Number Grid Builder",
    emoji: "🔢",
    blurb: "Like the Color Grid, but with NUMBERS! Guess how many letters your word has, then watch the game count them out — C-A-N-D-Y = 5 — and drop it in the right row and column. Quick Count adds no-typing rounds, and Stats shows the mode and mean of your own grid. Counting, spelling, word length & averages. Mum gets a grown-up tier.",
    url:   "games/number-grid/",
    ages:  "5+",
    kids: ["cory","jeannie","ellie","shannon","tristan"],
    color: "#2b8cff",
    ready: true
  },

  {
    title: "Baby Taps",
    emoji: "👶",
    blurb: "Kieran's game! Giant shapes, animals, letters and numbers to bash — every tap pops, sparkles, plays a note and says the word out loud. Colours, shapes, animal sounds, letter sounds and counting to ten. Nothing to lose, nothing to get wrong, and grown-ups hold the corner button to leave.",
    url:   "games/baby-taps/",
    ages:  "Babies",
    kids:  ["kieran","ellie"],
    color: "#ffd166",
    ready: true
  },

  {
    title: "Music Lab",
    emoji: "🎹",
    blurb: "A real piano you can play! Learn note names, sharps & flats, beats, scales and chords, echo tunes back by ear, play 18 whole songs as the next key glows, read notes on the staff — and record a tune of your own. For everyone!",
    url:   "games/music-lab/",
    ages:  "3+",
    kids:  ["jeannie","cory","ellie","kieran","shannon","tristan"],
    color: "#8a5cff",
    ready: true
  },

  {
    title: "World Trek",
    emoji: "🌍",
    blurb: "Tap the seven continents & five oceans on a pixel world map, hunt down all 50 states, learn capitals, name 34 hand-drawn flags, and play Which Is Bigger with real square miles — then fill your passport with stickers. Three tiers, up to a grown-up one with no letters and no colours.",
    url:   "games/world-trek/",
    ages:  "5+",
    kids:  ["jeannie","cory","shannon","tristan"],
    color: "#3ddc84",
    ready: true
  },

  {
    title: "Rock Detective",
    emoji: "🪨",
    blurb: "Found a cool rock? Tap what you see and feel and a key narrows 38 specimens down to exactly one — then run scratch, streak, vinegar and magnet tests on a mystery specimen in the Lab, explore the Mohs hardness scale in the Rock Book, and take the naming quiz at Explorer, Rockhound or Geologist level. Igneous, sedimentary, metamorphic & minerals.",
    url:   "games/rock-detective/",
    ages:  "6+",
    kids: ["jeannie","cory","shannon","tristan"],
    color: "#a97c50",
    ready: true
  },

  {
    title: "Unit Converter",
    emoji: "📏",
    blurb: "Type a number and see it in EVERY other unit at once — with the × and ÷ shown on every row, so you learn the method and not just the answer. Then climb a 7-level quiz ladder: metric steps, feet & pounds, °F ⇄ °C, and grown-up two-step problems. Every wrong answer shows you the full working. Plus scale a recipe, or chart your height in cm and feet-and-inches.",
    url:   "games/unit-converter/",
    ages:  "6+",
    kids: ["cory","shannon","tristan"],
    color: "#38b6ff",
    ready: true
  },

  {
    title: "Family Tree",
    emoji: "🌳",
    blurb: "Grow our family tree! Start with Mom, Dad & the kids, then add grandparents, cousins & more forever. Tap anyone to see who's who around them, then play the levelled word quiz — from brother & sister up to great-aunt and 2nd cousin once removed — and collect a badge for every word you master. One shared tree for everyone, and you can print it as a poster!",
    url:   "games/family-tree/",
    ages:  "3+",
    kids:  ["jeannie","cory","ellie","shannon","tristan"],
    color: "#3ddc84",
    ready: true
  },

  {
    title: "Life Lab",
    emoji: "🦠",
    blurb: "Conway's Game of Life! Paint cells that live or die by counting their neighbours — stamp gliders, spaceships & glider factories, then tap 🔍 Inspect to hear exactly why a cell lived or died, or press ⏪ Back to watch a generation again. Beat the computer at Predict the Next Generation, hunt nine Discovery badges, and invent your own rules in the Rule Lab. Counting, logic & patterns.",
    url:   "games/game-of-life/",
    ages:  "6+",
    kids:  ["cory","shannon","tristan"],
    color: "#3ddc84",
    ready: true
  },

  {
    title: "Mad Libs",
    emoji: "📝",
    blurb: "Give silly words — a noun, a verb, a goofy adjective — then watch them fill one of 22 stories you've never seen! The finished story is colour-coded so you can SEE the nouns, verbs and adverbs you picked, and it reads itself aloud. Tap-a-word bank for little ones. Parts of speech & grammar. For everyone!",
    url:   "games/mad-libs/",
    ages:  "6+",
    kids:  ["jeannie","cory","shannon","tristan"],
    color: "#ffd166",
    ready: true
  },

  {
    title: "Block Coordinates",
    emoji: "⛏️",
    blurb: "The Minecraft coordinate plane! Read (X, Y) to build pixel art, dig for treasure, walk and measure distances, and cross into the negative quadrants — plus real F3 X/Y/Z where Y is height. Four difficulties, up to a grown-up tier.",
    url:   "games/block-coordinates/",
    ages:  "6+",
    kids: ["cory","jeannie","shannon","tristan"],
    color: "#3ddc84",
    ready: true
  },

  {
    title: "Choose Your Own Adventure",
    emoji: "🗺️",
    blurb: "Branching read-aloud story-books with pictures & voice — YOU pick what happens! 39 endings to collect, and in the big stories you can tap any hard word to learn what it means, then take the Word Challenge. Colours, counting, logic, vocabulary & nature. For everyone!",
    url:   "games/adventure/",
    ages:  "3+",
    kids: ["jeannie","cory","ellie","shannon","tristan"],
    color: "#8a5cff",
    ready: true
  },

  {
    title: "Money Machine",
    emoji: "💰",
    blurb: "Two money games in one! Coin School climbs from naming coins to counting piles, making an amount the fewest-coins way, giving change and shop word problems — plus a grown-up register for Mum. Then the Money Machine grows your savings with compound interest and the Rule of 72.",
    url:   "games/money-machine/",
    ages: "3+",
    kids: ["ellie","jeannie","cory","shannon","tristan"],
    color: "#3ddc84",
    ready: true
  },

  {
    title: "Pumpkin Pies Roster",
    emoji: "🥧",
    blurb: "Coach tool for Shannon — fair soccer line-ups for 2, 4 or 8 periods: even playing time, rotating goalies, must-be/never-goalie picks, and late arrivals who only share the periods they're here for. One-page printout.",
    url:   "games/soccer-roster/",
    ages:  "Grown-ups",
    kids:  ["shannon","tristan"],
    color: "#f4791f",
    ready: true
  },

  {
    title: "Crossword",
    emoji: "✏️",
    blurb: "28 themed mini crosswords — Minecraft, Bluey, silent letters, shapes & a real grown-up tier. Hints teach you the spelling rule before they give a letter.",
    url:   "games/crossword/",
    ages:  "6+",
    kids:  ["jeannie","cory","shannon","tristan"],
    color: "#ff5d8f",
    ready: true
  },

  {
    title: "Word Strands",
    emoji: "🧶",
    blurb: "Trace the hidden theme words through a grid of letters — every letter belongs to a word! 27 hunts from rhymes to Greek myths, and each word tells you what it means.",
    url:   "games/strands/",
    ages: "5+",
    kids:  ["jeannie","cory","shannon","tristan"],
    color: "#38b6ff",
    ready: true
  },

  {
    title: "Spelling Bee",
    emoji: "🐝",
    blurb: "Make words from a honeycomb of letters — 16 hives, easy to grown-up, with meanings for every tricky word. Spelling, vocabulary & word patterns.",
    url:   "games/spelling-bee/",
    ages:  "6+",
    kids: ["jeannie","cory","ellie","shannon","tristan"],
    color: "#ffd166",
    ready: true
  },

  {
    title: "Connections",
    emoji: "🔗",
    blurb: "Sort 16 cards into 4 secret groups of 4 — 47 puzzles from picture cards for Ellie to a properly tricky grown-up set. Every group explains why it belongs. Logic, vocabulary & science!",
    url:   "games/connections/",
    ages: "3+",
    kids: ["jeannie","cory","ellie","shannon","tristan"],
    color: "#8a5cff",
    ready: true
  },

  {
    title: "Word Guess",
    emoji: "🟩",
    blurb: "Guess the secret word in 6 tries with colour clues — four levels from 4-letter picture words to proper grown-up vocabulary, a Word of the Day, a detective panel that shows which letters are still possible, and the meaning of every word at the end. Spelling, vocabulary & reasoning.",
    url:   "games/word-guess/",
    ages: "3+",
    kids: ["ellie","cory","jeannie","shannon","tristan"],
    color: "#3ddc84",
    ready: true
  },

  {
    title: "Math Mob Run",
    emoji: "🏃",
    blurb: "Steer your crew through +, −, ×, ÷ gates across five lands, hit answer streaks to spark COIN FEVER, and smash the brick walls at every finish. Four real difficulty tiers — counting to 10 for the littles, times tables, two-step problems, and a grown-up round of squares, roots and percentages — and it shows you the working on every answer you miss.",
    url:   "games/math-mob/",
    ages: "3+",
    kids: ["cory","jeannie","ellie","shannon","tristan"],
    color: "#3ddc84",
    ready: true
  },

  {
    title: "Spooky Princess Stories",
    emoji: "👻",
    blurb: "22 friendly-spooky read-aloud storybooks starring Ellie & her siblings — a candy monster, a kind witch, a floating tea party and more, including a story Ellie made up herself! The words light up as they're read, tap any word to hear it or learn what it means, then answer the story questions. For Ellie & Jeannie!",
    url:   "games/spooky-stories/",
    ages:  "3+",
    kids: ["ellie","jeannie"],
    color: "#8a5cff",
    ready: true
  },

  {
    title: "Princess Dress-Up",
    emoji: "👑",
    blurb: "Letters, numbers, counting, colours & shapes — every right answer gives her a crown, a wand or a bouquet. Spoken prompts, so Ellie can play all on her own!",
    url:   "games/princess-dressup/",
    ages:  "3+",
    kids:  ["ellie"],
    color: "#9b3fc4",
    ready: true
  },

  {
    title: "Comic Maker",
    emoji: "💥",
    blurb: "Draw your own graphic novel — paint in the panels, add bubbles & captions, then use the Story coach for story sparks, beginning/middle/end starters, juicy words and a writing check. It'll even read your comic out loud! Teaches story structure, sentence writing & punctuation.",
    url:   "games/comic-maker/",
    ages:  "6+",
    kids:  ["jeannie","shannon","tristan"],
    color: "#ff5d8f",
    ready: true
  },

  {
    title: "Number Bubble Pop",
    emoji: "🫧",
    blurb: "Nine levels of bubble popping: match numbers or letters, count dice dots, count out a set — then add, take away, double and skip count by 2s, 3s, 5s and 10s. Every wrong pop explains itself out loud.",
    url:   "games/bubble-pop/",
    ages:  "3+",
    kids: ["ellie","cory","jeannie"],
    color: "#38b6ff",
    ready: true
  },

  {
    title: "Color Grid Builder",
    emoji: "🌈",
    blurb: "Type words that ARE a colour and watch them file themselves by their start, middle or end letter — then flip to Colour Detective and guess the colour yourself. Cory's idea!",
    url:   "games/color-grid/",
    ages: "4+",
    kids: ["cory","ellie","jeannie","shannon","tristan"],
    color: "#9b3fc4",
    ready: true
  },

  {
    title: "Word Wizard",
    emoji: "📚",
    blurb: "Spell the magic word from its clue, then learn what it means, how to use it and the rule that makes it tricky — 56 words, streaks, ranks and a grown-up spellbook for Mum.",
    url:   "games/word-wizard/",
    ages:  "7+",
    kids: ["jeannie","shannon","tristan"],
    color: "#ff5d8f",
    ready: true
  }

  // ---- Coming soon: add new ideas here with ready: false ----
];
