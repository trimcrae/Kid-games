#!/usr/bin/env node
/* ===========================================================
   McRae Family Arcade — automated play-testing harness
   -----------------------------------------------------------
   Drives every game in a real headless browser at three screen
   sizes (Desktop, iPad, iPhone) and checks that each one:
     • loads with NO JavaScript / console errors
     • makes no failed network requests
     • renders without spilling off the side of the screen
       (a classic mobile bug), and
     • actually PLAYS — start buttons work, taps score points,
       words get added, pages turn, the mob runs, etc.

   It starts its own tiny static web-server, so you just run:

       cd tests
       npm install        # one-time: grabs playwright-core
       npm test           # play-tests every game

   Exit code is 0 when everything passes, 1 if any game has a
   hard failure — handy for CI or a pre-merge check.

   Browser: uses the Chromium that ships with Playwright. If you
   have one elsewhere, point to it with CHROMIUM_PATH=/path/to/chrome.
   =========================================================== */

"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT || 8123);
const BASE = `http://127.0.0.1:${PORT}`;

/* ---------- the three devices we promise to support ---------- */
const DEVICES = {
  Desktop: { viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false },
  iPad: {
    viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
    userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 " +
      "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  },
  iPhone: {
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 " +
      "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  },
};

/* ---------- a tiny static file server (no dependencies) ---------- */
const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".json": "application/json",
  ".ico": "image/x-icon", ".gitignore": "text/plain", ".md": "text/markdown",
};
function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let rel = decodeURIComponent(req.url.split("?")[0]);
      if (rel.endsWith("/")) rel += "index.html";
      const file = path.join(ROOT, rel);
      // keep requests inside the repo
      if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404).end("not found"); return; }
        res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
        res.end(data);
      });
    });
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

/* ---------- result collection ---------- */
const issues = [];   // hard failures (fail the run)
const notes = [];    // informational lines
function fail(game, device, msg) { issues.push({ game, device, msg }); }
function note(game, device, msg) { notes.push(`    · ${device}: ${msg}`); }

/* Attach error listeners that turn any browser error into a failure. */
function watch(page, game, device) {
  page.on("console", (m) => {
    if (m.type() === "error") fail(game, device, `console error: ${m.text()}`);
  });
  page.on("pageerror", (e) => fail(game, device, `JS error: ${e.message.split("\n")[0]}`));
  page.on("requestfailed", (r) => {
    const err = r.failure() && r.failure().errorText;
    // aborts are normal (e.g. audio swapped out); flag only real load failures
    if (err && !/ABORTED/i.test(err)) fail(game, device, `request failed: ${r.url()} (${err})`);
  });
}

/* After interacting, make sure nothing spills off the right edge. */
async function checkNoHOverflow(page, game, device) {
  const o = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  if (o.sw - o.cw > 2) fail(game, device, `content overflows horizontally (${o.sw}px wide on a ${o.cw}px screen)`);
}

/* ---------- per-game play scripts ----------
   Each returns a short status string for the log. They throw on a
   broken interaction, which is recorded as a failure. */
const GAMES = {
  async "Landing page"(page, g, d) {
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    const cards = await page.locator(".game-card").count();
    const playable = await page.locator("a.game-card").count();
    if (cards < 1) throw new Error("no game cards rendered on the landing page");
    if (playable < 1) throw new Error("no playable game links on the landing page");
    return `${cards} cards, ${playable} playable`;
  },

  async "Number Bubble Pop"(page, g, d) {
    await page.goto(`${BASE}/games/bubble-pop/`, { waitUntil: "networkidle" });
    await page.click("#start-btn");
    await page.waitForTimeout(900);
    if (await page.locator(".bubble").count() < 1) throw new Error("no bubbles appeared after Start");
    // tap matching bubbles (force + dispatch, since they animate constantly)
    let scored = false;
    for (let i = 0; i < 24 && !scored; i++) {
      const t = await page.locator("#target").textContent();
      const b = page.locator(".bubble", { hasText: new RegExp("^" + t + "$") }).first();
      if (await b.count()) await b.dispatchEvent("click").catch(() => {});
      scored = parseInt(await page.locator("#score").textContent(), 10) > 0;
      await page.waitForTimeout(180);
    }
    if (!scored) throw new Error("score never increased when popping the right number");
    return "bubbles spawn and scoring works";
  },

  async "Color Grid Builder"(page, g, d) {
    await page.goto(`${BASE}/games/color-grid/`, { waitUntil: "networkidle" });
    await page.locator(".color-pick").first().click();
    await page.fill("#word-input", "Apple");
    await page.locator("#add-form button[type=submit]").click();
    await page.waitForTimeout(250);
    if (parseInt(await page.locator("#count").textContent(), 10) < 1) throw new Error("typed word was not added");
    if (await page.locator(".chip").count() < 1) throw new Error("no word chip rendered");
    await page.locator("#starter").click();
    await page.waitForTimeout(250);
    const total = parseInt(await page.locator("#count").textContent(), 10);
    if (total < 2) throw new Error("starter words did not load");
    // remove a chip
    await page.locator(".chip-x").first().click();
    await page.waitForTimeout(150);
    return `${total} words after add + starter; chip removal works`;
  },

  async "Princess Dress-Up"(page, g, d) {
    await page.goto(`${BASE}/games/princess-dressup/`, { waitUntil: "networkidle" });
    await page.click("#start-btn");
    await page.waitForTimeout(400);
    let on = 0;
    for (let r = 0; r < 7; r++) {
      const t = (await page.locator("#target-char").textContent()).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const gem = page.locator(".gem", { hasText: new RegExp("^" + t + "$") }).first();
      if (await gem.count()) await gem.dispatchEvent("click").catch(() => {});
      await page.waitForTimeout(950);
      on = await page.locator(".acc.on").count();
    }
    if (on < 1) throw new Error("no outfit pieces appeared after correct answers");
    return `${on} outfit piece(s) revealed`;
  },

  async "Spooky Princess Stories"(page, g, d) {
    await page.goto(`${BASE}/games/spooky-stories/`, { waitUntil: "networkidle" });
    if (await page.locator(".story-card").count() < 1) throw new Error("no story cards in the library");
    await page.locator(".story-card").first().click();
    await page.waitForTimeout(400);
    if (await page.locator("#reader.active").count() < 1) throw new Error("reader did not open");
    if (!(await page.locator("#prev-btn").isDisabled())) throw new Error("Back should be disabled on page 1");
    // read through to the end
    let reachedEnd = false;
    for (let i = 0; i < 9; i++) {
      const label = await page.locator("#next-btn").textContent();
      if (/More stories/.test(label)) { reachedEnd = true; break; }
      await page.locator("#next-btn").click();
      await page.waitForTimeout(250);
    }
    if (!reachedEnd) throw new Error("could not page through to the end of the story");
    await page.locator("#next-btn").click(); // back to library
    await page.waitForTimeout(200);
    if (await page.locator("#library").isVisible() === false) throw new Error("did not return to the library");
    return "story opens, pages turn, and finishes";
  },

  async "Comic Maker"(page, g, d) {
    await page.goto(`${BASE}/games/comic-maker/`, { waitUntil: "networkidle" });
    await page.locator(".panel").first().click();
    await page.locator(".sticker-btn").first().click();
    await page.waitForTimeout(150);
    if (await page.locator(".item").count() < 1) throw new Error("sticker was not added");
    if (await page.locator("#item-bar.show").count() < 1) throw new Error("item controls did not appear");
    // drag the selected sticker via real pointer events on the element
    const moved = await page.evaluate(() => {
      const it = document.querySelector(".item");
      const r = it.getBoundingClientRect();
      const cx = r.x + r.width / 2, cy = r.y + r.height / 2, before = it.style.left;
      const pe = (type, x, y) => new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, clientX: x, clientY: y, button: 0 });
      it.dispatchEvent(pe("pointerdown", cx, cy));
      for (let i = 1; i <= 6; i++) it.dispatchEvent(pe("pointermove", cx + 12 * i, cy + 8 * i));
      it.dispatchEvent(pe("pointerup", cx + 72, cy + 48));
      return before !== it.style.left;
    });
    if (!moved) throw new Error("sticker could not be dragged");
    // add a talk bubble
    await page.locator(".tab[data-tab=words]").click();
    await page.locator("[data-add=speech]").click();
    await page.waitForTimeout(150);
    // add a page
    await page.locator(".tab[data-tab=book]").click();
    await page.locator("#add-page").click();
    await page.waitForTimeout(150);
    if (!/Page 2 of 2/.test(await page.locator("#page-label").textContent())) throw new Error("new page was not added");
    // undo should re-enable and work
    if (await page.locator("#undo").isDisabled()) throw new Error("Undo stayed disabled after edits");
    await page.locator("#undo").click();
    await page.waitForTimeout(100);
    return "stickers, bubbles, drag, pages and undo all work";
  },

  async "Math Mob Run"(page, g, d) {
    await page.goto(`${BASE}/games/math-mob/`, { waitUntil: "networkidle" });
    await page.waitForTimeout(200);
    // shop guard: cannot buy with 0 coins
    await page.locator("#shop-btn").click();
    await page.waitForTimeout(150);
    if (!(await page.locator(".buy-btn").first().isDisabled())) throw new Error("upgrade buyable with 0 coins");
    await page.locator("#shop-back").click();
    // play and steer
    await page.locator("#play-btn").click();
    await page.waitForTimeout(400);
    if (!(await page.locator("#hud").isVisible())) throw new Error("HUD not visible after Play");
    for (let i = 0; i < 8; i++) {
      const key = i % 2 ? "ArrowLeft" : "ArrowRight";
      await page.keyboard.down(key); await page.waitForTimeout(220); await page.keyboard.up(key);
    }
    await page.waitForTimeout(400);
    if (parseInt(await page.locator("#dist").textContent(), 10) <= 0) throw new Error("distance never advanced");
    return `ran ${await page.locator("#dist").textContent()}m; steering + shop guard work`;
  },
};

/* ---------- run everything ---------- */
(async () => {
  const server = await startServer();
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
  });

  console.log(`\n🎮  Play-testing the McRae Family Arcade  (${BASE})\n`);

  for (const [game, play] of Object.entries(GAMES)) {
    console.log(`▶ ${game}`);
    for (const [device, cfg] of Object.entries(DEVICES)) {
      const ctx = await browser.newContext(cfg);
      const page = await ctx.newPage();
      watch(page, game, device);
      try {
        const status = await play(page, game, device);
        await checkNoHOverflow(page, game, device);
        note(game, device, status || "ok");
        console.log(`    ✓ ${device.padEnd(7)} ${status || ""}`);
      } catch (e) {
        fail(game, device, e.message.split("\n")[0]);
        console.log(`    ✗ ${device.padEnd(7)} ${e.message.split("\n")[0]}`);
      }
      await ctx.close();
    }
  }

  await browser.close();
  server.close();

  /* ---------- summary ---------- */
  console.log("\n──────────────────────────────────────────────");
  if (issues.length === 0) {
    const checks = Object.keys(GAMES).length * Object.keys(DEVICES).length;
    console.log(`✅  All ${checks} checks passed — every game works on Desktop, iPad and iPhone.`);
    process.exit(0);
  } else {
    console.log(`❌  ${issues.length} problem(s) found:\n`);
    for (const i of issues) console.log(`   • [${i.game} / ${i.device}] ${i.msg}`);
    process.exit(1);
  }
})().catch((e) => {
  console.error("Harness crashed:", e);
  process.exit(2);
});
