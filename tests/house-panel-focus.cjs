// Keyboard focus stays with the visible house panel, including room travel.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.HOUSE_BASE||'http://127.0.0.1:8765';
const active=page=>page.evaluate(()=>document.activeElement?.id||document.activeElement?.getAttribute('aria-label'));
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.goto(base+'/house-test/');
    await page.waitForFunction(()=>window.houseTest?.state.ready,{},{timeout:180000});
    await page.frame({url:/activity.html/}).evaluate(()=>Craepets._events(false));
    await page.locator('#start').focus();await page.keyboard.press('Shift+Tab');
    assert(await page.evaluate(()=>document.querySelector('#welcome').contains(document.activeElement)),'Tab escaped the welcome panel');
    await page.locator('#start').click();
    await page.locator('[data-profile="cory"]').click();
    const frame=page.frameLocator('#activity-frame');
    await frame.locator('#pet-name').fill('Scout');await frame.locator('#do-adopt').click();
    await frame.locator('[data-tapegg]').click({clickCount:8,delay:120});
    await page.locator('#close-activity').click();

    await page.locator('#rooms-button').click();
    assert.equal(await active(page),'Jump to Front entry','Rooms did not focus the room list');
    await page.keyboard.press('Tab');
    assert.equal(await active(page),'Walk to Front entry','Tab skipped the room’s walking route');
    await page.locator('#reset').focus();await page.keyboard.press('Tab');
    assert.equal(await active(page),'close-rooms','Tab escaped past the last Rooms control');
    await page.keyboard.press('Shift+Tab');
    assert.equal(await active(page),'reset','Shift+Tab did not wrap within Rooms');
    await page.locator('#map-button').focus();
    assert(await page.evaluate(()=>document.querySelector('#rooms').contains(document.activeElement)),'Focus escaped the open Rooms panel');
    await page.keyboard.press('Escape');
    assert.equal(await active(page),'view','Closing Rooms did not return focus to walking');

    await page.keyboard.press('KeyM');
    assert.equal(await active(page),'map-done','Map did not take focus');
    await page.keyboard.press('Tab');assert.equal(await active(page),'close-map','Tab escaped the Map');
    await page.keyboard.press('Escape');assert.equal(await active(page),'view','Closing Map did not return focus to walking');

    await page.keyboard.press('KeyF');
    assert(await page.evaluate(()=>document.querySelector('#family-panel').contains(document.activeElement)),'Family did not take focus');
    await page.locator('#family-panel a.house-only').focus();await page.keyboard.press('Tab');
    assert.equal(await active(page),'close-family','Tab escaped Family');
    await page.keyboard.press('Escape');assert.equal(await active(page),'view','Closing Family did not return focus to walking');

    await page.keyboard.press('KeyF');await page.locator('#load-saves').click();
    assert.equal(await active(page),'close-saves','The save panel did not take focus');
    await page.locator('#new-pet-instead').focus();await page.keyboard.press('Tab');
    assert(await page.evaluate(()=>document.querySelector('#save-panel').contains(document.activeElement)),'Tab escaped the save panel');
    await page.keyboard.press('Escape');assert.equal(await active(page),'view','Closing saves did not return focus to walking');

    await page.keyboard.press('KeyR');await page.locator('[aria-label="Jump to Kitchen"]').click();
    await page.locator('#nearby-actions [data-activity]').first().click();
    assert.equal(await active(page),'close-activity','The activity did not take focus');
    await page.locator('#map-button').focus();
    assert.equal(await active(page),'close-activity','Focus escaped the activity panel');
    await page.locator('#close-activity').click();
    assert.equal(await active(page),'view','Closing the activity did not return focus to walking');
    assert.deepEqual(errors,[]);
    console.log('PASS Welcome, Rooms, Map, Family, saves and activity opening focus, Tab containment, Escape focus return');
  }catch(e){console.error(e);console.log('BOOT',await page.evaluate(()=>({state:window.houseBoot?.state,stage:window.houseBoot?.stage,errors:window.houseBoot?.errors,loading:document.querySelector('#loading')?.textContent})).catch(()=>null));console.log('ERRORS',errors);process.exitCode=1;}
  finally{await browser.close();}
})();
