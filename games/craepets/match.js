/* ===========================================================
   Craepets — MEMORY MATCH, the second game in the games room.
   -----------------------------------------------------------
   Cards face down; turn two over; keep the pairs. The twist is
   that a pair is never two of the same picture (past the Tiny
   level): it is a sum and its answer, an animal and its baby,
   a word and one that means the same, a word and its opposite,
   a fraction and its percentage. So every pair you keep is a
   fact you matched — and the sheet at the end lists them all.

       CPMatch.deal(tier, D, L) -> { rule, pairs: [[cardA, cardB]…] }
   A card is { t: "text" } or { emoji: "🐶" } or { colour: "#…" }.
   =========================================================== */
window.CPMatch = (function () {
  "use strict";

  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function take(list, n) { return shuffle(list).slice(0, n); }

  var ANIMALS = ["🐶", "🐱", "🐸", "🦆", "🐷", "🐮", "🐰", "🦁", "🐝", "🐢", "🦊", "🐧"];
  var FRACTIONS = [["1/2", "50%"], ["1/4", "25%"], ["3/4", "75%"], ["1/10", "10%"], ["1/5", "20%"], ["2/5", "40%"], ["3/10", "30%"], ["1/3", "33%"], ["9/10", "90%"], ["3/5", "60%"]];
  var ROOTS = [["√4", "2"], ["√9", "3"], ["√16", "4"], ["√25", "5"], ["√36", "6"], ["√49", "7"], ["√64", "8"], ["√81", "9"], ["√100", "10"], ["√121", "11"], ["√144", "12"]];
  var CAPITALS = [["France", "Paris"], ["Italy", "Rome"], ["Japan", "Tokyo"], ["Spain", "Madrid"], ["Egypt", "Cairo"], ["Kenya", "Nairobi"], ["Canada", "Ottawa"], ["Peru", "Lima"], ["Greece", "Athens"], ["Norway", "Oslo"], ["Australia", "Canberra"], ["Mexico", "Mexico City"]];

  function sums(n, lo, hi) {
    var seen = {}, out = [];
    while (out.length < n) {
      var a = lo + rnd(hi - lo + 1), b = lo + rnd(hi - lo + 1);
      if (seen[a + b]) continue;
      seen[a + b] = true;
      out.push([{ t: a + " + " + b }, { t: String(a + b) }]);
    }
    return out;
  }
  function products(n, lo, hi) {
    var seen = {}, out = [];
    while (out.length < n) {
      var a = lo + rnd(hi - lo + 1), b = lo + rnd(hi - lo + 1);
      if (seen[a * b]) continue;
      seen[a * b] = true;
      out.push([{ t: a + " × " + b }, { t: String(a * b) }]);
    }
    return out;
  }
  function wordPairs(list, n) {
    return take(list, n).map(function (p) { return [{ t: p[0] }, { t: p[1] }]; });
  }

  /* One theme per game, so every pair on the table follows the same
     rule. The rule is what the game teaches. */
  function themes(tier, D, L) {
    var P = (D && D.PAIRS) || {};
    var B = (L && L.BABIES) || [];
    var SND = (L && L.ANIMAL_SOUNDS) || [];
    var PAINTS = (L && L.PAINTS) || [];
    if (tier === "tot") {
      return [{ rule: "Find the two that are the same!", n: 4, make: function (n) {
        return take(ANIMALS, n).map(function (e) { return [{ emoji: e }, { emoji: e }]; });
      } }];
    }
    if (tier === "early") {
      return [
        { rule: "Find the two that are the same!", n: 6, make: function (n) {
          return take(ANIMALS, n).map(function (e) { return [{ emoji: e }, { emoji: e }]; }); } },
        { rule: "Match each animal to the sound it makes!", n: 5, make: function (n) {
          return take(SND, n).map(function (p) { return [{ emoji: p[0] }, { t: p[1] }]; }); } },
        { rule: "Match each colour to something that colour!", n: 5, make: function (n) {
          return take(PAINTS, n).map(function (p) { return [{ colour: p[1] }, { emoji: p[2] }]; }); } }
      ];
    }
    if (tier === "mid") {
      return [
        { rule: "Match each sum to its answer!", n: 6, make: function (n) { return sums(n, 3, 30); } },
        { rule: "Match each times table to its answer!", n: 6, make: function (n) { return products(n, 2, 9); } },
        { rule: "Match each animal to its baby!", n: 6, make: function (n) { return wordPairs(B, n); } },
        { rule: "Match each word to one that means the SAME!", n: 6, make: function (n) { return wordPairs(P.synMid || [], n); } }
      ];
    }
    if (tier === "big") {
      return [
        { rule: "Match each word to one that means the SAME!", n: 8, make: function (n) { return wordPairs(P.synBig || [], n); } },
        { rule: "Match each word to its OPPOSITE!", n: 8, make: function (n) { return wordPairs(P.antBig || [], n); } },
        { rule: "Match each fraction to its percentage!", n: 8, make: function (n) { return wordPairs(FRACTIONS, n); } },
        { rule: "Match each times table to its answer!", n: 8, make: function (n) { return products(n, 3, 12); } },
        { rule: "Match each country to its capital!", n: 8, make: function (n) { return wordPairs(CAPITALS, n); } }
      ];
    }
    return [
      { rule: "Match each word to its meaning!", n: 8, make: function (n) { return wordPairs(P.vocabGrown || [], n); } },
      { rule: "Match each word to its OPPOSITE!", n: 8, make: function (n) { return wordPairs(P.antBig || [], n); } },
      { rule: "Match each square root to its answer!", n: 8, make: function (n) { return wordPairs(ROOTS, n); } },
      { rule: "Match each product to its answer!", n: 8, make: function (n) { return products(n, 6, 15); } },
      { rule: "Match each country to its capital!", n: 8, make: function (n) { return wordPairs(CAPITALS, n); } }
    ];
  }

  function deal(tier, D, L) {
    var list = themes(tier, D, L).filter(function (t) { return t.make(t.n).length >= Math.min(t.n, 4); });
    var th = pick(list);
    var pairs = th.make(th.n);
    // lay the cards out: each card remembers which pair it belongs to
    var cards = [];
    pairs.forEach(function (p, i) {
      cards.push({ pair: i, side: 0, face: p[0] });
      cards.push({ pair: i, side: 1, face: p[1] });
    });
    return { rule: th.rule, pairs: pairs, cards: shuffle(cards) };
  }

  return { deal: deal, themes: themes };
})();
