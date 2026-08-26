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
  let CW = 112;            // card width  — cards shrink on small screens,
  let CH = 128;            // card height — see applyCardSize() below

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
      if (s && s.people && s.order && s.order.length) return sanitize(s);
    } catch (e) { /* fall through */ }
    return seed();
  }

  // A half-written or hand-edited save must never be able to soft-lock the
  // tree, so repair it on the way in: drop links to people who aren't there,
  // make partner links mutual again, and make sure nextId is past every id
  // that already exists (a bad nextId used to mint duplicate/NaN ids).
  function sanitize(s) {
    s.people = s.people || {};
    const known = Object.keys(s.people);
    s.order = (s.order || []).filter((id) => s.people[id]);
    known.forEach((id) => { if (s.order.indexOf(id) === -1) s.order.push(id); });

    let max = 0;
    s.order.forEach((id) => {
      const n = parseInt(String(id).replace(/^p/, ""), 10);
      if (isFinite(n) && n > max) max = n;
      const p = s.people[id];
      p.parents = (p.parents || []).filter((x) => s.people[x] && x !== id);
      p.partners = (p.partners || []).filter((x) => s.people[x] && x !== id);
      p.gen = (typeof p.gen === "number" && isFinite(p.gen)) ? p.gen : 0;
      p.name = String(p.name == null || p.name === "" ? "?" : p.name);
      p.emoji = p.emoji || "🧑";
      p.gender = p.gender === "m" || p.gender === "f" ? p.gender : "";
    });
    s.order.forEach((id) => {
      s.people[id].partners.forEach((o) => {
        if (s.people[o].partners.indexOf(id) === -1) s.people[o].partners.push(id);
      });
    });
    if (typeof s.nextId !== "number" || !isFinite(s.nextId) || s.nextId <= max) s.nextId = max + 1;
    if (s.me && !s.people[s.me]) s.me = null;
    return s;
  }

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }

  let state = load();

  /* ---------- learning progress (separate key: never touches the tree) ----------
     Which relationship words this device has got right, the best streak and
     the quiz level reached. Kept apart from family-tree.v1 so an old saved
     tree keeps loading exactly as before. */

  const PROG_KEY = "family-tree.progress.v1";

  function loadProgress() {
    const d = { best: 0, level: 1, correct: 0, learned: {} };
    try {
      const s = JSON.parse(localStorage.getItem(PROG_KEY));
      if (s && typeof s === "object") {
        if (typeof s.best === "number" && s.best > 0) d.best = Math.floor(s.best);
        if (s.level >= 1 && s.level <= 3) d.level = Math.floor(s.level);
        if (typeof s.correct === "number" && s.correct > 0) d.correct = Math.floor(s.correct);
        if (s.learned && typeof s.learned === "object") {
          Object.keys(s.learned).forEach((k) => {
            const n = s.learned[k];
            if (typeof n === "number" && n > 0) d.learned[k] = Math.floor(n);
          });
        }
      }
    } catch (e) { /* fall through to fresh progress */ }
    return d;
  }

  const progress = loadProgress();

  function saveProgress() {
    try { localStorage.setItem(PROG_KEY, JSON.stringify(progress)); } catch (e) { /* private mode */ }
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  function party(count) {
    if (reduceMotion.matches) return;
    window.Confetti && Confetti.burst({ count: count });
  }

  const ZOOM_KEY = "family-tree.zoom";
  let zoom = 1;
  let zoomChosen = false;   // true once someone has used ➕ / ➖ themselves
  try {
    const z = parseFloat(localStorage.getItem(ZOOM_KEY));
    if (z >= 0.4 && z <= 1.5) { zoom = z; zoomChosen = true; }
  } catch (e) { /* fine */ }

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

  function splitUp(a, b) {
    P()[a].partners = P()[a].partners.filter((x) => x !== b);
    P()[b].partners = P()[b].partners.filter((x) => x !== a);
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

  // Former partners: people this person had a child with but isn't
  // currently partnered to (an ex they co-parent with). We infer them
  // from the kids' parents lists, since splitting up drops the partner
  // link but co-parenthood stays recorded on the children.
  function coParents(id) {
    const seen = {};
    childrenOf(id).forEach((c) => {
      P()[c].parents.filter(alive).forEach((par) => {
        if (par !== id) seen[par] = true;
      });
    });
    return Object.keys(seen);
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

  function sharedParents(a, b) {
    const pa = P()[a].parents.filter(alive);
    return P()[b].parents.filter(alive).filter((x) => pa.indexOf(x) !== -1).length;
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
    if (b) {
      // Siblings who share one parent and each have a different other
      // parent are half-siblings. (One known parent each = plain siblings.)
      if (b.u === 1 && b.d === 1 && sharedParents(me, other) === 1 &&
          P()[me].parents.filter(alive).length === 2 &&
          P()[other].parents.filter(alive).length === 2) {
        return byG(g, "Half-brother", "Half-sister", "Half-sibling");
      }
      return bloodLabel(b.u, b.d, g);
    }

    if (P()[me].partners.indexOf(other) !== -1) return byG(g, "Husband", "Wife", "Partner");

    // Step-sibling: one of their parents is partnered with one of mine.
    const myPars = P()[me].parents.filter(alive);
    const otherPars = P()[other].parents.filter(alive);
    for (let s = 0; s < otherPars.length; s++) {
      const sp = P()[otherPars[s]].partners;
      for (let t = 0; t < myPars.length; t++) {
        if (sp.indexOf(myPars[t]) !== -1) return byG(g, "Stepbrother", "Stepsister", "Step-sibling");
      }
    }

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

  /* ---------- kinship fun facts (explain the tricky words) ---------- */

  function generationsWord(n) {
    return n + " generation" + (n === 1 ? "" : "s");
  }

  function explainLabel(label) {
    const s = label.toLowerCase();
    const greatsCount = (s.match(/great-/g) || []).length;

    if (s === "you!") return "";
    if (s.indexOf("half-") === 0) return "Half siblings share ONE parent — same mom or same dad, but not both.";
    if (s.indexOf("step-grand") === 0) return "They married your grandparent, so they became your step-grandparent.";
    if (s === "stepmom" || s === "stepdad" || s === "step-parent") return "A step-parent is married to your mom or dad.";
    if (s === "stepbrother" || s === "stepsister" || s === "step-sibling") return "Step-siblings became family when their parents got together — you don't share a parent.";
    if (s === "stepson" || s === "stepdaughter" || s === "stepchild") return "Your partner's child — family through your partner.";
    if (s.indexOf("-in-law") !== -1) return "“In-law” means they joined your family by marriage.";
    if (s.indexOf("(married in)") !== -1) return "They married into your family — that's why they're your aunt or uncle!";
    if (s === "family by marriage" || s === "my partner's family") return "Not related by blood — connected through a marriage in the family.";

    if (/^(great-)*grand(ma|pa|parent)$/.test(s)) {
      if (greatsCount === 0) return "Your mom or dad's mom or dad — " + generationsWord(2) + " above you!";
      return "Your " + (greatsCount === 1 ? "grandparent's parent" : "grandparent's grandparent (or even higher)") +
             " — " + generationsWord(greatsCount + 2) + " above you!";
    }
    if (/^(great-)*grand(son|daughter|child)$/.test(s)) {
      if (greatsCount === 0) return "Your child's child — " + generationsWord(2) + " below you!";
      return "Your grandchild's " + (greatsCount === 1 ? "child" : "grandchild (or lower)") +
             " — " + generationsWord(greatsCount + 2) + " below you!";
    }
    if (/^(great-)*(nephew|niece)/.test(s)) {
      if (greatsCount === 0) return "Your brother or sister's child. That makes YOU their aunt or uncle!";
      return "Your niece or nephew's child — one more generation down each “great-”.";
    }
    if (/^(great-)*(uncle|aunt)/.test(s)) {
      if (greatsCount === 0) return "Your mom or dad's brother or sister. You are their niece or nephew!";
      return "Your grandparent's brother or sister — one more generation up each “great-”.";
    }
    if (s.indexOf("cousin") !== -1) {
      let fact = "";
      if (s.indexOf("1st cousin") === 0) fact = "1st cousins share a grandparent — your parents are siblings!";
      else if (s.indexOf("2nd cousin") === 0) fact = "2nd cousins share a great-grandparent — your parents are 1st cousins!";
      else if (s.indexOf("3rd cousin") === 0) fact = "3rd cousins share a great-great-grandparent!";
      else fact = "Far-away cousins still share one ancestor, way up the tree!";
      if (s.indexOf("once removed") !== -1) fact += " “Once removed” means you're 1 generation apart.";
      else if (s.indexOf("twice removed") !== -1) fact += " “Twice removed” means you're 2 generations apart.";
      else if (s.indexOf("removed") !== -1) fact += " “Removed” counts how many generations apart you are.";
      return fact;
    }
    if (s === "brother" || s === "sister" || s === "sibling") return "You share the same parents.";
    return "";
  }

  /* ---------- word levels & short definitions (the quiz curriculum) ----------
     Every relationship word gets a difficulty tier so the quiz can start on
     "brother" and work its way up to "2nd cousin once removed", and a short
     definition so a wrong answer can be explained in one sentence. */

  // Collapse a label into the word being learnt: Great-Great-Grandma and
  // Great-Grandma are the same badge, "3× removed" reads as "twice removed".
  function wordKey(label) {
    return String(label).toLowerCase()
      .replace(/(great-)+/, "great-")
      .replace(/\s*\d+×\s*removed/, " twice removed")
      .trim();
  }

  const LEVEL_NAMES = ["", "⭐ Level 1 · family words", "⭐⭐ Level 2 · bigger words", "⭐⭐⭐ Level 3 · tricky words"];
  const TOP_LEVEL = 3;

  function levelOf(label) {
    const s = wordKey(label);
    if (!s || s === "you!") return 0;
    if (s.indexOf("cousin") !== -1 || s.indexOf("-in-law") !== -1 || s.indexOf("removed") !== -1 ||
        s.indexOf("great-") === 0 || s.indexOf("married in") !== -1 ||
        s === "family by marriage" || s === "my partner's family" || s === "family ❤️") return 3;
    if (s.indexOf("grand") !== -1 || s.indexOf("aunt") !== -1 || s.indexOf("uncle") !== -1 ||
        s.indexOf("niece") !== -1 || s.indexOf("nephew") !== -1 ||
        s.indexOf("step") === 0 || s.indexOf("half-") === 0) return 2;
    return 1;
  }

  function removedBit(s) {
    if (s.indexOf("once removed") !== -1) return ", and “once removed” means you are 1 generation apart";
    if (s.indexOf("twice removed") !== -1) return ", and “twice removed” means you are 2 generations apart";
    return "";
  }

  // A one-line "a X is …" definition, used to explain wrong answers.
  function shortDef(label) {
    const s = wordKey(label);
    const gr = s.indexOf("great-") === 0;
    if (s === "mom" || s === "dad" || s === "parent") return "the grown-up whose child you are — one generation above you";
    if (s === "brother" || s === "sister" || s === "sibling") return "someone with the same mom and dad as you";
    if (s === "son" || s === "daughter" || s === "my child") return "your own child — one generation below you";
    if (s === "husband" || s === "wife" || s === "partner") return "the person you married";
    if (s.indexOf("half-") === 0) return "someone who shares just ONE parent with you";
    if (s.indexOf("married in") !== -1) return "someone who married your aunt or uncle";
    if (s.indexOf("-in-law") !== -1) return "family you got through a marriage, not by blood";
    if (s.indexOf("step-grand") === 0) return "the person who married your grandma or grandpa";
    if (/^step-?(mom|dad|parent)/.test(s)) return "the person who married your mom or dad";
    if (/^step(brother|sister|-sibling)/.test(s)) return "your step-parent's child — you don't share a parent";
    if (/^step(son|daughter|child)/.test(s)) return "your partner's child";
    if (/grand(ma|pa|parent)$/.test(s)) return gr ? "your grandparent's parent — one more “great-” for each extra generation up" : "your mom or dad's mom or dad";
    if (/grand(son|daughter|child)$/.test(s)) return gr ? "your grandchild's child" : "your child's child";
    if (s.indexOf("aunt") !== -1 || s.indexOf("uncle") !== -1) return gr ? "your grandparent's brother or sister" : "your mom or dad's brother or sister";
    if (s.indexOf("niece") !== -1 || s.indexOf("nephew") !== -1) return gr ? "your niece or nephew's child" : "your brother or sister's child";
    if (s.indexOf("1st cousin") === 0) return "your aunt or uncle's child" + removedBit(s);
    if (s.indexOf("2nd cousin") === 0) return "the grandchild of your great-aunt or great-uncle" + removedBit(s);
    if (s.indexOf("cousin") !== -1) return "a faraway cousin — you share one ancestor high up the tree" + removedBit(s);
    return "part of your family";
  }

  // Extra words to mix in as quiz choices when the tree itself is small.
  const WORD_BANK = {
    1: ["Mom", "Dad", "Brother", "Sister", "Son", "Daughter", "Partner"],
    2: ["Grandma", "Grandpa", "Aunt", "Uncle", "Niece", "Nephew", "Grandson", "Granddaughter", "Half-sister", "Stepdad"],
    3: ["1st cousin", "2nd cousin", "1st cousin once removed", "Great-grandma", "Great-grandpa",
        "Great-aunt", "Great-uncle", "Sister-in-law", "Brother-in-law", "Mother-in-law"]
  };

  // "aunt" → "an aunt", "brother" → "a brother"
  function withArticle(word) {
    return (/^[aeiou]/i.test(word) ? "an " : "a ") + word;
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ---------- who's who around one person ----------
     The relationship words seen from THAT person's point of view — so tapping
     Cory teaches "Cory's sister: Jeannie" even when you are playing as Ellie. */

  // "Brother-in-law" → "Brothers-in-law", "My child" → "My children", …
  function pluralLabel(label) {
    if (/-in-law$/i.test(label)) return label.replace(/-in-law$/i, "s-in-law");
    if (/child$/i.test(label)) return label.replace(/child$/i, "children");
    if (/removed$/i.test(label)) return label.replace(/cousin/i, "cousins");
    if (/(s|x|z|ch|sh)$/i.test(label)) return label + "es";
    return label + "s";
  }

  function famRank(u, d) {
    if (u === 1 && d === 0) return 0;   // parents
    if (d === 0) return 1;              // grandparents and up
    if (u === 1 && d === 1) return 3;   // siblings
    if (d === 1 && u >= 2) return 4;    // aunts / uncles
    if (u === 0 && d === 1) return 5;   // children
    if (u === 1 && d >= 2) return 6;    // nieces / nephews
    if (u === 0) return 8;              // grandchildren
    return 7;                           // cousins
  }

  function closeFamily(id) {
    const groups = {};
    const order = [];
    state.order.filter(alive).forEach((other) => {
      if (other === id) return;
      const isPartner = P()[id].partners.indexOf(other) !== -1;
      const b = bloodPath(id, other);
      let rank;
      if (isPartner) rank = 2;
      else if (b && b.u + b.d <= 4) rank = famRank(b.u, b.d);
      else return;
      const label = relationLabel(id, other);
      if (!label || label === "You!") return;
      if (!groups[label]) { groups[label] = { label: label, rank: rank, names: [] }; order.push(label); }
      groups[label].names.push(P()[other].name);
      groups[label].rank = Math.min(groups[label].rank, rank);
    });
    return order.map((l) => groups[l]).sort((a, b) => a.rank - b.rank).slice(0, 8);
  }

  /* ---------- layout ----------
     Rows = generations. Partners sit together in a "unit".
     A few barycenter sweeps pull children under their parents. */

  // Walk the partner links as a chain (ex — person — new partner) so every
  // couple ends up side by side and heart lines never cross another card.
  function orderUnit(members) {
    if (members.length < 3) return members;
    const inUnit = {};
    members.forEach((m) => { inUnit[m] = true; });
    const deg = {};
    members.forEach((m) => { deg[m] = P()[m].partners.filter((o) => inUnit[o]).length; });
    let start = members[0];
    members.forEach((m) => { if (deg[m] < deg[start]) start = m; });
    const placed = {};
    const out = [];
    let cur = start;
    while (cur) {
      out.push(cur);
      placed[cur] = true;
      cur = P()[cur].partners
        .filter((o) => inUnit[o] && !placed[o])
        .sort((a, b) => deg[a] - deg[b])[0];
    }
    members.forEach((m) => { if (!placed[m]) out.push(m); });
    return out;
  }

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
          members: orderUnit(members),
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

  function edgeMarkup(layout) {
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
        if (Math.abs(pos[a].x - pos[b].x) <= CW + PGAP + 2) {
          // side-by-side couple: straight line with a heart
          const y = pos[a].y + CH * 0.45;
          const L = Math.min(pos[a].x, pos[b].x) + CW;
          const R = Math.max(pos[a].x, pos[b].x);
          const mid = (L + R) / 2;
          out += '<line x1="' + L + '" y1="' + y + '" x2="' + R + '" y2="' + y +
                 '" stroke="#ff5d8f" stroke-width="4" stroke-linecap="round"/>';
          out += '<text x="' + mid + '" y="' + (y + 6) + '" text-anchor="middle" font-size="16">❤️</text>';
        } else {
          // other cards sit between them: arc the line over the top
          const xa = cx(a, pos), xb = cx(b, pos);
          const yTop = pos[a].y - 4;
          out += '<path d="M ' + xa + ' ' + yTop + ' Q ' + ((xa + xb) / 2) + ' ' + (yTop - 34) +
                 ' ' + xb + ' ' + yTop + '" fill="none" stroke="#ff5d8f" stroke-width="4" stroke-linecap="round"/>';
          out += '<text x="' + ((xa + xb) / 2) + '" y="' + (yTop - 14) + '" text-anchor="middle" font-size="16">❤️</text>';
        }
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
      const couple = pars.length === 2 && pos[pars[0]].y === pos[pars[1]].y &&
                     Math.abs(pos[pars[0]].x - pos[pars[1]].x) <= CW + PGAP + 2;
      const parBottom = Math.max.apply(null, pars.map((p) => pos[p].y)) + CH;
      const busY = parBottom + VGAP * 0.45 + (famIdx % 4) * 7;
      famIdx++;
      const col = genColor(P()[fam.kids[0]].gen);
      // drops from the parents down to the bus
      let drops;
      if (couple) { // one drop from the heart line between the couple
        drops = [{ x: (cx(pars[0], pos) + cx(pars[1], pos)) / 2, y: pos[pars[0]].y + CH * 0.45 }];
      } else {      // separated parents: connect each one to the shared bus
        drops = pars.map((p) => ({ x: cx(p, pos), y: pos[p].y + CH }));
      }
      let minBX = Infinity, maxBX = -Infinity;
      drops.forEach((d) => {
        minBX = Math.min(minBX, d.x); maxBX = Math.max(maxBX, d.x);
        out += '<line x1="' + d.x + '" y1="' + d.y + '" x2="' + d.x + '" y2="' + busY +
               '" stroke="' + col + '" stroke-width="4" stroke-linecap="round"/>';
      });
      fam.kids.forEach((k) => {
        const kx = cx(k, pos);
        minBX = Math.min(minBX, kx); maxBX = Math.max(maxBX, kx);
        out += '<line x1="' + kx + '" y1="' + busY + '" x2="' + kx + '" y2="' + pos[k].y +
               '" stroke="' + col + '" stroke-width="4" stroke-linecap="round"/>';
      });
      out += '<line x1="' + minBX + '" y1="' + busY + '" x2="' + maxBX + '" y2="' + busY +
             '" stroke="' + col + '" stroke-width="4" stroke-linecap="round"/>';
    });

    return out;
  }

  function drawEdges(layout) {
    svg.setAttribute("width", layout.width);
    svg.setAttribute("height", layout.height);
    svg.innerHTML = edgeMarkup(layout);
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  let lastLayout = { pos: {}, rows: [], width: 0, height: 0 };

  function render() {
    const layout = computeLayout();
    lastLayout = layout;

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
      btn.dataset.id = id;
      btn.style.left = at.x + "px";
      btn.style.top = at.y + "px";
      btn.style.borderColor = genColor(p.gen);
      const rel = state.me ? relationLabel(state.me, id) : "";
      btn.setAttribute("aria-label",
        p.name + (id === state.me ? " — this is you" : rel ? " — your " + rel.toLowerCase() : ""));
      btn.innerHTML =
        (id === state.me ? '<span class="you-star" aria-hidden="true">⭐</span>' : "") +
        '<span class="face" aria-hidden="true">' + p.emoji + "</span>" +
        '<span class="pname">' + esc(p.name) + "</span>" +
        '<span class="rel"' + (rel ? ' style="background:' + genColor(p.gen) + '"' : "") + ">" +
        esc(rel) + "</span>";
      btn.addEventListener("click", () => { if (quiz.on) quizGuess(id); else openActions(id); });
      canvas.appendChild(btn);
    });

    // "Who are you?" picker
    let opts = '<option value="">Who are YOU?</option>';
    state.order.filter(alive).forEach((id) => {
      opts += '<option value="' + id + '"' + (id === state.me ? " selected" : "") + ">" +
              esc(P()[id].name) + "</option>";
    });
    meSelect.innerHTML = opts;

    // little stats line: how big has the tree grown?
    const n = state.order.filter(alive).length;
    const genCount = layout.rows.length;
    document.getElementById("stats-text").textContent =
      "🌳 " + n + " people across " + generationsWord(genCount);
    updateBadgeCount();
  }

  function updateBadgeCount() {
    document.getElementById("badge-count").textContent =
      String(Object.keys(progress.learned).length);
  }

  function centerView() {
    viewport.scrollLeft = Math.max(0, (sizer.offsetWidth - viewport.clientWidth) / 2);
  }

  // Scroll to a person's card and give it a friendly golden pulse.
  function spotlight(id) {
    const el = canvas.querySelector('.person[data-id="' + id + '"]');
    if (!el) return;
    const x = sizer.offsetLeft + (parseFloat(el.style.left) + CW / 2) * zoom;
    const y = (parseFloat(el.style.top) + CH / 2) * zoom;
    try {
      viewport.scrollTo({
        left: x - viewport.clientWidth / 2,
        top: y - viewport.clientHeight / 2,
        behavior: reduceMotion.matches ? "auto" : "smooth"
      });
    } catch (e) {
      viewport.scrollLeft = x - viewport.clientWidth / 2;
      viewport.scrollTop = y - viewport.clientHeight / 2;
    }
    el.classList.add("flash");
    setTimeout(() => el.classList.remove("flash"), 1700);
  }

  /* ---------- undo (one step, for the scary buttons) ---------- */

  const snackbar = document.getElementById("snackbar");
  const snackText = document.getElementById("snack-text");
  let undoSnap = null, undoTimer = null;

  function showUndo(msg, snap) {
    undoSnap = snap;
    snackText.textContent = msg;
    snackbar.hidden = false;
    clearTimeout(undoTimer);
    undoTimer = setTimeout(hideUndo, 8000);
  }
  function hideUndo() {
    snackbar.hidden = true;
    undoSnap = null;
    clearTimeout(undoTimer);
  }
  document.getElementById("snack-undo").addEventListener("click", () => {
    if (!undoSnap) return hideUndo();
    try { state = JSON.parse(undoSnap); } catch (e) { return hideUndo(); }
    hideUndo();
    persist();
    render();
    window.SFX && SFX.good();
  });

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
    const factEl = document.getElementById("action-fact");
    const fact = rel ? explainLabel(rel) : "";
    factEl.textContent = fact ? "💡 " + fact : "";
    factEl.hidden = !fact;

    // Who's who around this person, in their own words.
    const famEl = document.getElementById("action-family");
    const fam = closeFamily(id);
    if (fam.length) {
      famEl.innerHTML = "<h3>" + esc(p.name) + "'s family</h3>" + fam.map((row) =>
        '<div class="fam-row"><span class="fam-label">' +
        esc(row.names.length > 1 ? pluralLabel(row.label) : row.label) +
        ":</span> " + esc(row.names.join(", ")) + "</div>"
      ).join("");
      famEl.hidden = false;
    } else {
      famEl.innerHTML = "";
      famEl.hidden = true;
    }

    const list = document.getElementById("action-list");
    list.innerHTML = "";
    function act(label, fn) {
      const b = document.createElement("button");
      b.className = "ft-btn";
      b.textContent = label;
      b.addEventListener("click", fn);
      list.appendChild(b);
    }

    if (state.me !== id) {
      act("⭐ This is me! (show words from " + p.name + "'s side)", () => { closeAll(); setMe(id); });
    }
    act("✏️ Change name or face", () => { closeAll(); openForm({ mode: "edit", id: id }); });
    const pars = p.parents.filter(alive);
    if (pars.length === 0) {
      act("🧓 Add " + p.name + "'s mom or dad", () => { closeAll(); openForm({ mode: "parent", id: id, together: "no" }); });
    } else if (pars.length === 1) {
      const first = P()[pars[0]];
      // One partner at a time: "together" is only possible if the first
      // parent isn't already with someone else.
      if (!first.partners.filter(alive).length) {
        act("❤️ Add " + p.name + "'s other parent (with " + first.name + ")",
          () => { closeAll(); openForm({ mode: "parent", id: id, together: "yes" }); });
      }
      act("💔 Add " + p.name + "'s other parent (not with " + first.name + ")",
        () => { closeAll(); openForm({ mode: "parent", id: id, together: "no" }); });
    }
    if (!p.partners.filter(alive).length) {
      act("❤️ Add " + p.name + "'s partner", () => { closeAll(); openForm({ mode: "partner", id: id }); });
    }
    p.partners.filter(alive).forEach((pt) => {
      act("💔 Split up from " + P()[pt].name, () => {
        closeAll();
        askConfirm("Split up " + p.name + " and " + P()[pt].name + "?",
          "They both stay on the tree and stay mom or dad to their kids — they just won't be partners any more.",
          () => {
            const snap = JSON.stringify(state);
            splitUp(id, pt);
            persist(); render();
            showUndo("💔 " + p.name + " and " + P()[pt].name + " split up", snap);
            window.SFX && SFX.nope();
          });
      });
    });
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
            const snap = JSON.stringify(state);
            removePerson(id);
            persist(); render();
            showUndo("🗑 Removed " + p.name, snap);
            window.SFX && SFX.nope();
          });
      });
      list.appendChild(b);
    }
    act("✖ Close", closeAll);
    lastFocus = document.activeElement;
    actionOverlay.hidden = false;
    const first = list.querySelector(".ft-btn");
    if (first) first.focus();
  }

  /* --- add/edit form --- */
  let form = null; // {mode, id, gender, emoji, otherParent, together}

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
      otherParent: "", together: cfg.together || "no"
    };
    nameInput.value = cfg.mode === "edit" ? who.name : "";
    markSel(genderRow, "data-g", form.gender);
    markSel(emojiGrid, "data-e", form.emoji);

    // Adding a child: ask who the other parent is — only a current
    // partner, or a former partner they already co-parent a child with
    // (an ex). No one else in the generation is a valid other parent.
    if (cfg.mode === "child") {
      const partners = who.partners.filter(alive);
      const exes = coParents(cfg.id).filter((o) =>
        partners.indexOf(o) === -1);
      const options = partners.concat(exes);
      if (options.length) {
        otherParentField.hidden = false;
        otherParentRow.innerHTML = options.map((pid) =>
          '<button class="chip" data-p="' + pid + '">' + P()[pid].emoji + " " + esc(P()[pid].name) + "</button>"
        ).join("") + '<button class="chip" data-p="">Just ' + esc(who.name) + "</button>";
        form.otherParent = partners.length ? partners[0] : "";
        markSel(otherParentRow, "data-p", form.otherParent);
      } else {
        otherParentField.hidden = true;
      }
    } else {
      otherParentField.hidden = true;
    }

    lastFocus = document.activeElement;
    formOverlay.hidden = false;
    setTimeout(() => nameInput.focus(), 50);
  }

  function saveForm() {
    if (!form) return;
    const name = nameInput.value.trim();
    if (!name) { nameInput.focus(); return; }
    const who = P()[form.id];
    const mode = form.mode;       // closeAll() clears `form`, so keep what we need
    let focusId = form.id;        // the card to scroll to afterwards

    if (form.mode === "edit") {
      who.name = name; who.gender = form.gender; who.emoji = form.emoji;
    } else if (form.mode === "parent") {
      const existing = who.parents.filter(alive);
      const together = existing.length === 1 && form.together === "yes";
      const newP = addPerson({
        name: name, gender: form.gender, emoji: form.emoji,
        gen: who.gen - 1, parents: [],
        partners: together ? [existing[0]] : []
      });
      if (together) {
        // The new parent also claims this person's full siblings (same single parent).
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
      focusId = newP;
    } else if (form.mode === "partner") {
      focusId = addPerson({
        name: name, gender: form.gender, emoji: form.emoji,
        gen: who.gen, parents: [], partners: [form.id]
      });
    } else if (form.mode === "child") {
      const parents = [form.id];
      if (form.otherParent && alive(form.otherParent)) parents.push(form.otherParent);
      focusId = addPerson({
        name: name, gender: form.gender, emoji: form.emoji,
        gen: who.gen + 1, parents: parents, partners: []
      });
    } else if (form.mode === "sibling") {
      focusId = addPerson({
        name: name, gender: form.gender, emoji: form.emoji,
        gen: who.gen, parents: who.parents.filter(alive).slice(), partners: []
      });
    }

    persist();
    closeAll();
    render();
    spotlight(focusId);
    if (mode === "edit") {
      window.SFX && SFX.good();
    } else {
      window.SFX && SFX.win();
      party(60);
    }
  }

  /* --- confirm --- */
  let confirmFn = null;
  function askConfirm(title, sub, fn) {
    document.getElementById("confirm-title").textContent = title;
    document.getElementById("confirm-sub").textContent = sub;
    confirmFn = fn;
    lastFocus = document.activeElement;
    confirmOverlay.hidden = false;
    document.getElementById("confirm-yes").focus();
  }

  // Closing any sheet also drops the half-filled form and hands keyboard
  // focus back to whatever opened it.
  let lastFocus = null;
  function closeAll() {
    const wasOpen = !actionOverlay.hidden || !formOverlay.hidden ||
                    !confirmOverlay.hidden || !badgeOverlay.hidden;
    actionOverlay.hidden = true;
    formOverlay.hidden = true;
    confirmOverlay.hidden = true;
    badgeOverlay.hidden = true;
    form = null;
    if (wasOpen && lastFocus && document.body.contains(lastFocus)) {
      try { lastFocus.focus(); } catch (e) { /* element went away */ }
    }
    lastFocus = null;
  }

  /* ---------- family-words quiz ----------
     Three question shapes, all built from the same relationship labels the
     cards already show:
       • tap    — "Find your grandma — tap them on the tree!"        (any level)
       • name   — "What is Cory to you?" + four word buttons         (any level)
       • riddle — "Tap the person who is your mom or dad's brother"  (level 2+)
     Words are tiered by levelOf(): level 1 is mom/dad/brother/sister, level 2
     grandma/aunt/niece/step/half, level 3 cousins, in-laws and great-s. Five
     right in a row unlocks the next level. Every wrong answer is explained
     ("Cory is your brother — a cousin is your aunt or uncle's child"), and
     every word you get right is saved so the badges keep filling up. */

  const quiz = { on: false, mode: "", label: "", target: null, lvl: 1, streak: 0, locked: false, qHTML: "" };
  const quizBar = document.getElementById("quiz-bar");
  const quizQ = document.getElementById("quiz-q");
  const quizScore = document.getElementById("quiz-score");
  const quizLevelEl = document.getElementById("quiz-level");
  const quizChoices = document.getElementById("quiz-choices");
  let quizTimer = null;

  function quizCandidates(lvl) {
    if (!state.me || !alive(state.me)) return [];
    return state.order.filter(alive).filter((id) => {
      if (id === state.me) return false;
      const l = relationLabel(state.me, id);
      if (!l || l === "You!" || l === "Family ❤️") return false;
      return lvl == null || levelOf(l) === lvl;
    });
  }

  function showQuizScore() {
    quizScore.hidden = quiz.streak === 0 && progress.best === 0;
    quizScore.textContent = "⭐ " + quiz.streak + " in a row" +
      (progress.best > 0 ? " · best " + progress.best : "");
    quizLevelEl.textContent = LEVEL_NAMES[quiz.lvl] || LEVEL_NAMES[1];
  }

  function clearChoices() {
    quizChoices.hidden = true;
    quizChoices.innerHTML = "";
  }

  function buildChoices(correct) {
    const bank = {};
    quizCandidates(null).forEach((id) => {
      const l = relationLabel(state.me, id);
      if (l && l !== "You!") bank[l] = true;
    });
    (WORD_BANK[quiz.lvl] || []).forEach((w) => { bank[w] = true; });
    const others = shuffle(Object.keys(bank).filter((w) => wordKey(w) !== wordKey(correct)));
    return shuffle([correct].concat(others.slice(0, 3)));
  }

  function renderChoices(words) {
    quizChoices.innerHTML = "";
    words.forEach((w) => {
      const b = document.createElement("button");
      b.className = "ft-btn";
      b.textContent = w;
      b.addEventListener("click", () => quizChoose(w, b));
      quizChoices.appendChild(b);
    });
    quizChoices.hidden = false;
  }

  function askQ(html) { quiz.qHTML = html; quizQ.innerHTML = html; }

  function nextQuizQuestion() {
    clearTimeout(quizTimer);
    quiz.locked = false;
    clearChoices();

    // Start from the saved level, then step down (wrapping round) until we
    // find words this particular tree actually contains.
    let lvl = progress.level, pool = quizCandidates(lvl);
    for (let i = 0; i < TOP_LEVEL && !pool.length; i++) {
      lvl = lvl > 1 ? lvl - 1 : TOP_LEVEL;
      pool = quizCandidates(lvl);
    }
    if (!pool.length) {
      quiz.label = "";
      quiz.lvl = progress.level;
      quizQ.textContent = "Add more family to the tree first, then quiz me again! 🌳";
      showQuizScore();
      return;
    }
    quiz.lvl = lvl;

    const pick = pool[Math.floor(Math.random() * pool.length)];
    quiz.target = pick;
    quiz.label = relationLabel(state.me, pick);

    const modes = ["tap", "name"];
    // A riddle only works when the word has a real definition to give away.
    if (lvl >= 2 && shortDef(quiz.label) !== "part of your family") modes.push("riddle");
    quiz.mode = modes[Math.floor(Math.random() * modes.length)];

    if (quiz.mode === "name") {
      askQ("What is <b>" + esc(P()[pick].name) + "</b> to you? Pick the right word 👇");
      renderChoices(buildChoices(quiz.label));
    } else if (quiz.mode === "riddle") {
      askQ("Tap the person who is <u>" + esc(shortDef(quiz.label)) + "</u>.");
    } else {
      askQ("Find your <u>" + esc(quiz.label.toLowerCase()) + "</u> — tap them on the tree!");
    }
    showQuizScore();
  }

  function startQuiz() {
    if (!state.me || !alive(state.me)) {
      quiz.on = false;
      quiz.label = "";
      clearChoices();
      quizBar.hidden = false;
      quizLevelEl.textContent = LEVEL_NAMES[progress.level];
      quizQ.textContent = "First pick who YOU are up top ⭐ — then I can quiz you!";
      quizScore.hidden = true;
      meSelect.focus();
      return;
    }
    quiz.on = true;
    quiz.streak = 0;
    quizBar.hidden = false;
    nextQuizQuestion();
    window.SFX && SFX.good();
  }

  function stopQuiz() {
    clearTimeout(quizTimer);
    quiz.on = false;
    quiz.label = "";
    quiz.locked = false;
    clearChoices();
    quizBar.hidden = true;
  }

  function flashCard(el) {
    if (!el) return;
    el.classList.add("flash");
    setTimeout(() => el.classList.remove("flash"), 1400);
  }

  // A right answer: bank the word, bump the streak, maybe level up.
  function quizWin(name, label) {
    quiz.locked = true;
    quiz.streak++;
    progress.correct++;
    const key = wordKey(label);
    progress.learned[key] = (progress.learned[key] || 0) + 1;
    if (quiz.streak > progress.best) progress.best = quiz.streak;

    let levelledUp = false;
    if (quiz.streak % 5 === 0 && progress.level < TOP_LEVEL &&
        quizCandidates(progress.level + 1).length) {
      progress.level++;
      levelledUp = true;
    }
    saveProgress();
    updateBadgeCount();

    const fact = explainLabel(label);
    let msg = "Yes! " + name + " is your " + label.toLowerCase() + "! 🎉" + (fact ? " " + fact : "");
    if (progress.learned[key] === 3) msg += " 🏅 Badge unlocked — you know the word “" + label.toLowerCase() + "”!";
    if (levelledUp) msg += " 🚀 Level up: " + LEVEL_NAMES[progress.level].replace(/^[⭐\s]+/, "") + "!";
    quizQ.textContent = msg;
    showQuizScore();

    if (levelledUp || quiz.streak % 5 === 0) { window.SFX && SFX.win(); party(80); }
    else { window.SFX && SFX.good(); party(25); }
    quizTimer = setTimeout(() => { if (quiz.on) nextQuizQuestion(); }, 2300);
  }

  // Tapping a card on the tree.
  function quizGuess(id) {
    if (!quiz.label) { stopQuiz(); return; }
    if (quiz.locked) return;
    if (quiz.mode === "name") {
      quizQ.innerHTML = quiz.qHTML + "<br>👇 Pick one of the words below!";
      window.SFX && SFX.nope();
      return;
    }
    const el = canvas.querySelector('.person[data-id="' + id + '"]');
    const label = relationLabel(state.me, id);
    // A riddle describes the relationship, so a grandpa answers a
    // "your mom or dad's mom or dad" riddle just as well as a grandma.
    const right = quiz.mode === "riddle"
      ? !!label && shortDef(label) === shortDef(quiz.label)
      : label === quiz.label;

    if (right) {
      flashCard(el);
      quizWin(P()[id].name, label);
      return;
    }

    quiz.streak = 0;
    showQuizScore();
    if (el && !reduceMotion.matches) {
      el.classList.add("quiz-wrong");
      setTimeout(() => el.classList.remove("quiz-wrong"), 500);
    }
    const target = quiz.label.toLowerCase();
    const why = label
      ? P()[id].name + " is your " + label.toLowerCase() + " — " + withArticle(target) + " is " + shortDef(quiz.label) + "."
      : capFirst(withArticle(target)) + " is " + shortDef(quiz.label) + ".";
    quizQ.textContent = "Not quite. " + why + " Try again!";
    window.SFX && SFX.nope();
  }

  // Tapping a word button in "name" mode.
  function quizChoose(word, btn) {
    if (quiz.locked || !quiz.label) return;
    const name = alive(quiz.target) ? P()[quiz.target].name : "They";
    if (wordKey(word) === wordKey(quiz.label)) {
      btn.classList.add("right");
      flashCard(canvas.querySelector('.person[data-id="' + quiz.target + '"]'));
      quizWin(name, quiz.label);
      return;
    }
    quiz.locked = true;
    quiz.streak = 0;
    showQuizScore();
    btn.classList.add("wrong");
    Array.prototype.forEach.call(quizChoices.children, (b) => {
      if (wordKey(b.textContent) === wordKey(quiz.label)) b.classList.add("right");
    });
    quizQ.textContent = "Not quite — " + withArticle(word.toLowerCase()) + " is " + shortDef(word) + ". " +
      name + " is your " + quiz.label.toLowerCase() + ": " + shortDef(quiz.label) + ".";
    window.SFX && SFX.nope();
    quizTimer = setTimeout(() => { if (quiz.on) nextQuizQuestion(); }, 3800);
  }

  document.getElementById("quiz-btn").addEventListener("click", startQuiz);
  document.getElementById("quiz-stop").addEventListener("click", stopQuiz);

  /* ---------- word badges ---------- */

  const badgeOverlay = document.getElementById("badge-overlay");

  function capFirst(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function openBadges() {
    const words = Object.keys(progress.learned).sort((a, b) =>
      (progress.learned[b] - progress.learned[a]) || a.localeCompare(b));
    const mastered = words.filter((w) => progress.learned[w] >= 3).length;
    document.getElementById("badge-sub").textContent = words.length
      ? words.length + " word" + (words.length === 1 ? "" : "s") + " practised · " +
        mastered + " mastered 🏅 · best streak ⭐ " + progress.best
      : "Play 🎯 Quiz me! — every family word you get right lands here.";

    const list = document.getElementById("badge-list");
    list.innerHTML = words.length
      ? words.map((w) => {
          const n = progress.learned[w];
          const stars = n >= 3 ? "🏅" : new Array(Math.min(n, 3) + 1).join("⭐");
          return '<div class="badge-item' + (n >= 3 ? " master" : "") + '">' +
            "<span>" + esc(capFirst(w)) + "</span>" +
            '<span class="stars">' + stars + "</span>" +
            '<span class="def">' + esc(shortDef(w)) + "</span></div>";
        }).join("")
      : '<p class="badge-empty">No words yet — the quiz is waiting! 🎯</p>';

    lastFocus = document.activeElement;
    badgeOverlay.hidden = false;
    document.getElementById("badge-close").focus();
  }

  document.getElementById("badge-btn").addEventListener("click", openBadges);
  document.getElementById("badge-close").addEventListener("click", closeAll);

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

  function setMe(id) {
    state.me = id && alive(id) ? id : null;
    persist();
    render();
    if (quiz.on || !quizBar.hidden) {
      if (state.me) startQuiz(); else stopQuiz();  // re-ask for the new "me"
    }
    if (state.me) { spotlight(state.me); window.SFX && SFX.good(); }
  }

  meSelect.addEventListener("change", () => setMe(meSelect.value || null));

  function setZoom(z) {
    zoom = Math.min(1.5, Math.max(0.4, Math.round(z * 100) / 100));
    zoomChosen = true;
    try { localStorage.setItem(ZOOM_KEY, String(zoom)); } catch (e) { /* fine */ }
    render();
  }

  // On a phone the tree is usually wider than the screen, so until someone
  // picks a zoom themselves we shrink it just enough to see the whole family.
  function fitZoom() {
    if (zoomChosen) return false;
    const w = computeLayout().width;
    const avail = viewport.clientWidth - 10;
    if (!(w > 0) || !(avail > 0)) return false;
    const z = Math.min(1, Math.max(0.65, Math.round((avail / w) * 100) / 100));
    if (Math.abs(z - zoom) < 0.02) return false;
    zoom = z;
    return true;
  }
  document.getElementById("zoom-in").addEventListener("click", () => setZoom(zoom + 0.15));
  document.getElementById("zoom-out").addEventListener("click", () => setZoom(zoom - 0.15));

  // Ctrl + mouse wheel (or trackpad pinch) zooms the tree too.
  viewport.addEventListener("wheel", (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    setZoom(zoom + (e.deltaY < 0 ? 0.1 : -0.1));
  }, { passive: false });

  // Escape backs out of any open sheet.
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAll();
  });

  /* ---------- keyboard: walk the tree with the arrow keys ----------
     Tab already reaches every card (they are real buttons); the arrows let
     you move the way the tree looks — left/right along a generation,
     up to parents, down to children. */
  canvas.addEventListener("keydown", (e) => {
    const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const d = dirs[e.key];
    if (!d) return;
    const cur = e.target && e.target.closest ? e.target.closest(".person") : null;
    if (!cur) return;
    const from = lastLayout.pos[cur.dataset.id];
    if (!from) return;
    e.preventDefault();

    let best = null, bestScore = Infinity;
    state.order.filter(alive).forEach((id) => {
      if (id === cur.dataset.id) return;
      const at = lastLayout.pos[id];
      if (!at) return;
      const dx = at.x - from.x, dy = at.y - from.y;
      const along  = dx * d[0] + dy * d[1];            // distance in the arrow's direction
      const across = Math.abs(dx * d[1] + dy * d[0]);  // how far off to the side
      if (along <= 4) return;
      const score = along + across * 2.5;
      if (score < bestScore) { bestScore = score; best = id; }
    });
    if (!best) return;
    const el = canvas.querySelector('.person[data-id="' + best + '"]');
    if (el) el.focus();
  });

  /* ---------- print ----------
     Re-lay the tree out at full card size, scale it to fit the paper and
     split it into page-sized pieces. Small trees fit one sheet; a huge
     family becomes a multi-sheet poster, cut only in the gap between
     generations (never through a card) with dashed tape-together edges. */

  const printArea = document.getElementById("print-area");

  // Conservative printable size in CSS px (fits US Letter and A4 at 10mm margins).
  const PAGE = {
    landscape: { w: 960, h: 680 },
    portrait: { w: 720, h: 920 }
  };
  const HEADER_H = 92;      // title block on the first sheet
  const FIT_MIN = 0.5;      // below this, one sheet wide is unreadably tiny…
  const POSTER_SCALE = 0.75; // …so tile sheets at this comfy scale instead

  function ensurePrintPageStyle() {
    let el = document.getElementById("print-page-style");
    if (!el) {
      el = document.createElement("style");
      el.id = "print-page-style";
      document.head.appendChild(el);
    }
    return el;
  }

  function buildPrint() {
    // Layout at full card size no matter what the screen is doing.
    const ow = CW, oh = CH;
    CW = 112; CH = 128;
    const layout = computeLayout();

    const cards = state.order.filter(alive).map((id) => {
      const p = P()[id];
      const at = layout.pos[id];
      if (!at) return "";
      const rel = state.me ? relationLabel(state.me, id) : "";
      return '<div class="person' + (id === state.me ? " is-me" : "") +
        '" style="left:' + at.x + "px;top:" + at.y + "px;border-color:" + genColor(p.gen) + '">' +
        (id === state.me ? '<span class="you-star">⭐</span>' : "") +
        '<span class="face">' + p.emoji + "</span>" +
        '<span class="pname">' + esc(p.name) + "</span>" +
        '<span class="rel"' + (rel ? ' style="background:' + genColor(p.gen) + '"' : "") + ">" +
        esc(rel) + "</span></div>";
    }).join("");

    const treeHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + layout.width + '" height="' + layout.height +
      '" style="position:absolute;top:0;left:0">' + edgeMarkup(layout) + "</svg>" + cards;

    // Trees are usually wide, so lie the paper down when the tree is.
    const landscape = layout.width >= layout.height;
    const page = landscape ? PAGE.landscape : PAGE.portrait;
    ensurePrintPageStyle().textContent =
      "@page { size: " + (landscape ? "landscape" : "portrait") + "; margin: 10mm; }";

    // Scale to fit one sheet wide, or tile sheets sideways for huge trees.
    let scale = Math.min(1, page.w / layout.width);
    let cols = 1;
    if (scale < FIT_MIN) {
      cols = Math.ceil(layout.width * POSTER_SCALE / page.w);
      scale = Math.min(0.9, cols * page.w / layout.width); // grow into the last sheet
    }

    // Safe horizontal cut lines: late in the gap between generations, past
    // the sibling bus lines (busY ≤ VGAP*0.45 + stagger below the parents)
    // so only the vertical drops to the kids cross a sheet edge.
    const cutPoints = layout.rows.slice(1).map((row) =>
      MARGIN + row.idx * (CH + VGAP) - VGAP * 0.2
    ).concat([layout.height]);

    // Greedily group generations into page-height slices.
    const groups = [];
    let top = 0, k = 0;
    while (top < layout.height - 1) {
      const budget = (groups.length === 0 ? page.h - HEADER_H : page.h) / scale;
      let end = top;
      while (k < cutPoints.length && cutPoints[k] - top <= budget) { end = cutPoints[k]; k++; }
      if (end === top) end = Math.min(layout.height, top + budget); // fallback: never loop
      groups.push({ top: top, h: end - top });
      top = end;
    }

    CW = ow; CH = oh;

    const total = groups.length * cols;
    const n = state.order.filter(alive).length;
    let sub = n + " people strong · " +
      new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    if (total > 1) sub += " · ✂️ " + total + " sheets — tape them together to make a giant poster!";

    let html = "";
    let piece = 0;
    groups.forEach((g, gi) => {
      for (let c = 0; c < cols; c++) {
        piece++;
        const w = Math.min(page.w, Math.ceil(layout.width * scale) - c * page.w);
        const clipCls = "print-clip" +
          (c > 0 ? " cut-l" : "") + (c < cols - 1 ? " cut-r" : "") +
          (gi > 0 ? " cut-t" : "") + (gi < groups.length - 1 ? " cut-b" : "");
        html += '<div class="print-page' + (piece === total ? " last" : "") +
          (total === 1 ? " solo" : "") + '">';
        if (gi === 0 && c === 0) {
          html += '<div class="print-header"><h1>🌳 Our Family Tree</h1><p>' + esc(sub) + "</p></div>";
        }
        html += '<div class="' + clipCls + '" style="width:' + w + "px;height:" + Math.ceil(g.h * scale) + 'px">' +
          '<div class="print-canvas" style="width:' + layout.width + "px;height:" + layout.height +
          "px;transform:scale(" + scale + ");left:" + (-c * page.w) + "px;top:" + (-g.top * scale) + 'px">' +
          treeHTML + "</div></div>";
        if (total > 1) html += '<div class="print-footer">🌳 Our Family Tree · sheet ' + piece + " of " + total + "</div>";
        html += "</div>";
      }
    });
    printArea.innerHTML = html;
  }

  document.getElementById("print-btn").addEventListener("click", () => {
    buildPrint();
    window.print();
  });
  // Ctrl/Cmd+P without the button still gets the nice layout.
  window.addEventListener("beforeprint", buildPrint);
  window.addEventListener("afterprint", () => { printArea.innerHTML = ""; });

  document.getElementById("reset-btn").addEventListener("click", () => {
    askConfirm("Start the tree over?",
      "Everyone you added will be removed and the tree goes back to just our family.",
      () => {
        const snap = JSON.stringify(state);
        state = seed();
        stopQuiz();
        persist();
        render();
        centerView();
        showUndo("🔄 Started the tree over", snap);
        party(40);
      });
  });

  // The @media rule in index.html shrinks cards to 96×118 on small
  // screens — keep the layout maths in sync or the partner lines and
  // hearts miss the cards.
  const smallScreen = window.matchMedia("(max-width: 480px)");
  function applyCardSize() {
    CW = smallScreen.matches ? 96 : 112;
    CH = smallScreen.matches ? 118 : 128;
  }
  const onScreenChange = () => { applyCardSize(); fitZoom(); render(); centerView(); };
  if (smallScreen.addEventListener) smallScreen.addEventListener("change", onScreenChange);
  else if (smallScreen.addListener) smallScreen.addListener(onScreenChange);
  applyCardSize();

  // Re-fit when the window changes shape (rotate a tablet, resize a laptop).
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (fitZoom()) { render(); centerView(); }
    }, 200);
  });

  fitZoom();
  render();
  centerView();
})();
