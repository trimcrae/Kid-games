/* ===========================================================
   Builds the game cards on the landing page from GAMES list.
   You shouldn't need to edit this — just edit games.js.
   =========================================================== */

(function buildArcade() {
  const grid = document.getElementById("game-grid");
  if (!grid || typeof GAMES === "undefined") return;

  const cards = []; // [{card, kids, searchable}] for combined kid/topic filters

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
      card.setAttribute("aria-label", (game.title || "Untitled") + ". Coming soon!");
    }

    const ageText = ready ? (game.ages || "All ages") : "Coming soon!";

    card.innerHTML =
      '<span class="emoji" aria-hidden="true">' + escapeHtml(game.emoji || "🎲") + "</span>" +
      // An optional `flag:` on a game — a short line about something new in
      // it — rides above the title.
      (game.flag ? '<span class="new-flag">' + escapeHtml(game.flag) + "</span>" : "") +
      "<h2>" + escapeHtml(game.title || "Untitled") + "</h2>" +
      '<span class="age-badge">' + escapeHtml(ageText) + "</span>";

    if (ready) {
      card.addEventListener("click", function () {
        try { localStorage.setItem("arcade.last", JSON.stringify({ title: game.title, url: game.url, emoji: game.emoji })); } catch (e) {}
      });
    }

    grid.appendChild(card);
    cards.push({
      card: card,
      kids: Array.isArray(game.kids) ? game.kids : [],
      // Learning notes are searchable without making the compact cards longer.
      searchable: normalizeSearch([game.title, game.blurb, game.flag, game.ages].filter(Boolean).join(" "))
    });
  });

  /* --- "jump back in" — one tap back to the last game played --- */
  try {
    var last = JSON.parse(localStorage.getItem("arcade.last"));
    var previousGame = last && typeof last === "object" && typeof last.url === "string" &&
      GAMES.find(function (g) { return g.url === last.url && g.ready !== false && g.url && g.url !== "#"; });
    if (previousGame) {
      var banner = document.createElement("a");
      banner.className = "resume-banner";
      banner.href = previousGame.url;
      banner.innerHTML = "▶ Jump back in: " +
        '<span aria-hidden="true">' + escapeHtml(previousGame.emoji || "🎲") + "</span> " +
        "<b>" + escapeHtml(previousGame.title || "Untitled") + "</b>";
      grid.parentNode.insertBefore(banner, grid);
    }
  } catch (e) { /* no saved game — fine */ }

  /* --- Kid and topic filters — every game shows on 🌈 Everybody --- */
  const chipRow = document.getElementById("kid-chips");
  const chipButtons = chipRow ? Array.from(chipRow.querySelectorAll(".kid-chip")) : [];
  const search = document.getElementById("game-search");
  const clearSearch = document.getElementById("clear-search");
  const results = document.getElementById("game-results");
  const emptyState = document.getElementById("empty-state");
  const resetFilters = document.getElementById("reset-filters");
  const lucky = document.getElementById("lucky");
  const KID_KEY = "arcade.kid";
  let kid = "all";
  try { kid = localStorage.getItem(KID_KEY) || "all"; } catch (e) {}
  // Saved values are data, never part of a CSS selector. Corrupt or old values
  // simply fall back to Everybody instead of breaking the whole arcade.
  if (!chipButtons.some(function (c) { return c.dataset.kid === kid; })) kid = "all";

  function saveKid() {
    try { localStorage.setItem(KID_KEY, kid); } catch (e) {}
  }

  function applyFilters() {
    chipButtons.forEach(function (c) {
      c.setAttribute("aria-pressed", String(c.dataset.kid === kid));
    });
    const words = normalizeSearch(search ? search.value : "").trim().split(/\s+/).filter(Boolean);
    let shown = 0;
    let playable = 0;
    cards.forEach(function (entry) {
      const hide = (kid !== "all" && entry.kids.indexOf(kid) === -1) ||
        !words.every(function (word) { return entry.searchable.indexOf(word) !== -1; });
      entry.card.hidden = hide;
      entry.card.classList.toggle("filtered-out", hide);
      entry.card.style.animationDelay = hide ? "" : Math.min(shown * 25, 180) + "ms";
      if (!hide) {
        shown++;
        if (entry.card.tagName === "A") playable++;
      }
    });
    if (results) results.textContent = shown + (shown === 1 ? " game" : " games") + " to explore";
    if (emptyState) emptyState.hidden = shown !== 0;
    if (clearSearch) clearSearch.hidden = !search || !search.value;
    if (lucky) lucky.disabled = playable === 0;
  }

  function clearQuery() {
    if (search) { search.value = ""; search.focus(); }
    applyFilters();
  }

  if (chipRow) {
    chipRow.addEventListener("click", function (ev) {
      const chip = ev.target.closest(".kid-chip");
      if (!chip || chipButtons.indexOf(chip) === -1) return;
      kid = chip.dataset.kid;
      saveKid();
      applyFilters();
    });
  }

  if (search) {
    search.addEventListener("input", applyFilters);
    search.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && search.value) {
        ev.preventDefault();
        clearQuery();
      }
    });
  }
  if (clearSearch) clearSearch.addEventListener("click", clearQuery);
  if (resetFilters) resetFilters.addEventListener("click", function () {
    kid = "all";
    saveKid();
    clearQuery();
  });
  applyFilters();

  /* --- "🎲 Surprise me!" — jump into a random game that's showing --- */
  if (lucky) {
    lucky.addEventListener("click", function () {
      var showing = cards.filter(function (e) {
        return !e.card.classList.contains("filtered-out") && e.card.tagName === "A";
      });
      if (!showing.length) return;
      var pick = showing[Math.floor(Math.random() * showing.length)].card;
      pick.click();                       // remembers it as "last played" too
      window.location.href = pick.href;
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function normalizeSearch(str) {
    return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  /* --- offline support: one visit to the arcade caches it for car rides --- */
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").then(function (reg) {
      // ask the worker to pre-cache every game for offline play
      var urls = GAMES.filter(function (g) { return g.ready !== false && g.url && g.url !== "#"; })
                      .map(function (g) { return g.url; });
      var worker = reg.active || reg.waiting || reg.installing;
      if (worker) worker.postMessage({ warm: urls });
      navigator.serviceWorker.ready.then(function (r) {
        if (r.active) r.active.postMessage({ warm: urls });
      });
    }).catch(function () { /* http or old browser — fine */ });
  }
})();
