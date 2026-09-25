// Browser regression: HOUSE_BASE serves the checkout; HOUSE_SEED is an optional
// synthetic save. Checks real touch events, both vehicle controls and parking.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('playwright');
function allowed(){
  const hour=+new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',hourCycle:'h23'}).format(new Date());
  assert(hour<6||hour>=10,'Computer-use checks are disabled from 06:00 to 10:00 America/New_York');
}
(async()=>{
  allowed();
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  try{
    const context=await browser.newContext({viewport:{width:1000,height:760},hasTouch:true,isMobile:true});
    if(process.env.HOUSE_SEED){const saved=JSON.parse(fs.readFileSync(process.env.HOUSE_SEED,'utf8'));await context.addInitScript(s=>{for(const[k,v]of Object.entries(s))localStorage.setItem(k,v);},saved);}
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto((process.env.HOUSE_BASE||'http://127.0.0.1:8765')+'/house-test/');
    await page.waitForFunction(()=>window.houseTest?.state.ready,null,{timeout:90000});
    await page.frame({url:/activity.html/}).evaluate(()=>Craepets._events(false));
    await page.locator('#start').tap();
    if(!process.env.HOUSE_SEED){
      await page.locator('[data-profile="cory"]').tap();const activity=page.frameLocator('#activity-frame');
      await activity.locator('#pet-name').fill('Car Tester');await activity.locator('#do-adopt').tap();
      for(let i=0;i<8;i++)await activity.locator('[data-tapegg]').tap();
      await page.locator('#close-activity').tap();
    }
    await page.evaluate(()=>houseTest.go({x:-2.1,y:-.16,z:-1.0},0,0));
    await page.waitForFunction(()=>houseTest.state.interactions.near==='car2');
    await page.locator('#interact').tap();
    await page.waitForFunction(()=>houseTest.state.interactions.active==='car2');
    await page.waitForFunction(()=>document.querySelector('#jump').getAttribute('aria-label')==='Honk');
    assert.match(await page.locator('#hint').textContent(),/Pad/,'touch driving instructions missing');
    assert(await page.locator('#coach').isHidden(),'walking coach overlaps vehicle controls');
    // Count the actual scheduled horn tones, not just a button label.
    await page.evaluate(()=>{
      window.hornTones=[];const proto=AudioContext.prototype,create=proto.createOscillator;
      proto.createOscillator=function(...args){const oscillator=create.apply(this,args),set=oscillator.frequency.setValueAtTime;
        oscillator.frequency.setValueAtTime=function(value,...args){hornTones.push(value);return set.call(this,value,...args);};return oscillator;};
    });
    const jumps=await page.evaluate(()=>houseTest.state.jumps);
    await page.locator('#jump').tap();
    const tones=await page.evaluate(()=>hornTones);
    assert(tones.includes(392)&&tones.includes(494),`touch action did not schedule horn tones: ${tones}`);
    assert.equal(await page.evaluate(()=>houseTest.state.jumps),jumps,'horn triggered a jump');
    const client=await context.newCDPSession(page),box=await page.locator('#joystick').boundingBox();
    const cx=box.x+box.width/2,cy=box.y+box.height/2;
    async function touch(type,x=0,y=0){allowed();await client.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{x:cx+x,y:cy+y,id:1,radiusX:3,radiusY:3}]});}
    await touch('touchStart',0,40);
    await page.waitForFunction(()=>houseTest.state.interactions.cars.car2.z>7,null,{timeout:15000});
    await touch('touchEnd');
    await page.waitForFunction(()=>Math.abs(houseTest.state.interactions.cars.car2.speed)<.05);
    const released=await page.evaluate(()=>houseTest.state.interactions.cars.car2);
    assert(released.z>7,'touch reverse did not leave garage');
    // A partial diagonal stick drives and steers; cancellation releases it.
    await touch('touchStart',-15,-20);await page.waitForTimeout(1000);await touch('touchCancel');
    await page.waitForFunction(()=>Math.abs(houseTest.state.interactions.cars.car2.speed)<.05);
    const turned=await page.evaluate(()=>houseTest.state.interactions.cars.car2);
    assert(Math.abs(turned.heading)>.15,'touch pad did not steer');
    assert(Math.hypot(turned.x-released.x,turned.z-released.z)>.3,'touch pad did not accelerate');
    if(process.env.HOUSE_SHOT){allowed();await page.screenshot({path:process.env.HOUSE_SHOT});}
    await page.locator('#interact').tap();
    await page.waitForFunction(()=>houseTest.state.interactions.active===null);
    await page.waitForFunction(()=>document.querySelector('#jump').getAttribute('aria-label')==='Jump');
    assert.equal(await page.evaluate(()=>houseTest.state.interactions.cars.car2.speed),0,'car not parked');
    assert.deepEqual(errors,[]);
    console.log('PASS touch car: horn, reverse garage exit, proportional acceleration, steering, cancel-to-stop, exit and walking controls');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
