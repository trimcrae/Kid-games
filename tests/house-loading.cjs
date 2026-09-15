// The house never sits on "Opening the front door…" for ever (September 15).
// Failure injection with the watchdog's quick timings (?bootwatch=fast):
// shaders that never report finished, a lost graphics context, a part that
// won't download, a part that throws while starting, and a stalled download
// that recovers. Each either opens the house or says what happened and offers
// "Try again" and the way back to the game — and "Try again" works.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.HOUSE_BASE||'http://127.0.0.1:8765';
const FAST='bootwatch=fast';
const settled=page=>page.waitForFunction(()=>window.houseTest?.state.ready||window.houseBoot?.state==='failed'||window.houseBoot?.state==='stalled',{},{timeout:90000});
const card=page=>page.evaluate(()=>({loading:document.getElementById('loading').textContent,start:document.getElementById('start').textContent,
  startDisabled:document.getElementById('start').disabled,failed:document.body.classList.contains('house-failed'),
  ready:!!window.houseTest?.state.ready,boot:{state:houseBoot.state,stage:houseBoot.stage,errors:houseBoot.errors.map(e=>e.message)},
  detail:document.getElementById('boot-detail').hidden?'':document.getElementById('boot-detail').textContent,
  backLink:(()=>{const a=document.querySelector('#welcome .back-link a');return a&&a.offsetParent!==null?a.getAttribute('href'):null;})()}));
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const results={};
  const fresh=async(init)=>{const ctx=await browser.newContext({viewport:{width:1280,height:800}});if(init)await ctx.addInitScript(init);const page=await ctx.newPage();
    const log=[];page.on('pageerror',e=>log.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')log.push(m.type()+': '+m.text());});return {ctx,page,log};};
  try{
    // 1. A normal visit opens as before, showing download progress on the way.
    // (Every text the loader hands the watchdog is recorded, not sampled from the screen.)
    {const {ctx,page,log}=await fresh(()=>{window.__seen=[];let hb;Object.defineProperty(window,'houseBoot',{configurable:true,get:()=>hb,set(v){
        for(const k of ['step','alive']){const f=v[k];v[k]=function(...a){const w=k==='step'?a[1]:a[0];if(w!=null&&window.__seen.at(-1)!==w)window.__seen.push(w);return f.apply(this,a);};}hb=v;}});});
      await page.goto(`${base}/house-test/?${FAST}`);await settled(page);const c=await card(page);
      assert(c.ready&&!c.failed&&c.boot.state==='ready'&&c.start==='Come play at home',JSON.stringify(c));
      const seen=await page.evaluate(()=>window.__seen);
      assert(seen.some(t=>/Loading rooms and gardens… \d+%/.test(t)),'No download progress shown: '+JSON.stringify(seen));
      assert.deepEqual(log.filter(l=>/pageerror|error:/.test(l)),[]);
      results.normal={stages:seen};await ctx.close();}
    // 2. Shaders whose compile never reports finished (reproduced a permanent hang on ab63d33): opens anyway.
    {const {ctx,page,log}=await fresh(()=>{for(const C of [window.WebGL2RenderingContext,window.WebGLRenderingContext]){if(!C)continue;const g=C.prototype.getProgramParameter;C.prototype.getProgramParameter=function(p,n){return n===37297?false:g.call(this,p,n);};}});
      const t0=Date.now();await page.goto(`${base}/house-test/?${FAST}`);await settled(page);const c=await card(page);
      assert(c.ready&&!c.failed,'Never-finishing shader compile still blocks the house: '+JSON.stringify(c));
      assert(log.some(l=>/Shader warm-up still running/.test(l)),'No warning about the slow warm-up');
      results.neverFinishingCompile={ms:Date.now()-t0};await ctx.close();}
    // 3. The graphics context is lost while opening: says so, and "Try again" opens the house.
    {const {ctx,page}=await fresh(()=>{if(sessionStorage.getItem('lost-once'))return;sessionStorage.setItem('lost-once','1');
        const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(...a){const c=get.apply(this,a);if(c&&this.id==='view')window.__gl=c;return c;};
        const t=setInterval(()=>{const l=document.getElementById('loading');if(window.__gl&&l&&/Loading rooms/.test(l.textContent)){clearInterval(t);window.__gl.getExtension('WEBGL_lose_context').loseContext();}},20);});
      await page.goto(`${base}/house-test/?${FAST}`);
      await page.waitForFunction(()=>window.houseBoot?.state==='failed',{},{timeout:30000});const c=await card(page);
      assert(/graphics stopped/.test(c.loading)&&c.failed&&!c.startDisabled&&c.start==='Try again'&&c.backLink,'Lost context not explained: '+JSON.stringify(c));
      assert(c.boot.errors.includes('WebGL context lost'));
      await Promise.all([page.waitForNavigation(),page.locator('#start').click()]);await settled(page);
      assert((await card(page)).ready,'"Try again" did not open the house');
      results.contextLostWhileOpening=c;await ctx.close();}
    // 4. A part that won't download (opened from the game): says so, with the way back to the game; retry works.
    {const {ctx,page}=await fresh();let block=true;
      await page.route('**/house-test/glazing.mjs',r=>block?r.fulfill({status:404,body:'missing'}):r.continue());
      await page.goto(`${base}/house-test/?from=game&${FAST}`);
      await page.waitForFunction(()=>window.houseBoot?.state==='failed',{},{timeout:30000});const c=await card(page);
      assert(/could not be downloaded/.test(c.loading)&&c.start==='Try again'&&!c.startDisabled,'Missing part not explained: '+JSON.stringify(c));
      assert.equal(c.backLink,'../games/craepets/');
      assert(await page.locator('#welcome-saves').isHidden(),'Game mode shows the house-edition save transfer when the modules never started');
      block=false;await Promise.all([page.waitForNavigation(),page.locator('#start').click()]);await settled(page);
      assert((await card(page)).ready,'Retry after a failed download did not open the house');
      results.missingModule=c;await ctx.close();}
    // 5. A part that throws while starting: says so and keeps the error for diagnosis.
    {const {ctx,page}=await fresh();
      await page.route('**/house-test/contact-shadows.mjs',async r=>{const res=await r.fetch();r.fulfill({response:res,body:(await res.text())+"\nthrow new Error('injected start-up failure');"});});
      await page.goto(`${base}/house-test/?${FAST}`);
      await page.waitForFunction(()=>window.houseBoot?.state==='failed',{},{timeout:30000});const c=await card(page);
      assert(/could not start/.test(c.loading)&&c.start==='Try again'&&/injected start-up failure/.test(c.detail)&&c.backLink,'Start-up error not explained: '+JSON.stringify(c));
      results.moduleThrows=c;await ctx.close();}
    // 6. A stalled download: "still working" with ways out, then "stopped", then it recovers when the data comes.
    {const {ctx,page}=await fresh();let release;const held=new Promise(r=>{release=r;});
      await page.route('**/house-test/house.json',async r=>{await held;await r.continue();});
      await page.goto(`${base}/house-test/?${FAST}`);
      await page.waitForFunction(()=>document.body.classList.contains('house-slow'),{},{timeout:15000});
      const slow=await card(page);
      assert(/Still working on it/.test(slow.loading)&&await page.locator('#boot-retry').isVisible()&&slow.backLink,'Slow step not explained: '+JSON.stringify(slow));
      await page.waitForFunction(()=>window.houseBoot?.state==='stalled',{},{timeout:15000});
      const stalled=await card(page);
      assert(/stopped loading/.test(stalled.loading)&&stalled.start==='Try again'&&/the house plan/.test(stalled.detail),'Stall not explained: '+JSON.stringify(stalled));
      release();await page.waitForFunction(()=>window.houseTest?.state.ready,{},{timeout:90000});
      const after=await card(page);
      assert(after.ready&&!after.failed&&after.start==='Come play at home'&&!after.detail,'Did not recover after the stall: '+JSON.stringify(after));
      results.stallThenRecover={slow:slow.loading,stalled:stalled.loading};await ctx.close();}
    // 7. The graphics context is lost after the house is ready: explained, with a reload.
    {const {ctx,page}=await fresh(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(...a){const c=get.apply(this,a);if(c&&this.id==='view')window.__gl=c;return c;};});
      await page.goto(`${base}/house-test/?${FAST}`);await settled(page);
      await page.evaluate(()=>window.__gl.getExtension('WEBGL_lose_context').loseContext());await page.waitForTimeout(300);
      const c=await card(page);
      assert(/graphics stopped/.test(c.loading)&&c.start==='Reload the house'&&!c.startDisabled&&c.failed,'Lost context after ready not explained: '+JSON.stringify(c));
      results.contextLostAfterReady=c.loading;await ctx.close();}
    console.log('PASS loading: normal visit shows progress; never-finishing shader compile opens anyway; lost graphics (opening/after), missing part, start-up error and stalled download are explained with Try again + way back; retries open the house; a stall recovers');
    console.log(JSON.stringify(results));
  }catch(e){console.error(e);process.exitCode=1;}
  finally{await browser.close();}
})();
