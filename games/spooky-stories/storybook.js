/* ===========================================================
   Spooky Princess Stories — a read-aloud, tap-to-play storybook
   for Ellie (3) and her siblings.

   What it teaches: listening & early literacy (hear words read
   aloud while seeing the picture), story sequencing (turning the
   page), and cause-and-effect (tap a character → it reacts).

   Friendly-spooky only: giggly ghosts, sweet bats, glowing
   pumpkins — nothing scary. Pure HTML/CSS/vanilla JS, no assets:
   every illustration is smooth vector art drawn with inline SVG —
   gradient night skies, glowing moons and gentle SMIL animation.
   =========================================================== */

(function () {
  "use strict";

  /* -----------------------------------------------------------
     1. SVG illustration toolkit
     Smooth, modern vector art: layered gradients for the night
     sky, bézier curves for hills & characters, soft glow filters
     on moons and lanterns, and a few gentle SMIL animations
     (twinkling stars, drifting fog, flickering pumpkin light).
     Reusable little drawings, composed into full scenes.
     Coordinate space for every scene: 0 0 400 300.
     ----------------------------------------------------------- */

  // unique-id counter so gradients/filters never collide between the
  // many SVGs that coexist in the page (covers + the live reader scene).
  let UID = 0;
  function uid(name) { return "ss-" + name + "-" + (++UID); }

  // A soft glow filter: blurred copy merged underneath the original.
  function glowFilter(id, blur) {
    return `<filter id="${id}" x="-80%" y="-80%" width="260%" height="260%">` +
      `<feGaussianBlur stdDeviation="${blur}" result="b"/>` +
      `<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  }

  // A deep-night background: gradient sky, glowing moon, twinkling
  // stars, rolling hills and a wisp of slowly drifting fog.
  function nightBg(opts) {
    opts = opts || {};
    const stars = opts.stars !== false;
    const moon = opts.moon !== false;
    const sky = uid("sky"), halo = uid("halo"), moonG = uid("moon"),
          hill = uid("hill"), glow = uid("glow"), fog = uid("fog");
    let s =
      `<defs>` +
      `<linearGradient id="${sky}" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="#120a33"/>` +
      `<stop offset="0.5" stop-color="#2a1b5e"/>` +
      `<stop offset="0.85" stop-color="#55276e"/>` +
      `<stop offset="1" stop-color="#63307a"/></linearGradient>` +
      `<radialGradient id="${halo}">` +
      `<stop offset="0" stop-color="#ffe98a" stop-opacity="0.5"/>` +
      `<stop offset="0.55" stop-color="#ffe98a" stop-opacity="0.16"/>` +
      `<stop offset="1" stop-color="#ffe98a" stop-opacity="0"/></radialGradient>` +
      `<radialGradient id="${moonG}" cx="0.38" cy="0.35" r="0.9">` +
      `<stop offset="0" stop-color="#fff8d0"/>` +
      `<stop offset="0.7" stop-color="#ffe07a"/>` +
      `<stop offset="1" stop-color="#f2bf45"/></radialGradient>` +
      `<linearGradient id="${hill}" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="#37236b"/>` +
      `<stop offset="1" stop-color="#1e1147"/></linearGradient>` +
      `<radialGradient id="${fog}">` +
      `<stop offset="0" stop-color="#cfc0ff" stop-opacity="0.16"/>` +
      `<stop offset="1" stop-color="#cfc0ff" stop-opacity="0"/></radialGradient>` +
      glowFilter(glow, 3) +
      `</defs>` +
      `<rect x="0" y="0" width="400" height="300" fill="url(#${sky})"/>`;
    const mx = opts.moonX || 320, my = opts.moonY || 64, mr = opts.moonR || 32;
    if (stars) {
      const pts = [[40,40],[90,80],[150,30],[210,60],[60,130],[260,40],[110,150],[300,120],[30,90],[190,110],[345,150],[370,40]];
      pts.forEach((p, i) => {
        // don't hide sparkles behind the moon
        if (moon && Math.hypot(p[0] - mx, p[1] - my) < mr + 10) return;
        s += star(p[0], p[1], i % 2 ? 5 : 7, i);
      });
    }
    if (moon) {
      s += `<circle cx="${mx}" cy="${my}" r="${mr * 2.4}" fill="url(#${halo})"/>` +
        `<g class="tap hint-bob" data-sound="chime">` +
        `<circle cx="${mx}" cy="${my}" r="${mr}" fill="url(#${moonG})" filter="url(#${glow})"/>` +
        `<circle cx="${(mx - mr * 0.3).toFixed(1)}" cy="${(my - mr * 0.25).toFixed(1)}" r="${(mr * 0.16).toFixed(1)}" fill="#eebc4b" opacity="0.55"/>` +
        `<circle cx="${(mx + mr * 0.28).toFixed(1)}" cy="${(my + mr * 0.1).toFixed(1)}" r="${(mr * 0.11).toFixed(1)}" fill="#eebc4b" opacity="0.5"/>` +
        `<circle cx="${(mx - mr * 0.05).toFixed(1)}" cy="${(my + mr * 0.38).toFixed(1)}" r="${(mr * 0.09).toFixed(1)}" fill="#eebc4b" opacity="0.45"/>` +
        `</g>`;
    }
    if (opts.ground !== false) {
      // far hills (darker) and a nearer, softly lit hill
      s += `<path d="M0 262 C 60 240 130 254 200 246 C 275 238 330 256 400 244 L400 300 L0 300 Z" fill="#1a0f3e"/>` +
        `<path d="M0 280 C 70 262 150 276 235 268 C 305 262 355 274 400 266 L400 300 L0 300 Z" fill="url(#${hill})"/>` +
        // drifting fog
        `<ellipse cx="110" cy="272" rx="95" ry="14" fill="url(#${fog})">` +
        `<animateTransform attributeName="transform" type="translate" values="0 0; 40 -3; 0 0" dur="16s" repeatCount="indefinite"/></ellipse>` +
        `<ellipse cx="300" cy="286" rx="110" ry="15" fill="url(#${fog})">` +
        `<animateTransform attributeName="transform" type="translate" values="0 0; -45 2; 0 0" dur="21s" repeatCount="indefinite"/></ellipse>`;
    }
    return s;
  }

  // A little four-point sparkle; every third one twinkles.
  function star(x, y, size, i) {
    const p = size, q = size * 0.22;
    const tw = i % 3 === 0
      ? `<animate attributeName="opacity" values="1;0.3;1" dur="${(2.2 + (i % 5) * 0.6).toFixed(1)}s" begin="${(i * 0.37).toFixed(2)}s" repeatCount="indefinite"/>`
      : "";
    return `<g transform="translate(${x} ${y})"><g class="tap" data-sound="twinkle">` +
      `<path d="M0 ${-p} Q ${q} ${-q} ${p} 0 Q ${q} ${q} 0 ${p} Q ${-q} ${q} ${-p} 0 Q ${-q} ${-q} 0 ${-p} Z" fill="#fff3b0" opacity="0.95">${tw}</path>` +
      `</g></g>`;
  }

  // A storybook princess castle: smooth towers, pink cone roofs,
  // fluttering flags and warm glowing windows.
  function castle(x, y, scale) {
    scale = scale || 1;
    const wall = uid("wall"), roof = uid("roof"), win = uid("win"), wg = uid("wg");
    let s =
      `<defs>` +
      `<linearGradient id="${wall}" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="#4e3c8e"/><stop offset="1" stop-color="#2e2156"/></linearGradient>` +
      `<linearGradient id="${roof}" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="#ff9ecb"/><stop offset="1" stop-color="#cf5490"/></linearGradient>` +
      `<radialGradient id="${win}" cx="0.5" cy="0.4" r="0.8">` +
      `<stop offset="0" stop-color="#fff6c4"/><stop offset="1" stop-color="#ffc94d"/></radialGradient>` +
      glowFilter(wg, 2.5) +
      `</defs>`;
    // side towers with pink cone roofs and little flags
    [-76, 76].forEach(tx => {
      s += `<rect x="${tx - 14}" y="-64" width="28" height="76" rx="5" fill="url(#${wall})"/>` +
        `<path d="M ${tx - 17} -62 C ${tx - 11} -84 ${tx - 4} -98 ${tx} -106 C ${tx + 4} -98 ${tx + 11} -84 ${tx + 17} -62 Q ${tx} -70 ${tx - 17} -62 Z" fill="url(#${roof})"/>` +
        `<line x1="${tx}" y1="-106" x2="${tx}" y2="-118" stroke="#e8e2ff" stroke-width="1.6"/>` +
        `<path d="M ${tx} -118 L ${tx + 11} -114.5 L ${tx} -111 Z" fill="#ff5d8f"/>`;
    });
    // main keep + rounded battlements
    s += `<rect x="-64" y="-44" width="128" height="56" rx="5" fill="url(#${wall})"/>`;
    for (let mx = -58; mx <= 48; mx += 18) {
      s += `<rect x="${mx}" y="-51" width="10" height="10" rx="2.5" fill="url(#${wall})"/>`;
    }
    // tall centre tower + cone + golden flag
    s += `<rect x="-17" y="-98" width="34" height="110" rx="5" fill="url(#${wall})"/>` +
      `<path d="M -21 -96 C -14 -114 -6 -130 0 -140 C 6 -130 14 -114 21 -96 Q 0 -103 -21 -96 Z" fill="url(#${roof})"/>` +
      `<line x1="0" y1="-140" x2="0" y2="-152" stroke="#e8e2ff" stroke-width="1.6"/>` +
      `<path d="M 0 -152 L 12 -148 L 0 -144 Z" fill="#ffd166"/>`;
    // glowing windows (the tower one gently flickers)
    const wins = [[-82, -52], [70, -52], [-6, -90], [-44, -30], [32, -30]];
    wins.forEach((p, i) => {
      s += `<rect x="${p[0]}" y="${p[1]}" width="12" height="16" rx="6" fill="url(#${win})" filter="url(#${wg})">` +
        (i === 2 ? `<animate attributeName="opacity" values="1;0.72;1" dur="3.4s" repeatCount="indefinite"/>` : "") +
        `</rect>`;
    });
    // arched door with a tiny golden knob
    s += `<path d="M -12 12 L -12 -10 Q 0 -26 12 -10 L 12 12 Z" fill="#1c1038"/>` +
      `<path d="M -12 -10 Q 0 -26 12 -10" fill="none" stroke="#6b49b8" stroke-width="2"/>` +
      `<circle cx="6" cy="-2" r="1.6" fill="#ffd166"/>`;
    return `<g transform="translate(${x} ${y}) scale(${scale})">${s}</g>`;
  }

  // A friendly princess / sibling: soft round face, big sparkly
  // blinking eyes, flowing gradient dress. Feet at y≈+9.
  function kid(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const dress = o.dress || "#b266e0";
    const dress2 = o.dress2 || shade(dress, -30);
    const dressL = shade(dress, 32);
    const hair = o.hair || "#5a3a22";
    const hairL = shade(hair, 26);
    const skin = o.skin || "#ffd9b8";
    const crown = o.crown !== false;
    const sound = o.sound || "giggle";
    const dg = uid("dress");
    let s =
      `<defs><linearGradient id="${dg}" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="${dressL}"/>` +
      `<stop offset="0.55" stop-color="${dress}"/>` +
      `<stop offset="1" stop-color="${dress2}"/></linearGradient></defs>` +
      `<ellipse cx="0" cy="9" rx="24" ry="4.5" fill="#000" opacity="0.25"/>` +
      // hair behind the head (+ long side locks unless it's a boy)
      (o.boy
        ? `<ellipse cx="0" cy="-47" rx="14.5" ry="14" fill="${hair}"/>`
        : `<ellipse cx="0" cy="-45" rx="15.5" ry="16" fill="${hair}"/>` +
          `<path d="M -15 -50 C -18 -40 -17 -31 -12 -26 C -12 -34 -13 -43 -12 -50 Z" fill="${hair}"/>` +
          `<path d="M 15 -50 C 18 -40 17 -31 12 -26 C 12 -34 13 -43 12 -50 Z" fill="${hair}"/>`) +
      `<rect x="-3" y="-37" width="6" height="7" fill="${skin}"/>` +
      // flowing dress + soft centre panel + sparkles
      `<path d="M -6 -32 L 6 -32 C 11 -24 16 -14 21 -2 C 25 5 25 9 21 10 Q 0 15 -21 10 C -25 9 -25 5 -21 -2 C -16 -14 -11 -24 -6 -32 Z" fill="url(#${dg})"/>` +
      `<path d="M -3 -30 C -6 -16 -8 -2 -9 9 Q 0 12 9 9 C 8 -2 6 -16 3 -30 Z" fill="${dressL}" opacity="0.45"/>` +
      `<circle cx="-11" cy="0" r="1" fill="#fff" opacity="0.8"/>` +
      `<circle cx="12" cy="-6" r="1" fill="#fff" opacity="0.7"/>` +
      `<circle cx="4" cy="6" r="1" fill="#fff" opacity="0.75"/>` +
      // arms
      `<path d="M -7 -27 Q -16 -20 -20 -9" stroke="${skin}" stroke-width="5" stroke-linecap="round" fill="none"/>` +
      `<path d="M 7 -27 Q 16 -20 20 -9" stroke="${skin}" stroke-width="5" stroke-linecap="round" fill="none"/>` +
      // face
      `<circle cx="0" cy="-46" r="13" fill="${skin}"/>` +
      `<path d="M -13 -48 C -12 -58 -6 -61 0 -61 C 6 -61 12 -58 13 -48 C 8 -53 4 -54.5 0 -54.5 C -4 -54.5 -8 -53 -13 -48 Z" fill="${hair}"/>` +
      `<path d="M -7.5 -55.5 Q 0 -59 7.5 -55.5" stroke="${hairL}" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.8"/>` +
      `<ellipse cx="-5" cy="-45" rx="2.3" ry="2.9" fill="#2b2440">` +
      `<animate attributeName="ry" values="2.9;2.9;0.4;2.9" keyTimes="0;0.92;0.96;1" dur="4.6s" repeatCount="indefinite"/></ellipse>` +
      `<ellipse cx="5" cy="-45" rx="2.3" ry="2.9" fill="#2b2440">` +
      `<animate attributeName="ry" values="2.9;2.9;0.4;2.9" keyTimes="0;0.92;0.96;1" dur="4.6s" repeatCount="indefinite"/></ellipse>` +
      `<circle cx="-4.2" cy="-46" r="0.9" fill="#fff"/>` +
      `<circle cx="5.8" cy="-46" r="0.9" fill="#fff"/>` +
      `<circle cx="-9" cy="-41" r="2.5" fill="#ff9ec2" opacity="0.55"/>` +
      `<circle cx="9" cy="-41" r="2.5" fill="#ff9ec2" opacity="0.55"/>` +
      `<path d="M -3.5 -39.5 Q 0 -36.2 3.5 -39.5" stroke="#b5466e" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    if (crown) {
      s += `<path d="M -9 -59.5 L -9 -67 L -4.5 -62.5 L 0 -69 L 4.5 -62.5 L 9 -67 L 9 -59.5 Z" fill="#ffdd55"/>` +
        `<circle cx="0" cy="-62" r="1.7" fill="#ff5d8f"/>`;
    }
    return `<g transform="translate(${x} ${y}) scale(${sc})"><g class="tap hint-bob" data-sound="${sound}">` +
      s + `${o.extra || ""}</g></g>`;
  }

  // Friendly ghost (white, giggly): wavy hem, soft aura, big eyes.
  function ghost(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const g1 = uid("ghost"), gf = uid("gglow");
    return `<g transform="translate(${x} ${y}) scale(${sc})"><g class="tap hint-bob" data-sound="giggle">` +
      `<defs><linearGradient id="${g1}" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="#ffffff"/><stop offset="0.75" stop-color="#efeaff"/>` +
      `<stop offset="1" stop-color="#d8d2ff"/></linearGradient>` +
      glowFilter(gf, 4) + `</defs>` +
      `<ellipse cx="0" cy="38" rx="20" ry="4" fill="#000" opacity="0.18"/>` +
      `<path d="M -24 4 C -24 -16 -14 -28 0 -28 C 14 -28 24 -16 24 4 L 24 21 Q 19 31 13 23 Q 7 16 1 24 Q -4 32 -10 24 Q -15 17 -20 25 Q -23 29 -24 22 Z" fill="url(#${g1})" filter="url(#${gf})"/>` +
      // little waving arms
      `<path d="M -23 -6 Q -32 -9 -31 -16 Q -25 -14 -22 -10 Z" fill="#ffffff"/>` +
      `<path d="M 23 -6 Q 32 -9 31 -16 Q 25 -14 22 -10 Z" fill="#ffffff"/>` +
      // face
      `<ellipse cx="-7.5" cy="-9" rx="3" ry="3.9" fill="#2b2440">` +
      `<animate attributeName="ry" values="3.9;3.9;0.5;3.9" keyTimes="0;0.9;0.94;1" dur="5s" repeatCount="indefinite"/></ellipse>` +
      `<ellipse cx="7.5" cy="-9" rx="3" ry="3.9" fill="#2b2440">` +
      `<animate attributeName="ry" values="3.9;3.9;0.5;3.9" keyTimes="0;0.9;0.94;1" dur="5s" repeatCount="indefinite"/></ellipse>` +
      `<circle cx="-6.4" cy="-10.4" r="1.1" fill="#fff"/>` +
      `<circle cx="8.6" cy="-10.4" r="1.1" fill="#fff"/>` +
      `<circle cx="-13" cy="-1" r="2.6" fill="#ffb3d1" opacity="0.75"/>` +
      `<circle cx="13" cy="-1" r="2.6" fill="#ffb3d1" opacity="0.75"/>` +
      `<path d="M -4.5 -1.5 A 4.5 4.5 0 0 0 4.5 -1.5 Z" fill="#7a5ad0"/>` +
      `</g></g>`;
  }

  // A little black cat with green eyes and a swishy tail.
  function cat(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const K = "#2a2440", k = "#3a3158";
    return `<g transform="translate(${x} ${y}) scale(${sc})"><g class="tap hint-bob" data-sound="meow">` +
      `<ellipse cx="0" cy="21" rx="19" ry="3.6" fill="#000" opacity="0.25"/>` +
      // swishing tail
      `<g><animateTransform attributeName="transform" type="rotate" values="0 14 16;9 14 16;0 14 16" dur="4s" repeatCount="indefinite"/>` +
      `<path d="M 13 16 C 24 14 27 2 19 -5" stroke="${K}" stroke-width="5.5" stroke-linecap="round" fill="none"/></g>` +
      // body + chest + paws
      `<path d="M -14 21 C -17 4 -8 -8 0 -8 C 8 -8 17 4 14 21 Q 0 24 -14 21 Z" fill="${K}"/>` +
      `<path d="M -7 21 C -8 10 -4 2 0 0 C 4 2 8 10 7 21 Z" fill="${k}"/>` +
      `<ellipse cx="-6" cy="20" rx="4" ry="2.6" fill="${k}"/>` +
      `<ellipse cx="6" cy="20" rx="4" ry="2.6" fill="${k}"/>` +
      // ears
      `<path d="M -11 -20 Q -15 -30 -13 -33 Q -7 -30 -4 -25 Z" fill="${K}"/>` +
      `<path d="M 11 -20 Q 15 -30 13 -33 Q 7 -30 4 -25 Z" fill="${K}"/>` +
      `<path d="M -10.5 -23 Q -12 -28 -11.5 -29.5 Q -8.5 -27.5 -7.5 -25 Z" fill="#ff9ec2"/>` +
      `<path d="M 10.5 -23 Q 12 -28 11.5 -29.5 Q 8.5 -27.5 7.5 -25 Z" fill="#ff9ec2"/>` +
      // head + face
      `<circle cx="0" cy="-15" r="11.5" fill="${K}"/>` +
      `<ellipse cx="-4.6" cy="-16" rx="2.4" ry="3" fill="#9bff9b">` +
      `<animate attributeName="ry" values="3;3;0.4;3" keyTimes="0;0.9;0.95;1" dur="5.2s" repeatCount="indefinite"/></ellipse>` +
      `<ellipse cx="4.6" cy="-16" rx="2.4" ry="3" fill="#9bff9b">` +
      `<animate attributeName="ry" values="3;3;0.4;3" keyTimes="0;0.9;0.95;1" dur="5.2s" repeatCount="indefinite"/></ellipse>` +
      `<ellipse cx="-4.6" cy="-15.6" rx="0.9" ry="1.9" fill="#1c4526"/>` +
      `<ellipse cx="4.6" cy="-15.6" rx="0.9" ry="1.9" fill="#1c4526"/>` +
      `<circle cx="-4" cy="-17" r="0.7" fill="#fff" opacity="0.9"/>` +
      `<circle cx="5.2" cy="-17" r="0.7" fill="#fff" opacity="0.9"/>` +
      `<path d="M -1.6 -11.5 L 1.6 -11.5 L 0 -9.5 Z" fill="#ff9ec2"/>` +
      `<path d="M 0 -9.5 Q 0 -8 -2.5 -7.5 M 0 -9.5 Q 0 -8 2.5 -7.5" stroke="#6b628f" stroke-width="1" fill="none" stroke-linecap="round"/>` +
      `<path d="M -10 -12 L -18 -13.5 M -10 -9.5 L -17.5 -9 M 10 -12 L 18 -13.5 M 10 -9.5 L 17.5 -9" stroke="#8f86b8" stroke-width="0.9" stroke-linecap="round"/>` +
      `</g></g>`;
  }

  // A small friendly bat with softly flapping scalloped wings.
  function bat(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const col = o.color || "#7a5ad0";
    const dark = shade(col, -26), lite = shade(col, 24);
    return `<g transform="translate(${x} ${y}) scale(${sc})"><g class="tap hint-bob" data-sound="squeak">` +
      // wings (gentle flap)
      `<g><animateTransform attributeName="transform" type="rotate" values="4 -6 0;-10 -6 0;4 -6 0" dur="1.9s" repeatCount="indefinite"/>` +
      `<path d="M -6 2 C -12 -10 -22 -14 -28 -8 C -25 -6 -24 -3 -23 0 C -20 -2 -17 -1 -16 3 C -13 2 -10 3 -7 7 Z" fill="${dark}"/></g>` +
      `<g><animateTransform attributeName="transform" type="rotate" values="-4 6 0;10 6 0;-4 6 0" dur="1.9s" repeatCount="indefinite"/>` +
      `<path d="M 6 2 C 12 -10 22 -14 28 -8 C 25 -6 24 -3 23 0 C 20 -2 17 -1 16 3 C 13 2 10 3 7 7 Z" fill="${dark}"/></g>` +
      // body + ears + head
      `<ellipse cx="0" cy="4" rx="8.5" ry="8" fill="${col}"/>` +
      `<ellipse cx="0" cy="6.5" rx="5" ry="4.5" fill="${lite}" opacity="0.65"/>` +
      `<path d="M -7.5 -9 Q -10 -17 -8 -19 Q -3.5 -15 -2.5 -11 Z" fill="${col}"/>` +
      `<path d="M 7.5 -9 Q 10 -17 8 -19 Q 3.5 -15 2.5 -11 Z" fill="${col}"/>` +
      `<circle cx="0" cy="-5" r="8.5" fill="${col}"/>` +
      // big friendly eyes + smile
      `<circle cx="-3.4" cy="-5.5" r="3" fill="#fff"/>` +
      `<circle cx="3.4" cy="-5.5" r="3" fill="#fff"/>` +
      `<circle cx="-2.8" cy="-5" r="1.5" fill="#2b2440"/>` +
      `<circle cx="4" cy="-5" r="1.5" fill="#2b2440"/>` +
      `<circle cx="-2.4" cy="-5.6" r="0.5" fill="#fff"/>` +
      `<circle cx="4.4" cy="-5.6" r="0.5" fill="#fff"/>` +
      `<path d="M -2.5 0 Q 0 2.2 2.5 0" stroke="#2b2440" stroke-width="1.1" fill="none" stroke-linecap="round"/>` +
      `</g></g>`;
  }

  // A glowing jack-o-lantern (smiley, not scary) with flickering light.
  function pumpkin(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const pg = uid("pump"), fg = uid("pface"), pf = uid("pglow");
    return `<g transform="translate(${x} ${y}) scale(${sc})"><g class="tap hint-bob" data-sound="boing">` +
      `<defs><radialGradient id="${pg}" cx="0.42" cy="0.32" r="0.95">` +
      `<stop offset="0" stop-color="#ffb054"/><stop offset="0.6" stop-color="#ff8c2e"/>` +
      `<stop offset="1" stop-color="#e0640e"/></radialGradient>` +
      `<radialGradient id="${fg}"><stop offset="0" stop-color="#fffbe2"/><stop offset="1" stop-color="#ffe14a"/></radialGradient>` +
      glowFilter(pf, 2) + `</defs>` +
      `<ellipse cx="0" cy="27" rx="24" ry="4" fill="#000" opacity="0.25"/>` +
      // stem + curly vine
      `<path d="M -2 -22 C -4 -32 -1 -38 6 -37 C 3 -33 2 -28 2.5 -22 Z" fill="#5a8a2e"/>` +
      `<path d="M 4 -33 C 10 -39 17 -35 13 -30 C 11 -27 7 -28 8 -31" stroke="#6fa83a" stroke-width="1.7" fill="none" stroke-linecap="round"/>` +
      // body with ridges + soft highlight
      `<ellipse cx="0" cy="2" rx="27" ry="24" fill="url(#${pg})"/>` +
      `<path d="M -10 -20 C -16 -8 -16 12 -10 23" stroke="#d9660a" stroke-width="2" fill="none" opacity="0.5" stroke-linecap="round"/>` +
      `<path d="M 10 -20 C 16 -8 16 12 10 23" stroke="#d9660a" stroke-width="2" fill="none" opacity="0.5" stroke-linecap="round"/>` +
      `<path d="M -19 -14 C -24 -4 -24 10 -19 18" stroke="#d9660a" stroke-width="2" fill="none" opacity="0.4" stroke-linecap="round"/>` +
      `<path d="M 19 -14 C 24 -4 24 10 19 18" stroke="#d9660a" stroke-width="2" fill="none" opacity="0.4" stroke-linecap="round"/>` +
      `<ellipse cx="-9" cy="-11" rx="7" ry="4.5" fill="#ffd9a0" opacity="0.5" transform="rotate(-20 -9 -11)"/>` +
      // glowing carved face (gently flickers)
      `<g filter="url(#${pf})"><animate attributeName="opacity" values="1;0.78;1;0.9;1" dur="2.8s" repeatCount="indefinite"/>` +
      `<path d="M -16 -4 Q -10 -14.5 -4 -4 Q -10 0.5 -16 -4 Z" fill="url(#${fg})" stroke="#b34700" stroke-width="1.2" stroke-opacity="0.55"/>` +
      `<path d="M 16 -4 Q 10 -14.5 4 -4 Q 10 0.5 16 -4 Z" fill="url(#${fg})" stroke="#b34700" stroke-width="1.2" stroke-opacity="0.55"/>` +
      `<path d="M -14.5 4 Q 0 17 14.5 4 C 13.5 12 8 16.5 0 16.5 C -8 16.5 -13.5 12 -14.5 4 Z" fill="url(#${fg})" stroke="#b34700" stroke-width="1.2" stroke-opacity="0.55"/>` +
      `<path d="M -4 7.5 L 2 7.5 L 2 12 Q -1 13 -4 12 Z" fill="#f07a12"/>` +
      `</g></g></g>`;
  }

  // A floppy (friendly) witch hat — costume accessory. Brim at y≈0.
  function witchHat(x, y, sc, col) {
    sc = sc || 1; col = col || "#5b3a93";
    const hg = uid("hat");
    return `<g transform="translate(${x} ${y}) scale(${sc})">` +
      `<defs><linearGradient id="${hg}" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="${shade(col, 26)}"/><stop offset="1" stop-color="${shade(col, -14)}"/></linearGradient></defs>` +
      // bent-tip cone
      `<path d="M -13 1 C -8 -10 -4 -20 -1 -30 C 0 -34 2 -36 5 -37 C 10 -38.5 13 -34 10 -31.5 C 8 -30 5 -31 5 -28 C 8 -19 11 -9 14 1 Q 0 -4 -13 1 Z" fill="url(#${hg})"/>` +
      // golden band + pink gem
      `<path d="M -10.5 -6 Q 0 -10.5 10.5 -6 L 12 -1.5 Q 0 -6.5 -12 -1.5 Z" fill="#ffd166"/>` +
      `<circle cx="0" cy="-6" r="2" fill="#ff5d8f"/>` +
      // brim
      `<ellipse cx="0" cy="1.5" rx="21" ry="5.2" fill="${shade(col, -20)}"/>` +
      `<ellipse cx="0" cy="0.5" rx="21" ry="5" fill="url(#${hg})"/>` +
      `</g>`;
  }

  // lighten/darken a hex colour
  function shade(hex, amt) {
    let c = hex.replace("#", "");
    if (c.length === 3) c = c.split("").map(ch => ch + ch).join("");
    const num = parseInt(c, 16);
    let r = (num >> 16) + amt, g = ((num >> 8) & 255) + amt, b = (num & 255) + amt;
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function svg(inner) {
    return `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;border-radius:20px">${inner}</svg>`;
  }

  // Sibling palette (matches CLAUDE.md: Ellie purple, Jeannie pink, Cory green/blue, Kieran baby)
  const ELLIE  = { dress: "#b266e0", hair: "#6b4a2a" };
  const JEANNIE = { dress: "#ff5d8f", hair: "#8a5a30" };
  const CORY   = { dress: "#3ddc84", hair: "#4a3320", crown: false, boy: true };

  /* -----------------------------------------------------------
     2. The stories
     Each page: { text, art() }  — art returns an inner-SVG string.
     ----------------------------------------------------------- */

  const STORIES = [
    {
      id: "giggly-ghost",
      title: "Ellie & the Giggly Ghost",
      color: "#6a3fb0",
      cover: () => svg(nightBg({moonX:300}) + castle(200, 250, 1) + ghost({x:120,y:150,scale:1})),
      pages: [
        {
          text: "Princess Ellie lived in a sparkly castle on a tall hill.",
          art: () => svg(nightBg({moonX:320}) + castle(200, 255, 1.05))
        },
        {
          text: "Tap-tap-tap! Ellie heard a teeny sound. Who could it be?",
          art: () => svg(nightBg({moon:false}) + castle(310, 250, 0.6) +
            kid(Object.assign({x:150, y:225, scale:1.4}, ELLIE)) +
            ghost({x:255, y:120, scale:0.7}))
        },
        {
          text: "It was a little ghost named Boo! “Boo!” he giggled. Not scary at all!",
          art: () => svg(nightBg({moonX:80}) +
            ghost({x:200, y:170, scale:1.7}))
        },
        {
          text: "Ellie and Boo danced and twirled all around the castle. Wheee!",
          art: () => svg(nightBg({moonX:330}) + castle(330, 255, 0.5) +
            kid(Object.assign({x:150, y:235, scale:1.25}, ELLIE)) +
            ghost({x:255, y:150, scale:1.1}))
        },
        {
          text: "They ate warm cookies, and Boo floated home. Goodnight, Boo!",
          art: () => svg(nightBg({moonX:200, moonY:70, moonR:42}) +
            kid(Object.assign({x:130, y:240, scale:1.1}, ELLIE)) +
            ghost({x:280, y:140, scale:0.9}))
        },
        { end: true, text: "The End. 💜", art: () => endArt("#6a3fb0", [ghost({x:200,y:150,scale:1.4})]) }
      ]
    },

    {
      id: "costume-party",
      title: "The Midnight Costume Party",
      color: "#b8410f",
      cover: () => svg(nightBg({moonX:60}) + castle(310,255,0.55) +
        pumpkin({x:150,y:225,scale:1.5}) + pumpkin({x:255,y:235,scale:1.1})),
      pages: [
        {
          text: "On a spooky-fun night, the whole castle had a costume party!",
          art: () => svg(nightBg({moonX:330}) + castle(200, 255, 0.9) +
            pumpkin({x:80, y:255, scale:1}) + pumpkin({x:320, y:258, scale:0.9}))
        },
        {
          text: "Big sister Jeannie was a friendly witch with a tall, pointy hat.",
          art: () => svg(nightBg({moonX:70}) +
            kid(Object.assign({x:200, y:235, scale:1.7, extra: witchHat(0,-56,1.1)}, JEANNIE, {crown:false})))
        },
        {
          text: "Cory dressed up as a brave green knight. So strong!",
          art: () => svg(nightBg({moonX:330}) +
            kid(Object.assign({x:200, y:235, scale:1.7,
              extra: `<path d="M -12 -52 A 12 12 0 0 1 12 -52 L 12 -49.5 Q 0 -53.5 -12 -49.5 Z" fill="#aeb9c6"/><path d="M -12 -51 Q 0 -55 12 -51" fill="none" stroke="#8d99a6" stroke-width="1.4"/><rect x="-1.8" y="-71" width="3.6" height="9" rx="1.8" fill="#ff5d8f"/>`
            }, CORY)))
        },
        {
          text: "Princess Ellie twirled in purple, and baby Kieran was a tiny pumpkin!",
          art: () => svg(nightBg({moon:false}) +
            kid(Object.assign({x:140, y:235, scale:1.5}, ELLIE)) +
            babyPumpkin(280, 220, 1.1))
        },
        {
          text: "They bobbed for apples and danced with the friendly bats. Squeak!",
          art: () => svg(nightBg({moonX:320}) + castle(330,255,0.45) +
            bat({x:90, y:90, scale:1}) + bat({x:300, y:70, scale:0.8, color:"#9a7ae0"}) +
            kid(Object.assign({x:160, y:240, scale:1.1}, ELLIE)) +
            kid(Object.assign({x:250, y:240, scale:1.1, crown:false}, JEANNIE)))
        },
        {
          text: "What a happy, spooky night for everyone. Time for sleepy dreams.",
          art: () => svg(nightBg({moonX:200, moonY:72, moonR:44}) +
            pumpkin({x:110, y:250, scale:0.9}) + pumpkin({x:300, y:255, scale:0.8}))
        },
        { end: true, text: "The End. 🎃", art: () => endArt("#b8410f", [pumpkin({x:200,y:160,scale:1.6})]) }
      ]
    },

    {
      id: "lost-bat",
      title: "Ellie & the Lost Little Bat",
      color: "#3a5fb0",
      cover: () => svg(nightBg({moonX:300}) +
        bat({x:140,y:150,scale:1.3}) + cat({x:255,y:235,scale:1.2})),
      pages: [
        {
          text: "Ellie heard a soft squeak by her window. Squeak, squeak!",
          art: () => svg(nightBg({moonX:330}) + castle(330,255,0.5) +
            kid(Object.assign({x:140, y:240, scale:1.3}, ELLIE)) +
            bat({x:270, y:110, scale:0.8}))
        },
        {
          text: "A baby bat was lost. She could not find her mama. Oh no!",
          art: () => svg(nightBg({moon:false}) +
            bat({x:200, y:160, scale:1.8, color:"#9a7ae0"}))
        },
        {
          text: "“Don’t worry, I will help!” said Ellie. Her cat Midnight came too.",
          art: () => svg(nightBg({moonX:80}) +
            kid(Object.assign({x:140, y:240, scale:1.3}, ELLIE)) +
            cat({x:255, y:248, scale:1.3}))
        },
        {
          text: "They flew up, up, up — past the twinkly stars and the big moon!",
          art: () => svg(nightBg({moonX:300, moonY:80, moonR:40}) +
            bat({x:120, y:130, scale:1}) +
            kid(Object.assign({x:200, y:200, scale:1.1}, ELLIE)) +
            bat({x:290, y:170, scale:0.7, color:"#9a7ae0"}))
        },
        {
          text: "There was Mama Bat! The baby bat was SO happy. Hugs all around!",
          art: () => svg(nightBg({moonX:70}) +
            bat({x:160, y:150, scale:1.4}) + bat({x:250, y:170, scale:0.8, color:"#9a7ae0"}))
        },
        { end: true, text: "The End. 🦇", art: () => endArt("#3a5fb0", [bat({x:200,y:150,scale:1.6})]) }
      ]
    },

    {
      id: "pumpkin-smile",
      title: "The Pumpkin Who Lost Its Smile",
      color: "#c25a14",
      cover: () => svg(nightBg({moonX:300}) + castle(320,255,0.5) +
        kid(Object.assign({x:130,y:235,scale:1.2}, ELLIE)) + pumpkin({x:255,y:235,scale:1.3})),
      pages: [
        {
          text: "One crisp autumn night, Princess Ellie skipped out to the pumpkin patch.",
          art: () => svg(nightBg({moonX:330}) + castle(320, 255, 0.5) +
            kid(Object.assign({x:160, y:240, scale:1.4}, ELLIE)) +
            pumpkin({x:280, y:255, scale:0.9}))
        },
        {
          text: "Every pumpkin glowed with a happy grin — except one tiny pumpkin in the back.",
          art: () => svg(nightBg({moonX:70}) +
            pumpkin({x:90, y:235, scale:1}) + pumpkin({x:200, y:245, scale:1.1}) +
            pumpkin({x:305, y:235, scale:0.7}))
        },
        {
          text: "“Why so sad, little one?” asked Ellie. “I lost my smile,” it sniffled.",
          art: () => svg(nightBg({moon:false}) +
            kid(Object.assign({x:130, y:240, scale:1.2}, ELLIE)) +
            pumpkin({x:265, y:215, scale:1.7}))
        },
        {
          text: "Ellie waved her sparkly wand and drew a great big grin. Ta-daa!",
          art: () => svg(nightBg({moonX:90}) +
            kid(Object.assign({x:140, y:240, scale:1.2}, ELLIE)) +
            pumpkin({x:265, y:230, scale:1.4}))
        },
        {
          text: "Now the little pumpkin glowed the brightest of all! They danced till moonset.",
          art: () => svg(nightBg({moonX:200, moonY:72, moonR:42}) +
            kid(Object.assign({x:120, y:245, scale:1.1}, ELLIE)) +
            pumpkin({x:230, y:250, scale:1}) + cat({x:310, y:248, scale:1}))
        },
        { end: true, text: "The End. 🎃", art: () => endArt("#c25a14", [pumpkin({x:200,y:160,scale:1.7})]) }
      ]
    },

    {
      id: "castle-sleepover",
      title: "The Cozy Castle Sleepover",
      color: "#5a3fb0",
      cover: () => svg(nightBg({moonX:300}) + castle(200,250,1) +
        ghost({x:120,y:150,scale:0.9}) + cat({x:290,y:235,scale:1})),
      pages: [
        {
          text: "Tonight the whole family had a cozy sleepover high up in the castle.",
          art: () => svg(nightBg({moonX:330}) + castle(200, 252, 1.1))
        },
        {
          text: "Jeannie read a story and Cory built the tallest pillow fort ever.",
          art: () => svg(nightBg({moonX:70}) +
            kid(Object.assign({x:140, y:240, scale:1.3, crown:false}, JEANNIE)) +
            kid(Object.assign({x:260, y:240, scale:1.3}, CORY)))
        },
        {
          text: "Knock, knock! Boo the giggly ghost floated in with marshmallows to share.",
          art: () => svg(nightBg({moon:false}) +
            kid(Object.assign({x:140, y:240, scale:1.3}, ELLIE)) +
            ghost({x:265, y:150, scale:1.4}))
        },
        {
          text: "Midnight the cat curled up warm, and baby Kieran giggled at the swooping bats.",
          art: () => svg(nightBg({moonX:320}) +
            bat({x:90, y:90, scale:0.9}) + bat({x:300, y:80, scale:0.7, color:"#9a7ae0"}) +
            cat({x:150, y:245, scale:1.3}) + babyPumpkin(270, 225, 1))
        },
        {
          text: "Snuggled together under the twinkly stars, everyone drifted off to sweet dreams.",
          art: () => svg(nightBg({moonX:200, moonY:72, moonR:44}) + castle(330, 255, 0.45) +
            ghost({x:90, y:150, scale:0.8}))
        },
        { end: true, text: "The End. 💜", art: () => endArt("#5a3fb0", [ghost({x:200,y:150,scale:1.4})]) }
      ]
    }
  ];

  // A baby in a round pumpkin costume, little face peeking out.
  function babyPumpkin(x, y, sc) {
    const pg = uid("bpump");
    return `<g transform="translate(${x} ${y}) scale(${sc})"><g class="tap hint-bob" data-sound="giggle">` +
      `<defs><radialGradient id="${pg}" cx="0.42" cy="0.3" r="0.95">` +
      `<stop offset="0" stop-color="#ffb054"/><stop offset="0.6" stop-color="#ff8c2e"/>` +
      `<stop offset="1" stop-color="#e0640e"/></radialGradient></defs>` +
      `<ellipse cx="0" cy="23" rx="20" ry="3.6" fill="#000" opacity="0.25"/>` +
      `<ellipse cx="0" cy="2" rx="22" ry="20" fill="url(#${pg})"/>` +
      `<path d="M -15 -11 C -19 -3 -19 8 -15 15" stroke="#d9660a" stroke-width="1.8" fill="none" opacity="0.5" stroke-linecap="round"/>` +
      `<path d="M 15 -11 C 19 -3 19 8 15 15" stroke="#d9660a" stroke-width="1.8" fill="none" opacity="0.5" stroke-linecap="round"/>` +
      // leafy hood
      `<path d="M 0 -17 C -3 -25 -9 -26 -12 -22 C -8 -19 -4 -17.5 0 -17 Z" fill="#5a8a2e"/>` +
      `<path d="M 0 -17 C 2 -24 7 -26 10 -23 C 7 -19 3 -17.5 0 -17 Z" fill="#6fa83a"/>` +
      // baby face peeking out
      `<circle cx="0" cy="0" r="11.5" fill="#ffd9b8"/>` +
      `<circle cx="0" cy="0" r="11.5" fill="none" stroke="#d9660a" stroke-width="1.5" opacity="0.55"/>` +
      `<path d="M 0 -8.5 Q 1.5 -11.5 3.5 -12" stroke="#8a5a30" stroke-width="1.4" fill="none" stroke-linecap="round"/>` +
      `<ellipse cx="-4.2" cy="-2" rx="2" ry="2.6" fill="#2b2440">` +
      `<animate attributeName="ry" values="2.6;2.6;0.4;2.6" keyTimes="0;0.9;0.94;1" dur="4.2s" repeatCount="indefinite"/></ellipse>` +
      `<ellipse cx="4.2" cy="-2" rx="2" ry="2.6" fill="#2b2440">` +
      `<animate attributeName="ry" values="2.6;2.6;0.4;2.6" keyTimes="0;0.9;0.94;1" dur="4.2s" repeatCount="indefinite"/></ellipse>` +
      `<circle cx="-3.5" cy="-2.8" r="0.8" fill="#fff"/>` +
      `<circle cx="4.9" cy="-2.8" r="0.8" fill="#fff"/>` +
      `<circle cx="-7.5" cy="2" r="2.2" fill="#ff9ec2" opacity="0.6"/>` +
      `<circle cx="7.5" cy="2" r="2.2" fill="#ff9ec2" opacity="0.6"/>` +
      `<path d="M -3 3.5 Q 0 6.5 3 3.5" stroke="#b5466e" stroke-width="1.5" fill="none" stroke-linecap="round"/>` +
      `</g></g>`;
  }

  // "The End" celebration scene
  function endArt(color, characters) {
    return svg(nightBg({moonX:330, moonY:60}) +
      characters.join("") +
      `<text x="200" y="250" text-anchor="middle" font-size="34" font-weight="bold"
        fill="#fff3b0" font-family="Trebuchet MS, sans-serif">🌟 Yay! 🌟</text>`);
  }

  /* -----------------------------------------------------------
     3. Sound — gentle Web Audio chimes (no audio files needed)
     ----------------------------------------------------------- */
  let actx = null;
  function audio() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; } }
    if (actx && actx.state === "suspended") actx.resume();
    return actx;
  }
  function tone(freq, dur, type, when, gain) {
    const ac = audio(); if (!ac) return;
    const t = ac.currentTime + (when || 0);
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = type || "sine"; osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain || 0.18, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(ac.destination);
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  const SOUNDS = {
    chime:   () => { tone(880,.4,"sine"); tone(1320,.5,"sine",.08,.12); },
    twinkle: () => { tone(1568,.18,"triangle"); tone(2093,.2,"triangle",.07,.1); },
    giggle:  () => { [660,880,760,990,840].forEach((f,i)=>tone(f,.12,"sine",i*0.09,.14)); },
    meow:    () => { tone(620,.25,"sawtooth",0,.1); tone(500,.3,"sawtooth",.12,.1); },
    squeak:  () => { tone(1400,.1,"square",0,.08); tone(1800,.1,"square",.09,.07); },
    boing:   () => { tone(300,.18,"sine"); tone(520,.22,"sine",.1,.12); },
    page:    () => { tone(520,.12,"triangle",0,.08); tone(700,.12,"triangle",.06,.07); },
    yay:     () => { [523,659,784,1047].forEach((f,i)=>tone(f,.3,"triangle",i*0.12,.14)); }
  };
  function playSound(name) { (SOUNDS[name] || SOUNDS.chime)(); }

  /* -----------------------------------------------------------
     4. Narration — play the pre-rendered neural-voice clips
     (warm Piper "lessac" voice, in audio/<storyId>-<page>.mp3).
     No robotic fallback: if a clip is missing, the page is silent
     and the words stay on screen for the kids to read.
     ----------------------------------------------------------- */
  const narrator = new Audio();
  narrator.preload = "auto";

  function narrate(storyId, pageIndex) {
    stopNarration();
    narrator.src = "audio/" + storyId + "-" + pageIndex + ".mp3";
    const pr = narrator.play();
    if (pr && pr.catch) pr.catch(() => {}); // missing clip — stay silent
  }
  function stopNarration() {
    try { narrator.pause(); } catch (e) {}
  }

  /* -----------------------------------------------------------
     5. App / engine
     ----------------------------------------------------------- */
  const grid = document.getElementById("story-grid");
  const library = document.getElementById("library");
  const reader = document.getElementById("reader");
  const artEl = document.getElementById("page-art");
  const textEl = document.getElementById("page-text");
  const dotsEl = document.getElementById("dots");
  const titleEl = document.getElementById("reader-title");
  const hintEl = document.getElementById("tap-hint");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const homeBtn = document.getElementById("home-btn");
  const readBtn = document.getElementById("read-btn");

  const STORE_KEY = "spooky-stories-done";
  function loadDone() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; } }
  function saveDone(d) { try { localStorage.setItem(STORE_KEY, JSON.stringify(d)); } catch (e) {} }

  let current = null;   // current story object
  let page = 0;

  // ---- Library ----
  function buildLibrary() {
    const done = loadDone();
    grid.innerHTML = "";
    STORIES.forEach(story => {
      const card = document.createElement("button");
      card.className = "story-card";
      card.style.background = `linear-gradient(160deg, ${shade(story.color, 25)}, ${shade(story.color, -40)})`;
      card.innerHTML =
        `${done[story.id] ? '<span class="done-star" aria-hidden="true">⭐</span>' : ""}
         <span class="cover-svg">${story.cover()}</span>
         <h2>${story.title}</h2>
         <p>${story.pages.length - 1} pages • Tap to read</p>`;
      card.addEventListener("click", () => openStory(story));
      grid.appendChild(card);
    });
  }

  // ---- Open / render a story ----
  function openStory(story) {
    current = story;
    page = 0;
    titleEl.textContent = story.title;
    library.style.display = "none";
    reader.classList.add("active");
    audio(); // unlock audio on this tap gesture
    renderPage(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goHome() {
    stopNarration();
    current = null;
    reader.classList.remove("active");
    library.style.display = "";
    buildLibrary();
  }

  function renderPage(animate) {
    const p = current.pages[page];

    // art — a page may carry a generated image (img) or an art() function
    // (the art is hand-authored vector SVG, drawn directly).
    if (p.img) {
      artEl.innerHTML = '<img class="scene-img" src="' + p.img + '" alt="" onerror="this.style.display=\'none\'">';
    } else {
      artEl.innerHTML = p.art();
    }
    if (animate) {
      artEl.classList.remove("turning"); void artEl.offsetWidth; artEl.classList.add("turning");
    }

    // text
    textEl.textContent = p.text;

    // dots
    dotsEl.innerHTML = "";
    current.pages.forEach((_, i) => {
      const d = document.createElement("span");
      if (i === page) d.className = "on";
      dotsEl.appendChild(d);
    });

    // hint only when there are tappable things
    const hasTaps = artEl.querySelector(".tap");
    hintEl.style.visibility = hasTaps ? "visible" : "hidden";
    hintEl.textContent = p.end ? "🎉 Hooray! 🎉" : "✨ Tap the picture to play! ✨";

    // buttons
    prevBtn.disabled = page === 0;
    nextBtn.textContent = p.end ? "📚 More stories" : "Turn the page ▶";

    // hook up tappable art
    wireTaps();

    // celebrate + remember finished stories
    if (p.end) {
      const done = loadDone(); done[current.id] = true; saveDone(done);
      playSound("yay");
      confetti();
    }

    // read this page aloud automatically (pre-rendered voice + fallback)
    narrate(current.id, page);
  }

  function wireTaps() {
    const taps = artEl.querySelectorAll(".tap");
    taps.forEach(node => {
      node.addEventListener("click", ev => {
        ev.stopPropagation();
        node.classList.remove("wiggle"); void node.getBBox; node.classList.add("wiggle");
        node.addEventListener("animationend", () => node.classList.remove("wiggle"), { once: true });
        playSound(node.getAttribute("data-sound") || "chime");
        sparkleAt(ev);
      });
    });
  }

  // spawn a few sparkle emojis where the child tapped
  const SPARKLES = ["✨", "⭐", "💜", "🌟", "💫"];
  function sparkleAt(ev) {
    const stage = artEl.parentElement; // .stage
    const rect = stage.getBoundingClientRect();
    let cx, cy;
    if (ev.touches && ev.touches[0]) { cx = ev.touches[0].clientX; cy = ev.touches[0].clientY; }
    else { cx = ev.clientX; cy = ev.clientY; }
    cx -= rect.left; cy -= rect.top;
    for (let i = 0; i < 6; i++) {
      const s = document.createElement("span");
      s.className = "spark";
      s.textContent = SPARKLES[Math.floor(i % SPARKLES.length)];
      s.style.left = cx + "px"; s.style.top = cy + "px";
      const ang = (Math.PI * 2 * i) / 6 + (i * 0.3);
      const dist = 36 + (i % 3) * 14;
      s.style.setProperty("--dx", Math.cos(ang) * dist + "px");
      s.style.setProperty("--dy", Math.sin(ang) * dist - 18 + "px");
      stage.appendChild(s);
      s.addEventListener("animationend", () => s.remove(), { once: true });
    }
  }

  // gentle confetti rain for the last page
  function confetti() {
    const stage = artEl.parentElement;
    const rect = stage.getBoundingClientRect();
    const items = ["✨","⭐","💜","🎉","🌟","🎃","🦇","👻"];
    for (let i = 0; i < 18; i++) {
      const s = document.createElement("span");
      s.className = "spark";
      s.textContent = items[Math.floor(i % items.length)];
      s.style.left = (Math.random() * rect.width) + "px";
      s.style.top = "-10px";
      s.style.setProperty("--dx", (Math.random() * 60 - 30) + "px");
      s.style.setProperty("--dy", (rect.height * 0.7 + Math.random() * 40) + "px");
      s.style.animationDuration = (0.9 + Math.random() * 0.8) + "s";
      stage.appendChild(s);
      s.addEventListener("animationend", () => s.remove(), { once: true });
    }
  }

  function nextPage() {
    const p = current.pages[page];
    if (p.end) { goHome(); return; }
    if (page < current.pages.length - 1) {
      page++;
      playSound("page");
      renderPage(true);
    }
  }
  function prevPage() {
    if (page > 0) { page--; playSound("page"); renderPage(true); }
  }

  // ---- wire up controls ----
  nextBtn.addEventListener("click", nextPage);
  prevBtn.addEventListener("click", prevPage);
  homeBtn.addEventListener("click", goHome);
  readBtn.addEventListener("click", () => { if (current) narrate(current.id, page); });

  // keyboard niceties (arrows / space)
  document.addEventListener("keydown", e => {
    if (!current) return;
    if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); nextPage(); }
    else if (e.key === "ArrowLeft") { prevPage(); }
    else if (e.key === "Escape") { goHome(); }
  });

  // stop reading if the page is hidden/closed
  window.addEventListener("pagehide", stopNarration);
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopNarration(); });

  buildLibrary();
})();
