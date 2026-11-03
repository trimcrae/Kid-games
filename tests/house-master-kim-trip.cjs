// House → school → house through the actual game UI, with saved-family checks.
// Whole-route collision traversal is covered by house-master-kim.mjs. This test
// verifies Rooms travel, non-teleporting paw directions, native input and reload.
const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');
const base=process.env.HOUSE_BASE||'http://127.0.0.1:8765',query=process.env.HOUSE_QUERY||'?pr=0.25';
const out=process.env.KIM_CAPTURE_DIR||'/tmp/master-kim-trip';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true});const errors=[];
try{
 const setup=await browser.newContext(),seed=await setup.newPage();await seed.goto(base+'/house-test/activity.html');await seed.waitForFunction(()=>window.HouseActivity?.ready());await seed.evaluate(()=>{HouseActivity.select('cory');HouseActivity.enter({id:'adopt',view:'nest'});Craepets._events(false);});await seed.locator('#pet-name').fill('School Explorer');await seed.locator('#do-adopt').click();await seed.locator('[data-tapegg]').click({clickCount:8,delay:130});
 const raw=await seed.evaluate(()=>localStorage.getItem('craepets.house.v1.cory'));const first=JSON.parse(raw);first.coins=137;first.wardrobe=['partyhat'];first.pet.wear.head='partyhat';first.house.owned=['candle'];first.house.placed=['candle'];const second=structuredClone(first);second.pet.name='Family Friend';second.pet.species='snorbit';second.pet.wear.head=null;second.wardrobe=[];
 const fixture={'craepets.v1.cory':JSON.stringify(first),'craepets.v1.ellie':JSON.stringify(second)};await setup.close();
 for(const mobile of [false,true]){
  const label=mobile?'mobile':'desktop',context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1360,height:900},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1,reducedMotion:'reduce'});await context.addInitScript(s=>{for(const[k,v]of Object.entries(s))localStorage.setItem(k,v);},fixture);
  const page=await context.newPage();page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const press=async loc=>mobile?loc.tap():loc.click();
  const ready=async()=>{await page.waitForFunction(()=>window.houseTest?.state.ready,null,{timeout:180000});await page.frame({url:/activity.html/}).evaluate(()=>Craepets._events(false));};
  const saved=()=>page.frame({url:/activity.html/}).evaluate(()=>{const s=Craepets.state();return {name:s.pet.name,species:s.pet.species,wear:s.pet.wear,coins:s.coins,bag:s.bag,house:s.house,correct:s.stats.correct,family:HouseActivity.family().filter(p=>p.pet).map(p=>[p.id,p.pet.name]).sort()};});
  async function choose(name,walk=false){await press(page.locator('#rooms-button'));await press(page.getByRole('button',{name:(walk?'Walk to ':'Jump to ')+name,exact:true}));}
  await page.goto(base+'/house-test/'+query);await ready();await press(page.locator('#start'));await choose('Living room');await page.waitForFunction(()=>houseTest.state.hereRoom==='Living room');const original=await saved();assert.equal(original.family.length,2);console.log('HOME',label,await page.evaluate(()=>houseTest.state.position));
  const atHome=await page.evaluate(()=>houseTest.state.position);await choose("Master Kim's dojang",true);await page.waitForFunction(()=>houseTest.state.route?.state==='found'&&houseTest.state.pawPrints>0,null,{timeout:60000});const guided=await page.evaluate(()=>({position:houseTest.state.position,route:houseTest.state.route}));assert(Math.hypot(guided.position.x-atHome.x,guided.position.z-atHome.z)<.01,'Paw directions teleported out of the house');console.log('PASS house-to-school paw route',label,JSON.stringify(guided.route));
  await choose("Master Kim's dojang");await page.waitForFunction(()=>houseTest.state.hereRoom==="Master Kim's dojang"&&houseTest.state.active);assert.deepEqual(await saved(),original);await page.screenshot({path:out+'/trip-'+label+'-school.png'});
  // Exercise native control at the destination without a wall-clock FPS test.
  const p=await page.evaluate(()=>houseTest.state.position);if(mobile){const r=await page.locator('#joystick').boundingBox(),cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+8,id:1}]});try{await page.waitForFunction(z=>houseTest.state.position.z>z+.35,p.z,{timeout:60000});}finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}}
  else{await page.keyboard.down('ArrowUp');try{await page.waitForFunction(z=>houseTest.state.position.z>z+.35,p.z,{timeout:60000});}finally{await page.keyboard.up('ArrowUp');}}
  const schoolPosition=await page.evaluate(()=>houseTest.state.position);await page.reload();await ready();const restored=await page.evaluate(()=>houseTest.state.position);assert(Math.hypot(restored.x-schoolPosition.x,restored.z-schoolPosition.z)<.35,'Reload lost school position');assert.deepEqual(await saved(),original);await press(page.locator('#start'));console.log('PASS school movement/reload and saved family',label,JSON.stringify(restored));
  // Reach the corrected room from the actual entrance using native controls.
  await choose("Master Kim's entrance");await page.waitForFunction(()=>houseTest.state.active);
  async function inputUntil(key,direction,predicate,arg){
   if(mobile){const r=await page.locator('#joystick').boundingBox(),cdp=await context.newCDPSession(page);const [dx,dy]=direction;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2+dx*(r.width/2-8),y:r.y+r.height/2+dy*(r.height/2-8),id:1}]});try{await page.waitForFunction(predicate,arg,{timeout:90000});}finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}}
   else{await page.keyboard.down(key);try{await page.waitForFunction(predicate,arg,{timeout:90000});}finally{await page.keyboard.up(key);}}
  }
  await inputUntil('ArrowUp',[0,-1],()=>houseTest.state.position.z>=24.8);
  const entry=await page.evaluate(()=>houseTest.state.position);assert(entry.z<25.2,'Overshot the gear doorway');
  await page.screenshot({path:out+'/trip-'+label+'-entrance.png'});
  if(!mobile){await page.keyboard.down('ArrowRight');try{await page.waitForFunction(()=>houseTest.state.yaw<=Math.PI/2+.02,null,{timeout:60000});}finally{await page.keyboard.up('ArrowRight');}}
  await inputUntil('ArrowUp',[1,0],()=>houseTest.state.position.x<39.5);
  const gearPosition=await page.evaluate(()=>houseTest.state.position);assert(gearPosition.z>24.1&&gearPosition.z<25.6,'Gear reached outside its doorway');
  await page.screenshot({path:out+'/trip-'+label+'-gear.png'});
  await press(page.locator('#map-button'));assert.equal(await page.evaluate(()=>houseTest.state.map.floor),"Master Kim's");await page.screenshot({path:out+'/trip-'+label+'-map.png'});await press(page.locator('#close-map'));
  await inputUntil('ArrowDown',[-1,0],()=>houseTest.state.position.x>42.3);console.log('PASS native entrance-right-gear-return and map',label,JSON.stringify(gearPosition));
  await choose('Shoe & gear room',true);await page.waitForFunction(()=>houseTest.state.route?.state==='found'&&houseTest.state.pawPrints>0,null,{timeout:60000});await choose('Shoe & gear room');await page.reload();await ready();assert((await page.evaluate(()=>houseTest.state.position.x))<41);assert.deepEqual(await saved(),original);
  // A save made before the correction must not reload outside the old room.
  // beforeunload writes the live position, so install this legacy save once at
  // the next document's start, after the outgoing page has finished saving.
  await context.addInitScript(()=>{if(localStorage.getItem('kim-test-old-position')){localStorage.setItem('craepets.house.position.cory',JSON.stringify({x:50.2,y:-.82,z:25,yaw:-Math.PI/2}));localStorage.removeItem('kim-test-old-position');}});await page.evaluate(()=>localStorage.setItem('kim-test-old-position','1'));
  await page.reload();await ready();const migrated=await page.evaluate(()=>houseTest.state.position);assert(Math.abs(migrated.x-38.8)<.05&&Math.abs(migrated.z-25)<.05,'Old gear save was stranded');assert.deepEqual(await saved(),original);await press(page.locator('#start'));console.log('PASS gear reload, legacy-position recovery, unchanged family/inventory',label);
  await choose('Living room',true);await page.waitForFunction(()=>houseTest.state.route?.state==='found'&&houseTest.state.pawPrints>0,null,{timeout:60000});console.log('PASS school-to-house paw route',label,JSON.stringify(await page.evaluate(()=>houseTest.state.route)));await choose('Living room');await page.waitForFunction(()=>houseTest.state.hereRoom==='Living room'&&houseTest.state.active);assert.deepEqual(await saved(),original);
  assert.equal(await page.evaluate(()=>localStorage.getItem('craepets.v1.cory')),fixture['craepets.v1.cory']);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await page.screenshot({path:out+'/trip-'+label+'-home.png'});console.log('PASS complete house-school-gear-house UI round trip',label);await context.close();
 }
 assert.deepEqual(errors,[]);console.log('PASS zero browser errors; original house, family, inventory, coins and decorating retained');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
