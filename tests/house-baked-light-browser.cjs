// Baked bounce light in a real browser (September 16). A good bake loads and
// follows the time of day; ?bake=0 asks for nothing; a missing or corrupt bake
// — or a bake for another mesh — still opens the house on its usual light,
// with a warning, never a hung loading card.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.HOUSE_BASE||'http://127.0.0.1:8765';
const seed=()=>{if(sessionStorage.getItem('seeded'))return;sessionStorage.setItem('seeded','1');
  localStorage.setItem('craepets.house.who','tristan');
  localStorage.setItem('craepets.house.v1.tristan',JSON.stringify({v:1,pet:{name:'Test',species:'craepet',colour:'blue',egg:false},coins:20}));};
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const results={};
  const visit=async(query,route)=>{
    const ctx=await browser.newContext({viewport:{width:1100,height:700}});await ctx.addInitScript(seed);
    const page=await ctx.newPage();const log=[],asked=[];
    page.on('pageerror',e=>log.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')log.push(m.type()+': '+m.text());});
    page.on('request',r=>{if(/house\.light/.test(r.url()))asked.push(r.url().split('/').pop());});
    if(route)await route(page);
    const t0=Date.now();
    await page.goto(`${base}/house-test/?${query}`);
    await page.waitForFunction(()=>window.houseTest?.state.ready||window.houseBoot?.state==='failed',{},{timeout:90000});
    const state=await page.evaluate(()=>({ready:!!window.houseTest?.state.ready,baked:window.houseTest?.state.bakedLight??null,phase:window.houseTest?.state.timeOfDay}));
    return {ctx,page,log,asked,state,ms:Date.now()-t0};
  };
  try{
    const manifest=await (await fetch(base+'/house-test/house.json')).json();
    const shipped=!!manifest.bakedLight;
    // 1. The shipped export: a bake loads (when it has one) and follows the phase.
    {const day=await visit('phase=day');
      assert(day.state.ready,'The house did not open');
      if(shipped){
        assert(day.state.baked&&day.state.baked.vertices===manifest.bakedLight.uv.bakedVertices,'The shipped bake did not load: '+JSON.stringify(day.state.baked));
        assert.equal(day.state.baked.blend[0],1,'Daytime did not use the day bake');
        const night=await visit('phase=night');
        assert.equal(night.state.baked.blend[0],0,'Night did not use the night bake');
        assert.deepEqual(night.log.filter(l=>/error/.test(l)),[]);await night.ctx.close();
      }else assert.equal(day.state.baked,null);
      assert.deepEqual(day.log.filter(l=>/error/.test(l)),[]);
      results.shipped={baked:day.state.baked?.vertices??0,readyMs:day.ms};await day.ctx.close();}
    // 2. ?bake=0: no lightmap requests at all, usual light.
    {const off=await visit('phase=day&bake=0');
      assert(off.state.ready&&off.state.baked===null&&off.asked.length===0,'bake=0 still loaded or requested lightmaps: '+off.asked);
      await off.ctx.close();}
    // A manifest with a bake descriptor (the shipped one, or a stand-in).
    const withBake=(change)=>async page=>page.route(/\/house-test\/house\.json(\?.*)?$/,async r=>{
      const res=await r.fetch();const json=await res.json();
      json.bakedLight??={version:1,encoding:'gamma2.2',meshSha256:json.meshSha256,
        uv:{url:'house.lightuv.gz',encoding:'uint16-pair',vertexCount:json.groups.reduce((a,g)=>a+g.count,0),bakedVertices:1,sha256:'0'.repeat(64)},
        pages:[{id:'day',url:'house.light.day.png',width:64,height:64,sha256:'0'.repeat(64),scale:1},{id:'night',url:'house.light.night.png',width:64,height:64,sha256:'0'.repeat(64),scale:1}]};
      change(json);r.fulfill({response:res,json});});
    const fallback=async(name,route)=>{
      const v=await visit('phase=day',route);
      assert(v.state.ready,name+': the house did not open');
      assert.equal(v.state.baked,null,name+': a bad bake was used');
      assert(v.log.some(l=>/Baked lighting skipped/.test(l)),name+': no warning');
      // (Chrome itself logs the 404 of a deliberately missing file.)
      assert.deepEqual(v.log.filter(l=>/pageerror|error:/.test(l)&&!/Failed to load resource: .*404/.test(l)),[],name+': errors');
      results[name]={readyMs:v.ms,warning:v.log.find(l=>/Baked/.test(l))};await v.ctx.close();
    };
    // 3. Missing files.
    await fallback('missingFiles',async page=>{await withBake(()=>{})(page);await page.route(/house\.light(uv\.gz|\.(day|night)\.png)/,r=>r.fulfill({status:404,body:''}));});
    // 4. Corrupt UVs.
    await fallback('corruptUV',async page=>{await withBake(()=>{})(page);await page.route(/house\.lightuv\.gz/,r=>r.fulfill({status:200,body:Buffer.from('not gzip at all'),contentType:'application/gzip'}));});
    // 5. A bake for another mesh.
    await fallback('otherMesh',withBake(json=>{json.bakedLight.meshSha256='f'.repeat(64);}));
    console.log('PASS baked light in the browser: '+(shipped?'the shipped bake loads and follows day/night':'no bake shipped')+'; bake=0 requests nothing; missing files, corrupt UVs and a bake for another mesh all open the house on its usual light with a warning');
    console.log(JSON.stringify(results));
  }catch(e){console.error(e);process.exitCode=1;}
  finally{await browser.close();}
})();
