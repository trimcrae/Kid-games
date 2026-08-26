/* ===========================================================
   MAD LIBS  —  game logic
   Pick a story → give silly words one at a time → reveal the
   goofy story, colour-coded by part of speech, and read it aloud.

   The grammar engine below is what makes the finished story read
   like a real book instead of a broken robot sentence:
     • "a"/"an" is fixed to match the word the kid actually chose
     • a word that lands at the start of a sentence is capitalised
     • "{number}th" becomes 1st / 2nd / 3rd / 4th properly
   =========================================================== */
(function () {
  "use strict";

  // ---- persistent progress -------------------------------------------
  // v1 shape (kept, so old saves still work):  { completed: {...} }
  // now also:  shelf  (finished stories), bank (word-bank on/off),
  //            draft  (a half-finished story to resume)
  const SAVE_KEY = "madLibs.v1";
  const MAX_SHELF = 24;

  function isShelfEntry(e) {
    return !!e && typeof e === "object" &&
           typeof e.sid === "string" && Array.isArray(e.answers);
  }

  function load() {
    const out = { completed: {}, shelf: [], bank: true, draft: null };
    let s = null;
    try { s = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { /* corrupt save */ }
    if (s && typeof s === "object") {
      if (s.completed && typeof s.completed === "object") out.completed = s.completed;
      if (Array.isArray(s.shelf)) out.shelf = s.shelf.filter(isShelfEntry).slice(0, MAX_SHELF);
      if (typeof s.bank === "boolean") out.bank = s.bank;
      if (isShelfEntry(s.draft) && typeof s.draft.step === "number") out.draft = s.draft;
    }
    return out;
  }

  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }

  const state = load();

  // ---- short-lived play state ----
  let story = null;     // the current MADLIBS entry
  let answers = [];     // words the kid has given, by blank index
  let step = 0;         // which blank we're on
  let fromShelf = false; // true when we're just re-reading a saved story

  const REDUCE = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const TOUCH  = !!(window.matchMedia && window.matchMedia("(hover: none)").matches);

  function byId(id) { return document.getElementById(id); }

  const el = {
    picker:     byId("picker"),
    cards:      byId("cards"),
    playedCount:byId("playedCount"),
    resumeWrap: byId("resumeWrap"),
    resumeBtn:  byId("resumeBtn"),
    resumeDrop: byId("resumeDrop"),
    surpriseBtn:byId("surpriseBtn"),
    shelfWrap:  byId("shelfWrap"),
    shelfList:  byId("shelfList"),

    entry:      byId("entry"),
    quitBtn:    byId("quitBtn"),
    progress:   byId("progress"),
    barFill:    byId("barFill"),
    posBadge:   byId("posBadge"),
    askLabel:   byId("askLabel"),
    askExample: byId("askExample"),
    askHint:    byId("askHint"),
    wordInput:  byId("wordInput"),
    coach:      byId("coach"),
    bankWrap:   byId("bankWrap"),
    bankChips:  byId("bankChips"),
    bankShuffle:byId("bankShuffle"),
    bankToggle: byId("bankToggle"),
    backBtn:    byId("backBtn"),
    nextBtn:    byId("nextBtn"),

    reveal:     byId("reveal"),
    storyBox:   byId("storyBox"),
    storyTitle: byId("storyTitle"),
    storyText:  byId("storyText"),
    legend:     byId("legend"),
    posNote:    byId("posNote"),
    tally:      byId("tally"),
    againBtn:   byId("againBtn"),
    pickBtn:    byId("pickBtn"),
    readBtn:    byId("readBtn")
  };

  function show(section) {
    el.picker.classList.toggle("hidden", section !== "picker");
    el.entry.classList.toggle("hidden", section !== "entry");
    el.reveal.classList.toggle("hidden", section !== "reveal");
    window.scrollTo(0, 0);
  }

  function storyById(id) {
    for (let i = 0; i < MADLIBS.length; i++) if (MADLIBS[i].id === id) return MADLIBS[i];
    return null;
  }

  function posOf(type) {
    return (typeof MADLIB_POS !== "undefined" && MADLIB_POS[type]) ||
           { pos: "word", cls: "pos-noun" };
  }

  /* =========================================================
     GRAMMAR ENGINE
     ========================================================= */

  // "a" or "an"? Based on how the word SOUNDS, not just its letter.
  function articleFor(word) {
    const w = String(word).trim().toLowerCase();
    if (!w) return "a";
    if (/^[0-9]/.test(w)) {
      // eight / eighty / eight hundred… all start with a vowel sound
      if (/^8/.test(w)) return "an";
      if (w === "11" || w === "18") return "an";   // eleven, eighteen
      return "a";
    }
    if (/^(uni|use|usu|used|useful|eu|ewe|one|once)/.test(w)) return "a";   // a unicorn, a one-eyed…
    if (/^(hour|honest|honou?r|heir)/.test(w)) return "an";                 // an hour
    return /^[aeiou]/.test(w) ? "an" : "a";
  }

  // 1st, 2nd, 3rd, 4th, 11th, 21st…
  function ordinalSuffix(n) {
    const v = Math.abs(parseInt(n, 10));
    if (!isFinite(v)) return "th";
    const r100 = v % 100, r10 = v % 10;
    if (r100 >= 11 && r100 <= 13) return "th";
    if (r10 === 1) return "st";
    if (r10 === 2) return "nd";
    if (r10 === 3) return "rd";
    return "th";
  }

  function upperFirst(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // Split a story template into text/fill parts and clean up the grammar
  // around each word the kid gave us. Returns [{t:"text",text} | {t:"fill",…}]
  function buildParts(sty, ans) {
    const tpl = sty.template;
    const parts = [];
    const re = /\{(\d+)\}/g;
    let last = 0, m;
    while ((m = re.exec(tpl)) !== null) {
      if (m.index > last) parts.push({ t: "text", text: tpl.slice(last, m.index) });
      parts.push({ t: "fill", i: Number(m[1]) });
      last = m.index + m[0].length;
    }
    if (last < tpl.length) parts.push({ t: "text", text: tpl.slice(last) });

    let before = "";   // everything rendered so far, so we can look backwards
    for (let k = 0; k < parts.length; k++) {
      const p = parts[k];
      if (p.t === "text") { before += p.text; continue; }

      const blank = (sty.blanks && sty.blanks[p.i]) || {};
      let word = String(ans[p.i] == null ? "" : ans[p.i]).trim();
      if (!word) word = "—";   // an em dash reads better than "____"

      // --- a / an agreement ---------------------------------------
      const prev = parts[k - 1];
      if (prev && prev.t === "text") {
        const am = prev.text.match(/(?:^|[\s"“('\[])(a|an|A|An)(\s+)$/);
        if (am) {
          const chop = am[1].length + am[2].length;
          const want = articleFor(word);
          const fixed = /^[A-Z]/.test(am[1]) ? upperFirst(want) : want;
          prev.text = prev.text.slice(0, prev.text.length - chop) + fixed + am[2];
          before = before.slice(0, before.length - chop) + fixed + am[2];
        }
      }

      // --- capital letter at the start of a sentence ----------------
      const b = before.replace(/[\s"“'(\[]+$/, "");
      const alwaysCap = blank.type === "name" || blank.type === "silly-word" ||
                        blank.type === "exclamation";
      if (alwaysCap || !b || /[.!?…]$/.test(b)) word = upperFirst(word);

      p.word = word;
      p.type = blank.type || "noun";
      p.label = blank.label || "";
      before += word;

      // --- "{number}th" → 1st / 2nd / 3rd ---------------------------
      const next = parts[k + 1];
      if (next && next.t === "text" && /^th(?![a-z])/i.test(next.text) && /^[0-9]+$/.test(word)) {
        next.text = ordinalSuffix(word) + next.text.slice(2);
      }
    }
    return parts;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function partsToPlain(parts) {
    let out = "";
    for (let i = 0; i < parts.length; i++) out += parts[i].t === "text" ? parts[i].text : parts[i].word;
    return out;
  }

  function partsToHtml(parts) {
    let out = "";
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.t === "text") { out += escapeHtml(p.text); continue; }
      const info = posOf(p.type);
      out += '<span class="ml-fill ' + info.cls + '" role="button" tabindex="0"' +
             ' data-pos="' + escapeHtml(info.pos) + '" data-type="' + escapeHtml(p.type) + '"' +
             ' aria-label="' + escapeHtml(p.word + ", " + info.pos + ". Tap to find out what that means.") + '">' +
             escapeHtml(p.word) + "</span>";
    }
    return out;
  }

  /* =========================================================
     PICKER
     ========================================================= */
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
      card.type = "button";
      card.style.setProperty("--accent", s.color);
      const done = !!state.completed[s.id];
      card.setAttribute("aria-label", s.title + (done ? " (already played)" : ""));

      const tick = done ? '<span class="ml-tick" aria-hidden="true">✅</span>' : "";
      card.innerHTML =
        tick +
        '<span class="ml-emoji" aria-hidden="true">' + s.emoji + "</span>" +
        '<span class="ml-name">' + escapeHtml(s.title) + "</span>" +
        '<span class="ml-words">' + s.blanks.length + " words</span>";

      card.addEventListener("click", function () { startStory(s); });
      el.cards.appendChild(card);
    });
    buildResume();
    buildShelf();
  }

  function buildResume() {
    if (!el.resumeWrap) return;
    const d = state.draft;
    const sty = d && storyById(d.sid);
    if (!sty) { el.resumeWrap.classList.add("hidden"); return; }
    el.resumeWrap.classList.remove("hidden");
    el.resumeBtn.textContent = "▶ Keep going: " + sty.title;
    el.resumeBtn.setAttribute("aria-label", "Keep going with " + sty.title);
  }

  function buildShelf() {
    if (!el.shelfWrap) return;
    el.shelfList.innerHTML = "";
    if (!state.shelf.length) { el.shelfWrap.classList.add("hidden"); return; }
    el.shelfWrap.classList.remove("hidden");
    state.shelf.forEach(function (entry, idx) {
      const sty = storyById(entry.sid);
      if (!sty) return;
      const row = document.createElement("div");
      row.className = "ml-shelf-item";

      const open = document.createElement("button");
      open.type = "button";
      open.className = "ml-shelf-open";
      let when = "";
      try {
        when = new Date(entry.when).toLocaleDateString(undefined, { day: "numeric", month: "short" });
      } catch (e) { when = ""; }
      open.innerHTML = '<span class="se" aria-hidden="true">' + sty.emoji + "</span>" +
                       '<span class="st">' + escapeHtml(sty.title) + "</span>" +
                       (when ? '<span class="sd">' + escapeHtml(when) + "</span>" : "");
      open.setAttribute("aria-label", "Read my " + sty.title + " story again");
      open.addEventListener("click", function () { openSaved(idx); });

      const del = document.createElement("button");
      del.type = "button";
      del.className = "ml-shelf-del";
      del.textContent = "✕";
      del.setAttribute("aria-label", "Take " + sty.title + " off my shelf");
      del.addEventListener("click", function () {
        state.shelf.splice(idx, 1);
        save();
        window.SFX && SFX.pop();
        buildShelf();
      });

      row.appendChild(open);
      row.appendChild(del);
      el.shelfList.appendChild(row);
    });
  }

  function openSaved(idx) {
    const entry = state.shelf[idx];
    if (!entry) return;
    const sty = storyById(entry.sid);
    if (!sty) return;
    story = sty;
    answers = entry.answers.slice();
    fromShelf = true;
    reveal();
  }

  /* =========================================================
     WORD ENTRY
     ========================================================= */
  function startStory(s) {
    story = s;
    answers = [];
    step = 0;
    fromShelf = false;
    show("entry");
    renderStep();
  }

  function resumeDraft() {
    const d = state.draft;
    const sty = d && storyById(d.sid);
    if (!sty) return;
    story = sty;
    answers = d.answers.slice();
    step = Math.max(0, Math.min(d.step | 0, sty.blanks.length - 1));
    fromShelf = false;
    show("entry");
    renderStep();
  }

  function saveDraft() {
    if (!story) return;
    // nothing typed yet? then there is nothing worth coming back to
    const started = answers.some(function (a) { return a && String(a).trim(); });
    state.draft = started
      ? { sid: story.id, answers: answers.slice(), step: step, when: Date.now() }
      : null;
    save();
  }

  function clearDraft() {
    if (state.draft) { state.draft = null; save(); }
  }

  function sample(list, n) {
    const pool = list.slice();
    const out = [];
    while (pool.length && out.length < n) {
      out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    return out;
  }

  function renderBank() {
    if (!el.bankChips || !story) return;
    const blank = story.blanks[step];
    const words = (typeof MADLIB_BANK !== "undefined" && MADLIB_BANK[blank.type]) || [];
    el.bankWrap.classList.toggle("hidden", !state.bank || !words.length);
    el.bankToggle.textContent = state.bank ? "🙈 Hide word bank" : "💡 Show word bank";
    el.bankToggle.setAttribute("aria-pressed", state.bank ? "true" : "false");
    if (!state.bank || !words.length) return;

    el.bankChips.innerHTML = "";
    sample(words, 6).forEach(function (w) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "ml-chip " + posOf(blank.type).cls;
      chip.textContent = w;
      chip.setAttribute("aria-label", "Use the word " + w);
      chip.addEventListener("click", function () {
        el.wordInput.value = w;
        updateCoach();
        commitAndNext();
      });
      el.bankChips.appendChild(chip);
    });
  }

  function updateCoach() {
    if (!el.coach || !story) return;
    const blank = story.blanks[step];
    const rule = (typeof MADLIB_COACH !== "undefined" && MADLIB_COACH[blank.type]) || null;
    const v = el.wordInput.value.trim();
    if (!rule || !v) { el.coach.textContent = ""; el.coach.className = "ml-coach"; return; }
    if (rule.test.test(v)) {
      el.coach.textContent = "✔ " + rule.ok;
      el.coach.className = "ml-coach good";
    } else {
      el.coach.textContent = "💡 " + rule.tip + " (Your word still works though!)";
      el.coach.className = "ml-coach tip";
    }
  }

  function renderStep() {
    const blank = story.blanks[step];
    const total = story.blanks.length;
    const info = posOf(blank.type);

    el.progress.textContent = "word " + (step + 1) + " of " + total;
    el.barFill.style.width = Math.round((step / total) * 100) + "%";

    el.posBadge.textContent = info.pos.toUpperCase();
    el.posBadge.className = "ml-badge " + info.cls;

    el.askLabel.textContent = blank.label;
    el.askExample.textContent = blank.example ? "like “" + blank.example + "”" : "";

    const hint = (typeof MADLIB_HINTS !== "undefined" && MADLIB_HINTS[blank.type]) || "";
    el.askHint.textContent = hint;
    el.askHint.style.display = hint ? "" : "none";

    el.wordInput.value = answers[step] || "";
    el.wordInput.setAttribute("aria-label", blank.label);
    el.wordInput.inputMode = blank.type === "number" ? "numeric" : "text";
    el.wordInput.setAttribute(
      "autocapitalize",
      (blank.type === "name" || blank.type === "exclamation" || blank.type === "silly-word") ? "words" : "none"
    );

    el.backBtn.disabled = step === 0;
    el.nextBtn.textContent = step === total - 1 ? "See my story! ✨" : "Next →";

    updateCoach();
    renderBank();
    if (!TOUCH) el.wordInput.focus();
  }

  function commitAndNext() {
    const word = el.wordInput.value.trim().slice(0, 24);
    if (!word) {
      // a friendly nudge: wobble the box instead of silently ignoring the tap
      window.SFX && SFX.nope();
      if (!REDUCE) {
        el.wordInput.classList.remove("shake");
        void el.wordInput.offsetWidth;
        el.wordInput.classList.add("shake");
      }
      el.wordInput.focus();
      return;
    }
    answers[step] = word;
    window.SFX && SFX.good();
    if (step < story.blanks.length - 1) {
      step++;
      saveDraft();
      renderStep();
    } else {
      reveal();
    }
  }

  function goBack() {
    if (step === 0) return;
    const typed = el.wordInput.value.trim();
    if (typed) answers[step] = typed;   // remember what's typed
    step--;
    saveDraft();
    renderStep();
  }

  el.nextBtn.addEventListener("click", commitAndNext);
  el.backBtn.addEventListener("click", goBack);
  el.wordInput.addEventListener("input", updateCoach);
  el.wordInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); commitAndNext(); }
  });
  el.quitBtn.addEventListener("click", function () {
    const typed = el.wordInput.value.trim();
    if (typed) answers[step] = typed;
    saveDraft();               // keep the half-finished story for later
    buildPicker();
    show("picker");
  });
  el.bankShuffle.addEventListener("click", function () {
    window.SFX && SFX.pop();
    renderBank();
  });
  el.bankToggle.addEventListener("click", function () {
    state.bank = !state.bank;
    save();
    renderBank();
  });
  if (el.resumeBtn) el.resumeBtn.addEventListener("click", resumeDraft);
  if (el.resumeDrop) el.resumeDrop.addEventListener("click", function () {
    clearDraft();
    buildResume();
  });
  if (el.surpriseBtn) el.surpriseBtn.addEventListener("click", function () {
    const fresh = MADLIBS.filter(function (s) { return !state.completed[s.id]; });
    const pool = fresh.length ? fresh : MADLIBS;
    startStory(pool[Math.floor(Math.random() * pool.length)]);
  });

  /* =========================================================
     REVEAL
     ========================================================= */
  let lastParts = [];

  function tallyText(parts) {
    const counts = {};
    const seen = {};
    parts.forEach(function (p) {
      if (p.t !== "fill" || seen[p.i]) return;
      seen[p.i] = true;
      const pos = posOf(p.type).pos;
      counts[pos] = (counts[pos] || 0) + 1;
    });
    const bits = [];
    MADLIB_POS_INFO.forEach(function (row) {
      const n = counts[row.pos];
      if (!n) return;
      const name = row.label.toLowerCase();
      bits.push(n + " " + (n === 1 ? name : (name === "silly word" ? "silly words" : name + "s")));
    });
    if (!bits.length) return "";
    const lastBit = bits.pop();
    return "🎓 You used " + (bits.length ? bits.join(", ") + " and " + lastBit : lastBit) + ".";
  }

  function buildLegend(parts) {
    el.legend.innerHTML = "";
    const counts = {};
    const words = {};
    const seen = {};
    parts.forEach(function (p) {
      if (p.t !== "fill" || seen[p.i]) return;
      seen[p.i] = true;
      const pos = posOf(p.type).pos;
      counts[pos] = (counts[pos] || 0) + 1;
      (words[pos] = words[pos] || []).push(p.word.toLowerCase());
    });
    MADLIB_POS_INFO.forEach(function (row) {
      if (!counts[row.pos]) return;
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "ml-legend-chip " + row.cls;
      chip.dataset.pos = row.pos;
      chip.innerHTML = '<span class="dot" aria-hidden="true"></span>' +
                       escapeHtml(row.label) + ' <b>×' + counts[row.pos] + "</b>";
      chip.setAttribute("aria-label",
        row.label + " — " + row.what + ". You used " + counts[row.pos] +
        ". Tap to light them up in the story.");
      chip.addEventListener("click", function () {
        const already = el.storyBox.dataset.focus === row.pos;
        setFocus(already ? "" : row.pos);
        el.posNote.textContent = already
          ? "Tap any coloured word (or a colour below) to see what it is!"
          : "✨ " + upperFirst(articleFor(row.pos)) + " " + row.pos + " is " + row.what +
            ". Yours: " + words[row.pos].join(", ") + ".";
      });
      el.legend.appendChild(chip);
    });
  }

  // Light up every word of one part of speech and dim the rest, so a kid
  // can literally see "these five words are all nouns".
  function setFocus(pos) {
    if (pos) el.storyBox.dataset.focus = pos;
    else delete el.storyBox.dataset.focus;
    const fills = el.storyText.querySelectorAll(".ml-fill");
    Array.prototype.forEach.call(fills, function (f) {
      f.classList.toggle("dim", !!pos && f.dataset.pos !== pos);
      f.classList.toggle("lit", !!pos && f.dataset.pos === pos);
    });
    Array.prototype.forEach.call(el.legend.children, function (c) {
      c.classList.toggle("on", c.dataset.pos === pos);
    });
  }

  function reveal() {
    lastParts = buildParts(story, answers);
    el.storyTitle.textContent = story.emoji + " " + story.title;
    el.storyText.innerHTML = partsToHtml(lastParts);
    wrapWordsForHighlight();
    buildLegend(lastParts);
    setFocus("");
    el.posNote.textContent = "Tap any coloured word (or a colour below) to see what it is!";
    el.tally.textContent = tallyText(lastParts);
    show("reveal");

    if (fromShelf) { fromShelf = false; return; }   // just re-reading: no fanfare, no re-save

    const wasNew = !state.completed[story.id];
    state.completed[story.id] = true;
    state.shelf.unshift({ sid: story.id, answers: answers.slice(), when: Date.now() });
    if (state.shelf.length > MAX_SHELF) state.shelf.length = MAX_SHELF;
    state.draft = null;
    save();

    window.SFX && SFX.win();
    const finishedAll = MADLIBS.every(function (s) { return state.completed[s.id]; });
    window.Confetti && Confetti.burst({ count: wasNew && finishedAll ? 180 : 70 });
  }

  // Tapping one of the kid's own words explains what part of speech it is.
  function explainWord(fill) {
    const pos = fill.dataset.pos;
    const type = fill.dataset.type;
    const hint = (typeof MADLIB_HINTS !== "undefined" && MADLIB_HINTS[type]) || "";
    setFocus(pos);
    el.posNote.textContent = "“" + fill.textContent.trim() + "” is " + articleFor(pos) +
      " " + pos + (hint ? " — " + hint : ".");
  }

  el.storyText.addEventListener("click", function (e) {
    const fill = e.target.closest && e.target.closest(".ml-fill");
    if (fill) { window.SFX && SFX.pop(); explainWord(fill); }
  });
  el.storyText.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    const fill = e.target.closest && e.target.closest(".ml-fill");
    if (fill) { e.preventDefault(); window.SFX && SFX.pop(); explainWord(fill); }
  });

  // Wrap every word of the revealed story in a span (keeping the coloured
  // .ml-fill highlights intact) and remember each word's character offset
  // in the plain story text, so read-aloud can light words up.
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

  /* =========================================================
     READ ALOUD
     The story is full of the kid's own words, so there's no
     pre-recorded clip for it — we use the browser's speech voice.
     ========================================================= */
  const canSpeak = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  if (!canSpeak) el.readBtn.classList.add("hidden");

  // Voices spell out an all-caps word ("RED" becomes "R-E-D"), so a word a kid
  // typed in shouty caps gets lowercased before it's spoken (still capitalised
  // if it starts a sentence). Same length either way, so the karaoke highlight
  // still lines up with the words on screen.
  function speakable(t) {
    return t.replace(/\b[A-Z][A-Z']*[A-Z]\b/g, function (w, i) {
      const before = t.slice(0, i).replace(/[\s"'([]+$/, "");
      const low = w.toLowerCase();
      if (!before || ".!?".indexOf(before.slice(-1)) >= 0) return low[0].toUpperCase() + low.slice(1);
      return low;
    });
  }

  function stopReading() {
    if (canSpeak) { try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
    clearHighlight();
    el.readBtn.textContent = "🔊 Read it to me";
  }

  function readAloud() {
    if (!canSpeak || !story) return;
    if (window.speechSynthesis.speaking) { stopReading(); return; }
    const u = new SpeechSynthesisUtterance(speakable(story.title + ". " + partsToPlain(lastParts)));
    u.rate = 0.95;
    u.onend = stopReading;
    u.onerror = stopReading;
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

  window.addEventListener("pagehide", stopReading);

  // ---------------- GO ----------------
  buildPicker();
  show("picker");
})();
