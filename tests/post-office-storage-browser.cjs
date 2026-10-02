#!/usr/bin/env node
"use strict";
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
const key = "post-office.v1", recoveryKey = "post-office.recovery.v1";
const profiles = ["jeannie", "cory", "ellie", "kieran", "shannon", "tristan"];
function mail(id, to = "ellie") {
  return { id, from: "cory", to, body: "Keep this family letter ❤️ <b>literal text</b>", paper: "hearts", stamp: "owl", greeting: "Dear", closing: "Love,", sentAt: 1000, readAt: null };
}
function fixture() {
  const drafts = Object.fromEntries(profiles.map(id => [id, { to: [id === "cory" ? "ellie" : "cory"], body: "Draft for " + id, paper: "plain", stamp: "cat", greeting: "Hi", closing: "From," }]));
  return { letters: [null, [], mail("first"), mail("dad", "jeannie")], drafts, last: "ellie" };
}
const readSave = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
async function setPeer(peer, raw) { await peer.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key, raw }); }
async function exercise(context, base, name) {
  const page = await context.newPage(), peer = await context.newPage(), errors = [], requests = [];
  for (const p of [page, peer]) {
    p.setDefaultTimeout(8000);
    p.on("pageerror", error => errors.push(error.message));
    p.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    p.on("requestfailed", request => requests.push(request.url()));
    p.on("response", response => { if (response.status() >= 400) requests.push(response.status() + " " + response.url()); });
  }
  const damaged = JSON.stringify(fixture());
  await page.goto(base + "/games/post-office/");
  await page.evaluate(({ key, raw }) => {
    localStorage.clear();
    localStorage.setItem(key, raw);
    localStorage.setItem("craepets.v1.ellie", "unchanged sibling game");
    localStorage.setItem("craepets.house.v1.cory", "unchanged house");
  }, { key, raw: damaged });
  await page.reload();
  assert.equal(await page.locator("#who-grid .who-btn").count(), 6, "Mixed damaged mail still renders every family profile");
  assert.equal(await page.evaluate(key => localStorage.getItem(key), key), damaged, "Read-time repair never writes");
  await page.locator('.who-btn[data-id="ellie"]').click();
  assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key))[0].raw, recoveryKey), damaged, "First write preserves exact damaged bytes");
  assert.equal((await readSave(page)).letters.length, 2);
  for (const id of profiles) assert.equal((await readSave(page)).drafts[id].body, "Draft for " + id);
  await page.locator('.tab[data-tab="write"]').click();
  await page.locator("#body").fill("Ellie's active draft ❤️");
  await page.locator('.tab[data-tab="inbox"]').click();
  await page.locator('.mail-item[data-id="first"]').click();
  assert.equal(await page.locator("#reader").isVisible(), true);
  await peer.goto(base + "/games/post-office/");

  // A real other-tab storage event containing unusable JSON must not replace live mail/draft/reader.
  await setPeer(peer, "{broken snapshot");
  await page.waitForTimeout(50);
  assert.equal(await page.locator("#reader").isVisible(), true);
  assert.equal(await page.locator("#body").inputValue(), "Ellie's active draft ❤️");

  // Valid incoming mail rebinds the open reader to the fresh state object.
  const fresh = await page.evaluate(() => ({
    letters: [
      { id: "first", from: "cory", to: "ellie", body: "Keep this family letter ❤️ <b>literal text</b>", paper: "hearts", stamp: "owl", greeting: "Dear", closing: "Love,", sentAt: 1000, readAt: null },
      { id: "new", from: "jeannie", to: "ellie", body: "Real incoming mail", paper: "plain", stamp: "cat", greeting: "Hi", closing: "From,", sentAt: 2000, readAt: null },
    ], drafts: Object.fromEntries(["jeannie", "cory", "ellie", "kieran", "shannon", "tristan"].map(id => [id, { to: [id === "cory" ? "ellie" : "cory"], body: "Draft for " + id, paper: "plain", stamp: "cat", greeting: "Hi", closing: "From," }])), last: "ellie",
  }));
  await setPeer(peer, JSON.stringify(fresh));
  await page.waitForFunction(() => document.querySelectorAll("#inbox-list .mail-item").length === 2);
  await page.locator("#reader-env").click();
  await page.waitForFunction(key => !!JSON.parse(localStorage.getItem(key)).letters.find(l => l.id === "first").readAt, key);
  assert.equal((await readSave(page)).letters.find(l => l.id === "new").body, "Real incoming mail");
  assert.equal((await readSave(page)).drafts.ellie.body, "Ellie's active draft ❤️");
  await page.waitForTimeout(500);
  assert.equal(await page.locator("#reader-paper .body").textContent(), "Keep this family letter ❤️ <b>literal text</b>");
  assert.equal(await page.locator("#reader-paper b").count(), 0, "Stored text renders literally");
  await page.locator("#delete-btn").click();
  assert.equal((await readSave(page)).letters.find(l => l.id === "first").trashedByTo, true, "Rebound delete action updates fresh mail");
  assert.equal((await readSave(page)).letters.some(l => l.id === "new"), true);
  assert.equal(await page.locator("#reader").isVisible(), false);

  // Keyboard switching profiles during unseal must cancel the old owner's reader callback.
  const switchMail = await readSave(page); switchMail.letters.push(mail("switch"));
  await setPeer(peer, JSON.stringify(switchMail));
  await page.waitForFunction(() => !!document.querySelector('.mail-item[data-id="switch"]'));
  await page.locator('.mail-item[data-id="switch"]').click();
  await page.locator("#reader-env").click();
  await page.locator("#switch-btn").focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(550);
  assert.equal(await page.locator("#who").isVisible(), true);
  assert.equal(await page.locator("#reader").isVisible(), false, "Switching profiles closes the old reader");
  await page.locator('.who-btn[data-id="ellie"]').click();

  // Removal in another tab closes a reader; its pending unseal callback stays cancelled.
  await page.locator('.mail-item[data-id="new"]').click();
  await page.locator("#reader-env").click();
  const removed = await readSave(page); removed.letters = removed.letters.filter(l => l.id !== "new");
  await setPeer(peer, JSON.stringify(removed));
  await page.waitForFunction(() => document.querySelector("#reader").classList.contains("hidden"));
  await page.waitForTimeout(550);
  assert.equal(await page.locator("#reader").isVisible(), false);
  assert.equal((await readSave(page)).letters.some(l => l.id === "new"), false);

  // Posting under quota failure keeps the child's message and recipient selection for retry.
  await page.locator('.tab[data-tab="write"]').click();
  await page.locator("#body").fill("Do not lose this unsent letter");
  await page.evaluate(() => {
    window.originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "post-office.v1") throw new DOMException("Full", "QuotaExceededError");
      return window.originalSetItem.call(this, key, value);
    };
  });
  const beforePost = await page.evaluate(key => localStorage.getItem(key), key);
  await page.locator("#send-btn").click();
  assert.equal(await page.locator("#body").inputValue(), "Do not lose this unsent letter");
  assert.equal(await page.evaluate(key => localStorage.getItem(key), key), beforePost);
  await page.evaluate(() => { Storage.prototype.setItem = window.originalSetItem; });
  await page.locator("#send-btn").click();
  assert.equal((await readSave(page)).letters.filter(l => l.body === "Do not lose this unsent letter").length, 1);
  // A sender opening their Sent envelope cannot mark it opened by its recipient.
  const posted = (await readSave(page)).letters.find(l => l.body === "Do not lose this unsent letter");
  await page.locator('#sent-list .mail-item[data-id="' + posted.id + '"]').click();
  await page.locator("#reader-env").click();
  await page.waitForTimeout(500);
  assert.equal((await readSave(page)).letters.find(l => l.id === posted.id).readAt, null, "Sent preview leaves the recipient's letter unread");
  await page.locator("#close-btn").click();
  await page.reload();
  await page.locator('.who-btn[data-id="cory"]').click();
  assert.equal(await page.locator("#inbox-list .mail-item").count(), 1, "Successful retry delivers exactly one letter after reload");
  await page.locator("#inbox-list .mail-item").click();
  await page.locator("#reader-env").click();
  await page.waitForTimeout(500);
  assert.equal(await page.locator("#reader-paper .body").textContent(), "Do not lose this unsent letter");
  assert.equal(await page.evaluate(() => localStorage.getItem("craepets.v1.ellie")), "unchanged sibling game");
  assert.equal(await page.evaluate(() => localStorage.getItem("craepets.house.v1.cory")), "unchanged house");
  const width = await page.evaluate(() => ({ root: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  assert.ok(width.root <= width.viewport + 1, name + " fits its configured viewport");
  assert.deepEqual(errors, [], "Post Office has no browser errors"); assert.deepEqual(requests, [], "Post Office has no failed requests");
  console.log("PASS Post Office " + name + ": damaged save recovery, six drafts, real storage events, rebound read/delete, removed/switch reader cancellation, sender preview, quota retry, reload, namespaces and literal text");
}
async function main() {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
    for (const [name, device] of Object.entries({
      Desktop: { viewport: { width: 1280, height: 900 } },
      iPad: { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true },
      iPhone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    })) {
      const context = await browser.newContext({ ...device, reducedMotion: "reduce" });
      try { await exercise(context, base, name); } finally { await context.close(); }
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
