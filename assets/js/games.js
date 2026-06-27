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
    title: "Spooky Princess Stories",
    emoji: "👻",
    blurb: "Friendly-spooky read-aloud storybooks starring Ellie & her siblings — tap the pictures to play! For Ellie!",
    url:   "games/spooky-stories/",
    ages:  "3+",
    color: "#8a5cff",
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

  // ---- Coming soon: ideas tailored to each kid ----
  {
    title: "Word Wizard",
    emoji: "📚",
    blurb: "Spell trickier words and grow your vocabulary — for Jeannie!",
    url:   "#",
    ages:  "7+",
    color: "#ff5d8f",
    ready: false
  },
  {
    title: "Princess ABCs",
    emoji: "👑",
    blurb: "Sparkly letters, colours and counting — for Ellie!",
    url:   "#",
    ages:  "3+",
    color: "#ffd166",
    ready: false
  }
];
