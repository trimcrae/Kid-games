# Audio tools — pre-rendered narration

Only **fully pre-written** game text gets a voice, and it's always the same
warm neural "storyteller" voice (Piper `en_US-lessac-medium`) — never the
phone/tablet's robotic built-in speech. Dynamic text (e.g. a Mad Lib filled
with the kids' own words) gets **no** voice; the kids just read it.

The clips live in each game's own `audio/` folder and are played by the shared
player `assets/js/voice.js` (`Voice.play("audio/<clip>.mp3")`). If a clip is
missing, the game stays silent — there is no robotic fallback.

## Which games have narration

| Game | Clips | What's spoken |
|------|------:|---------------|
| `princess-dressup` | 44 | "Can you find the letter/number X?", praise, etc. (Ellie, 3, is a pre-reader — this one matters most.) |
| `word-wizard` | 49 | each spelling word + "You did it!" |
| `spelling-bee` | 1 | "Pangram!" |
| `spooky-stories` | — | has its **own** generator at `games/spooky-stories/audio/build_audio.py` |
| `adventure` | 28 | only Ellie's pre-reader stories (rainbow, campout, pizza). The 6+/7+ epics for Cory & Jeannie stay silent — they'd be ~50 MB and those kids read. |
| `mad-libs` | 0 | dynamic (kids' own words) — no voice by design |
| `craepets` | ~800 | the whole script in `games/craepets/lines.js`: every question and lesson at the Tiny and Little levels, praise, the pet's chatter, the prize wheel, book facts, and every rival's lines (The Shade most of all). Numbers, letters and short fragments are stitched together at play time ("You have" + "9" + "berries, and you eat" + "3" + …), and `audio/manifest.js` (also generated) tells the page which clips exist so it never asks for a missing one. |

## Regenerating the clips

Run from the repo root:

```bash
pip install piper-tts imageio-ffmpeg
node tools/extract_texts.js > manifest.json   # exact lines + filenames
python3 tools/build_audio.py manifest.json     # add --force to rebuild all
```

`extract_texts.js` derives every clip's filename from the same tokens the
runtime uses (e.g. `find-letter-a`, `word-fox`, `pangram`, `q-how-many`), so
the audio always matches what a game asks for. The ~60 MB voice model is
downloaded once into `tools/voices/` (gitignored); only the small `.mp3` clips
are committed. `build_audio.py` feeds Piper one sentence at a time and stitches
real silence between them (a multi-sentence render can come out as static),
checks every clip for that static before encoding it, and writes
`games/craepets/audio/manifest.js`.

You don't have to run this by hand: **`.github/workflows/build-game-audio.yml`**
runs it on every push that changes a spoken line (or from the Actions tab)
and commits the new clips back, because the GitHub runners can reach the voice
model when a sandbox can't.

> Note: huggingface (Piper's default voice host) may be blocked; the script
> fetches the identical lessac model from a GitHub release mirror instead.

## `build-word-lists.mjs` — Word Bridge's answer lists

Tops up `games/word-bridge/data.js` from reference data (WordNet's "is a
kind of" tree, `world-countries`, `minecraft-data`, and a frequency-graded
English list) so the game never turns down a real answer. Hand-written
answers are always kept — the script only ever adds.

```bash
mkdir -p /tmp/wb && cd /tmp/wb && npm init -y
npm i wordnet-db world-countries minecraft-data wordlist-english
cd /path/to/repo && NODE_PATH=/tmp/wb/node_modules node tools/build-word-lists.mjs
```

Those four packages are author-time only; the game itself still ships as
plain files with no dependencies. If you ever see a kid's real answer
rejected, add the word to `EXTRA` in the script (or straight into
`data.js`) and re-run — the play-test has a coverage check that guards it.


## `craepets-art/render.py` — the Craepets clay art

Every Craepet, its egg, the petpets and all 27 wardrobe items are modelled
from primitives in Blender and rendered with Cycles on the CPU (no GPU, no
image model: the shapes are code and the light is physics). Each species gets
one sprite sheet in `games/craepets/art/`: six expression frames in white
clay plus a colour-ID mask each (red = body, green = accent), and every hat,
pair of glasses and scarf rendered ON that species with its body hidden but
occluding, so a hat sits right on a flat Zibbit head or between a Snorbit's
ears. `pets.js` paints the white clay through the player's palette at play
time, which is how one render becomes Berry Red, Rainbow or Starry Night.

```bash
pip install bpy pillow                       # Blender as a Python module
python3 tools/craepets-art/render.py         # everything (~20 min, 4 cores)
python3 tools/craepets-art/render.py --species blorb --frames idle --samples 12
python3 tools/craepets-art/render.py --only egg,petpets --force
```

Sheets that already exist are skipped unless `--force`. Pushing a change to
`render.py` triggers `.github/workflows/render-craepets-art.yml`, which
renders on a GitHub runner and commits the sheets back.
