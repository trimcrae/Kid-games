// The arcade card says what is new (September 15): a game may carry a short
// `flag:` in assets/js/games.js, and the landing page shows it as a pill above
// the title. Craepets carries the house walk. The cards are titles only —
// no paragraph descriptions.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.HOUSE_BASE||'http://127.0.0.1:8765';
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const errors=[];
  try{
    for(const [label,opts] of [['desktop',{viewport:{width:1280,height:800}}],['phone',{viewport:{width:390,height:844},isMobile:true,hasTouch:true}]]){
      const ctx=await browser.newContext(opts),page=await ctx.newPage();
      page.on('pageerror',e=>errors.push(label+': '+e.message));page.on('console',m=>{if(m.type()==='error')errors.push(label+': '+m.text());});
      await page.goto(base+'/');
      const card=page.locator('.game-card',{has:page.locator('h2',{hasText:'Craepets'})}).first();
      await card.waitFor();
      const flag=card.locator('.new-flag');
      assert.equal(await flag.count(),1,label+': the Craepets card has no flag');
      assert.match(await flag.textContent(),/NEW/,label+': the flag does not say what is new');
      assert.match(await flag.textContent(),/house|3D/i,label+': the flag does not mention the house walk');
      assert(await flag.isVisible(),label+': the flag is not visible');
      // It sits above the title, not buried in the blurb.
      const [flagBox,titleBox]=[await flag.boundingBox(),await card.locator('h2').boundingBox()];
      assert(flagBox.y<titleBox.y,label+': the flag is not above the title');
      // No paragraph descriptions on any card — the cards are emoji, title,
      // optional flag and the age badge.
      assert.equal(await page.locator('.game-card p').count(),0,label+': a card still shows a paragraph description');
      // Every other card is unchanged: no stray flags.
      assert.equal(await page.locator('.new-flag').count(),1,label+': another card grew a flag');
      assert((await page.locator('.game-card').count())>20,label+': the arcade lost cards');
      await ctx.close();
    }
    assert.deepEqual(errors,[]);
    console.log('PASS arcade: the Craepets card shows "NEW · Walk around our house in 3D" above the title on desktop and phone, no card carries a paragraph description, and no other card changed');
  }catch(e){console.error(e);console.log('ERRORS',errors);process.exitCode=1;}
  finally{await browser.close();}
})();
