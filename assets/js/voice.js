/* ===========================================================
   Shared read-aloud voice for the McRae Family Arcade.

   One speak() used by every game so the kids hear the SAME
   warm, friendly voice everywhere. It picks a friendly English
   voice (avoiding the robotic / creepy system default) instead
   of leaving the browser to choose whatever it likes.

   Usage:
     Speech.speak("Hello!");                 // default warm voice
     Speech.speak("Hi", { rate: 0.85 });     // tweak per call
     Speech.cancel();                        // stop talking

   Load this BEFORE a game's own script:
     <script src="../../assets/js/voice.js"></script>
   =========================================================== */
(function (global) {
  "use strict";

  var synth = global.speechSynthesis || null;
  var voice = null;

  // Prefer a friendly English voice; fall back to anything English,
  // then to whatever the device offers.
  function pickVoice() {
    if (!synth) return;
    var vs = synth.getVoices();
    voice = vs.find(function (v) {
        return /female|samantha|karen|zira|google uk english female|tessa|moira|fiona|susan/i.test(v.name) &&
               /en/i.test(v.lang);
      })
      || vs.find(function (v) { return /en[-_]?US/i.test(v.lang); })
      || vs.find(function (v) { return /^en/i.test(v.lang); })
      || vs[0] || null;
  }

  if (synth) {
    pickVoice();
    // Voice list often loads asynchronously — re-pick when it arrives.
    try { synth.onvoiceschanged = pickVoice; } catch (e) { /* older browsers */ }
  }

  // Strip emoji & pictographs so they aren't read aloud as noise.
  function clean(text) {
    return String(text == null ? "" : text)
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}️‍·]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function speak(text, opts) {
    if (!synth) return;
    opts = opts || {};
    try {
      synth.cancel();
      var t = clean(text);
      if (!t) return;
      var u = new SpeechSynthesisUtterance(t);
      if (voice) u.voice = voice;
      u.rate   = opts.rate   != null ? opts.rate   : 0.9;
      u.pitch  = opts.pitch  != null ? opts.pitch  : 1.1;
      u.volume = opts.volume != null ? opts.volume : 1;
      synth.speak(u);
    } catch (e) { /* speech unavailable — games still work */ }
  }

  function cancel() {
    if (synth) { try { synth.cancel(); } catch (e) {} }
  }

  global.Speech = {
    speak: speak,
    cancel: cancel,
    stop: cancel,            // alias
    available: !!synth,
    voice: function () { return voice; }
  };
})(window);
