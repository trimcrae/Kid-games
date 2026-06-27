/* ===========================================================
   💰 Money Machine — a compound-interest game for Cory
   -----------------------------------------------------------
   Teaches: saving, interest rates, and the magic of COMPOUND
   interest (interest earning interest). You click through the
   years one at a time (or auto-play) and watch BOTH the big
   number AND the chart grow together, year by year.
   Inspired by "If You Made a Million" + billionaire tickers.
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
  ];

  // Milestones to chase — gives the game a goal to play toward.
  const GOALS = [1000, 10000, 100000, 1000000, 1000000000];

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

  // ---- Money formatting ----
  function money(n) {
    n = Math.round(n);
    return "$" + n.toLocaleString("en-US");
  }

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
      reset(); // a new place means a fresh machine
    });
    btn._place = p;
    placeGrid.appendChild(btn);
  });

  // ---- Slider labels + reset when settings change ----
  function refreshLabels() {
    $("startVal").textContent = money(+startAmt.value);
    $("addVal").textContent   = money(+addAmt.value);
  }
  [startAmt, addAmt].forEach((el) =>
    el.addEventListener("input", () => { refreshLabels(); save(); reset(); })
  );

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
    balance = +startAmt.value;
    putIn = +startAmt.value;
    history = [{ year: 0, balance: balance, putIn: putIn }];
    celebrated = {};

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
    drawBuyShelf(balance);
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

    balance = balance * (1 + selectedPlace.rate) + (+addAmt.value);
    putIn  += (+addAmt.value);
    year++;
    history.push({ year: year, balance: balance, putIn: putIn });

    // remove the empty placeholder on first real year
    const empty = $("chartEmpty");
    if (empty) empty.remove();

    addBar();
    rescaleChart();
    tweenTicker(prevBal, balance, prevPut, putIn, 600);
    $("tickerYear").textContent = "Year " + year +
      "  •  " + selectedPlace.emoji + " " + selectedPlace.note + " a year";
    updateGoal(false);
    drawBuyShelf(balance);

    if (year >= MAX_YEARS) {
      nextBtn.disabled = true;
      playBtn.disabled = true;
      stopPlay();
      $("tickerYear").textContent = "🏁 " + MAX_YEARS + " years! You ended with " + money(balance);
    }
  }

  // ---- Chart: add the newest bar (starts short, grows via rescale) ----
  function addBar() {
    const bar = document.createElement("div");
    bar.className = "bar pop";
    const segInt = document.createElement("div");
    segInt.className = "seg-int";
    const segPut = document.createElement("div");
    segPut.className = "seg-put";
    bar.appendChild(segInt);
    bar.appendChild(segPut);
    bar._row = history[history.length - 1];
    $("chart").appendChild(bar);
    barEls.push(bar);
    setTimeout(() => bar.classList.remove("pop"), 460);
  }

  // ---- Rescale every bar so the whole chart updates as money grows ----
  function rescaleChart() {
    const max = history[history.length - 1].balance || 1;
    barEls.forEach((bar) => {
      const r = bar._row;
      const interest = Math.max(0, r.balance - r.putIn);
      const barPct = (r.balance / max) * 100;
      bar.style.height = barPct + "%";
      bar.title = "Year " + r.year + ": " + money(r.balance);
      // segments are % of the bar's own height
      bar.children[0].style.height = (interest / r.balance) * 100 + "%"; // gold
      bar.children[1].style.height = (r.putIn / r.balance) * 100 + "%";  // blue
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

  function flashGoal(msg) {
    const goalText = $("goalText");
    goalText._flashing = true;
    goalText.textContent = msg;
    setTimeout(() => {
      goalText._flashing = false;
      updateGoal(true);
    }, 1600);
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

  // ---- Coin rain celebration ----
  function coinRain() {
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
  nextBtn.addEventListener("click", () => { stopPlay(); advanceYear(); });
  playBtn.addEventListener("click", togglePlay);
  resetBtn.addEventListener("click", reset);

  // ---- init ----
  load();
  reset();
})();
