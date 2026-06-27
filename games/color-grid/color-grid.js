/* ===========================================================
   Color Grid Quest
   -----------------------------------------------------------
   Each round shows a colour + a letter. Pick the word that is
   BOTH that colour AND starts with that letter, and the block
   gets placed in your wall. The two wrong choices each match
   only ONE thing (right colour / wrong letter, or right letter
   / wrong colour) so you have to check both — real grid logic!
   =========================================================== */

(function () {
  var GOAL = 12; // blocks to build to win

  var promptBlock = document.getElementById("prompt-block");
  var promptText = document.getElementById("prompt-text");
  var choicesEl = document.getElementById("choices");
  var wallEl = document.getElementById("wall");
  var placedEl = document.getElementById("placed");
  var goalEl = document.getElementById("goal");
  var streakEl = document.getElementById("streak");
  var overlay = document.getElementById("overlay");
  var overlayTitle = document.getElementById("overlay-title");
  var overlayText = document.getElementById("overlay-text");
  var startBtn = document.getElementById("start-btn");

  var placed = 0;
  var streak = 0;
  var bestStreak = 0;
  var current = null;
  var lastWord = "";
  var locked = false;

  goalEl.textContent = String(GOAL);

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

  function newRound() {
    locked = false;
    choicesEl.classList.remove("waiting");

    // Pick a fresh correct answer (not the same word twice in a row).
    var correct;
    do { correct = pick(ENTRIES); } while (correct.w === lastWord);
    lastWord = correct.w;
    current = correct;

    var color = COLORS[correct.c];

    // Distractor 1: SAME letter, DIFFERENT colour (tests colour).
    var sameLetter = ENTRIES.filter(function (e) {
      return e.l === correct.l && e.c !== correct.c;
    });
    // Distractor 2: SAME colour, DIFFERENT letter (tests letter).
    var sameColor = ENTRIES.filter(function (e) {
      return e.c === correct.c && e.l !== correct.l && e.w !== correct.w;
    });

    var choices = [correct];
    if (sameLetter.length) choices.push(pick(sameLetter));
    if (sameColor.length) choices.push(pick(sameColor));

    // Top up to 3 choices with any other word if needed.
    while (choices.length < 3) {
      var extra = pick(ENTRIES);
      var dup = choices.some(function (c) { return c.w === extra.w; });
      if (!dup) choices.push(extra);
    }
    choices = shuffle(choices);

    // Render the prompt.
    promptBlock.style.background = color.hex;
    promptBlock.style.color = color.dark ? "#2b2440" : "#fff";
    promptBlock.textContent = correct.l;
    promptText.innerHTML =
      "Find the <b style='color:" + color.hex + "'>" + color.name +
      "</b> thing that starts with <b>" + correct.l + "</b>";

    // Render choices.
    choicesEl.innerHTML = "";
    choices.forEach(function (choice) {
      var btn = document.createElement("button");
      btn.className = "choice";
      btn.innerHTML =
        '<span class="choice-emoji" aria-hidden="true">' + (choice.e || "🎲") + "</span>" +
        "<span class=\"choice-word\">" + choice.w + "</span>";
      btn.addEventListener("click", function () { handleChoice(choice, btn); });
      choicesEl.appendChild(btn);
    });
  }

  function handleChoice(choice, btn) {
    if (locked) return;

    if (choice.w === current.w) {
      // Correct! Lock, place the block, advance.
      locked = true;
      choicesEl.classList.add("waiting");
      btn.classList.add("correct");
      streak += 1;
      if (streak > bestStreak) bestStreak = streak;
      streakEl.textContent = String(streak);

      placeBlock(current);
      placed += 1;
      placedEl.textContent = String(placed);

      if (placed >= GOAL) {
        setTimeout(winGame, 650);
      } else {
        setTimeout(newRound, 650);
      }
    } else {
      // Gentle "not quite" — wobble, reset streak, let them try again.
      btn.classList.add("wrong");
      streak = 0;
      streakEl.textContent = "0";
      setTimeout(function () { btn.classList.remove("wrong"); }, 450);
    }
  }

  function placeBlock(entry) {
    var color = COLORS[entry.c];
    var block = document.createElement("div");
    block.className = "wall-block";
    block.style.background = color.hex;
    block.style.color = color.dark ? "#2b2440" : "#fff";
    block.title = entry.w;
    block.innerHTML = "<span aria-hidden=\"true\">" + (entry.e || entry.l) + "</span>";
    wallEl.appendChild(block);
  }

  function winGame() {
    overlayTitle.textContent = "You built it! 🏆";
    overlayText.textContent =
      "You placed all " + GOAL + " blocks! Best streak: " + bestStreak + " in a row. 🔥";
    startBtn.textContent = "Build Again ▶";
    overlay.classList.remove("hidden");
  }

  function startGame() {
    placed = 0;
    streak = 0;
    bestStreak = 0;
    lastWord = "";
    placedEl.textContent = "0";
    streakEl.textContent = "0";
    wallEl.innerHTML = "";
    overlay.classList.add("hidden");
    newRound();
  }

  startBtn.addEventListener("click", startGame);
})();
