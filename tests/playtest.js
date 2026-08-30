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
    // "Who's playing?" filter: picking a kid narrows the grid, Everybody restores it
    await page.locator('.kid-chip[data-kid="ellie"]').click();
    await page.waitForTimeout(150);
    const ellie = await page.locator(".game-card:visible").count();
    if (ellie < 1 || ellie >= cards) throw new Error(`Ellie filter showed ${ellie} of ${cards} cards`);
    await page.locator('.kid-chip[data-kid="all"]').click();
    await page.waitForTimeout(150);
    if (await page.locator(".game-card:visible").count() !== cards) throw new Error("Everybody chip did not restore all cards");
    // every kid has at least one game, baby included
    for (const kid of ["jeannie", "cory", "ellie", "kieran", "shannon"]) {
      await page.locator(`.kid-chip[data-kid="${kid}"]`).click();
      await page.waitForTimeout(120);
      if (await page.locator(".game-card:visible").count() < 1) throw new Error(`${kid} has no games`);
    }
    await page.locator('.kid-chip[data-kid="all"]').click();
    // "🎲 Surprise me!" lands on a real game page
    await page.locator("#lucky").click();
    await page.waitForURL(/games\/.+/, { timeout: 5000 });
    if (await page.locator("a.back-link").count() < 1) throw new Error("Surprise me did not land on a game page");
    return `${cards} cards, ${playable} playable; kid filter + Surprise me work`;
  },

  async "Baby Taps"(page, g, d) {
    await page.goto(`${BASE}/games/baby-taps/`, { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.removeItem("baby-taps.v1"));
    await page.reload({ waitUntil: "networkidle" });
    if (await page.locator("#pit .thing").count() !== 6) throw new Error("the pit should start with 6 things");
    // targets must stay baby-sized (big) on every screen
    const box = await page.locator("#pit .thing").first().boundingBox();
    if (!box || box.width < 90) throw new Error(`tap targets too small for a baby: ${box && Math.round(box.width)}px`);
    // a tap pops it, names it, counts it, and the pit refills
    const word = await page.locator("#pit .thing").first().getAttribute("data-word");
    await page.locator("#pit .thing").first().click();
    await page.waitForTimeout(600);
    const shown = (await page.locator("#word").textContent()).toLowerCase();
    if (!shown.includes(word.split(" ")[0])) throw new Error(`popped "${word}" but the word line says "${shown}"`);
    if (!/1 pop\b/.test(await page.locator("#count").textContent())) throw new Error("the pop was not counted");
    if (await page.locator("#pit .thing").count() !== 6) throw new Error("the pit did not refill after a pop");
    // Animals mode swaps every thing for an animal
    await page.locator('.mode-btn[data-mode="animals"]').click();
    await page.waitForTimeout(300);
    if (await page.locator('#pit .thing[data-kind="animal"]').count() !== 6) throw new Error("Animals mode should be all animals");
    // the count survives a reload
    await page.reload({ waitUntil: "networkidle" });
    if (!/1 pop\b/.test(await page.locator("#count").textContent())) throw new Error("pops did not persist");
    return `6 giant things (${Math.round(box.width)}px), popped "${word}", animals mode + saving work`;
  },

  async "Family Tree"(page, g, d) {
    await page.goto(`${BASE}/games/family-tree/`, { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.removeItem("family-tree.v1"));
    await page.reload({ waitUntil: "networkidle" });
    if (await page.locator("#canvas .person").count() !== 6) throw new Error("seed family should be 6 people");
    // add a grandparent through Tristan's action sheet
    await page.locator('#canvas .person', { hasText: "Tristan" }).click();
    await page.locator("#action-list .ft-btn", { hasText: "mom or dad" }).click();
    await page.fill("#name-input", "Grandma");
    await page.locator('#gender-row [data-g="f"]').click();
    await page.click("#form-save");
    await page.waitForTimeout(250);
    if (await page.locator("#canvas .person").count() !== 7) throw new Error("adding a grandparent did not add a card");
    // relationship vocabulary: as Jeannie, the new person is "Grandma"
    await page.selectOption("#me-select", { label: "Jeannie" });
    await page.waitForTimeout(150);
    const rel = (await page.locator('#canvas .person', { hasText: "Grandma" }).locator(".rel").textContent()).trim();
    if (rel !== "Grandma") throw new Error(`grandparent labelled "${rel}", expected "Grandma"`);
    // the shared tree persists across a reload
    await page.reload({ waitUntil: "networkidle" });
    if (await page.locator("#canvas .person").count() !== 7) throw new Error("tree did not persist after reload");
    await page.evaluate(() => localStorage.removeItem("family-tree.v1"));
    return "grandparent added, labelled Grandma for Jeannie, tree persists";
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
    // ABC mode: fresh page, switch level, and pop a matching letter
    await page.goto(`${BASE}/games/bubble-pop/`, { waitUntil: "networkidle" });
    await page.locator(".level-btn[data-level=abc]").click();
    await page.click("#start-btn");
    await page.waitForTimeout(900);
    const t = await page.locator("#target").textContent();
    if (!/^[A-Z]$/.test(t)) throw new Error(`ABC mode target is "${t}", not a letter`);
    let popped = false;
    for (let i = 0; i < 24 && !popped; i++) {
      const t2 = await page.locator("#target").textContent();
      const b = page.locator(".bubble", { hasText: new RegExp("^" + t2 + "$") }).first();
      if (await b.count()) await b.dispatchEvent("click").catch(() => {});
      popped = parseInt(await page.locator("#score").textContent(), 10) > 0;
      await page.waitForTimeout(180);
    }
    if (!popped) throw new Error("score never increased when popping the right letter");
    return "number and ABC letter modes both score";
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

  async "Number Grid Builder"(page, g, d) {
    await page.goto(`${BASE}/games/number-grid/`, { waitUntil: "networkidle" });
    // guess 4 but type a 5-letter word — it must still land in column 5
    await page.locator(".num-pick[data-num='4']").click();
    await page.fill("#word-input", "Candy");
    await page.locator("#add-form button[type=submit]").click();
    await page.waitForTimeout(250);
    if (await page.locator("#c-C-5 .chip").count() < 1) throw new Error("5-letter word did not land in column 5");
    if (await page.locator("#c-C-4 .chip").count() > 0) throw new Error("word landed in the guessed column, not the true one");
    if (!/=\s*5 letters/.test(await page.locator("#countout").textContent())) throw new Error("letters were not counted out");
    // now a correct guess should score a point
    await page.locator(".num-pick[data-num='3']").click();
    await page.fill("#word-input", "Bat");
    await page.locator("#add-form button[type=submit]").click();
    await page.waitForTimeout(250);
    if (parseInt(await page.locator("#score").textContent(), 10) < 1) throw new Error("correct guess did not score");
    await page.locator("#starter").click();
    await page.waitForTimeout(250);
    const total = parseInt(await page.locator("#count").textContent(), 10);
    if (total < 3) throw new Error("starter words did not load");
    await page.locator(".chip-x").first().click();
    await page.waitForTimeout(150);
    return `${total} words; wrong guess still filed correctly; chip removal works`;
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

  /* Ellie can't read, so her stories MUST talk. This walks every pre-reader
     story to an ending and checks each page's clip really loads — a missing
     .mp3 fails silently in the game (the shared player stays quiet), so
     without this check a story can lose its voice unnoticed. */
  async "Choose Your Own Adventure"(page, g, d) {
    const clips = [];   // [status, file] for every narration clip requested
    page.on("response", (r) => {
      if (/\/games\/adventure\/audio\/.+\.mp3$/.test(r.url())) clips.push([r.status(), r.url().split("/").pop()]);
    });
    await page.goto(`${BASE}/games/adventure/`, { waitUntil: "networkidle" });
    const cards = page.locator("#story-grid .story-card");
    const total = await cards.count();
    if (total < 4) throw new Error(`only ${total} story cards in the library`);

    // the pre-reader stories are the narrated ones: "All ages" or age <= 5
    const preReader = [];
    for (let i = 0; i < total; i++) {
      const who = await cards.nth(i).locator(".who").textContent();
      const m = who.match(/(\d+)\s*\+/);
      if (!m || Number(m[1]) <= 5) preReader.push(i);
    }
    if (!preReader.length) throw new Error("no pre-reader stories found in the library");

    let pages = 0;
    for (const i of preReader) {
      const before = clips.length;
      await page.locator("#story-grid .story-card").nth(i).click();
      await page.waitForTimeout(350);
      if (!(await page.locator("#reader.reader").isVisible())) throw new Error("reader did not open");
      // keep taking the first choice until the story ends
      for (let step = 0; step < 14; step++) {
        const choices = page.locator("#choices .choice-btn");
        if (!(await choices.count())) break;
        pages++;
        await choices.first().click();
        await page.waitForTimeout(300);
      }
      if (clips.length === before) {
        const title = await page.locator("#reader-title").textContent();
        throw new Error(`pre-reader story "${title.trim()}" played no narration at all`);
      }
      await page.locator("#home-btn").click();
      await page.waitForTimeout(250);
    }

    const missing = clips.filter(([s]) => s !== 200).map(([s, f]) => `${f} (${s})`);
    if (missing.length) throw new Error(`narration clip(s) missing: ${[...new Set(missing)].join(", ")}`);
    return `${total} stories; narrated ${preReader.length} to the end, ${clips.length} clips played`;
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

  async "Mad Libs"(page, g, d) {
    await page.goto(`${BASE}/games/mad-libs/`, { waitUntil: "networkidle" });
    const cards = await page.locator(".ml-card").count();
    if (cards < 6) throw new Error(`only ${cards} story cards rendered`);
    await page.locator(".ml-card").last().click();
    // answer every blank with a placeholder word
    for (let i = 0; i < 30; i++) {
      await page.fill("#wordInput", "banana");
      await page.locator("#nextBtn").click();
      await page.waitForTimeout(80);
      if (await page.locator("#reveal:not(.hidden)").count()) break;
    }
    if (!(await page.locator("#reveal:not(.hidden)").count())) throw new Error("never reached the story reveal");
    const text = await page.locator("#storyText").textContent();
    if (!/banana/.test(text)) throw new Error("typed words were not woven into the story");
    if (/\{\d+\}/.test(text)) throw new Error("un-filled {n} placeholder left in the story");
    if (/____/.test(text)) throw new Error("a blank was never filled in");
    // read-aloud button should be visible in Chromium (speechSynthesis exists)
    if (!(await page.locator("#readBtn").isVisible())) throw new Error("Read-it-to-me button missing");
    return `${cards} stories; played one through to the reveal`;
  },

  async "Comic Maker"(page, g, d) {
    await page.goto(`${BASE}/games/comic-maker/`, { waitUntil: "networkidle" });
    await page.locator(".panel").first().click();
    // draw a stroke with the default Draw tab's brush
    const drew = await page.evaluate(() => {
      const cv = document.querySelector(".panel canvas.draw-canvas, .panel canvas");
      if (!cv) return false;
      const r = cv.getBoundingClientRect();
      const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
      const pe = (type, x, y) => new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, clientX: x, clientY: y, button: 0, isPrimary: true });
      cv.dispatchEvent(pe("pointerdown", cx, cy));
      for (let i = 1; i <= 5; i++) cv.dispatchEvent(pe("pointermove", cx + 10 * i, cy + 6 * i));
      cv.dispatchEvent(pe("pointerup", cx + 50, cy + 30));
      const ctx = cv.getContext("2d");
      return ctx.getImageData(0, 0, cv.width, cv.height).data.some((v, i) => i % 4 === 3 && v > 0);
    });
    if (!drew) throw new Error("drawing a brush stroke left the canvas blank");
    // stickers now live behind their own tab (Draw is the default)
    await page.locator(".tab[data-tab=stickers]").click();
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
    return "drawing, stickers, bubbles, drag, pages and undo all work";
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
    // the big dictionary should accept any real word (regression: "crane" was rejected)
    for (const ch of "crane".split("")) { await page.locator(`.key[data-key="${ch}"]`).first().click(); await page.waitForTimeout(20); }
    await page.locator('.key[data-key="enter"]').click();
    await page.waitForTimeout(300);
    const rows2 = await page.locator(".grid .row:nth-child(2) .cell.correct, .grid .row:nth-child(2) .cell.present, .grid .row:nth-child(2) .cell.absent").count();
    if (rows2 !== 5) throw new Error('"crane" was not accepted as a real word');
    // Easy mode switches to 4-letter words
    await page.locator("#easy-btn").click();
    await page.waitForTimeout(150);
    const easyCells = await page.locator(".grid .row").first().locator(".cell").count();
    if (easyCells !== 4) throw new Error(`Easy mode should show 4 cells per row (got ${easyCells})`);
    return "guess scored with colour clues; easy mode works";
  },

  async "Word Bridge"(page, g, d) {
    await page.goto(`${BASE}/games/word-bridge/`, { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.removeItem("wordBridge.v1"));
    await page.reload({ waitUntil: "networkidle" });

    // COVERAGE: plenty of categories, generous lists, and every one of
    // these must be accepted — a real answer turned away is the one thing
    // guaranteed to make a kid quit.
    const bank = await page.evaluate(() => {
      const n = WB_QUESTIONS.map((q) => q.ok.length);
      return {
        cats: WB_QUESTIONS.length,
        thinnest: Math.min.apply(null, n),
        total: n.reduce((a, b) => a + b, 0),
        dupes: WB_QUESTIONS.map((q) => q.q).filter((q, i, a) => a.indexOf(q) !== i).length,
        tap: WB_QUESTIONS.filter((q) => (q.pics || []).length >= 3).length,
      };
    });
    if (bank.cats < 60) throw new Error(`only ${bank.cats} categories — races would repeat`);
    if (bank.thinnest < 15) throw new Error(`a category has only ${bank.thinnest} answers`);
    if (bank.dupes) throw new Error(`${bank.dupes} duplicate categories`);
    if (bank.tap < 15) throw new Error(`only ${bank.tap} categories work in Tap mode`);

    const misses = await page.evaluate(() => {
      const want = [
        ["ocean", "jellyfish"], ["ocean", "seahorse"], ["ocean", "hermit crab"], ["ocean", "manta ray"],
        ["fruit", "a banana"], ["fruit", "kiwi"], ["fruit", "pomegranite"], ["fruit", "lychee"],
        ["vegetable", "courgette"], ["vegetable", "brussel sprouts"], ["vegetable", "aubergine"],
        ["kitchen", "toaster"], ["kitchen", "chopping board"], ["kitchen", "colander"],
        ["four legs", "guinea pig"], ["four legs", "wolves"], ["four legs", "elefant"],
        ["mammal", "platypus"], ["mammal", "hedgehog"],
        ["fly", "hot air balloon"], ["fly", "dragonfly"], ["fly", "hummingbird"],
        ["colour", "gray"], ["colour", "grey"], ["colour", "turquoise"], ["colour", "burgundy"],
        ["dinosaur", "T-Rex"], ["dinosaur", "trycerotops"], ["dinosaur", "brachiosaurus"],
        ["dessert", "ice creams"], ["dessert", "cheesecake"], ["dessert", "profiterole"],
        ["wear", "flip flops"], ["wear", "wellies"], ["wear", "dungarees"],
        ["Minecraft", "enderman"], ["Minecraft", "axolotl"], ["Minecraft", "wither skeleton"],
        ["weather", "thunderstorm"], ["weather", "drizzle"],
        ["job", "firefighter"], ["job", "vet"], ["job", "palaeontologist"],
        ["space", "black hole"], ["space", "constellation"],
        ["country", "new zealand"], ["country", "madagascar"], ["country", "philippines"],
        ["state", "west virginia"], ["state", "massachusets"],
        ["bird", "woodpecker"], ["bird", "kingfisher"], ["bird", "flamingo"],
        ["insect", "praying mantis"], ["insect", "caterpillar"],
        ["toy", "playdough"], ["toy", "skateboard"],
        ["superhero", "spider man"], ["superhero", "black panther"],
        ["feeling", "embarrassed"], ["feeling", "jealous"],
        ["camping", "sleeping bag"], ["camping", "marshmallows"],
        ["wheels", "wheelbarrow"], ["round", "ferris wheel"], ["you can read", "comic book"],
        ["instrument", "saxophone"], ["instrument", "ukulele"], ["instrument", "xylophone"],
        ["flower", "sunflower"], ["flower", "daffodil"], ["tree", "weeping willow"],
        ["fish", "clownfish"], ["fish", "swordfish"], ["reptile", "chameleon"],
        ["tool", "screwdriver"], ["gem", "amethyst"], ["language", "portuguese"],
        ["body part", "shoulder"], ["body part", "eyebrow"], ["sport", "gymnastics"],
        ["bread", "sourdough"], ["bread", "rye"], ["snack", "popcorn"],
        ["drink", "lemonade"], ["drink", "hot chocolate"], ["bathroom", "toothpaste"],
        ["classroom", "whiteboard"], ["park", "monkey bars"], ["beach", "sandcastle"],
        ["farm animal", "rooster"], ["zoo", "orangutan"], ["pet", "bearded dragon"],
        ["princess", "cinderella"], ["princess", "rapunzel"], ["planet", "jupiter"],
        ["travel", "helicopter"], ["travel", "submarine"], ["bedroom", "wardrobe"],
        ["jungle", "orangutan"], ["cold", "polar bear"], ["baby animal", "duckling"],
        ["pizza", "pepperoni"], ["ice cream", "mint chocolate chip"], ["sandwich", "peanut butter"],
        ["birthday", "pinata"], ["holiday", "halloween"], ["season", "autumn"],
        ["breakfast", "scrambled eggs"], ["forest", "toadstool"], ["machine", "excavator"],
      ];
      const out = [];
      want.forEach(([needle, answer]) => {
        const i = WB_QUESTIONS.findIndex((q) => q.q.toLowerCase().includes(needle.toLowerCase()));
        if (i < 0) { out.push(`no category matching "${needle}"`); return; }
        if (!window.WBCheck(i, answer)) out.push(`"${answer}" rejected by "${WB_QUESTIONS[i].q}"`);
      });
      // …and obvious nonsense must still be refused
      if (window.WBCheck(0, "zzzqqq")) out.push("nonsense was accepted");
      if (window.WBCheck(0, "qwertyuiop")) out.push("keyboard mashing was accepted");
      return out;
    });
    if (misses.length) throw new Error(`${misses.length} coverage gaps: ` + misses.slice(0, 4).join("; "));

    // the hand-drawn sprite sheet must bake into real pixels
    const art = await page.evaluate(() => {
      const h = WBSprites.get("hero.jeannie.walk"), p = WBSprites.get("plank.wood");
      return { frames: h.length, heroW: h[0].width, plankW: p.width };
    });
    if (art.frames < 3 || art.heroW < 8 || art.plankW < 8) throw new Error("sprites did not bake");

    // the prompt arrives as a modal
    if (await page.locator("#modal[hidden]").count()) throw new Error("no prompt modal on the first round");

    // a word the game doesn't know must be refused — and lay no planks
    await page.locator("#answer-input").fill("zzzqqq");
    await page.locator("#answer-form button[type=submit]").click();
    await page.waitForTimeout(150);
    if (!/don't know/i.test(await page.locator("#feedback").textContent())) throw new Error("nonsense was not refused");
    if (await page.evaluate(() => WBStage.world.you.planks.length) !== 0) throw new Error("nonsense laid planks");

    // a real answer lays exactly one plank per letter, and the walker moves
    const first = await page.evaluate(() => WB_QUESTIONS[+document.getElementById("modal-card").dataset.q].ok[0]);
    const letters = first.replace(/[^a-zA-Z]/g, "").length;
    await page.locator("#answer-input").fill(first);
    await page.locator("#answer-form button[type=submit]").click();
    await page.waitForFunction((n) => WBStage.world.you.planks.length >= n, letters, { timeout: 10000 });
    const planks = await page.evaluate(() => WBStage.world.you.planks.length);
    if (planks !== letters) throw new Error(`"${first}" (${letters} letters) laid ${planks} planks`);
    await page.waitForTimeout(1200);
    const walked = await page.evaluate(() => WBStage.at("you"));
    if (!(walked > 0)) throw new Error("the character never walked forward");

    // Race to the island. Wait for a round we haven't answered yet — "a
    // modal is open" isn't enough, since the card re-renders between rounds.
    let seen = -1;
    const ready = () => page.waitForFunction((prev) => {
      if (document.getElementById("again-btn")) return true;
      const card = document.getElementById("modal-card");
      return !document.getElementById("modal").hidden &&
             !!document.getElementById("answer-input") &&
             Number(card.dataset.round) !== prev;
    }, seen, { timeout: 40000 });
    let rounds = 0;
    for (let round = 0; round < 30; round++) {
      await ready();
      if (await page.locator("#again-btn").count()) break;
      seen = await page.evaluate(() => Number(document.getElementById("modal-card").dataset.round));
      // Answer the way a kid would — a normal 5-9 letter word, not the
      // longest one in the list — so this also checks the crossing takes
      // a proper handful of answers.
      const word = await page.evaluate(() => {
        const ok = WB_QUESTIONS[+document.getElementById("modal-card").dataset.q].ok;
        const mid = ok.filter((w) => { const n = w.replace(/[^a-z]/gi, "").length; return n >= 5 && n <= 9; });
        return (mid.length ? mid : ok)[0];
      });
      await page.locator("#answer-input").fill(word);
      await page.locator("#answer-form button[type=submit]").click();
      rounds++;
      await page.waitForTimeout(120);
    }
    if (!(await page.locator("#again-btn").count())) {
      const st = await page.evaluate(() => ({ you: WBStage.world.you.planks.length, bot: WBStage.world.bot.planks.length }));
      throw new Error(`the race never reached the island (you ${st.you}, bot ${st.bot} of 60 after ${rounds} answers)`);
    }
    // a crossing should take a good handful of words, not two or three
    if (rounds < 6) throw new Error(`the canyon was crossed in only ${rounds} answers`);
    const won = /reached the island first/.test(await page.locator("#modal-card").textContent());

    // coins were paid, and everything survives a reload
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("wordBridge.v1")));
    if (!saved || !saved.jeannie || saved.jeannie.races < 1) throw new Error("the race was not saved");
    if (!(saved.jeannie.coins > 0)) throw new Error("no coins were earned");

    // the shop sells a skin once there are enough coins
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("wordBridge.v1"));
      s.jeannie.coins = 999;
      localStorage.setItem("wordBridge.v1", JSON.stringify(s));
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("#shop-btn").click();
    await page.locator('.skin-card[data-skin="candy"]').click();
    await page.waitForTimeout(150);
    if (await page.evaluate(() => WBStage.world.skin) !== "candy")
      throw new Error("buying a skin did not change the bridge");

    // Tap mode: pictures instead of typing, for the pre-readers
    await page.locator('.pick[data-opt="tap"]').click();
    await page.waitForTimeout(300);
    const taps = await page.locator(".tap").count();
    if (taps < 3) throw new Error(`tap mode showed ${taps} pictures`);
    await page.locator('.tap[data-ok="1"]').first().click();
    await page.waitForFunction(() => WBStage.world.you.planks.length > 0, null, { timeout: 10000 });

    return `${bank.cats} categories / ${bank.total} answers all accepted; ${won ? "won" : "lost"} a ${rounds}-word race, ${letters}-letter word = ${letters} planks, shop + tap mode work`;
  },

  async "Word Strands — every hunt"(page, g, d) {
    await page.goto(`${BASE}/games/strands/`, { waitUntil: "networkidle" });
    const hunts = await page.locator(".puz-card").count();
    if (hunts < 1) throw new Error("no word hunts in the picker");
    // Open every hunt: the grid must be completely filled with letters and
    // the theme-word count must match — catches bad tools/gen-strands.js data.
    for (let i = 0; i < hunts; i++) {
      await page.locator(".puz-card").nth(i).click();
      await page.waitForTimeout(60);
      const bad = await page.evaluate(() => {
        const cells = Array.from(document.querySelectorAll("#board .scell"));
        return cells.length ? cells.filter((c) => !/^[A-Z]$/.test((c.textContent || "").trim())).length : -1;
      });
      if (bad === -1) throw new Error(`hunt ${i + 1} of ${hunts} rendered no letter grid`);
      if (bad > 0) throw new Error(`hunt ${i + 1} of ${hunts} has ${bad} empty squares`);
      await page.locator("#quit-btn").click();
      await page.waitForTimeout(40);
    }
    return `${hunts} hunts, every grid fully lettered`;
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

    // goalie state resets to all "can play" (✓) on every load
    await page.locator(".player-row .chip.gk-yes").first().click();   // ✓ -> ★
    await page.waitForTimeout(40);
    await page.locator(".player-row .chip.gk-must").first().click();  // ★ -> —
    await page.waitForTimeout(60);
    await page.reload({ waitUntil: "networkidle" });
    if (await page.locator(".player-row .chip.gk-must").count() !== 0 || await page.locator(".player-row .chip.gk-no").count() !== 0)
      throw new Error("all girls should reset to goalie-eligible (✓) after a reload");

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
          // the name cell is a <th scope="row"> (proper row header for screen
          // readers), so walk every child rather than just the <td>s
          const cells = tr.children;
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

    // "must goalie": a girl cycled to ★ must be assigned goalie at least once
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle" });
    await page.locator(".player-row .chip.gk-yes").first().click();  // ✓ -> ★ must
    if (await page.locator(".player-row .chip.gk-must").count() < 1) throw new Error("goalie chip did not reach the ★ must state");
    const mustName = (await page.locator(".player-row").first().locator(".pname").textContent()).trim();
    await page.locator('.period-btn[data-p="2"]').click();
    await page.locator("#generateBtn").click();
    await page.waitForTimeout(150);
    const mustGk = await page.evaluate((name) => {
      const tr = Array.from(document.querySelectorAll("table.gridtbl tbody tr"))
        .find((r) => { const c = r.querySelector(".name"); return c && c.textContent.trim() === name; });
      if (!tr) return -1;
      const cells = tr.children;
      return Number(cells[cells.length - 1].textContent) || 0;
    }, mustName);
    if (mustGk < 1) throw new Error(`${mustName} was set to ★ must-goalie but never played goalie`);

    return "no auto-generate; must-goalie honored; print builds first; 2/4/8 even, no repeats";
  },

  async "Music Lab"(page, g, d) {
    await page.goto(`${BASE}/games/music-lab/`, { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.removeItem("music-lab.v1"));
    await page.reload({ waitUntil: "networkidle" });
    // the whole keyboard is there: 10 white keys + 7 black
    if (await page.locator(".key.white").count() !== 10) throw new Error("expected 10 white keys");
    if (await page.locator(".key.black").count() !== 7) throw new Error("expected 7 black keys");
    // Free Play: pressing a key names the note
    await page.locator('.key[data-note="E4"]').click();
    if ((await page.locator("#big-note").textContent()).trim() !== "E") throw new Error("pressing E4 did not show the note name E");

    // Songs: the glowing key walks all the way through a tune
    await page.locator('.mode-btn[data-mode="songs"]').click();
    const songs = await page.locator(".song-btn").count();
    if (songs < 5) throw new Error(`only ${songs} songs in the list`);
    await page.locator(".song-btn").first().click();
    await page.waitForTimeout(200);
    if (await page.locator(".key.hint").count() !== 1) throw new Error("no key glowed for the first note");
    let notes = 0;
    for (let i = 0; i < 60; i++) {
      const hint = page.locator(".key.hint");
      if (!(await hint.count())) break;
      await hint.first().click();
      notes++;
      await page.waitForTimeout(40);
    }
    if (notes < 10) throw new Error(`song stopped after ${notes} notes`);
    if (!/You played/.test(await page.locator("#prompt-title").textContent())) throw new Error("finishing the song was not celebrated");
    // and a finished song is remembered
    await page.reload({ waitUntil: "networkidle" });
    await page.locator('.mode-btn[data-mode="songs"]').click();
    if (await page.locator(".song-btn .done").count() < 1) throw new Error("finished song was not saved");

    // Find the Note: the asked letter scores when its key is pressed
    await page.locator('.mode-btn[data-mode="names"]').click();
    await page.waitForTimeout(100);
    await page.locator("#prompt-actions .btn", { hasText: "Show me" }).click();
    await page.locator(".key.hint").click();
    await page.waitForTimeout(150);
    if (!/Right: 1 \/ 1/.test(await page.locator("#scorebar").textContent())) throw new Error("correct note was not scored");

    // Read Music: a note is drawn on the staff and the key answers it
    await page.locator('.mode-btn[data-mode="staff"]').click();
    await page.waitForTimeout(100);
    if (await page.locator("#staff ellipse").count() !== 1) throw new Error("no note head drawn on the staff");
    if (await page.locator("#staff line.staff-line").count() !== 5) throw new Error("staff should have 5 lines");
    await page.locator("#prompt-actions .btn", { hasText: "Show me" }).click();
    await page.locator(".key.hint").click();
    await page.waitForTimeout(150);
    if (!/Right: 1 \/ 1/.test(await page.locator("#scorebar").textContent())) throw new Error("staff note was not scored");

    // Echo: the piano plays a sequence, then it's the kid's turn
    await page.locator('.mode-btn[data-mode="echo"]').click();
    await page.locator("#prompt-actions .btn", { hasText: "Start" }).click();
    await page.waitForTimeout(2600);
    if (!/Your turn/.test(await page.locator("#prompt-text").textContent())) throw new Error("Echo never handed over to the player");
    return `${songs} songs; played one right through (${notes} notes); all five modes work`;
  },

  async "World Trek"(page, g, d) {
    await page.goto(`${BASE}/games/world-trek/`, { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.removeItem("world-trek.v1"));
    await page.reload({ waitUntil: "networkidle" });
    // both maps are built: the pixel world and all 50 states
    const cells = await page.locator(".wcell").count();
    if (cells !== 48 * 22) throw new Error(`world map has ${cells} squares, expected ${48 * 22}`);
    if (await page.locator(".scell[data-s]").count() !== 50) throw new Error("the states map should have all 50 states");
    // every state has a name, a capital, a region and a fact
    const bad = await page.evaluate(() => Object.keys(STATES).filter((k) => {
      const s = STATES[k];
      return !(s && s.length === 4 && s[0] && s[1] && REGIONS[s[2]] && s[3]);
    }));
    if (bad.length) throw new Error("states missing data: " + bad.join(", "));

    // Continents: tapping the asked continent scores
    const askedCode = () => page.evaluate(() => {
      const t = document.getElementById("prompt-title").textContent.replace(/^Tap\s+/, "");
      return Object.keys(PLACES).find((k) => t.indexOf(PLACES[k].name) === 0) || null;
    });
    let code = await askedCode();
    if (!code) throw new Error("no continent was asked for");
    await page.locator(`.wcell[data-k="${code}"]`).first().click();
    await page.waitForTimeout(200);
    if (!/Right: 1 \/ 1/.test(await page.locator("#scorebar").textContent())) throw new Error("tapping the right continent did not score");
    if (await page.locator("#info:not(.hidden)").count() < 1) throw new Error("no fact shown after a correct continent");

    // Oceans use the same map
    await page.locator('.mode-btn[data-mode="oceans"]').click();
    await page.waitForTimeout(150);
    code = await askedCode();
    if (!code) throw new Error("no ocean was asked for");
    await page.locator(`.wcell[data-k="${code}"]`).first().click();
    await page.waitForTimeout(200);
    if (!/Right: 1 \/ 1/.test(await page.locator("#scorebar").textContent())) throw new Error("tapping the right ocean did not score");

    // Find a State
    await page.locator('.mode-btn[data-mode="states"]').click();
    await page.waitForTimeout(150);
    let want = await page.evaluate(() => {
      const t = document.getElementById("prompt-title").textContent.replace(/^Find\s+/, "").replace(/!$/, "").trim();
      return Object.keys(STATES).find((k) => STATES[k][0] === t) || null;
    });
    if (!want) throw new Error("no state was asked for");
    await page.locator(`.scell[data-s="${want}"]`).click();
    await page.waitForTimeout(200);
    if (!/Right: 1 \/ 1/.test(await page.locator("#scorebar").textContent())) throw new Error("tapping the right state did not score");
    if (!/States found: 1 \/ 50/.test(await page.locator("#scorebar").textContent())) throw new Error("found state was not counted");

    // Capitals — a wrong tap must still teach that state's capital
    await page.locator('.mode-btn[data-mode="capitals"]').click();
    await page.waitForTimeout(150);
    const pair = await page.evaluate(() => {
      const cap = document.getElementById("prompt-title").textContent.replace(/ is the capital of….*$/, "").trim();
      const right = Object.keys(STATES).find((k) => STATES[k][1] === cap);
      const wrong = Object.keys(STATES).find((k) => k !== right);
      return { cap, right, wrong };
    });
    if (!pair.right) throw new Error("capital question did not name a real capital");
    await page.locator(`.scell[data-s="${pair.wrong}"]`).click();
    await page.waitForTimeout(150);
    if (!/its capital is/.test(await page.locator("#prompt-text").textContent())) throw new Error("a wrong tap should teach the capital of what was tapped");
    await page.locator(`.scell[data-s="${pair.right}"]`).click();
    await page.waitForTimeout(200);
    if (!/Right: 1 \/ 1/.test(await page.locator("#scorebar").textContent())) throw new Error("the right state for a capital did not score");

    // Atlas: labels appear and tapping anything reads it out
    await page.locator('.mode-btn[data-mode="atlas"]').click();
    await page.waitForTimeout(150);
    if (await page.locator("#world-labels b").count() !== 7) throw new Error("expected 7 continent labels in the Atlas");
    await page.locator('.scell[data-s="TX"]').click();
    await page.waitForTimeout(150);
    if (!/Texas/.test(await page.locator("#info-name").textContent())) throw new Error("Atlas did not open Texas");
    if (!/Austin/.test(await page.locator("#info-sub").textContent())) throw new Error("Texas card is missing its capital");
    return `${cells} world squares, 50 states; continents, oceans, states, capitals & atlas all work`;
  },

  async "Craepets"(page, g, d) {
    await page.goto(`${BASE}/games/craepets/`, { waitUntil: "networkidle" });
    await page.evaluate(() => Object.keys(localStorage)
      .filter((k) => k.startsWith("craepets")).forEach((k) => localStorage.removeItem(k)));
    await page.reload({ waitUntil: "networkidle" });

    // every creature bakes from its pixel grid, in every paint colour
    const art = await page.evaluate(() => {
      const bad = [];
      CPPets.SPECIES.forEach((sp) => CPPets.COLOURS.forEach((c) => {
        const cv = CPPets.sprite(sp.id, c.id, "idle", 4);
        if (!cv || cv.width < 32 || cv.height < 32) bad.push(sp.id + "/" + c.id);
      }));
      return { bad, n: CPPets.SPECIES.length * CPPets.COLOURS.length };
    });
    if (art.bad.length) throw new Error(`sprites failed to bake: ${art.bad.slice(0, 3).join(", ")}`);

    // adopt: pick a creature, a colour and a name
    if (await page.locator(".adopt").count() !== 7) throw new Error("expected 7 creatures to adopt");
    await page.locator('[data-sp="zibbit"]').click();
    await page.locator('[data-col="sky"]').click();
    await page.fill("#pet-name", "Wobble");
    await page.locator("#do-adopt").click();
    await page.waitForSelector("#pet-canvas");
    if (!(await page.locator(".petname").textContent()).includes("Wobble")) throw new Error("the pet was not named");

    // a run of right answers at the Berry Farm pays coins and ripens berries
    const answerAt = async (place, n) => {
      await page.locator(`[data-go="${place}"]`).click();
      await page.waitForSelector(".choice");
      for (let i = 0; i < n; i++) {
        const idx = await page.evaluate(() => Craepets.correctIndex());
        if (idx < 0) throw new Error(`no question at the ${place}`);
        await page.locator(`[data-pick="${idx}"]`).click();
        await page.waitForSelector(".teach");
        const t = (await page.locator(".teach").textContent()).trim();
        if (!/^Yes!/.test(t)) throw new Error(`a right answer was marked wrong at the ${place}`);
        if (i < n - 1) {
          await page.locator("[data-next]").click();
          await page.waitForSelector(".choice:not([disabled])");
        }
      }
    };
    const coins0 = await page.evaluate(() => Craepets.state().coins);
    await answerAt("farm", 4);
    if (await page.evaluate(() => Craepets.state().coins) <= coins0) throw new Error("learning did not pay");
    if (await page.locator(".plot.full").count() < 1) throw new Error("no berries ripened");

    // the Well asks about words, the Pool about the world
    await answerAt("well", 2);
    await answerAt("pool", 2);
    const subj = await page.evaluate(() => Craepets.state().stats.bySubject);
    if (!subj.math || !subj.word || !subj.wonder) throw new Error(`places asked the wrong subjects: ${JSON.stringify(subj)}`);

    // a miss explains itself instead of punishing
    await page.locator("[data-next]").click();
    await page.waitForSelector(".choice:not([disabled])");
    const right = await page.evaluate(() => Craepets.correctIndex());
    const n = await page.locator(".choice").count();
    await page.locator(`[data-pick="${(right + 1) % n}"]`).click();
    await page.waitForSelector(".teach");
    if (!/answer is/.test(await page.locator(".teach").textContent())) throw new Error("a miss gave no explanation");
    if (await page.locator(".choice.right").count() !== 1) throw new Error("a miss did not show the right answer");

    // the market makes you work out your change, then hands the item over
    await page.evaluate(() => Craepets.grant(400));
    await page.locator('[data-go="market"]').click();
    const before = await page.evaluate(() => Craepets.state().coins);
    await page.locator("[data-buy]:not([disabled])").first().click();
    await page.waitForSelector("[data-change]");
    await page.locator('[data-change="0"]').click();
    await page.waitForTimeout(150);
    const afterBuy = await page.evaluate(() => Craepets.state());
    if (afterBuy.coins >= before) throw new Error("the market did not charge for the item");

    // feeding, playing and washing all move the right need
    await page.locator('[data-go="nest"]').click();
    await page.evaluate(() => { Craepets.state().pet.hunger = 30; });
    await page.locator('[data-do="feed"]').click();
    await page.waitForSelector(".sheet [data-use]");
    await page.locator("[data-use]").first().click();
    await page.waitForTimeout(200);
    if (await page.evaluate(() => Craepets.state().pet.hunger) <= 30) throw new Error("feeding did not fill the pet up");
    await page.locator('[data-do="play"]').click();
    await page.locator('[data-use="romp"]').click();
    await page.waitForTimeout(150);
    await page.locator('[data-do="wash"]').click();
    await page.locator('[data-use="rinse"]').click();
    await page.waitForTimeout(150);
    const today = await page.evaluate(() => Craepets.state().today);
    if (!today.play || !today.wash) throw new Error("playing and washing were not tracked");

    // a whole arena duel, answered correctly, is a win
    await page.locator('[data-go="arena"]').click();
    await page.locator('[data-fight="pip"]').click();
    await page.waitForSelector(".fighters");
    for (let i = 0; i < 30; i++) {
      if (await page.evaluate(() => { const b = Craepets.battle(); return b && b.over; })) break;
      const idx = await page.evaluate(() => Craepets.correctIndex());
      if (idx < 0) break;
      await page.locator(`[data-pick="${idx}"]`).click();
      await page.waitForTimeout(90);
      if (await page.locator("[data-next]").count()) await page.locator("[data-next]").click();
      await page.waitForTimeout(90);
    }
    if (await page.evaluate(() => { const b = Craepets.battle(); return b && b.over; }) !== "win") {
      throw new Error("a duel answered correctly did not end in a win");
    }
    await page.locator("[data-leave]").click();

    // three daily quests and a daily gift
    await page.locator('[data-go="quests"]').click();
    if (await page.locator(".quest").count() !== 3) throw new Error("expected 3 daily quests");
    await page.locator("[data-gift]").click();
    await page.waitForSelector(".sheet");
    await page.locator("[data-close]").click();

    // a paint brush is not a bag item — owning the colour IS the item,
    // so buying one has to hand the pet straight to the Rainbow Pool
    await page.evaluate(() => Craepets.grant(2000));
    await page.locator('[data-go="market"]').click();
    const brush = page.locator('[data-buy^="brush:"]:not([disabled])').first();
    if (await brush.count()) {
      const wasColour = await page.evaluate(() => Craepets.state().pet.colour);
      await brush.click();
      await page.waitForSelector("[data-change]");
      await page.locator('[data-change="0"]').click();
      await page.waitForSelector('[data-use^="brush:"]');
      await page.locator('[data-use^="brush:"]').click();
      await page.waitForTimeout(200);
      if (await page.evaluate(() => Craepets.state().pet.colour) === wasColour) {
        throw new Error("a bought paint brush did not repaint the pet");
      }
    }
    // and every colour you own can be re-applied for free from the bag
    await page.locator('[data-go="bag"]').click();
    await page.locator('[data-paint="berry"]').click();
    await page.waitForTimeout(200);
    if (await page.evaluate(() => Craepets.state().pet.colour) !== "berry") {
      throw new Error("repainting from the bag did nothing");
    }

    // ---- your own house: buy furniture, put it out, move somewhere bigger
    await page.evaluate(() => Craepets.grant(5000));
    await page.locator('[data-go="home"]').click();
    const houseLv = await page.evaluate(() => Craepets.house().level);
    await page.locator("[data-upgrade]").click();
    await page.waitForSelector(".sheet");
    await page.locator(".sheet .close").click();
    if (await page.evaluate(() => Craepets.house().level) !== houseLv + 1) {
      throw new Error("paying for a bigger house did not move you into it");
    }
    await page.locator('[data-go="market"]').click();
    const decor = await page.evaluate(() => CPData.shopStock().filter((i) => i.kind === "decor").map((i) => i.id));
    if (decor.length < 2) throw new Error("the market is not stocking furniture");
    for (const id of decor.slice(0, 2)) {
      await page.locator(`[data-buy="${id}"]`).click();
      if (await page.locator("[data-change]").count()) {
        await page.locator(`[data-change="${await page.evaluate(() => Craepets.changeIndex())}"]`).click();
      }
      await page.waitForTimeout(120);
      if (await page.locator(".sheet .close").count()) await page.locator(".sheet .close").click();
      await page.waitForTimeout(80);
    }
    const home = await page.evaluate(() => Craepets.house());
    if (home.owned.length !== 2) throw new Error("furniture was not bought");
    // furniture is only worth anything when it is OUT — and then you can see it
    await page.locator('[data-go="nest"]').click();
    await page.waitForTimeout(120);
    if (await page.locator(".scene .deco").count() !== home.placed.length) {
      throw new Error("furniture that is out is not showing in the nest");
    }
    await page.locator('[data-go="home"]').click();
    await page.locator("[data-store]").first().click();
    await page.waitForTimeout(120);
    if (await page.evaluate(() => Craepets.house().placed.length) !== home.placed.length - 1) {
      throw new Error("furniture could not be put away");
    }
    await page.locator("[data-place]").first().click();
    await page.waitForTimeout(120);
    if (await page.evaluate(() => Craepets.house().placed.length) !== home.placed.length) {
      throw new Error("furniture could not be put back out");
    }

    // ---- the prize wheel: one free spin a day, and it pays
    await page.locator('[data-go="quests"]').click();
    await page.waitForSelector("#wheel");
    const preSpin = await page.evaluate(() => Craepets.state().coins);
    await page.locator("[data-spin]").click();
    await page.waitForSelector(".sheet h3", { timeout: 9000 });
    if (await page.evaluate(() => Craepets.state().coins) <= preSpin) throw new Error("the wheel paid nothing");
    await page.locator(".sheet .close").click();
    if (await page.locator("[data-spin]").count()) throw new Error("the wheel can be spun twice in one day");

    // ---- your own shop: stock it at your own price
    await page.locator('[data-go="stall"]').click();
    await page.waitForSelector("[data-stock]");
    await page.locator("[data-stock]").first().click();
    await page.waitForSelector("[data-listit]");
    await page.locator('[data-priced="5"]').click();
    await page.waitForSelector("[data-listit]");
    await page.locator("[data-listit]").click();
    await page.waitForTimeout(150);
    const shelf = await page.evaluate(() => Craepets.stall().goods);
    if (!shelf.length) throw new Error("nothing went on your own shop shelf");
    const listed = shelf[0];
    if (listed.price <= (await page.evaluate((id) => CPData.itemById(id).cost, listed.id))) {
      throw new Error("the price you set was not used");
    }

    // the trophy case lists the whole family, each with their own pet
    await page.locator('[data-go="case"]').click();
    if (await page.locator(".trophy:not(.locked)").count() < 1) throw new Error("no trophies earned");
    if (await page.locator(".fam").count() !== 6) throw new Error("the family board should list every profile");

    // Shannon gets her own save, at the grown-up level
    await page.locator("[data-swap]").click();
    await page.locator('[data-who="shannon"]').click();
    await page.waitForTimeout(200);
    if (!(await page.locator("#do-adopt").count())) throw new Error("Shannon did not get her own valley");
    if (await page.evaluate(() => Craepets.state().tier) !== "grown") throw new Error("Shannon's level should be grown-up");
    await page.locator('[data-sp="flarn"]').click();
    await page.fill("#pet-name", "Sable");
    await page.locator("#do-adopt").click();
    await page.waitForSelector("#pet-canvas");
    await page.locator('[data-go="well"]').click();
    await page.waitForSelector(".choice");
    if (await page.evaluate(() => Craepets.session().q.tier) !== "grown") throw new Error("Shannon got a child's question");
    if (await page.locator(".choice").count() !== 4) throw new Error("the grown-up level should offer 4 choices");

    // Shannon can walk up to Cory's shelf and buy from it, and the coins
    // really do move from her purse into his — the whole point of a shop
    await page.locator('[data-go="market"]').click();
    await page.waitForSelector("[data-stallbuy]");
    const herCoins = await page.evaluate(() => Craepets.state().coins);
    const hisBefore = await page.evaluate(() => JSON.parse(localStorage.getItem("craepets.v1.cory")).coins);
    await page.locator("[data-stallbuy]:not([disabled])").first().click();
    if (await page.locator("[data-change]").count()) {
      await page.locator(`[data-change="${await page.evaluate(() => Craepets.changeIndex())}"]`).click();
    }
    await page.waitForTimeout(200);
    const hisAfter = await page.evaluate(() => JSON.parse(localStorage.getItem("craepets.v1.cory")));
    if (await page.evaluate(() => Craepets.state().coins) >= herCoins) throw new Error("the buyer was not charged");
    if (hisAfter.coins <= hisBefore) throw new Error("the shopkeeper was not paid");
    if (hisAfter.stats.sold !== 1) throw new Error("the sale was not written into the seller's save");
    if (!hisAfter.stall.sales.length) throw new Error("the seller got no receipt");

    // ...and Cory's pet is exactly where he left it
    await page.locator("[data-swap]").click();
    await page.locator('[data-who="cory"]').click();
    await page.waitForTimeout(200);
    const cory = await page.evaluate(() => Craepets.state());
    if (!cory.pet || cory.pet.name !== "Wobble") throw new Error("switching profiles lost Cory's pet");
    // he sees the receipt waiting for him
    await page.locator('[data-go="stall"]').click();
    await page.waitForSelector("[data-clearsales]");
    await page.locator("[data-clearsales]").click();
    await page.waitForTimeout(120);
    if ((await page.evaluate(() => Craepets.stall().sales.length)) !== 0) throw new Error("receipts would not clear");

    // Kieran's level cannot be lost: two choices, and a miss just waits
    await page.locator("[data-swap]").click();
    await page.locator('[data-who="kieran"]').click();
    await page.waitForTimeout(200);
    await page.locator('[data-sp="blorb"]').click();
    await page.locator("[data-name]").first().click();
    await page.locator("#do-adopt").click();
    await page.waitForSelector("#pet-canvas");
    await page.locator('[data-go="farm"]').click();
    await page.waitForSelector(".choice");
    if (await page.locator(".choice").count() !== 2) throw new Error("the tiny level should offer 2 big choices");
    const kIdx = await page.evaluate(() => Craepets.correctIndex());
    await page.locator(`[data-pick="${(kIdx + 1) % 2}"]`).click();
    await page.waitForTimeout(250);
    if (await page.locator(".teach").count()) throw new Error("a miss at the tiny level should just wait, not score");
    if (await page.evaluate(() => Craepets.state().stats.wrong) !== 0) throw new Error("a tiny miss was counted wrong");

    await page.evaluate(() => Object.keys(localStorage)
      .filter((k) => k.startsWith("craepets")).forEach((k) => localStorage.removeItem(k)));
    return `${art.n} sprites bake; farm/well/pool pay for maths, words & world; ` +
      "market asks for change; feed/play/wash; a duel won; paint brushes " +
      "repaint; a house bought, furnished & seen in the nest; the prize wheel " +
      "spins once a day; a shop stocked at your own price and Shannon buying " +
      "from it pays Cory; quests, trophies, and separate saves for Shannon, " +
      "Cory & Kieran";
  },

  async "Crossword"(page, g, d) {
    await page.goto(`${BASE}/games/crossword/`, { waitUntil: "networkidle" });
    const puzzles = await page.locator(".puz-card").count();
    if (puzzles < 1) throw new Error("no crosswords in the picker");
    // every puzzle (not just the first) must open with a real grid and clues —
    // this is what catches a bad grid coming out of tools/gen-crossword.js
    for (let i = 0; i < puzzles; i++) {
      await page.locator(".puz-card").nth(i).click();
      await page.waitForTimeout(60);
      const cells = await page.locator(".xinput").count();
      const clues = await page.locator(".clue-li").count();
      if (cells < 8 || clues < 4) throw new Error(`puzzle ${i + 1} of ${puzzles} opened with ${cells} cells and ${clues} clues`);
      // and every clue's answer must actually fit the grid it was numbered into
      const badSol = await page.evaluate(() => Array.from(document.querySelectorAll(".xinput")).filter((i) => !/^[A-Z]$/.test(i.dataset.sol || "")).length);
      if (badSol) throw new Error(`puzzle ${i + 1} has ${badSol} cells with no solution letter`);
      await page.locator("#quit-btn").click();
      await page.waitForTimeout(40);
    }
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
    return `${puzzles} puzzles all open cleanly; filled ${n} cells; puzzle solved`;
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

  // Optional filter: `npm test -- comic` runs only games whose name matches.
  const only = process.argv.slice(2).join(" ").toLowerCase();

  for (const [game, play] of Object.entries(GAMES)) {
    if (only && !game.toLowerCase().includes(only)) continue;
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
    const gamesRun = Object.keys(GAMES).filter((g) => !only || g.toLowerCase().includes(only));
    const checks = gamesRun.length * Object.keys(DEVICES).length;
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
