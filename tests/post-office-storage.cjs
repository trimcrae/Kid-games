#!/usr/bin/env node
"use strict";
// Exercise the production storage/normalization block with actual Node/V8.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "../games/post-office/post-office.js"), "utf8");
const block = source.slice(source.indexOf("  var KEY"), source.indexOf("  /* ---------- helpers ---------- */"));
const profiles = ["jeannie", "cory", "ellie", "kieran", "shannon", "tristan"];
const letter = (id = "letter", extra = {}) => ({
  id, from: "cory", to: "ellie", paper: "plain", stamp: "owl",
  greeting: "Dear", closing: "Love,", body: "A real letter ❤️", sentAt: 1000, readAt: null, ...extra,
});
const draft = (body, owner) => ({
  to: profiles.filter(id => id !== owner), body, paper: "hearts", stamp: "cat", greeting: "Hi", closing: "From,",
});
function harness(raw, options = {}) {
  const values = new Map(Object.entries(options.values || {}));
  if (raw !== undefined) values.set("post-office.v1", raw);
  const writes = [], messages = [];
  const storage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem(key, value) {
      if (options.fail && options.fail(key)) throw new Error("Storage is full");
      writes.push(key); values.set(key, value);
    },
  };
  const api = new Function("localStorage", "toast", block +
    "\nreturn { get state(){return state}, load, save, normalizeState, get pending(){return pendingRecovery} };")(storage, message => messages.push(message));
  return { api, values, writes, messages };
}
let checks = 0;
function check(name, fn) { fn(); checks++; console.log("PASS " + name); }
check("normal saves and key ordering do not create recovery copies", () => {
  const raw = JSON.stringify({ last: "ellie", drafts: { ellie: draft("Hello", "ellie") }, letters: [letter()] });
  const h = harness(raw);
  assert.equal(h.api.pending, null); assert.deepEqual(h.writes, []);
  assert.equal(h.api.save(), true);
  assert.deepEqual(h.writes, ["post-office.v1"]);
  assert.equal(h.values.has("post-office.recovery.v1"), false);
});
check("all six drafts and valid family mail survive mixed damage without read-time writes", () => {
  const drafts = Object.fromEntries(profiles.map(id => [id, draft("Draft for " + id, id)]));
  const raw = JSON.stringify({ letters: [null, 4, [], false, letter(), letter("second", { from: "dad", to: "jeannie" })], drafts, last: "dad" });
  const h = harness(raw);
  assert.equal(h.api.state.letters.length, 2); assert.equal(h.api.state.letters[1].from, "tristan");
  for (const id of profiles) assert.equal(h.api.state.drafts[id].body, "Draft for " + id);
  assert.equal(h.api.state.last, "tristan"); assert.deepEqual(h.writes, []);
  assert.equal(h.api.save(), true);
  assert.equal(JSON.parse(h.values.get("post-office.recovery.v1"))[0].raw, raw);
});
const invalidLetters = [
  null, [], "broken", 5, true,
  ...["id", "from", "to", "body", "sentAt"].map(key => { const row = letter(); delete row[key]; return row; }),
  ...["", 4, null, {}].map(id => letter("x", { id })),
  ...["toString", "constructor", "__proto__", "unknown", 4, null].map(from => letter("x", { from })),
  ...["toString", "constructor", "__proto__", "unknown", 4, null].map(to => letter("x", { to })),
  ...[0, -1, "1000", null, {}, 8640000000000001].map(sentAt => letter("x", { sentAt })),
  ...[4, null, [], {}].map(body => letter("x", { body })),
];
for (const [index, bad] of invalidLetters.entries()) check("invalid letter " + index + " cannot hide a valid sibling", () => {
  const raw = JSON.stringify({ letters: [bad, letter("good")], drafts: {}, last: null });
  const h = harness(raw); assert.equal(h.api.state.letters.length, 1);
  assert.equal(h.api.state.letters[0].id, "good"); assert.equal(h.api.state.letters[0].body, "A real letter ❤️");
});
for (const id of profiles) check("malformed draft repair preserves " + id + " text and isolates recipients", () => {
  const raw = JSON.stringify({ letters: [], drafts: { [id]: { body: "Keep all this text\n❤️", to: [id, "dad", "dad", "toString", null], paper: {}, stamp: 4 } }, last: id });
  const h = harness(raw), d = h.api.state.drafts[id];
  assert.equal(d.body, "Keep all this text\n❤️");
  assert.deepEqual(d.to, id === "tristan" ? [] : ["tristan"]);
  assert.equal(d.paper, "plain"); assert.equal(d.stamp, "unicorn");
});
check("bad draft body cannot reach trim and valid siblings survive", () => {
  for (const body of [4, {}, [], null, true]) {
    const h = harness(JSON.stringify({ letters: [], drafts: { ellie: { body, to: ["cory"] }, cory: draft("Keep Cory", "cory") }, last: null }));
    assert.equal(h.api.state.drafts.ellie.body.trim(), ""); assert.equal(h.api.state.drafts.cory.body, "Keep Cory");
  }
});
check("old Dad draft migration uses only own known IDs", () => {
  const h = harness('{"letters":[],"drafts":{"dad":{"to":["ellie"],"body":"Dad saved this"},"tristan":[]},"last":"dad"}');
  assert.equal(h.api.state.drafts.tristan.body, "Dad saved this");
  for (const last of ["toString", "constructor", "__proto__"]) assert.equal(h.api.normalizeState({ letters: [], drafts: {}, last }).last, null);
});
for (const raw of ["{broken", "null", "[]", "45", '"broken"']) check("unusable snapshot stays intact until protected repair: " + raw, () => {
  const h = harness(raw); assert.deepEqual(h.writes, []); assert.equal(h.api.load(), null);
  assert.equal(h.api.save(), true); assert.equal(JSON.parse(h.values.get("post-office.recovery.v1"))[0].raw, raw);
});
check("backup quota failure refuses original overwrite and warns", () => {
  const raw = '{"letters":[null],"drafts":{},"last":null}';
  const h = harness(raw, { fail: key => key === "post-office.recovery.v1" });
  assert.equal(h.api.save(), false); assert.equal(h.api.save(), false);
  assert.equal(h.values.get("post-office.v1"), raw); assert.deepEqual(h.writes, []);
  assert.equal(h.messages.length, 1);
});
check("mailbag quota failure retains the already captured damaged bytes", () => {
  const raw = '{"letters":[null],"drafts":{},"last":null}';
  const h = harness(raw, { fail: key => key === "post-office.v1" });
  assert.equal(h.api.save(), false); assert.equal(h.values.get("post-office.v1"), raw);
  assert.equal(JSON.parse(h.values.get("post-office.recovery.v1"))[0].raw, raw);
});
check("distinct recovery copies are append-only, deduplicated and bounded", () => {
  const raw = '{"letters":[null],"drafts":{},"last":null}';
  const old = { savedAt: 1, raw: "Earlier damaged mail" };
  const h = harness(raw, { values: { "post-office.recovery.v1": JSON.stringify([old]) } });
  assert.equal(h.api.save(), true);
  const copies = JSON.parse(h.values.get("post-office.recovery.v1"));
  assert.deepEqual(copies[0], old); assert.equal(copies[1].raw, raw);
  h.values.set("post-office.v1", raw); h.api.load(); h.api.save();
  assert.equal(JSON.parse(h.values.get("post-office.recovery.v1")).length, 2);
  const full = Array.from({ length: 8 }, (_, i) => ({ savedAt: i + 1, raw: "copy " + i }));
  const f = harness(raw, { values: { "post-office.recovery.v1": JSON.stringify(full) } });
  assert.equal(f.api.save(), false); assert.equal(f.values.get("post-office.v1"), raw);
  assert.deepEqual(JSON.parse(f.values.get("post-office.recovery.v1")), full);
});
check("damaged recovery storage is never overwritten", () => {
  for (const recovery of ["{bad", "{}", "[null]"]) {
    const raw = '{"letters":[null],"drafts":{},"last":null}';
    const h = harness(raw, { values: { "post-office.recovery.v1": recovery } });
    assert.equal(h.api.save(), false); assert.equal(h.values.get("post-office.v1"), raw);
    assert.equal(h.values.get("post-office.recovery.v1"), recovery);
  }
});
check("duplicate IDs cannot bind readers to multiple letters", () => {
  const raw = JSON.stringify({ letters: [letter(), letter("letter", { body: "Other" })], drafts: {}, last: null });
  const h = harness(raw); assert.equal(h.api.state.letters.length, 1);
  assert.equal(h.api.state.letters[0].body, "A real letter ❤️");
});
console.log("Post Office storage regressions: " + checks + " checks passed.");
