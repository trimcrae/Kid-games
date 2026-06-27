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
     EXTRA BACKGROUNDS (for the big stories)
     ========================================================= */
  function snowBg(o) {
    o = o || {}; const u = uid();
    let s = `<defs><linearGradient id="sn${u}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#bfe3ff"/><stop offset="100%" stop-color="#eef9ff"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#sn${u})"/>` + cloud(310, 46, .7) + cloud(120, 40, .5);
    s += `<path d="M0 220 Q 110 196 230 218 T 400 210 V300 H0Z" fill="#dceefc"/>
          <path d="M0 248 Q 120 228 250 250 T 400 244 V300 H0Z" fill="#fff"/>
          <g transform="translate(58 232)"><rect x="-5" y="-8" width="10" height="20" fill="#8a5a33"/>
          <path d="M0 -54 l22 30 h-44Z" fill="#bfe3d0"/><path d="M0 -40 l26 34 h-52Z" fill="#d6f0e3"/></g>`;
    [[40,60],[120,90],[200,50],[300,100],[350,70],[260,140],[80,150]].forEach(p =>
      s += `<circle cx="${p[0]}" cy="${p[1]}" r="2.5" fill="#fff" opacity=".85"/>`);
    return s;
  }
  function plainsBg(o) {
    let s = skyDay({ hills: false });
    s += `<rect y="210" width="400" height="90" fill="#86d562"/>
          <path d="M0 214 Q 200 196 400 214 V300 H0Z" fill="#6cc24a"/>`;
    for (let x = 22; x < 400; x += 46)
      s += `<path d="M${x} 272 q3 -16 0 -22 M${x+5} 272 q1 -14 4 -20 M${x-5} 272 q-1 -14 -4 -20" stroke="#4ea63a" stroke-width="2" fill="none"/>`;
    return s;
  }
  function oceanBg(o) {
    const u = uid();
    return `<defs><linearGradient id="ob${u}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#9fdcff"/><stop offset="45%" stop-color="#d8f3ff"/>
      <stop offset="46%" stop-color="#3a9bd6"/><stop offset="100%" stop-color="#1d6ba6"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#ob${u})"/>` + cloud(300, 50, .8) + cloud(90, 40, .6) +
      `<path d="M0 150 Q 60 142 120 150 T 240 150 T 360 150 T 480 150" stroke="#bfeaff" stroke-width="3" fill="none" opacity=".5"/>
       <path d="M0 178 Q 60 170 120 178 T 240 178 T 360 178" stroke="#bfeaff" stroke-width="3" fill="none" opacity=".4"/>`;
  }
  function skyHighBg(o) {
    const u = uid();
    let s = `<defs><linearGradient id="sh${u}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#7cc6ff"/><stop offset="100%" stop-color="#cdeeff"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#sh${u})"/>`;
    s += cloud(80, 80, 1) + cloud(320, 60, .9) + cloud(200, 180, 1.1) + cloud(60, 230, .7) + cloud(340, 215, .8);
    s += `<g transform="translate(200 235)"><path d="M-60 0 q60 -26 120 0 q-20 40 -60 46 q-40 -6 -60 -46Z" fill="#8a5a33"/>
          <ellipse cx="0" cy="-2" rx="60" ry="14" fill="#7ed957"/></g>`;
    return s;
  }
  function dungeonBg(o) {
    let s = `<rect width="400" height="300" fill="#2a2730"/>`;
    for (let ry = 0; ry < 300; ry += 30)
      for (let cx = 0; cx < 420; cx += 50) {
        const off = (ry / 30) % 2 ? 25 : 0;
        s += `<rect x="${cx - off}" y="${ry}" width="48" height="28" rx="3" fill="#3a3744" stroke="#22202a" stroke-width="2"/>`;
      }
    s += torch(58, 150) + torch(342, 150) + `<rect y="262" width="400" height="38" fill="#22202a"/>`;
    return s;
  }
  function swampBg(o) {
    const u = uid();
    let s = `<defs><linearGradient id="sw${u}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#8a9c72"/><stop offset="100%" stop-color="#4a5a3a"/></linearGradient></defs>
      <rect width="400" height="300" fill="url(#sw${u})"/>
      <path d="M0 240 Q 100 226 200 240 T 400 238 V300 H0Z" fill="#3a4a2e"/>
      <ellipse cx="130" cy="272" rx="90" ry="14" fill="#2f3a26" opacity=".7"/>`;
    s += tree(58, 252, 1, "#3a6b3a") + tree(332, 244, 1.1, "#2f5a2f");
    return s;
  }
  function beachBg(o) {
    let s = skyDay({ hills: false });
    s += `<path d="M0 150 H400 V230 H0Z" fill="#4fc3f7"/>
          <path d="M0 150 Q 100 160 200 150 T 400 150 V162 H0Z" fill="#7fd4ff"/>
          <path d="M0 222 Q 120 206 240 222 T 400 218 V300 H0Z" fill="#f0dca0"/>
          <path d="M0 246 L400 242 V300 H0Z" fill="#e6cf90"/>`;
    return s;
  }
  function desertBg(o) {
    let s = skyDay({ hills: false, clouds: false, top: "#ffd28a", bot: "#ffe9c2" });
    s += `<path d="M0 230 Q 110 200 230 226 T 400 220 V300 H0Z" fill="#e8b86a"/>
          <path d="M0 256 Q 120 234 250 258 T 400 252 V300 H0Z" fill="#d89a4a"/>
          <g transform="translate(330 232)"><rect x="-5" y="-30" width="10" height="40" rx="4" fill="#3a8a4a"/>
          <rect x="-20" y="-18" width="10" height="6" rx="3" fill="#3a8a4a"/><rect x="-20" y="-30" width="6" height="14" rx="3" fill="#3a8a4a"/>
          <rect x="10" y="-22" width="12" height="6" rx="3" fill="#3a8a4a"/><rect x="16" y="-34" width="6" height="16" rx="3" fill="#3a8a4a"/></g>`;
    return s;
  }
  function mountainBg(o) {
    let s = skyDay({ hills: false });
    s += `<path d="M0 250 L90 110 L150 200 L220 90 L300 210 L400 130 V300 H0Z" fill="#9aa7c4"/>
          <path d="M70 138 l20 -28 l20 30 l-20 8Z" fill="#fff"/><path d="M200 118 l20 -28 l22 36 l-22 8Z" fill="#fff"/>
          <path d="M0 252 Q 200 232 400 252 V300 H0Z" fill="#7e8aa6"/>`;
    return s;
  }
  function lavaCaveBg(o) {
    const u = uid();
    let s = cave(o || {});
    s += `<defs><linearGradient id="lv${u}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ff8a1f"/><stop offset="100%" stop-color="#c43a1f"/></linearGradient></defs>
      <path d="M0 272 Q 100 260 200 272 T 400 270 V300 H0Z" fill="url(#lv${u})"/>
      <circle cx="120" cy="282" r="4" fill="#ffd166" opacity=".8"/><circle cx="300" cy="286" r="3" fill="#ffd166" opacity=".8"/>`;
    return s;
  }

  /* =========================================================
     EXTRA PROPS & CHARACTERS
     ========================================================= */
  function chest(o) {
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.scale || 1})">
      <rect x="-22" y="-6" width="44" height="24" rx="3" fill="#8a5a33"/>
      <path d="M-22 -6 q22 -18 44 0Z" fill="#a06a3a"/><rect x="-22" y="2" width="44" height="6" fill="#6b4423"/>
      <rect x="-4" y="-2" width="8" height="12" rx="2" fill="#ffd166"/><circle cx="0" cy="2" r="2" fill="#8a5a33"/></g>`;
  }
  function key(o) {
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.scale || 1})" fill="#ffd166">
      <circle cx="-8" cy="0" r="7"/><circle cx="-8" cy="0" r="3" fill="none" stroke="#c79a2e" stroke-width="2"/>
      <rect x="-2" y="-2.5" width="20" height="5" rx="2"/><rect x="14" y="2" width="4" height="6"/><rect x="8" y="2" width="4" height="6"/></g>`;
  }
  function scroll(o) {
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.scale || 1})">
      <rect x="-16" y="-18" width="32" height="36" rx="2" fill="#f3e6c4"/>
      <rect x="-16" y="-18" width="32" height="4" fill="#d9c79a"/><rect x="-16" y="14" width="32" height="4" fill="#d9c79a"/>
      <path d="M-10 -8 h20 M-10 -2 h20 M-10 4 h14" stroke="#b09a66" stroke-width="1.6"/></g>`;
  }
  function sign(o) {
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.scale || 1})">
      <rect x="-3" y="0" width="6" height="24" fill="#6b4423"/>
      <rect x="-22" y="-22" width="44" height="22" rx="3" fill="#a06a3a" stroke="#6b4423" stroke-width="2"/>
      <path d="M-14 -14 h28 M-14 -8 h20" stroke="#6b4423" stroke-width="2"/></g>`;
  }
  function crystal(o) {
    const c = o.color || "#a368d8";
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.scale || 1})">
      <path d="M0 -22 l8 12 l-8 14 l-8 -14Z" fill="${c}"/>
      <path d="M-12 -6 l6 -8 l4 18Z" fill="${shade(c,-15)}"/><path d="M12 -8 l-6 -6 l-2 16Z" fill="${shade(c,18)}"/></g>`;
  }
  function anvil(o) {
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.scale || 1})" fill="#4a4a55">
      <path d="M-18 -10 h36 v6 l-8 4 h-6 v6 h-4 v-6 h-6 l-8 -4Z"/>
      <rect x="-8" y="6" width="16" height="6"/><rect x="-12" y="12" width="24" height="6" rx="2"/></g>`;
  }
  function coral(o) {
    const c = o.color || "#ff7eb6";
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.scale || 1})">
      <path d="M0 0 q-4 -20 -12 -24 M0 0 q4 -22 12 -26 M0 0 q0 -26 0 -30" stroke="${c}" stroke-width="6" fill="none" stroke-linecap="round"/></g>`;
  }
  function ship(o) {
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.scale || 1})">
      <path d="M-40 0 h80 l-12 22 h-56Z" fill="#6b4423"/><rect x="-42" y="-4" width="84" height="6" rx="3" fill="#8a5a33"/>
      <rect x="-2" y="-58" width="4" height="58" fill="#5a3a22"/>
      <path d="M2 -54 q26 6 24 22 l-24 4Z" fill="#f3e6c4"/><path d="M-2 -50 q-22 6 -20 18 l20 4Z" fill="#e8dcc0"/>
      <path d="M2 -58 l16 4 l-16 4Z" fill="#e8584f"/></g>`;
  }
  function bookGlow(o) {
    const c = o.color || "#ffd166";
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.scale || 1})">
      <circle cx="0" cy="0" r="26" fill="${c}" opacity=".25"/>
      <path d="M-16 -16 h14 v32 h-14Z" fill="${c}"/><path d="M2 -16 h14 v32 h-14Z" fill="${shade(c,-12)}"/>
      <rect x="-2" y="-16" width="4" height="32" fill="#fff" opacity=".5"/>
      <path d="M-12 -10 h8 M-12 -4 h8 M6 -10 h8 M6 -4 h8" stroke="#fff" stroke-width="1.4" opacity=".6"/></g>`;
  }
  function portal(o) {
    const c = o.color || "#a368d8", u = uid();
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.scale || 1})">
      <defs><radialGradient id="po${u}"><stop offset="0%" stop-color="#fff"/>
      <stop offset="40%" stop-color="${shade(c,20)}"/><stop offset="100%" stop-color="${shade(c,-30)}"/></radialGradient></defs>
      <ellipse cx="0" cy="0" rx="34" ry="48" fill="url(#po${u})"/>
      <ellipse cx="0" cy="0" rx="34" ry="48" fill="none" stroke="${shade(c,30)}" stroke-width="4"/>
      <ellipse cx="-6" cy="-8" rx="14" ry="22" fill="#fff" opacity=".25"/></g>`;
  }
  function sword(o) {
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.scale || 1})">
      <path d="M0 -28 l5 5 v26 h-10 v-26Z" fill="#cfd8e3"/>
      <rect x="-10" y="3" width="20" height="5" rx="2" fill="#8a5a33"/><rect x="-3" y="8" width="6" height="12" rx="2" fill="#6b4423"/></g>`;
  }
  function shield(o) {
    const c = o.color || "#e8584f";
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.scale || 1})">
      <path d="M0 -22 q16 -6 20 2 q0 26 -20 40 q-20 -14 -20 -40 q4 -8 20 -2Z" fill="${c}"/>
      <path d="M0 -16 v44 M-16 -4 h32" stroke="#fff" stroke-width="3" opacity=".8"/></g>`;
  }
  function sheep(o) {
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.scale || 1})">
      <ellipse cx="0" cy="14" rx="22" ry="5" fill="#000" opacity=".12"/>
      <circle cx="-10" cy="0" r="10" fill="#f2f2f2"/><circle cx="6" cy="-4" r="11" fill="#f2f2f2"/>
      <circle cx="10" cy="6" r="10" fill="#f2f2f2"/><circle cx="-6" cy="8" r="10" fill="#f2f2f2"/><circle cx="4" cy="2" r="12" fill="#fafafa"/>
      <circle cx="16" cy="-2" r="7" fill="#33323a"/><rect x="14" y="3" width="3" height="8" fill="#33323a"/><rect x="20" y="3" width="3" height="8" fill="#33323a"/>
      <circle cx="18" cy="-4" r="1.4" fill="#fff"/></g>`;
  }
  function dolphin(o) {
    const c = o.color || "#6fb7d9";
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.scale || 1})">
      <path d="M-30 0 q10 -20 40 -18 q14 0 22 -8 q-2 12 -12 16 q8 6 10 16 q-14 -8 -22 -6 q-26 4 -38 0Z" fill="${c}"/>
      <path d="M-2 -14 q8 -10 16 -8 q-4 8 -10 10Z" fill="${shade(c,-12)}"/>
      <circle cx="20" cy="-6" r="2" fill="#2b2440"/><path d="M-30 0 q-8 -4 -12 -2 q4 6 12 6Z" fill="${shade(c,10)}"/></g>`;
  }
  function dino(o) {
    const c = o.color || "#7ec850";
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.scale || 1})">
      <ellipse cx="0" cy="18" rx="30" ry="6" fill="#000" opacity=".12"/>
      <ellipse cx="0" cy="0" rx="26" ry="16" fill="${c}"/>
      <path d="M18 -6 q14 -28 26 -30 q6 0 4 8 q-10 4 -16 26Z" fill="${c}"/>
      <circle cx="44" cy="-30" r="8" fill="${c}"/><circle cx="46" cy="-32" r="1.6" fill="#2b2440"/>
      <path d="M-22 0 q-18 -2 -24 6 q10 2 24 2Z" fill="${c}"/>
      <rect x="-14" y="12" width="6" height="12" rx="3" fill="${shade(c,-10)}"/><rect x="6" y="12" width="6" height="12" rx="3" fill="${shade(c,-10)}"/></g>`;
  }
  function snowman(o) {
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.scale || 1})">
      <circle cx="0" cy="10" r="16" fill="#fff"/><circle cx="0" cy="-12" r="11" fill="#fff"/>
      <circle cx="-4" cy="-14" r="1.6" fill="#2b2440"/><circle cx="4" cy="-14" r="1.6" fill="#2b2440"/>
      <path d="M0 -12 l8 2 l-8 2Z" fill="#ff8f1f"/><circle cx="0" cy="2" r="1.6" fill="#2b2440"/><circle cx="0" cy="10" r="1.6" fill="#2b2440"/>
      <rect x="-12" y="-26" width="24" height="4" fill="#e8584f"/><rect x="-7" y="-40" width="14" height="16" fill="#33323a"/></g>`;
  }
  function bird(o) {
    const c = o.color || "#ffd166";
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.scale || 1})">
      <ellipse cx="0" cy="0" rx="12" ry="9" fill="${c}"/><circle cx="9" cy="-3" r="6" fill="${c}"/>
      <path d="M14 -3 l6 -1 l-6 3Z" fill="#ff8f1f"/><circle cx="10" cy="-4" r="1.4" fill="#2b2440"/>
      <path d="M-2 0 q-10 -4 -14 2 q8 4 14 0Z" fill="${shade(c,-12)}"/></g>`;
  }
  function crab(o) {
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.scale || 1})">
      <ellipse cx="0" cy="0" rx="16" ry="11" fill="#e8584f"/>
      <circle cx="-6" cy="-8" r="2" fill="#2b2440"/><circle cx="6" cy="-8" r="2" fill="#2b2440"/>
      <path d="M-16 0 q-10 -4 -10 -10 q6 2 8 6 M16 0 q10 -4 10 -10 q-6 2 -8 6" stroke="#e8584f" stroke-width="4" fill="none"/>
      <path d="M-14 6 l-8 4 M-12 9 l-8 6 M14 6 l8 4 M12 9 l8 6" stroke="#e8584f" stroke-width="3"/></g>`;
  }
  function ghost(o) {
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.scale || 1})">
      <path d="M0 -22 q-20 0 -20 22 v18 l5 -6 l5 6 l5 -6 l5 6 l5 -6 v-18 q0 -22 -20 -22Z" fill="#eef4ff" opacity=".92"/>
      <circle cx="-6" cy="-6" r="3" fill="#2b2440"/><circle cx="6" cy="-6" r="3" fill="#2b2440"/>
      <path d="M-4 4 q4 4 8 0" stroke="#7a90b5" stroke-width="2" fill="none"/></g>`;
  }
  function knight(o) {
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.scale || 1})">` +
      boy({ x: 0, y: 0, shirt: o.shirt || "#9fb3c9", pants: "#5a6473" }) +
      `<path d="M-13 -60 a13 13 0 0 1 26 0 v3 h-26Z" fill="#c2ccd6"/><rect x="-3" y="-66" width="6" height="10" fill="#9aa6b3"/>
       <path d="M-9 -54 h18 v3 h-18Z" fill="#8a96a3"/>
       <ellipse cx="-24" cy="-24" rx="7" ry="10" fill="#e8584f"/><path d="M-24 -32 v16 M-30 -24 h12" stroke="#fff" stroke-width="2"/></g>`;
  }
  function wizard(o) {
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.scale || 1})">` +
      boy({ x: 0, y: 0, shirt: o.shirt || "#5e3bb0", pants: "#3a2566" }) +
      `<path d="M0 -90 l16 26 h-32Z" fill="${o.hat || "#4a2d8a"}"/><circle cx="0" cy="-90" r="3" fill="#ffd166"/>
       <path d="M-4 -72 l1 -4 l1 4 l4 1 l-4 1 l-1 4 l-1 -4 l-4 -1Z" fill="#ffd166"/>
       <rect x="20" y="-44" width="4" height="54" rx="2" fill="#8a5a33"/><circle cx="22" cy="-46" r="9" fill="#7fd4ff" opacity=".3"/><circle cx="22" cy="-46" r="6" fill="#7fd4ff"/></g>`;
  }
  function pirate(o) {
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.scale || 1})">` +
      boy({ x: 0, y: 0, shirt: o.shirt || "#c0392b", pants: "#3a2718" }) +
      `<path d="M-16 -64 q16 -9 32 0 q-5 -9 -16 -9 q-11 0 -16 9Z" fill="#2b2440"/><circle cx="0" cy="-69" r="2.4" fill="#fff"/>
       <path d="M-10 -58 h8 l-1 5 h-7Z" fill="#2b2440"/></g>`;
  }
  function villager(o) {
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.scale || 1})">` +
      boy({ x: 0, y: 0, shirt: o.shirt || "#7a6b4a", pants: "#5a4a33" }) +
      `<ellipse cx="2" cy="-52" rx="4" ry="6" fill="#d9a066"/></g>`;
  }

  function beacon(o) {
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.scale || 1})">
      <rect x="-4" y="-150" width="8" height="150" fill="#bff0ff" opacity=".45"/>
      <rect x="-9" y="-40" width="18" height="40" fill="#7fd4ff" opacity=".55"/>
      <rect x="-16" y="-6" width="32" height="22" fill="#9fb3c9"/><rect x="-16" y="-6" width="32" height="6" fill="#cfe3f0"/>
      <rect x="-16" y="-6" width="32" height="22" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="1.5"/>
      <circle cx="0" cy="-4" r="6" fill="#eafdff"/></g>`;
  }
  function mountainProp(o) {
    return `<g transform="translate(${o.x} ${o.y}) scale(${o.scale || 1})">
      <path d="M-44 0 L0 -56 L44 0Z" fill="#9aa7c4"/><path d="M-15 -19 l15 -21 l15 21 l-15 8Z" fill="#fff"/></g>`;
  }

  /* =========================================================
     SCENE COMPOSER — build a picture from a data descriptor:
       { bg:"forest", bgOpts:{}, props:[ ["boy",{x,y,scale}], ... ], extra:"<svg…>" }
     This lets the long stories be authored as pure data.
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
    (d.props || []).forEach(p => {
      const f = ACTOR[p[0]];
      if (f) { try { s += f(p[1] || {}); } catch (e) {} }
    });
    if (d.extra) s += d.extra;
    return s;
  }
  // names exposed so the validator/tools can check authored scenes
  scene.backgrounds = Object.keys(BG);
  scene.actors = Object.keys(ACTOR);

  /* =========================================================
     EXPORT
     ========================================================= */
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
