/* ===========================================================
   Unit Converter — for Cory!
   -----------------------------------------------------------
   Convert ANY unit into EVERY other unit at once, across SI,
   imperial and mixed categories. Type a number, pick a unit,
   and the whole table updates live. Tap any row to convert
   from that unit instead.

   Each unit is either linear:   { n, sym, full, sys, factor }
     (value_in_base = value * factor)
   or has custom maths:          { n, sym, full, sys, to, from }
     (to: unit->base, from: base->unit) — used for temperature.

   "sys" = si | imp | mix  (just for a little coloured tag / facts)
   =========================================================== */
(function () {
  "use strict";

  // ---- The data: categories, each with a list of units ----------------
  const CATS = [
    {
      key: "length", label: "📏 Length", base: "metre",
      fact: "A blue whale is about <b>30 m</b> long — that's nearly <b>100 feet</b>! Light travels <b>300,000 km</b> in a single second. 🐋",
      units: [
        { n: "Millimetre", sym: "mm",  sys: "si",  factor: 0.001 },
        { n: "Centimetre", sym: "cm",  sys: "si",  factor: 0.01 },
        { n: "Metre",      sym: "m",   sys: "si",  factor: 1 },
        { n: "Kilometre",  sym: "km",  sys: "si",  factor: 1000 },
        { n: "Inch",       sym: "in",  sys: "imp", factor: 0.0254 },
        { n: "Foot",       sym: "ft",  sys: "imp", factor: 0.3048 },
        { n: "Yard",       sym: "yd",  sys: "imp", factor: 0.9144 },
        { n: "Mile",       sym: "mi",  sys: "imp", factor: 1609.344 },
        { n: "Nautical mile", sym: "nmi", sys: "mix", factor: 1852 },
        { n: "Micron",     sym: "µm",  sys: "si",  factor: 0.000001 },
        { n: "Hand",       sym: "hh",  sys: "imp", factor: 0.1016 },
        { n: "Light-year", sym: "ly",  sys: "mix", factor: 9.4607e15 }
      ]
    },
    {
      key: "mass", label: "⚖️ Weight / Mass", base: "kilogram",
      fact: "1 <b>kilogram</b> is about the weight of a pineapple 🍍. 1 <b>tonne</b> (1000 kg) is about one small car! An adult African elephant is around <b>6 tonnes</b>. 🐘",
      units: [
        { n: "Milligram",  sym: "mg", sys: "si",  factor: 0.000001 },
        { n: "Gram",       sym: "g",  sys: "si",  factor: 0.001 },
        { n: "Kilogram",   sym: "kg", sys: "si",  factor: 1 },
        { n: "Tonne",      sym: "t",  sys: "si",  factor: 1000 },
        { n: "Ounce",      sym: "oz", sys: "imp", factor: 0.0283495 },
        { n: "Pound",      sym: "lb", sys: "imp", factor: 0.453592 },
        { n: "Stone",      sym: "st", sys: "imp", factor: 6.35029 },
        { n: "US ton",     sym: "ton (US)", sys: "imp", factor: 907.185 },
        { n: "Imperial ton", sym: "ton (UK)", sys: "imp", factor: 1016.05 }
      ]
    },
    {
      key: "temp", label: "🌡️ Temperature", base: "°C",
      fact: "Water freezes at <b>0°C</b> (32°F) and boils at <b>100°C</b> (212°F). Your body is about <b>37°C</b> (98.6°F). The coldest possible temperature is <b>0 Kelvin</b> — nothing can be colder! ❄️",
      units: [
        { n: "Celsius",    sym: "°C", sys: "si",  to: c => c,               from: c => c },
        { n: "Fahrenheit", sym: "°F", sys: "imp", to: f => (f - 32) * 5/9,  from: c => c * 9/5 + 32 },
        { n: "Kelvin",     sym: "K",  sys: "si",  to: k => k - 273.15,      from: c => c + 273.15 }
      ]
    },
    {
      key: "volume", label: "🥤 Volume", base: "litre",
      fact: "A US <b>gallon</b> (3.79 L) is smaller than an imperial <b>gallon</b> (4.55 L)! A big soda bottle is <b>2 litres</b>. A teaspoon is only <b>5 mL</b>. 🥄",
      units: [
        { n: "Millilitre",  sym: "mL",  sys: "si",  factor: 0.001 },
        { n: "Litre",       sym: "L",   sys: "si",  factor: 1 },
        { n: "Cubic metre", sym: "m³",  sys: "si",  factor: 1000 },
        { n: "Teaspoon",    sym: "tsp", sys: "mix", factor: 0.00492892 },
        { n: "Tablespoon",  sym: "tbsp", sys: "mix", factor: 0.0147868 },
        { n: "Fluid ounce (US)", sym: "fl oz", sys: "imp", factor: 0.0295735 },
        { n: "Cup (US)",    sym: "cup", sys: "imp", factor: 0.236588 },
        { n: "Pint (US)",   sym: "pt",  sys: "imp", factor: 0.473176 },
        { n: "Quart (US)",  sym: "qt",  sys: "imp", factor: 0.946353 },
        { n: "Gallon (US)", sym: "gal (US)", sys: "imp", factor: 3.78541 },
        { n: "Gallon (imperial)", sym: "gal (UK)", sys: "imp", factor: 4.54609 }
      ]
    },
    {
      key: "area", label: "🟩 Area", base: "square metre",
      fact: "A <b>hectare</b> (10,000 m²) is about the size of a rugby field. An <b>acre</b> is a bit smaller — the old idea was how much land an ox could plough in a day! 🐂",
      units: [
        { n: "Square millimetre", sym: "mm²", sys: "si",  factor: 0.000001 },
        { n: "Square centimetre", sym: "cm²", sys: "si",  factor: 0.0001 },
        { n: "Square metre",      sym: "m²",  sys: "si",  factor: 1 },
        { n: "Hectare",           sym: "ha",  sys: "si",  factor: 10000 },
        { n: "Square kilometre",  sym: "km²", sys: "si",  factor: 1000000 },
        { n: "Square inch",       sym: "in²", sys: "imp", factor: 0.00064516 },
        { n: "Square foot",       sym: "ft²", sys: "imp", factor: 0.092903 },
        { n: "Square yard",       sym: "yd²", sys: "imp", factor: 0.836127 },
        { n: "Acre",              sym: "ac",  sys: "imp", factor: 4046.86 },
        { n: "Square mile",       sym: "mi²", sys: "imp", factor: 2589988 }
      ]
    },
    {
      key: "speed", label: "🏎️ Speed", base: "metre / second",
      fact: "A cheetah runs about <b>100 km/h</b> (60 mph) 🐆. Sound travels at <b>343 m/s</b>. A <b>knot</b> is one nautical mile per hour — used by boats and planes. ⛵",
      units: [
        { n: "Metre / second",     sym: "m/s",  sys: "si",  factor: 1 },
        { n: "Kilometre / hour",   sym: "km/h", sys: "si",  factor: 0.277778 },
        { n: "Mile / hour",        sym: "mph",  sys: "imp", factor: 0.44704 },
        { n: "Foot / second",      sym: "ft/s", sys: "imp", factor: 0.3048 },
        { n: "Knot",               sym: "kn",   sys: "mix", factor: 0.514444 }
      ]
    },
    {
      key: "time", label: "⏱️ Time", base: "second",
      fact: "There are <b>86,400 seconds</b> in a day and about <b>31.5 million</b> in a year! A blink takes about <b>0.1 s</b>. ⏳",
      units: [
        { n: "Millisecond", sym: "ms",   sys: "si",  factor: 0.001 },
        { n: "Second",      sym: "s",    sys: "si",  factor: 1 },
        { n: "Minute",      sym: "min",  sys: "si",  factor: 60 },
        { n: "Hour",        sym: "hr",   sys: "si",  factor: 3600 },
        { n: "Day",         sym: "day",  sys: "si",  factor: 86400 },
        { n: "Week",        sym: "wk",   sys: "si",  factor: 604800 },
        { n: "Year",        sym: "yr",   sys: "si",  factor: 31557600 }
      ]
    },
    {
      key: "energy", label: "🔋 Energy", base: "joule",
      fact: "A food <b>Calorie</b> is really a kilocalorie — 1000 little calories! A <b>kWh</b> (what your electric bill counts) is 3.6 million joules. ⚡",
      units: [
        { n: "Joule",           sym: "J",    sys: "si",  factor: 1 },
        { n: "Kilojoule",       sym: "kJ",   sys: "si",  factor: 1000 },
        { n: "Calorie",         sym: "cal",  sys: "mix", factor: 4.184 },
        { n: "Food Calorie",    sym: "kcal", sys: "mix", factor: 4184 },
        { n: "Watt-hour",       sym: "Wh",   sys: "si",  factor: 3600 },
        { n: "Kilowatt-hour",   sym: "kWh",  sys: "si",  factor: 3600000 }
      ]
    },
    {
      key: "power", label: "💡 Power", base: "watt",
      fact: "One <b>horsepower</b> (746 watts) really was measured from a working horse! A bright bulb is about <b>100 W</b>; a small car engine is around <b>100 hp</b>. 🐴",
      units: [
        { n: "Watt",       sym: "W",  sys: "si",  factor: 1 },
        { n: "Kilowatt",   sym: "kW", sys: "si",  factor: 1000 },
        { n: "Megawatt",   sym: "MW", sys: "si",  factor: 1000000 },
        { n: "Horsepower", sym: "hp", sys: "imp", factor: 745.7 }
      ]
    },
    {
      key: "pressure", label: "🎈 Pressure", base: "pascal",
      fact: "The air around you pushes at about <b>1 atmosphere</b> (101,325 Pa). A car tyre is around <b>32 psi</b>. Weather maps use <b>bars</b> and millibars. 🌦️",
      units: [
        { n: "Pascal",       sym: "Pa",   sys: "si",  factor: 1 },
        { n: "Kilopascal",   sym: "kPa",  sys: "si",  factor: 1000 },
        { n: "Bar",          sym: "bar",  sys: "mix", factor: 100000 },
        { n: "Atmosphere",   sym: "atm",  sys: "mix", factor: 101325 },
        { n: "Pound / sq in", sym: "psi", sys: "imp", factor: 6894.76 },
        { n: "mm of mercury", sym: "mmHg", sys: "mix", factor: 133.322 }
      ]
    },
    {
      key: "data", label: "💾 Data", base: "byte",
      fact: "8 <b>bits</b> = 1 <b>byte</b> (one letter). Computers really count in powers of 2, so a <b>kibibyte</b> is 1024 bytes, not 1000! A photo is a few <b>megabytes</b>. 🖼️",
      units: [
        { n: "Bit",       sym: "bit", sys: "si",  factor: 0.125 },
        { n: "Byte",      sym: "B",   sys: "si",  factor: 1 },
        { n: "Kilobyte",  sym: "KB",  sys: "si",  factor: 1000 },
        { n: "Megabyte",  sym: "MB",  sys: "si",  factor: 1e6 },
        { n: "Gigabyte",  sym: "GB",  sys: "si",  factor: 1e9 },
        { n: "Terabyte",  sym: "TB",  sys: "si",  factor: 1e12 },
        { n: "Kibibyte",  sym: "KiB", sys: "mix", factor: 1024 },
        { n: "Mebibyte",  sym: "MiB", sys: "mix", factor: 1048576 },
        { n: "Gibibyte",  sym: "GiB", sys: "mix", factor: 1073741824 }
      ]
    },
    {
      key: "angle", label: "📐 Angle", base: "degree",
      fact: "A full turn is <b>360 degrees</b> — the Babylonians picked 360 thousands of years ago! Mathematicians love <b>radians</b>: a full circle is 2π (about 6.28) of them. 🔄",
      units: [
        { n: "Degree",   sym: "°",    sys: "mix", factor: 1 },
        { n: "Radian",   sym: "rad",  sys: "si",  factor: 57.29578 },
        { n: "Gradian",  sym: "grad", sys: "mix", factor: 0.9 },
        { n: "Full turn", sym: "turn", sys: "mix", factor: 360 },
        { n: "Arcminute", sym: "′",    sys: "mix", factor: 1/60 }
      ]
    }
  ];

  // ---- Convert helpers -------------------------------------------------
  function toBase(unit, v)  { return unit.to   ? unit.to(v)   : v * unit.factor; }
  function fromBase(unit, b){ return unit.from ? unit.from(b) : b / unit.factor; }

  // Friendly number formatting: readable, no ugly floating-point tails.
  function fmt(x) {
    if (!isFinite(x)) return "—";
    if (x === 0) return "0";
    const a = Math.abs(x);
    if (a >= 1e15 || a < 1e-6) {
      return x.toExponential(3).replace(/e([+-])(\d)$/, "e$10$2");
    }
    // round to ~7 significant figures, then trim trailing zeros
    let s = Number(x.toPrecision(7)).toString();
    // add thousands separators to the integer part for readability
    if (s.indexOf("e") === -1) {
      const neg = s[0] === "-";
      if (neg) s = s.slice(1);
      const parts = s.split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      s = (neg ? "-" : "") + parts.join(".");
    }
    return s;
  }

  // ---- State + DOM -----------------------------------------------------
  const $ = id => document.getElementById(id);
  const KEY = "unitConverter";
  let cat = CATS[0];
  let fromIdx = 2; // sensible default (metre)

  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "{}");
      const c = CATS.find(k => k.key === s.cat);
      if (c) { cat = c; fromIdx = Math.min(s.from || 0, cat.units.length - 1); }
      if (s.value != null) $("value").value = s.value;
    } catch (e) {}
  }
  function saveState() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        cat: cat.key, from: fromIdx, value: $("value").value
      }));
    } catch (e) {}
  }

  function buildCats() {
    const box = $("cats");
    box.innerHTML = "";
    CATS.forEach(c => {
      const b = document.createElement("button");
      b.className = "cat" + (c === cat ? " active" : "");
      b.textContent = c.label;
      b.onclick = () => {
        if (c === cat) return;
        cat = c; fromIdx = 0;
        window.SFX && SFX.good && SFX.good();
        renderAll();
      };
      box.appendChild(b);
    });
  }

  function buildFromSelect() {
    const sel = $("fromUnit");
    sel.innerHTML = "";
    cat.units.forEach((u, i) => {
      const o = document.createElement("option");
      o.value = i;
      o.textContent = u.n + " (" + u.sym + ")";
      if (i === fromIdx) o.selected = true;
      sel.appendChild(o);
    });
    sel.onchange = () => { fromIdx = +sel.value; render(); };
  }

  function buildQuick() {
    const q = $("quick");
    q.innerHTML = "";
    [1, 2, 5, 10, 100, 0.5].forEach(v => {
      const b = document.createElement("button");
      b.textContent = v;
      b.onclick = () => { $("value").value = v; render(); };
      q.appendChild(b);
    });
  }

  function render() {
    const from = cat.units[fromIdx];
    const raw = parseFloat($("value").value);
    const val = isNaN(raw) ? 0 : raw;
    const baseVal = toBase(from, val);

    $("inputTitle").textContent = "CONVERT " + cat.label.replace(/^\S+\s/, "").toUpperCase();
    $("resHead").innerHTML = fmt(val) + " " + from.sym + " &nbsp;=";

    const rows = $("rows");
    rows.innerHTML = "";
    cat.units.forEach((u, i) => {
      const row = document.createElement("div");
      row.className = "row" + (i === fromIdx ? " active" : "");
      const out = fromBase(u, baseVal);
      row.innerHTML =
        '<span class="u-name">' + u.sym +
          '<span class="u-full">' + u.n + '</span></span>' +
        '<span class="u-val">' + fmt(out) + '</span>';
      row.onclick = () => {
        // "convert from this unit instead": keep the shown number, switch source
        fromIdx = i;
        $("value").value = Number(out.toPrecision(7));
        $("fromUnit").value = i;
        window.SFX && SFX.good && SFX.good();
        render();
      };
      rows.appendChild(row);
    });

    $("fact").innerHTML = "💡 " + cat.fact;
    saveState();
  }

  function renderAll() {
    buildCats();
    buildFromSelect();
    buildQuick();
    render();
  }

  loadState();
  buildQuick();
  $("value").addEventListener("input", render);
  renderAll();
})();
