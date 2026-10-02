#!/usr/bin/env node
"use strict";
// Full production Life Lab page; Chromium device emulation is not iOS Safari.
const assert=require("node:assert/strict"),fs=require("node:fs/promises"),http=require("node:http"),path=require("node:path"),{chromium}=require("playwright-core");
const ROOT=path.resolve(__dirname,".."),ids=["jeannie","cory","ellie","kieran","shannon","tristan","guest"];
async function server(){const s=http.createServer(async(req,res)=>{try{
 let p=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
 if(p==="/life-prediction-fixture.html"){res.writeHead(200,{"Content-Type":"text/html"}).end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><p>Life prediction fixture</p>');return;}
 if(p.endsWith("/"))p+="index.html";
 const f=path.resolve(ROOT,"."+p);if(!f.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
 res.writeHead(200,{"Content-Type":({".html":"text/html",".js":"text/javascript",".css":"text/css",".svg":"image/svg+xml",".png":"image/png",".json":"application/json"})[path.extname(f)]||"application/octet-stream"}).end(await fs.readFile(f));
 }catch{res.writeHead(404).end();}});await new Promise((resolve,reject)=>{s.once("error",reject);s.listen(0,"127.0.0.1",resolve);});return s;}
function finiteNext(cells){return cells.map((alive,i)=>{
 const x=i%6,y=Math.floor(i/6);let n=0;
 for(let yy=Math.max(0,y-1);yy<=Math.min(5,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(5,x+1);xx++){
 if(xx!==x||yy!==y)n+=cells[yy*6+xx];}
 return n===3||(alive&&n===2)?1:0;
});}
async function check(browser,base,label,options){
 const context=await browser.newContext({serviceWorkers:"block",reducedMotion:"reduce",...options}),page=await context.newPage(),errors=[];
 page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});
 page.on("response",r=>{if(r.status()>=400)errors.push("HTTP "+r.status()+" "+r.url());});
 const activate=async selector=>{const el=page.locator(selector);if(options.hasTouch)await el.tap();else await el.click();};
 const stats=async()=>({streak:Number(await page.locator("#predStreak").textContent()),best:Number(await page.locator("#predBest").textContent()),seer:await page.locator('.badge[data-key="seer"]').evaluate(e=>e.classList.contains("earned"))});
 const unrelated=async()=>page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k!=="life-lab-v1").sort().map(k=>[k,localStorage.getItem(k)])));
 const board=async()=>page.locator("#pboard button").evaluateAll(els=>els.map(e=>({label:e.getAttribute("aria-label"),pressed:e.getAttribute("aria-pressed")})));
 async function solve(){
  const entries=await board();assert.equal(entries.length,36);const now=Array(36),seen=new Set();
  for(const e of entries){const m=/^Row ([1-6]) column ([1-6]), (alive|empty) now, you predict (alive|empty)(?:, (?:correct|wrong))?$/.exec(e.label);
   assert.ok(m,"read only original now-state labels");const i=(Number(m[1])-1)*6+Number(m[2])-1;assert.ok(!seen.has(i));seen.add(i);now[i]=m[3]==="alive"?1:0;}
  assert.equal(seen.size,36);const answer=finiteNext(now);
  for(let i=0;i<36;i++){assert.ok(entries[i].pressed==="true"||entries[i].pressed==="false");if((entries[i].pressed==="true"?1:0)!==answer[i])await activate('#pboard button[data-i="'+i+'"]');}
  return {now,answer};
 }
 async function waitSaved(streak,best){await page.waitForFunction(({streak,best})=>{const s=JSON.parse(localStorage.getItem("life-lab-v1")||"null");return s&&s.predStreak===streak&&s.predBest===best;},{streak,best});}
 try{
  await context.addInitScript(()=>{Math.random=()=>0;}); // native blinker seed at offset1; no answer hook
  await page.goto(base+"/life-prediction-fixture.html",{waitUntil:"load"});
  const original=await page.evaluate(ids=>{
   localStorage.clear();for(const prefix of["craepets.","craepets.house."])for(const id of ids)localStorage.setItem(prefix+"v1."+id,"synthetic original bytes "+prefix+id+"\n😀");
   localStorage.setItem("craepets.who","cory");localStorage.setItem("craepets.house.who","ellie");localStorage.setItem("post-office.v1","unrelated synthetic mail");localStorage.setItem("arcade.kid","kieran");
   const birth=Array(9).fill(false),survive=Array(9).fill(false);birth[3]=true;survive[2]=survive[3]=true;
   localStorage.setItem("life-lab-v1",JSON.stringify({sizeKey:"tiny",cols:24,rows:16,live:[],birth,survive,wrap:true,speed:10,generation:0,badges:{},stampsUsed:{},myPatterns:[],inspected:{},predStreak:0,predBest:0}));
   return Object.fromEntries(Object.keys(localStorage).filter(k=>k!=="life-lab-v1").sort().map(k=>[k,localStorage.getItem(k)]));
  },ids);
  await page.goto(base+"/games/game-of-life/",{waitUntil:"load"});await page.waitForSelector("#pboard button");
  assert.deepEqual(await stats(),{streak:0,best:0,seer:false});
  assert.equal(await page.locator("#predResult").getAttribute("aria-live"),"polite");
  assert.ok(await page.locator("#pboard button").first().evaluate(e=>e.getBoundingClientRect().height>=44),"prediction cells stay touch-sized");
  // Independent positive: actual native blinker has a birth on the board edge.
  const first=await solve();assert.deepEqual(first.now.flatMap((v,i)=>v?[i]:[]),[7,8,9]);assert.deepEqual(first.answer.flatMap((v,i)=>v?[i]:[]),[2,8,14]);
  await page.locator("#checkBtn").focus();await page.keyboard.press("Enter");assert.deepEqual(await stats(),{streak:1,best:1,seer:false});
  await page.locator("#checkBtn").focus();await page.keyboard.press("Enter");await page.keyboard.press("Space");await activate("#checkBtn");
  assert.deepEqual(await stats(),{streak:1,best:1,seer:false});assert.match(await page.locator("#predResult").textContent(),/already earned credit/);
  await activate('#pboard button[data-i="0"]');await activate("#checkBtn");assert.match(await page.locator("#predResult").textContent(),/neighbour count/);
  assert.deepEqual(await stats(),{streak:1,best:1,seer:false});
  await activate('#pboard button[data-i="0"]');await activate("#resetPredBtn");await solve();await activate("#checkBtn");
  assert.deepEqual(await stats(),{streak:1,best:1,seer:false});
  for(let round=2;round<=3;round++){await activate("#newPuzzleBtn");await solve();await activate("#checkBtn");await activate("#checkBtn");assert.deepEqual(await stats(),{streak:round,best:round,seer:round===3});}
  await waitSaved(3,3);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("life-lab-v1")).badges.seer),true);
  // Show preserves its existing explicit streak reset, even on an earned round.
  await activate("#showBtn");await activate('#pboard button[data-i="0"]');await activate('#pboard button[data-i="0"]');await activate("#checkBtn");
  await activate("#resetPredBtn");await solve();await activate("#checkBtn");assert.deepEqual(await stats(),{streak:0,best:3,seer:true});
  // A fresh revealed round cannot regain credit through either edit or reset.
  await activate("#newPuzzleBtn");await activate("#showBtn");await activate('#pboard button[data-i="0"]');await activate('#pboard button[data-i="0"]');await activate("#checkBtn");
  assert.deepEqual(await stats(),{streak:0,best:3,seer:true});assert.match(await page.locator("#predResult").textContent(),/without peeking/);
  await activate("#resetPredBtn");await solve();await activate("#checkBtn");assert.deepEqual(await stats(),{streak:0,best:3,seer:true});
  // Wrong feedback is still useful: correct an uncredited answer and earn one.
  await activate("#newPuzzleBtn");await solve();await activate('#pboard button[data-i="0"]');await activate("#checkBtn");
  assert.equal(await page.locator('#pboard button[data-i="0"]').evaluate(e=>e.classList.contains("wrong")),true);
  await activate('#pboard button[data-i="0"]');await activate("#checkBtn");assert.deepEqual(await stats(),{streak:1,best:3,seer:true});
  // The Rule Lab and world wrap settings do not change this B3/S23 lesson.
  await page.locator("#presetRow button").last().click();await page.locator("#wrapToggle").uncheck();
  await page.evaluate(()=>{Math.random=()=>0.1;});await activate("#newPuzzleBtn");const block=await solve();
  assert.deepEqual(block.now.flatMap((v,i)=>v?[i]:[]),[7,8,13,14]);assert.deepEqual(block.answer,block.now);
  await activate("#checkBtn");assert.deepEqual(await stats(),{streak:2,best:3,seer:true});
  await waitSaved(2,3);await page.reload({waitUntil:"load"});assert.deepEqual(await stats(),{streak:2,best:3,seer:true});
  await solve();await activate("#checkBtn");assert.deepEqual(await stats(),{streak:3,best:3,seer:true});
  // Preserve an already-earned badge/best; never revoke historical progress.
  await waitSaved(3,3);await page.goto(base+"/life-prediction-fixture.html",{waitUntil:"load"});await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem("life-lab-v1"));s.predBest=19;s.predStreak=2;s.badges.seer=true;localStorage.setItem("life-lab-v1",JSON.stringify(s));});
  await page.goto(base+"/games/game-of-life/",{waitUntil:"load"});assert.deepEqual(await stats(),{streak:2,best:19,seer:true});
  await solve();await activate("#checkBtn");await activate("#checkBtn");assert.deepEqual(await stats(),{streak:3,best:19,seer:true});
  await waitSaved(3,19);assert.deepEqual(await unrelated(),original,"all seven original/house profile bytes and unrelated saves remain exact");
  assert.deepEqual(errors,[]);console.log("Life prediction "+label+": native checks/keyboard"+(options.hasTouch?"/touch":"")+", practice/reveal/new rounds, independent rule oracle and persisted progress passed.");
 }finally{await context.close();}
}
(async()=>{const s=await server();let browser;try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||"/usr/bin/chromium",headless:true,args:["--no-sandbox"]});
 const base="http://127.0.0.1:"+s.address().port;
 for(const[label,options]of[
 ["Desktop",{viewport:{width:1280,height:800}}],
 ["iPad",{viewport:{width:820,height:1180},isMobile:true,hasTouch:true}],
 ["iPhone",{viewport:{width:390,height:844},isMobile:true,hasTouch:true}]
 ])await check(browser,base,label,options);
 }finally{if(browser)await browser.close();await new Promise(resolve=>s.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
