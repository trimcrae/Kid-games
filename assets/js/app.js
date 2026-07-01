/* ===========================================================
   Builds the game cards on the landing page from GAMES list.
   You shouldn't need to edit this — just edit games.js.
   =========================================================== */

(function buildArcade() {
  const grid = document.getElementById("game-grid");
  if (!grid || typeof GAMES === "undefined") return;

  const cards = []; // [{card, kids}] for the "Who's playing?" filter

  GAMES.forEach(function (game) {
    const ready = game.ready !== false && game.url && game.url !== "#";
    const tag = ready ? "a" : "div";
    const card = document.createElement(tag);

    card.className = "game-card" + (ready ? "" : " soon");
    card.style.setProperty("--accent", game.color || "#8a5cff");

    if (ready) {
      card.href = game.url;
    } else {
      card.setAttribute("role", "img");
    }

    const ageText = ready ? (game.ages || "All ages") : "Coming soon!";

    card.innerHTML =
      '<span class="emoji" aria-hidden="true">' + (game.emoji || "🎲") + "</span>" +
      "<h2>" + escapeHtml(game.title || "Untitled") + "</h2>" +
      "<p>" + escapeHtml(game.blurb || "") + "</p>" +
      '<span class="age-badge">' + escapeHtml(ageText) + "</span>";

    grid.appendChild(card);
    cards.push({ card: card, kids: game.kids || [] });
  });

  /* --- "Who's playing?" filter — every game still shows on 🌈 Everybody --- */
  const chipRow = document.getElementById("kid-chips");
  if (chipRow) {
    const KID_KEY = "arcade.kid";
    let kid = "all";
    try { kid = localStorage.getItem(KID_KEY) || "all"; } catch (e) {}
    if (!chipRow.querySelector('[data-kid="' + kid + '"]')) kid = "all";

    function applyKid() {
      chipRow.querySelectorAll(".kid-chip").forEach(function (c) {
        c.setAttribute("aria-pressed", String(c.dataset.kid === kid));
      });
      cards.forEach(function (e) {
        e.card.classList.toggle("filtered-out", kid !== "all" && e.kids.indexOf(kid) === -1);
      });
    }

    chipRow.addEventListener("click", function (ev) {
      const chip = ev.target.closest(".kid-chip");
      if (!chip) return;
      kid = chip.dataset.kid;
      try { localStorage.setItem(KID_KEY, kid); } catch (e) {}
      applyKid();
    });

    applyKid();
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
})();
