#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright-core');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
async function server() {
  const instance = http.createServer(async (req, res) => {
    try {
      let pathname = new URL(req.url, 'http://localhost').pathname;
      if (pathname.endsWith('/')) pathname += 'index.html';
      const file = path.resolve(ROOT, '.' + pathname);
      if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' }).end(await fs.readFile(file));
    } catch (_) { res.writeHead(404).end(); }
  });
  await new Promise(resolve => instance.listen(0, '127.0.0.1', resolve)); return instance;
}
(async () => {
  const engine = await import('../games/sudoku/engine.mjs');
  const s = await server(); let browser;
  const base = `http://127.0.0.1:${s.address().port}`;
  const key = 'mcrae.sudoku.v1.jeannie', seed = engine.newState('mini', 42), raw = engine.serialize(seed);
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    for (const [label, opts] of [
      ['Desktop', { viewport: { width: 1280, height: 900 } }],
      ['iPad', { viewport: { width: 768, height: 1024 }, hasTouch: true, isMobile: true }],
      ['iPhone', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }],
    ]) {
      const context = await browser.newContext({ serviceWorkers: 'block', reducedMotion: 'reduce', ...opts });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
      const tap = async selector => opts.hasTouch ? page.locator(selector).tap() : page.locator(selector).click();
      const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
      try {
        await page.goto(base);
        await page.evaluate(({ key, raw }) => { localStorage.setItem(key, raw); localStorage.setItem('craepets.v1.jeannie', 'untouched pet'); }, { key, raw });
        await page.getByRole('searchbox', { name: 'Find a game' }).fill('Sudoku');
        assert.equal(await page.locator('.game-card:visible h2').textContent(), 'Sudoku Garden');
        await page.locator('.game-card:visible').click();
        await page.waitForSelector('#board button');
        assert.equal(await page.locator('#board button').count(), 16);
        const empty = seed.puzzle.givens.indexOf(0), clue = seed.puzzle.givens.findIndex(Boolean), good = seed.puzzle.solution[empty];
        await tap(`#board [data-index="${empty}"]`);
        await tap('#notes'); await tap(`#keypad [data-value="${good}"]`);
        assert.equal((await saved()).notes[empty], 1 << (good - 1));
        await tap('#undo'); assert.equal((await saved()).notes[empty], 0);
        await tap('#notes'); await tap(`#keypad [data-value="${good}"]`);
        assert.equal((await saved()).board[empty], good);
        await page.reload(); await page.waitForSelector('#board button');
        assert.equal((await saved()).board[empty], good, 'moves survive reload');
        await tap(`#board [data-index="${clue}"]`);
        await page.keyboard.press('1');
        assert.equal((await saved()).board[clue], seed.puzzle.givens[clue], 'clues cannot change');
        assert.ok(await page.locator('#keypad button').first().isDisabled());
        await tap(`#board [data-index="${empty}"]`); await tap('#erase');
        const wrong = good % 4 + 1;
        await tap(`#keypad [data-value="${wrong}"]`); await tap('#check');
        assert.ok(await page.locator(`#board [data-index="${empty}"].wrong`).count());
        await tap('#hint'); assert.match(await page.locator('#message').textContent(), /marked numbers first/);
        await tap('#erase'); await tap('#hint');
        assert.ok(await page.locator('#hint-panel').isVisible());
        const beforeHint = (await saved()).board.filter(Boolean).length;
        await tap('#place-hint');
        assert.equal((await saved()).board.filter(Boolean).length, beforeHint + 1);
        assert.equal((await saved()).hints, 1);
        await tap('#undo'); assert.equal((await saved()).hints, 0);
                await tap('#new');
        // There may be no moves after Undo: add one first if the new puzzle was immediate.
        if (!(await page.locator('#confirm-dialog').isVisible())) {
          const current = await saved(), puzzle = engine.createPuzzle(current.level, current.seed), at = puzzle.givens.indexOf(0);
          await tap(`#board [data-index="${at}"]`); await tap(`#keypad [data-value="${puzzle.solution[at]}"]`); await tap('#new');
        }
        const pendingSave = await saved();
        await page.getByRole('button', { name: 'Keep playing', exact: true }).click();
        assert.deepEqual(await saved(), pendingSave, 'Cancel preserves the puzzle');
        await tap('#new'); await page.keyboard.press('Escape');
        assert.deepEqual(await saved(), pendingSave, 'Escape preserves the puzzle');
        await page.selectOption('#level', 'gentle');
        await page.getByRole('button', { name: 'Start fresh', exact: true }).click();
        assert.equal(await page.locator('#board button').count(), 81);
        const fresh = await saved();
        // A fresh selection followed by Escape must not reuse an earlier dialog result.
        const p9 = engine.createPuzzle(fresh.level, fresh.seed), e9 = p9.givens.indexOf(0);
        await tap(`#board [data-index="${e9}"]`); await tap(`#keypad [data-value="${p9.solution[e9]}"]`);
        const beforeEscape = await saved();
        await page.selectOption('#level', 'challenge'); await page.keyboard.press('Escape');
        assert.deepEqual(await saved(), beforeEscape);
        assert.equal(await page.locator('#level').inputValue(), 'gentle');
        const fit = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth,
          board: document.getElementById('board').getBoundingClientRect(), cell: document.querySelector('#board button').getBoundingClientRect().width,
          key: document.querySelector('#keypad button').getBoundingClientRect().height }));
        assert.ok(fit.scroll <= fit.width + 1, `${label} has no page overflow`);
        assert.ok(fit.cell >= 32 && fit.key >= 44, `${label} cells and number keys have usable target sizes`);
        await page.screenshot({ path: `/tmp/sudoku-${label}.png`, fullPage: true });
        await page.selectOption('#player', 'cory');
        assert.equal(await page.locator('#board button').count(), 16);
        await page.selectOption('#player', 'jeannie');
        assert.deepEqual(await saved(), beforeEscape, 'profile switch keeps this player’s puzzle');
        assert.equal(await page.locator('#board button').count(), 81);
        await page.selectOption('#level', 'mini'); await page.getByRole('button', { name: 'Start fresh', exact: true }).click();
        const round = await saved(), puzzle = engine.createPuzzle(round.level, round.seed);
        for (let i = 0; i < puzzle.givens.length; i++) if (!puzzle.givens[i]) {
          await tap(`#board [data-index="${i}"]`);
          await page.keyboard.press(String(puzzle.solution[i]));
        }
        assert.ok(await page.locator('#finished').isVisible());
        await page.reload(); await page.waitForSelector('#board button');
        assert.ok(await page.locator('#finished').isVisible(), 'completion survives reload');
        const complete = await saved(); assert.ok(await page.locator('#hint').isDisabled());
        assert.deepEqual(await saved(), complete, 'completed games are stable');
        assert.equal(await page.evaluate(() => localStorage.getItem('craepets.v1.jeannie')), 'untouched pet');
        assert.deepEqual(errors, []);
        console.log(`${label}: menu, touch/keyboard entry, notes/undo, fixed clues, mistakes, teaching hints, saves, profile isolation, cancel/Escape, level changes, layout and completion passed.`);
      } catch (error) {
        await page.screenshot({ path: `/tmp/sudoku-${label}-failure.png`, fullPage: true }).catch(() => {});
        throw error;
      } finally { await context.close(); }
    }
    // Read/write faults and competing tabs may never destroy an existing save.
    for (const mode of ['corrupt', 'write-failure', 'read-failure', 'other-tab']) {
      const context = await browser.newContext({ serviceWorkers: 'block' });
      const page = await context.newPage();
      try {
        await page.goto(base); await page.evaluate(({key,raw,mode}) => localStorage.setItem(key, mode === 'corrupt' ? '{broken' : raw), {key,raw,mode});
        if (mode === 'write-failure') await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); }; });
        if (mode === 'read-failure') await page.addInitScript(() => { Storage.prototype.getItem = () => { throw new DOMException('Blocked', 'SecurityError'); }; });
        await page.goto(base + '/games/sudoku/'); await page.waitForSelector('#board button');
        if (mode === 'other-tab') {
          const other = await context.newPage(); await other.goto(base);
          await other.evaluate(key => localStorage.setItem(key, 'newer bytes from another tab'), key);
          await page.waitForFunction(() => document.getElementById('save-status').textContent.includes('another tab'));
          await other.close();
        }
        const cell = page.locator('#board button:not(.given)').first(); await cell.click(); await page.keyboard.press('1');
        assert.match(await page.locator('#save-status').textContent(), /unavailable|not be read|another tab/);
        const label = await cell.getAttribute('aria-label');
        await page.selectOption('#player', 'cory'); await page.selectOption('#player', 'jeannie');
        assert.equal(await cell.getAttribute('aria-label'), label, 'unsaved moves survive switching players within the tab');
        if (mode !== 'read-failure') {
          const stored = await page.evaluate(key => localStorage.getItem(key), key);
          assert.equal(stored, mode === 'corrupt' ? '{broken' : mode === 'other-tab' ? 'newer bytes from another tab' : raw);
        }
        console.log(`Sudoku ${mode}: visible warning, playable game, in-memory profile preservation, original stored bytes protected.`);
      } finally { await context.close(); }
    }
  } finally { if (browser) await browser.close(); await new Promise(resolve => s.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
