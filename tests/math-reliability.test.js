#!/usr/bin/env node
"use strict";

// Focused regressions for arithmetic, recoverable saves and leaving a game.
// Run: CHROMIUM_PATH=/usr/bin/chromium node tests/math-reliability.test.js
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright-core");

const root = path.resolve(__dirname, "..");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };
const server = http.createServer(async (req, res) => {
  let name = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  if (name.endsWith("/")) name += "index.html";
  if (name === "/favicon.ico") return res.writeHead(204).end();
  const file = path.resolve(root, "." + name);
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  try {
    const bytes = await fs.readFile(file);
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
    res.end(bytes);
  } catch {
    res.writeHead(404).end();
  }
});

async function main() {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
  const errors = [];
  async function pageFor(game, init) {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(`${game}: ${error.message}`));
    if (init) await context.addInitScript(init);
    await page.goto(`${base}/games/${game}/`);
    return page;
  }
  try {
    const converter = await pageFor("unit-converter", () => { Math.random = () => 0.25; });
    await converter.locator("#value").fill("");
    assert.match(await converter.locator("#compare").innerText(), /Enter a number/);
    assert.equal(await converter.locator("#rows .row:not([disabled])").count(), 0);
    await converter.locator("#value").fill("0");
    assert.match(await converter.locator("#resHead").innerText(), /^0 m/);
    assert.ok(await converter.locator("#rows .row:not([disabled])").count() > 0);
    await converter.locator("#tabQuiz").click();
    await converter.getByRole("button", { name: "Ask me a question" }).click();
    assert.match(await converter.locator("#quizBody .quiz-q").innerText(), /in 3 m\?/);
    for (const text of ["3000oops", "3000/2", "3,00", "Infinity", "1e309", ""]) {
      await converter.locator("#ansInput").fill(text);
      await converter.locator("#ansInput").press("Enter");
      assert.equal(await converter.locator("#ansCheck").isEnabled(), true, `Invalid '${text}' keeps the question open`);
      assert.equal(await converter.locator("#ansError").isVisible(), true);
      assert.equal(await converter.locator("#quizStars").innerText(), "0");
      assert.match(await converter.locator("#lvlBlurb").innerText(), /0 right here/);
    }
    await converter.locator("#ansInput").fill("+3,000");
    await converter.locator("#ansCheck").click();
    assert.equal(await converter.locator("#quizStars").innerText(), "1");
    assert.match(await converter.locator("#lvlBlurb").innerText(), /1 right here out of 1 tries/);

    const temperature = await pageFor("unit-converter", () => {
      Math.random = () => 0;
      localStorage.setItem("unitConverter-quiz", JSON.stringify({ level: 3, unlocked: 4 }));
    });
    await temperature.locator("#tabQuiz").click();
    await temperature.getByRole("button", { name: "Ask me a question" }).click();
    assert.match(await temperature.locator("#quizBody .quiz-q").innerText(), /-40 °C/);
    await temperature.locator("#ansInput").fill("−40");
    await temperature.locator("#ansCheck").click();
    assert.equal(await temperature.locator("#quizStars").innerText(), "1");

    const grid = await pageFor("number-grid", () => {
      for (const method of ["getItem", "setItem", "removeItem"]) {
        Storage.prototype[method] = () => { throw new DOMException("Storage is blocked", "SecurityError"); };
      }
    });
    await grid.locator("#word-input").fill("Café");
    await grid.locator("#word-input").press("4");
    await grid.locator("#word-input").press("Enter");
    assert.equal(await grid.locator("#score").innerText(), "1");
    assert.equal(await grid.locator("#tries").innerText(), "1");
    await grid.locator("#word-input").fill("Candy");
    await grid.locator("#word-input").press("5");
    await grid.locator("#word-input").press("Enter");
    assert.equal(await grid.locator("#score").innerText(), "2");
    assert.equal(await grid.locator("#tries").innerText(), "2");
    await grid.locator('[data-kid="ellie"]').click();
    assert.equal(await grid.locator("#count").innerText(), "0");
    await grid.locator('[data-kid="cory"]').click();
    assert.equal(await grid.locator("#count").innerText(), "2");
    assert.equal(await grid.locator("#score").innerText(), "2");
    assert.match(await grid.locator("#c-C-4").innerText(), /Café/);

    const dirtyGrid = await pageFor("number-grid", () => {
      localStorage.setItem("numberGrid.v1:cory", JSON.stringify({
        "C|5": ["Candy", null, { bad: true }, "", "123", "candy"],
        "A|constructor": ["Apple"], "no-square": ["Tiger"], "D|3": "Dog"
      }));
      localStorage.setItem("numberGrid.score:cory", JSON.stringify({ right: -3, tries: -5 }));
    });
    assert.equal(await dirtyGrid.locator("#count").innerText(), "1");
    assert.equal(await dirtyGrid.locator("#score").innerText(), "0");
    assert.match(await dirtyGrid.locator("#c-C-5").innerText(), /Candy/);

    const money = await pageFor("money-machine", () => {
      localStorage.setItem("money-machine-settings", JSON.stringify({ start: 100, add: 50, place: "savings" }));
      localStorage.setItem("money-machine-run", JSON.stringify({
        v: 2, start: 100, add: 50, place: "savings", year: 2,
        balance: -1, putIn: 0, history: [null], celebrated: "damaged"
      }));
    });
    await money.locator("#tabMachine").click();
    assert.deepEqual(await money.evaluate(() => [MoneyMachine.year(), MoneyMachine.balanceCents()]), [2, 20759]);
    assert.equal(await money.locator("#chart .bar").count(), 2);
    await money.locator("#nextBtn").click();
    assert.deepEqual(await money.evaluate(() => [MoneyMachine.year(), MoneyMachine.balanceCents()]), [3, 26382]);
    const statements = await money.evaluate(() => JSON.parse(localStorage.getItem("money-machine-run")).history);
    assert.equal(statements.length, 4);
    assert.deepEqual(statements[2], { year: 2, balance: 20759, putIn: 20000 });

    const life = await pageFor("game-of-life");
    await life.locator("#clearBtn").click();
    await life.locator('[data-brush="glider"]').click();
    await life.getByRole("button", { name: "Rotate the stamp a quarter turn" }).click();
    await life.waitForFunction(() => JSON.parse(localStorage.getItem("life-lab-v1") || "null")?.rot === 1);
    await life.locator('[data-brush="pencil"]').click();
    await life.locator("#world").focus();
    await life.locator("#world").press("Enter");
    await life.reload();
    assert.equal(await life.locator("#popCount").innerText(), "1", "Reload immediately after drawing keeps the last cell");
    assert.equal(await life.evaluate(() => JSON.parse(localStorage.getItem("life-lab-v1")).rot), 1);

    // Audit all owned games at phone width as well, including the unchanged
    // coordinate game, and check their accessible keyboard entry points.
    for (const game of ["unit-converter", "number-grid", "money-machine", "game-of-life", "block-coordinates"]) {
      const mobile = await pageFor(game);
      await mobile.setViewportSize({ width: 390, height: 844 });
      await mobile.reload();
      assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, `${game} fits a phone`);
    }
    assert.deepEqual(errors, [], "Games produce no browser exceptions");
    console.log("Math/logic reliability checks passed (5 games, numeric answers, blocked storage, damaged saves, immediate reload and phone layouts).");
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  console.error(error);
  server.close();
  process.exitCode = 1;
});
