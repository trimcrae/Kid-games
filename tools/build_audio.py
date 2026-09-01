#!/usr/bin/env python3
"""Pre-render every pre-written game line with Piper (neural TTS) -> .mp3.

Reads the manifest produced by extract_texts.js (a list of
{game, file, text[, tail]}) and writes games/<game>/audio/<file>.mp3 using
the warm Piper "lessac medium" voice — the same storyteller voice the
Spooky Stories game uses — so every device sounds the same and nice,
instead of the phone/tablet's robotic built-in voice.

Setup, then run from the repo root:

    pip install piper-tts==1.5.0 imageio-ffmpeg
    node tools/extract_texts.js > manifest.json
    python3 tools/build_audio.py manifest.json          # add --force to rebuild

How a clip is made (the same recipe as spooky-stories/audio/build_audio.py):

  * Piper is fed ONE SENTENCE AT A TIME. Multi-sentence input can trip a
    bug where everything after the first sentence renders as loud white
    noise, so the pause between sentences is stitched in here as real
    digital silence instead.
  * Every clip is checked for that static signature before it is
    encoded, and the build fails loudly rather than ship a hiss.
  * The clip gets a short silent tail (`tail`, default 0.35 s; short
    fragments that get stitched together at play time ask for less), is
    loudness-normalised and encoded as a small mono MP3.

Games that stitch clips together at play time (Craepets) also get an
audio/manifest.js listing exactly which clips exist, so the page never
requests a recording that has not been rendered.

The voice model is fetched once into tools/voices/ (gitignored); only the
small generated .mp3 clips are committed. HuggingFace (Piper's default
voice host) is blocked from some machines, so the same lessac model is
taken from a GitHub release mirror; set PIPER_VOICE to point at any other
.onnx to override.
"""
import io
import json
import os
import struct
import subprocess
import sys
import tarfile
import tempfile
import urllib.request
import wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICE_DIR = os.path.join(ROOT, "tools", "voices")
VOICE = os.environ.get("PIPER_VOICE") or os.path.join(VOICE_DIR, "en-us-lessac-medium.onnx")
VOICE_URL = ("https://github.com/rhasspy/piper/releases/download/"
             "v0.0.2/voice-en-us-lessac-medium.tar.gz")

# Piper synthesis + MP3 settings, matched to spooky-stories/audio/build_audio.py
LENGTH_SCALE = 1.12   # slightly slower, gentler pacing for kids
NOISE_SCALE = 0.6     # calmer, less wobbly delivery
DEFAULT_TAIL = 0.35   # seconds of trailing silence on a whole sentence
SENTENCE_GAP = 0.4    # seconds of silence stitched between sentences

# Games whose page loads audio/manifest.js to learn which clips exist.
MANIFEST_GAMES = {"craepets": "CRAEPETS_NARRATION"}


def ensure_voice():
    if os.path.exists(VOICE):
        return
    os.makedirs(VOICE_DIR, exist_ok=True)
    sys.stderr.write("downloading lessac voice (~60 MB) ...\n")
    raw = urllib.request.urlopen(VOICE_URL, timeout=300).read()
    with tarfile.open(fileobj=io.BytesIO(raw), mode="r:gz") as tf:
        tf.extractall(VOICE_DIR)
    if not os.path.exists(VOICE):
        sys.exit("voice model missing after extract: " + VOICE)


def split_sentences(text):
    """'Yes! Well done. Now this.' -> ['Yes!', 'Well done.', 'Now this.']"""
    out, cur = [], ""
    for ch in text:
        cur += ch
        if ch in ".!?":
            out.append(cur.strip())
            cur = ""
    if cur.strip():
        out.append(cur.strip())
    # a sentence that is only punctuation ("...") rides along with its neighbour
    merged = []
    for s in out:
        if merged and not any(c.isalnum() for c in s):
            merged[-1] += " " + s
        else:
            merged.append(s)
    return [s for s in merged if any(c.isalnum() for c in s)] or [text]


def assert_not_static(pcm, rate, name):
    """Fail if the clip carries Piper's white-noise failure mode.

    Static is LOUD audio whose sign flips almost every sample, and it is
    SUSTAINED: once a render goes wrong the rest of the sentence is hiss.
    Speech has noisy frames too (every "s", "sh" and "f"), but they last a
    tenth of a second and sit between voiced frames — so the tell is not
    how many frames are noisy, it is the longest unbroken run of them.
    """
    n = len(pcm) // 2
    samples = struct.unpack("<%dh" % n, pcm[:n * 2])
    win = max(1, int(rate * 0.05))
    loud = 0
    run = longest = 0
    for i in range(0, n - win, win):
        w = samples[i:i + win]
        if sum(abs(v) for v in w) / win < 655:  # quieter than ~2% full scale
            run = 0
            continue
        loud += 1
        flips = sum(1 for a, b in zip(w, w[1:]) if (a >= 0) != (b >= 0))
        if flips / win > 0.4:
            run += 1
            longest = max(longest, run)
        else:
            run = 0
    if not loud:
        raise RuntimeError("%s: rendered silence" % name)
    if longest >= 16:   # 0.8 s of unbroken hiss is not a consonant
        raise RuntimeError(
            "%s: %.1f s of unbroken static, not speech "
            "- refusing to ship broken narration" % (name, longest * 0.05))


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    force = "--force" in sys.argv
    manifest_path = args[0] if args else os.path.join(ROOT, "manifest.json")
    entries = json.load(open(manifest_path, encoding="utf-8"))

    ensure_voice()
    from piper import PiperVoice, SynthesisConfig
    import imageio_ffmpeg
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

    voice = PiperVoice.load(VOICE)
    cfg = SynthesisConfig(length_scale=LENGTH_SCALE, noise_scale=NOISE_SCALE)
    tmp_dir = tempfile.mkdtemp(prefix="arcade-audio-")

    def synth(sentence):
        wav_path = os.path.join(tmp_dir, "sent.wav")
        with wave.open(wav_path, "wb") as wf:
            voice.synthesize_wav(sentence, wf, syn_config=cfg)
        with wave.open(wav_path, "rb") as w:
            assert w.getnchannels() == 1 and w.getsampwidth() == 2, wav_path
            return w.getframerate(), w.readframes(w.getnframes())

    made = skipped = 0
    rendered = {}   # game -> set of clip names that exist after this run
    for i, e in enumerate(entries):
        dst_dir = os.path.join(ROOT, "games", e["game"], "audio")
        os.makedirs(dst_dir, exist_ok=True)
        dst = os.path.join(dst_dir, e["file"] + ".mp3")
        rendered.setdefault(e["game"], set()).add(e["file"])
        if os.path.exists(dst) and not force:
            skipped += 1
            continue
        tail = float(e.get("tail", DEFAULT_TAIL))
        chunks, rate = [], None
        for sent in split_sentences(e["text"]):
            r, pcm = synth(sent)
            if rate is None:
                rate = r
            assert r == rate
            chunks.append(pcm)
        gap = b"\x00" * (int(rate * SENTENCE_GAP) * 2)
        pcm = gap.join(chunks) + b"\x00" * (int(rate * tail) * 2)
        assert_not_static(pcm, rate, e["file"])
        tmp_wav = os.path.join(tmp_dir, "clip.wav")
        with wave.open(tmp_wav, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(rate)
            w.writeframes(pcm)
        subprocess.run(
            [ffmpeg, "-y", "-i", tmp_wav,
             "-af", "loudnorm=I=-15:TP=-1.5:LRA=11",
             "-c:a", "libmp3lame", "-b:a", "56k", "-ar", "22050", "-ac", "1", dst],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        made += 1
        if made % 50 == 0:
            sys.stderr.write("  ...%d/%d\n" % (i + 1, len(entries)))

    # The manifest of what exists, for the games that stitch clips together.
    for game, var in MANIFEST_GAMES.items():
        dst_dir = os.path.join(ROOT, "games", game, "audio")
        if not os.path.isdir(dst_dir):
            continue
        have = sorted(f[:-4] for f in os.listdir(dst_dir) if f.endswith(".mp3"))
        body = ",\n".join('  "%s": 1' % name for name in have)
        with open(os.path.join(dst_dir, "manifest.js"), "w", encoding="utf-8") as f:
            f.write(
                "/* AUTO-GENERATED by tools/build_audio.py - do not edit by hand.\n"
                "   Lists the narration clips that exist in this folder, so the game only\n"
                "   ever asks for an mp3 that is really there. A line whose clip is missing\n"
                "   falls back to the browser's own voice until the pipeline renders it. */\n"
                "window.%s = {\n%s\n};\n" % (var, body))
        sys.stderr.write("%s: manifest lists %d clips\n" % (game, len(have)))

    for f in os.listdir(tmp_dir):
        os.remove(os.path.join(tmp_dir, f))
    os.rmdir(tmp_dir)
    sys.stderr.write("done: %d rendered, %d already present\n" % (made, skipped))


if __name__ == "__main__":
    main()
