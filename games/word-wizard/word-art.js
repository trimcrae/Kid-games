/* ===========================================================
   Word Wizard — SMOOTH VECTOR PICTURES
   -----------------------------------------------------------
   Every clue gets a hand-authored, modern vector illustration:
   smooth bézier paths, soft gradients, glints and gentle SMIL
   sparkles — no image files, no pixel grids.

   Each picture is drawn into viewBox="0 0 64 64".
   Exposed as the global WordArt object:  WordArt.draw("dragon")
   returns an <svg> string (or "" if that word has no picture yet).

   Pictures can appear several times on screen at once (the level
   grid), so every gradient/filter/clip id is minted fresh per
   render via uid() — never hardcode an id in here.

   Load BEFORE word-wizard.js.
   =========================================================== */
window.WordArt = (function () {
  "use strict";

  var INK = "#2b2440";
  var _uid = 0;
  function uid() { _uid += 1; return "ww" + _uid; }

  /* ---------- tiny SVG builders ---------- */
  function svg(defsStr, body) {
    return (
      '<svg viewBox="0 0 64 64" width="100%" height="100%" ' +
      'preserveAspectRatio="xMidYMid meet" style="max-height:100%;">' +
      (defsStr ? "<defs>" + defsStr + "</defs>" : "") + body + "</svg>"
    );
  }
  function U(id) { return "url(#" + id + ")"; }
  function stops(list) {
    var out = "";
    for (var i = 0; i < list.length; i++) {
      out += '<stop offset="' + list[i][0] + '" stop-color="' + list[i][1] + '"' +
        (list[i][2] != null ? ' stop-opacity="' + list[i][2] + '"' : "") + "/>";
    }
    return out;
  }
  function lg(id, x1, y1, x2, y2, list) {
    return '<linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="' + x1 +
      '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '">' + stops(list) + "</linearGradient>";
  }
  function rg(id, cx, cy, r, list, fx, fy) {
    return '<radialGradient id="' + id + '" gradientUnits="userSpaceOnUse" cx="' + cx +
      '" cy="' + cy + '" r="' + r + '"' +
      (fx != null ? ' fx="' + fx + '" fy="' + fy + '"' : "") + ">" + stops(list) + "</radialGradient>";
  }
  function glow(id, blur) {
    return '<filter id="' + id + '" x="-80%" y="-80%" width="260%" height="260%">' +
      '<feGaussianBlur stdDeviation="' + (blur || 1.5) + '" result="b"/>' +
      '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
  }
  function C(cx, cy, r, fill, extra) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + fill + '"' +
      (extra ? " " + extra : "") + "/>";
  }
  function E(cx, cy, rx, ry, fill, extra) {
    return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry +
      '" fill="' + fill + '"' + (extra ? " " + extra : "") + "/>";
  }
  function Pa(d, fill, extra) {
    return '<path d="' + d + '" fill="' + fill + '"' + (extra ? " " + extra : "") + "/>";
  }
  function Rc(x, y, w, h, rx, fill, extra) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h +
      '" rx="' + rx + '" fill="' + fill + '"' + (extra ? " " + extra : "") + "/>";
  }
  function Ln(d, stroke, w, extra) {
    return '<path d="' + d + '" fill="none" stroke="' + stroke + '" stroke-width="' + w +
      '" stroke-linecap="round" stroke-linejoin="round"' + (extra ? " " + extra : "") + "/>";
  }
  function shadow(cx, cy, rx, ry) {
    return E(cx, cy, rx, ry || 2.8, "#000", 'opacity="0.22"');
  }
  function eye(cx, cy, r, ink) {
    return C(cx, cy, r, ink || INK) +
      C(cx - r * 0.32, cy - r * 0.35, +(r * 0.36).toFixed(2), "#fff");
  }
  function starPath(cx, cy, r) {
    var p = [];
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + (i * Math.PI) / 5;
      var rr = i % 2 === 0 ? r : r * 0.45;
      p.push((cx + rr * Math.cos(a)).toFixed(2) + " " + (cy + rr * Math.sin(a)).toFixed(2));
    }
    return "M" + p.join("L") + "Z";
  }
  /* 4-point twinkle; pass dur (seconds) to animate its opacity. */
  function sparkle(cx, cy, r, fill, dur, begin) {
    var d = "M" + cx + " " + (cy - r) +
      "Q" + cx + " " + cy + " " + (cx + r) + " " + cy +
      "Q" + cx + " " + cy + " " + cx + " " + (cy + r) +
      "Q" + cx + " " + cy + " " + (cx - r) + " " + cy +
      "Q" + cx + " " + cy + " " + cx + " " + (cy - r) + "Z";
    var a = dur
      ? '<animate attributeName="opacity" values="1;0.2;1" dur="' + dur +
        's" repeatCount="indefinite"' + (begin ? ' begin="' + begin + 's"' : "") + "/>"
      : "";
    return '<path d="' + d + '" fill="' + fill + '">' + a + "</path>";
  }

  /* ---- the pictures (one per word) ---- */
  var ART = {

    /* ===== Animal Spells ===== */
    leopard: function () {
      var g1 = uid(), g2 = uid();
      var defs =
        rg(g1, 26, 20, 30, [["0", "#ffe3a1"], ["1", "#f2a93b"]]) +
        rg(g2, 30, 37, 11, [["0", "#ffffff"], ["1", "#ffeeda"]]);
      var spots = "";
      var S = [[15, 21, 2.4], [22, 13, 2], [42, 13, 2], [49, 21, 2.4],
               [16, 33, 2.2], [48, 33, 2.2], [23, 46, 1.8], [41, 46, 1.8], [32, 12, 1.9]];
      for (var i = 0; i < S.length; i++) {
        spots += C(S[i][0], S[i][1], S[i][2], "#7c4a12", 'opacity="0.85"');
      }
      return svg(defs,
        C(14, 15, 8, U(g1)) + C(50, 15, 8, U(g1)) +
        C(14, 16, 4, "#f7b7c8") + C(50, 16, 4, "#f7b7c8") +
        C(32, 32, 21, U(g1)) +
        spots +
        E(32, 41, 10, 7.5, U(g2)) +
        eye(24, 29, 2.9) + eye(40, 29, 2.9) +
        Pa("M29 38 Q32 36.4 35 38 Q35 41 32 42.6 Q29 41 29 38Z", "#d95f8a") +
        Ln("M32 42.6 L32 45 M32 45 Q29.5 47.6 27 45.8 M32 45 Q34.5 47.6 37 45.8", "#7c4a12", 1.4) +
        Ln("M20 39 L12 37 M20 42.5 L12 43.5 M44 39 L52 37 M44 42.5 L52 43.5", "#7c4a12", 1, 'opacity="0.55"')
      );
    },

    penguin: function () {
      var g1 = uid(), g2 = uid();
      var defs =
        lg(g1, 32, 8, 32, 58, [["0", "#46536f"], ["1", "#232a44"]]) +
        rg(g2, 29, 32, 24, [["0", "#ffffff"], ["1", "#dfe8f5"]]);
      return svg(defs,
        shadow(32, 58.4, 15) +
        E(32, 34, 17, 24, U(g1)) +
        Pa("M16 25 C9 33 11 45 15.5 49 C19 45 20 34 19 26Z", "#2c3552") +
        Pa("M48 25 C55 33 53 45 48.5 49 C45 45 44 34 45 26Z", "#2c3552") +
        E(32, 38, 11.5, 16.5, U(g2)) +
        E(26, 20, 6, 7, "#fff") + E(38, 20, 6, 7, "#fff") +
        eye(26, 20, 2.6) + eye(38, 20, 2.6) +
        Pa("M27.5 25.5 L36.5 25.5 L32 31Z", "#ff9f43") +
        C(22, 26, 2.4, "#ff8fa8", 'opacity="0.5"') + C(42, 26, 2.4, "#ff8fa8", 'opacity="0.5"') +
        E(24.5, 57.6, 5, 2.6, "#ff9f43") + E(39.5, 57.6, 5, 2.6, "#ff9f43")
      );
    },

    squirrel: function () {
      var g1 = uid(), g2 = uid();
      var defs =
        lg(g1, 46, 10, 46, 52, [["0", "#d4924e"], ["1", "#8a5426"]]) +
        rg(g2, 21, 34, 24, [["0", "#c98544"], ["1", "#9c6130"]]);
      return svg(defs,
        shadow(30, 57, 16) +
        Pa("M33 54 C52 53 59 38 55 24 C52 12 37 10 36 20 C35.4 26 43 25 45 31 C48 40 40 47 31 48Z", U(g1)) +
        Ln("M40 46 C50 41 52 30 46 22", "#e6a866", 3) +
        E(25, 43, 12, 11, U(g2)) +
        E(24, 46.5, 7, 7, "#f2d3ac") +
        C(19, 26, 10, U(g2)) +
        Pa("M11.5 20 C10 13 16 11.5 18 17Z", "#8a5426") +
        Pa("M21.5 16 C22 9.5 28 11 26.5 17Z", "#8a5426") +
        E(13.5, 30, 4.6, 3.6, "#f2d3ac") +
        C(11, 28.4, 1.6, "#5b3a1c") +
        eye(19.5, 24, 2.5) +
        Ln("M13 32 Q15 33.6 17 32.6", "#5b3a1c", 1.2) +
        Pa("M14.2 38.6 a3.6 3.1 0 0 1 7.2 0Z", "#6b4423") +
        E(17.8, 41.6, 3, 3.7, "#c9955c") +
        Ln("M17.8 36 L17.8 34.4", "#6b4423", 1.4) +
        E(15, 44.6, 2.4, 1.8, "#9c6130") + E(21, 44.6, 2.4, 1.8, "#9c6130") +
        E(20, 54, 5, 2.6, "#8a5426")
      );
    },

    flamingo: function () {
      var g1 = uid();
      var defs = lg(g1, 32, 26, 32, 50, [["0", "#ff9fd0"], ["1", "#ee5fa7"]]);
      return svg(defs,
        shadow(33, 58.6, 11, 2.4) +
        Ln("M36.5 45 L36.5 57 M36.5 57 L41 57", "#d4488f", 2.2) +
        Ln("M30.5 46 L30.5 50.5 L35.5 50.5", "#d4488f", 2.2) +
        E(36, 38, 13.5, 10, U(g1)) +
        Pa("M46 33 C54 28 56 38 47 42 C45 39 44.6 35.6 46 33Z", "#f77fbe") +
        Pa("M31 33 C40 30.5 46 35 44 41 C39.5 44.5 32 43 29.5 38.6Z", "#f77fbe") +
        Ln("M33 36 C37 35 41 37 41 40", "#e0559d", 1.6) +
        Ln("M26.5 33.5 C15 29 14.5 16 23 12.4", U(g1), 5.6) +
        C(25, 12, 5.6, "#ff9fd0") +
        Pa("M29.5 10 C34.5 9 37.6 11.4 37.4 14.4 C37.2 17.2 35 19.4 32.4 19 C33 16 31.6 13.4 29.4 13Z", "#f7d9e8") +
        Pa("M37.4 14.4 C37.2 17.2 35 19.4 32.4 19 C32.6 17.6 32.5 16.4 32.1 15.3Z", INK) +
        eye(23.6, 10.8, 1.8)
      );
    },

    elephant: function () {
      var g1 = uid();
      var defs = rg(g1, 28, 20, 30, [["0", "#c9cfe2"], ["1", "#9aa2bb"]]);
      return svg(defs,
        shadow(32, 58, 17) +
        E(11.5, 28, 10, 13, "#aab1c8") + E(52.5, 28, 10, 13, "#aab1c8") +
        E(11.5, 28, 6.5, 9, "#d8b3c2") + E(52.5, 28, 6.5, 9, "#d8b3c2") +
        C(32, 26, 16.5, U(g1)) +
        eye(26, 23, 2.7) + eye(38, 23, 2.7) +
        C(22.5, 29, 2.6, "#ff8fa8", 'opacity="0.45"') + C(41.5, 29, 2.6, "#ff8fa8", 'opacity="0.45"') +
        Pa("M23.5 36 C22 40.5 24 44.5 27.6 45.8 C25.6 42.4 25.8 38.8 27 36.2Z", "#fdf3dd") +
        Pa("M40.5 36 C42 40.5 40 44.5 36.4 45.8 C38.4 42.4 38.2 38.8 37 36.2Z", "#fdf3dd") +
        Pa("M28.6 34 C28.6 43 27 48 30 52.4 C32 55.2 37.4 54.6 37.6 51.4 C37.7 49.2 34.6 48.6 33.8 50.4 C32.2 49.6 33.4 44 35.4 34Z", U(g1)) +
        Ln("M29.6 40 L34.6 40 M29.4 44.6 L33.6 44.6", "#8890ab", 1.2)
      );
    },

    hedgehog: function () {
      var g1 = uid();
      var defs = lg(g1, 32, 10, 32, 46, [["0", "#9c6a38"], ["1", "#5b3a1c"]]);
      return svg(defs,
        shadow(32, 56.4, 18) +
        Pa("M12 46 C12 38 14 32 18 27 L13.6 19.6 L22 22 L24.4 12 L30 19 L34.4 9 L38.6 18 L46.6 12.4 L46.4 21.4 L54.6 18.6 L49.4 26.4 C53.4 32 56 38.6 56 46Z", U(g1)) +
        Pa("M18 27 C10 30 4.6 38 5.6 43.4 C6 45.4 8 46.4 10.4 46 L23 46 C24.6 39.6 23.4 31.6 18 27Z", "#eecb9f") +
        C(6.8, 41.6, 2.3, "#4a2f14") +
        eye(14.5, 37, 2.3) +
        Ln("M10 43.6 Q13 45.4 16 44", "#4a2f14", 1.3) +
        C(21, 30.5, 2.4, "#dcae7c") +
        E(26, 54.8, 3.6, 2.2, "#4a2f14") + E(43, 54.8, 3.6, 2.2, "#4a2f14")
      );
    },
/*__WORDART_MORE__*/
  };

  function draw(word) {
    var fn = ART[word];
    return fn ? fn() : "";
  }

  return { draw: draw, has: function (w) { return !!ART[w]; } };
})();
