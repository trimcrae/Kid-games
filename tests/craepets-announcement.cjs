// NEW: the ✨ What's new mystery door — the one-time reveal inside Craepets that
// hypes walking round the house in 3D. It knocks once on an idle valley (brand
// new players and players who already waved the quiet nest card away alike),
// opens on a tap into the reveal, sends you off with the very same button the
// nest card uses, and then lives behind the "What's new" entry in the menu.
// It never interrupts a sheet, a mini-game, adoption or a box someone is typing
// in, never appears inside the house, and never touches a valley's save.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const base=process.env.GAME_BASE||'http://127.0.0.1:8841';
const SHOTS=process.env.SHOT_DIR||'C:/Users/mcrae/.codex/private/claude-craepets-world-20260910/captures/MYSTERY';
const NEWS='craepets.news', WALK='craepets.walk', SLOT='craepets.v1.cory', ID='walk3d-1';
// The clock moves on between two reads of the same save; nothing else may.
const norm=s=>{const o=JSON.parse(s);o.lastTick=0;return JSON.stringify(o);};
(async()=>{
  fs.mkdirSync(SHOTS,{recursive:true});
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const errors=[];
  const watch=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});};
  const shot=(p,name)=>p.screenshot({path:path.join(SHOTS,name+'.png')});
  const ready=async p=>{await p.waitForFunction(()=>window.Craepets&&Craepets.state());await p.evaluate(()=>Craepets._events(false));};
  // The announcement is once per browser, so every case gets its own storage.
  const fresh=async(opts,saves)=>{
    const c=await browser.newContext({viewport:{width:1360,height:900},...(opts||{})});
    if(saves)await c.addInitScript(s=>{if(!sessionStorage.getItem('seeded')){
      for(const k of Object.keys(localStorage))if(k.startsWith('craepets'))localStorage.removeItem(k);
      for(const [k,v] of Object.entries(s))localStorage.setItem(k,v);
      sessionStorage.setItem('seeded','1');}},saves);
    const p=await c.newPage();watch(p);
    return p;
  };
  const doors=p=>p.locator('#news-back').count();
  const forget=p=>p.evaluate(k=>localStorage.removeItem(k),NEWS);         // as if never announced
  const told=(p,id)=>p.evaluate(([k,v])=>localStorage.setItem(k,JSON.stringify({seen:v})),[NEWS,id]);
  const repaint=p=>p.evaluate(()=>Craepets._setHour(null));               // a plain re-render, nothing else
  // Put the valley in a busy state, forget the announcement, repaint: it must
  // stay away. Then put the announcement back so the next case starts clean.
  const busy=async(p,what)=>{
    await forget(p);await repaint(p);
    assert.equal(await doors(p),0,'The door knocked over '+what);
    await told(p,ID);
  };
  try{
    /* 1. A brand-new player: adopt, hatch, and the door knocks — once. */
    const p1=await fresh();
    await p1.goto(base+'/games/craepets/');
    await p1.evaluate(()=>{for(const k of Object.keys(localStorage))if(k.startsWith('craepets'))localStorage.removeItem(k);localStorage.setItem('craepets.who','cory');});
    await p1.reload();await ready(p1);
    // adoption: no pet, and a name box waiting — nothing may cover either
    assert.equal(await doors(p1),0,'The door knocked over the adoption screen');
    assert.equal(await p1.evaluate(k=>localStorage.getItem(k),NEWS),null,'Adoption marked the announcement as seen');
    await p1.locator('#pet-name').fill('Comet');await p1.locator('#do-adopt').click();
    assert.equal(await doors(p1),0,'The door knocked at an unhatched egg');
    await p1.locator('[data-tapegg]').click({clickCount:8,delay:130});
    await p1.locator('#news-back').waitFor();
    const savedOnShow=await p1.evaluate(k=>localStorage.getItem(k),SLOT);
    // it reads as a mystery, it is a proper dialog, and the keyboard is inside it
    const doorText=await p1.locator('#news-box').textContent();
    assert.match(doorText,/NEW/);
    assert.match(doorText,/A secret door appeared/);
    assert.match(doorText,/Open the door/);
    assert.equal(await p1.locator('#news-box [data-newslater]').count(),1,'No Later option on the door');
    assert.deepEqual(await p1.evaluate(()=>{const b=document.querySelector('#news-box');
      return {modal:b.getAttribute('aria-modal'),role:b.getAttribute('role'),labelled:!!document.getElementById(b.getAttribute('aria-labelledby'))};}),
      {modal:'true',role:'dialog',labelled:true});
    assert.equal(await p1.evaluate(()=>document.querySelector('#news-box').contains(document.activeElement)),true,'Focus did not move into the door');
    await shot(p1,'desktop-door');
    /* 2. Turning the key reveals the feature — and the pet is in it. */
    await p1.locator('#news-box [data-newsopen]').click();
    const revealText=await p1.locator('#news-box').textContent();
    assert.match(revealText,/Walk around the house in 3D/);
    assert.match(revealText,/Comet/,'The reveal does not name the pet');
    assert.match(revealText,/Start walking/);
    assert.equal(await p1.locator('#news-box [data-walk]').count(),1,'The reveal has no Start walking button');
    assert.equal(await p1.locator('#news-box [data-newslater]').count(),1,'No equally reachable Later option');
    await p1.waitForTimeout(700);await shot(p1,'desktop-reveal');
    /* 3. Escape is "Later" — and none of this touched the save. */
    await p1.keyboard.press('Escape');
    assert.equal(await doors(p1),0,'Escape did not close the reveal');
    assert.equal(norm(await p1.evaluate(k=>localStorage.getItem(k),SLOT)),norm(savedOnShow),'Showing and dismissing the reveal changed the save');
    assert.equal(await p1.evaluate(k=>localStorage.getItem(k),WALK),null,'The reveal wrote the walk record by itself');
    assert.equal(await p1.evaluate(k=>JSON.parse(localStorage.getItem(k)).seen,NEWS),ID,'The announcement was not recorded under its own version');
    await shot(p1,'desktop-dismissed');
    /* 4. It never comes back on its own: not on a reload, not on later renders. */
    await p1.reload();await ready(p1);
    assert.equal(await doors(p1),0,'The door knocked again after a reload');
    await p1.locator('.nav [data-go="bag"]').click();
    await p1.locator('.nav [data-go="nest"]').click();
    await repaint(p1);
    assert.equal(await doors(p1),0,'The door knocked again on a later render');
    /* 5. The ✨ What's new entry opens it again on purpose, from the keyboard,
          and hands the keyboard back where it found it. */
    const entry=p1.locator('.nav [data-news]');
    assert.equal(await entry.count(),1,"No ✨ What's new entry in the menu");
    await entry.focus();await p1.keyboard.press('Enter');
    await p1.locator('#news-back').waitFor();
    assert.match(await p1.locator('#news-box').textContent(),/A secret door appeared/,'Reopening skipped the mystery');
    await shot(p1,'desktop-reopened');
    await p1.keyboard.press('Tab');await p1.keyboard.press('Tab');
    assert.equal(await p1.evaluate(()=>document.querySelector('#news-box').contains(document.activeElement)),true,'Tab wandered off behind the backdrop');
    await p1.keyboard.press('Escape');
    assert.equal(await doors(p1),0);
    assert.equal(await p1.evaluate(()=>document.activeElement.dataset.news),'1',"The keyboard was not given back to the What's new button");
    /* 5b. Nothing gets past the door: a number key over it must not answer the
           question waiting underneath. The same key works once it is shut. */
    await p1.locator('.nav [data-go="farm"]').click();
    await p1.locator('[data-pick="0"]').waitFor();
    const coinsBefore=await p1.evaluate(()=>Craepets.state().coins);
    await entry.click();await p1.locator('#news-back').waitFor();
    await p1.keyboard.press('1');await p1.keyboard.press('3');
    assert.equal(await doors(p1),1,'A number key closed the door');
    assert.equal(await p1.locator('.choice[disabled]').count(),0,'A number key answered the question behind the door');
    assert.equal(await p1.evaluate(()=>Craepets.state().coins),coinsBefore,'The game paid out for a key pressed over the door');
    await p1.keyboard.press('Escape');
    assert.equal(await doors(p1),0);
    await p1.keyboard.press('1');
    await p1.locator('[data-next]').waitFor();                // the key works again
    await p1.locator('.nav [data-go="nest"]').click();
    /* 6. "Start walking" goes exactly where the nest card's button goes. The 3D
          house itself is not the point here, so it is stubbed out. */
    await p1.route('**/house-test/**',r=>r.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>stub</title>'}));
    await entry.click();
    await p1.locator('#news-box [data-newsopen]').click();
    await p1.locator('#news-box [data-walk]').click();
    await p1.waitForURL(/\/house-test\/\?from=game$/);
    // (Base-relative: the deployed arcade lives under /Kid-games/.)
    const u=new URL(p1.url());
    assert.equal(u.href,new URL('../../house-test/?from=game',base+'/games/craepets/').href,'Start walking went somewhere else');

    /* 7. A family already playing, who waved the quiet NEW card away long ago,
          still gets this one announcement — exactly once. */
    const save=JSON.parse(savedOnShow);
    const seeded={'craepets.who':'cory','craepets.v1.cory':JSON.stringify(save),
      'craepets.walk':JSON.stringify({visited:true,dismissed:true})};
    const p2=await fresh(null,seeded);
    await p2.goto(base+'/games/craepets/');await ready(p2);
    assert.equal(await p2.locator('.walknew').count(),0,'The quiet nest card came back');
    await p2.locator('#news-back').waitFor();
    assert.match(await p2.locator('#news-box').textContent(),/A secret door appeared/);
    // Nothing between here and "Later" is allowed to write to the valley.
    const beforeLater=await p2.evaluate(k=>localStorage.getItem(k),SLOT);
    await p2.locator('#news-box [data-newslater]').click();
    assert.equal(await doors(p2),0,'Later did not close it');
    assert.equal(norm(await p2.evaluate(k=>localStorage.getItem(k),SLOT)),norm(beforeLater),'Dismissing the announcement changed the save');
    await p2.reload();await ready(p2);
    assert.equal(await doors(p2),0,'It knocked a second time');
    assert.deepEqual(await p2.evaluate(k=>JSON.parse(localStorage.getItem(k)),WALK),{visited:true,dismissed:true},'The announcement rewrote the walk record');
    // the pet, the coins and the things this family already had are all still theirs
    assert.deepEqual(await p2.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k));return {pet:s.pet.name,coins:s.coins,bag:s.bag,trophies:s.trophies};},SLOT),
      {pet:save.pet.name,coins:save.coins,bag:save.bag,trophies:save.trophies},'The announcement disturbed the saved valley');
    /* 7b. And a family who never noticed the quiet card at all — no walk
           record, a pet hatched days ago — gets the door too (they are the
           very people who missed it). */
    {const old=JSON.parse(savedOnShow);old.pet.born=Date.now()-3*864e5;
      const p3=await fresh(null,{'craepets.who':'cory','craepets.v1.cory':JSON.stringify(old)});
      await p3.goto(base+'/games/craepets/');await ready(p3);
      await p3.locator('#news-back').waitFor();
      assert.match(await p3.locator('#news-box').textContent(),/A secret door appeared/,'A player who never saw the quiet card missed the announcement');
      await p3.locator('#news-box [data-newslater]').click();
      await p3.close();}
    /* 8. It never pops over anything the player is in the middle of. */
    await p2.locator('[data-help]').click();                  // an open sheet
    await p2.locator('#sheet-back').waitFor();
    await busy(p2,'an open sheet');
    await p2.keyboard.press('Escape');
    await p2.locator('.nav [data-go="games"]').click();        // ⭐ Sky Catch
    await p2.locator('[data-catchplay]').click();
    await p2.waitForFunction(()=>Craepets.catching());
    await busy(p2,'Sky Catch');
    await p2.locator('[data-catchstop]').click();
    await p2.locator('[data-gamestab="match"]').click();       // 🃏 Memory Match
    await p2.locator('[data-matchplay]').click();
    await p2.waitForFunction(()=>!!Craepets.match());
    await busy(p2,'Memory Match');
    await p2.locator('[data-matchstop]').click();
    await p2.locator('.nav [data-go="diary"]').click();        // a box waiting to be typed in
    await p2.locator('#diary-input').waitFor();
    await busy(p2,'a text box');
    // …and the other way round: idle on the nest, it does knock.
    await p2.locator('.nav [data-go="nest"]').click();
    await forget(p2);await repaint(p2);
    await p2.locator('#news-back').waitFor();
    await p2.locator('#news-box [data-newslater]').click();
    /* 9. Inside the house the same engine runs the rooms, so it must stay quiet
          there. The activity page on its own is the house edition. */
    const p3=await fresh(null,{'craepets.house.who':'cory','craepets.house.v1.cory':JSON.stringify(save)});
    await p3.goto(base+'/house-test/activity.html');await ready(p3);
    assert.equal(await p3.evaluate(()=>CraepetsSaveMode.id),'house','Not running as the house edition');
    assert.equal(await p3.evaluate(()=>!!Craepets.state().pet&&!Craepets.state().pet.egg),true,'The house activity has no hatched pet to be idle with');
    await p3.waitForTimeout(400);
    assert.equal(await doors(p3),0,'The door knocked inside the house');
    assert.equal(await p3.locator('[data-news]').count(),0,"The What's new entry is offered inside the house");
    assert.equal(await p3.evaluate(k=>localStorage.getItem(k),NEWS),null,'The house marked the announcement as seen');
    /* 10. A phone: it fits, the buttons are finger-sized, and Later works by touch. */
    const p4=await fresh({viewport:{width:390,height:844},isMobile:true,hasTouch:true},seeded);
    await p4.goto(base+'/games/craepets/');await ready(p4);
    await p4.locator('#news-back').waitFor();
    await shot(p4,'phone-door');
    const box=await p4.locator('#news-box').boundingBox();
    assert(box.width<=390-8&&box.x>=4,'The door spills off a phone: '+JSON.stringify(box));
    for(const sel of ['[data-newsopen]','[data-newslater]']){
      const b=await p4.locator('#news-box '+sel).boundingBox();
      assert(b.height>=40,sel+' is too small for a finger: '+b.height);
    }
    await p4.locator('#news-box [data-newsopen]').tap();
    assert.match(await p4.locator('#news-box').textContent(),/Walk around the house in 3D/);
    assert((await p4.locator('#news-box [data-walk]').boundingBox()).height>=44,'Start walking is too small on a phone');
    await p4.waitForTimeout(700);await shot(p4,'phone-reveal');
    await p4.locator('#news-box [data-newslater]').tap();
    assert.equal(await doors(p4),0,'Later did not work by touch');
    await shot(p4,'phone-dismissed');
    assert.equal(await p4.locator('.nav [data-news]').count(),1,'No way back to it on a phone');
    /* 11. Someone who has asked for less movement gets the same door, standing still. */
    const p5=await fresh({reducedMotion:'reduce'},seeded);
    await p5.goto(base+'/games/craepets/');await ready(p5);
    await p5.locator('#news-back').waitFor();
    assert.equal(await p5.evaluate(()=>getComputedStyle(document.querySelector('.newsdoor')).animationName),'none','The door still animates under prefers-reduced-motion');
    assert.equal(await p5.evaluate(()=>getComputedStyle(document.querySelector('#news-box')).animationName),'none','The card still animates under prefers-reduced-motion');
    await p5.locator('#news-box [data-newsopen]').click();
    assert.equal(await p5.locator('#news-box [data-walk]').count(),1,'The reveal does not work under prefers-reduced-motion');
    await p5.keyboard.press('Escape');
    assert.equal(await doors(p5),0);

    assert.deepEqual(errors,[]);
    console.log("PASS ✨ What's new mystery door: knocks once for new and returning players, opens into the 3D house reveal, Start walking → ../../house-test/?from=game, Later/Escape with the keyboard given back, never over adoption/a sheet/Sky Catch/Memory Match/a text box/the house, saves untouched, phone and reduced-motion");
  }catch(e){console.error(e);console.log('ERRORS',errors);process.exitCode=1;}
  finally{await browser.close();}
})();
