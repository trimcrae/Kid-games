/* ===========================================================
   PixelArt — a tiny shared pixel-sprite renderer for the arcade.
   -----------------------------------------------------------
   Draws crisp, blocky sprites entirely from code — no image files.
   You "paint" on a small integer grid with a few helpers, and it
   upscales with nearest-neighbour (no smoothing) so every pixel
   stays sharp at any size. Reusable by any game that wants sprites.

   Use it like:

       var c = PixelArt.render({
         w: 32, h: 32, scale: 6,
         draw: function (g) {
           g.rect(10, 4, 12, 6, "#ffcf3f");   // x, y, w, h, colour
           g.px(15, 15, "#38b6ff");           // single pixel
           g.ellipse(16, 16, 8, 9, "#ffd9b3");// filled ellipse
         }
       });
       someElement.appendChild(c);            // c is an upscaled <canvas>

   Everything is wrapped in try/catch and degrades gracefully, so a
   missing canvas API can never hard-break a game.
   =========================================================== */
window.PixelArt = (function () {
  "use strict";

  /* ---- colour helper: lighten (pct>0) / darken (pct<0) a hex ---- */
  function shade(hex, pct) {
    try {
      var h = String(hex).replace("#", "");
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      var r = parseInt(h.slice(0, 2), 16),
          g = parseInt(h.slice(2, 4), 16),
          b = parseInt(h.slice(4, 6), 16);
      var f = pct / 100;
      function adj(v) { return Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f))); }
      function hx(v) { var s = adj(v).toString(16); return s.length === 1 ? "0" + s : s; }
      return "#" + hx(r) + hx(g) + hx(b);
    } catch (e) { return hex; }
  }

  // The little drawing toolkit handed to each sprite's draw() callback.
  function makeBrush(ctx, W, H) {
    return {
      W: W, H: H,
      rect: function (x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, Math.max(0, w | 0), Math.max(0, h | 0)); },
      px:   function (x, y, c) { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, 1, 1); },
      hline:function (x0, x1, y, c) { var a = Math.min(x0, x1) | 0, b = Math.max(x0, x1) | 0; ctx.fillStyle = c; ctx.fillRect(a, y | 0, b - a + 1, 1); },
      vline:function (x, y0, y1, c) { var a = Math.min(y0, y1) | 0, b = Math.max(y0, y1) | 0; ctx.fillStyle = c; ctx.fillRect(x | 0, a, 1, b - a + 1); },
      // filled ellipse via per-row scanlines (stays pixel-crisp, no anti-alias)
      ellipse: function (cx, cy, rx, ry, c) {
        ctx.fillStyle = c;
        for (var y = -ry; y <= ry; y++) {
          var t = 1 - (y * y) / (ry * ry);
          if (t < 0) continue;
          var w = Math.floor(rx * Math.sqrt(t));
          ctx.fillRect((cx - w) | 0, (cy + y) | 0, w * 2 + 1, 1);
        }
      },
      shade: shade
    };
  }

  /* Render a sprite and return an upscaled, crisp <canvas>.
     opts: { w, h, scale=4, draw(brush) } */
  function render(opts) {
    var o = opts || {};
    var W = o.w || 32, H = o.h || 32, scale = o.scale || 4;
    try {
      var small = document.createElement("canvas");
      small.width = W; small.height = H;
      var sctx = small.getContext("2d");
      if (typeof o.draw === "function") o.draw(makeBrush(sctx, W, H));

      var big = document.createElement("canvas");
      big.width = W * scale; big.height = H * scale;
      big.style.width = (W * scale) + "px";
      big.style.height = (H * scale) + "px";
      big.style.imageRendering = "pixelated";
      var bctx = big.getContext("2d");
      bctx.imageSmoothingEnabled = false;
      bctx.drawImage(small, 0, 0, W, H, 0, 0, W * scale, H * scale);
      return big;
    } catch (e) {
      // last-resort: return an empty canvas so callers can still append something
      var fallback = document.createElement("canvas");
      fallback.width = W * scale; fallback.height = H * scale;
      return fallback;
    }
  }

  /* Draw a sprite straight onto an existing canvas's 2d context at the
     given grid resolution, then nearest-neighbour upscale to fill it.
     Handy when you want to re-paint one canvas (e.g. recolour) in place. */
  function paint(targetCanvas, opts) {
    try {
      var o = opts || {};
      var sprite = render({ w: o.w, h: o.h, scale: 1, draw: o.draw });
      var ctx = targetCanvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
      ctx.drawImage(sprite, 0, 0, sprite.width, sprite.height, 0, 0, targetCanvas.width, targetCanvas.height);
    } catch (e) { /* ignore */ }
  }

  return { render: render, paint: paint, shade: shade };
})();
