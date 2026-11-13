const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.HOUSE_BASE||'http://127.0.0.1:8765';

// This gameplay suite verifies DOM activities; the separate weather/WebGL
// suite renders the complete worlds. Keep a still 3D backdrop during menus and
// the desktop activity tour, permitting a real frame after each room jump, so
// software rendering cannot starve the real iframe input and game assertions.
// Only the named top-window scene loop is deferred, after startup is complete.
function pauseBackdropDuringMenus(){
  if(window!==window.top)return;
  const nativeRAF=window.requestAnimationFrame.bind(window),nativeCancel=window.cancelAnimationFrame.bind(window);
  const jobs=new Map();let sequence=0;
  const audit=window.__houseUiBackdrop={deferred:0,resumed:0,lastPanel:null,tourHold:false,permitTarget:0};
  const hold=()=>{
    if(!window.houseTest)return null;
    const panel=['activity-panel','family-panel','save-panel','rooms'].find(id=>{
      const panel=document.getElementById(id);return panel&&!panel.hidden;
    });
    if(panel)return panel;
    // Count actual rendered frames, not RAF callbacks (animate can return
    // early at its 30 fps limit). Its already-queued successor rechecks too.
    if(audit.tourHold&&(!audit.permitTarget||window.houseTest.state.framesDrawn>=audit.permitTarget))return 'activity-tour';
    return null;
  };
  window.requestAnimationFrame=callback=>{
    if(callback.name!=='animate')return nativeRAF(callback);
    const id=--sequence,job={raf:null,timer:null};jobs.set(id,job);
    const schedule=()=>{
      if(!jobs.has(id))return;
      const panel=hold();
      if(panel){audit.deferred++;audit.lastPanel=panel;job.timer=setTimeout(schedule,75);return;}
      job.timer=null;
      job.raf=nativeRAF(timestamp=>{
        // A menu can open after the frame was queued. Recheck before the
        // expensive scene callback, while leaving anonymous fade RAFs alone.
        if(hold()){schedule();return;}
        jobs.delete(id);audit.resumed++;callback(timestamp);
        if(audit.tourHold&&audit.permitTarget&&window.houseTest.state.framesDrawn>=audit.permitTarget)audit.permitTarget=0;
      });
    };
    schedule();return id;
  };
  window.cancelAnimationFrame=id=>{
    const job=jobs.get(id);
    if(!job){nativeCancel(id);return;}
    jobs.delete(id);if(job.raf!==null)nativeCancel(job.raf);if(job.timer!==null)clearTimeout(job.timer);
  };
}

// Real pointer input without Playwright's animation-frame stability/navigation
// barriers: every action in this suite changes the existing game UI in place.
// Keep visibility, enabled-state and hit testing, including each iframe ancestor.
async function clickReal(locator,{clickCount=1,delay=0,touch=false}={}){
  const page=locator.page(),timeout=Number(process.env.HOUSE_TIMEOUT)||30000;
  const deadline=Date.now()+timeout;let last;
  await locator.waitFor({state:'visible',timeout});
  while(Date.now()<deadline){
    last=await locator.evaluate(element=>{
      element.scrollIntoView({behavior:'instant',block:'center',inline:'center'});
      const rect=element.getBoundingClientRect(),style=getComputedStyle(element);
      const enabled=!element.matches(':disabled')&&element.getAttribute('aria-disabled')!=='true'&&!element.closest('[inert]');
      if(!enabled||!element.isConnected||!rect.width||!rect.height||style.visibility!=='visible'||Number(style.opacity)===0)
        return {ok:false,reason:'Target is hidden, detached or disabled'};
      let x=rect.x+rect.width/2,y=rect.y+rect.height/2,view=element.ownerDocument.defaultView;
      const hit=element.ownerDocument.elementFromPoint(x,y);
      if(!hit||!(hit===element||element.contains(hit)))return {ok:false,reason:'Target centre is clipped or covered'};
      while(view!==view.top){
        const frame=view.frameElement;if(!frame)return {ok:false,reason:'Cannot verify iframe ancestor'};
        const bounds=frame.getBoundingClientRect(),parent=frame.ownerDocument;
        // Account for frame borders and ordinary CSS scaling. The production
        // activity frame is same-origin, so its parent hit test is available.
        x=bounds.x+(frame.clientLeft+x)*bounds.width/frame.offsetWidth;
        y=bounds.y+(frame.clientTop+y)*bounds.height/frame.offsetHeight;
        if(parent.elementFromPoint(x,y)!==frame)return {ok:false,reason:'Iframe centre is clipped or covered by its parent'};
        view=parent.defaultView;
      }
      return {ok:true,x,y};
    });
    if(last.ok){
      // Playwright's box is relative to the top page even for iframe locators.
      const box=await locator.boundingBox();
      if(box&&Math.abs(box.x+box.width/2-last.x)<1&&Math.abs(box.y+box.height/2-last.y)<1){
        const x=box.x+box.width/2,y=box.y+box.height/2;
        console.log('INPUT',String(locator),touch?'tap':'click');
        if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y,{clickCount,delay});
        return;
      }
      last={ok:false,reason:'Target moved between hit test and pointer placement'};
    }
    await page.waitForTimeout(75);
  }
  assert.fail('Inaccessible real-input target '+locator+': '+JSON.stringify(last));
}
async function motionState(page,label){
  const state=await page.evaluate(()=>{
    const s=houseTest.state;return {position:s.position,yaw:s.yaw,frames:s.framesDrawn,nearby:s.nearby,active:s.active};
  });
  console.log('MOTION',label,JSON.stringify(state));return state;
}
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']});
  const [width,height]=(process.env.HOUSE_VIEWPORT||'1360x900').split('x').map(Number);
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage();
  await context.addInitScript(pauseBackdropDuringMenus);
  // Optional HOUSE_VIEWPORT=1024x640 plus render scale / timeout for CPU-only
  // Chromium keeps a desktop layout with fewer software-rendered pixels. Assertions and
  // input paths stay the same; normal runs keep Playwright's default timeout.
  if(process.env.HOUSE_TIMEOUT)page.setDefaultTimeout(Number(process.env.HOUSE_TIMEOUT));
  const navigations=[];page.on('framenavigated',frame=>navigations.push({url:frame.url(),at:new Date().toISOString()}));
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  try{
    await page.goto(base+'/house-test/'+(process.env.HOUSE_QUERY||''));
    await page.waitForFunction(()=>window.houseTest?.state.ready,{},{timeout:60000});
    await page.frame({url:/activity.html/}).evaluate(()=>Craepets._events(false));
    console.log('LOADED');
    // First visit: "Who's playing?", then straight into adoption (saves are a link).
    await clickReal(page.locator('#start'));
    await page.locator('#family-panel').waitFor({state:'visible'});
    assert(await page.locator('#save-panel').isHidden(),'First visit opened the save transfer form');
    await clickReal(page.locator('[data-profile="cory"]'));
    const f=page.frameLocator('#activity-frame');
    await f.locator('#pet-name').fill('Cory Comet');
    // adopt() saves an egg and replaces the activity DOM; it never navigates.
    // Software Chromium completed this click but timed out in Playwright's
    // scheduled-navigation barrier. Keep the real actionable click,
    // then synchronize on adoption and persistence instead of navigation.
    console.log('ADOPTING');
    await clickReal(f.locator('#do-adopt'));
    const activity=page.frame({url:/activity.html/});
    await activity.waitForFunction(()=>Craepets.state().pet?.name==='Cory Comet'&&!!Craepets.state().pet.egg,null,{polling:100});
    const adopted=await activity.evaluate(()=>JSON.parse(localStorage.getItem('craepets.house.v1.cory')).pet);
    assert.equal(adopted.name,'Cory Comet');assert(adopted.egg,'Adoption did not persist an egg');
    await clickReal(f.locator('[data-tapegg]'),{clickCount:8,delay:130});
    await activity.waitForFunction(()=>Craepets.state().pet?.name==='Cory Comet'&&!Craepets.state().pet.egg,null,{polling:100});
    const beforeClose=await page.evaluate(()=>({frames:houseTest.state.framesDrawn,deferred:window.__houseUiBackdrop.deferred}));
    assert(beforeClose.deferred>0,'Activity did not defer the expensive 3D backdrop');
    await clickReal(page.locator('#close-activity'));
    await page.waitForFunction(frames=>houseTest.state.framesDrawn>frames,beforeClose.frames,{polling:100});
    await page.waitForTimeout(1000);
    assert((await page.evaluate(()=>houseTest.state)).avatar,'Player avatar missing');
    await page.screenshot({path:'tests/house-desktop.png'});
    console.log('ADOPTED');
    // A real, newly adopted save is our migration fixture. Originals must
    // remain byte-for-byte identical through all the actions below.
    const original=await page.evaluate(()=>{
      const raw=localStorage.getItem('craepets.house.v1.cory');
      localStorage.setItem('craepets.v1.cory',raw);
      const ellie=JSON.parse(raw);ellie.pet.name='Ellie Blossom';ellie.pet.species='snorbit';ellie.tier='early';
      localStorage.setItem('craepets.v1.ellie',JSON.stringify(ellie));
      for(const k of Object.keys(localStorage))if(k.startsWith('craepets.house.'))localStorage.removeItem(k);
      return raw;
    });
    await page.reload();await page.waitForFunction(()=>window.houseTest?.state.ready,{},{timeout:60000});
    const runtime=()=>page.frame({url:/activity.html/});
    await runtime().evaluate(()=>Craepets._events(false));
    assert.equal(await runtime().evaluate(()=>Craepets.state().pet.name),'Cory Comet');
    await page.evaluate(()=>{window.__houseUiBackdrop.tourHold=true;window.__houseUiBackdrop.permitTarget=0;});
    await clickReal(page.locator('#start'));
    async function jump(room){
      if(await page.evaluate(()=>houseTest.state.active))await page.keyboard.press('KeyR');else await clickReal(page.locator('#welcome-rooms'));
      await clickReal(page.getByRole('button',{name:'Jump to '+room,exact:true}));
      if(await page.evaluate(()=>window.__houseUiBackdrop.tourHold)){
        const before=await motionState(page,'tour jump '+room);
        // life.tick refreshes nearby actions every 800 ms of real time.
        // Keep the backdrop held through that interval, then let the real
        // scene callback update it once. No game state or clock is changed.
        await page.waitForTimeout(850);
        const frames=await page.evaluate(()=>{
          const frames=houseTest.state.framesDrawn;window.__houseUiBackdrop.permitTarget=frames+1;return frames;
        });
        assert.equal(frames,before.frames,'Activity-tour backdrop drew without a frame permit');
        await page.waitForFunction(frames=>houseTest.state.framesDrawn>frames,frames,{polling:100,timeout:60000});
        const after=await motionState(page,'tour ready '+room);
        assert.equal(after.frames,frames+1,'Activity-tour permit drew more than one frame');
      }else await page.waitForTimeout(1100);
    }
    // E now uses a thing in reach first (the fridge, the swings…; interactions.mjs), so the
    // room's activity is opened with its own on-screen button, as a player would there.
    async function open(id,room){await jump(room);const button=page.locator('#nearby-actions [data-activity="'+id+'"]');
      // (A real click: the button must be visible and not covered.)
      // Wait for the room's next update; an immediate count can see the old
      // room and send E to a nearby object instead of opening this activity.
      await button.waitFor({state:'visible'});await clickReal(button);
      await page.locator('#activity-panel').waitFor({state:'visible'});}
    for(const [id,room] of [['farm','Back yard'],['well',"Mom & Dad's office"],['pool','Sunroom'],['market','Garage'],['bank',"Mom & Dad's office"],['home','Living room'],['games','Basement playroom'],['arena','Front yard'],['bag','Shared bedroom entry'],['quests','Dining room'],['diary',"Ellie's bedroom"],['case',"Jeannie's bedroom"],['stall','Front porch'],['feed','Kitchen'],['wash','Green bathroom'],['rest',"Kieran's bedroom"],['dress',"Mom & Dad's bedroom"],['play','Family room'],['read',"Mom & Dad's office"]]){
      await open(id,room);assert(await f.locator('.panel').count()>0,id+' empty');console.log('OPEN',id);
      if(['farm','well','pool'].includes(id)){
        const before=await runtime().evaluate(()=>({coins:Craepets.state().coins,correct:Craepets.state().stats.correct}));
        const correct=await runtime().evaluate(()=>Craepets.correctIndex());
        await clickReal(f.locator('[data-pick="'+correct+'"]'));
        const after=await runtime().evaluate(()=>({coins:Craepets.state().coins,correct:Craepets.state().stats.correct}));
        assert(after.coins>before.coins&&after.correct===before.correct+1,id+' learning reward missing');
      }
      if(id==='bank'){
        const before=await runtime().evaluate(()=>Craepets.state().coins);
        await clickReal(f.locator('[data-bank="in"]'));await clickReal(f.locator('[data-bankamt="in:10"]'));
        assert.equal(await runtime().evaluate(()=>Craepets.bank().balance),10);
        await clickReal(f.locator('[data-bank="out"]'));await clickReal(f.locator('[data-bankamt="out:10"]'));
        assert.equal(await runtime().evaluate(()=>Craepets.state().coins),before);
      }
      if(id==='market'){
        await runtime().evaluate(()=>Craepets.grant(500));const before=await runtime().evaluate(()=>Craepets.state().stats.buy);
        await clickReal(f.locator('[data-buy]:not([disabled])').first());
        const correct=await runtime().evaluate(()=>Craepets.changeIndex());if(correct>=0)await clickReal(f.locator('[data-change="'+correct+'"]'));
        assert.equal(await runtime().evaluate(()=>Craepets.state().stats.buy),before+1);
      }
      if(id==='home'){
        const item=await runtime().evaluate(()=>{const id=CPData.FURNITURE[0].id;Craepets.state().house.owned.push(id);Craepets.grant(0);return id;});
        await clickReal(f.locator('[data-place="'+item+'"]'));
        assert(await runtime().evaluate(id=>Craepets.house().placed.includes(id),item));
        await clickReal(f.locator('[data-hometab="style"]'));await clickReal(f.locator('[data-style="wall:sky"]'));
        await clickReal(f.locator('[data-hometab="homes"]'));assert(await f.locator('[data-buyhome]').count()>0,'Home collection missing');
      }
      if(id==='games'){
        await clickReal(f.locator('[data-catchplay]'));assert(await runtime().evaluate(()=>Craepets.catching()));
        await clickReal(page.locator('#close-activity'));assert.equal(await runtime().evaluate(()=>Craepets.catching()),false);
        await open(id,room);await clickReal(f.locator('[data-gamestab="match"]'));await clickReal(f.locator('[data-matchplay]'));
        const deck=await runtime().evaluate(()=>Craepets.match().cards.map(c=>c.pair)),pairs={};deck.forEach((p,i)=>(pairs[p]??=[]).push(i));
        const before=await runtime().evaluate(()=>Craepets.state().coins);
        for(const indices of Object.values(pairs)){await clickReal(f.locator('[data-mc="'+indices[0]+'"]'));await clickReal(f.locator('[data-mc="'+indices[1]+'"]'));}
        await f.locator('.pairlist').waitFor();assert(await runtime().evaluate(()=>Craepets.state().match.games===1));assert((await runtime().evaluate(()=>Craepets.state().coins))>before);
      }
      if(id==='arena'){
        await clickReal(f.locator('[data-fight]').first());
        const right=await runtime().evaluate(()=>Craepets.correctIndex());await clickReal(f.locator('[data-pick="'+right+'"]'));
        assert(await runtime().evaluate(()=>!!Craepets.battle()));
      }
      if(id==='quests'){await clickReal(f.locator('[data-gift]'));assert(await runtime().evaluate(()=>Craepets.state().dailyGift));}
      if(id==='diary'){await f.locator('#diary-input').fill('We walked to the library today.');await clickReal(f.locator('#diary-go'));assert(await runtime().evaluate(()=>Craepets.diary().some(e=>e.s==='We walked to the library today.')));}
      if(id==='case'){await clickReal(f.locator('[data-visit="ellie"]'));assert.equal(await runtime().evaluate(()=>Craepets.visiting()),'ellie');}
      if(id==='stall'){await clickReal(f.locator('[data-stock]').first());await clickReal(f.locator('[data-listit]'));assert((await runtime().evaluate(()=>Craepets.stall().goods.length))>0);}
      if(id==='feed'){const n=await runtime().evaluate(()=>Craepets.state().stats.feed);await clickReal(f.locator('[data-use="strawberry"]'));assert.equal(await runtime().evaluate(()=>Craepets.state().stats.feed),n+1);}
      if(id==='wash'){const n=await runtime().evaluate(()=>Craepets.state().stats.wash);await clickReal(f.locator('[data-use="rinse"]'));assert.equal(await runtime().evaluate(()=>Craepets.state().stats.wash),n+1);}
      if(id==='dress'){
        await runtime().evaluate(()=>{Craepets.state().wardrobe.push('partyhat','glasses','bluescarf');HouseActivity.enter({id:'dress',view:'nest',action:'dress'});});
        for(const wear of ['partyhat','glasses','bluescarf'])await clickReal(f.locator('[data-use="wear:'+wear+'"]'));
        assert.equal(await runtime().evaluate(()=>Craepets.state().pet.wear.head),'partyhat');
      }
      await clickReal(page.locator('#close-activity'));
    }
    await open('pet-house-cory',"Cory's Craepet house");assert(await f.locator('[data-hometab="homes"]').count(),'Own house did not open decorating');await clickReal(page.locator('#close-activity'));
    await open('pet-house-ellie',"Ellie's Craepet house");assert.equal(await runtime().evaluate(()=>Craepets.visiting()),'ellie');await clickReal(page.locator('#close-activity'));
    await page.evaluate(()=>{window.__houseUiBackdrop.tourHold=false;window.__houseUiBackdrop.permitTarget=0;});
    await jump('Craepet street');
    const resumeFrames=await page.evaluate(()=>houseTest.state.framesDrawn);
    await page.waitForFunction(frames=>houseTest.state.framesDrawn>=frames+2,resumeFrames,{polling:100,timeout:60000});
    // Steering is the arrow keys: ← turns the view. Wait for real motion,
    // because a fixed wall-clock hold may contain no software-rendered frame.
    const aimed=(await motionState(page,'ArrowLeft before')).yaw;
    await page.keyboard.down('ArrowLeft');
    try{await page.waitForFunction(yaw=>houseTest.state.yaw!==yaw,aimed,{polling:100,timeout:60000});}
    finally{await page.keyboard.up('ArrowLeft');await motionState(page,'ArrowLeft after');}
    assert.notEqual(await page.evaluate(()=>houseTest.state.yaw),aimed,'The arrow keys did not turn the view');
    await page.screenshot({path:'tests/house-neighborhood.png'});
    // Walk to a room through the model, rather than invoking the jump UI.
    await jump('Front entry');const before=(await motionState(page,'ArrowUp before')).position;
    await page.keyboard.down('ArrowUp');
    try{await page.waitForFunction(pos=>{
      const s=houseTest.state;return s.position.z<pos.z-.45&&s.nearby.includes('nest');
    },before,{polling:100,timeout:60000});}
    finally{await page.keyboard.up('ArrowUp');await motionState(page,'ArrowUp after');}
    await page.waitForTimeout(1100);
    const walking=await page.evaluate(()=>houseTest.state);assert(walking.position.z<before.z-.4,'The arrow keys did not walk');assert(walking.nearby.includes('nest'),'Walking did not reach the living activity');
    assert(walking.appearance.includes('partyhat')&&walking.appearance.includes('bluescarf'),'3D outfit was not updated');assert(walking.furniture>0,'Placed furniture is absent from the house');
    await page.keyboard.press('KeyE');await clickReal(page.locator('[data-choice="nest"]'));await page.locator('#activity-panel').waitFor({state:'visible'});
    await clickReal(f.locator('[data-do="wash"]'));await page.locator('#activity-panel').waitFor({state:'hidden'});
    const guided=await page.evaluate(()=>houseTest.state);assert.equal(guided.destination,'wash');assert(Math.abs(guided.position.x-walking.position.x)<.1,'Directions silently teleported the player');
    const roamed=await page.evaluate(()=>houseTest.state.roamers);assert(roamed.some(r=>r.id==='ellie'),'Family pet did not join the house');// Companions live at their places (a bed, a rug, the veg bed…) doing something there.
    // Only the family's own pets: Cory plays, so Ellie's is the one Craepet companion (no shopkeepers).
    // The family's real cats, Bubba and Beebs (companions.mjs HOUSE_CATS), live there too.
    assert.deepEqual(roamed.map(r=>r.id).filter(id=>!['bubba','beebs'].includes(id)),['ellie'],'Someone outside the family lives in the house: '+roamed.map(r=>r.id));
    assert(roamed.every(r=>r.act&&r.mode),'Companions have no routine');
    await page.keyboard.press('KeyF');await clickReal(page.locator('[data-profile="ellie"]'));await page.waitForTimeout(1100);assert.equal((await page.evaluate(()=>houseTest.state)).pet,'Ellie Blossom');
    // Switching to someone with no pet offers adoption; leaving it without
    // adopting goes back to Family, not round into adoption again.
    await page.keyboard.press('KeyF');await clickReal(page.locator('[data-profile="jeannie"]'));await page.locator('#activity-panel').waitFor({state:'visible'});
    await clickReal(page.locator('#close-activity'));await page.locator('#family-panel').waitFor({state:'visible'});
    assert(await page.locator('#activity-panel').isHidden(),'Leaving adoption without a pet reopened adoption');
    await clickReal(page.locator('[data-profile="cory"]'));await page.waitForTimeout(600);
    assert(await page.locator('#activity-panel').isHidden()&&(await page.evaluate(()=>houseTest.state)).pet==='Cory Comet','Could not switch back from a pet-less player');
    const saved=await runtime().evaluate(()=>({coins:Craepets.state().coins,correct:Craepets.state().stats.correct}));
    assert.equal(await page.evaluate(()=>localStorage.getItem('craepets.v1.cory')),original,'Original save was changed');
    await page.reload();await page.waitForFunction(()=>window.houseTest?.state.ready,{},{timeout:60000});assert.deepEqual(await runtime().evaluate(()=>({coins:Craepets.state().coins,correct:Craepets.state().stats.correct})),saved);
    await clickReal(page.locator('#start'));await page.screenshot({path:'tests/house-desktop.png'});
    await page.keyboard.press('KeyC');await page.locator('#pet-speech').waitFor({state:'visible'});
    console.log('PASS desktop play, walk-up actions, family roaming, migration and reload');
    // Finger controls and activity layout use the same saved pets on an iPhone.
    const familyBackup=await runtime().evaluate(()=>HouseSaves.bundle('house'));
    await context.close(); // desktop checks are complete; free its live WebGL scene
    const phone=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
    await phone.addInitScript(pauseBackdropDuringMenus);
    const mobile=await phone.newPage();mobile.on('pageerror',e=>errors.push(e.message));
    if(process.env.HOUSE_TIMEOUT)mobile.setDefaultTimeout(Number(process.env.HOUSE_TIMEOUT));
    await mobile.goto(base+'/house-test/'+(process.env.HOUSE_QUERY||''));await mobile.waitForFunction(()=>window.houseTest?.state.ready,{},{timeout:60000});
    await clickReal(mobile.locator('#welcome-saves'),{touch:true});await mobile.locator('#save-file').setInputFiles({name:'family.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(familyBackup))});await clickReal(mobile.locator('#apply-saves'),{touch:true});await clickReal(mobile.locator('#close-saves'),{touch:true});
    assert.equal(await mobile.frame({url:/activity.html/}).evaluate(()=>Craepets.state().pet.name),'Cory Comet');assert.equal(await mobile.frame({url:/activity.html/}).evaluate(()=>HouseActivity.family().filter(p=>p.pet).length),2,'Complete family did not transfer');
    await clickReal(mobile.locator('#rooms-button'),{touch:true});await mobile.locator('#rooms').waitFor({state:'visible'});await clickReal(mobile.getByRole('button',{name:'Jump to Front entry',exact:true}),{touch:true});await mobile.waitForTimeout(1100);
    const mobileResumeFrames=await mobile.evaluate(()=>houseTest.state.framesDrawn);
    await mobile.waitForFunction(frames=>houseTest.state.framesDrawn>=frames+2,mobileResumeFrames,{polling:100,timeout:60000});
    const pos=(await motionState(mobile,'joystick before')).position,joystick=mobile.locator('#joystick');
    const r=await joystick.boundingBox();
    const cdp=await phone.newCDPSession(mobile);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+10,id:1}]});
    try{await mobile.waitForFunction(pos=>houseTest.state.position.z<pos.z-.35,pos,{polling:100,timeout:60000});}
    finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await motionState(mobile,'joystick after');}
    await mobile.waitForTimeout(1100);assert((await mobile.evaluate(()=>houseTest.state.position.z))<pos.z-.3,'Touch joystick did not walk');
    await mobile.screenshot({path:'tests/house-phone.png'});
    const yaw=await mobile.evaluate(()=>houseTest.state.yaw);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:330,y:350,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:250,y:360,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.notEqual(await mobile.evaluate(()=>houseTest.state.yaw),yaw,'Touch drag did not orbit');
    await clickReal(mobile.locator('#rooms-button'),{touch:true});await mobile.locator('#rooms').waitFor({state:'visible'});await clickReal(mobile.getByRole('button',{name:'Jump to Back yard',exact:true}),{touch:true});await mobile.waitForTimeout(1100);await clickReal(mobile.locator('[data-activity="farm"]'),{touch:true});
    const mf=mobile.frameLocator('#activity-frame');await mf.locator('.choice').first().waitFor();
    assert(await mobile.frame({url:/activity.html/}).evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Phone activity overflows horizontally');
    await mobile.screenshot({path:'tests/house-phone-activity.png'});
    const phoneFrames=await mobile.evaluate(()=>houseTest.state.framesDrawn);
    await clickReal(mobile.locator('#close-activity'),{touch:true});
    await mobile.waitForFunction(frames=>houseTest.state.framesDrawn>frames,phoneFrames,{polling:100});
    // The tap's follow-up click must not fall through to the Rooms button under it.
    await mobile.waitForTimeout(600);
    assert(await mobile.locator('#rooms').isHidden(),'Closing an activity by touch opened Rooms (ghost click)');
    assert(await mobile.evaluate(()=>houseTest.state.active),'Closing an activity by touch did not return to walking');
    await phone.close();console.log('PASS phone touch walking and learning activity');
    console.log('ERRORS',JSON.stringify(errors));assert.deepEqual(errors,[]);
  }catch(e){console.error(e.stack||String(e));console.log('ERRORS',JSON.stringify(errors));console.log('FRAME_NAVIGATIONS',JSON.stringify(navigations));await page.screenshot({path:'tests/house-failure.png',timeout:10000}).catch(()=>{});throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
