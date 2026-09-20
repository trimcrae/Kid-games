/* ===========================================================
   Photo Expedition — ambient sound, made from nothing.
   -----------------------------------------------------------
   Pure Web Audio, no files: filtered noise for wind, surf and the
   muffled hush under water; little frequency sweeps for birds by day
   and crickets by night; bubbles that pop now and then. Everything is
   gentle and everything is wrapped so it can never break the game.

     const amb = createAmbience(biome);   // "savanna", "reef", …
     amb.start();  amb.update(env);  amb.setMuted(true);  amb.stop();
   =========================================================== */
export function createAmbience(biome) {
  let ctx = null, master = null, nodes = [], timers = [], muted = false, running = false, night = 0;
  const kind = biome === "reef" ? "water" : (biome === "rainforest" ? "jungle" : (biome === "galapagos" || biome === "volcanic" || biome === "antarctic") ? "shore" : "open");

  function noiseBuffer(c, seconds, brown) {
    const b = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
    return b;
  }
  function layer(c, brown, filterType, freq, q, gain, lfoHz, lfoDepth) {
    const src = c.createBufferSource(); src.buffer = noiseBuffer(c, 4, brown); src.loop = true;
    const f = c.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.value = gain;
    if (lfoHz) { const lfo = c.createOscillator(); lfo.frequency.value = lfoHz; const lg = c.createGain(); lg.gain.value = gain * lfoDepth; lfo.connect(lg); lg.connect(g.gain); lfo.start(); nodes.push(lfo); }
    src.connect(f); f.connect(g); g.connect(master); src.start(); nodes.push(src);
    return g;
  }
  function chirp(c, f0, f1, dur, vol) {
    if (!running || !master) return;
    const o = c.createOscillator(), g = c.createGain(); const t = c.currentTime;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function every(minMs, maxMs, fn) {
    const tick = () => { if (!running) return; try { fn(); } catch (e) {} timers.push(setTimeout(tick, minMs + Math.random() * (maxMs - minMs))); };
    timers.push(setTimeout(tick, Math.random() * maxMs));
  }

  function start() {
    if (running) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ctx.destination);
      running = true;
      if (kind === "water") {
        layer(ctx, true, "lowpass", 260, 0.7, 0.35, 0.07, 0.5);           // the deep hush
        every(700, 2600, () => { const n = 1 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) setTimeout(() => chirp(ctx, 700 + Math.random() * 900, 1400 + Math.random() * 800, 0.08, 0.05), i * 120); });
      } else {
        const windy = biome === "arctic" || biome === "antarctic" || biome === "mountain" || biome === "desert";
        layer(ctx, false, "bandpass", windy ? 500 : 380, 0.6, windy ? 0.10 : 0.05, 0.05, 0.8);   // wind
        if (kind === "shore") layer(ctx, true, "lowpass", 600, 0.5, 0.25, 0.09, 0.9);          // surf swelling
        if (biome === "rainforest") layer(ctx, false, "highpass", 5000, 0.5, 0.012, 0.3, 0.6);  // insects
        if (biome === "yellowstone" || biome === "savanna" || biome === "rainforest" || biome === "mountain") {
          const dense = biome === "rainforest";
          every(dense ? 900 : 2500, dense ? 3500 : 9000, () => {
            if (night > 0.6) { for (let i = 0; i < 4; i++) setTimeout(() => chirp(ctx, 4200, 4400, 0.06, 0.02), i * 90); return; }   // crickets
            const base = 1800 + Math.random() * 2200, n = 2 + Math.floor(Math.random() * 4);
            for (let i = 0; i < n; i++) setTimeout(() => chirp(ctx, base * (0.9 + Math.random() * 0.2), base * (1.1 + Math.random() * 0.5), 0.12, 0.05), i * 160);
          });
        }
        if (biome === "antarctic" || biome === "volcanic" || biome === "arctic") every(6000, 16000, () => chirp(ctx, 900, 600, 0.5, 0.03));   // gulls, far off
      }
    } catch (e) { running = false; }
  }
  function update(env) { night = env && env.night || 0; }
  function setMuted(m) { muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : 0.5, ctx.currentTime, 0.2); }
  function stop() {
    running = false;
    timers.forEach(clearTimeout); timers = [];
    try { nodes.forEach((n) => { try { n.stop(); } catch (e) {} }); if (master) master.disconnect(); } catch (e) {}
    nodes = []; master = null;
  }
  return { start, stop, update, setMuted, get muted() { return muted; } };
}
