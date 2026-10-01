// Deterministic media lifecycle regressions; no browser/audio device required.
// Run: node tests/shared-media-lifecycle.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class Events {
  constructor() { this.listeners = new Map(); }
  addEventListener(name, fn) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(fn);
  }
  removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn); }
  emit(name) { for (const fn of [...(this.listeners.get(name) || [])]) fn(); }
}

function load(files, options = {}) {
  const clips = [], oscillators = [], gains = [], contexts = [], timers = new Map();
  let timerId = 0;
  const window = new Events();
  const document = new Events();
  document.hidden = false;
  class Element {
    constructor() { this.children = []; this.style = {}; }
    appendChild(child) { child.parent = this; this.children.push(child); return child; }
    setAttribute(name, value) { this[name] = value; }
    remove() {
      if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this);
      this.parent = null;
    }
  }
  document.body = new Element();
  document.head = new Element();
  document.createElement = () => new Element();
  const preference = new Events();
  preference.matches = !!options.reduced;
  window.matchMedia = options.noMotion ? undefined : () => preference;
  window.innerWidth = 800;
  window.Audio = class extends Events {
    constructor(src) {
      super();
      if (options.audioConstructorFails) throw new Error('No audio available');
      this.src = src;
      this.paused = false;
      this.loaded = 0;
      clips.push(this);
    }
    play() {
      if (options.audioPlayFails) throw new Error('Playback blocked');
      return new Promise((resolve, reject) => { this.reject = reject; });
    }
    pause() { this.paused = true; }
    removeAttribute(name) { delete this[name]; }
    load() { this.loaded++; }
  };
  window.AudioContext = class {
    constructor() { this.state = options.suspended ? 'suspended' : 'running'; this.currentTime = 0; contexts.push(this); }
    resume() { this.state = 'running'; return options.resumeFails ? Promise.reject(new Error('Resume blocked')) : Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    createOscillator() {
      const node = {
        frequency: {}, connect() {}, disconnect() { this.disconnected = true; },
        start() {}, stop(time) { if (time === undefined) this.stopped = true; },
        end() { if (this.onended) this.onended(); },
      };
      oscillators.push(node);
      return node;
    }
    createGain() {
      const node = {
        gain: {
          setValueAtTime() {},
          exponentialRampToValueAtTime() { if (options.gainFails) throw new Error('Device unavailable'); },
        },
        connect() {}, disconnect() { this.disconnected = true; },
      };
      gains.push(node);
      return node;
    }
  };
  const context = vm.createContext({
    window, document,
    setTimeout: fn => { timers.set(++timerId, fn); return timerId; },
    clearTimeout: id => timers.delete(id),
  });
  for (const file of files) vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/js', file), 'utf8'), context, {filename: file});
  return {
    window, document, preference, clips, oscillators, gains, contexts, timers, options,
    hide() { document.hidden = true; document.emit('visibilitychange'); },
    show() { document.hidden = false; document.emit('visibilitychange'); },
    motion(value) { preference.matches = value; preference.emit('change'); },
  };
}

async function narration() {
  const env = load(['voice.js']);
  const {Voice} = env.window;
  let ended = 0;
  const first = Voice.play('first.mp3', () => ended++);
  const second = Voice.play('second.mp3', () => ended++);
  assert(first.paused && first.loaded === 1, 'Replacing narration releases the previous recording');
  first.emit('ended');
  first.reject(new Error('Old request failed late'));
  await Promise.resolve();
  assert.equal(ended, 0, 'A canceled clip cannot continue a narration chain');
  assert.equal(second.paused, false, 'A late failure cannot stop newer narration');
  second.emit('ended');
  second.emit('ended');
  assert.equal(ended, 1, 'The active completion callback fires once');

  const stopped = Voice.play('stopped.mp3', () => ended++);
  Voice.stop();
  stopped.emit('ended');
  assert.equal(ended, 1);
  const blocked = Voice.play('blocked.mp3', () => ended++);
  blocked.reject(new Error('Autoplay blocked'));
  await Promise.resolve();
  assert(blocked.paused && blocked.loaded === 1);
  blocked.emit('ended');
  assert.equal(ended, 1);

  const broken = Voice.play('missing.mp3', () => ended++);
  let next;
  // Craepets chains clips using an external error listener.
  broken.addEventListener('error', () => { next = Voice.play('next.mp3'); });
  broken.emit('error');
  broken.emit('ended');
  assert.equal(ended, 1);
  assert(next && !next.paused, 'Consumer error listeners can still advance a sequence');
  env.hide();
  assert(next.paused, 'Narration stops when the tab hides');
  assert.equal(Voice.play('hidden.mp3'), null);
  env.show();
  const leaving = Voice.play('leaving.mp3');
  env.window.emit('pagehide');
  assert(leaving.paused);
  Voice.stop();

  assert.equal(load(['voice.js'], {audioConstructorFails: true}).window.Voice.play('x.mp3'), null);
  const synchronous = load(['voice.js'], {audioPlayFails: true});
  assert.equal(synchronous.window.Voice.play('x.mp3'), null);
  assert(synchronous.clips[0].paused);
}

async function soundEffects() {
  const env = load(['sfx.js'], {suspended: true, resumeFails: true});
  env.window.SFX.good();
  await Promise.resolve();
  assert.equal(env.oscillators.length, 2);
  for (const oscillator of env.oscillators) oscillator.end();
  assert(env.oscillators.every(node => node.disconnected));
  assert(env.gains.every(node => node.disconnected));
  for (let i = 0; i < 100; i++) env.window.SFX.pop();
  assert.equal(env.oscillators.filter(node => !node.disconnected).length, 32, 'Rapid taps have bounded audio overlap');
  env.hide();
  assert(env.oscillators.every(node => node.disconnected));
  const count = env.oscillators.length;
  env.window.SFX.win();
  assert.equal(env.oscillators.length, count, 'No background sound is scheduled');
  env.show();
  env.window.SFX.win();
  env.motion(true);
  assert(env.oscillators.every(node => node.disconnected));
  env.window.SFX.pop();
  assert.equal(env.oscillators.length, count + 4);
  env.motion(false);
  env.window.SFX.pop();
  env.window.emit('pagehide');
  assert(env.oscillators.every(node => node.disconnected));
  env.window.SFX.stop();
  await Promise.resolve();

  const failed = load(['sfx.js'], {gainFails: true});
  failed.window.SFX.good();
  assert(failed.oscillators.every(node => node.disconnected));
  assert(failed.gains.every(node => node.disconnected));
}

function celebrations() {
  const env = load(['confetti.js']);
  const {Confetti} = env.window;
  Confetti.burst({count: 0});
  assert.equal(env.document.body.children.length, 0, 'A zero-piece request does not celebrate');
  for (let i = 0; i < 100; i++) Confetti.burst({count: 100000, x: -4, y: Infinity});
  assert.equal(env.document.body.children.length, 3, 'Rapid celebrations have bounded DOM usage');
  assert.equal(env.timers.size, 3, 'Evicted layers leave no timers behind');
  assert(env.document.body.children.every(layer => layer.children.length === 200));
  assert(env.document.body.children.every(layer => layer.children.every(bit => parseFloat(bit.style.left) >= 0)));
  env.motion(true);
  assert.equal(env.document.body.children.length, 0, 'Changing reduced motion removes the active animation');
  assert.equal(env.timers.size, 0);
  Confetti.burst();
  assert.equal(env.document.body.children.length, 0);
  env.motion(false);
  Confetti.burst();
  env.hide();
  assert.equal(env.document.body.children.length, 0);
  assert.equal(env.timers.size, 0);
  Confetti.burst();
  assert.equal(env.document.body.children.length, 0);
  env.show();
  Confetti.burst();
  for (const fn of [...env.timers.values()]) fn();
  assert.equal(env.document.body.children.length, 0, 'Completed celebrations remove their elements');
  assert.equal(env.timers.size, 0);
  Confetti.burst();
  env.window.emit('pagehide');
  assert.equal(env.document.body.children.length, 0);
  Confetti.clear();
  assert.equal(env.document.head.children.length, 1, 'Repeated bursts reuse one stylesheet');

  // A head not ready on the first attempt must not permanently disable styling.
  const retry = load(['confetti.js'], {noMotion: true});
  const head = retry.document.head;
  retry.document.head = null;
  retry.window.Confetti.burst();
  retry.document.head = head;
  retry.window.Confetti.burst();
  assert.equal(head.children.length, 1);
}

(async () => {
  await narration();
  await soundEffects();
  celebrations();
  console.log('PASS shared media: canceled narration, audio failure recovery, bounded effects, live preferences, and background cleanup');
})().catch(error => { console.error(error); process.exitCode = 1; });
