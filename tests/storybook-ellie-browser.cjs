'use strict';
// Exercise the actual reader, including interrupted/repeated young-reader flows.
const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const data={window:{FAMILY_STORIES:[]}};
vm.runInNewContext(fs.readFileSync(path.join(root,'games/spooky-stories/ellie-stories.js'),'utf8'),data);
const books=data.window.ELLIE_STORIES;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg'};
(async()=>{
  let browser;
  const server=http.createServer((req,res)=>{
    let rel=decodeURIComponent(req.url.split('?')[0]); if(rel.endsWith('/')) rel+='index.html';
    const target=path.resolve(root,'.'+rel);
    if(!target.startsWith(root+path.sep)) return res.writeHead(403).end();
    fs.readFile(target,(err,content)=>{if(err)return res.writeHead(404).end();res.setHeader('Content-Type',mime[path.extname(target)]||'application/octet-stream');res.end(content);});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const output=process.env.STORYBOOK_SCREENSHOTS||path.join(os.tmpdir(),'storybook-ellie');
  fs.mkdirSync(output,{recursive:true});
  try {
    browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),args:['--mute-audio']});
    for(const width of [1280,390]) {
      const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<500,isMobile:width<500,reducedMotion:'reduce'});
      const page=await context.newPage(); const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
      const activate=async(selector)=>width<500?page.locator(selector).tap():page.locator(selector).click();
      const picture=async(story,n)=>{
        await page.waitForFunction(()=>{const img=document.querySelector('.scene-img');return img&&img.complete&&img.naturalWidth>0;});
        assert.equal(await page.locator('.scene-img').getAttribute('src'),story.pages[n].img);
        assert.equal(await page.locator('#page-art').getAttribute('aria-label'),story.pages[n].alt);
        assert.equal(await page.locator('#page-text').textContent(),story.pages[n].text);
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow');
      };
      await page.goto(base+'/');
      assert.ok(await page.locator('a[href="games/spooky-stories/"]').count(),'Visible from arcade');
      await page.goto(base+'/games/spooky-stories/');
      assert.equal(await page.locator('.story-card').count(),42);
      await page.screenshot({path:path.join(output,`${width}-library.png`),fullPage:true});
      for(const [index,story] of books.entries()) {
        await activate(`.story-card:nth-child(${index+1})`);
        await picture(story,0);
        assert.ok(await page.locator('#prev-btn').isDisabled());
        await page.screenshot({path:path.join(output,`${width}-${story.id}.png`),fullPage:true});
        await activate('#next-btn'); await activate('#next-btn'); await picture(story,2);
        await activate('#prev-btn'); await picture(story,1);
        await activate('#home-btn');
        assert.match(await page.locator('.story-card').nth(index).textContent(),/Keep reading/);
        await page.reload(); await activate(`.story-card:nth-child(${index+1})`); await picture(story,1);
        await page.reload(); await picture(story,1); // hash + local bookmark restore
        for(let n=2;n<6;n++){await activate('#next-btn');await picture(story,n);}
        await activate('#next-btn');
        assert.equal(await page.locator('#page-text').textContent(),story.ending);
        await activate('#quiz-btn');
        const question=await page.locator('#quiz-ask').textContent();
        const wrong = page.locator('.qa:not([data-correct="1"])').first();
        if(width<500) await wrong.tap(); else await wrong.click();
        assert.equal(await page.locator('#quiz-ask').textContent(),question,'Wrong choice keeps the question open');
        assert.equal(await page.locator('.qa.wrong:disabled').count(),1);
        await activate('.qa[data-correct="1"]');
        // Closing immediately must cancel a queued next-question callback.
        await activate('#home-btn'); await page.waitForTimeout(900);
        assert.ok(await page.locator('#quiz').isHidden());
        await activate(`.story-card:nth-child(${index+1})`); await picture(story,0);
        for(let n=0;n<6;n++) await activate('#next-btn');
        await activate('#quiz-btn');
        for(let q=0;q<2;q++){await activate('.qa[data-correct="1"]');await page.waitForTimeout(900);}
        assert.ok(await page.locator('#quiz-done').isVisible());
        await activate('#again-btn'); await picture(story,0);
        assert.ok(await page.locator('#quiz').isHidden());
        await activate('#home-btn'); await page.reload();
        const rewards=await page.evaluate(id=>({done:JSON.parse(localStorage.getItem('spooky-stories-done'))[id],badge:JSON.parse(localStorage.getItem('spooky-stories-quiz'))[id]}),story.id);
        assert.deepEqual(rewards,{done:true,badge:true},'Sticker and thinking-cap badge survive reload');
      }
      assert.deepEqual(errors,[],'No script errors or missing assets');
      await context.close();
      console.log(`PASS: ${width}px Ellie stories, every illustration, touch/mouse, bookmark/reload, Back, quiz recovery, replay and saved rewards.`);
    }
  } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
