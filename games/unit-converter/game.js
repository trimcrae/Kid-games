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
      fact: "Time spans a <b>huge</b> range too! The <b>Planck time</b> (~5.4 × 10⁻⁴⁴ s) is the shortest moment physics can describe — light crosses a single proton in longer than that. Up top, a <b>millennium</b> is a thousand years. A blink takes ~0.1 s; a day is 86,400 s. ⏳",
      units: [
        { n: "Planck time", sym: "tP",   sys: "mix", factor: 5.391247e-44 },
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

  // ---- "How big is that?" — everyday things to compare against --------
  // Each anchor is {v: size in the category's base unit, one, many, e}.
  // mode "count" reads "about 3 school buses"; mode "times" reads
  // "about 3× as much as a cheetah".
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

  // Same as fmt, but renders huge/tiny numbers as a proper "× 10ⁿ"
  // instead of computer e-notation. Returns HTML.
  function fmtHTML(x) {
    if (!isFinite(x)) return "—";
    if (x === 0) return "0";
    const a = Math.abs(x);
    if (a >= 1e15 || a < 1e-6) {
      const [m, e] = x.toExponential(4).split("e");
      return Number(m) + " × 10<sup>" + Number(e) + "</sup>";
    }
    return fmt(x);
  }

  // Build the "That's about 3 school buses! 🚌" line.
  function compareLine(catKey, baseVal) {
    if (catKey === "temp") {
      const band = TEMP_BANDS.find(b => baseVal <= b[0]);
      return band ? band[1] : "";
    }
    const cmp = COMPARES[catKey];
    if (!cmp || !(baseVal > 0)) return "";
    // nearest anchor on the log scale
    let bestA = cmp.anchors[0], bestD = Infinity;
    cmp.anchors.forEach(an => {
      const d = Math.abs(Math.log10(baseVal / an.v));
      if (d < bestD) { bestD = d; bestA = an; }
    });
    const r = baseVal / bestA.v;
    const times = cmp.mode === "times";

    function amount(n) {
      if (n < 10) {
        const s = (Math.round(n * 10) / 10).toString();
        return s.replace(/\.0$/, "");
      }
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
      if (Math.round(f) <= 1) { // e.g. 0.85× — close enough to call it one
        phrase = times ? "the same as <b>" + bestA.one + "</b>" : "<b>" + bestA.one + "</b>";
      } else {
        const fs = f <= 20 ? String(Math.round(f)) : "(" + amount(f) + ")";
        phrase = "<b>1⁄" + fs + " of " + bestA.one + "</b>";
      }
    }
    return "🤔 That's about " + phrase + " " + bestA.e;
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
        cat = c; fromIdx = baseUnitIndex(c);
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

  // Start each category on its everyday base unit (metre, kilogram, …)
  // instead of the very first (often extreme) unit in the list.
  function baseUnitIndex(c) {
    const i = c.units.findIndex(u => u.factor === 1 || (u.to && u.to(1) === 1));
    return i === -1 ? 0 : i;
  }

  // Quick-tap numbers that make sense for each category.
  const QUICKS = {
    temp:  [0, 32, 37, 98.6, 100, -40],
    time:  [1, 30, 60, 90, 3600],
    data:  [1, 8, 512, 1024, 2048],
    angle: [30, 45, 90, 180, 360]
  };

  function buildQuick() {
    const q = $("quick");
    q.innerHTML = "";
    (QUICKS[cat.key] || [1, 2, 5, 10, 100, 0.5]).forEach(v => {
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
    $("resHead").innerHTML = fmtHTML(val) + " " + from.sym + " &nbsp;=";

    const rows = $("rows");
    rows.innerHTML = "";
    cat.units.forEach((u, i) => {
      const row = document.createElement("div");
      row.className = "row" + (i === fromIdx ? " active" : "");
      const out = fromBase(u, baseVal);
      // The maths relationship: how do you turn a "from" number into this row?
      // (Only for linear units — temperature needs a formula, not a factor.)
      let rel = "";
      if (i !== fromIdx && from.factor && u.factor) {
        const k = from.factor / u.factor;
        rel = k >= 1
          ? '<span class="u-rel">× ' + fmtHTML(Number(k.toPrecision(6))) + "</span>"
          : '<span class="u-rel">÷ ' + fmtHTML(Number((1 / k).toPrecision(6))) + "</span>";
      }
      row.innerHTML =
        '<span class="u-name">' + u.sym +
          '<span class="u-full">' + u.n + '</span>' + rel + '</span>' +
        '<span class="u-val">' + fmtHTML(out) + '</span>';
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

    const cmp = compareLine(cat.key, baseVal);
    $("compare").innerHTML = cmp;
    $("compare").style.display = cmp ? "" : "none";

    $("fact").innerHTML = "💡 " + cat.fact;
    saveState();
  }

  function renderAll() {
    buildCats();
    buildFromSelect();
    buildQuick();
    render();
    quizIdle();
  }

  // ---- 🎯 Quiz mode ----------------------------------------------------
  // "About how many cm make 1 foot?" — estimation questions built from the
  // very units on screen, so the table doubles as the study sheet. Stars and
  // best streak stick around in localStorage.
  const QUIZ_KEY = "unitConverter-quiz";
  let quiz = { stars: 0, best: 0 };
  try { quiz = Object.assign(quiz, JSON.parse(localStorage.getItem(QUIZ_KEY)) || {}); } catch (e) {}
  let quizStreak = 0;
  let lastQuizText = "";

  function saveQuiz() {
    try { localStorage.setItem(QUIZ_KEY, JSON.stringify({ stars: quiz.stars, best: quiz.best })); } catch (e) {}
  }
  function syncQuizScore() {
    $("quizStars").textContent = quiz.stars;
    $("quizBest").textContent = quiz.best;
  }

  // Temperature can't be a "× n" question — use famous anchor facts instead.
  const TEMP_QUIZ = [
    { text: "Water freezes at 0 °C. What is that in °F?", answer: 32, wrongs: [0, 100],
      explain: "°F = °C × 9⁄5 + 32, so 0 °C → 0 × 9⁄5 + 32 = <b>32 °F</b>." },
    { text: "Water boils at 100 °C. What is that in °F?", answer: 212, wrongs: [100, 180],
      explain: "°F = °C × 9⁄5 + 32, so 100 °C → 180 + 32 = <b>212 °F</b>." },
    { text: "Your body is about 37 °C. What is that in °F?", answer: 98.6, wrongs: [37, 73.4],
      explain: "°F = °C × 9⁄5 + 32, so 37 °C → 66.6 + 32 = <b>98.6 °F</b>." },
    { text: "A hot summer day is 95 °F. About what is that in °C?", answer: 35, wrongs: [95, 63],
      explain: "°C = (°F − 32) × 5⁄9, so (95 − 32) × 5⁄9 = <b>35 °C</b>." },
    { text: "0 °C in Kelvin is about…", answer: 273, wrongs: [0, 100],
      explain: "Kelvin starts at absolute zero: K = °C + 273.15, so 0 °C ≈ <b>273 K</b>." },
  ];

  function makeQuizQ() {
    if (cat.key === "temp") {
      let q, tries = 0;
      do { q = TEMP_QUIZ[(Math.random() * TEMP_QUIZ.length) | 0]; }
      while (q.text === lastQuizText && ++tries < 10);
      return { text: q.text, answer: q.answer, wrongs: q.wrongs.slice(), explain: q.explain };
    }
    // Pick two linear units whose ratio makes a kid-sized number.
    for (let tries = 0; tries < 80; tries++) {
      const A = cat.units[(Math.random() * cat.units.length) | 0];
      const B = cat.units[(Math.random() * cat.units.length) | 0];
      if (A === B || !A.factor || !B.factor) continue;
      const k = A.factor / B.factor;
      if (k < 2 || k > 5000) continue;
      const ans = k >= 20 ? Math.round(k) : Number(k.toPrecision(3));
      const text = "About how many " + B.sym + " make 1 " + A.n.toLowerCase() + " (" + A.sym + ")?";
      if (text === lastQuizText && tries < 60) continue;
      return {
        text: text,
        answer: ans,
        wrongs: [],
        explain: "1 " + A.sym + " = " + fmt(k) + " " + B.sym +
          " — to turn <b>" + A.sym + "</b> into <b>" + B.sym +
          "</b> you <b>multiply by " + fmt(k) + "</b> (and divide to go back).",
      };
    }
    return null; // no sensible pair in this category
  }

  // Distractors that FEEL plausible: double, half, or a place-value slip.
  function quizChoices(q) {
    const opts = [q.answer];
    const cands = q.wrongs.length ? q.wrongs.slice() : [
      q.answer * 2, Math.max(1, Math.round(q.answer / 2 * 10) / 10),
      q.answer * 10, Math.round(q.answer / 10 * 10) / 10,
      q.answer + 10,
    ];
    while (opts.length < 3 && cands.length) {
      const c = cands.splice((Math.random() * cands.length) | 0, 1)[0];
      if (c >= 0 && !opts.some(o => fmt(o) === fmt(c))) opts.push(c);
    }
    while (opts.length < 3) opts.push(q.answer + opts.length * 7);
    // shuffle
    for (let i = opts.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const t = opts[i]; opts[i] = opts[j]; opts[j] = t;
    }
    return opts;
  }

  function quizIdle() {
    syncQuizScore();
    const body = $("quizBody");
    body.innerHTML =
      '<div class="quiz-q">Think you know your ' +
      cat.label.replace(/^\S+\s/, "").toLowerCase() +
      " units? Prove it! 🧠</div>";
    const btn = document.createElement("button");
    btn.className = "quiz-start";
    btn.textContent = "🎯 Quiz me!";
    btn.onclick = askQuizQ;
    body.appendChild(btn);
  }

  function askQuizQ() {
    const q = makeQuizQ();
    if (!q) { quizIdle(); return; }
    lastQuizText = q.text;
    const body = $("quizBody");
    body.innerHTML = '<div class="quiz-q">' + q.text + "</div>";
    const wrap = document.createElement("div");
    wrap.className = "quiz-answers";
    const opts = quizChoices(q);
    opts.forEach((v) => {
      const b = document.createElement("button");
      b.textContent = fmt(v);
      b.onclick = () => answerQuiz(q, v, b, wrap);
      wrap.appendChild(b);
    });
    body.appendChild(wrap);
    const streak = document.createElement("div");
    streak.className = "quiz-streak";
    streak.textContent = quizStreak >= 2 ? "🔥 Streak: " + quizStreak : "";
    body.appendChild(streak);
  }

  function answerQuiz(q, picked, btn, wrap) {
    const right = fmt(picked) === fmt(q.answer);
    [...wrap.children].forEach((b) => {
      b.disabled = true;
      if (b.textContent === fmt(q.answer)) b.classList.add("right");
      else b.classList.add(b === btn ? "wrong" : "dim");
    });
    const body = $("quizBody");
    const fb = document.createElement("div");
    fb.className = "quiz-feedback";
    if (right) {
      quiz.stars++;
      quizStreak++;
      if (quizStreak > quiz.best) quiz.best = quizStreak;
      saveQuiz();
      syncQuizScore();
      window.SFX && SFX.good && SFX.good();
      let cheer = "✅ <b>Yes!</b> ";
      if (quizStreak > 0 && quizStreak % 5 === 0) {
        cheer = "🎉 <b>" + quizStreak + " in a row!</b> ";
        window.SFX && SFX.win && SFX.win();
        window.Confetti && Confetti.burst({ count: 90 });
      }
      fb.innerHTML = cheer + q.explain;
    } else {
      quizStreak = 0;
      window.SFX && SFX.nope && SFX.nope();
      fb.innerHTML = "❌ Not quite — it's <b>" + fmt(q.answer) + "</b>. " + q.explain;
    }
    body.appendChild(fb);
    const next = document.createElement("button");
    next.className = "quiz-next";
    next.textContent = "Next question ▶";
    next.onclick = askQuizQ;
    body.appendChild(next);
  }

  loadState();
  $("value").addEventListener("input", render);
  renderAll();
})();
