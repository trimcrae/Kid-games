#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs/promises"),http=require("node:http"),path=require("node:path"),{chromium}=require("playwright-core");
const ROOT=path.resolve(__dirname,".."),ids=["jeannie","cory","ellie","kieran","shannon","tristan","guest"];
async function server(){const s=http.createServer(async(req,res)=>{try{
 let p=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
 if(p==="/loader-fixture.html"){res.writeHead(200,{"Content-Type":"text/html"}).end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><p>Saved-data test setup</p>');return;}
 if(p==="/loader-host.html"){res.writeHead(200,{"Content-Type":"text/html"}).end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><style>html,body{margin:0}iframe{display:block;width:100%;height:90vh;border:0}</style><div id="startup-message"></div><iframe id="activity-frame" name="activity" src="/house-test/activity.html"></iframe>');return;}
 if(p.endsWith("/"))p+="index.html";const f=path.resolve(ROOT,"."+p);if(!f.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
 res.writeHead(200,{"Content-Type":({".js":"text/javascript",".mjs":"text/javascript",".html":"text/html",".css":"text/css",".json":"application/json",".webp":"image/webp",".png":"image/png",".mp3":"audio/mpeg",".svg":"image/svg+xml"})[path.extname(f)]||"application/octet-stream"}).end(await fs.readFile(f));
 }catch{res.writeHead(404).end();}});await new Promise((resolve,reject)=>{s.once("error",reject);s.listen(0,"127.0.0.1",resolve);});return s;}
async function check(browser,base,label,options){
 const context=await browser.newContext({serviceWorkers:"block",reducedMotion:"reduce",...options}),page=await context.newPage(),errors=[];
 page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});page.on("response",r=>{if(r.status()>=400)errors.push("HTTP "+r.status()+" "+r.url());});
 let app;const snapshot=()=>page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])));
 const neutral=()=>page.goto(base+"/loader-fixture.html",{waitUntil:"load"});
 const open=async mode=>{await page.goto(base+"/loader-host.html"+(mode==="game"?"?from=game":""),{waitUntil:"load"});app=page.frame({name:"activity"});};
 const ready=async()=>{await app.waitForFunction(()=>Craepets.state());await app.evaluate(()=>{Craepets._events(false);localStorage.setItem("craepets.news",JSON.stringify({seen:Craepets.news().id}));});};
 const download=async()=>{const [d]=await Promise.all([page.waitForEvent("download"),app.locator("[data-saved-data-download]").click()]);const stream=await d.createReadStream(),chunks=[];for await(const c of stream)chunks.push(c);return Buffer.concat(chunks).toString("utf8");};
 try{
  await page.clock.setFixedTime(new Date("2026-10-02T00:00:00Z"));
  await page.goto(base+"/games/craepets/",{waitUntil:"load"});await page.waitForFunction(()=>window.Craepets&&Craepets.state());await page.evaluate(()=>Craepets._events(false));
  await page.locator("#pet-name").fill("Loader template");await page.locator("#do-adopt").click();
  const template=await page.evaluate(()=>({state:JSON.parse(Craepets.exportJson()),profiles:CPData.PROFILES.map(p=>({id:p.id,tier:p.tier}))}));
  await context.addInitScript(()=>{
   if(!location.pathname.endsWith("/house-test/activity.html"))return;
   const get=Storage.prototype.getItem;
   Storage.prototype.getItem=function(k){const key=get.call(this,"__loader_fault_key"),on=get.call(this,"__loader_fault_on");if(on==="1"&&k===key)throw new DOMException("Read unavailable","SecurityError");return get.call(this,k);};
  });
  async function fixture(mode,id,raw){
   await neutral();
   return page.evaluate(({template,ids,mode,id,raw})=>{
    localStorage.clear();
    for(const prefix of["craepets.house.","craepets."])for(const who of ids){const s=JSON.parse(JSON.stringify(template.state));s.pet.name="Valid "+who;s.tier=template.profiles.find(p=>p.id===who).tier;s.coins=789;localStorage.setItem(prefix+"v1."+who,JSON.stringify(s,null,2));}
    const prefix=mode==="game"?"craepets.":"craepets.house.";
    localStorage.setItem("craepets.house.who",id);localStorage.setItem("craepets.who",mode==="game"?id:ids.find(x=>x!==id));
    if(raw!==null)localStorage.setItem(prefix+"v1."+id,raw);
    localStorage.setItem("craepets.house.voice","");localStorage.setItem("craepets.voice","1");localStorage.setItem("craepets.house.before-import","earlier safety bytes");localStorage.setItem("craepets.house.import-recovery.v1",' { "version":1,"records":[],"pending":0 } ');
    localStorage.setItem("post-office.v1","unrelated mail");for(const who of ids){localStorage.setItem("craepets.house.position."+who,"position "+who);localStorage.setItem("craepets.house.reset."+who,"reset "+who);}
    localStorage.setItem("__loader_fault_key","");localStorage.setItem("__loader_fault_on","0");
    return Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]));
   },{template,ids,mode,id,raw});
  }
  for(const mode of["house","game"])for(const id of ids){
   const raw="{ valuable "+mode+" "+id+" bytes <img src=x onerror=alert(1)>\n😀\t",before=await fixture(mode,id,raw);
   await open(mode);await app.waitForSelector(".saved-data-warning [role=alert]");
   assert.equal(await app.evaluate(()=>HouseActivity.loadProblem().profile),id);assert.equal(await app.evaluate(()=>Craepets.state()),null,"no fabricated blank live pet");
   assert.equal(await app.locator(".saved-data-warning [role=alert]").textContent().then(t=>t.includes("nothing was replaced")),true);
   assert.equal(await app.evaluate(()=>document.activeElement.getAttribute("role")),"alert");assert.equal(await app.locator("[data-saved-data-download]").evaluate(e=>e.getBoundingClientRect().height>=44),true);
   assert.deepEqual(await snapshot(),before,"failed actual startup preserves all seven house/original values and selection");
   await app.evaluate(valid=>{Craepets.importJson(JSON.stringify(valid));HouseActivity.leave();HouseActivity.cuddle();HouseActivity.rest(10);},template.state);
   assert.deepEqual(await snapshot(),before,"paused real callbacks cannot overwrite damaged bytes");
   // Execute the actual production initialization gate and local recovery-link
   // module. This occurs before any 3D scene construction, not a walkthrough.
   const gate=await page.evaluate(async()=>{
    const start=performance.now();try{await(await import("/house-test/house-life.mjs?v=20261002-active-loader")).createHouseLife({});return {refused:false};}
    catch(e){const {showSavedDataRecovery}=await import("/house-test/saved-data-recovery.mjs?v=20261002-active-loader");const link=showSavedDataRecovery(document.getElementById("startup-message"),new URLSearchParams(location.search).get("from")==="game");return {refused:e.savedDataBlocked===true,ms:performance.now()-start,href:link.href};}
   });
   assert.equal(gate.refused,true);assert.ok(gate.ms<5000,"blocked engine must not wait for the 30s generic timeout");
   const expected=new URL(base+"/house-test/activity.html");if(mode==="game")expected.searchParams.set("from","game");assert.equal(gate.href,expected.href);
   if(id==="cory"){assert.equal(await download(),raw,"local downloaded raw bytes remain literal");await page.locator("#startup-message a").click();app=page.mainFrame();await app.waitForSelector(".saved-data-warning");assert.equal(await app.evaluate(()=>HouseSaves.gameMode),mode==="game");assert.equal(await download(),raw);assert.deepEqual(await snapshot(),before,"recovery navigation retains exact data/mode");}
  }
  for(const mode of["house","game"]){
   await fixture(mode,"cory",null);const prefix=mode==="game"?"craepets.":"craepets.house.";
   await page.evaluate(key=>{localStorage.setItem("__loader_fault_key",key);localStorage.setItem("__loader_fault_on","1");},prefix+"v1.cory");
   const before=await snapshot();await open(mode);await app.waitForSelector(".saved-data-warning");await app.locator("[data-saved-data-download]").click();assert.equal(await app.locator("[role=alert]").textContent().then(t=>t.includes("could not be read")),true);assert.deepEqual(await snapshot(),before);
   await page.evaluate(()=>localStorage.setItem("__loader_fault_on","0"));await app.locator("[data-saved-data-retry]").click();await ready();assert.equal(await app.evaluate(()=>Craepets.state().pet.name),"Valid cory","retry can open the real saved pet when reads recover");
   // A malformed target must be rejected before switching player or lesson.
   await app.evaluate(()=>HouseActivity.enter({view:"farm"}));await app.waitForSelector(".choice");const active=await app.evaluate(()=>({who:Craepets.who(),state:Craepets.exportJson(),q:JSON.stringify(Craepets.session())}));
   await page.evaluate(prefix=>localStorage.setItem(prefix+"v1.ellie","{ damaged sibling"),prefix);
   const sibling=await snapshot();await app.evaluate(()=>HouseActivity.select("ellie"));
   assert.deepEqual(await app.evaluate(()=>({who:Craepets.who(),state:Craepets.exportJson(),q:JSON.stringify(Craepets.session())})),active);assert.deepEqual(await snapshot(),sibling);assert.equal(await app.evaluate(()=>HouseActivity.loadProblem()),null);
   await app.evaluate(()=>HouseActivity.enter({owner:"ellie",view:"visit"}));assert.deepEqual(await app.evaluate(()=>({who:Craepets.who(),state:Craepets.exportJson(),q:JSON.stringify(Craepets.session())})),active,"rejected owner activity must not leave the live lesson");assert.equal(await app.evaluate(()=>Craepets.who()),"cory");assert.equal((await snapshot())[prefix+"v1.ellie"],"{ damaged sibling");assert.equal(await app.evaluate(()=>HouseActivity.neighborhood().find(p=>p.id==="ellie").unavailable),true);
   await app.evaluate(()=>HouseActivity.enter({view:"farm"}));await app.waitForSelector(".choice");const correct=await app.evaluate(()=>Craepets.correctIndex());await app.locator(".choice").nth(correct).click();assert.equal(await app.evaluate(()=>Craepets.state().stats.correct),1,"healthy lesson still rewards learning after a refused sibling");
   // A real other-document storage event on the active slot stops stale saves.
   const damaged="{ newer damaged active bytes\n😀";await page.evaluate(({prefix,damaged})=>localStorage.setItem(prefix+"v1.cory",damaged),{prefix,damaged});await app.waitForFunction(()=>HouseActivity.loadProblem());
   const changed=await snapshot();await app.evaluate(()=>{HouseActivity.leave();Craepets.importJson('{}');});assert.deepEqual(await snapshot(),changed);assert.equal(await download(),damaged);
   // Valid legacy and unadopted states remain usable after ordinary reload.
   await fixture(mode,"cory",JSON.stringify({v:1,pet:{name:"Legacy cory",species:"blorb",colour:"meadow"},coins:321}));await open(mode);await ready();assert.equal(await app.evaluate(()=>Craepets.state().pet.name),"Legacy cory");assert.equal(await app.evaluate(()=>Craepets.state().coins),321);await page.reload({waitUntil:"load"});app=page.frame({name:"activity"});await ready();assert.equal(await app.evaluate(()=>Craepets.state().pet.name),"Legacy cory");
   await fixture(mode,"cory",JSON.stringify({v:1,pet:null,coins:120}));
   // Keep the unchanged adopted-sibling selection policy out of this blank
   // loader check; damaged-active cases above still have healthy siblings.
   if(mode==="house")await page.evaluate(ids=>{for(const id of ids)if(id!=="cory")localStorage.setItem("craepets.house.v1."+id,JSON.stringify({v:1,pet:null}));},ids);
   await open(mode);await ready();assert.equal(await app.evaluate(()=>Craepets.state().pet),null);await app.locator("#pet-name").fill("New cory");await app.locator("#do-adopt").click();assert.equal(await app.evaluate(()=>Craepets.state().pet.name),"New cory");assert.equal(await app.evaluate(()=>HouseActivity.loadProblem()),null);
  }
  assert.deepEqual(errors,[]);console.log("PASS active loader Chromium "+label+": all fourteen active profile/mode refusals, exact namespaces/selection, real startup gate/link/download, unavailable reads/retry, sibling lesson preservation, other-document storage refusal and valid legacy/blank play.");
 }finally{await context.close();}
}
(async()=>{const s=await server();let browser;try{browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:["--no-sandbox"]});const base="http://127.0.0.1:"+s.address().port;for(const[label,options]of [["Desktop",{viewport:{width:1280,height:900}}],["iPad",{viewport:{width:820,height:1180},isMobile:true,hasTouch:true,deviceScaleFactor:2}],["iPhone",{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}]])await check(browser,base,label,options);}finally{if(browser)await browser.close();await new Promise(resolve=>s.close(resolve));}})().catch(e=>{console.error(e);process.exitCode=1;});
