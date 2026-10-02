#!/usr/bin/env node
"use strict";
// Full production page with native input/reload. Chromium emulation is not iOS Safari.
// Public prompt/facts provide the answer oracle; no factory/answer hook is installed.
const assert=require("node:assert/strict"),fs=require("node:fs/promises"),http=require("node:http"),path=require("node:path"),{chromium}=require("playwright-core");
const D=require("../games/rock-detective/rocks.js"),ROOT=path.resolve(__dirname,"..");
async function server() {
  const s = http.createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      if (p === "/rock-quiz-fixture.html") { res.writeHead(200, { "Content-Type": "text/html" }).end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><p>Rock quiz fixture</p>'); return; }
      if (p === "/favicon.ico") { res.writeHead(204).end(); return; }
      if (p.endsWith("/")) p += "index.html";
      const file = path.resolve(ROOT, "." + p);
      if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
      res.writeHead(200, { "Content-Type": ({ ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json" })[path.extname(file)] || "application/octet-stream" }).end(await fs.readFile(file));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise((resolve, reject) => { s.once("error", reject); s.listen(0, "127.0.0.1", resolve); }); return s;
}

const people=["jeannie","cory","ellie","kieran","shannon","tristan","guest"];
function unrelated(){
  const out={};for(const prefix of ["craepets.","craepets.house."])for(const who of people)out[prefix+"v1."+who]="synthetic original bytes "+prefix+who+"\n😀";
  return Object.assign(out,{"craepets.who":"cory","craepets.house.who":"ellie","post-office.v1":"unrelated mail","arcade.kid":"kieran","block-coordinates.v2":"coordinates bytes","life-lab-v1":"life bytes"});
}
async function check(browser,base,label,options){
  const context=await browser.newContext({serviceWorkers:"block",...options}),page=await context.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  page.on("response",r=>{if(r.status()>=400)errors.push(r.status()+" "+r.url());});
  page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});
  const protectedBytes=unrelated();
  async function start(round=null){
    await page.goto(base+"/rock-quiz-fixture.html");
    await page.evaluate(({protectedBytes,round})=>{
      localStorage.clear();for(const [key,value]of Object.entries(protectedBytes))localStorage.setItem(key,value);
      localStorage.setItem("rockDetectiveFound",JSON.stringify(["Quartz"]));
      localStorage.setItem("rockDetectiveQuiz",JSON.stringify({best:17,bests:{rockhound:17,explorer:17,geologist:17,retired:8},tier:"explorer",tab:"quiz",clues:["t-speckled"],labSolved:4,labBest:2,round}));
    },{protectedBytes,round});
    await page.goto(base+"/games/rock-detective/");
    await page.locator("#quiz.active").waitFor();
  }
  const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem("rockDetectiveQuiz")));
  async function native(locator){await locator.scrollIntoViewIfNeeded();if(options.hasTouch)await locator.tap();else await locator.click();}
  async function correctIndex(){
    const prompt=await page.locator("#quizQ").innerText(),hint=await page.locator("#quizHint").innerText(),texts=await page.locator(".quiz-opt").allTextContents();
    let answer;
    if(prompt.includes("Which family")){
      const name=await page.locator("#quizQ b").innerText();answer=D.BY_NAME[name].type;
      const idx=texts.findIndex(t=>t.includes(answer));assert.ok(idx>=0,"public family oracle");return idx;
    }
    assert.equal(prompt,"What is this specimen?");
    const matches=D.ROCKS.filter(r=>hint.includes(r.fact));
    assert.equal(matches.length,1,"full public Explorer fact identifies one specimen");
    answer=matches[0].name;const idx=texts.indexOf(answer);assert.ok(idx>=0,"public specimen oracle");return idx;
  }
  async function answer(right=true,keyboard=false){
    const good=await correctIndex(),count=await page.locator(".quiz-opt").count(),idx=right?good:(good+1)%count;
    if(keyboard){await page.locator(".quiz-opt").nth(idx).focus();await page.keyboard.press(String(idx+1));}
    else await native(page.locator(".quiz-opt").nth(idx));
    await page.locator("#nextQuiz").waitFor({state:"visible"});
  }
  async function pending(n,score,practice=false){
    const s=await state();assert.equal(s.round.qNum,n);assert.equal(s.round.roundScore,score);assert.equal(s.round.answered,false);assert.equal(s.round.practice,practice);
    assert.equal(await page.locator("#quizPractice").isVisible(),practice);
  }
  async function preserve(){
    const actual=await page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),Object.keys(protectedBytes));assert.deepEqual(actual,protectedBytes);
    assert.ok((await page.locator("#clueCount").innerText()).includes("1 clue"),"saved clue remains active");
    const s=await state();assert.equal(s.best,17);assert.deepEqual(s.bests,{rockhound:17,explorer:17,geologist:17,retired:8});assert.deepEqual(s.clues,["t-speckled"]);assert.equal(s.labSolved,4);assert.equal(s.labBest,2);
    assert.ok((await page.evaluate(()=>JSON.parse(localStorage.getItem("rockDetectiveFound")))).includes("Quartz"));
  }
  try{
    // Original first-correct/reload trigger, using native numeric keys on Desktop.
    await start();await pending(1,0);await answer(true,!options.hasTouch);
    assert.equal((await state()).round.answered,true);await page.reload();await pending(2,1);
    await page.reload();await pending(2,1);await answer(false);await page.reload();await pending(3,1);
    await native(page.locator("#tab-book"));await native(page.locator("#tab-quiz"));await pending(3,1);await preserve();

    // Pending middle retains its ordinal. Last accepted answer finalizes rather than repeating.
    await start({tier:"explorer",qNum:4,roundScore:3,answered:false,practice:false});
    await page.reload();await pending(4,3);await answer();await page.reload();await pending(5,4);await preserve();
    await start({tier:"explorer",qNum:10,roundScore:9,answered:false,practice:false});
    await answer();await page.reload();assert.equal(await page.locator("#roundScore").innerText(),"10 / 10");assert.equal((await state()).round,null);
    await native(page.locator("#tab-book"));await native(page.locator("#tab-quiz"));assert.equal(await page.locator("#quizEnd").isVisible(),true);assert.equal(await page.locator("#roundScore").innerText(),"10 / 10");await preserve();
    await native(page.locator("#againQuiz"));await pending(1,0);

    // Ambiguous old phase is visible, sticky and unscored; normal next slot earns credit.
    await start({tier:"explorer",qNum:4,roundScore:3});
    await pending(4,3,true);
    assert.equal(await page.locator("#quizPractice").innerText(),"We kept your saved score. This specimen is practice and won’t add a point.");
    await page.reload();await page.reload();await pending(4,3,true);
    await answer();assert.equal((await state()).round.roundScore,3);await page.reload();await pending(5,3);await answer();assert.equal((await state()).round.roundScore,4);await preserve();

    // Final old slot stays unscored. Wrong legacy answer still consumes that slot.
    await start({tier:"explorer",qNum:10,roundScore:9});
    await answer(false);assert.equal((await state()).round.roundScore,9);await page.reload();assert.equal(await page.locator("#roundScore").innerText(),"9 / 10");await preserve();
    await native(page.locator("#tiers [data-tier='rockhound']"));
    const tierState=await state();assert.equal(tierState.tier,"rockhound");assert.equal(tierState.round.qNum,1);assert.equal(tierState.round.roundScore,0);assert.equal(tierState.round.practice,false);
    await preserve();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,"fits device width");
    assert.deepEqual(errors,[]);
    console.log("Rock quiz "+label+": native "+(options.hasTouch?"touch":"pointer/keyboard")+", first/middle/final reload phases, legacy practice, tabs/tier/Again and exact unrelated bytes passed.");
  }finally{await context.close();}
}
(async()=>{
  const s=await server();let browser;
  try{
    browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||"/usr/bin/chromium",headless:true,args:["--no-sandbox"]});
    const base="http://127.0.0.1:"+s.address().port;
    for(const [label,options]of[
      ["Desktop",{viewport:{width:1280,height:800}}],
      ["iPad",{viewport:{width:820,height:1180},isMobile:true,hasTouch:true}],
      ["iPhone",{viewport:{width:390,height:844},isMobile:true,hasTouch:true}],
    ])await check(browser,base,label,options);
  }finally{if(browser)await browser.close();await new Promise(resolve=>s.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
