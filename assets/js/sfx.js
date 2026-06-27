/* ===========================================================
   SFX — tiny shared sound effects for the arcade.
   -----------------------------------------------------------
   Pure Web Audio (no files to download). Plays short, friendly
   beeps for happy moments. Everything is wrapped in try/catch
   and no-ops if audio isn't available, so it can never throw or
   break a game. Use it like:

       window.SFX && SFX.good();   // a little "ding" on success
       window.SFX && SFX.win();    // a happy fanfare on a win
       window.SFX && SFX.nope();   // a soft "try again" blip

   The kids can mute their device — we keep volumes gentle.
   =========================================================== */
window.SFX = (function () {
  "use strict";

  let ctx = null;
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function ac() {
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === "suspended" && ctx.resume) ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }

  function tone(freq, start, dur, type, gain) {
    const c = ac();
    if (!c) return;
    try {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || "sine";
      o.frequency.value = freq;
      o.connect(g); g.connect(c.destination);
      const t = c.currentTime + start;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain || 0.12, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t);
      o.stop(t + dur + 0.03);
    } catch (e) { /* ignore */ }
  }

  function play(notes) {
    if (reduce) return; // be calm for kids who prefer reduced motion
    try { notes.forEach((n) => tone(n.f, n.t || 0, n.d || 0.16, n.type, n.g)); }
    catch (e) { /* ignore */ }
  }

  return {
    good() { play([{ f: 660, t: 0, d: 0.11 }, { f: 880, t: 0.08, d: 0.15 }]); },
    win() {
      play([
        { f: 523, t: 0, d: 0.14 }, { f: 659, t: 0.12, d: 0.14 },
        { f: 784, t: 0.24, d: 0.14 }, { f: 1047, t: 0.36, d: 0.3 },
      ]);
    },
    nope() { play([{ f: 220, t: 0, d: 0.16, type: "triangle", g: 0.08 }]); },
  };
})();
