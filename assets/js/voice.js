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

  function stop() {
    if (current) {
      try { current.pause(); } catch (e) {}
      current = null;
    }
  }

  // Play the clip at `src`; calls `onended` when it finishes (if given).
  // Returns the Audio element, or null when audio isn't available.
  // A missing or un-playable clip fails silently — the kids just read.
  function play(src, onended) {
    stop();
    if (typeof Audio === "undefined") return null;
    var a = new Audio(src);
    a.preload = "auto";
    current = a;
    a.addEventListener("ended", function () {
      if (current === a) current = null;
      if (onended) onended();
    });
    var p = a.play();
    if (p && p.catch) p.catch(function () { /* clip missing/blocked — stay silent */ });
    return a;
  }

  global.Voice = { play: play, stop: stop };
})(window);
