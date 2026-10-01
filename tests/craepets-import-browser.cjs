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
      // A minimal same-origin house host exercises the actual activity fork,
      // bridge and save-mode scripts without loading unchanged 3D assets.
      if (pathname === "/house-import-host.html") {
        res.writeHead(200, {"Content-Type":"text/html"}).end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0}iframe{display:block;width:100%;height:100vh;border:0}</style><iframe name="activity" src="/house-test/activity.html"></iframe>');
        return;
      }
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
async function check(browser, base, options, mode = "game") {
  const house = mode !== "game", prefix = mode === "house" ? "craepets.house." : "craepets.";
  const opposite = prefix === "craepets." ? "craepets.house." : "craepets.";
  const context = await browser.newContext({serviceWorkers:"block",reducedMotion:"reduce",...options});
  const page = await context.newPage(), errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  let app;
  async function ready() {
    if (house) {
      await page.waitForFunction(() => document.querySelector("iframe").contentWindow.Craepets);
      app = page.frame({name:"activity"});
    } else app = page;
    await app.waitForFunction(() => window.Craepets && Craepets.state());
    await app.evaluate(() => {
      Craepets._events(false);
      localStorage.setItem("craepets.news", JSON.stringify({seen:Craepets.news().id}));
    });
    if (house) {
      assert.equal(await app.evaluate(()=>CraepetsSaveMode.prefix),prefix,"actual save-mode script must select the requested namespace");
      assert.equal(await app.evaluate(()=>typeof HouseActivity.rest),"function","the fork's existing house rest bridge must remain available");
    }
  }
  async function farm() {
    if (house) await app.evaluate(() => HouseActivity.enter({view:"farm"}));
    else await app.locator('[data-go="farm"]').click();
    await app.waitForSelector(".choice");
  }
  try {
    await page.goto(base + (house ? "/house-import-host.html" + (mode === "shared" ? "?from=game" : "") : "/games/craepets/"), {waitUntil:"load"});
    await ready();
    await app.locator("#pet-name").fill("Comet");
    await app.locator("#do-adopt").click();
    const protectedKeys = await app.evaluate(({prefix,opposite}) => {
      const state=Craepets.state();
      const keys={
        [prefix+"v1.ellie"]:JSON.stringify({...state,pet:{...state.pet,name:"Blossom"}}),
        [opposite+"v1.cory"]:JSON.stringify({...state,pet:{...state.pet,name:"Other edition"}}),
        [opposite+"v1.ellie"]:JSON.stringify({...state,pet:{...state.pet,name:"Other Blossom"}}),
        [prefix+"who"]:"cory",[opposite+"who"]:"ellie",
        [prefix+"voice"]:"0",[opposite+"voice"]:"0","craepets.house.reset.cory":"1"
      };
      for(const [key,value] of Object.entries(keys))localStorage.setItem(key,value);
      return keys;
    },{prefix,opposite});
    await farm();
    const rejected = await app.evaluate(() => {
      const key = (window.CraepetsSaveMode ? CraepetsSaveMode.prefix : "craepets.") + "v1." + Craepets.who(), results = [];
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
    const failure = await app.evaluate(() => {
      const key = (window.CraepetsSaveMode ? CraepetsSaveMode.prefix : "craepets.") + "v1." + Craepets.who(), state = Craepets.state(), session = Craepets.session();
      const saved = localStorage.getItem(key), setItem = Storage.prototype.setItem;
      const candidate = JSON.parse(JSON.stringify(state)); candidate.pet.name = "Transfer";
      Storage.prototype.setItem = function(k, v) {if(k===key)throw new DOMException("Full","QuotaExceededError");return setItem.call(this,k,v);};
      try {Craepets.importJson(JSON.stringify(candidate));}
      finally {Storage.prototype.setItem=setItem;}
      return {saved:localStorage.getItem(key)===saved,state:Craepets.state()===state,session:Craepets.session()===session};
    });
    assert.deepEqual(failure, {saved:true,state:true,session:true}, "quota failure must preserve active play");
    assert.match(await app.locator(".toast").textContent(), /current pet is safe/);

    // A genuine current export must import, return to the nest and reload.
    const importedHouse = await app.evaluate(() => {
      const candidate = JSON.parse(JSON.stringify(Craepets.state())), D=CPData;
      const home=D.HOUSES[2],wall=D.WALLS.find(x=>x.cost>0),floor=D.FLOORS.find(x=>x.cost>0),vista=D.VIEWS.find(x=>x.cost>0);
      candidate.house={home:home.id,homes:["nest",D.HOUSES[1].id,home.id],
        rooms:{[home.id]:{wall:wall.id,floor:floor.id,view:vista.id,name:"Cory's cottage"}},
        walls:[wall.id],floors:[floor.id],views:[vista.id],
        owned:D.FURNITURE.slice(0,3).map(x=>x.id),placed:D.FURNITURE.slice(0,2).map(x=>x.id)};
      candidate.pet.name = "Transferred"; candidate.coins = 321;
      const expected=JSON.parse(JSON.stringify(candidate.house));
      Craepets.importJson(JSON.stringify(candidate));
      return expected;
    });
    assert.equal(await app.evaluate(() => Craepets.state().pet.name), "Transferred");
    assert.equal(await app.evaluate(() => Craepets.session()), null);
    await page.reload({waitUntil:"load"});
    await ready();
    assert.equal(await app.evaluate(() => Craepets.state().pet.name), "Transferred");
    assert.deepEqual(await app.evaluate(() => Craepets.state().house),importedHouse,"bought houses, furniture and paid room styles must reload intact");
    if (house) assert.deepEqual(await app.evaluate(()=>HouseActivity.snapshot().house),importedHouse,"the actual bridge must see the imported house progress");
    assert.deepEqual(await app.evaluate(keys=>Object.fromEntries(Object.keys(keys).map(key=>[key,localStorage.getItem(key)])),protectedKeys),protectedKeys,
      "success and reload must preserve siblings and the other edition's saves/preferences/reset flags");

    // A pre-needs backup receives finite needs before real passTime/render.
    await app.evaluate(() => Craepets.importJson(JSON.stringify({v:1,pet:{name:"Old pet",species:"blorb",colour:"meadow"}})));
    assert.equal(await app.evaluate(() => Craepets.state().pet.name), "Old pet");
    assert.equal(await app.evaluate(() => ["hunger","happy","energy","clean","xp","born"].every((key)=>Number.isFinite(Craepets.state().pet[key]))), true);
    await app.evaluate((home) => {
      const candidate=JSON.parse(JSON.stringify(Craepets.state())); candidate.house=home;
      candidate.harvest.farm=['<b id=z>crop</b>'];
      candidate.review=[{key:"fixture",tier:"mid",subject:"math",misses:1,q:{
        q:"Choose two",subject:"math",tier:"mid",big:{emoji:'<b id=x>2</b>'},
        choices:[{t:"2",emoji:'<i id=y>2</i>',colour:'red" data-x="yes'}, {t:"3"}],answer:0
      }}];
      Craepets.importJson(JSON.stringify(candidate));
      window.importTestRandom=Math.random;Math.random=()=>0;
    },importedHouse);
    try {
      await farm();
    } finally {
      await app.evaluate(() => {Math.random=window.importTestRandom;delete window.importTestRandom;});
    }
    assert.equal(await app.evaluate(() => Craepets.session().q.fromReview), "fixture", "imported review question must actually be offered");
    assert.equal(await app.locator("#x, #y, #z, [data-x]").count(), 0, "imported display strings must stay text");
    assert.match(await app.locator(".qbig").textContent(), /<b id=x>/);
    const answer = await app.evaluate(() => Craepets.session().q.answer);
    try {await app.locator(".choice").nth(answer).click();}
    catch (error) {
      console.error("Imported choice hit target", await app.evaluate((index) => {
        const target=document.querySelectorAll(".choice")[index], rect=target.getBoundingClientRect();
        const hit=document.elementFromPoint(rect.x+rect.width/2,Math.min(innerHeight-1,rect.y+rect.height/2));
        return {viewport:[innerWidth,innerHeight],rect:{x:rect.x,y:rect.y,w:rect.width,h:rect.height},hit:hit&&hit.outerHTML.slice(0,240)};
      },answer));
      throw error;
    }
    assert.equal(await app.evaluate(() => Craepets.state().stats.correct), 1, "a transferred pet must still earn a correct answer");
    const layout=await app.evaluate(() => ({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(layout.viewport <= options.viewport.width+1 && layout.scroll <= options.viewport.width+1,
      "imported harvest and lesson text must fit the configured viewport: " + JSON.stringify(layout));
    if (mode === "shared") {
      const exported=await app.evaluate(()=>Craepets.exportJson());
      await page.goto(base+"/games/craepets/",{waitUntil:"load"});
      app=page;
      await app.waitForFunction(()=>window.Craepets && Craepets.state());
      await app.evaluate(()=>Craepets._events(false));
      assert.equal(await app.evaluate(()=>Craepets.state().pet.name),"Old pet","the original engine must load the house's shared profile");
      assert.equal(await app.evaluate(()=>Craepets.state().stats.correct),1,"house learning rewards must reach the original engine");
      assert.deepEqual(await app.evaluate(()=>Craepets.state().house),importedHouse,"shared furniture/styles must survive the return to the game");
      await app.evaluate(text=>{const candidate=JSON.parse(text);candidate.pet.name="Round trip";Craepets.importJson(JSON.stringify(candidate));},exported);
      await page.goto(base+"/house-import-host.html?from=game",{waitUntil:"load"});
      await ready();
      assert.equal(await app.evaluate(()=>Craepets.state().pet.name),"Round trip","a genuine game transfer must return to the house");
      assert.deepEqual(await app.evaluate(()=>HouseActivity.snapshot().house),importedHouse);
      assert.deepEqual(await app.evaluate(keys=>Object.fromEntries(Object.keys(keys).map(key=>[key,localStorage.getItem(key)])),protectedKeys),protectedKeys,
        "shared round trip must leave other profiles and standalone house keys unchanged");
    }
    assert.deepEqual(errors, [], "imports and subsequent play must produce no browser errors");
  } finally {await context.close();}
}
(async () => {
  const server = await startServer();
  let browser;
  try {
    browser = await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || chromium.executablePath(),args:["--no-sandbox"]});
    const base = "http://127.0.0.1:" + server.address().port;
    for (const mode of ["game","house","shared"]) {
      await check(browser, base, {viewport:{width:1280,height:900}},mode);
      await check(browser, base, {viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2},mode);
      console.log("PASS " + mode + " import browser checks at desktop/phone");
    }
    console.log("PASS Craepets browser imports: rejected files and quota failure preserve active lessons; current and legacy transfers reload and play on desktop/phone in game, standalone-house and shared-house modes");
  } finally {if(browser)await browser.close();await new Promise((resolve)=>server.close(resolve));}
})().catch((error)=>{console.error(error);process.exitCode=1;});
