// Comfortable controls (September 15): "tons of drift and not intuitive".
// - Keys only: chosen on the welcome card and remembered; ↑/W walk, ↓/S back
//   up, ←/→ (A/D) turn a full circle and stop the moment the key is let go;
//   no mouse capture, not even on a click; E/R/F/C and activities still work.
// - Mouse look: the captured mouse turns by its relative movement, scaled by
//   the look-speed choice; ←/→ turn, A side-steps.
// - Where capture is refused, dragging turns once per movement, and a drag
//   whose release was missed, or cut by a lost window, never turns the view
//   as the mouse merely moves (the drift measured on 3d3ec14).
// - Touch: the pad walks, and a lost window stops it.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.HOUSE_BASE||'http://127.0.0.1:8765';
const deg=r=>r*180/Math.PI;
const S=page=>page.evaluate(()=>{const s=houseTest.state;return {yaw:s.yaw,pitch:s.pitch,x:s.position.x,z:s.position.z,locked:s.mouseLocked,active:s.active};});
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
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
      await ctx.close();}
    const fresh=async(opts={},init)=>{const ctx=await browser.newContext({viewport:{width:1280,height:800},...opts});
      await ctx.addInitScript(s=>{if(!sessionStorage.getItem('seeded')){for(const [k,v] of Object.entries(s))localStorage.setItem(k,v);sessionStorage.setItem('seeded','1');}},saved);
      if(init)await ctx.addInitScript(init);const page=await ctx.newPage();watch(page);return {ctx,page};};

    // 1. Keys only.
    {const {ctx,page}=await fresh();
      await page.goto(base+'/house-test/');await startHouse(page);
      assert(await page.locator('.mouse-steer').isVisible()&&await page.locator('.keys-steer').isHidden(),'Mouse look is not the default');
      await page.locator('#welcome [data-controls="keys"]').click();
      assert.equal(await page.locator('[data-controls="keys"]').getAttribute('aria-pressed'),'true');
      assert(await page.locator('.keys-steer').isVisible()&&await page.locator('.mouse-steer').isHidden(),'Keys-only instructions not shown before starting');
      assert.match(await page.locator('.keys-steer').textContent(),/walk forward[\s\S]*back up[\s\S]*turn/);
      assert.equal(JSON.parse(await page.evaluate(()=>localStorage.getItem('craepets.house.controls'))).mode,'keys');
      await page.locator('#start').click();await page.waitForTimeout(500);
      let s=await S(page);assert(s.active&&!s.locked,'Keys only captured the mouse or did not start');
      await page.mouse.click(640,420);await page.waitForTimeout(300);
      assert(!(await S(page)).locked,'A click captured the mouse in keys-only mode');
      await jump(page,'Living room');
      // A full circle to the left, then to the right, turning on the spot.
      const p0=await S(page);
      const left=await turnWhileHeld(page,'ArrowLeft',3600);
      const right=await turnWhileHeld(page,'ArrowRight',3600);
      const p1=await S(page);
      assert(deg(left)>=360&&deg(-right)>=360,`Keys did not turn a full circle: ${deg(left).toFixed(0)}° / ${deg(-right).toFixed(0)}°`);
      assert(Math.hypot(p1.x-p0.x,p1.z-p0.z)<.05,'Turning moved the pet');
      // Let go: no drift. A tap: a small turn.
      const r0=await S(page);await page.waitForTimeout(600);const r1=await S(page);
      assert(Math.abs(deg(wrap(r1.yaw-r0.yaw)))<.2,'The view kept turning after the key was let go');
      const t0=await S(page);await hold(page,'ArrowLeft',60);await page.waitForTimeout(200);const t1=await S(page);
      const tap=deg(wrap(t1.yaw-t0.yaw));assert(tap>0&&tap<8,`A tap turned ${tap.toFixed(1)}°`);
      // A and D turn too (no side-step).
      const a0=await S(page);const aTurn=await turnWhileHeld(page,'KeyA',500);const a1=await S(page);
      assert(deg(aTurn)>20&&Math.hypot(a1.x-a0.x,a1.z-a0.z)<.05,'A did not turn on the spot in keys-only mode');
      // Equivalent keys count once (← with A is no faster), and opposites cancel.
      const one=await turnWhileHeld(page,'ArrowLeft',800);await page.waitForTimeout(150);
      await page.keyboard.down('KeyA');const both=await turnWhileHeld(page,'ArrowLeft',800);await page.keyboard.up('KeyA');await page.waitForTimeout(150);
      assert(Math.abs(both/one-1)<.15,`← with A turned ${(both/one).toFixed(2)}× as fast as ← alone`);
      const still=async(k1,k2)=>{await page.keyboard.down(k1);await page.keyboard.down(k2);await page.waitForTimeout(120);const x=await S(page);await page.waitForTimeout(500);const y=await S(page);
        await page.keyboard.up(k1);await page.keyboard.up(k2);await page.waitForTimeout(150);return deg(wrap(y.yaw-x.yaw));};
      const lr=await still('ArrowLeft','ArrowRight'),ld=await still('ArrowLeft','KeyD');
      assert(Math.abs(lr)<.5&&Math.abs(ld)<.5,`Opposite turn keys did not cancel (← → ${lr.toFixed(1)}°, ← D ${ld.toFixed(1)}°)`);
      // ↑ walks the way the view faces and stops on release; ↓ backs up.
      const w0=await S(page);await hold(page,'ArrowUp',700);const w1=await S(page);await page.waitForTimeout(400);const w2=await S(page);
      const fwd=(w1.x-w0.x)*-Math.sin(w0.yaw)+(w1.z-w0.z)*-Math.cos(w0.yaw);
      assert(fwd>.6,`↑ did not walk forward (${fwd.toFixed(2)} m)`);
      assert(Math.hypot(w2.x-w1.x,w2.z-w1.z)<.06,'The pet slid on after ↑ was let go');
      const b0=await S(page);await hold(page,'ArrowDown',500);const b1=await S(page);
      const back=(b1.x-b0.x)*-Math.sin(b0.yaw)+(b1.z-b0.z)*-Math.cos(b0.yaw);
      assert(back<-.3,`↓ did not back up (${back.toFixed(2)} m)`);
      // R, F and C still open their panels; Escape brings you back.
      await page.keyboard.press('KeyR');assert(await page.locator('#rooms').isVisible());await page.keyboard.press('Escape');
      await page.keyboard.press('KeyF');await page.locator('#family-panel').waitFor();await page.keyboard.press('Escape');await page.locator('#family-panel').waitFor({state:'hidden'});
      // Pause shows the same choice and the keys-only instructions.
      await page.keyboard.press('Escape');await page.locator('#welcome[data-mode="pause"]').waitFor();
      assert(await page.locator('#welcome .control-mode').isVisible()&&await page.locator('.keys-steer').isVisible(),'Paused card lacks the controls');
      await page.locator('#start').click();await page.waitForTimeout(300);
      // E opens an activity; while it is open the arrow keys stay with it (the pet stays put).
      await jump(page,'Kitchen');
      await page.keyboard.press('KeyE');await page.waitForTimeout(700);
      if(await page.locator('#activity-choices').isVisible())await page.locator('#choices-list button').first().click();
      await page.locator('#activity-panel').waitFor();
      const e0=await S(page);await hold(page,'ArrowUp',400);const e1=await S(page);
      assert(Math.hypot(e1.x-e0.x,e1.z-e0.z)<.01&&!e1.active,'Keys moved the pet behind an open activity');
      await page.locator('#close-activity').click();await page.waitForTimeout(400);
      // Remembered after a reload.
      await page.reload();await startHouse(page);
      assert(await page.evaluate(()=>document.body.classList.contains('keys-only'))&&await page.locator('.keys-steer').isVisible(),'Keys only was not remembered');
      results.keysOnly={fullLeftDeg:+deg(left).toFixed(0),fullRightDeg:+deg(-right).toFixed(0),tapDeg:+tap.toFixed(1),forwardM:+fwd.toFixed(2),backM:+back.toFixed(2),
        leftWithARatio:+(both/one).toFixed(2),leftRightDeg:+lr.toFixed(2),leftDDeg:+ld.toFixed(2)};
      await ctx.close();}

    // 2. Mouse look with a captured mouse: relative movement, scaled by look speed; ← → turn; A side-steps.
    {const {ctx,page}=await fresh();
      await page.goto(base+'/house-test/');await startHouse(page);
      await page.locator('#start').click();await page.waitForFunction(()=>houseTest.state.mouseLocked,{},{timeout:10000});
      await jump(page,'Living room');if(!(await S(page)).locked){await page.mouse.click(640,420);await page.waitForFunction(()=>houseTest.state.mouseLocked,{},{timeout:10000});}
      // A move 100 px right from a known spot: the view turns right by the distance moved.
      const right100=async()=>{await page.mouse.move(640,420);await page.waitForTimeout(120);const a=await S(page);
        await page.mouse.move(740,420,{steps:4});await page.waitForTimeout(150);const b=await S(page);return deg(wrap(a.yaw-b.yaw));};
      const normal=await right100();
      await page.keyboard.press('Escape');await page.locator('#welcome[data-mode="pause"]').waitFor();
      await page.locator('[data-look="slow"]').click();await page.locator('#start').click();await page.waitForFunction(()=>houseTest.state.mouseLocked,{},{timeout:10000});
      const slow=await right100();
      assert(Math.abs(normal-100*.0024*180/Math.PI)<1.5,`100 px of mouse movement turned ${normal.toFixed(1)}° (expected ~13.8°)`);
      assert(normal>5&&slow>0&&Math.abs(slow/normal-.55)<.12,`Look speed not applied: normal ${normal.toFixed(1)}°, slow ${slow.toFixed(1)}°`);
      // ← turns, A side-steps.
      const k0=await S(page);const kTurn=await turnWhileHeld(page,'ArrowLeft',500);const k1=await S(page);
      assert(deg(kTurn)>20&&Math.hypot(k1.x-k0.x,k1.z-k0.z)<.05,'← did not turn with mouse look');
      const d0=await S(page);await hold(page,'KeyA',500);const d1=await S(page);
      assert(Math.abs(deg(wrap(d1.yaw-d0.yaw)))<1&&Math.hypot(d1.x-d0.x,d1.z-d0.z)>.3,'A did not side-step with mouse look');
      // Mouse look tilted to the floor, then Keys only (which has no tilt key): the view levels out.
      await page.mouse.move(640,420);await page.mouse.move(640,1420,{steps:10});await page.waitForTimeout(150);
      const tilted=(await S(page)).pitch;
      assert(tilted<-.6,`Could not tilt the view down with the mouse (${tilted.toFixed(2)})`);
      await page.keyboard.press('Escape');await page.locator('#welcome[data-mode="pause"]').waitFor();
      await page.locator('#welcome [data-controls="keys"]').click();
      const levelled=(await S(page)).pitch;
      assert(Math.abs(levelled+.18)<.001,`Switching to Keys only left the view tilted at ${levelled.toFixed(2)}`);
      await page.locator('#start').click();await page.waitForTimeout(300);
      const q0=await S(page);await hold(page,'ArrowUp',500);const q1=await S(page);
      assert(!q1.locked&&Math.hypot(q1.x-q0.x,q1.z-q0.z)>.3&&Math.abs(q1.pitch+.18)<.001,'Keys only after a tilted mouse look did not walk level');
      results.mouseLook={normalDegPer100px:+normal.toFixed(1),slowDegPer100px:+slow.toFixed(1),tiltedPitch:+tilted.toFixed(2),pitchAfterKeysOnly:+levelled.toFixed(2)};
      await page.keyboard.press('Escape');await ctx.close();}

    // 3. Capture refused (as in some in-app browsers): a drag turns once; missed releases and lost windows never drift.
    {const {ctx,page}=await fresh({},()=>{Element.prototype.requestPointerLock=function(){setTimeout(()=>document.dispatchEvent(new Event('pointerlockerror')),0);return Promise.reject(new DOMException('denied','NotAllowedError'));};});
      await page.goto(base+'/house-test/');await startHouse(page);await page.locator('#start').click();await page.waitForTimeout(400);
      const cdp=await ctx.newCDPSession(page);
      const mouse=(type,x,y,buttons=0,button='none')=>cdp.send('Input.dispatchMouseEvent',{type,x,y,buttons,button,clickCount:type==='mouseMoved'?0:1});
      const a=await S(page);await mouse('mousePressed',640,420,1,'left');for(let i=1;i<=5;i++)await mouse('mouseMoved',640+i*20,420,1,'left');
      const b=await S(page);
      const drag=deg(wrap(a.yaw-b.yaw));
      assert(Math.abs(drag-100*.0024*180/Math.PI)<1.5,`A 100 px drag turned ${drag.toFixed(1)}° (expected one input, ~13.8°)`);
      for(let i=1;i<=10;i++)await mouse('mouseMoved',740+i*20,420,0);            // the release was missed
      const c=await S(page);const lost=deg(wrap(b.yaw-c.yaw));
      assert(Math.abs(lost)<.1,`Moving the mouse after a missed release turned the view ${lost.toFixed(1)}°`);
      await mouse('mouseReleased',940,420,0,'left');
      await mouse('mousePressed',640,420,1,'left');await mouse('mouseMoved',660,420,1,'left');
      await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
      const d=await S(page);for(let i=1;i<=5;i++)await mouse('mouseMoved',660+i*20,420,1,'left');const e=await S(page);
      const blurred=deg(wrap(d.yaw-e.yaw));
      assert(Math.abs(blurred)<.1,`The drag carried on after the window was lost (${blurred.toFixed(1)}°)`);
      await mouse('mouseReleased',760,420,0,'left');
      // A key held when the window is lost does not keep walking.
      await page.keyboard.down('KeyW');await page.waitForTimeout(300);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
      const w0=await S(page);await page.waitForTimeout(500);const w1=await S(page);await page.keyboard.up('KeyW');
      assert(Math.hypot(w1.x-w0.x,w1.z-w0.z)<.06,'A key held over a lost window kept walking');
      assert.match(await page.locator('#hint').textContent(),/drag to look[\s\S]*Keys only/i,'The refused-capture hint does not offer Keys only');
      results.refusedCapture={dragDeg:+drag.toFixed(1),afterMissedReleaseDeg:+lost.toFixed(2),afterBlurDeg:+blurred.toFixed(2)};
      await ctx.close();}

    // 4. Touch: the pad walks; a lost window stops it.
    {const {ctx,page}=await fresh({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
      await page.goto(base+'/house-test/');await startHouse(page);await page.locator('#start').tap();await page.waitForTimeout(400);
      await jump(page,'Living room');
      const cdp=await ctx.newCDPSession(page);
      const touch=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1}]});
      const t0=await S(page);await touch('touchStart',90,700);for(let i=1;i<=4;i++)await touch('touchMove',90,700-i*10);
      await page.waitForTimeout(600);const t1=await S(page);
      assert(Math.hypot(t1.x-t0.x,t1.z-t0.z)>.3,'The touch pad did not walk');
      await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
      const t2=await S(page);await page.waitForTimeout(500);const t3=await S(page);
      assert(Math.hypot(t3.x-t2.x,t3.z-t2.z)<.06,'The pad kept walking after the window was lost');
      await touch('touchEnd');
      results.touch={walkedM:+Math.hypot(t1.x-t0.x,t1.z-t0.z).toFixed(2)};
      await ctx.close();}

    assert.deepEqual(errors,[]);
    console.log('PASS controls: keys-only turning/walking/stop/interaction/remembered; mouse look relative + look speed; ← → turn, A side-steps; refused capture drags once and never drifts; blur stops keys, drags and the pad');
    console.log(JSON.stringify(results));
  }catch(e){console.error(e);console.log('ERRORS',errors);process.exitCode=1;}
  finally{await browser.close();}
})();
