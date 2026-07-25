/* ===========================================================
   Music Lab — a real playable piano for the arcade.
   -----------------------------------------------------------
   Five ways to play, all on the same keyboard:

     🎹 Free Play      press keys, see the note name, record a
                       little tune of your own and play it back
     🎵 Songs          the next key glows — play a whole song
     👂 Echo           hear a few notes, play them back (ear
                       training that grows one note at a time)
     🔤 Find the Note  "Find G" → press the right key
     🎼 Read Music     a note on the staff → press the key

   What it teaches: note names & letters, high vs low, patterns
   and sequences, listening & musical memory, and reading music
   on a treble staff.

   Sound is pure Web Audio (no files) with a soft toy-piano
   tone. Everything is wrapped so a browser without audio just
   stays quiet instead of breaking. Progress saves in
   localStorage, so stars and finished songs stick around.
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
  const BEAT = 420;              // ms per beat when the piano plays for you
  const SAVE_KEY = "music-lab.v1";

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
    scorebar: document.getElementById("scorebar"),
    stars: document.getElementById("stars"),
    songList: document.getElementById("song-list"),
    labels: document.getElementById("labels-toggle"),
    hint: document.getElementById("hint-line")
  };

  /* ---------------- saved progress ---------------- */
  let save = { songs: {}, echoBest: 0, nameStars: 0, staffStars: 0, tune: [], labels: true };
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (raw && typeof raw === "object") save = Object.assign(save, raw);
  } catch (e) { /* first visit */ }
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
  }

  /* =========================================================
     SOUND — a soft toy piano built from two oscillators
     ========================================================= */
  let ctx = null, master = null;

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

  function hz(note) {
    const m = /^([A-G])(#?)(\d)$/.exec(note);
    if (!m) return 440;
    const midi = 12 * (Number(m[3]) + 1) + SEMI[m[1]] + (m[2] ? 1 : 0);
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // Play `note` for `dur` seconds, `delay` seconds from now.
  function tone(note, dur, delay) {
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
      g.connect(lp); lp.connect(master);

      const body = c.createOscillator();
      body.type = "triangle";
      body.frequency.value = f;
      const shimmer = c.createOscillator();
      shimmer.type = "sine";
      shimmer.frequency.value = f * 2;
      const sg = c.createGain();
      sg.gain.value = 0.28;
      body.connect(g); shimmer.connect(sg); sg.connect(g);

      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.9, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.28, t0 + Math.min(0.22, d * 0.5));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      body.start(t0); shimmer.start(t0);
      body.stop(t0 + d + 0.05); shimmer.stop(t0 + d + 0.05);
    } catch (e) { /* no audio — the game still works silently */ }
  }

  function buzz() { // gentle "not that one"
    const c = audio();
    if (!c) return;
    tone("C4", 0.18, 0);
    tone("C#4", 0.22, 0.06);
  }

  /* =========================================================
     BUILD THE PIANO
     ========================================================= */
  const keyEls = {};   // note -> button

  function letterLabel(note) {
    const m = /^([A-G])(#?)(\d)$/.exec(note);
    if (!m) return note;
    return m[1] + (m[2] ? "♯" : "") + (Number(m[3]) >= 5 ? "↑" : "");
  }
  // just the letter name — "C♯5" → "C♯", used when we talk about a note
  function letter(note) { return letterLabel(note).replace("↑", ""); }

  function buildPiano() {
    WHITE.forEach(function (note, i) {
      const b = document.createElement("button");
      b.className = "key white";
      b.dataset.note = note;
      b.type = "button";
      b.setAttribute("aria-label", note.replace(/(\d)/, " octave $1"));
      b.textContent = letterLabel(note);
      el.piano.appendChild(b);
      keyEls[note] = b;
      wireKey(b, note);
      // a tiny keyboard hint under the letter, laptops only
      const t = document.createElement("small");
      t.style.cssText = "font-weight:normal;font-size:0.62rem;opacity:0.55;";
      t.textContent = TYPE_WHITE[i] === ";" ? ";" : TYPE_WHITE[i].toUpperCase();
      b.appendChild(t);
    });

    BLACK.forEach(function (k) {
      const b = document.createElement("button");
      b.className = "key black";
      b.dataset.note = k.note;
      b.type = "button";
      b.setAttribute("aria-label", k.note.replace("#", " sharp").replace(/(\d)/, " octave $1"));
      b.textContent = letterLabel(k.note);
      // sits on the seam between two white keys
      b.style.left = "calc(8px + (100% - 16px) * " + ((k.after + 1) / WHITE.length) + ")";
      el.piano.appendChild(b);
      keyEls[k.note] = b;
      wireKey(b, k.note);
    });
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
  }

  function flash(note, cls, ms) {
    const k = keyEls[note];
    if (!k) return;
    k.classList.add(cls || "down");
    setTimeout(function () { k.classList.remove(cls || "down"); }, ms || 180);
  }

  function clearHints() {
    Object.keys(keyEls).forEach(function (n) { keyEls[n].classList.remove("hint"); });
  }
  function hintKey(note) {
    clearHints();
    if (keyEls[note]) keyEls[note].classList.add("hint");
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
  function starRow(n, max) {
    const full = Math.min(n, max || n);
    return "⭐".repeat(full) + (max ? "☆".repeat(Math.max(0, max - full)) : "");
  }
  function setScore(html) { el.scorebar.innerHTML = html; }
  function show(node, on) { node.classList.toggle("hidden", !on); }

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
    clearHints();
    mode = next;
    el.modes.querySelectorAll(".mode-btn").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.mode === next));
    });
    el.actions.innerHTML = "";
    el.track.innerHTML = "";
    show(el.track, false);
    show(el.bigNote, false);
    show(el.staff, false);
    show(el.songList, false);
    el.stars.textContent = "";
    setScore("");
    onPress = function () {};
    ({ free: modeFree, songs: modeSongs, echo: modeEcho, names: modeNames, staff: modeStaff }[next] || modeFree)();
  }

  /* ---------------- 🎹 Free Play (+ record your own tune) ---------------- */
  function modeFree() {
    el.title.textContent = "Play the piano! 🎶";
    el.text.textContent = "Tap any key to hear it. The letter on the key is its note name.";
    show(el.bigNote, true);
    el.bigNote.textContent = "🎵";

    let recording = null;      // [{note, t}] while the red button is on
    let recBtn, playBtn;

    function refresh() {
      recBtn.textContent = recording ? "⏹ Stop recording" : "🔴 Record my tune";
      playBtn.disabled = recording !== null || !save.tune.length;
      setScore(recording
        ? "Recording… <span>" + recording.length + "</span> note" + (recording.length === 1 ? "" : "s")
        : (save.tune.length ? "My tune: <span>" + save.tune.length + "</span> notes" : "Record a tune and it saves for next time!"));
    }

    recBtn = button("🔴 Record my tune", function () {
      if (recording) {
        save.tune = recording.slice(0, 60);
        recording = null;
        persist();
        if (window.SFX) SFX.good();
      } else {
        recording = [];
        recording.start = Date.now();
      }
      refresh();
    });

    playBtn = button("▶ Play my tune", function () {
      if (!save.tune.length) return;
      stopTimers();
      save.tune.forEach(function (n) {
        later(function () { tone(n.note, 0.6, 0); flash(n.note, "good", 200); el.bigNote.textContent = letterLabel(n.note); }, n.t);
      });
    }, true);

    button("🎼 Hear a scale", function () {
      stopTimers();
      WHITE.forEach(function (n, i) {
        tone(n, 0.4, i * 0.22);
        later(function () { flash(n, "good", 200); el.bigNote.textContent = letterLabel(n); }, i * 220);
      });
    }, true);

    onPress = function (note) {
      el.bigNote.textContent = letterLabel(note);
      if (recording) {
        if (!recording.length) recording.start = Date.now();
        recording.push({ note: note, t: Date.now() - recording.start });
        refresh();
      }
    };

    refresh();
  }

  /* ---------------- 🎵 Songs ---------------- */
  let songIdx = -1;

  function renderSongList() {
    el.songList.innerHTML = "";
    SONGS.forEach(function (s, i) {
      const b = document.createElement("button");
      b.className = "song-btn";
      b.type = "button";
      b.dataset.song = String(i);
      b.setAttribute("aria-pressed", String(i === songIdx));
      b.innerHTML = '<span aria-hidden="true">' + s.emoji + "</span> " + s.title +
        (save.songs[s.title] ? ' <span class="done" aria-label="finished">★</span>' : "") +
        "<small>" + s.teaches + "</small>";
      b.addEventListener("click", function () { startSong(i); });
      el.songList.appendChild(b);
    });
  }

  function modeSongs() {
    show(el.songList, true);
    show(el.track, true);
    el.title.textContent = "Pick a song 🎵";
    el.text.textContent = "Then play it! The next key to press will glow yellow.";
    songIdx = -1;
    renderSongList();
    const done = Object.keys(save.songs).length;
    el.stars.textContent = done ? "★".repeat(done) + "  " + done + " of " + SONGS.length + " learned" : "";
    setScore("");
  }

  function startSong(i) {
    stopTimers();
    songIdx = i;
    const song = SONGS[i];
    const seq = parseSong(song.notes);
    const playable = seq.filter(function (n) { return !n.bar; });
    let at = 0;

    renderSongList();
    el.actions.innerHTML = "";
    el.title.textContent = song.emoji + " " + song.title;
    el.text.textContent = "Press the glowing key — " + playable.length + " notes.";

    function drawTrack() {
      el.track.innerHTML = "";
      let n = 0;
      seq.forEach(function (item) {
        const s = document.createElement("span");
        if (item.bar) { s.className = "tn bar"; s.textContent = " "; }
        else {
          const idx = n++;
          s.className = "tn" + (idx < at ? " done" : idx === at ? " now" : "");
          s.textContent = letterLabel(item.note);
        }
        el.track.appendChild(s);
      });
      setScore("Note <span>" + Math.min(at + 1, playable.length) + "</span> of <span>" + playable.length + "</span>");
    }

    function ask() {
      if (at >= playable.length) return finish();
      hintKey(playable[at].note);
      drawTrack();
    }

    function finish() {
      clearHints();
      drawTrack();
      el.title.textContent = "🎉 You played " + song.title + "!";
      el.text.textContent = "Pick another song, or play this one again.";
      if (!save.songs[song.title]) { save.songs[song.title] = true; persist(); }
      renderSongList();
      const done = Object.keys(save.songs).length;
      el.stars.textContent = "★".repeat(done) + "  " + done + " of " + SONGS.length + " learned";
      if (window.SFX) SFX.win();
      if (window.Confetti) Confetti.burst({ count: 70 });
    }

    function listen() {
      stopTimers();
      clearHints();
      let t = 0;
      playable.forEach(function (n) {
        const when = t;
        tone(n.note, Math.max(0.35, n.beats * BEAT / 1000 * 0.9), when / 1000);
        later(function () { flash(n.note, "good", Math.min(320, n.beats * BEAT)); }, when);
        t += n.beats * BEAT;
      });
      later(ask, t + 250);
    }

    button("🎧 Listen first", listen, true);
    button("↺ Start over", function () { at = 0; ask(); }, true);

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
      }
    };

    ask();
  }

  /* ---------------- 👂 Echo (ear training) ---------------- */
  function modeEcho() {
    el.title.textContent = "Echo 👂";
    el.text.textContent = "Listen to the notes, then play them back on the piano.";
    show(el.bigNote, true);
    el.bigNote.textContent = "👂";

    let seq = [], at = 0, round = 0, playing = false;

    function pool() {
      // grows with the rounds: 3 notes → 5 → the whole octave
      if (round <= 3) return ["C4", "E4", "G4"];
      if (round <= 6) return ["C4", "D4", "E4", "G4", "A4"];
      return WHITE.slice(0, 8);
    }

    function scores() {
      setScore("Round: <span>" + Math.max(round, 1) + "</span> &nbsp; Notes: <span>" +
        (seq.length || 2) + "</span> &nbsp; Best: <span>" + save.echoBest + "</span>");
    }

    function playSeq() {
      playing = true;
      clearHints();
      el.bigNote.textContent = "👂";
      el.text.textContent = "Listen…";
      seq.forEach(function (n, i) {
        tone(n, 0.45, i * 0.55);
        later(function () { flash(n, "good", 320); }, i * 550);
      });
      later(function () {
        playing = false;
        at = 0;
        el.text.textContent = "Your turn! Play the " + seq.length + " notes.";
        el.bigNote.textContent = "🎹";
      }, seq.length * 550 + 200);
    }

    function nextRound() {
      round++;
      const p = pool();
      seq = [];
      const len = round + 1;
      for (let i = 0; i < len; i++) seq.push(p[Math.floor(Math.random() * p.length)]);
      scores();
      playSeq();
    }

    function again() { if (!playing) playSeq(); }

    button("▶ Start", function () { round = 0; nextRound(); });
    button("🔁 Hear it again", again, true);

    onPress = function (note) {
      if (playing || !seq.length) return;
      if (note === seq[at]) {
        flash(note, "good", 200);
        at++;
        if (at >= seq.length) {
          el.bigNote.textContent = "🎉";
          el.text.textContent = "Perfect! " + seq.length + " notes — here comes one more.";
          if (window.SFX) SFX.good();
          if (round > save.echoBest) { save.echoBest = round; persist(); }
          scores();
          later(nextRound, 900);
        }
      } else {
        flash(note, "bad", 260);
        buzz();
        el.bigNote.textContent = "🤔";
        el.text.textContent = "Not quite — listen once more.";
        later(playSeq, 700);
      }
    };

    scores();
    el.stars.textContent = save.echoBest ? "Best so far: " + (save.echoBest + 1) + " notes in a row" : "";
  }

  /* ---------------- 🔤 Find the Note ---------------- */
  function modeNames() {
    el.title.textContent = "Find the note 🔤";
    show(el.bigNote, true);

    let want = null, right = 0, streak = 0, asked = 0;

    function scores() {
      setScore("Right: <span>" + right + " / " + asked + "</span> &nbsp; Streak: <span>" + streak +
        "</span> &nbsp; Stars: <span>" + save.nameStars + "</span>");
    }

    function ask() {
      const choices = WHITE.slice(0, 7);          // the seven letters C D E F G A B
      let n = choices[Math.floor(Math.random() * choices.length)];
      if (n === want) n = choices[(choices.indexOf(n) + 1) % choices.length];
      want = n;
      asked++;
      el.bigNote.textContent = letter(n);
      el.text.textContent = "Press the " + letter(n) + " key on the piano.";
      scores();
    }

    button("▶ New note", ask);
    button("💡 Show me", function () { if (want) hintKey(want); }, true);

    onPress = function (note) {
      if (!want) return;
      // any octave of the right letter counts — the letter IS the lesson
      if (letter(note) === letter(want)) {
        flash(note, "good", 300);
        clearHints();
        right++; streak++;
        save.nameStars++;
        persist();
        el.text.textContent = "Yes! That's " + letter(note) + ". 🎉";
        if (window.SFX) SFX.good();
        if (streak > 0 && streak % 5 === 0 && window.Confetti) Confetti.burst({ count: 45 });
        el.stars.textContent = starRow(streak % 5 || 5, 5);
        scores();
        later(ask, 900);
      } else if (/#/.test(note)) {
        flash(note, "bad", 200);   // black keys aren't asked for — just a nudge
      } else {
        flash(note, "bad", 260);
        buzz();
        streak = 0;
        el.text.textContent = "That's " + letter(note) + ". Try again — look for " + letter(want) + ".";
        scores();
      }
    };

    ask();
  }

  /* ---------------- 🎼 Read Music ---------------- */
  // Staff steps: E4 (bottom line) = 0, one step per line/space.
  const STAFF_NOTES = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5", "E5"];
  function staffStep(note) { return STAFF_NOTES.indexOf(note) - 2; }  // E4 → 0, C4 → -2

  function drawStaff(note) {
    const y = function (step) { return 90 - 7.5 * step; };
    let svg = "";
    for (let i = 0; i < 5; i++) {
      const ly = 30 + i * 15;
      svg += '<line class="staff-line" x1="20" y1="' + ly + '" x2="320" y2="' + ly + '" />';
    }
    svg += '<text x="26" y="93" font-size="66" fill="#6a6385" font-family="serif">𝄞</text>';
    if (note) {
      const step = staffStep(note);
      const ny = y(step);
      const nx = 210;
      // ledger line for middle C (and anything else below the staff)
      if (step <= -2) svg += '<line class="staff-ledger" x1="' + (nx - 16) + '" y1="' + ny + '" x2="' + (nx + 16) + '" y2="' + ny + '" />';
      svg += '<ellipse class="staff-note" cx="' + nx + '" cy="' + ny + '" rx="10" ry="7" transform="rotate(-18 ' + nx + ' ' + ny + ')" />';
      const up = step < 4;
      svg += '<line stroke="#ff5d8f" stroke-width="3" x1="' + (up ? nx + 9 : nx - 9) + '" y1="' + ny +
        '" x2="' + (up ? nx + 9 : nx - 9) + '" y2="' + (up ? ny - 38 : ny + 38) + '" />';
    }
    el.staff.innerHTML = svg;
  }

  function modeStaff() {
    el.title.textContent = "Read music 🎼";
    show(el.staff, true);

    let want = null, right = 0, asked = 0;

    function scores() {
      setScore("Right: <span>" + right + " / " + asked + "</span> &nbsp; Stars: <span>" + save.staffStars + "</span>");
    }

    function ask() {
      let n = STAFF_NOTES[Math.floor(Math.random() * STAFF_NOTES.length)];
      if (n === want) n = STAFF_NOTES[(STAFF_NOTES.indexOf(n) + 1) % STAFF_NOTES.length];
      want = n;
      asked++;
      drawStaff(n);
      el.text.textContent = "Which key is this note? Press it on the piano.";
      scores();
    }

    button("▶ New note", ask);
    button("💡 Show me", function () { if (want) hintKey(want); }, true);
    button("🎧 Hear it", function () { if (want) tone(want, 0.7, 0); }, true);

    onPress = function (note) {
      if (!want) return;
      if (note === want) {
        flash(note, "good", 300);
        clearHints();
        right++;
        save.staffStars++;
        persist();
        el.text.textContent = "Yes! That note is " + letter(note) + ". 🎉";
        if (window.SFX) SFX.good();
        if (right % 5 === 0 && window.Confetti) Confetti.burst({ count: 45 });
        scores();
        later(ask, 1000);
      } else {
        flash(note, "bad", 260);
        buzz();
        el.text.textContent = "That one is " + letter(note) + ". Look again!";
        scores();
      }
    };

    ask();
    el.stars.textContent = save.staffStars ? "⭐ " + save.staffStars + " notes read" : "";
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

  setMode("free");
})();
