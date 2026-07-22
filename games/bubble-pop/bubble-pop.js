/* ===========================================================
   Number Bubble Pop — an educational counting / number-recognition
   game. A target number (or letter, in ABC mode) is shown; pop the
   bubble that matches it.

   Five levels (1–5, 1–9, 1–20, a count-the-dots mode and A–Z
   letters), a combo streak with rising pitch, popping sounds,
   splash particles, floating praise words, a gentle in-round
   difficulty ramp, a celebratory end screen with confetti and
   stars, and a per-level high score saved to localStorage.
   Great for ages 3–8.
   =========================================================== */

(function () {
  const playArea = document.getElementById("play-area");
  const scoreEl = document.getElementById("score");
  const timeEl = document.getElementById("time");
  const targetEl = document.getElementById("target");
  const targetLabelEl = document.getElementById("target-label");
  const comboEl = document.getElementById("combo");
  const bestEl = document.getElementById("best");
  const bestLineEl = document.getElementById("best-line");
  const starsLineEl = document.getElementById("stars-line");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const levelsEl = document.getElementById("levels");
  const startBtn = document.getElementById("start-btn");

  const COLORS = ["#ff5d8f", "#8a5cff", "#38b6ff", "#3ddc84", "#ffd166"];
  const GAME_SECONDS = 45;
  const SAVE_KEY = "bubblePopBest";
  const TOTAL_KEY = "bubblePopTotal";

  const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const LEVELS = {
    easy: { max: 5, label: "Easy" },
    normal: { max: 9, label: "Normal" },
    hard: { max: 20, label: "Hard" },
    count: { max: 5, label: "Dots", dots: true },
    abc: { label: "ABC", letters: true },
  };

  // little praise words that float up from a popped bubble
  const PRAISES = ["Yay!", "Great!", "Super!", "Wow!", "Nice!", "Amazing!"];

  let level = "normal";
  let score = 0;
  let combo = 0;
  let pops = 0;             // correct pops this round (for lifetime total)
  let timeLeft = GAME_SECONDS;
  let target = "1";
  let spawnTimer = null;    // a setTimeout id (spawn rate ramps up)
  let countdownTimer = null;
  let running = false;
  let paused = false;       // true while the tab is hidden mid-game

  /* ---- high score persistence (per level) ---- */
  function loadBests() {
    try {
      return JSON.parse(localStorage.getItem(SAVE_KEY)) || {};
    } catch (e) { return {}; }
  }
  function saveBests(b) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(b)); } catch (e) { /* private mode */ }
  }
  function bestFor(lv) { return loadBests()[lv] || 0; }

  /* ---- lifetime pop counter (all levels together) ---- */
  function loadTotal() {
    try { return parseInt(localStorage.getItem(TOTAL_KEY), 10) || 0; } catch (e) { return 0; }
  }
  function addToTotal(n) {
    try { localStorage.setItem(TOTAL_KEY, String(loadTotal() + n)); } catch (e) { /* private mode */ }
  }

  function showBestLine() {
    bestEl.textContent = String(bestFor(level));
    const b = bestFor(level);
    bestLineEl.textContent = b > 0 ? "🏆 Best on " + LEVELS[level].label + ": " + b : "";
  }

  function lettersMode() { return !!LEVELS[level].letters; }
  function dotsMode() { return !!LEVELS[level].dots; }
  function thingWord() { return lettersMode() ? "letter" : "number"; }

  // A random symbol for this level: "1"–"20" on number levels, "A"–"Z" on ABC.
  function randomSymbol() {
    if (lettersMode()) return ABC[Math.floor(Math.random() * ABC.length)];
    return String(1 + Math.floor(Math.random() * LEVELS[level].max));
  }

  /* ---- helper voice: says each new target out loud, so pre-readers
     (Ellie!) can play the letter and number games by ear ---- */
  const VOICE_KEY = "bubblePopVoice";
  const canSpeak = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  let voiceOn = true;
  try { voiceOn = localStorage.getItem(VOICE_KEY) !== "0"; } catch (e) {}
  const voiceBtn = document.getElementById("voice-btn");
  function refreshVoiceBtn() { voiceBtn.textContent = voiceOn ? "🔊" : "🔇"; }
  if (!canSpeak) voiceBtn.style.display = "none";
  voiceBtn.addEventListener("click", function () {
    voiceOn = !voiceOn;
    try { localStorage.setItem(VOICE_KEY, voiceOn ? "1" : "0"); } catch (e) {}
    if (!voiceOn && canSpeak) window.speechSynthesis.cancel();
    refreshVoiceBtn();
  });
  refreshVoiceBtn();

  function speakTarget() {
    if (!canSpeak || !voiceOn || !running) return;
    window.speechSynthesis.cancel();
    const phrase = dotsMode()
      ? "Pop the bubble with " + target + (target === "1" ? " dot" : " dots")
      : "Pop the " + thingWord() + " " + target;
    const u = new SpeechSynthesisUtterance(phrase);
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }

  function newTarget() {
    target = randomSymbol();
    targetEl.textContent = target;
    speakTarget();
  }

  function setCombo(n) {
    combo = n;
    comboEl.textContent = "🔥 " + combo;
    comboEl.classList.toggle("zero", combo === 0);
    if (combo > 0) {
      comboEl.classList.add("bump");
      setTimeout(function () { comboEl.classList.remove("bump"); }, 130);
    }
  }

  function refreshModeText() {
    if (dotsMode()) {
      targetLabelEl.textContent = "Pop the bubble with this many dots:";
      overlayTitle.textContent = "Count the dots! 🔵";
      overlayText.textContent =
        "A number appears at the top. Count the dots in each bubble and pop the one that matches!";
    } else {
      const thing = thingWord();
      targetLabelEl.textContent = "Pop the " + thing + ":";
      overlayTitle.textContent = lettersMode() ? "Find the letters! 🔤" : "Find the numbers! 🔢";
      overlayText.textContent =
        "A " + thing + " appears at the top. Pop the bubble that matches it before time runs out!";
    }
  }

  /* ---- difficulty picker ---- */
  levelsEl.addEventListener("click", function (e) {
    const btn = e.target.closest(".level-btn");
    if (!btn) return;
    level = btn.dataset.level;
    levelsEl.querySelectorAll(".level-btn").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b === btn));
    });
    refreshModeText();
    showBestLine();
  });

  /* ---- gentle in-round ramp: bubbles spawn a bit faster and rise a
     bit quicker as the score grows, so a hot streak feels exciting ---- */
  function spawnDelay() {
    return Math.max(420, 700 - score * 12);
  }
  function riseSeconds() {
    const speedUp = Math.min(1.5, score * 0.05);
    return 4.5 - speedUp + Math.random() * 2.5; // 4.5–7s at first, ~3–5.5s late
  }
  function scheduleSpawn() {
    clearTimeout(spawnTimer);
    spawnTimer = setTimeout(function () {
      spawnBubble();
      scheduleSpawn();
    }, spawnDelay());
  }

  function startGame() {
    score = 0;
    pops = 0;
    timeLeft = GAME_SECONDS;
    running = true;
    paused = false;
    scoreEl.textContent = "0";
    timeEl.textContent = String(GAME_SECONDS);
    timeEl.classList.remove("time-low");
    setCombo(0);
    showBestLine();
    overlay.classList.add("hidden");
    newTarget();

    clearBubbles();
    clearTimeout(spawnTimer);       // a fast double-tap on Start must not
    clearInterval(countdownTimer);  // leave a second pair of timers running
    spawnBubble();                  // something to pop right away
    scheduleSpawn();
    countdownTimer = setInterval(tick, 1000);
  }

  function tick() {
    timeLeft -= 1;
    timeEl.textContent = String(Math.max(timeLeft, 0));
    timeEl.classList.toggle("time-low", timeLeft <= 10 && timeLeft > 0);
    if (timeLeft <= 0) endGame();
  }

  function starsFor(sc) {
    if (sc >= 18) return 3;
    if (sc >= 10) return 2;
    if (sc >= 4) return 1;
    return 0;
  }

  function endGame() {
    running = false;
    clearTimeout(spawnTimer);
    clearInterval(countdownTimer);
    timeEl.classList.remove("time-low");
    if (canSpeak) window.speechSynthesis.cancel();
    if (pops > 0) addToTotal(pops);

    // record + celebrate
    const bests = loadBests();
    const prev = bests[level] || 0;
    const beat = score > prev;
    if (beat) { bests[level] = score; saveBests(bests); }

    const thing = dotsMode() ? "dot bubble" : thingWord();
    overlayTitle.textContent = beat && score > 0 ? "New best! 🏆"
      : dotsMode() ? "Great counting! 🎉"
      : lettersMode() ? "Great letter hunting! 🎉" : "Great counting! 🎉";
    overlayText.textContent =
      "You found " + score + " " + thing + (score === 1 ? "" : "s") +
      " on " + LEVELS[level].label + "!";
    const earned = starsFor(score);
    starsLineEl.textContent = earned > 0
      ? "⭐".repeat(earned) + "  ·  Lifetime pops: " + loadTotal()
      : (loadTotal() > 0 ? "Lifetime pops: " + loadTotal() : "");
    startBtn.textContent = "Play Again ▶";
    overlay.classList.remove("hidden");
    showBestLine();
    if (beat && score > 0) bestLineEl.classList.add("new");
    else bestLineEl.classList.remove("new");

    if (score > 0) {
      window.SFX && SFX.win();
      window.Confetti && Confetti.burst({ count: beat ? 120 : 80 });
    }
  }

  function splash(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const bit = document.createElement("span");
      bit.className = "splash";
      bit.style.left = x + "px";
      bit.style.top = y + "px";
      bit.style.background = color;
      const ang = (Math.PI * 2 * i) / 8 + Math.random() * 0.4;
      const dist = 30 + Math.random() * 30;
      bit.style.setProperty("--dx", Math.cos(ang) * dist + "px");
      bit.style.setProperty("--dy", Math.sin(ang) * dist + "px");
      playArea.appendChild(bit);
      setTimeout(function () { bit.remove(); }, 520);
    }
  }

  // a praise word that floats up from a popped bubble
  function floatPraise(x, y, text, big) {
    const p = document.createElement("span");
    p.className = "praise-float" + (big ? " big" : "");
    p.textContent = text;
    p.style.left = x + "px";
    p.style.top = y + "px";
    playArea.appendChild(p);
    setTimeout(function () { p.remove(); }, 850);
  }

  // is a live (not-yet-popped) bubble matching the target on screen?
  function targetOnScreen() {
    const live = playArea.querySelectorAll(".bubble:not(.pop)");
    for (let i = 0; i < live.length; i++) {
      if (live[i].dataset.symbol === target) return true;
    }
    return false;
  }

  function spawnBubble() {
    if (!running) return;
    // Bias spawns so the current target appears often — and if it isn't
    // on screen at all, make sure the next bubble IS the target so
    // nobody is ever stuck waiting with nothing right to pop.
    const symbol = (!targetOnScreen() || Math.random() < 0.45) ? target : randomSymbol();

    const bubble = document.createElement("button");
    bubble.className = "bubble";
    bubble.dataset.symbol = symbol;

    const dots = dotsMode();
    const size = dots
      ? 76 + Math.floor(Math.random() * 28)   // dots need a roomier bubble
      : 60 + Math.floor(Math.random() * 40);  // 60–100px (room for two digits)
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const maxLeft = playArea.clientWidth - size;
    const left = Math.max(0, Math.floor(Math.random() * maxLeft));
    const duration = riseSeconds();

    if (dots) {
      bubble.classList.add("dot-bubble");
      bubble.setAttribute("aria-label", "bubble with " + symbol + (symbol === "1" ? " dot" : " dots"));
      const n = parseInt(symbol, 10);
      const dotSize = Math.round(size * 0.17);
      for (let i = 0; i < n; i++) {
        const d = document.createElement("span");
        d.className = "dot";
        d.style.width = dotSize + "px";
        d.style.height = dotSize + "px";
        bubble.appendChild(d);
      }
    } else {
      bubble.textContent = symbol;
      bubble.setAttribute("aria-label", "bubble " + (lettersMode() ? "letter " : "number ") + symbol);
      bubble.style.fontSize = Math.round(size * (symbol.length > 1 ? 0.34 : 0.42)) + "px";
    }

    bubble.style.width = size + "px";
    bubble.style.height = size + "px";
    bubble.style.left = left + "px";
    bubble.style.setProperty("--c", color);
    bubble.style.animationDuration = duration + "s";

    bubble.addEventListener("click", function () {
      if (bubble.classList.contains("pop") || !running) return;

      if (symbol === target) {
        // combo bonus: +1 base, +1 extra for every 3 in a streak
        setCombo(combo + 1);
        const gained = 1 + Math.floor(combo / 3);
        score += gained;
        pops += 1;
        scoreEl.textContent = String(score);

        const r = bubble.getBoundingClientRect();
        const pr = playArea.getBoundingClientRect();
        const bx = r.left - pr.left + r.width / 2;
        const by = r.top - pr.top + r.height / 2;
        splash(bx, by, color);

        // every 5 in a row is a mini party
        if (combo > 0 && combo % 5 === 0) {
          floatPraise(bx, by - 20, "🔥 " + combo + " in a row!", true);
          window.SFX && SFX.coin();
          window.Confetti && Confetti.burst({ count: 35, x: r.left / window.innerWidth, y: r.top / window.innerHeight });
        } else {
          floatPraise(bx, by - 20, PRAISES[Math.floor(Math.random() * PRAISES.length)], false);
        }

        if (window.SFX) { combo > 1 ? SFX.streak(combo) : SFX.pop(); }

        bubble.classList.add("pop");
        setTimeout(function () { bubble.remove(); }, 250);
        newTarget();
      } else {
        // Gentle "not quite": reset the streak, wobble, soft blip — no penalty.
        if (combo > 0) { setCombo(0); window.SFX && SFX.nope(); }
        bubble.classList.add("wrong");
        setTimeout(function () { bubble.classList.remove("wrong"); }, 350);
      }
    });

    bubble.addEventListener("animationend", function (e) {
      if (e.animationName === "rise") bubble.remove();
    });

    playArea.appendChild(bubble);
  }

  function clearBubbles() {
    playArea.querySelectorAll(".bubble, .splash, .praise-float").forEach(function (b) { b.remove(); });
  }

  /* ---- pause when the tab is hidden, so the clock doesn't drain
     while somebody answers the door ---- */
  document.addEventListener("visibilitychange", function () {
    if (!running) return;
    if (document.hidden) {
      paused = true;
      clearTimeout(spawnTimer);
      clearInterval(countdownTimer);
      if (canSpeak) window.speechSynthesis.cancel();
    } else if (paused) {
      paused = false;
      scheduleSpawn();
      countdownTimer = setInterval(tick, 1000);
    }
  });

  startBtn.addEventListener("click", startGame);
  showBestLine();
})();
