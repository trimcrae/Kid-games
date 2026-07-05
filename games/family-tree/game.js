/* ===========================================================
   Family Tree — grow your own family tree, forever.
   -----------------------------------------------------------
   Starts with just our immediate family and lets the kids add
   grandparents, cousins, partners, babies… without limit.
   Teaches family-relationship vocabulary: pick who YOU are and
   every card shows the word for that person (Grandma, Niece,
   2nd cousin once removed, …).

   One shared tree per device (a single localStorage key — it is
   the whole family's tree, not one per kid profile).

   Data model: people[id] = { name, emoji, gender, gen, parents[], partners[] }
   `gen` is the generation row (parents' gen 0, kids gen 1, a new
   grandparent gen -1, …) and is stored, never recomputed, so the
   tree stays stable however it is edited.
   =========================================================== */
(function () {
  "use strict";

  const KEY = "family-tree.v1";

  /* ---------- layout constants (px) ---------- */
  const CW = 112;          // card width
  const CH = 128;          // card height
  const PGAP = 16;         // gap between partners inside a couple
  const UGAP = 44;         // gap between family units in a row
  const VGAP = 96;         // vertical gap between generations
  const MARGIN = 40;

  const FACES = [
    "👶","🧒","👦","👧","🧑","👨","👩","🧔",
    "👱","👱‍♀️","👨‍🦰","👩‍🦰","👨‍🦱","👩‍🦱","👨‍🦳","👩‍🦳",
    "👴","👵","🧓","👸","🤴","🦸","🧚","🧙",
    "🧑‍🚀","🧑‍🌾","🧑‍🍳","🐶","🐱","🐰","🦄","🤖"
  ];
  const GEN_COLORS = ["#8a5cff", "#38b6ff", "#3ddc84", "#f4791f", "#ff5d8f", "#ffd166"];

  /* ---------- state ---------- */

  function seed() {
    return {
      nextId: 7,
      me: null,
      order: ["p1", "p2", "p3", "p4", "p5", "p6"],
      people: {
        p1: { name: "Tristan", emoji: "👨", gender: "m", gen: 0, parents: [], partners: ["p2"] },
        p2: { name: "Shannon", emoji: "👩", gender: "f", gen: 0, parents: [], partners: ["p1"] },
        p3: { name: "Jeannie", emoji: "👧", gender: "f", gen: 1, parents: ["p1", "p2"], partners: [] },
        p4: { name: "Cory",    emoji: "👦", gender: "m", gen: 1, parents: ["p1", "p2"], partners: [] },
        p5: { name: "Ellie",   emoji: "👸", gender: "f", gen: 1, parents: ["p1", "p2"], partners: [] },
        p6: { name: "Kieran",  emoji: "👶", gender: "m", gen: 1, parents: ["p1", "p2"], partners: [] }
      }
    };
  }

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.people && s.order && s.order.length) return s;
    } catch (e) { /* fall through */ }
    return seed();
  }

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }

  let state = load();
  let zoom = 1;

  const P = () => state.people;
  const alive = (id) => !!state.people[id];

  function newId() { return "p" + (state.nextId++); }

  function addPerson(fields) {
    const id = newId();
    state.people[id] = {
      name: fields.name, emoji: fields.emoji, gender: fields.gender,
      gen: fields.gen, parents: fields.parents || [], partners: fields.partners || []
    };
    state.order.push(id);
    (fields.partners || []).forEach((o) => {
      if (alive(o) && P()[o].partners.indexOf(id) === -1) P()[o].partners.push(id);
    });
    return id;
  }

  function removePerson(id) {
    delete state.people[id];
    state.order = state.order.filter((x) => x !== id);
    state.order.forEach((x) => {
      const p = P()[x];
      p.parents = p.parents.filter((y) => y !== id);
      p.partners = p.partners.filter((y) => y !== id);
    });
    if (state.me === id) state.me = null;
  }

  function childrenOf(id) {
    return state.order.filter((x) => P()[x].parents.indexOf(id) !== -1);
  }

  /* ---------- relationship words (the teaching part) ---------- */

  // Map of ancestorId -> how many generations up from `id`.
  function ancestorMap(id) {
    const m = {}; m[id] = 0;
    const q = [id];
    while (q.length) {
      const c = q.shift();
      (P()[c].parents || []).forEach((par) => {
        if (!alive(par)) return;
        const d = m[c] + 1;
        if (m[par] === undefined || m[par] > d) { m[par] = d; q.push(par); }
      });
    }
    return m;
  }

  // Closest shared ancestor: {u: my steps up, d: their steps up} or null.
  function bloodPath(a, b) {
    const A = ancestorMap(a), B = ancestorMap(b);
    let best = null;
    Object.keys(A).forEach((anc) => {
      if (B[anc] === undefined) return;
      const u = A[anc], d = B[anc];
      if (!best || u + d < best.u + best.d || (u + d === best.u + best.d && u < best.u)) {
        best = { u: u, d: d };
      }
    });
    return best;
  }

  function byG(g, boy, girl, plain) { return g === "m" ? boy : g === "f" ? girl : plain; }
  function greats(n) { let s = ""; for (let i = 0; i < n; i++) s += "Great-"; return s; }

  function bloodLabel(u, d, g) {
    if (u === 0 && d === 0) return "You!";
    if (d === 0) { // they are my ancestor, u generations up
      if (u === 1) return byG(g, "Dad", "Mom", "Parent");
      return greats(u - 2) + byG(g, "Grandpa", "Grandma", "Grandparent");
    }
    if (u === 0) { // my descendant, d generations down
      if (d === 1) return byG(g, "Son", "Daughter", "My child");
      return greats(d - 2) + byG(g, "Grandson", "Granddaughter", "Grandchild");
    }
    if (u === 1 && d === 1) return byG(g, "Brother", "Sister", "Sibling");
    if (u === 1) return greats(d - 2) + byG(g, "Nephew", "Niece", "Niece/Nephew");
    if (d === 1) return greats(u - 2) + byG(g, "Uncle", "Aunt", "Aunt/Uncle");
    const deg = Math.min(u, d) - 1;
    const rem = Math.abs(u - d);
    const ord = deg === 1 ? "1st" : deg === 2 ? "2nd" : deg === 3 ? "3rd" : deg + "th";
    let s = ord + " cousin";
    if (rem === 1) s += " once removed";
    else if (rem === 2) s += " twice removed";
    else if (rem > 2) s += " " + rem + "× removed";
    return s;
  }

  function relationLabel(me, other) {
    if (!me || !alive(me) || !alive(other)) return "";
    if (me === other) return "You!";
    const b = bloodPath(me, other);
    const g = P()[other].gender;
    if (b) return bloodLabel(b.u, b.d, g);

    if (P()[me].partners.indexOf(other) !== -1) return byG(g, "Husband", "Wife", "Partner");

    // Married into my side: `other` is the partner of a blood relative of mine.
    for (let i = 0; i < P()[other].partners.length; i++) {
      const p = P()[other].partners[i];
      if (!alive(p)) continue;
      const bp = bloodPath(me, p);
      if (!bp) continue;
      const u = bp.u, d = bp.d;
      if (d === 0 && u === 1) return byG(g, "Stepdad", "Stepmom", "Step-parent");
      if (d === 0 && u >= 2) return byG(g, "Step-grandpa", "Step-grandma", "Step-grandparent");
      if (u === 1 && d === 1) return byG(g, "Brother-in-law", "Sister-in-law", "Sibling-in-law");
      if (u === 0 && d === 1) return byG(g, "Son-in-law", "Daughter-in-law", "Child-in-law");
      if (d === 1 && u >= 2) return byG(g, "Uncle", "Aunt", "Aunt/Uncle") + " (married in)";
      return "Family by marriage";
    }

    // On my partner's side: `other` is a blood relative of my partner.
    for (let j = 0; j < P()[me].partners.length; j++) {
      const q = P()[me].partners[j];
      if (!alive(q)) continue;
      const bq = bloodPath(q, other);
      if (!bq) continue;
      const u = bq.u, d = bq.d;
      if (d === 0 && u === 1) return byG(g, "Father-in-law", "Mother-in-law", "Parent-in-law");
      if (u === 1 && d === 1) return byG(g, "Brother-in-law", "Sister-in-law", "Sibling-in-law");
      if (u === 0 && d === 1) return byG(g, "Stepson", "Stepdaughter", "Stepchild");
      return "My partner's family";
    }

    return "Family ❤️";
  }

  /* ---------- layout ----------
     Rows = generations. Partners sit together in a "unit".
     A few barycenter sweeps pull children under their parents. */

  function computeLayout() {
    const ids = state.order.filter(alive);
    if (!ids.length) return { pos: {}, rows: [], width: 200, height: 200 };

    const gens = {};
    ids.forEach((id) => {
      const g = P()[id].gen;
      (gens[g] = gens[g] || []).push(id);
    });
    const genKeys = Object.keys(gens).map(Number).sort((a, b) => a - b);

    // Build partner units per generation (connected components of partner links).
    const unitOf = {};
    const rows = genKeys.map((g, rowIdx) => {
      const row = { gen: g, idx: rowIdx, units: [] };
      const seen = {};
      gens[g].forEach((id) => {
        if (seen[id]) return;
        const members = [];
        const q = [id];
        seen[id] = true;
        while (q.length) {
          const c = q.shift();
          members.push(c);
          P()[c].partners.forEach((o) => {
            if (alive(o) && P()[o].gen === g && !seen[o]) { seen[o] = true; q.push(o); }
          });
        }
        const unit = {
          members: members,
          w: members.length * CW + (members.length - 1) * PGAP,
          x: 0, row: rowIdx
        };
        members.forEach((m) => { unitOf[m] = unit; });
        row.units.push(unit);
      });
      return row;
    });

    // Initial x: pack each row left to right.
    rows.forEach((row) => {
      let cur = 0;
      row.units.forEach((u) => { u.x = cur + u.w / 2; cur += u.w + UGAP; });
    });

    const kidsIndex = {};
    ids.forEach((id) => {
      P()[id].parents.forEach((par) => { (kidsIndex[par] = kidsIndex[par] || []).push(id); });
    });

    function sweep(row, refIdx, useParents) {
      row.units.forEach((u) => {
        const rel = [];
        u.members.forEach((m) => {
          const linked = useParents ? P()[m].parents : (kidsIndex[m] || []);
          linked.forEach((o) => {
            if (alive(o) && unitOf[o] && unitOf[o].row === refIdx) rel.push(unitOf[o].x);
          });
        });
        u.linked = rel.length > 0;
        u.desired = rel.length ? rel.reduce((a, b) => a + b, 0) / rel.length : u.x;
      });
      row.units.sort((a, b) => a.desired - b.desired);
      let cursor = null;
      row.units.forEach((u) => {
        let x = u.desired;
        if (cursor !== null) x = Math.max(x, cursor + UGAP + u.w / 2);
        u.x = x;
        cursor = x + u.w / 2;
      });
      // Un-drift: keep linked units centred on their relatives on average.
      const linked = row.units.filter((u) => u.linked);
      if (linked.length) {
        const shift = linked.reduce((a, u) => a + (u.x - u.desired), 0) / linked.length;
        row.units.forEach((u) => { u.x -= shift; });
      }
    }

    for (let it = 0; it < 3; it++) {
      for (let r = 1; r < rows.length; r++) sweep(rows[r], r - 1, true);
      for (let r = rows.length - 2; r >= 0; r--) sweep(rows[r], r + 1, false);
    }

    // Normalise to positive coordinates and place every card.
    let minX = Infinity, maxX = -Infinity;
    rows.forEach((row) => row.units.forEach((u) => {
      minX = Math.min(minX, u.x - u.w / 2);
      maxX = Math.max(maxX, u.x + u.w / 2);
    }));
    const off = MARGIN - minX;

    const pos = {};
    rows.forEach((row) => {
      const y = MARGIN + row.idx * (CH + VGAP);
      row.units.forEach((u) => {
        const left = u.x - u.w / 2 + off;
        u.members.forEach((m, i) => {
          pos[m] = { x: left + i * (CW + PGAP), y: y };  // top-left of card
        });
      });
    });

    return {
      pos: pos,
      rows: rows,
      width: Math.max(maxX - minX + 2 * MARGIN, 320),
      height: MARGIN * 2 + rows.length * CH + (rows.length - 1) * VGAP
    };
  }

  /* ---------- rendering ---------- */

  const canvas = document.getElementById("canvas");
  const sizer = document.getElementById("sizer");
  const svg = document.getElementById("edges");
  const viewport = document.getElementById("viewport");
  const meSelect = document.getElementById("me-select");

  function genColor(gen) {
    const i = ((gen % GEN_COLORS.length) + GEN_COLORS.length) % GEN_COLORS.length;
    return GEN_COLORS[i];
  }

  function cx(id, pos) { return pos[id].x + CW / 2; }

  function drawEdges(layout) {
    const pos = layout.pos;
    let out = "";

    // Couple lines with a heart.
    const done = {};
    state.order.filter(alive).forEach((a) => {
      P()[a].partners.forEach((b) => {
        if (!alive(b) || !pos[a] || !pos[b]) return;
        const key = a < b ? a + "|" + b : b + "|" + a;
        if (done[key]) return;
        done[key] = true;
        if (pos[a].y !== pos[b].y) return;
        const y = pos[a].y + CH * 0.45;
        const L = Math.min(pos[a].x, pos[b].x) + CW;
        const R = Math.max(pos[a].x, pos[b].x);
        const mid = (L + R) / 2;
        out += '<line x1="' + L + '" y1="' + y + '" x2="' + R + '" y2="' + y +
               '" stroke="#ff5d8f" stroke-width="4" stroke-linecap="round"/>';
        out += '<text x="' + mid + '" y="' + (y + 6) + '" text-anchor="middle" font-size="16">❤️</text>';
      });
    });

    // Parent → child elbows, one bus per set of parents so siblings share it.
    const fams = {};
    state.order.filter(alive).forEach((id) => {
      const pars = P()[id].parents.filter(alive).filter((p) => pos[p]);
      if (!pars.length || !pos[id]) return;
      const key = pars.slice().sort().join("|");
      (fams[key] = fams[key] || { pars: pars, kids: [] }).kids.push(id);
    });
    let famIdx = 0;
    Object.keys(fams).forEach((key) => {
      const fam = fams[key];
      const pars = fam.pars;
      let ax, ay;
      const couple = pars.length === 2 && pos[pars[0]].y === pos[pars[1]].y &&
                     Math.abs(pos[pars[0]].x - pos[pars[1]].x) <= CW + PGAP + 2;
      if (couple) { // drop from the heart line between the couple
        ax = (cx(pars[0], pos) + cx(pars[1], pos)) / 2;
        ay = pos[pars[0]].y + CH * 0.45;
      } else {
        ax = pars.reduce((a, p) => a + cx(p, pos), 0) / pars.length;
        ay = Math.max.apply(null, pars.map((p) => pos[p].y)) + CH;
      }
      const busY = ay + (couple ? CH * 0.55 : 0) + VGAP * 0.45 + (famIdx % 4) * 7;
      famIdx++;
      const col = genColor(P()[fam.kids[0]].gen);
      out += '<line x1="' + ax + '" y1="' + ay + '" x2="' + ax + '" y2="' + busY +
             '" stroke="' + col + '" stroke-width="4" stroke-linecap="round"/>';
      let minBX = ax, maxBX = ax;
      fam.kids.forEach((k) => {
        const kx = cx(k, pos);
        minBX = Math.min(minBX, kx); maxBX = Math.max(maxBX, kx);
        out += '<line x1="' + kx + '" y1="' + busY + '" x2="' + kx + '" y2="' + pos[k].y +
               '" stroke="' + col + '" stroke-width="4" stroke-linecap="round"/>';
      });
      out += '<line x1="' + minBX + '" y1="' + busY + '" x2="' + maxBX + '" y2="' + busY +
             '" stroke="' + col + '" stroke-width="4" stroke-linecap="round"/>';
    });

    svg.setAttribute("width", layout.width);
    svg.setAttribute("height", layout.height);
    svg.innerHTML = out;
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function render() {
    const layout = computeLayout();

    canvas.style.width = layout.width + "px";
    canvas.style.height = layout.height + "px";
    canvas.style.transform = "scale(" + zoom + ")";
    sizer.style.width = (layout.width * zoom) + "px";
    sizer.style.height = (layout.height * zoom) + "px";

    drawEdges(layout);

    canvas.querySelectorAll(".person").forEach((el) => el.remove());
    state.order.filter(alive).forEach((id) => {
      const p = P()[id];
      const at = layout.pos[id];
      if (!at) return;
      const btn = document.createElement("button");
      btn.className = "person" + (id === state.me ? " is-me" : "");
      btn.style.left = at.x + "px";
      btn.style.top = at.y + "px";
      btn.style.borderColor = genColor(p.gen);
      const rel = state.me ? relationLabel(state.me, id) : "";
      btn.innerHTML =
        (id === state.me ? '<span class="you-star">⭐</span>' : "") +
        '<span class="face">' + p.emoji + "</span>" +
        '<span class="pname">' + esc(p.name) + "</span>" +
        '<span class="rel"' + (rel ? ' style="background:' + genColor(p.gen) + '"' : "") + ">" +
        esc(rel) + "</span>";
      btn.addEventListener("click", () => openActions(id));
      canvas.appendChild(btn);
    });

    // "Who are you?" picker
    let opts = '<option value="">Who are YOU?</option>';
    state.order.filter(alive).forEach((id) => {
      opts += '<option value="' + id + '"' + (id === state.me ? " selected" : "") + ">" +
              esc(P()[id].name) + "</option>";
    });
    meSelect.innerHTML = opts;
  }

  function centerView() {
    viewport.scrollLeft = Math.max(0, (sizer.offsetWidth - viewport.clientWidth) / 2);
  }

  /* ---------- modals ---------- */

  const actionOverlay = document.getElementById("action-overlay");
  const formOverlay = document.getElementById("form-overlay");
  const confirmOverlay = document.getElementById("confirm-overlay");

  function openActions(id) {
    const p = P()[id];
    document.getElementById("action-title").textContent = p.emoji + " " + p.name;
    const rel = state.me && state.me !== id ? relationLabel(state.me, id) : "";
    document.getElementById("action-sub").textContent =
      rel ? "Your " + rel.toLowerCase() : (state.me === id ? "That's you! ⭐" : "");

    const list = document.getElementById("action-list");
    list.innerHTML = "";
    function act(label, fn) {
      const b = document.createElement("button");
      b.className = "ft-btn";
      b.textContent = label;
      b.addEventListener("click", fn);
      list.appendChild(b);
    }

    act("✏️ Change name or face", () => { closeAll(); openForm({ mode: "edit", id: id }); });
    if (p.parents.filter(alive).length < 2) {
      act("🧓 Add " + p.name + "'s mom or dad", () => { closeAll(); openForm({ mode: "parent", id: id }); });
    }
    act("❤️ Add " + p.name + "'s partner", () => { closeAll(); openForm({ mode: "partner", id: id }); });
    act("👶 Add " + p.name + "'s child", () => { closeAll(); openForm({ mode: "child", id: id }); });
    if (p.parents.filter(alive).length) {
      act("🧒 Add a brother or sister", () => { closeAll(); openForm({ mode: "sibling", id: id }); });
    }
    if (state.order.filter(alive).length > 1) {
      const b = document.createElement("button");
      b.className = "ft-btn danger";
      b.textContent = "🗑 Remove " + p.name;
      b.addEventListener("click", () => {
        closeAll();
        askConfirm("Remove " + p.name + "?",
          "They will be taken off the family tree.",
          () => {
            removePerson(id);
            persist(); render();
            window.SFX && SFX.nope();
          });
      });
      list.appendChild(b);
    }
    act("✖ Close", closeAll);
    actionOverlay.hidden = false;
  }

  /* --- add/edit form --- */
  let form = null; // {mode, id, gender, emoji, otherParent}

  const nameInput = document.getElementById("name-input");
  const genderRow = document.getElementById("gender-row");
  const emojiGrid = document.getElementById("emoji-grid");
  const otherParentField = document.getElementById("other-parent-field");
  const otherParentRow = document.getElementById("other-parent-row");

  emojiGrid.innerHTML = FACES.map((f) =>
    '<button class="chip" data-e="' + f + '">' + f + "</button>").join("");

  function markSel(row, attr, val) {
    row.querySelectorAll(".chip").forEach((c) => {
      c.classList.toggle("sel", c.getAttribute(attr) === val);
    });
  }

  genderRow.addEventListener("click", (e) => {
    const c = e.target.closest(".chip");
    if (!c || !form) return;
    form.gender = c.getAttribute("data-g");
    markSel(genderRow, "data-g", form.gender);
    // A helpful default face when one hasn't been hand-picked yet.
    if (form.mode !== "edit" && !form.pickedFace) {
      form.emoji = form.gender === "m" ? "👦" : form.gender === "f" ? "👧" : "🧑";
      if (form.mode === "parent") form.emoji = form.gender === "m" ? "👨" : form.gender === "f" ? "👩" : "🧑";
      markSel(emojiGrid, "data-e", form.emoji);
    }
  });

  emojiGrid.addEventListener("click", (e) => {
    const c = e.target.closest(".chip");
    if (!c || !form) return;
    form.emoji = c.getAttribute("data-e");
    form.pickedFace = true;
    markSel(emojiGrid, "data-e", form.emoji);
  });

  otherParentRow.addEventListener("click", (e) => {
    const c = e.target.closest(".chip");
    if (!c || !form) return;
    form.otherParent = c.getAttribute("data-p");
    markSel(otherParentRow, "data-p", form.otherParent);
  });

  function openForm(cfg) {
    const who = P()[cfg.id];
    const titles = {
      edit: "✏️ " + who.name,
      parent: "🧓 " + who.name + "'s mom or dad",
      partner: "❤️ " + who.name + "'s partner",
      child: "👶 " + who.name + "'s child",
      sibling: "🧒 " + who.name + "'s brother or sister"
    };
    document.getElementById("form-title").textContent = titles[cfg.mode];

    form = {
      mode: cfg.mode, id: cfg.id,
      gender: cfg.mode === "edit" ? who.gender : "",
      emoji: cfg.mode === "edit" ? who.emoji : "🧑",
      pickedFace: cfg.mode === "edit",
      otherParent: ""
    };
    nameInput.value = cfg.mode === "edit" ? who.name : "";
    markSel(genderRow, "data-g", form.gender);
    markSel(emojiGrid, "data-e", form.emoji);

    // Adding a child: if this person has partners, ask who the other parent is.
    const partners = who.partners.filter(alive);
    if (cfg.mode === "child" && partners.length) {
      otherParentField.hidden = false;
      otherParentRow.innerHTML = partners.map((pid) =>
        '<button class="chip" data-p="' + pid + '">' + P()[pid].emoji + " " + esc(P()[pid].name) + "</button>"
      ).join("") + '<button class="chip" data-p="">Just ' + esc(who.name) + "</button>";
      form.otherParent = partners[0];
      markSel(otherParentRow, "data-p", form.otherParent);
    } else {
      otherParentField.hidden = true;
    }

    formOverlay.hidden = false;
    setTimeout(() => nameInput.focus(), 50);
  }

  function saveForm() {
    if (!form) return;
    const name = nameInput.value.trim();
    if (!name) { nameInput.focus(); return; }
    const who = P()[form.id];

    if (form.mode === "edit") {
      who.name = name; who.gender = form.gender; who.emoji = form.emoji;
    } else if (form.mode === "parent") {
      const existing = who.parents.filter(alive);
      const newP = addPerson({
        name: name, gender: form.gender, emoji: form.emoji,
        gen: who.gen - 1, parents: [],
        partners: existing.length === 1 ? [existing[0]] : []
      });
      // The new parent also claims this person's full siblings (same single parent).
      if (existing.length === 1) {
        state.order.forEach((k) => {
          const kid = P()[k];
          if (kid.parents.indexOf(existing[0]) !== -1 && kid.parents.filter(alive).length < 2 &&
              kid.parents.indexOf(newP) === -1) {
            kid.parents.push(newP);
          }
        });
      } else {
        who.parents.push(newP);
      }
    } else if (form.mode === "partner") {
      addPerson({
        name: name, gender: form.gender, emoji: form.emoji,
        gen: who.gen, parents: [], partners: [form.id]
      });
    } else if (form.mode === "child") {
      const parents = [form.id];
      if (form.otherParent && alive(form.otherParent)) parents.push(form.otherParent);
      addPerson({
        name: name, gender: form.gender, emoji: form.emoji,
        gen: who.gen + 1, parents: parents, partners: []
      });
    } else if (form.mode === "sibling") {
      addPerson({
        name: name, gender: form.gender, emoji: form.emoji,
        gen: who.gen, parents: who.parents.filter(alive).slice(), partners: []
      });
    }

    persist();
    closeAll();
    render();
    if (form.mode === "edit") {
      window.SFX && SFX.good();
    } else {
      window.SFX && SFX.win();
      window.Confetti && Confetti.burst({ count: 60 });
    }
    form = null;
  }

  /* --- confirm --- */
  let confirmFn = null;
  function askConfirm(title, sub, fn) {
    document.getElementById("confirm-title").textContent = title;
    document.getElementById("confirm-sub").textContent = sub;
    confirmFn = fn;
    confirmOverlay.hidden = false;
  }

  function closeAll() {
    actionOverlay.hidden = true;
    formOverlay.hidden = true;
    confirmOverlay.hidden = true;
  }

  /* ---------- wire up ---------- */

  document.getElementById("form-save").addEventListener("click", saveForm);
  document.getElementById("form-cancel").addEventListener("click", () => { form = null; closeAll(); });
  nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") saveForm(); });

  document.getElementById("confirm-no").addEventListener("click", closeAll);
  document.getElementById("confirm-yes").addEventListener("click", () => {
    closeAll();
    if (confirmFn) confirmFn();
    confirmFn = null;
  });

  [actionOverlay, formOverlay, confirmOverlay].forEach((ov) => {
    ov.addEventListener("click", (e) => { if (e.target === ov) closeAll(); });
  });

  meSelect.addEventListener("change", () => {
    state.me = meSelect.value || null;
    persist();
    render();
    if (state.me) { window.SFX && SFX.good(); }
  });

  document.getElementById("zoom-in").addEventListener("click", () => {
    zoom = Math.min(1.5, Math.round((zoom + 0.15) * 100) / 100);
    render();
  });
  document.getElementById("zoom-out").addEventListener("click", () => {
    zoom = Math.max(0.4, Math.round((zoom - 0.15) * 100) / 100);
    render();
  });

  document.getElementById("reset-btn").addEventListener("click", () => {
    askConfirm("Start the tree over?",
      "Everyone you added will be removed and the tree goes back to just our family.",
      () => {
        state = seed();
        persist();
        render();
        centerView();
        window.Confetti && Confetti.burst({ count: 40 });
      });
  });

  render();
  centerView();
})();
