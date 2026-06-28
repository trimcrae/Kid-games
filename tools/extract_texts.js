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

/* ---- Adventure: intentionally NOT narrated -----------------
   The branching stories run to ~460 long paragraphs (~50 MB of
   audio). Adventure is for the older, reading kids, so it has no
   voice — they read it. (If that ever changes, walk
   window.STORIES[*].nodes[*].text here, keyed <storyId>-<nodeId>.) */

process.stdout.write(JSON.stringify(out, null, 0));
process.stderr.write("manifest: " + out.length + " clips across " +
  [...new Set(out.map(o => o.game))].length + " games\n");
