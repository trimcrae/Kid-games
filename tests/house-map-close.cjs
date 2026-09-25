// The map's decorative oath must never cover its visible close button.
// Run with HOUSE_BASE and, optionally, HOUSE_SEED pointing to a JSON object
// of localStorage entries from a house save with an adopted pet.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const port = Number(process.env.HOUSE_PORT || 8766);
const base = `http://127.0.0.1:${port}`;
const seedPath = process.env.HOUSE_SEED;
const root = path.resolve(__dirname, '..');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

(async () => {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, base);
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const file = path.resolve(root, relative.endsWith('/') || !relative ? path.join(relative, 'index.html') : relative);
    if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    const stream = fs.createReadStream(file);
    stream.on('error', () => response.writeHead(404).end());
    stream.on('open', () => { response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }); stream.pipe(response); });
  });
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  try {
    let seed;
    if (seedPath) {
      seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    } else {
      const context = await browser.newContext({ viewport: { width: 1360, height: 900 } });
      const page = await context.newPage();
      await page.goto(base + '/house-test/');
      await page.waitForFunction(() => window.houseTest?.state.ready, null, { timeout: 90000 });
      await page.frame({ url: /activity.html/ }).evaluate(() => Craepets._events(false));
      await page.locator('#start').click();
      await page.locator('[data-profile="cory"]').click();
      const activity = page.frameLocator('#activity-frame');
      await activity.locator('#pet-name').fill('Map Tester');
      await activity.locator('#do-adopt').click();
      await activity.locator('[data-tapegg]').click({ clickCount: 8, delay: 120 });
      await page.locator('#close-activity').click();
      seed = await page.evaluate(() => Object.fromEntries(
        Object.keys(localStorage).filter(k => k.startsWith('craepets')).map(k => [k, localStorage.getItem(k)])
      ));
      await context.close();
    }

    for (const [name, options, action] of [
      ['desktop', { viewport: { width: 1360, height: 900 } }, 'click'],
      ['phone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, 'tap'],
    ]) {
      const context = await browser.newContext(options);
      await context.addInitScript(entries => {
        for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
      }, seed);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base + '/house-test/');
      await page.waitForFunction(() => window.houseTest?.state.ready, null, { timeout: 90000 });
      await page.frame({ url: /activity.html/ }).evaluate(() => Craepets._events(false));
      await page.locator('#start')[action]();
      await page.locator('#map-button')[action]();
      await page.locator('#map').waitFor({ state: 'visible' });
      const close = page.locator('#close-map');
      assert(await close.isVisible(), `${name}: map close button is not visible`);
      const hit = await close.evaluate(button => {
        const rect = button.getBoundingClientRect();
        return document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)?.id;
      });
      assert.equal(hit, 'close-map', `${name}: another element covers the close button`);
      await close[action]({ timeout: 5000 });
      await page.locator('#map').waitFor({ state: 'hidden', timeout: 5000 });
      assert.equal(await page.locator('#map-button').getAttribute('aria-expanded'), 'false');
      assert.deepEqual(errors, [], `${name}: page errors`);
      await context.close();
      console.log(`PASS map close: ${name} ${action}`);
    }
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
