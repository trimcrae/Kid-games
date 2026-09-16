// The phone HUD beside something to use (September 16): "Switch off the family
// room fan" once grew into a giant oval over the middle of an iPhone screen,
// with the jump tip floating on it. Opened from the game with the whole HUD
// showing — the way back, the jump tip, the things to do here and the pill —
// on a short Safari-sized phone, a tall one, narrow and small ones and sideways
// (and on a mouse screen, where the jump tip used to cover the pill):
// - the pill is compact (at least 44px to tap, never a slab over the house),
//   stays on screen and clear of the middle of the view;
// - no two HUD pieces overlap (pad, paw, top bar, way back, tip, bubble, pill);
// - a longer label behaves too, and tapping the pill switches the fan.
// HUD_SHOTS=<dir> also saves a screenshot of each.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const base=process.env.HOUSE_BASE||'http://127.0.0.1:8765';
const shots=process.env.HUD_SHOTS||'';
const FAN={x:12.24,y:-1.05,z:-2.3};
const PHONES=[
  {name:'safari-short',viewport:{width:394,height:640}},
  {name:'tall',viewport:{width:390,height:844}},
  {name:'narrow',viewport:{width:360,height:640}},
  {name:'small',viewport:{width:320,height:568}},
  {name:'landscape',viewport:{width:844,height:390}},
  {name:'landscape-small',viewport:{width:667,height:375}},
  // And a mouse screen, where the pill sits in the middle over the bubble.
  {name:'desktop',viewport:{width:1280,height:800},mouse:true},
  {name:'desktop-small',viewport:{width:1024,height:640},mouse:true},
];
const HUD=['#player-chip','.actions','#pet-needs','#back-to-game','#journey','#coach','#hint','#nearby','#interact','#joystick','#jump'];
// Every HUD piece that is showing, with its box.
const boxes=page=>page.evaluate(sel=>{
  const out={};
  for(const s of sel){const el=document.querySelector(s);if(!el)continue;const cs=getComputedStyle(el);
    if(el.hidden||cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0)continue;
    const r=el.getBoundingClientRect();if(!r.width||!r.height)continue;
    out[s]={x:r.x,y:r.y,w:r.width,h:r.height};}
  return out;
},HUD);
const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
function check(name,vp,b,worst=false,mouse=false){
  const bad=[];
  const pill=b['#interact'];
  if(!pill)return ['the pill is not showing'];
  if(pill.w<44||pill.h<44)bad.push(`pill ${pill.w.toFixed(0)}×${pill.h.toFixed(0)} is under 44px`);
  if(pill.h>96)bad.push(`pill is ${pill.h.toFixed(0)}px tall`);
  if(pill.w*pill.h>.08*vp.width*vp.height)bad.push(`pill covers ${(100*pill.w*pill.h/(vp.width*vp.height)).toFixed(0)}% of the screen`);
  if(pill.x<0||pill.y<0||pill.x+pill.w>vp.width||pill.y+pill.h>vp.height)bad.push('pill runs off the screen');
  // Nothing stretched between a top and a bottom inset (the September 16 bug).
  for(const [s,max] of [['#coach',130],['#hint',130],['#nearby',200],['#back-to-game',60],['#journey',70]])
    if(b[s]?.h>max)bad.push(`${s} is stretched to ${b[s].h.toFixed(0)}px`);
  const cx=vp.width/2,cy=vp.height/2;
  // It keeps to the right-hand column the things-to-do bubble always used; with a
  // real label and one thing to do it also stays off the very middle.
  if(!mouse&&pill.x<.4*vp.width)bad.push('pill reaches into the middle of the view');
  if(!worst&&cx>pill.x&&cx<pill.x+pill.w&&cy>pill.y&&cy<pill.y+pill.h)bad.push('pill covers the middle of the view');
  // (The top bar's own two halves are its business: on a narrow phone the
  // round buttons already sat over the end of the pet's name before the pill.)
  const keys=Object.keys(b);
  for(let i=0;i<keys.length;i++)for(let j=i+1;j<keys.length;j++){
    if(keys[i]==='#player-chip'&&keys[j]==='.actions')continue;
    const o=overlap(b[keys[i]],b[keys[j]]);if(o>1)bad.push(`${keys[i]} overlaps ${keys[j]} (${o.toFixed(0)}px²)`);}
  return bad.map(s=>`${name}: ${s}`);
}
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,
    args:shots?['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist']:[]});
  const errors=[];const watch=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});};
  const problems=[],results={};
  try{
    if(shots)fs.mkdirSync(shots,{recursive:true});
    // A family that plays the game: Cory's hatched pet, Mochi.
    let saved;
    {const ctx=await browser.newContext({viewport:{width:1280,height:800}}),page=await ctx.newPage();watch(page);
      await page.goto(base+'/games/craepets/');
      await page.evaluate(()=>{for(const k of Object.keys(localStorage))if(k.startsWith('craepets'))localStorage.removeItem(k);localStorage.setItem('craepets.who','cory');});
      await page.reload();await page.waitForFunction(()=>window.Craepets&&Craepets.state());await page.evaluate(()=>Craepets._events(false));
      await page.locator('#pet-name').fill('Mochi');await page.locator('#do-adopt').click();
      await page.locator('[data-tapegg]').click({clickCount:8,delay:130});
      saved=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('craepets')).map(k=>[k,localStorage.getItem(k)])));
      // Walking is learned; the jump tip is next (it shows for 12 seconds).
      saved['craepets.house.coach']=JSON.stringify({walk:1});
      await ctx.close();}
    for(const phone of PHONES){
      const ctx=await browser.newContext(phone.mouse?{viewport:phone.viewport}:{viewport:phone.viewport,isMobile:true,hasTouch:true,deviceScaleFactor:2});
      await ctx.addInitScript(s=>{if(!sessionStorage.getItem('seeded')){for(const [k,v] of Object.entries(s))localStorage.setItem(k,v);sessionStorage.setItem('seeded','1');}},saved);
      const page=await ctx.newPage();watch(page);
      await page.goto(base+'/house-test/?from=game');
      await page.waitForFunction(()=>window.houseTest?.state.ready,{},{timeout:90000});
      await page.frame({url:/activity.html/}).evaluate(()=>Craepets._events(false));
      assert(await page.evaluate(()=>document.body.classList.contains('from-game')),'Not opened as the game edition');
      await (phone.mouse?page.locator('#start').click():page.locator('#start').tap());
      // Between the room's own spot (its things to do) and the fan: in reach of both.
      assert(await page.evaluate(()=>houseTest.go('Family room')),'No family room');
      const spot=await page.evaluate(()=>houseTest.state.position);
      const d=Math.hypot(spot.x-FAN.x,spot.z-FAN.z),t=Math.max(0,(d-1.2)/d);
      assert(d<2.6,`The family room spot is ${d.toFixed(2)} m from the fan`);
      const mid={x:spot.x+(FAN.x-spot.x)*t,y:FAN.y,z:spot.z+(FAN.z-spot.z)*t};
      assert(await page.evaluate(m=>houseTest.go(m),mid),'Could not stand by the family room fan');
      // (The room name toast fades on its own.)
      await page.waitForFunction(()=>!document.querySelector('.location.show'),{},{timeout:8000});await page.waitForTimeout(450);
      // The fan pill, the jump tip and the room's things to do, all at once.
      await page.waitForFunction(()=>houseTest.state.interactions?.near==='fan-family'&&!document.getElementById('coach').hidden&&!document.getElementById('nearby').hidden,{},{timeout:8000})
        .catch(async e=>{console.log(phone.name,JSON.stringify(await page.evaluate(()=>({pos:houseTest.state.position,near:houseTest.state.interactions?.near,coach:document.getElementById('coach').textContent,coachHidden:document.getElementById('coach').hidden,nearby:document.getElementById('nearby').hidden,acts:document.getElementById('nearby-actions').textContent}))));throw e;});
      const vp=phone.viewport;
      const b=await boxes(page);
      if(shots)await page.screenshot({path:path.join(shots,`${phone.name}.png`)});
      const found=check(phone.name,vp,b,false,phone.mouse);
      assert.match(await page.locator('#coach').textContent(),/jump/i,'The jump tip is not the one showing');
      // A label longer than any there is yet, over two things to do (as in the
      // living room): the pill stays tidy and the stack clear of the rest.
      // (The pill rewrites its label as you move, so the test label is held.)
      const longest=await page.evaluate(()=>{const l=document.getElementById('interact-label'),was=l.textContent,long='🌀 Switch off the family room ceiling fan';l.textContent=long;
        window.hudHold=new MutationObserver(()=>{if(l.textContent!==long)l.textContent=long;});hudHold.observe(l,{childList:true,characterData:true,subtree:true});
        const extra=document.querySelector('#nearby-actions button').cloneNode();extra.id='hud-test-extra';extra.textContent='🛋️ Furnish & decorate';document.getElementById('nearby-actions').append(extra);return was;});
      const bl=await boxes(page);
      if(shots)await page.screenshot({path:path.join(shots,`${phone.name}-long.png`)});
      found.push(...check(phone.name+' (long label, two things to do)',vp,bl,true,phone.mouse));
      await page.evaluate(was=>{hudHold.disconnect();document.getElementById('interact-label').textContent=was;document.getElementById('hud-test-extra').remove();},longest);
      problems.push(...found);
      // Tapping the pill switches the fan (a real tap: it must be showing and on top).
      const before=await page.locator('#interact-label').textContent();
      if(b['#interact']){
        await (phone.mouse?page.locator('#interact').click():page.locator('#interact').tap());
        await page.waitForFunction(was=>document.getElementById('interact-label').textContent!==was,before,{timeout:3000})
          .catch(()=>problems.push(`${phone.name}: tapping the pill did not switch the fan`));
      }
      const after=await page.locator('#interact-label').textContent();
      results[phone.name]={pill:b['#interact']&&Object.fromEntries(Object.entries(b['#interact']).map(([k,v])=>[k,Math.round(v)])),longPill:bl['#interact']&&{w:Math.round(bl['#interact'].w),h:Math.round(bl['#interact'].h)},before,after,acts:await page.locator('#nearby-actions').innerText(),at:mid,showing:Object.keys(b)};
      await ctx.close();
    }
    console.log(JSON.stringify(results,null,1));
    assert.deepEqual(problems,[],'HUD problems');
    assert.deepEqual(errors,[]);
    console.log('PASS phone HUD by the family room fan (short Safari, tall, narrow, small, sideways large and small) and on a mouse screen: compact pill, nothing overlaps, long label tidy, tap switches the fan');
  }catch(e){console.error(e);console.log('ERRORS',errors);process.exitCode=1;}
  finally{await browser.close();}
})();
