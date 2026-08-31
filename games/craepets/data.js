/* ===========================================================
   Craepets — THE CONTENT.
   -----------------------------------------------------------
   Everything the game teaches lives here: the question makers,
   the shop stock, the quests and the rival trainers.

   THE BIG IDEA: in Craepets you don't earn coins by clicking —
   you earn them by LEARNING. Every berry you harvest, every
   coin you fish out of the Word Well, every hit you land in the
   Arena comes from a question answered at YOUR level.

   Five learning levels, so the whole family shares one game:

       tot    — Kieran. Nothing to get wrong. Big pictures.
       early  — Ellie (3). Colours, shapes, letters, counting.
       mid    — Cory (6). Times tables, grids, fractions, logic.
       big    — Jeannie (7). Vocabulary, spelling, science.
       grown  — Shannon. Real grown-up vocabulary, mental maths
                and general knowledge — an actual challenge.

   Questions are MADE, not listed, wherever that is honest
   (arithmetic is generated, so it never runs out); vocabulary,
   science and geography are hand-written banks, because you
   can't fake knowing what a word means.
   =========================================================== */
window.CPData = (function () {
  "use strict";

  /* =========================================================
     WHO IS PLAYING — every person gets their own save slot.
     ========================================================= */
  var PROFILES = [
    { id: "jeannie", name: "Jeannie", emoji: "📖", tier: "big",   colour: "#ff5d8f", hello: "Big words, big pets." },
    { id: "cory",    name: "Cory",    emoji: "⛏️", tier: "mid",   colour: "#38b6ff", hello: "Numbers, grids and gold." },
    { id: "ellie",   name: "Ellie",   emoji: "👑", tier: "early", colour: "#ff8fd0", hello: "Colors and counting!" },
    { id: "kieran",  name: "Kieran",  emoji: "👶", tier: "tot",   colour: "#ffd166", hello: "Tap anything. It's all good." },
    { id: "shannon", name: "Shannon", emoji: "👩", tier: "grown", colour: "#8a5cff", hello: "Grown-up mode. No mercy." },
    { id: "guest",   name: "Visitor", emoji: "🌈", tier: "mid",   colour: "#3ddc84", hello: "Just visiting the valley." }
  ];

  var TIERS = [
    { id: "tot",   name: "Tiny",     note: "Nothing to get wrong" },
    { id: "early", name: "Little",   note: "Letters, colors, counting" },
    { id: "mid",   name: "Middle",   note: "Times tables & spelling" },
    { id: "big",   name: "Big Kid",  note: "Vocabulary & science" },
    { id: "grown", name: "Grown-up", note: "Genuinely hard" }
  ];

  /* =========================================================
     TINY HELPERS
     ========================================================= */
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function range(lo, hi) { return lo + rnd(hi - lo + 1); }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function nChoices(tier) { return (tier === "tot") ? 2 : (tier === "early" ? 3 : 4); }

  /* Build a question from an answer plus wrong answers, shuffled.

     Every wrong answer is de-duplicated against the right one first.
     A quiz that accidentally shows the right answer twice teaches a
     child that the game is broken, so the guard lives here, once: no
     question maker below has to remember it. */
  function label(c) { return String(typeof c === "object" ? (c.t || c.emoji || "") : c).trim().toLowerCase(); }

  function mk(o, tier) {
    var need = nChoices(tier) - 1;
    var seen = {};
    seen[label(o.right)] = 1;
    var wrongs = [];
    shuffle(o.wrong).forEach(function (w) {
      var k = label(w);
      if (seen[k] || wrongs.length >= need) return;
      seen[k] = 1;
      wrongs.push(w);
    });
    // Short on distractors because they collided? Invent more by nudging
    // the number inside the right answer, keeping its format ($, ¢, km…).
    var guard = 0;
    while (wrongs.length < need && guard++ < 40) {
      var alt = jiggle(o.right, guard);
      if (!alt) break;
      var ak = label(alt);
      if (seen[ak]) continue;
      seen[ak] = 1;
      wrongs.push(alt);
    }
    var all = shuffle([o.right].concat(wrongs));
    var idx = all.indexOf(o.right);
    return {
      q: o.q,
      big: o.big || null,
      kind: o.kind || "text",
      choices: all.map(function (c) { return typeof c === "object" ? c : { t: String(c) }; }),
      answer: idx,
      teach: o.teach || "",
      subject: o.subject,
      tier: tier
    };
  }

  /* "$1,320" -> "$1,254";  "42 km" -> "39 km";  "5/6" -> "4/6".
     Returns null when there is no number to nudge (a plain word), in
     which case the question simply shows one fewer choice. */
  function jiggle(right, n) {
    var s = typeof right === "object" ? right.t : right;
    if (typeof s !== "string") return null;
    var m = s.match(/-?[\d,]*\d(?:\.\d+)?/);
    if (!m) return null;
    var raw = m[0];
    var dec = (raw.split(".")[1] || "").length;
    var val = parseFloat(raw.replace(/,/g, ""));
    if (!isFinite(val)) return null;
    var step = Math.max(dec ? Math.pow(10, -dec) : 1, Math.abs(val) * 0.07);
    var out = val + step * (n % 2 ? Math.ceil(n / 2) : -Math.ceil(n / 2));
    if (out < 0 || out === val) out = val + step * (n + 1);
    out = dec ? out.toFixed(dec) : String(Math.round(out));
    if (/,/.test(raw)) out = commas(out);
    var text = s.slice(0, m.index) + out + s.slice(m.index + raw.length);
    if (typeof right !== "object") return text;
    var copy = {};
    for (var k in right) if (Object.prototype.hasOwnProperty.call(right, k)) copy[k] = right[k];
    copy.t = text;
    return copy;
  }

  /* Numeric distractors that are wrong but PLAUSIBLE — near misses
     teach more than random noise, because spotting the near miss is
     the skill. Never negative, never a duplicate. */
  function nearMiss(n, spread) {
    spread = spread || Math.max(2, Math.round(Math.abs(n) * 0.2));
    var out = {}, tries = 0;
    var list = [];
    while (list.length < 5 && tries++ < 60) {
      var d = range(1, spread) * (rnd(2) ? 1 : -1);
      var v = n + d;
      if (v < 0 || v === n || out[v]) continue;
      out[v] = 1;
      list.push(v);
    }
    var f = 1;
    while (list.length < 3) {
      var v2 = n + spread + f;
      if (!out[v2]) { out[v2] = 1; list.push(v2); }
      f++;
    }
    return list;
  }

  function emojiRun(e, n) { var s = ""; for (var i = 0; i < n; i++) s += e; return s; }
  function commas(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  /* $6.40, not $6.4 — but $105, not $105.00. */
  function money(v) { return "$" + (Math.round(v * 100) % 100 === 0 ? commas(Math.round(v)) : v.toFixed(2)); }

  /* =========================================================
     MATHS — the Berry Farm.
     Generated, so it never runs out and never repeats a page.
     ========================================================= */
  var COUNTABLES = ["🍓", "🫐", "🍎", "⭐", "🌸", "🐞", "🍄", "🐟", "🥕", "🍋"];

  var MATH = {
    tot: [
      function () {
        var e = pick(COUNTABLES), n = range(1, 3);
        return mk({ subject: "math", kind: "big", q: "How many?", big: { emoji: emojiRun(e, n) },
          right: String(n), wrong: [String(n === 1 ? 2 : n - 1), String(n + 1)],
          teach: "Count them one at a time: " + Array.from({ length: n }, function (_, i) { return i + 1; }).join(", ") + "." }, "tot");
      },
      function () {
        var big = range(3, 5), small = range(1, 2), e = pick(COUNTABLES);
        return mk({ subject: "math", q: "Which pile has MORE?",
          right: { emoji: emojiRun(e, big) }, wrong: [{ emoji: emojiRun(e, small) }],
          teach: "More means a bigger pile — " + big + " beats " + small + "." }, "tot");
      },
      function () {
        var e = pick(COUNTABLES), n = range(1, 3);
        var other = n === 1 ? 3 : n - 1;
        return mk({ subject: "math", kind: "big", q: "Which pile is " + n + "?", big: { text: String(n) },
          right: { emoji: emojiRun(e, n) }, wrong: [{ emoji: emojiRun(e, other) }],
          teach: "The number " + n + " means " + n + " thing" + (n === 1 ? "" : "s") + "." }, "tot");
      },
      function () {
        var shp = [["Circle", "⭕"], ["Square", "🟥"], ["Triangle", "🔺"], ["Star", "⭐"], ["Heart", "💜"]];
        var s = pick(shp), o = pick(shp.filter(function (x) { return x[0] !== s[0]; }));
        return mk({ subject: "math", q: "Where is the " + s[0].toLowerCase() + "?",
          right: { emoji: s[1] }, wrong: [{ emoji: o[1] }],
          teach: "That's the " + s[0].toLowerCase() + "!" }, "tot");
      }
    ],
    early: [
      function () {
        var e = pick(COUNTABLES), n = range(3, 10);
        return mk({ subject: "math", kind: "big", q: "How many altogether?", big: { emoji: emojiRun(e, n) },
          right: String(n), wrong: nearMiss(n, 2).map(String),
          teach: "There are " + n + ". Touch each one as you count." }, "early");
      },
      function () {
        var a = range(1, 5), b = range(1, 4);
        return mk({ subject: "math", kind: "big", q: "Add them up!", big: { emoji: emojiRun("🍓", a) + " + " + emojiRun("🫐", b) },
          right: String(a + b), wrong: nearMiss(a + b, 2).map(String),
          teach: a + " and " + b + " more makes " + (a + b) + "." }, "early");
      },
      function () {
        var a = range(4, 10), b = range(1, 3);
        return mk({ subject: "math", q: "You have " + a + " berries and eat " + b + ". How many are left?",
          right: String(a - b), wrong: nearMiss(a - b, 2).map(String),
          teach: a + " take away " + b + " leaves " + (a - b) + "." }, "early");
      },
      function () {
        var n = range(1, 9);
        return mk({ subject: "math", kind: "big", q: "Which number comes NEXT?", big: { text: (n - 1 > 0 ? (n - 1) + ", " : "") + n + ", ?" },
          right: String(n + 1), wrong: [String(n), String(n + 2), String(n - 1 > 0 ? n - 1 : n + 3)],
          teach: "Counting up: " + n + " then " + (n + 1) + "." }, "early");
      },
      function () {
        var start = pick([2, 5, 10]), k = range(1, 3);
        var seq = [start * k, start * (k + 1), start * (k + 2)];
        return mk({ subject: "math", kind: "big", q: "Keep the pattern going!", big: { text: seq.join(", ") + ", ?" },
          right: String(start * (k + 3)), wrong: nearMiss(start * (k + 3), start).map(String),
          teach: "This one counts up by " + start + " each time." }, "early");
      },
      function () {
        var a = range(1, 9);
        return mk({ subject: "math", kind: "big", q: "How many more to make 10?", big: { text: a + " + ? = 10" },
          right: String(10 - a), wrong: nearMiss(10 - a, 3).map(String),
          teach: "Start at " + a + " and count on your fingers up to 10 — that's " + (10 - a) + " more." }, "early");
      },
      function () {
        var a = range(1, 10);
        return mk({ subject: "math", kind: "big", q: "Double it!", big: { text: a + " + " + a },
          right: String(a * 2), wrong: nearMiss(a * 2, 3).map(String),
          teach: "Doubling means two of the same: " + a + " and another " + a + " makes " + (a * 2) + "." }, "early");
      },
      function () {
        var e = pick(COUNTABLES), n = range(4, 10);
        var half = Math.floor(n / 2);
        return mk({ subject: "math", kind: "big", q: "Share these fairly between 2 friends. How many each?",
          big: { emoji: emojiRun(e, half * 2) },
          right: String(half), wrong: nearMiss(half, 3).map(String),
          teach: "Give one to you, one to them, one to you… " + (half * 2) + " shared between 2 is " + half + " each." }, "early");
      }
    ],
    mid: [
      function () {
        var a = range(11, 99), b = range(11, 99);
        return mk({ subject: "math", kind: "big", q: "Add it up.", big: { text: a + " + " + b },
          right: String(a + b), wrong: nearMiss(a + b, 12).map(String),
          teach: "Add the tens (" + (Math.floor(a / 10) * 10) + " + " + (Math.floor(b / 10) * 10) + ") then the ones." }, "mid");
      },
      function () {
        var a = range(30, 200), b = range(10, a - 1);
        return mk({ subject: "math", kind: "big", q: "Take it away.", big: { text: a + " − " + b },
          right: String(a - b), wrong: nearMiss(a - b, 12).map(String),
          teach: "Count up from " + b + " to " + a + " — that gap is " + (a - b) + "." }, "mid");
      },
      function () {
        var a = range(2, 12), b = range(2, 12);
        return mk({ subject: "math", kind: "big", q: "Times tables!", big: { text: a + " × " + b },
          right: String(a * b), wrong: nearMiss(a * b, Math.max(a, b)).map(String),
          teach: a + " × " + b + " = " + (a * b) + " — that's " + b + " lots of " + a + "." }, "mid");
      },
      function () {
        var b = range(2, 12), q = range(2, 12), a = b * q;
        return mk({ subject: "math", kind: "big", q: "Share them out.", big: { text: a + " ÷ " + b },
          right: String(q), wrong: nearMiss(q, 4).map(String),
          teach: a + " ÷ " + b + " = " + q + ", because " + b + " × " + q + " = " + a + "." }, "mid");
      },
      function () {
        var w = range(3, 12), h = range(3, 12);
        var area = rnd(2) === 0;
        return mk({ subject: "math", q: "A berry patch is " + w + " feet wide and " + h + " feet tall. What is its " + (area ? "AREA" : "PERIMETER") + "?",
          right: String(area ? w * h : 2 * (w + h)), wrong: nearMiss(area ? w * h : 2 * (w + h), 8).map(String),
          teach: area ? "Area = width × height = " + w + " × " + h + " = " + (w * h) + "."
                      : "Perimeter is all four sides: " + w + " + " + h + " + " + w + " + " + h + " = " + (2 * (w + h)) + "." }, "mid");
      },
      function () {
        var den = pick([2, 3, 4, 5, 6, 10]), num = range(1, den - 1);
        var total = den * range(2, 6);
        return mk({ subject: "math", q: "What is " + num + "/" + den + " of " + total + " berries?",
          right: String(total / den * num), wrong: nearMiss(total / den * num, 5).map(String),
          teach: "Split " + total + " into " + den + " equal piles of " + (total / den) + ", then take " + num + "." }, "mid");
      },
      function () {
        var x = range(1, 6), y = range(1, 6);
        return mk({ subject: "math", q: "Your pet is at (" + x + ", " + y + ") on the farm grid. Which way does it walk to reach (" + x + ", " + (y + 2) + ")?",
          right: "Up 2", wrong: ["Down 2", "Right 2", "Left 2"],
          teach: "The first number is across, the second is up. Only the second changed, so it goes UP." }, "mid");
      },
      function () {
        var coins = [range(1, 3) * 25, range(1, 4) * 10, range(1, 4) * 5];
        var total = coins.reduce(function (s, c) { return s + c; }, 0);
        return mk({ subject: "math", q: "You have " + coins[0] + "¢, " + coins[1] + "¢ and " + coins[2] + "¢. How much money is that?",
          right: total + "¢", wrong: nearMiss(total, 15).map(function (n) { return n + "¢"; }),
          teach: coins.join(" + ") + " = " + total + "¢." }, "mid");
      },
      function () {
        var n = range(2, 9), m = range(3, 9);
        return mk({ subject: "math", kind: "big", q: "Fill in the gap.", big: { text: n + " × ? = " + (n * m) },
          right: String(m), wrong: nearMiss(m, 4).map(String),
          teach: "Ask: how many " + n + "s make " + (n * m) + "? " + m + " of them." }, "mid");
      },
      function () {
        var h = range(1, 11), m = pick([15, 30, 45]);
        var add = pick([30, 45, 60]);
        var tot = h * 60 + m + add;
        var nh = Math.floor(tot / 60) % 12 || 12, nm = tot % 60;
        return mk({ subject: "math", q: "It is " + h + ":" + String(m).padStart(2, "0") + ". What time is it " + add + " minutes later?",
          right: nh + ":" + String(nm).padStart(2, "0"),
          wrong: [((nh % 12) + 1) + ":" + String(nm).padStart(2, "0"), nh + ":" + String((nm + 15) % 60).padStart(2, "0"), (nh === 1 ? 12 : nh - 1) + ":" + String(nm).padStart(2, "0")],
          teach: "There are 60 minutes in an hour, so " + m + " + " + add + " rolls over into the next hour." }, "mid");
      },
      function () {
        var n = range(1000, 9999);
        var slots = [["thousands", 0, 1000], ["hundreds", 1, 100], ["tens", 2, 10], ["ones", 3, 1]];
        var s = pick(slots);
        var digit = String(n)[s[1]];
        // Other digits from the number itself make the sharpest distractors;
        // top up from 0-9 when the number repeats a digit.
        var distractors = String(n).split("").filter(function (d) { return d !== digit; })
          .concat(shuffle("0123456789".split("").filter(function (d) { return d !== digit; })));
        return mk({ subject: "math", q: "In the number " + commas(n) + ", which digit is in the " + s[0] + " place?",
          right: digit, wrong: distractors,
          teach: "Read the places from the right: ones, tens, hundreds, thousands. " +
                 "So that " + digit + " is really worth " + commas(Number(digit) * s[2]) + "." }, "mid");
      },
      function () {
        var to = pick([10, 100]);
        var n = range(to === 10 ? 12 : 120, to === 10 ? 199 : 1999);
        var v = Math.round(n / to) * to;
        return mk({ subject: "math", q: "Round " + commas(n) + " to the nearest " + to + ".",
          right: commas(v), wrong: [commas(v + to), commas(v - to), commas(v + to * 2)],
          teach: "Look at the digit just to the right: 5 or more rounds up, 4 or less rounds down. " +
                 commas(n) + " → " + commas(v) + "." }, "mid");
      },
      function () {
        // Cory's Minecraft question: how many blocks in a solid cuboid?
        var w = range(2, 6), d = range(2, 6), h = range(2, 5);
        var v = w * d * h;
        return mk({ subject: "math", q: "You build a solid block of stone " + w + " wide, " + d + " deep and " + h + " tall. How many blocks did it take?",
          right: String(v), wrong: nearMiss(v, Math.max(3, Math.round(v * 0.25))).map(String),
          teach: "One layer is " + w + " × " + d + " = " + (w * d) + " blocks, and there are " + h + " layers → " + (w * d) + " × " + h + " = " + v + "." }, "mid");
      },
      function () {
        var n = range(6, 40) * 2 + (rnd(2) ? 1 : 0);
        var isEven = n % 2 === 0;
        return mk({ subject: "math", q: "Is " + n + " odd or even — and how do you know?",
          right: (isEven ? "Even" : "Odd") + " — it ends in " + (n % 10),
          wrong: [(isEven ? "Odd" : "Even") + " — it ends in " + (n % 10),
                  (isEven ? "Odd" : "Even") + " — it is more than 10",
                  (isEven ? "Even" : "Odd") + " — its digits add to " + String(n).split("").reduce(function (s, d) { return s + Number(d); }, 0)],
          teach: "Only the LAST digit matters. 0, 2, 4, 6, 8 → even. 1, 3, 5, 7, 9 → odd." }, "mid");
      },
      function () {
        var per = pick([3, 4, 5, 6, 8]), groups = range(3, 9), spare = rnd(per);
        var total = per * groups + spare;
        return mk({ subject: "math", q: "You put " + total + " berries into baskets of " + per + ". How many baskets are FULL?",
          right: String(groups), wrong: nearMiss(groups, 3).map(String),
          teach: total + " ÷ " + per + " = " + groups + " with " + spare + " left over, so " + groups + " baskets fill up" +
                 (spare ? " and " + spare + " berr" + (spare === 1 ? "y" : "ies") + " sit in the next one." : ".") }, "mid");
      }
    ],
    big: [
      function () {
        var a = range(12, 99), b = range(11, 40);
        return mk({ subject: "math", kind: "big", q: "Long multiplication.", big: { text: a + " × " + b },
          right: commas(a * b), wrong: nearMiss(a * b, Math.round(a * b * 0.09)).map(commas),
          teach: a + " × " + b + " = " + a + "×" + (Math.floor(b / 10) * 10) + " + " + a + "×" + (b % 10) + " = " + commas(a * b) + "." }, "big");
      },
      function () {
        var d = range(3, 12), q = range(11, 40), r = range(1, d - 1);
        var n = d * q + r;
        return mk({ subject: "math", q: "What is " + n + " ÷ " + d + "?",
          right: q + " r" + r, wrong: [(q + 1) + " r" + r, q + " r" + ((r % (d - 1)) + 1), (q - 1) + " r" + r],
          teach: d + " goes into " + n + " " + q + " times (" + (d * q) + "), leaving " + r + " over." }, "big");
      },
      function () {
        var den = pick([4, 5, 6, 8, 10, 12]);
        var a = range(1, den - 2), b = range(1, den - a - 1);
        var g = gcd(a + b, den);
        var simp = ((a + b) / g) + "/" + (den / g);
        return mk({ subject: "math", kind: "big", q: "Add the fractions (simplest form).", big: { text: a + "/" + den + " + " + b + "/" + den },
          right: simp, wrong: [(a + b) + "/" + (den * 2), (a * b) + "/" + den, (a + b + 1) + "/" + den],
          teach: "Same bottom number, so just add the tops: " + a + " + " + b + " = " + (a + b) + " out of " + den + (g > 1 ? ", which simplifies to " + simp : "") + "." }, "big");
      },
      function () {
        var p = pick([10, 20, 25, 50, 75]), n = pick([40, 60, 80, 120, 200, 240]);
        return mk({ subject: "math", q: "What is " + p + "% of " + n + "?",
          right: String(n * p / 100), wrong: nearMiss(n * p / 100, Math.max(4, Math.round(n * 0.12))).map(String),
          teach: p + "% means " + p + " out of every 100, so " + n + " × " + (p / 100) + " = " + (n * p / 100) + "." }, "big");
      },
      function () {
        var a = range(2, 9), b = range(2, 9), c = range(2, 9);
        var v = a + b * c;
        return mk({ subject: "math", kind: "big", q: "Careful — order of operations!", big: { text: a + " + " + b + " × " + c },
          right: String(v), wrong: [String((a + b) * c), String(a + b + c), String(a * b + c)],
          teach: "Multiply first: " + b + " × " + c + " = " + (b * c) + ", then add " + a + " → " + v + "." }, "big");
      },
      function () {
        var nums = [range(2, 20), range(2, 20), range(2, 20), range(2, 20)];
        var sum = nums.reduce(function (s, n) { return s + n; }, 0);
        while (sum % 4 !== 0) { nums[0]++; sum++; }
        return mk({ subject: "math", q: "What is the AVERAGE of " + nums.join(", ") + "?",
          right: String(sum / 4), wrong: nearMiss(sum / 4, 5).map(String),
          teach: "Add them (" + sum + ") and share between " + nums.length + " → " + (sum / 4) + "." }, "big");
      },
      function () {
        var n = pick([12, 16, 18, 20, 24, 28, 30, 36, 42, 45]);
        var facs = [];
        for (var i = 1; i <= n; i++) if (n % i === 0) facs.push(i);
        var notFac = [];
        for (var j = 2; j < n && notFac.length < 6; j++) if (n % j !== 0) notFac.push(j);
        return mk({ subject: "math", q: "Which of these is NOT a factor of " + n + "?",
          right: String(pick(notFac)), wrong: shuffle(facs.filter(function (f) { return f > 1 && f < n; })).slice(0, 3).map(String),
          teach: "A factor divides in with nothing left over. " + n + "'s factors are " + facs.join(", ") + "." }, "big");
      },
      function () {
        var d = pick([[0.5, "1/2"], [0.25, "1/4"], [0.75, "3/4"], [0.2, "1/5"], [0.1, "1/10"], [0.125, "1/8"]]);
        return mk({ subject: "math", q: "Which fraction equals " + d[0] + "?",
          right: d[1], wrong: shuffle(["1/2", "1/4", "3/4", "1/5", "1/10", "1/8", "2/3", "3/5"].filter(function (f) { return f !== d[1]; })).slice(0, 3),
          teach: d[0] + " = " + d[1] + "." }, "big");
      },
      function () {
        var speed = pick([4, 5, 6, 8, 10]), hrs = range(2, 6);
        return mk({ subject: "math", q: "Your Craepet walks " + speed + " km every hour. How far does it get in " + hrs + " hours?",
          right: speed * hrs + " km", wrong: nearMiss(speed * hrs, 9).map(function (n) { return n + " km"; }),
          teach: "Distance = speed × time = " + speed + " × " + hrs + " = " + (speed * hrs) + " km." }, "big");
      }
    ],
    grown: [
      function () {
        var bill = pick([46, 58, 72, 84, 96, 124, 137]), tip = pick([15, 18, 20]);
        var v = Math.round(bill * tip) / 100;
        return mk({ subject: "math", q: "A " + tip + "% tip on a $" + bill + " bill is…",
          right: "$" + v.toFixed(2), wrong: [ "$" + (bill * (tip + 5) / 100).toFixed(2), "$" + (bill * (tip - 5) / 100).toFixed(2), "$" + (bill * tip / 1000).toFixed(2)],
          teach: "10% is $" + (bill / 10).toFixed(2) + "; " + tip + "% is " + (tip / 10) + " of that → $" + v.toFixed(2) + "." }, "grown");
      },
      function () {
        var price = pick([80, 120, 150, 240, 320]), off = pick([15, 25, 30, 40]);
        var v = price * (100 - off) / 100;
        return mk({ subject: "math", q: "A $" + price + " coat is " + off + "% off. What do you pay?",
          right: money(v), wrong: [money(price * off / 100), money(v + price * 0.1), money(price - off)],
          teach: "You pay " + (100 - off) + "% → " + price + " × 0." + (100 - off) + " = $" + v + "." }, "grown");
      },
      function () {
        var a = range(3, 9), b = range(2, 6), c = range(2, 9);
        var v = a * a - b * c;
        return mk({ subject: "math", kind: "big", q: "Order of operations.", big: { text: a + "² − " + b + " × " + c },
          right: String(v), wrong: [String((a * a - b) * c), String(a * 2 - b * c), String(a * a - b - c)],
          teach: "Exponents first (" + a + "² = " + a * a + "), then the multiply (" + b * c + "), then subtract → " + v + "." }, "grown");
      },
      function () {
        var n = pick([144, 169, 196, 225, 256, 289, 324, 361, 400, 441, 484, 625]);
        return mk({ subject: "math", q: "What is √" + n + "?",
          right: String(Math.sqrt(n)), wrong: nearMiss(Math.sqrt(n), 4).map(String),
          teach: Math.sqrt(n) + " × " + Math.sqrt(n) + " = " + n + "." }, "grown");
      },
      function () {
        var mL = pick([2, 3, 4, 5]), b = pick([3, 5, 7, 11, 13]);
        var x = pick([4, 6, 8, 12]);
        var rhs = mL * x + b;
        return mk({ subject: "math", q: "Solve for x:  " + mL + "x + " + b + " = " + rhs,
          right: String(x), wrong: nearMiss(x, 4).map(String),
          teach: "Subtract " + b + " (" + (rhs - b) + "), then divide by " + mL + " → x = " + x + "." }, "grown");
      },
      function () {
        var reds = range(3, 9), blues = range(3, 9);
        while (blues === reds) blues = range(3, 9);
        var total = reds + blues, g = gcd(reds, total);
        var right = (reds / g) + "/" + (total / g);
        var val = reds / total;
        // a distractor that happens to be worth the SAME as the answer
        // (8/16 next to 1/2) is not a wrong answer at all — drop those.
        var wrong = [reds + "/" + blues, blues + "/" + total, (reds + 1) + "/" + total, reds + "/" + (total + 1)]
          .filter(function (f) { var p = f.split("/"); return Math.abs(p[0] / p[1] - val) > 1e-9; });
        return mk({ subject: "math", q: "A bag holds " + reds + " red and " + blues + " blue marbles. Pick one — what is the chance it's red?",
          right: right, wrong: wrong,
          teach: "Wanted over total: " + reds + " of " + total + (g > 1 ? ", which simplifies to " + right : "") + "." }, "grown");
      },
      function () {
        var kg = pick([250, 400, 750, 1200, 1600]), price = pick([3, 4, 6, 8]);
        var per = pick([100, 250, 500]);
        var v = (kg / per) * price;
        return mk({ subject: "math", q: "Berries cost $" + price + " per " + per + " g. What do " + kg + " g cost?",
          right: money(v), wrong: [money(v * 2), money(v / 2), money(kg * price / 1000)],
          teach: kg + " g is " + (kg / per) + " lots of " + per + " g, so " + (kg / per) + " × $" + price + " = $" + v + "." }, "grown");
      },
      function () {
        var f = pick([[3, 8, "37.5%"], [5, 8, "62.5%"], [7, 20, "35%"], [9, 25, "36%"], [3, 16, "18.75%"], [11, 40, "27.5%"]]);
        return mk({ subject: "math", q: "Write " + f[0] + "/" + f[1] + " as a percentage.",
          right: f[2], wrong: shuffle(["37.5%", "62.5%", "35%", "36%", "18.75%", "27.5%", "42.5%", "56%"].filter(function (p) { return p !== f[2]; })).slice(0, 3),
          teach: f[0] + " ÷ " + f[1] + " = " + (f[0] / f[1]) + " → " + f[2] + "." }, "grown");
      },
      function () {
        var start = pick([1200, 2500, 4000, 8000]), rate = pick([5, 10, 20]);
        var v = Math.round(start * Math.pow(1 + rate / 100, 2));
        return mk({ subject: "math", q: "$" + commas(start) + " grows " + rate + "% a year. What is it worth after 2 years?",
          right: "$" + commas(v), wrong: ["$" + commas(start + start * rate * 2 / 100), "$" + commas(Math.round(start * (1 + rate / 100))), "$" + commas(Math.round(start * (1 + rate / 50)))],
          teach: "Growth compounds: " + start + " × 1." + String(rate).padStart(2, "0") + "² = " + commas(v) + " — more than simple interest." }, "grown");
      }
    ]
  };

  function gcd(a, b) { return b ? gcd(b, a % b) : a; }

  /* =========================================================
     LETTERS & WORDS — the Word Well.
     The little ones' questions are deliberately PICTURE-first:
     a giant letter and two pictures needs no reading at all.
     ========================================================= */

  /* One picture per letter — the alphabet the pre-readers work from. */
  var ABC = [
    ["A", "🍎", "Apple"], ["B", "🐻", "Bear"], ["C", "🐱", "Cat"], ["D", "🐶", "Dog"],
    ["E", "🐘", "Elephant"], ["F", "🐸", "Frog"], ["G", "🍇", "Grapes"], ["H", "🏠", "House"],
    ["I", "🍦", "Ice cream"], ["J", "🫙", "Jar"], ["K", "🔑", "Key"], ["L", "🦁", "Lion"],
    ["M", "🌙", "Moon"], ["N", "👃", "Nose"], ["O", "🐙", "Octopus"], ["P", "🐧", "Penguin"],
    ["Q", "👑", "Queen"], ["R", "🌈", "Rainbow"], ["S", "☀️", "Sun"], ["T", "🌳", "Tree"],
    ["U", "☂️", "Umbrella"], ["V", "🎻", "Violin"], ["W", "🍉", "Watermelon"],
    ["X", "🩻", "X-ray"], ["Y", "🪀", "Yo-yo"], ["Z", "🦓", "Zebra"]
  ];

  /* Beginning SOUNDS, which is a different skill from letter NAMES:
     "b… b… ball" is how a four-year-old actually cracks reading. */
  var SOUNDS = [
    ["b", "🎈", "balloon"], ["c", "🥕", "carrot"], ["d", "🦆", "duck"], ["f", "🐟", "fish"],
    ["g", "🐐", "goat"], ["h", "🎩", "hat"], ["j", "🧃", "juice"], ["l", "🍃", "leaf"],
    ["m", "🌝", "moon"], ["n", "🪺", "nest"], ["p", "🥧", "pie"], ["r", "🤖", "robot"],
    ["s", "🧦", "sock"], ["t", "🚂", "train"], ["v", "🚐", "van"], ["w", "🌊", "wave"]
  ];

  /* Little words a pre-reader can sound out, each with the picture that
     says what the word MEANS — so "which is spelled right" has an answer. */
  var TINY_WORDS = [
    ["cat", "🐱", ["kat", "cta", "cate"]],
    ["dog", "🐶", ["dawg", "dogg", "doog"]],
    ["sun", "☀️", ["sunn", "son", "sen"]],
    ["bed", "🛏️", ["bd", "bead", "bedd"]],
    ["fish", "🐟", ["fsh", "fich", "phish"]],
    ["hat", "🎩", ["haat", "hatt", "het"]],
    ["cup", "☕", ["kup", "cupp", "cop"]],
    ["bus", "🚌", ["buss", "bas", "bux"]],
    ["star", "⭐", ["stur", "starr", "sta"]],
    ["frog", "🐸", ["frogg", "farg", "flog"]],
    ["milk", "🥛", ["mik", "milck", "melk"]],
    ["tree", "🌳", ["tre", "trea", "tri"]]
  ];

  var RHYMES = [
    ["cat", ["hat", "bat", "mat"], ["dog", "sun", "cup"]],
    ["dog", ["log", "frog", "hog"], ["cat", "bed", "pin"]],
    ["star", ["car", "jar", "far"], ["moon", "tree", "hand"]],
    ["tree", ["bee", "knee", "sea"], ["cat", "door", "sock"]],
    ["sun", ["run", "bun", "fun"], ["star", "leaf", "milk"]],
    ["moon", ["spoon", "balloon", "soon"], ["sun", "dog", "hat"]],
    ["cake", ["lake", "snake", "rake"], ["pie", "book", "shoe"]],
    ["bug", ["rug", "mug", "hug"], ["ant", "sky", "door"]],
    ["fish", ["dish", "wish", "swish"], ["bird", "rock", "lamp"]],
    ["hop", ["top", "mop", "stop"], ["jump", "bird", "sand"]],
    ["bell", ["shell", "well", "tell"], ["ring", "door", "cake"]],
    ["night", ["light", "kite", "bright"], ["day", "moon", "sleep"]]
  ];

  /* Words kids reliably spell wrong, with the wrong spelling they pick. */
  var SPELL_MID = [
    ["friend", ["freind", "frend", "friand"]],
    ["because", ["becuase", "becase", "becuse"]],
    ["beautiful", ["beutiful", "beautifull", "bueatiful"]],
    ["different", ["diffrent", "diferent", "differant"]],
    ["favorite", ["favrite", "faverite", "favorate"]],
    ["birthday", ["birthdey", "berthday", "birthdai"]],
    ["people", ["peaple", "pepole", "peple"]],
    ["listen", ["lissen", "lisen", "listan"]],
    ["school", ["scool", "shool", "schoool"]],
    ["little", ["littel", "litle", "lital"]],
    ["family", ["familly", "famly", "familey"]],
    ["really", ["realy", "reallly", "rilly"]],
    ["together", ["togather", "togeather", "togeter"]],
    ["thought", ["thougt", "thawt", "thoght"]],
    ["enough", ["enuff", "enogh", "enouhg"]],
    ["believe", ["beleive", "belive", "beleve"]],
    ["important", ["importent", "inportant", "importint"]],
    ["surprise", ["suprise", "surprize", "surprice"]]
  ];

  var SPELL_BIG = [
    ["separate", ["seperate", "seperete", "sepparate"]],
    ["necessary", ["neccessary", "necesary", "nesessary"]],
    ["definitely", ["definately", "definatly", "definitley"]],
    ["rhythm", ["rythm", "rhythem", "rythem"]],
    ["restaurant", ["resturant", "restaraunt", "restauraunt"]],
    ["embarrass", ["embarass", "embarras", "embbarass"]],
    ["occasion", ["ocassion", "occassion", "ocasion"]],
    ["knowledge", ["knowlege", "knowledg", "nowledge"]],
    ["exercise", ["excercise", "exercize", "exersize"]],
    ["calendar", ["calender", "calandar", "callendar"]],
    ["mischievous", ["mischievious", "mischevous", "mishchievous"]]
  ];

  var SYN_MID = [
    ["big", "large", ["thin", "loud", "wet"]],
    ["happy", "glad", ["angry", "sleepy", "hungry"]],
    ["fast", "quick", ["heavy", "shiny", "kind"]],
    ["cold", "chilly", ["bright", "soft", "brave"]],
    ["shout", "yell", ["whisper", "walk", "read"]],
    ["tiny", "small", ["huge", "square", "dusty"]],
    ["begin", "start", ["finish", "carry", "wash"]],
    ["scared", "afraid", ["proud", "silly", "curious"]],
    ["smart", "clever", ["slow", "empty", "rough"]],
    ["pretty", "lovely", ["ugly", "noisy", "sticky"]],
    ["hard", "difficult", ["easy", "purple", "sweet"]],
    ["jump", "leap", ["crawl", "sing", "melt"]]
  ];

  var SYN_BIG = [
    ["enormous", "gigantic", ["tiny", "gentle", "hollow"]],
    ["ancient", "very old", ["brand new", "very loud", "very rich"]],
    ["fragile", "easily broken", ["heavy", "hidden", "expensive"]],
    ["timid", "shy", ["bold", "furious", "clumsy"]],
    ["generous", "giving", ["greedy", "sleepy", "wild"]],
    ["peculiar", "strange", ["ordinary", "friendly", "damp"]],
    ["nimble", "quick and light", ["stiff", "gloomy", "hungry"]],
    ["scarce", "hard to find", ["everywhere", "delicious", "noisy"]],
    ["weary", "tired out", ["excited", "grateful", "curious"]],
    ["vacant", "empty", ["crowded", "colorful", "frozen"]],
    ["jagged", "rough and sharp", ["smooth", "round", "warm"]],
    ["eager", "keen to go", ["reluctant", "confused", "silent"]],
    ["dense", "packed tightly", ["airy", "shiny", "distant"]],
    ["mimic", "copy", ["invent", "destroy", "measure"]],
    ["urgent", "needed right now", ["optional", "gentle", "ancient"]],
    ["abundant", "more than enough", ["scarce", "dull", "hidden"]],
    ["brittle", "easily snapped", ["bendy", "warm", "sticky"]],
    ["conceal", "hide away", ["reveal", "measure", "polish"]],
    ["drowsy", "half asleep", ["wide awake", "furious", "starving"]],
    ["furious", "extremely angry", ["delighted", "puzzled", "sleepy"]],
    ["gracious", "kind and polite", ["rude", "clumsy", "greedy"]],
    ["hazardous", "dangerous", ["safe", "misty", "expensive"]],
    ["reluctant", "unwilling", ["eager", "forgetful", "generous"]],
    ["sturdy", "strongly built", ["flimsy", "shiny", "quiet"]],
    ["vivid", "bright and clear", ["faded", "silent", "frozen"]]
  ];

  var ANT_BIG = [
    ["ancient", "modern", ["elderly", "dusty", "wise"]],
    ["expand", "shrink", ["stretch", "widen", "grow"]],
    ["arrive", "depart", ["appear", "enter", "land"]],
    ["generous", "stingy", ["kind", "wealthy", "cheerful"]],
    ["victory", "defeat", ["battle", "trophy", "parade"]],
    ["temporary", "permanent", ["brief", "quick", "sudden"]],
    ["increase", "decrease", ["double", "measure", "collect"]],
    ["fragile", "sturdy", ["thin", "clear", "precious"]],
    ["ascend", "descend", ["climb", "float", "hover"]],
    ["praise", "criticize", ["applaud", "notice", "reward"]]
  ];

  var HOMOPHONES = [
    ["The knight rode his ____ across the field.", "horse", ["hoarse", "hourse", "horss"], "A horse is the animal; hoarse is a croaky voice."],
    ["The big brown ____ ate all the honey.", "bear", ["bare", "bair", "baer"], "A bear is the animal; bare means uncovered."],
    ["The bride walked down the ____.", "aisle", ["isle", "I'll", "ile"], "An aisle is the walkway; an isle is a small island."],
    ["____ going to love this game.", "They're", ["Their", "There", "Thier"], "They're = they are. Their = belonging to them. There = a place."],
    ["The dog wagged ____ tail.", "its", ["it's", "its'", "it is"], "It's = it is. Its (no apostrophe) means belonging to it."],
    ["We walked ____ the tunnel.", "through", ["threw", "thorough", "thru"], "Through = in one side and out the other. Threw = tossed."],
    ["The flower has a lovely ____.", "scent", ["sent", "cent", "sint"], "A scent is a smell; sent is the past of send; a cent is a penny."],
    ["Which ____ of shoes should I wear?", "pair", ["pear", "pare", "payer"], "A pair is two. A pear is the fruit."],
    ["The wind ____ the leaves off the tree.", "blew", ["blue", "bleu", "blow"], "Blew is the past of blow. Blue is the color."],
    ["She was ____ than her brother at chess.", "better", ["bettor", "beter", "batter"], "Better = more skilled. A bettor places bets."]
  ];

  var AFFIX_BIG = [
    ["What does the prefix RE- mean, as in REBUILD?", "again", ["not", "before", "under"], "Re- means again: rebuild, replay, rewrite."],
    ["What does the prefix UN- mean, as in UNHAPPY?", "not", ["again", "many", "after"], "Un- flips the meaning: unhappy, unkind, unlock."],
    ["What does the prefix PRE- mean, as in PREVIEW?", "before", ["after", "against", "small"], "Pre- means before: preview, prepare, preheat."],
    ["What does the prefix SUB- mean, as in SUBMARINE?", "under", ["over", "beside", "fast"], "Sub- means under: submarine, subway, submerge."],
    ["What does the suffix -LESS mean, as in FEARLESS?", "without", ["full of", "one who", "made of"], "-less means without: fearless, hopeless, endless."],
    ["What does the suffix -FUL mean, as in JOYFUL?", "full of", ["without", "before", "smallest"], "-ful means full of: joyful, careful, colorful."],
    ["What does the suffix -ER often mean, as in TEACHER?", "one who does it", ["without it", "before it", "the opposite"], "-er names the doer: teacher, baker, painter."],
    ["What does BI- mean, as in BICYCLE?", "two", ["three", "round", "fast"], "Bi- means two: bicycle (two wheels), binoculars, bilingual."],
    ["What does TRI- mean, as in TRIANGLE?", "three", ["two", "many", "tiny"], "Tri- means three: triangle, tricycle, triplets."],
    ["What does MICRO- mean, as in MICROSCOPE?", "very small", ["very large", "very fast", "very old"], "Micro- means tiny — a microscope shows tiny things."]
  ];

  var VOCAB_GROWN = [
    ["ubiquitous", "found absolutely everywhere", ["extremely rare", "deeply hidden", "brand new"]],
    ["laconic", "using very few words", ["long-winded", "badly spelled", "openly rude"]],
    ["ephemeral", "lasting a very short time", ["everlasting", "invisible", "repeated often"]],
    ["magnanimous", "generous towards a rival", ["boastful", "extremely wealthy", "quick-tempered"]],
    ["obfuscate", "to deliberately muddle", ["to clarify", "to celebrate", "to purchase"]],
    ["sanguine", "cheerfully optimistic", ["gloomy", "bloodthirsty", "undecided"]],
    ["recalcitrant", "stubbornly uncooperative", ["eager to please", "easily fooled", "deeply asleep"]],
    ["quixotic", "wildly idealistic and impractical", ["coldly logical", "physically quick", "unusually quiet"]],
    ["taciturn", "habitually silent", ["chatty", "bad-tempered", "well travelled"]],
    ["venerate", "to deeply respect", ["to poison", "to ignore", "to gamble"]],
    ["fastidious", "fussy about small details", ["careless", "extremely fast", "openly greedy"]],
    ["nebulous", "vague and hard to pin down", ["razor sharp", "gigantic", "electrically charged"]],
    ["gregarious", "loving company", ["preferring solitude", "eating grass", "easily angered"]],
    ["intransigent", "refusing to compromise", ["endlessly flexible", "travelling on foot", "clearly written"]],
    ["perfunctory", "done without real care", ["done beautifully", "done in secret", "done too late"]],
    ["ameliorate", "to make a bad thing better", ["to make it worse", "to measure it", "to hide it"]],
    ["circumspect", "cautious, watching all sides", ["reckless", "circular", "poorly lit"]],
    ["disparate", "fundamentally different", ["nearly identical", "desperately needed", "spread thin"]],
    ["equivocate", "to speak so as to avoid committing", ["to state plainly", "to ride a horse", "to divide equally"]],
    ["inveterate", "long-established and habitual", ["newly begun", "veterinary", "easily cured"]],
    ["pragmatic", "guided by what actually works", ["guided by pure theory", "guided by luck", "guided by rules alone"]],
    ["surreptitious", "done secretly", ["done loudly", "done slowly", "done twice"]],
    ["trenchant", "sharply and clearly expressed", ["blunt and vague", "dug into the ground", "wildly funny"]],
    ["assiduous", "showing great care and persistence", ["lazy", "acidic", "assisting badly"]],
    ["anachronism", "something out of its proper time", ["a recurring nightmare", "a mechanical fault", "a formal apology"]],
    ["belie", "to give a false impression of", ["to confirm", "to announce loudly", "to postpone"]],
    ["cogent", "clear and convincing", ["confusing", "cheerfully rude", "physically strong"]],
    ["deleterious", "causing harm", ["helpful", "delicious", "easily deleted"]],
    ["enervate", "to drain of energy", ["to energise", "to make nervous", "to fence in"]],
    ["ineffable", "too great to be put into words", ["easily explained", "unable to speak", "not edible"]],
    ["juxtapose", "to place side by side for contrast", ["to overlap", "to postpone", "to judge harshly"]],
    ["obsequious", "excessively eager to please", ["openly rude", "hard of hearing", "wildly funny"]],
    ["prosaic", "dull and ordinary", ["poetic", "professional", "prone to argue"]],
    ["sycophant", "a flatterer seeking advantage", ["a mind reader", "a musical instrument", "a false witness"]],
    ["tenuous", "very slight or flimsy", ["rock solid", "long-lasting", "ten-sided"]],
    ["unctuous", "insincerely smooth and oily", ["blunt and honest", "brightly lit", "freshly opened"]],
    ["voracious", "wanting huge amounts", ["easily satisfied", "truthful", "vocal"]],
    ["capricious", "changing mood without warning", ["utterly reliable", "goat-like", "financially careful"]],
    ["esoteric", "understood by only a few", ["widely known", "outdoors", "electrically charged"]],
    ["indelible", "impossible to remove", ["easily erased", "unreadable", "inedible"]],
    ["placate", "to calm someone down", ["to provoke", "to place carefully", "to praise"]],
    ["reticent", "reluctant to speak", ["talkative", "recently arrived", "resistant to heat"]]
  ];

  var IDIOMS = [
    ["“Bite the bullet” means…", "face something painful and get on with it", ["chew loudly", "buy something expensive", "shoot first"], "From battlefield surgery — patients bit a bullet instead of screaming."],
    ["“A red herring” is…", "a clue that leads you the wrong way", ["a rare fish", "a bad temper", "a lucky charm"], "Smoked herring turns red — and was said to throw hunting dogs off a scent."],
    ["“Steal someone's thunder” means…", "take the credit or attention they earned", ["frighten them", "rob them", "beat them in a storm"], "A playwright invented a thunder machine — rivals copied it."],
    ["“The eleventh hour” means…", "at the very last possible moment", ["very early", "exactly 11am", "for eleven hours"], "The last hour of a twelve-hour working day."],
    ["“Cut the mustard” means…", "meet the required standard", ["cook well", "give up", "argue"], "To be good enough for the job."],
    ["“Preaching to the choir” means…", "arguing for something to people who already agree", ["singing badly", "speaking in church", "teaching children"], "The choir already believes you."],
    ["“A pyrrhic victory” is…", "a win that costs you more than losing would", ["an easy win", "a stolen win", "a win by one point"], "King Pyrrhus beat Rome but lost his army doing it."],
    ["“Beg the question” strictly means…", "assume the very thing you are trying to prove", ["raise an obvious question", "ask politely", "avoid an answer"], "A logic term: circular reasoning, not “invite the question”."],
    ["\u201cBurn the midnight oil\u201d means…", "work late into the night", ["waste money", "start an argument", "cook badly"], "From working by oil lamp long after dark."],
    ["\u201cThe tip of the iceberg\u201d means…", "a small visible part of a much bigger problem", ["a cold reception", "the very best part", "a dangerous person"], "About nine tenths of an iceberg sits below the water."],
    ["\u201cThrow in the towel\u201d means…", "give up", ["clean up", "start over", "join in"], "A boxer's corner throws a towel into the ring to stop the fight."],
    ["\u201cA blessing in disguise\u201d is…", "something bad that turns out well", ["a secret gift", "a lucky guess", "a hidden insult"], "You only recognize it afterwards."],
    ["\u201cSpill the beans\u201d means…", "reveal a secret", ["make a mess", "lose your temper", "share a meal"], "Possibly from ancient voting with beans in jars."],
    ["\u201cOnce in a blue moon\u201d means…", "very rarely", ["every night", "at sunset", "twice a year"], "A blue moon is the second full moon in a calendar month."]
  ];

  var CONFUSED = [
    ["The medicine had no ____ on the fever.", "effect", ["affect", "efect", "affekt"], "Effect is (usually) the noun — a result. Affect is the verb — to influence."],
    ["Fewer cars means ____ traffic.", "less", ["fewer", "lesser", "little"], "Fewer counts things you can number; less is for amounts you can't."],
    ["She was ____ tired to argue.", "too", ["to", "two", "tou"], "Too = excessively. To = direction. Two = 2."],
    ["Between you and ____, this cake is burnt.", "me", ["I", "myself", "mine"], "After a preposition you need me — “between you and me”."],
    ["The team played ____ than last week.", "better", ["gooder", "more good", "best"], "Better compares two things; best compares three or more."],
    ["____ the one who left the door open?", "Who's", ["Whose", "Whos", "Whoms"], "Who's = who is. Whose shows belonging."],
    ["He ____ the whole plan without telling anyone.", "devised", ["derived", "deprived", "divided"], "Devise = to invent a plan. Derive = to get from a source."],
    ["That argument is entirely ____ of the evidence.", "independent", ["independant", "indipendent", "independend"], "-ent, not -ant: independent."]
  ];

  var COMPOUNDS = [
    ["rain", "bow", ["rainbow"], "rain + bow = rainbow"],
    ["butter", "fly", ["butterfly"], "butter + fly = butterfly"],
    ["sun", "flower", ["sunflower"], "sun + flower = sunflower"],
    ["foot", "ball", ["football"], "foot + ball = football"],
    ["snow", "man", ["snowman"], "snow + man = snowman"],
    ["cup", "cake", ["cupcake"], "cup + cake = cupcake"],
    ["star", "fish", ["starfish"], "star + fish = starfish"],
    ["tooth", "brush", ["toothbrush"], "tooth + brush = toothbrush"],
    ["fire", "place", ["fireplace"], "fire + place = fireplace"],
    ["book", "shelf", ["bookshelf"], "book + shelf = bookshelf"]
  ];

  var WORD = {
    tot: [
      function () {
        var t = pick(ABC), o = pick(ABC.filter(function (x) { return x[0] !== t[0]; }));
        return mk({ subject: "word", q: "Which one starts with this letter?", big: { text: t[0] },
          right: { t: t[2], emoji: t[1] }, wrong: [{ t: o[2], emoji: o[1] }],
          teach: t[2] + " starts with " + t[0] + "!" }, "tot");
      },
      function () {
        var t = pick(ABC), o = pick(ABC.filter(function (x) { return x[0] !== t[0]; }));
        return mk({ subject: "word", q: "Find the letter " + t[0] + ".", big: { emoji: t[1] },
          right: { t: t[0], huge: true }, wrong: [{ t: o[0], huge: true }],
          teach: t[2] + " begins with " + t[0] + "." }, "tot");
      }
    ],
    early: [
      function () {
        var t = pick(ABC);
        var others = shuffle(ABC.filter(function (x) { return x[0] !== t[0]; })).slice(0, 3);
        return mk({ subject: "word", q: "Which picture starts with this letter?", big: { text: t[0] },
          right: { t: t[2], emoji: t[1] }, wrong: others.map(function (o) { return { t: o[2], emoji: o[1] }; }),
          teach: t[2] + " starts with " + t[0] + " — " + t[0].toLowerCase() + " like in " + t[2].toLowerCase() + "." }, "early");
      },
      function () {
        var r = pick(RHYMES);
        return mk({ subject: "word", q: "Which word RHYMES with it?", big: { text: r[0].toUpperCase() },
          right: pick(r[1]), wrong: r[2],
          teach: "Rhyming words end with the same sound as " + r[0] + "." }, "early");
      },
      function () {
        var t = pick(ABC);
        return mk({ subject: "word", q: "Which is the little version of this letter?", big: { text: t[0] },
          right: { t: t[0].toLowerCase(), huge: true },
          wrong: shuffle(ABC.filter(function (x) { return x[0] !== t[0]; })).slice(0, 3)
            .map(function (o) { return { t: o[0].toLowerCase(), huge: true }; }),
          teach: "Big " + t[0] + " and little " + t[0].toLowerCase() + " are the same letter." }, "early");
      },
      function () {
        // The picture says WHICH word we mean, so exactly one spelling can
        // be right. (Without it, "top" and "pot" are both spelled fine.)
        var w = pick(TINY_WORDS);
        return mk({ subject: "word", kind: "big", q: "Which one spells this?", big: { emoji: w[1] },
          right: w[0], wrong: w[2],
          teach: w[1] + " is spelled " + w[0].split("").join("-") + "." }, "early");
      },
      function () {
        var s = pick(SOUNDS);
        var others = shuffle(SOUNDS.filter(function (x) { return x[0] !== s[0]; })).slice(0, 3);
        return mk({ subject: "word", q: "Which one starts with the “" + s[0] + "” sound?",
          right: { t: s[2], emoji: s[1] },
          wrong: others.map(function (o) { return { t: o[2], emoji: o[1] }; }),
          teach: "“" + s[0] + "” … " + s[2] + ". Say it slowly and listen to the very first sound." }, "early");
      },
      function () {
        // Which letter is MISSING — the first real spelling puzzle.
        var w = pick(TINY_WORDS);
        var i = 1 + rnd(w[0].length - 1);
        var gap = w[0].slice(0, i) + "_" + w[0].slice(i + 1);
        var letter = w[0][i];
        var others = shuffle("abcdefghijklmnoprstuw".split("").filter(function (c) { return c !== letter; })).slice(0, 3);
        return mk({ subject: "word", kind: "big", q: "Which letter is missing?", big: { text: gap.toUpperCase() },
          right: { t: letter, huge: true },
          wrong: others.map(function (c) { return { t: c, huge: true }; }),
          teach: "The word is " + w[0] + " " + w[1] + " — " + w[0].split("").join("-") + "." }, "early");
      }
    ],
    mid: [
      function () {
        var w = pick(SPELL_MID);
        return mk({ subject: "word", q: "Which spelling is correct?",
          right: w[0], wrong: w[1], teach: "It's " + w[0].toUpperCase().split("").join("-") + "." }, "mid");
      },
      function () {
        var s = pick(SYN_MID);
        return mk({ subject: "word", q: "Which word means about the same as “" + s[0] + "”?",
          right: s[1], wrong: s[2], teach: "“" + s[0] + "” and “" + s[1] + "” mean nearly the same thing." }, "mid");
      },
      function () {
        var c = pick(COMPOUNDS);
        return mk({ subject: "word", q: "Put them together: " + c[0].toUpperCase() + " + " + c[1].toUpperCase() + " = ?",
          right: c[2][0], wrong: [c[1] + c[0], c[0] + "ing", c[1] + "s"], teach: c[3] + " — that's a compound word." }, "mid");
      },
      function () {
        // Each irregular plural carries its OWN wrong answers — the
        // tempting ones a child actually writes.
        var plurals = [
          ["box", "boxes", ["boxs", "boxen", "box's"]],
          ["baby", "babies", ["babys", "babyes", "baby's"]],
          ["leaf", "leaves", ["leafs", "leafes", "leafves"]],
          ["mouse", "mice", ["mouses", "mouse", "mices"]],
          ["child", "children", ["childs", "childes", "childrens"]],
          ["foot", "feet", ["foots", "footes", "feets"]],
          ["knife", "knives", ["knifes", "knifs", "knive"]],
          ["bus", "buses", ["buss", "bus's", "busen"]],
          ["tooth", "teeth", ["tooths", "toothes", "teeths"]],
          ["story", "stories", ["storys", "storyes", "storie"]],
          ["goose", "geese", ["gooses", "geeses", "goosen"]],
          ["wolf", "wolves", ["wolfs", "wolfes", "wolven"]],
          ["person", "people", ["persons", "peoples", "personen"]],
          ["shelf", "shelves", ["shelfs", "shelfes", "shelve"]]
        ];
        var p = pick(plurals);
        return mk({ subject: "word", q: "More than one " + p[0] + " is…",
          right: p[1], wrong: p[2],
          teach: "One " + p[0] + ", two " + p[1] + " — that one doesn't just add an s." }, "mid");
      },
      function () {
        var words = [["butterfly", 3], ["elephant", 3], ["cat", 1], ["banana", 3], ["computer", 3],
                     ["rain", 1], ["window", 2], ["dinosaur", 3], ["helicopter", 4], ["table", 2],
                     ["watermelon", 4], ["pencil", 2]];
        var w = pick(words);
        return mk({ subject: "word", q: "How many syllables (claps) in “" + w[0] + "”?",
          right: String(w[1]), wrong: [String(w[1] + 1), String(Math.max(1, w[1] - 1)), String(w[1] + 2)],
          teach: "Clap it out — " + w[0] + " has " + w[1] + "." }, "mid");
      },
      function () {
        var cons = [
          ["do not", "don't", ["dont", "do'nt", "donot"]],
          ["cannot", "can't", ["cant", "ca'nt", "can'not"]],
          ["it is", "it's", ["its", "it'is", "iti's"]],
          ["they are", "they're", ["their", "there", "theyre"]],
          ["we will", "we'll", ["well", "we'ill", "wewill"]],
          ["I am", "I'm", ["Im", "I'am", "Iam"]],
          ["should not", "shouldn't", ["shouldnt", "should'nt", "shouldnot"]],
          ["you have", "you've", ["youve", "you'have", "youv"]],
          ["will not", "won't", ["willn't", "wont", "wo'nt"]],
          ["let us", "let's", ["lets", "let'us", "letus"]]
        ];
        var c = pick(cons);
        return mk({ subject: "word", q: "Squash “" + c[0] + "” into a contraction.",
          right: c[1], wrong: c[2],
          teach: "The apostrophe stands in for the missing letters: " + c[1] + "." }, "mid");
      },
      function () {
        // Parts of speech — the vocabulary you need to talk about writing.
        var pos = [
          ["noun", "a person, place or thing", ["dragon", "river", "teacher", "castle", "biscuit"]],
          ["verb", "an action word", ["jump", "whisper", "build", "swim", "shout"]],
          ["adjective", "a describing word", ["sparkly", "enormous", "grumpy", "purple", "brave"]],
          ["adverb", "how something is done", ["quickly", "gently", "loudly", "carefully", "sadly"]]
        ];
        var target = pick(pos);
        var others = pos.filter(function (p) { return p[0] !== target[0]; });
        var w = pick(target[2]);
        return mk({ subject: "word", q: "What kind of word is “" + w + "”?",
          right: target[0], wrong: others.map(function (p) { return p[0]; }),
          teach: "A " + target[0] + " is " + target[1] + " — and “" + w + "” is one." }, "mid");
      },
      function () {
        // Context clues: the meaning is IN the sentence if you read carefully.
        var ctx = [
          ["The path was so narrow that we had to walk in single file.", "narrow", "not very wide", ["very muddy", "brand new", "going downhill"]],
          ["She was famished — she hadn't eaten since breakfast.", "famished", "very hungry", ["very tired", "very late", "very angry"]],
          ["The puppy was timid and hid behind the sofa.", "timid", "shy and nervous", ["excited", "hungry", "noisy"]],
          ["He glanced at the clock and then kept reading.", "glanced", "looked quickly", ["stared for ages", "pointed", "shouted"]],
          ["The soup was bland, so we added salt and pepper.", "bland", "not very tasty", ["far too hot", "burnt", "delicious"]],
          ["We sprinted for the bus and only just caught it.", "sprinted", "ran very fast", ["walked slowly", "waited", "waved"]],
          ["The old bridge was rickety and creaked as we crossed.", "rickety", "wobbly and unsafe", ["freshly painted", "very wide", "made of stone"]],
          ["The audience was silent, then began to applaud.", "applaud", "clap", ["leave", "boo", "sing"]]
        ];
        var c = pick(ctx);
        return mk({ subject: "word", q: "“" + c[0] + "”  —  what does " + c[1].toUpperCase() + " mean here?",
          right: c[2], wrong: c[3],
          teach: "The rest of the sentence gives it away: that's what " + c[1] + " means." }, "mid");
      }
    ],
    big: [
      function () {
        var s = pick(SYN_BIG);
        return mk({ subject: "word", q: "What does “" + s[0] + "” mean?",
          right: s[1], wrong: s[2], teach: "“" + s[0] + "” means " + s[1] + "." }, "big");
      },
      function () {
        var a = pick(ANT_BIG);
        return mk({ subject: "word", q: "Which is the OPPOSITE of “" + a[0] + "”?",
          right: a[1], wrong: a[2], teach: "The opposite of " + a[0] + " is " + a[1] + "." }, "big");
      },
      function () {
        var w = pick(SPELL_BIG);
        return mk({ subject: "word", q: "Which spelling is correct?",
          right: w[0], wrong: w[1], teach: "It's " + w[0].toUpperCase().split("").join("-") + "." }, "big");
      },
      function () {
        var h = pick(HOMOPHONES);
        return mk({ subject: "word", q: h[0], right: h[1], wrong: h[2], teach: h[3] }, "big");
      },
      function () {
        var a = pick(AFFIX_BIG);
        return mk({ subject: "word", q: a[0], right: a[1], wrong: a[2], teach: a[3] }, "big");
      },
      function () {
        var an = [["Puppy is to dog as kitten is to…", "cat", ["milk", "paw", "bird"]],
                  ["Hot is to cold as day is to…", "night", ["sun", "warm", "week"]],
                  ["Author is to book as composer is to…", "symphony", ["orchestra", "piano", "concert"]],
                  ["Fin is to fish as wing is to…", "bird", ["sky", "feather", "nest"]],
                  ["Library is to books as gallery is to…", "paintings", ["tickets", "silence", "shelves"]],
                  ["Second is to minute as minute is to…", "hour", ["clock", "day", "moment"]],
                  ["Doctor is to patient as teacher is to…", "student", ["school", "lesson", "chalk"]],
                  ["Herd is to cows as flock is to…", "sheep", ["grass", "farm", "wool"]]];
        var a = pick(an);
        return mk({ subject: "word", q: a[0], right: a[1], wrong: a[2],
          teach: "Work out the relationship in the first pair, then copy it." }, "big");
      }
    ],
    grown: [
      function () {
        var v = pick(VOCAB_GROWN);
        return mk({ subject: "word", q: "“" + v[0].toUpperCase() + "” means…",
          right: v[1], wrong: v[2], teach: v[0] + ": " + v[1] + "." }, "grown");
      },
      function () {
        var i = pick(IDIOMS);
        return mk({ subject: "word", q: i[0], right: i[1], wrong: i[2], teach: i[3] }, "grown");
      },
      function () {
        var c = pick(CONFUSED);
        return mk({ subject: "word", q: c[0], right: c[1], wrong: c[2], teach: c[3] }, "grown");
      },
      function () {
        var roots = [["The root PHOT- (photograph, photon) means…", "light", ["sound", "distance", "memory"]],
                     ["The root -DICT- (predict, dictate) means…", "say or speak", ["write", "carry", "break"]],
                     ["The root -PORT- (transport, portable) means…", "carry", ["cut", "join", "measure"]],
                     ["The root -SCRIB-/-SCRIPT- (describe, manuscript) means…", "write", ["see", "hold", "count"]],
                     ["The root TERR- (terrain, subterranean) means…", "earth or land", ["fear", "heat", "boundary"]],
                     ["The root -SPECT- (inspect, spectator) means…", "look", ["hope", "speed", "shape"]],
                     ["The root BENE- (benefit, benevolent) means…", "good or well", ["bad", "before", "twice"]],
                     ["The root CHRON- (chronology, anachronism) means…", "time", ["color", "gold", "order"]],
                     ["The root -CRED- (credible, credentials) means…", "believe or trust", ["create", "grow", "cross"]],
                     ["The root MAL- (malfunction, malevolent) means…", "bad", ["many", "small", "male"]]];
        var r = pick(roots);
        return mk({ subject: "word", q: r[0], right: r[1], wrong: r[2],
          teach: "Knowing the root lets you decode words you have never met." }, "grown");
      },
      function () {
        var an = [["Ephemeral is to permanence as arid is to…", "moisture", ["desert", "heat", "sand"]],
                  ["Meticulous is to care as reckless is to…", "caution", ["speed", "danger", "anger"]],
                  ["Sculptor is to marble as poet is to…", "language", ["paper", "emotion", "rhyme"]],
                  ["Cacophony is to sound as pandemonium is to…", "behavior", ["music", "silence", "crowd"]],
                  ["Miser is to generosity as coward is to…", "bravery", ["fear", "money", "battle"]],
                  ["Drought is to water as famine is to…", "food", ["crops", "hunger", "land"]]];
        var a = pick(an);
        return mk({ subject: "word", q: a[0], right: a[1], wrong: a[2],
          teach: "These pairs are “thing : what it lacks” — the trickiest analogy shape." }, "grown");
      }
    ]
  };

  /* =========================================================
     THE WIDE WORLD — the Rainbow Pool.
     Colours and shapes for the littles; science, geography and
     general knowledge as the tiers climb.
     ========================================================= */
  var PAINTS = [
    ["Red", "#e8384f", "🍓"], ["Orange", "#ff8c1a", "🍊"], ["Yellow", "#ffd400", "🍋"],
    ["Green", "#2fbf4f", "🥦"], ["Blue", "#2b7fff", "🫐"], ["Purple", "#8a3ffc", "🍇"],
    ["Pink", "#ff6ec7", "🌸"], ["Brown", "#8a5a2b", "🐻"], ["Black", "#22202e", "🐈‍⬛"],
    ["White", "#fdfdff", "🦢"], ["Gray", "#9aa0b4", "🐘"]
  ];

  var SHAPES = [
    ["Circle", "⭕", "round all the way — no corners at all"],
    ["Square", "🟥", "4 sides, all the same length"],
    ["Triangle", "🔺", "3 sides and 3 corners"],
    ["Star", "⭐", "5 points"],
    ["Heart", "💜", "two bumps and a point"],
    ["Diamond", "🔷", "a square balanced on its corner"],
    ["Moon", "🌙", "a curved crescent"]
  ];

  function paintChoice(p) { return { t: p[0], colour: p[1] }; }

  var ANIMAL_SOUNDS = [
    ["🐄", "Moo"], ["🐶", "Woof"], ["🐱", "Meow"], ["🐸", "Ribbit"], ["🦆", "Quack"],
    ["🐑", "Baa"], ["🐷", "Oink"], ["🦁", "Roar"], ["🐝", "Buzz"], ["🐴", "Neigh"], ["🐔", "Cluck"]
  ];

  var BABIES = [
    ["cat", "kitten"], ["dog", "puppy"], ["cow", "calf"], ["sheep", "lamb"], ["horse", "foal"],
    ["duck", "duckling"], ["frog", "tadpole"], ["bear", "cub"], ["kangaroo", "joey"], ["goat", "kid"],
    ["butterfly", "caterpillar"], ["chicken", "chick"]
  ];

  var SCI_MID = [
    ["Where does a polar bear live?", "The Arctic", ["The desert", "The rainforest", "The deep ocean"], "Polar bears live on Arctic sea ice — there are none at the South Pole."],
    ["Which planet is closest to the Sun?", "Mercury", ["Venus", "Earth", "Mars"], "Order out: Mercury, Venus, Earth, Mars."],
    ["Which planet has the most famous rings?", "Saturn", ["Jupiter", "Mars", "Neptune"], "Saturn's rings are mostly chunks of ice."],
    ["What do plants use to make their food?", "Sunlight", ["Moonlight", "Soil only", "Wind"], "Photosynthesis: sunlight + water + air become sugar."],
    ["Water turns into ice when it…", "freezes", ["melts", "boils", "evaporates"], "Freezing is liquid → solid. Melting is the other way."],
    ["Which of these is a MAMMAL?", "Whale", ["Shark", "Crocodile", "Penguin"], "Whales breathe air and feed their babies milk."],
    ["How many legs does an insect have?", "6", ["8", "4", "10"], "Six legs = insect. Eight = spider (an arachnid)."],
    ["What is the biggest animal on Earth?", "Blue whale", ["Elephant", "Dinosaur", "Giraffe"], "A blue whale can be longer than three school buses."],
    ["Which is the largest ocean?", "Pacific", ["Atlantic", "Indian", "Arctic"], "The Pacific covers about a third of the planet."],
    ["What makes a rainbow?", "Sunlight bending through raindrops", ["Clouds bumping", "Wind and dust", "The moon"], "Each raindrop splits white light into its colors."],
    ["How many bones does a grown-up have?", "206", ["150", "300", "88"], "Babies are born with about 300 — some fuse together."],
    ["Which organ pumps your blood?", "Heart", ["Lungs", "Brain", "Stomach"], "Your heart beats around 100,000 times a day."],
    ["A caterpillar changes into a butterfly inside a…", "chrysalis", ["nest", "shell", "burrow"], "That whole change is called metamorphosis."],
    ["Which continent is Egypt in?", "Africa", ["Asia", "Europe", "Australia"], "Egypt sits in the north-east corner of Africa."],
    ["Which is a state of matter?", "Gas", ["Metal", "Colour", "Speed"], "Solid, liquid and gas are the three everyday states."],
    ["What do we call animals that eat only plants?", "Herbivores", ["Carnivores", "Omnivores", "Predators"], "Herb = plant. Carnivores eat meat; omnivores eat both."],
    ["Which season comes after summer?", "Autumn", ["Spring", "Winter", "Monsoon"], "Spring, summer, autumn, winter — then round again."],
    ["What is the hardest natural substance?", "Diamond", ["Iron", "Granite", "Bone"], "Diamond is pure carbon squeezed under huge pressure."],
    ["Which animal is a reptile?", "Crocodile", ["Frog", "Dolphin", "Penguin"], "Reptiles have scales and lay eggs on land. Frogs are amphibians."],
    ["What do we call melted rock under the ground?", "Magma", ["Lava", "Granite", "Ore"], "Under the ground it is magma; once it pours out it is lava."],
    ["Which planet is the biggest?", "Jupiter", ["Saturn", "Earth", "Neptune"], "You could fit more than 1,300 Earths inside Jupiter."],
    ["How many days does Earth take to go around the Sun?", "About 365", ["About 30", "About 100", "About 1,000"], "That is why a leap year adds a day every four years."],
    ["Which part of a plant takes up water?", "The roots", ["The leaves", "The flower", "The seeds"], "Roots drink; leaves catch sunlight."],
    ["What is a group of lions called?", "A pride", ["A pack", "A herd", "A flock"], "Wolves come in packs; lions come in prides."],
    ["Which of these is NOT a continent?", "Greenland", ["Europe", "Africa", "Asia"], "Greenland is the world\u2019s largest island — part of North America."],
    ["What do bees make from nectar?", "Honey", ["Milk", "Silk", "Wax only"], "Bees visit around two million flowers to make one pound of honey."],
    ["Which is the smallest US state?", "Rhode Island", ["Delaware", "Connecticut", "Hawaii"], "Rhode Island would fit inside Alaska more than 400 times."],
    ["What kind of animal is a dolphin?", "A mammal", ["A fish", "A reptile", "An amphibian"], "Dolphins breathe air, are warm-blooded and feed their babies milk."],
    ["Which tool shows you which way is north?", "A compass", ["A telescope", "A barometer", "A thermometer"], "A compass needle lines up with Earth\u2019s magnetic field."],
    ["What is the closest star to Earth?", "The Sun", ["The North Star", "Sirius", "Alpha Centauri"], "The Sun is a very ordinary star that just happens to be nearby."],
    ["Which of these is a fossil fuel?", "Coal", ["Wind", "Sunlight", "Water"], "Coal, oil and gas come from living things buried long ago."],
    ["What do we call an animal that is active at night?", "Nocturnal", ["Migratory", "Herbivore", "Extinct"], "Owls and bats are nocturnal; we are diurnal."],
    ["How many sides does a hexagon have?", "6", ["5", "7", "8"], "Hex means six — like the cells in a beehive."],
    ["What is the largest state in the USA by population?", "California", ["Texas", "New York", "Florida"], "About one in eight Americans lives in California."],
    ["Which gas do we breathe out most of?", "Carbon dioxide", ["Oxygen", "Hydrogen", "Helium"], "We breathe in oxygen and breathe out carbon dioxide — plants do the reverse."],
    ["What is the tallest kind of tree?", "Redwood", ["Oak", "Pine", "Maple"], "Coast redwoods can grow taller than a 30-story building."],
    ["A shape with all sides equal and all angles equal is called…", "regular", ["irregular", "curved", "solid"], "A square is a regular quadrilateral; a rectangle usually is not."],
    ["Which ocean is between America and Europe?", "Atlantic", ["Pacific", "Indian", "Southern"], "Columbus, the Titanic and every transatlantic flight cross the Atlantic."],
    ["What happens to most of the rain that falls on land?", "It soaks in or runs to rivers", ["It disappears", "It turns to ice", "It becomes air"], "That is the collection stage of the water cycle."],
    ["Which of these animals hibernates?", "Bear", ["Robin", "Salmon", "Butterfly"], "Hibernating animals slow right down to survive winter without food."]
  ];

  var SCI_BIG = [
    ["What gas do plants take IN to make food?", "Carbon dioxide", ["Oxygen", "Nitrogen", "Helium"], "Plants take in CO₂ and give out oxygen — the opposite of us."],
    ["What force pulls you back down when you jump?", "Gravity", ["Friction", "Magnetism", "Pressure"], "Gravity pulls every mass towards every other mass."],
    ["Which step of the water cycle turns liquid into vapour?", "Evaporation", ["Condensation", "Precipitation", "Collection"], "Evaporation → condensation → precipitation → collection."],
    ["Roughly how long does sunlight take to reach Earth?", "About 8 minutes", ["About 1 second", "About 8 hours", "About 8 days"], "Light travels 300,000 km every second — and the Sun is 150 million km away."],
    ["What are the tiny building blocks of all matter?", "Atoms", ["Cells", "Molecules of water", "Crystals"], "Atoms join to make molecules; cells are made of molecules."],
    ["What is the longest river in the world?", "The Nile", ["The Amazon", "The Mississippi", "The Yangtze"], "The Nile runs about 6,650 km through north-east Africa."],
    ["Which is the largest desert on Earth?", "Antarctica", ["The Sahara", "The Gobi", "The Mojave"], "A desert is defined by lack of rainfall — Antarctica barely gets any."],
    ["What causes day and night?", "Earth spinning on its axis", ["Earth orbiting the Sun", "The Moon blocking light", "Clouds"], "One spin = one day. One orbit = one year."],
    ["Which blood cells carry oxygen?", "Red blood cells", ["White blood cells", "Platelets", "Plasma"], "Hemoglobin in red cells grabs oxygen — and makes blood red."],
    ["What is the boiling point of water in Celsius?", "100°", ["50°", "212°", "0°"], "100°C at sea level — 212° is the same in Fahrenheit."],
    ["Which layer of Earth do we live on?", "The crust", ["The mantle", "The outer core", "The inner core"], "Crust, mantle, outer core, inner core — thinnest on top."],
    ["A group of stars that makes a picture is a…", "constellation", ["galaxy", "nebula", "solar system"], "Orion and the Plough are constellations; the Milky Way is our galaxy."],
    ["What do we call a scientist who studies fossils?", "Paleontologist", ["Archaeologist", "Geologist", "Biologist"], "Archaeologists study human remains; paleontologists study ancient life."],
    ["Which US state is the largest by area?", "Alaska", ["Texas", "California", "Montana"], "Alaska is more than twice the size of Texas."],
    ["How many continents are there?", "7", ["5", "6", "8"], "Africa, Antarctica, Asia, Australia, Europe, North America, South America."],
    ["Sound travels fastest through…", "solid steel", ["air", "water", "empty space"], "The tighter the particles, the faster sound passes — and it can't cross a vacuum at all."],
    ["What is the powerhouse of the cell?", "The mitochondria", ["The nucleus", "The ribosome", "The cell wall"], "Mitochondria turn food into usable energy."],
    ["Which mountain is the tallest above sea level?", "Everest", ["K2", "Kilimanjaro", "Denali"], "Everest is 8,849 m — but Mauna Kea is taller from its base on the seafloor."],
    ["Which planet is known as the Red Planet?", "Mars", ["Venus", "Jupiter", "Mercury"], "Iron oxide — rust — in the soil makes Mars look red."],
    ["What is the chemical formula for water?", "H₂O", ["CO₂", "O₂", "NaCl"], "Two hydrogen atoms bonded to one oxygen atom."],
    ["What do we call an animal with a backbone?", "A vertebrate", ["An invertebrate", "A mammal", "A predator"], "Fish, birds, reptiles, amphibians and mammals are all vertebrates."],
    ["Which simple machine is a ramp?", "An inclined plane", ["A lever", "A pulley", "A wedge"], "A ramp trades a longer distance for less force."],
    ["What is the largest organ in the human body?", "The skin", ["The liver", "The lungs", "The brain"], "An adult\u2019s skin weighs around 8 pounds and covers about 22 square feet."],
    ["What causes the seasons?", "Earth\u2019s tilted axis", ["How close Earth is to the Sun", "The Moon", "Ocean currents"], "The 23.5° tilt means each hemisphere leans towards the Sun for half the year."],
    ["Which US state was the first to join the Union?", "Delaware", ["Virginia", "Massachusetts", "Pennsylvania"], "Delaware ratified the Constitution on 7 December 1787."],
    ["What is the study of weather called?", "Meteorology", ["Geology", "Astronomy", "Ecology"], "Meteorologists forecast; climatologists study the long-term patterns."],
    ["Which river runs through the Grand Canyon?", "The Colorado", ["The Rio Grande", "The Missouri", "The Snake"], "It has been cutting the canyon for around 6 million years."],
    ["What are the three states of matter you meet every day?", "Solid, liquid, gas", ["Hot, warm, cold", "Rock, water, air", "Big, small, medium"], "Plasma is a fourth, but you mostly meet it in stars and neon signs."],
    ["A food chain always starts with…", "a producer", ["a predator", "a decomposer", "a herbivore"], "Producers — usually plants — make their own food from sunlight."],
    ["What is the speed of light, roughly?", "300,000 km per second", ["300 km per second", "3,000 km per second", "30 million km per second"], "Nothing with mass can reach it."],
    ["Which ancient civilization built the pyramids at Giza?", "The Egyptians", ["The Romans", "The Greeks", "The Aztecs"], "The Great Pyramid was finished around 2560 BC."],
    ["What is an ecosystem?", "Living things and their surroundings together", ["Only the animals in a place", "The weather in a place", "A kind of map"], "Change one part and the whole thing shifts."],
    ["Why does ice float on water?", "Ice is less dense than water", ["Ice is lighter than air", "Water pushes it up magnetically", "Ice has air holes"], "Water is unusual — most substances are denser as solids."],
    ["What is the biggest planet\u2019s most famous feature?", "The Great Red Spot", ["The Rings", "Olympus Mons", "The Ice Caps"], "A storm on Jupiter that has raged for at least 190 years."],
    ["Which two countries share the longest border?", "USA and Canada", ["Russia and China", "India and China", "Brazil and Bolivia"], "About 5,525 miles, including Alaska."],
    ["What does an herbivore\u2019s flat back teeth help it do?", "Grind plants", ["Tear meat", "Crack bones", "Filter water"], "Carnivores have pointed teeth for tearing instead."],
    ["What is the hottest planet in the solar system?", "Venus", ["Mercury", "Mars", "Jupiter"], "Venus is farther from the Sun than Mercury, but its thick CO₂ blanket traps the heat."],
    ["Which layer of the atmosphere do planes usually fly in?", "The stratosphere", ["The troposphere", "The mesosphere", "The thermosphere"], "Above most of the weather, which makes for a smoother ride."],
    ["What is a peninsula?", "Land with water on three sides", ["Land surrounded by water", "A narrow strip joining two lands", "A ring of coral"], "Florida and Italy are peninsulas; an island has water on all sides."],
    ["Roughly what fraction of Earth\u2019s surface is ocean?", "About 71%", ["About 30%", "About 50%", "About 90%"], "Which is why it is sometimes called the blue planet."]
  ];

  var SCI_GROWN = [
    ["What is the capital of Australia?", "Canberra", ["Sydney", "Melbourne", "Perth"], "Canberra was purpose-built as a compromise between Sydney and Melbourne."],
    ["What is the capital of Canada?", "Ottawa", ["Toronto", "Vancouver", "Montreal"], "Ottawa was chosen by Queen Victoria in 1857."],
    ["What is the capital of Turkey?", "Ankara", ["Istanbul", "Izmir", "Antalya"], "Istanbul is the largest city, but Ankara has been the capital since 1923."],
    ["What is the capital of Brazil?", "Brasília", ["Rio de Janeiro", "São Paulo", "Salvador"], "Brasília was built from nothing in the 1950s and opened in 1960."],
    ["What is the capital of Switzerland?", "Bern", ["Zurich", "Geneva", "Basel"], "Switzerland calls Bern its “federal city” rather than a formal capital."],
    ["What is the capital of New Zealand?", "Wellington", ["Auckland", "Christchurch", "Dunedin"], "Wellington is the world's southernmost capital."],
    ["Which element has the chemical symbol Fe?", "Iron", ["Fluorine", "Francium", "Fermium"], "From the Latin ferrum."],
    ["Which element has the symbol K?", "Potassium", ["Krypton", "Carbon", "Calcium"], "From the Latin kalium."],
    ["What is the most abundant gas in Earth's atmosphere?", "Nitrogen", ["Oxygen", "Carbon dioxide", "Argon"], "About 78% nitrogen to 21% oxygen."],
    ["Roughly how old is the Earth?", "4.5 billion years", ["6,000 years", "500 million years", "13.8 billion years"], "13.8 billion is the age of the universe, not the Earth."],
    ["Who wrote “Pride and Prejudice”?", "Jane Austen", ["Charlotte Brontë", "George Eliot", "Virginia Woolf"], "Published anonymously in 1813 as “by a Lady”."],
    ["Which artist painted “The Starry Night”?", "Van Gogh", ["Monet", "Cézanne", "Munch"], "Painted in 1889 from his asylum window at Saint-Rémy."],
    ["What does DNA stand for?", "Deoxyribonucleic acid", ["Dinucleic acid", "Diribonucleic acid", "Deoxyribose nutrient acid"], "Its double-helix structure was published in 1953."],
    ["Which sea is the saltiest well-known body of water?", "The Dead Sea", ["The Red Sea", "The Baltic Sea", "The Caspian Sea"], "About 10 times saltier than the ocean — you float without trying."],
    ["Which country has the most time zones?", "France", ["Russia", "The USA", "China"], "France's overseas territories give it 12 — Russia has 11."],
    ["What is the smallest country in the world?", "Vatican City", ["Monaco", "Nauru", "San Marino"], "About 0.44 km² — smaller than many city parks."],
    ["Which planet spins on its side?", "Uranus", ["Venus", "Neptune", "Mercury"], "Its axis is tipped about 98° — probably from an ancient collision."],
    ["What does “E = mc²” relate?", "Energy and mass", ["Force and acceleration", "Charge and current", "Pressure and volume"], "Einstein, 1905: mass and energy are the same thing in different clothes."],
    ["China borders how many countries?", "14", ["8", "11", "17"], "Tied with Russia for the most land neighbors."],
    ["Which ocean current keeps north-west Europe mild?", "The Gulf Stream", ["The Humboldt Current", "The Kuroshio", "The Benguela Current"], "It carries warm Caribbean water across the Atlantic."],
    ["The Great Fire of London happened in which year?", "1666", ["1066", "1566", "1766"], "It began in a Pudding Lane bakery and burned for four days."],
    ["Which is NOT one of the Great Lakes?", "Lake Champlain", ["Lake Huron", "Lake Erie", "Lake Superior"], "HOMES: Huron, Ontario, Michigan, Erie, Superior."],
    ["What is the capital of South Africa (the seat of government)?", "Pretoria", ["Cape Town", "Johannesburg", "Durban"], "South Africa has three: Pretoria (executive), Cape Town (legislative), Bloemfontein (judicial)."],
    ["What is the capital of Myanmar?", "Naypyidaw", ["Yangon", "Mandalay", "Bagan"], "The government moved there from Yangon in 2005."],
    ["What is the capital of Kazakhstan?", "Astana", ["Almaty", "Shymkent", "Tashkent"], "Almaty was the capital until 1997; the city has been renamed more than once since."],
    ["Which country is home to the world\u2019s oldest continuously operating library?", "Morocco", ["Italy", "Greece", "Egypt"], "Al-Qarawiyyin in Fez, founded in 859 AD."],
    ["Who developed the first successful polio vaccine?", "Jonas Salk", ["Alexander Fleming", "Louis Pasteur", "Edward Jenner"], "Salk announced it in 1955 and refused to patent it."],
    ["Which is the deepest point in the ocean?", "The Mariana Trench", ["The Puerto Rico Trench", "The Java Trench", "The Tonga Trench"], "Challenger Deep is nearly 11 km down — deeper than Everest is tall."],
    ["What is the busiest maritime chokepoint for oil?", "The Strait of Hormuz", ["The Suez Canal", "The Panama Canal", "The Bosphorus"], "Roughly a fifth of the world\u2019s oil passes through it."],
    ["Which element is the most abundant in the universe?", "Hydrogen", ["Helium", "Oxygen", "Carbon"], "About 75% of ordinary matter by mass."],
    ["What is the term for the point in an orbit closest to the Sun?", "Perihelion", ["Aphelion", "Perigee", "Apogee"], "Peri- = near, helios = sun. Perigee is the equivalent for the Moon and Earth."],
    ["Which war ended with the Treaty of Versailles?", "World War I", ["World War II", "The Crimean War", "The Franco-Prussian War"], "Signed in June 1919, five years after the war began."],
    ["Who wrote \u201cOne Hundred Years of Solitude\u201d?", "Gabriel García Márquez", ["Isabel Allende", "Jorge Luis Borges", "Mario Vargas Llosa"], "Published in 1967; a founding work of magical realism."],
    ["What does the Richter-style magnitude scale measure?", "Earthquake energy", ["Wind speed", "Wave height", "Volcanic ash"], "It is logarithmic: each whole number is about 32 times more energy."],
    ["Which country consumes the most coffee per person?", "Finland", ["Italy", "Brazil", "The USA"], "Around 12 kg a head each year."],
    ["What is the smallest bone in the human body?", "The stapes", ["The femur", "The scaphoid", "The hyoid"], "One of three tiny bones in the middle ear; about 3 mm long."],
    ["Which US president served the shortest term?", "William Henry Harrison", ["James Garfield", "Zachary Taylor", "Warren Harding"], "31 days in 1841."],
    ["What is the primary cause of ocean tides?", "The Moon\u2019s gravity", ["Wind", "Earth\u2019s rotation alone", "Ocean currents"], "The Sun contributes too, which is why spring and neap tides differ."],
    ["Which language has the most native speakers?", "Mandarin Chinese", ["English", "Spanish", "Hindi"], "English leads on total speakers once you count second-language ones."],
    ["What is Occam\u2019s razor?", "Prefer the explanation with fewest assumptions", ["Always doubt experts", "Correlation implies causation", "The simplest thing is always true"], "It is a rule of thumb for choosing between explanations, not a proof."],
    ["Which mountain range separates Europe from Asia?", "The Urals", ["The Alps", "The Caucasus", "The Carpathians"], "The Ural Mountains run roughly north–south through Russia."],
    ["What year did the Berlin Wall come down?", "1989", ["1979", "1985", "1991"], "9 November 1989; Germany reunified the following year."],
    ["What is the most common blood type worldwide?", "O positive", ["A positive", "B negative", "AB positive"], "Roughly a third of people have it."],
    ["Which planet has the shortest day?", "Jupiter", ["Mercury", "Earth", "Mars"], "Despite its size, Jupiter spins once in under 10 hours."],
    ["What does GDP stand for?", "Gross Domestic Product", ["General Domestic Price", "Gross Development Plan", "Global Domestic Price"], "The total value of goods and services a country produces."],
    ["Which sea is bordered by Turkey, Ukraine and Georgia?", "The Black Sea", ["The Caspian Sea", "The Aegean Sea", "The Adriatic Sea"], "It connects to the Mediterranean through the Bosphorus."]
  ];

  var WONDER = {
    tot: [
      function () {
        var p = pick(PAINTS.slice(0, 6)), o = pick(PAINTS.filter(function (x) { return x[0] !== p[0]; }));
        return mk({ subject: "wonder", kind: "colour", q: "Which paint matches?", big: { emoji: p[2] },
          right: paintChoice(p), wrong: [paintChoice(o)], teach: p[2] + " is " + p[0].toLowerCase() + "!" }, "tot");
      },
      function () {
        var a = pick(ANIMAL_SOUNDS), o = pick(ANIMAL_SOUNDS.filter(function (x) { return x[1] !== a[1]; }));
        return mk({ subject: "wonder", q: "What does this animal say?", big: { emoji: a[0] },
          right: a[1], wrong: [o[1]], teach: "It says " + a[1] + "!" }, "tot");
      }
    ],
    early: [
      function () {
        var p = pick(PAINTS);
        return mk({ subject: "wonder", kind: "colour", q: "Which one is " + p[0].toUpperCase() + "?", big: { text: p[0].toUpperCase() },
          right: paintChoice(p), wrong: shuffle(PAINTS.filter(function (x) { return x[0] !== p[0]; })).slice(0, 3).map(paintChoice),
          teach: p[0] + " looks like " + p[2] + "." }, "early");
      },
      function () {
        var p = pick(PAINTS);
        return mk({ subject: "wonder", kind: "colour", q: "What color is this?", big: { emoji: p[2] },
          right: paintChoice(p), wrong: shuffle(PAINTS.filter(function (x) { return x[0] !== p[0]; })).slice(0, 3).map(paintChoice),
          teach: p[2] + " is " + p[0].toLowerCase() + "." }, "early");
      },
      function () {
        var s = pick(SHAPES);
        return mk({ subject: "wonder", q: "Which one is a " + s[0].toUpperCase() + "?", big: { text: s[0].toUpperCase() },
          right: { t: s[0], emoji: s[1] },
          wrong: shuffle(SHAPES.filter(function (x) { return x[0] !== s[0]; })).slice(0, 3).map(function (x) { return { t: x[0], emoji: x[1] }; }),
          teach: "A " + s[0].toLowerCase() + " is " + s[2] + "." }, "early");
      },
      function () {
        var b = pick(BABIES);
        return mk({ subject: "wonder", q: "A baby " + b[0] + " is called a…",
          right: b[1], wrong: shuffle(BABIES.filter(function (x) { return x[1] !== b[1]; })).slice(0, 3).map(function (x) { return x[1]; }),
          teach: "Baby " + b[0] + " = " + b[1] + "." }, "early");
      },
      function () {
        // Every one of these carries a REASON, because "nice spotting!"
        // teaches a three-year-old absolutely nothing.
        var sets = [
          ["Which one flies?", "🦋", ["🐟", "🐌", "🐢"], "A butterfly has wings. Fish swim, and snails and turtles crawl."],
          ["Which one lives in water?", "🐠", ["🐪", "🦒", "🐿️"], "Fish breathe underwater with gills. Camels, giraffes and squirrels live on land."],
          ["Which one is a fruit?", "🍌", ["🥕", "🥦", "🧅"], "Fruit grows from a flower and carries seeds. Carrots are roots, broccoli is a flower bud, onions are bulbs."],
          ["Which one do you wear?", "👟", ["🍕", "🚗", "📚"], "Shoes go on your feet. Pizza you eat, a car you ride in, a book you read."],
          ["Which one is hot?", "🔥", ["❄️", "🧊", "⛄"], "Fire is hot. Snow, ice and snowmen are all freezing cold."],
          ["Which one comes out at night?", "🌙", ["☀️", "🌻", "🏖️"], "The moon shines at night. The sun, sunflowers and the beach belong to the daytime."],
          ["Which one is an animal?", "🐘", ["🌳", "🚗", "🏠"], "Animals eat, move and grow. Trees grow but can't walk; cars and houses aren't alive at all."],
          ["Which one do you use to hear?", "👂", ["👁️", "👃", "✋"], "Ears hear, eyes see, a nose smells and a hand touches."],
          ["Which one grows in the ground?", "🥔", ["🐟", "☁️", "🧦"], "Potatoes grow underground. Fish swim, clouds float and socks come from a drawer!"],
          ["Which one is round?", "⚽", ["📕", "🚪", "🧊"], "A ball is round everywhere — no corners. Books, doors and ice cubes have straight edges."],
          ["Which one is the baby?", "🐣", ["🐔", "🦆", "🦢"], "A chick has just hatched. Hens, ducks and swans are all grown up."],
          ["Which one keeps you dry in the rain?", "☂️", ["🕶️", "🧤", "🎈"], "An umbrella covers you. Sunglasses are for bright sun and gloves are for cold hands."]
        ];
        var s = pick(sets);
        return mk({ subject: "wonder", q: s[0], right: { t: "", emoji: s[1] },
          wrong: s[2].map(function (e) { return { t: "", emoji: e }; }), teach: s[3] }, "early");
      },
      function () {
        var seq = [["🌱", "🌿", "🌳", "A seed sprouts, grows leaves, then becomes a tree."],
                   ["🥚", "🐣", "🐔", "An egg hatches into a chick, and the chick grows into a hen."],
                   ["🌧️", "🌈", "☀️", "Rain, then a rainbow while the sun comes back out."]];
        var s = pick(seq);
        return mk({ subject: "wonder", kind: "big", q: "What comes NEXT?", big: { emoji: s[0] + " " + s[1] + " ?" },
          right: { t: "", emoji: s[2] },
          wrong: shuffle(["🚗", "🧦", "🍕", "🎈", "🪑"]).slice(0, 3).map(function (e) { return { t: "", emoji: e }; }),
          teach: s[3] }, "early");
      }
    ],
    mid: [function () { var s = pick(SCI_MID); return mk({ subject: "wonder", q: s[0], right: s[1], wrong: s[2], teach: s[3] }, "mid"); }],
    big: [function () { var s = pick(SCI_BIG); return mk({ subject: "wonder", q: s[0], right: s[1], wrong: s[2], teach: s[3] }, "big"); }],
    grown: [function () { var s = pick(SCI_GROWN); return mk({ subject: "wonder", q: s[0], right: s[1], wrong: s[2], teach: s[3] }, "grown"); }]
  };

  /* =========================================================
     ASKING — one door for the whole game.
     A short memory of what was just asked stops the same
     question landing twice in a row, which kills the illusion.
     ========================================================= */
  var BANKS = { math: MATH, word: WORD, wonder: WONDER };
  var recent = [];

  function ask(subject, tier) {
    if (!BANKS[subject]) subject = pick(["math", "word", "wonder"]);
    if (!BANKS[subject][tier]) tier = "mid";
    var q = null;
    for (var tries = 0; tries < 12; tries++) {
      q = pick(BANKS[subject][tier])();
      var key = q.q + "|" + q.choices[q.answer].t + "|" + (q.big ? (q.big.text || q.big.emoji) : "");
      if (recent.indexOf(key) === -1) {
        recent.push(key);
        if (recent.length > 14) recent.shift();
        break;
      }
    }
    return q;
  }

  /* A question coming back out of the review basket must not arrive with
     its answer sitting in the same spot — otherwise a child "learns" the
     position, not the answer. Re-deal the choices every time. */
  function reshuffle(q) {
    if (!q || !q.choices || !q.choices.length) return q;
    var right = q.choices[q.answer];
    var order = shuffle(q.choices.slice());
    var copy = {};
    for (var k in q) if (Object.prototype.hasOwnProperty.call(q, k)) copy[k] = q[k];
    copy.choices = order;
    copy.answer = order.indexOf(right);
    if (copy.answer < 0) copy.answer = 0;
    return copy;
  }

  /* =========================================================
     THINGS YOU CAN OWN
     ========================================================= */
  var FOODS = [
    { id: "blueberry", name: "Blueberry",     emoji: "🫐", cost: 4,  fill: 8,  joy: 1 },
    { id: "carrot",    name: "Crunchy Carrot", emoji: "🥕", cost: 5,  fill: 11, joy: 1 },
    { id: "strawberry", name: "Strawberry",   emoji: "🍓", cost: 6,  fill: 12, joy: 3 },
    { id: "apple",     name: "Red Apple",     emoji: "🍎", cost: 8,  fill: 15, joy: 2 },
    { id: "bread",     name: "Warm Bread",    emoji: "🍞", cost: 10, fill: 20, joy: 2 },
    { id: "cheese",    name: "Cheese Wedge",  emoji: "🧀", cost: 12, fill: 22, joy: 3 },
    { id: "cookie",    name: "Choc Cookie",   emoji: "🍪", cost: 14, fill: 12, joy: 12 },
    { id: "soup",      name: "Veggie Soup",   emoji: "🍲", cost: 16, fill: 30, joy: 4 },
    { id: "sandwich",  name: "Big Sandwich",  emoji: "🥪", cost: 18, fill: 34, joy: 5 },
    { id: "honey",     name: "Pot of Honey",  emoji: "🍯", cost: 20, fill: 26, joy: 9 },
    { id: "pizza",     name: "Pizza Slice",   emoji: "🍕", cost: 24, fill: 40, joy: 8 },
    { id: "cake",      name: "Birthday Cake", emoji: "🍰", cost: 30, fill: 32, joy: 18 },
    { id: "starfruit", name: "Star Fruit",    emoji: "⭐", cost: 40, fill: 50, joy: 14, rare: true },
    { id: "jelly",     name: "Rainbow Jelly", emoji: "🌈", cost: 55, fill: 55, joy: 28, rare: true },
    /* --- the second shelf, so the market has something new most mornings --- */
    { id: "banana",    name: "Banana",        emoji: "🍌", cost: 6,  fill: 14, joy: 2 },
    { id: "pear",      name: "Green Pear",    emoji: "🍐", cost: 7,  fill: 13, joy: 2 },
    { id: "egg",       name: "Boiled Egg",    emoji: "🥚", cost: 7,  fill: 14, joy: 1 },
    { id: "grapes",    name: "Grapes",        emoji: "🍇", cost: 8,  fill: 15, joy: 3 },
    { id: "corn",      name: "Sweetcorn",     emoji: "🌽", cost: 9,  fill: 17, joy: 2 },
    { id: "melon",     name: "Melon Slice",   emoji: "🍉", cost: 11, fill: 19, joy: 4 },
    { id: "popcorn",   name: "Popcorn Tub",   emoji: "🍿", cost: 13, fill: 12, joy: 11 },
    { id: "donut",     name: "Sprinkle Donut", emoji: "🍩", cost: 17, fill: 16, joy: 15 },
    { id: "icecream",  name: "Ice Cream",     emoji: "🍨", cost: 19, fill: 14, joy: 20 },
    { id: "taco",      name: "Crunchy Taco",  emoji: "🌮", cost: 21, fill: 33, joy: 7 },
    { id: "pancakes",  name: "Pancake Stack", emoji: "🥞", cost: 22, fill: 34, joy: 10 },
    { id: "noodles",   name: "Noodle Bowl",   emoji: "🍜", cost: 26, fill: 42, joy: 9 },
    { id: "stew",      name: "Hearty Stew",   emoji: "🥘", cost: 28, fill: 46, joy: 6 },
    { id: "sushi",     name: "Sushi Set",     emoji: "🍣", cost: 34, fill: 44, joy: 12 },
    { id: "cloudfloss", name: "Cloud Floss",  emoji: "🍧", cost: 48, fill: 30, joy: 40, rare: true },
    { id: "moonpie",   name: "Moon Pie",      emoji: "🌜", cost: 60, fill: 60, joy: 30, rare: true }
  ];

  var TOYS = [
    { id: "balloon", name: "Balloon",      emoji: "🎈", cost: 25, joy: 8 },
    { id: "bell",    name: "Jingle Bell",  emoji: "🔔", cost: 30, joy: 9 },
    { id: "ball",    name: "Bouncy Ball",  emoji: "🏀", cost: 40, joy: 12 },
    { id: "kite",    name: "Paper Kite",   emoji: "🪁", cost: 55, joy: 15 },
    { id: "plush",   name: "Plush Friend", emoji: "🧸", cost: 70, joy: 18 },
    { id: "trumpet", name: "Tiny Trumpet", emoji: "🎺", cost: 85, joy: 20 },
    { id: "skate",   name: "Skateboard",   emoji: "🛹", cost: 100, joy: 24 },
    { id: "yoyo",    name: "Yo-yo",        emoji: "🪀", cost: 20,  joy: 7 },
    { id: "blocks",  name: "Building Blocks", emoji: "🧱", cost: 35, joy: 10 },
    { id: "puzzle",  name: "Jigsaw Puzzle", emoji: "🧩", cost: 45, joy: 13 },
    { id: "boat",    name: "Toy Boat",     emoji: "⛵", cost: 60,  joy: 16 },
    { id: "drum",    name: "Little Drum",  emoji: "🥁", cost: 75,  joy: 19 },
    { id: "robot",   name: "Wind-up Robot", emoji: "🤖", cost: 110, joy: 26 },
    { id: "scope",   name: "Star Telescope", emoji: "🔭", cost: 130, joy: 28 },
    { id: "rocket",  name: "Rocket Ride",  emoji: "🚀", cost: 160, joy: 32 },
    /* Rare toys never sit on the ordinary shelf — see RARE FINDS below. */
    { id: "marble",  name: "Galaxy Marble", emoji: "🌀", cost: 70,  joy: 22, rare: true },
    { id: "wand",    name: "Sparkle Wand", emoji: "🪄", cost: 95,  joy: 26, rare: true },
    { id: "glider",  name: "Star Glider",  emoji: "🛩️", cost: 125, joy: 29, rare: true }
  ];

  var CARE = [
    { id: "soap",   name: "Berry Soap",   emoji: "🧼", cost: 8,  clean: 30 },
    { id: "bath",   name: "Bubble Bath",  emoji: "🛁", cost: 20, clean: 70, joy: 8 },
    { id: "tonic",  name: "Berry Tonic",  emoji: "🧪", cost: 35, energy: 60, joy: 15 },
    { id: "pillow", name: "Cloud Pillow", emoji: "☁️", cost: 45, energy: 100 },
    { id: "sponge", name: "Scrub Sponge", emoji: "🧽", cost: 12, clean: 42 },
    { id: "lotion", name: "Shine Lotion", emoji: "🧴", cost: 18, clean: 50, joy: 4 },
    { id: "tea",    name: "Sleepy Tea",   emoji: "🍵", cost: 24, energy: 45, joy: 6 },
    { id: "shower", name: "Rain Shower",  emoji: "🚿", cost: 28, clean: 85, joy: 5 },
    { id: "wrap",   name: "Warm Wrap",    emoji: "🧣", cost: 32, energy: 70, joy: 10 },
    { id: "milk",   name: "Moon Milk",    emoji: "🥛", cost: 40, energy: 90, joy: 12 },
    { id: "lounger", name: "Sun Lounger", emoji: "⛱️", cost: 50, energy: 100, joy: 20 },
    { id: "starsoap", name: "Stardust Soap", emoji: "🌟", cost: 42, clean: 100, joy: 12, rare: true },
    { id: "dreamtea", name: "Dream Tea",  emoji: "🫖", cost: 58, energy: 100, joy: 22, rare: true }
  ];

  /* Books are read once: they teach a real fact and level your pet's mind. */
  var BOOKS = [
    { id: "beasts",  name: "Book of Beasts",   emoji: "📕", cost: 35, xp: 30, topic: "wonder" },
    { id: "atlas",   name: "Star Atlas",       emoji: "📗", cost: 35, xp: 30, topic: "wonder" },
    { id: "hoard",   name: "The Word Hoard",   emoji: "📘", cost: 35, xp: 30, topic: "word" },
    { id: "numbers", name: "Number Lore",      emoji: "📙", cost: 35, xp: 30, topic: "math" },
    { id: "valley",  name: "Valley Histories", emoji: "📓", cost: 45, xp: 45, topic: "wonder" },
    { id: "maps",    name: "Book of Maps",     emoji: "🗺️", cost: 35, xp: 30, topic: "wonder" },
    { id: "shapes",  name: "Shapes & Patterns", emoji: "📐", cost: 40, xp: 38, topic: "math" },
    { id: "poems",   name: "Book of Poems",    emoji: "🧾", cost: 40, xp: 38, topic: "word" },
    { id: "riddles", name: "Riddle Book",      emoji: "📔", cost: 40, xp: 36, topic: "word" },
    { id: "machines", name: "How Things Work", emoji: "📒", cost: 55, xp: 55, topic: "wonder" },
    { id: "grimoire", name: "The Deep Grimoire", emoji: "📚", cost: 75, xp: 80, topic: "wonder" },
    { id: "marslog", name: "The Mars Log",  emoji: "🧭", cost: 95, xp: 105, topic: "wonder", rare: true }
  ];

  /* =========================================================
     FURNITURE — the things that turn a nest into a home.
     Bought once and kept for ever (like a toy or a brush), then
     PUT OUT in your house, where you can actually see it standing
     behind your Craepet. Every piece is worth some "cosy", and a
     cosy house pays you back all day long:
       · cosy  — your Craepet gets bored far more slowly while
                 the game is closed
       · rest  — more energy comes back per hour of sleep
       · tidy  — it stays clean for longer
       · study — every right answer anywhere is worth extra XP
     ========================================================= */
  var FURNITURE = [
    /* --- 🕯️ Cosy Corner: the everyday pieces every house starts with --- */
    { id: "candle",  name: "Warm Candle",    emoji: "🕯️", cost: 20,  cosy: 3,  set: "cosy" },
    { id: "lamp",    name: "Little Lamp",    emoji: "💡", cost: 25,  cosy: 4,  set: "cosy" },
    { id: "picture", name: "Framed Picture", emoji: "🖼️", cost: 35,  cosy: 6,  set: "art" },
    { id: "chair",   name: "Little Chair",   emoji: "🪑", cost: 40,  cosy: 6,  rest: 2, set: "cosy" },
    { id: "clock",   name: "Cuckoo Clock",   emoji: "🕰️", cost: 45,  cosy: 7,  set: "cosy" },
    { id: "basket",  name: "Toy Basket",     emoji: "🧺", cost: 45,  cosy: 6,  tidy: 2, set: "cosy" },
    { id: "mirror",  name: "Tall Mirror",    emoji: "🪞", cost: 50,  cosy: 7,  tidy: 3, set: "cosy" },
    { id: "nightlight", name: "Night Light", emoji: "🌟", cost: 55,  cosy: 7,  rest: 2, set: "cosy" },
    { id: "brooms",  name: "Broom Corner",   emoji: "🧹", cost: 48,  cosy: 5,  tidy: 4, set: "cosy" },
    { id: "phone",   name: "Old Telephone",  emoji: "☎️", cost: 70,  cosy: 7,  set: "cosy" },
    { id: "bed",     name: "Cosy Bed",       emoji: "🛏️", cost: 80,  cosy: 9,  rest: 5, set: "cosy" },
    { id: "teddyshelf", name: "Teddy Shelf", emoji: "🧸", cost: 85,  cosy: 10, set: "cosy" },
    { id: "tub",     name: "Claw-foot Tub",  emoji: "🛁", cost: 85,  cosy: 8,  tidy: 5, set: "cosy" },
    { id: "beanbag", name: "Bean Bag",       emoji: "🫘", cost: 90,  cosy: 10, rest: 4, set: "cosy" },
    { id: "sofa",    name: "Big Sofa",       emoji: "🛋️", cost: 110, cosy: 12, set: "cosy" },
    { id: "fire",    name: "Fireplace",      emoji: "🔥", cost: 120, cosy: 13, rest: 3, set: "cosy" },
    { id: "horse",   name: "Rocking Horse",  emoji: "🎠", cost: 150, cosy: 14, set: "cosy" },
    { id: "wardrobe", name: "Big Wardrobe",  emoji: "🚪", cost: 160, cosy: 12, tidy: 5, set: "cosy" },
    { id: "kitchen", name: "Little Kitchen", emoji: "🍳", cost: 175, cosy: 13, set: "cosy" },
    { id: "tvset",   name: "Story Screen",   emoji: "📺", cost: 190, cosy: 15, rest: 2, set: "cosy" },
    { id: "window",  name: "Star Window",    emoji: "🪟", cost: 195, cosy: 16, study: 4, set: "cosy" },
    { id: "console", name: "Games Console",  emoji: "🎮", cost: 215, cosy: 17, rare: true, set: "cosy" },

    /* --- 🪴 Garden Room --- */
    { id: "cactus",  name: "Prickly Cactus", emoji: "🌵", cost: 28,  cosy: 4,  set: "garden" },
    { id: "plant",   name: "Potted Plant",   emoji: "🪴", cost: 30,  cosy: 5,  set: "garden" },
    { id: "sunflower", name: "Tall Sunflower", emoji: "🌻", cost: 32, cosy: 5, set: "garden" },
    { id: "tulips",  name: "Tulip Pots",     emoji: "🌷", cost: 38,  cosy: 6,  set: "garden" },
    { id: "herbs",   name: "Herb Rack",      emoji: "🌿", cost: 45,  cosy: 6,  tidy: 2, set: "garden" },
    { id: "roses",   name: "Rose Bush",      emoji: "🌹", cost: 55,  cosy: 8,  set: "garden" },
    { id: "bonsai",  name: "Bonsai Tree",    emoji: "🎍", cost: 60,  cosy: 7,  study: 2, set: "garden" },
    { id: "birdcage", name: "Singing Bird",  emoji: "🐦", cost: 95,  cosy: 11, set: "garden" },
    { id: "butterfly", name: "Butterfly Case", emoji: "🦋", cost: 115, cosy: 9, study: 4, rare: true, set: "garden" },
    { id: "beehive", name: "Busy Beehive",   emoji: "🍯", cost: 125, cosy: 10, study: 3, set: "garden" },
    { id: "tree",    name: "Indoor Tree",    emoji: "🎄", cost: 140, cosy: 13, set: "garden" },
    { id: "fountain", name: "Stone Fountain", emoji: "⛲", cost: 190, cosy: 16, tidy: 4, set: "garden" },

    /* --- 👑 Royal Rooms (Ellie's wing) --- */
    { id: "goblet",  name: "Gold Goblet",    emoji: "🏆", cost: 165, cosy: 13, set: "royal" },
    { id: "tiara",   name: "Tiara Stand",    emoji: "👸", cost: 150, cosy: 12, set: "royal" },
    { id: "banner",  name: "Royal Banners",  emoji: "🎏", cost: 140, cosy: 12, set: "royal" },
    { id: "swan",    name: "Swan Statue",    emoji: "🦢", cost: 178, cosy: 14, set: "royal" },
    { id: "ballgown", name: "Ball Gown Stand", emoji: "👗", cost: 205, cosy: 15, set: "royal" },
    { id: "chandelier", name: "Crystal Chandelier", emoji: "✨", cost: 245, cosy: 18, set: "royal" },
    { id: "crown",   name: "Crown Stand",    emoji: "👑", cost: 260, cosy: 20, set: "royal" },
    { id: "gemchest", name: "Jewel Chest",   emoji: "💰", cost: 285, cosy: 19, tidy: 3, set: "royal" },
    { id: "throne",  name: "Gold Throne",    emoji: "💺", cost: 340, cosy: 22, rest: 4, rare: true, set: "royal" },

    /* --- 🚀 Space Wing (and a few things brought back from Mars) --- */
    { id: "moonlamp", name: "Moon Lamp",     emoji: "🌙", cost: 90,  cosy: 10, rest: 3, set: "space" },
    { id: "marsrock", name: "Mars Rock",     emoji: "🪨", cost: 125, cosy: 9,  study: 5, rare: true, set: "space" },
    { id: "rocketmodel", name: "Rocket Model", emoji: "🚀", cost: 160, cosy: 13, study: 4, set: "space" },
    { id: "starmap", name: "Star Map Wall",  emoji: "🌌", cost: 178, cosy: 14, study: 7, set: "space" },
    { id: "planetmobile", name: "Planet Mobile", emoji: "🪐", cost: 188, cosy: 14, study: 6, set: "space" },
    { id: "alienplant", name: "Alien Fern",  emoji: "👽", cost: 208, cosy: 15, rare: true, set: "space" },
    { id: "telescope", name: "Big Telescope", emoji: "🔭", cost: 215, cosy: 12, study: 8, set: "space" },
    { id: "astrosuit", name: "Spacesuit Stand", emoji: "👨‍🚀", cost: 232, cosy: 16, set: "space" },
    { id: "satellite", name: "Model Satellite", emoji: "🛰️", cost: 248, cosy: 15, study: 6, set: "space" },
    { id: "hoverlamp", name: "Hover Lamp",   emoji: "🛸", cost: 310, cosy: 20, rest: 4, rare: true, set: "space" },

    /* --- ⛏️ Block Craft (Cory's wing) --- */
    { id: "torchwall", name: "Wall Torch",   emoji: "🔦", cost: 40,  cosy: 6,  set: "blocks" },
    { id: "blockchest", name: "Block Chest", emoji: "🧰", cost: 72,  cosy: 7,  tidy: 4, set: "blocks" },
    { id: "pickaxe", name: "Pickaxe Rack",   emoji: "⛏️", cost: 88,  cosy: 8,  set: "blocks" },
    { id: "cubelamp", name: "Glow Cube",     emoji: "🟦", cost: 96,  cosy: 11, set: "blocks" },
    { id: "redlamp", name: "Red Lamp",       emoji: "🔴", cost: 112, cosy: 9,  set: "blocks" },
    { id: "anvil",   name: "Anvil Bench",    emoji: "🛠️", cost: 132, cosy: 10, study: 3, set: "blocks" },
    { id: "minecart", name: "Mine Cart",     emoji: "🛒", cost: 148, cosy: 12, set: "blocks" },
    { id: "orevein", name: "Ore Block",      emoji: "💠", cost: 168, cosy: 13, study: 4, set: "blocks" },
    { id: "diamondblock", name: "Diamond Block", emoji: "💎", cost: 355, cosy: 24, rare: true, set: "blocks" },

    /* --- 📚 The Library (Jeannie's wing) --- */
    { id: "quill",   name: "Quill & Ink",    emoji: "🪶", cost: 65,  cosy: 6,  study: 3, set: "library" },
    { id: "shelf",   name: "Book Shelf",     emoji: "📚", cost: 70,  cosy: 8,  study: 4, set: "library" },
    { id: "readlamp", name: "Reading Lamp",  emoji: "🪔", cost: 78,  cosy: 8,  rest: 2, study: 2, set: "library" },
    { id: "wordwall", name: "Word Wall",     emoji: "🔤", cost: 108, cosy: 8,  study: 5, set: "library" },
    { id: "desk",    name: "Writing Desk",   emoji: "🖊️", cost: 122, cosy: 9,  study: 5, set: "library" },
    { id: "atlasstand", name: "Atlas Stand", emoji: "🗺️", cost: 142, cosy: 10, study: 6, set: "library" },
    { id: "storynook", name: "Story Nook",   emoji: "📖", cost: 158, cosy: 13, rest: 3, study: 3, set: "library" },
    { id: "globe",   name: "Spinning Globe", emoji: "🌍", cost: 175, cosy: 12, study: 6, set: "library" },
    { id: "scroll",  name: "Ancient Scroll", emoji: "📜", cost: 195, cosy: 12, study: 7, rare: true, set: "library" },
    { id: "bigshelf", name: "Wall of Books", emoji: "🗄️", cost: 205, cosy: 14, study: 8, set: "library" },

    /* --- 🌊 Under the Sea --- */
    { id: "lifering", name: "Life Ring",     emoji: "🛟", cost: 70,  cosy: 7,  set: "sea" },
    { id: "coral",   name: "Coral Fan",      emoji: "🪸", cost: 92,  cosy: 9,  set: "sea" },
    { id: "anchor",  name: "Old Anchor",     emoji: "⚓", cost: 100, cosy: 9,  set: "sea" },
    { id: "shellchair", name: "Shell Seat",  emoji: "🐚", cost: 118, cosy: 10, rest: 3, set: "sea" },
    { id: "tank",    name: "Fish Tank",      emoji: "🐠", cost: 130, cosy: 12, study: 3, set: "sea" },
    { id: "wavewall", name: "Wave Mural",    emoji: "🌊", cost: 148, cosy: 12, set: "sea" },
    { id: "jellylamp", name: "Jellyfish Lamp", emoji: "🪼", cost: 162, cosy: 13, rest: 3, set: "sea" },
    { id: "seachest", name: "Sea Chest",     emoji: "🧳", cost: 178, cosy: 12, tidy: 4, set: "sea" },
    { id: "octopal", name: "Octopus Friend", emoji: "🐙", cost: 215, cosy: 16, rare: true, set: "sea" },

    /* --- 🌴 Jungle --- */
    { id: "vines",   name: "Hanging Vines",  emoji: "🍃", cost: 55,  cosy: 7,  set: "jungle" },
    { id: "palm",    name: "Palm in a Pot",  emoji: "🌴", cost: 82,  cosy: 8,  set: "jungle" },
    { id: "tiki",    name: "Tiki Statue",    emoji: "🗿", cost: 132, cosy: 11, set: "jungle" },
    { id: "hammock", name: "Jungle Hammock", emoji: "🛌", cost: 152, cosy: 12, rest: 6, set: "jungle" },
    { id: "monkeyswing", name: "Monkey Swing", emoji: "🐒", cost: 168, cosy: 13, set: "jungle" },
    { id: "parrot",  name: "Perching Parrot", emoji: "🦜", cost: 198, cosy: 15, study: 3, set: "jungle" },
    { id: "waterfall", name: "Little Waterfall", emoji: "💦", cost: 245, cosy: 18, tidy: 5, rare: true, set: "jungle" },

    /* --- 🎵 Music Room --- */
    { id: "musicbox", name: "Music Box",     emoji: "🎶", cost: 85,  cosy: 9,  rest: 3, set: "music" },
    { id: "guitar",  name: "Guitar Stand",   emoji: "🎸", cost: 108, cosy: 10, set: "music" },
    { id: "records", name: "Record Player",  emoji: "💿", cost: 118, cosy: 10, rest: 2, set: "music" },
    { id: "violin",  name: "Violin Case",    emoji: "🎻", cost: 128, cosy: 11, study: 3, set: "music" },
    { id: "mic",     name: "Karaoke Mic",    emoji: "🎤", cost: 135, cosy: 12, set: "music" },
    { id: "drumkit", name: "Drum Kit",       emoji: "🥁", cost: 142, cosy: 12, set: "music" },
    { id: "piano",   name: "Upright Piano",  emoji: "🎹", cost: 165, cosy: 15, study: 3, set: "music" },
    { id: "harp",    name: "Little Harp",    emoji: "🪕", cost: 185, cosy: 14, rest: 3, rare: true, set: "music" },

    /* --- 🔬 The Laboratory --- */
    { id: "batterylamp", name: "Spark Lamp", emoji: "🔋", cost: 88,  cosy: 8,  study: 3, set: "science" },
    { id: "magnet",  name: "Big Magnet",     emoji: "🧲", cost: 98,  cosy: 7,  study: 4, set: "science" },
    { id: "abacus",  name: "Giant Abacus",   emoji: "🧮", cost: 112, cosy: 9,  study: 6, set: "science" },
    { id: "beakers", name: "Bubbling Beakers", emoji: "⚗️", cost: 138, cosy: 9, study: 6, set: "science" },
    { id: "microscope", name: "Microscope",  emoji: "🔬", cost: 152, cosy: 10, study: 7, set: "science" },
    { id: "dnamodel", name: "DNA Model",     emoji: "🧬", cost: 182, cosy: 12, study: 7, set: "science" },
    { id: "brainjar", name: "Thinking Jar",  emoji: "🧠", cost: 228, cosy: 14, study: 9, rare: true, set: "science" },

    /* --- 🍭 Sweet Shop --- */
    { id: "candyjar", name: "Candy Jar",     emoji: "🍬", cost: 60,  cosy: 7,  set: "sweets" },
    { id: "cupcakes", name: "Cupcake Stand", emoji: "🧁", cost: 92,  cosy: 9,  set: "sweets" },
    { id: "lollipop", name: "Giant Lollipop", emoji: "🍭", cost: 122, cosy: 11, set: "sweets" },
    { id: "gingerwall", name: "Gingerbread Wall", emoji: "🍪", cost: 148, cosy: 12, set: "sweets" },
    { id: "icecreambar", name: "Ice Cream Bar", emoji: "🍦", cost: 205, cosy: 15, rare: true, set: "sweets" },
    { id: "chocfountain", name: "Chocolate Fountain", emoji: "🍫", cost: 265, cosy: 19, rare: true, set: "sweets" },

    /* --- 👻 Spooky --- */
    { id: "spiderweb", name: "Corner Web",   emoji: "🕸️", cost: 50,  cosy: 6,  set: "spooky" },
    { id: "pumpkin", name: "Grinning Pumpkin", emoji: "🎃", cost: 68,  cosy: 7,  set: "spooky" },
    { id: "batbanner", name: "Bat Banner",   emoji: "🦇", cost: 82,  cosy: 8,  set: "spooky" },
    { id: "ghostlamp", name: "Ghost Lamp",   emoji: "👻", cost: 108, cosy: 10, set: "spooky" },
    { id: "cauldron", name: "Bubbling Cauldron", emoji: "🫕", cost: 142, cosy: 11, study: 3, set: "spooky" },
    { id: "crystalball", name: "Crystal Ball", emoji: "🔮", cost: 188, cosy: 14, study: 5, rare: true, set: "spooky" },

    /* --- ❄️ Winter --- */
    { id: "snowglobe", name: "Snow Globe",   emoji: "❄️", cost: 75,  cosy: 8,  set: "winter" },
    { id: "sled",    name: "Little Sled",    emoji: "🛷", cost: 95,  cosy: 9,  set: "winter" },
    { id: "cocoa",   name: "Cocoa Cart",     emoji: "☕", cost: 112, cosy: 10, rest: 3, set: "winter" },
    { id: "icelamp", name: "Ice Lantern",    emoji: "🧊", cost: 122, cosy: 10, set: "winter" },
    { id: "penguin", name: "Penguin Pal",    emoji: "🐧", cost: 168, cosy: 13, rare: true, set: "winter" },

    /* --- ⚽ Games Room --- */
    { id: "goal",    name: "Mini Goal",      emoji: "🥅", cost: 102, cosy: 9,  set: "sport" },
    { id: "hoop",    name: "Basket Hoop",    emoji: "🏀", cost: 118, cosy: 10, set: "sport" },
    { id: "chess",   name: "Chess Table",    emoji: "♟️", cost: 128, cosy: 10, study: 6, rare: true, set: "sport" },
    { id: "trophyshelf", name: "Trophy Shelf", emoji: "🏅", cost: 133, cosy: 11, set: "sport" },
    { id: "skateramp", name: "Skate Ramp",   emoji: "🛹", cost: 148, cosy: 12, set: "sport" },

    /* --- 🎨 Art Studio --- */
    { id: "sketchwall", name: "Crayon Wall", emoji: "🖍️", cost: 70,  cosy: 8,  set: "art" },
    { id: "vase",    name: "Clay Vase",      emoji: "🏺", cost: 85,  cosy: 8,  set: "art" },
    { id: "easel",   name: "Painting Easel", emoji: "🎨", cost: 102, cosy: 9,  study: 4, set: "art" },
    { id: "photowall", name: "Photo Wall",   emoji: "📷", cost: 112, cosy: 10, set: "art" },
    { id: "rainbowrug", name: "Rainbow Rug", emoji: "🌈", cost: 158, cosy: 13, rest: 3, rare: true, set: "art" }
  ];

  /* The name of each themed set, for the House tab's shelves. */
  var FURNITURE_SETS = [
    { id: "cosy",    name: "🕯️ Cosy Corner" },
    { id: "garden",  name: "🪴 Garden Room" },
    { id: "royal",   name: "👑 Royal Rooms" },
    { id: "space",   name: "🚀 Space Wing" },
    { id: "blocks",  name: "⛏️ Block Craft" },
    { id: "library", name: "📚 The Library" },
    { id: "sea",     name: "🌊 Under the Sea" },
    { id: "jungle",  name: "🌴 Jungle" },
    { id: "music",   name: "🎵 Music Room" },
    { id: "science", name: "🔬 Laboratory" },
    { id: "sweets",  name: "🍭 Sweet Shop" },
    { id: "spooky",  name: "👻 Spooky" },
    { id: "winter",  name: "❄️ Winter" },
    { id: "sport",   name: "⚽ Games Room" },
    { id: "art",     name: "🎨 Art Studio" }
  ];

  /* =========================================================
     YOUR HOUSE — thirty-seven homes, all over the map and off
     it. "slots" is how many pieces of furniture you can have
     out at once; everything else waits in storage.

     These are NOT a ladder any more. You buy any home you can
     afford, you KEEP every home you have ever bought, and you
     can move between them whenever you like — so a Craepet can
     summer in the Cloud Castle and winter in the Igloo.

     Every home also comes with its own signature wall, floor
     and view (see STYLE below). Those are yours for good once
     you own the place, and you can use them in ANY of your
     homes — which is where most of the combinations come from:
     Mars-red walls in a straw nest is a perfectly good choice.
     ========================================================= */
  var HOUSES = [
    /* --- the valley: the five homes the game started with --- */
    { id: "nest", name: "Straw Nest", emoji: "🪹", slots: 3, cost: 0, world: "The Valley",
      note: "A round nest of straw. Every Craepet starts here.",
      style: { wall: "straw", floor: "earth", view: "windowsun" } },
    { id: "burrow", name: "Snug Burrow", emoji: "🕳️", slots: 5, cost: 150, world: "The Valley",
      note: "Dug into the hillside — warm all winter.",
      style: { wall: "earthbrown", floor: "wood", view: "none" } },
    { id: "cottage", name: "Little Cottage", emoji: "🏡", slots: 8, cost: 450, world: "The Valley",
      note: "A proper door, a proper window and a proper roof.",
      style: { wall: "butter", floor: "rug", view: "garden" } },
    { id: "bighouse", name: "Big House", emoji: "🏠", slots: 12, cost: 1100, world: "The Valley",
      note: "Room for a sofa AND a piano.",
      style: { wall: "plainwhite", floor: "tile", view: "city" } },
    { id: "tower", name: "Valley Tower", emoji: "🏰", slots: 16, cost: 2500, world: "The Valley",
      note: "The tallest home in the valley. You can see the Rainbow Pool from up here.",
      style: { wall: "stone", floor: "stonefloor", view: "mountains" } },

    /* --- ponds, woods and the road --- */
    { id: "lilypad", name: "Lily Pad Perch", emoji: "🪷", slots: 4, cost: 220, world: "The Pond",
      note: "One enormous lily pad, and a frog for a neighbour.",
      style: { wall: "mint", floor: "water", view: "fireflies" } },
    { id: "mushroom", name: "Toadstool House", emoji: "🍄", slots: 7, cost: 380, world: "The Woods",
      note: "Red roof, white spots, and it grew here all by itself.",
      style: { wall: "rose", floor: "moss", view: "forest" } },
    { id: "caravan", name: "Painted Caravan", emoji: "🚐", slots: 9, cost: 620, world: "The Road",
      note: "A house with wheels. Wake up somewhere new whenever you like.",
      style: { wall: "sunset", floor: "wood", view: "mountains" } },
    { id: "treehouse", name: "Tree House", emoji: "🌳", slots: 10, cost: 700, world: "The Woods",
      note: "Up a rope ladder, forty feet above the ferns.",
      style: { wall: "forest", floor: "wood", view: "forest" } },
    { id: "windmill", name: "Old Windmill", emoji: "🌾", slots: 11, cost: 900, world: "The Valley",
      note: "The sails still turn, and the top floor is round.",
      style: { wall: "straw", floor: "wood", view: "garden" } },
    { id: "train", name: "Sleeper Train", emoji: "🚂", slots: 10, cost: 1000, world: "The Road",
      note: "Four carriages of your own, always going somewhere.",
      style: { wall: "earthbrown", floor: "carpetblue", view: "mountains" } },
    { id: "circus", name: "Circus Tent", emoji: "🎪", slots: 11, cost: 1150, world: "The Road",
      note: "Stripes, sawdust and a trapeze nobody uses.",
      style: { wall: "candy", floor: "sand", view: "balloons" } },
    { id: "pixelfort", name: "Pixel Fort", emoji: "⛏️", slots: 14, cost: 1700, world: "The Blocklands",
      note: "You built this one out of cubes, one block at a time.",
      style: { wall: "forest", floor: "blockfloor", view: "mountains" } },

    /* --- the shore and the sea --- */
    { id: "oasis", name: "Oasis Hut", emoji: "🏝️", slots: 9, cost: 780, world: "The Desert",
      note: "Three palm trees, one spring, and shade all afternoon.",
      style: { wall: "peach", floor: "sand", view: "garden" } },
    { id: "pyramid", name: "Sand Pyramid", emoji: "🏜️", slots: 10, cost: 850, world: "The Desert",
      note: "Cool inside, whatever the sun is doing.",
      style: { wall: "gold", floor: "sand", view: "stars" } },
    { id: "lighthouse", name: "Lighthouse", emoji: "🗼", slots: 12, cost: 1350, world: "The Shore",
      note: "A spiral staircase and the biggest lamp in the world.",
      style: { wall: "plainwhite", floor: "stonefloor", view: "sea" } },
    { id: "shipwreck", name: "Sunken Ship", emoji: "🚢", slots: 13, cost: 1550, world: "The Shore",
      note: "Wedged on the rocks and dry as a bone below decks.",
      style: { wall: "ocean", floor: "wood", view: "sea" } },
    { id: "pirate", name: "Pirate Cove", emoji: "🏴‍☠️", slots: 13, cost: 1600, world: "The Shore",
      note: "A cave, a jetty and absolutely no rules.",
      style: { wall: "stone", floor: "sand", view: "sea" } },
    { id: "reef", name: "Reef Dome", emoji: "🐚", slots: 15, cost: 1950, world: "Under the Sea",
      note: "A glass bubble on the sea floor. The fish look in at you.",
      style: { wall: "ocean", floor: "water", view: "underwater" } },

    /* --- ice and fire --- */
    { id: "igloo", name: "Cosy Igloo", emoji: "🧊", slots: 9, cost: 600, world: "The Frozen North",
      note: "Snow keeps the warm in. It really does.",
      style: { wall: "ice", floor: "snow", view: "aurora" } },
    { id: "icepalace", name: "Ice Palace", emoji: "⛄", slots: 18, cost: 3200, world: "The Frozen North",
      note: "Every wall is carved ice, and none of it melts.",
      style: { wall: "ice", floor: "marble", view: "aurora" } },
    { id: "temple", name: "Jungle Temple", emoji: "🛕", slots: 14, cost: 1850, world: "The Jungle",
      note: "Older than anyone can say, and the vines have moved in.",
      style: { wall: "jungle", floor: "stonefloor", view: "jungle" } },
    { id: "volcano", name: "Volcano Lodge", emoji: "🌋", slots: 15, cost: 2250, world: "The Firelands",
      note: "Built into the warm side. Central heating, forever.",
      style: { wall: "lava", floor: "lavafloor", view: "volcano" } },
    { id: "dragon", name: "Dragon Keep", emoji: "🐉", slots: 20, cost: 4600, world: "The Firelands",
      note: "The dragon moved out. It left the treasure and the perch.",
      style: { wall: "lava", floor: "goldfloor", view: "dragonview" } },

    /* --- sweet, royal and bookish --- */
    { id: "candy", name: "Candy Cottage", emoji: "🍬", slots: 12, cost: 1450, world: "Sugar Hill",
      note: "Do not lick the walls. (Everybody licks the walls.)",
      style: { wall: "candy", floor: "candyfloor", view: "rainbowview" } },
    { id: "palace", name: "Princess Palace", emoji: "👑", slots: 19, cost: 3400, world: "The Kingdom",
      note: "Ballroom, throne room, and a staircase made for a big entrance.",
      style: { wall: "royalpurple", floor: "marble", view: "castle" } },
    { id: "library", name: "The Great Library", emoji: "📚", slots: 17, cost: 3150, world: "The Kingdom",
      note: "Live in it. Every wall is books to the ceiling.",
      style: { wall: "earthbrown", floor: "carpetblue", view: "city" } },

    /* --- the sky --- */
    { id: "balloon", name: "Balloon House", emoji: "🎈", slots: 9, cost: 980, world: "The Sky",
      note: "A basket, a burner, and wherever the wind is going.",
      style: { wall: "sky", floor: "wood", view: "balloons" } },
    { id: "rainbow", name: "Rainbow Arch", emoji: "🌈", slots: 16, cost: 2650, world: "The Sky",
      note: "You live inside the rainbow. Yes, really.",
      style: { wall: "rainbowwall", floor: "rainbowfloor", view: "rainbowview" } },
    { id: "cloud", name: "Cloud Castle", emoji: "☁️", slots: 17, cost: 2850, world: "The Sky",
      note: "Soft floors, soft walls, and a very long way down.",
      style: { wall: "sky", floor: "cloudfloor", view: "balloons" } },

    /* --- underground --- */
    { id: "crystal", name: "Crystal Cave", emoji: "💎", slots: 16, cost: 3050, world: "Deep Down",
      note: "It glows on its own. You will never need a lamp.",
      style: { wall: "galaxy", floor: "glass", view: "fireflies" } },

    /* --- space, ending on Mars --- */
    { id: "observatory", name: "Star Observatory", emoji: "🔭", slots: 15, cost: 2450, world: "The Sky",
      note: "The roof opens. That is the whole point of it.",
      style: { wall: "night", floor: "marble", view: "stars" } },
    { id: "rocketship", name: "Rocket Ship", emoji: "🚀", slots: 12, cost: 2050, world: "Space",
      note: "Small, loud, and pointed at the stars.",
      style: { wall: "stone", floor: "metal", view: "planets" } },
    { id: "moonbase", name: "Moon Base", emoji: "🌙", slots: 18, cost: 3650, world: "Space",
      note: "Grey dust outside, warm light inside, Earth in the window.",
      style: { wall: "plainwhite", floor: "metal", view: "earthrise" } },
    { id: "station", name: "Space Station", emoji: "🛰️", slots: 20, cost: 4300, world: "Space",
      note: "Round and round the Earth, sixteen sunrises a day.",
      style: { wall: "stone", floor: "metal", view: "earthrise" } },
    { id: "marscastle", name: "Mars Castle", emoji: "🪐", slots: 22, cost: 5200, world: "Space",
      note: "A real castle, with real towers, on the red planet. " +
            "Two little moons cross the sky every night.",
      style: { wall: "mars", floor: "regolith", view: "marsview" } },
    { id: "starring", name: "The Star Ring", emoji: "💫", slots: 24, cost: 8000, world: "Space",
      note: "A ring of glass around a quiet star. Nobody has a bigger home than this.",
      style: { wall: "galaxy", floor: "starfloor", view: "galaxyview" } }
  ];

  /* =========================================================
     STYLE — walls, floors and the view out of the window.
     These are the cheap, endless part of customising a house:
     any wall goes with any floor goes with any view goes with
     any home, so there are hundreds of thousands of rooms in
     here even before you put a stick of furniture out.
     Bought once, kept for ever, and usable in every home you own.
     ========================================================= */
  var WALLS = [
    { id: "straw",      name: "Straw & Sun",   emoji: "🌾", cost: 0,   a: "#ffe9c9", b: "#fff6e8" },
    { id: "plainwhite", name: "Fresh White",   emoji: "⬜", cost: 0,   a: "#f2f0fb", b: "#ffffff" },
    { id: "sky",        name: "Sky Blue",      emoji: "🩵", cost: 0,   a: "#cdeeff", b: "#ecf9ff" },
    { id: "rose",       name: "Rose Pink",     emoji: "🌸", cost: 60,  a: "#ffd6ec", b: "#fff0f8" },
    { id: "mint",       name: "Mint Green",    emoji: "🌿", cost: 60,  a: "#d3f6e3", b: "#eefff6" },
    { id: "butter",     name: "Butter Yellow", emoji: "🧈", cost: 60,  a: "#fff0bf", b: "#fffbe6" },
    { id: "lilac",      name: "Lilac",         emoji: "💜", cost: 75,  a: "#e6dcff", b: "#f7f2ff" },
    { id: "peach",      name: "Peach",         emoji: "🍑", cost: 75,  a: "#ffe0cc", b: "#fff4ec" },
    { id: "earthbrown", name: "Warm Cocoa",    emoji: "🤎", cost: 90,  a: "#e7d3bd", b: "#f7ece0" },
    { id: "stone",      name: "Grey Stone",    emoji: "🪨", cost: 90,  a: "#dfe3ea", b: "#f2f5f9" },
    { id: "forest",     name: "Deep Forest",   emoji: "🌲", cost: 120, a: "#b9dcb5", b: "#e2f4de" },
    { id: "ocean",      name: "Ocean Blue",    emoji: "🌊", cost: 120, a: "#a8dcf0", b: "#dff3fb" },
    { id: "sunset",     name: "Sunset",        emoji: "🌇", cost: 150, a: "#ffc9a8", b: "#ffe6cf" },
    { id: "candy",      name: "Candy Stripe",  emoji: "🍬", cost: 180, a: "#ffd4e8", b: "#ffeef6" },
    { id: "ice",        name: "Ice Blue",      emoji: "🧊", cost: 180, a: "#d6f0ff", b: "#f0fbff" },
    { id: "lava",       name: "Lava Glow",     emoji: "🌋", cost: 190, a: "#ffb3a0", b: "#ffdcd2" },
    { id: "jungle",     name: "Jungle Leaf",   emoji: "🍃", cost: 200, a: "#bfe9b0", b: "#e7fadd" },
    { id: "royalpurple", name: "Royal Purple", emoji: "👑", cost: 240, a: "#d9c2ff", b: "#efe6ff" },
    { id: "gold",       name: "Gold Leaf",     emoji: "🏅", cost: 280, a: "#ffe6a0", b: "#fff6d8" },
    { id: "night",      name: "Night Sky",     emoji: "🌌", cost: 300, a: "#2f3763", b: "#59639a" },
    { id: "mars",       name: "Martian Sky",   emoji: "🪐", cost: 320, a: "#e8bfa0", b: "#ffe3cb" },
    { id: "rainbowwall", name: "Rainbow Wash", emoji: "🌈", cost: 380, a: "#ffd1dc", b: "#d6f0ff" },
    { id: "galaxy",     name: "Galaxy Swirl",  emoji: "💫", cost: 420, a: "#3b2a63", b: "#7a5fb0" }
  ];

  var FLOORS = [
    { id: "earth",       name: "Packed Earth",  emoji: "🟫", cost: 0,   a: "#d9a86a", b: "#b98549" },
    { id: "wood",        name: "Wood Boards",   emoji: "🪵", cost: 0,   a: "#cfa06b", b: "#a97c4c" },
    { id: "grass",       name: "Green Grass",   emoji: "🌱", cost: 0,   a: "#9bd97f", b: "#5fa845" },
    { id: "rug",         name: "Soft Red Rug",  emoji: "🟥", cost: 60,  a: "#e08c8c", b: "#b95f5f" },
    { id: "tile",        name: "Chequer Tiles", emoji: "♟️", cost: 60,  a: "#dfe4ec", b: "#a9b2c4" },
    { id: "sand",        name: "Warm Sand",     emoji: "🏖️", cost: 60,  a: "#f2dcae", b: "#d4b877" },
    { id: "carpetpink",  name: "Pink Carpet",   emoji: "🩷", cost: 75,  a: "#ffb8d9", b: "#e07eb0" },
    { id: "carpetblue",  name: "Blue Carpet",   emoji: "💙", cost: 75,  a: "#a9c8f5", b: "#6d92cf" },
    { id: "stonefloor",  name: "Stone Slabs",   emoji: "🪨", cost: 90,  a: "#c3c7cf", b: "#91959e" },
    { id: "moss",        name: "Mossy Ground",  emoji: "🍀", cost: 120, a: "#8fc98a", b: "#5c9059" },
    { id: "marble",      name: "White Marble",  emoji: "🤍", cost: 120, a: "#f0f0f6", b: "#c9cad6" },
    { id: "water",       name: "Shallow Water", emoji: "💧", cost: 150, a: "#8fe4ff", b: "#4bb8e8" },
    { id: "snow",        name: "Fresh Snow",    emoji: "❄️", cost: 150, a: "#eef7ff", b: "#c3d8ea" },
    { id: "lavafloor",   name: "Cooling Lava",  emoji: "🔥", cost: 190, a: "#e8724a", b: "#a83a22" },
    { id: "cloudfloor",  name: "Cloud Floor",   emoji: "☁️", cost: 200, a: "#ffffff", b: "#dfe8ff" },
    { id: "candyfloor",  name: "Candy Floor",   emoji: "🍭", cost: 200, a: "#ffc2e0", b: "#f07fb8" },
    { id: "blockfloor",  name: "Block Tiles",   emoji: "🟩", cost: 220, a: "#7ecb6b", b: "#4d9440" },
    { id: "goldfloor",   name: "Gold Floor",    emoji: "🪙", cost: 300, a: "#ffd97a", b: "#d2a02f" },
    { id: "glass",       name: "Glass Deck",    emoji: "🔷", cost: 320, a: "#bfe6ff", b: "#7fb8dd" },
    { id: "metal",       name: "Steel Deck",    emoji: "🛠️", cost: 340, a: "#c8ccd6", b: "#8b91a0" },
    { id: "regolith",    name: "Mars Dust",     emoji: "🪐", cost: 360, a: "#d98a5f", b: "#a3552f" },
    { id: "starfloor",   name: "Star Field",    emoji: "🌠", cost: 420, a: "#2b2450", b: "#10102a" },
    { id: "rainbowfloor", name: "Rainbow Tiles", emoji: "🌈", cost: 460, a: "#ffb3c6", b: "#9bf6ff" }
  ];

  /* What you can see from the room. Each is a handful of things pinned
     high up the scene, behind the Craepet and behind the furniture. */
  var VIEWS = [
    { id: "none",       name: "Plain Walls",     emoji: "🚫", cost: 0,   deco: [] },
    { id: "windowsun",  name: "Sunny Window",    emoji: "🌤️", cost: 0,
      deco: [["🌤️", 12, 74], ["☁️", 32, 80]] },
    { id: "stars",      name: "Starry Night",    emoji: "⭐", cost: 60,
      deco: [["⭐", 10, 80], ["✨", 30, 86], ["🌙", 50, 84], ["⭐", 72, 82], ["✨", 88, 74]] },
    { id: "garden",     name: "Garden View",     emoji: "🌻", cost: 60,
      deco: [["🌻", 6, 66], ["🦋", 26, 76], ["🌼", 92, 66]] },
    { id: "rainstorm",  name: "Rainy Window",    emoji: "🌧️", cost: 75,
      deco: [["🌧️", 14, 78], ["💧", 36, 72], ["💧", 70, 78]] },
    { id: "rainbowview", name: "Rainbow Outside", emoji: "🌈", cost: 90,
      deco: [["☁️", 14, 80], ["🌈", 50, 72], ["☁️", 86, 80]] },
    { id: "mountains",  name: "Mountain View",   emoji: "🏔️", cost: 90,
      deco: [["🏔️", 14, 62], ["🦅", 50, 84], ["🏔️", 80, 62]] },
    { id: "sea",        name: "Sea View",        emoji: "⛵", cost: 110,
      deco: [["⛵", 22, 72], ["🌊", 64, 64], ["🐬", 86, 66]] },
    { id: "forest",     name: "Forest Edge",     emoji: "🌲", cost: 110,
      deco: [["🌲", 6, 62], ["🦌", 76, 60], ["🌲", 94, 62]] },
    { id: "city",       name: "Town Lights",     emoji: "🏘️", cost: 130,
      deco: [["🏘️", 12, 62], ["🌆", 50, 72], ["🏠", 86, 62]] },
    { id: "balloons",   name: "Balloon Race",    emoji: "🎈", cost: 150,
      deco: [["🎈", 18, 80], ["🎈", 44, 86], ["🎈", 76, 78]] },
    { id: "fireflies",  name: "Fireflies",       emoji: "✨", cost: 180,
      deco: [["✨", 12, 70], ["✨", 38, 82], ["✨", 64, 68], ["✨", 88, 78]] },
    { id: "aurora",     name: "Northern Lights", emoji: "🌌", cost: 180,
      deco: [["🌌", 28, 84], ["✨", 60, 86], ["❄️", 88, 72]] },
    { id: "volcano",    name: "Volcano View",    emoji: "🌋", cost: 200,
      deco: [["🌋", 18, 62], ["🌫️", 50, 84], ["🔥", 80, 66]] },
    { id: "jungle",     name: "Jungle Canopy",   emoji: "🌴", cost: 200,
      deco: [["🌴", 8, 62], ["🦜", 34, 80], ["🍃", 60, 84], ["🐒", 86, 66]] },
    { id: "underwater", name: "Under the Waves", emoji: "🐟", cost: 220,
      deco: [["🐟", 16, 74], ["🐠", 44, 84], ["🫧", 70, 70], ["🐙", 88, 62]] },
    { id: "castle",     name: "Castle on the Hill", emoji: "🏰", cost: 240,
      deco: [["☁️", 18, 82], ["🚩", 50, 76], ["🏰", 78, 64]] },
    { id: "dragonview", name: "Dragon Flight",   emoji: "🐉", cost: 300,
      deco: [["🏔️", 10, 62], ["☁️", 30, 84], ["🐉", 66, 80]] },
    { id: "planets",    name: "Planets Outside", emoji: "🪐", cost: 340,
      deco: [["🪐", 20, 80], ["✨", 40, 70], ["🌑", 58, 86], ["⭐", 82, 76]] },
    { id: "marsview",   name: "Two Moons of Mars", emoji: "🌗", cost: 380,
      deco: [["🌗", 20, 84], ["🌘", 44, 88], ["🛸", 74, 80], ["🪨", 90, 58]] },
    { id: "earthrise",  name: "Earthrise",       emoji: "🌍", cost: 420,
      deco: [["⭐", 14, 84], ["🛰️", 32, 72], ["✨", 46, 88], ["🌍", 74, 80]] },
    { id: "galaxyview", name: "The Whole Galaxy", emoji: "💫", cost: 480,
      deco: [["✨", 12, 76], ["💫", 32, 84], ["🌌", 60, 88], ["🌠", 84, 74]] }
  ];

  function byId(list, id, fallback) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return fallback === undefined ? list[0] : fallback;
  }
  function houseById(id) { return byId(HOUSES, id); }
  function wallById(id) { return byId(WALLS, id); }
  function floorById(id) { return byId(FLOORS, id); }
  function viewById(id) { return byId(VIEWS, id); }

  /* =========================================================
     THE PRIZE WHEEL — one free spin every day.
     Eight EQUAL slices, on purpose: "one slice out of eight" is
     a fraction a six-year-old can see, and the wheel says so out
     loud every time it stops.
     ========================================================= */
  var WHEEL = [
    { label: "🪙 10",  coins: 10,  colour: "#ffe08a", say: "Ten coins." },
    { label: "🪙 40",  coins: 40,  colour: "#a8e6cf", say: "Forty coins!" },
    { label: "🎁 Treat", coins: 15, colour: "#ffb3c6", treat: true, say: "A snack and fifteen coins!" },
    { label: "🪙 20",  coins: 20,  colour: "#bde0fe", say: "Twenty coins." },
    { label: "⭐ 30 XP",   coins: 10,  xp: 30, colour: "#d0bfff", say: "A big lump of experience!" },
    { label: "🪙 75",  coins: 75,  colour: "#ffd6a5", say: "Seventy five coins!" },
    { label: "🪙 15",  coins: 15,  colour: "#caffbf", say: "Fifteen coins." },
    { label: "💎 150", coins: 150, colour: "#9bf6ff", jackpot: true, say: "The jackpot! A hundred and fifty coins!" }
  ];

  /* Facts a book can teach — true, short, and worth knowing. */
  var FACTS = {
    tot:   ["Cows say moo!", "The sun is a star.", "Fish live in water.", "Bees make honey.", "Owls fly at night."],
    early: ["A baby frog is a tadpole.", "Rainbows have 7 colors.", "Spiders have 8 legs.", "Snow is frozen water.",
            "Bats sleep upside down.", "A butterfly starts as a caterpillar."],
    mid:   ["Honey never spoils — jars from ancient tombs were still edible.",
            "A group of crows is called a murder.",
            "Octopuses have three hearts and blue blood.",
            "Bananas are berries, but strawberries are not.",
            "Sharks existed before trees did.",
            "A day on Venus is longer than its year.",
            "Wombat poo is cube-shaped.",
            "Your bones are about four times stronger than concrete."],
    big:   ["The Eiffel Tower grows about 15 cm taller in summer as the iron expands.",
            "Sound cannot travel through space — there is nothing to carry the vibration.",
            "There are more trees on Earth than stars in the Milky Way.",
            "Antarctica is technically a desert: it almost never rains or snows there.",
            "Light from the Sun takes about 8 minutes and 20 seconds to reach us.",
            "The heart pumps roughly 7,500 litres of blood every single day.",
            "Venus spins backwards compared with almost every other planet.",
            "A teaspoon of neutron star would weigh about a billion tonnes."],
    grown: ["Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid.",
            "Oxford University is older than the Aztec Empire.",
            "The Fahrenheit and Celsius scales agree at exactly −40°.",
            "Norway knighted a penguin — Sir Nils Olav, colonel-in-chief of the Norwegian King's Guard.",
            "There is enough DNA in one human body to stretch from the Sun to Pluto and back — several times.",
            "The shortest war in history lasted 38 minutes (Britain vs Zanzibar, 1896).",
            "Bubble wrap was invented as textured wallpaper.",
            "Iceland has no mosquitoes at all."]
  };

  /* =========================================================
     THE SHOP — stock rotates once a day, the same for everyone
     in the family, because a seeded shuffle is deterministic.
     ========================================================= */
  function dayNumber(now) {
    var d = new Date(now || Date.now());
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  }
  function seeded(seed) {
    var s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }
  function seededPick(list, n, seed) {
    var rng = seeded(seed), a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a.slice(0, n);
  }

  /* =========================================================
     RARE FINDS — the reason to walk into somebody else's shop.

     The ordinary Market shelf never stocks a `rare` item. Instead
     four rare things turn up in the valley each day, and each one
     lands in exactly ONE person's Market. If the Mars Rock is in
     Cory's Market today, the only way Jeannie gets one is to ask
     Cory to buy it and put it on his shelf — which is the whole
     point: a family shop now sells something the Market cannot.

     Everyone's ordinary shelf is shuffled differently too, so even
     the everyday stock is worth comparing between shops.
     ========================================================= */
  var RARE_PER_DAY = 4;

  function isRare(it) { return !!(it && it.rare); }
  function notRare(it) { return !it.rare; }
  function rarePool() { return FOODS.concat(TOYS, CARE, BOOKS, FURNITURE).filter(isRare); }

  /* Who has what today: four rare items dealt out to four different
     people, the same for everyone because the shuffle is seeded.

     `players` is the list of profile ids actually being played on this
     device. Dealing a rare find to a profile nobody has ever opened
     would put it out of everybody's reach for the day, which is the
     one thing scarcity must never do. */
  function rareFinds(now, players) {
    var day = dayNumber(now);
    var ids = (players && players.length)
      ? players.slice()
      : PROFILES.map(function (p) { return p.id; });
    var picks = seededPick(rarePool(), RARE_PER_DAY, day * 31 + 17);
    var people = seededPick(ids, ids.length, day * 31 + 23);
    return picks.map(function (it, i) {
      return { item: tag(kindOf(it.id))(it), owner: people[i % people.length] };
    });
  }
  /* Just the ones on THIS player's shelf. */
  function rareFor(whoId, now, players) {
    return rareFinds(now, players).filter(function (r) { return r.owner === whoId; })
      .map(function (r) { return r.item; });
  }
  /* …and the ones they can only get by trading with the family. */
  function rareElsewhere(whoId, now, players) {
    return rareFinds(now, players).filter(function (r) { return r.owner !== whoId; });
  }

  /* A different shuffle per person, so two shops in the same house
     are not the same shop. Unknown players (a fresh profile) just
     get the valley's default shelf. */
  function whoSeed(whoId) {
    for (var i = 0; i < PROFILES.length; i++) if (PROFILES[i].id === whoId) return (i + 1) * 101;
    return 0;
  }

  /* Today's shelves: always some cheap food, plus a rotating handful of
     treats, soap, toys, books, furniture and a couple of paint brushes.
     The shelf is deliberately big — with this much stock the shop is a
     real choice ("what is this worth to me?") rather than a queue. */
  function shopStock(now, whoId) {
    var day = dayNumber(now) + whoSeed(whoId);
    var cheap = FOODS.filter(function (f) { return f.cost <= 12 && notRare(f); });
    var treats = FOODS.filter(function (f) { return f.cost > 12 && notRare(f); });
    var brushes = [];
    // the paint brushes on sale today
    var palette = (window.CPPets && window.CPPets.COLOURS) || [];
    palette.forEach(function (c) {
      if (!c.free) brushes.push({ id: "brush:" + c.id, name: c.name + " Brush", emoji: "🖌️", cost: c.cost, kind: "brush", colour: c.id, swatch: c.swatch });
    });
    return []
      .concat(seededPick(cheap, 4, day * 7 + 1).map(tag("food")))
      .concat(seededPick(treats, 4, day * 7 + 2).map(tag("food")))
      // Something to WASH with, every single day. A Craepet gets grubby on
      // its own whether you have coins or not, so the shelf must never come
      // up all pillows and tonics and no soap.
      .concat(seededPick(CARE.filter(function (c) { return c.clean && notRare(c); }), 2, day * 7 + 3).map(tag("care")))
      .concat(seededPick(CARE.filter(function (c) { return !c.clean && notRare(c); }), 2, day * 7 + 10).map(tag("care")))
      .concat(seededPick(TOYS.filter(notRare), 3, day * 7 + 4).map(tag("toy")))
      .concat(seededPick(BOOKS.filter(notRare), 2, day * 7 + 5).map(tag("book")))
      // Furniture in three price bands now that there are well over a
      // hundred pieces: something a small purse can afford, something to
      // save a day for, and something to save a week for.
      .concat(seededPick(FURNITURE.filter(function (f) { return f.cost <= 60 && notRare(f); }), 3, day * 7 + 8).map(tag("decor")))
      .concat(seededPick(FURNITURE.filter(function (f) { return f.cost > 60 && f.cost <= 150 && notRare(f); }), 3, day * 7 + 9).map(tag("decor")))
      .concat(seededPick(FURNITURE.filter(function (f) { return f.cost > 150 && notRare(f); }), 2, day * 7 + 11).map(tag("decor")))
      .concat(seededPick(brushes, 2, day * 7 + 6));
  }
  function tag(kind) { return function (it) { var c = {}; for (var k in it) c[k] = it[k]; c.kind = kind; return c; }; }

  function itemById(id) {
    var all = FOODS.concat(TOYS, CARE, BOOKS, FURNITURE);
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    if (id.indexOf("brush:") === 0 && window.CPPets) {
      var c = window.CPPets.colour(id.slice(6));
      return { id: id, name: c.name + " Brush", emoji: "🖌️", cost: c.cost || 200, kind: "brush", colour: c.id, swatch: c.swatch };
    }
    return null;
  }
  function kindOf(id) {
    if (id.indexOf("brush:") === 0) return "brush";
    if (FOODS.some(function (f) { return f.id === id; })) return "food";
    if (TOYS.some(function (f) { return f.id === id; })) return "toy";
    if (CARE.some(function (f) { return f.id === id; })) return "care";
    if (BOOKS.some(function (f) { return f.id === id; })) return "book";
    if (FURNITURE.some(function (f) { return f.id === id; })) return "decor";
    return "thing";
  }

  /* =========================================================
     DAILY QUESTS — three a day, the same three all day.
     ========================================================= */
  var QUEST_POOL = [
    { id: "farm6",   track: "farm",   goal: 6, coins: 45, text: "Harvest 6 berries at the Berry Farm" },
    { id: "farm12",  track: "farm",   goal: 12, coins: 90, text: "Harvest 12 berries at the Berry Farm" },
    { id: "well6",   track: "well",   goal: 6, coins: 45, text: "Solve 6 puzzles at the Word Well" },
    { id: "pool5",   track: "pool",   goal: 5, coins: 40, text: "Win 5 rounds at the Rainbow Pool" },
    { id: "feed2",   track: "feed",   goal: 2, coins: 30, text: "Feed your Craepet twice" },
    { id: "play3",   track: "play",   goal: 3, coins: 30, text: "Play with your Craepet 3 times" },
    { id: "wash1",   track: "wash",   goal: 1, coins: 20, text: "Give your Craepet a wash" },
    { id: "arena1",  track: "arenaWin", goal: 1, coins: 70, text: "Win a battle in the Quiz Arena" },
    { id: "streak5", track: "bestStreak", goal: 5, coins: 55, text: "Get 5 answers right in a row" },
    { id: "learn15", track: "correct", goal: 15, coins: 60, text: "Answer 15 questions correctly" },
    { id: "read1",   track: "read",   goal: 1, coins: 35, text: "Read a book to your Craepet" },
    { id: "shop1",   track: "buy",    goal: 1, coins: 25, text: "Buy something at the Market" },
    { id: "pool10",  track: "pool",   goal: 10, coins: 80, text: "Win 10 rounds at the Rainbow Pool" },
    { id: "well12",  track: "well",   goal: 12, coins: 90, text: "Solve 12 puzzles at the Word Well" },
    { id: "fix3",    track: "fixed",  goal: 3, coins: 55, text: "Put right 3 questions you had missed" },
    { id: "streak8", track: "bestStreak", goal: 8, coins: 85, text: "Get 8 answers right in a row" },
    { id: "learn30", track: "correct", goal: 30, coins: 120, text: "Answer 30 questions correctly" },
    { id: "arena2",  track: "arenaWin", goal: 2, coins: 130, text: "Win 2 battles in the Quiz Arena" },
    { id: "mixed3",  track: "subjects", goal: 3, coins: 60, text: "Learn something at the Farm, the Well AND the Pool" },
    { id: "spin1",   track: "spin",   goal: 1, coins: 25, text: "Spin the prize wheel" },
    { id: "decor1",  track: "placed", goal: 1, coins: 40, text: "Put something out in your house" },
    { id: "stock1",  track: "stocked", goal: 1, coins: 45, text: "Put something on your own shop shelf" },
    { id: "stock3",  track: "stocked", goal: 3, coins: 90, text: "Stock 3 things in your own shop" },
    { id: "decor3",  track: "placed",  goal: 3, coins: 80, text: "Put 3 things out in your house" },
    { id: "style1",  track: "styled",  goal: 1, coins: 45, text: "Change a wall, a floor or the view at home" },
    { id: "style3",  track: "styled",  goal: 3, coins: 95, text: "Redecorate your house 3 times" }
  ];
  function questsFor(now) { return seededPick(QUEST_POOL, 3, dayNumber(now) * 13 + 5); }

  /* =========================================================
     THE QUIZ ARENA — friendly rivals, not monsters.
     ========================================================= */
  var RIVALS = [
    { id: "pip",   name: "Pip",      species: "snorbit",   colour: "meadow", hp: 30,  power: 8,  coins: 40,  subject: "mixed",
      taunt: "Bet you can't beat me at counting!" },
    { id: "mossy", name: "Mossy",    species: "twiggle",   colour: "cocoa",  hp: 45,  power: 10, coins: 70,  subject: "word",
      taunt: "I have read every book in the valley." },
    { id: "splash", name: "Splash",  species: "puddlepop", colour: "sky",    hp: 60,  power: 12, coins: 100, subject: "math",
      taunt: "Numbers are my whole personality." },
    { id: "ember", name: "Ember",    species: "flarn",     colour: "berry",  hp: 80,  power: 14, coins: 150, subject: "mixed",
      taunt: "Warm up. You'll need it." },
    { id: "orbit", name: "Professor Orbit", species: "zibbit", colour: "grape", hp: 100, power: 16, coins: 220, subject: "wonder",
      taunt: "Ask me anything about the sky." },
    { id: "shade", name: "The Shade", species: "blorb",    colour: "shadow", hp: 130, power: 20, coins: 350, subject: "mixed",
      taunt: "Nobody has beaten me. Nobody." }
  ];

  /* =========================================================
     TROPHIES — quiet, permanent milestones.
     ========================================================= */
  var TROPHIES = [
    { id: "adopt",    emoji: "🥚", name: "First Friend",   note: "Adopt a Craepet" },
    { id: "correct25", emoji: "🌱", name: "Quick Study",   note: "25 right answers" },
    { id: "correct100", emoji: "🌳", name: "Deep Roots",   note: "100 right answers" },
    { id: "correct500", emoji: "🏛️", name: "Valley Scholar", note: "500 right answers" },
    { id: "streak10", emoji: "🔥", name: "On a Roll",      note: "10 right in a row" },
    { id: "streak25", emoji: "☄️", name: "Unstoppable",    note: "25 right in a row" },
    { id: "level5",   emoji: "🧣", name: "Growing Up",     note: "Reach level 5" },
    { id: "level12",  emoji: "👑", name: "Crowned",        note: "Reach level 12" },
    { id: "painted",  emoji: "🖌️", name: "Repainted",     note: "Use a paint brush" },
    { id: "rich",     emoji: "💰", name: "Well Off",       note: "Hold 500 coins at once" },
    { id: "arena3",   emoji: "🏅", name: "Arena Regular",  note: "Win 3 battles" },
    { id: "shade",    emoji: "🌑", name: "Shade Breaker",  note: "Beat The Shade" },
    { id: "reader",   emoji: "📚", name: "Bookworm",       note: "Read 5 books" },
    { id: "questor",  emoji: "📜", name: "Quest Runner",   note: "Finish 10 daily quests" },
    { id: "fixer",    emoji: "🔁", name: "Second Look",    note: "Put right 25 you had missed" },
    { id: "week",     emoji: "📅", name: "Every Day",      note: "Play 7 days in a row" },
    { id: "palette",  emoji: "🌈", name: "Full Palette",   note: "Own every paint brush" },
    { id: "level20",  emoji: "🌟", name: "Fully Grown",    note: "Reach level 20" },
    { id: "homeowner", emoji: "🏡", name: "Homeowner",    note: "Move to a bigger house" },
    { id: "decorator", emoji: "🛋️", name: "Decorator",   note: "Have 8 things out at home" },
    { id: "tower",    emoji: "🏰", name: "Tower Keeper",  note: "Buy the Valley Tower" },
    { id: "shopkeep", emoji: "🏬", name: "Shopkeeper",    note: "Open your own shop" },
    { id: "trader",   emoji: "🤝", name: "Fair Trader",   note: "Sell 10 things to the family" },
    { id: "spinner",  emoji: "🎡", name: "Wheel Watcher", note: "Spin the wheel 10 days" },
    { id: "jackpot",  emoji: "💎", name: "Jackpot!",      note: "Land the wheel on the diamond" },
    { id: "stylist",  emoji: "🎨", name: "Interior Designer", note: "Own 6 walls, floors or views" },
    { id: "estate",   emoji: "🏘️", name: "Property Empire", note: "Own 5 different homes" },
    { id: "collector", emoji: "🛋️", name: "Furniture Hoard", note: "Own 30 pieces of furniture" },
    { id: "martian",  emoji: "🪐", name: "Martian",       note: "Live in the Mars Castle" },
    { id: "rarehunt", emoji: "🌟", name: "Treasure Hunter", note: "Buy a rare find" },
    { id: "starlord", emoji: "💫", name: "Ring Keeper",   note: "Buy the Star Ring" }
  ];

  /* Names on offer for the kids who can't type yet. */
  var PET_NAMES = [
    "Pip", "Nibbles", "Sprout", "Waffles", "Bramble", "Sunny", "Pickle", "Mochi",
    "Pebble", "Twix", "Bluebell", "Marmalade", "Fig", "Otto", "Willow", "Puff",
    "Comet", "Biscuit", "Juniper", "Nutmeg", "Peaches", "Rusty", "Cricket", "Dumpling"
  ];

  /* Little things the pet says. Kept short so a new reader can manage. */
  var MOODS = {
    great:  ["I feel amazing!", "Best day ever!", "Let's learn something!", "I love it here."],
    good:   ["I'm doing okay!", "What's next?", "Nice to see you.", "Ready when you are."],
    hungry: ["My tummy is rumbling…", "Got any berries?", "I could eat a whole pie.", "Snack? Please?"],
    bored:  ["I'm a bit bored…", "Can we play?", "Let's do something!", "Where's my ball?"],
    tired:  ["I'm sleepy…", "Just five more minutes.", "*yawn*", "So… tired…"],
    dirty:  ["I'm all mucky.", "I need a wash!", "There's jam in my fur.", "Bath time?"]
  };


  return {
    PROFILES: PROFILES,
    TIERS: TIERS,
    FOODS: FOODS,
    TOYS: TOYS,
    CARE: CARE,
    BOOKS: BOOKS,
    FURNITURE: FURNITURE,
    FURNITURE_SETS: FURNITURE_SETS,
    HOUSES: HOUSES,
    WALLS: WALLS,
    FLOORS: FLOORS,
    VIEWS: VIEWS,
    WHEEL: WHEEL,
    FACTS: FACTS,
    RIVALS: RIVALS,
    TROPHIES: TROPHIES,
    PET_NAMES: PET_NAMES,
    MOODS: MOODS,
    QUEST_POOL: QUEST_POOL,

    ask: ask,
    reshuffle: reshuffle,
    shopStock: shopStock,
    rareFinds: rareFinds,
    rareFor: rareFor,
    rareElsewhere: rareElsewhere,
    questsFor: questsFor,
    itemById: itemById,
    kindOf: kindOf,
    houseById: houseById,
    wallById: wallById,
    floorById: floorById,
    viewById: viewById,
    dayNumber: dayNumber,
    fact: function (tier) { return pick(FACTS[tier] || FACTS.mid); },
    profile: function (id) {
      for (var i = 0; i < PROFILES.length; i++) if (PROFILES[i].id === id) return PROFILES[i];
      return PROFILES[PROFILES.length - 1];
    },

    _MATH: MATH, _WORD: WORD, _WONDER: WONDER,
    _u: { rnd: rnd, pick: pick, range: range, shuffle: shuffle, mk: mk, nearMiss: nearMiss, emojiRun: emojiRun }
  };
})();
