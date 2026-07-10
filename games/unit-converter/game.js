/* ===========================================================
   Unit Converter — for Cory!
   -----------------------------------------------------------
   Convert ANY unit into EVERY other unit at once, across SI,
   imperial and mixed categories — from the Planck length all
   the way up to a parsec, and everything in between. Type a
   number, pick a unit, and the whole table updates live. Tap
   any row to convert from that unit instead.

   Each unit is either linear:   { n, sym, sys, factor }
     (value_in_base = value * factor)
   or has custom maths:          { n, sym, sys, to, from }
     (to: unit->base, from: base->unit) — used for temperature.

   "sys" = si | imp | mix  (just for a little coloured tag / facts)
   =========================================================== */
(function () {
  "use strict";

  // ---- The data: categories, each with a big list of units ------------
  const CATS = [
    {
      key: "length", label: "📏 Length", base: "metre",
      fact: "Lengths span an <b>enormous</b> range! From the <b>Planck length</b> (about 10⁻³⁵ m — the smallest length that means anything in physics) up to a <b>parsec</b> (≈ 31 trillion km). A blue whale is ~30 m; light zooms 300,000 km every second. 🐋",
      units: [
        { n: "Planck length",    sym: "ℓP",   sys: "mix", factor: 1.616255e-35 },
        { n: "Femtometre (fermi)", sym: "fm", sys: "si",  factor: 1e-15 },
        { n: "Picometre",        sym: "pm",   sys: "si",  factor: 1e-12 },
        { n: "Ångström",         sym: "Å",    sys: "mix", factor: 1e-10 },
        { n: "Nanometre",        sym: "nm",   sys: "si",  factor: 1e-9 },
        { n: "Micron",           sym: "µm",   sys: "si",  factor: 1e-6 },
        { n: "Thou (mil)",       sym: "thou", sys: "imp", factor: 2.54e-5 },
        { n: "Millimetre",       sym: "mm",   sys: "si",  factor: 0.001 },
        { n: "Centimetre",       sym: "cm",   sys: "si",  factor: 0.01 },
        { n: "Inch",             sym: "in",   sys: "imp", factor: 0.0254 },
        { n: "Hand",             sym: "hh",   sys: "imp", factor: 0.1016 },
        { n: "Foot",             sym: "ft",   sys: "imp", factor: 0.3048 },
        { n: "Yard",             sym: "yd",   sys: "imp", factor: 0.9144 },
        { n: "Fathom",           sym: "ftm",  sys: "mix", factor: 1.8288 },
        { n: "Metre",            sym: "m",    sys: "si",  factor: 1 },
        { n: "Rod (perch)",      sym: "rod",  sys: "imp", factor: 5.0292 },
        { n: "Chain",            sym: "ch",   sys: "imp", factor: 20.1168 },
        { n: "Furlong",          sym: "fur",  sys: "imp", factor: 201.168 },
        { n: "Kilometre",        sym: "km",   sys: "si",  factor: 1000 },
        { n: "Mile",             sym: "mi",   sys: "imp", factor: 1609.344 },
        { n: "Nautical mile",    sym: "nmi",  sys: "mix", factor: 1852 },
        { n: "League",           sym: "lea",  sys: "imp", factor: 4828.032 },
        { n: "Astronomical unit", sym: "AU",  sys: "mix", factor: 1.495978707e11 },
        { n: "Light-year",       sym: "ly",   sys: "mix", factor: 9.4607e15 },
        { n: "Parsec",           sym: "pc",   sys: "mix", factor: 3.0856776e16 }
      ]
    },
    {
      key: "mass", label: "⚖️ Weight / Mass", base: "kilogram",
      fact: "From a single <b>dalton</b> (the mass of one atom) up to the <b>Sun</b> — that's about 57 zeros of difference! 1 kg ≈ a pineapple 🍍, 1 tonne ≈ a small car, and the Earth weighs ~6 septillion kg. 🌍",
      units: [
        { n: "Dalton (atomic mass)", sym: "Da", sys: "si",  factor: 1.66053907e-27 },
        { n: "Picogram",   sym: "pg", sys: "si",  factor: 1e-15 },
        { n: "Nanogram",   sym: "ng", sys: "si",  factor: 1e-12 },
        { n: "Microgram",  sym: "µg", sys: "si",  factor: 1e-9 },
        { n: "Milligram",  sym: "mg", sys: "si",  factor: 1e-6 },
        { n: "Grain",      sym: "gr", sys: "imp", factor: 6.479891e-5 },
        { n: "Carat",      sym: "ct", sys: "mix", factor: 2e-4 },
        { n: "Gram",       sym: "g",  sys: "si",  factor: 0.001 },
        { n: "Dram",       sym: "dr", sys: "imp", factor: 1.7718452e-3 },
        { n: "Ounce",      sym: "oz", sys: "imp", factor: 0.0283495 },
        { n: "Pound",      sym: "lb", sys: "imp", factor: 0.453592 },
        { n: "Kilogram",   sym: "kg", sys: "si",  factor: 1 },
        { n: "Stone",      sym: "st", sys: "imp", factor: 6.35029 },
        { n: "Slug",       sym: "slug", sys: "imp", factor: 14.5939 },
        { n: "US ton (short)", sym: "ton (US)", sys: "imp", factor: 907.185 },
        { n: "Tonne",      sym: "t",  sys: "si",  factor: 1000 },
        { n: "Imperial ton (long)", sym: "ton (UK)", sys: "imp", factor: 1016.05 },
        { n: "Earth mass", sym: "M⊕", sys: "mix", factor: 5.9722e24 },
        { n: "Solar mass", sym: "M☉", sys: "mix", factor: 1.98892e30 }
      ]
    },
    {
      key: "temp", label: "🌡️ Temperature", base: "°C",
      fact: "Water freezes at <b>0°C</b> (32°F) and boils at <b>100°C</b> (212°F). Your body is ~<b>37°C</b>. The coldest possible temperature is <b>0 Kelvin</b> (−273.15°C) — nothing can be colder! Scientists use Kelvin; engineers sometimes use Rankine. ❄️",
      units: [
        { n: "Celsius",    sym: "°C", sys: "si",  to: c => c,                from: c => c },
        { n: "Fahrenheit", sym: "°F", sys: "imp", to: f => (f - 32) * 5/9,   from: c => c * 9/5 + 32 },
        { n: "Kelvin",     sym: "K",  sys: "si",  to: k => k - 273.15,       from: c => c + 273.15 },
        { n: "Rankine",    sym: "°R", sys: "imp", to: r => (r - 491.67) * 5/9, from: c => c * 9/5 + 491.67 },
        { n: "Réaumur",    sym: "°Ré", sys: "mix", to: re => re * 5/4,        from: c => c * 4/5 },
        { n: "Delisle",    sym: "°De", sys: "mix", to: d => 100 - d * 2/3,    from: c => (100 - c) * 3/2 }
      ]
    },
    {
      key: "volume", label: "🥤 Volume", base: "litre",
      fact: "A US <b>gallon</b> (3.79 L) is smaller than an imperial <b>gallon</b> (4.55 L)! A teaspoon is 5 mL, a big soda bottle is 2 L, and an <b>acre-foot</b> (enough to flood an acre a foot deep) is over 1.2 million litres. 🌊",
      units: [
        { n: "Microlitre",  sym: "µL",  sys: "si",  factor: 1e-6 },
        { n: "Millilitre",  sym: "mL",  sys: "si",  factor: 0.001 },
        { n: "Cubic centimetre", sym: "cm³", sys: "si", factor: 0.001 },
        { n: "Teaspoon",    sym: "tsp", sys: "mix", factor: 0.00492892 },
        { n: "Tablespoon",  sym: "tbsp", sys: "mix", factor: 0.0147868 },
        { n: "Cubic inch",  sym: "in³", sys: "imp", factor: 0.0163871 },
        { n: "Fluid ounce (US)", sym: "fl oz (US)", sys: "imp", factor: 0.0295735 },
        { n: "Fluid ounce (imperial)", sym: "fl oz (UK)", sys: "imp", factor: 0.0284131 },
        { n: "Cup (US)",    sym: "cup", sys: "imp", factor: 0.236588 },
        { n: "Pint (US)",   sym: "pt (US)", sys: "imp", factor: 0.473176 },
        { n: "Pint (imperial)", sym: "pt (UK)", sys: "imp", factor: 0.568261 },
        { n: "Quart (US)",  sym: "qt",  sys: "imp", factor: 0.946353 },
        { n: "Litre",       sym: "L",   sys: "si",  factor: 1 },
        { n: "Gallon (US)", sym: "gal (US)", sys: "imp", factor: 3.78541 },
        { n: "Gallon (imperial)", sym: "gal (UK)", sys: "imp", factor: 4.54609 },
        { n: "Cubic foot",  sym: "ft³", sys: "imp", factor: 28.3168 },
        { n: "Oil barrel",  sym: "bbl", sys: "mix", factor: 158.987 },
        { n: "Cubic yard",  sym: "yd³", sys: "imp", factor: 764.555 },
        { n: "Cubic metre", sym: "m³",  sys: "si",  factor: 1000 },
        { n: "Acre-foot",   sym: "ac·ft", sys: "imp", factor: 1.233482e6 }
      ]
    },
    {
      key: "area", label: "🟩 Area", base: "square metre",
      fact: "A <b>hectare</b> (10,000 m²) is about a rugby field; an <b>acre</b> is a bit smaller — old idea: how much land an ox could plough in a day! 🐂 Physicists even measure atoms in tiny <b>barns</b> (10⁻²⁸ m²).",
      units: [
        { n: "Barn",              sym: "b",   sys: "mix", factor: 1e-28 },
        { n: "Square millimetre", sym: "mm²", sys: "si",  factor: 1e-6 },
        { n: "Square centimetre", sym: "cm²", sys: "si",  factor: 1e-4 },
        { n: "Square inch",       sym: "in²", sys: "imp", factor: 6.4516e-4 },
        { n: "Square foot",       sym: "ft²", sys: "imp", factor: 0.092903 },
        { n: "Square yard",       sym: "yd²", sys: "imp", factor: 0.836127 },
        { n: "Square metre",      sym: "m²",  sys: "si",  factor: 1 },
        { n: "Are",               sym: "a",   sys: "si",  factor: 100 },
        { n: "Acre",              sym: "ac",  sys: "imp", factor: 4046.86 },
        { n: "Hectare",           sym: "ha",  sys: "si",  factor: 10000 },
        { n: "Square kilometre",  sym: "km²", sys: "si",  factor: 1e6 },
        { n: "Square mile",       sym: "mi²", sys: "imp", factor: 2.589988e6 }
      ]
    },
    {
      key: "speed", label: "🏎️ Speed", base: "metre / second",
      fact: "A cheetah runs ~100 km/h (60 mph) 🐆. Sound travels 343 m/s (<b>Mach 1</b>). A <b>knot</b> is one nautical mile per hour. And the ultimate speed limit — <b>light</b> — is 299,792,458 m/s! 💡",
      units: [
        { n: "Millimetre / second", sym: "mm/s", sys: "si",  factor: 0.001 },
        { n: "Foot / second",       sym: "ft/s", sys: "imp", factor: 0.3048 },
        { n: "Metre / second",      sym: "m/s",  sys: "si",  factor: 1 },
        { n: "Kilometre / hour",    sym: "km/h", sys: "si",  factor: 0.277778 },
        { n: "Mile / hour",         sym: "mph",  sys: "imp", factor: 0.44704 },
        { n: "Knot",                sym: "kn",   sys: "mix", factor: 0.514444 },
        { n: "Kilometre / second",  sym: "km/s", sys: "si",  factor: 1000 },
        { n: "Mach (sea level)",    sym: "Mach", sys: "mix", factor: 340.29 },
        { n: "Speed of light",      sym: "c",    sys: "mix", factor: 299792458 }
      ]
    },
    {
      key: "time", label: "⏱️ Time", base: "second",
      fact: "There are 86,400 seconds in a day and ~31.5 million in a year! A blink takes ~0.1 s. A <b>fortnight</b> is two weeks, and a <b>millennium</b> is a thousand years. ⏳",
      units: [
        { n: "Nanosecond",  sym: "ns",   sys: "si",  factor: 1e-9 },
        { n: "Microsecond", sym: "µs",   sys: "si",  factor: 1e-6 },
        { n: "Millisecond", sym: "ms",   sys: "si",  factor: 0.001 },
        { n: "Second",      sym: "s",    sys: "si",  factor: 1 },
        { n: "Minute",      sym: "min",  sys: "si",  factor: 60 },
        { n: "Hour",        sym: "hr",   sys: "si",  factor: 3600 },
        { n: "Day",         sym: "day",  sys: "si",  factor: 86400 },
        { n: "Week",        sym: "wk",   sys: "si",  factor: 604800 },
        { n: "Fortnight",   sym: "fn",   sys: "mix", factor: 1209600 },
        { n: "Month (avg)", sym: "mo",   sys: "mix", factor: 2629800 },
        { n: "Year",        sym: "yr",   sys: "si",  factor: 31557600 },
        { n: "Decade",      sym: "dec",  sys: "mix", factor: 315576000 },
        { n: "Century",     sym: "cent", sys: "mix", factor: 3155760000 },
        { n: "Millennium",  sym: "kyr",  sys: "mix", factor: 31557600000 }
      ]
    },
    {
      key: "energy", label: "🔋 Energy", base: "joule",
      fact: "A tiny <b>electronvolt</b> is the energy of one electron; a food <b>Calorie</b> is really 1000 little calories; and a <b>ton of TNT</b> is over 4 billion joules! A kWh (your electric bill) is 3.6 million J. ⚡",
      units: [
        { n: "Electronvolt",  sym: "eV",   sys: "mix", factor: 1.602176634e-19 },
        { n: "Erg",           sym: "erg",  sys: "mix", factor: 1e-7 },
        { n: "Joule",         sym: "J",    sys: "si",  factor: 1 },
        { n: "Calorie",       sym: "cal",  sys: "mix", factor: 4.184 },
        { n: "Foot-pound",    sym: "ft·lb", sys: "imp", factor: 1.35582 },
        { n: "Kilojoule",     sym: "kJ",   sys: "si",  factor: 1000 },
        { n: "BTU",           sym: "BTU",  sys: "imp", factor: 1055.06 },
        { n: "Food Calorie",  sym: "kcal", sys: "mix", factor: 4184 },
        { n: "Watt-hour",     sym: "Wh",   sys: "si",  factor: 3600 },
        { n: "Megajoule",     sym: "MJ",   sys: "si",  factor: 1e6 },
        { n: "Kilowatt-hour", sym: "kWh",  sys: "si",  factor: 3.6e6 },
        { n: "Ton of TNT",    sym: "ton TNT", sys: "mix", factor: 4.184e9 }
      ]
    },
    {
      key: "power", label: "💡 Power", base: "watt",
      fact: "One <b>horsepower</b> (746 W) really was measured from a working horse! 🐴 A bright bulb is ~100 W; a car engine ~100 hp; and a big power station makes over a <b>gigawatt</b> (a billion watts).",
      units: [
        { n: "Milliwatt",  sym: "mW",  sys: "si",  factor: 1e-3 },
        { n: "Watt",       sym: "W",   sys: "si",  factor: 1 },
        { n: "BTU / hour", sym: "BTU/h", sys: "imp", factor: 0.293071 },
        { n: "Horsepower (metric)",    sym: "PS", sys: "mix", factor: 735.499 },
        { n: "Horsepower (mechanical)", sym: "hp", sys: "imp", factor: 745.7 },
        { n: "Kilowatt",   sym: "kW",  sys: "si",  factor: 1000 },
        { n: "Megawatt",   sym: "MW",  sys: "si",  factor: 1e6 },
        { n: "Gigawatt",   sym: "GW",  sys: "si",  factor: 1e9 }
      ]
    },
    {
      key: "pressure", label: "🎈 Pressure", base: "pascal",
      fact: "The air around you pushes at ~1 <b>atmosphere</b> (101,325 Pa). A car tyre is ~32 psi. Weather maps use <b>bars</b> & millibars, and doctors measure blood pressure in <b>mmHg</b>. 🌦️",
      units: [
        { n: "Pascal",        sym: "Pa",   sys: "si",  factor: 1 },
        { n: "Hectopascal",   sym: "hPa",  sys: "si",  factor: 100 },
        { n: "Millibar",      sym: "mbar", sys: "mix", factor: 100 },
        { n: "Kilopascal",    sym: "kPa",  sys: "si",  factor: 1000 },
        { n: "mm of mercury (torr)", sym: "mmHg", sys: "mix", factor: 133.322 },
        { n: "Inch of mercury", sym: "inHg", sys: "imp", factor: 3386.39 },
        { n: "Pound / sq in", sym: "psi",  sys: "imp", factor: 6894.76 },
        { n: "Bar",           sym: "bar",  sys: "mix", factor: 1e5 },
        { n: "Atmosphere",    sym: "atm",  sys: "mix", factor: 101325 },
        { n: "Megapascal",    sym: "MPa",  sys: "si",  factor: 1e6 }
      ]
    },
    {
      key: "data", label: "💾 Data", base: "byte",
      fact: "8 <b>bits</b> = 1 <b>byte</b> (one letter). Computers count in powers of 2, so a <b>kibibyte</b> is 1024 bytes, not 1000! A photo is a few MB; a whole movie a few GB; big companies store <b>petabytes</b>. 🖼️",
      units: [
        { n: "Bit",       sym: "bit", sys: "si",  factor: 0.125 },
        { n: "Nibble",    sym: "nib", sys: "mix", factor: 0.5 },
        { n: "Byte",      sym: "B",   sys: "si",  factor: 1 },
        { n: "Kilobyte",  sym: "kB",  sys: "si",  factor: 1e3 },
        { n: "Kibibyte",  sym: "KiB", sys: "mix", factor: 1024 },
        { n: "Megabyte",  sym: "MB",  sys: "si",  factor: 1e6 },
        { n: "Mebibyte",  sym: "MiB", sys: "mix", factor: 1048576 },
        { n: "Gigabyte",  sym: "GB",  sys: "si",  factor: 1e9 },
        { n: "Gibibyte",  sym: "GiB", sys: "mix", factor: 1073741824 },
        { n: "Terabyte",  sym: "TB",  sys: "si",  factor: 1e12 },
        { n: "Tebibyte",  sym: "TiB", sys: "mix", factor: 1099511627776 },
        { n: "Petabyte",  sym: "PB",  sys: "si",  factor: 1e15 },
        { n: "Pebibyte",  sym: "PiB", sys: "mix", factor: 1125899906842624 }
      ]
    },
    {
      key: "angle", label: "📐 Angle", base: "degree",
      fact: "A full turn is <b>360 degrees</b> — the Babylonians picked 360 thousands of years ago! Each degree splits into 60 <b>arcminutes</b>, each of those into 60 <b>arcseconds</b>. Mathematicians love <b>radians</b>: a circle is 2π (~6.28) of them. 🔄",
      units: [
        { n: "Arcsecond",   sym: "″",    sys: "mix", factor: 1/3600 },
        { n: "Arcminute",   sym: "′",    sys: "mix", factor: 1/60 },
        { n: "Milliradian", sym: "mrad", sys: "si",  factor: 0.0572957795 },
        { n: "Gradian",     sym: "grad", sys: "mix", factor: 0.9 },
        { n: "Degree",      sym: "°",    sys: "mix", factor: 1 },
        { n: "Radian",      sym: "rad",  sys: "si",  factor: 57.29577951 },
        { n: "Full turn",   sym: "turn", sys: "mix", factor: 360 }
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
      return x.toExponential(4).replace(/e([+-])(\d)$/, "e$10$2");
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
  let fromIdx = CATS[0].units.findIndex(u => u.sym === "m"); // default: metre

  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "{}");
      const c = CATS.find(k => k.key === s.cat);
      if (c) { cat = c; }
      if (s.from != null) fromIdx = Math.min(Math.max(0, s.from), cat.units.length - 1);
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
