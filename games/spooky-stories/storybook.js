/* ===========================================================
   Spooky Princess Stories — a read-aloud, tap-to-play storybook
   for Ellie (3) and her siblings.

   What it teaches: listening & early literacy (hear words read
   aloud while seeing the picture), story sequencing (turning the
   page), and cause-and-effect (tap a character → it reacts).

   Friendly-spooky only: giggly ghosts, sweet bats, glowing
   pumpkins — nothing scary. Pure HTML/CSS/vanilla JS, no assets:
   every illustration is drawn with inline SVG.
   =========================================================== */

(function () {
  "use strict";

  /* -----------------------------------------------------------
     1. SVG illustration toolkit
     Reusable little drawings, composed into full scenes.
     Coordinate space for every scene: 0 0 400 300.
     ----------------------------------------------------------- */

  // unique-id counter so gradients never collide between the many
  // SVGs that coexist in the page (covers + the live reader scene).
  let UID = 0;

  // A deep-night background with optional moon + stars + ground.
  function nightBg(opts) {
    opts = opts || {};
    const u = "u" + (UID++);
    const stars = opts.stars !== false;
    const moon = opts.moon !== false;
    let s = `
      <defs>
        <radialGradient id="sky${u}" cx="50%" cy="30%" r="90%">
          <stop offset="0%" stop-color="#3b2a78"/>
          <stop offset="60%" stop-color="#241a52"/>
          <stop offset="100%" stop-color="#140d2e"/>
        </radialGradient>
        <radialGradient id="moon${u}" cx="40%" cy="40%" r="70%">
          <stop offset="0%" stop-color="#fff6c7"/>
          <stop offset="100%" stop-color="#ffd95e"/>
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#sky${u})"/>`;
    if (moon) {
      const mx = opts.moonX || 320, my = opts.moonY || 64, mr = opts.moonR || 38;
      s += `<circle cx="${mx}" cy="${my}" r="${mr + 10}" fill="#ffe98a" opacity="0.18"/>
            <circle class="tap hint-bob" data-sound="chime" cx="${mx}" cy="${my}" r="${mr}" fill="url(#moon${u})"/>
            <circle cx="${mx - 12}" cy="${my - 8}" r="5" fill="#f4c84a" opacity=".5"/>
            <circle cx="${mx + 10}" cy="${my + 6}" r="7" fill="#f4c84a" opacity=".45"/>
            <circle cx="${mx + 4}" cy="${my - 14}" r="3.5" fill="#f4c84a" opacity=".5"/>`;
    }
    if (stars) {
      const pts = [[40,40],[90,80],[150,30],[210,60],[60,130],[260,40],[110,150],[300,120],[30,90],[190,110]];
      pts.forEach((p, i) => { s += star(p[0], p[1], i % 2 ? 6 : 8, i); });
    }
    if (opts.ground !== false) {
      s += `<path d="M0 250 Q 100 230 200 248 T 400 244 V300 H0 Z" fill="#1b1140"/>
            <path d="M0 262 Q 120 248 240 262 T 400 258 V300 H0 Z" fill="#241854"/>`;
    }
    return s;
  }

  function star(x, y, size, i) {
    const r = size / 2;
    return `<g transform="translate(${x} ${y})"><path class="tap" data-sound="twinkle"
      d="M0 ${-r} L ${r*0.3} ${-r*0.3} L ${r} 0 L ${r*0.3} ${r*0.3} L 0 ${r} L ${-r*0.3} ${r*0.3} L ${-r} 0 L ${-r*0.3} ${-r*0.3} Z"
      fill="#fff3b0" opacity="0.95"/></g>`;
  }

  // A storybook castle silhouette with glowing windows.
  function castle(x, y, scale) {
    scale = scale || 1;
    return `<g transform="translate(${x} ${y}) scale(${scale})">
      <g fill="#3a2a6b">
        <rect x="-70" y="-70" width="140" height="80"/>
        <rect x="-90" y="-90" width="32" height="100"/>
        <rect x="58" y="-90" width="32" height="100"/>
        <rect x="-18" y="-110" width="36" height="120"/>
        <path d="M-90 -90 l16 -22 l16 22 Z"/>
        <path d="M58 -90 l16 -22 l16 22 Z"/>
        <path d="M-18 -110 l18 -24 l18 24 Z"/>
      </g>
      <g fill="#ffd166">
        <rect x="-80" y="-70" width="12" height="16" rx="2"/>
        <rect x="68" y="-70" width="12" height="16" rx="2"/>
        <rect x="-7" y="-92" width="14" height="18" rx="3"/>
        <rect x="-46" y="-44" width="14" height="20" rx="3"/>
        <rect x="32" y="-44" width="14" height="20" rx="3"/>
      </g>
      <path d="M-12 10 v-30 a12 12 0 0 1 24 0 v30 Z" fill="#241854"/>
      <g fill="#ffadcf"><circle cx="-74" cy="-112" r="3"/><circle cx="74" cy="-112" r="3"/><circle cx="0" cy="-136" r="3"/></g>
    </g>`;
  }

  // A friendly princess / sibling. dress + head + crown.
  function kid(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const dress = o.dress || "#b266e0";
    const dress2 = o.dress2 || shade(dress, -18);
    const hair = o.hair || "#5a3a22";
    const skin = o.skin || "#ffd9b8";
    const crown = o.crown !== false;
    const sound = o.sound || "giggle";
    let extra = o.extra || "";
    return `<g transform="translate(${x} ${y}) scale(${sc})"><g class="tap hint-bob" data-sound="${sound}">
      <ellipse cx="0" cy="6" rx="30" ry="7" fill="#000" opacity="0.18"/>
      <!-- dress -->
      <path d="M0 -44 C 18 -40 26 -10 30 4 Q 0 12 -30 4 C -26 -10 -18 -40 0 -44 Z" fill="${dress}"/>
      <path d="M0 -44 C 10 -40 14 -10 0 4 Q 0 12 0 4 Z" fill="${dress2}" opacity=".4"/>
      <!-- arms -->
      <circle cx="-26" cy="-22" r="6" fill="${skin}"/>
      <circle cx="26" cy="-22" r="6" fill="${skin}"/>
      <!-- head -->
      <circle cx="0" cy="-58" r="15" fill="${skin}"/>
      <path d="M-15 -60 a15 15 0 0 1 30 0 q -15 -16 -30 0 Z" fill="${hair}"/>
      <path d="M-15 -58 q -6 16 -2 26 q -8 -4 -8 -20 Z" fill="${hair}"/>
      <path d="M15 -58 q 6 16 2 26 q 8 -4 8 -20 Z" fill="${hair}"/>
      <circle cx="-5.5" cy="-58" r="2.1" fill="#2b2440"/>
      <circle cx="5.5" cy="-58" r="2.1" fill="#2b2440"/>
      <circle cx="-8.5" cy="-52" r="2.4" fill="#ff9ec2" opacity=".7"/>
      <circle cx="8.5" cy="-52" r="2.4" fill="#ff9ec2" opacity=".7"/>
      <path d="M-5 -50 q 5 5 10 0" stroke="#b5466e" stroke-width="2" fill="none" stroke-linecap="round"/>
      ${crown ? `<path d="M-11 -70 l0 -8 l5 5 l6 -8 l6 8 l5 -5 l0 8 Z" fill="#ffdd55" stroke="#e0b020" stroke-width="1"/>
        <circle cx="0" cy="-80" r="2" fill="#ff5d8f"/>` : ""}
      ${extra}
    </g></g>`;
  }

  // Friendly ghost (white, giggly).
  function ghost(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    return `<g transform="translate(${x} ${y}) scale(${sc})"><g class="tap hint-bob" data-sound="giggle">
      <ellipse cx="0" cy="40" rx="26" ry="7" fill="#000" opacity="0.12"/>
      <path d="M-30 6 a30 36 0 0 1 60 0 L30 34 q -7 -10 -15 0 q -8 10 -15 0 q -7 -10 -15 0 q -8 10 -15 0 Z"
        fill="#fdfdff" stroke="#d8d2ff" stroke-width="2"/>
      <circle cx="-10" cy="0" r="4.2" fill="#2b2440"/>
      <circle cx="10" cy="0" r="4.2" fill="#2b2440"/>
      <circle cx="-9" cy="-1.4" r="1.4" fill="#fff"/>
      <circle cx="11" cy="-1.4" r="1.4" fill="#fff"/>
      <ellipse cx="0" cy="10" rx="6" ry="7" fill="#7a5ad0"/>
      <circle cx="-17" cy="8" r="4" fill="#ffb3d1" opacity=".7"/>
      <circle cx="17" cy="8" r="4" fill="#ffb3d1" opacity=".7"/>
    </g></g>`;
  }

  // A little black cat with green eyes.
  function cat(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    return `<g transform="translate(${x} ${y}) scale(${sc})"><g class="tap hint-bob" data-sound="meow">
      <ellipse cx="0" cy="20" rx="22" ry="6" fill="#000" opacity="0.18"/>
      <path d="M-24 18 q -10 -4 -8 -16 q 4 6 10 6 Z" fill="#2a2440"/>
      <ellipse cx="0" cy="6" rx="20" ry="15" fill="#2a2440"/>
      <circle cx="0" cy="-14" r="13" fill="#2a2440"/>
      <path d="M-12 -22 l-4 -12 l12 6 Z" fill="#2a2440"/>
      <path d="M12 -22 l4 -12 l-12 6 Z" fill="#2a2440"/>
      <ellipse cx="-5" cy="-14" rx="2.6" ry="3.6" fill="#9bff9b"/>
      <ellipse cx="5" cy="-14" rx="2.6" ry="3.6" fill="#9bff9b"/>
      <path d="M-2 -8 l2 2 l2 -2 Z" fill="#ff9ec2"/>
    </g></g>`;
  }

  // A small friendly bat. baby = smaller, big eyes.
  function bat(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    const col = o.color || "#7a5ad0";
    return `<g transform="translate(${x} ${y}) scale(${sc})"><g class="tap hint-bob" data-sound="squeak">
      <path d="M0 0 q -22 -16 -38 -8 q 12 -2 14 8 q -10 0 -10 10 q 16 -8 30 0 Z" fill="${col}"/>
      <path d="M0 0 q 22 -16 38 -8 q -12 -2 -14 8 q 10 0 10 10 q -16 -8 -30 0 Z" fill="${col}"/>
      <circle cx="0" cy="2" r="12" fill="${shade(col,-12)}"/>
      <path d="M-8 -8 l-3 -7 l7 3 Z" fill="${shade(col,-12)}"/>
      <path d="M8 -8 l3 -7 l-7 3 Z" fill="${shade(col,-12)}"/>
      <circle cx="-4.5" cy="0" r="3.4" fill="#fff"/>
      <circle cx="4.5" cy="0" r="3.4" fill="#fff"/>
      <circle cx="-4.5" cy="0.6" r="1.7" fill="#2b2440"/>
      <circle cx="4.5" cy="0.6" r="1.7" fill="#2b2440"/>
      <path d="M-3 7 q 3 3 6 0" stroke="#2b2440" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    </g></g>`;
  }

  // A glowing jack-o-lantern (smiley, not scary).
  function pumpkin(o) {
    const x = o.x, y = o.y, sc = o.scale || 1;
    return `<g transform="translate(${x} ${y}) scale(${sc})"><g class="tap hint-bob" data-sound="boing">
      <ellipse cx="0" cy="26" rx="26" ry="6" fill="#000" opacity="0.18"/>
      <ellipse cx="0" cy="6" rx="30" ry="24" fill="#ff8c2e"/>
      <ellipse cx="-12" cy="6" rx="11" ry="24" fill="#ff7a14" opacity=".6"/>
      <ellipse cx="12" cy="6" rx="11" ry="24" fill="#ff7a14" opacity=".6"/>
      <rect x="-3" y="-26" width="6" height="12" rx="2" fill="#5a8a2e"/>
      <path d="M-14 -2 l8 6 l-8 0 Z" fill="#fff3b0"/>
      <path d="M14 -2 l-8 6 l8 0 Z" fill="#fff3b0"/>
      <path d="M-12 12 q 12 12 24 0 q -12 4 -24 0 Z" fill="#fff3b0"/>
    </g></g>`;
  }

  // A pointy (friendly) witch hat — used as a costume accessory.
  function witchHat(x, y, sc, col) {
    sc = sc || 1; col = col || "#5b3a93";
    return `<g transform="translate(${x} ${y}) scale(${sc})">
      <ellipse cx="0" cy="2" rx="26" ry="6" fill="${col}"/>
      <path d="M-16 0 q 2 -34 16 -44 q 4 24 14 44 Z" fill="${shade(col,10)}"/>
      <rect x="-16" y="-6" width="32" height="7" rx="3" fill="#ffd166"/>
      <circle cx="0" cy="-3" r="3" fill="#ff5d8f"/>
    </g>`;
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
  const CORY   = { dress: "#3ddc84", hair: "#4a3320", crown: false };

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
            kid(Object.assign({x:200, y:235, scale:1.7, extra: witchHat(0,-78,1.1)}, JEANNIE, {crown:false})))
        },
        {
          text: "Cory dressed up as a brave green knight. So strong!",
          art: () => svg(nightBg({moonX:330}) +
            kid(Object.assign({x:200, y:235, scale:1.7,
              extra: `<rect x="-14" y="-78" width="28" height="14" rx="3" fill="#9aa6b2"/><rect x="-3" y="-78" width="6" height="14" fill="#5a6470"/>`
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

  // a tiny baby in a pumpkin costume
  function babyPumpkin(x, y, sc) {
    return `<g transform="translate(${x} ${y}) scale(${sc})"><g class="tap hint-bob" data-sound="giggle">
      <ellipse cx="0" cy="22" rx="22" ry="5" fill="#000" opacity="0.18"/>
      <ellipse cx="0" cy="2" rx="24" ry="20" fill="#ff8c2e"/>
      <ellipse cx="-10" cy="2" rx="9" ry="20" fill="#ff7a14" opacity=".6"/>
      <ellipse cx="10" cy="2" rx="9" ry="20" fill="#ff7a14" opacity=".6"/>
      <rect x="-3" y="-22" width="6" height="9" rx="2" fill="#5a8a2e"/>
      <circle cx="0" cy="-6" r="13" fill="#ffd9b8"/>
      <path d="M-13 -8 a13 13 0 0 1 26 0 q -13 -12 -26 0 Z" fill="#ff8c2e"/>
      <circle cx="-5" cy="-6" r="1.9" fill="#2b2440"/>
      <circle cx="5" cy="-6" r="1.9" fill="#2b2440"/>
      <circle cx="-8" cy="-1" r="2" fill="#ff9ec2" opacity=".7"/>
      <circle cx="8" cy="-1" r="2" fill="#ff9ec2" opacity=".7"/>
      <path d="M-3 0 q 3 3 6 0" stroke="#b5466e" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    </g></g>`;
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
      pixelateInto(card.querySelector(".cover-svg"), story.cover());
    });
  }

  // Render a scene/cover SVG as crisp pixel art into `el` (SVG already shown as
  // an instant fallback; this swaps in the pixelated canvas once it's drawn).
  function pixelateInto(el, fullSvg) {
    if (!el || !window.Pixelate) return;
    Pixelate.toPixelCanvas(fullSvg, {
      vw: 400, vh: 300, block: 2,
      onready: function (canvas) { el.innerHTML = ""; el.appendChild(canvas); }
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

    // art — a page may carry a generated image (img) or an art() function;
    // the SVG shows instantly, then gets swapped for pixel art.
    if (p.img) {
      artEl.innerHTML = '<img class="scene-img" src="' + p.img + '" alt="" onerror="this.style.display=\'none\'">';
    } else {
      var full = p.art();
      artEl.innerHTML = full;
      pixelateInto(artEl, full);
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
