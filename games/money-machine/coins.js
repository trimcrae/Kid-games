/* ===========================================================
   🪙 Coin School — the US-money learning ladder inside
   💰 Money Machine.
   -----------------------------------------------------------
   Currency: UNITED STATES. Every amount in this file is an
   INTEGER NUMBER OF CENTS. Nothing is ever a float, so
   0.1 + 0.2 can never bite us.  40 means 40¢. 250 means $2.50.

   The ladder (each level unlocks the next):
     1  Meet the coins ....... recognise a coin by name & value
     2  Count the same ....... skip-count one kind of coin
     3  Mixed coins .......... add different coins together
     4  Make the amount ...... build a target out of coins
     5  Fewest coins ......... build it the smartest way
     6  Give change .......... work out and build change
     7  Shop smart ........... budgeting word problems (Cory)
     8  The register ......... dollars, cents & bills (Shannon)

   The pure maths lives above the DOM code and is exported as
   global.MoneyMath so a plain node script can check every
   single round it can ever generate.
   =========================================================== */

(function (global) {
  "use strict";

  /* ---------------------------------------------------------
     THE MONEY ITSELF
     px = on-screen size. The real coins are 17.9mm (dime),
     19.1 (penny), 21.2 (nickel), 24.3 (quarter), 26.5 (dollar),
     30.6 (half) — so the dime really IS the smallest, which is
     a genuinely useful thing for a 3-year-old to notice.
     Every size is >= 44px so small fingers can hit it.
  --------------------------------------------------------- */
  var COINS = [
    { id: "penny",   name: "Penny",       plural: "pennies",      value: 1,   px: 50, metal: "copper", reeded: false, face: "1¢",  sub: "PENNY"   },
    { id: "nickel",  name: "Nickel",      plural: "nickels",      value: 5,   px: 58, metal: "silver", reeded: false, face: "5¢",  sub: "NICKEL"  },
    { id: "dime",    name: "Dime",        plural: "dimes",        value: 10,  px: 46, metal: "silver", reeded: true,  face: "10¢", sub: "DIME"    },
    { id: "quarter", name: "Quarter",     plural: "quarters",     value: 25,  px: 66, metal: "silver", reeded: true,  face: "25¢", sub: "QUARTER" },
    { id: "half",    name: "Half dollar", plural: "half dollars", value: 50,  px: 78, metal: "silver", reeded: true,  face: "50¢", sub: "HALF"    },
    { id: "dollar",  name: "Dollar coin", plural: "dollar coins", value: 100, px: 70, metal: "gold",   reeded: true,  face: "$1",  sub: "DOLLAR"  }
  ];

  var BILLS = [
    { id: "b1",  name: "One dollar bill",    plural: "one dollar bills",    value: 100,  bill: true, face: "$1"  },
    { id: "b5",  name: "Five dollar bill",   plural: "five dollar bills",   value: 500,  bill: true, face: "$5"  },
    { id: "b10", name: "Ten dollar bill",    plural: "ten dollar bills",    value: 1000, bill: true, face: "$10" },
    { id: "b20", name: "Twenty dollar bill", plural: "twenty dollar bills", value: 2000, bill: true, face: "$20" }
  ];

  var PIECES = COINS.concat(BILLS);
  var BY_ID = {};
  PIECES.forEach(function (p) { BY_ID[p.id] = p; });

  var SMALL_COINS = ["penny", "nickel", "dime", "quarter"];          // Ellie / early
  var ALL_COINS   = ["penny", "nickel", "dime", "quarter", "half", "dollar"];
  var REGISTER    = ["penny", "nickel", "dime", "quarter", "half", "b1", "b5", "b10", "b20"];

  function piece(id) { return BY_ID[id]; }

  /* ---------------------------------------------------------
     FORMATTING — integer cents in, human text out
  --------------------------------------------------------- */
  function pad2(n) { return n < 10 ? "0" + n : "" + n; }

  /** 40 -> "40¢",  250 -> "$2.50" */
  function centsText(c) {
    c = Math.round(c);
    if (c < 100) return c + "¢";
    return "$" + Math.floor(c / 100) + "." + pad2(c % 100);
  }
  /** Always dollars-and-cents: 40 -> "$0.40" */
  function dollarText(c) {
    c = Math.round(c);
    return "$" + Math.floor(c / 100) + "." + pad2(c % 100);
  }

  function plural(p, n) { return n === 1 ? p.name.toLowerCase() : p.plural; }

  /** ["dime","dime","nickel"] -> [{piece, n}] sorted biggest first */
  function group(ids) {
    var counts = {};
    ids.forEach(function (id) { counts[id] = (counts[id] || 0) + 1; });
    return PIECES
      .filter(function (p) { return counts[p.id]; })
      .sort(function (a, b) { return b.value - a.value; })
      .map(function (p) { return { piece: p, n: counts[p.id] }; });
  }

  function sum(ids) {
    return ids.reduce(function (t, id) { return t + piece(id).value; }, 0);
  }

  /** "3 dimes, 2 nickels and 1 penny" */
  function phrase(ids) {
    var parts = group(ids).map(function (g) { return g.n + " " + plural(g.piece, g.n); });
    if (parts.length === 0) return "nothing";
    if (parts.length === 1) return parts[0];
    return parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1];
  }

  /** "30 + 10 + 1 = 41¢" — the working, written out */
  function sumSentence(ids) {
    var gs = group(ids);
    var bits = gs.map(function (g) { return g.n * g.piece.value; });
    var total = sum(ids);
    if (bits.length <= 1) return total + "¢";
    return bits.join(" + ") + " = " + total + "¢";
  }

  /** "5, 10, 15, 20, 25" — skip counting out loud */
  function skipCount(p, n) {
    var out = [];
    for (var i = 1; i <= n; i++) out.push(p.value * i);
    return out.join(", ");
  }

  /* ---------------------------------------------------------
     FEWEST PIECES — greedy. Greedy is provably optimal for the
     US set (1,5,10,25,50,100,...) and the maths test proves it
     against a dynamic-programme for every amount it can ask.
  --------------------------------------------------------- */
  function fewest(cents, allowed) {
    var denoms = (allowed || ALL_COINS)
      .map(piece)
      .sort(function (a, b) { return b.value - a.value; });
    var left = cents, out = [];
    denoms.forEach(function (p) {
      while (left >= p.value) { out.push(p.id); left -= p.value; }
    });
    if (left !== 0) return null;           // cannot be made at all
    return out;
  }

  /* ---------------------------------------------------------
     TINY RANDOM HELPERS (rng is injectable so tests can seed)
  --------------------------------------------------------- */
  function ri(rng, lo, hi) { return lo + Math.floor(rng() * (hi - lo + 1)); }
  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function shuffle(rng, arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /** Build 4 choice buttons: the answer plus unique wrong ones. */
  function choiceSet(rng, answer, wrongs, fmt, howMany) {
    howMany = howMany || 4;
    var seen = {}, out = [answer];
    seen[answer] = true;
    shuffle(rng, wrongs).forEach(function (w) {
      if (out.length < howMany && !seen[w] && w >= 0) { seen[w] = true; out.push(w); }
    });
    // top up with near misses if we ran short
    var step = 1;
    while (out.length < howMany) {
      var cand = answer + (out.length % 2 ? step : -step) * 5;
      if (cand > 0 && !seen[cand]) { seen[cand] = true; out.push(cand); }
      step++;
      if (step > 40) break;
    }
    return shuffle(rng, out).map(function (v) {
      return { value: v, label: fmt(v) };
    });
  }

  /* ---------------------------------------------------------
     THE SHOP — used by word problems and the register
  --------------------------------------------------------- */
  var SHOP = [
    { emoji: "🎈", name: "balloon",    price: 15  },
    { emoji: "⭐", name: "sticker",    price: 20  },
    { emoji: "🍬", name: "gumball",    price: 25  },
    { emoji: "✏️", name: "pencil",     price: 35  },
    { emoji: "🍪", name: "cookie",     price: 45  },
    { emoji: "🍎", name: "apple",      price: 60  },
    { emoji: "🧃", name: "juice box",  price: 75  },
    { emoji: "🪀", name: "yo-yo",      price: 120 },
    { emoji: "🧦", name: "funny socks",price: 150 },
    { emoji: "📗", name: "comic book", price: 250 }
  ];
  var BIG_SHOP = [
    { emoji: "🥛", name: "milk",       price: 189 },
    { emoji: "🍞", name: "bread",      price: 235 },
    { emoji: "🧀", name: "cheese",     price: 349 },
    { emoji: "🍓", name: "berries",    price: 425 },
    { emoji: "☕", name: "coffee",     price: 715 },
    { emoji: "🧴", name: "shampoo",    price: 555 },
    { emoji: "🍫", name: "chocolate",  price: 165 },
    { emoji: "🥑", name: "avocado",    price: 129 }
  ];

  /* =========================================================
     THE LEVELS
     Every make() returns a round:
       kind      "choice" | "build"
       prompt    text for the kid
       show      coin ids laid out on the stage (may be [])
       showItems shop items to show (may be undefined)
       choices   [{value,label}]           (kind === "choice")
       answer    the right value           (kind === "choice")
       target    cents to build            (kind === "build")
       palette   piece ids you may tap     (kind === "build")
       needFewest true if it must be the smallest pile
       check(a)  -> true/false
       explain(a)-> HTML string showing the working
       teach     one-line takeaway shown when right
     ========================================================= */

  function rightHTML(msg) { return '<b class="fx-yes">' + msg + "</b>"; }

  /* ---- 1. Meet the coins ---------------------------------- */
  function makeName(rng) {
    var pool = SMALL_COINS.slice();
    if (rng() < 0.25) pool = pool.concat(["half", "dollar"]);
    var answer = piece(pick(rng, pool));
    var style = rng() < 0.5 ? "which" : "what";

    if (style === "what") {
      // Show one coin, choose its name.
      var others = shuffle(rng, ALL_COINS.filter(function (id) { return id !== answer.id; })).slice(0, 3);
      var opts = shuffle(rng, [answer.id].concat(others));
      return {
        kind: "choice",
        prompt: "What coin is this?",
        show: [answer.id],
        big: true,
        choices: opts.map(function (id) {
          return { value: id, label: piece(id).name + " · " + piece(id).face };
        }),
        answer: answer.id,
        teach: "Yes! A " + answer.name.toLowerCase() + " is worth " + answer.value + "¢.",
        check: function (a) { return a === answer.id; },
        explain: function (a) {
          var g = a ? piece(a) : null;
          return "This one is a <b>" + answer.name.toLowerCase() + "</b> — it is worth <b>" +
            centsText(answer.value) + "</b>." +
            (g && g.id !== answer.id
              ? " A " + g.name.toLowerCase() + " is worth " + centsText(g.value) + "."
              : "");
        }
      };
    }
    // Show four coins, pick the one worth N.
    var choicesIds = shuffle(rng, ALL_COINS).slice(0, 4);
    if (choicesIds.indexOf(answer.id) === -1) choicesIds[0] = answer.id;
    choicesIds = shuffle(rng, choicesIds);
    return {
      kind: "choice",
      prompt: "Which coin is worth " + centsText(answer.value) + "?",
      show: [],
      choices: choicesIds.map(function (id) {
        return { value: id, label: piece(id).name, coin: id };
      }),
      answer: answer.id,
      teach: "That's the " + answer.name.toLowerCase() + " — " + centsText(answer.value) + ".",
      check: function (a) { return a === answer.id; },
      explain: function (a) {
        var g = a ? piece(a) : null;
        return "The coin worth " + centsText(answer.value) + " is the <b>" + answer.name.toLowerCase() +
          "</b>." + (g && g.id !== answer.id
            ? " You picked the " + g.name.toLowerCase() + ", which is " + centsText(g.value) + "."
            : "");
      }
    };
  }

  /* ---- 2. Count the same coins ---------------------------- */
  function makeSame(rng) {
    var p = piece(pick(rng, SMALL_COINS));
    var n = p.value === 1 ? ri(rng, 3, 9) : ri(rng, 2, 6);
    var ids = [];
    for (var i = 0; i < n; i++) ids.push(p.id);
    var total = p.value * n;
    var wrongs = [n, total + p.value, total - p.value, total + 1, n * (p.value + 1)];
    return {
      kind: "choice",
      prompt: "How much money is this?",
      show: ids,
      choices: choiceSet(rng, total, wrongs, centsText),
      answer: total,
      teach: "Count by " + p.value + "s: " + skipCount(p, n) + ".",
      check: function (a) { return a === total; },
      explain: function (a) {
        return "You had <b>" + n + " " + plural(p, n) + "</b>. Count by " + p.value + "s: " +
          skipCount(p, n) + " — that's <b>" + centsText(total) + "</b>" +
          (a != null && a !== total ? ", not " + centsText(a) : "") + ".";
      }
    };
  }

  /* ---- 3. Mixed coins ------------------------------------- */
  function makeMixed(rng, hard) {
    var pool = hard ? ALL_COINS : SMALL_COINS;
    var kinds = shuffle(rng, pool).slice(0, ri(rng, 2, 3));
    var ids = [], total = 0, guard = 0;
    kinds.forEach(function (id) {
      var p = piece(id);
      var n = ri(rng, 1, p.value >= 25 ? 2 : 3);
      for (var i = 0; i < n; i++) { ids.push(id); total += p.value; }
    });
    // keep it countable: under a dollar for the easy tier
    while (!hard && total > 99 && guard++ < 30) {
      var biggest = group(ids)[0].piece.id;
      ids.splice(ids.indexOf(biggest), 1);
      total = sum(ids);
    }
    if (ids.length < 2) { ids.push("penny"); total = sum(ids); }

    var gs = group(ids);
    var countedByOnes = ids.length;
    var missedOne = total - gs[0].piece.value;
    var wrongs = [countedByOnes, missedOne, total + 5, total - 5, total + 10];
    return {
      kind: "choice",
      prompt: "Add up all the coins. How much is it?",
      show: shuffle(rng, ids),
      choices: choiceSet(rng, total, wrongs, centsText),
      answer: total,
      teach: sumSentence(ids),
      check: function (a) { return a === total; },
      explain: function (a) {
        return "You had <b>" + phrase(ids) + "</b> — that's " + sumSentence(ids) +
          (a != null && a !== total ? ", not " + centsText(a) : "") +
          ". Start with the biggest coin and count on.";
      }
    };
  }

  /* ---- 4. Make the amount --------------------------------- */
  function makeBuild(rng) {
    var target = rng() < 0.6 ? ri(rng, 2, 19) * 5 : ri(rng, 6, 96);
    return {
      kind: "build",
      prompt: "Make " + centsText(target) + " with coins.",
      show: [],
      target: target,
      palette: SMALL_COINS,
      needFewest: false,
      teach: "Any pile that adds to " + centsText(target) + " is right!",
      check: function (ids) { return sum(ids) === target; },
      explain: function (ids) {
        var got = sum(ids);
        var best = fewest(target, SMALL_COINS);
        if (got === target) return "";
        var gap = Math.abs(target - got);
        return "Your coins are <b>" + phrase(ids) + "</b> = " + (ids.length ? sumSentence(ids) : "0¢") +
          ". You need " + centsText(target) + ", so you are <b>" +
          centsText(gap) + " " + (got < target ? "short" : "over") + "</b>. " +
          "One way that works: " + phrase(best) + ".";
      }
    };
  }

  /* ---- 5. Fewest coins ------------------------------------ */
  function makeFewest(rng) {
    var target, best, tries = 0;
    do {
      target = ri(rng, 6, 99);
      best = fewest(target, ALL_COINS);
      tries++;
    } while (best.length < 2 && tries < 50);
    return {
      kind: "build",
      prompt: "Make " + centsText(target) + " using the FEWEST coins you can.",
      show: [],
      target: target,
      palette: ALL_COINS,
      needFewest: true,
      fewestCount: best.length,
      teach: "The smartest pile is " + best.length + " coins: " + phrase(best) + ".",
      check: function (ids) { return sum(ids) === target && ids.length === best.length; },
      explain: function (ids) {
        var got = sum(ids);
        if (got !== target) {
          return "Your coins are " + (ids.length ? sumSentence(ids) : "0¢") + ", but we need <b>" +
            centsText(target) + "</b>. The fewest way is <b>" + best.length + " coins</b>: " +
            phrase(best) + ".";
        }
        return "That's " + centsText(target) + " — correct! But it took <b>" + ids.length +
          " coins</b> (" + phrase(ids) + "). The fewest way is <b>" + best.length + " coins</b>: " +
          phrase(best) + ". Always grab the biggest coin that still fits.";
      }
    };
  }

  /* ---- 6. Give change ------------------------------------- */
  function makeChange(rng) {
    var item = pick(rng, SHOP.filter(function (s) { return s.price <= 95; }));
    var paid = pick(rng, [100, 100, 100, 50, 25].filter(function (v) { return v > item.price; }));
    if (!paid) paid = 100;
    var change = paid - item.price;
    var best = fewest(change, ALL_COINS);
    return {
      kind: "build",
      prompt: "The " + item.name + " costs " + centsText(item.price) + ". You pay with " +
              centsText(paid) + ". Build the change!",
      showItems: [item],
      show: [],
      target: change,
      palette: ALL_COINS,
      needFewest: false,
      fewestCount: best.length,
      cost: item.price,
      paid: paid,
      teach: centsText(paid) + " − " + centsText(item.price) + " = " + centsText(change) + " change.",
      check: function (ids) { return sum(ids) === change; },
      explain: function (ids) {
        var got = sum(ids);
        return "The " + item.name + " costs " + centsText(item.price) + " and you paid " +
          centsText(paid) + ", so the change is <b>" + paid + " − " + item.price + " = " +
          centsText(change) + "</b>. You built " + (ids.length ? phrase(ids) + " = " + centsText(got) : "nothing") +
          " — " + (got < change ? centsText(change - got) + " too little" : got > change ? centsText(got - change) + " too much" : "spot on") +
          ". The fewest-coin way is " + phrase(best) + ".";
      }
    };
  }

  /* ---- 7. Shop smart (word problems, Cory) ---------------- */
  function makeWord(rng) {
    var kind = ri(rng, 1, 5);

    if (kind === 1) {                       // how much is left?
      var two = shuffle(rng, SHOP).slice(0, 2);
      var cost = two[0].price + two[1].price;
      var have = cost + ri(rng, 1, 12) * 5;
      var left = have - cost;
      return {
        kind: "choice",
        prompt: "You have " + centsText(have) + ". You buy a " + two[0].name + " (" +
                centsText(two[0].price) + ") and a " + two[1].name + " (" + centsText(two[1].price) +
                "). How much is left?",
        showItems: two,
        show: [],
        choices: choiceSet(rng, left, [have - two[0].price, cost, left + 10, left - 5], centsText),
        answer: left,
        teach: two[0].price + " + " + two[1].price + " = " + cost + ", and " + have + " − " + cost + " = " + left + "¢.",
        check: function (a) { return a === left; },
        explain: function (a) {
          return "First add what you spend: <b>" + two[0].price + " + " + two[1].price + " = " +
            cost + "¢</b>. Then take that off your money: <b>" + have + " − " + cost + " = " +
            centsText(left) + "</b>" + (a != null && a !== left ? ", not " + centsText(a) : "") + ".";
        }
      };
    }

    if (kind === 2) {                       // how much MORE do you need?
      var it = pick(rng, SHOP.filter(function (s) { return s.price >= 45; }));
      var coins = [];
      var need = ri(rng, 2, 4);
      for (var i = 0; i < need; i++) coins.push(pick(rng, ["quarter", "dime", "nickel"]));
      var have2 = sum(coins);
      if (have2 >= it.price) { coins = ["dime", "nickel"]; have2 = 15; }
      var short = it.price - have2;
      return {
        kind: "choice",
        prompt: "The " + it.name + " costs " + centsText(it.price) + ". How much MORE do you need?",
        showItems: [it],
        show: coins,
        choices: choiceSet(rng, short, [it.price + have2, have2, short + 5, short - 5], centsText),
        answer: short,
        teach: it.price + " − " + have2 + " = " + short + "¢ more.",
        check: function (a) { return a === short; },
        explain: function (a) {
          return "You are holding " + phrase(coins) + " = <b>" + sumSentence(coins) +
            "</b>. Take that off the price: <b>" + it.price + " − " + have2 + " = " +
            centsText(short) + "</b> more" + (a != null && a !== short ? ", not " + centsText(a) : "") + ".";
        }
      };
    }

    if (kind === 3) {                       // how many can you buy?
      var it3 = pick(rng, SHOP.filter(function (s) { return s.price <= 75; }));
      var have3 = ri(rng, 2, 9) * 25 + ri(rng, 0, 3) * 5;
      var many = Math.floor(have3 / it3.price);
      if (many < 1) { have3 = it3.price * 2 + 10; many = 2; }
      var over = many + 1;
      return {
        kind: "choice",
        prompt: it3.name.charAt(0).toUpperCase() + it3.name.slice(1) + "s cost " + centsText(it3.price) +
                " each. You have " + centsText(have3) + ". How many can you buy?",
        showItems: [it3],
        show: [],
        choices: choiceSet(rng, many, [over, Math.max(0, many - 1), many + 2], function (v) { return v + ""; }),
        answer: many,
        teach: many + " × " + it3.price + " = " + (many * it3.price) + "¢, and " + over + " would cost " + (over * it3.price) + "¢.",
        check: function (a) { return a === many; },
        explain: function (a) {
          return "<b>" + many + " × " + it3.price + "¢ = " + (many * it3.price) + "¢</b>, which you can pay. " +
            "<b>" + over + " × " + it3.price + "¢ = " + (over * it3.price) + "¢</b> is more than " +
            centsText(have3) + ", so the answer is <b>" + many + "</b>" +
            (a != null && a !== many ? ", not " + a : "") + ". (You'd have " +
            centsText(have3 - many * it3.price) + " left over.)";
        }
      };
    }

    if (kind === 4) {                       // better deal
      var itm = pick(rng, SHOP.filter(function (s) { return s.price <= 60 && s.price >= 20; }));
      var packN = ri(rng, 2, 4);
      var single = itm.price;
      var packPrice = single * packN - ri(rng, 1, 4) * 5;
      if (packPrice <= 0) packPrice = single;
      var singles = single * packN;
      var save = singles - packPrice;
      return {
        kind: "choice",
        prompt: "One " + itm.name + " is " + centsText(single) + ". A pack of " + packN + " is " +
                centsText(packPrice) + ". How much do you SAVE by buying the pack?",
        showItems: [itm],
        show: [],
        choices: choiceSet(rng, save, [packPrice, singles, save + 5, save + 10], centsText),
        answer: save,
        teach: packN + " × " + single + " = " + singles + "¢, and " + singles + " − " + packPrice + " = " + save + "¢ saved.",
        check: function (a) { return a === save; },
        explain: function (a) {
          return "Buying them one at a time: <b>" + packN + " × " + single + " = " + singles +
            "¢</b>. The pack is only " + centsText(packPrice) + ". So you save <b>" + singles +
            " − " + packPrice + " = " + centsText(save) + "</b>" +
            (a != null && a !== save ? ", not " + centsText(a) : "") + ".";
        }
      };
    }

    // kind === 5: saving up over weeks
    var goal = pick(rng, SHOP.filter(function (s) { return s.price >= 100; }));
    var week = pick(rng, [10, 20, 25, 50]);
    var weeks = Math.ceil(goal.price / week);
    return {
      kind: "choice",
      prompt: "You save " + centsText(week) + " every week. The " + goal.name + " costs " +
              centsText(goal.price) + ". How many weeks until you can buy it?",
      showItems: [goal],
      show: [],
      choices: choiceSet(rng, weeks, [weeks - 1, weeks + 1, weeks + 2, Math.floor(goal.price / week)],
                         function (v) { return v + " weeks"; }),
      answer: weeks,
      teach: weeks + " × " + week + " = " + (weeks * week) + "¢, enough for " + centsText(goal.price) + ".",
      check: function (a) { return a === weeks; },
      explain: function (a) {
        return "After " + (weeks - 1) + " weeks you have <b>" + centsText((weeks - 1) * week) +
          "</b> — still not enough. After <b>" + weeks + " weeks</b> you have <b>" +
          centsText(weeks * week) + "</b>, which covers " + centsText(goal.price) + "." +
          (a != null && a !== weeks ? " (You said " + a + ".)" : "");
      }
    };
  }

  /* ---- 8. The register (grown-up tier, Shannon) ----------- */
  function makeRegister(rng) {
    var n = ri(rng, 2, 3);
    var items = shuffle(rng, BIG_SHOP).slice(0, n);
    var total = items.reduce(function (t, i) { return t + i.price; }, 0);
    var bill = BILLS.filter(function (b) { return b.value > total; })[0] || BILLS[BILLS.length - 1];
    // sometimes they hand over the next bill up — more interesting change
    if (rng() < 0.35) {
      var up = BILLS.filter(function (b) { return b.value > bill.value; })[0];
      if (up) bill = up;
    }
    var change = bill.value - total;
    var best = fewest(change, REGISTER);
    var lines = items.map(function (i) { return i.emoji + " " + i.name + " " + dollarText(i.price); }).join(", ");
    return {
      kind: "build",
      prompt: "Register: " + lines + ". The customer pays with a " + bill.face +
              " bill. Give the change — the FEWEST bills and coins.",
      showItems: items,
      show: [],
      target: change,
      palette: REGISTER,
      needFewest: true,
      fewestCount: best.length,
      dollars: true,
      teach: dollarText(total) + " total → " + bill.face + " − " + dollarText(total) + " = " +
             dollarText(change) + " in " + best.length + " pieces.",
      check: function (ids) { return sum(ids) === change && ids.length === best.length; },
      explain: function (ids) {
        var got = sum(ids);
        var adds = items.map(function (i) { return dollarText(i.price); }).join(" + ");
        var head = "Total: <b>" + adds + " = " + dollarText(total) + "</b>. Change: <b>" +
          bill.face + " − " + dollarText(total) + " = " + dollarText(change) + "</b>. ";
        if (got !== change) {
          return head + "You gave " + (ids.length ? phrase(ids) + " = " + dollarText(got) : "nothing") +
            " — " + dollarText(Math.abs(change - got)) + " " + (got < change ? "short" : "too much") +
            ". Fewest way (" + best.length + " pieces): " + phrase(best) + ".";
        }
        return head + "The amount is right, but that's <b>" + ids.length + " pieces</b>. The fewest is <b>" +
          best.length + "</b>: " + phrase(best) + ".";
      }
    };
  }

  var LEVELS = [
    { id: "name",     emoji: "🪙", name: "Meet the coins", who: "Ellie",  pay: 5,
      blurb: "Know each coin by name and value", make: makeName },
    { id: "same",     emoji: "🔢", name: "Count the same", who: "Ellie",  pay: 5,
      blurb: "Skip-count one kind of coin", make: makeSame },
    { id: "mixed",    emoji: "🎨", name: "Mixed coins",    who: "Jeannie",pay: 10,
      blurb: "Add different coins together", make: function (r) { return makeMixed(r, false); } },
    { id: "make",     emoji: "🛠️", name: "Make the amount", who: "Jeannie", pay: 10,
      blurb: "Build a target amount out of coins", make: makeBuild },
    { id: "fewest",   emoji: "⚡", name: "Fewest coins",   who: "Cory",   pay: 15,
      blurb: "Build it the smartest way", make: makeFewest },
    { id: "change",   emoji: "🧾", name: "Give change",    who: "Cory",   pay: 15,
      blurb: "Work out change and hand it over", make: makeChange },
    { id: "word",     emoji: "🛒", name: "Shop smart",     who: "Cory",   pay: 20,
      blurb: "Budget word problems", make: makeWord },
    { id: "register", emoji: "👩", name: "The register",   who: "Grown-ups", pay: 30,
      blurb: "Dollars, cents and bills — grown-up tier", make: makeRegister }
  ];

  function makeRound(levelIndex, rng) {
    rng = rng || Math.random;
    var lv = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, levelIndex))];
    var r = lv.make(rng);
    r.level = lv.id;
    r.levelIndex = LEVELS.indexOf(lv);
    return r;
  }

  global.MoneyMath = {
    COINS: COINS, BILLS: BILLS, PIECES: PIECES, LEVELS: LEVELS,
    SMALL_COINS: SMALL_COINS, ALL_COINS: ALL_COINS, REGISTER: REGISTER,
    piece: piece, sum: sum, group: group, phrase: phrase, fewest: fewest,
    centsText: centsText, dollarText: dollarText, sumSentence: sumSentence,
    makeRound: makeRound, SHOP: SHOP, BIG_SHOP: BIG_SHOP
  };

  /* ---------------------------------------------------------
     Everything below is the browser UI. In node (no document)
     we stop here so the maths can be tested on its own.
  --------------------------------------------------------- */
  if (typeof document === "undefined") return;

  var $ = function (id) { return document.getElementById(id); };

  var SAVE = "money-machine-coins";
  var TABKEY = "money-machine-tab";

  var WISHES = [
    { emoji: "⭐", name: "Shiny sticker",  price: 100  },
    { emoji: "🍦", name: "Ice cream cone", price: 300  },
    { emoji: "🪀", name: "Yo-yo",          price: 700  },
    { emoji: "📗", name: "Comic book",     price: 1500 },
    { emoji: "🎮", name: "Video game",     price: 4000 },
    { emoji: "🚲", name: "A bike",         price: 12000 }
  ];

  var S = {
    v: 2,
    level: 0,
    unlocked: 1,
    piggy: 0,
    streak: 0,
    best: 0,
    right: {},     // levelId -> correct answers ever
    wish: 0
  };

  function loadState() {
    try {
      var raw = JSON.parse(localStorage.getItem(SAVE));
      if (raw && typeof raw === "object") {
        ["level", "unlocked", "piggy", "streak", "best", "wish"].forEach(function (k) {
          if (typeof raw[k] === "number" && isFinite(raw[k])) S[k] = raw[k];
        });
        if (raw.right && typeof raw.right === "object") S.right = raw.right;
      }
    } catch (e) { /* first run */ }
    S.unlocked = Math.max(1, Math.min(LEVELS.length, S.unlocked));
    S.level = Math.max(0, Math.min(S.unlocked - 1, S.level));
    S.wish = Math.max(0, Math.min(WISHES.length - 1, S.wish));
    S.piggy = Math.max(0, Math.round(S.piggy));
  }
  function saveState() {
    try { localStorage.setItem(SAVE, JSON.stringify(S)); } catch (e) { /* private mode */ }
  }

  /* ---- coin drawing (pure CSS, no images) ---- */
  function coinHTML(id, scale, extraClass) {
    var p = piece(id);
    if (p.bill) {
      return '<span class="bill ' + (extraClass || "") + '" aria-hidden="true">' +
        '<span class="bill-face">' + p.face + "</span></span>";
    }
    var px = Math.round(p.px * (scale || 1));
    return '<span class="coin ' + p.metal + (p.reeded ? " reeded" : "") + " " + (extraClass || "") +
      '" style="--sz:' + px + 'px" aria-hidden="true">' +
      '<span class="cface">' + p.face + "</span>" +
      '<span class="csub">' + p.sub + "</span></span>";
  }
  function label(id, n) {
    var p = piece(id);
    if (n == null) return p.name + ", " + (p.value < 100 ? p.value + " cents" : dollarText(p.value));
    return n + " " + plural(p, n);
  }

  /* ---- current round ---- */
  var round = null;
  var tray = [];
  var answered = false;

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function drawLevels() {
    var strip = $("csLevels");
    strip.innerHTML = "";
    LEVELS.forEach(function (lv, i) {
      var locked = i >= S.unlocked;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "lvl" + (i === S.level ? " on" : "") + (locked ? " locked" : "");
      b.innerHTML = '<span class="lemoji">' + (locked ? "🔒" : lv.emoji) + "</span>" +
        '<span class="lname">' + (i + 1) + ". " + lv.name + "</span>" +
        '<span class="lwho">' + (locked ? "Locked" : lv.who) + "</span>";
      b.setAttribute("aria-label",
        "Level " + (i + 1) + ", " + lv.name + ". " + lv.blurb + ". " +
        (locked ? "Locked — get 3 right on the level before to open it." : "Tap to play."));
      b.setAttribute("aria-pressed", i === S.level ? "true" : "false");
      b.disabled = locked;
      b.addEventListener("click", function () {
        S.level = i; saveState(); drawLevels(); newRound();
      });
      strip.appendChild(b);
    });
  }

  function drawStatus() {
    var wish = WISHES[S.wish];
    $("csWishEmoji").textContent = wish.emoji;
    $("csPiggyVal").textContent = centsText(S.piggy);
    $("csPiggyGoal").textContent = "Saving for " + wish.name + " (" + centsText(wish.price) + ")";
    var pct = Math.max(0, Math.min(100, (S.piggy / wish.price) * 100));
    $("csPiggyFill").style.width = pct + "%";
    var bar = $("csPiggyBar");
    if (bar) {
      bar.setAttribute("aria-valuenow", String(S.piggy));
      bar.setAttribute("aria-valuemax", String(wish.price));
      bar.setAttribute("aria-valuetext", centsText(S.piggy) + " of " + centsText(wish.price) + " saved");
    }
    $("csStreak").textContent = S.streak;
    $("csBest").textContent = S.best;
  }

  function stageHTML(r) {
    var out = "";
    if (r.showItems && r.showItems.length) {
      out += '<div class="shop-row">' + r.showItems.map(function (i) {
        return '<span class="shop-item"><span class="semoji">' + i.emoji + "</span>" +
          '<span class="sname">' + i.name + "</span>" +
          '<span class="sprice">' + (r.dollars ? dollarText(i.price) : centsText(i.price)) + "</span></span>";
      }).join("") + "</div>";
    }
    if (r.show && r.show.length) {
      var scale = r.big ? 1.7 : (r.show.length > 8 ? 0.8 : 1);
      out += '<div class="coin-pile" role="img" aria-label="' + phrase(r.show) + ', worth ' +
        centsText(sum(r.show)) + ' altogether">' +
        r.show.map(function (id) { return coinHTML(id, scale); }).join("") + "</div>";
    }
    return out;
  }

  function newRound() {
    answered = false;
    tray = [];
    round = makeRound(S.level, Math.random);

    $("csPrompt").innerHTML = round.prompt;
    $("csStage").innerHTML = stageHTML(round);
    $("csFeedback").innerHTML = "";
    $("csFeedback").className = "cs-feedback";
    $("csNext").hidden = true;

    var ans = $("csAnswers");
    var build = $("csBuild");
    ans.innerHTML = "";

    if (round.kind === "choice") {
      build.hidden = true;
      ans.hidden = false;
      round.choices.forEach(function (c, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "choice-btn" + (c.coin ? " has-coin" : "");
        b.innerHTML = (c.coin ? coinHTML(c.coin, 0.85) : "") +
          '<span class="ctext">' + c.label + "</span>";
        b.setAttribute("aria-label", (i + 1) + ". " + (c.coin ? label(c.coin) : c.label));
        b.addEventListener("click", function () { answerChoice(c.value, b); });
        ans.appendChild(b);
      });
    } else {
      ans.hidden = true;
      build.hidden = false;
      drawPalette();
      drawTray();
      $("csCheck").disabled = false;
    }
    focusFirstAnswer();
  }

  function focusFirstAnswer() {
    // keep the keyboard user on the action, but don't steal focus on load
    var host = round.kind === "choice" ? $("csAnswers") : $("csPalette");
    if (host && document.activeElement && document.activeElement !== document.body) {
      var first = host.querySelector("button");
      if (first) first.focus();
    }
  }

  function drawPalette() {
    var pal = $("csPalette");
    pal.innerHTML = "";
    round.palette.forEach(function (id) {
      var p = piece(id);
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pal-btn";
      b.innerHTML = coinHTML(id, p.bill ? 1 : 0.8) +
        '<span class="pal-name">' + p.name + "</span>";
      b.setAttribute("aria-label", "Add a " + label(id));
      b.addEventListener("click", function () {
        if (answered) return;
        if (tray.length >= 30) return;
        tray.push(id);
        window.SFX && SFX.pop && SFX.pop();
        drawTray();
      });
      pal.appendChild(b);
    });
  }

  function drawTray() {
    var t = $("csTray");
    t.innerHTML = "";
    if (!tray.length) {
      t.appendChild(el("span", "tray-hint", "Tap coins below to drop them in →"));
    }
    tray.forEach(function (id, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tray-coin";
      b.innerHTML = coinHTML(id, piece(id).bill ? 0.9 : 0.7);
      b.setAttribute("aria-label", "Remove " + label(id));
      b.addEventListener("click", function () {
        if (answered) return;
        tray.splice(i, 1);
        drawTray();
      });
      t.appendChild(b);
    });
    var total = sum(tray);
    var fmt = round.dollars ? dollarText : centsText;
    $("csTrayTotal").textContent = fmt(total);
    var tgt = $("csTrayTarget");
    if (tgt) tgt.textContent = fmt(round.target);
    var cnt = $("csTrayCount");
    if (cnt) {
      cnt.textContent = tray.length + (tray.length === 1 ? " piece" : " pieces");
      cnt.hidden = !round.needFewest;
    }
  }

  function answerChoice(value, btn) {
    if (answered) return;
    answered = true;
    var ok = round.check(value);
    [].forEach.call($("csAnswers").children, function (b) { b.disabled = true; });
    btn.classList.add(ok ? "right" : "wrong");
    if (!ok) {
      // also light up the right one so the eye learns it
      [].forEach.call($("csAnswers").children, function (b, i) {
        if (round.choices[i].value === round.answer) b.classList.add("right");
      });
    }
    finish(ok, value);
  }

  function checkBuild() {
    if (answered) return;
    if (!tray.length) {
      say("Put some coins in the tray first! 🪙", "hint");
      return;
    }
    answered = true;
    $("csCheck").disabled = true;
    finish(round.check(tray), tray.slice());
  }

  function say(html, cls) {
    var f = $("csFeedback");
    f.className = "cs-feedback " + (cls || "");
    f.innerHTML = html;
  }

  function finish(ok, given) {
    if (ok) {
      var lv = LEVELS[S.level];
      S.streak++;
      if (S.streak > S.best) S.best = S.streak;
      var earn = lv.pay + Math.min(10, S.streak);
      S.piggy += earn;
      S.right[lv.id] = (S.right[lv.id] || 0) + 1;
      if (S.right[lv.id] >= 3 && S.unlocked < LEVELS.length && S.unlocked === S.level + 1) {
        S.unlocked++;
        setTimeout(function () {
          say('🔓 <b>New level unlocked:</b> ' + LEVELS[S.unlocked - 1].emoji + " " +
              LEVELS[S.unlocked - 1].name + "!", "good");
        }, 900);
        window.Confetti && Confetti.burst({ count: 80 });
      }
      say("✅ <b>Right!</b> " + round.teach + ' <span class="earned">+' + centsText(earn) + " to the piggy bank</span>", "good");
      window.SFX && (S.streak > 2 ? SFX.streak(S.streak) : SFX.good());

      // wish-list milestone
      var wish = WISHES[S.wish];
      if (S.piggy >= wish.price) {
        window.Confetti && Confetti.burst({ count: 120 });
        window.SFX && SFX.win && SFX.win();
        if (S.wish < WISHES.length - 1) S.wish++;
        setTimeout(function () {
          say("🎉 <b>You saved up for the " + wish.name + " " + wish.emoji + "!</b> Next goal: " +
              WISHES[S.wish].name + " (" + centsText(WISHES[S.wish].price) + ").", "good");
        }, 1400);
      }
    } else {
      S.streak = 0;
      say("🤔 <b>Not quite.</b> " + round.explain(given), "bad");
      window.SFX && SFX.nope && SFX.nope();
    }
    saveState();
    drawStatus();
    drawLevels();
    var nb = $("csNext");
    nb.hidden = false;
    nb.focus();
  }

  function drawRef() {
    var box = $("csRef");
    if (!box) return;
    box.innerHTML =
      '<div class="ref-row">' + COINS.map(function (c) {
        return '<span class="ref-coin"><span role="img" aria-label="' + label(c.id) + '">' +
          coinHTML(c.id, 0.85) + "</span><b>" + c.name + "</b><small>" + centsText(c.value) + "</small></span>";
      }).join("") + "</div>" +
      "<p><b>Handy swaps:</b> 5 pennies = 1 nickel · 2 nickels = 1 dime · " +
      "5 nickels = 1 quarter · 2 dimes + 1 nickel = 1 quarter · 4 quarters = $1.00</p>" +
      "<p><b>Watch out:</b> the dime is the <i>smallest</i> coin but it is worth more than " +
      "a penny <i>and</i> a nickel. Size does not tell you value — the number does.</p>";
  }

  /* ---- tabs ---- */
  function showTab(which) {
    var isCoins = which !== "machine";
    $("panelCoins").hidden = !isCoins;
    $("panelMachine").hidden = isCoins;
    $("tabCoins").setAttribute("aria-selected", isCoins ? "true" : "false");
    $("tabMachine").setAttribute("aria-selected", isCoins ? "false" : "true");
    $("tabCoins").classList.toggle("on", isCoins);
    $("tabMachine").classList.toggle("on", !isCoins);
    try { localStorage.setItem(TABKEY, isCoins ? "coins" : "machine"); } catch (e) {}
    if (!isCoins && global.MoneyMachine && global.MoneyMachine.refresh) global.MoneyMachine.refresh();
  }

  /* ---- keyboard: 1-4 answers, Enter checks / next ---- */
  document.addEventListener("keydown", function (e) {
    if ($("panelCoins").hidden) return;
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea") return;
    if (e.key >= "1" && e.key <= "9" && round && round.kind === "choice" && !answered) {
      var i = +e.key - 1;
      var b = $("csAnswers").children[i];
      if (b) { b.click(); e.preventDefault(); }
    } else if (e.key === "Enter" && answered) {
      $("csNext").click(); e.preventDefault();
    } else if (e.key === "Enter" && round && round.kind === "build" && !answered) {
      if (document.activeElement === document.body) { checkBuild(); e.preventDefault(); }
    }
  });

  function init() {
    loadState();
    drawLevels();
    drawStatus();
    drawRef();
    newRound();

    $("csCheck").addEventListener("click", checkBuild);
    $("csClear").addEventListener("click", function () {
      if (answered) return;
      tray = []; drawTray();
    });
    $("csNext").addEventListener("click", newRound);
    $("csSkip").addEventListener("click", function () { S.streak = 0; saveState(); drawStatus(); newRound(); });
    $("tabCoins").addEventListener("click", function () { showTab("coins"); });
    $("tabMachine").addEventListener("click", function () { showTab("machine"); });

    var want = "coins";
    try { want = localStorage.getItem(TABKEY) || "coins"; } catch (e) {}
    showTab(want);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.CoinSchool = {
    state: function () { return S; },
    round: function () { return round; },
    tray: function () { return tray; }
  };

})(typeof window !== "undefined" ? window : globalThis);
