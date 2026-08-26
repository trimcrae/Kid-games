#!/usr/bin/env node
/* ===========================================================
   Rock Detective — science & data check.
     node games/rock-detective/validate.js

   Walks every specimen and every generated quiz question and
   asserts the data is complete, internally consistent and
   actually playable. Run this after touching rocks.js.
   =========================================================== */
"use strict";
const D = require("./rocks.js");

let fails = 0, checks = 0;
function ok(cond, msg) {
  checks++;
  if (!cond) { fails++; console.log("  ✗ " + msg); }
}

const TYPES = ["Igneous", "Sedimentary", "Metamorphic", "Mineral"];
const ROCKS = D.ROCKS;

// Build the clue vocabulary straight from the UI groups, so a tag can
// never exist that the player has no way to tap.
const single = {}, multi = new Set(), groupOf = {};
D.GROUPS.forEach(g => {
  g.clues.forEach(c => {
    groupOf[c.key] = g.id;
    if (g.single) (single[g.id] = single[g.id] || []).push(c.key);
    else multi.add(c.key);
  });
});
const SINGLE_GROUPS = Object.keys(single);
const ALL_KEYS = new Set(Object.keys(groupOf));

console.log("Rock Detective — checking " + ROCKS.length + " specimens\n");

/* ---------- 1. every specimen is complete & well formed ---------- */
const seen = new Set();
ROCKS.forEach(r => {
  const at = "[" + r.name + "] ";
  ok(typeof r.name === "string" && r.name.length > 1, at + "has a name");
  ok(!seen.has(r.name), at + "is not a duplicate specimen");
  seen.add(r.name);
  ok(TYPES.indexOf(r.type) >= 0, at + "type '" + r.type + "' is a real family");
  ok(typeof r.mohs === "number" && r.mohs >= 1 && r.mohs <= 10,
    at + "Mohs hardness " + r.mohs + " is between 1 and 10");
  ["fact", "forms", "more", "lustre", "breaks", "pattern", "c1", "c2"].forEach(f =>
    ok(typeof r[f] === "string" && r[f].length > 2, at + "has a " + f));
  ok(/^#[0-9a-f]{6}$/i.test(r.c1) && /^#[0-9a-f]{6}$/i.test(r.c2), at + "colours are hex");
  ok(Array.isArray(r.k) && r.k.length >= 5, at + "has at least 5 clue tags");
  r.k.forEach(k => ok(ALL_KEYS.has(k), at + "clue '" + k + "' exists in the clue list"));
  ok(new Set(r.k).size === r.k.length, at + "has no repeated clue tags");
});

/* ---------- 2. exactly one answer per single-choice group ---------- */
ROCKS.forEach(r => {
  SINGLE_GROUPS.forEach(gid => {
    const hits = r.k.filter(k => single[gid].indexOf(k) >= 0);
    ok(hits.length === 1,
      "[" + r.name + "] has exactly one '" + gid + "' clue (found " + hits.length + ": " + hits + ")");
  });
});

/* ---------- 3. no property contradicts another ---------- */
ROCKS.forEach(r => {
  const at = "[" + r.name + "] ";
  ok(r.band === D.bandOf(r.mohs), at + "hardness band matches its Mohs number");
  ok(r.k.indexOf(r.band) >= 0,
    at + "clue tag agrees with hardness " + r.mohs + " (needs " + r.band + ")");
  ok(r.fizz === (r.k.indexOf("t-fizz") >= 0), at + "fizz flag matches its clue");
  ok(r.magnetic === (r.k.indexOf("t-magnet") >= 0), at + "magnet flag matches its clue");
  ok(r.floats === (r.k.indexOf("t-float") >= 0), at + "float flag matches its clue");
  // streak is a MINERAL test: rocks must say so, minerals must have a colour
  if (r.type === "Mineral") {
    ok(typeof r.streak === "string" && r.streak.length > 2, at + "mineral has a streak colour");
    ok(r.k.indexOf("s-rock") < 0, at + "mineral is not tagged 'it's a rock'");
  } else {
    ok(r.streak === null, at + "rock has no streak colour (streak tests minerals)");
    ok(r.k.indexOf("s-rock") >= 0, at + "rock is tagged 's-rock'");
  }
  // streak clue must match the written streak colour
  const wantStreak = r.type !== "Mineral" ? "s-rock"
    : /red/i.test(r.streak) ? "s-red"
      : /yellow/i.test(r.streak) ? "s-yellow"
        : /(black|grey|gray)/i.test(r.streak) ? "s-dark" : "s-white";
  ok(r.k.indexOf(wantStreak) >= 0, at + "streak clue matches '" + r.streak + "' (needs " + wantStreak + ")");
  // can't be both heavy and light, or both fizz-free calcite etc.
  ok(!(r.k.indexOf("t-heavy") >= 0 && r.k.indexOf("t-light") >= 0), at + "isn't both heavy and light");
  ok(!(r.k.indexOf("t-round") >= 0 && r.k.indexOf("t-angular") >= 0), at + "isn't both rounded and angular");
  ok(!(r.k.indexOf("t-sharp") >= 0 && r.k.indexOf("t-splits") >= 0),
    at + "doesn't both fracture conchoidally and cleave into sheets");
  ok(!(r.k.indexOf("g-none") >= 0 && r.k.indexOf("t-speckled") >= 0),
    at + "isn't both too fine to see AND visibly speckled");
  // only metamorphic rocks have a parent rock
  if (r.parent) {
    ok(r.type === "Metamorphic", at + "only metamorphic rocks have a parent rock");
    r.parent.forEach(p => ok(!!D.BY_NAME[p], at + "parent '" + p + "' is in the collection"));
  }
  if (r.type === "Metamorphic") ok(!!r.parent, at + "metamorphic rock names its parent");
  // anything that floats must be light, anything magnetic is a rock/mineral we drew dark
  if (r.floats) ok(r.k.indexOf("t-light") >= 0, at + "floats, so it must also be light");
});

/* ---------- 4. known Mohs anchors are right ---------- */
const MOHS_SCALE = { Talc: 1, Gypsum: 2, Calcite: 3, Fluorite: 4, Apatite: 5,
  Feldspar: 6, Quartz: 7, Topaz: 8, Corundum: 9, Diamond: 10 };
Object.keys(MOHS_SCALE).forEach(n => {
  const r = D.BY_NAME[n];
  ok(!!r, "Mohs scale mineral " + n + " is in the collection");
  if (r) ok(r.mohs === MOHS_SCALE[n], n + " is exactly " + MOHS_SCALE[n] + " on the Mohs scale");
});
// the calcite family fizzes and nothing else does
const shouldFizz = ["Limestone", "Chalk", "Marble", "Calcite"];
ROCKS.forEach(r => ok(r.fizz === (shouldFizz.indexOf(r.name) >= 0),
  "[" + r.name + "] fizz-in-acid is " + (shouldFizz.indexOf(r.name) >= 0)));
ok(ROCKS.filter(r => r.magnetic).map(r => r.name).join() === "Magnetite", "only magnetite is magnetic");
ok(ROCKS.filter(r => r.floats).map(r => r.name).join() === "Pumice", "only pumice floats");

/* ---------- 5. every specimen is actually solvable in Detective ---------- */
// A specimen is unfindable if some OTHER specimen matches every clue it has.
ROCKS.forEach(a => {
  const shadow = ROCKS.filter(b => b !== a && a.k.every(k => b.k.indexOf(k) >= 0));
  ok(shadow.length === 0,
    "[" + a.name + "] can be narrowed down to exactly one suspect" +
    (shadow.length ? " (hidden behind " + shadow.map(s => s.name).join(", ") + ")" : ""));
});

/* ---------- 6. look-alike sets point at real specimens ---------- */
D.LOOKALIKES.forEach(set => {
  ok(set.names.length >= 3, "look-alike set '" + set.title + "' has 3+ specimens");
  ok(new Set(set.names).size === set.names.length, "look-alike set '" + set.title + "' has no repeats");
  set.names.forEach(n => ok(!!D.BY_NAME[n], "look-alike '" + n + "' is in the collection"));
});
ROCKS.forEach(r => ok(D.LOOKALIKES.some(s => s.names.indexOf(r.name) >= 0),
  "[" + r.name + "] appears in at least one look-alike set (so the Lab can use it)"));

/* ---------- 7. quiz questions: exactly one correct answer ---------- */
let rngState = 12345;
const rng = () => { rngState = (rngState * 1103515245 + 12345) % 2147483648; return rngState / 2147483648; };
const kinds = {};
D.TIERS.forEach(t => {
  for (let i = 0; i < 900; i++) {
    const q = D.makeQuestion(t.id, rng);
    kinds[q.kind] = (kinds[q.kind] || 0) + 1;
    const at = "[" + t.id + "/" + q.kind + "] ";
    ok(typeof q.prompt === "string" && q.prompt.length > 5, at + "has a prompt");
    const wantOpts = q.kind === "family" ? 4 : t.opts;
    ok(q.options.length === wantOpts, at + "has " + wantOpts + " options");
    const right = q.options.filter(o => o.correct);
    ok(right.length === 1, at + "has exactly ONE correct answer (found " + right.length + ")");
    const labels = q.options.map(o => o.text);
    ok(new Set(labels).size === labels.length, at + "has no duplicate options: " + labels.join(" / "));
    ok(right.length === 1 && right[0].text.indexOf(q.answerText) >= 0,
      at + "answerText matches the correct option");
    // a wrong answer must produce a real explanation
    const wrong = q.options.find(o => !o.correct);
    const why = q.explainFor(wrong);
    ok(typeof why === "string" && why.length > 25, at + "explains a wrong answer (" + (why || "").slice(0, 30) + ")");
    if (q.showRock) ok(!!q.rock, at + "has a specimen to draw");
  }
});
console.log("  question kinds generated: " + JSON.stringify(kinds));

/* ---------- 8. the lab tests all answer honestly ---------- */
ROCKS.forEach(r => {
  D.LAB_TESTS.forEach(t => {
    const res = D.runTest(r, t.key);
    ok(typeof res === "string" && res.length > 5, "[" + r.name + "] lab test " + t.key + " gives a result");
  });
  ok(/scratches it/.test(D.runTest(r, "file")) === (r.mohs < 6.5),
    "[" + r.name + "] steel file result matches Mohs " + r.mohs);
  ok(/FIZZES/.test(D.runTest(r, "vinegar")) === r.fizz, "[" + r.name + "] vinegar result matches fizz");
  ok(/sticks/.test(D.runTest(r, "magnet")) === r.magnetic, "[" + r.name + "] magnet result matches");
  ok(/floats/.test(D.runTest(r, "water")) === r.floats, "[" + r.name + "] water result matches");
});

/* ---------- 9. explanations exist for every look-alike pair ------- */
D.LOOKALIKES.forEach(set => {
  set.names.forEach(a => set.names.forEach(b => {
    if (a === b) return;
    const why = D.explainDiff(D.BY_NAME[a], D.BY_NAME[b]);
    ok(why.length > 25, "explains " + a + " vs " + b);
  }));
});

/* ---------- report ---------- */
const byType = {};
ROCKS.forEach(r => { byType[r.type] = (byType[r.type] || 0) + 1; });
console.log("\n  " + Object.keys(byType).map(t => t + ": " + byType[t]).join("   "));
console.log("\n" + (fails ? "✗ " + fails + " problem(s) out of " + checks + " checks"
  : "✓ all " + checks + " checks passed"));
process.exit(fails ? 1 : 0);
