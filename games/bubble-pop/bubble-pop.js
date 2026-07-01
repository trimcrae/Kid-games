/* ===========================================================
   Number Bubble Pop — an educational counting / number-recognition
   game. A target number (or letter, in ABC mode) is shown; pop the
   bubble that matches it.

   Four levels (1–5, 1–9, 1–20 and A–Z letters), a combo streak
   with rising pitch, popping sounds, splash particles, a
   celebratory end screen with confetti, and a per-level high
   score saved to localStorage. Great for ages 3–8.
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
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const levelsEl = document.getElementById("levels");
  const startBtn = document.getElementById("start-btn");

  const COLORS = ["#ff5d8f", "#8a5cff", "#38b6ff", "#3ddc84", "#ffd166"];
  const GAME_SECONDS = 45;
  const SAVE_KEY = "bubblePopBest";

  const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const LEVELS = {
    easy: { max: 5, label: "Easy" },
    normal: { max: 9, label: "Normal" },
    hard: { max: 20, label: "Hard" },
    abc: { label: "ABC", letters: true },
  };

  let level = "normal";
  let score = 0;
  let combo = 0;
  let timeLeft = GAME_SECONDS;
  let target = "1";
  let spawnTimer = null;
  let countdownTimer = null;
  let running = false;

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

  function showBestLine() {
    bestEl.textContent = String(bestFor(level));
    const b = bestFor(level);
    bestLineEl.textContent = b > 0 ? "🏆 Best on " + LEVELS[level].label + ": " + b : "";
  }

  function lettersMode() { return !!LEVELS[level].letters; }

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
    const u = new SpeechSynthesisUtterance(
      (lettersMode() ? "Pop the letter " : "Pop the number ") + target
    );
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
    const thing = lettersMode() ? "letter" : "number";
    targetLabelEl.textContent = "Pop the " + thing + ":";
    overlayTitle.textContent = lettersMode() ? "Find the letters! 🔤" : "Find the numbers! 🔢";
    overlayText.textContent =
      "A " + thing + " appears at the top. Pop the bubble that matches it before time runs out!";
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

  function startGame() {
    score = 0;
    timeLeft = GAME_SECONDS;
    running = true;
    scoreEl.textContent = "0";
    timeEl.textContent = String(GAME_SECONDS);
    setCombo(0);
    showBestLine();
    overlay.classList.add("hidden");
    newTarget();

    clearBubbles();
    clearInterval(spawnTimer);      // a fast double-tap on Start must not
    clearInterval(countdownTimer);  // leave a second pair of timers running
    spawnTimer = setInterval(spawnBubble, 600);
    countdownTimer = setInterval(tick, 1000);
  }

  function tick() {
    timeLeft -= 1;
    timeEl.textContent = String(Math.max(timeLeft, 0));
    if (timeLeft <= 0) endGame();
  }

  function endGame() {
    running = false;
    clearInterval(spawnTimer);
    clearInterval(countdownTimer);
    if (canSpeak) window.speechSynthesis.cancel();

    // record + celebrate
    const bests = loadBests();
    const prev = bests[level] || 0;
    const beat = score > prev;
    if (beat) { bests[level] = score; saveBests(bests); }

    overlayTitle.textContent = beat && score > 0 ? "New best! 🏆"
      : lettersMode() ? "Great letter hunting! 🎉" : "Great counting! 🎉";
    overlayText.textContent =
      "You found " + score + " " + (lettersMode() ? "letter" : "number") + (score === 1 ? "" : "s") +
      " on " + LEVELS[level].label + "!";
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

  function spawnBubble() {
    if (!running) return;
    // Bias spawns so the current target appears often.
    const symbol = Math.random() < 0.45 ? target : randomSymbol();

    const bubble = document.createElement("button");
    bubble.className = "bubble";
    bubble.textContent = symbol;
    bubble.setAttribute("aria-label", "bubble " + (lettersMode() ? "letter " : "number ") + symbol);

    const size = 60 + Math.floor(Math.random() * 40); // 60–100px (room for two digits)
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const maxLeft = playArea.clientWidth - size;
    const left = Math.max(0, Math.floor(Math.random() * maxLeft));
    const duration = 4.5 + Math.random() * 2.5; // 4.5–7s to rise

    bubble.style.width = size + "px";
    bubble.style.height = size + "px";
    bubble.style.left = left + "px";
    bubble.style.fontSize = Math.round(size * (symbol.length > 1 ? 0.34 : 0.42)) + "px";
    bubble.style.setProperty("--c", color);
    bubble.style.animationDuration = duration + "s";

    bubble.addEventListener("click", function () {
      if (bubble.classList.contains("pop") || !running) return;

      if (symbol === target) {
        // combo bonus: +1 base, +1 extra for every 3 in a streak
        setCombo(combo + 1);
        const gained = 1 + Math.floor(combo / 3);
        score += gained;
        scoreEl.textContent = String(score);

        const r = bubble.getBoundingClientRect();
        const pr = playArea.getBoundingClientRect();
        splash(r.left - pr.left + r.width / 2, r.top - pr.top + r.height / 2, color);

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
    playArea.querySelectorAll(".bubble, .splash").forEach(function (b) { b.remove(); });
  }

  startBtn.addEventListener("click", startGame);
  showBestLine();
})();
