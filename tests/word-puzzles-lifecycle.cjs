#!/usr/bin/env node
"use strict";

// Real-browser regressions for duplicate submissions, stale callbacks and clocks.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright-core");
const root = path.resolve(__dirname, "..");
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };
const server = http.createServer(async (req, res) => {
  try {
    let name = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (name === "/favicon.ico") return res.writeHead(204).end();
    if (name.endsWith("/")) name += "index.html";
    const file = path.resolve(root, "." + name);
    if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
    const bytes = await fs.readFile(file);
    res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
    res.end(bytes);
  } catch { res.writeHead(404).end(); }
});
const readSave = (page, key) => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
async function pickCards(page, words) {
  await page.evaluate(words => {
    for (const word of words) [...document.querySelectorAll("#board .tile")].find(tile => tile.dataset.item === word).click();
  }, words);
}
async function fillCrossword(page) {
  await page.locator(".xinput").evaluateAll(inputs => {
    for (const input of inputs) {
      input.value = input.dataset.sol;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
}

async function connections(page, base) {
  await page.goto(base + "/games/connections/");
  await page.locator("#puz-grid .puz-card").first().click();
  const solution = await page.locator("#board").evaluate(board => JSON.parse(board.dataset.solution));
  await pickCards(page, solution[0]);
  await page.locator("#submit-btn").evaluate(button => {
    button.click();
    // A listener must reject repeat activation even if an event bypasses disabled.
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
  assert.equal((await readSave(page, "connections.v1")).cur.solved.length, 1, "One group is earned exactly once");
  assert.equal(await page.locator("#board .tile:disabled").count(), 16, "All cards are disabled while the group settles");
  assert.equal(await page.locator("#submit-btn").isDisabled(), true);
  const selected = await page.locator("#board .selected").count();
  await page.locator("#board .tile:not(.selected)").first().dispatchEvent("click");
  assert.equal(await page.locator("#board .selected").count(), selected, "Solving cards reject forced selection events");

  // Leaving during the animation finishes the earned group before saving/resuming.
  await page.locator("#quit-btn").click();
  const partial = (await readSave(page, "connections.v1")).cur;
  assert.equal(partial.solved.length, 1);
  assert.equal(partial.tiles.length, 12);
  assert.match(await page.locator("#resume-btn").textContent(), /1\/4 found/);
  await page.locator("#resume-btn").click();
  assert.equal(await page.locator("#solved .solved-row").count(), 1);
  assert.equal(await page.locator("#board .tile").count(), 12);
  await pickCards(page, solution[1]);
  await page.locator("#submit-btn").click();
  await page.locator("#quit-btn").click();
  await page.locator("#puz-grid .puz-card").nth(1).click();
  const next = (await readSave(page, "connections.v1")).cur.id;
  await page.clock.fastForward(1000);
  assert.equal(await page.locator("#board .tile").count(), 16, "An old solve callback cannot remove new puzzle cards");
  assert.equal(await page.locator("#solved .solved-row").count(), 0);
  assert.equal((await readSave(page, "connections.v1")).cur.id, next);

  // Two distinct wrong guesses schedule a little-player hint. Switching cancels it.
  const other = await page.locator("#board").evaluate(board => JSON.parse(board.dataset.solution));
  for (let index = 0; index < 2; index++) {
    await page.locator("#deselect-btn").click();
    await pickCards(page, other.map(group => group[index]));
    await page.locator("#submit-btn").click();
  }
  assert.equal((await readSave(page, "connections.v1")).cur.mistakes, 2);
  await page.locator("#quit-btn").click();
  await page.locator("#puz-grid .puz-card").nth(2).click();
  await page.clock.fastForward(1500);
  assert.deepEqual((await readSave(page, "connections.v1")).cur.hinted, [], "A delayed hint belongs only to its original round");
  assert.equal(await page.locator("#feedback").textContent(), "");
}

async function crossword(page, base, touch) {
  await page.goto(base + "/games/crossword/");
  await page.evaluate(() => localStorage.setItem("crossword.v1", JSON.stringify({
    meta: { timer: true }, p0: { secs: 37 }, p1: { secs: 4 },
  })));
  await page.reload();
  await page.locator("#puz-grid .puz-card").first().click();
  const crossing = page.locator('.xinput[aria-label*="across"][aria-label*="down"]').first();
  const tap = () => touch ? crossing.tap() : crossing.click();
  await tap();
  assert.equal(await page.locator(".clue-li.active").getAttribute("data-dir"), "across");
  await tap();
  assert.equal(await page.locator(".clue-li.active").getAttribute("data-dir"), "down", "Tapping a crossing changes direction exactly once");
  await tap();
  assert.equal(await page.locator(".clue-li.active").getAttribute("data-dir"), "across");
  // Re-tapping an already focused square must not suppress the next real focus.
  await page.locator('.xinput[aria-label*="down"]:not([aria-label*="across"])').first().focus();
  assert.equal(await page.locator(".clue-li.active").getAttribute("data-dir"), "down");
  await fillCrossword(page);
  assert.equal((await readSave(page, "crossword.v1")).p0.solved, true);
  await page.locator("#quit-btn").click();
  await page.reload();
  await page.locator("#puz-grid .puz-card").first().click();
  assert.match(await page.locator("#feedback").textContent(), /You solved/);
  assert.equal(await page.locator("#next-btn").isVisible(), true);
  assert.equal(await page.locator("#timer").textContent(), "⏱ 0:37");
  await page.clock.fastForward(5000);
  assert.equal(await page.locator("#timer").textContent(), "⏱ 0:37", "A restored complete grid keeps its stopped clock");

  await page.locator("#clear-btn").click();
  assert.equal(await page.locator("#timer").textContent(), "⏱ 0:00");
  assert.equal(await page.locator("#next-btn").isVisible(), false);
  assert.equal(await page.locator(".xinput").evaluateAll(inputs => inputs.every(input => input.value === "")), true);
  await page.clock.fastForward(1000);
  assert.equal(await page.locator("#timer").textContent(), "⏱ 0:01", "Clearing a solved puzzle restarts its clock");
  await fillCrossword(page);
  await page.locator("#next-btn").click();
  const saved = await readSave(page, "crossword.v1");
  assert.equal(saved.p0.secs, 1);
  assert.equal(saved.p1.secs, 4, "The previous clock never overwrites the new puzzle's saved seconds");
  assert.equal(await page.locator("#timer").textContent(), "⏱ 0:04");
  await page.clock.fastForward(1000);
  assert.equal(await page.locator("#timer").textContent(), "⏱ 0:05");
  await page.locator("#quit-btn").click();
  assert.equal((await readSave(page, "crossword.v1")).p1.secs, 5);
}

async function main() {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
    for (const [name, device] of Object.entries({
      Desktop: { viewport: { width: 1280, height: 800 } },
      Phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    })) {
      const context = await browser.newContext({ ...device, reducedMotion: "reduce" });
      try {
        const page = await context.newPage(), errors = [];
        page.setDefaultTimeout(8000);
        page.on("pageerror", error => errors.push(error.message));
        const time = new Date("2026-10-01T12:00:00Z");
        await page.clock.install({ time });
        await page.clock.pauseAt(time);
        await connections(page, base);
        await crossword(page, base, !!device.hasTouch);
        assert.deepEqual(errors, [], "Word puzzles produce no browser exceptions");
        console.log(`PASS word puzzles: ${name}, duplicate submit, disabled cards, solve/hint cancellation, stopped/restored clocks, Clear and crossing direction`);
      } finally { await context.close(); }
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
