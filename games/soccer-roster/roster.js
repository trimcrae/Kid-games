/* ===========================================================
   Soccer Roster Maker
   -----------------------------------------------------------
   Builds fair line-ups for a 2 / 4 / 8 period game:
     • 1 goalie + 6 field players each period
     • playing time split as evenly as the maths allows
     • goalies rotate (no repeats until everyone eligible
       has had a turn)
     • late arrivals only share out the periods they are here for
   The squad, the game details and the last line-up you made are
   all kept in localStorage so Shannon never retypes the team.
   =========================================================== */

(function () {
  "use strict";

  var STORE_KEY = "soccerRoster.v3";
  var FIELD = 6;            // field players per period
  var ON_FIELD = FIELD + 1; // + goalie
  var DEFAULT_MINS = 48;    // whole-game length in minutes

  // The Gu8 McRae - Orange roster (from the team list).
  var DEFAULT_TEAM = [
    "Addison K", "Addison M", "Braelynn",
    "Brooklyn", "Charlotte", "Emilia",
    "Evelyn", "Jeannie", "Julia",
    "Kinsley", "Logan", "Olivia",
    "Savannah"
  ].map(function (n) { return { name: n, present: true, gk: "yes", from: 0 }; });
  // gk: "yes" = can play goalie, "must" = has to play goalie, "no" = never goalie
  // from: index of the first period she is available for (late arrivals)

  // ---- state ----
  var state = load();

  function blankGame() { return { opp: "", date: "", mins: DEFAULT_MINS }; }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && s.team && s.team.length) {
          s.seed = s.seed || 1;
          s.game = s.game || blankGame();
          if (!(Number(s.game.mins) > 0)) s.game.mins = DEFAULT_MINS;
          // Per-GAME choices start clean on every load: goalie duty and late
          // arrivals belong to one Saturday morning, not to the squad list.
          // (Who is here does stick, so a mid-game reload keeps your absences.)
          var seen = {};
          s.team = s.team.filter(function (g) {
            if (!g || typeof g.name !== "string" || !g.name.trim()) return false;
            var key = g.name.trim().toLowerCase();
            if (seen[key]) return false;      // names key the roster: no duplicates
            seen[key] = true;
            g.name = g.name.trim();
            g.gk = "yes";
            g.from = 0;
            g.present = g.present !== false;
            delete g.goalie;                  // migrate the old goalie:true/false field
            return true;
          });
          if (!s.team.length) throw new Error("empty squad");
          // Always open on 8 periods — unless we are putting a saved line-up
          // back on screen, in which case the buttons must match the sheet.
          s.saved = validSaved(s.saved);
          s.periods = s.saved ? s.saved.periods : 8;
          return s;
        }
      }
    } catch (e) { /* ignore */ }
    return {
      team: DEFAULT_TEAM.map(function (g) { return Object.assign({}, g); }),
      periods: 8,
      seed: 1,
      game: blankGame(),
      saved: null
    };
  }

  // A saved line-up is stored as its INPUTS (squad snapshot + periods + seed),
  // so re-running the builder reproduces exactly the sheet you printed.
  function validSaved(s) {
    if (!s || !s.team || !s.team.length) return null;
    if ([2, 4, 8].indexOf(s.periods) === -1) return null;
    if (typeof s.seed !== "number") return null;
    return s;
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

  function byName(a, b) { return a.localeCompare(b); }

  /* ===========================================================
     The roster algorithm — fair by construction, not by luck.
     -----------------------------------------------------------
     1. QUOTAS. Work out up front exactly how many periods each
        girl is owed. They can only ever differ by one, a late
        arrival is only counted for the periods she is here for,
        and a girl who will have to keep goal a lot (because
        hardly anyone else can) is owed at least that much.
     2. LINE-UPS. Fill each period with the girls who are furthest
        behind their quota, measured against the chances they have
        LEFT — so nobody runs out of periods to catch up in. A girl
        who just came off goes back on first, which is what keeps
        rests from clumping into "sat out twice in a row".
     3. KEEPERS. Only now pick the goalies, and only from the girls
        already on the pitch — so keeping goal never costs anyone
        an extra period. It is solved as a proper matching, so if a
        no-repeat rotation exists it is found, and every "★ must be
        goalie" girl is placed first.
     4. Two repair passes even out anything the greedy missed and
        break up any back-to-back rests.
     =========================================================== */

  // Index of the first period this girl can play (late arrivals).
  function firstPeriod(g, periods) {
    var f = Math.round(Number(g && g.from) || 0);
    if (!(f > 0)) return 0;
    return Math.min(f, periods - 1);   // she always gets at least the last period
  }

  // How many periods each girl is owed, given who is here when.
  function quotas(availCount, onCount, floors) {
    var n = availCount.length, i, t = [], frac = [];
    if (!n) return t;
    var slots = onCount.reduce(function (a, b) { return a + b; }, 0);
    var weight = availCount.reduce(function (a, b) { return a + b; }, 0);

    for (i = 0; i < n; i++) {
      var share = weight ? slots * availCount[i] / weight : 0;
      t.push(Math.floor(share));
      frac.push(share - Math.floor(share));
    }
    // hand the leftover periods to the biggest fractions (largest remainder)
    var byFrac = [];
    for (i = 0; i < n; i++) byFrac.push(i);
    byFrac.sort(function (a, b) { return frac[b] - frac[a] || a - b; });
    var used = t.reduce(function (a, b) { return a + b; }, 0);
    for (var k = 0; k < byFrac.length && used < slots; k++) {
      var j = byFrac[k];
      if (t[j] < availCount[j]) { t[j]++; used++; }
    }
    // nobody plays more than she is here for, or less than her forced goalie duty
    for (i = 0; i < n; i++) {
      if (t[i] < floors[i]) t[i] = floors[i];
      if (t[i] > availCount[i]) t[i] = availCount[i];
    }
    // ...then nudge back to the exact number of slots on offer
    var loops = n * 4 + 20;
    while (loops-- > 0) {
      used = t.reduce(function (a, b) { return a + b; }, 0);
      if (used === slots) break;
      var pick = -1;
      if (used < slots) {
        for (i = 0; i < n; i++) {
          if (t[i] >= availCount[i]) continue;
          if (pick < 0 || t[i] * availCount[pick] < t[pick] * availCount[i]) pick = i;
        }
        if (pick < 0) break;
        t[pick]++;
      } else {
        for (i = 0; i < n; i++) {
          if (t[i] <= floors[i]) continue;
          if (pick < 0 || t[i] * availCount[pick] > t[pick] * availCount[i]) pick = i;
        }
        if (pick < 0) break;
        t[pick]--;
      }
    }
    return t;
  }

  // Safety net 1: swap a girl who ended up with too much time for one with
  // too little, in a period where that swap is actually possible.
  function balance(roles, played, target, periods, locked) {
    var n = played.length, guard = n * periods + 20;
    while (guard-- > 0) {
      var over = -1, under = -1, i;
      for (i = 0; i < n; i++) {
        if (played[i] > target[i] && (over < 0 || played[i] - target[i] > played[over] - target[over])) over = i;
        if (played[i] < target[i] && (under < 0 || target[i] - played[i] > target[under] - played[under])) under = i;
      }
      if (over < 0 || under < 0) break;
      var swapped = false;
      for (var p = 0; p < periods && !swapped; p++) {
        if (roles[over][p] !== "F") continue;
        if (locked && locked[over + ":" + p]) continue;
        if (roles[under][p] !== "-") continue;   // she has to be here and on the bench
        roles[over][p] = "-"; roles[under][p] = "F";
        played[over]--; played[under]++;
        swapped = true;
      }
      if (!swapped) break;
    }
  }

  // Safety net 2: nobody should sit two periods running while someone else
  // plays both. Swaps in pairs, so the playing-time totals never move.
  function spread(roles, periods, locked) {
    var n = roles.length, i, j, p, q, hole;

    function restsAt(x, at) { return at >= 0 && at < periods && roles[x][at] === "-"; }
    // a girl seated so she can keep goal must not be moved back off again
    function pinned(x, at) { return !!(locked && locked[x + ":" + at]); }
    // moving j off at "at" must not leave her sitting twice in a row either
    function safeOff(j, at) { return !restsAt(j, at - 1) && !restsAt(j, at + 1); }

    for (i = 0; i < n; i++) {
      for (p = 1; p < periods; p++) {
        if (roles[i][p] !== "-" || roles[i][p - 1] !== "-") continue;
        // try to put her on in either of the two periods she is sitting out
        for (var t = 0; t < 2 && roles[i][p] === "-" && roles[i][p - 1] === "-"; t++) {
          hole = t === 0 ? p : p - 1;
          for (j = 0; j < n; j++) {
            if (j === i || roles[j][hole] !== "F" || !safeOff(j, hole)) continue;
            if (pinned(j, hole)) continue;
            for (q = 0; q < periods; q++) {   // ...and swap back so totals hold
              if (q === hole || roles[i][q] !== "F" || roles[j][q] !== "-") continue;
              if (!safeOff(i, q) || pinned(i, q)) continue;
              roles[i][hole] = "F"; roles[j][hole] = "-";
              roles[j][q] = "F"; roles[i][q] = "-";
              break;
            }
            if (roles[i][hole] === "F") break;
          }
        }
      }
    }
  }

  // Give every period a keeper, chosen from the girls already on the pitch.
  // Augmenting-path matching: if a legal rotation exists, this finds it.
  function matchKeepers(pool, cap, slot, used, periods) {
    function tryOne(p, seen) {
      for (var k = 0; k < pool[p].length; k++) {
        var i = pool[p][k];
        if (seen[i]) continue;
        seen[i] = true;
        if ((used[i] || 0) < cap[i]) { slot[p] = i; used[i] = (used[i] || 0) + 1; return true; }
        for (var q = 0; q < periods; q++) {          // ask whoever has it to move
          if (slot[q] !== i) continue;
          slot[q] = -1;
          if (tryOne(q, seen)) { slot[p] = i; return true; }
          slot[q] = i;
        }
      }
      return false;
    }
    for (var p = 0; p < periods; p++) if (slot[p] === -1) tryOne(p, {});
    return slot;
  }

  function buildRoster(team, periods, seed) {
    periods = Math.max(1, Math.round(Number(periods) || 1));
    var present = (team || []).filter(function (g) { return g && g.present; });
    var rng = mulberry32(Number(seed) || 1);
    var order = shuffle(present.slice(), rng);   // this game's rotation order
    var n = order.length;
    var i, p, k;

    var first = order.map(function (g) { return firstPeriod(g, periods); });
    var availCount = first.map(function (f) { return periods - f; });
    var keeper = order.map(function (g) { return g.gk !== "no"; });
    var elig = [];
    for (i = 0; i < n; i++) if (keeper[i]) elig.push(i);

    // how many girls take the pitch each period (a short squad plays short)
    var onCount = [];
    for (p = 0; p < periods; p++) {
      var here = 0;
      for (i = 0; i < n; i++) if (first[i] <= p) here++;
      onCount.push(Math.min(here, elig.length ? ON_FIELD : FIELD));
    }

    // If only one or two girls will go in goal they are forced onto the pitch
    // far more often than a fair share — the quota has to know that up front.
    var floors = [], cap = [];
    for (i = 0; i < n; i++) { floors.push(0); cap.push(0); }
    if (elig.length) {
      var per = Math.floor(periods / elig.length);
      elig.forEach(function (ix) {
        floors[ix] = Math.min(per, availCount[ix]);
        cap[ix] = Math.ceil(periods / elig.length);
      });
    }

    var target = quotas(availCount, onCount, floors);

    // ---- fill the periods ----
    var played = [], rest = [], roles = [];
    for (i = 0; i < n; i++) { played.push(0); rest.push(0); roles.push([]); }

    for (p = 0; p < periods; p++) {
      var left = periods - p;
      var owed = [], tier = [];
      for (i = 0; i < n; i++) {
        owed[i] = target[i] - played[i];
        // 0 = has to play now or she runs out of periods to catch up in
        // 1 = still owed time      2 = already had her full share
        tier[i] = owed[i] >= left ? 0 : owed[i] > 0 ? 1 : 2;
      }
      var cand = [];
      for (i = 0; i < n; i++) if (first[i] <= p) cand.push(i);
      cand.sort(function (a, b) {
        if (tier[a] !== tier[b]) return tier[a] - tier[b];
        // she just came off? put her back on — this is what spaces the rests
        if (tier[a] === 1 && rest[a] !== rest[b]) return rest[b] - rest[a];
        if (owed[a] !== owed[b]) return owed[b] - owed[a];
        if (rest[a] !== rest[b]) return rest[b] - rest[a];
        return a - b;                                // else rotation order
      });

      for (i = 0; i < n; i++) roles[i][p] = first[i] > p ? "x" : "-";
      for (k = 0; k < onCount[p] && k < cand.length; k++) roles[cand[k]][p] = "F";
      for (i = 0; i < n; i++) {
        if (roles[i][p] === "F") { played[i]++; rest[i] = 0; }
        else if (roles[i][p] === "-") rest[i]++;
      }
    }

    var locked = {};
    balance(roles, played, target, periods, locked);
    spread(roles, periods, locked);

    // ---- make sure every ★ must-be-goalie girl is on the pitch in a period
    //      that can still be hers. Swaps come in pairs, so seating her costs
    //      nobody any playing time. ----
    var musts = elig.filter(function (ix) { return order[ix].gk === "must"; });
    if (musts.length) {
      var mCap = [];
      for (i = 0; i < n; i++) mCap.push(order[i].gk === "must" ? 1 : 0);
      for (var pass = 0; pass <= musts.length; pass++) {
        var mPool = [], mSlot = [], mUsed = {};
        for (p = 0; p < periods; p++) {
          mSlot.push(-1);
          mPool.push(musts.filter(function (ix) { return roles[ix][p] === "F"; }));
        }
        matchKeepers(mPool, mCap, mSlot, mUsed, periods);
        var stuck = musts.filter(function (ix) { return !mUsed[ix]; });
        if (!stuck.length) break;
        var m = stuck[0], seated = false, x, q;
        for (p = 0; p < periods && !seated; p++) {
          if (roles[m][p] !== "-" || mSlot[p] !== -1) continue;
          for (x = 0; x < n && !seated; x++) {
            if (roles[x][p] !== "F" || order[x].gk === "must") continue;
            for (q = 0; q < periods; q++) {      // swap back, so the totals hold
              if (q === p || roles[m][q] !== "F" || roles[x][q] !== "-") continue;
              roles[m][p] = "F"; roles[x][p] = "-";
              roles[x][q] = "F"; roles[m][q] = "-";
              locked[m + ":" + p] = 1;
              seated = true; break;
            }
          }
        }
        // she never gets on at all (a huge squad, two halves): give her one
        // period from whoever has the most — still within one period of fair
        for (p = 0; p < periods && !seated; p++) {
          if (roles[m][p] !== "-" || mSlot[p] !== -1) continue;
          var give = -1;
          for (x = 0; x < n; x++) {
            if (roles[x][p] !== "F" || order[x].gk === "must") continue;
            if (played[x] <= played[m]) continue;
            if (give < 0 || played[x] > played[give]) give = x;
          }
          if (give < 0) continue;
          roles[m][p] = "F"; roles[give][p] = "-";
          played[m]++; played[give]--;
          locked[m + ":" + p] = 1;
          seated = true;
        }
        if (!seated) break;   // genuinely impossible — the warning banner says so
        spread(roles, periods, locked);   // tidy any rests that swap clumped up
      }
    }

    // ---- keepers: always someone who is already playing that period ----
    var slot = [], used = {};
    for (p = 0; p < periods; p++) slot.push(-1);
    if (elig.length) {
      var onPitch = [];
      for (p = 0; p < periods; p++) {
        // a period with nobody who can go in goal: bring the best keeper on for
        // whoever has had the most time (rare — it needs almost no volunteers)
        var any = elig.filter(function (ix) { return roles[ix][p] === "F"; });
        if (!any.length) {
          var inn = -1, out = -1;
          elig.forEach(function (ix) {
            if (roles[ix][p] !== "-") return;
            if (inn < 0 || played[ix] < played[inn]) inn = ix;
          });
          for (i = 0; i < n; i++) {
            if (roles[i][p] !== "F") continue;
            if (out < 0 || played[i] > played[out]) out = i;
          }
          if (inn >= 0 && out >= 0) {
            roles[inn][p] = "F"; roles[out][p] = "-";
            played[inn]++; played[out]--;
            any = [inn];
          }
        }
        onPitch.push(any);
      }
      // greedy first (fewest turns, longest since her last), so it reads nicely
      var turns = {}, lastAt = {};
      var musts = elig.filter(function (ix) { return order[ix].gk === "must"; });
      if (musts.length) {
        // ★ must-be-goalie girls are placed first and keep their slot
        var mustPool = onPitch.map(function (list) {
          return list.filter(function (ix) { return order[ix].gk === "must"; });
        });
        var mustCap = [];
        for (i = 0; i < n; i++) mustCap.push(order[i].gk === "must" ? 1 : 0);
        matchKeepers(mustPool, mustCap, slot, used, periods);
      }
      for (p = 0; p < periods; p++) {
        if (slot[p] !== -1) { turns[slot[p]] = (turns[slot[p]] || 0) + 1; lastAt[slot[p]] = p; }
      }
      for (p = 0; p < periods; p++) {
        if (slot[p] !== -1) continue;
        var pool = onPitch[p].filter(function (ix) { return (used[ix] || 0) < cap[ix]; });
        if (!pool.length) continue;
        pool.sort(function (a, b) {
          var ta = turns[a] || 0, tb = turns[b] || 0;
          if (ta !== tb) return ta - tb;                       // never twice before everyone once
          var la = lastAt[a] === undefined ? -99 : lastAt[a];
          var lb = lastAt[b] === undefined ? -99 : lastAt[b];
          if (la !== lb) return la - lb;                       // longest since her last turn
          return a - b;
        });
        slot[p] = pool[0];
        used[pool[0]] = (used[pool[0]] || 0) + 1;
        turns[pool[0]] = (turns[pool[0]] || 0) + 1;
        lastAt[pool[0]] = p;
      }
      // anything the greedy could not fill gets solved properly, and only then
      // do we allow a girl a second turn before everyone has had one
      var tries = periods + 2;
      while (tries-- > 0 && slot.indexOf(-1) !== -1) {
        matchKeepers(onPitch, cap, slot, used, periods);
        if (slot.indexOf(-1) === -1) break;
        for (i = 0; i < n; i++) if (keeper[i]) cap[i]++;
      }
      for (p = 0; p < periods; p++) if (slot[p] !== -1) roles[slot[p]][p] = "G";
    }

    // ---- read the finished grid back out ----
    var lineups = [], stat = {};
    for (p = 0; p < periods; p++) {
      var gName = null, field = [], sitting = [], waiting = [];
      for (i = 0; i < n; i++) {
        if (roles[i][p] === "G") gName = order[i].name;
        else if (roles[i][p] === "F") field.push(order[i].name);
        else if (roles[i][p] === "x") waiting.push(order[i].name);
        else sitting.push(order[i].name);
      }
      lineups.push({
        goalie: gName,
        field: field.sort(byName),
        sitting: sitting.sort(byName),
        waiting: waiting.sort(byName)
      });
    }
    order.forEach(function (g, ix) {
      var gk = 0, pl = 0;
      roles[ix].forEach(function (r) { if (r === "G") { gk++; pl++; } else if (r === "F") pl++; });
      stat[g.name] = {
        plays: pl, goalie: gk, roles: roles[ix],
        target: target[ix], avail: availCount[ix], from: first[ix]
      };
    });

    return {
      lineups: lineups, stat: stat, present: present, periods: periods,
      onCount: onCount, order: order.map(function (g) { return g.name; })
    };
  }

  /* ===========================================================
     Rendering
     =========================================================== */
  function periodWord(periods, plural) {
    var w = periods === 2 ? "half" : periods === 4 ? "quarter" : "period";
    if (!plural) return w;
    return periods === 2 ? "halves" : w + "s";
  }

  function ordinal(i, periods) {
    var word = periodWord(periods);
    var names = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];
    var w = word.charAt(0).toUpperCase() + word.slice(1);
    return (names[i] || (i + 1) + ".") + " " + w;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  // ---- the maths bit the kids can read: 6 of 8 periods = ¾ of the game ----
  var NICE_FRACTION = {
    "1/2": "½", "1/3": "⅓", "2/3": "⅔", "1/4": "¼", "3/4": "¾",
    "1/5": "⅕", "2/5": "⅖", "3/5": "⅗", "4/5": "⅘",
    "1/6": "⅙", "5/6": "⅚", "1/8": "⅛", "3/8": "⅜", "5/8": "⅝", "7/8": "⅞"
  };
  function fraction(num, den) {
    if (!den) return "";
    if (num === 0) return "0";
    if (num >= den) return "the whole game";
    var a = num, b = den, t;
    while (b) { t = a % b; a = b; b = t; }
    var key = (num / a) + "/" + (den / a);
    return NICE_FRACTION[key] || key;
  }

  function gameMins() {
    var m = Number(state.game && state.game.mins);
    return m > 0 ? m : DEFAULT_MINS;
  }
  function minutesFor(plays, periods) {
    return Math.round(plays * gameMins() / periods);
  }

  function renderTeam() {
    var list = document.getElementById("teamList");
    if (!list) return;
    list.innerHTML = "";
    state.team.forEach(function (g, i) {
      var row = document.createElement("div");
      row.className = "player-row" + (g.present ? "" : " away");
      row.setAttribute("role", "listitem");

      var name = document.createElement("span");
      name.className = "pname";
      name.textContent = g.name;

      var pres = document.createElement("button");
      pres.type = "button";
      pres.className = "chip " + (g.present ? "present" : "absent");
      pres.textContent = g.present ? "Here" : "Away";
      pres.title = "Tap to mark here / away today";
      pres.setAttribute("aria-pressed", g.present ? "true" : "false");
      pres.setAttribute("aria-label", g.name + (g.present ? " is here today" : " is away today"));
      pres.onclick = function () {
        g.present = !g.present;
        if (g.present === false) g.from = 0;
        save(); renderTeam(); settingsChanged();
      };

      var gk = document.createElement("button");
      gk.type = "button";
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
      gk.setAttribute("aria-label", g.name + ": " + label + (g.present ? ". Tap to change." : ""));
      gk.onclick = function () {
        if (!g.present) return;
        g.gk = g.gk === "yes" ? "must" : g.gk === "must" ? "no" : "yes";
        save(); renderTeam(); settingsChanged();
      };

      var controls = document.createElement("div");
      controls.className = "player-controls";
      controls.appendChild(pres);
      controls.appendChild(gk);

      // late arrival: "on from the 2nd quarter" etc. Only worth showing for a
      // girl who is here, and only when the game has more than one period.
      if (g.present && state.periods > 1) {
        var lateWrap = document.createElement("label");
        lateWrap.className = "late" + (Number(g.from) > 0 ? " is-late" : "");
        var lateTxt = document.createElement("span");
        lateTxt.textContent = "⏱ On from";
        var sel = document.createElement("select");
        sel.setAttribute("aria-label", "First " + periodWord(state.periods) + " " + g.name + " can play");
        for (var q = 0; q < state.periods; q++) {
          var opt = document.createElement("option");
          opt.value = String(q);
          opt.textContent = q === 0 ? "the start" : ordinal(q, state.periods);
          if (Number(g.from) === q) opt.selected = true;
          sel.appendChild(opt);
        }
        sel.onchange = function () {
          g.from = Number(sel.value) || 0;
          save(); renderTeam(); settingsChanged();
        };
        lateWrap.appendChild(lateTxt);
        lateWrap.appendChild(sel);
        controls.appendChild(lateWrap);
      }

      var rm = document.createElement("button");
      rm.type = "button";
      rm.className = "rm-btn";
      rm.textContent = "✕";
      rm.title = "Remove " + g.name + " from the team";
      rm.setAttribute("aria-label", "Remove " + g.name + " from the team");
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
      row.appendChild(controls);  // Here / goalie / late below it
      list.appendChild(row);
    });
    renderSquadCount();
  }

  function renderSquadCount() {
    var el = document.getElementById("squadCount");
    if (!el) return;
    var here = state.team.filter(function (g) { return g.present; }).length;
    var away = state.team.length - here;
    el.textContent = here + " here" + (away ? " · " + away + " away" : "") +
      (here && here < ON_FIELD ? " (need " + ON_FIELD + ")" : "");
  }

  // A coach can paste "Ellie, Jeannie, Cory" or a whole pasted column of names.
  function addPlayer() {
    var input = document.getElementById("newPlayerInput");
    if (!input) return;
    var names = input.value.split(/[,\n\r\t;]+/)
      .map(function (s) { return s.replace(/\s+/g, " ").trim(); })
      .filter(Boolean);
    if (!names.length) { input.focus(); return; }
    var added = 0, dupes = [];
    names.forEach(function (name) {
      if (name.length > 20) name = name.slice(0, 20).trim();
      var dupe = state.team.some(function (g) { return g.name.toLowerCase() === name.toLowerCase(); });
      if (dupe) { dupes.push(name); return; }
      state.team.push({ name: name, present: true, gk: "yes", from: 0 });
      added++;
    });
    if (!added && dupes.length) {
      alert(dupes.join(", ") + (dupes.length === 1 ? " is" : " are") + " already on the team.");
      input.select();
      return;
    }
    input.value = dupes.length ? dupes.join(", ") : "";
    input.focus();
    save(); renderTeam(); settingsChanged();
  }

  function renderPeriodButtons() {
    document.querySelectorAll(".period-btn").forEach(function (b) {
      var on = Number(b.dataset.p) === state.periods;
      b.classList.toggle("active", on);
      b.setAttribute("aria-checked", on ? "true" : "false");
      b.tabIndex = on ? 0 : -1;
    });
    var hint = document.getElementById("periodHint");
    if (hint) {
      var each = Math.round(gameMins() / state.periods);
      hint.textContent = "1 goalie + " + FIELD + " field players each " +
        periodWord(state.periods) + " · about " + each + " min each.";
    }
  }

  function renderRoster(r) {
    var out = document.getElementById("output");
    if (!out) return;
    if (!r) { out.innerHTML = ""; return; }

    var periods = r.periods;
    var present = r.present;
    var n = present.length;
    var mins = gameMins();

    // ---- verification facts ----
    var plays = present.map(function (g) { return r.stat[g.name].plays; });
    var minP = Math.min.apply(null, plays), maxP = Math.max.apply(null, plays);
    var eligCount = present.filter(function (g) { return g.gk !== "no"; }).length;
    var gkTurns = present.map(function (g) { return r.stat[g.name].goalie; });
    var goalieRepeat = Math.max.apply(null, gkTurns) >= 2;
    var forcedRepeat = periods > eligCount;
    var shortHanded = n < ON_FIELD;
    var noGoalie = eligCount === 0;
    var anyLate = present.some(function (g) { return r.stat[g.name].from > 0; });
    var mustMissed = present.filter(function (g) { return g.gk === "must" && r.stat[g.name].goalie === 0; });
    var offTarget = present.filter(function (g) { return r.stat[g.name].plays !== r.stat[g.name].target; });

    var html = "";

    // ---- at-a-glance fairness summary ----
    if (!noGoalie && !shortHanded) {
      var playsTxt = minP === maxP ? String(minP) : minP + " or " + maxP;
      var minsTxt = minP === maxP ? minutesFor(minP, periods) + " min"
        : minutesFor(minP, periods) + "–" + minutesFor(maxP, periods) + " min";
      var gkOrder = r.lineups.map(function (lu) { return lu.goalie; }).filter(Boolean);
      html += '<div class="panel fair-note no-print">' +
        '<span class="fair-bit"><span class="mark" aria-hidden="true">💚</span><span>Everyone here plays <b>' +
        playsTxt + " of " + periods + "</b> " + periodWord(periods, true) +
        " — about <b>" + minsTxt + '</b></span></span>' +
        '<span class="fair-bit"><span class="mark" aria-hidden="true">🧤</span><span>Goalie order: <b>' +
        esc(gkOrder.join(" → ")) + "</b></span></span></div>";
    }

    // ---- only flag real problems (no "all good" reassurance clutter) ----
    var warns = [];
    if (noGoalie) warns.push("No goalie picked — set at least one girl to “Can be goalie”.");
    if (shortHanded) warns.push("Only " + n + " here — not enough for 1 goalie + " + FIELD + ", so some spots are open.");
    if (mustMissed.length) warns.push((mustMissed.length === 1 ? mustMissed[0].name + " is" : mustMissed.map(function (g) { return g.name; }).join(", ") + " are") + " set to “Must be goalie”, but there aren’t enough " + periodWord(periods, true) + " to fit everyone.");
    if (!anyLate && maxP - minP > 1) warns.push("Playing time is uneven (" + minP + "–" + maxP + ") — tap Shuffle for another mix.");
    if (anyLate && offTarget.length) warns.push("Playing time could not be shared out exactly — tap Shuffle for another mix.");
    if (!noGoalie && goalieRepeat && !forcedRepeat) warns.push("A girl plays goalie twice — tap Shuffle for another mix.");
    if (warns.length) {
      html += '<div class="panel warn-panel no-print" role="alert">';
      warns.forEach(function (w) {
        html += '<div class="check warn"><span class="mark" aria-hidden="true">⚠️</span><span>' + esc(w) + "</span></div>";
      });
      html += "</div>";
    }

    // ---- period cards (this is what gets printed) ----
    html += '<div class="panel"><div class="periods-grid">';
    r.lineups.forEach(function (lu, i) {
      html += '<div class="pcard">';
      html += '<div class="ptitle">' + esc(ordinal(i, periods)) + "</div>";
      html += '<div class="goalie"><small><span class="gk-emoji" aria-hidden="true">🧤</span> Goalie</small>' + esc(lu.goalie || "—") + "</div>";
      html += "<ol>";
      lu.field.forEach(function (name) { html += "<li>" + esc(name) + "</li>"; });
      // pad empty field spots if short-handed
      for (var k = lu.field.length; k < FIELD; k++) html += '<li class="open">(open spot)</li>';
      html += "</ol>";
      if (lu.sitting.length) {
        html += '<div class="sit">Resting: ' + esc(lu.sitting.join(", ")) + "</div>";
      }
      if (lu.waiting.length) {
        html += '<div class="sit">Not here yet: ' + esc(lu.waiting.join(", ")) + "</div>";
      }
      html += "</div>";
    });
    html += "</div>";

    // one compact print-only line so the paper sheet carries the totals too
    var totalsLine = present.slice().sort(function (a, b) { return byName(a.name, b.name); })
      .map(function (g) { return g.name + " " + r.stat[g.name].plays; }).join(" · ");
    html += '<div class="print-totals">' + esc(periodWord(periods, true).replace(/^./, function (c) { return c.toUpperCase(); })) +
      " played — " + esc(totalsLine) + "</div>";
    html += "</div>";

    // ---- fair-share cards: the fractions bit ----
    html += '<div class="panel share-panel no-print"><h2>📊 Fair share</h2>';
    html += '<p class="hint">' + esc(gameMins()) + "-minute game ÷ " + periods + " " + periodWord(periods, true) +
      " = about " + Math.round(mins / periods) + " minutes each " + periodWord(periods) + ".</p>";
    html += '<ul class="shares">';
    present.slice().sort(function (a, b) { return byName(a.name, b.name); }).forEach(function (g) {
      var st = r.stat[g.name];
      var pct = Math.round(100 * st.plays / periods);
      html += '<li class="share"><span class="sh-name">' + esc(g.name) + "</span>" +
        '<span class="sh-bar" aria-hidden="true"><i style="width:' + pct + '%"></i></span>' +
        '<span class="sh-num">' + st.plays + " of " + periods + "</span>" +
        '<span class="sh-frac">' + esc(fraction(st.plays, periods)) + "</span>" +
        '<span class="sh-min">' + minutesFor(st.plays, periods) + " min</span>" +
        (st.goalie ? '<span class="sh-gk" title="Goalie turns">🧤×' + st.goalie + "</span>" : "") +
        "</li>";
    });
    html += "</ul></div>";

    // ---- verification grid ----
    html += '<div class="panel grid-panel no-print">';
    html += "<h2>✅ Double-check grid</h2>";
    html += '<p class="hint">Each column = one ' + periodWord(periods) + '. Scan down: every column should have exactly one 🧤 and ' + FIELD + " ●. Scan across each row to see who plays when, and the totals on the right.</p>";
    html += '<div class="grid-scroll"><table class="gridtbl"><caption class="sr-only">Who plays in each ' +
      periodWord(periods) + "</caption><thead><tr><th scope=\"col\">Player</th>";
    for (var p = 0; p < periods; p++) html += '<th scope="col">' + (p + 1) + "</th>";
    html += '<th scope="col">Plays</th><th scope="col"><span aria-hidden="true">🧤</span><span class="sr-only">Goalie turns</span></th></tr></thead><tbody>';

    // alphabetical, present girls first then away
    var rows = state.team.slice().sort(function (a, b) {
      var sa = r.stat[a.name], sb = r.stat[b.name];
      if (!!sa !== !!sb) return sa ? -1 : 1;
      return byName(a.name, b.name);
    });
    rows.forEach(function (g) {
      var st = r.stat[g.name];
      html += "<tr" + (st ? "" : ' class="away"') + '><th scope="row" class="name">' + esc(g.name) + "</th>";
      for (var pp = 0; pp < periods; pp++) {
        if (!st) { html += '<td class="s">—</td>'; continue; }
        var role = st.roles[pp];
        if (role === "G") html += '<td class="g"><span aria-hidden="true">🧤</span><span class="sr-only">goalie</span></td>';
        else if (role === "F") html += '<td class="f"><span aria-hidden="true">●</span><span class="sr-only">on</span></td>';
        else if (role === "x") html += '<td class="s"><span aria-hidden="true">·</span><span class="sr-only">not here yet</span></td>';
        else html += '<td class="s"><span aria-hidden="true">·</span><span class="sr-only">resting</span></td>';
      }
      if (st) {
        html += '<td class="total">' + st.plays + "</td><td>" + (st.goalie || "") + "</td>";
      } else {
        html += '<td class="s">—</td><td class="s">—</td>';
      }
      html += "</tr>";
    });
    html += "</tbody><tfoot>";

    // column totals row
    html += '<tr class="totals"><th scope="row" class="name">On the pitch</th>';
    for (var c = 0; c < periods; c++) {
      var pc = r.lineups[c].field.length + (r.lineups[c].goalie ? 1 : 0);
      html += "<td>" + pc + "</td>";
    }
    var totalPlayed = plays.reduce(function (a, b) { return a + b; }, 0);
    html += "<td>" + totalPlayed + "</td><td>" + periods + "</td></tr>";
    html += "</tfoot></table></div>";
    html += '<div class="legend"><span><b class="lg-g">🧤</b> goalie</span><span><b class="lg-f">●</b> field</span><span><b class="lg-s">·</b> resting</span></div>';
    html += "</div>";

    out.innerHTML = html;
  }

  /* ===========================================================
     Glue
     -----------------------------------------------------------
     The roster is ONLY built when "Make roster" / "Shuffle" is
     pressed. Any change to the setup (who's here, goalies,
     periods, the team) clears the roster so nothing stale or
     unrequested is ever on screen. The last roster you DID ask
     for is saved, so a reload puts the same sheet back.
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

  // "Pumpkin Pies vs Tigers — Sat, Oct 12"
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
    var sub = document.getElementById("printSub");
    if (sub) {
      var periods = lastRoster ? lastRoster.periods : state.periods;
      sub.textContent = periods + " " + periodWord(periods, true) + " × " +
        Math.round(gameMins() / periods) + " min · 1 goalie + " + FIELD + " out";
    }
  }

  // Plain-text version, ready to paste in the team chat.
  function rosterText(r) {
    var periods = r.periods;
    var lines = [gameLabel(),
      periods + " " + periodWord(periods, true) + " × " + Math.round(gameMins() / periods) + " min", ""];
    r.lineups.forEach(function (lu, i) {
      lines.push(ordinal(i, periods) + " — Goalie: " + (lu.goalie || "(none)"));
      lines.push("  On field: " + lu.field.join(", "));
      if (lu.sitting.length) lines.push("  Resting: " + lu.sitting.join(", "));
      if (lu.waiting.length) lines.push("  Not here yet: " + lu.waiting.join(", "));
      lines.push("");
    });
    lines.push("Playing time:");
    r.present.slice().sort(function (a, b) { return byName(a.name, b.name); }).forEach(function (g) {
      var st = r.stat[g.name];
      lines.push("  " + g.name + " — " + st.plays + " of " + periods + " " + periodWord(periods, true) +
        " (" + minutesFor(st.plays, periods) + " min)" + (st.goalie ? ", goalie ×" + st.goalie : ""));
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
  function showPrompt(msg) {
    setHasRoster(false);
    var out = document.getElementById("output");
    if (out) out.innerHTML = '<div class="panel empty-note">' + (msg ||
      'Pick who\'s <b>Here</b> and who can play <b>Goalie</b> above, then tap <b>⚽ Make roster</b>.') + "</div>";
  }

  // Called after any setup edit — drop the old roster so it must be re-made.
  function settingsChanged() {
    state.saved = null;
    save();
    if (hasRoster) {
      showPrompt("Setup changed — tap <b>⚽ Make roster</b> to build the line-up.");
    }
  }

  function showRoster(r) {
    renderRoster(r);
    setHasRoster(true);
    lastRoster = r;
    updatePrintTitle();
  }

  function makeRoster(newSeed) {
    if (newSeed) state.seed = (state.seed + 1) | 0;
    if (!state.team.some(function (g) { return g.present; })) {
      state.saved = null; save();
      showPrompt("Nobody is marked “Here” yet — tap a player to add her to today's game.");
      return;
    }
    // snapshot the inputs so a reload rebuilds this exact sheet
    state.saved = {
      periods: state.periods,
      seed: state.seed,
      team: state.team.map(function (g) {
        return { name: g.name, present: !!g.present, gk: g.gk, from: Number(g.from) || 0 };
      })
    };
    save();
    showRoster(buildRoster(state.saved.team, state.saved.periods, state.saved.seed));
  }

  function restoreSaved() {
    var s = validSaved(state.saved);
    if (!s) return false;
    if (!s.team.some(function (g) { return g.present; })) return false;
    try {
      showRoster(buildRoster(s.team, s.periods, s.seed));
      return true;
    } catch (e) { return false; }
  }

  function init() {
    // Draw the essential UI FIRST so nothing below (e.g. a stale cached HTML
    // missing a button) can ever stop the team list from rendering.
    renderPeriodButtons();
    renderTeam();
    if (!restoreSaved()) showPrompt();

    // wire handlers defensively — a missing element is skipped, not thrown
    function on(id, handler) {
      var el = document.getElementById(id);
      if (el) el.onclick = handler;
    }

    var pBtns = Array.prototype.slice.call(document.querySelectorAll(".period-btn"));
    pBtns.forEach(function (b, i) {
      b.onclick = function () {
        state.periods = Number(b.dataset.p);
        // a late arrival can't start after the game ends
        state.team.forEach(function (g) {
          if (Number(g.from) >= state.periods) g.from = state.periods - 1;
        });
        renderPeriodButtons(); renderTeam(); save(); settingsChanged(); updatePrintTitle();
      };
      // left/right arrows move through the choices, like a real radio group
      b.onkeydown = function (e) {
        var d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1
          : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        var next = pBtns[(i + d + pBtns.length) % pBtns.length];
        next.focus(); next.click();
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
    on("allHereBtn", function () {
      state.team.forEach(function (g) { g.present = true; g.from = 0; });
      save(); renderTeam(); settingsChanged();
    });
    on("resetBtn", function () {
      if (confirm("Reset the whole team back to the original roster?")) {
        state.team = DEFAULT_TEAM.map(function (g) { return Object.assign({}, g); });
        state.saved = null;
        save(); renderTeam(); showPrompt();
      }
    });

    // team editor: add a player (button or Enter); commas/new lines add a batch
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
    var mins = document.getElementById("minsInput");
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
    if (mins) {
      mins.value = String(gameMins());
      mins.addEventListener("input", function () {
        var v = Math.round(Number(mins.value));
        state.game.mins = v > 0 && v <= 240 ? v : DEFAULT_MINS;
        save();
        renderPeriodButtons();
        updatePrintTitle();
        if (lastRoster) renderRoster(lastRoster);   // minutes only — the line-up stands
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
      fraction: fraction,
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
