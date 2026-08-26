/* ===========================================================
   Word Guess — a kid-friendly version of Wordle.
   -----------------------------------------------------------
   Guess the secret word in 6 tries. After each guess every
   letter is scored — and, because roughly 1 in 12 boys is
   colour-blind, every tile carries a SHAPE as well as a colour:

     🟩 ✔  green  = right letter, right spot
     🟨 ↔  yellow = right letter, wrong spot
     ⬜ ✖  grey   = letter not in the word

   Four tiers (words.js) so the whole family gets words at their
   own level, a Word of the Day for a reason to come back, a
   "🔎 Detective" panel that teaches the deduction, and the
   MEANING of the word the moment the round ends.

   Teaches: spelling, letter patterns, vocabulary and deduction.

   To ADD WORDS: edit words.js.
   =========================================================== */

(function () {
  "use strict";

  const TRIES = 6;

  /* ---------- tiers ---------- */
  const TIERS = [
    { id: "easy",   len: 4, btn: "easy-btn",   name: "Easy",     pool: WG_EASY },
    { id: "normal", len: 5, btn: "normal-btn", name: "Normal",   pool: WG_NORMAL },
    { id: "tricky", len: 5, btn: "tricky-btn", name: "Big Kid",  pool: WG_TRICKY },
    { id: "grown",  len: 5, btn: "grown-btn",  name: "Grown-up", pool: WG_GROWN },
  ];
  const BY_ID = {};
  TIERS.forEach(function (t) { BY_ID[t.id] = t; });

  /* Allowed guesses: the big DICT4/DICT5 lists (dictionary.js) plus every
     answer from every tier plus the hand-written extras — so any real
     English word a kid types counts as a guess. */
  function dictArray(d) {
    if (Array.isArray(d)) return d;
    if (typeof d === "string") return d.split(" ");
    return [];
  }
  function buildAllowed(len) {
    const s = new Set(dictArray(len === 4 ? (typeof DICT4 !== "undefined" ? DICT4 : null)
                                          : (typeof DICT5 !== "undefined" ? DICT5 : null)));
    TIERS.forEach(function (t) {
      if (t.len === len) t.pool.forEach(function (e) { s.add(e.word); });
    });
    (len === 4 ? WG_EXTRA4 : WG_EXTRA5).forEach(function (w) { if (w.length === len) s.add(w); });
    return s;
  }
  const ALLOWED = { 4: buildAllowed(4), 5: buildAllowed(5) };

  let tierId = "normal";
  let daily = false;
  let LEN = 5;

  function tier() { return BY_ID[tierId] || BY_ID.normal; }
  function poolFor() { return tier().pool; }
  function allowedFor() { return ALLOWED[LEN] || ALLOWED[5]; }

  /* ---------- saved stats (v1 → v2 migration, nothing gets orphaned) ---------- */
  const KEY = "wordGuess.v2";
  const OLD_KEY = "wordGuess.v1";

  function blank() {
    return {
      v: 2,
      streak: 0, best: 0, wins: 0, played: 0, losses: 0,
      dist: [0, 0, 0, 0, 0, 0],          // wins in 1..6 guesses
      bag: {}, last: {},                  // shuffled answer bag, per tier
      tier: "normal", daily: false,
      dailyStreak: 0, dailyBest: 0, dailyLast: "", dailyDone: {},
      rounds: {},                         // in-progress board, per tier+mode
    };
  }
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    if (!s || typeof s !== "object") {
      s = blank();
      let old = null;
      try { old = JSON.parse(localStorage.getItem(OLD_KEY)); } catch (e) {}
      if (old && typeof old === "object") {
        // carry the old save forward so a streak the kids built is never lost
        s.streak = Number(old.streak) || 0;
        s.best = Number(old.best) || Number(old.streak) || 0;
        s.wins = Number(old.wins) || 0;
        s.played = Number(old.played) || 0;
        s.losses = Math.max(0, s.played - s.wins);
        if (old.bag && typeof old.bag === "object") {
          if (Array.isArray(old.bag[4])) s.bag.easy = old.bag[4];
          if (Array.isArray(old.bag[5])) s.bag.normal = old.bag[5];
        }
      }
    }
    // belt-and-braces normalising, so a half-written save can't soft-lock the game
    const d = blank();
    for (const k in d) if (!(k in s)) s[k] = d[k];
    if (!Array.isArray(s.dist) || s.dist.length !== TRIES) s.dist = [0, 0, 0, 0, 0, 0];
    s.dist = s.dist.map(function (n) { return Number(n) || 0; });
    ["streak", "best", "wins", "played", "losses", "dailyStreak", "dailyBest"].forEach(function (k) {
      s[k] = Math.max(0, Number(s[k]) || 0);
    });
    if (!s.bag || typeof s.bag !== "object") s.bag = {};
    if (!s.last || typeof s.last !== "object") s.last = {};
    if (!s.rounds || typeof s.rounds !== "object") s.rounds = {};
    if (!s.dailyDone || typeof s.dailyDone !== "object") s.dailyDone = {};
    if (!BY_ID[s.tier]) s.tier = "normal";
    s.daily = !!s.daily;
    s.v = 2;
    return s;
  }
  const stats = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(stats)); } catch (e) {} }

  /* ---------- refs ---------- */
  const $ = function (id) { return document.getElementById(id); };
  const el = {
    streak: $("streak"), wins: $("wins"), best: $("best"),
    hint: $("hint"), feedback: $("feedback"), coach: $("coach"),
    grid: $("grid"), kb: $("kb"), hintBtn: $("hint-btn"), newBtn: $("new-btn"),
    statsBtn: $("stats-btn"), statsPanel: $("stats-panel"), statsBody: $("stats-body"),
    statsClose: $("stats-close"), practiceBtn: $("practice-btn"), dailyBtn: $("daily-btn"),
    modeNote: $("mode-note"), live: $("live"),
  };

  /* ---------- live state ---------- */
  let answer = null;
  let row = 0;
  let guess = "";
  let over = false;
  let hintStage = 0;
  let guesses = [];
  const keyState = {};

  const MARK = { correct: "✔", present: "↔", absent: "✖" };
  const SAYS = {
    correct: "right spot",
    present: "in the word but the wrong spot",
    absent: "not in the word",
  };

  /* ---------- picking the secret word ---------- */
  function dayKey(d) {
    d = d || new Date();
    const p = function (n) { return n < 10 ? "0" + n : "" + n; };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }
  function hash(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }
  function dailyIndex() { return hash(dayKey() + "|" + tierId + "|wordguess") % poolFor().length; }

  /* practice draws from a shuffled bag, so every word gets a turn
     before any of them repeats — much more variety than pure random. */
  function pickPractice() {
    const pool = poolFor();
    let bag = stats.bag[tierId];
    const bad = !Array.isArray(bag) || bag.length === 0 ||
      bag.some(function (i) { return !(typeof i === "number" && i >= 0 && i < pool.length); });
    if (bad) {
      bag = pool.map(function (_, i) { return i; });
      for (let k = bag.length - 1; k > 0; k--) {
        const j = Math.floor(Math.random() * (k + 1));
        const tmp = bag[k]; bag[k] = bag[j]; bag[j] = tmp;
      }
      if (bag.length > 1 && bag[0] === stats.last[tierId]) { const t = bag[0]; bag[0] = bag[1]; bag[1] = t; }
      stats.bag[tierId] = bag;
    }
    const i = bag.shift();
    stats.last[tierId] = i;
    return pool[i];
  }

  /* ---------- board ---------- */
  function buildGrid() {
    el.grid.innerHTML = "";
    el.grid.style.setProperty("--cols", LEN);
    for (let r = 0; r < TRIES; r++) {
      const rowEl = document.createElement("div");
      rowEl.className = "row";
      rowEl.dataset.row = r;
      rowEl.setAttribute("role", "group");
      rowEl.setAttribute("aria-label", "Guess " + (r + 1));
      rowEl.style.gridTemplateColumns = "repeat(" + LEN + ", 1fr)";
      for (let c = 0; c < LEN; c++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.setAttribute("aria-label", "empty");
        rowEl.appendChild(cell);
      }
      el.grid.appendChild(rowEl);
    }
  }

  const KB_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
  function buildKeyboard() {
    el.kb.innerHTML = "";
    KB_ROWS.forEach(function (line, idx) {
      const r = document.createElement("div");
      r.className = "kb-row";
      if (idx === 2) r.appendChild(makeKey("Enter", "enter", true));
      line.split("").forEach(function (c) { r.appendChild(makeKey(c, c, false)); });
      if (idx === 2) r.appendChild(makeKey("⌫", "back", true));
      el.kb.appendChild(r);
    });
  }
  function makeKey(label, key, wide) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "key" + (wide ? " wide" : "");
    b.textContent = label;
    b.dataset.key = key;
    b.setAttribute("aria-label",
      key === "enter" ? "Enter guess" : key === "back" ? "Delete letter" : "Letter " + label.toUpperCase());
    b.addEventListener("click", function () { b.blur(); handleKey(key); });
    return b;
  }
  function paintKeys() {
    const keys = el.kb.querySelectorAll(".key");
    for (let i = 0; i < keys.length; i++) {
      const b = keys[i], k = b.dataset.key;
      if (k.length !== 1) continue;
      b.classList.remove("correct", "present", "absent");
      const st = keyState[k];
      if (st) {
        b.classList.add(st);
        b.dataset.mark = MARK[st];
        b.setAttribute("aria-label", "Letter " + k.toUpperCase() + ", " + SAYS[st]);
      } else {
        delete b.dataset.mark;
        b.setAttribute("aria-label", "Letter " + k.toUpperCase());
      }
    }
  }

  function rowCells(r) { return el.grid.children[r].children; }

  function render() {
    if (row >= TRIES) return;
    const cells = rowCells(row);
    for (let c = 0; c < LEN; c++) {
      cells[c].textContent = guess[c] ? guess[c].toUpperCase() : "";
      cells[c].classList.toggle("filled", !!guess[c]);
      cells[c].setAttribute("aria-label", guess[c] ? guess[c].toUpperCase() + ", not guessed yet" : "empty");
    }
  }

  function flash(msg, color) {
    el.feedback.style.color = color || "var(--green)";
    el.feedback.textContent = msg;
  }
  function announce(msg) { if (el.live) el.live.textContent = msg; }

  /* ---------- scoring (two passes, so duplicate letters colour correctly) ----------
     Guess SPEED against ERASE: the first E is yellow, the second E is green,
     the third E must be GREY because ERASE only owns two Es. */
  function scoreGuess(g, target) {
    const n = target.length;
    const res = new Array(n).fill("absent");
    const counts = {};
    for (let i = 0; i < n; i++) counts[target[i]] = (counts[target[i]] || 0) + 1;
    for (let c = 0; c < n; c++) {
      if (g[c] === target[c]) { res[c] = "correct"; counts[g[c]]--; }
    }
    for (let c = 0; c < n; c++) {
      if (res[c] === "correct") continue;
      if (counts[g[c]] > 0) { res[c] = "present"; counts[g[c]]--; }
    }
    return res;
  }

  function paintRow(r, g, res, animate) {
    const cells = rowCells(r);
    for (let c = 0; c < g.length; c++) {
      const cell = cells[c];
      cell.textContent = g[c].toUpperCase();
      cell.classList.remove("filled", "correct", "present", "absent", "flip");
      cell.classList.add(res[c]);
      cell.dataset.mark = MARK[res[c]];
      cell.setAttribute("aria-label", g[c].toUpperCase() + ", " + SAYS[res[c]]);
      if (animate) {
        cell.style.animationDelay = (c * 70) + "ms";
        void cell.offsetWidth;
        cell.classList.add("flip");
      }
    }
  }

  function bumpKeys(g, res) {
    for (let c = 0; c < g.length; c++) {
      const letter = g[c], cur = keyState[letter], next = res[c];
      // correct beats present beats absent — never downgrade a key
      if (next === "correct" || (next === "present" && cur !== "correct") || (next === "absent" && !cur)) {
        keyState[letter] = next;
      }
    }
  }

  function badRow() {
    const r = el.grid.children[Math.min(row, TRIES - 1)];
    if (!r) return;
    r.classList.remove("bad"); void r.offsetWidth; r.classList.add("bad");
  }

  /* ---------- the 🔎 detective panel: this is where the strategy is taught ---------- */
  function fits(word) {
    for (let i = 0; i < guesses.length; i++) {
      const a = scoreGuess(guesses[i], word);
      const b = scoreGuess(guesses[i], answer.word);
      for (let c = 0; c < a.length; c++) if (a[c] !== b[c]) return false;
    }
    return true;
  }
  function candidates() {
    return poolFor().filter(function (e) { return fits(e.word); });
  }

  function updateCoach() {
    if (!el.coach) return;
    if (!guesses.length) {
      el.coach.innerHTML = '<span class="coach-tip">🔎 Tip: start with a word full of different letters — ' +
        (LEN === 4 ? "like RAIN or SLOT." : "like CRANE or SLATE.") + " Every grey letter you find is progress!</span>";
      return;
    }
    const known = new Array(LEN).fill("_");
    const scored = guesses.map(function (g) { return scoreGuess(g, answer.word); });

    // pass 1: every letter we've proved is IN the word (green or yellow, anywhere)
    const inWord = [];
    scored.forEach(function (res, i) {
      for (let c = 0; c < LEN; c++) {
        const L = guesses[i][c].toUpperCase();
        if (res[c] === "correct") { known[c] = L; if (inWord.indexOf(L) < 0) inWord.push(L); }
        else if (res[c] === "present" && inWord.indexOf(L) < 0) inWord.push(L);
      }
    });
    // pass 2: a letter is only "ruled out" if it never showed up as green OR yellow.
    // (Without this, the grey first E of EAGLE would wrongly rule out the green E.)
    const out = [];
    scored.forEach(function (res, i) {
      for (let c = 0; c < LEN; c++) {
        const L = guesses[i][c].toUpperCase();
        if (res[c] === "absent" && inWord.indexOf(L) < 0 && out.indexOf(L) < 0) out.push(L);
      }
    });

    const stillIn = inWord.filter(function (L) { return known.indexOf(L) < 0; });
    const left = candidates().length;
    let html = '<span class="c-known">✔ ' + known.join(" ") + "</span>";
    if (stillIn.length) html += '<span class="c-in">↔ somewhere: ' + stillIn.join(" ") + "</span>";
    if (out.length) html += '<span class="c-out">✖ ruled out: ' + out.slice(0, 14).join(" ") + "</span>";
    html += '<span class="c-left">🔎 ' + left + (left === 1 ? " word still fits" : " words still fit") + "</span>";
    el.coach.innerHTML = html;
  }

  /* ---------- feedback that says something useful ---------- */
  function guessNote(res, tries) {
    const g = res.filter(function (r) { return r === "correct"; }).length;
    const y = res.filter(function (r) { return r === "present"; }).length;
    const leftTries = TRIES - tries;
    if (g === 0 && y === 0) {
      return "No letters in there — but that rules out " + LEN + " letters. Real detective work! 🕵️";
    }
    if (g === 0) {
      return y === 1 ? "One letter is in the word, just in the wrong spot — move it! 🔁"
                     : y + " letters are in the word but in the wrong spots — shuffle them! 🔁";
    }
    let s = g === LEN - 1 ? "So close — " + g + " letters locked in! 🔥"
          : g === 1 ? "1 letter is in exactly the right spot! ✔"
          : g + " letters are in the right spots! ✔";
    if (y) s += " Plus " + y + " more hiding somewhere else.";
    if (leftTries === 1) s += " Last try — make it count!";
    return s;
  }

  function sparkleBurst() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const emojis = ["✨", "🟩", "🌟", "🎉"];
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    for (let i = 0; i < 12; i++) {
      const s = document.createElement("div");
      s.className = "sparkle"; s.textContent = emojis[i % emojis.length];
      s.style.left = (cx + (Math.random() - 0.5) * 260) + "px";
      s.style.top = (cy + (Math.random() - 0.5) * 120) + "px";
      document.body.appendChild(s);
      setTimeout(function () { s.remove(); }, 900);
    }
  }

  /* the vocabulary moment: every round ends by teaching the word */
  function showMeaning() {
    el.hint.innerHTML = '<b>' + answer.emoji + " " + answer.word.toUpperCase() + "</b> — " + answer.hint;
    el.hint.classList.add("meaning");
  }

  /* ---------- input ---------- */
  function inputLocked() { return over || !answer || el.statsPanel.classList.contains("open"); }

  function handleKey(key) {
    if (inputLocked()) return;
    if (key === "enter") { submit(); return; }
    if (key === "back") { guess = guess.slice(0, -1); render(); return; }
    if (key.length === 1 && key >= "a" && key <= "z") {
      if (guess.length < LEN) { guess += key; render(); }
    }
  }

  function submit() {
    if (guess.length < LEN) {
      flash("Type all " + LEN + " letters first! ✏️", "var(--pink)"); badRow(); announce("Need " + LEN + " letters");
      return;
    }
    if (!allowedFor().has(guess)) {
      flash("Hmm, " + guess.toUpperCase() + " isn't a word I know — try another! 🤔", "var(--pink)");
      badRow(); announce(guess + " is not in the word list");
      if (window.SFX) SFX.nope();
      return;
    }
    if (guesses.indexOf(guess) >= 0) {
      flash("You already tried " + guess.toUpperCase() + " — try a different word! 🔁", "var(--pink)");
      badRow(); announce("Already guessed " + guess);
      return;
    }

    const g = guess;
    const res = scoreGuess(g, answer.word);
    paintRow(row, g, res, true);
    bumpKeys(g, res);
    paintKeys();
    guesses.push(g);
    guess = "";

    const won = g === answer.word;
    row += 1;
    if (won) { win(); }
    else if (row >= TRIES) { lose(); }
    else {
      flash(guessNote(res, row), "var(--purple)");
      announce(g.split("").map(function (ch, i) { return ch.toUpperCase() + " " + SAYS[res[i]]; }).join(", "));
      updateCoach();
      if (window.SFX) { if (res.indexOf("correct") >= 0) SFX.good(); else SFX.pop(); }
      saveRound();
    }
  }

  /* ---------- end of round ---------- */
  const CHEERS = ["🤯 WOW! First try!", "🌟 Amazing — in 2!", "🎉 You got it in 3!",
                  "😄 You got it in 4!", "😊 Got it in 5!", "😅 Phew — just in time!"];

  function recordResult(won, tries) {
    stats.played += 1;
    if (won) {
      stats.wins += 1; stats.streak += 1;
      if (stats.streak > stats.best) stats.best = stats.streak;
      if (tries >= 1 && tries <= TRIES) stats.dist[tries - 1] += 1;
    } else {
      stats.losses += 1; stats.streak = 0;
    }
    if (daily) {
      const today = dayKey();
      stats.dailyDone[tierId + "|" + today] = { won: won, tries: tries };
      if (won) {
        const y = new Date(); y.setDate(y.getDate() - 1);
        stats.dailyStreak = (stats.dailyLast === dayKey(y)) ? stats.dailyStreak + 1 : 1;
        stats.dailyLast = today;
        if (stats.dailyStreak > stats.dailyBest) stats.dailyBest = stats.dailyStreak;
      } else {
        stats.dailyStreak = 0;
      }
    }
    save();
  }

  function win() {
    over = true;
    recordResult(true, row);
    saveRound();
    updateHud();
    flash(CHEERS[Math.min(row - 1, CHEERS.length - 1)], "var(--green)");
    showMeaning();
    endCoach(true);
    announce("You win! The word was " + answer.word);
    sparkleBurst();
    if (window.SFX) SFX.win();
    if (window.Confetti) Confetti.burst({ count: 100 });
  }
  function lose() {
    over = true;
    recordResult(false, 0);
    saveRound();
    updateHud();
    flash("Out of tries — the word was " + answer.word.toUpperCase() + ". You'll get the next one! 💪", "var(--pink)");
    showMeaning();
    endCoach(false);
    announce("Out of tries. The word was " + answer.word);
    if (window.SFX) SFX.nope();
  }

  function endCoach(won) {
    if (!el.coach) return;
    let html = '<span class="c-known">' + (won ? "✔ Solved in " + row + (row === 1 ? " guess" : " guesses") : "✖ Not this time") + "</span>";
    // show the other words that ALSO fitted the clues — that's the lesson
    const others = candidates().filter(function (e) { return e.word !== answer.word; });
    if (!won && others.length) {
      html += '<span class="c-in">These also fitted your clues: ' +
        others.slice(0, 4).map(function (e) { return e.word.toUpperCase(); }).join(", ") + "</span>";
    }
    html += '<span class="c-left">' + (daily ? "🗓️ Come back tomorrow for a new Word of the Day!" : "🔄 Tap New word to keep going") + "</span>";
    el.coach.innerHTML = html;
  }

  function updateHud() {
    el.streak.textContent = daily ? stats.dailyStreak : stats.streak;
    el.best.textContent = daily ? stats.dailyBest : stats.best;
    el.wins.textContent = stats.wins;
    const lbl = $("streak-label");
    if (lbl) lbl.textContent = daily ? "Daily streak" : "Streak";
  }

  /* ---------- saving / restoring the board in progress ---------- */
  function roundKey() { return tierId + "|" + (daily ? "d" : "p"); }
  function saveRound() {
    stats.rounds[roundKey()] = {
      word: answer.word, guesses: guesses.slice(), over: over,
      hintStage: hintStage, day: daily ? dayKey() : "",
    };
    stats.tier = tierId; stats.daily = daily;
    save();
  }

  function replay(list) {
    for (let i = 0; i < list.length && i < TRIES; i++) {
      const g = list[i];
      const res = scoreGuess(g, answer.word);
      paintRow(i, g, res, false);
      bumpKeys(g, res);
      guesses.push(g);
    }
    row = guesses.length;
    paintKeys();
  }

  /* ---------- starting a round ---------- */
  function startRound(force) {
    const saved = stats.rounds[roundKey()];
    let restored = false;

    row = 0; guess = ""; over = false; hintStage = 0; guesses = [];
    for (const k in keyState) delete keyState[k];
    el.hint.textContent = ""; el.hint.classList.remove("meaning");
    el.feedback.textContent = "";
    el.hintBtn.textContent = "💡 Hint";
    el.hintBtn.disabled = false;

    if (daily) {
      answer = poolFor()[dailyIndex()];
      if (!force && saved && saved.word === answer.word && saved.day === dayKey()) restored = true;
    } else if (!force && saved && !saved.over && Array.isArray(saved.guesses) && saved.guesses.length) {
      const found = poolFor().filter(function (e) { return e.word === saved.word; })[0];
      if (found) { answer = found; restored = true; }
      else answer = pickPractice();
    } else {
      answer = pickPractice();
    }

    LEN = tier().len;
    buildGrid();
    buildKeyboard();

    if (restored && Array.isArray(saved.guesses)) {
      replay(saved.guesses.filter(function (g) { return typeof g === "string" && g.length === LEN; }));
      hintStage = Number(saved.hintStage) || 0;
      if (hintStage > 0) showHint();
      if (guesses.length && guesses[guesses.length - 1] === answer.word) { over = true; }
      else if (row >= TRIES) { over = true; }
      if (over) {
        showMeaning();
        endCoach(guesses[guesses.length - 1] === answer.word);
        flash(guesses[guesses.length - 1] === answer.word
          ? "You already solved this one! " + CHEERS[Math.min(row - 1, CHEERS.length - 1)]
          : "This one's finished — the word was " + answer.word.toUpperCase() + ".",
          guesses[guesses.length - 1] === answer.word ? "var(--green)" : "var(--pink)");
      } else {
        updateCoach();
        flash("Welcome back — your guesses are right where you left them. 👋", "var(--purple)");
      }
    } else {
      updateCoach();
    }

    if (daily && !over) {
      const done = stats.dailyDone[tierId + "|" + dayKey()];
      if (done && !restored) {
        // played today on another device/before a save wipe — don't let them replay it
        over = true;
        showMeaning();
        flash("You've already played today's Word of the Day. Come back tomorrow! 🗓️", "var(--purple)");
        endCoach(!!done.won);
      }
    }
    if (over) el.hintBtn.disabled = true;

    updateHud();
    updateModeNote();
    saveRound();
  }

  function updateModeNote() {
    if (!el.modeNote) return;
    el.modeNote.textContent = daily
      ? "🗓️ Word of the Day — one " + tier().name + " puzzle, the same for everyone, new every morning."
      : "♾️ Practice — as many " + tier().name + " words as you like.";
  }

  function setTier(id) {
    if (!BY_ID[id]) return;
    const same = id === tierId;
    tierId = id;
    LEN = tier().len;
    TIERS.forEach(function (t) {
      const b = $(t.btn);
      if (b) { b.classList.toggle("on", t.id === tierId); b.setAttribute("aria-pressed", String(t.id === tierId)); }
    });
    startRound(same && !daily ? false : false);
  }
  function setDaily(on) {
    daily = !!on;
    el.dailyBtn.classList.toggle("on", daily);
    el.practiceBtn.classList.toggle("on", !daily);
    el.dailyBtn.setAttribute("aria-pressed", String(daily));
    el.practiceBtn.setAttribute("aria-pressed", String(!daily));
    startRound(false);
  }

  /* ---------- hint (two stages, so it never gives the word away at once) ---------- */
  function showHint() {
    let txt = answer.emoji + "  " + answer.hint;
    if (hintStage >= 2) txt += " — it starts with “" + answer.word[0].toUpperCase() + "”";
    el.hint.textContent = txt;
    el.hint.classList.remove("meaning");
    el.hintBtn.textContent = hintStage >= 2 ? "💡 Hint" : "💡 More hint";
  }

  /* ---------- stats panel ---------- */
  function openStats() {
    const played = stats.played, wins = stats.wins;
    const pct = played ? Math.round((wins / played) * 100) : 0;
    const max = Math.max.apply(null, stats.dist.concat([1]));
    let bars = "";
    for (let i = 0; i < TRIES; i++) {
      const n = stats.dist[i];
      const w = Math.max(6, Math.round((n / max) * 100));
      bars += '<div class="bar-row"><span class="bar-n">' + (i + 1) + '</span>' +
        '<span class="bar" style="width:' + w + '%">' + n + "</span></div>";
    }
    el.statsBody.innerHTML =
      '<div class="stat-grid">' +
        '<div><b>' + played + "</b><span>played</span></div>" +
        '<div><b>' + pct + "%</b><span>win rate</span></div>" +
        '<div><b>' + stats.streak + "</b><span>streak</span></div>" +
        '<div><b>' + stats.best + "</b><span>best</span></div>" +
      "</div>" +
      "<h3>How many guesses it took</h3>" + bars +
      '<p class="stat-daily">🗓️ Word of the Day streak: <b>' + stats.dailyStreak +
        "</b> (best " + stats.dailyBest + ")</p>";
    el.statsPanel.classList.add("open");
    el.statsPanel.removeAttribute("hidden");
    el.statsClose.focus();
  }
  function closeStats() {
    el.statsPanel.classList.remove("open");
    el.statsPanel.setAttribute("hidden", "");
    el.statsBtn.focus();
  }

  /* ---------- physical keyboard ---------- */
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;      // don't eat Ctrl+R, ⌘L, …
    if (e.key === "Escape") {
      if (el.statsPanel.classList.contains("open")) { e.preventDefault(); closeStats(); }
      return;
    }
    if (el.statsPanel.classList.contains("open")) return;
    // a focused button already handles Enter/Space itself — don't double-fire
    const onButton = e.target && e.target.tagName === "BUTTON";
    if (e.key === "Enter") { if (onButton) return; e.preventDefault(); handleKey("enter"); return; }
    if (e.key === "Backspace") { e.preventDefault(); handleKey("back"); return; }
    if (e.key.length !== 1) return;
    const k = e.key.toLowerCase();
    if (k >= "a" && k <= "z") { e.preventDefault(); handleKey(k); }
  });

  /* ---------- buttons ---------- */
  el.hintBtn.addEventListener("click", function () {
    if (!answer || over) return;
    if (hintStage < 2) hintStage += 1;
    showHint();
    saveRound();
  });
  el.newBtn.addEventListener("click", function () {
    if (daily) { setDaily(false); return; }   // the daily is once a day — send them to practice
    startRound(true);
  });
  TIERS.forEach(function (t) {
    const b = $(t.btn);
    if (b) b.addEventListener("click", function () { b.blur(); setTier(t.id); });
  });
  el.practiceBtn.addEventListener("click", function () { el.practiceBtn.blur(); setDaily(false); });
  el.dailyBtn.addEventListener("click", function () { el.dailyBtn.blur(); setDaily(true); });
  el.statsBtn.addEventListener("click", function () { openStats(); });
  el.statsClose.addEventListener("click", function () { closeStats(); });
  el.statsPanel.addEventListener("click", function (e) { if (e.target === el.statsPanel) closeStats(); });

  /* ---------- go ---------- */
  tierId = BY_ID[stats.tier] ? stats.tier : "normal";
  daily = !!stats.daily;
  LEN = tier().len;
  TIERS.forEach(function (t) {
    const b = $(t.btn);
    if (b) { b.classList.toggle("on", t.id === tierId); b.setAttribute("aria-pressed", String(t.id === tierId)); }
  });
  el.dailyBtn.classList.toggle("on", daily);
  el.practiceBtn.classList.toggle("on", !daily);
  el.dailyBtn.setAttribute("aria-pressed", String(daily));
  el.practiceBtn.setAttribute("aria-pressed", String(!daily));
  startRound(false);
})();
