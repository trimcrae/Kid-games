/* ===========================================================
   World Trek — geography for the arcade.
   -----------------------------------------------------------
   Five ways to explore two tappable maps:

     🌍 Continents    "Tap Africa" on the pixel world map
     🌊 Oceans        the five oceans, on the same map
     🗺️ Find a State  all 50 states on a puzzle map, with
                      region colours as a hint
     🏛️ Capitals      "Austin is the capital of…?" — tap it
     📖 Atlas         tap anything to read what it is, where
                      it is, its capital and a true fact

   What it teaches: the seven continents & five oceans, where
   the 50 states are and who they touch, the four US regions,
   state capitals, and a fact about every single place.

   Every wrong tap still teaches — it names whatever you tapped
   instead. Stars and explored places save in localStorage.
   =========================================================== */
(function () {
  "use strict";

  const SAVE_KEY = "world-trek.v1";
  const COLS = WORLD_MAP[0].length;
  const ROWS = WORLD_MAP.length;
  const CONTINENTS = ["N", "S", "E", "A", "I", "O", "T"];
  const OCEANS = ["p", "t", "i", "r", "s"];

  const el = {
    modes: document.getElementById("modes"),
    title: document.getElementById("prompt-title"),
    text: document.getElementById("prompt-text"),
    actions: document.getElementById("prompt-actions"),
    scorebar: document.getElementById("scorebar"),
    stars: document.getElementById("stars"),
    world: document.getElementById("world"),
    worldCard: document.getElementById("world-card"),
    worldLabels: document.getElementById("world-labels"),
    worldLegend: document.getElementById("world-legend"),
    states: document.getElementById("states"),
    statesCard: document.getElementById("states-card"),
    statesLegend: document.getElementById("states-legend"),
    info: document.getElementById("info"),
    infoName: document.getElementById("info-name"),
    infoSub: document.getElementById("info-sub"),
    infoFact: document.getElementById("info-fact")
  };

  /* ---------------- saved progress ---------------- */
  let save = { stars: 0, seenPlaces: {}, seenStates: {}, bestStreak: 0 };
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (raw && typeof raw === "object") save = Object.assign(save, raw);
  } catch (e) { /* first visit */ }
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
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
        cell.style.background = place ? place.color : "#cfe9ff";
        frag.appendChild(cell);
        (worldCells[code] = worldCells[code] || []).push({ el: cell, r: r, c: c });
      }
    }
    el.world.insertBefore(frag, el.worldLabels);

    // continent name labels, sitting at the middle of each continent
    CONTINENTS.forEach(function (code) {
      const cells = worldCells[code] || [];
      if (!cells.length) return;
      let sx = 0, sy = 0;
      cells.forEach(function (cell) { sx += cell.c; sy += cell.r; });
      const b = document.createElement("b");
      b.dataset.k = code;
      b.textContent = PLACES[code].name.replace(" & Oceania", "");
      b.style.left = ((sx / cells.length + 0.5) / COLS * 100) + "%";
      b.style.top = ((sy / cells.length + 0.5) / ROWS * 100) + "%";
      el.worldLabels.appendChild(b);
    });
  }

  function showLabels(on) {
    el.worldLabels.classList.toggle("hidden", !on);
  }

  function litWorld(code, cls, ms) {
    (worldCells[code] || []).forEach(function (cell) { cell.el.classList.add(cls); });
    setTimeout(function () {
      (worldCells[code] || []).forEach(function (cell) { cell.el.classList.remove(cls); });
    }, ms || 900);
  }

  /* =========================================================
     BUILD THE STATES MAP
     ========================================================= */
  const stateCells = {};

  function buildStates() {
    STATE_GRID.forEach(function (row) {
      row.split(" ").forEach(function (code) {
        if (code === "..") {
          const blank = document.createElement("span");
          blank.className = "scell blank";
          el.states.appendChild(blank);
          return;
        }
        const info = STATES[code];
        const b = document.createElement("button");
        b.type = "button";
        b.className = "scell";
        b.dataset.s = code;
        b.textContent = code;
        b.style.background = REGIONS[info[2]].color;
        b.setAttribute("aria-label", info[0]);
        el.states.appendChild(b);
        stateCells[code] = b;
      });
    });
  }

  function litState(code, cls, ms) {
    const c = stateCells[code];
    if (!c) return;
    c.classList.add(cls);
    setTimeout(function () { c.classList.remove(cls); }, ms || 900);
  }

  /* ---------------- legends ---------------- */
  function legendFor(codes, box) {
    box.innerHTML = "";
    codes.forEach(function (code) {
      const p = PLACES[code];
      const b = document.createElement("b");
      b.innerHTML = '<i style="background:' + p.color + '"></i>' + p.name;
      box.appendChild(b);
    });
  }
  function regionLegend() {
    el.statesLegend.innerHTML = "";
    Object.keys(REGIONS).forEach(function (name) {
      const b = document.createElement("b");
      b.innerHTML = '<i style="background:' + REGIONS[name].color + '"></i>' + REGIONS[name].emoji + " " + name;
      el.statesLegend.appendChild(b);
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
  function show(node, on) { node.classList.toggle("hidden", !on); }

  function showInfo(name, sub, fact) {
    el.infoName.textContent = name;
    el.infoSub.textContent = sub || "";
    el.infoFact.textContent = fact || "";
    show(el.info, true);
  }

  /* =========================================================
     MODES
     ========================================================= */
  let mode = "continents";
  let onWorld = function () {};     // tapped a world cell
  let onState = function () {};     // tapped a state
  let timers = [];
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function stopTimers() { timers.forEach(clearTimeout); timers = []; }

  function setMode(next) {
    stopTimers();
    mode = next;
    el.modes.querySelectorAll(".mode-btn").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.mode === next));
    });
    el.actions.innerHTML = "";
    el.scorebar.innerHTML = "";
    el.stars.textContent = "";
    show(el.info, false);
    onWorld = function () {};
    onState = function () {};
    ({
      continents: modeContinents,
      oceans: modeOceans,
      states: modeStates,
      capitals: modeCapitals,
      atlas: modeAtlas
    }[next] || modeContinents)();
  }

  /* ---------------- shared quiz plumbing for the world map ---------------- */
  function worldQuiz(codes, what) {
    show(el.worldCard, true);
    show(el.statesCard, false);
    showLabels(false);
    legendFor(codes, el.worldLegend);

    let want = null, right = 0, asked = 0, streak = 0;
    let bag = [];

    function scores() {
      el.scorebar.innerHTML = "Right: <span>" + right + " / " + asked + "</span> &nbsp; Streak: <span>" +
        streak + "</span> &nbsp; Stars: <span>" + save.stars + "</span>";
    }

    function ask() {
      if (!bag.length) bag = codes.slice().sort(function () { return Math.random() - 0.5; });
      want = bag.pop();
      asked++;
      el.title.textContent = "Tap " + PLACES[want].name + " " + PLACES[want].emoji;
      el.text.textContent = "Find it on the map and tap it!";
      show(el.info, false);
      scores();
    }

    button("💡 Show me", function () {
      if (!want) return;
      litWorld(want, "lit", 1400);
      el.text.textContent = PLACES[want].where;
    }, true);
    button("⏭ Skip", function () { ask(); }, true);

    onWorld = function (code) {
      if (!want) return;
      if (code === want) {
        litWorld(want, "lit", 900);
        right++; streak++;
        save.stars++;
        if (streak > save.bestStreak) save.bestStreak = streak;
        save.seenPlaces[want] = true;
        persist();
        el.text.textContent = "Yes! That's " + PLACES[want].name + ". " + PLACES[want].where;
        showInfo(PLACES[want].emoji + " " + PLACES[want].name, "", PLACES[want].fact);
        el.stars.textContent = "⭐".repeat(Math.min(streak, 10));
        if (window.SFX) SFX.good();
        if (streak % 5 === 0 && window.Confetti) Confetti.burst({ count: 50 });
        scores();
        later(ask, 2200);
      } else if (PLACES[code]) {
        litWorld(code, "wrong", 700);
        streak = 0;
        el.text.textContent = "That's " + PLACES[code].name + " — keep looking for " +
          PLACES[want].name + "!";
        scores();
      }
    };

    el.stars.textContent = save.bestStreak ? "Best streak: " + save.bestStreak : "";
    ask();
    return { ask: ask };
  }

  function modeContinents() { worldQuiz(CONTINENTS, "continent"); }
  function modeOceans() { worldQuiz(OCEANS, "ocean"); }

  /* ---------------- 🗺️ Find a State ---------------- */
  function modeStates() {
    show(el.worldCard, false);
    show(el.statesCard, true);
    regionLegend();

    const codes = Object.keys(STATES);
    let want = null, right = 0, asked = 0, streak = 0, bag = [];

    function scores() {
      el.scorebar.innerHTML = "Right: <span>" + right + " / " + asked + "</span> &nbsp; Streak: <span>" +
        streak + "</span> &nbsp; States found: <span>" + Object.keys(save.seenStates).length + " / 50</span>";
    }

    function ask() {
      if (!bag.length) bag = codes.slice().sort(function () { return Math.random() - 0.5; });
      want = bag.pop();
      asked++;
      const s = STATES[want];
      el.title.textContent = "Find " + s[0] + "!";
      el.text.textContent = REGIONS[s[2]].emoji + " It's in the " + s[2] + " — look for the " +
        s[2].toLowerCase() + "-coloured squares.";
      show(el.info, false);
      scores();
    }

    button("💡 Show me", function () { if (want) litState(want, "lit", 1500); }, true);
    button("⏭ Skip", function () { ask(); }, true);

    onState = function (code) {
      if (!want) return;
      const s = STATES[want];
      if (code === want) {
        litState(code, "good", 1100);
        right++; streak++;
        save.stars++;
        save.seenStates[code] = true;
        if (streak > save.bestStreak) save.bestStreak = streak;
        persist();
        el.text.textContent = "Yes! " + s[0] + " — its capital is " + s[1] + ".";
        showInfo(s[0], "Capital: " + s[1] + "  •  " + REGIONS[s[2]].emoji + " " + s[2], s[3]);
        el.stars.textContent = "⭐".repeat(Math.min(streak, 10));
        if (window.SFX) SFX.good();
        if (streak % 5 === 0 && window.Confetti) Confetti.burst({ count: 50 });
        scores();
        later(ask, 2400);
      } else {
        litState(code, "bad", 700);
        streak = 0;
        const t = STATES[code];
        el.text.textContent = "That one is " + t[0] + " (" + t[2] + "). Keep looking for " + s[0] + "!";
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

    const codes = Object.keys(STATES);
    let want = null, right = 0, asked = 0, streak = 0, bag = [];

    function scores() {
      el.scorebar.innerHTML = "Right: <span>" + right + " / " + asked + "</span> &nbsp; Streak: <span>" +
        streak + "</span> &nbsp; Stars: <span>" + save.stars + "</span>";
    }

    function ask() {
      if (!bag.length) bag = codes.slice().sort(function () { return Math.random() - 0.5; });
      want = bag.pop();
      asked++;
      el.title.textContent = STATES[want][1] + " is the capital of…?";
      el.text.textContent = "Tap that state on the map.";
      show(el.info, false);
      scores();
    }

    button("💡 Show me", function () {
      if (!want) return;
      litState(want, "lit", 1500);
      el.text.textContent = "It's in the " + STATES[want][2] + " — " + STATES[want][0] + ".";
    }, true);
    button("⏭ Skip", function () { ask(); }, true);

    onState = function (code) {
      if (!want) return;
      const s = STATES[want];
      if (code === want) {
        litState(code, "good", 1100);
        right++; streak++;
        save.stars++;
        if (streak > save.bestStreak) save.bestStreak = streak;
        persist();
        el.text.textContent = "Right! " + s[1] + " is the capital of " + s[0] + ".";
        showInfo(s[0], "Capital: " + s[1] + "  •  " + REGIONS[s[2]].emoji + " " + s[2], s[3]);
        el.stars.textContent = "⭐".repeat(Math.min(streak, 10));
        if (window.SFX) SFX.good();
        if (streak % 5 === 0 && window.Confetti) Confetti.burst({ count: 50 });
        scores();
        later(ask, 2400);
      } else {
        litState(code, "bad", 700);
        streak = 0;
        const t = STATES[code];
        el.text.textContent = "That's " + t[0] + " — its capital is " + t[1] + ". Try again!";
        scores();
      }
    };

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
    el.text.textContent = "Tap anything — a continent, an ocean or a state — to find out about it.";
    el.scorebar.innerHTML = "Places read: <span>" +
      (Object.keys(save.seenPlaces).length + Object.keys(save.seenStates).length) + "</span>";

    onWorld = function (code) {
      const p = PLACES[code];
      if (!p) return;
      litWorld(code, "lit", 700);
      save.seenPlaces[code] = true;
      persist();
      showInfo(p.emoji + " " + p.name, p.kind === "ocean" ? "Ocean • " + p.where : "Continent • " + p.where, p.fact);
    };

    onState = function (code) {
      const s = STATES[code];
      if (!s) return;
      litState(code, "lit", 700);
      save.seenStates[code] = true;
      persist();
      showInfo(s[0] + " (" + code + ")", "Capital: " + s[1] + "  •  " + REGIONS[s[2]].emoji + " " + s[2], s[3]);
      el.scorebar.innerHTML = "Places read: <span>" +
        (Object.keys(save.seenPlaces).length + Object.keys(save.seenStates).length) + "</span>";
    };
  }

  /* =========================================================
     WIRING
     ========================================================= */
  buildWorld();
  buildStates();

  el.world.addEventListener("click", function (e) {
    const k = e.target && e.target.dataset && e.target.dataset.k;
    if (k) onWorld(k);
  });
  el.states.addEventListener("click", function (e) {
    const b = e.target.closest(".scell");
    if (b && b.dataset.s) onState(b.dataset.s);
  });
  el.modes.addEventListener("click", function (e) {
    const b = e.target.closest(".mode-btn");
    if (b) setMode(b.dataset.mode);
  });

  setMode("continents");
})();
