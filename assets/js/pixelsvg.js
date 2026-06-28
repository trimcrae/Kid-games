/* ===========================================================
   PX — a tiny helper for drawing REAL pixel art as inline SVG.
   -----------------------------------------------------------
   The story games compose each scene from toolkit primitives that
   return SVG strings. This lets those primitives be hand-authored
   pixel art (deliberate pixels, flat limited palette, outlines)
   instead of smooth vector shapes — drawn as grid-snapped <rect>
   "pixels" with shape-rendering="crispEdges" so they stay sharp at
   any size. No raster files, no downscaling.

   PX.sprite(rows, palette, opts) — author a sprite from a text grid:
       PX.sprite([
         ".OO.",
         "OWWO",
         ".OO."
       ], { O: "#000", W: "#fff" }, { u: 4, cx: 0, bottom: 0 })
     • each character indexes `palette`; "." or " " (or any key not in
       the palette) is transparent.
     • consecutive same-colour cells in a row merge into one <rect>.
     • opts.u   = pixel size in viewBox units (default 4)
       opts.cx  = local x the grid is centred on (default 0)
       opts.cy  = local y the grid is centred on (default 0)
       opts.bottom = local y of the grid's BOTTOM edge (overrides cy;
                     handy for characters that "stand" at a point)
   PX.rect(x,y,w,h,fill) — a single crisp rect in raw viewBox units.
   =========================================================== */
window.PX = (function () {
  "use strict";
  var U = 4;

  function rect(x, y, w, h, fill) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h +
           '" fill="' + fill + '" shape-rendering="crispEdges"/>';
  }

  function sprite(rows, palette, opts) {
    opts = opts || {};
    var u = opts.u || U;
    var h = rows.length, w = 0, i;
    for (i = 0; i < h; i++) if (rows[i].length > w) w = rows[i].length;
    var ox = (opts.cx != null ? opts.cx : 0) - (w * u) / 2;
    var oy = opts.bottom != null ? opts.bottom - h * u
                                 : (opts.cy != null ? opts.cy : 0) - (h * u) / 2;
    var out = "";
    for (var ry = 0; ry < h; ry++) {
      var row = rows[ry], cx = 0;
      while (cx < row.length) {
        var ch = row[cx];
        if (!palette[ch]) { cx++; continue; }
        var run = 1;
        while (cx + run < row.length && row[cx + run] === ch) run++;
        out += rect(ox + cx * u, oy + ry * u, run * u, u, palette[ch]);
        cx += run;
      }
    }
    return out;
  }

  return { sprite: sprite, rect: rect, U: U };
})();
