#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs/promises"),http=require("node:http"),path=require("node:path"),{chromium}=require("playwright-core");
const ROOT=path.resolve(__dirname,".."),ids=["jeannie","cory","ellie","kieran","shannon","tristan","guest"],prefix="craepets.house.v1.";
async function server(){const s=http.createServer(async(req,res)=>{try{
 let p=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
 if(p==="/seed-fixture.html"){res.writeHead(200,{"Content-Type":"text/html"}).end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><p>Seeding test setup</p>');return;}
 if(p==="/auto-seed-host.html"){res.writeHead(200,{"Content-Type":"text/html"}).end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><style>html,body{margin:0}iframe{display:block;width:100%;height:100vh;border:0}</style><iframe name="activity" src="/house-test/activity.html"></iframe>');return;}
 if(p.endsWith("/"))p+="index.html";const f=path.resolve(ROOT,"."+p);if(!f.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
 res.writeHead(200,{"Content-Type":({".js":"text/javascript",".mjs":"text/javascript",".html":"text/html",".css":"text/css",".json":"application/json",".webp":"image/webp",".png":"image/png",".mp3":"audio/mpeg",".svg":"image/svg+xml"})[path.extname(f)]||"application/octet-stream"}).end(await fs.readFile(f));
 }catch{res.writeHead(404).end();}});await new Promise((resolve,reject)=>{s.once("error",reject);s.listen(0,"127.0.0.1",resolve);});return s;}
async function check(browser,base,label,options){
 const context=await browser.newContext({serviceWorkers:"block",reducedMotion:"reduce",...options}),page=await context.newPage(),errors=[];
 page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});page.on("response",r=>{if(r.status()>=400)errors.push("HTTP "+r.status()+" "+r.url());});
 let app;const ready=async()=>{await page.waitForFunction(()=>document.querySelector("iframe")?.contentWindow.Craepets?.state());app=page.frame({name:"activity"});await app.evaluate(()=>{Craepets._events(false);localStorage.setItem("craepets.news",JSON.stringify({seen:Craepets.news().id}));});};
 const snapshot=()=>page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])));
 try{
  // Hold Date only. Native timers, startup, storage and input events remain real.
  await page.clock.setFixedTime(new Date("2026-10-02T00:00:00Z"));
  await page.goto(base+"/games/craepets/",{waitUntil:"load"});await page.waitForFunction(()=>window.Craepets&&Craepets.state());await page.evaluate(()=>Craepets._events(false));
  await page.locator("#pet-name").fill("Seed template");await page.locator("#do-adopt").click();
  const fixture=await page.evaluate(()=>({state:JSON.parse(Craepets.exportJson()),profiles:CPData.PROFILES.map(p=>({id:p.id,tier:p.tier}))}));
  await page.goto(base+"/seed-fixture.html",{waitUntil:"load"});
  const initial=await page.evaluate(({fixture,ids})=>{
   const profiles={};for(const id of ids){const s=JSON.parse(JSON.stringify(fixture.state));s.pet.name="Original "+id;s.coins=789;s.tier=fixture.profiles.find(p=>p.id===id).tier;profiles[id]=s;localStorage.setItem("craepets.v1."+id,JSON.stringify(s,null,2));localStorage.setItem("craepets.house.position."+id,"position "+id);}
   const existing=JSON.parse(JSON.stringify(profiles.cory));existing.pet.name="Existing Cory";existing.coins=123;localStorage.setItem("craepets.house.v1.cory",JSON.stringify(existing));
   localStorage.setItem("craepets.house.v1.guest","{ valuable damaged guest bytes");
   const bad=JSON.parse(JSON.stringify(profiles.jeannie));bad.stats="broken";localStorage.setItem("craepets.v1.jeannie",JSON.stringify(bad));
   localStorage.setItem("craepets.v1.ellie",JSON.stringify({v:1,pet:{name:"Legacy Ellie",species:"blorb",colour:"meadow"}}));
   localStorage.setItem("craepets.house.reset.kieran","");
   localStorage.setItem("craepets.who","tristan");localStorage.setItem("craepets.house.who","cory");localStorage.setItem("craepets.voice","1");localStorage.setItem("craepets.house.voice","");
   localStorage.setItem("craepets.house.before-import","older safety copy");localStorage.setItem("craepets.house.import-recovery.v1",' { "version":1,"records":[],"pending":0 } ');localStorage.setItem("post-office.v1","other mail");localStorage.setItem("__seed_fault_shannon","1");
   return {profiles,values:Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]))};
  },{fixture,ids});
  await context.addInitScript(()=>{
   if(!location.pathname.endsWith("/house-test/activity.html"))return;
   const put=Storage.prototype.setItem;let once=localStorage.getItem("__seed_fault_shannon")==="1";
   Storage.prototype.setItem=function(k,v){if(once&&k==="craepets.house.v1.shannon"){once=false;throw new DOMException("Full","QuotaExceededError");}return put.call(this,k,v);};
   window.restoreSeedStorage=()=>Storage.prototype.setItem=put;
  });
  await page.goto(base+"/auto-seed-host.html",{waitUntil:"load"});await ready();
  assert.equal(await app.evaluate(()=>Craepets.who()),"cory");assert.equal(await app.evaluate(()=>Craepets.state().pet.name),"Existing Cory");assert.equal(await app.evaluate(()=>Craepets.state().coins),123);
  const seeded=await snapshot();for(const[k,v]of Object.entries(initial.values))assert.equal(seeded[k],v,k+" existing bytes");
  assert.equal(seeded[prefix+"jeannie"],undefined,"malformed original must not seed");assert.equal(seeded[prefix+"kieran"],undefined,"even empty reset marker must suppress seeding");assert.equal(seeded[prefix+"shannon"],undefined,"failed copy must leave target absent");
  const ellie=JSON.parse(seeded[prefix+"ellie"]);assert.equal(ellie.pet.name,"Legacy Ellie");assert.equal(ellie.tier,fixture.profiles.find(p=>p.id==="ellie").tier);assert.ok(Number.isFinite(ellie.pet.hunger));assert.equal(ellie.stats.correct,0);
  assert.equal(JSON.parse(seeded[prefix+"tristan"]).pet.name,"Original tristan");
  assert.deepEqual(await app.evaluate(()=>Array.from(HouseSaves.copyMissing())),["shannon"],"later explicit retry reports only the verified new profile");
  assert.equal(await app.evaluate(()=>JSON.parse(localStorage.getItem("craepets.house.v1.shannon")).pet.name),"Original shannon");
  await app.evaluate(()=>window.restoreSeedStorage());
  const afterRetry=await snapshot();assert.equal(await app.evaluate(()=>HouseSaves.copyMissing().length),0);assert.deepEqual(await snapshot(),afterRetry);
  // Leave the live engine before modifying fixture-owned state for a fresh
  // all-profile visit. No real family/user storage is involved.
  await page.goto(base+"/seed-fixture.html",{waitUntil:"load"});
  const fresh=await page.evaluate(({profiles,ids})=>{
   for(const id of ids){localStorage.setItem("craepets.v1."+id,JSON.stringify(profiles[id],null,2));localStorage.removeItem("craepets.house.v1."+id);localStorage.removeItem("craepets.house.reset."+id);}
   localStorage.setItem("craepets.house.who","__proto__");localStorage.setItem("__seed_fault_shannon","0");
   return Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith("craepets.v1.")||["craepets.who","craepets.voice","craepets.house.voice","craepets.house.before-import","craepets.house.import-recovery.v1","post-office.v1"].includes(k)||k.startsWith("craepets.house.position.")).sort().map(k=>[k,localStorage.getItem(k)]));
  },{profiles:initial.profiles,ids});
  await page.goto(base+"/auto-seed-host.html",{waitUntil:"load"});await ready();
  const all=await snapshot();for(const id of ids){const s=JSON.parse(all[prefix+id]);assert.equal(s.pet.name,"Original "+id);assert.equal(s.coins,789);assert.equal(s.tier,fixture.profiles.find(p=>p.id===id).tier);}
  for(const[k,v]of Object.entries(fresh))assert.equal(all[k],v,k+" original/protected bytes");
  assert.equal(await app.evaluate(()=>Craepets.who()),"tristan","only a usable native original selection can replace invalid house selection");
  await app.evaluate(()=>{HouseActivity.select("ellie");HouseActivity.enter({view:"farm"});});await app.waitForSelector(".choice");
  const correct=await app.evaluate(()=>Craepets.correctIndex());await app.locator(".choice").nth(correct).click();assert.equal(await app.evaluate(()=>Craepets.state().stats.correct),1,"seeded child valley supports a real learning reward");
  await app.evaluate(()=>HouseActivity.leave());await page.reload({waitUntil:"load"});await ready();assert.equal(await app.evaluate(()=>Craepets.who()),"ellie");assert.equal(await app.evaluate(()=>Craepets.state().stats.correct),1,"house learning survives reload");
  for(const[k,v]of Object.entries(fresh))assert.equal((await snapshot())[k],v,"learning cannot overwrite original/protected "+k);
  assert.equal(await app.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,"real activity fits device");
  await page.goto(base+"/seed-fixture.html",{waitUntil:"load"});
  const houseBeforeShared=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith("craepets.house.")).sort().map(k=>[k,localStorage.getItem(k)])));
  await page.goto(base+"/auto-seed-host.html?from=game",{waitUntil:"load"});await ready();assert.equal(await app.evaluate(()=>HouseSaves.gameMode),true);assert.equal(await app.evaluate(()=>HouseSaves.copyMissing().length),0);
  const shared=await snapshot();for(const[k,v]of Object.entries(houseBeforeShared))assert.equal(shared[k],v,"shared mode must not touch house "+k);
  await page.goto(base+"/seed-fixture.html",{waitUntil:"load"});
  await page.evaluate(ids=>{for(const id of ids)localStorage.removeItem("craepets.house.v1."+id);localStorage.removeItem("craepets.house.who");localStorage.removeItem("craepets.house.voice");},ids);
  const beforeExport=await snapshot();await page.goto(base+"/house-test/saves.html",{waitUntil:"load"});assert.equal(await page.locator("#saved-pets").textContent().then(s=>ids.every(id=>s.includes("Original "+id))),true);
  const [download]=await Promise.all([page.waitForEvent("download"),page.locator("#export").click()]);const stream=await download.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);const exported=JSON.parse(Buffer.concat(chunks).toString("utf8"));
  assert.equal(Object.keys(exported.profiles).length,7);for(const id of ids)assert.deepEqual(exported.profiles[id],JSON.parse(beforeExport["craepets.v1."+id]));assert.deepEqual(await snapshot(),beforeExport,"export-only page must not seed or change preferences");
  assert.deepEqual(errors,[]);console.log("PASS auto-seeding Chromium "+label+": actual startup, damaged sibling/malformed source/reset/quota isolation, all seven original profiles, legacy defaults, real learning/reload, shared mode and downloaded export.");
 }finally{await context.close();}
}
(async()=>{const s=await server();let browser;try{browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:["--no-sandbox"]});const base="http://127.0.0.1:"+s.address().port;for(const[label,options]of [["Desktop",{viewport:{width:1280,height:900}}],["iPad",{viewport:{width:820,height:1180},isMobile:true,hasTouch:true,deviceScaleFactor:2}],["iPhone",{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}]])await check(browser,base,label,options);}finally{if(browser)await browser.close();await new Promise(resolve=>s.close(resolve));}})().catch(e=>{console.error(e);process.exitCode=1;});
