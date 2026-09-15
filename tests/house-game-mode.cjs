// NEW: walking round the house from the Craepets game, on the game's own saves.
// A family that already plays the game (and has an old, separate house-edition
// save) sees the NEW invitation and a Walk button, walks round the house with
// the same pet and coins, earns in the house, switches player, comes back to
// the valley with everything kept, and reloads. The standalone house edition
// keeps its own saves, a background tab never writes stale progress over newer,
// and "Maybe later" hides the card but keeps the Walk button.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.HOUSE_BASE||'http://127.0.0.1:8765';
const readSave=(page,key)=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const context=await browser.newContext({viewport:{width:1360,height:900}}),page=await context.newPage();
  const errors=[];const watch=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});};watch(page);
  const gameReady=async p=>{await p.waitForFunction(()=>window.Craepets&&Craepets.state());await p.evaluate(()=>Craepets._events(false));};
  const houseReady=async p=>{await p.waitForFunction(()=>window.houseTest?.state.ready,{},{timeout:90000});await p.frame({url:/activity.html/}).evaluate(()=>Craepets._events(false));};
  try{
    // 1. The full game as a family already plays it: Cory has a hatched pet and coins.
    await page.goto(base+'/games/craepets/');
    await page.evaluate(()=>{for(const k of Object.keys(localStorage))if(k.startsWith('craepets'))localStorage.removeItem(k);localStorage.setItem('craepets.who','cory');});
    await page.reload();await gameReady(page);
    await page.locator('#pet-name').fill('Comet');await page.locator('#do-adopt').click();
    await page.locator('[data-tapegg]').click({clickCount:8,delay:130});
    await page.evaluate(()=>Craepets.grant(40));
    const cory=await readSave(page,'craepets.v1.cory');assert(cory.pet&&!cory.pet.egg,'Cory\'s pet did not hatch');
    // Jeannie plays too, and Cory has an old, separate house-edition save.
    const legacy=JSON.stringify({...cory,coins:999,pet:{...cory.pet,name:'Old House Pet'}});
    await page.evaluate(([c,l])=>{localStorage.setItem('craepets.v1.jeannie',JSON.stringify({...c,pet:{...c.pet,name:'Juniper'}}));localStorage.setItem('craepets.house.v1.cory',l);localStorage.setItem('craepets.house.who','cory');},[cory,legacy]);
    await page.reload();await gameReady(page);
    // 2. The NEW invitation on the nest and a Walk button in the menu; the classic game is all still there.
    await page.locator('.walknew').waitFor();
    assert.match(await page.locator('.walknew').textContent(),/NEW[\s\S]*Walk around the house/);
    assert.equal(await page.locator('.nav [data-walk] .dot.new').count(),1,'Walk button is not flagged NEW');
    for(const place of ['map','nest','home','farm','well','pool','games','market','stall','arena','bag','quests','diary','case'])
      assert.equal(await page.locator(`.nav [data-go="${place}"]`).count(),1,place+' left the menu');
    assert.match(await page.locator('.panel').first().textContent(),/Comet's nest/,'The nest is no longer the first panel');
    // 3. Off for a walk: the house plays on the game's own save, straight in (no "Who's playing?").
    await page.locator('.walknew [data-walk]').click();
    await page.waitForURL(/\/house-test\/\?from=game$/);await houseReady(page);
    let f=page.frame({url:/activity.html/});
    assert.equal(await f.evaluate(()=>CraepetsSaveMode.id),'game');
    assert.deepEqual(await f.evaluate(()=>({pet:Craepets.state().pet.name,coins:Craepets.state().coins})),{pet:'Comet',coins:cory.coins});
    assert(await page.locator('#back-to-game').isVisible(),'No way back to the game in the top bar');
    assert(await page.locator('#welcome .back-link').isVisible(),'No way back to the game on the welcome card');
    assert(await page.locator('#welcome-saves').isHidden(),'Game mode offers the house-edition save transfer');
    await page.locator('#start').click();await page.waitForTimeout(600);
    assert(await page.locator('#family-panel').isHidden()&&await page.locator('#activity-panel').isHidden(),'Game mode asked who is playing or opened adoption');
    assert.equal((await page.evaluate(()=>houseTest.state)).pet,'Comet');
    // 4. Earning in the house lands in the game's save; the old house-edition save is untouched.
    await f.evaluate(()=>Craepets.grant(7));
    assert.equal((await readSave(page,'craepets.v1.cory')).coins,cory.coins+7,'House earnings missed the game save');
    assert.equal(await page.evaluate(()=>localStorage.getItem('craepets.house.v1.cory')),legacy,'The old house-edition save changed');
    // 5. Switching player in the house is the game's player too.
    await page.keyboard.press('KeyF');await page.locator('[data-profile="jeannie"]').click();await page.waitForTimeout(900);
    assert.equal(await page.evaluate(()=>localStorage.getItem('craepets.who')),'jeannie');
    assert.equal((await page.evaluate(()=>houseTest.state)).pet,'Juniper');
    await page.keyboard.press('KeyF');await page.locator('[data-profile="cory"]').click();await page.waitForTimeout(900);
    // 6. Back to the valley on a desktop: Esc pauses, and the pause card leads
    //    back. Same player, pet and coins; the card has done its job.
    await page.keyboard.press('Escape');
    await page.locator('#welcome[data-mode="pause"]').waitFor();
    await page.locator('#welcome .back-link a').click();
    await page.waitForURL(/\/games\/craepets\/$/);await gameReady(page);
    assert.deepEqual(await page.evaluate(()=>({pet:Craepets.state().pet.name,coins:Craepets.state().coins})),{pet:'Comet',coins:cory.coins+7});
    assert.equal(await page.locator('.walknew').count(),0,'The NEW card stayed after a walk');
    assert.equal(await page.locator('.nav [data-walk]').count(),1,'The Walk button went away');
    assert.equal(await page.locator('.nav [data-walk] .dot.new').count(),0,'Walk is still flagged NEW after a walk');
    await page.reload();await gameReady(page);
    assert.equal(await page.evaluate(()=>Craepets.state().coins),cory.coins+7,'Coins were lost on reload');
    // 7. On a phone: the Walk button in the menu, then the top-bar "back" button.
    const phone=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    // The same family's saves, already in the phone's storage before the game opens.
    const saved=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('craepets')).map(k=>[k,localStorage.getItem(k)])));
    await phone.addInitScript(s=>{if(!sessionStorage.getItem('seeded')){for(const [k,v] of Object.entries(s))localStorage.setItem(k,v);sessionStorage.setItem('seeded','1');}},saved);
    const mobile=await phone.newPage();watch(mobile);
    await mobile.goto(base+'/games/craepets/');await gameReady(mobile);
    await mobile.locator('.nav [data-walk]').tap();await mobile.waitForURL(/from=game/);await houseReady(mobile);
    await mobile.locator('#start').tap();await mobile.waitForTimeout(600);
    assert(await mobile.locator('#back-to-game').isVisible(),'No back button on the phone');
    await mobile.locator('#back-to-game').tap();await mobile.waitForURL(/\/games\/craepets\/$/);await gameReady(mobile);
    assert.equal(await mobile.evaluate(()=>Craepets.state().pet.name),'Comet');
    await phone.close();
    // 8. The standalone house edition keeps its own, separate saves.
    await page.goto(base+'/house-test/');await houseReady(page);f=page.frame({url:/activity.html/});
    assert.equal(await f.evaluate(()=>CraepetsSaveMode.id),'house');
    assert.deepEqual(await f.evaluate(()=>({pet:Craepets.state().pet.name,coins:Craepets.state().coins})),{pet:'Old House Pet',coins:999});
    assert(await page.locator('#back-to-game').isHidden(),'The standalone edition shows the game-mode back button');
    assert.equal((await readSave(page,'craepets.v1.cory')).coins,cory.coins+7,'The standalone edition touched the game save');
    // 9. A game tab left open in the background never saves old progress over newer.
    const other=await context.newPage();watch(other);await other.goto(base+'/games/craepets/');await gameReady(other);
    await page.goto(base+'/house-test/?from=game');await houseReady(page);f=page.frame({url:/activity.html/});
    await f.evaluate(()=>Craepets.grant(5));
    await other.waitForFunction(c=>Craepets.state().coins===c,cory.coins+12,{timeout:5000});
    await other.evaluate(()=>window.dispatchEvent(new Event('beforeunload')));
    assert.equal((await readSave(page,'craepets.v1.cory')).coins,cory.coins+12,'A stale tab wrote old coins over new ones');
    await other.close();
    // 10. "Maybe later" hides the card for good; the Walk button stays, flagged NEW until a walk.
    await page.goto(base+'/games/craepets/');await page.evaluate(()=>localStorage.removeItem('craepets.walk'));await page.reload();await gameReady(page);
    await page.locator('.walknew [data-walkhide]').click();
    assert.equal(await page.locator('.walknew').count(),0);
    assert.equal(await page.locator('.nav [data-walk] .dot.new').count(),1);
    await page.reload();await gameReady(page);assert.equal(await page.locator('.walknew').count(),0,'The card came back after "Maybe later"');
    assert.deepEqual(errors,[]);
    console.log('PASS NEW house walk from the game: invitation + Walk button, same pet/coins/player there and back, reload, pause-card return, standalone edition separate, no stale-tab overwrite, "Maybe later"');
  }catch(e){console.error(e);console.log('ERRORS',errors);process.exitCode=1;}
  finally{await browser.close();}
})();
