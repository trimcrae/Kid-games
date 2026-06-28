/* ===========================================================
   Choose Your Own Adventure — PIXEL-ART TOOLKIT
   -----------------------------------------------------------
   Every picture is hand-authored pixel art drawn as crisp inline
   SVG <rect> "pixels" (via the shared PX helper, pixelsvg.js) —
   no image files, no downscaling. Same function names/signatures
   as before, so story-data.js / stories-long.js are unchanged.

   Coordinate space for EVERY scene is viewBox="0 0 400 300".
   Exposed as the global ART object.
   =========================================================== */
(function () {
  "use strict";

  let UID = 0;
  const uid = () => "g" + (UID++);

  /* ---- colour helpers ---- */
  function hexToRgb(h) {
    h = h.replace("#", "");
    if (h.length === 3) h = h.split("").map(c => c + c).join("");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const clamp = n => Math.max(0, Math.min(255, Math.round(n)));
  function shade(hex, pct) {
    const [r, g, b] = hexToRgb(hex);
    const f = pct / 100;
    const adj = v => (f < 0 ? v * (1 + f) : v + (255 - v) * f);
    const hx = v => { const s = clamp(v).toString(16); return s.length === 1 ? "0" + s : s; };
    return "#" + hx(adj(r)) + hx(adj(g)) + hx(adj(b));
  }

  const R = (x, y, w, h, c) => PX.rect(x, y, w, h, c);
  // a chunky pixel disc (radius in pixels, u = pixel size in viewBox units)
  function disc(cx, cy, rPx, color, u) {
    u = u || 4; let s = "";
    for (let gy = -rPx; gy <= rPx; gy++) {
      const w = Math.round(Math.sqrt(rPx * rPx - gy * gy));
      s += R(cx - w * u, cy + gy * u, (2 * w + 1) * u, u, color);
    }
    return s;
  }
  // stepped hill band top at y, filling down to 300
  function hillBand(y, color, step) {
    step = step || 20; let s = "";
    for (let x = 0; x < 400; x += step) {
      const dy = ((x / step) % 3) * 4;
      s += R(x, y + dy, step, 300 - (y + dy), color);
    }
    return s;
  }

  /* =========================================================
     BACKGROUNDS
     ========================================================= */
  function skyDay(o) {
    o = o || {};
    const top = o.top || "#8fd4ff", bot = o.bot || "#cfeeff";
    let s = R(0, 0, 400, 300, bot) + R(0, 0, 400, 170, top);
    if (o.sun !== false) {
      const sx = o.sunX || 60, sy = o.sunY || 54;
      s += disc(sx, sy, 7, "#ffe06a", 5) + disc(sx, sy, 5, "#fff3b0", 5);
    }
    if (o.clouds !== false) s += cloud(300, 58, 1) + cloud(140, 40, 0.75);
    if (o.hills !== false) {
      s += hillBand(214, o.hill2 || "#5cc24a", 24);
      s += hillBand(236, o.hill || "#7ed957", 20);
    }
    return s;
  }
  function skySunset(o) {
    o = o || {};
    let s = R(0, 0, 400, 300, "#ffd086") + R(0, 0, 400, 120, "#ff9a5a") + R(0, 120, 400, 70, "#ffb877");
    s += disc(200, 150, 9, "#fff0c2", 6) + disc(200, 150, 6, "#ffcf6b", 6);
    s += cloud(90, 70, 0.7) + cloud(320, 50, 0.9);
    s += hillBand(228, "#9c5b2c", 24) + hillBand(250, "#c97a3e", 20);
    return s;
  }
  function night(o) {
    o = o || {};
    let s = R(0, 0, 400, 300, "#241a52") + R(0, 0, 400, 90, "#1a1340") + R(0, 200, 400, 100, "#2a1f5e");
    if (o.moon !== false) {
      const mx = o.moonX || 320, my = o.moonY || 58;
      s += disc(mx, my, 8, "#ffe07a", 5) + R(mx - 12, my - 8, 8, 8, "#f0c44a") + R(mx + 10, my + 4, 6, 6, "#f0c44a");
    }
    [[40,40],[90,80],[150,30],[210,60],[60,130],[260,42],[110,150],[300,120],[30,90],[185,108],[350,170],[140,200]]
      .forEach((p, i) => s += star(p[0], p[1], i % 2 ? 6 : 9));
    if (o.ground !== false) s += R(0, 252, 400, 48, "#1b1140") + hillBand(248, "#1b1140", 22) + R(0, 270, 400, 30, "#241854");
    return s;
  }
  function forest(o) {
    let s = R(0, 0, 400, 300, "#cfeede") + R(0, 0, 400, 150, "#a9e0c4");
    s += R(0, 200, 400, 100, "#cdebab") + hillBand(206, "#a7da78", 24);
    s += tree(60, 214, 1.15, "#2f9e57") + tree(330, 208, 1.3, "#268a4c") + tree(150, 202, 0.8, "#3bb36a") + tree(250, 204, 0.9, "#2f9e57");
    s += mushroom(110, 256) + mushroom(300, 260, "#ffd166");
    return s;
  }
  function cave(o) {
    let s = R(0, 0, 400, 300, "#3a2c52") + R(0, 0, 400, 120, "#4a3a66");
    for (let i = 0; i < 7; i++) { const x = 18 + i * 56, h = 16 + (i % 3) * 12; s += R(x, 0, 16, h, "#2c2140"); }
    s += R(0, 250, 400, 50, "#2c2140") + hillBand(246, "#2c2140", 24) + R(0, 270, 400, 30, "#1e1630");
    return s;
  }
  function sea(o) {
    let s = R(0, 0, 400, 300, "#2a86c9") + R(0, 0, 400, 120, "#4fc3f7") + R(0, 120, 400, 130, "#1f6fae");
    // light rays
    s += R(96, 0, 8, 250, "rgba(191,234,255,.10)") + R(260, 0, 8, 250, "rgba(191,234,255,.10)");
    [[60,90,2],[80,140,1],[330,80,2],[200,70,1]].forEach(b => s += R(b[0], b[1], (b[2] + 1) * 4, (b[2] + 1) * 4, "rgba(223,246,255,.6)"));
    s += R(0, 256, 400, 44, "#f0dca0") + hillBand(252, "#f0dca0", 24);
    s += seaweed(50, 256) + seaweed(360, 250, "#2fae6b") + seaweed(150, 254, "#37c97c");
    return s;
  }
  function space(o) {
    let s = R(0, 0, 400, 300, "#0d0a26") + R(0, 0, 400, 160, "#1a1340");
    [[40,40],[90,90],[150,30],[210,70],[60,150],[260,40],[330,120],[300,210],[30,210],[185,200],[360,60],[120,250]]
      .forEach((p, i) => s += star(p[0], p[1], i % 2 ? 5 : 8));
    return s;
  }
  function library(o) {
    let s = R(0, 0, 400, 300, "#3a2718");
    const cols = ["#e8584f", "#f4a93c", "#48b06a", "#4a8fe0", "#a368d8", "#e36fa8", "#46c0c0"];
    for (let row = 0; row < 3; row++) {
      const y = 24 + row * 70;
      s += R(20, y, 360, 58, "#2c1d10");
      let bx = 30, n = 0;
      while (bx < 364) {
        const w = 16 + (bx % 3) * 4, h = 40 + (bx % 14);
        s += R(bx, y + 56 - h, w, h, cols[n % cols.length]);
        bx += w + 4; n++;
      }
    }
    s += R(0, 282, 400, 18, "#2c1d10");
    return s;
  }
  function meadow(o) {
    let s = skyDay({ hills: false });
    s += R(0, 200, 400, 100, "#86d562") + hillBand(206, "#6cc24a", 24);
    [[40,250,"#ff5d8f"],[110,266,"#ffd166"],[200,254,"#8a5cff"],[280,268,"#ff5d8f"],[350,250,"#ff8fc0"]]
      .forEach(f => s += flower(f[0], f[1], f[2]));
    return s;
  }
  function snowBg(o) {
    let s = R(0, 0, 400, 300, "#eef9ff") + R(0, 0, 400, 150, "#cfe9ff") + cloud(310, 46, 0.7) + cloud(120, 40, 0.5);
    s += R(0, 220, 400, 80, "#dceefc") + hillBand(226, "#fff", 26);
    s += "<g>" + tree(58, 240, 0.9, "#bfe3d0") + "</g>";
    [[40,60],[120,90],[200,50],[300,100],[350,70],[260,140],[80,150]].forEach(p => s += R(p[0], p[1], 4, 4, "#fff"));
    return s;
  }
  function plainsBg(o) {
    let s = skyDay({ hills: false });
    s += R(0, 210, 400, 90, "#86d562") + hillBand(214, "#6cc24a", 24);
    for (let x = 22; x < 400; x += 46) s += R(x, 256, 3, 16, "#4ea63a") + R(x + 6, 258, 3, 14, "#4ea63a") + R(x - 6, 258, 3, 14, "#4ea63a");
    return s;
  }
  function oceanBg(o) {
    let s = R(0, 0, 400, 300, "#9fdcff") + R(0, 0, 400, 150, "#bfeaff");
    s += R(0, 150, 400, 150, "#2f8fcf") + R(0, 150, 400, 60, "#3a9bd6");
    s += cloud(300, 50, 0.8) + cloud(90, 40, 0.6);
    for (let x = 0; x < 400; x += 40) s += R(x, 168 + (x / 40 % 2 ? 0 : 6), 24, 4, "rgba(191,234,255,.5)");
    return s;
  }
  function skyHighBg(o) {
    let s = R(0, 0, 400, 300, "#cdeeff") + R(0, 0, 400, 160, "#7cc6ff");
    s += cloud(80, 80, 1) + cloud(320, 60, 0.9) + cloud(200, 180, 1.1) + cloud(60, 230, 0.7) + cloud(340, 215, 0.8);
    return s;
  }
  function dungeonBg(o) {
    let s = R(0, 0, 400, 300, "#2a2730");
    for (let ry = 0; ry < 300; ry += 30)
      for (let cx = 0; cx < 440; cx += 50) {
        const off = (ry / 30) % 2 ? 25 : 0;
        s += R(cx - off, ry, 46, 26, "#3a3744") + R(cx - off, ry, 46, 3, "#46424f");
      }
    s += torch(58, 150) + torch(342, 150) + R(0, 262, 400, 38, "#22202a");
    return s;
  }
  function swampBg(o) {
    let s = R(0, 0, 400, 300, "#4a5a3a") + R(0, 0, 400, 150, "#8a9c72");
    s += R(0, 240, 400, 60, "#3a4a2e") + R(40, 268, 180, 12, "#2f3a26");
    s += tree(58, 256, 1, "#3a6b3a") + tree(332, 248, 1.1, "#2f5a2f");
    return s;
  }
  function beachBg(o) {
    let s = skyDay({ hills: false });
    s += R(0, 150, 400, 76, "#4fc3f7") + R(0, 150, 400, 12, "#7fd4ff");
    s += R(0, 224, 400, 76, "#f0dca0") + hillBand(220, "#f0dca0", 26) + R(0, 250, 400, 50, "#e6cf90");
    return s;
  }
  function desertBg(o) {
    let s = skyDay({ hills: false, clouds: false, top: "#ffd28a", bot: "#ffe9c2" });
    s += R(0, 230, 400, 70, "#e8b86a") + hillBand(228, "#e8b86a", 26) + R(0, 258, 400, 42, "#d89a4a");
    s += "<g transform=\"translate(330 232)\">" + R(-5, -30, 10, 40, "#3a8a4a") + R(-20, -18, 10, 6, "#3a8a4a") + R(-20, -30, 6, 14, "#3a8a4a") + R(10, -22, 12, 6, "#3a8a4a") + R(16, -34, 6, 16, "#3a8a4a") + "</g>";
    return s;
  }
  function mountainBg(o) {
    let s = skyDay({ hills: false });
    s += "<path d=\"M0 250 L90 110 L150 200 L220 90 L300 210 L400 130 V300 H0Z\" fill=\"#9aa7c4\" shape-rendering=\"crispEdges\"/>";
    s += R(74, 110, 32, 16, "#fff") + R(204, 90, 34, 18, "#fff");
    s += R(0, 252, 400, 48, "#7e8aa6");
    return s;
  }
  function lavaCaveBg(o) {
    let s = cave(o || {});
    s += R(0, 272, 400, 28, "#d8551f") + hillBand(270, "#ff8a1f", 24) + R(0, 286, 400, 14, "#c43a1f");
    s += R(116, 280, 6, 6, "#ffd166") + R(296, 284, 5, 5, "#ffd166");
    return s;
  }

  /* =========================================================
     SMALL SCENERY
     ========================================================= */
  function cloud(x, y, sc) {
    sc = sc || 1;
    const rows = ["..WWWW..", ".WWWWWW.", "WWWWWWWW", "WWWWWWWW"];
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + PX.sprite(rows, { W: "#ffffff" }, { u: 7, cx: 0, cy: 0 }) + `</g>`;
  }
  function star(x, y, size) {
    const u = size > 7 ? 3 : 2, c = "#fff3b0";
    return `<g transform="translate(${x} ${y})">` + R(-u / 2, -u * 1.5, u, u * 3, c) + R(-u * 1.5, -u / 2, u * 3, u, c) + `</g>`;
  }
  function tree(x, y, sc, col) {
    sc = sc || 1; col = col || "#2f9e57";
    const L = shade(col, 16), D = shade(col, -14), T = "#8a5a33";
    const rows = [
      "..LLLLL..",
      ".LLcccLL.",
      "LLccccDLL",
      "LLccccDLL",
      "LLccccDLL",
      ".LLcccDL.",
      "..LLLLD..",
      "...TTT...",
      "...TTT...",
      "...TTT..."
    ];
    return `<g transform="translate(${x} ${y}) scale(${sc})">` +
      PX.sprite(rows, { L: col, c: L, D: D, T: T }, { u: 8, cx: 0, bottom: 16 }) + `</g>`;
  }
  function mushroom(x, y, cap) {
    cap = cap || "#e8584f";
    const rows = ["cCCCc", "CCCCC", "CdCdC", ".SSS.", ".SSS."];
    return `<g transform="translate(${x} ${y})">` +
      PX.sprite(rows, { C: cap, c: shade(cap, -12), d: "#fff", S: "#fff4e0" }, { u: 5, cx: 0, bottom: 10 }) + `</g>`;
  }
  function flower(x, y, col) {
    col = col || "#ff5d8f";
    const pal = { P: col, Y: "#ffd166", G: "#3ba24a" };
    const rows = [".P.P.", "PPPPP", "PYPYP", "PPPPP", "..G..", "..G..", "..G.."];
    return `<g transform="translate(${x} ${y})">` + PX.sprite(rows, pal, { u: 4, cx: 0, bottom: 22 }) + `</g>`;
  }
  function seaweed(x, y, col) {
    col = col || "#37a85e";
    let s = "";
    for (let i = 0; i < 9; i++) s += R(-3 + (i % 2 ? 4 : 0), -i * 7, 5, 7, col);
    return `<g transform="translate(${x} ${y})">${s}</g>`;
  }
  function castle(x, y, sc) {
    sc = sc || 1;
    const W = "#e7d6ff", L = "#f3e9ff", S = "#c89bff", Y = "#ffd166", D = "#7a52b0", k = "#ff8fc0";
    let s = "";
    s += R(-64, -44, 128, 56, W) + R(-64, -44, 128, 4, L);
    s += R(-90, -64, 30, 76, W) + R(-90, -64, 30, 4, L) + R(60, -64, 30, 76, W) + R(60, -64, 30, 4, L);
    s += R(-18, -98, 36, 110, W) + R(-18, -98, 36, 4, L);
    [-90, -78, 60, 72].forEach(c => s += R(c, -72, 8, 8, W));
    s += R(-18, -106, 8, 8, W) + R(-4, -106, 8, 8, W) + R(10, -106, 8, 8, W);
    s += R(-90, -64, 6, 76, S) + R(60, -64, 6, 76, S) + R(-18, -98, 6, 110, S);
    [-4].forEach(c => s += R(c, -114, 6, 8, k)); s += R(-86, -80, 4, 8, k) + R(72, -80, 4, 8, k);
    [[-84, -52], [70, -52], [-7, -90]].forEach(p => s += R(p[0], p[1], 12, 16, Y));
    s += R(-12, -16, 24, 28, D) + R(-12, -16, 24, 3, S);
    return `<g transform="translate(${x} ${y}) scale(${sc})">${s}</g>`;
  }

  /* =========================================================
     CHARACTERS — kids
     ========================================================= */
  function princess(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const dress = o.dress || "#ff5d8f", d2 = shade(dress, -20), dL = shade(dress, 22);
    const hair = o.hair || "#5a3a22", skin = o.skin || "#ffd9b8", crown = o.crown !== false;
    const pal = { D: dress, d: d2, L: dL, H: hair, S: skin, E: "#2b2440", P: "#ff9ec2", M: "#b5466e", Y: "#ffd166", k: "#ff5d8f", a: skin };
    const rows = [
      crown ? "...Y.k.Y..." : "...........",
      crown ? "...YYYYY..." : "...........",
      "...HHHHH...",
      "..HHHHHHH..",
      ".HHSSSSSHH.",
      ".HSEsSsESH.",
      ".HSSSSSSSH.",
      ".HSPSMSPSH.",
      "..SSSSSSS..",
      "....SSS....",
      "...LDDDL...",
      "a..DDdDD..a",
      "a.DDDdDDD.a",
      ".LDDDdDDDL.",
      ".DDDDdDDDD.",
      "DDDDDdDDDDD",
      "LDDDDdDDDDL"
    ];
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + R(-26, 6, 52, 5, "rgba(0,0,0,.15)") +
      PX.sprite(rows, pal, { u: 4, cx: 0, bottom: 10 }) + (o.extra || "") + `</g>`;
  }
  function boy(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const shirt = o.shirt || "#4a8fe0", hair = o.hair || "#3a2a1a", skin = o.skin || "#f0c79a", pants = o.pants || "#3a4a6b";
    const pal = { T: shirt, t: shade(shirt, -16), H: hair, S: skin, E: "#2b2440", P: "#a8324f", N: pants };
    const rows = [
      "..HHHHH..",
      ".HHHHHHH.",
      ".HSSSSSH.",
      ".HSESEsH.",
      ".HSSSSSH.",
      "..SSPSS..",
      "...SSS...",
      ".STTTTTS.",
      "STTTTTTTS",
      "STTTTTTTS",
      ".TTTTTTT.",
      ".TTTTTTT.",
      "..NN.NN..",
      "..NN.NN..",
      "..NN.NN.."
    ];
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + R(-24, 8, 48, 5, "rgba(0,0,0,.15)") +
      PX.sprite(rows, pal, { u: 4, cx: 0, bottom: 12 }) + (o.extra || "") + `</g>`;
  }
  function baby(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const wrap = o.wrap || "#bfe3ff", skin = o.skin || "#ffd9b8";
    const pal = { W: wrap, w: shade(wrap, -12), H: "#6a4a2a", S: skin, E: "#2b2440", P: "#ff9ab0" };
    const rows = [
      "..HHHH..",
      ".HSSSSH.",
      ".SEPSES.",
      ".SSSSSS.",
      "..SSSS..",
      "WWWWWWWW",
      "WwWWWWwW",
      ".WWWWWW."
    ];
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + R(-20, 10, 40, 4, "rgba(0,0,0,.12)") +
      PX.sprite(rows, pal, { u: 4, cx: 0, bottom: 12 }) + `</g>`;
  }

  /* =========================================================
     CHARACTERS — creatures
     ========================================================= */
  function dragon(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const col = o.color || "#7ed957", B = shade(col, 30), w = shade(col, -18);
    const sad = o.mood === "sad";
    const pal = { C: col, B: B, w: w, E: "#2b2440", H: "#fff", e: "#2b2440" };
    const rows = [
      ".w...C.C..",
      ".w..CCCCC.",
      "ww.CCEHEC.",  // head w/ eyes
      "wwwCCCCCC.",
      "wCCCCBBCC.",
      "wCCCBBBBCC",
      ".CCCBBBBCC",
      ".CCCCBBCCw",
      "..CCCCCCww",
      "...CCCC.w."
    ];
    const rowsSad = rows.slice();
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + R(-32, 20, 64, 6, "rgba(0,0,0,.15)") +
      PX.sprite(sad ? rowsSad : rows, pal, { u: 5, cx: 0, bottom: 24 }) + `</g>`;
  }
  function puppy(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, c = o.color || "#c98a4a", d = shade(c, -18);
    const pal = { C: c, d: d, E: "#2b2440", N: "#2b2440", W: "#fff" };
    const rows = [
      "dd..CCCCC.",
      "ddd.CCCCCC",
      "dCCdCCCCCC",
      "CCEdCECC.C",  // face
      "CCCNNCCC..",
      ".CCCCCCC..",
      ".CCCCCCCC.",
      "..CC..CC.."
    ];
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + R(-24, 16, 48, 5, "rgba(0,0,0,.15)") +
      PX.sprite(rows, pal, { u: 4.6, cx: 0, bottom: 20 }) + `</g>`;
  }
  function fox(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, C = "#ef8a3c", W = "#fff", D = "#2b2440";
    const rows = [
      "D..C..C..D",
      "DC.CCCC.CD",
      ".CCCCCCCC.",
      ".CDCWWCDC.",
      ".CCWWWWCC.",
      "..CWDDWC..",
      "..CCCCCC..",
      "...CCCC..."
    ];
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + R(-22, 16, 44, 5, "rgba(0,0,0,.15)") +
      PX.sprite(rows, { C: C, W: W, D: D }, { u: 4.4, cx: 0, bottom: 20 }) + `</g>`;
  }
  function fish(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, c = o.color || "#ff8f3c", L = shade(c, 18), D = shade(c, -12);
    const pal = { C: c, L: L, D: D, W: "#fff", E: "#2b2440" };
    const rows = [
      "...LLL..D.",
      ".CCCCCCDDD",
      "CWECCCCCDD",  // eye
      "CWCCCCCCDD",
      ".CCCCCCDDD",
      "...LLL..D."
    ];
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + PX.sprite(pal && rows, pal, { u: 4, cx: 0, cy: 0 }) + `</g>`;
  }
  function mermaid(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, tail = o.tail || "#37c97c", hair = o.hair || "#c0392b", skin = o.skin || "#ffd9b8";
    const pal = { T: tail, t: shade(tail, 18), H: hair, S: skin, E: "#2b2440" };
    const rows = [
      "..HHHH..",
      ".HSSSSH.",
      ".HSESES.",
      ".HSSSSH.",
      "..SHHS..",
      "..TTTT..",
      "..TtTT..",
      "..TTTT..",
      ".TT..TT.",
      "tT....Tt"
    ];
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + PX.sprite(rows, pal, { u: 4.2, cx: 0, bottom: 30 }) + `</g>`;
  }
  function owl(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, B = "#8a6a4a", b = "#c9a878";
    const pal = { B: B, b: b, W: "#fff", E: "#2b2440", Y: "#ffb142" };
    const rows = [
      "B.B...B.B",
      "BBB...BBB",
      "BBBBBBBBB",
      "BWWBBBWWB",
      "BWEBBBEWB",
      "BBBBYBBBB",
      "BbbbbbbB.",
      ".BbbbbB..",
      "..B...B.."
    ];
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + PX.sprite(rows, pal, { u: 4, cx: 0, bottom: 22 }) + `</g>`;
  }
  function sheep(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const pal = { W: "#f7f7f7", w: "#e2e2e2", F: "#33323a", E: "#fff" };
    const rows = [
      ".WWWWWW...",
      "WWWWWWWFF.",
      "WWwWWWWFEF",
      "WWWWWWWFFF",
      ".WWWWWW.F.",
      "..F..F...."
    ];
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + R(-22, 14, 44, 4, "rgba(0,0,0,.12)") +
      PX.sprite(rows, pal, { u: 4.4, cx: 0, bottom: 16 }) + `</g>`;
  }
  function dolphin(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, c = o.color || "#6fb7d9", L = shade(c, 14), D = shade(c, -12);
    const pal = { C: c, L: L, D: D, E: "#2b2440" };
    const rows = [
      "...D......",
      "..DDD.CCCC",
      ".CCCCCCCCD",
      "CCECCCCCDD",
      "LLLCCCCCD.",
      ".CCCCCC...",
      "...CC.CC.."
    ];
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + PX.sprite(rows, pal, { u: 4, cx: 0, cy: 0 }) + `</g>`;
  }
  function dino(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, c = o.color || "#7ec850", D = shade(c, -10);
    const pal = { C: c, D: D, E: "#2b2440" };
    const rows = [
      "......CCC.",
      "....CCCCC.",
      "...CCCECC.",  // head
      "..CCCCCCC.",
      "CCCCCCC...",
      "DCCCCCCC..",
      ".CCCCCCC..",
      "..CC..CC.."
    ];
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + R(-28, 18, 56, 5, "rgba(0,0,0,.12)") +
      PX.sprite(rows, pal, { u: 4.6, cx: 0, bottom: 22 }) + `</g>`;
  }
  function snowman(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const pal = { W: "#fff", w: "#e8f2fb", E: "#2b2440", N: "#ff8f1f", H: "#33323a", R: "#e8584f" };
    const rows = [
      "..HHHHH..",
      "..HHHHH..",
      ".RRRRRRR.",
      "..WEWEW..",
      "..WWNWW..",
      ".WWWWWWW.",
      "WWWwWWWWW",
      "WWWWWWWWW",
      "WWWWWWWWW",
      ".WWWWWWW."
    ];
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + PX.sprite(rows, pal, { u: 4, cx: 0, bottom: 16 }) + `</g>`;
  }
  function bird(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, c = o.color || "#ffd166", D = shade(c, -12);
    const pal = { C: c, D: D, E: "#2b2440", Y: "#ff8f1f" };
    const rows = ["..CCC.", ".CCECC", "DCCCCY", ".CCCC.", "..CC.."];
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + PX.sprite(rows, pal, { u: 4, cx: 0, cy: 0 }) + `</g>`;
  }
  function crab(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, C = "#e8584f", E = "#2b2440";
    const rows = [
      "C.C....C.C",
      ".CC.EE.CC.",
      "CCCCCCCCCC",
      "CCCCCCCCCC",
      ".C.C..C.C."
    ];
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + PX.sprite(rows, { C: C, E: E }, { u: 4, cx: 0, cy: 0 }) + `</g>`;
  }
  function ghost(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const pal = { W: "#eef4ff", E: "#2b2440", M: "#7a90b5" };
    const rows = ["..WWWW..", ".WWWWWW.", "WWEWWEWW", "WWWWWWWW", "WWMWWMWW", "WWWWWWWW", "W.WW.WW."];
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + PX.sprite(rows, pal, { u: 5, cx: 0, cy: 0 }) + `</g>`;
  }

  /* =========================================================
     SPACE & VEHICLES
     ========================================================= */
  function rocket(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, c = o.color || "#e8584f";
    const pal = { B: "#f2f2f2", b: "#d8d8d8", C: c, G: "#7fd4ff", g: "#cdeeff", f: "#ffb142", y: "#ffe066" };
    const rows = [
      "...CC...",
      "..BBBB..",
      ".BBBBBB.",
      ".BBGGBB.",
      ".BBggBB.",
      ".BBBBBB.",
      "bBBBBBBb",
      "CBBBBBBC",
      "C.BBBB.C",
      o.flame ? "..ffff.." : "........",
      o.flame ? "...yy..." : "........"
    ];
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + PX.sprite(rows, pal, { u: 5, cx: 0, cy: 0 }) + `</g>`;
  }
  function planet(x, y, r, col, ring) {
    col = col || "#e8584f";
    const rPx = Math.max(2, Math.round((r || 30) / 4));
    let s = "";
    if (ring) s += R(x - r * 1.8, y - 2, r * 3.6, 5, shade(col, 20));
    s += disc(x, y, rPx, col, 4);
    s += disc(x - Math.round(r * 0.35), y - Math.round(r * 0.2), Math.max(1, Math.round(rPx * 0.3)), shade(col, -18), 4);
    return s;
  }
  function alien(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, c = o.color || "#9be15d", D = shade(c, -30);
    const pal = { C: c, W: "#fff", E: "#2b2440", D: D };
    const rows = [
      "C.....C",
      "C.....C",
      ".CCCCC.",
      "CCCCCCC",
      "CWECEWC",
      "CCCCCCC",
      ".CDDDC.",
      "..C.C.."
    ];
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + R(-20, 14, 40, 5, "rgba(0,0,0,.15)") +
      PX.sprite(rows, pal, { u: 4, cx: 0, bottom: 16 }) + `</g>`;
  }

  /* =========================================================
     BLOCK WORLD PROPS
     ========================================================= */
  function block(x, y, s, top, side) {
    return `<g transform="translate(${x} ${y})">` + R(0, 0, s, s, side) + R(0, 0, s, Math.round(s * 0.28), top) +
      R(0, 0, s, 2, shade(side, 18)) + `</g>`;
  }
  function grassBlocks(y) {
    let s = "";
    for (let x = 0; x < 400; x += 40) s += block(x, y, 40, "#7ed957", "#8a5a33");
    for (let x = 0; x < 400; x += 40) s += block(x, y + 40, 40, "#8a5a33", "#6b4423");
    return s;
  }
  function diamond(x, y, sc) {
    sc = sc || 1;
    const pal = { D: "#5ee7e0", L: "#9af6f0", d: "#2fb0a9" };
    const rows = ["LLDD", "LDDd", "DDdd", ".dd.", "..d."];
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + PX.sprite(rows, pal, { u: 4, cx: 0, cy: 0 }) + `</g>`;
  }
  function pickaxe(x, y, sc) {
    sc = sc || 1;
    let s = R(-2, -2, 5, 34, "#8a5a33") + R(-20, -16, 40, 6, "#9fb3c9") + R(-20, -16, 40, 2, "#cfe0ef");
    return `<g transform="translate(${x} ${y}) scale(${sc}) rotate(-20)">${s}</g>`;
  }
  function torch(x, y) {
    return `<g transform="translate(${x} ${y})">` + R(-2, 0, 4, 20, "#8a5a33") + R(-5, -8, 10, 8, "#ffb142") + R(-3, -6, 6, 4, "#ffe066") + `</g>`;
  }
  function fizzer(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const pal = { G: "#6fc56f", g: "#5cb85c", d: "#4aa34a", E: "#2b2440" };
    const rows = [
      "GGGGGGGG",
      "GEEGGEEG",
      "GEEGGEEG",
      "GGEEEEGG",
      "ggEEEEgg",
      "ggGEEGgg",
      "ggGEEGgg",
      "gd.gg.dg"
    ];
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + R(-22, 34, 44, 5, "rgba(0,0,0,.15)") +
      PX.sprite(rows, pal, { u: 4.4, cx: 0, bottom: 36 }) + `</g>`;
  }

  /* =========================================================
     CAMP PROPS
     ========================================================= */
  function tent(x, y, sc, col) {
    sc = sc || 1; col = col || "#e8584f";
    const pal = { C: col, c: shade(col, -15), D: "#3a2718", Y: "#ffd166" };
    const rows = [
      "....Y.....",
      "...CCC....",
      "..CCcCC...",
      ".CCCcDCC..",
      "CCCCcDDCC.",
      "CCCCcDDCCC",
      "CCCCcDDCCC"
    ];
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + PX.sprite(rows, pal, { u: 6, cx: 0, bottom: 12 }) + `</g>`;
  }
  function campfire(x, y, sc) {
    sc = sc || 1;
    const pal = { F: "#ff8f1f", Y: "#ffe066", L: "#8a5a33" };
    const rows = ["..F..", ".FYF.", "FYYYF", "FFYFF", "LLLLL"];
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + PX.sprite(rows, pal, { u: 5, cx: 0, bottom: 12 }) + `</g>`;
  }
  function smore(x, y, sc) {
    sc = sc || 1;
    let s = R(-16, 6, 32, 8, "#c98a4a") + R(-15, -2, 30, 8, "#5a3a22") + R(-16, -10, 32, 9, "#fff4e0") + R(-16, -18, 32, 8, "#c98a4a");
    return `<g transform="translate(${x} ${y}) scale(${sc})">${s}</g>`;
  }
  function gem(x, y, sc, col) {
    sc = sc || 1; col = col || "#ff5d8f";
    const pal = { C: col, L: shade(col, 28), D: shade(col, -22) };
    const rows = ["LLCCDD", "LCCCDD", ".CCCD.", ".CCD..", "..C..."];
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + PX.sprite(rows, pal, { u: 6, cx: 0, cy: 0 }) + `</g>`;
  }

  /* =========================================================
     EXTRA PROPS & CHARACTERS
     ========================================================= */
  function chest(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    let s = R(-22, -6, 44, 6, "#a06a3a") + R(-22, 0, 44, 18, "#8a5a33") + R(-22, 0, 44, 4, "#6b4423") + R(-4, -2, 8, 12, "#ffd166");
    return `<g transform="translate(${x} ${y}) scale(${sc})">${s}</g>`;
  }
  function key(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, c = "#ffd166";
    let s = R(-16, -8, 16, 16, c) + R(-12, -4, 8, 8, "#c79a2e") + R(0, -3, 18, 6, c) + R(14, 3, 4, 6, c) + R(8, 3, 4, 6, c);
    return `<g transform="translate(${x} ${y}) scale(${sc})">${s}</g>`;
  }
  function scroll(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    let s = R(-16, -18, 32, 36, "#f3e6c4") + R(-16, -18, 32, 5, "#d9c79a") + R(-16, 13, 32, 5, "#d9c79a") +
      R(-10, -8, 20, 2, "#b09a66") + R(-10, -2, 20, 2, "#b09a66") + R(-10, 4, 14, 2, "#b09a66");
    return `<g transform="translate(${x} ${y}) scale(${sc})">${s}</g>`;
  }
  function sign(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    let s = R(-3, 0, 6, 24, "#6b4423") + R(-22, -22, 44, 22, "#a06a3a") + R(-22, -22, 44, 22, "none") +
      R(-14, -14, 28, 2, "#6b4423") + R(-14, -8, 20, 2, "#6b4423");
    return `<g transform="translate(${x} ${y}) scale(${sc})">${s}</g>`;
  }
  function crystal(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, c = o.color || "#a368d8";
    const pal = { C: c, L: shade(c, 18), D: shade(c, -15) };
    const rows = ["LCD", "LCD", "CCD", ".C.", ".D."];
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + PX.sprite(rows, pal, { u: 5, cx: 0, cy: 0 }) + `</g>`;
  }
  function anvil(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, c = "#4a4a55";
    let s = R(-18, -10, 36, 6, c) + R(-8, -4, 16, 6, c) + R(-12, 2, 24, 6, c);
    return `<g transform="translate(${x} ${y}) scale(${sc})">${s}</g>`;
  }
  function coral(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, c = o.color || "#ff7eb6";
    let s = R(-2, -30, 4, 30, c) + R(-12, -24, 4, 24, c) + R(8, -26, 4, 26, c) + R(-12, -24, 14, 4, c) + R(0, -26, 12, 4, c);
    return `<g transform="translate(${x} ${y}) scale(${sc})">${s}</g>`;
  }
  function ship(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    let s = R(-42, -4, 84, 6, "#8a5a33") + R(-40, 2, 80, 18, "#6b4423") + R(-2, -58, 4, 58, "#5a3a22") +
      R(2, -54, 24, 22, "#f3e6c4") + R(-22, -50, 20, 18, "#e8dcc0") + R(2, -58, 16, 6, "#e8584f");
    return `<g transform="translate(${x} ${y}) scale(${sc})">${s}</g>`;
  }
  function bookGlow(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, c = o.color || "#ffd166";
    let s = disc(0, 0, 7, shade(c, 35), 4) + R(-16, -16, 14, 32, c) + R(2, -16, 14, 32, shade(c, -12)) + R(-2, -16, 4, 32, "#fff");
    return `<g transform="translate(${x} ${y}) scale(${sc})" opacity=".95">${s}</g>`;
  }
  function portal(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, c = o.color || "#a368d8";
    let s = "";
    for (let gy = -12; gy <= 12; gy++) { const w = Math.round(8 * Math.sqrt(Math.max(0, 1 - (gy * gy) / 144))); s += R(-w * 4, gy * 4, w * 8, 4, gy % 3 === 0 ? shade(c, 20) : c); }
    return `<g transform="translate(${x} ${y}) scale(${sc})">${s}</g>`;
  }
  function sword(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    let s = R(-3, -28, 6, 30, "#cfd8e3") + R(-10, 3, 20, 5, "#8a5a33") + R(-3, 8, 6, 12, "#6b4423");
    return `<g transform="translate(${x} ${y}) scale(${sc})">${s}</g>`;
  }
  function shield(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, c = o.color || "#e8584f";
    const pal = { C: c, W: "#fff" };
    const rows = ["CCCCCC", "CCWCCC", "CWWWCC", "CCWCCC", ".CCCC.", "..CC.."];
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + PX.sprite(rows, pal, { u: 5, cx: 0, cy: 0 }) + `</g>`;
  }
  function beacon(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    let s = R(-3, -150, 6, 150, "rgba(191,240,255,.45)") + R(-9, -40, 18, 40, "rgba(127,212,255,.55)") +
      R(-16, -6, 32, 22, "#9fb3c9") + R(-16, -6, 32, 6, "#cfe3f0") + R(-6, -4, 12, 12, "#eafdff");
    return `<g transform="translate(${x} ${y}) scale(${sc})">${s}</g>`;
  }
  function mountainProp(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    let s = "<path d=\"M-44 0 L0 -56 L44 0Z\" fill=\"#9aa7c4\" shape-rendering=\"crispEdges\"/>" + R(-15, -19, 30, 8, "#fff") + R(-8, -30, 16, 12, "#fff");
    return `<g transform="translate(${x} ${y}) scale(${sc})">${s}</g>`;
  }

  /* ---- costumed kids: pixel boy + a hat/helmet on top ---- */
  function knight(o) {
    const base = boy({ x: 0, y: 0, scale: 1, shirt: o.shirt || "#9fb3c9", pants: "#5a6473" });
    let hat = R(-18, -54, 36, 6, "#c2ccd6") + R(-4, -60, 8, 8, "#9aa6b3") + R(-18, -48, 36, 3, "#8a96a3");
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.scale || 1})">${base}${hat}</g>`;
  }
  function wizard(o) {
    const base = boy({ x: 0, y: 0, scale: 1, shirt: o.shirt || "#5e3bb0", pants: "#3a2566" });
    let hat = "<g transform=\"translate(0 -52)\">" + R(-4, -28, 8, 8, o.hat || "#4a2d8a") + R(-8, -20, 16, 8, o.hat || "#4a2d8a") + R(-14, -12, 28, 8, o.hat || "#4a2d8a") + R(-18, -4, 36, 6, o.hat || "#4a2d8a") + R(-2, -30, 4, 4, "#ffd166") + "</g>";
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.scale || 1})">${base}${hat}</g>`;
  }
  function pirate(o) {
    const base = boy({ x: 0, y: 0, scale: 1, shirt: o.shirt || "#c0392b", pants: "#3a2718" });
    let hat = R(-18, -56, 36, 8, "#2b2440") + R(-10, -50, 8, 6, "#2b2440");
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.scale || 1})">${base}${hat}</g>`;
  }
  function villager(o) {
    const base = boy({ x: 0, y: 0, scale: 1, shirt: o.shirt || "#7a6b4a", pants: "#5a4a33" });
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.scale || 1})">${base}${R(4, -50, 5, 7, "#d9a066")}</g>`;
  }

  /* =========================================================
     SCENE COMPOSER (unchanged registry/API)
     ========================================================= */
  const BG = {
    day: skyDay, sunset: skySunset, night: o => night(o || {}), forest, cave,
    lavacave: lavaCaveBg, sea, ocean: oceanBg, beach: beachBg, space, library,
    meadow, snow: snowBg, plains: plainsBg, sky: skyHighBg, dungeon: dungeonBg,
    swamp: swampBg, desert: desertBg, mountain: mountainBg,
    grassblocks: o => skyDay({ clouds: !(o && o.clouds === false) }) + grassBlocks((o && o.y) || 190)
  };
  const ACTOR = {
    princess, boy, baby, dragon, puppy, fox, fish, mermaid, owl, alien, fizzer,
    knight, wizard, pirate, villager, ghost, sheep, dolphin, dino, snowman, bird, crab,
    rocket, chest, key, scroll, sign, crystal, anvil, coral, ship, bookGlow, portal, sword, shield, beacon,
    mountain: mountainProp,
    bigDragon: o => dragon(Object.assign({}, o, { scale: (o.scale || 1) * 1.7 })),
    planet: o => planet(o.x, o.y, o.r || 30, o.color || "#e8584f", o.ring),
    tree: o => tree(o.x, o.y, o.scale, o.color),
    mushroom: o => mushroom(o.x, o.y, o.color),
    flower: o => flower(o.x, o.y, o.color),
    castle: o => castle(o.x, o.y, o.scale),
    cloud: o => cloud(o.x, o.y, o.scale),
    diamond: o => diamond(o.x, o.y, o.scale),
    pickaxe: o => pickaxe(o.x, o.y, o.scale),
    torch: o => torch(o.x, o.y),
    gem: o => gem(o.x, o.y, o.scale, o.color),
    campfire: o => campfire(o.x, o.y, o.scale),
    tent: o => tent(o.x, o.y, o.scale, o.color),
    smore: o => smore(o.x, o.y, o.scale),
    block: o => block(o.x, o.y, o.size || 30, o.top || "#7ed957", o.side || "#8a5a33"),
    star: o => `<g transform="translate(${o.x} ${o.y})">${star(0, 0, o.size || 14)}</g>`
  };
  function scene(d) {
    d = d || {};
    const bg = BG[d.bg] || skyDay;
    let s = bg(d.bgOpts || {});
    (d.props || []).forEach(p => { const f = ACTOR[p[0]]; if (f) { try { s += f(p[1] || {}); } catch (e) {} } });
    if (d.extra) s += d.extra;
    return s;
  }
  scene.backgrounds = Object.keys(BG);
  scene.actors = Object.keys(ACTOR);

  window.ART = {
    uid, shade, scene,
    skyDay, skySunset, night, forest, cave, sea, space, library, meadow,
    snowBg, plainsBg, oceanBg, skyHighBg, dungeonBg, swampBg, beachBg, desertBg, mountainBg, lavaCaveBg,
    cloud, star, tree, mushroom, flower, seaweed, castle,
    princess, boy, baby, knight, wizard, pirate, villager, ghost,
    dragon, puppy, fox, fish, mermaid, owl, sheep, dolphin, dino, snowman, bird, crab,
    rocket, planet, alien,
    block, grassBlocks, diamond, pickaxe, torch, fizzer,
    tent, campfire, smore, gem,
    chest, key, scroll, sign, crystal, anvil, coral, ship, bookGlow, portal, sword, shield, beacon, mountainProp
  };
})();
