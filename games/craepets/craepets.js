/* ===========================================================
   Craepets — the valley engine.
   -----------------------------------------------------------
   A Neopets-shaped virtual pet game where the ENTIRE economy
   runs on learning: berries, coins, books, paint brushes and
   arena wins are all paid out for questions answered correctly
   at your own level.

   Everyone in the family gets their own save slot (including
   the grown-ups), each with its own creature, coins, bag and
   trophy case, all kept in localStorage:

       craepets.who        -> whose turn it is right now
       craepets.v1.<who>   -> that person's whole valley

   Nothing here can lose a pet. Needs sag but never bottom out,
   wrong answers cost nothing but a moment, and the littlest
   levels are unloseable by design.
   =========================================================== */
(function () {
  "use strict";

  var D = window.CPData, P = window.CPPets;
  var WHO_KEY = "craepets.who";
  var slot = function (who) { return "craepets.v1." + who; };

  /* ---------- little DOM helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  /* SFX.streak(n) picks its pitch from the combo length, so pass it on. */
  function sfx(name, arg) { try { if (window.SFX && SFX[name]) SFX[name](arg); } catch (e) {} }

  /* ---------- read-aloud, for the players who can't read yet ----------
     Ellie and Kieran can't read the question, so the valley reads it to
     them — with REAL recordings now. Every line the little levels ask,
     every lesson under an answer, the pet's chatter, the prize wheel and
     the rivals' taunts are written once in lines.js, rendered by the same
     warm storyteller voice as the Spooky Stories (tools/build_audio.py)
     and played from audio/. audio/manifest.js lists which clips exist,
     so the page never asks for a recording that is not there; a line with
     no clip yet falls back to the browser's own voice reading the very
     same words. Off by default for everyone who can read; the choice is
     remembered per device. */
  var VOICE_KEY = "craepets.voice";
  var L = window.CPLines || null;
  var CLIPS = window.CRAEPETS_NARRATION || {};
  var canSpeak = typeof window !== "undefined" &&
    "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  var hasClips = typeof Audio !== "undefined" && !!window.Voice && Object.keys(CLIPS).length > 0;
  var canTalk = canSpeak || hasClips;
  var voiceOn = false;
  try {
    var stored = localStorage.getItem(VOICE_KEY);
    voiceOn = stored === null ? null : stored === "1";
  } catch (e) { voiceOn = null; }

  /* Nobody has chosen yet? Then the littlest tiers get it on. */
  function voiceWanted() {
    if (voiceOn === null) return tier() === "tot" || tier() === "early";
    return !!voiceOn;
  }

  var narrating = 0;             // a ticket: a newer narrate() cancels an older chain
  var lastSaid = [];             // what was said last, for the play-test robot
  function hush() {
    narrating++;
    try { if (window.Voice) Voice.stop(); } catch (e) {}
    try { if (canSpeak) window.speechSynthesis.cancel(); } catch (e) {}
  }
  function clipFor(tok) { return CLIPS[tok] ? "audio/" + tok + ".mp3" : null; }

  /* Say a list of things in order. Each is a token from lines.js (which
     may have a recording) or a plain sentence (which never does). When
     every piece has a clip the recordings play back to back; otherwise
     the browser voice reads the whole thing. */
  function narrate(tokens, opts) {
    opts = opts || {};
    if (!tokens || !tokens.length) return;
    if (!voiceWanted() && !opts.force) return;
    tokens = tokens.filter(function (t) { return t !== null && t !== undefined && t !== ""; })
                   .map(function (t) { return String(t); });
    if (!tokens.length) return;
    hush();
    var ticket = narrating;
    lastSaid = tokens.slice();
    var everyClip = hasClips && tokens.every(function (t) { return !!clipFor(t); });
    if (everyClip) {
      var i = 0;
      (function next() {
        if (ticket !== narrating || i >= tokens.length) return;
        var a = Voice.play(clipFor(tokens[i++]), next);
        // a clip that will not load must not silence the rest of the line
        if (a && a.addEventListener) a.addEventListener("error", next);
      })();
      return;
    }
    if (!canSpeak) return;
    var text = L ? L.textOf(tokens) : tokens.join(" ");
    try {
      var u = new SpeechSynthesisUtterance(String(text).replace(/[“”]/g, ""));
      u.rate = 0.92;
      u.pitch = 1.05;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  function speak(text) { narrate([text]); }
  /* A line's recording if the script has one, else the line itself. */
  function spoken(text) { return (L && L.spoken) ? L.spoken(text) : text; }
  /* A random word of praise, recorded. */
  function praiseToken() {
    return L ? "p-" + Math.floor(Math.random() * L.PRAISE.length) : "Yes!";
  }
  /* The right answer, as something the narrator can say. */
  function answerToken(q) {
    var right = (q && q.choices && q.choices[q.answer]) || {};
    if (q && q.sayA) return q.sayA;
    var tok = L && L.tokenFor(right.t);
    return tok || right.t || "this one";
  }

  /* =========================================================
     STATE
     ========================================================= */
  var who = "cory", S = null, view = "nest";
  var sess = null;      // the run of questions happening in one place
  var battle = null;    // the arena fight in progress
  var pendingBuy = null;

  function blankSave(profile) {
    return {
      v: 1,
      tier: profile.tier,
      coins: 60,
      pet: null,
      bag: {},
      /* Anything bought or found that hasn't been used yet — this is what
         puts the badge on the 🎒 Bag tab so a purchase can't vanish. */
      bagNew: {},
      colours: P.COLOURS.filter(function (c) { return c.free; }).map(function (c) { return c.id; }),
      lastTick: Date.now(),
      day: D.dayNumber(),
      quests: [],
      claimed: {},
      today: {},
      /* Questions you got wrong, waiting to come back around. */
      review: [],
      /* Every question you have ever been asked, so the game can go
         looking for one you have NOT. See THE QUESTION TRACKER. */
      seen: {},
      /* A half-filled berry patch should still be there tomorrow. */
      harvest: { farm: [], well: [], pool: [] },
      /* Your own house. `homes` is every home you have ever bought —
         you keep them all and move between them freely — and `home` is
         the one you are living in today.

         `rooms` is how each of those homes is decorated: its wall, its
         floor, the view out of the window and what you call it. Every
         home keeps its own, so the Igloo can stay icy while the Mars
         Castle stays red, and moving house is a change of scene rather
         than a change of number. `walls`/`floors`/`views` are the style
         pieces you have BOUGHT, which work in every home you own. */
      house: {
        home: "nest", homes: ["nest"], rooms: {},
        walls: [], floors: [], views: [],
        owned: [], placed: []
      },
      /* Your own shop, which the rest of the family can buy from. */
      stall: { name: "", goods: [], sales: [] },
      /* THE HEAT — how hard each subject is asking right now (1–5),
         and the last few answers that decide whether it moves. */
      adapt: { math: { rung: 1, hist: [], best: 1 }, word: { rung: 1, hist: [], best: 1 },
               wonder: { rung: 1, hist: [], best: 1 } },
      /* The Shadow Tower: floors cleared, the friend you bring, and
         what The Shade has given up so far. */
      arena: { floor: 0, ally: null, shadeWins: 0, hoardGot: 0, hoardIds: [] },
      /* The day you last span the prize wheel. */
      spinDay: 0,
      dayStreak: 0,
      lastPlayDay: 0,
      /* Hats, glasses and scarves you own (pets.js draws them). What the
         pet has ON lives in pet.wear, so it travels with the creature. */
      wardrobe: [],
      /* What the Craepet is wishing for right now — see THE WISH. */
      wish: null,
      /* The diary: what happened, in the pet's own words, plus anything
         the player writes in it. See THE DIARY. */
      diary: [],
      /* Presents from the rest of the family, waiting to be opened. */
      mail: [],
      /* Petpets you own (the one that is OUT lives in pet.petpet). */
      petpets: [],
      /* The Valley Bank: what is in, when interest was last paid, and
         how much interest it has paid in all. See THE BANK. */
      bank: { balance: 0, day: D.dayNumber(), earned: 0 },
      /* Sky Catch high scores. */
      catch: { best: 0, games: 0 },
      stats: { correct: 0, wrong: 0, best: 0, streak: 0, farm: 0, well: 0, pool: 0,
               arena: 0, arenaWin: 0, feed: 0, play: 0, wash: 0, read: 0, buy: 0,
               quests: 0, coinsEarned: 0, fixed: 0, bestDayStreak: 0, bySubject: {},
               spin: 0, placed: 0, stocked: 0, sold: 0, soldCoins: 0, styled: 0,
               newq: 0, repeatq: 0, heat: 0, stepup: 0, crit: 0, quick: 0, tower: 0,
               shadeWin: 0, allyHits: 0, allyWins: 0, bestFloor: 0,
               wishes: 0, dressed: 0, gifts: 0, received: 0, diary: 0,
               banked: 0, events: 0, catchGames: 0, matchGames: 0, visits: 0, parties: 0 },
      trophies: []
    };
  }

  function load(id) {
    var profile = D.profile(id);
    var s = null;
    try { s = JSON.parse(localStorage.getItem(slot(id))); } catch (e) { s = null; }
    if (!s || typeof s !== "object" || s.v !== 1) s = blankSave(profile);
    // fill in anything a newer version added
    var fresh = blankSave(profile);
    Object.keys(fresh).forEach(function (k) { if (s[k] === undefined || s[k] === null) s[k] = fresh[k]; });
    Object.keys(fresh.stats).forEach(function (k) { if (s.stats[k] === undefined) s.stats[k] = fresh.stats[k]; });
    // A save written by an older build has no baskets and no review pile —
    // normalise them here so nothing downstream has to keep checking.
    if (!Array.isArray(s.review)) s.review = [];
    if (!s.seen || typeof s.seen !== "object" || Array.isArray(s.seen)) s.seen = {};
    // The heat and the tower were added later; an older save has neither.
    if (!s.adapt || typeof s.adapt !== "object") s.adapt = {};
    ["math", "word", "wonder"].forEach(function (k) {
      var a = s.adapt[k];
      if (!a || typeof a !== "object") a = s.adapt[k] = { rung: 1, hist: [], best: 1 };
      a.rung = D.hot(a.rung);
      if (!Array.isArray(a.hist)) a.hist = [];
      if (!a.best || a.best < a.rung) a.best = a.rung;
    });
    if (!s.arena || typeof s.arena !== "object") s.arena = { floor: 0, ally: null, shadeWins: 0, hoardGot: 0, hoardIds: [] };
    s.arena.floor = Math.max(0, s.arena.floor | 0);
    if (!Array.isArray(s.arena.hoardIds)) s.arena.hoardIds = [];
    if (s.arena.ally && !D.PROFILES.some(function (p) { return p.id === s.arena.ally; })) s.arena.ally = null;
    if (!s.harvest || typeof s.harvest !== "object") s.harvest = { farm: [], well: [], pool: [] };
    ["farm", "well", "pool"].forEach(function (p) {
      if (!Array.isArray(s.harvest[p])) s.harvest[p] = [];
      if (s.harvest[p].length > SLOTS) s.harvest[p] = s.harvest[p].slice(0, SLOTS);
    });
    // The house and the shop were added later, so an older save has neither.
    if (!s.house || typeof s.house !== "object") s.house = {};
    if (!Array.isArray(s.house.owned)) s.house.owned = [];
    if (!Array.isArray(s.house.placed)) s.house.placed = [];
    // A save from the five-house ladder stored a `level` number. You had
    // paid your way up it, so you keep every home on the way as well as
    // the one you were living in.
    if (typeof s.house.level === "number" && !Array.isArray(s.house.homes)) {
      var lvl = Math.max(0, Math.min(4, s.house.level));
      s.house.homes = D.HOUSES.slice(0, lvl + 1).map(function (h) { return h.id; });
      s.house.home = D.HOUSES[lvl].id;
    }
    delete s.house.level;
    if (!Array.isArray(s.house.homes) || !s.house.homes.length) s.house.homes = ["nest"];
    s.house.homes = s.house.homes.filter(function (id, i, a) {
      return D.HOUSES.some(function (h) { return h.id === id; }) && a.indexOf(id) === i;
    });
    if (s.house.homes.indexOf("nest") === -1) s.house.homes.unshift("nest");
    if (s.house.homes.indexOf(s.house.home) === -1) s.house.home = s.house.homes[s.house.homes.length - 1];
    ["walls", "floors", "views"].forEach(function (k) {
      if (!Array.isArray(s.house[k])) s.house[k] = [];
    });
    // Whatever style each room is carrying, it has to still exist and still
    // be something this player is allowed to use.
    if (!s.house.rooms || typeof s.house.rooms !== "object") s.house.rooms = {};
    Object.keys(s.house.rooms).forEach(function (id) {
      var h = D.HOUSES.some(function (x) { return x.id === id; }) ? D.houseById(id) : null;
      if (!h) { delete s.house.rooms[id]; return; }
      var r = s.house.rooms[id];
      if (!r || typeof r !== "object") { delete s.house.rooms[id]; return; }
      if (!styleAllowed(s, "wall", r.wall)) r.wall = h.style.wall;
      if (!styleAllowed(s, "floor", r.floor)) r.floor = h.style.floor;
      if (!styleAllowed(s, "view", r.view)) r.view = h.style.view;
      if (typeof r.name !== "string") r.name = "";
    });
    var home = D.houseById(s.house.home);
    // You can never have out more than you own, or more than the house holds.
    s.house.placed = s.house.placed
      .filter(function (id, i, a) { return s.house.owned.indexOf(id) !== -1 && a.indexOf(id) === i; })
      .slice(0, home.slots);
    if (!s.stall || typeof s.stall !== "object") s.stall = { name: "", goods: [], sales: [] };
    if (!Array.isArray(s.stall.goods)) s.stall.goods = [];
    if (!Array.isArray(s.stall.sales)) s.stall.sales = [];
    s.stall.goods = s.stall.goods.filter(function (g) {
      return g && D.itemById(g.id) && g.n > 0 && g.price > 0;
    });
    // The wardrobe, the wish, the diary and the post all came later still.
    if (!Array.isArray(s.wardrobe)) s.wardrobe = [];
    s.wardrobe = s.wardrobe.filter(function (id, i, a) { return P.wearById(id) && a.indexOf(id) === i; });
    if (s.pet) {
      if (!s.pet.wear || typeof s.pet.wear !== "object") s.pet.wear = {};
      P.SLOTS.forEach(function (slotName) {
        var w = s.pet.wear[slotName];
        var it = w && P.wearById(w);
        // you can only have on what you own, and only in the right place
        if (!it || it.slot !== slotName || s.wardrobe.indexOf(w) === -1) s.pet.wear[slotName] = null;
      });
    }
    if (s.wish && (typeof s.wish !== "object" || !s.wish.kind)) s.wish = null;
    if (!Array.isArray(s.diary)) s.diary = [];
    s.diary = s.diary.filter(function (e) { return e && typeof e.s === "string"; });
    if (!Array.isArray(s.mail)) s.mail = [];
    s.mail = s.mail.filter(function (m) { return m && D.itemById(m.id) && D.PROFILES.some(function (p) { return p.id === m.from; }); });
    if (!Array.isArray(s.petpets)) s.petpets = [];
    s.petpets = s.petpets.filter(function (id, i, a) { return P.petpetById(id) && a.indexOf(id) === i; });
    if (s.pet && s.pet.petpet && (typeof s.pet.petpet !== "object" || !P.petpetById(s.pet.petpet.id) ||
        s.petpets.indexOf(s.pet.petpet.id) === -1)) s.pet.petpet = null;
    if (!s.bank || typeof s.bank !== "object") s.bank = { balance: 0, day: D.dayNumber(), earned: 0 };
    s.bank.balance = Math.max(0, s.bank.balance | 0);
    s.bank.earned = Math.max(0, s.bank.earned | 0);
    if (!s.bank.day) s.bank.day = D.dayNumber();
    if (!s.catch || typeof s.catch !== "object") s.catch = { best: 0, games: 0 };
    return s;
  }

  function save() {
    if (!S) return;
    try { localStorage.setItem(slot(who), JSON.stringify(S)); } catch (e) {}
  }

  /* Somebody ELSE's valley. Buying from a family shop has to pay the
     shopkeeper even though it is not their turn, so these two are the
     only places that ever touch another person's save. */
  function readSlot(id) {
    try { return JSON.parse(localStorage.getItem(slot(id))); } catch (e) { return null; }
  }
  function writeSlot(id, s) {
    if (id === who) return;                 // never write over the live save
    try { localStorage.setItem(slot(id), JSON.stringify(s)); } catch (e) {}
  }

  /* =========================================================
     TIME PASSING — needs sag while you're away, energy comes back.
     Nothing ever falls below FLOOR: a Craepet cannot be harmed by
     a week at Grandma's.
     ========================================================= */
  var FLOOR = 12;
  var DECAY = { hunger: 8, happy: 6, clean: 4 };   // points lost per hour
  var REGEN = 10;                                   // energy gained per hour

  function passTime() {
    if (!S.pet) { S.lastTick = Date.now(); return; }
    // an egg does not get hungry, bored or grubby — it just waits
    if (S.pet.egg) { S.lastTick = Date.now(); rollDay(); return; }
    var now = Date.now();
    var hours = Math.max(0, (now - (S.lastTick || now)) / 3600000);
    if (hours > 72) hours = 72;                     // a long holiday is still just a nap
    S.pet.hunger = clamp(S.pet.hunger - DECAY.hunger * hours, FLOOR, 100);
    // A shelf of toys and a cosy house are real, lasting purchases: the
    // more your Craepet has around it, the slower it gets bored, the
    // longer it stays clean and the better it sleeps while you're away.
    var bored = Math.max(0.15, 1 - toyCalm() - houseCalm());
    S.pet.happy  = clamp(S.pet.happy  - DECAY.happy * bored * hours, FLOOR, 100);
    S.pet.clean  = clamp(S.pet.clean  - DECAY.clean * (1 - tidyBonus()) * hours, FLOOR, 100);
    S.pet.energy = clamp(S.pet.energy + (REGEN + restBonus()) * hours, 0, 100);
    S.lastTick = now;
    rollDay();
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* A new day: fresh quests, fresh daily counters, one free gift —
     and the day-streak, which is the real reason to come back tomorrow. */
  function rollDay() {
    var day = D.dayNumber();
    var rolled = false;
    if (S.day !== day || !S.quests || !S.quests.length) {
      S.day = day;
      S.quests = D.questsFor().map(function (q) { return q.id; });
      S.claimed = {};
      S.today = {};
      S.dailyGift = false;
      rolled = true;
    }
    if (S.lastPlayDay !== day) {
      S.dayStreak = (S.lastPlayDay === day - 1) ? (S.dayStreak || 0) + 1 : 1;
      S.lastPlayDay = day;
      if (S.dayStreak > (S.stats.bestDayStreak || 0)) S.stats.bestDayStreak = S.dayStreak;
      if (S.pet && S.dayStreak >= 2) diary("📅", "You came back again — that is " + S.dayStreak + " days in a row!");
    }
    payInterest(day);
    return rolled;
  }

  /* =========================================================
     THE BANK — coins you put away grow overnight.

     Three per cent a night, paid on whatever is in the vault,
     capped so it can't run away. It is the game's one lesson in
     percentages and compounding, and it is told in the panel in
     numbers a child can check: "100 becomes 103, then 106, then
     109 — and a bit". Nothing in the bank can ever be spent by
     accident, which is the other reason to use it.
     ========================================================= */
  var BANK_RATE = 0.03, BANK_CAP = 50, BANK_MAX_NIGHTS = 30;
  function bank() {
    if (!S.bank || typeof S.bank !== "object") S.bank = { balance: 0, day: D.dayNumber(), earned: 0 };
    return S.bank;
  }
  function nightInterest(balance) { return Math.min(BANK_CAP, Math.floor(balance * BANK_RATE)); }
  function payInterest(day) {
    var b = bank();
    if (b.day >= day) return 0;
    var nights = Math.min(BANK_MAX_NIGHTS, day - b.day), total = 0;
    for (var i = 0; i < nights; i++) {
      var got = nightInterest(b.balance);
      b.balance += got;
      total += got;
    }
    b.day = day;
    if (total > 0) {
      b.earned += total;
      S.stats.coinsEarned += total;
      S.bankNews = (S.bankNews || 0) + total;
      if (S.pet) diary("🏦", "The bank paid " + total + " coins of interest overnight" + (nights > 1 ? " (" + nights + " nights)" : "") + ". Money that makes money!");
    }
    return total;
  }
  function bankHtml() {
    var b = bank(), t = tier();
    var tonight = nightInterest(b.balance);
    var lesson;
    if (t === "tot" || t === "early") {
      lesson = "Coins in the bank are safe, and every night the bank adds a few more.";
    } else if (t === "mid") {
      lesson = "The bank pays <b>3%</b> a night. 3% of 100 is 3, so 🪙 100 becomes 🪙 103 tomorrow — and 3% of 103 is a little more than 3, so it keeps growing faster.";
    } else {
      lesson = "<b>3% a night, compounded</b>: 🪙 100 becomes 103, then 106.09, then 109.27… after ten nights it is 🪙 134, " +
        "because each night's interest is paid on last night's interest too. (Capped at 🪙 " + BANK_CAP + " a night.)";
    }
    var news = S.bankNews ? '<p class="teach">🌙 <b>Overnight the bank paid you 🪙 ' + S.bankNews + "</b> in interest.</p>" : "";
    S.bankNews = 0;
    return '<div class="panel bank"><h2>🏦 The Valley Bank</h2>' +
      '<p class="sub">Put coins away and they <b>grow while you sleep</b>. Nothing in the bank can be spent by accident.</p>' +
      npcHtml("bank") + news +
      '<div class="statgrid">' +
        '<div class="stat"><b>🪙 ' + b.balance + "</b><small>in the bank</small></div>" +
        '<div class="stat"><b>+🪙 ' + tonight + "</b><small>tonight's interest</small></div>" +
        '<div class="stat"><b>🪙 ' + b.earned + "</b><small>earned so far</small></div>" +
        '<div class="stat"><b>🪙 ' + S.coins + "</b><small>in your purse</small></div>" +
      "</div>" +
      '<p class="teach">' + lesson + "</p>" +
      '<div class="acts" style="margin-top:0.7rem">' +
        '<button class="act" data-bank="in" style="--ac:var(--green)"' + (S.coins < 10 ? " disabled" : "") + '><span class="em">📥</span>Put coins in</button>' +
        '<button class="act" data-bank="out" style="--ac:var(--purple)"' + (b.balance <= 0 ? " disabled" : "") + '><span class="em">📤</span>Take coins out</button>' +
      "</div></div>";
  }
  function bankSheet(dir) {
    var b = bank();
    var have = dir === "in" ? S.coins : b.balance;
    var amounts = [10, 25, 50, 100, 250].filter(function (n) { return n < have; });
    amounts.push(have);
    return sheet(dir === "in" ? "📥 How much to put in?" : "📤 How much to take out?",
      '<p class="sub">' + (dir === "in" ? "You have 🪙 " + S.coins + " in your purse." : "There is 🪙 " + b.balance + " in the bank.") +
      (dir === "in" ? " Every 🪙 100 in the bank earns 🪙 3 a night." : "") + "</p>" +
      '<div class="swatches">' + amounts.map(function (n) {
        return '<button class="ghost" data-bankamt="' + dir + ":" + n + '">🪙 ' + n + (n === have ? " (all)" : "") + "</button>";
      }).join("") + "</div>");
  }
  function moveBank(dir, n) {
    var b = bank();
    n = Math.max(0, n | 0);
    if (dir === "in") {
      n = Math.min(n, S.coins);
      if (!n) return closeSheet();
      S.coins -= n;
      b.balance += n;
      bump("banked", n);
      if (!S.everBanked) { S.everBanked = true; diary("🏦", "We opened an account at the Valley Bank and put 🪙 " + n + " in. It grows overnight!"); }
      toast("🏦 🪙 " + n + " safely in the bank. Tonight it earns 🪙 " + nightInterest(b.balance) + ".");
    } else {
      n = Math.min(n, b.balance);
      if (!n) return closeSheet();
      b.balance -= n;
      S.coins += n;
      toast("🏦 Took 🪙 " + n + " out. 🪙 " + b.balance + " still growing.");
    }
    checkTrophies();
    closeSheet();
    save();
    render();
    sfx("coin");
  }

  /* =========================================================
     RANDOM EVENTS — the valley's little surprises.
     Now and then, walking from one place to another, something
     happens: a coin on the path, a shower of rain, a passing
     Snorbit with a spare apple. Never anything bad — the worst
     that can happen is nothing. A few a day, no more.
     ========================================================= */
  var EVENT_CHANCE = 0.09, EVENTS_MAX = 6;
  var EVENTS = [
    { emoji: "🪙", w: 4, run: function () { var n = 5 + Math.floor(Math.random() * 21); earn(n); return "You found 🪙 " + n + " lying on the path!"; } },
    { emoji: "🍎", w: 3, run: function () { var f = D.FOODS[Math.floor(Math.random() * 12)]; addItem(f.id); return "A passing Snorbit hands you a " + f.emoji + " " + f.name + ". \"Spare one,\" it says."; } },
    { emoji: "🌧️", w: 2, run: function () { S.pet.clean = clamp(S.pet.clean + 15, 0, 100); return "A quick shower of rain! " + S.pet.name + " comes out shinier."; } },
    { emoji: "🎈", w: 2, run: function () { S.pet.happy = clamp(S.pet.happy + 10, 0, 100); return "A red balloon drifts past. " + S.pet.name + " chases it all the way down the lane."; } },
    { emoji: "🌠", w: 2, run: function () { giveXp(12); return "A shooting star! " + S.pet.name + " makes a wish and feels a bit wiser."; } },
    { emoji: "🧼", w: 2, run: function () { addItem("soap"); return "Somebody left a bar of 🧼 Berry Soap on the wall. Finders keepers."; } },
    { emoji: "🌑", w: 1, run: function () { earn(3); return "One of The Shade's minions tries to trip you up, slips, and drops 🪙 3. It runs off. Nothing lost!"; } },
    { emoji: "🍯", w: 1, run: function () { S.pet.hunger = clamp(S.pet.hunger + 12, 0, 100); return "Bees! Friendly ones. " + S.pet.name + " gets a lick of honey straight from the comb."; } },
    { emoji: "📖", w: 1, run: function () { var b = D.BOOKS[Math.floor(Math.random() * 5)]; addItem(b.id); return "A book has fallen off the library cart: " + b.emoji + " " + b.name + ". Yours now."; } },
    { emoji: "🌈", w: 1, run: function () { earn(15); S.pet.happy = clamp(S.pet.happy + 6, 0, 100); return "A rainbow ends right here, on this exact spot. Under it: 🪙 15."; } }
  ];
  var eventsOn = true;           // the play-test robot turns the dice off
  function maybeEvent() {
    if (!eventsOn || !S.pet || (S.today.events || 0) >= EVENTS_MAX || Math.random() >= EVENT_CHANCE) return false;
    randomEvent();
    return true;
  }
  function randomEvent(idx) {
    var pool = [];
    EVENTS.forEach(function (e, i) { for (var k = 0; k < e.w; k++) pool.push(i); });
    var ev = EVENTS[idx === undefined ? pool[Math.floor(Math.random() * pool.length)] : idx];
    var text = ev.run();
    bump("events");
    diary(ev.emoji, text);
    checkTrophies();
    save();
    render();
    openSheet(sheet("✨ Something happened!",
      '<p style="text-align:center;font-size:3rem;margin:0.2rem 0;line-height:1">' + ev.emoji + "</p>" +
      '<p class="sub" style="text-align:center;font-size:1.05rem">' + esc(text) + "</p>" +
      '<p class="sub" style="text-align:center;font-size:0.8rem">Random events happen on the paths between places — ' +
      (S.today.events || 0) + " of " + EVENTS_MAX + " today.</p>"));
    hearts();
    sfx("win");
    narrate([text]);
  }

  function quests() {
    return (S.quests || []).map(function (id) {
      for (var i = 0; i < D.QUEST_POOL.length; i++) if (D.QUEST_POOL[i].id === id) return D.QUEST_POOL[i];
      return null;
    }).filter(Boolean);
  }

  /* =========================================================
     PET MATHS
     ========================================================= */
  /* Levels: 50 experience each up to level 100, and no top level after that —
     but past 100 every level costs 10% more than the one before, so the
     climb gets steeper the higher a Craepet goes (level 110 is ~130, 130 is
     ~870, 150 is ~5,900). xp on the save stays a plain running total, so
     old saves need no conversion. One helper, so every screen (the top bar,
     the family page, allies, the map chips) agrees. */
  var XP_PER_LEVEL = 50, EASY_LEVELS = 100, XP_GROWTH = 1.1;
  function xpNeed(lv) {               // experience to climb from lv to lv + 1
    return lv < EASY_LEVELS ? XP_PER_LEVEL
      : Math.round(XP_PER_LEVEL * Math.pow(XP_GROWTH, lv - EASY_LEVELS));
  }
  function levelInfo(xp) {            // { lv, into: xp earned this level, need: xpNeed(lv) }
    xp = (typeof xp === "number" && isFinite(xp) && xp > 0) ? xp : 0;
    var lv = Math.min(EASY_LEVELS, 1 + Math.floor(xp / XP_PER_LEVEL));
    var into = xp - (lv - 1) * XP_PER_LEVEL;
    while (into >= xpNeed(lv)) { into -= xpNeed(lv); lv++; }
    return { lv: lv, into: into, need: xpNeed(lv) };
  }
  function levelFor(xp) { return levelInfo(xp).lv; }
  function level() { return S.pet ? levelFor(S.pet.xp) : 1; }
  function xpInLevel() { return S.pet ? levelInfo(S.pet.xp).into : 0; }
  function xpToNext() { return S.pet ? levelInfo(S.pet.xp).need : XP_PER_LEVEL; }

  function mood() {
    if (!S.pet) return "good";
    var p = S.pet;
    if (p.energy < 25) return "tired";
    if (p.hunger < 35) return "hungry";
    if (p.clean < 35) return "dirty";
    if (p.happy < 40) return "bored";
    if (p.hunger > 70 && p.happy > 70 && p.clean > 60) return "great";
    return "good";
  }

  function moodFace() {
    if (S.pet && S.pet.egg) return "🥚";
    return { great: "😄", good: "🙂", hungry: "😋", bored: "😕", tired: "😴", dirty: "😖" }[mood()];
  }

  function tier() { return S.tier || D.profile(who).tier; }

  /* =========================================================
     REWARDS & BOOKKEEPING
     ========================================================= */
  function bump(track, n) {
    n = n || 1;
    S.today[track] = (S.today[track] || 0) + n;
    if (S.stats[track] !== undefined) S.stats[track] += n;
  }
  function bestToday(track, value) {
    if ((S.today[track] || 0) < value) S.today[track] = value;
  }

  function earn(coins) {
    S.coins += coins;
    S.stats.coinsEarned += coins;
  }

  function giveXp(n) {
    if (!S.pet) return;
    var before = level();
    S.pet.xp = (S.pet.xp || 0) + n;
    var after = level();
    if (after > before) {
      anim.measure = true;               // the room may have grown with the pet
      say("I levelled up! Level " + after + "!");
      sfx("win");
      hop();
      try { window.Confetti && Confetti.burst({ count: 70 }); } catch (e) {}
      toast("🎉 " + S.pet.name + " reached level " + after + "!");
      diary("⭐", "I grew to level " + after + "!" +
        (after === 5 ? " I got a tiara for it." : after === 12 ? " I got a crown for it!" :
         after === EASY_LEVELS ? " From here on every level is a bigger climb than the last." : ""));
    }
  }

  function addItem(id, n) {
    n = n || 1;
    S.bag[id] = (S.bag[id] || 0) + n;
    if (!S.bagNew) S.bagNew = {};
    S.bagNew[id] = true;                 // badge the Bag tab until it's used
  }
  function takeItem(id) {
    if (!S.bag[id]) return false;
    S.bag[id]--;
    if (S.bag[id] <= 0) delete S.bag[id];
    return true;
  }
  /* Everything in the bag of one kind, in the order it was picked up. */
  function bagOf(kind) {
    return Object.keys(S.bag).filter(function (id) {
      return S.bag[id] > 0 && D.kindOf(id) === kind;
    });
  }
  /* Things that put energy back — a pillow or a tonic belongs at bedtime,
     not in the bath, which is why they used to have nowhere to be used. */
  function comforts() {
    return Object.keys(S.bag).filter(function (id) {
      var it = D.itemById(id);
      return S.bag[id] > 0 && it && it.energy;
    });
  }
  function toyCalm() { return Math.min(0.5, bagOf("toy").length * 0.08); }

  /* =========================================================
     YOUR HOUSE
     Furniture is bought once and kept for ever, like a toy or a
     brush. What it is WORTH is decided by what you have out:
     a sofa in storage keeps nobody warm.
     ========================================================= */
  function houseInfo() { return D.houseById((S.house && S.house.home) || "nest"); }
  /* What you might move to next: the cheapest home you do not own yet.
     There is no ladder any more, so this is a suggestion, not a queue. */
  function nextHouse() {
    var mine = (S.house && S.house.homes) || [];
    var best = null;
    D.HOUSES.forEach(function (h) {
      if (mine.indexOf(h.id) !== -1) return;
      if (!best || h.cost < best.cost) best = h;
    });
    return best;
  }
  function ownsHome(id) { return ((S.house && S.house.homes) || []).indexOf(id) !== -1; }
  function slotsFree() { return houseInfo().slots - (S.house.placed || []).length; }

  /* --- walls, floors and the view: the three style slots ---
     Each is free if it costs nothing, yours if you bought it, and also
     yours if it came with a home you own — which is why buying the Mars
     Castle also gets you Martian walls to use in the straw nest. */
  var STYLE = {
    wall:  { key: "wall",  own: "walls",  list: function () { return D.WALLS; },  word: "wall" },
    floor: { key: "floor", own: "floors", list: function () { return D.FLOORS; }, word: "floor" },
    view:  { key: "view",  own: "views",  list: function () { return D.VIEWS; },  word: "view" }
  };
  function styleItem(kind, id) {
    var found = null;
    STYLE[kind].list().forEach(function (x) { if (x.id === id) found = x; });
    return found;
  }
  /* Takes a whole save rather than reading S, because load() has to ask
     this question before the save is live. */
  function styleAllowed(s, kind, id) {
    var it = styleItem(kind, id);
    if (!it || !s || !s.house) return false;
    if (!it.cost) return true;
    if ((s.house[STYLE[kind].own] || []).indexOf(id) !== -1) return true;
    return (s.house.homes || []).some(function (hid) {
      return D.houseById(hid).style[kind] === id;
    });
  }
  function ownsStyle(kind, id) { return styleAllowed(S, kind, id); }
  /* Which home lent you this one — so the panel can say where it came from. */
  function styleFrom(kind, id) {
    var from = null;
    ((S.house && S.house.homes) || []).forEach(function (hid) {
      var h = D.houseById(hid);
      if (!from && h.style[kind] === id) from = h;
    });
    return from;
  }
  function stylesBought() {
    return (S.house.walls || []).length + (S.house.floors || []).length + (S.house.views || []).length;
  }
  /* How the home you are standing in is decorated. A home you have never
     redecorated simply wears the style it was built with. */
  function room() {
    var h = S.house;
    if (!h.rooms || typeof h.rooms !== "object") h.rooms = {};
    if (!h.rooms[h.home]) {
      var st = houseInfo().style;
      h.rooms[h.home] = { wall: st.wall, floor: st.floor, view: st.view, name: "" };
    }
    return h.rooms[h.home];
  }
  function wallNow()  { return styleItem("wall", room().wall)   || D.WALLS[0]; }
  function floorNow() { return styleItem("floor", room().floor) || D.FLOORS[0]; }
  function viewNow()  { return styleItem("view", room().view)   || D.VIEWS[0]; }
  /* What the place is called: whatever you typed, or the home's own name. */
  function homeName() { return (room().name || "").trim() || houseInfo().name; }
  function placedItems() {
    return (S.house.placed || []).map(function (id) { return D.itemById(id); }).filter(Boolean);
  }
  function storedItems() {
    return (S.house.owned || []).filter(function (id) {
      return (S.house.placed || []).indexOf(id) === -1;
    }).map(function (id) { return D.itemById(id); }).filter(Boolean);
  }
  function homeSum(key) {
    var n = 0;
    placedItems().forEach(function (it) { n += it[key] || 0; });
    return n;
  }
  function houseCosy() { return homeSum("cosy"); }
  /* Cosy slows boredom. A full Valley Tower comes to roughly 45%, which
     stacks with the toy shelf but can never make a Craepet immortal. */
  function houseCalm() { return Math.min(0.45, houseCosy() / 130); }
  function restBonus() { return Math.min(14, homeSum("rest")); }        // energy per hour
  function tidyBonus() { return Math.min(0.6, homeSum("tidy") / 22); }  // slower to get grubby
  function studyBonus() { return Math.min(0.5, homeSum("study") / 22); } // extra XP per answer

  /* Do you already own this, for good? Toys and brushes are kept, not
     eaten — so the shop must never sell you a second one. */
  function alreadyOwned(it) {
    if (!it) return false;
    var kind = it.kind || D.kindOf(it.id);
    if (kind === "brush") return S.colours.indexOf(it.colour) !== -1;
    if (kind === "toy") return (S.bag[it.id] || 0) > 0;
    if (kind === "decor") return (S.house.owned || []).indexOf(it.id) !== -1;
    if (kind === "wear") return (S.wardrobe || []).indexOf(it.id) !== -1;
    if (kind === "petpet") return (S.petpets || []).indexOf(it.id) !== -1;
    return false;
  }

  /* What an item actually DOES, in one short line. Shown on the shop shelf
     AND in the bag, so nobody has to spend coins to find out. */
  function itemBlurb(it) {
    if (!it) return "";
    var kind = it.kind || D.kindOf(it.id);
    if (kind === "brush") return "a color for keeps";
    if (kind === "food") return "+" + it.fill + " 🍽️" + (it.joy ? " +" + it.joy + " 😊" : "");
    if (kind === "toy") return "+" + it.joy + " 😊 · yours for good";
    if (kind === "book") return "+" + it.xp + " XP · a real fact";
    if (kind === "wear") return "👒 worn on the " + it.slot + " · yours for good";
    if (kind === "petpet") return "🐾 " + it.blurb + " Follows your Craepet everywhere.";
    if (kind === "decor") {
      var extra = [];
      if (it.rest) extra.push("+" + it.rest + " ⚡/hr");
      if (it.tidy) extra.push("stays cleaner");
      if (it.study) extra.push("+XP");
      return "🏠 " + it.cosy + " cosy" + (extra.length ? " · " + extra.join(" · ") : "");
    }
    var bits = [];
    if (it.clean) bits.push("+" + it.clean + " 🫧");
    if (it.energy) bits.push("+" + it.energy + " ⚡");
    if (it.joy) bits.push("+" + it.joy + " 😊");
    return bits.join(" ");
  }

  /* Where a purchase went, said out loud, because "it vanished" is the
     one thing a shop must never do to a six-year-old. */
  function whereItWent(it) {
    var kind = it.kind || D.kindOf(it.id);
    if (kind === "decor") return "It's in your 🏠 House — go there to put it out where you can see it.";
    if (kind === "wear") return "It's in your 👒 Wardrobe — tap 👒 Dress at the nest to put it on.";
    if (kind === "petpet") return "It's trotting along behind " + S.pet.name + " already — see the 🐾 Petpets in your 🎒 Bag.";
    if (kind === "toy") return "It's on the 🧸 toy shelf in your 🎒 Bag — play with it any time.";
    if (kind === "book") return "It's in your 🎒 Bag — tap 📖 Read at the nest.";
    if (kind === "food") return "It's in your 🎒 Bag — tap 🍽️ Feed at the nest.";
    if (it.clean) return "It's in your 🎒 Bag — tap 🫧 Wash at the nest.";
    if (it.energy) return "It's in your 🎒 Bag — tap 😴 Rest at the nest.";
    return "It's in your 🎒 Bag.";
  }

  /* Trophies are checked after anything interesting happens. */
  function checkTrophies() {
    var st = S.stats, got = [];
    var tests = {
      adopt: !!S.pet,
      correct25: st.correct >= 25,
      correct100: st.correct >= 100,
      correct500: st.correct >= 500,
      streak10: st.best >= 10,
      streak25: st.best >= 25,
      level5: level() >= 5,
      level12: level() >= 12,
      painted: !!S.everPainted,
      rich: S.coins >= 500,
      arena3: st.arenaWin >= 3,
      shade: !!S.beatShade,
      reader: st.read >= 5,
      questor: st.quests >= 10,
      fixer: (st.fixed || 0) >= 25,
      week: (st.bestDayStreak || 0) >= 7,
      palette: S.colours.length >= P.COLOURS.length,
      level20: level() >= 20,
      level50: level() >= 50,
      level100: level() >= 100,
      homeowner: (S.house.homes || []).length >= 2,
      decorator: (S.house.placed || []).length >= 8,
      tower: ownsHome("tower"),
      estate: (S.house.homes || []).length >= 5,
      collector: (S.house.owned || []).length >= 30,
      stylist: stylesBought() >= 6,
      martian: S.house.home === "marscastle",
      starlord: ownsHome("starring"),
      rarehunt: !!S.everRare,
      shade5: (arena().shadeWins | 0) >= 5,
      floor14: bestFloor() >= 14,
      floor21: bestFloor() >= 21,
      crit10: (st.crit || 0) >= 10,
      hoard: (arena().hoardGot | 0) >= D.hoard().length,
      onfire: ["math", "word", "wonder"].some(function (k) { return (S.adapt && S.adapt[k] && S.adapt[k].best | 0) >= 5; }),
      stepup: (st.stepup || 0) >= 1,
      quick25: (st.quick || 0) >= 25,
      ally: (st.allyWins || 0) >= 1,
      shopkeep: !!S.everStocked,
      trader: (st.sold || 0) >= 10,
      spinner: (st.spin || 0) >= 10,
      jackpot: !!S.everJackpot,
      dressed: !!S.everDressed,
      wardrobe: (S.wardrobe || []).length >= 6,
      wish10: (st.wishes || 0) >= 10,
      postie: (st.gifts || 0) >= 5,
      scribe: (st.diary || 0) >= 5,
      petpet: (S.petpets || []).length >= 1,
      saver: (bank().earned || 0) >= 50,
      lucky: (st.events || 0) >= 10,
      skycatch: ((S.catch && S.catch.best) || 0) >= 15,
      neighbour: Object.keys(S.visited || {}).length >= 3,
      sharp: ((S.match && S.match.best) || 0) >= 100,
      settled: !!(S.steps && STEPS.every(function (s) { return S.steps[s.id]; })),
      festive: (st.parties || 0) >= 3,
      hatchday: !!S.everHatchday
    };
    checkSteps();
    Object.keys(tests).forEach(function (id) {
      if (tests[id] && S.trophies.indexOf(id) === -1) { S.trophies.push(id); got.push(id); }
    });
    got.forEach(function (id) {
      for (var i = 0; i < D.TROPHIES.length; i++) {
        if (D.TROPHIES[i].id === id) {
          toast("🏆 Trophy earned: " + D.TROPHIES[i].name);
          if (S.pet) diary("🏆", "We earned a trophy: " + D.TROPHIES[i].name + " (" + D.TROPHIES[i].note + ").");
        }
      }
    });
  }

  /* =========================================================
     FIRST STEPS — a new player's first quarter of an hour.
     Six small things to do, each paid, ticked off as they
     happen. It is the tutorial, without a tutorial: the list
     lives at the nest until it is done, then goes away.
     ========================================================= */
  var STEPS = [
    { id: "farm3", text: "Get 3 sums right at the 🍓 Berry Farm", coins: 15, done: function () { return (S.stats.farm || 0) >= 3; } },
    { id: "feed",  text: "Feed your Craepet something", coins: 10, done: function () { return (S.stats.feed || 0) >= 1; } },
    { id: "well2", text: "Answer 2 at the 📖 Word Well", coins: 15, done: function () { return (S.stats.well || 0) >= 2; } },
    { id: "buy",   text: "Buy something at the 🏪 Market", coins: 15, done: function () { return (S.stats.buy || 0) >= 1; } },
    { id: "spin",  text: "Spin the 🎡 prize wheel", coins: 10, done: function () { return (S.stats.spin || 0) >= 1; } },
    { id: "game",  text: "Play a game in the 🎮 Games Room", coins: 15, done: function () { return (S.stats.catchGames || 0) + (S.stats.matchGames || 0) >= 1; } },
    { id: "wear",  text: "Put something on from the 👒 wardrobe", coins: 15, done: function () { return !!S.everDressed; } }
  ];
  function checkSteps() {
    if (!S.pet) return;
    if (!S.steps) S.steps = {};
    STEPS.forEach(function (st) {
      if (S.steps[st.id] || !st.done()) return;
      S.steps[st.id] = true;
      earn(st.coins);
      toast("✅ First steps: " + st.text.replace(/ (at|in|from) .*$/, "") + " — +🪙 " + st.coins);
    });
  }
  function stepsHtml() {
    if (!S.steps) S.steps = {};
    var left = STEPS.filter(function (st) { return !S.steps[st.id]; });
    if (!left.length) return "";
    return '<div class="panel steps"><h2>🌱 First steps</h2>' +
      '<p class="sub">Seven little things to try. Each one pays when you do it — ' + (STEPS.length - left.length) + " of " + STEPS.length + " done.</p>" +
      STEPS.map(function (st) {
        var ok = !!S.steps[st.id];
        return '<div class="quest' + (ok ? " done" : "") + '"><div class="qtx">' + (ok ? "✅ " : "⬜ ") + esc(st.text) + "</div>" +
          '<span class="rw">🪙 ' + st.coins + "</span></div>";
      }).join("") + "</div>";
  }

  /* =========================================================
     THE DIARY — the pet writes down what happens to it.

     Every notable thing in the valley goes in, in the pet's own
     words: "I grew to level 4!", "We beat Mossy in the arena."
     And the player can write in it too. For Jeannie it is a
     book to read; for Cory a record of what he has done; for
     the grown-ups a way to see what the kids have been up to.
     Kept to the last eighty entries so the save stays small.
     ========================================================= */
  var DIARY_MAX = 80;
  function diary(emoji, text, mine) {
    if (!S) return;
    if (!Array.isArray(S.diary)) S.diary = [];
    S.diary.push({ d: D.dayNumber(), t: Date.now(), e: emoji, s: String(text).slice(0, 160), me: !!mine });
    while (S.diary.length > DIARY_MAX) S.diary.shift();
  }

  /* =========================================================
     THE WISH — the Craepet asks for something in particular.

     "I'd love a blueberry", "will you play with me?", "take me
     to the Word Well". Granting it pays a bonus, so the wish
     gives a small child something to DO next — and it has to be
     read to be granted, which is the point. A wish lasts a few
     hours, a granted one is followed by a new one after a short
     breather, and there are five a day, so it can't be farmed.
     ========================================================= */
  var WISH_LIFE = 4 * 3600000;      // a wish nobody grants is replaced after this
  var WISH_REST = 5 * 60000;        // a granted one is followed by the next after this
  var WISH_MAX = 5;                 // wishes a day
  var ACT_WISHES = {
    play:  { text: "Will you play with me?",       hint: "Tap 🎾 Play — a romp is free." },
    wash:  { text: "I fancy a bath!",              hint: "Tap 🫧 Wash — a rinse is free." },
    rest:  { text: "Can I have a little nap?",     hint: "Tap 😴 Rest." },
    read:  { text: "Read me a story?",             hint: "Tap 📖 Read — a book from your bag." },
    dress: { text: "Dress me up in something!",    hint: "Tap 👒 Dress and put anything on." }
  };
  var PLACE_WISHES = {
    farm: { text: "Take me to the 🍓 Berry Farm!", hint: "3 right answers there and it is granted." },
    well: { text: "Take me to the 📖 Word Well!",  hint: "3 right answers there and it is granted." },
    pool: { text: "Take me to the 🌈 Rainbow Pool!", hint: "3 right answers there and it is granted." }
  };

  function makeWish() {
    var r = Math.random();
    // a hat you own but are not wearing; a fight to win; a friend to visit
    var spare = (S.wardrobe || []).filter(function (id) {
      var it = P.wearById(id); return it && S.pet.wear && S.pet.wear[it.slot] !== id;
    });
    var friends = allies();
    if (r < 0.08 && spare.length) {
      return { kind: "wear", id: spare[Math.floor(Math.random() * spare.length)], at: Date.now(), day: D.dayNumber(), done: false };
    }
    if (r < 0.14 && friends.length) {
      return { kind: "visit", id: friends[Math.floor(Math.random() * friends.length)].who, at: Date.now(), day: D.dayNumber(), done: false };
    }
    if (r < 0.2 && tier() !== "tot") {
      return { kind: "duel", id: "any", at: Date.now(), day: D.dayNumber(), done: false };
    }
    if (r < 0.55) {
      // a food you could actually get hold of today: in your bag, on the
      // shelf, or one of the ones the Farm hands out
      var pool = [];
      bagOf("food").forEach(function (id) { pool.push(id); });
      D.shopStock(null, who).forEach(function (it) { if (it.kind === "food" && !it.rare && it.cost <= 24) pool.push(it.id); });
      D.FOODS.slice(0, 6).forEach(function (f) { pool.push(f.id); });
      var id = pool[Math.floor(Math.random() * pool.length)];
      return { kind: "food", id: id, at: Date.now(), day: D.dayNumber(), done: false };
    }
    if (r < 0.87) {
      var acts = ["play", "wash", "rest"];
      if (bagOf("book").length) acts.push("read");
      if ((S.wardrobe || []).length) acts.push("dress");
      return { kind: "act", id: acts[Math.floor(Math.random() * acts.length)], at: Date.now(), day: D.dayNumber(), done: false };
    }
    var places = ["farm", "well", "pool"];
    return { kind: "place", id: places[Math.floor(Math.random() * 3)], need: 3, got: 0,
             at: Date.now(), day: D.dayNumber(), done: false };
  }

  /* The wish showing right now, making a new one when it is time. */
  function wishNow() {
    if (!S.pet) return null;
    var w = S.wish, now = Date.now();
    if (w && w.done && now - (w.doneAt || 0) < WISH_REST) return w;          // still glowing
    if (w && !w.done && w.day === D.dayNumber() && now - w.at < WISH_LIFE) return w;
    if ((S.today.wishes || 0) >= WISH_MAX) { S.wish = null; return null; }
    S.wish = makeWish();
    return S.wish;
  }
  function wishText(w) {
    if (!w) return "";
    if (w.kind === "food") { var f = D.itemById(w.id); return f ? "I'd love a " + f.emoji + " " + f.name + "!" : ""; }
    if (w.kind === "act") return ACT_WISHES[w.id] ? ACT_WISHES[w.id].text : "";
    if (w.kind === "wear") { var it = P.wearById(w.id); return it ? "Put my " + it.emoji + " " + it.name + " on me!" : ""; }
    if (w.kind === "duel") return "Let's win a fight in the ⚔️ Arena!";
    if (w.kind === "visit") { var vs = readSlot(w.id); return "Let's go and visit " + ((vs && vs.pet) ? vs.pet.name : D.profile(w.id).name) + "!"; }
    return PLACE_WISHES[w.id] ? PLACE_WISHES[w.id].text : "";
  }
  function wishHint(w) {
    if (!w) return "";
    if (w.kind === "wear") return "Tap 👒 Dress — it is in the wardrobe already.";
    if (w.kind === "duel") return "Any rival will do — even a floor you have cleared before.";
    if (w.kind === "visit") return "🏆 Case → the family board → 🏡 Visit " + D.profile(w.id).name + ".";
    if (w.kind === "food") {
      var have = S.bag[w.id] || 0;
      if (have) return "You have " + have + " in your 🎒 Bag — tap 🍽️ Feed.";
      var onShelf = D.shopStock(null, who).some(function (it) { return it.id === w.id; });
      var it = D.itemById(w.id);
      if (onShelf) return "The 🏪 Market has one today for 🪙 " + it.cost + ".";
      if (D.FOODS.slice(0, 6).some(function (f) { return f.id === w.id; })) return "The 🍓 Farm turns them up while you answer.";
      return "Keep an eye on the 🏪 Market.";
    }
    if (w.kind === "act") return ACT_WISHES[w.id] ? ACT_WISHES[w.id].hint : "";
    return PLACE_WISHES[w.id] ? (w.got || 0) + " of " + w.need + " right so far." : "";
  }
  /* Something just happened; was it the wish? `what` is a food id, an
     action name or a place name. */
  function checkWish(kind, what) {
    var w = wishNow();
    if (!w || w.done) return false;
    if (w.kind !== kind || w.id !== what) return false;
    if (w.kind === "place") {
      w.got = (w.got || 0) + 1;
      if (w.got < w.need) return false;
    }
    grantWish(w);
    return true;
  }
  function grantWish(w) {
    w.done = true;
    w.doneAt = Date.now();
    bump("wishes");
    var coins = 12 + level() * 2;
    earn(coins);
    giveXp(10);
    S.pet.happy = clamp(S.pet.happy + 10, 0, 100);
    floaty("💭 +" + coins + " 🪙", "#ffe07a");
    hearts();
    hop();
    sfx("win");
    try { window.Confetti && Confetti.burst({ count: 50 }); } catch (e) {}
    toast("💭 Wish granted! " + S.pet.name + " wanted exactly that. +🪙 " + coins);
    diary("💭", "My wish came true: \"" + wishText(w) + "\" Thank you!");
    say("You granted my wish!", 3000, "w-granted");
  }
  function wishHtml() {
    var w = wishNow();
    if (!w) {
      return '<p class="wish done">💭 <b>' + esc(S.pet.name) + " has had " + WISH_MAX +
        " wishes granted today</b> — that is all the wishing for one day. More tomorrow!</p>";
    }
    if (w.done) {
      return '<p class="wish done">💭 <b>Wish granted!</b> ' + esc(S.pet.name) +
        " is thinking up the next one… ⏳ (" + (S.today.wishes || 0) + " of " + WISH_MAX + " today)</p>";
    }
    return '<div class="wish" role="status"><span class="wtag">💭 ' + esc(S.pet.name) + " wishes:</span> " +
      "<b>“" + esc(wishText(w)) + "”</b>" +
      '<small>' + esc(wishHint(w)) + " Grant it for 🪙 " + (12 + level() * 2) + " and a very happy Craepet.</small>" +
      '<button class="ghost small" data-say-wish="1" aria-label="Read the wish aloud">🔊</button></div>';
  }

  /* =========================================================
     THE POST — presents between the family.

     Anything in your bag can be posted to somebody else on this
     device, with a note. It lands in THEIR mail and waits until
     they next play, when the nest says "you have post!". It is
     the only other place one save writes into another (the
     shop is the first), and it goes through writeSlot the same
     careful way.
     ========================================================= */
  var POST_NOTES = ["For you! 💝", "Thank you! 🙏", "You're the best! ⭐", "Happy day! 🌞",
                    "I saved this for you 🎁", "From me and my Craepet 🐾", "Share it with your pet 🍽️"];
  var pendingPost = null;         // { to, id, note } while the post sheet is open

  function postable() {
    return Object.keys(S.bag).filter(function (id) { return S.bag[id] > 0 && D.itemById(id); });
  }
  function postSheet() {
    var to = D.profile(pendingPost.to);
    var toSave = readSlot(pendingPost.to);
    var toPet = toSave && toSave.pet ? toSave.pet.name : to.name;
    var mine = postable();
    if (!pendingPost.id) {
      return sheet("🎁 A present for " + esc(to.name) + " " + to.emoji,
        '<p class="sub">Pick something from your bag. It leaves your bag and waits in ' + esc(to.name) +
        "'s post until they next play.</p>" +
        (mine.length
          ? '<div class="items">' + mine.map(function (id) {
              var it = D.itemById(id);
              return '<button class="item" data-postpick="' + esc(id) + '"><span class="pic">' + it.emoji + "</span>" +
                '<span class="nm">' + esc(it.name) + "</span>" +
                '<span class="what">' + esc(itemBlurb(it)) + "</span>" +
                '<span class="own">you have ' + S.bag[id] + "</span></button>";
            }).join("") + "</div>"
          : '<p class="sub">Your bag is empty. Harvest something at the 🍓 Farm or buy something at the 🏪 Market first.</p>'));
    }
    var it = D.itemById(pendingPost.id);
    var canType = tier() === "big" || tier() === "grown" || tier() === "mid";
    return sheet("🎁 " + it.emoji + " " + esc(it.name) + " for " + esc(to.name),
      '<p class="sub">Add a note. ' + esc(toPet) + " will read it out when the parcel is opened.</p>" +
      '<div class="swatches" style="justify-content:flex-start">' + POST_NOTES.map(function (n, i) {
        return '<button class="ghost small' + (pendingPost.note === n ? " on" : "") + '" data-postnote="' + i + '">' + esc(n) + "</button>";
      }).join("") + "</div>" +
      (canType
        ? '<div class="name-row" style="margin-top:0.6rem"><input id="post-input" maxlength="60" placeholder="…or write your own" ' +
          'value="' + esc(POST_NOTES.indexOf(pendingPost.note) === -1 ? pendingPost.note : "") + '" aria-label="Your note"></div>'
        : "") +
      '<p style="margin:0.8rem 0 0"><button class="act" data-postsend="1" style="--ac:var(--green);width:100%">' +
      '<span class="em">📮</span>Post it to ' + esc(to.name) + "</button></p>");
  }
  function openPost(toId) {
    if (toId === who) return;
    var s = readSlot(toId);
    if (!s || !s.pet) { toast(D.profile(toId).name + " has not adopted a Craepet yet."); return; }
    pendingPost = { to: toId, id: null, note: POST_NOTES[0] };
    sfx("pop");
    openSheet(postSheet());
  }
  function sendPost() {
    if (!pendingPost || !pendingPost.id) return;
    var deal = pendingPost;
    var typed = $("#post-input");
    if (typed && typed.value.trim()) deal.note = typed.value.trim().slice(0, 60);
    pendingPost = null;
    var it = D.itemById(deal.id);
    var them = readSlot(deal.to);
    if (!it || !S.bag[deal.id] || !them || !them.pet) return closeSheet();
    takeItem(deal.id);
    if (S.bagNew) delete S.bagNew[deal.id];
    if (!Array.isArray(them.mail)) them.mail = [];
    them.mail.push({ from: who, id: deal.id, note: deal.note, day: D.dayNumber(), t: Date.now() });
    while (them.mail.length > 20) them.mail.shift();
    writeSlot(deal.to, them);
    bump("gifts");
    var to = D.profile(deal.to);
    diary("🎁", "We posted " + to.name + " a " + it.emoji + " " + it.name + ". I hope " + them.pet.name + " likes it.");
    checkTrophies();
    closeSheet();
    save();
    render();
    toast("📮 Posted " + it.emoji + " " + it.name + " to " + to.name + "! They will find it next time they play.");
    narrate(["post-sent"]);
    sfx("win");
    try { window.Confetti && Confetti.burst({ count: 50 }); } catch (e) {}
  }
  function mailHtml() {
    var mail = S.mail || [];
    if (!mail.length) return "";
    return '<div class="panel post"><h2>📬 Post for ' + esc(S.pet.name) + "!</h2>" +
      '<p class="sub">' + mail.length + (mail.length === 1 ? " parcel" : " parcels") + " arrived while you were away.</p>" +
      mail.map(function (m) {
        var it = D.itemById(m.id), p = D.profile(m.from);
        return '<div class="quest"><div class="qtx">🎁 <b>A parcel from ' + esc(p.name) + " " + p.emoji + "</b></div></div>";
      }).join("") +
      '<p style="margin:0.7rem 0 0"><button class="act" data-openpost="1" style="--ac:var(--pink);width:100%">' +
      '<span class="em">📦</span>Open the parcels</button></p></div>';
  }
  function openMail() {
    var mail = S.mail || [];
    if (!mail.length) return;
    var lines = mail.map(function (m) {
      var it = D.itemById(m.id), p = D.profile(m.from);
      addItem(m.id);
      bump("received");
      diary("📬", p.name + " sent me a " + it.emoji + " " + it.name + " and wrote: \"" + m.note + "\"");
      return '<div class="quest"><div class="qtx">' + it.emoji + " <b>" + esc(it.name) + "</b> from " +
        esc(p.name) + " " + p.emoji + '<br><i style="color:#6a6385">“' + esc(m.note) + "”</i></div>" +
        '<span class="rw">🎒</span></div>';
    }).join("");
    S.mail = [];
    hearts();
    hop();
    save();
    render();
    openSheet(sheet("📦 Look what came in the post!",
      lines + '<p class="sub" style="margin-top:0.6rem">Everything is in your 🎒 Bag now. ' +
      "Send something back from the 👨‍👩‍👧‍👦 family board in the 🏆 Case.</p>"));
    narrate(["post-open"]);
    sfx("win");
    try { window.Confetti && Confetti.burst({ count: 80 }); } catch (e) {}
  }

  /* =========================================================
     TIME OF DAY — the valley follows the real clock.
     The view through the window goes dusky at teatime and
     starry at night, the outdoor places too, and a lamp glows
     in the room. Nothing in the game changes; it just looks
     like the time it is, which is the kind of thing a child
     notices and a grown-up appreciates.
     ========================================================= */
  var hourOverride = null;     // the play-test robot sets this
  function timeOfDay() {
    var h = hourOverride === null ? new Date().getHours() : hourOverride;
    if (h < 6 || h >= 20) return "night";
    if (h < 8) return "dawn";
    if (h >= 18) return "dusk";
    return "day";
  }
  function todHtml() {
    var t = timeOfDay();
    return t === "day" ? "" : '<span class="tod tod-' + t + '" aria-hidden="true"></span>';
  }

  /* =========================================================
     PERSONALITY — what THIS kind of creature loves.
     Each species (pets.js) has three favourite foods and a
     favourite place. A loved food is worth double the joy, and
     the favourite place pays two extra coins a question — so it
     is worth reading the card at adoption and remembering it.
     ========================================================= */
  var FAV_BONUS = 2;
  function spec(pet) { return P.species((pet || S.pet).species); }
  function loves(foodId) { return !!S.pet && (spec().likes || []).indexOf(foodId) !== -1; }
  function favPlace() { return S.pet ? spec().fav : null; }
  function foodList(ids) {
    var names = ids.map(function (id) { var f = D.itemById(id); return f ? f.emoji + " " + f.name : id; });
    return names.length > 1 ? names.slice(0, -1).join(", ") + " and " + names[names.length - 1] : names.join("");
  }
  function personalityLine(sp) {
    sp = sp || spec();
    var pl = PLACE_INFO[sp.fav];
    return sp.name + "s love " + foodList(sp.likes || []) + " — <b>double the joy</b> — and the " +
      (pl ? pl.title : sp.fav) + " pays them <b>" + FAV_BONUS + " extra coins</b> on every right answer.";
  }

  /* =========================================================
     VISITING — walk into somebody else's house.
     Their room, their furniture, their Craepet in its outfit,
     wandering about exactly as it does for them. Read-only:
     nothing you do there touches their save, except knocking
     to post a present, which goes through the post.
     ========================================================= */
  var visit = null;                 // { id, s } while you are round at theirs
  /* Run something as if another save were live. All the room-drawing code
     reads S, so this is how one function paints two different houses. */
  function withSave(s, fn) {
    var keep = S;
    S = s;
    try { return fn(); } finally { S = keep; }
  }
  function startVisit(id) {
    if (id === who) return;
    var s = load(id);
    if (!s || !s.pet) { toast(D.profile(id).name + " has not adopted a Craepet yet."); return; }
    visit = { id: id, s: s };
    hush();
    sess = null;
    battle = null;
    clearTimeout(battleTimer);
    view = "visit";
    anim.tx = null;
    if (!S.visited) S.visited = {};
    if (!S.visited[id]) {
      S.visited[id] = true;
      diary("🏡", "We went round to " + s.pet.name + "'s house to say hello. " +
        (D.profile(id).name) + " has made it very " + (s.house && s.house.placed && s.house.placed.length > 3 ? "cosy" : "tidy") + ".");
    }
    checkWish("visit", id);
    bump("visits");
    save();
    render();
    sfx("pop");
    var greet = withSave(s, moodSay);
    say(greet.text, 2600, greet.tok);
  }
  function visitHtml() {
    if (!visit) return "";
    var s = visit.s, p = D.profile(visit.id), pet = s.pet;
    var lv = levelOf(pet);
    var info = withSave(s, function () {
      return { home: homeName(), house: houseInfo(), out: placedItems(), mood: mood(), moodFace: moodFace(), cosy: houseCosy() };
    });
    var wearing = P.SLOTS.map(function (k) { return pet.wear && pet.wear[k] && P.wearById(pet.wear[k]); })
      .filter(Boolean).map(function (it) { return it.emoji + " " + it.name; });
    var fl = (s.arena && s.arena.floor) | 0, rk = D.rankFor(fl);
    var lines = (s.diary || []).filter(function (e) { return !e.me; }).slice(-4).reverse();
    return '<div class="panel visit">' +
      "<h2>" + info.house.emoji + " " + esc(info.home) + ' <span class="rankchip" style="background:#f4f0ff;color:var(--purple)">' + esc(p.name) + " " + p.emoji + "'s</span></h2>" +
      '<p class="sub">This is <b>' + esc(pet.name) + "</b>, " + esc(p.name) + "'s " + esc(P.colour(pet.colour).name) + " " + esc(spec(pet).name) +
        ", level " + lv + ", looking " + esc(info.mood) + " " + info.moodFace + ". " +
        (wearing.length ? "Wearing " + esc(wearing.join(", ")) + ". " : "Not wearing anything today. ") +
        (pet.petpet ? "With <b>" + esc(pet.petpet.name) + "</b> the " + esc(P.petpetById(pet.petpet.id).name) + " trotting behind. " : "") +
        (info.out.length ? info.out.length + " pieces of furniture out, " + info.cosy + " cosy. " : "Nothing out in the room yet. ") +
        rk.emoji + " " + esc(rk.name) + (fl ? " · floor " + fl + " of the tower." : ".") + "</p>" +
      '<div class="acts">' +
        '<button class="act" data-post="' + p.id + '" style="--ac:var(--pink)"><span class="em">🎁</span>Post ' + esc(p.name) + " a present</button>" +
        '<button class="act" data-goto="case" style="--ac:var(--purple)"><span class="em">🏠</span>Go home</button>' +
      "</div>" +
      (lines.length
        ? '<h3 style="margin:1rem 0 0.2rem;font-size:0.98rem">📔 From ' + esc(pet.name) + "'s diary</h3>" +
          lines.map(function (e) {
            return '<div class="entry"><span class="em" aria-hidden="true">' + e.e + '</span><div class="etx">' + esc(e.s) +
              "<small>" + esc(dayLabel(e.d).split(" · ")[0]) + "</small></div></div>";
          }).join("")
        : "") +
      '<p class="sub" style="margin:0.8rem 0 0">Tap ' + esc(pet.name) + " to say hello. Everything here is " + esc(p.name) +
        "'s own — you can look, but only the post can change it.</p>" +
    "</div>";
  }

  /* =========================================================
     THE PHOTO BOOTH — a picture of your Craepet, in its outfit,
     in its room, with its name on. A real PNG you can save.
     ========================================================= */
  function takePhoto() {
    var W = 480, H = 360;
    var cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    var g = cv.getContext("2d");
    var wall = wallNow(), floor = floorNow();
    var horizon = Math.round(H * 0.58);
    var gw = g.createLinearGradient(0, 0, 0, horizon);
    gw.addColorStop(0, wall.a); gw.addColorStop(1, wall.b);
    g.fillStyle = gw; g.fillRect(0, 0, W, horizon);
    var gf = g.createLinearGradient(0, horizon, 0, H);
    gf.addColorStop(0, floor.a); gf.addColorStop(1, floor.b);
    g.fillStyle = gf; g.fillRect(0, horizon, W, H - horizon);
    g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(0, horizon - 2, W, 3);
    // the window, with a sky that knows what time it is
    var tod = timeOfDay();
    var sky = { day: ["#8fd3ff", "#e8f7ff"], dusk: ["#ff9a6a", "#6a3d8f"], dawn: ["#ffd9a8", "#bfe9ff"], night: ["#0f1450", "#2b2a6e"] }[tod];
    var wx = W - 150, wy = 34, ww = 116, wh = 90;
    g.fillStyle = "#fff"; g.fillRect(wx - 5, wy - 5, ww + 10, wh + 10);
    var gs = g.createLinearGradient(0, wy, 0, wy + wh);
    gs.addColorStop(0, sky[0]); gs.addColorStop(1, sky[1]);
    g.fillStyle = gs; g.fillRect(wx, wy, ww, wh);
    g.fillStyle = tod === "night" ? "#fff6c8" : tod === "day" ? "#ffe27a" : "#ffb347";
    g.beginPath(); g.arc(wx + ww * 0.72, wy + wh * 0.32, 13, 0, Math.PI * 2); g.fill();
    if (tod === "night") { g.fillStyle = "#fff"; [[18, 20], [40, 12], [60, 30], [28, 48], [90, 60], [75, 8]].forEach(function (p) { g.fillRect(wx + p[0], wy + p[1], 2, 2); }); }
    g.fillStyle = "#7cc464"; g.fillRect(wx, wy + wh - 22, ww, 22);
    g.fillStyle = "#fff"; g.fillRect(wx + ww / 2 - 2, wy, 4, wh); g.fillRect(wx, wy + wh / 2 - 2, ww, 4);
    // furniture, standing where it stands in the room
    g.textAlign = "center"; g.textBaseline = "alphabetic";
    var out = placedItems(), fn = 0, wn = 0;
    out.forEach(function (it) {
      if (it.hang) {
        var ws = WALL_SPOTS[wn++ % WALL_SPOTS.length];
        g.font = Math.round(30 * ws[2]) + "px sans-serif";
        g.fillText(it.emoji, ws[0] / 100 * W, H - ws[1] / 100 * H);
      } else {
        var row = FLOOR_ROWS[fn % FLOOR_ROWS.length];
        var x = row.xs[Math.floor(fn / FLOOR_ROWS.length) % row.xs.length];
        fn++;
        g.font = Math.round(34 * row.s) + "px sans-serif";
        g.fillText(it.emoji, x / 100 * W, H - row.y / 100 * H);
      }
    });
    // the star of the show
    var tmp = document.createElement("canvas");
    tmp.width = 220; tmp.height = 250;
    if (S.pet.egg) P.drawEgg(tmp, S.pet.colour, { scale: 11, crack: S.pet.egg.got >= 2 ? 2 : S.pet.egg.got >= 0.5 ? 1 : 0 });
    else P.draw(tmp, S.pet.species, S.pet.colour, { frame: "idle", level: level(), scale: 11, wear: S.pet.wear });
    g.imageSmoothingEnabled = false;
    g.drawImage(tmp, Math.round(W / 2 - tmp.width / 2), H - tmp.height - 4);
    if (S.pet.petpet) {
      var pp = document.createElement("canvas");
      pp.width = 90; pp.height = 90;
      P.drawPetpet(pp, S.pet.petpet.id, { scale: 8 });
      g.drawImage(pp, Math.round(W / 2 + 95), H - pp.height - 4);
    }
    // the name plate
    var plate = S.pet.name + "  ·  Lv " + level() + "  ·  " + spec().name + (S.pet.petpet ? "  ·  with " + S.pet.petpet.name : "");
    g.font = "bold 20px sans-serif";
    var pw = g.measureText(plate).width + 34;
    g.fillStyle = "rgba(255,255,255,0.92)";
    g.beginPath(); g.roundRect ? g.roundRect(W / 2 - pw / 2, 14, pw, 40, 20) : g.rect(W / 2 - pw / 2, 14, pw, 40); g.fill();
    g.fillStyle = "#2b2440"; g.textBaseline = "middle";
    g.fillText(plate, W / 2, 34);
    g.font = "bold 13px sans-serif"; g.textAlign = "left"; g.fillStyle = "rgba(255,255,255,0.95)";
    g.fillText(homeName() + " · " + new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }), 14, H - 16);
    g.textAlign = "right"; g.fillText("🥚 Craepets", W - 14, H - 16);
    return cv.toDataURL("image/png");
  }
  function photoSheet() {
    var url = takePhoto();
    var file = (S.pet.name || "craepet").toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".png";
    return sheet("📸 Say cheese, " + esc(S.pet.name) + "!",
      '<p style="margin:0;text-align:center"><img class="photo" alt="' + esc(S.pet.name) + ' in the ' + esc(homeName()) + '" src="' + url + '"></p>' +
      '<p class="sub" style="text-align:center;margin-top:0.6rem">A picture of ' + esc(S.pet.name) + " today — outfit, room and all. " +
      "Press and hold the picture to save it on a phone, or tap the button.</p>" +
      '<p style="text-align:center"><a class="ghost" download="' + esc(file) + '" href="' + url + '">💾 Save the picture</a></p>');
  }

  /* =========================================================
     LITTLE REACTIONS — the pet hops, hearts float up.
     ========================================================= */
  function hop(frames) { if (!calm) anim.hop = frames || 22; anim.happy = 70; }
  function hearts() {
    ["💗", "💕", "💖"].forEach(function (h, i) {
      setTimeout(function () { floaty(h, "#ff8fd0"); }, i * 160);
    });
  }

  /* =========================================================
     THE SCENE — one canvas, the pet always on screen.
     ========================================================= */
  var PLACES = {
    nest:   { tag: "🏡 The Nest",     deco: [["🪟", 8, 12], ["🛏️", 78, 8], ["🧸", 20, 6], ["🖼️", 55, 14]] },
    home:   { tag: "🏠 Your House",   deco: [] },
    stall:  { tag: "🏬 Your Shop",    deco: [["🏷️", 10, 58], ["🪙", 88, 12], ["📦", 16, 8], ["📦", 30, 7]] },
    farm:   { tag: "🍓 Berry Farm",   deco: [["☁️", 12, 72], ["☁️", 70, 78], ["🌻", 6, 6], ["🌾", 88, 5], ["🐝", 30, 55]] },
    well:   { tag: "📖 Word Well",    deco: [["🌕", 78, 74], ["⭐", 16, 76], ["✨", 44, 82], ["🪣", 8, 8], ["📚", 86, 6]] },
    pool:   { tag: "🌈 Rainbow Pool", deco: [["🌈", 62, 70], ["🫧", 14, 26], ["🫧", 82, 18], ["💧", 34, 12]] },
    market: { tag: "🏪 The Market",   deco: [["🎪", 8, 40], ["🛒", 84, 6], ["🏷️", 62, 44], ["🪙", 30, 8]] },
    arena:  { tag: "⚔️ Quiz Arena",   deco: [["🚩", 6, 40], ["🚩", 90, 40], ["🏆", 50, 74]] },
    bag:    { tag: "🎒 Your Bag",     deco: [["🎒", 84, 8], ["✨", 20, 60]] },
    quests: { tag: "📜 Quest Board",  deco: [["📜", 84, 10], ["🪶", 12, 62]] },
    case:   { tag: "🏆 Trophy Case",  deco: [["🏆", 12, 10], ["🎖️", 86, 12], ["✨", 50, 74]] },
    diary:  { tag: "📔 The Diary",    deco: [["📔", 86, 10], ["🖋️", 12, 60], ["✨", 30, 78]] },
    games:  { tag: "🎮 Games Room",   deco: [["⭐", 14, 76], ["🃏", 40, 84], ["🌟", 70, 78], ["☁️", 86, 62]] },
    map:    { tag: "🗺️ The Valley",  deco: [["🗺️", 86, 10], ["🧭", 12, 62]] }
  };

  /* =========================================================
     THE ROOM, DRAWN PROPERLY.

     The old room was a two-colour gradient with a handful of emoji
     floating at random heights, which is why every home looked like
     every other home with different crayons. Now it is built in
     layers, and each layer is drawn the way that layer wants to be:

       · wall and floor  — CSS, because they MUST meet at 55% of the
                           scene's height (that is where the Craepet's
                           feet are) whatever shape the screen is, and
                           each carries a real texture now: bricks,
                           boards, ice facets, star dust.
       · the view        — a painted SVG scene seen through a real
                           window, whose shape follows the house: a
                           porthole in space, a gothic arch in the
                           palace, a knot-hole in the nest.
       · your furniture  — standing on the floor in rows, the far ones
                           drawn smaller, each with a shadow under it;
                           and the things that HANG (pictures, mirrors,
                           banners) up on the wall where they belong.

     All of the painting lives in scenery.js.
     ========================================================= */
  var ART = window.CPArt || null;

  /* Floor rows, back to front: [bottom %, size, the x positions on it].
     The middle of every row is left clear on purpose — that is where
     the Craepet stands. Further back = smaller = the room has depth. */
  var FLOOR_ROWS = [
    { y: 44, s: 0.62, xs: [7, 18, 29, 71, 82, 93] },
    { y: 31, s: 0.78, xs: [4, 16, 84, 96] },
    { y: 17, s: 0.96, xs: [6, 19, 81, 94] },
    { y: 2,  s: 1.16, xs: [11, 27, 73, 89] }
  ];
  /* Hanging spots live on the left half of the wall, because the window
     takes the right — nobody hangs a picture over the window. */
  var WALL_SPOTS = [
    [10, 66, 0.85], [23, 56, 0.75], [36, 66, 0.8], [48, 58, 0.7],
    [10, 48, 0.7], [23, 72, 0.7], [36, 48, 0.65], [48, 72, 0.6]
  ];

  function decoSpan(emoji, x, y, scale, cls) {
    return '<span class="deco ' + (cls || "") + '" aria-hidden="true" style="left:' + x +
      "%;bottom:" + y + "%;--s:" + scale + '">' + emoji + "</span>";
  }

  /* Everything you have put out, standing where it should stand. */
  function homeItemsHtml() {
    var mine = placedItems();
    var out = "", floorN = 0, wallN = 0;
    mine.forEach(function (it) {
      if (it.hang) {
        var w = WALL_SPOTS[wallN++ % WALL_SPOTS.length];
        out += decoSpan(it.emoji, w[0], w[1], w[2], "hung");
      } else {
        var row = FLOOR_ROWS[floorN % FLOOR_ROWS.length];
        var x = row.xs[Math.floor(floorN / FLOOR_ROWS.length) % row.xs.length];
        floorN++;
        out += decoSpan(it.emoji, x, row.y, row.s, "furn");
      }
    });
    return out;
  }

  /* The window, with the view painted inside it. Rendered even in an
     empty house, so a brand new Straw Nest still has something to look
     at — which was the whole complaint. */
  function windowHtml() {
    var v = viewNow();
    if (v.id === "none") return "";
    if (!ART) {
      // No scenery.js (or a browser that will not draw it): fall back to
      // the old floating emoji, so the room is never blank.
      return (v.deco || []).map(function (d) {
        return decoSpan(d[0], d[1], Math.min(d[2], 72), 1, "");
      }).join("");
    }
    var frame = ART.frame(houseInfo());
    return '<div class="win win-' + frame + '" aria-hidden="true">' +
      (ART.viewArt ? ART.viewArt(v.id) : ART.view(v.id)) + weatherHtml() + seasonHtml("win") + todHtml() +
      '<span class="win-glass"></span><span class="win-bars"></span>' +
      "</div>";
  }

  /* The walls and the floor, as one background. The join sits at 55%,
     which is where the Craepet's feet are. */
  function homeBackground() {
    var w = wallNow(), f = floorNow();
    return "linear-gradient(180deg," + w.a + " 0%," + w.b + " 55%," +
           f.a + " 55%," + f.b + " 100%)";
  }

  /* The two texture layers that turn "grey" into "stone". */
  function textureHtml() {
    if (!ART) return "";
    return '<span class="wall-tex" aria-hidden="true" style="background-image:' +
        ART.wallTexture(wallNow()) + '"></span>' +
      '<span class="floor-tex" aria-hidden="true" style="background-image:' +
        ART.floorTexture(floorNow()) + '"></span>' +
      '<span class="skirting" aria-hidden="true" style="background:' +
        ART.shade(floorNow().b, -30, 0.55) + '"></span>';
  }

  var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* x is where the pet is standing, as a fraction of the room's width;
     tx is where it has decided to wander to next; face is which way it
     is looking. They live outside the render so a redraw never makes
     the pet jump back to the middle. */
  var anim = { t: 0, napping: false, cv: null, measure: true, hop: 0, wobble: 0, happy: 0,
               x: 0.5, tx: null, face: 1, wanderAt: 0, shadow: null };

  function levelOf(pet) { return levelFor(pet && pet.xp); }

  /* The egg in the room: it sits in the middle, breathes a little, and
     rocks when it is tapped or when a right answer cracks it. */
  function drawEggScene(cv, pet) {
    if (cv !== anim.cv || anim.measure) {
      var rect = cv.getBoundingClientRect();
      if (!rect.width) return;
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(rect.width * dpr);
      cv.height = Math.round(rect.height * dpr);
      anim.cv = cv;
      anim.shadow = $("#scene .pet-shadow");
      anim.measure = false;
    }
    var w = cv.width, h = cv.height;
    if (!w || !h) return;
    anim.t++;
    anim.x = 0.5;
    if (anim.shadow) anim.shadow.style.left = "50%";
    var scale = Math.max(2, Math.floor(Math.min(h / 24, w / 26) * 0.9));
    var tilt = 0;
    if (anim.wobble > 0 && !calm) { tilt = Math.sin(anim.wobble / 2) * 0.16 * (anim.wobble / 24); anim.wobble--; }
    else if (!calm && anim.t % 240 > 228) tilt = Math.sin(anim.t / 1.5) * 0.06;     // a twitch now and then
    var crack = pet.egg.got >= 2 ? 2 : pet.egg.got >= 0.5 ? 1 : 0;
    P.drawEgg(cv, pet.colour, { scale: scale, cx: Math.round(w / 2), tilt: tilt, crack: crack,
                                bob: calm ? 0 : Math.round(Math.sin(anim.t / 30) * scale * 0.15) });
  }

  /* How much taller than normal a Craepet's room is: nothing until level
     50, then 0.3% a level up to a third taller at 150, so a big pet gets
     a big room instead of being cropped by a small one. */
  function roomGrow(lv) { return 1 + Math.max(0, Math.min(100, (lv || 1) - 50)) * 0.003; }

  function drawScene() {
    var cv = $("#pet-canvas");
    // in somebody else's house it is THEIR Craepet in the room
    var pet = (view === "visit" && visit) ? visit.s.pet : S.pet;
    if (!cv || !pet) return;
    if (pet.egg) return drawEggScene(cv, pet);
    if (cv !== anim.cv || anim.measure) {
      var rect = cv.getBoundingClientRect();
      if (!rect.width) return;
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(rect.width * dpr);
      cv.height = Math.round(rect.height * dpr);
      anim.cv = cv;
      anim.shadow = $("#scene .pet-shadow");
      anim.measure = false;
    }
    var w = cv.width, h = cv.height;
    if (!w || !h) return;

    anim.t++;
    var sleeping = pet.energy < 20 || anim.napping;

    // A Craepet grows a little with every level — about a sixth bigger by
    // level 20 and a quarter bigger by level 50 — so a grown one really is
    // bigger than a hatchling. Past 50 it keeps growing: the room itself
    // gets taller (see roomGrow, up to a third by level 150) and the pet
    // keeps filling a touch more of it, easing towards a ceiling that
    // still leaves headroom for a hat.
    var lv = levelOf(pet);
    var grow = 1 + Math.min(19, lv - 1) * 0.008 + Math.max(0, Math.min(30, lv - 20)) * 0.003 +
      (lv > 50 ? 0.06 * (1 - Math.exp(-(lv - 50) / 80)) : 0);
    var scale = Math.max(2, Math.floor(Math.min(h / 24, w / 26) * grow));

    // WANDERING. In the full-height room (the nest, or a house you are
    // visiting) the pet strolls about now and then, turning to face the
    // way it is going. In the compact band it stays in the middle where
    // the question can see it.
    var roomy = (view === "nest" || view === "visit") && !calm && !sleeping;
    var walking = false;
    if (roomy) {
      if (anim.tx === null && anim.t >= anim.wanderAt) {
        if (Math.random() < 0.6) anim.tx = 0.2 + Math.random() * 0.6;
        anim.wanderAt = anim.t + 160 + Math.random() * 320;
      }
      if (anim.tx !== null) {
        var d = anim.tx - anim.x;
        if (Math.abs(d) < 0.004) { anim.tx = null; }
        else { anim.x += (d < 0 ? -1 : 1) * 0.0022; anim.face = d < 0 ? -1 : 1; walking = true; }
      }
    } else if (anim.x !== 0.5) {
      anim.x += (0.5 - anim.x) * 0.15;
      if (Math.abs(anim.x - 0.5) < 0.002) anim.x = 0.5;
      anim.tx = null;
    }
    if (anim.shadow) anim.shadow.style.left = (anim.x * 100) + "%";

    // Which picture: asleep; walking (the feet alternate every eight
    // frames, one step per bounce); happy (^ ^ eyes for a while after a
    // treat, a game or a hop); or a blink now and then.
    var step = Math.floor(anim.t / 8) % 2 === 1;
    if (anim.happy > 0) anim.happy--;
    var glad = anim.hop > 0 || anim.happy > 0;
    var frame = sleeping ? "sleep"
      : glad ? ((walking && step) ? "happywalk" : "happy")
      : (walking && step) ? "walk"
      : (anim.t % 150 > 144) ? "blink"
      : "idle";

    var bob = calm ? 0
      : sleeping ? Math.round(Math.sin(anim.t / 40) * scale * 0.35)
      : walking  ? Math.round(Math.abs(Math.sin(anim.t * Math.PI / 8)) * scale * -0.7)
                 : Math.round(Math.sin(anim.t / 16) * scale * 0.6);
    // a little jump for joy: fed, played with, dressed up, a wish granted
    if (anim.hop > 0) {
      var k = anim.hop / 22;
      bob -= Math.round(Math.sin(k * Math.PI) * scale * 2.4);
      anim.hop--;
    }
    P.draw(cv, pet.species, pet.colour, { frame: frame, level: lv, scale: scale, bob: bob, wear: pet.wear,
                                          cx: Math.round(anim.x * w), flip: anim.face < 0 });
    // the petpet trots along a little way behind
    if (pet.petpet && pet.petpet.id) {
      var want = anim.x - anim.face * 0.13;
      if (anim.px === undefined) anim.px = want;
      anim.px += (want - anim.px) * 0.06;
      var pscale = Math.max(2, Math.round(scale * 0.7));
      var pbob = calm ? 0 : (walking || Math.abs(want - anim.px) > 0.01)
        ? Math.round(Math.abs(Math.sin(anim.t / 4)) * pscale * -0.6)
        : Math.round(Math.sin(anim.t / 14 + 1) * pscale * 0.35);
      P.drawPetpet(cv, pet.petpet.id, { cx: Math.round(anim.px * w), scale: pscale, bob: sleeping ? 0 : pbob, flip: anim.face < 0 });
    }
  }

  function loop() {
    try { drawScene(); } catch (e) {}
    requestAnimationFrame(loop);
  }

  function sceneHtml(place) {
    var pl = PLACES[place] || PLACES.nest;
    // The nest and the House tab are the same room seen from two tabs, so
    // the furniture you put out shows up in both.
    var atHome = (place === "nest" || place === "home");
    var skin = atHome ? "nest" : place;
    var inTower = place === "arena" && battle && battle.mode === "tower";
    if (inTower) skin = "tower";
    // At home the room is painted from the wall and floor you chose, so
    // repainting shows up the instant you tap it.
    var shown = (view === "visit" && visit) ? visit.s.pet : S.pet;
    var big = roomGrow(shown && !shown.egg ? levelOf(shown) : 1);
    var paint = ' style="' + (atHome ? "background:" + homeBackground() + ";" : "") +
      (big > 1 ? "--big:" + big.toFixed(3) : "") + '"';
    var tag = atHome ? houseInfo().emoji + " " + homeName() : pl.tag;
    if (inTower) tag = "🗼 Shadow Tower · floor " + battle.floor;

    var body;
    if (atHome) {
      // Textures, then the window and the view through it, then your
      // furniture standing in front of both.
      body = textureHtml() + windowHtml() + homeItemsHtml() +
        '<span class="pet-shadow" aria-hidden="true"></span>';
    } else if (ART && ART.hasPano(skin)) {
      // Everywhere else gets a painted panorama instead of the old
      // scatter of emoji — same idea, an actual picture of the place.
      body = '<span class="pano" aria-hidden="true">' + (ART.panoArt ? ART.panoArt(skin) : ART.pano(skin)) + (inTower ? "" : weatherHtml() + seasonHtml("pano") + todHtml()) + "</span>";
    } else {
      body = (pl.deco || []).map(function (d) {
        return decoSpan(d[0], d[1], d[2], 1, "");
      }).join("");
    }

    var label = S.pet
      ? S.pet.name + ", a " + P.colour(S.pet.colour).name + " " + P.species(S.pet.species).name +
        ", looking " + mood() + ", at " + tag.replace(/^\S+\s/, "")
      : "your Craepet";
    // At home the whole room dims after dark, with a pool of lamplight
    // where the Craepet stands.
    var tod = timeOfDay();
    var roomTint = (atHome && tod !== "day") ? '<span class="roomtint tod-' + tod + '" aria-hidden="true"></span>' : "";
    var todMark = ({ night: " 🌙", dusk: " 🌇", dawn: " 🌅" }[tod] || "") + " " + weatherToday().emoji;
    return '<div class="scene ' + skin + (place === "nest" ? "" : " compact") + " tod-" + tod + '" id="scene"' + paint + " " +
      'role="button" tabindex="0" aria-label="' + esc(label) + '. Tap to say hello.">' +
      body + roomTint + (inTower ? "" : garlandHtml()) +
      '<span class="place-tag" aria-hidden="true">' + esc(tag) + (inTower ? "" : todMark) + "</span>" +
      '<canvas id="pet-canvas" aria-hidden="true"></canvas>' +
      '<div id="bubble-slot" role="status" aria-live="polite"></div>' +
    "</div>";
  }

  var bubbleTimer = null, lastChirp = 0;
  /* Every species has a voice of its own: a low growl for a Flarn, a
     high chirp for a Glimmr. Two or three notes whenever it speaks. */
  var VOICES = {
    blorb: [440, "sine"], snorbit: [720, "triangle"], flarn: [200, "square"], twiggle: [600, "sine"],
    puddlepop: [900, "triangle"], zibbit: [320, "square"], glimmr: [1150, "sine"]
  };
  function chirp(pet) {
    pet = pet || S.pet;
    if (!pet || pet.egg || Date.now() - lastChirp < 1200) return;
    lastChirp = Date.now();
    var v = VOICES[pet.species] || VOICES.blorb;
    try { if (window.SFX && SFX.voice) SFX.voice(v[0], v[1]); } catch (e) {}
  }
  /* The pet's speech bubble — and, given a token, its voice. */
  function say(text, ms, tok) {
    if (tok) narrate([tok]);
    chirp((view === "visit" && visit) ? visit.s.pet : S.pet);
    var slotEl = $("#bubble-slot");
    if (!slotEl) return;
    slotEl.innerHTML = '<div class="bubble">' + esc(text) + "</div>";
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () {
      var b = $("#bubble-slot");
      if (b) b.innerHTML = "";
    }, ms || 2600);
  }

  function floaty(text, colour) {
    var sc = $("#scene");
    if (!sc) return;
    var f = document.createElement("span");
    f.className = "floaty";
    f.textContent = text;
    f.style.left = (35 + Math.random() * 30) + "%";
    f.style.bottom = "42%";
    if (colour) f.style.color = colour;
    sc.appendChild(f);
    setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 1000);
  }

  var toastTimer = null;
  function toast(text) {
    var old = $(".toast");
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var t = document.createElement("div");
    t.className = "toast";
    t.setAttribute("role", "status");
    t.setAttribute("aria-live", "polite");
    t.textContent = text;
    document.body.appendChild(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2600);
  }

  /* =========================================================
     RENDERING
     ========================================================= */
  function render() {
    passTime();
    renderWho();
    var g = $("#game");
    if (!g) return;
    if (!S.pet) { g.innerHTML = adoptHtml(); return; }
    if (view === "visit" && !visit) view = "case";
    // round at somebody's house, the room is painted from THEIR save
    var scene = (view === "visit")
      ? withSave(visit.s, function () { return sceneHtml("nest"); })
      : sceneHtml(view);
    g.innerHTML =
      topbarHtml() +
      scene +
      needsHtml() +
      navHtml() +
      panelHtml();
    afterRender(g);
    save();
  }

  /* =========================================================
     AFTER THE RENDER — the bits of the picture that need a real
     element to draw into: the pixel-art scenery, the weather in
     the sky, and the crayon pages.
     ========================================================= */
  var sky = null, warmed = false;
  function afterRender(g) {
    if (ART && ART.paintPixels) {
      if (!warmed && ART.warm) { warmed = true; ART.warm([viewNow().id]); }
      ART.paintPixels(g);
    }
    mountSky();
    paintCrayons(g);
  }
  /* Which sky the calendar calls for. */
  function skyMode() {
    var wx = weatherToday().id, tod = timeOfDay();
    var season = (CAL && CAL.season && CAL.season().id) || "";
    if (wx === "rainy") return "rain";
    if (wx === "snowy") return "snow";
    if (tod === "night") return season === "winter" ? "aurora" : "stars";
    if (tod === "dusk" || tod === "dawn") return "dusk";
    if (wx === "sunny" && (season === "summer" || season === "spring")) return "motes";
    return "clear";
  }
  /* One WebGL layer for the whole game, moved into whichever window or
     panorama is on screen. It is only ever made once — a browser has
     a small number of WebGL contexts to give out. */
  function mountSky() {
    if (!window.CPSky) return;
    var scene = $("#scene");
    var host = scene && (scene.querySelector(".win") || scene.querySelector(".pano"));
    if (!host) { if (sky) sky.set("clear"); return; }
    if (!sky) sky = CPSky.attach(host);
    var glass = host.querySelector(".win-glass");
    if (glass) host.insertBefore(sky.canvas, glass); else host.appendChild(sky.canvas);
    var mode = scene.classList.contains("tower") ? "stars" : skyMode();
    sky.set(mode, { sky: host.classList.contains("pano") ? 0.62 : 0.6 });
    scene.classList.toggle("has-sky", !!sky.live && mode !== "clear");
  }
  /* Crayon canvases carry their recipe in data-crayon; draw them once. */
  function paintCrayons(root) {
    if (!window.CPCrayon) return;
    var list = root.querySelectorAll("canvas[data-crayon]");
    if (!list.length) return;
    Array.prototype.forEach.call(list, function (cv) {
      if (cv.dataset.done) return;
      try {
        var d = JSON.parse(cv.getAttribute("data-crayon"));
        (d.kind === "poster" ? CPCrayon.poster : CPCrayon.diaryPage)(cv, d);
        cv.dataset.done = "1";
      } catch (e) {}
    });
    // the handwriting font may still be on its way: draw again when it lands
    if (document.fonts && document.fonts.status !== "loaded") {
      document.fonts.ready.then(function () {
        Array.prototype.forEach.call(list, function (cv) { delete cv.dataset.done; });
        paintCrayons(root);
      });
    }
  }
  function placeName(id) { var pl = PLACES[id]; return pl ? pl.tag.replace(/^\S+\s/, "") : "the valley"; }
  function shorten(s, n) { s = String(s || ""); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s; }
  /* The Craepet's own drawing of today, at the top of its diary. */
  function crayonDiary(entries) {
    if (!window.CPCrayon || !S.pet || S.pet.egg) return "";
    var sp = P.species(S.pet.species);
    var place = ["farm", "well", "pool", "market", "arena", "stall"].indexOf(lastPlace) !== -1 ? lastPlace : (sp.fav || "nest");
    var today = entries.filter(function (e) { return e.d === D.dayNumber(); });
    var latest = today.length ? today[today.length - 1] : (entries.length ? entries[entries.length - 1] : null);
    var data = { kind: "diary", speciesId: S.pet.species, colourId: S.pet.colour, place: place, food: sp.likes[0],
      count: Math.min(5, Math.max(1, today.length)),
      text: ["Went to " + placeName(place) + " today.",
             latest ? shorten(latest.s, 44) : "Nothing has happened yet. Let's go!"],
      sign: S.pet.name + ", level " + levelOf(S.pet) + " · " + dayLabel(D.dayNumber()).replace(/^Today · /, ""),
      seed: D.dayNumber() * 31 + 7 };
    return '<canvas class="crayon-page" width="720" height="440" data-crayon="' + esc(JSON.stringify(data)) +
      '" role="img" aria-label="' + esc(S.pet.name) + "'s drawing of today\"></canvas>";
  }
  /* A pinned-up poster for the Quest Board. */
  function crayonPoster() {
    if (!window.CPCrayon || !S.pet || S.pet.egg) return "";
    var sp = P.species(S.pet.species);
    var data = { kind: "poster", speciesId: S.pet.species, colourId: S.pet.colour, title: "HELP WANTED",
      line: "Quests for " + S.pet.name, food: sp.likes[D.dayNumber() % 3], seed: D.dayNumber() * 17 + 3 };
    return '<canvas class="crayon-poster" width="360" height="280" data-crayon="' + esc(JSON.stringify(data)) + '" aria-hidden="true"></canvas>';
  }

  function renderWho() {
    var row = $("#who-row");
    if (!row) return;
    var p = D.profile(who);
    row.innerHTML = '<button class="who on" data-swap="1" aria-label="Playing as ' + esc(p.name) +
      '. Tap to switch player." style="--wc:' + p.colour + '">' +
      petChip(who, 22) + '<span aria-hidden="true">' + p.emoji + "</span> " + esc(p.name) +
      ' <span style="opacity:.7">▾</span></button>';
  }

  /* A face for a profile's pet, or nothing if they haven't adopted yet. */
  function petChip(id, px) {
    var s = (id === who) ? S : readSlot(id);
    return (s && s.pet) ? '<img alt="" src="' + chipOf(s.pet, px) + '">' : "";
  }
  /* A pet's face, with whatever it is wearing. */
  function chipOf(pet, px) {
    if (pet.egg) return P.eggChip(pet.colour, px, pet.egg.got);
    return P.chip(pet.species, pet.colour, px, pet.wear, levelFor(pet.xp));
  }

  /* =========================================================
     HATCHING — a Craepet starts as an egg.
     Three right answers anywhere (or eight taps on the shell)
     and it cracks open. It is the first minute of the game,
     and the first thing the diary remembers.
     ========================================================= */
  var EGG_NEED = 3, EGG_TAPS = 8;
  function eggProgress() {
    var e = S.pet && S.pet.egg;
    if (!e) return;
    e.got++;
    if (e.got >= e.need) hatch();
    else { anim.wobble = 30; sfx("crack"); toast("🥚 The egg cracks a little… " + (e.need - e.got) + " to go!"); }
  }
  function tapEgg() {
    var e = S.pet.egg;
    e.taps++;
    anim.wobble = 24;
    sfx(e.taps >= EGG_TAPS - 2 ? "crack" : "knock");
    if (e.taps >= EGG_TAPS) { hatch(); return; }
    say(["*wobble*", "*tap tap*", "…?", "*wiggle*", "Something's in there!"][e.taps % 5], 1400);
    // a crack shows at the halfway mark
    if (e.taps === Math.ceil(EGG_TAPS / 2) && e.got < 1) e.got = 0.5;
    save();
  }
  function hatch() {
    if (!S.pet || !S.pet.egg) return;
    delete S.pet.egg;
    S.pet.born = Date.now();
    anim.wobble = 0;
    diary("🐣", "I hatched today! Out of a " + P.colour(S.pet.colour).name + " egg, and I'm a " + spec().name + ". " + D.profile(who).name + " called me " + S.pet.name + ".");
    checkTrophies();
    save();
    render();
    sfx("win");
    hop();
    hearts();
    try { window.Confetti && Confetti.burst({ count: 140 }); } catch (e) {}
    toast("🐣 " + S.pet.name + " hatched!");
    say("Hi! I'm " + S.pet.name + "!", 3600, "p-hello");
  }

  function whoSheet() {
    return sheet("👋 Who's playing?",
      '<p class="sub">Everyone gets their own Craepet, own coins and own level. ' +
      "Nobody can spend anybody else's berries.</p>" +
      '<div class="who-row">' + D.PROFILES.map(function (p) {
        var s = null;
        try { s = JSON.parse(localStorage.getItem(slot(p.id))); } catch (e) {}
        var note = (s && s.pet) ? s.pet.name : "new";
        return '<button class="who' + (p.id === who ? " on" : "") + '" data-who="' + p.id + '" ' +
               'style="--wc:' + p.colour + '">' + petChip(p.id, 22) +
               '<span aria-hidden="true">' + p.emoji + "</span> " + esc(p.name) +
               ' <small style="opacity:.7">' + esc(note) + "</small></button>";
      }).join("") + "</div>");
  }

  function topbarHtml() {
    var lv = level();
    var on = voiceWanted();
    var voiceBtn = canTalk
      ? '<button class="mini" data-voice="1" aria-pressed="' + on + '" ' +
        'aria-label="' + (on ? "Reading questions aloud. Turn off." : "Read questions aloud") + '" ' +
        'title="' + (on ? "Reading aloud is ON" : "Read questions aloud") + '">' +
        (on ? "🔊" : "🔇") + "</button>"
      : "";
    return '<div class="topbar">' +
      '<span class="coins" id="coin-count">🪙 ' + S.coins + "</span>" +
      '<span class="petname">' + esc(S.pet.name) + " " + moodFace() + "</span>" +
      voiceBtn +
      '<button class="mini" data-help="1" aria-label="How to play" title="How to play">❓</button>' +
      '<span class="lvl" aria-label="Level ' + lv + '">Lv ' + lv + "</span>" +
      '<span class="xp" role="img" aria-label="' + xpInLevel() + " of " + xpToNext() + ' experience to the next level" title="' +
        xpInLevel() + "/" + xpToNext() + ' to the next level"><i style="width:' + (xpInLevel() / xpToNext() * 100) + '%"></i></span>' +
    "</div>";
  }

  function needsHtml() {
    var p = S.pet;
    if (p.egg) {
      var left = Math.max(0, p.egg.need - p.egg.got);
      return '<div class="needs egg"><div class="need" role="status">🥚 <b>Snug in the egg.</b> ' +
        (left ? left + " more right answer" + (left === 1 ? "" : "s") + " anywhere — or " + Math.max(0, 8 - p.egg.taps) + " more taps on it — and it hatches." : "Hatching…") +
        "</div></div>";
    }
    var rows = [["🍽️", "Food", p.hunger], ["😊", "Happy", p.happy], ["⚡", "Energy", p.energy], ["🫧", "Clean", p.clean]];
    return '<div class="needs">' + rows.map(function (r) {
      var v = Math.round(r[2]);
      var col = v > 60 ? "#3ddc84" : v > 33 ? "#ffd166" : "#ff5d8f";
      return '<div class="need" role="img" aria-label="' + r[1] + " " + v + ' out of 100">' +
             "<b aria-hidden=\"true\">" + r[0] + "</b>" +
             '<span><i style="width:' + v + "%;background:" + col + '"></i></span>' +
             "<small>" + r[1] + "</small></div>";
    }).join("") + "</div>";
  }

  var NAV = [
    ["map", "🗺️", "Map"], ["nest", "🏡", "Nest"], ["home", "🏠", "House"],
    ["farm", "🍓", "Farm"], ["well", "📖", "Well"], ["pool", "🌈", "Pool"], ["games", "🎮", "Games"],
    ["market", "🏪", "Market"], ["stall", "🏬", "Stall"], ["arena", "⚔️", "Arena"],
    ["bag", "🎒", "Bag"], ["quests", "📜", "Daily"], ["diary", "📔", "Diary"], ["case", "🏆", "Case"]
  ];
  /* The last real PLACE you were at, so the map can put a ring round it. */
  var lastPlace = "nest";

  function navHtml() {
    var ready = quests().filter(function (q) {
      return !S.claimed[q.id] && (S.today[q.track] || 0) >= q.goal;
    }).length;
    var due = S.review.filter(function (r) { return r.tier === tier(); }).length;
    // Anything bought or found and not yet used — so a purchase is visibly
    // waiting for you instead of quietly disappearing into the bag.
    var fresh = Object.keys(S.bagNew || {}).filter(function (id) { return S.bag[id] > 0; }).length;
    // Two rows: the places in the valley, and the things that are yours.
    var PLACES_ROW = ["map", "farm", "well", "pool", "games", "market", "stall", "arena", "quests"];
    var btn = function (n) {
      var dot = "";
      if (n[0] === "quests" && ready) dot = '<span class="dot">' + ready + "</span>";
      if (n[0] === "nest" && due) dot = '<span class="dot review" title="' + due + ' to review">🔁</span>';
      // a parcel waiting beats everything else the nest could be flagging
      if (n[0] === "nest" && (S.mail || []).length) dot = '<span class="dot" title="You have post">📬</span>';
      if (n[0] === "bag" && fresh) dot = '<span class="dot">' + fresh + "</span>";
      // A free spin waiting, and money taken while you were away, are both
      // things you should be able to see without opening the tab.
      if (n[0] === "quests" && !dot && !spunToday()) dot = '<span class="dot">🎡</span>';
      if (n[0] === "stall" && (S.stall.sales || []).length) {
        dot = '<span class="dot">' + S.stall.sales.length + "</span>";
      }
      return '<button data-go="' + n[0] + '"' + (view === n[0] ? ' class="on" aria-current="page"' : "") + ">" +
             n[1] + " " + n[2] + dot + "</button>";
    };
    var places = NAV.filter(function (n) { return PLACES_ROW.indexOf(n[0]) !== -1; }).map(btn).join("");
    var mine = NAV.filter(function (n) { return PLACES_ROW.indexOf(n[0]) === -1; }).map(btn).join("");
    return '<nav class="nav" id="nav" aria-label="Where to go">' +
      '<div class="navrow"><span class="navlabel" aria-hidden="true">Valley</span>' + places + "</div>" +
      '<div class="navrow"><span class="navlabel" aria-hidden="true">Mine</span>' + mine + "</div>" +
    "</nav>";
  }

  function panelHtml() {
    switch (view) {
      case "nest": return nestHtml();
      case "farm": return placeHtml("farm");
      case "well": return placeHtml("well");
      case "pool": return placeHtml("pool");
      case "home": return houseHtml();
      case "market": return marketHtml();
      case "stall": return stallHtml();
      case "arena": return arenaHtml();
      case "bag": return bagHtml();
      case "quests": return questsHtml();
      case "diary": return diaryHtml();
      case "case": return caseHtml();
      case "visit": return visitHtml();
      case "games": return gamesHtml();
      case "map": return mapHtml();
    }
    return "";
  }

  /* =========================================================
     THE GAMES ROOM — Sky Catch and Memory Match under one roof.
     ========================================================= */
  var gamesTab = "catch";
  function gamesHtml() {
    var tabs = [["catch", "⭐", "Sky Catch"], ["match", "🃏", "Memory Match"]];
    var chips = '<div class="subnav">' + tabs.map(function (t) {
      return '<button data-gamestab="' + t[0] + '"' + (gamesTab === t[0] ? ' class="on"' : "") + ">" + t[1] + " " + t[2] + "</button>";
    }).join("") + "</div>";
    var head = (catchOn || match) ? "" :
      '<div class="panel"><h2>🎮 The Games Room</h2>' + npcHtml("games") +
      '<p class="sub">Two games, real ones: quick fingers in <b>Sky Catch</b>, a good memory in <b>Memory Match</b>. Both pay coins, both keep your best score, and both are sorting at your level.</p>' +
      chips + "</div>";
    return head + (gamesTab === "match" ? matchHtml() : catchHtml());
  }

  /* --- 🃏 Memory Match --- */
  var match = null;            // { rule, pairs, cards, first, lock, flips, found }
  function matchHtml() {
    var m = S.match || { best: 0, games: 0 };
    if (!match) {
      var rules = window.CPMatch ? CPMatch.themes(tier(), D, L).map(function (t) { return t.rule; }) : [];
      return '<div class="panel"><h2>🃏 Memory Match</h2>' +
        '<p class="sub">Turn two cards over. A pair is a <b>sum and its answer</b>, an <b>animal and its baby</b>, a <b>word and its opposite</b>… ' +
        "so every pair you keep is something you know. Fewer turns, more coins.</p>" +
        '<div class="statgrid">' +
          '<div class="stat"><b>🃏 ' + (m.best || 0) + "</b><small>best: pairs in fewest turns</small></div>" +
          '<div class="stat"><b>🎮 ' + (m.games || 0) + "</b><small>games played</small></div>" +
        "</div>" +
        '<p style="margin:0.8rem 0 0"><button class="act" data-matchplay="1" style="--ac:#e05fa8;width:100%"><span class="em">🃏</span>Deal the cards</button></p>' +
        '<p class="sub" style="margin-top:0.8rem">Rules at your level: ' + rules.map(function (r) { return "<b>" + esc(r.replace(/!$/, "")) + "</b>"; }).join(" · ") + ".</p>" +
      "</div>";
    }
    var cols = match.cards.length <= 8 ? 4 : 4;
    return '<div class="panel"><h2>🃏 ' + esc(match.rule) + "</h2>" +
      '<p class="sub">' + match.found + " of " + match.pairs.length + " pairs · " + match.flips + " turn" + (match.flips === 1 ? "" : "s") +
      ' <button class="ghost small" data-matchstop="1">Stop</button></p>' +
      '<div class="mgrid" style="--cols:' + cols + '">' + match.cards.map(function (c, i) {
        return '<button class="mcard' + (c.done ? " done" : c.up ? " up" : "") + '" data-mc="' + i + '" aria-label="' +
          (c.up || c.done ? esc(cardLabel(c.face)) : "face-down card " + (i + 1)) + '"' + (c.done ? " disabled" : "") + ">" +
          '<span class="inner"><span class="back">✨</span><span class="face">' + cardHtml(c.face) + "</span></span></button>";
      }).join("") + "</div></div>";
  }
  function cardLabel(f) { return f.t || f.emoji || (f.colour ? "a colour" : ""); }
  function cardHtml(f) {
    if (f.colour) return '<span class="swatchcard" style="background:' + f.colour + '"></span>';
    if (f.emoji) return '<span class="big">' + f.emoji + "</span>";
    var t = String(f.t);
    return '<span class="' + (t.length > 8 ? "small" : t.length > 4 ? "" : "big") + '">' + esc(t) + "</span>";
  }
  function startMatch() {
    if (!window.CPMatch) return;
    var d = CPMatch.deal(tier(), D, L);
    match = { rule: d.rule, pairs: d.pairs, cards: d.cards.map(function (c) { c.up = false; c.done = false; return c; }),
              first: -1, lock: false, flips: 0, found: 0 };
    hush();
    render();
    narrate([spoken(d.rule)]);
    sfx("pop");
  }
  function flipCard(i) {
    if (!match || match.lock) return;
    var c = match.cards[i];
    if (!c || c.up || c.done) return;
    c.up = true;
    var el = document.querySelector('[data-mc="' + i + '"]');
    if (el) { el.classList.add("up"); el.setAttribute("aria-label", cardLabel(c.face)); }
    sfx("pop");
    if (match.first < 0) { match.first = i; return; }
    var a = match.cards[match.first], b = c, ai = match.first;
    match.first = -1;
    match.flips++;
    if (a.pair === b.pair) {
      a.done = b.done = true;
      match.found++;
      [ai, i].forEach(function (k) { var e = document.querySelector('[data-mc="' + k + '"]'); if (e) { e.classList.add("done"); e.disabled = true; } });
      sfx(match.found >= 3 ? "streak" : "good", match.found);
      if (match.found >= match.pairs.length) { match.lock = true; narrate(["g-match-done"]); setTimeout(endMatch, 500); }
      else if (match.found === 1) narrate(["g-match-found"]);
    } else {
      match.lock = true;
      sfx("nope");
      setTimeout(function () {
        if (!match) return;
        a.up = b.up = false;
        [ai, i].forEach(function (k) { var e = document.querySelector('[data-mc="' + k + '"]'); if (e) { e.classList.remove("up"); e.setAttribute("aria-label", "face-down card " + (k + 1)); } });
        match.lock = false;
      }, 750);
    }
    var sub = document.querySelector(".mgrid") && document.querySelector(".mgrid").previousElementSibling;
    if (sub) sub.firstChild.nodeValue = match.found + " of " + match.pairs.length + " pairs · " + match.flips + " turn" + (match.flips === 1 ? "" : "s") + " ";
  }
  function endMatch() {
    if (!match) return;
    var m = match;
    match = null;
    var n = m.pairs.length;
    var perfect = n, tidy = n + Math.ceil(n / 2);
    var bonus = m.flips <= perfect ? 30 : m.flips <= tidy ? 20 : m.flips <= n * 2 ? 10 : 0;
    var coins = n * 4 + bonus;
    earn(coins);
    giveXp(n * 2);
    if (!S.match) S.match = { best: 0, games: 0 };
    S.match.games++;
    bump("matchGames");
    bestToday("matchPairs", n);
    // "best" is pairs found per turn taken, as a percentage — 100 is perfect
    var eff = Math.round(n / m.flips * 100);
    var newBest = eff > (S.match.best || 0);
    if (newBest) { S.match.best = eff; diary("🃏", "Memory Match: " + n + " pairs in " + m.flips + " turns. My best yet!"); }
    S.pet.happy = clamp(S.pet.happy + 5, 0, 100);
    checkTrophies();
    save();
    render();
    openSheet(sheet("🃏 " + (bonus >= 30 ? "Perfect memory!" : bonus >= 20 ? "Sharp!" : "All found!"),
      '<p class="sub" style="text-align:center;font-size:1.15rem"><b>' + n + " pairs in " + m.flips + " turns</b>" + (newBest ? " — a new best! 🏆" : "") + "</p>" +
      '<div class="statgrid"><div class="stat"><b>🪙 ' + coins + "</b><small>earned" + (bonus ? " (+" + bonus + " for few turns)" : "") + "</small></div>" +
      '<div class="stat"><b>⭐ ' + (n * 2) + "</b><small>XP</small></div></div>" +
      '<p class="teach"><b>' + esc(m.rule) + "</b></p>" +
      '<div class="pairlist">' + m.pairs.map(function (p) {
        return '<span class="pair">' + cardHtml(p[0]) + ' <span class="eq">=</span> ' + cardHtml(p[1]) + "</span>";
      }).join("") + "</div>" +
      '<p style="margin:0.8rem 0 0"><button class="act" data-matchplay="1" style="--ac:#e05fa8;width:100%"><span class="em">🔁</span>Deal again</button></p>'));
    sfx("win");
    try { window.Confetti && Confetti.burst({ count: bonus ? 80 : 40 }); } catch (e) {}
  }
  function stopMatch() { match = null; }

  /* =========================================================
     THE VALLEY MAP — every place as a picture you can tap.
     ========================================================= */
  function mapHtml() {
    if (!window.CPMap) return "";
    var homes = D.PROFILES.map(function (p) {
      var s = (p.id === who) ? S : readSlot(p.id);
      if (!s || !s.pet) return null;
      var hm = D.houseById((s.house && s.house.home) || "nest");
      return { id: p.id, name: (p.id === who ? "Home" : s.pet.name), emoji: hm.emoji, colour: p.colour,
               chip: chipOf(s.pet, 16), mine: p.id === who };
    }).filter(Boolean);
    return '<div class="panel mappanel"><h2>🗺️ The Valley</h2>' +
      '<p class="sub">Tap anywhere to go there. Your house is on the lane at the bottom, next to the rest of the family\'s — tap theirs to visit.</p>' +
      '<div class="mapwrap">' + CPMap.svg({ here: lastPlace, homes: homes }) + "</div>" +
      '<p class="sub" style="margin-top:0.6rem">🍓 Farm for maths · 📖 Well for words · 🌈 Pool for the wide world · ⭐ Sky Catch for quick fingers · ' +
      "🏪 Market & Bank · 🏬 your Stall · ⚔️ Arena and 🗼 the Shadow Tower · 📜 the Quest Board and the prize wheel.</p></div>";
  }

  /* =========================================================
     SKY CATCH — the arcade game (catch.js does the running).
     ========================================================= */
  var catchOn = false;
  function catchHtml() {
    var c = S.catch || { best: 0, games: 0 };
    var rules = (window.CPCatch && CPCatch.RULES[tier()]) || [];
    if (catchOn) {
      return '<div class="panel catchpanel"><canvas id="catch-canvas" aria-label="Sky Catch — drag left and right to move ' +
        esc(S.pet.name) + '" tabindex="0"></canvas>' +
        '<p class="sub" style="margin:0.5rem 0 0;text-align:center">Drag anywhere on the sky (or use the arrow keys) to run ' +
        esc(S.pet.name) + " underneath the right ones. " +
        '<button class="ghost small" data-catchstop="1">Stop</button></p></div>';
    }
    return '<div class="panel catchpanel"><h2>⭐ Sky Catch</h2>' +
      '<p class="sub">Things fall out of the sky and ' + esc(S.pet.name) + " runs about underneath. Catch <b>only the ones the rule asks for</b> " +
      "— even numbers, vowels, the letter A, the stars. 40 seconds. Every one you get right is a point" +
      (tier() === "tot" || tier() === "early" ? "." : ", every wrong one costs a point.") + " Points pay 🪙 3 each.</p>" +
      '<div class="statgrid">' +
        '<div class="stat"><b>⭐ ' + (c.best || 0) + "</b><small>best score</small></div>" +
        '<div class="stat"><b>🎮 ' + (c.games || 0) + "</b><small>games played</small></div>" +
        '<div class="stat"><b>🪙 ' + Math.min(90, (c.best || 0) * 3) + "</b><small>your best pays</small></div>" +
      "</div>" +
      '<p style="margin:0.8rem 0 0"><button class="act" data-catchplay="1" style="--ac:#38b6ff;width:100%"><span class="em">⭐</span>Play Sky Catch</button></p>' +
      '<p class="sub" style="margin-top:0.8rem">Rules at your level: ' + rules.map(function (r) { return "<b>" + esc(r.text.replace(/!$/, "")) + "</b>"; }).join(" · ") + ".</p>" +
    "</div>";
  }
  function startCatch() {
    if (!window.CPCatch || !S.pet) return;
    catchOn = true;
    hush();
    render();
    var cv = $("#catch-canvas");
    if (!cv) { catchOn = false; return; }
    var pet = S.pet, lv = level();
    CPCatch.start(cv, {
      tier: tier(),
      sfx: sfx,
      draw: function (canvas, cx, scale) {
        P.draw(canvas, pet.species, pet.colour, { frame: "idle", level: lv, scale: scale, wear: pet.wear, cx: cx, keep: true });
      },
      onEnd: endCatch
    });
    sfx("pop");
    narrate([spoken(CPCatch.state().rule.text), "g-catch-go"]);
  }
  function stopCatch() {
    if (window.CPCatch) CPCatch.stop();
    catchOn = false;
  }
  function endCatch(res) {
    catchOn = false;
    if (!S.pet) return;
    var coins = Math.min(90, res.score * 3);
    earn(coins);
    giveXp(res.score);
    bump("catchGames");
    bestToday("catchScore", res.score);
    if (!S.catch) S.catch = { best: 0, games: 0 };
    S.catch.games++;
    var newBest = res.score > (S.catch.best || 0);
    if (newBest) {
      S.catch.best = res.score;
      diary("⭐", "New Sky Catch record: " + res.score + "! The rule was \"" + res.rule.text + "\"");
    }
    S.pet.happy = clamp(S.pet.happy + 6, 0, 100);
    checkTrophies();
    save();
    render();
    openSheet(sheet("⭐ " + (res.score >= 12 ? "Amazing!" : res.score >= 6 ? "Nice catching!" : "Time's up!"),
      '<p class="sub" style="text-align:center;font-size:1.3rem"><b>' + res.score + "</b> point" + (res.score === 1 ? "" : "s") +
        (newBest && res.score > 0 ? " — a new best! 🏆" : "") + "</p>" +
      '<div class="statgrid">' +
        '<div class="stat"><b>✅ ' + res.right + "</b><small>right ones caught</small></div>" +
        '<div class="stat"><b>❌ ' + res.wrong + "</b><small>wrong ones caught</small></div>" +
        '<div class="stat"><b>🪙 ' + coins + "</b><small>earned</small></div>" +
      "</div>" +
      '<p class="teach"><b>' + esc(res.rule.text) + "</b> " + esc(res.rule.why) + "</p>" +
      '<p style="margin:0.8rem 0 0"><button class="act" data-catchplay="1" style="--ac:#38b6ff;width:100%"><span class="em">🔁</span>Play again</button></p>'));
    sfx(res.score >= 6 ? "win" : "good");
    narrate(newBest && res.score > 0 ? ["g-catch-over", "g-new-best"] : ["g-catch-over"]);
    if (res.score >= 6) { try { window.Confetti && Confetti.burst({ count: 60 }); } catch (e) {} }
  }

  /* =========================================================
     ADOPTION
     ========================================================= */
  var pickSpecies = "blorb", pickColour = "berry", pickName = "";

  function adoptHtml() {
    var prof = D.profile(who);
    var t = S.tier || prof.tier;
    var little = (t === "tot" || t === "early");
    pickName = pickName || D.PET_NAMES[Math.floor(Math.random() * D.PET_NAMES.length)];

    var species = P.SPECIES.map(function (sp) {
      return '<button class="adopt' + (sp.id === pickSpecies ? " on" : "") + '" data-sp="' + sp.id + '">' +
        '<img alt="' + esc(sp.name) + '" src="' + P.chip(sp.id, pickColour, 80) + '">' +
        "<b>" + esc(sp.name) + "</b></button>";
    }).join("");

    var sw = P.COLOURS.filter(function (c) { return c.free; }).map(function (c) {
      return '<button class="sw' + (c.id === pickColour ? " on" : "") + '" data-col="' + c.id +
             '" title="' + esc(c.name) + '" aria-label="' + esc(c.name) + '" style="background:' + c.swatch + '"></button>';
    }).join("");

    var nameBit = little
      ? '<div class="swatches" id="name-picks">' +
          D.PET_NAMES.slice(0, 12).map(function (n) {
            return '<button class="ghost small" data-name="' + esc(n) + '">' + esc(n) + "</button>";
          }).join("") +
        "</div>"
      : '<div class="name-row">' +
          '<input id="pet-name" maxlength="14" value="' + esc(pickName) + '" aria-label="Name your Craepet">' +
          '<button class="ghost" id="dice">🎲</button>' +
        "</div>";

    return '<div class="panel">' +
      "<h2>Welcome to the valley, " + esc(prof.name) + "! 🥚</h2>" +
      '<p class="sub">' + esc(prof.hello) + " Pick a creature, pick a color, give it a name — then everything you teach it turns into coins.</p>" +
      '<div class="adopt-grid" id="species">' + species + "</div>" +
      '<p class="sub" style="margin:0.6rem 0 0" id="species-note">' + esc(P.species(pickSpecies).blurb) + " " +
        personalityLine(P.species(pickSpecies)) + "</p>" +
      '<p class="sub" style="margin:0.8rem 0 0.4rem">Choose a color</p>' +
      '<div class="swatches" id="colours">' + sw + "</div>" +
      '<p class="sub" style="margin:0.9rem 0 0.4rem">' + (little ? "Tap a name" : "Name your Craepet") + "</p>" +
      nameBit +
      '<p style="margin:1rem 0 0"><button class="act" id="do-adopt" style="--ac:var(--green);width:100%">' +
        '<span class="em">🥚</span>Adopt ' + esc(pickName) + "</button></p>" +
    "</div>" + levelPickerHtml();
  }

  function adopt(name) {
    S.pet = {
      species: pickSpecies, colour: pickColour, name: name,
      born: Date.now(), hunger: 80, happy: 85, energy: 95, clean: 90, xp: 0,
      wear: { head: null, face: null, neck: null }
    };
    S.lastTick = Date.now();
    S.pet.egg = { need: EGG_NEED, got: 0, taps: 0 };
    addItem("strawberry", 3);
    addItem("soap", 1);
    rollDay();
    diary("🥚", D.profile(who).name + " chose a " + P.colour(pickColour).name + " egg and called it " + name + " already. Something is moving inside…");
    checkTrophies();
    save();
    view = "nest";
    render();
    sfx("win");
    try { window.Confetti && Confetti.burst({ count: 60 }); } catch (e) {}
    say("*wobble*", 3000);
    narrate(["egg-hello"]);
  }

  function levelPickerHtml() {
    var t = tier();
    return '<div class="panel">' +
      "<h2>⚙️ Learning level</h2>" +
      '<p class="sub">Every question in the valley is asked at this level. Change it any time — the pet does not mind.</p>' +
      '<div class="settings-row">' + D.TIERS.map(function (x) {
        return '<button class="ghost' + (x.id === t ? " on" : "") + '" data-tier="' + x.id + '">' +
               esc(x.name) + "</button>";
      }).join("") + "</div>" +
      '<p class="sub" style="margin:0.5rem 0 0;text-align:center">' +
        esc((D.TIERS.filter(function (x) { return x.id === t; })[0] || D.TIERS[2]).note) + "</p>" +
      heatLine() +
      (canTalk
        ? '<p class="sub" style="margin:0.6rem 0 0;text-align:center">' +
          (voiceWanted() ? "🔊 Questions are being read aloud" : "🔇 Questions are not read aloud") +
          (hasClips ? " in the storyteller's voice" : "") +
          " — tap the speaker in the coin bar to change it. On a keyboard, " +
          "<b>1</b>–<b>4</b> pick an answer and <b>Enter</b> moves on.</p>"
        : "") +
    "</div>";
  }

  /* =========================================================
     THE THREE LEARNING PLACES — Farm (maths), Well (words),
     Pool (the wide world). Same question card, different
     harvest, so each place feels like somewhere you go.
     ========================================================= */
  var PLACE_INFO = {
    farm: { subject: "math", title: "🍓 Berry Farm", base: 6,
      sub: "Every sum you get right ripens a berry. Fill the patch and the whole harvest comes home.",
      crops: ["🍓", "🫐", "🍎", "🥕", "🍋"], empty: "🌱",
      full: "🧺 Full basket!" },
    well: { subject: "word", title: "📖 Word Well", base: 7,
      sub: "The old well pays for words. Answer, and coins come up in the bucket.",
      crops: ["🪙"], empty: "·",
      full: "🪣 The bucket comes up brimming!" },
    pool: { subject: "wonder", title: "🌈 Rainbow Pool", base: 5,
      sub: "The pool knows things. Answer enough and it bubbles up a paint brush of its own.",
      crops: ["🔴", "🟠", "🟡", "🟢", "🔵", "🟣"], empty: "💧",
      full: "🌊 A whole wave of color!" }
  };
  var SLOTS = 8;

  /* =========================================================
     THE PEOPLE OF THE VALLEY — somebody runs every place.
     A named Craepet behind every counter, with something to say
     that changes through the day. It is what turns "the maths
     screen" into "Farmer Fen's place".
     ========================================================= */
  var NPCS = {
    farm:   { name: "Farmer Fen", species: "snorbit", colour: "meadow", lines: [
      "Berries are ripe! Every sum you get right, I'll pick you one.", "Mind the bees — they're friendly, mostly.",
      "My Snorbits eat me out of carrots. Yours too?", "A full basket is worth a bonus. Don't stop at seven!" ] },
    well:   { name: "Old Mossbeard", species: "twiggle", colour: "cocoa", lines: [
      "Every word you know is a coin in the bucket, young one.", "I have read every book in this valley twice. Mossy read them once.",
      "Words are the oldest magic there is.", "Drop a word down the well and listen for the splash." ] },
    pool:   { name: "Splish", species: "puddlepop", colour: "sky", lines: [
      "The pool knows EVERYTHING. Ask it about the sea, the stars, the sky!", "Fifteen right and I'll bubble you up a brand new colour.",
      "Wet feet are happy feet.", "I washed up a bar of soap this morning. Somebody will want it." ] },
    market: { name: "Mrs Marigold", species: "blorb", colour: "sunbeam", lines: [
      "Fresh stock every morning, dear, and nobody's shelf is the same as anybody else's.", "Work out your change and I'll tip you for it.",
      "A hat, a petpet, a bar of soap — something for everyone.", "The bank next door pays interest, you know. Three per cent!" ] },
    bank:   { name: "Mr Pennyworth", species: "flarn", colour: "gold", lines: [
      "Money that sits in the bank makes more money. That is the whole secret.", "Three per cent a night, compounded. Ask me what compounded means.",
      "Nothing in my vault can be spent by accident. That is the point of a vault.", "A hundred in tonight is a hundred and three tomorrow." ] },
    arena:  { name: "Referee Rook", species: "zibbit", colour: "grape", lines: [
      "Right answers hit. Wrong answers get hit. Simple.", "Three in a row and you're charged. Fourth one's a critical.",
      "The tower goes up for ever. So does The Shade's temper.", "Bring a friend. A family Craepet lands its own hits." ] },
    games:  { name: "Dizzy", species: "glimmr", colour: "bubble", lines: [
      "Quick fingers AND a quick mind — that's my games room!", "Sky Catch is all about the rule. Read it first, then run.",
      "Memory Match: every pair you keep is something you know.", "Best scores go on the wall. Beat your own!" ] },
    quests: { name: "Postmaster Quill", species: "glimmr", colour: "snow", lines: [
      "Three quests a day, same three for the whole family. Race them.", "The wheel is eight slices, all the same size. One in eight, every time.",
      "Your gift grows every day you come back. Don't break the streak!", "Random events? Oh, they happen on the paths. Keep walking." ] }
  };
  /* The lines live in lines.js (so they are recorded); these are the
     fallback if the script is missing. */
  function npcLine(id, npc) {
    var lines = (L && L.NPC && L.NPC[id]) || npc.lines;
    var n = ((S.today.correct || 0) + (S.today.buy || 0) + D.dayNumber()) % lines.length;
    return lines[n];
  }
  function npcHtml(id) {
    var npc = NPCS[id];
    if (!npc) return "";
    var line = npcLine(id, npc);
    return '<div class="npc"><img alt="" src="' + P.chip(npc.species, npc.colour, 48) + '">' +
      '<div class="npcsay"><b>' + esc(npc.name) + '</b> <small>· a ' + esc(P.colour(npc.colour).name) + " " + esc(P.species(npc.species).name) + "</small>" +
      '<i>“' + esc(line) + '”</i></div>' +
      '<button class="mini" data-say-text="' + esc(line) + '" aria-label="Hear ' + esc(npc.name) + '">🔊</button></div>';
  }

  /* =========================================================
     THE WEATHER — different every day, the same for everyone.
     Seeded by the day, so the whole family sees the same rain.
     Rain streaks the window and the outdoor places, snow falls,
     wind blows leaves, and now and then there is a rainbow. One
     place pays a coin more in each kind of weather, so a child
     who reads the sky has a reason to.
     ========================================================= */
  var WEATHERS = [
    { id: "sunny",   emoji: "☀️", name: "Sunny",   w: 5, place: "farm", line: "Lovely sunshine. The berries love it." },
    { id: "cloudy",  emoji: "☁️", name: "Cloudy",  w: 3, place: "well", line: "Grey and quiet. A good day for words." },
    { id: "rainy",   emoji: "🌧️", name: "Rainy",   w: 3, place: "pool", line: "Rain! The pool is brimming." },
    { id: "windy",   emoji: "🍃", name: "Windy",   w: 2, place: "games", line: "Blowy! Hold on to your hat." },
    { id: "snowy",   emoji: "❄️", name: "Snowy",   w: 1, place: "well", line: "Snow! Everything is soft and white." },
    { id: "rainbow", emoji: "🌈", name: "Rainbow", w: 1, place: "pool", line: "A rainbow, right over the valley!" }
  ];
  var weatherOverride = null;     // the play-test robot picks the weather
  function weatherToday() {
    if (weatherOverride) for (var k = 0; k < WEATHERS.length; k++) if (WEATHERS[k].id === weatherOverride) return WEATHERS[k];
    // Christmas is white, whatever the dice say
    if (CAL && CAL.holidays().some(function (h) { return h.id === "xmas"; })) return WEATHERS[4];
    var seed = D.dayNumber() * 7919 + 3;
    var s = seed % 2147483647; if (s <= 0) s += 2147483646;
    s = (s * 16807) % 2147483647;
    var r = (s - 1) / 2147483646;
    // the season decides the odds: snow in winter, sun in summer, wind in autumn
    var sw = (CAL && CAL.season().weather) || null;
    var weight = function (w) { return sw && sw[w.id] !== undefined ? sw[w.id] : w.w; };
    var total = 0; WEATHERS.forEach(function (w) { total += weight(w); });
    var x = r * total;
    for (var i = 0; i < WEATHERS.length; i++) { x -= weight(WEATHERS[i]); if (x <= 0 && weight(WEATHERS[i]) > 0) return WEATHERS[i]; }
    return WEATHERS[0];
  }

  /* =========================================================
     THE CALENDAR — seasons, holidays and hatch-days (calendar.js).
     The season changes what grows and what the weather does;
     a holiday hangs a garland over the scene, pays a bonus on
     every right answer and leaves a present to open; and every
     Craepet gets a party on its hatch-day.
     ========================================================= */
  var CAL = window.CPCal || null;
  var HOLIDAY_BONUS = 2;
  function seasonNow() { return CAL ? CAL.season() : null; }
  function holidayNow() { return CAL ? CAL.holidayToday() : null; }
  function cropsNow() {
    var s = seasonNow();
    return (s && s.crops) || PLACE_INFO.farm.crops;
  }
  function seasonHtml(where) {
    var s = seasonNow();
    if (!s || s.id === "summer" && where === "win") return "";
    return '<span class="sea sea-' + s.id + '" aria-hidden="true"></span>';
  }
  /* Whose birthday it is today (the player's own first). */
  function birthdaysToday() {
    if (!CAL) return [];
    var list = CAL.birthdayToday();
    return list.filter(function (p) { return p === who; }).concat(list.filter(function (p) { return p !== who; }));
  }
  function myBirthday() { return birthdaysToday().indexOf(who) !== -1; }
  function garlandHtml() {
    if (!CAL) return "";
    var hs = CAL.holidays();
    var g = hs.length ? (hs[0].garland || []) : birthdaysToday().length ? ["🎂", "🎈", "🎉", "🎁"] : [];
    if (!g.length) return "";
    var reps = [];
    for (var i = 0; i < 8; i++) reps.push(g[i % g.length]);
    return '<span class="garland" aria-hidden="true">' + reps.map(function (e) { return "<span>" + e + "</span>"; }).join("") + "</span>";
  }
  /* Everything there is to celebrate today, each with a present to
     claim once: the holiday, this Craepet's hatch-day or month-day, a
     family birthday. `key` is what the save remembers. */
  function celebrations() {
    if (!CAL || !S.pet) return [];
    var d = CAL.today(), y = d.getFullYear(), out = [];
    var h = holidayNow();
    if (h && h.gift) {
      out.push({ key: "hol:" + h.id + ":" + y, kind: "holiday", id: h.id, emoji: h.emoji, name: h.name, line: h.line,
                 tok: "hol-" + h.id, gift: h.gift });
    }
    var years = CAL.hatchdayYears(S.pet.born, d);
    if (years) {
      out.push({ key: "hatch:" + years, kind: "hatchday", emoji: "🎂", name: S.pet.name + "'s hatch-day", tok: "hol-hatchday",
                 line: S.pet.name + " is " + years + (years === 1 ? " year" : " years") + " old today!",
                 gift: { coins: 50 + years * 10, item: "cake", wear: "partyhat" } });
    }
    var months = CAL.monthsOld(S.pet.born, d);
    if (months) {
      out.push({ key: "months:" + months, kind: "months", emoji: "🧁", name: months + (months === 1 ? " month" : " months") + " old", tok: "hol-months",
                 line: S.pet.name + " is " + months + (months === 1 ? " month" : " months") + " old today. Look how big!",
                 gift: { coins: 15 + months * 2, item: "birthdaypie" } });
    }
    birthdaysToday().forEach(function (pid) {
      var p = D.profile(pid);
      out.push({ key: "bday:" + pid + ":" + y, kind: "birthday", emoji: "🎂", name: (pid === who ? "your" : p.name + "'s") + " birthday", tok: "hol-birthday",
                 line: pid === who
                   ? "Happy birthday, " + p.name + "! It's YOUR day — every right answer pays +" + HOLIDAY_BONUS + " 🪙."
                   : "Happy birthday, " + p.name + " " + p.emoji + "! Post " + (pid === "shannon" ? "her" : "them") + " a present!",
                 gift: { coins: pid === who ? 80 : 30, item: "cake", wear: pid === who ? "partyhat" : null } });
    });
    return out;
  }
  function claimed(key) { return !!(S.parties && S.parties[key]); }
  function claimParty(key) {
    var c = null;
    celebrations().forEach(function (x) { if (x.key === key) c = x; });
    if (!c || claimed(key)) return;
    if (!S.parties) S.parties = {};
    S.parties[key] = true;
    var g = c.gift, got = [];
    if (g.coins) { earn(g.coins); got.push("🪙 " + g.coins); }
    if (g.item && D.itemById(g.item)) { addItem(g.item); got.push(D.itemById(g.item).emoji + " " + D.itemById(g.item).name); }
    if (g.wear && P.wearById(g.wear)) {
      if (S.wardrobe.indexOf(g.wear) === -1) { S.wardrobe.push(g.wear); got.push(P.wearById(g.wear).emoji + " " + P.wearById(g.wear).name + " (to wear!)"); }
      if (!S.pet.egg) { S.pet.wear = S.pet.wear || {}; S.pet.wear.head = g.wear; S.everDressed = true; }
    }
    if (c.kind === "holiday") bump("parties");
    if (c.kind === "hatchday") S.everHatchday = true;
    diary(c.emoji, c.name.charAt(0).toUpperCase() + c.name.slice(1) + "! " + c.line + " We got " + got.join(", ") + ".");
    checkTrophies();
    save();
    render();
    hop();
    hearts();
    sfx("win");
    try { window.Confetti && Confetti.burst({ count: 140 }); } catch (e) {}
    openSheet(sheet(c.emoji + " " + esc(c.name.charAt(0).toUpperCase() + c.name.slice(1)) + "!",
      '<p class="sub" style="text-align:center;font-size:1.05rem">' + esc(c.line) + "</p>" +
      '<p class="teach" style="text-align:center"><b>Inside the present:</b> ' + esc(got.join(" · ")) + "</p>" +
      (g.wear && !S.pet.egg ? '<p class="sub" style="text-align:center">' + esc(S.pet.name) + " is wearing the " + esc(P.wearById(g.wear).name) + " already.</p>" : "")));
    narrate([c.tok, "hol-present"]);
  }
  function partyHtml() {
    if (!CAL || !S.pet) return "";
    var cs = celebrations();
    var sleeps = CAL.sleepsTo("xmas");
    var spooky = CAL.holidays().some(function (h) { return h.id === "spooky"; });
    var soon = CAL.birthdaySoon();
    if (!cs.length && !(sleeps !== null && sleeps <= 24 && sleeps > 0) && !spooky && !soon) return "";
    var body = cs.map(function (c) {
      var done = claimed(c.key);
      return '<div class="quest' + (done ? " done" : "") + '"><div class="qtx"><b>' + c.emoji + " " + esc(c.name.charAt(0).toUpperCase() + c.name.slice(1)) + "</b><br>" + esc(c.line) + "</div>" +
        (done ? '<span class="rw">✅ opened</span>' : '<button class="act" data-claimparty="' + esc(c.key) + '" style="--ac:var(--pink);min-height:48px;padding:0.4rem 0.8rem"><span class="em">🎁</span>Open</button>') + "</div>";
    }).join("");
    if (sleeps !== null && sleeps <= 24 && sleeps > 0) {
      body += '<p class="sleeps">🎄 <b>' + sleeps + "</b> sleep" + (sleeps === 1 ? "" : "s") + " until Christmas" +
        (sleeps <= 7 ? " — nearly there!" : ".") + "</p>";
    }
    if (spooky) body += '<p class="sub" style="text-align:center">👻 Spooky Week: <b>' + CAL.sleepsTo("halloween") + " sleep" + (CAL.sleepsTo("halloween") === 1 ? "" : "s") + "</b> until Halloween.</p>";
    if (soon) {
      var names = soon.who.map(function (p) { return p === who ? "YOUR" : D.profile(p).name + "'s"; }).join(" and ");
      body += '<p class="sleeps">🎂 <b>' + soon.days + "</b> sleep" + (soon.days === 1 ? "" : "s") + " until " + esc(names) + " birthday" +
        (soon.who.indexOf(who) === -1 ? " — think about a present!" : "!") + "</p>";
    }
    var h = holidayNow();
    var bdays = birthdaysToday();
    var title = h ? "Happy " + (h.name.indexOf("the ") === 0 ? h.name.slice(4) : h.name) + "!"
      : bdays.length ? "Happy birthday, " + bdays.map(function (p) { return D.profile(p).name; }).join(" and ") + "!"
      : "Something to celebrate";
    return '<div class="panel party"><h2>🎉 ' + esc(title) + "</h2>" +
      (h ? '<p class="sub">Every right answer pays <b>+' + HOLIDAY_BONUS + " 🪙</b> today, and there is a present to open.</p>" : "") + body + "</div>";
  }
  function weatherHtml() {
    var w = weatherToday();
    return (w.id === "sunny") ? "" : '<span class="wx wx-' + w.id + '" aria-hidden="true"></span>';
  }
  var WEATHER_BONUS = 1;

  /* =========================================================
     THE REVIEW BASKET — the single biggest teaching change.
     A question you got wrong is not gone: it goes in the basket
     and comes back a few questions later, re-dealt so the answer
     is somewhere new. Get it right and it leaves the basket for
     good ("you fixed it"), which is what actually shifts a fact
     from "saw it once" to "know it".
     ========================================================= */
  /* =========================================================
     THE QUESTION TRACKER — has this one come up before?

     The game keeps a log of every question it has ever asked YOU.
     Two things run off it:

       · the asker deals candidate after candidate and stops at the
         first question you have never met, so the vault gets used
         properly instead of the same forty facts on a loop;
       · the card says so out loud — 🆕 for new ground, 👀 with a
         count for a repeat — because "have I done this one?" is a
         question children ask constantly, and guessing is horrible.

     Keys are HASHED before they go in the save. The full text of a
     thousand questions would not fit in localStorage; a thousand
     short fingerprints will.
     ========================================================= */
  var SEEN_MAX = 4000;

  /* =========================================================
     THE HEAT — adaptive difficulty, inside your level.

     Each subject has a rung from 1 to 5. Five right answers in a
     row in that subject turn it up; three misses out of the last
     four turn it down. The rung is handed to the question maker
     (so the sums really do get bigger), it multiplies the coins,
     and at the top two rungs some questions come from the level
     ABOVE — a "step up", paid extra. A child who has outgrown
     "3 + 4" is never stuck on it, and one who is struggling is
     never stranded on something too hard.
     ========================================================= */
  var HEAT = [
    { name: "Warm-up", emoji: "🌱", mult: 1 },
    { name: "Steady",  emoji: "🔥", mult: 1.2 },
    { name: "Tricky",  emoji: "🔥🔥", mult: 1.45 },
    { name: "Tough",   emoji: "🔥🔥🔥", mult: 1.75 },
    { name: "On fire", emoji: "🔥🔥🔥🔥", mult: 2.1 }
  ];
  function adaptOf(subject) {
    if (!S.adapt || typeof S.adapt !== "object") S.adapt = {};
    var a = S.adapt[subject];
    if (!a || typeof a !== "object") a = S.adapt[subject] = { rung: 1, hist: [], best: 1 };
    if (!Array.isArray(a.hist)) a.hist = [];
    a.rung = D.hot(a.rung);
    return a;
  }
  /* Nothing is ever hard at the Tiny level. */
  function rungOf(subject) { return tier() === "tot" ? 1 : adaptOf(subject).rung; }
  function heatOf(q) { return HEAT[D.hot(q && q.rung) - 1]; }
  /* What a right answer to this question is worth, as a multiplier. A
     step-up question pays half as much again on top of the heat. */
  function heatMult(q) {
    var m = heatOf(q).mult;
    return (q && q.step) ? Math.round(m * 1.5 * 100) / 100 : m;
  }
  function tierName(id) {
    for (var i = 0; i < D.TIERS.length; i++) if (D.TIERS[i].id === id) return D.TIERS[i].name;
    return id;
  }
  /* The whole adaptive rule, in one place. Returns "up", "down" or null. */
  function adaptAfter(subject, correct) {
    if (tier() === "tot" || !subject) return null;
    var a = adaptOf(subject);
    a.hist.push(correct ? 1 : 0);
    if (a.hist.length > 8) a.hist.shift();
    var last5 = a.hist.slice(-5), last4 = a.hist.slice(-4);
    var allRight = last5.length === 5 && last5.every(function (x) { return x === 1; });
    var misses = last4.filter(function (x) { return !x; }).length;
    if (allRight && a.rung < 5) {
      a.rung++;
      a.hist = [];
      if (a.rung > (a.best | 0)) a.best = a.rung;
      bump("heat");
      var h = HEAT[a.rung - 1];
      toast("🔥 Heating up! " + subjectName(subject) + " is now " + h.name + " — right answers pay ×" + h.mult + ".");
      return "up";
    }
    if (last4.length === 4 && misses >= 3 && a.rung > 1) {
      a.rung--;
      a.hist = [];
      toast("🧊 Easing off a little — " + subjectName(subject) + " is now " + HEAT[a.rung - 1].name + ".");
      return "down";
    }
    return null;
  }
  /* One line for the settings panel: where the heat stands right now. */
  function heatLine() {
    if (tier() === "tot") return "";
    var bits = ["math", "word", "wonder"].map(function (k) {
      var h = HEAT[rungOf(k) - 1];
      return subjectName(k) + " <b>" + h.name + "</b> ×" + h.mult;
    });
    return '<p class="sub" style="margin:0.6rem 0 0;text-align:center">🔥 <b>The heat:</b> five right in a row turns a subject up a rung ' +
      "(harder questions, more coins); three misses in four turns it down. Right now: " + bits.join(" · ") + ".</p>";
  }

  function qhash(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }
  function seenRow(key) {
    if (!key || !S.seen) return null;
    return S.seen[qhash(key)] || null;
  }
  /* How many times this player has met this exact question. This is the
     function handed to the asker, which is what makes it hunt. */
  function seenTimes(key) { var r = seenRow(key); return r ? r[0] : 0; }

  function keyOf(q) {
    return (q && q.key) || (D.qKey ? D.qKey(q) : reviewKey(q));
  }

  function markSeen(q, correct) {
    if (!q || !q.choices) return;
    if (!S.seen) S.seen = {};
    var key = keyOf(q);
    if (!key) return;
    var h = qhash(key), row = S.seen[h];
    if (row) { bump("repeatq"); } else { row = [0, 0]; bump("newq"); }
    row[0]++;
    if (correct) row[1]++;
    S.seen[h] = row;
    // localStorage is not infinite. If the log ever gets enormous, drop
    // the oldest slice — a question met once, months ago, is the
    // cheapest thing in here to forget.
    var keys = Object.keys(S.seen);
    if (keys.length > SEEN_MAX) {
      keys.slice(0, Math.floor(SEEN_MAX / 4)).forEach(function (k) { delete S.seen[k]; });
    }
  }
  function seenCount() { return S.seen ? Object.keys(S.seen).length : 0; }

  var REVIEW_MAX = 40;
  var reviewGap = 0;              // questions still to go before a re-ask

  function reviewKey(q) {
    var right = q.choices[q.answer] || {};
    return q.subject + "|" + q.q + "|" + (right.t || right.emoji || "");
  }

  function remember(q) {
    if (!q || tier() === "tot") return;               // nothing is "wrong" for a toddler
    var key = reviewKey(q);
    for (var i = 0; i < S.review.length; i++) {
      if (S.review[i].key === key) { S.review[i].misses++; return; }
    }
    var copy = null;
    try { copy = JSON.parse(JSON.stringify(q)); } catch (e) { return; }
    delete copy.fromReview;
    S.review.push({ key: key, tier: tier(), subject: q.subject, misses: 1, q: copy });
    while (S.review.length > REVIEW_MAX) S.review.shift();
    // Not on the very next question: the answer is still on screen, and
    // parroting it back a second later isn't remembering, it's copying.
    if (reviewGap < 2) reviewGap = 2;
  }

  function forget(key) {
    for (var i = 0; i < S.review.length; i++) {
      if (S.review[i].key === key) { S.review.splice(i, 1); return true; }
    }
    return false;
  }

  /* A question due for a second look, or null. Only ever offers one
     asked at the level you are playing now. */
  function dueReview(subject) {
    if (reviewGap > 0 || !S.review.length) return null;
    var t = tier();
    var pool = S.review.filter(function (r) {
      return r.tier === t && (!subject || r.subject === subject);
    });
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function startSession(place) {
    sess = { place: place, right: 0, wrong: 0, plots: S.harvest[place] || [], q: null, state: "ask" };
    S.harvest[place] = sess.plots;
    nextQuestion();
  }

  function nextQuestion() {
    var info = PLACE_INFO[sess.place];
    sess.q = pickQuestion(info.subject);
    sess.state = "ask";
    sess.chose = -1;
    sess.misses = 0;
    announce(sess.q);
  }

  /* One door for every question in the valley: roughly two in five come
     out of the review basket when there is anything in it. */
  function pickQuestion(subject) {
    var again = Math.random() < 0.4 ? dueReview(subject) : null;
    if (again) {
      var q = D.reshuffle(again.q);
      q.fromReview = again.key;
      // a second look pays at today's heat, not the heat it was first asked at
      q.rung = rungOf(q.subject || subject);
      q.step = 0;
      reviewGap = 3;
      return q;
    }
    if (reviewGap > 0) reviewGap--;
    var fresh = D.ask(subject, tier(), seenTimes, rungOf(subject));
    if (fresh) {
      // Snapshot the log now: by the time the card is drawn the answer
      // has been counted, and "you have seen this once" would be a lie
      // told about this very moment.
      var row = seenRow(keyOf(fresh));
      fresh.seen = row ? row[0] : 0;
      fresh.seenRight = row ? row[1] : 0;
    }
    return fresh;
  }

  /* Read the question out for the players who can't read it yet. */
  function announce(q) {
    if (!q) return;
    // The little levels' questions come with their recordings named.
    if (q.say && q.say.length) return narrate(q.say);
    var extra = "";
    // A sum or a letter reads fine out loud; a gapped word ("C_T") does
    // not, and it is the thing the child is supposed to LOOK at anyway.
    if (q.big && q.big.text && q.big.text.indexOf("_") === -1) extra = ". " + q.big.text;
    narrate([q.q + extra]);
  }

  function placeHtml(place) {
    if (!sess || sess.place !== place) startSession(place);
    var info = PLACE_INFO[place];

    // All three places share one satisfying loop: answer, fill a slot,
    // cash the row in. Only the thing you are filling it with changes.
    var cells = [];
    for (var i = 0; i < SLOTS; i++) {
      cells.push('<div class="plot ' + place + (i < sess.plots.length ? " full" : "") + '">' +
                 (i < sess.plots.length ? sess.plots[i] : info.empty) + "</div>");
    }
    var basket = '<div class="plots" aria-label="' + sess.plots.length + " of " + SLOTS +
                 ' filled" role="img">' + cells.join("") + "</div>";

    var extra = "";
    if (place === "pool") {
      var toBrush = 15 - (S.stats.pool % 15);
      extra = '<p class="sub" style="margin:-0.35rem 0 0.6rem">🖌️ ' + toBrush +
              " more right answers and the pool gives you a free paint brush.</p>";
    }
    if (place === favPlace()) {
      extra += '<p class="sub" style="margin:-0.35rem 0 0.6rem">💛 ' + esc(spec().name) + "s love the " + info.title.replace(/^\S+\s/, "") +
        ": <b>+" + FAV_BONUS + " 🪙</b> on every right answer here.</p>";
    }
    var wxNow = weatherToday();
    if (wxNow.place === place) {
      extra += '<p class="sub" style="margin:-0.35rem 0 0.6rem">' + wxNow.emoji + " <b>" + esc(wxNow.name) + " today</b> — " +
        esc(wxNow.line) + " <b>+" + WEATHER_BONUS + " 🪙</b> on every right answer here.</p>";
    }
    var holNow = holidayNow();
    if (holNow) {
      extra += '<p class="sub" style="margin:-0.35rem 0 0.6rem">' + holNow.emoji + " <b>" + esc(holNow.name.charAt(0).toUpperCase() + holNow.name.slice(1)) +
        "</b> — <b>+" + HOLIDAY_BONUS + " 🪙</b> on every right answer, everywhere, today.</p>";
    } else if (myBirthday()) {
      extra += '<p class="sub" style="margin:-0.35rem 0 0.6rem">🎂 <b>It\'s your birthday!</b> <b>+' + HOLIDAY_BONUS + " 🪙</b> on every right answer, everywhere, today.</p>";
    }
    if (tier() !== "tot") {
      var a = adaptOf(info.subject), h = HEAT[a.rung - 1];
      var run = a.hist.length ? a.hist.slice(-5).filter(function (x) { return x; }).length : 0;
      extra += '<p class="sub heatline" style="margin:-0.2rem 0 0.6rem">' + h.emoji + " <b>" + h.name + "</b> — right answers pay ×" + h.mult +
        (a.rung < 5 ? ". " + (a.hist.length && run < 5 ? (5 - run) + " more in a row" : "5 in a row") + " and the heat goes up." : ". That is as hot as it gets!") + "</p>";
    }

    return '<div class="panel">' +
      "<h2>" + info.title + "</h2>" +
      '<p class="sub">' + info.sub + "</p>" + npcHtml(place) +
      basket + extra +
      quizHtml(sess) +
    "</div>";
  }

  /* ---------- the shared question card ---------- */
  function quizHtml(q) {
    var Q = q.q;
    if (!Q) return "";
    var big = "";
    if (Q.big) {
      if (Q.big.colour) big = '<div class="qbig swatch" style="background:' + Q.big.colour + '"></div>';
      else if (Q.big.emoji) big = '<div class="qbig">' + Q.big.emoji + "</div>";
      else if (Q.big.text) big = '<div class="qbig">' + esc(Q.big.text) + "</div>";
    }
    var longest = 0;
    Q.choices.forEach(function (c) { longest = Math.max(longest, (c.t || "").length); });
    var oneCol = longest > 22;

    var buttons = Q.choices.map(function (c, i) {
      var inner = "";
      if (c.colour) inner = '<span class="paint" style="background:' + c.colour + '"></span>';
      if (c.emoji) inner += '<span class="pic">' + c.emoji + "</span>";
      if (c.t) inner += "<span" + (c.huge ? ' class="huge"' : "") + ">" + esc(c.t) + "</span>";
      var mark = "";
      if (q.state === "done") {
        if (i === Q.answer) mark = " right";
        else if (i === q.chose) mark = " wrong";
      }
      // A choice made only of a picture still needs a name for a screen
      // reader — and the number key that picks it.
      var lab = (c.t || "") || (c.colour ? "this color" : "") || (c.emoji ? c.emoji : "choice " + (i + 1));
      return '<button class="choice' + mark + '" data-pick="' + i + '"' +
             ' aria-label="' + esc((i + 1) + ". " + lab) + '"' +
             (q.state === "done" ? " disabled" : "") + ">" +
             '<span class="keycap" aria-hidden="true">' + (i + 1) + "</span>" + inner + "</button>";
    }).join("");

    var streakLine = S.stats.streak > 1 ? "🔥 " + S.stats.streak + " in a row" : "";

    // Have you done this one before? Say so, plainly, every single time.
    var badge = "";
    if (Q.fromReview) {
      badge = '<p class="second-look">🔁 Second look — you missed this one before</p>';
    } else if (Q.seen > 0) {
      var times = Q.seen === 1 ? "once before" : Q.seen + " times before";
      var got = Q.seenRight
        ? " — you got it right " + (Q.seenRight === 1 ? "that time" : Q.seenRight + " of those times")
        : " — you have not got it right yet";
      badge = '<p class="second-look seen-before">👀 You have seen this ' + times + got + "</p>";
    } else if (Q.seen === 0) {
      badge = '<p class="second-look brand-new">🆕 Brand new — you have never been asked this one</p>';
    }
    // …and how hot it is. A step-up question says where it came from.
    if (tier() !== "tot" && Q.rung) {
      if (Q.step) {
        badge += '<p class="second-look step-up">⬆️ Step up — a ' + esc(tierName(Q.tier)) + " question, pays ×" + heatMult(Q) + "</p>";
      } else if (Q.rung > 1) {
        badge += '<p class="second-look heat-chip">' + heatOf(Q).emoji + " " + esc(heatOf(Q).name) + " · pays ×" + heatMult(Q) + "</p>";
      }
    }

    var after = "";
    if (q.state === "done") {
      var right = Q.choices[Q.answer];
      var rightLabel = right.t || right.emoji || "that one";
      var head, mine = "";
      if (q.correct) {
        head = Q.fromReview ? "Fixed it! 🔁 " : (Q.step ? "Yes — a step up! ⬆️ " : "Yes! ");
      } else {
        head = (q.chose < 0 ? "Too slow! " : "") + "The answer is " + esc(rightLabel) + ". ";
        // Naming the choice the child actually made turns "nope" into a
        // comparison, which is the bit that teaches.
        var chosen = Q.choices[q.chose];
        var chosenLabel = chosen && (chosen.t || chosen.emoji);
        if (chosenLabel) mine = " <i>You picked " + esc(chosenLabel) + ".</i>";
      }
      after = '<p class="teach" role="status"><b>' + head + "</b>" + esc(Q.teach) + mine + "</p>" +
              '<p style="margin:0.7rem 0 0"><button class="act" data-next="1" style="--ac:var(--purple);width:100%">' +
              (q.correct ? "Keep going →" : "Try another →") + "</button></p>";
    }
    if (q.state === "done" && q.over) {
      // the duel prints its own "back to the arena" button underneath,
      // so keep the explanation and drop the "keep going" one
      var cut = after.indexOf('<p style="margin:0.7rem 0 0">');
      if (cut > 0) after = after.slice(0, cut);
    }

    return '<div class="qcard">' + badge +
      '<p class="qprompt">' + esc(Q.q) + "</p>" + big +
      '<p class="streak">' + streakLine + "</p>" +
      '<div class="choices' + (oneCol ? " one-col" : "") + '" role="group" aria-label="Answers">' +
        buttons + "</div>" +
      after +
    "</div>";
  }

  /* ---------- grading ---------- */
  function answer(idx) {
    var holder = battle ? battle : sess;
    if (!holder || !holder.q || holder.state === "done") return;
    var Q = holder.q;
    var correct = idx === Q.answer;

    // At the Tiny level nothing is ever wrong — a miss just waits.
    // After two misses the right answer starts to glow, so a toddler is
    // never stuck tapping the same wrong square forever.
    if (!correct && tier() === "tot") {
      sfx("nope");
      var btn = document.querySelector('[data-pick="' + idx + '"]');
      if (btn) { btn.classList.add("wrong"); setTimeout(function () { btn.classList.remove("wrong"); }, 400); }
      holder.misses = (holder.misses || 0) + 1;
      if (holder.misses >= 2) {
        var hint = document.querySelector('[data-pick="' + Q.answer + '"]');
        if (hint) hint.classList.add("hint");
        say("This one!", 2200);
        narrate(["p-try-this"]);
      }
      return;
    }

    // a quick answer in a duel hits harder (big kids and up)
    var quick = !!(battle && !battle.over && battle.askedAt && idx >= 0 &&
                   (Date.now() - battle.askedAt) <= QUICK_MS);
    holder.chose = idx;
    holder.correct = correct;
    holder.state = "done";
    holder.misses = 0;
    markSeen(Q, correct);

    // Everything the narrator will say about this answer, in order: the
    // verdict, then (in a duel) the blow, then the lesson, then the rest.
    var told = [], head = 0;
    if (correct) {
      S.stats.streak++;
      if (S.stats.streak > S.stats.best) S.stats.best = S.stats.streak;
      bestToday("bestStreak", S.stats.streak);
      eggProgress();
      bump("correct");
      var subj = Q.subject;
      S.stats.bySubject[subj] = (S.stats.bySubject[subj] || 0) + 1;
      if (Q.step) bump("stepup");
      told.push(praiseToken());
      // Getting it right takes it out of the basket — whether it came
      // BACK from the basket or just happened to turn up again.
      if (forget(Q.fromReview || reviewKey(Q))) {
        S.stats.fixed = (S.stats.fixed || 0) + 1;
        bump("fixed");
        toast("🔁 Fixed it! That one is out of your review basket.");
        earn(5);
        told.push("p-fixed");
      }
      head = told.length;
      sfx(S.stats.streak >= 3 ? "streak" : "good", S.stats.streak);
    } else {
      S.stats.wrong++;
      S.stats.streak = 0;
      remember(Q);
      sfx("nope");
      told.push("frag-the-answer-is", answerToken(Q));
      head = told.length;
    }
    // Say the explanation out loud too — for a pre-reader the teaching
    // line is the only part that is worth anything.
    told = told.concat(Q.sayTeach && Q.sayTeach.length ? Q.sayTeach : [Q.teach]);
    var heatEvent = adaptAfter(Q.subject, correct);
    if (heatEvent === "up") told.push("p-heating-up");
    if (heatEvent === "down") told.push("p-cooling-off");

    if (battle) {
      battleTurn(correct, { quick: quick });
      // the duel's own calls: a critical, a charge, the friend, The Shade
      told = told.slice(0, head).concat(battle.calls || [], told.slice(head), battle.after || []);
    } else {
      harvest(correct);
    }

    checkTrophies();
    save();
    render();
    narrate(told);
  }

  /* What the place pays out for a right answer. */
  function harvest(correct) {
    var info = PLACE_INFO[sess.place];
    if (!correct) { sess.wrong++; return; }
    sess.right++;
    bump(sess.place);
    // "learn something in all three places" needs a count of the places
    // that have seen work today, not another counter to keep in step.
    S.today.subjects = ["farm", "well", "pool"].filter(function (p) { return (S.today[p] || 0) > 0; }).length;

    // The heat multiplies the coins: a harder question is worth more.
    var mult = heatMult(sess.q);
    var coins = Math.round((info.base + Math.min(6, S.stats.streak) + Math.floor(level() / 3)) * mult);
    // …and a Snorbit at the Farm, a Blorb at the Pool: the favourite place pays extra
    var fav = sess.place === favPlace();
    if (fav) coins += FAV_BONUS;
    var wx = weatherToday().place === sess.place;
    if (wx) coins += WEATHER_BONUS;
    var hol = holidayNow();
    if (hol || myBirthday()) coins += HOLIDAY_BONUS;
    earn(coins);
    // A book shelf, a globe and a star window really do make you learn
    // faster — and so does a hotter question.
    giveXp(Math.round((3 + D.hot(sess.q && sess.q.rung)) * (1 + studyBonus())));
    floaty("+" + coins + " 🪙" + (mult > 1 ? " ×" + mult : "") + (fav ? " 💛" : "") + (wx ? " " + weatherToday().emoji : "") + (hol ? " " + hol.emoji : ""), "#ffe07a");

    if (sess.plots.length < SLOTS) {
      var crops = sess.place === "farm" ? cropsNow() : info.crops;
      sess.plots.push(crops[Math.floor(Math.random() * crops.length)]);
    }
    checkWish("place", sess.place);

    // each place also turns up something of its own now and then
    if (sess.place === "farm" && Math.random() < 0.4) {
      var food = D.FOODS[Math.floor(Math.random() * 6)];
      addItem(food.id);
      toast("Picked " + food.emoji + " " + food.name + "!");
    } else if (sess.place === "well" && Math.random() < 0.12) {
      var book = D.BOOKS[Math.floor(Math.random() * D.BOOKS.length)];
      addItem(book.id);
      toast("The bucket brought up " + book.emoji + " " + book.name + "!");
    } else if (sess.place === "pool") {
      // The Farm feeds you and the Well reads to you; the Pool is the only
      // water in the valley, so it is where the soap comes from. Without
      // this, washing was the one need with no way to meet it but coins.
      if (S.stats.pool % 15 === 0) grantBrush();
      else if (Math.random() < 0.2) {
        var wash = D.CARE.filter(function (c) { return c.clean && c.cost <= 18; });
        var bar = wash[Math.floor(Math.random() * wash.length)];
        addItem(bar.id);
        toast("The pool washed up " + bar.emoji + " " + bar.name + "!");
      }
    }

    if (sess.plots.length >= SLOTS) {
      var bonus = 25 + level() * 3;
      earn(bonus);
      sess.plots.length = 0;                       // same array — the save holds it
      toast(info.full + " +" + bonus + " 🪙");
      sfx("win");
      try { window.Confetti && Confetti.burst({ count: 60 }); } catch (e) {}
    }
  }

  function grantBrush() {
    var locked = P.COLOURS.filter(function (c) { return S.colours.indexOf(c.id) === -1; });
    if (!locked.length) { earn(80); toast("Every color is yours already — have 80 🪙 instead!"); return; }
    var c = locked[Math.floor(Math.random() * locked.length)];
    S.colours.push(c.id);
    toast("🖌️ The pool bubbled up a " + c.name + " brush!");
    sfx("win");
    try { window.Confetti && Confetti.burst({ count: 70 }); } catch (e) {}
  }

  /* =========================================================
     THE NEST — feeding, playing, washing, resting.
     ========================================================= */
  /* The mood line should not reshuffle every time a bar ticks — it made
     the nest feel jittery. It changes when the MOOD changes. */
  var moodLine = { m: null, text: "" };
  function nestLine() {
    var m = mood();
    if (moodLine.m !== m) {
      moodLine.m = m;
      moodLine.text = D.MOODS[m][Math.floor(Math.random() * D.MOODS[m].length)];
    }
    return moodLine.text;
  }
  /* One of the pet's lines for its mood, with the recording's name. */
  function moodSay() {
    if (S.pet && S.pet.egg) return { text: "*wobble*", tok: null };
    var m = mood(), i = Math.floor(Math.random() * D.MOODS[m].length);
    // now and then, something about the day itself: the hour, the
    // weather, the petpet — the things a pet would actually notice
    if (Math.random() < 0.35 && m !== "tired") {
      var extra = [];
      var tod = timeOfDay(), wx = weatherToday();
      if (tod === "night") extra.push("Yawn… is it bedtime soon?", "Look at all the stars!");
      if (tod === "dawn") extra.push("Good morning! Is it breakfast?");
      if (tod === "dusk") extra.push("The sky's gone all orange!");
      if (wx.id === "rainy") extra.push("Listen to the rain!", "Splish splash!");
      if (wx.id === "snowy") extra.push("SNOW! Can we go out in it?");
      if (wx.id === "windy") extra.push("Whoosh! Hold my hat!");
      if (wx.id === "rainbow") extra.push("A rainbow! Did you see it?");
      if (wx.id === "sunny") extra.push("What a sunny day!");
      if (S.pet.petpet) extra.push(S.pet.petpet.name + " is my best friend.", "Come on, " + S.pet.petpet.name + "!");
      if (S.dayStreak >= 3) extra.push("You came back again! " + S.dayStreak + " days!");
      var hol = holidayNow(), sea = seasonNow();
      if (hol) extra.push(hol.line, hol.line);
      if (hol && hol.id === "aprilfool") extra.push("I'm a Snorbit now. No, really.", "The Farm pays in jelly today. Honest.");
      if (myBirthday()) extra.push("Happy birthday! Let's have cake.", "It's your birthday! Best day ever!");
      birthdaysToday().forEach(function (p) { if (p !== who) extra.push("It's " + D.profile(p).name + "'s birthday! Did you post a present?"); });
      if (sea) extra.push("It's " + sea.name.toLowerCase() + "! " + sea.line);
      if (CAL && CAL.sleepsTo("xmas") !== null && CAL.sleepsTo("xmas") <= 24 && CAL.sleepsTo("xmas") > 0) extra.push("Only a few more sleeps until Christmas!");
      if (extra.length) {
        var line = extra[Math.floor(Math.random() * extra.length)];
        var tk = spoken(line);
        return { text: line, tok: tk === line ? null : tk };
      }
    }
    return { text: D.MOODS[m][i], tok: "m-" + m + "-" + i };
  }

  function nestHtml() {
    if (S.pet.egg) return eggHtml();
    var age = Math.max(0, Math.floor((Date.now() - (S.pet.born || Date.now())) / 86400000));
    var streakBit = (S.dayStreak || 0) > 1
      ? '<p class="sub" style="margin:0.8rem 0 0">📅 <b>' + S.dayStreak +
        " days in a row!</b> Keep it going — the daily gift grows with the streak.</p>" : "";
    return '<div class="panel">' +
      "<h2>🏡 " + esc(S.pet.name) + "'s nest</h2>" +
      '<p class="sub">' + esc(nestLine()) + " &nbsp;·&nbsp; " + esc(P.species(S.pet.species).name) +
        ", " + esc(P.colour(S.pet.colour).name) + ", " + age + (age === 1 ? " day" : " days") + " old. " +
        '<button class="ghost small" data-rename="1">✏️ Rename</button> ' +
        '<button class="ghost small" data-photo="1">📸 Photo</button></p>' +
      '<div class="acts">' +
        '<button class="act" data-do="feed" style="--ac:#ff8f4d"><span class="em">🍽️</span>Feed</button>' +
        '<button class="act" data-do="play" style="--ac:#3ddc84"><span class="em">🎾</span>Play</button>' +
        '<button class="act" data-do="wash" style="--ac:#38b6ff"><span class="em">🫧</span>Wash</button>' +
        '<button class="act" data-do="rest" style="--ac:#8a5cff"><span class="em">😴</span>Rest</button>' +
        '<button class="act" data-do="read" style="--ac:#e05fa8"><span class="em">📖</span>Read</button>' +
        '<button class="act" data-do="dress" style="--ac:#d99000"><span class="em">👒</span>Dress</button>' +
      "</div>" + shelfLine() +
      '<p class="sub" style="margin:0.8rem 0 0">💛 ' + personalityLine() + "</p>" +
      '<p class="sub" style="margin:0.8rem 0 0">Coins come from the Farm, the Well, the Pool and the Arena — ' +
        "every one of them pays you for learning something.</p>" + streakBit +
    "</div>" + partyHtml() + timesHtml() + mailHtml() + stepsHtml() + wishPanel() + reviewHtml() + levelPickerHtml();
  }

  /* =========================================================
     THE VALLEY TIMES — what is new today, on one card.
     The weather, the wish, quests ready to claim, a spin or a
     gift unopened, post waiting, rare finds, interest paid, the
     family's shops — each a tap away. It is the front page.
     ========================================================= */
  function timesHtml() {
    var rows = [];
    var hol = holidayNow();
    if (hol) rows.push([hol.emoji, "<b>" + esc(hol.name.charAt(0).toUpperCase() + hol.name.slice(1)) + "!</b> " + esc(hol.line) + " +" + HOLIDAY_BONUS + " 🪙 on every right answer today.", null]);
    celebrations().forEach(function (c) {
      if (c.kind !== "holiday" && !claimed(c.key)) rows.push([c.emoji, "<b>" + esc(c.name.charAt(0).toUpperCase() + c.name.slice(1)) + "!</b> There is a present to open, above.", null]);
    });
    var sleeps = CAL ? CAL.sleepsTo("xmas") : null;
    if (sleeps !== null && sleeps > 0 && sleeps <= 24) rows.push(["🎄", "<b>" + sleeps + " sleep" + (sleeps === 1 ? "" : "s") + "</b> until Christmas.", null]);
    var soonB = CAL ? CAL.birthdaySoon() : null;
    if (soonB) rows.push(["🎂", "<b>" + soonB.days + " sleep" + (soonB.days === 1 ? "" : "s") + "</b> until " +
      esc(soonB.who.map(function (p) { return p === who ? "your" : D.profile(p).name + "'s"; }).join(" and ")) + " birthday.", null]);
    var sea = seasonNow();
    if (sea) rows.push([sea.emoji, "<b>" + esc(sea.name) + ".</b> " + esc(sea.line) + " The Farm is growing " + sea.crops.slice(0, 3).join(" ") + " and the Market has a seasonal shelf.", "market"]);
    var wx = weatherToday();
    var wxPlace = PLACE_INFO[wx.place] ? PLACE_INFO[wx.place].title : "🎮 Games Room";
    rows.push([wx.emoji, "<b>" + esc(wx.name) + " today.</b> " + esc(wx.line) + " +" + WEATHER_BONUS + " 🪙 a question at the " + esc(wxPlace) + ".", wx.place]);
    var qs = quests();
    var ready = qs.filter(function (q) { return !S.claimed[q.id] && (S.today[q.track] || 0) >= q.goal; }).length;
    var done = qs.filter(function (q) { return S.claimed[q.id]; }).length;
    if (ready) rows.push(["📜", "<b>" + ready + " quest" + (ready === 1 ? "" : "s") + " ready to claim!</b>", "quests"]);
    else if (done < qs.length) rows.push(["📜", done + " of " + qs.length + " quests done today.", "quests"]);
    if (!spunToday()) rows.push(["🎡", "Your <b>free spin</b> is waiting.", "quests"]);
    if (!S.dailyGift) rows.push(["🎁", "Today's gift (🪙 " + giftCoins() + ") is <b>unopened</b>.", "quests"]);
    if ((S.mail || []).length) rows.push(["📬", "<b>" + S.mail.length + (S.mail.length === 1 ? " parcel" : " parcels") + "</b> in the post — below.", null]);
    var rare = D.rareFor(who, null, activePlayers());
    if (rare.length) rows.push(["🌟", "Only in <b>your</b> Market today: " + rare.map(function (it) { return it.emoji + " " + esc(it.name); }).join(", ") + ".", "market"]);
    if (S.bankNews) rows.push(["🏦", "The bank paid <b>🪙 " + S.bankNews + "</b> in interest overnight.", "market"]);
    var stalls = familyStalls();
    if (stalls.length) rows.push(["🏬", esc(stalls.map(function (st) { return st.p.name; }).join(" and ")) + (stalls.length === 1 ? " has" : " have") + " things for sale.", "market"]);
    var w = wishNow();
    if (w && !w.done) rows.push(["💭", esc(S.pet.name) + " wishes: <b>“" + esc(wishText(w)) + "”</b>", null]);
    if ((S.dayStreak || 0) >= 2) rows.push(["📅", "<b>" + S.dayStreak + " days in a row!</b> Keep it going.", null]);
    var date = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
    return '<div class="panel times"><h2>📰 The Valley Times <small>' + esc(date) + "</small></h2>" +
      rows.map(function (r) {
        var inner = '<span class="tem" aria-hidden="true">' + r[0] + '</span><span class="ttx">' + r[1] + "</span>";
        return r[2] ? '<button class="trow" data-goto="' + r[2] + '">' + inner + '<span class="tgo" aria-hidden="true">›</span></button>'
                    : '<div class="trow">' + inner + "</div>";
      }).join("") + "</div>";
  }

  /* The nest while the egg is still an egg. */
  function eggHtml() {
    var e = S.pet.egg, left = Math.max(0, e.need - e.got);
    return '<div class="panel eggpanel"><h2>🥚 ' + esc(S.pet.name) + "'s egg</h2>" +
      '<p class="sub">A ' + esc(P.colour(S.pet.colour).name) + " egg with a " + esc(spec().name) + " inside — " +
      esc(spec().blurb) + " It hatches when it hears you learning: <b>" + left + " right answer" + (left === 1 ? "" : "s") +
      "</b> anywhere in the valley, or <b>" + Math.max(0, EGG_TAPS - e.taps) + " more taps</b> on the shell.</p>" +
      '<div class="acts">' +
        '<button class="act" data-goto="farm" style="--ac:#ff8f4d"><span class="em">🍓</span>Sums at the Farm</button>' +
        '<button class="act" data-goto="well" style="--ac:#8a5cff"><span class="em">📖</span>Words at the Well</button>' +
        '<button class="act" data-goto="pool" style="--ac:#38b6ff"><span class="em">🌈</span>The Pool</button>' +
        '<button class="act" data-tapegg="1" style="--ac:#d99000"><span class="em">👆</span>Tap the egg</button>' +
      "</div>" +
      '<p class="sub" style="margin:0.8rem 0 0">💛 ' + personalityLine() + "</p>" +
    "</div>" + levelPickerHtml();
  }

  function wishPanel() {
    return '<div class="panel"><h2>💭 ' + esc(S.pet.name) + "'s wish</h2>" +
      '<p class="sub">Every so often ' + esc(S.pet.name) + " wants one thing in particular. Read the wish, " +
      "grant it, and there is a bonus in it for you — up to " + WISH_MAX + " a day.</p>" + wishHtml() + "</div>";
  }

  /* --- 👒 the wardrobe sheet: everything you own, and a look at it ON --- */
  function wardrobeSheet() {
    var own = S.wardrobe || [];
    var wear = S.pet.wear || {};
    var slots = [["head", "🎩 On the head"], ["face", "👓 On the face"], ["neck", "🧣 Round the neck"]];
    var body = slots.map(function (sl) {
      var mine = own.map(P.wearById).filter(function (it) { return it && it.slot === sl[0]; });
      if (!mine.length) return "";
      var on = wear[sl[0]];
      var cards = mine.map(function (it) {
        var preview = {}; P.SLOTS.forEach(function (k) { preview[k] = wear[k]; }); preview[sl[0]] = it.id;
        var isOn = on === it.id;
        return '<button class="item' + (isOn ? " here" : "") + '" data-use="' + (isOn ? "unwear:" + sl[0] : "wear:" + it.id) + '" ' +
          'aria-label="' + (isOn ? "Take off " : "Put on ") + esc(it.name) + '">' +
          '<img alt="" class="try" src="' + P.chip(S.pet.species, S.pet.colour, 64, preview, level()) + '">' +
          '<span class="nm">' + esc(it.name) + "</span>" +
          '<span class="own">' + (isOn ? "✔ wearing · tap to take off" : "tap to put on") + "</span></button>";
      }).join("");
      return '<h3 style="margin:0.8rem 0 0.3rem;font-size:0.98rem">' + sl[1] + "</h3>" +
        '<div class="items">' + cards + "</div>";
    }).join("");
    var anyOn = P.SLOTS.some(function (k) { return wear[k]; });
    return sheet("👒 " + esc(S.pet.name) + "'s wardrobe",
      (own.length
        ? '<p class="sub">Tap to put it on — it stays on everywhere ' + esc(S.pet.name) + " goes, even in the arena. " +
          own.length + " of " + P.WEAR.length + " in the valley owned.</p>" + body +
          (anyOn ? '<p style="margin:0.8rem 0 0"><button class="ghost small" data-use="unwear:all">Take everything off</button></p>' : "")
        : '<p class="sub">Nothing to wear yet! The 🏪 Market puts three hats, glasses or scarves on the ' +
          "👒 <b>Dress-up</b> shelf every morning, and you keep them for ever. " +
          "The Prize Wheel and The Shade never give clothes — only the shop does.</p>" +
          '<p style="margin:0.8rem 0 0"><button class="ghost" data-goto="market" data-close="1">🏪 Go to the Market</button></p>'));
  }

  /* --- 🐾 petpets: owning, choosing which one is out, naming --- */
  var PETPET_NAMES = ["Pip", "Dot", "Bean", "Tiny", "Button", "Fizz", "Pom", "Nib", "Sprig", "Zip", "Mo", "Bubble"];
  function adoptPetpet(id) {
    var it = P.petpetById(id);
    if (!it) return;
    if (!S.petpets) S.petpets = [];
    var first = !S.petpets.length;
    if (S.petpets.indexOf(id) === -1) S.petpets.push(id);
    S.pet.petpet = { id: id, name: PETPET_NAMES[Math.floor(Math.random() * PETPET_NAMES.length)] };
    anim.px = undefined;
    diary("🐾", "A " + it.name + " came home with us today! " + it.blurb + (first ? " My very own little friend." : ""));
    checkTrophies();
    hop();
    hearts();
  }
  function petpetNameSheet() {
    var pp = S.pet.petpet;
    if (!pp) return sheet("🐾 Petpets", '<p class="sub">No petpet is out just now.</p>');
    var it = P.petpetById(pp.id);
    var little = tier() === "tot" || tier() === "early";
    return sheet("🐾 Name your " + esc(it.name),
      '<p style="text-align:center;margin:0"><img alt="" class="ppchip big" src="' + P.petpetChip(pp.id, 96) + '"></p>' +
      '<p class="sub" style="text-align:center">' + esc(it.blurb) + " It will follow " + esc(S.pet.name) + " everywhere.</p>" +
      (little
        ? '<div class="swatches" id="pp-picks">' + PETPET_NAMES.map(function (n) {
            return '<button class="ghost small' + (n === pp.name ? " on" : "") + '" data-ppname="' + esc(n) + '">' + esc(n) + "</button>";
          }).join("") + "</div>"
        : '<div class="name-row"><input id="pp-input" maxlength="12" value="' + esc(pp.name) + '" aria-label="Petpet name">' +
          '<button class="ghost" id="pp-dice" aria-label="Pick a random name">🎲</button></div>') +
      '<p style="margin:0.8rem 0 0"><button class="act" id="pp-go" style="--ac:var(--green);width:100%"><span class="em">✅</span>That\'s its name</button></p>');
  }
  function namePetpet(name) {
    if (!S.pet.petpet) return closeSheet();
    name = (name || "").trim().slice(0, 12);
    if (!name) { toast("Give it a name first!"); return; }
    S.pet.petpet.name = name;
    diary("🐾", "We named the " + P.petpetById(S.pet.petpet.id).name + " " + name + ".");
    save();
    closeSheet();
    render();
    say(name + "! Come on, " + name + "!", 3000);
    sfx("win");
  }
  function pickPetpet(id) {
    if ((S.petpets || []).indexOf(id) === -1) return closeSheet();
    if (S.pet.petpet && S.pet.petpet.id === id) return closeSheet();
    // each petpet keeps the name you gave it
    if (!S.petpetNames) S.petpetNames = {};
    if (S.pet.petpet) S.petpetNames[S.pet.petpet.id] = S.pet.petpet.name;
    S.pet.petpet = { id: id, name: S.petpetNames[id] || PETPET_NAMES[Math.floor(Math.random() * PETPET_NAMES.length)] };
    anim.px = undefined;
    save();
    closeSheet();
    render();
    hop();
    sfx("pop");
  }
  function petpetsHtml() {
    var mine = (S.petpets || []).map(P.petpetById).filter(Boolean);
    var out = S.pet.petpet;
    return '<div class="panel"><h2>🐾 Petpets</h2>' +
      (mine.length
        ? '<p class="sub">' + (out ? "<b>" + esc(out.name) + "</b> the " + esc(P.petpetById(out.id).name) + " is out with " + esc(S.pet.name) + " now. " : "") +
          "Tap one to bring it out instead. " + mine.length + " of " + P.PETPETS.length + " in the valley. " +
          (out ? '<button class="ghost small" data-ppname-open="1">✏️ Rename ' + esc(out.name) + "</button>" : "") + "</p>" +
          '<div class="items">' + mine.map(function (it) {
            var on = out && out.id === it.id;
            return '<button class="item' + (on ? " here" : "") + '" data-use="petpet:' + it.id + '">' +
              '<img alt="" class="ppchip" src="' + P.petpetChip(it.id, 40) + '">' +
              '<span class="nm">' + esc(on ? out.name : it.name) + "</span>" +
              '<span class="what">' + esc(it.blurb) + "</span>" +
              '<span class="own">' + (on ? "✔ out with " + esc(S.pet.name) : "tap to bring out") + "</span></button>";
          }).join("") + "</div>"
        : '<p class="sub">No petpet yet — a pet for your pet! The 🏪 Market has two on the 🐾 shelf every morning. ' +
          "It trots along behind " + esc(S.pet.name) + " wherever it wanders, and you give it a name.</p>") +
    "</div>";
  }

  function wearItem(id) {
    var it = P.wearById(id);
    if (!it || (S.wardrobe || []).indexOf(id) === -1) return closeSheet();
    if (!S.pet.wear) S.pet.wear = {};
    var first = !S.everDressed;
    S.pet.wear[it.slot] = id;
    S.everDressed = true;
    bump("dressed");
    if (!checkWish("wear", id)) checkWish("act", "dress");
    diary("👒", "I'm wearing the " + it.name + " now." + (first ? " My very first outfit!" : ""));
    checkTrophies();
    save();
    render();
    // keep the wardrobe open so you can keep dressing up — but redrawn
    refreshSheet(wardrobeSheet());
    hop();
    hearts();
    say("Look at me! Do you like it?", 3000, "m-dress-up");
    sfx("win");
    if (first) { try { window.Confetti && Confetti.burst({ count: 70 }); } catch (e) {} }
  }
  function undress(slotName) {
    if (!S.pet.wear) return closeSheet();
    if (slotName === "all") P.SLOTS.forEach(function (k) { S.pet.wear[k] = null; });
    else S.pet.wear[slotName] = null;
    save();
    render();
    refreshSheet(wardrobeSheet());
    sfx("pop");
  }

  /* Toys keep paying you back long after you bought them — say so, or
     nobody can tell the 100-coin skateboard did anything. */
  function shelfLine() {
    var n = bagOf("toy").length;
    if (!n) {
      return '<p class="sub" style="margin:0.8rem 0 0">🧸 No toys yet. A toy from the 🏪 Market is yours ' +
        "for good — you can play with it as often as you like, and it keeps " + esc(S.pet.name) +
        " cheerful even while the game is closed.</p>";
    }
    return '<p class="sub" style="margin:0.8rem 0 0">🧸 <b>' + n + " toy" + (n === 1 ? "" : "s") +
      " on the shelf</b> — " + esc(S.pet.name) + " gets bored <b>" + Math.round(toyCalm() * 100) +
      "% slower</b> because of them.</p>";
  }

  /* The review basket, shown plainly: "here is what you are still
     getting wrong, and here is where to go and fix it." */
  function reviewHtml() {
    var mine = S.review.filter(function (r) { return r.tier === tier(); });
    if (!mine.length) {
      return '<div class="panel"><h2>🔁 Review basket</h2>' +
        '<p class="sub">Empty — nothing is waiting to be fixed. Anything you get wrong lands here ' +
        "and comes back a few questions later so you get a second go at it.</p></div>";
    }
    var by = { math: 0, word: 0, wonder: 0 };
    mine.forEach(function (r) { if (by[r.subject] !== undefined) by[r.subject]++; });
    var names = { math: "🍓 Berry Farm", word: "📖 Word Well", wonder: "🌈 Rainbow Pool" };
    var rows = Object.keys(by).filter(function (k) { return by[k]; }).map(function (k) {
      return '<div class="stat"><b>' + by[k] + "</b><small>" + names[k] + "</small></div>";
    }).join("");
    return '<div class="panel"><h2>🔁 Review basket</h2>' +
      '<p class="sub"><b>' + mine.length + "</b> question" + (mine.length === 1 ? "" : "s") +
      " waiting for a second look. They come back on their own while you play — get one right and it " +
      "leaves the basket for good. Fixed so far: <b>" + (S.stats.fixed || 0) + "</b>.</p>" +
      '<div class="statgrid">' + rows + "</div></div>";
  }

  function renameSheet() {
    return sheet("✏️ Rename your Craepet",
      '<p class="sub">Everything else stays exactly the same — same creature, same level, same coins.</p>' +
      '<div class="name-row"><input id="rename-input" maxlength="14" value="' + esc(S.pet.name) +
      '" aria-label="New name"><button class="ghost" id="rename-dice" aria-label="Pick a random name">🎲</button></div>' +
      '<p style="margin:0.8rem 0 0"><button class="act" id="rename-go" style="--ac:var(--green);width:100%">' +
      '<span class="em">✅</span>Save the name</button></p>');
  }

  function feedSheet() {
    var foods = Object.keys(S.bag).filter(function (id) { return D.kindOf(id) === "food"; });
    if (!foods.length) {
      return sheet("🍽️ Nothing to eat!",
        '<p class="sub">The bag is empty. Harvest berries at the 🍓 Farm, or buy food at the 🏪 Market.</p>');
    }
    return sheet("🍽️ What shall " + esc(S.pet.name) + " eat?",
      '<div class="items">' + foods.map(function (id) {
        return itemButton(id, "×" + S.bag[id] + (loves(id) ? " · 💛 favourite" : ""));
      }).join("") + "</div>" +
      '<p class="sub" style="margin-top:0.6rem">💛 ' + personalityLine() + "</p>");
  }

  function playSheet() {
    var toys = Object.keys(S.bag).filter(function (id) { return D.kindOf(id) === "toy"; });
    var romp = '<button class="act" data-use="romp" style="--ac:var(--green);width:100%;margin-bottom:0.6rem">' +
               '<span class="em">🤸</span>Just romp about (free)</button>';
    return sheet("🎾 Playtime!", romp + (toys.length
      ? '<div class="items">' + toys.map(function (id) { return itemButton(id, "owned"); }).join("") + "</div>" +
        '<p class="sub" style="margin-top:0.6rem">Toys never run out — play with the same one for ever.</p>'
      : '<p class="sub">Toys from the 🏪 Market make playtime count for a lot more, ' +
        "and once you buy one it is yours to keep.</p>"));
  }

  function washSheet() {
    var soaps = Object.keys(S.bag).filter(function (id) {
      var it = D.itemById(id);
      return it && it.clean;
    });
    var rinse = '<button class="act" data-use="rinse" style="--ac:var(--blue);width:100%;margin-bottom:0.6rem">' +
                '<span class="em">💦</span>Quick rinse (free)</button>';
    return sheet("🫧 Bath time", rinse + (soaps.length
      ? '<div class="items">' + soaps.map(function (id) { return itemButton(id, "×" + S.bag[id]); }).join("") + "</div>" +
        '<p class="sub" style="margin-top:0.6rem">Soap is used up when you use it — but the ' +
        "💦 <b>quick rinse above is free and never runs out</b>, so " + esc(S.pet.name) +
        " can always get clean.</p>"
      : '<p class="sub">The 💦 <b>quick rinse is free and you can use it as often as you like</b>, ' +
        "so " + esc(S.pet.name) + " is never stuck being grubby. Soap and bubble bath from the " +
        "🏪 Market do more in one go, and the 🌈 Rainbow Pool washes a bar up now and then.</p>"));
  }

  /* Bedtime. Pillows and tonics live here — they put energy back, which is
     exactly what Rest is for, and nowhere else in the nest wanted them. */
  function restSheet() {
    var comfy = comforts();
    var nap = '<button class="act" data-use="nap" style="--ac:var(--purple);width:100%;margin-bottom:0.6rem">' +
              '<span class="em">😴</span>Short nap (free, +18 ⚡)</button>';
    return sheet("😴 Bedtime", nap + (comfy.length
      ? '<div class="items">' + comfy.map(function (id) { return itemButton(id, "×" + S.bag[id]); }).join("") + "</div>"
      : '<p class="sub">A ☁️ Cloud Pillow or a 🧪 Berry Tonic from the 🏪 Market refills the energy bar in one go.</p>'));
  }

  /* Reading. Books used to be buyable but only usable from the Bag tab,
     so a 45-coin book looked like it did nothing. */
  function readSheet() {
    var books = bagOf("book");
    return sheet("📖 Story time", books.length
      ? '<div class="items">' + books.map(function (id) { return itemButton(id, "×" + S.bag[id]); }).join("") + "</div>" +
        '<p class="sub" style="margin-top:0.6rem">A book is read once: it teaches a real fact and gives ' +
        esc(S.pet.name) + " a big lump of XP.</p>"
      : '<p class="sub">No books yet. The 📖 Word Well turns them up while you answer, ' +
        "and the 🏪 Market always has a couple on the shelf.</p>");
  }

  /* One item button, drawn the same way everywhere: picture, name, what it
     does, and how many you have. */
  function itemButton(id, tail) {
    var it = D.itemById(id);
    if (!it) return "";
    return '<button class="item" data-use="' + esc(id) + '"><span class="pic">' + it.emoji + "</span>" +
      '<span class="nm">' + esc(it.name) + "</span>" +
      '<span class="what">' + esc(itemBlurb(it)) + "</span>" +
      (tail ? '<span class="own">' + esc(tail) + "</span>" : "") +
    "</button>";
  }

  function doAction(what) {
    if (what === "feed") return openSheet(feedSheet());
    if (what === "play") return openSheet(playSheet());
    if (what === "wash") return openSheet(washSheet());
    if (what === "read") return openSheet(readSheet());
    if (what === "dress") { sfx("pop"); return openSheet(wardrobeSheet()); }
    if (what === "rest") {
      if (comforts().length) return openSheet(restSheet());
      return nap();
    }
  }

  function nap() {
    anim.napping = true;
    S.pet.energy = clamp(S.pet.energy + 18, 0, 100);
    S.pet.happy = clamp(S.pet.happy + 2, 0, 100);
    say("Zzz… 💤", 2600, "m-zzz");
    floaty("+18 ⚡", "#e2d4ff");
    sfx("pop");
    setTimeout(function () { anim.napping = false; }, 2600);
    checkWish("act", "rest");
    save();
    render();
  }

  /* Using anything at all from the bag routes through here. */
  function useItem(id) {
    if (id === "romp") {
      if (S.pet.energy < 12) { toast(S.pet.name + " is too sleepy to romp."); return closeSheet(); }
      S.pet.happy = clamp(S.pet.happy + 8, 0, 100);
      S.pet.energy = clamp(S.pet.energy - 10, 0, 100);
      S.pet.clean = clamp(S.pet.clean - 4, 0, 100);
      bump("play");
      floaty("+8 😊", "#b6ffcf");
      say("Wheee!", 2600, "m-wheee");
      sfx("pop");
      hop();
      checkWish("act", "play");
      return after();
    }
    if (id === "nap") { closeSheet(); return nap(); }
    if (id === "rinse") {
      S.pet.clean = clamp(S.pet.clean + 14, 0, 100);
      bump("wash");
      floaty("+14 🫧", "#cdf1ff");
      say("Much better!", 2600, "m-much-better");
      sfx("pop");
      checkWish("act", "wash");
      return after();
    }
    // the wardrobe: "wear:partyhat" puts it on, "unwear:head" takes it off
    if (id.indexOf("wear:") === 0) return wearItem(id.slice(5));
    if (id.indexOf("unwear:") === 0) return undress(id.slice(7));
    if (id.indexOf("petpet:") === 0) return pickPetpet(id.slice(7));

    var it = D.itemById(id);
    if (!it) return closeSheet();
    var kind = D.kindOf(id);
    // Brushes are not carried in the bag — owning the colour IS the item.
    if (kind === "brush") return paint(it.colour);
    if (kind === "wear") return wearItem(id);
    if (!S.bag[id]) return closeSheet();
    if (S.bagNew) delete S.bagNew[id];          // it has been used; drop the badge

    if (kind === "food") {
      // In a duel a snack is a heal — two a fight, and never when full up.
      var snacking = !!(battle && !battle.over && battle.snacks > 0 && battle.myHp < battle.myMax);
      if (!snacking && S.pet.hunger > 96) { toast(S.pet.name + " is completely full!"); return closeSheet(); }
      takeItem(id);
      // a favourite food: double the joy, and the pet says so
      var love = loves(id);
      var joy = (it.joy || 0) * (love ? 2 : 1) + (love ? 4 : 0);
      S.pet.hunger = clamp(S.pet.hunger + it.fill + (love ? 3 : 0), 0, 100);
      S.pet.happy = clamp(S.pet.happy + joy, 0, 100);
      S.pet.clean = clamp(S.pet.clean - 3, 0, 100);
      bump("feed");
      if (love && !snacking) {
        if (!S.favFound) S.favFound = {};
        if (!S.favFound[id]) {
          S.favFound[id] = true;
          diary("💛", "I found out I LOVE " + it.emoji + " " + it.name + ". All " + spec().name + "s do. Double the joy!");
          toast("💛 " + S.pet.name + " LOVES " + it.name + "! " + spec().name + "s always do — double the joy.");
        }
      }
      if (snacking) {
        var heal = Math.min(battle.myMax - battle.myHp, it.fill + 5);
        battle.myHp += heal;
        battle.snacks--;
        battle.log = S.pet.name + " munches " + it.name.toLowerCase() + " and gets " + heal + " HP back!";
        battle.fx = { me: "heal" };
        floaty("+" + heal + " ❤️", "#ffb3c6");
        say("Yum!", 2200, "a-b-snack");
        sfx("good");
        return after();
      }
      floaty("+" + it.fill + " 🍽️" + (love ? " +" + joy + " 💛" : ""), love ? "#ffd166" : "#ffd9a8");
      if (love) say("My favourite! " + it.name + "!", 2800, "m-favourite");
      else say("Mmm, " + it.name.toLowerCase() + "!", 2600, "m-yum");
      sfx("good");
      hop();
      if (!checkWish("food", id) && (love || it.joy >= 8)) hearts();
      return after();
    }
    if (kind === "toy") {
      if (S.pet.energy < 10) { toast(S.pet.name + " needs a rest first."); return closeSheet(); }
      S.pet.happy = clamp(S.pet.happy + it.joy, 0, 100);
      S.pet.energy = clamp(S.pet.energy - 8, 0, 100);
      bump("play");
      giveXp(2);
      floaty("+" + it.joy + " 😊", "#b6ffcf");
      say("The " + it.name.toLowerCase() + "! My favourite!", 2600, "m-favourite");
      sfx("pop");
      hop();
      hearts();
      checkWish("act", "play");
      return after();
    }
    if (kind === "care") {
      takeItem(id);
      if (it.clean) S.pet.clean = clamp(S.pet.clean + it.clean, 0, 100);
      if (it.energy) S.pet.energy = clamp(S.pet.energy + it.energy, 0, 100);
      if (it.joy) S.pet.happy = clamp(S.pet.happy + it.joy, 0, 100);
      if (it.clean) bump("wash");
      floaty(itemBlurb(it), it.clean ? "#cdf1ff" : "#e2d4ff");
      say("Aaah.", 2600, "m-aaah");
      sfx("good");
      checkWish("act", it.clean ? "wash" : "rest");
      return after();
    }
    if (kind === "book") {
      takeItem(id);
      giveXp(it.xp);
      bump("read");
      S.pet.happy = clamp(S.pet.happy + 5, 0, 100);
      var fact = factSay();
      diary("📖", "We read " + it.name + ". Did you know? " + fact.text);
      checkWish("act", "read");
      closeSheet();
      save();
      render();
      openSheet(sheet("📖 " + esc(it.name),
        '<p class="teach" style="font-size:1.02rem"><b>Did you know? </b>' + esc(fact.text) + "</p>" +
        '<p class="sub" style="margin-top:0.6rem">' + esc(S.pet.name) + " gained " + it.xp + " XP from reading.</p>"));
      sfx("win");
      narrate(["fact-intro", fact.tok]);
      return;
    }
    closeSheet();

    function after() {
      closeSheet();
      checkTrophies();
      save();
      render();
    }
  }

  /* A fact for this level, with the recording that reads it. */
  function factSay() {
    var t = D.FACTS[tier()] ? tier() : "mid";
    var i = Math.floor(Math.random() * D.FACTS[t].length);
    return { text: D.FACTS[t][i], tok: "fact-" + t + "-" + i };
  }

  function paint(colourId) {
    if (S.pet.colour !== colourId) diary("🖌️", "I got painted " + P.colour(colourId).name + ". Look at me!");
    S.pet.colour = colourId;
    S.everPainted = true;
    checkTrophies();
    save();
    closeSheet();
    render();
    hop();
    say("Look at me! " + P.colour(colourId).name + "!", 3200, "m-look-at-me");
    sfx("win");
    try { window.Confetti && Confetti.burst({ count: 70 }); } catch (e) {}
  }

  /* =========================================================
     YOUR HOUSE — the one thing in the valley you build rather
     than answer. Furniture is bought at the Market, kept for
     ever, and then PUT OUT here, where it stands behind your
     Craepet in the nest. Every piece you have out does real
     work while the game is closed, and the panel says exactly
     how much, in plain numbers, so a bigger house is a choice
     you can reason about instead of a shiny nothing.
     ========================================================= */
  var homeTab = "room";                 // room | homes | style

  function houseHtml() {
    var h = houseInfo();
    var used = (S.house.placed || []).length;

    var effects = [
      ["😊", Math.round((toyCalm() + houseCalm()) * 100) + "%", "slower to get bored"],
      ["⚡", "+" + restBonus(), "energy an hour"],
      ["🧼", Math.round(tidyBonus() * 100) + "%", "slower to get grubby"],
      ["⭐", "+" + Math.round(studyBonus() * 100) + "%", "XP per right answer"]
    ].map(function (e) {
      return '<div class="stat"><b>' + e[0] + " " + e[1] + "</b><small>" + e[2] + "</small></div>";
    }).join("");

    var tabs = [["room", "🛋️", "Furniture"], ["homes", "🏘️", "Homes"], ["style", "🎨", "Decorate"]];
    var chips = '<div class="subnav">' + tabs.map(function (t) {
      return '<button data-hometab="' + t[0] + '"' + (homeTab === t[0] ? ' class="on"' : "") + ">" +
        t[1] + " " + t[2] + "</button>";
    }).join("") + "</div>";

    var head = '<div class="panel">' +
      "<h2>" + h.emoji + " " + esc(homeName()) + "</h2>" +
      '<p class="sub">' + esc(h.note) + " Your Craepet lives here, and everything you put out is " +
        "working for " + esc(S.pet.name) + " even when the game is shut. " +
        '<button class="ghost small" data-homename="1">✏️ Rename it</button></p>' +
      '<div class="statgrid">' + effects + "</div>" +
      '<p class="sub" style="margin:0.8rem 0 0">🛋️ <b>' + used + " of " + h.slots +
        " spaces used</b> · 🏠 <b>" + houseCosy() + " cosy</b> · 🏘️ <b>" +
        S.house.homes.length + (S.house.homes.length === 1 ? " home" : " homes") + "</b> owned. " +
        (S.house.owned.length ? "You own " + S.house.owned.length + " pieces of furniture." :
         "Furniture is on sale at the 🏪 Market — look for the 🏠 pieces.") + "</p>" +
      chips +
    "</div>";

    return head + (homeTab === "homes" ? homesHtml() : homeTab === "style" ? styleHtml() : roomHtml());
  }

  /* --- 🛋️ tab one: the furniture you own, out or packed away --- */
  function roomHtml() {
    var h = houseInfo();
    var out = placedItems(), stored = storedItems();
    var used = out.length;

    var shelf = out.length
      ? '<div class="items">' + out.map(function (it) {
          return '<button class="item" data-store="' + esc(it.id) + '" ' +
            'aria-label="Put ' + esc(it.name) + ' away in storage">' +
            '<span class="pic">' + it.emoji + "</span>" +
            '<span class="nm">' + esc(it.name) + "</span>" +
            '<span class="what">' + esc(itemBlurb(it)) + "</span>" +
            '<span class="own">tap to put away</span></button>';
        }).join("") + "</div>"
      : '<p class="sub">Nothing out yet. Anything you put out shows up in the room above ' +
        "and in 🏡 the Nest — and starts doing its job straight away.</p>";

    // Storage is grouped by set, because with a hundred-odd pieces in the
    // game an ungrouped cupboard is just a wall of emoji.
    var full = slotsFree() <= 0;
    var box = D.FURNITURE_SETS.map(function (set) {
      var mine = stored.filter(function (it) { return it.set === set.id; });
      if (!mine.length) return "";
      return '<h3 style="margin:0.9rem 0 0.4rem;font-size:0.98rem">' + set.name +
        ' <small style="color:#8b83a8;font-weight:normal">' + mine.length + "</small></h3>" +
        '<div class="items">' + mine.map(function (it) {
          return '<button class="item" data-place="' + esc(it.id) + '"' + (full ? " disabled" : "") + ">" +
            '<span class="pic">' + it.emoji + "</span>" +
            '<span class="nm">' + esc(it.name) + "</span>" +
            '<span class="what">' + esc(itemBlurb(it)) + "</span>" +
            '<span class="own">' + (full ? "house is full" : "tap to put out") + "</span></button>";
        }).join("") + "</div>";
    }).join("");

    return '<div class="panel"><h2>🛋️ Out where you can see it</h2>' +
      '<p class="sub">' + used + " / " + h.slots + " spaces. Tap a piece to put it back in storage " +
      "and free up the space for something else.</p>" + shelf +
    "</div>" +
    (stored.length
      ? '<div class="panel"><h2>📦 In storage</h2>' +
        '<p class="sub">Yours, but packed away. ' +
        (slotsFree() > 0
          ? "There " + (slotsFree() === 1 ? "is 1 space" : "are " + slotsFree() + " spaces") + " left — tap to put something out."
          : "The house is full: put something away first, or move somewhere bigger.") + "</p>" + box +
      "</div>"
      : '<div class="panel"><h2>📦 In storage</h2>' +
        '<p class="sub">Nothing packed away. There are <b>' + D.FURNITURE.length +
        " pieces of furniture</b> in the valley, across " + D.FURNITURE_SETS.length +
        " themed sets — and the 🏪 Market puts a dozen different ones on the shelf " +
        "every morning.</p></div>");
  }

  /* --- 🏘️ tab two: every home in the game, grouped by where it is ---
     You keep every home you buy and can move in and out for nothing, so
     this reads as a collection rather than a ladder. */
  function homesHtml() {
    var worlds = [];
    D.HOUSES.forEach(function (h) { if (worlds.indexOf(h.world) === -1) worlds.push(h.world); });

    var body = worlds.map(function (world) {
      var homes = D.HOUSES.filter(function (h) { return h.world === world; });
      var cards = homes.map(function (h) {
        var mine = ownsHome(h.id);
        var here = S.house.home === h.id;
        var afford = S.coins >= h.cost;
        var act = here ? "data-hometab=\"style\"" : mine ? 'data-movehome="' + h.id + '"'
                                                        : 'data-buyhome="' + h.id + '"';
        var foot = here ? '<span class="own">✔ you live here</span>'
          : mine ? '<span class="own">tap to move in</span>'
          : '<span class="price">🪙 ' + h.cost + "</span>";
        return '<button class="item' + (here ? " here" : "") + '" ' + act +
          (!mine && !afford ? " disabled" : "") + ">" +
          '<span class="pic">' + h.emoji + "</span>" +
          '<span class="nm">' + esc(h.name) + "</span>" +
          '<span class="what">' + h.slots + " spaces</span>" + foot +
          (!mine && !afford ? '<span class="own">🪙 ' + (h.cost - S.coins) + " to go</span>" : "") +
        "</button>";
      }).join("");
      return '<h3 style="margin:0.9rem 0 0.4rem;font-size:0.98rem">' + esc(world) + "</h3>" +
        '<div class="items">' + cards + "</div>";
    }).join("");

    var nx = nextHouse();
    return '<div class="panel"><h2>🏘️ Homes</h2>' +
      '<p class="sub">There are <b>' + D.HOUSES.length + " homes</b> in the game, and you own <b>" +
        S.house.homes.length + "</b>. Buying one is for ever: you keep every home you buy and can " +
        "move between them whenever you like, for free. Each one remembers its own walls, floor and view — " +
        "and every home you own lends you its style to use in all the others." +
        (nx ? " The cheapest one you don't own yet is the " + esc(nx.name) + ", at 🪙 " + nx.cost + "." : "") +
      "</p>" + body + "</div>";
  }

  /* --- 🎨 tab three: walls, floors and the view --- */
  function styleHtml() {
    var r = room();
    var parts = [
      { kind: "wall",  title: "🎨 Walls",  list: D.WALLS,  now: r.wall,
        note: "The top half of the room." },
      { kind: "floor", title: "🪵 Floors", list: D.FLOORS, now: r.floor,
        note: "What your Craepet is standing on." },
      { kind: "view",  title: "🪟 The view", list: D.VIEWS, now: r.view,
        note: "What you can see out of the window." }
    ];

    var body = parts.map(function (p) {
      var owned = p.list.filter(function (x) { return ownsStyle(p.kind, x.id); }).length;
      var cards = p.list.map(function (x) {
        var have = ownsStyle(p.kind, x.id);
        var on = x.id === p.now;
        var afford = S.coins >= x.cost;
        // A view is a picture, so the button shows the PICTURE — painted
        // at thumbnail size by the same code that paints the window.
        // Picking a view out of a list of emoji was guesswork.
        var chip = p.kind === "view"
          ? (ART && ART.hasView(x.id)
              ? '<span class="viewchip">' + ART.view(x.id) + "</span>"
              : '<span class="pic">' + x.emoji + "</span>")
          : '<span class="paintchip" style="background:linear-gradient(180deg,' + x.a + ',' + x.b + ')"></span>';
        var from = (!x.cost || (S.house[STYLE[p.kind].own] || []).indexOf(x.id) !== -1)
          ? null : styleFrom(p.kind, x.id);
        var foot = on ? '<span class="own">✔ in use</span>'
          : have ? '<span class="own">tap to use</span>'
          : '<span class="price">🪙 ' + x.cost + "</span>";
        return '<button class="item' + (on ? " here" : "") + '" data-style="' + p.kind + ":" + x.id + '"' +
          (!have && !afford ? " disabled" : "") + ">" + chip +
          '<span class="nm">' + esc(x.name) + "</span>" + foot +
          (from ? '<span class="what">comes with the ' + esc(from.name) + "</span>" : "") +
        "</button>";
      }).join("");
      return '<div class="panel"><h2>' + p.title + "</h2>" +
        '<p class="sub">' + p.note + " You have <b>" + owned + " of " + p.list.length +
          "</b>. Whatever you pick here is remembered for the <b>" + esc(houseInfo().name) +
          "</b> on its own.</p>" +
        '<div class="items">' + cards + "</div></div>";
    }).join("");

    var combos = D.WALLS.length * D.FLOORS.length * D.VIEWS.length;
    return '<div class="panel"><h2>🎨 Decorating the ' + esc(houseInfo().name) + "</h2>" +
      '<p class="sub">Any wall goes with any floor goes with any view — that is <b>' +
        combos.toLocaleString() + " different rooms</b> for this home alone, before you " +
        "put a single thing out. Buy one once and you can use it in every home you own.</p></div>" +
      body;
  }

  /* Buying a new home. The price is on the button, so the homes tab is
     also the biggest savings target in the game — which is the point. */
  function buyHome(id) {
    var h = D.houseById(id);
    if (!h || ownsHome(id) || S.coins < h.cost) return;
    S.coins -= h.cost;
    S.house.homes.push(id);
    diary("🏠", "We bought the " + h.name + " and moved in! " + h.note);
    moveHome(id, true);
    checkTrophies();
    save();
    render();
    var st = h.style;
    openSheet(sheet(h.emoji + " Welcome to the " + esc(h.name) + "!",
      '<p class="sub" style="font-size:1.02rem">' + esc(h.note) + "</p>" +
      '<p class="sub">You now have <b>' + h.slots + " spaces</b> for furniture — " +
      (slotsFree() > 0 ? slotsFree() + " of them empty." : "all of them full already!") + "</p>" +
      '<p class="sub">It came with <b>' + esc(styleItem("wall", st.wall).name) + "</b> walls, a <b>" +
      esc(styleItem("floor", st.floor).name) + "</b> floor and the <b>" +
      esc(styleItem("view", st.view).name) + "</b> view — and those are now yours to use in " +
      "any of your homes.</p>" +
      '<p class="teach"><b>That cost 🪙 ' + h.cost + ".</b> You have 🪙 " + S.coins + " left. " +
      "You still own your other " + (S.house.homes.length - 1) +
      (S.house.homes.length === 2 ? " home" : " homes") + " — moving back is free.</p>"));
    sfx("win");
    try { window.Confetti && Confetti.burst({ count: 100 }); } catch (e) {}
  }

  /* Moving in. Free, and you keep everything — but a smaller home holds
     fewer pieces, so the overflow goes into storage rather than vanishing. */
  function moveHome(id, quiet) {
    if (!ownsHome(id)) return;
    S.house.home = id;
    var h = houseInfo();
    var over = (S.house.placed || []).length - h.slots;
    if (over > 0) {
      S.house.placed = S.house.placed.slice(0, h.slots);
      if (!quiet) toast("The " + h.name + " is smaller — " + over +
                        (over === 1 ? " piece went" : " pieces went") + " into storage.");
    }
    room();                                  // make sure it has a look of its own
    checkTrophies();
    if (quiet) return;
    save();
    render();
    say("Home sweet " + h.name.toLowerCase() + "!", 2800, "m-home-sweet-home");
    sfx("good");
  }

  /* Tapping a wall, floor or view: use it if it is yours, buy it if not. */
  function pickStyle(ref) {
    var bits = String(ref).split(":");
    var kind = bits[0], id = bits[1];
    if (!STYLE[kind]) return;
    var it = styleItem(kind, id);
    if (!it) return;
    var r = room();
    if (!ownsStyle(kind, id)) {
      if (S.coins < it.cost) return;
      S.coins -= it.cost;
      S.house[STYLE[kind].own].push(id);
      toast("Bought " + it.name + " for 🪙 " + it.cost + ".");
      sfx("coin");
    } else {
      if (r[STYLE[kind].key] === id) return;   // already in use
      sfx("pop");
    }
    r[STYLE[kind].key] = id;
    bump("styled");
    checkTrophies();
    save();
    render();
  }

  function homeNameSheet() {
    return sheet("✏️ Name your home",
      '<p class="sub">Every home can have its own name — the ' + esc(houseInfo().name) +
      " is called this one. Leave it empty to go back to <b>" + esc(houseInfo().name) + "</b>.</p>" +
      '<div class="name-row"><input id="home-input" maxlength="22" value="' + esc(room().name || "") +
      '" aria-label="Home name"></div>' +
      '<p style="margin:0.8rem 0 0"><button class="act" id="home-go" style="--ac:var(--green);width:100%">' +
      '<span class="em">🏠</span>Put up the sign</button></p>');
  }

  function placeFurniture(id) {
    if ((S.house.owned || []).indexOf(id) === -1) return;
    if ((S.house.placed || []).indexOf(id) !== -1) return;
    if (slotsFree() <= 0) { toast("The " + houseInfo().name + " is full — move somewhere bigger!"); return; }
    S.house.placed.push(id);
    bump("placed");
    var it = D.itemById(id);
    checkTrophies();
    save();
    render();
    say("Ooh, the " + (it ? it.name.toLowerCase() : "furniture") + "!", 2800);
    sfx("good");
  }

  function storeFurniture(id) {
    var i = (S.house.placed || []).indexOf(id);
    if (i === -1) return;
    S.house.placed.splice(i, 1);
    save();
    render();
    sfx("pop");
  }

  /* =========================================================
     YOUR OWN SHOP — the other half of the market.
     Anything in your bag can go on your own shelf at a price
     YOU choose, and everyone else on this device can walk up
     and buy it. Setting the price is the whole lesson: the
     panel shows what the Market charges, what you would make
     per sale, and what the whole shelf is worth.
     ========================================================= */
  var pendingSale = null;              // { id, price, n } while the price sheet is open

  function stallName() {
    return (S.stall.name || "").trim() || (D.profile(who).name + "'s Corner");
  }
  /* What you can put on the shelf: anything in your bag, plus any piece of
     furniture you own that is currently packed away in storage. Selling
     furniture on is what makes a rare find worth chasing — the Mars Rock
     that landed in your Market this morning is the only one in the valley,
     and the rest of the family can only get it from you. Brushes stay
     unsellable: a colour cannot be un-learnt. */
  function sellableFurniture() {
    return (S.house.owned || []).filter(function (id) {
      return (S.house.placed || []).indexOf(id) === -1 && D.itemById(id);
    });
  }
  function sellable() {
    return Object.keys(S.bag).filter(function (id) {
      return S.bag[id] > 0 && D.itemById(id);
    }).concat(sellableFurniture());
  }
  /* How many of a thing you could put on the shelf right now. Furniture is
     owned once, so it is always exactly one. */
  function haveToSell(id) {
    if (D.kindOf(id) === "decor") return (S.house.owned || []).indexOf(id) !== -1 &&
      (S.house.placed || []).indexOf(id) === -1 ? 1 : 0;
    return S.bag[id] || 0;
  }
  function shelfWorth() {
    var n = 0;
    (S.stall.goods || []).forEach(function (g) { n += g.price * g.n; });
    return n;
  }

  function stallHtml() {
    var goods = S.stall.goods || [], sales = S.stall.sales || [];

    var receipts = sales.length
      ? '<div class="panel"><h2>🔔 While you were out</h2>' +
        '<p class="sub">The coins are already in your purse — this is just the receipt.</p>' +
        sales.slice().reverse().map(function (r) {
          var it = D.itemById(r.id), p = D.profile(r.from);
          return '<div class="quest"><div class="qtx">' + (it ? it.emoji : "📦") + " <b>" +
            esc(it ? it.name : r.id) + "</b> — bought by " + esc(p.name) + " " + p.emoji +
            '</div><span class="rw">+🪙 ' + r.price + "</span></div>";
        }).join("") +
        '<p style="margin:0.7rem 0 0"><button class="act" data-clearsales="1" style="--ac:var(--purple);width:100%">' +
        '<span class="em">✅</span>Got it, thanks</button></p></div>'
      : "";

    var shelf = goods.length
      ? '<div class="items">' + goods.map(function (g, i) {
          var it = D.itemById(g.id);
          if (!it) return "";
          return '<button class="item" data-unstock="' + i + '" ' +
            'aria-label="Take ' + esc(it.name) + ' back off the shelf">' +
            '<span class="pic">' + it.emoji + "</span>" +
            '<span class="nm">' + esc(it.name) + "</span>" +
            '<span class="price">🪙 ' + g.price + " each</span>" +
            '<span class="own">' + g.n + " on the shelf</span>" +
            '<span class="what">tap to take back</span></button>';
        }).join("") + "</div>"
      : '<p class="sub">Your shelf is empty. Put something on it from the list below and the rest of ' +
        "the family will see it in <b>their</b> 🏪 Market.</p>";

    var mine = sellable();
    var stock = mine.length
      ? '<div class="items">' + mine.map(function (id) {
          var it = D.itemById(id);
          var isDecor = D.kindOf(id) === "decor";
          return '<button class="item' + (it.rare ? " rare" : "") + '" data-stock="' + esc(id) + '">' +
            '<span class="pic">' + it.emoji + "</span>" +
            '<span class="nm">' + esc(it.name) + "</span>" +
            '<span class="what">market price 🪙 ' + it.cost + "</span>" +
            '<span class="own">' + (isDecor ? "🏠 from storage" : "you have " + S.bag[id]) + "</span>" +
            (it.rare ? '<span class="own">🌟 rare</span>' : "") + "</button>";
        }).join("") + "</div>"
      : '<p class="sub">Nothing to sell yet. Harvest berries at the 🍓 Farm, ' +
        "or buy cheap at the 🏪 Market and sell for a little more here.</p>";

    return receipts +
    '<div class="panel">' +
      "<h2>🏬 " + esc(stallName()) + "</h2>" +
      '<p class="sub">Your own shop. Everyone else who plays on this device sees your shelf in ' +
        "their Market and can buy from it — and the coins come straight to you. " +
        '<button class="ghost small" data-shopname="1">✏️ Rename the shop</button></p>' +
      '<div class="statgrid">' +
        '<div class="stat"><b>📦 ' + goods.length + "</b><small>kinds on the shelf</small></div>" +
        '<div class="stat"><b>🪙 ' + shelfWorth() + "</b><small>the shelf is worth</small></div>" +
        '<div class="stat"><b>🤝 ' + (S.stats.sold || 0) + "</b><small>things sold</small></div>" +
        '<div class="stat"><b>🪙 ' + (S.stats.soldCoins || 0) + "</b><small>earned selling</small></div>" +
      "</div>" +
    "</div>" +
    '<div class="panel"><h2>🛒 On your shelf</h2>' + shelf + "</div>" +
    '<div class="panel"><h2>➕ Put something on the shelf</h2>' +
      '<p class="sub">Tap anything from your bag — or any furniture packed away in 🏠 storage — ' +
      "then choose your price. Charge more than the Market and you make a profit on every sale — " +
      "charge too much and nobody buys it. A 🌟 <b>rare</b> thing is worth a lot more to the family " +
      "than the Market price, because their Market cannot sell them one at all.</p>" + stock +
    "</div>";
  }

  /* The price sheet. This is a live sum: change the price and the profit
     line changes with it, which is a far better lesson than being told. */
  function priceSheet() {
    var it = D.itemById(pendingSale.id);
    var have = haveToSell(pendingSale.id);
    if (pendingSale.n > have) pendingSale.n = have;
    var profit = pendingSale.price - it.cost;
    var line = profit > 0
      ? "You would make <b>🪙 " + profit + "</b> on every one you sell."
      : profit === 0
        ? "That is exactly what the Market charges. No profit, but it will sell."
        : "That is <b>🪙 " + (-profit) + " cheaper</b> than the Market — a bargain for them, a loss for you.";

    var counts = [1, 2, 3, 5].filter(function (n) { return n <= have; });
    if (counts.indexOf(have) === -1) counts.push(have);
    var isDecor = D.kindOf(pendingSale.id) === "decor";

    return sheet("🏷️ " + esc(it.name) + " — what's your price?",
      '<p class="sub" style="text-align:center;font-size:1.05rem">' + it.emoji +
        " The 🏪 Market sells this for <b>🪙 " + it.cost + "</b>.</p>" +
      (isDecor
        ? '<p class="teach" style="text-align:center">🏠 This is <b>your furniture</b>. ' +
          "If somebody buys it, it is theirs and it leaves your house for good. " +
          "You can take it back off the shelf any time before it sells.</p>"
        : "") +
      (it.rare
        ? '<p class="teach" style="text-align:center">🌟 <b>This is rare.</b> Nobody else\'s Market ' +
          "is selling one today, so you can ask more than the Market price and still sell it.</p>"
        : "") +
      '<div class="name-row" style="gap:0.6rem">' +
        '<button class="ghost" data-priced="-5" aria-label="five coins cheaper">−5</button>' +
        '<button class="ghost" data-priced="-1" aria-label="one coin cheaper">−1</button>' +
        '<b style="font-size:1.6rem;color:#d99000;min-width:5.5rem;text-align:center">🪙 ' +
          pendingSale.price + "</b>" +
        '<button class="ghost" data-priced="1" aria-label="one coin dearer">+1</button>' +
        '<button class="ghost" data-priced="5" aria-label="five coins dearer">+5</button>' +
      "</div>" +
      '<p class="teach" style="text-align:center">' + line + "</p>" +
      '<p class="sub" style="margin:0.7rem 0 0.3rem;text-align:center">How many? You have ' + have + ".</p>" +
      '<div class="swatches">' + counts.map(function (n) {
        return '<button class="ghost small' + (n === pendingSale.n ? " on" : "") + '" data-saleqty="' + n + '">' +
          n + (n === have ? " (all)" : "") + "</button>";
      }).join("") + "</div>" +
      '<p class="sub" style="margin:0.7rem 0 0;text-align:center">' + pendingSale.n + " × 🪙 " +
        pendingSale.price + " = <b>🪙 " + (pendingSale.n * pendingSale.price) +
        "</b> if the whole lot sells.</p>" +
      '<p style="margin:0.8rem 0 0"><button class="act" data-listit="1" style="--ac:var(--green);width:100%">' +
      '<span class="em">🏬</span>Put it on the shelf</button></p>');
  }

  function openPriceSheet(id) {
    var it = D.itemById(id);
    if (!it || !haveToSell(id)) return;
    // A sensible opening bid — a small mark-up on what the shop charges.
    pendingSale = { id: id, price: it.cost + Math.max(1, Math.round(it.cost * 0.2)), n: 1 };
    sfx("pop");
    openSheet(priceSheet());
  }

  function nudgePrice(by) {
    if (!pendingSale) return;
    pendingSale.price = Math.max(1, Math.min(999, pendingSale.price + by));
    sfx("pop");
    refreshSheet(priceSheet());
  }
  function setSaleQty(n) {
    if (!pendingSale) return;
    pendingSale.n = Math.max(1, Math.min(haveToSell(pendingSale.id) || 1, n));
    sfx("pop");
    refreshSheet(priceSheet());
  }

  function listForSale() {
    if (!pendingSale) return;
    var deal = pendingSale;
    pendingSale = null;
    var it = D.itemById(deal.id);
    var have = haveToSell(deal.id);
    var n = Math.max(1, Math.min(have, deal.n));
    if (!it || !have) return closeSheet();
    if ((S.stall.goods || []).length >= 8) {
      toast("Your shelf is full — take something off it first.");
      return closeSheet();
    }
    // A piece of furniture leaves the house when it goes on the shelf, so
    // it cannot be both sold to a sibling and still standing in your room.
    if (D.kindOf(deal.id) === "decor") {
      var oi = S.house.owned.indexOf(deal.id);
      if (oi !== -1) S.house.owned.splice(oi, 1);
    } else {
      for (var i = 0; i < n; i++) takeItem(deal.id);
    }
    if (S.bagNew) delete S.bagNew[deal.id];
    // The same thing at the same price stacks instead of taking a second space.
    var row = null;
    S.stall.goods.forEach(function (g) { if (g.id === deal.id && g.price === deal.price) row = g; });
    if (row) row.n += n;
    else S.stall.goods.push({ id: deal.id, price: deal.price, n: n });
    S.everStocked = true;
    bump("stocked", n);
    checkTrophies();
    closeSheet();
    save();
    render();
    toast("🏬 " + n + " × " + it.emoji + " " + it.name + " on the shelf at 🪙 " + deal.price + " each.");
    sfx("coin");
  }

  function unstock(i) {
    var g = (S.stall.goods || [])[i];
    if (!g) return;
    S.stall.goods.splice(i, 1);
    var it = D.itemById(g.id);
    var isDecor = D.kindOf(g.id) === "decor";
    if (isDecor) {
      if (S.house.owned.indexOf(g.id) === -1) S.house.owned.push(g.id);
    } else {
      addItem(g.id, g.n);
    }
    save();
    render();
    toast(isDecor
      ? "Took the " + (it ? it.name : g.id) + " back into your 🏠 storage."
      : "Took " + g.n + " × " + (it ? it.name : g.id) + " back into your 🎒 Bag.");
    sfx("pop");
  }

  function shopNameSheet() {
    return sheet("✏️ Name your shop",
      '<p class="sub">Whatever you call it is what the rest of the family sees above your shelf.</p>' +
      '<div class="name-row"><input id="shop-input" maxlength="20" value="' + esc(stallName()) +
      '" aria-label="Shop name"></div>' +
      '<p style="margin:0.8rem 0 0"><button class="act" id="shop-go" style="--ac:var(--green);width:100%">' +
      '<span class="em">🏬</span>Put up the sign</button></p>');
  }

  function clearSales() {
    S.stall.sales = [];
    save();
    render();
    sfx("pop");
  }

  /* Every OTHER player's shelf, read straight out of their save. */
  function familyStalls() {
    return D.PROFILES.filter(function (p) { return p.id !== who; }).map(function (p) {
      var s = readSlot(p.id);
      if (!s || !s.stall || !Array.isArray(s.stall.goods) || !s.stall.goods.length) return null;
      return { p: p, name: (s.stall.name || "").trim() || (p.name + "'s Corner"), goods: s.stall.goods };
    }).filter(Boolean);
  }

  /* Paying the shopkeeper. This is the only write into somebody else's
     valley, and it re-reads their shelf first so two tabs cannot sell the
     same cookie twice. */
  function payStall(deal) {
    var seller = readSlot(deal.seller);
    if (!seller || !seller.stall || !Array.isArray(seller.stall.goods)) return false;
    var g = seller.stall.goods[deal.gi];
    if (!g || g.id !== deal.item.id || g.price !== deal.item.cost || g.n <= 0) return false;
    g.n--;
    if (g.n <= 0) seller.stall.goods.splice(deal.gi, 1);
    seller.coins = (seller.coins || 0) + deal.item.cost;
    if (seller.stats) {
      seller.stats.coinsEarned = (seller.stats.coinsEarned || 0) + deal.item.cost;
      seller.stats.sold = (seller.stats.sold || 0) + 1;
      seller.stats.soldCoins = (seller.stats.soldCoins || 0) + deal.item.cost;
    }
    if (!Array.isArray(seller.stall.sales)) seller.stall.sales = [];
    seller.stall.sales.push({ from: who, id: deal.item.id, price: deal.item.cost, day: D.dayNumber() });
    while (seller.stall.sales.length > 20) seller.stall.sales.shift();
    writeSlot(deal.seller, seller);
    return true;
  }

  /* =========================================================
     THE PRIZE WHEEL — one free spin a day, eight equal slices.
     The slices are equal ON PURPOSE: when it stops, the sheet
     says "one slice out of eight", which is a fraction you can
     see with your eyes before you can do it on paper.
     ========================================================= */
  var wheelAngle = 0, spinning = false;

  function spunToday() { return S.spinDay === D.dayNumber(); }

  function wheelHtml() {
    var n = D.WHEEL.length, seg = 360 / n;
    var stops = D.WHEEL.map(function (w, i) {
      return w.colour + " " + (i * seg) + "deg " + ((i + 1) * seg) + "deg";
    }).join(",");
    var labels = D.WHEEL.map(function (w, i) {
      var a = i * seg + seg / 2;
      return '<span class="wlabel" style="transform:translate(-50%,-50%) rotate(' + a +
        "deg) translateY(calc(var(--r) * -0.335)) rotate(" + (-a) + 'deg)">' + w.label + "</span>";
    }).join("");
    var done = spunToday();
    return '<div class="panel"><h2>🎡 The prize wheel</h2>' +
      '<p class="sub">One free spin every single day. Eight slices, all exactly the same size — ' +
      "so every slice is a <b>1 in 8</b> chance, including the 💎.</p>" +
      '<div class="wheelwrap">' +
        '<span class="wheelpin" aria-hidden="true">▼</span>' +
        '<div class="wheel' + (spinning ? " spinning" : "") + '" id="wheel" aria-hidden="true" ' +
          'style="background:conic-gradient(' + stops + ');transform:rotate(' + wheelAngle + 'deg)">' +
          labels +
        "</div>" +
        '<span class="wheelhub" aria-hidden="true">🎡</span>' +
      "</div>" +
      (done
        ? '<p class="sub" style="text-align:center"><b>Today\'s spin is used up.</b> ' +
          "The wheel resets overnight — come back tomorrow. Spun " + (S.stats.spin || 0) +
          " time" + ((S.stats.spin || 0) === 1 ? "" : "s") + " so far.</p>"
        : '<p style="margin:0.6rem 0 0"><button class="act" data-spin="1"' + (spinning ? " disabled" : "") +
          ' style="--ac:var(--pink);width:100%"><span class="em">🎡</span>' +
          (spinning ? "Spinning…" : "Spin the wheel — free!") + "</button></p>") +
    "</div>";
  }

  function spinWheel() {
    if (spinning || spunToday()) return;
    var n = D.WHEEL.length, seg = 360 / n;
    var idx = Math.floor(Math.random() * n);
    // Wind it up so the winning slice ends under the pointer at the top.
    var here = ((wheelAngle % 360) + 360) % 360;
    var want = ((-(idx * seg + seg / 2)) % 360 + 360) % 360;
    var target = wheelAngle + 360 * 5 + ((((want - here) % 360) + 360) % 360);

    spinning = true;
    S.spinDay = D.dayNumber();          // claimed the moment it starts, so a
    bump("spin");                       // reload mid-spin cannot win it twice
    save();
    render();                           // draws the wheel still at its old angle
    sfx("pop");

    // A transition needs a FROM and a TO. The wheel has just been drawn at
    // the old angle, so hand the browser a frame with it before moving.
    var el = $("#wheel");
    wheelAngle = target;
    if (el && !calm) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          el.style.transform = "rotate(" + target + "deg)";
        });
      });
    } else if (el) {
      el.style.transform = "rotate(" + target + "deg)";
    }

    // Whose spin this is. Switching player mid-spin must not drop the
    // prize into the next person's purse.
    var spinner = who;
    var wait = calm ? 350 : 4300;       // no long ride for anyone who asked for less motion
    setTimeout(function () {
      if (who !== spinner) return;      // they walked away; the day is still spent
      spinning = false;
      awardSpin(D.WHEEL[idx], idx);
    }, wait);
  }

  function awardSpin(prize, idx) {
    earn(prize.coins);
    var extra = "";
    if (prize.xp) { giveXp(prize.xp); extra += '<p class="sub">⭐ ' + prize.xp + " XP for " + esc(S.pet.name) + ".</p>"; }
    if (prize.treat) {
      var treats = D.FOODS.filter(function (f) { return f.cost >= 14; });
      var food = treats[Math.floor(Math.random() * treats.length)];
      addItem(food.id);
      extra += '<p class="sub">🎁 A ' + food.emoji + " <b>" + esc(food.name) +
        "</b> for the bag, too.</p>";
    }
    if (prize.jackpot) {
      S.everJackpot = true;
      diary("💎", "The prize wheel landed on the diamond! " + prize.coins + " coins, just like that.");
      try { window.Confetti && Confetti.burst({ count: 140 }); } catch (e) {}
    }
    checkTrophies();
    save();
    render();
    var t = tier();
    var chance = (t === "tot" || t === "early")
      ? "The wheel has <b>8</b> slices and it stopped on <b>1</b> of them."
      : "One slice out of eight — a <b>1 in 8</b> chance, or <b>1/8</b>" +
        (t === "mid" ? "." : ", which is <b>12.5%</b>. Every slice had exactly the same chance.");
    openSheet(sheet("🎡 " + prize.label + "!",
      '<p class="sub" style="font-size:1.1rem;text-align:center">You won <b>🪙 ' + prize.coins +
        "</b>!</p>" + extra +
      '<p class="teach"><b>How likely was that? </b>' + chance + "</p>" +
      '<p class="sub" style="margin-top:0.5rem">Come back tomorrow for another free spin.</p>'));
    narrate(["wheel-" + idx]);
    sfx(prize.jackpot ? "win" : "coin");
  }

  /* =========================================================
     THE MARKET — buying is a maths lesson wearing a hat.
     From the Middle level up, the shopkeeper asks you to work
     out your change before handing anything over. Get it wrong
     and you still get the item — you just miss the tip.
     ========================================================= */
  /* Everyone with a Craepet on this device. Rare finds are only ever dealt
     to people who actually play, so a find can never land somewhere nobody
     will ever open. */
  function activePlayers() {
    return D.PROFILES.filter(function (p) {
      if (p.id === who) return true;
      var s = readSlot(p.id);
      return !!(s && s.pet);
    }).map(function (p) { return p.id; });
  }
  /* This player's shelf: their own shuffle of the ordinary stock, plus
     whichever rare finds the valley sent their way this morning. */
  function myStock() {
    return D.shopStock(null, who).concat(D.rareFor(who, null, activePlayers()));
  }

  function itemCard(it, extra) {
    var owned = alreadyOwned(it);
    var afford = S.coins >= it.cost;
    var pic = it.kind === "brush"
      ? '<span class="brushdot" style="background:' + it.swatch + '"></span>'
      : it.kind === "petpet"
      ? '<img alt="" class="ppchip" src="' + P.petpetChip(it.id, 40) + '">'
      : '<span class="pic">' + it.emoji + "</span>";
    var have = !owned && S.bag[it.id] ? '<span class="own">have ' + S.bag[it.id] + "</span>" : "";
    if (it.seasonal && CAL) have += '<span class="own">' + CAL.SEASONS[it.seasonal].emoji + " in season · a fifth off</span>";
    if (it.season && CAL) have += '<span class="own">' + CAL.SEASONS[it.season].emoji + " only in " + esc(CAL.SEASONS[it.season].name.toLowerCase()) + "</span>";
    if (it.kind === "food" && loves(it.id)) have += '<span class="own">💛 ' + esc(S.pet.name) + "'s favourite</span>";
    return '<button class="item' + (it.rare ? " rare" : "") + '" data-buy="' + esc(it.id) + '"' +
      (!afford || owned ? " disabled" : "") + ">" +
      pic + '<span class="nm">' + esc(it.name) + "</span>" +
      '<span class="what">' + esc(itemBlurb(it)) + "</span>" +
      (owned ? '<span class="own">✔ owned</span>' : '<span class="price">🪙 ' + it.cost + "</span>") +
      have + (extra || "") +
    "</button>";
  }

  /* The Market's shelves. With several hundred things in the valley the
     stall deals out a lot every morning, so it is sorted into proper
     labelled shelves — one flat grid of forty cards is a wall, not a
     shop. Anything that somehow has no shelf still gets shown. */
  var SHELVES = [
    { kind: "food",  name: "🍎 Food & treats", note: "Fills the tummy, and the sweet ones lift the mood." },
    { kind: "care",  name: "🧼 Wash & rest",   note: "Soap, sponges and things to sleep under." },
    { kind: "toy",   name: "🧸 Toys",          note: "Yours for good, and they keep boredom away all day." },
    { kind: "book",  name: "📚 Books",         note: "Read once for a real fact and a lump of experience." },
    { kind: "decor", name: "🏠 Furniture",     note: "Goes to your 🏠 House, to stand where you can see it." },
    { kind: "wear",  name: "👒 Dress-up",      note: "Hats, glasses and scarves your Craepet wears everywhere it goes. Yours for good." },
    { kind: "petpet", name: "🐾 Petpets",      note: "A little friend that follows your Craepet about the room. Give it a name!" },
    { kind: "brush", name: "🖌️ Paint brushes", note: "A brand new colour for your Craepet." }
  ];

  function shelvesHtml(stock, extra) {
    var used = {};
    var out = SHELVES.map(function (sh) {
      var mine = stock.filter(function (it) { return it.kind === sh.kind; });
      if (!mine.length) return "";
      mine.forEach(function (it) { used[it.id] = true; });
      return '<h3 class="shelf">' + sh.name +
        ' <small>' + mine.length + "</small></h3>" +
        '<p class="sub shelfnote">' + sh.note + "</p>" +
        '<div class="items">' + mine.map(function (it) { return itemCard(it, extra); }).join("") + "</div>";
    }).join("");
    var rest = stock.filter(function (it) { return !used[it.id]; });
    if (rest.length) {
      out += '<h3 class="shelf">✨ Odds and ends</h3><div class="items">' +
        rest.map(function (it) { return itemCard(it, extra); }).join("") + "</div>";
    }
    return out;
  }

  function marketHtml() {
    var stock = D.shopStock(null, who);
    var cards = shelvesHtml(stock);
    var mineRare = D.rareFor(who, null, activePlayers());
    var elsewhere = D.rareElsewhere(who, null, activePlayers());

    // The rare shelf. This is the whole reason family shops matter: what
    // is here today is here for YOU and for nobody else in the valley.
    var rarePanel = '<div class="panel"><h2>🌟 Today\'s rare finds</h2>' +
      '<p class="sub">Four rare things turn up in the valley every morning, and each one goes to ' +
      "<b>one person's Market only</b>. Nobody else can buy it — unless you put it on your " +
      "🏬 <b>Stall</b> and sell it to them.</p>" +
      (mineRare.length
        ? '<div class="items">' + mineRare.map(function (it) {
            return itemCard(it, '<span class="own">🌟 only in your Market</span>');
          }).join("") + "</div>"
        : '<p class="sub">Nothing rare came your way today — but somebody in the family got ' +
          "something. Go and look at their shelf.</p>") +
      (elsewhere.length
        ? '<p class="sub" style="margin-top:0.8rem">Elsewhere in the valley today: ' +
          elsewhere.map(function (r) {
            var p = D.profile(r.owner);
            return r.item.emoji + " <b>" + esc(r.item.name) + "</b> (" + p.emoji + " " + esc(p.name) + ")";
          }).join(" · ") + ". Ask them to stock it!</p>"
        : "") +
    "</div>";

    return bankHtml() + '<div class="panel">' +
      "<h2>🏪 The Market</h2>" + npcHtml("market") +
      '<p class="sub"><b>' + stock.length + " things on the shelves today</b>, out of the <b>" +
        (D.FOODS.length + D.TOYS.length + D.CARE.length + D.BOOKS.length + D.FURNITURE.length) +
        "</b> in the valley — fresh stock every morning, and <b>everybody's shelf is different</b>, so " +
        "what you cannot find here might be sitting in somebody else's shop. You have 🪙 " + S.coins + ".</p>" +
      cards +
      '<p class="sub" style="margin-top:0.8rem">Everything you buy lands in your 🎒 <b>Bag</b> — ' +
        "food for 🍽️ Feed, toys for 🎾 Play, soap for 🫧 Wash, pillows for 😴 Rest and books for 📖 Read. " +
        "🏠 <b>Furniture</b> goes to your House instead, to put out where you can see it.</p>" +
      '<p class="sub">🧸 Toys, 🏠 furniture and 🖌️ brushes are <b>yours for good</b>, so the shop will only sell you one of each. ' +
        "The 🌈 Rainbow Pool gives a free brush away every 15 right answers.</p>" +
    "</div>" + rarePanel + familyStallsHtml();
  }

  /* The rest of the family's shelves, sitting under the Market's own.
     This is the other side of your 🏬 Stall: what they price, you pay. */
  function familyStallsHtml() {
    var stalls = familyStalls();
    if (!stalls.length) {
      return '<div class="panel"><h2>🏬 Family shops</h2>' +
        '<p class="sub">Nobody else has anything on their shelf right now. Open your own at the ' +
        "🏬 <b>Stall</b> tab — put something from your bag out at your own price and the rest of " +
        "the family can buy it from here.</p></div>";
    }
    // What today's Market already offers this player, so a shelf can say
    // "you can't buy this anywhere else" and be telling the truth.
    var mineToday = {};
    myStock().forEach(function (it) { mineToday[it.id] = true; });
    return stalls.map(function (st) {
      var cards = st.goods.map(function (g, i) {
        var it = D.itemById(g.id);
        if (!it) return "";
        var owned = alreadyOwned(it);
        var afford = S.coins >= g.price;
        var note = g.price < it.cost ? "cheaper than the Market!"
          : g.price === it.cost ? "the same as the Market"
          : "🪙 " + (g.price - it.cost) + " over the Market price";
        // The line that makes a family shop worth walking into.
        var scarce = it.rare && !mineToday[it.id];
        return '<button class="item' + (it.rare ? " rare" : "") + '" data-stallbuy="' +
          esc(st.p.id) + ":" + i + '"' + (!afford || owned ? " disabled" : "") + ">" +
          '<span class="pic">' + it.emoji + "</span>" +
          '<span class="nm">' + esc(it.name) + "</span>" +
          '<span class="what">' + esc(itemBlurb(it)) + "</span>" +
          (owned ? '<span class="own">✔ owned</span>' : '<span class="price">🪙 ' + g.price + "</span>") +
          '<span class="own">' + (scarce ? "🌟 you can't buy this anywhere else" : esc(note)) + "</span>" +
          '<span class="own">' + g.n + " left</span></button>";
      }).join("");
      return '<div class="panel"><h2>' + st.p.emoji + " " + esc(st.name) + "</h2>" +
        '<p class="sub">' + esc(st.p.name) + " set these prices. Every coin you spend here goes " +
        "straight into " + esc(st.p.name) + "'s purse.</p>" +
        '<div class="items">' + cards + "</div></div>";
    }).join("");
  }

  function tryBuy(id) {
    var stock = myStock();
    var it = null;
    for (var i = 0; i < stock.length; i++) if (stock[i].id === id) it = stock[i];
    if (!it || S.coins < it.cost) return;
    // Never take coins for something you already keep forever.
    if (alreadyOwned(it)) { toast("You already own " + it.name + "!"); return; }
    askChange({ item: it, seller: null });
  }

  /* Buying off another player's shelf. Same shopkeeper's question, but the
     price is one THEY chose and the coins end up in THEIR purse. */
  function tryStallBuy(ref) {
    var bits = String(ref).split(":");
    var sellerId = bits[0], gi = Number(bits[1]);
    var seller = readSlot(sellerId);
    if (!seller || !seller.stall || !seller.stall.goods) return;
    var g = seller.stall.goods[gi];
    if (!g || g.n <= 0) { toast("That one has just been sold!"); render(); return; }
    var base = D.itemById(g.id);
    if (!base) return;
    // a copy of the item at the shopkeeper's price, not the Market's
    var it = {};
    for (var k in base) it[k] = base[k];
    it.cost = g.price;
    it.kind = base.kind || D.kindOf(g.id);
    if (S.coins < it.cost) return;
    if (alreadyOwned(it)) { toast("You already own " + it.name + "!"); return; }
    askChange({ item: it, seller: sellerId, gi: gi });
  }

  /* The shopkeeper's change question, wherever you are shopping. */
  function askChange(deal) {
    var it = deal.item;
    var t = tier();
    if (t === "tot" || t === "early") return finishBuy(deal, 0);

    var left = S.coins - it.cost;
    var wrong = D._u.nearMiss(left, Math.max(3, Math.round(it.cost * 0.4)))
      .map(function (n) { return "🪙 " + n; });
    var q = D._u.mk({
      subject: "math",
      q: "You have 🪙 " + S.coins + " and this costs 🪙 " + it.cost + ". How much will you have left?",
      right: "🪙 " + left, wrong: wrong,
      teach: S.coins + " − " + it.cost + " = " + left + "."
    }, t);
    pendingBuy = { deal: deal, q: q, correct: "🪙 " + left };
    openSheet(sheet("🧾 " + esc(it.name) + " — 🪙 " + it.cost,
      '<div class="qcard"><p class="qprompt">' + esc(q.q) + "</p>" +
      '<div class="choices" role="group" aria-label="Answers">' + q.choices.map(function (c, i) {
        return '<button class="choice" data-change="' + i + '" aria-label="' + esc((i + 1) + ". " + c.t) + '">' +
               '<span class="keycap" aria-hidden="true">' + (i + 1) + "</span>" + esc(c.t) + "</button>";
      }).join("") + "</div></div>"));
  }

  function answerChange(idx) {
    if (!pendingBuy) return;
    var ok = idx === pendingBuy.q.answer;
    var deal = pendingBuy.deal;
    var it = deal.item;
    var teach = pendingBuy.q.teach;
    pendingBuy = null;
    // Never tip more than half the price: buying a 4-coin blueberry must
    // not be a way to MAKE money, or the shop stops meaning anything.
    var tip = Math.min(5, Math.floor(it.cost / 2));
    if (ok) {
      bump("correct");
      sfx("coin");
      toast("Correct! The shopkeeper tips you 🪙 " + tip + ".");
    } else {
      sfx("nope");
      toast("Not quite — " + teach);
    }
    finishBuy(deal, ok ? tip : 0);
  }

  function finishBuy(deal, tip) {
    var it = deal.item;
    // Buying off a family shelf has to move the goods AND the coins first —
    // if their shelf changed under us, nobody is charged for anything.
    if (deal.seller && !payStall(deal)) {
      closeSheet();
      render();
      toast("That one has just been sold!");
      return;
    }
    S.coins -= it.cost;
    if (tip) earn(tip);
    if (it.rare) S.everRare = true;
    bump("buy");
    if (deal.seller) {
      // Furniture off a family shelf still belongs in the house, not the bag.
      var sk = it.kind || D.kindOf(it.id);
      if (sk === "decor") {
        if (S.house.owned.indexOf(it.id) === -1) S.house.owned.push(it.id);
        if (slotsFree() > 0 && S.house.placed.indexOf(it.id) === -1) {
          S.house.placed.push(it.id);
          bump("placed");
        }
      } else if (sk === "wear") {
        if (S.wardrobe.indexOf(it.id) === -1) S.wardrobe.push(it.id);
      } else if (sk === "petpet") {
        adoptPetpet(it.id);
      } else {
        addItem(it.id);
      }
      closeSheet();
      checkTrophies();
      save();
      render();
      toast("Bought " + it.emoji + " " + it.name + " from " + D.profile(deal.seller).name +
            " for 🪙 " + it.cost + ". " + whereItWent(it));
      sfx("coin");
      return;
    }
    // Furniture is not carried around: it goes straight home.
    if (it.kind === "decor") {
      if (S.house.owned.indexOf(it.id) === -1) S.house.owned.push(it.id);
      var room = slotsFree() > 0;
      if (room) { S.house.placed.push(it.id); bump("placed"); }
      closeSheet();
      checkTrophies();
      save();
      render();
      openSheet(sheet(it.emoji + " " + esc(it.name),
        '<p class="sub">' + esc(itemBlurb(it)) + "</p>" +
        (room
          ? '<p class="sub">It is out in your <b>' + esc(houseInfo().name) +
            "</b> already — go to 🏠 <b>House</b> to move it about.</p>"
          : '<p class="sub">Your <b>' + esc(houseInfo().name) + "</b> is full, so it is in storage. " +
            "Put something else away at 🏠 <b>House</b>, or move somewhere bigger.</p>") +
        '<p style="margin:0.8rem 0 0"><button class="ghost" data-goto="home" data-close="1">🏠 Go to your House</button></p>'));
      sfx("coin");
      return;
    }
    // A petpet goes straight out to meet its Craepet, and gets a name.
    if (it.kind === "petpet") {
      adoptPetpet(it.id);
      closeSheet();
      save();
      render();
      openSheet(petpetNameSheet());
      sfx("win");
      return;
    }
    // Clothes go in the wardrobe, and the shop offers to put them straight on.
    if (it.kind === "wear") {
      if (S.wardrobe.indexOf(it.id) === -1) S.wardrobe.push(it.id);
      closeSheet();
      checkTrophies();
      save();
      render();
      var tryOn = {}; P.SLOTS.forEach(function (k) { tryOn[k] = S.pet.wear ? S.pet.wear[k] : null; }); tryOn[it.slot] = it.id;
      openSheet(sheet(it.emoji + " " + esc(it.name),
        '<p style="text-align:center;margin:0"><img alt="" class="try big" src="' +
          P.chip(S.pet.species, S.pet.colour, 96, tryOn, level()) + '"></p>' +
        '<p class="sub" style="text-align:center">Put it on ' + esc(S.pet.name) + " right now?</p>" +
        '<p><button class="act" data-use="wear:' + esc(it.id) + '" style="--ac:#d99000;width:100%">' +
        '<span class="em">👒</span>Put it on</button></p>'));
      sfx("coin");
      return;
    }
    if (it.kind === "brush") {
      if (S.colours.indexOf(it.colour) === -1) S.colours.push(it.colour);
      closeSheet();
      checkTrophies();
      save();
      render();
      openSheet(sheet("🖌️ " + esc(it.name),
        '<p class="sub">Paint ' + esc(S.pet.name) + " " + esc(P.colour(it.colour).name) + " right now?</p>" +
        '<p><button class="act" data-use="brush:' + esc(it.colour) + '" style="--ac:var(--purple);width:100%">' +
        '<span class="em">🎨</span>Paint ' + esc(S.pet.name) + "</button></p>"));
      return;
    }
    addItem(it.id);
    closeSheet();
    checkTrophies();
    save();
    render();
    toast("Bought " + it.emoji + " " + it.name + "! " + whereItWent(it));
    sfx("coin");
  }

  /* =========================================================
     THE BAG
     ========================================================= */
  function bagHtml() {
    var groups = [
      { kind: "food", title: "🍽️ Food", note: "Tap to feed " + esc(S.pet.name) + ". Food is eaten up." },
      { kind: "toy",  title: "🧸 Toy shelf",
        note: "Yours for good — play with these as often as you like. " +
              "They also keep " + esc(S.pet.name) + " from getting bored while the game is closed." },
      { kind: "care", title: "🧼 Soap, baths & bedtime", note: "Cleans, or puts energy back. Used up when you use it." },
      { kind: "book", title: "📚 Books", note: "Read once for a real fact and a big lump of XP." }
    ];
    var any = false;
    var sections = groups.map(function (g) {
      var ids = bagOf(g.kind);
      if (!ids.length) return "";
      any = true;
      return "<h3 style=\"margin:1rem 0 0.2rem\">" + g.title + "</h3>" +
        '<p class="sub" style="margin:0 0 0.5rem">' + g.note + "</p>" +
        '<div class="items">' + ids.map(function (id) {
          return itemButton(id, g.kind === "toy" ? "owned" : "×" + S.bag[id]);
        }).join("") + "</div>";
    }).join("");

    var brushes = P.COLOURS.filter(function (c) { return S.colours.indexOf(c.id) !== -1; });
    var wear = S.pet.wear || {};
    var clothes = (S.wardrobe || []).map(P.wearById).filter(Boolean);

    return '<div class="panel">' +
      "<h2>🎒 Your bag</h2>" +
      (any
        ? '<p class="sub">Everything you have bought or found lives here. Tap anything to use it on ' +
          esc(S.pet.name) + ".</p>" + sections
        : '<p class="sub">Your bag is empty. The 🍓 Farm drops food, the 📖 Well turns up books, ' +
          "and the 🏪 Market sells everything else.</p>") +
    "</div>" + petpetsHtml() +
    '<div class="panel">' +
      "<h2>👒 Wardrobe</h2>" +
      (clothes.length
        ? '<p class="sub">' + clothes.length + " of " + P.WEAR.length + " things to wear. Tap one to put it on " +
          esc(S.pet.name) + " — or tap 👒 <b>Dress</b> at the nest to try them all on.</p>" +
          '<div class="items">' + clothes.map(function (it) {
            var on = wear[it.slot] === it.id;
            return '<button class="item' + (on ? " here" : "") + '" data-use="' + (on ? "unwear:" + it.slot : "wear:" + it.id) + '">' +
              '<span class="pic">' + it.emoji + '</span><span class="nm">' + esc(it.name) + "</span>" +
              '<span class="own">' + (on ? "✔ wearing" : "on the " + it.slot) + "</span></button>";
          }).join("") + "</div>"
        : '<p class="sub">No clothes yet. The 🏪 Market has a 👒 <b>Dress-up</b> shelf with three new things every morning — ' +
          "a hat, some glasses or a scarf that " + esc(S.pet.name) + " wears everywhere, for good.</p>") +
    "</div>" +
    '<div class="panel">' +
      "<h2>🎨 Colors you own</h2>" +
      '<p class="sub">' + brushes.length + " of " + P.COLOURS.length +
        " colors. Tap one to repaint " + esc(S.pet.name) + " — it's free once you own the brush.</p>" +
      '<div class="swatches">' + brushes.map(function (c) {
        return '<button class="sw' + (c.id === S.pet.colour ? " on" : "") + '" data-paint="' + c.id +
               '" title="' + esc(c.name) + '" aria-label="' + esc(c.name) + '" style="background:' + c.swatch + '"></button>';
      }).join("") + "</div>" +
    "</div>";
  }

  /* =========================================================
     THE QUIZ ARENA — friendly duels, and the SHADOW TOWER.

     Two ways to fight. The five sparring partners are what they
     always were: answer right, land a hit; answer wrong, take
     one. The Shadow Tower is The Shade's own domain: floors that
     go up for ever, his shadow army on six of every seven, and
     The Shade himself on the seventh — darker every time round.

     What makes a duel more than a quiz with health bars:
       ⚡ three right in a row CHARGES you — the next hit is a
          critical, double damage;
       🏃 a quick answer (six seconds, big kids up) hits harder;
       🍎 two snacks a fight heal you with food from your bag;
       🤝 a family Craepet can come along and land its own hit
          every fourth right answer;
       🌑 The Shade brings a trick every fight, grows darker at
          half health, and drops loot nobody else can sell.
     Nobody can be hurt, and at the Tiny level nobody can lose.
     ========================================================= */
  var GATE = { pip: 1, mossy: 2, splash: 4, ember: 6, orbit: 9 };
  var TOWER_GATE = 3;
  var SNACKS = 2;
  var QUICK_MS = 6000;
  var TIMER_MS = { mid: 12000, big: 10000, grown: 9000 };
  var battleTimer = null;

  function maxHp() { return 40 + level() * 8; }
  /* A happy Craepet hits harder, and a house full of books harder still. */
  function myPower() {
    return 10 + level() * 2 + (mood() === "great" ? 4 : 0) + Math.round(studyBonus() * 10);
  }
  function little() { return tier() === "tot" || tier() === "early"; }
  function arena() {
    if (!S.arena || typeof S.arena !== "object") S.arena = { floor: 0, ally: null, shadeWins: 0, hoardGot: 0, hoardIds: [] };
    if (!Array.isArray(S.arena.hoardIds)) S.arena.hoardIds = [];
    return S.arena;
  }
  function bestFloor() { return arena().floor | 0; }
  function rank() { return D.rankFor(bestFloor()); }
  function subjectWord(s) {
    return { math: "maths", word: "words", wonder: "the wide world", mixed: "a bit of everything" }[s] || s;
  }
  function subjectName(s) { return { math: "🔢 Maths", word: "📖 Words", wonder: "🌍 The world" }[s] || s; }

  /* The rest of the family's Craepets, as possible allies. Read-only:
     bringing a friend never touches their save. */
  function allies() {
    return D.PROFILES.filter(function (p) { return p.id !== who; }).map(function (p) {
      var s = readSlot(p.id);
      if (!s || !s.pet) return null;
      var lv = levelFor(s.pet.xp);
      return { who: p.id, name: s.pet.name, species: s.pet.species, colour: s.pet.colour,
               wear: s.pet.wear, level: lv, owner: p, power: 6 + lv * 2 };
    }).filter(Boolean);
  }
  function allyNow() {
    var id = arena().ally;
    if (!id) return null;
    var list = allies();
    for (var i = 0; i < list.length; i++) if (list[i].who === id) return list[i];
    return null;
  }
  /* The subject this player knows least, by the heat: the Mirror trick. */
  function weakestSubject() {
    var subs = ["math", "word", "wonder"], low = 99, out = [];
    subs.forEach(function (s) {
      var r = rungOf(s);
      if (r < low) { low = r; out = [s]; } else if (r === low) out.push(s);
    });
    return out[Math.floor(Math.random() * out.length)];
  }

  /* What a rival says — a token into the narrator's script, so the
     littlest players can HEAR The Shade sneer. */
  function pickOne(a) { return a[Math.floor(Math.random() * a.length)]; }
  function lineKey(r, kind) {
    if (r.boss) {
      var wins = arena().shadeWins | 0;
      if (kind === "intro") return wins ? "a-shade-return" : pickOne(["a-shade-intro", "a-shade-intro-2", "a-shade-intro-3"]);
      if (kind === "hit") return pickOne(["a-shade-hit-1", "a-shade-hit-2", "a-shade-hit-3"]);
      if (kind === "hits") return pickOne(["a-shade-hits-1", "a-shade-hits-2", "a-shade-hits-3"]);
      if (kind === "low") return "a-shade-low";
      if (kind === "lose") return wins > 1 ? "a-shade-lose-again" : "a-shade-lose";
      return "a-shade-win";
    }
    if (r.minion) return kind === "intro" ? "a-" + r.id + "-intro" : "a-minion-" + (kind === "low" ? "hit" : kind);
    return "a-" + r.id + "-" + (kind === "low" ? "hit" : kind);
  }
  function foeLine(r, kind) {
    var k = lineKey(r, kind);
    return { tok: k, text: (L && L.T[k]) || r.taunt || "" };
  }

  function arenaHtml() {
    if (battle) return battleHtml();
    var lv = level();
    var A = arena(), best = bestFloor(), next = best + 1;
    var foe = D.towerFoe(next);
    var rk = rank(), nx = D.nextRank(best);
    var open = lv >= TOWER_GATE;

    var foeCard = '<div class="foecard' + (foe.boss ? " boss" : "") + '">' +
      '<img alt="" src="' + P.chip(foe.species, foe.colour, 72) + '">' +
      "<div><b>" + esc(foe.name) + "</b><small>" +
        (foe.boss ? "The master of the tower" : "One of The Shade's shadow army") +
        " · " + foe.hp + " HP · hits for " + foe.power + " · asks " + esc(subjectWord(foe.subject)) + "</small>" +
      '<span class="price">🪙 ' + foe.coins + " for the win</span></div></div>";

    var allyList = allies();
    var allyRow = allyList.length
      ? '<p class="sub" style="margin:0.8rem 0 0.3rem">🤝 <b>Bring a friend.</b> Every fourth right answer, a family Craepet lands a hit of its own.</p>' +
        '<div class="who-row" style="justify-content:flex-start">' +
          '<button class="who' + (!A.ally ? " on" : "") + '" data-ally="" style="--wc:#8b83a8">Just me</button>' +
          allyList.map(function (a) {
            return '<button class="who' + (A.ally === a.who ? " on" : "") + '" data-ally="' + a.who + '" style="--wc:' + a.owner.colour + '">' +
              '<img alt="" src="' + P.chip(a.species, a.colour, 22, a.wear, a.level) + '"> ' + esc(a.name) +
              " <small>Lv " + a.level + " · hits " + a.power + "</small></button>";
          }).join("") + "</div>"
      : '<p class="sub" style="margin:0.8rem 0 0">🤝 Adopt a Craepet on another profile and you can bring it along as a friend.</p>';

    var replay = "";
    if (best > 0 && open) {
      var chips = [];
      for (var f = Math.max(1, best - 6); f <= best; f++) {
        var rf = D.towerFoe(f);
        chips.push('<button class="ghost small" data-floor="' + f + '">' + (rf.boss ? "🌑 " : "") + f + " · " + esc(rf.name) + "</button>");
      }
      replay = '<p class="sub" style="margin:0.8rem 0 0.3rem">🔁 Fight a cleared floor again for 4 in 10 of the coins:</p>' +
        '<div class="swatches" style="justify-content:flex-start">' + chips.join("") + "</div>";
    }

    var tower = '<div class="panel tower">' +
      '<h2>🗼 The Shadow Tower <span class="rankchip">' + rk.emoji + " " + esc(rk.name) + "</span></h2>" +
      '<p class="sub">The Shade rules the tower, and his shadow army guards every floor. Six floors up, he is waiting — ' +
        "and every time you beat him he comes back darker, seven floors higher, for ever. " +
        (best
          ? "You have cleared <b>" + best + (best === 1 ? " floor" : " floors") + "</b>" +
            (A.shadeWins ? " and beaten The Shade <b>" + A.shadeWins + (A.shadeWins === 1 ? " time" : " times") + "</b>" : "") + "."
          : "You have not climbed it yet.") +
        (nx ? " Reach floor " + nx.floor + " for the " + nx.emoji + " <b>" + esc(nx.name) + "</b> rank." : " You hold the highest rank there is.") +
      "</p>" +
      '<p class="sub" style="margin:0 0 0.4rem"><b>Floor ' + next + "</b></p>" + foeCard +
      (open
        ? '<p style="margin:0.6rem 0 0"><button class="act" data-tower="' + next + '" style="--ac:#3a2f5c;width:100%">' +
          '<span class="em">🗼</span>Climb — fight ' + esc(foe.name) + "</button></p>"
        : '<p class="teach">🔒 The tower opens at <b>level ' + TOWER_GATE + "</b>. You are level " + lv +
          " — every right answer anywhere brings it closer.</p>") +
      allyRow + replay +
    "</div>";

    var cards = D.RIVALS.map(function (r) {
      var need = GATE[r.id] || 1;
      var isOpen = lv >= need;
      return '<button class="item" data-fight="' + r.id + '"' + (isOpen ? "" : " disabled") + ">" +
        '<img alt="" src="' + P.chip(r.species, r.colour, 56) + '" style="width:56px;image-rendering:pixelated">' +
        '<span class="nm">' + esc(r.name) + "</span>" +
        '<span class="what">' + r.hp + " HP · asks " + esc(subjectWord(r.subject)) + "</span>" +
        (isOpen ? '<span class="price">🪙 ' + r.coins + "</span>" : '<span class="own">Level ' + need + "</span>") +
      "</button>";
    }).join("");
    var spar = '<div class="panel"><h2>⚔️ Sparring partners</h2>' + npcHtml("arena") +
      '<p class="sub">Pick a rival. Every right answer is a hit; every wrong one lets them hit back. ' +
        "Your Craepet hits harder as it levels up — and harder still when it's happy.</p>" +
      '<div class="items">' + cards + "</div>" +
      '<p class="sub" style="margin-top:0.7rem">Losing costs nothing but pride. You can always try again.</p>' +
    "</div>";

    var rules = '<div class="panel"><h2>📜 How a duel works</h2><ul class="rules">' +
      "<li>✅ Every right answer is a hit. ❌ Every wrong one, they hit back.</li>" +
      "<li>⚡ Three right in a row <b>charges</b> your Craepet: the next hit is a <b>critical</b>, for double damage.</li>" +
      (little() ? "" : "<li>🏃 Answer within 6 seconds for a <b>quick bonus</b>.</li>") +
      "<li>🍎 Two <b>snacks</b> a fight: food from your bag puts health back.</li>" +
      "<li>🌑 The Shade has a <b>trick</b> every fight, and turns darker at half health.</li>" +
      "<li>😊 A happy Craepet hits harder, and a house full of study things harder still.</li>" +
      (tier() === "tot" ? "<li>👶 At the Tiny level nobody can lose — a miss just waits.</li>" : "") +
    "</ul></div>";
    return tower + spar + rules;
  }

  /* --- starting a fight --- */
  function startBattle(id) {
    var r = null;
    for (var i = 0; i < D.RIVALS.length; i++) if (D.RIVALS[i].id === id) r = D.RIVALS[i];
    if (!r || level() < (GATE[id] || 1)) return;
    beginBattle(r, { mode: "spar" });
  }
  function startTower(floor) {
    floor = floor | 0;
    if (level() < TOWER_GATE || floor < 1 || floor > bestFloor() + 1) return;
    beginBattle(D.towerFoe(floor), { mode: "tower", floor: floor, replay: floor <= bestFloor() });
  }
  function beginBattle(r, opts) {
    clearTimeout(battleTimer);
    var intro = foeLine(r, "intro");
    battle = { rival: r, foeHp: r.hp, foeMax: r.hp, myHp: maxHp(), myMax: maxHp(),
               q: null, state: "ask", chose: -1, log: intro.text, foeLine: null, over: null,
               mode: opts.mode, floor: opts.floor || 0, replay: !!opts.replay, cfg: { r: r, opts: opts },
               trick: null, phase: 1, charge: 0, snacks: SNACKS,
               ally: opts.mode === "tower" ? allyNow() : null, allyCount: 0,
               asked: 0, hits: 0, crits: 0, fx: null, calls: [] };
    if (r.boss) {
      var pool = D.TRICKS.filter(function (t) { return !little() || t.little; });
      battle.trick = pool[Math.floor(Math.random() * pool.length)];
    }
    nextBattleQuestion(true);
    bump("arena");
    view = "arena";
    render();
    var open = [intro.tok];
    if (battle.trick) open.push("a-shade-trick-" + battle.trick.id);
    narrate(open.concat(battle.q.say || [battle.q.q]));
  }

  function battleSubject(r) {
    return r.subject === "mixed" ? ["math", "word", "wonder"][Math.floor(Math.random() * 3)] : r.subject;
  }

  function nextBattleQuestion(first) {
    var b = battle;
    var subject = battleSubject(b.rival);
    if (b.trick && b.trick.id === "mirror") subject = weakestSubject();
    b.q = pickQuestion(subject);
    b.state = "ask";
    b.chose = -1;
    b.misses = 0;
    b.asked++;
    b.askedAt = Date.now();
    b.fx = null;
    b.calls = [];
    armTimer();
    if (!first) announce(b.q);
  }

  /* The Time Squeeze: answer before the bar runs out, or it counts as a
     miss. Never at the little levels. */
  function armTimer() {
    clearTimeout(battleTimer);
    battleTimer = null;
    var b = battle;
    if (!b) return;
    if (b.over || !b.trick || b.trick.id !== "time" || little()) { b.deadline = 0; return; }
    var ms = TIMER_MS[tier()] || 12000;
    b.deadline = Date.now() + ms;
    battleTimer = setTimeout(function () {
      if (battle === b && b.state === "ask" && !b.over) { b.timedOut = true; answer(-1); }
    }, ms);
  }

  function battleHtml() {
    var b = battle, r = b.rival;
    var fx = b.fx || {};
    b.fx = null;                                   // an animation plays once
    var pips = "";
    for (var i = 0; i < 3; i++) pips += '<i class="' + (i < b.charge ? "on" : "") + '"></i>';
    var chargeRow = '<span class="charge' + (b.charge >= 3 ? " ready" : "") +
      '" title="Three right in a row charges a critical hit" aria-label="charge ' + Math.min(3, b.charge) + ' of 3">' +
      pips + (b.charge >= 3 ? " ⚡ charged!" : "") + "</span>";
    var allyDots = "";
    if (b.ally) for (var j = 0; j < 4; j++) allyDots += (j < b.allyCount % 4 ? "●" : "○");
    var me = '<div class="fighter' + (fx.me ? " " + fx.me : "") + '">' +
      '<img alt="" src="' + chipOf(S.pet, 80) + '">' +
      (fx.me === "hit" && fx.dmg ? '<span class="dmg" aria-hidden="true">−' + fx.dmg + "</span>" : "") +
      "<b>" + esc(S.pet.name) + "</b><small>Lv " + level() + " · hits for " + myPower() + "</small>" +
      '<span class="hpbar"><i style="width:' + (b.myHp / b.myMax * 100) + '%"></i></span>' +
      '<small class="hpnum">' + b.myHp + " / " + b.myMax + "</small>" + chargeRow +
      (b.ally ? '<span class="allychip" title="' + esc(b.ally.name) + ' joins in every fourth right answer">' +
        '<img alt="" src="' + P.chip(b.ally.species, b.ally.colour, 22, b.ally.wear, b.ally.level) + '"> ' + esc(b.ally.name) + ' <span class="dots">' + allyDots + "</span></span>" : "") +
    "</div>";
    var foe = '<div class="fighter foe' + (r.boss ? " shade" : "") + (b.phase === 2 ? " dark" : "") + (fx.foe ? " " + fx.foe : "") + '">' +
      '<img alt="" src="' + P.chip(r.species, r.colour, 80) + '">' +
      (fx.foe === "hit" && fx.dmg ? '<span class="dmg' + (fx.crit ? " crit" : "") + '" aria-hidden="true">−' + fx.dmg +
        (fx.ally ? " −" + fx.ally : "") + "</span>" : "") +
      "<b>" + esc(r.name) + "</b><small>" + (b.mode === "tower" ? "floor " + b.floor + " · " : "") +
        "hits for " + (r.power + (b.phase === 2 ? 4 : 0)) + "</small>" +
      '<span class="hpbar"><i style="width:' + (b.foeHp / b.foeMax * 100) + '%"></i></span>' +
      '<small class="hpnum">' + b.foeHp + " / " + b.foeMax + "</small>" +
      (b.trick ? '<span class="trick">' + b.trick.emoji + " " + esc(b.trick.name) + "</span>" : "") +
    "</div>";
    var timer = "";
    if (b.deadline && b.state === "ask" && !b.over) {
      var total = TIMER_MS[tier()] || 12000, left = Math.max(0, b.deadline - Date.now());
      timer = '<div class="timerbar" role="img" aria-label="time left"><i style="animation-duration:' + total +
        "ms;animation-delay:-" + (total - left) + 'ms"></i></div>';
    }
    var foeSays = (b.foeLine && b.foeLine.text) ? '<p class="foesays">' + esc(b.foeLine.text) + "</p>" : "";
    var snack = (!b.over && b.snacks > 0 && b.myHp < b.myMax && bagOf("food").length)
      ? '<p style="margin:0.5rem 0 0;text-align:center"><button class="ghost small" data-snack="1">🍎 Snack (' +
        b.snacks + " left) — heal with food from your bag</button></p>" : "";
    var trickNote = (b.trick && b.asked <= 1 && !b.over)
      ? '<p class="teach">' + b.trick.emoji + " <b>" + esc(b.trick.name) + ":</b> " + esc(b.trick.note) + "</p>" : "";
    return '<div class="panel arena-panel' + (b.mode === "tower" ? " in-tower" : "") + '">' +
      '<div class="fighters">' + me + '<div class="vs">VS</div>' + foe + "</div>" +
      '<p class="sub log" style="text-align:center;margin:0.6rem 0 0.2rem">' + esc(b.log) + "</p>" + foeSays + trickNote +
      timer + quizHtml(b) + snack + (b.over ? battleEndHtml() : "") +
    "</div>";
  }

  function battleEndHtml() {
    var b = battle, rw = b.reward;
    var body = "";
    if (b.over === "win" && rw) {
      body = '<div class="statgrid" style="margin-top:0.7rem">' +
        '<div class="stat"><b>🪙 ' + rw.coins + "</b><small>coins</small></div>" +
        '<div class="stat"><b>⭐ ' + rw.xp + "</b><small>XP</small></div>" +
        '<div class="stat"><b>🎯 ' + b.hits + "</b><small>hits</small></div>" +
        (b.crits ? '<div class="stat"><b>⚡ ' + b.crits + "</b><small>critical" + (b.crits === 1 ? "" : "s") + "</small></div>" : "") +
      "</div>" +
      (rw.cleared ? '<p class="teach">🗼 <b>Floor ' + b.floor + " cleared!</b> " +
        (rw.rankUp ? "New arena rank: " + rw.rankUp.emoji + " <b>" + esc(rw.rankUp.name) + "</b>. " : "") +
        "The next floor is waiting.</p>" : "") +
      (rw.loot ? '<p class="teach">' + rw.loot.emoji + " <b>The Shade drops " + esc(rw.loot.name) + ".</b> " + esc(rw.loot.text) + "</p>" : "");
    }
    var next = (b.mode === "tower" && b.over === "win" && !b.replay)
      ? '<button class="act" data-tower="' + (b.floor + 1) + '" style="--ac:#3a2f5c"><span class="em">🗼</span>Climb to floor ' + (b.floor + 1) + "</button>" : "";
    var again = (b.over === "lose")
      ? '<button class="act" data-rematch="1" style="--ac:var(--pink)"><span class="em">🔁</span>Try again</button>' : "";
    return body + '<div class="acts" style="margin-top:0.8rem">' + next + again +
      '<button class="act" data-leave="1" style="--ac:var(--purple)">Back to the arena →</button></div>';
  }

  /* One exchange. `meta.quick` is whether the answer came inside the
     quick-bonus window. Returns nothing; the narrator's calls for this
     turn are left in battle.calls for answer() to read out. */
  function battleTurn(correct, meta) {
    var b = battle, r = b.rival;
    var dbl = (b.trick && b.trick.id === "double") ? 2 : 1;
    var calls = [];
    b.fx = null;
    if (correct) {
      var dmg = myPower() + Math.floor(Math.random() * 5);
      var crit = b.charge >= 3;
      var quick = !little() && !!(meta && meta.quick);
      if (quick) { dmg = Math.round(dmg * 1.25); bump("quick"); }
      if (crit) { dmg *= 2; b.charge = 0; b.crits++; bump("crit"); }
      else b.charge++;
      dmg *= dbl;
      b.foeHp = Math.max(0, b.foeHp - dmg);
      b.hits++;
      b.log = S.pet.name + (crit ? " lands a CRITICAL hit for " : " lands a hit for ") + dmg + "!" + (quick ? " 🏃 Quick!" : "");
      b.fx = { me: "lunge", foe: "hit", dmg: dmg, crit: crit, quick: quick };
      floaty("−" + dmg, crit ? "#ffe07a" : "#ffd0d6");
      sfx(crit ? "crit" : "hit");
      if (crit) calls.push("a-b-crit");
      else if (quick) calls.push("a-b-quick");
      if (b.charge === 3) calls.push("a-b-charged");
      if (b.ally && b.foeHp > 0) {
        b.allyCount++;
        if (b.allyCount % 4 === 0) {
          var ad = b.ally.power * dbl;
          b.foeHp = Math.max(0, b.foeHp - ad);
          b.log += " " + b.ally.name + " joins in for " + ad + "!";
          b.fx.ally = ad;
          calls.push("a-b-ally");
          bump("allyHits");
        }
      }
      earn(4);
      giveXp(5);
      if (b.foeHp > 0) b.foeLine = foeLine(r, (r.boss && b.foeHp < b.foeMax / 4) ? "low" : "hit");
    } else {
      var hit = tier() === "tot" ? 0 : (r.power + (b.phase === 2 ? 4 : 0) + Math.floor(Math.random() * 4)) * dbl;
      b.myHp = Math.max(0, b.myHp - hit);
      b.charge = 0;
      b.log = (b.timedOut ? "⏱️ Too slow! " : "") +
        (hit ? r.name + " hits back for " + hit + "!" : r.name + " goes easy on you.");
      b.fx = { me: hit ? "hit" : "", foe: "lunge", dmg: hit };
      if (hit) sfx("hit");
      if (b.trick && b.trick.id === "heal" && b.foeHp > 0 && b.foeHp < b.foeMax) {
        var heal = Math.min(10, b.foeMax - b.foeHp);
        b.foeHp += heal;
        b.log += " He heals " + heal + ".";
      }
      if (b.myHp > 0) b.foeLine = foeLine(r, "hits");
    }
    b.timedOut = false;
    // The Shade's second form, once, at half health
    if (r.boss && b.phase === 1 && b.foeHp > 0 && b.foeHp <= b.foeMax / 2) {
      b.phase = 2;
      b.foeLine = { tok: "a-shade-phase", text: (L && L.T["a-shade-phase"]) || "" };
      b.log += " 🌑 " + r.name + " grows darker!";
      sfx("nope");
    }
    b.after = (b.phase === 2 && b.foeLine && b.foeLine.tok === "a-shade-phase") ? ["a-shade-phase"] : [];
    if (b.foeHp <= 0) endBattle("win", b.after);
    else if (b.myHp <= 0) endBattle("lose", b.after);
    b.calls = calls;
  }

  function endBattle(result, calls) {
    var b = battle, r = b.rival;
    clearTimeout(battleTimer);
    b.deadline = 0;
    b.over = result;
    if (result === "win") {
      var coins = r.coins;
      if (b.mode === "tower" && b.replay) coins = Math.round(coins * 0.4);
      var xp = 30 + (b.mode === "tower" ? b.floor * 2 : 0);
      earn(coins);
      giveXp(xp);
      bump("arenaWin");
      S.pet.happy = clamp(S.pet.happy + 12, 0, 100);
      b.reward = { coins: coins, xp: xp, loot: null, rankUp: null, cleared: false };
      b.log = "🏆 " + r.name + " gives in — you win!";
      if (b.mode === "tower") {
        var A = arena();
        if (!b.replay && b.floor === A.floor + 1) {
          var before = rank();
          A.floor = b.floor;
          b.reward.cleared = true;
          bump("tower");
          if (A.floor > (S.stats.bestFloor || 0)) S.stats.bestFloor = A.floor;
          var after = rank();
          if (after !== before) { b.reward.rankUp = after; calls.push("a-b-new-rank"); }
          else calls.push("a-b-floor-clear");
          if (b.ally) bump("allyWins");
        }
        if (r.boss) {
          S.beatShade = true;
          if (!b.replay) {
            A.shadeWins = (A.shadeWins | 0) + 1;
            bump("shadeWin");
            b.reward.loot = shadeLoot();
          }
        }
      }
      b.foeLine = foeLine(r, "lose");
      calls.push(b.foeLine.tok);
      sfx("win");
      hop();
      try { window.Confetti && Confetti.burst({ count: r.boss ? 160 : 100 }); } catch (e) {}
      toast("You beat " + r.name + "! +🪙 " + coins);
      checkWish("duel", "any");
      if (r.boss && !b.replay) diary("🌑", "WE BEAT " + r.name.toUpperCase() + "! On floor " + b.floor + " of the Shadow Tower. I was so brave.");
      else if (b.mode === "tower" && b.reward.cleared) diary("🗼", "We cleared floor " + b.floor + " of the Shadow Tower and beat " + r.name + "." +
        (b.ally ? " " + b.ally.name + " came along and helped!" : ""));
      else if (b.mode !== "tower") diary("⚔️", "I beat " + r.name + " in the arena" + (b.crits ? " with " + b.crits + (b.crits === 1 ? " critical hit" : " critical hits") : "") + "!");
    } else {
      b.log = S.pet.name + " is worn out. Good try — " + r.name + " nods respectfully.";
      b.foeLine = foeLine(r, "win");
      calls.push("a-b-lose", b.foeLine.tok);
      earn(10);
      sfx("nope");
    }
  }

  /* What The Shade gives up: first his own colour, then his furniture,
     piece by piece, then plain coins once you have the lot. */
  function shadeLoot() {
    var A = arena();
    if (S.colours.indexOf("shadow") === -1) {
      S.colours.push("shadow");
      return { kind: "brush", name: "the Shadow paint brush", emoji: "🖌️",
               text: "His own colour, and now yours. Paint " + S.pet.name + " with it from the 🎒 Bag." };
    }
    var left = D.hoard().filter(function (f) { return A.hoardIds.indexOf(f.id) === -1; });
    if (left.length) {
      var piece = left[0];
      A.hoardIds.push(piece.id);
      A.hoardGot = A.hoardIds.length;
      if (S.house.owned.indexOf(piece.id) === -1) S.house.owned.push(piece.id);
      var room = slotsFree() > 0;
      if (room) { S.house.placed.push(piece.id); bump("placed"); }
      return { kind: "decor", name: "the " + piece.name, emoji: piece.emoji,
               text: "A piece of Shade's Hoard — furniture no Market has ever sold. " +
                     (room ? "It is out in your house already." : "It is in your house's storage.") +
                     " Piece " + A.hoardGot + " of " + D.hoard().length + "." };
    }
    earn(150);
    return { kind: "coins", name: "150 extra coins", emoji: "🪙", text: "You own every piece of his hoard, so he pays in coins." };
  }

  function rematch() {
    if (!battle || !battle.cfg) return;
    var cfg = battle.cfg;
    beginBattle(cfg.r, cfg.opts);
  }
  function leaveBattle() {
    clearTimeout(battleTimer);
    battle = null;
    hush();
    render();
  }

  /* =========================================================
     QUESTS & THE TROPHY CASE
     ========================================================= */
  function questsHtml() {
    var list = quests();
    var rows = crayonPoster() + list.map(function (q) {
      var have = S.today[q.track] || 0;
      var done = have >= q.goal;
      var claimed = !!S.claimed[q.id];
      return '<div class="quest' + (claimed ? " done" : "") + '">' +
        '<div class="qtx">' + esc(q.text) +
          '<span class="bar"><i style="width:' + Math.min(100, have / q.goal * 100) + '%"></i></span>' +
          '<small style="color:#8a82a6">' + Math.min(have, q.goal) + " / " + q.goal + "</small>" +
        "</div>" +
        (claimed
          ? '<span class="rw">✅</span>'
          : done
            ? '<button class="ghost small" data-claim="' + q.id + '">Claim 🪙 ' + q.coins + "</button>"
            : '<span class="rw">🪙 ' + q.coins + "</span>") +
      "</div>";
    }).join("");

    var gift = S.dailyGift
      ? '<p class="sub">Today\'s gift is already collected. Come back tomorrow for 🪙 ' +
        (20 + Math.min(7, (S.dayStreak || 1) + 1) * 10) + "!</p>"
      : '<p><button class="act" data-gift="1" style="--ac:var(--yellow);width:100%">' +
        '<span class="em">🎁</span>Collect today\'s gift (🪙 ' + giftCoins() + ")</button></p>";

    var days = S.dayStreak || 1;
    var dots = "";
    for (var d = 1; d <= 7; d++) dots += (d <= ((days - 1) % 7) + 1 ? "🟢" : "⚪");

    return wheelHtml() +
    '<div class="panel">' +
      "<h2>📜 Today's quests</h2>" + npcHtml("quests") +
      '<p class="sub">Three every day, the same three for everyone in the family. They reset overnight.</p>' +
      rows +
    "</div>" +
    '<div class="panel"><h2>🎁 Daily gift</h2>' +
      '<p class="sub">One free parcel a day, whether you have earned a coin or not — and it gets bigger ' +
      "every day you come back.</p>" +
      '<p class="daydots" role="img" aria-label="' + days + ' days in a row">' + dots +
        ' <b>' + days + " day" + (days === 1 ? "" : "s") + " in a row</b></p>" + gift +
      '<p class="sub" style="margin-top:0.5rem">Seven days straight and the valley throws in a free paint brush.</p>' +
    "</div>";
  }

  function claimQuest(id) {
    var list = quests();
    for (var i = 0; i < list.length; i++) {
      var q = list[i];
      if (q.id !== id) continue;
      if (S.claimed[id] || (S.today[q.track] || 0) < q.goal) return;
      S.claimed[id] = true;
      earn(q.coins);
      S.stats.quests++;
      checkTrophies();
      save();
      render();
      toast("Quest complete! +🪙 " + q.coins);
      sfx("win");
      try { window.Confetti && Confetti.burst({ count: 60 }); } catch (e) {}
      return;
    }
  }

  /* The gift grows with the day-streak — coming back tomorrow is worth
     more than coming back next week, which is exactly the point. */
  function giftCoins() { return 20 + Math.min(7, S.dayStreak || 1) * 10; }

  function dailyGift() {
    if (S.dailyGift) return;
    S.dailyGift = true;
    var coins = giftCoins();
    earn(coins);
    var food = D.FOODS[Math.floor(Math.random() * D.FOODS.length)];
    addItem(food.id);
    // A week straight earns a paint brush on top.
    var extra = "";
    if ((S.dayStreak || 0) % 7 === 0) {
      var locked = P.COLOURS.filter(function (c) { return S.colours.indexOf(c.id) === -1; });
      if (locked.length) {
        var c = locked[Math.floor(Math.random() * locked.length)];
        S.colours.push(c.id);
        extra = '<p class="sub"><b>Seven days in a row!</b> Here is a 🖌️ ' + esc(c.name) + " brush too.</p>";
      }
    }
    checkTrophies();
    save();
    render();
    var fact = factSay();
    openSheet(sheet("🎁 Today's gift",
      '<p class="sub" style="font-size:1.05rem">🪙 ' + coins + " coins and " + food.emoji + " " + esc(food.name) + "!</p>" +
      extra +
      '<p class="sub">📅 That is <b>' + (S.dayStreak || 1) + "</b> day" + ((S.dayStreak || 1) === 1 ? "" : "s") +
        " in a row. Tomorrow's gift is 🪙 " + (20 + Math.min(7, (S.dayStreak || 1) + 1) * 10) + ".</p>" +
      '<p class="teach"><b>Did you know? </b>' + esc(fact.text) + "</p>"));
    sfx("coin");
    narrate(["fact-intro", fact.tok]);
  }

  function caseHtml() {
    var st = S.stats;
    var trophies = D.TROPHIES.map(function (t) {
      var got = S.trophies.indexOf(t.id) !== -1;
      return '<div class="trophy' + (got ? "" : " locked") + '">' +
        '<span class="em">' + t.emoji + "</span><b>" + esc(t.name) + "</b><small>" + esc(t.note) + "</small></div>";
    }).join("");

    var subjects = [["math", "🔢 Maths"], ["word", "📖 Words"], ["wonder", "🌍 World"]];
    var stats = [
      ["✅", st.correct, "right"],
      ["🎯", (st.correct + st.wrong) ? Math.round(st.correct / (st.correct + st.wrong) * 100) + "%" : "—", "accuracy"],
      ["🔥", st.best, "best streak"],
      ["🪙", st.coinsEarned, "coins earned"],
      ["🏅", st.arenaWin, "arena wins"],
      ["📚", st.read, "books read"],
      ["🔁", st.fixed || 0, "put right"],
      ["📅", st.bestDayStreak || 0, "best day run"],
      ["🗼", bestFloor(), "tower floor"],
      ["⚡", st.crit || 0, "critical hits"],
      ["🔥", st.heat || 0, "heat rungs climbed"]
    ].map(function (s) {
      return '<div class="stat"><b>' + s[0] + " " + s[1] + "</b><small>" + s[2] + "</small></div>";
    }).join("") + subjects.map(function (s) {
      return '<div class="stat"><b>' + (st.bySubject[s[0]] || 0) + "</b><small>" + s[1] + "</small></div>";
    }).join("");

    var fam = D.PROFILES.map(function (p) {
      var s = (p.id === who) ? S : readSlot(p.id);
      if (!s || !s.pet) {
        return '<div class="fam empty"><div style="font-size:2rem">' + p.emoji + "</div>" +
               "<b>" + esc(p.name) + "</b><small>no pet yet</small></div>";
      }
      var lv = levelFor(s.pet.xp);
      var fl = (s.arena && s.arena.floor) | 0, rk = D.rankFor(fl);
      var post = p.id === who
        ? '<small>that\'s you</small>'
        : '<button class="ghost small" data-visit="' + p.id + '" aria-label="Visit ' + esc(p.name) + "'s house\">🏡 Visit</button>" +
          '<button class="ghost small" data-post="' + p.id + '" aria-label="Post a present to ' + esc(p.name) + '">🎁 Post</button>';
      return '<div class="fam"><img alt="" src="' + chipOf(s.pet, 54) + '">' +
        "<b>" + esc(s.pet.name) + "</b><small>" + esc(p.name) + " · Lv " + lv + "</small>" +
        "<small>" + ((s.stats && s.stats.correct) || 0) + " right</small>" +
        "<small>" + rk.emoji + " " + esc(rk.name) + (fl ? " · floor " + fl : "") + "</small>" + post + "</div>";
    }).join("");

    /* --- 🧠 the trivia log ---------------------------------------
       The tracker's own page: how much of the vault this player has
       actually met, how much of it they have met more than once, and
       how much is still out there waiting. */
    var rows = [];
    if (S.seen) Object.keys(S.seen).forEach(function (k) { rows.push(S.seen[k]); });
    var met = rows.length;
    var again = rows.filter(function (r) { return r[0] > 1; }).length;
    var cold = rows.filter(function (r) { return r[1] >= 2; }).length;
    var never = rows.filter(function (r) { return r[1] === 0; }).length;
    var vaultSize = (D.WRITTEN && D.WRITTEN.all) || 0;
    var bar = vaultSize ? Math.min(100, Math.round(met / vaultSize * 100)) : 0;

    var log = [
      ["🧠", met, "different questions met"],
      ["🆕", S.today.newq || 0, "new ones today"],
      ["👀", again, "you have met twice or more"],
      ["🧊", cold, "you know cold"],
      ["🎯", never, "still not right once"]
    ].map(function (r) {
      return '<div class="stat"><b>' + r[0] + " " + r[1] + "</b><small>" + r[2] + "</small></div>";
    }).join("");

    var logPanel = '<div class="panel"><h2>🧠 Trivia log</h2>' +
      '<p class="sub">The game remembers every question it has ever asked you, so it can go ' +
      "looking for one you have <b>never seen</b> — and the card always says which it is: " +
      '<b>🆕 brand new</b> or <b>👀 seen before</b>.</p>' +
      '<div class="statgrid">' + log + "</div>" +
      '<div class="vaultbar" role="img" aria-label="' + met + " of " + vaultSize +
        ' hand-written questions met"><i style="width:' + bar + '%"></i></div>' +
      '<p class="sub" style="margin:0.45rem 0 0">There are <b>' + vaultSize +
      "</b> hand-written questions in the vault — plus sums, spellings and letters that are " +
      "made fresh every time and never run out. You have met <b>" + met + "</b> different " +
      "questions so far.</p></div>";

    return '<div class="panel"><h2>🏆 Trophy case</h2>' +
      '<p class="sub">' + S.trophies.length + " of " + D.TROPHIES.length + " earned.</p>" +
      '<div class="trophies">' + trophies + "</div></div>" +
    '<div class="panel"><h2>📊 What you have learned</h2>' +
      '<div class="statgrid">' + stats + "</div></div>" +
    logPanel +
    '<div class="panel"><h2>👨‍👩‍👧‍👦 The family valley</h2>' +
      '<p class="sub">Everyone who plays on this device has their own Craepet. 🏡 <b>Visit</b> anyone to see their room, ' +
        "their furniture and their pet in its outfit, or 🎁 <b>post a present</b> " +
        "from your bag. It waits in their post until they next play. Sent so far: <b>" +
        (st.gifts || 0) + "</b>, received: <b>" + (st.received || 0) + "</b>.</p>" +
      '<div class="family">' + fam + "</div></div>" +
    recordsHtml() + levelPickerHtml() + backupHtml();
  }

  /* --- 🏅 the family records: who holds what, across every valley --- */
  function recordsHtml() {
    var people = D.PROFILES.map(function (p) {
      var s = (p.id === who) ? S : readSlot(p.id);
      return (s && s.pet) ? { p: p, s: s } : null;
    }).filter(Boolean);
    if (people.length < 2) return "";
    var RECS = [
      ["✅", "Most right answers", function (s) { return (s.stats && s.stats.correct) || 0; }],
      ["🔥", "Longest streak of right answers", function (s) { return (s.stats && s.stats.best) || 0; }],
      ["🗼", "Highest floor of the Shadow Tower", function (s) { return (s.arena && s.arena.floor) || 0; }],
      ["⭐", "Best Sky Catch score", function (s) { return (s.catch && s.catch.best) || 0; }],
      ["🏆", "Most trophies", function (s) { return (s.trophies || []).length; }],
      ["🪙", "Richest (purse and bank together)", function (s) { return (s.coins || 0) + ((s.bank && s.bank.balance) || 0); }],
      ["📅", "Most days in a row", function (s) { return (s.stats && s.stats.bestDayStreak) || 0; }],
      ["🎁", "Most presents posted", function (s) { return (s.stats && s.stats.gifts) || 0; }]
    ];
    var rows = RECS.map(function (r) {
      var best = null, top = 0;
      people.forEach(function (x) { var v = r[2](x.s); if (v > top) { top = v; best = x; } });
      if (!best) return "";
      return '<div class="quest"><img alt="" class="recchip" src="' + chipOf(best.s.pet, 28) + '">' +
        '<div class="qtx">' + r[0] + " <b>" + esc(r[1]) + "</b><br><small>" + esc(best.s.pet.name) + " · " + esc(best.p.name) + "</small></div>" +
        '<span class="rw">' + top + "</span></div>";
    }).join("");
    if (!rows) return "";
    return '<div class="panel records"><h2>🏅 Family records</h2>' +
      '<p class="sub">Who holds what, across every valley on this device. Records change hands — go and take one.</p>' + rows + "</div>";
  }

  /* =========================================================
     HELP — the whole valley on one sheet.
     ========================================================= */
  function helpSheet() {
    var rows = [
      ["🪙", "Coins", "Every coin is earned by learning: sums at the 🍓 Farm, words at the 📖 Well, the wide world at the 🌈 Pool, any of them in the ⚔️ Arena. Five right in a row turns the heat up: harder questions, more coins."],
      ["🏡", "Your Craepet", "Feed, play, wash, rest and read at the Nest. Dress it up, grant its wishes, read its diary. It has favourite foods and a favourite place — the card says which."],
      ["🏠", "Your house", "Furniture from the 🏪 Market goes out in your house and really works: cosier, sleepier, cleaner, cleverer. Buy new homes, walls, floors and views."],
      ["🏪", "Shopping", "The Market changes every morning and everybody's is different. Put your own things on your 🏬 Stall and the family buys them at your price. The 🏦 Bank pays 3% a night."],
      ["🎮", "Games", "Sky Catch: run under the sky and catch only what the rule says. Memory Match: pairs are a sum and its answer, an animal and its baby, a word and its opposite."],
      ["⚔️", "The Arena", "Right answers hit, wrong ones get hit. Three in a row charges a critical. The 🗼 Shadow Tower goes up for ever, with The Shade on every seventh floor."],
      ["👨‍👩‍👧‍👦", "Family", "Everyone on this device has their own valley. 🏡 Visit their houses from the map or the 🏆 Case, 🎁 post them presents, bring their Craepet to the tower as an ally."],
      ["📜", "Every day", "Three quests, a free spin of the wheel, a gift that grows with your streak, fresh weather, and random events on the paths between places."],
      ["⚙️", "Levels", "Tiny (nothing to get wrong) → Little → Middle → Big Kid → Grown-up. Change it at the bottom of the Nest. 🔊 in the coin bar reads everything aloud."]
    ];
    return sheet("❓ How the valley works",
      rows.map(function (r) {
        return '<div class="helprow"><span class="em" aria-hidden="true">' + r[0] + "</span><div><b>" + esc(r[1]) + "</b><br>" + r[2] + "</div></div>";
      }).join("") +
      '<p class="sub" style="margin-top:0.6rem">On a keyboard: <b>1</b>–<b>4</b> pick an answer, <b>Enter</b> moves on, <b>Escape</b> closes a sheet, arrows move in Sky Catch.</p>');
  }

  /* =========================================================
     BACKUP — your valley as a file, so it can move between
     devices; a way to load one; and a way to start again.
     ========================================================= */
  function backupHtml() {
    var p = D.profile(who);
    var json = JSON.stringify(S);
    var href = "data:application/json;charset=utf-8," + encodeURIComponent(json);
    var file = "craepets-" + p.id + "-" + new Date().toISOString().slice(0, 10) + ".json";
    return '<div class="panel"><h2>📦 Backup &amp; move</h2>' +
      '<p class="sub">Your valley lives on <b>this device</b>. Save it as a file to keep it safe or move it to another phone or laptop, ' +
      "then load the file there. About " + Math.round(json.length / 1024) + " KB.</p>" +
      '<div class="acts">' +
        '<a class="act" download="' + esc(file) + '" href="' + href + '" style="--ac:var(--green);text-decoration:none;display:flex;align-items:center;justify-content:center;flex-direction:column"><span class="em">💾</span>Save my valley</a>' +
        '<button class="act" data-import="1" style="--ac:var(--purple)"><span class="em">📂</span>Load a valley</button>' +
        '<button class="act" data-reset="1" style="--ac:#8b83a8"><span class="em">🥚</span>Start over</button>' +
      "</div></div>";
  }
  function importSheet() {
    return sheet("📂 Load a valley",
      '<p class="sub">Pick a file you saved before, or paste what is inside it. It replaces <b>' + esc(D.profile(who).name) +
      "'s</b> valley on this device — save this one first if you want to keep it.</p>" +
      '<p><input type="file" id="import-file" accept=".json,application/json" aria-label="Choose a saved valley file"></p>' +
      '<p><textarea id="import-text" rows="4" placeholder="…or paste the file\'s contents here" aria-label="Pasted valley" style="width:100%;box-sizing:border-box;font-family:monospace;font-size:0.8rem;border:3px solid #ddd4ff;border-radius:12px;padding:0.5rem"></textarea></p>' +
      '<p style="margin:0.6rem 0 0"><button class="act" id="import-go" style="--ac:var(--purple);width:100%"><span class="em">📂</span>Load it</button></p>');
  }
  function importValley(text) {
    var s = null;
    try { s = JSON.parse(text); } catch (e) { s = null; }
    if (!s || typeof s !== "object" || s.v !== 1 || !s.pet || typeof s.pet !== "object" || !s.pet.name) {
      toast("That is not a Craepets valley file.");
      return;
    }
    try { localStorage.setItem(slot(who), JSON.stringify(s)); } catch (e) { toast("Could not save it here."); return; }
    S = load(who);
    sess = null; battle = null; visit = null; stopCatch(); stopMatch();
    view = "nest";
    closeSheet();
    passTime();
    render();
    diary("📦", "We arrived here from another device! Everything came with us.");
    save();
    toast("📦 Welcome back, " + S.pet.name + "!");
    sfx("win");
    try { window.Confetti && Confetti.burst({ count: 80 }); } catch (e) {}
  }
  function resetSheet() {
    return sheet("🥚 Start over?",
      '<p class="sub">This puts <b>' + esc(D.profile(who).name) + "'s</b> whole valley back to the beginning — " + esc(S.pet.name) +
      ", the coins, the house, the trophies, everything. It cannot be undone (save a backup first if you might want it back).</p>" +
      '<p class="sub">To be sure, type ' + esc(S.pet.name) + "'s name:</p>" +
      '<div class="name-row"><input id="reset-input" maxlength="14" aria-label="Type your Craepet\'s name to confirm" autocomplete="off"></div>' +
      '<p style="margin:0.8rem 0 0"><button class="act" id="reset-go" style="--ac:var(--pink);width:100%"><span class="em">🥚</span>Yes, start over</button></p>');
  }
  function resetValley() {
    var f = $("#reset-input");
    var typed = ((f ? f.value : "") || "").trim().toLowerCase();
    if (typed !== String(S.pet.name).trim().toLowerCase()) { toast("Type " + S.pet.name + "'s name exactly to start over."); return; }
    try { localStorage.removeItem(slot(who)); } catch (e) {}
    S = load(who);
    sess = null; battle = null; visit = null; stopCatch(); stopMatch();
    pickName = "";
    view = "nest";
    closeSheet();
    render();
    toast("🥚 A fresh valley. Pick a new Craepet!");
    sfx("pop");
  }

  /* =========================================================
     THE DIARY PAGE — read it, hear it, write in it.
     ========================================================= */
  function dayLabel(d) {
    var today = D.dayNumber(), ago = today - d;
    // the day number counts LOCAL calendar days, so rebuild a local date
    // from it — formatting UTC midnight would show yesterday in America
    var u = new Date(d * 86400000);
    var date = new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate())
      .toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
    if (ago <= 0) return "Today · " + date;
    if (ago === 1) return "Yesterday · " + date;
    return ago + " days ago · " + date;
  }
  function diaryHtml() {
    var entries = (S.diary || []).slice();
    var canWrite = tier() !== "tot" && tier() !== "early";
    // newest day first; within a day, in the order things happened
    var days = [];
    entries.forEach(function (e) { if (days.indexOf(e.d) === -1) days.push(e.d); });
    days.sort(function (a, b) { return b - a; });
    var me = D.profile(who);
    var body = days.map(function (d) {
      var rows = entries.filter(function (e) { return e.d === d; });
      return '<h3 class="diaryday">' + esc(dayLabel(d)) + "</h3>" + rows.map(function (e) {
        var when = new Date(e.t || 0).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
        return '<div class="entry' + (e.me ? " mine" : "") + '"><span class="em" aria-hidden="true">' + e.e + "</span>" +
          '<div class="etx">' + esc(e.s) + '<small>' + (e.me ? esc(me.name) + " wrote this · " : esc(S.pet.name) + " · ") + esc(when) + "</small></div>" +
          '<button class="mini" data-say="' + S.diary.indexOf(e) + '" aria-label="Read this entry aloud">🔊</button></div>';
      }).join("");
    }).join("");

    var write = canWrite
      ? '<div class="panel"><h2>✏️ Write in the diary</h2>' +
        '<p class="sub">What happened today? A sentence is plenty. It goes in with your name on it and ' +
        esc(S.pet.name) + " keeps it for ever. Written so far: <b>" + (S.stats.diary || 0) + "</b>.</p>" +
        '<div class="name-row"><input id="diary-input" maxlength="120" placeholder="Dear diary…" aria-label="Diary entry" style="width:min(420px,88vw);text-align:left">' +
        '<button class="act" id="diary-go" style="--ac:var(--purple);min-height:48px;padding:0.4rem 1rem">✏️ Write it down</button></div></div>'
      : "";

    var todayN = entries.filter(function (e) { return e.d === D.dayNumber(); }).length;
    var page = crayonDiary(entries);
    return '<div class="panel"><h2>📔 ' + esc(S.pet.name) + "'s diary</h2>" +
      '<p class="sub">' + esc(S.pet.name) + " writes down everything that happens — levelling up, wishes, " +
      "the arena, the post, the house. Tap 🔊 on any line to hear it read out." +
      (entries.length ? " <b>" + entries.length + "</b> " + (entries.length === 1 ? "entry" : "entries") + " so far." : "") + "</p>" +
      page +
      (todayN ? '<p style="margin:0 0 0.4rem"><button class="ghost small" data-say-today="1">🔊 Read me today\'s ' +
        (todayN === 1 ? "entry" : todayN + " entries") + "</button></p>" : "") +
      (entries.length ? body : '<p class="sub">Nothing written yet — go and do something!</p>') +
      "</div>" + write;
  }
  function writeDiary() {
    var f = $("#diary-input");
    var text = ((f ? f.value : "") || "").trim().slice(0, 120);
    if (!text) { toast("Write something first!"); return; }
    diary(D.profile(who).emoji, text, true);
    bump("diary");
    checkTrophies();
    save();
    render();
    toast("📔 Written down. " + S.pet.name + " will keep it safe.");
    sfx("win");
  }

  /* =========================================================
     SHEETS (the slide-up pickers)
     ========================================================= */
  function sheet(title, body) {
    return '<div class="sheet-back" id="sheet-back"><div class="sheet" role="dialog" aria-modal="true">' +
      "<h3>" + title + "</h3>" + body +
      '<button class="ghost close" data-close="1">Close</button>' +
    "</div></div>";
  }
  var sheetReturn = null;   // where the keyboard was before the sheet opened

  function openSheet(html) {
    var had = !!$("#sheet-back");
    if (!had) sheetReturn = document.activeElement;
    dropSheet();
    var wrap = document.createElement("div");
    wrap.innerHTML = html;
    document.body.appendChild(wrap.firstChild);
    // Put the keyboard inside the dialog so tabbing doesn't wander off
    // behind it, and so Escape has something obvious to return from.
    var first = document.querySelector(".sheet input, .sheet button");
    if (first && first.focus) { try { first.focus(); } catch (e) {} }
  }
  /* Re-draw the sheet that is ALREADY open, in place. Calling openSheet()
     again would tear the sheet off the page and put a new one back, which
     replays the backdrop fade and the slide-up — that is the whole screen
     flashing every time you tap +1 on a price. Swapping the innards keeps
     the backdrop, the scroll position and the keyboard exactly where they
     were, so only the numbers change. */
  function refreshSheet(html) {
    var open = $("#sheet-back");
    var box = open && $(".sheet", open);
    var wrap = document.createElement("div");
    wrap.innerHTML = html;
    var next = $(".sheet", wrap);
    if (!box || !next) return openSheet(html);
    var top = box.scrollTop;
    var here = box.contains(document.activeElement) ? sameButton(document.activeElement) : null;
    box.innerHTML = next.innerHTML;
    box.scrollTop = top;
    var back = here && $(here, box);
    if (back && back.focus) { try { back.focus(); } catch (e) {} }
  }
  /* A selector that finds the same button again after the swap, so tapping
     +1 five times in a row keeps working from the keyboard. */
  function sameButton(el) {
    var at = (el && el.attributes) || [];
    for (var i = 0; i < at.length; i++) {
      if (at[i].name.indexOf("data-") === 0) {
        return "[" + at[i].name + '="' + at[i].value.replace(/"/g, '\\"') + '"]';
      }
    }
    return null;
  }
  /* Take the sheet off the page WITHOUT forgetting what it was asking —
     the shopkeeper's change question replaces its own sheet mid-purchase. */
  function dropSheet() {
    var s = $("#sheet-back");
    if (s && s.parentNode) s.parentNode.removeChild(s);
  }
  /* Dismissing a sheet also abandons whatever it was in the middle of. */
  function closeSheet() {
    dropSheet();
    pendingBuy = null;
    pendingSale = null;
    pendingPost = null;
    if (sheetReturn && sheetReturn.focus && document.contains(sheetReturn)) {
      try { sheetReturn.focus(); } catch (e) {}
    }
    sheetReturn = null;
  }

  /* =========================================================
     ONE CLICK HANDLER FOR THE WHOLE VALLEY
     ========================================================= */
  function onClick(ev) {
    var t = ev.target;
    if (!t || !t.closest) return;

    // read-aloud on/off
    if (t.closest("[data-voice]")) {
      voiceOn = !voiceWanted();
      try { localStorage.setItem(VOICE_KEY, voiceOn ? "1" : "0"); } catch (e) {}
      hush();
      sfx("pop");
      render();
      if (voiceOn) narrate(["p-read-aloud-on"], { force: true });
      return;
    }

    if (t.closest("[data-tapegg]") && S.pet && S.pet.egg) return tapEgg();
    var partyBtn = t.closest("[data-claimparty]");
    if (partyBtn) return claimParty(partyBtn.dataset.claimparty);

    // help, and the backup tools
    if (t.closest("[data-help]")) { sfx("pop"); return openSheet(helpSheet()); }
    if (t.closest("[data-import]")) { sfx("pop"); return openSheet(importSheet()); }
    if (t.closest("#import-go")) {
      var ta = $("#import-text");
      if (ta && ta.value.trim()) return importValley(ta.value);
      toast("Choose a file or paste one first.");
      return;
    }
    if (t.closest("[data-reset]")) { sfx("pop"); return openSheet(resetSheet()); }
    if (t.closest("#reset-go")) return resetValley();

    // who's playing
    if (t.closest("[data-swap]")) { sfx("pop"); return openSheet(whoSheet()); }
    var w = t.closest("[data-who]");
    if (w) { closeSheet(); return switchTo(w.dataset.who); }

    // sheets
    var closer = t.closest && t.closest("[data-close]");
    if (closer) {
      closeSheet();
      // a sheet button may also send you somewhere ("go to your House")
      var dest0 = closer.dataset && (closer.dataset.go || closer.dataset.goto);
      if (dest0) { view = dest0; render(); }
      return;
    }
    var backdrop = t.id === "sheet-back";
    if (backdrop) return closeSheet();

    var change = t.closest && t.closest("[data-change]");
    if (change) return answerChange(Number(change.dataset.change));

    var use = t.closest && t.closest("[data-use]");
    if (use) return useItem(use.dataset.use);

    var paintBtn = t.closest && t.closest("[data-paint]");
    if (paintBtn) return paint(paintBtn.dataset.paint);

    if (!S.pet) {
      // adoption screen
      var sp = t.closest("[data-sp]");
      if (sp) { pickSpecies = sp.dataset.sp; sfx("pop"); return render(); }
      var col = t.closest("[data-col]");
      if (col) { pickColour = col.dataset.col; sfx("pop"); return render(); }
      var nm = t.closest("[data-name]");
      if (nm) { pickName = nm.dataset.name; sfx("pop"); return render(); }
      if (t.closest("#dice")) {
        pickName = D.PET_NAMES[Math.floor(Math.random() * D.PET_NAMES.length)];
        sfx("pop");
        return render();
      }
      var tr = t.closest("[data-tier]");
      if (tr) { S.tier = tr.dataset.tier; save(); sfx("pop"); return render(); }
      if (t.closest("#do-adopt")) {
        var field = $("#pet-name");
        var name = ((field ? field.value : pickName) || "").trim().slice(0, 14) || pickName;
        return adopt(name);
      }
      return;
    }

    var go = t.closest("[data-go],[data-goto]");
    if (go) {
      var dest = go.dataset.go || go.dataset.goto;
      if (dest === "catch") { dest = "games"; gamesTab = "catch"; }    // an old link into the games room
      if (dest !== view) {
        hush();
        stopCatch();
        stopMatch();
        if (["farm", "well", "pool"].indexOf(dest) === -1) sess = null;
        if (dest !== "arena") { battle = null; clearTimeout(battleTimer); }
        if (["nest", "farm", "well", "pool", "market", "stall", "arena", "quests", "games"].indexOf(dest) !== -1) lastPlace = dest;
        if (dest === "bag") { S.bagNew = {}; save(); }   // you have seen them now
        pendingSale = null;
        pendingPost = null;
        visit = null;
        view = dest;
        sfx("pop");
        render();
        // the paths between places are where things happen
        if (["farm", "well", "pool", "market", "arena", "stall", "quests", "games"].indexOf(dest) !== -1) maybeEvent();
      }
      return;
    }

    var pickBtn = t.closest("[data-pick]");
    if (pickBtn) return answer(Number(pickBtn.dataset.pick));

    if (t.closest("[data-next]")) {
      if (battle && !battle.over) nextBattleQuestion();
      else if (sess) nextQuestion();
      render();
      return;
    }

    var doBtn = t.closest("[data-do]");
    if (doBtn) return doAction(doBtn.dataset.do);

    if (t.closest("[data-rename]")) { sfx("pop"); return openSheet(renameSheet()); }
    if (t.closest("#rename-dice")) {
      var rf = $("#rename-input");
      if (rf) rf.value = D.PET_NAMES[Math.floor(Math.random() * D.PET_NAMES.length)];
      sfx("pop");
      return;
    }
    if (t.closest("#rename-go")) {
      var nf = $("#rename-input");
      var newName = ((nf ? nf.value : "") || "").trim().slice(0, 14);
      if (!newName) { toast("Give your Craepet a name first!"); return; }
      S.pet.name = newName;
      save();
      closeSheet();
      render();
      say("I'm " + newName + " now!", 3000);
      sfx("win");
      return;
    }

    var buy = t.closest("[data-buy]");
    if (buy) return tryBuy(buy.dataset.buy);

    var stallBuy = t.closest("[data-stallbuy]");
    if (stallBuy) return tryStallBuy(stallBuy.dataset.stallbuy);

    // --- your house ---
    var put = t.closest("[data-place]");
    if (put) return placeFurniture(put.dataset.place);
    var away = t.closest("[data-store]");
    if (away) return storeFurniture(away.dataset.store);
    var htab = t.closest("[data-hometab]");
    if (htab) { homeTab = htab.dataset.hometab; sfx("pop"); return render(); }
    var buyH = t.closest("[data-buyhome]");
    if (buyH) return buyHome(buyH.dataset.buyhome);
    var moveH = t.closest("[data-movehome]");
    if (moveH) return moveHome(moveH.dataset.movehome);
    var sty = t.closest("[data-style]");
    if (sty) return pickStyle(sty.dataset.style);
    if (t.closest("[data-homename]")) { sfx("pop"); return openSheet(homeNameSheet()); }
    if (t.closest("#home-go")) {
      var hf = $("#home-input");
      room().name = ((hf ? hf.value : "") || "").trim().slice(0, 22);
      save();
      closeSheet();
      render();
      toast("🏠 The sign says " + homeName() + " now.");
      sfx("win");
      return;
    }

    // --- your shop ---
    var stockIt = t.closest("[data-stock]");
    if (stockIt) return openPriceSheet(stockIt.dataset.stock);
    var priced = t.closest("[data-priced]");
    if (priced) return nudgePrice(Number(priced.dataset.priced));
    var qty = t.closest("[data-saleqty]");
    if (qty) return setSaleQty(Number(qty.dataset.saleqty));
    if (t.closest("[data-listit]")) return listForSale();
    var un = t.closest("[data-unstock]");
    if (un) return unstock(Number(un.dataset.unstock));
    if (t.closest("[data-clearsales]")) return clearSales();
    if (t.closest("[data-shopname]")) { sfx("pop"); return openSheet(shopNameSheet()); }
    if (t.closest("#shop-go")) {
      var sf = $("#shop-input");
      S.stall.name = ((sf ? sf.value : "") || "").trim().slice(0, 20);
      save();
      closeSheet();
      render();
      toast("🏬 The sign says " + stallName() + " now.");
      sfx("win");
      return;
    }

    // --- the post ---
    var postTo = t.closest("[data-post]");
    if (postTo) return openPost(postTo.dataset.post);
    var postPick = t.closest("[data-postpick]");
    if (postPick && pendingPost) { pendingPost.id = postPick.dataset.postpick; sfx("pop"); return refreshSheet(postSheet()); }
    var postNote = t.closest("[data-postnote]");
    if (postNote && pendingPost) { pendingPost.note = POST_NOTES[Number(postNote.dataset.postnote)] || POST_NOTES[0]; sfx("pop"); return refreshSheet(postSheet()); }
    if (t.closest("[data-postsend]")) return sendPost();
    if (t.closest("[data-openpost]")) return openMail();

    // --- the diary, and reading it (or the wish) out loud ---
    if (t.closest("#diary-go")) return writeDiary();
    var sayBtn = t.closest("[data-say]");
    if (sayBtn) {
      var entry = (S.diary || [])[Number(sayBtn.dataset.say)];
      if (entry) narrate([entry.s], { force: true });
      return;
    }
    if (t.closest("[data-say-wish]")) {
      var w = wishNow();
      if (w) narrate([S.pet.name + " wishes: " + wishText(w) + " " + wishHint(w)], { force: true });
      return;
    }
    if (t.closest("[data-say-today]")) {
      var todays = (S.diary || []).filter(function (e) { return e.d === D.dayNumber(); }).map(function (e) { return e.s; });
      if (todays.length) narrate(["diary-intro"].concat(todays), { force: true });
      return;
    }

    // --- visiting, and the photo booth ---
    var visitBtn = t.closest("[data-visit]");
    if (visitBtn) return startVisit(visitBtn.dataset.visit);
    if (t.closest("[data-photo]")) { sfx("pop"); return openSheet(photoSheet()); }

    // --- petpets ---
    if (t.closest("[data-ppname-open]")) { sfx("pop"); return openSheet(petpetNameSheet()); }
    var ppn = t.closest("[data-ppname]");
    if (ppn) return namePetpet(ppn.dataset.ppname);
    if (t.closest("#pp-dice")) {
      var pf = $("#pp-input");
      if (pf) pf.value = PETPET_NAMES[Math.floor(Math.random() * PETPET_NAMES.length)];
      sfx("pop");
      return;
    }
    if (t.closest("#pp-go")) {
      var pv = $("#pp-input");
      return namePetpet(pv ? pv.value : (S.pet.petpet && S.pet.petpet.name));
    }

    // --- the games room ---
    var gt = t.closest("[data-gamestab]");
    if (gt) { gamesTab = gt.dataset.gamestab; stopCatch(); stopMatch(); sfx("pop"); return render(); }
    if (t.closest("[data-catchplay]")) { closeSheet(); gamesTab = "catch"; return startCatch(); }
    if (t.closest("[data-catchstop]")) { stopCatch(); render(); return; }
    if (t.closest("[data-matchplay]")) { closeSheet(); gamesTab = "match"; return startMatch(); }
    if (t.closest("[data-matchstop]")) { stopMatch(); render(); return; }
    var mc = t.closest("[data-mc]");
    if (mc) return flipCard(Number(mc.dataset.mc));
    var sayText = t.closest("[data-say-text]");
    if (sayText) { narrate([spoken(sayText.dataset.sayText)], { force: true }); return; }

    // --- the bank ---
    var bankBtn = t.closest("[data-bank]");
    if (bankBtn) { sfx("pop"); return openSheet(bankSheet(bankBtn.dataset.bank)); }
    var bankAmt = t.closest("[data-bankamt]");
    if (bankAmt) { var ba = bankAmt.dataset.bankamt.split(":"); return moveBank(ba[0], Number(ba[1])); }

    // --- the prize wheel ---
    if (t.closest("[data-spin]")) return spinWheel();

    var fight = t.closest("[data-fight]");
    if (fight) return startBattle(fight.dataset.fight);
    var climb = t.closest("[data-tower]");
    if (climb) return startTower(Number(climb.dataset.tower));
    var floorBtn = t.closest("[data-floor]");
    if (floorBtn) return startTower(Number(floorBtn.dataset.floor));
    var allyBtn = t.closest("[data-ally]");
    if (allyBtn) { arena().ally = allyBtn.dataset.ally || null; save(); sfx("pop"); return render(); }
    if (t.closest("[data-snack]")) { sfx("pop"); return openSheet(feedSheet()); }
    if (t.closest("[data-rematch]")) return rematch();

    if (t.closest("[data-leave]")) return leaveBattle();

    var claim = t.closest("[data-claim]");
    if (claim) return claimQuest(claim.dataset.claim);

    if (t.closest("[data-gift]")) return dailyGift();

    var tier2 = t.closest("[data-tier]");
    if (tier2) {
      if (S.tier !== tier2.dataset.tier) S.adapt = {};   // a new level starts at warm-up
      S.tier = tier2.dataset.tier;
      sess = null;
      battle = null;
      clearTimeout(battleTimer);
      save();
      sfx("pop");
      return render();
    }

    // tapping the pet itself is always worth something
    if (t.closest("#scene")) {
      if (view === "visit" && visit) {
        // their Craepet says hello in its own voice; nothing of theirs changes
        if (visit.s.pet.egg) { anim.wobble = 20; sfx("knock"); say("*wobble*", 1400); return; }
        var theirs = withSave(visit.s, moodSay);
        say(theirs.text, 2600, theirs.tok);
        hop(14);
        sfx("pop");
        return;
      }
      if (S.pet.egg) return tapEgg();
      S.pet.happy = clamp(S.pet.happy + 1, 0, 100);
      var ml = moodSay();
      say(ml.text, 2600, ml.tok);
      sfx("pop");
      hop(14);
      save();
    }
  }

  /* =========================================================
     THE KEYBOARD — Jeannie and Shannon both play on a laptop, and
     answering with 1/2/3/4 and Enter is far faster than aiming a
     trackpad at a button. Escape always backs out of a sheet.
     ========================================================= */
  function onKey(ev) {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    var el = document.activeElement;
    var typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
    if (typing && el.tagName === "TEXTAREA") return;       // Enter is a new line there

    if (ev.key === "Escape") {
      hush();
      if ($("#sheet-back")) { ev.preventDefault(); closeSheet(); }
      return;
    }

    if (typing) {
      if (ev.key === "Enter") {
        ev.preventDefault();
        var go = $("#rename-go") || $("#home-go") || $("#shop-go") || $("[data-postsend]") ||
                 $("#pp-go") || $("#diary-go") || $("#reset-go") || $("#do-adopt");
        if (go) go.click();
      }
      return;
    }

    // 1-9 pick an answer (or the shopkeeper's change), wherever one is showing
    if (/^[1-9]$/.test(ev.key)) {
      var n = Number(ev.key) - 1;
      var pick = document.querySelector('[data-change="' + n + '"]') ||
                 document.querySelector('[data-pick="' + n + '"]:not([disabled])');
      if (pick) { ev.preventDefault(); pick.click(); }
      return;
    }

    if (ev.key === "Enter" || ev.key === " " || ev.key === "Spacebar") {
      // The scene is a div acting as a button, so it needs the key itself.
      if (el && el.id === "scene") { ev.preventDefault(); el.click(); return; }
      // Only take over when nothing focusable is waiting for the key itself.
      if (el && el !== document.body && el.tagName === "BUTTON") return;
      var next = document.querySelector("[data-next]");
      if (next) { ev.preventDefault(); next.click(); }
    }
  }

  function switchTo(id) {
    if (id === who) return;
    save();
    hush();
    moodLine.m = null;              // a new pet gets its own greeting
    reviewGap = 0;
    who = id;
    try { localStorage.setItem(WHO_KEY, id); } catch (e) {}
    S = load(id);
    sess = null;
    battle = null;
    visit = null;
    stopCatch();
    stopMatch();
    lastPlace = "nest";
    clearTimeout(battleTimer);
    pendingBuy = null;
    pendingSale = null;
    spinning = false;
    wheelAngle = 0;
    view = "nest";
    closeSheet();
    passTime();
    render();
    var p = D.profile(id);
    var tag = $("#tagline");
    if (tag) tag.textContent = p.hello;
    sfx("pop");
    postWaiting();
  }

  /* "You have post!" — said once, when you arrive and something is waiting. */
  function postWaiting() {
    if (!S.pet || !(S.mail || []).length) return;
    var n = S.mail.length;
    toast("📬 You have post! " + n + (n === 1 ? " parcel is" : " parcels are") + " waiting at the nest.");
    narrate(["post-arrived"]);
  }

  /* =========================================================
     GO
     ========================================================= */
  function init() {
    try { who = localStorage.getItem(WHO_KEY) || "cory"; } catch (e) { who = "cory"; }
    if (!D.PROFILES.some(function (p) { return p.id === who; })) who = "cory";
    S = load(who);
    passTime();
    rollDay();

    var tag = $("#tagline");
    if (tag) tag.textContent = D.profile(who).hello;

    document.addEventListener("click", onClick, false);
    document.addEventListener("keydown", onKey, false);
    // a saved valley chosen as a file
    document.addEventListener("change", function (ev) {
      var f = ev.target;
      if (!f || f.id !== "import-file" || !f.files || !f.files[0]) return;
      var reader = new FileReader();
      reader.onload = function () { importValley(String(reader.result || "")); };
      reader.readAsText(f.files[0]);
    }, false);
    window.addEventListener("resize", function () { anim.measure = true; });
    window.addEventListener("beforeunload", save);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") { passTime(); render(); } else { stopCatch(); save(); }
    });

    // needs sag in real time — a gentle nudge once a minute keeps
    // the bars honest without the page ever feeling busy.
    setInterval(function () {
      if (!S.pet) return;
      passTime();
      var bars = document.querySelectorAll(".need i");
      if (bars.length === 4 && !$("#sheet-back")) {
        var vals = [S.pet.hunger, S.pet.happy, S.pet.energy, S.pet.clean];
        for (var i = 0; i < 4; i++) {
          var v = Math.round(vals[i]);
          bars[i].style.width = v + "%";
          bars[i].style.background = v > 60 ? "#3ddc84" : v > 33 ? "#ffd166" : "#ff5d8f";
        }
      }
      save();
    }, 60000);

    render();
    requestAnimationFrame(loop);
    postWaiting();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  /* A tiny hook the play-test robot uses to look inside. */
  window.Craepets = {
    state: function () { return S; },
    who: function () { return who; },
    view: function () { return view; },
    session: function () { return sess; },
    battle: function () { return battle; },
    correctIndex: function () {
      var h = battle && !battle.over ? battle : sess;
      return h && h.q ? h.q.answer : -1;
    },
    changeIndex: function () { return pendingBuy ? pendingBuy.q.answer : -1; },
    review: function () { return S.review; },
    house: function () { return S.house; },
    stall: function () { return S.stall; },
    spun: function () { return spunToday(); },
    adapt: function () { return S.adapt; },
    heat: function (subject) { return rungOf(subject); },
    arena: function () { return arena(); },
    said: function () { return lastSaid; },
    narration: function () { return { clips: Object.keys(CLIPS).length, hasClips: hasClips, canSpeak: canSpeak }; },
    _setRung: function (subject, r) { adaptOf(subject).rung = D.hot(r); adaptOf(subject).hist = []; save(); },
    _nextQuestion: function () { if (sess) { nextQuestion(); render(); } },
    grant: function (n) { S.coins += n; save(); render(); },
    wish: function () { return wishNow(); },
    _setWish: function (w) { S.wish = w; save(); render(); },
    wardrobe: function () { return S.wardrobe; },
    diary: function () { return S.diary; },
    mail: function () { return S.mail; },
    timeOfDay: timeOfDay,
    visiting: function () { return visit ? visit.id : null; },
    photo: takePhoto,
    bank: function () { return bank(); },
    petpets: function () { return S.petpets; },
    _event: function (i) { randomEvent(i); },
    _events: function (on) { eventsOn = !!on; },
    catching: function () { return catchOn; },
    match: function () { return match; },
    weather: weatherToday,
    _setWeather: function (id) { weatherOverride = id || null; render(); },
    _setDate: function (s) { if (CAL) CAL._setDate(s); render(); },
    celebrations: celebrations,
    exportJson: function () { return JSON.stringify(S); },
    importJson: importValley,
    steps: function () { return S.steps; },
    _anim: function () { return anim; },
    _setHour: function (h) { hourOverride = (h === null || h === undefined) ? null : h; render(); }
  };
})();
