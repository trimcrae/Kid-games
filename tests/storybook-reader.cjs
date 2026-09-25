// Headless interaction/layout regression checks using an already installed browser.
const { chromium } = require('playwright-core');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
function allowed() {
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
  assert.ok(hour < 6 || hour >= 10, 'No browser use during the daily 06:00–10:00 family restriction');
}
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.webp':'image/webp', '.png':'image/png', '.mp3':'audio/mpeg' };
(async () => {
  allowed();
  const server = http.createServer((req,res) => {
    let rel = decodeURIComponent(req.url.split('?')[0]);
    if (rel.endsWith('/')) rel += 'index.html';
    const target = path.resolve(root, '.' + rel);
    if (!target.startsWith(root + path.sep)) return res.writeHead(403).end();
    fs.readFile(target,(err,data)=>{ if(err) return res.writeHead(404).end(); res.setHeader('Content-Type',mime[path.extname(target)]||'application/octet-stream'); res.end(data); });
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless:true, args:['--mute-audio'] });
  const cutoff = setInterval(() => { try { allowed(); } catch { browser.close(); } }, 1000);
  const errors = [];
  try {
    const sizes = process.argv.includes('--audio') ? [[1280,900],[390,844]] : [[1280,900],[820,1180],[390,844],[320,740]];
    for (const [width,height] of sizes) {
      allowed();
      const context = await browser.newContext({viewport:{width,height}, reducedMotion:'reduce'});
      await context.addInitScript(() => {
        const NativeAudio = window.Audio;
        window.testAudio = [];
        window.Audio = class extends NativeAudio {
          constructor(...args) { super(...args); window.testAudio.push(this); }
        };
      });
      const page = await context.newPage();
      const checkGeneratedPicture = async () => {
        await page.waitForFunction(() => {
          const img = document.querySelector('.scene-img');
          return img && img.complete && img.naturalWidth > 0;
        });
        assert.match(await page.locator('.scene-img').getAttribute('src'), /^art\/volume-two\/.+\.webp$/);
      };
      page.on('pageerror',e=>errors.push(e.message));
      page.on('response',r=>{if(r.status()>=400) errors.push(`${r.status()} ${r.url()}`);});
      await page.goto(base+'/games/spooky-stories/');
      assert.equal(await page.locator('.story-card').count(),39);
      const total = process.argv.includes('--all') && width===1280 ? 39 : 10;
      for (let i=0;i<total;i++) {
        allowed();
        await page.locator('.story-card').nth(i).click();
        if (i<10) await checkGeneratedPicture();
        if (process.argv.includes('--audio') && width===1280 && i<10) {
          await page.locator('#read-btn').click();
          await page.waitForFunction(() => window.testAudio.some(a => !a.paused && a.currentTime>0 && a.readyState>=2));
          await page.locator('#stop-btn').click();
          assert.ok(await page.evaluate(() => window.testAudio.every(a => a.paused)), 'Stop silences the narration');
        }
        await page.locator('#transcript summary').click();
        const firstText = await page.locator('#page-text').textContent();
        assert.ok((await page.locator('#transcript-copy').textContent()).includes(firstText));
        await page.locator('#transcript summary').click();
        // Read both boxes in the same frame; collapsing the transcript can scroll.
        const {art,copy} = await page.evaluate(() => ({
          art: document.querySelector('.stage').getBoundingClientRect().toJSON(),
          copy: document.querySelector('.page-copy').getBoundingClientRect().toJSON()
        }));
        if(width>760) assert.ok(art.x+art.width<=copy.x+1,'Facing pages');
        else assert.ok(art.y+art.height<=copy.y+1,'Phone stacks the spread');
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow');
        if(width===1280 && i<10 || width===390 && i===1) {
          allowed();
          await page.screenshot({path:path.join(os.tmpdir(),`volume-two-${width}-${i}.png`),fullPage:true});
        }
        if(width===1280) {
          for(let turns=0;turns<20;turns++) {
            allowed();
            if((await page.locator('#next-btn').textContent()).includes('More stories')) break;
            await page.locator('#next-btn').click();
            if (i<10) await checkGeneratedPicture();
            const visible = await page.locator('#page-text').textContent();
            assert.ok((await page.locator('#transcript-copy').textContent()).includes(visible));
          }
          assert.ok(await page.locator('#again-btn').isVisible());
          await page.locator('#quiz-btn').click();
          assert.ok(await page.locator('.qa').count()>=2);
          if(i<10) {
            while(!(await page.locator('#quiz-done').isVisible())) {
              allowed();
              await page.locator('.qa[data-correct="1"]').click();
              await page.waitForTimeout(850);
            }
          }
        }
        await page.locator('#home-btn').click();
      }
      if(width===1280) {
        allowed();
        await page.goto(base+'/games/spooky-stories/picture-book-test/');
        await page.waitForURL('**/#shy-shadow');
        assert.match(await page.locator('#reader-title').textContent(),/Shy Shadow/);
        await page.goto(base+'/');
        assert.ok(await page.locator('a[href="games/spooky-stories/"]').count()>0,'Arcade listing');
      }
      await context.close();
      console.log(`PASS: ${width}px reader, ${total} books, transcript and responsive spread.`);
    }
    assert.deepEqual(errors,[],'No page errors or failed asset responses');
  } finally { clearInterval(cutoff); await browser.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(e=>{console.error(e);process.exitCode=1;});
