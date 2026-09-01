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
    /* A creature's voice: two or three quick notes around a base pitch.
       `base` is the pitch in Hz, `type` the oscillator shape, so a low
       square wave growls and a high sine chirps. */
    voice(base, type) {
      const b = base || 520, ty = type || "sine";
      play([
        { f: b, t: 0, d: 0.09, type: ty, g: 0.09 },
        { f: b * 1.25, t: 0.08, d: 0.09, type: ty, g: 0.09 },
        { f: b * (Math.random() < 0.5 ? 1.5 : 0.9), t: 0.17, d: 0.12, type: ty, g: 0.08 },
      ]);
    },
    /* A soft knock, for tapping an egg. */
    knock() { play([{ f: 300, t: 0, d: 0.07, type: "triangle", g: 0.12 }, { f: 240, t: 0.06, d: 0.09, type: "triangle", g: 0.1 }]); },
    /* A crack. */
    crack() { play([{ f: 1200, t: 0, d: 0.04, type: "square", g: 0.08 }, { f: 700, t: 0.03, d: 0.05, type: "square", g: 0.08 }, { f: 400, t: 0.07, d: 0.1, type: "triangle", g: 0.1 }]); },
    good() { play([{ f: 660, t: 0, d: 0.11 }, { f: 880, t: 0.08, d: 0.15 }]); },
    win() {
      play([
        { f: 523, t: 0, d: 0.14 }, { f: 659, t: 0.12, d: 0.14 },
        { f: 784, t: 0.24, d: 0.14 }, { f: 1047, t: 0.36, d: 0.3 },
      ]);
    },
    nope() { play([{ f: 220, t: 0, d: 0.16, type: "triangle", g: 0.08 }]); },

    /* A quick bubbly "pop" — great for tapping/popping things. */
    pop() { play([{ f: 520, t: 0, d: 0.08, type: "triangle", g: 0.16 }, { f: 940, t: 0.04, d: 0.1 }]); },

    /* A bright coin/treasure "ting". */
    coin() { play([{ f: 988, t: 0, d: 0.09 }, { f: 1319, t: 0.07, d: 0.14 }]); },

    /* A low thud for a blow landing in an arena. */
    hit() { play([{ f: 160, t: 0, d: 0.12, type: "triangle", g: 0.14 }, { f: 90, t: 0.05, d: 0.16, type: "sine", g: 0.12 }]); },

    /* A big bright critical hit. */
    crit() {
      play([
        { f: 330, t: 0, d: 0.08, type: "square", g: 0.1 }, { f: 660, t: 0.07, d: 0.1, type: "square", g: 0.1 },
        { f: 1320, t: 0.14, d: 0.24, type: "sine", g: 0.14 },
      ]);
    },

    /* A rising blip whose pitch climbs with a combo streak (clamped). */
    streak(n) {
      const step = Math.min(Math.max(n || 1, 1), 12);
      play([{ f: 440 + step * 60, t: 0, d: 0.1, type: "square", g: 0.1 }]);
    },
  };
})();
