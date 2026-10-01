#!/usr/bin/env node
"use strict";

// Run: cd tests && npm run test:regressions -- craepets-import-browser.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright-core");
const ROOT = path.resolve(__dirname, "..");
const MIME = {".html":"text/html",".js":"text/javascript",".css":"text/css",".webp":"image/webp",".png":"image/png",".mp3":"audio/mpeg",".json":"application/json",".ttf":"font/ttf"};
async function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      let pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      if (pathname.endsWith("/")) pathname += "index.html";
      const file = path.resolve(ROOT, "." + pathname);
      if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
      const data = await fs.readFile(file);
      res.writeHead(200, {"Content-Type":MIME[path.extname(file)] || "application/octet-stream"}).end(data);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  return server;
}
async function check(browser, base, options) {
  const context = await browser.newContext({serviceWorkers:"block",reducedMotion:"reduce",...options});
  const page = await context.newPage(), errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  try {
    await page.goto(base + "/games/craepets/", {waitUntil:"load"});
    await page.waitForFunction(() => window.Craepets && Craepets.state());
    await page.evaluate(() => Craepets._events(false));
    await page.locator("#pet-name").fill("Comet");
    await page.locator("#do-adopt").click();
    await page.locator('[data-go="farm"]').click();
    await page.waitForSelector(".choice");
    const rejected = await page.evaluate(() => {
      const key = "craepets.v1." + Craepets.who(), results = [];
      const cases = [
        ["stats", (s) => {s.stats="broken";}],
        ["quests", (s) => {s.quests="broken";}],
        ["trophies", (s) => {s.trophies={};}],
        ["stall name", (s) => {s.stall.name=17;}],
        ["today", (s) => {s.today="broken";}],
        ["bag", (s) => {s.bag="broken";}],
        ["fractional house", (s) => {s.house.level=1.5;}],
        ["pet needs", (s) => {s.pet.hunger=null;}],
      ];
      for (const [name, mutate] of cases) {
        const state = Craepets.state(), session = Craepets.session();
        const saved = localStorage.getItem(key), snapshot = JSON.stringify(state);
        const candidate = JSON.parse(snapshot); mutate(candidate);
        Craepets.importJson(JSON.stringify(candidate));
        results.push({name,saved:localStorage.getItem(key)===saved,state:Craepets.state()===state,
          contents:JSON.stringify(Craepets.state())===snapshot,session:Craepets.session()===session});
      }
      return results;
    });
    for (const result of rejected) {
      assert.deepEqual(result, {name:result.name,saved:true,state:true,contents:true,session:true}, "invalid " + result.name + " must preserve pet and active lesson");
    }
    const failure = await page.evaluate(() => {
      const key = "craepets.v1." + Craepets.who(), state = Craepets.state(), session = Craepets.session();
      const saved = localStorage.getItem(key), setItem = Storage.prototype.setItem;
      const candidate = JSON.parse(JSON.stringify(state)); candidate.pet.name = "Transfer";
      Storage.prototype.setItem = function(k, v) {if(k===key)throw new DOMException("Full","QuotaExceededError");return setItem.call(this,k,v);};
      try {Craepets.importJson(JSON.stringify(candidate));}
      finally {Storage.prototype.setItem=setItem;}
      return {saved:localStorage.getItem(key)===saved,state:Craepets.state()===state,session:Craepets.session()===session};
    });
    assert.deepEqual(failure, {saved:true,state:true,session:true}, "quota failure must preserve active play");
    assert.match(await page.locator(".toast").textContent(), /current pet is safe/);

    // A genuine current export must import, return to the nest and reload.
    await page.evaluate(() => {
      const candidate = JSON.parse(JSON.stringify(Craepets.state()));
      candidate.pet.name = "Transferred"; candidate.coins = 321;
      localStorage.setItem("craepets.v1.ellie", '{"v":1,"pet":null,"coins":99}');
      Craepets.importJson(JSON.stringify(candidate));
    });
    assert.equal(await page.evaluate(() => Craepets.state().pet.name), "Transferred");
    assert.equal(await page.evaluate(() => Craepets.session()), null);
    await page.reload({waitUntil:"load"});
    await page.waitForFunction(() => window.Craepets && Craepets.state());
    assert.equal(await page.evaluate(() => Craepets.state().pet.name), "Transferred");
    assert.equal(await page.evaluate(() => localStorage.getItem("craepets.v1.ellie")), '{"v":1,"pet":null,"coins":99}');

    // A pre-needs backup receives finite needs before real passTime/render.
    await page.evaluate(() => Craepets.importJson(JSON.stringify({v:1,pet:{name:"Old pet",species:"blorb",colour:"meadow"}})));
    assert.equal(await page.evaluate(() => Craepets.state().pet.name), "Old pet");
    assert.equal(await page.evaluate(() => ["hunger","happy","energy","clean","xp","born"].every((key)=>Number.isFinite(Craepets.state().pet[key]))), true);
    await page.locator('[data-go="farm"]').click();
    await page.waitForSelector(".choice");
    const answer = await page.evaluate(() => Craepets.session().q.answer);
    await page.locator(".choice").nth(answer).click();
    assert.equal(await page.evaluate(() => Craepets.state().stats.correct), 1, "a transferred pet must still earn a correct answer");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    assert.deepEqual(errors, [], "imports and subsequent play must produce no browser errors");
  } finally {await context.close();}
}
(async () => {
  const server = await startServer();
  let browser;
  try {
    browser = await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || chromium.executablePath(),args:["--no-sandbox"]});
    const base = "http://127.0.0.1:" + server.address().port;
    await check(browser, base, {viewport:{width:1280,height:900}});
    await check(browser, base, {viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
    console.log("PASS Craepets browser imports: rejected files and quota failure preserve active lessons; current and legacy transfers reload and play on desktop/phone");
  } finally {if(browser)await browser.close();await new Promise((resolve)=>server.close(resolve));}
})().catch((error)=>{console.error(error);process.exitCode=1;});
