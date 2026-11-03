// Real desktop and touch controls in the complete Craepets scene.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.HOUSE_BASE||'http://127.0.0.1:8765';
const query=new URLSearchParams(process.env.HOUSE_QUERY||'');if(!query.has('phase'))query.set('phase','day');if(!query.has('weather'))query.set('weather','sunny');
const out=process.env.KIM_CAPTURE_DIR||'/tmp/master-kim-qa';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true});
 const errors=[];
 async function ready(page){page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto(base+'/house-test/?'+query);await page.waitForFunction(()=>window.houseTest?.state.ready,null,{timeout:120000});}
 async function go(page,p,yaw=Math.PI){assert(await page.evaluate(([p,y])=>houseTest.go(p,y),[p,yaw]));await page.waitForTimeout(250);}
 async function walkUntil(page,key,test,arg){await page.keyboard.down(key);try{await page.waitForFunction(test,arg,{timeout:60000});}finally{await page.keyboard.up(key);console.log('WALK',key,await page.evaluate(()=>({position:houseTest.state.position,yaw:houseTest.state.yaw,active:houseTest.state.active})));}await page.waitForTimeout(300);}
 try{
  const context=await browser.newContext({viewport:{width:1280,height:850},reducedMotion:'reduce'});const page=await context.newPage();page.setDefaultTimeout(90000);await ready(page);console.log('READY DESKTOP',await page.locator('#start').isVisible());await page.screenshot({path:out+'/ready-desktop.png'});
  await page.frame({url:/activity.html/}).evaluate(()=>Craepets._events(false));await page.locator('#start').click({force:true});console.log('START');await page.locator('[data-profile="cory"]').click({force:true});console.log('PROFILE');
  const frame=page.frameLocator('#activity-frame');await frame.locator('#pet-name').fill('Dojang Explorer');await frame.locator('#do-adopt').click({force:true});console.log('ADOPT');await frame.locator('[data-tapegg]').click({clickCount:8,delay:130,force:true});console.log('HATCH');await page.locator('#close-activity').click({force:true});console.log('WALKING');
  await page.locator('#rooms-button').click();await page.getByRole('button',{name:"Jump to Master Kim's dojang",exact:true}).click();
  await page.waitForFunction(()=>houseTest.state.hereRoom==="Master Kim's dojang"&&houseTest.state.avatar);await page.waitForTimeout(1800);
  await page.screenshot({path:out+'/dojang-desktop.png'});
  // The adjacent doorway admits the pet. The broad viewing glass does not.
  await go(page,{x:42.02,y:-.82,z:34});await walkUntil(page,'ArrowUp',()=>houseTest.state.position.z>36.1);
  await go(page,{x:45.5,y:-.82,z:34});await page.keyboard.down('ArrowUp');await page.waitForTimeout(2000);await page.keyboard.up('ArrowUp');assert((await page.evaluate(()=>houseTest.state.position.z))<34.76,'Pet passed through observation glass');
  // Padding and outer walls are solid, even while walking toward them.
  await go(page,{x:33.5,y:-.82,z:43.8},Math.PI/2);await page.keyboard.down('ArrowUp');await page.waitForTimeout(1800);await page.keyboard.up('ArrowUp');assert((await page.evaluate(()=>houseTest.state.position.x))>33.25,'Pet passed through padded post');
  // Leave through both glazed doorways, then back through them on foot.
  await go(page,{x:42.55,y:-.82,z:25},0);await walkUntil(page,'ArrowUp',()=>houseTest.state.position.z<20.4);await walkUntil(page,'ArrowDown',()=>houseTest.state.position.z>25.1);
  await go(page,'Spectator lounge');await page.waitForTimeout(1400);await page.screenshot({path:out+'/lounge-desktop.png'});
  await go(page,{x:44.5,y:-.82,z:30},0);await page.waitForTimeout(1000);await page.screenshot({path:out+'/lounge-to-entry.png'});
  await go(page,"Master Kim's entrance");await page.waitForTimeout(1000);await page.screenshot({path:out+'/entrance-desktop.png'});
  await go(page,"Master Kim's dojang");await page.locator('#map-button').click();assert.equal(await page.evaluate(()=>houseTest.state.map.floor),"Master Kim's");await page.screenshot({path:out+'/school-map.png'});await page.keyboard.press('Escape');
  const saved=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));const desktop=await page.evaluate(()=>({drawCalls:houseTest.state.drawCalls,triangles:houseTest.state.triangles,practicalLights:houseTest.state.practicalLights,room:houseTest.state.hereRoom}));
  console.log('PASS desktop Rooms, adopted pet, doorway, glass, post, exit/re-entry, map',JSON.stringify(desktop));
  await context.close();
  const phone=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});await phone.addInitScript(s=>{for(const [k,v]of Object.entries(s))localStorage.setItem(k,v);},saved);const mobile=await phone.newPage();await ready(mobile);await mobile.locator('#start').tap();await mobile.locator('#rooms-button').tap();await mobile.getByRole('button',{name:"Jump to Master Kim's dojang",exact:true}).tap();
  await mobile.waitForFunction(()=>houseTest.state.avatar&&houseTest.state.active);await mobile.waitForTimeout(1200);await mobile.screenshot({path:out+'/dojang-mobile.png'});
  await go(mobile,{x:42.02,y:-.82,z:34});const joystick=await mobile.locator('#joystick').boundingBox();const cdp=await phone.newCDPSession(mobile);
  const touch=async type=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x:joystick.x+joystick.width/2,y:joystick.y+8,id:1}]});
  await touch('touchStart');try{await mobile.waitForFunction(()=>houseTest.state.position.z>36,null,{timeout:60000});}finally{await touch('touchEnd');}
  const yaw=await mobile.evaluate(()=>houseTest.state.yaw);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:340,y:360,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:240,y:360,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.notEqual(await mobile.evaluate(()=>houseTest.state.yaw),yaw,'Swipe did not turn');
  await go(mobile,{x:42.55,y:-.82,z:22.5},0);await touch('touchStart');try{await mobile.waitForFunction(()=>houseTest.state.position.z<20.4,null,{timeout:60000});}finally{await touch('touchEnd');}
  // Drag the same stick down to reenter backwards.
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:joystick.x+joystick.width/2,y:joystick.y+joystick.height-8,id:1}]});try{await mobile.waitForFunction(()=>houseTest.state.position.z>24.5,null,{timeout:60000});}finally{await touch('touchEnd');}
  await go(mobile,'Spectator lounge');await mobile.waitForTimeout(1000);await mobile.screenshot({path:out+'/lounge-mobile.png'});
  assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Mobile overflow');assert.deepEqual(errors,[]);console.log('PASS mobile joystick, swipe, exit/re-entry, fit; zero browser errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
