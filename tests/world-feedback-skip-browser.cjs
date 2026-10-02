#!/usr/bin/env node
"use strict";
// Full production page with native input and real browser timers. Chromium emulation is not iOS Safari.
// Visible titles plus the public static catalog choose targets; no current-answer hook.
const assert=require("node:assert/strict"),fs=require("node:fs/promises"),http=require("node:http"),path=require("node:path"),{chromium}=require("playwright-core");
const ROOT=path.resolve(__dirname,".."),readFileSync=require("node:fs").readFileSync;
const catalog=new Function(readFileSync(path.join(ROOT,"games/world-trek/data.js"),"utf8")+"\nreturn {PLACES,STATES};")();
async function server() {
  const s = http.createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      if (p === "/world-feedback-fixture.html") { res.writeHead(200, { "Content-Type": "text/html" }).end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><p>World feedback fixture</p>'); return; }
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
 return Object.assign(out,{"craepets.who":"cory","craepets.house.who":"ellie","post-office.v1":"unrelated mail","arcade.kid":"kieran","block-coordinates.v2":"coordinates bytes","life-lab-v1":"life bytes","rockDetectiveQuiz":"rock history","rockDetectiveFound":"rock museum"});
}
async function check(browser,base,label,options){
 const context=await browser.newContext({serviceWorkers:"block",...options}),page=await context.newPage(),errors=[],protectedBytes=unrelated();
 page.on("pageerror",e=>errors.push(e.message));page.on("response",r=>{if(r.status()>=400)errors.push(r.status()+" "+r.url());});page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});
 async function start(){
  await page.goto(base+"/world-feedback-fixture.html");
  await page.evaluate(protectedBytes=>{localStorage.clear();for(const [key,value]of Object.entries(protectedBytes))localStorage.setItem(key,value);localStorage.setItem("world-trek.v1",JSON.stringify({stars:7,bestStreak:5,seenPlaces:{N:true},seenStates:{WA:true},seenCountries:{GB:true},diff:"easy",expertWins:3,zoom:false}));},protectedBytes);
  await page.goto(base+"/games/world-trek/");await page.locator("#world .wcell[role='button']").first().waitFor();
 }
 const skip=()=>page.getByRole("button",{name:"⏭ Skip",exact:true});
 const hint=()=>page.getByRole("button",{name:"💡 Show me",exact:true});
 async function native(locator){await locator.scrollIntoViewIfNeeded();if(options.hasTouch)await locator.tap();else await locator.click();}
 const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem("world-trek.v1")));
 async function score(right,asked){assert.match(await page.locator("#scorebar").innerText(),new RegExp("Right:\\s*"+right+"\\s*/\\s*"+asked+"(?:\\s|$)"));}
 async function snapshot(){return {title:await page.locator("#prompt-title").innerText(),score:await page.locator("#scorebar").innerText(),text:await page.locator("#prompt-text").innerText(),save:await state()};}
 async function preserve(){
  assert.deepEqual(await page.evaluate(keys=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)])),Object.keys(protectedBytes)),protectedBytes);
  const s=await state();assert.equal(s.bestStreak,5);assert.equal(s.zoom,false);assert.deepEqual(s.seenCountries,{GB:true});assert.equal(s.seenPlaces.N,true);assert.equal(s.seenStates.WA,true);
 }
 async function target(correct=true){
  const title=await page.locator("#prompt-title").innerText();
  if(title.startsWith("Tap ")){
   const want=Object.keys(catalog.PLACES).find(k=>title.startsWith("Tap "+catalog.PLACES[k].name+" "));assert.ok(want,"public continent/ocean title");
   const key=correct?want:Object.keys(catalog.PLACES).find(k=>k!==want);return page.locator("#world .wcell[data-k='"+key+"'][role='button']");
  }
  const want=Object.keys(catalog.STATES).find(k=>title==="Find "+catalog.STATES[k][0]+"!"||title===catalog.STATES[k][1]+" is the capital of…?");assert.ok(want,"public state/capital title");
  const key=correct?want:Object.keys(catalog.STATES).find(k=>k!==want);return page.locator("#states .scell[data-s='"+key+"']");
 }
 async function answer(correct=true,keyboard=false){const cell=await target(correct);if(keyboard){await cell.focus();await page.keyboard.press("Enter");}else await native(cell);}
 async function disabledAttempts(){
  assert.equal(await skip().isDisabled(),true,"Skip is natively disabled during accepted feedback");
  await skip().scrollIntoViewIfNeeded();const box=await skip().boundingBox();assert.ok(box);
  // Raw native input deliberately reaches a disabled control without locator auto-wait.
  for(let i=0;i<3;i++){if(options.hasTouch)await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);else await page.mouse.click(box.x+box.width/2,box.y+box.height/2);}
  if(!options.hasTouch){await hint().focus();await page.keyboard.press("Tab");assert.equal(await skip().evaluate(e=>e===document.activeElement),false,"native Tab skips disabled Skip");await page.keyboard.press("Enter");}
 }
 try{
  for(const mode of ["continents","capitals"]){
   const ms=mode==="capitals"?2600:2400;
   await start();await native(page.locator("[data-mode='"+mode+"']"));await score(0,1);
   await native(skip());await score(0,2);assert.equal(await skip().isEnabled(),true);
   await answer(false);await score(0,2);assert.equal((await state()).stars,7);assert.equal(await skip().isEnabled(),true);
   await native(skip());await score(0,3);const pending=await snapshot();await page.waitForTimeout(1500);assert.deepEqual(await snapshot(),pending,"wrong highlight cannot replace active question");
   await native(hint());await native(skip());await score(0,4);
   await answer(true,!options.hasTouch);await score(1,4);assert.equal((await state()).stars,8,"skipping hinted question resets help");
   const feedback=await snapshot();await disabledAttempts();await score(1,4);assert.deepEqual(await snapshot(),feedback,"native feedback Skip does not replace answer");
   await page.waitForFunction(()=>/Right:\s*1\s*\/\s*5(?:\s|$)/.test(document.getElementById("scorebar").textContent),null,{timeout:5000});await score(1,5);assert.equal(await skip().isEnabled(),true);
   const next=await snapshot();await page.waitForTimeout(ms+200);assert.deepEqual(await snapshot(),next,"real feedback deadline advances once");
   await native(hint());await answer();await score(2,5);assert.equal((await state()).stars,8,"hinted correct retains existing no-star rule");assert.equal(await skip().isDisabled(),true);
   await native(page.locator("[data-mode='atlas']"));const atlas=await snapshot();await page.waitForTimeout(ms+200);assert.deepEqual(await snapshot(),atlas);assert.equal(atlas.title,"The Atlas 📖");
   await native(page.locator("[data-mode='"+mode+"']"));await answer();await native(page.locator("[data-diff='expert']"));await score(0,1);assert.equal(await skip().isEnabled(),true);
   const tier=await snapshot();await page.waitForTimeout(ms+200);assert.deepEqual(await snapshot(),tier,"tier restart cancels prior feedback");assert.equal(tier.save.diff,"expert");await native(skip());await score(0,2);await preserve();
   console.log("World feedback Skip "+label+" "+mode+": native "+(options.hasTouch?"touch":"pointer/keyboard")+", real timer once, pending/wrong/hinted Skip, mode/tier exits and exact unrelated bytes passed.");
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,"fits device width");assert.deepEqual(errors,[]);
 }finally{await context.close();}
}
(async()=>{
 const s=await server();let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||"/usr/bin/chromium",headless:true,args:["--no-sandbox"]});const base="http://127.0.0.1:"+s.address().port;
  for(const [label,options]of[["Desktop",{viewport:{width:1280,height:800}}],["iPad",{viewport:{width:820,height:1180},isMobile:true,hasTouch:true}],["iPhone",{viewport:{width:390,height:844},isMobile:true,hasTouch:true}]])await check(browser,base,label,options);
 }finally{if(browser)await browser.close();await new Promise(resolve=>s.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
