/* ===========================================================
   Choose Your Own Adventure — ENGINE
   -----------------------------------------------------------
   Walks the kids through a branching story map (story-data.js),
   drawing each scene with the SVG toolkit (art.js), reading the
   words aloud, and remembering which endings they've found.

   What it teaches: reading, decision-making & cause-and-effect
   (your choice changes the story), plus the little lessons baked
   into each tale (colours, counting, logic, vocabulary, nature).
   =========================================================== */
(function () {
  "use strict";

  const STORIES = window.STORIES || [];

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
    pop:    () => { tone(300, .12, "sine"); tone(520, .16, "sine", .08, .1); }
  };

  /* -----------------------------------------------------------
     Saved progress — which endings each kid has discovered
     ----------------------------------------------------------- */
  const STORE = "adv-progress";
  function loadProg() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } }
  function saveProg(p) { try { localStorage.setItem(STORE, JSON.stringify(p)); } catch (e) {} }

  // …and where the kids left off mid-story (so a closed tablet lid
  // never loses their place).
  const RESUME = "adv-resume";
  function loadResume() { try { return JSON.parse(localStorage.getItem(RESUME)); } catch (e) { return null; } }
  function saveResume(r) {
    try {
      if (r) localStorage.setItem(RESUME, JSON.stringify(r));
      else localStorage.removeItem(RESUME);
    } catch (e) {}
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

  let current = null;   // current story
  let nodeId = null;    // current node id
  let history = [];      // stack of visited node ids (for ◀)

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
  function narrate(storyId, nid) {
    if (!voiceOn || !voiceAvailable) return;
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
        b.addEventListener("click", () => { try { ac(); } catch (e) {} openStory(st, r.nodeId); });
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
      card.addEventListener("click", () => { try { ac(); } catch (e) {} openStory(story); });
      grid.appendChild(card);
    });

    const totals = document.getElementById("total-progress");
    if (totals) {
      totals.textContent = foundAll >= totalAll
        ? `🏆 Amazing! You've discovered ALL ${totalAll} endings in every adventure!`
        : foundAll > 0
          ? `⭐ ${foundAll} of ${totalAll} endings discovered so far — keep exploring!`
          : `${totalAll} different endings are hiding in these stories. Every choice matters!`;
    }
  }

  /* ---- Open a story ---- */
  function openStory(story, startNode) {
    current = story;
    history = [];
    // Only Ellie's pre-reader stories get the voice controls.
    voiceAvailable = storyHasVoice(story);
    voiceBtn.style.display = voiceAvailable ? "" : "none";
    readBtn.style.display  = voiceAvailable ? "" : "none";
    updateVoiceBtn();
    titleEl.textContent = story.title;
    library.style.display = "none";
    reader.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
    goTo(startNode && story.nodes[startNode] ? startNode : story.start, false);
  }

  /* ---- Render a node ---- */
  function goTo(id, push) {
    if (push !== false && nodeId) history.push(nodeId);
    nodeId = id;
    const node = current.nodes[id];
    if (!node) return;

    // picture (with a gentle page-turn animation).
    // a node may carry an art() function OR a `scene` data descriptor.
    // a node may carry a generated image (img), an art() function, or a scene
    if (node.img) {
      artEl.innerHTML = '<img class="scene-img" src="' + node.img + '" alt="" onerror="this.style.display=\'none\'">';
    } else {
      const inner = typeof node.art === "function" ? node.art()
                  : node.scene ? ART.scene(node.scene) : "";
      artEl.innerHTML = wrapSvg(inner);  // art is now native pixel art
    }
    artEl.classList.remove("turning"); void artEl.offsetWidth; artEl.classList.add("turning");

    textEl.textContent = node.text;
    backBtn.style.visibility = history.length ? "visible" : "hidden";

    const isEnding = !node.choices;
    endBadge.style.display = isEnding ? "block" : "none";
    choicesEl.innerHTML = "";

    if (isEnding) {
      const isNew = recordEnding(current.id, id);
      const prog = loadProg();
      const gotAll = (prog[current.id] || []).length >= endingCount(current);
      endBadge.textContent = isNew
        ? (gotAll
          ? "🏆 NEW ending — " + (node.end || "A Happy Ending") + " — that's ALL of them! 🏆"
          : "🎉 NEW ending found — " + (node.end || "A Happy Ending") + "! 🎉")
        : "⭐ The End — " + (node.end || "A Happy Ending") + " ⭐";
      SFX.yay();
      if (isNew && window.Confetti) Confetti.burst({ count: gotAll ? 160 : 80 });
      saveResume(null);  // story finished — nothing to resume
      addBtn("🔁 Read this story again", () => openStory(current), "pink");
      addBtn("📖 Back to all stories", () => goHome(), "blue");
    } else {
      SFX.page();
      saveResume({ storyId: current.id, nodeId: id });
      node.choices.forEach(ch => addBtn(ch.label, () => {
        SFX.choose();
        goTo(ch.to, true);
      }));
    }

    // Ellie's stories read each new page aloud.
    narrate(current.id, nodeId);
  }

  function addBtn(label, fn, kind) {
    const b = document.createElement("button");
    b.className = "choice-btn" + (kind ? " " + kind : "");
    b.textContent = label;
    b.addEventListener("click", fn);
    choicesEl.appendChild(b);
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
    current = null; nodeId = null; history = [];
    buildLibrary();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---- wire up controls ---- */
  homeBtn.addEventListener("click", goHome);
  backBtn.addEventListener("click", goBack);
  readBtn.addEventListener("click", () => { if (current && nodeId) { voiceOn = true; updateVoiceBtn(); narrate(current.id, nodeId); } });
  voiceBtn.addEventListener("click", () => {
    voiceOn = !voiceOn;
    try { localStorage.setItem("adv-voice", voiceOn ? "on" : "off"); } catch (e) {}
    updateVoiceBtn();
    if (!voiceOn) stopSpeak();
    else if (current && nodeId) narrate(current.id, nodeId);
  });

  // keyboard: left arrow = back
  document.addEventListener("keydown", e => {
    if (!reader.classList.contains("active")) return;
    if (e.key === "ArrowLeft") goBack();
  });

  buildLibrary();
})();
