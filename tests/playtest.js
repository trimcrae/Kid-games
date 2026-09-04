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
        const type = MIME[path.extname(file)] || "application/octet-stream";
        // honour byte ranges like GitHub Pages does: without them Chromium
        // treats a narration mp3 as unseekable, so "tap a word to hear it
        // from there" cannot be tested
        const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
        if (range && data.length) {
          const from = range[1] ? Number(range[1]) : Math.max(0, data.length - Number(range[2]));
          const to = range[1] && range[2] ? Math.min(Number(range[2]), data.length - 1) : data.length - 1;
          if (from > to || from >= data.length) {
            res.writeHead(416, { "Content-Range": `bytes */${data.length}` }).end();
            return;
          }
          res.writeHead(206, {
            "Content-Type": type, "Accept-Ranges": "bytes",
            "Content-Range": `bytes ${from}-${to}/${data.length}`, "Content-Length": to - from + 1,
          });
          res.end(data.subarray(from, to + 1));
          return;
        }
        res.writeHead(200, { "Content-Type": type, "Accept-Ranges": "bytes", "Content-Length": data.length });
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
    // the read-aloud highlight follows the narrator: a word is lit straight
    // away, it moves on as the clip plays, and it lands on the spoken word
    // (its timing comes from the manifest's measured voice stretches, so a
    // word 2 s in must be lit at 2 s — not the first word, not the last)
    const litIndex = () => page.evaluate(() => {
      const w = document.querySelector("#page-text .w.now");
      return w ? Number(w.dataset.i) : -1;
    });
    const words = await page.locator("#page-text .w").count();
    if (words < 3) throw new Error(`only ${words} tappable words on page 1`);
    await page.waitForTimeout(300);
    const first = await litIndex();
    if (first < 0) throw new Error("no word is highlighted while the page is being read");
    await page.waitForTimeout(1800);
    const later = await litIndex();
    if (later <= first) throw new Error(`highlight did not move on with the voice (word ${first} -> ${later})`);
    // tapping a word jumps the narrator (and the highlight) to it — both
    // mid-clip and after the page has finished being read
    for (const when of ["while it is being read", "after it has been read"]) {
      await page.locator("#page-text .w").last().click();
      await page.waitForTimeout(200);
      const tapped = await litIndex();
      if (tapped < words - 2) throw new Error(`tapping the last word ${when} lit word ${tapped} of ${words}`);
      await page.waitForTimeout(1200);   // the clip runs out after the last word
    }
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
    const CROPS_AUTUMN = ["🎃", "🍎", "🍂", "🌰", "🍄"];
    await page.goto(`${BASE}/games/craepets/`, { waitUntil: "networkidle" });
    await page.evaluate(() => Object.keys(localStorage)
      .filter((k) => k.startsWith("craepets")).forEach((k) => localStorage.removeItem(k)));
    await page.reload({ waitUntil: "networkidle" });
    // random events are dice; the robot needs the paths quiet (they are tested on their own below)
    await page.evaluate(() => Craepets._events(false));

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
    // it starts as an egg, and hatches when it hears three right answers
    if (!(await page.evaluate(() => !!Craepets.state().pet.egg))) throw new Error("a new Craepet should start as an egg");
    if (!(await page.locator(".needs.egg").count())) throw new Error("the egg is not shown at the nest");

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
    if (await page.evaluate(() => !!Craepets.state().pet.egg)) throw new Error("three right answers did not hatch the egg");
    if (!(await page.evaluate(() => Craepets.diary().some((e) => e.e === "🐣")))) throw new Error("hatching was not written in the diary");
    // and the front page of the nest says what is new today
    await page.locator('[data-go="nest"]').click();
    if (!(await page.locator(".panel.times .trow").count())) throw new Error("the Valley Times is blank");
    if (!/today/.test(await page.locator(".panel.times").textContent())) throw new Error("the Valley Times has no weather");

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

    // A Craepet gets grubby on its own, so there must ALWAYS be a way to
    // wash it: a free rinse, soap on the shelf every single day, and the
    // Pool washing a bar up for anyone with no coins at all.
    const wash = await page.evaluate(() => {
      const days = [];
      for (let i = 0; i < 40; i++) {
        const d = (CPData.dayNumber() + i) * 86400000;
        days.push(CPData.shopStock(d).filter((s) => s.kind === "care" && s.clean).length);
      }
      return { min: Math.min(...days), pool: CPData.CARE.filter((c) => c.clean && c.cost <= 18).length };
    });
    if (wash.min < 1) throw new Error("the market can run out of soap for a whole day");
    if (wash.pool < 1) throw new Error("the pool has no cheap soap to wash up");
    await page.locator('[data-go="nest"]').click();
    // borrow the bag for a moment: the point is that a pet with NOTHING can
    // still get clean, but the later steps need the bag back
    await page.evaluate(() => {
      const S = Craepets.state();
      window.__bag = S.bag;
      S.bag = {};
      S.pet.clean = 20;
    });
    await page.locator('[data-do="wash"]').click();
    await page.locator('[data-use="rinse"]').click();
    await page.waitForTimeout(150);
    if (await page.evaluate(() => Craepets.state().pet.clean) <= 20) {
      throw new Error("the free rinse does not clean a pet with an empty bag");
    }
    await page.evaluate(() => { Craepets.state().bag = window.__bag; });

    // A toast floats over an open sheet, and on a phone it lands right on the
    // sheet's own Close button. It must never swallow the tap.
    await page.locator('[data-do="wash"]').click();
    await page.waitForSelector(".sheet .close");
    await page.evaluate(() => {
      const e = document.createElement("div");
      e.className = "toast";
      e.textContent = "The pool washed up a bar of soap!";
      document.body.appendChild(e);
    });
    await page.locator(".sheet .close").click({ timeout: 5000 });
    if (await page.locator(".sheet").count()) throw new Error("a toast blocked the sheet's Close button");
    await page.evaluate(() => document.querySelectorAll(".toast").forEach((t) => t.remove()));

    // the market makes you work out your change, then hands the item over
    await page.evaluate(() => Craepets.grant(400));
    await page.locator('[data-go="market"]').click();
    const before = await page.evaluate(() => Craepets.state().coins);
    await page.locator("[data-buy]:not([disabled])").first().click();
    await page.waitForSelector("[data-change]");
    await page.locator('[data-change="0"]').click();
    await page.waitForTimeout(150);
    const afterBuy = await page.evaluate(() => Craepets.state());
    // (a first purchase also pays the "first steps" reward, so only the
    // purchase count and a changed purse are certain)
    if (afterBuy.coins === before || (afterBuy.stats.buy || 0) !== 1) throw new Error("the market did not charge for the item");

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

    // ---- THE WISH: the pet asks for one thing; giving it exactly that pays
    await page.evaluate(() => {
      const S = Craepets.state();
      S.bag.blueberry = (S.bag.blueberry || 0) + 1;
      S.pet.hunger = 40;
      Craepets._setWish({ kind: "food", id: "blueberry", at: Date.now(), day: CPData.dayNumber(), done: false });
    });
    if (!/Blueberry/.test(await page.locator(".wish").textContent())) throw new Error("the nest does not show the wish");
    // (the pet may already have wished for something the steps above happened to grant)
    const wishes0 = await page.evaluate(() => Craepets.state().today.wishes || 0);
    const wishCoins = await page.evaluate(() => Craepets.state().coins);
    await page.locator('[data-do="feed"]').click();
    await page.waitForSelector('.sheet [data-use="blueberry"]');
    await page.locator('.sheet [data-use="blueberry"]').click();
    await page.waitForTimeout(200);
    const wished = await page.evaluate(() => ({ done: Craepets.wish().done, n: Craepets.state().today.wishes, coins: Craepets.state().coins }));
    if (!wished.done || wished.n !== wishes0 + 1 || wished.coins <= wishCoins) throw new Error("granting the wish did not pay out");
    if (!(await page.evaluate(() => Craepets.diary().some((e) => e.e === "💭")))) throw new Error("a granted wish was not written in the diary");
    // an action wish, too: "will you play with me?"
    await page.evaluate(() => Craepets._setWish({ kind: "act", id: "play", at: Date.now(), day: CPData.dayNumber(), done: false }));
    await page.locator('[data-do="play"]').click();
    await page.locator('[data-use="romp"]').click();
    await page.waitForTimeout(150);
    if (await page.evaluate(() => Craepets.state().today.wishes) !== wishes0 + 2) throw new Error("a play wish was not granted by playing");

    // ---- PERSONALITY: a Zibbit loves popcorn, so popcorn is worth far
    // more joy than bread — and the nest says so
    if (!/Zibbits love/.test(await page.locator(".panel").first().textContent())) throw new Error("the nest does not say what a Zibbit loves");
    const likes = await page.evaluate(() => CPPets.species(Craepets.state().pet.species).likes);
    if (likes.indexOf("popcorn") === -1) throw new Error("a Zibbit should love popcorn");
    const feedJoy = async (id) => {
      await page.evaluate((id) => { const S = Craepets.state(); S.bag[id] = 1; S.pet.happy = 30; S.pet.hunger = 20; }, id);
      await page.locator('[data-do="feed"]').click();
      await page.waitForSelector(`.sheet [data-use="${id}"]`);
      await page.locator(`.sheet [data-use="${id}"]`).click();
      await page.waitForTimeout(150);
      return (await page.evaluate(() => Craepets.state().pet.happy)) - 30;
    };
    const plainJoy = await feedJoy("bread"), lovedJoy = await feedJoy("popcorn");
    if (lovedJoy <= plainJoy + 10) throw new Error(`a favourite food was not worth more joy (${lovedJoy} vs ${plainJoy})`);
    if (!(await page.evaluate(() => Craepets.diary().some((e) => e.e === "💛")))) throw new Error("finding a favourite food was not written down");

    // ---- the pet wanders: point it somewhere and it walks there
    await page.evaluate(() => { const a = Craepets._anim(); a.x = 0.5; a.tx = 0.25; });
    await page.waitForTimeout(700);
    const wandered = await page.evaluate(() => Craepets._anim());
    if (!(wandered.x < 0.46) || wandered.face !== -1) throw new Error("the pet does not wander about the room");

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

    // ---- THE HEAT: five right in a row turns a subject up a rung, the
    // coins climb with it, and the card says so
    await page.evaluate(() => Craepets._setRung("math", 1));
    await page.locator('[data-go="farm"]').click();
    await page.waitForSelector(".choice:not([disabled])");
    if (!(await page.locator(".heatline").count())) throw new Error("the farm does not show the heat");
    // a Zibbit's favourite place is the Farm, and it pays extra there
    if (!/Zibbits love the Berry Farm/.test(await page.locator(".panel").first().textContent())) throw new Error("the favourite place is not announced");
    const coinsHeat0 = await page.evaluate(() => Craepets.state().coins);
    await answerAt("farm", 5);
    if (await page.evaluate(() => Craepets.heat("math")) !== 2) throw new Error("five right in a row did not turn the heat up");
    await page.locator("[data-next]").click();
    await page.waitForSelector(".choice:not([disabled])");
    if (!/×1\.2/.test(await page.locator(".heat-chip").textContent())) throw new Error("the card does not show the heat's pay");
    const heatQ = await page.evaluate(() => Craepets.session().q);
    if (heatQ.rung !== 2) throw new Error("the question was not asked at the new rung");
    // …and at the top rung, some questions come from the level above
    await page.evaluate(() => Craepets._setRung("math", 5));
    let stepUps = 0;
    for (let i = 0; i < 24 && !stepUps; i++) {
      await page.evaluate(() => Craepets._nextQuestion());
      if (await page.evaluate(() => Craepets.session().q.step)) stepUps++;
    }
    if (!stepUps) throw new Error("no step-up question turned up at the top rung");
    if (!(await page.locator(".step-up").count())) throw new Error("a step-up question is not marked on the card");
    const coinsHeat1 = await page.evaluate(() => Craepets.state().coins);
    if (coinsHeat1 <= coinsHeat0) throw new Error("the heat did not pay");
    // three misses in four turns it back down
    await page.evaluate(() => Craepets._setRung("math", 3));
    for (let i = 0; i < 4; i++) {
      const rightIdx = await page.evaluate(() => Craepets.correctIndex());
      const nChoice = await page.locator(".choice").count();
      await page.locator(`[data-pick="${i === 0 ? rightIdx : (rightIdx + 1) % nChoice}"]`).click();
      await page.waitForSelector(".teach");
      await page.locator("[data-next]").click();
      await page.waitForSelector(".choice:not([disabled])");
    }
    if (await page.evaluate(() => Craepets.heat("math")) !== 2) throw new Error("three misses in four did not ease the heat off");
    await page.evaluate(() => Craepets._setRung("math", 1));

    // ---- THE SHADOW TOWER: climb a floor, snack mid-fight, land a
    // critical, and meet The Shade on the seventh floor
    await page.evaluate(() => { Craepets.state().pet.xp = 200; Craepets.grant(0); });   // level 5
    await page.locator('[data-go="arena"]').click();
    await page.waitForSelector("[data-tower]");
    if (!/Unranked/.test(await page.locator(".rankchip").textContent())) throw new Error("a new player should be unranked");
    const fightFloor = async (floor) => {
      // a level-3 Craepet every floor (the tower's own gate), so the climb
      // needs the charged fourth hit — and The Shade's trick is noted, then
      // switched off, because Double Dark would finish him in three
      await page.evaluate(() => { Craepets.state().pet.xp = 100; });
      await page.locator(`[data-tower="${floor}"]`).click();
      await page.waitForSelector(".fighters");
      const trick = await page.evaluate(() => {
        const b = Craepets.battle(); const t = b.trick && b.trick.id; b.trick = null; b.deadline = 0; return t;
      });
      if (!/tower/.test(await page.evaluate(() => document.querySelector("#scene").className))) {
        throw new Error("the tower does not get its own sky");
      }
      for (let i = 0; i < 40; i++) {
        if (await page.evaluate(() => { const b = Craepets.battle(); return b && b.over; })) break;
        const idx = await page.evaluate(() => Craepets.correctIndex());
        if (idx < 0) break;
        await page.locator(`[data-pick="${idx}"]`).click();
        await page.waitForTimeout(60);
        if (await page.locator("[data-next]").count()) await page.locator("[data-next]").click();
        await page.waitForTimeout(60);
      }
      const r = await page.evaluate(() => { const b = Craepets.battle(); return { over: b.over, floor: b.floor, crits: b.crits, hits: b.hits, boss: !!b.rival.boss, reward: b.reward, phase: b.phase }; });
      r.trick = trick;
      return r;
    };
    // floor 1, with a snack first: food from the bag heals a hurt Craepet
    await page.locator('[data-tower="1"]').click();
    await page.waitForSelector(".fighters");
    await page.evaluate(() => { Craepets.battle().myHp = 10; Craepets.grant(0); });
    await page.waitForSelector("[data-snack]");
    await page.locator("[data-snack]").click();
    await page.waitForSelector(".sheet [data-use]");
    await page.locator(".sheet [data-use]").first().click();
    await page.waitForTimeout(150);
    const snacked = await page.evaluate(() => { const b = Craepets.battle(); return { hp: b.myHp, snacks: b.snacks }; });
    if (snacked.hp <= 10 || snacked.snacks !== 1) throw new Error("a snack did not heal in the duel");
    for (let i = 0; i < 40; i++) {
      if (await page.evaluate(() => { const b = Craepets.battle(); return b && b.over; })) break;
      const idx = await page.evaluate(() => Craepets.correctIndex());
      await page.locator(`[data-pick="${idx}"]`).click();
      await page.waitForTimeout(60);
      if (await page.locator("[data-next]").count()) await page.locator("[data-next]").click();
      await page.waitForTimeout(60);
    }
    const f1 = await page.evaluate(() => { const b = Craepets.battle(); return { over: b.over, reward: b.reward }; });
    if (f1.over !== "win" || !f1.reward || !f1.reward.cleared) throw new Error("floor 1 of the tower was not cleared");
    if (await page.evaluate(() => Craepets.arena().floor) !== 1) throw new Error("clearing floor 1 was not remembered");
    if (!(await page.locator('[data-tower="2"]').count())) throw new Error("no way on to floor 2 after a win");
    // the rest of the way up to The Shade — a level-5 pet needs the
    // charged criticals to get there
    let sawCrit = 0, shade = null;
    for (let floor = 2; floor <= 7; floor++) {
      const r = await fightFloor(floor);
      sawCrit += r.crits;
      if (r.over !== "win") throw new Error(`floor ${floor} (${r.boss ? "The Shade" : "a shadow"}) was not won with every answer right`);
      if (r.boss) shade = r;
    }
    if (!sawCrit) throw new Error("no charged critical hit landed in six floors of right answers");
    if (!shade || shade.phase !== 2 || !shade.trick) throw new Error("The Shade did not bring a trick and grow darker");
    if (!shade.reward.loot || shade.reward.loot.kind !== "brush") throw new Error("The Shade did not drop his paint brush the first time");
    if (await page.evaluate(() => Craepets.state().colours.indexOf("shadow")) === -1) throw new Error("the Shadow brush was not really given");
    if (!/Gold/.test(shade.reward.rankUp && shade.reward.rankUp.name)) throw new Error("beating The Shade should make you Gold");
    if (await page.evaluate(() => Craepets.state().trophies.indexOf("shade")) === -1) throw new Error("no Shade Breaker trophy");
    await page.locator("[data-leave]").click();
    await page.waitForSelector(".panel.tower");
    if (!/Gold/.test(await page.locator(".rankchip").textContent())) throw new Error("the rank chip did not update");
    if (await page.locator("[data-floor]").count() < 7) throw new Error("cleared floors cannot be fought again");
    if (!(await page.locator('[data-tower="8"]').count())) throw new Error("the tower does not go on past The Shade");

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

    // ---- THE WARDROBE: the Market sells a hat, the shop offers to put it
    // straight on, and the pet is then drawn wearing it everywhere
    const wearArt = await page.evaluate(() => {
      const bad = [];
      CPPets.SPECIES.forEach((sp) => CPPets.WEAR.forEach((w) => {
        const wear = {}; wear[w.slot] = w.id;
        const plain = CPPets.chip(sp.id, "berry", 48, {}, 1), on = CPPets.chip(sp.id, "berry", 48, wear, 1);
        if (plain === on) bad.push(sp.id + "/" + w.id);
      }));
      return { bad, n: CPPets.WEAR.length };
    });
    if (wearArt.bad.length) throw new Error(`clothes that draw nothing: ${wearArt.bad.slice(0, 3).join(", ")}`);
    await page.locator('[data-go="market"]').click();
    const wearOnShelf = await page.evaluate(() => CPData.shopStock(null, Craepets.who()).filter((i) => i.kind === "wear").map((i) => i.id));
    if (wearOnShelf.length < 1) throw new Error("the market has no dress-up shelf");
    await page.locator(`[data-buy="${wearOnShelf[0]}"]`).click();
    if (await page.locator("[data-change]").count()) {
      await page.locator(`[data-change="${await page.evaluate(() => Craepets.changeIndex())}"]`).click();
    }
    await page.waitForSelector('[data-use^="wear:"]');
    await page.locator('[data-use^="wear:"]').click();
    await page.waitForTimeout(200);
    const worn = await page.evaluate((id) => {
      const it = CPPets.wearById(id), S = Craepets.state();
      return { on: S.pet.wear[it.slot] === id, owned: S.wardrobe.indexOf(id) !== -1, dressed: S.today.dressed };
    }, wearOnShelf[0]);
    if (!worn.owned || !worn.on || !worn.dressed) throw new Error("a bought hat was not put on");
    if (await page.locator(".sheet").count()) await page.locator(".sheet .close").click();
    // …and the shop will not sell it twice
    if (!(await page.locator(`[data-buy="${wearOnShelf[0]}"][disabled]`).count())) throw new Error("the market would sell the same hat twice");
    // the Dress button at the nest opens the wardrobe, and things come off again
    await page.locator('[data-go="nest"]').click();
    await page.locator('[data-do="dress"]').click();
    await page.waitForSelector('.sheet [data-use^="unwear:"]');
    await page.locator('.sheet [data-use^="unwear:"]').first().click();
    await page.waitForTimeout(150);
    if (await page.evaluate((id) => Craepets.state().pet.wear[CPPets.wearById(id).slot], wearOnShelf[0])) throw new Error("a hat could not be taken off");
    await page.locator('.sheet [data-use^="wear:"]').first().click();
    await page.waitForTimeout(150);
    await page.locator(".sheet .close").click();

    // ---- PETPETS: the Market sells a little friend, it gets a name, and it
    // trots along behind the pet
    await page.locator('[data-go="market"]').click();
    const ppOnShelf = await page.evaluate(() => CPData.shopStock(null, Craepets.who()).filter((i) => i.kind === "petpet").map((i) => i.id));
    if (ppOnShelf.length < 1) throw new Error("the market has no petpet shelf");
    await page.locator(`[data-buy="${ppOnShelf[0]}"]`).click();
    if (await page.locator("[data-change]").count()) {
      await page.locator(`[data-change="${await page.evaluate(() => Craepets.changeIndex())}"]`).click();
    }
    await page.waitForSelector("#pp-go");
    if (await page.locator("#pp-input").count()) await page.fill("#pp-input", "Bean");
    await page.locator("#pp-go").click();
    await page.waitForTimeout(150);
    const pp = await page.evaluate(() => ({ owned: Craepets.petpets(), out: Craepets.state().pet.petpet }));
    if (!pp.owned.length || !pp.out || pp.out.id !== ppOnShelf[0] || pp.out.name !== "Bean") throw new Error("the petpet was not adopted and named");
    if (!(await page.evaluate(() => Craepets.diary().some((e) => e.e === "🐾")))) throw new Error("the petpet was not written in the diary");
    await page.locator('[data-go="nest"]').click();
    await page.evaluate(() => { const a = Craepets._anim(); a.x = 0.5; a.tx = 0.3; a.px = undefined; });
    await page.waitForTimeout(500);
    const ppAnim = await page.evaluate(() => Craepets._anim());
    if (typeof ppAnim.px !== "number" || ppAnim.px <= ppAnim.x) throw new Error("the petpet is not following behind");

    // ---- THE BANK: coins in, 3% overnight, coins out
    await page.locator('[data-go="market"]').click();
    const purse0 = await page.evaluate(() => Craepets.state().coins);
    await page.locator('[data-bank="in"]').click();
    await page.waitForSelector('[data-bankamt="in:100"]');
    await page.locator('[data-bankamt="in:100"]').click();
    await page.waitForTimeout(150);
    let bk = await page.evaluate(() => ({ b: Craepets.bank(), coins: Craepets.state().coins }));
    if (bk.b.balance !== 100 || bk.coins !== purse0 - 100) throw new Error("the deposit did not move the coins");
    await page.evaluate(() => { Craepets.bank().day -= 1; Craepets.grant(0); });
    bk = await page.evaluate(() => ({ b: Craepets.bank() }));
    if (bk.b.balance !== 103 || bk.b.earned !== 3) throw new Error(`a night in the bank did not pay 3% (${JSON.stringify(bk.b)})`);
    if (!/paid you 🪙 3/.test(await page.locator(".panel.bank").textContent())) throw new Error("the bank does not announce the interest");
    await page.locator('[data-bank="out"]').click();
    await page.waitForSelector('[data-bankamt="out:103"]');
    await page.locator('[data-bankamt="out:103"]').click();
    await page.waitForTimeout(150);
    bk = await page.evaluate(() => ({ b: Craepets.bank(), coins: Craepets.state().coins }));
    if (bk.b.balance !== 0 || bk.coins !== purse0 + 3) throw new Error("taking the coins out lost some");

    // ---- RANDOM EVENTS: a coin on the path, announced and written down
    const evCoins = await page.evaluate(() => Craepets.state().coins);
    await page.evaluate(() => Craepets._event(0));
    await page.waitForSelector(".sheet");
    if (!/found 🪙/.test(await page.locator(".sheet").textContent())) throw new Error("the event sheet says nothing");
    if (await page.evaluate(() => Craepets.state().coins) <= evCoins) throw new Error("the coin on the path was not picked up");
    if (await page.evaluate(() => Craepets.state().today.events) !== 1) throw new Error("the event was not counted");
    await page.locator(".sheet .close").click();

    // every rule the games room can ask has a line in the script (so it can be recorded)
    const unspoken = await page.evaluate(() => {
      const bad = [];
      Object.keys(CPCatch.RULES).forEach((t) => CPCatch.RULES[t].forEach((r) => { if (CPLines.spoken(r.text) === r.text) bad.push(r.text); }));
      ["tot", "early", "mid", "big", "grown"].forEach((t) => CPMatch.themes(t, CPData, CPLines).forEach((th) => { if (CPLines.spoken(th.rule) === th.rule) bad.push(th.rule); }));
      Object.keys(CPData.PAIRS).forEach(() => {});
      return bad;
    });
    if (unspoken.length) throw new Error(`game rules missing from lines.js: ${unspoken.slice(0, 3).join(" | ")}`);

    // ---- SKY CATCH: the game runs, a right catch scores, and it pays at the end
    await page.locator('[data-go="games"]').click();
    await page.waitForSelector("[data-catchplay]");
    if (!(await page.locator('.npc[data-say-text], .npc [data-say-text]').count())) throw new Error("nobody runs the games room");
    await page.locator("[data-catchplay]").click();
    await page.waitForSelector("#catch-canvas");
    await page.waitForTimeout(300);
    if (!(await page.evaluate(() => Craepets.catching() && !!CPCatch.state()))) throw new Error("Sky Catch did not start");
    // drop a right one straight onto the pet, and a wrong one far away
    await page.evaluate(() => {
      const s = CPCatch.state();
      const good = s.rule.good(), bad = s.rule.bad();
      s.items.push({ label: good.label, ok: true, x: s.x, y: s.cv.height - s.petH, r: s.scale * 2.2, vy: 0.3, tint: "#fff" });
      s.items.push({ label: bad.label, ok: false, x: (s.x < s.cv.width / 2 ? s.cv.width - s.scale * 3 : s.scale * 3), y: s.cv.height - s.petH, r: s.scale * 2.2, vy: 0.3, tint: "#fff" });
    });
    await page.waitForTimeout(400);
    const sc = await page.evaluate(() => { const s = CPCatch.state(); return { score: s.score, right: s.right, wrong: s.wrong }; });
    if (sc.score !== 1 || sc.right !== 1 || sc.wrong !== 0) throw new Error(`a catch did not score properly: ${JSON.stringify(sc)}`);
    const catchCoins = await page.evaluate(() => Craepets.state().coins);
    await page.evaluate(() => { CPCatch.state().t0 = performance.now() - CPCatch.DURATION + 300; });
    await page.waitForSelector(".sheet .teach", { timeout: 4000 });
    const ended = await page.evaluate(() => ({ coins: Craepets.state().coins, best: Craepets.state().catch.best, games: Craepets.state().catch.games, on: Craepets.catching(), today: Craepets.state().today.catchScore }));
    if (ended.on || ended.games !== 1 || ended.best < 1 || ended.coins < catchCoins + 3 || !ended.today) throw new Error(`Sky Catch did not finish and pay: ${JSON.stringify(ended)}`);
    await page.locator(".sheet .close").click();

    // ---- MEMORY MATCH: deal, find every pair, get paid, see the pairs listed
    await page.locator('[data-gamestab="match"]').click();
    await page.waitForSelector("[data-matchplay]");
    await page.locator("[data-matchplay]").click();
    await page.waitForSelector(".mcard");
    const deck = await page.evaluate(() => Craepets.match().cards.map((c) => c.pair));
    if (deck.length < 8) throw new Error("too few cards were dealt");
    const matchCoins = await page.evaluate(() => Craepets.state().coins);
    const byPair = {};
    deck.forEach((p, i) => { (byPair[p] = byPair[p] || []).push(i); });
    for (const p of Object.keys(byPair)) {
      await page.locator(`[data-mc="${byPair[p][0]}"]`).click();
      await page.locator(`[data-mc="${byPair[p][1]}"]`).click();
      await page.waitForTimeout(60);
    }
    await page.waitForSelector(".sheet .pairlist", { timeout: 4000 });
    const matched = await page.evaluate(() => ({ coins: Craepets.state().coins, games: Craepets.state().match.games, best: Craepets.state().match.best, on: !!Craepets.match() }));
    if (matched.on || matched.games !== 1 || matched.best !== 100 || matched.coins <= matchCoins) throw new Error(`a perfect game of Memory Match did not pay: ${JSON.stringify(matched)}`);
    if (await page.locator(".sheet .pair").count() !== Object.keys(byPair).length) throw new Error("the pairs were not listed at the end");
    await page.locator(".sheet .close").click();
    // …and the first steps noticed the game (and the earlier feed and sums)
    const steps = await page.evaluate(() => Craepets.steps());
    if (!steps.game || !steps.feed || !steps.farm3) throw new Error(`the first-steps list is not ticking things off: ${JSON.stringify(steps)}`);

    // ---- WEATHER: rain streaks the window, and the wet place pays extra
    await page.locator('[data-go="nest"]').click();
    await page.evaluate(() => Craepets._setWeather("rainy"));
    await page.waitForTimeout(100);
    if (!(await page.locator(".scene .win .wx-rainy").count())) throw new Error("no rain on the window");
    if (!/🌧️/.test(await page.locator(".place-tag").textContent())) throw new Error("the room's tag does not show the weather");
    await page.locator('[data-go="pool"]').click();
    await page.waitForSelector(".choice");
    if (!/Rainy today/.test(await page.locator(".panel").first().textContent())) throw new Error("the pool does not announce the rain bonus");
    if (!(await page.locator(".npc").count())) throw new Error("nobody runs the pool");
    await page.evaluate(() => Craepets._setWeather(null));

    // ---- THE CALENDAR: Halloween hangs a garland, leaves a present and pays extra;
    // autumn grows pumpkins and puts a seasonal shelf in the Market; Advent counts
    // the sleeps; a hatch-day gets a cake and a party hat
    await page.locator('[data-go="nest"]').click();
    await page.evaluate(() => Craepets._setDate("2026-10-31"));
    await page.waitForTimeout(100);
    if (!/🎃/.test(await page.locator(".scene .garland").textContent())) throw new Error("no pumpkins over the scene on Halloween");
    if (!/Halloween/.test(await page.locator(".panel.party").textContent())) throw new Error("the nest does not say it is Halloween");
    const halloweenCoins = await page.evaluate(() => Craepets.state().coins);
    await page.locator("[data-claimparty]").first().click();
    await page.waitForSelector(".sheet");
    const present = await page.evaluate(() => ({ coins: Craepets.state().coins, hat: Craepets.wardrobe().indexOf("pumpkinhat") !== -1,
      sweets: Craepets.state().bag.candyfloss || 0, on: Craepets.state().pet.wear.head, parties: Craepets.state().stats.parties }));
    if (present.coins < halloweenCoins + 50 || !present.hat || !present.sweets || present.on !== "pumpkinhat" || present.parties !== 1) {
      throw new Error(`the Halloween present was not handed over: ${JSON.stringify(present)}`);
    }
    await page.locator(".sheet .close").click();
    if (await page.locator("[data-claimparty]").count()) throw new Error("a holiday present can be opened twice");
    if (!/Halloween/.test(await page.locator(".panel.times").textContent())) throw new Error("the Valley Times missed the holiday");
    // autumn at the farm: pumpkins in the patch and the holiday bonus announced
    await page.locator('[data-go="farm"]').click();
    await page.waitForSelector(".choice:not([disabled])");
    if (!/every right answer, everywhere/.test(await page.locator(".panel").first().textContent())) throw new Error("the farm does not announce the holiday bonus");
    const plotsBefore = await page.locator(".plot.full").count();
    const farmCoinsBefore = await page.evaluate(() => Craepets.state().coins);
    await page.locator(`[data-pick="${await page.evaluate(() => Craepets.correctIndex())}"]`).click();
    await page.waitForSelector(".teach");
    const crops = await page.evaluate(() => Array.from(document.querySelectorAll(".plot.full")).map((p) => p.textContent.trim()));
    if (crops.length !== plotsBefore + 1 || !CROPS_AUTUMN.some((c) => crops.includes(c))) throw new Error(`the farm is not growing autumn crops: ${crops.join(" ")}`);
    if (await page.evaluate(() => Craepets.state().coins) < farmCoinsBefore + 6 + 2) throw new Error("the holiday bonus was not paid");
    // the seasonal shelf
    await page.locator('[data-go="market"]').click();
    if (!(await page.locator(".item .own", { hasText: "in season" }).count())) throw new Error("the Market has no seasonal shelf");
    const seasonal = await page.evaluate(() => {
      const ids = CPData.shopStock(null, Craepets.who()).filter((i) => i.seasonal).map((i) => i.id);
      return { n: ids.length, autumn: ids.every((id) => CPCal.SEASONS.autumn.foods.includes(id)) };
    });
    if (seasonal.n !== 2 || !seasonal.autumn) throw new Error("the seasonal shelf is not autumn's");
    // the first day of school is the day after Labor Day (the first Monday of September)
    const school = await page.evaluate(() => {
      const ids = (s) => { CPCal._setDate(s); return CPCal.holidays().map((h) => h.id); };
      const out = { labor: ids("2026-09-07"), day: ids("2026-09-08"), after: ids("2026-09-09"), next: ids("2027-09-07") };
      CPCal._setDate(null);
      return out;
    });
    if (school.labor.includes("school") || !school.day.includes("school") || school.after.includes("school") || !school.next.includes("school")) {
      throw new Error(`the first day of school is on the wrong day: ${JSON.stringify(school)}`);
    }
    await page.locator('[data-go="nest"]').click();
    await page.evaluate(() => Craepets._setDate("2026-09-08"));
    await page.waitForTimeout(100);
    if (!/🎒/.test(await page.locator(".scene .garland").textContent())) throw new Error("no school garland");
    if (!/first day of school/i.test(await page.locator(".panel.party").textContent())) throw new Error("the nest does not say it is the first day of school");
    // Kieran's birthday (22 April) is the day before Cory's (23 April): on
    // Kieran's day Cory gets a nudge and a small present, and on his own day
    // it is YOUR day — a garland, a bonus, a cake and a party hat
    await page.evaluate(() => Craepets._setDate("2026-04-22"));
    await page.waitForTimeout(100);
    const kday = await page.evaluate(() => Craepets.celebrations().filter((c) => c.kind === "birthday").map((c) => c.key));
    if (kday.length !== 1 || !/bday:kieran/.test(kday[0])) throw new Error(`Kieran's birthday was not noticed: ${kday}`);
    if (!/Happy birthday, Kieran/.test(await page.locator(".panel.party").textContent())) throw new Error("the nest does not wish Kieran happy birthday");
    if (!/1 sleep until YOUR birthday/.test(await page.locator(".panel.party").textContent())) throw new Error("Cory is not told his own birthday is tomorrow");
    await page.evaluate(() => Craepets._setDate("2026-04-23"));
    await page.waitForTimeout(100);
    if (!/🎂/.test(await page.locator(".scene .garland").textContent())) throw new Error("no birthday garland");
    const bdays = await page.evaluate(() => Craepets.celebrations().filter((c) => c.kind === "birthday").map((c) => c.key));
    if (bdays.length !== 1 || !/bday:cory/.test(bdays[0])) throw new Error(`Cory's birthday was not noticed: ${bdays}`);
    if (!/Happy birthday, Cory!/.test(await page.locator(".panel.party").textContent())) throw new Error("the nest does not wish Cory happy birthday");
    const bcoins = await page.evaluate(() => Craepets.state().coins);
    await page.locator(`[data-claimparty="${bdays.find((k) => /cory/.test(k))}"]`).click();
    await page.waitForSelector(".sheet");
    const mine = await page.evaluate(() => ({ coins: Craepets.state().coins, cake: Craepets.state().bag.cake || 0, hat: Craepets.state().pet.wear.head }));
    if (mine.coins < bcoins + 80 || !mine.cake || mine.hat !== "partyhat") throw new Error(`Cory's own birthday present was thin: ${JSON.stringify(mine)}`);
    await page.locator(".sheet .close").click();
    // Mum's birthday (30 September): the kids are told to post her a present
    await page.evaluate(() => Craepets._setDate("2026-09-30"));
    await page.waitForTimeout(100);
    const mum = await page.evaluate(() => Craepets.celebrations().filter((c) => c.kind === "birthday").map((c) => c.line));
    if (mum.length !== 1 || !/Shannon/.test(mum[0]) || !/Post her a present/.test(mum[0])) throw new Error(`Mum's birthday is not celebrated: ${mum}`);
    // …and the week before Ellie's (11 December) the nest counts the sleeps
    await page.evaluate(() => Craepets._setDate("2026-12-08"));
    await page.waitForTimeout(100);
    if (!/3 sleeps until Ellie's birthday/.test(await page.locator(".panel.party").textContent())) throw new Error("the nest is not counting down to Ellie's birthday");
    // Christmas Eve: one sleep to go, and the snow is guaranteed on the day itself
    await page.locator('[data-go="nest"]').click();
    await page.evaluate(() => Craepets._setDate("2026-12-24"));
    await page.waitForTimeout(100);
    if (!/1 sleep until Christmas/.test(await page.locator(".panel.party").textContent())) throw new Error("Advent is not counting the sleeps");
    await page.evaluate(() => Craepets._setDate("2026-12-25"));
    await page.waitForTimeout(100);
    if (await page.evaluate(() => Craepets.weather().id) !== "snowy") throw new Error("it is not snowing on Christmas Day");
    if (!/🎅|🎄/.test(await page.locator(".scene .garland").textContent())) throw new Error("no Christmas garland");
    // a hatch-day, a year to the day after it hatched
    await page.evaluate(() => { Craepets.state().pet.born = new Date(2026, 5, 1).getTime(); Craepets._setDate("2027-06-01"); });
    await page.waitForTimeout(100);
    const hatchdays = await page.evaluate(() => Craepets.celebrations().filter((c) => c.kind === "hatchday").length);
    if (hatchdays !== 1) throw new Error("the hatch-day was not noticed");
    await page.locator("[data-claimparty]").first().click();
    await page.waitForSelector(".sheet");
    const bday = await page.evaluate(() => ({ cake: Craepets.state().bag.cake || 0, hat: Craepets.wardrobe().indexOf("partyhat") !== -1, trophy: Craepets.state().trophies.indexOf("hatchday") !== -1 }));
    if (!bday.cake || !bday.hat || !bday.trophy) throw new Error(`the hatch-day party was thin: ${JSON.stringify(bday)}`);
    await page.locator(".sheet .close").click();
    await page.evaluate(() => Craepets._setDate(null));

    // ---- THE MAP: every place is a marker, and tapping one goes there
    await page.locator('[data-go="map"]').click();
    await page.waitForSelector(".valley");
    if (await page.locator(".valley .mp[data-goto]").count() < 9) throw new Error("the map is missing places");
    if (!(await page.locator('.valley .mp.home.mine[data-goto="nest"]').count())) throw new Error("your own house is not on the map");
    await page.locator('.valley [data-map="farm"]').click();
    await page.waitForSelector(".choice");
    if (await page.evaluate(() => Craepets.view()) !== "farm") throw new Error("tapping the farm on the map did not go there");

    // ---- THE CLOCK: after dark the window fills with stars and the room dims
    await page.locator('[data-go="nest"]').click();
    await page.evaluate(() => Craepets._setHour(22));
    await page.waitForTimeout(100);
    if (await page.evaluate(() => Craepets.timeOfDay()) !== "night") throw new Error("10pm is not night");
    if (!(await page.locator(".scene.tod-night .win .tod-night").count())) throw new Error("no stars in the window at night");
    if (!(await page.locator(".scene .roomtint").count())) throw new Error("the room does not dim at night");
    await page.evaluate(() => Craepets._setHour(12));
    await page.waitForTimeout(100);
    if (await page.locator(".scene .tod, .scene .roomtint").count()) throw new Error("it is still dark at noon");
    await page.evaluate(() => Craepets._setHour(null));

    // ---- THE DIARY: the pet has been writing, and you can write too
    await page.locator('[data-go="diary"]').click();
    await page.waitForSelector(".entry");
    const diaryBefore = await page.evaluate(() => Craepets.diary().length);
    if (diaryBefore < 3) throw new Error("the diary is nearly empty after all that");
    if (!(await page.evaluate(() => Craepets.diary().some((e) => e.e === "🥚")))) throw new Error("hatching was not written down");
    if (!(await page.evaluate(() => Craepets.diary().some((e) => e.e === "👒")))) throw new Error("dressing up was not written down");
    await page.fill("#diary-input", "Today we beat Pip.");
    await page.locator("#diary-go").click();
    await page.waitForTimeout(150);
    const diaryNow = await page.evaluate(() => Craepets.diary());
    if (diaryNow.length !== diaryBefore + 1 || !diaryNow[diaryNow.length - 1].me) throw new Error("writing in the diary did not add an entry");
    if (await page.locator(".entry.mine").count() !== 1) throw new Error("the player's own entry is not marked");

    // ---- your own house: buy furniture, put it out, move somewhere bigger
    await page.evaluate(() => Craepets.grant(5000));
    await page.locator('[data-go="home"]').click();
    await page.locator('[data-hometab="homes"]').click();
    const homesBefore = await page.evaluate(() => Craepets.house().homes.length);
    await page.locator("[data-buyhome]:not([disabled])").first().click();
    await page.waitForSelector(".sheet");
    await page.locator(".sheet .close").click();
    const houseNow = await page.evaluate(() => Craepets.house());
    if (houseNow.homes.length !== homesBefore + 1 || houseNow.home === "nest") {
      throw new Error("paying for a new home did not move you into it");
    }
    await page.locator('[data-go="market"]').click();
    const decor = await page.evaluate(() => CPData.shopStock(null, Craepets.who()).filter((i) => i.kind === "decor").map((i) => i.id));
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
    await page.locator('[data-hometab="room"]').click();
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
    if (await page.locator(".panel.records").count()) throw new Error("records need two players before they mean anything");

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
    await page.evaluate(() => Craepets.grant(400));   // she cannot shop on 60 coins
    await page.locator('[data-go="market"]').click();
    await page.waitForSelector("[data-stallbuy]");
    if (!(await page.locator("[data-stallbuy]:not([disabled])").count())) {
      throw new Error("Cory's whole shelf is priced out of reach");
    }
    const herCoins = await page.evaluate(() => Craepets.state().coins);
    const hisBefore = await page.evaluate(() => JSON.parse(localStorage.getItem("craepets.v1.cory")).coins);
    await page.locator("[data-stallbuy]:not([disabled])").first().click();
    if (await page.locator("[data-change]").count()) {
      await page.locator(`[data-change="${await page.evaluate(() => Craepets.changeIndex())}"]`).click();
    }
    await page.waitForTimeout(200);
    const hisAfter = await page.evaluate(() => JSON.parse(localStorage.getItem("craepets.v1.cory")));
    const herNow = await page.evaluate(() => ({ coins: Craepets.state().coins, buys: Craepets.state().stats.buy }));
    if (herNow.coins === herCoins || herNow.buys !== 1) throw new Error("the buyer was not charged");
    if (hisAfter.coins <= hisBefore) throw new Error("the shopkeeper was not paid");
    if (hisAfter.stats.sold !== 1) throw new Error("the sale was not written into the seller's save");
    if (!hisAfter.stall.sales.length) throw new Error("the seller got no receipt");

    // ---- THE POST: Shannon posts Cory a present with a note, out of her bag
    await page.evaluate(() => { const S = Craepets.state(); S.bag.cookie = (S.bag.cookie || 0) + 1; });
    await page.locator('[data-go="case"]').click();
    await page.locator('[data-post="cory"]').click();
    await page.waitForSelector('.sheet [data-postpick="cookie"]');
    await page.locator('.sheet [data-postpick="cookie"]').click();
    await page.waitForSelector("[data-postsend]");
    await page.locator('[data-postnote="2"]').click();
    await page.waitForSelector("[data-postsend]");
    await page.locator("[data-postsend]").click();
    await page.waitForTimeout(200);
    const posted = await page.evaluate(() => ({ bag: Craepets.state().bag.cookie || 0, gifts: Craepets.state().stats.gifts,
      his: JSON.parse(localStorage.getItem("craepets.v1.cory")).mail }));
    if (posted.bag !== 0) throw new Error("the posted cookie stayed in the sender's bag");
    if (posted.gifts !== 1) throw new Error("posting was not counted");
    if (!posted.his || posted.his.length !== 1 || posted.his[0].id !== "cookie" || posted.his[0].from !== "shannon") {
      throw new Error("the parcel did not land in Cory's post");
    }
    if (!/best/.test(posted.his[0].note)) throw new Error("the chosen note was not sent");

    // ...and Cory's pet is exactly where he left it
    await page.locator("[data-swap]").click();
    await page.locator('[data-who="cory"]').click();
    await page.waitForTimeout(200);
    const cory = await page.evaluate(() => Craepets.state());
    if (!cory.pet || cory.pet.name !== "Wobble") throw new Error("switching profiles lost Cory's pet");
    // …with Shannon's parcel waiting at the nest, and the cookie inside it
    if (!(await page.locator('[data-go="nest"] .dot').count())) throw new Error("the nest tab does not flag the post");
    await page.waitForSelector("[data-openpost]");
    const cookies0 = cory.bag.cookie || 0;
    await page.locator("[data-openpost]").click();
    await page.waitForSelector(".sheet");
    const opened = await page.evaluate(() => ({ mail: Craepets.mail().length, cookie: Craepets.state().bag.cookie || 0,
      wrote: Craepets.diary().some((e) => e.e === "📬"), got: Craepets.state().stats.received }));
    if (opened.mail !== 0 || opened.cookie !== cookies0 + 1 || !opened.wrote || opened.got !== 1) throw new Error("opening the post did not hand over the cookie");
    await page.locator(".sheet .close").click();

    // ---- VISITING: Cory walks round to Shannon's (her house is on the map) and finds Sable in her room
    const herSave = await page.evaluate(() => localStorage.getItem("craepets.v1.shannon"));
    await page.locator('[data-go="map"]').click();
    await page.waitForSelector('.valley .mp.home[data-visit="shannon"]');
    await page.locator('[data-go="case"]').click();
    await page.locator('[data-visit="shannon"]').click();
    await page.waitForSelector(".panel.visit");
    if (await page.evaluate(() => Craepets.visiting()) !== "shannon") throw new Error("the visit did not start");
    if (!/Sable/.test(await page.locator(".panel.visit").textContent())) throw new Error("the visit does not introduce Shannon's pet");
    if (!/Sable/.test(await page.locator("#scene").getAttribute("aria-label"))) throw new Error("the room is not drawn with Shannon's pet in it");
    await page.locator("#scene").click();
    await page.waitForTimeout(100);
    if (await page.evaluate(() => localStorage.getItem("craepets.v1.shannon")) !== herSave) throw new Error("visiting changed the host's save");
    if (!(await page.evaluate(() => Craepets.diary().some((e) => e.e === "🏡")))) throw new Error("the visit was not written in the diary");
    // with two valleys on the device, the family records board appears — and Cory holds the answers record
    await page.locator('.panel.visit [data-goto="case"]').click();
    await page.waitForSelector(".panel.records");
    if (!/Most right answers[\s\S]*Wobble/.test(await page.locator(".panel.records").textContent())) throw new Error("the records board does not credit Wobble");
    await page.locator('[data-visit="shannon"]').click();
    await page.waitForSelector(".panel.visit");
    await page.locator('.panel.visit [data-goto="case"]').click();
    if (await page.evaluate(() => Craepets.visiting()) !== null) throw new Error("could not leave the visit");
    if (await page.evaluate(() => Craepets.state().pet.name) !== "Wobble") throw new Error("coming home lost the visitor's own pet");

    // ---- THE PHOTO BOOTH: a real PNG of the pet in its room
    await page.locator('[data-go="nest"]').click();
    await page.locator("[data-photo]").click();
    await page.waitForSelector("img.photo");
    const photo = await page.locator("img.photo").getAttribute("src");
    if (!/^data:image\/png/.test(photo) || photo.length < 4000) throw new Error("the photo booth made no picture");
    if (!(await page.locator(".sheet a[download]").count())) throw new Error("the photo cannot be saved");
    await page.locator(".sheet .close").click();
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
    // a toddler can hatch it just by tapping the shell
    for (let tap = 0; tap < 8; tap++) { await page.locator("[data-tapegg]").click(); await page.waitForTimeout(40); }
    await page.waitForTimeout(150);
    if (await page.evaluate(() => !!Craepets.state().pet.egg)) throw new Error("eight taps did not hatch the egg");
    await page.locator('[data-go="farm"]').click();
    await page.waitForSelector(".choice");
    if (await page.locator(".choice").count() !== 2) throw new Error("the tiny level should offer 2 big choices");
    const kIdx = await page.evaluate(() => Craepets.correctIndex());
    await page.locator(`[data-pick="${(kIdx + 1) % 2}"]`).click();
    await page.waitForTimeout(250);
    if (await page.locator(".teach").count()) throw new Error("a miss at the tiny level should just wait, not score");
    if (await page.evaluate(() => Craepets.state().stats.wrong) !== 0) throw new Error("a tiny miss was counted wrong");
    // …and everything the narrator says at this level is a real recording
    const narration = await page.evaluate(() => Craepets.narration());
    const said = await page.evaluate(() => Craepets.said());
    if (!said.length) throw new Error("the tiny level's question was not read aloud");
    const unrecorded = await page.evaluate((toks) => toks.filter((t) => !window.CRAEPETS_NARRATION[t]), said);
    if (narration.clips && unrecorded.length) throw new Error(`no recording for: ${unrecorded.join(", ")}`);
    // every clip the manifest promises really is on disk (the play-test's
    // own server 404s anything missing, and a 404 fails the run)
    const clipCheck = await page.evaluate(async () => {
      const names = Object.keys(window.CRAEPETS_NARRATION);
      const sample = names.filter((n, i) => i % 40 === 0);
      const bad = [];
      for (const n of sample) {
        const r = await fetch("audio/" + n + ".mp3", { method: "HEAD" });
        if (!r.ok) bad.push(n);
      }
      return { total: names.length, checked: sample.length, bad };
    });
    if (clipCheck.bad.length) throw new Error(`manifest lists clips that are not there: ${clipCheck.bad.join(", ")}`);
    const kIdx2 = await page.evaluate(() => Craepets.correctIndex());
    await page.locator(`[data-pick="${kIdx2}"]`).click();
    await page.waitForSelector(".teach");
    const saidAfter = await page.evaluate(() => Craepets.said());
    if (saidAfter.length < 2 || !/^p-/.test(saidAfter[0])) throw new Error("a right answer at the tiny level was not praised aloud");

    // ---- HELP and BACKUP: the help sheet opens; a valley saved as a file
    // comes back exactly; starting over needs the pet's name typed
    await page.locator("[data-help]").click();
    await page.waitForSelector(".sheet .helprow");
    if (await page.locator(".sheet .helprow").count() < 6) throw new Error("the help sheet is thin");
    await page.locator(".sheet .close").click();
    const kName = await page.evaluate(() => Craepets.state().pet.name);
    const exported = await page.evaluate(() => Craepets.exportJson());
    if (JSON.parse(exported).pet.name !== kName) throw new Error("the exported valley is not this valley");
    await page.locator('[data-go="case"]').click();
    if (!(await page.locator("a[download][href^='data:application/json']").count())) throw new Error("no file to save the valley as");
    await page.evaluate(() => { Craepets.state().pet.name = "Somebody Else"; Craepets.grant(0); });
    await page.locator("[data-import]").click();
    await page.waitForSelector("#import-text");
    await page.fill("#import-text", exported);
    await page.locator("#import-go").click();
    await page.waitForTimeout(200);
    if (await page.evaluate(() => Craepets.state().pet.name) !== kName) throw new Error("loading the saved valley did not bring the pet back");
    await page.locator('[data-go="case"]').click();      // a load takes you home to the nest
    await page.locator("[data-import]").click();
    await page.fill("#import-text", "{\"nonsense\":true}");
    await page.locator("#import-go").click();
    await page.waitForTimeout(150);
    if (await page.evaluate(() => Craepets.state().pet.name) !== kName) throw new Error("a bad file replaced the valley");
    await page.locator(".sheet .close").click();
    await page.locator("[data-reset]").click();
    await page.waitForSelector("#reset-input");
    await page.fill("#reset-input", "wrong name");
    await page.locator("#reset-go").click();
    await page.waitForTimeout(150);
    if (!(await page.evaluate(() => !!Craepets.state().pet))) throw new Error("the wrong name still started over");
    await page.fill("#reset-input", kName);
    await page.locator("#reset-go").click();
    await page.waitForSelector("#do-adopt");
    if (await page.evaluate(() => !!Craepets.state().pet)) throw new Error("starting over kept the old pet");

    await page.evaluate(() => Object.keys(localStorage)
      .filter((k) => k.startsWith("craepets")).forEach((k) => localStorage.removeItem(k)));
    return `${art.n} sprites bake; farm/well/pool pay for maths, words & world; ` +
      "the heat rises after 5 right and pays more, step-ups appear at the top; " +
      "market asks for change; feed/play/wash; a duel won; the Shadow Tower " +
      "climbed to The Shade (snack, criticals, trick, phase 2, loot, Gold rank); " +
      "paint brushes repaint; a house bought, furnished & seen in the nest; the " +
      "prize wheel spins once a day; a shop stocked at your own price and Shannon " +
      "buying from it pays Cory; a food wish and a play wish granted; " +
      `${wearArt.n} things to wear all draw on all 7 creatures, a bought hat goes on and comes off; ` +
      "stars in the window at 10pm; the diary fills up and takes an entry; Shannon posts Cory a " +
      "cookie and he opens it; a Zibbit loves popcorn and the Farm; the pet wanders; a petpet is " +
      "named and follows; the bank pays 3% overnight; a random event pays; Sky Catch scores and pays; " +
      "Memory Match is solved and pays; first steps tick off; rain on the window pays at the pool; " +
      "Halloween hangs pumpkins, pays a bonus and gives a pumpkin hat, autumn grows pumpkins and stocks a seasonal shelf, " +
      "Advent counts sleeps, Christmas snows, a hatch-day gets cake; " +
      "the map goes to the farm; help, a saved valley loads back, start-over needs the name; Cory visits " +
      "Shannon's house and takes a photo; quests, trophies, separate saves for Shannon, " +
      `Cory & Kieran; ${clipCheck.total} narration clips (${clipCheck.checked} spot-checked)`;
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

  async "The Post Office"(page, g, d) {
    await page.goto(`${BASE}/games/post-office/`, { waitUntil: "networkidle" });
    await page.evaluate(() => localStorage.removeItem("post-office.v1"));
    await page.reload({ waitUntil: "networkidle" });
    if (await page.locator(".who-btn").count() < 5) throw new Error("family picker did not render");

    // Ellie writes to Cory with quick words, a sticker and a typed line
    await page.locator('.who-btn[data-id="ellie"]').click();
    await page.locator('.tab[data-tab="write"]').click();
    if (!(await page.locator("#send-btn").isDisabled())) throw new Error("Post button should be disabled with no recipient or message");
    await page.locator('.to-chip[data-id="cory"]').click();
    if (!/Cory/.test(await page.locator("#greet-name").textContent())) throw new Error("greeting did not fill in the recipient's name");
    await page.locator(".word-btn").first().click();                 // a quick sentence
    await page.locator('.tray-tab[data-id="stickers"]').click();
    await page.locator(".word-btn.emo").first().click();               // a sticker
    await page.locator("#body").press("End");
    await page.locator("#body").type(" Can we build a castle?");
    await page.locator('.swatch[data-id="hearts"]').click();
    await page.locator('.stamp-btn[data-id="dragon"]').click();
    const envText = await page.locator("#preview-env").textContent();
    if (!/To:.*Cory/s.test(envText) || !/From:.*Ellie/s.test(envText)) throw new Error("envelope preview is not addressed To Cory / From Ellie");
    if (await page.locator("#send-btn").isDisabled()) throw new Error("Post button still disabled with a recipient and a message");
    await page.locator("#send-btn").click();
    await page.waitForTimeout(300);
    if (await page.locator("#sent-list .mail-item").count() !== 1) throw new Error("sent letter is not in Ellie's Sent tray");
    if (!/Not opened yet/.test(await page.locator("#sent-list .mail-item").textContent())) throw new Error("fresh letter should show as not opened yet");

    // Cory finds it waiting, opens the envelope and reads it
    await page.locator("#switch-btn").click();
    const badge = await page.locator('.who-btn[data-id="cory"] .mailcount').textContent();
    if (!/1/.test(badge || "")) throw new Error("Cory's name does not show 1 new letter");
    await page.locator('.who-btn[data-id="cory"]').click();
    if (await page.locator("#inbox-list .mail-item.unread").count() !== 1) throw new Error("letter not in Cory's mailbox as unread");
    if (!(await page.locator("#postbox.has-mail").count())) throw new Error("post box flag did not go up for new mail");
    await page.locator("#inbox-list .mail-item").first().click();
    if (!(await page.locator("#reader-paper").isHidden())) throw new Error("letter should stay inside the sealed envelope until it's opened");
    await page.locator("#reader-env").click();
    await page.waitForTimeout(700);
    const letter = await page.locator("#reader-paper").textContent();
    if (!/Dear Cory,/.test(letter)) throw new Error("greeting missing from the opened letter");
    if (!/Can we build a castle\?/.test(letter)) throw new Error("typed message missing from the opened letter");
    if (!/Love,/.test(letter) || !/Ellie/.test(letter)) throw new Error("closing or signature missing from the opened letter");
    if (!(await page.locator("#reader-paper.p-hearts").count())) throw new Error("chosen stationery was not used");
    if (!/POSTED/.test(await page.locator("#reader-env").innerHTML())) throw new Error("no postmark on the opened envelope");

    // …and writes straight back
    await page.locator("#reply-btn").click();
    if (!(await page.locator('.to-chip[data-id="ellie"][aria-pressed="true"]').count())) throw new Error("Write back did not address the reply to Ellie");
    await page.fill("#body", "Yes! A big one.");
    await page.locator("#send-btn").click();
    await page.waitForTimeout(300);
    await page.locator('.tab[data-tab="stamps"]').click();
    if (!/Dragon × 1/.test(await page.locator("#album").textContent())) throw new Error("the dragon stamp was not added to Cory's album");

    // Ellie sees it was opened, and has a reply of her own
    await page.locator("#switch-btn").click();
    await page.locator('.who-btn[data-id="ellie"]').click();
    if (await page.locator("#inbox-list .mail-item.unread").count() !== 1) throw new Error("Cory's reply did not reach Ellie");
    await page.locator('.tab[data-tab="sent"]').click();
    if (!/Opened/.test(await page.locator("#sent-list .mail-item").first().textContent())) throw new Error("Ellie's Sent tray does not show Cory opened her letter");
    // the mailbag survives a reload
    await page.reload({ waitUntil: "networkidle" });
    if (!/1/.test(await page.locator('.who-btn[data-id="ellie"] .mailcount').textContent())) throw new Error("mail was lost on reload");
    return "Ellie posts Cory a letter, he opens it, reads it and writes back; stamp album + read receipts work";
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
