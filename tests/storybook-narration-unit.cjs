#!/usr/bin/env node
'use strict';
// Execute the production controller and its navigation/control handlers in a
// small DOM/media harness. No browser dependency; native playback is tested by
// storybook-narration.cjs. The harness intentionally dispatches late callbacks.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../games/spooky-stories/storybook.js'), 'utf8');
function section(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `Production section exists: ${start}`);
  return source.slice(from, to);
}
const controller = [
  section('  const CLIPS =', '  /* ---- word highlighting'),
  section('  function normWord(', '  function endsSentence('),
  section('  function renderPage(', '  // ---- tapping a word:'),
  section('  let quizQs =', '  function wireTaps('),
  section('  function nextPage(', '  // keyboard niceties'),
].join('\n');

function harness({ missing = false, audioMode = 'auto', speechMode = 'auto', unsupported = false } = {}) {
  const state = { audioMode, speechMode, plays: [], voices: [], audio: [], timers: new Map(), frameCancels: [], lit: -1, cancellations: 0, resumes: 0 };
  class Element {
    constructor() {
      this.events = new Map(); this.children = []; this.style = {}; this.dataset = {}; this.attributes = {}; this.hidden = false;
      this.classList = { add() {}, remove() {} }; this.textContent = '';
    }
    addEventListener(name, callback) { if (!this.events.has(name)) this.events.set(name, new Set()); this.events.get(name).add(callback); }
    removeEventListener(name, callback) { this.events.get(name)?.delete(callback); }
    emit(name, event = {}) { for (const callback of [...this.events.get(name) || []]) callback(event); }
    click() { this.emit('click'); }
    setAttribute(name, value) { this.attributes[name] = value; }
    appendChild(child) { this.children.push(child); child.parentNode = this; }
    replaceChildren(...children) { this.children = children; }
    querySelector() { return null; }
    scrollIntoView() {}
    set innerHTML(value) { this.children = []; this.html = value; }
    get innerHTML() { return this.html; }
  }
  class Audio extends Element {
    constructor() { super(); this.paused = true; this.ended = false; this.duration = 30; this.currentTime = 0; this.error = null; state.audio.push(this); }
    set src(value) { this.url = new URL(value, 'http://storybook.test/games/spooky-stories/').href; this.error = null; this.ended = false; this.currentTime = 0; }
    get src() { return this.url || ''; }
    get currentSrc() { return this.src; }
    pause() { this.paused = true; }
    play() {
      const call = { clip: this, src: this.src }; state.plays.push(call);
      if (state.audioMode === 'throw') throw { name: 'NotAllowedError' };
      if (state.audioMode === 'blocked') return Promise.reject({ name: 'NotAllowedError' });
      if (state.audioMode === 'failed') return Promise.reject({ name: 'NotSupportedError' });
      if (state.audioMode === 'defer') return new Promise((resolve, reject) => {
        call.resolve = () => { this.paused = false; this.emit('playing'); resolve(); };
        call.reject = name => reject({ name });
      });
      this.paused = false; this.emit('playing'); return Promise.resolve();
    }
  }
  class Utterance { constructor(text) { this.text = text; } }
  const synth = {
    paused: false, active: null,
    getVoices: () => [],
    speak(voice) {
      state.voices.push(voice); this.active = voice;
      if (state.speechMode === 'throw') throw Error('Speech unavailable');
      if (state.speechMode === 'blocked') { voice.onerror({ error: 'not-allowed' }); return; }
      if (state.speechMode === 'auto') voice.onstart();
    },
    cancel() { state.cancellations++; const previous = this.active; this.active = null; if (previous) previous.onerror({ error: 'canceled' }); },
    resume() { state.resumes++; this.paused = false; }
  };
  const elements = new Map(), get = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  let timerId = 0;
  const story = { id: 'book', title: 'Test book', pages: [
    { text: 'First page words.', art: () => '<svg></svg>' },
    { text: 'Second page words.', art: () => '<svg></svg>' },
    { text: 'The End.', end: true, art: () => '<svg></svg>' }
  ] };
  const clips = missing ? {} : Object.fromEntries(['book-0','book-1','book-2','book-q0','book-q1'].map(name => [name, { text: 'revision' }]));
  const context = {
    Audio, URL, window: { SPOOKY_NARRATION: clips, speechSynthesis: unsupported ? undefined : synth, SpeechSynthesisUtterance: unsupported ? undefined : Utterance },
    document: { hidden: false, getElementById: get, createElement: () => new Element(), documentElement: { lang: 'en' } },
    setTimeout(callback, delay) { const id = ++timerId; state.timers.set(id, { callback, delay }); return id; },
    clearTimeout: id => state.timers.delete(id), cancelAnimationFrame: id => state.frameCancels.push(id),
    rafId: 0, paintWord: i => { state.lit = i; }, tickKaraoke() {}, ensureTiming() {}, wordTimes: null,
    current: story, page: 0, prefs: { self: false }, reduceMotion: true, STORIES: [story],
    clipName: (id, page) => id + '-' + page, vocabFor: () => ({}), layoutText: text => { get('page-text').textContent = text; },
    hideWordCard() {}, wireTaps() {}, playSound() {}, confetti() {}, setMark() {},
    loadDone: () => ({}), saveDone() {}, loadBadges: () => ({}), saveBadges() {}, savePrefs() {}, shuffle: values => values,
    QUIZ_BY_ID: { book: [{ ask: 'Who came first?', choices: [['A','One'],['B','Two']] }, { ask: 'What happened next?', choices: [['A','Three'],['B','Four']] }] },
    goHome() { context.api.stopNarration(); context.current = null; }
  };
  for (const [name, id] of Object.entries({ artEl:'page-art', textEl:'page-text', dotsEl:'dots', countEl:'page-count', hintEl:'tap-hint', prevBtn:'prev-btn', nextBtn:'next-btn', endActions:'end-actions', againBtn:'again-btn', quizBtn:'quiz-btn', homeBtn:'home-btn', readBtn:'read-btn', selfBtn:'self-btn', quizEl:'quiz', quizDoneEl:'quiz-done', quizChoicesEl:'quiz-choices', quizAskEl:'quiz-ask', quizProgEl:'quiz-progress', quizFbEl:'quiz-feedback' })) context[name] = get(id);
  vm.createContext(context);
  vm.runInContext(controller + '\nglobalThis.api = {narrate, speakText, narrateCurrentPage, stopNarration, renderPage, nextPage, prevPage, openQuiz, showQuestion, closeQuiz, advanceQuiz: () => {quizI++; showQuestion();}};', context);
  return { state, context, api: context.api, synth, get, status: () => get('narration-status').textContent,
    runTimers(delay) { for (const [id, timer] of [...state.timers]) if (timer.delay <= delay) { state.timers.delete(id); timer.callback(); } },
    activeAudio: () => state.audio.filter(audio => !audio.paused) };
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
let passed = 0;
async function test(label, run) { await run(); passed++; console.log('PASS: ' + label); }
(async () => {
  await test('render, Next, Back and replay request playback synchronously and stop prior page', async () => {
    const h = harness(); h.api.renderPage(false); assert.equal(h.state.plays.length, 1);
    h.get('next-btn').click(); assert.equal(h.state.plays.length, 2); assert.ok(h.state.plays[0].clip.paused);
    assert.match(h.state.plays.at(-1).src, /book-1\.mp3/); h.get('prev-btn').click(); assert.match(h.state.plays.at(-1).src, /book-0\.mp3/);
    h.get('next-btn').click(); h.get('next-btn').click(); h.get('again-btn').click();
    assert.equal(h.context.page, 0); assert.match(h.state.plays.at(-1).src, /book-0\.mp3/); assert.equal(h.activeAudio().length, 1); await flush();
  });
  await test('Stop clears timers/highlights while next page restarts enabled read-aloud', () => {
    const h = harness(); h.api.renderPage(false); h.context.rafId = 9; h.get('stop-btn').click();
    assert.equal(h.activeAudio().length, 0); assert.equal(h.state.lit, -1); assert.ok(h.state.frameCancels.includes(9)); assert.equal(h.state.timers.size, 0);
    h.get('next-btn').click(); assert.equal(h.activeAudio().length, 1);
  });
  await test('self-reading mode persists in state, suppresses pages and allows manual replay', () => {
    const h = harness(); h.api.renderPage(false); h.get('self-btn').click(); h.get('next-btn').click();
    assert.equal(h.context.prefs.self, true); assert.equal(h.state.plays.length, 1); assert.equal(h.activeAudio().length, 0);
    h.get('read-btn').click(); assert.equal(h.state.plays.length, 2); h.get('prev-btn').click(); assert.equal(h.state.plays.length, 2);
    h.get('self-btn').click(); assert.equal(h.context.prefs.self, false); assert.equal(h.state.plays.length, 3);
  });
  await test('rapid page changes ignore stale play promises, errors and completion events', async () => {
    const h = harness({ audioMode: 'defer' }); h.api.renderPage(false); h.api.nextPage(); h.api.prevPage(); h.api.nextPage();
    const requests = h.state.plays; requests[3].resolve(); requests[0].reject('NotAllowedError'); requests[1].resolve(); requests[2].reject('AbortError'); await flush();
    requests[0].clip.emit('error'); requests[1].clip.ended = true; requests[1].clip.emit('ended');
    assert.equal(h.activeAudio().length, 1); assert.equal(requests[3].clip.paused, false); assert.equal(h.status(), '');
  });
  await test('Stop followed by a late play fulfillment cannot restart the stopped page', async () => {
    const h = harness({ audioMode: 'defer' }); h.api.renderPage(false); h.api.stopNarration(); h.state.plays[0].resolve(); await flush();
    assert.equal(h.activeAudio().length, 0); assert.equal(h.state.lit, -1); assert.equal(h.state.timers.size, 0);
  });
  for (const audioMode of ['blocked','throw']) await test('recording permission refusal requires manual retry: ' + audioMode, async () => {
    const h = harness({ audioMode }); h.api.renderPage(false); await flush();
    assert.match(h.status(), /Tap the speaker/); assert.equal(h.state.voices.length, 0); h.state.audioMode = 'auto'; h.get('read-btn').click(); await flush();
    assert.equal(h.activeAudio().length, 1); assert.equal(h.status(), '');
  });
  await test('recording load failure falls back once, and the next tap goes directly to speech', async () => {
    const h = harness({ audioMode: 'failed', speechMode: 'silent' }); h.api.renderPage(false); await flush();
    assert.equal(h.state.voices.length, 1); h.runTimers(5000); assert.match(h.status(), /Tap the speaker/);
    h.state.speechMode = 'auto'; h.get('read-btn').click(); assert.equal(h.state.plays.length, 1); assert.equal(h.state.voices.length, 2);
    h.api.nextPage(); assert.equal(h.state.plays.length, 2, 'New page still tries its recording'); await flush();
  });
  await test('missing clips use exact current page text synchronously and cancel prior speech', () => {
    const h = harness({ missing: true }); h.api.renderPage(false); assert.equal(h.state.voices.length, 1); assert.equal(h.state.voices[0].text, h.context.current.pages[0].text);
    h.api.nextPage(); assert.equal(h.state.voices.length, 2); assert.ok(h.state.cancellations > 0); assert.equal(h.state.voices[1].text, h.context.current.pages[1].text);
  });
  await test('stale speech callbacks and synchronous cancel errors cannot overwrite the new page', () => {
    const h = harness({ missing: true }); h.api.renderPage(false); const old = h.state.voices[0]; h.api.nextPage(); const status = h.status();
    old.onstart(); old.onboundary({ name:'word', charIndex:10 }); old.onerror({ error:'not-allowed' }); old.onend();
    assert.equal(h.status(), status); assert.equal(h.state.lit, 0); h.api.stopNarration(); h.state.voices[1].onstart();
    h.state.voices[1].onboundary({ name:'word', charIndex:10 }); assert.equal(h.state.lit, -1);
  });
  await test('tapped word speech preserves the remaining exact text and boundary highlights', () => {
    const h = harness({ missing: true }); h.api.speakText('One — two, three! ✨', true, 1); const voice = h.state.voices[0];
    assert.equal(voice.text, 'two, three! ✨'); assert.equal(h.state.lit, 1); voice.onboundary({ name:'word', charIndex:5 }); assert.equal(h.state.lit, 2);
    voice.onend(); assert.equal(h.state.lit, -1); assert.equal(h.context.page, 0, 'Completion never auto-turns the page');
  });
  await test('recorded word replay uses existing timing and retries the seek after metadata', () => {
    const h = harness(); h.api.renderPage(false); h.context.wordTimes = [{a:0},{a:1.5},{a:3}]; h.api.narrateCurrentPage(1);
    const clip = h.state.plays.at(-1).clip; assert.equal(clip.currentTime, 1.44); clip.currentTime = 0; clip.emit('loadedmetadata'); assert.equal(clip.currentTime, 1.44);
  });
  for (const speechMode of ['blocked','throw']) await test('browser speech errors remain recoverable: ' + speechMode, () => {
    const h = harness({ missing:true, speechMode }); h.api.renderPage(false); assert.match(h.status(), /Tap the speaker/);
    h.state.speechMode = 'auto'; h.get('read-btn').click(); assert.equal(h.state.voices.length, 2); assert.match(h.status(), /Reading with/);
  });
  await test('silent speech and pending media time out once without repeated autoplay', () => {
    const h = harness({ missing:true, speechMode:'silent' }); h.api.renderPage(false); h.runTimers(5000); assert.match(h.status(), /Tap the speaker/);
    assert.equal(h.state.timers.size, 0); assert.equal(h.state.voices.length, 1); h.api.stopNarration(); h.runTimers(10000); assert.equal(h.status(), '');
    const media = harness({audioMode:'defer'}); media.api.renderPage(false); media.runTimers(10000); assert.match(media.status(), /Tap the speaker/); assert.equal(media.activeAudio().length, 0);
  });
  await test('unsupported speech and hidden document leave text/navigation usable and no pending narration', () => {
    const h = harness({missing:true,unsupported:true}); h.api.renderPage(false); assert.match(h.status(), /not available/); h.api.nextPage(); assert.equal(h.context.page, 1);
    const hidden = harness(); hidden.api.renderPage(false); hidden.context.document.hidden=true; hidden.api.nextPage(); assert.equal(hidden.activeAudio().length,0); assert.equal(hidden.state.plays.length,1); assert.equal(hidden.state.timers.size,0);
  });
  await test('paused speech resumes on the same call without waiting for voices', () => {
    const h = harness({missing:true}); h.synth.paused=true; h.api.renderPage(false); assert.equal(h.state.resumes,1); assert.equal(h.state.voices.length,1);
  });
  await test('quiz questions reuse unlocked media and speaker replay selects the current question', async () => {
    const h = harness(); h.api.renderPage(false); h.api.openQuiz(); const first = h.state.plays.at(-1).clip; h.api.advanceQuiz();
    assert.equal(h.state.plays.at(-1).clip, first); assert.match(h.state.plays.at(-1).src, /book-q1\.mp3/);
    h.get('read-btn').click(); assert.match(h.state.plays.at(-1).src, /book-q1\.mp3/); assert.equal(h.state.plays.at(-1).clip,first);
    h.get('self-btn').click(); const count=h.state.plays.length; h.api.showQuestion(); assert.equal(h.state.plays.length,count);
    h.get('self-btn').click(); assert.match(h.state.plays.at(-1).src,/book-q1\.mp3/); await flush();
  });
  await test('late promise from an earlier quiz request cannot pause the reused current question', async () => {
    const h = harness({audioMode:'defer'}); h.api.openQuiz(); const old=h.state.plays[0]; h.api.advanceQuiz(); const fresh=h.state.plays[1];
    assert.equal(old.clip,fresh.clip); fresh.resolve(); old.resolve(); await flush(); assert.equal(fresh.clip.paused,false);
    old.clip.emit('error'); old.clip.emit('ended'); assert.equal(h.state.voices.length,0); assert.equal(fresh.clip.paused,false);
    h.api.stopNarration(); assert.equal(fresh.clip.paused,true);
  });
  await test('missing quiz narration uses question text and suppresses page-word highlighting', () => {
    const h=harness({missing:true}); h.api.openQuiz(); assert.equal(h.state.voices[0].text,'Who came first?'); assert.equal(h.state.lit,-1);
    h.api.advanceQuiz(); h.get('read-btn').click(); assert.equal(h.state.voices.at(-1).text,'What happened next?'); assert.equal(h.state.lit,-1);
  });
  console.log(`Storybook narration controller: ${passed} scenarios passed (mock DOM/media; native mobile/audio still requires browser testing).`);
})().catch(error => { console.error(error); process.exitCode = 1; });
