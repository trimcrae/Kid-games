#!/usr/bin/env python3
"""Pre-render the storybook narration with Piper (neural TTS) -> .mp3.

Parses the exact `text:` strings out of ../storybook.js (grouped by each
story's `id:`) so the audio always matches what's on screen, synthesizes
each line with the Piper en_US-lessac-medium voice, and encodes to MP3
(plays on every browser, incl. all iOS Safari).

Setup, then run from this folder:

    pip install piper-tts imageio-ffmpeg
    python3 -m piper.download_voices --download-dir ./voices en_US-lessac-medium
    python3 build_audio.py
"""

import os, re, subprocess, sys, tempfile
import imageio_ffmpeg

HERE = os.path.dirname(os.path.abspath(__file__))
JS = os.path.join(HERE, "..", "storybook.js")
OUT = HERE
VOICE = os.path.join(HERE, "voices", "en_US-lessac-medium.onnx")
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

src = open(JS, encoding="utf-8").read()

# Walk id:/text: tokens in document order, bucketing texts under the current story id.
stories, cur = [], None
for m in re.finditer(r'\b(id|text):\s*"((?:[^"\\]|\\.)*)"', src):
    key, val = m.group(1), m.group(2)
    if key == "id":
        cur = {"id": val, "texts": []}
        stories.append(cur)
    elif cur is not None:
        cur["texts"].append(val)

def clean(t):
    # strip decorative emojis, normalise curly quotes/dashes for clear TTS
    t = re.sub(r'[\U0001F300-\U0001FAFF✨⭐❤️]', '', t)
    t = (t.replace('“', '"').replace('”', '"')
           .replace('’', "'").replace('‘', "'")
           .replace('—', ', ').replace('…', '...'))
    return re.sub(r'\s+', ' ', t.replace(' , ', ', ')).strip()

total = 0
for st in stories:
    for i, raw in enumerate(st["texts"]):
        text = clean(raw)
        if not text:
            continue
        dst = os.path.join(OUT, f'{st["id"]}-{i}.mp3')
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
            wav = tf.name
        # Piper: slightly slower + a little extra end silence = gentle, kid-friendly pacing
        subprocess.run([sys.executable, "-m", "piper", "-m", VOICE, "-f", wav,
                        "--length-scale", "1.12", "--sentence-silence", "0.45",
                        "--noise-scale", "0.6"],
                       input=text.encode(), check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        # Encode -> MP3, mono, loudness-normalised for consistent volume
        subprocess.run([FFMPEG, "-y", "-i", wav,
                        "-af", "loudnorm=I=-15:TP=-1.5:LRA=11",
                        "-c:a", "libmp3lame", "-b:a", "56k", "-ar", "22050", "-ac", "1", dst],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        os.unlink(wav)
        sz = os.path.getsize(dst)
        total += sz
        print(f"  {os.path.basename(dst):24s} {sz/1024:5.1f} KB  | {text[:48]}")

print(f"\nClips: {sum(len(s['texts']) for s in stories)}  Total: {total/1024:.0f} KB")
