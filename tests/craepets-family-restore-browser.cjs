#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs/promises"),http=require("node:http"),path=require("node:path"),{chromium}=require("playwright-core");
const ROOT=path.resolve(__dirname,".."),ids=["jeannie","cory","ellie","kieran","shannon","tristan","guest"],prefix="craepets.house.v1.",recovery="craepets.house.import-recovery.v1";
const host='<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><style>html,body{margin:0;font:18px sans-serif}button,input,select{min-height:44px;max-width:100%}iframe{width:100%;height:70vh;border:0}#save-panel{padding:12px}p{overflow-wrap:anywhere}</style><button id="welcome-saves">Bring saved pets</button><button id="load-saves">Load saves</button><div id="activity-panel"><iframe id="activity-frame" name="activity" src="/house-test/activity.html"></iframe></div><div id="family-panel" hidden></div><div id="welcome" hidden></div><section id="save-panel" hidden role="dialog" aria-label="Bring saved pets"><p id="save-message" role="status"></p><button id="load-original-saves">Load originals</button><select id="single-save-profile" aria-label="Whose saved pet"></select><input id="save-file" type="file" accept=".json" aria-label="Choose a backup"><div id="save-preview"></div><button id="apply-saves" hidden>Use complete saves</button><button id="close-saves">Back</button><button id="new-pet-instead">Start new</button></section><script type="module">import {setupSaves} from "/house-test/save-panel.mjs";const frame=document.querySelector("iframe");const timer=setInterval(()=>{const w=frame.contentWindow;if(!w.HouseActivity||!w.HouseActivity.ready())return;clearInterval(timer);setupSaves({api:w.HouseActivity,engine:w.Craepets,tour:{bindButton:(el,fn)=>el.addEventListener("click",fn),suspend(){},resume(){}},refresh(){},startNew(){}});window.transferReady=true;},10);</script>';
async function server(){const s=http.createServer(async(req,res)=>{try{let p=decodeURIComponent(new URL(req.url,"http://localhost").pathname);if(p==="/family-restore-host.html"){res.writeHead(200,{"Content-Type":"text/html"}).end(host);return;}if(p.endsWith("/"))p+="index.html";const f=path.resolve(ROOT,"."+p);if(!f.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}res.writeHead(200,{"Content-Type":({".js":"text/javascript",".mjs":"text/javascript",".html":"text/html",".css":"text/css",".json":"application/json",".webp":"image/webp",".png":"image/png",".mp3":"audio/mpeg"})[path.extname(f)]||"application/octet-stream"}).end(await fs.readFile(f));}catch{res.writeHead(404).end();}});await new Promise((resolve,reject)=>{s.once("error",reject);s.listen(0,"127.0.0.1",resolve);});return s;}
async function check(browser,base,label,options){
 const context=await browser.newContext({serviceWorkers:"block",reducedMotion:"reduce",...options}),page=await context.newPage(),errors=[];
 page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});page.on("response",r=>{if(r.status()>=400)errors.push("HTTP "+r.status()+" "+r.url());});
 let app;const ready=async()=>{await page.waitForFunction(()=>window.transferReady);app=page.frame({name:"activity"});await app.evaluate(()=>{Craepets._events(false);localStorage.setItem("craepets.news",JSON.stringify({seen:Craepets.news().id}));});};
 const snapshot=()=>app.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k!=="craepets.house.import-recovery.v1").sort().map(k=>[k,localStorage.getItem(k)])));
 const file=async f=>page.locator("#save-file").setInputFiles({name:"family.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(f))});
 try{
  await page.goto(base+"/family-restore-host.html",{waitUntil:"load"});await ready();
  await app.locator("#pet-name").fill("Cory old");await app.locator("#do-adopt").click();
  const family=await app.evaluate(ids=>{
   const state=JSON.parse(Craepets.exportJson()),profiles={};
   for(const id of ids){
    const s=JSON.parse(JSON.stringify(state));s.pet.name="Old "+id;localStorage.setItem("craepets.house.v1."+id,JSON.stringify(s));
    const original=JSON.parse(JSON.stringify(s));original.pet.name="Original "+id;localStorage.setItem("craepets.v1."+id,JSON.stringify(original));
    localStorage.setItem("craepets.house.reset."+id,"keep reset "+id);localStorage.setItem("craepets.house.position."+id,"position "+id);
    s.pet.name=id==="ellie"?"<img src=x onerror=alert(1)>":"Imported "+id;s.coins=321;profiles[id]=s;
   }
   localStorage.setItem("craepets.who","jeannie");localStorage.setItem("craepets.voice","1");localStorage.setItem("craepets.house.voice","0");
   localStorage.setItem("craepets.house.before-import","keep prior safety copy");localStorage.setItem("post-office.v1","unrelated mail");
   return {format:"craepets-family",version:1,profiles,who:"ellie"};
  },ids);
  await page.locator("#welcome-saves").click();
  const before=await snapshot(),invalid=JSON.parse(JSON.stringify(family));invalid.profiles.guest.stats="broken";
  await file(invalid);await page.waitForFunction(()=>document.querySelector("#save-message").textContent.includes("usable"));
  assert.equal(await page.locator("#apply-saves").isVisible(),false);assert.deepEqual(await snapshot(),before);
  await file(family);await page.waitForFunction(()=>!document.querySelector("#apply-saves").hidden);
  assert.equal(await page.locator("#save-preview p").count(),7);assert.equal(await page.locator("#save-preview img").count(),0);
  await page.locator("#apply-saves").click();await page.waitForFunction(()=>document.querySelector("#save-message").textContent.includes("Loaded 7"));
  const imported=await app.evaluate(ids=>Object.fromEntries(ids.map(id=>[id,JSON.parse(localStorage.getItem("craepets.house.v1."+id))])),ids);
  for(const id of ids){assert.equal(imported[id].pet.name,family.profiles[id].pet.name);assert.equal(imported[id].coins,321);}
  const journal=await app.evaluate(()=>JSON.parse(localStorage.getItem("craepets.house.import-recovery.v1")));assert.equal(journal.pending,0);
  for(const[k,v]of Object.entries(journal.records[0].values))assert.equal(v,before[k]??null);
  const protectedKeys=Object.fromEntries(Object.entries(before).filter(([k])=>!k.startsWith(prefix)&&!k.startsWith("craepets.house.reset.")&&k!=="craepets.house.who"));
  const after=await snapshot();for(const[k,v]of Object.entries(protectedKeys))assert.equal(after[k],v);
  assert.equal(await app.evaluate(()=>Craepets.who()),"ellie");assert.equal(await app.locator("#game img[src=x]").count(),0);
  await page.reload({waitUntil:"load"});await ready();assert.equal(await app.evaluate(()=>Craepets.state().pet.name),family.profiles.ellie.pet.name);
  await page.locator("#welcome-saves").click();const stable=await snapshot();
  const next=JSON.parse(JSON.stringify(family));for(const id of ids)next.profiles[id].pet.name="Retry "+id;
  await file(next);await page.waitForFunction(()=>!document.querySelector("#apply-saves").hidden);
  await app.evaluate(()=>{const put=Storage.prototype.setItem;window.restoreStorage=()=>Storage.prototype.setItem=put;let once=true;Storage.prototype.setItem=function(k,v){if(once&&k==="craepets.house.v1.cory"){once=false;throw new DOMException("Full","QuotaExceededError");}return put.call(this,k,v);};});
  await page.locator("#apply-saves").click();await page.waitForFunction(()=>document.querySelector("#save-message").textContent.includes("were restored"));
  assert.deepEqual(await snapshot(),stable);await app.evaluate(()=>window.restoreStorage());
  await page.locator("#apply-saves").click();await page.waitForFunction(()=>document.querySelector("#save-message").textContent.includes("Loaded 7"));
  for(const id of ids)assert.equal(await app.evaluate(id=>JSON.parse(localStorage.getItem("craepets.house.v1."+id)).pet.name,id),"Retry "+id);
  // A persistent write failure leaves a durable pending recovery, refuses all
  // engine saves and restores exact originals when the next boot can write.
  await page.reload({waitUntil:"load"});await ready();await page.locator("#welcome-saves").click();const prior=await snapshot();
  await file(family);await page.waitForFunction(()=>!document.querySelector("#apply-saves").hidden);
  await app.evaluate(()=>{const put=Storage.prototype.setItem;window.restoreStorage=()=>Storage.prototype.setItem=put;let reached=false;Storage.prototype.setItem=function(k,v){if(k==="craepets.house.v1.ellie"&&String(v).includes("<img"))reached=true;if(reached&&(k==="craepets.house.v1.ellie"||k==="craepets.house.v1.jeannie"))throw new DOMException("Unavailable","QuotaExceededError");return put.call(this,k,v);};});
  await page.locator("#apply-saves").click();await page.waitForFunction(()=>document.querySelector("#save-message").textContent.includes("safety copy"));
  assert.equal(await app.evaluate(()=>HouseSaves.isBlocked()),true);
  const partial=await snapshot();await app.evaluate(()=>{Craepets.grant(5);HouseActivity.select("jeannie");});assert.deepEqual(await snapshot(),partial);
  await app.evaluate(()=>window.restoreStorage());await page.reload({waitUntil:"load"});await ready();
  assert.deepEqual(await snapshot(),prior);assert.equal(await app.evaluate(()=>HouseSaves.isBlocked()),false);
  const transfer=await context.newPage();await transfer.goto(base+"/house-test/saves.html",{waitUntil:"load"});assert.equal(await transfer.locator("#saved-pets").textContent().then(s=>ids.every(id=>s.includes("Original "+id))),true);
  assert.deepEqual(await snapshot(),prior);await transfer.close();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,"transfer controls fit device");
  assert.deepEqual(errors,[]);console.log("PASS family restore Chromium "+label+": real file preview/apply, seven profiles, literal text, quota retry, interrupted recovery/reload, original export and isolation.");
 }finally{await context.close();}
}
(async()=>{const s=await server();let browser;try{browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:["--no-sandbox"]});const base="http://127.0.0.1:"+s.address().port;for(const[label,options]of [["Desktop",{viewport:{width:1280,height:900}}],["iPad",{viewport:{width:820,height:1180},isMobile:true,hasTouch:true,deviceScaleFactor:2}],["iPhone",{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}]])await check(browser,base,label,options);}finally{if(browser)await browser.close();await new Promise(resolve=>s.close(resolve));}})().catch(e=>{console.error(e);process.exitCode=1;});
