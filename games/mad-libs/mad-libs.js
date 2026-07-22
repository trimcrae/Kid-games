/* ===========================================================
   MAD LIBS  —  game logic
   Pick a story → give silly words one at a time → reveal &
   read aloud the finished goofy story.  Teaches parts of speech.
   =========================================================== */
(function () {
  "use strict";

  // ---- persistent progress (which stories have been played) ----
  const SAVE_KEY = "madLibs.v1";

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && typeof s === "object" && s.completed && typeof s.completed === "object") {
        return { completed: s.completed };
      }
    } catch (e) { /* ignore corrupt save */ }
    return { completed: {} };
  }

  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }

  const state = load();

  // ---- short-lived play state ----
  let story = null;     // the current MADLIBS entry
  let answers = [];      // words the kid has typed, by blank index
  let step = 0;          // which blank we're on

  // ---- elements ----
  const el = {
    picker:     document.getElementById("picker"),
    cards:      document.getElementById("cards"),
    playedCount:document.getElementById("playedCount"),
    entry:      document.getElementById("entry"),
    progress:   document.getElementById("progress"),
    barFill:    document.getElementById("barFill"),
    askLabel:   document.getElementById("askLabel"),
    askExample: document.getElementById("askExample"),
    askHint:    document.getElementById("askHint"),
    wordInput:  document.getElementById("wordInput"),
    backBtn:    document.getElementById("backBtn"),
    nextBtn:    document.getElementById("nextBtn"),
    reveal:     document.getElementById("reveal"),
    storyTitle: document.getElementById("storyTitle"),
    storyText:  document.getElementById("storyText"),
    againBtn:   document.getElementById("againBtn"),
    pickBtn:    document.getElementById("pickBtn"),
    readBtn:    document.getElementById("readBtn")
  };

  function show(section) {
    el.picker.classList.toggle("hidden", section !== "picker");
    el.entry.classList.toggle("hidden", section !== "entry");
    el.reveal.classList.toggle("hidden", section !== "reveal");
  }

  // ---------------- PICKER ----------------
  function countPlayed() {
    return MADLIBS.filter(function (s) { return state.completed[s.id]; }).length;
  }

  function buildPicker() {
    el.cards.innerHTML = "";
    const played = countPlayed();
    if (el.playedCount) {
      el.playedCount.textContent = played >= MADLIBS.length
        ? "🏆 You've made ALL " + MADLIBS.length + " silly stories — you're a Mad Libs master!"
        : played > 0
          ? "You've made " + played + " of " + MADLIBS.length + " silly stories. Keep going!"
          : MADLIBS.length + " silly stories are waiting for your words!";
    }
    MADLIBS.forEach(function (s) {
      const card = document.createElement("button");
      card.className = "ml-card";
      card.style.setProperty("--accent", s.color);
      card.setAttribute("aria-label", s.title);

      const tick = state.completed[s.id] ? '<span class="ml-tick" aria-hidden="true">✅</span>' : "";
      card.innerHTML =
        tick +
        '<span class="ml-emoji" aria-hidden="true">' + s.emoji + "</span>" +
        '<span class="ml-name">' + s.title + "</span>";

      card.addEventListener("click", function () { startStory(s); });
      el.cards.appendChild(card);
    });
  }

  // ---------------- WORD ENTRY ----------------
  function startStory(s) {
    story = s;
    answers = [];
    step = 0;
    show("entry");
    renderStep();
  }

  function renderStep() {
    const blank = story.blanks[step];
    const total = story.blanks.length;
    el.progress.textContent = "word " + (step + 1) + " of " + total;
    el.barFill.style.width = Math.round((step / total) * 100) + "%";
    el.askLabel.textContent = blank.label;
    el.askExample.textContent = blank.example ? "like “" + blank.example + "”" : "";
    // the mini grammar lesson for this word type
    const hint = (typeof MADLIB_HINTS !== "undefined" && MADLIB_HINTS[blank.type]) || "";
    el.askHint.textContent = hint;
    el.askHint.style.display = hint ? "" : "none";
    el.wordInput.value = answers[step] || "";
    el.backBtn.disabled = step === 0;
    el.nextBtn.textContent = step === total - 1 ? "See my story! ✨" : "Next →";
    el.wordInput.focus();
  }

  function commitAndNext() {
    const word = el.wordInput.value.trim();
    if (!word) {
      // a friendly nudge: wobble the box instead of silently ignoring the tap
      window.SFX && SFX.nope();
      el.wordInput.classList.remove("shake");
      void el.wordInput.offsetWidth;
      el.wordInput.classList.add("shake");
      el.wordInput.focus();
      return;
    }
    answers[step] = word;
    window.SFX && SFX.good();   // a happy chime for each silly word
    if (step < story.blanks.length - 1) {
      step++;
      renderStep();
    } else {
      reveal();
    }
  }

  function goBack() {
    if (step === 0) return;
    answers[step] = el.wordInput.value.trim();   // remember what's typed
    step--;
    renderStep();
  }

  el.nextBtn.addEventListener("click", commitAndNext);
  el.backBtn.addEventListener("click", goBack);
  el.wordInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); commitAndNext(); }
  });

  // ---------------- REVEAL ----------------
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // Replace {0},{1}… with the kid's words.  HTML version highlights them;
  // plain version is what we read aloud.
  function fillTemplate(asHtml) {
    return story.template.replace(/\{(\d+)\}/g, function (_, n) {
      const word = answers[Number(n)] || "____";
      if (asHtml) {
        return '<span class="ml-fill">' + escapeHtml(word) + "</span>";
      }
      return word;
    });
  }

  function reveal() {
    el.storyTitle.textContent = story.emoji + " " + story.title;
    el.storyText.innerHTML = fillTemplate(true);
    wrapWordsForHighlight();
    show("reveal");

    const wasNew = !state.completed[story.id];
    state.completed[story.id] = true;
    save();

    window.SFX && SFX.win();
    // finishing the very last story earns an extra-big shower
    const finishedAll = MADLIBS.every(function (s) { return state.completed[s.id]; });
    window.Confetti && Confetti.burst({ count: wasNew && finishedAll ? 180 : 70 });
  }

  // Wrap every word of the revealed story in a span (keeping the pink
  // .ml-fill highlights intact) and remember each word's character
  // offset in the plain story text, so read-aloud can light words up.
  let wordSpans = [];   // [{ start, el }] in reading order

  function wrapWordsForHighlight() {
    wordSpans = [];
    const walker = document.createTreeWalker(el.storyText, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    let offset = 0;
    nodes.forEach(function (node) {
      const text = node.nodeValue;
      const frag = document.createDocumentFragment();
      const re = /\S+/g;
      let m, last = 0;
      while ((m = re.exec(text)) !== null) {
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        const sp = document.createElement("span");
        sp.className = "ml-w";
        sp.textContent = m[0];
        frag.appendChild(sp);
        wordSpans.push({ start: offset + m.index, el: sp });
        last = m.index + m[0].length;
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(frag, node);
      offset += text.length;
    });
  }

  function clearHighlight() {
    wordSpans.forEach(function (w) { w.el.classList.remove("speaking"); });
  }

  function highlightAt(charIndex) {
    // the utterance starts with "<title>. " before the story text
    const idx = charIndex - (story.title.length + 2);
    if (idx < 0) return;
    let cur = null;
    for (let i = 0; i < wordSpans.length; i++) {
      if (wordSpans[i].start <= idx) cur = wordSpans[i];
      else break;
    }
    clearHighlight();
    if (cur) cur.el.classList.add("speaking");
  }

  // ---------------- READ ALOUD ----------------
  // The story is full of the kid's own words, so there's no pre-recorded
  // clip for it — we use the browser's speech voice instead. (The slightly
  // robotic voice reading "flying socks" is half the fun.)
  const canSpeak = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  if (!canSpeak) el.readBtn.classList.add("hidden");

  function stopReading() {
    if (canSpeak) window.speechSynthesis.cancel();
    clearHighlight();
    el.readBtn.textContent = "🔊 Read it to me";
  }

  function readAloud() {
    if (!canSpeak || !story) return;
    if (window.speechSynthesis.speaking) { stopReading(); return; }
    const u = new SpeechSynthesisUtterance(story.title + ". " + fillTemplate(false));
    u.rate = 0.95;
    u.onend = stopReading;
    u.onerror = stopReading;
    // karaoke-style: light up each word as the voice reaches it
    u.onboundary = function (e) {
      if (typeof e.charIndex === "number") highlightAt(e.charIndex);
    };
    el.readBtn.textContent = "⏹ Stop reading";
    window.speechSynthesis.speak(u);
  }

  el.readBtn.addEventListener("click", readAloud);

  el.againBtn.addEventListener("click", function () {
    stopReading();
    startStory(story);   // same story, fresh words
  });

  el.pickBtn.addEventListener("click", function () {
    stopReading();
    buildPicker();
    show("picker");
  });

  // ---------------- GO ----------------
  buildPicker();
  show("picker");
})();
