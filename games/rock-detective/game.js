/* ===========================================================
   Rock Detective — for Jeannie, Cory, Ellie & Mum.
   -----------------------------------------------------------
     🔍 Detective — a real dichotomous key: tap what you observe
                    and the 38 suspects narrow to exactly one
     🔬 Lab       — a mystery specimen that LOOKS like its
                    neighbours; run scratch / streak / vinegar /
                    magnet tests until you can name it
     📚 Rock Book — the whole museum, with the Mohs scale
     🎯 Quiz      — three difficulty tiers, and a real geological
                    explanation whenever you get one wrong

   All the science lives in rocks.js (which node can check too).
   Specimens are drawn as seeded SVG — no image files anywhere.
   =========================================================== */
(function () {
  "use strict";

  var D = window.ROCK_DATA;
  if (!D) return;
  var ROCKS = D.ROCKS, GROUPS = D.GROUPS, FAMILY = D.FAMILY;

  var $ = function (id) { return document.getElementById(id); };
  // A Set is NOT array-like, so Array.prototype.slice.call(set) quietly returns []
  // — which is exactly how every bit of saved progress used to vanish.
  var setArr = function (set) { var a = []; set.forEach(function (v) { a.push(v); }); return a; };
  var sfx = function (n, a) { if (window.SFX && SFX[n]) { try { SFX[n](a); } catch (e) {} } };
  var pop = function (o) { if (window.Confetti && Confetti.burst) { try { Confetti.burst(o); } catch (e) {} } };

  /* ---------------- seeded RNG so a rock always draws the same -------- */
  function seed(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () {
      h += 0x6D2B79F5; var t = h; t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------------- draw a specimen (viewBox 0 0 120 100) ------------- */
  var svgCache = {}, uid = 0;

  function buildSvgParts(rock) {
    var r = seed(rock.name);
    var wob = 58 + r() * 8;
    var blob = "M 18," + wob.toFixed(1) +
      " Q 10,30 34,20 Q 60,8 88,20 Q 112,30 104," + (56 + r() * 8).toFixed(1) +
      " Q 108,84 78,90 Q 48,96 26,86 Q 8,78 18," + wob.toFixed(1) + " Z";
    var p = rock.pattern, inner = "", i, y;
    var c3 = rock.c3 || rock.c2;

    function dot(cx, cy, rad, fill, op) {
      return '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + rad.toFixed(1) +
        '" fill="' + fill + '"' + (op ? ' opacity="' + op + '"' : "") + "/>";
    }

    if (p === "speckled") {
      inner = '<rect width="120" height="100" fill="' + rock.c1 + '"/>';
      for (i = 0; i < 90; i++) inner += dot(10 + r() * 100, 10 + r() * 80, 1.5 + r() * 3.5, r() < 0.5 ? rock.c2 : c3);
    } else if (p === "fine") {
      inner = '<rect width="120" height="100" fill="' + rock.c1 + '"/>';
      for (i = 0; i < 40; i++) inner += dot(10 + r() * 100, 10 + r() * 80, 0.8 + r() * 1.4, rock.c2);
    } else if (p === "porphyry") {
      // fine background with a few big crystals dotted through it
      inner = '<rect width="120" height="100" fill="' + rock.c1 + '"/>';
      for (i = 0; i < 60; i++) inner += dot(8 + r() * 104, 8 + r() * 84, 0.7 + r() * 1.1, rock.c2, 0.5);
      for (i = 0; i < 9; i++) {
        var px = 16 + r() * 88, py = 16 + r() * 68, ps = 5 + r() * 5;
        inner += '<polygon points="' + px.toFixed(1) + ',' + (py - ps).toFixed(1) + ' ' +
          (px + ps * 0.8).toFixed(1) + ',' + py.toFixed(1) + ' ' + px.toFixed(1) + ',' + (py + ps).toFixed(1) + ' ' +
          (px - ps * 0.8).toFixed(1) + ',' + py.toFixed(1) + '" fill="' + c3 + '" stroke="' + rock.c2 +
          '" stroke-width="0.8"/>';
      }
    } else if (p === "glassy") {
      inner = '<rect width="120" height="100" fill="' + rock.c1 + '"/>' +
        '<polygon points="30,15 55,25 40,60 20,45" fill="' + rock.c2 + '" opacity="0.6"/>' +
        '<polygon points="70,30 95,20 100,55 78,70" fill="#ffffff" opacity="0.14"/>' +
        '<path d="M 35,20 L 80,80" stroke="#ffffff" stroke-width="3" opacity="0.35" stroke-linecap="round"/>';
    } else if (p === "holey") {
      inner = '<rect width="120" height="100" fill="' + rock.c1 + '"/>';
      for (i = 0; i < 55; i++) inner += dot(10 + r() * 100, 10 + r() * 80, 1.5 + r() * 4, rock.c2);
    } else if (p === "gritty") {
      inner = '<rect width="120" height="100" fill="' + rock.c1 + '"/>';
      for (i = 0; i < 130; i++) inner += dot(8 + r() * 104, 8 + r() * 84, 1 + r() * 1.8, rock.c2, 0.55);
    } else if (p === "layered" || p === "banded") {
      inner = '<rect width="120" height="100" fill="' + rock.c1 + '"/>';
      y = 8;
      while (y < 96) {
        var h = 4 + r() * 8, wb = p === "banded" ? 6 : 1.5;
        var col = p === "banded" ? (r() < 0.5 ? rock.c2 : c3) : rock.c2;
        inner += '<path d="M 0,' + y.toFixed(1) + ' Q 30,' + (y - wb).toFixed(1) + ' 60,' + y.toFixed(1) +
          ' T 120,' + y.toFixed(1) + ' L 120,' + (y + h).toFixed(1) + ' Q 90,' + (y + h - wb).toFixed(1) +
          ' 60,' + (y + h).toFixed(1) + ' T 0,' + (y + h).toFixed(1) + ' Z" fill="' + col + '" opacity="0.7"/>';
        y += h + (2 + r() * 5);
      }
    } else if (p === "pebbles" || p === "angular") {
      inner = '<rect width="120" height="100" fill="' + c3 + '"/>';
      for (i = 0; i < 16; i++) {
        var cx = 14 + r() * 92, cy = 14 + r() * 72, fill = r() < 0.5 ? rock.c1 : rock.c2;
        if (p === "pebbles") {
          inner += '<ellipse cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" rx="' + (7 + r() * 8).toFixed(1) +
            '" ry="' + (6 + r() * 6).toFixed(1) + '" fill="' + fill + '"/>';
        } else { // sharp broken chunks
          var s = 7 + r() * 8, pts = [], k;
          for (k = 0; k < 5; k++) {
            var ang = (k / 5) * Math.PI * 2 + r() * 0.7, rad2 = s * (0.55 + r() * 0.6);
            pts.push((cx + Math.cos(ang) * rad2).toFixed(1) + "," + (cy + Math.sin(ang) * rad2).toFixed(1));
          }
          inner += '<polygon points="' + pts.join(" ") + '" fill="' + fill + '"/>';
        }
      }
    } else if (p === "crystal") {
      inner = '<rect width="120" height="100" fill="' + rock.c1 + '"/>';
      for (i = 0; i < 6; i++) {
        var bx = 15 + i * 16 + r() * 6, by = 80 + r() * 8, ch = 30 + r() * 40, cw = 7 + r() * 6;
        inner += '<polygon points="' + bx.toFixed(1) + ',' + by.toFixed(1) + ' ' +
          (bx + cw).toFixed(1) + ',' + by.toFixed(1) + ' ' + (bx + cw).toFixed(1) + ',' + (by - ch + 8).toFixed(1) +
          ' ' + (bx + cw / 2).toFixed(1) + ',' + (by - ch).toFixed(1) + ' ' + bx.toFixed(1) + ',' + (by - ch + 8).toFixed(1) +
          '" fill="' + (i % 2 ? rock.c2 : rock.c1) + '" stroke="' + rock.c2 + '" stroke-width="1.2" opacity="0.92"/>';
      }
    } else if (p === "rhomb") {
      // calcite breaks into leaning rhombs, NOT cubes
      inner = '<rect width="120" height="100" fill="' + rock.c1 + '"/>';
      for (i = 0; i < 6; i++) {
        var rx = 14 + r() * 78, ry = 20 + r() * 52, w2 = 16 + r() * 12, h2 = 12 + r() * 10, lean = 7;
        inner += '<polygon points="' + rx + ',' + ry + ' ' + (rx + w2) + ',' + ry + ' ' +
          (rx + w2 - lean) + ',' + (ry + h2) + ' ' + (rx - lean) + ',' + (ry + h2) +
          '" fill="' + rock.c2 + '" stroke="#00000033" stroke-width="1" opacity="0.9"/>';
      }
    } else if (p === "cubes") {
      inner = '<rect width="120" height="100" fill="#f4efe8"/>';
      for (i = 0; i < 7; i++) {
        var x = 12 + r() * 84, cy2 = 20 + r() * 56, s2 = 10 + r() * 14;
        inner += "<g>" +
          '<polygon points="' + x + ',' + cy2 + ' ' + (x + s2) + ',' + (cy2 - s2 * 0.4) + ' ' + (x + s2 * 2) + ',' + cy2 + ' ' + (x + s2) + ',' + (cy2 + s2 * 0.4) + '" fill="' + rock.c1 + '"/>' +
          '<polygon points="' + x + ',' + cy2 + ' ' + (x + s2) + ',' + (cy2 + s2 * 0.4) + ' ' + (x + s2) + ',' + (cy2 + s2 * 0.4 + s2) + ' ' + x + ',' + (cy2 + s2) + '" fill="' + rock.c2 + '"/>' +
          '<polygon points="' + (x + s2) + ',' + (cy2 + s2 * 0.4) + ' ' + (x + s2 * 2) + ',' + cy2 + ' ' + (x + s2 * 2) + ',' + (cy2 + s2) + ' ' + (x + s2) + ',' + (cy2 + s2 * 0.4 + s2) + '" fill="' + rock.c1 + '" opacity="0.82"/>' +
          "</g>";
      }
    } else if (p === "flaky" || p === "sheets") {
      inner = '<rect width="120" height="100" fill="' + rock.c1 + '"/>';
      y = 12;
      while (y < 92) {
        inner += '<path d="M 6,' + y.toFixed(1) + ' L 114,' + (y + (r() * 4 - 2)).toFixed(1) + '" stroke="' +
          (r() < 0.5 ? rock.c2 : c3) + '" stroke-width="' + (p === "sheets" ? 2.4 + r() * 1.6 : 1.5 + r() * 2).toFixed(1) +
          '" opacity="0.75"/>';
        if (r() < 0.6) inner += dot(12 + r() * 96, y, 1.6, "#ffffff", 0.8);
        y += (p === "sheets" ? 6 : 4) + r() * 4;
      }
    } else { // "smooth"
      inner = '<rect width="120" height="100" fill="' + rock.c1 + '"/>' +
        '<ellipse cx="45" cy="40" rx="40" ry="26" fill="' + rock.c2 + '" opacity="0.5"/>' +
        '<ellipse cx="80" cy="65" rx="30" ry="20" fill="' + rock.c2 + '" opacity="0.35"/>' +
        '<ellipse cx="38" cy="34" rx="12" ry="7" fill="#ffffff" opacity="0.18"/>';
    }
    return { blob: blob, inner: inner };
  }

  // Every drawing gets its OWN clip id — duplicate ids across cards was a bug.
  function rockSvg(rock) {
    var parts = svgCache[rock.name] || (svgCache[rock.name] = buildSvgParts(rock));
    var id = "rdclip" + (++uid);
    return '<defs><clipPath id="' + id + '"><path d="' + parts.blob + '"/></clipPath></defs>' +
      '<rect width="120" height="100" fill="#f4efe8"/>' +
      '<g clip-path="url(#' + id + ')">' + parts.inner + "</g>" +
      '<path d="' + parts.blob + '" fill="none" stroke="#00000022" stroke-width="2"/>';
  }

  /* ---------------- saved progress ------------------------------------ */
  var FKEY = "rockDetectiveFound";      // kept from v1 so collections survive
  var SKEY = "rockDetectiveQuiz";       // kept from v1 ({best:…}) and extended

  var found = new Set();
  try { found = new Set(JSON.parse(localStorage.getItem(FKEY) || "[]")); } catch (e) {}

  var save = { best: 0, bests: {}, tier: "rockhound", tab: "detective", clues: [],
    labSolved: 0, labBest: 0, round: null };
  try {
    var s = JSON.parse(localStorage.getItem(SKEY) || "{}");
    if (typeof s.best === "number") save.best = s.best;
    if (s.bests && typeof s.bests === "object") save.bests = s.bests;
    if (s.tier && D.tierById(s.tier).id === s.tier) save.tier = s.tier;
    if (typeof s.tab === "string") save.tab = s.tab;
    if (Array.isArray(s.clues)) save.clues = s.clues;
    if (typeof s.labSolved === "number") save.labSolved = s.labSolved;
    if (typeof s.labBest === "number") save.labBest = s.labBest;
    if (s.round && typeof s.round === "object") save.round = s.round;
  } catch (e) {}

  function persist() {
    try { localStorage.setItem(SKEY, JSON.stringify(save)); } catch (e) {}
  }

  function markFound(name) {
    if (!name || found.has(name)) return;
    found.add(name);
    try { localStorage.setItem(FKEY, JSON.stringify(setArr(found))); } catch (e) {}
    var cards = document.querySelectorAll('.rock-card[data-rock="' + name + '"]');
    for (var i = 0; i < cards.length; i++) cards[i].classList.add("found");
    updateBookProgress();
  }

  var celebrated = found.size >= ROCKS.length;
  function updateBookProgress() {
    var el = $("bookProgress");
    if (!el) return;
    var n = found.size, t = ROCKS.length;
    if (n >= t && !celebrated) { celebrated = true; pop({ count: 160 }); sfx("win"); }
    el.textContent = n === 0
      ? "🏅 Crack cases, ace the lab and win the quiz to collect all " + t + " specimens!"
      : n >= t
        ? "🏆 Museum complete — all " + t + " specimens found. You're a master geologist!"
        : "🏅 " + n + " of " + t + " specimens collected — " + (t - n) + " still out there!";
  }

  /* ---------------- a specimen card ----------------------------------- */
  function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  function rockCard(rock) {
    var el = document.createElement("button");
    el.type = "button";
    el.className = "rock-card" + (found.has(rock.name) ? " found" : "");
    el.dataset.rock = rock.name;
    el.setAttribute("aria-expanded", "false");
    var streakLine = rock.streak
      ? rock.streak
      : "not used — a rock is a mixture of minerals";
    el.innerHTML =
      '<span class="found-flag">✓ Found</span>' +
      '<svg viewBox="0 0 120 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + rockSvg(rock) + "</svg>" +
      '<span class="rock-body">' +
        '<span class="rock-name">' + esc(rock.name) + "</span><br>" +
        '<span class="rock-badge b-' + rock.type + '">' + rock.glyph + " " + rock.type + "</span>" +
        '<span class="rock-mohs">Mohs ' + rock.mohs + "</span>" +
        '<span class="rock-fact">' + rock.fact + "</span>" +
        '<span class="tap-hint">tap for the detective notes →</span>' +
        '<span class="rock-more">' +
          "<dl>" +
          "<dt>How it forms</dt><dd>" + rock.forms + "</dd>" +
          (rock.parent ? "<dt>Made from</dt><dd>" + rock.parent.join(" or ") + ", cooked &amp; squeezed</dd>" : "") +
          "<dt>Hardness</dt><dd>" + rock.mohs + " / 10 — " + D.bandName(rock.band) + "</dd>" +
          "<dt>Streak</dt><dd>" + streakLine + "</dd>" +
          "<dt>Shine</dt><dd>" + rock.lustre + "</dd>" +
          "<dt>How it breaks</dt><dd>" + rock.breaks + "</dd>" +
          "</dl>" +
          "<p>" + rock.more + "</p>" +
        "</span>" +
      "</span>";
    el.setAttribute("aria-label", rock.name + ", " + rock.type + ", Mohs hardness " + rock.mohs);
    el.addEventListener("click", function () {
      var open = el.classList.toggle("open");
      el.setAttribute("aria-expanded", String(open));
      sfx("good");
    });
    return el;
  }

  /* ---------------- Detective: the dichotomous key -------------------- */
  var active = new Set();
  var groupOf = {}, singleGroups = {};
  GROUPS.forEach(function (g) {
    g.clues.forEach(function (c) { groupOf[c.key] = g; });
    if (g.single) singleGroups[g.id] = g.clues.map(function (c) { return c.key; });
  });

  function matchesAll(rock, set) {
    var okAll = true;
    set.forEach(function (k) { if (rock.k.indexOf(k) < 0) okAll = false; });
    return okAll;
  }
  function countFor(set) {
    var n = 0;
    ROCKS.forEach(function (r) { if (matchesAll(r, set)) n++; });
    return n;
  }

  function buildClues() {
    var box = $("clueGroups");
    box.innerHTML = "";
    GROUPS.forEach(function (g, gi) {
      var d = document.createElement("details");
      d.className = "clue-group";
      if (gi < 4) d.open = true;
      var sum = document.createElement("summary");
      sum.appendChild(document.createTextNode(g.title + " "));
      var badge = document.createElement("span");
      badge.className = "g-count";
      badge.dataset.group = g.id;
      badge.hidden = true;
      sum.appendChild(badge);
      d.appendChild(sum);
      var help = document.createElement("p");
      help.className = "g-help";
      help.textContent = g.help;
      d.appendChild(help);
      var row = document.createElement("div");
      row.className = "clues";
      row.setAttribute("role", "group");
      row.setAttribute("aria-label", g.title);
      g.clues.forEach(function (c) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "clue";
        b.dataset.key = c.key;
        b.innerHTML = '<span>' + c.label + '</span><span class="n"></span>';
        b.setAttribute("aria-pressed", "false");
        b.addEventListener("click", function () { toggleClue(c.key); });
        row.appendChild(b);
      });
      d.appendChild(row);
      box.appendChild(d);
    });
  }

  function toggleClue(key) {
    if (active.has(key)) {
      active.delete(key);
    } else {
      var g = groupOf[key];
      if (g && g.single) {
        singleGroups[g.id].forEach(function (k) { active.delete(k); });
      }
      active.add(key);
    }
    sfx("good");
    save.clues = setArr(active);
    persist();
    filterDetective();
  }

  // Show "2 on" next to a group title so clues hiding in a folded-up
  // group are still obvious — especially after a reload.
  function refreshGroupBadges() {
    GROUPS.forEach(function (g) {
      var n = 0;
      g.clues.forEach(function (c) { if (active.has(c.key)) n++; });
      var el = document.querySelector('.g-count[data-group="' + g.id + '"]');
      if (!el) return;
      el.textContent = n + " on";
      el.hidden = n === 0;
      var det = el.closest ? el.closest("details") : null;
      if (n > 0 && det && !det.open) det.open = true;
    });
  }

  function refreshClueChips() {
    var chips = document.querySelectorAll("#clueGroups .clue");
    var live = countFor(active);
    for (var i = 0; i < chips.length; i++) {
      var b = chips[i], key = b.dataset.key, on = active.has(key);
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", String(on));
      var n;
      if (on) {
        n = live;
      } else {
        var probe = new Set(active);
        var g = groupOf[key];
        if (g && g.single) singleGroups[g.id].forEach(function (k) { probe.delete(k); });
        probe.add(key);
        n = countFor(probe);
      }
      b.querySelector(".n").textContent = n;
      b.classList.toggle("off", !on && n === 0);
      b.disabled = !on && n === 0;
    }
  }

  var detectiveBuilt = false, lastMatches = -1;
  function buildDetectiveGrid() {
    if (detectiveBuilt) return;
    detectiveBuilt = true;
    var grid = $("detectiveGrid");
    var frag = document.createDocumentFragment();
    ROCKS.forEach(function (rk) { frag.appendChild(rockCard(rk)); });
    grid.appendChild(frag);
  }

  function filterDetective() {
    var grid = $("detectiveGrid");
    var matches = 0, theOne = null;
    ROCKS.forEach(function (rk) {
      var card = grid.querySelector('.rock-card[data-rock="' + rk.name + '"]');
      var ok = matchesAll(rk, active);
      if (card) {
        card.classList.toggle("dim", !ok);
        card.setAttribute("aria-hidden", ok ? "false" : "true");
        card.tabIndex = ok ? 0 : -1;
      }
      if (ok) { matches++; theOne = rk; }
    });
    var old = grid.querySelector(".empty-note");
    if (old) old.remove();
    if (matches === 0) {
      var note = document.createElement("div");
      note.className = "empty-note";
      note.textContent = "🤔 No specimen matches ALL those clues — try clearing one.";
      grid.appendChild(note);
    }
    var n = active.size;
    $("clueCount").textContent = n === 0
      ? "Showing all " + ROCKS.length + " specimens"
      : matches + " suspect" + (matches === 1 ? "" : "s") + " left after " + n + " clue" + (n === 1 ? "" : "s");

    var solved = matches === 1 && n > 0;
    $("solvedBanner").hidden = !solved;
    if (solved) {
      $("solvedTitle").textContent = "Case solved: it's " + theOne.name + "!";
      $("solvedSub").textContent = theOne.glyph + " " + theOne.type + " · Mohs " + theOne.mohs + " — " + theOne.fact;
      if (lastMatches !== 1) { pop({ count: 50 }); sfx("win"); }
      markFound(theOne.name);
    }
    lastMatches = matches;
    refreshClueChips();
    refreshGroupBadges();
  }

  $("resetClues").addEventListener("click", function () {
    active.clear();
    save.clues = [];
    persist();
    sfx("good");
    filterDetective();
  });

  /* ---------------- Lab: identify by testing -------------------------- */
  var labRock = null, labUsed = [], labStage = "test";

  function newLabCase() {
    var set = D.LOOKALIKES[Math.floor(Math.random() * D.LOOKALIKES.length)];
    var names = set.names.slice();
    var target = D.BY_NAME[names[Math.floor(Math.random() * names.length)]];
    labRock = target;
    labUsed = [];
    labStage = "test";
    $("labSvg").innerHTML = rockSvg(target);
    $("labTitle").textContent = "Mystery specimen #" + (save.labSolved + 1);
    $("labSub").textContent = "🗂️ " + set.title + " — " + names.length + " suspects. Test it!";
    $("labSvg").setAttribute("aria-label", "Mystery specimen from the group: " + set.title);
    labSet = names;
    $("labOpts").innerHTML = "";
    $("labWhy").hidden = true;
    $("labNameIt").style.display = "";
    $("labNew").classList.add("ghost");
    $("labNew").textContent = "🧪 New specimen";
    renderLabTests();
    renderNotebook();
    renderLabStats();
  }
  var labSet = [];

  function renderLabTests() {
    var box = $("labTests");
    box.innerHTML = "";
    D.LAB_TESTS.forEach(function (t) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "lab-test" + (labUsed.some(function (u) { return u.key === t.key; }) ? " used" : "");
      b.textContent = t.label;
      b.disabled = labStage !== "test" || labUsed.some(function (u) { return u.key === t.key; });
      b.addEventListener("click", function () {
        if (!labRock || labStage !== "test") return;
        labUsed.push({ key: t.key, text: D.runTest(labRock, t.key) });
        sfx("good");
        renderLabTests();
        renderNotebook();
      });
      box.appendChild(b);
    });
  }

  function renderNotebook() {
    var nb = $("labNotebook");
    if (!labUsed.length) {
      nb.innerHTML = '<span class="nb-empty">📓 Your notebook is empty. Pick a test above — ' +
        "the fewer tests you need, the better the detective.</span>";
      return;
    }
    nb.innerHTML = "<ol>" + labUsed.map(function (u) { return "<li>" + u.text + "</li>"; }).join("") + "</ol>";
  }

  function renderLabStats() {
    $("labStats").textContent = save.labSolved
      ? "🔬 Cases cracked: " + save.labSolved +
        (save.labBest ? " · best identification used just " + save.labBest + " test" + (save.labBest === 1 ? "" : "s") : "")
      : "🔬 No cases cracked yet — run some tests and take your best shot!";
  }

  function labNameIt() {
    if (!labRock || labStage !== "test") return;
    labStage = "name";
    renderLabTests();
    $("labNameIt").style.display = "none";
    var box = $("labOpts");
    box.innerHTML = "";
    D.shuffle(Math.random, labSet).forEach(function (nm) {
      var rk = D.BY_NAME[nm];
      var b = document.createElement("button");
      b.type = "button";
      b.className = "quiz-opt";
      b.textContent = nm;
      b.addEventListener("click", function () { labAnswer(b, rk); });
      box.appendChild(b);
    });
  }

  function labAnswer(btn, rk) {
    if (labStage !== "name") return;
    labStage = "done";
    var opts = $("labOpts").querySelectorAll(".quiz-opt");
    for (var i = 0; i < opts.length; i++) {
      opts[i].disabled = true;
      if (opts[i].textContent === labRock.name) opts[i].classList.add("right");
    }
    var why = $("labWhy");
    why.hidden = false;
    if (rk.name === labRock.name) {
      btn.classList.add("right");
      save.labSolved++;
      if (labUsed.length && (!save.labBest || labUsed.length < save.labBest)) save.labBest = labUsed.length;
      persist();
      markFound(labRock.name);
      pop({ count: 40 });
      sfx("win");
      why.innerHTML = "✅ <b>Correct — it's " + labRock.name + "!</b> You used " + labUsed.length +
        " test" + (labUsed.length === 1 ? "" : "s") + ". " + labRock.forms +
        "<br><b>Hardness</b> " + labRock.mohs + " · <b>streak</b> " +
        (labRock.streak || "n/a (it's a rock)") + " · <b>breaks:</b> " + labRock.breaks.toLowerCase() + ".";
    } else {
      btn.classList.add("wrong");
      sfx("nope");
      why.innerHTML = "❌ You said <b>" + rk.name + "</b>, but it was <b>" + labRock.name + "</b>.<br>" +
        D.explainDiff(rk, labRock);
    }
    renderLabStats();
    var nb = $("labNew");
    nb.classList.remove("ghost");
    nb.textContent = "🧪 Next specimen →";
    nb.focus();
  }

  $("labNameIt").addEventListener("click", labNameIt);
  $("labNew").addEventListener("click", function () { sfx("good"); newLabCase(); });

  /* ---------------- Rock Book ----------------------------------------- */
  var bookFilter = { kind: "family", value: "All" };
  var MOHS_ANCHORS = ["Talc", "Gypsum", "Calcite", "Fluorite", "Apatite",
    "Feldspar", "Quartz", "Topaz", "Corundum", "Diamond"];

  function bookMatches(rk) {
    if (bookFilter.kind === "mohs") return Math.round(rk.mohs) === bookFilter.value;
    return bookFilter.value === "All" || rk.type === bookFilter.value;
  }

  function buildBookFilters() {
    var families = ["All", "Igneous", "Sedimentary", "Metamorphic", "Mineral"];
    var box = $("bookFilters");
    box.innerHTML = "";
    families.forEach(function (f) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "bfilter";
      var n = f === "All" ? ROCKS.length : ROCKS.filter(function (r) { return r.type === f; }).length;
      b.textContent = (f === "All" ? "🗂️ All" : FAMILY[f].glyph + " " + f) + " (" + n + ")";
      b.dataset.family = f;
      b.addEventListener("click", function () {
        bookFilter = { kind: "family", value: f };
        sfx("good");
        buildBook();
      });
      box.appendChild(b);
    });

    var strip = $("mohsStrip");
    strip.innerHTML = "";
    for (var i = 1; i <= 10; i++) {
      (function (n) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "mohs-chip";
        b.dataset.mohs = String(n);
        b.innerHTML = '<span class="m-n">' + n + "</span>" + MOHS_ANCHORS[n - 1];
        b.setAttribute("aria-label", "Mohs " + n + ", " + MOHS_ANCHORS[n - 1] + " — show specimens about this hard");
        b.addEventListener("click", function () {
          bookFilter = { kind: "mohs", value: n };
          sfx("good");
          buildBook();
        });
        strip.appendChild(b);
      })(i);
    }
  }

  function buildBook() {
    var grid = $("bookGrid");
    grid.innerHTML = "";
    var list = ROCKS.filter(bookMatches);
    if (!list.length) {
      grid.innerHTML = '<div class="empty-note">Nothing in the museum is quite that hard!</div>';
    } else {
      var frag = document.createDocumentFragment();
      list.forEach(function (rk) { frag.appendChild(rockCard(rk)); });
      grid.appendChild(frag);
    }
    var fb = $("bookFilters").querySelectorAll(".bfilter");
    for (var i = 0; i < fb.length; i++) {
      var on = bookFilter.kind === "family" && fb[i].dataset.family === bookFilter.value;
      fb[i].classList.toggle("on", on);
      fb[i].setAttribute("aria-pressed", String(on));
    }
    var mc = $("mohsStrip").querySelectorAll(".mohs-chip");
    for (var j = 0; j < mc.length; j++) {
      var onm = bookFilter.kind === "mohs" && Number(mc[j].dataset.mohs) === bookFilter.value;
      mc[j].classList.toggle("on", onm);
      mc[j].setAttribute("aria-pressed", String(onm));
    }
  }

  /* ---------------- Quiz ---------------------------------------------- */
  var ROUND_LEN = 10;
  var q = null, answered = false, roundScore = 0, qNum = 0, streak = 0, lastName = null;
  var tier = save.tier;

  function buildTiers() {
    var box = $("tiers");
    box.innerHTML = "";
    D.TIERS.forEach(function (t) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tier-btn" + (t.id === tier ? " on" : "");
      b.dataset.tier = t.id;
      var bestT = save.bests[t.id] || 0;
      b.textContent = t.label + (bestT ? " · " + bestT + "/10" : "");
      b.setAttribute("aria-pressed", String(t.id === tier));
      b.addEventListener("click", function () {
        if (tier === t.id) return;
        tier = t.id;
        save.tier = tier;
        save.round = null;
        persist();
        buildTiers();
        sfx("good");
        newRound();
      });
      box.appendChild(b);
    });
  }

  function newRound() {
    roundScore = 0; qNum = 0; streak = 0; lastName = null;
    $("quizEnd").hidden = true;
    $("quizPlay").style.display = "";
    nextQuestion();
  }

  function nextQuestion() {
    answered = false;
    qNum++;
    $("nextQuiz").style.display = "none";
    $("quizFeedback").textContent = "";
    $("quizWhy").hidden = true;
    q = D.makeQuestion(tier, Math.random, lastName);
    lastName = q.rock ? q.rock.name : null;

    var svg = $("quizSvg");
    if (q.showRock && q.rock) {
      svg.style.display = "";
      svg.innerHTML = rockSvg(q.rock);
      svg.setAttribute("aria-label", q.kind === "name"
        ? "Mystery specimen to identify"
        : "A picture of " + q.rock.name);
    } else {
      svg.style.display = "none";
      svg.innerHTML = "";
    }
    $("quizQ").innerHTML = q.prompt;
    $("quizHint").innerHTML = q.hintText || "";

    var box = $("quizOpts");
    box.innerHTML = "";
    box.style.gridTemplateColumns = q.options.length === 3 ? "1fr" : "1fr 1fr";
    q.options.forEach(function (o, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "quiz-opt";
      b.textContent = o.text;
      b.setAttribute("aria-keyshortcuts", String(i + 1));
      b.addEventListener("click", function () { answerQuiz(b, o); });
      box.appendChild(b);
    });
    var keys = [];
    for (var ki = 1; ki <= q.options.length; ki++) keys.push("<b>" + ki + "</b>");
    $("keyHint").innerHTML = "⌨️ Big kids: press " + keys.slice(0, -1).join(", ") +
      " or " + keys[keys.length - 1] + " to answer.";
    updateQuizTop();
    save.round = { tier: tier, qNum: qNum, roundScore: roundScore };
    persist();
  }

  function answerQuiz(btn, opt) {
    if (answered) return;
    answered = true;
    var buttons = $("quizOpts").querySelectorAll(".quiz-opt");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].disabled = true;
      if (q.options[i] && q.options[i].correct) buttons[i].classList.add("right");
    }
    var fb = $("quizFeedback"), why = $("quizWhy");
    if (opt.correct) {
      roundScore++; streak++;
      btn.classList.add("right");
      fb.style.color = "#1f9e57";
      fb.textContent = streak >= 3
        ? "✅ Right — that's " + streak + " in a row! 🔥"
        : "✅ Yes! " + q.answerText;
      sfx("streak", streak);
      pop({ count: 24 });
      // On a "which one formed like this?" question the forms text IS the
      // question, so show the specimen's headline fact instead of repeating it.
      var shown = q.rock || q.answerRock;
      why.hidden = false;
      why.innerHTML = shown
        ? "<b>" + shown.name + "</b> — " + (q.kind === "forms" ? shown.fact : shown.forms)
        : "";
      if (why.innerHTML === "") why.hidden = true;
    } else {
      streak = 0;
      btn.classList.add("wrong");
      fb.style.color = "#d63864";
      fb.textContent = "❌ Not quite — it's " + q.answerText + ".";
      sfx("nope");
      why.hidden = false;
      why.innerHTML = "🔍 <b>Why?</b> " + (q.explainFor(opt) || "");
    }
    if (opt.correct) {
      var got = q.answerRock || q.rock;
      if (got) markFound(got.name);
    }
    updateQuizTop();
    save.round = { tier: tier, qNum: qNum, roundScore: roundScore };
    persist();
    $("nextQuiz").textContent = qNum >= ROUND_LEN ? "See your score →" : "Next specimen →";
    $("nextQuiz").style.display = "inline-block";
    $("nextQuiz").focus();
  }

  function updateQuizTop() {
    $("quizProgressText").textContent = "Specimen " + Math.min(qNum, ROUND_LEN) + " of " + ROUND_LEN;
    $("quizRoundScore").textContent = "⭐ " + roundScore + " right";
    var done = answered ? qNum : qNum - 1;
    $("quizBar").style.width = (Math.max(0, done) / ROUND_LEN * 100) + "%";
  }

  function endRound() {
    var stars = roundScore >= 9 ? 3 : roundScore >= 7 ? 2 : roundScore >= 5 ? 1 : 0;
    $("roundStars").textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars);
    $("roundScore").textContent = roundScore + " / " + ROUND_LEN;
    $("roundMsg").textContent =
      stars === 3 ? "You're a real geologist! 🥇" :
      stars === 2 ? "Fantastic rock hunting! 🥈" :
      stars === 1 ? "Nice digging — keep exploring! ⛏️" :
      "Every geologist starts somewhere — try the Rock Book! 📚";
    var prev = save.bests[tier] || 0;
    var isBest = roundScore > prev;
    if (isBest) {
      save.bests[tier] = roundScore;
      if (roundScore > save.best) save.best = roundScore;
    }
    save.round = null;
    persist();
    buildTiers();
    $("roundBest").textContent = isBest
      ? "🏆 New best on " + D.tierById(tier).label + "!"
      : ((save.bests[tier] || 0) > 0 ? "🏆 Your " + D.tierById(tier).label + " best: " + save.bests[tier] + " / " + ROUND_LEN : "");
    $("quizPlay").style.display = "none";
    $("quizEnd").hidden = false;
    if (stars >= 2) { sfx("win"); pop({ count: 40 + stars * 30 }); }
  }

  $("nextQuiz").addEventListener("click", function () {
    if (qNum >= ROUND_LEN) endRound(); else nextQuestion();
  });
  $("againQuiz").addEventListener("click", function () { sfx("good"); newRound(); });

  // Big kids can answer with the number keys.
  window.addEventListener("keydown", function (e) {
    if (!$("quiz").classList.contains("active") || answered) return;
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    var k = Number(e.key);
    if (k >= 1 && k <= 4) {
      var b = $("quizOpts").querySelectorAll(".quiz-opt")[k - 1];
      if (b && !b.disabled) { e.preventDefault(); b.click(); }
    }
  });

  /* ---------------- Tabs ---------------------------------------------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab"));

  function showTab(name, focusIt) {
    tabs.forEach(function (t) {
      var on = t.dataset.panel === name;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focusIt) t.focus();
    });
    document.querySelectorAll(".panel").forEach(function (p) {
      p.classList.toggle("active", p.id === name);
    });
    if (name === "quiz" && !q) {
      if (save.round && save.round.tier === tier && save.round.qNum > 0 && save.round.qNum <= ROUND_LEN) {
        roundScore = save.round.roundScore || 0;
        qNum = save.round.qNum - 1;
        streak = 0;
        $("quizEnd").hidden = true;
        $("quizPlay").style.display = "";
        nextQuestion();
      } else {
        newRound();
      }
    }
    if (name === "lab" && !labRock) newLabCase();
    save.tab = name;
    persist();
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () { showTab(tab.dataset.panel); sfx("good"); });
    tab.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      showTab(tabs[(i + d + tabs.length) % tabs.length].dataset.panel, true);
    });
  });

  /* ---------------- Boot ---------------------------------------------- */
  $("totalRocks").textContent = String(ROCKS.length);
  buildClues();
  buildDetectiveGrid();
  save.clues.forEach(function (k) { if (groupOf[k]) active.add(k); });
  filterDetective();
  buildBookFilters();
  buildBook();
  updateBookProgress();
  buildTiers();
  renderLabStats();
  showTab(tabs.some(function (t) { return t.dataset.panel === save.tab; }) ? save.tab : "detective");
})();
