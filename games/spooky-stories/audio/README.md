# Narration audio (pre-rendered)

These `*.mp3` clips are the read-aloud narration for the storybook. They are
pre-rendered once with a neural text-to-speech voice so every device gets the
same warm "storyteller" voice instead of the phone/tablet's built-in robot
voice. (The game still falls back to the browser's Web Speech voice if a clip
ever fails to load.)

- **Naming:** `<storyId>-<pageIndex>.mp3` — e.g. `giggly-ghost-2.mp3` is the
  3rd page of the "Ellie & the Giggly Ghost" story. The runtime computes this
  filename directly, so no manifest is needed.
- **Voice:** [Piper](https://github.com/rhasspy/piper) `en_US-lessac-medium`.
- **Format:** MP3, mono, 22.05 kHz, ~56 kbps, loudness-normalised to -15 LUFS.
  MP3 plays everywhere (iOS Safari, Chrome, Firefox, Edge, Chromium).

## Regenerating after editing story text

The clips are generated straight from the `text:` strings in `../storybook.js`,
so if you change a story's words, re-render its audio:

```bash
pip install piper-tts imageio-ffmpeg
# download the voice (≈61 MB) into ./voices/
python3 -m piper.download_voices --download-dir ./voices en_US-lessac-medium
# parse storybook.js, synthesize each line, and (re)write the .mp3s here:
python3 build_audio.py
```

The `voices/` folder (the 61 MB model) is intentionally **not** committed —
only the small generated `.mp3` clips are.
