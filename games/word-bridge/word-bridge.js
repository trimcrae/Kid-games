/* ===========================================================
   Word Bridge — our own version of the Roblox game.
   -----------------------------------------------------------
   How it goes, same as the real one:

     • A prompt pops up — "Name an animal that lives in the
       ocean" — and you type an answer as fast as you can.
     • EVERY LETTER of your answer becomes a plank, so
       JELLYFISH (9) builds twice as much bridge as CRAB (4).
       Long answers win.
     • The planks slam down in front of you and your character
       walks forward along them, deeper into the canyon.
     • You're racing a bot on the bridge next to yours. First
       one to reach the island wins.
     • Planks earn coins, and coins buy bridge skins.

   It's a long way across (60 planks), so a crossing takes
   plenty of words — which is the whole point.

   On top of that:
     • LETTER ROUNDS (Speedy and Pro bots only): now and then the
       prompt adds "…starting with P", which is the real game's
       favourite twist and a proper phonics workout.
     • GOLDEN ROUNDS pay double coins, and a quick answer earns
       a speed bonus — so there's a reason to think fast AND long.
     • THE WORD BOOK remembers every word each kid has ever
       answered, per category, like a sticker album.
     • BADGES for the milestones worth bragging about.
     • READ ALOUD: the prompt (and any picture you tap) can be
       spoken, so a three-year-old can play without a reader.

   Little kids who can't type yet can tap a picture instead.

   What it teaches: vocabulary and categories, spelling, and —
   since longer answers literally carry you further — how many
   letters a word has. A wrong answer is never just "nope": if
   the word is real, the game says which category it DOES belong
   to; if it's a near-miss, it shows the right spelling.

   Saved in the browser, per kid.
   =========================================================== */

(function () {
  "use strict";

  var KIDS = [
    // Each kid gets their own sprite (sprites.js) and their own save slot.
    { id: "jeannie", name: "Jeannie", color: "#ff6fa5", tap: false, pace: "speedy" },
    { id: "cory",    name: "Cory",    color: "#2b8cff", tap: false, pace: "speedy" },
    { id: "ellie",   name: "Ellie",   color: "#9b3fc4", tap: true,  pace: "gentle" },
    { id: "shannon", name: "Shannon", color: "#12a594", tap: false, pace: "pro" },
    { id: "tristan", name: "Tristan", color: "#3457c4", tap: false, pace: "pro" }
  ];

  var FINISH = 60;      // planks across the canyon — a proper long bridge

  /* The rivals. `min`/`max` are how many planks each lays per round, so
     they set the whole pace of a crossing: Rusty is beatable by a
     five-year-old typing CAT, Volt needs grown-up words at speed.
     `letters` is how often a round demands a starting letter, and
     `hard` is whether the grown-up categories are in the deck. */
  var PACES = {
    gentle: { label: "Gentle bot", bot: "Rusty", seconds: 50, min: 3, max: 5,  fumble: 0.18, letters: 0,    hard: false },
    speedy: { label: "Speedy bot", bot: "Zippy", seconds: 30, min: 4, max: 8,  fumble: 0.06, letters: 0.22, hard: true },
    pro:    { label: "Pro bot",    bot: "Volt",  seconds: 18, min: 7, max: 11, fumble: 0,    letters: 0.4,  hard: true }
  };

  var SKINS = [
    { id: "wood",     name: "Wood",     cost: 0 },
    { id: "stone",    name: "Stone",    cost: 60 },
    { id: "candy",    name: "Candy",    cost: 140 },
    { id: "bamboo",   name: "Bamboo",   cost: 200 },
    { id: "ice",      name: "Ice",      cost: 250 },
    { id: "grass",    name: "Grass",    cost: 320 },
    { id: "princess", name: "Princess", cost: 380 },
    { id: "rainbow",  name: "Rainbow",  cost: 450 },
    { id: "lava",     name: "Lava",     cost: 560 },
    { id: "gold",     name: "Gold",     cost: 700 },
    { id: "galaxy",   name: "Galaxy",   cost: 900 }
  ];

  /* Something to climb towards that isn't just a number going up. */
  var RANKS = [
    [0,    "Plank Cadet"],
    [200,  "Rope Walker"],
    [500,  "Bridge Builder"],
    [1000, "Canyon Crosser"],
    [2000, "Master Engineer"],
    [4000, "Legend of the Canyon"]
  ];

  /* Badges: each has a test run at the end of a race, against the kid's
     save (m) and the race just finished. Earned once, kept forever. */
  var BADGES = [
    { id: "first",    e: "🏁", name: "First Crossing",     how: "Win a race",
      test: function (m) { return m.wins >= 1; } },
    { id: "long8",    e: "📏", name: "Big Word",           how: "Answer with an 8-letter word",
      test: function (m) { return norm(m.best).length >= 8; } },
    { id: "long11",   e: "🐋", name: "Whopper",            how: "Answer with an 11-letter word",
      test: function (m) { return norm(m.best).length >= 11; } },
    { id: "streak5",  e: "🔥", name: "On Fire",            how: "Five right in a row",
      test: function (m) { return m.bestStreak >= 5; } },
    { id: "streak10", e: "⚡", name: "Unstoppable",        how: "Ten right in a row",
      test: function (m) { return m.bestStreak >= 10; } },
    { id: "speedy",   e: "💨", name: "Speed Demon",        how: "Beat Zippy, the Speedy bot",
      test: function (m, r) { return r.won && r.pace === "speedy"; } },
    { id: "pro",      e: "🤖", name: "Bot Buster",         how: "Beat Volt, the Pro bot",
      test: function (m, r) { return r.won && r.pace === "pro"; } },
    { id: "fewest7",  e: "🧠", name: "Efficient Engineer", how: "Cross in 7 words or fewer",
      test: function (m) { return m.fewest && m.fewest <= 7; } },
    { id: "perfect",  e: "💯", name: "Perfect Race",       how: "Win without a single slip or time-out",
      test: function (m, r) { return r.won && r.slips === 0; } },
    { id: "nohint",   e: "🙈", name: "No Peeking",         how: "Win a race without using a hint",
      test: function (m, r) { return r.won && r.hintsUsed === 0; } },
    { id: "letters",  e: "🔤", name: "Letter Master",      how: "Answer 5 'starting with' rounds",
      test: function (m) { return m.letterWins >= 5; } },
    { id: "golden",   e: "✨", name: "Golden Touch",       how: "Answer 5 golden rounds",
      test: function (m) { return m.golden >= 5; } },
    { id: "planks500",  e: "🪵", name: "Five Hundred",      how: "Lay 500 planks in total",
      test: function (m) { return m.planks >= 500; } },
    { id: "planks2000", e: "🪓", name: "Lumberjack",       how: "Lay 2,000 planks in total",
      test: function (m) { return m.planks >= 2000; } },
    { id: "book50",   e: "📚", name: "Bookworm",           how: "50 different words in your Word Book",
      test: function (m) { return bookCount(m) >= 50; } },
    { id: "book200",  e: "🎓", name: "Walking Dictionary", how: "200 different words in your Word Book",
      test: function (m) { return bookCount(m) >= 200; } },
    { id: "explorer", e: "🧭", name: "Explorer",           how: "Answer in 40 different categories",
      test: function (m) { return Object.keys(m.book).length >= 40; } },
    { id: "collector", e: "🌟", name: "Collector",         how: "Own 5 bridge skins",
      test: function (m) { return m.owned.length >= 5; } }
  ];

  var SAVE_KEY = "wordBridge.v1";
  var CURRENT_KID_KEY = "mcrae.currentKid";   // shared with the other games

  var kidRow = document.getElementById("kid-row");
  var optRow = document.getElementById("opt-row");
  var barEl = document.getElementById("bar");
  var shopEl = document.getElementById("shop");
  var skinsEl = document.getElementById("skins");
  var bookEl = document.getElementById("book-body");
  var badgesEl = document.getElementById("badge-grid");
  var sceneEl = document.getElementById("scene");
  var stageCanvas = document.getElementById("stage");
  var hudEl = document.getElementById("hud");
  var progYou = document.getElementById("prog-you");
  var progBot = document.getElementById("prog-bot");
  var markYou = document.getElementById("mark-you");
  var markBot = document.getElementById("mark-bot");
  var modal = document.getElementById("modal");
  var card = document.getElementById("modal-card");
  var pauseBar = document.getElementById("pause-bar");

  /* =========================================================
     SAVING
     ========================================================= */
  function blankKid() {
    return {
      coins: 0, races: 0, wins: 0, planks: 0, best: "",
      skin: "wood", owned: ["wood"], tap: null, pace: null,
      // added later — load() fills these in for saves made before they existed
      bestStreak: 0, right: 0, fewest: 0,
      book: {}, badges: [], golden: 0, letterWins: 0, voice: null
    };
  }

  function load() {
    var s = {};
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (raw) s = JSON.parse(raw) || {};
    } catch (e) { s = {}; }
    KIDS.forEach(function (k) {
      var d = blankKid();
      if (!s[k.id] || typeof s[k.id] !== "object") s[k.id] = d;
      // Old saves keep everything they had; only the new fields get defaults,
      // so nobody loses coins or skins when the game grows.
      Object.keys(d).forEach(function (key) {
        if (s[k.id][key] === undefined) s[k.id][key] = d[key];
      });
      if (!Array.isArray(s[k.id].owned) || !s[k.id].owned.length) s[k.id].owned = ["wood"];
      if (!s[k.id].book || typeof s[k.id].book !== "object") s[k.id].book = {};
      if (!Array.isArray(s[k.id].badges)) s[k.id].badges = [];
    });
    return s;
  }

  function store() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* private mode — play on */ }
  }

  var save = load();

  var kidId = (function () {
    var saved = null;
    try { saved = localStorage.getItem(CURRENT_KID_KEY); } catch (e) { /* ignore */ }
    return KIDS.some(function (k) { return k.id === saved; }) ? saved : "jeannie";
  })();

  function kid() {
    for (var i = 0; i < KIDS.length; i++) if (KIDS[i].id === kidId) return KIDS[i];
    return KIDS[0];
  }
  function me() { return save[kidId]; }
  function tapMode() { return me().tap === null ? kid().tap : me().tap; }
  function paceId() { return PACES[me().pace] ? me().pace : kid().pace; }
  function pace() { return PACES[paceId()] || PACES.speedy; }
  // Read-aloud defaults on for the picture-tappers, off for the readers.
  function voiceOn() { return me().voice === null ? tapMode() : !!me().voice; }

  function rank(planks) {
    var name = RANKS[0][1];
    for (var i = 0; i < RANKS.length; i++) if (planks >= RANKS[i][0]) name = RANKS[i][1];
    return name;
  }
  function nextRank(planks) {
    for (var i = 0; i < RANKS.length; i++) if (planks < RANKS[i][0]) return RANKS[i];
    return null;
  }

  function bookCount(m) {
    var n = 0;
    Object.keys(m.book).forEach(function (k) { n += m.book[k].length; });
    return n;
  }

  /* =========================================================
     READ ALOUD — the browser's own voice, no downloads
     ========================================================= */
  var canSpeak = !!(window.speechSynthesis && window.SpeechSynthesisUtterance);
  function speak(text) {
    if (!canSpeak || !voiceOn() || !text) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(String(text));
      u.rate = 0.95;
      u.pitch = 1.05;
      var voices = window.speechSynthesis.getVoices() || [];
      var pick = null;
      for (var i = 0; i < voices.length; i++) {
        if (/^en[-_]GB/i.test(voices[i].lang)) { pick = voices[i]; break; }
      }
      if (!pick) for (var j = 0; j < voices.length; j++) {
        if (/^en/i.test(voices[j].lang)) { pick = voices[j]; break; }
      }
      if (pick) u.voice = pick;
      window.speechSynthesis.speak(u);
    } catch (e) { /* no voice — no problem */ }
  }

  /* =========================================================
     ANSWER MATCHING
     ========================================================= */
  // "Ice Cream!" and "ice-creams" both become "icecream".
  function norm(word) {
    return String(word || "").toLowerCase().replace(/[^a-z]/g, "");
  }

  // "a banana" / "the moon" — kids say the article out loud, so type it too.
  function stripArticle(text) {
    return String(text || "").trim().replace(/^(a|an|the)\s+/i, "");
  }

  var ANSWERS = WB_QUESTIONS.map(function (q) {
    var set = {};
    q.ok.forEach(function (w) { set[norm(w)] = w; });
    (q.pics || []).forEach(function (p) { if (!set[norm(p[0])]) set[norm(p[0])] = p[0]; });
    return set;
  });

  // Every answer the game knows, anywhere — so a real word typed into the
  // wrong category gets told what it IS, instead of "I don't know that".
  // The showcase lists go in first, so DOG comes back as "an animal with
  // four legs" rather than whichever obscure list happens to hold it too.
  var ELSEWHERE = {};
  WB_QUESTIONS.forEach(function (q, i) {
    (q.top || []).forEach(function (w) {
      if (ELSEWHERE[norm(w)] === undefined) ELSEWHERE[norm(w)] = i;
    });
  });
  WB_QUESTIONS.forEach(function (q, i) {
    Object.keys(ANSWERS[i]).forEach(function (k) {
      if (ELSEWHERE[k] === undefined) ELSEWHERE[k] = i;
    });
  });

  // The bit of the question that names the thing: "Name a bird" -> "a bird".
  function subject(i) {
    return WB_QUESTIONS[i].q.replace(/^Name\s+/i, "");
  }

  // How many single-letter edits apart are these two words? (Stops
  // counting once it passes `max`, so it stays cheap.) Kids spell
  // ELEFANT and TRYCEROTOPS, and those should still count.
  function within(a, b, max) {
    if (a === b) return true;
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > max) return false;
    var prev = [], cur = [], i, j;
    for (j = 0; j <= lb; j++) prev[j] = j;
    for (i = 1; i <= la; i++) {
      cur[0] = i;
      var best = cur[0];
      for (j = 1; j <= lb; j++) {
        cur[j] = Math.min(
          prev[j] + 1,                                        // drop a letter
          cur[j - 1] + 1,                                     // add one
          prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)       // swap one
        );
        if (cur[j] < best) best = cur[j];
      }
      if (best > max) return false;
      prev = cur.slice();
    }
    return prev[lb] <= max;
  }

  /* Does this count? Returns { key, fuzzy } or null. Forgiving on purpose:
     a kid who names a real answer must never be turned away. */
  function accepted(qIndex, typed) {
    var n = norm(stripArticle(typed));
    if (!n) return null;
    var set = ANSWERS[qIndex];

    var tries = [n, n + "s", n + "es"];
    if (/s$/.test(n)) tries.push(n.slice(0, -1));
    if (/es$/.test(n)) tries.push(n.slice(0, -2));
    if (/ies$/.test(n)) tries.push(n.slice(0, -3) + "y");
    if (/ves$/.test(n)) tries.push(n.slice(0, -3) + "f", n.slice(0, -3) + "fe");
    for (var i = 0; i < tries.length; i++) {
      if (set[tries[i]]) return { key: tries[i], fuzzy: false };
    }

    // Still no? Forgive spelling slips — one on a middling word, two on a
    // long one, since the long ones are exactly where kids come unstuck.
    var slack = n.length >= 7 ? 2 : n.length >= 5 ? 1 : 0;
    if (slack) {
      var keys = Object.keys(set);
      for (var k = 0; k < keys.length; k++) {
        if (within(n, keys[k], slack)) return { key: keys[k], fuzzy: true };
      }
    }
    return null;
  }

  /* One step further out than `accepted` will go — not close enough to
     count, but close enough to be worth showing the real spelling of.
     Only ever looks at the showcase words, so the suggestion is a word
     the kid has actually heard of. */
  function nearMiss(qIndex, typed) {
    var n = norm(stripArticle(typed));
    if (n.length < 4) return null;
    var top = WB_QUESTIONS[qIndex].top || [];
    var slack = n.length >= 7 ? 3 : 2;
    var best = null, bestGap = 99;
    for (var i = 0; i < top.length; i++) {
      var k = norm(top[i]);
      for (var g = 1; g <= slack; g++) {
        if (g < bestGap && within(n, k, g)) { best = top[i]; bestGap = g; break; }
      }
    }
    return best;
  }

  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function randInt(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* =========================================================
     TIMERS (all in one place so a restart can kill them)
     ========================================================= */
  var pending = [];
  var tick = null;

  function later(fn, ms) {
    var id = setTimeout(function () {
      pending = pending.filter(function (p) { return p !== id; });
      fn();
    }, ms);
    pending.push(id);
    return id;
  }

  function clearTimers() {
    pending.forEach(clearTimeout);
    pending = [];
    if (tick) { clearInterval(tick); tick = null; }
  }

  /* =========================================================
     THE RACE
     ========================================================= */
  var race = null;

  function questionDeck() {
    var pool = WB_QUESTIONS.map(function (q, i) { return i; });
    if (tapMode()) {
      // Tap mode can only use the questions that come with pictures.
      pool = pool.filter(function (i) { return (WB_QUESTIONS[i].pics || []).length >= 3; });
    } else if (!pace().hard) {
      // The gentle bot never asks the grown-up categories.
      pool = pool.filter(function (i) { return !WB_QUESTIONS[i].hard; });
    }
    return shuffle(pool);
  }

  function newRace() {
    clearTimers();
    race = {
      you: { laid: 0, words: [] },
      bot: { laid: 0, words: [] },
      deck: questionDeck(),
      used: {},
      q: -1,
      round: 0,
      over: false,
      paused: false,
      answered: false,
      coins: 0,
      streak: 0,
      bestStreak: 0,
      hints: 0,
      hintsUsed: 0,
      slips: 0,             // wrong answers + time-outs, for the Perfect badge
      letter: null,         // "P" on a "starting with P" round
      golden: false,        // double-coin round
      learned: [],          // words the game had to show you
      pace: paceId(),
      note: null            // the coaching line shown on the NEXT prompt
    };
    if (pauseBar) pauseBar.hidden = true;
    WBStage.reset({ finish: FINISH, skin: me().skin, hero: kidId, bot: paceId() });
    renderHud();
    renderBar();
    nextRound();
  }

  /* ---------- the scene ---------- */
  function renderHud() {
    hudEl.innerHTML =
      "<span>" + esc(kid().name) + " " + race.you.laid + " / " + FINISH + " planks</span>" +
      '<span class="bot-side">' + esc(pace().bot) + " " + race.bot.laid + " / " + FINISH + "</span>";
    progYou.style.width = Math.min(100, (race.you.laid / FINISH) * 100) + "%";
    progBot.style.width = Math.min(100, (race.bot.laid / FINISH) * 100) + "%";
    if (markYou) markYou.style.left = Math.min(100, (race.you.laid / FINISH) * 100) + "%";
    if (markBot) markBot.style.left = Math.min(100, (race.bot.laid / FINISH) * 100) + "%";
    // A canvas says nothing to a screen reader, so the scene carries the score.
    if (sceneEl) {
      sceneEl.setAttribute("aria-label",
        "The canyon. " + kid().name + " has laid " + race.you.laid + " of " + FINISH +
        " planks; " + pace().bot + " the bot has laid " + race.bot.laid + ".");
    }
  }

  function renderMarkers() {
    if (!markYou || !markBot) return;
    markYou.innerHTML = "";
    markBot.innerHTML = "";
    var a = WBSprites.thumb("hero." + kidId + ".walk", 2, 1);
    var b = WBSprites.thumb("bot." + paceId() + ".walk", 2, 0);
    if (a) markYou.appendChild(a);
    if (b) markBot.appendChild(b);
  }

  /* Hand a word's letters to the stage, which slams them down one at a
     time and tells us how long that takes. Returns how many planks
     actually landed (the last word can overshoot the island). */
  function dropPlanks(who, word) {
    var side = race[who];
    var letters = norm(word).toUpperCase().split("");
    var use = letters.slice(0, Math.max(0, FINISH - side.laid));
    side.words.push(word);
    side.laid += use.length;
    var ms = WBStage.addPlanks(who, use, word);
    renderHud();
    return { ms: ms, laid: use.length };
  }

  function walk(who) {
    return WBStage.walk(who);
  }

  /* =========================================================
     ONE ROUND
     ========================================================= */

  // Pick a starting letter that at least three showcase answers share, so
  // a letter round is always answerable with a word the kid knows.
  function pickLetter(qIndex) {
    var top = WB_QUESTIONS[qIndex].top || [];
    var counts = {};
    top.forEach(function (w) {
      var c = norm(w).charAt(0);
      if (!race.used["you:" + norm(w)]) counts[c] = (counts[c] || 0) + 1;
    });
    var good = Object.keys(counts).filter(function (c) { return counts[c] >= 3; });
    if (!good.length) return null;
    return good[randInt(0, good.length - 1)].toUpperCase();
  }

  function nextRound() {
    if (race.over) return;
    if (!race.deck.length) race.deck = questionDeck();
    race.q = race.deck.pop();
    race.round++;
    race.answered = false;
    race.hints = 0;
    race.hintWord = null;
    race.left = pace().seconds * 1000;
    race.letter = null;
    race.golden = false;
    var p = pace();
    if (!tapMode() && race.round > 1 && p.letters && Math.random() < p.letters) {
      race.letter = pickLetter(race.q);
    }
    if (race.round > 1 && !race.letter && Math.random() < 0.15) race.golden = true;
    openModal();
    startClock();
  }

  function startClock() {
    if (tick) clearInterval(tick);
    var total = pace().seconds * 1000;
    tick = setInterval(function () {
      if (race.paused) return;
      race.left -= 100;
      var bar = document.getElementById("timer-bar");
      if (bar) {
        bar.style.width = Math.max(0, (race.left / total) * 100) + "%";
        bar.parentNode.classList.toggle("low", race.left < total * 0.35);
      }
      if (race.left <= 0) {
        clearInterval(tick); tick = null;
        if (!race.answered) timeUp();
      }
    }, 100);
  }

  // The showcase words still open to you this round (letter rule included).
  function openTop(who) {
    var q = WB_QUESTIONS[race.q];
    var pool = (q.top || q.ok).filter(function (w) {
      if (race.used[who + ":" + norm(w)]) return false;
      if (race.letter && norm(w).charAt(0) !== race.letter.toLowerCase()) return false;
      return true;
    });
    return pool;
  }

  /* Running out isn't a dead end — it's the moment to teach a word. */
  function timeUp() {
    var top = openTop("you");
    var pick = top.length ? top[randInt(0, top.length - 1)] : null;
    race.streak = 0;
    race.slips++;
    if (pick) race.learned.push(pick);
    race.note = pick
      ? "⏰ Time ran out! You could have said <b>" + esc(pick.toUpperCase()) +
        "</b> — that's <b>" + norm(pick).length + "</b> planks."
      : "⏰ Time ran out on that one!";
    window.SFX && SFX.nope && SFX.nope();
    resolveRound(null);
  }

  // Remember the word in this kid's Word Book.
  function record(word) {
    var m = me();
    var key = WB_QUESTIONS[race.q].q;
    if (!m.book[key]) m.book[key] = [];
    var n = norm(word);
    var have = m.book[key].some(function (w) { return norm(w) === n; });
    if (!have) { m.book[key].push(word); return true; }
    return false;
  }

  /* The round plays out: your planks drop and you walk, then the
     bot's do the same, then we see if anyone reached the island. */
  function resolveRound(word) {
    if (race.over || race.answered) return;
    race.answered = true;
    if (tick) { clearInterval(tick); tick = null; }
    closeModal();

    var wait = 250;
    if (word) {
      var total = pace().seconds * 1000;
      var quick = race.left > total * 0.6;
      var drop = dropPlanks("you", word);
      var m = me();
      m.planks += drop.laid;
      m.right++;
      var earned = drop.laid * (race.golden ? 2 : 1);
      race.coins += earned;
      race.streak++;
      if (race.streak > race.bestStreak) race.bestStreak = race.streak;
      if (race.streak > m.bestStreak) m.bestStreak = race.streak;
      var isNew = record(word);
      if (race.letter) m.letterWins++;
      if (race.golden) m.golden++;

      var notes = [];
      if (race.golden) notes.push("⭐ Golden round: <b>" + earned + "</b> coins for " + drop.laid + " planks!");
      if (quick) {
        race.coins += 3;
        notes.push("⚡ Quick answer! Bonus <b>3</b> coins.");
      }
      // three in a row without a slip is worth something
      if (race.streak % 3 === 0) {
        race.coins += 5;
        notes.push("🔥 <b>" + race.streak + " in a row!</b> Bonus <b>5</b> coins.");
        window.SFX && SFX.streak && SFX.streak(race.streak);
      }
      if (norm(word).length > norm(m.best).length) {
        m.best = word;
        if (norm(word).length >= 8) {
          notes.push("🏆 <b>" + esc(word.toUpperCase()) + "</b> is your longest word ever!");
        }
      } else if (isNew) {
        notes.push("📖 <b>" + esc(word.toUpperCase()) + "</b> is new in your Word Book.");
      }
      race.note = notes.length ? notes.join("<br>") : null;
      store();
      renderBar();
      window.SFX && SFX.good && SFX.good();
      later(function () {
        walk("you");
        WBStage.pop("you", "+" + earned, race.golden ? "#fff3a3" : "#ffe066");
        if (quick) later(function () { WBStage.pop("you", "⚡ +3", "#9fe4ff"); }, 350);
        if (race.streak % 3 === 0) later(function () { WBStage.pop("you", "🔥 +5", "#ff9fbf"); }, 700);
      }, drop.ms);
      wait = drop.ms + 1400;          // planks drop, you walk, camera follows
    }

    later(function () {
      if (race.over) return;
      // You got there first — no need to sit through the bot's turn.
      if (race.you.laid >= FINISH) { finish(); return; }
      botTurn();
      later(function () {
        if (race.over) return;
        if (race.you.laid >= FINISH || race.bot.laid >= FINISH) finish();
        else nextRound();
      }, 1200);
    }, wait);
  }

  function botTurn() {
    var q = WB_QUESTIONS[race.q];
    var p = pace();
    // The bot occasionally fluffs its turn — that's what gives a small kid
    // room to catch up on the gentle setting.
    if (p.fumble && Math.random() < p.fumble) {
      race.botSaid = null;
      race.botFumbled = true;
      return;
    }
    race.botFumbled = false;
    var want = randInt(p.min, p.max);
    // Only the showcase answers, so the bot never says a word out of a
    // grown-up dictionary that nobody in this house has heard of. On a
    // letter round it plays by the same rule you do.
    var pool = openTop("bot");
    if (!pool.length && race.letter) {
      // Nothing left starting with that letter: the bot is stumped too.
      race.botSaid = null;
      race.botFumbled = true;
      return;
    }
    if (!pool.length) pool = q.top || q.ok;
    var best = pool[0], gap = 99;
    shuffle(pool).forEach(function (w) {
      var g = Math.abs(norm(w).length - want);
      if (g < gap) { gap = g; best = w; }
    });
    race.used["bot:" + norm(best)] = true;
    race.botSaid = best;
    var drop = dropPlanks("bot", best);
    later(function () { walk("bot"); }, drop.ms);
  }

  /* =========================================================
     THE PROMPT MODAL
     ========================================================= */
  function promptText() {
    var q = WB_QUESTIONS[race.q];
    return race.letter ? q.q + " starting with " + race.letter : q.q;
  }

  function openModal() {
    var q = WB_QUESTIONS[race.q];
    modal.hidden = false;
    card.dataset.q = race.q;            // so the play-test knows what's being asked
    card.dataset.round = race.round;    // …and can tell one round from the next

    var lines = [];
    if (race.note) lines.push(race.note);
    if (race.spellNote) {
      lines.push("✏️ That one is spelled <b>" + esc(race.spellNote.toUpperCase()) + "</b>.");
    }
    if (race.botFumbled) lines.push("🤖 " + esc(pace().bot) + " got stuck and laid <b>no</b> planks!");
    else if (race.botSaid) {
      lines.push("🤖 " + esc(pace().bot) + " said <b>" + esc(race.botSaid.toUpperCase()) + "</b> — <b>" +
                 norm(race.botSaid).length + "</b> planks.");
    }
    race.note = null;
    race.spellNote = null;

    var tag = "";
    if (race.letter) tag = '<span class="tag letter">🔤 Starting with <b>' + race.letter + "</b></span>";
    else if (race.golden) tag = '<span class="tag golden">⭐ Golden round — double coins!</span>';

    card.className = "modal-card" + (race.golden ? " is-golden" : "") + (race.letter ? " is-letter" : "");
    card.innerHTML =
      '<button class="pause-btn" type="button" id="pause-btn" aria-label="Pause the race">⏸</button>' +
      (canSpeak ? '<button class="say-btn" type="button" id="say-btn" aria-label="Read the question aloud">🔊</button>' : "") +
      '<p class="round-line">Round ' + race.round +
      (race.streak >= 2 ? ' &nbsp;•&nbsp; <span class="streak">🔥 ' + race.streak + ' in a row</span>' : "") +
      "</p>" +
      '<div class="q-head"><span class="q-icon" aria-hidden="true">' + (q.icon || "🌉") + "</span>" +
      '<h2 class="q-text">' + esc(q.q) +
      (race.letter ? ' <span class="q-letter">starting with ' + race.letter + "</span>" : "") +
      "</h2></div>" +
      (tag ? '<p class="tag-row">' + tag + "</p>" : "") +
      '<p class="q-hint">' + (tapMode()
        ? "Tap an answer — the longer the word, the more planks!"
        : "The longer your answer, the further you walk. <b>" +
          (FINISH - race.you.laid) + "</b> planks left to the island.") +
      "</p>" +
      '<div class="timer"><i id="timer-bar"></i></div>' +
      '<div id="answer-area"></div>' +
      '<p class="feedback" id="feedback" role="status" aria-live="polite"></p>' +
      '<p class="race-line">' + (lines.length ? lines.join("<br>") + "<br>" : "") +
      esc(pace().bot) + ": " + race.bot.laid + " planks &nbsp;•&nbsp; you: " + race.you.laid + " planks</p>";

    var area = document.getElementById("answer-area");
    if (tapMode()) renderTaps(area, q); else renderTyping(area);
    document.getElementById("pause-btn").addEventListener("click", function () { setPaused(true); });
    var sayBtn = document.getElementById("say-btn");
    if (sayBtn) sayBtn.addEventListener("click", function () {
      var was = me().voice;
      me().voice = true;              // a tap on the speaker always speaks
      speak(promptText());
      me().voice = was;
    });
    speak(promptText());
  }

  function closeModal() { modal.hidden = true; }

  /* =========================================================
     PAUSE — the prompt sits on top of the whole page, so without
     this the shop, the kid buttons and "New race" are only
     reachable in the second or two between rounds.
     ========================================================= */
  function setPaused(on) {
    if (!race || race.over) return false;
    if (on && race.answered) return false;      // mid-animation: nothing to pause
    if (race.paused === on) return true;
    race.paused = on;
    modal.hidden = on;
    if (pauseBar) pauseBar.hidden = !on;
    if (!on) {
      var input = document.getElementById("answer-input");
      if (input && window.matchMedia && window.matchMedia("(min-width: 700px)").matches) input.focus();
    }
    return true;
  }

  function renderTyping(area) {
    var form = document.createElement("form");
    form.className = "answer-form";
    form.id = "answer-form";
    form.innerHTML =
      '<input type="text" id="answer-input" autocomplete="off" autocorrect="off" ' +
      'aria-label="Type your answer" ' +
      'autocapitalize="off" spellcheck="false" placeholder="type your answer…" />' +
      '<button class="btn" type="submit">Build! 🔨</button>' +
      '<button class="btn ghost small" type="button" id="hint-btn">💡 Stuck?</button>';
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = document.getElementById("answer-input");
      var text = input.value;
      if (!norm(text)) return;
      input.value = "";
      tryAnswer(text);
    });
    area.appendChild(form);

    // A nudge, then a bigger nudge, then the word — so nobody is ever
    // stuck staring at a prompt with nothing to type.
    form.querySelector("#hint-btn").addEventListener("click", function () {
      if (race.answered) return;
      var q = WB_QUESTIONS[race.q];
      var pool = openTop("you");
      if (!pool.length) pool = q.top || q.ok;
      if (!race.hintWord || race.hints === 0) {
        race.hintWord = pool[randInt(0, pool.length - 1)];
      }
      var pick = race.hintWord;
      var n = norm(pick);
      race.hints++;
      race.hintsUsed++;
      var line;
      if (race.hints === 1) {
        line = "Try one starting with <b>" + esc(pick.charAt(0).toUpperCase()) +
            "</b> — it would lay <b>" + n.length + "</b> planks!";
      } else if (race.hints === 2) {
        line = "It begins <b>" + esc(n.slice(0, 2).toUpperCase()) + "…</b> and has <b>" +
            n.length + "</b> letters.";
      } else {
        line = "The word is <b>" + esc(pick.toUpperCase()) + "</b> — type it in!";
        if (race.learned.indexOf(pick) < 0) race.learned.push(pick);
        speak(pick);
      }
      say(line);
    });

    var input = form.querySelector("input");
    // don't yank a phone keyboard open; on a laptop it's just handy
    if (window.matchMedia && window.matchMedia("(min-width: 700px)").matches) input.focus();
  }

  function renderTaps(area, q) {
    var right = shuffle(q.pics).slice(0, 3);
    // one wrong picture, and we remember where it really belongs so the
    // game can explain the mistake instead of just buzzing
    var others = [];
    WB_QUESTIONS.forEach(function (other, oi) {
      if (oi === race.q || !other.pics) return;
      other.pics.forEach(function (p) { others.push({ pic: p, from: oi }); });
    });
    var wrong = shuffle(others).filter(function (o) {
      return !accepted(race.q, o.pic[0]);     // never offer something that IS a right answer
    })[0];

    var opts = right.map(function (p) { return { pic: p, ok: true }; });
    if (wrong) opts.push({ pic: wrong.pic, ok: false, from: wrong.from });

    var box = document.createElement("div");
    box.className = "taps";
    box.id = "taps";
    var order = shuffle(opts);
    order.forEach(function (o, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tap";
      b.dataset.word = o.pic[0];
      b.dataset.ok = o.ok ? "1" : "0";
      b.dataset.key = String(i + 1);
      b.setAttribute("aria-label", o.pic[0] + " — press " + (i + 1));
      b.innerHTML = '<span class="te" aria-hidden="true">' + o.pic[1] + "</span>" +
                    '<span class="num" aria-hidden="true">' + (i + 1) + "</span>" +
                    esc(o.pic[0].toUpperCase()) +
                    '<span class="len" aria-hidden="true">' + norm(o.pic[0]).length + "</span>";
      b.addEventListener("click", function () {
        if (race.answered || race.paused) return;
        speak(o.pic[0]);
        if (o.ok) {
          window.SFX && SFX.pop && SFX.pop();
          tryAnswer(o.pic[0]);
        } else {
          window.SFX && SFX.nope && SFX.nope();
          b.classList.add("used");
          b.disabled = true;
          race.streak = 0;
          race.slips++;
          say("<b>" + esc(o.pic[0].toUpperCase()) + "</b> is " + esc(subject(o.from)) +
              " — we want " + esc(subject(race.q)) + ". Try another picture!");
        }
      });
      box.appendChild(b);
    });
    area.appendChild(box);
  }

  function tryAnswer(text) {
    if (race.over || race.answered || race.paused) return;
    var m = accepted(race.q, text);
    if (!m) {
      race.slips++;
      say(whyNot(text));
      window.SFX && SFX.nope && SFX.nope();
      return;
    }
    var word = ANSWERS[race.q][m.key];
    if (race.letter && m.key.charAt(0) !== race.letter.toLowerCase()) {
      race.slips++;
      say("<b>" + esc(word.toUpperCase()) + "</b> is " + esc(subject(race.q)) +
          " — but this round wants one starting with <b>" + race.letter + "</b>!");
      window.SFX && SFX.nope && SFX.nope();
      return;
    }
    if (race.used["you:" + m.key]) {
      say("You already used <b>" + esc(word.toUpperCase()) +
          "</b> this race — think of a new one!");
      window.SFX && SFX.nope && SFX.nope();
      return;
    }
    race.used["you:" + m.key] = true;
    // A fixed-up spelling is worth showing, gently, on the next prompt.
    race.spellNote = m.fuzzy ? word : null;
    resolveRound(word);
  }

  // A real word in the wrong category deserves better than "I don't know".
  function whyNot(text) {
    var typed = esc(String(text).trim().toUpperCase());
    var other = ELSEWHERE[norm(stripArticle(text))];
    if (other !== undefined && other !== race.q) {
      return "<b>" + typed + "</b> is " + esc(subject(other)) +
             " — but this round wants <b>" + esc(subject(race.q)) + "</b>. Try again!";
    }
    var close = nearMiss(race.q, text);
    if (close) {
      return "So close! Did you mean <b>" + esc(close.toUpperCase()) +
             "</b>? Have another go at the spelling.";
    }
    if (!/[a-z]/i.test(text) && /\d/.test(text)) {
      return "Spell it out in letters — numbers don't make planks!";
    }
    return 'Hmm, I don\'t know "' + typed + '" for that one — try another!';
  }

  function say(html) {
    var fb = document.getElementById("feedback");
    if (fb) fb.innerHTML = html;
  }

  /* =========================================================
     THE FINISH LINE
     ========================================================= */
  function finish() {
    race.over = true;
    race.paused = false;
    if (pauseBar) pauseBar.hidden = true;
    clearTimers();
    var youWon = race.you.laid >= FINISH;
    race.won = youWon;
    var m = me();
    m.races++;
    if (youWon) {
      m.wins++;
      if (!m.fewest || race.you.words.length < m.fewest) m.fewest = race.you.words.length;
    }
    var prize = race.coins + (youWon ? 40 : 10);
    m.coins += prize;

    // any new badges?
    var fresh = [];
    BADGES.forEach(function (b) {
      if (m.badges.indexOf(b.id) >= 0) return;
      var ok = false;
      try { ok = !!b.test(m, race); } catch (e) { ok = false; }
      if (ok) { m.badges.push(b.id); fresh.push(b); }
    });
    store();
    renderBar();
    renderShop();
    renderBook();
    renderBadges();

    WBStage.celebrate(youWon ? "you" : "bot");
    if (youWon) {
      window.SFX && SFX.win && SFX.win();
      window.Confetti && Confetti.burst && Confetti.burst();
    } else {
      window.SFX && SFX.nope && SFX.nope();
    }

    // a medal for how it went
    var margin = race.you.laid - race.bot.laid;
    var medal = youWon && margin >= 15 ? ["🥇", "Gold — a runaway win!"]
              : youWon ? ["🥈", "Silver — you got there first!"]
              : race.you.laid >= FINISH * 0.75 ? ["🥉", "Bronze — so close!"]
              : ["🎗️", "Keep building — longer words next time!"];

    var next = nextRank(m.planks);
    var longest = race.you.words.slice().sort(function (a, b) { return norm(b).length - norm(a).length; })[0] || "";
    var words = race.you.words.map(function (w) {
      return esc(w.toUpperCase()) + " <i>(" + norm(w).length + ")</i>";
    }).join(" · ");
    var botWords = race.bot.words.map(function (w) {
      return esc(w.toUpperCase()) + " <i>(" + norm(w).length + ")</i>";
    }).join(" · ");
    var learned = race.learned.filter(function (w, i, a) { return a.indexOf(w) === i; });

    modal.hidden = false;
    card.className = "modal-card";
    card.innerHTML =
      '<div class="win-panel">' +
      '<div class="big" id="win-art"></div>' +
      "<h2>" + (youWon ? "You reached the island first!" : esc(pace().bot) + " got there first!") + "</h2>" +
      '<p class="medal"><span class="medal-icon">' + medal[0] + "</span> " + medal[1] + "</p>" +
      '<div class="stats">' +
        '<div class="stat"><b>' + race.you.laid + "</b><span>planks</span></div>" +
        '<div class="stat"><b>' + race.you.words.length + "</b><span>words</span></div>" +
        '<div class="stat"><b>+' + prize + "</b><span>coins</span></div>" +
        '<div class="stat"><b>' + race.bestStreak + "</b><span>best run</span></div>" +
        (longest ? '<div class="stat wide"><b>' + esc(longest.toUpperCase()) + "</b><span>longest word (" + norm(longest).length + ")</span></div>" : "") +
      "</div>" +
      '<p class="words"><b>Your bridge:</b> ' + (words || "—") + "</p>" +
      '<p class="words bot-words"><b>' + esc(pace().bot) + ":</b> " + (botWords || "—") + "</p>" +
      (learned.length ? '<p class="learned">📖 <b>Words to remember:</b> ' +
        learned.map(function (w) { return esc(w.toUpperCase()); }).join(" · ") + "</p>" : "") +
      (fresh.length ? '<div class="new-badges">' + fresh.map(function (b) {
        return '<span class="badge-pill">' + b.e + " New badge: <b>" + esc(b.name) + "</b></span>";
      }).join("") + "</div>" : "") +
      '<p class="rank-line">🏅 <b>' + esc(rank(m.planks)) + "</b>" +
      (next ? " — " + (next[0] - m.planks) + " more planks to <b>" + esc(next[1]) + "</b>" : " — top rank!") +
      (m.fewest ? "<br>Fastest crossing so far: <b>" + m.fewest + "</b> words. Beat it!" : "") +
      "</p>" +
      '<button class="btn" type="button" id="again-btn">Race again →</button>' +
      "</div>";
    var art = WBSprites.thumb(youWon ? "hero." + kidId + ".walk" : "bot." + paceId() + ".walk", 5, 1);
    if (art) document.getElementById("win-art").appendChild(art);
    document.getElementById("again-btn").addEventListener("click", newRace);
    if (fresh.length) window.SFX && SFX.coin && SFX.coin();
  }

  /* =========================================================
     THE BITS AROUND THE GAME
     ========================================================= */
  function renderBar() {
    var m = me();
    barEl.innerHTML =
      '<span class="coin"></span>Coins: <b>' + m.coins + "</b>" +
      " &nbsp;•&nbsp; Races won: <b>" + m.wins + " of " + m.races + "</b>" +
      " &nbsp;•&nbsp; Planks laid: <b>" + m.planks + "</b>" +
      " &nbsp;•&nbsp; 🏅 <b>" + esc(rank(m.planks)) + "</b>" +
      (m.bestStreak ? " &nbsp;•&nbsp; Best run: <b>" + m.bestStreak + " 🔥</b>" : "") +
      (m.best ? " &nbsp;•&nbsp; Longest word: <b>" + esc(m.best.toUpperCase()) + "</b>" : "") +
      " &nbsp;•&nbsp; 📖 <b>" + bookCount(m) + "</b> words" +
      " &nbsp;•&nbsp; 🎖️ <b>" + m.badges.length + "/" + BADGES.length + "</b> badges";
    var slot = barEl.querySelector(".coin");
    var coin = WBSprites.thumb("coin", 2);
    if (slot && coin) slot.appendChild(coin);
  }

  function renderShop() {
    var m = me();
    skinsEl.innerHTML = "";
    SKINS.forEach(function (s) {
      var owned = m.owned.indexOf(s.id) >= 0;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "skin-card" + (owned ? " owned" : " locked") + (m.skin === s.id ? " on" : "");
      b.dataset.skin = s.id;
      var chip = WBSprites.thumb("plank." + s.id, 2);
      if (chip) { chip.className = "swatch"; b.appendChild(chip); }
      b.appendChild(document.createTextNode(s.name));
      b.appendChild(document.createElement("br"));
      var state = owned ? (m.skin === s.id ? "wearing it" : "tap to use") : s.cost + " coins";
      var st = document.createElement("small");
      st.textContent = state;
      b.appendChild(st);
      b.setAttribute("aria-label", s.name + " bridge — " +
        (owned ? (m.skin === s.id ? "currently in use" : "tap to use") : "costs " + s.cost + " coins"));
      b.addEventListener("click", function () {
        var mm = me();
        if (mm.owned.indexOf(s.id) < 0) {
          if (mm.coins < s.cost) {
            window.SFX && SFX.nope && SFX.nope();
            b.classList.add("shake");
            setTimeout(function () { b.classList.remove("shake"); }, 400);
            return;
          }
          mm.coins -= s.cost;
          mm.owned.push(s.id);
          window.SFX && SFX.win && SFX.win();
        } else {
          window.SFX && SFX.coin && SFX.coin();
        }
        mm.skin = s.id;
        WBStage.setSkin(s.id);
        store();
        renderBar();
        renderShop();
      });
      skinsEl.appendChild(b);
    });
  }

  /* The Word Book: every word this kid has ever answered, by category. */
  function renderBook() {
    if (!bookEl) return;
    var m = me();
    var total = bookCount(m);
    var rows = WB_QUESTIONS.map(function (q, i) {
      var found = m.book[q.q] || [];
      var topN = (q.top || []).length;
      var topFound = (q.top || []).filter(function (w) {
        var n = norm(w);
        return found.some(function (f) { return norm(f) === n; });
      }).length;
      return { i: i, q: q, found: found, topN: topN, topFound: topFound };
    });
    rows.sort(function (a, b) { return b.found.length - a.found.length || a.i - b.i; });
    var explored = rows.filter(function (r) { return r.found.length; }).length;

    var html = '<p class="book-sum"><b>' + total + "</b> words in <b>" + explored +
               "</b> of " + WB_QUESTIONS.length + " categories. Complete a category's showcase " +
               "dozen to fill its star.</p>";
    html += '<div class="book-grid">';
    rows.forEach(function (r) {
      var full = r.topN && r.topFound >= r.topN;
      var pct = r.topN ? Math.round((r.topFound / r.topN) * 100) : 0;
      html += '<details class="book-cat' + (r.found.length ? "" : " empty") + (full ? " full" : "") + '">' +
        '<summary><span class="bc-icon" aria-hidden="true">' + (r.q.icon || "🌉") + "</span>" +
        '<span class="bc-name">' + esc(subject(r.i)) + (r.q.hard ? ' <em title="grown-up category">★</em>' : "") + "</span>" +
        '<span class="bc-count">' + (full ? "⭐ " : "") + r.found.length + "</span>" +
        '<span class="bc-bar"><i style="width:' + pct + '%"></i></span></summary>' +
        '<p class="bc-words">' + (r.found.length
          ? r.found.slice().sort().map(function (w) { return "<span>" + esc(w.toUpperCase()) + "</span>"; }).join(" ")
          : "<i>Nothing here yet — answer this one in a race!</i>") + "</p>" +
        "</details>";
    });
    html += "</div>";
    bookEl.innerHTML = html;
  }

  function renderBadges() {
    if (!badgesEl) return;
    var m = me();
    badgesEl.innerHTML = BADGES.map(function (b) {
      var got = m.badges.indexOf(b.id) >= 0;
      return '<div class="badge' + (got ? " got" : "") + '" title="' + esc(b.how) + '">' +
        '<span class="be" aria-hidden="true">' + b.e + "</span>" +
        "<b>" + esc(b.name) + "</b><small>" + esc(b.how) + "</small>" +
        (got ? '<span class="tick" aria-label="earned">✓</span>' : "") +
        "</div>";
    }).join("");
  }

  function renderPickers() {
    kidRow.innerHTML = "";
    KIDS.forEach(function (k) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pick" + (k.id === kidId ? " on" : "");
      b.style.setProperty("--pc", k.color);
      b.dataset.kid = k.id;
      b.setAttribute("aria-pressed", k.id === kidId ? "true" : "false");
      var face = WBSprites.thumb("hero." + k.id + ".walk", 2, 1);
      if (face) { face.className = "face"; b.appendChild(face); }
      b.appendChild(document.createTextNode(k.name));
      b.addEventListener("click", function () {
        if (k.id === kidId) return;
        kidId = k.id;
        try { localStorage.setItem(CURRENT_KID_KEY, kidId); } catch (e) { /* ignore */ }
        WBStage.setHero(kidId);
        renderPickers();
        renderShop();
        renderBook();
        renderBadges();
        renderMarkers();
        newRace();
      });
      kidRow.appendChild(b);
    });

    optRow.innerHTML = "";
    [
      { id: "type", label: "⌨️ Type it", on: !tapMode(), set: function () { me().tap = false; } },
      { id: "tap",  label: "🖼️ Tap a picture", on: tapMode(), set: function () { me().tap = true; } }
    ].forEach(function (o) { optRow.appendChild(optButton(o, "#8a5cff")); });

    Object.keys(PACES).forEach(function (id) {
      var b = optButton({
        id: id, label: PACES[id].label, on: paceId() === id,
        set: function () { me().pace = id; }
      }, "#38b6ff");
      var face = WBSprites.thumb("bot." + id + ".walk", 2, 0);
      if (face) { face.className = "face"; b.insertBefore(face, b.firstChild); }
      b.title = PACES[id].bot + " — " + PACES[id].seconds + " seconds a round" +
                (PACES[id].letters ? ", with 'starting with' rounds" : "");
      optRow.appendChild(b);
    });

    if (canSpeak) {
      var v = document.createElement("button");
      v.type = "button";
      v.className = "pick" + (voiceOn() ? " on" : "");
      v.style.setProperty("--pc", "#12a594");
      v.dataset.opt = "voice";
      v.textContent = voiceOn() ? "🔊 Read aloud" : "🔇 Read aloud";
      v.setAttribute("aria-pressed", voiceOn() ? "true" : "false");
      v.addEventListener("click", function () {
        me().voice = !voiceOn();
        store();
        renderPickers();
        if (voiceOn() && race && !race.over && !modal.hidden) speak(promptText());
      });
      optRow.appendChild(v);
    }
  }

  function optButton(o, colour) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "pick" + (o.on ? " on" : "");
    b.style.setProperty("--pc", colour);
    b.dataset.opt = o.id;
    b.textContent = o.label;
    b.setAttribute("aria-pressed", o.on ? "true" : "false");
    b.addEventListener("click", function () {
      if (o.on) return;
      o.set();
      store();
      renderPickers();
      renderMarkers();
      newRace();
    });
    return b;
  }

  /* The panels under the scene: shop, word book, badges. One open at a time. */
  var panels = {
    shop: shopEl,
    book: document.getElementById("book"),
    badges: document.getElementById("badges")
  };
  function openPanel(id) {
    var opening = false;
    Object.keys(panels).forEach(function (k) {
      var el = panels[k];
      var btn = document.getElementById(k + "-btn");
      if (!el) return;
      var on = k === id && !el.classList.contains("open");
      el.classList.toggle("open", on);
      if (btn) btn.setAttribute("aria-expanded", on ? "true" : "false");
      if (on) opening = true;
    });
    // Browsing shouldn't cost you the round you're in the middle of.
    setPaused(opening);
    if (opening && panels[id]) panels[id].scrollIntoView({ block: "nearest" });
  }

  document.getElementById("restart-btn").addEventListener("click", newRace);
  ["shop", "book", "badges"].forEach(function (id) {
    var btn = document.getElementById(id + "-btn");
    if (btn) btn.addEventListener("click", function () { openPanel(id); });
  });
  if (pauseBar) {
    pauseBar.querySelector("button").addEventListener("click", function () { setPaused(false); });
  }

  /* Keyboard: Escape pauses/resumes, 1–4 pick a picture in Tap mode. */
  document.addEventListener("keydown", function (e) {
    if (!race || race.over) return;
    if (e.key === "Escape") { setPaused(!race.paused); return; }
    if (race.paused || modal.hidden || race.answered) return;
    if (!tapMode() || !/^[1-4]$/.test(e.key)) return;
    var b = document.querySelector('.tap[data-key="' + e.key + '"]');
    if (b && !b.disabled) { e.preventDefault(); b.click(); }
  });

  // The play-test checks answer coverage in bulk through this.
  window.WBCheck = function (qIndex, text) { return accepted(qIndex, text); };
  window.WBBadges = BADGES.map(function (b) { return b.id; });

  WBStage.init(stageCanvas);
  renderPickers();
  renderShop();
  renderBook();
  renderBadges();
  renderMarkers();
  newRace();
})();
