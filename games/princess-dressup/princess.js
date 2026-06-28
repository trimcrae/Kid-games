/* ===========================================================
   Princess Dress-Up — find letters & numbers to dress a princess.
   Built for Ellie (3): learning letters & numbers, loves princesses.
   Pre-reader friendly: every prompt and praise is spoken aloud.
   =========================================================== */

(function () {
  var STARS_KEY = "princess.stars";
  var MUTE_KEY = "princess.muted";

  // The outfit pieces, revealed one per correct answer (in order).
  var SLOTS = ["crown", "flower", "necklace", "wand", "shoes", "sparkle"];

  var DRESS_COLORS = ["#ff6fa5", "#9b3fc4", "#38b6ff", "#3ddc84", "#ffd23f", "#ff5d8f"];

  var LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  var NUMBERS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
  var PRAISE = ["Yay!", "Hooray!", "Wonderful!", "You did it!", "So pretty!", "Great job!"];

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
  var startBtn = document.getElementById("start-btn");

  var slotIndex = 0;
  var target = null;
  var lastTarget = null;
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

  function newRound() {
    if (slotIndex >= SLOTS.length) { finishPrincess(); return; }
    locked = false;

    // pick a letter-round or number-round
    var useLetters = Math.random() < 0.5;
    var pool = useLetters ? LETTERS : NUMBERS;
    do { target = pick(pool); } while (target === lastTarget);
    lastTarget = target;

    // two distractors of the SAME type (focus on recognition within type)
    var distractors = [];
    var guard = 0;
    while (distractors.length < 2 && guard++ < 50) {
      var d = pick(pool);
      if (d !== target && distractors.indexOf(d) === -1) distractors.push(d);
    }
    var choices = shuffle([target].concat(distractors));

    var kind = isLetter(target) ? "letter" : "number";
    promptLabel.textContent = "Find the " + kind + ":";
    targetEl.textContent = target;
    playClip("find-" + kind + "-" + target.toLowerCase());

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
      btn.classList.add("correct");
      window.SFX && SFX.good();
      revealSlot(SLOTS[slotIndex]);
      slotIndex += 1;
      playClip("praise-" + rand(PRAISE.length));
      setTimeout(newRound, 900);
    } else {
      btn.classList.add("wrong");
      window.SFX && SFX.nope();
      playClip("try-again");
      setTimeout(function () { btn.classList.remove("wrong"); }, 500);
    }
  }

  function revealSlot(slot) {
    var parts = princessEl.querySelectorAll('.acc[data-slot="' + slot + '"]');
    [].forEach.call(parts, function (el) { el.classList.add("on"); });
  }

  function finishPrincess() {
    stars += 1;
    localStorage.setItem(STARS_KEY, String(stars));
    starsEl.textContent = String(stars);
    overlay.querySelector(".big").textContent = "👑👸✨";
    overlayTitle.textContent = "Beautiful! 🎉";
    overlayText.textContent = "You dressed the whole princess! Want to dress another one?";
    startBtn.textContent = "Dress Another 👗";
    overlay.classList.remove("hidden");
    window.SFX && SFX.win();
    window.Confetti && Confetti.burst({ count: 110 });
    playClip("beautiful");
  }

  function resetPrincess() {
    slotIndex = 0;
    lastTarget = null;
    [].forEach.call(princessEl.querySelectorAll(".acc"), function (el) {
      el.classList.remove("on");
    });
    dressEl.style.setProperty("--dress", pick(DRESS_COLORS));
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
  dressEl.style.setProperty("--dress", pick(DRESS_COLORS));
})();
