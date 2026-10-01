/* ===========================================================
   Confetti — a tiny shared celebration burst for the arcade.
   -----------------------------------------------------------
   Pure DOM + CSS, no dependencies, no files. Drops a short
   shower of colourful pieces over the page (or a target element)
   then cleans itself up. Everything is wrapped in try/catch and
   no-ops if anything is missing, so it can never break a game.
   It also stays calm for kids who prefer reduced motion.

   Use it like:

       window.Confetti && Confetti.burst();          // full-screen shower
       window.Confetti && Confetti.burst({ count: 80 });
       window.Confetti && Confetti.burst({ x: 0.5, y: 0.4 }); // from a point

   =========================================================== */
window.Confetti = (function () {
  "use strict";

  let motionQuery = null;
  try { motionQuery = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)"); }
  catch (e) { /* preferences may be unavailable */ }

  const COLORS = ["#ff5d8f", "#8a5cff", "#38b6ff", "#3ddc84", "#ffd166"];
  const layers = new Map();
  let styleInjected = false;

  function removeLayer(layer) {
    clearTimeout(layers.get(layer));
    layers.delete(layer);
    try { layer.remove(); } catch (e) { /* ignore */ }
  }

  function clear() {
    layers.forEach(function (timer, layer) { removeLayer(layer); });
  }

  document.addEventListener("visibilitychange", function () { if (document.hidden) clear(); });
  window.addEventListener("pagehide", clear);
  if (motionQuery) {
    const changed = function () { if (motionQuery.matches) clear(); };
    try {
      if (motionQuery.addEventListener) motionQuery.addEventListener("change", changed);
      else if (motionQuery.addListener) motionQuery.addListener(changed);
    } catch (e) { /* the preference is also checked before every burst */ }
  }

  function injectStyle() {
    if (styleInjected) return;
    try {
      const s = document.createElement("style");
      s.textContent =
        ".confetti-layer{position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden}" +
        ".confetti-bit{position:absolute;top:-12px;width:10px;height:14px;border-radius:2px;" +
        "will-change:transform,opacity;animation:confetti-fall linear forwards}" +
        "@keyframes confetti-fall{to{transform:translateY(110vh) rotate(720deg);opacity:0}}" +
        "@media(prefers-reduced-motion:reduce){.confetti-layer{display:none}}";
      document.head.appendChild(s);
      styleInjected = true;
    } catch (e) { /* ignore */ }
  }

  // pseudo-random helper (no need for crypto)
  function rand(min, max) { return min + Math.random() * (max - min); }

  function burst(opts) {
    if (document.hidden || !document.body || (motionQuery && motionQuery.matches)) return;
    let layer = null;
    try {
      injectStyle();
      const o = opts || {};
      const count = typeof o.count === "number" && Number.isFinite(o.count)
        ? Math.max(0, Math.min(200, Math.floor(o.count))) : 90;
      if (!count) return;
      // origin as a fraction of the viewport (default: top, spread wide)
      const ox = typeof o.x === "number" && Number.isFinite(o.x) ? Math.max(0, Math.min(1, o.x)) : null;
      const oy = typeof o.y === "number" && Number.isFinite(o.y) ? Math.max(0, Math.min(1, o.y)) : null;

      // Rapid successes should not fill the page with thousands of elements.
      if (layers.size >= 3) removeLayer(layers.keys().next().value);
      layer = document.createElement("div");
      layer.className = "confetti-layer";
      layer.setAttribute("aria-hidden", "true");

      const vw = window.innerWidth;
      for (let i = 0; i < count; i++) {
        const bit = document.createElement("span");
        bit.className = "confetti-bit";
        const startX = ox !== null ? ox * vw + rand(-60, 60) : rand(0, vw);
        bit.style.left = Math.max(0, Math.min(vw, startX)) + "px";
        bit.style.top = (oy !== null ? oy * 100 : -3) + (oy !== null ? "vh" : "%");
        bit.style.background = COLORS[i % COLORS.length];
        bit.style.opacity = "1";
        const dur = rand(1.6, 2.8);
        const delay = rand(0, 0.5);
        bit.style.animationDuration = dur + "s";
        bit.style.animationDelay = delay + "s";
        bit.style.transform = "rotate(" + rand(0, 360) + "deg)";
        if (Math.random() < 0.5) bit.style.borderRadius = "50%";
        layer.appendChild(bit);
      }

      document.body.appendChild(layer);
      // tidy up after the longest possible piece has fallen
      layers.set(layer, setTimeout(function () { removeLayer(layer); }, 3600));
    } catch (e) { if (layer) removeLayer(layer); }
  }

  return { burst, clear };
})();
