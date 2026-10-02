#!/usr/bin/env node
"use strict";
// Full production page, controlled RNG fixture, native keyboard/pointer/touch.
// Chromium emulation is not iOS Safari; no audible-output claim.
// Visible interval recipe and public piano key datasets derive answers; no current-q hook.
const assert=require("node:assert/strict"),fs=require("node:fs/promises"),http=require("node:http"),path=require("node:path"),{chromium}=require("playwright-core");
const ROOT=path.resolve(__dirname,"..");
async function server() {
  const s = http.createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      if (p === "/music-chord-fixture.html") { res.writeHead(200, { "Content-Type": "text/html" }).end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><p>Music chord fixture</p>'); return; }
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
function unrelated(){const out={};for(const prefix of ["craepets.","craepets.house."])for(const who of people)out[prefix+"v1."+who]="synthetic original bytes "+prefix+who+"\n😀";return Object.assign(out,{"craepets.who":"cory","craepets.house.who":"ellie","post-office.v1":"unrelated mail","arcade.kid":"kieran","block-coordinates.v2":"coordinates bytes","life-lab-v1":"life bytes","rockDetectiveQuiz":"rock history","rockDetectiveFound":"rock museum","world-trek.v1":"world history"});}
function fixture(){return {songs:{"Hot Cross Buns":true,"Twinkle, Twinkle":{stars:3}},echoBest:9,nameStars:13,staffStars:14,tune:[{note:"C4",t:0},{note:"F#4",t:120}],labels:true,flats:false,tempo:"steady",metro:false,scale:0,echoLevel:1,nameLevel:1,staffLevel:1,chordLevel:2,echoBestBy:{1:9,4:5},nameStreakBest:8,staffSpeedBest:6,chordCount:7,chordStreakBest:5,retiredHistory:"preserved"};}
const pitch=note=>{const m=/^([A-G])(#?)(\d)$/.exec(note);assert.ok(m,note);return (Number(m[3])+1)*12+{C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1]]+Number(Boolean(m[2]));};
async function check(browser,base,label,options){
 const context=await browser.newContext({serviceWorkers:"block",...options}),page=await context.newPage(),errors=[],protectedBytes=unrelated();
 // Deterministic native factory selection: index7 of the unchanged10-entry pool is D major.
 // No production source rewrite, factory replacement or current-question/answer hook.
 await page.addInitScript(()=>{Math.random=()=>0.75;});
 page.on("pageerror",e=>errors.push(e.message));page.on("response",r=>{if(r.status()>=400)errors.push(r.status()+" "+r.url());});page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});
 async function native(locator){await locator.scrollIntoViewIfNeeded();if(options.hasTouch)await locator.tap();else await locator.click();}
 const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem("music-lab.v1")));
 async function preserve(count){assert.deepEqual(await state(),{...fixture(),chordCount:count});assert.deepEqual(await page.evaluate(keys=>Object.fromEntries(keys.map(k=>[k,localStorage.getItem(k)])),Object.keys(protectedBytes)),protectedBytes);}
 async function derive(){
  const text=await page.locator("#prompt-text").innerText(),root=/Start on ([A-G])\b/.exec(text),steps=/Major:\s*(\d+) steps, then (\d+)/.exec(text);
  assert.ok(root,"public root");assert.ok(steps,"public adjacent-key instruction");
  const keys=(await page.locator("#piano .key").evaluateAll(es=>es.map(e=>e.dataset.note))).sort((a,b)=>pitch(a)-pitch(b));
  for(let i=1;i<keys.length;i++)assert.equal(pitch(keys[i])-pitch(keys[i-1]),1);
  const start=keys.findIndex(n=>n.replace(/\d$/,"")===root[1]),middle=start+Number(steps[1]),last=middle+Number(steps[2]);assert.ok(start>=0&&last<keys.length);
  return [keys[start],keys[middle],keys[last]];
 }
 async function note(note,keyboard){const key=page.locator(".key[data-note='"+note+"']");if(keyboard){const shortcut=await key.getAttribute("aria-keyshortcuts");assert.ok(shortcut);await page.keyboard.press(shortcut);}else await native(key);}
 async function chordRound(keyboard,count){
  await native(page.locator("[data-mode='chords']"));assert.equal(await page.locator("#big-note").innerText(),"D major");
  const notes=await derive();await preserve(count);
  await note(notes[0],keyboard);assert.equal(await page.locator(".key.held").count(),1);await preserve(count);
  await note("F4",keyboard);assert.equal(await page.locator('.key[data-note="F4"]').evaluate(e=>e.classList.contains("held")),false);assert.match(await page.locator("#prompt-text").innerText(),/Not F/);await preserve(count);
  await note(notes[1],keyboard);assert.equal(await page.locator(".key.held").count(),2);await preserve(count);
  await note(notes[2],keyboard);assert.equal(await page.locator(".key.held").count(),3);assert.match(await page.locator("#big-note").innerText(),/D major.*🎉/);await preserve(count+1);
  await note(notes[2],keyboard);await preserve(count+1);
 }
 try{
  await page.goto(base+"/music-chord-fixture.html");
  await page.evaluate(({protectedBytes,saved})=>{localStorage.clear();for(const [k,v]of Object.entries(protectedBytes))localStorage.setItem(k,v);localStorage.setItem("music-lab.v1",JSON.stringify(saved));},{protectedBytes,saved:fixture()});
  await page.goto(base+"/games/music-lab/");await page.locator("#piano .key").first().waitFor();assert.equal(await page.locator(".key.white").count(),10);assert.equal(await page.locator(".key.black").count(),7);
  await chordRound(!options.hasTouch,7);
  if(!options.hasTouch){await native(page.locator("[data-mode='free']"));await chordRound(false,8);}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,"fits device");assert.deepEqual(errors,[]);
  console.log("Music chord "+label+": native "+(options.hasTouch?"touch":"keyboard and pointer")+", public adjacent-key recipe completes D major, F4 rejected, one credit/history/exact unrelated bytes preserved; controlled RNG fixture.");
 }finally{await context.close();}
}
(async()=>{
 const s=await server();let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||"/usr/bin/chromium",headless:true,args:["--no-sandbox"]});const base="http://127.0.0.1:"+s.address().port;
  for(const [label,options]of[["Desktop",{viewport:{width:1280,height:800}}],["iPad",{viewport:{width:820,height:1180},isMobile:true,hasTouch:true}],["iPhone",{viewport:{width:390,height:844},isMobile:true,hasTouch:true}]])await check(browser,base,label,options);
 }finally{if(browser)await browser.close();await new Promise(resolve=>s.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
