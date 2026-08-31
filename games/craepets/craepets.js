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
     Ellie and Kieran can't read the question, so the browser reads it to
     them. Off by default for everyone who can read; the choice is
     remembered per device. */
  var VOICE_KEY = "craepets.voice";
  var canSpeak = typeof window !== "undefined" &&
    "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
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
  function hush() { try { if (canSpeak) window.speechSynthesis.cancel(); } catch (e) {} }
  function speak(text) {
    if (!canSpeak || !voiceWanted() || !text) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(String(text).replace(/[“”]/g, ""));
      u.rate = 0.92;
      u.pitch = 1.05;
      window.speechSynthesis.speak(u);
    } catch (e) {}
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
      /* The day you last span the prize wheel. */
      spinDay: 0,
      dayStreak: 0,
      lastPlayDay: 0,
      stats: { correct: 0, wrong: 0, best: 0, streak: 0, farm: 0, well: 0, pool: 0,
               arena: 0, arenaWin: 0, feed: 0, play: 0, wash: 0, read: 0, buy: 0,
               quests: 0, coinsEarned: 0, fixed: 0, bestDayStreak: 0, bySubject: {},
               spin: 0, placed: 0, stocked: 0, sold: 0, soldCoins: 0, styled: 0 },
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
    }
    return rolled;
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
  function level() { return S.pet ? Math.min(20, 1 + Math.floor((S.pet.xp || 0) / 50)) : 1; }
  function xpInLevel() { return S.pet ? (S.pet.xp || 0) % 50 : 0; }

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
      say("I levelled up! Level " + after + "!");
      sfx("win");
      try { window.Confetti && Confetti.burst({ count: 70 }); } catch (e) {}
      toast("🎉 " + S.pet.name + " reached level " + after + "!");
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
      homeowner: (S.house.homes || []).length >= 2,
      decorator: (S.house.placed || []).length >= 8,
      tower: ownsHome("tower"),
      estate: (S.house.homes || []).length >= 5,
      collector: (S.house.owned || []).length >= 30,
      stylist: stylesBought() >= 6,
      martian: S.house.home === "marscastle",
      starlord: ownsHome("starring"),
      rarehunt: !!S.everRare,
      shopkeep: !!S.everStocked,
      trader: (st.sold || 0) >= 10,
      spinner: (st.spin || 0) >= 10,
      jackpot: !!S.everJackpot
    };
    Object.keys(tests).forEach(function (id) {
      if (tests[id] && S.trophies.indexOf(id) === -1) { S.trophies.push(id); got.push(id); }
    });
    got.forEach(function (id) {
      for (var i = 0; i < D.TROPHIES.length; i++) {
        if (D.TROPHIES[i].id === id) toast("🏆 Trophy earned: " + D.TROPHIES[i].name);
      }
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
    case:   { tag: "🏆 Trophy Case",  deco: [["🏆", 12, 10], ["🎖️", 86, 12], ["✨", 50, 74]] }
  };

  /* Where each piece of furniture stands in the room. The middle of the
     floor is left clear on purpose — that is where the Craepet is.
     There are enough spots here for the biggest home in the game. */
  var HOME_SPOTS = [
    [7, 9], [21, 8], [34, 10], [67, 10], [80, 8], [93, 9],
    [11, 27], [26, 25], [75, 25], [90, 27],
    [4, 44], [18, 42], [83, 42], [97, 44],
    [8, 58], [24, 62], [40, 60], [61, 60], [77, 62], [92, 58],
    [16, 78], [46, 80], [85, 78],
    [2, 32], [98, 32], [3, 66], [97, 66], [62, 74]
  ];
  /* The room = what you can see out of the window, and then whatever you
     have put out standing in front of it. An empty house with no view
     chosen keeps the starter decorations so it is never a bare box. */
  function nestDeco() {
    var mine = placedItems();
    // The view sits high up, but never so high that it collides with the
    // room's name badge in the top-left corner of the scene.
    var out = (viewNow().deco || []).map(function (d) {
      return [d[0], d[1], Math.min(d[2], 72)];
    });
    if (!mine.length && !out.length) return PLACES.nest.deco;
    mine.forEach(function (it, i) {
      var sp = HOME_SPOTS[i % HOME_SPOTS.length];
      out.push([it.emoji, sp[0], sp[1]]);
    });
    return out;
  }
  /* The walls and the floor, as one background. The join sits at 55%,
     which is where the Craepet's feet are. */
  function homeBackground() {
    var w = wallNow(), f = floorNow();
    return "linear-gradient(180deg," + w.a + " 0%," + w.b + " 55%," +
           f.a + " 55%," + f.b + " 100%)";
  }

  var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var anim = { t: 0, napping: false, cv: null, measure: true };

  function drawScene() {
    var cv = $("#pet-canvas");
    if (!cv || !S.pet) return;
    if (cv !== anim.cv || anim.measure) {
      var rect = cv.getBoundingClientRect();
      if (!rect.width) return;
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(rect.width * dpr);
      cv.height = Math.round(rect.height * dpr);
      anim.cv = cv;
      anim.measure = false;
    }
    var w = cv.width, h = cv.height;
    if (!w || !h) return;

    anim.t++;
    var sleeping = S.pet.energy < 20 || anim.napping;
    var frame = "idle";
    if (sleeping) frame = "sleep";
    else if (anim.t % 150 > 144) frame = "blink";

    var scale = Math.max(2, Math.floor(Math.min(h / 23, w / 26)));
    var bob = calm ? 0
      : sleeping ? Math.round(Math.sin(anim.t / 40) * scale * 0.35)
                 : Math.round(Math.sin(anim.t / 16) * scale * 0.6);
    P.draw(cv, S.pet.species, S.pet.colour, { frame: frame, level: level(), scale: scale, bob: bob });
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
    // At home the room is painted from the wall and floor you chose, so
    // repainting shows up the instant you tap it.
    var paint = atHome ? ' style="background:' + homeBackground() + '"' : "";
    var tag = atHome ? houseInfo().emoji + " " + homeName() : pl.tag;
    var deco = (atHome ? nestDeco() : pl.deco).map(function (d) {
      return '<span class="deco" aria-hidden="true" style="left:' + d[1] + '%;bottom:' + d[2] + '%">' + d[0] + "</span>";
    }).join("");
    var label = S.pet
      ? S.pet.name + ", a " + P.colour(S.pet.colour).name + " " + P.species(S.pet.species).name +
        ", looking " + mood() + ", at " + tag.replace(/^\S+\s/, "")
      : "your Craepet";
    return '<div class="scene ' + skin + (place === "nest" ? "" : " compact") + '" id="scene"' + paint + " " +
      'role="button" tabindex="0" aria-label="' + esc(label) + '. Tap to say hello.">' +
      '<span class="place-tag" aria-hidden="true">' + esc(tag) + "</span>" + deco +
      '<canvas id="pet-canvas" aria-hidden="true"></canvas>' +
      '<div id="bubble-slot" role="status" aria-live="polite"></div>' +
    "</div>";
  }

  var bubbleTimer = null;
  function say(text, ms) {
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
    g.innerHTML =
      topbarHtml() +
      sceneHtml(view) +
      needsHtml() +
      navHtml() +
      panelHtml();
    save();
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
    var s = null;
    try { s = JSON.parse(localStorage.getItem(slot(id))); } catch (e) {}
    return (s && s.pet) ? '<img alt="" src="' + P.chip(s.pet.species, s.pet.colour, px) + '">' : "";
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
    var voiceBtn = canSpeak
      ? '<button class="mini" data-voice="1" aria-pressed="' + on + '" ' +
        'aria-label="' + (on ? "Reading questions aloud. Turn off." : "Read questions aloud") + '" ' +
        'title="' + (on ? "Reading aloud is ON" : "Read questions aloud") + '">' +
        (on ? "🔊" : "🔇") + "</button>"
      : "";
    return '<div class="topbar">' +
      '<span class="coins" id="coin-count">🪙 ' + S.coins + "</span>" +
      '<span class="petname">' + esc(S.pet.name) + " " + moodFace() + "</span>" +
      voiceBtn +
      '<span class="lvl" aria-label="Level ' + lv + '">Lv ' + lv + "</span>" +
      '<span class="xp" role="img" aria-label="' + xpInLevel() + ' of 50 experience to the next level" title="' +
        xpInLevel() + '/50 to the next level"><i style="width:' + (xpInLevel() / 50 * 100) + '%"></i></span>' +
    "</div>";
  }

  function needsHtml() {
    var p = S.pet;
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
    ["nest", "🏡", "Nest"], ["home", "🏠", "House"],
    ["farm", "🍓", "Farm"], ["well", "📖", "Well"], ["pool", "🌈", "Pool"],
    ["market", "🏪", "Market"], ["stall", "🏬", "Stall"], ["arena", "⚔️", "Arena"],
    ["bag", "🎒", "Bag"], ["quests", "📜", "Daily"], ["case", "🏆", "Case"]
  ];

  function navHtml() {
    var ready = quests().filter(function (q) {
      return !S.claimed[q.id] && (S.today[q.track] || 0) >= q.goal;
    }).length;
    var due = S.review.filter(function (r) { return r.tier === tier(); }).length;
    // Anything bought or found and not yet used — so a purchase is visibly
    // waiting for you instead of quietly disappearing into the bag.
    var fresh = Object.keys(S.bagNew || {}).filter(function (id) { return S.bag[id] > 0; }).length;
    return '<nav class="nav" id="nav" aria-label="Where to go">' + NAV.map(function (n) {
      var dot = "";
      if (n[0] === "quests" && ready) dot = '<span class="dot">' + ready + "</span>";
      if (n[0] === "nest" && due) dot = '<span class="dot review" title="' + due + ' to review">🔁</span>';
      if (n[0] === "bag" && fresh) dot = '<span class="dot">' + fresh + "</span>";
      // A free spin waiting, and money taken while you were away, are both
      // things you should be able to see without opening the tab.
      if (n[0] === "quests" && !dot && !spunToday()) dot = '<span class="dot">🎡</span>';
      if (n[0] === "stall" && (S.stall.sales || []).length) {
        dot = '<span class="dot">' + S.stall.sales.length + "</span>";
      }
      return '<button data-go="' + n[0] + '"' + (view === n[0] ? ' class="on" aria-current="page"' : "") + ">" +
             n[1] + " " + n[2] + dot + "</button>";
    }).join("") + "</nav>";
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
      case "case": return caseHtml();
    }
    return "";
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
      born: Date.now(), hunger: 80, happy: 85, energy: 95, clean: 90, xp: 0
    };
    S.lastTick = Date.now();
    addItem("strawberry", 3);
    addItem("soap", 1);
    rollDay();
    checkTrophies();
    save();
    view = "nest";
    render();
    sfx("win");
    try { window.Confetti && Confetti.burst({ count: 90 }); } catch (e) {}
    say("Hi! I'm " + name + ".", 3400);
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
      (canSpeak
        ? '<p class="sub" style="margin:0.6rem 0 0;text-align:center">' +
          (voiceWanted() ? "🔊 Questions are being read aloud" : "🔇 Questions are not read aloud") +
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
     THE REVIEW BASKET — the single biggest teaching change.
     A question you got wrong is not gone: it goes in the basket
     and comes back a few questions later, re-dealt so the answer
     is somewhere new. Get it right and it leaves the basket for
     good ("you fixed it"), which is what actually shifts a fact
     from "saw it once" to "know it".
     ========================================================= */
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
      reviewGap = 3;
      return q;
    }
    if (reviewGap > 0) reviewGap--;
    return D.ask(subject, tier());
  }

  /* Read the question out for the players who can't read it yet. */
  function announce(q) {
    if (!q) return;
    var extra = "";
    // A sum or a letter reads fine out loud; a gapped word ("C_T") does
    // not, and it is the thing the child is supposed to LOOK at anyway.
    if (q.big && q.big.text && q.big.text.indexOf("_") === -1) extra = ". " + q.big.text;
    speak(q.q + extra);
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

    return '<div class="panel">' +
      "<h2>" + info.title + "</h2>" +
      '<p class="sub">' + info.sub + "</p>" +
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

    var badge = Q.fromReview
      ? '<p class="second-look">🔁 Second look — you missed this one before</p>' : "";

    var after = "";
    if (q.state === "done") {
      var right = Q.choices[Q.answer];
      var rightLabel = right.t || right.emoji || "that one";
      var head, mine = "";
      if (q.correct) {
        head = Q.fromReview ? "Fixed it! 🔁 " : "Yes! ";
      } else {
        head = "The answer is " + esc(rightLabel) + ". ";
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
        speak("Try this one");
      }
      return;
    }

    holder.chose = idx;
    holder.correct = correct;
    holder.state = "done";
    holder.misses = 0;

    if (correct) {
      S.stats.streak++;
      if (S.stats.streak > S.stats.best) S.stats.best = S.stats.streak;
      bestToday("bestStreak", S.stats.streak);
      bump("correct");
      var subj = Q.subject;
      S.stats.bySubject[subj] = (S.stats.bySubject[subj] || 0) + 1;
      // Getting it right takes it out of the basket — whether it came
      // BACK from the basket or just happened to turn up again.
      if (forget(Q.fromReview || reviewKey(Q))) {
        S.stats.fixed = (S.stats.fixed || 0) + 1;
        bump("fixed");
        toast("🔁 Fixed it! That one is out of your review basket.");
        earn(5);
      }
      sfx(S.stats.streak >= 3 ? "streak" : "good", S.stats.streak);
    } else {
      S.stats.wrong++;
      S.stats.streak = 0;
      remember(Q);
      sfx("nope");
    }

    if (battle) battleTurn(correct);
    else harvest(correct);

    checkTrophies();
    save();
    render();
    // Say the explanation out loud too — for a pre-reader the teaching
    // line is the only part that is worth anything.
    speak((correct ? "Yes! " : "The answer is " + (Q.choices[Q.answer].t || "this one") + ". ") + Q.teach);
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

    var coins = info.base + Math.min(6, S.stats.streak) + Math.floor(level() / 3);
    earn(coins);
    // A book shelf, a globe and a star window really do make you learn faster.
    giveXp(Math.round(4 * (1 + studyBonus())));
    floaty("+" + coins + " 🪙", "#ffe07a");

    if (sess.plots.length < SLOTS) {
      sess.plots.push(info.crops[Math.floor(Math.random() * info.crops.length)]);
    }

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

  function nestHtml() {
    var age = Math.max(0, Math.floor((Date.now() - (S.pet.born || Date.now())) / 86400000));
    var streakBit = (S.dayStreak || 0) > 1
      ? '<p class="sub" style="margin:0.8rem 0 0">📅 <b>' + S.dayStreak +
        " days in a row!</b> Keep it going — the daily gift grows with the streak.</p>" : "";
    return '<div class="panel">' +
      "<h2>🏡 " + esc(S.pet.name) + "'s nest</h2>" +
      '<p class="sub">' + esc(nestLine()) + " &nbsp;·&nbsp; " + esc(P.species(S.pet.species).name) +
        ", " + esc(P.colour(S.pet.colour).name) + ", " + age + (age === 1 ? " day" : " days") + " old. " +
        '<button class="ghost small" data-rename="1">✏️ Rename</button></p>' +
      '<div class="acts">' +
        '<button class="act" data-do="feed" style="--ac:#ff8f4d"><span class="em">🍽️</span>Feed</button>' +
        '<button class="act" data-do="play" style="--ac:#3ddc84"><span class="em">🎾</span>Play</button>' +
        '<button class="act" data-do="wash" style="--ac:#38b6ff"><span class="em">🫧</span>Wash</button>' +
        '<button class="act" data-do="rest" style="--ac:#8a5cff"><span class="em">😴</span>Rest</button>' +
        '<button class="act" data-do="read" style="--ac:#e05fa8"><span class="em">📖</span>Read</button>' +
      "</div>" + shelfLine() +
      '<p class="sub" style="margin:0.8rem 0 0">Coins come from the Farm, the Well, the Pool and the Arena — ' +
        "every one of them pays you for learning something.</p>" + streakBit +
    "</div>" + reviewHtml() + levelPickerHtml();
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
        return itemButton(id, "×" + S.bag[id]);
      }).join("") + "</div>");
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
    if (what === "rest") {
      if (comforts().length) return openSheet(restSheet());
      return nap();
    }
  }

  function nap() {
    anim.napping = true;
    S.pet.energy = clamp(S.pet.energy + 18, 0, 100);
    S.pet.happy = clamp(S.pet.happy + 2, 0, 100);
    say("Zzz… 💤", 2600);
    floaty("+18 ⚡", "#e2d4ff");
    sfx("pop");
    setTimeout(function () { anim.napping = false; }, 2600);
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
      say("Wheee!");
      sfx("pop");
      return after();
    }
    if (id === "nap") { closeSheet(); return nap(); }
    if (id === "rinse") {
      S.pet.clean = clamp(S.pet.clean + 14, 0, 100);
      bump("wash");
      floaty("+14 🫧", "#cdf1ff");
      say("Much better!");
      sfx("pop");
      return after();
    }

    var it = D.itemById(id);
    if (!it) return closeSheet();
    var kind = D.kindOf(id);
    // Brushes are not carried in the bag — owning the colour IS the item.
    if (kind === "brush") return paint(it.colour);
    if (!S.bag[id]) return closeSheet();
    if (S.bagNew) delete S.bagNew[id];          // it has been used; drop the badge

    if (kind === "food") {
      if (S.pet.hunger > 96) { toast(S.pet.name + " is completely full!"); return closeSheet(); }
      takeItem(id);
      S.pet.hunger = clamp(S.pet.hunger + it.fill, 0, 100);
      S.pet.happy = clamp(S.pet.happy + (it.joy || 0), 0, 100);
      S.pet.clean = clamp(S.pet.clean - 3, 0, 100);
      bump("feed");
      floaty("+" + it.fill + " 🍽️", "#ffd9a8");
      say("Mmm, " + it.name.toLowerCase() + "!");
      sfx("good");
      return after();
    }
    if (kind === "toy") {
      if (S.pet.energy < 10) { toast(S.pet.name + " needs a rest first."); return closeSheet(); }
      S.pet.happy = clamp(S.pet.happy + it.joy, 0, 100);
      S.pet.energy = clamp(S.pet.energy - 8, 0, 100);
      bump("play");
      giveXp(2);
      floaty("+" + it.joy + " 😊", "#b6ffcf");
      say("The " + it.name.toLowerCase() + "! My favourite!");
      sfx("pop");
      return after();
    }
    if (kind === "care") {
      takeItem(id);
      if (it.clean) S.pet.clean = clamp(S.pet.clean + it.clean, 0, 100);
      if (it.energy) S.pet.energy = clamp(S.pet.energy + it.energy, 0, 100);
      if (it.joy) S.pet.happy = clamp(S.pet.happy + it.joy, 0, 100);
      if (it.clean) bump("wash");
      floaty(itemBlurb(it), it.clean ? "#cdf1ff" : "#e2d4ff");
      say("Aaah.");
      sfx("good");
      return after();
    }
    if (kind === "book") {
      takeItem(id);
      giveXp(it.xp);
      bump("read");
      S.pet.happy = clamp(S.pet.happy + 5, 0, 100);
      var fact = D.fact(tier());
      closeSheet();
      save();
      render();
      openSheet(sheet("📖 " + esc(it.name),
        '<p class="teach" style="font-size:1.02rem"><b>Did you know? </b>' + esc(fact) + "</p>" +
        '<p class="sub" style="margin-top:0.6rem">' + esc(S.pet.name) + " gained " + it.xp + " XP from reading.</p>"));
      sfx("win");
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

  function paint(colourId) {
    S.pet.colour = colourId;
    S.everPainted = true;
    checkTrophies();
    save();
    closeSheet();
    render();
    say("Look at me! " + P.colour(colourId).name + "!", 3200);
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
        " pieces of furniture</b> in the valley — the 🏪 Market puts eight different ones " +
        "on the shelf every morning.</p></div>");
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
        var chip = p.kind === "view"
          ? '<span class="pic">' + x.emoji + "</span>"
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
    say("Home sweet " + h.name.toLowerCase() + "!", 2800);
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
      awardSpin(D.WHEEL[idx]);
    }, wait);
  }

  function awardSpin(prize) {
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
    speak(prize.say);
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
      : '<span class="pic">' + it.emoji + "</span>";
    var have = !owned && S.bag[it.id] ? '<span class="own">have ' + S.bag[it.id] + "</span>" : "";
    return '<button class="item' + (it.rare ? " rare" : "") + '" data-buy="' + esc(it.id) + '"' +
      (!afford || owned ? " disabled" : "") + ">" +
      pic + '<span class="nm">' + esc(it.name) + "</span>" +
      '<span class="what">' + esc(itemBlurb(it)) + "</span>" +
      (owned ? '<span class="own">✔ owned</span>' : '<span class="price">🪙 ' + it.cost + "</span>") +
      have + (extra || "") +
    "</button>";
  }

  function marketHtml() {
    var cards = D.shopStock(null, who).map(function (it) { return itemCard(it); }).join("");
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

    return '<div class="panel">' +
      "<h2>🏪 The Market</h2>" +
      '<p class="sub">Fresh stock every morning — and <b>everybody\'s shelf is different</b>, so ' +
        "what you cannot find here might be sitting in somebody else's shop. You have 🪙 " + S.coins + ".</p>" +
      '<div class="items">' + cards + "</div>" +
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
      if ((it.kind || D.kindOf(it.id)) === "decor") {
        if (S.house.owned.indexOf(it.id) === -1) S.house.owned.push(it.id);
        if (slotsFree() > 0 && S.house.placed.indexOf(it.id) === -1) {
          S.house.placed.push(it.id);
          bump("placed");
        }
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
        '<p style="margin:0.8rem 0 0"><button class="ghost" data-go="home" data-close="1">🏠 Go to your House</button></p>'));
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

    return '<div class="panel">' +
      "<h2>🎒 Your bag</h2>" +
      (any
        ? '<p class="sub">Everything you have bought or found lives here. Tap anything to use it on ' +
          esc(S.pet.name) + ".</p>" + sections
        : '<p class="sub">Your bag is empty. The 🍓 Farm drops food, the 📖 Well turns up books, ' +
          "and the 🏪 Market sells everything else.</p>") +
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
     THE QUIZ ARENA — a friendly duel. Answer right, you land a
     hit; answer wrong and your rival lands one. Nobody can be
     hurt, and at the Tiny level nobody can even lose.
     ========================================================= */
  var GATE = { pip: 1, mossy: 2, splash: 4, ember: 6, orbit: 9, shade: 12 };

  function maxHp() { return 40 + level() * 8; }
  function myPower() { return 10 + level() * 2 + (mood() === "great" ? 4 : 0); }

  function arenaHtml() {
    if (battle) return battleHtml();
    var lv = level();
    var cards = D.RIVALS.map(function (r) {
      var need = GATE[r.id] || 1;
      var open = lv >= need;
      return '<button class="item" data-fight="' + r.id + '"' + (open ? "" : " disabled") + ">" +
        '<img alt="" src="' + P.chip(r.species, r.colour, 56) + '" style="width:56px;image-rendering:pixelated">' +
        '<span class="nm">' + esc(r.name) + "</span>" +
        (open ? '<span class="price">🪙 ' + r.coins + "</span>" : '<span class="own">Level ' + need + "</span>") +
      "</button>";
    }).join("");
    return '<div class="panel">' +
      "<h2>⚔️ Quiz Arena</h2>" +
      '<p class="sub">Pick a rival. Every right answer is a hit; every wrong one lets them hit back. ' +
        "Your Craepet hits harder as it levels up — and harder still when it's happy.</p>" +
      '<div class="items">' + cards + "</div>" +
      '<p class="sub" style="margin-top:0.7rem">Losing costs nothing but pride. You can always try again.</p>' +
    "</div>";
  }

  function startBattle(id) {
    var r = null;
    for (var i = 0; i < D.RIVALS.length; i++) if (D.RIVALS[i].id === id) r = D.RIVALS[i];
    if (!r || level() < (GATE[id] || 1)) return;
    battle = { rival: r, foeHp: r.hp, foeMax: r.hp, myHp: maxHp(), myMax: maxHp(),
               q: null, state: "ask", chose: -1, log: r.taunt };
    battle.q = pickQuestion(battleSubject(r));
    bump("arena");
    view = "arena";
    render();
    announce(battle.q);
  }

  function battleSubject(r) {
    return r.subject === "mixed" ? ["math", "word", "wonder"][Math.floor(Math.random() * 3)] : r.subject;
  }

  function battleHtml() {
    var b = battle;
    return '<div class="panel">' +
      '<div class="fighters">' +
        '<div class="fighter"><img alt="" src="' + P.chip(S.pet.species, S.pet.colour, 80) + '">' +
          "<b>" + esc(S.pet.name) + "</b><small>Lv " + level() + " · hits for " + myPower() + "</small>" +
          '<span class="hpbar"><i style="width:' + (b.myHp / b.myMax * 100) + '%"></i></span></div>' +
        '<div class="vs">VS</div>' +
        '<div class="fighter foe"><img alt="" src="' + P.chip(b.rival.species, b.rival.colour, 80) + '">' +
          "<b>" + esc(b.rival.name) + "</b><small>hits for " + b.rival.power + "</small>" +
          '<span class="hpbar"><i style="width:' + (b.foeHp / b.foeMax * 100) + '%"></i></span></div>' +
      "</div>" +
      '<p class="sub" style="text-align:center;margin:0.6rem 0 0.3rem">' + esc(b.log) + "</p>" +
      quizHtml(b) + (b.over ? battleEndHtml() : "") +
    "</div>";
  }

  function nextBattleQuestion() {
    battle.q = pickQuestion(battleSubject(battle.rival));
    battle.state = "ask";
    battle.chose = -1;
    battle.misses = 0;
    announce(battle.q);
  }

  function battleEndHtml() {
    return '<p style="margin:0.8rem 0 0"><button class="act" data-leave="1" style="--ac:var(--purple);width:100%">' +
           "Back to the arena →</button></p>";
  }

  function battleTurn(correct) {
    var b = battle;
    if (correct) {
      var dmg = myPower() + Math.floor(Math.random() * 5);
      b.foeHp = Math.max(0, b.foeHp - dmg);
      b.log = S.pet.name + " lands a hit for " + dmg + "!";
      floaty("−" + dmg, "#ffd0d6");
      earn(4);
      giveXp(5);
    } else {
      var hit = tier() === "tot" ? 0 : b.rival.power + Math.floor(Math.random() * 4);
      b.myHp = Math.max(0, b.myHp - hit);
      b.log = hit ? b.rival.name + " hits back for " + hit + "!" : b.rival.name + " goes easy on you.";
    }

    if (b.foeHp <= 0) {
      b.over = "win";
      b.log = "🏆 " + b.rival.name + " gives in — you win!";
      earn(b.rival.coins);
      giveXp(30);
      bump("arenaWin");
      S.pet.happy = clamp(S.pet.happy + 12, 0, 100);
      if (b.rival.id === "shade") S.beatShade = true;
      sfx("win");
      try { window.Confetti && Confetti.burst({ count: 100 }); } catch (e) {}
      toast("You beat " + b.rival.name + "! +🪙 " + b.rival.coins);
    } else if (b.myHp <= 0) {
      b.over = "lose";
      b.log = S.pet.name + " is worn out. Good try — " + b.rival.name + " nods respectfully.";
      earn(10);
      sfx("nope");
    }
  }

  /* =========================================================
     QUESTS & THE TROPHY CASE
     ========================================================= */
  function questsHtml() {
    var list = quests();
    var rows = list.map(function (q) {
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
      "<h2>📜 Today's quests</h2>" +
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
    openSheet(sheet("🎁 Today's gift",
      '<p class="sub" style="font-size:1.05rem">🪙 ' + coins + " coins and " + food.emoji + " " + esc(food.name) + "!</p>" +
      extra +
      '<p class="sub">📅 That is <b>' + (S.dayStreak || 1) + "</b> day" + ((S.dayStreak || 1) === 1 ? "" : "s") +
        " in a row. Tomorrow's gift is 🪙 " + (20 + Math.min(7, (S.dayStreak || 1) + 1) * 10) + ".</p>" +
      '<p class="teach"><b>Did you know? </b>' + esc(D.fact(tier())) + "</p>"));
    sfx("coin");
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
      ["📅", st.bestDayStreak || 0, "best day run"]
    ].map(function (s) {
      return '<div class="stat"><b>' + s[0] + " " + s[1] + "</b><small>" + s[2] + "</small></div>";
    }).join("") + subjects.map(function (s) {
      return '<div class="stat"><b>' + (st.bySubject[s[0]] || 0) + "</b><small>" + s[1] + "</small></div>";
    }).join("");

    var fam = D.PROFILES.map(function (p) {
      var s = null;
      try { s = JSON.parse(localStorage.getItem(slot(p.id))); } catch (e) {}
      if (!s || !s.pet) {
        return '<div class="fam empty"><div style="font-size:2rem">' + p.emoji + "</div>" +
               "<b>" + esc(p.name) + "</b><small>no pet yet</small></div>";
      }
      var lv = Math.min(20, 1 + Math.floor((s.pet.xp || 0) / 50));
      return '<div class="fam"><img alt="" src="' + P.chip(s.pet.species, s.pet.colour, 54) + '">' +
        "<b>" + esc(s.pet.name) + "</b><small>" + esc(p.name) + " · Lv " + lv + "</small>" +
        "<small>" + ((s.stats && s.stats.correct) || 0) + " right</small></div>";
    }).join("");

    return '<div class="panel"><h2>🏆 Trophy case</h2>' +
      '<p class="sub">' + S.trophies.length + " of " + D.TROPHIES.length + " earned.</p>" +
      '<div class="trophies">' + trophies + "</div></div>" +
    '<div class="panel"><h2>📊 What you have learned</h2>' +
      '<div class="statgrid">' + stats + "</div></div>" +
    '<div class="panel"><h2>👨‍👩‍👧‍👦 The family valley</h2>' +
      '<p class="sub">Everyone who plays on this device has their own Craepet.</p>' +
      '<div class="family">' + fam + "</div></div>" +
    levelPickerHtml();
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
      if (voiceOn) speak("I will read the questions out loud.");
      return;
    }

    // who's playing
    if (t.closest("[data-swap]")) { sfx("pop"); return openSheet(whoSheet()); }
    var w = t.closest("[data-who]");
    if (w) { closeSheet(); return switchTo(w.dataset.who); }

    // sheets
    var closer = t.closest && t.closest("[data-close]");
    if (closer) {
      closeSheet();
      // a sheet button may also send you somewhere ("go to your House")
      if (closer.dataset && closer.dataset.go) { view = closer.dataset.go; render(); }
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

    var go = t.closest("[data-go]");
    if (go) {
      var dest = go.dataset.go;
      if (dest !== view) {
        hush();
        if (["farm", "well", "pool"].indexOf(dest) === -1) sess = null;
        if (dest !== "arena") battle = null;
        if (dest === "bag") { S.bagNew = {}; save(); }   // you have seen them now
        pendingSale = null;
        view = dest;
        sfx("pop");
        render();
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

    // --- the prize wheel ---
    if (t.closest("[data-spin]")) return spinWheel();

    var fight = t.closest("[data-fight]");
    if (fight) return startBattle(fight.dataset.fight);

    if (t.closest("[data-leave]")) { battle = null; render(); return; }

    var claim = t.closest("[data-claim]");
    if (claim) return claimQuest(claim.dataset.claim);

    if (t.closest("[data-gift]")) return dailyGift();

    var tier2 = t.closest("[data-tier]");
    if (tier2) {
      S.tier = tier2.dataset.tier;
      sess = null;
      battle = null;
      save();
      sfx("pop");
      return render();
    }

    // tapping the pet itself is always worth something
    if (t.closest("#scene")) {
      S.pet.happy = clamp(S.pet.happy + 1, 0, 100);
      var m = mood();
      say(D.MOODS[m][Math.floor(Math.random() * D.MOODS[m].length)]);
      sfx("pop");
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

    if (ev.key === "Escape") {
      hush();
      if ($("#sheet-back")) { ev.preventDefault(); closeSheet(); }
      return;
    }

    if (typing) {
      if (ev.key === "Enter") {
        ev.preventDefault();
        var go = $("#rename-go") || $("#do-adopt");
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
    window.addEventListener("resize", function () { anim.measure = true; });
    window.addEventListener("beforeunload", save);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") { passTime(); render(); } else { save(); }
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
    _nextQuestion: function () { if (sess) { nextQuestion(); render(); } },
    grant: function (n) { S.coins += n; save(); render(); }
  };
})();
