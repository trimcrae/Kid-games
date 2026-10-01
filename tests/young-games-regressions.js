#!/usr/bin/env node
"use strict";

// Focused checks for interactions that used to lose a round, double-award
// progress, or break the youngest kids' games in private browser sessions.
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright-core");
const ROOT = path.resolve(__dirname, "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".mp3": "audio/mpeg" };

async function visibility(page, hidden) {
  await page.evaluate((value) => {
    Object.defineProperty(document, "hidden", { configurable: true, value });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
}

async function run(browser, base, device) {
  const context = await browser.newContext(device);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  try {
    await page.goto(base + "/games/baby-taps/");
    await page.locator(".thing:not(.gone)").first().click();
    await page.locator(".thing:not(.gone)").first().focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("#count").textContent(), "2 pops", "keyboard works immediately after a pointer tap");
    await page.locator(".thing:not(.gone)").first().dispatchEvent("pointerdown", { button: 2, pointerType: "mouse" });
    assert.equal(await page.locator("#count").textContent(), "2 pops", "right click does not pop a shape");

    await page.goto(base + "/games/music-lab/");
    await page.locator('[data-mode="names"]').click();
    const letter = await page.locator("#big-note").textContent();
    await page.locator(`[data-note="${letter}4"]`).evaluate((button) => {
      button.click(); button.click(); button.click();
    });
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("music-lab.v1")).nameStars), 1,
      "one correct note earns one star despite repeated activation");
    await page.locator("#prompt-actions button").first().click();
    const scoreAfterManualQuestion = await page.locator("#scorebar").textContent();
    await page.waitForTimeout(1000);
    assert.equal(await page.locator("#scorebar").textContent(), scoreAfterManualQuestion,
      "manually requesting a note cancels the previous automatic question");

    await page.locator('[data-mode="echo"]').click();
    await page.locator("#prompt-actions button").first().click();
    await visibility(page, true);
    const listening = await page.locator("#prompt-text").textContent();
    await page.waitForTimeout(1500);
    assert.equal(await page.locator("#prompt-text").textContent(), listening, "Echo remains paused while hidden");
    await visibility(page, false);
    await page.waitForFunction(() => document.getElementById("prompt-text").textContent.startsWith("Your turn!"));

    await page.locator('[data-mode="staff"]').click();
    await page.locator("#chips button").filter({ hasText: "Speed round" }).click();
    await page.locator("#prompt-actions button").first().click();
    await visibility(page, true);
    const raceScore = await page.locator("#scorebar").textContent();
    await page.waitForTimeout(1100);
    assert.equal(await page.locator("#scorebar").textContent(), raceScore, "music speed round clock pauses");
    await visibility(page, false);
    await page.waitForFunction(() => document.getElementById("scorebar").textContent.includes("29s"));

    await page.goto(base + "/games/bubble-pop/");
    await page.locator("#start-btn").click();
    await page.waitForTimeout(250);
    await visibility(page, true);
    const beforePause = await page.locator("#time").textContent();
    const bubble = page.locator(".bubble:not(.pop)").first();
    const bounds = await bubble.boundingBox();
    await page.waitForTimeout(1100);
    assert.equal(await page.locator("#time").textContent(), beforePause, "bubble countdown pauses");
    const pausedBounds = await bubble.boundingBox();
    assert.ok(Math.abs(bounds.y - pausedBounds.y) < 1, "bubbles stop rising while hidden");
    const beforeHiddenTap = await page.locator("#score").textContent();
    await bubble.evaluate((button) => button.click());
    assert.equal(await page.locator("#score").textContent(), beforeHiddenTap, "hidden game rejects input");
    await visibility(page, false);
    await page.waitForTimeout(1100);
    assert.ok(Number(await page.locator("#time").textContent()) < Number(beforePause), "bubble countdown resumes");

    await page.goto(base + "/games/princess-dressup/");
    assert.equal(await page.locator(".stage").evaluate((stage) => stage.inert), true, "dressing room makes covered controls inert");
    await page.locator("#start-btn").focus();
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement.id), "mute-2", "dialog wraps keyboard focus");
    await page.locator("#start-btn").click();
    const target = await page.locator("#target-char").textContent();
    await page.locator(".gem").filter({ hasText: new RegExp("^" + target + "$") }).click();
    assert.equal(await page.locator("#wardrobe-btn").isDisabled(), true, "wardrobe cannot interrupt an earned-piece transition");
    await page.waitForFunction(() => !document.getElementById("wardrobe-btn").disabled);
    const nextTarget = await page.locator("#target-char").textContent();
    await page.locator("#wardrobe-btn").click();
    await page.locator("#start-btn").click();
    assert.equal(await page.locator("#target-char").textContent(), nextTarget, "dressing room preserves the current puzzle");
    assert.deepEqual(errors, [], "all four games run without uncaught errors");
  } finally {
    await context.close();
  }
}

async function corruptAndBlockedSaves(browser, base) {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    localStorage.setItem("music-lab.v1", JSON.stringify({ songs: null, tune: [null, { note: "X9", t: -1 }], nameStars: "bad", staffStars: -2 }));
    localStorage.setItem("bubblePopBest", '"broken"');
    localStorage.setItem("bubblePopStars", '{"normal":1000000000}');
    localStorage.setItem("princess.stars", "-1");
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base + "/games/music-lab/");
  await page.locator('[data-mode="songs"]').click();
  await page.locator('[data-mode="names"]').click();
  assert.ok((await page.locator("#scorebar").textContent()).includes("Stars: 0"));
  await page.goto(base + "/games/bubble-pop/");
  assert.equal(await page.locator("#best").textContent(), "0");
  assert.equal(await page.locator('[data-level="normal"] .chip-stars').textContent(), "⭐⭐⭐");
  assert.deepEqual(errors, [], "corrupt saves do not stop music or bubble games");
  await context.close();

  const privateContext = await browser.newContext();
  await privateContext.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Blocked", "SecurityError"); } });
  });
  const privatePage = await privateContext.newPage();
  const privateErrors = [];
  privatePage.on("pageerror", (error) => privateErrors.push(error.message));
  await privatePage.goto(base + "/games/princess-dressup/");
  await privatePage.locator("#start-btn").click();
  assert.equal(await privatePage.locator(".gem").count(), 3, "Princess remains playable when storage is blocked");
  assert.deepEqual(privateErrors, []);
  await privateContext.close();
}

async function main() {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "");
      const file = path.resolve(ROOT, relative.endsWith("/") || !relative ? relative + "index.html" : relative);
      if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
      const data = await fs.readFile(file);
      res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
      res.end(data);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
    for (const [name, device] of Object.entries({ Desktop: { viewport: { width: 1280, height: 800 } }, Phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } })) {
      await run(browser, base, device);
      console.log(`PASS young games: ${name}`);
    }
    await corruptAndBlockedSaves(browser, base);
    console.log("PASS young games: corrupt and blocked saves");
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
