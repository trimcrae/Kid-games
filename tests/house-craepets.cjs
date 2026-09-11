const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.HOUSE_BASE||'http://127.0.0.1:8765';
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const context=await browser.newContext({viewport:{width:1360,height:900}}),page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  try{
    await page.goto(base+'/house-test/');
    await page.waitForFunction(()=>window.houseTest?.state.ready,{},{timeout:60000});
    await page.frame({url:/activity.html/}).evaluate(()=>Craepets._events(false));
    console.log('LOADED');
    // First visit: "Who's playing?", then straight into adoption (saves are a link).
    await page.locator('#start').click();
    await page.locator('#family-panel').waitFor({state:'visible'});
    assert(await page.locator('#save-panel').isHidden(),'First visit opened the save transfer form');
    await page.locator('[data-profile="cory"]').click();
    const f=page.frameLocator('#activity-frame');
    await f.locator('#pet-name').fill('Cory Comet');await f.locator('#do-adopt').click();
    await f.locator('[data-tapegg]').click({clickCount:8,delay:130});
    await page.locator('#close-activity').click();
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
    await page.locator('#start').click();
    async function jump(room){if(await page.evaluate(()=>houseTest.state.active))await page.keyboard.press('KeyR');else await page.locator('#welcome-rooms').click();await page.getByRole('button',{name:'Jump to '+room,exact:true}).click();await page.waitForTimeout(1100);}
    async function open(id,room){await jump(room);await page.keyboard.press('KeyE');if(await page.locator('#activity-choices').isVisible())await page.locator('[data-choice="'+id+'"]').click();await page.waitForTimeout(150);}
    for(const [id,room] of [['farm','Back yard'],['well',"Mom & Dad's office"],['pool','Sunroom'],['market','Garage'],['bank',"Mom & Dad's office"],['home','Living room'],['games','Basement playroom'],['arena','Front yard'],['bag','Shared bedroom entry'],['quests','Dining room'],['diary',"Ellie's bedroom"],['case',"Jeannie's bedroom"],['stall','Front porch'],['feed','Kitchen'],['wash','Green bathroom'],['rest',"Kieran's bedroom"],['dress',"Mom & Dad's bedroom"],['play','Family room'],['read',"Mom & Dad's office"]]){
      await open(id,room);assert(await f.locator('.panel').count()>0,id+' empty');console.log('OPEN',id);
      if(['farm','well','pool'].includes(id)){
        const before=await runtime().evaluate(()=>({coins:Craepets.state().coins,correct:Craepets.state().stats.correct}));
        const correct=await runtime().evaluate(()=>Craepets.correctIndex());
        await f.locator('[data-pick="'+correct+'"]').click();
        const after=await runtime().evaluate(()=>({coins:Craepets.state().coins,correct:Craepets.state().stats.correct}));
        assert(after.coins>before.coins&&after.correct===before.correct+1,id+' learning reward missing');
      }
      if(id==='bank'){
        const before=await runtime().evaluate(()=>Craepets.state().coins);
        await f.locator('[data-bank="in"]').click();await f.locator('[data-bankamt="in:10"]').click();
        assert.equal(await runtime().evaluate(()=>Craepets.bank().balance),10);
        await f.locator('[data-bank="out"]').click();await f.locator('[data-bankamt="out:10"]').click();
        assert.equal(await runtime().evaluate(()=>Craepets.state().coins),before);
      }
      if(id==='market'){
        await runtime().evaluate(()=>Craepets.grant(500));const before=await runtime().evaluate(()=>Craepets.state().stats.buy);
        await f.locator('[data-buy]:not([disabled])').first().click();
        const correct=await runtime().evaluate(()=>Craepets.changeIndex());if(correct>=0)await f.locator('[data-change="'+correct+'"]').click();
        assert.equal(await runtime().evaluate(()=>Craepets.state().stats.buy),before+1);
      }
      if(id==='home'){
        const item=await runtime().evaluate(()=>{const id=CPData.FURNITURE[0].id;Craepets.state().house.owned.push(id);Craepets.grant(0);return id;});
        await f.locator('[data-place="'+item+'"]').click();
        assert(await runtime().evaluate(id=>Craepets.house().placed.includes(id),item));
        await f.locator('[data-hometab="style"]').click();await f.locator('[data-style="wall:sky"]').click();
        await f.locator('[data-hometab="homes"]').click();assert(await f.locator('[data-buyhome]').count()>0,'Home collection missing');
      }
      if(id==='games'){
        await f.locator('[data-catchplay]').click();assert(await runtime().evaluate(()=>Craepets.catching()));
        await page.locator('#close-activity').click();assert.equal(await runtime().evaluate(()=>Craepets.catching()),false);
        await open(id,room);await f.locator('[data-gamestab="match"]').click();await f.locator('[data-matchplay]').click();
        const deck=await runtime().evaluate(()=>Craepets.match().cards.map(c=>c.pair)),pairs={};deck.forEach((p,i)=>(pairs[p]??=[]).push(i));
        const before=await runtime().evaluate(()=>Craepets.state().coins);
        for(const indices of Object.values(pairs)){await f.locator('[data-mc="'+indices[0]+'"]').click();await f.locator('[data-mc="'+indices[1]+'"]').click();}
        await f.locator('.pairlist').waitFor();assert(await runtime().evaluate(()=>Craepets.state().match.games===1));assert((await runtime().evaluate(()=>Craepets.state().coins))>before);
      }
      if(id==='arena'){
        await f.locator('[data-fight]').first().click();
        const right=await runtime().evaluate(()=>Craepets.correctIndex());await f.locator('[data-pick="'+right+'"]').click();
        assert(await runtime().evaluate(()=>!!Craepets.battle()));
      }
      if(id==='quests'){await f.locator('[data-gift]').click();assert(await runtime().evaluate(()=>Craepets.state().dailyGift));}
      if(id==='diary'){await f.locator('#diary-input').fill('We walked to the library today.');await f.locator('#diary-go').click();assert(await runtime().evaluate(()=>Craepets.diary().some(e=>e.s==='We walked to the library today.')));}
      if(id==='case'){await f.locator('[data-visit="ellie"]').click();assert.equal(await runtime().evaluate(()=>Craepets.visiting()),'ellie');}
      if(id==='stall'){await f.locator('[data-stock]').first().click();await f.locator('[data-listit]').click();assert((await runtime().evaluate(()=>Craepets.stall().goods.length))>0);}
      if(id==='feed'){const n=await runtime().evaluate(()=>Craepets.state().stats.feed);await f.locator('[data-use="strawberry"]').click();assert.equal(await runtime().evaluate(()=>Craepets.state().stats.feed),n+1);}
      if(id==='wash'){const n=await runtime().evaluate(()=>Craepets.state().stats.wash);await f.locator('[data-use="rinse"]').click();assert.equal(await runtime().evaluate(()=>Craepets.state().stats.wash),n+1);}
      if(id==='dress'){
        await runtime().evaluate(()=>{Craepets.state().wardrobe.push('partyhat','glasses','bluescarf');HouseActivity.enter({id:'dress',view:'nest',action:'dress'});});
        for(const wear of ['partyhat','glasses','bluescarf'])await f.locator('[data-use="wear:'+wear+'"]').click();
        assert.equal(await runtime().evaluate(()=>Craepets.state().pet.wear.head),'partyhat');
      }
      await page.locator('#close-activity').click();
    }
    await open('pet-house-cory',"Cory's Craepet house");assert(await f.locator('[data-hometab="homes"]').count(),'Own house did not open decorating');await page.locator('#close-activity').click();
    await open('pet-house-ellie',"Ellie's Craepet house");assert.equal(await runtime().evaluate(()=>Craepets.visiting()),'ellie');await page.locator('#close-activity').click();
    await jump('Craepet street');const aimed=await page.evaluate(()=>houseTest.state.yaw);await page.mouse.move(900,450);await page.mouse.move(980,470);await page.waitForTimeout(100);assert.notEqual(await page.evaluate(()=>houseTest.state.yaw),aimed,'Mouse without dragging did not aim');
    await page.screenshot({path:'tests/house-neighborhood.png'});
    // Walk to a room through the model, rather than invoking the jump UI.
    await jump('Front entry');const before=await page.evaluate(()=>houseTest.state.position);
    await page.keyboard.down('KeyW');await page.waitForTimeout(850);await page.keyboard.up('KeyW');await page.waitForTimeout(1100);
    const walking=await page.evaluate(()=>houseTest.state);assert(walking.position.z<before.z-.4,'WASD did not walk');assert(walking.nearby.includes('nest'),'Walking did not reach the living activity');
    assert(walking.appearance.includes('partyhat')&&walking.appearance.includes('bluescarf'),'3D outfit was not updated');assert(walking.furniture>0,'Placed furniture is absent from the house');
    await page.keyboard.press('KeyE');await page.locator('[data-choice="nest"]').click();await page.locator('#activity-panel').waitFor({state:'visible'});
    await f.locator('[data-do="wash"]').click();await page.locator('#activity-panel').waitFor({state:'hidden'});
    const guided=await page.evaluate(()=>houseTest.state);assert.equal(guided.destination,'wash');assert(Math.abs(guided.position.x-walking.position.x)<.1,'Directions silently teleported the player');
    const roamed=await page.evaluate(()=>houseTest.state.roamers);assert(roamed.some(r=>r.id==='ellie'),'Family pet did not join the house');assert(roamed.some(r=>r.distance>.15),'Pets do not roam');
    await page.keyboard.press('KeyF');await page.locator('[data-profile="ellie"]').click();await page.waitForTimeout(1100);assert.equal((await page.evaluate(()=>houseTest.state)).pet,'Ellie Blossom');
    await page.keyboard.press('KeyF');await page.locator('[data-profile="cory"]').click();
    const saved=await runtime().evaluate(()=>({coins:Craepets.state().coins,correct:Craepets.state().stats.correct}));
    assert.equal(await page.evaluate(()=>localStorage.getItem('craepets.v1.cory')),original,'Original save was changed');
    await page.reload();await page.waitForFunction(()=>window.houseTest?.state.ready,{},{timeout:60000});assert.deepEqual(await runtime().evaluate(()=>({coins:Craepets.state().coins,correct:Craepets.state().stats.correct})),saved);
    await page.locator('#start').click();await page.screenshot({path:'tests/house-desktop.png'});
    await page.keyboard.press('KeyC');await page.locator('#pet-speech').waitFor({state:'visible'});
    console.log('PASS desktop play, walk-up actions, family roaming, migration and reload');
    // Finger controls and activity layout use the same saved pets on an iPhone.
    const familyBackup=await runtime().evaluate(()=>HouseSaves.bundle('house'));
    const phone=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
    const mobile=await phone.newPage();mobile.on('pageerror',e=>errors.push(e.message));
    await mobile.goto(base+'/house-test/');await mobile.waitForFunction(()=>window.houseTest?.state.ready,{},{timeout:60000});
    await mobile.locator('#welcome-saves').tap();await mobile.locator('#save-file').setInputFiles({name:'family.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(familyBackup))});await mobile.locator('#apply-saves').tap();await mobile.locator('#close-saves').tap();
    assert.equal(await mobile.frame({url:/activity.html/}).evaluate(()=>Craepets.state().pet.name),'Cory Comet');assert.equal(await mobile.frame({url:/activity.html/}).evaluate(()=>HouseActivity.family().filter(p=>p.pet).length),2,'Complete family did not transfer');
    await mobile.locator('#rooms-button').tap();await mobile.getByRole('button',{name:'Jump to Front entry',exact:true}).tap();await mobile.waitForTimeout(1100);
    const pos=await mobile.evaluate(()=>houseTest.state.position),joystick=mobile.locator('#joystick');
    const r=await joystick.boundingBox();
    const cdp=await phone.newCDPSession(mobile);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+10,id:1}]});await mobile.waitForTimeout(700);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await mobile.waitForTimeout(1100);assert((await mobile.evaluate(()=>houseTest.state.position.z))<pos.z-.3,'Touch joystick did not walk');
    await mobile.screenshot({path:'tests/house-phone.png'});
    const yaw=await mobile.evaluate(()=>houseTest.state.yaw);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:330,y:350,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:250,y:360,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.notEqual(await mobile.evaluate(()=>houseTest.state.yaw),yaw,'Touch drag did not orbit');
    await mobile.locator('#rooms-button').tap();await mobile.getByRole('button',{name:'Jump to Back yard',exact:true}).tap();await mobile.waitForTimeout(1100);await mobile.locator('[data-activity="farm"]').tap();
    const mf=mobile.frameLocator('#activity-frame');await mf.locator('.choice').first().waitFor();
    assert(await mobile.frame({url:/activity.html/}).evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Phone activity overflows horizontally');
    await mobile.screenshot({path:'tests/house-phone-activity.png'});await mobile.locator('#close-activity').tap();
    // The tap's follow-up click must not fall through to the Rooms button under it.
    await mobile.waitForTimeout(600);
    assert(await mobile.locator('#rooms').isHidden(),'Closing an activity by touch opened Rooms (ghost click)');
    assert(await mobile.evaluate(()=>houseTest.state.active),'Closing an activity by touch did not return to walking');
    await phone.close();console.log('PASS phone touch walking and learning activity');
    console.log('ERRORS',JSON.stringify(errors));assert.deepEqual(errors,[]);
  }catch(e){console.log('ERRORS',JSON.stringify(errors));await page.screenshot({path:'tests/house-failure.png',timeout:10000}).catch(()=>{});throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
