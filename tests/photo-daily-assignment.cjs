#!/usr/bin/env node
"use strict";

// Run the real game shell and data in a VM; only the DOM/map are stubbed.
// No browser, server or dependency installation is needed for this regression.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const directory = path.resolve(__dirname, "../games/photo-expedition");
const clock = { time: new Date(2026, 9, 1, 12).getTime() };
class GameDate extends Date {
  constructor(...args) { super(...(args.length ? args : [clock.time])); }
  static now() { return clock.time; }
}
function element() {
  const classes = new Set();
  return {
    innerHTML: "", textContent: "",
    classList: {
      add: name => classes.add(name), remove: name => classes.delete(name),
      contains: name => classes.has(name),
      toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); },
    },
    addEventListener() {}, appendChild() {},
  };
}
const elements = new Map();
const context = vm.createContext({
  Date: GameDate,
  location: { hash: "#pick" },
  localStorage: { getItem: () => null, setItem() {} },
  document: {
    getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
    createElement: element, querySelectorAll: () => [],
  },
  WorldMap: { init() {}, setActive() {}, refresh() {}, setState() {} },
  scrollTo() {},
});
context.window = context;
vm.runInContext(fs.readFileSync(path.join(directory, "data.js"), "utf8") +
  "\nglobalThis.data = { SITES, SUBJECTS, EXPLORERS, TIERS };", context, { filename: "data.js" });
const source = fs.readFileSync(path.join(directory, "game.js"), "utf8");
const exportAnchor = "window.PhotoExpedition = {";
assert(source.includes(exportAnchor), "The shell exposes its public game API");
// Expose the private functions in this VM only, without copying their logic.
vm.runInContext(source.replace(exportAnchor, exportAnchor + " dailyAssignment, checkDaily,"), context, { filename: "game.js" });
const game = context.PhotoExpedition;
const { SITES, SUBJECTS, EXPLORERS, TIERS } = context.data;
function profile(unlocked) {
  return { unlocked: [...unlocked], stars: {}, treasures: [], route: [], photos: [], visits: {} };
}
function select(date, explorer, unlocked) {
  clock.time = new Date(date[0], date[1] - 1, date[2], 12).getTime();
  game.save.explorers[explorer.id] = profile(unlocked);
  // This also renders the assignment through the real map refresh path.
  game.pickExplorer(explorer);
  return game.dailyAssignment();
}
function summary(daily) {
  return { site: daily.site.id, subject: daily.id, when: daily.when };
}
const cory = EXPLORERS.find(explorer => explorer.id === "cory");
const today = [2026, 10, 1];
const unlockedAmazon = ["serengeti", "amazon"];
const current = select(today, cory, unlockedAmazon);
assert.deepEqual(summary(current), { site: "amazon", subject: "toucan", when: "day" },
  "2026-10-01: Cory can unlock the Amazon and keep rendering a valid daily assignment");
assert.match(elements.get("daily").innerHTML, /Toco toucan/);
assert.match(elements.get("daily").innerHTML, /in daylight/);

const dates = [
  [2026, 1, 1], [2026, 9, 30], today, [2026, 10, 2], [2026, 12, 31],
  [2027, 1, 1], [2028, 2, 28], [2028, 2, 29], [2028, 3, 1], [2030, 12, 31],
];
const unlocks = [[], ["serengeti"], unlockedAmazon, SITES.slice(0, 4).map(site => site.id), SITES.map(site => site.id)];
let cases = 0, compatible = 0, highHashes = 0;
const seenTimes = new Set();
for (const date of dates) {
  for (const explorer of EXPLORERS) {
    for (const unlocked of unlocks) {
      const daily = select(date, explorer, unlocked);
      const open = SITES.filter(site => !TIERS[explorer.tier].gates || unlocked.includes(site.id));
      cases++;
      if (!open.length) {
        assert.equal(daily, null);
        assert(elements.get("daily").classList.contains("hidden"));
        continue;
      }
      assert(open.includes(daily.site), "Only an available expedition is assigned");
      assert(daily.site.subjects.includes(daily.id), "The subject lives at the assigned site");
      assert.equal(daily.sub, SUBJECTS[daily.id], "The assignment uses a real subject");
      assert.notEqual(daily.sub.kind, "moment", "Special moments are excluded");
      assert(["dawn", "day", "dusk", "night"].includes(daily.when), "A valid photo time is assigned");
      if (!["any", "day"].includes(daily.sub.when)) assert.equal(daily.when, daily.sub.when);
      seenTimes.add(daily.when);
      assert.deepEqual(summary(game.dailyAssignment()), summary(daily), "Repeated calls are deterministic");
      assert(elements.get("daily").innerHTML.includes(daily.sub.name), "The daily assignment renders");
      assert.equal(elements.get("daily").classList.contains("hidden"), false);

      // Existing valid, low-bit hashes must keep their original assignments.
      let hash = 0;
      for (const letter of `${date.join("-")}${explorer.id}`) hash = (hash * 31 + letter.charCodeAt(0)) >>> 0;
      if (hash < 0x80000000) {
        const site = open[hash % open.length];
        const subjects = site.subjects.filter(id => SUBJECTS[id].kind !== "moment");
        const id = subjects[(hash >> 3) % subjects.length];
        const sub = SUBJECTS[id];
        const when = ["any", "day"].includes(sub.when) ? ["dawn", "day", "dusk"][(hash >> 7) % 3] : sub.when;
        assert.deepEqual(summary(daily), { site: site.id, subject: id, when }, "Low-bit assignments stay compatible");
        compatible++;
      } else highHashes++;
    }
  }
}
assert(compatible > 0 && highHashes > 0, "Exercise both low-bit and high-bit dates");
assert.deepEqual([...seenTimes].sort(), ["dawn", "day", "dusk"]);

// The repaired assignment must also be completable, and reward only once.
const daily = select(today, cory, unlockedAmazon);
const photo = { site: daily.site.id, subject: daily.id, when: daily.when, stars: TIERS[cory.tier].passStars };
assert.equal(game.checkDaily({ ...photo, when: "night" }), false);
assert.equal(game.checkDaily({ ...photo, stars: photo.stars - 1 }), false);
assert.equal(game.checkDaily(photo), true);
assert.equal(game.profile.bonus, 3);
assert.equal(game.dailyAssignment().done, true);
assert.equal(game.checkDaily(photo), false);
assert.equal(game.profile.bonus, 3);
clock.time = new Date(2026, 9, 2, 12).getTime();
assert.equal(game.dailyAssignment().done, false, "Completion resets on the next local date");
console.log(`PASS: Photo daily assignments (${cases} date/explorer/unlock cases; ${compatible} compatible low-bit hashes, ${highHashes} high-bit hashes), real map rendering and one daily reward`);
