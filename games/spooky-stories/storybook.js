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
          hill = uid("hill"), glow = uid("glow"), fog = uid("fog"),
          horiz = uid("horiz");
    let s =
      `<defs>` +
      `<linearGradient id="${sky}" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="#0c0730"/>` +
      `<stop offset="0.38" stop-color="#251458"/>` +
      `<stop offset="0.68" stop-color="#452173"/>` +
      `<stop offset="0.88" stop-color="#67308a"/>` +
      `<stop offset="1" stop-color="#8a4498"/></linearGradient>` +
      `<linearGradient id="${horiz}" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="#ff9ecb" stop-opacity="0"/>` +
      `<stop offset="1" stop-color="#ff9ecb" stop-opacity="0.20"/></linearGradient>` +
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
      `<rect x="0" y="0" width="400" height="300" fill="url(#${sky})"/>` +
      // rosy dusk glow hugging the horizon
      `<rect x="0" y="168" width="400" height="94" fill="url(#${horiz})"/>`;
    const mx = opts.moonX || 320, my = opts.moonY || 64, mr = opts.moonR || 32;
    if (stars) {
      // faint stardust (tiny, static, cheap) behind the big sparkles
      const dust = [[24,60],[70,24],[126,96],[168,52],[232,26],[248,96],[312,88],[356,110],[386,70],[140,132],[292,150],[52,148]];
      dust.forEach((p, i) => {
        if (moon && Math.hypot(p[0] - mx, p[1] - my) < mr + 8) return;
        s += `<circle cx="${p[0]}" cy="${p[1]}" r="${i % 3 ? 0.8 : 1.2}" fill="#efe6ff" opacity="${i % 2 ? 0.5 : 0.75}"/>`;
      });
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
      // hazy distant ridge with a sleepy treeline, then the hills
      s += `<path d="M0 252 C 45 236 90 244 140 238 C 200 231 250 242 305 234 C 345 229 375 238 400 232 L400 300 L0 300 Z" fill="#1c1048" opacity="0.85"/>` +
        // little spruce silhouettes at the edges of the ridge
        `<path d="M 22 250 L 30 222 L 38 250 Z M 26 240 L 30 226 L 34 240 Z" fill="#150b3d"/>` +
        `<path d="M 46 254 L 52 234 L 58 254 Z" fill="#170d40"/>` +
        `<path d="M 356 246 L 363 220 L 370 246 Z M 359 236 L 363 224 L 367 236 Z" fill="#150b3d"/>` +
        `<path d="M 380 250 L 386 230 L 392 250 Z" fill="#170d40"/>` +
        // far hills (darker) and a nearer, softly lit hill
        `<path d="M0 262 C 60 240 130 254 200 246 C 275 238 330 256 400 244 L400 300 L0 300 Z" fill="#1a0f3e"/>` +
        `<path d="M0 280 C 70 262 150 276 235 268 C 305 262 355 274 400 266 L400 300 L0 300 Z" fill="url(#${hill})"/>` +
        // moonlit crest lines on the near hill
        `<path d="M 0 280 C 70 262 150 276 235 268" fill="none" stroke="#8f7ad0" stroke-width="1.4" opacity="0.35" stroke-linecap="round"/>` +
        // drifting fog
        `<ellipse cx="110" cy="272" rx="95" ry="14" fill="url(#${fog})">` +
        `<animateTransform attributeName="transform" type="translate" values="0 0; 40 -3; 0 0" dur="16s" repeatCount="indefinite"/></ellipse>` +
        `<ellipse cx="300" cy="286" rx="110" ry="15" fill="url(#${fog})">` +
        `<animateTransform attributeName="transform" type="translate" values="0 0; -45 2; 0 0" dur="21s" repeatCount="indefinite"/></ellipse>`;
      // three sleepy fireflies drifting over the meadow
      [[62, 240], [338, 232], [178, 224]].forEach((p, i) => {
        s += `<g transform="translate(${p[0]} ${p[1]})">` +
          `<animateTransform attributeName="transform" type="translate" additive="sum" ` +
          `values="0 0; ${9 + i * 5} ${-7 - i * 3}; ${-6 - i * 2} 5; 0 0" dur="${11 + i * 4}s" repeatCount="indefinite"/>` +
          `<circle r="3.4" fill="#ffe98a" opacity="0.18"/>` +
          `<circle r="1.3" fill="#fff6c0">` +
          `<animate attributeName="opacity" values="1;0.15;1" dur="${(2.3 + i * 0.8).toFixed(1)}s" begin="${(i * 0.9).toFixed(1)}s" repeatCount="indefinite"/>` +
          `</circle></g>`;
      });
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
      `<stop offset="0" stop-color="#5a479e"/><stop offset="0.55" stop-color="#453479"/>` +
      `<stop offset="1" stop-color="#2c2052"/></linearGradient>` +
      `<linearGradient id="${roof}" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="#ffb1d6"/><stop offset="0.6" stop-color="#f279af"/>` +
      `<stop offset="1" stop-color="#c94f8c"/></linearGradient>` +
      `<radialGradient id="${win}" cx="0.5" cy="0.4" r="0.8">` +
      `<stop offset="0" stop-color="#fff6c4"/><stop offset="1" stop-color="#ffc94d"/></radialGradient>` +
      glowFilter(wg, 2.5) +
      `</defs>`;
    // side towers with pink cone roofs and little flags
    [-76, 76].forEach(tx => {
      s += `<rect x="${tx - 14}" y="-64" width="28" height="76" rx="5" fill="url(#${wall})"/>` +
        `<path d="M ${tx - 17} -62 C ${tx - 11} -84 ${tx - 4} -98 ${tx} -106 C ${tx + 4} -98 ${tx + 11} -84 ${tx + 17} -62 Q ${tx} -70 ${tx - 17} -62 Z" fill="url(#${roof})"/>` +
        // moonlit sheen down the left of each cone
        `<path d="M ${tx - 9} -68 Q ${tx - 4} -87 ${tx - 1} -100" stroke="#ffd3e8" stroke-width="2.2" opacity="0.55" fill="none" stroke-linecap="round"/>` +
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
      // hints of stonework, barely-there
      `<g fill="#cfc0ff" opacity="0.09">` +
      `<rect x="-56" y="-38" width="11" height="5" rx="2"/><rect x="-40" y="-26" width="12" height="5" rx="2"/>` +
      `<rect x="20" y="-40" width="12" height="5" rx="2"/><rect x="40" y="-22" width="11" height="5" rx="2"/>` +
      `<rect x="-13" y="-70" width="10" height="5" rx="2"/><rect x="4" y="-56" width="10" height="5" rx="2"/>` +
      `</g>` +
      `<path d="M -21 -96 C -14 -114 -6 -130 0 -140 C 6 -130 14 -114 21 -96 Q 0 -103 -21 -96 Z" fill="url(#${roof})"/>` +
      `<path d="M -12 -102 Q -6 -120 -1 -133" stroke="#ffd3e8" stroke-width="2.2" opacity="0.55" fill="none" stroke-linecap="round"/>` +
      `<line x1="0" y1="-140" x2="0" y2="-152" stroke="#e8e2ff" stroke-width="1.6"/>` +
      `<path d="M 0 -152 L 12 -148 L 0 -144 Z" fill="#ffd166"/>`;
    // glowing windows (the tower one gently flickers)
    const wins = [[-82, -52], [70, -52], [-6, -90], [-44, -30], [32, -30]];
    wins.forEach((p, i) => {
      s += `<rect x="${p[0]}" y="${p[1]}" width="12" height="16" rx="6" fill="url(#${win})" filter="url(#${wg})">` +
        (i === 2 ? `<animate attributeName="opacity" values="1;0.72;1" dur="3.4s" repeatCount="indefinite"/>` : "") +
        `</rect>`;
    });
    // party bunting strung between the two side towers
    s += `<path d="M -62 -64 Q 0 -48 62 -64" fill="none" stroke="#e8e2ff" stroke-width="1.1" opacity="0.9"/>`;
    const bunting = [[-37.2, -59.3, "#ff8ec9"], [-18.6, -56.7, "#ffd166"], [0, -56, "#8ad0ff"], [18.6, -56.7, "#b98cff"], [37.2, -59.3, "#ff8ec9"]];
    bunting.forEach(f => {
      s += `<path d="M ${f[0] - 3.6} ${f[1]} L ${f[0]} ${f[1] + 7} L ${f[0] + 3.6} ${f[1]} Z" fill="${f[2]}"/>`;
    });
    // arched door with a tiny golden knob + warm lamplight spill
    s += `<path d="M -12 12 L -12 -10 Q 0 -26 12 -10 L 12 12 Z" fill="#1c1038"/>` +
      `<path d="M -12 -10 Q 0 -26 12 -10" fill="none" stroke="#6b49b8" stroke-width="2"/>` +
      `<path d="M -10 12 Q 0 -3 10 12 Z" fill="#ffca5f" opacity="0.14"/>` +
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
    const pants = o.pants || shade(dress, -46);
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
      (o.boy
        // a boy's outfit: shirt/tunic, two trouser legs and little shoes
        ? `<rect x="-9" y="-10" width="7.6" height="19" rx="3" fill="${pants}"/>` +
          `<rect x="1.4" y="-10" width="7.6" height="19" rx="3" fill="${pants}"/>` +
          `<ellipse cx="-5.2" cy="9.6" rx="5.4" ry="2.8" fill="#39304a"/>` +
          `<ellipse cx="5.2" cy="9.6" rx="5.4" ry="2.8" fill="#39304a"/>` +
          `<path d="M -11 -30 C -6 -33 6 -33 11 -30 C 12.5 -21 12.5 -12 11 -5 Q 0 -1.5 -11 -5 C -12.5 -12 -12.5 -21 -11 -30 Z" fill="url(#${dg})"/>` +
          `<path d="M -4.5 -31 L 0 -26.5 L 4.5 -31" fill="none" stroke="${dressL}" stroke-width="1.5" stroke-linecap="round"/>` +
          `<rect x="-11" y="-8" width="22" height="3.4" rx="1.7" fill="${shade(dress, -52)}"/>` +
          `<rect x="-2.2" y="-8.6" width="4.4" height="4.6" rx="1.1" fill="#ffd166"/>` +
          `<circle cx="0" cy="-16" r="1" fill="#fff" opacity="0.7"/>`
        // a flowing dress + soft centre panel + twinkly sparkles
        : `<path d="M -6 -32 L 6 -32 C 11 -24 16 -14 21 -2 C 25 5 25 9 21 10 Q 0 15 -21 10 C -25 9 -25 5 -21 -2 C -16 -14 -11 -24 -6 -32 Z" fill="url(#${dg})"/>` +
          `<path d="M -3 -30 C -6 -16 -8 -2 -9 9 Q 0 12 9 9 C 8 -2 6 -16 3 -30 Z" fill="${dressL}" opacity="0.45"/>` +
          // moonlit rim light down the skirt's right edge + scalloped hem
          `<path d="M 8 -29 C 13 -21 17.5 -12 21 -2.5" stroke="#ffffff" stroke-width="1.3" opacity="0.4" fill="none" stroke-linecap="round"/>` +
          `<path d="M -19 8.2 Q -9.5 12.4 0 12.6 Q 9.5 12.4 19 8.2" fill="none" stroke="${dressL}" stroke-width="1.4" opacity="0.65"/>` +
          `<path d="M -9.4 0 Q -10.4 0.5 -11 1.6 Q -11.6 0.5 -12.6 0 Q -11.6 -0.5 -11 -1.6 Q -10.4 -0.5 -9.4 0 Z" fill="#fff" opacity="0.9"/>` +
          `<path d="M 13.6 -6 Q 12.6 -5.5 12 -4.4 Q 11.4 -5.5 10.4 -6 Q 11.4 -6.5 12 -7.6 Q 12.6 -6.5 13.6 -6 Z" fill="#fff" opacity="0.85">` +
          `<animate attributeName="opacity" values="0.85;0.25;0.85" dur="2.6s" repeatCount="indefinite"/></path>` +
          `<path d="M 5.6 6 Q 4.6 6.5 4 7.6 Q 3.4 6.5 2.4 6 Q 3.4 5.5 4 4.4 Q 4.6 5.5 5.6 6 Z" fill="#fff" opacity="0.85"/>`) +
      // arms with little hands, tucked under puffy sleeves
      `<path d="M -7 -27 Q -16 -20 -20 -9" stroke="${skin}" stroke-width="5" stroke-linecap="round" fill="none"/>` +
      `<path d="M 7 -27 Q 16 -20 20 -9" stroke="${skin}" stroke-width="5" stroke-linecap="round" fill="none"/>` +
      `<circle cx="-20" cy="-9" r="3.1" fill="${skin}"/>` +
      `<circle cx="20" cy="-9" r="3.1" fill="${skin}"/>` +
      `<circle cx="-7.6" cy="-27.6" r="4" fill="${dressL}"/>` +
      `<circle cx="7.6" cy="-27.6" r="4" fill="${dressL}"/>` +
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
      `<ellipse cx="0" cy="34" rx="16" ry="3.4" fill="#000" opacity="0.12"/>` +
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
      // a tiny twinkle drifting beside Boo
      `<path d="M 24 -26 Q 22.8 -25.4 22 -24 Q 21.2 -25.4 20 -26 Q 21.2 -26.6 22 -28 Q 22.8 -26.6 24 -26 Z" fill="#fff" opacity="0.9">` +
      `<animate attributeName="opacity" values="0.9;0.2;0.9" dur="2.8s" repeatCount="indefinite"/></path>` +
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
      // pink collar with a tiny golden bell
      `<path d="M -8.5 -6 Q 0 -2 8.5 -6" stroke="#ff5d8f" stroke-width="2.6" fill="none" stroke-linecap="round"/>` +
      `<circle cx="0" cy="-2.4" r="1.9" fill="#ffd166"/>` +
      `<circle cx="-0.5" cy="-3" r="0.5" fill="#fff7d9"/>` +
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
      `<circle cx="-3.2" cy="-4.9" r="1.5" fill="#2b2440"/>` +
      `<circle cx="3.6" cy="-4.9" r="1.5" fill="#2b2440"/>` +
      `<circle cx="-2.7" cy="-5.5" r="0.5" fill="#fff"/>` +
      `<circle cx="4.1" cy="-5.5" r="0.5" fill="#fff"/>` +
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
     1b. Daytime toolkit — sunny/sunset skies and storybook
     friends for the not-so-spooky princess tales: a glowing sun,
     drifting clouds, a rainbow, little flowers, a rainbow-maned
     unicorn, a friendly dragon and a sleepy smiling star.
     Same 0 0 400 300 coordinate space as the night art.
     ----------------------------------------------------------- */

  // A fluffy cloud that drifts gently sideways.
  function cloud(x, y, sc) {
    sc = sc || 1;
    return `<g transform="translate(${x} ${y}) scale(${sc})">` +
      `<g><animateTransform attributeName="transform" type="translate" values="0 0; 14 0; 0 0" dur="20s" repeatCount="indefinite"/>` +
      `<ellipse cx="0" cy="0" rx="26" ry="16" fill="#ffffff"/>` +
      `<ellipse cx="-20" cy="6" rx="18" ry="12" fill="#ffffff"/>` +
      `<ellipse cx="20" cy="6" rx="18" ry="12" fill="#ffffff"/>` +
      `<ellipse cx="0" cy="9" rx="30" ry="10" fill="#eef6ff"/>` +
      `</g></g>`;
  }

  // A little five-petal flower on a green stem.
  function flower(x, y, sc, col) {
    sc = sc || 1; col = col || "#ff5d8f";
    let petals = "";
    for (let i = 0; i < 5; i++) {
      const a = (72 * i - 90) * Math.PI / 180;
      petals += `<ellipse cx="${(Math.cos(a) * 4.4).toFixed(1)}" cy="${(Math.sin(a) * 4.4).toFixed(1)}" rx="3.4" ry="2.6" fill="${col}"/>`;
    }
    return `<g transform="translate(${x} ${y}) scale(${sc})">` +
      `<line x1="0" y1="0" x2="0" y2="12" stroke="#3f9a3a" stroke-width="2" stroke-linecap="round"/>` +
      `<g class="tap" data-sound="twinkle">${petals}<circle cx="0" cy="0" r="2.6" fill="#ffd166"/></g></g>`;
  }

  // A small fluttering butterfly (tappable, twinkle sound).
  function butterfly(x, y, sc, col) {
    sc = sc || 1; col = col || "#ff8ec9";
    const lite = shade(col, 40);
    return `<g transform="translate(${x} ${y}) scale(${sc})">` +
      `<g><animateTransform attributeName="transform" type="translate" values="0 0; 7 -11; -5 -4; 0 0" dur="8s" repeatCount="indefinite"/>` +
      `<g class="tap" data-sound="twinkle">` +
      `<g><animateTransform attributeName="transform" type="rotate" values="18 0 0;-22 0 0;18 0 0" dur="1.15s" repeatCount="indefinite"/>` +
      `<ellipse cx="-5" cy="-3.5" rx="4.6" ry="6.2" fill="${col}"/>` +
      `<ellipse cx="-4.2" cy="4" rx="3.2" ry="4" fill="${lite}"/></g>` +
      `<g><animateTransform attributeName="transform" type="rotate" values="-18 0 0;22 0 0;-18 0 0" dur="1.15s" repeatCount="indefinite"/>` +
      `<ellipse cx="5" cy="-3.5" rx="4.6" ry="6.2" fill="${col}"/>` +
      `<ellipse cx="4.2" cy="4" rx="3.2" ry="4" fill="${lite}"/></g>` +
      `<ellipse cx="0" cy="0" rx="1.6" ry="6" fill="#5a4a6e"/>` +
      `<path d="M -1 -5.5 Q -3.5 -9 -5.5 -10 M 1 -5.5 Q 3.5 -9 5.5 -10" stroke="#5a4a6e" stroke-width="0.9" fill="none" stroke-linecap="round"/>` +
      `</g></g></g>`;
  }

  // A few little grass blades to dress the hilltops.
  function tuft(x, y, sc) {
    sc = sc || 1;
    return `<g transform="translate(${x} ${y}) scale(${sc})">` +
      `<path d="M -4 0 C -4.5 -4 -6 -7 -8 -9 M 0 0 C 0 -5 0 -8 0.5 -11 M 4 0 C 4.5 -4 6 -7 8 -9" ` +
      `stroke="#47953d" stroke-width="1.8" fill="none" stroke-linecap="round"/></g>`;
  }

  // A soft arcing rainbow.
  function rainbow(x, y, sc) {
    sc = sc || 1;
    const cols = ["#ff5d6c", "#ff9f43", "#ffd166", "#4bd07b", "#4aa3ff", "#9b6bff"];
    let s = "";
    cols.forEach((c, i) => {
      const r = 74 - i * 9;
      s += `<path d="M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round"/>`;
    });
    // soft cloud puffs where the rainbow lands
    [-74, 74].forEach(px => {
      s += `<g><ellipse cx="${px}" cy="2" rx="15" ry="9.5" fill="#ffffff"/>` +
        `<ellipse cx="${px - 11}" cy="6" rx="9.5" ry="6.5" fill="#ffffff"/>` +
        `<ellipse cx="${px + 11}" cy="6" rx="9.5" ry="6.5" fill="#f0f6ff"/></g>`;
    });
    return `<g transform="translate(${x} ${y}) scale(${sc})" opacity="0.92">${s}</g>`;
  }

  // A bright daytime (or golden sunset) sky with a glowing sun,
  // drifting clouds and green rolling hills dotted with flowers.
  function dayBg(opts) {
    opts = opts || {};
    const sunset = !!opts.sunset;
    const sky = uid("day"), grass = uid("grass"), sunG = uid("sunG"), sglow = uid("sglow");
    let s =
      `<defs>` +
      `<linearGradient id="${sky}" x1="0" y1="0" x2="0" y2="1">` +
      (sunset
        ? `<stop offset="0" stop-color="#ffc27a"/><stop offset="0.42" stop-color="#ff9a7e"/>` +
          `<stop offset="0.75" stop-color="#ffb595"/><stop offset="1" stop-color="#ffd9bd"/>`
        : `<stop offset="0" stop-color="#5fb5f5"/><stop offset="0.45" stop-color="#a3daff"/>` +
          `<stop offset="0.78" stop-color="#d8f0ff"/><stop offset="1" stop-color="#f4fbff"/>`) +
      `</linearGradient>` +
      `<linearGradient id="${grass}" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="#8ed86a"/><stop offset="1" stop-color="#54a846"/></linearGradient>` +
      `<radialGradient id="${sunG}" cx="0.5" cy="0.5" r="0.5">` +
      `<stop offset="0" stop-color="#fff7cf"/><stop offset="0.7" stop-color="#ffe27a"/><stop offset="1" stop-color="#ffca3a"/></radialGradient>` +
      glowFilter(sglow, 4) +
      `</defs>` +
      `<rect x="0" y="0" width="400" height="300" fill="url(#${sky})"/>`;
    let sx = opts.sunX || 320;
    if (opts.sun !== false) {
      const sy = opts.sunY || 66, sr = opts.sunR || 30;
      s += `<g class="tap hint-bob" data-sound="chime">` +
        // rays turn ever so slowly, like a pinwheel
        `<g><animateTransform attributeName="transform" type="rotate" values="0 ${sx} ${sy};360 ${sx} ${sy}" dur="90s" repeatCount="indefinite"/>`;
      for (let i = 0; i < 12; i++) {
        const a = (Math.PI * 2 * i) / 12;
        s += `<line x1="${(sx + Math.cos(a) * (sr + 6)).toFixed(1)}" y1="${(sy + Math.sin(a) * (sr + 6)).toFixed(1)}" ` +
          `x2="${(sx + Math.cos(a) * (sr + 18)).toFixed(1)}" y2="${(sy + Math.sin(a) * (sr + 18)).toFixed(1)}" ` +
          `stroke="#ffd84a" stroke-width="3" stroke-linecap="round" opacity="0.8"/>`;
      }
      s += `</g><circle cx="${sx}" cy="${sy}" r="${sr}" fill="url(#${sunG})" filter="url(#${sglow})"/></g>`;
    }
    s += cloud(96, 66, 1) + cloud(258, 104, 0.72);
    // a couple of far-off birds on the sunless side of the sky
    const bx = sx < 200 ? 282 : 44;
    const bcol = sunset ? "#b06a58" : "#5b8fc0";
    // Drawn a little bigger with a body between the wings, so they read as
    // distant birds rather than as two dark specks of grit on the sky.
    const farBird = (fx, fy, fs, op) =>
      `<g transform="translate(${fx} ${fy}) scale(${fs})" fill="none" stroke="${bcol}" stroke-width="1.9" stroke-linecap="round" opacity="${op}">` +
      `<path d="M-11 0 q5.5 -6.5 11 -1"/><path d="M0 -1 q5.5 -5.5 11 1"/>` +
      `<path d="M-1 0 q1 1.6 2 0" stroke-width="2.6"/></g>`;
    s += farBird(bx + 9, 62, 1.15, 0.85) + farBird(bx - 14, 78, 0.9, 0.7);
    // hazy far meadow, then the two green hills
    s += `<path d="M0 240 C 70 222 150 234 230 224 C 300 216 350 232 400 222 L400 300 L0 300 Z" fill="${sunset ? "#e8a37f" : "#9fd9b4"}" opacity="0.6"/>` +
      `<path d="M0 250 C 80 225 150 245 230 232 C 300 221 350 238 400 228 L400 300 L0 300 Z" fill="#6fc25a"/>` +
      `<path d="M0 278 C 90 262 170 276 250 268 C 320 262 360 274 400 268 L400 300 L0 300 Z" fill="url(#${grass})"/>` +
      // sunlit crest line + a few grass tufts
      `<path d="M0 250 C 80 225 150 245 230 232" fill="none" stroke="#b8e88a" stroke-width="1.6" opacity="0.6" stroke-linecap="round"/>` +
      tuft(34, 288, 1) + tuft(128, 283, 0.85) + tuft(252, 280, 0.9) + tuft(336, 287, 1.05);
    if (sunset) {
      // warm evening light washing over the meadow
      s += `<rect x="0" y="218" width="400" height="82" fill="#ff8a5b" opacity="0.14"/>`;
    }
    if (opts.flowers !== false) {
      s += flower(58, 284, 1, "#ff5d8f") + flower(150, 291, 0.9, "#ffd166") +
        flower(300, 286, 1, "#b266e0") + flower(360, 293, 0.85, "#ff8ec9") +
        butterfly(76, 262, 0.8, "#ff8ec9") + butterfly(344, 256, 0.62, "#b98cff");
    }
    return s;
  }

  // A white unicorn with a rainbow mane, spiral horn and a shy smile.
  // Facing right; feet on the ground at y≈+22, back at y≈-12.
  function unicorn(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const body = "#ffffff", shadow = "#e9e2fa";
    const mane = uid("mane");
    return `<g transform="translate(${x} ${y}) scale(${o.flip ? -sc : sc} ${sc})"><g class="tap hint-bob" data-sound="neigh">` +
      `<defs><linearGradient id="${mane}" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="#ff8ec9"/><stop offset="0.5" stop-color="#b98cff"/><stop offset="1" stop-color="#8ad0ff"/></linearGradient></defs>` +
      `<ellipse cx="-1" cy="23" rx="25" ry="4.5" fill="#000" opacity="0.2"/>` +
      // flowing tail, swept back with rainbow strands
      `<path d="M -19 -4 C -28 -8 -36 -3 -36.5 6 C -36.8 12 -33 17.5 -27 19.5 C -30 14 -30.5 8.5 -28 3.5 C -26 -0.5 -22.5 -3 -19 -4 Z" fill="url(#${mane})"/>` +
      `<path d="M -23 -3.5 C -30 -1 -33 6 -31 13" stroke="#ff8ec9" stroke-width="1.3" fill="none" opacity="0.8" stroke-linecap="round"/>` +
      `<path d="M -21 -4.5 C -27 -2.5 -30 3 -29 9" stroke="#8ad0ff" stroke-width="1.1" fill="none" opacity="0.75" stroke-linecap="round"/>` +
      // far-side legs (shaded) with hooves
      `<rect x="-17" y="4" width="6.4" height="17" rx="3.2" fill="${shadow}"/>` +
      `<rect x="8" y="4" width="6.4" height="17" rx="3.2" fill="${shadow}"/>` +
      `<rect x="-17" y="17.6" width="6.4" height="4" rx="2" fill="#c8b9e6"/>` +
      `<rect x="8" y="17.6" width="6.4" height="4" rx="2" fill="#c8b9e6"/>` +
      // mane flowing down the back of the neck (behind the neck)
      `<path d="M 18 -34 C 9 -30 4 -21 3.5 -11 C 3.3 -5 5.5 0.5 9 3.5" stroke="url(#${mane})" stroke-width="8" fill="none" stroke-linecap="round"/>` +
      `<path d="M 16 -32 C 9 -27 6 -19 6.5 -9" stroke="#ff8ec9" stroke-width="1.4" fill="none" opacity="0.85" stroke-linecap="round"/>` +
      `<path d="M 18.5 -30 C 12 -25 9.5 -18 9.5 -10" stroke="#8ad0ff" stroke-width="1.2" fill="none" opacity="0.8" stroke-linecap="round"/>` +
      // arched neck up to the head
      `<path d="M 10 -2 C 13 -10 17 -18 22 -24" stroke="${body}" stroke-width="13" fill="none" stroke-linecap="round"/>` +
      // round rump-to-chest body + soft belly shading
      `<ellipse cx="-2" cy="1" rx="21" ry="13.5" fill="${body}"/>` +
      `<ellipse cx="-4" cy="10" rx="12" ry="3.6" fill="${shadow}" opacity="0.38"/>` +
      // near-side legs with lilac hooves
      `<rect x="-9" y="6" width="6.4" height="16" rx="3.2" fill="${body}"/>` +
      `<rect x="13" y="6" width="6.4" height="16" rx="3.2" fill="${body}"/>` +
      `<rect x="-9" y="18.2" width="6.4" height="3.8" rx="1.9" fill="#d8cdf0"/>` +
      `<rect x="13" y="18.2" width="6.4" height="3.8" rx="1.9" fill="#d8cdf0"/>` +
      // ear (behind the head crown)
      `<path d="M 17.5 -32 Q 17 -39.5 20.5 -41.5 Q 23 -37 22 -32.5 Z" fill="${body}"/>` +
      `<path d="M 19 -33.5 Q 19 -37.8 20.4 -39.4 Q 21.6 -36.6 21 -33.5 Z" fill="#ffd7e6"/>` +
      // golden spiral horn on the forehead
      `<path d="M 23.6 -34.5 L 27.8 -50 L 28 -33.8 Z" fill="#ffd166"/>` +
      `<path d="M 24.8 -38.5 L 27.9 -40 M 25.6 -42 L 27.8 -43.3 M 26.4 -45.5 L 27.9 -46.4" stroke="#e8a92e" stroke-width="0.9" stroke-linecap="round"/>` +
      // head with a proper little muzzle
      `<circle cx="24" cy="-27" r="8.5" fill="${body}"/>` +
      `<ellipse cx="31.5" cy="-23.8" rx="5.8" ry="4.6" fill="${body}"/>` +
      `<ellipse cx="33" cy="-22.6" rx="3" ry="2.2" fill="#ffeef5"/>` +
      `<circle cx="34.6" cy="-24.6" r="0.85" fill="#d9a7c7"/>` +
      `<path d="M 30 -20.4 Q 32.8 -18.6 35.6 -20.2" stroke="#c76a8a" stroke-width="1.1" fill="none" stroke-linecap="round"/>` +
      // forelock curl over the brow
      `<path d="M 20.5 -35.5 Q 16.8 -32.5 17 -27.5" stroke="url(#${mane})" stroke-width="3.6" fill="none" stroke-linecap="round"/>` +
      // gentle eye with lash + rosy cheek
      `<circle cx="23.5" cy="-27.5" r="2.3" fill="#2b2440"/>` +
      `<circle cx="24.2" cy="-28.3" r="0.75" fill="#fff"/>` +
      `<path d="M 20.6 -30.2 Q 22.6 -31.4 24.8 -31" stroke="#2b2440" stroke-width="0.9" fill="none" stroke-linecap="round" opacity="0.75"/>` +
      `<circle cx="26.6" cy="-21.6" r="2" fill="#ffb3d1" opacity="0.6"/>` +
      // fairy sparkles floating around Sparkle herself
      `<path d="M -10 -14 Q -11.1 -13.4 -11.8 -12.2 Q -12.5 -13.4 -13.6 -14 Q -12.5 -14.6 -11.8 -15.8 Q -11.1 -14.6 -10 -14 Z" fill="#fff" opacity="0.9">` +
      `<animate attributeName="opacity" values="0.9;0.25;0.9" dur="2.4s" repeatCount="indefinite"/></path>` +
      `<path d="M 33.6 -38 Q 32.6 -37.5 32 -36.4 Q 31.4 -37.5 30.4 -38 Q 31.4 -38.5 32 -39.6 Q 32.6 -38.5 33.6 -38 Z" fill="#fff" opacity="0.8"/>` +
      `</g></g>`;
  }

  // A friendly little dragon: round belly, flappy wing, tiny smile,
  // and a gentle puff of "smoke" (never any fire).
  function dragon(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const col = o.color || "#5ec46a", belly = "#d8f4b2", dark = shade(col, -30);
    return `<g transform="translate(${x} ${y}) scale(${o.flip ? -sc : sc} ${sc})"><g class="tap hint-bob" data-sound="roar">` +
      `<ellipse cx="0" cy="24" rx="26" ry="4.5" fill="#000" opacity="0.2"/>` +
      `<path d="M -18 10 C -34 14 -36 -2 -28 -6 C -30 6 -22 8 -14 6 Z" fill="${col}"/>` +
      `<g><animateTransform attributeName="transform" type="rotate" values="-6 -4 -6;7 -4 -6;-6 -4 -6" dur="2.4s" repeatCount="indefinite"/>` +
      `<path d="M -6 -6 C -18 -26 -30 -26 -34 -18 C -26 -18 -24 -12 -26 -6 C -18 -10 -12 -8 -8 -2 Z" fill="${dark}"/></g>` +
      `<rect x="-11" y="10" width="7" height="14" rx="3" fill="${dark}"/>` +
      `<rect x="4" y="10" width="7" height="14" rx="3" fill="${dark}"/>` +
      `<ellipse cx="0" cy="4" rx="22" ry="17" fill="${col}"/>` +
      `<ellipse cx="0" cy="8" rx="12" ry="11" fill="${belly}"/>` +
      `<path d="M -8 3 Q 0 5.5 8 3 M -9 8.5 Q 0 11 9 8.5 M -7.5 14 Q 0 16 7.5 14" stroke="#b9d98e" stroke-width="1.1" fill="none" opacity="0.8" stroke-linecap="round"/>` +
      `<path d="M -14 -8 Q -7 -13.5 1 -13.8" stroke="${shade(col, 32)}" stroke-width="2" fill="none" opacity="0.55" stroke-linecap="round"/>` +
      `<path d="M -8 -12 L -4 -20 L 0 -12 Z M 2 -13 L 6 -22 L 10 -13 Z" fill="${dark}"/>` +
      `<path d="M 14 -6 C 20 -18 30 -22 36 -18 C 32 -14 32 -8 26 -4 C 22 -1 18 0 14 0 Z" fill="${col}"/>` +
      // round head + friendly rounded muzzle with two nostrils
      `<circle cx="34" cy="-20" r="9" fill="${col}"/>` +
      `<ellipse cx="42.5" cy="-16.5" rx="6" ry="4.6" fill="${col}"/>` +
      `<ellipse cx="43.5" cy="-15" rx="3.4" ry="2.4" fill="${belly}" opacity="0.85"/>` +
      `<ellipse cx="41.5" cy="-19.4" rx="0.85" ry="1.05" fill="${dark}" opacity="0.8"/>` +
      `<ellipse cx="44.8" cy="-18.8" rx="0.85" ry="1.05" fill="${dark}" opacity="0.8"/>` +
      `<path d="M 38 -13.6 Q 42.5 -10.8 47 -13.2" stroke="${dark}" stroke-width="1.3" fill="none" stroke-linecap="round"/>` +
      // two soft cream horns
      `<path d="M 28 -28.2 Q 27.4 -33.6 30 -35.4 Q 31.8 -31.4 30.8 -27.8 Z" fill="${belly}"/>` +
      `<path d="M 34.8 -28.6 Q 35.4 -34 38 -34.8 Q 38.6 -30.6 36.8 -27.6 Z" fill="${belly}"/>` +
      // big kind eye set forward, with a little brow
      `<circle cx="31.5" cy="-23" r="3.2" fill="#fff"/>` +
      `<circle cx="32.4" cy="-22.6" r="1.7" fill="#2b2440"/>` +
      `<circle cx="33" cy="-23.3" r="0.6" fill="#fff"/>` +
      `<path d="M 28.4 -27.2 Q 31.2 -28.6 34 -27.4" stroke="${dark}" stroke-width="1" fill="none" stroke-linecap="round" opacity="0.6"/>` +
      `<circle cx="28.6" cy="-16" r="2.2" fill="#f9a8c9" opacity="0.9"/>` +
      `<circle cx="53" cy="-15" r="2" fill="#fff" opacity="0.5"><animate attributeName="opacity" values="0;0.6;0" dur="3s" repeatCount="indefinite"/></circle>` +
      `</g></g>`;
  }

  // A smiling five-point star with sleepy blinking eyes and a soft glow.
  function starChar(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const col = o.color || "#ffe36e", edge = "#ffc23a";
    const g = uid("starc");
    let pts = "";
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 22 : 9;
      const a = (Math.PI * i) / 5 - Math.PI / 2;
      pts += `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)} `;
    }
    return `<g transform="translate(${x} ${y}) scale(${sc})"><g class="tap hint-bob" data-sound="twinkle">` +
      `<defs>${glowFilter(g, 3)}</defs>` +
      `<polygon points="${pts.trim()}" fill="${col}" stroke="${edge}" stroke-width="1.5" filter="url(#${g})"/>` +
      `<polygon points="${pts.trim()}" transform="scale(0.62)" fill="${shade(col, 24)}" opacity="0.75"/>` +
      `<ellipse cx="-5" cy="-2" rx="2.1" ry="2.6" fill="#2b2440">` +
      `<animate attributeName="ry" values="2.6;2.6;0.4;2.6" keyTimes="0;0.9;0.94;1" dur="4.8s" repeatCount="indefinite"/></ellipse>` +
      `<ellipse cx="5" cy="-2" rx="2.1" ry="2.6" fill="#2b2440">` +
      `<animate attributeName="ry" values="2.6;2.6;0.4;2.6" keyTimes="0;0.9;0.94;1" dur="4.8s" repeatCount="indefinite"/></ellipse>` +
      `<circle cx="-4.3" cy="-2.7" r="0.7" fill="#fff"/>` +
      `<circle cx="5.7" cy="-2.7" r="0.7" fill="#fff"/>` +
      `<circle cx="-8" cy="3" r="2.4" fill="#ff9ec2" opacity="0.6"/>` +
      `<circle cx="8" cy="3" r="2.4" fill="#ff9ec2" opacity="0.6"/>` +
      `<path d="M -4 3 Q 0 6.5 4 3" stroke="#b5466e" stroke-width="1.5" fill="none" stroke-linecap="round"/>` +
      `</g></g>`;
  }

  /* -----------------------------------------------------------
     2. The stories
     Each page: { text, art() }  — art returns an inner-SVG string.
     ----------------------------------------------------------- */

  const STORIES = [
    {
      id: "giggly-ghost",
      sticker: "👻",
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
      sticker: "🎭",
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
      sticker: "🦇",
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
      sticker: "🎃",
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
      sticker: "🏰",
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
    },

    {
      id: "rainbow-unicorn",
      sticker: "🦄",
      title: "Princess Ellie & the Rainbow Unicorn",
      color: "#c86fd6",
      cover: () => svg(dayBg({sunX:70}) + rainbow(300, 150, 0.7) +
        unicorn({x:150,y:210,scale:1.5})),
      pages: [
        {
          text: "One sunny morning, Princess Ellie skipped through the meadow picking flowers.",
          art: () => svg(dayBg({sunX:330}) +
            kid(Object.assign({x:200, y:250, scale:1.7}, ELLIE)) +
            flower(90, 250, 1.4, "#ff5d8f") + flower(320, 255, 1.3, "#ffd166"))
        },
        {
          text: "Behind a grassy hill, something SPARKLED. It was a unicorn with a rainbow mane!",
          art: () => svg(dayBg({sunX:70}) + rainbow(300, 140, 0.6) +
            unicorn({x:190, y:235, scale:1.9}))
        },
        {
          text: "“Hello!” said Ellie softly. The shy unicorn was named Sparkle.",
          art: () => svg(dayBg({sunX:330}) +
            kid(Object.assign({x:120, y:250, scale:1.3}, ELLIE)) +
            unicorn({x:270, y:245, scale:1.4, flip:true}))
        },
        {
          text: "Sparkle knelt down low. Up, up, up — Ellie climbed onto her soft back!",
          art: () => svg(dayBg({sunX:60}) +
            unicorn({x:180, y:250, scale:2}) +
            kid(Object.assign({x:196, y:205, scale:0.9}, ELLIE)))
        },
        {
          text: "They galloped over a rainbow, high above the fluffy white clouds. Wheee!",
          art: () => svg(dayBg({sunX:330, sunY:56}) + rainbow(200, 120, 1) +
            cloud(80, 210, 1.1) + cloud(320, 220, 0.9) +
            // whoosh! wind streaks and a sparkle trail behind them
            `<g stroke="#ffffff" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.5">` +
            `<path d="M 112 172 q 20 -3 38 0"/><path d="M 98 190 q 24 -4 44 0"/><path d="M 118 206 q 18 -2 32 0"/>` +
            `<animate attributeName="opacity" values="0.2;0.6;0.2" dur="1.8s" repeatCount="indefinite"/></g>` +
            star(138, 168, 5, 0) + star(116, 198, 4, 3) + star(150, 218, 4, 6) +
            unicorn({x:200, y:190, scale:1.4}) +
            kid(Object.assign({x:211, y:167, scale:0.63,
              extra: `<path d="M -13 -52 C -19 -55 -25 -55 -30 -51.5" stroke="#6b4a2a" stroke-width="4.6" fill="none" stroke-linecap="round"/>` +
                `<path d="M -14 -46.5 C -20 -48.5 -25 -47.5 -28.5 -44.5" stroke="#6b4a2a" stroke-width="3.4" fill="none" stroke-linecap="round"/>`
            }, ELLIE)))
        },
        {
          text: "Back home for tea, Sparkle promised to visit every single sunny day. Yay!",
          art: () => svg(dayBg({sunset:true, sunX:70}) +
            kid(Object.assign({x:120, y:250, scale:1.3}, ELLIE)) +
            unicorn({x:275, y:245, scale:1.4, flip:true}))
        },
        { end: true, text: "The End. 🦄", art: () => endArtDay([unicorn({x:200,y:180,scale:1.9})]) }
      ]
    },

    {
      id: "dancing-dragon",
      sticker: "🐉",
      title: "The Dragon Who Loved to Dance",
      color: "#3ea856",
      cover: () => svg(dayBg({sunX:60}) + castle(310,250,0.55) +
        dragon({x:150,y:220,scale:1.6})),
      pages: [
        {
          text: "High on a green hill stood a happy castle, where a princess loved to dance.",
          art: () => svg(dayBg({sunX:330}) + castle(200, 250, 1))
        },
        {
          text: "One morning a friendly green dragon peeked over the garden wall. Hello!",
          art: () => svg(dayBg({sunX:70}) +
            dragon({x:210, y:235, scale:2}))
        },
        {
          text: "“I want to dance too,” said the dragon, “but my feet are much too BIG!”",
          art: () => svg(dayBg({sunX:330}) +
            dragon({x:200, y:245, scale:2.2}))
        },
        {
          text: "Princess Jeannie showed him how. Stomp, stomp, TWIRL! “You can do it!”",
          art: () => svg(dayBg({sunX:60}) +
            kid(Object.assign({x:120, y:250, scale:1.4, crown:false}, JEANNIE)) +
            dragon({x:270, y:240, scale:1.5, flip:true}))
        },
        {
          text: "Soon everyone danced — Ellie, Cory, and the dragon spun round and round.",
          art: () => svg(dayBg({sunX:330}) +
            kid(Object.assign({x:100, y:252, scale:1.2}, ELLIE)) +
            kid(Object.assign({x:200, y:252, scale:1.2}, CORY)) +
            dragon({x:300, y:245, scale:1.3, flip:true}))
        },
        {
          text: "The dragon danced so happily that bright little flowers grew where he stepped!",
          art: () => svg(dayBg({sunX:70}) +
            dragon({x:180, y:245, scale:1.6}) +
            flower(80, 255, 1.4, "#ff5d8f") + flower(300, 258, 1.3, "#b266e0") +
            flower(340, 248, 1.1, "#ffd166"))
        },
        { end: true, text: "The End. 🐉", art: () => endArtDay([dragon({x:200,y:175,scale:1.9})]) }
      ]
    },

    {
      id: "sleepy-star",
      sticker: "⭐",
      title: "The Little Star Who Wanted to Sleep",
      color: "#3a4fb0",
      cover: () => svg(nightBg({moonX:300}) + starChar({x:150,y:150,scale:1.6})),
      pages: [
        {
          text: "When the sky grew dark, all the little stars twinkled awake — all but one.",
          art: () => svg(nightBg({moonX:330}) +
            starChar({x:200, y:150, scale:1.7}))
        },
        {
          text: "“I'm so sleepy,” yawned the littlest star, “but the sky is far too bright to nap.”",
          art: () => svg(nightBg({moon:false}) +
            starChar({x:200, y:150, scale:2}))
        },
        {
          text: "The kind moon smiled. “I will help you, little one,” she whispered warmly.",
          art: () => svg(nightBg({moonX:120, moonY:80, moonR:44}) +
            starChar({x:270, y:170, scale:1.4}))
        },
        {
          text: "One by one, the stars tucked a soft, cozy cloud around their sleepy friend.",
          art: () => svg(nightBg({moonX:330}) +
            cloud(120, 180, 1.2) + cloud(300, 200, 1) +
            starChar({x:200, y:150, scale:1.5}))
        },
        {
          text: "The little star closed her eyes and floated off into the coziest dream.",
          art: () => svg(nightBg({moonX:200, moonY:70, moonR:46}) +
            cloud(150, 210, 1.1) +
            starChar({x:210, y:150, scale:1.6}))
        },
        {
          text: "Goodnight, little star. Goodnight, moon. Goodnight, you too. Sweet dreams.",
          art: () => svg(nightBg({moonX:300, moonY:64, moonR:40}) +
            starChar({x:150, y:150, scale:1}) + starChar({x:250, y:200, scale:0.7, color:"#fff3b0"}))
        },
        { end: true, text: "The End. ⭐", art: () => endArt("#3a4fb0", [starChar({x:200,y:150,scale:1.8})]) }
      ]
    },

    {
      id: "boo-birthday",
      sticker: "🎂",
      title: "Boo the Ghost's Spooky Birthday",
      color: "#7a3fb0",
      cover: () => svg(nightBg({moonX:300}) + castle(310,250,0.5) +
        ghost({x:150,y:150,scale:1.3}) + pumpkin({x:255,y:235,scale:1.1})),
      pages: [
        {
          text: "Guess what? Tonight is Boo the ghost's birthday, and the castle is ready to party!",
          art: () => svg(nightBg({moonX:330}) + castle(200, 252, 1) +
            pumpkin({x:80, y:255, scale:1}) + pumpkin({x:320, y:258, scale:0.9}))
        },
        {
          text: "Princess Ellie hung purple streamers while Midnight the cat chased a balloon.",
          art: () => svg(nightBg({moonX:70}) +
            kid(Object.assign({x:130, y:245, scale:1.3}, ELLIE)) +
            cat({x:270, y:248, scale:1.4}))
        },
        {
          text: "The little bats flew in with a big cake lit by flickering pumpkin candles. Yum!",
          art: () => svg(nightBg({moonX:330}) +
            bat({x:90, y:90, scale:1}) + bat({x:300, y:80, scale:0.8, color:"#9a7ae0"}) +
            pumpkin({x:200, y:245, scale:1.3}))
        },
        {
          text: "“Surprise!” Everyone popped out. Boo giggled so hard he did a loop-the-loop!",
          art: () => svg(nightBg({moon:false}) +
            ghost({x:200, y:150, scale:1.9}))
        },
        {
          text: "They sang the spooky birthday song, and Boo blew out every candle. Whoosh!",
          art: () => svg(nightBg({moonX:320}) +
            kid(Object.assign({x:110, y:245, scale:1.1}, ELLIE)) +
            ghost({x:210, y:150, scale:1.2}) +
            pumpkin({x:305, y:250, scale:0.9}))
        },
        {
          text: "“Best. Birthday. EVER!” said Boo, hugging all his friends goodnight. 💜",
          art: () => svg(nightBg({moonX:200, moonY:72, moonR:44}) + castle(330,255,0.45) +
            kid(Object.assign({x:120, y:250, scale:1.1}, ELLIE)) +
            ghost({x:250, y:150, scale:1.1}))
        },
        { end: true, text: "The End. 🎂", art: () => endArt("#7a3fb0", [ghost({x:200,y:150,scale:1.4}), pumpkin({x:280,y:210,scale:0.8})]) }
      ]
    },

    {
      id: "rainbow-dress",
      sticker: "🌈",
      title: "Ellie's Rainbow Dress",
      color: "#c2497f",
      cover: () => svg(dayBg({sunX:320}) + rainbow(90, 150, 0.55) +
        kid(Object.assign({x:230,y:240,scale:1.5}, ELLIE, {dress:"#b98cff"}))),
      pages: [
        {
          text: "Today was the royal picnic, and Princess Ellie could not choose a dress to wear.",
          art: () => svg(dayBg({sunX:330}) + castle(320, 250, 0.55) +
            kid(Object.assign({x:150, y:245, scale:1.5}, ELLIE)))
        },
        {
          text: "First she twirled in a PINK dress, pink as the roses in the castle garden.",
          art: () => svg(dayBg({sunX:70}) +
            kid(Object.assign({x:200, y:240, scale:1.6}, ELLIE, {dress:"#ff5d8f"})) +
            flower(90, 250, 1.5, "#ff5d8f") + flower(320, 255, 1.3, "#ff8ec9"))
        },
        {
          text: "Next she tried a YELLOW dress, bright and warm like her friend the sun.",
          art: () => svg(dayBg({sunX:310, sunY:70, sunR:36}) +
            kid(Object.assign({x:170, y:240, scale:1.6}, ELLIE, {dress:"#ffd166"})))
        },
        {
          text: "Then a BLUE dress, blue as the summer sky where the little birds sing.",
          art: () => svg(dayBg({sunX:70}) + cloud(280, 90, 0.9) +
            kid(Object.assign({x:180, y:240, scale:1.6}, ELLIE, {dress:"#4aa3ff"})))
        },
        {
          text: "And a GREEN dress, green as the grassy hill where her dragon friend dances.",
          art: () => svg(dayBg({sunX:330}) +
            kid(Object.assign({x:130, y:245, scale:1.4}, ELLIE, {dress:"#3ddc84"})) +
            dragon({x:280, y:240, scale:1.4, flip:true}))
        },
        {
          text: "Then Sparkle the unicorn trotted up, carrying a dress with EVERY colour on it!",
          art: () => svg(dayBg({sunX:60}) + rainbow(300, 130, 0.5) +
            kid(Object.assign({x:120, y:245, scale:1.3}, ELLIE)) +
            unicorn({x:270, y:240, scale:1.5, flip:true}))
        },
        {
          text: "Ellie twirled to the picnic in her rainbow dress. Pink, yellow, blue, green — hooray!",
          art: () => svg(dayBg({sunset:true, sunX:70}) + rainbow(200, 120, 0.9) +
            kid(Object.assign({x:200, y:240, scale:1.5}, ELLIE, {dress:"#b98cff"})) +
            kid(Object.assign({x:90, y:250, scale:1.1, crown:false}, JEANNIE)) +
            kid(Object.assign({x:315, y:250, scale:1.1}, CORY)))
        },
        { end: true, text: "The End. 🌈", art: () => endArtDay([
            kid(Object.assign({x:170,y:200,scale:1.5}, ELLIE, {dress:"#b98cff"})),
            unicorn({x:290, y:200, scale:1.2, flip:true})]) }
      ]
    },

    {
      id: "hide-and-seek",
      sticker: "🐱",
      title: "Midnight's Moonlit Hide-and-Seek",
      color: "#2e7d5b",
      cover: () => svg(nightBg({moonX:300}) + castle(320,255,0.5) +
        cat({x:150,y:225,scale:1.6}) + pumpkin({x:260,y:245,scale:0.9})),
      pages: [
        {
          text: "One quiet night, Midnight the cat meowed: “Let's all play hide-and-seek!”",
          art: () => svg(nightBg({moonX:330}) + castle(320, 252, 0.5) +
            cat({x:170, y:235, scale:1.7}))
        },
        {
          text: "Princess Ellie hid her eyes and counted. One… two… three! “Ready or not, here I come!”",
          art: () => svg(nightBg({moonX:70}) + castle(320, 252, 0.5) +
            kid(Object.assign({x:150, y:240, scale:1.5}, ELLIE)))
        },
        {
          text: "Ellie peeked behind a glowing pumpkin — and found Boo the giggly ghost! One friend found.",
          art: () => svg(nightBg({moonX:330}) +
            pumpkin({x:150, y:240, scale:1.4}) + ghost({x:270, y:160, scale:1.2}))
        },
        {
          text: "She looked up at the twinkly sky — and spotted the little bat by the moon! Two friends found.",
          art: () => svg(nightBg({moonX:220, moonY:80, moonR:40}) +
            bat({x:150, y:120, scale:1.2}) +
            kid(Object.assign({x:120, y:245, scale:1.2}, ELLIE)))
        },
        {
          text: "She tip-toed to the pumpkin patch — and there was baby Kieran, giggling! Three friends found.",
          art: () => svg(nightBg({moonX:70}) +
            pumpkin({x:90, y:250, scale:0.9}) + pumpkin({x:310, y:255, scale:0.8}) +
            babyPumpkin(210, 225, 1.2))
        },
        {
          text: "But where, oh where, was Midnight? Ellie looked high and low, low and high…",
          art: () => svg(nightBg({moon:false}) + castle(280, 250, 0.7) +
            kid(Object.assign({x:110, y:245, scale:1.4}, ELLIE)))
        },
        {
          text: "A-ha! A swishy tail peeked out by the castle door. “Found you, Midnight!” Four friends found!",
          art: () => svg(nightBg({moonX:330}) + castle(250, 250, 0.8) +
            cat({x:280, y:255, scale:1.1}) +
            kid(Object.assign({x:120, y:245, scale:1.3}, ELLIE)))
        },
        {
          text: "One, two, three, four! Everyone found, everyone giggling. Midnight purred: “Best game ever.”",
          art: () => svg(nightBg({moonX:200, moonY:70, moonR:42}) +
            ghost({x:90, y:150, scale:0.8}) + bat({x:310, y:100, scale:0.8, color:"#9a7ae0"}) +
            cat({x:250, y:248, scale:1.2}) +
            kid(Object.assign({x:140, y:245, scale:1.2}, ELLIE)))
        },
        { end: true, text: "The End. 🐱", art: () => endArt("#2e7d5b", [cat({x:200,y:200,scale:1.7}), ghost({x:290,y:150,scale:0.8})]) }
      ]
    }
  ];


  /* -----------------------------------------------------------
     2b. Vocabulary — the "big words" worth stopping on.
     VOCAB[storyId][pageIndex] = { word: "what it means" }
     A word listed here gets a soft yellow underline in the text;
     tapping it shows a kid-sized meaning AND replays the
     storyteller from that word. Meanings are written for a 6–7
     year old (Jeannie & Cory), read aloud for Ellie.
     Keys must be lower-case and match a word that really is on
     that page (matching ignores punctuation and capitals).
     ----------------------------------------------------------- */
  const VOCAB = {
    "giggly-ghost": {
      0: { sparkly: "covered in tiny lights that shine and shimmer" },
      1: { teeny: "very, very small" },
      3: { twirled: "spun round and round on the spot" }
    },
    "costume-party": {
      0: { costume: "clothes you put on to look like somebody else" },
      1: { pointy: "narrow and sharp at the top, like a triangle" },
      2: { brave: "willing to do something even when it feels scary" },
      4: { bobbed: "moved up and down, the way an apple floats in water" }
    },
    "lost-bat": {
      0: { squeak: "a tiny, high, squeaky sound" },
      2: { worry: "to feel afraid that something bad might happen" },
      3: { twinkly: "shining on and off, like little stars" }
    },
    "pumpkin-smile": {
      0: { crisp: "cool and fresh, the way autumn air feels", patch: "a piece of ground where one kind of plant grows" },
      2: { sniffled: "sniffed a little, the way you do before you cry" },
      4: { moonset: "when the moon goes down, the way the sun sets" }
    },
    "castle-sleepover": {
      0: { cozy: "warm, soft and snug" },
      2: { marshmallows: "soft, squishy white sweets you toast on a fire" },
      4: { drifted: "floated away slowly and gently" }
    },
    "rainbow-unicorn": {
      0: { meadow: "a wide field full of grass and wild flowers" },
      2: { shy: "quiet and a bit nervous around somebody new" },
      4: { galloped: "ran fast, the way a horse runs" }
    },
    "dancing-dragon": {
      1: { peeked: "took a quick little look over or around something" },
      3: { twirl: "one quick spin all the way round" },
      5: { happily: "in a way that shows you feel glad" }
    },
    "sleepy-star": {
      0: { twinkled: "shone on and off, like a tiny light blinking" },
      2: { whispered: "spoke in a very soft, quiet voice" },
      3: { tucked: "folded something snugly around you to keep you warm" }
    },
    "boo-birthday": {
      1: { streamers: "long ribbons of paper hung up to make a party pretty" },
      2: { flickering: "a light that keeps dancing and jumping about" },
      3: { surprise: "something lovely you did not know was coming" }
    },
    "rainbow-dress": {
      0: { royal: "belonging to a king or a queen" },
      5: { trotted: "walked along with quick, bouncy steps" }
    },
    "hide-and-seek": {
      4: { "tip-toed": "walked very quietly on the very tips of your toes" },
      6: { swishy: "swinging quickly from side to side" }
    }
  };

  /* -----------------------------------------------------------
     2c. Story questions — a little "did you listen?" quiz that
     opens from the last page. Two questions per story, each with
     three picture answers. THE FIRST CHOICE IS THE RIGHT ONE —
     the reader shuffles them before showing them.

     `ask:` strings are narrated too: audio/build_audio.py renders
     them to audio/<storyId>-q<n>.mp3 on the CI runner. Until that
     has run, the questions are simply shown without a voice.
     ----------------------------------------------------------- */
  const QUIZZES = [
    { id: "giggly-ghost", qs: [
      { ask: "Who did Princess Ellie meet at her castle?",
        choices: [["👻","A giggly little ghost"], ["🐉","A big green dragon"], ["🦄","A rainbow unicorn"]] },
      { ask: "What did Ellie and Boo do all around the castle?",
        choices: [["💃","They danced and twirled"], ["😴","They went straight to sleep"], ["🏊","They went for a swim"]] }
    ]},
    { id: "costume-party", qs: [
      { ask: "What was big sister Jeannie dressed up as?",
        choices: [["🧙","A friendly witch"], ["🐱","A black cat"], ["👻","A floating ghost"]] },
      { ask: "Who was dressed up as a tiny pumpkin?",
        choices: [["👶","Baby Kieran"], ["🛡️","Cory the knight"], ["👸","Princess Ellie"]] }
    ]},
    { id: "lost-bat", qs: [
      { ask: "Why was the baby bat so sad?",
        choices: [["😢","She was lost and could not find her mama"], ["🍪","She had eaten all her cookies"], ["😴","It was past her bedtime"]] },
      { ask: "Who came along to help Ellie search?",
        choices: [["🐱","Midnight the cat"], ["🐉","A dancing dragon"], ["⭐","A sleepy little star"]] }
    ]},
    { id: "pumpkin-smile", qs: [
      { ask: "What had the little pumpkin lost?",
        choices: [["😀","Its smile"], ["🎩","Its hat"], ["🌱","Its green stem"]] },
      { ask: "How did Princess Ellie help the little pumpkin?",
        choices: [["✨","She drew a big grin with her wand"], ["🍰","She baked it a cake"], ["🎵","She sang it a song"]] }
    ]},
    { id: "castle-sleepover", qs: [
      { ask: "What did Cory build at the sleepover?",
        choices: [["🛏️","The tallest pillow fort ever"], ["🏰","A castle out of sand"], ["🚀","A rocket ship"]] },
      { ask: "What did Boo the ghost bring along to share?",
        choices: [["🍡","Marshmallows"], ["🍕","Pizza"], ["🎈","Balloons"]] }
    ]},
    { id: "rainbow-unicorn", qs: [
      { ask: "What was the shy unicorn's name?",
        choices: [["✨","Sparkle"], ["🌙","Moonbeam"], ["🌸","Rosie"]] },
      { ask: "Where did Ellie and the unicorn gallop together?",
        choices: [["🌈","Over a rainbow, above the clouds"], ["🌊","Under the deep blue sea"], ["🕳️","Down into a dark cave"]] }
    ]},
    { id: "dancing-dragon", qs: [
      { ask: "What did the friendly dragon really want to do?",
        choices: [["💃","Learn to dance"], ["🍞","Bake some bread"], ["😴","Have a long nap"]] },
      { ask: "What grew on the ground where the dragon stepped?",
        choices: [["🌷","Bright little flowers"], ["❄️","Cold snowballs"], ["🪨","Big grey rocks"]] }
    ]},
    { id: "sleepy-star", qs: [
      { ask: "What did the littlest star want more than anything?",
        choices: [["😴","A cozy nap"], ["🍪","A midnight cookie"], ["🎈","A shiny balloon"]] },
      { ask: "What did the other stars tuck around their sleepy friend?",
        choices: [["☁️","A soft, cozy cloud"], ["🧣","A stripy scarf"], ["🍃","A pile of leaves"]] }
    ]},
    { id: "boo-birthday", qs: [
      { ask: "Whose birthday were they all celebrating?",
        choices: [["👻","Boo the giggly ghost"], ["🐱","Midnight the cat"], ["👸","Princess Ellie"]] },
      { ask: "Who carried the birthday cake into the castle?",
        choices: [["🦇","The little bats"], ["🐉","The green dragon"], ["🦄","Sparkle the unicorn"]] }
    ]},
    { id: "rainbow-dress", qs: [
      { ask: "Which dress did Ellie finally wear to the picnic?",
        choices: [["🌈","The rainbow dress"], ["💛","The yellow dress"], ["💙","The blue dress"]] },
      { ask: "Who brought Ellie the dress with every colour on it?",
        choices: [["🦄","Sparkle the unicorn"], ["🐉","The dancing dragon"], ["👻","Boo the ghost"]] }
    ]},
    { id: "hide-and-seek", qs: [
      { ask: "How many friends did Ellie find altogether?",
        choices: [["4️⃣","Four friends"], ["2️⃣","Two friends"], ["6️⃣","Six friends"]] },
      { ask: "Who was the very last friend to be found?",
        choices: [["🐱","Midnight the cat"], ["👻","Boo the ghost"], ["🦇","The little bat"]] }
    ]}
  ];

  // Painterly cover pictures that the art pipeline has already rendered
  // (games/spooky-stories/art/<id>-cover.png). Stories not listed here keep
  // their hand-drawn SVG cover, so nothing ever 404s.
  const COVER_ART = {
    "giggly-ghost": 1, "costume-party": 1, "lost-bat": 1,
    "pumpkin-smile": 1, "castle-sleepover": 1
  };

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

  // "The End" celebration scene (night version)
  function endArt(color, characters) {
    return svg(nightBg({moonX:330, moonY:60}) +
      characters.join("") +
      `<text x="200" y="250" text-anchor="middle" font-size="34" font-weight="bold"
        fill="#fff3b0" font-family="Trebuchet MS, sans-serif">🌟 Yay! 🌟</text>`);
  }

  // "The End" celebration scene (sunny daytime version)
  function endArtDay(characters) {
    return svg(dayBg({sunX:70, sunY:56}) + rainbow(200, 120, 0.9) +
      characters.join("") +
      `<text x="200" y="255" text-anchor="middle" font-size="34" font-weight="bold"
        fill="#ffffff" stroke="#ff8ec9" stroke-width="0.7"
        font-family="Trebuchet MS, sans-serif">🌟 Yay! 🌟</text>`);
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
    neigh:   () => { tone(392,.14,"sawtooth",0,.09); tone(523,.12,"sawtooth",.1,.09); tone(440,.18,"sawtooth",.2,.08); },
    roar:    () => { tone(150,.3,"sawtooth",0,.11); tone(120,.34,"sawtooth",.12,.09); tone(200,.2,"sine",.05,.06); },
    page:    () => { tone(520,.12,"triangle",0,.08); tone(700,.12,"triangle",.06,.07); },
    yay:     () => { [523,659,784,1047].forEach((f,i)=>tone(f,.3,"triangle",i*0.12,.14)); }
  };
  function playSound(name) { (SOUNDS[name] || SOUNDS.chime)(); }

  /* -----------------------------------------------------------
     4. Narration — the pre-rendered neural-voice clips
     (warm Piper "lessac" voice, in audio/<storyId>-<page>.mp3),
     plus word-by-word highlighting timed to that voice so a new
     reader can follow along with their eyes while they listen.
     ----------------------------------------------------------- */

  // audio/manifest.js (written by audio/build_audio.py) lists the clips that
  // actually exist and how long the voice spends on each sentence. Checking it
  // first means we never request an mp3 the audio pipeline has not rendered
  // yet: brand-new story text is simply silent, with no failed requests.
  const CLIPS = window.SPOOKY_NARRATION || null;
  function clipTiming(name) {
    if (!CLIPS) return [];   // no manifest at all — be optimistic and try
    return Object.prototype.hasOwnProperty.call(CLIPS, name) ? (CLIPS[name] || []) : null;
  }
  function hasClip(name) { return clipTiming(name) !== null; }

  const narrator = new Audio();
  narrator.preload = "auto";

  let currentClip = "";      // the clip loaded into the <audio> right now
  let karaokeOn = false;     // highlight page words while this clip plays?

  // Play clip `name` from `fromTime` seconds. Returns false when there is no
  // such clip (the page then just stays quiet and the words stay on screen).
  function narrate(name, fromTime, karaoke) {
    if (!hasClip(name)) { stopNarration(); return false; }
    karaokeOn = !!karaoke;
    if (currentClip !== name) {
      try { narrator.pause(); } catch (e) {}
      narrator.src = "audio/" + name + ".mp3";
      currentClip = name;
    }
    try { narrator.currentTime = fromTime || 0; } catch (e) { /* metadata not in yet */ }
    const pr = narrator.play();
    if (pr && pr.catch) pr.catch(() => { paintWord(-1); });
    tickKaraoke();
    return true;
  }
  function stopNarration() {
    karaokeOn = false;
    try { narrator.pause(); } catch (e) {}
    paintWord(-1);
  }
  narrator.addEventListener("ended", () => paintWord(-1));
  narrator.addEventListener("error", () => paintWord(-1));

  /* ---- word highlighting ------------------------------------
     We know the clip's real length (from the <audio> element) and,
     once CI has rendered it, the length of every sentence inside
     it. Time inside a sentence is shared out between its words in
     proportion to how long they are, which lands each word close
     enough that a 6-year-old can follow the bouncing highlight.
     ----------------------------------------------------------- */
  const SENTENCE_GAP = 0.45;              // matches build_audio.py
  const ENDS_SENTENCE = /[.!?]+["'”’)\]]*$/;
  let wordSpans = [];      // the tappable <span class="w"> words, in order
  let wordTimes = null;    // parallel [{a: startSec, b: endSec}]
  let litWord = -1, rafId = 0;

  // lower-case a word with its punctuation trimmed off ("“Boo!”" -> "boo").
  // Returns "" for tokens with no letters at all (a lone emoji), which are
  // never spoken and so never highlighted.
  function normWord(t) {
    return String(t).toLowerCase()
      .replace(/^[^0-9a-zÀ-ɏ]+/, "")
      .replace(/[^0-9a-zÀ-ɏ]+$/, "");
  }

  function buildTiming(dur, sents) {
    if (!wordSpans.length || !isFinite(dur) || dur <= 0.05) return null;
    const weights = wordSpans.map(sp => normWord(sp.textContent).length + 1);

    // group the words into sentences the same way build_audio.py does
    const groups = [];
    let g = [];
    wordSpans.forEach((sp, i) => {
      g.push(i);
      if (ENDS_SENTENCE.test(sp.textContent)) { groups.push(g); g = []; }
    });
    if (g.length) groups.push(g);

    const gw = groups.map(gr => gr.reduce((s, i) => s + weights[i], 0));
    const starts = [], lens = [];
    if (sents && sents.length === groups.length) {
      // exact sentence lengths from the render
      let t = 0;
      for (let k = 0; k < groups.length; k++) {
        starts.push(t); lens.push(sents[k]); t += sents[k] + SENTENCE_GAP;
      }
      const modelled = t - SENTENCE_GAP;
      if (modelled > 0.05) {           // stretch to the clip's real length
        const f = dur / modelled;
        for (let k = 0; k < groups.length; k++) { starts[k] *= f; lens[k] *= f; }
      }
    } else {
      // estimate: take the sentence gaps out, share the rest out by length
      const gaps = SENTENCE_GAP * (groups.length - 1);
      const speech = Math.max(dur - gaps, dur * 0.55);
      const gapEach = groups.length > 1 ? (dur - speech) / (groups.length - 1) : 0;
      const totalW = gw.reduce((a, b) => a + b, 0) || 1;
      let t = 0;
      for (let k = 0; k < groups.length; k++) {
        const len = speech * gw[k] / totalW;
        starts.push(t); lens.push(len); t += len + gapEach;
      }
    }

    const times = new Array(wordSpans.length);
    groups.forEach((gr, k) => {
      const tw = gw[k] || 1;
      let t = starts[k];
      gr.forEach(i => {
        const d = lens[k] * weights[i] / tw;
        times[i] = { a: t, b: t + d };
        t += d;
      });
    });
    return times;
  }

  function ensureTiming() {
    if (!wordTimes) wordTimes = buildTiming(narrator.duration, clipTiming(currentClip));
    return wordTimes;
  }

  function wordAt(t) {
    if (!wordTimes) return -1;
    let hit = -1;
    for (let i = 0; i < wordTimes.length; i++) {
      if (wordTimes[i] && wordTimes[i].a <= t) hit = i; else break;
    }
    return hit;
  }

  function paintWord(i) {
    if (i === litWord) return;
    if (litWord >= 0 && wordSpans[litWord]) wordSpans[litWord].classList.remove("now");
    litWord = i;
    if (i >= 0 && wordSpans[i]) wordSpans[i].classList.add("now");
  }

  function tickKaraoke() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    if (!karaokeOn) { paintWord(-1); return; }
    if (narrator.paused || narrator.ended) { paintWord(-1); return; }
    if (ensureTiming()) paintWord(wordAt(narrator.currentTime));
    rafId = requestAnimationFrame(tickKaraoke);
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
  const countEl = document.getElementById("page-count");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const againBtn = document.getElementById("again-btn");
  const quizBtn = document.getElementById("quiz-btn");
  const endActions = document.getElementById("end-actions");
  const homeBtn = document.getElementById("home-btn");
  const readBtn = document.getElementById("read-btn");
  const selfBtn = document.getElementById("self-btn");
  const shelfEl = document.getElementById("sticker-shelf");
  const wordCard = document.getElementById("word-card");
  const wordTitleEl = document.getElementById("word-title");
  const wordDefEl = document.getElementById("word-def");
  const wordCloseBtn = document.getElementById("word-close");
  const quizEl = document.getElementById("quiz");
  const quizProgEl = document.getElementById("quiz-progress");
  const quizAskEl = document.getElementById("quiz-ask");
  const quizChoicesEl = document.getElementById("quiz-choices");
  const quizFbEl = document.getElementById("quiz-feedback");
  const quizDoneEl = document.getElementById("quiz-done");

  const reduceMotion = !!(window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* ---- saved state -------------------------------------------
     spooky-stories-done    { storyId: true }  finished stories
     spooky-stories-marks   { storyId: page }  a bookmark PER story
     spooky-stories-quiz    { storyId: true }  story-question badges
     spooky-stories-prefs   { self: bool }     "I'll read it myself"
     (spooky-stories-resume was the old single, whole-game bookmark —
      it is migrated into -marks the first time we see it.)
     ----------------------------------------------------------- */
  function readJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
  }
  function writeJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  const STORE_KEY = "spooky-stories-done";
  const MARKS_KEY = "spooky-stories-marks";
  const RESUME_KEY = "spooky-stories-resume";
  const BADGE_KEY = "spooky-stories-quiz";
  const PREFS_KEY = "spooky-stories-prefs";

  function loadDone() { return readJSON(STORE_KEY, {}); }
  function saveDone(d) { writeJSON(STORE_KEY, d); }
  function loadBadges() { return readJSON(BADGE_KEY, {}); }
  function saveBadges(b) { writeJSON(BADGE_KEY, b); }

  function loadMarks() {
    const marks = readJSON(MARKS_KEY, {});
    // one-time migration of the old "one bookmark for the whole game" key
    let old = null;
    try { old = JSON.parse(localStorage.getItem(RESUME_KEY)); } catch (e) { old = null; }
    if (old) {
      if (old.id && old.page > 0 && !(old.id in marks)) marks[old.id] = old.page;
      writeJSON(MARKS_KEY, marks);
      try { localStorage.removeItem(RESUME_KEY); } catch (e) {}
    }
    return marks;
  }
  function setMark(storyId, pageIndex) {
    const marks = loadMarks();
    if (pageIndex > 0) marks[storyId] = pageIndex; else delete marks[storyId];
    writeJSON(MARKS_KEY, marks);
  }

  let prefs = readJSON(PREFS_KEY, { self: false });
  function savePrefs() { writeJSON(PREFS_KEY, prefs); }

  const QUIZ_BY_ID = {};
  QUIZZES.forEach(q => { QUIZ_BY_ID[q.id] = q.qs; });

  let current = null;   // current story object
  let page = 0;

  function vocabFor(storyId, pageIndex) {
    const v = VOCAB[storyId];
    return (v && v[pageIndex]) || null;
  }
  function clipName(storyId, pageIndex) { return storyId + "-" + pageIndex; }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // ---- Sticker shelf: one shiny sticker per finished story ----
  function buildShelf() {
    if (!shelfEl) return;
    const done = loadDone();
    const badges = loadBadges();
    const earned = STORIES.filter(s => done[s.id]).length;
    const brains = STORIES.filter(s => badges[s.id]).length;
    let slots = "";
    STORIES.forEach(s => {
      slots += done[s.id]
        ? `<span class="slot earned" title="${s.title}">${s.sticker || "⭐"}</span>`
        : `<span class="slot" title="A sticker is waiting in “${s.title}”">✩</span>`;
    });
    const allDone = earned === STORIES.length;
    shelfEl.innerHTML =
      `<p class="shelf-title">🌟 My Sticker Shelf 🌟</p>` +
      `<div class="shelf-row">${slots}</div>` +
      (allDone
        ? `<p class="shelf-msg all-done">🏆 WOW! You collected EVERY sticker! 🏆</p>`
        : `<p class="shelf-msg">${earned} of ${STORIES.length} stickers — finish a story to earn one!</p>`) +
      `<p class="shelf-msg">🧠 ${brains} of ${STORIES.length} thinking-cap badges — answer a story's questions to earn one.</p>`;
  }

  // ---- Library ----
  function buildLibrary() {
    const done = loadDone();
    const badges = loadBadges();
    const marks = loadMarks();
    buildShelf();
    grid.innerHTML = "";
    STORIES.forEach(story => {
      const last = story.pages.length - 1;   // the "The End" page
      const card = document.createElement("button");
      card.className = "story-card";
      card.style.background = `linear-gradient(160deg, ${shade(story.color, 25)}, ${shade(story.color, -40)})`;
      const at = marks[story.id];
      const cover = COVER_ART[story.id]
        ? `<img class="cover-img" src="art/${story.id}-cover.png" alt="" loading="lazy">`
        : story.cover();
      const badgeRow = (done[story.id] ? "⭐" : "") + (badges[story.id] ? "🧠" : "");
      card.innerHTML =
        `${badgeRow ? `<span class="badges" aria-hidden="true">${badgeRow}</span>` : ""}
         <span class="cover-svg">${cover}</span>
         <h2>${story.title}</h2>
         <p>${last} pages • Tap to read</p>
         ${at ? `<span class="bookmark">🔖 Keep reading — page ${at + 1}</span>` : ""}`;
      card.setAttribute("aria-label",
        story.title + ", " + last + " pages" +
        (at ? ", bookmarked at page " + (at + 1) : "") +
        (done[story.id] ? ", finished" : ""));
      card.addEventListener("click", () => openStory(story));
      grid.appendChild(card);
    });
  }

  // ---- Open / render a story ----
  function openStory(story) {
    current = story;
    page = 0;
    // pick up where this story was left off (never on the "The End" page)
    const marks = loadMarks();
    const at = marks[story.id];
    if (at > 0 && at < story.pages.length - 1) page = at;
    titleEl.textContent = story.title;
    library.style.display = "none";
    reader.classList.add("active");
    audio(); // unlock the chimes on this tap gesture
    closeQuiz();
    renderPage(false);
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  function goHome() {
    stopNarration();
    closeQuiz();
    hideWordCard();
    current = null;
    reader.classList.remove("active");
    library.style.display = "";
    buildLibrary();
  }

  /* Lay the page text out as individual tappable words. Every word can be
     tapped to hear the storyteller say it again from there; the handful of
     "big words" also carry a kid-sized meaning. */
  function layoutText(text, defs) {
    textEl.innerHTML = "";
    wordSpans = []; wordTimes = null; litWord = -1;
    const tokens = String(text || "").trim().split(/\s+/);
    tokens.forEach((tok, i) => {
      if (i) textEl.appendChild(document.createTextNode(" "));
      const norm = normWord(tok);
      if (!norm) { textEl.appendChild(document.createTextNode(tok)); return; }
      const sp = document.createElement("span");
      sp.className = "w";
      sp.textContent = tok;
      sp.dataset.i = String(wordSpans.length);
      sp.tabIndex = 0;
      sp.setAttribute("role", "button");
      if (defs && defs[norm]) {
        sp.classList.add("vocab");
        sp.setAttribute("aria-label", norm + " — a big word, tap to hear it and see what it means");
      } else {
        sp.setAttribute("aria-label", norm + " — tap to hear this word");
      }
      textEl.appendChild(sp);
      wordSpans.push(sp);
    });
  }

  function renderPage(animate) {
    const p = current.pages[page];
    hideWordCard();
    closeQuiz();

    // art — a page may carry a generated image (img) or an art() function
    // (the art is hand-authored vector SVG, drawn directly).
    if (p.img) {
      artEl.innerHTML = '<img class="scene-img" src="' + p.img + '" alt="" onerror="this.style.display=\'none\'">';
    } else {
      artEl.innerHTML = p.art();
    }
    if (animate && !reduceMotion) {
      artEl.classList.remove("turning"); void artEl.offsetWidth; artEl.classList.add("turning");
    }

    // text, split into tappable words
    layoutText(p.text, vocabFor(current.id, page));

    // dots + a plain "page 3 of 6" for readers and screen readers
    dotsEl.innerHTML = "";
    current.pages.forEach((_, i) => {
      const d = document.createElement("span");
      if (i === page) d.className = "on";
      dotsEl.appendChild(d);
    });
    const lastPage = current.pages.length - 1;
    countEl.textContent = p.end ? "🌟 The End 🌟" : "Page " + (page + 1) + " of " + lastPage;

    // hint only when there are tappable things
    const hasTaps = artEl.querySelector(".tap");
    hintEl.style.visibility = (hasTaps || p.end) ? "visible" : "hidden";
    hintEl.textContent = p.end ? "🎉 Hooray! 🎉" : "✨ Tap the picture to play — or tap a word to hear it! ✨";

    // buttons
    prevBtn.disabled = page === 0;
    nextBtn.textContent = p.end ? "📚 More stories" : "Turn the page ▶";
    endActions.hidden = !p.end;
    againBtn.style.display = p.end ? "" : "none";
    quizBtn.style.display = (p.end && QUIZ_BY_ID[current.id]) ? "" : "none";

    // hook up tappable art
    wireTaps();

    // celebrate + award the story's sticker + remember progress
    if (p.end) {
      const done = loadDone();
      const wasNew = !done[current.id];
      done[current.id] = true; saveDone(done);
      setMark(current.id, 0);   // finished — start fresh next time
      const allDone = STORIES.every(s => done[s.id]);
      hintEl.textContent = wasNew
        ? (allDone
          ? "🏆 You earned the LAST sticker — your shelf is FULL! 🏆"
          : `🎉 You earned a ${current.sticker || "⭐"} sticker! 🎉`)
        : `🎉 Hooray! You read it again! ${current.sticker || "⭐"} 🎉`;
      playSound("yay");
      confetti();
      if (wasNew && allDone) { confetti(); setTimeout(confetti, 700); }
    } else {
      setMark(current.id, page);
    }

    // read this page aloud — unless the reader is in "I'll read it myself" mode
    if (prefs.self) stopNarration();
    else narrate(clipName(current.id, page), 0, true);
  }

  // ---- tapping a word: hear it again, and learn the big ones ----
  function speakWordAt(i) {
    if (!current) return;
    const name = clipName(current.id, page);
    if (!hasClip(name)) return;
    // make sure we know where each word sits inside the clip
    if (currentClip !== name) { narrate(name, 0, true); return; }
    ensureTiming();
    const t = (wordTimes && wordTimes[i]) ? Math.max(0, wordTimes[i].a - 0.06) : 0;
    narrate(name, t, true);
  }

  function onWordActivate(sp) {
    const i = Number(sp.dataset.i);
    const norm = normWord(sp.textContent);
    const defs = vocabFor(current && current.id, page);
    if (defs && defs[norm]) showWordCard(norm, defs[norm]); else hideWordCard();
    speakWordAt(i);
  }

  textEl.addEventListener("click", ev => {
    const sp = ev.target && ev.target.closest && ev.target.closest(".w");
    if (sp && current) onWordActivate(sp);
  });
  textEl.addEventListener("keydown", ev => {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    const sp = ev.target && ev.target.closest && ev.target.closest(".w");
    if (!sp || !current) return;
    ev.preventDefault(); ev.stopPropagation();
    onWordActivate(sp);
  });

  function showWordCard(word, def) {
    wordTitleEl.textContent = "📖 " + word;
    wordDefEl.textContent = def;
    wordCard.hidden = false;
  }
  function hideWordCard() { wordCard.hidden = true; }
  wordCloseBtn.addEventListener("click", hideWordCard);

  // ---- the story questions ----
  let quizQs = null, quizI = 0;
  const PRAISE = ["⭐ That's it!", "🌟 Exactly right!", "💜 Well listened!", "✨ Spot on!", "🎉 Yes — well done!"];

  function openQuiz() {
    if (!current) return;
    const qs = QUIZ_BY_ID[current.id];
    if (!qs || !qs.length) return;
    quizQs = qs; quizI = 0;
    hideWordCard();
    stopNarration();
    quizEl.hidden = false;
    quizDoneEl.hidden = true;
    quizBtn.style.display = "none";
    showQuestion();
    try { quizEl.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" }); } catch (e) {}
  }

  function closeQuiz() {
    quizEl.hidden = true;
    quizDoneEl.hidden = true;
    quizChoicesEl.innerHTML = "";
    quizAskEl.textContent = "";
    quizProgEl.textContent = "";
    quizFbEl.textContent = "";
    quizQs = null;
  }

  function showQuestion() {
    const q = quizQs[quizI];
    quizProgEl.textContent = "Question " + (quizI + 1) + " of " + quizQs.length;
    quizAskEl.textContent = q.ask;
    quizFbEl.textContent = "";
    quizChoicesEl.innerHTML = "";
    shuffle(q.choices.map((c, i) => i)).forEach(ci => {
      const c = q.choices[ci];
      const b = document.createElement("button");
      b.type = "button";
      b.className = "qa";
      if (ci === 0) b.dataset.correct = "1";
      const e = document.createElement("span");
      e.className = "qe"; e.setAttribute("aria-hidden", "true"); e.textContent = c[0];
      const t = document.createElement("span");
      t.className = "qt"; t.textContent = c[1];
      b.appendChild(e); b.appendChild(t);
      b.addEventListener("click", () => answerQuiz(b, ci === 0));
      quizChoicesEl.appendChild(b);
    });
    // the question is narrated too, once the audio pipeline has rendered it
    narrate(current.id + "-q" + quizI, 0, false);
  }

  function answerQuiz(btn, right) {
    if (btn.disabled) return;
    if (!right) {
      btn.classList.add("wrong");
      btn.disabled = true;
      quizFbEl.textContent = "Not quite — have another look at the pictures!";
      playSound("boing");
      return;
    }
    Array.prototype.forEach.call(quizChoicesEl.children, b => { b.disabled = true; });
    btn.classList.add("right");
    quizFbEl.textContent = PRAISE[Math.floor(Math.random() * PRAISE.length)];
    playSound("twinkle");
    setTimeout(() => {
      if (!quizQs) return;
      quizI++;
      if (quizI < quizQs.length) showQuestion(); else finishQuiz();
    }, 800);
  }

  function finishQuiz() {
    quizChoicesEl.innerHTML = "";
    quizAskEl.textContent = "";
    quizProgEl.textContent = "";
    quizFbEl.textContent = "";
    const badges = loadBadges();
    const isNew = !badges[current.id];
    badges[current.id] = true; saveBadges(badges);
    quizDoneEl.textContent = isNew
      ? "🧠 You answered every question — a thinking-cap badge is yours!"
      : "🧠 All correct again — you really know this story!";
    quizDoneEl.hidden = false;
    playSound("yay");
    confetti();
  }

  function wireTaps() {
    const taps = artEl.querySelectorAll(".tap");
    taps.forEach(node => {
      node.addEventListener("click", ev => {
        ev.stopPropagation();
        if (!reduceMotion) {
          node.classList.remove("wiggle");
          void node.getBoundingClientRect();   // force a reflow so it replays
          node.classList.add("wiggle");
          node.addEventListener("animationend", () => node.classList.remove("wiggle"), { once: true });
        }
        playSound(node.getAttribute("data-sound") || "chime");
        sparkleAt(ev);
      });
    });
  }

  // spawn a few sparkle emojis where the child tapped
  const SPARKLES = ["✨", "⭐", "💜", "🌟", "💫"];
  function sparkleAt(ev) {
    if (reduceMotion) return;   // the CSS stops the animation, so don't spawn
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
    if (reduceMotion) return;
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
    if (!current) return;
    const p = current.pages[page];
    if (p.end) { goHome(); return; }
    if (page < current.pages.length - 1) {
      page++;
      playSound("page");
      renderPage(true);
    }
  }
  function prevPage() {
    if (!current) return;
    if (page > 0) { page--; playSound("page"); renderPage(true); }
  }

  // ---- wire up controls ----
  nextBtn.addEventListener("click", nextPage);
  prevBtn.addEventListener("click", prevPage);
  againBtn.addEventListener("click", () => {
    if (!current) return;
    page = 0;
    playSound("page");
    renderPage(true);
  });
  quizBtn.addEventListener("click", openQuiz);
  homeBtn.addEventListener("click", goHome);
  readBtn.addEventListener("click", () => {
    if (!current) return;
    narrate(clipName(current.id, page), 0, true);
  });

  // "Read it to me" <-> "I'll read it myself" — Jeannie can switch the voice
  // off and read the page herself, then tap 🔊 (or any word) to check.
  function paintSelfBtn() {
    selfBtn.setAttribute("aria-pressed", prefs.self ? "true" : "false");
    selfBtn.textContent = prefs.self ? "🙋 I'll read it myself" : "🔊 Read it to me";
  }
  selfBtn.addEventListener("click", () => {
    prefs.self = !prefs.self;
    savePrefs();
    paintSelfBtn();
    if (prefs.self) stopNarration();
    else if (current) narrate(clipName(current.id, page), 0, true);
  });
  paintSelfBtn();

  // keyboard niceties (arrows / space / escape) — but never steal the key
  // from a focused button or a word the reader is about to tap
  document.addEventListener("keydown", e => {
    if (!current) return;
    if (e.key === "Escape") { goHome(); return; }
    if (e.key === "ArrowRight") { e.preventDefault(); nextPage(); return; }
    if (e.key === "ArrowLeft") { e.preventDefault(); prevPage(); return; }
    // Space turns the page too — but not while a button or a word has focus,
    // where space is already how you press the thing you are standing on.
    const t = e.target;
    if (e.key === " " && !(t && t.closest && t.closest("button, .w, input, textarea, select"))) {
      e.preventDefault(); nextPage();
    }
  });

  // stop reading if the page is hidden/closed
  window.addEventListener("pagehide", stopNarration);
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopNarration(); });

  buildLibrary();
})();
