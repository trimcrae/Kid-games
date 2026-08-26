/* ===========================================================
   Choose Your Own Adventure — ENGINE
   -----------------------------------------------------------
   Walks the kids through a branching story map (story-data.js +
   stories-long.js), drawing each scene with the SVG toolkit
   (art.js), reading the words aloud, and remembering which
   endings they've found.

   What it teaches: reading, decision-making & cause-and-effect
   (your choice changes the story), the little lessons baked into
   each tale (colours, counting, logic, nature) — plus real
   VOCABULARY: any word from glossary.js that appears on the page
   gets a dotted underline, and tapping it explains what it means.
   Finish a story and the Word Challenge quizzes you on the words
   you actually met along the way.

   localStorage keys (all old keys kept — nobody loses progress):
     adv-progress  {storyId: [endingNodeId, …]}   endings found
     adv-resume    {storyId, nodeId, path:[…]}    where they left off
     adv-voice     "on" | "off"                   narration mute
     adv-words     {seen:[…], mastered:[…]}       word treasure  (new)
     adv-stats     {pages, choices, day, streak, best}            (new)
   =========================================================== */
(function () {
  "use strict";

  const STORIES = window.STORIES || [];
  const GLOSS = window.GLOSSARY || null;
  const reduceMotion = !!(window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* -----------------------------------------------------------
     Sound effects (tiny WebAudio blips — no files)
     ----------------------------------------------------------- */
  let actx = null;
  function ac() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    return actx;
  }
  function tone(freq, dur, type, delay, vol) {
    const c = ac(); if (!c) return;
    const t = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine"; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol || 0.18, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  const SFX = {
    page:   () => { tone(520, .12, "triangle", 0, .08); tone(700, .12, "triangle", .06, .07); },
    choose: () => { tone(440, .12, "square", 0, .06); tone(660, .14, "square", .08, .06); },
    yay:    () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, .35, "triangle", i * 0.12, .13)); },
    word:   () => { tone(880, .10, "sine", 0, .07); tone(1175, .12, "sine", .07, .06); },
    right:  () => { tone(659, .14, "triangle", 0, .10); tone(988, .22, "triangle", .10, .10); },
    wrong:  () => { tone(300, .18, "sawtooth", 0, .06); tone(200, .24, "sawtooth", .12, .05); },
    pop:    () => { tone(300, .12, "sine"); tone(520, .16, "sine", .08, .1); }
  };

  /* -----------------------------------------------------------
     Saved progress — which endings each kid has discovered
     ----------------------------------------------------------- */
  function readJSON(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }
    catch (e) { return fallback; }
  }
  function writeJSON(key, val) {
    try {
      if (val == null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {}
  }

  const STORE = "adv-progress";
  function loadProg() { const p = readJSON(STORE, {}); return (p && typeof p === "object") ? p : {}; }
  function saveProg(p) { writeJSON(STORE, p); }

  // …and where the kids left off mid-story (so a closed tablet lid
  // never loses their place). The trail of node ids is saved too, so
  // the ◀ button still works after a reload.
  const RESUME = "adv-resume";
  function loadResume() {
    const r = readJSON(RESUME, null);
    if (!r || !r.storyId || !r.nodeId) return null;
    if (!Array.isArray(r.path)) r.path = [];   // migrate older saves
    return r;
  }
  function saveResume(r) { writeJSON(RESUME, r); }

  /* ---- word treasure: words tapped open, and words quizzed right ---- */
  const WORDS_KEY = "adv-words";
  function loadWords() {
    const w = readJSON(WORDS_KEY, null) || {};
    return { seen: Array.isArray(w.seen) ? w.seen : [], mastered: Array.isArray(w.mastered) ? w.mastered : [] };
  }
  function bankWord(word, mastered) {
    const w = loadWords();
    const list = mastered ? w.mastered : w.seen;
    const isNew = list.indexOf(word) === -1;
    if (isNew) list.push(word);
    if (mastered && w.seen.indexOf(word) === -1) w.seen.push(word);
    writeJSON(WORDS_KEY, w);
    return isNew;
  }

  /* ---- reading stats: pages, choices and a day streak ---- */
  const STATS_KEY = "adv-stats";
  function today() {
    const d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  function loadStats() {
    const s = readJSON(STATS_KEY, null) || {};
    return {
      pages: s.pages | 0, choices: s.choices | 0,
      day: s.day || "", streak: s.streak | 0, best: s.best | 0
    };
  }
  function touchStreak() {
    const s = loadStats();
    const t = today();
    if (s.day !== t) {
      const y = new Date(); y.setDate(y.getDate() - 1);
      const yest = y.getFullYear() + "-" + (y.getMonth() + 1) + "-" + y.getDate();
      s.streak = (s.day === yest) ? s.streak + 1 : 1;
      s.day = t;
      if (s.streak > s.best) s.best = s.streak;
      writeJSON(STATS_KEY, s);
    }
    return s;
  }
  function bumpStat(field, by) {
    const s = loadStats();
    s[field] = (s[field] | 0) + (by || 1);
    writeJSON(STATS_KEY, s);
  }

  // count how many ending-nodes a story has (nodes with no choices)
  function endingCount(story) {
    return Object.keys(story.nodes).filter(k => !story.nodes[k].choices).length;
  }

  /* -----------------------------------------------------------
     DOM
     ----------------------------------------------------------- */
  const grid     = document.getElementById("story-grid");
  const library  = document.getElementById("library");
  const reader   = document.getElementById("reader");
  const artEl    = document.getElementById("scene-art");
  const textEl   = document.getElementById("scene-text");
  const choicesEl= document.getElementById("choices");
  const titleEl  = document.getElementById("reader-title");
  const homeBtn  = document.getElementById("home-btn");
  const readBtn  = document.getElementById("read-btn");
  const voiceBtn = document.getElementById("voice-btn");
  const backBtn  = document.getElementById("back-btn");
  const endBadge = document.getElementById("end-badge");
  const wordPop  = document.getElementById("word-pop");
  const wordW    = document.getElementById("word-w");
  const wordD    = document.getElementById("word-d");
  const wordX    = document.getElementById("word-close");
  const shelfEl  = document.getElementById("shelf");
  const shelfList= document.getElementById("shelf-list");
  const shelfTtl = document.getElementById("shelf-title");
  const shelfBtn = document.getElementById("shelf-btn");
  const quizEl   = document.getElementById("quiz");

  let current = null;   // current story
  let nodeId = null;    // current node id
  let history = [];     // stack of visited node ids (for ◀)
  let sessionWords = [];// glossary words met during THIS read-through
  let pushedState = false;

  /* -----------------------------------------------------------
     Voice — Ellie can't read yet, so HER stories (the pre-reader
     ones) read each page aloud using the pre-rendered neural clips
     in audio/<storyId>-<nodeId>.mp3. The 6+/7+ epics for the older
     readers have no audio and stay silent (they read those).
     ----------------------------------------------------------- */
  let voiceOn = (function () {
    try { return localStorage.getItem("adv-voice") !== "off"; } catch (e) { return true; }
  })();
  let voiceAvailable = false;   // does the CURRENT story have narration?

  // Pre-reader stories (age 5 and under, or "all ages") are narrated.
  function storyHasVoice(st) {
    if (!st) return false;
    const m = String(st.ages || "").match(/(\d+)/);
    return !m || parseInt(m[1], 10) <= 5;
  }
  function narrate(storyId, nid, force) {
    if (!voiceAvailable) return;
    if (!force && !voiceOn) return;
    if (window.Voice) Voice.play("audio/" + storyId + "-" + nid + ".mp3");
  }
  function stopSpeak() { if (window.Voice) Voice.stop(); }
  function updateVoiceBtn() {
    voiceBtn.textContent = voiceOn ? "🔊" : "🔇";
    voiceBtn.setAttribute("aria-label", voiceOn ? "Voice on — tap to mute" : "Voice off — tap to turn on");
    voiceBtn.classList.toggle("muted", !voiceOn);
  }

  function wrapSvg(inner) {
    return `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" role="img" aria-label="story picture">${inner}</svg>`;
  }

  /* -----------------------------------------------------------
     Vocabulary: paint the page text, underlining glossary words
     ----------------------------------------------------------- */
  function renderText(el, text) {
    el.textContent = "";
    const known = new Set(loadWords().seen);
    const parts = String(text || "").split(/([A-Za-z][A-Za-z'’-]*)/);
    parts.forEach((part, i) => {
      const entry = (i % 2 === 1 && GLOSS) ? GLOSS.lookup(part) : null;
      if (!entry) { el.appendChild(document.createTextNode(part)); return; }
      if (sessionWords.indexOf(entry.w) === -1) sessionWords.push(entry.w);
      const b = document.createElement("button");
      b.type = "button";
      b.className = "gloss-word" + (known.has(entry.w) ? " known" : "");
      b.textContent = part;
      b.setAttribute("aria-label", part + " — tap to hear what it means");
      b.addEventListener("click", ev => { ev.stopPropagation(); showWord(entry); });
      el.appendChild(b);
    });
  }

  function showWord(entry) {
    SFX.word();
    const isNew = bankWord(entry.w, false);
    wordW.textContent = "📖 " + entry.w;
    if (isNew) {
      const tag = document.createElement("span");
      tag.className = "wnew";
      tag.textContent = "NEW WORD!";
      wordW.appendChild(tag);
    }
    wordD.textContent = entry.d;
    wordPop.hidden = false;
    // re-tint the underlines now that this word counts as "known"
    document.querySelectorAll(".gloss-word").forEach(b => {
      const e = GLOSS && GLOSS.lookup(b.textContent);
      if (e && e.w === entry.w) b.classList.add("known");
    });
  }
  function hideWord() { wordPop.hidden = true; }

  /* ---- Library / story picker ---- */
  function buildLibrary() {
    const prog = loadProg();
    grid.innerHTML = "";

    // "Keep reading" banner — jump straight back to where they left off
    const slot = document.getElementById("resume-slot");
    if (slot) {
      slot.innerHTML = "";
      const r = loadResume();
      const st = r && STORIES.find(s => s.id === r.storyId);
      if (st && st.nodes[r.nodeId] && r.nodeId !== st.start) {
        const b = document.createElement("button");
        b.className = "resume-btn";
        b.innerHTML = `▶ Keep reading: <b>${st.emoji} ${st.title}</b>`;
        b.addEventListener("click", () => { try { ac(); } catch (e) {} openStory(st, r.nodeId, r.path); });
        slot.appendChild(b);
      }
    }

    let foundAll = 0, totalAll = 0;
    STORIES.forEach(story => {
      const found = (prog[story.id] && prog[story.id].length) || 0;
      const total = endingCount(story);
      foundAll += found; totalAll += total;
      const card = document.createElement("button");
      card.className = "story-card";
      card.style.background = `linear-gradient(160deg, ${ART.shade(story.color, 22)}, ${ART.shade(story.color, -42)})`;
      const badge = found >= total ? "🏆" : found ? "⭐" : "";
      card.innerHTML =
        `${badge ? `<span class="done-star" aria-hidden="true">${badge}</span>` : ""}
         <span class="cover">${wrapSvg(story.cover())}</span>
         <h2>${story.emoji} ${story.title}</h2>
         <p class="who">For ${story.who} • ${story.ages}</p>
         <p class="teach">${story.blurb}</p>
         <p class="learn">Learns: ${story.teaches}</p>
         <p class="endcount">${found >= total ? "🏆 ALL " + total + " endings found!" : found + "/" + total + " endings found"}</p>`;
      card.setAttribute("aria-label",
        `${story.title}. For ${story.who}, ages ${story.ages}. ${story.blurb} ${found} of ${total} endings found.`);
      card.addEventListener("click", () => { try { ac(); } catch (e) {} openStory(story); });
      grid.appendChild(card);

      // The painterly cover generated by the art pipeline replaces the
      // built-in vector cover once it has loaded. If the PNG is missing
      // (a newer story the pipeline hasn't drawn yet) the SVG just stays.
      if (story.coverImg) {
        const probe = new Image();
        probe.onload = () => {
          const slotEl = card.querySelector(".cover");
          if (!slotEl) return;
          slotEl.innerHTML = "";
          probe.className = "cover-img";
          probe.alt = "";
          slotEl.appendChild(probe);
        };
        probe.src = story.coverImg;
      }
    });

    const totals = document.getElementById("total-progress");
    if (totals) {
      totals.textContent = foundAll >= totalAll
        ? `🏆 Amazing! You've discovered ALL ${totalAll} endings in every adventure!`
        : foundAll > 0
          ? `⭐ ${foundAll} of ${totalAll} endings discovered so far — keep exploring!`
          : `${totalAll} different endings are hiding in these stories. Every choice matters!`;
    }
    buildStatStrip();
  }

  function buildStatStrip() {
    const strip = document.getElementById("stat-strip");
    if (!strip) return;
    const s = loadStats(), w = loadWords();
    const bits = [];
    if (s.streak > 0) bits.push(`📅 ${s.streak} day${s.streak === 1 ? "" : "s"} in a row` + (s.best > s.streak ? ` (best ${s.best})` : ""));
    if (s.pages > 0) bits.push(`📄 ${s.pages} pages read`);
    if (s.choices > 0) bits.push(`🔀 ${s.choices} choices made`);
    if (w.seen.length) bits.push(`📖 ${w.seen.length} word${w.seen.length === 1 ? "" : "s"} looked up`);
    if (w.mastered.length) bits.push(`🧠 ${w.mastered.length} word${w.mastered.length === 1 ? "" : "s"} mastered`);
    strip.innerHTML = "";
    bits.forEach(t => {
      const li = document.createElement("li");
      li.textContent = t;
      strip.appendChild(li);
    });
  }

  /* ---- Open a story ---- */
  function openStory(story, startNode, path) {
    current = story;
    history = Array.isArray(path) ? path.filter(id => story.nodes[id]) : [];
    sessionWords = [];
    hideWord();
    hideShelf();
    // Only Ellie's pre-reader stories get the voice controls.
    voiceAvailable = storyHasVoice(story);
    voiceBtn.style.display = voiceAvailable ? "" : "none";
    readBtn.style.display  = voiceAvailable ? "" : "none";
    updateVoiceBtn();
    titleEl.textContent = story.title;
    library.style.display = "none";
    reader.classList.add("active");
    // so the phone/tablet Back gesture returns to the shelf instead of
    // dumping the kids out of the game entirely
    if (!pushedState) {
      try { window.history.pushState({ adv: "story" }, ""); pushedState = true; } catch (e) {}
    }
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    nodeId = null;
    goTo(startNode && story.nodes[startNode] ? startNode : story.start, false);
  }

  /* ---- Render a node ---- */
  function goTo(id, push) {
    if (push !== false && nodeId) history.push(nodeId);
    nodeId = id;
    const node = current.nodes[id];
    if (!node) return;

    hideWord();
    hideShelf();
    quizEl.hidden = true;
    quizEl.innerHTML = "";

    // a node may carry a generated image (img), an art() function, or a scene
    if (node.img) {
      artEl.innerHTML = '<img class="scene-img" src="' + node.img + '" alt="" onerror="this.style.display=\'none\'">';
    } else {
      const inner = typeof node.art === "function" ? node.art()
                  : node.scene ? ART.scene(node.scene) : "";
      artEl.innerHTML = wrapSvg(inner);
    }
    if (!reduceMotion) {
      artEl.classList.remove("turning"); void artEl.offsetWidth; artEl.classList.add("turning");
    }

    renderText(textEl, node.text);
    bumpStat("pages", 1);
    backBtn.style.visibility = history.length ? "visible" : "hidden";

    const isEnding = !node.choices;
    endBadge.style.display = isEnding ? "block" : "none";
    choicesEl.innerHTML = "";

    if (isEnding) {
      const isNew = recordEnding(current.id, id);
      const prog = loadProg();
      const total = endingCount(current);
      const got = (prog[current.id] || []).length;
      const gotAll = got >= total;
      const left = total - got;
      endBadge.textContent = isNew
        ? (gotAll
          ? "🏆 NEW ending — " + (node.end || "A Happy Ending") + " — that's ALL " + total + " of them! 🏆"
          : "🎉 NEW ending — " + (node.end || "A Happy Ending") + "! " + left + " more still hidden. 🎉")
        : (gotAll
          ? "⭐ The End — " + (node.end || "A Happy Ending") + " ⭐"
          : "⭐ The End — " + (node.end || "A Happy Ending") + " — " + left + " ending" + (left === 1 ? "" : "s") + " still to find ⭐");
      SFX.yay();
      if (isNew && window.Confetti) Confetti.burst({ count: gotAll ? 160 : 80 });
      saveResume(null);  // story finished — nothing to resume

      // Big stories: hop straight back to the world-picker instead of
      // re-reading the intro every single time.
      if (current.hub && current.nodes[current.hub]) {
        addBtn("🔀 Pick a different path from the start", () => {
          SFX.choose();
          history = [];
          nodeId = null;
          goTo(current.hub, false);
        }, "blue");
      }
      if (GLOSS && sessionWords.length >= 3) {
        addBtn("🧠 Word Challenge — 3 questions", () => startQuiz(), "pink");
      }
      addBtn("🔁 Read this story again", () => openStory(current), "pink");
      addBtn("📖 Back to all stories", () => leaveStory());
      showShelf(true);
    } else {
      SFX.page();
      saveResume({ storyId: current.id, nodeId: id, path: history.slice(-60) });
      node.choices.forEach((ch, i) => addBtn(ch.label, () => {
        SFX.choose();
        bumpStat("choices", 1);
        goTo(ch.to, true);
      }, "", i + 1));
    }

    // Ellie's stories read each new page aloud.
    narrate(current.id, nodeId);
    try { textEl.focus({ preventScroll: true }); } catch (e) {}
  }

  function addBtn(label, fn, kind, num) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "choice-btn" + (kind ? " " + kind : "");
    b.textContent = label;
    if (num) b.dataset.choiceNum = String(num);
    b.addEventListener("click", fn);
    choicesEl.appendChild(b);
    return b;
  }

  // Remember a discovered ending; returns true when it's a NEW one.
  function recordEnding(storyId, endId) {
    const prog = loadProg();
    const set = new Set(prog[storyId] || []);
    const isNew = !set.has(endId);
    set.add(endId);
    prog[storyId] = Array.from(set);
    saveProg(prog);
    return isNew;
  }

  /* -----------------------------------------------------------
     Trophy shelf — every ending in this story, named if found,
     "still hidden" if not. Gives the 15-ending epics a real goal.
     ----------------------------------------------------------- */
  function endingIds(story) {
    return Object.keys(story.nodes).filter(k => !story.nodes[k].choices);
  }
  function showShelf(keepScroll) {
    if (!current) return;
    const found = new Set((loadProg()[current.id]) || []);
    const ids = endingIds(current);
    shelfTtl.textContent = `🏆 Endings found: ${found.size} of ${ids.length}`;
    shelfList.innerHTML = "";
    ids.forEach((id, i) => {
      const li = document.createElement("li");
      const name = current.nodes[id].end || "A Happy Ending";
      if (found.has(id)) {
        li.textContent = "🏅 " + name;
      } else {
        li.className = "locked";
        li.textContent = "🔒 Ending " + (i + 1) + " — still hidden";
      }
      shelfList.appendChild(li);
    });
    shelfEl.hidden = false;
    shelfBtn.setAttribute("aria-expanded", "true");
    if (!keepScroll) shelfEl.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
  }
  function hideShelf() {
    shelfEl.hidden = true;
    shelfBtn.setAttribute("aria-expanded", "false");
  }

  /* -----------------------------------------------------------
     Word Challenge — quizzes the words this read-through actually
     used. A wrong pick doesn't just buzz: it explains what the word
     they chose really means, then lets them try again.
     ----------------------------------------------------------- */
  let quiz = null;

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function startQuiz() {
    if (!GLOSS) return;
    const pool = sessionWords
      .map(w => GLOSS.words.find(e => e.w === w))
      .filter(Boolean);
    if (pool.length < 3) return;
    quiz = { qs: shuffle(pool.slice()).slice(0, 3), i: 0, right: 0 };
    choicesEl.innerHTML = "";
    endBadge.style.display = "none";
    hideShelf();
    renderQuiz();
  }

  function renderQuiz() {
    const q = quiz.qs[quiz.i];
    // two wrong options, preferring other words from this same read
    const others = GLOSS.words.filter(e => e.w !== q.w);
    const nearby = shuffle(others.filter(e => sessionWords.indexOf(e.w) !== -1));
    const rest = shuffle(others.filter(e => sessionWords.indexOf(e.w) === -1));
    const options = shuffle([q].concat(nearby.concat(rest).slice(0, 2)));

    quizEl.hidden = false;
    quizEl.innerHTML = "";
    const h = document.createElement("h3");
    h.textContent = "🧠 Word Challenge";
    const c = document.createElement("p");
    c.className = "q-count";
    c.textContent = `Question ${quiz.i + 1} of ${quiz.qs.length}`;
    const ask = document.createElement("p");
    ask.className = "q-ask";
    ask.textContent = "Which word means: “" + q.d + "”";
    quizEl.appendChild(h); quizEl.appendChild(c); quizEl.appendChild(ask);

    const box = document.createElement("div");
    box.className = "choices";
    quizEl.appendChild(box);

    const fb = document.createElement("p");
    fb.className = "q-fb";
    fb.hidden = true;
    quizEl.appendChild(fb);

    let answered = false;
    options.forEach(opt => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "choice-btn";
      b.textContent = opt.w;
      b.addEventListener("click", () => {
        if (answered || b.classList.contains("wrong")) return;
        if (opt.w === q.w) {
          answered = true;
          quiz.right++;
          bankWord(q.w, true);
          SFX.right();
          fb.hidden = false;
          fb.className = "q-fb good";
          fb.textContent = "✅ Yes! “" + q.w + "” means " + lower(q.d);
          box.querySelectorAll("button").forEach(x => { x.disabled = true; });
          const next = document.createElement("button");
          next.type = "button";
          next.className = "choice-btn blue";
          next.textContent = quiz.i + 1 < quiz.qs.length ? "➡️ Next question" : "🎁 See my score";
          next.addEventListener("click", () => {
            quiz.i++;
            if (quiz.i < quiz.qs.length) renderQuiz(); else finishQuiz();
          });
          quizEl.appendChild(next);
          next.focus();
        } else {
          SFX.wrong();
          b.classList.add("wrong");
          b.setAttribute("aria-disabled", "true");
          fb.hidden = false;
          fb.className = "q-fb bad";
          fb.textContent = "❌ Not that one — “" + opt.w + "” means " + lower(opt.d) +
            " Have another go!";
        }
      });
      box.appendChild(b);
    });
    quizEl.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
  }

  function lower(d) { return d.charAt(0).toLowerCase() + d.slice(1); }

  function finishQuiz() {
    const total = quiz.qs.length, right = quiz.right;
    quizEl.innerHTML = "";
    const h = document.createElement("h3");
    h.textContent = right === total ? "🏆 Perfect! " + right + " out of " + total : "⭐ " + right + " out of " + total + " — nice reading!";
    const p = document.createElement("p");
    p.className = "q-ask";
    p.textContent = "Words you mastered live in your word treasure on the story shelf. 📖";
    quizEl.appendChild(h); quizEl.appendChild(p);
    if (right === total && window.Confetti) Confetti.burst({ count: 100 });
    SFX.yay();

    const box = document.createElement("div");
    box.className = "choices";
    quizEl.appendChild(box);
    const again = document.createElement("button");
    again.type = "button"; again.className = "choice-btn pink";
    again.textContent = "🔁 Read this story again";
    again.addEventListener("click", () => openStory(current));
    const home = document.createElement("button");
    home.type = "button"; home.className = "choice-btn blue";
    home.textContent = "📖 Back to all stories";
    home.addEventListener("click", leaveStory);
    box.appendChild(again); box.appendChild(home);
    quiz = null;
  }

  function goBack() {
    if (!history.length) return;
    const prev = history.pop();
    nodeId = null; // prevent re-pushing
    goTo(prev, false);
  }

  function goHome() {
    stopSpeak();
    reader.classList.remove("active");
    library.style.display = "block";
    current = null; nodeId = null; history = []; sessionWords = []; quiz = null;
    hideWord(); hideShelf();
    quizEl.hidden = true; quizEl.innerHTML = "";
    buildLibrary();
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  // Leaving via a button should also unwind the pushState we added, so the
  // device Back button never lands the kids back inside a finished story.
  function leaveStory() {
    if (pushedState) {
      pushedState = false;
      try { window.history.back(); return; } catch (e) {}
    }
    goHome();
  }

  window.addEventListener("popstate", () => {
    pushedState = false;
    if (reader.classList.contains("active")) goHome();
  });

  /* ---- wire up controls ---- */
  homeBtn.addEventListener("click", leaveStory);
  backBtn.addEventListener("click", goBack);
  wordX.addEventListener("click", hideWord);
  shelfBtn.addEventListener("click", () => {
    if (shelfEl.hidden) showShelf(false); else hideShelf();
  });
  // "read it again" plays the clip even when muted, without silently
  // flipping the saved mute setting (which used to drift out of sync).
  readBtn.addEventListener("click", () => {
    if (current && nodeId) narrate(current.id, nodeId, true);
  });
  voiceBtn.addEventListener("click", () => {
    voiceOn = !voiceOn;
    try { localStorage.setItem("adv-voice", voiceOn ? "on" : "off"); } catch (e) {}
    updateVoiceBtn();
    if (!voiceOn) stopSpeak();
    else if (current && nodeId) narrate(current.id, nodeId);
  });

  /* ---- keyboard: arrows, digits for choices, Esc for home ---- */
  document.addEventListener("keydown", e => {
    if (!reader.classList.contains("active")) return;
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (e.key === "ArrowLeft") { goBack(); return; }
    if (e.key === "Escape") {
      if (!wordPop.hidden) { hideWord(); return; }
      leaveStory(); return;
    }
    if (/^[1-9]$/.test(e.key)) {
      const btns = choicesEl.querySelectorAll("button");
      const b = btns[parseInt(e.key, 10) - 1];
      if (b && !b.disabled) { b.click(); e.preventDefault(); }
    }
  });

  touchStreak();
  buildLibrary();
})();
