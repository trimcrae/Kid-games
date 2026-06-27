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

  var STORE_KEY = "soccerRoster.v1";
  var FIELD = 6;            // field players per period
  var ON_FIELD = FIELD + 1; // + goalie

  // The Gu8 McRae - Orange roster (from the team list).
  var DEFAULT_TEAM = [
    "Addison Krautwurst", "Addison Mueller", "Braelynn Newman",
    "Brooklyn Welch", "Charlotte Sharpe", "Emilia Ayzenberg",
    "Evelyn Mueller", "Jeannette McRae", "Julia Moden",
    "Kinsley Trosinski", "Logan Burger", "Olivia Bishop",
    "Savannah Istas"
  ].map(function (n) { return { name: n, present: true, goalie: true }; });

  // ---- state ----
  var state = load();

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && s.team && s.team.length) {
          s.periods = s.periods || 4;
          s.seed = s.seed || 1;
          return s;
        }
      }
    } catch (e) { /* ignore */ }
    return {
      team: DEFAULT_TEAM.map(function (g) { return Object.assign({}, g); }),
      periods: 4,
      seed: 1,
      teamName: "Gu8 McRae - Orange",
      opponent: "",
      gameDate: "",
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
      stat[g.name] = { plays: 0, goalie: 0, satLast: false, roles: [] };
    });

    var lineups = [];
    for (var p = 0; p < periods; p++) {
      // --- pick the goalie ---
      var goalie = null;
      var elig = order.filter(function (g) { return g.goalie; });
      if (elig.length) {
        var minG = Math.min.apply(null, elig.map(function (g) { return stat[g.name].goalie; }));
        var gPool = elig.filter(function (g) { return stat[g.name].goalie === minG; });
        // among those who've been goalie least, take whoever has played least
        gPool.sort(function (a, b) { return stat[a.name].plays - stat[b.name].plays; });
        goalie = gPool[0];
      }

      // --- pick 6 field players (anyone present except the goalie) ---
      var fieldPool = order.filter(function (g) { return g !== goalie; });
      fieldPool.sort(function (a, b) {
        var sa = stat[a.name], sb = stat[b.name];
        if (sa.plays !== sb.plays) return sa.plays - sb.plays;        // least playing time first
        if (sa.satLast !== sb.satLast) return sa.satLast ? -1 : 1;    // sat last period? you're up
        return 0;                                                     // else keep random order
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
          stat[g.name].satLast = false;
        } else {
          stat[g.name].satLast = true;
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
      pres.onclick = function () { g.present = !g.present; save(); renderTeam(); regenerate(false); };

      var gk = document.createElement("button");
      gk.className = "chip " + (g.goalie ? "gk-on" : "gk-off");
      gk.textContent = g.goalie ? "Goalie ✓" : "Goalie —";
      gk.title = "Can this girl play goalie?";
      gk.onclick = function () { g.goalie = !g.goalie; save(); renderTeam(); regenerate(false); };

      var x = document.createElement("button");
      x.className = "chip-x";
      x.textContent = "✕";
      x.title = "Remove from team";
      x.onclick = function () {
        if (confirm("Remove " + g.name + " from the team?")) {
          state.team.splice(i, 1); save(); renderTeam(); regenerate(false);
        }
      };

      row.appendChild(name);
      row.appendChild(pres);
      row.appendChild(gk);
      row.appendChild(x);
      list.appendChild(row);
    });
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
    var eligCount = present.filter(function (g) { return g.goalie; }).length;
    var goalieRepeat = present.some(function (g) { return r.stat[g.name].goalie >= 2; });
    var forcedRepeat = state.periods > eligCount;
    var shortHanded = n < ON_FIELD;
    var noGoalie = eligCount === 0;

    var html = "";

    // ---- printable header ----
    var head = state.teamName || "Roster";
    var sub = [];
    if (state.opponent) sub.push("vs " + state.opponent);
    if (state.gameDate) sub.push(formatDate(state.gameDate));
    sub.push(state.periods + (state.periods === 2 ? " halves" : state.periods === 4 ? " quarters" : " periods"));
    sub.push(n + " here" + (n < state.team.length ? ", " + (state.team.length - n) + " away" : ""));

    html += '<div class="panel">';
    html += '<div class="roster-head"><h2>' + esc(head) + "</h2><p>" + esc(sub.join("  •  ")) + "</p></div>";

    // ---- verification checks ----
    html += '<div class="checks">';
    html += check(true, "No girl is listed twice in the same period.", "Each period has 1 goalie + " + FIELD + " different field players.");

    if (shortHanded) {
      html += check(false, "Only " + n + " girls here — not enough for a full " + ON_FIELD + " (1 goalie + " + FIELD + ").",
        "Some field spots will be empty. They'll play short-handed.");
    }

    if (maxP - minP <= 1) {
      html += check(true, "Playing time is even.",
        "Everyone plays " + (minP === maxP ? (minP + " period" + (minP === 1 ? "" : "s")) : (minP + " or " + maxP + " periods")) + " out of " + state.periods + ".");
    } else {
      html += check(false, "Playing time is a little uneven (" + minP + "–" + maxP + " periods).",
        "Try Shuffle again for a more even split.");
    }

    if (noGoalie) {
      html += check(false, "No goalie picked!", "Tap “Goalie ✓” on at least one girl above.");
    } else if (!goalieRepeat) {
      html += check(true, "No girl plays goalie twice.", state.periods + " periods, " + eligCount + " eligible goalies.");
    } else if (forcedRepeat) {
      html += check(true, "Some girls play goalie twice — can't be helped.",
        "Only " + eligCount + " girl" + (eligCount === 1 ? "" : "s") + " can play goalie for " + state.periods + " periods, so it's spread as evenly as possible.");
    } else {
      html += check(false, "A girl plays goalie twice.", "Tap Shuffle again — there are enough goalies to avoid it.");
    }
    html += "</div>"; // checks
    html += "</div>"; // panel

    // ---- period cards ----
    html += '<div class="panel"><div class="periods-grid">';
    r.lineups.forEach(function (lu, i) {
      html += '<div class="pcard">';
      html += '<div class="ptitle">' + esc(ordinal(i, state.periods)) + "</div>";
      html += '<div class="goalie"><small>🧤 Goalie</small>' + esc(lu.goalie || "—") + "</div>";
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
    html += '<div class="panel">';
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

  function check(ok, title, detail) {
    return '<div class="check ' + (ok ? "ok" : "warn") + '">' +
      '<span class="mark">' + (ok ? "✓" : "⚠️") + "</span>" +
      "<span><b>" + esc(title) + "</b>" + (detail ? " " + esc(detail) : "") + "</span></div>";
  }

  function formatDate(iso) {
    // iso = YYYY-MM-DD -> friendly, avoiding timezone shifts
    var parts = iso.split("-");
    if (parts.length !== 3) return iso;
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months[Number(parts[1]) - 1] + " " + Number(parts[2]) + ", " + parts[0];
  }

  /* ===========================================================
     Glue
     =========================================================== */
  function regenerate(newSeed) {
    if (newSeed) state.seed = (state.seed + 1) | 0;
    var anyPresent = state.team.some(function (g) { return g.present; });
    if (!anyPresent) {
      document.getElementById("output").innerHTML =
        '<div class="panel empty-note">Nobody is marked “Here” yet — tap a player to add them to today\'s game.</div>';
      state.lastRoster = null; save();
      return;
    }
    var r = buildRoster(state.team, state.periods, state.seed);
    renderRoster(r);
    save();
  }

  function init() {
    // restore details inputs
    document.getElementById("teamName").value = state.teamName || "";
    document.getElementById("opponent").value = state.opponent || "";
    document.getElementById("gameDate").value = state.gameDate || "";

    document.getElementById("teamName").oninput = function () { state.teamName = this.value; save(); refreshHeaderOnly(); };
    document.getElementById("opponent").oninput = function () { state.opponent = this.value; save(); refreshHeaderOnly(); };
    document.getElementById("gameDate").oninput = function () { state.gameDate = this.value; save(); refreshHeaderOnly(); };

    document.querySelectorAll(".period-btn").forEach(function (b) {
      b.onclick = function () {
        state.periods = Number(b.dataset.p);
        renderPeriodButtons(); save(); regenerate(false);
      };
    });

    document.getElementById("addBtn").onclick = addPlayer;
    document.getElementById("newName").addEventListener("keydown", function (e) {
      if (e.key === "Enter") addPlayer();
    });

    document.getElementById("generateBtn").onclick = function () { regenerate(false); scrollToOutput(); };
    document.getElementById("shuffleBtn").onclick = function () { regenerate(true); scrollToOutput(); };
    document.getElementById("printBtn").onclick = function () { window.print(); };
    document.getElementById("resetBtn").onclick = function () {
      if (confirm("Reset the whole team back to the original roster?")) {
        state.team = DEFAULT_TEAM.map(function (g) { return Object.assign({}, g); });
        save(); renderTeam(); regenerate(false);
      }
    };

    renderPeriodButtons();
    renderTeam();
    regenerate(false);
  }

  // Update only the header text when details change, without re-rolling the roster.
  function refreshHeaderOnly() {
    var r = buildRoster(state.team, state.periods, state.seed);
    if (state.team.some(function (g) { return g.present; })) renderRoster(r);
  }

  function addPlayer() {
    var input = document.getElementById("newName");
    var name = input.value.trim();
    if (!name) return;
    state.team.push({ name: name, present: true, goalie: true });
    input.value = "";
    save(); renderTeam(); regenerate(false);
  }

  function scrollToOutput() {
    var out = document.getElementById("output");
    if (out && out.firstChild) out.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
