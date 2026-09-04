#!/usr/bin/env python3
"""Pre-render the storybook narration with Piper (neural TTS) -> .mp3.

Parses the exact `text:` strings out of ../storybook.js (grouped by each
story's `id:`) so the audio always matches what's on screen, synthesizes
each line with the Piper en_US-lessac-medium voice, and encodes to MP3
(plays on every browser, incl. all iOS Safari).

Clips that already exist are KEPT: a line is only rendered when its mp3 is
missing or its text has changed since the clip was made (manifest.js
remembers a fingerprint of each clip's text). Piper's voice varies a
little from render to render, so re-rendering a story the kids already
know would change how it sounds for no reason. Set FORCE_RENDER=1 to
re-render everything on purpose.

Piper is fed ONE SENTENCE PER CALL: multi-sentence input trips a bug in
the piper-tts CLI where sentences after the first render as loud white
noise ("static"). The pause between sentences is stitched in here as real
digital silence instead of Piper's --sentence-silence. Every rendered
page is also checked for that noise signature, so a bad render fails the
build loudly instead of shipping static to the kids.

Alongside the clips it writes manifest.js: for every sentence of every
clip, the stretches of time the voice is actually sounding (found by
listening for the pauses in the rendered waveform). The storybook uses
those to light up each word in step with the narrator, so the highlight
waits through commas and dashes exactly where the voice does.

Setup, then run from this folder:

    pip install piper-tts==1.5.0 imageio-ffmpeg
    python3 -m piper.download_voices --download-dir ./voices en_US-lessac-medium
    python3 build_audio.py
"""

import hashlib, json, os, re, struct, subprocess, sys, tempfile, wave
import imageio_ffmpeg

HERE = os.path.dirname(os.path.abspath(__file__))
JS = os.path.join(HERE, "..", "storybook.js")
OUT = HERE
VOICE = os.path.join(HERE, "voices", "en_US-lessac-medium.onnx")
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
SENTENCE_GAP = 0.45  # seconds of silence stitched between sentences
# Listening for pauses: the voice is "sounding" while a 10 ms window's RMS
# level is above this fraction of the loudest window in the sentence, and a
# quiet stretch only counts as a pause once it is this long. Rendered speech
# has closure gaps inside words of up to ~100 ms (the "p" in "pumpkin"); a
# real pause at a comma or dash is 150-400 ms. Sentence ends run longer.
SPEECH_LEVEL = 0.03
MIN_PAUSE = 0.12
FORCE = os.environ.get("FORCE_RENDER", "").strip().lower() in ("1", "true", "yes")

# What the last build recorded for each clip ({"text": fingerprint,
# "voice": [...]}), so unchanged lines can keep the clip they already have.
MANIFEST = os.path.join(OUT, "manifest.js")
previous = {}
if os.path.exists(MANIFEST):
    m = re.search(r"=\s*(\{.*\})\s*;", open(MANIFEST, encoding="utf-8").read(), re.S)
    if m:
        try:
            previous = json.loads(m.group(1))
        except ValueError:
            previous = {}

def fingerprint(text):
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:12]

src = open(JS, encoding="utf-8").read()

# Walk id:/text:/ask: tokens in document order, bucketing them under the current
# story id. `text:` is a story page (-> "<id>-<n>.mp3"); `ask:` is one of the
# comprehension questions that follow the pages (-> "<id>-q<n>.mp3").
stories, cur = [], None
for m in re.finditer(r'\b(id|text|ask):\s*"((?:[^"\\]|\\.)*)"', src):
    key, val = m.group(1), m.group(2)
    if key == "id":
        cur = {"id": val, "texts": [], "asks": []}
        stories.append(cur)
    elif cur is not None:
        cur["texts" if key == "text" else "asks"].append(val)

# Words the page SHOUTS for emphasis. espeak (Piper's phonemizer) reads an
# all-caps word out letter by letter — "RED" comes out "R-E-D" — so the
# narrator gets them lowercased. Only 2+ letter words, so a lone "A" or "I"
# (a letter that really is meant to be said as a letter) is left alone.
CAPS_WORD = re.compile(r"\b[A-Z][A-Z']*[A-Z]\b")

def soften_caps(t):
    def lower_one(m):
        w = m.group(0).lower()
        before = t[:m.start()].rstrip(' "\'([')  # quotes/brackets don't count
        if not before or before[-1] in '.!?':    # still starts a sentence
            return w[0].upper() + w[1:]
        return w
    return CAPS_WORD.sub(lower_one, t)

def clean(t):
    # strip decorative emojis, normalise curly quotes/dashes for clear TTS
    t = re.sub(r'[\U0001F300-\U0001FAFF✨⭐❤️]', '', t)
    t = (t.replace('“', '"').replace('”', '"')
           .replace('’', "'").replace('‘', "'")
           .replace('—', ', ').replace('…', '...'))
    t = soften_caps(t)
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

def speech_runs(pcm, rate):
    """Where the voice is sounding in one rendered sentence: [[start, end], ...]
    in seconds, in order, with the pauses (>= MIN_PAUSE of quiet) left out.
    Leading and trailing silence are dropped too, so the first run starts
    when the narrator actually begins to speak."""
    n = len(pcm) // 2
    samples = struct.unpack("<%dh" % n, pcm[:n * 2])
    win = max(1, int(rate * 0.01))
    levels = []
    for i in range(0, n - win + 1, win):
        w = samples[i:i + win]
        levels.append((sum(v * v for v in w) / win) ** 0.5)
    if not levels:
        return [[0.0, n / rate]]
    thr = max(max(levels) * SPEECH_LEVEL, 40.0)
    step = win / rate
    runs, on, start = [], False, 0.0
    for k, lv in enumerate(levels):
        if lv > thr and not on:
            on, start = True, k * step
        elif lv <= thr and on:
            on = False
            runs.append([start, k * step])
    if on:
        runs.append([start, len(levels) * step])
    merged = []
    for r in runs:
        if merged and r[0] - merged[-1][1] < MIN_PAUSE:
            merged[-1][1] = r[1]
        else:
            merged.append(r)
    merged = [r for r in merged if r[1] - r[0] >= 0.04] or [[0.0, n / rate]]
    return [[round(a, 3), round(b, 3)] for a, b in merged]

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
kept = 0
timings = {}   # clip name -> {"text": fingerprint, "voice": per sentence, the
               #                [start, end] runs of voice (clip seconds)}

def render(raw, name):
    """Make sure <name>.mp3 is the narration for `raw`, synthesizing it only
    when it is missing or its words have changed. Returns the manifest entry
    for the clip (its text fingerprint and, per sentence, the [start, end]
    stretches in clip seconds where the voice is sounding), or None for a
    line with nothing to say."""
    global total, kept
    text = clean(raw)
    if not text:
        return None
    dst = os.path.join(OUT, name + ".mp3")
    fp = fingerprint(text)

    # already rendered from these exact words? keep the clip the kids know.
    # (an entry with no fingerprint is from before fingerprints were kept: its
    # clip was rendered from the text of the time, so it is trusted as-is)
    old = previous.get(name)
    if not FORCE and os.path.exists(dst) and isinstance(old, dict) and old.get("text") in (None, fp):
        kept += 1
        return {"text": fp, "voice": old.get("voice") or []}
    if not FORCE and os.path.exists(dst) and isinstance(old, list):
        kept += 1
        return {"text": fp, "voice": old}

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
    print(f"  {os.path.basename(dst):26s} {sz/1024:5.1f} KB  | {text[:46]}")
    # where the voice is sounding inside each sentence (clip seconds), so the
    # storybook can light up the words in time with the reading
    sents, at = [], 0.0
    for c in chunks:
        sents.append([[round(at + a, 3), round(at + b, 3)] for a, b in speech_runs(c, rate)])
        at += len(c) / 2 / rate + SENTENCE_GAP
    return {"text": fp, "voice": sents}


count = 0
for st in stories:
    for i, raw in enumerate(st["texts"]):
        sents = render(raw, f'{st["id"]}-{i}')
        if sents is not None:
            timings[f'{st["id"]}-{i}'] = sents
            count += 1
    for i, raw in enumerate(st["asks"]):
        sents = render(raw, f'{st["id"]}-q{i}')
        if sents is not None:
            timings[f'{st["id"]}-q{i}'] = sents
            count += 1

# Manifest: which clips exist, the fingerprint of the text each was rendered
# from, and where the voice sounds in them. The page loads this as a plain
# script, so it never requests an mp3 that has not been rendered yet.
lines = ",\n".join('  "%s": %s' % (k, json.dumps(v)) for k, v in sorted(timings.items()))
with open(MANIFEST, "w", encoding="utf-8") as f:
    f.write(
        "/* AUTO-GENERATED by build_audio.py - do not edit by hand.\n"
        "   Lists the narration clips that exist in this folder, so the storybook only\n"
        "   ever asks for an mp3 that is really there (new story text stays silent, with\n"
        "   no failed requests, until the build-audio workflow renders it).\n"
        "   \"text\" fingerprints the words the clip was rendered from (so an unchanged\n"
        "   line keeps its clip on the next build). \"voice\" has one entry per spoken\n"
        "   sentence: the [start, end] stretches (in seconds) where the voice is\n"
        "   sounding, with its pauses left out; the storybook uses them to light each\n"
        "   word up in time with the voice. [] = not measured, so the reader estimates\n"
        "   from the clip's own duration. */\n"
        "window.SPOOKY_NARRATION = {\n" + lines + "\n};\n")

print(f"\nClips: {count}  ({kept} kept, {count - kept} rendered, {total/1024:.0f} KB new)  (+ manifest.js)")
