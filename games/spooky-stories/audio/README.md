# Narration audio (pre-rendered)

These `*.mp3` clips are the read-aloud narration for the storybook. They are
pre-rendered once with a neural text-to-speech voice so every device gets the
same warm "storyteller" voice instead of the phone/tablet's built-in robot
voice. (The game still falls back to the browser's Web Speech voice if a clip
ever fails to load.)

- **Naming:** `<storyId>-<pageIndex>.mp3` — e.g. `giggly-ghost-2.mp3` is the
  3rd page of the "Ellie & the Giggly Ghost" story. The comprehension questions
  that follow each story are `<storyId>-q<n>.mp3` (rendered from the `ask:`
  strings in `../storybook.js`).
- **`manifest.js`** is generated alongside the clips and loaded by
  `../index.html` *before* the game script. It lists every clip that exists,
  plus, for each spoken sentence inside it, the stretches of time the voice is
  actually sounding (found by listening for the pauses in the rendered
  waveform — see `speech_runs()` in `build_audio.py`). The storybook uses it to
  (a) never request an mp3 that has not been rendered yet — new story text is
  simply silent instead of 404-ing, and (b) light up each word in time with the
  narration: a pause in the voice lands after the word that carries the comma
  or dash, and the time inside each stretch is shared out by word length.
  **Do not hand-edit it**; `build_audio.py` rewrites it.
- **Voice:** [Piper](https://github.com/rhasspy/piper) `en_US-lessac-medium`.
- **Format:** MP3, mono, 22.05 kHz, ~56 kbps, loudness-normalised to -15 LUFS.
  MP3 plays everywhere (iOS Safari, Chrome, Firefox, Edge, Chromium).

## Regenerating after editing story text

**Easiest: let CI do it.** Pushing a change to `../storybook.js` triggers
`.github/workflows/build-audio.yml`, which runs the steps below on a GitHub
runner (open internet — it can download the voice, which the sandbox can't) and
commits the refreshed `.mp3`s back. You can also run it by hand from the
Actions tab.

To render them locally instead — the clips are generated straight from the
`text:` strings in `../storybook.js`, so if you change a story's words:

```bash
pip install piper-tts==1.5.0 imageio-ffmpeg
# download the voice (≈61 MB) into ./voices/
python3 -m piper.download_voices --download-dir ./voices en_US-lessac-medium
# parse storybook.js, synthesize each line, and (re)write the .mp3s
# and manifest.js here:
python3 build_audio.py
```

The `voices/` folder (the 61 MB model) is intentionally **not** committed —
only the small generated `.mp3` clips are.
