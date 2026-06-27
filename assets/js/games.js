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
    title: "Number Bubble Pop",
    emoji: "🫧",
    blurb: "Find and pop the matching number — practice counting & number recognition!",
    url:   "games/bubble-pop/",
    ages:  "3+",
    color: "#38b6ff",
    ready: true
  },

  // ---- Coming soon: ideas we'll build together ----
  {
    title: "Letter Hunt",
    emoji: "🔤",
    blurb: "Spot letters and learn their sounds — early reading fun.",
    url:   "#",
    ages:  "3+",
    color: "#ff5d8f",
    ready: false
  },
  {
    title: "Quick Math",
    emoji: "➕",
    blurb: "Speedy adding and subtracting for sharp little minds.",
    url:   "#",
    ages:  "7+",
    color: "#3ddc84",
    ready: false
  },
  {
    title: "World Explorer",
    emoji: "🌍",
    blurb: "Match flags and countries and learn some geography.",
    url:   "#",
    ages:  "8+",
    color: "#ffd166",
    ready: false
  }
];
