/* ===========================================================
   Extract every pre-written line that a game speaks, and the
   exact MP3 filename the runtime will ask for, into one JSON
   manifest on stdout:  [{ game, file, text }, ...]

   build_audio.py reads this and renders each line with Piper.
   Run from the repo root:  node tools/extract_texts.js > manifest.json

   The runtime builds clip filenames from known tokens (never by
   hashing free text), so the names below must match the JS:
     princess :  find-<letter|number>-<x>, praise-<i>, try-again, beautiful
     word-wiz :  word-<word>, you-did-it
     spelling :  pangram
     adventure:  <storyId>-<nodeId>
   =========================================================== */
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const out = [];

// Strip emoji & tidy punctuation so the TTS reads cleanly
// (mirrors games/spooky-stories/audio/build_audio.py).
function clean(t) {
  return String(t)
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}✨⭐❤️‍]/gu, "")
    .replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    .replace(/—/g, ", ").replace(/…/g, "...")
    .replace(/\s+/g, " ").replace(/ ,/g, ",").trim();
}
function add(game, file, text) {
  const t = clean(text);
  if (t) out.push({ game, file, text: t });
}

/* ---- Princess Dress-Up ------------------------------------ */
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const NUMBERS = ["1","2","3","4","5","6","7","8","9","10"];
const PRAISE  = ["Yay!", "Hooray!", "Wonderful!", "You did it!", "So pretty!", "Great job!"];
LETTERS.forEach(x => add("princess-dressup", "find-letter-" + x.toLowerCase(), "Can you find the letter " + x + "?"));
NUMBERS.forEach(x => add("princess-dressup", "find-number-" + x,               "Can you find the number " + x + "?"));
PRAISE.forEach((p, i) => add("princess-dressup", "praise-" + i, p));
add("princess-dressup", "try-again", "Try again!");
add("princess-dressup", "beautiful", "Beautiful! Your princess is all dressed up!");

/* ---- Word Wizard ------------------------------------------ */
const wwSrc = fs.readFileSync(path.join(ROOT, "games/word-wizard/word-wizard.js"), "utf8");
const wwWords = [...new Set([...wwSrc.matchAll(/word:\s*"([a-zA-Z]+)"/g)].map(m => m[1].toLowerCase()))];
wwWords.forEach(w => add("word-wizard", "word-" + w, w));
add("word-wizard", "you-did-it", "You did it!");

/* ---- Spelling Bee ----------------------------------------- */
add("spelling-bee", "pangram", "Pangram!");

/* ---- Adventure: narrate only the pre-reader stories ---------
   Ellie can't read yet, so her stories (age 5 and under, or "all
   ages") read aloud. The big 6+/7+ epics for the older readers
   (~50 MB of audio) stay silent — they read those. */
global.window = {};
require(path.join(ROOT, "games/adventure/story-data.js"));
require(path.join(ROOT, "games/adventure/stories-long.js"));
function preReader(st) {
  const m = String(st.ages || "").match(/(\d+)/);
  return !m || parseInt(m[1], 10) <= 5;
}
(global.window.STORIES || []).filter(preReader).forEach(st => {
  const nodes = st.nodes || {};
  Object.keys(nodes).forEach(nodeId => {
    const node = nodes[nodeId];
    if (node && typeof node.text === "string") add("adventure", st.id + "-" + nodeId, node.text);
  });
});

process.stdout.write(JSON.stringify(out, null, 0));
process.stderr.write("manifest: " + out.length + " clips across " +
  [...new Set(out.map(o => o.game))].length + " games\n");
