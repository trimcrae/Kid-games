/* ===========================================================
   Soccer Roster Maker
   -----------------------------------------------------------
   Builds fair line-ups for a 2 / 4 / 8 period game:
     • 1 goalie + 6 field players each period
     • playing time kept as even as possible
     • goalies rotate (no repeats unless there are more periods
       than eligible goalies)
   Everything is saved in localStorage so Shannon's team and
   choices stick between visits.
   =========================================================== */

(function () {
  "use strict";

  var STORE_KEY = "soccerRoster.v3";
  var FIELD = 6;            // field players per period
  var ON_FIELD = FIELD + 1; // + goalie

  // The Gu8 McRae - Orange roster (from the team list).
  var DEFAULT_TEAM = [
    "Addison K", "Addison M", "Braelynn",
    "Brooklyn", "Charlotte", "Emilia",
    "Evelyn", "Jeannie", "Julia",
    "Kinsley", "Logan", "Olivia",
    "Savannah"
  ].map(function (n) { return { name: n, present: true, gk: "yes" }; });
  // gk: "yes" = can play goalie, "must" = has to play goalie, "no" = never goalie

  // ---- state ----
  var state = load();

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && s.team && s.team.length) {
          s.periods = 8;            // always open on 8 periods
          s.seed = s.seed || 1;
          s.game = s.game || { opp: "", date: "" };
          // everyone goalie-eligible on load (also migrates the old goalie:true/false field)
          s.team.forEach(function (g) { g.gk = "yes"; delete g.goalie; });
          return s;
        }
      }
    } catch (e) { /* ignore */ }
    return {
      team: DEFAULT_TEAM.map(function (g) { return Object.assign({}, g); }),
      periods: 8,
      seed: 1,
      game: { opp: "", date: "" },
      lastRoster: null
    };
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  // ---- tiny seeded RNG (mulberry32) so "shuffle" is repeatable ----
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, rng) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  /* ===========================================================
     The roster algorithm.
     Period by period, always picking the girls who have played
     the LEAST so far. Goalie counts as playing, so it stays
     balanced. Goalies are spread out so nobody doubles up until
     everyone eligible has had a turn.
     =========================================================== */
  function buildRoster(team, periods, seed) {
    var present = team.filter(function (g) { return g.present; });
    var rng = mulberry32(seed);
    // base random order — used as the tie-break between equal players
    var order = shuffle(present.slice(), rng);

    var stat = {};
    order.forEach(function (g) {
      // satStreak = how many periods in a row this girl has just sat out,
      // so we can pull her back on before her rest clumps up.
      stat[g.name] = { plays: 0, goalie: 0, satStreak: 0, roles: [] };
    });

    var lineups = [];
    for (var p = 0; p < periods; p++) {
      // --- pick the goalie ---
      // "must" girls who haven't been in goal yet get first dibs on the slot,
      // so everyone marked ★ is guaranteed a turn before the normal rotation.
      var goalie = null;
      var mustPending = order.filter(function (g) { return g.gk === "must" && stat[g.name].goalie === 0; });
      var pool = mustPending.length ? mustPending
        : order.filter(function (g) { return g.gk !== "no"; });   // anyone eligible (✓ or ★)
      if (pool.length) {
        var minG = Math.min.apply(null, pool.map(function (g) { return stat[g.name].goalie; }));
        var gPool = pool.filter(function (g) { return stat[g.name].goalie === minG; });
        gPool.sort(function (a, b) {
          var sa = stat[a.name], sb = stat[b.name];
          if (sa.plays !== sb.plays) return sa.plays - sb.plays;          // fewest playing time first
          if (sa.satStreak !== sb.satStreak) return sb.satStreak - sa.satStreak; // resting longest -> back on
          return 0;
        });
        goalie = gPool[0];
      }

      // --- pick 6 field players (anyone present except the goalie) ---
      var fieldPool = order.filter(function (g) { return g !== goalie; });
      fieldPool.sort(function (a, b) {
        var sa = stat[a.name], sb = stat[b.name];
        if (sa.plays !== sb.plays) return sa.plays - sb.plays;          // least playing time first
        if (sa.satStreak !== sb.satStreak) return sb.satStreak - sa.satStreak; // sitting longest? you're up (no clumps)
        return 0;                                                       // else keep random order
      });
      var field = fieldPool.slice(0, Math.min(FIELD, fieldPool.length));

      // --- record who's playing ---
      var playing = {};
      if (goalie) {
        stat[goalie.name].plays++; stat[goalie.name].goalie++;
        stat[goalie.name].roles[p] = "G"; playing[goalie.name] = true;
      }
      field.forEach(function (g) {
        stat[g.name].plays++; stat[g.name].roles[p] = "F"; playing[g.name] = true;
      });

      var sitting = [];
      order.forEach(function (g) {
        if (playing[g.name]) {
          stat[g.name].satStreak = 0;
        } else {
          stat[g.name].satStreak++;
          if (stat[g.name].roles[p] === undefined) stat[g.name].roles[p] = "-";
          sitting.push(g.name);
        }
      });

      lineups.push({
        goalie: goalie ? goalie.name : null,
        field: field.map(function (g) { return g.name; }),
        sitting: sitting
      });
    }

    return { lineups: lineups, stat: stat, present: present, periods: periods };
  }

  /* ===========================================================
     Rendering
     =========================================================== */
  function ordinal(i, periods) {
    var word = periods === 2 ? "Half" : periods === 4 ? "Quarter" : "Period";
    var names = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];
    return names[i] + " " + word;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function renderTeam() {
    var list = document.getElementById("teamList");
    list.innerHTML = "";
    state.team.forEach(function (g, i) {
      var row = document.createElement("div");
      row.className = "player-row" + (g.present ? "" : " away");

      var name = document.createElement("span");
      name.className = "pname";
      name.textContent = g.name;

      var pres = document.createElement("button");
      pres.className = "chip " + (g.present ? "present" : "absent");
      pres.textContent = g.present ? "Here" : "Away";
      pres.title = "Tap to mark here / away today";
      pres.onclick = function () { g.present = !g.present; save(); renderTeam(); settingsChanged(); };

      var gk = document.createElement("button");
      // Three states: ✓ can play goalie, ★ must play goalie, — never goalie.
      // While a girl is Away the chip shows the "—" state (her real setting is
      // kept underneath and returns when she's marked Here again).
      var st = g.present ? g.gk : "no";
      var cls = st === "must" ? "gk-must" : st === "yes" ? "gk-yes" : "gk-no";
      var label = st === "must" ? "Must be goalie" : st === "yes" ? "Can be goalie" : "Never goalie";
      gk.className = "chip " + cls;
      gk.textContent = label;
      gk.title = g.present
        ? "Tap to cycle: Can be goalie → Must be goalie → Never goalie"
        : "Away today — not available as goalie";
      gk.disabled = !g.present;
      gk.onclick = function () {
        if (!g.present) return;
        g.gk = g.gk === "yes" ? "must" : g.gk === "must" ? "no" : "yes";
        save(); renderTeam(); settingsChanged();
      };

      var controls = document.createElement("div");
      controls.className = "player-controls";
      controls.appendChild(pres);
      controls.appendChild(gk);

      var rm = document.createElement("button");
      rm.className = "rm-btn";
      rm.textContent = "✕";
      rm.title = "Remove " + g.name + " from the team";
      rm.setAttribute("aria-label", "Remove " + g.name);
      rm.onclick = function () {
        if (!confirm("Remove " + g.name + " from the team for good?\n(Use Away if she's just missing this game.)")) return;
        state.team.splice(i, 1);
        save(); renderTeam(); settingsChanged();
      };

      var top = document.createElement("div");
      top.className = "row-top";
      top.appendChild(name);
      top.appendChild(rm);

      row.appendChild(top);       // name + remove on the first line
      row.appendChild(controls);  // Here / goalie below it
      list.appendChild(row);
    });
  }

  function addPlayer() {
    var input = document.getElementById("newPlayerInput");
    if (!input) return;
    var name = input.value.replace(/\s+/g, " ").trim();
    if (!name) { input.focus(); return; }
    var dupe = state.team.some(function (g) { return g.name.toLowerCase() === name.toLowerCase(); });
    if (dupe) { alert(name + " is already on the team."); input.select(); return; }
    state.team.push({ name: name, present: true, gk: "yes" });
    input.value = "";
    input.focus();
    save(); renderTeam(); settingsChanged();
  }

  function renderPeriodButtons() {
    document.querySelectorAll(".period-btn").forEach(function (b) {
      b.classList.toggle("active", Number(b.dataset.p) === state.periods);
    });
  }

  function renderRoster(r) {
    var out = document.getElementById("output");
    if (!r) { out.innerHTML = ""; return; }

    var present = r.present;
    var n = present.length;

    // ---- compute verification facts ----
    var plays = present.map(function (g) { return r.stat[g.name].plays; });
    var minP = Math.min.apply(null, plays), maxP = Math.max.apply(null, plays);
    var eligCount = present.filter(function (g) { return g.gk !== "no"; }).length;
    var goalieRepeat = present.some(function (g) { return r.stat[g.name].goalie >= 2; });
    var forcedRepeat = state.periods > eligCount;
    var shortHanded = n < ON_FIELD;
    var noGoalie = eligCount === 0;
    // girls marked "must" goalie who didn't get a goalie slot (too few periods)
    var mustMissed = present.filter(function (g) { return g.gk === "must" && r.stat[g.name].goalie === 0; });

    var html = "";

    // ---- at-a-glance fairness summary ----
    if (!noGoalie && !shortHanded) {
      var playsTxt = minP === maxP ? String(minP) : minP + " or " + maxP;
      var gkOrder = r.lineups.map(function (lu) { return lu.goalie; }).filter(Boolean);
      html += '<div class="panel fair-note">' +
        '<span class="fair-bit"><span class="mark">💚</span><span>Everyone here plays <b>' +
        playsTxt + " of " + state.periods + '</b> periods</span></span>' +
        '<span class="fair-bit"><span class="mark">🧤</span><span>Goalie order: <b>' +
        esc(gkOrder.join(" → ")) + "</b></span></span></div>";
    }

    // ---- only flag real problems (no "all good" reassurance clutter) ----
    var warns = [];
    if (noGoalie) warns.push("No goalie picked — set at least one girl to “Can be goalie”.");
    if (shortHanded) warns.push("Only " + n + " here — not enough for 1 goalie + " + FIELD + ", so some spots are open.");
    if (mustMissed.length) warns.push((mustMissed.length === 1 ? mustMissed[0].name + " is" : mustMissed.map(function (g) { return g.name; }).join(", ") + " are") + " set to “Must be goalie”, but there aren’t enough periods to fit everyone.");
    if (maxP - minP > 1) warns.push("Playing time is a little uneven (" + minP + "–" + maxP + ") — try Shuffle again.");
    if (!noGoalie && goalieRepeat && !forcedRepeat) warns.push("A girl plays goalie twice — try Shuffle again.");
    if (warns.length) {
      html += '<div class="panel warn-panel">';
      warns.forEach(function (w) {
        html += '<div class="check warn"><span class="mark">⚠️</span><span>' + esc(w) + "</span></div>";
      });
      html += "</div>";
    }

    // ---- period cards ----
    html += '<div class="panel"><div class="periods-grid">';
    r.lineups.forEach(function (lu, i) {
      html += '<div class="pcard">';
      html += '<div class="ptitle">' + esc(ordinal(i, state.periods)) + "</div>";
      html += '<div class="goalie"><small><span class="gk-emoji">🧤</span> Goalie</small>' + esc(lu.goalie || "—") + "</div>";
      html += "<ol>";
      lu.field.forEach(function (name) { html += "<li>" + esc(name) + "</li>"; });
      // pad empty field spots if short-handed
      for (var k = lu.field.length; k < FIELD; k++) html += '<li style="color:#ccc">(open spot)</li>';
      html += "</ol>";
      if (lu.sitting.length) {
        html += '<div class="sit">Resting: ' + esc(lu.sitting.join(", ")) + "</div>";
      }
      html += "</div>";
    });
    html += "</div></div>";

    // ---- verification grid ----
    html += '<div class="panel grid-panel">';
    html += "<h2>✅ Double-check grid</h2>";
    html += '<p class="hint">Each column = one period. Scan down: every column should have exactly one 🧤 and ' + FIELD + " ●. Scan across each row to see who plays when, and the totals on the right.</p>";
    html += '<div class="grid-scroll"><table class="gridtbl"><thead><tr><th>Player</th>';
    for (var p = 0; p < state.periods; p++) html += "<th>" + (p + 1) + "</th>";
    html += "<th>Plays</th><th>🧤</th></tr></thead><tbody>";

    // alphabetical, present girls first then away
    var rows = state.team.slice().sort(function (a, b) {
      if (a.present !== b.present) return a.present ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    rows.forEach(function (g) {
      var st = r.stat[g.name];
      html += "<tr" + (g.present ? "" : ' class="away"') + '><td class="name">' + esc(g.name) + "</td>";
      for (var pp = 0; pp < state.periods; pp++) {
        if (!g.present) { html += '<td class="s">—</td>'; continue; }
        var role = st ? st.roles[pp] : "-";
        if (role === "G") html += '<td class="g">🧤</td>';
        else if (role === "F") html += '<td class="f">●</td>';
        else html += '<td class="s">·</td>';
      }
      if (g.present && st) {
        html += '<td class="total">' + st.plays + "</td><td>" + (st.goalie || "") + "</td>";
      } else {
        html += '<td class="s">—</td><td class="s">—</td>';
      }
      html += "</tr>";
    });

    // column totals row
    html += '<tr class="totals"><td class="name">Per period</td>';
    for (var c = 0; c < state.periods; c++) {
      var pc = r.lineups[c].field.length + (r.lineups[c].goalie ? 1 : 0);
      html += "<td>" + pc + "</td>";
    }
    html += "<td>" + (state.periods * ON_FIELD) + "</td><td>" + state.periods + "</td></tr>";
    html += "</tbody></table></div>";
    html += '<div class="legend"><span><b class="" style="background:#fff6da;color:#b8860b">🧤</b> goalie</span><span><b style="background:#eafff2;color:#1d9d5a">●</b> field</span><span><b style="background:#fff;color:#ccc">·</b> resting</span></div>';
    html += "</div>";

    out.innerHTML = html;
  }

  /* ===========================================================
     Glue
     -----------------------------------------------------------
     The roster is ONLY built when "Make roster" / "Shuffle" is
     pressed. Any change to the setup (who's here, goalies,
     periods, the team) clears the roster so nothing stale or
     unrequested is ever on screen.
     =========================================================== */
  var hasRoster = false;
  var lastRoster = null;   // the roster on screen, for "Copy as text"

  // Button reads "Make roster" until one exists, then becomes "Shuffle".
  // Print / Copy are disabled until there's a roster to use.
  function setHasRoster(v) {
    hasRoster = v;
    if (!v) lastRoster = null;
    var btn = document.getElementById("generateBtn");
    if (btn) btn.textContent = v ? "🔀 Shuffle" : "⚽ Make roster";
    var fab = document.getElementById("printFab");
    if (fab) fab.disabled = !v;
    var copy = document.getElementById("copyBtn");
    if (copy) copy.disabled = !v;
  }

  // "Pumpkin Pies vs Tigers — Sat, Oct 12" (game details are optional)
  function gameLabel() {
    var out = "Pumpkin Pies";
    if (state.game && state.game.opp) out += " vs " + state.game.opp;
    if (state.game && state.game.date) {
      var d = new Date(state.game.date + "T12:00:00");
      if (!isNaN(d.getTime())) {
        out += " — " + d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
      }
    }
    return out;
  }
  function updatePrintTitle() {
    var el = document.getElementById("printTitle");
    if (el) el.textContent = gameLabel();
  }

  // Plain-text version of the line-ups, ready to paste in the team chat.
  function rosterText(r) {
    var lines = [gameLabel(), ""];
    r.lineups.forEach(function (lu, i) {
      lines.push(ordinal(i, state.periods) + " — Goalie: " + (lu.goalie || "(none)"));
      lines.push("  On field: " + lu.field.join(", "));
      if (lu.sitting.length) lines.push("  Resting: " + lu.sitting.join(", "));
      lines.push("");
    });
    return lines.join("\n").trim() + "\n";
  }

  function copyRoster() {
    if (!hasRoster || !lastRoster) return;
    var text = rosterText(lastRoster);
    var btn = document.getElementById("copyBtn");
    function done(ok) {
      if (!btn) return;
      var old = "📋 Copy as text";
      btn.textContent = ok ? "✅ Copied!" : "⚠️ Couldn't copy";
      setTimeout(function () { btn.textContent = old; }, 1600);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); },
        function () { done(legacyCopy(text)); });
    } else {
      done(legacyCopy(text));
    }
  }
  function legacyCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
    return ok;
  }

  // Empty state: a clear "your move" prompt instead of a surprise roster.
  function showPrompt() {
    setHasRoster(false);
    document.getElementById("output").innerHTML =
      '<div class="panel empty-note">Pick who\'s <b>Here</b> and who can play <b>Goalie</b> above, then tap <b>⚽ Make roster</b>.</div>';
  }

  // Called after any setup edit — drop the old roster so it must be re-made.
  function settingsChanged() {
    if (hasRoster) {
      document.getElementById("output").innerHTML =
        '<div class="panel empty-note">Setup changed — tap <b>⚽ Make roster</b> to build the line-up.</div>';
      setHasRoster(false);
    }
  }

  function makeRoster(newSeed) {
    if (newSeed) state.seed = (state.seed + 1) | 0;
    if (!state.team.some(function (g) { return g.present; })) {
      document.getElementById("output").innerHTML =
        '<div class="panel empty-note">Nobody is marked “Here” yet — tap a player to add them to today\'s game.</div>';
      setHasRoster(false); save();
      return;
    }
    var r = buildRoster(state.team, state.periods, state.seed);
    renderRoster(r);
    setHasRoster(true);
    lastRoster = r;
    save();
  }

  function init() {
    // Draw the essential UI FIRST so nothing below (e.g. a stale cached HTML
    // missing a button) can ever stop the team list from rendering.
    renderPeriodButtons();
    renderTeam();
    showPrompt();

    // wire handlers defensively — a missing element is skipped, not thrown
    function on(id, handler) {
      var el = document.getElementById(id);
      if (el) el.onclick = handler;
    }

    document.querySelectorAll(".period-btn").forEach(function (b) {
      b.onclick = function () {
        state.periods = Number(b.dataset.p);
        renderPeriodButtons(); save(); settingsChanged();
      };
    });

    // one button: each tap builds a fresh fair line-up (no separate "shuffle").
    // No auto-scroll — the roster updates in place without jumping the page.
    on("generateBtn", function () { makeRoster(true); });
    on("printFab", function () {
      if (!hasRoster) return;   // disabled until a roster exists
      window.print();
    });
    on("copyBtn", copyRoster);
    on("resetBtn", function () {
      if (confirm("Reset the whole team back to the original roster?")) {
        state.team = DEFAULT_TEAM.map(function (g) { return Object.assign({}, g); });
        save(); renderTeam(); showPrompt();
      }
    });

    // team editor: add a player (button or Enter)
    on("addPlayerBtn", addPlayer);
    var newInput = document.getElementById("newPlayerInput");
    if (newInput) {
      newInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); addPlayer(); }
      });
    }

    // game-day details feed the printout title (cosmetic — no roster reset)
    var opp = document.getElementById("oppInput");
    var date = document.getElementById("dateInput");
    if (opp) {
      opp.value = (state.game && state.game.opp) || "";
      opp.addEventListener("input", function () {
        state.game.opp = opp.value.trim(); save(); updatePrintTitle();
      });
    }
    if (date) {
      date.value = (state.game && state.game.date) || "";
      date.addEventListener("input", function () {
        state.game.date = date.value; save(); updatePrintTitle();
      });
    }
    updatePrintTitle();
  }

  // ---- test hook -------------------------------------------------------
  // Lets the offline fairness checker (and Playwright) exercise the roster
  // algorithm directly, with no DOM involved. Harmless in the browser.
  if (typeof window !== "undefined") {
    window.__rosterTestHook = {
      buildRoster: buildRoster,
      FIELD: FIELD,
      ON_FIELD: ON_FIELD
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
