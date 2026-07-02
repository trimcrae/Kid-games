/* ===========================================================
   Choose Your Own Adventure — VECTOR ART TOOLKIT
   -----------------------------------------------------------
   Every picture is a smooth, modern vector illustration built
   from layered gradients, soft bézier shapes, cute rounded
   characters and a sprinkle of gentle SMIL animation — no
   image files, no frameworks. Same function names/signatures
   as the old pixel toolkit, so story-data.js / stories-long.js
   are unchanged.

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

  /* ---- gradient / filter builders (unique ids every render) ---- */
  const stopsStr = st => st.map(s =>
    `<stop offset="${s[0]}%" stop-color="${s[1]}"${s.length > 2 ? ` stop-opacity="${s[2]}"` : ""}/>`).join("");
  function lgrad(stops, horiz) {
    const id = uid();
    return { id, def: `<linearGradient id="${id}" x1="0" y1="0" x2="${horiz ? 1 : 0}" y2="${horiz ? 0 : 1}">${stopsStr(stops)}</linearGradient>` };
  }
  function rgrad(stops, fx, fy) {
    const id = uid();
    return { id, def: `<radialGradient id="${id}"${fx != null ? ` fx="${fx}" fy="${fy}"` : ""}>${stopsStr(stops)}</radialGradient>` };
  }
  function glowF(blur) {
    const id = uid();
    return { id, def: `<filter id="${id}" x="-120%" y="-120%" width="340%" height="340%"><feGaussianBlur stdDeviation="${blur}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` };
  }
  const D = defs => `<defs>${defs}</defs>`;

  /* full-frame sky rect from gradient stops */
  function skyFill(stops) {
    const g = lgrad(stops);
    return D(g.def) + `<rect x="0" y="0" width="400" height="300" fill="url(#${g.id})"/>`;
  }

  /* ---- shared little pieces ---- */
  const shadow = (rx, cy) =>
    `<ellipse cx="0" cy="${cy == null ? 8 : cy}" rx="${rx}" ry="${Math.max(2.5, rx * 0.2)}" fill="#000" opacity=".18"/>`;

  // 4-point sparkle with a gentle twinkle
  function sparkle(x, y, s, color, dur, delay) {
    const k = s * 0.22;
    return `<path transform="translate(${x} ${y})" fill="${color || "#fff3b0"}" d="M0 ${-s} Q${k} ${-k} ${s} 0 Q${k} ${k} 0 ${s} Q${-k} ${k} ${-s} 0 Q${-k} ${-k} 0 ${-s}Z">` +
      `<animate attributeName="opacity" values="1;.25;1" dur="${dur || 2.4}s" begin="${delay || 0}s" repeatCount="indefinite"/></path>`;
  }

  // cute blinking eye (dark, with glint)
  function eye(x, y, r, color) {
    return `<g transform="translate(${x} ${y})"><g>` +
      `<animateTransform attributeName="transform" type="scale" values="1 1;1 1;1 .12;1 1" keyTimes="0;.9;.95;1" dur="5.2s" repeatCount="indefinite"/>` +
      `<ellipse rx="${r}" ry="${r * 1.12}" fill="${color || "#2b2440"}"/>` +
      `<circle cx="${r * 0.34}" cy="${-r * 0.38}" r="${r * 0.34}" fill="#fff"/></g></g>`;
  }
  const smile = (y, w, c, sw) =>
    `<path d="M${-w} ${y} Q0 ${y + w * 0.9} ${w} ${y}" stroke="${c || "#b5466e"}" stroke-width="${sw || 1.6}" fill="none" stroke-linecap="round"/>`;
  const cheeks = (dx, y, r, c) =>
    `<circle cx="${-dx}" cy="${y}" r="${r}" fill="${c || "#ff9ec2"}" opacity=".5"/><circle cx="${dx}" cy="${y}" r="${r}" fill="${c || "#ff9ec2"}" opacity=".5"/>`;
  const bob = (amp, dur) =>
    `<animateTransform attributeName="transform" type="translate" values="0 0;0 ${-amp};0 0" dur="${dur}s" repeatCount="indefinite" additive="sum"/>`;

  // soft rounded hill band (fills down to y=300)
  const hillP = (d, fill, op) => `<path d="${d}" fill="${fill}"${op ? ` opacity="${op}"` : ""}/>`;

  // glowing sun / moon disc with halo
  function glowDisc(x, y, r, core, mid, halo) {
    const g = glowF(r * 0.45), h = rgrad([[0, mid, .85], [55, mid, .28], [100, mid, 0]]);
    return D(g.def + h.def) +
      `<circle cx="${x}" cy="${y}" r="${r * 2.6}" fill="url(#${h.id})"/>` +
      `<g filter="url(#${g.id})"><circle cx="${x}" cy="${y}" r="${r}" fill="${mid}"/>` +
      `<circle cx="${x - r * 0.18}" cy="${y - r * 0.2}" r="${r * 0.62}" fill="${core}"/></g>` +
      (halo || "");
  }

  /* =========================================================
     BACKGROUNDS
     ========================================================= */
  function skyDay(o) {
    o = o || {};
    const top = o.top || "#8fd4ff", bot = o.bot || "#cfeeff";
    let s = skyFill([[0, shade(top, -8)], [55, top], [100, bot]]);
    if (o.sun !== false) s += glowDisc(o.sunX || 60, o.sunY || 54, 22, "#fff7cf", "#ffe06a");
    if (o.clouds !== false) s += cloud(300, 58, 1) + cloud(140, 40, 0.75);
    if (o.hills !== false) {
      const far = o.hill2 || "#5cc24a", near = o.hill || "#7ed957";
      s += hillP("M0 236 Q60 200 140 224 Q210 244 280 216 Q340 194 400 226 V300 H0Z", shade(far, -12));
      s += hillP("M0 258 Q90 226 190 250 Q290 272 400 240 V300 H0Z", near);
      s += hillP("M0 258 Q90 226 190 250 Q290 272 400 240", "none") +
           `<path d="M0 258 Q90 226 190 250 Q290 272 400 240" stroke="${shade(near, 24)}" stroke-width="4" fill="none" opacity=".55"/>`;
    }
    return s;
  }

  function skySunset(o) {
    let s = skyFill([[0, "#1b1140"], [26, "#55276e"], [52, "#b34a72"], [76, "#ff8c5a"], [100, "#ffcf7a"]]);
    s += glowDisc(200, 168, 24, "#fff0c2", "#ffcf6b");
    // silhouette birds drifting home
    s += `<g fill="none" stroke="#3a1f3e" stroke-width="2.4" stroke-linecap="round">
      <g><path d="M0 0 Q5 -5 9 0 M9 0 Q13 -5 18 0"/>
        <animateMotion path="M330 84 q-50 -8 -110 6 q-60 14 -130 2" dur="26s" repeatCount="indefinite"/></g>
      <g opacity=".8"><path d="M0 0 Q4 -4 7 0 M7 0 Q10 -4 14 0"/>
        <animateMotion path="M360 108 q-60 -14 -120 -2 q-70 12 -150 4" dur="32s" repeatCount="indefinite"/></g></g>`;
    s += `<g opacity=".5">` + cloud(96, 74, 0.7, "#ffb6a0") + cloud(318, 48, 0.9, "#e78bb0") + `</g>`;
    s += sparkle(48, 34, 4, "#ffe9c9", 3.2, -1) + sparkle(238, 26, 3, "#ffe9c9", 2.6, -0.4);
    s += hillP("M0 240 Q80 206 170 230 Q260 252 330 224 Q370 210 400 220 V300 H0Z", "#5e2b52");
    s += hillP("M0 266 Q110 236 210 256 Q310 274 400 250 V300 H0Z", "#3a1f3e");
    s += `<path d="M0 266 Q110 236 210 256 Q310 274 400 250" stroke="#c96a6e" stroke-width="3" fill="none" opacity=".5"/>`;
    return s;
  }

  function night(o) {
    o = o || {};
    let s = skyFill([[0, "#120c38"], [55, "#241a52"], [100, "#3b2a6e"]]);
    [[40,40],[90,80],[150,30],[210,60],[60,130],[260,42],[110,150],[300,120],[30,90],[185,108],[350,170],[140,200]]
      .forEach((p, i) => s += sparkle(p[0], p[1], i % 2 ? 3 : 4.6, "#fff3b0", 2 + (i % 4) * 0.7, -i * 0.45));
    if (o.moon !== false) {
      const mx = o.moonX || 320, my = o.moonY || 58;
      s += glowDisc(mx, my, 17, "#fff4c4", "#ffe07a");
      s += `<circle cx="${mx - 6}" cy="${my - 4}" r="3.4" fill="#f0c44a" opacity=".7"/>` +
           `<circle cx="${mx + 5}" cy="${my + 5}" r="2.4" fill="#f0c44a" opacity=".7"/>` +
           `<circle cx="${mx + 2}" cy="${my - 8}" r="1.7" fill="#f0c44a" opacity=".6"/>`;
    }
    if (o.ground !== false) {
      s += hillP("M0 258 Q90 236 180 252 Q290 268 400 246 V300 H0Z", "#1b1140");
      s += `<path d="M0 258 Q90 236 180 252 Q290 268 400 246" stroke="#4a3a8a" stroke-width="2.5" fill="none" opacity=".6"/>`;
      s += hillP("M0 282 Q140 268 260 280 Q340 286 400 278 V300 H0Z", "#241854");
    }
    return s;
  }

  function forest(o) {
    // NOTE: the exact hexes #e9fff2 / #bff0d8 are recoloured by some
    // stories (string replace) to turn this scene into a night forest.
    let s = skyFill([[0, "#e9fff2"], [100, "#bff0d8"]]);
    // dreamy distant canopy
    s += hillP("M0 190 Q30 150 70 172 Q100 138 140 166 Q180 132 220 162 Q260 136 300 168 Q340 144 400 176 V300 H0Z", "#bff0d8");
    s += hillP("M0 190 Q30 150 70 172 Q100 138 140 166 Q180 132 220 162 Q260 136 300 168 Q340 144 400 176 V300 H0Z", "#4a9e6e", ".38");
    s += hillP("M0 212 Q50 186 110 202 Q170 216 230 198 Q300 182 400 206 V300 H0Z", "#3f8f60", ".42");
    const gg = lgrad([[0, "#b8e694"], [100, "#8fce6a"]]);
    s += D(gg.def) + hillP("M0 216 Q100 198 200 212 Q300 226 400 206 V300 H0Z", `url(#${gg.id})`);
    s += tree(60, 214, 1.15, "#2f9e57") + tree(330, 208, 1.3, "#268a4c") + tree(150, 202, 0.8, "#3bb36a") + tree(250, 204, 0.9, "#2f9e57");
    s += mushroom(110, 256) + mushroom(300, 260, "#ffd166");
    s += sparkle(190, 120, 2.6, "#ffffff", 3.4, -1.2) + sparkle(90, 96, 2.2, "#ffffff", 2.8, -0.3);
    return s;
  }

  function cave(o) {
    let s = skyFill([[0, "#4a3a66"], [60, "#3a2c52"], [100, "#2c2140"]]);
    // smooth stalactites
    s += `<path d="M0 0 H400 V10 Q382 12 374 40 Q366 12 344 12 Q332 14 326 52 Q318 14 292 12 Q274 12 266 34 Q258 12 232 10 Q214 12 206 62 Q198 12 168 12 Q150 12 144 38 Q136 12 108 12 Q92 12 86 48 Q78 12 52 10 Q34 12 28 30 Q20 10 0 10Z" fill="#241a3a"/>`;
    // faint glowing crystals on the walls
    const g = glowF(2.5);
    s += D(g.def) + `<g filter="url(#${g.id})">` +
      `<path d="M28 236 l5 -18 l5 18 Z" fill="#8f7ae0" opacity=".85"/>` +
      `<path d="M372 226 l4 -15 l4 15 Z" fill="#6fd8d0" opacity=".8"/></g>`;
    s += sparkle(33, 214, 2.4, "#cabbff", 3, -0.8) + sparkle(376, 208, 2, "#aef2ec", 2.4, -1.5);
    s += hillP("M0 254 Q60 240 120 252 Q200 264 280 250 Q340 242 400 254 V300 H0Z", "#251b38");
    s += hillP("M0 278 Q120 268 240 278 Q330 284 400 276 V300 H0Z", "#1e1630");
    return s;
  }

  function sea(o) {
    let s = skyFill([[0, "#5ecdf9"], [40, "#2f93d6"], [100, "#14528e"]]);
    // wavering god-rays
    s += `<g fill="#bfeaff"><path d="M86 0 L128 0 L74 252 L48 252Z" opacity=".1">
        <animate attributeName="opacity" values=".06;.14;.06" dur="7s" repeatCount="indefinite"/></path>
      <path d="M250 0 L286 0 L252 252 L228 252Z" opacity=".1">
        <animate attributeName="opacity" values=".13;.05;.13" dur="9s" repeatCount="indefinite"/></path></g>`;
    // rising bubbles
    [[64, 9, 4], [206, 12, 3], [330, 7, 5], [130, 11, 3.4]].forEach((b, i) =>
      s += `<circle cx="${b[0]}" r="${b[2]}" fill="none" stroke="#dff6ff" stroke-width="1.4" opacity="0">
        <animate attributeName="cy" values="272;46" dur="${b[1]}s" begin="${-i * 2.7}s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0;.7;.7;0" keyTimes="0;.15;.8;1" dur="${b[1]}s" begin="${-i * 2.7}s" repeatCount="indefinite"/></circle>`);
    const sand = lgrad([[0, "#f6e6b4"], [100, "#dfc27e"]]);
    s += D(sand.def) + hillP("M0 262 Q70 250 150 260 Q240 270 320 256 Q370 250 400 258 V300 H0Z", `url(#${sand.id})`);
    s += seaweed(50, 296) + seaweed(360, 296, "#2fae6b") + seaweed(150, 298, "#37c97c");
    return s;
  }

  function space(o) {
    let s = skyFill([[0, "#05030f"], [55, "#0d0a26"], [100, "#1c1444"]]);
    const neb1 = rgrad([[0, "#7a4ae0", .28], [100, "#7a4ae0", 0]]);
    const neb2 = rgrad([[0, "#ff5d8f", .18], [100, "#ff5d8f", 0]]);
    s += D(neb1.def + neb2.def) +
      `<ellipse cx="300" cy="70" rx="130" ry="80" fill="url(#${neb1.id})"/>` +
      `<ellipse cx="80" cy="220" rx="120" ry="90" fill="url(#${neb2.id})"/>`;
    [[40,40],[90,90],[150,30],[210,70],[60,150],[260,40],[330,120],[300,210],[30,210],[185,200],[360,60],[120,250]]
      .forEach((p, i) => s += sparkle(p[0], p[1], i % 2 ? 2.6 : 4, "#ffffff", 1.8 + (i % 5) * 0.6, -i * 0.5));
    [[240,140],[350,250],[160,120],[70,60],[390,180]].forEach(p =>
      s += `<circle cx="${p[0]}" cy="${p[1]}" r="1.1" fill="#9fb0ff" opacity=".8"/>`);
    // one slow shooting star
    s += `<g opacity="0"><line x1="0" y1="0" x2="26" y2="10" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
      <animateMotion path="M60 30 L210 86" dur="1.6s" begin="2s;9s" repeatCount="1" fill="remove"/>
      <animate attributeName="opacity" values="0;.9;0" dur="1.6s" begin="2s;9s"/></g>`;
    return s;
  }

  function library(o) {
    let s = skyFill([[0, "#4a3320"], [100, "#2c1d10"]]);
    const cols = ["#e8584f", "#f4a93c", "#48b06a", "#4a8fe0", "#a368d8", "#e36fa8", "#46c0c0"];
    const lamp = glowF(4);
    for (let row = 0; row < 3; row++) {
      const y = 24 + row * 70;
      s += `<rect x="18" y="${y - 4}" width="364" height="66" rx="6" fill="#231708"/>`;
      let bx = 30, n = 0;
      while (bx < 356) {
        const w = 15 + ((bx * 7) % 3) * 4, h = 40 + ((bx * 13) % 14), c = cols[n % cols.length];
        const lean = (n % 5 === 3) ? ` transform="rotate(-7 ${bx + w / 2} ${y + 56})"` : "";
        s += `<g${lean}><rect x="${bx}" y="${y + 56 - h}" width="${w}" height="${h}" rx="${w * 0.22}" fill="${c}"/>` +
          `<rect x="${bx}" y="${y + 56 - h}" width="${w * 0.34}" height="${h}" rx="${w * 0.17}" fill="#fff" opacity=".14"/>` +
          `<rect x="${bx + 2.5}" y="${y + 62 - h}" width="${w - 5}" height="2.6" rx="1.3" fill="#fff" opacity=".5"/></g>`;
        bx += w + 4; n++;
      }
      s += `<rect x="18" y="${y + 56}" width="364" height="7" rx="3" fill="#1a1006"/>`;
    }
    // hanging reading lamp + drifting dust motes
    s += D(lamp.def) + `<line x1="200" y1="0" x2="200" y2="16" stroke="#1a1006" stroke-width="3"/>` +
      `<path d="M186 26 Q200 8 214 26 Z" fill="#c79a2e"/>` +
      `<circle cx="200" cy="28" r="6" fill="#ffe9a8" filter="url(#${lamp.id})">
         <animate attributeName="opacity" values="1;.82;1" dur="3.4s" repeatCount="indefinite"/></circle>`;
    [[120, 120, 7], [270, 180, 9], [200, 90, 8]].forEach((m, i) =>
      s += `<circle r="1.6" fill="#ffe9a8" opacity=".5"><animateMotion path="M${m[0]} ${m[1]} q14 -20 4 -44 q-10 -20 6 -40" dur="${m[2]}s" begin="${-i * 3}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.55;0" dur="${m[2]}s" begin="${-i * 3}s" repeatCount="indefinite"/></circle>`);
    s += `<rect x="0" y="282" width="400" height="18" fill="#1a1006"/>`;
    return s;
  }

  function meadow(o) {
    let s = skyDay({ hills: false });
    const gg = lgrad([[0, "#9de26e"], [100, "#5cb43e"]]);
    s += D(gg.def) + hillP("M0 214 Q100 194 200 208 Q300 222 400 202 V300 H0Z", `url(#${gg.id})`);
    s += `<path d="M0 214 Q100 194 200 208 Q300 222 400 202" stroke="#c3ef8e" stroke-width="4" fill="none" opacity=".6"/>`;
    [[40,250,"#ff5d8f"],[110,266,"#ffd166"],[200,254,"#8a5cff"],[280,268,"#ff5d8f"],[350,250,"#ff8fc0"]]
      .forEach(f => s += flower(f[0], f[1], f[2]));
    // a butterfly bobbing over the flowers
    s += `<g><g>
      <ellipse cx="-3.4" cy="0" rx="3.4" ry="4.6" fill="#ff8fc0"><animate attributeName="rx" values="3.4;1.8;3.4" dur=".8s" repeatCount="indefinite"/></ellipse>
      <ellipse cx="3.4" cy="0" rx="3.4" ry="4.6" fill="#ff5d8f"><animate attributeName="rx" values="3.4;1.8;3.4" dur=".8s" repeatCount="indefinite"/></ellipse>
      <rect x="-1" y="-4.5" width="2" height="9" rx="1" fill="#2b2440"/></g>
      <animateMotion path="M150 210 q40 -26 90 -8 q40 16 -20 26 q-60 6 -70 -18" dur="13s" repeatCount="indefinite"/></g>`;
    return s;
  }

  function snowBg(o) {
    let s = skyFill([[0, "#a8cdf0"], [55, "#cfe9ff"], [100, "#eef9ff"]]);
    s += cloud(310, 46, 0.7) + cloud(120, 40, 0.5);
    s += hillP("M0 232 Q80 206 170 226 Q280 246 400 218 V300 H0Z", "#dceefc");
    s += hillP("M0 258 Q120 236 230 254 Q330 268 400 250 V300 H0Z", "#ffffff");
    s += `<path d="M0 258 Q120 236 230 254 Q330 268 400 250" stroke="#b9d9f2" stroke-width="2.5" fill="none" opacity=".8"/>`;
    s += pine(58, 250, 1, "#5a8f78") + pine(348, 244, 0.8, "#6a9f86");
    // falling snow
    for (let i = 0; i < 7; i++) {
      const x = 30 + i * 55, d = 6 + (i % 3) * 2.4;
      s += `<circle r="${2 + (i % 2)}" fill="#fff" opacity=".9">
        <animateMotion path="M${x} -10 q10 ${100 + i * 8} -6 ${320}" dur="${d}s" begin="${-i * 1.7}s" repeatCount="indefinite"/></circle>`;
    }
    return s;
  }

  // a snowy conifer used by the snow scene
  function pine(x, y, sc, col) {
    return `<g transform="translate(${x} ${y}) scale(${sc || 1})">` + shadow(20, 2) +
      `<rect x="-3.5" y="-12" width="7" height="14" rx="3" fill="#7a5a3a"/>` +
      `<path d="M0 -62 Q4 -50 14 -40 L5 -40 Q10 -30 20 -22 L8 -22 Q14 -12 24 -6 L-24 -6 Q-14 -12 -8 -22 L-20 -22 Q-10 -30 -5 -40 L-14 -40 Q-4 -50 0 -62Z" fill="${col || "#4a8a6a"}"/>` +
      `<path d="M0 -62 Q4 -50 14 -40 L5 -40 Q7 -36 10 -32 L-10 -32 Q-7 -36 -5 -40 L-14 -40 Q-4 -50 0 -62Z" fill="#fff" opacity=".85"/></g>`;
  }

  function plainsBg(o) {
    let s = skyDay({ hills: false });
    const gg = lgrad([[0, "#98dd6e"], [100, "#63b944"]]);
    s += D(gg.def) + hillP("M0 222 Q120 204 230 216 Q330 226 400 210 V300 H0Z", `url(#${gg.id})`);
    for (let x = 22; x < 400; x += 46) {
      s += `<g stroke="#3f9430" stroke-width="2.6" stroke-linecap="round" fill="none" transform="translate(${x} 270)">
        <path d="M0 0 Q-1 -9 -4 -14"/><path d="M4 1 Q5 -8 8 -12"/><path d="M-6 1 Q-8 -6 -11 -10"/>
        <animateTransform attributeName="transform" type="skewX" values="0;5;0;-3;0" dur="${4 + (x % 3)}s" repeatCount="indefinite" additive="sum"/></g>`;
    }
    return s;
  }

  function oceanBg(o) {
    let s = skyFill([[0, "#8fd4ff"], [100, "#d7f1ff"]]);
    s += glowDisc(330, 52, 18, "#fff7cf", "#ffe06a");
    s += cloud(300, 90, 0.8) + cloud(90, 46, 0.6);
    const w = lgrad([[0, "#4fb2e8"], [100, "#1c6fae"]]);
    s += D(w.def) + `<rect x="0" y="152" width="400" height="148" fill="url(#${w.id})"/>`;
    s += `<path d="M0 152 Q50 146 100 152 Q150 158 200 152 Q250 146 300 152 Q350 158 400 152 V162 Q350 168 300 162 Q250 156 200 162 Q150 168 100 162 Q50 156 0 162Z" fill="#bfeaff" opacity=".8">
      <animateTransform attributeName="transform" type="translate" values="0 0;-24 2;0 0" dur="7s" repeatCount="indefinite"/></path>`;
    [[70, 190], [210, 214], [320, 182], [150, 246]].forEach((p, i) =>
      s += `<path d="M${p[0] - 20} ${p[1]} Q${p[0]} ${p[1] - 6} ${p[0] + 20} ${p[1]}" stroke="#bfeaff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".5">
        <animate attributeName="opacity" values=".25;.6;.25" dur="${3.4 + i}s" repeatCount="indefinite"/></path>`);
    return s;
  }

  function skyHighBg(o) {
    let s = skyFill([[0, "#5fb8ff"], [60, "#9bd7ff"], [100, "#e2f5ff"]]);
    s += glowDisc(60, 46, 20, "#fff7cf", "#ffe06a");
    s += `<g opacity=".85">` + cloud(80, 90, 1.05) + `</g>` + cloud(320, 60, 0.9);
    s += `<g opacity=".95">` + cloud(200, 180, 1.25) + `</g>` + cloud(60, 235, 0.8) + cloud(340, 218, 0.9);
    s += `<g fill="none" stroke="#3a6a9a" stroke-width="2" stroke-linecap="round" opacity=".7">
      <g><path d="M0 0 Q4 -4 8 0 M8 0 Q12 -4 16 0"/>
      <animateMotion path="M420 130 q-110 -18 -220 0 q-110 18 -230 -6" dur="30s" repeatCount="indefinite"/></g></g>`;
    return s;
  }

  function dungeonBg(o) {
    let s = skyFill([[0, "#34313e"], [100, "#232028"]]);
    for (let ry = 0; ry < 300; ry += 34)
      for (let cx = -26; cx < 420; cx += 52) {
        const off = (ry / 34) % 2 ? 26 : 0, t = ((cx + ry) % 3);
        s += `<rect x="${cx - off}" y="${ry}" width="48" height="30" rx="6" fill="${t ? "#413d4c" : "#484353"}"/>` +
          `<rect x="${cx - off}" y="${ry}" width="48" height="10" rx="6" fill="#fff" opacity=".07"/>`;
      }
    const vg = rgrad([[0, "#000", 0], [100, "#000", .34]]);
    s += D(vg.def) + `<rect x="0" y="0" width="400" height="300" fill="url(#${vg.id})"/>`;
    s += torch(58, 150) + torch(342, 150);
    s += `<rect x="0" y="266" width="400" height="34" fill="#1d1b23"/>` +
      `<path d="M0 266 Q100 262 200 266 Q300 270 400 266" stroke="#4a4656" stroke-width="2.4" fill="none"/>`;
    return s;
  }

  function swampBg(o) {
    let s = skyFill([[0, "#8a9c72"], [55, "#5c7048"], [100, "#3c4c30"]]);
    s += hillP("M0 200 Q60 180 120 196 Q200 210 280 192 Q340 180 400 198 V300 H0Z", "#46583a", ".8");
    const wg = lgrad([[0, "#3d5232"], [100, "#28351f"]]);
    s += D(wg.def) + `<rect x="0" y="240" width="400" height="60" fill="url(#${wg.id})"/>`;
    s += `<ellipse cx="130" cy="272" rx="90" ry="9" fill="#233020"/>` +
      `<ellipse cx="210" cy="262" rx="22" ry="5" fill="#5c8a4a"/><circle cx="204" cy="258" r="3.4" fill="#6fa85a"/>`;
    s += tree(58, 256, 1, "#3a6b3a") + tree(332, 248, 1.1, "#2f5a2f");
    // hanging vines + fireflies
    s += `<g stroke="#324a2c" stroke-width="3" fill="none" stroke-linecap="round">
      <path d="M96 0 Q92 30 98 54"/><path d="M300 0 Q306 26 298 44"/></g>`;
    const g = glowF(2);
    s += D(g.def);
    [[150, 216, 5], [260, 236, 7], [330, 208, 6]].forEach((f, i) =>
      s += `<circle r="2" fill="#d8ff6a" filter="url(#${g.id})">
        <animateMotion path="M${f[0]} ${f[1]} q16 -12 30 2 q-14 14 -30 -2" dur="${f[2]}s" begin="${-i * 2}s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".2;1;.2" dur="1.8s" begin="${-i}s" repeatCount="indefinite"/></circle>`);
    return s;
  }

  function beachBg(o) {
    let s = skyDay({ hills: false });
    const w = lgrad([[0, "#7fd4ff"], [100, "#2f9ad6"]]);
    s += D(w.def) + `<rect x="0" y="150" width="400" height="80" fill="url(#${w.id})"/>`;
    const sand = lgrad([[0, "#f6e6b4"], [100, "#e2c584"]]);
    s += D(sand.def) + hillP("M0 232 Q80 218 180 228 Q290 238 400 222 V300 H0Z", `url(#${sand.id})`);
    s += `<path d="M0 232 Q80 218 180 228 Q290 238 400 222" stroke="#fff" stroke-width="5" fill="none" opacity=".8" stroke-linecap="round">
      <animateTransform attributeName="transform" type="translate" values="0 0;0 6;0 0" dur="5.5s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values=".8;.3;.8" dur="5.5s" repeatCount="indefinite"/></path>`;
    s += `<circle cx="330" cy="262" r="4" fill="#ffb6c8"/><path d="M326 262 a4 4 0 0 1 8 0Z" fill="#ff8fa8"/>` +
      `<path d="M84 274 q4 -8 8 0 q-4 6 -8 0" fill="#e8d8b0" stroke="#c9b384" stroke-width="1"/>`;
    return s;
  }

  function desertBg(o) {
    let s = skyDay({ hills: false, clouds: false, top: "#ffd28a", bot: "#ffe9c2", sunX: 330, sunY: 50 });
    const d1 = lgrad([[0, "#f2c67e"], [100, "#e0a95c"]]);
    const d2 = lgrad([[0, "#e0a95c"], [100, "#c9883e"]]);
    s += D(d1.def + d2.def);
    s += hillP("M0 240 Q110 216 220 236 Q320 252 400 228 V300 H0Z", `url(#${d1.id})`);
    s += hillP("M0 272 Q130 254 260 268 Q340 276 400 262 V300 H0Z", `url(#${d2.id})`);
    // saguaro cactus
    s += `<g transform="translate(330 244)">` + shadow(16, 2) +
      `<path d="M-5 0 L-5 -34 Q-5 -42 0 -42 Q5 -42 5 -34 L5 0Z" fill="#3a8a4a"/>` +
      `<path d="M-5 -20 Q-16 -22 -16 -32 Q-16 -37 -12 -37 Q-9 -37 -9 -31 Q-9 -26 -4 -25Z" fill="#3a8a4a"/>` +
      `<path d="M5 -26 Q17 -28 17 -38 Q17 -43 13 -43 Q10 -43 10 -37 Q10 -31 4 -30Z" fill="#3a8a4a"/>` +
      `<path d="M-1.4 -40 L-1.4 -2" stroke="#2e7040" stroke-width="1.6"/></g>`;
    s += `<path d="M60 262 q8 -5 16 0 q8 5 16 0" stroke="#b98a4e" stroke-width="2" fill="none" opacity=".6"/>`;
    return s;
  }

  function mountainBg(o) {
    let s = skyDay({ hills: false });
    s += hillP("M0 232 Q40 170 84 150 Q118 190 150 206 Q186 122 224 96 Q262 160 300 208 Q342 148 372 132 Q388 160 400 172 V300 H0Z", "#b9c2d9");
    s += hillP("M0 250 Q60 168 110 132 Q150 196 190 216 Q240 118 286 98 Q330 178 400 226 V300 H0Z", "#8f9cba");
    // snow caps
    s += `<path d="M88 158 Q110 132 126 156 Q118 166 112 160 Q106 168 100 161 Q94 166 88 158Z" fill="#fff" transform="translate(2 -22)"/>`;
    s += `<path d="M262 128 Q286 98 310 126 Q302 138 294 130 Q286 140 278 132 Q270 138 262 128Z" fill="#fff"/>`;
    const gg = lgrad([[0, "#8a96b2"], [100, "#6d7994"]]);
    s += D(gg.def) + hillP("M0 262 Q120 246 240 258 Q330 266 400 252 V300 H0Z", `url(#${gg.id})`);
    return s;
  }

  function lavaCaveBg(o) {
    let s = cave(o || {});
    const g = glowF(5);
    const lg2 = lgrad([[0, "#ff8a1f"], [55, "#e8501f"], [100, "#b0301a"]]);
    s += D(g.def + lg2.def);
    s += `<g filter="url(#${g.id})"><path d="M0 276 Q60 266 120 274 Q200 282 280 272 Q340 266 400 276 V300 H0Z" fill="url(#${lg2.id})"/>` +
      `<path d="M0 276 Q60 266 120 274 Q200 282 280 272 Q340 266 400 276" stroke="#ffd166" stroke-width="3" fill="none" opacity=".85">
        <animate attributeName="opacity" values=".85;.4;.85" dur="2.6s" repeatCount="indefinite"/></path></g>`;
    [[116, 282, 3.4], [296, 286, 2.8], [200, 284, 2.2]].forEach((b, i) =>
      s += `<circle cx="${b[0]}" cy="${b[1]}" r="${b[2]}" fill="#ffd166">
        <animate attributeName="r" values="1;${b[2]};1" dur="${1.6 + i * 0.5}s" repeatCount="indefinite"/></circle>`);
    // rising embers
    [[90, 5], [250, 7], [340, 6]].forEach((e, i) =>
      s += `<circle r="1.8" fill="#ffb142"><animateMotion path="M${e[0]} 278 q10 -40 -4 -90" dur="${e[1]}s" begin="${-i * 2}s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".9;0" dur="${e[1]}s" begin="${-i * 2}s" repeatCount="indefinite"/></circle>`);
    return s;
  }

  /* =========================================================
     SMALL SCENERY
     ========================================================= */
  function cloud(x, y, sc, tint) {
    sc = sc || 1;
    const g = lgrad([[0, "#ffffff"], [100, tint || "#dceefc"]]);
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + D(g.def) +
      `<path d="M-30 10 Q-40 10 -38 1 Q-38 -8 -28 -8 Q-26 -18 -14 -17 Q-9 -26 2 -23 Q15 -27 18 -14 Q30 -15 31 -5 Q39 -4 36 10 Z" fill="url(#${g.id})">
        <animateTransform attributeName="transform" type="translate" values="0 0;7 0;0 0" dur="${9 + (x % 5)}s" repeatCount="indefinite"/></path></g>`;
  }
  function star(x, y, size) {
    return `<g transform="translate(${x} ${y})">` + sparkle(0, 0, (size || 14) * 0.45, "#fff3b0", 2.2 + (x % 3) * 0.6, -(y % 4) * 0.5) + `</g>`;
  }
  function tree(x, y, sc, col) {
    sc = sc || 1; col = col || "#2f9e57";
    const L = shade(col, 22), Dk = shade(col, -16);
    const g = lgrad([[0, L], [100, col]]);
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + D(g.def) + shadow(24, 12) +
      `<path d="M-4.5 12 Q-6 -6 -3 -18 L3 -18 Q6 -6 4.5 12 Z" fill="#8a5a33"/>` +
      `<path d="M-1 -16 Q-1 -2 -2 10" stroke="#6b4423" stroke-width="1.6" fill="none"/>` +
      `<path d="M0 -64 Q22 -64 28 -46 Q40 -40 36 -26 Q38 -12 22 -10 Q12 -4 0 -8 Q-12 -4 -22 -10 Q-38 -12 -36 -26 Q-40 -40 -28 -46 Q-22 -64 0 -64Z" fill="url(#${g.id})"/>` +
      `<path d="M-26 -44 Q-14 -56 2 -55" stroke="${shade(col, 40)}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>` +
      `<path d="M26 -22 Q14 -12 -2 -14" stroke="${Dk}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".5"/></g>`;
  }
  function mushroom(x, y, cap) {
    cap = cap || "#e8584f";
    const g = lgrad([[0, shade(cap, 14)], [100, shade(cap, -10)]]);
    return `<g transform="translate(${x} ${y})">` + D(g.def) + shadow(11, 10) +
      `<path d="M-5 9 Q-6 0 -4 -3 L4 -3 Q6 0 5 9 Q0 11 -5 9Z" fill="#fff4e0"/>` +
      `<path d="M-13 -2 Q-13 -16 0 -16 Q13 -16 13 -2 Q6 1 0 1 Q-6 1 -13 -2Z" fill="url(#${g.id})"/>` +
      `<circle cx="-5.5" cy="-8" r="2.4" fill="#fff" opacity=".9"/><circle cx="4" cy="-6" r="1.8" fill="#fff" opacity=".9"/><circle cx="0" cy="-12" r="1.4" fill="#fff" opacity=".85"/></g>`;
  }
  function flower(x, y, col) {
    col = col || "#ff5d8f";
    let petals = "";
    for (let i = 0; i < 5; i++)
      petals += `<ellipse cx="0" cy="-5.4" rx="3.2" ry="5.6" fill="${col}" transform="rotate(${i * 72})"/>`;
    return `<g transform="translate(${x} ${y})"><g>` +
      `<animateTransform attributeName="transform" type="rotate" values="0 0 22;3 0 22;0 0 22;-3 0 22;0 0 22" dur="${4 + (x % 3)}s" repeatCount="indefinite"/>` +
      `<path d="M0 22 Q-1.5 12 0 3" stroke="#3ba24a" stroke-width="2.2" fill="none" stroke-linecap="round"/>` +
      `<path d="M0 14 Q-7 12 -8 7 Q-2 7 0 12Z" fill="#3ba24a"/><path d="M0.5 17 Q7 16 8.5 11 Q2 10 0.5 15Z" fill="#3ba24a"/>` +
      `<g transform="translate(0 2)">${petals}<circle r="3.4" fill="#ffd166"/><circle cx="-1" cy="-1" r="1.1" fill="#fff" opacity=".85"/></g></g></g>`;
  }
  function seaweed(x, y, col) {
    col = col || "#37a85e";
    return `<g transform="translate(${x} ${y})">` +
      `<path d="M0 0 Q-8 -14 0 -28 Q8 -42 0 -56 Q-4 -62 -2 -64" stroke="${col}" stroke-width="6" fill="none" stroke-linecap="round">
        <animate attributeName="d" values="M0 0 Q-8 -14 0 -28 Q8 -42 0 -56 Q-4 -62 -2 -64;M0 0 Q-4 -14 4 -28 Q12 -42 6 -56 Q2 -62 4 -64;M0 0 Q-8 -14 0 -28 Q8 -42 0 -56 Q-4 -62 -2 -64" dur="5s" repeatCount="indefinite"/></path>` +
      `<path d="M6 0 Q12 -10 8 -22 Q4 -32 10 -40" stroke="${shade(col, -14)}" stroke-width="4.5" fill="none" stroke-linecap="round">
        <animate attributeName="d" values="M6 0 Q12 -10 8 -22 Q4 -32 10 -40;M6 0 Q8 -10 12 -22 Q14 -32 8 -40;M6 0 Q12 -10 8 -22 Q4 -32 10 -40" dur="4s" repeatCount="indefinite"/></path></g>`;
  }
  function castle(x, y, sc) {
    sc = sc || 1;
    const W = "#e7d6ff", S = "#c89bff", roof = "#ff6fae";
    const wg = lgrad([[0, "#f6efff"], [100, W]]);
    const g = glowF(1.8);
    const win = (wx, wy, w2, h2) =>
      `<path d="M${wx - w2} ${wy} q0 ${-w2 * 2.2} ${w2} ${-w2 * 2.2} q${w2} 0 ${w2} ${w2 * 2.2} v${h2} h${-w2 * 2} Z" fill="#ffd166" filter="url(#${g.id})"/>`;
    const flag = (fx, fy) =>
      `<line x1="${fx}" y1="${fy}" x2="${fx}" y2="${fy - 14}" stroke="#8a5a7a" stroke-width="1.6"/>` +
      `<path d="M${fx} ${fy - 14} q7 1.5 13 -1 v7 q-6 2.5 -13 1 Z" fill="#ff5d8f">
        <animate attributeName="d" values="M${fx} ${fy - 14} q7 1.5 13 -1 v7 q-6 2.5 -13 1 Z;M${fx} ${fy - 14} q7 -2.5 13 1 v7 q-6 -1.5 -13 -1 Z;M${fx} ${fy - 14} q7 1.5 13 -1 v7 q-6 2.5 -13 1 Z" dur="1.6s" repeatCount="indefinite"/></path>`;
    let s = D(wg.def + g.def);
    s += `<ellipse cx="0" cy="12" rx="96" ry="8" fill="#000" opacity=".14"/>`;
    // main keep wall
    s += `<rect x="-64" y="-44" width="128" height="56" rx="5" fill="url(#${wg.id})"/>`;
    s += `<path d="M-64 -44 h10 v-7 h9 v7 h14 v-7 h9 v7 h14" fill="none"/>`;
    // side towers
    [[-75, 1], [75, -1]].forEach(t => {
      s += `<g transform="translate(${t[0]} 0)">` +
        `<rect x="-15" y="-64" width="30" height="76" rx="5" fill="url(#${wg.id})"/>` +
        `<rect x="7" y="-64" width="8" height="76" rx="4" fill="${S}" opacity=".55"/>` +
        `<path d="M-19 -62 Q0 -94 19 -62 Z" fill="${roof}"/>` +
        `<path d="M-15 -66 Q0 -84 15 -66" stroke="#ff9ec8" stroke-width="3" fill="none" opacity=".8"/>` +
        win(0, -40, 5, 8) + `</g>`;
    });
    // central tall tower
    s += `<rect x="-18" y="-98" width="36" height="110" rx="5" fill="url(#${wg.id})"/>` +
      `<rect x="8" y="-98" width="10" height="110" rx="5" fill="${S}" opacity=".55"/>` +
      `<path d="M-23 -96 Q0 -134 23 -96 Z" fill="${roof}"/>` +
      `<path d="M-17 -100 Q0 -122 17 -100" stroke="#ff9ec8" stroke-width="3" fill="none" opacity=".8"/>` +
      win(0, -72, 5.5, 9) + flag(0, -122);
    // gate
    s += `<path d="M-13 12 v-16 q0 -13 13 -13 q13 0 13 13 v16 Z" fill="#7a52b0"/>` +
      `<path d="M-13 12 v-16 q0 -13 13 -13 q13 0 13 13 v16" fill="none" stroke="#5e3bb0" stroke-width="2"/>` +
      `<line x1="0" y1="-15" x2="0" y2="10" stroke="#5e3bb0" stroke-width="1.6"/>` +
      win(-42, -22, 4.5, 7) + win(42, -22, 4.5, 7);
    return `<g transform="translate(${x} ${y}) scale(${sc})">${s}</g>`;
  }

  /* =========================================================
     CHARACTERS — kids
     ========================================================= */
  // shared cute face: eyes, cheeks, smile — centred on (0, fy)
  function kidFace(fy, opts) {
    opts = opts || {};
    return eye(-5.2, fy, 2.1) + eye(5.2, fy, 2.1) +
      cheeks(8.6, fy + 4.4, 2.3) +
      smile(fy + 5.2, 3.6, opts.mouth || "#b5466e", 1.7);
  }

  function princess(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const dress = o.dress || "#ff5d8f", d2 = shade(dress, -22), dL = shade(dress, 26);
    const hair = o.hair || "#5a3a22", skin = o.skin || "#ffd9b8";
    const dg = lgrad([[0, dL], [70, dress], [100, d2]]);
    let s = D(dg.def) + shadow(22, 9);
    // dress — soft bell with a wavy hem
    s += `<path d="M0 -27 C-11 -25 -17 -12 -21 6 Q-16 11 -10.5 8 Q-5 12 0 9 Q5 12 10.5 8 Q16 11 21 6 C17 -12 11 -25 0 -27Z" fill="url(#${dg.id})"/>`;
    s += `<path d="M0 -25 C-4 -18 -6 -4 -7 7 M0 -25 C4 -18 6 -4 7 7" stroke="${d2}" stroke-width="1.4" fill="none" opacity=".55"/>`;
    s += `<path d="M-20 4 Q0 12 20 4" stroke="${dL}" stroke-width="2.2" fill="none" opacity=".8"/>`;
    // arms + hands
    s += `<path d="M-9 -21 Q-17 -15 -15.5 -6" stroke="${skin}" stroke-width="4.2" fill="none" stroke-linecap="round"/>` +
      `<path d="M9 -21 Q17 -15 15.5 -6" stroke="${skin}" stroke-width="4.2" fill="none" stroke-linecap="round"/>`;
    // hair behind head
    s += `<circle cx="0" cy="-40" r="16.5" fill="${hair}"/>` +
      `<path d="M-16 -42 Q-20 -26 -13 -14 Q-9 -18 -11.5 -32Z" fill="${hair}"/>` +
      `<path d="M16 -42 Q20 -26 13 -14 Q9 -18 11.5 -32Z" fill="${hair}"/>`;
    // face
    s += `<circle cx="0" cy="-38" r="13.2" fill="${skin}"/>` + kidFace(-38);
    // bangs
    s += `<path d="M-13.2 -40 Q-12.5 -52.5 0 -52.5 Q12.5 -52.5 13.2 -40 Q8.5 -46.5 3.5 -44 Q0 -47.5 -3.5 -44 Q-8.5 -46.5 -13.2 -40Z" fill="${hair}"/>` +
      `<path d="M-9 -49 Q-3 -51.5 2 -50" stroke="${shade(hair, 26)}" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".7"/>`;
    if (o.crown !== false) {
      s += `<path d="M-7.5 -52 L-7.5 -59 L-3.8 -54.5 L0 -61 L3.8 -54.5 L7.5 -59 L7.5 -52 Q0 -49.5 -7.5 -52Z" fill="#ffd166" stroke="#e0a92e" stroke-width="1"/>` +
        `<circle cx="0" cy="-61" r="1.9" fill="#ff5d8f"/>`;
    }
    return `<g transform="translate(${x} ${y}) scale(${sc})">${s}${o.extra || ""}</g>`;
  }

  function boy(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const shirt = o.shirt || "#4a8fe0", hair = o.hair || "#3a2a1a",
      skin = o.skin || "#f0c79a", pants = o.pants || "#3a4a6b";
    const tg = lgrad([[0, shade(shirt, 18)], [100, shade(shirt, -12)]]);
    let s = D(tg.def) + shadow(19, 11);
    // legs + shoes
    s += `<rect x="-9" y="-4" width="7.5" height="14" rx="3.4" fill="${pants}"/>` +
      `<rect x="1.5" y="-4" width="7.5" height="14" rx="3.4" fill="${pants}"/>` +
      `<ellipse cx="-5.2" cy="10.4" rx="4.6" ry="2.6" fill="${shade(pants, -30)}"/>` +
      `<ellipse cx="5.2" cy="10.4" rx="4.6" ry="2.6" fill="${shade(pants, -30)}"/>`;
    // torso
    s += `<path d="M-11.5 -25 Q-14 -8 -12 -2 Q0 2 12 -2 Q14 -8 11.5 -25 Q0 -30 -11.5 -25Z" fill="url(#${tg.id})"/>` +
      `<path d="M-11 -12 Q0 -8.5 11 -12" stroke="${shade(shirt, -22)}" stroke-width="1.6" fill="none" opacity=".6"/>`;
    // arms + hands
    s += `<path d="M-11 -22 Q-17 -15 -15 -6" stroke="${shirt}" stroke-width="4.6" fill="none" stroke-linecap="round"/>` +
      `<path d="M11 -22 Q17 -15 15 -6" stroke="${shirt}" stroke-width="4.6" fill="none" stroke-linecap="round"/>` +
      `<circle cx="-15" cy="-5" r="2.6" fill="${skin}"/><circle cx="15" cy="-5" r="2.6" fill="${skin}"/>`;
    // head
    s += `<circle cx="0" cy="-37" r="13" fill="${skin}"/>` + kidFace(-37, { mouth: "#a8324f" });
    // hair — swoopy cap with a cowlick
    s += `<path d="M-13 -39 Q-13.5 -51.5 -1 -51.5 Q12.5 -51.5 13 -38.5 Q13.3 -35 12 -33.5 Q11.5 -40 5 -42.5 Q-2 -45 -8.5 -41.5 Q-12.5 -39 -12.4 -34.5 Q-13.4 -36 -13 -39Z" fill="${hair}"/>` +
      `<path d="M2 -51.5 Q5 -56 10 -55.5 Q7 -52.5 6.5 -50.5Z" fill="${hair}"/>` +
      `<path d="M-9 -47.5 Q-3 -50.5 3 -48.5" stroke="${shade(hair, 30)}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".6"/>`;
    return `<g transform="translate(${x} ${y}) scale(${sc})">${s}${o.extra || ""}</g>`;
  }

  function baby(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const wrap = o.wrap || "#bfe3ff", skin = o.skin || "#ffd9b8";
    const wg = lgrad([[0, shade(wrap, 16)], [100, shade(wrap, -12)]]);
    let s = D(wg.def) + shadow(15, 11);
    // swaddle bundle
    s += `<path d="M0 -14 C11 -14 15 -4 13.5 5 Q12 11.5 0 11.5 Q-12 11.5 -13.5 5 C-15 -4 -11 -14 0 -14Z" fill="url(#${wg.id})"/>` +
      `<path d="M-11 2 Q0 6.5 11 2" stroke="${shade(wrap, -22)}" stroke-width="1.5" fill="none" opacity=".6"/>`;
    // face peeking out
    s += `<circle cx="0" cy="-5" r="8.6" fill="${skin}"/>`;
    s += `<path d="M-8.6 -7 Q-9 -14.5 0 -14.5 Q9 -14.5 8.6 -7 Q4 -11.5 0 -10.5 Q-4 -11.5 -8.6 -7Z" fill="${wrap}"/>` +
      `<path d="M0 -14.5 Q1.5 -18.5 4.5 -18" stroke="#6a4a2a" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
    s += eye(-3.4, -5.5, 1.5) + eye(3.4, -5.5, 1.5) + cheeks(6, -2.2, 1.8) +
      `<ellipse cx="0" cy="-1.4" rx="1.7" ry="1.3" fill="#ff9ab0"/>`;
    return `<g transform="translate(${x} ${y}) scale(${sc})">${s}</g>`;
  }

  /* ---- costumed kids ---- */
  function knight(o) {
    const base = boy({ x: 0, y: 0, scale: 1, shirt: o.shirt || "#9fb3c9", pants: "#5a6473" });
    const hat = `<path d="M-13.5 -38 Q-13.5 -53 0 -53 Q13.5 -53 13.5 -38 L13.5 -35 Q10 -37.5 8 -36 L8 -44 L-8 -44 L-8 -36 Q-10 -37.5 -13.5 -35Z" fill="#c2ccd6" stroke="#8a96a3" stroke-width="1.2"/>` +
      `<path d="M-8 -44 L8 -44" stroke="#8a96a3" stroke-width="1.4"/>` +
      `<path d="M0 -53 Q-1 -60 4 -63 Q8 -60 5 -53" fill="#e8584f"/>`;
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.scale || 1})">${base}${hat}</g>`;
  }
  function wizard(o) {
    const hatC = o.hat || "#4a2d8a";
    const base = boy({ x: 0, y: 0, scale: 1, shirt: o.shirt || "#5e3bb0", pants: "#3a2566" });
    const hat = `<g>` +
      `<path d="M-16 -46 Q0 -52 16 -46 Q17 -43.5 14 -43 Q0 -48 -14 -43 Q-17 -43.5 -16 -46Z" fill="${shade(hatC, -14)}"/>` +
      `<path d="M-12 -45.5 Q-2 -76 2 -78 Q4 -66 12 -45.5 Q0 -50.5 -12 -45.5Z" fill="${hatC}"/>` +
      sparkle(1, -62, 3.4, "#ffd166", 2.2, -0.6) + `</g>`;
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.scale || 1})">${base}${hat}</g>`;
  }
  function pirate(o) {
    const base = boy({ x: 0, y: 0, scale: 1, shirt: o.shirt || "#c0392b", pants: "#3a2718" });
    const hat = `<path d="M-16 -46 Q-10 -60 0 -60 Q10 -60 16 -46 Q8 -51 0 -51 Q-8 -51 -16 -46Z" fill="#2b2440"/>` +
      `<path d="M-16 -46 Q0 -42 16 -46 Q10 -49.5 0 -49.5 Q-10 -49.5 -16 -46Z" fill="#3a3356"/>` +
      `<circle cx="0" cy="-54" r="2.4" fill="#fff"/><path d="M-2.4 -50.8 h4.8" stroke="#fff" stroke-width="1.3"/>`;
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.scale || 1})">${base}${hat}</g>`;
  }
  function villager(o) {
    const base = boy({ x: 0, y: 0, scale: 1, shirt: o.shirt || "#7a6b4a", pants: "#5a4a33" });
    const nose = `<path d="M-3 -37 Q-3.6 -27.5 0 -27 Q3.6 -27.5 3 -37Z" fill="#d9a066" stroke="#b5804a" stroke-width="1"/>` +
      `<path d="M-8 -43 Q0 -45 8 -43" stroke="#4a3520" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.scale || 1})">${base}${nose}</g>`;
  }

  function ghost(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const g = lgrad([[0, "#ffffff"], [100, "#c9d6f2"]]);
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + D(g.def) +
      `<g opacity=".92">${bob(4, 3.2)}` +
      `<path d="M-15 -4 Q-15 -19 0 -19 Q15 -19 15 -4 L15 10 Q11.5 5.5 7.5 11 Q3.5 16 0 11 Q-3.5 16 -7.5 11 Q-11.5 5.5 -15 10Z" fill="url(#${g.id})"/>` +
      eye(-5.4, -6, 2.3) + eye(5.4, -6, 2.3) +
      `<ellipse cx="0" cy="1.5" rx="2.6" ry="3.4" fill="#7a90b5"/>` +
      cheeks(9, -1.5, 2, "#b9c9ea") + `</g></g>`;
  }

  /* =========================================================
     CHARACTERS — creatures
     ========================================================= */
  function dragon(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const col = o.color || "#7ed957", belly = shade(col, 32), dk = shade(col, -18);
    const sad = o.mood === "sad";
    const bg2 = lgrad([[0, shade(col, 14)], [100, shade(col, -8)]]);
    let s = D(bg2.def) + shadow(26, 22);
    // tail
    s += `<path d="M-16 8 Q-30 12 -29 -2" stroke="${col}" stroke-width="6.5" fill="none" stroke-linecap="round"/>` +
      `<path d="M-29 -2 L-33 -9 L-25 -8Z" fill="${dk}"/>`;
    // far wing (gently flapping)
    s += `<g transform="translate(-4 -4)"><path d="M0 0 Q-16 -20 2 -16 Q-2 -8 0 0Z" fill="${dk}" opacity=".8">
      <animateTransform attributeName="transform" type="rotate" values="0;-8;0" dur="1.8s" repeatCount="indefinite"/></path></g>`;
    // body + belly
    s += `<ellipse cx="-2" cy="8" rx="19" ry="13.5" fill="url(#${bg2.id})"/>` +
      `<path d="M-12 14 Q-2 20 9 13 Q10 4 -1 2 Q-11 3 -12 14Z" fill="${belly}"/>` +
      `<path d="M-9 8 h14 M-8 12 h12" stroke="${shade(belly, -14)}" stroke-width="1.3" opacity=".6"/>`;
    // legs
    s += `<rect x="-12" y="15" width="7" height="8" rx="3.2" fill="${col}"/>` +
      `<rect x="3" y="15" width="7" height="8" rx="3.2" fill="${col}"/>`;
    // back spikes
    s += `<path d="M-14 -2 Q-13 -8 -9 -7 Q-9 -3 -11 -1Z M-6 -5 Q-5 -11 -1 -10 Q-1 -6 -3 -4Z" fill="${dk}"/>`;
    // near wing
    s += `<g transform="translate(-1 -3)"><path d="M0 0 Q-13 -22 6 -17 Q1 -8 0 0Z" fill="${belly}">
      <animateTransform attributeName="transform" type="rotate" values="0;-10;0" dur="1.8s" begin="-.2s" repeatCount="indefinite"/></path></g>`;
    // head
    s += `<circle cx="12" cy="-11" r="11.5" fill="${col}"/>` +
      `<ellipse cx="20" cy="-7" rx="7" ry="5.4" fill="${belly}"/>` +
      `<circle cx="22.5" cy="-9" r="1" fill="${dk}"/><circle cx="19" cy="-9" r="1" fill="${dk}"/>`;
    // horns
    s += `<path d="M6 -20 Q5 -26 9 -27 Q10 -22 9 -19.5Z M13 -21.5 Q13.5 -27.5 17.5 -27 Q17 -22 15.5 -20Z" fill="${belly}"/>`;
    if (sad) {
      s += `<circle cx="9.5" cy="-13" r="3.6" fill="#fff"/>` + `<circle cx="9.8" cy="-12.4" r="1.9" fill="#2b2440"/>` +
        `<path d="M5.5 -17.5 Q9 -19.5 12.5 -17.5" stroke="${dk}" stroke-width="1.5" fill="none" stroke-linecap="round"/>` +
        `<path d="M17 -1.5 Q20 -3.5 23 -1.8" stroke="${dk}" stroke-width="1.5" fill="none" stroke-linecap="round" transform="rotate(8 20 -2)"/>` +
        `<path d="M13 -8 q1.6 2.6 0 4.4 q-1.6 -1.8 0 -4.4" fill="#9fd8ff"><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.2;.7;1" dur="2.6s" repeatCount="indefinite"/></path>`;
    } else {
      s += eye(9.5, -13, 2.6) +
        `<path d="M16.5 -3 Q20 -0.5 23.5 -3" stroke="${dk}" stroke-width="1.6" fill="none" stroke-linecap="round"/>` +
        `<circle cx="7" cy="-6.5" r="2" fill="#ff9ec2" opacity=".45"/>`;
    }
    return `<g transform="translate(${x} ${y}) scale(${sc})">${s}</g>`;
  }

  function puppy(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, c = o.color || "#c98a4a", d = shade(c, -20), lt = shade(c, 26);
    let s = shadow(22, 18);
    // wagging tail
    s += `<g transform="translate(-15 6)"><path d="M0 0 Q-9 -3 -8 -12" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round">
      <animateTransform attributeName="transform" type="rotate" values="-12;16;-12" dur=".7s" repeatCount="indefinite"/></path></g>`;
    // body
    s += `<path d="M-15 18 Q-17 2 -5 -1 L7 -1 Q14 2 14 18 Z" fill="${c}"/>` +
      `<path d="M-8 18 Q-8 8 -1 5 Q7 8 7 18Z" fill="${lt}"/>`;
    // front paws
    s += `<ellipse cx="-6" cy="17.5" rx="4.4" ry="2.8" fill="${lt}"/><ellipse cx="6" cy="17.5" rx="4.4" ry="2.8" fill="${lt}"/>`;
    // head
    s += `<circle cx="3" cy="-7" r="11.5" fill="${c}"/>`;
    // floppy ears
    s += `<path d="M-5.5 -16 Q-13 -14 -11 -1.5 Q-6.5 -2.5 -5 -9Z" fill="${d}"/>` +
      `<path d="M11.5 -16 Q19 -14 17 -1.5 Q12.5 -2.5 11 -9Z" fill="${d}"/>`;
    // muzzle + face
    s += `<ellipse cx="3.5" cy="-2.5" rx="6" ry="4.6" fill="${lt}"/>` +
      `<ellipse cx="3.5" cy="-5.4" rx="2.6" ry="2" fill="#2b2440"/>` +
      `<path d="M3.5 -3.6 L3.5 -1.6 M3.5 -1.6 Q1.5 0.5 -0.4 -0.8 M3.5 -1.6 Q5.5 0.5 7.4 -0.8" stroke="#2b2440" stroke-width="1.2" fill="none" stroke-linecap="round"/>` +
      eye(-1.8, -9.5, 1.9) + eye(8.6, -9.5, 1.9) +
      `<path d="M1 1.2 Q3.5 4 6 1.2 Q4.8 5.4 3.5 5.2 Q2.2 5.4 1 1.2Z" fill="#ff8fa8"/>`;
    return `<g transform="translate(${x} ${y}) scale(${sc})">${s}</g>`;
  }

  function fox(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, C = "#ef8a3c", Dk = "#2b2440", W = "#fff8f0";
    let s = shadow(20, 18);
    // bushy tail curled at the side
    s += `<path d="M-12 12 Q-26 14 -24 -2 Q-20 -10 -14 -6 Q-10 0 -12 12Z" fill="${C}"/>` +
      `<path d="M-22 2 Q-24 -6 -17 -6.5 Q-14 -2 -15 4Z" fill="${W}"/>`;
    // body
    s += `<path d="M-11 18 Q-13 4 -2 0 L6 0 Q13 4 13 18Z" fill="${C}"/>` +
      `<path d="M-5 18 Q-5 9 1 6 Q7 9 7 18Z" fill="${W}"/>`;
    s += `<ellipse cx="-4" cy="17.5" rx="4" ry="2.6" fill="${Dk}"/><ellipse cx="6" cy="17.5" rx="4" ry="2.6" fill="${Dk}"/>`;
    // head
    s += `<path d="M1 -18 Q10 -18 13 -11 Q15 -4 8.5 -0.5 Q5 2.5 1 2.5 Q-3 2.5 -6.5 -0.5 Q-13 -4 -11 -11 Q-8 -18 1 -18Z" fill="${C}"/>`;
    // ears
    s += `<path d="M-9 -14 L-12 -24 Q-5 -22 -3.5 -16Z" fill="${C}"/><path d="M-9.6 -16.5 L-11 -21.5 Q-7.5 -20.5 -6.5 -17.5Z" fill="${Dk}"/>` +
      `<path d="M11 -14 L14 -24 Q7 -22 5.5 -16Z" fill="${C}"/><path d="M11.6 -16.5 L13 -21.5 Q9.5 -20.5 8.5 -17.5Z" fill="${Dk}"/>`;
    // white muzzle + nose
    s += `<path d="M1 2.5 Q-5 2 -6 -4 Q-2 -6.5 1 -4.5 Q4 -6.5 8 -4 Q7 2 1 2.5Z" fill="${W}"/>` +
      `<ellipse cx="1" cy="-1" rx="2" ry="1.6" fill="${Dk}"/>` +
      eye(-4.4, -8.5, 1.9) + eye(6.4, -8.5, 1.9) +
      `<path d="M-2 1.4 Q1 3.4 4 1.4" stroke="${Dk}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
    return `<g transform="translate(${x} ${y}) scale(${sc})">${s}</g>`;
  }

  function fish(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, c = o.color || "#ff8f3c", L = shade(c, 24), dk = shade(c, -14);
    const g = lgrad([[0, L], [100, dk]]);
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + D(g.def) + `<g>${bob(3, 3.4)}` +
      // tail (fish swims left)
      `<path d="M10 0 L21 -8.5 Q17.5 0 21 8.5 Z" fill="${dk}">
        <animateTransform attributeName="transform" type="rotate" values="-7 10 0;7 10 0;-7 10 0" dur="1.1s" repeatCount="indefinite"/></path>` +
      `<ellipse cx="-2" cy="0" rx="14.5" ry="9.5" fill="url(#${g.id})"/>` +
      `<path d="M-4 -9 Q0 -14 5 -9.5 Q1 -7.5 -4 -9Z" fill="${dk}"/>` +
      `<path d="M0 2 Q4 5.5 8 3 Q5 8 1 7Z" fill="${dk}" opacity=".85"/>` +
      `<path d="M4 -7 Q7.5 0 4 7 M9 -5 Q11.5 0 9 5" stroke="${shade(c, -26)}" stroke-width="1.4" fill="none" opacity=".55"/>` +
      `<circle cx="-8.5" cy="-2.4" r="3.3" fill="#fff"/><circle cx="-9.2" cy="-2.2" r="1.7" fill="#2b2440"/><circle cx="-8.6" cy="-3" r=".7" fill="#fff"/>` +
      `<path d="M-13.5 2.4 Q-11.5 4 -9.5 3" stroke="${shade(c, -30)}" stroke-width="1.2" fill="none" stroke-linecap="round"/>` +
      `</g></g>`;
  }

  function mermaid(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, tail = o.tail || "#37c97c",
      hair = o.hair || "#c0392b", skin = o.skin || "#ffd9b8";
    const tg = lgrad([[0, shade(tail, 22)], [100, shade(tail, -12)]]);
    let s = D(tg.def);
    // hair flowing behind
    s += `<path d="M0 -12 Q-9 -12 -9 -2 Q-10 8 -6 14 Q-3 10 -4 2 L4 2 Q5 10 2 16 Q8 10 8.5 0 Q9 -12 0 -12Z" fill="${hair}" transform="translate(0 -1)"/>`;
    // tail
    s += `<path d="M-4.5 6 Q-7 16 -2 23 Q0 26 -4 28 Q-7 30 -8 30 L-4 30 Q0 29.5 2 27 Q8 29 10 30 Q6 25 4 23 Q8 14 4.5 6Z" fill="url(#${tg.id})"/>` +
      `<path d="M-3 12 q3 2 6 0 M-2.5 17 q2.8 2 5.4 0" stroke="${shade(tail, -24)}" stroke-width="1.1" fill="none" opacity=".6"/>`;
    // torso + arms
    s += `<path d="M-4.5 -3 Q-5 4 -4 7 L4 7 Q5 4 4.5 -3Z" fill="${skin}"/>` +
      `<path d="M-4.5 -1.5 Q-9 2 -8.5 8" stroke="${skin}" stroke-width="2.8" fill="none" stroke-linecap="round"/>` +
      `<path d="M4.5 -1.5 Q9 2 8.5 8" stroke="${skin}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`;
    // shell top
    s += `<path d="M-5 1 Q0 4 5 1 L5 4 Q0 6.5 -5 4Z" fill="${shade(tail, 30)}"/>`;
    // head + face
    s += `<circle cx="0" cy="-9" r="7.6" fill="${skin}"/>` +
      eye(-2.9, -9.5, 1.4) + eye(2.9, -9.5, 1.4) + cheeks(5, -6.6, 1.4) + smile(-6, 2, "#b5466e", 1.2);
    // hair front + starfish clip
    s += `<path d="M-7.6 -10 Q-7.6 -17.5 0 -17.5 Q7.6 -17.5 7.6 -10 Q3.5 -14.5 0 -13 Q-3.5 -14.5 -7.6 -10Z" fill="${hair}"/>` +
      sparkle(5.5, -14.5, 2.2, "#ffd166", 2.8, -1);
    return `<g transform="translate(${x} ${y}) scale(${sc})">${s}</g>`;
  }

  function owl(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, B = "#8a6a4a", b = "#c9a878";
    const g = lgrad([[0, shade(B, 18)], [100, shade(B, -10)]]);
    let s = D(g.def) + shadow(15, 21);
    // ear tufts
    s += `<path d="M-9 -12 L-13 -20 Q-6 -18 -5 -13Z M9 -12 L13 -20 Q6 -18 5 -13Z" fill="${B}"/>`;
    // body
    s += `<path d="M0 -15 C12 -15 15 -4 14 6 Q13 19 0 19 Q-13 19 -14 6 C-15 -4 -12 -15 0 -15Z" fill="url(#${g.id})"/>`;
    // wings
    s += `<path d="M-14 -1 Q-18 8 -12 15 Q-9 8 -10 0Z" fill="${shade(B, -22)}"/>` +
      `<path d="M14 -1 Q18 8 12 15 Q9 8 10 0Z" fill="${shade(B, -22)}"/>`;
    // belly feathers
    s += `<path d="M0 -2 C7 -2 9 4 8.5 9 Q8 16 0 16 Q-8 16 -8.5 9 C-9 4 -7 -2 0 -2Z" fill="${b}"/>` +
      `<path d="M-5 4 q2.5 3 5 0 q2.5 3 5 0 M-6 9 q2.5 3 5 0 q2.5 3 5 0 q2 2.4 4 0" stroke="${shade(b, -18)}" stroke-width="1.1" fill="none" opacity=".7"/>`;
    // big eyes
    s += `<circle cx="-5.4" cy="-7" r="5.4" fill="#fff"/><circle cx="5.4" cy="-7" r="5.4" fill="#fff"/>` +
      eye(-5, -7, 2.5) + eye(5.8, -7, 2.5) +
      `<path d="M-2 -1.5 L0 1.8 L2 -1.5 Z" fill="#ffb142"/>`;
    // feet
    s += `<path d="M-5 19 l-1.6 2.6 M-5 19 l1.6 2.6 M5 19 l-1.6 2.6 M5 19 l1.6 2.6" stroke="#ffb142" stroke-width="1.6" stroke-linecap="round"/>`;
    return `<g transform="translate(${x} ${y}) scale(${sc})">${s}</g>`;
  }

  function sheep(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const g = lgrad([[0, "#ffffff"], [100, "#e2e2ea"]]);
    let s = D(g.def) + shadow(20, 15);
    // legs
    s += `<rect x="-13" y="6" width="4.4" height="10" rx="2" fill="#33323a"/><rect x="-3" y="7" width="4.4" height="9" rx="2" fill="#33323a"/><rect x="7" y="6" width="4.4" height="10" rx="2" fill="#33323a"/>`;
    // fluffy cloud body
    s += `<path d="M-16 4 Q-22 2 -19 -4 Q-21 -10 -13 -11 Q-12 -17 -4 -15 Q1 -19 7 -15 Q15 -17 16 -10 Q22 -8 19 -2 Q22 4 15 6 Q12 11 4 9 Q-2 13 -8 9 Q-14 11 -16 4Z" fill="url(#${g.id})"/>`;
    // face
    s += `<circle cx="16" cy="-4" r="7.2" fill="#454452"/>` +
      `<path d="M20 -10 Q25 -11 24 -6 Q21 -5.5 20 -7.5Z" fill="#33323a"/>` +
      eye(14, -5.4, 1.7, "#fff") +
      `<path d="M16 -.5 Q18.5 1 20.5 -.5" stroke="#221f2e" stroke-width="1.2" fill="none" stroke-linecap="round"/>` +
      `<circle cx="12" cy="-1" r="1.6" fill="#ff9ec2" opacity=".55"/>`;
    // fluff on head
    s += `<path d="M10 -11 Q11 -16 16 -14.5 Q20 -16 20 -11.5 Q16 -13.5 10 -11Z" fill="#fff"/>`;
    return `<g transform="translate(${x} ${y}) scale(${sc})">${s}</g>`;
  }

  function dolphin(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, c = o.color || "#6fb7d9";
    const g = lgrad([[0, shade(c, 22)], [100, shade(c, -10)]]);
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + D(g.def) + `<g>${bob(3.5, 3)}` +
      // body arcing left
      `<path d="M-19 3 C-13 -9 -2 -13 8 -10 Q17 -7 19 0 Q14 -1 9 1 L13 8 Q7 7 3 3 C-4 8 -13 8 -19 3Z" fill="url(#${g.id})"/>` +
      // dorsal fin
      `<path d="M-3 -11 Q-1 -19 5 -20 Q3 -13 1 -10.5Z" fill="${shade(c, -18)}"/>` +
      // tail flukes
      `<path d="M-19 3 Q-24 -2 -23 -8 Q-18 -4 -15 -3 Q-13 -8 -8 -9 Q-11 -3 -12 1 Q-16 4 -19 3Z" fill="${shade(c, -18)}"/>` +
      // belly
      `<path d="M3 3 Q10 1 17 0.5 Q13 -2 8 -2 Q4 -1 3 3Z" fill="${shade(c, 38)}"/>` +
      `<circle cx="12" cy="-5" r="2.6" fill="#fff"/><circle cx="12.6" cy="-4.8" r="1.4" fill="#2b2440"/><circle cx="12.2" cy="-5.4" r=".6" fill="#fff"/>` +
      `<path d="M16 -1.5 Q18 -.5 19.5 -1.5" stroke="${shade(c, -30)}" stroke-width="1.2" fill="none" stroke-linecap="round"/>` +
      `</g></g>`;
  }

  function dino(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, c = o.color || "#7ec850", dk = shade(c, -14);
    const g = lgrad([[0, shade(c, 16)], [100, dk]]);
    let s = D(g.def) + shadow(24, 20);
    // tail
    s += `<path d="M-18 10 Q-28 8 -30 0 Q-22 2 -17 4Z" fill="${c}"/>`;
    // body
    s += `<ellipse cx="-5" cy="10" rx="16" ry="10.5" fill="url(#${g.id})"/>`;
    // legs
    s += `<rect x="-15" y="14" width="6.5" height="8" rx="3" fill="${dk}"/><rect x="-1" y="14" width="6.5" height="8" rx="3" fill="${dk}"/>`;
    // neck + head
    s += `<path d="M4 8 Q13 4 11.5 -9 L18 -9 Q20 2 12 9Z" fill="${c}"/>` +
      `<circle cx="14" cy="-13" r="7" fill="${c}"/>` +
      `<ellipse cx="19" cy="-11" rx="4.4" ry="3.4" fill="${shade(c, 30)}"/>` +
      eye(12, -15, 1.8) +
      `<path d="M18 -8.5 Q20.5 -7 22.5 -8.5" stroke="${shade(c, -30)}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
    // back plates + spots
    s += `<path d="M-14 1.5 Q-13 -3.5 -9 -2.5 Q-9 1 -11 2.5Z M-5 -0.5 Q-4 -5.5 0 -4.5 Q0 -1 -2 0.5Z" fill="${shade(c, 34)}"/>` +
      `<circle cx="-9" cy="10" r="2.2" fill="${dk}" opacity=".7"/><circle cx="-2" cy="14" r="1.7" fill="${dk}" opacity=".7"/>`;
    return `<g transform="translate(${x} ${y}) scale(${sc})">${s}</g>`;
  }

  function snowman(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const g = lgrad([[0, "#ffffff"], [100, "#dcebf8"]]);
    let s = D(g.def) + shadow(15, 15);
    s += `<circle cx="0" cy="5" r="11" fill="url(#${g.id})"/>` +
      `<circle cx="0" cy="-9" r="8.4" fill="url(#${g.id})"/>`;
    // stick arms
    s += `<path d="M-8 -10 Q-14 -13 -17 -18 M-15 -16 l-3 0" stroke="#8a5a33" stroke-width="1.8" fill="none" stroke-linecap="round"/>` +
      `<path d="M8 -10 Q14 -13 17 -18 M15 -16 l3 0" stroke="#8a5a33" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
    // head
    s += `<circle cx="0" cy="-22" r="6.6" fill="url(#${g.id})"/>`;
    // scarf
    s += `<path d="M-6.5 -17.5 Q0 -13.5 6.5 -17.5 L6 -14.5 Q0 -11 -6 -14.5Z" fill="#e8584f"/>` +
      `<path d="M3 -14.5 L4.5 -8.5 L8 -9.5 L6.5 -15.5Z" fill="#e8584f"/>`;
    // face
    s += eye(-2.6, -23.5, 1.3) + eye(2.6, -23.5, 1.3) +
      `<path d="M0 -21.5 L6.5 -20 L0 -19.4Z" fill="#ff8f1f"/>` +
      `<path d="M-2.6 -18.4 Q0 -16.8 2.6 -18.4" stroke="#33323a" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
    // top hat
    s += `<path d="M-8 -27 h16 v2 h-16Z" fill="#33323a"/><rect x="-5" y="-36" width="10" height="9.6" rx="1.4" fill="#33323a"/>` +
      `<rect x="-5" y="-30" width="10" height="2.4" fill="#e8584f"/>`;
    // buttons
    s += `<circle cx="0" cy="-10" r="1.1" fill="#33323a"/><circle cx="0" cy="-5.5" r="1.1" fill="#33323a"/><circle cx="0" cy="2" r="1.2" fill="#33323a"/>`;
    return `<g transform="translate(${x} ${y}) scale(${sc})">${s}</g>`;
  }

  function bird(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, c = o.color || "#ffd166", dk = shade(c, -16);
    const g = lgrad([[0, shade(c, 22)], [100, dk]]);
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + D(g.def) + `<g>${bob(2.5, 2.2)}` +
      `<path d="M-8 2 L-14 -3 Q-12 3 -8 5Z" fill="${dk}"/>` +
      `<circle cx="0" cy="0" r="8.4" fill="url(#${g.id})"/>` +
      `<path d="M-5 0 Q-2 6 4 4 Q0 8 -4 6 Q-7 4 -5 0Z" fill="${dk}">
        <animateTransform attributeName="transform" type="rotate" values="0 -4 3;-24 -4 3;0 -4 3" dur=".8s" repeatCount="indefinite"/></path>` +
      `<path d="M7.5 -1.5 L12.5 0 L7.5 1.8Z" fill="#ff8f1f"/>` +
      eye(3.4, -2.6, 1.6) +
      `<circle cx="1" cy="1.6" r="1.4" fill="#ff9ec2" opacity=".5"/>` +
      `</g></g>`;
  }

  function crab(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, C = "#e8584f";
    const g = lgrad([[0, shade(C, 18)], [100, shade(C, -12)]]);
    let s = D(g.def);
    // legs
    s += `<g stroke="${shade(C, -18)}" stroke-width="2" fill="none" stroke-linecap="round">
      <path d="M-11 4 Q-16 7 -17 11"/><path d="M-9 6 Q-12 10 -12 13"/>
      <path d="M11 4 Q16 7 17 11"/><path d="M9 6 Q12 10 12 13"/></g>`;
    // claws (one waves hello)
    s += `<g transform="translate(-13 -4)"><g>
      <animateTransform attributeName="transform" type="rotate" values="0;-18;0" dur="2.2s" repeatCount="indefinite"/>
      <path d="M0 0 Q-8 -2 -7 -9 Q-2 -10 0 -6 L-2.5 -7 Q-3.5 -4.5 -1.5 -3Z" fill="${C}"/></g></g>` +
      `<path d="M13 -4 Q21 -6 20 -13 Q15 -14 13 -10 L15.5 -11 Q16.5 -8.5 14.5 -7Z" fill="${C}"/>`;
    // body
    s += `<ellipse cx="0" cy="2" rx="12.5" ry="8.5" fill="url(#${g.id})"/>` +
      `<path d="M-8 6 Q0 9.5 8 6" stroke="${shade(C, -26)}" stroke-width="1.3" fill="none" opacity=".6"/>`;
    // eye stalks
    s += `<line x1="-4" y1="-5" x2="-4.5" y2="-10" stroke="${C}" stroke-width="1.8"/><line x1="4" y1="-5" x2="4.5" y2="-10" stroke="${C}" stroke-width="1.8"/>` +
      `<circle cx="-4.5" cy="-11.5" r="2.8" fill="#fff"/><circle cx="4.5" cy="-11.5" r="2.8" fill="#fff"/>` +
      eye(-4.5, -11.5, 1.4) + eye(4.5, -11.5, 1.4) +
      `<path d="M-2.5 -0.5 Q0 1.5 2.5 -0.5" stroke="#8a1f28" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
    return `<g transform="translate(${x} ${y}) scale(${sc})">${s}</g>`;
  }

  /* =========================================================
     SPACE & VEHICLES
     ========================================================= */
  function rocket(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, c = o.color || "#e8584f";
    const bg2 = lgrad([[0, "#ffffff"], [100, "#d4d9e2"]], true);
    const wg = glowF(1.6);
    let s = D(bg2.def + wg.def);
    // fins
    s += `<path d="M-10 4 Q-19 10 -18 22 Q-12 17 -9.5 14Z" fill="${shade(c, -12)}"/>` +
      `<path d="M10 4 Q19 10 18 22 Q12 17 9.5 14Z" fill="${shade(c, -12)}"/>`;
    // body
    s += `<path d="M0 -27 C8 -18 10.5 -8 10.5 4 Q10.5 14 7 17 L-7 17 Q-10.5 14 -10.5 4 C-10.5 -8 -8 -18 0 -27Z" fill="url(#${bg2.id})"/>` +
      `<path d="M0 -27 C-8 -18 -10.5 -8 -10.5 4 Q-10.5 14 -7 17 L-3 17 Q-6 14 -6 4 C-6 -8 -4 -18 0 -27Z" fill="#fff" opacity=".55"/>`;
    // nose cone + stripe
    s += `<path d="M0 -27 C5.5 -21 8 -15 9 -9 L-9 -9 C-8 -15 -5.5 -21 0 -27Z" fill="${c}"/>` +
      `<path d="M-8.5 11 Q0 14 8.5 11 L8 15 Q0 17.5 -8 15Z" fill="${c}"/>`;
    // porthole
    s += `<circle cx="0" cy="-1" r="5.6" fill="${shade(c, -20)}"/>` +
      `<circle cx="0" cy="-1" r="4.2" fill="#7fd4ff" filter="url(#${wg.id})"/>` +
      `<path d="M-2.4 -3 Q-.5 -4.6 1.8 -3.4" stroke="#eafdff" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
    if (o.flame) {
      const fg = glowF(2.4);
      s += D(fg.def) + `<g transform="translate(0 17.5)" filter="url(#${fg.id})"><g>
        <animateTransform attributeName="transform" type="scale" values="1 1;1 .72;1 1.08;1 1" dur=".42s" repeatCount="indefinite"/>
        <path d="M-5.5 0 Q-6 9 0 15 Q6 9 5.5 0Z" fill="#ffb142"/>
        <path d="M-2.8 0 Q-3 5.5 0 9.5 Q3 5.5 2.8 0Z" fill="#ffe066"/></g></g>`;
    }
    return `<g transform="translate(${x} ${y}) scale(${sc})">${s}</g>`;
  }

  function planet(x, y, r, col, ring) {
    col = col || "#e8584f";
    r = r || 30;
    const g = rgrad([[0, shade(col, 42)], [55, col], [100, shade(col, -26)]], 0.32, 0.3);
    const cid = uid();
    let s = D(g.def + `<clipPath id="${cid}"><circle cx="${x}" cy="${y}" r="${r}"/></clipPath>`);
    if (ring) s += `<path d="M${x - r * 1.75} ${y + r * 0.22} A ${r * 1.75} ${r * 0.55} 0 0 1 ${x + r * 1.75} ${y - r * 0.22}" fill="none" stroke="${shade(col, 28)}" stroke-width="${Math.max(3, r * 0.14)}" opacity=".9" transform="rotate(-4 ${x} ${y})"/>`;
    s += `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${g.id})"/>`;
    s += `<g clip-path="url(#${cid})">` +
      `<ellipse cx="${x - r * 0.3}" cy="${y - r * 0.15}" rx="${r * 0.28}" ry="${r * 0.2}" fill="${shade(col, -20)}" opacity=".55"/>` +
      `<ellipse cx="${x + r * 0.38}" cy="${y + r * 0.34}" rx="${r * 0.18}" ry="${r * 0.13}" fill="${shade(col, -20)}" opacity=".5"/>` +
      `<path d="M${x - r} ${y + r * 0.5} Q${x} ${y + r * 0.18} ${x + r} ${y + r * 0.55}" stroke="${shade(col, -14)}" stroke-width="${r * 0.16}" fill="none" opacity=".4"/>` +
      `<path d="M${x - r} ${y - r * 0.42} Q${x} ${y - r * 0.7} ${x + r} ${y - r * 0.38}" stroke="${shade(col, 20)}" stroke-width="${r * 0.13}" fill="none" opacity=".35"/></g>`;
    if (ring) s += `<path d="M${x - r * 1.75} ${y + r * 0.22} A ${r * 1.75} ${r * 0.55} 0 0 0 ${x + r * 1.75} ${y - r * 0.22}" fill="none" stroke="${shade(col, 36)}" stroke-width="${Math.max(3.5, r * 0.16)}" transform="rotate(-4 ${x} ${y})"/>`;
    return s;
  }

  function alien(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, c = o.color || "#9be15d", dk = shade(c, -22);
    const g = lgrad([[0, shade(c, 20)], [100, dk]]);
    const ag = glowF(1.6);
    let s = D(g.def + ag.def) + shadow(14, 15);
    // legs
    s += `<path d="M-4 12 Q-5 15 -6.5 16.5 M4 12 Q5 15 6.5 16.5" stroke="${dk}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    // little body + arms
    s += `<path d="M-6.5 3 Q-7.5 13 0 13 Q7.5 13 6.5 3Z" fill="${dk}"/>` +
      `<path d="M-6 5 Q-11 7 -12 11 M6 5 Q11 7 12 11" stroke="${dk}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
    // antennae with glowing tips
    s += `<path d="M-5 -13 Q-8 -19 -11 -21 M5 -13 Q8 -19 11 -21" stroke="${c}" stroke-width="2" fill="none" stroke-linecap="round"/>` +
      `<circle cx="-11" cy="-21.5" r="2.2" fill="#ffe066" filter="url(#${ag.id})"><animate attributeName="opacity" values="1;.4;1" dur="1.7s" repeatCount="indefinite"/></circle>` +
      `<circle cx="11" cy="-21.5" r="2.2" fill="#ffe066" filter="url(#${ag.id})"><animate attributeName="opacity" values=".4;1;.4" dur="1.7s" repeatCount="indefinite"/></circle>`;
    // big dome head
    s += `<path d="M0 -16 C10 -16 13 -8 12 -2 Q11 5 0 5 Q-11 5 -12 -2 C-13 -8 -10 -16 0 -16Z" fill="url(#${g.id})"/>`;
    // huge oval eyes
    s += `<ellipse cx="-4.6" cy="-6" rx="3.4" ry="4.4" fill="#fff"/><ellipse cx="4.6" cy="-6" rx="3.4" ry="4.4" fill="#fff"/>` +
      eye(-4.2, -5.4, 2) + eye(5, -5.4, 2) +
      `<path d="M-2.4 1 Q0 3 2.4 1" stroke="${shade(c, -40)}" stroke-width="1.4" fill="none" stroke-linecap="round"/>` +
      cheeks(8.4, -1, 1.7, "#7fd4ff");
    return `<g transform="translate(${x} ${y}) scale(${sc})">${s}</g>`;
  }

  /* =========================================================
     BLOCK WORLD PROPS (kept proudly blocky — but smooth & lit)
     ========================================================= */
  function block(x, y, s, top, side) {
    const g = lgrad([[0, shade(side, 8)], [100, shade(side, -14)]]);
    return `<g transform="translate(${x} ${y})">` + D(g.def) +
      `<rect x="1" y="1" width="${s - 2}" height="${s - 2}" rx="${s * 0.14}" fill="url(#${g.id})"/>` +
      `<path d="M${1 + s * 0.14} 1 H${s - 1 - s * 0.14} Q${s - 1} 1 ${s - 1} ${1 + s * 0.14} V${s * 0.3} Q${s * 0.5} ${s * 0.38} 1 ${s * 0.3} V${1 + s * 0.14} Q1 1 ${1 + s * 0.14} 1Z" fill="${top}"/>` +
      `<path d="M${s * 0.12} ${s * 0.12} H${s * 0.6}" stroke="${shade(top, 30)}" stroke-width="${s * 0.06}" stroke-linecap="round" opacity=".8"/></g>`;
  }
  function grassBlocks(y) {
    let s = "";
    for (let x = 0; x < 400; x += 40) s += block(x, y, 40, x % 80 ? "#7ed957" : "#8fe067", "#8a5a33");
    for (let x = 0; x < 400; x += 40) s += block(x, y + 40, 40, "#8a5a33", x % 80 ? "#6b4423" : "#75492a");
    return s;
  }
  function diamond(x, y, sc) {
    sc = sc || 1;
    const g = glowF(2);
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + D(g.def) +
      `<g filter="url(#${g.id})"><path d="M-8.5 -3 L-4 -9 L4 -9 L8.5 -3 L0 9Z" fill="#5ee7e0"/>` +
      `<path d="M-8.5 -3 L-4 -9 L-1 -3Z M4 -9 L8.5 -3 L1.5 -3Z" fill="#9af6f0"/>` +
      `<path d="M-1 -3 L0 9 L-8.5 -3Z" fill="#2fb0a9" opacity=".8"/></g>` +
      sparkle(4.5, -6.5, 2.6, "#ffffff", 2, -0.5) + `</g>`;
  }
  function pickaxe(x, y, sc) {
    sc = sc || 1;
    const g = lgrad([[0, "#cfe0ef"], [100, "#8fa3b9"]]);
    return `<g transform="translate(${x} ${y}) scale(${sc}) rotate(-20)">` + D(g.def) +
      `<rect x="-2.4" y="-4" width="4.8" height="36" rx="2.2" fill="#8a5a33"/>` +
      `<rect x="-1.2" y="-2" width="1.6" height="30" rx="0.8" fill="#a06a3a"/>` +
      `<path d="M-21 -8 Q0 -22 21 -8 Q19 -12 14 -14 Q0 -19 -14 -14 Q-19 -12 -21 -8Z" fill="url(#${g.id})"/>` +
      `<path d="M-18 -10 Q0 -20 18 -10" stroke="#eaf2f8" stroke-width="1.6" fill="none" opacity=".8"/></g>`;
  }
  function torch(x, y) {
    const fg = glowF(2.6), halo = rgrad([[0, "#ffb142", .4], [100, "#ffb142", 0]]);
    return `<g transform="translate(${x} ${y})">` + D(fg.def + halo.def) +
      `<circle cx="0" cy="-4" r="22" fill="url(#${halo.id})"><animate attributeName="opacity" values="1;.6;1" dur="2.1s" repeatCount="indefinite"/></circle>` +
      `<rect x="-2.2" y="0" width="4.4" height="19" rx="2" fill="#8a5a33"/>` +
      `<rect x="-1.1" y="1" width="1.4" height="16" rx="0.7" fill="#a06a3a"/>` +
      `<g transform="translate(0 0)" filter="url(#${fg.id})"><g>
        <animateTransform attributeName="transform" type="scale" values="1 1;1 1.18;1 .92;1 1" dur=".6s" repeatCount="indefinite"/>
        <path d="M0 -13 Q4.6 -7 3.4 -2 Q2.4 1 0 1 Q-2.4 1 -3.4 -2 Q-4.6 -7 0 -13Z" fill="#ffb142"/>
        <path d="M0 -7.5 Q2.2 -4 1.6 -1.6 Q1 0 0 0 Q-1 0 -1.6 -1.6 Q-2.2 -4 0 -7.5Z" fill="#ffe066"/></g></g></g>`;
  }
  function fizzer(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const g = lgrad([[0, "#79cf79"], [100, "#4aa34a"]]);
    const F = "#1c3a1c";
    let s = D(g.def) + shadow(17, 35);
    // blocky head
    s += `<rect x="-11" y="0" width="22" height="21" rx="3.5" fill="url(#${g.id})"/>` +
      `<rect x="-11" y="0" width="22" height="6" rx="3" fill="#8fdb8f" opacity=".5"/>` +
      `<circle cx="-6" cy="16" r="1.6" fill="#3d8a3d" opacity=".6"/><circle cx="7" cy="3.5" r="1.4" fill="#3d8a3d" opacity=".6"/>`;
    // that face
    s += `<rect x="-7.5" y="5" width="5" height="5" rx="1.2" fill="${F}"/>` +
      `<rect x="2.5" y="5" width="5" height="5" rx="1.2" fill="${F}"/>` +
      `<path d="M-3.5 11.5 h7 v3.5 h2.5 v6 h-3.5 v-3.5 h-5 v3.5 h-3.5 v-6 h2.5Z" fill="${F}"/>`;
    // body + feet
    s += `<rect x="-8.5" y="22" width="17" height="10" rx="3" fill="#4aa34a"/>` +
      `<rect x="-10" y="30" width="8" height="5.5" rx="2.4" fill="#3d8a3d"/>` +
      `<rect x="2" y="30" width="8" height="5.5" rx="2.4" fill="#3d8a3d"/>`;
    return `<g transform="translate(${x} ${y}) scale(${sc})">${s}</g>`;
  }

  /* =========================================================
     CAMP PROPS
     ========================================================= */
  function tent(x, y, sc, col) {
    sc = sc || 1; col = col || "#e8584f";
    const g = lgrad([[0, shade(col, 16)], [100, shade(col, -14)]]);
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + D(g.def) + shadow(28, 12) +
      `<path d="M0 -30 C6 -14 16 2 27 12 L-27 12 C-16 2 -6 -14 0 -30Z" fill="url(#${g.id})"/>` +
      `<path d="M0 -30 C-2 -14 -3 -2 -3 12 L10 12 C4 0 2 -14 0 -30Z" fill="${shade(col, -26)}" opacity=".45"/>` +
      `<path d="M0 -26 C4.5 -12 11 0 18 9 L-2 9 C0 -2 0 -14 0 -26Z" fill="#3a2718" opacity=".9" transform="translate(-7 3) scale(.62)"/>` +
      `<path d="M0 -30 C6 -14 16 2 27 12 M0 -30 C-6 -14 -16 2 -27 12" stroke="${shade(col, -30)}" stroke-width="1.6" fill="none"/>` +
      `<line x1="0" y1="-30" x2="0" y2="-38" stroke="#8a5a33" stroke-width="2"/>` +
      `<path d="M0 -38 q6 1 10 -1 v5.5 q-5 2 -10 1Z" fill="#ffd166">
        <animate attributeName="d" values="M0 -38 q6 1 10 -1 v5.5 q-5 2 -10 1Z;M0 -38 q6 -2 10 1 v5.5 q-5 -1 -10 -1Z;M0 -38 q6 1 10 -1 v5.5 q-5 2 -10 1Z" dur="1.5s" repeatCount="indefinite"/></path></g>`;
  }
  function campfire(x, y, sc) {
    sc = sc || 1;
    const fg = glowF(2.6), halo = rgrad([[0, "#ffb142", .38], [100, "#ffb142", 0]]);
    let s = D(fg.def + halo.def) + shadow(14, 11);
    s += `<circle cx="0" cy="-2" r="24" fill="url(#${halo.id})"><animate attributeName="opacity" values="1;.55;1" dur="1.9s" repeatCount="indefinite"/></circle>`;
    // logs
    s += `<rect x="-13" y="6" width="26" height="4.6" rx="2.3" fill="#8a5a33" transform="rotate(14)"/>` +
      `<rect x="-13" y="6" width="26" height="4.6" rx="2.3" fill="#6b4423" transform="rotate(-14)"/>`;
    // flames
    s += `<g transform="translate(0 8)" filter="url(#${fg.id})"><g>
      <animateTransform attributeName="transform" type="scale" values="1 1;1.06 1.15;.95 .9;1 1" dur=".55s" repeatCount="indefinite"/>
      <path d="M0 -21 Q7.5 -12 6 -4 Q5 2 0 2 Q-5 2 -6 -4 Q-7.5 -12 0 -21Z" fill="#ff8f1f"/>
      <path d="M0 -12.5 Q3.8 -7 3 -2.5 Q2.2 0.5 0 0.5 Q-2.2 0.5 -3 -2.5 Q-3.8 -7 0 -12.5Z" fill="#ffe066"/></g></g>`;
    // sparks
    s += `<circle r="1.3" fill="#ffe066"><animateMotion path="M2 -14 q4 -12 -2 -24" dur="1.6s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="1.6s" repeatCount="indefinite"/></circle>` +
      `<circle r="1" fill="#ffb142"><animateMotion path="M-3 -12 q-5 -10 1 -22" dur="2.1s" begin="-.8s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="2.1s" begin="-.8s" repeatCount="indefinite"/></circle>`;
    return `<g transform="translate(${x} ${y}) scale(${sc})">${s}</g>`;
  }
  function smore(x, y, sc) {
    sc = sc || 1;
    return `<g transform="translate(${x} ${y}) scale(${sc})">` +
      `<rect x="-15" y="5" width="30" height="7" rx="3" fill="#c98a4a"/>` +
      `<circle cx="-9" cy="8.5" r=".9" fill="#a06a3a"/><circle cx="0" cy="8.5" r=".9" fill="#a06a3a"/><circle cx="9" cy="8.5" r=".9" fill="#a06a3a"/>` +
      `<path d="M-14 5 Q-15 -1 -13 -2 L13 -2 Q15 -1 14 5Z" fill="#5a3a22"/>` +
      `<path d="M-13 -2 Q-15 -3 -14 -8 Q-13 -11 -8 -11 L8 -11 Q13 -11 14 -8 Q15 -3 13 -2Z" fill="#fff4e0"/>` +
      `<path d="M-9 -8 Q0 -6 9 -8" stroke="#e8d2b0" stroke-width="1.4" fill="none"/>` +
      `<rect x="-15" y="-18" width="30" height="7" rx="3" fill="#c98a4a"/>` +
      `<circle cx="-9" cy="-14.5" r=".9" fill="#a06a3a"/><circle cx="0" cy="-14.5" r=".9" fill="#a06a3a"/><circle cx="9" cy="-14.5" r=".9" fill="#a06a3a"/></g>`;
  }
  function gem(x, y, sc, col) {
    sc = sc || 1; col = col || "#ff5d8f";
    const g = glowF(2.2);
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + D(g.def) +
      `<g filter="url(#${g.id})"><path d="M-11 -6 L-5.5 -13 L5.5 -13 L11 -6 L0 12Z" fill="${col}"/>` +
      `<path d="M-11 -6 L-5.5 -13 L-2 -6Z M5.5 -13 L11 -6 L2 -6Z" fill="${shade(col, 32)}"/>` +
      `<path d="M-2 -6 L0 12 L-11 -6Z" fill="${shade(col, -24)}" opacity=".75"/></g>` +
      sparkle(5, -9, 3, "#ffffff", 2.4, -0.9) + `</g>`;
  }

  /* =========================================================
     EXTRA PROPS
     ========================================================= */
  function chest(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const g = lgrad([[0, "#a06a3a"], [100, "#7a4c28"]]);
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + D(g.def) + shadow(24, 18) +
      `<rect x="-21" y="-1" width="42" height="19" rx="3.5" fill="url(#${g.id})"/>` +
      `<path d="M-21 -1 Q-21 -10 -12 -10 L12 -10 Q21 -10 21 -1 L21 2 L-21 2Z" fill="#8a5a33"/>` +
      `<path d="M-18 -7.5 Q0 -11 18 -7.5" stroke="#b98a5a" stroke-width="1.6" fill="none" opacity=".8"/>` +
      `<rect x="-16" y="-9" width="4.5" height="27" rx="2" fill="#5f3d1f"/><rect x="11.5" y="-9" width="4.5" height="27" rx="2" fill="#5f3d1f"/>` +
      `<rect x="-4.5" y="-3" width="9" height="11" rx="2.4" fill="#ffd166" stroke="#c79a2e" stroke-width="1.2"/>` +
      `<circle cx="0" cy="1" r="1.6" fill="#8a6a1a"/><path d="M0 2 v2.6" stroke="#8a6a1a" stroke-width="1.4" stroke-linecap="round"/></g>`;
  }
  function key(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, c = "#ffd166";
    return `<g transform="translate(${x} ${y}) scale(${sc}) rotate(-14)">` +
      `<circle cx="-10" cy="0" r="6.6" fill="none" stroke="${c}" stroke-width="4"/>` +
      `<circle cx="-10" cy="0" r="6.6" fill="none" stroke="#c79a2e" stroke-width="1.2" transform="translate(1 1.4)" opacity=".6"/>` +
      `<rect x="-4" y="-2.2" width="21" height="4.4" rx="2.2" fill="${c}"/>` +
      `<rect x="9" y="1" width="3.4" height="7" rx="1.5" fill="${c}"/><rect x="14" y="1" width="3.4" height="5.4" rx="1.5" fill="${c}"/>` +
      sparkle(-13.5, -5, 2.6, "#fff", 2.4, -0.7) + `</g>`;
  }
  function scroll(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const g = lgrad([[0, "#faf0d4"], [100, "#e8d5a8"]]);
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + D(g.def) +
      `<path d="M-14 -14 L14 -14 L14 14 Q7 17 0 15.5 Q-7 17 -14 14Z" fill="url(#${g.id})"/>` +
      `<path d="M-16 -18 L16 -18 Q19 -18 19 -15 Q19 -12 16 -12 L-16 -12 Q-19 -12 -19 -15 Q-19 -18 -16 -18Z" fill="#d9c79a"/>` +
      `<circle cx="-17" cy="-15" r="2.2" fill="#c4ae7e"/><circle cx="17" cy="-15" r="2.2" fill="#c4ae7e"/>` +
      `<path d="M-9 -6 h18 M-9 0 h18 M-9 6 h12" stroke="#b09a66" stroke-width="1.8" stroke-linecap="round"/></g>`;
  }
  function sign(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const g = lgrad([[0, "#b97e46"], [100, "#8f5c2e"]]);
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + D(g.def) + shadow(10, 23) +
      `<rect x="-2.6" y="-4" width="5.2" height="28" rx="2.4" fill="#6b4423"/>` +
      `<rect x="-22" y="-24" width="44" height="22" rx="5" fill="url(#${g.id})"/>` +
      `<rect x="-22" y="-24" width="44" height="22" rx="5" fill="none" stroke="#6b4423" stroke-width="1.6"/>` +
      `<circle cx="-18" cy="-20" r="1.1" fill="#5f3d1f"/><circle cx="18" cy="-20" r="1.1" fill="#5f3d1f"/>` +
      `<path d="M-14 -17 h28 M-14 -12 h20 M-14 -7 h24" stroke="#5f3d1f" stroke-width="2" stroke-linecap="round"/></g>`;
  }
  function crystal(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, c = o.color || "#a368d8";
    const g = glowF(2.2);
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + D(g.def) +
      `<g filter="url(#${g.id})">` +
      `<path d="M-7.5 10 L-9.5 -2 L-6 -7 L-3 1 L-3.5 10Z" fill="${shade(c, -16)}"/>` +
      `<path d="M0 -13 L5 -4 L4 10 L-4 10 L-5 -4Z" fill="${c}"/>` +
      `<path d="M0 -13 L5 -4 L1.5 -2 Z" fill="${shade(c, 30)}"/>` +
      `<path d="M6.5 10 L9 0 L6 -4 L3.5 3 L4 10Z" fill="${shade(c, 14)}"/></g>` +
      `<path d="M-1.5 -8 L-1 6" stroke="#fff" stroke-width="1.3" opacity=".55" stroke-linecap="round"/>` +
      sparkle(3, -8, 2.4, "#fff", 2.6, -1.1) + `</g>`;
  }
  function anvil(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const g = lgrad([[0, "#6a6a78"], [100, "#3d3d48"]]);
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + D(g.def) + shadow(16, 9) +
      `<path d="M-18 -12 L14 -12 Q21 -12 19 -7 Q13 -3 5 -3 L5 2 L9 2 Q13 3 12 8 L-12 8 Q-13 3 -9 2 L-5 2 L-5 -3 Q-14 -4 -17 -8 Q-19 -10 -18 -12Z" fill="url(#${g.id})"/>` +
      `<path d="M-16 -10.5 L12 -10.5" stroke="#9a9aa8" stroke-width="1.8" stroke-linecap="round" opacity=".8"/></g>`;
  }
  function coral(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, c = o.color || "#ff7eb6";
    return `<g transform="translate(${x} ${y}) scale(${sc})">` +
      `<g stroke="${c}" fill="none" stroke-linecap="round">
        <path d="M0 0 Q-1 -14 -3 -20 Q-4 -26 -1 -30" stroke-width="5"/>
        <path d="M-2 -14 Q-9 -18 -11 -25" stroke-width="4"/>
        <path d="M-1.5 -10 Q6 -14 8 -24" stroke-width="4"/>
        <path d="M8 -24 Q8 -28 11 -30" stroke-width="3.2"/></g>` +
      `<circle cx="-1" cy="-30.5" r="2.6" fill="${shade(c, 24)}"/><circle cx="-11.4" cy="-25.5" r="2.2" fill="${shade(c, 24)}"/><circle cx="11.4" cy="-30.5" r="2" fill="${shade(c, 24)}"/>` +
      `<ellipse cx="0" cy="0" rx="10" ry="2.6" fill="${shade(c, -22)}" opacity=".6"/></g>`;
  }
  function ship(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const hg = lgrad([[0, "#8a5a33"], [100, "#5f3d1f"]]);
    const sg = lgrad([[0, "#fdf6e0"], [100, "#e8dcc0"]], true);
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + D(hg.def + sg.def) + `<g>${bob(2.5, 4)}` +
      `<rect x="-1.8" y="-58" width="3.6" height="60" rx="1.8" fill="#5a3a22"/>` +
      // sails
      `<path d="M3 -54 Q22 -46 24 -32 L3 -32Z" fill="url(#${sg.id})"/>` +
      `<path d="M-3 -50 Q-19 -44 -21 -33 L-3 -33Z" fill="#e8dcc0"/>` +
      `<path d="M3 -50 Q14 -46 17 -38" stroke="#d4c5a0" stroke-width="1.2" fill="none"/>` +
      // pennant
      `<path d="M-1.8 -58 q-8 1.5 -13 -1 v6 q5 2.5 13 1Z" fill="#e8584f">
        <animate attributeName="d" values="M-1.8 -58 q-8 1.5 -13 -1 v6 q5 2.5 13 1Z;M-1.8 -58 q-8 -2.5 -13 1 v6 q5 -1.5 13 -1Z;M-1.8 -58 q-8 1.5 -13 -1 v6 q5 2.5 13 1Z" dur="1.4s" repeatCount="indefinite"/></path>` +
      // hull
      `<path d="M-42 -4 L42 -4 Q39 12 26 17 L-26 17 Q-39 12 -42 -4Z" fill="url(#${hg.id})"/>` +
      `<path d="M-42 -4 L42 -4 L41 0 L-41 0Z" fill="#a06a3a"/>` +
      `<path d="M-38 5 L38 5" stroke="#4a2f16" stroke-width="1.4" opacity=".7"/>` +
      `<circle cx="-16" cy="6" r="2.4" fill="#ffd166" stroke="#4a2f16" stroke-width="1"/><circle cx="0" cy="7" r="2.4" fill="#ffd166" stroke="#4a2f16" stroke-width="1"/><circle cx="16" cy="6" r="2.4" fill="#ffd166" stroke="#4a2f16" stroke-width="1"/>` +
      `</g></g>`;
  }
  function bookGlow(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, c = o.color || "#ffd166";
    const g = glowF(3), halo = rgrad([[0, shade(c, 20), .5], [100, shade(c, 20), 0]]);
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + D(g.def + halo.def) + `<g>${bob(3, 3.6)}` +
      `<circle r="26" fill="url(#${halo.id})"><animate attributeName="opacity" values="1;.55;1" dur="2.8s" repeatCount="indefinite"/></circle>` +
      `<g filter="url(#${g.id})">` +
      `<path d="M-15 -12 Q-8 -16 0 -12 Q8 -16 15 -12 L15 12 Q8 8 0 12 Q-8 8 -15 12Z" fill="#fffbe8"/>` +
      `<path d="M0 -12 L0 12" stroke="#e8d5a8" stroke-width="1.6"/>` +
      `<path d="M-11 -7 Q-6 -9.5 -3 -7.5 M-11 -2 Q-6 -4.5 -3 -2.5 M-11 3 Q-6 0.5 -3 2.5 M3 -7.5 Q8 -9.5 11 -7 M3 -2.5 Q8 -4.5 11 -2 M3 2.5 Q8 0.5 11 3" stroke="#c9b384" stroke-width="1.2" fill="none"/>` +
      `<path d="M-16.5 -11 Q-8 -15.5 -.5 -11.5 M16.5 -11 Q8 -15.5 .5 -11.5" stroke="${c}" stroke-width="2.6" fill="none" stroke-linecap="round"/></g>` +
      sparkle(-19, -16, 3.4, c, 2.2, -0.4) + sparkle(19, -8, 2.6, c, 2.8, -1.4) + sparkle(6, -20, 2.2, "#fff", 2.5, -2) +
      `</g></g>`;
  }
  function portal(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, c = o.color || "#a368d8";
    const g = rgrad([[0, shade(c, 55), .95], [55, c, .85], [100, shade(c, -30), .9]]);
    const gl = glowF(3);
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + D(g.def + gl.def) +
      `<ellipse rx="30" ry="47" fill="${shade(c, -38)}" opacity=".6"/>` +
      `<ellipse rx="26" ry="43" fill="url(#${g.id})" filter="url(#${gl.id})"/>` +
      `<ellipse rx="19" ry="34" fill="none" stroke="${shade(c, 45)}" stroke-width="2.4" stroke-dasharray="14 10" opacity=".9">
        <animate attributeName="stroke-dashoffset" values="0;48" dur="3s" repeatCount="indefinite"/></ellipse>` +
      `<ellipse rx="11" ry="22" fill="none" stroke="#fff" stroke-width="1.8" stroke-dasharray="8 12" opacity=".8">
        <animate attributeName="stroke-dashoffset" values="40;0" dur="2.4s" repeatCount="indefinite"/></ellipse>` +
      sparkle(-14, -26, 3, "#e9d5ff", 1.9, -0.3) + sparkle(15, 18, 2.6, "#fff", 2.3, -1.2) +
      `</g>`;
  }
  function sword(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const g = lgrad([[0, "#eef4fa"], [100, "#a9b8c9"]], true);
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + D(g.def) +
      `<path d="M0 -30 Q4 -25 4 -18 L4 2 L-4 2 L-4 -18 Q-4 -25 0 -30Z" fill="url(#${g.id})"/>` +
      `<path d="M0 -26 L0 0" stroke="#fff" stroke-width="1.4" opacity=".8"/>` +
      `<rect x="-9.5" y="2" width="19" height="4.6" rx="2.3" fill="#ffd166"/>` +
      `<rect x="-3" y="6.5" width="6" height="12" rx="2.6" fill="#8a5a33"/>` +
      `<path d="M-3 9.5 h6 M-3 13 h6" stroke="#6b4423" stroke-width="1.2"/>` +
      `<circle cx="0" cy="20.5" r="2.6" fill="#ffd166"/>` +
      sparkle(2.5, -21, 2.4, "#ffffff", 2.2, -0.8) + `</g>`;
  }
  function shield(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, c = o.color || "#e8584f";
    const g = lgrad([[0, shade(c, 18)], [100, shade(c, -14)]]);
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + D(g.def) +
      `<path d="M0 -15 Q10 -15 14.5 -11 Q15 3 0 15 Q-15 3 -14.5 -11 Q-10 -15 0 -15Z" fill="url(#${g.id})" stroke="${shade(c, -30)}" stroke-width="2"/>` +
      `<path d="M0 -9 L2.4 -3.4 L8.5 -3 L4 1 L5.4 7 L0 3.8 L-5.4 7 L-4 1 L-8.5 -3 L-2.4 -3.4Z" fill="#fff" opacity=".92"/>` +
      `<path d="M-10 -10.5 Q-4 -13 2 -12" stroke="#fff" stroke-width="1.6" fill="none" opacity=".5" stroke-linecap="round"/></g>`;
  }
  function beacon(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const bg2 = lgrad([[0, "#bff0ff", 0], [60, "#bff0ff", .5], [100, "#eafdff", .8]]);
    const g = glowF(2.6);
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + D(bg2.def + g.def) +
      `<path d="M-8 -4 L-13 -150 L13 -150 L8 -4Z" fill="url(#${bg2.id})">
        <animate attributeName="opacity" values="1;.55;1" dur="3s" repeatCount="indefinite"/></path>` +
      `<path d="M-15 8 L-11 -6 L11 -6 L15 8 Q0 12 -15 8Z" fill="#6d7994"/>` +
      `<path d="M-15 8 L-11 -6 L-6 -6 L-8.5 8Z" fill="#8a96b2"/>` +
      `<rect x="-7" y="-17" width="14" height="13" rx="3" fill="#bff0ff" filter="url(#${g.id})"/>` +
      `<rect x="-4" y="-14.5" width="8" height="8" rx="2" fill="#eafdff"/></g>`;
  }
  function mountainProp(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const g = lgrad([[0, "#a8b4cf"], [100, "#7e8aa6"]]);
    return `<g transform="translate(${x} ${y}) scale(${sc})">` + D(g.def) +
      `<path d="M-44 0 Q-22 -14 -10 -40 Q0 -60 10 -40 Q22 -14 44 0Z" fill="url(#${g.id})"/>` +
      `<path d="M-12 -36 Q0 -56 12 -36 Q7 -30 3 -34 Q-1 -28 -5 -33 Q-9 -29 -12 -36Z" fill="#fff"/>` +
      `<path d="M-6 -20 Q0 -30 4 -18" stroke="#6d7994" stroke-width="1.6" fill="none" opacity=".6"/></g>`;
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
