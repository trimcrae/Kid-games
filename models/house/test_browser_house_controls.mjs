// Desktop steering in a real browser is the arrow keys only (September 15):
// ↑/↓ walk, ←/→ turn past a full circle. The mouse is for buttons and panels
// and never steers: no pointer capture on Start or on a click, and moving or
// dragging it over the view turns nothing. Escape pauses, menus and activities
// work, and a sandboxed embed (which would refuse a mouse capture anyway)
// steers just the same. The live pets' drawn sizes are read back from the
// same page.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../../',import.meta.url));
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json'};
// A host that withholds pointer lock, the way an in-app browser or a sandboxed embed does.
const embed='<!doctype html><meta charset="utf-8"><title>Embedded</title><style>html,body,iframe{margin:0;border:0;width:100%;height:100%}</style><iframe id="house" sandbox="allow-scripts allow-same-origin" src="/house-test/"></iframe>';

const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://local');
    if(url.pathname==='/embed'){res.setHeader('Content-Type','text/html');res.end(embed);return;}
    let path=resolve(root,'.'+url.pathname);
    if(url.pathname.endsWith('/'))path=resolve(path,'index.html');
    if(!path.startsWith(resolve(root)+sep)){res.writeHead(403).end();return;}
    const bytes=await readFile(path);
    res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');res.end(bytes);
  }catch{res.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin='http://127.0.0.1:'+server.address().port;

const TAU=Math.PI*2;
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
async function houseFrame(page,url){
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  // A saved pet, so "Come play at home" walks straight in instead of opening
  // the adoption panel — and an old mouse-look preference, which must not
  // bring mouse steering back.
  await page.addInitScript(()=>{
    localStorage.setItem('craepets.house.who','tristan');
    localStorage.setItem('craepets.house.v1.tristan',JSON.stringify({v:1,pet:{name:'Test',species:'craepet',colour:'blue',egg:false},coins:20}));
    // Another family pet, so there is a companion to measure.
    localStorage.setItem('craepets.house.v1.shannon',JSON.stringify({v:1,pet:{name:'Pal',species:'blorb',colour:'berry',egg:false},coins:5}));
    localStorage.setItem('craepets.house.controls',JSON.stringify({mode:'mouse',look:'fast'}));
  });
  await page.goto(url);
  const target=page.frames().find(f=>f.url().includes('/house-test/'))||page.mainFrame();
  await target.waitForFunction(()=>window.houseTest&&!document.getElementById('start').disabled,null,{timeout:120000});
  return {target,errors};
}
const state=target=>target.evaluate(()=>window.houseTest.state);
// Total signed turn while a key is held, sampled so a full circle counts in full.
async function turnWhileHeld(page,target,key,ms){let total=0,prev=(await state(target)).yaw;await page.keyboard.down(key);const end=Date.now()+ms;
  while(Date.now()<end){await page.waitForTimeout(80);const y=(await state(target)).yaw;total+=wrap(y-prev);prev=y;}await page.keyboard.up(key);return total;}

let browser;
try{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});

  // 1. Ordinary desktop hosting.
  const page=await browser.newPage({viewport:{width:1100,height:760}});
  const {target,errors}=await houseFrame(page,origin+'/house-test/');
  assert.equal(await page.locator('[data-controls],[data-look]').count(),0,'A mouse-steering choice is still offered');
  assert.match(await page.locator('.instructions').textContent(),/walk forward[\s\S]*back up[\s\S]*turn/,'Arrow instructions missing');
  await page.click('#start');await page.waitForTimeout(500);
  assert.equal(await page.evaluate(()=>document.pointerLockElement),null,'Start captured the mouse');
  // The mouse moving, clicking or dragging over the view turns nothing.
  const still=await state(target);
  await page.mouse.move(100,380);for(let x=100;x<=1000;x+=150)await page.mouse.move(x,380,{steps:1});
  await page.mouse.click(550,380);await page.mouse.down();for(let x=550;x>150;x-=50)await page.mouse.move(x,300,{steps:1});await page.mouse.up();
  await page.waitForTimeout(200);
  let after=await state(target);
  assert.equal(await page.evaluate(()=>document.pointerLockElement),null,'A click captured the mouse');
  assert(Math.abs(wrap(after.yaw-still.yaw))<1e-6&&Math.abs(after.pitch-still.pitch)<1e-6,'The mouse steered the view');
  assert.notEqual(await page.evaluate(()=>getComputedStyle(document.getElementById('view')).cursor),'none','The cursor was hidden');
  // The arrows turn a full circle, and don't tilt the view.
  const swept=await turnWhileHeld(page,target,'ArrowRight',3800);
  after=await state(target);
  assert(-swept>TAU,`The arrows turned only ${(-swept*57.3).toFixed(0)}°, not a full circle`);
  assert(after.yaw>=-Math.PI&&after.yaw<=Math.PI,'Yaw did not stay wrapped');
  assert(Math.abs(after.pitch-still.pitch)<1e-6,'Turning tilted the view');
  // Escape pauses; clicking through menus is fine; Start returns to walking.
  await page.keyboard.press('Escape');
  await target.waitForFunction(()=>!document.getElementById('welcome').hidden&&!window.houseTest.state.active,null,{timeout:10000});
  await page.click('#welcome-rooms');await page.click('#rooms > p');await page.waitForTimeout(300);
  await page.click('#close-rooms');await page.waitForTimeout(400);
  assert((await state(target)).active,'Closing Rooms did not return to walking');
  // An activity keeps the arrows while it is open; closing it walks on.
  await page.keyboard.press('KeyE');
  await page.locator('#choices-list button').first().click();
  await page.waitForTimeout(800);
  assert(!(await page.locator('#activity-panel').isHidden()),'E did not open an activity');
  const inAct=await state(target);await page.keyboard.down('ArrowUp');await page.waitForTimeout(400);await page.keyboard.up('ArrowUp');
  const stayed=await state(target);
  assert(Math.hypot(stayed.position.x-inAct.position.x,stayed.position.z-inAct.position.z)<.01,'The arrows walked the pet behind an open activity');
  await page.click('#close-activity');await page.waitForTimeout(400);
  const w0=await state(target);await page.keyboard.down('ArrowUp');await page.waitForTimeout(600);await page.keyboard.up('ArrowUp');const w1=await state(target);
  assert(Math.hypot(w1.position.x-w0.position.x,w1.position.z-w0.position.z)>.3,'↑ did not walk after the activity closed');
  console.log('PASS arrows-only desktop steering: no mouse capture or mouse steering, %d° arrow turn, level view, Escape, menus, activity keeps the arrows',Math.round(-swept*57.3));

  // Pets are drawn at the shared house scale: yours and every companion.
  const pets=await state(target);
  assert(pets.avatarSize[1]>.45&&pets.avatarSize[1]<.62,'Controlled pet height '+pets.avatarSize[1]);
  assert(pets.roamers.length&&pets.roamers.every(r=>r.height>.3&&r.height<.85),'Companion heights '+pets.roamers.map(r=>r.height.toFixed(2)));
  console.log('PASS pet sizes: yours %sm, companions %s m',pets.avatarSize[1].toFixed(2),pets.roamers.map(r=>r.height.toFixed(2)).join('/'));
  assert.equal(errors.length,0,errors.map(m=>m.slice(0,600)).join('\n'));
  await page.close();

  // 2. A sandboxed embed: the arrows steer just the same.
  const embedded=await browser.newPage({viewport:{width:1100,height:760}});
  const inner=await houseFrame(embedded,origin+'/embed');
  await embedded.frameLocator('#house').locator('#start').click();await embedded.waitForTimeout(400);
  const turned=await turnWhileHeld(embedded,inner.target,'ArrowLeft',800);
  assert(turned>.5,'The arrows did not steer inside an embed');
  console.log('PASS sandboxed embed steers with the arrows (%d°)',Math.round(turned*57.3));
  await embedded.close();
}finally{
  await browser?.close();
  await new Promise(done=>server.close(done));
}
