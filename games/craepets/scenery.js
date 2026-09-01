/* ===========================================================
   Craepets — THE SCENERY.
   -----------------------------------------------------------
   The room your Craepet lives in used to be a two-colour
   gradient with four emoji floating on it, which is why "Mars
   Castle" looked exactly like "Straw Nest" with different
   crayons. This file paints it properly instead.

   Three layers, and each one is drawn the way that layer wants
   to be drawn:

     1. THE WALL AND FLOOR are CSS. They have to meet at exactly
        55% of the scene's height — that is where the Craepet's
        feet are — and only a CSS gradient can promise that at
        every screen shape. Each wall and floor also gets a
        TEXTURE here (bricks, boards, ice facets, star dust), so
        "Grey Stone" reads as stone rather than as grey.

     2. THE VIEW is a real painting, in SVG, seen through a real
        window. The window is a fixed-shape box, so circles stay
        circular however wide the phone is, and the shape of it
        depends on the house: a porthole in space, a gothic arch
        in the palace, a plain sash in the cottage.

     3. THE OUTDOOR PLACES (the Farm, the Well, the Pool, the
        Market, the Arena) get the same treatment as a panorama
        across the top of the scene.

   Everything is inline SVG built from a handful of shared
   pieces, so a new view is a dozen lines, not a new asset — and
   nothing has to be downloaded, which matters on a school wifi.
   =========================================================== */
window.CPArt = (function () {
  "use strict";

  /* =========================================================
     THE PAINT BOX — tiny helpers every scene is built from.
     ========================================================= */
  function el(name, attrs, kids) {
    var out = "<" + name;
    for (var k in attrs) {
      if (attrs[k] === null || attrs[k] === undefined) continue;
      out += " " + k + '="' + attrs[k] + '"';
    }
    return kids === undefined ? out + "/>" : out + ">" + kids + "</" + name + ">";
  }
  function rect(x, y, w, h, fill, extra) {
    var a = { x: x, y: y, width: w, height: h, fill: fill };
    for (var k in extra || {}) a[k] = extra[k];
    return el("rect", a);
  }
  function disc(cx, cy, r, fill, op) {
    return el("circle", { cx: cx, cy: cy, r: r, fill: fill, opacity: op });
  }
  function path(d, fill, op) { return el("path", { d: d, fill: fill, opacity: op }); }
  function line(x1, y1, x2, y2, stroke, w, op) {
    return el("line", { x1: x1, y1: y1, x2: x2, y2: y2, stroke: stroke, "stroke-width": w || 1,
                        "stroke-linecap": "round", opacity: op });
  }
  function poly(points, fill, op) { return el("polygon", { points: points, fill: fill, opacity: op }); }

  /* A vertical gradient, named so two of them never collide. */
  var gradN = 0;
  function vgrad(stops) {
    var id = "cpg" + (++gradN);
    var body = stops.map(function (s) {
      return el("stop", { offset: s[0], "stop-color": s[1], "stop-opacity": s[2] });
    }).join("");
    return { id: id,
      def: el("linearGradient", { id: id, x1: "0", y1: "0", x2: "0", y2: "1" }, body) };
  }
  function defs(inner) { return el("defs", {}, inner); }

  /* A rolling horizon. `pts` is a list of [x, y] tops; the shape is
     closed down to the bottom of the box, so it reads as land. */
  function ridge(pts, y0, fill, op) {
    var d = "M-5," + y0;
    pts.forEach(function (p, i) {
      var prev = i ? pts[i - 1] : [-5, y0];
      var cx = (prev[0] + p[0]) / 2;
      d += " Q" + cx + "," + p[1] + " " + p[0] + "," + p[1];
    });
    // close past the right edge of whichever box this is (120 for a view,
    // 240 for a panorama), or the land stops short and leaves a gap
    var end = Math.max(125, pts[pts.length - 1][0] + 5);
    d += " L" + end + "," + y0 + " L" + end + ",120 L-5,120 Z";
    return path(d, fill, op);
  }
  /* A soft circle of light, for lanterns, torches and spotlights. */
  function glow(cx, cy, r, colour, op) {
    var id = "cpr" + (++gradN);
    return defs(el("radialGradient", { id: id },
        el("stop", { offset: 0, "stop-color": colour, "stop-opacity": op === undefined ? 0.55 : op }) +
        el("stop", { offset: 1, "stop-color": colour, "stop-opacity": 0 }))) +
      disc(cx, cy, r, "url(#" + id + ")");
  }
  /* A row of people in a stand: little heads and shoulders. */
  function crowdRow(x0, y, n, step, seed) {
    var out = "", cols = ["#8f5fc0", "#5f8fc0", "#c05f8f", "#c0a05f", "#5fc09a", "#e07a5f"];
    for (var i = 0; i < n; i++) {
      var x = x0 + i * step + ((i * 7 + seed) % 3) - 1;
      var c = cols[(i + seed) % cols.length];
      out += el("path", { d: "M" + (x - 2.2) + "," + (y + 3) + " q2.2,-3.2 4.4,0 Z", fill: c, opacity: 0.9 }) +
        disc(x, y - 0.6, 1.6, c);
    }
    return out;
  }

  /* A scatter of stars that is the same every time you look at it —
     twinkling randomness on every redraw is a headache, not a sky. */
  function starfield(n, w, h, fill, seed) {
    var out = "", s = seed || 7;
    for (var i = 0; i < n; i++) {
      s = (s * 1103515245 + 12345) % 2147483648;
      var x = (s / 2147483648) * w;
      s = (s * 1103515245 + 12345) % 2147483648;
      var y = (s / 2147483648) * h;
      s = (s * 1103515245 + 12345) % 2147483648;
      var r = 0.25 + (s / 2147483648) * 0.55;
      out += disc(Math.round(x * 10) / 10, Math.round(y * 10) / 10, Math.round(r * 100) / 100,
                  fill || "#fff", 0.5 + r * 0.6);
    }
    return out;
  }
  /* One four-pointed sparkle, for the big obvious stars. */
  function twinkle(x, y, r, fill) {
    return path("M" + x + "," + (y - r) + " Q" + x + "," + y + " " + (x + r) + "," + y +
                " Q" + x + "," + y + " " + x + "," + (y + r) +
                " Q" + x + "," + y + " " + (x - r) + "," + y +
                " Q" + x + "," + y + " " + x + "," + (y - r) + " Z", fill || "#fff", 0.95);
  }
  function cloud(x, y, s, fill, op) {
    return el("g", { opacity: op === undefined ? 0.9 : op, fill: fill || "#fff" },
      disc(x, y, 4 * s) + disc(x + 4.5 * s, y - 1.6 * s, 5.2 * s) +
      disc(x + 9.5 * s, y, 3.6 * s) + rect(x - 0.5, y, 10.5 * s, 4.2 * s, fill || "#fff", { rx: 2 * s }));
  }
  function bird(x, y, s, stroke) {
    return el("path", { d: "M" + x + "," + y + " q" + s + ",-" + s + " " + 2 * s + ",0 q" + s + ",-" + s + " " + 2 * s + ",0",
      fill: "none", stroke: stroke || "#3c4a63", "stroke-width": 0.6, "stroke-linecap": "round", opacity: 0.75 });
  }
  function tree(x, y, s, leaf, trunk) {
    return el("g", {},
      rect(x - 0.7 * s, y - 3 * s, 1.4 * s, 3.2 * s, trunk || "#7a5230", { rx: 0.4 }) +
      disc(x, y - 4.6 * s, 2.4 * s, leaf || "#4f9b52") +
      disc(x - 1.9 * s, y - 3.6 * s, 1.8 * s, leaf || "#4f9b52") +
      disc(x + 1.9 * s, y - 3.6 * s, 1.8 * s, leaf || "#4f9b52"));
  }
  function pine(x, y, s, leaf) {
    return el("g", {},
      rect(x - 0.5, y - 1.6 * s, 1, 1.8 * s, "#6b4a2c") +
      poly(x + "," + (y - 8 * s) + " " + (x + 2.6 * s) + "," + (y - 1.4 * s) + " " + (x - 2.6 * s) + "," + (y - 1.4 * s), leaf || "#2f7048") +
      poly(x + "," + (y - 10 * s) + " " + (x + 2 * s) + "," + (y - 4.6 * s) + " " + (x - 2 * s) + "," + (y - 4.6 * s), leaf || "#2f7048"));
  }
  /* A little building: body, roof, one lit window. */
  function hut(x, y, w, h, wall, roof, lit) {
    return el("g", {},
      rect(x - w / 2, y - h, w, h, wall) +
      poly((x - w / 2 - 1) + "," + (y - h) + " " + x + "," + (y - h - w * 0.55) + " " + (x + w / 2 + 1) + "," + (y - h), roof) +
      rect(x - w * 0.16, y - h * 0.62, w * 0.32, h * 0.34, lit || "#ffe6a3", { rx: 0.4 }));
  }
  /* A tower with battlements — the piece every castle in here is made of. */
  function tower(x, y, w, h, wall, dark, flag) {
    var merlons = "";
    for (var i = 0; i < 4; i++) merlons += rect(x - w / 2 + i * (w / 4), y - h - w * 0.22, w / 7, w * 0.24, wall);
    return el("g", {},
      rect(x - w / 2, y - h, w, h, wall) +
      rect(x - w / 2, y - h, w * 0.32, h, dark, { opacity: 0.18 }) +
      merlons +
      rect(x - w * 0.14, y - h * 0.55, w * 0.28, h * 0.3, dark, { rx: w * 0.14 }) +
      (flag ? line(x, y - h - w * 0.2, x, y - h - w * 0.95, dark, 0.5) +
              poly(x + "," + (y - h - w * 0.95) + " " + (x + w * 0.45) + "," + (y - h - w * 0.78) + " " +
                   x + "," + (y - h - w * 0.6), flag) : ""));
  }

  /* =========================================================
     THE VIEWS — what you can see out of the window.
     Every painter draws into a 120 x 90 box. The important
     thing goes in the MIDDLE, because a tall thin window on a
     small phone crops the sides.
     ========================================================= */
  var V = {};

  V.none = function () {
    return rect(0, 0, 120, 90, "#e9e4f2") +
      rect(0, 0, 120, 90, "#fff", { opacity: 0.25 }) +
      el("text", { x: 60, y: 50, "text-anchor": "middle", "font-size": 9, fill: "#b9b1cd" }, "shutters closed");
  };

  V.windowsun = function () {
    var g = vgrad([[0, "#8fd3ff"], [0.6, "#cdeeff"], [1, "#eafaff"]]);
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      disc(88, 20, 11, "#ffe27a") + disc(88, 20, 15, "#ffe27a", 0.28) +
      ridge([[20, 62], [55, 58], [95, 64], [120, 60]], 62, "#8ecf74") +
      ridge([[30, 72], [70, 68], [120, 74]], 72, "#6fb85c") +
      cloud(18, 26, 1, "#fff", 0.95) + cloud(58, 16, 0.7, "#fff", 0.8) +
      bird(38, 36, 2.2) + bird(52, 30, 1.7) +
      tree(24, 74, 1.5, "#4f9b52") + tree(100, 76, 1.2, "#57a85c");
  };

  V.garden = function () {
    var g = vgrad([[0, "#a8e0ff"], [1, "#e8f8e6"]]);
    var flowers = "";
    [[12, 78, "#ff6ec7"], [26, 82, "#ffd400"], [42, 79, "#ff8c1a"], [58, 84, "#e8384f"],
     [74, 80, "#8a3ffc"], [90, 83, "#ff6ec7"], [106, 79, "#ffd400"]].forEach(function (f) {
      flowers += line(f[0], f[1], f[0], f[1] - 7, "#4f9b52", 0.9) +
        disc(f[0], f[1] - 8, 2.6, f[2]) + disc(f[0], f[1] - 8, 1, "#fff8d0");
    });
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      disc(100, 16, 9, "#ffe27a", 0.9) +
      cloud(22, 20, 0.8) +
      ridge([[30, 58], [80, 55], [120, 60]], 58, "#bfe6a8") +
      ridge([[20, 68], [70, 66], [120, 70]], 68, "#8ed07a") +
      tree(16, 70, 1.6, "#4f9b52") + tree(104, 72, 1.3, "#5fae62") +
      flowers +
      el("g", {}, path("M52,44 q3,-4 6,0 q-3,4 -6,0 Z", "#ff9ad5") + path("M58,44 q3,-4 6,0 q-3,4 -6,0 Z", "#ff9ad5") +
        line(58, 42, 58, 47, "#8a5a2b", 0.5));
  };

  V.stars = function () {
    var g = vgrad([[0, "#101a3c"], [0.65, "#2b3566"], [1, "#4a4f87"]]);
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      starfield(70, 120, 70, "#fff", 11) +
      disc(90, 22, 10, "#fff5cf") + disc(85, 19, 9, "#2b3566") +
      twinkle(26, 20, 4, "#fff6c9") + twinkle(56, 34, 2.6, "#dfe8ff") + twinkle(104, 48, 2, "#fff") +
      ridge([[24, 70], [64, 66], [120, 72]], 70, "#1b2247") +
      pine(16, 74, 1, "#141b3a") + pine(30, 76, 0.8, "#141b3a") + pine(102, 75, 0.9, "#141b3a");
  };

  V.rainstorm = function () {
    var g = vgrad([[0, "#5d6a86"], [1, "#98a6bd"]]);
    var rain = "";
    for (var i = 0; i < 46; i++) {
      var x = (i * 37) % 124, y = (i * 53) % 88;
      rain += line(x, y, x - 2, y + 6, "#dff1ff", 0.7, 0.55);
    }
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      cloud(20, 18, 1.2, "#7c879e", 1) + cloud(62, 12, 1.5, "#6d788f", 1) + cloud(100, 22, 1, "#828da3", 1) +
      rain +
      ridge([[30, 68], [80, 66], [120, 70]], 68, "#5e7160") +
      el("g", { opacity: 0.6 }, path("M0,80 q30,-4 60,0 q30,4 60,0 L120,90 L0,90 Z", "#8fb6c9")) +
      disc(40, 84, 2.2, "#cfe9f5", 0.7) + disc(78, 86, 1.6, "#cfe9f5", 0.7);
  };

  V.rainbowview = function () {
    var g = vgrad([[0, "#bfe8ff"], [1, "#fdf3ff"]]);
    var bow = "", cols = ["#e8384f", "#ff8c1a", "#ffd400", "#2fbf4f", "#2b7fff", "#8a3ffc"];
    cols.forEach(function (c, i) {
      bow += el("path", { d: "M6," + (86) + " A" + (54 - i * 3) + "," + (54 - i * 3) + " 0 0 1 " + (114) + "," + 86,
        fill: "none", stroke: c, "stroke-width": 3.4, opacity: 0.9,
        transform: "translate(0," + i * 3.4 + ")" });
    });
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      bow +
      cloud(12, 60, 1.1) + cloud(96, 58, 1.1) +
      ridge([[40, 78], [90, 76], [120, 80]], 78, "#8ed07a") +
      disc(96, 16, 7, "#ffe27a", 0.85);
  };

  V.mountains = function () {
    var g = vgrad([[0, "#9fd0f0"], [0.7, "#dff0fb"], [1, "#f6fbff"]]);
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      disc(24, 18, 8, "#fff0c2", 0.9) +
      poly("14,74 42,26 70,74", "#8a9ec2") + poly("32,74 42,26 52,74", "#a8bad9", 0.6) +
      poly("34,40 42,26 50,40", "#ffffff") +
      poly("58,74 88,34 118,74", "#7d92b8") + poly("78,74 88,34 98,74", "#9db0d0", 0.55) +
      poly("81,45 88,34 95,45", "#ffffff") +
      poly("-6,74 16,44 40,74", "#6d82a8") +
      ridge([[30, 76], [80, 74], [120, 78]], 76, "#6ea86a") +
      bird(50, 22, 2.4) + bird(64, 16, 1.8) + cloud(96, 20, 0.8, "#fff", 0.85);
  };

  V.sea = function () {
    var g = vgrad([[0, "#8fd3ff"], [0.55, "#d6f1ff"], [1, "#eafaff"]]);
    var sea = vgrad([[0, "#3fa9dd"], [1, "#1c6fa8"]]);
    var waves = "";
    for (var i = 0; i < 5; i++) {
      waves += el("path", { d: "M0," + (62 + i * 6) + " q15,-2.6 30,0 t30,0 t30,0 t30,0",
        fill: "none", stroke: "#ffffff", "stroke-width": 0.7, opacity: 0.45 });
    }
    return defs(g.def + sea.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      disc(94, 18, 9, "#ffe9a8") +
      rect(0, 58, 120, 32, "url(#" + sea.id + ")") + waves +
      el("g", {}, line(40, 58, 40, 42, "#5b4326", 0.9) +
        poly("40,42 40,57 27,57", "#fffdf6") + poly("42,45 42,57 54,57", "#ffe3b0") +
        path("M30,58 q10,4 22,0 q-3,4 -11,4 q-8,0 -11,-4 Z", "#c0552f")) +
      path("M88,66 q4,-6 8,0 q-4,3 -8,0 Z", "#7fd4ff") +
      disc(92, 62, 1.2, "#eafaff", 0.8) + cloud(16, 16, 0.9);
  };

  V.forest = function () {
    var g = vgrad([[0, "#cfe9c8"], [1, "#f2f8e8"]]);
    var beams = el("g", { opacity: 0.35 },
      poly("30,0 46,0 26,90 6,90", "#fff8c8") + poly("70,0 80,0 66,90 52,90", "#fff8c8"));
    var trunks = "";
    [[10, 1.5], [30, 1.1], [52, 1.35], [76, 1], [98, 1.4], [114, 0.9]].forEach(function (t) {
      trunks += pine(t[0], 80, t[1], t[1] > 1.2 ? "#2f7048" : "#3d8a58");
    });
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      ridge([[30, 40], [80, 36], [120, 42]], 40, "#5f9c66", 0.55) +
      beams + trunks +
      ridge([[30, 82], [80, 80], [120, 84]], 82, "#6aa864") +
      el("g", {}, disc(64, 74, 2.4, "#a9743f") + disc(66, 71, 1.6, "#a9743f") +
        poly("62,70 66,64 70,70", "#8a5a2b")) +
      disc(20, 60, 1.4, "#ffd6ec", 0.9) + disc(90, 66, 1.2, "#ffd6ec", 0.9);
  };

  V.city = function () {
    var g = vgrad([[0, "#2f3763"], [0.6, "#7a5f8f"], [1, "#ffb27a"]]);
    var blocks = "", wins = "";
    [[6, 34, 14], [22, 46, 12], [36, 26, 16], [54, 40, 13], [69, 18, 15], [86, 38, 14], [102, 30, 16]]
      .forEach(function (b, i) {
        blocks += rect(b[0], 90 - b[1] - 14, b[2], b[1] + 14, i % 2 ? "#2c2a4a" : "#39355c");
        for (var r = 0; r < Math.floor(b[1] / 7); r++) {
          for (var c = 0; c < 3; c++) {
            if ((r * 3 + c + i) % 3 === 0) continue;
            wins += rect(b[0] + 2 + c * (b[2] - 4) / 3, 90 - b[1] - 10 + r * 7, 2.2, 3, "#ffd98a", { opacity: 0.9 });
          }
        }
      });
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      disc(96, 60, 7, "#ffdc94", 0.85) +
      starfield(26, 120, 34, "#fff", 3) +
      blocks + wins +
      rect(0, 84, 120, 6, "#1e1c36");
  };

  V.balloons = function () {
    var g = vgrad([[0, "#8ecdff"], [0.7, "#d9f0ff"], [1, "#fff2d8"]]);
    function balloon(x, y, s, a, b) {
      return el("g", {},
        path("M" + x + "," + (y - 9 * s) + " a" + 6 * s + "," + 7 * s + " 0 1 0 0.01,0 Z", a) +
        path("M" + (x - 6 * s) + "," + (y - 8 * s) + " q" + 6 * s + "," + 12 * s + " " + 12 * s + ",0 Z", b, 0.55) +
        line(x - 2 * s, y - 2.4 * s, x - 1.2 * s, y, "#7a5230", 0.5) +
        line(x + 2 * s, y - 2.4 * s, x + 1.2 * s, y, "#7a5230", 0.5) +
        rect(x - 2 * s, y, 4 * s, 3 * s, "#a9743f", { rx: 0.6 }));
    }
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      cloud(10, 62, 1.1, "#fff", 0.8) + cloud(74, 70, 1.4, "#fff", 0.75) + cloud(104, 52, 0.8, "#fff", 0.7) +
      balloon(34, 40, 1.5, "#e8384f", "#ffd400") +
      balloon(78, 26, 1.1, "#2b7fff", "#8a3ffc") +
      balloon(100, 56, 0.8, "#2fbf4f", "#ffd400") +
      bird(18, 24, 2) + bird(56, 16, 1.6);
  };

  V.fireflies = function () {
    var g = vgrad([[0, "#1d2a4a"], [0.7, "#31456b"], [1, "#4c5f7f"]]);
    var flies = "";
    [[16, 40], [30, 62], [46, 34], [58, 54], [70, 44], [84, 66], [96, 38], [108, 58], [24, 74], [90, 78]]
      .forEach(function (f, i) {
        flies += disc(f[0], f[1], 3.2, "#ffe98a", 0.16) + disc(f[0], f[1], 1.6, "#fff6b8", 0.45) +
                 disc(f[0], f[1], 0.8, "#fffde0", 0.95 - (i % 3) * 0.15);
      });
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      starfield(30, 120, 40, "#cfe0ff", 5) +
      ridge([[30, 72], [78, 68], [120, 74]], 72, "#16223d") +
      pine(12, 78, 1.1, "#101a33") + pine(104, 80, 1, "#101a33") +
      path("M0,84 q30,-3 60,0 q30,3 60,0 L120,90 L0,90 Z", "#22406b", 0.9) +
      flies;
  };

  V.aurora = function () {
    var g = vgrad([[0, "#0d1636"], [0.7, "#1b2a51"], [1, "#3a4a75"]]);
    function ribbon(y, h, col, op) {
      return el("path", { d: "M-10," + y + " q30,-" + h + " 60,0 t70,-" + h * 0.6,
        fill: "none", stroke: col, "stroke-width": h * 0.9, opacity: op, "stroke-linecap": "round" });
    }
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      starfield(60, 120, 60, "#fff", 17) +
      ribbon(30, 14, "#3ddc84", 0.35) + ribbon(38, 10, "#7bf0c0", 0.3) +
      ribbon(24, 8, "#8a5cff", 0.28) + ribbon(46, 7, "#3ddc84", 0.22) +
      ridge([[26, 70], [70, 64], [120, 72]], 70, "#e8f2ff", 0.9) +
      ridge([[40, 80], [90, 78], [120, 82]], 80, "#cfe0f5") +
      poly("18,72 30,54 42,72", "#f4f9ff") + poly("74,70 88,50 102,70", "#eaf3ff");
  };

  V.volcano = function () {
    var g = vgrad([[0, "#2b1b2e"], [0.55, "#7c3b3b"], [1, "#e2703a"]]);
    var sparks = "";
    for (var i = 0; i < 14; i++) {
      var x = 52 + ((i * 29) % 30) - 15, y = 18 + ((i * 17) % 22);
      sparks += disc(x, y, 0.7 + (i % 3) * 0.3, i % 2 ? "#ffd166" : "#ff8a4c", 0.9);
    }
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      starfield(22, 120, 26, "#ffd9b0", 9) +
      cloud(30, 16, 1.3, "#5b4046", 0.75) + cloud(84, 12, 1, "#5b4046", 0.6) +
      poly("18,78 56,22 94,78", "#3a2430") +
      poly("46,30 56,22 66,30 62,78 50,78", "#4d2f36") +
      path("M48,30 q8,-6 16,0 q-2,14 -6,22 q-6,-8 -10,-22 Z", "#ff6b35") +
      path("M52,30 q4,-3 8,0 q-1,10 -3,16 q-3,-6 -5,-16 Z", "#ffd166") +
      sparks +
      ridge([[30, 80], [80, 78], [120, 82]], 80, "#2a1a22") +
      rect(0, 84, 120, 6, "#ff7a3c", { opacity: 0.35 });
  };

  V.jungle = function () {
    var g = vgrad([[0, "#2f6b4f"], [0.6, "#63a86f"], [1, "#c9e6b0"]]);
    function leaf(x, y, s, rot, col) {
      return el("path", { d: "M0,0 q" + 9 * s + ",-" + 5 * s + " " + 18 * s + ",0 q-" + 9 * s + "," + 6 * s + " -" + 18 * s + ",0 Z",
        fill: col, transform: "translate(" + x + "," + y + ") rotate(" + rot + ")", opacity: 0.95 });
    }
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      el("g", { opacity: 0.3 }, poly("34,0 50,0 30,90 12,90", "#eaffd0")) +
      leaf(-4, 8, 1.1, 18, "#2c6b47") + leaf(96, 4, 1.2, -14, "#2c6b47") +
      leaf(10, 26, 0.8, -22, "#3a8055") + leaf(84, 30, 0.9, 26, "#3a8055") +
      ridge([[30, 58], [80, 54], [120, 60]], 58, "#4d8f5f") +
      el("g", {}, line(56, 60, 56, 26, "#7a5230", 1.2) +
        leaf(48, 26, 0.7, -30, "#5cb46a") + leaf(56, 24, 0.7, 12, "#5cb46a")) +
      el("g", {}, disc(92, 46, 3.2, "#ffd400") + disc(92, 46, 1.4, "#e8384f") +
        line(92, 49, 92, 56, "#4d8f5f", 0.8)) +
      ridge([[40, 74], [90, 72], [120, 76]], 74, "#6fb072") +
      el("g", {}, path("M22,72 q4,-8 8,0 q-4,3 -8,0 Z", "#ff8c1a") + disc(26, 66, 2, "#2b7fff") +
        line(26, 68, 26, 72, "#8a5a2b", 0.6));
  };

  V.underwater = function () {
    var g = vgrad([[0, "#2f8fc4"], [0.6, "#1d6ea3"], [1, "#0e4a76"]]);
    var beams = el("g", { opacity: 0.18 }, poly("18,0 34,0 20,90 0,90", "#ffffff") + poly("70,0 82,0 74,90 56,90", "#ffffff"));
    var bubbles = "";
    [[16, 60, 1.4], [22, 48, 0.9], [18, 38, 1.1], [96, 66, 1.2], [102, 54, 0.8], [98, 44, 1]]
      .forEach(function (b) { bubbles += el("circle", { cx: b[0], cy: b[1], r: b[2], fill: "none", stroke: "#cdf1ff", "stroke-width": 0.5, opacity: 0.8 }); });
    function fish(x, y, s, col) {
      return el("g", {}, el("ellipse", { cx: x, cy: y, rx: 4 * s, ry: 2.4 * s, fill: col }) +
        poly((x + 3.6 * s) + "," + y + " " + (x + 6.5 * s) + "," + (y - 2.4 * s) + " " + (x + 6.5 * s) + "," + (y + 2.4 * s), col) +
        disc(x - 2 * s, y - 0.5 * s, 0.5 * s, "#08324f"));
    }
    var weed = "";
    [12, 20, 100, 108].forEach(function (x, i) {
      weed += el("path", { d: "M" + x + ",90 q-4,-10 0,-18 q4,-8 0,-16", fill: "none",
        stroke: i % 2 ? "#2f8f5e" : "#3fa86c", "stroke-width": 2, "stroke-linecap": "round" });
    });
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") + beams +
      ridge([[30, 76], [80, 74], [120, 78]], 76, "#c9a86a") +
      weed + bubbles +
      fish(44, 40, 1.2, "#ffb347") + fish(78, 56, 0.9, "#ff6ec7") + fish(60, 68, 0.7, "#ffd400") +
      el("g", {}, disc(96, 78, 4, "#ff8c6b") +
        line(93, 80, 90, 86, "#ff8c6b", 1.4) + line(99, 80, 102, 86, "#ff8c6b", 1.4) +
        disc(94.5, 77, 0.6, "#3a2030") + disc(97.5, 77, 0.6, "#3a2030"));
  };

  V.castle = function () {
    var g = vgrad([[0, "#a9d8ff"], [0.65, "#dff0ff"], [1, "#f4fbe8"]]);
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      disc(20, 18, 8, "#fff0b8", 0.9) + cloud(38, 14, 0.9) + cloud(96, 22, 0.7) +
      ridge([[30, 62], [78, 56], [120, 64]], 62, "#9ecb8e") +
      el("g", {},
        rect(48, 40, 26, 24, "#d8d2e6") +
        rect(48, 40, 26, 4, "#c2bbd6") +
        tower(44, 64, 11, 30, "#e6e1f2", "#8f86ad", "#e8384f") +
        tower(78, 64, 11, 26, "#e6e1f2", "#8f86ad", "#2b7fff") +
        tower(61, 64, 13, 34, "#efeaf8", "#8f86ad", "#ffd400") +
        rect(57, 52, 8, 12, "#6b5f88", { rx: 4 }) +
        rect(50, 44, 3, 5, "#6b5f88", { rx: 1.5 }) + rect(70, 44, 3, 5, "#6b5f88", { rx: 1.5 })) +
      ridge([[40, 76], [90, 74], [120, 78]], 76, "#7fb96f") +
      path("M52,90 q8,-14 9,-26 q1,12 9,26 Z", "#c7a06a", 0.9) +
      bird(26, 32, 2.2) + bird(94, 38, 1.7) + tree(14, 80, 1.3) + tree(108, 82, 1.1);
  };

  V.dragonview = function () {
    var g = vgrad([[0, "#3c2a52"], [0.55, "#a4557a"], [1, "#ffb87a"]]);
    function dragon(x, y, s) {
      return el("g", { transform: "translate(" + x + "," + y + ") scale(" + s + ")", fill: "#2b1c3a" },
        path("M0,0 q10,-4 20,-1 q6,1 10,5 q-8,1 -12,4 q-9,4 -18,-1 Z", "#2b1c3a") +
        path("M6,-1 q6,-13 18,-14 q-4,10 -3,15 Z", "#3b2750") +
        path("M8,2 q7,10 19,9 q-8,-7 -9,-12 Z", "#3b2750") +
        path("M28,3 q7,-2 12,-8 q-1,8 -8,11 Z", "#2b1c3a") +
        disc(1.5, -1.5, 1, "#ffd166"));
    }
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      disc(24, 24, 10, "#ffd9a0", 0.85) +
      cloud(78, 18, 1.1, "#e0aecb", 0.55) + cloud(16, 46, 0.9, "#e0aecb", 0.4) +
      poly("-6,80 26,32 58,80", "#5c3f66") + poly("46,80 82,24 118,80", "#4a3357") +
      poly("74,42 82,24 90,42", "#f0e2ef") +
      dragon(44, 40, 1.15) +
      ridge([[40, 82], [90, 80], [120, 84]], 82, "#3a2745") +
      starfield(16, 120, 20, "#ffe9c9", 23);
  };

  V.planets = function () {
    var g = vgrad([[0, "#0a0f2c"], [0.7, "#1d1b48"], [1, "#332a5e"]]);
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      starfield(90, 120, 90, "#fff", 31) +
      el("g", {}, disc(38, 34, 15, "#e8a35c") +
        el("ellipse", { cx: 38, cy: 34, rx: 15, ry: 5, fill: "none", stroke: "#f0d6a8", "stroke-width": 1.6, opacity: 0.55, transform: "rotate(-18 38 34)" }) +
        el("ellipse", { cx: 38, cy: 34, rx: 22, ry: 7, fill: "none", stroke: "#ffe6b8", "stroke-width": 2.4, opacity: 0.85, transform: "rotate(-18 38 34)" }) +
        path("M26,30 q12,4 24,0 q-12,3 -24,0 Z", "#c98a48", 0.8)) +
      disc(90, 62, 9, "#7fb2ff") + path("M83,60 q6,-4 12,0 q-4,4 -12,2 Z", "#3f6fd0", 0.8) +
      disc(104, 26, 4.5, "#c96f5c") + disc(103, 25, 1.4, "#a4513f", 0.8) +
      twinkle(70, 18, 3.4, "#fff6c9") + twinkle(20, 68, 2.4, "#dfe8ff") +
      el("g", { transform: "translate(64,74) rotate(-16)" },
        rect(0, 0, 9, 3, "#cfd6e6", { rx: 1 }) + rect(-4, 0.6, 4, 1.8, "#8f97ad") +
        rect(2, -3, 5, 3, "#5b7fd6") + rect(2, 3, 5, 3, "#5b7fd6"));
  };

  /* The one the whole game builds towards: a castle, on Mars, with
     both little moons out. It should look like somewhere. */
  V.marsview = function () {
    var g = vgrad([[0, "#c98a63"], [0.45, "#e8b183"], [0.75, "#f6d3ae"], [1, "#e2a071"]]);
    var dust = "";
    for (var i = 0; i < 30; i++) {
      var x = (i * 41) % 122, y = 52 + ((i * 23) % 34);
      dust += disc(x, y, 0.5 + (i % 3) * 0.25, "#fff0dd", 0.25);
    }
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      /* a small, pale sun — the Sun is half the size from Mars */
      disc(96, 16, 5, "#fff3d6", 0.95) + disc(96, 16, 9, "#ffe9c0", 0.25) +
      /* Phobos, close and lumpy; Deimos, far and small */
      el("g", {}, disc(28, 18, 6.5, "#b9a48f") + disc(25, 16, 1.7, "#9c8672", 0.85) +
        disc(31, 21, 1.1, "#9c8672", 0.8) + disc(29, 14, 0.8, "#9c8672", 0.7)) +
      el("g", {}, disc(58, 12, 2.6, "#c8b6a2") + disc(57, 11, 0.8, "#a8968a", 0.8)) +
      /* Olympus Mons on the far horizon */
      poly("-10,54 26,34 70,54", "#b06a49", 0.75) +
      poly("60,54 92,38 124,54", "#a85f42", 0.7) +
      /* the dune fields */
      ridge([[30, 56], [76, 53], [120, 58]], 56, "#c4714c") +
      ridge([[26, 66], [74, 63], [120, 68]], 66, "#d8895d") +
      ridge([[40, 78], [92, 76], [120, 80]], 78, "#e6a172") +
      dust +
      /* the castle itself, red stone, banners flying */
      el("g", {},
        rect(44, 46, 30, 20, "#8f4a34") + rect(44, 46, 30, 3.4, "#7d3f2c") +
        tower(40, 66, 11, 26, "#a3583d", "#5e2f20", "#ffd166") +
        tower(78, 66, 11, 22, "#a3583d", "#5e2f20", "#3ddc84") +
        tower(59, 66, 13, 31, "#b0603f", "#5e2f20", "#ff6ec7") +
        rect(55, 56, 8, 10, "#5e2f20", { rx: 4 }) +
        rect(47, 50, 3, 4, "#5e2f20", { rx: 1.5 }) + rect(68, 50, 3, 4, "#5e2f20", { rx: 1.5 }) +
        /* a glass dome on the keep, because you have to breathe */
        el("path", { d: "M46,46 a13,13 0 0 1 26,0 Z", fill: "#bfe6ff", opacity: 0.32 }) +
        el("path", { d: "M46,46 a13,13 0 0 1 26,0", fill: "none", stroke: "#dff3ff", "stroke-width": 0.7, opacity: 0.8 })) +
      /* rover tracks running off to the left */
      el("g", { opacity: 0.4 },
        el("path", { d: "M4,86 q22,-6 40,-10", fill: "none", stroke: "#a85f42", "stroke-width": 1, "stroke-dasharray": "2 2" }) +
        el("path", { d: "M4,89 q22,-6 40,-10", fill: "none", stroke: "#a85f42", "stroke-width": 1, "stroke-dasharray": "2 2" })) +
      disc(14, 80, 2.4, "#8f4a34", 0.6) + disc(104, 84, 3, "#8f4a34", 0.5);
  };

  V.earthrise = function () {
    var g = vgrad([[0, "#03040f"], [0.75, "#0a0c1e"], [1, "#151a33"]]);
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      starfield(80, 120, 66, "#fff", 41) +
      el("g", {},
        disc(70, 34, 15, "#2f6fd0") +
        path("M58,30 q8,-5 16,-2 q6,2 4,6 q-8,1 -12,4 q-8,2 -8,-8 Z", "#4f9b52") +
        path("M66,44 q8,-3 14,1 q-6,5 -14,3 Z", "#4f9b52") +
        disc(70, 34, 15, "#bfe6ff", 0.16) +
        el("path", { d: "M70,19 a15,15 0 0 1 0,30", fill: "#000", opacity: 0.28 })) +
      ridge([[24, 74], [70, 70], [120, 76]], 74, "#8f8f9c") +
      ridge([[40, 84], [92, 82], [120, 86]], 84, "#a3a3ad") +
      el("g", { opacity: 0.5 }, disc(20, 80, 3.4, "#7a7a86") + disc(52, 86, 2.4, "#7a7a86") + disc(98, 82, 4, "#7a7a86")) +
      el("g", { transform: "translate(16,26) rotate(-12)" },
        rect(0, 0, 8, 2.6, "#dfe4ee", { rx: 0.8 }) +
        rect(-5, 0.2, 5, 2.2, "#9aa0b4") + rect(1.5, -3.4, 5, 3.2, "#5b7fd6") + rect(1.5, 2.8, 5, 3.2, "#5b7fd6")) +
      el("g", {}, poly("40,90 44,72 48,90", "#d8d8e2", 0.35));
  };

  V.galaxyview = function () {
    var g = vgrad([[0, "#05030f"], [0.6, "#160f34"], [1, "#2a1550"]]);
    var arms = "";
    for (var i = 0; i < 3; i++) {
      arms += el("path", { d: "M60,40 q" + (18 + i * 8) + ",-" + (10 + i * 4) + " " + (30 + i * 9) + "," + (4 + i * 3),
        fill: "none", stroke: i % 2 ? "#9b7bff" : "#6fd0ff", "stroke-width": 5 - i, opacity: 0.35,
        transform: "rotate(" + i * 120 + " 60 40)", "stroke-linecap": "round" });
      arms += el("path", { d: "M60,40 q-" + (18 + i * 8) + "," + (10 + i * 4) + " -" + (30 + i * 9) + ",-" + (4 + i * 3),
        fill: "none", stroke: i % 2 ? "#ff9ad5" : "#8fb4ff", "stroke-width": 5 - i, opacity: 0.32,
        transform: "rotate(" + i * 120 + " 60 40)", "stroke-linecap": "round" });
    }
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      starfield(110, 120, 90, "#fff", 53) +
      el("ellipse", { cx: 60, cy: 40, rx: 46, ry: 22, fill: "#7a5fd0", opacity: 0.14, transform: "rotate(-14 60 40)" }) +
      el("g", { transform: "rotate(-14 60 40)" }, arms) +
      disc(60, 40, 8, "#fff6d0", 0.9) + disc(60, 40, 14, "#ffe9a8", 0.25) +
      twinkle(22, 20, 4, "#fff") + twinkle(100, 68, 3.2, "#dfe8ff") + twinkle(96, 18, 2.4, "#ffd6ec");
  };

  /* ---------- new views, added with the new art ---------- */

  V.desert = function () {
    var g = vgrad([[0, "#ffd08a"], [0.55, "#ffe6b8"], [1, "#fff2d0"]]);
    function cactus(x, y, s) {
      return el("g", { fill: "#3f8f5c" },
        rect(x - 1.4 * s, y - 12 * s, 2.8 * s, 12 * s, "#3f8f5c", { rx: 1.4 * s }) +
        rect(x - 5 * s, y - 9 * s, 2 * s, 5 * s, "#3f8f5c", { rx: 1 * s }) +
        rect(x - 5 * s, y - 9 * s, 4 * s, 1.8 * s, "#3f8f5c", { rx: 0.9 * s }) +
        rect(x + 3 * s, y - 11 * s, 2 * s, 6 * s, "#3f8f5c", { rx: 1 * s }) +
        rect(x + 1.4 * s, y - 6.8 * s, 4 * s, 1.8 * s, "#3f8f5c", { rx: 0.9 * s }));
    }
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      disc(60, 26, 11, "#ffb15c", 0.9) + disc(60, 26, 17, "#ffc97a", 0.25) +
      ridge([[28, 58], [74, 55], [120, 60]], 58, "#e8b071") +
      ridge([[34, 70], [86, 67], [120, 72]], 70, "#dda05f") +
      ridge([[40, 82], [92, 80], [120, 84]], 82, "#cf9152") +
      cactus(24, 74, 1.2) + cactus(98, 80, 0.9) + cactus(48, 68, 0.6) +
      el("g", { opacity: 0.5 }, disc(76, 78, 2.6, "#c98a52") + disc(14, 84, 2, "#c98a52")) +
      bird(84, 22, 2) + bird(96, 30, 1.5);
  };

  V.savanna = function () {
    var g = vgrad([[0, "#ff9e5c"], [0.4, "#ffc98a"], [1, "#ffe6b0"]]);
    function acacia(x, y, s) {
      return el("g", {},
        rect(x - 0.7 * s, y - 9 * s, 1.4 * s, 9 * s, "#5b3f28") +
        path("M" + (x - 9 * s) + "," + (y - 9 * s) + " q" + 9 * s + ",-" + 6 * s + " " + 18 * s + ",0 q-" + 9 * s + "," + 2.4 * s + " -" + 18 * s + ",0 Z", "#3f6b3c"));
    }
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      disc(62, 44, 14, "#ff7a3c", 0.9) +
      ridge([[30, 62], [80, 60], [120, 64]], 62, "#b0813f") +
      ridge([[40, 74], [92, 72], [120, 76]], 74, "#966c33") +
      acacia(22, 68, 1.5) + acacia(100, 74, 1.1) +
      el("g", { fill: "#4a3218" },
        path("M52,74 q3,-6 8,-6 q6,0 8,5 l-1,6 h-3 l-1,-4 h-6 l-1,4 h-3 Z") +
        path("M66,68 q4,-4 6,0 q-2,3 -6,2 Z")) +
      bird(34, 26, 2.2) + bird(48, 20, 1.7) + bird(88, 30, 1.9);
  };

  V.snowfield = function () {
    var g = vgrad([[0, "#c6ddf0"], [0.6, "#e6f1fb"], [1, "#f8fcff"]]);
    var flakes = "";
    for (var i = 0; i < 40; i++) {
      var x = (i * 47) % 122, y = (i * 31) % 88;
      flakes += disc(x, y, 0.6 + (i % 3) * 0.3, "#ffffff", 0.85);
    }
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      poly("-6,66 26,34 58,66", "#b9cddd") + poly("48,66 82,30 116,66", "#a9c0d4") +
      poly("70,42 82,30 94,42", "#ffffff") + poly("16,44 26,34 36,44", "#ffffff") +
      ridge([[30, 68], [80, 66], [120, 70]], 68, "#eef6ff") +
      pine(14, 74, 1.2, "#2f6b52") + pine(30, 78, 0.9, "#2f6b52") + pine(104, 76, 1, "#2f6b52") +
      el("g", {}, disc(62, 76, 4.4, "#ffffff") + disc(62, 68, 3.2, "#ffffff") +
        disc(60.8, 67, 0.5, "#3a3a4a") + disc(63.2, 67, 0.5, "#3a3a4a") +
        poly("63,69 66,69.6 63,70.4", "#ff8c1a") +
        line(58, 74, 53, 70, "#7a5230", 0.7) + line(66, 74, 71, 70, "#7a5230", 0.7)) +
      flakes;
  };

  V.blossom = function () {
    var g = vgrad([[0, "#ffd9ea"], [0.55, "#ffeef6"], [1, "#f6fff0"]]);
    var petals = "";
    for (var i = 0; i < 26; i++) {
      var x = (i * 43) % 120, y = (i * 29) % 86;
      petals += el("ellipse", { cx: x, cy: y, rx: 1.4, ry: 0.8, fill: "#ff9ad5", opacity: 0.75,
        transform: "rotate(" + (i * 37 % 180) + " " + x + " " + y + ")" });
    }
    function blossomTree(x, y, s) {
      return el("g", {},
        el("path", { d: "M" + x + "," + y + " q-1," + (-7 * s) + " -5," + (-11 * s) + " M" + x + "," + y + " q1," + (-8 * s) + " 6," + (-12 * s),
          fill: "none", stroke: "#6b4a34", "stroke-width": 1.4 * s, "stroke-linecap": "round" }) +
        rect(x - 1.1 * s, y - 8 * s, 2.2 * s, 8 * s, "#6b4a34") +
        disc(x - 5 * s, y - 12 * s, 4.4 * s, "#ffb3d9") + disc(x + 5 * s, y - 13 * s, 4 * s, "#ffc2e2") +
        disc(x, y - 16 * s, 5.2 * s, "#ffa8d2") + disc(x - 1, y - 12 * s, 4 * s, "#ffd0e8"));
    }
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      disc(100, 18, 8, "#fff0b8", 0.8) +
      ridge([[34, 66], [84, 64], [120, 68]], 66, "#a8d894") +
      blossomTree(24, 70, 1.5) + blossomTree(96, 74, 1.1) +
      el("path", { d: "M0,80 q30,-4 60,0 q30,4 60,0 L120,90 L0,90 Z", fill: "#9fd8ef", opacity: 0.8 }) +
      el("path", { d: "M10,84 q14,-2 28,0", fill: "none", stroke: "#fff", "stroke-width": 0.6, opacity: 0.7 }) +
      petals;
  };

  V.autumn = function () {
    var g = vgrad([[0, "#ffcf9a"], [0.55, "#ffe8c4"], [1, "#fff6e2"]]);
    var leaves = "";
    for (var i = 0; i < 24; i++) {
      var x = (i * 53) % 118, y = (i * 37) % 84;
      var col = ["#e8663f", "#ffa53c", "#d94a2f", "#f2c14e"][i % 4];
      leaves += el("path", { d: "M0,0 q3,-3 6,0 q-3,4 -6,0 Z", fill: col, opacity: 0.9,
        transform: "translate(" + x + "," + y + ") rotate(" + (i * 47 % 360) + ")" });
    }
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      disc(96, 20, 9, "#ffd98a", 0.8) +
      ridge([[30, 60], [82, 57], [120, 62]], 60, "#c9a05c") +
      tree(20, 70, 1.7, "#e8663f", "#6b4a34") + tree(46, 74, 1.2, "#ffa53c", "#6b4a34") +
      tree(98, 72, 1.4, "#d94a2f", "#6b4a34") +
      ridge([[40, 80], [90, 78], [120, 82]], 80, "#b98d4f") +
      el("g", {}, path("M56,86 q6,-10 12,0 Z", "#8a5a2b") + disc(62, 82, 2, "#e8663f")) +
      leaves + bird(38, 24, 2) + bird(52, 18, 1.6);
  };

  V.harbour = function () {
    var g = vgrad([[0, "#ffb27a"], [0.45, "#ffd9a8"], [1, "#ffeccd"]]);
    var water = vgrad([[0, "#e8a06a"], [1, "#7a6f9c"]]);
    function boat(x, y, s, hull, sail) {
      return el("g", {}, line(x, y - 2 * s, x, y - 14 * s, "#5b4326", 0.7 * s) +
        poly(x + "," + (y - 13 * s) + " " + x + "," + (y - 3 * s) + " " + (x - 7 * s) + "," + (y - 3 * s), sail) +
        path("M" + (x - 8 * s) + "," + (y - 2 * s) + " q" + 8 * s + "," + 5 * s + " " + 16 * s + ",0 Z", hull));
    }
    return defs(g.def + water.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      disc(74, 40, 10, "#ff8f4c", 0.95) +
      ridge([[24, 50], [70, 47], [120, 52]], 50, "#7d6a8f", 0.7) +
      rect(0, 54, 120, 36, "url(#" + water.id + ")") +
      el("g", { opacity: 0.35 }, rect(70, 54, 8, 36, "#ffd6a0")) +
      boat(30, 62, 1.2, "#c0552f", "#fff6e2") + boat(92, 68, 0.9, "#3a5f8f", "#ffe9c9") +
      el("g", {}, rect(10, 30, 7, 28, "#f2f0f6") + rect(10, 30, 7, 4, "#e8384f") +
        rect(11.4, 34, 4.2, 5, "#ffe27a") + poly("8,30 13.5,22 19,30", "#e8384f") +
        el("g", { opacity: 0.35 }, poly("17,32 40,24 40,38", "#fff6c8"))) +
      el("path", { d: "M0,66 q14,-2 28,0 t28,0 t28,0 t28,0", fill: "none", stroke: "#fff", "stroke-width": 0.6, opacity: 0.4 }) +
      el("path", { d: "M0,76 q14,-2 28,0 t28,0 t28,0 t28,0", fill: "none", stroke: "#fff", "stroke-width": 0.6, opacity: 0.3 }) +
      bird(44, 22, 2) + bird(58, 16, 1.6);
  };

  V.waterfall = function () {
    var g = vgrad([[0, "#a8dcf0"], [0.6, "#d6f1ea"], [1, "#eefaf2"]]);
    var fall = vgrad([[0, "#e8fbff"], [1, "#6fc4e8"]]);
    var mist = "";
    for (var i = 0; i < 16; i++) mist += disc(52 + ((i * 19) % 22), 68 + ((i * 13) % 14), 2 + (i % 3), "#ffffff", 0.22);
    return defs(g.def + fall.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      poly("-6,74 34,20 74,74", "#6f9c6a") + poly("48,74 86,26 124,74", "#5e8c5c") +
      rect(52, 24, 16, 48, "url(#" + fall.id + ")") +
      el("g", { opacity: 0.5 },
        line(55, 28, 55, 68, "#fff", 0.8) + line(60, 26, 60, 70, "#fff", 0.8) + line(65, 30, 65, 66, "#fff", 0.8)) +
      path("M40,74 q20,10 40,0 q-6,10 -20,10 q-14,0 -20,-10 Z", "#7fd0ec") +
      mist +
      pine(16, 70, 1.1, "#356b4a") + pine(104, 72, 1, "#356b4a") + tree(30, 76, 1.1, "#4f9b52") +
      el("path", { d: "M0,84 q30,-4 60,0 q30,4 60,0 L120,90 L0,90 Z", fill: "#8fd8ea" }) +
      disc(88, 22, 7, "#fff2c0", 0.8);
  };

  V.canyon = function () {
    var g = vgrad([[0, "#7fb8e0"], [0.5, "#ffd9a8"], [1, "#ffe9c9"]]);
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      disc(60, 22, 8, "#fff0c2", 0.85) +
      ridge([[36, 50], [84, 48], [120, 52]], 50, "#c98a5c", 0.6) +
      el("g", {},
        path("M0,90 L0,34 L14,34 L18,44 L26,44 L30,58 L22,58 L22,90 Z", "#b0603f") +
        path("M120,90 L120,30 L104,30 L100,42 L92,42 L88,56 L96,56 L96,90 Z", "#a3583d") +
        path("M0,90 L0,34 L8,34 L8,90 Z", "#8f4a34", 0.5) +
        path("M120,90 L120,30 L112,30 L112,90 Z", "#7d3f2c", 0.5)) +
      el("g", { opacity: 0.35 },
        line(4, 46, 20, 46, "#7d3f2c", 1) + line(4, 58, 22, 58, "#7d3f2c", 1) +
        line(100, 44, 118, 44, "#5e2f20", 1) + line(94, 58, 118, 58, "#5e2f20", 1)) +
      path("M30,90 q14,-16 30,-18 q16,2 30,18 Z", "#d8895d") +
      path("M42,90 q10,-9 18,-10 q8,1 18,10 Z", "#4b9bd0", 0.85) +
      bird(48, 30, 2.2) + bird(66, 24, 1.7) + bird(78, 34, 1.4);
  };

  V.farmland = function () {
    var g = vgrad([[0, "#a8ddff"], [0.6, "#e2f4ff"], [1, "#f6fff0"]]);
    var rows = "";
    for (var i = 0; i < 8; i++) {
      rows += el("path", { d: "M-4," + (70 + i * 2.6) + " q60,-" + (3 + i) + " 128,0",
        fill: "none", stroke: i % 2 ? "#c9a05c" : "#e8c37a", "stroke-width": 2 });
    }
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      disc(20, 18, 8, "#ffe27a", 0.9) + cloud(52, 14, 0.9) + cloud(98, 22, 0.7) +
      ridge([[30, 56], [80, 53], [120, 58]], 56, "#9ecb8e") +
      ridge([[26, 64], [78, 62], [120, 66]], 64, "#c9dd8a") + rows +
      el("g", {},
        rect(72, 44, 22, 18, "#c0552f") + poly("70,44 83,34 96,44", "#8f3f24") +
        rect(80, 52, 6, 10, "#f6e2c0") + poly("77,44 83,38 89,44", "#f6e2c0")) +
      el("g", {}, line(30, 62, 30, 44, "#e6dccb", 1.6) +
        el("g", { transform: "translate(30,44)" },
          poly("0,0 -2,-11 2,-11", "#fff6e2") + poly("0,0 11,-2 11,2", "#fff6e2") +
          poly("0,0 2,11 -2,11", "#fff6e2") + poly("0,0 -11,2 -11,-2", "#fff6e2") +
          disc(0, 0, 1.4, "#c0552f"))) +
      el("g", { opacity: 0.9 }, disc(50, 78, 2.6, "#fff") + disc(53, 77, 1.8, "#fff") +
        disc(48.6, 77.4, 0.4, "#3a3a4a") + rect(49, 80, 1, 2, "#e8c37a") + rect(52, 80, 1, 2, "#e8c37a"));
  };

  V.moonrise = function () {
    var g = vgrad([[0, "#231b46"], [0.5, "#4b3a6e"], [1, "#a06d8a"]]);
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      starfield(50, 120, 46, "#fff", 61) +
      disc(60, 48, 18, "#fff3cf") +
      el("g", { opacity: 0.16 }, disc(54, 42, 4, "#8a7f6a") + disc(66, 50, 5.4, "#8a7f6a") + disc(58, 56, 3, "#8a7f6a")) +
      disc(60, 48, 25, "#fff3cf", 0.16) +
      ridge([[30, 64], [80, 60], [120, 66]], 64, "#2f2450") +
      pine(16, 72, 1.3, "#1c1636") + pine(34, 76, 1, "#1c1636") + pine(100, 74, 1.2, "#1c1636") +
      path("M0,82 q30,-3 60,0 q30,3 60,0 L120,90 L0,90 Z", "#3a2c5e") +
      el("g", { opacity: 0.5 }, rect(48, 82, 24, 8, "#fff3cf", { rx: 3 }));
  };

  V.nightcity = function () {
    var g = vgrad([[0, "#080a22"], [0.6, "#1b1d43"], [1, "#3a2f5c"]]);
    var blocks = "", wins = "";
    [[2, 40, 15], [20, 56, 12], [34, 34, 18], [54, 62, 14], [70, 44, 12], [84, 58, 16], [102, 36, 16]]
      .forEach(function (b, i) {
        blocks += rect(b[0], 90 - b[1], b[2], b[1], i % 2 ? "#161a3a" : "#1f2347");
        for (var r = 0; r < Math.floor(b[1] / 6); r++)
          for (var c = 0; c < 3; c++)
            if ((r * 5 + c * 3 + i) % 4) wins += rect(b[0] + 2 + c * (b[2] - 4) / 3, 90 - b[1] + 3 + r * 6, 2, 2.6, (r + c + i) % 5 ? "#ffdc94" : "#8fd8ff", { opacity: 0.9 });
      });
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      starfield(40, 120, 40, "#fff", 71) +
      disc(96, 16, 6, "#fff3cf") + disc(93, 14, 5, "#101433") +
      blocks + wins +
      el("g", { opacity: 0.35 }, rect(0, 74, 120, 16, "#6fd0ff")) +
      el("g", {}, line(46, 28, 46, 90, "#2a2f57", 1) + disc(46, 27, 1.6, "#ff6ec7") +
        line(74, 34, 74, 90, "#2a2f57", 1) + disc(74, 33, 1.4, "#6fd0ff"));
  };

  V.reefview = function () {
    var g = vgrad([[0, "#4fc4e0"], [0.6, "#2f9ac4"], [1, "#1a6d99"]]);
    function coral(x, y, s, col) {
      return el("g", { fill: col },
        rect(x - 1.2 * s, y - 7 * s, 2.4 * s, 7 * s, col, { rx: 1.2 * s }) +
        rect(x - 5 * s, y - 9 * s, 2.2 * s, 6 * s, col, { rx: 1.1 * s }) +
        rect(x + 3 * s, y - 10 * s, 2.2 * s, 7 * s, col, { rx: 1.1 * s }) +
        rect(x - 5 * s, y - 4 * s, 10 * s, 2 * s, col, { rx: 1 * s }));
    }
    var bubbles = "";
    for (var i = 0; i < 12; i++) bubbles += el("circle", { cx: 8 + (i * 37) % 108, cy: 10 + (i * 23) % 60, r: 0.7 + (i % 3) * 0.4, fill: "none", stroke: "#dff6ff", "stroke-width": 0.4, opacity: 0.75 });
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      el("g", { opacity: 0.16 }, poly("22,0 40,0 26,90 4,90", "#fff") + poly("78,0 92,0 84,90 64,90", "#fff")) +
      ridge([[34, 74], [84, 72], [120, 76]], 74, "#e8d3a0") +
      coral(20, 80, 1.4, "#ff8fb3") + coral(52, 84, 1, "#ffb35c") + coral(96, 80, 1.2, "#a88fff") +
      el("g", {}, el("ellipse", { cx: 44, cy: 44, rx: 5, ry: 3, fill: "#ffd166" }) +
        poly("48,44 53,40 53,48", "#ffb15c") + disc(41.6, 43.4, 0.6, "#2a2030")) +
      el("g", {}, el("ellipse", { cx: 78, cy: 34, rx: 3.6, ry: 2.2, fill: "#6fd0ff" }) +
        poly("81,34 85,31 85,37", "#4fb3e0") + disc(76.2, 33.6, 0.5, "#123")) +
      el("g", {}, el("ellipse", { cx: 62, cy: 60, rx: 3, ry: 1.8, fill: "#ff8fb3" }) +
        poly("64.6,60 68,58 68,62", "#ff6ec7")) +
      bubbles;
  };

  V.stormview = function () {
    var g = vgrad([[0, "#2b3550"], [0.6, "#4a5670"], [1, "#6f7d94"]]);
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      cloud(24, 20, 1.5, "#3f4a63", 1) + cloud(66, 14, 1.8, "#333d55", 1) + cloud(102, 24, 1.2, "#414c66", 1) +
      path("M56,28 L48,50 L58,50 L50,72 L70,44 L59,44 L68,28 Z", "#ffe27a") +
      path("M56,28 L48,50 L58,50 L50,72 L70,44 L59,44 L68,28 Z", "#fff8d0", 0.4) +
      el("g", { opacity: 0.4 }, disc(59, 46, 22, "#ffe27a")) +
      ridge([[30, 70], [82, 68], [120, 72]], 70, "#3f5346") +
      pine(14, 76, 1.1, "#233a2c") + pine(104, 78, 1, "#233a2c") +
      el("g", { opacity: 0.5 },
        line(16, 40, 13, 50, "#dff1ff", 0.6) + line(36, 34, 33, 46, "#dff1ff", 0.6) +
        line(88, 38, 85, 50, "#dff1ff", 0.6) + line(108, 44, 105, 56, "#dff1ff", 0.6));
  };

  V.marsfield = function () {
    var g = vgrad([[0, "#d29168"], [0.5, "#f0c39a"], [1, "#e8ab7c"]]);
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      disc(22, 18, 4.4, "#fff3d6", 0.95) +
      disc(92, 20, 5.5, "#c8b6a2") + disc(90, 18, 1.6, "#a8968a", 0.8) +
      ridge([[30, 54], [80, 51], [120, 56]], 54, "#b06a49") +
      ridge([[26, 66], [78, 63], [120, 68]], 66, "#c9784f") +
      ridge([[44, 80], [96, 78], [120, 82]], 80, "#dd9264") +
      el("g", {},
        el("path", { d: "M40,60 a16,16 0 0 1 32,0 Z", fill: "#cdefff", opacity: 0.3 }) +
        el("path", { d: "M40,60 a16,16 0 0 1 32,0", fill: "none", stroke: "#eaf8ff", "stroke-width": 0.8, opacity: 0.85 }) +
        rect(38, 60, 36, 4, "#8f8f9c") +
        disc(56, 54, 3, "#5fae62") + disc(50, 57, 2.2, "#5fae62") + disc(62, 57, 2, "#5fae62")) +
      el("g", { transform: "translate(90,72)" },
        rect(-7, -5, 14, 6, "#dfe4ee", { rx: 1 }) + rect(-2, -9, 5, 4, "#5b7fd6") +
        disc(-5, 2, 2, "#3a3a4a") + disc(0, 2, 2, "#3a3a4a") + disc(5, 2, 2, "#3a3a4a")) +
      el("g", { opacity: 0.3 }, disc(16, 82, 3, "#a85f42") + disc(64, 86, 2.4, "#a85f42"));
  };

  V.deepspace = function () {
    var g = vgrad([[0, "#02030c"], [0.6, "#0b0a22"], [1, "#161036"]]);
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      starfield(120, 120, 90, "#fff", 83) +
      el("ellipse", { cx: 34, cy: 30, rx: 26, ry: 14, fill: "#8a5cff", opacity: 0.18, transform: "rotate(20 34 30)" }) +
      el("ellipse", { cx: 40, cy: 34, rx: 16, ry: 9, fill: "#ff6ec7", opacity: 0.16, transform: "rotate(20 40 34)" }) +
      el("g", {}, path("M96,20 q-16,10 -30,30", "#fff", 0) +
        line(104, 14, 82, 36, "#fff6c9", 1.2, 0.85) + disc(106, 12, 2.2, "#fff6c9")) +
      twinkle(66, 62, 3.4, "#dfe8ff") + twinkle(24, 70, 2.4, "#fff") + twinkle(102, 66, 2, "#ffd6ec") +
      el("g", { transform: "translate(52,68) rotate(-8)" },
        path("M0,0 q10,-5 22,0 q-10,5 -22,0 Z", "#cfd6e6") +
        rect(6, -6, 10, 5, "#7fb2ff", { rx: 2 }) + poly("22,0 30,-4 30,4", "#9aa0b4"));
  };

  V.rooftops = function () {
    var g = vgrad([[0, "#8fc4ff"], [0.55, "#ffd9c2"], [1, "#ffeede"]]);
    var roofs = "";
    [[4, 58, 22, "#c0552f"], [28, 64, 18, "#8f3f24"], [48, 54, 24, "#a34a2c"],
     [74, 62, 20, "#c0552f"], [96, 56, 24, "#8f3f24"]].forEach(function (r) {
      roofs += rect(r[0], r[1], r[2], 90 - r[1], "#e8d3b0") +
        poly((r[0] - 2) + "," + r[1] + " " + (r[0] + r[2] / 2) + "," + (r[1] - 9) + " " + (r[0] + r[2] + 2) + "," + r[1], r[3]) +
        rect(r[0] + r[2] / 2 - 2, r[1] + 6, 4, 5, "#7fb2ff", { rx: 0.6 }) +
        rect(r[0] + r[2] - 6, r[1] - 8, 3, 6, "#9c8672");
    });
    return defs(g.def) + rect(0, 0, 120, 90, "url(#" + g.id + ")") +
      disc(90, 24, 9, "#ffb15c", 0.9) + cloud(26, 18, 0.9, "#fff", 0.85) +
      ridge([[36, 46], [86, 44], [120, 48]], 46, "#b9a6c4", 0.6) +
      roofs +
      el("g", { opacity: 0.85 },
        line(4, 52, 116, 46, "#8a7f96", 0.4) +
        rect(20, 47, 4, 5, "#ff9ad5") + rect(40, 46, 4, 5, "#ffe27a") + rect(64, 45, 4, 5, "#8fd8ff")) +
      bird(30, 30, 2.2) + bird(46, 24, 1.7) + bird(70, 32, 1.5);
  };

  /* =========================================================
     WALL AND FLOOR TEXTURE — CSS, because the join between them
     has to land on 55% exactly whatever shape the screen is.
     ========================================================= */
  var WALL_TEX = {
    brick: function (a, b) {
      return "repeating-linear-gradient(0deg, " + shade(a, -12, 0.35) + " 0 1px, transparent 1px 13px)," +
             "repeating-linear-gradient(90deg, " + shade(a, -12, 0.28) + " 0 1px, transparent 1px 26px)";
    },
    plank: function (a) {
      return "repeating-linear-gradient(90deg, " + shade(a, -14, 0.35) + " 0 1px, transparent 1px 20px)," +
             "repeating-linear-gradient(0deg, " + shade(a, -10, 0.18) + " 0 1px, transparent 1px 9px)";
    },
    stripe: function (a) {
      return "repeating-linear-gradient(90deg, " + shade(a, -10, 0.4) + " 0 9px, transparent 9px 22px)";
    },
    diag: function (a) {
      return "repeating-linear-gradient(45deg, " + shade(a, -12, 0.3) + " 0 6px, transparent 6px 16px)";
    },
    facet: function (a) {
      return "repeating-linear-gradient(60deg, " + shade(a, 30, 0.4) + " 0 2px, transparent 2px 18px)," +
             "repeating-linear-gradient(-60deg, " + shade(a, -14, 0.22) + " 0 2px, transparent 2px 22px)";
    },
    weave: function (a) {
      return "repeating-linear-gradient(0deg, " + shade(a, -10, 0.22) + " 0 2px, transparent 2px 5px)," +
             "repeating-linear-gradient(90deg, " + shade(a, -10, 0.18) + " 0 2px, transparent 2px 5px)";
    },
    starry: function (a) {
      return "radial-gradient(circle at 14% 22%, rgba(255,255,255,0.85) 0 1px, transparent 1.4px)," +
             "radial-gradient(circle at 62% 12%, rgba(255,255,255,0.7) 0 1px, transparent 1.4px)," +
             "radial-gradient(circle at 34% 46%, rgba(255,255,255,0.6) 0 1px, transparent 1.4px)," +
             "radial-gradient(circle at 84% 36%, rgba(255,255,255,0.75) 0 1px, transparent 1.4px)," +
             "radial-gradient(circle at 46% 74%, rgba(255,255,255,0.5) 0 1px, transparent 1.4px)";
    },
    dust: function (a) {
      return "radial-gradient(circle at 20% 30%, " + shade(a, -18, 0.3) + " 0 3px, transparent 4px)," +
             "radial-gradient(circle at 70% 60%, " + shade(a, -18, 0.24) + " 0 4px, transparent 5px)," +
             "radial-gradient(circle at 45% 15%, " + shade(a, -18, 0.2) + " 0 2px, transparent 3px)";
    },
    plain: function (a) {
      return "linear-gradient(90deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 78%, rgba(0,0,0,0.05) 100%)";
    }
  };

  var FLOOR_TEX = {
    board: function (a) {
      return "repeating-linear-gradient(90deg, " + shade(a, -22, 0.45) + " 0 1.5px, transparent 1.5px 26px)," +
             "repeating-linear-gradient(0deg, " + shade(a, -14, 0.22) + " 0 1px, transparent 1px 14px)";
    },
    check: function (a) {
      return "repeating-linear-gradient(45deg, " + shade(a, -20, 0.4) + " 0 14px, transparent 14px 28px)," +
             "repeating-linear-gradient(-45deg, " + shade(a, -20, 0.4) + " 0 14px, transparent 14px 28px)";
    },
    slab: function (a) {
      return "repeating-linear-gradient(0deg, " + shade(a, -22, 0.4) + " 0 1.5px, transparent 1.5px 16px)," +
             "repeating-linear-gradient(90deg, " + shade(a, -22, 0.35) + " 0 1.5px, transparent 1.5px 30px)";
    },
    ripple: function (a) {
      return "repeating-linear-gradient(0deg, rgba(255,255,255,0.35) 0 1.5px, transparent 1.5px 12px)";
    },
    speck: function (a) {
      return "radial-gradient(circle at 18% 30%, " + shade(a, -22, 0.4) + " 0 1.4px, transparent 2px)," +
             "radial-gradient(circle at 62% 62%, " + shade(a, -22, 0.35) + " 0 1.6px, transparent 2.2px)," +
             "radial-gradient(circle at 82% 24%, " + shade(a, -22, 0.3) + " 0 1.2px, transparent 1.8px)," +
             "radial-gradient(circle at 38% 82%, " + shade(a, -22, 0.3) + " 0 1.4px, transparent 2px)";
    },
    fluff: function (a) {
      return "radial-gradient(circle at 25% 35%, rgba(255,255,255,0.6) 0 8px, transparent 12px)," +
             "radial-gradient(circle at 70% 65%, rgba(255,255,255,0.5) 0 10px, transparent 15px)";
    },
    starrys: function (a) {
      return "radial-gradient(circle at 22% 34%, rgba(255,255,255,0.9) 0 1px, transparent 1.6px)," +
             "radial-gradient(circle at 66% 22%, rgba(255,255,255,0.8) 0 1px, transparent 1.6px)," +
             "radial-gradient(circle at 44% 70%, rgba(255,255,255,0.7) 0 1px, transparent 1.6px)," +
             "radial-gradient(circle at 86% 58%, rgba(255,255,255,0.65) 0 1px, transparent 1.6px)";
    },
    plain: function () { return "linear-gradient(0deg, rgba(0,0,0,0.10), rgba(0,0,0,0) 60%)"; }
  };

  /* Darken or lighten a hex colour and hand it back as rgba, so a
     texture always suits the paint it is drawn on. */
  function shade(hex, amount, alpha) {
    var h = String(hex || "#888888").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    r = Math.max(0, Math.min(255, r + amount));
    g = Math.max(0, Math.min(255, g + amount));
    b = Math.max(0, Math.min(255, b + amount));
    return "rgba(" + r + "," + g + "," + b + "," + (alpha === undefined ? 1 : alpha) + ")";
  }

  /* =========================================================
     PUTTING A ROOM TOGETHER
     ========================================================= */

  /* The window's shape follows the house, which is most of why two
     homes with the same wallpaper still feel different. */
  function frameFor(house) {
    if (!house) return "sash";
    if (house.world === "Space") return "port";
    if (house.id === "palace" || house.id === "tower" || house.id === "dragon" ||
        house.id === "marscastle" || house.id === "temple" || house.id === "icepalace") return "arch";
    if (house.id === "reef" || house.id === "shipwreck" || house.id === "lighthouse") return "round";
    if (house.world === "The Sky" || house.id === "observatory") return "wide";
    if (house.id === "nest" || house.id === "burrow" || house.id === "mushroom" ||
        house.id === "treehouse" || house.id === "lilypad") return "hole";
    return "sash";
  }

  /* The painting itself, at whatever size the frame gives it. */
  function viewSvg(viewId) {
    var paint = V[viewId] || V.windowsun;
    return '<svg class="view-art" viewBox="0 0 120 90" preserveAspectRatio="xMidYMid slice" ' +
      'aria-hidden="true" focusable="false">' + paint() + "</svg>";
  }

  /* =========================================================
     THE PANORAMAS — the places you go to that are not home.
     Drawn across the top of the scene in a 240 x 90 box, so
     they can be cropped from the sides without losing anything.
     ========================================================= */
  var P = {};

  P.farm = function () {
    var g = vgrad([[0, "#8fd0ff"], [0.65, "#dff2ff"], [1, "#f2fbe8"]]);
    var rows = "";
    for (var i = 0; i < 6; i++) {
      rows += el("path", { d: "M-4," + (72 + i * 3) + " q120,-" + (4 + i * 1.5) + " 250,0",
        fill: "none", stroke: i % 2 ? "#7fbf5f" : "#9ed86f", "stroke-width": 2.6 });
    }
    var berries = "";
    [[24, 74], [56, 76], [92, 73], [140, 75], [178, 74], [212, 76]].forEach(function (b, i) {
      berries += disc(b[0], b[1], 2.4, i % 2 ? "#e8384f" : "#5b7fd6") + disc(b[0], b[1] - 1, 0.8, "#fff", 0.5) +
        line(b[0], b[1] - 2.4, b[0], b[1] - 6, "#4f9b52", 0.8);
    });
    return defs(g.def) + rect(0, 0, 240, 90, "url(#" + g.id + ")") +
      disc(38, 20, 10, "#ffe27a") + cloud(90, 16, 1.1) + cloud(160, 22, 0.9) + cloud(214, 14, 0.8) +
      ridge([[60, 54], [150, 50], [240, 56]], 54, "#a9dd8e") +
      el("g", {}, rect(150, 40, 26, 20, "#c0552f") + poly("148,40 163,30 178,40", "#8f3f24") +
        rect(159, 48, 8, 12, "#f6e2c0")) +
      el("g", {}, line(60, 58, 60, 38, "#e6dccb", 1.6) +
        el("g", { transform: "translate(60,38)" },
          poly("0,0 -2,-11 2,-11", "#fff6e2") + poly("0,0 11,-2 11,2", "#fff6e2") +
          poly("0,0 2,11 -2,11", "#fff6e2") + poly("0,0 -11,2 -11,-2", "#fff6e2"))) +
      ridge([[70, 66], [160, 64], [240, 68]], 66, "#8ecf74") + rows + berries +
      tree(16, 66, 1.4) + tree(220, 68, 1.2) + bird(110, 26, 2.2) + bird(126, 20, 1.7);
  };

  /* The Word Well: a moonlit clearing with an old stone well, a lantern
     on a post throwing warm light over the flagstones, a sleeping
     village on the far hill, and fireflies drifting up from the grass. */
  P.well = function () {
    var g = vgrad([[0, "#141a3f"], [0.55, "#2c3570"], [1, "#4a5490"]]);
    var stones = "";
    // the well's ring, course by course
    for (var r = 0; r < 3; r++) {
      var y = 60 + r * 5;
      for (var s = 0; s < 6; s++) {
        var x = 98 + s * 7.6 + (r % 2 ? 3.8 : 0);
        stones += rect(x, y, 6.8, 4.4, r % 2 ? "#7d83a8" : "#8b91b5", { rx: 1 });
      }
    }
    var village = "";
    [[26, 50, 10, 7], [40, 52, 8, 5], [176, 48, 12, 8], [192, 51, 9, 6], [208, 49, 10, 7]].forEach(function (h, i) {
      village += rect(h[0], h[1], h[2], h[3], "#232a55") + poly((h[0] - 1) + "," + h[1] + " " + (h[0] + h[2] / 2) + "," + (h[1] - 5) + " " + (h[0] + h[2] + 1) + "," + h[1], "#1a2044") +
        rect(h[0] + h[2] / 2 - 1, h[1] + 2, 2, 2, i % 2 ? "#ffd166" : "#ffb347", { opacity: 0.95 });
    });
    var flies = "";
    [[40, 64], [62, 72], [150, 70], [178, 66], [204, 74], [86, 78], [16, 74]].forEach(function (f, i) {
      flies += glow(f[0], f[1], 4, "#ffe27a", 0.35) + disc(f[0], f[1], 0.9, "#fff6c9", 0.95);
    });
    var grass = "";
    for (var i = 0; i < 24; i++) {
      var gx = 4 + i * 10.2;
      grass += el("path", { d: "M" + gx + ",90 q1,-6 2,-9 M" + (gx + 3) + ",90 q-1,-5 -2,-8", fill: "none",
        stroke: "#1e2a4f", "stroke-width": 0.9, "stroke-linecap": "round", opacity: 0.8 });
    }
    return defs(g.def) + rect(0, 0, 240, 90, "url(#" + g.id + ")") +
      starfield(110, 240, 58, "#fff", 97) +
      twinkle(48, 20, 3.6, "#fff6c9") + twinkle(132, 14, 2.2, "#dfe8ff") +
      glow(196, 22, 26, "#fff3cf", 0.25) + disc(196, 22, 11, "#fff3cf") + disc(191, 19, 9, "#1f2854") +
      ridge([[50, 56], [120, 60], [190, 54], [240, 58]], 56, "#1c2350") + village +
      ridge([[40, 70], [130, 66], [240, 71]], 68, "#28325f") +
      // the lantern post and its pool of light
      glow(62, 44, 30, "#ffcc66", 0.42) +
      line(62, 74, 62, 46, "#3b2a1a", 2) + rect(58, 40, 8, 9, "#3b2a1a", { rx: 1.5 }) +
      rect(59.5, 41.5, 5, 6, "#ffe08a", { rx: 1 }) + poly("57,40 62,36 67,40", "#3b2a1a") +
      // the well: roof, posts, rope, bucket, stone ring
      rect(100, 34, 3, 26, "#5a3d22") + rect(137, 34, 3, 26, "#5a3d22") +
      poly("94,36 120,24 146,36", "#7a3b2a") + poly("97,36 120,26 143,36", "#8f4a34") +
      line(120, 36, 120, 52, "#d9cfb0", 0.9) + rect(115, 52, 10, 7, "#8a6a3f", { rx: 1 }) + rect(115, 52, 10, 1.6, "#5a3d22") +
      el("ellipse", { cx: 120, cy: 60, rx: 22, ry: 5, fill: "#5d6388" }) +
      el("ellipse", { cx: 120, cy: 60, rx: 17, ry: 3.4, fill: "#0f1430" }) +
      stones +
      el("g", { opacity: 0.55 }, path("M98,74 h44 v6 h-44 Z", "#3a4270")) +
      // a stack of books somebody left on the rim
      rect(146, 53, 9, 2.6, "#c05f8f", { rx: 0.6 }) + rect(147, 50.4, 8, 2.6, "#5f8fc0", { rx: 0.6 }) + rect(146.5, 47.8, 8, 2.6, "#c0a05f", { rx: 0.6 }) +
      grass + flies;
  };

  /* The Rainbow Pool: a turquoise pool in a rocky bowl, a waterfall
     spilling in from the left, lily pads, a rainbow standing in the
     spray, and the paint-splash colours the pool is famous for. */
  P.pool = function () {
    var g = vgrad([[0, "#ffd7f0"], [0.5, "#dff4ff"], [1, "#bfeaff"]]);
    var bow = "", cols = ["#e8384f", "#ff8c1a", "#ffd400", "#2fbf4f", "#2b7fff", "#8a3ffc"];
    cols.forEach(function (c, i) {
      bow += el("path", { d: "M70,66 A50,50 0 0 1 170,66", fill: "none", stroke: c,
        "stroke-width": 3.2, opacity: 0.7, transform: "translate(0," + i * 3.2 + ")" });
    });
    var ripples = "";
    for (var i = 0; i < 7; i++) {
      ripples += el("ellipse", { cx: 60 + i * 24, cy: 74 + (i % 3) * 3, rx: 7 + (i % 2) * 3, ry: 1.2, fill: "none",
        stroke: "#ffffff", "stroke-width": 0.7, opacity: 0.55 });
    }
    var spray = "";
    for (var s = 0; s < 14; s++) {
      spray += el("circle", { cx: 22 + (s * 37) % 40, cy: 40 + (s * 23) % 34, r: 0.8 + (s % 3) * 0.5,
        fill: "#fff", opacity: 0.6 });
    }
    var rocks = "";
    [[6, 66, 14, 9, "#8fa0b5"], [18, 62, 16, 11, "#a7b6c9"], [204, 64, 18, 10, "#a7b6c9"], [222, 68, 16, 9, "#8fa0b5"], [232, 60, 12, 8, "#95a6ba"]].forEach(function (r) {
      rocks += el("ellipse", { cx: r[0] + r[2] / 2, cy: r[1] + r[3] / 2, rx: r[2] / 2, ry: r[3] / 2, fill: r[4] }) +
        el("ellipse", { cx: r[0] + r[2] / 2 - 2, cy: r[1] + r[3] / 2 - 2, rx: r[2] / 3, ry: r[3] / 4, fill: "#fff", opacity: 0.25 });
    });
    var pads = "";
    [[96, 80, 5], [150, 83, 4], [186, 79, 4.5]].forEach(function (p) {
      pads += el("ellipse", { cx: p[0], cy: p[1], rx: p[2], ry: p[2] * 0.42, fill: "#4fae63" }) +
        poly(p[0] + "," + p[1] + " " + (p[0] + p[2]) + "," + (p[1] - p[2] * 0.4) + " " + (p[0] + p[2]) + "," + (p[1] + p[2] * 0.1), "#7fd4ff");
    });
    return defs(g.def) + rect(0, 0, 240, 90, "url(#" + g.id + ")") +
      disc(206, 16, 9, "#ffe27a", 0.9) + cloud(40, 14, 1) + cloud(150, 12, 0.8) +
      ridge([[40, 52], [110, 48], [180, 53], [240, 50]], 52, "#a8dd8f") +
      tree(230, 58, 1.2) + tree(196, 56, 0.9) +
      // the cliff and the fall
      poly("0,30 36,30 40,62 0,66", "#7d8fa6") + poly("0,30 36,30 34,48 0,50", "#93a4ba") +
      el("g", { opacity: 0.9 }, path("M14,30 q6,20 4,40 h10 q2,-20 -4,-40 Z", "#d7f3ff") + path("M17,30 q4,20 2,40 h4 q2,-20 -1,-40 Z", "#ffffff", 0.85)) +
      // the pool
      el("ellipse", { cx: 120, cy: 78, rx: 108, ry: 16, fill: "#5fbfe8" }) +
      el("ellipse", { cx: 120, cy: 78, rx: 100, ry: 12.5, fill: "#7fd4ff" }) +
      el("ellipse", { cx: 118, cy: 76, rx: 60, ry: 6, fill: "#a8e6ff", opacity: 0.8 }) +
      spray + bow + ripples + rocks + pads +
      // the paint-splash colours the pool gives away
      el("g", { opacity: 0.95 }, disc(48, 60, 3.6, "#ff9ad5") + disc(41, 66, 2.6, "#ffd166") + disc(58, 66, 2.2, "#3ddc84") +
        disc(200, 61, 3.4, "#8fd8ff") + disc(210, 66, 2.4, "#ffd166") + disc(190, 66, 2, "#ff9ad5")) +
      el("g", { opacity: 0.9 }, disc(176, 60, 3, "#4fae63") + disc(179, 58, 0.8, "#111") + line(173, 62, 170, 64, "#4fae63", 1.2));
  };

  /* The Market: a cobbled square under bunting, three different stalls
     heaped with goods, a shop front with a striped awning behind, lamp
     posts, and rooftops with chimneys against a warm afternoon sky. */
  P.market = function () {
    var g = vgrad([[0, "#ffd3a0"], [0.55, "#fff0da"], [1, "#ffe6c4"]]);
    function awning(x, w, y, a, b, scallop) {
      var out = "";
      for (var i = 0; i < w / 6; i++) out += rect(x + i * 6, y, 6, 7, i % 2 ? a : b);
      if (scallop) for (var k = 0; k < w / 6; k++) out += disc(x + 3 + k * 6, y + 7, 3, k % 2 ? a : b);
      return out;
    }
    var bunting = "";
    for (var i = 0; i < 15; i++) {
      bunting += poly((6 + i * 16) + ",18 " + (14 + i * 16) + ",18 " + (10 + i * 16) + ",25",
        ["#e8384f", "#ffd400", "#2fbf4f", "#2b7fff", "#ff8fd0"][i % 5]);
    }
    var cobbles = "";
    for (var r = 0; r < 3; r++) for (var c = 0; c < 26; c++) {
      cobbles += el("ellipse", { cx: 4 + c * 9.6 + (r % 2 ? 4.8 : 0), cy: 78 + r * 4.5, rx: 4, ry: 1.7, fill: r % 2 ? "#d9ab82" : "#cfa077", opacity: 0.8 });
    }
    // the fruit stall, the hat stall, the jar stall
    var fruit = "";
    [[26, 62, "#e8384f"], [31, 62, "#ff8c1a"], [36, 62, "#ffd400"], [28.5, 58.5, "#e8384f"], [33.5, 58.5, "#2fbf4f"], [31, 55, "#ff8c1a"]].forEach(function (f) {
      fruit += disc(f[0], f[1], 2.4, f[2]) + disc(f[0] - 0.7, f[1] - 0.8, 0.7, "#fff", 0.5);
    });
    var hats = poly("104,52 118,52 111,44", "#8a3ffc") + rect(101, 52, 20, 2, "#5b2fb0") +
      el("ellipse", { cx: 128, cy: 56, rx: 7, ry: 2.4, fill: "#c99a6b" }) + rect(124, 50, 8, 6, "#c99a6b", { rx: 2 }) + rect(124, 54, 8, 1.4, "#e8384f") +
      rect(96, 58, 8, 6, "#ff8fd0", { rx: 3 }) + disc(100, 57, 2.2, "#ff8fd0");
    var jars = "";
    [[176, "#ffd166"], [184, "#ff9ad5"], [192, "#8fd8ff"], [200, "#a8e6a0"]].forEach(function (j, i) {
      jars += rect(j[0], 52 + (i % 2) * 6, 7, 9, "#fff", { rx: 1.5, opacity: 0.85 }) + rect(j[0] + 1, 54 + (i % 2) * 6, 5, 6, j[1], { rx: 1 }) +
        rect(j[0] + 0.5, 51.5 + (i % 2) * 6, 6, 1.4, "#a9743f");
    });
    function stall(x, w, a, b, scallop) {
      return el("g", {},
        rect(x - 2, 46, 3, 30, "#8a5a2b") + rect(x + w - 1, 46, 3, 30, "#8a5a2b") +
        rect(x, 64, w, 12, "#e2c79c") + rect(x, 64, w, 2.4, "#c9a06a") +
        el("g", { opacity: 0.25 }, line(x + 6, 68, x + 6, 76, "#8a5a2b", 1) + line(x + w - 6, 68, x + w - 6, 76, "#8a5a2b", 1)) +
        awning(x - 3, w + 6, 40, a, b, scallop) + rect(x - 3, 39, w + 6, 1.6, "#8a5a2b"));
    }
    return defs(g.def) + rect(0, 0, 240, 90, "url(#" + g.id + ")") +
      disc(214, 16, 8, "#ffe27a", 0.9) + cloud(52, 12, 0.9) + cloud(150, 10, 0.7) +
      // the shop fronts behind the square
      el("g", {},
        rect(0, 30, 70, 46, "#f3dcc2") + rect(74, 26, 92, 50, "#efe0cf") + rect(170, 32, 70, 44, "#f6d9c9") +
        poly("-2,30 35,18 72,30", "#c0552f") + poly("72,26 120,12 168,26", "#b8623a") + poly("168,32 205,20 242,32", "#c0552f") +
        rect(24, 8, 5, 12, "#8a5a2b") + rect(188, 12, 5, 10, "#8a5a2b") +
        el("g", {}, rect(10, 36, 10, 10, "#8fd8ff", { rx: 1 }) + rect(46, 36, 10, 10, "#8fd8ff", { rx: 1 }) + rect(184, 40, 10, 9, "#ffe08a", { rx: 1 }) + rect(218, 40, 10, 9, "#8fd8ff", { rx: 1 })) +
        awning(84, 72, 32, "#e8384f", "#fff6e2", true) + rect(100, 44, 40, 32, "#8a5a2b", { opacity: 0.2 }) + rect(112, 50, 16, 26, "#5b3a1e") + disc(124, 64, 1, "#ffd166")) +
      el("path", { d: "M4,16 q116,12 232,0", fill: "none", stroke: "#8a5a2b", "stroke-width": 0.8 }) + bunting +
      // lamp posts
      el("g", {}, line(80, 76, 80, 30, "#3b2a1a", 1.6) + rect(77, 26, 6, 6, "#3b2a1a", { rx: 1 }) + rect(78.2, 27.2, 3.6, 3.6, "#ffe08a") +
        line(160, 76, 160, 30, "#3b2a1a", 1.6) + rect(157, 26, 6, 6, "#3b2a1a", { rx: 1 }) + rect(158.2, 27.2, 3.6, 3.6, "#ffe08a")) +
      rect(0, 76, 240, 14, "#d3a67a") + cobbles +
      stall(14, 36, "#2fbf4f", "#fff6e2", false) + stall(92, 44, "#2b7fff", "#fff6e2", true) + stall(172, 40, "#ffd400", "#fff6e2", false) +
      el("g", {}, rect(20, 58, 24, 7, "#a9743f", { rx: 1.5 }) + fruit) + hats + jars +
      // a basket of bread on the cobbles and a tiny stray coin
      el("g", {}, el("ellipse", { cx: 60, cy: 80, rx: 7, ry: 3, fill: "#c9a06a" }) + rect(55, 76, 4, 3, "#e8b04c", { rx: 1.5 }) + rect(60, 75, 4, 3, "#e8b04c", { rx: 1.5 }) +
        disc(226, 84, 1.8, "#ffd166"));
  };

  /* The Arena: an evening stadium — two tiers of stands full of family
     Craepets, torches burning, banners, a sand ring with a rope round
     it, spotlights, and confetti already falling for whoever wins. */
  P.arena = function () {
    var g = vgrad([[0, "#ff9d8f"], [0.45, "#ffc9b8"], [1, "#ffe6d6"]]);
    var stands = "";
    // the far tier and the near tier
    stands += path("M0,54 q120,-14 240,0 L240,66 q-120,-12 -240,0 Z", "#8a4f45") +
      path("M0,52 q120,-14 240,0 L240,56 q-120,-13 -240,0 Z", "#a86157") +
      path("M0,66 q120,-12 240,0 L240,78 q-120,-10 -240,0 Z", "#7a4239") +
      path("M0,64 q120,-13 240,0 L240,68 q-120,-12 -240,0 Z", "#96524a");
    var crowd = "";
    for (var i = 0; i < 22; i++) {
      var x = 6 + i * 11, yFar = 51 - 12 * Math.sin(Math.PI * x / 240) * 0.9, yNear = 63 - 10 * Math.sin(Math.PI * x / 240) * 0.9;
      crowd += crowdRow(x, yFar, 1, 0, i) + crowdRow(x + 5, yNear, 1, 0, i + 3);
    }
    var conf = "";
    for (var c = 0; c < 26; c++) {
      conf += rect(4 + (c * 53) % 234, 8 + (c * 31) % 40, 1.6, 2.6, ["#e8384f", "#ffd400", "#2fbf4f", "#2b7fff", "#ff8fd0"][c % 5],
        { rx: 0.4, opacity: 0.85, transform: "rotate(" + ((c * 37) % 90 - 45) + " " + (4 + (c * 53) % 234) + " " + (8 + (c * 31) % 40) + ")" });
    }
    function torch(x, y) {
      return glow(x, y - 4, 12, "#ffb347", 0.5) + rect(x - 1.2, y, 2.4, 14, "#5a3d22") +
        poly((x - 3) + "," + y + " " + x + "," + (y - 7) + " " + (x + 3) + "," + y, "#ff8c1a") +
        poly((x - 1.6) + "," + y + " " + x + "," + (y - 4.6) + " " + (x + 1.6) + "," + y, "#ffe27a");
    }
    function banner(x, y, c) {
      return line(x, y + 22, x, y, "#5a3d22", 1.2) + poly(x + "," + y + " " + (x + 12) + "," + (y + 2) + " " + (x + 8) + "," + (y + 6) + " " + (x + 12) + "," + (y + 10) + " " + x + "," + (y + 12), c);
    }
    return defs(g.def) + rect(0, 0, 240, 90, "url(#" + g.id + ")") +
      disc(200, 14, 9, "#ffe27a", 0.9) + cloud(40, 12, 0.9, "#fff", 0.6) +
      // spotlights
      el("g", { opacity: 0.22 }, poly("30,0 62,0 130,78 96,78", "#fff6c9") + poly("178,0 210,0 144,78 110,78", "#fff6c9")) +
      stands + crowd +
      el("g", {}, torch(18, 40) + torch(222, 40) + torch(70, 34) + torch(170, 34)) +
      banner(44, 24, "#e8384f") + banner(120, 16, "#ffd400") + banner(196, 24, "#2b7fff") +
      // the ring: sand, a rope on posts
      el("ellipse", { cx: 120, cy: 84, rx: 130, ry: 14, fill: "#e6c39a" }) +
      el("ellipse", { cx: 120, cy: 84, rx: 118, ry: 10, fill: "#f0d2ac" }) +
      el("path", { d: "M12,78 q108,-9 216,0", fill: "none", stroke: "#fff", "stroke-width": 1.4 }) +
      el("path", { d: "M12,78 q108,-9 216,0", fill: "none", stroke: "#e8384f", "stroke-width": 1.4, "stroke-dasharray": "5 5" }) +
      el("g", {}, rect(11, 72, 2.4, 8, "#5a3d22") + rect(226, 72, 2.4, 8, "#5a3d22") + rect(119, 68, 2.4, 8, "#5a3d22")) +
      conf +
      el("g", { opacity: 0.35 }, path("M0,88 q60,-4 120,0 t120,0", "#bb8f65"));
  };

  /* The Shadow Tower: a moonlit night, The Shade's tower with its
     windows lit purple, bats, and a low mist that is not quite fog. */
  P.tower = function () {
    var g = vgrad([[0, "#0d0b1f"], [0.55, "#2b2450"], [1, "#3a2f5c"]]);
    var lit = "";
    for (var i = 0; i < 6; i++) {
      var y = 68 - i * 9;
      lit += rect(112, y, 4, 5, "#c7a5ff", { rx: 1, opacity: i % 2 ? 0.9 : 0.6 }) +
             rect(124, y, 4, 5, "#c7a5ff", { rx: 1, opacity: i % 2 ? 0.6 : 0.9 });
    }
    return defs(g.def) + rect(0, 0, 240, 90, "url(#" + g.id + ")") +
      starfield(110, 240, 70, "#fff", 41) +
      disc(200, 20, 11, "#fff3cf") + disc(194, 17, 9, "#1b1738") +
      ridge([[50, 70], [120, 78], [200, 68], [240, 72]], 74, "#171330") +
      tower(120, 82, 34, 68, "#241f40", "#0d0b1f", "#8a5cff") + lit +
      el("g", { opacity: 0.9 }, bird(60, 30, 2, "#0d0b1f") + bird(160, 40, 1.8, "#0d0b1f") + bird(72, 24, 1.4, "#0d0b1f")) +
      el("g", { opacity: 0.35 }, path("M0,80 q40,-8 80,0 t80,0 t80,0 L240,90 L0,90 Z", "#8a5cff"));
  };

  /* Your Stall: the inside of your own little shop — striped wallpaper,
     shelves of real goods (jars, tins, a hat, a plant, books), a wooden
     counter with a bell and a cash tin, a scalloped awning over the
     window and a sign that says it is yours. */
  P.stall = function () {
    var g = vgrad([[0, "#fff4e2"], [1, "#ffe9cc"]]);
    var paper = "";
    for (var i = 0; i < 20; i++) paper += rect(i * 12, 0, 6, 60, "#ffe2bf", { opacity: 0.55 });
    function shelf(y) { return rect(6, y, 228, 2.6, "#a9743f") + rect(6, y + 2.6, 228, 1.2, "#7a5230", { opacity: 0.5 }); }
    var goods = "";
    // top shelf: jars and tins
    [[14, "#ffd166"], [24, "#ff9ad5"], [34, "#8fd8ff"], [44, "#a8e6a0"]].forEach(function (j) {
      goods += rect(j[0], 20, 8, 10, "#fff", { rx: 1.5, opacity: 0.9 }) + rect(j[0] + 1, 23, 6, 6, j[1], { rx: 1 }) + rect(j[0] + 0.5, 19.5, 7, 1.5, "#a9743f");
    });
    [[64, "#e8384f"], [74, "#2b7fff"], [84, "#2fbf4f"]].forEach(function (t) {
      goods += rect(t[0], 21, 8, 9, t[1], { rx: 1 }) + rect(t[0], 24, 8, 2.4, "#fff", { opacity: 0.8 });
    });
    // a hat on a stand, a plant, a row of books
    goods += line(112, 30, 112, 22, "#8a5a2b", 1.2) + el("ellipse", { cx: 112, cy: 22, rx: 8, ry: 2.4, fill: "#8a3ffc" }) + rect(107, 15, 10, 7, "#8a3ffc", { rx: 2 }) + rect(107, 19, 10, 1.4, "#ffd166");
    goods += rect(132, 24, 8, 6, "#c0552f", { rx: 1 }) + disc(136, 21, 3, "#4fae63") + disc(133, 19, 2.4, "#4fae63") + disc(139, 19, 2.4, "#4fae63");
    [[154, "#c05f8f"], [159, "#5f8fc0"], [164, "#c0a05f"], [169, "#5fc09a"], [174, "#e07a5f"]].forEach(function (b, i) {
      goods += rect(b[0], 20 + (i % 2), 4.4, 10 - (i % 2), b[1], { rx: 0.6 });
    });
    // second shelf: teddy, cakes, soap, a lamp
    goods += disc(20, 46, 4, "#c99a6b") + disc(17, 42.5, 1.6, "#c99a6b") + disc(23, 42.5, 1.6, "#c99a6b") + disc(18.6, 45.4, 0.6, "#241f36") + disc(21.4, 45.4, 0.6, "#241f36");
    [[40, "#ff9ad5"], [50, "#ffd166"], [60, "#a8e6a0"]].forEach(function (c) {
      goods += rect(c[0], 45, 8, 5, "#f6e2c0", { rx: 1 }) + rect(c[0], 43, 8, 2.5, c[1], { rx: 1 }) + disc(c[0] + 4, 42, 1, "#e8384f");
    });
    goods += rect(78, 45, 9, 5, "#8fd8ff", { rx: 1.5 }) + rect(90, 45, 9, 5, "#ff9ad5", { rx: 1.5 });
    goods += rect(112, 40, 2, 10, "#3b2a1a") + poly("106,40 120,40 117,34 109,34", "#ffe08a") + glow(113, 37, 10, "#ffe08a", 0.35);
    goods += rect(134, 42, 10, 8, "#fff6e2", { rx: 1 }) + rect(136, 44, 6, 4, "#e8384f", { rx: 0.6 });
    goods += disc(158, 46, 4.2, "#ff8c1a") + disc(167, 46, 4.2, "#ffd400") + disc(176, 46, 4.2, "#2fbf4f");
    // the window with its awning, looking out on the lane
    var win = rect(190, 14, 40, 34, "#8a5a2b", { rx: 2 }) + rect(193, 17, 34, 28, "#bfe9ff", { rx: 1 }) +
      ridge([[200, 36], [215, 33], [230, 37]], 36, "#a8dd8f").replace('d="M-5', 'd="M193').replace(/L\d+,36 L\d+,120 L-5,120 Z/, "L227,36 L227,45 L193,45 Z") +
      disc(219, 24, 3.6, "#ffe27a") + rect(209, 17, 1.6, 28, "#8a5a2b") + rect(193, 30, 34, 1.6, "#8a5a2b");
    var awn = "";
    for (var k = 0; k < 8; k++) awn += rect(186 + k * 6, 8, 6, 6, k % 2 ? "#e8384f" : "#fff6e2") + disc(189 + k * 6, 14, 3, k % 2 ? "#e8384f" : "#fff6e2");
    // the counter, the bell and the cash tin
    var counter = rect(0, 60, 240, 30, "#c9a06a") + rect(0, 60, 240, 3, "#e2c79c") +
      el("g", { opacity: 0.25 }, line(24, 66, 24, 90, "#7a5230", 1) + line(120, 66, 120, 90, "#7a5230", 1) + line(216, 66, 216, 90, "#7a5230", 1)) +
      rect(0, 74, 240, 2, "#a9743f", { opacity: 0.6 }) +
      el("g", {}, disc(206, 56, 4.4, "#ffd166") + rect(201.6, 56, 8.8, 3, "#ffd166") + rect(200, 59, 12, 1.6, "#a9743f") + disc(206, 51, 1, "#a9743f")) +
      el("g", {}, rect(20, 50, 16, 10, "#3b2a1a", { rx: 1.5 }) + rect(22, 52, 12, 3, "#ffe08a", { rx: 0.5 }) + disc(28, 58, 1.2, "#ffd166")) +
      el("g", {}, rect(96, 48, 48, 12, "#fff6e2", { rx: 2, stroke: "#a9743f", "stroke-width": 1 }) +
        el("text", { x: 120, y: 57, "text-anchor": "middle", "font-size": 7, fill: "#a9743f",
          "font-family": "system-ui, sans-serif", "font-weight": "bold" }, "MY SHOP"));
    return defs(g.def) + rect(0, 0, 240, 90, "url(#" + g.id + ")") + paper +
      shelf(30) + shelf(50) + goods + win + awn + counter;
  };

  P.nest = function () {
    var g = vgrad([[0, "#ffe9c9"], [0.7, "#fff6e8"], [1, "#ffeeda"]]);
    return defs(g.def) + rect(0, 0, 240, 90, "url(#" + g.id + ")") +
      el("g", { opacity: 0.5 }, path("M0,70 q60,-10 120,0 t120,0 L240,90 L0,90 Z", "#e8cfa8"));
  };

  P.quests = function () {
    var g = vgrad([[0, "#cfe3ff"], [0.6, "#eef4ff"], [1, "#f6f2e6"]]);
    return defs(g.def) + rect(0, 0, 240, 90, "url(#" + g.id + ")") +
      cloud(40, 16, 1) + cloud(190, 20, 0.8) +
      ridge([[70, 58], [160, 55], [240, 60]], 58, "#a9d894") +
      pine(20, 66, 1.2, "#3d8a58") + pine(224, 68, 1.1, "#3d8a58") +
      el("g", {},
        rect(84, 30, 72, 40, "#a9743f", { rx: 2 }) + rect(88, 34, 64, 32, "#e8cfa8", { rx: 1 }) +
        rect(94, 38, 22, 12, "#fff6e2", { rx: 1 }) + rect(120, 38, 26, 10, "#fff6e2", { rx: 1 }) +
        rect(96, 54, 30, 9, "#fff6e2", { rx: 1 }) +
        rect(86, 70, 6, 16, "#8a5a2b") + rect(148, 70, 6, 16, "#8a5a2b")) +
      rect(0, 78, 240, 12, "#8ecf74");
  };

  P.case = function () {
    var g = vgrad([[0, "#3a2f5c"], [0.6, "#5b4c8a"], [1, "#7a68ad"]]);
    var shelf = "";
    [30, 56].forEach(function (y) {
      shelf += rect(20, y, 200, 3, "#a9743f");
      for (var i = 0; i < 6; i++) {
        var x = 34 + i * 33;
        shelf += el("g", {}, poly((x - 4) + "," + (y - 3) + " " + (x + 4) + "," + (y - 3) + " " + x + "," + (y - 12), "#ffd166") +
          rect(x - 3, y - 3, 6, 3, "#e8b04c") + disc(x, y - 13, 2.4, "#ffe27a"));
      }
    });
    return defs(g.def) + rect(0, 0, 240, 90, "url(#" + g.id + ")") +
      starfield(30, 240, 30, "#fff", 13) + shelf +
      el("g", { opacity: 0.35 }, poly("100,0 140,0 130,90 110,90", "#fff6c9"));
  };

  P.bag = function () {
    var g = vgrad([[0, "#e8dcc4"], [0.6, "#f6ecd8"], [1, "#e2d2b6"]]);
    return defs(g.def) + rect(0, 0, 240, 90, "url(#" + g.id + ")") +
      el("g", { opacity: 0.5 },
        el("path", { d: "M0,20 q60,10 120,0 t120,0", fill: "none", stroke: "#c9a06a", "stroke-width": 2 }) +
        el("path", { d: "M0,40 q60,10 120,0 t120,0", fill: "none", stroke: "#c9a06a", "stroke-width": 2 }) +
        el("path", { d: "M0,60 q60,10 120,0 t120,0", fill: "none", stroke: "#c9a06a", "stroke-width": 2 })) +
      el("g", {}, rect(90, 34, 60, 44, "#c07f4f", { rx: 6 }) + rect(96, 26, 48, 14, "#a9743f", { rx: 6 }) +
        rect(112, 46, 16, 12, "#8a5a2b", { rx: 2 }));
  };

  function panoSvg(id) {
    var paint = P[id];
    if (!paint) return "";
    return '<svg class="pano-art" viewBox="0 0 240 90" preserveAspectRatio="xMidYMid slice" ' +
      'aria-hidden="true" focusable="false">' + paint() + "</svg>";
  }

  return {
    /* the painted view, ready to drop into a framed window */
    view: viewSvg,
    /* which frame this home wears */
    frame: frameFor,
    /* the painted panorama for a place that is not home */
    pano: panoSvg,
    hasPano: function (id) { return !!P[id]; },
    hasView: function (id) { return !!V[id]; },
    /* CSS background-image for a wall or a floor's texture */
    wallTexture: function (w) {
      var f = WALL_TEX[(w && w.tex) || "plain"] || WALL_TEX.plain;
      return f(w && w.a, w && w.b);
    },
    floorTexture: function (f) {
      var fn = FLOOR_TEX[(f && f.tex) || "plain"] || FLOOR_TEX.plain;
      return fn(f && f.a, f && f.b);
    },
    shade: shade
  };
})();
