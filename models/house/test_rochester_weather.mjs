// Deterministic Rochester weather/solar tests. No network, browser, or game-save writes.
// Run: node --test models/house/test_rochester_weather.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as THREE from '../../house-test/vendor/three.module.min.js';
import {createShelterMask,createPrecipitation} from '../../house-test/precipitation.mjs';
import {kimBoxes,kimRooms} from '../../house-test/master-kim-layout.mjs';
import {rooms} from '../../house-test/rooms.mjs';
import {
  ROCHESTER,CACHE_KEY,WEATHER_URL,REFRESH_MS,RETRY_MS,FRESH_MS,MAX_AGE_MS,
  rochesterClock,solarPosition,mapWeather,parseWeather,previewWeather,
  createWeatherClient,createRochesterEnvironment,weatherLabel,
} from '../../house-test/rochester-weather.mjs';
const instant=Date.parse('2026-06-21T17:12:00Z');
function payload(now=instant,changes={}){
  return {current:{time:now/1000,temperature_2m:74,precipitation:0,snowfall:0,
    weather_code:0,cloud_cover:0,wind_speed_10m:0,wind_direction_10m:0,...changes}};
}
const response=data=>({ok:true,json:async()=>data});
function memory(initial={}){
  const values=new Map(Object.entries(initial)),writes=[];
  return {getItem:key=>values.get(key)??null,setItem(key,value){values.set(key,value);writes.push(key);},values,writes};
}
const cached=(data=payload(),fetchedAt=instant)=>JSON.stringify({version:1,payload:data,fetchedAt});
const near=(actual,expected,tolerance=.01)=>assert(Math.abs(actual-expected)<=tolerance,`${actual} differs from ${expected} by more than ${tolerance}`);

test('fixed Rochester request has explicit UTC timestamps/units and no device location',()=>{
  assert.deepEqual(ROCHESTER,{latitude:43.1566,longitude:-77.6088,timeZone:'America/New_York'});
  const url=new URL(WEATHER_URL),q=url.searchParams;
  assert.equal(url.origin,'https://api.open-meteo.com');
  assert.equal(q.get('latitude'),String(ROCHESTER.latitude));assert.equal(q.get('longitude'),String(ROCHESTER.longitude));
  assert.equal(q.get('timeformat'),'unixtime');assert.equal(q.get('timezone'),'GMT');
  assert.equal(q.get('temperature_unit'),'fahrenheit');assert.equal(q.get('wind_speed_unit'),'ms');
  assert.equal(q.has('apikey'),false);
});

test('solar solstices put Rochester noon south at latitude/declination-derived heights',()=>{
  // At local solar noon altitude = 90 - latitude + declination. Solstice
  // declination is about +/-23.44 degrees; these UTC times bracket solar noon.
  const summer=solarPosition(instant),winter=solarPosition(Date.parse('2026-12-21T17:08:00Z'));
  near(summer.elevation,90-ROCHESTER.latitude+23.44,.15);
  near(winter.elevation,90-ROCHESTER.latitude-23.44,.15);
  for(const sun of [summer,winter]){
    near(sun.azimuth,180,1);near(Math.hypot(...sun.direction),1,1e-12);
    assert(sun.direction[1]>0&&sun.direction[2]>0);assert.equal(sun.daylight,true);assert.equal(sun.time,'day');
  }
});

test('sun rises east, sets west, and twilight/night use elevation rather than fixed hours',()=>{
  const morning=solarPosition(Date.parse('2026-03-20T12:00:00Z'));
  const evening=solarPosition(Date.parse('2026-03-20T22:00:00Z'));
  assert(morning.direction[0]>0&&morning.azimuth<180);
  assert(evening.direction[0]<0&&evening.azimuth>180);
  const dawn=solarPosition(Date.parse('2026-06-21T09:30:00Z'));
  const dusk=solarPosition(Date.parse('2026-06-22T01:00:00Z'));
  const midnight=solarPosition(Date.parse('2026-06-21T04:00:00Z'));
  assert.equal(dawn.time,'dawn');assert.equal(dusk.time,'dusk');
  assert.equal(midnight.time,'night');assert.equal(midnight.daylight,false);assert(midnight.direction[1]<0);
  // Winter 6pm local is dark; summer 6pm local is still daylight.
  assert.equal(solarPosition(Date.parse('2026-12-21T23:00:00Z')).daylight,false);
  assert.equal(solarPosition(Date.parse('2026-06-21T22:00:00Z')).daylight,true);
});

test('Rochester clocks cross DST gaps/folds and local date/season boundaries',()=>{
  const clock=iso=>rochesterClock(Date.parse(iso));
  assert.deepEqual([clock('2026-03-08T06:59:00Z').hour,clock('2026-03-08T06:59:00Z').minute],[1,59]);
  assert.equal(clock('2026-03-08T07:00:00Z').hour,3);
  assert.match(clock('2026-03-08T07:00:00Z').label,/EDT/);
  assert.deepEqual([clock('2026-11-01T05:59:00Z').hour,clock('2026-11-01T06:00:00Z').hour],[1,1]);
  assert.match(clock('2026-11-01T05:59:00Z').label,/EDT/);assert.match(clock('2026-11-01T06:00:00Z').label,/EST/);
  assert.equal(clock('2026-01-01T02:00:00Z').date,'2025-12-31');
  assert.equal(clock('2026-06-01T03:59:00Z').season,'spring');assert.equal(clock('2026-06-01T04:00:00Z').season,'summer');
  assert.equal(clock('2026-09-01T04:00:00Z').season,'autumn');assert.equal(clock('2026-12-01T05:00:00Z').season,'winter');
  assert.equal(clock('2026-03-01T05:00:00Z').season,'spring');
});

test('sun and Rochester clock are independent of the viewing device timezone',()=>{
  const moduleUrl=new URL('../../house-test/rochester-weather.mjs',import.meta.url).href;
  const source=`import {solarPosition,rochesterClock} from ${JSON.stringify(moduleUrl)};console.log(JSON.stringify([solarPosition(${instant}),rochesterClock(${instant})]));`;
  const expected=JSON.stringify([solarPosition(instant),rochesterClock(instant)]);
  for(const timezone of ['UTC','Pacific/Auckland','America/Los_Angeles']){
    const child=spawnSync(process.execPath,['--input-type=module','-e',source],{env:{...process.env,TZ:timezone},encoding:'utf8',timeout:5000});
    assert.equal(child.status,0,child.stderr);assert.equal(child.stdout.trim(),expected);
  }
});

test('weather code families and wind/cloud thresholds map without losing zero values',()=>{
  for(const code of [71,73,75,77,85,86])assert.equal(mapWeather(code,1,15).precipitation,'snow');
  for(const code of [51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99])assert.equal(mapWeather(code,1,15).precipitation,'rain');
  for(const code of [45,48])assert.equal(mapWeather(code,1,15).description,'Fog');
  assert.equal(mapWeather(0,0,0).weather,'sunny');assert.equal(mapWeather(1,.2,2).weather,'sunny');
  assert.equal(mapWeather(2,.4,2).weather,'cloudy');assert.equal(mapWeather(3,1,2).description,'Overcast');
  assert.equal(mapWeather(0,.65,2).weather,'cloudy');assert.equal(mapWeather(0,0,8).weather,'windy');
  assert.equal(mapWeather(0,0,7.99).weather,'sunny');assert.equal(mapWeather(61,1,30).weather,'rainy');
  assert.equal(mapWeather(66,1,0).description,'Freezing rain');assert.equal(mapWeather(56,1,0).description,'Freezing drizzle');
  for(const code of [-1,4,999,'0',null,NaN])assert.throws(()=>mapWeather(code,0,0));
  const clear=parseWeather(payload(),instant);assert.equal(clear.cloudCover,0);assert.equal(clear.windSpeed,0);assert.equal(clear.windDirection,0);
  const mixed=parseWeather(payload(instant,{weather_code:63,precipitation:1,snowfall:.2}),instant);
  assert.equal(mixed.weather,'snowy');assert.equal(mixed.description,'Wintry mix');
});

test('payload validation rejects absent, malformed, future and expired observations',()=>{
  for(const data of [null,{}, {current:null}])assert.throws(()=>parseWeather(data,instant));
  for(const changes of [{time:'1'},{time:NaN},{weather_code:4},{weather_code:1.5},{cloud_cover:101},
    {cloud_cover:null},{wind_speed_10m:-1},{wind_direction_10m:361},{temperature_2m:'74'},
    {precipitation:null},{snowfall:-1},{time:(instant+6*60e3)/1000},{time:(instant-MAX_AGE_MS-1)/1000}]){
    assert.throws(()=>parseWeather(payload(instant,changes),instant),JSON.stringify(changes));
  }
  assert.equal(parseWeather(payload(instant-15*60e3),instant).observedAt,instant-15*60e3);
});

test('fresh cached weather starts offline, throttles refresh, and touches only weather storage',async()=>{
  let time=instant,calls=0;
  const store=memory({[CACHE_KEY]:cached(),'craepets.house.v1.cory':'private game fixture'});
  const client=createWeatherClient({now:()=>time,storage:store,fetchFn:async()=>{calls++;return response(payload(time));}});
  assert.equal(client.snapshot().status,'live');await client.refresh();assert.equal(calls,0);
  time+=REFRESH_MS;await client.refresh();assert.equal(calls,1);assert.deepEqual(store.writes,[CACHE_KEY]);
  assert.equal(store.values.get('craepets.house.v1.cory'),'private game fixture');client.stop();
});

test('failed refresh retains original stale observation then recovers after retry deadline',async()=>{
  let time=instant,calls=0,fail=false;
  const client=createWeatherClient({now:()=>time,fetchFn:async()=>{calls++;if(fail)throw Error('offline');return response(payload(time));}});
  await client.refresh();const original=client.snapshot();assert.equal(original.status,'live');
  time+=REFRESH_MS;fail=true;await client.refresh();
  assert.equal(client.snapshot().status,'stale');assert.equal(client.snapshot().observedAt,original.observedAt);assert.equal(client.snapshot().fetchedAt,original.fetchedAt);
  await client.refresh();assert.equal(calls,2);time+=RETRY_MS-1;await client.refresh();assert.equal(calls,2);
  time++;fail=false;await client.refresh();assert.equal(calls,3);assert.equal(client.snapshot().status,'live');assert.equal(client.snapshot().observedAt,time);client.stop();
});

test('cache naturally ages to stale then unavailable even without refresh',()=>{
  let time=instant;const client=createWeatherClient({now:()=>time,storage:memory({[CACHE_KEY]:cached()}),fetchFn:async()=>response(payload(time))});
  time+=FRESH_MS+1;assert.equal(client.snapshot().status,'stale');
  time=instant+MAX_AGE_MS+1;const expired=client.snapshot();assert.equal(expired.status,'unavailable');assert.equal(expired.precipitation,null);assert.equal(expired.temperature,null);client.stop();
});

test('old observation remains stale even when freshly fetched',async()=>{
  const old=instant-FRESH_MS-1;
  const client=createWeatherClient({now:()=>instant,fetchFn:async()=>response(payload(old))});
  await client.refresh();assert.equal(client.snapshot().status,'stale');assert.equal(client.snapshot().observedAt,old);client.stop();
});

test('corrupt, wrong-version, future and expired caches do not prevent recovery',async()=>{
  for(const raw of ['{bad',JSON.stringify({version:2,payload:payload(),fetchedAt:instant}),cached(payload(),instant+6*60e3),cached(payload(instant-MAX_AGE_MS-1),instant),cached(payload(),instant-MAX_AGE_MS-1)]){
    let calls=0;const client=createWeatherClient({now:()=>instant,storage:memory({[CACHE_KEY]:raw}),fetchFn:async()=>{calls++;return response(payload());}});
    assert.equal(client.snapshot().status,'unavailable');await client.refresh();assert.equal(calls,1);assert.equal(client.snapshot().status,'live');client.stop();
  }
});

test('storage read/write failures preserve usable in-memory weather',async()=>{
  const client=createWeatherClient({now:()=>instant,storage:{getItem(){throw Error('denied');},setItem(){throw Error('quota');}},fetchFn:async()=>response(payload())});
  assert.equal(client.snapshot().status,'unavailable');await client.refresh();assert.equal(client.snapshot().status,'live');client.stop();
});

test('concurrent refresh calls share one request with privacy-preserving options',async()=>{
  let calls=0,resolveFetch;
  const client=createWeatherClient({now:()=>instant,fetchFn:(url,options)=>{calls++;assert.equal(url,WEATHER_URL);assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');assert(options.signal instanceof AbortSignal);return new Promise(resolve=>{resolveFetch=resolve;});}});
  const first=client.refresh(),second=client.refresh();assert.equal(first,second);await Promise.resolve();assert.equal(calls,1);assert.equal(client.snapshot().status,'loading');
  resolveFetch(response(payload()));await first;assert.equal(client.snapshot().status,'live');client.stop();
});

test('HTTP, malformed JSON, and missing fields become unavailable and recover',async()=>{
  for(const bad of [{ok:false,json:async()=>payload()},{ok:true,json:async()=>{throw Error('bad json');}},response({})]){
    let time=instant,fail=true;
    const client=createWeatherClient({now:()=>time,fetchFn:async()=>fail?bad:response(payload(time))});
    await client.refresh();assert.equal(client.snapshot().status,'unavailable');
    fail=false;time+=RETRY_MS;await client.refresh();assert.equal(client.snapshot().status,'live');client.stop();
  }
});

test('synchronously throwing fetch can recover after retry without a stuck in-flight promise',async()=>{
  let time=instant,fail=true,calls=0;
  const client=createWeatherClient({now:()=>time,fetchFn:()=>{calls++;if(fail)throw Error('sync failure');return Promise.resolve(response(payload(time)));}});
  await client.refresh();assert.equal(client.snapshot().status,'unavailable');
  fail=false;time+=RETRY_MS;await client.refresh();assert.equal(calls,2);assert.equal(client.snapshot().status,'live');client.stop();
});

test('request and body decoding deadlines abort hung work and permit recovery',async()=>{
  for(const hangBody of [false,true]){
    let time=instant,fail=true,signal;
    const client=createWeatherClient({now:()=>time,timeoutMs:8,fetchFn:(_url,options)=>{
      signal=options.signal;if(!fail)return Promise.resolve(response(payload(time)));
      return hangBody?Promise.resolve({ok:true,json:()=>new Promise(()=>{})}):new Promise(()=>{});
    }});
    await client.refresh();assert.equal(signal.aborted,true);assert.equal(client.snapshot().status,'unavailable');
    fail=false;time+=RETRY_MS;await client.refresh();assert.equal(client.snapshot().status,'live');client.stop();
  }
});

test('stopping a client prevents late results/storage writes and future requests',async()=>{
  let calls=0,resolveFetch,signal;
  const store=memory();const client=createWeatherClient({now:()=>instant,storage:store,fetchFn:(_url,options)=>{calls++;signal=options.signal;return new Promise(resolve=>{resolveFetch=resolve;});}});
  const pending=client.refresh();await Promise.resolve();client.stop();assert.equal(signal.aborted,true);
  resolveFetch(response(payload()));await pending;await client.refresh();assert.equal(calls,1);assert.deepEqual(store.writes,[]);assert.equal(client.snapshot().status,'unavailable');
});

test('preview presets are explicit, deterministic, and invalid ones are ignored',()=>{
  for(const weather of ['sunny','cloudy','rainy','snowy','windy'])assert.equal(previewWeather(weather).weather,weather);
  for(const invalid of ['storm','__proto__','constructor','',null])assert.equal(previewWeather(invalid),null);
});

test('weather and phase pins work independently and bypass network when previewing',async()=>{
  let calls=0;const client={refresh:async()=>{calls++;},snapshot:()=>({...previewWeather('cloudy'),status:'live'})};
  const env=query=>createRochesterEnvironment({query:new URLSearchParams(query),client,now:()=>instant});
  const weatherOnly=env('weather=rainy');await weatherOnly.refresh();
  assert.equal(weatherOnly.snapshot().status,'preview');assert.equal(weatherOnly.snapshot().weather,'rainy');assert.deepEqual(weatherOnly.snapshot().sun,solarPosition(instant));assert.equal(weatherOnly.snapshot().phaseOverride,null);
  const phaseOnly=env('phase=night');await phaseOnly.refresh();assert.equal(phaseOnly.snapshot().weather,'sunny');assert.equal(phaseOnly.snapshot().time,'night');assert.equal(phaseOnly.snapshot().sun,null);
  const both=env('phase=dusk&weather=snowy');await both.refresh();assert.equal(both.snapshot().time,'dusk');assert.equal(both.snapshot().weather,'snowy');assert.equal(calls,0);
  const invalid=env('phase=wrong&weather=wrong');await invalid.refresh();assert.equal(calls,1);assert.equal(invalid.snapshot().weatherOverride,false);assert.equal(invalid.snapshot().phaseOverride,null);assert.deepEqual(invalid.snapshot().sun,solarPosition(instant));
});

test('unavailable weather still has current astronomical time and honest localized labels',()=>{
  let time=instant;const client=createWeatherClient({now:()=>time,fetchFn:async()=>{throw Error('offline');}});
  const environment=createRochesterEnvironment({client,now:()=>time});
  const first=environment.snapshot();assert.equal(first.status,'unavailable');assert.equal(first.time,'day');assert.match(weatherLabel(first),/Rochester, NY.*EDT.*Weather unavailable/);
  time=Date.parse('2026-06-22T04:00:00Z');assert.equal(environment.snapshot().time,'night');assert.equal(environment.snapshot().sun.daylight,false);
  const base={...parseWeather(payload(),instant),local:rochesterClock(instant)};
  assert.match(weatherLabel({...base,status:'live'}),/74°F.*Updated/);
  assert.match(weatherLabel({...base,status:'stale'}),/Cached Jun 21/);
  assert.match(weatherLabel({...base,status:'preview',temperature:null}),/Preview/);
  assert.match(weatherLabel({...base,status:'loading'}),/Loading weather/);client.stop();
});

function houseShelter(){
  const data=JSON.parse(readFileSync(new URL('../../house-test/house.json',import.meta.url),'utf8'));
  const bytes=gunzipSync(readFileSync(new URL('../../house-test/house.mesh.gz',import.meta.url)));
  const mask=createShelterMask([...data.colliders,...kimBoxes]),roofs=createShelterMask();
  let faces=0;
  for(const group of data.groups)if(/roof|ceiling/i.test(group.name)){
    const array=new Float32Array(bytes.buffer,bytes.byteOffset+group.offset,group.count*6);
    mask.addRoof(array);roofs.addRoof(array);faces+=group.count/3;
  }
  return {mask,roofs,faces};
}
function withSeed(fn){
  const random=Math.random;let seed=0x12345678;
  Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  try{return fn();}finally{Math.random=random;}
}

test('shelter grid handles negative coordinates, overlapping heights, roof faces, and bad geometry',()=>{
  const mask=createShelterMask([{min:[-2,1,-2],max:[-.8,2,-.8]}],.5);
  assert.equal(mask.height(-1.5,-1.5),2);assert.equal(mask.height(4,4),-1);
  mask.add([-1.5,2,-1.5],[-1,4,-1]);assert.equal(mask.height(-1.25,-1.25),4);
  mask.add([0,0,0],[NaN,4,2]);assert.equal(mask.height(0,0),-1);
  // A sloping roof triangle is conservatively filled to its maximum height.
  mask.addRoof(Float32Array.from([3,3,3,0,1,0, 5,5,3,0,1,0, 3,3,5,0,1,0]));
  assert.equal(mask.height(3.25,3.25),5);assert.equal(mask.height(4.75,4.75),5);
  assert.equal(mask.height(10,10),-1);
});

test('real exported roofs shelter house, garage, porch, and studio while leaving yards open',()=>{
  const {mask,roofs,faces}=houseShelter();assert(faces>0,'No exported roof faces tested');
  const indoor=rooms.filter(row=>['Main floor','Upstairs','Downstairs','Basement'].includes(row[0]));
  for(const row of [...indoor,rooms.find(row=>row[1]==='Front porch'),...kimRooms]){
    const [,,x,planY,floor]=row,z=-planY;
    assert(mask.height(x,z)>floor+1.3,`${row[1]} lacks shelter above a pet's head`);
    // Arrival spots can differ from the room station; cover both paths.
    if(row[6])assert(mask.height(row[6][0],-row[6][1])>floor+1.3,`${row[1]} arrival lacks shelter`);
  }
  for(const [name,x,z] of [['Garage',-2.5,-5.4],['Front porch',4.2,1.1],['Living room',5.8,-2]]){
    assert(roofs.height(x,z)>2,`${name} roof was not rasterized from exported geometry`);
  }
  for(const name of ['Front yard','Back yard']){
    const row=rooms.find(r=>r[1]===name);assert(mask.height(row[2],-row[3])<row[4]+.5,`${name} was incorrectly roofed`);
  }
  assert.equal(mask.height(100,100),-1,'Far outdoors should be open');
});

test('precipitation is one reusable draw with desktop/mobile bounds and no motion when reduced',()=>withSeed(()=>{
  for(const [options,limit] of [[{},360],[{mobile:true},160],[{reducedMotion:true},0],[{mobile:true,reducedMotion:true},0]]){
    const scene=new THREE.Scene(),effect=createPrecipitation(scene,options);
    assert.equal(scene.children.length,1);const mesh=scene.children[0],geometry=mesh.geometry,material=mesh.material;
    assert.equal(mesh.visible,false);assert.equal(effect.diagnostics().limit,limit);
    for(const precipitation of ['rain','snow',null,'rain']){
      effect.set({precipitation,windSpeed:10,windDirection:270});effect.tick({x:100,y:2,z:100},1/30);
      const state=effect.diagnostics();assert.equal(state.particles,precipitation?limit:0);
      assert.equal(mesh.visible,!!precipitation&&limit>0);assert.equal(geometry.drawRange.count,state.particles);
      assert.equal(mesh.geometry,geometry);assert.equal(mesh.material,material);assert.equal(scene.children.length,1);
      assert.equal(state.sheltered,0);if(precipitation&&limit)assert(state.visible>0);
    }
    let geometryDisposed=false,materialDisposed=false;
    geometry.addEventListener('dispose',()=>{geometryDisposed=true;});material.addEventListener('dispose',()=>{materialDisposed=true;});
    effect.dispose();assert.equal(scene.children.length,0);assert(geometryDisposed&&materialDisposed);
  }
}));

test('seeded rain and snow stay above real shelter across room jumps, wind, and extended updates',()=>withSeed(()=>{
  const {mask}=houseShelter();
  for(const mobile of [false,true])for(const kind of ['rain','snow']){
    const scene=new THREE.Scene(),effect=createPrecipitation(scene,{mobile});effect.setShelter(mask);
    effect.set({precipitation:kind,windSpeed:12,windDirection:270});
    const samples=['Garage','Front porch','Living room','Basement playroom',"Master Kim's dojang",'Shoe & gear room','Front yard','Back yard'];
    for(const name of samples){
      const row=rooms.find(r=>r[1]===name),camera={x:row[2],y:row[4]+1.3,z:-row[3]};
      for(let step=0;step<100;step++){
        effect.tick(camera,step===0?10:1/30);
        assert.equal(effect.diagnostics().sheltered,0,`${name}: ${kind} entered shelter`);
        const positions=scene.children[0].geometry.attributes.position;
        for(let i=0;i<positions.count;i++){
          const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
          assert(Number.isFinite(x)&&Number.isFinite(y)&&Number.isFinite(z));
          if(y>-999)assert(y>mask.height(x,z)+.11,`${name}: visible particle below shelter`);
        }
      }
    }
    effect.dispose();
  }
}));

test('particles disappear beneath a complete roof and resume outdoors without a room-name change',()=>withSeed(()=>{
  const scene=new THREE.Scene(),effect=createPrecipitation(scene);
  const mask=createShelterMask([{min:[-20,19,-20],max:[20,20,20]}]);effect.setShelter(mask);
  effect.set({precipitation:'rain',windSpeed:0,windDirection:0});effect.tick({x:0,y:2,z:0},.03);
  assert.equal(effect.diagnostics().visible,0);assert.equal(effect.diagnostics().sheltered,0);
  effect.tick({x:80,y:2,z:80},.03);assert(effect.diagnostics().visible>0);assert.equal(effect.diagnostics().sheltered,0);effect.dispose();
}));

test('meteorological wind from east moves falling particles west',()=>withSeed(()=>{
  const scene=new THREE.Scene(),effect=createPrecipitation(scene);
  effect.set({precipitation:'snow',windSpeed:10,windDirection:90});
  const camera={x:100,y:2,z:100};effect.tick(camera,0);
  const positions=scene.children[0].geometry.attributes.position;
  const before={x:positions.getX(0),y:positions.getY(0),z:positions.getZ(0)};
  effect.tick(camera,.05);
  assert(positions.getX(0)<before.x);near(positions.getZ(0),before.z,.0001);assert(positions.getY(0)<before.y);effect.dispose();
}));
