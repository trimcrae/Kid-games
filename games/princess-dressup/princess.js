/* ===========================================================
   Princess Dress-Up — find letters & numbers to dress a princess.
   Built for Ellie (3): learning letters & numbers, loves princesses.
   Pre-reader friendly: every prompt and praise is spoken aloud.

   Extras: an outfit progress row so she can see how close she is,
   praise words that pop up over the princess, a glowing hint on the
   right gem after two misses, a spoken reminder if she goes quiet,
   and a gentle ramp — more choices and trickier look-alike letters
   as her star count grows.
   =========================================================== */

(function () {
  var STARS_KEY = "princess.stars";
  var MUTE_KEY = "princess.muted";

  // The outfit pieces, revealed one per correct answer (in order).
  var SLOTS = ["crown", "flower", "necklace", "wand", "shoes", "sparkle"];
  var SLOT_ICONS = { crown: "👑", flower: "🌼", necklace: "📿", wand: "🪄", shoes: "👠", sparkle: "✨" };

  var DRESS_COLORS = ["#ff6fa5", "#9b3fc4", "#38b6ff", "#3ddc84", "#ffd23f", "#ff5d8f"];

  var LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  var NUMBERS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
  var PRAISE = ["Yay!", "Hooray!", "Wonderful!", "You did it!", "So pretty!", "Great job!"];

  // look-alike sets: once she has a few stars, distractors get sneakier
  var SIMILAR = {
    B: ["D", "P", "R"], D: ["B", "O", "Q"], E: ["F", "B"], F: ["E", "P"],
    I: ["L", "J", "T"], J: ["I", "L"], L: ["I", "J"], M: ["N", "W"],
    N: ["M", "Z"], O: ["Q", "C", "D"], Q: ["O", "G"], P: ["B", "R"],
    R: ["P", "B"], U: ["V", "W"], V: ["U", "W", "Y"], W: ["V", "M"],
    C: ["G", "O"], G: ["C", "Q"], S: ["Z", "G"], Z: ["S", "N"],
    T: ["I", "F"], K: ["X", "H"], H: ["K", "N"], X: ["K", "Y"],
    Y: ["X", "V"], A: ["H", "V"],
    "1": ["7", "4"], "2": ["5", "3"], "3": ["8", "2"], "4": ["1", "7"],
    "5": ["2", "6"], "6": ["9", "8"], "7": ["1", "4"], "8": ["6", "3"],
    "9": ["6", "10"], "10": ["1", "9"]
  };

  var princessEl = document.getElementById("princess");
  var dressEl = document.getElementById("dress");
  var promptLabel = document.getElementById("prompt-label");
  var targetEl = document.getElementById("target-char");
  var choicesEl = document.getElementById("choices");
  var starsEl = document.getElementById("stars");
  var muteBtn = document.getElementById("mute");
  var overlay = document.getElementById("overlay");
  var overlayTitle = document.getElementById("overlay-title");
  var overlayText = document.getElementById("overlay-text");
  var overlayStars = document.getElementById("overlay-stars");
  var progressEl = document.getElementById("progress");
  var startBtn = document.getElementById("start-btn");

  var slotIndex = 0;
  var target = null;
  var lastTarget = null;
  var usedTargets = [];      // no repeated targets within one princess
  var wrongTries = 0;
  var currentClip = null;    // the prompt clip, replayed if she goes quiet
  var idleTimer = null;
  var locked = false;
  var stars = parseInt(localStorage.getItem(STARS_KEY) || "0", 10) || 0;
  var muted = localStorage.getItem(MUTE_KEY) === "1";

  starsEl.textContent = String(stars);
  muteBtn.textContent = muted ? "🔇" : "🔊";

  function rand(n) { return Math.floor(Math.random() * n); }
  function pick(arr) { return arr[rand(arr.length)]; }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = rand(i + 1);
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Play a pre-rendered neural-voice clip from this game's audio/ folder.
  function playClip(name) {
    if (muted) return;
    if (window.Voice) Voice.play("audio/" + name + ".mp3");
  }

  function isLetter(ch) { return /[A-Z]/.test(ch); }

  /* ---------- outfit progress row ---------- */
  var progressItems = [];
  SLOTS.forEach(function (slot) {
    var it = document.createElement("span");
    it.className = "op-item";
    it.textContent = SLOT_ICONS[slot];
    it.setAttribute("aria-hidden", "true");
    progressEl.appendChild(it);
    progressItems.push(it);
  });
  function updateProgress() {
    progressItems.forEach(function (it, i) {
      it.classList.toggle("done", i < slotIndex);
    });
  }

  /* ---------- a praise word popping up over the princess ---------- */
  function showPraise(text) {
    var p = document.createElement("span");
    p.className = "praise-pop";
    p.textContent = text;
    princessEl.appendChild(p);
    setTimeout(function () { p.remove(); }, 950);
  }

  /* ---------- idle nudge: repeat the prompt if she's been quiet ---------- */
  function armIdleNudge() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      if (locked || !overlay.classList.contains("hidden")) return;
      if (currentClip) playClip(currentClip);
      targetEl.classList.remove("wiggle");
      void targetEl.offsetWidth;
      targetEl.classList.add("wiggle");
      armIdleNudge();
    }, 9000);
  }

  /* ---------- rounds ---------- */
  // gentle ramp: a fourth gem once she has a few stars,
  // look-alike distractors once she's a seasoned princess-dresser
  function choiceCount() { return stars >= 3 ? 4 : 3; }
  function trickyMode() { return stars >= 5; }

  function pickDistractors(pool, howMany) {
    var out = [];
    var guard = 0;
    if (trickyMode() && SIMILAR[target]) {
      // prefer look-alikes of the target (still from the same pool)
      SIMILAR[target].forEach(function (d) {
        if (out.length < howMany && pool.indexOf(d) !== -1 && d !== target) out.push(d);
      });
    }
    while (out.length < howMany && guard++ < 60) {
      var d = pick(pool);
      if (d !== target && out.indexOf(d) === -1) out.push(d);
    }
    return out.slice(0, howMany);
  }

  function newRound() {
    if (slotIndex >= SLOTS.length) { finishPrincess(); return; }
    locked = false;
    wrongTries = 0;

    // pick a letter-round or number-round
    var useLetters = Math.random() < 0.5;
    var pool = useLetters ? LETTERS : NUMBERS;
    var guard = 0;
    do { target = pick(pool); }
    while ((target === lastTarget || usedTargets.indexOf(target) !== -1) && guard++ < 60);
    lastTarget = target;
    usedTargets.push(target);

    var distractors = pickDistractors(pool, choiceCount() - 1);
    var choices = shuffle([target].concat(distractors));

    var kind = isLetter(target) ? "letter" : "number";
    promptLabel.textContent = "Find the " + kind + ":";
    targetEl.textContent = target;
    currentClip = "find-" + kind + "-" + target.toLowerCase();
    playClip(currentClip);
    armIdleNudge();

    choicesEl.innerHTML = "";
    choices.forEach(function (ch) {
      var btn = document.createElement("button");
      btn.className = "gem";
      btn.style.background = pick(DRESS_COLORS);
      btn.textContent = ch;
      btn.setAttribute("aria-label", kind + " " + ch);
      btn.addEventListener("click", function () { choose(ch, btn); });
      choicesEl.appendChild(btn);
    });
  }

  function choose(ch, btn) {
    if (locked) return;
    if (ch === target) {
      locked = true;
      clearTimeout(idleTimer);
      btn.classList.add("correct");
      window.SFX && SFX.good();
      revealSlot(SLOTS[slotIndex]);
      slotIndex += 1;
      updateProgress();
      var pi = rand(PRAISE.length);
      playClip("praise-" + pi);
      showPraise(PRAISE[pi]);
      setTimeout(newRound, 900);
    } else {
      wrongTries += 1;
      btn.classList.add("wrong");
      window.SFX && SFX.nope();
      playClip("try-again");
      setTimeout(function () { btn.classList.remove("wrong"); }, 500);
      if (wrongTries >= 2) {
        // she's stuck — make the right gem glow so there's no dead end
        [].forEach.call(choicesEl.children, function (g) {
          g.classList.toggle("hint", g.textContent === target);
        });
      }
    }
  }

  function revealSlot(slot) {
    var parts = princessEl.querySelectorAll('.acc[data-slot="' + slot + '"]');
    [].forEach.call(parts, function (el) { el.classList.add("on"); });
    setTimeout(function () { window.SFX && SFX.coin(); }, 250);
  }

  function starLine() {
    return stars <= 10 ? "⭐".repeat(stars) : "⭐ × " + stars;
  }

  function finishPrincess() {
    clearTimeout(idleTimer);
    stars += 1;
    localStorage.setItem(STARS_KEY, String(stars));
    starsEl.textContent = String(stars);
    overlay.querySelector(".big").textContent = "👑👸✨";
    overlayTitle.textContent = "Beautiful! 🎉";
    overlayText.textContent = "You dressed the whole princess! Want to dress another one?";
    overlayStars.textContent = starLine();
    startBtn.textContent = "Dress Another 👗";
    overlay.classList.remove("hidden");
    window.SFX && SFX.win();
    window.Confetti && Confetti.burst({ count: 110 });
    playClip("beautiful");
  }

  function resetPrincess() {
    slotIndex = 0;
    lastTarget = null;
    usedTargets = [];
    [].forEach.call(princessEl.querySelectorAll(".acc"), function (el) {
      el.classList.remove("on");
    });
    updateProgress();
    var dressColor = pick(DRESS_COLORS);
    if (dressEl) dressEl.style.setProperty("--dress", dressColor);
    if (window.PrincessArt) PrincessArt.setDress(dressColor);
    overlay.classList.add("hidden");
    newRound();
  }

  muteBtn.addEventListener("click", function () {
    muted = !muted;
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    muteBtn.textContent = muted ? "🔇" : "🔊";
    if (muted && window.Voice) Voice.stop();
  });

  startBtn.addEventListener("click", function () {
    // first start picks a fresh dress colour and begins
    resetPrincess();
  });

  // set an initial dress colour so she looks pretty on the start screen
  var initColor = pick(DRESS_COLORS);
  if (dressEl) dressEl.style.setProperty("--dress", initColor);
  if (window.PrincessArt) PrincessArt.setDress(initColor);

  // returning princess-dressers see their star collection right away
  if (stars > 0) overlayStars.textContent = starLine();
})();
