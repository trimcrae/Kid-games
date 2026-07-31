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

   Little kids who can't type yet can tap a picture instead.

   What it teaches: vocabulary and categories, spelling, and —
   since longer answers literally carry you further — how many
   letters a word has.

   Saved in the browser, per kid.
   =========================================================== */

(function () {
  "use strict";

  var KIDS = [
    // Each kid gets their own sprite (sprites.js) and their own save slot.
    { id: "jeannie", name: "Jeannie", color: "#ff6fa5", tap: false, pace: "speedy" },
    { id: "cory",    name: "Cory",    color: "#2b8cff", tap: false, pace: "speedy" },
    { id: "ellie",   name: "Ellie",   color: "#9b3fc4", tap: true,  pace: "gentle" }
  ];

  var FINISH = 60;      // planks across the canyon — a proper long bridge

  var PACES = {
    gentle: { label: "Gentle bot", seconds: 45, min: 3, max: 6 },
    speedy: { label: "Speedy bot", seconds: 25, min: 5, max: 9 }
  };

  var SKINS = [
    { id: "wood",    name: "Wood",    cost: 0,   swatch: "repeating-linear-gradient(90deg,#b98a5a 0 6px,#ad7f51 6px 12px)" },
    { id: "stone",   name: "Stone",   cost: 60,  swatch: "repeating-linear-gradient(90deg,#9aa4ad 0 6px,#87929c 6px 12px)" },
    { id: "candy",   name: "Candy",   cost: 140, swatch: "repeating-linear-gradient(90deg,#ff8fc4 0 6px,#ffd1e6 6px 12px)" },
    { id: "ice",     name: "Ice",     cost: 250, swatch: "repeating-linear-gradient(90deg,#8fe0ff 0 6px,#d3f4ff 6px 12px)" },
    { id: "rainbow", name: "Rainbow", cost: 400, swatch: "linear-gradient(90deg,#ff5d8f,#ffd166,#3ddc84,#38b6ff,#8a5cff)" },
    { id: "gold",    name: "Gold",    cost: 650, swatch: "repeating-linear-gradient(90deg,#ffcf3f 0 6px,#ffe58a 6px 12px)" }
  ];

  var SAVE_KEY = "wordBridge.v1";
  var CURRENT_KID_KEY = "mcrae.currentKid";   // shared with the other games

  var kidRow = document.getElementById("kid-row");
  var optRow = document.getElementById("opt-row");
  var barEl = document.getElementById("bar");
  var shopEl = document.getElementById("shop");
  var skinsEl = document.getElementById("skins");
  var stageCanvas = document.getElementById("stage");
  var hudEl = document.getElementById("hud");
  var progYou = document.getElementById("prog-you");
  var progBot = document.getElementById("prog-bot");
  var modal = document.getElementById("modal");
  var card = document.getElementById("modal-card");

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* =========================================================
     SAVING
     ========================================================= */
  function blankKid() {
    return { coins: 0, races: 0, wins: 0, planks: 0, best: "", skin: "wood", owned: ["wood"], tap: null, pace: null };
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
      Object.keys(d).forEach(function (key) {
        if (s[k.id][key] === undefined) s[k.id][key] = d[key];
      });
      if (!Array.isArray(s[k.id].owned) || !s[k.id].owned.length) s[k.id].owned = ["wood"];
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
  function paceId() { return me().pace === null ? kid().pace : me().pace; }
  function pace() { return PACES[paceId()] || PACES.speedy; }

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
  var ELSEWHERE = {};
  WB_QUESTIONS.forEach(function (q, i) {
    Object.keys(ANSWERS[i]).forEach(function (k) {
      if (ELSEWHERE[k] === undefined) ELSEWHERE[k] = i;
    });
  });

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

  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function randInt(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }

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
      answered: false,
      coins: 0
    };
    WBStage.reset({ finish: FINISH, skin: me().skin, hero: kidId });
    renderHud();
    renderBar();
    nextRound();
  }

  /* ---------- the scene ---------- */
  function renderHud() {
    hudEl.innerHTML =
      "<span>" + kid().name + " " + race.you.laid + " / " + FINISH + " planks</span>" +
      '<span class="bot-side">Bot ' + race.bot.laid + " / " + FINISH + "</span>";
    progYou.style.width = Math.min(100, (race.you.laid / FINISH) * 100) + "%";
    progBot.style.width = Math.min(100, (race.bot.laid / FINISH) * 100) + "%";
  }

  /* Hand a word's letters to the stage, which slams them down one at a
     time and tells us how long that takes. */
  function dropPlanks(who, word) {
    var side = race[who];
    var letters = norm(word).toUpperCase().split("");
    var use = letters.slice(0, Math.max(0, FINISH - side.laid));
    side.words.push(word);
    side.laid += use.length;
    var ms = WBStage.addPlanks(who, use, word);
    renderHud();
    return ms;
  }

  function walk(who) {
    return WBStage.walk(who);
  }

  /* =========================================================
     ONE ROUND
     ========================================================= */
  function nextRound() {
    if (race.over) return;
    if (!race.deck.length) race.deck = questionDeck();
    race.q = race.deck.pop();
    race.round++;
    race.answered = false;
    race.left = pace().seconds * 1000;
    openModal();
    startClock();
  }

  function startClock() {
    if (tick) clearInterval(tick);
    var total = pace().seconds * 1000;
    tick = setInterval(function () {
      race.left -= 100;
      var bar = document.getElementById("timer-bar");
      if (bar) {
        bar.style.width = Math.max(0, (race.left / total) * 100) + "%";
        bar.parentNode.classList.toggle("low", race.left < total * 0.35);
      }
      if (race.left <= 0) {
        clearInterval(tick); tick = null;
        if (!race.answered) resolveRound(null);
      }
    }, 100);
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
      var ms = dropPlanks("you", word);
      me().planks += norm(word).length;
      race.coins += norm(word).length;
      if (norm(word).length > norm(me().best).length) me().best = word;
      renderBar();
      window.SFX && SFX.good && SFX.good();
      later(function () { walk("you"); }, ms);
      wait = ms + 1400;               // planks drop, you walk, camera follows
    }

    later(function () {
      if (race.over) return;
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
    var want = randInt(pace().min, pace().max);
    var pool = q.ok.filter(function (w) { return !race.used["bot:" + norm(w)]; });
    if (!pool.length) pool = q.ok;
    var best = pool[0], gap = 99;
    shuffle(pool).forEach(function (w) {
      var g = Math.abs(norm(w).length - want);
      if (g < gap) { gap = g; best = w; }
    });
    race.used["bot:" + norm(best)] = true;
    race.botSaid = best;
    var ms = dropPlanks("bot", best);
    later(function () { walk("bot"); }, ms);
  }

  /* =========================================================
     THE PROMPT MODAL
     ========================================================= */
  function openModal() {
    var q = WB_QUESTIONS[race.q];
    modal.hidden = false;
    card.dataset.q = race.q;            // so the play-test knows what's being asked
    card.dataset.round = race.round;    // …and can tell one round from the next
    card.innerHTML =
      '<h2 class="q-text">' + q.q + "</h2>" +
      '<p class="q-hint">' + (tapMode()
        ? "Tap an answer — the longer the word, the more planks!"
        : "The longer your answer, the further you walk. <b>" +
          (FINISH - race.you.laid) + "</b> planks left to the island.") +
      "</p>" +
      '<div class="timer"><i id="timer-bar"></i></div>' +
      '<div id="answer-area"></div>' +
      '<p class="feedback" id="feedback"></p>' +
      '<p class="race-line">' +
      (race.spellNote ? "That one is spelled <b>" + race.spellNote.toUpperCase() + "</b> — " : "") +
      (race.botSaid ? "the bot said <b>" + race.botSaid.toUpperCase() + "</b> — " : "") +
      "bot: " + race.bot.laid + " planks &nbsp;•&nbsp; you: " + race.you.laid + " planks</p>";

    var area = document.getElementById("answer-area");
    if (tapMode()) renderTaps(area, q); else renderTyping(area);
  }

  function closeModal() { modal.hidden = true; }

  function renderTyping(area) {
    var form = document.createElement("form");
    form.className = "answer-form";
    form.id = "answer-form";
    form.innerHTML =
      '<input type="text" id="answer-input" autocomplete="off" autocorrect="off" ' +
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

    // A nudge, never the answer: a first letter and a length.
    form.querySelector("#hint-btn").addEventListener("click", function () {
      if (race.answered) return;
      var pool = WB_QUESTIONS[race.q].ok.filter(function (w) {
        return !race.used["you:" + norm(w)];
      });
      if (!pool.length) return;
      var pick = pool[randInt(0, pool.length - 1)];
      say("Try one starting with <b>" + pick.charAt(0).toUpperCase() +
          "</b> — it would lay <b>" + norm(pick).length + "</b> planks!");
    });

    var input = form.querySelector("input");
    // don't yank a phone keyboard open; on a laptop it's just handy
    if (window.matchMedia && window.matchMedia("(min-width: 700px)").matches) input.focus();
  }

  function renderTaps(area, q) {
    var right = shuffle(q.pics).slice(0, 3);
    var others = [];
    WB_QUESTIONS.forEach(function (other) {
      if (other !== q && other.pics) others = others.concat(other.pics);
    });
    var wrong = shuffle(others).filter(function (p) {
      return !accepted(race.q, p[0]);       // never offer something that IS a right answer
    })[0];

    var opts = right.map(function (p) { return { pic: p, ok: true }; });
    if (wrong) opts.push({ pic: wrong, ok: false });

    var box = document.createElement("div");
    box.className = "taps";
    box.id = "taps";
    shuffle(opts).forEach(function (o) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tap";
      b.dataset.word = o.pic[0];
      b.dataset.ok = o.ok ? "1" : "0";
      b.innerHTML = '<span class="te">' + o.pic[1] + "</span>" + o.pic[0].toUpperCase();
      b.addEventListener("click", function () {
        if (o.ok) {
          tryAnswer(o.pic[0]);
        } else {
          window.SFX && SFX.nope && SFX.nope();
          b.classList.add("used");
          b.disabled = true;
          say("That's not one of those! Try another picture.");
        }
      });
      box.appendChild(b);
    });
    area.appendChild(box);
  }

  function tryAnswer(text) {
    if (race.over || race.answered) return;
    var m = accepted(race.q, text);
    if (!m) {
      say(whyNot(text));
      window.SFX && SFX.nope && SFX.nope();
      return;
    }
    if (race.used["you:" + m.key]) {
      say("You already used that one this race — think of a new one!");
      window.SFX && SFX.nope && SFX.nope();
      return;
    }
    race.used["you:" + m.key] = true;
    var word = ANSWERS[race.q][m.key];
    // A fixed-up spelling is worth showing, gently, on the next prompt.
    race.spellNote = m.fuzzy ? word : null;
    resolveRound(word);
  }

  // A real word in the wrong category deserves better than "I don't know".
  function whyNot(text) {
    var typed = String(text).trim().toUpperCase();
    var other = ELSEWHERE[norm(stripArticle(text))];
    if (other !== undefined && other !== race.q) {
      return "<b>" + typed + "</b> is a good word — but that's not " +
             WB_QUESTIONS[race.q].q.replace(/^Name /, "").replace(/^an? /, "a ") + ". Try again!";
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
    clearTimers();
    var youWon = race.you.laid >= FINISH;
    var m = me();
    m.races++;
    if (youWon) m.wins++;
    var prize = race.coins + (youWon ? 40 : 10);
    m.coins += prize;
    store();
    renderBar();
    renderShop();

    if (youWon) {
      window.SFX && SFX.win && SFX.win();
      window.Confetti && Confetti.burst && Confetti.burst();
    }

    modal.hidden = false;
    card.innerHTML =
      '<div class="win-panel">' +
      '<div class="big" id="win-art"></div>' +
      "<h2>" + (youWon ? "You reached the island first!" : "The bot got there first!") + "</h2>" +
      "<p>Your bridge: <b>" + race.you.laid + "</b> planks from <b>" +
      race.you.words.length + "</b> words. You earned <b>" + prize + "</b> coins!</p>" +
      '<p class="words">' + race.you.words.join(" · ").toUpperCase() + "</p>" +
      '<button class="btn" type="button" id="again-btn">Race again →</button>' +
      "</div>";
    var art = WBSprites.thumb(youWon ? "hero." + kidId + ".walk" : "bot.walk", 5, 1);
    if (art) document.getElementById("win-art").appendChild(art);
    document.getElementById("again-btn").addEventListener("click", newRace);
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
      (m.best ? " &nbsp;•&nbsp; Longest word: <b>" + m.best.toUpperCase() + "</b>" : "");
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
      b.appendChild(document.createTextNode(
        owned ? (m.skin === s.id ? "wearing it" : "tap to use") : s.cost + " coins"));
      b.addEventListener("click", function () {
        var mm = me();
        if (mm.owned.indexOf(s.id) < 0) {
          if (mm.coins < s.cost) { window.SFX && SFX.nope && SFX.nope(); return; }
          mm.coins -= s.cost;
          mm.owned.push(s.id);
          window.SFX && SFX.win && SFX.win();
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

  function renderPickers() {
    kidRow.innerHTML = "";
    KIDS.forEach(function (k) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pick" + (k.id === kidId ? " on" : "");
      b.style.setProperty("--pc", k.color);
      b.dataset.kid = k.id;
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
        newRace();
      });
      kidRow.appendChild(b);
    });

    optRow.innerHTML = "";
    [
      { id: "type", label: "Type it", on: !tapMode(), set: function () { me().tap = false; } },
      { id: "tap",  label: "Tap a picture", on: tapMode(), set: function () { me().tap = true; } }
    ].forEach(function (o) { optRow.appendChild(optButton(o, "#8a5cff")); });

    Object.keys(PACES).forEach(function (id) {
      optRow.appendChild(optButton({
        id: id, label: PACES[id].label, on: paceId() === id,
        set: function () { me().pace = id; }
      }, "#38b6ff"));
    });
  }

  function optButton(o, colour) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "pick" + (o.on ? " on" : "");
    b.style.setProperty("--pc", colour);
    b.dataset.opt = o.id;
    b.textContent = o.label;
    b.addEventListener("click", function () {
      if (o.on) return;
      o.set();
      store();
      renderPickers();
      newRace();
    });
    return b;
  }

  document.getElementById("restart-btn").addEventListener("click", newRace);
  document.getElementById("shop-btn").addEventListener("click", function () {
    shopEl.classList.toggle("open");
    if (shopEl.classList.contains("open")) shopEl.scrollIntoView({ block: "nearest" });
  });

  // The play-test checks answer coverage in bulk through this.
  window.WBCheck = function (qIndex, text) { return accepted(qIndex, text); };

  WBStage.init(stageCanvas);
  renderPickers();
  renderShop();
  newRace();
})();
