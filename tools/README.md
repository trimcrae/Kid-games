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
| `adventure` | 0 | intentionally silent — ~460 long paragraphs (~50 MB) and its audience already reads |
| `mad-libs` | 0 | dynamic (kids' own words) — no voice by design |

## Regenerating the clips

Run from the repo root:

```bash
pip install piper-tts imageio-ffmpeg
node tools/extract_texts.js > manifest.json   # exact lines + filenames
python3 tools/build_audio.py manifest.json     # add --force to rebuild all
```

`extract_texts.js` derives every clip's filename from the same tokens the
runtime uses (e.g. `find-letter-a`, `word-fox`, `pangram`), so the audio
always matches what a game asks for. The ~60 MB voice model is downloaded once
into `tools/voices/` (gitignored); only the small `.mp3` clips are committed.

> Note: huggingface (Piper's default voice host) may be blocked; the script
> fetches the identical lessac model from a GitHub release mirror instead.
