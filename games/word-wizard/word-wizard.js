/* ===========================================================
   Word Wizard — a spelling & vocabulary game (for Jeannie!)
   -----------------------------------------------------------
   Read a clue, then build the word from a bank of letters by
   tapping (or typing). A correct spelling casts a "spell", earns
   a star and opens a WORD STUDY card that teaches what the word
   means, how to use it in a sentence and the spelling rule that
   makes it tricky. Progress is saved in localStorage so you keep
   your stars, streaks and unlocked spellbooks.

   Save key stays "wordWizard.v1" on purpose: older saves (stars /
   mastered / unlocked) load straight into the new, bigger shape,
   so nobody loses the words they already learned.

   No build step, no dependencies — plain vanilla JS.
   =========================================================== */

(function () {
  "use strict";

  /* ---------- the spellbooks (levels) ----------
     Each word carries FOUR teaching fields:
       clue      – the definition you spell from
       tip       – *why* it's tricky (the spelling / phonics rule)
       sentence  – a real example sentence (often a true fact)
       part      – part of speech (defaults to "noun")
     Its picture is a hand-authored vector drawn by WordArt.draw()
     (word-art.js). Difficulty climbs book by book: longer words,
     silent letters, double letters and compound words. `icon` is
     the word whose art becomes the spellbook cover. */
  const BOOKS = [
    {
      id: "animal",
      name: "Animal Spells",
      icon: "leopard",
      color: "#3ddc84",
      words: [
        { word: "leopard", clue: "A big spotted wild cat that can climb trees.",
          tip: "Ends with -ard, just like 'wizard'. The 'eo' only says /eh/.",
          sentence: "The leopard dragged its meal high up into a tree." },
        { word: "penguin", clue: "A black-and-white bird that swims but can't fly.",
          tip: "Say it in two beats — pen + guin. Don't forget the 'u' after the 'g'.",
          sentence: "An emperor penguin can dive deeper than 500 metres." },
        { word: "squirrel", clue: "A bushy-tailed animal that buries acorns.",
          tip: "'q' and 'u' always travel together, and there are two r's: s-qu-i-rr-el.",
          sentence: "A squirrel buries far more nuts than it ever digs up again." },
        { word: "flamingo", clue: "A tall pink bird that stands on one leg.",
          tip: "It starts like 'flame' — and flamingos really are flame-pink.",
          sentence: "Flamingos turn pink because of the tiny shrimp and algae they eat." },
        { word: "elephant", clue: "The largest land animal, with a long trunk.",
          tip: "The /f/ sound is spelled 'ph', the same as in 'phone'.",
          sentence: "An elephant can pick up a single blade of grass with its trunk." },
        { word: "hedgehog", clue: "A small animal covered in sharp prickly spines.",
          tip: "Two little words joined together: hedge + hog.",
          sentence: "A hedgehog rolls into a prickly ball when it feels afraid." },
      ],
    },
    {
      id: "nature",
      name: "Nature Spells",
      icon: "volcano",
      color: "#38b6ff",
      words: [
        { word: "volcano", clue: "A mountain that can erupt with hot melted rock.",
          tip: "Only one 'l', and it ends in -ano, exactly like 'piano'.",
          sentence: "When a volcano erupts, melted rock called lava pours down its sides." },
        { word: "iceberg", clue: "A giant floating mountain of ice in the sea.",
          tip: "ice + berg. 'Berg' is the German word for mountain.",
          sentence: "About nine tenths of an iceberg hides below the water." },
        { word: "tornado", clue: "A spinning funnel of wind that touches the ground.",
          tip: "Three beats: tor-na-do. It ends -ado, not -ardo.",
          sentence: "A tornado is a spinning column of air that reaches down to the ground." },
        { word: "waterfall", clue: "Water that tumbles down over the edge of a cliff.",
          tip: "A compound word: water + fall — so it ends with two l's.",
          sentence: "Angel Falls in Venezuela is the tallest waterfall on Earth." },
        { word: "glacier", clue: "A slow-moving river of ancient, frozen ice.",
          tip: "The tricky ending is -cier, not -sier: gla-cier.",
          sentence: "A glacier creeps downhill so slowly you cannot see it move." },
        { word: "canyon", clue: "A deep valley carved out by a river over time.",
          tip: "Two beats, one 'n' in each: can-yon.",
          sentence: "The Colorado River carved the Grand Canyon over millions of years." },
      ],
    },
    {
      id: "castle",
      name: "Castle Spells",
      icon: "dragon",
      color: "#8a5cff",
      words: [
        { word: "dragon", clue: "A huge winged beast that breathes fire.",
          tip: "drag + on. The 'a' is short, like the 'a' in 'bag'.",
          sentence: "In the story, the dragon guarded a mountain of gold." },
        { word: "castle", clue: "A giant stone fortress for a king or queen.",
          tip: "The 't' is silent — you say 'cas-le' but you write the t.",
          sentence: "The castle had thick stone walls and a deep water-filled moat." },
        { word: "wizard", clue: "A person who casts spells and does real magic.",
          tip: "wiz + ard — the same -ard ending as 'leopard'.",
          sentence: "The wizard waved his staff and the heavy door swung open." },
        { word: "knight", clue: "A warrior in armour who serves the king.",
          tip: "Silent 'k' AND silent 'gh' — kn-igh-t sounds just like 'night'.",
          sentence: "A knight in full armour could weigh as much as a small pony." },
        { word: "shield", clue: "What a knight holds up to block an attack.",
          tip: "'ie' says /ee/ here, and it follows the rule 'i before e'.",
          sentence: "She raised her shield and the arrow bounced harmlessly away." },
        { word: "goblet", clue: "A fancy cup for drinking at a royal feast.",
          tip: "gob + let. It ends -et, like 'trumpet'.",
          sentence: "The king raised a golden goblet to toast the feast." },
      ],
    },
    {
      id: "space",
      name: "Space Spells",
      icon: "rocket",
      color: "#6a5cff",
      words: [
        { word: "comet", clue: "A ball of ice and dust with a glowing tail.",
          tip: "com + et, with just one 'm'.",
          sentence: "A comet's glowing tail always points away from the Sun." },
        { word: "planet", clue: "A big round world that orbits around a star.",
          tip: "The word 'plan' is hiding at the front: plan + et.",
          sentence: "Jupiter is the largest planet in our solar system." },
        { word: "rocket", clue: "A machine that blasts off to fly into space.",
          tip: "The word 'rock' is hiding at the front: rock + et.",
          sentence: "A rocket must reach about 28,000 km per hour to stay in orbit." },
        { word: "galaxy", clue: "A huge swirl of billions of stars.",
          tip: "Ends in -axy. The 'a' sounds like the 'a' in 'cat'.",
          sentence: "Our galaxy is called the Milky Way." },
        { word: "asteroid", clue: "A rocky lump that tumbles through space.",
          tip: "aster + oid. 'Aster' is the Greek word for star.",
          sentence: "Most asteroids orbit the Sun in a belt between Mars and Jupiter." },
        { word: "telescope", clue: "A tube you look through to see far-off stars.",
          tip: "tele (far) + scope (see) — so a telescope is a 'far-seer'.",
          sentence: "Through a telescope you can see the rings around Saturn." },
      ],
    },
    {
      id: "ocean",
      name: "Ocean Spells",
      icon: "dolphin",
      color: "#1ec8c8",
      words: [
        { word: "dolphin", clue: "A smart sea mammal that leaps from the waves.",
          tip: "Another 'ph' that says /f/ — the same trick as 'elephant'.",
          sentence: "Dolphins find their food by making clicks and listening for echoes." },
        { word: "octopus", clue: "A sea creature with eight wiggly arms.",
          tip: "'Oct' means eight — the same eight as an octagon's sides.",
          sentence: "An octopus can squeeze through any gap bigger than its hard beak." },
        { word: "seahorse", clue: "A tiny curly fish with a horse-shaped head.",
          tip: "A compound word: sea + horse.",
          sentence: "It is the male seahorse who carries the eggs until they hatch." },
        { word: "anchor", clue: "A heavy hook that holds a ship in place.",
          tip: "The 'ch' says /k/ here, like in 'school'.",
          sentence: "The crew dropped the anchor to hold the ship still in the bay." },
        { word: "jellyfish", clue: "A see-through sea animal that can sting.",
          tip: "jelly + fish, and 'jelly' has a double 'l'.",
          sentence: "A jellyfish has no brain, no bones and no heart." },
        { word: "lighthouse", clue: "A tall tower that shines a light to guide ships.",
          tip: "light + house — and 'light' hides a silent 'gh'.",
          sentence: "The lighthouse beam swept the sea and warned ships off the rocks." },
      ],
    },
    {
      id: "garden",
      name: "Garden Spells",
      icon: "ladybug",
      color: "#ff5d8f",
      words: [
        { word: "ladybug", clue: "A little red beetle dotted with black spots.",
          tip: "lady + bug. In Britain the very same beetle is a 'ladybird'.",
          sentence: "A single ladybug can eat hundreds of aphids in a week." },
        { word: "beetle", clue: "An insect with a hard, shiny shell on its back.",
          tip: "'ee' says /ee/, and it ends in -le like 'little'.",
          sentence: "About one in every four kinds of animal on Earth is a beetle." },
        { word: "spider", clue: "An eight-legged creature that spins silky webs.",
          tip: "spi + der. The 'i' is long, like in 'spy'.",
          sentence: "A spider spins its web from silk made inside its own body." },
        { word: "caterpillar", clue: "A wriggly bug that turns into a butterfly.",
          tip: "cat-er-pill-ar — 'cat' and 'pill' hide inside, and 'pill' has two l's.",
          sentence: "A caterpillar eats and eats, then changes into a butterfly." },
        { word: "dragonfly", clue: "A fast insect with four see-through wings.",
          tip: "dragon + fly — you already know how to spell both halves.",
          sentence: "A dragonfly can fly backwards just as well as forwards." },
        { word: "mushroom", clue: "A little umbrella-shaped fungus on the ground.",
          tip: "mush + room. The word 'room' is sitting on the end.",
          sentence: "A mushroom is the fruit of a fungus that grows under the ground." },
      ],
    },
    {
      id: "music",
      name: "Music Spells",
      icon: "guitar",
      color: "#ff8c42",
      words: [
        { word: "trumpet", clue: "A brass horn you blow to play loud, bright notes.",
          tip: "trump + et. It ends -et, like 'goblet'.",
          sentence: "A trumpet has only three valves but can play every note." },
        { word: "guitar", clue: "An instrument with strings that you strum.",
          tip: "The 'u' is silent — it is there to keep the 'g' hard.",
          sentence: "A guitar usually has six strings." },
        { word: "violin", clue: "A small wooden instrument played with a bow.",
          tip: "Three beats — vi-o-lin — with only one 'l'.",
          sentence: "A violin's strings are stroked with a bow strung with horsehair." },
        { word: "drum", clue: "You hit it with sticks to keep the beat.",
          tip: "Four letters, one sound each: d-r-u-m.",
          sentence: "The drum keeps the beat steady for the whole band." },
        { word: "piano", clue: "A big instrument with black and white keys.",
          tip: "It ends -ano, exactly like 'volcano'.",
          sentence: "A grand piano has 88 keys." },
        { word: "harp", clue: "A tall instrument with strings you pluck.",
          tip: "'ar' says /ar/, just like in 'star'.",
          sentence: "A harpist plucks the strings with both hands at once." },
      ],
    },
    {
      id: "master",
      name: "Master Spells",
      icon: "treasure",
      color: "#ffd166",
      words: [
        { word: "treasure", clue: "Gold and jewels that a pirate hides away.",
          tip: "The ending sounds like 'sure' and is spelled that way too: trea-sure.",
          sentence: "The map promised buried treasure beneath the tallest palm tree." },
        { word: "compass", clue: "A tool with a needle that always points north.",
          tip: "com + pass, so there is a double 's' at the end.",
          sentence: "A compass needle lines itself up with Earth's magnetic field." },
        { word: "pyramid", clue: "A giant pointed stone tomb built in Egypt.",
          tip: "The 'y' does the job of an 'i': pyr-a-mid.",
          sentence: "The Great Pyramid of Giza was built over 4,500 years ago." },
        { word: "dinosaur", clue: "A giant reptile that lived long, long ago.",
          tip: "dino + saur. 'Saur' means lizard, so it means 'terrible lizard'.",
          sentence: "Birds are the living descendants of the dinosaurs." },
        { word: "umbrella", clue: "What you hold over your head to stay dry.",
          tip: "um-brel-la, with a double 'l' in the middle.",
          sentence: "The umbrella was first invented to keep off the sun, not the rain." },
        { word: "butterfly", clue: "An insect with big, colourful, fluttering wings.",
          tip: "butter + fly — two easy words stuck together.",
          sentence: "A butterfly tastes with its feet." },
      ],
    },
  ];

  /* A real grown-up tier — Mum's spellbook. No pictures to help,
     five decoy letters instead of two, and the words that trip up
     adults in every spelling bee. Always unlocked. */
  const GROWN = {
    id: "grownup",
    name: "Grown-Up Spells",
    icon: "wizard",
    color: "#6a6385",
    grown: true,
    decoys: 5,
    words: [
      { word: "rhythm", clue: "The pattern of beats in music or poetry.",
        tip: "There is no ordinary vowel — the 'y' does all the work: r-h-y-t-h-m.",
        sentence: "The drummer held a steady rhythm all the way through the song." },
      { word: "conscience", clue: "Your inner sense of right and wrong.",
        tip: "The whole word 'science' is hiding after 'con'.",
        sentence: "Her conscience would not let her keep the money she found." },
      { word: "liaison", clue: "A person or link that connects two groups.",
        tip: "Two i's with the 'a' between them: li-ai-son.",
        sentence: "She acted as the liaison between the school and the council." },
      { word: "maintenance", clue: "The work of keeping something in good repair.",
        tip: "It comes from 'maintain', but the second 'a' turns into an 'e'.",
        sentence: "The lift is closed today for maintenance." },
      { word: "perseverance", clue: "Keeping going at something hard without giving up.",
        tip: "No 'severe' inside it — every vowel after 'p' is an e: per-sev-er-ance.",
        sentence: "Her perseverance finally paid off after months of practice." },
      { word: "bureaucracy", clue: "A system run by officials, forms and rules.",
        tip: "bureau + cracy. 'eau' says /yoo/, and -cracy matches 'democracy'.",
        sentence: "The application vanished somewhere inside the bureaucracy." },
      { word: "questionnaire", clue: "A printed list of questions used to collect answers.",
        tip: "question + naire, and the 'n' doubles up in the middle.",
        sentence: "Please fill in the questionnaire before you leave." },
      { word: "onomatopoeia", clue: "A word that imitates the sound it names, like 'buzz'.",
        tip: "on-o-mat-o-poe-ia. The '-poeia' at the end is the part everyone drops.",
        sentence: "'Sizzle', 'clang' and 'splash' are all examples of onomatopoeia." },
    ],
  };

  /* How many words a Wizard Review round pulls in. */
  const REVIEW_SIZE = 8;
  const REVIEW_UNLOCK = 6;   // words you must know before Review opens

  /* Wizard ranks — a long-term reason to come back. */
  const RANKS = [
    { at: 0,   name: "Apprentice",       emoji: "🪄" },
    { at: 15,  name: "Spellcaster",      emoji: "✨" },
    { at: 35,  name: "Enchanter",        emoji: "🔮" },
    { at: 65,  name: "Sorcerer",         emoji: "🌟" },
    { at: 100, name: "Archmage",         emoji: "👑" },
    { at: 150, name: "Grand Word Wizard", emoji: "🏆" },
  ];
  function rankFor(stars) {
    let r = RANKS[0];
    for (const x of RANKS) if (stars >= x.at) r = x;
    return r;
  }
  function nextRank(stars) {
    for (const x of RANKS) if (stars < x.at) return x;
    return null;
  }

  /* ---------- saved progress ---------- */
  const SAVE_KEY = "wordWizard.v1";

  function defaultSave() {
    return {
      stars: 0,
      mastered: {},     // word -> true
      unlocked: 1,      // how many core spellbooks are open
      streak: 0,        // current perfect-first-try streak
      bestStreak: 0,
      perfect: {},      // word -> true (spelled first try, no hints)
      tricky: {},       // word -> how many times it went wrong / needed help
      lastDay: "",      // yyyy-mm-dd of the last visit
      dayStreak: 0,     // days in a row
      rounds: 0,        // spellbook rounds finished
    };
  }

  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }
  function num(v) { return Number.isFinite(+v) ? Math.max(0, Math.floor(+v)) : 0; }

  function load() {
    const d = defaultSave();
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && typeof s === "object") {
        // Old v1 saves only had {stars, mastered, unlocked} — they fill in
        // here and everything else keeps its default. Nothing is orphaned.
        d.stars = num(s.stars);
        d.mastered = obj(s.mastered);
        d.unlocked = Math.max(1, num(s.unlocked));
        d.streak = num(s.streak);
        d.bestStreak = num(s.bestStreak);
        d.perfect = obj(s.perfect);
        d.tricky = obj(s.tricky);
        d.lastDay = typeof s.lastDay === "string" ? s.lastDay : "";
        d.dayStreak = num(s.dayStreak);
        d.rounds = num(s.rounds);
      }
    } catch (e) { /* corrupt save — start fresh */ }
    return d;
  }
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }

  const state = load();

  /* daily visit streak — a gentle "come back tomorrow" */
  (function trackDay() {
    const now = new Date();
    const key = (dt) => dt.getFullYear() + "-" + (dt.getMonth() + 1) + "-" + dt.getDate();
    const today = key(now);
    if (state.lastDay === today) return;
    const y = new Date(now.getTime() - 86400000);
    state.dayStreak = state.lastDay === key(y) ? state.dayStreak + 1 : 1;
    state.lastDay = today;
    save();
  })();

  /* ---------- element refs ---------- */
  const $ = (id) => document.getElementById(id);
  const el = {
    stars: $("stars"), learned: $("learned"), rank: $("rank"), fire: $("fire"),
    levels: $("levels"), levelGrid: $("level-grid"),
    play: $("play"), feedback: $("feedback"),
    clueCard: $("clue-card"), clueEmoji: $("clue-emoji"), clueText: $("clue-text"),
    progress: $("word-progress"),
    slots: $("slots"), bank: $("bank"), controls: $("controls"),
    hear: $("hear-btn"), clear: $("clear-btn"), skip: $("skip-btn"), quit: $("quit-btn"),
    hint: $("hint-btn"),
    study: $("study"), studyArt: $("study-art"), studyWord: $("study-word"),
    studyPos: $("study-pos"), studyDef: $("study-def"), studySentence: $("study-sentence"),
    studyTip: $("study-tip"), studyNext: $("study-next"), studyHear: $("study-hear"),
    win: $("win"), winBig: $("win-big"), winTitle: $("win-title"), winText: $("win-text"),
    winStats: $("win-stats"),
    winNext: $("win-next"), winAgain: $("win-again"), winMenu: $("win-menu"),
    dict: $("dict"), dictList: $("dict-list"), dictBtn: $("dict-btn"), dictBack: $("dict-back"),
    dictPractise: $("dict-practise"), dictSummary: $("dict-summary"),
  };

  /* ---------- live play state ---------- */
  let book = null;        // the spellbook being played
  let bookIdx = -1;       // index into BOOKS, or -1 for grown-up / review
  let queue = [];         // word indices still to play this round
  let qPos = 0;
  let skips = {};         // word index -> how many times skipped this round
  let current = null;     // the current word object
  let typed = [];         // [{char, btn}] placed in the slots
  let locked = false;     // true while celebrating / transitioning
  let clean = true;       // no wrong tries and no hints yet → bonus star
  let tries = 0;          // wrong attempts on this word
  let hints = 0;          // hint presses on this word
  let token = 0;          // bumps on every screen change: kills stale timers
  let round = { learned: 0, stars: 0, perfect: 0, played: 0 };

  /* ---------- helpers ---------- */
  const REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function countMastered() { return Object.keys(state.mastered).length; }
  function totalWords() {
    return BOOKS.reduce((n, b) => n + b.words.length, 0) + GROWN.words.length;
  }

  function updateHud() {
    el.stars.textContent = state.stars;
    el.learned.textContent = countMastered() + " / " + totalWords();
    const r = rankFor(state.stars);
    if (el.rank) el.rank.textContent = r.emoji + " " + r.name;
    if (el.fire) {
      el.fire.textContent = state.streak;
      el.fire.parentElement.title = "Best streak: " + state.bestStreak;
    }
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* Any screen change invalidates every pending timer — this is what stops
     a "Skip" or "Spellbooks" tap during a celebration from wrecking the
     next word (the old version could clear letters from the WRONG word). */
  function show(section) {
    token++;
    el.levels.classList.toggle("hidden", section !== "levels");
    el.play.classList.toggle("hidden", section !== "play");
    el.win.classList.toggle("hidden", section !== "win");
    if (el.dict) el.dict.classList.toggle("hidden", section !== "dict");
  }

  // Run fn later unless the screen/word moved on in the meantime.
  function later(fn, ms) {
    const t = token;
    setTimeout(() => { if (t === token) fn(); }, ms);
  }

  /* Words that have no narration clip in audio/ yet. tools/extract_texts.js
     picks up every `word:` in this file, so the next run of the audio
     pipeline renders these — once the .mp3s are committed, empty this set
     and the 🔊 buttons light up on their own. Asking for a missing clip
     would only 404 in the console, so we never ask. */
  const NO_CLIP = new Set(GROWN.words.map((w) => w.word));
  function hasClip(word) { return !NO_CLIP.has(word); }

  // Play a pre-rendered neural-voice clip from this game's audio/ folder.
  function playClip(name) {
    if (window.Voice) Voice.play("audio/" + name + ".mp3");
  }
  function sayWord(word) {
    if (hasClip(word)) playClip("word-" + word);
  }

  function art(word) {
    return (window.WordArt && WordArt.draw(word)) || "";
  }

  function sparkleBurst() {
    if (REDUCED) return;
    const emojis = ["✨", "⭐", "🌟", "💫"];
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    for (let i = 0; i < 12; i++) {
      const s = document.createElement("div");
      s.className = "sparkle";
      s.textContent = emojis[i % emojis.length];
      s.style.left = (cx + (Math.random() - 0.5) * 260) + "px";
      s.style.top = (cy + (Math.random() - 0.5) * 120) + "px";
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 900);
    }
  }

  function ordinal(n) {
    const s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  /* ---------- level select ---------- */
  function reviewPool() {
    const pool = [];
    BOOKS.concat([GROWN]).forEach((b) => b.words.forEach((w) => {
      if (state.mastered[w.word]) pool.push(w);
    }));
    return pool;
  }

  function makeCard(opts) {
    const card = document.createElement(opts.locked ? "div" : "button");
    card.className = "level-card" + (opts.locked ? " locked" : "") + (opts.done ? " done" : "");
    card.style.setProperty("--accent", opts.color);
    card.innerHTML =
      '<span class="lv-emoji" aria-hidden="true">' + opts.art + "</span>" +
      "<h3>" + opts.name + "</h3>" +
      '<span class="lv-progress">' + opts.note + "</span>";
    if (!opts.locked) {
      card.type = "button";
      card.setAttribute("aria-label", opts.name + " — " + opts.note.replace(/<[^>]+>/g, ""));
      card.addEventListener("click", opts.onPick);
    } else {
      card.setAttribute("aria-disabled", "true");
    }
    return card;
  }

  function renderLevels() {
    el.levelGrid.innerHTML = "";

    BOOKS.forEach((lv, i) => {
      const open = i < state.unlocked;
      const learnedHere = lv.words.filter((w) => state.mastered[w.word]).length;
      const done = learnedHere === lv.words.length;
      el.levelGrid.appendChild(makeCard({
        locked: !open,
        done: done,
        color: lv.color,
        name: lv.name,
        art: open ? art(lv.icon) : '<span class="lv-lock">🔒</span>',
        note: open
          ? learnedHere + " / " + lv.words.length + (done ? " ✓" : "")
          : "Finish " + BOOKS[i - 1].name + " to open!",
        onPick: () => startBook(lv, i),
      }));
    });

    // Mum's tier — always open, clearly flagged as the hard one.
    const gLearned = GROWN.words.filter((w) => state.mastered[w.word]).length;
    el.levelGrid.appendChild(makeCard({
      locked: false,
      done: gLearned === GROWN.words.length,
      color: GROWN.color,
      name: "👩 " + GROWN.name,
      art: art(GROWN.icon),
      note: gLearned + " / " + GROWN.words.length + " · grown-ups!",
      onPick: () => startBook(GROWN, -1),
    }));

    // Wizard Review — endless practice, weighted to the words you got wrong.
    const pool = reviewPool();
    const canReview = pool.length >= REVIEW_UNLOCK;
    el.levelGrid.appendChild(makeCard({
      locked: !canReview,
      done: false,
      color: "#ff8c42",
      name: "🔁 Wizard Review",
      art: canReview ? art("telescope") : '<span class="lv-lock">🔒</span>',
      note: canReview
        ? "Practise " + Math.min(REVIEW_SIZE, pool.length) + " words you know"
        : "Learn " + REVIEW_UNLOCK + " words to open!",
      onPick: startReview,
    }));

    if (el.dictBtn) {
      const n = countMastered();
      el.dictBtn.textContent = "📖 My Words (" + n + ")";
      el.dictBtn.disabled = n === 0;
    }
  }

  /* ---------- "My Words" — a dictionary of every mastered word ----------
     The vocabulary payoff: re-read each meaning, see the spelling rule
     again and hear the word said out loud. */
  function renderDict() {
    el.dictList.innerHTML = "";
    let n = 0, stars = 0;
    BOOKS.concat([GROWN]).forEach((lv) => {
      lv.words.forEach((w) => {
        if (!state.mastered[w.word]) return;
        n++;
        if (state.perfect[w.word]) stars++;
        const row = document.createElement("div");
        row.className = "dict-card";
        row.style.setProperty("--accent", lv.color);

        const a = document.createElement("span");
        a.className = "dict-art";
        a.setAttribute("aria-hidden", "true");
        a.innerHTML = art(w.word);

        const body = document.createElement("span");
        body.className = "dict-body";
        const title = document.createElement("b");
        title.className = "dict-word";
        title.textContent = w.word + (state.perfect[w.word] ? " ⭐" : "");
        const clue = document.createElement("span");
        clue.className = "dict-clue";
        clue.textContent = w.clue;
        const tip = document.createElement("span");
        tip.className = "dict-tip";
        tip.textContent = "💡 " + w.tip;
        body.appendChild(title); body.appendChild(clue); body.appendChild(tip);

        const hear = document.createElement("button");
        hear.className = "dict-hear";
        hear.type = "button";
        hear.textContent = "🔊";
        hear.setAttribute("aria-label", "Hear the word " + w.word);
        hear.addEventListener("click", () => playClip("word-" + w.word));

        row.appendChild(a); row.appendChild(body); row.appendChild(hear);
        el.dictList.appendChild(row);
      });
    });
    if (el.dictSummary) {
      el.dictSummary.textContent =
        n + " word" + (n === 1 ? "" : "s") + " learned · " + stars + " spelled first try ⭐";
    }
    if (el.dictPractise) el.dictPractise.disabled = n < REVIEW_UNLOCK;
  }

  /* ---------- start a round ---------- */
  function startBook(b, idx) {
    book = b;
    bookIdx = idx;
    // Words you haven't mastered come first, then the ones you have
    // (a little spaced repetition every time you replay a spellbook).
    const fresh = [], known = [];
    b.words.forEach((w, i) => (state.mastered[w.word] ? known : fresh).push(i));
    queue = fresh.concat(known);
    beginRound();
  }

  function startReview() {
    const pool = reviewPool();
    if (pool.length < REVIEW_UNLOCK) return;
    // weight the tricky words (ones that went wrong before) more heavily
    const bag = [];
    pool.forEach((w) => {
      bag.push(w);
      const t = Math.min(3, num(state.tricky[w.word]));
      for (let i = 0; i < t; i++) bag.push(w);
    });
    const picked = [];
    const seen = {};
    shuffle(bag).forEach((w) => {
      if (picked.length >= REVIEW_SIZE || seen[w.word]) return;
      seen[w.word] = true;
      picked.push(w);
    });
    book = {
      id: "review", name: "Wizard Review", icon: "telescope",
      color: "#ff8c42", review: true, decoys: 3, words: picked,
    };
    bookIdx = -1;
    queue = picked.map((_, i) => i);
    beginRound();
  }

  function beginRound() {
    qPos = 0;
    skips = {};
    round = { learned: 0, stars: 0, perfect: 0, played: 0 };
    show("play");
    loadWord();
  }

  function loadWord() {
    current = book.words[queue[qPos]];
    typed = [];
    locked = false;
    clean = true;
    tries = 0;
    hints = 0;
    token++;                       // cancel anything still pending

    el.feedback.textContent = "";
    el.feedback.style.color = "var(--green)";
    el.study.hidden = true;
    el.clueCard.hidden = false;
    el.bank.hidden = false;
    el.controls.hidden = false;

    const pic = art(current.word);
    el.clueEmoji.innerHTML = pic;
    el.clueEmoji.hidden = !pic;
    el.clueText.textContent = current.clue;
    if (el.progress) {
      el.progress.textContent = book.name + " · word " + (qPos + 1) + " of " + queue.length;
    }

    // slots — one per letter, tagged with the answer so the game (and tests) can check
    el.slots.className = "slots" + (current.word.length > 8 ? " tight" : "");
    el.slots.dataset.word = current.word;
    el.slots.innerHTML = "";
    for (let k = 0; k < current.word.length; k++) {
      const sl = document.createElement("div");
      sl.className = "slot";
      el.slots.appendChild(sl);
    }
    announce();

    // letter bank — the word's letters plus decoys, shuffled
    const letters = current.word.split("");
    const alphabet = "abcdefghijklmnopqrstuvwxyz".split("");
    const decoyCount = book.decoys != null
      ? book.decoys
      : Math.min(3, Math.max(2, 8 - letters.length));
    let guard = 0;
    while (letters.length < current.word.length + decoyCount && guard++ < 400) {
      const c = alphabet[Math.floor(Math.random() * 26)];
      if (current.word.indexOf(c) === -1) letters.push(c);
    }
    el.bank.innerHTML = "";
    shuffle(letters).forEach((c) => {
      const b = document.createElement("button");
      b.className = "letter";
      b.type = "button";
      b.textContent = c;
      b.dataset.letter = c;
      b.setAttribute("aria-label", "letter " + c);
      b.addEventListener("click", () => placeLetter(c, b));
      el.bank.appendChild(b);
    });
    el.skip.disabled = false;
  }

  /* screen-reader friendly read-out of what's in the slots so far */
  function announce() {
    const word = current ? current.word : "";
    const so_far = typed.map((t) => t.char).join("");
    el.slots.setAttribute(
      "aria-label",
      "Spelling a " + word.length + " letter word. " +
      (so_far ? "So far: " + so_far.split("").join(" ") : "No letters yet.")
    );
  }

  function renderSlots() {
    const slots = el.slots.children;
    for (let k = 0; k < slots.length; k++) {
      const t = typed[k];
      slots[k].textContent = t ? t.char : "";
      slots[k].classList.toggle("filled", !!t);
    }
    announce();
  }

  function placeLetter(c, btn) {
    if (locked || btn.disabled) return;
    if (typed.length >= current.word.length) return;
    btn.disabled = true;
    typed.push({ char: c, btn: btn });
    window.SFX && SFX.pop();
    renderSlots();
    if (typed.length === current.word.length) checkAnswer();
  }

  function removeLast() {
    if (typed.length === 0) return;
    const last = typed.pop();
    last.btn.disabled = false;
    el.slots.classList.remove("wrong");
    renderSlots();
  }

  function clearAll() {
    if (locked) return;
    while (typed.length) removeLast();
  }

  /* how many letters from the start are already right */
  function rightPrefix() {
    const guess = typed.map((t) => t.char).join("");
    let ok = 0;
    while (ok < guess.length && guess[ok] === current.word[ok]) ok++;
    return ok;
  }

  function checkAnswer() {
    if (typed.map((t) => t.char).join("") === current.word) { succeed(); return; }

    // Teach, don't just wipe: keep the letters that ARE right and hand back
    // only the wrong ones, and say WHY it's wrong.
    clean = false;
    tries++;
    state.tricky[current.word] = num(state.tricky[current.word]) + 1;
    if (state.streak) { state.streak = 0; }
    save();
    updateHud();

    const ok = rightPrefix();
    const wrongChar = typed[ok] ? typed[ok].char : "";
    locked = true;                       // no tapping during the shake
    el.slots.classList.add("wrong");
    el.feedback.style.color = "var(--pink)";
    if (tries >= 2) {
      el.feedback.textContent = "💡 " + current.tip;
    } else if (ok === 0) {
      el.feedback.textContent = "Not quite — it doesn't start with “" + wrongChar +
        "”. Sound out the first letter! 💪";
    } else {
      el.feedback.textContent = "The first " + (ok === 1 ? "letter is" : ok + " letters are") +
        " right! But “" + wrongChar + "” isn't the " + ordinal(ok + 1) + " letter. 💪";
    }
    window.SFX && SFX.nope();
    later(() => {
      el.slots.classList.remove("wrong");
      while (typed.length > ok) removeLast();
      locked = false;
      if (tries >= 3) glowNextLetter();   // third miss: just show them
    }, 900);
  }

  /* a hint that teaches: first press explains the rule, next press makes the
     NEXT correct letter glow — the speller still has to tap it themselves */
  function giveHint() {
    if (locked || !current) return;
    clean = false;
    hints++;
    state.tricky[current.word] = num(state.tricky[current.word]) + 1;
    save();
    if (hints === 1) {
      el.feedback.style.color = "var(--blue)";
      el.feedback.textContent = "💡 " + current.tip;
      return;
    }
    el.slots.classList.remove("wrong");
    while (typed.length > rightPrefix()) removeLast();
    glowNextLetter();
  }

  function glowNextLetter() {
    if (!current || typed.length >= current.word.length) return;
    const need = current.word[typed.length];
    const btns = el.bank.querySelectorAll(".letter:not(:disabled)");
    for (const b of btns) {
      if (b.dataset.letter === need) {
        b.classList.remove("glow"); void b.offsetWidth; b.classList.add("glow");
        later(() => b.classList.remove("glow"), 1600);
        break;
      }
    }
    el.feedback.style.color = "var(--blue)";
    el.feedback.textContent = "💡 The glowing letter comes next!";
  }

  /* ---------- a correct spelling ---------- */
  function succeed() {
    locked = true;
    el.skip.disabled = true;
    const slots = el.slots.children;
    for (let k = 0; k < slots.length; k++) slots[k].classList.add("good");

    const firstTime = !state.mastered[current.word];
    if (firstTime) { state.mastered[current.word] = true; round.learned++; }
    const earned = clean ? 2 : 1;   // bonus star for a perfect first try
    state.stars += earned;
    round.stars += earned;
    round.played++;
    if (clean) {
      state.perfect[current.word] = true;
      state.streak++;
      round.perfect++;
      if (state.streak > state.bestStreak) state.bestStreak = state.streak;
      window.SFX && SFX.streak(state.streak);
    } else {
      window.SFX && SFX.good();
    }
    save();
    updateHud();

    el.feedback.style.color = "var(--green)";
    el.feedback.textContent = clean
      ? (firstTime ? "✨ New word learned — first try! +2 ⭐" : "🌟 First try! +2 ⭐")
      : (firstTime ? "✨ New word learned! +1 ⭐" : "✅ Spelled it! +1 ⭐");
    sparkleBurst();
    playClip("word-" + current.word);
    later(showStudy, REDUCED ? 300 : 700);
  }

  /* The WORD STUDY card — the actual vocabulary lesson. It waits for a tap
     so there's time to read it (no auto-advance to rush a reader). */
  function showStudy() {
    el.clueCard.hidden = true;
    el.bank.hidden = true;
    el.controls.hidden = true;
    el.studyArt.innerHTML = art(current.word);
    el.studyArt.hidden = !el.studyArt.innerHTML;
    el.studyWord.textContent = current.word;
    el.studyPos.textContent = current.part || "noun";
    el.studyDef.textContent = current.clue;
    el.studySentence.textContent = "“" + current.sentence + "”";
    el.studyTip.textContent = "💡 " + current.tip;
    const last = qPos >= queue.length - 1;
    el.studyNext.textContent = last ? "Finish spellbook ▶" : "Next word ▶";
    el.study.hidden = false;
    try { el.studyNext.focus({ preventScroll: true }); } catch (e) { el.studyNext.focus(); }
  }

  function nextWord() {
    qPos++;
    if (qPos >= queue.length) finishRound();
    else loadWord();
  }

  /* Skip sends the word to the BACK of the queue instead of throwing it away,
     so it comes round again — and a spellbook only unlocks the next one when
     every word in it is genuinely mastered (skipping can't cheat the lock). */
  function skipWord() {
    if (locked || !current) return;
    const idx = queue[qPos];
    queue.splice(qPos, 1);
    skips[idx] = (skips[idx] || 0) + 1;
    if (skips[idx] < 2) queue.push(idx);
    if (qPos >= queue.length) finishRound();
    else loadWord();
  }

  function finishRound() {
    const b = book;
    const allDone = b.words.every((w) => state.mastered[w.word]);
    state.rounds++;
    if (bookIdx >= 0 && allDone && state.unlocked < Math.min(BOOKS.length, bookIdx + 2)) {
      state.unlocked = Math.min(BOOKS.length, bookIdx + 2);
    }
    save();
    updateHud();
    renderLevels();

    el.winBig.innerHTML = art(b.icon);
    const hasNext = bookIdx >= 0 && bookIdx < BOOKS.length - 1;

    if (b.review) {
      el.winTitle.textContent = "Review complete!";
      el.winText.textContent = "You practised " + round.played + " word" +
        (round.played === 1 ? "" : "s") + " you already knew. Sharp as a wand tip! 🪄";
    } else if (allDone) {
      el.winTitle.textContent = b.name + " mastered!";
      el.winText.textContent = hasNext
        ? "Every word in this spellbook is yours. A new spellbook is unlocked!"
        : (bookIdx === BOOKS.length - 1
          ? "Wow — you finished every spellbook! You're a true Word Wizard. 🪄"
          : "Every word in this spellbook is yours. 🪄");
    } else {
      const left = b.words.filter((w) => !state.mastered[w.word]).length;
      el.winTitle.textContent = "Good spelling!";
      el.winText.textContent = left + " word" + (left === 1 ? "" : "s") +
        " still to master in " + b.name +
        (hasNext ? " — finish them all to unlock the next spellbook." : ".");
    }

    const nr = nextRank(state.stars);
    const r = rankFor(state.stars);
    el.winStats.innerHTML =
      '<span class="stat">✨ ' + round.learned + " new word" + (round.learned === 1 ? "" : "s") + "</span>" +
      '<span class="stat">⭐ +' + round.stars + " star" + (round.stars === 1 ? "" : "s") + "</span>" +
      '<span class="stat">🔥 streak ' + state.streak + " (best " + state.bestStreak + ")</span>" +
      '<span class="stat">' + r.emoji + " " + r.name +
        (nr ? " · " + (nr.at - state.stars) + " ⭐ to " + nr.name : " · top rank!") + "</span>";

    el.winNext.style.display = (hasNext && state.unlocked > bookIdx + 1) ? "" : "none";
    el.winAgain.textContent = b.review ? "🔁 Review again" : "🔁 Play this book again";
    show("win");
    window.SFX && SFX.win();
    window.Confetti && Confetti.burst({ count: allDone || b.review ? 120 : 60 });
    playClip("you-did-it");
  }

  function toLevels() {
    renderLevels();
    show("levels");
    try { el.dictBtn.focus({ preventScroll: true }); } catch (e) { /* fine */ }
  }

  /* ---------- keyboard support (for big kids who like typing) ---------- */
  document.addEventListener("keydown", (e) => {
    if (el.play.classList.contains("hidden")) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;   // never steal Ctrl+R etc.

    if (!el.study.hidden) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); nextWord(); }
      return;
    }
    if (locked) return;
    if (e.key === "Backspace") { e.preventDefault(); removeLast(); return; }
    if (e.key === "Escape") { clearAll(); return; }
    if (e.key === "?") { giveHint(); return; }
    const k = e.key.toLowerCase();
    if (k.length === 1 && k >= "a" && k <= "z") {
      const btns = el.bank.querySelectorAll(".letter:not(:disabled)");
      for (const b of btns) {
        if (b.dataset.letter === k) { placeLetter(k, b); return; }
      }
      // typed a letter that isn't available — say so instead of ignoring it
      el.feedback.style.color = "var(--pink)";
      el.feedback.textContent = "There's no “" + k + "” left in the letter bank.";
    }
  });

  /* ---------- wire up buttons ---------- */
  el.clear.addEventListener("click", clearAll);
  el.hear.addEventListener("click", () => { if (current) playClip("word-" + current.word); });
  el.hint.addEventListener("click", giveHint);
  el.skip.addEventListener("click", skipWord);
  el.quit.addEventListener("click", toLevels);
  el.studyNext.addEventListener("click", nextWord);
  el.studyHear.addEventListener("click", () => { if (current) playClip("word-" + current.word); });
  el.dictBtn.addEventListener("click", () => { renderDict(); show("dict"); });
  el.dictBack.addEventListener("click", toLevels);
  el.dictPractise.addEventListener("click", startReview);
  el.winMenu.addEventListener("click", toLevels);
  el.winAgain.addEventListener("click", () => {
    if (book && book.review) startReview();
    else if (book) startBook(book, bookIdx);
  });
  el.winNext.addEventListener("click", () => {
    if (bookIdx >= 0 && bookIdx < BOOKS.length - 1) startBook(BOOKS[bookIdx + 1], bookIdx + 1);
    else toLevels();
  });

  /* ---------- go ---------- */
  updateHud();
  renderLevels();
  show("levels");
})();
