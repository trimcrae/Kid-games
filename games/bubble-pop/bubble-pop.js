/* ===========================================================
   Number Bubble Pop — the arcade's counting & number game.

   Nine levels that climb a real maths ladder:

     🐣 little ones
       easy   1–5 number recognition
       normal 1–9 number recognition
       count  subitising — dice-pattern dots, "how many?"
       popn   COUNT OUT: pop exactly that many bubbles, counting
              out loud; sometimes with a head start so you have to
              COUNT ON ("you have 3 — pop 4 more: 4, 5, 6, 7")
       abc    A–Z letter recognition (with look-alike distractors)

     🚀 big kids
       hard   1–20, biased towards look-alike pairs (12/21, 6/9…)
       add    addition to 20
       sub    subtraction within 20
       skip   skip counting by 2s/3s/5s/10s, and doubles

   Every wrong tap is EXPLAINED (out loud and on screen) instead of
   just buzzing, the helper voice counts along as you pop, and a
   hint pulses the right bubble if a round gets sticky.

   Saved in localStorage: per-level best score, per-level stars,
   lifetime pops, voice on/off and the level you last played.
   =========================================================== */

(function () {
  "use strict";

  /* ---------------- elements ---------------- */
  const playArea = document.getElementById("play-area");
  const scoreEl = document.getElementById("score");
  const timeEl = document.getElementById("time");
  const timeStat = document.getElementById("time-stat");
  const targetEl = document.getElementById("target");
  const targetLabelEl = document.getElementById("target-label");
  const comboEl = document.getElementById("combo");
  const comboNEl = document.getElementById("combo-n");
  const bestEl = document.getElementById("best");
  const bestLineEl = document.getElementById("best-line");
  const starsLineEl = document.getElementById("stars-line");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const startBtn = document.getElementById("start-btn");
  const coachEl = document.getElementById("coach");
  const tallyEl = document.getElementById("tally");
  const voiceBtn = document.getElementById("voice-btn");

  /* ---------------- constants ---------------- */
  // pale fill + strong ring: dark text on a light bubble reads at any size
  const COLORS = [
    { c: "#ff5d8f", soft: "#ffd9e5" },
    { c: "#8a5cff", soft: "#e3dbff" },
    { c: "#1ba3ef", soft: "#d3edff" },
    { c: "#22c06e", soft: "#d3f7e5" },
    { c: "#f0a500", soft: "#ffeec4" },
    { c: "#ff7a3d", soft: "#ffe2d0" },
  ];
  const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  // uppercase letters kids genuinely mix up
  const LOOKALIKE = {
    B: "DPR", C: "GO", D: "BOP", E: "F", F: "ET", G: "CO", I: "LT", J: "IL",
    K: "XY", L: "IJ", M: "NW", N: "MH", O: "QCD", P: "RBF", Q: "OG", R: "PB",
    S: "Z", T: "IF", U: "VY", V: "UWY", W: "MVN", X: "KY", Y: "VXT", Z: "SN",
    A: "HR", H: "NA",
  };
  const PRAISES = ["Yay!", "Great!", "Super!", "Wow!", "Nice!", "Brilliant!", "Yes!"];

  const SAVE_KEY = "bubblePopBest";      // { level: bestScore }  (existing saves keep working)
  const TOTAL_KEY = "bubblePopTotal";    // lifetime pops         (existing)
  const VOICE_KEY = "bubblePopVoice";    // "1" / "0"             (existing)
  const STARS_KEY = "bubblePopStars";    // { level: bestStars }  (new)
  const LEVEL_KEY = "bubblePopLevel";    // last level played     (new)

  const MODES = {
    easy:   { label: "Easy",   kind: "match",   max: 5,  secs: 45, stars: [4, 10, 18], spawn: 800, rise: 5.6, bias: 0.5 },
    normal: { label: "Normal", kind: "match",   max: 9,  secs: 45, stars: [4, 10, 18], spawn: 760, rise: 5.2, bias: 0.45 },
    count:  { label: "Dots",   kind: "dots",    max: 6,  secs: 45, stars: [4, 9, 15],  spawn: 850, rise: 6.0, bias: 0.45 },
    popn:   { label: "Count Out", kind: "popn", max: 6,  secs: 60, stars: [8, 16, 26], spawn: 700, rise: 6.4 },
    abc:    { label: "ABC",    kind: "letters",          secs: 45, stars: [4, 10, 18], spawn: 780, rise: 5.4, bias: 0.42 },
    hard:   { label: "Hard",   kind: "match",   max: 20, secs: 45, stars: [4, 9, 15],  spawn: 780, rise: 5.6, bias: 0.34 },
    add:    { label: "Add",    kind: "add",     secs: 60, stars: [3, 7, 12], spawn: 900, rise: 7.0, bias: 0.34 },
    sub:    { label: "Take Away", kind: "sub",  secs: 60, stars: [3, 7, 12], spawn: 900, rise: 7.0, bias: 0.34 },
    skip:   { label: "Skip & Double", kind: "skip", secs: 60, stars: [3, 6, 10], spawn: 950, rise: 7.4, bias: 0.34 },
  };

  const SWAY = 7;          // px of gentle side-to-side drift (kept inside the board)
  const MAX_BUBBLES = 9;
  const reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* ---------------- state ---------------- */
  let level = "normal";
  let mode = MODES[level];
  let score = 0;
  let combo = 0;
  let pops = 0;                 // correct pops this round (for the lifetime total)
  let timeLeft = 45;
  let running = false;
  let paused = false;
  let spawnTimer = null;
  let countdownTimer = null;
  let coachTimer = null;
  let live = [];                // [{ el, value, left, size, top, at }]
  let round = null;
  let wrongThisRound = 0;
  let hinting = false;
  let roundStart = 0;
  let setsDone = 0;             // completed count-out sets (drives popn difficulty)

  /* ---------------- saving ---------------- */
  function readJSON(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { return {}; }
  }
  function writeJSON(key, obj) {
    try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) { /* private mode */ }
  }
  function bestFor(lv) { return readJSON(SAVE_KEY)[lv] || 0; }
  function starsSaved(lv) { return readJSON(STARS_KEY)[lv] || 0; }
  function loadTotal() {
    try { return parseInt(localStorage.getItem(TOTAL_KEY), 10) || 0; } catch (e) { return 0; }
  }
  function addToTotal(n) {
    try { localStorage.setItem(TOTAL_KEY, String(loadTotal() + n)); } catch (e) { /* ignore */ }
  }

  /* ---------------- helper voice ---------------- */
  const canSpeak = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  let voiceOn = true;
  try { voiceOn = localStorage.getItem(VOICE_KEY) !== "0"; } catch (e) { /* ignore */ }
  function refreshVoiceBtn() {
    voiceBtn.textContent = voiceOn ? "🔊" : "🔇";
    voiceBtn.setAttribute("aria-pressed", String(voiceOn));
  }
  if (!canSpeak) voiceBtn.style.display = "none";
  voiceBtn.addEventListener("click", function () {
    voiceOn = !voiceOn;
    try { localStorage.setItem(VOICE_KEY, voiceOn ? "1" : "0"); } catch (e) { /* ignore */ }
    hush();
    refreshVoiceBtn();
  });
  refreshVoiceBtn();

  function hush() {
    if (!canSpeak) return;
    try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
  }
  function say(text) {
    if (!canSpeak || !voiceOn || !text) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95;
      u.pitch = 1.05;
      window.speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  }

  /* ---------------- small helpers ---------------- */
  function randInt(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven",
    "eight", "nine", "ten", "eleven", "twelve"];
  function numWord(n) { return WORDS[n] || String(n); }

  function coach(text, cls, hold) {
    clearTimeout(coachTimer);
    coachEl.textContent = text || "";
    coachEl.className = "coach" + (cls ? " " + cls : "");
    if (text) {
      coachTimer = setTimeout(function () {
        coachEl.textContent = "";
        coachEl.className = "coach";
      }, hold || 2800);
    }
  }

  function setCombo(n) {
    combo = n;
    comboNEl.textContent = String(combo);
    comboEl.classList.toggle("zero", combo === 0);
    if (combo > 0) {
      comboEl.classList.add("bump");
      setTimeout(function () { comboEl.classList.remove("bump"); }, 140);
    }
  }

  /* =========================================================
     Rounds — each level builds a little problem with a prompt,
     an answer, a spoken version and an explanation for a miss.
     ========================================================= */
  function makeRound() {
    const k = mode.kind;

    if (k === "letters") {
      const a = pick(ABC.split(""));
      return {
        kind: k, answer: a, prompt: a,
        label: "Pop the letter:",
        speech: "Pop the letter " + a,
        wrong: function (v) {
          return { t: "That’s " + v + ". We’re looking for " + a + "!",
                   s: "That is " + v + ". We want " + a };
        },
      };
    }

    if (k === "dots") {
      const n = randInt(1, mode.max);
      return {
        kind: k, answer: String(n), prompt: String(n),
        label: "Pop the bubble with this many dots:",
        speech: "Pop the bubble with " + numWord(n) + (n === 1 ? " dot" : " dots"),
        wrong: function (v) {
          const m = parseInt(v, 10);
          return { t: "That one has " + m + (m === 1 ? " dot" : " dots") + " — we need " + n + ".",
                   s: "That one has " + numWord(m) + (m === 1 ? " dot" : " dots") + ". We need " + numWord(n) };
        },
      };
    }

    if (k === "popn") {
      // grows as they succeed: small sets first, bigger sets later
      const cap = Math.min(mode.max, 3 + Math.floor(setsDone / 2));
      const need = randInt(2, Math.max(3, cap));
      // "count on": sometimes start with some already in the basket
      const have = (need >= 4 && Math.random() < 0.5) ? randInt(1, need - 2) : 0;
      const more = need - have;
      return {
        kind: k, answer: null, need: need, have: have, popped: 0,
        prompt: String(more),
        label: have > 0 ? "You have " + have + " already. Pop this many more:" : "Pop this many bubbles:",
        speech: have > 0
          ? "You already have " + numWord(have) + ". Pop " + numWord(more) + " more. Count on from " + numWord(have)
          : "Pop " + numWord(more) + (more === 1 ? " bubble" : " bubbles"),
        wrong: function () { return { t: "", s: "" }; },
      };
    }

    if (k === "add") {
      const a = randInt(1, 10), b = randInt(1, 10);
      const ans = a + b;
      return {
        kind: k, a: a, b: b, answer: String(ans), prompt: a + " + " + b,
        label: "Pop the answer to:",
        speech: "What is " + numWord(a) + " plus " + numWord(b) + "?",
        wrong: function (v) {
          return { t: a + " + " + b + " = " + ans + ", not " + v + ".",
                   s: numWord(a) + " plus " + numWord(b) + " makes " + ans + ", not " + v };
        },
      };
    }

    if (k === "sub") {
      const a = randInt(4, 20), b = randInt(1, Math.min(9, a - 1));
      const ans = a - b;
      return {
        kind: k, a: a, b: b, answer: String(ans), prompt: a + " − " + b,
        label: "Pop the answer to:",
        speech: "What is " + a + " take away " + numWord(b) + "?",
        wrong: function (v) {
          return { t: a + " − " + b + " = " + ans + ", not " + v + ".",
                   s: a + " take away " + numWord(b) + " leaves " + ans + ", not " + v };
        },
      };
    }

    if (k === "skip") {
      if (Math.random() < 0.4) {
        const a = randInt(2, 12);
        const ans = a * 2;
        return {
          kind: k, a: a, answer: String(ans), prompt: "double " + a,
          label: "Pop the answer to:",
          speech: "What is double " + numWord(a) + "?",
          wrong: function (v) {
            return { t: "Double " + a + " means " + a + " + " + a + " = " + ans + ", not " + v + ".",
                     s: "Double " + numWord(a) + " is " + a + " plus " + a + ", which makes " + ans };
          },
        };
      }
      const step = pick([2, 3, 5, 10]);
      const start = step * randInt(1, 8);
      const seq = [start, start + step, start + 2 * step];
      const ans = start + 3 * step;
      return {
        kind: k, step: step, seq: seq, answer: String(ans),
        prompt: seq.join(", ") + ", ?",
        label: "Counting by " + step + "s — what comes next?",
        speech: "Counting by " + numWord(step) + "s. " + seq.join(", ") + ". What comes next?",
        wrong: function (v) {
          if (seq.indexOf(parseInt(v, 10)) >= 0) {
            return { t: v + " is already in our count — the NEXT one is " + ans + ".",
                     s: "We already said " + v + ". The next one is " + ans };
          }
          return { t: "Count by " + step + "s: " + seq.join(", ") + ", " + ans + ". Not " + v + ".",
                   s: "Counting by " + numWord(step) + "s, after " + seq[2] + " comes " + ans };
        },
      };
    }

    // plain number match
    const n = randInt(1, mode.max);
    return {
      kind: "match", answer: String(n), prompt: String(n),
      label: "Pop the number:",
      speech: "Pop the number " + n,
      wrong: function (v) {
        return { t: "That’s " + v + ". We want " + round.answer + "!",
                 s: "That is " + v + ". We want " + n };
      },
    };
  }

  /* A believable wrong bubble: close enough to make you think. */
  function distractor() {
    const k = mode.kind;
    const ans = round.answer;

    if (k === "letters") {
      const near = LOOKALIKE[ans];
      if (near && Math.random() < 0.55) return pick(near.split(""));
      let c = ans;
      while (c === ans) c = pick(ABC.split(""));
      return c;
    }

    if (k === "dots") {
      let n = parseInt(ans, 10);
      const opts = [n - 1, n + 1, n - 2, n + 2].filter(function (x) { return x >= 1 && x <= mode.max; });
      return String(opts.length ? pick(opts) : (n === 1 ? 2 : 1));
    }

    if (k === "match") {
      const n = parseInt(ans, 10);
      const max = mode.max;
      const opts = [];
      if (max >= 10) {
        // look-alike pairs: 12/21, 13/31, 6/9, and the neighbours
        const rev = parseInt(String(n).split("").reverse().join(""), 10);
        if (rev !== n && rev >= 1 && rev <= max) opts.push(rev);
        if (n === 6) opts.push(9);
        if (n === 9) opts.push(6);
      }
      [n - 1, n + 1].forEach(function (x) { if (x >= 1 && x <= max) opts.push(x); });
      if (opts.length && Math.random() < 0.6) return String(pick(opts));
      let c = n;
      while (c === n) c = randInt(1, max);
      return String(c);
    }

    // arithmetic levels: near misses you learn something from —
    // including the classic slip of adding when you meant to take away.
    const n = parseInt(ans, 10);
    const opts = [n + 1, n - 1, n + 2, n - 2, n + 10, n - 10];
    if (round.a != null && round.b != null) opts.push(round.a + round.b, Math.abs(round.a - round.b));
    if (round.step) opts.push(n + round.step, n - round.step, n + 2 * round.step);
    const good = opts.filter(function (x) { return x >= 0 && x <= 200 && x !== n; });
    return String(good.length ? pick(good) : n + (round.step || 1));
  }

  /* ---------------- tally strip (count-out mode) ---------------- */
  function renderTally() {
    if (!round || round.kind !== "popn") { tallyEl.hidden = true; tallyEl.textContent = ""; return; }
    tallyEl.hidden = false;
    tallyEl.textContent = "";
    for (let i = 0; i < round.need; i++) {
      const s = document.createElement("span");
      s.className = "slot";
      if (i < round.have) { s.classList.add("head"); s.textContent = String(i + 1); }
      else if (i < round.have + round.popped) { s.classList.add("filled"); s.textContent = String(i + 1); }
      tallyEl.appendChild(s);
    }
  }

  /* ---------------- start a fresh round ---------------- */
  function newRound(prefix) {
    round = makeRound();
    wrongThisRound = 0;
    hinting = false;
    roundStart = Date.now();
    live.forEach(function (r) { r.el.classList.remove("hint"); });
    targetLabelEl.textContent = round.label;
    targetEl.textContent = round.prompt;
    renderTally();
    if (running) say((prefix ? prefix + " " : "") + round.speech);
  }

  /* ---------------- bubbles ---------------- */
  function answerOnScreen() {
    for (let i = 0; i < live.length; i++) {
      if (live[i].value === round.answer && !live[i].el.classList.contains("pop")) return true;
    }
    return false;
  }

  function overlaps(left, size, top) {
    const now = Date.now();
    for (let i = 0; i < live.length; i++) {
      const r = live[i];
      const xClash = left < r.left + r.size + 14 && r.left < left + size + 14;
      if (!xClash) continue;
      if (reduceMotion) {
        if (top != null && r.top != null &&
            top < r.top + r.size + 8 && r.top < top + size + 8) return true;
      } else if (now - r.at < 1500) {
        return true;  // it is still low on the board — we'd stack right on it
      }
    }
    return false;
  }

  function spawnBubble() {
    if (!running || live.length >= MAX_BUBBLES) return;

    const dots = mode.kind === "dots";
    const blank = mode.kind === "popn";
    // always keep a real CHOICE on the board: at least one right bubble and,
    // once there's company, at least one wrong one to think about.
    const onlyAnswers = live.length >= 2 && !live.some(function (r) { return r.value && r.value !== round.answer; });
    const value = blank ? null
      : (onlyAnswers ? distractor()
        : ((!answerOnScreen() || Math.random() < (mode.bias || 0.42)) ? round.answer : distractor()));

    const size = dots ? randInt(88, 112) : randInt(66, 104);
    const areaW = playArea.clientWidth;
    const areaH = playArea.clientHeight;
    const maxLeft = Math.max(0, areaW - size - SWAY * 2);

    let left = SWAY, top = null;
    for (let tries = 0; tries < 16; tries++) {
      left = SWAY + Math.floor(Math.random() * (maxLeft + 1));
      top = reduceMotion ? Math.floor(Math.random() * Math.max(1, areaH - size)) : null;
      if (!overlaps(left, size, top)) break;
    }

    const col = pick(COLORS);
    const isGold = !blank && value === round.answer && Math.random() < 0.11;

    const bubble = document.createElement("button");
    bubble.type = "button";
    bubble.className = "bubble" + (isGold ? " gold" : "");
    if (hinting && value === round.answer) bubble.classList.add("hint");

    const ball = document.createElement("span");
    ball.className = "ball" + (dots ? " dots" : "");
    ball.setAttribute("aria-hidden", "true");

    if (dots) {
      const n = parseInt(value, 10);
      dicePips(n).forEach(function (pos) {
        const p = document.createElement("span");
        p.className = "pip";
        p.style.gridColumn = String(pos[0]);
        p.style.gridRow = String(pos[1]);
        ball.appendChild(p);
      });
      bubble.setAttribute("aria-label", "bubble with " + n + (n === 1 ? " dot" : " dots"));
    } else if (blank) {
      bubble.setAttribute("aria-label", "a bubble to pop");
    } else {
      ball.textContent = value;
      bubble.setAttribute("aria-label",
        (mode.kind === "letters" ? "bubble letter " : "bubble ") + value);
      const fit = value.length >= 3 ? 0.28 : (value.length === 2 ? 0.36 : 0.46);
      ball.style.fontSize = Math.round(size * fit) + "px";
    }

    bubble.appendChild(ball);
    bubble.style.width = size + "px";
    bubble.style.height = size + "px";
    bubble.style.left = left + "px";
    bubble.style.setProperty("--c", col.c);
    bubble.style.setProperty("--soft", col.soft);
    bubble.style.setProperty("--sway", SWAY + "px");

    const dur = riseSeconds();
    if (reduceMotion) {
      // calm mode: bubbles simply fade in place instead of flying up
      bubble.style.setProperty("--start-bottom", (areaH - size - top) + "px");
      bubble.style.setProperty("--rise", "0px");
    } else {
      bubble.style.setProperty("--start-bottom", -(size + 6) + "px");
      bubble.style.setProperty("--rise", (areaH + size + 30) + "px");
    }
    const swayDur = 2.6 + Math.random() * 1.8;
    bubble.style.animationDuration = dur + "s, " + swayDur + "s";
    bubble.style.animationDelay = "0s, " + (-Math.random() * swayDur).toFixed(2) + "s";

    const rec = { el: bubble, value: value, left: left, size: size, top: top, at: Date.now(), color: col.c };
    bubble.addEventListener("click", function () { tap(rec); });
    bubble.addEventListener("animationend", function (e) {
      if (e.animationName === "rise") drop(rec);
    });

    live.push(rec);
    playArea.appendChild(bubble);
  }

  // dice patterns for 1–6 as [column, row] pairs on a 3×3 grid
  function dicePips(n) {
    switch (n) {
      case 1: return [[2, 2]];
      case 2: return [[1, 1], [3, 3]];
      case 3: return [[1, 1], [2, 2], [3, 3]];
      case 4: return [[1, 1], [3, 1], [1, 3], [3, 3]];
      case 5: return [[1, 1], [3, 1], [2, 2], [1, 3], [3, 3]];
      default: return [[1, 1], [1, 2], [1, 3], [3, 1], [3, 2], [3, 3]];
    }
  }

  function drop(rec) {
    const i = live.indexOf(rec);
    if (i >= 0) live.splice(i, 1);
    if (rec.el.parentNode) rec.el.remove();
  }

  function clearBubbles() {
    live.slice().forEach(drop);
    playArea.querySelectorAll(".bubble, .splash, .praise-float").forEach(function (b) { b.remove(); });
  }

  /* ---------------- effects ---------------- */
  function splash(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const bit = document.createElement("span");
      bit.className = "splash";
      bit.style.left = x + "px";
      bit.style.top = y + "px";
      bit.style.background = color;
      const ang = (Math.PI * 2 * i) / 8 + Math.random() * 0.4;
      const dist = 28 + Math.random() * 30;
      bit.style.setProperty("--dx", Math.cos(ang) * dist + "px");
      bit.style.setProperty("--dy", Math.sin(ang) * dist + "px");
      playArea.appendChild(bit);
      setTimeout(function () { bit.remove(); }, 520);
    }
  }

  function floatPraise(x, y, text, big) {
    const p = document.createElement("span");
    p.className = "praise-float" + (big ? " big" : "");
    p.textContent = text;
    p.style.left = x + "px";
    p.style.top = y + "px";
    playArea.appendChild(p);
    setTimeout(function () { p.remove(); }, 900);
  }

  function centreOf(rec) {
    const r = rec.el.getBoundingClientRect();
    const pr = playArea.getBoundingClientRect();
    return { x: r.left - pr.left + r.width / 2, y: r.top - pr.top + r.height / 2, r: r };
  }

  /* ---------------- tapping ---------------- */
  function tap(rec) {
    if (!running || !round) return;
    if (rec.el.classList.contains("pop")) return;   // never count one bubble twice
    if (round.kind === "popn" && round.done) return; // set already finished — wait for the next one
    if (round.kind === "popn" || rec.value === round.answer) correct(rec);
    else wrongTap(rec);
  }

  function correct(rec) {
    const pos = centreOf(rec);
    const gold = rec.el.classList.contains("gold");

    rec.el.classList.add("pop");
    rec.el.setAttribute("aria-hidden", "true");
    setTimeout(function () { drop(rec); }, 300);
    splash(pos.x, pos.y, rec.color);
    pops += 1;

    if (round.kind === "popn") {
      round.popped += 1;
      const running_total = round.have + round.popped;
      renderTally();
      score += 1;
      scoreEl.textContent = String(score);
      floatPraise(pos.x, pos.y - 18, String(running_total), running_total === round.need);
      window.SFX && SFX.streak(running_total);

      if (running_total >= round.need) {
        round.done = true;
        setsDone += 1;
        setCombo(combo + 1);
        const bonus = 2 + Math.min(4, Math.floor(combo / 3));
        score += bonus;
        scoreEl.textContent = String(score);
        coach("🎉 " + round.need + " bubbles! You counted to " + round.need + ".", "yay");
        window.SFX && SFX.coin();
        if (combo % 5 === 0) {
          window.Confetti && Confetti.burst({ count: 40, x: pos.r.left / window.innerWidth, y: pos.r.top / window.innerHeight });
        }
        setTimeout(function () {
          if (running) newRound("That makes " + numWord(round.need) + "!");
        }, 420);
      } else {
        say(numWord(running_total));
      }
      return;
    }

    // every other level: one right bubble finishes the round
    setCombo(combo + 1);
    let gained = 1 + Math.min(4, Math.floor(combo / 3));   // capped: a long streak shouldn't run away
    if (mode.kind === "add" || mode.kind === "sub" || mode.kind === "skip") gained += 1;
    if (gold) gained *= 2;
    score += gained;
    scoreEl.textContent = String(score);

    if (gold) {
      floatPraise(pos.x, pos.y - 18, "⭐ Double!", true);
      window.SFX && SFX.coin();
    } else if (combo > 0 && combo % 5 === 0) {
      floatPraise(pos.x, pos.y - 18, "🔥 " + combo + " in a row!", true);
      window.SFX && SFX.coin();
      window.Confetti && Confetti.burst({ count: 35, x: pos.r.left / window.innerWidth, y: pos.r.top / window.innerHeight });
    } else {
      floatPraise(pos.x, pos.y - 18, pick(PRAISES), false);
      window.SFX && (combo > 1 ? SFX.streak(combo) : SFX.pop());
    }

    // say WHY it was right, so the maths sticks
    if (mode.kind === "add") coach(round.a + " + " + round.b + " = " + round.answer + " ✓", "yay", 1800);
    else if (mode.kind === "sub") coach(round.a + " − " + round.b + " = " + round.answer + " ✓", "yay", 1800);
    else if (mode.kind === "skip") coach(round.prompt.replace(/\?$/, round.answer) + " ✓", "yay", 1800);
    else if (mode.kind === "dots") coach("That’s " + round.answer + " dots ✓", "yay", 1500);
    else coach("");

    newRound(pick(["Yes!", "Well done!", "That’s right!"]));
  }

  function wrongTap(rec) {
    wrongThisRound += 1;
    if (combo > 0) setCombo(0);
    window.SFX && SFX.nope();
    rec.el.classList.add("wrong");
    setTimeout(function () { rec.el.classList.remove("wrong"); }, 430);

    const why = round.wrong(rec.value);
    coach(why.t, "oops", 3200);
    say(why.s);

    if (wrongThisRound >= 2) applyHint();
  }

  function applyHint() {
    if (!round || round.kind === "popn") return;
    hinting = true;
    live.forEach(function (r) {
      if (r.value === round.answer && !r.el.classList.contains("pop")) r.el.classList.add("hint");
    });
    if (!answerOnScreen()) spawnBubble();
  }

  /* ---------------- pacing ---------------- */
  function spawnDelay() { return Math.max(430, mode.spawn - score * 10); }
  function riseSeconds() {
    const speedUp = Math.min(1.6, score * 0.045);
    // a narrow spread keeps bubbles in their lane instead of catching each other up
    return Math.max(3.2, mode.rise - speedUp) + Math.random() * 1.2;
  }
  function scheduleSpawn() {
    clearTimeout(spawnTimer);
    spawnTimer = setTimeout(function () {
      spawnBubble();
      scheduleSpawn();
    }, spawnDelay());
  }

  /* ---------------- game flow ---------------- */
  function startGame() {
    mode = MODES[level] || MODES.normal;
    score = 0;
    pops = 0;
    setsDone = 0;
    timeLeft = mode.secs;
    running = true;
    paused = false;
    scoreEl.textContent = "0";
    timeEl.textContent = String(timeLeft);
    timeStat.classList.remove("time-low");
    setCombo(0);
    coach("");
    showBestLine();
    overlay.classList.add("hidden");

    clearBubbles();
    clearTimeout(spawnTimer);        // a fast double-tap on Start must not
    clearInterval(countdownTimer);   // leave a second pair of timers running
    newRound();
    spawnBubble();                   // something to pop straight away
    if (round.kind === "popn") spawnBubble();
    scheduleSpawn();
    countdownTimer = setInterval(tick, 1000);
  }

  function tick() {
    timeLeft -= 1;
    timeEl.textContent = String(Math.max(timeLeft, 0));
    timeStat.classList.toggle("time-low", timeLeft <= 10 && timeLeft > 0);
    // stuck on this one? nudge the right bubble
    if (running && !hinting && Date.now() - roundStart > 11000) applyHint();
    if (timeLeft <= 0) endGame();
  }

  function starsFor(sc) {
    const t = mode.stars;
    if (sc >= t[2]) return 3;
    if (sc >= t[1]) return 2;
    if (sc >= t[0]) return 1;
    return 0;
  }

  function endGame() {
    running = false;
    clearTimeout(spawnTimer);
    clearInterval(countdownTimer);
    timeStat.classList.remove("time-low");
    hush();
    coach("");
    tallyEl.hidden = true;
    tallyEl.textContent = "";
    clearBubbles();
    if (pops > 0) addToTotal(pops);

    const bests = readJSON(SAVE_KEY);
    const prev = bests[level] || 0;
    const beat = score > prev;
    if (beat) { bests[level] = score; writeJSON(SAVE_KEY, bests); }

    const earned = starsFor(score);
    const allStars = readJSON(STARS_KEY);
    if (earned > (allStars[level] || 0)) { allStars[level] = earned; writeJSON(STARS_KEY, allStars); }

    overlayTitle.textContent = beat && score > 0 ? "New best! 🏆" : "Great work! 🎉";
    overlayText.textContent = "You scored " + score + " on " + mode.label +
      " — " + pops + " bubble" + (pops === 1 ? "" : "s") + " popped.";
    starsLineEl.textContent = (earned > 0 ? "⭐".repeat(earned) + "  ·  " : "") +
      "Lifetime pops: " + loadTotal();
    startBtn.textContent = "Play Again ▶";
    overlay.classList.remove("hidden");
    showBestLine();
    bestLineEl.classList.toggle("new", beat && score > 0);

    if (score > 0) {
      window.SFX && SFX.win();
      window.Confetti && Confetti.burst({ count: beat ? 120 : 80 });
    }
  }

  /* ---------------- level picker ---------------- */
  function modeBlurb(lv) {
    switch (MODES[lv].kind) {
      case "dots": return { title: "Count the dots! 🔵", text: "Bubbles hold dice dots. Pop the bubble that has the number of dots shown at the top." };
      case "popn": return { title: "Count them out! 🖐️", text: "Pop exactly that many bubbles, counting out loud as you go. Sometimes you already have a few — keep counting on!" };
      case "letters": return { title: "Find the letters! 🔤", text: "A letter appears at the top. Pop the bubble that matches it — watch out for look-alikes!" };
      case "add": return { title: "Adding bubbles ➕", text: "A sum appears at the top. Pop the bubble with the answer." };
      case "sub": return { title: "Taking away ➖", text: "A take-away appears at the top. Pop the bubble with the answer." };
      case "skip": return { title: "Skip & double 🚀", text: "Count by 2s, 3s, 5s and 10s — or double a number — then pop the answer." };
      default: return { title: "Find the numbers! 🔢", text: "A number appears at the top. Pop the bubble that matches it before time runs out!" };
    }
  }

  function refreshModeText() {
    const b = modeBlurb(level);
    overlayTitle.textContent = b.title;
    overlayText.textContent = b.text;
    if (!running) {
      targetLabelEl.textContent = MODES[level].kind === "popn"
        ? "Pop this many bubbles:"
        : (MODES[level].kind === "letters" ? "Pop the letter:" : "Pop the number:");
      targetEl.textContent = "?";
      timeEl.textContent = String(MODES[level].secs);
    }
  }

  function showBestLine() {
    const b = bestFor(level);
    bestEl.textContent = String(b);
    bestLineEl.textContent = b > 0 ? "🏆 Best on " + MODES[level].label + ": " + b : "Play a round to set a best score!";
    document.querySelectorAll(".level-btn").forEach(function (btn) {
      const s = starsSaved(btn.dataset.level);
      const slot = btn.querySelector(".chip-stars");
      if (slot) slot.textContent = s > 0 ? "⭐".repeat(s) : "";
      const m = MODES[btn.dataset.level];
      btn.setAttribute("aria-label", m.label + (s > 0 ? ", " + s + " star" + (s === 1 ? "" : "s") + " earned" : ""));
    });
  }

  function chooseLevel(lv) {
    if (!MODES[lv]) return;
    level = lv;
    mode = MODES[lv];
    try { localStorage.setItem(LEVEL_KEY, lv); } catch (e) { /* ignore */ }
    document.querySelectorAll(".level-btn").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.level === lv));
    });
    refreshModeText();
    showBestLine();
  }

  overlay.addEventListener("click", function (e) {
    const btn = e.target.closest(".level-btn");
    if (btn) chooseLevel(btn.dataset.level);
  });

  /* ---------------- keyboard play ---------------- */
  let buf = "";
  let bufTimer = null;

  function liveByValue(v) {
    for (let i = 0; i < live.length; i++) {
      if (live[i].value === v && !live[i].el.classList.contains("pop")) return live[i];
    }
    return null;
  }
  function highestLive() {
    let best = null, bestTop = Infinity;
    live.forEach(function (r) {
      if (r.el.classList.contains("pop")) return;
      const t = r.el.getBoundingClientRect().top;
      if (t < bestTop) { bestTop = t; best = r; }
    });
    return best;
  }

  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (!running) return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    if (round && round.kind === "popn") {
      if ((e.key === " " || e.key === "Enter") && !(document.activeElement && document.activeElement.classList.contains("bubble"))) {
        const r = highestLive();
        if (r) { e.preventDefault(); tap(r); }
      }
      return;
    }
    if (document.activeElement && document.activeElement.classList.contains("bubble")) return;

    if (round && round.kind === "letters" && /^[a-zA-Z]$/.test(e.key)) buf = e.key.toUpperCase();
    else if (round && round.kind !== "letters" && /^[0-9]$/.test(e.key)) buf += e.key;
    else return;

    clearTimeout(bufTimer);
    bufTimer = setTimeout(function () { buf = ""; }, 1100);

    let rec = liveByValue(buf);
    if (!rec) {
      const isPrefix = live.some(function (r) { return r.value && r.value.indexOf(buf) === 0; });
      if (!isPrefix && buf.length > 1) {
        buf = buf.slice(-1);
        rec = liveByValue(buf);
      }
    }
    if (rec) { buf = ""; tap(rec); }
  });

  /* ---------------- pause when the tab is hidden ---------------- */
  document.addEventListener("visibilitychange", function () {
    if (!running) return;
    if (document.hidden) {
      paused = true;
      clearTimeout(spawnTimer);
      clearInterval(countdownTimer);
      hush();
    } else if (paused) {
      paused = false;
      scheduleSpawn();
      countdownTimer = setInterval(tick, 1000);
    }
  });

  /* ---------------- boot ---------------- */
  startBtn.addEventListener("click", startGame);

  let saved = null;
  try { saved = localStorage.getItem(LEVEL_KEY); } catch (e) { /* ignore */ }
  chooseLevel(MODES[saved] ? saved : "normal");
  starsLineEl.textContent = loadTotal() > 0 ? "Lifetime pops: " + loadTotal() : "";
})();
