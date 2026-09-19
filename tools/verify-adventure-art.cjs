// Browser verification for EVERY adventure node, including loading and failures.
// Use installed Playwright via NODE_PATH and Chrome; never downloads a runtime.
const { chromium } = require('playwright');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
function allowed() {
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
  if (hour >= 6 && hour < 10) throw Error('Daily 06:00–10:00 computer-use restriction is active.');
}
const server = http.createServer((req, res) => {
  let file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
  const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg' };
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
(async () => {
  let browser;
  try {
    allowed();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ channel: 'chrome', headless: true,
      args: ['--disk-cache-size=1048576', '--media-cache-size=1048576'] });
    const page = await browser.newPage({ viewport: { width: 1100, height: 1000 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => localStorage.setItem('adv-voice', 'off'));
    allowed();
    await page.goto(origin + '/games/adventure/');
    assert.equal(await page.locator('.story-card').count(), 6);
    await page.waitForFunction(() => [...document.querySelectorAll('.cover img')].length === 6 && [...document.querySelectorAll('.cover img')].every(img => img.complete && img.naturalWidth > 0));
    assert.equal(await page.locator('svg, canvas').count(), 0);
    const stories = await page.evaluate(() => window.STORIES.map(s => ({ id: s.id, start: s.start, nodes: Object.fromEntries(Object.entries(s.nodes).map(([id, n]) => [id, { img: n.img, choices: n.choices }])) })));
    let visited = 0;
    for (const story of stories) {
      const routes = new Map([[story.start, []]]);
      const queue = [story.start];
      while (queue.length) {
        const id = queue.shift();
        for (const [index, ch] of (story.nodes[id].choices || []).entries()) {
          if (!routes.has(ch.to)) { routes.set(ch.to, [...routes.get(id), index]); queue.push(ch.to); }
        }
      }
      for (const [id, node] of Object.entries(story.nodes)) {
        allowed();
        assert(node.img, `Missing generated image: ${story.id}/${id}`);
        assert(routes.has(id), `Unreachable illustrated page ${story.id}/${id}`);
        await page.goto(origin + '/games/adventure/');
        await page.locator('.story-card').nth(stories.indexOf(story)).click();
        for (const index of routes.get(id)) { allowed(); await page.locator('#choices > button').nth(index).click(); }
        await page.waitForFunction(src => { const img = document.querySelector('#scene-art img'); return img?.getAttribute('src') === src && img.complete && img.naturalWidth > 0; }, node.img);
        assert.equal(await page.locator('svg, canvas').count(), 0);
        assert.equal(await page.locator('#choices > button').count() > 0, true);
        visited++;
      }
    }
    // Mobile: opening scene retains its whole 4:3 composition without overflow.
    allowed();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(origin + '/games/adventure/');
    await page.locator('.story-card').first().click();
    await page.locator('#scene-art img').waitFor();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const evidence = process.env.ADVENTURE_ART_EVIDENCE;
    if (evidence) { allowed(); await page.screenshot({ path: evidence, fullPage: true }); }
    // Network failure offers retry and never displays a vector illustration.
    allowed();
    await page.route('**/rainbow-flower.webp', route => route.abort());
    await page.locator('#choices > button').nth(1).click();
    await page.locator('#scene-art [role="button"]').waitFor();
    assert.equal(await page.locator('#scene-art img').count(), 0);
    assert.equal(await page.locator('svg, canvas').count(), 0);
    await page.unroute('**/rainbow-flower.webp');
    await page.locator('#scene-art [role="button"]').click();
    await page.waitForFunction(() => document.querySelector('#scene-art img')?.naturalWidth > 0);
    // Delayed previous page cannot overwrite the illustration after Back.
    allowed();
    await page.locator('#back-btn').click();
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    let requested;
    const seen = new Promise(resolve => { requested = resolve; });
    await page.route('**/rainbow-flower.webp', async route => { requested(); await gate; await route.continue(); });
    await page.locator('#choices > button').nth(1).click();
    await seen;
    assert.equal(await page.locator('#scene-art svg, #scene-art canvas, #scene-art img').count(), 0);
    await page.locator('#back-btn').click();
    const completed = page.waitForResponse('**/rainbow-flower.webp');
    release();
    await (await completed).finished();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.waitForFunction(() => document.querySelector('#scene-art img')?.getAttribute('src') === 'art/generated/rainbow-meet.webp');
    await page.unroute('**/rainbow-flower.webp');
    allowed();
    await page.goto(origin + '/');
    assert(await page.locator('a[href="games/adventure/"]').count() > 0);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ illustratedPagesVisited: visited, cards: 6, mobileOverflow: false, failureRetry: 'passed', staleImageGuard: 'passed', consoleErrors: errors }));
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
