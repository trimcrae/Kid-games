// Real pointer-lock mouse look in a real browser: the lock has to be granted
// by a genuine click, relative motion has to turn the view past a full circle,
// fast flicks have to count in full, pitch has to stay clamped, menu clicks must
// not capture, Escape has to release cleanly and re-entry has to work. A host
// that cannot lock has to say so and stay playable. The live pets' drawn sizes
// are read back from the same page.
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
// A host that withholds pointer lock, the way an in-app browser or a sandboxed
// embed does. (A plain same-origin iframe, as on GitHub Pages, does grant it —
// only a sandbox without allow-pointer-lock refuses.)
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
async function houseFrame(page,url){
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  // A saved pet, so "Come play at home" walks straight in instead of opening
  // the adoption panel.
  await page.addInitScript(()=>{
    localStorage.setItem('craepets.house.who','tristan');
    localStorage.setItem('craepets.house.v1.tristan',JSON.stringify({v:1,pet:{name:'Test',species:'craepet',colour:'blue',egg:false},coins:20}));
  });
  await page.goto(url);
  const target=page.frames().find(f=>f.url().includes('/house-test/'))||page.mainFrame();
  await target.waitForFunction(()=>window.houseTest&&!document.getElementById('start').disabled,null,{timeout:120000});
  return {target,errors};
}
const state=target=>target.evaluate(()=>window.houseTest.state);

let browser;
try{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});

  // 1. Ordinary desktop hosting.
  const page=await browser.newPage({viewport:{width:1100,height:760}});
  const {target,errors}=await houseFrame(page,origin+'/house-test/');
  await page.click('#start');
  // The lock lands before Chrome dispatches pointerlockchange; wait until the
  // page has handled it (a page that never hides the cursor still times out).
  await target.waitForFunction(()=>window.houseTest.state.mouseLocked&&document.body.classList.contains('mouse-look'),null,{timeout:10000});
  assert.equal(await page.evaluate(()=>document.pointerLockElement?.id),'view','Pointer lock is not held by the canvas');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.getElementById('view')).cursor),'none','Cursor still visible while captured');
  // Third-person view: no aiming dot over the pet while captured.
  assert.equal(await page.evaluate(()=>getComputedStyle(document.getElementById('crosshair')).display),'none');

  // Relative motion in one direction keeps turning: over a full circle without
  // the cursor ever leaving the window.
  const before=await state(target);
  await page.mouse.move(80,380);
  for(let x=80;x<=4000;x+=160)await page.mouse.move(x,380,{steps:1});
  let after=await state(target);
  const swept=Math.abs(after.turned-before.turned);
  assert(swept>TAU,`Locked mouse turned only ${(swept*57.3).toFixed(0)}°, not a full circle`);
  assert(after.yaw>=-Math.PI&&after.yaw<=Math.PI,'Yaw did not stay wrapped');
  assert(after.mouseLocked&&!after.mouseLockDenied);

  // A fast flick counts in full: each report turns in proportion to its size,
  // with nothing clipped off the top.
  let x=4000;await page.mouse.move(x,380,{steps:1});
  for(const dx of [600,1800]){
    const from=(await state(target)).turned;
    x+=dx;await page.mouse.move(x,380,{steps:1});
    const got=(await state(target)).turned-from;
    assert(Math.abs(got-dx*.0024)<dx*.0024*.02,`A ${dx}px report turned ${got.toFixed(3)} rad, expected ${(dx*.0024).toFixed(3)}`);
  }

  // Pitch stays clamped however far the mouse travels vertically.
  for(let i=0;i<30;i++)await page.mouse.move(550,20+((i%2)?0:700),{steps:1});
  after=await state(target);
  assert(after.pitch>=-.81&&after.pitch<=.43,'Pitch escaped its clamp: '+after.pitch);

  // Escape releases the mouse and parks the house.
  await page.keyboard.press('Escape');
  await target.waitForFunction(()=>!window.houseTest.state.mouseLocked&&!document.getElementById('welcome').hidden,null,{timeout:10000});
  assert.equal(await page.evaluate(()=>document.pointerLockElement),null);

  // Clicking through menus never grabs the mouse.
  await page.click('#welcome-rooms');
  await page.click('#rooms > p');
  await page.waitForTimeout(300);
  let menu=await state(target);
  assert(!menu.mouseLocked&&!menu.mouseLockDenied,'A menu click captured the mouse');
  await page.click('#close-rooms');
  // Back in the house a click on the view captures (again).
  await page.waitForTimeout(1600);
  if(!(await state(target)).mouseLocked)await page.mouse.click(550,380);
  await target.waitForFunction(()=>window.houseTest.state.mouseLocked,null,{timeout:10000});

  // Escape, then re-entry from the welcome card's button.
  await page.keyboard.press('Escape');
  await target.waitForFunction(()=>!window.houseTest.state.mouseLocked&&!document.getElementById('welcome').hidden,null,{timeout:10000});
  await page.click('#start');
  await target.waitForFunction(()=>window.houseTest.state.mouseLocked,null,{timeout:10000});
  assert.equal((await state(target)).mouseLockDenied,false);
  // Choosing an activity from a panel must leave the mouse free for it, even
  // though the click tidies other panels away on the way.
  await page.keyboard.press('KeyE');
  await page.locator('#choices-list button').first().click();
  await page.waitForTimeout(800);
  assert(!(await state(target)).mouseLocked&&!(await page.locator('#activity-panel').isHidden()),'Opening an activity captured the mouse');
  await page.click('#close-activity');
  await target.waitForFunction(()=>window.houseTest.state.mouseLocked,null,{timeout:10000});
  console.log('PASS pointer lock capture, %d° sweep, proportional fast flicks, pitch clamp, Escape release, menus, re-entry',Math.round(swept*57.3));

  // Pets are drawn at the shared house scale: yours and every companion.
  const pets=await state(target);
  assert(pets.avatarSize[1]>.45&&pets.avatarSize[1]<.62,'Controlled pet height '+pets.avatarSize[1]);
  assert(pets.roamers.length&&pets.roamers.every(r=>r.height>.3&&r.height<.85),'Companion heights '+pets.roamers.map(r=>r.height.toFixed(2)));
  console.log('PASS pet sizes: yours %sm, companions %s m',pets.avatarSize[1].toFixed(2),pets.roamers.map(r=>r.height.toFixed(2)).join('/'));
  assert.equal(errors.length,0,errors.map(m=>m.slice(0,600)).join('\n'));
  await page.close();

  // 2. A host that will not grant pointer lock: no pretending, still playable.
  const embedded=await browser.newPage({viewport:{width:1100,height:760}});
  const inner=await houseFrame(embedded,origin+'/embed');
  const box=await embedded.locator('#house').boundingBox();
  await embedded.frameLocator('#house').locator('#start').click();
  await inner.target.waitForFunction(()=>window.houseTest.state.mouseLockDenied,null,{timeout:15000});
  assert.equal((await state(inner.target)).mouseLocked,false,'Reported a lock the browser refused');
  const hint=await inner.target.textContent('#hint');
  assert.match(hint,/drag to look/i,'No usable fallback offered');
  assert.match(hint,/Chrome or Edge tab/,'Did not say where full mouse look works');
  const dragFrom=await state(inner.target);
  await embedded.mouse.move(box.x+700,box.y+380);
  await embedded.mouse.down();
  for(let x=700;x>200;x-=25)await embedded.mouse.move(box.x+x,box.y+380,{steps:1});
  await embedded.mouse.up();
  const dragged=await state(inner.target);
  assert(Math.abs(dragged.turned-dragFrom.turned)>.5,'Drag fallback did not turn the view');
  console.log('PASS refused pointer lock reported honestly, drag fallback turns %d°',Math.round(Math.abs(dragged.turned-dragFrom.turned)*57.3));
  await embedded.close();
}finally{
  await browser?.close();
  await new Promise(done=>server.close(done));
}
