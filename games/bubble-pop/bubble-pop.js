/* ===========================================================
   Number Bubble Pop — an educational counting / number-recognition
   game. A target number is shown; pop the bubble with that number.
   Great for ages 3–8 (number recognition + quick matching).
   =========================================================== */

(function () {
  const playArea = document.getElementById("play-area");
  const scoreEl = document.getElementById("score");
  const timeEl = document.getElementById("time");
  const targetEl = document.getElementById("target");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const startBtn = document.getElementById("start-btn");

  const COLORS = ["#ff5d8f", "#8a5cff", "#38b6ff", "#3ddc84", "#ffd166"];
  const GAME_SECONDS = 45;
  const MAX_NUMBER = 9; // pop numbers 1–9

  let score = 0;
  let timeLeft = GAME_SECONDS;
  let target = 1;
  let spawnTimer = null;
  let countdownTimer = null;

  function randomNumber() {
    return 1 + Math.floor(Math.random() * MAX_NUMBER);
  }

  function newTarget() {
    target = randomNumber();
    targetEl.textContent = String(target);
  }

  function startGame() {
    score = 0;
    timeLeft = GAME_SECONDS;
    scoreEl.textContent = "0";
    timeEl.textContent = String(GAME_SECONDS);
    overlay.classList.add("hidden");
    newTarget();

    clearBubbles();
    // Spawn an even mix so the target is reliably on screen.
    spawnTimer = setInterval(spawnBubble, 600);
    countdownTimer = setInterval(tick, 1000);
  }

  function tick() {
    timeLeft -= 1;
    timeEl.textContent = String(Math.max(timeLeft, 0));
    if (timeLeft <= 0) endGame();
  }

  function endGame() {
    clearInterval(spawnTimer);
    clearInterval(countdownTimer);
    overlayTitle.textContent = "Great counting! 🎉";
    overlayText.textContent = "You found " + score + " number" + (score === 1 ? "" : "s") + "!";
    startBtn.textContent = "Play Again ▶";
    overlay.classList.remove("hidden");
  }

  function spawnBubble() {
    // Bias spawns so the current target appears often.
    const number = Math.random() < 0.45 ? target : randomNumber();

    const bubble = document.createElement("button");
    bubble.className = "bubble";
    bubble.textContent = String(number);
    bubble.setAttribute("aria-label", "bubble number " + number);

    const size = 56 + Math.floor(Math.random() * 40); // 56–96px (room for the digit)
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const maxLeft = playArea.clientWidth - size;
    const left = Math.max(0, Math.floor(Math.random() * maxLeft));
    const duration = 4.5 + Math.random() * 2.5; // 4.5–7s to rise

    bubble.style.width = size + "px";
    bubble.style.height = size + "px";
    bubble.style.left = left + "px";
    bubble.style.fontSize = Math.round(size * 0.42) + "px";
    bubble.style.setProperty("--c", color);
    bubble.style.animationDuration = duration + "s";

    bubble.addEventListener("click", function () {
      if (bubble.classList.contains("pop")) return;

      if (number === target) {
        score += 1;
        scoreEl.textContent = String(score);
        bubble.classList.add("pop");
        setTimeout(function () { bubble.remove(); }, 250);
        newTarget();
      } else {
        // Gentle "not quite" wobble — no penalty, keep it encouraging.
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
    playArea.querySelectorAll(".bubble").forEach(function (b) { b.remove(); });
  }

  startBtn.addEventListener("click", startGame);
})();
