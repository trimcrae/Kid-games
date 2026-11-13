#!/usr/bin/env node
'use strict';
// Cloud Chromium/GitHub Actions smoke; two full-house loads plus small fixtures.
// CHROMIUM_PATH=/usr/bin/chromium node tests/house-weather-browser.cjs
// HOUSE_BASE=https://trimcrae.github.io/Kid-games checks deployed assets.
// LIVE_WEATHER_SMOKE=1 also records a real Open-Meteo browser request separately.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright-core');
const ROOT=path.resolve(__dirname,'..'),OUT=process.env.WEATHER_EVIDENCE_DIR||'/tmp/rochester-weather';
const API='https://api.open-meteo.com/',CACHE_KEY='craepets.rochester-weather.v1';
const SUMMER=Date.parse('2026-06-21T17:12:00Z'),WINTER=Date.parse('2026-12-22T02:00:00Z');
const MIME={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json','.mp3':'audio/mpeg','.gz':'application/gzip'};
const metrics={startedAt:new Date().toISOString(),fixture:[],house:[],errors:[]};
function payload(now,kind='rain'){
  return {current:{time:now/1000,temperature_2m:kind==='snow'?28:74,precipitation:1,
    snowfall:kind==='snow'?.2:0,weather_code:kind==='snow'?73:63,cloud_cover:100,wind_speed_10m:8,wind_direction_10m:270}};
}
async function startServer(){
  const server=http.createServer(async(req,res)=>{
    try{
      let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      if(pathname.endsWith('/'))pathname+='index.html';
      const file=path.resolve(ROOT,'.'+pathname);
      if(!file.startsWith(ROOT+path.sep))return res.writeHead(403).end();
      const bytes=await fs.readFile(file);
      res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream'}).end(bytes);
    }catch{res.writeHead(404).end();}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  return server;
}
function watch(page,{allowWeatherFailure=false}={}){
  const errors=[],weatherErrors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{
    if(message.type()!=='error')return;
    const text=message.text(),url=message.location().url;
    // Only expected API resource failures are ignored. Shader errors and every
    // other console/JS error remain fatal, even during the unavailable test.
    if(allowWeatherFailure&&((url.startsWith(API)&&/^Failed to load resource:/.test(text))||(/^Access to fetch at /.test(text)&&text.includes(API)))){weatherErrors.push({text,url});return;}
    errors.push({text,url});
  });
  return {errors,weatherErrors};
}
async function installFixture(page,base){
  const url=base+'/__weather_fixture__.html';
  await page.route(url,route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>Rochester weather verification</title><style>body{margin:0;background:#c9d5db;font:16px sans-serif}canvas{display:block}pre{padding:18px;white-space:pre-wrap}</style><pre id="result">Checking Rochester weather…</pre>'}));
  await page.goto(url,{waitUntil:'domcontentloaded'});
}
async function clickReal(page,selector,mobile){
  const hit=await page.evaluate(selector=>{
    const element=document.querySelector(selector);if(!element)return {missing:true};
    element.scrollIntoView({behavior:'instant',block:'center'});
    const r=element.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
    return {x,y,enabled:!element.disabled,visible:r.width>0&&r.height>0&&getComputedStyle(element).visibility==='visible',hit:element.contains(document.elementFromPoint(x,y))};
  },selector);
  assert(hit.enabled&&hit.visible&&hit.hit,`${selector} is not accessible: ${JSON.stringify(hit)}`);
  if(mobile)await page.touchscreen.tap(hit.x,hit.y);else await page.mouse.click(hit.x,hit.y);
}
async function contractChecks(browser,base){
  const context=await browser.newContext({viewport:{width:900,height:650},serviceWorkers:'block'});
  const page=await context.newPage(),events=watch(page,{allowWeatherFailure:true});
  let mode='error',requests=0;
  await page.route(API+'**',route=>{
    requests++;
    return route.fulfill({status:mode==='error'?503:200,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:mode==='error'?JSON.stringify({error:true,reason:'Deterministic unavailable fixture'}):JSON.stringify(payload(SUMMER))});
  });
  try{
    await installFixture(page,base);
    const unavailable=await page.evaluate(async({base,now,key})=>{
      const m=await import(base+'/house-test/rochester-weather.mjs');localStorage.removeItem(key);
      const client=m.createWeatherClient({storage:localStorage,now:()=>now,timeoutMs:3000});
      const env=m.createRochesterEnvironment({client,now:()=>now});await env.refresh();
      const state=env.snapshot(),result={state,label:m.weatherLabel(state)};client.stop();return result;
    },{base,now:SUMMER,key:CACHE_KEY});
    assert.equal(unavailable.state.status,'unavailable');assert.equal(unavailable.state.precipitation,null);
    assert.equal(unavailable.state.time,'day');assert.match(unavailable.label,/Weather unavailable/);
    assert.equal(requests,1);metrics.fixture.push({case:'http-503-unavailable',...unavailable});
    const stale=await page.evaluate(async({base,now,key,data})=>{
      const m=await import(base+'/house-test/rochester-weather.mjs'),old=now-60*60e3;
      data.current.time=old/1000;const raw=JSON.stringify({version:1,payload:data,fetchedAt:old});localStorage.setItem(key,raw);
      const client=m.createWeatherClient({storage:localStorage,now:()=>now,timeoutMs:3000});
      const env=m.createRochesterEnvironment({client,now:()=>now});await env.refresh();
      const state=env.snapshot(),result={state,label:m.weatherLabel(state),cacheUnchanged:localStorage.getItem(key)===raw};client.stop();return result;
    },{base,now:SUMMER,key:CACHE_KEY,data:payload(SUMMER)});
    assert.equal(stale.state.status,'stale');assert.equal(stale.state.weather,'rainy');assert(stale.cacheUnchanged);
    assert.equal(stale.state.observedAt,SUMMER-60*60e3);assert.match(stale.label,/Cached/);assert.equal(requests,2);
    metrics.fixture.push({case:'cached-weather-http-503',...stale});
    const previews=await page.evaluate(async({base,now,key})=>{
      const m=await import(base+'/house-test/rochester-weather.mjs');localStorage.removeItem(key);
      const result=[];
      for(const query of ['weather=rainy','phase=night','phase=dusk&weather=snowy']){
        const client=m.createWeatherClient({storage:localStorage,now:()=>now});
        const env=m.createRochesterEnvironment({query:new URLSearchParams(query),client,now:()=>now});
        await env.refresh();const state=env.snapshot();result.push({query,state,label:m.weatherLabel(state)});client.stop();
      }
      return result;
    },{base,now:SUMMER,key:CACHE_KEY});
    assert.equal(requests,2,'Preview made an unexpected weather request');
    assert.equal(previews[0].state.weather,'rainy');assert.equal(previews[0].state.time,'day');assert(previews[0].state.sun.elevation>69);
    assert.equal(previews[1].state.time,'night');assert.equal(previews[1].state.weather,'sunny');assert.equal(previews[1].state.sun,null);
    assert.equal(previews[2].state.time,'dusk');assert.equal(previews[2].state.weather,'snowy');
    for(const preview of previews){assert.equal(preview.state.status,'preview');assert.match(preview.label,/Preview/);}
    metrics.fixture.push({case:'independent-preview-pins',previews});
    await page.locator('#result').evaluate((element,text)=>{element.textContent=text;},JSON.stringify({unavailable,stale,previews},null,2));
    await page.screenshot({path:path.join(OUT,'weather-failure-and-preview-contracts.png')});
    assert.deepEqual(events.errors,[],'Unexpected browser errors in weather failure/preview cases');
    console.log('PASS browser weather: HTTP503 unavailable, stale cache retained, independent previews, no preview requests');
  }finally{await context.close();}
}
async function shaderChecks(browser,base){
  const context=await browser.newContext({viewport:{width:720,height:480},serviceWorkers:'block'});
  const page=await context.newPage(),events=watch(page);
  try{
    await installFixture(page,base);
    const result=await page.evaluate(async({base,utc})=>{
      const THREE=await import(base+'/house-test/vendor/three.module.min.js');
      const {createHouseLighting}=await import(base+'/house-test/lighting.mjs');
      const {createPrecipitation}=await import(base+'/house-test/precipitation.mjs');
      const {solarPosition,createRochesterEnvironment,previewWeather}=await import(base+'/house-test/rochester-weather.mjs');
      const check=(ok,message)=>{if(!ok)throw Error(message);};
      const same=(a,b)=>a.every((v,i)=>Math.abs(v-b[i])<1e-10);
      document.querySelector('#result').remove();
      const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(720,480);
      renderer.toneMapping=THREE.AgXToneMapping;document.body.append(renderer.domElement);
      const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(55,1.5,.05,150);
      camera.position.set(0,2,8);camera.lookAt(0,1,0);
      const floor=new THREE.Mesh(new THREE.BoxGeometry(15,.1,15),new THREE.MeshStandardMaterial({color:'#75845e'}));floor.receiveShadow=true;scene.add(floor);
      const ball=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),new THREE.MeshStandardMaterial({color:'#caa879'}));ball.position.y=1;ball.castShadow=true;scene.add(ball);
      const lighting=createHouseLighting(scene,renderer,{camera}),rain=createPrecipitation(scene);
      lighting.load({colliders:[],lights:[]});lighting.setRoom('Front yard',{x:0,y:0,z:0});
      const client={snapshot:()=>({...previewWeather('sunny'),status:'live'}),refresh:async()=>{}};
      const env=createRochesterEnvironment({client,now:()=>utc});lighting.setClock(()=>env.snapshot());
      const start=performance.now(),player={x:0,y:0,z:0};lighting.tick(player,start,false);
      rain.set(previewWeather('rainy'));rain.tick(camera.position,.03);renderer.render(scene,camera);
      const initial=lighting.diagnostics(),sun=scene.children.find(child=>child.isDirectionalLight);
      check(same(initial.sunDirection,solarPosition(utc).direction),'Rendered sun disagrees with astronomical direction');
      check(initial.moonVisible===false,'Live daylight drew a fictional moon');
      check(sun.shadow.needsUpdate===false,'Initial shadow render did not finish');
      utc+=10*60e3;lighting.tick(player,start+3000,false);
      const throttled=lighting.diagnostics();check(same(initial.sunDirection,throttled.sunDirection),'Sun shadow moved before its refresh cadence');
      check(sun.shadow.needsUpdate===false,'Unchanged shadow map redrew too early');
      lighting.tick(player,start+61000,false);const moved=lighting.diagnostics();
      check(!same(initial.sunDirection,moved.sunDirection),'Sun did not move within the day phase');
      check(same(moved.sunDirection,solarPosition(utc).direction),'Updated sun direction is wrong');
      check(sun.shadow.needsUpdate===true,'Moved sun did not invalidate its shadow map');
      renderer.render(scene,camera);
      utc=Date.parse('2026-12-22T02:00:00Z');lighting.tick(player,start+65000,false);
      rain.set(previewWeather('snowy'));rain.tick(camera.position,.03);renderer.render(scene,camera);
      const night=lighting.diagnostics();check(night.timeOfDay==='night'&&night.lightLevels.sun===0,'Winter night has direct sunlight');
      check(night.moonVisible===false,'Live winter night drew an inaccurate moon');
      const gl=renderer.getContext(),pixels=new Uint8Array(720*480*4);gl.readPixels(0,0,720,480,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      let low=255,high=0;for(let i=0;i<pixels.length;i+=4){low=Math.min(low,pixels[i]);high=Math.max(high,pixels[i]);}
      const glError=gl.getError();check(glError===0,'WebGL error '+glError);check(high-low>15,'Fixture rendered flat or empty');
      const result={initial,throttled,moved,night,glError,pixelRange:high-low,drawCalls:renderer.info.render.calls,programs:renderer.info.programs.length,precipitation:rain.diagnostics()};
      // Leave the final rendered frame for the screenshot. Context close frees GPU resources.
      return result;
    },{base,utc:SUMMER});
    await page.screenshot({path:path.join(OUT,'weather-real-webgl-night.png')});
    assert.deepEqual(events.errors,[],'Weather shaders produced browser errors');metrics.fixture.push({case:'real-webgl-sun-throttle-and-snow',...result});
    console.log('PASS real WebGL: accurate sun direction, bounded shadow refresh, within-phase movement, night sun off, no moon, rain/snow shaders');
  }finally{await context.close();}
}
async function houseCheck(browser,base,mobile){
  const time=mobile?WINTER:SUMMER,kind=mobile?'snow':'rain',tag=mobile?'mobile-winter-snow':'desktop-summer-rain';
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1024,height:640},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1,serviceWorkers:'block',timezoneId:'Pacific/Auckland'});
  const page=await context.newPage(),events=watch(page);page.setDefaultTimeout(45000);let requests=0;
  const original=JSON.stringify({v:1,pet:{name:'Untouched valley save',species:'blorb',colour:'sky'},coins:137});
  await page.clock.setFixedTime(new Date(time));
  await context.addInitScript(({original})=>{
    localStorage.setItem('craepets.house.who','tristan');
    localStorage.setItem('craepets.house.v1.tristan',JSON.stringify({v:1,pet:{name:'Weather Scout',species:'blorb',colour:'sky'},coins:20}));
    localStorage.setItem('craepets.v1.tristan',original);
    window.__weatherGeoCalls=0;
    if(navigator.geolocation)for(const method of ['getCurrentPosition','watchPosition'])navigator.geolocation[method]=()=>{window.__weatherGeoCalls++;throw Error('Device location must not be requested');};
  },{original});
  await page.route(API+'**',route=>{
    requests++;return route.fulfill({status:200,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:JSON.stringify(payload(time,kind))});
  });
  const started=Date.now();
  try{
    console.log('Checking full house '+tag);
    await page.goto(base+'/house-test/?pr=.6',{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForFunction(()=>window.houseTest?.state.ready||window.houseBoot?.state==='failed',null,{polling:100,timeout:120000});
    const boot=await page.evaluate(()=>({ready:!!window.houseTest?.state.ready,state:window.houseBoot?.state,stage:window.houseBoot?.stage,errors:window.houseBoot?.errors,detail:document.querySelector('#boot-detail')?.textContent}));
    assert(boot.ready,'House failed to load: '+JSON.stringify({boot,errors:events.errors}));
    await page.waitForFunction(()=>window.houseTest.state.rochester.status==='live',null,{polling:100,timeout:10000});
    await clickReal(page,'#start',mobile);
    await page.waitForFunction(()=>window.houseTest.state.active,null,{polling:100,timeout:10000});
    const views=[];
    const route=mobile?['Back yard',"Master Kim's dojang",'Living room']:['Front yard','Garage','Front porch','Living room'];
    for(const room of route){
      const before=await page.evaluate(()=>houseTest.state.framesDrawn);
      assert.equal(await page.evaluate(room=>houseTest.go(room),room),true,'Could not visit '+room);
      await page.waitForFunction(before=>houseTest.state.framesDrawn>=before+2,before,{polling:100,timeout:30000});
      const state=await page.evaluate(()=>houseTest.state);
      assert.equal(state.weather,mobile?'snowy':'rainy');assert.equal(state.timeOfDay,mobile?'night':'day');
      assert.equal(state.rochester.status,'live');assert.equal(state.rochester.local.season,mobile?'winter':'summer');
      assert.equal(state.rochester.local.hour,mobile?21:13,'Clock used the viewer timezone');
      assert.equal(state.moonVisible,false);assert.equal(state.precipitation.kind,kind);
      assert.equal(state.precipitation.particles,mobile?160:360);assert.equal(state.precipitation.sheltered,0);
      assert(state.drawCalls>0&&state.triangles>0);assert(state.camera.every(Number.isFinite));
      assert(Math.hypot(...state.sunDirection.map((v,i)=>v-state.rochester.sun.direction[i]))<1e-8,'Light/sky sun disagrees with clock');
      if(mobile){assert.equal(state.lightLevels.sun,0);assert(state.rochester.sun.elevation<0);}else assert(state.rochester.sun.elevation>69);
      if(/yard/i.test(room))assert(state.precipitation.visible>0,'Outdoor precipitation is missing');
      if(room==='Living room')assert(state.lightLevels.hemisphere>=.3,'Interior became unreadably dark');
      views.push({room,weather:state.weather,timeOfDay:state.timeOfDay,solarElevation:state.solarElevation,sunDirection:state.sunDirection,precipitation:state.precipitation,lightLevels:state.lightLevels,drawCalls:state.drawCalls,triangles:state.triangles,programs:state.programs,pixelRatio:state.pixelRatio});
      if(room===route[0]||room==='Living room')await page.screenshot({path:path.join(OUT,tag+'-'+(room==='Living room'?'indoors':'outdoors')+'.png')});
    }
    assert.match(await page.locator('#weather-condition').innerText(),mobile?/Snow/:/Rain/);
    await clickReal(page,'#weather-info summary',mobile);assert.equal(await page.locator('#weather-info').getAttribute('open'),'');
    assert.match(await page.locator('#weather-report').innerText(),/Rochester, NY.*Updated/);
    assert.equal(await page.locator('#weather-info a[href="https://open-meteo.com/"]').count(),1);
    const bounds=await page.locator('#weather-info').boundingBox();assert(bounds&&bounds.x>=0&&bounds.x+bounds.width<=(mobile?390:1024)+1,'Weather details overflow the viewport');
    await page.screenshot({path:path.join(OUT,tag+'-weather-details.png')});
    assert.equal(await page.evaluate(()=>window.__weatherGeoCalls),0);
    assert.equal(await page.evaluate(()=>localStorage.getItem('craepets.v1.tristan')),original,'Weather smoke changed the original valley save');
    assert.equal(requests,1,'Weather refresh was not cached/throttled');assert.deepEqual(events.errors,[],'Full-house browser errors');
    metrics.house.push({case:tag,time:new Date(time).toISOString(),requests,elapsedMs:Date.now()-started,views});
    console.log('PASS '+tag+': real Start, '+route.join(', ')+', weather details, no sheltered particles, untouched valley save');
  }catch(error){
    metrics.errors.push({case:tag,error:error.stack,browserErrors:events.errors});
    await page.screenshot({path:path.join(OUT,tag+'-failure.png'),timeout:10000}).catch(()=>{});throw error;
  }finally{await context.close();}
}
async function liveWeatherCheck(browser,base){
  const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();
  const events=watch(page,{allowWeatherFailure:true}),transport={responses:[],failures:[]};
  page.on('response',response=>{if(response.url().startsWith(API))transport.responses.push({url:response.url(),status:response.status()});});
  page.on('requestfailed',request=>{if(request.url().startsWith(API))transport.failures.push({url:request.url(),error:request.failure()?.errorText});});
  try{
    await installFixture(page,base);
    const result=await page.evaluate(async base=>{
      const m=await import(base+'/house-test/rochester-weather.mjs');
      const client=m.createWeatherClient({storage:null,timeoutMs:10000});
      const env=m.createRochesterEnvironment({client});await env.refresh();
      const state=env.snapshot(),result={state,label:m.weatherLabel(state)};client.stop();return result;
    },base);
    metrics.live={...result,transport,networkErrors:events.weatherErrors};assert.deepEqual(events.errors,[]);
    // External uptime is recorded honestly; deterministic checks above are the
    // release gate. An outage must still produce an explicit unavailable state.
    assert(['live','stale','unavailable'].includes(result.state.status));
    if(result.state.status==='unavailable')assert.match(result.label,/Weather unavailable/);
    console.log('LIVE API '+result.state.status+': '+result.label+' · HTTP '+JSON.stringify(transport));
  }finally{await context.close();}
}
(async()=>{
  await fs.mkdir(OUT,{recursive:true});let server,browser;
  try{
    if(!process.env.HOUSE_BASE)server=await startServer();
    const base=(process.env.HOUSE_BASE||'http://127.0.0.1:'+server.address().port).replace(/\/$/,'');metrics.base=base;
    browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
    await contractChecks(browser,base);await shaderChecks(browser,base);
    await houseCheck(browser,base,false);await houseCheck(browser,base,true);
    if(process.env.LIVE_WEATHER_SMOKE==='1')await liveWeatherCheck(browser,base);
    metrics.passed=true;console.log('PASS Rochester weather browser suite; evidence '+OUT);
  }catch(error){metrics.passed=false;metrics.errors.push({error:error.stack});throw error;}
  finally{
    metrics.finishedAt=new Date().toISOString();await fs.writeFile(path.join(OUT,'metrics.json'),JSON.stringify(metrics,null,2)+'\n');
    await browser?.close();if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
