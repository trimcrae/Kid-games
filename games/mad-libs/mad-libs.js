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
    entry:      document.getElementById("entry"),
    progress:   document.getElementById("progress"),
    barFill:    document.getElementById("barFill"),
    askLabel:   document.getElementById("askLabel"),
    askExample: document.getElementById("askExample"),
    wordInput:  document.getElementById("wordInput"),
    backBtn:    document.getElementById("backBtn"),
    nextBtn:    document.getElementById("nextBtn"),
    reveal:     document.getElementById("reveal"),
    storyTitle: document.getElementById("storyTitle"),
    storyText:  document.getElementById("storyText"),
    readBtn:    document.getElementById("readBtn"),
    againBtn:   document.getElementById("againBtn"),
    pickBtn:    document.getElementById("pickBtn")
  };

  function show(section) {
    el.picker.classList.toggle("hidden", section !== "picker");
    el.entry.classList.toggle("hidden", section !== "entry");
    el.reveal.classList.toggle("hidden", section !== "reveal");
  }

  function speak(text) {
    if (window.Speech) Speech.speak(text);
  }

  // ---------------- PICKER ----------------
  function buildPicker() {
    el.cards.innerHTML = "";
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
    if (window.Speech) Speech.cancel();
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
    el.wordInput.value = answers[step] || "";
    el.backBtn.disabled = step === 0;
    el.nextBtn.textContent = step === total - 1 ? "See my story! ✨" : "Next →";
    el.wordInput.focus();
  }

  function commitAndNext() {
    const word = el.wordInput.value.trim();
    if (!word) { el.wordInput.focus(); return; }   // need a word to move on
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
    show("reveal");

    state.completed[story.id] = true;
    save();

    window.SFX && SFX.win();
    window.Confetti && Confetti.burst({ count: 70 });

    speak(story.title + ". " + fillTemplate(false));
  }

  el.readBtn.addEventListener("click", function () {
    speak(story.title + ". " + fillTemplate(false));
  });

  el.againBtn.addEventListener("click", function () {
    startStory(story);   // same story, fresh words
  });

  el.pickBtn.addEventListener("click", function () {
    if (window.Speech) Speech.cancel();
    buildPicker();
    show("picker");
  });

  // ---------------- GO ----------------
  buildPicker();
  show("picker");
})();
