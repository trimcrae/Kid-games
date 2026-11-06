#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright-core');
const ROOT=path.resolve(__dirname,'..');
async function server(){
  const s=http.createServer(async(req,res)=>{
    try{
      if(req.url==='/fixture.html')return res.writeHead(200,{'Content-Type':'text/html'}).end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><style>
        body{margin:0;overflow:hidden}button{width:260px;height:70px;font:18px sans-serif;touch-action:manipulation}
        #primary{position:absolute;left:20px;top:80px;touch-action:none}#under,#cover{position:absolute;left:20px;top:180px}#cover{z-index:2}
        #scroll{position:absolute;left:20px;top:280px;height:220px;overflow:auto;width:280px}#scroll button{display:block;margin:0 0 10px}#count{position:absolute;top:520px}
        </style><button id="primary">Use control</button><button id="under">Underlying control</button><button id="cover">Close panel</button><div id="scroll"></div><output id="count"></output>`);
      const file=path.resolve(ROOT,'.'+new URL(req.url,'http://localhost').pathname);
      if(!file.startsWith(ROOT+path.sep))return res.writeHead(403).end();
      res.writeHead(200,{'Content-Type':'text/javascript'}).end(await fs.readFile(file));
    }catch{res.writeHead(404).end();}
  });
  await new Promise((resolve,reject)=>{s.once('error',reject);s.listen(0,'127.0.0.1',resolve);});return s;
}
async function check(browser,base,width){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.goto(base+'/fixture.html');
    await page.evaluate(async()=>{
      const {createButtonBinder}=await import('/house-test/button-input.mjs');
      const bind=createButtonBinder(document);window.counts={primary:0,under:0,cover:0,scroll:0};
      for(const id of ['primary','under','cover'])bind(document.getElementById(id),()=>{counts[id]++;document.querySelector('#count').textContent=JSON.stringify(counts);if(id==='cover')document.getElementById(id).hidden=true;});
      for(let i=0;i<20;i++){const b=document.createElement('button');b.textContent='Room '+i;bind(b,()=>counts.scroll++);document.querySelector('#scroll').append(b);}
    });
    const counts=()=>page.evaluate(()=>({...window.counts}));
    const cdp=await context.newCDPSession(page);
    const finger=(x,y,id=1)=>({x,y,id,radiusX:3,radiusY:3});
    const touch=(type,points=[])=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
    await page.locator('#primary').tap();assert.equal((await counts()).primary,1);
    await touch('touchStart',[finger(70,110)]);await touch('touchMove',[finger(130,110)]);await touch('touchMove',[finger(70,110)]);await touch('touchEnd');assert.equal((await counts()).primary,1,'Dragging out and back activated the control');
    await touch('touchStart',[finger(277,110)]);await touch('touchMove',[finger(284,110)]);await touch('touchEnd');assert.equal((await counts()).primary,1,'Releasing outside the edge activated the control');
    await touch('touchStart',[finger(70,110)]);await touch('touchCancel');assert.equal((await counts()).primary,1);
    await touch('touchStart',[finger(70,110),finger(100,110,2)]);await touch('touchEnd');assert.equal((await counts()).primary,2,'Two fingers must activate only once');
    await touch('touchStart',[finger(70,110)]);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await touch('touchEnd');assert.equal((await counts()).primary,2,'Window interruption retained a held touch');
    await touch('touchStart',[finger(70,110)]);await page.locator('#primary').evaluate(b=>{b.disabled=true;});await touch('touchEnd');assert.equal((await counts()).primary,2);await page.locator('#primary').evaluate(b=>{b.disabled=false;});
    await page.locator('#primary').tap();assert.equal((await counts()).primary,3,'Valid tap did not recover after interruption');

    // Dismissing a panel cannot activate the newly exposed HUD control.
    await page.locator('#cover').tap();assert.deepEqual(await counts(),{primary:3,under:0,cover:1,scroll:0});
    await page.locator('#under').tap();assert.equal((await counts()).under,1,'The next deliberate tap was lost');
    await page.waitForTimeout(500);
    await page.locator('#under').evaluate(b=>b.dispatchEvent(new PointerEvent('click',{bubbles:true,pointerType:'touch'})));assert.equal((await counts()).under,1,'Delayed touch click repeated the action');
    await page.locator('#primary').focus();await page.keyboard.press('Enter');await page.keyboard.press('Space');await page.locator('#primary').click();assert.equal((await counts()).primary,6,'Keyboard or mouse activation regressed');

    // A real scroll beginning on a room button must not choose that room.
    await touch('touchStart',[finger(130,460)]);await touch('touchMove',[finger(130,420)]);await touch('touchMove',[finger(130,360)]);await touch('touchEnd');
    assert.equal((await counts()).scroll,0);assert(await page.locator('#scroll').evaluate(e=>e.scrollTop>0),'Scroll gesture did not exercise scrolling');
    await page.locator('#scroll button').nth(4).tap();assert.equal((await counts()).scroll,1,'Room button failed after scrolling');
    assert.deepEqual(errors,[]);console.log('PASS '+width+'px native house touch controls: drag, edge release, cancel, multiple fingers, interruption, scrolling, keyboard/mouse and click-through protection');
  }finally{await context.close();}
}
(async()=>{
  const walkthrough=await fs.readFile(path.join(ROOT,'house-test/walkthrough.js'),'utf8');
  assert.match(walkthrough,/import \{createButtonBinder\} from '\.\/button-input\.mjs'/);assert.match(walkthrough,/const bindButton=createButtonBinder\(document\)/);
  const s=await server();let browser;
  try{browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true});const base='http://127.0.0.1:'+s.address().port;for(const width of [390,820])await check(browser,base,width);}
  finally{if(browser)await browser.close();await new Promise(resolve=>s.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
