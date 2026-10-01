/* ===========================================================
   Shared narration player for the McRae Family Arcade.

   Plays the PRE-RENDERED neural-voice clips that live in each
   game's  audio/  folder (the warm Piper "lessac" storyteller
   voice). Every game uses the same nice voice this way.

   There is deliberately NO live / robotic speech fallback: if a
   clip is missing we simply stay quiet and the kids read the
   words on screen. (Only fully pre-written text gets a voice.)

     Voice.play("audio/find-letter-a.mp3");
     Voice.play(src, function () { ...when it finishes... });
     Voice.stop();

   Load this BEFORE a game's own script:
     <script src="../../assets/js/voice.js"></script>
   =========================================================== */
(function (global) {
  "use strict";

  var current = null;

  function detach(clip) {
    clip.audio.removeEventListener("ended", clip.ended);
    clip.audio.removeEventListener("error", clip.error);
  }

  function stop() {
    if (current) {
      var clip = current;
      current = null;
      detach(clip);
      try { clip.audio.pause(); } catch (e) {}
      // Release a recording still loading or buffered after leaving a screen.
      try { clip.audio.removeAttribute("src"); clip.audio.load(); } catch (e) {}
    }
  }

  // Play the clip at `src`; calls `onended` when it finishes (if given).
  // Returns the Audio element, or null when audio isn't available.
  // A missing or un-playable clip fails silently — the kids just read.
  function play(src, onended) {
    stop();
    if (document.hidden || typeof global.Audio === "undefined" || !src) return null;
    try {
      var a = new global.Audio(src);
      a.preload = "auto";
      var clip = { audio: a };
      clip.ended = function () {
        // A stopped/replaced clip must never continue an old narration chain.
        if (current !== clip) return;
        current = null;
        detach(clip);
        if (typeof onended === "function") onended();
      };
      clip.error = function () {
        if (current !== clip) return;
        current = null;
        detach(clip);
      };
      current = clip;
      a.addEventListener("ended", clip.ended);
      a.addEventListener("error", clip.error);
      var p = a.play();
      if (p && p.catch) p.catch(function () {
        // A late rejection from an earlier play must leave the new clip alone.
        if (current === clip) stop();
      });
      return a;
    } catch (e) {
      stop();
      return null;
    }
  }

  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); });
  global.addEventListener("pagehide", stop);
  global.Voice = { play: play, stop: stop };
})(window);
