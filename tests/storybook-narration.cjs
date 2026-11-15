#!/usr/bin/env node
'use strict';
// Browser-level narration contract: real navigation plus controllable media events.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
let chromium;
try { ({ chromium } = require('playwright-core')); }
catch { ({ chromium } = require('playwright')); }
const root = path.resolve(__dirname, '..');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg' };

function installMediaHarness({ speechMode = 'auto', audioMode = 'auto', unsupported = false }) {
  const state = window.__narrationTest = { audioMode, speechMode, audio: [], plays: [], utterances: [], cancellations: 0, resumes: 0 };
  class Events extends EventTarget {
    emit(type, fields = {}) {
      const event = new Event(type);
      Object.assign(event, fields);
      this.dispatchEvent(event);
      if (typeof this['on' + type] === 'function') this['on' + type](event);
    }
  }
  window.Audio = class extends Events {
    constructor(src) {
      super(); this.src = src || ''; this.currentTime = 0; this.duration = 40;
      this.paused = true; this.ended = false; this.error = null;
      state.audio.push(this);
    }
    get currentSrc() { return this.src ? new URL(this.src, location.href).href : ''; }
    play() {
      state.plays.push(this); this.ended = false;
      if (state.audioMode === 'throw') throw new DOMException('Blocked', 'NotAllowedError');
      if (state.audioMode === 'blocked') return Promise.reject(new DOMException('Blocked', 'NotAllowedError'));
      if (state.audioMode === 'failed') return Promise.reject(new DOMException('Cannot decode', 'NotSupportedError'));
      if (state.audioMode === 'defer') return new Promise((resolve, reject) => {
        this.resolvePlay = () => { this.paused = false; this.emit('playing'); resolve(); };
        this.rejectPlay = name => reject(new DOMException('Late error', name));
      });
      this.paused = false;
      queueMicrotask(() => { if (!this.paused) this.emit('playing'); });
      return Promise.resolve();
    }
    pause() { this.paused = true; }
    load() {}
    removeAttribute(name) { if (name === 'src') this.src = ''; }
    setAttribute(name, value) { this[name] = value; }
    getAttribute(name) { return this[name]; }
  };
  // Effects are unrelated to narration, and would otherwise produce sound in CI.
  window.AudioContext = window.webkitAudioContext = class { constructor() { throw new Error('No effects in narration harness'); } };
  if (unsupported) {
    Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true });
    window.SpeechSynthesisUtterance = undefined;
    return;
  }
  window.SpeechSynthesisUtterance = class extends Events {
    constructor(text) { super(); this.text = text; }
  };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
    paused: false, speaking: false, pending: false, active: null,
    getVoices() { return []; },
    addEventListener() {},
    speak(utterance) {
      state.utterances.push(utterance); this.active = utterance;
      if (state.speechMode === 'throw') throw new Error('Speech engine unavailable');
      if (state.speechMode === 'blocked') { queueMicrotask(() => utterance.emit('error', { error: 'not-allowed' })); return; }
      if (state.speechMode === 'silent') return;
      this.speaking = true;
      utterance.emit('start');
    },
    cancel() {
      state.cancellations++;
      const previous = this.active; this.active = null; this.speaking = false; this.pending = false;
      if (previous) previous.emit('error', { error: 'canceled' });
    },
    resume() { state.resumes++; this.paused = false; }
  } });
}

(async () => {
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split('?')[0]);
    if (rel.endsWith('/')) rel += 'index.html';
    const target = path.resolve(root, '.' + rel);
    if (!target.startsWith(root + path.sep)) return res.writeHead(403).end();
    fs.readFile(target, (error, content) => {
      if (error) return res.writeHead(404).end();
      res.setHeader('Content-Type', mime[path.extname(target)] || 'application/octet-stream');
      res.end(content);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser, cases = 0;
  try {
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--mute-audio'] });
    async function test(label, options, run) {
      const { missingClips, ...harness } = options || {};
      const context = await browser.newContext({ serviceWorkers: 'block', reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(installMediaHarness, harness);
      if (missingClips) await page.route('**/audio/manifest.js*', route => route.fulfill({ contentType: 'text/javascript', body: 'window.SPOOKY_NARRATION = {};' }));
      const open = async () => { await page.goto(base + '/games/spooky-stories/'); await page.locator('.story-card').first().click(); };
      try {
        await run(page, open);
        assert.deepEqual(errors, [], 'No uncaught script errors');
        cases++; console.log('PASS: ' + label);
      } finally { await context.close(); }
    }
    const snapshot = page => page.evaluate(() => ({
      plays: __narrationTest.plays.map(a => ({ src: a.src, paused: a.paused })),
      spoken: __narrationTest.utterances.map(u => u.text),
      cancellations: __narrationTest.cancellations,
      status: document.getElementById('narration-status').textContent,
      text: document.getElementById('page-text').textContent,
      lit: document.querySelectorAll('.w.now').length
    }));
    const activeCount = state => state.plays.filter(a => !a.paused).length;

    await test('recorded narration follows opening, Next, Back, Stop, keyboard, replay and home', {}, async (page, open) => {
      await open();
      let state = await snapshot(page);
      assert.equal(state.plays.length, 1); assert.match(state.plays[0].src, /ellie-ribbon-parade-0\.mp3/);
      assert.equal(activeCount(state), 1);
      await page.locator('#next-btn').click();
      state = await snapshot(page);
      assert.equal(state.plays.length, 2); assert.ok(state.plays[0].paused); assert.match(state.plays[1].src, /-1\.mp3/);
      await page.locator('#prev-btn').click();
      state = await snapshot(page); assert.equal(activeCount(state), 1); assert.match(state.plays.at(-1).src, /-0\.mp3/);
      await page.locator('#stop-btn').click();
      state = await snapshot(page); assert.equal(activeCount(state), 0); assert.equal(state.lit, 0);
      const stoppedCount = state.plays.length;
      await page.waitForTimeout(40); assert.equal((await snapshot(page)).plays.length, stoppedCount, 'Stop does not restart');
      await page.keyboard.press('ArrowRight');
      assert.equal(activeCount(await snapshot(page)), 1, 'Stop affects the current page; read-aloud stays enabled');
      for (let i = 0; i < 5; i++) await page.locator('#next-btn').click();
      assert.ok(await page.locator('#again-btn').isVisible());
      await page.locator('#again-btn').click();
      state = await snapshot(page); assert.match(state.plays.at(-1).src, /-0\.mp3/); assert.equal(activeCount(state), 1);
      await page.locator('#home-btn').click();
      state = await snapshot(page); assert.equal(activeCount(state), 0); assert.equal(state.lit, 0);
    });

    await test('self-reading preference stays silent across pages and reload; manual Read remains available', {}, async (page, open) => {
      await open(); await page.locator('#self-btn').click();
      const before = (await snapshot(page)).plays.length;
      await page.locator('#next-btn').click(); await page.locator('#prev-btn').click();
      assert.equal((await snapshot(page)).plays.length, before);
      await page.reload();
      assert.equal((await snapshot(page)).plays.length, 0);
      assert.equal(await page.locator('#self-btn').getAttribute('aria-pressed'), 'true');
      await page.locator('#read-btn').click(); assert.equal((await snapshot(page)).plays.length, 1);
      await page.locator('#next-btn').click(); assert.equal((await snapshot(page)).plays.length, 1);
      assert.equal(activeCount(await snapshot(page)), 0);
      await page.locator('#self-btn').click(); assert.equal((await snapshot(page)).plays.length, 2);
    });

    await test('rapid navigation ignores old media promises and events, including after Stop', { audioMode: 'defer' }, async (page, open) => {
      await open();
      await page.evaluate(() => { document.getElementById('next-btn').click(); document.getElementById('prev-btn').click(); document.getElementById('next-btn').click(); });
      await page.evaluate(() => {
        const all = __narrationTest.plays;
        all.at(-1).resolvePlay();
        all[0].rejectPlay('NotAllowedError');
        all[1].resolvePlay();
        all[2].rejectPlay('AbortError');
        all[0].error = { code: 3 }; all[0].emit('error'); all[1].emit('ended');
      });
      let state = await snapshot(page);
      assert.equal(activeCount(state), 1); assert.equal(state.plays.at(-1).paused, false);
      assert.equal(state.status, '', 'Old failure must not overwrite the current page');
      await page.locator('#next-btn').click(); await page.locator('#stop-btn').click();
      await page.evaluate(() => __narrationTest.plays.at(-1).resolvePlay());
      state = await snapshot(page); assert.equal(activeCount(state), 0); assert.equal(state.lit, 0);
    });

    for (const audioMode of ['blocked', 'throw']) await test('blocked recording gives a manual retry (' + audioMode + ')', { audioMode }, async (page, open) => {
      await open();
      let state = await snapshot(page);
      assert.match(state.status, /tap|speaker|read.aloud/i); assert.equal(activeCount(state), 0);
      assert.equal(state.spoken.length, 0, 'Permission refusal must not trigger another autoplay attempt');
      await page.evaluate(() => { __narrationTest.audioMode = 'auto'; });
      await page.locator('#read-btn').click();
      state = await snapshot(page); assert.equal(activeCount(state), 1); assert.equal(state.status, '');
    });

    await test('missing recording reads visible text and tapped words with browser speech', { missingClips: true }, async (page, open) => {
      await open();
      let state = await snapshot(page); assert.equal(state.plays.length, 0); assert.equal(state.spoken.length, 1);
      assert.equal(state.spoken.at(-1), state.text);
      await page.locator('#next-btn').click(); state = await snapshot(page);
      assert.equal(state.spoken.at(-1), state.text); assert.ok(state.cancellations >= 1);
      const tail = await page.locator('.w').allTextContents();
      await page.locator('.w').nth(4).click();
      state = await snapshot(page); assert.ok(state.spoken.at(-1).startsWith(tail[4]));
      assert.ok(!state.spoken.at(-1).startsWith(tail[0] + ' ' + tail[1]));
      await page.locator('#stop-btn').click(); assert.equal((await snapshot(page)).lit, 0);
      await page.locator('#prev-btn').click(); assert.equal((await snapshot(page)).spoken.at(-1), (await snapshot(page)).text);
    });

    await test('late speech callbacks cannot affect the current page or restart after Stop', { missingClips: true }, async (page, open) => {
      await open();
      await page.evaluate(() => { document.getElementById('next-btn').click(); document.getElementById('prev-btn').click(); document.getElementById('next-btn').click(); });
      const before = await snapshot(page);
      await page.evaluate(() => {
        for (const u of __narrationTest.utterances.slice(0, -1)) {
          u.emit('start'); u.emit('boundary', { name: 'word', charIndex: 10 }); u.emit('error', { error: 'not-allowed' }); u.emit('end');
        }
      });
      let state = await snapshot(page); assert.equal(state.status, before.status); assert.equal(state.spoken.length, before.spoken.length);
      await page.locator('#stop-btn').click();
      await page.evaluate(() => { const u = __narrationTest.utterances.at(-1); u.emit('start'); u.emit('boundary', { name: 'word', charIndex: 15 }); });
      state = await snapshot(page); assert.equal(state.lit, 0); assert.equal(state.spoken.length, before.spoken.length);
    });

    for (const speechMode of ['blocked', 'throw']) await test('browser speech failure remains recoverable (' + speechMode + ')', { missingClips: true, speechMode }, async (page, open) => {
      await open();
      assert.match((await snapshot(page)).status, /tap|speaker|unavailable|could not|cannot/i);
      await page.evaluate(() => { __narrationTest.speechMode = 'auto'; });
      await page.locator('#read-btn').click();
      const state = await snapshot(page); assert.equal(state.spoken.length, 2); assert.equal(state.spoken.at(-1), state.text);
      await page.locator('#next-btn').click(); assert.equal((await snapshot(page)).spoken.length, 3);
    });

    await test('silently refused speech times out once and can be retried by tapping', { missingClips: true, speechMode: 'silent' }, async (page, open) => {
      await page.clock.install(); await open();
      await page.clock.fastForward(6000);
      let state = await snapshot(page); assert.equal(state.spoken.length, 1); assert.match(state.status, /tap|speaker/i);
      await page.clock.fastForward(10000); assert.equal((await snapshot(page)).spoken.length, 1, 'No autoplay retry loop');
      await page.evaluate(() => { __narrationTest.speechMode = 'auto'; }); await page.locator('#read-btn').click();
      state = await snapshot(page); assert.equal(state.spoken.length, 2);
      await page.locator('#stop-btn').click(); const status = (await snapshot(page)).status;
      await page.clock.fastForward(6000); assert.equal((await snapshot(page)).status, status);
    });

    await test('unsupported browser speech leaves text and navigation usable', { missingClips: true, unsupported: true }, async (page, open) => {
      await open(); let state = await snapshot(page);
      assert.match(state.status, /unavailable|not available|not support|read.*page/i);
      const text = state.text; await page.locator('#next-btn').click(); state = await snapshot(page);
      assert.notEqual(state.text, text); assert.equal(state.plays.length, 0); assert.equal(state.spoken.length, 0);
    });

    await test('failed recording falls back to browser speech once', { audioMode: 'failed' }, async (page, open) => {
      await open(); const state = await snapshot(page);
      assert.equal(state.plays.length, 1); assert.equal(state.spoken.length, 1); assert.equal(state.spoken[0], state.text);
    });

    await test('a failed recording retries speech directly on the next gesture', { audioMode: 'failed', speechMode: 'silent' }, async (page, open) => {
      await page.clock.install(); await open();
      await page.clock.fastForward(6000);
      let state = await snapshot(page); assert.equal(state.plays.length, 1); assert.equal(state.spoken.length, 1);
      assert.match(state.status, /tap|speaker/i);
      await page.evaluate(() => { __narrationTest.speechMode = 'auto'; });
      await page.locator('#read-btn').click();
      state = await snapshot(page); assert.equal(state.plays.length, 1, 'Retry retains the fresh tap for speech');
      assert.equal(state.spoken.length, 2); assert.equal(state.spoken.at(-1), state.text);
      await page.locator('#next-btn').click();
      assert.equal((await snapshot(page)).plays.length, 2, 'A new page still prefers its recording');
    });

    await test('natural narration completion stays on its page and self mode suppresses quiz narration', {}, async (page, open) => {
      await open(); const text = (await snapshot(page)).text;
      await page.evaluate(() => { const clip = __narrationTest.plays.at(-1); clip.paused = true; clip.ended = true; clip.emit('ended'); });
      let state = await snapshot(page); assert.equal(state.text, text); assert.equal(state.plays.length, 1); assert.equal(state.lit, 0);
      await page.locator('#self-btn').click();
      for (let i = 0; i < 6; i++) await page.locator('#next-btn').click();
      await page.locator('#quiz-btn').click();
      state = await snapshot(page); assert.equal(state.plays.length, 1); assert.equal(state.spoken.length, 0);
      assert.ok(await page.locator('#quiz-ask').textContent());
    });

    await test('hidden document and pagehide stop audio and speech without automatic resume', {}, async (page, open) => {
      await open();
      await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
      assert.equal(activeCount(await snapshot(page)), 0);
      await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
      assert.equal((await snapshot(page)).plays.length, 1);
      await page.locator('#read-btn').click();
      await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
      assert.equal(activeCount(await snapshot(page)), 0);
    });

    await test('hidden document cancels pending speech watchdog and paused engine resumes on a fresh gesture', { missingClips: true, speechMode: 'silent' }, async (page, open) => {
      await page.clock.install(); await open();
      await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
      const before = await snapshot(page); await page.clock.fastForward(6000);
      assert.equal((await snapshot(page)).status, before.status);
      await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); speechSynthesis.paused = true; __narrationTest.speechMode = 'auto'; });
      await page.locator('#read-btn').click();
      assert.ok(await page.evaluate(() => __narrationTest.resumes > 0));
    });

    // Exercise the shipped MP3s and browser's actual playback policy on both
    // mouse and emulated touch. This cannot verify physical iOS/Android audio.
    for (const width of [1280, 390]) {
      const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: 900 }, hasTouch: width < 500, isMobile: width < 500, reducedMotion: 'reduce' });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => {
        window.__nativeNarration = [];
        const NativeAudio = window.Audio;
        window.Audio = function(...args) { const audio = new NativeAudio(...args); __nativeNarration.push(audio); return audio; };
      });
      const activate = selector => width < 500 ? page.locator(selector).tap() : page.locator(selector).click();
      try {
        await page.goto(base + '/'); assert.ok(await page.locator('a[href="games/spooky-stories/"]').count());
        await page.goto(base + '/games/spooky-stories/'); await activate('.story-card:first-child');
        await page.waitForFunction(() => __nativeNarration.some(a => !a.paused && a.currentTime > 0));
        await activate('#next-btn');
        await page.waitForFunction(() => __nativeNarration.some(a => /ellie-ribbon-parade-1\.mp3/.test(a.src) && !a.paused && a.currentTime > 0));
        assert.equal(await page.evaluate(() => __nativeNarration.filter(a => !a.paused).length), 1);
        await activate('#stop-btn'); assert.equal(await page.evaluate(() => __nativeNarration.filter(a => !a.paused).length), 0);
        await activate('#prev-btn'); await page.waitForFunction(() => __nativeNarration.some(a => /ellie-ribbon-parade-0\.mp3/.test(a.src) && !a.paused));
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal overflow');
        assert.ok(await page.locator('#next-btn').evaluate(node => node.getBoundingClientRect().height >= 44));
        await page.screenshot({ path: `/tmp/storybook-narration-${width}.png`, fullPage: true });
        await activate('#home-btn'); assert.equal(await page.evaluate(() => __nativeNarration.filter(a => !a.paused).length), 0);
        assert.deepEqual(errors, []);
        cases++; console.log(`PASS: native Chromium MP3 playback, page navigation, Stop, home and ${width}px ${width < 500 ? 'touch' : 'mouse'} layout`);
      } finally { await context.close(); }
    }
    console.log(`Storybook narration: ${cases} scenarios passed. Speech failures are simulated; no physical mobile speech/audio device was tested.`);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
