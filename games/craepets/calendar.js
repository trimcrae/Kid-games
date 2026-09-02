/* ===========================================================
   Craepets — THE CALENDAR: seasons and holidays.
   -----------------------------------------------------------
   The valley follows the real date on the device. Two layers:

     SEASONS  — spring, summer, autumn, winter (by month, for
                the northern half of the world). They shift the
                weather, change what the Farm grows, put petals
                or leaves or snow in the scenes, and give the
                Market a seasonal shelf.
     HOLIDAYS — a garland over the scene, a present to claim, a
                coin bonus on every right answer for the day, an
                Advent countdown, and each Craepet's own hatch-day.

   Every date rule lives HERE and nowhere else, so a new holiday
   is one line. Family birthdays go in BIRTHDAYS below.

       CPCal.today()              -> the date the valley thinks it is
       CPCal.season()             -> { id, name, emoji, … }
       CPCal.holidays()           -> [{ id, name, emoji, line, gift, … }]
       CPCal.sleepsTo("xmas")     -> days until Christmas, or null
   =========================================================== */
window.CPCal = (function () {
  "use strict";

  /* Family birthdays, as "MM-DD". Fill these in and the valley will
     throw a party (a cake, coins and a party hat). Leave any blank. */
  var BIRTHDAYS = {
    jeannie: "12-15", cory: "04-23", ellie: "12-11", kieran: "04-22", shannon: "09-30"
  };

  var override = null;                       // the play-test robot sets a date
  function today() { return override ? new Date(override.getTime()) : new Date(); }

  /* ---- seasons ---- */
  var SEASONS = {
    spring: { id: "spring", name: "Spring", emoji: "🌸", line: "Everything is growing.",
      crops: ["🌸", "🌷", "🍓", "🐣", "🌱"], weather: { sunny: 4, cloudy: 2, rainy: 4, windy: 2, snowy: 0, rainbow: 2 },
      foods: ["strawberry", "salad", "juicebox", "cherry", "peach"] },
    summer: { id: "summer", name: "Summer", emoji: "☀️", line: "Long days and ice cream.",
      crops: ["🍓", "🫐", "🍉", "🌻", "🍋"], weather: { sunny: 7, cloudy: 1, rainy: 1, windy: 1, snowy: 0, rainbow: 1 },
      foods: ["icecream", "melon", "lolly", "smoothie", "shavedice"] },
    autumn: { id: "autumn", name: "Autumn", emoji: "🍂", line: "Leaves everywhere and pumpkins on the vine.",
      crops: ["🎃", "🍎", "🍂", "🌰", "🍄"], weather: { sunny: 3, cloudy: 3, rainy: 3, windy: 4, snowy: 0, rainbow: 1 },
      foods: ["pie", "chestnut", "soup", "mushroomcap", "apple"] },
    winter: { id: "winter", name: "Winter", emoji: "❄️", line: "Cold outside, cosy in.",
      crops: ["❄️", "⛄", "🎄", "🍪", "☕"], weather: { sunny: 2, cloudy: 3, rainy: 2, windy: 2, snowy: 5, rainbow: 0 },
      foods: ["cocoacup", "gingerbread", "stew", "noodles", "custard"] }
  };
  function season(d) {
    var m = (d || today()).getMonth();
    return SEASONS[m <= 1 || m === 11 ? "winter" : m <= 4 ? "spring" : m <= 7 ? "summer" : "autumn"];
  }

  /* ---- date helpers ---- */
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function md(d) { return pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function same(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  /* the Nth (1-based) weekday of a month: nthWeekday(y, 4, 0, 2) is the 2nd Sunday in May */
  function nthWeekday(y, month, weekday, n) {
    var d = new Date(y, month, 1);
    var off = (weekday - d.getDay() + 7) % 7;
    return new Date(y, month, 1 + off + (n - 1) * 7);
  }
  /* Easter Sunday (the usual Gregorian computation). */
  function easter(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    var f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * m + 114) / 31) - 1, day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month, day);
  }
  function daysBetween(a, b) {
    var A = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()), B = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((B - A) / 86400000);
  }

  /* ---- the holidays ----
     `when(d)` says whether the date is the day. `gift` is what the
     valley hands out once per holiday per year: coins, a food for the
     bag, a thing to wear. `garland` is what hangs over the scene. */
  var HOLIDAYS = [
    { id: "newyear", name: "New Year's Day", emoji: "🎆", when: function (d) { return md(d) === "01-01"; },
      line: "Happy New Year! A whole year of learning ahead.", garland: ["🎆", "✨", "🎉", "✨"],
      gift: { coins: 60, item: "birthdaypie" } },
    { id: "valentine", name: "Valentine's Day", emoji: "💝", when: function (d) { return md(d) === "02-14"; },
      line: "Happy Valentine's Day — give somebody a present!", garland: ["💝", "💗", "💖", "💗"],
      gift: { coins: 40, item: "chocbar", wear: "heartglasses" } },
    { id: "stpatrick", name: "St Patrick's Day", emoji: "☘️", when: function (d) { return md(d) === "03-17"; },
      line: "Happy St Patrick's Day! Everything green pays extra.", garland: ["☘️", "🍀", "☘️", "🌈"],
      gift: { coins: 45, item: "salad" } },
    { id: "aprilfool", name: "April Fools' Day", emoji: "🤪", when: function (d) { return md(d) === "04-01"; },
      line: "April Fools! Don't believe a word your Craepet says today.", garland: ["🤪", "🎭", "🤪", "🎭"],
      gift: { coins: 25, item: "banana" } },
    { id: "easter", name: "Easter", emoji: "🐣", when: function (d) { var e = easter(d.getFullYear()); return daysBetween(e, d) >= -1 && daysBetween(e, d) <= 1; },
      line: "Happy Easter! Eggs everywhere — and you know all about those.", garland: ["🐣", "🥚", "🐰", "🌷"],
      gift: { coins: 50, item: "egg", wear: "bunnyears" } },
    { id: "earthday", name: "Earth Day", emoji: "🌍", when: function (d) { return md(d) === "04-22"; },
      line: "Happy Earth Day! The Rainbow Pool knows all about the wide world.", garland: ["🌍", "🌱", "🌊", "🌱"],
      gift: { coins: 40, item: "broccoli" } },
    { id: "mothers", name: "Mother's Day", emoji: "💐", when: function (d) { return same(d, nthWeekday(d.getFullYear(), 4, 0, 2)); },
      line: "Happy Mother's Day! Post Mum a present.", garland: ["💐", "🌷", "💐", "🌷"],
      gift: { coins: 40, item: "cake" } },
    { id: "fathers", name: "Father's Day", emoji: "🎣", when: function (d) { return same(d, nthWeekday(d.getFullYear(), 5, 0, 3)); },
      line: "Happy Father's Day!", garland: ["🎣", "⭐", "🎣", "⭐"],
      gift: { coins: 40, item: "pancakes" } },
    { id: "july4", name: "the Fourth of July", emoji: "🎇", when: function (d) { return md(d) === "07-04"; },
      line: "Happy Fourth of July! Fireworks over the valley tonight.", garland: ["🎆", "🎇", "🇺🇸", "🎇"],
      gift: { coins: 50, item: "hotdog" } },
    { id: "school", name: "the first day of school", emoji: "🎒",
      when: function (d) { var labor = nthWeekday(d.getFullYear(), 8, 1, 1); return daysBetween(labor, d) === 1; },
      line: "First day of school! New pencils, new friends, and every right answer pays extra.", garland: ["🎒", "📚", "✏️", "🍎"],
      gift: { coins: 50, item: "apple", wear: "glasses" } },
    { id: "halloween", name: "Halloween", emoji: "🎃", when: function (d) { return md(d) === "10-31"; },
      line: "Happy Halloween! The Shade is in a very good mood.", garland: ["🎃", "👻", "🦇", "🕸️"],
      gift: { coins: 50, item: "candyfloss", wear: "pumpkinhat" } },
    { id: "spooky", name: "Spooky Week", emoji: "👻", when: function (d) { var m = md(d); return m >= "10-25" && m <= "10-30"; },
      line: "Spooky Week! Halloween is nearly here.", garland: ["🕸️", "🦇", "🕸️", "🦇"], quiet: true },
    { id: "thanksgiving", name: "Thanksgiving", emoji: "🦃", when: function (d) { return same(d, nthWeekday(d.getFullYear(), 10, 4, 4)); },
      line: "Happy Thanksgiving! Say thank you to somebody — post them a present.", garland: ["🦃", "🍂", "🥧", "🍂"],
      gift: { coins: 50, item: "pie" } },
    { id: "advent", name: "Advent", emoji: "🎄", when: function (d) { return d.getMonth() === 11 && d.getDate() <= 24; },
      line: "", garland: ["🎄", "⭐", "🎄", "🔔"], quiet: true },
    { id: "xmas", name: "Christmas", emoji: "🎅", when: function (d) { var m = md(d); return m === "12-25" || m === "12-26"; },
      line: "Merry Christmas! There is a present under the tree.", garland: ["🎄", "🎁", "🎅", "⭐"],
      gift: { coins: 100, item: "gingerbread", wear: "santahat" } },
    { id: "nye", name: "New Year's Eve", emoji: "🎉", when: function (d) { return md(d) === "12-31"; },
      line: "Happy New Year's Eve! Stay up late (in the valley, at least).", garland: ["🎉", "🎆", "🥳", "🎆"],
      gift: { coins: 40, item: "popcorn" } }
  ];

  function holidays(d) {
    d = d || today();
    return HOLIDAYS.filter(function (h) { return h.when(d); });
  }
  /* The loud one: the first holiday today that hands out a present. */
  function holidayToday(d) {
    var list = holidays(d).filter(function (h) { return !h.quiet; });
    return list.length ? list[0] : null;
  }
  function sleepsTo(id, d) {
    d = d || today();
    var y = d.getFullYear(), target = null;
    if (id === "xmas") target = new Date(y, 11, 25);
    if (id === "halloween") target = new Date(y, 9, 31);
    if (id === "easter") target = easter(y);
    if (!target) return null;
    var n = daysBetween(d, target);
    return n < 0 ? null : n;
  }
  /* A family birthday today, if one is filled in above. */
  function birthdayToday(d) {
    d = d || today();
    var out = [];
    Object.keys(BIRTHDAYS).forEach(function (who) { if (BIRTHDAYS[who] && BIRTHDAYS[who] === md(d)) out.push(who); });
    return out;
  }
  /* The next family birthday within a week: { who: [ids], days } or null. */
  function birthdaySoon(d) {
    d = d || today();
    var best = null;
    Object.keys(BIRTHDAYS).forEach(function (who) {
      if (!BIRTHDAYS[who]) return;
      var mm = Number(BIRTHDAYS[who].slice(0, 2)) - 1, dd = Number(BIRTHDAYS[who].slice(3));
      var t = new Date(d.getFullYear(), mm, dd);
      if (daysBetween(d, t) < 0) t = new Date(d.getFullYear() + 1, mm, dd);
      var n = daysBetween(d, t);
      if (n >= 1 && n <= 7) {
        if (!best || n < best.days) best = { who: [who], days: n };
        else if (n === best.days) best.who.push(who);
      }
    });
    return best;
  }
  /* Is it this Craepet's hatch-day? `born` is a timestamp. Returns the age in
     years (1 and up) on the anniversary, or 0. */
  function hatchdayYears(born, d) {
    if (!born) return 0;
    d = d || today();
    var b = new Date(born);
    if (b.getMonth() !== d.getMonth() || b.getDate() !== d.getDate()) return 0;
    var years = d.getFullYear() - b.getFullYear();
    return years >= 1 ? years : 0;
  }
  /* …or a month-birthday in its first year: 1 to 11 months, on the day. */
  function monthsOld(born, d) {
    if (!born) return 0;
    d = d || today();
    var b = new Date(born);
    if (b.getDate() !== d.getDate()) return 0;
    var months = (d.getFullYear() - b.getFullYear()) * 12 + (d.getMonth() - b.getMonth());
    return months >= 1 && months <= 11 ? months : 0;
  }

  return {
    today: today,
    season: season,
    SEASONS: SEASONS,
    holidays: holidays,
    holidayToday: holidayToday,
    HOLIDAYS: HOLIDAYS,
    sleepsTo: sleepsTo,
    easter: easter,
    birthdayToday: birthdayToday,
    birthdaySoon: birthdaySoon,
    BIRTHDAYS: BIRTHDAYS,
    hatchdayYears: hatchdayYears,
    monthsOld: monthsOld,
    /* the play-test robot: CPCal._setDate("2026-10-31") or null */
    _setDate: function (s) { override = s ? new Date(s + (s.length <= 10 ? "T12:00:00" : "")) : null; }
  };
})();
