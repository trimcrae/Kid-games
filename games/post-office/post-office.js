/* ===========================================================
   📮 The Post Office — send real letters to the rest of the family.
   -----------------------------------------------------------
   Everyone shares one device, so the "post" is a shared localStorage
   mailbag: a letter written by one person lands in another's mailbox
   the moment they pick their name. What it teaches:
     • the parts of a letter — greeting, message, closing, signature
     • addressing an envelope — To / From, a stamp, and a postmark
       with today's date (weekday, day, month, year)
     • reading, replying and spelling — the quick-word tray helps the
       little ones write whole sentences before they can type them
   No servers, no accounts: the mail never leaves this device.
   =========================================================== */
(function () {
  "use strict";

  var KEY = "post-office.v1";
  var MAX_LETTERS = 300;

  var FAMILY = [
    { id: "jeannie", name: "Jeannie", emoji: "📖", color: "#ff5d8f" },
    { id: "cory",    name: "Cory",    emoji: "⛏️", color: "#38b6ff" },
    { id: "ellie",   name: "Ellie",   emoji: "👑", color: "#8a5cff" },
    { id: "kieran",  name: "Kieran",  emoji: "👶", color: "#ffd166" },
    { id: "shannon", name: "Mum",     emoji: "👩", color: "#3ddc84" },
    { id: "dad",     name: "Dad",     emoji: "👨", color: "#ff9f45" },
  ];

  var PAPERS = [
    { id: "plain",    name: "Plain white" },
    { id: "lined",    name: "School lines" },
    { id: "hearts",   name: "Hearts" },
    { id: "stars",    name: "Stars" },
    { id: "grid",     name: "Builder grid" },
    { id: "rainbow",  name: "Rainbow" },
    { id: "princess", name: "Princess" },
    { id: "ocean",    name: "Ocean waves" },
  ];

  var STAMPS = [
    { id: "unicorn", emoji: "🦄", name: "Unicorn",   color: "#ff5d8f" },
    { id: "rocket",  emoji: "🚀", name: "Rocket",    color: "#38b6ff" },
    { id: "dragon",  emoji: "🐉", name: "Dragon",    color: "#3ddc84" },
    { id: "castle",  emoji: "🏰", name: "Castle",    color: "#8a5cff" },
    { id: "cat",     emoji: "🐱", name: "Kitten",    color: "#ff9f45" },
    { id: "dino",    emoji: "🦕", name: "Dinosaur",  color: "#5ec6a8" },
    { id: "rainbow", emoji: "🌈", name: "Rainbow",   color: "#e63946" },
    { id: "ball",    emoji: "⚽", name: "Football",  color: "#2b8cff" },
    { id: "piano",   emoji: "🎹", name: "Piano",     color: "#2b2440" },
    { id: "world",   emoji: "🌍", name: "The World", color: "#1a9c6b" },
    { id: "crown",   emoji: "👑", name: "Crown",     color: "#c7a000" },
    { id: "owl",     emoji: "🦉", name: "Postmaster Owl", color: "#a97c50" },
  ];

  var GREETINGS = ["Dear", "Hi", "Hello", "Dearest", "To my favourite"];
  var CLOSINGS  = ["Love,", "From,", "Your friend,", "Yours truly,", "Hugs and kisses,", "See you at dinner,"];

  var TRAYS = [
    { id: "hello", label: "👋 Hellos", words: [
      "Hi!", "How are you?", "I hope you are happy.", "It's me!", "Guess what?", "I have a secret.",
    ]},
    { id: "love", label: "❤️ Feelings", words: [
      "I love you ❤️", "I miss you", "You are the best!", "Thank you 🙏", "I'm sorry", "You make me laugh 😂",
      "You are my best friend", "I'm proud of you ⭐",
    ]},
    { id: "ask", label: "❓ Asking", words: [
      "Will you play with me? 🎮", "Can we build something? ⛏️", "Let's read a book 📖", "Can you help me?",
      "What is your favourite colour?", "Can we have a picnic? 🧺", "Will you sing with me? 🎵",
    ]},
    { id: "fun", label: "🎉 Fun", words: [
      "Happy birthday 🎂", "Good night 🌙", "Good luck! 🍀", "Knock knock! 🚪", "See you soon 👋",
      "Let's go outside ☀️", "Snack time! 🍪", "You're it! 🏃",
    ]},
    { id: "stickers", label: "🌟 Stickers", emoji: true, words: [
      "❤️", "⭐", "🌈", "🦄", "🐱", "🐶", "🐉", "🦕", "🏰", "👑", "🎂", "🍪", "🍕", "⚽", "🎮", "⛏️",
      "🎹", "🚀", "🌙", "☀️", "🌸", "🦋", "🐸", "🍦", "🎈", "🎁", "😀", "😂", "😍", "😴", "🤗", "👍",
    ]},
  ];

  var TIPS = [
    "A letter always has a greeting at the top and a signature at the bottom — so the reader knows who it's from!",
    "The postmark is the round stamp the Post Office prints over the stamp. It shows the date the letter was posted.",
    "The stamp goes in the TOP RIGHT corner of an envelope. Try it on a real one!",
    "'Dear' is the most common way to start a letter. 'Yours truly' is a very grown-up way to end one.",
    "A postcard is a letter with no envelope — the picture is on the front and the message is on the back.",
    "Before stamps were invented in 1840, the person RECEIVING the letter had to pay for it!",
    "If someone writes to you, it's kind to write back. That's called a reply.",
  ];

  /* ---------- storage ---------- */
  var state = load();
  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    if (!s || typeof s !== "object") s = {};
    if (!Array.isArray(s.letters)) s.letters = [];
    if (!s.drafts || typeof s.drafts !== "object") s.drafts = {};
    if (!s.last) s.last = null;
    return s;
  }
  function save() {
    // keep the mailbag a sensible size: drop the oldest letters that both sides have read
    if (state.letters.length > MAX_LETTERS) {
      state.letters.sort(function (a, b) { return a.sentAt - b.sentAt; });
      var extra = state.letters.length - MAX_LETTERS;
      state.letters = state.letters.filter(function (l) {
        if (extra > 0 && l.readAt) { extra--; return false; }
        return true;
      });
    }
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  /* ---------- helpers ---------- */
  var $ = function (id) { return document.getElementById(id); };
  function person(id) { for (var i = 0; i < FAMILY.length; i++) if (FAMILY[i].id === id) return FAMILY[i]; return null; }
  function stamp(id) { for (var i = 0; i < STAMPS.length; i++) if (STAMPS[i].id === id) return STAMPS[i]; return STAMPS[0]; }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function sfx(n) { try { if (window.SFX && SFX[n]) SFX[n](); } catch (e) {} }

  var toastTimer = null;
  function toast(msg) {
    var old = document.querySelector(".toast"); if (old) old.remove();
    var t = document.createElement("div"); t.className = "toast"; t.textContent = msg;
    document.body.appendChild(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.remove(); }, 2600);
  }

  // "Thursday 3 September 2026" — the postmark date, written out in full
  function longDate(ms) {
    var d = new Date(ms);
    try { return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
    catch (e) { return d.toDateString(); }
  }
  function shortDate(ms) {
    var d = new Date(ms);
    try { return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }).toUpperCase(); }
    catch (e) { return d.toDateString(); }
  }
  function when(ms) {
    var d = new Date(ms), now = new Date();
    var sameDay = d.toDateString() === now.toDateString();
    var y = new Date(now); y.setDate(now.getDate() - 1);
    var time = "";
    try { time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); } catch (e) {}
    if (sameDay) return "Today at " + time;
    if (d.toDateString() === y.toDateString()) return "Yesterday at " + time;
    return longDate(ms);
  }

  function inboxFor(id) {
    return state.letters.filter(function (l) { return l.to === id && !l.trashedByTo; })
      .sort(function (a, b) { return b.sentAt - a.sentAt; });
  }
  function sentBy(id) {
    return state.letters.filter(function (l) { return l.from === id && !l.trashedByFrom; })
      .sort(function (a, b) { return b.sentAt - a.sentAt; });
  }
  function unreadCount(id) {
    return inboxFor(id).filter(function (l) { return !l.readAt; }).length;
  }

  /* ---------- the current player ---------- */
  var me = null;
  var currentTab = "inbox";

  /* ---------- who? screen ---------- */
  function renderWho() {
    var grid = $("who-grid");
    grid.innerHTML = "";
    FAMILY.forEach(function (p) {
      var b = document.createElement("button");
      b.className = "who-btn" + (state.last === p.id ? " last" : "");
      b.style.setProperty("--accent", p.color);
      b.dataset.id = p.id;
      var n = unreadCount(p.id);
      b.innerHTML = '<span class="face">' + p.emoji + '</span><span class="nm">' + esc(p.name) + "</span>" +
        (n ? '<span class="mailcount">📬 ' + n + "</span>" : "");
      b.setAttribute("aria-label", p.name + (n ? ", " + n + " new letter" + (n > 1 ? "s" : "") : ""));
      b.addEventListener("click", function () { enter(p.id); });
      grid.appendChild(b);
    });
    $("postbox").classList.remove("has-mail");
    $("postbox-msg").textContent = "Who's at the Post Office today?";
    $("who").classList.remove("hidden");
    $("office").classList.add("hidden");
  }

  function enter(id) {
    me = person(id);
    state.last = id; save();
    sfx("pop");
    $("who").classList.add("hidden");
    $("office").classList.remove("hidden");
    $("me-pill").innerHTML = '<span class="face">' + me.emoji + "</span> " + esc(me.name);
    setupWrite();
    showTab(unreadCount(id) ? "inbox" : currentTab);
    refresh();
  }

  function refresh() {
    if (!me) { renderWho(); return; }
    var n = unreadCount(me.id);
    $("inbox-badge").textContent = n ? String(n) : "";
    $("postbox").classList.toggle("has-mail", n > 0);
    $("postbox-msg").textContent = n
      ? "The flag is up — " + me.name + " has " + n + " new letter" + (n > 1 ? "s" : "") + "! 📬"
      : "No new mail for " + me.name + " right now. Why not write some?";
    renderInbox();
    renderSent();
    renderAlbum();
  }

  /* ---------- tabs ---------- */
  function showTab(name) {
    currentTab = name;
    document.querySelectorAll(".tab").forEach(function (t) { t.setAttribute("aria-selected", String(t.dataset.tab === name)); });
    ["inbox", "write", "sent", "stamps"].forEach(function (t) { $("tab-" + t).classList.toggle("hidden", t !== name); });
  }
  document.querySelector(".tabs").addEventListener("click", function (ev) {
    var t = ev.target.closest(".tab"); if (!t) return;
    sfx("pop"); showTab(t.dataset.tab);
  });
  $("switch-btn").addEventListener("click", function () { me = null; sfx("pop"); renderWho(); });

  /* ---------- inbox ---------- */
  function mailItem(l, mine) {
    var other = person(mine ? l.to : l.from) || { name: "?", emoji: "❔" };
    var st = stamp(l.stamp);
    var b = document.createElement("button");
    b.className = "mail-item" + (!mine && !l.readAt ? " unread" : "");
    b.dataset.id = l.id;
    var status = mine ? (l.readAt ? " ✅ Opened" : " 📪 Not opened yet") : (l.readAt ? "" : '<span class="new">NEW</span>');
    b.innerHTML =
      '<span class="face">' + other.emoji + "</span>" +
      '<span class="lines"><span class="who">' + (mine ? "To " : "From ") + esc(other.name) + status + "</span>" +
      '<span class="when">' + esc(when(l.sentAt)) + "</span>" +
      '<span class="peek">' + esc(l.readAt || mine ? l.body : "Tap to open the envelope…") + "</span></span>" +
      '<span class="stamp" style="--sc:' + st.color + '">' + st.emoji + "<small>POST</small></span>";
    b.addEventListener("click", function () { openLetter(l, mine); });
    return b;
  }

  function renderInbox() {
    var list = $("inbox-list"); list.innerHTML = "";
    var mail = inboxFor(me.id);
    if (!mail.length) {
      list.innerHTML = '<div class="empty"><span class="big">📭</span>Your mailbox is empty. Write someone a letter — they might write back!</div>';
      return;
    }
    mail.forEach(function (l) { list.appendChild(mailItem(l, false)); });
  }

  function renderSent() {
    var list = $("sent-list"); list.innerHTML = "";
    var mail = sentBy(me.id);
    if (!mail.length) {
      list.innerHTML = '<div class="empty"><span class="big">✉️</span>You haven\'t posted anything yet.</div>';
      return;
    }
    mail.forEach(function (l) { list.appendChild(mailItem(l, true)); });
  }

  /* ---------- envelope + letter rendering ---------- */
  function postmarkSvg(ms) {
    var d = shortDate(ms).split(" ");
    return '<svg class="postmark" viewBox="0 0 100 100" aria-hidden="true">' +
      '<g transform="rotate(-14 50 50)" fill="none" stroke="#2b2440" stroke-width="2.5">' +
      '<circle cx="36" cy="50" r="26"/>' +
      '<path d="M66 40 q6 -4 12 0 t12 0 t10 0"/><path d="M66 50 q6 -4 12 0 t12 0 t10 0"/><path d="M66 60 q6 -4 12 0 t12 0 t10 0"/>' +
      '</g>' +
      '<g transform="rotate(-14 50 50)" fill="#2b2440" font-family="Trebuchet MS, sans-serif" font-weight="bold" text-anchor="middle">' +
      '<text x="36" y="43" font-size="8">POSTED</text>' +
      '<text x="36" y="55" font-size="11">' + esc(d[0] + " " + (d[1] || "")) + "</text>" +
      '<text x="36" y="66" font-size="8">' + esc(d[2] || "") + "</text>" +
      "</g></svg>";
  }

  function envelopeHtml(l, sealed) {
    var from = person(l.from) || { name: "?" }, to = person(l.to) || { name: "?" };
    var st = stamp(l.stamp);
    return '<div class="from"><b>From:</b> ' + esc(from.name) + " " + from.emoji + "<br>The Arcade House</div>" +
      '<div class="corner"><span class="stamp" style="--sc:' + st.color + '">' + st.emoji + "<small>POST</small></span></div>" +
      (l.sentAt ? postmarkSvg(l.sentAt) : "") +
      '<div class="to"><b>To:</b> ' + to.emoji + " " + esc(to.name) + "<br>" + esc(to.name) + "'s Mailbox<br>The Arcade House</div>" +
      (sealed ? '<div class="flap"></div><div class="seal">💌</div>' : "");
  }

  function letterHtml(l) {
    var to = person(l.to) || { name: "?" }, from = person(l.from) || { name: "?" };
    return '<p class="greeting">' + esc(l.greeting) + " " + esc(to.name) + ",</p>" +
      '<p class="body">' + esc(l.body) + "</p>" +
      '<p class="closing">' + esc(l.closing) + "</p>" +
      '<p class="sig">' + esc(from.name) + " " + from.emoji + "</p>";
  }

  /* ---------- reading a letter ---------- */
  var reading = null;
  function openLetter(l, mine) {
    reading = l;
    var r = $("reader");
    var other = person(mine ? l.to : l.from) || { name: "?" };
    $("reader-title").textContent = mine ? "📤 Your letter to " + other.name : (l.readAt ? "💌 A letter from " + other.name : "📬 You've got mail!");
    $("reader-meta").textContent = "Posted on " + longDate(l.sentAt) + (l.readAt ? " · opened " + when(l.readAt).toLowerCase() : "");
    var env = $("reader-env");
    var alreadyOpen = mine || !!l.readAt;
    env.className = "envelope" + (alreadyOpen ? "" : " sealed");
    env.innerHTML = envelopeHtml(l, !alreadyOpen);
    $("open-hint").classList.toggle("hidden", alreadyOpen);
    var paper = $("reader-paper");
    paper.className = "paper p-" + (l.paper || "plain") + (alreadyOpen ? "" : " hidden");
    paper.innerHTML = letterHtml(l);

    var acts = $("reader-actions"); acts.innerHTML = "";
    if (!mine) {
      var reply = document.createElement("button");
      reply.className = "btn"; reply.id = "reply-btn"; reply.textContent = "↩️ Write back";
      reply.addEventListener("click", function () { closeReader(); startReply(l); });
      acts.appendChild(reply);
    }
    var del = document.createElement("button");
    del.className = "btn ghost"; del.id = "delete-btn"; del.textContent = "🗑️ Throw away";
    del.addEventListener("click", function () {
      if (mine) l.trashedByFrom = true; else l.trashedByTo = true;
      if (l.trashedByFrom && l.trashedByTo) state.letters = state.letters.filter(function (x) { return x.id !== l.id; });
      save(); closeReader(); refresh(); sfx("nope"); toast("Letter thrown away.");
    });
    acts.appendChild(del);
    var close = document.createElement("button");
    close.className = "btn ghost"; close.id = "close-btn"; close.textContent = "✖ Close";
    close.addEventListener("click", closeReader);
    acts.appendChild(close);

    r.classList.remove("hidden");
    if (!alreadyOpen) env.focus();
  }

  function unseal() {
    var l = reading; if (!l || l.readAt) return;
    var env = $("reader-env");
    env.classList.add("opening");
    sfx("crack");
    l.readAt = Date.now(); save();
    setTimeout(function () {
      env.classList.remove("sealed", "opening");
      env.innerHTML = envelopeHtml(l, false);
      $("open-hint").classList.add("hidden");
      $("reader-paper").classList.remove("hidden");
      $("reader-title").textContent = "💌 A letter from " + (person(l.from) || { name: "?" }).name;
      sfx("coin");
      var st = stamp(l.stamp);
      if (countStamp(me.id, st.id) === 1) {
        toast("🎉 New stamp for your album: " + st.name + "!");
        try { window.Confetti && Confetti.burst({ count: 60 }); } catch (e) {}
      }
      refresh();
    }, 450);
  }
  $("reader-env").addEventListener("click", unseal);
  $("reader-env").addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); unseal(); } });
  function closeReader() { $("reader").classList.add("hidden"); reading = null; }
  $("reader").addEventListener("click", function (e) { if (e.target === $("reader")) closeReader(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && reading) closeReader(); });

  /* ---------- writing a letter ---------- */
  var draft = null;   // { to:[], paper, stamp, greeting, closing, body }
  function blankDraft() {
    return { to: [], paper: "plain", stamp: STAMPS[Math.floor(Math.random() * STAMPS.length)].id, greeting: "Dear", closing: "Love,", body: "" };
  }
  function saveDraft() { if (me) { state.drafts[me.id] = draft; save(); } }

  function setupWrite() {
    draft = (state.drafts[me.id] && typeof state.drafts[me.id] === "object") ? state.drafts[me.id] : blankDraft();
    if (!Array.isArray(draft.to)) draft.to = [];
    draft.to = draft.to.filter(function (id) { return id !== me.id && person(id); });

    // recipients: everyone but me, plus Everybody
    var row = $("to-row"); row.innerHTML = "";
    FAMILY.filter(function (p) { return p.id !== me.id; }).forEach(function (p) {
      var c = document.createElement("button");
      c.className = "to-chip"; c.dataset.id = p.id; c.style.setProperty("--accent", p.color);
      c.innerHTML = p.emoji + " " + esc(p.name);
      c.addEventListener("click", function () {
        var i = draft.to.indexOf(p.id);
        if (i >= 0) draft.to.splice(i, 1); else draft.to.push(p.id);
        sfx("pop"); syncWrite();
      });
      row.appendChild(c);
    });
    var all = document.createElement("button");
    all.className = "to-chip"; all.dataset.id = "all"; all.style.setProperty("--accent", "#2b2440");
    all.innerHTML = "👨‍👩‍👧‍👦 Everybody";
    all.addEventListener("click", function () {
      var others = FAMILY.filter(function (p) { return p.id !== me.id; }).map(function (p) { return p.id; });
      draft.to = draft.to.length === others.length ? [] : others;
      sfx("pop"); syncWrite();
    });
    row.appendChild(all);

    // paper
    var prow = $("paper-row"); prow.innerHTML = "";
    PAPERS.forEach(function (p) {
      var b = document.createElement("button");
      b.className = "swatch paper p-" + p.id; b.dataset.id = p.id; b.title = p.name; b.setAttribute("aria-label", p.name + " paper");
      b.style.minHeight = "0"; b.style.padding = "0"; b.style.boxShadow = "none";
      b.addEventListener("click", function () { draft.paper = p.id; sfx("pop"); syncWrite(); });
      prow.appendChild(b);
    });

    // stamps
    var srow = $("stamp-row"); srow.innerHTML = "";
    STAMPS.forEach(function (s) {
      var b = document.createElement("button");
      b.className = "stamp-btn"; b.dataset.id = s.id; b.title = s.name; b.setAttribute("aria-label", s.name + " stamp");
      b.innerHTML = '<span class="stamp" style="--sc:' + s.color + '">' + s.emoji + "<small>POST</small></span>";
      b.addEventListener("click", function () { draft.stamp = s.id; sfx("coin"); syncWrite(); });
      srow.appendChild(b);
    });

    // greeting + closing
    var gs = $("greet-sel"); gs.innerHTML = "";
    GREETINGS.forEach(function (g) { var o = document.createElement("option"); o.value = g; o.textContent = g; gs.appendChild(o); });
    var cs = $("close-sel"); cs.innerHTML = "";
    CLOSINGS.forEach(function (c) { var o = document.createElement("option"); o.value = c; o.textContent = c; cs.appendChild(o); });

    // quick-word trays
    var tt = $("tray-tabs"); tt.innerHTML = "";
    TRAYS.forEach(function (t, i) {
      var b = document.createElement("button");
      b.className = "tray-tab"; b.dataset.id = t.id; b.textContent = t.label; b.setAttribute("aria-selected", String(i === 0));
      b.addEventListener("click", function () { showTray(t.id); });
      tt.appendChild(b);
    });
    showTray(TRAYS[0].id);

    $("sig").textContent = me.name + " " + me.emoji;
    $("body").value = draft.body || "";
    syncWrite();
  }

  function showTray(id) {
    document.querySelectorAll(".tray-tab").forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.id === id)); });
    var tray = $("tray"); tray.innerHTML = "";
    var t = TRAYS.filter(function (x) { return x.id === id; })[0];
    t.words.forEach(function (w) {
      var b = document.createElement("button");
      b.className = "word-btn" + (t.emoji ? " emo" : ""); b.textContent = w;
      b.addEventListener("click", function () { insertWord(w, t.emoji); });
      tray.appendChild(b);
    });
  }

  function insertWord(w, isEmoji) {
    var ta = $("body");
    var v = ta.value, s = ta.selectionStart, e = ta.selectionEnd;
    if (typeof s !== "number") { s = e = v.length; }
    var before = v.slice(0, s), after = v.slice(e);
    var pad = before && !/\s$/.test(before) ? " " : "";
    var tail = isEmoji ? "" : (after && !/^\s/.test(after) ? " " : "");
    var ins = pad + w + tail;
    var nv = before + ins + after;
    if (nv.length > 800) { sfx("nope"); toast("That's a very long letter! Post it and start another one."); return; }
    ta.value = nv;
    var pos = before.length + ins.length;
    try { ta.setSelectionRange(pos, pos); } catch (err) {}
    ta.focus({ preventScroll: true });
    sfx("pop");
    draft.body = nv; syncWrite();
  }

  $("body").addEventListener("input", function () { draft.body = this.value; syncWrite(); });
  $("greet-sel").addEventListener("change", function () { draft.greeting = this.value; syncWrite(); });
  $("close-sel").addEventListener("change", function () { draft.closing = this.value; syncWrite(); });

  function recipientsLabel() {
    if (!draft.to.length) return "…";
    if (draft.to.length === FAMILY.length - 1) return "Everybody";
    return draft.to.map(function (id) { return person(id).name; }).join(draft.to.length === 2 ? " and " : ", ");
  }

  function syncWrite() {
    document.querySelectorAll("#to-row .to-chip").forEach(function (c) {
      var on = c.dataset.id === "all" ? draft.to.length === FAMILY.length - 1 : draft.to.indexOf(c.dataset.id) >= 0;
      c.setAttribute("aria-pressed", String(on));
    });
    document.querySelectorAll("#paper-row .swatch").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.id === draft.paper)); });
    document.querySelectorAll("#stamp-row .stamp-btn").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.id === draft.stamp)); });
    $("write-paper").className = "paper p-" + draft.paper;
    $("greet-sel").value = draft.greeting;
    $("close-sel").value = draft.closing;
    $("greet-name").textContent = recipientsLabel();
    $("count").textContent = String((draft.body || "").length);
    var first = draft.to.length ? draft.to[0] : null;
    $("preview-env").innerHTML = envelopeHtml({ from: me.id, to: first || "", stamp: draft.stamp, sentAt: 0 }, false);
    if (!first) {
      $("preview-env").querySelector(".to").innerHTML = "<b>To:</b> <i style='color:#b0a8c8'>tap a name above</i><br>The Arcade House";
    } else if (draft.to.length > 1) {
      $("preview-env").querySelector(".to").innerHTML = "<b>To:</b> " + esc(recipientsLabel()) + "<br>(" + draft.to.length + " envelopes)<br>The Arcade House";
    }
    $("send-btn").disabled = !(draft.to.length && (draft.body || "").trim());
    saveDraft();
  }

  $("clear-btn").addEventListener("click", function () {
    draft = blankDraft(); $("body").value = ""; sfx("nope"); syncWrite();
  });

  function startReply(l) {
    draft = blankDraft();
    draft.to = [l.from];
    draft.paper = l.paper || "plain";
    $("body").value = "";
    syncWrite();
    showTab("write");
    toast("Write back to " + (person(l.from) || { name: "them" }).name + "!");
    try { $("body").focus({ preventScroll: true }); } catch (e) {}
  }

  /* ---------- posting ---------- */
  $("send-btn").addEventListener("click", function () {
    var body = (draft.body || "").trim();
    if (!draft.to.length) { sfx("nope"); toast("Who is it for? Tap a name first."); return; }
    if (!body) { sfx("nope"); toast("Write something in your letter first!"); return; }
    var now = Date.now();
    draft.to.forEach(function (to, i) {
      state.letters.push({
        id: uid(), from: me.id, to: to, paper: draft.paper, stamp: draft.stamp,
        greeting: draft.greeting, closing: draft.closing, body: body, sentAt: now + i, readAt: null,
      });
    });
    var names = recipientsLabel();
    var n = draft.to.length;
    draft = blankDraft(); $("body").value = "";
    save(); syncWrite();
    flyEnvelope();
    sfx("win");
    try { window.Confetti && Confetti.burst({ count: 70 }); } catch (e) {}
    toast("📬 Posted! " + (n > 1 ? n + " letters are" : "Your letter is") + " waiting for " + names + ".");
    refresh();
    showTab("sent");
  });

  function flyEnvelope() {
    try {
      var from = $("send-btn").getBoundingClientRect();
      var to = $("postbox").getBoundingClientRect();
      var f = document.createElement("div");
      f.className = "fly"; f.textContent = "✉️"; f.setAttribute("aria-hidden", "true");
      f.style.left = (from.left + from.width / 2 - 24) + "px";
      f.style.top = (from.top - 10) + "px";
      document.body.appendChild(f);
      var dx = (to.left + to.width / 2) - (from.left + from.width / 2);
      var dy = (to.top + 30) - (from.top - 10);
      requestAnimationFrame(function () {
        f.style.transform = "translate(" + dx + "px, " + dy + "px) scale(0.3) rotate(-20deg)";
        f.style.opacity = "0";
      });
      setTimeout(function () { f.remove(); }, 1200);
    } catch (e) {}
  }

  /* ---------- stamp album ---------- */
  function countStamp(id, stampId) {
    return state.letters.filter(function (l) { return l.to === id && l.readAt && l.stamp === stampId; }).length;
  }
  function renderAlbum() {
    var album = $("album"); album.innerHTML = "";
    var got = 0;
    STAMPS.forEach(function (s) {
      var n = countStamp(me.id, s.id);
      if (n) got++;
      var d = document.createElement("div");
      d.className = "album-slot" + (n ? "" : " locked");
      d.innerHTML = '<span class="stamp" style="--sc:' + s.color + '">' + s.emoji + "<small>POST</small></span>" +
        '<div class="cnt">' + (n ? esc(s.name) + " × " + n : "?") + "</div>";
      album.appendChild(d);
    });
    var sent = state.letters.filter(function (l) { return l.from === me.id; }).length;
    var got_ = state.letters.filter(function (l) { return l.to === me.id; }).length;
    var opened = state.letters.filter(function (l) { return l.from === me.id && l.readAt; }).length;
    $("stats").innerHTML =
      '<span class="stat">Sent <b>' + sent + "</b></span>" +
      '<span class="stat">Received <b>' + got_ + "</b></span>" +
      '<span class="stat">Opened by others <b>' + opened + "</b></span>" +
      '<span class="stat">Stamps <b>' + got + "</b> / " + STAMPS.length + "</span>";
    $("tip").textContent = "🦉 " + TIPS[new Date().getDate() % TIPS.length];
  }

  /* ---------- another tab posted something? refresh live ---------- */
  window.addEventListener("storage", function (e) {
    if (e.key !== KEY) return;
    var fresh = load();
    // keep our own draft, take everyone's letters
    if (draft && me) fresh.drafts[me.id] = draft;
    state = fresh;
    if (me) { var had = $("inbox-badge").textContent; refresh(); if ($("inbox-badge").textContent !== had && unreadCount(me.id)) { sfx("coin"); toast("📬 New mail just arrived!"); } }
    else renderWho();
  });

  /* ---------- go ---------- */
  renderWho();
})();
