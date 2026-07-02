/* ===========================================================
   Choose Your Own Adventure — SHORT STORIES
   -----------------------------------------------------------
   The quick, gentle tales for the littlest readers. The two big
   epics (Block World & The Whispering Library) live in
   stories-long.js, which appends itself to window.STORIES.

   Node format (this file uses inline art() functions):
     { art: ()=>svg, text, choices:[{label,to}] }   // a page
     { art: ()=>svg, text, end:"Ending name" }       // an ending
   =========================================================== */
(function () {
  "use strict";
  const A = window.ART;

  /* =======================================================
     1) ELLIE & THE RAINBOW DRAGON  (3+, colours & counting)
     ======================================================= */
  const rainbow = {
    id: "rainbow",
    title: "Ellie & the Rainbow Dragon",
    emoji: "🐉",
    color: "#ff7eb6",
    ages: "3+",
    who: "Ellie",
    teaches: "colours, counting & kindness",
    blurb: "Help a little grey dragon find all its colours!",
    cover: () => A.skyDay({ hills: true }) + A.castle(320, 208, .55) +
      A.dragon({ x: 140, y: 150, scale: 1.3, color: "#b06ad9" }) +
      A.princess({ x: 70, y: 230, scale: 1, dress: "#ff5d8f" }),
    start: "meet",
    nodes: {
      meet: {
        art: () => A.meadow() + A.castle(330, 216, .5) +
          A.dragon({ x: 250, y: 200, scale: 1, color: "#b9b9c4", mood: "sad" }) +
          A.princess({ x: 90, y: 235, scale: 1.05, dress: "#ff5d8f" }),
        text: "Princess Ellie skips through the meadow. A little dragon sits all alone — and it is grey all over! It looks sad.",
        choices: [
          { label: "👋 Wave and say hello", to: "hello" },
          { label: "🌸 Pick it a flower", to: "flower" }
        ]
      },
      flower: {
        art: () => A.meadow() +
          A.dragon({ x: 250, y: 200, scale: 1, color: "#b9b9c4" }) +
          A.princess({ x: 110, y: 235, scale: 1.05, dress: "#ff5d8f" }) +
          A.flower(180, 210, "#ff5d8f"),
        text: "Ellie picks a pink flower and holds it out. The dragon sniffs it and smiles a tiny smile. \"Thank you,\" it whispers.",
        choices: [{ label: "💬 Ask what's wrong", to: "hello" }]
      },
      hello: {
        art: () => A.meadow() +
          A.dragon({ x: 250, y: 200, scale: 1.05, color: "#b9b9c4" }) +
          A.princess({ x: 110, y: 235, scale: 1.05, dress: "#ff5d8f" }),
        text: "\"I lost all my colours,\" sniffs the dragon. \"To get them back, I must eat the rainbow fruit. Which one should we find first?\"",
        choices: [
          { label: "🍎 Red apples", to: "red" },
          { label: "🫐 Blue berries", to: "blue" }
        ]
      },
      red: {
        art: () => A.meadow() + A.tree(320, 220, 1.1, "#3bb36a") +
      `<circle cx="302" cy="180" r="7" fill="#e8584f"/><circle cx="304.5" cy="177.5" r="2" fill="#fff" opacity=".85"/>` +
      `<circle cx="322" cy="163" r="7" fill="#e8584f"/><circle cx="324.5" cy="160.5" r="2" fill="#fff" opacity=".85"/>` +
      `<circle cx="341" cy="185" r="7" fill="#e8584f"/><circle cx="343.5" cy="182.5" r="2" fill="#fff" opacity=".85"/>` +
      A.dragon({ x: 220, y: 200, scale: 1.05, color: "#ff6b6b" }) +
      A.princess({ x: 90, y: 235, scale: 1, dress: "#ff5d8f" }),
        text: "They find shiny red apples. Count with Ellie: one… two… three! The dragon gobbles them up and its WINGS turn bright RED! What next?",
        choices: [
          { label: "🍌 Yellow bananas", to: "yellow" },
          { label: "🦋 Fly up now!", to: "flyEarly" }
        ]
      },
      blue: {
        art: () => A.meadow() +
      `<ellipse cx="150" cy="250" rx="34" ry="18" fill="#3d8f5f"/><ellipse cx="132" cy="242" rx="18" ry="12" fill="#4aa870"/><ellipse cx="164" cy="240" rx="20" ry="13" fill="#4aa870"/>` +
      `<circle cx="136" cy="246" r="6" fill="#4a6fd8"/><circle cx="138" cy="244" r="1.8" fill="#fff" opacity=".8"/>` +
      `<circle cx="153" cy="238" r="6" fill="#4a6fd8"/><circle cx="155" cy="236" r="1.8" fill="#fff" opacity=".8"/>` +
      `<circle cx="168" cy="248" r="6" fill="#4a6fd8"/><circle cx="170" cy="246" r="1.8" fill="#fff" opacity=".8"/>` +
      A.dragon({ x: 240, y: 200, scale: 1.05, color: "#5aa9ff" }) +
      A.princess({ x: 90, y: 235, scale: 1, dress: "#ff5d8f" }),
        text: "They find a bush of blueberries. Count them: one… two… three! Munch munch — the dragon's tail turns deep BLUE! What colour next?",
        choices: [
          { label: "🍌 Yellow bananas", to: "yellow" },
          { label: "🍎 Red apples", to: "red" }
        ]
      },
      yellow: {
        art: () => A.meadow() +
      A.dragon({ x: 235, y: 200, scale: 1.1, color: "#ffd23e" }) +
      A.princess({ x: 90, y: 235, scale: 1, dress: "#ff5d8f" }) +
      `<g transform="translate(150 246) rotate(-10)"><path d="M-14 -4 C-14 8 -4 14 8 12 C13 11 16 5 15 1 C13 6 5 8 -2 5 C-8 3 -10 -2 -9 -7 C-9 -10 -13 -9 -14 -4Z" fill="#ffd23e" stroke="#e0a92e" stroke-width="1"/><circle cx="-12" cy="-6" r="1.6" fill="#8a5a33"/><circle cx="14" cy="2" r="1.4" fill="#8a5a33"/></g>` +
      `<g transform="translate(186 256) rotate(14)"><path d="M-14 -4 C-14 8 -4 14 8 12 C13 11 16 5 15 1 C13 6 5 8 -2 5 C-8 3 -10 -2 -9 -7 C-9 -10 -13 -9 -14 -4Z" fill="#ffd23e" stroke="#e0a92e" stroke-width="1"/><circle cx="-12" cy="-6" r="1.6" fill="#8a5a33"/><circle cx="14" cy="2" r="1.4" fill="#8a5a33"/></g>`,
        text: "Sweet yellow bananas! One, two! The dragon's tummy glows sunny YELLOW. Just one more colour to go — let's get green!",
        choices: [{ label: "🌿 Green leaves!", to: "green" }]
      },
      green: {
        art: () => A.forest() +
      A.dragon({ x: 240, y: 210, scale: 1.15, color: "#7ed957" }) +
      A.princess({ x: 110, y: 248, scale: 1, dress: "#ff5d8f" }),
        text: "Crunchy green leaves make the dragon's tail GREEN. Red, yellow, green… Ellie claps. \"You're almost a rainbow! Ready to FLY?\"",
        choices: [{ label: "🌈 Yes — fly to the rainbow!", to: "rainbowEnd" }]
      },
      flyEarly: {
        art: () => A.skyDay({}) + A.cloud(120, 120, 1) + A.cloud(300, 90, .8) +
          A.dragon({ x: 200, y: 160, scale: 1.3, color: "#ff6b6b" }) +
          A.princess({ x: 200, y: 150, scale: .7, dress: "#ff5d8f", crown: true }),
        text: "Ellie hops on and the red dragon soars over the clouds! It isn't a whole rainbow yet — but flying with a friend is the best feeling in the world. ❤️",
        end: "A Red Sky Ride"
      },
      rainbowEnd: {
        art: () => A.skyDay({ sun: true }) + A.cloud(90, 90, .9) + A.cloud(320, 70, .8) +
      A.castle(330, 250, .5) +
      `<path d="M40 262 A 190 190 0 0 1 360 262" fill="none" stroke="#e8584f" stroke-width="8"/>
       <path d="M40 271 A 180 180 0 0 1 360 271" fill="none" stroke="#ffb142" stroke-width="8"/>
       <path d="M40 280 A 170 170 0 0 1 360 280" fill="none" stroke="#ffd166" stroke-width="8"/>
       <path d="M40 289 A 160 160 0 0 1 360 289" fill="none" stroke="#7ed957" stroke-width="8"/>
       <path d="M40 298 A 150 150 0 0 1 360 298" fill="none" stroke="#5aa9ff" stroke-width="8"/>` +
      A.boy({ x: 60, y: 268, scale: .75, shirt: "#3ddc84" }) +
      A.villager({ x: 120, y: 272, scale: .75 }) +
      A.dragon({ x: 200, y: 150, scale: 1.4, color: "#b06ad9" }) +
      `<circle cx="158" cy="122" r="4" fill="#e8584f"/><circle cx="200" cy="104" r="4" fill="#ffb142"/><circle cx="244" cy="120" r="4" fill="#ffd166"/><circle cx="240" cy="168" r="4" fill="#7ed957"/><circle cx="160" cy="168" r="4" fill="#5aa9ff"/>` +
      A.princess({ x: 200, y: 140, scale: .7, dress: "#ff5d8f", crown: true }),
        text: "WHOOSH! Every colour swirls together and the dragon shines like a RAINBOW! Ellie rides it over the castle while everyone cheers. What a sparkly day! 🌈",
        end: "Rainbow Flight"
      }
    }
  };

  /* =======================================================
     2) THE GREAT FAMILY CAMPOUT (all ages, togetherness)
     ======================================================= */
  const campout = {
    id: "campout",
    title: "The Great Family Campout",
    emoji: "🏕️",
    color: "#f4791f",
    ages: "All ages",
    who: "the whole family",
    teaches: "nature, teamwork & wonder",
    blurb: "A starry night, s'mores, and a little lost puppy!",
    cover: () => A.night({}) + A.tent(90, 240, 1, "#e8584f") + A.campfire(220, 240, 1.2) +
      A.puppy({ x: 320, y: 245, scale: .9 }),
    start: "camp",
    nodes: {
      camp: {
        art: () => A.night({}) + A.tent(80, 250, .9, "#e8584f") + A.tent(150, 252, .8, "#4a8fe0") +
      A.campfire(210, 250, 1) +
      A.princess({ x: 280, y: 256, scale: .8, dress: "#ff5d8f" }) +
      A.boy({ x: 330, y: 256, scale: .8, shirt: "#3ddc84" }) +
      A.baby({ x: 250, y: 262, scale: .75 }),
        text: "Under a million stars, the whole family sits by the campfire. Suddenly — a tiny WHIMPER comes from the dark woods. Baby Kieran points. What should they do?",
        choices: [
          { label: "🔦 Explore the woods together", to: "explore" },
          { label: "🍫 Stay and make s'mores", to: "smores" }
        ]
      },
      explore: {
        art: () => A.night({ moonX: 340, moonY: 50 }) +
      A.tree(45, 262, 1.1, "#1f5c3c") + A.tree(350, 258, 1.2, "#1a5236") + A.tree(210, 250, .75, "#246647") +
      `<path d="M163 252 L322 232 L322 270 Z" fill="#ffe9a8" opacity=".28"/>` +
      `<circle cx="292" cy="248" r="28" fill="#ffe9a8" opacity=".2"/>` +
      A.princess({ x: 95, y: 258, scale: .85, dress: "#ff5d8f" }) +
      A.boy({ x: 150, y: 260, scale: .85, shirt: "#3ddc84" }) +
      `<rect x="158" y="249" width="11" height="6" rx="2.4" fill="#8a8f9a"/>` +
      A.puppy({ x: 292, y: 252, scale: .9 }),
        text: "Flashlights on! Jeannie and Cory tip-toe between the trees. In a beam of light they find a shivering little PUPPY, all alone. Its big eyes look up at them.",
        choices: [
          { label: "🐶 Scoop it up to keep it warm", to: "warm" },
          { label: "🐾 Follow where it wants to go", to: "follow" }
        ]
      },
      smores: {
        art: () => A.night({}) + A.tree(42, 262, 1, "#1f5c3c") +
      A.owl({ x: 42, y: 194, scale: .6 }) +
      A.campfire(200, 250, 1.3) + A.smore(120, 225, 1) +
      A.princess({ x: 268, y: 256, scale: .85, dress: "#ff5d8f" }) +
      A.boy({ x: 90, y: 256, scale: .85, shirt: "#3ddc84" }) +
      A.puppy({ x: 335, y: 252, scale: .85 }),
        text: "Marshmallows toast to golden brown — squish them with chocolate! Cory counts the stars: 1, 2, 3… too many! An owl hoots (owls are awake at night). Then the puppy trots right into camp.",
        choices: [
          { label: "🌟 Make a wish on a shooting star", to: "wish" },
          { label: "🐶 Help the lost puppy", to: "warm" }
        ]
      },
      follow: {
        art: () => A.night({ moonX: 60, moonY: 48 }) +
      A.tree(38, 258, 1.05, "#1f5c3c") + A.tree(362, 255, 1.15, "#1a5236") +
      `<path d="M252 264 Q252 216 305 216 Q358 216 358 264 Z" fill="#5a4a33"/>` +
      `<path d="M284 264 Q284 234 305 234 Q326 234 326 264 Z" fill="#241a10"/>` +
      A.fox({ x: 268, y: 246, scale: 1 }) + A.fox({ x: 330, y: 252, scale: .6 }) +
      A.puppy({ x: 200, y: 252, scale: .85 }) +
      A.princess({ x: 88, y: 255, scale: .8, dress: "#ff5d8f" }) +
      A.boy({ x: 140, y: 257, scale: .8, shirt: "#3ddc84" }),
        text: "The puppy leads them to a cosy den where a gentle FOX family lives! The fox isn't scary at all — it had been keeping the lost puppy safe and warm all night. What kind neighbours!",
        choices: [{ label: "🦊 Thank the fox and head back", to: "foxEnd" }]
      },
      warm: {
        art: () => A.night({}) + A.campfire(220, 250, 1.1) +
      A.puppy({ x: 130, y: 248, scale: 1 }) +
      `<path d="M108 268 Q105 250 121 247 Q131 251 143 247 Q159 250 156 268 Q131 275 108 268Z" fill="#a368d8"/>` +
      `<path d="M115 263 Q131 268 149 263" stroke="#8a4fc0" stroke-width="2" fill="none" opacity=".7"/>` +
      A.princess({ x: 300, y: 256, scale: .8, dress: "#ff5d8f" }),
        text: "They wrap the puppy in a soft blanket by the fire. It stops shivering and licks Jeannie's nose! There's a little collar with a name tag. Should they check it?",
        choices: [
          { label: "🔖 Read the name tag", to: "tag" },
          { label: "🏡 Search for its family at dawn", to: "tag" }
        ]
      },
      tag: {
        art: () => A.skySunset() + A.tent(64, 252, .85, "#e8584f") +
      A.boy({ x: 118, y: 262, scale: .8, shirt: "#3ddc84" }) +
      A.princess({ x: 320, y: 262, scale: .8, dress: "#ff5d8f" }) +
      A.puppy({ x: 205, y: 258, scale: .95 }) +
      A.boy({ x: 240, y: 262, scale: .78, shirt: "#ffd166" }),
        text: "The tag says \"BISCUIT\" with a campsite number nearby! At sunrise the family walks Biscuit home, where a worried little kid bursts into a huge happy hug. Hooray!",
        choices: [{ label: "🎉 Celebrate the happy reunion", to: "reuniteEnd" }]
      },
      wish: {
        art: () => A.night({}) +
      `<path d="M40 60 L120 100" stroke="#fff3b0" stroke-width="3" stroke-linecap="round"/><circle cx="40" cy="60" r="4" fill="#fff"/>` +
      A.campfire(200, 250, 1.1) +
      A.princess({ x: 300, y: 256, scale: .8, dress: "#ff5d8f" }) +
      A.boy({ x: 90, y: 256, scale: .8, shirt: "#3ddc84" }) +
      A.baby({ x: 145, y: 262, scale: .7 }),
        text: "A shooting star streaks across the sky! Everyone squeezes their eyes shut and wishes together. Cory wishes the puppy finds its home — and in the morning, it does. Some wishes really do come true. 🌠",
        choices: [{ label: "🐶 See the puppy go home", to: "reuniteEnd" }]
      },
      foxEnd: {
        art: () => A.skyDay({}) + A.tent(90, 250, .9, "#e8584f") +
          A.fox({ x: 320, y: 250, scale: .85 }) +
          A.princess({ x: 130, y: 256, scale: .85, dress: "#ff5d8f" }) +
          A.boy({ x: 200, y: 256, scale: .85, shirt: "#3ddc84" }),
        text: "Back at camp, the family tells the tale of the kind woodland fox over breakfast. They learned that wild animals can be gentle and that helping each other is what families — and forests — do best. 🦊",
        end: "Friends of the Forest"
      },
      reuniteEnd: {
        art: () => A.skyDay({}) + A.tent(70, 250, .9, "#e8584f") + A.campfire(145, 252, .8) +
      A.boy({ x: 195, y: 258, scale: .85, shirt: "#3ddc84" }) +
      A.princess({ x: 300, y: 258, scale: .85, dress: "#ff5d8f" }) +
      A.princess({ x: 255, y: 260, scale: .7, dress: "#b06ad9" }) +
      A.baby({ x: 345, y: 264, scale: .7 }),
        text: "Biscuit is safely home, and the family heads back to camp for pancakes. Cory, Jeannie, Ellie and baby Kieran all agree: the best part of any adventure is doing it TOGETHER. The End — for now! ❤️",
        end: "Heroes of the Campout"
      }
    }
  };

  /* =======================================================
     3) PIZZA PLANET RESCUE (all ages, silly counting & space)
     ======================================================= */
  const pizza = {
    id: "pizza",
    title: "Pizza Planet Rescue",
    emoji: "🍕",
    color: "#ffb142",
    ages: "All ages",
    who: "everyone",
    teaches: "counting, colours & space facts",
    blurb: "Blast off to feed hungry aliens across the galaxy!",
    cover: () => A.space({}) + A.planet(310, 90, 36, "#e8584f") + A.planet(70, 220, 28, "#4a8fe0", true) +
      A.rocket({ x: 200, y: 170, scale: 1.3, color: "#e8584f", flame: true }),
    start: "launch",
    nodes: {
      launch: {
        art: () => A.space({}) + A.planet(320, 80, 30, "#e8584f") + A.planet(70, 90, 26, "#4a8fe0") +
          A.planet(200, 250, 34, "#ffd166", true) +
          A.rocket({ x: 200, y: 150, scale: 1.2, color: "#e8584f", flame: true }),
        text: "Captain, this is Pizza Control! Three planets full of HUNGRY aliens need lunch. Your pizza rocket is fuelled and ready. Which planet shall we zoom to first?",
        choices: [
          { label: "🔴 The Red Planet", to: "red" },
          { label: "🔵 The Blue Water Planet", to: "blue" }
        ]
      },
      red: {
        art: () => A.space({}) + A.planet(200, 250, 70, "#e8584f") +
      A.rocket({ x: 90, y: 110, scale: .8, color: "#ffd166" }) +
      A.alien({ x: 200, y: 200, scale: 1, color: "#ff9a8f" }) +
      `<ellipse cx="200" cy="190" rx="2.6" ry="3.4" fill="#fff"/><circle cx="200" cy="190.6" r="1.6" fill="#2b2440"/>` +
      A.alien({ x: 280, y: 215, scale: .8, color: "#ff7a6f" }) +
      `<ellipse cx="280" cy="207" rx="2.1" ry="2.7" fill="#fff"/><circle cx="280" cy="207.5" r="1.3" fill="#2b2440"/>`,
        text: "Touchdown on the Red Planet — it's dusty and red, a bit like Mars! The aliens here have THREE eyes and they're starving. They each want pizza. How shall we top it?",
        choices: [
          { label: "🌶️ Spicy hot-sauce stars", to: "spicy" },
          { label: "🧀 Extra gooey cheese", to: "cheese" }
        ]
      },
      blue: {
        art: () => {
      const jelly = (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-14 2 Q-14 -16 0 -16 Q14 -16 14 2 Q7 5 0 4 Q-7 5 -14 2Z" fill="${c}" opacity=".92"/><path d="M-10 4 q-2 8 1 14 M-4 5 q-1.5 9 1 15 M3 5 q2 9 -1 15 M9 4 q3 8 0 14" stroke="${c}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".8"/><circle cx="-4.5" cy="-6" r="1.8" fill="#2b2440"/><circle cx="4.5" cy="-6" r="1.8" fill="#2b2440"/><path d="M-3 -1.5 Q0 1 3 -1.5" stroke="#2b2440" stroke-width="1.4" fill="none" stroke-linecap="round"/><circle cx="-8" cy="-2.5" r="1.6" fill="#ff9ec2" opacity=".6"/><circle cx="8" cy="-2.5" r="1.6" fill="#ff9ec2" opacity=".6"/></g>`;
      return A.space({}) + A.planet(200, 250, 72, "#4a8fe0") +
        A.rocket({ x: 90, y: 100, scale: .8, color: "#e8584f" }) +
        jelly(210, 192, 1.1, "#9be15d") + jelly(288, 212, .85, "#ffd166");
    },
        text: "Splash! The Blue Planet is ALL water and the aliens are giggly jelly-fish folk who float everywhere. A normal pizza would sink! How do we serve it?",
        choices: [
          { label: "🥏 Toss it like a flying disc", to: "frisbee" },
          { label: "🚤 Float it on a pizza-boat", to: "boat" }
        ]
      },
      spicy: {
        art: () => A.space({}) + A.planet(200, 260, 70, "#e8584f") +
      `<circle cx="200" cy="224" r="24" fill="#e8a04a"/><circle cx="200" cy="224" r="19" fill="#ffd166"/>` +
      `<path d="M190 211 l2 4.2 4.6 .6 -3.4 3.2 .9 4.6 -4.1 -2.2 -4.1 2.2 .9 -4.6 -3.4 -3.2 4.6 -.6Z" fill="#e8584f"/>` +
      `<path d="M208 218 l2 4.2 4.6 .6 -3.4 3.2 .9 4.6 -4.1 -2.2 -4.1 2.2 .9 -4.6 -3.4 -3.2 4.6 -.6Z" fill="#e8584f"/>` +
      `<path d="M197 227 l2 4.2 4.6 .6 -3.4 3.2 .9 4.6 -4.1 -2.2 -4.1 2.2 .9 -4.6 -3.4 -3.2 4.6 -.6Z" fill="#e8584f"/>` +
      A.alien({ x: 140, y: 200, scale: 1, color: "#ff9a8f" }) +
      `<ellipse cx="140" cy="190" rx="2.6" ry="3.4" fill="#fff"/><circle cx="140" cy="190.6" r="1.6" fill="#2b2440"/>` +
      `<circle cx="122" cy="176" r="4" fill="#fff" opacity=".8"/><circle cx="117" cy="167" r="3" fill="#fff" opacity=".55"/><circle cx="158" cy="176" r="4" fill="#fff" opacity=".8"/><circle cx="163" cy="167" r="3" fill="#fff" opacity=".55"/>` +
      A.alien({ x: 260, y: 205, scale: 1, color: "#ff7a6f" }) +
      `<ellipse cx="260" cy="195" rx="2.6" ry="3.4" fill="#fff"/><circle cx="260" cy="195.6" r="1.6" fill="#2b2440"/>` +
      `<circle cx="242" cy="181" r="4" fill="#fff" opacity=".8"/><circle cx="237" cy="172" r="3" fill="#fff" opacity=".55"/><circle cx="278" cy="181" r="4" fill="#fff" opacity=".8"/><circle cx="283" cy="172" r="3" fill="#fff" opacity=".55"/>`,
        text: "Spicy star pizza! The three-eyed aliens take a bite and blast happy steam out of their ears like little whistles — TOOT TOOT! \"DELICIOUS!\" they cheer. On to the next stop!",
        choices: [{ label: "🚀 Blast to the last planet", to: "ring" }]
      },
      cheese: {
        art: () => A.space({}) + A.planet(200, 260, 70, "#e8584f") +
      `<circle cx="200" cy="228" r="26" fill="#e8a04a"/><circle cx="200" cy="228" r="21" fill="#ffd166"/>` +
      `<path d="M200 228 L200 207 M200 228 L220 221.5 M200 228 L212.3 245 M200 228 L187.7 245 M200 228 L180 221.5" stroke="#c9862e" stroke-width="2"/>` +
      `<path d="M234 194 L248 216 L226 216 Z" fill="#ffd166" stroke="#e8a04a" stroke-width="2"/>` +
      `<path d="M230 214 q0 8 -2 13 M240 215 q1 8 0 13" stroke="#ffe9a8" stroke-width="1.6" fill="none"/>` +
      A.alien({ x: 142, y: 202, scale: 1, color: "#ff9a8f" }) +
      `<ellipse cx="142" cy="192" rx="2.6" ry="3.4" fill="#fff"/><circle cx="142" cy="192.6" r="1.6" fill="#2b2440"/>` +
      A.alien({ x: 264, y: 206, scale: .9, color: "#ff7a6f" }) +
      `<ellipse cx="264" cy="197" rx="2.3" ry="3" fill="#fff"/><circle cx="264" cy="197.5" r="1.4" fill="#2b2440"/>`,
        text: "So much gooey cheese it stretches loooong strings! The aliens count their slices: 1, 2, 3, 4, 5 — five each! They do a happy three-eyed wink. Yummy success!",
        choices: [{ label: "🚀 Blast to the last planet", to: "ring" }]
      },
      frisbee: {
        art: () => {
      const jelly = (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-14 2 Q-14 -16 0 -16 Q14 -16 14 2 Q7 5 0 4 Q-7 5 -14 2Z" fill="${c}" opacity=".92"/><path d="M-10 4 q-2 8 1 14 M-4 5 q-1.5 9 1 15 M3 5 q2 9 -1 15 M9 4 q3 8 0 14" stroke="${c}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".8"/><circle cx="-4.5" cy="-6" r="1.8" fill="#2b2440"/><circle cx="4.5" cy="-6" r="1.8" fill="#2b2440"/><path d="M-3 -1.5 Q0 1 3 -1.5" stroke="#2b2440" stroke-width="1.4" fill="none" stroke-linecap="round"/><circle cx="-8" cy="-2.5" r="1.6" fill="#ff9ec2" opacity=".6"/><circle cx="8" cy="-2.5" r="1.6" fill="#ff9ec2" opacity=".6"/></g>`;
      return A.space({}) + A.planet(200, 270, 80, "#4a8fe0") +
        `<circle cx="200" cy="110" r="22" fill="#ffd166" stroke="#e8a04a" stroke-width="5"/>` +
        `<circle cx="193" cy="104" r="3.5" fill="#e8584f"/><circle cx="207" cy="113" r="3.5" fill="#e8584f"/><circle cx="199" cy="121" r="3" fill="#e8584f"/><circle cx="208" cy="100" r="3" fill="#e8584f"/>` +
        `<path d="M166 96 q-14 4 -22 12 M170 124 q-12 6 -16 14" stroke="#fff" stroke-width="2" opacity=".5" fill="none"/>` +
        `<path d="M258 152 l17 9 -18 9Z" fill="#ffd166" stroke="#e8a04a" stroke-width="1.6"/>` +
        jelly(130, 195, 1, "#9be15d") + jelly(272, 200, 1, "#ffd166");
    },
        text: "WHEE! Captain spins the pizza like a flying disc and the jelly-fish aliens leap and catch slices mid-float. Best pizza game in the galaxy! They wobble with joy.",
        choices: [{ label: "🚀 Blast to the last planet", to: "ring" }]
      },
      boat: {
        art: () => {
      const jelly = (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-14 2 Q-14 -16 0 -16 Q14 -16 14 2 Q7 5 0 4 Q-7 5 -14 2Z" fill="${c}" opacity=".92"/><path d="M-10 4 q-2 8 1 14 M-4 5 q-1.5 9 1 15 M3 5 q2 9 -1 15 M9 4 q3 8 0 14" stroke="${c}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".8"/><circle cx="-4.5" cy="-6" r="1.8" fill="#2b2440"/><circle cx="4.5" cy="-6" r="1.8" fill="#2b2440"/><path d="M-3 -1.5 Q0 1 3 -1.5" stroke="#2b2440" stroke-width="1.4" fill="none" stroke-linecap="round"/><circle cx="-8" cy="-2.5" r="1.6" fill="#ff9ec2" opacity=".6"/><circle cx="8" cy="-2.5" r="1.6" fill="#ff9ec2" opacity=".6"/></g>`;
      return A.space({}) + A.planet(200, 270, 80, "#4a8fe0") +
        `<path d="M170 180 h60 l-10 16 h-40Z" fill="#c98a4a"/>` +
        `<circle cx="200" cy="172" r="13" fill="#ffd166" stroke="#e8a04a" stroke-width="3"/>` +
        `<path d="M156 190 l-13 5 11 8Z" fill="#ffd166" stroke="#e8a04a" stroke-width="1.4"/>` +
        `<path d="M247 192 l14 4 -11 9Z" fill="#ffd166" stroke="#e8a04a" stroke-width="1.4"/>` +
        jelly(122, 208, 1, "#9be15d") + jelly(278, 212, .9, "#ffd166");
    },
        text: "A little pizza-boat sails across the water world, dropping warm slices to every floating alien. Not one slice gets soggy — clever Captain! They blow bubbly thank-yous.",
        choices: [{ label: "🚀 Blast to the last planet", to: "ring" }]
      },
      ring: {
        art: () => A.space({}) +
      `<path d="M88 150 A 112 38 0 0 1 312 150" fill="none" stroke="#ffd166" stroke-width="5" opacity=".9"/>` +
      `<path d="M104 150 A 96 32 0 0 1 296 150" fill="none" stroke="#c9a0f0" stroke-width="6" opacity=".9"/>` +
      `<path d="M120 150 A 80 26 0 0 1 280 150" fill="none" stroke="#e8d5ff" stroke-width="6" opacity=".9"/>` +
      A.planet(200, 150, 55, "#a368d8") +
      `<path d="M120 150 A 80 26 0 0 0 280 150" fill="none" stroke="#e8d5ff" stroke-width="6"/>` +
      `<path d="M104 150 A 96 32 0 0 0 296 150" fill="none" stroke="#c9a0f0" stroke-width="6"/>` +
      `<path d="M88 150 A 112 38 0 0 0 312 150" fill="none" stroke="#ffd166" stroke-width="5"/>` +
      `<circle cx="128" cy="168" r="2" fill="#fff"/><circle cx="255" cy="176" r="2" fill="#fff"/><circle cx="305" cy="158" r="2" fill="#fff"/>` +
      A.alien({ x: 185, y: 84, scale: .8, color: "#c77dff" }) +
      A.alien({ x: 224, y: 88, scale: .7, color: "#ffd166" }) +
      `<text x="200" y="45" font-size="24" text-anchor="middle">🎉</text>` +
      A.rocket({ x: 62, y: 240, scale: .75, color: "#e8584f", flame: true }),
        text: "Last stop: a purple planet wrapped in shiny RINGS, just like Saturn! Count the rings with me: one, two, three glittering rings. The ring-aliens are throwing a party. Should we join?",
        choices: [
          { label: "🎉 Invite EVERYONE to a pizza party", to: "partyEnd" },
          { label: "🏁 Race home to bake even more", to: "moreEnd" }
        ]
      },
      partyEnd: {
        art: () => {
      const jelly = (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-14 2 Q-14 -16 0 -16 Q14 -16 14 2 Q7 5 0 4 Q-7 5 -14 2Z" fill="${c}" opacity=".92"/><path d="M-10 4 q-2 8 1 14 M-4 5 q-1.5 9 1 15 M3 5 q2 9 -1 15 M9 4 q3 8 0 14" stroke="${c}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".8"/><circle cx="-4.5" cy="-6" r="1.8" fill="#2b2440"/><circle cx="4.5" cy="-6" r="1.8" fill="#2b2440"/><path d="M-3 -1.5 Q0 1 3 -1.5" stroke="#2b2440" stroke-width="1.4" fill="none" stroke-linecap="round"/><circle cx="-8" cy="-2.5" r="1.6" fill="#ff9ec2" opacity=".6"/><circle cx="8" cy="-2.5" r="1.6" fill="#ff9ec2" opacity=".6"/></g>`;
      return A.space({}) + A.planet(330, 70, 24, "#e8584f") + A.planet(60, 80, 22, "#4a8fe0") +
        A.planet(200, 250, 50, "#a368d8", true) +
        A.alien({ x: 110, y: 200, scale: .9, color: "#ff9a8f" }) +
        `<ellipse cx="110" cy="191.5" rx="2.3" ry="3" fill="#fff"/><circle cx="110" cy="192" r="1.4" fill="#2b2440"/>` +
        jelly(290, 195, 1, "#9be15d") +
        A.alien({ x: 200, y: 170, scale: 1, color: "#c77dff" }) +
        `<circle cx="200" cy="212" r="15" fill="#ffd166" stroke="#e8a04a" stroke-width="4"/>` +
        `<path d="M200 212 L200 198 M200 212 L213 208 M200 212 L208 224 M200 212 L192 224 M200 212 L187 208" stroke="#c9862e" stroke-width="1.6"/>` +
        `<text x="200" y="40" font-size="28" text-anchor="middle">🎉</text>`;
    },
        text: "Captain beams every alien aboard for the BIGGEST space pizza party ever — red ones, blue ones, ringed ones, all sharing slices among the stars. The whole galaxy is full and happy. Mission complete, Captain! 🍕🚀",
        end: "Galactic Pizza Hero"
      },
      moreEnd: {
        art: () => A.space({}) +
          A.planet(70, 220, 30, "#4a8fe0", true) +
          A.rocket({ x: 230, y: 150, scale: 1.3, color: "#e8584f", flame: true }),
        text: "\"There are MORE hungry planets out there!\" Captain zooms home, ovens already glowing, ready to bake a thousand more pizzas. The galaxy will never go hungry on YOUR watch. To infinity… and pepperoni! 🍕",
        end: "Pizza Captain Forever"
      }
    }
  };

  /* ---- register the short stories (long ones append later) ---- */
  window.STORIES = [rainbow, campout, pizza];
})();
