/* ===========================================================
   Unit Converter — for Cory!
   -----------------------------------------------------------
   Three modes:
     🔎 Explore  — type a number, see it in EVERY other unit at
                   once, with the × / ÷ maths shown for each row.
     🎯 Quiz     — a 7-level conversion LADDER with typed answers,
                   hints, and full working shown for every answer.
     🍰 Real life — scale a recipe, and a height chart.

   Each unit is either linear:   { n, sym, sys, factor }
     (value_in_base = value * factor)
   or has custom maths:          { n, sym, sys, to, from }
     (to: unit->base, from: base->unit) — used for temperature.

   "sys" = si | imp | mix   "kid: true" = an everyday unit that
   shows up before you tap "show every unit".

   Every factor in here is the exact defined value where one
   exists (1 in = 0.0254 m exactly, 1 lb = 0.45359237 kg exactly,
   1 mile = 5280 ft, …) — see check-factors.js.
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
        { n: "Millimetre",       sym: "mm",   sys: "si",  factor: 0.001, kid: 1 },
        { n: "Centimetre",       sym: "cm",   sys: "si",  factor: 0.01, kid: 1 },
        { n: "Inch",             sym: "in",   sys: "imp", factor: 0.0254, kid: 1 },
        { n: "Hand",             sym: "hh",   sys: "imp", factor: 0.1016 },
        { n: "Foot",             sym: "ft",   sys: "imp", factor: 0.3048, kid: 1 },
        { n: "Yard",             sym: "yd",   sys: "imp", factor: 0.9144, kid: 1 },
        { n: "Fathom",           sym: "ftm",  sys: "mix", factor: 1.8288 },
        { n: "Metre",            sym: "m",    sys: "si",  factor: 1, kid: 1 },
        { n: "Rod (perch)",      sym: "rod",  sys: "imp", factor: 5.0292 },
        { n: "Chain",            sym: "ch",   sys: "imp", factor: 20.1168 },
        { n: "Furlong",          sym: "fur",  sys: "imp", factor: 201.168 },
        { n: "Kilometre",        sym: "km",   sys: "si",  factor: 1000, kid: 1 },
        { n: "Mile",             sym: "mi",   sys: "imp", factor: 1609.344, kid: 1 },
        { n: "Nautical mile",    sym: "nmi",  sys: "mix", factor: 1852 },
        { n: "League",           sym: "lea",  sys: "imp", factor: 4828.032 },
        { n: "Astronomical unit", sym: "AU",  sys: "mix", factor: 1.495978707e11 },
        { n: "Light-year",       sym: "ly",   sys: "mix", factor: 9.4607304725808e15 },
        { n: "Parsec",           sym: "pc",   sys: "mix", factor: 3.0856775814913673e16 }
      ]
    },
    {
      key: "mass", label: "⚖️ Weight / Mass", base: "kilogram",
      fact: "From a single <b>dalton</b> (the mass of one atom) up to the <b>Sun</b> — that's about 57 zeros of difference! A bag of sugar is about <b>1 kg</b> 🍚, 1 tonne ≈ a small car, and the Earth weighs ~6 septillion kg. 🌍",
      units: [
        { n: "Dalton (atomic mass)", sym: "Da", sys: "si",  factor: 1.66053906892e-27 },
        { n: "Picogram",   sym: "pg", sys: "si",  factor: 1e-15 },
        { n: "Nanogram",   sym: "ng", sys: "si",  factor: 1e-12 },
        { n: "Microgram",  sym: "µg", sys: "si",  factor: 1e-9 },
        { n: "Milligram",  sym: "mg", sys: "si",  factor: 1e-6, kid: 1 },
        { n: "Grain",      sym: "gr", sys: "imp", factor: 6.479891e-5 },
        { n: "Carat",      sym: "ct", sys: "mix", factor: 2e-4 },
        { n: "Gram",       sym: "g",  sys: "si",  factor: 0.001, kid: 1 },
        { n: "Dram",       sym: "dr", sys: "imp", factor: 1.7718451953125e-3 },
        { n: "Ounce",      sym: "oz", sys: "imp", factor: 0.028349523125, kid: 1 },
        { n: "Pound",      sym: "lb", sys: "imp", factor: 0.45359237, kid: 1 },
        { n: "Kilogram",   sym: "kg", sys: "si",  factor: 1, kid: 1 },
        { n: "Stone",      sym: "st", sys: "imp", factor: 6.35029318, kid: 1 },
        { n: "Slug",       sym: "slug", sys: "imp", factor: 14.5939029372 },
        { n: "US ton (short)", sym: "ton (US)", sys: "imp", factor: 907.18474 },
        { n: "Tonne",      sym: "t",  sys: "si",  factor: 1000, kid: 1 },
        { n: "Imperial ton (long)", sym: "ton (UK)", sys: "imp", factor: 1016.0469088 },
        { n: "Earth mass", sym: "M⊕", sys: "mix", factor: 5.9722e24 },
        { n: "Solar mass", sym: "M☉", sys: "mix", factor: 1.98847e30 }
      ]
    },
    {
      key: "temp", label: "🌡️ Temperature", base: "°C",
      fact: "Water freezes at <b>0°C</b> (32°F) and boils at <b>100°C</b> (212°F). Your body is ~<b>37°C</b>. The coldest possible temperature is <b>0 Kelvin</b> (−273.15°C) — nothing can be colder! Scientists use Kelvin; engineers sometimes use Rankine. ❄️",
      units: [
        { n: "Celsius",    sym: "°C", sys: "si",  kid: 1, to: c => c,                from: c => c },
        { n: "Fahrenheit", sym: "°F", sys: "imp", kid: 1, to: f => (f - 32) * 5/9,   from: c => c * 9/5 + 32 },
        { n: "Kelvin",     sym: "K",  sys: "si",  kid: 1, to: k => k - 273.15,       from: c => c + 273.15 },
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
        { n: "Millilitre",  sym: "mL",  sys: "si",  factor: 0.001, kid: 1 },
        { n: "Cubic centimetre", sym: "cm³", sys: "si", factor: 0.001, kid: 1 },
        { n: "Teaspoon (US)", sym: "tsp", sys: "mix", factor: 0.00492892159375, kid: 1 },
        { n: "Tablespoon (US)", sym: "tbsp", sys: "mix", factor: 0.01478676478125, kid: 1 },
        { n: "Cubic inch",  sym: "in³", sys: "imp", factor: 0.016387064 },
        { n: "Fluid ounce (US)", sym: "fl oz (US)", sys: "imp", factor: 0.0295735295625, kid: 1 },
        { n: "Fluid ounce (imperial)", sym: "fl oz (UK)", sys: "imp", factor: 0.0284130625 },
        { n: "Cup (US)",    sym: "cup", sys: "imp", factor: 0.2365882365, kid: 1 },
        { n: "Pint (US)",   sym: "pt (US)", sys: "imp", factor: 0.473176473, kid: 1 },
        { n: "Pint (imperial)", sym: "pt (UK)", sys: "imp", factor: 0.56826125 },
        { n: "Quart (US)",  sym: "qt",  sys: "imp", factor: 0.946352946, kid: 1 },
        { n: "Litre",       sym: "L",   sys: "si",  factor: 1, kid: 1 },
        { n: "Gallon (US)", sym: "gal (US)", sys: "imp", factor: 3.785411784, kid: 1 },
        { n: "Gallon (imperial)", sym: "gal (UK)", sys: "imp", factor: 4.54609 },
        { n: "Cubic foot",  sym: "ft³", sys: "imp", factor: 28.316846592 },
        { n: "Oil barrel",  sym: "bbl", sys: "mix", factor: 158.987294928 },
        { n: "Cubic yard",  sym: "yd³", sys: "imp", factor: 764.554857984 },
        { n: "Cubic metre", sym: "m³",  sys: "si",  factor: 1000, kid: 1 },
        { n: "Acre-foot",   sym: "ac·ft", sys: "imp", factor: 1233481.83754752 }
      ]
    },
    {
      key: "area", label: "🟩 Area", base: "square metre",
      fact: "A <b>hectare</b> (10,000 m²) is about a rugby field; an <b>acre</b> is a bit smaller — old idea: how much land an ox could plough in a day! 🐂 Physicists even measure atoms in tiny <b>barns</b> (10⁻²⁸ m²).",
      units: [
        { n: "Barn",              sym: "b",   sys: "mix", factor: 1e-28 },
        { n: "Square millimetre", sym: "mm²", sys: "si",  factor: 1e-6, kid: 1 },
        { n: "Square centimetre", sym: "cm²", sys: "si",  factor: 1e-4, kid: 1 },
        { n: "Square inch",       sym: "in²", sys: "imp", factor: 6.4516e-4, kid: 1 },
        { n: "Square foot",       sym: "ft²", sys: "imp", factor: 0.09290304, kid: 1 },
        { n: "Square yard",       sym: "yd²", sys: "imp", factor: 0.83612736, kid: 1 },
        { n: "Square metre",      sym: "m²",  sys: "si",  factor: 1, kid: 1 },
        { n: "Are",               sym: "a",   sys: "si",  factor: 100 },
        { n: "Acre",              sym: "ac",  sys: "imp", factor: 4046.8564224, kid: 1 },
        { n: "Hectare",           sym: "ha",  sys: "si",  factor: 10000, kid: 1 },
        { n: "Square kilometre",  sym: "km²", sys: "si",  factor: 1e6, kid: 1 },
        { n: "Square mile",       sym: "mi²", sys: "imp", factor: 2589988.110336, kid: 1 }
      ]
    },
    {
      key: "speed", label: "🏎️ Speed", base: "metre / second",
      fact: "A cheetah runs ~100 km/h (60 mph) 🐆. Sound travels 343 m/s (<b>Mach 1</b>). A <b>knot</b> is one nautical mile per hour. And the ultimate speed limit — <b>light</b> — is 299,792,458 m/s! 💡",
      units: [
        { n: "Millimetre / second", sym: "mm/s", sys: "si",  factor: 0.001 },
        { n: "Kilometre / hour",    sym: "km/h", sys: "si",  factor: 1 / 3.6, kid: 1 },
        { n: "Foot / second",       sym: "ft/s", sys: "imp", factor: 0.3048, kid: 1 },
        { n: "Mile / hour",         sym: "mph",  sys: "imp", factor: 0.44704, kid: 1 },
        { n: "Knot",                sym: "kn",   sys: "mix", factor: 1852 / 3600, kid: 1 },
        { n: "Metre / second",      sym: "m/s",  sys: "si",  factor: 1, kid: 1 },
        { n: "Kilometre / second",  sym: "km/s", sys: "si",  factor: 1000 },
        { n: "Mach (sea level)",    sym: "Mach", sys: "mix", factor: 340.29 },
        { n: "Speed of light",      sym: "c",    sys: "mix", factor: 299792458 }
      ]
    },
    {
      key: "time", label: "⏱️ Time", base: "second",
      fact: "Time spans a <b>huge</b> range too! The <b>Planck time</b> (~5.4 × 10⁻⁴⁴ s) is the shortest moment physics can describe — light crosses a single proton in longer than that. Up top, a <b>millennium</b> is a thousand years. A blink takes ~0.1 s; a day is 86,400 s. ⏳",
      units: [
        { n: "Planck time", sym: "tP",   sys: "mix", factor: 5.391247e-44 },
        { n: "Nanosecond",  sym: "ns",   sys: "si",  factor: 1e-9 },
        { n: "Microsecond", sym: "µs",   sys: "si",  factor: 1e-6 },
        { n: "Millisecond", sym: "ms",   sys: "si",  factor: 0.001, kid: 1 },
        { n: "Second",      sym: "s",    sys: "si",  factor: 1, kid: 1 },
        { n: "Minute",      sym: "min",  sys: "si",  factor: 60, kid: 1 },
        { n: "Hour",        sym: "hr",   sys: "si",  factor: 3600, kid: 1 },
        { n: "Day",         sym: "day",  sys: "si",  factor: 86400, kid: 1 },
        { n: "Week",        sym: "wk",   sys: "si",  factor: 604800, kid: 1 },
        { n: "Fortnight",   sym: "fn",   sys: "mix", factor: 1209600 },
        { n: "Month (avg)", sym: "mo",   sys: "mix", factor: 2629800 },
        { n: "Year (365¼ days)", sym: "yr", sys: "si", factor: 31557600, kid: 1 },
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
        { n: "Joule",         sym: "J",    sys: "si",  factor: 1, kid: 1 },
        { n: "Foot-pound",    sym: "ft·lb", sys: "imp", factor: 1.3558179483314004 },
        { n: "Calorie",       sym: "cal",  sys: "mix", factor: 4.184, kid: 1 },
        { n: "Kilojoule",     sym: "kJ",   sys: "si",  factor: 1000, kid: 1 },
        { n: "BTU",           sym: "BTU",  sys: "imp", factor: 1055.05585262 },
        { n: "Watt-hour",     sym: "Wh",   sys: "si",  factor: 3600, kid: 1 },
        { n: "Food Calorie",  sym: "kcal", sys: "mix", factor: 4184, kid: 1 },
        { n: "Megajoule",     sym: "MJ",   sys: "si",  factor: 1e6 },
        { n: "Kilowatt-hour", sym: "kWh",  sys: "si",  factor: 3.6e6, kid: 1 },
        { n: "Ton of TNT",    sym: "ton TNT", sys: "mix", factor: 4.184e9 }
      ]
    },
    {
      key: "power", label: "💡 Power", base: "watt",
      fact: "One <b>horsepower</b> (746 W) really was measured from a working horse! 🐴 A bright bulb is ~100 W; a car engine ~100 hp; and a big power station makes over a <b>gigawatt</b> (a billion watts).",
      units: [
        { n: "Milliwatt",  sym: "mW",  sys: "si",  factor: 1e-3 },
        { n: "BTU / hour", sym: "BTU/h", sys: "imp", factor: 1055.05585262 / 3600 },
        { n: "Watt",       sym: "W",   sys: "si",  factor: 1, kid: 1 },
        { n: "Horsepower (metric)",    sym: "PS", sys: "mix", factor: 735.49875 },
        { n: "Horsepower (mechanical)", sym: "hp", sys: "imp", factor: 745.69987158227022, kid: 1 },
        { n: "Kilowatt",   sym: "kW",  sys: "si",  factor: 1000, kid: 1 },
        { n: "Megawatt",   sym: "MW",  sys: "si",  factor: 1e6, kid: 1 },
        { n: "Gigawatt",   sym: "GW",  sys: "si",  factor: 1e9, kid: 1 }
      ]
    },
    {
      key: "pressure", label: "🎈 Pressure", base: "pascal",
      fact: "The air around you pushes at ~1 <b>atmosphere</b> (101,325 Pa). A car tyre is ~32 psi. Weather maps use <b>bars</b> & millibars, and doctors measure blood pressure in <b>mmHg</b>. 🌦️",
      units: [
        { n: "Pascal",        sym: "Pa",   sys: "si",  factor: 1, kid: 1 },
        { n: "Hectopascal",   sym: "hPa",  sys: "si",  factor: 100 },
        { n: "Millibar",      sym: "mbar", sys: "mix", factor: 100, kid: 1 },
        { n: "Kilopascal",    sym: "kPa",  sys: "si",  factor: 1000, kid: 1 },
        { n: "mm of mercury (torr)", sym: "mmHg", sys: "mix", factor: 133.322387415, kid: 1 },
        { n: "Inch of mercury", sym: "inHg", sys: "imp", factor: 3386.388640341 },
        { n: "Pound / sq in", sym: "psi",  sys: "imp", factor: 6894.757293168, kid: 1 },
        { n: "Bar",           sym: "bar",  sys: "mix", factor: 1e5, kid: 1 },
        { n: "Atmosphere",    sym: "atm",  sys: "mix", factor: 101325, kid: 1 },
        { n: "Megapascal",    sym: "MPa",  sys: "si",  factor: 1e6 }
      ]
    },
    {
      key: "data", label: "💾 Data", base: "byte",
      fact: "8 <b>bits</b> = 1 <b>byte</b> (one letter). Computers count in powers of 2, so a <b>kibibyte</b> is 1024 bytes, not 1000! A photo is a few MB; a whole movie a few GB; big companies store <b>petabytes</b>. 🖼️",
      units: [
        { n: "Bit",       sym: "bit", sys: "si",  factor: 0.125, kid: 1 },
        { n: "Nibble",    sym: "nib", sys: "mix", factor: 0.5 },
        { n: "Byte",      sym: "B",   sys: "si",  factor: 1, kid: 1 },
        { n: "Kilobyte",  sym: "kB",  sys: "si",  factor: 1e3, kid: 1 },
        { n: "Kibibyte",  sym: "KiB", sys: "mix", factor: 1024 },
        { n: "Megabyte",  sym: "MB",  sys: "si",  factor: 1e6, kid: 1 },
        { n: "Mebibyte",  sym: "MiB", sys: "mix", factor: 1048576 },
        { n: "Gigabyte",  sym: "GB",  sys: "si",  factor: 1e9, kid: 1 },
        { n: "Gibibyte",  sym: "GiB", sys: "mix", factor: 1073741824 },
        { n: "Terabyte",  sym: "TB",  sys: "si",  factor: 1e12, kid: 1 },
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
        { n: "Milliradian", sym: "mrad", sys: "si",  factor: 180 / Math.PI / 1000 },
        { n: "Gradian",     sym: "grad", sys: "mix", factor: 0.9, kid: 1 },
        { n: "Degree",      sym: "°",    sys: "mix", factor: 1, kid: 1 },
        { n: "Radian",      sym: "rad",  sys: "si",  factor: 180 / Math.PI, kid: 1 },
        { n: "Full turn",   sym: "turn", sys: "mix", factor: 360, kid: 1 }
      ]
    }
  ];

  // Keep every linear list in size order — a couple used to be out of
  // order (km/h after m/s, ft·lb after cal, BTU/h after W), which made
  // the "ladder" of units on screen look wrong.
  CATS.forEach(c => {
    if (c.units.every(u => typeof u.factor === "number")) {
      c.units.sort((a, b) => a.factor - b.factor);
    }
  });

  // ---- "How big is that?" — everyday things to compare against --------
  const COMPARES = {
    length: { mode: "count", anchors: [
      { v: 1e-10,      one: "an atom",              many: "atoms in a row",        e: "⚛️" },
      { v: 7e-5,       one: "the width of a hair",  many: "hair-widths",           e: "💇" },
      { v: 0.0096,     one: "a LEGO brick",         many: "LEGO bricks",           e: "🧱" },
      { v: 0.19,       one: "a banana",             many: "bananas",               e: "🍌" },
      { v: 1.2,        one: "a 6-year-old kid",     many: "kids stacked up",       e: "🧒" },
      { v: 11,         one: "a school bus",         many: "school buses",          e: "🚌" },
      { v: 100,        one: "a soccer field",       many: "soccer fields",         e: "⚽" },
      { v: 8849,       one: "Mount Everest",        many: "Mount Everests",        e: "🏔️" },
      { v: 4.0075e7,   one: "once around the Earth", many: "laps around the Earth", e: "🌍" },
      { v: 3.844e8,    one: "the trip to the Moon", many: "trips to the Moon",     e: "🌙" },
      { v: 1.496e11,   one: "the trip to the Sun",  many: "trips to the Sun",      e: "☀️" },
      { v: 9.4607e15,  one: "a light-year",         many: "light-years",           e: "✨" }
    ]},
    mass: { mode: "count", anchors: [
      { v: 2.5e-6,   one: "a mosquito",       many: "mosquitoes",       e: "🦟" },
      { v: 0.0025,   one: "a LEGO brick",     many: "LEGO bricks",      e: "🧱" },
      { v: 0.2,      one: "an apple",         many: "apples",           e: "🍎" },
      { v: 1,        one: "a bag of sugar",   many: "bags of sugar",    e: "🍚" },
      { v: 4.5,      one: "a pet cat",        many: "pet cats",         e: "🐱" },
      { v: 45,       one: "a big dog",        many: "big dogs",         e: "🐕" },
      { v: 1500,     one: "a car",            many: "cars",             e: "🚗" },
      { v: 6000,     one: "an elephant",      many: "elephants",        e: "🐘" },
      { v: 140000,   one: "a blue whale",     many: "blue whales",      e: "🐋" },
      { v: 5.2e7,    one: "the Titanic",      many: "Titanics",         e: "🚢" },
      { v: 5.972e24, one: "planet Earth",     many: "planet Earths",    e: "🌍" }
    ]},
    volume: { mode: "count", anchors: [
      { v: 5e-5,   one: "a drop of water",           many: "drops of water",           e: "💧" },
      { v: 0.005,  one: "a teaspoon",                many: "teaspoons",                e: "🥄" },
      { v: 0.355,  one: "a soda can",                many: "soda cans",                e: "🥤" },
      { v: 2,      one: "a big soda bottle",         many: "big soda bottles",         e: "🍾" },
      { v: 150,    one: "a bathtub",                 many: "bathtubs",                 e: "🛁" },
      { v: 50000,  one: "a backyard pool",           many: "backyard pools",           e: "🏖️" },
      { v: 2.5e6,  one: "an Olympic swimming pool",  many: "Olympic swimming pools",   e: "🏊" }
    ]},
    area: { mode: "count", anchors: [
      { v: 5e-4,    one: "a postage stamp",   many: "postage stamps",   e: "📮" },
      { v: 0.0625,  one: "a sheet of paper",  many: "sheets of paper",  e: "📄" },
      { v: 2,       one: "a door",            many: "doors",            e: "🚪" },
      { v: 261,     one: "a tennis court",    many: "tennis courts",    e: "🎾" },
      { v: 7140,    one: "a soccer field",    many: "soccer fields",    e: "⚽" },
      { v: 3.41e6,  one: "Central Park",      many: "Central Parks",    e: "🌳" },
      { v: 5.1e14,  one: "the whole surface of the Earth", many: "whole Earth surfaces", e: "🌍" }
    ]},
    speed: { mode: "times", anchors: [
      { v: 0.0013,       one: "a snail",               e: "🐌" },
      { v: 1.4,          one: "walking speed",         e: "🚶" },
      { v: 10,           one: "the fastest sprinter",  e: "🏃" },
      { v: 30,           one: "a cheetah",             e: "🐆" },
      { v: 250,          one: "a jet plane",           e: "✈️" },
      { v: 343,          one: "the speed of sound",    e: "🔊" },
      { v: 7660,         one: "the Space Station",     e: "🛰️" },
      { v: 2.99792458e8, one: "the speed of light",    e: "💡" }
    ]},
    time: { mode: "count", anchors: [
      { v: 0.1,      one: "a blink",                many: "blinks",                e: "👁️" },
      { v: 1,        one: "a heartbeat",            many: "heartbeats",            e: "💓" },
      { v: 120,      one: "a tooth-brushing",       many: "tooth-brushings",       e: "🪥" },
      { v: 7200,     one: "a movie",                many: "movies",                e: "🎬" },
      { v: 86400,    one: "a whole day",            many: "whole days",            e: "🌞" },
      { v: 3.156e7,  one: "a year",                 many: "years",                 e: "🎂" },
      { v: 2.5e9,    one: "a whole human lifetime", many: "human lifetimes",       e: "👵" },
      { v: 4.35e17,  one: "the age of the universe", many: "ages of the universe", e: "🌌" }
    ]},
    energy: { mode: "count", anchors: [
      { v: 1e-4,    one: "a flea's jump",             many: "flea jumps",              e: "🤸" },
      { v: 1,       one: "lifting an apple up high",  many: "apple-lifts",             e: "🍎" },
      { v: 4.4e5,   one: "a banana of food energy",   many: "bananas of food energy",  e: "🍌" },
      { v: 2.3e6,   one: "a chocolate bar",           many: "chocolate bars",          e: "🍫" },
      { v: 1.32e8,  one: "a gallon of gasoline",      many: "gallons of gasoline",     e: "⛽" },
      { v: 5e9,     one: "a lightning bolt",          many: "lightning bolts",         e: "⚡" }
    ]},
    power: { mode: "count", anchors: [
      { v: 0.5,   one: "a night-light",           many: "night-lights",           e: "🌙" },
      { v: 18,    one: "a phone charger",         many: "phone chargers",         e: "🔌" },
      { v: 100,   one: "a person pedaling hard",  many: "people pedaling hard",   e: "🚴" },
      { v: 746,   one: "a horse",                 many: "horses",                 e: "🐴" },
      { v: 75000, one: "a car engine",            many: "car engines",            e: "🚗" },
      { v: 3e6,   one: "a wind turbine",          many: "wind turbines",          e: "🌬️" },
      { v: 1e9,   one: "a big power station",     many: "big power stations",     e: "🏭" }
    ]},
    pressure: { mode: "times", anchors: [
      { v: 0.8,     one: "a sheet of paper resting on your hand", e: "📄" },
      { v: 101325,  one: "the air pushing on you right now",      e: "🌬️" },
      { v: 220000,  one: "the air inside a car tyre",             e: "🚗" },
      { v: 1.1e8,   one: "the bottom of the deepest ocean",       e: "🌊" },
      { v: 3.6e11,  one: "the centre of the Earth",               e: "🌍" }
    ]},
    data: { mode: "count", anchors: [
      { v: 1,     one: "a single letter",   many: "letters",          e: "🔤" },
      { v: 140,   one: "a text message",    many: "text messages",    e: "💬" },
      { v: 3e6,   one: "a photo",           many: "photos",           e: "📸" },
      { v: 4e6,   one: "a song",            many: "songs",            e: "🎵" },
      { v: 4e9,   one: "a movie",           many: "movies",           e: "🎬" },
      { v: 7e10,  one: "a big video game",  many: "big video games",  e: "🎮" }
    ]},
    angle: { mode: "count", anchors: [
      { v: 6,    one: "a minute tick on a clock", many: "minute ticks on a clock", e: "🕐" },
      { v: 45,   one: "a pizza slice",            many: "pizza slices",            e: "🍕" },
      { v: 90,   one: "a right angle",            many: "right angles",            e: "📐" },
      { v: 360,  one: "a full spin",              many: "full spins",              e: "🌀" }
    ]}
  };

  // Temperature gets weather words instead of ratios (base = °C).
  const TEMP_BANDS = [
    [-200, "❄️ Almost absolute zero — nothing in the universe is much colder!"],
    [-90,  "🧪 Cold enough to turn air into a liquid!"],
    [-40,  "🥶 Colder than the South Pole in winter!"],
    [-18,  "🧊 Colder than the inside of your freezer!"],
    [0,    "⛄ Below freezing — snowman weather!"],
    [12,   "🧥 Chilly — grab a jacket!"],
    [22,   "🙂 Cool and comfy."],
    [30,   "😎 Perfect play-outside warm!"],
    [42,   "🥵 Hot summer day — find some shade!"],
    [60,   "🏜️ Hotter than the hottest desert on Earth!"],
    [100,  "♨️ Hot-tub to boiling water — careful!"],
    [250,  "🍕 Oven temperatures — pizza territory!"],
    [1200, "🌋 Glowing hot — molten lava is about 1,100°C!"],
    [6000, "🔥 Hotter than lava — metals melt and boil!"],
    [Infinity, "☀️ Hotter than the surface of the Sun (about 5,500°C)!"]
  ];

  // ---- Convert helpers -------------------------------------------------
  function toBase(unit, v)  { return unit.to   ? unit.to(v)   : v * unit.factor; }
  function fromBase(unit, b){ return unit.from ? unit.from(b) : b / unit.factor; }

  // Friendly number formatting: readable, no ugly floating-point tails.
  function fmt(x) {
    if (typeof x !== "number" || !isFinite(x)) return "—";
    if (x === 0) return "0";
    const a = Math.abs(x);
    if (a >= 1e15 || a < 1e-6) {
      return x.toExponential(4).replace(/e([+-])(\d)$/, "e$10$2");
    }
    let s = Number(x.toPrecision(7)).toString();
    if (s.indexOf("e") === -1) {
      const neg = s[0] === "-";
      if (neg) s = s.slice(1);
      const parts = s.split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      s = (neg ? "-" : "") + parts.join(".");
    }
    return s;
  }

  // Same as fmt, but renders huge/tiny numbers as a proper "× 10ⁿ".
  function fmtHTML(x) {
    if (typeof x !== "number" || !isFinite(x)) return "—";
    if (x === 0) return "0";
    const a = Math.abs(x);
    if (a >= 1e15 || a < 1e-6) {
      const parts = x.toExponential(4).split("e");
      return Number(parts[0]) + " × 10<sup>" + Number(parts[1]) + "</sup>";
    }
    return fmt(x);
  }

  // How many decimal places does this number actually need?
  function decimalsOf(x) {
    const s = String(Number(x.toPrecision(10)));
    if (s.indexOf("e") !== -1) return 6;
    const i = s.indexOf(".");
    return i === -1 ? 0 : Math.min(s.length - i - 1, 6);
  }
  function roundTo(x, dp) { const p = Math.pow(10, dp); return Math.round(x * p) / p; }

  // Build the "That's about 3 school buses! 🚌" line.
  function compareLine(catKey, baseVal) {
    if (catKey === "temp") {
      const band = TEMP_BANDS.find(b => baseVal <= b[0]);
      return band ? band[1] : "";
    }
    const cmp = COMPARES[catKey];
    if (!cmp || !(baseVal > 0)) return "";
    let bestA = cmp.anchors[0], bestD = Infinity;
    cmp.anchors.forEach(an => {
      const d = Math.abs(Math.log10(baseVal / an.v));
      if (d < bestD) { bestD = d; bestA = an; }
    });
    const r = baseVal / bestA.v;
    const times = cmp.mode === "times";

    function amount(n) {
      if (n < 10) return (Math.round(n * 10) / 10).toString().replace(/\.0$/, "");
      return fmtHTML(Math.round(n));
    }

    let phrase;
    if (r >= 0.95) {
      const n = amount(r);
      if (n === "1") {
        phrase = times ? "the same as <b>" + bestA.one + "</b>" : "<b>" + bestA.one + "</b>";
      } else if (times) {
        phrase = "<b>" + n + "× as much as " + bestA.one + "</b>";
      } else {
        phrase = "<b>" + n + " " + bestA.many + "</b>";
      }
    } else {
      const f = 1 / r;
      if (Math.round(f) <= 1) {
        phrase = times ? "the same as <b>" + bestA.one + "</b>" : "<b>" + bestA.one + "</b>";
      } else {
        const fs = f <= 20 ? String(Math.round(f)) : "(" + amount(f) + ")";
        phrase = "<b>1⁄" + fs + " of " + bestA.one + "</b>";
      }
    }
    return "🤔 That's about " + phrase + " " + bestA.e;
  }

  // ---- tiny helpers ----------------------------------------------------
  const $ = id => document.getElementById(id);
  function pick(a) { return a[(Math.random() * a.length) | 0]; }
  function esc(s) {
    return String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
  }

  // =====================================================================
  //  🔎 EXPLORE
  // =====================================================================
  const KEY = "unitConverter";
  let cat = CATS[0];
  let fromIdx = CATS[0].units.findIndex(u => u.sym === "m"); // default: metre
  let showAll = false;
  let tab = "explore";

  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "{}");
      const c = CATS.find(k => k.key === s.cat);
      if (c) cat = c;
      if (s.from != null && isFinite(s.from)) {
        fromIdx = Math.min(Math.max(0, s.from | 0), cat.units.length - 1);
      } else {
        fromIdx = baseUnitIndex(cat);
      }
      if (s.value != null && s.value !== "") $("value").value = s.value;
      showAll = !!s.showAll;
      if (s.tab === "quiz" || s.tab === "real" || s.tab === "explore") tab = s.tab;
    } catch (e) {}
  }
  function saveState() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        cat: cat.key, from: fromIdx, value: $("value").value, showAll: showAll, tab: tab
      }));
    } catch (e) {}
  }

  // Which units show right now? Everyday ones first, unless "show every unit".
  function visibleUnits() {
    if (showAll) return cat.units;
    const kids = cat.units.filter(u => u.kid);
    return kids.length >= 3 ? kids : cat.units;
  }

  function buildCats() {
    const box = $("cats");
    box.innerHTML = "";
    CATS.forEach(c => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "cat";
      b.setAttribute("aria-pressed", c === cat ? "true" : "false");
      b.textContent = c.label;
      b.onclick = () => {
        if (c === cat) return;
        cat = c; fromIdx = baseUnitIndex(c);
        window.SFX && SFX.good && SFX.good();
        renderExplore();
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

  // Start each category on its everyday base unit (metre, kilogram, …).
  function baseUnitIndex(c) {
    const i = c.units.findIndex(u => u.factor === 1 || (u.to && u.to(1) === 1));
    return i === -1 ? 0 : i;
  }

  const QUICKS = {
    temp:  [0, 20, 32, 37, 100, -40],
    time:  [1, 30, 60, 90, 3600],
    data:  [1, 8, 512, 1024, 2048],
    angle: [30, 45, 90, 180, 360]
  };

  function buildQuick() {
    const q = $("quick");
    q.innerHTML = '<span class="qlabel">try:</span>';
    (QUICKS[cat.key] || [1, 2, 5, 10, 100, 0.5]).forEach(v => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = v;
      b.setAttribute("aria-label", "Use the number " + v);
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
    $("resHead").innerHTML = fmtHTML(val) + " " + esc(from.sym) + " &nbsp;=";

    const rows = $("rows");
    rows.innerHTML = "";
    const list = visibleUnits();
    // Always show the unit you're converting FROM, even in everyday mode.
    if (list.indexOf(from) === -1) list.unshift(from);

    list.forEach(u => {
      const i = cat.units.indexOf(u);
      const row = document.createElement("button");
      row.type = "button";
      row.className = "row" + (i === fromIdx ? " active" : "");
      const out = fromBase(u, baseVal);
      // The maths relationship: how do you turn a "from" number into this row?
      let rel = "";
      if (i !== fromIdx && from.factor && u.factor) {
        const k = from.factor / u.factor;
        rel = k >= 1
          ? '<span class="u-rel">× ' + fmtHTML(Number(k.toPrecision(6))) + "</span>"
          : '<span class="u-rel">÷ ' + fmtHTML(Number((1 / k).toPrecision(6))) + "</span>";
      }
      row.innerHTML =
        '<span class="u-name">' + esc(u.sym) +
          '<span class="u-full">' + esc(u.n) + '</span>' + rel + '</span>' +
        '<span class="u-val">' + fmtHTML(out) + '</span>';
      row.setAttribute("aria-label",
        fmt(val) + " " + from.sym + " is " + fmt(out) + " " + u.n +
        ". Tap to convert from " + u.n + " instead.");
      row.onclick = () => {
        fromIdx = i;
        $("value").value = Number(out.toPrecision(7));
        $("fromUnit").value = i;
        window.SFX && SFX.good && SFX.good();
        render();
      };
      rows.appendChild(row);
    });

    const hidden = cat.units.length - list.length;
    const db = $("depthBtn");
    db.textContent = showAll ? "🙈 Just everyday units" : "🔬 Show every unit (+" + hidden + ")";
    db.setAttribute("aria-pressed", showAll ? "true" : "false");
    db.hidden = hidden <= 0 && !showAll;

    const cmp = compareLine(cat.key, baseVal);
    $("compare").innerHTML = cmp;
    $("compare").style.display = cmp ? "" : "none";

    $("fact").innerHTML = "💡 " + cat.fact;
    saveState();
  }

  function renderExplore() {
    buildCats();
    buildFromSelect();
    buildQuick();
    render();
  }
