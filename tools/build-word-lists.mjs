#!/usr/bin/env node
/* ===========================================================
   build-word-lists.mjs — top up Word Bridge's answer lists.
   -----------------------------------------------------------
   Word Bridge must never turn down a real answer, and no one can
   remember every fruit, bird or country. So the obvious answers
   are written by hand in games/word-bridge/data.js and the long
   tail is sourced here from reference data:

     • WordNet — walk "is a kind of" DOWNWARDS from a seed word.
       Every hyponym of "edible fruit" is a fruit, every hyponym
       of "musical instrument" is an instrument, and so on. That
       is exactly the question the game asks.
     • world-countries — every country name.
     • minecraft-data — the real mob list, minus the entities
       that aren't mobs (arrows, boats, item frames…).
     • wordlist-english — frequency-graded English. WordNet knows
       "leporid" and "ern" are animals; no child will ever type
       them, so single words must also appear in the common ~74k
       to survive. That keeps AXOLOTL and NARWHAL and drops the
       zoology-textbook tail.

   On the way in it throws out scientific names ("Abramis brama"
   — WordNet capitalises them, which is the tell), people's names,
   and anything unsuitable for a six-year-old (see BLOCK).

   This runs at AUTHORING time only. The game ships as plain
   files with no dependencies and fetches nothing.

   Usage — the three data packages are not repo dependencies, so
   install them in a scratch folder and point node at it:

       mkdir -p /tmp/wb && cd /tmp/wb && npm init -y
       npm i wordnet-db world-countries minecraft-data wordlist-english
       cd /path/to/repo && NODE_PATH=/tmp/wb/node_modules \
         node tools/build-word-lists.mjs

   It rewrites games/word-bridge/data.js in place, keeping every
   hand-written answer, question and picture. Re-running when
   nothing has changed is a no-op.
   =========================================================== */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "games/word-bridge/data.js");

/* ---------- WordNet: every word "that is a kind of" the seed ---------- */
const DICT = join(require.resolve("wordnet-db"), "..", "dict");
const byOffset = new Map();
for (const line of readFileSync(join(DICT, "data.noun"), "latin1").split("\n")) {
  if (line && !line.startsWith("  ")) byOffset.set(line.slice(0, 8), line);
}
const senses = new Map();
for (const line of readFileSync(join(DICT, "index.noun"), "latin1").split("\n")) {
  if (!line || line.startsWith("  ")) continue;
  const p = line.trim().split(/\s+/);        // NB: these lines have trailing spaces
  senses.set(p[0], p.slice(-Number(p[2])));  // the trailing offsets are the senses
}

function synset(line) {
  const p = line.split(" | ")[0].trim().split(/\s+/);
  const words = [], hypo = [];
  const wCnt = parseInt(p[3], 16);
  for (let i = 0; i < wCnt; i++) words.push(p[4 + i * 2]);
  let k = 4 + wCnt * 2;
  const pCnt = Number(p[k++]);
  for (let i = 0; i < pCnt; i++, k += 4) {
    if (p[k] === "~" || p[k] === "~i") hypo.push(p[k + 1]);
  }
  return { words, hypo };
}

function hyponyms(lemma, sense = 0, maxDepth = 12) {
  const offsets = senses.get(lemma.toLowerCase().replace(/ /g, "_"));
  if (!offsets) { console.error("  ! no synset for", lemma); return []; }
  const seen = new Set(), out = [];
  (function walk(off, depth) {
    if (seen.has(off) || depth > maxDepth) return;
    seen.add(off);
    const line = byOffset.get(off);
    if (!line) return;
    const s = synset(line);
    out.push(...s.words);
    s.hypo.forEach((h) => walk(h, depth + 1));
  })(offsets[Math.min(sense, offsets.length - 1)], 0);
  return out;
}

/* ---------- what a six-year-old should never be handed ---------- */
const BLOCK = new Set([
  "ale","lager","beer","stout","porter","shandy","wine","merlot","chardonnay","riesling",
  "champagne","prosecco","sherry","vermouth","brandy","cognac","armagnac","whisky","whiskey",
  "bourbon","scotch","vodka","gin","rum","tequila","mezcal","sake","soju","arak","raki","ouzo",
  "absinthe","absinth","schnapps","liqueur","kirsch","grappa","pisco","calvados","mead","grog",
  "toddy","julep","martini","cocktail","sangria","mojito","daiquiri","margarita","mimosa",
  "bellini","negroni","highball","nightcap","booze","hooch","moonshine","spirits","bitters",
  "gimlet","sidecar","claret","chianti","rioja","shiraz","zinfandel","pinot","cabernet",
  "sauvignon","aperitif","digestif","tipple","wassail","perry",
  "cigarette","cigar","tobacco","nicotine","snuff","dope","weed","opium","heroin","cocaine",
  "morphine","codeine","cannabis","hashish","marijuana","laudanum","narcotic",
  "sex","eros","erotic","erotism","lust","libido","arousal","orgasm","tit","tits","ass","arse",
  "bum","boob","boobs","bosom","nipple","teat","dug","crap","damn","hell","dick","willy","knob",
  "prick","cock","balls","bollocks","piss","pee","poo","poop","turd","fart","bugger","twat",
  "slut","hooker","harlot","strumpet","concubine","mistress","seduction","fetish","pussy",
  "bitch","bastard","fanny","jugs","wanker","git","bloody","sod","bollix","minger",
  "suicide","murder","rape","abortionist","hangman","executioner","assassin",
]);
/* Words a child will absolutely type that the frequency list has never
   heard of. Anything caught by a coverage-test failure belongs here. */
const EXTRA = {
  "Name a fruit": ["lychee", "rambutan", "dragon fruit", "star fruit", "passion fruit",
                   "clementine", "satsuma", "persimmon", "jackfruit", "kumquat", "physalis"],
  "Name a fish": ["clownfish", "angelfish", "swordfish", "pufferfish", "catfish", "goldfish",
                  "jellyfish", "starfish", "lionfish", "mahi mahi", "tilapia", "betta"],
  "Name a toy": ["playdough", "play doh", "kinetic sand", "nerf gun", "hot wheels", "beyblade",
                 "fidget spinner", "pogo stick", "slinky", "rubiks cube", "hula hoop", "yoyo"],
  "Name a job people do": ["palaeontologist", "paleontologist", "youtuber", "vlogger",
                           "zookeeper", "park ranger", "barista", "influencer", "streamer"],
  "Name a dessert": ["profiterole", "macaron", "cannoli", "tiramisu", "churro", "baklava",
                     "gelato", "sorbet", "smores", "cake pop", "banoffee"],
  "Name a snack": ["boba", "edamame", "hummus", "guacamole", "beef jerky", "rice cake"],
  "Name a bug or insect": ["woodlouse", "roly poly", "pill bug", "stick insect", "daddy long legs"],
  "Name something at a birthday party": ["pinata", "goody bag", "party popper", "bouncy castle"],
  "Name a Minecraft mob": ["axolotl", "enderman", "creeper", "ghast", "shulker", "hoglin",
                           "piglin", "warden", "allay", "sniffer", "vindicator", "ravager"],
  "Name an animal that lives in the ocean": ["clownfish", "pufferfish", "anglerfish", "narwhal",
                                             "manta ray", "sea urchin", "hermit crab"],
  "Name a mammal": ["platypus", "echidna", "capybara", "meerkat", "wombat", "quokka", "axolotl"],
};
// words BLOCK would take that are perfectly fine in one particular category
const KEEP = { "Name a kind of bread": ["rye"], "Name a colour": ["burgundy"] };

const NOT_MOBS = new Set(["arrow","boat","item","minecart","armor stand","area effect cloud",
  "painting","item frame","glow item frame","tnt","firework rocket","fireball","small fireball",
  "dragon fireball","wither skull","shulker bullet","llama spit","egg","snowball","potion",
  "experience orb","experience bottle","eye of ender","end crystal","leash knot","fishing bobber",
  "falling block","lightning bolt","evoker fangs","marker","interaction","block display",
  "item display","text display","chest boat","chest minecart","furnace minecart","hopper minecart",
  "spawner minecart","tnt minecart","command block minecart","ender pearl","trident","giant",
  "illusioner","zombie horse","player","fishing hook","ominous item spawner"]);

// Frequency-graded English, commonest first. Tier 60 is where words a kid
// might actually know stop and the specialist vocabulary starts.
const english = require("wordlist-english");
const TIERS = ["english/10", "english/20", "english/35", "english/40",
               "english/50", "english/55", "english/60"];
const COMMON = new Set(TIERS.flatMap((t) => english[t]));
// how common a word is, 0 = everyday … 7 = never heard of it
const RANK = new Map();
TIERS.forEach((t, i) => english[t].forEach((w) => { if (!RANK.has(w)) RANK.set(w, i); }));
const rankOf = (w) => (w.includes(" ") ? 5 : RANK.has(w) ? RANK.get(w) : 7);

function clean(words, { keepCaps = false, cap = 450, frequency = true } = {}) {
  const out = new Set();
  for (const raw of words) {
    const w = raw.replace(/_/g, " ").replace(/\(.*?\)/g, "").trim();
    if (!/^[A-Za-z][A-Za-z '-]*$/.test(w)) continue;
    if (w.length < 3 || w.length > 18) continue;
    if (w.split(" ").length > 3) continue;
    if (!keepCaps && /^[A-Z]/.test(w)) continue;          // Latin binomials & people
    if (/(us|um|ii|ae|iformes|idae|aceae)$/.test(w) && w.includes(" ")) continue;
    if (w.toLowerCase().split(" ").some((t) => BLOCK.has(t))) continue;
    // a phrase explains itself; a lone obscure noun doesn't
    if (frequency && !w.includes(" ") && !COMMON.has(w.toLowerCase())) continue;
    out.add(w.toLowerCase());
  }
  // commonest first, so if the cap bites it takes the rarest words —
  // an alphabetical cut would simply delete everything after "m"
  return [...out]
    .sort((a, b) => rankOf(a) - rankOf(b) || a.length - b.length || a.localeCompare(b))
    .slice(0, cap);
}

/* ---------- which source feeds which question ---------- */
const SEEDS = {
  "Name a fruit": [["edible fruit", 0]],
  "Name a vegetable": [["vegetable", 0]],
  "Name a bird": [["bird", 0]],
  "Name a fish": [["fish", 0]],
  "Name a bug or insect": [["insect", 0], ["arachnid", 0], ["worm", 0]],
  "Name a reptile": [["reptile", 0]],
  "Name a kind of tree": [["tree", 0]],
  "Name a flower": [["flowering plant", 0]],
  "Name a musical instrument": [["musical instrument", 0]],
  "Name a sport": [["sport", 0]],
  "Name a tool": [["tool", 0]],
  "Name a dessert": [["dessert", 0], ["candy", 0]],
  "Name a drink": [["beverage", 0]],
  "Name a rock, gem or mineral": [["gem", 0], ["mineral", 0]],
  "Name a language": [["natural language", 0], ["language", 0]],
  "Name a body part": [["body part", 0]],
  "Name something you wear": [["clothing", 0], ["footwear", 1], ["headdress", 0]],
  "Name a way to travel": [["vehicle", 0]],
  "Name something you find in a kitchen": [["kitchen utensil", 0], ["kitchen appliance", 0], ["cookware", 0], ["tableware", 0]],
  "Name a toy": [["toy", 0]],
  "Name a kind of bread": [["bread", 0]],
  "Name a snack": [["snack food", 0]],
  "Name a dinosaur": [["dinosaur", 0]],
  "Name a job people do": [["worker", 1], ["professional", 0], ["skilled worker", 0]],
  "Name a kind of weather": [["atmospheric phenomenon", 0]],
  "Name a feeling": [["feeling", 0]],
  "Name a mammal": [["mammal", 0]],
};
const CAPITALISED = new Set(["Name a language"]);
// Names, not vocabulary — a frequency list would gut these.
const NO_FREQUENCY = new Set(["Name a dinosaur", "Name a language", "Name a Minecraft mob",
                              "Name a country", "Name a US state"]);

/* ---------- merge into data.js, keeping everything hand-written ---------- */
const text = readFileSync(DATA, "utf8");
const header = text.slice(0, text.indexOf("const WB_QUESTIONS"));
const QS = new Function(text + "; return WB_QUESTIONS;")();

const norm = (w) => String(w).toLowerCase().replace(/[^a-z]/g, "");
let added = 0, screened = 0;

for (const q of QS) {
  const keep = new Set((KEEP[q.q] || []).map(norm));
  const before = q.ok.length;
  q.ok = q.ok.filter((w) => {
    const k = w.toLowerCase();
    if (keep.has(norm(w))) return true;
    if (BLOCK.has(k)) return false;
    if (q.q === "Name a Minecraft mob" && NOT_MOBS.has(k)) return false;
    return true;
  });
  screened += before - q.ok.length;

  const seeds = SEEDS[q.q];
  if (!seeds) continue;
  const frequency = !NO_FREQUENCY.has(q.q);
  const words = seeds.flatMap(([lemma, sense]) => hyponyms(lemma, sense));

  // NB: the frequency bar gates what comes IN. It is never applied to what
  // is already here — those are hand-written answers, and a list like this
  // has never heard of LYCHEE or PLAYDOUGH even though every child has.

  const have = new Set(q.ok.map(norm));
  for (const w of clean(words, { keepCaps: CAPITALISED.has(q.q), frequency })) {
    if (have.has(norm(w))) continue;
    have.add(norm(w));
    q.ok.push(w);
    added++;
  }
}

const country = [...new Set(require("world-countries")
  .flatMap((c) => [c.name.common, ...Object.values(c.name.nativeName || {}).map((n) => n.common)]))]
  .filter((n) => /^[A-Za-z][A-Za-z '-]*$/.test(n) && n.split(" ").length <= 4)
  .map((n) => n.toLowerCase());
const mobs = [...new Set(require("minecraft-data")("1.20.4").entitiesArray.map((e) => e.displayName))]
  .filter((n) => /^[A-Za-z][A-Za-z ']*$/.test(n))
  .map((n) => n.toLowerCase())
  .filter((n) => !NOT_MOBS.has(n));

for (const [question, list] of [...Object.entries(EXTRA),
                                ["Name a country", country], ["Name a Minecraft mob", mobs]]) {
  const q = QS.find((x) => x.q === question);
  if (!q) continue;
  const have = new Set(q.ok.map(norm));
  for (const w of list) {
    if (have.has(norm(w))) continue;
    have.add(norm(w));
    q.ok.push(w);
    added++;
  }
}

for (const q of QS) {
  q.ok.sort((a, b) => a.length - b.length || a.localeCompare(b));
}

/* ---------- write it back out, formatted like a hand-edited file ---------- */
function wrap(words, indent) {
  const lines = [];
  let line = "";
  for (const w of words) {
    const item = JSON.stringify(w) + ", ";
    if (line.length + item.length > 84 - indent.length) { lines.push(line.trimEnd()); line = ""; }
    line += item;
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines.map((l, i) => (i ? indent : "") + l).join("\n").replace(/,$/, "");
}

let out = header + "const WB_QUESTIONS = [\n";
QS.forEach((q, i) => {
  out += "  {\n    q: " + JSON.stringify(q.q) + ",\n";
  out += "    ok: [" + wrap(q.ok, "         ") + "]" + (q.pics ? "," : "") + "\n";
  if (q.pics) {
    out += "    pics: [" + q.pics.map((p) => `[${JSON.stringify(p[0])}, ${JSON.stringify(p[1])}]`).join(", ") + "]\n";
  }
  out += "  }" + (i < QS.length - 1 ? "," : "") + "\n";
});
out += "];\n";
writeFileSync(DATA, out);

const total = QS.reduce((s, q) => s + q.ok.length, 0);
console.log(`${QS.length} categories, ${total} answers (+${added} sourced, ${screened} screened out)`);
