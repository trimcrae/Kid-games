/* ===========================================================
   Music Lab — a real playable piano for the arcade.
   -----------------------------------------------------------
   Six ways to play, all on the same keyboard:

     🎹 Play          press keys, see the note name, walk a
                      scale, record a little tune of your own
     🎵 Songs         the next key glows — play a whole song,
                      with a tempo you choose and a metronome
     👂 Echo          hear a few notes, play them back — four
                      ear-training levels that really progress
     🔤 Find the Note "Find G" → press the right key; harder
                      levels add sharps/flats and intervals
     🎼 Read Music    a note on the staff → press the key
     🎸 Chords        build C major, A minor… three notes at a
                      time, and learn happy vs sad

   What it teaches: note names & letters, sharps and flats,
   beats and note values, scales and their step patterns,
   intervals, major/minor triads, listening & musical memory,
   and reading notes on a treble staff.

   Sound is pure Web Audio (no files) with a soft toy-piano
   tone. Everything is wrapped so a browser without audio just
   stays quiet instead of breaking. Progress saves in
   localStorage under the same key it always used, so old
   stars, finished songs and recordings still come back.
   =========================================================== */
(function () {
  "use strict";

  /* ---------------- the keyboard ---------------- */
  // Ten white keys (C4 → E5) — enough for every song in songs.js
  // and still finger-sized on a phone.
  const WHITE = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5", "E5"];
  // Black keys sit after the white key at index `after`.
  const BLACK = [
    { note: "C#4", after: 0 }, { note: "D#4", after: 1 },
    { note: "F#4", after: 3 }, { note: "G#4", after: 4 }, { note: "A#4", after: 5 },
    { note: "C#5", after: 7 }, { note: "D#5", after: 8 }
  ];
  // Computer-keyboard shortcuts (nice on a laptop).
  const TYPE_WHITE = ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";"];
  const TYPE_BLACK = { w: "C#4", e: "D#4", t: "F#4", y: "G#4", u: "A#4", o: "C#5", p: "D#5" };

  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const FLATOF = { "C#": "D♭", "D#": "E♭", "F#": "G♭", "G#": "A♭", "A#": "B♭" };

  // Tempo choices — a real musical control, in beats per minute.
  const TEMPOS = {
    slow:   { ms: 700, label: "🐢 Slow",   bpm: 86 },
    steady: { ms: 500, label: "🚶 Steady", bpm: 120 },
    fast:   { ms: 360, label: "🐇 Fast",   bpm: 167 }
  };

  const SAVE_KEY = "music-lab.v1";
  const DEFAULT_HINT = 'On a computer you can play with your keyboard too: <b>A S D F G H J K L ;</b> are the white keys and <b>W E T Y U O P</b> are the black ones.';

  /* ---------------- elements ---------------- */
  const el = {
    piano: document.getElementById("piano"),
    modes: document.getElementById("modes"),
    title: document.getElementById("prompt-title"),
    text: document.getElementById("prompt-text"),
    actions: document.getElementById("prompt-actions"),
    bigNote: document.getElementById("big-note"),
    staff: document.getElementById("staff"),
    track: document.getElementById("track"),
    chips: document.getElementById("chips"),
    scorebar: document.getElementById("scorebar"),
    stars: document.getElementById("stars"),
    songList: document.getElementById("song-list"),
    labels: document.getElementById("labels-toggle"),
    flats: document.getElementById("flats-toggle"),
    hint: document.getElementById("hint-line")
  };

  /* ---------------- saved progress ----------------
     Older saves only had a few of these keys; Object.assign
     fills in the new ones without losing anything. */
  let save = {
    songs: {}, echoBest: 0, nameStars: 0, staffStars: 0, tune: [], labels: true,
    flats: false, tempo: "steady", metro: false, scale: 0,
    echoLevel: 1, nameLevel: 1, staffLevel: 1, chordLevel: 1,
    echoBestBy: {}, nameStreakBest: 0, staffSpeedBest: 0,
    chordCount: 0, chordStreakBest: 0
  };
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (raw && typeof raw === "object") save = Object.assign(save, raw);
  } catch (e) { /* first visit */ }
  if (!TEMPOS[save.tempo]) save.tempo = "steady";
  if (!save.echoBestBy || typeof save.echoBestBy !== "object") save.echoBestBy = {};
  if (!Array.isArray(save.tune)) save.tune = [];

  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
  }

  function beatMs() { return TEMPOS[save.tempo].ms; }

  /* =========================================================
     SOUND — a soft toy piano built from two oscillators
     ========================================================= */
  let ctx = null, master = null, voices = null;

  function audio() {
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.3;
        master.connect(ctx.destination);
      }
      if (ctx.state === "suspended" && ctx.resume) ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }

  // Everything a mode schedules goes through this one gain node,
  // so leaving a mode can silence the whole queue instantly
  // (no more ghost notes playing over the next screen).
  function bus() {
    if (!voices) {
      voices = ctx.createGain();
      voices.gain.value = 1;
      voices.connect(master);
    }
    return voices;
  }

  function stopAllTones() {
    if (!ctx || !voices) return;
    try {
      const old = voices;
      voices = null;
      const t = ctx.currentTime;
      old.gain.cancelScheduledValues(t);
      old.gain.setValueAtTime(old.gain.value || 0.0001, t);
      old.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      setTimeout(function () { try { old.disconnect(); } catch (e) {} }, 400);
    } catch (e) { voices = null; }
  }

  function midiOf(note) {
    const m = /^([A-G])(#?)(\d)$/.exec(note);
    if (!m) return 69;
    return 12 * (Number(m[3]) + 1) + SEMI[m[1]] + (m[2] ? 1 : 0);
  }
  function hz(note) { return 440 * Math.pow(2, (midiOf(note) - 69) / 12); }

  // Play `note` for `dur` seconds, `delay` seconds from now.
  function tone(note, dur, delay, vol) {
    const c = audio();
    if (!c) return;
    try {
      const t0 = c.currentTime + (delay || 0);
      const d = dur || 0.55;
      const f = hz(note);
      const g = c.createGain();
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 2600;
      g.connect(lp); lp.connect(bus());

      const body = c.createOscillator();
      body.type = "triangle";
      body.frequency.value = f;
      const shimmer = c.createOscillator();
      shimmer.type = "sine";
      shimmer.frequency.value = f * 2;
      const sg = c.createGain();
      sg.gain.value = 0.28;
      body.connect(g); shimmer.connect(sg); sg.connect(g);

      const peak = 0.9 * (vol === undefined ? 1 : vol);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(peak * 0.31, t0 + Math.min(0.22, d * 0.5));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      body.start(t0); shimmer.start(t0);
      body.stop(t0 + d + 0.05); shimmer.stop(t0 + d + 0.05);
    } catch (e) { /* no audio — the game still works silently */ }
  }

  function chordTone(notes, dur, delay) {
    notes.forEach(function (n, i) { tone(n, dur || 1.1, (delay || 0) + i * 0.012, 0.6); });
  }

  function buzz() { // gentle "not that one"
    tone("C4", 0.18, 0);
    tone("C#4", 0.22, 0.06);
  }

  /* ---------------- metronome ---------------- */
  let metroTimer = null, metroCount = 0;

  function click(accent) {
    const c = audio();
    if (!c) return;
    try {
      const t = c.currentTime;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "square";
      o.frequency.value = accent ? 1600 : 1050;
      o.connect(g); g.connect(bus());
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(accent ? 0.16 : 0.09, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      o.start(t); o.stop(t + 0.1);
    } catch (e) {}
  }

  function startMetro() {
    stopMetro();
    if (!save.metro) return;
    metroCount = 0;
    click(true);
    metroTimer = setInterval(function () {
      metroCount++;
      click(metroCount % 4 === 0);
    }, beatMs());
  }
  function stopMetro() {
    if (metroTimer) clearInterval(metroTimer);
    metroTimer = null;
  }

  /* =========================================================
     NOTE NAMES
     ========================================================= */
  function letterLabel(note) {
    const m = /^([A-G])(#?)(\d)$/.exec(note);
    if (!m) return note;
    let base = m[1];
    if (m[2]) base = save.flats ? FLATOF[m[1] + "#"] : m[1] + "♯";
    return base + (Number(m[3]) >= 5 ? "↑" : "");
  }
  // just the letter name — "C♯5" → "C♯", used when we talk about a note
  function letter(note) { return letterLabel(note).replace("↑", ""); }
  // spoken/aria form: "F sharp, octave 4"
  function spoken(note) {
    const m = /^([A-G])(#?)(\d)$/.exec(note);
    if (!m) return note;
    return m[1] + (m[2] ? (save.flats ? "" : " sharp") : "") +
      (m[2] && save.flats ? " — or " + FLATOF[m[1] + "#"].replace("♭", " flat") : "") +
      ", octave " + m[3];
  }
  // both names for a black key, for the teaching text
  function bothNames(note) {
    const m = /^([A-G])(#?)(\d)$/.exec(note);
    if (!m || !m[2]) return letter(note);
    return m[1] + "♯ (also called " + FLATOF[m[1] + "#"] + ")";
  }

  /* =========================================================
     BUILD THE PIANO
     ========================================================= */
  const keyEls = {};   // note -> button

  function buildPiano() {
    WHITE.forEach(function (note, i) {
      const b = document.createElement("button");
      b.className = "key white";
      b.dataset.note = note;
      b.type = "button";
      el.piano.appendChild(b);
      keyEls[note] = b;
      wireKey(b, note);
      // the note letter, plus a tiny keyboard hint (laptops only)
      const big = document.createElement("span");
      big.className = "kl";
      b.appendChild(big);
      const t = document.createElement("small");
      t.style.cssText = "font-weight:normal;font-size:0.62rem;opacity:0.6;";
      t.textContent = TYPE_WHITE[i] === ";" ? ";" : TYPE_WHITE[i].toUpperCase();
      b.appendChild(t);
    });

    BLACK.forEach(function (k) {
      const b = document.createElement("button");
      b.className = "key black";
      b.dataset.note = k.note;
      b.type = "button";
      // sits on the seam between two white keys
      b.style.left = "calc(8px + (100% - 16px) * " + ((k.after + 1) / WHITE.length) + ")";
      el.piano.appendChild(b);
      keyEls[k.note] = b;
      wireKey(b, k.note);
      const big = document.createElement("span");
      big.className = "kl";
      b.appendChild(big);
    });
    paintKeyNames();
  }

  // Re-label every key — used at start-up and whenever the
  // ♯ / ♭ switch is flipped.
  function paintKeyNames() {
    Object.keys(keyEls).forEach(function (note) {
      const b = keyEls[note];
      const span = b.querySelector(".kl");
      if (span) span.textContent = letterLabel(note);
      b.setAttribute("aria-label", spoken(note));
      b.setAttribute("aria-keyshortcuts", shortcutFor(note) || "");
    });
  }
  function shortcutFor(note) {
    const w = WHITE.indexOf(note);
    if (w >= 0) return TYPE_WHITE[w];
    const k = Object.keys(TYPE_BLACK).filter(function (x) { return TYPE_BLACK[x] === note; })[0];
    return k || "";
  }

  let lastPointer = 0;
  function wireKey(btn, note) {
    btn.addEventListener("pointerdown", function (e) {
      lastPointer = Date.now();
      if (e.pointerType !== "mouse") e.preventDefault();
      press(note);
    });
    // Fires for real clicks that produced no pointerdown (keyboard
    // Enter/Space, assistive tech) without double-playing a tap.
    btn.addEventListener("click", function () {
      if (Date.now() - lastPointer < 700) return;
      press(note);
    });
    // A finger that slides off a key must never leave it stuck down.
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) {
      btn.addEventListener(ev, function () { btn.classList.remove("down"); });
    });
  }

  // Flash timers are tracked so leaving a mode can't leave a key
  // frozen green or red.
  let flashTimers = [];
  function flash(note, cls, ms) {
    const k = keyEls[note];
    if (!k) return;
    const c = cls || "down";
    k.classList.add(c);
    const t = setTimeout(function () { k.classList.remove(c); }, ms || 180);
    flashTimers.push(t);
  }
  function clearFlashes() {
    flashTimers.forEach(clearTimeout);
    flashTimers = [];
    Object.keys(keyEls).forEach(function (n) {
      keyEls[n].classList.remove("down", "good", "bad", "held");
    });
  }

  function clearHints() {
    Object.keys(keyEls).forEach(function (n) { keyEls[n].classList.remove("hint"); });
  }
  function hintKey(note) {
    clearHints();
    if (keyEls[note]) keyEls[note].classList.add("hint");
  }
  function hintKeys(notes) {
    clearHints();
    notes.forEach(function (n) { if (keyEls[n]) keyEls[n].classList.add("hint"); });
  }

  /* =========================================================
     LITTLE UI HELPERS
     ========================================================= */
  function button(label, onClick, ghost) {
    const b = document.createElement("button");
    b.className = "btn" + (ghost ? " ghost" : "");
    b.type = "button";
    b.textContent = label;
    b.addEventListener("click", onClick);
    el.actions.appendChild(b);
    return b;
  }
  function chipLabel(txt) {
    const s = document.createElement("span");
    s.className = "chip-label";
    s.textContent = txt;
    el.chips.appendChild(s);
    return s;
  }
  function chip(label, pressed, onClick, aria) {
    const b = document.createElement("button");
    b.className = "chip";
    b.type = "button";
    b.textContent = label;
    b.setAttribute("aria-pressed", String(!!pressed));
    if (aria) b.setAttribute("aria-label", aria);
    b.addEventListener("click", onClick);
    el.chips.appendChild(b);
    return b;
  }
  // A row of "pick one of these" chips.
  function chipGroup(label, items, current, pick) {
    if (label) chipLabel(label);
    items.forEach(function (it) {
      chip(it.label, it.value === current, function () { pick(it.value); }, it.aria);
    });
  }
  function starRow(n, max) {
    const full = Math.min(n, max || n);
    return "⭐".repeat(full) + (max ? "☆".repeat(Math.max(0, max - full)) : "");
  }
  function setScore(html) { el.scorebar.innerHTML = html; }
  function show(node, on) { node.classList.toggle("hidden", !on); }
  function beatDots(b) {
    const whole = Math.floor(b);
    return "•".repeat(whole) + (b - whole >= 0.4 ? "·" : "");
  }
  // "1 white key to the left ⬅" — used to explain a wrong answer.
  function wayTo(fromNote, toNote) {
    const a = WHITE.indexOf(fromNote), b = WHITE.indexOf(toNote);
    if (a < 0 || b < 0) {
      const d = midiOf(toNote) - midiOf(fromNote);
      if (d === 0) return "the same key";
      return Math.abs(d) + " key" + (Math.abs(d) === 1 ? "" : "s") + " to the " + (d > 0 ? "right ➡" : "left ⬅");
    }
    const d = b - a;
    if (d === 0) return "the same key";
    return Math.abs(d) + " white key" + (Math.abs(d) === 1 ? "" : "s") + " to the " + (d > 0 ? "right ➡" : "left ⬅");
  }

  /* =========================================================
     MODES
     ========================================================= */
  let mode = "free";
  let timers = [];
  function later(fn, ms) { const t = setTimeout(fn, ms); timers.push(t); return t; }
  function stopTimers() { timers.forEach(clearTimeout); timers = []; }

  // every mode fills this in: what to do when a key is pressed
  let onPress = function () {};

  function press(note) {
    audio();
    tone(note, 0.6, 0);
    flash(note);
    onPress(note);
  }

  function setMode(next) {
    stopTimers();
    stopMetro();
    stopAllTones();
    clearHints();
    clearFlashes();
    mode = next;
    el.modes.querySelectorAll(".mode-btn").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.mode === next));
    });
    el.actions.innerHTML = "";
    el.chips.innerHTML = "";
    el.track.innerHTML = "";
    el.bigNote.classList.remove("small");
    show(el.track, false);
    show(el.bigNote, false);
    show(el.staff, false);
    show(el.songList, false);
    el.stars.textContent = "";
    el.hint.innerHTML = DEFAULT_HINT;
    setScore("");
    onPress = function () {};
    ({
      free: modeFree, songs: modeSongs, echo: modeEcho,
      names: modeNames, staff: modeStaff, chords: modeChords
    }[next] || modeFree)();
  }

  /* ---------------- 🎹 Free Play (scales + record your own tune) ---------------- */
  // Every scale here fits on the ten white keys + seven black ones.
  const SCALES = [
    { name: "C major", notes: ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
      tip: "The all-white-keys scale. The steps go whole–whole–HALF–whole–whole–whole–HALF." },
    { name: "D minor", notes: ["D4", "E4", "F4", "G4", "A4", "A#4", "C5", "D5"],
      tip: "A minor scale sounds a bit sad. It borrows one black key: B♭." },
    { name: "F major", notes: ["F4", "G4", "A4", "A#4", "C5", "D5", "E5"],
      tip: "F major has one flat — B♭, the black key just left of B." },
    { name: "C pentatonic", notes: ["C4", "D4", "E4", "G4", "A4", "C5"],
      tip: "Only five notes — every one of them sounds good together. Try making up a tune!" },
    { name: "C blues", notes: ["C4", "D#4", "F4", "F#4", "G4", "A#4", "C5"],
      tip: "The blues scale. Those squashed-together notes are what makes it growl." },
    { name: "Chromatic", notes: ["C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4", "G#4", "A4", "A#4", "B4", "C5"],
      tip: "Every single key in a row — twelve half steps make one octave." }
  ];

  function modeFree() {
    el.title.textContent = "Play the piano! 🎶";
    el.text.textContent = "Tap any key to hear it. The letter on the key is its note name.";
    show(el.bigNote, true);
    el.bigNote.textContent = "🎵";

    let recording = null;      // [{note, t}] while the red button is on
    let recBtn, playBtn;

    function refresh() {
      recBtn.textContent = recording ? "⏹ Stop recording" : "🔴 Record my tune";
      recBtn.setAttribute("aria-pressed", String(!!recording));
      playBtn.disabled = recording !== null || !save.tune.length;
      setScore(recording
        ? "Recording… <span>" + recording.length + "</span> note" + (recording.length === 1 ? "" : "s")
        : (save.tune.length ? "My tune: <span>" + save.tune.length + "</span> notes" : "Record a tune and it saves for next time!"));
    }

    recBtn = button("🔴 Record my tune", function () {
      if (recording) {
        if (recording.length) save.tune = recording.slice(0, 80);
        recording = null;
        persist();
        if (window.SFX) SFX.good();
      } else {
        stopTimers();
        stopAllTones();
        recording = [];
        recording.start = Date.now();
      }
      refresh();
    });

    playBtn = button("▶ Play my tune", function () {
      if (!save.tune.length) return;
      stopTimers();
      stopAllTones();
      clearFlashes();
      save.tune.forEach(function (n) {
        later(function () {
          tone(n.note, 0.6, 0);
          flash(n.note, "good", 200);
          el.bigNote.textContent = letterLabel(n.note);
        }, n.t);
      });
    }, true);

    button("🗑 Clear", function () {
      stopTimers();
      stopAllTones();
      save.tune = [];
      persist();
      refresh();
    }, true);

    // ---- scales ----
    let scaleIdx = Math.min(Math.max(save.scale | 0, 0), SCALES.length - 1);

    function drawChips() {
      el.chips.innerHTML = "";
      chipLabel("Scales:");
      SCALES.forEach(function (s, i) {
        chip(s.name, i === scaleIdx, function () {
          scaleIdx = i; save.scale = i; persist();
          drawChips(); playScale();
        }, "Hear the " + s.name + " scale");
      });
    }

    function playScale() {
      stopTimers();
      stopAllTones();
      clearFlashes();
      const s = SCALES[scaleIdx];
      el.title.textContent = "🪜 " + s.name;
      el.text.textContent = s.tip;
      const step = Math.max(200, Math.round(beatMs() * 0.55));
      s.notes.forEach(function (n, i) {
        tone(n, 0.4, i * step / 1000);
        later(function () {
          flash(n, "good", step + 40);
          el.bigNote.textContent = letterLabel(n);
        }, i * step);
      });
      later(function () { el.bigNote.textContent = "🎵"; }, s.notes.length * step + 400);
    }

    button("🎧 Hear the scale", playScale, true);
    drawChips();

    onPress = function (note) {
      el.bigNote.textContent = letterLabel(note);
      if (/#/.test(note)) el.text.textContent = "That black key is " + bothNames(note) + ".";
      if (recording) {
        if (!recording.length) recording.start = Date.now();
        recording.push({ note: note, t: Date.now() - recording.start });
        refresh();
      }
    };

    el.stars.innerHTML = '<span class="lbl">Tip:</span> the black keys are the sharps &amp; flats — press one to find out both of its names.';
    refresh();
  }

  /* ---------------- 🎵 Songs ---------------- */
  let songIdx = -1;

  // Old saves stored `true`; new ones store {stars:n}. Read both.
  function songStars(title) {
    const v = save.songs[title];
    if (!v) return 0;
    if (v === true) return 1;
    return Math.max(1, Math.min(3, v.stars | 0));
  }
  function saveSongStars(title, stars) {
    const best = Math.max(stars, songStars(title));
    save.songs[title] = { stars: best };
    persist();
  }
  function totalSongStars() {
    return Object.keys(save.songs).reduce(function (a, t) { return a + songStars(t); }, 0);
  }

  function renderSongList() {
    el.songList.innerHTML = "";
    SONGS.forEach(function (s, i) {
      const b = document.createElement("button");
      b.className = "song-btn";
      b.type = "button";
      b.dataset.song = String(i);
      b.setAttribute("aria-pressed", String(i === songIdx));
      const st = songStars(s.title);
      b.innerHTML = '<span aria-hidden="true">' + s.emoji + "</span> " + s.title +
        (st ? ' <span class="done" aria-label="' + st + ' of 3 stars">' + "★".repeat(st) + "</span>" : "") +
        "<small>" + s.teaches + (s.tricky ? ' <span class="tricky">♯ black keys</span>' : "") + "</small>";
      b.addEventListener("click", function () { startSong(i); });
      el.songList.appendChild(b);
    });
  }

  // Tempo + metronome chips — shared by Songs and Echo.
  function tempoChips(afterChange) {
    chipGroup("Tempo:", Object.keys(TEMPOS).map(function (k) {
      return { label: TEMPOS[k].label, value: k, aria: TEMPOS[k].label + ", " + TEMPOS[k].bpm + " beats per minute" };
    }), save.tempo, function (v) {
      save.tempo = v; persist();
      if (afterChange) afterChange();
    });
    chip("🥁 Metronome", save.metro, function () {
      save.metro = !save.metro; persist();
      if (!save.metro) stopMetro();
      if (afterChange) afterChange();
    }, "Metronome click on or off");
  }

  function modeSongs() {
    show(el.songList, true);
    show(el.track, true);
    el.title.textContent = "Pick a song 🎵";
    el.text.textContent = "Then play it! The next key to press will glow yellow.";
    el.hint.innerHTML = "Under each letter the dots show its <b>beats</b>: <b>•</b> = 1 beat, <b>••</b> = hold for 2, <b>·</b> = a quick half beat.";
    songIdx = -1;
    renderSongList();
    drawSongChips();
    songSummary();
  }

  function drawSongChips() {
    el.chips.innerHTML = "";
    tempoChips(function () { drawSongChips(); });
  }

  function songSummary() {
    const done = Object.keys(save.songs).length;
    el.stars.innerHTML = done
      ? '<span class="lbl">' + done + " of " + SONGS.length + " songs learned</span> — ★ " + totalSongStars() + " stars"
      : '<span class="lbl">Play a song right through to earn up to ★★★.</span>';
  }

  function startSong(i) {
    stopTimers();
    stopMetro();
    stopAllTones();
    clearFlashes();
    songIdx = i;
    const song = SONGS[i];
    const seq = parseSong(song.notes);
    const playable = seq.filter(function (n) { return !n.bar; });
    let at = 0, slips = 0;

    renderSongList();
    el.actions.innerHTML = "";
    el.title.textContent = song.emoji + " " + song.title;
    el.text.textContent = "Press the glowing key — " + playable.length + " notes. It teaches " + song.teaches + ".";

    function drawTrack() {
      el.track.innerHTML = "";
      let n = 0;
      seq.forEach(function (item) {
        const s = document.createElement("span");
        if (item.bar) { s.className = "tn bar"; s.textContent = " "; }
        else {
          const idx = n++;
          s.className = "tn" + (idx < at ? " done" : idx === at ? " now" : "");
          const b = document.createElement("b");
          b.textContent = letterLabel(item.note);
          const d = document.createElement("i");
          d.textContent = beatDots(item.beats);
          s.appendChild(b); s.appendChild(d);
        }
        el.track.appendChild(s);
      });
      setScore("Note <span>" + Math.min(at + 1, playable.length) + "</span> of <span>" + playable.length +
        "</span> &nbsp; Slips: <span>" + slips + "</span>");
    }

    function ask() {
      if (at >= playable.length) return finish();
      hintKey(playable[at].note);
      drawTrack();
    }

    function finish() {
      stopMetro();
      clearHints();
      drawTrack();
      const stars = slips <= 1 ? 3 : slips <= 5 ? 2 : 1;
      el.title.textContent = "🎉 You played " + song.title + "!";
      el.text.textContent = stars === 3
        ? "Perfect — barely a slip. " + starRow(3, 3)
        : stars === 2
          ? "Nicely done with " + slips + " slips. Two more perfect goes for ★★★!"
          : "You made it to the end! Try again for more stars.";
      saveSongStars(song.title, stars);
      renderSongList();
      songSummary();
      if (window.SFX) SFX.win();
      if (window.Confetti) Confetti.burst({ count: 70 });
    }

    function listen() {
      stopTimers();
      stopAllTones();
      clearHints();
      clearFlashes();
      startMetro();
      const B = beatMs();
      let t = 0;
      playable.forEach(function (n) {
        const when = t;
        tone(n.note, Math.max(0.28, n.beats * B / 1000 * 0.9), when / 1000);
        later(function () { flash(n.note, "good", Math.min(320, n.beats * B)); }, when);
        t += n.beats * B;
      });
      later(function () { stopMetro(); ask(); }, t + 250);
    }

    button("🎧 Listen first", listen, true);
    button("↺ Start over", function () {
      stopTimers(); stopMetro(); stopAllTones(); clearFlashes();
      at = 0; slips = 0; ask();
    }, true);
    button("🎵 All songs", function () { setMode("songs"); }, true);

    onPress = function (note) {
      if (at >= playable.length) return;
      if (note === playable[at].note) {
        flash(note, "good", 240);
        at++;
        if (at >= playable.length) finish();
        else ask();
      } else {
        flash(note, "bad", 260);
        buzz();
        slips++;
        const want = playable[at].note;
        el.text.textContent = "That was " + letter(note) + ". You want " + letter(want) +
          " — " + wayTo(note, want) + ".";
        drawTrack();
      }
    };

    ask();
  }

  /* ---------------- 👂 Echo (ear training) ---------------- */
  const ECHO_LEVELS = [
    { n: 1, label: "1️⃣ 3 notes", pool: ["C4", "E4", "G4"], blurb: "C, E and G — the notes of a C chord." },
    { n: 2, label: "2️⃣ 5 notes", pool: ["C4", "D4", "E4", "G4", "A4"], blurb: "The five pentatonic notes." },
    { n: 3, label: "3️⃣ Full octave", pool: WHITE.slice(0, 8), blurb: "All eight white keys, C to C." },
    { n: 4, label: "4️⃣ Black keys too", pool: WHITE.slice(0, 8).concat(["C#4", "D#4", "F#4", "G#4", "A#4"]), blurb: "Grown-up level: sharps are in the mix." }
  ];
  function echoLevel() {
    return ECHO_LEVELS[Math.min(Math.max((save.echoLevel | 0) - 1, 0), ECHO_LEVELS.length - 1)];
  }

  function modeEcho() {
    el.title.textContent = "Echo 👂";
    el.text.textContent = "Listen to the notes, then play them back on the piano.";
    show(el.bigNote, true);
    el.bigNote.textContent = "👂";

    let seq = [], at = 0, round = 0, playing = false;

    function drawChips() {
      el.chips.innerHTML = "";
      chipGroup("Level:", ECHO_LEVELS.map(function (L) {
        return { label: L.label, value: L.n, aria: "Echo level " + L.n + ": " + L.blurb };
      }), echoLevel().n, function (v) {
        save.echoLevel = v; persist();
        stopTimers(); stopAllTones();
        playing = false; seq = []; at = 0; round = 0;
        drawChips();
        el.text.textContent = echoLevel().blurb + " Press Start when you're ready.";
        el.bigNote.textContent = "👂";
        scores();
      });
    }

    function best() { return save.echoBestBy[echoLevel().n] || 0; }
    function setBest(v) {
      if (v > best()) { save.echoBestBy[echoLevel().n] = v; }
      if (v > (save.echoBest || 0)) save.echoBest = v;   // keeps the old save field alive
      persist();
    }

    function scores() {
      setScore("Round: <span>" + Math.max(round, 1) + "</span> &nbsp; Notes: <span>" +
        (seq.length || 2) + "</span> &nbsp; Best: <span>" + (best() + 1) + "</span>");
      el.stars.innerHTML = best()
        ? '<span class="lbl">Best on this level:</span> ' + (best() + 1) + " notes in a row"
        : '<span class="lbl">' + echoLevel().blurb + "</span>";
    }

    function playSeq() {
      playing = true;
      stopAllTones();
      clearHints();
      clearFlashes();
      el.bigNote.textContent = "👂";
      el.text.textContent = "Listen…";
      const gap = Math.max(380, Math.round(beatMs() * 1.1));
      seq.forEach(function (n, i) {
        tone(n, gap / 1000 * 0.8, i * gap / 1000);
        later(function () { flash(n, "good", gap * 0.6); }, i * gap);
      });
      later(function () {
        playing = false;
        at = 0;
        el.text.textContent = "Your turn! Play the " + seq.length + " notes.";
        el.bigNote.textContent = "🎹";
      }, seq.length * gap + 200);
    }

    function nextRound() {
      round++;
      const p = echoLevel().pool;
      seq = [];
      const len = round + 1;
      for (let i = 0; i < len; i++) {
        let pick = p[Math.floor(Math.random() * p.length)];
        // never three of the same note in a row — that's just boring
        if (i >= 2 && pick === seq[i - 1] && pick === seq[i - 2]) {
          pick = p[(p.indexOf(pick) + 1) % p.length];
        }
        seq.push(pick);
      }
      scores();
      playSeq();
    }

    button("▶ Start", function () { round = 0; nextRound(); });
    button("🔁 Hear it again", function () { if (!playing && seq.length) playSeq(); }, true);
    drawChips();

    onPress = function (note) {
      if (playing || !seq.length) return;
      if (note === seq[at]) {
        flash(note, "good", 200);
        at++;
        if (at >= seq.length) {
          el.bigNote.textContent = "🎉";
          el.text.textContent = "Perfect! " + seq.length + " notes — here comes one more.";
          if (window.SFX) SFX.good();
          setBest(round);
          scores();
          playing = true;              // no stray taps while the next round loads
          later(nextRound, 900);
        }
      } else {
        playing = true;                // lock input during the replay
        flash(note, "bad", 260);
        buzz();
        el.bigNote.textContent = "🤔";
        el.text.textContent = "Note " + (at + 1) + " was " + letter(seq[at]) + ", not " + letter(note) +
          " — " + wayTo(note, seq[at]) + ". Listen again…";
        later(playSeq, 1400);
      }
    };

    scores();
  }

  /* ---------------- 🔤 Find the Note ---------------- */
  const NAME_LEVELS = [
    { n: 1, label: "1️⃣ Letters" },
    { n: 2, label: "2️⃣ Sharps & flats" },
    { n: 3, label: "3️⃣ Intervals" }
  ];
  const INTERVALS = [
    { steps: 2, name: "2nd" }, { steps: 3, name: "3rd" }, { steps: 4, name: "4th" },
    { steps: 5, name: "5th" }, { steps: 6, name: "6th" }, { steps: 8, name: "octave" }
  ];

  function modeNames() {
    el.title.textContent = "Find the note 🔤";
    show(el.bigNote, true);

    let want = null, right = 0, streak = 0, asked = 0, ival = null, root = null;
    let level = Math.min(Math.max(save.nameLevel | 0, 1), 3);

    function scores() {
      setScore("Right: <span>" + right + " / " + asked + "</span> &nbsp; Streak: <span>" + streak +
        "</span> &nbsp; Stars: <span>" + save.nameStars + "</span>");
    }

    function drawChips() {
      el.chips.innerHTML = "";
      chipGroup("Level:", NAME_LEVELS.map(function (L) {
        return { label: L.label, value: L.n, aria: "Find the note, level " + L.n };
      }), level, function (v) {
        level = v; save.nameLevel = v; persist();
        streak = 0;
        drawChips();
        ask();
      });
    }

    function ask() {
      clearHints();
      clearFlashes();
      ival = null; root = null;
      if (level === 3) {
        // "start on C, now find a 5th above" — real interval counting
        ival = INTERVALS[Math.floor(Math.random() * INTERVALS.length)];
        const maxRoot = WHITE.length - ival.steps;
        root = WHITE[Math.floor(Math.random() * maxRoot)];
        want = WHITE[WHITE.indexOf(root) + ival.steps - 1];
        el.bigNote.classList.add("small");
        el.bigNote.textContent = letter(root) + " + a " + ival.name;
        el.text.textContent = "Start on " + letter(root) + " and count " + ival.steps +
          " letters up. Press the key you land on.";
        tone(root, 0.5, 0);
      } else {
        el.bigNote.classList.remove("small");
        const pool = level === 1
          ? WHITE.slice(0, 7)
          : WHITE.slice(0, 7).concat(BLACK.slice(0, 5).map(function (b) { return b.note; }));
        let n = pool[Math.floor(Math.random() * pool.length)];
        if (n === want) n = pool[(pool.indexOf(n) + 1) % pool.length];
        want = n;
        el.bigNote.textContent = letter(n);
        el.text.textContent = /#/.test(n)
          ? "Press the black key called " + bothNames(n) + "."
          : "Press the " + letter(n) + " key on the piano.";
      }
      asked++;
      scores();
    }

    button("▶ New note", ask);
    button("💡 Show me", function () { if (want) hintKey(want); }, true);
    drawChips();

    function correct(note) {
      // any octave of the right letter counts — the letter IS the lesson
      if (level === 3) return note === want;
      return letter(note) === letter(want);
    }

    onPress = function (note) {
      if (!want) return;
      if (correct(note)) {
        flash(note, "good", 300);
        clearHints();
        right++; streak++;
        save.nameStars++;
        if (streak > (save.nameStreakBest || 0)) save.nameStreakBest = streak;
        persist();
        el.text.textContent = level === 3
          ? "Yes! A " + ival.name + " up from " + letter(root) + " is " + letter(note) + ". 🎉"
          : "Yes! That's " + letter(note) + ". 🎉";
        if (window.SFX) SFX.good();
        if (streak > 0 && streak % 5 === 0 && window.Confetti) Confetti.burst({ count: 45 });
        el.stars.textContent = starRow(streak % 5 || 5, 5) + "   best streak " + (save.nameStreakBest || streak);
        scores();
        later(ask, 900);
      } else {
        flash(note, "bad", 260);
        buzz();
        streak = 0;
        if (level === 3) {
          el.text.textContent = "That's " + letter(note) + ". Count the letters: " +
            WHITE.slice(WHITE.indexOf(root), WHITE.indexOf(root) + ival.steps)
              .map(letter).join("–") + " — so " + wayTo(note, want) + ".";
        } else if (/#/.test(want) && !/#/.test(note)) {
          el.text.textContent = "Close — " + letter(want) + " is a BLACK key, right next to " +
            letter(want).charAt(0) + ".";
        } else {
          el.text.textContent = "That's " + letter(note) + ". " + letter(want) + " is " +
            wayTo(note, want) + ".";
        }
        scores();
      }
    };

    ask();
    el.stars.innerHTML = save.nameStreakBest
      ? '<span class="lbl">Best streak:</span> ' + save.nameStreakBest
      : "";
  }

  /* ---------------- 🎼 Read Music ---------------- */
  // Staff steps: E4 (bottom line) = 0, one step per line/space.
  const STAFF_NOTES = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5", "E5"];
  const STAFF_SHARPS = ["C#4", "D#4", "F#4", "G#4", "A#4", "C#5", "D#5"];
  const WHERE = {
    "C4": "on the little ledger line under the staff — that's middle C",
    "D4": "just under the bottom line",
    "E4": "on the bottom line",
    "F4": "in the first space",
    "G4": "on the second line",
    "A4": "in the second space",
    "B4": "on the middle line",
    "C5": "in the third space",
    "D5": "on the fourth line",
    "E5": "in the top space"
  };
  function natural(note) { return note.replace("#", ""); }
  function staffStep(note) { return STAFF_NOTES.indexOf(natural(note)) - 2; }  // E4 → 0, C4 → -2

  function drawStaff(note) {
    const y = function (step) { return 90 - 7.5 * step; };
    let svg = "";
    for (let i = 0; i < 5; i++) {
      const ly = 30 + i * 15;
      svg += '<line class="staff-line" x1="20" y1="' + ly + '" x2="320" y2="' + ly + '" />';
    }
    svg += '<text x="26" y="93" font-size="66" fill="#4f4869" font-family="serif">𝄞</text>';
    if (note) {
      const step = staffStep(note);
      const ny = y(step);
      const nx = 210;
      // ledger line for middle C (and anything else below the staff)
      if (step <= -2) svg += '<line class="staff-ledger" x1="' + (nx - 16) + '" y1="' + ny + '" x2="' + (nx + 16) + '" y2="' + ny + '" />';
      if (/#/.test(note)) {
        svg += '<text class="staff-acc" x="' + (nx - 40) + '" y="' + (ny + 9) + '" font-size="30" font-family="serif">♯</text>';
      }
      svg += '<ellipse class="staff-note" cx="' + nx + '" cy="' + ny + '" rx="10" ry="7" transform="rotate(-18 ' + nx + ' ' + ny + ')" />';
      const up = step < 4;
      svg += '<line stroke="#ff5d8f" stroke-width="3" x1="' + (up ? nx + 9 : nx - 9) + '" y1="' + ny +
        '" x2="' + (up ? nx + 9 : nx - 9) + '" y2="' + (up ? ny - 38 : ny + 38) + '" />';
    }
    el.staff.innerHTML = svg;
  }

  const STAFF_LEVELS = [
    { n: 1, label: "1️⃣ Notes" },
    { n: 2, label: "2️⃣ With sharps" },
    { n: 3, label: "⏱ Speed round" }
  ];

  function modeStaff() {
    el.title.textContent = "Read music 🎼";
    show(el.staff, true);

    let want = null, right = 0, asked = 0;
    let level = Math.min(Math.max(save.staffLevel | 0, 1), 3);
    let racing = false, secondsLeft = 0, raceScore = 0;

    function scores() {
      setScore("Right: <span>" + right + " / " + asked + "</span> &nbsp; Stars: <span>" + save.staffStars + "</span>" +
        (racing ? " &nbsp; ⏱ <span>" + secondsLeft + "s</span>" : ""));
    }

    function drawChips() {
      el.chips.innerHTML = "";
      chipGroup("Level:", STAFF_LEVELS.map(function (L) {
        return { label: L.label, value: L.n, aria: "Read music, level " + L.n };
      }), level, function (v) {
        level = v; save.staffLevel = v; persist();
        stopTimers();
        racing = false;
        drawChips();
        ask();
      });
    }

    function pool() {
      return level === 1 ? STAFF_NOTES : STAFF_NOTES.concat(STAFF_SHARPS);
    }

    function ask() {
      clearHints();
      clearFlashes();
      const p = pool();
      let n = p[Math.floor(Math.random() * p.length)];
      if (n === want) n = p[(p.indexOf(n) + 1) % p.length];
      want = n;
      asked++;
      drawStaff(n);
      el.text.textContent = level === 3 && racing
        ? "Go! How many can you read in " + secondsLeft + " seconds?"
        : "Which key is this note? Press it on the piano.";
      scores();
    }

    function startRace() {
      stopTimers();
      racing = true;
      raceScore = 0;
      secondsLeft = 30;
      const tick = function () {
        secondsLeft--;
        scores();
        if (secondsLeft <= 0) return endRace();
        later(tick, 1000);
      };
      later(tick, 1000);
      ask();
    }
    function endRace() {
      racing = false;
      clearHints();
      const b = save.staffSpeedBest || 0;
      if (raceScore > b) { save.staffSpeedBest = raceScore; persist(); }
      el.text.textContent = "Time! You read " + raceScore + " notes." +
        (raceScore > b ? " A new record! 🏆" : " Your best is " + save.staffSpeedBest + ".");
      if (window.SFX) SFX.win();
      if (raceScore > b && window.Confetti) Confetti.burst({ count: 60 });
      scores();
    }

    button("▶ New note", function () {
      if (level === 3) startRace(); else ask();
    });
    button("💡 Show me", function () { if (want) hintKey(want); }, true);
    button("🎧 Hear it", function () { if (want) tone(want, 0.7, 0); }, true);
    drawChips();

    onPress = function (note) {
      if (!want) return;
      if (note === want) {
        flash(note, "good", 300);
        clearHints();
        right++;
        raceScore++;
        save.staffStars++;
        persist();
        el.text.textContent = "Yes! That note is " + letter(note) + " — " + (WHERE[natural(note)] || "") +
          (/#/.test(note) ? ", with a ♯ in front so play the black key" : "") + ". 🎉";
        if (window.SFX) SFX.good();
        if (right % 5 === 0 && window.Confetti) Confetti.burst({ count: 45 });
        scores();
        later(ask, racing ? 450 : 1000);
      } else {
        flash(note, "bad", 260);
        buzz();
        el.text.textContent = "That one is " + letter(note) + ". The note on the staff sits " +
          (WHERE[natural(want)] || "somewhere else") + " — that's " + letter(want) + ".";
        scores();
      }
    };

    ask();
    el.stars.innerHTML = '<span class="lbl">⭐ ' + save.staffStars + " notes read</span>" +
      (save.staffSpeedBest ? " — speed record " + save.staffSpeedBest : "");
  }

  /* ---------------- 🎸 Chords ---------------- */
  const CHORDS = [
    { name: "C major", notes: ["C4", "E4", "G4"], mood: "happy" },
    { name: "D minor", notes: ["D4", "F4", "A4"], mood: "sad" },
    { name: "E minor", notes: ["E4", "G4", "B4"], mood: "sad" },
    { name: "F major", notes: ["F4", "A4", "C5"], mood: "happy" },
    { name: "G major", notes: ["G4", "B4", "D5"], mood: "happy" },
    { name: "A minor", notes: ["A4", "C5", "E5"], mood: "sad" },
    { name: "C minor", notes: ["C4", "D#4", "G4"], mood: "sad", hard: true },
    { name: "D major", notes: ["D4", "F#4", "A4"], mood: "happy", hard: true },
    { name: "E major", notes: ["E4", "G#4", "B4"], mood: "happy", hard: true },
    { name: "A major", notes: ["A4", "C#5", "E5"], mood: "happy", hard: true }
  ];
  const CHORD_LEVELS = [
    { n: 1, label: "1️⃣ Show me" },
    { n: 2, label: "2️⃣ Just the name" },
    { n: 3, label: "3️⃣ By ear" }
  ];

  function modeChords() {
    el.title.textContent = "Build a chord 🎸";
    show(el.bigNote, true);
    el.bigNote.classList.add("small");
    el.hint.innerHTML = "A <b>triad</b> is three notes stacked up: play a key, skip one white key, play the next — then skip again.";

    let want = null, found = [], built = 0, streak = 0;
    let level = Math.min(Math.max(save.chordLevel | 0, 1), 3);

    function scores() {
      setScore("Chords built: <span>" + save.chordCount + "</span> &nbsp; Streak: <span>" + streak +
        "</span> &nbsp; Best: <span>" + (save.chordStreakBest || 0) + "</span>");
    }

    function drawChips() {
      el.chips.innerHTML = "";
      chipGroup("Level:", CHORD_LEVELS.map(function (L) {
        return { label: L.label, value: L.n, aria: "Chords, level " + L.n };
      }), level, function (v) {
        level = v; save.chordLevel = v; persist();
        streak = 0;
        drawChips();
        ask();
      });
    }

    function ask() {
      stopTimers();
      clearHints();
      clearFlashes();
      found = [];
      const pool = level === 1 ? CHORDS.filter(function (c) { return !c.hard; }) : CHORDS;
      let c = pool[Math.floor(Math.random() * pool.length)];
      if (want && c.name === want.name) c = pool[(pool.indexOf(c) + 1) % pool.length];
      want = c;

      if (level === 3) {
        el.bigNote.textContent = "👂 ? ? ?";
        el.text.textContent = "Listen to the chord, then find its three notes.";
        later(function () { chordTone(want.notes, 1.3, 0); }, 200);
      } else {
        el.bigNote.textContent = want.name;
        el.text.textContent = level === 1
          ? want.name + " is " + want.notes.map(letter).join(" + ") +
            ". It sounds " + want.mood + " because of the middle note. Press all three!"
          : "Find the three notes of " + want.name + ". Start on " + letter(want.notes[0]) +
            ", then skip a key, then skip again.";
        later(function () { chordTone(want.notes, 1.1, 0); }, 150);
        if (level === 1) hintKeys(want.notes);
      }
      scores();
    }

    function done() {
      clearHints();
      built++;
      streak++;
      save.chordCount++;
      if (streak > (save.chordStreakBest || 0)) save.chordStreakBest = streak;
      persist();
      el.bigNote.textContent = want.name + " 🎉";
      el.text.textContent = want.name + " = " + want.notes.map(letter).join(" + ") +
        " — a " + (want.mood === "happy" ? "MAJOR" : "MINOR") + " chord, so it sounds " + want.mood + ".";
      chordTone(want.notes, 1.4, 0);
      if (window.SFX) SFX.good();
      if (streak % 3 === 0 && window.Confetti) Confetti.burst({ count: 45 });
      scores();
      el.stars.textContent = starRow(streak % 3 || 3, 3);
      later(ask, 1600);
    }

    button("▶ New chord", ask);
    button("🎧 Hear it", function () { if (want) chordTone(want.notes, 1.2, 0); }, true);
    button("💡 Give me a hint", function () {
      if (!want) return;
      el.bigNote.textContent = want.name;
      hintKeys(want.notes.filter(function (n) { return found.indexOf(n) < 0; }));
    }, true);
    drawChips();

    onPress = function (note) {
      if (!want) return;
      if (want.notes.indexOf(note) >= 0) {
        if (found.indexOf(note) >= 0) return;
        found.push(note);
        if (keyEls[note]) keyEls[note].classList.add("held");
        if (keyEls[note]) keyEls[note].classList.remove("hint");
        if (found.length >= want.notes.length) done();
        else el.text.textContent = "Yes — " + letter(note) + ". " +
          (want.notes.length - found.length) + " more to find.";
      } else {
        flash(note, "bad", 260);
        buzz();
        streak = 0;
        const missing = want.notes.filter(function (n) { return found.indexOf(n) < 0; });
        el.text.textContent = "Not " + letter(note) + " — " +
          (level === 3 ? "listen again, that note clashes." :
            want.name + " needs " + missing.map(letter).join(" and ") + ".");
        scores();
      }
    };

    scores();
    el.stars.innerHTML = '<span class="lbl">Major chords sound happy, minor chords sound sad — the only difference is the middle note.</span>';
    ask();
  }

  /* =========================================================
     WIRING
     ========================================================= */
  buildPiano();

  el.modes.addEventListener("click", function (e) {
    const b = e.target.closest(".mode-btn");
    if (b) setMode(b.dataset.mode);
  });

  // note names on / off — off turns every mode into a real challenge
  function applyLabels() {
    el.labels.setAttribute("aria-pressed", String(!!save.labels));
    Object.keys(keyEls).forEach(function (n) {
      keyEls[n].classList.toggle("hide-label", !save.labels);
    });
  }
  el.labels.addEventListener("click", function () {
    save.labels = !save.labels;
    persist();
    applyLabels();
  });
  applyLabels();

  // ♯ / ♭ — the same black key has two names, and kids meet both
  function applyFlats() {
    el.flats.setAttribute("aria-pressed", String(!!save.flats));
    el.flats.textContent = save.flats ? "♯ Show sharp names" : "♭ Show flat names";
    paintKeyNames();
  }
  el.flats.addEventListener("click", function () {
    save.flats = !save.flats;
    persist();
    applyFlats();
    setMode(mode);
  });
  applyFlats();

  // laptop keyboard
  document.addEventListener("keydown", function (e) {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA)$/.test((e.target && e.target.tagName) || "")) return;
    const k = e.key.toLowerCase();
    const w = TYPE_WHITE.indexOf(k);
    const note = w >= 0 ? WHITE[w] : TYPE_BLACK[k];
    if (!note) return;
    e.preventDefault();
    press(note);
  });

  // hide the laptop hint on touch devices where it means nothing
  if (window.matchMedia && window.matchMedia("(hover: none)").matches) {
    el.hint.textContent = "Tip: turn the note names off for a real challenge!";
  }

  // a tab-away or a locked phone should not leave notes ringing
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { stopTimers(); stopMetro(); stopAllTones(); }
  });

  setMode("free");
})();
