/* ===========================================================
   Pixelate — turn a scene's SVG into crisp pixel art.
   -----------------------------------------------------------
   The story games (adventure, spooky-stories) already compose
   every scene as an SVG string. Instead of re-drawing ~60 art
   primitives by hand, this shared layer rasterises that SVG at a
   low pixel-grid resolution and lets the browser upscale it with
   hard, square pixels (image-rendering: pixelated) — so every scene
   (and cover) becomes pixel art automatically, now and in future.

   Crispness (SNES-style, no blurry edges) comes from:
     • rasterising the SVG straight at the grid size (no averaging
       downscale), drawn with imageSmoothingEnabled = false;
     • snapping alpha to fully on/off (no soft halos);
     • light colour posterising so anti-aliased edge pixels collapse
       onto flat colours instead of fading between them.

   Usage:
       Pixelate.toPixelCanvas(svgString, {
         vw: 400, vh: 300,   // the SVG's viewBox size
         block: 3,           // source units per pixel (smaller = higher res)
         levels: 6,          // colour steps per channel (lower = flatter)
         palette: [...],     // optional ["#rrggbb", …] to snap colours to
         onready: function (canvas) { … }
       });

   Returns the (initially blank) <canvas> immediately so callers can
   place it right away; it fills in on load. Wrapped in try/catch.
   =========================================================== */
window.Pixelate = (function () {
  "use strict";

  // Force explicit pixel width/height on the <svg> so an <img> rasterises it at
  // exactly the grid size (the engines emit width="100%", which renders blank).
  function sized(svg, w, h) {
    if (!/xmlns=/.test(svg)) svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
    return svg.replace(/<svg([^>]*)>/, function (m, attrs) {
      attrs = attrs.replace(/\swidth="[^"]*"/i, "").replace(/\sheight="[^"]*"/i, "");
      return "<svg" + attrs + ' width="' + w + '" height="' + h + '">';
    });
  }

  function rgb(hex) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  // Crisp-up pass: hard alpha, posterise colours, optional palette snap.
  function crispen(ctx, w, h, levels, palette) {
    try {
      var imgData = ctx.getImageData(0, 0, w, h), d = imgData.data;
      var pal = palette && palette.length ? palette.map(rgb) : null;
      var step = levels > 1 ? 255 / (levels - 1) : 255;
      for (var i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 110) { d[i + 3] = 0; continue; }   // kill soft edge halos
        d[i + 3] = 255;
        if (pal) {
          var best = 0, bd = Infinity;
          for (var p = 0; p < pal.length; p++) {
            var dr = d[i] - pal[p][0], dg = d[i + 1] - pal[p][1], db = d[i + 2] - pal[p][2];
            var dist = dr * dr + dg * dg + db * db;
            if (dist < bd) { bd = dist; best = p; }
          }
          d[i] = pal[best][0]; d[i + 1] = pal[best][1]; d[i + 2] = pal[best][2];
        } else if (levels) {
          d[i] = Math.round(Math.round(d[i] / step) * step);
          d[i + 1] = Math.round(Math.round(d[i + 1] / step) * step);
          d[i + 2] = Math.round(Math.round(d[i + 2] / step) * step);
        }
      }
      ctx.putImageData(imgData, 0, 0);
    } catch (e) { /* leave as-is */ }
  }

  function toPixelCanvas(svg, opts) {
    opts = opts || {};
    var vw = opts.vw || 400, vh = opts.vh || 300;
    var block = opts.block || 2;                       // higher res = sharper
    var levels = opts.levels == null ? 0 : opts.levels; // 0 = no colour quantise (avoids gradient banding); edges stay crisp via hard alpha + no smoothing
    var lowW = Math.max(1, Math.round(vw / block));
    var lowH = Math.max(1, Math.round(vh / block));

    var canvas = document.createElement("canvas");
    canvas.width = lowW;
    canvas.height = lowH;
    canvas.style.imageRendering = "pixelated";

    try {
      var ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      var img = new Image();
      img.decoding = "async";
      img.onload = function () {
        try {
          ctx.clearRect(0, 0, lowW, lowH);
          // img was rasterised at the grid size; draw 1:1 with no smoothing
          ctx.drawImage(img, 0, 0, lowW, lowH);
          crispen(ctx, lowW, lowH, levels, opts.palette);
          if (opts.onready) opts.onready(canvas);
        } catch (e) { if (opts.onerror) opts.onerror(e); }
      };
      img.onerror = function (e) { if (opts.onerror) opts.onerror(e); };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(sized(svg, lowW, lowH));
    } catch (e) {
      if (opts.onerror) opts.onerror(e);
    }
    return canvas;
  }

  return { toPixelCanvas: toPixelCanvas };
})();
