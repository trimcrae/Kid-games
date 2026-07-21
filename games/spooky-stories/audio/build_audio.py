#!/usr/bin/env python3
"""Pre-render the storybook narration with Piper (neural TTS) -> .mp3.

Parses the exact `text:` strings out of ../storybook.js (grouped by each
story's `id:`) so the audio always matches what's on screen, synthesizes
each line with the Piper en_US-lessac-medium voice, and encodes to MP3
(plays on every browser, incl. all iOS Safari).

Piper is fed ONE SENTENCE PER CALL: multi-sentence input trips a bug in
the piper-tts CLI where sentences after the first render as loud white
noise ("static"). The pause between sentences is stitched in here as real
digital silence instead of Piper's --sentence-silence. Every rendered
page is also checked for that noise signature, so a bad render fails the
build loudly instead of shipping static to the kids.

Setup, then run from this folder:

    pip install piper-tts==1.5.0 imageio-ffmpeg
    python3 -m piper.download_voices --download-dir ./voices en_US-lessac-medium
    python3 build_audio.py
"""

import os, re, struct, subprocess, sys, tempfile, wave
import imageio_ffmpeg

HERE = os.path.dirname(os.path.abspath(__file__))
JS = os.path.join(HERE, "..", "storybook.js")
OUT = HERE
VOICE = os.path.join(HERE, "voices", "en_US-lessac-medium.onnx")
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
SENTENCE_GAP = 0.45  # seconds of silence stitched between sentences

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

# A "sentence" ends at ./!/? (runs allowed, e.g. "...") plus any closing quote.
SENT_RE = re.compile(r'[^.!?]*[.!?]+["\']?')

def split_sentences(text):
    parts = [p.strip() for p in SENT_RE.findall(text)]
    rest = SENT_RE.sub('', text).strip()  # any trailing unpunctuated tail
    if rest:
        parts.append(rest)
    return [p for p in parts if p]

def piper_sentence(text, wav_path):
    # Piper: slightly slower pacing = gentle, kid-friendly reading
    subprocess.run([sys.executable, "-m", "piper", "-m", VOICE, "-f", wav_path,
                    "--length-scale", "1.12", "--noise-scale", "0.6"],
                   input=text.encode(), check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def assert_not_static(pcm, rate, name):
    """Fail if the clip carries Piper's white-noise failure mode.

    Static is sustained LOUD audio whose sign flips almost every sample.
    Speech spends most loud frames voiced (low flip rate); even hissy
    consonants only push a healthy clip to ~15% noisy frames.
    """
    n = len(pcm) // 2
    samples = struct.unpack("<%dh" % n, pcm[:n * 2])
    win = max(1, int(rate * 0.05))
    loud = noisy = 0
    for i in range(0, n - win, win):
        w = samples[i:i + win]
        if sum(abs(v) for v in w) / win < 655:  # quieter than ~2% full scale
            continue
        loud += 1
        flips = sum(1 for a, b in zip(w, w[1:]) if (a >= 0) != (b >= 0))
        if flips / win > 0.35:
            noisy += 1
    if loud and noisy / loud > 0.30:
        raise RuntimeError(
            f"{name}: {noisy}/{loud} loud frames look like static, not speech "
            "- refusing to ship broken narration")

total = 0
for st in stories:
    for i, raw in enumerate(st["texts"]):
        text = clean(raw)
        if not text:
            continue
        dst = os.path.join(OUT, f'{st["id"]}-{i}.mp3')

        # synthesize sentence by sentence, then stitch with true silence
        chunks, rate = [], None
        for sent in split_sentences(text):
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
                swav = tf.name
            piper_sentence(sent, swav)
            with wave.open(swav, "rb") as w:
                assert w.getnchannels() == 1 and w.getsampwidth() == 2, swav
                if rate is None:
                    rate = w.getframerate()
                assert w.getframerate() == rate, swav
                chunks.append(w.readframes(w.getnframes()))
            os.unlink(swav)
        gap = b"\x00" * (int(rate * SENTENCE_GAP) * 2)
        pcm = gap.join(chunks)
        assert_not_static(pcm, rate, os.path.basename(dst))

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
            wav = tf.name
        with wave.open(wav, "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate)
            w.writeframes(pcm)
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
