// Arrow-key steering (September 15): "I like the movement with the arrows,
// just keep it to be only arrows."
// - ↑ walks forward, ↓ backs up, ←/→ turn a full circle and stop the moment
//   the key is let go; ← with → cancels. W/A/S/D do nothing any more.
// - The mouse never steers: no capture on Start or a click, and moving or
//   dragging over the view turns nothing — even with an old "mouse look"
//   preference saved. It still clicks every button and panel.
// - E/R/F/C/Escape work; an open activity keeps the keys; a lost window stops
//   a held key. Touch: the pad walks, a swipe turns, a lost window stops it.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.HOUSE_BASE||'http://127.0.0.1:8765';
const deg=r=>r*180/Math.PI;
const S=page=>page.evaluate(()=>{const s=houseTest.state;return {yaw:s.yaw,pitch:s.pitch,x:s.position.x,z:s.position.z,active:s.active};});
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const moved=(a,b)=>Math.hypot(b.x-a.x,b.z-a.z);
async function hold(page,key,ms){await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);}
// Total signed turn while a key is held, sampled so a full circle counts in full.
async function turnWhileHeld(page,key,ms){let total=0,prev=(await S(page)).yaw;await page.keyboard.down(key);const end=Date.now()+ms;
  while(Date.now()<end){await page.waitForTimeout(80);const y=(await S(page)).yaw;total+=wrap(y-prev);prev=y;}await page.keyboard.up(key);return total;}
async function startHouse(page){
  await page.waitForFunction(()=>window.houseTest?.state.ready,{},{timeout:90000});
  await page.frame({url:/activity.html/}).evaluate(()=>Craepets._events(false));
}
async function jump(page,room){await page.keyboard.press('KeyR');await page.locator(`[aria-label="Jump to ${room}"]`).click();await page.waitForTimeout(500);}
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const errors=[];const watch=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});};
  const results={};
  try{
    // A hatched pet for Cory in the house (standalone edition), copied into each fresh profile.
    let saved;
    {const ctx=await browser.newContext({viewport:{width:1280,height:800}}),page=await ctx.newPage();watch(page);
      await page.goto(base+'/house-test/');await startHouse(page);
      await page.locator('#start').click();await page.locator('[data-profile="cory"]').click();
      const f=page.frameLocator('#activity-frame');await f.locator('#pet-name').fill('Steady');await f.locator('#do-adopt').click();
      await f.locator('[data-tapegg]').click({clickCount:8,delay:120});await page.locator('#close-activity').click();await page.waitForTimeout(500);
      saved=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('craepets')).map(k=>[k,localStorage.getItem(k)])));
      // An old preference from the mouse-look days, which must not come back.
      saved['craepets.house.controls']=JSON.stringify({mode:'mouse',look:'fast'});
      await ctx.close();}
    const fresh=async(opts={})=>{const ctx=await browser.newContext({viewport:{width:1280,height:800},...opts});
      await ctx.addInitScript(s=>{if(!sessionStorage.getItem('seeded')){for(const [k,v] of Object.entries(s))localStorage.setItem(k,v);sessionStorage.setItem('seeded','1');}},saved);
      const page=await ctx.newPage();watch(page);return {ctx,page};};

    // 1. Arrows, and a mouse that never steers.
    {const {ctx,page}=await fresh();
      await page.goto(base+'/house-test/');await startHouse(page);
      assert.equal(await page.locator('[data-controls],[data-look]').count(),0,'A mouse-steering choice is still offered');
      assert.match(await page.locator('.instructions').textContent(),/walk forward[\s\S]*back up[\s\S]*turn/,'Arrow instructions missing before starting');
      await page.locator('#start').click();await page.waitForTimeout(500);
      assert(!(await page.evaluate(()=>document.pointerLockElement)),'Start captured the mouse');
      await jump(page,'Living room');
      const m0=await S(page);
      await page.mouse.move(200,420);await page.mouse.move(900,420,{steps:6});await page.mouse.click(640,420);
      await page.mouse.down();await page.mouse.move(300,300,{steps:6});await page.mouse.up();await page.waitForTimeout(200);
      const m1=await S(page);
      assert(!(await page.evaluate(()=>document.pointerLockElement)),'A click captured the mouse');
      assert(Math.abs(wrap(m1.yaw-m0.yaw))<1e-6&&Math.abs(m1.pitch-m0.pitch)<1e-6&&moved(m0,m1)<.01,'The mouse steered the view or the pet');
      // Full circles on the spot, level.
      const p0=await S(page);
      const left=await turnWhileHeld(page,'ArrowLeft',3600),right=await turnWhileHeld(page,'ArrowRight',3600);
      const p1=await S(page);
      assert(deg(left)>=360&&deg(-right)>=360,`The arrows did not turn a full circle: ${deg(left).toFixed(0)}° / ${deg(-right).toFixed(0)}°`);
      assert(moved(p0,p1)<.05&&Math.abs(p1.pitch-p0.pitch)<1e-6,'Turning moved the pet or tilted the view');
      // Let go: no drift. A tap: a small turn. ← with →: nothing.
      const r0=await S(page);await page.waitForTimeout(600);const r1=await S(page);
      assert(Math.abs(deg(wrap(r1.yaw-r0.yaw)))<.2,'The view kept turning after the key was let go');
      const t0=await S(page);await hold(page,'ArrowLeft',60);await page.waitForTimeout(200);const t1=await S(page);
      const tap=deg(wrap(t1.yaw-t0.yaw));assert(tap>0&&tap<8,`A tap turned ${tap.toFixed(1)}°`);
      await page.keyboard.down('ArrowLeft');await page.keyboard.down('ArrowRight');await page.waitForTimeout(120);const c0=await S(page);await page.waitForTimeout(500);const c1=await S(page);
      await page.keyboard.up('ArrowLeft');await page.keyboard.up('ArrowRight');
      assert(Math.abs(deg(wrap(c1.yaw-c0.yaw)))<.5,'← with → did not cancel');
      // W/A/S/D no longer walk or turn.
      const k0=await S(page);for(const k of ['KeyW','KeyA','KeyS','KeyD'])await hold(page,k,250);const k1=await S(page);
      assert(moved(k0,k1)<.02&&Math.abs(deg(wrap(k1.yaw-k0.yaw)))<.2,'W/A/S/D still steer');
      // ↑ walks the way the view faces and stops on release; ↓ backs up.
      const w0=await S(page);await hold(page,'ArrowUp',700);const w1=await S(page);await page.waitForTimeout(400);const w2=await S(page);
      const fwd=(w1.x-w0.x)*-Math.sin(w0.yaw)+(w1.z-w0.z)*-Math.cos(w0.yaw);
      assert(fwd>.6,`↑ did not walk forward (${fwd.toFixed(2)} m)`);
      assert(moved(w1,w2)<.06,'The pet slid on after ↑ was let go');
      const b0=await S(page);await hold(page,'ArrowDown',500);const b1=await S(page);
      const back=(b1.x-b0.x)*-Math.sin(b0.yaw)+(b1.z-b0.z)*-Math.cos(b0.yaw);
      assert(back<-.3,`↓ did not back up (${back.toFixed(2)} m)`);
      // R, F, C and Escape.
      await page.keyboard.press('KeyR');assert(await page.locator('#rooms').isVisible());await page.keyboard.press('Escape');
      await page.keyboard.press('KeyF');await page.locator('#family-panel').waitFor();await page.keyboard.press('Escape');await page.locator('#family-panel').waitFor({state:'hidden'});
      await page.keyboard.press('KeyC');await page.waitForTimeout(300);
      // Pause shows the arrow instructions.
      await page.keyboard.press('Escape');await page.locator('#welcome[data-mode="pause"]').waitFor();
      assert(await page.locator('#welcome .instructions').isVisible(),'The paused card lacks the controls');
      await page.locator('#start').click();await page.waitForTimeout(300);
      // E opens an activity; while it is open the arrows stay with it.
      await jump(page,'Kitchen');
      await page.keyboard.press('KeyE');await page.waitForTimeout(700);
      if(await page.locator('#activity-choices').isVisible())await page.locator('#choices-list button').first().click();
      await page.locator('#activity-panel').waitFor();
      const e0=await S(page);await hold(page,'ArrowUp',400);const e1=await S(page);
      assert(moved(e0,e1)<.01&&!e1.active,'The arrows moved the pet behind an open activity');
      await page.locator('#close-activity').click();await page.waitForTimeout(400);
      // A key held when the window is lost does not keep walking.
      await page.keyboard.down('ArrowUp');await page.waitForTimeout(300);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
      const l0=await S(page);await page.waitForTimeout(500);const l1=await S(page);await page.keyboard.up('ArrowUp');
      assert(moved(l0,l1)<.06,'A key held over a lost window kept walking');
      results.arrows={fullLeftDeg:+deg(left).toFixed(0),fullRightDeg:+deg(-right).toFixed(0),tapDeg:+tap.toFixed(1),forwardM:+fwd.toFixed(2),backM:+back.toFixed(2)};
      await ctx.close();}

    // 2. Touch: the pad walks, a swipe turns, a lost window stops the pad.
    {const {ctx,page}=await fresh({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
      await page.goto(base+'/house-test/');await startHouse(page);await page.locator('#start').tap();await page.waitForTimeout(400);
      await jump(page,'Living room');
      const cdp=await ctx.newCDPSession(page);
      const touch=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1}]});
      const t0=await S(page);await touch('touchStart',90,700);for(let i=1;i<=4;i++)await touch('touchMove',90,700-i*10);
      await page.waitForTimeout(600);const t1=await S(page);
      assert(moved(t0,t1)>.3,'The touch pad did not walk');
      await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
      const t2=await S(page);await page.waitForTimeout(500);const t3=await S(page);
      assert(moved(t2,t3)<.06,'The pad kept walking after the window was lost');
      await touch('touchEnd');
      const s0=await S(page);await touch('touchStart',300,300);for(let i=1;i<=5;i++)await touch('touchMove',300-i*10,300);await touch('touchEnd');const s1=await S(page);
      assert(Math.abs(deg(wrap(s1.yaw-s0.yaw)))>5,'A swipe did not turn the view');
      results.touch={walkedM:+moved(t0,t1).toFixed(2),swipeDeg:+deg(wrap(s1.yaw-s0.yaw)).toFixed(1)};
      await ctx.close();}

    assert.deepEqual(errors,[]);
    console.log('PASS arrows: full turns, taps, no drift, ↑/↓, ← → cancel, WASD and the mouse never steer (old preference ignored), E/R/F/C/Escape, activity keeps the keys, blur stops; touch pad and swipe');
    console.log(JSON.stringify(results));
  }catch(e){console.error(e);console.log('ERRORS',errors);process.exitCode=1;}
  finally{await browser.close();}
})();
