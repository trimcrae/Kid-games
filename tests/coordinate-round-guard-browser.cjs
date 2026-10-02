#!/usr/bin/env node
"use strict";
// Full production Coordinates page; Chromium device emulation is not iOS Safari.
const assert = require("node:assert/strict"), fs = require("node:fs/promises"), http = require("node:http"), path = require("node:path"), { chromium } = require("playwright-core");
const ROOT = path.resolve(__dirname, ".."), ids = ["jeannie", "cory", "ellie", "kieran", "shannon", "tristan", "guest"];
async function server() {
  const s = http.createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      if (p === "/coordinate-round-fixture.html") { res.writeHead(200, { "Content-Type": "text/html" }).end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><p>Coordinate fixture</p>'); return; }
      if (p === "/favicon.ico") { res.writeHead(204).end(); return; }
      if (p.endsWith("/")) p += "index.html";
      const file = path.resolve(ROOT, "." + p);
      if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
      res.writeHead(200, { "Content-Type": ({ ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json" })[path.extname(file)] || "application/octet-stream" }).end(await fs.readFile(file));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise((resolve, reject) => { s.once("error", reject); s.listen(0, "127.0.0.1", resolve); }); return s;
}
async function check(browser, base, label, options, calm) {
  const context = await browser.newContext({ serviceWorkers: "block", reducedMotion: calm ? "reduce" : "no-preference", ...options });
  const page = await context.newPage(), errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  page.on("response", r => { if (r.status() >= 400) errors.push("HTTP " + r.status() + " " + r.url()); });
  const activate = async selector => { const e = page.locator(selector); if (options.hasTouch) await e.tap(); else await e.click(); };
  const state = async () => page.evaluate(() => JSON.parse(localStorage.getItem("block-coordinates.v2")));
  const unrelated = async () => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(k => k !== "block-coordinates.v2").sort().map(k => [k, localStorage.getItem(k)])));
  const waitRound = async n => page.waitForFunction(n => {
    const e = document.querySelector(".instruction .step-of"); return e && e.textContent.includes("round " + n + "/6");
  }, n);
  // Solve only from public instructions and visible markers, using independent arithmetic.
  async function answer(mode) {
    const prompt = await page.locator(".instruction").getAttribute("aria-label");
    const choices = page.locator(".choices:not([hidden]) button");
    if (mode === "f3") {
      const m = /(?:Dig at|Tap) X (\d+), (?:height Y|Z) (\d+)/.exec(prompt);
      if (m) return page.locator('.board .cell[data-x="' + m[1] + '"][data-y="' + m[2] + '"]');
      const text = /how high up|ladder/.test(prompt) ? "Y" : /east/.test(prompt) ? "X" : /south/.test(prompt) ? "Z" : /friend/.test(prompt) ? "My friend" : "X and Z";
      return page.getByRole("button", { name: text, exact: true });
    }
    if (await choices.count()) {
      const cells = await page.locator(".board .cell").evaluateAll(es => es.map(e => ({ x: Number(e.dataset.x), y: Number(e.dataset.y), label: e.getAttribute("aria-label") })));
      const point = name => { const c = cells.find(e => e.label.startsWith(name + " at X ")); assert.ok(c, "public " + name + " marker"); return c; };
      let text;
      if (prompt.startsWith("Where is the diamond")) { const p = point("Diamond"); text = "(" + p.x + ", " + p.y + ")"; }
      else { const a = point("Home"), b = point("Chest"); text = String(Math.abs(a.x - b.x) + Math.abs(a.y - b.y)); }
      return page.getByRole("button", { name: text, exact: true });
    }
    const p = /You are at X (-?\d+), Y (-?\d+)\. Walk (.+)\. Tap/.exec(prompt); assert.ok(p, "public walk instruction");
    let x = Number(p[1]), y = Number(p[2]);
    for (const m of p[3].matchAll(/(\d+) blocks? (right|left|up|down)/g)) {
      const d = Number(m[1]); if (m[2] === "right") x += d; if (m[2] === "left") x -= d; if (m[2] === "up") y += d; if (m[2] === "down") y -= d;
    }
    return page.locator('.board .cell[data-x="' + x + '"][data-y="' + y + '"]');
  }
  // Native mouse/touch events at the same square, even when the first event disables a choice.
  async function repeat(e, keyboard = false) {
    await e.scrollIntoViewIfNeeded();
    if (keyboard) { await e.focus(); await page.keyboard.press("Enter"); await page.keyboard.press("Space"); return; }
    const box = await e.boundingBox(); assert.ok(box);
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    if (options.hasTouch) { await page.touchscreen.tap(x, y); await page.touchscreen.tap(x, y); }
    else await page.mouse.dblclick(x, y, { delay: 20 });
  }
  async function wrong(mode) {
    const right = await answer(mode);
    const rightLabel = await right.getAttribute("aria-label"), rightText = await right.textContent();
    const pool = (await page.locator(".choices:not([hidden]) button").count()) ? page.locator(".choices:not([hidden]) button") : page.locator(".board .cell");
    for (let i = 0; i < await pool.count(); i++) {
      const e = pool.nth(i);
      if ((rightLabel && await e.getAttribute("aria-label") !== rightLabel) || (!rightLabel && await e.textContent() !== rightText)) {
        if (options.hasTouch) await e.tap(); else await e.click(); return;
      }
    }
    throw new Error("wrong answer must exist");
  }
  try {
    await context.addInitScript(() => {
      let seed = 117; Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    });
    await page.goto(base + "/coordinate-round-fixture.html", { waitUntil: "load" });
    const original = await page.evaluate(ids => {
      localStorage.clear();
      for (const prefix of ["craepets.", "craepets.house."]) for (const id of ids) localStorage.setItem(prefix + "v1." + id, "synthetic original bytes " + prefix + id + "\n😀");
      localStorage.setItem("craepets.who", "cory"); localStorage.setItem("craepets.house.who", "ellie"); localStorage.setItem("post-office.v1", "synthetic unrelated mail"); localStorage.setItem("arcade.kid", "kieran");
      localStorage.setItem("block-coordinates.v2", JSON.stringify({ tier: "normal", numbersOn: true, done: { heart: true }, perfect: { heart: true }, free: { n: 8, cells: { "1,1": "gold" } }, walkBest: { normal: 19, expert: 7 }, f3Best: { normal: 23, expert: 8 }, stats: { blocks: 41, bestStreak: 12, quests: 9 } }));
      return Object.fromEntries(Object.keys(localStorage).filter(k => k !== "block-coordinates.v2").sort().map(k => [k, localStorage.getItem(k)]));
    }, ids);
    await page.goto(base + "/games/block-coordinates/", { waitUntil: "load" });
    assert.equal(await page.locator("#say").getAttribute("aria-live"), "polite");
    assert.equal(await page.locator('script[src^="game.js"]').getAttribute("src"), "game.js?v=round-guard-20261002");
    for (const mode of ["walk", "f3"]) {
      const prefix = mode === "walk" ? "k" : "z";
      await activate("#m-" + mode);
      assert.ok(await page.locator(".board .cell").first().evaluate(e => e.getBoundingClientRect().width >= 30), "finger-sized coordinate squares");
      const before = await state();
      if (calm) {
        await repeat(await answer(mode), mode === "f3");
        assert.equal((await state()).stats.blocks, before.stats.blocks + 1);
        await waitRound(2); assert.equal((await state()).stats.quests, before.stats.quests);
        await activate("#" + prefix + "-back"); await activate("#m-free");
        await page.waitForTimeout(850);
        assert.equal(await page.locator(".win-banner").count(), 0); assert.equal(await page.locator(".instruction").count(), 0);
        assert.equal((await state()).stats.blocks, before.stats.blocks + 1); assert.equal((await state()).stats.quests, before.stats.quests);
        await activate("#f-back"); continue;
      }
      await wrong(mode); assert.equal(await page.locator(".explain").isVisible(), true); assert.match(await page.locator("#say").textContent(), /You tapped/);
      await repeat(await answer(mode));
      assert.equal((await state()).stats.blocks, before.stats.blocks + 1);
      await waitRound(2);
      if (mode === "f3") { await repeat(await answer(mode)); await waitRound(3); }
      await wrong(mode); // read-coordinate or Minecraft-axis feedback remains recoverable
      assert.equal(await page.locator(".choices button:disabled").count(), 1);
      await repeat(await answer(mode));
      await waitRound(mode === "walk" ? 3 : 4);
      for (let round = mode === "walk" ? 3 : 4; round <= 6; round++) {
        await repeat(await answer(mode));
        if (round < 6) await waitRound(round + 1);
      }
      await page.waitForSelector(".win-banner");
      assert.equal(await page.locator(".win-banner").count(), 1);
      assert.match(await page.locator(".win-banner h2").textContent(), /4 \/ 6 first try/);
      assert.match(await page.locator(".win-banner").textContent(), /2 (wrong taps|slips)/);
      let completed = await state(); assert.equal(completed.stats.blocks, before.stats.blocks + 6); assert.equal(completed.stats.quests, before.stats.quests + 1);
      await page.waitForTimeout(850); assert.deepEqual(await state(), completed); assert.equal(await page.locator(".win-banner").count(), 1);
      // Again is a fresh run. Native Enter/Space scores its first answer once.
      await activate("#" + prefix + "-again"); await repeat(await answer(mode), true);
      assert.equal((await state()).stats.blocks, before.stats.blocks + 7); await waitRound(2);
      for (let round = 2; round <= 5; round++) { await repeat(await answer(mode)); await waitRound(round + 1); }
      // Leave during final feedback, change tier and open another mode. No abandoned completion.
      await repeat(await answer(mode)); await activate("#" + prefix + "-back");
      await activate('.tier[data-tier="expert"]'); await activate("#m-free");
      const abandoned = await state(); await page.waitForTimeout(850);
      assert.deepEqual(await state(), abandoned); assert.equal(abandoned.stats.blocks, before.stats.blocks + 12); assert.equal(abandoned.stats.quests, before.stats.quests + 1);
      assert.equal(await page.locator(".instruction").count(), 0); assert.equal(await page.locator(".win-banner").count(), 0);
      assert.match(await page.locator(".readout").textContent(), /–/);
      await activate("#f-back"); await activate('.tier[data-tier="normal"]');
    }
    const final = await state();
    assert.deepEqual(final.walkBest, { normal: 19, expert: 7 }); assert.deepEqual(final.f3Best, { normal: 23, expert: 8 });
    assert.deepEqual(final.done, { heart: true }); assert.deepEqual(final.perfect, { heart: true }); assert.deepEqual(final.free, { n: 8, cells: { "1,1": "gold" } }); assert.equal(final.stats.bestStreak, 12);
    await page.reload({ waitUntil: "load" }); assert.deepEqual(await state(), final);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, "fits device width");
    assert.deepEqual(await unrelated(), original, "14 original/house profiles and other saves keep exact bytes");
    assert.deepEqual(errors, []);
    console.log("Coordinates " + label + (calm ? " calm250" : " normal650/700") + ": native pointer/keyboard" + (options.hasTouch ? "/touch" : "") + ", one answer credit, correction, completion/Again/exit and exact profile preservation passed.");
  } finally { await context.close(); }
}
(async () => {
  const s = await server(); let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
    const base = "http://127.0.0.1:" + s.address().port;
    for (const [label, options] of [
      ["Desktop", { viewport: { width: 1280, height: 800 } }],
      ["iPad", { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true }],
      ["iPhone", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
    ]) for (const calm of [false, true]) await check(browser, base, label, options, calm);
  } finally { if (browser) await browser.close(); await new Promise(resolve => s.close(resolve)); }
})().catch(e => { console.error(e); process.exitCode = 1; });
