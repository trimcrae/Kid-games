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
    { id: "shannon", name: "Shannon", color: "#12a594", tap: false, pace: "pro" }
  ];

  var FINISH = 60;      // planks across the canyon — a proper long bridge

  /* The rival. `min`/`max` are how many planks it lays per round, so they
     set the whole pace of a crossing: gentle is beatable by a five-year-old
     typing CAT, pro needs grown-up words at speed. */
  var PACES = {
    gentle: { label: "Gentle bot", seconds: 50, min: 3, max: 5, fumble: 0.18 },
    speedy: { label: "Speedy bot", seconds: 30, min: 4, max: 8, fumble: 0.06 },
    pro:    { label: "Pro bot",    seconds: 18, min: 7, max: 11, fumble: 0 }
  };

  var SKINS = [
    { id: "wood",    name: "Wood",    cost: 0 },
    { id: "stone",   name: "Stone",   cost: 60 },
    { id: "candy",   name: "Candy",   cost: 140 },
    { id: "ice",     name: "Ice",     cost: 250 },
    { id: "rainbow", name: "Rainbow", cost: 400 },
    { id: "gold",    name: "Gold",    cost: 650 }
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

  var SAVE_KEY = "wordBridge.v1";
  var CURRENT_KID_KEY = "mcrae.currentKid";   // shared with the other games

  var kidRow = document.getElementById("kid-row");
  var optRow = document.getElementById("opt-row");
  var barEl = document.getElementById("bar");
  var shopEl = document.getElementById("shop");
  var skinsEl = document.getElementById("skins");
  var sceneEl = document.getElementById("scene");
  var stageCanvas = document.getElementById("stage");
  var hudEl = document.getElementById("hud");
  var progYou = document.getElementById("prog-you");
  var progBot = document.getElementById("prog-bot");
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
      bestStreak: 0, right: 0, fewest: 0
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

  function rank(planks) {
    var name = RANKS[0][1];
    for (var i = 0; i < RANKS.length; i++) if (planks >= RANKS[i][0]) name = RANKS[i][1];
    return name;
  }
  function nextRank(planks) {
    for (var i = 0; i < RANKS.length; i++) if (planks < RANKS[i][0]) return RANKS[i];
    return null;
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
      note: null            // the coaching line shown on the NEXT prompt
    };
    if (pauseBar) pauseBar.hidden = true;
    WBStage.reset({ finish: FINISH, skin: me().skin, hero: kidId });
    renderHud();
    renderBar();
    nextRound();
  }

  /* ---------- the scene ---------- */
  function renderHud() {
    hudEl.innerHTML =
      "<span>" + esc(kid().name) + " " + race.you.laid + " / " + FINISH + " planks</span>" +
      '<span class="bot-side">Bot ' + race.bot.laid + " / " + FINISH + "</span>";
    progYou.style.width = Math.min(100, (race.you.laid / FINISH) * 100) + "%";
    progBot.style.width = Math.min(100, (race.bot.laid / FINISH) * 100) + "%";
    // A canvas says nothing to a screen reader, so the scene carries the score.
    if (sceneEl) {
      sceneEl.setAttribute("aria-label",
        "The canyon. " + kid().name + " has laid " + race.you.laid + " of " + FINISH +
        " planks; the bot has laid " + race.bot.laid + ".");
    }
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
  function nextRound() {
    if (race.over) return;
    if (!race.deck.length) race.deck = questionDeck();
    race.q = race.deck.pop();
    race.round++;
    race.answered = false;
    race.hints = 0;
    race.left = pace().seconds * 1000;
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

  /* Running out isn't a dead end — it's the moment to teach a word. */
  function timeUp() {
    var top = (WB_QUESTIONS[race.q].top || []).filter(function (w) {
      return !race.used["you:" + norm(w)];
    });
    var pick = top.length ? top[randInt(0, top.length - 1)] : null;
    race.streak = 0;
    race.note = pick
      ? "⏰ Time ran out! You could have said <b>" + esc(pick.toUpperCase()) +
        "</b> — that's <b>" + norm(pick).length + "</b> planks."
      : "⏰ Time ran out on that one!";
    window.SFX && SFX.nope && SFX.nope();
    resolveRound(null);
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
      var drop = dropPlanks("you", word);
      var m = me();
      m.planks += drop.laid;
      m.right++;
      race.coins += drop.laid;
      race.streak++;
      if (race.streak > race.bestStreak) race.bestStreak = race.streak;
      if (race.streak > m.bestStreak) m.bestStreak = race.streak;
      // three in a row without a slip is worth something
      if (race.streak % 3 === 0) {
        race.coins += 5;
        race.note = "🔥 <b>" + race.streak + " in a row!</b> Bonus <b>5</b> coins.";
        window.SFX && SFX.streak && SFX.streak(race.streak);
      }
      if (norm(word).length > norm(m.best).length) {
        m.best = word;
        if (norm(word).length >= 8) {
          race.note = "🏆 <b>" + esc(word.toUpperCase()) + "</b> is your longest word ever!";
        }
      }
      store();
      renderBar();
      window.SFX && SFX.good && SFX.good();
      later(function () { walk("you"); }, drop.ms);
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
    // grown-up dictionary that nobody in this house has heard of.
    var pool = (q.top || q.ok).filter(function (w) { return !race.used["bot:" + norm(w)]; });
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
    if (race.botFumbled) lines.push("🤖 The bot got stuck and laid <b>no</b> planks!");
    else if (race.botSaid) {
      lines.push("🤖 The bot said <b>" + esc(race.botSaid.toUpperCase()) + "</b> — <b>" +
                 norm(race.botSaid).length + "</b> planks.");
    }
    race.note = null;
    race.spellNote = null;

    card.innerHTML =
      '<button class="pause-btn" type="button" id="pause-btn" aria-label="Pause the race">⏸</button>' +
      '<p class="round-line">Round ' + race.round +
      (race.streak >= 2 ? ' &nbsp;•&nbsp; <span class="streak">🔥 ' + race.streak + ' in a row</span>' : "") +
      "</p>" +
      '<h2 class="q-text">' + esc(q.q) + "</h2>" +
      '<p class="q-hint">' + (tapMode()
        ? "Tap an answer — the longer the word, the more planks!"
        : "The longer your answer, the further you walk. <b>" +
          (FINISH - race.you.laid) + "</b> planks left to the island.") +
      "</p>" +
      '<div class="timer"><i id="timer-bar"></i></div>' +
      '<div id="answer-area"></div>' +
      '<p class="feedback" id="feedback" role="status" aria-live="polite"></p>' +
      '<p class="race-line">' + (lines.length ? lines.join("<br>") + "<br>" : "") +
      "bot: " + race.bot.laid + " planks &nbsp;•&nbsp; you: " + race.you.laid + " planks</p>";

    var area = document.getElementById("answer-area");
    if (tapMode()) renderTaps(area, q); else renderTyping(area);
    document.getElementById("pause-btn").addEventListener("click", function () { setPaused(true); });
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
      var pool = (q.top || q.ok).filter(function (w) {
        return !race.used["you:" + norm(w)];
      });
      if (!pool.length) pool = q.top || q.ok;
      if (!race.hintWord || race.hints === 0) {
        race.hintWord = pool[randInt(0, pool.length - 1)];
      }
      var pick = race.hintWord;
      var n = norm(pick);
      race.hints++;
      if (race.hints === 1) {
        say("Try one starting with <b>" + esc(pick.charAt(0).toUpperCase()) +
            "</b> — it would lay <b>" + n.length + "</b> planks!");
      } else if (race.hints === 2) {
        say("It begins <b>" + esc(n.slice(0, 2).toUpperCase()) + "…</b> and has <b>" +
            n.length + "</b> letters.");
      } else {
        say("The word is <b>" + esc(pick.toUpperCase()) + "</b> — type it in!");
      }
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
                    esc(o.pic[0].toUpperCase());
      b.addEventListener("click", function () {
        if (race.answered || race.paused) return;
        if (o.ok) {
          window.SFX && SFX.pop && SFX.pop();
          tryAnswer(o.pic[0]);
        } else {
          window.SFX && SFX.nope && SFX.nope();
          b.classList.add("used");
          b.disabled = true;
          race.streak = 0;
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
      say(whyNot(text));
      window.SFX && SFX.nope && SFX.nope();
      return;
    }
    if (race.used["you:" + m.key]) {
      say("You already used <b>" + esc(ANSWERS[race.q][m.key].toUpperCase()) +
          "</b> this race — think of a new one!");
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
    var m = me();
    m.races++;
    if (youWon) {
      m.wins++;
      if (!m.fewest || race.you.words.length < m.fewest) m.fewest = race.you.words.length;
    }
    var prize = race.coins + (youWon ? 40 : 10);
    m.coins += prize;
    store();
    renderBar();
    renderShop();

    if (youWon) {
      window.SFX && SFX.win && SFX.win();
      window.Confetti && Confetti.burst && Confetti.burst();
    }

    var next = nextRank(m.planks);
    var words = race.you.words.map(function (w) {
      return esc(w.toUpperCase()) + " <i>(" + norm(w).length + ")</i>";
    }).join(" · ");

    modal.hidden = false;
    card.innerHTML =
      '<div class="win-panel">' +
      '<div class="big" id="win-art"></div>' +
      "<h2>" + (youWon ? "You reached the island first!" : "The bot got there first!") + "</h2>" +
      "<p>Your bridge: <b>" + race.you.laid + "</b> planks from <b>" +
      race.you.words.length + "</b> words. You earned <b>" + prize + "</b> coins!" +
      (race.bestStreak >= 3 ? " Best run: <b>" + race.bestStreak + " in a row</b> 🔥" : "") +
      "</p>" +
      '<p class="words">' + words + "</p>" +
      '<p class="rank-line">🏅 <b>' + esc(rank(m.planks)) + "</b>" +
      (next ? " — " + (next[0] - m.planks) + " more planks to <b>" + esc(next[1]) + "</b>" : " — top rank!") +
      (m.fewest ? "<br>Fastest crossing so far: <b>" + m.fewest + "</b> words. Beat it!" : "") +
      "</p>" +
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
      " &nbsp;•&nbsp; 🏅 <b>" + esc(rank(m.planks)) + "</b>" +
      (m.bestStreak ? " &nbsp;•&nbsp; Best run: <b>" + m.bestStreak + " 🔥</b>" : "") +
      (m.best ? " &nbsp;•&nbsp; Longest word: <b>" + esc(m.best.toUpperCase()) + "</b>" : "");
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
      b.appendChild(document.createTextNode(state));
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
    b.setAttribute("aria-pressed", o.on ? "true" : "false");
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
    var open = shopEl.classList.toggle("open");
    document.getElementById("shop-btn").setAttribute("aria-expanded", open ? "true" : "false");
    // Browsing skins shouldn't cost you the round you're in the middle of.
    setPaused(open);
    if (open) shopEl.scrollIntoView({ block: "nearest" });
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

  WBStage.init(stageCanvas);
  renderPickers();
  renderShop();
  newRace();
})();
