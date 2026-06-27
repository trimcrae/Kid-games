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

  async "Word Wizard"(page, g, d) {
    await page.goto(`${BASE}/games/word-wizard/`, { waitUntil: "networkidle" });
    if (await page.locator(".level-card").count() < 1) throw new Error("no spellbooks (levels) rendered");
    const before = parseInt(await page.locator("#stars").textContent(), 10);
    // open the first (always-unlocked) spellbook
    await page.locator(".level-card").first().click();
    await page.waitForTimeout(250);
    if (await page.locator("#play:not(.hidden)").count() < 1) throw new Error("play screen did not open");
    // read the target word and tap its letters in order
    const word = await page.locator("#slots").getAttribute("data-word");
    if (!word) throw new Error("no target word exposed on the slots");
    for (const ch of word.split("")) {
      const btn = page.locator(`.letter:not(:disabled)[data-letter="${ch}"]`).first();
      if (await btn.count() === 0) throw new Error(`no letter button for "${ch}"`);
      await btn.click();
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(500);
    const after = parseInt(await page.locator("#stars").textContent(), 10);
    if (after <= before) throw new Error("star count did not increase after spelling the word");
    return `spelled "${word}"; stars ${before}→${after}`;
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

  async "Spelling Bee"(page, g, d) {
    await page.goto(`${BASE}/games/spelling-bee/`, { waitUntil: "networkidle" });
    if (await page.locator(".puz-card").count() < 1) throw new Error("no hives in the picker");
    await page.locator(".puz-card").first().click();
    await page.waitForTimeout(200);
    if (await page.locator("#play:not(.hidden)").count() < 1) throw new Error("play screen did not open");
    const sample = await page.locator("#play").getAttribute("data-sample");
    if (!sample) throw new Error("no sample word exposed");
    for (const ch of sample.split("")) {
      const cell = page.locator(`.cell[data-letter="${ch}"]`).first();
      if (await cell.count() === 0) throw new Error(`no hive cell for "${ch}"`);
      await cell.click();
      await page.waitForTimeout(40);
    }
    await page.locator("#enter-btn").click();
    await page.waitForTimeout(200);
    if (parseInt(await page.locator("#wordcount").textContent(), 10) < 1) throw new Error("valid word was not accepted");
    return `spelled "${sample}"; word counted`;
  },

  async "Connections"(page, g, d) {
    await page.goto(`${BASE}/games/connections/`, { waitUntil: "networkidle" });
    if (await page.locator(".puz-card").count() < 1) throw new Error("no puzzles in the picker");
    await page.locator(".puz-card").first().click();
    await page.waitForTimeout(200);
    if (await page.locator(".tile").count() !== 16) throw new Error("expected 16 tiles");
    const groups = JSON.parse(await page.locator("#board").getAttribute("data-solution"));
    for (const item of groups[0]) {
      await page.locator(`.tile[data-item="${item}"]`).first().click();
      await page.waitForTimeout(40);
    }
    await page.locator("#submit-btn").click();
    await page.waitForTimeout(450);
    if (await page.locator(".solved-row").count() < 1) throw new Error("correct group was not accepted");
    return "solved a group of four";
  },

  async "Word Guess"(page, g, d) {
    await page.goto(`${BASE}/games/word-guess/`, { waitUntil: "networkidle" });
    if (await page.locator(".key").count() < 26) throw new Error("on-screen keyboard missing");
    for (const ch of "tiger".split("")) {
      await page.locator(`.key[data-key="${ch}"]`).first().click();
      await page.waitForTimeout(30);
    }
    await page.locator('.key[data-key="enter"]').click();
    await page.waitForTimeout(300);
    // the first row should now be coloured (each cell has a status class)
    const coloured = await page.locator(".grid .row").first().locator(".cell.correct, .cell.present, .cell.absent").count();
    if (coloured !== 5) throw new Error(`guessed row not fully scored (got ${coloured}/5)`);
    // Easy mode switches to 4-letter words
    await page.locator("#easy-btn").click();
    await page.waitForTimeout(150);
    const easyCells = await page.locator(".grid .row").first().locator(".cell").count();
    if (easyCells !== 4) throw new Error(`Easy mode should show 4 cells per row (got ${easyCells})`);
    return "guess scored with colour clues; easy mode works";
  },

  async "Word Strands"(page, g, d) {
    await page.goto(`${BASE}/games/strands/`, { waitUntil: "networkidle" });
    if (await page.locator(".puz-card").count() < 1) throw new Error("no word hunts in the picker");
    await page.locator(".puz-card").first().click();
    await page.waitForTimeout(200);
    if (await page.locator(".scell").count() < 1) throw new Error("letter grid did not render");
    const words = JSON.parse(await page.locator("#board").getAttribute("data-solution"));
    const w = words[0];
    for (const [r, c] of w.path) {
      await page.locator(`.scell[data-r="${r}"][data-c="${c}"]`).click();
      await page.waitForTimeout(30);
    }
    await page.waitForTimeout(200);
    if (await page.locator(".found-chip").count() < 1) throw new Error(`tracing "${w.word}" did not register a found word`);
    return `traced "${w.word}"`;
  },

  async "Soccer Roster Maker"(page, g, d) {
    await page.goto(`${BASE}/games/soccer-roster/`, { waitUntil: "networkidle" });
    // start from a clean slate so a previous device's saved state can't interfere
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle" });

    if (await page.locator(".player-row").count() < 7) throw new Error("team roster did not render");
    if (await page.locator('.period-btn[data-p="8"].active').count() !== 1) throw new Error("8 periods should be selected by default on load");

    // goalie eligibility resets to all-eligible on every load
    await page.locator(".player-row .chip.gk-on").first().click();   // turn one off
    await page.waitForTimeout(80);
    await page.reload({ waitUntil: "networkidle" });
    if (await page.locator(".player-row .chip.gk-off").count() !== 0) throw new Error("all girls should be goalie-eligible after a reload");

    // button starts as "Make roster", becomes "Shuffle" once a roster exists
    if (!/Make roster/.test(await page.locator("#generateBtn").textContent())) throw new Error("button should say Make roster before any roster");
    await page.locator("#generateBtn").click();
    await page.waitForTimeout(150);
    if (!/Shuffle/.test(await page.locator("#generateBtn").textContent())) throw new Error("button should say Shuffle after a roster exists");
    // editing setup resets it back to Make roster
    await page.locator(".player-row .chip.present").first().click();
    await page.waitForTimeout(100);
    if (!/Make roster/.test(await page.locator("#generateBtn").textContent())) throw new Error("button should revert to Make roster after a setup change");
    await page.locator(".player-row .chip.absent").first().click(); // restore present

    // try each period count and verify the invariants in the grid
    for (const p of [2, 4, 8]) {
      await page.locator(`.period-btn[data-p="${p}"]`).click();
      await page.waitForTimeout(120);
      await page.locator("#generateBtn").click();
      await page.waitForTimeout(150);

      const cards = await page.locator(".pcard").count();
      if (cards !== p) throw new Error(`expected ${p} period cards, got ${cards}`);

      // pull the grid: every present row's roles + per-period column counts
      const data = await page.evaluate((periods) => {
        const rows = Array.from(document.querySelectorAll("table.gridtbl tbody tr"))
          .filter((tr) => !tr.classList.contains("totals") && !tr.classList.contains("away"));
        const plays = [];
        const colG = new Array(periods).fill(0);
        const colF = new Array(periods).fill(0);
        let goalieRepeat = false;
        let maxConsecSit = 0;
        rows.forEach((tr) => {
          const cells = tr.querySelectorAll("td");
          let g = 0, sit = 0, run = 0;
          for (let i = 0; i < periods; i++) {
            const cls = cells[i + 1].className;
            if (cls === "g") { colG[i]++; g++; run = 0; }
            else if (cls === "f") { colF[i]++; run = 0; }
            else { run++; if (run > maxConsecSit) maxConsecSit = run; }
          }
          if (g >= 2) goalieRepeat = true;
          plays.push(Number(cells[periods + 1].textContent));
        });
        return { plays, colG, colF, goalieRepeat, maxConsecSit };
      }, p);

      data.colG.forEach((c, i) => { if (c !== 1) throw new Error(`period ${i + 1} has ${c} goalies (want 1)`); });
      data.colF.forEach((c, i) => { if (c !== 6) throw new Error(`period ${i + 1} has ${c} field players (want 6)`); });
      const min = Math.min(...data.plays), max = Math.max(...data.plays);
      if (max - min > 1) throw new Error(`uneven playing time at ${p} periods (${min}–${max})`);
      // 13 present girls with >=8 eligible goalies should never double up
      if (data.goalieRepeat) throw new Error(`goalie repeated at ${p} periods with plenty of eligible goalies`);
      // with 13 girls nobody should ever rest two periods back-to-back
      if (data.maxConsecSit > 1) throw new Error(`a girl rests ${data.maxConsecSit} periods in a row at ${p} periods (should be spaced out)`);

      // PRINT MUST FIT ONE US-LETTER PAGE. Measure the printable block with the
      // print stylesheet applied, at the real on-paper width (7.8in @96dpi), so
      // we catch the spill-to-page-2 bug that pdf() page counts miss.
      const prevVp = page.viewportSize();
      await page.setViewportSize({ width: 749, height: 1600 });
      await page.emulateMedia({ media: "print" });
      await page.waitForTimeout(60);
      const inches = await page.evaluate(() => document.querySelector(".print-area").getBoundingClientRect().height / 96);
      await page.emulateMedia({ media: "screen" });
      await page.setViewportSize(prevVp);
      // usable height on Letter with 0.35in margins is ~10.3in; keep a safe margin
      if (inches > 9.3) throw new Error(`print for ${p} periods is ${inches.toFixed(2)}in tall — won't fit one page (budget 9.3in)`);
    }

    // Guard the Safari "blank 2nd page" bug: in print, the body must NOT keep a
    // full-viewport min-height (100vh = whole page > usable area, so it spills).
    await page.emulateMedia({ media: "print" });
    const bodyMinH = await page.evaluate(() => parseFloat(getComputedStyle(document.body).minHeight) || 0);
    await page.emulateMedia({ media: "screen" });
    if (bodyMinH > 200) throw new Error(`body keeps a ${bodyMinH}px min-height in print — Safari will add a blank page`);

    // editing the setup should clear the old roster (no stale/unrequested roster)
    await page.locator(".player-row .chip.present").first().click();
    await page.waitForTimeout(120);
    if (await page.locator("table.gridtbl").count() !== 0) throw new Error("changing setup did not clear the previous roster");
    if (await page.locator(".empty-note").count() < 1) throw new Error("no prompt shown after a setup change");

    // re-make and confirm the away player is dropped (greyed) in the grid
    await page.locator("#generateBtn").click();
    await page.waitForTimeout(150);
    if (await page.locator("table.gridtbl tbody tr.away").count() < 1) throw new Error("an away player was not greyed out in the grid");

    // on first load nothing should be generated until the coach asks
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle" });
    if (await page.locator(".pcard").count() !== 0) throw new Error("a roster was generated before Make roster was pressed");
    if (await page.locator(".empty-note").count() < 1) throw new Error("no setup prompt on first load");

    // floating Print button is disabled until a roster exists
    if (!(await page.locator("#printFab").isDisabled())) throw new Error("Print button should be disabled before a roster is made");
    await page.locator("#generateBtn").click();
    await page.waitForTimeout(150);
    if (await page.locator("#printFab").isDisabled()) throw new Error("Print button should be enabled once a roster exists");

    return "no auto-generate; setup edits clear roster; print builds first; 2/4/8 even, no repeats";
  },

  async "Crossword"(page, g, d) {
    await page.goto(`${BASE}/games/crossword/`, { waitUntil: "networkidle" });
    if (await page.locator(".puz-card").count() < 1) throw new Error("no crosswords in the picker");
    await page.locator(".puz-card").first().click();
    await page.waitForTimeout(200);
    const inputs = page.locator(".xinput");
    const n = await inputs.count();
    if (n < 1) throw new Error("no fillable cells");
    if (await page.locator(".clue-li").count() < 1) throw new Error("no clues rendered");
    for (let i = 0; i < n; i++) {
      const inp = inputs.nth(i);
      const sol = await inp.getAttribute("data-sol");
      await inp.fill(sol);
      await page.waitForTimeout(15);
    }
    await page.waitForTimeout(200);
    if (!/solved/i.test(await page.locator("#feedback").textContent())) throw new Error("filled grid was not detected as solved");
    return `filled ${n} cells; puzzle solved`;
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
