/* ===========================================================
   💰 Money Machine — a compound-interest game for Cory
   -----------------------------------------------------------
   Teaches: saving, interest rates, and the magic of COMPOUND
   interest (interest earning interest). You click through the
   years one at a time (or auto-play) and watch BOTH the big
   number AND the chart grow together, year by year.
   Inspired by "If You Made a Million" + billionaire tickers.

   MONEY UNITS: everything in here is US dollars held as an
   INTEGER NUMBER OF CENTS. Interest is rounded to the nearest
   cent each year, exactly like a real bank statement, so the
   balance can never drift the way 0.1 + 0.2 does.
   =========================================================== */

(function () {
  "use strict";

  // Where you can keep your money — each has its own yearly interest rate.
  const PLACES = [
    { id: "piggy",   emoji: "🐷", name: "Piggy", rate: 0.00, note: "0%" },
    { id: "savings", emoji: "🏦", name: "Bank",  rate: 0.03, note: "3%" },
    { id: "bonds",   emoji: "📜", name: "Bonds", rate: 0.05, note: "5%" },
    { id: "stocks",  emoji: "📈", name: "Stocks", rate: 0.08, note: "8%" },
    { id: "biz",     emoji: "🚀", name: "Big Idea", rate: 0.15, note: "15%!" },
  ];

  // Fun things to buy, cheap → wildly expensive.
  const THINGS = [
    { emoji: "🍦", name: "Ice cream",  price: 4 },
    { emoji: "📗", name: "A book",     price: 12 },
    { emoji: "🎮", name: "Video game", price: 60 },
    { emoji: "🛴", name: "Scooter",    price: 120 },
    { emoji: "🚲", name: "Bike",       price: 300 },
    { emoji: "🐶", name: "Puppy",      price: 800 },
    { emoji: "💻", name: "Laptop",     price: 1500 },
    { emoji: "🛏️", name: "Bunk bed",   price: 3000 },
    { emoji: "🏝️", name: "Vacation",   price: 6000 },
    { emoji: "🚗", name: "A car",      price: 30000 },
    { emoji: "🏠", name: "A house",    price: 350000 },
    { emoji: "🏰", name: "A castle",   price: 5000000 },
  ].map(function (t) { return { emoji: t.emoji, name: t.name, price: t.price * 100 }; });

  // Milestones to chase — gives the game a goal to play toward. (cents)
  const GOALS = [1000, 10000, 100000, 1000000, 1000000000]
    .map(function (g) { return g * 100; });

  // Challenge trophies — real compound-interest lessons dressed as quests.
  // Each is checked after every year and stays won forever (localStorage).
  const CHALLENGES = [
    { id: "int1k",  emoji: "💸", name: "Free-Money Finder",
      desc: "Earn $1,000 of interest in one machine.",
      ok: (s) => s.interest >= 100000 },
    { id: "beatpig", emoji: "🐷", name: "Beat the Piggy",
      desc: "Earn MORE interest than all the money you put in.",
      ok: (s) => s.year > 0 && s.interest > s.putIn },
    { id: "nofeed", emoji: "🌱", name: "Money Gardener",
      desc: "Grow your start money 10× without adding a penny.",
      ok: (s) => s.add === 0 && s.year > 0 && s.balance >= s.start * 10 },
    { id: "year30", emoji: "⏳", name: "Patience Pays",
      desc: "Keep one machine running for 30 years.",
      ok: (s) => s.year >= 30 },
    { id: "mill50", emoji: "🚀", name: "Millionaire by 50",
      desc: "Reach $1,000,000 by year 50.",
      ok: (s) => s.balance >= 100000000 && s.year <= 50 },
  ];
  const TROPHY_KEY = "money-machine-trophies";
  let trophies = {};
  try { trophies = JSON.parse(localStorage.getItem(TROPHY_KEY)) || {}; } catch (e) {}

  const MAX_YEARS = 60;

  const $ = (id) => document.getElementById(id);

  // --- Controls ---
  const startAmt  = $("startAmt");
  const addAmt    = $("addAmt");
  const placeGrid = $("placeGrid");
  const nextBtn   = $("nextBtn");
  const playBtn   = $("playBtn");
  const resetBtn  = $("resetBtn");

  const SAVE_KEY = "money-machine-settings";
  const RUN_KEY  = "money-machine-run";   // so a half-played machine survives a reload
  let selectedPlace = PLACES[1]; // default: Bank

  // --- Game state ---
  let year = 0;
  let balance = 0;
  let putIn = 0;
  let history = [];        // [{ year, balance, putIn }]
  let barEls = [];         // DOM bars, one per year
  let playing = false;
  let playTimer = null;
  let tweenRAF = null;
  let celebrated = {};     // which goals we've already partied for
  let snowballed = false;  // did we celebrate the "snowball moment" yet?
  let doublings = 0;       // how many times the money has doubled this machine

  // ---- Money formatting (cents in, whole dollars out) ----
  function money(cents) {
    return "$" + Math.round(cents / 100).toLocaleString("en-US");
  }
  const dollarsToCents = (d) => Math.round(d * 100);

  // ---- Build the "where do you keep money" buttons ----
  PLACES.forEach((p) => {
    const btn = document.createElement("button");
    btn.className = "place";
    btn.type = "button";
    btn.innerHTML =
      '<span class="pemoji">' + p.emoji + "</span>" +
      '<span class="pname">' + p.name + "</span>" +
      '<span class="prate">' + p.note + "</span>";
    btn.addEventListener("click", () => {
      selectedPlace = p;
      [...placeGrid.children].forEach((c) => c.classList.remove("selected"));
      btn.classList.add("selected");
      save();
      clearRun();
      reset(); // a new place means a fresh machine
    });
    btn._place = p;
    placeGrid.appendChild(btn);
  });

  // ---- Slider labels + reset when settings change ----
  function refreshLabels() {
    $("startVal").textContent = money(dollarsToCents(+startAmt.value));
    $("addVal").textContent   = money(dollarsToCents(+addAmt.value));
  }
  [startAmt, addAmt].forEach((el) =>
    el.addEventListener("input", () => { refreshLabels(); save(); clearRun(); reset(); })
  );

  // ---- Save / load the machine that is running right now ----
  function saveRun() {
    try {
      localStorage.setItem(RUN_KEY, JSON.stringify({
        v: 2,
        place: selectedPlace.id,
        start: +startAmt.value,
        add: +addAmt.value,
        year: year,
        balance: balance,
        putIn: putIn,
        history: history,
        celebrated: Object.keys(celebrated),
        snowballed: snowballed,
        doublings: doublings,
      }));
    } catch (e) { /* ignore */ }
  }
  function clearRun() {
    try { localStorage.removeItem(RUN_KEY); } catch (e) { /* ignore */ }
  }
  /** Rebuild a saved machine, chart and all. Returns true if it worked. */
  function restoreRun() {
    let r = null;
    try { r = JSON.parse(localStorage.getItem(RUN_KEY)); } catch (e) {}
    if (!r || r.v !== 2 || !Array.isArray(r.history) || !r.history.length) return false;
    if (r.place !== selectedPlace.id) return false;
    if (r.start !== +startAmt.value || r.add !== +addAmt.value) return false;
    if (!Number.isFinite(r.balance) || !Number.isFinite(r.putIn)) return false;
    if (!Number.isInteger(r.year) || r.year < 1 || r.year > MAX_YEARS) return false;

    year = r.year;
    balance = Math.round(r.balance);
    putIn = Math.round(r.putIn);
    history = r.history;
    doublings = r.doublings || 0;
    snowballed = !!r.snowballed;
    celebrated = {};
    (r.celebrated || []).forEach(function (g) { celebrated[g] = true; });

    $("chart").innerHTML = "";
    barEls = [];
    history.forEach(function (row, i) { if (i > 0) addBar(row, true); });
    rescaleChart();
    setTicker(balance, putIn);
    $("tickerYear").textContent = "Year " + year + "  •  " +
      selectedPlace.emoji + " " + selectedPlace.note + " a year";
    updateGoal(true);
    updateDoubleLine();
    drawBuyShelf(balance);
    if (year >= MAX_YEARS) { nextBtn.disabled = true; playBtn.disabled = true; }
    return true;
  }

  // ---- Save / load settings ----
  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        start: +startAmt.value,
        add: +addAmt.value,
        place: selectedPlace.id,
      }));
    } catch (e) { /* ignore */ }
  }
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) {}
    if (s) {
      if (s.start) startAmt.value = s.start;
      if (s.add != null) addAmt.value = s.add;
      const p = PLACES.find((x) => x.id === s.place);
      if (p) selectedPlace = p;
    }
    [...placeGrid.children].forEach((c) =>
      c.classList.toggle("selected", c._place.id === selectedPlace.id)
    );
    refreshLabels();
  }

  // ---- Reset the machine back to year 0 ----
  function reset() {
    stopPlay();
    if (tweenRAF) { cancelAnimationFrame(tweenRAF); tweenRAF = null; }

    year = 0;
    balance = dollarsToCents(+startAmt.value);
    putIn = dollarsToCents(+startAmt.value);
    history = [{ year: 0, balance: balance, putIn: putIn }];
    celebrated = {};
    snowballed = false;
    doublings = 0;

    // clear chart
    const chart = $("chart");
    chart.innerHTML = '<div class="chart-empty" id="chartEmpty">' +
      "📊 Press <b>▶ Next Year</b> to watch your money grow!</div>";
    barEls = [];

    nextBtn.disabled = false;
    playBtn.disabled = false;
    setTicker(balance, putIn);
    $("tickerYear").textContent = "Year 0 — press ▶ Next Year!";
    updateGoal(true);
    updateDoubleLine();
    drawBuyShelf(balance);
    drawTrophies();
  }

  // ---- Rule of 72 — "when does my money double?" ----
  function updateDoubleLine() {
    const el = $("doubleLine");
    if (!el) return;
    const rate = selectedPlace.rate;
    if (rate <= 0) {
      el.innerHTML = "🐷 At 0% your money <b>never doubles by itself</b> — try the bank!";
    } else {
      const yrs = Math.round(72 / (rate * 100));
      el.innerHTML = "✨ Rule of 72: at " + selectedPlace.note.replace("!", "") +
        " your money <b>doubles about every " + yrs + " years</b>" +
        (doublings > 0
          ? " — your pot is already <b>" + Math.pow(2, doublings) +
            "×</b> the money you put in!"
          : "!");
    }
  }

  // ---- Set the big ticker instantly ----
  function setTicker(bal, put) {
    $("ticker").textContent = money(bal);
    $("putVal").textContent = money(put);
    $("intVal").textContent = money(Math.max(0, bal - put));
  }

  // ---- Smoothly tween the ticker between two values ----
  function tweenTicker(fromBal, toBal, fromPut, toPut, dur) {
    if (tweenRAF) { cancelAnimationFrame(tweenRAF); tweenRAF = null; }
    const startT = performance.now();
    function step(now) {
      let t = (now - startT) / dur;
      if (t > 1) t = 1;
      const e = 1 - Math.pow(1 - t, 3); // ease-out
      setTicker(fromBal + (toBal - fromBal) * e,
                fromPut + (toPut - fromPut) * e);
      if (t < 1) {
        tweenRAF = requestAnimationFrame(step);
      } else {
        tweenRAF = null;
        setTicker(toBal, toPut);
      }
    }
    tweenRAF = requestAnimationFrame(step);
  }

  // ---- Advance one year ----
  function advanceYear() {
    if (year >= MAX_YEARS) { stopPlay(); return; }

    const prevBal = balance;
    const prevPut = putIn;
    // Round the interest to the nearest cent, like a real bank statement.
    const yearlyInterest = Math.round(balance * selectedPlace.rate);
    const deposit = dollarsToCents(+addAmt.value);

    balance = balance + yearlyInterest + deposit;
    putIn  += deposit;
    year++;
    history.push({ year: year, balance: balance, putIn: putIn });

    // 💥 Doubling moments: interest has made the pot 2×, 4×, 8×… what you put in.
    while (balance >= putIn * Math.pow(2, doublings + 1)) {
      doublings++;
      flashGoal("💥 DOUBLED! Your pot is now " + Math.pow(2, doublings) +
        "× the money you put in!");
      window.SFX && SFX.coin();
    }

    // 🤯 The snowball moment: interest now adds more each year than YOU do.
    if (!snowballed && deposit > 0 && yearlyInterest > deposit) {
      snowballed = true;
      flashGoal("🤯 Snowball! Interest now adds more each year than you do!");
      coinRain();
      window.SFX && SFX.win && SFX.win();
    }

    checkChallenges();

    // remove the empty placeholder on first real year
    const empty = $("chartEmpty");
    if (empty) empty.remove();

    addBar(history[history.length - 1]);
    rescaleChart();
    tweenTicker(prevBal, balance, prevPut, putIn, 600);
    $("tickerYear").textContent = "Year " + year +
      "  •  " + selectedPlace.emoji + " " + selectedPlace.note + " a year";
    updateGoal(false);
    updateDoubleLine();
    drawBuyShelf(balance);
    saveRun();

    if (year >= MAX_YEARS) {
      nextBtn.disabled = true;
      playBtn.disabled = true;
      stopPlay();
      $("tickerYear").textContent = "🏁 " + MAX_YEARS + " years! You ended with " + money(balance);
    }
  }

  // ---- Chart: add the newest bar (starts short, grows via rescale) ----
  function addBar(row, quiet) {
    const bar = document.createElement("div");
    bar.className = "bar" + (quiet ? "" : " pop");
    const segInt = document.createElement("div");
    segInt.className = "seg-int";
    const segPut = document.createElement("div");
    segPut.className = "seg-put";
    bar.appendChild(segInt);
    bar.appendChild(segPut);
    bar._row = row || history[history.length - 1];
    $("chart").appendChild(bar);
    barEls.push(bar);
    if (!quiet) setTimeout(() => bar.classList.remove("pop"), 460);
  }

  // ---- Rescale every bar so the whole chart updates as money grows ----
  function rescaleChart() {
    const max = history[history.length - 1].balance || 1;
    barEls.forEach((bar) => {
      const r = bar._row;
      const interest = Math.max(0, r.balance - r.putIn);
      const safe = r.balance || 1;
      const barPct = (r.balance / max) * 100;
      bar.style.height = barPct + "%";
      bar.title = "Year " + r.year + ": " + money(r.balance);
      // segments are % of the bar's own height
      bar.children[0].style.height = (interest / safe) * 100 + "%"; // gold
      bar.children[1].style.height = (r.putIn / safe) * 100 + "%";  // blue
    });
  }

  // ---- Goal / milestone tracking ----
  function updateGoal(silent) {
    const goal = GOALS.find((g) => g > balance);

    // celebrate any goals we just crossed
    GOALS.forEach((g) => {
      if (balance >= g && !celebrated[g]) {
        celebrated[g] = true;
        if (!silent) {
          flashGoal("🎉 You reached " + money(g) + "!");
          coinRain();
          window.SFX && SFX.coin();
          window.Confetti && Confetti.burst({ count: 90 });
        }
      }
    });

    const goalText = $("goalText");
    const fill = $("goalFill");
    if (!goal) {
      goalText.textContent = "👑 BILLIONAIRE! You beat every goal!";
      fill.style.width = "100%";
      return;
    }
    // base = previous goal (so the bar fills nicely between milestones)
    const idx = GOALS.indexOf(goal);
    const base = idx > 0 ? GOALS[idx - 1] : 0;
    const pct = Math.max(0, Math.min(100,
      ((balance - base) / (goal - base)) * 100));
    fill.style.width = pct + "%";
    if (!goalText._flashing) {
      goalText.textContent = "🎯 Next goal: " + money(goal);
    }
  }

  let flashTimer = null;
  function flashGoal(msg) {
    const goalText = $("goalText");
    goalText._flashing = true;
    goalText.textContent = msg;
    if (flashTimer) clearTimeout(flashTimer);   // last message wins, no half-erased text
    flashTimer = setTimeout(() => {
      flashTimer = null;
      goalText._flashing = false;
      updateGoal(true);
    }, 1800);
  }

  // ---- "What can you buy" strip (sorted: best affordable first) ----
  function drawBuyShelf(total) {
    const grid = $("buyGrid");
    grid.innerHTML = "";
    // show affordable items (most expensive first) then the next dreams
    const afford = THINGS.filter((t) => total >= t.price)
      .sort((a, b) => b.price - a.price);
    const cant = THINGS.filter((t) => total < t.price)
      .sort((a, b) => a.price - b.price);
    const ordered = afford.concat(cant);

    ordered.forEach((item) => {
      const can = total >= item.price;
      const count = Math.floor(total / item.price);
      const el = document.createElement("div");
      el.className = "buy-item " + (can ? "afford" : "cant");
      const countLine = can
        ? '<span class="bcount">' + count.toLocaleString("en-US") + "×</span>"
        : '<span class="bcount" style="color:#b9b3cc">not yet</span>';
      el.innerHTML =
        '<span class="bemoji">' + item.emoji + "</span>" +
        '<span class="bname">' + item.name + "</span>" +
        '<span class="bprice">' + money(item.price) + "</span>" +
        countLine;
      grid.appendChild(el);
    });
  }

  // ---- Challenge trophies ----
  function checkChallenges() {
    const snap = {
      year: year,
      balance: balance,
      putIn: putIn,
      interest: Math.max(0, balance - putIn),
      start: dollarsToCents(+startAmt.value),   // cents, like balance
      add: dollarsToCents(+addAmt.value),
    };
    let won = null;
    CHALLENGES.forEach((c) => {
      if (!trophies[c.id] && c.ok(snap)) {
        trophies[c.id] = true;
        won = c;
      }
    });
    if (won) {
      try { localStorage.setItem(TROPHY_KEY, JSON.stringify(trophies)); } catch (e) {}
      flashGoal("🏆 Trophy won: " + won.emoji + " " + won.name + "!");
      coinRain();
      window.SFX && SFX.win && SFX.win();
      window.Confetti && Confetti.burst({ count: 110 });
      drawTrophies();
    }
  }

  function drawTrophies() {
    const grid = $("trophyGrid");
    if (!grid) return;
    grid.innerHTML = "";
    CHALLENGES.forEach((c) => {
      const got = !!trophies[c.id];
      const el = document.createElement("div");
      el.className = "trophy " + (got ? "won" : "todo");
      el.innerHTML =
        '<span class="temoji">' + (got ? "🏆" : c.emoji) + "</span>" +
        '<span class="tinfo"><b>' + c.name + "</b>" +
        '<small>' + c.desc + "</small></span>" +
        '<span class="tstate">' + (got ? "✓" : "···") + "</span>";
      grid.appendChild(el);
    });
  }

  // ---- Coin rain celebration ----
  const CALM = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function coinRain() {
    if (CALM) return;              // calm mode: no falling coins
    const card = $("tickerCard");
    const coins = ["💰", "🪙", "💵", "✨"];
    for (let i = 0; i < 14; i++) {
      const c = document.createElement("span");
      c.className = "coin-rain";
      c.textContent = coins[i % coins.length];
      c.style.left = (i / 14) * 92 + "%";
      c.style.animationDelay = (i % 5) * 0.12 + "s";
      card.appendChild(c);
      setTimeout(() => c.remove(), 2400);
    }
  }

  // ---- Auto-play ----
  function startPlay() {
    if (playing || year >= MAX_YEARS) return;
    playing = true;
    playBtn.textContent = "⏸ Pause";
    advanceYear();
    playTimer = setInterval(() => {
      if (year >= MAX_YEARS) { stopPlay(); return; }
      advanceYear();
    }, 800);
  }
  function stopPlay() {
    playing = false;
    if (playTimer) { clearInterval(playTimer); playTimer = null; }
    playBtn.textContent = "⏩ Auto-Play";
  }
  function togglePlay() {
    if (playing) stopPlay(); else startPlay();
  }

  // ---- Wire up buttons ----
  nextBtn.addEventListener("click", () => {
    stopPlay();
    window.SFX && SFX.pop && SFX.pop();
    advanceYear();
  });
  playBtn.addEventListener("click", togglePlay);
  resetBtn.addEventListener("click", () => { clearRun(); reset(); });

  // Keyboard: N = next year, P = play/pause (only while this tab is open)
  document.addEventListener("keydown", (e) => {
    const panel = $("panelMachine");
    if (panel && panel.hidden) return;
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea") return;
    if (e.key === "n" || e.key === "N") { nextBtn.click(); e.preventDefault(); }
    if (e.key === "p" || e.key === "P") { playBtn.click(); e.preventDefault(); }
  });

  // Coin School owns the tabs; it pokes us when the machine becomes visible.
  window.MoneyMachine = {
    refresh() { rescaleChart(); },
    year: () => year,
    balanceCents: () => balance,
  };

  // ---- init ----
  load();
  reset();
  restoreRun();   // pick up a half-played machine if the settings still match
})();
