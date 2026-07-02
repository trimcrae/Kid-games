/* ===========================================================
   Princess Dress-Up — VECTOR ART
   -----------------------------------------------------------
   Draws the princess and every outfit piece as smooth, modern
   picture-book SVG (bézier curves, gradients, soft glows and a
   gentle idle animation). No image files, no dependencies.

   It builds the contents of #princess so the game brain
   (princess.js) keeps working untouched: each earnable piece is a
   <span class="acc" data-slot="…"> wrapping a full-frame SVG layer,
   hidden until princess.js adds the "on" class.

   The gown colours live in gradients/paths that PrincessArt.setDress()
   retints, so the dress can change colour each round.

   Canvas is a 330×436 viewBox. Light comes from the upper left.
   Every gradient/filter id is unique per instance (uid counter) so
   multiple SVG layers can coexist on one page without id clashes.
   =========================================================== */
window.PrincessArt = (function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var VB = "0 0 330 436";
  var CX = 165;                 // horizontal centre of the frame

  var _uid = 0;
  function uid(name) { _uid += 1; return "pa-" + name + "-" + _uid; }
  function url(id) { return "url(#" + id + ")"; }

  // lighten (+) / darken (−) a #rrggbb colour
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.min(255, Math.max(0, (n >> 16) + amt));
    var g = Math.min(255, Math.max(0, ((n >> 8) & 255) + amt));
    var b = Math.min(255, Math.max(0, (n & 255) + amt));
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function el(tag, attrs, parent) {
    var node = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }

  // a full-frame svg that fills the .princess box (or an .acc span)
  function svgRoot() {
    var s = el("svg", { viewBox: VB, "aria-hidden": "true", focusable: "false" });
    s.style.position = "absolute";
    s.style.inset = "0";
    s.style.width = "100%";
    s.style.height = "100%";
    s.style.display = "block";
    s.style.overflow = "visible";
    return s;
  }

  // gentle idle bob shared by the princess and everything she wears —
  // identical timing on every layer keeps them moving together
  function bob(group) {
    el("animateTransform", {
      attributeName: "transform", type: "translate", additive: "sum",
      values: "0 0; 0 -4; 0 0", keyTimes: "0;0.5;1",
      calcMode: "spline", keySplines: "0.45 0 0.55 1; 0.45 0 0.55 1",
      dur: "3.5s", repeatCount: "indefinite"
    }, group);
    return group;
  }

  // soft glow (blur merged under the source) for tiaras/wands/sparkles
  function glowFilter(defs, blur) {
    var id = uid("glow");
    var f = el("filter", { id: id, x: "-80%", y: "-80%", width: "260%", height: "260%" }, defs);
    el("feGaussianBlur", { "in": "SourceGraphic", stdDeviation: blur, result: "b" }, f);
    var m = el("feMerge", {}, f);
    el("feMergeNode", { "in": "b" }, m);
    el("feMergeNode", { "in": "SourceGraphic" }, m);
    return id;
  }

  function goldGrad(defs) {
    var id = uid("gold");
    var g = el("linearGradient", { id: id, x1: "0", y1: "0", x2: "0.6", y2: "1" }, defs);
    el("stop", { offset: "0", "stop-color": "#ffe28a" }, g);
    el("stop", { offset: "0.55", "stop-color": "#f2bc4e" }, g);
    el("stop", { offset: "1", "stop-color": "#d99a26" }, g);
    return id;
  }

  function pinkGrad(defs) {
    var id = uid("pink");
    var g = el("linearGradient", { id: id, x1: "0", y1: "0", x2: "0.4", y2: "1" }, defs);
    el("stop", { offset: "0", "stop-color": "#ffb1d9" }, g);
    el("stop", { offset: "1", "stop-color": "#ff7fc0" }, g);
    return id;
  }

  // n-point star (for the wand)
  function starPath(cx, cy, R, r, n) {
    var d = [];
    for (var i = 0; i < n * 2; i++) {
      var rad = (i % 2 === 0) ? R : r;
      var a = Math.PI * i / n - Math.PI / 2;
      d.push((i ? "L " : "M ") + (cx + rad * Math.cos(a)).toFixed(1) + " " + (cy + rad * Math.sin(a)).toFixed(1));
    }
    return d.join(" ") + " Z";
  }

  // 4-point curvy sparkle centred on (cx, cy)
  function sparklePath(cx, cy, r) {
    var q = r * 0.16;
    return "M " + cx + " " + (cy - r) +
      " Q " + (cx + q) + " " + (cy - q) + " " + (cx + r) + " " + cy +
      " Q " + (cx + q) + " " + (cy + q) + " " + cx + " " + (cy + r) +
      " Q " + (cx - q) + " " + (cy + q) + " " + (cx - r) + " " + cy +
      " Q " + (cx - q) + " " + (cy - q) + " " + cx + " " + (cy - r) + " Z";
  }

  /* =========================================================
     BASE LAYER: hair, face, body, gown
     ========================================================= */
  var dressRefs = null;        // gradient stops + tinted paths for setDress
  var currentDress = "#9b3fc4";

  function drawBase(svg, dress) {
    var defs = el("defs", {}, svg);

    // --- gradients ---
    var idSkin = uid("skin");
    var sg = el("radialGradient", { id: idSkin, cx: "0.42", cy: "0.36", r: "0.8" }, defs);
    el("stop", { offset: "0", "stop-color": "#ffe9cf" }, sg);
    el("stop", { offset: "0.7", "stop-color": "#fbd7b2" }, sg);
    el("stop", { offset: "1", "stop-color": "#f3bd93" }, sg);

    // userSpaceOnUse so every hair shape shares one continuous gradient
    var idHair = uid("hair");
    var hg = el("linearGradient", { id: idHair, gradientUnits: "userSpaceOnUse", x1: 165, y1: 52, x2: 165, y2: 320 }, defs);
    el("stop", { offset: "0", "stop-color": "#a8722f" }, hg);
    el("stop", { offset: "0.45", "stop-color": "#7a4a1e" }, hg);
    el("stop", { offset: "1", "stop-color": "#5a3413" }, hg);

    var idDress = uid("dressG");
    var dg = el("linearGradient", { id: idDress, gradientUnits: "userSpaceOnUse", x1: 100, y1: 208, x2: 235, y2: 428 }, defs);
    var stop1 = el("stop", { offset: "0" }, dg);
    var stop2 = el("stop", { offset: "0.55" }, dg);
    var stop3 = el("stop", { offset: "1" }, dg);

    var root = bob(el("g", {}, svg));
    var skin = url(idSkin), hair = url(idHair), dressFill = url(idDress);

    /* ---- back hair: soft mass + flowing curtains + curls ---- */
    var backHair = el("g", { fill: hair }, root);
    el("ellipse", { cx: 165, cy: 118, rx: 72, ry: 70 }, backHair);
    el("path", { d: "M 100 110 C 80 160 88 214 78 260 C 74 290 84 306 100 304 C 115 302 118 282 115 260 C 109 216 112 168 120 128 Z" }, backHair);
    el("path", { d: "M 230 110 C 250 160 242 214 252 260 C 256 290 246 306 230 304 C 215 302 212 282 215 260 C 221 216 218 168 210 128 Z" }, backHair);
    el("circle", { cx: 90, cy: 298, r: 15 }, backHair);
    el("circle", { cx: 106, cy: 308, r: 10 }, backHair);
    el("circle", { cx: 240, cy: 298, r: 15 }, backHair);
    el("circle", { cx: 224, cy: 308, r: 10 }, backHair);
    // wavy inner shading on the curtains
    el("path", { d: "M 94 150 C 88 195 92 240 88 276", stroke: "#5a3413", "stroke-width": 4, fill: "none", opacity: 0.45, "stroke-linecap": "round" }, backHair);
    el("path", { d: "M 236 150 C 242 195 238 240 242 276", stroke: "#5a3413", "stroke-width": 4, fill: "none", opacity: 0.45, "stroke-linecap": "round" }, backHair);

    /* ---- neck (head overlaps its top, bodice its bottom) ---- */
    el("path", { d: "M 153 182 L 177 182 L 177 226 L 153 226 Z", fill: skin }, root);
    el("path", { d: "M 153 190 Q 165 200 177 190 L 177 198 Q 165 206 153 198 Z", fill: "#e4a276", opacity: 0.4 }, root);

    /* ---- ballgown skirt with scalloped hem ---- */
    var skirtD =
      "M 141 262" +
      " C 124 292 84 340 56 384" +
      " C 51 392 47 402 46 410" +
      " Q 66 425 86 410 Q 106 425 126 410 Q 146 425 166 410 Q 186 425 206 410 Q 226 425 246 410 Q 266 425 284 410" +
      " C 283 402 279 392 274 384" +
      " C 246 340 206 292 189 262" +
      " Q 165 274 141 262 Z";
    el("path", { d: skirtD, fill: dressFill }, root);

    // satin sheen down the lit (left) side
    el("path", { d: "M 149 274 C 122 312 96 354 84 396 C 101 380 122 338 143 302 C 150 290 154 281 149 274 Z", fill: "#ffffff", opacity: 0.2 }, root);
    el("path", { d: "M 196 280 C 212 308 232 344 246 378 C 236 376 216 340 202 312 C 196 300 192 288 196 280 Z", fill: "#ffffff", opacity: 0.08 }, root);

    // soft fold lines
    var folds = el("g", { fill: "none", "stroke-width": 3, "stroke-linecap": "round", opacity: 0.3 }, root);
    el("path", { d: "M 165 272 C 163 314 165 362 164 402" }, folds);
    el("path", { d: "M 141 274 C 128 314 108 358 97 396" }, folds);
    el("path", { d: "M 189 274 C 202 314 222 358 233 396" }, folds);

    // scattered satin dots on the skirt
    var dots = el("g", { fill: "#ffffff", opacity: 0.4 }, root);
    [[128, 330, 2.6], [176, 312, 2.2], [214, 356, 2.6], [98, 378, 2.2], [156, 384, 2.4], [238, 396, 2.2], [190, 296, 1.8]].forEach(function (p) {
      el("circle", { cx: p[0], cy: p[1], r: p[2] }, dots);
    });

    // scalloped hem trim (bright)
    var hem = el("path", {
      d: "M 46 410 Q 66 425 86 410 Q 106 425 126 410 Q 146 425 166 410 Q 186 425 206 410 Q 226 425 246 410 Q 266 425 284 410",
      fill: "none", "stroke-width": 5, "stroke-linecap": "round", opacity: 0.9
    }, root);

    /* ---- puff sleeves ---- */
    el("ellipse", { cx: 123, cy: 230, rx: 18, ry: 16, fill: dressFill }, root);
    el("ellipse", { cx: 207, cy: 230, rx: 18, ry: 16, fill: dressFill }, root);
    el("ellipse", { cx: 117, cy: 224, rx: 7, ry: 5.5, fill: "#ffffff", opacity: 0.28 }, root);
    el("ellipse", { cx: 201, cy: 224, rx: 7, ry: 5.5, fill: "#ffffff", opacity: 0.22 }, root);

    /* ---- bodice with sweetheart neckline ---- */
    el("path", {
      d: "M 139 222 Q 152 212 165 222 Q 178 212 191 222 C 193 238 192 252 189 264 Q 165 275 141 264 C 138 252 137 238 139 222 Z",
      fill: dressFill
    }, root);
    var trim = el("path", { d: "M 139 222 Q 152 212 165 222 Q 178 212 191 222", fill: "none", "stroke-width": 3.5, "stroke-linecap": "round", opacity: 0.9 }, root);
    el("path", { d: "M 145 226 C 142 238 142 250 145 260 C 149 250 149 236 145 226 Z", fill: "#ffffff", opacity: 0.18 }, root);

    /* ---- satin sash at the waist ---- */
    var sash = el("path", { d: "M 138 257 Q 165 271 192 257 L 192 268 Q 165 282 138 268 Z" }, root);
    var knot = el("circle", { cx: 165, cy: 270, r: 5.5 }, root);

    /* ---- arms clasped in front ---- */
    var arms = el("g", { fill: "none", stroke: "#f8cda6", "stroke-width": 12, "stroke-linecap": "round" }, root);
    el("path", { d: "M 117 240 C 111 262 120 277 149 284" }, arms);
    el("path", { d: "M 213 240 C 219 262 210 277 181 284" }, arms);
    el("circle", { cx: 152, cy: 285, r: 7.5, fill: skin }, root);
    el("circle", { cx: 178, cy: 285, r: 7.5, fill: skin }, root);

    /* ---- head & face ---- */
    el("ellipse", { cx: 165, cy: 132, rx: 58, ry: 62, fill: skin }, root);

    // brows
    var brows = el("g", { fill: "none", stroke: "#9a6a35", "stroke-width": 4, "stroke-linecap": "round" }, root);
    el("path", { d: "M 128 117 Q 139 110 150 115" }, brows);
    el("path", { d: "M 180 115 Q 191 110 202 117" }, brows);

    // eyes: big irises, white glints, blink via animated clip
    function eye(ex, beginOffset) {
      var clipId = uid("blink");
      var cp = el("clipPath", { id: clipId }, defs);
      var lid = el("ellipse", { cx: ex, cy: 140, rx: 11.5, ry: 13 }, cp);
      el("animate", {
        attributeName: "ry", values: "13;13;1.2;13", keyTimes: "0;0.9;0.945;1",
        dur: "4.6s", begin: beginOffset, repeatCount: "indefinite"
      }, lid);
      var g = el("g", { "clip-path": url(clipId) }, root);
      el("ellipse", { cx: ex, cy: 140, rx: 11.5, ry: 13, fill: "#ffffff" }, g);
      el("circle", { cx: ex, cy: 141, r: 8, fill: "#6b4220" }, g);
      el("circle", { cx: ex, cy: 141, r: 4.6, fill: "#241405" }, g);
      el("circle", { cx: ex - 3, cy: 137, r: 3, fill: "#ffffff" }, g);
      el("circle", { cx: ex + 3.5, cy: 144, r: 1.6, fill: "#ffffff", opacity: 0.85 }, g);
      // lash line
      el("path", { d: "M " + (ex - 11.5) + " 134 Q " + ex + " 124 " + (ex + 11.5) + " 134", fill: "none", stroke: "#3a2410", "stroke-width": 3.5, "stroke-linecap": "round" }, root);
    }
    eye(140, "0s");
    eye(190, "0s");

    // rosy cheeks, button nose, sweet smile
    el("circle", { cx: 114, cy: 165, r: 10, fill: "#ff9bb5", opacity: 0.5 }, root);
    el("circle", { cx: 216, cy: 165, r: 10, fill: "#ff9bb5", opacity: 0.5 }, root);
    el("path", { d: "M 162 156 Q 165 160 168 156", fill: "none", stroke: "#e8a97e", "stroke-width": 3, "stroke-linecap": "round" }, root);
    el("path", { d: "M 151 170 Q 165 183 179 170", fill: "none", stroke: "#b83048", "stroke-width": 4.5, "stroke-linecap": "round" }, root);

    /* ---- front hair: swept bangs + side strands ---- */
    var frontHair = el("g", { fill: hair }, root);
    el("path", {
      d: "M 107 130 C 106 86 130 62 165 62 C 200 62 224 86 223 130" +
        " Q 210 112 196 116 Q 186 96 165 96 Q 144 96 134 116 Q 120 112 107 130 Z"
    }, frontHair);
    el("path", { d: "M 110 106 C 96 148 102 202 92 250 C 87 276 98 292 111 288 C 122 284 123 264 120 244 C 114 204 116 156 124 128 Z" }, frontHair);
    el("path", { d: "M 220 106 C 234 148 228 202 238 250 C 243 276 232 292 219 288 C 208 284 207 264 210 244 C 216 204 214 156 206 128 Z" }, frontHair);
    el("circle", { cx: 102, cy: 284, r: 12 }, frontHair);
    el("circle", { cx: 228, cy: 284, r: 12 }, frontHair);
    // silky highlights
    var hairShine = el("g", { fill: "none", "stroke-linecap": "round" }, root);
    el("path", { d: "M 128 80 Q 163 60 202 80", stroke: "#ffffff", "stroke-width": 6, opacity: 0.22 }, hairShine);
    el("path", { d: "M 114 138 C 108 178 112 216 106 248", stroke: "#c68d4a", "stroke-width": 4, opacity: 0.55 }, hairShine);
    el("path", { d: "M 216 138 C 222 178 218 216 224 248", stroke: "#c68d4a", "stroke-width": 4, opacity: 0.55 }, hairShine);

    dressRefs = { stop1: stop1, stop2: stop2, stop3: stop3, folds: folds, hem: hem, trim: trim, sash: sash, knot: knot };
    paintDress(dress);
  }

  function paintDress(color) {
    if (!dressRefs) return;
    dressRefs.stop1.setAttribute("stop-color", shade(color, 52));
    dressRefs.stop2.setAttribute("stop-color", color);
    dressRefs.stop3.setAttribute("stop-color", shade(color, -42));
    dressRefs.folds.setAttribute("stroke", shade(color, -60));
    dressRefs.hem.setAttribute("stroke", shade(color, 70));
    dressRefs.trim.setAttribute("stroke", shade(color, 70));
    dressRefs.sash.setAttribute("fill", shade(color, -32));
    dressRefs.knot.setAttribute("fill", shade(color, 28));
  }

  /* =========================================================
     ACCESSORY LAYERS (full-frame, transparent)
     each fn gets (svg, defs, g) — g already has the idle bob
     ========================================================= */
  function twinkle(target, dur, begin) {
    el("animate", {
      attributeName: "opacity", values: "0.35;1;0.35",
      dur: dur, begin: begin, repeatCount: "indefinite"
    }, target);
  }

  var ACC = {
    crown: function (svg, defs, g) {
      var gold = url(goldGrad(defs));
      var grp = el("g", { filter: url(glowFilter(defs, 2.5)) }, g);
      // three crisp curved peaks with pearl tips (drawn under the band)
      var peaks = el("g", { fill: gold, stroke: "#d18f1c", "stroke-width": 2, "stroke-linejoin": "round" }, grp);
      el("path", { d: "M 151 84 Q 156 50 165 34 Q 174 50 179 84 Q 165 75 151 84 Z" }, peaks);
      el("path", { d: "M 125 91 Q 127 62 135 47 Q 147 64 152 84 Q 138 80 125 91 Z" }, peaks);
      el("path", { d: "M 205 91 Q 203 62 195 47 Q 183 64 178 84 Q 192 80 205 91 Z" }, peaks);
      el("circle", { cx: 165, cy: 32, r: 5, fill: "#ffe28a", stroke: "#d99a26", "stroke-width": 1.5 }, grp);
      el("circle", { cx: 135, cy: 45, r: 4, fill: "#ffe28a", stroke: "#d99a26", "stroke-width": 1.5 }, grp);
      el("circle", { cx: 195, cy: 45, r: 4, fill: "#ffe28a", stroke: "#d99a26", "stroke-width": 1.5 }, grp);
      // swooping band with a satin shine
      el("path", { d: "M 116 93 Q 165 73 214 93", stroke: "#c9891f", "stroke-width": 13, fill: "none", "stroke-linecap": "round" }, grp);
      el("path", { d: "M 116 93 Q 165 73 214 93", stroke: gold, "stroke-width": 10, fill: "none", "stroke-linecap": "round" }, grp);
      el("path", { d: "M 124 88 Q 165 72 206 88", stroke: "#fff3c4", "stroke-width": 2.5, fill: "none", "stroke-linecap": "round", opacity: 0.8 }, grp);
      // jewels
      el("circle", { cx: 165, cy: 84, r: 8, fill: "#39b7ff", stroke: "#1f86c9", "stroke-width": 1.5 }, grp);
      el("circle", { cx: 162, cy: 81, r: 2.6, fill: "#ffffff", opacity: 0.9 }, grp);
      el("circle", { cx: 138, cy: 90, r: 4.5, fill: "#ff6fae", stroke: "#d14a89", "stroke-width": 1.2 }, grp);
      el("circle", { cx: 192, cy: 90, r: 4.5, fill: "#ff6fae", stroke: "#d14a89", "stroke-width": 1.2 }, grp);
    },

    flower: function (svg, defs, g) {
      var pink = url(pinkGrad(defs));
      var grp = el("g", { transform: "translate(100 100)", filter: url(glowFilter(defs, 1.5)) }, g);
      for (var a = 0; a < 360; a += 60) {
        el("ellipse", { cx: 0, cy: -11, rx: 6.5, ry: 11, fill: pink, transform: "rotate(" + a + ")" }, grp);
      }
      el("circle", { cx: 0, cy: 0, r: 6.5, fill: "#ffe07a", stroke: "#e8b83d", "stroke-width": 1.5 }, grp);
      el("circle", { cx: -2, cy: -2, r: 1.8, fill: "#ffffff", opacity: 0.85 }, grp);
      // little bud below
      el("circle", { cx: 88, cy: 121, r: 4.5, fill: pink }, g);
      el("circle", { cx: 86.5, cy: 119.5, r: 1.4, fill: "#ffffff", opacity: 0.8 }, g);
    },

    necklace: function (svg, defs, g) {
      var gold = url(goldGrad(defs));
      var grp = el("g", { filter: url(glowFilter(defs, 1.2)) }, g);
      el("path", { d: "M 144 218 Q 165 240 186 218", stroke: gold, "stroke-width": 3.5, fill: "none", "stroke-linecap": "round" }, grp);
      // teardrop pendant
      el("path", { d: "M 165 231 C 157 239 157 249 165 253 C 173 249 173 239 165 231 Z", fill: "#39b7ff", stroke: "#1f86c9", "stroke-width": 1.5 }, grp);
      el("circle", { cx: 162.5, cy: 240, r: 1.8, fill: "#ffffff", opacity: 0.9 }, grp);
      // dangly earrings
      [112, 218].forEach(function (ex) {
        el("path", { d: "M " + ex + " 158 L " + ex + " 165", stroke: gold, "stroke-width": 2.5, "stroke-linecap": "round" }, grp);
        el("circle", { cx: ex, cy: 169, r: 4.5, fill: "#ff6fae", stroke: "#d14a89", "stroke-width": 1.2 }, grp);
        el("circle", { cx: ex - 1.4, cy: 167.6, r: 1.3, fill: "#ffffff", opacity: 0.85 }, grp);
      });
    },

    wand: function (svg, defs, g) {
      var gold = url(goldGrad(defs));
      var grp = el("g", { filter: url(glowFilter(defs, 2.5)) }, g);
      el("path", { d: "M 278 188 L 258 122", stroke: gold, "stroke-width": 7, "stroke-linecap": "round" }, grp);
      el("path", { d: "M 274 182 L 259 130", stroke: "#fff3c4", "stroke-width": 2, "stroke-linecap": "round", opacity: 0.7 }, grp);
      el("path", { d: starPath(254, 104, 21, 9, 5), fill: gold, stroke: "#d99a26", "stroke-width": 1.5, "stroke-linejoin": "round" }, grp);
      el("circle", { cx: 249, cy: 100, r: 2.6, fill: "#ffffff", opacity: 0.9 }, grp);
      // trailing twinkles
      var t1 = el("path", { d: sparklePath(230, 88, 7), fill: "#fff4b0" }, grp);
      var t2 = el("path", { d: sparklePath(280, 118, 5.5), fill: "#fff4b0" }, grp);
      twinkle(t1, "1.8s", "0s");
      twinkle(t2, "2.4s", "-0.9s");
    },

    shoes: function (svg, defs, g) {
      var pink = url(pinkGrad(defs));
      [148, 182].forEach(function (sx) {
        el("ellipse", { cx: sx, cy: 421, rx: 14, ry: 7.5, fill: pink, stroke: "#e35ba2", "stroke-width": 1.5 }, g);
        el("ellipse", { cx: sx - 4, cy: 418.5, rx: 4.5, ry: 2.2, fill: "#ffffff", opacity: 0.5 }, g);
        el("circle", { cx: sx, cy: 414.5, r: 3, fill: "#ffe07a", stroke: "#e8b83d", "stroke-width": 1 }, g);
      });
    },

    sparkle1: function (svg, defs, g) { sparkleAt(defs, g, 66, 118, 13, "2.2s", "0s"); },
    sparkle2: function (svg, defs, g) { sparkleAt(defs, g, 272, 226, 11, "2.6s", "-0.8s"); },
    sparkle3: function (svg, defs, g) { sparkleAt(defs, g, 70, 372, 11, "2s", "-1.5s"); }
  };

  function sparkleAt(defs, g, x, y, r, dur, begin) {
    var grp = el("g", { filter: url(glowFilter(defs, 2)) }, g);
    var star = el("path", { d: sparklePath(x, y, r), fill: "#fff4b0", stroke: "#ffd23f", "stroke-width": 1 }, grp);
    var dot = el("circle", { cx: x + r + 4, cy: y - r - 2, r: 2.5, fill: "#fff4b0" }, grp);
    twinkle(star, dur, begin);
    twinkle(dot, dur, "-0.5s");
    el("animateTransform", {
      attributeName: "transform", type: "rotate",
      values: "0 " + x + " " + y + "; 12 " + x + " " + y + "; 0 " + x + " " + y,
      dur: "4s", begin: begin, repeatCount: "indefinite"
    }, star);
  }

  // sparkles float freely; everything worn keeps the shared bob
  var NO_BOB = { sparkle1: true, sparkle2: true, sparkle3: true };

  // where each piece sits, so the pop-in bounce grows from the piece
  var ORIGIN = {
    crown: "50% 15%", flower: "30% 23%", necklace: "50% 53%",
    wand: "78% 30%", shoes: "50% 96%", sparkle: "50% 50%"
  };

  function layer(slot, key) {
    var span = document.createElement("span");
    span.className = "acc";
    span.setAttribute("data-slot", slot);
    span.style.transformOrigin = ORIGIN[slot] || "50% 50%";
    var svg = svgRoot();
    var defs = el("defs", {}, svg);
    var g = el("g", {}, svg);
    if (!NO_BOB[key]) bob(g);
    ACC[key](svg, defs, g);
    span.appendChild(svg);
    return span;
  }

  function setDress(color) {
    currentDress = color || currentDress;
    paintDress(currentDress);
  }

  function build(container, dress) {
    if (!container) return;
    currentDress = dress || currentDress;
    container.innerHTML = "";
    // size is handled by CSS (responsive); SVGs fill the box (see index.html)

    var base = svgRoot();
    base.setAttribute("class", "princess-base");
    base.style.zIndex = "1";
    drawBase(base, currentDress);
    container.appendChild(base);

    container.appendChild(layer("crown", "crown"));
    container.appendChild(layer("flower", "flower"));
    container.appendChild(layer("necklace", "necklace"));
    container.appendChild(layer("wand", "wand"));
    container.appendChild(layer("shoes", "shoes"));
    container.appendChild(layer("sparkle", "sparkle1"));
    container.appendChild(layer("sparkle", "sparkle2"));
    container.appendChild(layer("sparkle", "sparkle3"));
  }

  return { build: build, setDress: setDress };
})();

// Build the art into #princess as soon as this script runs (it sits at the
// end of <body>, so #princess already exists). princess.js then reveals pieces
// and recolours the gown via PrincessArt.setDress().
try { PrincessArt.build(document.getElementById("princess")); } catch (e) { /* ignore */ }
