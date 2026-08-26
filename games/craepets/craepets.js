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
      colours: P.COLOURS.filter(function (c) { return c.free; }).map(function (c) { return c.id; }),
      lastTick: Date.now(),
      day: D.dayNumber(),
      quests: [],
      claimed: {},
      today: {},
      stats: { correct: 0, wrong: 0, best: 0, streak: 0, farm: 0, well: 0, pool: 0,
               arena: 0, arenaWin: 0, feed: 0, play: 0, wash: 0, read: 0, buy: 0,
               quests: 0, coinsEarned: 0, bySubject: {} },
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
    return s;
  }

  function save() {
    if (!S) return;
    try { localStorage.setItem(slot(who), JSON.stringify(S)); } catch (e) {}
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
    S.pet.happy  = clamp(S.pet.happy  - DECAY.happy  * hours, FLOOR, 100);
    S.pet.clean  = clamp(S.pet.clean  - DECAY.clean  * hours, FLOOR, 100);
    S.pet.energy = clamp(S.pet.energy + REGEN * hours, 0, 100);
    S.lastTick = now;
    rollDay();
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* A new day: fresh quests, fresh daily counters, one free gift. */
  function rollDay() {
    var day = D.dayNumber();
    if (S.day === day && S.quests && S.quests.length) return false;
    S.day = day;
    S.quests = D.questsFor().map(function (q) { return q.id; });
    S.claimed = {};
    S.today = {};
    S.dailyGift = false;
    return true;
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
  }
  function takeItem(id) {
    if (!S.bag[id]) return false;
    S.bag[id]--;
    if (S.bag[id] <= 0) delete S.bag[id];
    return true;
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
      questor: st.quests >= 10
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
    farm:   { tag: "🍓 Berry Farm",   deco: [["☁️", 12, 72], ["☁️", 70, 78], ["🌻", 6, 6], ["🌾", 88, 5], ["🐝", 30, 55]] },
    well:   { tag: "📖 Word Well",    deco: [["🌕", 78, 74], ["⭐", 16, 76], ["✨", 44, 82], ["🪣", 8, 8], ["📚", 86, 6]] },
    pool:   { tag: "🌈 Rainbow Pool", deco: [["🌈", 62, 70], ["🫧", 14, 26], ["🫧", 82, 18], ["💧", 34, 12]] },
    market: { tag: "🏪 The Market",   deco: [["🎪", 8, 40], ["🛒", 84, 6], ["🏷️", 62, 44], ["🪙", 30, 8]] },
    arena:  { tag: "⚔️ Quiz Arena",   deco: [["🚩", 6, 40], ["🚩", 90, 40], ["🏆", 50, 74]] },
    bag:    { tag: "🎒 Your Bag",     deco: [["🎒", 84, 8], ["✨", 20, 60]] },
    quests: { tag: "📜 Quest Board",  deco: [["📜", 84, 10], ["🪶", 12, 62]] },
    case:   { tag: "🏆 Trophy Case",  deco: [["🏆", 12, 10], ["🎖️", 86, 12], ["✨", 50, 74]] }
  };

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
    var deco = pl.deco.map(function (d) {
      return '<span class="deco" style="left:' + d[1] + '%;bottom:' + d[2] + '%">' + d[0] + "</span>";
    }).join("");
    return '<div class="scene ' + place + (place === "nest" ? "" : " compact") + '" id="scene">' +
      '<span class="place-tag">' + pl.tag + "</span>" + deco +
      '<canvas id="pet-canvas"></canvas>' +
      '<div id="bubble-slot"></div>' +
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
    return '<div class="topbar">' +
      '<span class="coins" id="coin-count">🪙 ' + S.coins + "</span>" +
      '<span class="petname">' + esc(S.pet.name) + " " + moodFace() + "</span>" +
      '<span class="lvl">Lv ' + lv + "</span>" +
      '<span class="xp" title="' + xpInLevel() + '/50 to the next level"><i style="width:' + (xpInLevel() / 50 * 100) + '%"></i></span>' +
    "</div>";
  }

  function needsHtml() {
    var p = S.pet;
    var rows = [["🍽️", "Food", p.hunger], ["😊", "Happy", p.happy], ["⚡", "Energy", p.energy], ["🫧", "Clean", p.clean]];
    return '<div class="needs">' + rows.map(function (r) {
      var v = Math.round(r[2]);
      var col = v > 60 ? "#3ddc84" : v > 33 ? "#ffd166" : "#ff5d8f";
      return '<div class="need"><b>' + r[0] + "</b>" +
             '<span><i style="width:' + v + "%;background:" + col + '"></i></span>' +
             "<small>" + r[1] + "</small></div>";
    }).join("") + "</div>";
  }

  var NAV = [
    ["nest", "🏡", "Nest"], ["farm", "🍓", "Farm"], ["well", "📖", "Well"], ["pool", "🌈", "Pool"],
    ["market", "🏪", "Market"], ["arena", "⚔️", "Arena"], ["bag", "🎒", "Bag"],
    ["quests", "📜", "Quests"], ["case", "🏆", "Case"]
  ];

  function navHtml() {
    var ready = quests().filter(function (q) {
      return !S.claimed[q.id] && (S.today[q.track] || 0) >= q.goal;
    }).length;
    return '<div class="nav" id="nav">' + NAV.map(function (n) {
      var dot = (n[0] === "quests" && ready) ? '<span class="dot">' + ready + "</span>" : "";
      return '<button data-go="' + n[0] + '"' + (view === n[0] ? ' class="on"' : "") + ">" +
             n[1] + " " + n[2] + dot + "</button>";
    }).join("") + "</div>";
  }

  function panelHtml() {
    switch (view) {
      case "nest": return nestHtml();
      case "farm": return placeHtml("farm");
      case "well": return placeHtml("well");
      case "pool": return placeHtml("pool");
      case "market": return marketHtml();
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

  function startSession(place) {
    sess = { place: place, right: 0, wrong: 0, plots: [], q: null, state: "ask" };
    nextQuestion();
  }

  function nextQuestion() {
    var info = PLACE_INFO[sess.place];
    sess.q = D.ask(info.subject, tier());
    sess.state = "ask";
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

    var extra = "";
    if (place === "pool") {
      var toBrush = 15 - (S.stats.pool % 15);
      extra = '<p class="sub" style="margin:-0.35rem 0 0.6rem">🖌️ ' + toBrush +
              " more right answers and the pool gives you a free paint brush.</p>";
    }

    return '<div class="panel">' +
      "<h2>" + info.title + "</h2>" +
      '<p class="sub">' + info.sub + "</p>" +
      '<div class="plots">' + cells.join("") + "</div>" + extra +
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
      return '<button class="choice' + mark + '" data-pick="' + i + '"' +
             (q.state === "done" ? " disabled" : "") + ">" + inner + "</button>";
    }).join("");

    var streakLine = sess && sess.right > 1
      ? "🔥 " + S.stats.streak + " in a row" : "";

    var after = "";
    if (q.state === "done") {
      var right = Q.choices[Q.answer];
      var rightLabel = right.t || right.emoji || "that one";
      after = '<p class="teach"><b>' + (q.correct ? "Yes! " : "The answer is " + esc(rightLabel) + ". ") + "</b>" +
              esc(Q.teach) + "</p>" +
              '<p style="margin:0.7rem 0 0"><button class="act" data-next="1" style="--ac:var(--purple);width:100%">' +
              (q.correct ? "Keep going →" : "Try another →") + "</button></p>";
    }
    if (q.state === "done" && q.over) {
      // the duel prints its own "back to the arena" button underneath,
      // so keep the explanation and drop the "keep going" one
      var cut = after.indexOf('<p style="margin:0.7rem 0 0">');
      if (cut > 0) after = after.slice(0, cut);
    }

    return '<div class="qcard">' +
      '<p class="qprompt">' + esc(Q.q) + "</p>" + big +
      '<p class="streak">' + streakLine + "</p>" +
      '<div class="choices' + (oneCol ? " one-col" : "") + '">' + buttons + "</div>" +
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
    if (!correct && tier() === "tot") {
      sfx("nope");
      var btn = document.querySelector('[data-pick="' + idx + '"]');
      if (btn) { btn.classList.add("wrong"); setTimeout(function () { btn.classList.remove("wrong"); }, 400); }
      return;
    }

    holder.chose = idx;
    holder.correct = correct;
    holder.state = "done";

    if (correct) {
      S.stats.streak++;
      if (S.stats.streak > S.stats.best) S.stats.best = S.stats.streak;
      bestToday("bestStreak", S.stats.streak);
      bump("correct");
      var subj = Q.subject;
      S.stats.bySubject[subj] = (S.stats.bySubject[subj] || 0) + 1;
      sfx(S.stats.streak >= 3 ? "streak" : "good");
    } else {
      S.stats.wrong++;
      S.stats.streak = 0;
      sfx("nope");
    }

    if (battle) battleTurn(correct);
    else harvest(correct);

    checkTrophies();
    save();
    render();
  }

  /* What the place pays out for a right answer. */
  function harvest(correct) {
    var info = PLACE_INFO[sess.place];
    if (!correct) { sess.wrong++; return; }
    sess.right++;
    bump(sess.place);

    var coins = info.base + Math.min(6, S.stats.streak) + Math.floor(level() / 3);
    earn(coins);
    giveXp(4);
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
    } else if (sess.place === "pool" && S.stats.pool % 15 === 0) {
      grantBrush();
    }

    if (sess.plots.length >= SLOTS) {
      var bonus = 25 + level() * 3;
      earn(bonus);
      sess.plots = [];
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
  function nestHtml() {
    var m = mood();
    var line = D.MOODS[m][Math.floor(Math.random() * D.MOODS[m].length)];
    var age = Math.max(0, Math.floor((Date.now() - (S.pet.born || Date.now())) / 86400000));
    return '<div class="panel">' +
      "<h2>🏡 " + esc(S.pet.name) + "'s nest</h2>" +
      '<p class="sub">' + esc(line) + " &nbsp;·&nbsp; " + esc(P.species(S.pet.species).name) +
        ", " + esc(P.colour(S.pet.colour).name) + ", " + age + (age === 1 ? " day" : " days") + " old.</p>" +
      '<div class="acts">' +
        '<button class="act" data-do="feed" style="--ac:#ff8f4d"><span class="em">🍽️</span>Feed</button>' +
        '<button class="act" data-do="play" style="--ac:#3ddc84"><span class="em">🎾</span>Play</button>' +
        '<button class="act" data-do="wash" style="--ac:#38b6ff"><span class="em">🫧</span>Wash</button>' +
        '<button class="act" data-do="rest" style="--ac:#8a5cff"><span class="em">😴</span>Rest</button>' +
      "</div>" +
      '<p class="sub" style="margin:0.8rem 0 0">Coins come from the Farm, the Well, the Pool and the Arena — ' +
        "every one of them pays you for learning something.</p>" +
    "</div>" + levelPickerHtml();
  }

  function feedSheet() {
    var foods = Object.keys(S.bag).filter(function (id) { return D.kindOf(id) === "food"; });
    if (!foods.length) {
      return sheet("🍽️ Nothing to eat!",
        '<p class="sub">The bag is empty. Harvest berries at the 🍓 Farm, or buy food at the 🏪 Market.</p>');
    }
    return sheet("🍽️ What shall " + esc(S.pet.name) + " eat?",
      '<div class="items">' + foods.map(function (id) {
        var it = D.itemById(id);
        return '<button class="item" data-use="' + id + '"><span class="pic">' + it.emoji + "</span>" +
               '<span class="nm">' + esc(it.name) + '</span><span class="own">×' + S.bag[id] + "</span></button>";
      }).join("") + "</div>");
  }

  function playSheet() {
    var toys = Object.keys(S.bag).filter(function (id) { return D.kindOf(id) === "toy"; });
    var romp = '<button class="act" data-use="romp" style="--ac:var(--green);width:100%;margin-bottom:0.6rem">' +
               '<span class="em">🤸</span>Just romp about (free)</button>';
    return sheet("🎾 Playtime!", romp + (toys.length
      ? '<div class="items">' + toys.map(function (id) {
          var it = D.itemById(id);
          return '<button class="item" data-use="' + id + '"><span class="pic">' + it.emoji + "</span>" +
                 '<span class="nm">' + esc(it.name) + "</span></button>";
        }).join("") + "</div>"
      : '<p class="sub">Toys from the 🏪 Market make playtime count for a lot more.</p>'));
  }

  function washSheet() {
    var soaps = Object.keys(S.bag).filter(function (id) {
      var it = D.itemById(id);
      return it && it.clean;
    });
    var rinse = '<button class="act" data-use="rinse" style="--ac:var(--blue);width:100%;margin-bottom:0.6rem">' +
                '<span class="em">💦</span>Quick rinse (free)</button>';
    return sheet("🫧 Bath time", rinse + (soaps.length
      ? '<div class="items">' + soaps.map(function (id) {
          var it = D.itemById(id);
          return '<button class="item" data-use="' + id + '"><span class="pic">' + it.emoji + "</span>" +
                 '<span class="nm">' + esc(it.name) + '</span><span class="own">×' + S.bag[id] + "</span></button>";
        }).join("") + "</div>"
      : ""));
  }

  function doAction(what) {
    if (what === "feed") return openSheet(feedSheet());
    if (what === "play") return openSheet(playSheet());
    if (what === "wash") return openSheet(washSheet());
    if (what === "rest") {
      anim.napping = true;
      S.pet.energy = clamp(S.pet.energy + 18, 0, 100);
      S.pet.happy = clamp(S.pet.happy + 2, 0, 100);
      say("Zzz… 💤", 2600);
      sfx("pop");
      setTimeout(function () { anim.napping = false; }, 2600);
      save();
      return render();
    }
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
     THE MARKET — buying is a maths lesson wearing a hat.
     From the Middle level up, the shopkeeper asks you to work
     out your change before handing anything over. Get it wrong
     and you still get the item — you just miss the tip.
     ========================================================= */
  function marketHtml() {
    var stock = D.shopStock();
    var cards = stock.map(function (it) {
      var owned = it.kind === "brush" ? (S.colours.indexOf(it.colour) !== -1) : false;
      var afford = S.coins >= it.cost;
      var pic = it.kind === "brush"
        ? '<span class="brushdot" style="background:' + it.swatch + '"></span>'
        : '<span class="pic">' + it.emoji + "</span>";
      return '<button class="item" data-buy="' + esc(it.id) + '"' + (!afford || owned ? " disabled" : "") + ">" +
        pic + '<span class="nm">' + esc(it.name) + "</span>" +
        (owned ? '<span class="own">owned</span>' : '<span class="price">🪙 ' + it.cost + "</span>") +
        (S.bag[it.id] ? '<span class="own">have ' + S.bag[it.id] + "</span>" : "") +
      "</button>";
    }).join("");
    return '<div class="panel">' +
      "<h2>🏪 The Market</h2>" +
      '<p class="sub">Fresh stock every morning, the same for the whole family. You have 🪙 ' + S.coins + ".</p>" +
      '<div class="items">' + cards + "</div>" +
      '<p class="sub" style="margin-top:0.8rem">🖌️ Paint brushes change your Craepet\'s color for good — ' +
        "and the 🌈 Rainbow Pool gives one away free every 15 right answers.</p>" +
    "</div>";
  }

  function tryBuy(id) {
    var stock = D.shopStock();
    var it = null;
    for (var i = 0; i < stock.length; i++) if (stock[i].id === id) it = stock[i];
    if (!it || S.coins < it.cost) return;

    var t = tier();
    if (t === "tot" || t === "early") return finishBuy(it, 0);

    // the shopkeeper's change question
    var left = S.coins - it.cost;
    var wrong = D._u.nearMiss(left, Math.max(3, Math.round(it.cost * 0.4)))
      .map(function (n) { return "🪙 " + n; });
    var q = D._u.mk({
      subject: "math",
      q: "You have 🪙 " + S.coins + " and this costs 🪙 " + it.cost + ". How much will you have left?",
      right: "🪙 " + left, wrong: wrong,
      teach: S.coins + " − " + it.cost + " = " + left + "."
    }, t);
    pendingBuy = { item: it, q: q, correct: "🪙 " + left };
    openSheet(sheet("🧾 " + esc(it.name) + " — 🪙 " + it.cost,
      '<div class="qcard"><p class="qprompt">' + esc(q.q) + "</p>" +
      '<div class="choices">' + q.choices.map(function (c, i) {
        return '<button class="choice" data-change="' + i + '">' + esc(c.t) + "</button>";
      }).join("") + "</div></div>"));
  }

  function answerChange(idx) {
    if (!pendingBuy) return;
    var ok = idx === pendingBuy.q.answer;
    var it = pendingBuy.item;
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
    finishBuy(it, ok ? tip : 0);
  }

  function finishBuy(it, tip) {
    S.coins -= it.cost;
    if (tip) earn(tip);
    bump("buy");
    if (it.kind === "brush") {
      if (S.colours.indexOf(it.colour) === -1) S.colours.push(it.colour);
      closeSheet();
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
    toast("Bought " + it.emoji + " " + it.name + "!");
    sfx("coin");
  }

  /* =========================================================
     THE BAG
     ========================================================= */
  function bagHtml() {
    var ids = Object.keys(S.bag).filter(function (id) { return S.bag[id] > 0; });
    var brushes = P.COLOURS.filter(function (c) { return S.colours.indexOf(c.id) !== -1; });
    var body = ids.length
      ? '<div class="items">' + ids.map(function (id) {
          var it = D.itemById(id);
          if (!it) return "";
          return '<button class="item" data-use="' + esc(id) + '"><span class="pic">' + it.emoji + "</span>" +
                 '<span class="nm">' + esc(it.name) + '</span><span class="own">×' + S.bag[id] + "</span></button>";
        }).join("") + "</div>"
      : '<p class="sub">Your bag is empty. The 🍓 Farm drops food, the 📖 Well turns up books, ' +
        "and the 🏪 Market sells everything else.</p>";

    return '<div class="panel">' +
      "<h2>🎒 Your bag</h2>" +
      '<p class="sub">Tap anything to use it on ' + esc(S.pet.name) + ".</p>" + body +
    "</div>" +
    '<div class="panel">' +
      "<h2>🎨 Colors you own</h2>" +
      '<p class="sub">Tap a color to repaint ' + esc(S.pet.name) + " — it's free once you own the brush.</p>" +
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
    battle = { rival: r, foeHp: r.hp, foeMax: r.hp, myHp: maxHp(), myMax: maxHp(), q: null, state: "ask", log: r.taunt };
    battle.q = D.ask(r.subject === "mixed" ? ["math", "word", "wonder"][Math.floor(Math.random() * 3)] : r.subject, tier());
    bump("arena");
    view = "arena";
    render();
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
    var r = battle.rival;
    var subj = r.subject === "mixed"
      ? ["math", "word", "wonder"][Math.floor(Math.random() * 3)] : r.subject;
    battle.q = D.ask(subj, tier());
    battle.state = "ask";
    battle.chose = -1;
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
      ? '<p class="sub">Today\'s gift is already collected. Come back tomorrow!</p>'
      : '<p><button class="act" data-gift="1" style="--ac:var(--yellow);width:100%">' +
        '<span class="em">🎁</span>Collect today\'s gift</button></p>';

    return '<div class="panel">' +
      "<h2>📜 Today's quests</h2>" +
      '<p class="sub">Three every day, the same three for everyone in the family. They reset overnight.</p>' +
      rows +
    "</div>" +
    '<div class="panel"><h2>🎁 Daily gift</h2>' +
      '<p class="sub">One free parcel a day, whether you have earned a coin or not.</p>' + gift +
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

  function dailyGift() {
    if (S.dailyGift) return;
    S.dailyGift = true;
    var coins = 20 + Math.floor(Math.random() * 20);
    earn(coins);
    var food = D.FOODS[Math.floor(Math.random() * D.FOODS.length)];
    addItem(food.id);
    checkTrophies();
    save();
    render();
    openSheet(sheet("🎁 Today's gift",
      '<p class="sub" style="font-size:1.05rem">🪙 ' + coins + " coins and " + food.emoji + " " + esc(food.name) + "!</p>" +
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
      ["📚", st.read, "books read"]
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
  function openSheet(html) {
    dropSheet();
    var wrap = document.createElement("div");
    wrap.innerHTML = html;
    document.body.appendChild(wrap.firstChild);
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
  }

  /* =========================================================
     ONE CLICK HANDLER FOR THE WHOLE VALLEY
     ========================================================= */
  function onClick(ev) {
    var t = ev.target;
    if (!t || !t.closest) return;

    // who's playing
    if (t.closest("[data-swap]")) { sfx("pop"); return openSheet(whoSheet()); }
    var w = t.closest("[data-who]");
    if (w) { closeSheet(); return switchTo(w.dataset.who); }

    // sheets
    if (t.closest && t.closest("[data-close]")) return closeSheet();
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
        if (["farm", "well", "pool"].indexOf(dest) === -1) sess = null;
        if (dest !== "arena") battle = null;
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

    var buy = t.closest("[data-buy]");
    if (buy) return tryBuy(buy.dataset.buy);

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

  function switchTo(id) {
    if (id === who) return;
    save();
    who = id;
    try { localStorage.setItem(WHO_KEY, id); } catch (e) {}
    S = load(id);
    sess = null;
    battle = null;
    pendingBuy = null;
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
    grant: function (n) { S.coins += n; save(); render(); }
  };
})();
