/* ===========================================================
   Pixelate — turn a scene's SVG into crisp pixel art.
   -----------------------------------------------------------
   The story games (adventure, spooky-stories) already compose
   every scene as an SVG string. Instead of re-drawing ~60 art
   primitives by hand, this shared layer rasterises that SVG to a
   small low-resolution canvas and lets the browser upscale it with
   hard, square pixels (image-rendering: pixelated) — so every scene
   (and cover) becomes pixel art automatically, now and in future.

   Usage:
       Pixelate.toPixelCanvas(svgString, {
         vw: 400, vh: 300,     // the SVG's viewBox size
         block: 4,             // source units per pixel (bigger = chunkier)
         palette: [...],       // optional ["#rrggbb", …] to snap colours to
         onready: function (canvas) { … }   // fired once it's drawn
       });

   Returns the (initially blank) <canvas> immediately so callers can
   place it right away; it fills in on load. Everything is wrapped in
   try/catch and calls onerror so the caller can keep the plain SVG.
   =========================================================== */
window.Pixelate = (function () {
  "use strict";

  // Force explicit pixel width/height on the <svg> (needed so an <img> rasterises
  // it at a known size — the engines emit width="100%", which would render blank).
  function sized(svg, vw, vh) {
    if (!/xmlns=/.test(svg)) svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
    return svg.replace(/<svg([^>]*)>/, function (m, attrs) {
      attrs = attrs.replace(/\swidth="[^"]*"/i, "").replace(/\sheight="[^"]*"/i, "");
      return "<svg" + attrs + ' width="' + vw + '" height="' + vh + '">';
    });
  }

  // hex -> [r,g,b]
  function rgb(hex) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  // Snap every pixel to the nearest colour in a palette (optional "crafted" look).
  function snapPalette(ctx, w, h, palette) {
    try {
      var pal = palette.map(rgb);
      var img = ctx.getImageData(0, 0, w, h), d = img.data;
      for (var i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 24) continue; // leave transparent pixels
        var best = 0, bestDist = Infinity;
        for (var p = 0; p < pal.length; p++) {
          var dr = d[i] - pal[p][0], dg = d[i + 1] - pal[p][1], db = d[i + 2] - pal[p][2];
          var dist = dr * dr + dg * dg + db * db;
          if (dist < bestDist) { bestDist = dist; best = p; }
        }
        d[i] = pal[best][0]; d[i + 1] = pal[best][1]; d[i + 2] = pal[best][2]; d[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    } catch (e) { /* ignore — leave as-is */ }
  }

  function toPixelCanvas(svg, opts) {
    opts = opts || {};
    var vw = opts.vw || 400, vh = opts.vh || 300;
    var block = opts.block || 4;
    var lowW = Math.max(1, Math.round(vw / block));
    var lowH = Math.max(1, Math.round(vh / block));

    var canvas = document.createElement("canvas");
    canvas.width = lowW;
    canvas.height = lowH;
    canvas.style.imageRendering = "pixelated";

    try {
      var ctx = canvas.getContext("2d");
      var img = new Image();
      img.decoding = "async";
      img.onload = function () {
        try {
          // downscale (averaging) into the low-res grid, then optional palette snap
          ctx.imageSmoothingEnabled = true;
          ctx.clearRect(0, 0, lowW, lowH);
          ctx.drawImage(img, 0, 0, lowW, lowH);
          if (opts.palette && opts.palette.length) snapPalette(ctx, lowW, lowH, opts.palette);
          if (opts.onready) opts.onready(canvas);
        } catch (e) { if (opts.onerror) opts.onerror(e); }
      };
      img.onerror = function (e) { if (opts.onerror) opts.onerror(e); };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(sized(svg, vw, vh));
    } catch (e) {
      if (opts.onerror) opts.onerror(e);
    }
    return canvas;
  }

  return { toPixelCanvas: toPixelCanvas };
})();
