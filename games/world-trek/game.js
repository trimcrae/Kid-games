/* ===========================================================
   World Trek — geography for the arcade.
   -----------------------------------------------------------
   Eight ways to explore two tappable maps:

     🌍 Continents    "Tap Africa" on the pixel world map
     🌊 Oceans        the five oceans, on the same map
     🚩 Flags         name the flag, pick the flag, or name the
                      capital — 34 hand-drawn SVG flags
     🗺️ Find a State  all 50 states on a puzzle map
     🏛️ Capitals      "Austin is the capital of…?" — tap it
     ⚖️ Which Is Bigger?  states, countries, continents & oceans
                      compared by real square miles
     📖 Atlas         tap anything to read what it is, where it
                      is, its capital, its size and a true fact
                      — then drill into that continent's countries
     🛂 Passport      every sticker you've collected, plus badges

   Three difficulty tiers change how much help the map gives:
     🐣 Easy      state codes + region colours are shown
     🧭 Explorer  the two-letter codes are hidden
     🎓 Grown-up  colours go too — and the quizzes get meaner
                  (same-continent flag choices, near-identical
                  sizes in Which Is Bigger). That one's for mum.

   Every wrong tap still teaches: it names whatever you tapped
   instead, and explains WHY the right answer is right ("Los
   Angeles is bigger, but Sacramento is the capital").

   Stars, streaks, stickers and badges all save in localStorage.
   =========================================================== */
(function () {
  "use strict";

  const SAVE_KEY = "world-trek.v1";
  const COLS = WORLD_MAP[0].length;
  const ROWS = WORLD_MAP.length;
  const CONTINENTS = ["N", "S", "E", "A", "I", "O", "T"];
  const OCEANS = ["p", "t", "i", "r", "s"];
  const COUNTRY_CODES = Object.keys(COUNTRIES);
  const FLAG_CODES = COUNTRY_CODES.filter(function (k) { return !!FLAGS[k]; });
  const STATE_CODES = Object.keys(STATES);

  const el = {
    modes: document.getElementById("modes"),
    diffs: document.getElementById("diffs"),
    title: document.getElementById("prompt-title"),
    text: document.getElementById("prompt-text"),
    actions: document.getElementById("prompt-actions"),
    choices: document.getElementById("choices"),
    flagStage: document.getElementById("flag-stage"),
    scorebar: document.getElementById("scorebar"),
    stars: document.getElementById("stars"),
    world: document.getElementById("world"),
    worldCard: document.getElementById("world-card"),
    worldLabels: document.getElementById("world-labels"),
    worldLegend: document.getElementById("world-legend"),
    states: document.getElementById("states"),
    statesCard: document.getElementById("states-card"),
    statesScroll: document.getElementById("states-scroll"),
    zoomBtn: document.getElementById("zoom-btn"),
    statesLegend: document.getElementById("states-legend"),
    info: document.getElementById("info"),
    infoFlag: document.getElementById("info-flag"),
    infoName: document.getElementById("info-name"),
    infoSub: document.getElementById("info-sub"),
    infoFact: document.getElementById("info-fact"),
    infoMore: document.getElementById("info-more"),
    infoWhy: document.getElementById("info-why"),
    atlasCountries: document.getElementById("atlas-countries"),
    passport: document.getElementById("passport")
  };

  /* =========================================================
     SAVED PROGRESS
     Old saves (stars / seenPlaces / seenStates / bestStreak)
     load exactly as they were; the new fields just appear.
     ========================================================= */
  const DEFAULTS = {
    stars: 0, seenPlaces: {}, seenStates: {}, seenCountries: {},
    bestStreak: 0, diff: "easy", expertWins: 0, zoom: false
  };
  let save = Object.assign({}, DEFAULTS);
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (raw && typeof raw === "object") {
      Object.keys(DEFAULTS).forEach(function (k) {
        const want = typeof DEFAULTS[k];
        const got = raw[k];
        if (want === "object") { if (got && typeof got === "object") save[k] = got; }
        else if (typeof got === want) save[k] = got;
      });
    }
  } catch (e) { /* first visit, or a corrupt save — start fresh */ }
  if (["easy", "normal", "expert"].indexOf(save.diff) < 0) save.diff = "easy";

  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
  }
  function seen(bucket, key) {
    if (!save[bucket][key]) { save[bucket][key] = true; persist(); }
  }

  /* ---------------- small helpers ---------------- */
  function shuffle(a) {
    const out = a.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  const REDUCE = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function bringIntoView(node) {
    try { node.scrollIntoView({ block: "nearest", behavior: REDUCE ? "auto" : "smooth" }); }
    catch (e) { /* older browsers: the card is still there to scroll to */ }
  }
  function miles(n) { return n.toLocaleString("en-US") + " sq miles"; }
  function show(node, on) { node.classList.toggle("hidden", !on); }
  function flagSvg(code, cls) {
    if (!FLAGS[code]) return "";
    return '<svg class="flag' + (cls ? " " + cls : "") + '" viewBox="0 0 60 40" role="img" aria-label="' +
      (COUNTRIES[code] ? COUNTRIES[code][0] : code) + ' flag">' + FLAGS[code] + "</svg>";
  }

  /* =========================================================
     BUILD THE WORLD MAP
     ========================================================= */
  const worldCells = {};    // code -> [{el, r, c}]

  function buildWorld() {
    const frag = document.createDocumentFragment();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const code = WORLD_MAP[r][c];
        const place = PLACES[code];
        const cell = document.createElement("span");
        cell.className = "wcell";
        cell.dataset.k = code;
        if (place) cell.dataset.kind = place.kind;
        cell.style.background = place ? place.color : "#cfe9ff";
        frag.appendChild(cell);
        (worldCells[code] = worldCells[code] || []).push({ el: cell, r: r, c: c });
      }
    }
    el.world.insertBefore(frag, el.worldLabels);

    // Continent name labels, sitting at the middle of each continent…
    CONTINENTS.forEach(function (code) { placeLabel(code, "b", PLACES[code].name.replace(" & Oceania", "")); });
    // …and quieter italic labels for the oceans (Atlas only).
    OCEANS.forEach(function (code) { placeLabel(code, "em", PLACES[code].name.replace(" Ocean", "")); });

    // Keyboard access: one representative square per place becomes a real
    // focusable button, so the map can be played entirely with Tab + Enter.
    Object.keys(worldCells).forEach(function (code) {
      if (!PLACES[code]) return;
      const cells = worldCells[code];
      let sx = 0, sy = 0;
      cells.forEach(function (cell) { sx += cell.c; sy += cell.r; });
      const cx = sx / cells.length, cy = sy / cells.length;
      let best = cells[0], bestD = Infinity;
      cells.forEach(function (cell) {
        const d = (cell.c - cx) * (cell.c - cx) + (cell.r - cy) * (cell.r - cy);
        if (d < bestD) { bestD = d; best = cell; }
      });
      best.el.tabIndex = 0;
      best.el.setAttribute("role", "button");
      best.el.setAttribute("aria-label", PLACES[code].name);
    });
  }

  function placeLabel(code, tag, text) {
    const cells = worldCells[code] || [];
    if (!cells.length) return;
    let sx = 0, sy = 0;
    cells.forEach(function (cell) { sx += cell.c; sy += cell.r; });
    const b = document.createElement(tag);
    b.dataset.k = code;
    b.textContent = text;
    b.style.left = ((sx / cells.length + 0.5) / COLS * 100) + "%";
    b.style.top = ((sy / cells.length + 0.5) / ROWS * 100) + "%";
    el.worldLabels.appendChild(b);
  }

  function showLabels(on) {
    el.worldLabels.classList.toggle("hidden", !on);
  }

  function litWorld(code, cls, ms) {
    (worldCells[code] || []).forEach(function (cell) { cell.el.classList.add(cls); });
    later(function () {
      (worldCells[code] || []).forEach(function (cell) { cell.el.classList.remove(cls); });
    }, ms || 900);
  }

  /* =========================================================
     BUILD THE STATES MAP
     ========================================================= */
  const stateCells = {};
  const stateAt = [];   // stateAt[row][col] -> code | null

  function buildStates() {
    STATE_GRID.forEach(function (row, r) {
      stateAt[r] = [];
      row.split(" ").forEach(function (code, c) {
        if (code === "..") {
          const blank = document.createElement("span");
          blank.className = "scell blank";
          el.states.appendChild(blank);
          stateAt[r][c] = null;
          return;
        }
        const info = STATES[code];
        const b = document.createElement("button");
        b.type = "button";
        b.className = "scell";
        b.dataset.s = code;
        b.dataset.r = r;
        b.dataset.c = c;
        b.tabIndex = -1;
        b.textContent = code;
        b.style.background = REGIONS[info[2]].color;
        b.setAttribute("aria-label", info[0]);
        el.states.appendChild(b);
        stateCells[code] = b;
        stateAt[r][c] = code;
      });
    });
    // roving tabindex: one way in, then the arrow keys drive
    if (stateCells.WA) stateCells.WA.tabIndex = 0;
  }

  // Arrow keys walk the grid, skipping the empty squares — a real map
  // to explore for anyone who can't (or would rather not) tap.
  function moveFocus(from, dr, dc) {
    let r = Number(from.dataset.r), c = Number(from.dataset.c);
    for (let step = 0; step < 12; step++) {
      r += dr; c += dc;
      if (r < 0 || r >= stateAt.length || c < 0 || c > 10) return;
      const code = stateAt[r][c];
      if (code && stateCells[code]) {
        from.tabIndex = -1;
        stateCells[code].tabIndex = 0;
        stateCells[code].focus();
        return;
      }
    }
  }

  function litState(code, cls, ms) {
    const c = stateCells[code];
    if (!c) return;
    c.classList.add(cls);
    later(function () { c.classList.remove(cls); }, ms || 900);
  }

  /* ---------------- legends ---------------- */
  function legendFor(codes, box) {
    box.innerHTML = "";
    if (save.diff === "expert") { box.innerHTML = '<b>🎓 Grown-up tier: no colour key!</b>'; return; }
    codes.forEach(function (code) {
      const p = PLACES[code];
      const b = document.createElement("b");
      b.innerHTML = '<i style="background:' + p.color + '"></i>' + p.name;
      box.appendChild(b);
    });
  }
  function regionLegend() {
    el.statesLegend.innerHTML = "";
    if (save.diff === "expert") {
      el.statesLegend.innerHTML = '<b>🎓 Grown-up tier: no letters, no region colours!</b>';
      return;
    }
    Object.keys(REGIONS).forEach(function (name) {
      const b = document.createElement("b");
      b.innerHTML = '<i style="background:' + REGIONS[name].color + '"></i>' + REGIONS[name].emoji + " " + name;
      el.statesLegend.appendChild(b);
    });
  }

  /* ---------------- zoom (bigger tap targets) ---------------- */
  function applyZoom() {
    el.statesScroll.classList.toggle("zoom", !!save.zoom);
    el.zoomBtn.setAttribute("aria-pressed", String(!!save.zoom));
    el.zoomBtn.textContent = save.zoom ? "🔍 Fit the whole map" : "🔍 Bigger squares";
  }

  /* ---------------- difficulty ---------------- */
  function applyDifficulty() {
    el.states.classList.toggle("hide-codes", save.diff !== "easy");
    el.states.classList.toggle("plain", save.diff === "expert");
    el.world.classList.toggle("plain", save.diff === "expert");
    el.diffs.querySelectorAll(".diff-btn").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.diff === save.diff));
    });
  }

  /* =========================================================
     LITTLE UI HELPERS
     ========================================================= */
  function button(label, onClick, ghost) {
    const b = document.createElement("button");
    b.className = "btn" + (ghost ? " ghost" : "");
    b.type = "button";
    b.textContent = label;
    b.addEventListener("click", onClick);
    el.actions.appendChild(b);
    return b;
  }

  function showInfo(name, sub, fact, opts) {
    opts = opts || {};
    el.infoName.textContent = name;
    el.infoSub.textContent = sub || "";
    el.infoFact.textContent = fact || "";
    el.infoMore.textContent = opts.more || "";
    show(el.infoMore, !!opts.more);
    el.infoWhy.textContent = opts.why || "";
    show(el.infoWhy, !!opts.why);
    el.infoFlag.innerHTML = opts.flag ? flagSvg(opts.flag) : "";
    show(el.infoFlag, !!opts.flag);
    show(el.info, true);
  }

  /* Cards ---------------------------------------------------- */
  function placeCard(code) {
    const p = PLACES[code], x = WORLD_EXTRA[code] || {};
    const more = p.kind === "ocean"
      ? "Size: " + miles(x.area) + "\nDeepest spot: " + x.deep
      : "Size: " + miles(x.area) + "\nCountries: " + x.nations +
        "\nTallest mountain: " + x.peak + "\nBiggest river: " + x.river;
    showInfo(p.emoji + " " + p.name,
      (p.kind === "ocean" ? "Ocean • " : "Continent • ") + p.where, p.fact, { more: more });
  }

  function stateCard(code, why) {
    const s = STATES[code], x = STATE_EXTRA[code];
    let more = "Nickname: " + x[0] + "\nJoined the USA in " + x[1] +
      "\nSize: " + miles(x[2]) + "\nBiggest city: " + x[3];
    if (!why && x[3] !== s[1]) {
      why = s[1] + " is the capital of " + s[0] + " — " + x[3] +
        " is just its biggest city. Capitals are chosen by the state, not by size.";
    }
    showInfo(s[0] + " (" + code + ")",
      "Capital: " + s[1] + "  •  " + REGIONS[s[2]].emoji + " " + s[2],
      s[3], { more: more, why: why });
  }

  function countryCard(code, why) {
    const c = COUNTRIES[code];
    seen("seenCountries", code);
    showInfo(c[0], "Capital: " + c[1] + "  •  " + PLACES[c[2]].name,
      c[4], { more: "Size: " + miles(c[3]), why: why, flag: FLAGS[code] ? code : null });
  }

  /* =========================================================
     MODES
     ========================================================= */
  let mode = "continents";
  let onWorld = function () {};     // tapped a world cell
  let onState = function () {};     // tapped a state
  let timers = [];
  function later(fn, ms) { const t = setTimeout(fn, ms); timers.push(t); return t; }
  function stopTimers() { timers.forEach(clearTimeout); timers = []; }

  const MODES = {
    continents: modeContinents,
    oceans: modeOceans,
    flags: modeFlags,
    states: modeStates,
    capitals: modeCapitals,
    bigger: modeBigger,
    atlas: modeAtlas,
    passport: modePassport
  };

  function setMode(next) {
    stopTimers();
    mode = MODES[next] ? next : "continents";
    el.modes.querySelectorAll(".mode-btn").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.mode === mode));
    });
    el.actions.innerHTML = "";
    el.choices.innerHTML = "";
    el.flagStage.innerHTML = "";
    el.scorebar.innerHTML = "";
    el.stars.textContent = "";
    el.passport.innerHTML = "";
    el.atlasCountries.innerHTML = "";
    show(el.atlasCountries, false);
    show(el.choices, false);
    show(el.flagStage, false);
    show(el.info, false);
    show(el.passport, false);
    // clear any leftover highlights from the mode we just left
    document.querySelectorAll(".lit, .wrong, .good, .bad").forEach(function (n) {
      n.classList.remove("lit", "wrong", "good", "bad");
    });
    onWorld = function () {};
    onState = function () {};
    MODES[mode]();
  }

  /* ---------------- shared quiz plumbing for the world map ---------------- */
  function worldQuiz(codes) {
    show(el.worldCard, true);
    show(el.statesCard, false);
    showLabels(false);
    legendFor(codes, el.worldLegend);

    let want = null, right = 0, asked = 0, streak = 0, hinted = false;
    let bag = [];

    function scores() {
      el.scorebar.innerHTML = "Right: <span>" + right + " / " + asked + "</span> &nbsp; Streak: <span>" +
        streak + "</span> &nbsp; Stars: <span>" + save.stars + "</span>";
    }

    function ask() {
      if (!bag.length) bag = shuffle(codes);
      want = bag.pop();
      asked++;
      hinted = false;
      el.title.textContent = "Tap " + PLACES[want].name + " " + PLACES[want].emoji;
      el.text.textContent = "Find it on the map and tap it!";
      show(el.info, false);
      scores();
    }

    button("💡 Show me", function () {
      if (!want) return;
      hinted = true;
      litWorld(want, "lit", 1400);
      el.text.textContent = PLACES[want].where;
    }, true);
    button("⏭ Skip", function () { ask(); }, true);

    onWorld = function (code) {
      if (!want) return;                       // answered already — don't score twice
      if (code === want) {
        const got = want;
        want = null;
        litWorld(got, "lit", 900);
        right++;
        if (!hinted) { streak++; save.stars++; }
        if (streak > save.bestStreak) save.bestStreak = streak;
        if (save.diff === "expert") save.expertWins++;
        save.seenPlaces[got] = true;
        persist();
        el.text.textContent = "Yes! That's " + PLACES[got].name + ". " + PLACES[got].where;
        placeCard(got);
        el.stars.textContent = "⭐".repeat(Math.min(streak, 10));
        if (window.SFX) SFX.good();
        if (streak && streak % 5 === 0 && window.Confetti) Confetti.burst({ count: 50 });
        scores();
        later(ask, 2400);
      } else if (PLACES[code]) {
        litWorld(code, "wrong", 700);
        streak = 0;
        el.stars.textContent = "";
        if (window.SFX) SFX.nope();
        el.text.textContent = "That's " + PLACES[code].name + " (" + PLACES[code].where.toLowerCase().replace(/\.$/, "") +
          ") — keep looking for " + PLACES[want].name + "!";
        scores();
      }
    };

    el.stars.textContent = save.bestStreak ? "Best streak: " + save.bestStreak : "";
    ask();
  }

  function modeContinents() { worldQuiz(CONTINENTS); }
  function modeOceans() { worldQuiz(OCEANS); }

  /* ---------------- 🗺️ Find a State ---------------- */
  function modeStates() {
    show(el.worldCard, false);
    show(el.statesCard, true);
    regionLegend();

    let want = null, right = 0, asked = 0, streak = 0, hinted = false, bag = [];

    function scores() {
      el.scorebar.innerHTML = "Right: <span>" + right + " / " + asked + "</span> &nbsp; Streak: <span>" +
        streak + "</span> &nbsp; States found: <span>" + Object.keys(save.seenStates).length + " / 50</span>";
    }

    function ask() {
      if (!bag.length) bag = shuffle(STATE_CODES);
      want = bag.pop();
      asked++;
      hinted = false;
      const s = STATES[want];
      el.title.textContent = "Find " + s[0] + "!";
      el.text.textContent = save.diff === "expert"
        ? "No letters, no colours — you're on your own. 🎓"
        : REGIONS[s[2]].emoji + " It's in the " + s[2] + (save.diff === "easy"
          ? " — look for the " + s[2].toLowerCase() + "-coloured squares." : ".");
      show(el.info, false);
      scores();
    }

    button("💡 Show me", function () { if (want) { hinted = true; litState(want, "lit", 1500); } }, true);
    button("⏭ Skip", function () { ask(); }, true);

    onState = function (code) {
      if (!want) return;
      const target = want;
      const s = STATES[target];
      if (code === target) {
        want = null;
        litState(code, "good", 1200);
        right++;
        if (!hinted) { streak++; save.stars++; }
        save.seenStates[code] = true;
        if (streak > save.bestStreak) save.bestStreak = streak;
        if (save.diff === "expert") save.expertWins++;
        persist();
        el.text.textContent = "Yes! " + s[0] + " — its capital is " + s[1] + ".";
        stateCard(target);
        el.stars.textContent = "⭐".repeat(Math.min(streak, 10));
        if (window.SFX) SFX.good();
        if (streak && streak % 5 === 0 && window.Confetti) Confetti.burst({ count: 50 });
        scores();
        later(ask, 2600);
      } else {
        litState(code, "bad", 700);
        streak = 0;
        el.stars.textContent = "";
        if (window.SFX) SFX.nope();
        const t = STATES[code];
        el.text.textContent = "That one is " + t[0] + " (" + t[2] + "). " + s[0] +
          " is in the " + s[2] + " — keep looking!";
        scores();
      }
    };

    ask();
  }

  /* ---------------- 🏛️ Capitals ---------------- */
  function modeCapitals() {
    show(el.worldCard, false);
    show(el.statesCard, true);
    regionLegend();

    let want = null, right = 0, asked = 0, streak = 0, hinted = false, bag = [];

    function scores() {
      el.scorebar.innerHTML = "Right: <span>" + right + " / " + asked + "</span> &nbsp; Streak: <span>" +
        streak + "</span> &nbsp; Stars: <span>" + save.stars + "</span>";
    }

    function ask() {
      if (!bag.length) bag = shuffle(STATE_CODES);
      want = bag.pop();
      asked++;
      hinted = false;
      el.title.textContent = STATES[want][1] + " is the capital of…?";
      el.text.textContent = "Tap that state on the map.";
      show(el.info, false);
      scores();
    }

    button("💡 Show me", function () {
      if (!want) return;
      hinted = true;
      litState(want, "lit", 1500);
      el.text.textContent = "It's in the " + STATES[want][2] + " — " + STATES[want][0] + ".";
    }, true);
    button("⏭ Skip", function () { ask(); }, true);

    onState = function (code) {
      if (!want) return;
      const target = want;
      const s = STATES[target];
      if (code === target) {
        want = null;
        litState(code, "good", 1200);
        right++;
        if (!hinted) { streak++; save.stars++; }
        if (streak > save.bestStreak) save.bestStreak = streak;
        if (save.diff === "expert") save.expertWins++;
        save.seenStates[code] = true;
        persist();
        el.text.textContent = "Right! " + s[1] + " is the capital of " + s[0] + ".";
        stateCard(target);
        el.stars.textContent = "⭐".repeat(Math.min(streak, 10));
        if (window.SFX) SFX.good();
        if (streak && streak % 5 === 0 && window.Confetti) Confetti.burst({ count: 50 });
        scores();
        later(ask, 2600);
      } else {
        litState(code, "bad", 700);
        streak = 0;
        el.stars.textContent = "";
        if (window.SFX) SFX.nope();
        const t = STATES[code], tx = STATE_EXTRA[code];
        let msg = "That's " + t[0] + " — its capital is " + t[1] + ".";
        if (tx[3] !== t[1]) msg += " (" + tx[3] + " is bigger, but " + t[1] + " is the capital.)";
        el.text.textContent = msg + " Try again!";
        scores();
      }
    };

    ask();
  }

  /* =========================================================
     🚩 FLAGS — three question shapes, all multiple choice
     ========================================================= */
  function choiceButton(html, label, onClick, key) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "choice";
    b.innerHTML = html;
    b.setAttribute("aria-label", label);
    if (key != null) b.dataset.key = key;
    b.addEventListener("click", function () { onClick(b); });
    el.choices.appendChild(b);
    return b;
  }

  function modeFlags() {
    show(el.worldCard, true);
    show(el.statesCard, false);
    showLabels(false);
    legendFor(CONTINENTS, el.worldLegend);
    show(el.choices, true);

    let right = 0, asked = 0, streak = 0, locked = false, bag = [];
    const kinds = save.diff === "easy" ? ["name"] : ["name", "flag", "capital"];

    function scores() {
      el.scorebar.innerHTML = "Right: <span>" + right + " / " + asked + "</span> &nbsp; Streak: <span>" +
        streak + "</span> &nbsp; Flags known: <span>" + Object.keys(save.seenCountries).length +
        " / " + COUNTRY_CODES.length + "</span>";
    }

    function distractors(code, n) {
      const cont = COUNTRIES[code][2];
      let pool = FLAG_CODES.filter(function (k) { return k !== code; });
      if (save.diff === "expert") {
        // same continent only — much harder
        const same = pool.filter(function (k) { return COUNTRIES[k][2] === cont; });
        if (same.length >= n) pool = same;
      } else if (save.diff === "easy") {
        const other = pool.filter(function (k) { return COUNTRIES[k][2] !== cont; });
        if (other.length >= n) pool = other;
      }
      return shuffle(pool).slice(0, n);
    }

    function ask() {
      if (!bag.length) bag = shuffle(FLAG_CODES);
      const code = bag.pop();
      const kind = pick(kinds);
      const n = save.diff === "easy" ? 2 : 3;
      const options = shuffle([code].concat(distractors(code, n)));
      asked++;
      locked = false;
      show(el.info, false);
      el.choices.innerHTML = "";
      el.flagStage.innerHTML = "";

      if (kind === "flag") {
        show(el.flagStage, false);
        el.title.textContent = "Which flag belongs to " + COUNTRIES[code][0] + "?";
        el.text.textContent = "Tap the right flag.";
        options.forEach(function (k) {
          choiceButton(flagSvg(k, "mini"), "The flag of " + COUNTRIES[k][0],
            function (b) { answer(k, code, b); }, k);
        });
      } else if (kind === "capital") {
        show(el.flagStage, true);
        el.flagStage.innerHTML = flagSvg(code);
        el.title.textContent = "What is the capital of " + COUNTRIES[code][0] + "?";
        el.text.textContent = "Tap the capital city.";
        options.forEach(function (k) {
          choiceButton(COUNTRIES[k][1], COUNTRIES[k][1], function (b) { answer(k, code, b); }, k);
        });
      } else {
        show(el.flagStage, true);
        el.flagStage.innerHTML = flagSvg(code);
        el.title.textContent = "Whose flag is this?";
        el.text.textContent = "Tap the country it belongs to.";
        options.forEach(function (k) {
          choiceButton(COUNTRIES[k][0], COUNTRIES[k][0], function (b) { answer(k, code, b); }, k);
        });
      }
      scores();
    }

    function answer(chosen, code, btn) {
      if (locked) return;
      locked = true;
      const c = COUNTRIES[code];
      if (chosen === code) {
        btn.classList.add("good");
        right++; streak++; save.stars++;
        if (streak > save.bestStreak) save.bestStreak = streak;
        if (save.diff === "expert") save.expertWins++;
        save.seenPlaces[c[2]] = true;
        persist();
        el.text.textContent = "Yes! " + c[0] + " — capital " + c[1] + ".";
        litWorld(c[2], "lit", 1400);
        countryCard(code);
        el.stars.textContent = "⭐".repeat(Math.min(streak, 10));
        if (window.SFX) SFX.good();
        if (streak % 5 === 0 && window.Confetti) Confetti.burst({ count: 50 });
      } else {
        btn.classList.add("bad");
        streak = 0;
        el.stars.textContent = "";
        if (window.SFX) SFX.nope();
        const w = COUNTRIES[chosen];
        el.text.textContent = "That one is " + w[0] + " (capital " + w[1] + ").";
        litWorld(c[2], "lit", 1400);
        countryCard(code, "The answer was " + c[0] + ", in " + PLACES[c[2]].name +
          ". You picked " + w[0] + ", which is in " + PLACES[w[2]].name + ".");
        // mark the right one too, so the eye learns the pair
        Array.prototype.forEach.call(el.choices.children, function (b) {
          if (b.dataset.key === code) b.classList.add("good");
        });
      }
      scores();
      later(ask, 3000);
    }

    button("⏭ Skip", function () { if (!locked) ask(); }, true);
    ask();
  }

  /* =========================================================
     ⚖️ WHICH IS BIGGER? — real square miles
     ========================================================= */
  function modeBigger() {
    show(el.statesCard, false);
    show(el.worldCard, false);
    show(el.choices, true);
    el.choices.classList.add("wide");

    let right = 0, asked = 0, streak = 0, locked = false;
    const BANDS = { easy: [3, 400], normal: [1.5, 400], expert: [1.02, 1.6] };

    function scores() {
      el.scorebar.innerHTML = "Right: <span>" + right + " / " + asked + "</span> &nbsp; Streak: <span>" +
        streak + "</span> &nbsp; Stars: <span>" + save.stars + "</span>";
    }

    // Each entry: { key, name, area, sort of thing it is, how to show it }
    function pool() {
      const kind = pick(save.diff === "easy" ? ["state", "world"] : ["state", "world", "country"]);
      if (kind === "state") {
        return STATE_CODES.map(function (k) {
          return { kind: "state", key: k, name: STATES[k][0], area: STATE_EXTRA[k][2] };
        });
      }
      if (kind === "country") {
        return COUNTRY_CODES.map(function (k) {
          return { kind: "country", key: k, name: COUNTRIES[k][0], area: COUNTRIES[k][3] };
        });
      }
      return CONTINENTS.concat(OCEANS).map(function (k) {
        return { kind: "place", key: k, name: PLACES[k].name, area: WORLD_EXTRA[k].area };
      });
    }

    function ask() {
      const band = BANDS[save.diff] || BANDS.easy;
      const list = pool();
      let a = null, b = null;
      for (let tries = 0; tries < 120; tries++) {
        a = pick(list); b = pick(list);
        if (a.key === b.key) continue;
        const ratio = Math.max(a.area, b.area) / Math.min(a.area, b.area);
        if (ratio >= band[0] && ratio <= band[1]) break;
      }
      if (!a || !b || a.key === b.key) { a = list[0]; b = list[1]; }

      asked++;
      locked = false;
      show(el.info, false);
      el.choices.innerHTML = "";
      el.title.textContent = "Which is bigger?";
      el.text.textContent = save.diff === "expert"
        ? "These two are close in size. Careful… 🎓"
        : "Tap the one that covers more land.";

      const winner = a.area >= b.area ? a : b;
      shuffle([a, b]).forEach(function (item) {
        const html = (item.kind === "country" && FLAGS[item.key] ? flagSvg(item.key, "mini") : "") +
          "<span>" + item.name + "</span>";
        choiceButton(html, item.name, function (btn) { answer(item, winner, a, b, btn); }, item.key);
      });
      scores();
    }

    function reveal(a, b) {
      Array.prototype.forEach.call(el.choices.children, function (btn) {
        const item = btn.dataset.key === a.key ? a : b;
        const s = document.createElement("small");
        s.textContent = miles(item.area);
        btn.appendChild(s);
      });
    }

    function cardFor(item, why) {
      if (item.kind === "state") stateCard(item.key, why);
      else if (item.kind === "country") countryCard(item.key, why);
      else {
        placeCard(item.key);
        if (why) { el.infoWhy.textContent = why; show(el.infoWhy, true); }
      }
    }

    function answer(chosen, winner, a, b, btn) {
      if (locked) return;
      locked = true;
      reveal(a, b);
      const loser = winner === a ? b : a;
      const times = (winner.area / loser.area);
      const howMuch = times >= 1.9
        ? winner.name + " is about " + Math.round(times) + " times bigger than " + loser.name + "."
        : winner.name + " is only a little bigger than " + loser.name + " — " +
          (winner.area - loser.area).toLocaleString("en-US") + " sq miles more.";

      if (chosen.key === winner.key) {
        btn.classList.add("good");
        right++; streak++; save.stars++;
        if (streak > save.bestStreak) save.bestStreak = streak;
        if (save.diff === "expert") save.expertWins++;
        persist();
        el.text.textContent = "Correct! " + howMuch;
        el.stars.textContent = "⭐".repeat(Math.min(streak, 10));
        if (window.SFX) SFX.good();
        if (streak % 5 === 0 && window.Confetti) Confetti.burst({ count: 50 });
      } else {
        btn.classList.add("bad");
        streak = 0;
        el.stars.textContent = "";
        if (window.SFX) SFX.nope();
        el.text.textContent = "Not quite — " + winner.name + " is bigger. " + howMuch;
        Array.prototype.forEach.call(el.choices.children, function (x) {
          if (x.dataset.key === winner.key) x.classList.add("good");
        });
      }
      cardFor(winner, howMuch);
      scores();
      later(ask, 3400);
    }

    button("⏭ Skip", function () { if (!locked) ask(); }, true);
    ask();
  }

  /* ---------------- 📖 Atlas ---------------- */
  function modeAtlas() {
    show(el.worldCard, true);
    show(el.statesCard, true);
    showLabels(true);
    legendFor(CONTINENTS, el.worldLegend);
    regionLegend();

    el.title.textContent = "The Atlas 📖";
    el.text.textContent = "Tap anything — a continent, an ocean or a state — to read all about it.";
    tally();

    function tally() {
      el.scorebar.innerHTML = "Places read: <span>" +
        (Object.keys(save.seenPlaces).length + Object.keys(save.seenStates).length +
         Object.keys(save.seenCountries).length) + "</span>";
    }

    function countryList(cont) {
      const list = COUNTRY_CODES.filter(function (k) {
        return COUNTRIES[k][2] === cont || COUNTRIES[k][5] === cont;
      });
      el.atlasCountries.innerHTML = "";
      if (!list.length) { show(el.atlasCountries, false); return; }
      show(el.atlasCountries, true);
      list.forEach(function (k) {
        const html = (FLAGS[k]
          ? flagSvg(k, "mini")
          : '<span class="cont-dot" aria-hidden="true">' + PLACES[COUNTRIES[k][2]].emoji + "</span>") +
          "<span>" + COUNTRIES[k][0] + "</span>";
        const b = document.createElement("button");
        b.type = "button";
        b.className = "choice";
        b.innerHTML = html;
        b.dataset.key = k;
        b.setAttribute("aria-label", COUNTRIES[k][0]);
        b.addEventListener("click", function () {
          countryCard(k);
          if (window.SFX) SFX.pop();
          tally();
          bringIntoView(el.info);
        });
        el.atlasCountries.appendChild(b);
      });
    }

    onWorld = function (code) {
      const p = PLACES[code];
      if (!p) return;
      litWorld(code, "lit", 700);
      seen("seenPlaces", code);
      placeCard(code);
      if (window.SFX) SFX.pop();
      if (p.kind === "continent") countryList(code);
      else { el.atlasCountries.innerHTML = ""; show(el.atlasCountries, false); }
      tally();
      bringIntoView(el.info);
    };

    onState = function (code) {
      if (!STATES[code]) return;
      litState(code, "lit", 700);
      seen("seenStates", code);
      stateCard(code);
      if (window.SFX) SFX.pop();
      el.atlasCountries.innerHTML = "";
      show(el.atlasCountries, false);
      tally();
      bringIntoView(el.info);
    };
  }

  /* ---------------- 🛂 Passport ---------------- */
  function modePassport() {
    show(el.worldCard, false);
    show(el.statesCard, false);
    show(el.passport, true);

    const nPlace = Object.keys(save.seenPlaces).length;
    const nState = Object.keys(save.seenStates).length;
    const nCountry = Object.keys(save.seenCountries).length;

    el.title.textContent = "Your Passport 🛂";
    el.text.textContent = "Every place you've visited gets a sticker. Play the other modes to fill it up!";
    el.scorebar.innerHTML = "Stars: <span>" + save.stars + "</span> &nbsp; Best streak: <span>" +
      save.bestStreak + "</span> &nbsp; Stickers: <span>" + (nPlace + nState + nCountry) +
      " / " + (CONTINENTS.length + OCEANS.length + 50 + COUNTRY_CODES.length) + "</span>";

    function section(title, items) {
      const wrap = document.createElement("div");
      wrap.className = "pp-section";
      const h = document.createElement("h3");
      h.textContent = title;
      wrap.appendChild(h);
      const grid = document.createElement("div");
      grid.className = "pp-grid";
      items.forEach(function (it) {
        const s = document.createElement("span");
        s.className = "sticker" + (it.got ? " got" : "");
        s.textContent = it.label;
        s.setAttribute("aria-label", it.full + (it.got ? " — collected" : " — not yet"));
        grid.appendChild(s);
      });
      wrap.appendChild(grid);
      el.passport.appendChild(wrap);
    }

    section("🌍 Continents (" + CONTINENTS.filter(function (c) { return save.seenPlaces[c]; }).length + " / 7)",
      CONTINENTS.map(function (c) {
        return { got: !!save.seenPlaces[c], label: PLACES[c].emoji + " " + PLACES[c].name.replace(" & Oceania", ""), full: PLACES[c].name };
      }));

    section("🌊 Oceans (" + OCEANS.filter(function (c) { return save.seenPlaces[c]; }).length + " / 5)",
      OCEANS.map(function (c) {
        return { got: !!save.seenPlaces[c], label: PLACES[c].emoji + " " + PLACES[c].name.replace(" Ocean", ""), full: PLACES[c].name };
      }));

    section("🗺️ States (" + nState + " / 50)",
      STATE_CODES.map(function (c) {
        return { got: !!save.seenStates[c], label: c, full: STATES[c][0] };
      }));

    section("🚩 Countries (" + nCountry + " / " + COUNTRY_CODES.length + ")",
      COUNTRY_CODES.map(function (c) {
        return { got: !!save.seenCountries[c], label: COUNTRIES[c][0], full: COUNTRIES[c][0] };
      }));

    const badges = [
      { got: CONTINENTS.every(function (c) { return save.seenPlaces[c]; }), text: "🌍 All 7 Continents" },
      { got: OCEANS.every(function (c) { return save.seenPlaces[c]; }), text: "🌊 All 5 Oceans" },
      { got: nState >= 25, text: "🗺️ Half the States" },
      { got: nState >= 50, text: "🇺🇸 All 50 States" },
      { got: nCountry >= 10, text: "🚩 Flag Collector" },
      { got: nCountry >= COUNTRY_CODES.length, text: "🌐 Globetrotter" },
      { got: save.bestStreak >= 10, text: "🔥 Streak of 10" },
      { got: save.stars >= 100, text: "⭐ 100 Stars" },
      { got: save.expertWins >= 20, text: "🎓 Grown-up Trekker" }
    ];
    const wrap = document.createElement("div");
    wrap.className = "pp-section";
    wrap.innerHTML = "<h3>🏅 Badges (" + badges.filter(function (b) { return b.got; }).length +
      " / " + badges.length + ")</h3>";
    const row = document.createElement("div");
    row.className = "badges";
    badges.forEach(function (b) {
      const s = document.createElement("span");
      s.className = "badge" + (b.got ? " got" : "");
      s.textContent = b.text;
      s.setAttribute("aria-label", b.text + (b.got ? " — earned" : " — not earned yet"));
      row.appendChild(s);
    });
    wrap.appendChild(row);
    el.passport.appendChild(wrap);
  }

  /* =========================================================
     WIRING
     ========================================================= */
  buildWorld();
  buildStates();
  applyDifficulty();
  applyZoom();

  el.zoomBtn.addEventListener("click", function () {
    save.zoom = !save.zoom;
    persist();
    applyZoom();
  });

  el.world.addEventListener("click", function (e) {
    const k = e.target && e.target.dataset && e.target.dataset.k;
    if (k) onWorld(k);
  });
  el.world.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    const k = e.target && e.target.dataset && e.target.dataset.k;
    if (k) { e.preventDefault(); onWorld(k); }
  });

  el.states.addEventListener("click", function (e) {
    const b = e.target.closest(".scell");
    if (b && b.dataset.s) onState(b.dataset.s);
  });
  el.states.addEventListener("keydown", function (e) {
    const b = e.target.closest && e.target.closest(".scell");
    if (!b || !b.dataset.s) return;
    const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (moves[e.key]) { e.preventDefault(); moveFocus(b, moves[e.key][0], moves[e.key][1]); }
  });

  el.modes.addEventListener("click", function (e) {
    const b = e.target.closest(".mode-btn");
    if (b) setMode(b.dataset.mode);
  });
  el.diffs.addEventListener("click", function (e) {
    const b = e.target.closest(".diff-btn");
    if (!b) return;
    save.diff = b.dataset.diff;
    persist();
    applyDifficulty();
    setMode(mode);       // restart the current mode at the new tier
  });

  setMode("continents");
})();
