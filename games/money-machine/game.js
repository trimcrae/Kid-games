/* ===========================================================
   💰 Money Machine — a compound-interest game for Cory
   -----------------------------------------------------------
   Teaches: saving, interest rates, and the magic of COMPOUND
   interest (interest earning interest). Inspired by the book
   "If You Made a Million" and live billionaire net-worth tickers.
   =========================================================== */

(function () {
  "use strict";

  // Where you can keep your money — each has its own yearly interest rate.
  const PLACES = [
    { id: "piggy",   emoji: "🐷", name: "Piggy Bank", rate: 0.00, note: "No interest" },
    { id: "savings", emoji: "🏦", name: "Savings",    rate: 0.03, note: "3% a year" },
    { id: "bonds",   emoji: "📜", name: "Bonds",      rate: 0.05, note: "5% a year" },
    { id: "stocks",  emoji: "📈", name: "Stocks",     rate: 0.08, note: "8% a year" },
    { id: "biz",     emoji: "🚀", name: "Big Idea",   rate: 0.15, note: "15% a year!" },
  ];

  // Fun things to buy, cheap → wildly expensive (If You Made a Million vibes).
  const THINGS = [
    { emoji: "🍦", name: "Ice cream",   price: 4 },
    { emoji: "📗", name: "A book",      price: 12 },
    { emoji: "🎮", name: "Video game",  price: 60 },
    { emoji: "🛴", name: "Scooter",     price: 120 },
    { emoji: "🚲", name: "Bike",        price: 300 },
    { emoji: "🐶", name: "Puppy",       price: 800 },
    { emoji: "💻", name: "Laptop",      price: 1500 },
    { emoji: "🛏️", name: "Bunk bed",    price: 3000 },
    { emoji: "🏝️", name: "Vacation",    price: 6000 },
    { emoji: "🚗", name: "A car",       price: 30000 },
    { emoji: "🏠", name: "A house",     price: 350000 },
    { emoji: "🏝️", name: "An island",   price: 5000000 },
  ];

  const $ = (id) => document.getElementById(id);

  // --- Controls ---
  const startAmt = $("startAmt");
  const addAmt   = $("addAmt");
  const years    = $("years");
  const placeGrid = $("placeGrid");
  const growBtn  = $("growBtn");

  const SAVE_KEY = "money-machine-settings";
  let selectedPlace = PLACES[1]; // default: Savings

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
    });
    btn._place = p;
    placeGrid.appendChild(btn);
  });

  // ---- Money formatting ----
  function money(n) {
    n = Math.round(n);
    return "$" + n.toLocaleString("en-US");
  }

  // ---- Keep the slider labels live ----
  function refreshLabels() {
    $("startVal").textContent = money(+startAmt.value);
    $("addVal").textContent   = money(+addAmt.value);
    const y = +years.value;
    $("yearsVal").textContent = y + (y === 1 ? " year" : " years");
  }
  [startAmt, addAmt, years].forEach((el) =>
    el.addEventListener("input", () => { refreshLabels(); save(); })
  );

  // ---- Core math: build the year-by-year story ----
  // Compound interest: each year the WHOLE balance earns interest,
  // including last year's interest. Then we add this year's deposit.
  function simulate() {
    const start = +startAmt.value;
    const add   = +addAmt.value;
    const yrs   = +years.value;
    const rate  = selectedPlace.rate;

    const rows = [];
    let balance = start;
    let putIn = start; // total money YOU put in (no interest)

    rows.push({ year: 0, balance: balance, putIn: putIn });

    for (let y = 1; y <= yrs; y++) {
      balance = balance * (1 + rate); // interest on everything
      balance += add;                 // your yearly deposit
      putIn += add;
      rows.push({ year: y, balance: balance, putIn: putIn });
    }
    return { rows: rows, rate: rate };
  }

  // ---- Save / load settings ----
  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        start: +startAmt.value,
        add: +addAmt.value,
        years: +years.value,
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
      if (s.years) years.value = s.years;
      const p = PLACES.find((x) => x.id === s.place);
      if (p) selectedPlace = p;
    }
    // mark the selected place button
    [...placeGrid.children].forEach((c) =>
      c.classList.toggle("selected", c._place.id === selectedPlace.id)
    );
    refreshLabels();
  }

  // ---- Coin rain celebration ----
  function coinRain() {
    const card = $("tickerCard");
    const coins = ["💰", "🪙", "💵", "✨"];
    for (let i = 0; i < 14; i++) {
      const c = document.createElement("span");
      c.className = "coin-rain";
      c.textContent = coins[i % coins.length];
      c.style.left = Math.random() * 92 + "%";
      c.style.animationDelay = (Math.random() * 0.6) + "s";
      card.appendChild(c);
      setTimeout(() => c.remove(), 2200);
    }
  }

  // ---- Animate the big ticker counting up through the years ----
  let animTimer = null;
  function runAnimation(result) {
    if (animTimer) { clearInterval(animTimer); animTimer = null; }

    const rows = result.rows;
    const finalRow = rows[rows.length - 1];
    const totalFrames = 60;       // smooth count-up
    let frame = 0;

    const tickerEl = $("ticker");
    const yearEl   = $("tickerYear");
    const putEl    = $("putVal");
    const intEl    = $("intVal");

    animTimer = setInterval(() => {
      frame++;
      const t = frame / totalFrames;            // 0 → 1
      const pos = t * (rows.length - 1);        // position along the years
      const i = Math.min(Math.floor(pos), rows.length - 2);
      const f = pos - i;
      const a = rows[i], b = rows[i + 1];
      const bal   = a.balance + (b.balance - a.balance) * f;
      const putIn = a.putIn + (b.putIn - a.putIn) * f;
      const yearNow = Math.round(a.year + (b.year - a.year) * f);

      tickerEl.textContent = money(bal);
      yearEl.textContent = "Year " + yearNow + " of " + finalRow.year;
      putEl.textContent = money(putIn);
      intEl.textContent = money(bal - putIn);

      if (frame >= totalFrames) {
        clearInterval(animTimer);
        animTimer = null;
        // snap to exact final values
        tickerEl.textContent = money(finalRow.balance);
        yearEl.textContent = "🎉 After " + finalRow.year +
          (finalRow.year === 1 ? " year" : " years") + "!";
        putEl.textContent = money(finalRow.putIn);
        intEl.textContent = money(finalRow.balance - finalRow.putIn);
        coinRain();
      }
    }, 28);
  }

  // ---- Draw the stacked bar chart (blue = put in, gold = interest) ----
  function drawChart(rows) {
    const chart = $("chart");
    chart.innerHTML = "";
    const max = rows[rows.length - 1].balance || 1;

    rows.forEach((r) => {
      const interest = Math.max(0, r.balance - r.putIn);
      const bar = document.createElement("div");
      bar.className = "bar";
      bar.title = "Year " + r.year + ": " + money(r.balance);

      const intH = (interest / max) * 100;
      const putH = (r.putIn / max) * 100;

      const segInt = document.createElement("div");
      segInt.className = "seg-int";
      segInt.style.height = intH + "%";

      const segPut = document.createElement("div");
      segPut.className = "seg-put";
      segPut.style.height = putH + "%";

      bar.appendChild(segInt);
      bar.appendChild(segPut);
      chart.appendChild(bar);
    });
  }

  // ---- The "what can you buy" shelf ----
  function drawBuyShelf(total) {
    const grid = $("buyGrid");
    grid.innerHTML = "";
    THINGS.forEach((item) => {
      const can = total >= item.price;
      const count = Math.floor(total / item.price);
      const el = document.createElement("div");
      el.className = "buy-item " + (can ? "afford" : "cant");
      let countLine = "";
      if (can) {
        countLine = '<span class="bcount">' +
          (count >= 1000 ? count.toLocaleString("en-US") : count) +
          (count === 1 ? " of these!" : " of these!") + "</span>";
      } else {
        countLine = '<span class="bcount" style="color:#b9b3cc">not yet</span>';
      }
      el.innerHTML =
        '<span class="bemoji">' + item.emoji + "</span>" +
        '<span class="bname">' + item.name + "</span>" +
        '<span class="bprice">' + money(item.price) + "</span>" +
        countLine;
      grid.appendChild(el);
    });
  }

  // ---- The magic note comparing compound vs just saving ----
  function magicNote(result) {
    const rows = result.rows;
    const finalRow = rows[rows.length - 1];
    const interest = finalRow.balance - finalRow.putIn;
    const note = $("magicNote");

    if (result.rate === 0) {
      note.innerHTML = "🐷 A piggy bank earns <b>no interest</b> — you only get out what " +
        "you put in (" + money(finalRow.balance) + "). Try a <b>bank, bonds or stocks</b> " +
        "and watch the gold appear!";
      return;
    }

    note.innerHTML = "✨ <b>Magic!</b> You put in <b>" + money(finalRow.putIn) +
      "</b>, but the interest gave you an <b>extra " + money(interest) +
      "</b> for free — so you ended with <b>" + money(finalRow.balance) +
      "</b>. The longer you wait, the more the gold grows by itself! 🌱➡️🌳";
  }

  // ---- GO! ----
  function grow() {
    const result = simulate();
    $("resultsPanel").classList.remove("hidden");
    $("buyPanel").classList.remove("hidden");

    runAnimation(result);
    drawChart(result.rows);
    magicNote(result);
    drawBuyShelf(result.rows[result.rows.length - 1].balance);

    // smooth-scroll the chart into view so the kid sees it grow
    setTimeout(() => {
      $("resultsPanel").scrollIntoView({ behavior: "smooth", block: "center" });
    }, 700);
  }

  growBtn.addEventListener("click", grow);

  // ---- init ----
  load();
})();
