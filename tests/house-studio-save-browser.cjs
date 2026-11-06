#!/usr/bin/env node
'use strict';
// Production studio dialog/modules in a small host: real DOM, browser storage,
// keyboard and touch. This does not replace the full-house walking smoke test.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path');
const {chromium}=require('playwright-core');
const ROOT=path.resolve(__dirname,'..'),KEY='craepets.house.master-kim.cory';
const initial={uniform:true,belt:'blue',signedIn:'2026-11-03'};
async function server(){
  const s=http.createServer(async(req,res)=>{
    try{
      const pathname=new URL(req.url,'http://localhost').pathname;
      if(pathname==='/fixture.html')return res.writeHead(200,{'Content-Type':'text/html'}).end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><link rel="stylesheet" href="/house-test/master-kim-ui.css"><button id="open">Visit studio</button><canvas></canvas>');
      const file=path.resolve(ROOT,'.'+decodeURIComponent(pathname));
      if(!file.startsWith(ROOT+path.sep))return res.writeHead(403).end();
      const body=await fs.readFile(file);
      res.writeHead(200,{'Content-Type':path.extname(file)==='.css'?'text/css':'text/javascript'}).end(body);
    }catch{res.writeHead(404).end();}
  });
  await new Promise((resolve,reject)=>{s.once('error',reject);s.listen(0,'127.0.0.1',resolve);});return s;
}
async function check(browser,base,mobile){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:800},hasTouch:mobile,isMobile:mobile});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const press=locator=>mobile?locator.tap():locator.click();
  try{
    await page.goto(base+'/fixture.html');
    await page.evaluate(async({key,initial})=>{
      const THREE=await import('/house-test/vendor/three.module.min.js');
      const {studioInteractions}=await import('/house-test/studio-interactions.mjs');
      const {createButtonBinder}=await import('/house-test/button-input.mjs');
      const bind=createButtonBinder(document),actions=new Map();
      const bindButton=(element,action)=>{actions.set(element,action);bind(element,action);};
      const actualGet=Storage.prototype.getItem,actualSet=Storage.prototype.setItem;
      window.fixture={pet:{name:'Studio Scout',species:'blorb'},profile:'cory',fault:null,refreshes:0,active:true};
      Storage.prototype.getItem=function(k){if(k===key&&fixture.fault==='read')throw Error('Read unavailable');return actualGet.call(this,k);};
      Storage.prototype.setItem=function(k,v){if(k===key&&fixture.fault==='write')throw Error('Storage full');return actualSet.call(this,k,v);};
      localStorage.setItem(key,JSON.stringify(initial));
      localStorage.setItem('craepets.house.master-kim.ellie','unrelated studio bytes');
      localStorage.setItem('craepets.v1.cory','original valley bytes');
      localStorage.setItem('craepets.house.v1.cory','original house bytes');
      const list=[],tour={get active(){return fixture.active;},suspend(){fixture.active=false;},resume(){fixture.active=true;}};
      studioInteractions({scene:new THREE.Scene(),world:{addBoxes(){}},player:{x:43.45,y:-.82,z:21.95},
        life:{pet:()=>fixture.pet,profile:()=>fixture.profile,refreshUniform(){fixture.refreshes++;},refreshDirections(){},say(){}},
        tour,list,ticking:[],reducedMotion:true,bindButton,
        masterKim:{connectDoors:()=>[],doorMeshes:new Map()},renderer:{domElement:document.querySelector('canvas')},debug:{}});
      bindButton(document.querySelector('#open'),()=>list.find(x=>x.id==='kim-signin').start());
      fixture.raw=()=>actualGet.call(localStorage,key);
      fixture.chooseBlack=()=>actions.get(document.querySelector('[data-belt=black]'))();
    },{key:KEY,initial});
    const raw=()=>page.evaluate(()=>fixture.raw());
    await press(page.locator('#open'));
    assert.equal(await page.evaluate(()=>fixture.active),false);
    assert.equal(await page.locator('[data-belt=blue]').getAttribute('aria-pressed'),'true');

    for(const fault of ['read','write']){
      await page.evaluate(fault=>{fixture.fault=fault;},fault);
      const before=await raw();await press(page.locator('[data-belt=red]'));
      assert.match(await page.locator('#kim-attendance').innerText(),/not changed/);
      assert.equal(await raw(),before);assert.equal(await page.evaluate(()=>fixture.refreshes),0);
      assert.equal(await page.locator('[data-belt=blue]').getAttribute('aria-pressed'),'true');
      await page.evaluate(()=>{fixture.fault=null;});
    }
    await press(page.locator('[data-belt=red]'));
    assert.deepEqual(JSON.parse(await raw()),{...initial,belt:'red'});
    assert.equal(await page.locator('[data-belt=red]').getAttribute('aria-pressed'),'true');
    await press(page.locator('#kim-check-in'));
    assert.match(await page.locator('#kim-attendance').innerText(),/signed in for today/);
    const signed=JSON.parse(await raw());assert.equal(signed.uniform,true);assert.equal(signed.belt,'red');
    await press(page.locator('#kim-wear'));assert.equal(JSON.parse(await raw()).uniform,false);

    // Native dismissal and reopening preserve focus and the saved selection.
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#kim-signin').evaluate(d=>d.open),false);
    assert.equal(await page.evaluate(()=>fixture.active),true);
    assert.equal(await page.evaluate(()=>document.activeElement.id),'open');
    await press(page.locator('#open'));assert.equal(await page.locator('[data-belt=red]').getAttribute('aria-pressed'),'true');
    await press(page.locator('#kim-done'));
    for(const pet of [{name:'Egg Scout',egg:true},null]){
      await page.evaluate(pet=>{fixture.pet=pet;},pet);await press(page.locator('#open'));
      assert.equal(await page.locator('#kim-check-in').isDisabled(),true);
      assert.equal(await page.locator('#kim-wear').isDisabled(),true);
      assert.equal(await page.locator('#kim-belts button:disabled').count(),6);
      const before=await raw();
      // The real binder rejects disabled events, and the action itself also
      // guards against a callback queued before the pet changed.
      await page.locator('[data-belt=black]').dispatchEvent('click');assert.equal(await raw(),before);
      await page.evaluate(()=>fixture.chooseBlack());assert.equal(await raw(),before);
      await press(page.locator('.kim-close'));assert.equal(await page.evaluate(()=>fixture.active),true);
    }
    await page.evaluate(key=>{fixture.pet={name:'Studio Scout'};localStorage.setItem(key,'{ damaged original');},KEY);
    await press(page.locator('#open'));await press(page.locator('#kim-check-in'));
    assert.match(await page.locator('#kim-attendance').innerText(),/not changed/);
    assert.equal(await raw(),'{ damaged original');
    await press(page.locator('#kim-done'));
    assert.deepEqual(await page.evaluate(()=>['craepets.house.master-kim.ellie','craepets.v1.cory','craepets.house.v1.cory'].map(k=>localStorage.getItem(k))),['unrelated studio bytes','original valley bytes','original house bytes']);
    assert.deepEqual(errors,[]);
    console.log('PASS studio dialog '+(mobile?'phone':'desktop')+': native controls, failed read/write, retry, dismissal/focus, eggs, damaged data and family isolation');
  }finally{await context.close();}
}
(async()=>{const s=await server();let browser;try{browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const base='http://127.0.0.1:'+s.address().port;for(const mobile of [false,true])await check(browser,base,mobile);}finally{if(browser)await browser.close();await new Promise(resolve=>s.close(resolve));}})().catch(e=>{console.error(e);process.exitCode=1;});
