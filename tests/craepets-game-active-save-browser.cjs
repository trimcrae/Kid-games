#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs/promises"),http=require("node:http"),path=require("node:path"),{chromium}=require("playwright-core");
const ROOT=path.resolve(__dirname,".."),ids=["jeannie","cory","ellie","kieran","shannon","tristan","guest"];
async function server(){const s=http.createServer(async(req,res)=>{try{
 let p=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
 if(p==="/original-loader-fixture.html"){res.writeHead(200,{"Content-Type":"text/html"}).end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><p>Original-game save fixture</p>');return;}
 if(p.endsWith("/"))p+="index.html";const f=path.resolve(ROOT,"."+p);if(!f.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
 res.writeHead(200,{"Content-Type":({".js":"text/javascript",".mjs":"text/javascript",".html":"text/html",".css":"text/css",".json":"application/json",".webp":"image/webp",".png":"image/png",".mp3":"audio/mpeg",".svg":"image/svg+xml"})[path.extname(f)]||"application/octet-stream"}).end(await fs.readFile(f));
 }catch{res.writeHead(404).end();}});await new Promise((resolve,reject)=>{s.once("error",reject);s.listen(0,"127.0.0.1",resolve);});return s;}
async function check(browser,base,label,options){
 const context=await browser.newContext({serviceWorkers:"block",reducedMotion:"reduce",...options}),page=await context.newPage(),observer=await context.newPage(),errors=[];
 page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});page.on("response",r=>{if(r.status()>=400)errors.push("HTTP "+r.status()+" "+r.url());});
 const neutral=()=>page.goto(base+"/original-loader-fixture.html",{waitUntil:"load"}),snapshot=()=>observer.evaluate(()=>Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]))),open=()=>page.goto(base+"/games/craepets/",{waitUntil:"load"});
 const ready=async()=>{await page.waitForFunction(()=>window.Craepets&&Craepets.state());await page.evaluate(()=>{Craepets._events(false);localStorage.setItem("craepets.news",JSON.stringify({seen:Craepets.news().id}));});};
 const download=async()=>{const[d]=await Promise.all([page.waitForEvent("download"),page.locator("[data-saved-data-download]").click()]);const stream=await d.createReadStream(),chunks=[];for await(const c of stream)chunks.push(c);return Buffer.concat(chunks).toString("utf8");};
 const farm=async()=>{await page.locator('[data-go="farm"]').first().click();await page.waitForSelector(".choice");};
 try{
  await page.clock.setFixedTime(new Date("2026-10-02T00:00:00Z"));
  await observer.goto(base+"/original-loader-fixture.html",{waitUntil:"load"});
  await open();await ready();await page.locator("#pet-name").fill("Original loader template");await page.locator("#do-adopt").click();
  const template=await page.evaluate(()=>({state:JSON.parse(Craepets.exportJson()),newsId:Craepets.news().id,profiles:CPData.PROFILES.map(p=>({id:p.id,tier:p.tier}))}));
  await context.addInitScript(()=>{
   if(!location.pathname.startsWith("/games/craepets/"))return;
   const get=Storage.prototype.getItem;
   Storage.prototype.getItem=function(k){const key=get.call(this,"__original_fault_key"),on=get.call(this,"__original_fault_on");if(on==="1"&&k===key)throw new DOMException("Read unavailable","SecurityError");return get.call(this,k);};
  });
  async function fixture(id,raw){
   await neutral();
   const exact=await page.evaluate(({template,ids,id,raw})=>{
    localStorage.clear();
    for(const prefix of["craepets.","craepets.house."])for(const who of ids){const s=JSON.parse(JSON.stringify(template.state));s.pet.name="Valid "+who;s.tier=template.profiles.find(p=>p.id===who).tier;s.coins=789;localStorage.setItem(prefix+"v1."+who,JSON.stringify(s,null,2));}
    localStorage.setItem("craepets.who",id);localStorage.setItem("craepets.house.who","ellie");
    if(raw!==null)localStorage.setItem("craepets.v1."+id,raw);
    localStorage.setItem("craepets.voice","0");localStorage.setItem("craepets.house.voice","");localStorage.setItem("craepets.news",JSON.stringify({seen:template.newsId||"mystery-house-20260915"}));
    localStorage.setItem("craepets.house.before-import","earlier safety bytes");localStorage.setItem("craepets.house.import-recovery.v1",' { "version":1,"records":[],"pending":0 } ');
    localStorage.setItem("post-office.v1","unrelated mail");for(const who of ids){localStorage.setItem("craepets.house.position."+who,"position "+who);localStorage.setItem("craepets.house.reset."+who,"reset "+who);}
    localStorage.setItem("__original_fault_key","");localStorage.setItem("__original_fault_on","0");
    return Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]));
   },{template,ids,id,raw});
   // Setup owns these bytes. Wait for the observer renderer to receive the
   // entire fixture cohort before taking any test-owned transaction snapshot.
   await observer.waitForFunction(exact=>JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])))===JSON.stringify(exact),exact);
   return exact;
  }
  // The entire standalone production page loads, not a JS/browser adapter.
  for(const id of ids){
   const raw="{ valuable original "+id+" bytes <img src=x onerror=alert(1)>\n😀\t",before=await fixture(id,raw);
   await open();await page.waitForSelector(".saved-data-warning [role=alert]");
   assert.equal(await page.evaluate(()=>Craepets.loadProblem().profile),id);assert.equal(await page.evaluate(()=>Craepets.state()),null);assert.equal(await page.evaluate(()=>document.activeElement.getAttribute("role")),"alert");
   assert.equal(await page.locator("[data-saved-data-download]").evaluate(e=>e.getBoundingClientRect().height>=44),true);assert.deepEqual(await snapshot(),before,"all fourteen profile slots, selection and unrelated bytes survive blocked startup");
   await page.evaluate(valid=>{Craepets.importJson(JSON.stringify(valid));Craepets.grant(100);Craepets._setRung("math",3);Craepets._setWish({});Craepets._event(0);Craepets._nextQuestion();Craepets.photo();},template.state);
   await page.keyboard.press("Enter");await page.keyboard.press("1");assert.deepEqual(await snapshot(),before);
   if(id==="cory")assert.equal(await download(),raw,"download must contain literal original bytes");
  }
  for(const key of["craepets.who","craepets.v1.cory"]){
   await fixture("cory",null);await observer.evaluate(key=>{localStorage.setItem("__original_fault_key",key);localStorage.setItem("__original_fault_on","1");},key);
   const before=await snapshot();await open();await page.waitForSelector(".saved-data-warning");assert.equal(await page.evaluate(()=>Craepets.state()),null);assert.deepEqual(await snapshot(),before);
   if(key.endsWith(".cory")){await page.locator("[data-saved-data-download]").click();assert.match(await page.locator("[role=alert]").textContent(),/could not be read/);assert.deepEqual(await snapshot(),before);}
   await observer.evaluate(()=>localStorage.setItem("__original_fault_on","0"));await page.locator("[data-saved-data-retry]").click();await ready();assert.equal(await page.evaluate(()=>Craepets.state().pet.name),"Valid cory");
  }
  await fixture("cory",null);await observer.evaluate(()=>localStorage.setItem("craepets.who","__proto__"));const invalidWho=await snapshot();await open();await page.waitForSelector(".saved-data-warning");assert.deepEqual(await snapshot(),invalidWho);assert.equal(await page.evaluate(()=>Craepets.state()),null);
  // Rejected player selection keeps the actual running question and pet.
  await fixture("cory",null);await open();await ready();await farm();const active=await page.evaluate(()=>({who:Craepets.who(),state:Craepets.exportJson(),q:JSON.stringify(Craepets.session())}));
  await observer.evaluate(()=>localStorage.setItem("craepets.v1.ellie","{ damaged sibling"));const sibling=await snapshot();await page.locator("[data-swap]").click();await page.locator('[data-who="ellie"]').click();
  assert.deepEqual(await page.evaluate(()=>({who:Craepets.who(),state:Craepets.exportJson(),q:JSON.stringify(Craepets.session())})),active);assert.deepEqual(await snapshot(),sibling);assert.equal(await page.evaluate(()=>Craepets.loadProblem()),null);assert.equal(await page.locator(".saved-data-warning [role=alert]").isVisible(),true);
  const answer=await page.evaluate(()=>Craepets.correctIndex());await page.locator(".choice").nth(answer).click();assert.equal(await page.evaluate(()=>Craepets.state().stats.correct),1,"healthy question still rewards learning");
  // Shallow-renderable but deeply malformed sibling is refused by real Visit.
  await page.locator('[data-go="case"]').first().click();await observer.evaluate(template=>{const s=JSON.parse(JSON.stringify(template.state));s.pet.name="Broken sibling";s.stats="broken";localStorage.setItem("craepets.v1.ellie",JSON.stringify(s));},template);
  // Re-enter the existing Case tab to paint the fixture's family row.
  await page.locator('[data-go="nest"]').first().click();await page.locator('[data-go="case"]').first().click();
  const visitBefore=await snapshot(),caseState=await page.evaluate(()=>({state:Craepets.exportJson(),who:Craepets.who(),view:Craepets.view()}));await page.locator('[data-visit="ellie"]').click();
  assert.deepEqual(await page.evaluate(()=>({state:Craepets.exportJson(),who:Craepets.who(),view:Craepets.view()})),caseState);assert.deepEqual(await snapshot(),visitBefore);assert.equal(await page.evaluate(()=>Craepets.visiting()),null);
  // Native FileReader performs a real read; only completion delivery is held.
  for(const late of["storage event","before storage event"]){
   await fixture("cory",null);await open();await ready();await page.locator('[data-go="case"]').first().click();await page.locator("[data-import]").click();
   await page.evaluate(()=>{const Native=window.FileReader;window.FileReader=function(){const r=new Native(),read=r.readAsText;r.readAsText=function(file){const done=r.onload;r.onload=function(ev){window.__originalReaderDone=()=>done.call(r,ev);};return read.call(r,file);};return r;};});
   await page.locator("#import-file").setInputFiles({name:"valid-valley.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(template.state))});await page.waitForFunction(()=>window.__originalReaderDone);
   const raw="{ changed after native reading began "+late+"\n😀";
   if(late==="storage event"){await observer.evaluate(raw=>localStorage.setItem("craepets.v1.cory",raw),raw);await page.waitForFunction(()=>Craepets.loadProblem());}
   else await page.evaluate(raw=>localStorage.setItem("craepets.v1.cory",raw),raw);
   await observer.waitForFunction(raw=>localStorage.getItem("craepets.v1.cory")===raw,raw);
   const before=await snapshot();await page.evaluate(()=>window.__originalReaderDone());await page.waitForFunction(()=>Craepets.loadProblem());await observer.bringToFront();await page.bringToFront();await page.keyboard.press("Enter");
   assert.deepEqual(await snapshot(),before,"delayed native callback and visibility transitions cannot overwrite raw");assert.equal(await download(),raw);
  }
  // The real wheel timeout/award closure is held after its native delay.
  // Neither a delivered storage refusal nor the award's own save recheck may
  // put a new Prize overlay in front of the local recovery controls.
  for(const late of["storage event","before storage event"]){
   await fixture("cory",null);await open();await ready();await page.locator('[data-go="quests"]').first().click();
   await page.evaluate(()=>{const timer=window.setTimeout;window.setTimeout=function(fn,delay,...args){if(typeof fn==="function"&&fn.toString().includes("awardSpin(")){window.__originalWheelDone=()=>fn(...args);return timer(()=>{window.__originalWheelReady=true;},delay);}return timer(fn,delay,...args);};});
   await page.locator("[data-spin]").click();await page.waitForFunction(()=>window.__originalWheelReady);
   const raw="{ damaged during actual wheel "+late;
   if(late==="storage event"){await observer.evaluate(raw=>localStorage.setItem("craepets.v1.cory",raw),raw);await page.waitForFunction(()=>Craepets.loadProblem());}
   else await page.evaluate(raw=>localStorage.setItem("craepets.v1.cory",raw),raw);
   await observer.waitForFunction(raw=>localStorage.getItem("craepets.v1.cory")===raw,raw);
   const before=await snapshot(),coins=await page.evaluate(()=>Craepets.state().coins);await page.evaluate(()=>window.__originalWheelDone());await page.waitForFunction(()=>Craepets.loadProblem());
   if(late==="storage event")assert.equal(await page.evaluate(()=>Craepets.state().coins),coins,"already paused award must not mutate healthy memory");
   assert.equal(await page.locator("#sheet-back").count(),0,"stale prize cannot obscure paused recovery");assert.deepEqual(await snapshot(),before);assert.equal(await download(),raw);
  }
  // Existing news modal must be dismissed before paused recovery is focused.
  await fixture("cory",null);await open();await ready();await page.locator("[data-news]").first().click();await page.waitForSelector("#news-back");
  const newsRaw="{ damaged with news open\n😀";await observer.evaluate(raw=>localStorage.setItem("craepets.v1.cory",raw),newsRaw);await page.waitForFunction(()=>Craepets.loadProblem());
  const newsBefore=await snapshot();assert.equal(await page.locator("#news-back").count(),0);assert.equal(await page.locator("#sheet-back").count(),0);assert.equal(await page.evaluate(()=>document.activeElement.getAttribute("role")),"alert");assert.equal(await download(),newsRaw);assert.deepEqual(await snapshot(),newsBefore);
  await page.locator("[data-saved-data-retry]").click();await page.waitForSelector(".saved-data-warning");assert.equal(await page.locator("#news-back").count(),0);assert.deepEqual(await snapshot(),newsBefore,"retry retains the same damaged raw without a news overlay");
  // Valid legacy, intentional blank and truly absent slots still play/reload.
  for(const raw of[JSON.stringify({v:1,pet:{name:"Legacy cory",species:"blorb",colour:"meadow"},coins:321}),JSON.stringify({v:1,pet:null,coins:120}),undefined]){
   await fixture("cory",raw===undefined?null:raw);if(raw===undefined)await observer.evaluate(()=>localStorage.removeItem("craepets.v1.cory"));await open();await ready();
   if(raw&&JSON.parse(raw).pet){assert.equal(await page.evaluate(()=>Craepets.state().pet.name),"Legacy cory");assert.equal(await page.evaluate(()=>Craepets.state().coins),321);}
   else{assert.equal(await page.evaluate(()=>Craepets.state().pet),null);await page.locator("#pet-name").fill("New cory");await page.locator("#do-adopt").click();assert.equal(await page.evaluate(()=>Craepets.state().pet.name),"New cory");}
   const protectedBefore=await snapshot();await farm();const correct=await page.evaluate(()=>Craepets.correctIndex());await page.locator(".choice").nth(correct).click();await page.reload({waitUntil:"load"});await ready();assert.equal(await page.evaluate(()=>Craepets.state().stats.correct),1);
   const after=await snapshot();for(const[k,v]of Object.entries(protectedBefore))if(k!=="craepets.v1.cory")assert.equal(after[k],v,"ordinary learning must preserve sibling/house/protected "+k);
  }
  assert.deepEqual(errors,[]);console.log("PASS original-game loader Chromium "+label+": seven profiles, exact original/house/selection bytes, literal download, read/WHO refusal and retry, real sibling/visit controls, native deferred-reader/storage/visibility transitions, genuine learning and blank/legacy reload.");
 }finally{await context.close();}
}
(async()=>{const s=await server();let browser;try{browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:["--no-sandbox"]});const base="http://127.0.0.1:"+s.address().port;for(const[label,options]of [["Desktop",{viewport:{width:1280,height:900}}],["iPad",{viewport:{width:820,height:1180},isMobile:true,hasTouch:true,deviceScaleFactor:2}],["iPhone",{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}]])await check(browser,base,label,options);}finally{if(browser)await browser.close();await new Promise(resolve=>s.close(resolve));}})().catch(e=>{console.error(e);process.exitCode=1;});
