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
   1 mile = 5280 ft, 1 US gal = 231 in³, …).
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
      if (baseVal < -273.15) {
        return "🚫 That's colder than <b>absolute zero</b> (−273.15 °C = 0 K) — " +
               "nothing in the universe can ever be that cold!";
      }
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

  // =====================================================================
  //  🎯 QUIZ — a real ladder, typed answers, and the working shown
  // =====================================================================
  const clean = x => Number(Number(x).toPrecision(12));

  // ---- Level 1: the metric ladder (everything is ×10 / ×100 / ×1000) ---
  const METRIC_STEPS = [
    { big: "cm", small: "mm", k: 10, bigName: "centimetres", smallName: "millimetres",
      anchor: "Look at a ruler: between each big cm line there are 10 little mm lines." },
    { big: "m", small: "cm", k: 100, bigName: "metres", smallName: "centimetres",
      anchor: "A metre stick is about as tall as Ellie; a centimetre is about as wide as your fingernail." },
    { big: "m", small: "mm", k: 1000, bigName: "metres", smallName: "millimetres",
      anchor: "A millimetre is about the thickness of a coin." },
    { big: "km", small: "m", k: 1000, bigName: "kilometres", smallName: "metres",
      anchor: "1 km is about two and a half laps of a running track." },
    { big: "kg", small: "g", k: 1000, bigName: "kilograms", smallName: "grams",
      anchor: "A bag of sugar is about 1 kg — that's 1000 g." },
    { big: "g", small: "mg", k: 1000, bigName: "grams", smallName: "milligrams",
      anchor: "A paperclip is about 1 g. A grain of sand is a few mg." },
    { big: "t", small: "kg", k: 1000, bigName: "tonnes", smallName: "kilograms",
      anchor: "A small car weighs about 1 tonne = 1000 kg." },
    { big: "L", small: "mL", k: 1000, bigName: "litres", smallName: "millilitres",
      anchor: "A big soda bottle is 2 L = 2000 mL. A teaspoon is 5 mL." },
    { big: "s", small: "ms", k: 1000, bigName: "seconds", smallName: "milliseconds",
      anchor: "A blink takes about 100 ms — a tenth of a second." }
  ];

  // ---- Level 2: the imperial family (the awkward numbers) --------------
  const IMP_STEPS = [
    { big: "ft", small: "in", k: 12, bigName: "feet", smallName: "inches",
      anchor: "A school ruler is 12 inches long — exactly 1 foot." },
    { big: "yd", small: "ft", k: 3, bigName: "yards", smallName: "feet",
      anchor: "A yard is 3 feet — about one big step." },
    { big: "mi", small: "ft", k: 5280, bigName: "miles", smallName: "feet",
      anchor: "1 mile = 5280 feet. Odd number! It came from 1000 Roman double-steps." },
    { big: "lb", small: "oz", k: 16, bigName: "pounds", smallName: "ounces",
      anchor: "A tin of beans is about 1 lb = 16 oz." },
    { big: "st", small: "lb", k: 14, bigName: "stone", smallName: "pounds",
      anchor: "Brits weigh themselves in stone: 1 stone = 14 lb." },
    { big: "gal", small: "qt", k: 4, bigName: "US gallons", smallName: "quarts",
      anchor: "A gallon of milk splits into 4 quarts." },
    { big: "qt", small: "pt", k: 2, bigName: "quarts", smallName: "pints",
      anchor: "Quart is short for 'quarter of a gallon'." },
    { big: "pt", small: "cup", k: 2, bigName: "US pints", smallName: "cups",
      anchor: "1 US pint = 2 cups." },
    { big: "cup", small: "fl oz", k: 8, bigName: "US cups", smallName: "fluid ounces",
      anchor: "1 US cup = 8 fl oz — that's why measuring jugs show both." },
    { big: "gal", small: "cup", k: 16, bigName: "US gallons", smallName: "cups",
      anchor: "4 quarts × 2 pints × 2 cups = 16 cups in a gallon." },
    { big: "ton", small: "lb", k: 2000, bigName: "US tons", smallName: "pounds",
      anchor: "A US (short) ton is 2000 lb — about the weight of a small car." }
  ];

  // ---- Level 3: crossovers (1 a = k b) ---------------------------------
  const CROSS = [
    { a: "in", b: "cm", k: 2.54, aName: "inches", bName: "centimetres",
      say: "1 inch = 2.54 cm exactly", anchor: "Your thumb is about 1 inch wide." },
    { a: "ft", b: "m", k: 0.3048, aName: "feet", bName: "metres",
      say: "1 foot = 0.3048 m exactly (so 1 m ≈ 3.28 ft)", anchor: "A door is about 2 m ≈ 6.6 ft tall." },
    { a: "mi", b: "km", k: 1.609344, aName: "miles", bName: "kilometres",
      say: "1 mile = 1.609 km", anchor: "A 5 km fun run is about 3.1 miles." },
    { a: "lb", b: "kg", k: 0.45359237, aName: "pounds", bName: "kilograms",
      say: "1 pound = 0.4536 kg (and 1 kg ≈ 2.2046 lb)", anchor: "A bag of sugar is 1 kg ≈ 2.2 lb." },
    { a: "oz", b: "g", k: 28.349523125, aName: "ounces", bName: "grams",
      say: "1 ounce = 28.35 g", anchor: "A slice of bread is about 1 oz." },
    { a: "gal", b: "L", k: 3.785411784, aName: "US gallons", bName: "litres",
      say: "1 US gallon = 3.785 L", anchor: "A big milk jug is 1 gallon ≈ 3.8 L." },
    { a: "yd", b: "m", k: 0.9144, aName: "yards", bName: "metres",
      say: "1 yard = 0.9144 m exactly — nearly the same as a metre!", anchor: "A yard is a metre minus about 9 cm." },
    { a: "qt", b: "L", k: 0.946352946, aName: "US quarts", bName: "litres",
      say: "1 US quart = 0.9464 L — almost exactly a litre", anchor: "Swap quarts for litres in a recipe and nobody notices." }
  ];

  // ---- Level 5: time ---------------------------------------------------
  const TIME_STEPS = [
    { big: "min", small: "s", k: 60, bigName: "minutes", smallName: "seconds",
      anchor: "Count to 60 and a minute has gone by." },
    { big: "hr", small: "min", k: 60, bigName: "hours", smallName: "minutes",
      anchor: "A school lesson is often 45 min — three quarters of an hour." },
    { big: "day", small: "hr", k: 24, bigName: "days", smallName: "hours",
      anchor: "24 hours: the time the Earth takes to spin once." },
    { big: "wk", small: "day", k: 7, bigName: "weeks", smallName: "days",
      anchor: "7 days in a week — 5 school days plus the weekend." },
    { big: "yr", small: "mo", k: 12, bigName: "years", smallName: "months",
      anchor: "12 months in a year, one for each page of the calendar." },
    { big: "hr", small: "s", k: 3600, bigName: "hours", smallName: "seconds",
      anchor: "60 × 60 = 3600 seconds in an hour." },
    { big: "day", small: "min", k: 1440, bigName: "days", smallName: "minutes",
      anchor: "24 × 60 = 1440 minutes in a day." },
    { big: "normal year", small: "day", k: 365, bigName: "years", smallName: "days",
      anchor: "365 days in a normal year (366 in a leap year!)." }
  ];

  // ---- Level 6: area & volume (square/cube the factor!) ----------------
  const SQ_STEPS = [
    { big: "cm²", small: "mm²", k: 100, bigName: "square centimetres", smallName: "square millimetres",
      anchor: "1 cm = 10 mm, so 1 cm² = 10 × 10 = 100 mm². Square the factor!" },
    { big: "m²", small: "cm²", k: 10000, bigName: "square metres", smallName: "square centimetres",
      anchor: "1 m = 100 cm, so 1 m² = 100 × 100 = 10,000 cm². Square the factor!" },
    { big: "km²", small: "m²", k: 1000000, bigName: "square kilometres", smallName: "square metres",
      anchor: "1 km = 1000 m, so 1 km² = 1000 × 1000 = 1,000,000 m²." },
    { big: "ha", small: "m²", k: 10000, bigName: "hectares", smallName: "square metres",
      anchor: "A hectare is a square 100 m on each side — about a rugby pitch." },
    { big: "ft²", small: "in²", k: 144, bigName: "square feet", smallName: "square inches",
      anchor: "1 ft = 12 in, so 1 ft² = 12 × 12 = 144 in²." },
    { big: "yd²", small: "ft²", k: 9, bigName: "square yards", smallName: "square feet",
      anchor: "1 yd = 3 ft, so 1 yd² = 3 × 3 = 9 ft²." },
    { big: "L", small: "cm³", k: 1000, bigName: "litres", smallName: "cubic centimetres",
      anchor: "1 mL = 1 cm³ exactly. A litre is a 10 cm cube: 10 × 10 × 10 = 1000 cm³." },
    { big: "m³", small: "L", k: 1000, bigName: "cubic metres", smallName: "litres",
      anchor: "A cubic metre of water is 1000 L — and it weighs a whole tonne!" },
    { big: "m³", small: "cm³", k: 1000000, bigName: "cubic metres", smallName: "cubic centimetres",
      anchor: "1 m = 100 cm, so 1 m³ = 100 × 100 × 100 = 1,000,000 cm³. Cube the factor!" }
  ];

  // A ladder question: "how many X in n Y?", both directions.
  function ladderQ(s) {
    const set = s.k >= 1000 ? [2, 3, 4, 5, 10, 1.5, 0.5] : [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 20, 25, 1.5, 2.5, 0.5];
    const big2small = Math.random() < 0.5;
    if (big2small) {
      const n = pick(set);
      const exact = clean(n * s.k);
      return {
        text: "How many " + s.smallName + " (" + s.small + ") are in " + fmt(n) + " " + s.big + "?",
        unit: s.small, exact: exact, dp: decimalsOf(exact),
        hint: "There are <b>" + fmt(s.k) + " " + s.small + " in 1 " + s.big +
              "</b>. You're going from the BIG unit down to the small one, so you need <b>more</b> of them — <b>multiply</b>.",
        work: fmt(n) + " " + s.big + " × " + fmt(s.k) + " = <b>" + fmt(exact) + " " + s.small + "</b>",
        anchor: s.anchor,
        trap: clean(n / s.k),
        trapMsg: "You divided when you needed to multiply. Small units are tiny, so it takes <b>more</b> of them — the answer has to be <b>bigger</b> than " + fmt(n) + "."
      };
    }
    const ans = pick(set);
    const q = clean(ans * s.k);
    return {
      text: "How many " + s.bigName + " (" + s.big + ") are in " + fmt(q) + " " + s.small + "?",
      unit: s.big, exact: ans, dp: decimalsOf(ans),
      hint: "There are <b>" + fmt(s.k) + " " + s.small + " in 1 " + s.big +
            "</b>. You're going from the small unit up to the BIG one, so you need <b>fewer</b> — <b>divide</b>.",
      work: fmt(q) + " " + s.small + " ÷ " + fmt(s.k) + " = <b>" + fmt(ans) + " " + s.big + "</b>",
      anchor: s.anchor,
      trap: clean(q * s.k),
      trapMsg: "You multiplied when you needed to divide. Big units are big, so it takes <b>fewer</b> of them — the answer has to be <b>smaller</b> than " + fmt(q) + "."
    };
  }

  // A crossover question between the two systems.
  function crossQ(c) {
    const aToB = Math.random() < 0.5;
    const k = aToB ? c.k : 1 / c.k;
    // Scale the starting number up until the answer is at least 2, so we
    // never ask "how many ounces is 2 g?" (0.07 oz — a number no child can
    // picture, and one where rounding to 1 dp throws the answer away).
    let n = pick([2, 3, 4, 5, 6, 8, 10, 12, 20]);
    while (n * k < 2) n *= 10;
    const exact = clean(n * k);
    const dp = Math.abs(exact) >= 100 ? 0 : 1;
    const src = aToB ? c.a : c.b, dst = aToB ? c.b : c.a;
    const dstName = aToB ? c.bName : c.aName;
    return {
      text: "About how many " + dstName + " (" + dst + ") is " + n + " " + src + "?",
      sub: dp === 0 ? "round to the nearest whole number" : "round to 1 decimal place",
      unit: dst, exact: exact, dp: dp, relTol: 0.005,
      hint: c.say + ". Going from <b>" + src + "</b> to <b>" + dst + "</b> means " +
            (aToB ? "<b>× " + fmt(c.k) + "</b>" : "<b>÷ " + fmt(c.k) + "</b>") + ".",
      work: n + " " + src + (aToB ? " × " : " ÷ ") + fmt(c.k) + " = " + fmt(clean(exact)) +
            " → <b>" + fmt(roundTo(exact, dp)) + " " + dst + "</b>",
      anchor: c.anchor,
      trap: clean(aToB ? n / c.k : n * c.k),
      trapMsg: "You went the wrong way — you " + (aToB ? "divided" : "multiplied") +
               " instead. Think about which unit is bigger first!"
    };
  }

  // Temperature: real formulas, substituted step by step.
  const C_VALS = [-40, -20, -10, 0, 5, 10, 15, 20, 25, 30, 35, 37, 40, 45, 100];
  const F_VALS = [-40, 14, 32, 50, 68, 77, 86, 98.6, 104, 212];
  function tempQ() {
    const kind = pick(["c2f", "c2f", "f2c", "f2c", "c2k", "k2c"]);
    if (kind === "c2f") {
      const c = pick(C_VALS), exact = clean(c * 9 / 5 + 32);
      return {
        text: "It is " + c + " °C. What is that in °F?", unit: "°F",
        exact: exact, dp: decimalsOf(exact),
        hint: "The formula is <b>°F = °C × 9⁄5 + 32</b>. (×9⁄5 is the same as ×1.8.)",
        work: "°F = " + c + " × 9⁄5 + 32 = " + fmt(clean(c * 9 / 5)) + " + 32 = <b>" + fmt(exact) + " °F</b>",
        anchor: "0 °C = 32 °F (ice) and 100 °C = 212 °F (boiling) — two anchors worth remembering.",
        trap: clean((c - 32) * 5 / 9),
        trapMsg: "That's the <i>other</i> formula — you turned it into °C instead of °F."
      };
    }
    if (kind === "f2c") {
      const f = pick(F_VALS), raw = (f - 32) * 5 / 9;
      const exact = clean(raw), dp = Math.abs(exact - Math.round(exact)) < 1e-9 ? 0 : 1;
      return {
        text: "It is " + f + " °F. What is that in °C?", unit: "°C",
        exact: exact, dp: dp,
        hint: "The formula is <b>°C = (°F − 32) × 5⁄9</b>. Take away 32 <i>first</i>, then multiply.",
        work: "°C = (" + f + " − 32) × 5⁄9 = " + fmt(clean(f - 32)) + " × 5⁄9 = <b>" + fmt(roundTo(exact, dp)) + " °C</b>",
        anchor: "A quick trick: take 30 off the °F, then halve it — close enough for the weather!",
        trap: clean(f * 9 / 5 + 32),
        trapMsg: "That's the <i>other</i> formula — you turned it into °F instead of °C."
      };
    }
    if (kind === "c2k") {
      const c = pick(C_VALS), exact = clean(c + 273.15);
      return {
        text: "It is " + c + " °C. What is that in kelvin (K)?", unit: "K",
        exact: exact, dp: 2, tolAbs: 0.6,
        sub: "the nearest whole number is fine",
        hint: "Kelvin uses the same size step as Celsius, it just starts at absolute zero: <b>K = °C + 273.15</b>. No multiplying!",
        work: "K = " + c + " + 273.15 = <b>" + fmt(exact) + " K</b>",
        anchor: "0 K is absolute zero (−273.15 °C) — the coldest anything can ever get. Kelvin never goes negative.",
        trap: clean(c - 273.15),
        trapMsg: "You subtracted — that's the way <i>back</i> from kelvin to Celsius."
      };
    }
    const k = pick([200, 250, 273.15, 300, 310, 373.15]), exact = clean(k - 273.15);
    return {
      text: "It is " + k + " K. What is that in °C?", unit: "°C",
      exact: exact, dp: 2, tolAbs: 0.6, sub: "the nearest whole number is fine",
      hint: "Going back from kelvin: <b>°C = K − 273.15</b>.",
      work: "°C = " + k + " − 273.15 = <b>" + fmt(exact) + " °C</b>",
      anchor: "Room temperature is about 293 K — you can see why we use °C every day!",
      trap: clean(k + 273.15),
      trapMsg: "You added instead of subtracting — kelvin numbers are always <i>bigger</i> than Celsius ones."
    };
  }

  // ---- Level 7: two-step problems (for Shannon, and brave kids) --------
  const MULTI = [
    function () {
      const n = pick([1, 1.5, 2, 2.5, 3, 4]), exact = clean(n * 236.5882365);
      return {
        text: "A recipe asks for " + fmt(n) + " US cups of milk, but your jug only has millilitres. How many mL?",
        sub: "nearest whole mL", unit: "mL", exact: exact, dp: 0, tolAbs: 2,
        hint: "Two steps: <b>1 cup = 8 fl oz</b>, and <b>1 US fl oz = 29.57 mL</b>.",
        work: fmt(n) + " cup × 8 = " + fmt(clean(n * 8)) + " fl oz<br>" +
              fmt(clean(n * 8)) + " fl oz × 29.5735 = <b>" + fmt(Math.round(exact)) + " mL</b>",
        anchor: "1 US cup ≈ 237 mL — just under a quarter of a litre."
      };
    },
    function () {
      const f = pick([300, 325, 350, 375, 400, 425, 450]), exact = clean((f - 32) * 5 / 9);
      return {
        text: "An American recipe says bake at " + f + " °F. Your oven is in °C — what do you set it to?",
        sub: "nearest whole °C", unit: "°C", exact: exact, dp: 0, tolAbs: 1,
        hint: "<b>°C = (°F − 32) × 5⁄9</b>. Subtract first, then multiply.",
        work: "(" + f + " − 32) × 5⁄9 = " + (f - 32) + " × 5⁄9 = <b>" + Math.round(exact) + " °C</b>",
        anchor: "Ovens go in steps of 5 or 10, so cooks round: 350 °F ≈ 180 °C."
      };
    },
    function () {
      const km = pick([5, 10, 15, 21.1, 42.2]), exact = clean(km / 1.609344);
      return {
        text: "Shannon ran " + km + " km. Her American friend asks how many MILES that is.",
        sub: "round to 1 decimal place", unit: "mi", exact: exact, dp: 1, relTol: 0.008,
        hint: "<b>1 mile = 1.609 km</b>. Kilometres are smaller, so the number of miles is <b>smaller</b> — divide.",
        work: km + " km ÷ 1.609344 = <b>" + fmt(roundTo(exact, 1)) + " miles</b>",
        anchor: "A marathon is 42.2 km = 26.2 miles."
      };
    },
    function () {
      const kg = pick([2.5, 3, 3.5, 4, 5, 6]), exact = clean(kg / 0.45359237);
      return {
        text: "Baby Kieran weighs " + kg + " kg. How many POUNDS is that?",
        sub: "round to 1 decimal place", unit: "lb", exact: exact, dp: 1, relTol: 0.008,
        hint: "<b>1 kg ≈ 2.2046 lb</b> (because 1 lb = 0.4536 kg). Multiply by 2.2046.",
        work: kg + " kg × 2.2046 = <b>" + fmt(roundTo(exact, 1)) + " lb</b>",
        anchor: "A bag of sugar is 1 kg ≈ 2.2 lb — handy for guessing."
      };
    },
    function () {
      const d = pick([1, 2, 3, 5]), exact = d * 86400;
      return {
        text: "How many SECONDS are there in " + d + " day" + (d > 1 ? "s" : "") + "?",
        unit: "s", exact: exact, dp: 0,
        hint: "Three steps: days → hours (×24), hours → minutes (×60), minutes → seconds (×60).",
        work: d + " × 24 = " + (d * 24) + " hours<br>" + (d * 24) + " × 60 = " + fmt(d * 1440) +
              " minutes<br>" + fmt(d * 1440) + " × 60 = <b>" + fmt(exact) + " seconds</b>",
        anchor: "One day = 86,400 seconds. Worth memorising!"
      };
    },
    function () {
      const w = pick([1, 2, 3, 4]), exact = w * 10080;
      return {
        text: "How many MINUTES are there in " + w + " week" + (w > 1 ? "s" : "") + "?",
        unit: "min", exact: exact, dp: 0,
        hint: "weeks → days (×7), days → hours (×24), hours → minutes (×60).",
        work: w + " × 7 = " + (w * 7) + " days<br>" + (w * 7) + " × 24 = " + fmt(w * 168) +
              " hours<br>" + fmt(w * 168) + " × 60 = <b>" + fmt(exact) + " minutes</b>",
        anchor: "One week = 10,080 minutes."
      };
    },
    function () {
      const a = pick([3, 4, 5]), b = pick([3, 4, 5]);
      const exact = clean(a * b / 0.09290304);
      return {
        text: "A room is " + a + " m × " + b + " m. How many SQUARE FEET is that?",
        sub: "nearest whole ft²", unit: "ft²", exact: exact, dp: 0, tolAbs: 1,
        hint: "First find the area: " + a + " × " + b + " = " + (a * b) +
              " m². Then <b>1 m² = 10.764 ft²</b> (because 1 m = 3.28 ft, and 3.28² = 10.76).",
        work: a + " × " + b + " = " + (a * b) + " m²<br>" + (a * b) +
              " × 10.7639 = <b>" + Math.round(exact) + " ft²</b>",
        anchor: "Areas square the factor: 1 m = 3.28 ft, but 1 m² = 10.76 ft²."
      };
    },
    function () {
      const r = pick([1, 2, 3, 5]), exact = clean(r * 3600 / 1000);
      return {
        text: "A tap drips " + r + " mL every second. How many LITRES leak in one hour?",
        sub: "round to 1 decimal place", unit: "L", exact: exact, dp: 1,
        hint: "Seconds → hours first (×3600), then mL → L (÷1000).",
        work: r + " mL × 3600 = " + fmt(r * 3600) + " mL in an hour<br>" +
              fmt(r * 3600) + " ÷ 1000 = <b>" + fmt(exact) + " L</b>",
        anchor: "A dripping tap really can waste a bathtub of water in a week!"
      };
    },
    function () {
      const kmh = pick([36, 54, 72, 90, 108, 120]), exact = clean(kmh / 3.6);
      return {
        text: "A car is doing " + kmh + " km/h. How many METRES PER SECOND is that?",
        sub: "round to 1 decimal place", unit: "m/s", exact: exact, dp: 1,
        hint: "1 km = 1000 m and 1 hour = 3600 s, so km/h → m/s is <b>× 1000 ÷ 3600</b>, which is just <b>÷ 3.6</b>.",
        work: kmh + " × 1000 = " + fmt(kmh * 1000) + " m per hour<br>" +
              fmt(kmh * 1000) + " ÷ 3600 = <b>" + fmt(roundTo(exact, 1)) + " m/s</b>",
        anchor: "Divide by 3.6 to go km/h → m/s; multiply by 3.6 to come back."
      };
    },
    function () {
      const st = pick([8, 9, 10, 11, 12]), exact = clean(st * 6.35029318);
      return {
        text: "Grandad weighs " + st + " stone. How many KILOGRAMS is that?",
        sub: "round to 1 decimal place", unit: "kg", exact: exact, dp: 1, relTol: 0.008,
        hint: "Two steps: <b>1 stone = 14 lb</b>, and <b>1 lb = 0.4536 kg</b>.",
        work: st + " × 14 = " + (st * 14) + " lb<br>" + (st * 14) +
              " × 0.45359 = <b>" + fmt(roundTo(exact, 1)) + " kg</b>",
        anchor: "1 stone ≈ 6.35 kg."
      };
    },
    function () {
      const l = pick([1, 1.5, 2, 3]), exact = clean(l / 0.2365882365);
      return {
        text: "A " + l + " L bottle of juice — how many US CUPS will it fill?",
        sub: "round to 1 decimal place", unit: "cups", exact: exact, dp: 1, relTol: 0.008,
        hint: "<b>1 cup = 236.6 mL</b>, so " + l + " L = " + fmt(l * 1000) + " mL, then divide by 236.6.",
        work: l + " L × 1000 = " + fmt(l * 1000) + " mL<br>" + fmt(l * 1000) +
              " ÷ 236.588 = <b>" + fmt(roundTo(exact, 1)) + " cups</b>",
        anchor: "A litre is a bit more than 4 cups."
      };
    }
  ];

  const LEVELS = [
    { key: "metric", name: "1 · Metric steps", emoji: "🔟",
      blurb: "mm → cm → m → km, g → kg, mL → L. Every step is ×10, ×100 or ×1000 — the easiest ladder there is.",
      make: () => ladderQ(pick(METRIC_STEPS)) },
    { key: "imperial", name: "2 · Feet & pounds", emoji: "👣",
      blurb: "The American units that DON'T go in tens: 12 in a foot, 3 ft in a yard, 16 oz in a pound, 5280 ft in a mile.",
      make: () => ladderQ(pick(IMP_STEPS)) },
    { key: "cross", name: "3 · Metric ⇄ Imperial", emoji: "🔁",
      blurb: "The crossovers worth memorising: 1 in = 2.54 cm · 1 mi ≈ 1.609 km · 1 kg ≈ 2.2 lb · 1 US gal ≈ 3.785 L.",
      make: () => crossQ(pick(CROSS)) },
    { key: "temp", name: "4 · Temperature", emoji: "🌡️",
      blurb: "Temperature is the odd one out — you add and subtract as well as multiply. °F = °C × 9⁄5 + 32, and K = °C + 273.15.",
      make: tempQ },
    { key: "time", name: "5 · Time", emoji: "⏱️",
      blurb: "60 seconds, 60 minutes, 24 hours, 7 days, 12 months. Nothing here is a power of ten!",
      make: () => ladderQ(pick(TIME_STEPS)) },
    { key: "areavol", name: "6 · Area & Volume", emoji: "🟩",
      blurb: "The big idea: for AREA you square the factor (1 m = 100 cm, so 1 m² = 10,000 cm²) and for VOLUME you cube it.",
      make: () => ladderQ(pick(SQ_STEPS)) },
    { key: "multi", name: "7 · Two-step 🧠", emoji: "🧠",
      blurb: "Grown-up level: real problems that need two or three conversions in a row — recipes, ovens, marathons, oh my.",
      make: () => pick(MULTI)() }
  ];

  const QUIZ_KEY = "unitConverter-quiz";
  let quiz = { stars: 0, best: 0, level: 0, unlocked: 1, lvl: {} };
  try {
    const s = JSON.parse(localStorage.getItem(QUIZ_KEY)) || {};
    if (typeof s.stars === "number") quiz.stars = s.stars;
    if (typeof s.best === "number") quiz.best = s.best;
    if (typeof s.level === "number") quiz.level = s.level;
    if (typeof s.unlocked === "number") quiz.unlocked = s.unlocked;
    if (s.lvl && typeof s.lvl === "object") quiz.lvl = s.lvl;
  } catch (e) {}
  quiz.unlocked = Math.min(Math.max(1, quiz.unlocked | 0), LEVELS.length);
  quiz.level = Math.min(Math.max(0, quiz.level | 0), quiz.unlocked - 1);

  let quizStreak = 0;
  let lastQText = "";
  let current = null;
  let usedHint = false;

  function saveQuiz() {
    try { localStorage.setItem(QUIZ_KEY, JSON.stringify(quiz)); } catch (e) {}
  }
  function lvlStat(key) {
    if (!quiz.lvl[key]) quiz.lvl[key] = { c: 0, a: 0 };
    return quiz.lvl[key];
  }
  function medal(key) {
    const c = lvlStat(key).c;
    return c >= 20 ? "🥇" : c >= 10 ? "🥈" : c >= 4 ? "🥉" : "";
  }
  function syncQuizScore() {
    $("quizStars").textContent = quiz.stars;
    $("quizBest").textContent = quiz.best;
  }

  function buildLevels() {
    const box = $("lvls");
    box.innerHTML = "";
    LEVELS.forEach((L, i) => {
      const b = document.createElement("button");
      b.type = "button";
      const locked = i >= quiz.unlocked;
      b.className = "lvl" + (locked ? " locked" : "");
      b.setAttribute("aria-pressed", i === quiz.level ? "true" : "false");
      b.innerHTML = esc(L.name) + (medal(L.key) ? ' <span class="medal">' + medal(L.key) + "</span>" : "") +
        (locked ? " 🔒" : "");
      b.setAttribute("aria-label", L.name + (locked ? " (locked — get 4 right on the level before)" : ""));
      b.onclick = () => {
        if (locked) {
          const need = LEVELS[quiz.unlocked - 1];
          $("lvlBlurb").innerHTML = "🔒 Get <b>4 right</b> on <b>" + esc(need.name) +
            "</b> to unlock this one. (Grown-ups can tap <b>unlock all</b> below.)";
          window.SFX && SFX.nope && SFX.nope();
          return;
        }
        quiz.level = i; saveQuiz(); renderQuiz();
      };
      box.appendChild(b);
    });
    if (quiz.unlocked < LEVELS.length) {
      const u = document.createElement("button");
      u.type = "button";
      u.className = "lvl";
      u.textContent = "🔑 unlock all";
      u.setAttribute("aria-label", "Grown-ups: unlock every level");
      u.onclick = () => { quiz.unlocked = LEVELS.length; saveQuiz(); renderQuiz(); };
      box.appendChild(u);
    }
  }

  // Is the typed answer close enough? A correctly-rounded answer must pass —
  // but an answer that is simply WRONG must never squeak through.
  function grade(q, user) {
    if (!isFinite(user)) return "wrong";
    const dp = q.dp || 0;
    const step = Math.pow(10, -dp);
    const scale = Math.max(Math.abs(q.exact), 1);
    // Does this answer actually need rounding? "How many mm in 2 cm?" is
    // exactly 20 — there is nothing to round, so only 20 is right. Half a
    // step of slack is given ONLY when the true answer really does have to
    // be rounded (5.08 cm asked to 1 dp, say).
    const needsRounding = Math.abs(roundTo(q.exact, dp) - q.exact) > scale * 1e-12;
    // The relative/absolute part forgives a kid who used a school-rounded
    // factor (2.2 lb, 1.61 km, …) — it is only set on questions that say
    // "about" or "round to …".
    const tol = (needsRounding ? step * 0.5 : 0) +
                Math.max(Math.abs(q.exact) * (q.relTol || 0), q.tolAbs || 0) + scale * 1e-9;
    if (Math.abs(user - q.exact) <= tol) return "right";
    if (q.trap != null && Math.abs(user - q.trap) <= Math.max(Math.abs(q.trap) * 0.01, tol)) return "trap";
    const ps = [10, 100, 1000, 0.1, 0.01, 0.001];
    for (let i = 0; i < ps.length; i++) {
      if (Math.abs(user * ps[i] - q.exact) <= Math.max(tol, Math.abs(q.exact) * 0.01)) return "ten";
    }
    return "wrong";
  }

  function showLevelBlurb() {
    const L = LEVELS[quiz.level];
    const st = lvlStat(L.key);
    $("lvlBlurb").innerHTML = esc(L.emoji) + " <b>" + esc(L.name) + "</b> — " + L.blurb +
      " <br><span style=\"opacity:.8\">You've got <b>" + st.c + "</b> right here" +
      (st.a ? " out of " + st.a + " tries" : "") +
      (medal(L.key) ? " " + medal(L.key) : "") + ".</span>";
  }

  function renderQuiz() {
    syncQuizScore();
    buildLevels();
    showLevelBlurb();
    quizIdle();
  }

  function quizIdle() {
    current = null;
    const body = $("quizBody");
    body.innerHTML = "";
    const p = document.createElement("div");
    p.className = "quiz-q";
    p.textContent = "Ready? 🧠";
    body.appendChild(p);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn go";
    btn.textContent = "🎯 Ask me a question";
    btn.onclick = askQ;
    body.appendChild(btn);
  }

  function askQ() {
    const L = LEVELS[quiz.level];
    let q = null;
    for (let i = 0; i < 25; i++) {
      q = L.make();
      if (q && q.text !== lastQText) break;
    }
    if (!q) { quizIdle(); return; }
    lastQText = q.text;
    current = q;
    usedHint = false;

    const body = $("quizBody");
    body.innerHTML = "";

    const qEl = document.createElement("div");
    qEl.className = "quiz-q";
    qEl.innerHTML = esc(q.text);
    body.appendChild(qEl);

    const sub = document.createElement("div");
    sub.className = "quiz-sub";
    sub.textContent = q.sub ? "✏️ " + q.sub : "✏️ type your answer, then press Check";
    body.appendChild(sub);

    const row = document.createElement("div");
    row.className = "ans-row";
    const inp = document.createElement("input");
    inp.type = "text";
    inp.id = "ansInput";
    inp.inputMode = "decimal";
    inp.autocomplete = "off";
    inp.setAttribute("aria-label", "Your answer in " + q.unit);
    inp.placeholder = "?";
    const unit = document.createElement("span");
    unit.className = "ans-unit";
    unit.textContent = q.unit;
    const go = document.createElement("button");
    go.type = "button";
    go.className = "btn go";
    go.id = "ansCheck";
    go.textContent = "Check ✔";
    go.onclick = () => submitAnswer(inp.value);
    inp.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); submitAnswer(inp.value); } });
    row.appendChild(inp); row.appendChild(unit); row.appendChild(go);
    body.appendChild(row);

    const acts = document.createElement("div");
    acts.className = "quiz-actions";
    const hint = document.createElement("button");
    hint.type = "button";
    hint.className = "btn ghost";
    hint.id = "hintBtn";
    hint.textContent = "🤔 How do I do it?";
    hint.onclick = () => {
      usedHint = true;
      hint.disabled = true;
      const h = document.createElement("div");
      h.className = "quiz-feedback";
      h.innerHTML = "💡 " + q.hint;
      body.insertBefore(h, acts.nextSibling);
    };
    const skip = document.createElement("button");
    skip.type = "button";
    skip.className = "btn ghost";
    skip.textContent = "🔀 Different question";
    skip.onclick = askQ;
    acts.appendChild(hint); acts.appendChild(skip);
    body.appendChild(acts);

    const streak = document.createElement("div");
    streak.className = "quiz-streak";
    streak.textContent = quizStreak >= 2 ? "🔥 Streak: " + quizStreak : "";
    body.appendChild(streak);

    try { inp.focus(); } catch (e) {}
  }

  function submitAnswer(raw) {
    const q = current;
    if (!q) return;
    // Tablet keyboards happily produce − (U+2212) and – (en dash); a child
    // typing a below-zero temperature should not be punished for that.
    const txt = String(raw == null ? "" : raw).trim()
      .replace(/,/g, "").replace(/[\u2212\u2012-\u2015]/g, "-").replace(/^\+/, "");
    if (txt === "") {
      const inp = $("ansInput");
      if (inp) { inp.placeholder = "type a number!"; try { inp.focus(); } catch (e) {} }
      return;
    }
    const user = parseFloat(txt);
    const verdict = grade(q, user);
    current = null;

    const L = LEVELS[quiz.level];
    const st = lvlStat(L.key);
    st.a++;

    const body = $("quizBody");
    const inp = $("ansInput");
    if (inp) inp.disabled = true;
    const chk = $("ansCheck");
    if (chk) chk.disabled = true;
    const hb = $("hintBtn");
    if (hb) hb.disabled = true;

    const fb = document.createElement("div");
    fb.className = "quiz-feedback";
    const shown = fmt(roundTo(q.exact, q.dp || 0));

    if (verdict === "right") {
      st.c++;
      quiz.stars++;
      quizStreak++;
      if (quizStreak > quiz.best) quiz.best = quizStreak;
      let cheer = usedHint ? "✅ <b>Yes — and you worked it out!</b> " : "✅ <b>Yes!</b> ";
      if (quizStreak > 0 && quizStreak % 5 === 0) {
        cheer = "🎉 <b>" + quizStreak + " in a row!</b> ";
        window.SFX && SFX.win && SFX.win();
        window.Confetti && Confetti.burst({ count: 90 });
      } else {
        window.SFX && SFX.good && SFX.good();
      }
      fb.innerHTML = cheer + "<span class=\"work\">" + q.work + "</span>" +
        (q.anchor ? '<span class="anchor">📌 ' + esc(q.anchor) + "</span>" : "");
      // Unlock the next rung of the ladder.
      if (st.c >= 4 && quiz.unlocked === quiz.level + 1 && quiz.unlocked < LEVELS.length) {
        quiz.unlocked++;
        window.SFX && SFX.win && SFX.win();
        window.Confetti && Confetti.burst({ count: 120 });
        const un = document.createElement("div");
        un.className = "quiz-feedback";
        un.innerHTML = "🔓 <b>New level unlocked:</b> " + esc(LEVELS[quiz.unlocked - 1].name) + "!";
        fb.appendChild(un);
      }
    } else {
      quizStreak = 0;
      window.SFX && SFX.nope && SFX.nope();
      let lead;
      if (verdict === "trap") {
        lead = "🔄 <b>Right numbers, wrong direction!</b> " + q.trapMsg + " The answer is <b>" + shown + " " + esc(q.unit) + "</b>.";
      } else if (verdict === "ten") {
        lead = "😮 <b>So close!</b> Your digits are right but you're out by a factor of ten — check where the decimal point goes. It's <b>" + shown + " " + esc(q.unit) + "</b>.";
      } else {
        lead = "❌ Not quite — it's <b>" + shown + " " + esc(q.unit) + "</b>. Here's how:";
      }
      fb.innerHTML = lead + "<span class=\"work\">" + q.work + "</span>" +
        "<span class=\"anchor\">💡 " + q.hint + "</span>" +
        (q.anchor ? '<span class="anchor">📌 ' + esc(q.anchor) + "</span>" : "");
    }
    body.appendChild(fb);

    const next = document.createElement("button");
    next.type = "button";
    next.className = "btn next";
    next.textContent = "Next question ▶";
    next.onclick = askQ;
    body.appendChild(next);
    try { next.focus(); } catch (e) {}

    saveQuiz();
    syncQuizScore();
    buildLevels();
    showLevelBlurb();
  }

  function buildLadder() {
    $("ladder").innerHTML = LEVELS.map(L =>
      "<p><b>" + esc(L.emoji + " " + L.name) + "</b><br>" + L.blurb + "</p>").join("");
  }

  // =====================================================================
  //  🍰 REAL LIFE — scale a recipe, and a height chart
  // =====================================================================
  const REAL_KEY = "unitConverter-real";
  const RECIPES = [
    { key: "pancakes", name: "🥞 Pancakes", base: 4, unitWord: "pancake servings", ovenF: null,
      note: "Cook these on a hot pan — no oven needed. 🍳",
      items: [
        { e: "🌾", n: "plain flour",   us: { v: 1.5,  u: "cups" }, si: { v: 190, u: "g" } },
        { e: "🥄", n: "baking powder", us: { v: 3.5,  u: "tsp"  }, si: { v: 14,  u: "g" } },
        { e: "🧂", n: "salt",          us: { v: 1,    u: "tsp"  }, si: { v: 6,   u: "g" } },
        { e: "🍚", n: "sugar",         us: { v: 1,    u: "tbsp" }, si: { v: 12,  u: "g" } },
        { e: "🥛", n: "milk",          us: { v: 1.25, u: "cups" }, si: { v: 295, u: "mL" } },
        { e: "🥚", n: "egg",           us: { v: 1,    u: "egg"  }, si: { v: 1,   u: "egg" } },
        { e: "🧈", n: "melted butter", us: { v: 3,    u: "tbsp" }, si: { v: 43,  u: "g" } }
      ] },
    { key: "cookies", name: "🍪 Chocolate chip cookies", base: 24, unitWord: "cookies", ovenF: 375,
      note: "Bake for about 10 minutes, until the edges go golden. 🍪",
      items: [
        { e: "🧈", n: "soft butter",     us: { v: 1,    u: "cup"  }, si: { v: 225, u: "g" } },
        { e: "🍚", n: "sugar",           us: { v: 0.75, u: "cup"  }, si: { v: 150, u: "g" } },
        { e: "🟤", n: "brown sugar",     us: { v: 0.75, u: "cup"  }, si: { v: 165, u: "g" } },
        { e: "🥚", n: "eggs",            us: { v: 2,    u: "eggs" }, si: { v: 2,   u: "eggs" } },
        { e: "🌾", n: "plain flour",     us: { v: 2.25, u: "cups" }, si: { v: 280, u: "g" } },
        { e: "🥄", n: "baking soda",     us: { v: 1,    u: "tsp"  }, si: { v: 5,   u: "g" } },
        { e: "🍫", n: "chocolate chips", us: { v: 2,    u: "cups" }, si: { v: 340, u: "g" } }
      ] },
    { key: "cocoa", name: "☕ Hot cocoa", base: 2, unitWord: "mugs", ovenF: null,
      note: "Warm it gently — don't let it boil! ☕",
      items: [
        { e: "🥛", n: "milk",         us: { v: 2,    u: "cups" }, si: { v: 475, u: "mL" } },
        { e: "🍫", n: "cocoa powder", us: { v: 2,    u: "tbsp" }, si: { v: 12,  u: "g" } },
        { e: "🍚", n: "sugar",        us: { v: 2,    u: "tbsp" }, si: { v: 25,  u: "g" } },
        { e: "🧂", n: "pinch of salt", us: { v: 0.125, u: "tsp" }, si: { v: 0.75, u: "g" } },
        { e: "🍦", n: "vanilla",      us: { v: 0.5,  u: "tsp"  }, si: { v: 2.5, u: "mL" } }
      ] }
  ];

  const FRACS = [[0.125, "⅛"], [0.25, "¼"], [1 / 3, "⅓"], [0.375, "⅜"], [0.5, "½"],
                 [0.625, "⅝"], [2 / 3, "⅔"], [0.75, "¾"], [0.875, "⅞"]];

  // Cooks write "1½ cups", not "1.5 cups".
  function fmtCook(x) {
    if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
    const whole = Math.floor(x), frac = x - whole;
    for (let i = 0; i < FRACS.length; i++) {
      if (Math.abs(frac - FRACS[i][0]) < 0.02) return (whole ? whole + " " : "") + FRACS[i][1];
    }
    return String(Math.round(x * 100) / 100);
  }
  function fmtMetric(x) {
    if (x >= 100) return String(Math.round(x / 5) * 5);
    if (x >= 10) return String(Math.round(x));
    return String(Math.round(x * 10) / 10);
  }

  let recipeIdx = 0, serveMult = 1, sysUS = true;

  function loadReal() {
    try {
      const s = JSON.parse(localStorage.getItem(REAL_KEY) || "{}");
      const i = RECIPES.findIndex(r => r.key === s.recipe);
      if (i >= 0) recipeIdx = i;
      if (typeof s.mult === "number" && s.mult > 0) serveMult = s.mult;
      if (typeof s.us === "boolean") sysUS = s.us;
      if (typeof s.cm === "number" && s.cm > 0) $("htCm").value = s.cm;
    } catch (e) {}
  }
  function saveReal() {
    try {
      localStorage.setItem(REAL_KEY, JSON.stringify({
        recipe: RECIPES[recipeIdx].key, mult: serveMult, us: sysUS,
        cm: parseFloat($("htCm").value) || 0
      }));
    } catch (e) {}
  }

  function chipRow(box, items, isOn, onPick, labeller) {
    box.innerHTML = "";
    items.forEach((it, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = labeller(it, i);
      b.setAttribute("aria-pressed", isOn(it, i) ? "true" : "false");
      b.onclick = () => { onPick(it, i); };
      box.appendChild(b);
    });
  }

  function renderRecipe() {
    const r = RECIPES[recipeIdx];
    chipRow($("recipePick"), RECIPES, (it, i) => i === recipeIdx,
      (it, i) => { recipeIdx = i; serveMult = 1; renderRecipe(); saveReal(); },
      it => it.name);

    const mults = [0.5, 1, 2, 3];
    chipRow($("servePick"), mults, m => Math.abs(m - serveMult) < 1e-9,
      m => { serveMult = m; renderRecipe(); saveReal(); },
      m => fmtCook(r.base * m) + " " + r.unitWord + (Math.abs(m - 1) < 1e-9 ? "" : " (×" + fmtCook(m) + ")"));

    chipRow($("sysPick"), [true, false], v => v === sysUS,
      v => { sysUS = v; renderRecipe(); saveReal(); },
      v => v ? "🇺🇸 cups & spoons" : "🌍 grams & mL");

    const ul = $("ings");
    ul.innerHTML = "";
    r.items.forEach(it => {
      const src = sysUS ? it.us : it.si;
      const amt = src.v * serveMult;
      const li = document.createElement("li");
      const txt = (sysUS ? fmtCook(amt) : fmtMetric(amt)) + " " + src.u;
      li.innerHTML = "<span>" + it.e + " " + esc(it.n) + "</span><span class=\"amt\">" + esc(txt) + "</span>";
      ul.appendChild(li);
    });

    const ov = $("oven");
    if (r.ovenF) {
      const c = (r.ovenF - 32) * 5 / 9;
      ov.style.display = "";
      ov.innerHTML = "🔥 <b>Oven:</b> " + r.ovenF + " °F = <b>" + Math.round(c) + " °C</b>" +
        " (most cooks round to " + (Math.round(c / 10) * 10) + " °C).<br>" +
        "<small>°C = (°F − 32) × 5⁄9 &nbsp;→&nbsp; (" + r.ovenF + " − 32) × 5⁄9 = " +
        (Math.round(c * 10) / 10) + "</small><br>" + esc(r.note);
    } else {
      ov.style.display = "";
      ov.innerHTML = "🍳 " + esc(r.note);
    }

    const ex = r.items[0];
    const exSrc = sysUS ? ex.us : ex.si;
    const m = $("recipeMethod");
    let html = "<b>Scaling:</b> every ingredient gets multiplied by the same number. " +
      "For <b>" + fmtCook(r.base * serveMult) + " " + esc(r.unitWord) + "</b> that's <b>×" + fmtCook(serveMult) + "</b> — " +
      "<code>" + (sysUS ? fmtCook(ex.us.v) : fmtMetric(ex.si.v)) + " " + esc(exSrc.u) +
      " × " + fmtCook(serveMult) + " = " +
      (sysUS ? fmtCook(exSrc.v * serveMult) : fmtMetric(exSrc.v * serveMult)) + " " + esc(exSrc.u) + "</code>.";
    if (sysUS) {
      html += "<br><b>Handy:</b> 1 cup = 8 fl oz = 16 tbsp = 48 tsp ≈ 237 mL. 3 tsp = 1 tbsp.";
    } else {
      html += "<br><b>Handy:</b> 1000 g = 1 kg, 1000 mL = 1 L, and 1 mL of water weighs exactly 1 g.";
    }
    m.innerHTML = html;
  }

  // ---- Height chart ----------------------------------------------------
  const HEIGHTS = [
    { n: "Ellie (3)", cm: 96, e: "👧" },
    { n: "Cory (6)", cm: 116, e: "🧒" },
    { n: "Jeannie (7)", cm: 122, e: "👦" },
    { n: "A door", cm: 200, e: "🚪" },
    { n: "Basketball hoop", cm: 305, e: "🏀" },
    { n: "A giraffe", cm: 550, e: "🦒" }
  ];
  let htGuard = false;

  // Split a length in cm into whole feet + inches, ROUNDING FIRST so we
  // never print nonsense like "3 ft 12 in" when the inches round up to 12.
  function ftIn(cm, dp) {
    const totalIn = cm / 2.54;
    let f = Math.floor(totalIn / 12);
    let i = roundTo(totalIn - f * 12, dp);
    if (i >= 12) { f += 1; i = 0; }
    return { f: f, i: i };
  }

  function renderHeight(from) {
    if (htGuard) return;
    htGuard = true;
    try {
      let cm;
      if (from === "imp") {
        const ft = parseFloat($("htFt").value) || 0;
        const inch = parseFloat($("htIn").value) || 0;
        cm = (ft * 12 + inch) * 2.54;
        $("htCm").value = roundTo(cm, 1);
      } else {
        cm = parseFloat($("htCm").value);
        if (!isFinite(cm) || cm < 0) cm = 0;
        const p = ftIn(cm, 1);
        $("htFt").value = p.f;
        $("htIn").value = p.i;
      }

      const totalIn = cm / 2.54;
      const p = ftIn(cm, 1);
      const ft = p.f, inch = p.i;
      const cmShown = roundTo(cm, 1);
      $("htOut").innerHTML =
        "<b>" + fmt(cmShown) + " cm</b> = <b>" + fmt(roundTo(cm / 100, 3)) + " m</b> = <b>" +
        ft + " ft " + inch + " in</b> = <b>" + fmt(roundTo(totalIn, 1)) + " inches</b>";

      const list = HEIGHTS.concat([{ n: "You", cm: cm, e: "⭐", you: 1 }])
        .sort((a, b) => a.cm - b.cm);
      const max = Math.max(cm, 550) * 1.05 || 1;
      $("htBars").innerHTML = list.map(h => {
        const pc = Math.max(1, Math.min(100, (h.cm / max) * 100));
        const p2 = ftIn(h.cm, 0);
        const f = p2.f, i2 = p2.i;
        return '<div class="barrow' + (h.you ? " you" : "") + '">' +
          '<span class="lbl">' + h.e + " " + esc(h.n) + "</span>" +
          '<span class="track"><span class="fill" style="width:' + pc.toFixed(1) + '%"></span></span>' +
          '<span class="num">' + Math.round(h.cm) + " cm</span>" +
          '<span class="num">' + f + "′" + i2 + "″</span></div>";
      }).join("");

      $("htMethod").innerHTML =
        "<b>cm → inches:</b> divide by 2.54, because 1 inch = 2.54 cm. " +
        "<code>" + fmt(cmShown) + " ÷ 2.54 ≈ " + fmt(roundTo(totalIn, 1)) + " in</code><br>" +
        "<b>inches → feet:</b> divide by 12 and keep the remainder — 12 inches make a foot. " +
        "<code>" + fmt(roundTo(totalIn, 1)) + " ÷ 12 = " + ft + " remainder " + inch + "</code><br>" +
        "<b>cm → m:</b> divide by 100, because there are 100 cm in a metre. " +
        "<code>" + fmt(cmShown) + " ÷ 100 = " + fmt(roundTo(cmShown / 100, 3)) + " m</code>";
      saveReal();
    } catch (e) {}
    htGuard = false;
  }

  // =====================================================================
  //  Tabs + boot
  // =====================================================================
  const TABS = [["explore", "tabExplore", "panelExplore"],
                ["quiz", "tabQuiz", "panelQuiz"],
                ["real", "tabReal", "panelReal"]];

  function showTab(name) {
    tab = name;
    TABS.forEach(t => {
      const on = t[0] === name;
      $(t[1]).setAttribute("aria-selected", on ? "true" : "false");
      $(t[2]).hidden = !on;
    });
    if (name === "quiz") renderQuiz();
    if (name === "real") { renderRecipe(); renderHeight("cm"); }
    saveState();
  }

  TABS.forEach((t, i) => {
    const btn = $(t[1]);
    btn.addEventListener("click", () => {
      window.SFX && SFX.pop && SFX.pop();
      showTab(t[0]);
    });
    // Arrow keys move between tabs, the way a screen-reader user expects.
    btn.addEventListener("keydown", e => {
      let j = -1;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") j = (i + 1) % TABS.length;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = (i + TABS.length - 1) % TABS.length;
      else if (e.key === "Home") j = 0;
      else if (e.key === "End") j = TABS.length - 1;
      if (j < 0) return;
      e.preventDefault();
      window.SFX && SFX.pop && SFX.pop();
      showTab(TABS[j][0]);
      try { $(TABS[j][1]).focus(); } catch (err) {}
    });
  });

  loadState();
  loadReal();
  $("value").addEventListener("input", render);
  $("depthBtn").addEventListener("click", () => {
    showAll = !showAll;
    window.SFX && SFX.pop && SFX.pop();
    render();
  });
  $("htCm").addEventListener("input", () => renderHeight("cm"));
  $("htFt").addEventListener("input", () => renderHeight("imp"));
  $("htIn").addEventListener("input", () => renderHeight("imp"));

  renderExplore();
  buildLadder();
  showTab(tab);
})();
