// Run against a local server with HOUSE_BASE and a seeded profile with HOUSE_SEED.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');

const base=process.env.HOUSE_BASE||'http://127.0.0.1:8765';
const seed=JSON.parse(fs.readFileSync(process.env.HOUSE_SEED,'utf8'));
const notes=['C','D','E','F','G','A','B','C'];
const keys=['Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8',
  'KeyA','KeyS','KeyD','KeyF','KeyG','KeyH','KeyJ','KeyK'];

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const errors=[];
  try{
    const context=await browser.newContext({viewport:{width:1280,height:800}});
    await context.addInitScript(saved=>{for(const [key,value] of Object.entries(saved))localStorage.setItem(key,value);},seed);
    const page=await context.newPage();
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base+'/house-test/');
    await page.waitForFunction(()=>window.houseTest?.state.ready,{},{timeout:90000});
    await page.locator('#start').click();
    assert(await page.evaluate(()=>houseTest.go({x:10.8,y:-1.05,z:-1.6})),'Could not reach piano');
    await page.waitForFunction(()=>houseTest.state.interactions.near==='piano');
    await page.keyboard.press('KeyE');
    assert.equal((await page.evaluate(()=>houseTest.state.interactions)).active,'piano');
    for(let i=0;i<keys.length;i++){
      await page.keyboard.press(keys[i]);
      assert.equal(await page.locator('#pet-speech').textContent(),`♪ ${notes[i%notes.length]}`,`${keys[i]} played the wrong note`);
      assert.equal((await page.evaluate(()=>houseTest.state.interactions)).active,'piano',`${keys[i]} stopped the piano`);
      assert(await page.locator('#family-panel').isHidden(),`${keys[i]} opened Family during piano play`);
    }
    await page.keyboard.press('KeyE');
    assert.equal((await page.evaluate(()=>houseTest.state.interactions)).active,null,'E did not exit piano');
    await page.keyboard.press('KeyF');
    assert(await page.locator('#family-panel').isVisible(),'F did not open Family after exiting piano');
    await page.locator('#close-family').click();
    await page.keyboard.press('KeyE');
    assert.equal((await page.evaluate(()=>houseTest.state.interactions)).active,'piano');
    await page.keyboard.press('Escape');
    assert.equal((await page.evaluate(()=>houseTest.state.interactions)).active,null,'Escape did not exit piano');
    assert.deepEqual(errors,[],'Unexpected page error');
    console.log('PASS piano: all 16 advertised keys play their notes; F stays at the piano; E/Escape exit; F opens Family afterward');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
