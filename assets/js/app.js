/* ===========================================================
   Builds the game cards on the landing page from GAMES list.
   You shouldn't need to edit this — just edit games.js.
   =========================================================== */

(function buildArcade() {
  const grid = document.getElementById("game-grid");
  if (!grid || typeof GAMES === "undefined") return;

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
  });

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
})();
