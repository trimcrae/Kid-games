#!/usr/bin/env python3
"""Pre-render every pre-written game line with Piper (neural TTS) -> .mp3.

Reads the manifest produced by extract_texts.js (a list of
{game, file, text}) and writes games/<game>/audio/<file>.mp3 using the
warm Piper "en_US-lessac-medium" voice — the same storyteller voice the
Spooky Stories game already uses — so every device sounds the same and
nice, instead of the phone/tablet's robotic built-in voice.

Setup, then run from the repo root:

    pip install piper-tts imageio-ffmpeg
    node tools/extract_texts.js > manifest.json
    python3 tools/build_audio.py manifest.json          # add --force to rebuild

The ~60 MB voice model is fetched once into tools/voices/ (gitignored);
only the small generated .mp3 clips are committed.
"""
import io
import json
import os
import subprocess
import sys
import tarfile
import urllib.request
import wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICE_DIR = os.path.join(ROOT, "tools", "voices")
VOICE = os.path.join(VOICE_DIR, "en-us-lessac-medium.onnx")
# huggingface (piper's default voice host) is blocked here; this GitHub
# release mirror serves the identical lessac-medium model.
VOICE_URL = ("https://github.com/rhasspy/piper/releases/download/"
             "v0.0.2/voice-en-us-lessac-medium.tar.gz")

# Piper synthesis + MP3 settings, matched to spooky-stories/audio/build_audio.py
LENGTH_SCALE = 1.12   # slightly slower, gentler pacing for kids
NOISE_SCALE = 0.6     # calmer, less wobbly delivery
TAIL_SILENCE = 0.4    # seconds of trailing silence on each clip


def ensure_voice():
    if os.path.exists(VOICE):
        return
    os.makedirs(VOICE_DIR, exist_ok=True)
    sys.stderr.write("downloading lessac voice (~60 MB) ...\n")
    raw = urllib.request.urlopen(VOICE_URL, timeout=120).read()
    with tarfile.open(fileobj=io.BytesIO(raw), mode="r:gz") as tf:
        tf.extractall(VOICE_DIR)
    if not os.path.exists(VOICE):
        sys.exit("voice model missing after extract: " + VOICE)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    force = "--force" in sys.argv
    manifest_path = args[0] if args else os.path.join(ROOT, "manifest.json")
    entries = json.load(open(manifest_path))

    ensure_voice()
    from piper import PiperVoice, SynthesisConfig
    import imageio_ffmpeg
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

    voice = PiperVoice.load(VOICE)
    cfg = SynthesisConfig(length_scale=LENGTH_SCALE, noise_scale=NOISE_SCALE)
    tmp_wav = os.path.join(VOICE_DIR, "_tmp.wav")

    made = skipped = 0
    for i, e in enumerate(entries):
        dst_dir = os.path.join(ROOT, "games", e["game"], "audio")
        os.makedirs(dst_dir, exist_ok=True)
        dst = os.path.join(dst_dir, e["file"] + ".mp3")
        if os.path.exists(dst) and not force:
            skipped += 1
            continue
        with wave.open(tmp_wav, "wb") as wf:
            voice.synthesize_wav(e["text"], wf, syn_config=cfg)
        subprocess.run(
            [ffmpeg, "-y", "-i", tmp_wav,
             "-af", "apad=pad_dur=%s,loudnorm=I=-15:TP=-1.5:LRA=11" % TAIL_SILENCE,
             "-c:a", "libmp3lame", "-b:a", "56k", "-ar", "22050", "-ac", "1", dst],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        made += 1
        if made % 50 == 0:
            sys.stderr.write("  ...%d/%d\n" % (i + 1, len(entries)))
    if os.path.exists(tmp_wav):
        os.remove(tmp_wav)
    sys.stderr.write("done: %d rendered, %d already present\n" % (made, skipped))


if __name__ == "__main__":
    main()
