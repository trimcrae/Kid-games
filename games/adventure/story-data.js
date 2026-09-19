// Short adventures. Generated illustrations are assigned by art/generated/manifest.js.
window.STORIES = [
  {
    "id": "rainbow",
    "coverImg": "art/generated/rainbow-meet.webp",
    "title": "Ellie & the Rainbow Dragon",
    "emoji": "🐉",
    "color": "#ff7eb6",
    "ages": "3+",
    "who": "Ellie",
    "teaches": "colours, counting & kindness",
    "blurb": "Help a little grey dragon find all its colours!",
    "start": "meet",
    "nodes": {
      "meet": {
        "text": "Princess Ellie skips through the meadow. A little dragon sits all alone — and it is grey all over! It looks sad.",
        "choices": [
          {
            "label": "👋 Wave and say hello",
            "to": "hello"
          },
          {
            "label": "🌸 Pick it a flower",
            "to": "flower"
          }
        ]
      },
      "flower": {
        "text": "Ellie picks a pink flower and holds it out. The dragon sniffs it and smiles a tiny smile. \"Thank you,\" it whispers.",
        "choices": [
          {
            "label": "💬 Ask what's wrong",
            "to": "hello"
          }
        ]
      },
      "hello": {
        "text": "\"I lost all my colours,\" sniffs the dragon. \"To get them back, I must eat the rainbow fruit. Which one should we find first?\"",
        "choices": [
          {
            "label": "🍎 Red apples",
            "to": "red"
          },
          {
            "label": "🫐 Blue berries",
            "to": "blue"
          }
        ]
      },
      "red": {
        "text": "They find shiny red apples. Count with Ellie: one… two… three! The dragon gobbles them up and its WINGS turn bright RED! What next?",
        "choices": [
          {
            "label": "🍌 Yellow bananas",
            "to": "yellow"
          },
          {
            "label": "🦋 Fly up now!",
            "to": "flyEarly"
          }
        ]
      },
      "blue": {
        "text": "They find a bush of blueberries. Count them: one… two… three! Munch munch — the dragon's tail turns deep BLUE! What colour next?",
        "choices": [
          {
            "label": "🍌 Yellow bananas",
            "to": "yellow"
          },
          {
            "label": "🍎 Red apples",
            "to": "red"
          }
        ]
      },
      "yellow": {
        "text": "Sweet yellow bananas! One, two! The dragon's tummy glows sunny YELLOW. Just one more colour to go — let's get green!",
        "choices": [
          {
            "label": "🌿 Green leaves!",
            "to": "green"
          }
        ]
      },
      "green": {
        "text": "Crunchy green leaves make the dragon's tail GREEN. Red, yellow, green… Ellie claps. \"You're almost a rainbow! Ready to FLY?\"",
        "choices": [
          {
            "label": "🌈 Yes — fly to the rainbow!",
            "to": "rainbowEnd"
          }
        ]
      },
      "flyEarly": {
        "text": "Ellie hops on and the red dragon soars over the clouds! It isn't a whole rainbow yet — but flying with a friend is the best feeling in the world. ❤️",
        "end": "A Red Sky Ride"
      },
      "rainbowEnd": {
        "text": "WHOOSH! Every colour swirls together and the dragon shines like a RAINBOW! Ellie rides it over the castle while everyone cheers. What a sparkly day! 🌈",
        "end": "Rainbow Flight"
      }
    }
  },
  {
    "id": "campout",
    "coverImg": "art/generated/campout-camp.webp",
    "title": "The Great Family Campout",
    "emoji": "🏕️",
    "color": "#f4791f",
    "ages": "All ages",
    "who": "the whole family",
    "teaches": "nature, teamwork & wonder",
    "blurb": "A starry night, s'mores, and a little lost puppy!",
    "start": "camp",
    "nodes": {
      "camp": {
        "text": "Under a million stars, the whole family sits by the campfire. Suddenly — a tiny WHIMPER comes from the dark woods. Baby Kieran points. What should they do?",
        "choices": [
          {
            "label": "🔦 Explore the woods together",
            "to": "explore"
          },
          {
            "label": "🍫 Stay and make s'mores",
            "to": "smores"
          }
        ]
      },
      "explore": {
        "text": "Flashlights on! Jeannie and Cory tip-toe between the trees. In a beam of light they find a shivering little PUPPY, all alone. Its big eyes look up at them.",
        "choices": [
          {
            "label": "🐶 Scoop it up to keep it warm",
            "to": "warm"
          },
          {
            "label": "🐾 Follow where it wants to go",
            "to": "follow"
          }
        ]
      },
      "smores": {
        "text": "Marshmallows toast to golden brown — squish them with chocolate! Cory counts the stars: 1, 2, 3… too many! An owl hoots (owls are awake at night). Then the puppy trots right into camp.",
        "choices": [
          {
            "label": "🌟 Make a wish on a shooting star",
            "to": "wish"
          },
          {
            "label": "🐶 Help the lost puppy",
            "to": "warm"
          }
        ]
      },
      "follow": {
        "text": "The puppy leads them to a cosy den where a gentle FOX family lives! The fox isn't scary at all — it had been keeping the lost puppy safe and warm all night. What kind neighbours!",
        "choices": [
          {
            "label": "🦊 Thank the fox and head back",
            "to": "foxEnd"
          }
        ]
      },
      "warm": {
        "text": "They wrap the puppy in a soft blanket by the fire. It stops shivering and licks Jeannie's nose! There's a little collar with a name tag. Should they check it?",
        "choices": [
          {
            "label": "🔖 Read the name tag",
            "to": "tag"
          },
          {
            "label": "🏡 Search for its family at dawn",
            "to": "tag"
          }
        ]
      },
      "tag": {
        "text": "The tag says \"BISCUIT\" with a campsite number nearby! At sunrise the family walks Biscuit home, where a worried little kid bursts into a huge happy hug. Hooray!",
        "choices": [
          {
            "label": "🎉 Celebrate the happy reunion",
            "to": "reuniteEnd"
          }
        ]
      },
      "wish": {
        "text": "A shooting star streaks across the sky! Everyone squeezes their eyes shut and wishes together. Cory wishes the puppy finds its home — and in the morning, it does. Some wishes really do come true. 🌠",
        "choices": [
          {
            "label": "🐶 See the puppy go home",
            "to": "reuniteEnd"
          }
        ]
      },
      "foxEnd": {
        "text": "Back at camp, the family tells the tale of the kind woodland fox over breakfast. They learned that wild animals can be gentle and that helping each other is what families — and forests — do best. 🦊",
        "end": "Friends of the Forest"
      },
      "reuniteEnd": {
        "text": "Biscuit is safely home, and the family heads back to camp for pancakes. Cory, Jeannie, Ellie and baby Kieran all agree: the best part of any adventure is doing it TOGETHER. The End — for now! ❤️",
        "end": "Heroes of the Campout"
      }
    }
  },
  {
    "id": "pizza",
    "coverImg": "art/generated/pizza-launch.webp",
    "title": "Pizza Planet Rescue",
    "emoji": "🍕",
    "color": "#ffb142",
    "ages": "All ages",
    "who": "everyone",
    "teaches": "counting, colours & space facts",
    "blurb": "Blast off to feed hungry aliens across the galaxy!",
    "start": "launch",
    "nodes": {
      "launch": {
        "text": "Captain, this is Pizza Control! Three planets full of HUNGRY aliens need lunch. Your pizza rocket is fuelled and ready. Which planet shall we zoom to first?",
        "choices": [
          {
            "label": "🔴 The Red Planet",
            "to": "red"
          },
          {
            "label": "🔵 The Blue Water Planet",
            "to": "blue"
          }
        ]
      },
      "red": {
        "text": "Touchdown on the Red Planet — it's dusty and red, a bit like Mars! The aliens here have THREE eyes and they're starving. They each want pizza. How shall we top it?",
        "choices": [
          {
            "label": "🌶️ Spicy hot-sauce stars",
            "to": "spicy"
          },
          {
            "label": "🧀 Extra gooey cheese",
            "to": "cheese"
          }
        ]
      },
      "blue": {
        "text": "Splash! The Blue Planet is ALL water and the aliens are giggly jelly-fish folk who float everywhere. A normal pizza would sink! How do we serve it?",
        "choices": [
          {
            "label": "🥏 Toss it like a flying disc",
            "to": "frisbee"
          },
          {
            "label": "🚤 Float it on a pizza-boat",
            "to": "boat"
          }
        ]
      },
      "spicy": {
        "text": "Spicy star pizza! The three-eyed aliens take a bite and blast happy steam out of their ears like little whistles — TOOT TOOT! \"DELICIOUS!\" they cheer. On to the next stop!",
        "choices": [
          {
            "label": "🚀 Blast to the last planet",
            "to": "ring"
          }
        ]
      },
      "cheese": {
        "text": "So much gooey cheese it stretches loooong strings! The aliens count their slices: 1, 2, 3, 4, 5 — five each! They do a happy three-eyed wink. Yummy success!",
        "choices": [
          {
            "label": "🚀 Blast to the last planet",
            "to": "ring"
          }
        ]
      },
      "frisbee": {
        "text": "WHEE! Captain spins the pizza like a flying disc and the jelly-fish aliens leap and catch slices mid-float. Best pizza game in the galaxy! They wobble with joy.",
        "choices": [
          {
            "label": "🚀 Blast to the last planet",
            "to": "ring"
          }
        ]
      },
      "boat": {
        "text": "A little pizza-boat sails across the water world, dropping warm slices to every floating alien. Not one slice gets soggy — clever Captain! They blow bubbly thank-yous.",
        "choices": [
          {
            "label": "🚀 Blast to the last planet",
            "to": "ring"
          }
        ]
      },
      "ring": {
        "text": "Last stop: a purple planet wrapped in shiny RINGS, just like Saturn! Count the rings with me: one, two, three glittering rings. The ring-aliens are throwing a party. Should we join?",
        "choices": [
          {
            "label": "🎉 Invite EVERYONE to a pizza party",
            "to": "partyEnd"
          },
          {
            "label": "🏁 Race home to bake even more",
            "to": "moreEnd"
          }
        ]
      },
      "partyEnd": {
        "text": "Captain beams every alien aboard for the BIGGEST space pizza party ever — red ones, blue ones, ringed ones, all sharing slices among the stars. The whole galaxy is full and happy. Mission complete, Captain! 🍕🚀",
        "end": "Galactic Pizza Hero"
      },
      "moreEnd": {
        "text": "\"There are MORE hungry planets out there!\" Captain zooms home, ovens already glowing, ready to bake a thousand more pizzas. The galaxy will never go hungry on YOUR watch. To infinity… and pepperoni! 🍕",
        "end": "Pizza Captain Forever"
      }
    }
  },
  {
    "id": "mermaid",
    "title": "The Mermaid's Lost Song",
    "emoji": "🧜‍♀️",
    "color": "#38b6ff",
    "ages": "3+",
    "who": "Ellie & Jeannie",
    "teaches": "listening, music & counting",
    "blurb": "A little mermaid lost her song — follow the sounds of the sea to find it!",
    "start": "shore",
    "nodes": {
      "shore": {
        "text": "At the seaside, Princess Ellie hears a tiny sniffle. A little mermaid has lost her SONG, and the whole sea is too quiet without it! Where should they listen first?",
        "choices": [
          {
            "label": "🐚 Listen inside the big shell",
            "to": "shell"
          },
          {
            "label": "🐬 Ask the friendly dolphin",
            "to": "dolphin"
          }
        ]
      },
      "shell": {
        "text": "Ellie holds the big pink shell to her ear. Ssshhh… listen… a teeny tiny \"la-la-laaa\" is echoing far away! A crab scuttles up and clicks: \"That echo came from the coral garden!\"",
        "choices": [
          {
            "label": "🪸 Swim to the coral garden",
            "to": "coral"
          },
          {
            "label": "🦀 Follow the crab's secret shortcut",
            "to": "crabpath"
          }
        ]
      },
      "dolphin": {
        "text": "\"Click-click-wheee!\" sings the dolphin. Dolphins really do talk in clicks and whistles! \"I heard a song-bubble float by. It bobbed away toward the deep blue water.\"",
        "choices": [
          {
            "label": "🫧 Chase the song-bubble",
            "to": "bubble"
          },
          {
            "label": "🪸 Search the coral garden instead",
            "to": "coral"
          }
        ]
      },
      "coral": {
        "text": "Down in the coral garden, stripy fish are humming along to… something! Count the corals with me: one, two, THREE. The humming is loudest by the pink one.",
        "choices": [
          {
            "label": "👂 Listen at the pink coral",
            "to": "found"
          },
          {
            "label": "🐟 Ask the stripy fish for help",
            "to": "fishhelp"
          }
        ]
      },
      "crabpath": {
        "text": "The crab's shortcut goes right through a tiny sandcastle town! Tip-toe, tip-toe — careful not to squish the towers. On the far side, music sparkles on the waves like sunshine.",
        "choices": [
          {
            "label": "🎶 Follow the sparkling music",
            "to": "found"
          }
        ]
      },
      "bubble": {
        "text": "There it is — the shiny song-bubble, bobbing over the waves! POP! Out spill silvery notes: \"la-laaa!\" They line up in the water like little fish and swim off, singing all the way.",
        "choices": [
          {
            "label": "🎵 Follow the singing notes",
            "to": "found"
          }
        ]
      },
      "fishhelp": {
        "text": "\"Blub-blub!\" The stripy fish puff up their cheeks and blow bubble-drums — BOOM, boom, BOOM! The whole reef starts to wiggle and dance along to the beat.",
        "choices": [
          {
            "label": "🥁 March with the bubble-drum band",
            "to": "bandEnd"
          },
          {
            "label": "👂 Keep listening for the lost song",
            "to": "found"
          }
        ]
      },
      "found": {
        "text": "THERE it is! Tangled in the seaweed sits the mermaid's song, shimmering like a ribbon of stars. Ellie gently sets it free, and it swirls straight back into the mermaid's heart. She beams!",
        "choices": [
          {
            "label": "🎤 Sing it together, nice and loud",
            "to": "singEnd"
          },
          {
            "label": "🎪 Throw a big under-sea concert",
            "to": "concertEnd"
          }
        ]
      },
      "singEnd": {
        "text": "The mermaid and Ellie sing to the setting sun, and the whole sea hums along — whales down low, dolphins up high, crabs clicking the beat. A song you SHARE is the sweetest song of all. 🎶",
        "end": "The Sunset Duet"
      },
      "concertEnd": {
        "text": "The mermaid strums her golden harp and EVERYONE gets a part: dolphins whistle, fish blub, and the crab keeps time with his claws. It's the first-ever Under-the-Sea Concert — and Ellie conducts!",
        "end": "Star of the Sea Concert"
      },
      "bandEnd": {
        "text": "BOOM, boom, BOOM! The bubble-drum band marches around the reef all afternoon, and the little mermaid laughs so hard she finds a brand-new song — a giggly one! Music can be found anywhere. 🥁",
        "end": "The Bubble-Drum Band"
      }
    },
    "coverImg": "art/generated/mermaid-shore.webp"
  }
];
