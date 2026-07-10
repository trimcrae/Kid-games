/* ===========================================================
   Rock Detective — for Jeannie & Cory!
   -----------------------------------------------------------
   Identify rocks & minerals like a real geologist:
     🔍 Detective — pick the clues you observe, narrow the suspects
     📚 Rock Book — the full illustrated collection with facts
     🎯 Quiz      — name the rock from its picture

   Rocks are drawn as little SVGs (no image files) using each
   rock's colours + a texture "pattern", so every rock looks
   different but stays the same every time (seeded from name).
   =========================================================== */
(function () {
  "use strict";

  // ---- Clue definitions (the dichotomous-key questions) ---------------
  const CLUES = [
    { key: "sparkly", label: "✨ Sparkly / crystals" },
    { key: "layers",  label: "🥞 Layers or stripes" },
    { key: "holes",   label: "🫧 Full of holes" },
    { key: "glassy",  label: "🪞 Smooth & glassy" },
    { key: "gritty",  label: "🏖️ Gritty / sandy" },
    { key: "cubes",   label: "🧊 Cube crystals" },
    { key: "gold",    label: "🟡 Gold or brassy" },
    { key: "hard",    label: "💪 Hard (scratches glass)" },
    { key: "soft",    label: "🪥 Soft (nail scratches it)" },
    { key: "fizz",    label: "🫧 Fizzes in vinegar" },
    { key: "magnetic", label: "🧲 Magnetic" },
    { key: "floats",  label: "🌊 Floats on water" }
  ];

  // ---- The rock & mineral collection ----------------------------------
  // pattern: how it's drawn  |  tags: which clues it matches
  const ROCKS = [
    // -------- Igneous --------
    { name: "Granite", type: "Igneous", pattern: "speckled", c1: "#e9dcd0", c2: "#b07f6b", c3: "#5a5560",
      mohs: 6.5, tags: ["sparkly", "hard"],
      fact: "Speckled salt-and-pepper rock made of quartz, feldspar & mica.",
      more: "Cools <b>slowly</b> deep underground, so its crystals grow big enough to see. Super tough — that's why kitchen countertops are made of it! 🍳" },
    { name: "Basalt", type: "Igneous", pattern: "fine", c1: "#3a3a42", c2: "#2a2a30",
      mohs: 6, tags: ["hard"],
      fact: "Dark, heavy, fine-grained rock — the most common rock on Earth.",
      more: "Most of the <b>ocean floor</b> is basalt! It cools fast from runny lava, so its crystals are too tiny to see. 🌊" },
    { name: "Obsidian", type: "Igneous", pattern: "glassy", c1: "#1c1620", c2: "#000000",
      mohs: 5.5, tags: ["glassy"],
      fact: "Shiny black volcanic GLASS with razor-sharp edges.",
      more: "Lava cooled so fast that no crystals formed at all. Ancient people chipped it into <b>arrowheads and knives</b>. 🏹" },
    { name: "Pumice", type: "Igneous", pattern: "holey", c1: "#d9cfc2", c2: "#b3a897",
      mohs: 6, tags: ["holes", "floats"],
      fact: "Frothy, holey lava rock so light it FLOATS on water!",
      more: "Gas bubbles got trapped as the lava froze, leaving holes. People use it to <b>scrub rough skin</b>. 🛁" },
    // -------- Sedimentary --------
    { name: "Sandstone", type: "Sedimentary", pattern: "gritty", c1: "#e6c489", c2: "#c39a52",
      mohs: 6.5, tags: ["gritty", "layers"],
      fact: "Made of zillions of sand grains pressed together — feels rough.",
      more: "You can often rub grains of <b>sand</b> right off it. Many desert cliffs and canyons are carved from sandstone. 🏜️" },
    { name: "Limestone", type: "Sedimentary", pattern: "smooth", c1: "#e8e4d6", c2: "#cfc9b4",
      mohs: 3, tags: ["fizz", "soft"],
      fact: "Pale rock made of ancient shells & coral — FIZZES in vinegar.",
      more: "Made mostly of <b>calcite</b> from sea creatures. Rain slowly dissolves it to carve giant <b>caves</b>. 🦕" },
    { name: "Shale", type: "Sedimentary", pattern: "layered", c1: "#7c7d74", c2: "#5c5d55",
      mohs: 3, tags: ["layers", "soft"],
      fact: "Hardened mud that splits into thin flat layers.",
      more: "Made of super-fine clay and mud. It often hides <b>fossils</b> between its pages like a stone book. 🐟" },
    { name: "Conglomerate", type: "Sedimentary", pattern: "pebbles", c1: "#c9a97e", c2: "#8f6b4a", c3: "#e0d3c0",
      mohs: 5, tags: ["gritty"],
      fact: "Rounded pebbles glued together — nature's own concrete!",
      more: "The round pebbles were tumbled smooth by a <b>river</b> before mud and minerals cemented them together. 🪨" },
    { name: "Coal", type: "Sedimentary", pattern: "fine", c1: "#242024", c2: "#0d0a0d",
      mohs: 2, tags: ["soft"],
      fact: "Black, dull rock made from ancient squished plants — it burns!",
      more: "Swamp forests from <b>300 million years</b> ago got buried and squeezed into coal, storing the sun's old energy. ⚡" },
    // -------- Metamorphic --------
    { name: "Marble", type: "Metamorphic", pattern: "smooth", c1: "#f2eee8", c2: "#cdbfc9",
      mohs: 3, tags: ["fizz", "soft", "sparkly"],
      fact: "Limestone changed by heat & pressure into a swirly, shiny stone.",
      more: "Sculptors love it because it's soft enough to carve. Famous <b>statues</b> and fancy floors are marble. 🏛️" },
    { name: "Slate", type: "Metamorphic", pattern: "layered", c1: "#4a5560", c2: "#333c45",
      mohs: 4, tags: ["layers"],
      fact: "Shale changed into a hard rock that splits into flat sheets.",
      more: "Those flat sheets make great <b>roof tiles</b> and old-fashioned <b>chalkboards</b>. 🎓" },
    { name: "Gneiss", type: "Metamorphic", pattern: "banded", c1: "#ddd3c6", c2: "#4a4550", c3: "#b58f6f",
      mohs: 6.5, tags: ["layers", "sparkly", "hard"],
      fact: "Say 'nice'! Rock with wavy light & dark stripes from squishing.",
      more: "Heat and pressure lined its minerals up into <b>bands</b>. It's one of the oldest rocks on Earth. ⏳" },
    { name: "Quartzite", type: "Metamorphic", pattern: "smooth", c1: "#eee6e0", c2: "#d8c6d0",
      mohs: 7, tags: ["hard", "sparkly"],
      fact: "Sandstone baked into an extremely hard, sparkly rock.",
      more: "So tough that it resists weathering — it often forms <b>mountain ridges</b>. It'll scratch glass! ⛰️" },
    { name: "Schist", type: "Metamorphic", pattern: "flaky", c1: "#8a8f7c", c2: "#c9c3a8", c3: "#5c5f50",
      mohs: 4, tags: ["sparkly", "layers"],
      fact: "Flaky, glittery rock packed with shiny mica flakes.",
      more: "It sparkles because thousands of tiny <b>mica</b> mirrors all line up the same way. ✨" },
    // -------- Star minerals --------
    { name: "Quartz", type: "Mineral", pattern: "crystal", c1: "#eaf3f7", c2: "#c3dbe6",
      mohs: 7, tags: ["sparkly", "hard", "glassy"],
      fact: "Six-sided glassy crystals — one of Earth's most common minerals.",
      more: "Comes in <b>many colours</b> and is used in watches and phones to keep time. Scratches glass easily. ⌚" },
    { name: "Amethyst", type: "Mineral", pattern: "crystal", c1: "#9b6fd4", c2: "#6f45b0",
      mohs: 7, tags: ["sparkly", "hard"],
      fact: "Purple quartz that grows as glittering crystal clusters.",
      more: "It gets its purple colour from a tiny bit of <b>iron</b>. It's February's birthstone. 💜" },
    { name: "Pyrite", type: "Mineral", pattern: "cubes", c1: "#d4af37", c2: "#a8862a",
      mohs: 6, tags: ["gold", "cubes", "sparkly", "hard"],
      fact: "'Fool's Gold' — shiny brassy CUBES that tricked old miners!",
      more: "It grows as perfect <b>cubes</b>, but it's really iron + sulfur, not gold. Real gold is soft; pyrite is hard. 😅" },
    { name: "Halite", type: "Mineral", pattern: "cubes", c1: "#eef0f2", c2: "#d5d0e0",
      mohs: 2.5, tags: ["cubes", "soft"],
      fact: "Rock SALT — clear cube crystals you could (but shouldn't) taste!",
      more: "It's the exact same stuff as <b>table salt</b>. Whole underground mines are made of it. 🧂" },
    { name: "Magnetite", type: "Mineral", pattern: "smooth", c1: "#2b2b33", c2: "#4a4a55",
      mohs: 6, tags: ["magnetic", "hard"],
      fact: "A heavy black iron mineral that is naturally MAGNETIC. 🧲",
      more: "A magnet sticks right to it! Ancient sailors used magnetic 'lodestone' as the first <b>compasses</b>. 🧭" },
    { name: "Mica", type: "Mineral", pattern: "flaky", c1: "#cbb98f", c2: "#9a8455",
      mohs: 2.5, tags: ["sparkly", "soft", "layers"],
      fact: "Peels into paper-thin, see-through shiny sheets.",
      more: "You can flake it apart with a fingernail. It's used to add <b>sparkle</b> to makeup and paint. 💄" },
    { name: "Calcite", type: "Mineral", pattern: "crystal", c1: "#f3ead7", c2: "#e0cfa8",
      mohs: 3, tags: ["fizz", "soft", "sparkly"],
      fact: "Clear crystals that FIZZ in vinegar and can double your view!",
      more: "Look through clear calcite and you see <b>two</b> of everything. It's what limestone and marble are made of. 👀" },
    { name: "Talc", type: "Mineral", pattern: "smooth", c1: "#eef0ea", c2: "#d3d8cf",
      mohs: 1, tags: ["soft"],
      fact: "The SOFTEST mineral — your fingernail scratches it easily.",
      more: "It's #1 (softest) on the hardness scale, and it's ground up to make <b>talcum powder</b>. 🍼" },
    { name: "Diamond", type: "Mineral", pattern: "crystal", c1: "#e6f7ff", c2: "#bfe6f5",
      mohs: 10, tags: ["hard", "sparkly", "glassy"],
      fact: "The HARDEST natural material on Earth — pure carbon!",
      more: "Made of the same stuff as pencil lead, but its atoms lock together so tightly nothing can scratch it. 💎" }
  ];

  // ---- Tiny seeded RNG so each rock always draws the same -------------
  function seed(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // ---- Draw a rock as an SVG string (viewBox 0 0 120 100) -------------
  function rockSvg(rock) {
    const r = seed(rock.name);
    const bg = "#f4efe8";
    let inner = "";
    const clip = 'clipPath="url(#clip-' + rock.name.replace(/\W/g, "") + ')"';
    const clipId = "clip-" + rock.name.replace(/\W/g, "");

    // a rounded, slightly irregular rock blob
    const blob = "M 18," + (58 + r() * 8) +
      " Q 10,30 34,20 Q 60,8 88,20 Q 112,30 104," + (56 + r() * 8) +
      " Q 108,84 78,90 Q 48,96 26,86 Q 8,78 18," + (58 + r() * 8) + " Z";

    if (rock.pattern === "speckled") {
      inner = '<rect width="120" height="100" fill="' + rock.c1 + '"/>';
      for (let i = 0; i < 90; i++) {
        const cx = 10 + r() * 100, cy = 10 + r() * 80, rad = 1.5 + r() * 3.5;
        const col = r() < 0.5 ? rock.c2 : (rock.c3 || rock.c2);
        inner += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + rad.toFixed(1) + '" fill="' + col + '"/>';
      }
    } else if (rock.pattern === "fine") {
      inner = '<rect width="120" height="100" fill="' + rock.c1 + '"/>';
      for (let i = 0; i < 40; i++) {
        inner += '<circle cx="' + (10 + r() * 100).toFixed(1) + '" cy="' + (10 + r() * 80).toFixed(1) +
          '" r="' + (0.8 + r() * 1.4).toFixed(1) + '" fill="' + rock.c2 + '"/>';
      }
    } else if (rock.pattern === "glassy") {
      inner = '<rect width="120" height="100" fill="' + rock.c1 + '"/>' +
        '<polygon points="30,15 55,25 40,60 20,45" fill="' + rock.c2 + '" opacity="0.6"/>' +
        '<polygon points="70,30 95,20 100,55 78,70" fill="#ffffff" opacity="0.14"/>' +
        '<path d="M 35,20 L 80,80" stroke="#ffffff" stroke-width="3" opacity="0.35" stroke-linecap="round"/>';
    } else if (rock.pattern === "holey") {
      inner = '<rect width="120" height="100" fill="' + rock.c1 + '"/>';
      for (let i = 0; i < 55; i++) {
        inner += '<circle cx="' + (10 + r() * 100).toFixed(1) + '" cy="' + (10 + r() * 80).toFixed(1) +
          '" r="' + (1.5 + r() * 4).toFixed(1) + '" fill="' + rock.c2 + '"/>';
      }
    } else if (rock.pattern === "gritty") {
      inner = '<rect width="120" height="100" fill="' + rock.c1 + '"/>';
      for (let i = 0; i < 130; i++) {
        inner += '<circle cx="' + (8 + r() * 104).toFixed(1) + '" cy="' + (8 + r() * 84).toFixed(1) +
          '" r="' + (1 + r() * 1.8).toFixed(1) + '" fill="' + rock.c2 + '" opacity="0.55"/>';
      }
    } else if (rock.pattern === "layered" || rock.pattern === "banded") {
      inner = '<rect width="120" height="100" fill="' + rock.c1 + '"/>';
      let y = 8;
      while (y < 96) {
        const h = 4 + r() * 8;
        const wob = rock.pattern === "banded" ? 6 : 1.5;
        const col = rock.pattern === "banded"
          ? (r() < 0.5 ? rock.c2 : (rock.c3 || rock.c2))
          : rock.c2;
        inner += '<path d="M 0,' + y.toFixed(1) + ' Q 30,' + (y - wob).toFixed(1) + ' 60,' + y.toFixed(1) +
          ' T 120,' + y.toFixed(1) + ' L 120,' + (y + h).toFixed(1) + ' Q 90,' + (y + h - wob).toFixed(1) +
          ' 60,' + (y + h).toFixed(1) + ' T 0,' + (y + h).toFixed(1) + ' Z" fill="' + col + '" opacity="0.7"/>';
        y += h + (2 + r() * 5);
      }
    } else if (rock.pattern === "pebbles") {
      inner = '<rect width="120" height="100" fill="' + (rock.c3 || rock.c1) + '"/>';
      for (let i = 0; i < 16; i++) {
        const cx = 14 + r() * 92, cy = 14 + r() * 72;
        inner += '<ellipse cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" rx="' + (7 + r() * 8).toFixed(1) +
          '" ry="' + (6 + r() * 6).toFixed(1) + '" fill="' + (r() < 0.5 ? rock.c1 : rock.c2) + '"/>';
      }
    } else if (rock.pattern === "crystal") {
      inner = '<rect width="120" height="100" fill="' + rock.c1 + '"/>';
      for (let i = 0; i < 6; i++) {
        const bx = 15 + i * 16 + r() * 6, by = 80 + r() * 8, h = 30 + r() * 40, w = 7 + r() * 6;
        inner += '<polygon points="' + bx.toFixed(1) + ',' + by.toFixed(1) + ' ' +
          (bx + w).toFixed(1) + ',' + by.toFixed(1) + ' ' + (bx + w).toFixed(1) + ',' + (by - h + 8).toFixed(1) +
          ' ' + (bx + w / 2).toFixed(1) + ',' + (by - h).toFixed(1) + ' ' + bx.toFixed(1) + ',' + (by - h + 8).toFixed(1) +
          '" fill="' + (i % 2 ? rock.c2 : rock.c1) + '" stroke="' + rock.c2 + '" stroke-width="1.2" opacity="0.92"/>';
      }
    } else if (rock.pattern === "cubes") {
      inner = '<rect width="120" height="100" fill="' + bg + '"/>';
      for (let i = 0; i < 7; i++) {
        const x = 12 + r() * 84, y = 20 + r() * 56, s = 10 + r() * 14;
        const top = rock.c1, right = rock.c2, front = rock.c1;
        inner += '<g>' +
          '<polygon points="' + x + ',' + y + ' ' + (x + s) + ',' + (y - s * 0.4) + ' ' + (x + s * 2) + ',' + y + ' ' + (x + s) + ',' + (y + s * 0.4) + '" fill="' + top + '"/>' +
          '<polygon points="' + x + ',' + y + ' ' + (x + s) + ',' + (y + s * 0.4) + ' ' + (x + s) + ',' + (y + s * 0.4 + s) + ' ' + x + ',' + (y + s) + '" fill="' + right + '"/>' +
          '<polygon points="' + (x + s) + ',' + (y + s * 0.4) + ' ' + (x + s * 2) + ',' + y + ' ' + (x + s * 2) + ',' + (y + s) + ' ' + (x + s) + ',' + (y + s * 0.4 + s) + '" fill="' + front + '" opacity="0.82"/>' +
          '</g>';
      }
    } else if (rock.pattern === "flaky") {
      inner = '<rect width="120" height="100" fill="' + rock.c1 + '"/>';
      let y = 12;
      while (y < 92) {
        inner += '<path d="M 6,' + y.toFixed(1) + ' L 114,' + (y + (r() * 4 - 2)).toFixed(1) + '" stroke="' +
          (r() < 0.5 ? rock.c2 : (rock.c3 || rock.c2)) + '" stroke-width="' + (1.5 + r() * 2).toFixed(1) +
          '" opacity="0.7"/>';
        // a few sparkle flecks
        if (r() < 0.6) inner += '<circle cx="' + (12 + r() * 96).toFixed(1) + '" cy="' + y.toFixed(1) +
          '" r="1.6" fill="#ffffff" opacity="0.8"/>';
        y += 4 + r() * 4;
      }
    } else { // "smooth"
      inner = '<rect width="120" height="100" fill="' + rock.c1 + '"/>' +
        '<ellipse cx="45" cy="40" rx="40" ry="26" fill="' + rock.c2 + '" opacity="0.5"/>' +
        '<ellipse cx="80" cy="65" rx="30" ry="20" fill="' + rock.c2 + '" opacity="0.35"/>' +
        '<ellipse cx="38" cy="34" rx="12" ry="7" fill="#ffffff" opacity="0.18"/>';
    }

    return '<defs><clipPath id="' + clipId + '"><path d="' + blob + '"/></clipPath></defs>' +
      '<rect width="120" height="100" fill="' + bg + '"/>' +
      '<g ' + clip + '>' + inner + '</g>' +
      '<path d="' + blob + '" fill="none" stroke="#00000022" stroke-width="2"/>';
  }

  const $ = id => document.getElementById(id);

  // ---- Rock card element ----------------------------------------------
  function rockCard(rock) {
    const el = document.createElement("div");
    el.className = "rock-card";
    el.innerHTML =
      '<svg viewBox="0 0 120 100" preserveAspectRatio="none">' + rockSvg(rock) + '</svg>' +
      '<div class="rock-body">' +
        '<div class="rock-name">' + rock.name + '</div>' +
        '<span class="rock-badge b-' + rock.type + '">' + rock.type + '</span>' +
        '<div class="rock-fact">' + rock.fact + '</div>' +
        '<div class="rock-more"><b>Hardness:</b> ' + rock.mohs + ' / 10 (Mohs).<br>' + rock.more + '</div>' +
      '</div>';
    el.onclick = () => {
      el.classList.toggle("open");
      window.SFX && SFX.good && SFX.good();
    };
    return el;
  }

  // ---- Rock Book: all rocks -------------------------------------------
  function buildBook() {
    const grid = $("bookGrid");
    grid.innerHTML = "";
    ROCKS.forEach(rk => grid.appendChild(rockCard(rk)));
  }

  // ---- Detective: clue chips + live filter ----------------------------
  const active = new Set();
  function buildClues() {
    const box = $("clues");
    box.innerHTML = "";
    CLUES.forEach(c => {
      const b = document.createElement("button");
      b.className = "clue";
      b.textContent = c.label;
      b.onclick = () => {
        if (active.has(c.key)) { active.delete(c.key); b.classList.remove("on"); }
        else { active.add(c.key); b.classList.add("on"); }
        window.SFX && SFX.good && SFX.good();
        filterDetective();
      };
      box.appendChild(b);
    });
  }

  function buildDetectiveGrid() {
    const grid = $("detectiveGrid");
    grid.innerHTML = "";
    ROCKS.forEach(rk => {
      const card = rockCard(rk);
      card.dataset.name = rk.name;
      grid.appendChild(card);
    });
  }

  function filterDetective() {
    const grid = $("detectiveGrid");
    let matches = 0;
    ROCKS.forEach(rk => {
      const card = grid.querySelector('[data-name="' + rk.name + '"]');
      const ok = [...active].every(k => rk.tags.includes(k));
      card.classList.toggle("dim", !ok);
      if (ok) matches++;
    });
    // remove any old empty note
    const old = grid.querySelector(".empty-note");
    if (old) old.remove();
    if (matches === 0) {
      const note = document.createElement("div");
      note.className = "empty-note";
      note.textContent = "🤔 No rock matches ALL those clues — try removing one!";
      grid.appendChild(note);
    }
    const n = active.size;
    $("clueCount").textContent = n === 0
      ? "Showing all " + ROCKS.length + " rocks"
      : matches + " suspect" + (matches === 1 ? "" : "s") + " match " + n + " clue" + (n === 1 ? "" : "s");
    if (matches === 1 && n > 0) window.Confetti && Confetti.burst && Confetti.burst({ count: 40 });
  }

  $("resetClues").onclick = () => {
    active.clear();
    document.querySelectorAll(".clue.on").forEach(b => b.classList.remove("on"));
    filterDetective();
  };

  // ---- Quiz -----------------------------------------------------------
  const QKEY = "rockDetectiveQuiz";
  let score = 0, asked = 0, current = null, answered = false;
  try { const s = JSON.parse(localStorage.getItem(QKEY) || "{}"); score = s.score || 0; asked = s.asked || 0; } catch (e) {}

  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function newQuiz() {
    answered = false;
    $("nextQuiz").style.display = "none";
    $("quizFeedback").textContent = "";
    current = ROCKS[Math.floor(Math.random() * ROCKS.length)];
    $("quizSvg").innerHTML = rockSvg(current);
    $("quizHint").innerHTML = "Hint: it's a <b>" + current.type + "</b> — " + current.fact;

    const wrong = shuffle(ROCKS.filter(r => r.name !== current.name)).slice(0, 3);
    const opts = shuffle([current, ...wrong]);
    const box = $("quizOpts");
    box.innerHTML = "";
    opts.forEach(o => {
      const b = document.createElement("button");
      b.className = "quiz-opt";
      b.textContent = o.name;
      b.onclick = () => answerQuiz(b, o);
      box.appendChild(b);
    });
    updateScore();
  }

  function answerQuiz(btn, opt) {
    if (answered) return;
    answered = true;
    asked++;
    const buttons = $("quizOpts").querySelectorAll(".quiz-opt");
    buttons.forEach(b => { b.disabled = true; if (b.textContent === current.name) b.classList.add("right"); });
    if (opt.name === current.name) {
      score++;
      btn.classList.add("right");
      $("quizFeedback").style.color = "var(--green)";
      $("quizFeedback").textContent = "✅ Yes! " + current.name + "!";
      window.SFX && SFX.win && SFX.win();
      window.Confetti && Confetti.burst && Confetti.burst();
    } else {
      btn.classList.add("wrong");
      $("quizFeedback").style.color = "var(--pink)";
      $("quizFeedback").textContent = "❌ That was " + opt.name + ". This is " + current.name + ".";
      window.SFX && SFX.nope && SFX.nope();
    }
    updateScore();
    try { localStorage.setItem(QKEY, JSON.stringify({ score: score, asked: asked })); } catch (e) {}
    $("nextQuiz").style.display = "inline-block";
  }

  function updateScore() {
    $("quizScore").textContent = "🏆 Score: " + score + " / " + asked;
  }

  $("nextQuiz").onclick = newQuiz;

  // ---- Tabs -----------------------------------------------------------
  document.querySelectorAll(".tab").forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      const panel = $(tab.dataset.panel);
      panel.classList.add("active");
      if (tab.dataset.panel === "quiz" && !current) newQuiz();
      window.SFX && SFX.good && SFX.good();
    };
  });

  // ---- Boot -----------------------------------------------------------
  buildClues();
  buildDetectiveGrid();
  filterDetective();
  buildBook();
})();
