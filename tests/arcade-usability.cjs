#!/usr/bin/env node
"use strict";

// Focused landing-page regressions. Run: CHROMIUM_PATH=/usr/bin/chromium node tests/arcade-usability.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright-core");
const ROOT = path.resolve(__dirname, "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".webmanifest": "application/manifest+json" };

async function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      let pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      if (pathname.endsWith("/")) pathname += "index.html";
      const file = path.resolve(ROOT, "." + pathname);
      if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
      const data = await fs.readFile(file);
      res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" }).end(data);
    } catch (_) { res.writeHead(404).end(); }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return server;
}

async function withPage(browser, base, options, test) {
  const context = await browser.newContext({ serviceWorkers: "block", reducedMotion: "reduce", ...options });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  try {
    await test(page, context, base);
    assert.deepEqual(errors, [], "landing interactions must not produce browser errors");
  } finally { await context.close(); }
}

async function testFilters(page, _context, base) {
  await page.goto(base, { waitUntil: "load" });
  const all = await page.locator(".game-card").count();
  assert.ok(all > 20, "the full arcade registry must render");
  assert.equal(await page.locator("#game-results").textContent(), `${all} games to explore`);
  assert.equal(await page.locator(".game-card p").count(), 0, "cards should stay compact");

  const search = page.getByRole("searchbox", { name: "Find a game" });
  await search.fill("  MÚSIC   LAB  ");
  assert.equal(await page.locator(".game-card:visible").count(), 1, "search should ignore case, accents and extra whitespace");
  assert.equal(await page.locator(".game-card:visible h2").textContent(), "Music Lab");
  assert.equal(await page.locator("#game-results").textContent(), "1 game to explore");
  await search.press("Escape");
  assert.equal(await search.inputValue(), "");
  assert.equal(await page.locator(".game-card:visible").count(), all);

  await search.fill("Mohs");
  assert.equal(await page.locator(".game-card:visible h2").textContent(), "Rock Detective", "learning topics must search the registry notes");
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  assert.equal(await page.evaluate(() => document.activeElement.id), "game-search");

  const kieran = page.getByRole("button", { name: "👶 Kieran", exact: true });
  await kieran.focus();
  await kieran.press("Space");
  assert.equal(await kieran.getAttribute("aria-pressed"), "true", "kid controls should work with the keyboard");
  const babyGames = await page.locator(".game-card:visible").count();
  assert.ok(babyGames > 0 && babyGames < all);
  await search.fill("World Trek");
  assert.equal(await page.locator(".game-card:visible").count(), 0, "search and kid filters must combine");
  assert.equal(await page.locator(".game-card:not([hidden])").count(), 0, "filtered links must be hidden for assistive technology");
  assert.ok(await page.locator("#empty-state").isVisible());
  assert.ok(await page.getByRole("button", { name: "🎲 Surprise me!", exact: true }).isDisabled());
  assert.equal(await page.locator("#game-results").textContent(), "0 games to explore");

  await page.getByRole("button", { name: "🌈 Show all games", exact: true }).click();
  assert.equal(await page.locator(".game-card:visible").count(), all);
  assert.equal(await search.inputValue(), "");
  assert.equal(await page.evaluate(() => document.activeElement.id), "game-search");
  assert.equal(await page.locator('[data-kid="all"]').getAttribute("aria-pressed"), "true");
  assert.ok(await page.locator("#empty-state").isHidden());

  await kieran.click();
  await page.reload({ waitUntil: "load" });
  assert.equal(await kieran.getAttribute("aria-pressed"), "true", "a valid saved kid selection should survive reload");
  assert.equal(await page.locator(".game-card:visible").count(), babyGames);
  await page.locator('[data-kid="all"]').click();

  const layout = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  assert.ok(layout.scroll <= layout.width + 1, `landing page should fit a ${layout.width}px viewport`);
  assert.ok((await search.boundingBox()).height >= 44);
  const reduced = await page.locator(".game-card").first().evaluate((card) => ({
    cardAnimation: getComputedStyle(card).animationName,
    blobAnimation: getComputedStyle(document.querySelector(".blob")).animationName,
    scroll: getComputedStyle(document.documentElement).scrollBehavior
  }));
  assert.deepEqual(reduced, { cardAnimation: "none", blobAnimation: "none", scroll: "auto" });
}

(async function main() {
  const server = await startServer();
  let browser;
  const base = `http://127.0.0.1:${server.address().port}/`;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });

    await withPage(browser, base, { viewport: { width: 1280, height: 800 } }, async (page, _context, url) => {
      await page.goto(url);
      await page.evaluate(() => {
        localStorage.setItem("arcade.kid", '\"][broken');
        localStorage.setItem("arcade.last", JSON.stringify({ url: "games/music-lab/", title: "Fake old title", emoji: '<img src=x onerror="throw new Error()">' }));
      });
      await page.reload();
      assert.equal(await page.locator('[data-kid="all"]').getAttribute("aria-pressed"), "true", "malformed stored kid must fall back safely");
      assert.equal(await page.locator(".resume-banner b").textContent(), "Music Lab", "resume metadata must come from the current registry");
      assert.equal(await page.locator(".resume-banner img").count(), 0);
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.activeElement.className), "skip-link");
      await page.keyboard.press("Enter");
      assert.equal(await page.evaluate(() => document.activeElement.id), "main-content");
      await page.locator(".game-card").first().focus();
      await page.keyboard.press("Tab");
      const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineWidth);
      assert.equal(outline, "3px", "game links must have a visible keyboard focus ring");
      for (const saved of ["{broken JSON", JSON.stringify({ url: "javascript:alert(1)" }), "null"]) {
        await page.evaluate((value) => localStorage.setItem("arcade.last", value), saved);
        await page.reload();
        assert.equal(await page.locator(".resume-banner").count(), 0, "invalid saved game URLs and metadata must be ignored");
      }
    });
    console.log("PASS: corrupt saved preferences, canonical resume metadata and keyboard navigation");

    for (const viewport of [{ width: 1280, height: 800 }, { width: 320, height: 740 }]) {
      await withPage(browser, base, { viewport }, testFilters);
      console.log(`PASS: search, kid filters, result status, empty state, reset and reduced motion at ${viewport.width}px`);
    }

    await withPage(browser, base, {}, async (page, context, url) => {
      await context.addInitScript(() => {
        for (const method of ["getItem", "setItem"]) {
          Object.defineProperty(Storage.prototype, method, { value: function () { throw new DOMException("Storage disabled", "SecurityError"); } });
        }
      });
      await page.goto(url);
      await page.getByRole("searchbox", { name: "Find a game" }).fill("Unit Converter");
      assert.equal(await page.locator(".game-card:visible").count(), 1);
      await page.getByRole("button", { name: "🎲 Surprise me!", exact: true }).click();
      await page.waitForURL("**/games/unit-converter/");
    });
    console.log("PASS: arcade remains playable without localStorage; Surprise me respects search");
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
