// Default browser graphics: regression for the world-map GPU freeze.
// Run with the repository served at PHOTO_BASE (default localhost:8766).
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const base = process.env.PHOTO_BASE || 'http://127.0.0.1:8766';

(async () => {
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
  assert(hour < 6 || hour >= 10, 'Computer-use tests are restricted from 06:00 to 10:00 New York time.');
  const server = await chromium.launchServer({
    executablePath: process.env.CHROMIUM_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  // A GPU hang must not leave an owned browser consuming RAM after this test.
  const watchdog = setTimeout(() => {
    console.error('Browser loading watchdog expired');
    if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(server.process().pid), '/T', '/F'], { stdio: 'ignore' });
    else server.process().kill('SIGKILL');
  }, 30000);
  const browser = await chromium.connect(server.wsEndpoint());
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.setDefaultTimeout(8000);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', async d => { errors.push(d.message()); await d.dismiss(); });
    // Observe map rendering without changing the canvas context or GPU mode.
    await page.addInitScript(() => {
      window.mapPaints = 0;
      const drawImage = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (...args) {
        if (this.canvas.id === 'worldmap') window.mapPaints++;
        return drawImage.apply(this, args);
      };
    });
    const start = Date.now();
    await page.goto(base + '/games/photo-expedition/#pick');
    await page.locator('.explorer-btn').first().waitFor();
    assert.equal(await page.evaluate(() => mapPaints), 0, 'Map renders behind the photographer picker');
    await page.locator('.explorer-btn').first().click();
    await page.waitForFunction(() => mapPaints > 1);
    console.log('Picker and map responsive in', Date.now() - start, 'ms');
    const [x, y] = await page.evaluate(() => WorldMap.lonLatToXY(SITES[0].lon, SITES[0].lat));
    await page.locator('#worldmap').click({ position: { x, y } });
    await page.locator('#site-panel').getByRole('button', { name: /field guide/i }).click();
    await page.locator('#s-brief.show').waitFor();
    const stoppedAt = await page.evaluate(() => mapPaints);
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => mapPaints), stoppedAt, 'Hidden map is still drawing');
    await page.locator('#brief-back').click();
    await page.waitForFunction(n => mapPaints > n, stoppedAt);
    // Returning players go directly to the map, another reported freeze path.
    await page.goto(base + '/games/photo-expedition/');
    await page.locator('#s-map.show').waitFor();
    await page.waitForFunction(() => mapPaints > 1);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#btn-change').click();
    const hiddenAt = await page.evaluate(() => mapPaints);
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => mapPaints), hiddenAt);
    await page.locator('.explorer-btn').first().click();
    await page.waitForFunction(n => mapPaints > n, hiddenAt);
    assert.deepEqual(errors, []);
    if (process.env.PHOTO_SCREENSHOT) await page.screenshot({ path: process.env.PHOTO_SCREENSHOT });
    console.log('PASS: fresh load, map pins, briefing, paused hidden map, saved-player reload, phone resize');
    await page.setViewportSize({ width: 1280, height: 800 });
    // Follow the real Start button: the old shortcut missed the satellite
    // introduction, which could wait forever with its Continue button hidden.
    const pendingSatellite = [];
    await page.route('**/satellite/*.jpg', route => { pendingSatellite.push(route); });
    await page.evaluate(() => PhotoExpedition.openBrief(SITES[0]));
    await page.locator('#brief-go').click();
    await page.locator('#flyin-go').waitFor({ state: 'visible', timeout: 1000 });
    await page.locator('#flyin-scale').filter({ hasText: 'Satellite views are unavailable' }).waitFor();
    await page.locator('#flyin-go').click();
    await page.waitForFunction(() => !!PhotoExpedition.expedition);
    for (const route of pendingSatellite) await route.abort();
    await page.waitForTimeout(100);
    assert.equal(await page.locator('#flyin.show').count(), 0, 'Late image completion reopened the introduction');
    const expeditionPaints = await page.evaluate(() => mapPaints);
    await page.locator('#btn-camera').click();
    await page.locator('#shutter').click();
    await page.locator('#shot-card.show').waitFor();
    assert.equal(await page.evaluate(() => PhotoExpedition.profile.photos.length), 1);
    assert.equal(await page.evaluate(() => mapPaints), expeditionPaints, 'Map renders behind the expedition');
    await page.locator('#shot-close').click();
    await page.locator('#btn-exit').click();
    await page.locator('#sum-close').click();
    await page.locator('#btn-album').click();
    assert.equal(await page.locator('.album-item').count(), 1);
    assert.deepEqual(errors, []);
    console.log('PASS: default-graphics 3D startup, shutter, persisted photo, exit, album');
  } finally {
    await browser.close(); await server.close(); clearTimeout(watchdog);
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
