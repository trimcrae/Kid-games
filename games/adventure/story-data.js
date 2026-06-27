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
    cover: () => A.skyDay({ hills: true }) + A.castle(320, 150, .55) +
      A.dragon({ x: 140, y: 150, scale: 1.3, color: "#b06ad9" }) +
      A.princess({ x: 70, y: 230, scale: 1, dress: "#ff5d8f" }),
    start: "meet",
    nodes: {
      meet: {
        art: () => A.meadow() + A.castle(330, 150, .5) +
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
        art: () => A.meadow() +
          A.tree(320, 220, 1.1, "#3bb36a") +
          A.dragon({ x: 220, y: 200, scale: 1.05, color: "#ff6b6b" }) +
          A.princess({ x: 90, y: 235, scale: 1, dress: "#ff5d8f" }) +
          A.flower(150, 250, "#e8584f") + A.flower(185, 258, "#e8584f") + A.flower(120, 258, "#e8584f"),
        text: "They find shiny red apples. Count with Ellie: one… two… three! The dragon gobbles them up and its WINGS turn bright RED! What next?",
        choices: [
          { label: "🍌 Yellow bananas", to: "yellow" },
          { label: "🦋 Fly up now!", to: "flyEarly" }
        ]
      },
      blue: {
        art: () => A.meadow() +
          A.dragon({ x: 220, y: 200, scale: 1.05, color: "#5aa9ff" }) +
          A.princess({ x: 90, y: 235, scale: 1, dress: "#ff5d8f" }) +
          A.flower(150, 252, "#4a8fe0") + A.flower(185, 258, "#4a8fe0") + A.flower(120, 258, "#4a8fe0"),
        text: "They find a bush of blueberries. Count them: one… two… three! Munch munch — the dragon's tail turns deep BLUE! What colour next?",
        choices: [
          { label: "🍌 Yellow bananas", to: "yellow" },
          { label: "🍎 Red apples", to: "red" }
        ]
      },
      yellow: {
        art: () => A.meadow() +
          A.dragon({ x: 220, y: 200, scale: 1.1, color: "#ffd23e" }) +
          A.princess({ x: 90, y: 235, scale: 1, dress: "#ff5d8f" }) +
          A.flower(150, 250, "#ffd166") + A.flower(185, 258, "#ffd166"),
        text: "Sweet yellow bananas! One, two! The dragon's tummy glows sunny YELLOW. Just one more colour to go — let's get green!",
        choices: [{ label: "🌿 Green leaves!", to: "green" }]
      },
      green: {
        art: () => A.forest() +
          A.dragon({ x: 210, y: 210, scale: 1.15, color: "#7ed957" }),
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
          `<path d="M40 280 A 180 180 0 0 1 360 280" fill="none" stroke="#ff5d8f" stroke-width="9"/>
           <path d="M40 290 A 170 170 0 0 1 360 290" fill="none" stroke="#ffd166" stroke-width="9"/>
           <path d="M40 300 A 160 160 0 0 1 360 300" fill="none" stroke="#7ed957" stroke-width="9"/>` +
          A.dragon({ x: 200, y: 150, scale: 1.4, color: "#b06ad9" }) +
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
          A.baby({ x: 200, y: 200, scale: .8 }),
        text: "Under a million stars, the whole family sits by the campfire. Suddenly — a tiny WHIMPER comes from the dark woods. Baby Kieran points. What should they do?",
        choices: [
          { label: "🔦 Explore the woods together", to: "explore" },
          { label: "🍫 Stay and make s'mores", to: "smores" }
        ]
      },
      explore: {
        art: () => A.forest().replace(/#bff0d8/g, '#2a3a4a').replace(/#e9fff2/g, '#1a2430') +
          A.princess({ x: 90, y: 250, scale: .85, dress: "#ff5d8f" }) +
          A.boy({ x: 150, y: 252, scale: .85, shirt: "#3ddc84" }) +
          A.puppy({ x: 290, y: 250, scale: .9 }) +
          `<circle cx="120" cy="120" r="50" fill="#ffe066" opacity=".18"/>`,
        text: "Flashlights on! Jeannie and Cory tip-toe between the trees. In a beam of light they find a shivering little PUPPY, all alone. Its big eyes look up at them.",
        choices: [
          { label: "🐶 Scoop it up to keep it warm", to: "warm" },
          { label: "🐾 Follow where it wants to go", to: "follow" }
        ]
      },
      smores: {
        art: () => A.night({}) + A.campfire(200, 250, 1.3) +
          A.smore(120, 220, 1) +
          A.princess({ x: 300, y: 256, scale: .85, dress: "#ff5d8f" }) +
          A.boy({ x: 80, y: 256, scale: .85, shirt: "#3ddc84" }),
        text: "Marshmallows toast to golden brown — squish them with chocolate! Cory counts the stars: 1, 2, 3… too many! An owl hoots (owls are awake at night). Then the puppy trots right into camp.",
        choices: [
          { label: "🌟 Make a wish on a shooting star", to: "wish" },
          { label: "🐶 Help the lost puppy", to: "warm" }
        ]
      },
      follow: {
        art: () => A.forest().replace(/#bff0d8/g, '#2a3a4a').replace(/#e9fff2/g, '#1a2430') +
          A.fox({ x: 270, y: 245, scale: 1 }) +
          A.puppy({ x: 200, y: 250, scale: .85 }) +
          A.princess({ x: 90, y: 252, scale: .8, dress: "#ff5d8f" }),
        text: "The puppy leads them to a cosy den where a gentle FOX family lives! The fox isn't scary at all — it had been keeping the lost puppy safe and warm all night. What kind neighbours!",
        choices: [{ label: "🦊 Thank the fox and head back", to: "foxEnd" }]
      },
      warm: {
        art: () => A.night({}) + A.campfire(220, 250, 1.1) +
          A.puppy({ x: 130, y: 248, scale: 1 }) +
          A.princess({ x: 300, y: 256, scale: .8, dress: "#ff5d8f" }),
        text: "They wrap the puppy in a soft blanket by the fire. It stops shivering and licks Jeannie's nose! There's a little collar with a name tag. Should they check it?",
        choices: [
          { label: "🔖 Read the name tag", to: "tag" },
          { label: "🏡 Search for its family at dawn", to: "tag" }
        ]
      },
      tag: {
        art: () => A.skyDay({}) + A.tent(80, 250, .9, "#e8584f") +
          A.puppy({ x: 200, y: 252, scale: 1 }) +
          A.princess({ x: 280, y: 256, scale: .8, dress: "#ff5d8f" }) +
          A.boy({ x: 130, y: 256, scale: .8, shirt: "#3ddc84" }),
        text: "The tag says \"BISCUIT\" with a campsite number nearby! At sunrise the family walks Biscuit home, where a worried little kid bursts into a huge happy hug. Hooray!",
        choices: [{ label: "🎉 Celebrate the happy reunion", to: "reuniteEnd" }]
      },
      wish: {
        art: () => A.night({}) +
          `<path d="M40 60 L120 100" stroke="#fff3b0" stroke-width="3" stroke-linecap="round"/><circle cx="40" cy="60" r="4" fill="#fff"/>` +
          A.campfire(200, 250, 1.1) +
          A.princess({ x: 300, y: 256, scale: .8, dress: "#ff5d8f" }) +
          A.boy({ x: 90, y: 256, scale: .8, shirt: "#3ddc84" }) +
          A.baby({ x: 200, y: 205, scale: .7 }),
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
        art: () => A.skyDay({}) + A.tent(80, 250, .9, "#e8584f") + A.campfire(160, 252, .8) +
          A.puppy({ x: 230, y: 252, scale: .9 }) +
          A.princess({ x: 300, y: 256, scale: .85, dress: "#ff5d8f" }) +
          A.boy({ x: 120, y: 256, scale: .85, shirt: "#3ddc84" }) +
          A.baby({ x: 200, y: 205, scale: .7 }),
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
          A.alien({ x: 280, y: 215, scale: .8, color: "#ff7a6f" }),
        text: "Touchdown on the Red Planet — it's dusty and red, a bit like Mars! The aliens here have THREE eyes and they're starving. They each want pizza. How shall we top it?",
        choices: [
          { label: "🌶️ Spicy hot-sauce stars", to: "spicy" },
          { label: "🧀 Extra gooey cheese", to: "cheese" }
        ]
      },
      blue: {
        art: () => A.space({}) + A.planet(200, 250, 72, "#4a8fe0") +
          A.rocket({ x: 90, y: 100, scale: .8, color: "#e8584f" }) +
          A.fish({ x: 210, y: 200, scale: 1.1, color: "#9be15d" }) +
          A.fish({ x: 290, y: 220, scale: .8, color: "#ffd166" }),
        text: "Splash! The Blue Planet is ALL water and the aliens are giggly jelly-fish folk who float everywhere. A normal pizza would sink! How do we serve it?",
        choices: [
          { label: "🥏 Toss it like a flying disc", to: "frisbee" },
          { label: "🚤 Float it on a pizza-boat", to: "boat" }
        ]
      },
      spicy: {
        art: () => A.space({}) + A.planet(200, 260, 70, "#e8584f") +
          A.alien({ x: 150, y: 200, scale: 1, color: "#ff9a8f" }) +
          A.alien({ x: 250, y: 205, scale: 1, color: "#ff7a6f" }),
        text: "Spicy star pizza! The three-eyed aliens take a bite and blast happy steam out of their ears like little whistles — TOOT TOOT! \"DELICIOUS!\" they cheer. On to the next stop!",
        choices: [{ label: "🚀 Blast to the last planet", to: "ring" }]
      },
      cheese: {
        art: () => A.space({}) + A.planet(200, 260, 70, "#e8584f") +
          A.alien({ x: 160, y: 200, scale: 1, color: "#ff9a8f" }) +
          A.alien({ x: 250, y: 205, scale: .9, color: "#ff7a6f" }),
        text: "So much gooey cheese it stretches loooong strings! The aliens count their slices: 1, 2, 3, 4, 5 — five each! They do a happy three-eyed wink. Yummy success!",
        choices: [{ label: "🚀 Blast to the last planet", to: "ring" }]
      },
      frisbee: {
        art: () => A.space({}) + A.planet(200, 270, 80, "#4a8fe0") +
          `<circle cx="200" cy="110" r="22" fill="#ffd166" stroke="#e8584f" stroke-width="4"/>` +
          A.fish({ x: 130, y: 200, scale: 1, color: "#9be15d" }) +
          A.fish({ x: 270, y: 210, scale: 1, color: "#ffd166" }),
        text: "WHEE! Captain spins the pizza like a flying disc and the jelly-fish aliens leap and catch slices mid-float. Best pizza game in the galaxy! They wobble with joy.",
        choices: [{ label: "🚀 Blast to the last planet", to: "ring" }]
      },
      boat: {
        art: () => A.space({}) + A.planet(200, 270, 80, "#4a8fe0") +
          `<path d="M170 180 h60 l-10 16 h-40Z" fill="#c98a4a"/><circle cx="200" cy="176" r="12" fill="#ffd166"/>` +
          A.fish({ x: 120, y: 210, scale: 1, color: "#9be15d" }),
        text: "A little pizza-boat sails across the water world, dropping warm slices to every floating alien. Not one slice gets soggy — clever Captain! They blow bubbly thank-yous.",
        choices: [{ label: "🚀 Blast to the last planet", to: "ring" }]
      },
      ring: {
        art: () => A.space({}) + A.planet(200, 150, 60, "#a368d8", true) +
          A.rocket({ x: 90, y: 230, scale: .8, color: "#e8584f", flame: true }),
        text: "Last stop: a purple planet wrapped in shiny RINGS, just like Saturn! Count the rings with me: one, two, three glittering rings. The ring-aliens are throwing a party. Should we join?",
        choices: [
          { label: "🎉 Invite EVERYONE to a pizza party", to: "partyEnd" },
          { label: "🏁 Race home to bake even more", to: "moreEnd" }
        ]
      },
      partyEnd: {
        art: () => A.space({}) + A.planet(330, 70, 24, "#e8584f") + A.planet(60, 80, 22, "#4a8fe0") +
          A.planet(200, 250, 50, "#a368d8", true) +
          A.alien({ x: 110, y: 200, scale: .9, color: "#ff9a8f" }) +
          A.fish({ x: 290, y: 200, scale: 1, color: "#9be15d" }) +
          A.alien({ x: 200, y: 170, scale: 1, color: "#ffd166" }) +
          `<text x="200" y="40" font-size="28" text-anchor="middle">🎉</text>`,
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
