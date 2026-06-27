/* ===========================================================
   Choose Your Own Adventure — SVG ART TOOLKIT
   -----------------------------------------------------------
   Every picture in this game is drawn with inline SVG — no image
   files at all. This file builds a library of reusable little
   drawings (backgrounds, kids, animals, dragons, rockets, blocks…)
   that the stories in story-data.js compose into full scenes.

   Coordinate space for EVERY scene is: viewBox="0 0 400 300".
   Each helper returns a string of SVG markup.

   Exposed as the global  ART  object.
   =========================================================== */
(function () {
  "use strict";

  // unique-id counter so gradient ids never collide on a page
  let UID = 0;
  const uid = () => "g" + (UID++);

  /* ---- colour helpers ---- */
  function hexToRgb(h) {
    h = h.replace("#", "");
    if (h.length === 3) h = h.split("").map(c => c + c).join("");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const clamp = n => Math.max(0, Math.min(255, Math.round(n)));
  // shade a hex colour: pct < 0 darkens, pct > 0 lightens. returns rgb()
  function shade(hex, pct) {
    const [r, g, b] = hexToRgb(hex);
    const f = pct / 100;
    const adj = v => (f < 0 ? v * (1 + f) : v + (255 - v) * f);
    return `rgb(${clamp(adj(r))},${clamp(adj(g))},${clamp(adj(b))})`;
  }

  /* =========================================================
     BACKGROUNDS
     ========================================================= */

  // bright daytime sky with sun, clouds and rolling hills
  function skyDay(o) {
    o = o || {};
    const u = uid();
    const top = o.top || "#8fd4ff", bot = o.bot || "#d8f3ff";
    const hill = o.hill || "#7ed957", hill2 = o.hill2 || "#5cc24a";
    let s = `<defs><linearGradient id="sky${u}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${top}"/><stop offset="100%" stop-color="${bot}"/>
      </linearGradient>
      <radialGradient id="sun${u}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fff7c2"/><stop offset="100%" stop-color="#ffd23e"/>
      </radialGradient></defs>
      <rect width="400" height="300" fill="url(#sky${u})"/>`;
    if (o.sun !== false) {
      const sx = o.sunX || 64, sy = o.sunY || 56;
      s += `<circle cx="${sx}" cy="${sy}" r="42" fill="#ffe680" opacity=".35"/>
            <circle cx="${sx}" cy="${sy}" r="28" fill="url(#sun${u})"/>`;
    }
    if (o.clouds !== false) {
      s += cloud(300, 60, 1) + cloud(150, 40, .7);
    }
    if (o.hills !== false) {
      s += `<path d="M0 230 Q 110 180 230 222 T 400 210 V300 H0Z" fill="${hill2}"/>
            <path d="M0 252 Q 120 214 250 250 T 400 244 V300 H0Z" fill="${hill}"/>`;
    }
    return s;
  }

  // warm sunset sky
  function skySunset(o) {
    o = o || {};
    const u = uid();
    return `<defs><linearGradient id="ss${u}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ff9a5a"/><stop offset="45%" stop-color="#ffd086"/>
        <stop offset="100%" stop-color="#ffeccb"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#ss${u})"/>
      <circle cx="200" cy="180" r="46" fill="#fff0c2" opacity=".6"/>
      <circle cx="200" cy="180" r="32" fill="#ffcf6b"/>
      ${cloud(90, 70, .7)}${cloud(320, 50, .9)}
      <path d="M0 232 Q 110 200 230 226 T 400 218 V300 H0Z" fill="#c97a3e"/>
      <path d="M0 256 Q 120 230 250 254 T 400 248 V300 H0Z" fill="#9c5b2c"/>`;
  }

  // deep starry night with moon
  function night(o) {
    o = o || {};
    const u = uid();
    let s = `<defs><radialGradient id="nk${u}" cx="50%" cy="28%" r="95%">
        <stop offset="0%" stop-color="#3b2a78"/><stop offset="60%" stop-color="#241a52"/>
        <stop offset="100%" stop-color="#140d2e"/></radialGradient>
      <radialGradient id="mn${u}" cx="40%" cy="40%" r="70%">
        <stop offset="0%" stop-color="#fff6c7"/><stop offset="100%" stop-color="#ffd95e"/>
      </radialGradient></defs>
      <rect width="400" height="300" fill="url(#nk${u})"/>`;
    if (o.moon !== false) {
      const mx = o.moonX || 320, my = o.moonY || 58, mr = o.moonR || 34;
      s += `<circle cx="${mx}" cy="${my}" r="${mr + 9}" fill="#ffe98a" opacity=".16"/>
            <circle cx="${mx}" cy="${my}" r="${mr}" fill="url(#mn${u})"/>
            <circle cx="${mx - 11}" cy="${my - 7}" r="5" fill="#f0c44a" opacity=".5"/>
            <circle cx="${mx + 9}" cy="${my + 6}" r="6" fill="#f0c44a" opacity=".4"/>`;
    }
    const pts = [[40,40],[90,80],[150,30],[210,60],[60,130],[260,42],[110,150],[300,120],[30,90],[185,108],[350,170],[140,200]];
    pts.forEach((p, i) => s += star(p[0], p[1], i % 2 ? 6 : 9));
    if (o.ground !== false) {
      s += `<path d="M0 250 Q 100 230 200 248 T 400 244 V300 H0Z" fill="#1b1140"/>
            <path d="M0 262 Q 120 248 240 262 T 400 258 V300 H0Z" fill="#241854"/>`;
    }
    return s;
  }

  // leafy forest: sky strip + layered trees + grassy floor
  function forest(o) {
    o = o || {};
    const u = uid();
    return `<defs><linearGradient id="fr${u}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#bff0d8"/><stop offset="100%" stop-color="#e9fff2"/>
      </linearGradient></defs>
      <rect width="400" height="300" fill="url(#fr${u})"/>
      <rect y="200" width="400" height="100" fill="#cdebab"/>
      <path d="M0 210 Q 200 188 400 210 V300 H0Z" fill="#a7da78"/>
      ${tree(60, 210, 1.15, "#2f9e57")}${tree(330, 206, 1.3, "#268a4c")}
      ${tree(150, 200, .8, "#3bb36a")}${tree(250, 202, .9, "#2f9e57")}
      ${mushroom(110, 252)}${mushroom(300, 258, "#ffd166")}`;
  }

  // rocky cave / mine interior
  function cave(o) {
    o = o || {};
    const u = uid();
    let s = `<defs><radialGradient id="cv${u}" cx="50%" cy="55%" r="75%">
        <stop offset="0%" stop-color="#5a4a73"/><stop offset="100%" stop-color="#241a38"/>
      </radialGradient></defs>
      <rect width="400" height="300" fill="url(#cv${u})"/>`;
    // stalactites top
    for (let i = 0; i < 7; i++) {
      const x = 20 + i * 58, h = 18 + (i % 3) * 14;
      s += `<path d="M${x} 0 l14 0 l-7 ${h} Z" fill="#352847"/>`;
    }
    // rocky floor
    s += `<path d="M0 248 Q 80 230 160 246 T 320 244 T 400 250 V300 H0Z" fill="#2c2140"/>
          <path d="M0 266 L400 262 V300 H0Z" fill="#1e1630"/>`;
    return s;
  }

  // underwater sea
  function sea(o) {
    o = o || {};
    const u = uid();
    let s = `<defs><linearGradient id="se${u}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4fc3f7"/><stop offset="60%" stop-color="#2a86c9"/>
        <stop offset="100%" stop-color="#155a92"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#se${u})"/>
      <path d="M0 40 Q 100 70 200 45 T 400 50" stroke="#bfeaff" stroke-width="3" fill="none" opacity=".4"/>`;
    // light rays
    s += `<path d="M120 0 L60 300 L120 300 L170 0Z" fill="#bfeaff" opacity=".08"/>
          <path d="M250 0 L300 300 L360 300 L300 0Z" fill="#bfeaff" opacity=".08"/>`;
    // bubbles
    [[60,90,5],[80,140,3],[330,80,6],[310,130,3],[200,70,4]].forEach(b =>
      s += `<circle cx="${b[0]}" cy="${b[1]}" r="${b[2]}" fill="#dff6ff" opacity=".5"/>`);
    // sandy floor + seaweed
    s += `<path d="M0 258 Q 100 240 200 256 T 400 252 V300 H0Z" fill="#f0dca0"/>
          ${seaweed(50, 258)}${seaweed(360, 252, "#2fae6b")}${seaweed(150, 256, "#37c97c")}`;
    return s;
  }

  // outer space with planets
  function space(o) {
    o = o || {};
    const u = uid();
    let s = `<defs><radialGradient id="sp${u}" cx="50%" cy="40%" r="90%">
        <stop offset="0%" stop-color="#241b54"/><stop offset="100%" stop-color="#0a0820"/>
      </radialGradient></defs><rect width="400" height="300" fill="url(#sp${u})"/>`;
    const pts = [[40,40],[90,90],[150,30],[210,70],[60,150],[260,40],[330,120],[300,210],[30,210],[185,200],[360,60],[120,250]];
    pts.forEach((p, i) => s += star(p[0], p[1], i % 2 ? 5 : 8));
    return s;
  }

  // cosy library / room with bookshelves
  function library(o) {
    o = o || {};
    const u = uid();
    let s = `<defs><linearGradient id="lb${u}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#6b4a2f"/><stop offset="100%" stop-color="#4a3220"/>
      </linearGradient></defs>
      <rect width="400" height="300" fill="#3a2718"/>
      <rect width="400" height="300" fill="url(#lb${u})" opacity=".5"/>`;
    // shelves with books
    for (let row = 0; row < 3; row++) {
      const y = 24 + row * 70;
      s += `<rect x="20" y="${y}" width="360" height="58" rx="4" fill="#2c1d10"/>`;
      let bx = 30;
      const cols = ["#e8584f","#f4a93c","#48b06a","#4a8fe0","#a368d8","#e36fa8","#46c0c0"];
      while (bx < 366) {
        const w = 14 + (bx % 11);
        const h = 40 + (bx % 14);
        s += `<rect x="${bx}" y="${y + 56 - h}" width="${w}" height="${h}" rx="2" fill="${cols[bx % cols.length]}"/>`;
        bx += w + 4;
      }
    }
    s += `<rect y="282" width="400" height="18" fill="#2c1d10"/>`;
    return s;
  }

  // grassy meadow with flowers
  function meadow(o) {
    o = o || {};
    let s = skyDay({ hills: false });
    s += `<rect y="200" width="400" height="100" fill="#86d562"/>
          <path d="M0 206 Q 200 186 400 206 V300 H0Z" fill="#6cc24a"/>`;
    [[40,250,"#ff5d8f"],[110,270,"#ffd166"],[200,256,"#8a5cff"],[280,272,"#ff5d8f"],[350,252,"#ff8fc0"]]
      .forEach(f => s += flower(f[0], f[1], f[2]));
    return s;
  }

  /* =========================================================
     SMALL SCENERY
     ========================================================= */

  function cloud(x, y, sc) {
    sc = sc || 1;
    return `<g transform="translate(${x} ${y}) scale(${sc})" fill="#ffffff" opacity=".92">
      <ellipse cx="0" cy="0" rx="26" ry="18"/><ellipse cx="22" cy="6" rx="22" ry="15"/>
      <ellipse cx="-22" cy="6" rx="20" ry="14"/><rect x="-40" y="4" width="84" height="14" rx="7"/></g>`;
  }

  function star(x, y, size) {
    const r = size / 2;
    return `<path transform="translate(${x} ${y})"
      d="M0 ${-r} L ${r*.3} ${-r*.3} L ${r} 0 L ${r*.3} ${r*.3} L 0 ${r} L ${-r*.3} ${r*.3} L ${-r} 0 L ${-r*.3} ${-r*.3} Z"
      fill="#fff3b0" opacity=".95"/>`;
  }

  function tree(x, y, sc, col) {
    sc = sc || 1; col = col || "#2f9e57";
    return `<g transform="translate(${x} ${y}) scale(${sc})">
      <rect x="-9" y="-30" width="18" height="46" rx="5" fill="#8a5a33"/>
      <circle cx="0" cy="-54" r="34" fill="${col}"/>
      <circle cx="-26" cy="-40" r="24" fill="${shade(col, 12)}"/>
      <circle cx="26" cy="-40" r="24" fill="${shade(col, -8)}"/>
      <circle cx="0" cy="-30" r="26" fill="${col}"/></g>`;
  }

  function mushroom(x, y, cap) {
    cap = cap || "#e8584f";
    return `<g transform="translate(${x} ${y})">
      <rect x="-7" y="-10" width="14" height="18" rx="6" fill="#fff4e0"/>
      <path d="M-18 -8 Q0 -30 18 -8 Z" fill="${cap}"/>
      <circle cx="-7" cy="-13" r="3" fill="#fff" opacity=".85"/>
      <circle cx="6" cy="-11" r="2.4" fill="#fff" opacity=".85"/></g>`;
  }

  function flower(x, y, col) {
    col = col || "#ff5d8f";
    let p = `<g transform="translate(${x} ${y})"><rect x="-2" y="0" width="4" height="22" fill="#3ba24a"/>`;
    for (let i = 0; i < 6; i++) {
      p += `<ellipse cx="0" cy="-9" rx="5" ry="9" fill="${col}" transform="rotate(${i*60})"/>`;
    }
    p += `<circle cx="0" cy="0" r="5" fill="#ffd166"/></g>`;
    return p;
  }

  function seaweed(x, y, col) {
    col = col || "#37a85e";
    return `<path transform="translate(${x} ${y})" d="M0 0 q -10 -18 0 -34 q 10 -16 0 -34"
      stroke="${col}" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  }

  // a storybook castle
  function castle(x, y, sc) {
    sc = sc || 1;
    return `<g transform="translate(${x} ${y}) scale(${sc})">
      <g fill="#e7d6ff"><rect x="-70" y="-70" width="140" height="80"/>
      <rect x="-92" y="-92" width="32" height="102"/><rect x="60" y="-92" width="32" height="102"/>
      <rect x="-18" y="-112" width="36" height="122"/></g>
      <g fill="#c89bff"><path d="M-92 -92 l16 -22 l16 22Z"/><path d="M60 -92 l16 -22 l16 22Z"/>
      <path d="M-18 -112 l18 -24 l18 24Z"/></g>
      <g fill="#ffd166"><rect x="-82" y="-72" width="12" height="16" rx="2"/>
      <rect x="70" y="-72" width="12" height="16" rx="2"/><rect x="-7" y="-94" width="14" height="18" rx="3"/></g>
      <path d="M-12 10 v-30 a12 12 0 0 1 24 0 v30Z" fill="#7a52b0"/>
      <g fill="#ff8fc0"><circle cx="-76" cy="-114" r="3"/><circle cx="76" cy="-114" r="3"/><circle cx="0" cy="-138" r="3"/></g></g>`;
  }

  /* =========================================================
     CHARACTERS — kids
     o = {x, y, scale, dress|shirt, hair, skin, crown, mood}
     ========================================================= */

  function eyes(mood) {
    // returns eye + mouth markup centred at head origin
    if (mood === "happy")
      return `<circle cx="-5.5" cy="-58" r="2.1" fill="#2b2440"/><circle cx="5.5" cy="-58" r="2.1" fill="#2b2440"/>
              <path d="M-6 -50 q6 7 12 0" stroke="#a8324f" stroke-width="2.4" fill="none" stroke-linecap="round"/>
              <circle cx="-10" cy="-52" r="3" fill="#ff9ab0" opacity=".6"/><circle cx="10" cy="-52" r="3" fill="#ff9ab0" opacity=".6"/>`;
    if (mood === "surprised")
      return `<circle cx="-5.5" cy="-58" r="2.6" fill="#2b2440"/><circle cx="5.5" cy="-58" r="2.6" fill="#2b2440"/>
              <ellipse cx="0" cy="-50" rx="3" ry="4" fill="#a8324f"/>`;
    return `<circle cx="-5.5" cy="-58" r="2.1" fill="#2b2440"/><circle cx="5.5" cy="-58" r="2.1" fill="#2b2440"/>
            <path d="M-5 -50 q5 5 10 0" stroke="#a8324f" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  }

  // a princess / girl in a dress
  function princess(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const dress = o.dress || "#ff5d8f";
    const dress2 = shade(dress, -18);
    const hair = o.hair || "#5a3a22";
    const skin = o.skin || "#ffd9b8";
    const crown = o.crown !== false;
    return `<g transform="translate(${x} ${y}) scale(${sc})">
      <ellipse cx="0" cy="6" rx="30" ry="7" fill="#000" opacity=".15"/>
      <path d="M0 -44 C 18 -40 26 -10 30 4 Q 0 12 -30 4 C -26 -10 -18 -40 0 -44 Z" fill="${dress}"/>
      <path d="M0 -44 C 10 -40 14 -10 0 4 Q 0 8 0 4 Z" fill="${dress2}" opacity=".4"/>
      <circle cx="-26" cy="-22" r="6" fill="${skin}"/><circle cx="26" cy="-22" r="6" fill="${skin}"/>
      <circle cx="0" cy="-58" r="15" fill="${skin}"/>
      <path d="M-15 -60 a15 15 0 0 1 30 0 q -15 -16 -30 0 Z" fill="${hair}"/>
      <path d="M-15 -58 q -6 18 -2 30 q -9 -4 -9 -22 Z" fill="${hair}"/>
      <path d="M15 -58 q 6 18 2 30 q 9 -4 9 -22 Z" fill="${hair}"/>
      ${eyes(o.mood || "happy")}
      ${crown ? `<path d="M-12 -70 l4 8 l8 -6 l8 6 l4 -8 l-2 10 h-20 Z" fill="#ffd166" stroke="#e6b800" stroke-width="1"/>
        <circle cx="0" cy="-74" r="2" fill="#ff5d8f"/>` : ""}</g>`;
  }

  // a boy / kid in a shirt + trousers
  function boy(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const shirt = o.shirt || "#4a8fe0";
    const hair = o.hair || "#3a2a1a";
    const skin = o.skin || "#f0c79a";
    const pants = o.pants || "#3a4a6b";
    return `<g transform="translate(${x} ${y}) scale(${sc})">
      <ellipse cx="0" cy="8" rx="26" ry="6" fill="#000" opacity=".15"/>
      <rect x="-8" y="-8" width="7" height="18" rx="3" fill="${pants}"/><rect x="1" y="-8" width="7" height="18" rx="3" fill="${pants}"/>
      <path d="M-16 -42 q16 -8 32 0 l3 36 q-19 7 -38 0 Z" fill="${shirt}"/>
      <circle cx="-18" cy="-30" r="5.5" fill="${skin}"/><circle cx="18" cy="-30" r="5.5" fill="${skin}"/>
      <circle cx="0" cy="-56" r="14" fill="${skin}"/>
      <path d="M-14 -58 a14 14 0 0 1 28 0 q-4 -8 -14 -8 q-10 0 -14 8 Z" fill="${hair}"/>
      <g transform="translate(0 2)">${eyes(o.mood || "happy")}</g></g>`;
  }

  // a swaddled baby (Kieran)
  function baby(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const wrap = o.wrap || "#bfe3ff", skin = o.skin || "#ffd9b8";
    return `<g transform="translate(${x} ${y}) scale(${sc})">
      <ellipse cx="0" cy="10" rx="22" ry="5" fill="#000" opacity=".12"/>
      <path d="M-18 6 q18 -22 36 0 q-18 10 -36 0Z" fill="${wrap}"/>
      <circle cx="0" cy="-12" r="13" fill="${skin}"/>
      <path d="M-13 -16 a13 13 0 0 1 26 0 q-13 -10 -26 0Z" fill="#6a4a2a"/>
      <circle cx="-4.5" cy="-12" r="1.8" fill="#2b2440"/><circle cx="4.5" cy="-12" r="1.8" fill="#2b2440"/>
      <path d="M-3 -6 q3 3 6 0" stroke="#a8324f" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <circle cx="-8" cy="-8" r="2.4" fill="#ff9ab0" opacity=".6"/><circle cx="8" cy="-8" r="2.4" fill="#ff9ab0" opacity=".6"/></g>`;
  }

  /* =========================================================
     CHARACTERS — creatures
     ========================================================= */

  // a cute dragon. o = {x,y,scale,color,mood}
  function dragon(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const col = o.color || "#7ed957", belly = shade(col, 30), wing = shade(col, -18);
    return `<g transform="translate(${x} ${y}) scale(${sc})">
      <ellipse cx="0" cy="20" rx="34" ry="8" fill="#000" opacity=".15"/>
      <path d="M-34 6 q-30 -6 -44 -26 q22 6 30 16 q-4 -16 4 -26 q10 14 12 30Z" fill="${wing}"/>
      <ellipse cx="0" cy="2" rx="32" ry="26" fill="${col}"/>
      <ellipse cx="0" cy="8" rx="18" ry="16" fill="${belly}"/>
      <path d="M40 6 q26 -4 30 14 q-4 -2 -10 -2 q4 8 -2 14 q-6 -4 -8 -10 q-8 6 -16 0Z" fill="${col}"/>
      <ellipse cx="20" cy="-30" rx="20" ry="18" fill="${col}"/>
      <path d="M8 -44 l-4 -12 l10 6Z" fill="${wing}"/><path d="M30 -46 l6 -12 l4 12Z" fill="${wing}"/>
      <circle cx="14" cy="-32" r="3" fill="#2b2440"/><circle cx="28" cy="-32" r="3" fill="#2b2440"/>
      <circle cx="15" cy="-33" r="1" fill="#fff"/><circle cx="29" cy="-33" r="1" fill="#fff"/>
      <ellipse cx="34" cy="-24" rx="6" ry="4" fill="${belly}"/>
      <circle cx="33" cy="-25" r="1.2" fill="#2b2440"/><circle cx="37" cy="-24" r="1.2" fill="#2b2440"/>
      ${o.mood === "sad"
        ? `<path d="M18 -20 q4 3 8 0" stroke="#2b2440" stroke-width="1.6" fill="none"/>`
        : `<path d="M18 -22 q4 4 8 0" stroke="#2b2440" stroke-width="1.6" fill="none" stroke-linecap="round"/>`}
      <path d="M6 -48 q2 -8 -2 -12 M20 -50 q0 -9 -3 -13 M34 -48 q3 -7 1 -12"
        stroke="${wing}" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;
  }

  // a friendly puppy. o = {x,y,scale,color}
  function puppy(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const c = o.color || "#c98a4a", c2 = shade(c, -18);
    return `<g transform="translate(${x} ${y}) scale(${sc})">
      <ellipse cx="0" cy="16" rx="26" ry="6" fill="#000" opacity=".15"/>
      <ellipse cx="0" cy="2" rx="24" ry="16" fill="${c}"/>
      <rect x="-16" y="8" width="6" height="12" rx="3" fill="${c}"/><rect x="10" y="8" width="6" height="12" rx="3" fill="${c}"/>
      <path d="M22 0 q14 -6 16 4 q-8 0 -12 6Z" fill="${c}"/>
      <circle cx="-18" cy="-12" r="15" fill="${c}"/>
      <path d="M-30 -20 q-6 12 4 16 q4 -8 2 -16Z" fill="${c2}"/>
      <path d="M-8 -22 q8 8 -2 16 q-6 -6 -2 -16Z" fill="${c2}"/>
      <circle cx="-23" cy="-12" r="2.2" fill="#2b2440"/><circle cx="-13" cy="-12" r="2.2" fill="#2b2440"/>
      <ellipse cx="-18" cy="-5" rx="3" ry="2.4" fill="#2b2440"/>
      <path d="M-18 -3 q0 4 4 4" stroke="#2b2440" stroke-width="1.4" fill="none"/></g>`;
  }

  // a fox
  function fox(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    return `<g transform="translate(${x} ${y}) scale(${sc})">
      <ellipse cx="0" cy="16" rx="24" ry="6" fill="#000" opacity=".15"/>
      <ellipse cx="0" cy="2" rx="22" ry="14" fill="#ef8a3c"/>
      <path d="M20 6 q18 -4 22 8 q-12 -2 -18 4Z" fill="#ef8a3c"/><path d="M40 12 q4 2 2 6 q-4 0 -6 -2Z" fill="#fff"/>
      <circle cx="-16" cy="-10" r="14" fill="#ef8a3c"/>
      <path d="M-28 -22 l2 -16 l12 12Z" fill="#ef8a3c"/><path d="M-4 -22 l-2 -16 l-12 12Z" fill="#ef8a3c"/>
      <path d="M-26 -20 l1 -9 l6 6Z" fill="#2b2440"/><path d="M-6 -20 l-1 -9 l-6 6Z" fill="#2b2440"/>
      <path d="M-24 -6 q8 8 16 0 l-8 6Z" fill="#fff"/>
      <circle cx="-21" cy="-10" r="2" fill="#2b2440"/><circle cx="-11" cy="-10" r="2" fill="#2b2440"/>
      <circle cx="-16" cy="-3" r="2.4" fill="#2b2440"/></g>`;
  }

  // a fish. o = {x,y,scale,color}
  function fish(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, c = o.color || "#ff8f3c";
    return `<g transform="translate(${x} ${y}) scale(${sc})">
      <path d="M18 0 l16 -10 v20Z" fill="${shade(c,-12)}"/>
      <ellipse cx="0" cy="0" rx="22" ry="14" fill="${c}"/>
      <path d="M-2 -14 q8 -2 12 4 q-8 0 -12 4Z" fill="${shade(c,18)}"/>
      <circle cx="-12" cy="-3" r="3.4" fill="#fff"/><circle cx="-13" cy="-3" r="1.8" fill="#2b2440"/></g>`;
  }

  // a mermaid (princess top + tail)
  function mermaid(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const tail = o.tail || "#37c97c", hair = o.hair || "#c0392b", skin = o.skin || "#ffd9b8";
    return `<g transform="translate(${x} ${y}) scale(${sc})">
      <path d="M-10 -18 q10 30 -2 46 q-12 -4 -18 4 q6 -14 6 -26 q0 -16 14 -28Z" fill="${tail}"/>
      <path d="M-30 28 q-12 4 -16 -6 q14 -2 16 -10Z" fill="${shade(tail,18)}"/>
      <circle cx="0" cy="-26" r="9" fill="${skin}"/>
      <ellipse cx="0" cy="-12" rx="9" ry="11" fill="${skin}"/>
      <path d="M-9 -28 a9 9 0 0 1 18 0 q-2 18 -10 22 q-8 -6 -8 -22Z" fill="${hair}"/>
      <path d="M-8 -10 q8 4 16 0" stroke="${tail}" stroke-width="3" fill="none"/>
      <circle cx="-3" cy="-26" r="1.4" fill="#2b2440"/><circle cx="3" cy="-26" r="1.4" fill="#2b2440"/>
      <path d="M-2 -22 q2 2 4 0" stroke="#a8324f" stroke-width="1.4" fill="none"/></g>`;
  }

  // an owl on a branch
  function owl(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    return `<g transform="translate(${x} ${y}) scale(${sc})">
      <ellipse cx="0" cy="0" rx="18" ry="22" fill="#8a6a4a"/>
      <ellipse cx="0" cy="6" rx="12" ry="14" fill="#c9a878"/>
      <path d="M-16 -18 l4 -10 l8 8Z" fill="#8a6a4a"/><path d="M16 -18 l-4 -10 l-8 8Z" fill="#8a6a4a"/>
      <circle cx="-7" cy="-6" r="7" fill="#fff"/><circle cx="7" cy="-6" r="7" fill="#fff"/>
      <circle cx="-7" cy="-6" r="3.4" fill="#2b2440"/><circle cx="7" cy="-6" r="3.4" fill="#2b2440"/>
      <path d="M-3 0 l3 5 l3 -5Z" fill="#ffb142"/></g>`;
  }

  /* =========================================================
     SPACE & VEHICLES
     ========================================================= */

  function rocket(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, c = o.color || "#e8584f";
    return `<g transform="translate(${x} ${y}) scale(${sc})">
      <path d="M0 -46 q18 14 18 40 q0 14 -6 22 h-24 q-6 -8 -6 -22 q0 -26 18 -40Z" fill="#f2f2f2"/>
      <path d="M0 -46 q18 14 18 40 h-18Z" fill="#d8d8d8"/>
      <path d="M0 -46 q6 6 9 16 h-18 q3 -10 9 -16Z" fill="${c}"/>
      <circle cx="0" cy="-8" r="8" fill="#7fd4ff" stroke="#3a7" stroke-width="0"/>
      <circle cx="0" cy="-8" r="8" fill="#7fd4ff"/><circle cx="-2" cy="-10" r="2.5" fill="#fff" opacity=".7"/>
      <path d="M-18 16 q-12 0 -14 16 q12 -4 18 -6Z" fill="${c}"/>
      <path d="M18 16 q12 0 14 16 q-12 -4 -18 -6Z" fill="${c}"/>
      ${o.flame ? `<path d="M-8 16 q8 26 8 26 q0 0 8 -26 q-8 8 -16 0Z" fill="#ffb142"/>
        <path d="M-4 16 q4 16 4 16 q0 0 4 -16 q-4 5 -8 0Z" fill="#ffe066"/>` : ""}</g>`;
  }

  function planet(x, y, r, col, ring) {
    const u = uid();
    let s = `<defs><radialGradient id="pl${u}" cx="38%" cy="35%" r="75%">
        <stop offset="0%" stop-color="${shade(col,30)}"/><stop offset="100%" stop-color="${shade(col,-25)}"/>
      </radialGradient></defs>`;
    if (ring) s += `<ellipse cx="${x}" cy="${y}" rx="${r*1.8}" ry="${r*.5}" fill="none" stroke="${shade(col,20)}" stroke-width="5" opacity=".7"/>`;
    s += `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#pl${u})"/>
      <circle cx="${x - r*.4}" cy="${y - r*.2}" r="${r*.18}" fill="${shade(col,-15)}" opacity=".5"/>
      <circle cx="${x + r*.3}" cy="${y + r*.35}" r="${r*.12}" fill="${shade(col,-15)}" opacity=".5"/>`;
    return s;
  }

  // a smiley alien
  function alien(o) {
    const x = o.x, y = o.y, sc = o.scale || 1, c = o.color || "#9be15d";
    return `<g transform="translate(${x} ${y}) scale(${sc})">
      <ellipse cx="0" cy="14" rx="20" ry="5" fill="#000" opacity=".15"/>
      <ellipse cx="0" cy="0" rx="18" ry="20" fill="${c}"/>
      <path d="M-6 -20 q-2 -8 -8 -10 M6 -20 q2 -8 8 -10" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <circle cx="-14" cy="-22" r="3" fill="${c}"/><circle cx="14" cy="-22" r="3" fill="${c}"/>
      <ellipse cx="-6" cy="-4" rx="5" ry="6" fill="#fff"/><ellipse cx="6" cy="-4" rx="5" ry="6" fill="#fff"/>
      <circle cx="-6" cy="-3" r="2.4" fill="#2b2440"/><circle cx="6" cy="-3" r="2.4" fill="#2b2440"/>
      <path d="M-6 8 q6 5 12 0" stroke="#2b6e3a" stroke-width="2" fill="none" stroke-linecap="round"/></g>`;
  }

  /* =========================================================
     BLOCK WORLD (Minecraft-flavoured) PROPS
     ========================================================= */

  function block(x, y, s, top, side) {
    return `<g transform="translate(${x} ${y})">
      <rect width="${s}" height="${s}" fill="${side}"/>
      <rect width="${s}" height="${s*.28}" fill="${top}"/>
      <rect width="${s}" height="${s}" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="1.5"/></g>`;
  }

  function grassBlocks(y) {
    let s = "";
    for (let x = 0; x < 400; x += 40) s += block(x, y, 40, "#7ed957", "#8a5a33");
    for (let x = 0; x < 400; x += 40) s += block(x, y + 40, 40, "#8a5a33", "#6b4423");
    return s;
  }

  function diamond(x, y, sc) {
    sc = sc || 1;
    return `<g transform="translate(${x} ${y}) scale(${sc})">
      <path d="M0 -12 l10 7 l-10 13 l-10 -13Z" fill="#5ee7e0"/>
      <path d="M0 -12 l10 7 l-10 6Z" fill="#9af6f0"/>
      <path d="M0 -12 l-10 7 l10 6Z" fill="#3fc9c2"/>
      <path d="M-10 -5 l10 6 l-10 13Z" fill="#2fb0a9"/></g>`;
  }

  function pickaxe(x, y, sc) {
    sc = sc || 1;
    return `<g transform="translate(${x} ${y}) scale(${sc})">
      <rect x="-2" y="-2" width="5" height="34" rx="2" fill="#8a5a33" transform="rotate(-20)"/>
      <path d="M-20 -14 q20 -10 40 0 q-10 4 -20 4 q-10 0 -20 -4Z" fill="#9fb3c9" transform="rotate(-20)"/></g>`;
  }

  function torch(x, y) {
    return `<g transform="translate(${x} ${y})">
      <rect x="-2" y="0" width="4" height="20" fill="#8a5a33"/>
      <circle cx="0" cy="-2" r="5" fill="#ffb142"/><circle cx="0" cy="-4" r="2.6" fill="#ffe066"/></g>`;
  }

  // a friendly "fizzer" (creeper-style block creature, kept cute not scary)
  function fizzer(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    return `<g transform="translate(${x} ${y}) scale(${sc})">
      <ellipse cx="0" cy="34" rx="22" ry="5" fill="#000" opacity=".15"/>
      <rect x="-16" y="-30" width="32" height="32" rx="3" fill="#6fc56f"/>
      <rect x="-14" y="0" width="28" height="34" rx="3" fill="#5cb85c"/>
      <rect x="-12" y="-26" width="9" height="9" fill="#2b2440"/><rect x="3" y="-26" width="9" height="9" fill="#2b2440"/>
      <path d="M-5 -16 h10 v8 h-5 v8 h-10 v-8 h5Z" fill="#2b2440"/>
      <rect x="-12" y="6" width="8" height="14" fill="#4aa34a"/><rect x="4" y="6" width="8" height="14" fill="#4aa34a"/></g>`;
  }

  /* =========================================================
     CAMP PROPS
     ========================================================= */

  function tent(x, y, sc, col) {
    sc = sc || 1; col = col || "#e8584f";
    return `<g transform="translate(${x} ${y}) scale(${sc})">
      <path d="M0 -44 l40 56 h-80Z" fill="${col}"/>
      <path d="M0 -44 l-12 56 h-28Z" fill="${shade(col,-15)}"/>
      <path d="M0 -44 l4 56 h-12 l4 -40Z" fill="#3a2718"/>
      <path d="M0 -50 l2 8 h-4Z" fill="#ffd166"/></g>`;
  }

  function campfire(x, y, sc) {
    sc = sc || 1;
    return `<g transform="translate(${x} ${y}) scale(${sc})">
      <rect x="-18" y="6" width="36" height="6" rx="3" fill="#8a5a33" transform="rotate(12)"/>
      <rect x="-18" y="6" width="36" height="6" rx="3" fill="#6b4423" transform="rotate(-12)"/>
      <path d="M0 -26 q12 10 8 22 q-2 8 -8 8 q-6 0 -8 -8 q-4 -12 8 -22Z" fill="#ff8f1f"/>
      <path d="M0 -16 q7 6 4 14 q-4 6 -8 0 q-3 -8 4 -14Z" fill="#ffe066"/></g>`;
  }

  function smore(x, y, sc) {
    sc = sc || 1;
    return `<g transform="translate(${x} ${y}) scale(${sc})">
      <rect x="-16" y="6" width="32" height="8" rx="2" fill="#c98a4a"/>
      <rect x="-15" y="-2" width="30" height="8" rx="2" fill="#5a3a22"/>
      <rect x="-16" y="-10" width="32" height="9" rx="4" fill="#fff4e0"/>
      <rect x="-16" y="-18" width="32" height="8" rx="2" fill="#c98a4a"/></g>`;
  }

  // a big sparkly title gem for covers
  function gem(x, y, sc, col) {
    sc = sc || 1; col = col || "#ff5d8f";
    return `<g transform="translate(${x} ${y}) scale(${sc})">
      <path d="M0 -26 l22 14 l-22 32 l-22 -32Z" fill="${col}"/>
      <path d="M0 -26 l22 14 l-22 14Z" fill="${shade(col,28)}"/>
      <path d="M0 -26 l-22 14 l22 14Z" fill="${shade(col,-12)}"/>
      <path d="M-22 -12 l22 14 l-22 32Z" fill="${shade(col,-25)}"/></g>`;
  }

  /* =========================================================
     EXPORT
     ========================================================= */
  window.ART = {
    uid, shade,
    skyDay, skySunset, night, forest, cave, sea, space, library, meadow,
    cloud, star, tree, mushroom, flower, seaweed, castle,
    princess, boy, baby,
    dragon, puppy, fox, fish, mermaid, owl,
    rocket, planet, alien,
    block, grassBlocks, diamond, pickaxe, torch, fizzer,
    tent, campfire, smore, gem
  };
})();
