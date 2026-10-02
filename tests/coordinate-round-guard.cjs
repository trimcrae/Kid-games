#!/usr/bin/env node
"use strict";
// Unchanged production builders, boards, handlers and persistence in a Node VM.
// DOM, time and visual/audio effects are isolated; the browser suite loads the full page.
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const source = fs.readFileSync(process.env.COORDINATE_SOURCE || path.join(__dirname, "../games/block-coordinates/game.js"), "utf8");
function section(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, "production markers must exist: " + start);
  return source.slice(a, b);
}
const production = [
  section("  const KEY =", "  /* ---------------- difficulty ladder"),
  section("  const TIERS =", "  /* ---------------- blueprints"),
  section("  function say(", "  function sparkle("),
  section("  function makeBoard(", "  /* ---------- menu"),
  section("  function startWalk(", "  /* ===========================================================\n     X, Y, Z"),
  section("  function startF3(", "  /* ---------- free build"),
].join("\n");
const ids = ["jeannie", "cory", "ellie", "kieran", "shannon", "tristan", "guest"];
function unrelated() {
  const out = {};
  for (const prefix of ["craepets.", "craepets.house."]) for (const id of ids) out[prefix + "v1." + id] = "synthetic original bytes " + prefix + id + "\n😀";
  Object.assign(out, { "craepets.who": "cory", "craepets.house.who": "ellie", "post-office.v1": "synthetic unrelated mail", "arcade.kid": "kieran" });
  return out;
}
function fixture(mode, calm = false, tier = "normal", historical = {}) {
  const elements = new Map(), storage = new Map(Object.entries(unrelated()));
  const initial = { tier, done: { heart: true }, perfect: { heart: true }, free: { n: 8, cells: { "1,1": "gold" } }, walkBest: {}, f3Best: {}, stats: { blocks: 0, bestStreak: 0, quests: 0 }, ...historical };
  storage.set("block-coordinates.v2", JSON.stringify(initial));
  const untouched = Object.fromEntries([...storage].filter(([k]) => k !== "block-coordinates.v2"));
  const timers = new Map(), effects = { gem: 0, dig: 0, good: 0, nope: 0, win: 0, parties: 0, writes: 0 };
  let clock = 0, nextTimer = 1, seed = 117;
  class El {
    constructor(tag) {
      this.tagName = tag.toUpperCase(); this.children = []; this.dataset = {}; this.attrs = {}; this.listeners = {};
      this._html = ""; this.className = ""; this.textContent = ""; this.disabled = false; this.style = { setProperty() {} }; this.clientWidth = 560;
      const names = () => new Set(this.className.split(/\s+/).filter(Boolean));
      this.classList = {
        add: (...xs) => { const s = names(); xs.forEach(x => s.add(x)); this.className = [...s].join(" "); },
        remove: (...xs) => { const s = names(); xs.forEach(x => s.delete(x)); this.className = [...s].join(" "); },
        toggle: (x, on) => { const s = names(); if (on === undefined ? !s.has(x) : on) s.add(x); else s.delete(x); this.className = [...s].join(" "); },
      };
    }
    appendChild(c) { this.children.push(c); return c; }
    setAttribute(k, v) { this.attrs[k] = String(v); }
    addEventListener(k, f) { (this.listeners[k] ||= []).push(f); }
    set innerHTML(s) {
      this._html = s; this.children = [];
      if (s === "<i></i>") this.appendChild(new El("i"));
      for (const m of s.matchAll(/id="([^"]+)"/g)) elements.set(m[1], new El("button"));
    }
    get innerHTML() { return this._html; }
    get firstChild() { return this.children[0]; }
    click() { if (!this.disabled) { (this.listeners.click || []).forEach(f => f()); if (this.onclick) this.onclick(); } }
  }
  const app = new El("div"), say = new El("p"); elements.set("app", app); elements.set("say", say);
  const context = vm.createContext({
    document: { createElement: tag => new El(tag) }, $: id => elements.get(id),
    window: { addEventListener() {} }, reduceMotion: calm,
    Sound: { gem() { effects.gem++; }, dig() { effects.dig++; } },
    sfx: k => { if (k in effects) effects[k]++; }, sparkle: () => effects.parties++,
    place() {}, shake() {}, renderMenu() { context.api.clear(); }, toggleNums() {},
    localStorage: {
      getItem: k => storage.get(k) || null,
      setItem: (k, v) => { effects.writes++; storage.set(k, v); },
    },
    Math: Object.assign(Object.create(Math), { random: () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; } }),
    setTimeout: (fn, ms) => { const id = nextTimer++; timers.set(id, { fn, ms, at: clock + ms }); return id; },
    clearTimeout: id => timers.delete(id),
  });
  vm.runInContext(production + "\nglobalThis.api = { walk: startWalk, f3: startF3, clear: clearScreen, state: () => JSON.parse(JSON.stringify(save)), board: () => boardCtx, tier: t => { save.tier = t; persist(); } };", context);
  context.api[mode]();
  function run(ms) {
    const until = clock + ms;
    for (;;) {
      const next = [...timers].filter(([, t]) => t.at <= until).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!next) break;
      const [id, t] = next; clock = t.at; timers.delete(id); t.fn();
    }
    clock = until;
  }
  const f = {
    mode, calm, tier, app, effects, timers, run, api: context.api, elements, say,
    state: () => JSON.parse(JSON.stringify(context.api.state())),
    instr: () => app.children.find(e => e.className === "instruction"),
    choices: () => app.children.find(e => e.className === "choices"),
    progress: () => Number(app.children.find(e => e.className === "progress").attrs["aria-valuenow"]),
    banners: () => app.children.filter(e => e.className === "win-banner"),
    unchanged() { assert.deepEqual(Object.fromEntries([...storage].filter(([k]) => k !== "block-coordinates.v2")), untouched); },
  };
  f.answer = () => {
    const prompt = f.instr().attrs["aria-label"];
    const board = context.api.board(), buttons = f.choices().children;
    if (mode === "f3") {
      const p = /(?:Dig at|Tap) X (\d+), (?:height Y|Z) (\d+)/.exec(prompt);
      if (p) return board.cellMap[p[1] + "," + p[2]];
      const text = /how high up|ladder/.test(prompt) ? "Y" : /east/.test(prompt) ? "X" : /south/.test(prompt) ? "Z" : /friend/.test(prompt) ? "My friend" : "X and Z";
      const b = buttons.find(e => e.textContent === text); assert.ok(b, "independent Minecraft-axis answer: " + prompt + " choices " + buttons.map(e => e.textContent).join(", ")); return b;
    }
    if (buttons.length) {
      const cells = Object.values(board.cellMap);
      const point = name => {
        const cell = cells.find(e => e.attrs["aria-label"].startsWith(name + " at X "));
        assert.ok(cell, "visible " + name + " marker");
        return [Number(cell.dataset.x), Number(cell.dataset.y)];
      };
      let text;
      if (prompt.startsWith("Where is the diamond")) { const [x, y] = point("Diamond"); text = "(" + x + ", " + y + ")"; }
      else { const a = point("Home"), b = point("Chest"); text = String(Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1])); }
      const b = buttons.find(e => e.textContent === text); assert.ok(b, "independent coordinate/distance answer"); return b;
    }
    const p = /You are at X (-?\d+), Y (-?\d+)\. Walk (.+)\. Tap/.exec(prompt); assert.ok(p, "walk prompt");
    let x = Number(p[1]), y = Number(p[2]);
    for (const m of p[3].matchAll(/(\d+) blocks? (right|left|up|down)/g)) {
      const d = Number(m[1]); if (m[2] === "right") x += d; if (m[2] === "left") x -= d; if (m[2] === "up") y += d; if (m[2] === "down") y -= d;
    }
    const b = board.cellMap[x + "," + y]; assert.ok(b, "independent walk destination"); return b;
  };
  f.delay = calm ? 250 : mode === "walk" ? 650 : 700;
  f.transition = () => [...timers.values()].find(t => t.ms === f.delay);
  f.solveRound = () => { f.answer().click(); f.run(f.delay); };
  return f;
}
let cases = 0;
function test(name, fn) { fn(); cases++; console.log("PASS " + name); }
for (const mode of ["walk", "f3"]) for (const calm of [false, true]) {
  const name = mode + (calm ? " calm250" : " normal");
  test(name + ": one accepted grid answer, one timer; feedback ignores all taps", () => {
    const f = fixture(mode, calm), answer = f.answer(), oldClick = answer.listeners.click[0], prompt = f.instr().innerHTML;
    answer.click(); const once = f.state(), effects = { ...f.effects };
    for (let n = 0; n < 5; n++) answer.click();
    const wrong = Object.values(f.api.board().cellMap).find(e => e !== answer); wrong.click();
    assert.deepEqual(f.state(), once); assert.deepEqual(f.effects, effects);
    assert.equal(f.state().stats.blocks, 1); assert.equal(f.instr().innerHTML, prompt); assert.equal([...f.timers.values()].filter(t => t.ms === f.delay).length, 1);
    f.run(f.delay - 1); assert.equal(f.progress(), 0); f.run(1); assert.equal(f.progress(), 1); assert.match(f.instr().innerHTML, /round 2\/6/);
    if (mode === "f3") { const snapshot = f.state(); oldClick(); assert.deepEqual(f.state(), snapshot, "detached board cannot answer the next round"); }
    f.unchanged();
  });
  test(name + ": wrong first, correction stays learnable and scores once", () => {
    const f = fixture(mode, calm), answer = f.answer(), wrong = Object.values(f.api.board().cellMap).find(e => e !== answer);
    wrong.click(); assert.match(f.say.textContent, /You tapped/); assert.equal(f.effects.dig, 1);
    answer.click(); answer.click(); f.run(f.delay);
    for (let round = 1; round < 6; round++) f.solveRound();
    const s = f.state(); assert.equal(s.stats.blocks, 6); assert.equal(s.stats.quests, 1); assert.equal(s[mode === "walk" ? "walkBest" : "f3Best"].normal, 5);
    assert.equal(f.banners().length, 1); assert.match(f.banners()[0].innerHTML, /5 \/ 6 first try/); assert.match(f.banners()[0].innerHTML, /1 (wrong tap|slip)/);
    f.run(3000); assert.equal(f.state().stats.quests, 1); assert.equal(f.banners().length, 1); f.unchanged();
  });
  test(name + ": correct/wrong choice identity rejects retained handlers", () => {
    const f = fixture(mode, calm); f.solveRound(); if (mode === "f3") f.solveRound();
    const right = f.answer(), wrong = f.choices().children.find(e => e !== right);
    const oldRight = right.onclick, oldWrong = wrong.onclick;
    wrong.click(); assert.equal(wrong.disabled, true); const afterWrong = f.effects.nope; oldWrong(); assert.equal(f.effects.nope, afterWrong);
    right.click(); const once = f.state(), effects = { ...f.effects }; oldRight(); oldWrong(); assert.deepEqual(f.state(), once); assert.deepEqual(f.effects, effects);
    assert.ok(f.choices().children.every(b => b.disabled));
    f.run(f.delay); const fresh = f.state(), nextEffects = { ...f.effects }, prompt = f.instr().innerHTML;
    right.disabled = false; wrong.disabled = false; // adversarial retained callbacks: isolate the question-identity guard
    oldRight(); oldWrong(); assert.deepEqual(f.state(), fresh); assert.deepEqual(f.effects, nextEffects); assert.equal(f.instr().innerHTML, prompt);
    f.solveRound(); assert.equal(f.state().stats.blocks, mode === "walk" ? 3 : 4); f.unchanged();
  });
  test(name + ": leaving last feedback cancels completion and tier leakage", () => {
    const f = fixture(mode, calm, "easy");
    for (let round = 0; round < 3; round++) f.solveRound();
    const answer = f.answer(); answer.click(); const queued = f.transition(); assert.ok(queued);
    f.api.clear(); f.api.tier("master"); const state = f.state(), effects = { ...f.effects };
    queued.fn(); f.run(3000); assert.deepEqual(f.state(), state); assert.deepEqual(f.effects, effects); assert.equal(f.banners().length, 0); assert.equal(f.state().stats.quests, 0);
    f.api[mode === "walk" ? "f3" : "walk"](); const prompt = f.instr().innerHTML, fresh = f.state(); queued.fn(); answer.click();
    assert.equal(f.instr().innerHTML, prompt); assert.deepEqual(f.state(), fresh); f.unchanged();
  });
  test(name + ": complete once, Again starts a fresh run, historical progress retained", () => {
    const previous = { walkBest: { normal: 19, expert: 7 }, f3Best: { normal: 23, expert: 8 }, stats: { blocks: 41, bestStreak: 12, quests: 9 } };
    const f = fixture(mode, calm, "normal", previous);
    for (let round = 0; round < 5; round++) f.solveRound();
    f.answer().click(); const callback = f.transition().fn; f.answer().click(); f.run(f.delay);
    assert.equal(f.state().stats.blocks, 47); assert.equal(f.state().stats.quests, 10); assert.equal(f.banners().length, 1);
    assert.deepEqual(f.state().walkBest, previous.walkBest); assert.deepEqual(f.state().f3Best, previous.f3Best); assert.equal(f.state().stats.bestStreak, 12);
    const s = f.state(); f.run(3000); assert.deepEqual(f.state(), s); assert.equal(f.banners().length, 1);
    f.elements.get(mode === "walk" ? "k-again" : "z-again").onclick(); const prompt = f.instr().innerHTML; callback();
    assert.equal(f.instr().innerHTML, prompt); assert.deepEqual(f.state(), s);
    f.answer().click(); f.run(f.delay); assert.equal(f.state().stats.blocks, 48); assert.match(f.instr().innerHTML, /round 2\/6/);
    assert.deepEqual(f.state().done, { heart: true }); assert.deepEqual(f.state().perfect, { heart: true }); assert.deepEqual(f.state().free, { n: 8, cells: { "1,1": "gold" } }); f.unchanged();
  });
}
console.log("Coordinates round guards: " + cases + " production Node cases passed; 14 original/house profile values and unrelated bytes unchanged.");
