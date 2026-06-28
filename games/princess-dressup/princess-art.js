/* ===========================================================
   Princess Dress-Up — PIXEL ART
   -----------------------------------------------------------
   Draws the princess and every outfit piece as crisp pixel-art
   sprites using the shared PixelArt renderer (assets/js/pixelart.js).
   No image files.

   It builds the contents of #princess so the game brain (princess.js)
   keeps working untouched: each earnable piece is a
   <span class="acc" data-slot="…"> wrapping a full-frame sprite layer,
   hidden until princess.js adds the "on" class.

   The gown lives in the always-visible base layer; PrincessArt.setDress()
   repaints it so the dress can change colour each round.

   Grid is 165×218, shown at 2× → 330×436 px. Light comes from the left.
   =========================================================== */
window.PrincessArt = (function () {
  "use strict";

  var W = 165, H = 218, SCALE = 2;        // sprite grid + display scale
  var s = 1.5;                            // grid units per "design" unit
  function X(v) { return Math.round(v * s); }
  var cx = Math.round(W / 2);             // 83 — horizontal centre

  // fixed palette (gown colours are derived per-round from the dress hue)
  var C = {
    skin: "#ffdcb5", skin2: "#eeb98c", skin3: "#fff1e3",
    hair: "#7a4a1e", hairH: "#a86f33", hairD: "#5a3413",
    w: "#ffffff", iris: "#6b4220", iris2: "#3a2410", pup: "#241405",
    cheek: "#ff9bb5", mouth: "#b83048", lip: "#ff6f8c", brow: "#9a6a35",
    gold: "#ffcf3f", goldH: "#ffe98a", goldD: "#d99713",
    gemB: "#39b7ff", gemP: "#ff6fae", fl: "#ff8fc6", flC: "#ffe07a",
    star: "#fff4b0"
  };

  function dressShades(dress) {
    var P = window.PixelArt;
    return {
      d: dress,
      dH: P.shade(dress, 32), dHH: P.shade(dress, 58),
      dD: P.shade(dress, -28), dDD: P.shade(dress, -48)
    };
  }

  /* ---------- BASE: hair, face, gown ---------- */
  function drawBase(dress) {
    var D = dressShades(dress);
    return function (g) {
      // back hair curtains (per target row, so edges stay smooth)
      for (var ty = X(26); ty <= X(120); ty++) {
        var y = ty / s, t = (y - 26) / 94;
        var bulge = Math.round(7.5 * Math.sin(t * Math.PI));
        var xo = cx - X(26) - bulge, xi = cx - X(16);
        if (ty > X(108)) xi -= (ty - X(108));
        if (xi > xo) { g.rect(xo, ty, xi - xo, 1, C.hair); g.rect(xo, ty, X(1), 1, C.hairD); g.px(xi - 1, ty, C.hairH); }
        var Xo = cx + X(16), Xi = cx + X(27) + bulge;
        if (ty > X(108)) Xo += (ty - X(108));
        if (Xi > Xo) { g.rect(Xo, ty, Xi - Xo, 1, C.hair); g.rect(Xi - X(1), ty, X(1), 1, C.hairD); g.px(Xo, ty, C.hairH); }
      }
      // head
      g.ellipse(cx, X(46), X(20), X(22), C.skin);
      g.ellipse(cx - X(6), X(40), X(7), X(8), C.skin3);     // forehead light
      // bangs
      for (var by = X(24); by <= X(34); by++) {
        var yy = by / s, tt = 1 - ((yy - 34) * (yy - 34)) / (20 * 20);
        if (tt < 0) continue;
        var bw = Math.floor(X(21) * Math.sqrt(tt));
        g.rect(cx - bw, by, bw * 2 + 1, 1, C.hair);
      }
      g.rect(cx - X(21), X(24), X(42), X(1), C.hairH);
      g.rect(cx - X(13), X(33), X(4), X(4), C.hair);
      g.rect(cx + X(9), X(33), X(4), X(4), C.hair);
      g.rect(cx - X(2), X(34), X(4), X(3), C.hair);
      g.px(cx, X(30), C.hairD);
      // brows
      g.rect(cx - X(13), X(40), X(6), X(1), C.brow); g.px(cx - X(14), X(41), C.brow);
      g.rect(cx + X(8), X(40), X(6), X(1), C.brow); g.px(cx + X(13), X(41), C.brow);
      // eyes
      function eye(ex) {
        g.rect(ex, X(44), X(7), X(8), C.w);
        g.rect(ex, X(44), X(7), X(2), C.iris2);            // lash line
        g.rect(ex + X(1), X(45), X(5), X(6), C.iris);
        g.rect(ex + X(2), X(46), X(3), X(4), C.pup);
        g.rect(ex + X(1), X(45), X(2), X(2), C.w);         // highlight
        g.px(ex + X(4), X(49), C.w);
      }
      eye(cx - X(13)); eye(cx + X(6));
      g.px(cx - X(14), X(44), C.iris2); g.px(cx + X(13), X(44), C.iris2);
      // cheeks, nose, mouth
      g.rect(cx - X(18), X(53), X(3), X(2), C.cheek); g.rect(cx + X(16), X(53), X(3), X(2), C.cheek);
      g.px(cx - X(1), X(54), C.skin2);
      g.rect(cx - X(4), X(58), X(9), X(1), C.mouth); g.px(cx - X(5), X(57), C.mouth); g.px(cx + X(5), X(57), C.mouth);
      g.rect(cx - X(3), X(59), X(7), X(1), C.lip);
      // neck
      g.rect(cx - X(4), X(66), X(9), X(4), C.skin); g.rect(cx - X(4), X(69), X(9), X(1), C.skin2);

      // gown (bell, drawn per target row so the silhouette is smooth)
      function hwSrc(i) { return i < 10 ? 6 + Math.round(i * 0.3) : 9 + Math.round((i - 10) * 0.55); }
      for (var dy = X(70); dy <= X(143); dy++) {
        var di = dy / s - 70; if (di < 0) continue;
        var hw = Math.round(hwSrc(di) * s);
        g.rect(cx - hw, dy, hw * 2 + 1, 1, D.d);
        g.rect(cx - hw, dy, X(1), 1, D.dHH);               // left edge bright
        g.px(cx - hw + X(1), dy, D.dH);
        g.px(cx + hw, dy, D.dDD); g.rect(cx + hw - X(2), dy, X(2), 1, D.dD); // right shade
      }
      // folds
      for (var fi = 6; fi < 74; fi++) {
        var fy = X(70 + fi);
        g.px(cx, fy, D.dD);
        if (fi > 14) { var off = X(8 + Math.round(fi * 0.28)); g.px(cx - off, fy, D.dD); g.px(cx + off, fy, D.dD); }
      }
      // ruffle tiers
      [34, 54].forEach(function (ti) {
        var ry = X(70 + ti), hw = Math.round(hwSrc(ti) * s);
        for (var xx = cx - hw; xx <= cx + hw; xx++) g.px(xx, ry, ((Math.round(xx / s) + ti) % 4 < 2) ? D.dHH : D.dD);
        g.rect(cx - hw, ry + X(1), hw * 2 + 1, X(1), D.dDD);
      });
      // hem light
      var hwH = Math.round(hwSrc(73) * s);
      g.rect(cx - hwH, X(142), hwH * 2 + 1, X(1), D.dHH);
      // bodice (sweetheart) + puff sleeves
      g.rect(cx - X(7), X(70), X(15), X(8), D.dD); g.rect(cx - X(7), X(70), X(15), X(2), D.dDD);
      g.px(cx, X(72), D.dH); g.px(cx, X(75), D.dH);
      g.rect(cx - X(13), X(72), X(5), X(4), D.dH); g.px(cx - X(13), X(72), D.dHH);
      g.rect(cx + X(9), X(72), X(5), X(4), D.dH); g.px(cx + X(13), X(72), D.dHH);
    };
  }

  /* ---------- ACCESSORY layers (full-frame, transparent) ---------- */
  function star4(g, x, y, r, col) {
    g.vline(x, y - r, y + r, col); g.hline(x - r, x + r, y, col);
    g.px(x - 1, y - 1, col); g.px(x + 1, y - 1, col); g.px(x - 1, y + 1, col); g.px(x + 1, y + 1, col);
  }

  var ACC = {
    crown: function (g) {
      g.rect(cx - X(14), X(21), X(29), X(3), C.gold);
      g.rect(cx - X(14), X(21), X(29), X(1), C.goldH);
      g.rect(cx - X(14), X(23), X(29), X(1), C.goldD);
      [[-12, 5], [-6, 7], [0, 9], [6, 7], [12, 5]].forEach(function (sp) {
        var x = cx + X(sp[0]), h = X(sp[1]);
        for (var k = 0; k < h; k++) { var ww = Math.max(X(1), Math.round((h - k) / h * X(3))); g.rect(x - (ww >> 1), X(21) - k, ww, 1, C.gold); }
        g.px(x, X(21) - h + 1, C.goldH);
      });
      g.rect(cx - X(1), X(12), X(3), X(2), C.gemB); g.px(cx - X(6), X(16), C.gemP); g.px(cx + X(6), X(16), C.gemP);
      [-11, -4, 3, 10].forEach(function (o) { g.px(cx + X(o), X(22), C.w); });
    },
    flower: function (g) {
      g.rect(cx - X(23), X(31), X(3), X(3), C.fl);
      g.px(cx - X(22), X(30), C.fl); g.px(cx - X(22), X(34), C.fl);
      g.px(cx - X(24), X(32), C.fl); g.px(cx - X(20), X(32), C.fl);
      g.px(cx - X(22), X(32), C.flC);
    },
    necklace: function (g) {
      g.rect(cx - X(5), X(70), X(11), X(1), C.goldH);
      g.rect(cx - X(1), X(71), X(3), X(2), C.gemB);
      g.px(cx - X(20), X(50), C.gemP); g.px(cx + X(20), X(50), C.gemP); // earrings
    },
    wand: function (g) {
      for (var k = 0; k < 24; k++) { var wx = X(92) - Math.floor(k * 0.45), wy = X(60) - k; g.px(wx, wy, C.goldD); g.px(wx + 1, wy, C.gold); }
      var sx = X(89), sy = X(40);
      g.rect(sx - X(3), sy, X(6), X(1), C.gold); g.rect(sx, sy - X(3), X(1), X(6), C.gold);
      g.px(sx - 1, sy - 1, C.goldH); g.px(sx + 1, sy - 1, C.goldH); g.px(sx - 1, sy + 1, C.goldH); g.px(sx + 1, sy + 1, C.goldH); g.px(sx, sy, C.goldH);
      [[sx - X(5), sy], [sx + X(5), sy], [sx, sy - X(5)], [sx, sy + X(5)]].forEach(function (p) { g.px(p[0], p[1], C.star); });
    },
    shoes: function (g) {
      g.rect(cx - X(8), X(143), X(4), X(2), C.fl); g.rect(cx + X(4), X(143), X(4), X(2), C.fl);
    },
    sparkle1: function (g) { star4(g, X(22), X(40), X(4), C.star); },
    sparkle2: function (g) { star4(g, X(140), X(74), X(3), C.star); },
    sparkle3: function (g) { star4(g, X(24), X(150), X(3), C.star); }
  };

  // where each piece sits, so the pop-in bounce grows from the piece
  var ORIGIN = {
    crown: "50% 9%", flower: "33% 16%", necklace: "50% 34%",
    wand: "82% 24%", shoes: "50% 96%", sparkle: "50% 50%"
  };

  var baseCanvas = null, currentDress = "#9b3fc4";

  function setDress(color) {
    currentDress = color || currentDress;
    if (baseCanvas) window.PixelArt.paint(baseCanvas, { w: W, h: H, draw: drawBase(currentDress) });
  }

  function layer(slot, drawFn) {
    var span = document.createElement("span");
    span.className = "acc";
    span.setAttribute("data-slot", slot);
    span.style.transformOrigin = ORIGIN[slot] || "50% 50%";
    span.appendChild(window.PixelArt.render({ w: W, h: H, scale: SCALE, draw: drawFn }));
    return span;
  }

  function build(container, dress) {
    if (!container) return;
    currentDress = dress || currentDress;
    container.innerHTML = "";
    // size is handled by CSS (responsive); canvases fill the box (see index.html)

    baseCanvas = window.PixelArt.render({ w: W, h: H, scale: SCALE, draw: drawBase(currentDress) });
    baseCanvas.className = "princess-base";
    container.appendChild(baseCanvas);

    container.appendChild(layer("crown", ACC.crown));
    container.appendChild(layer("flower", ACC.flower));
    container.appendChild(layer("necklace", ACC.necklace));
    container.appendChild(layer("wand", ACC.wand));
    container.appendChild(layer("shoes", ACC.shoes));
    container.appendChild(layer("sparkle", ACC.sparkle1));
    container.appendChild(layer("sparkle", ACC.sparkle2));
    container.appendChild(layer("sparkle", ACC.sparkle3));
  }

  return { build: build, setDress: setDress };
})();

// Build the sprite into #princess as soon as this script runs (it sits at the
// end of <body>, so #princess already exists). princess.js then reveals pieces
// and recolours the gown via PrincessArt.setDress().
try { PrincessArt.build(document.getElementById("princess")); } catch (e) { /* ignore */ }
