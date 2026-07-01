/* ===========================================================
   MAD LIBS  —  story templates
   -----------------------------------------------------------
   Each story has a list of "blanks" (the silly words we ask the
   kid for, in order) and a "template" string.  In the template,
   {0} {1} {2}… get replaced by the words for blanks[0], blanks[1]…

   Keep the templates G-rated and goofy.  No kid-specific themes —
   every story should be fun for everyone.

   Blank types we use (the "type" is just a hint for the label):
     adjective, noun, plural-noun, verb, verb-ed (past tense),
     verb-ing, adverb, body-part, animal, place, food, color,
     number, name, exclamation, silly-word
   =========================================================== */

const MADLIBS = [
  {
    id: "lunch-disaster",
    title: "The Lunchroom Disaster",
    emoji: "🍝",
    color: "#3ddc84",
    blanks: [
      { type: "adjective",   label: "a silly adjective",        example: "slimy" },
      { type: "food",        label: "a food",                   example: "noodle" },
      { type: "exclamation", label: "something you shout",       example: "Yikes" },
      { type: "verb-ed",     label: "an action word ending in -ed", example: "wobbled" },
      { type: "number",      label: "a number",                 example: "42" },
      { type: "plural-noun", label: "a plural noun (more than one thing)", example: "socks" },
      { type: "adverb",      label: "an adverb (ends in -ly)",  example: "loudly" },
      { type: "animal",      label: "an animal",                example: "llama" }
    ],
    template:
      "I opened my lunchbox and a {0} {1} stared right back at me. \"{2}!\" I yelled, " +
      "and the whole cafeteria {3} at once. Then {4} flying {5} zoomed past the windows " +
      "while the lunch lady danced {6}. By the end of lunch our school had a brand-new " +
      "pet {7}, and nobody ever ate cafeteria food the same way again."
  },

  {
    id: "space-trip",
    title: "A Trip to Outer Space",
    emoji: "🚀",
    color: "#8a5cff",
    blanks: [
      { type: "adjective",   label: "a silly adjective",        example: "bouncy" },
      { type: "noun",        label: "a noun (a thing)",         example: "toaster" },
      { type: "verb",        label: "an action word",           example: "sneeze" },
      { type: "color",       label: "a color",                  example: "purple" },
      { type: "plural-noun", label: "a plural noun",            example: "marshmallows" },
      { type: "body-part",   label: "a part of the body",       example: "elbow" },
      { type: "exclamation", label: "something you shout",       example: "Woohoo" },
      { type: "adverb",      label: "an adverb (ends in -ly)",  example: "quietly" }
    ],
    template:
      "Blast off! Our rocket was shaped like a {0} {1} and could {2} faster than light. " +
      "We landed on a {3} planet covered in fluffy {4}. A friendly alien waved its {5} " +
      "at us and said \"{6}!\" We explored {7} until it was time to fly home for dinner."
  },

  {
    id: "zoo-gone-wrong",
    title: "The Day the Zoo Went Wild",
    emoji: "🦒",
    color: "#ffd166",
    blanks: [
      { type: "animal",      label: "an animal",                example: "penguin" },
      { type: "verb-ing",    label: "an action word ending in -ing", example: "jumping" },
      { type: "adjective",   label: "a silly adjective",        example: "ticklish" },
      { type: "food",        label: "a food",                   example: "pizza" },
      { type: "number",      label: "a number",                 example: "7" },
      { type: "plural-noun", label: "a plural noun",            example: "bananas" },
      { type: "place",       label: "a place",                  example: "the library" },
      { type: "adverb",      label: "an adverb (ends in -ly)",  example: "wildly" }
    ],
    template:
      "It started when one {0} escaped its cage and went {1} down the path. Soon every " +
      "animal in the {2} zoo wanted out too! The monkeys threw {3} everywhere, exactly {4} " +
      "flamingos balanced {5} on their heads, and the giraffes tiptoed all the way to {6}. " +
      "The zookeeper chased them, laughing {7} the whole time."
  },

  {
    id: "birthday-mixup",
    title: "The Birthday Party Mix-Up",
    emoji: "🎂",
    color: "#ff5d8f",
    blanks: [
      { type: "name",        label: "a person's name",          example: "Sam" },
      { type: "number",      label: "a number",                 example: "100" },
      { type: "adjective",   label: "a silly adjective",        example: "glittery" },
      { type: "noun",        label: "a noun (a thing)",         example: "trombone" },
      { type: "verb-ed",     label: "an action word ending in -ed", example: "giggled" },
      { type: "food",        label: "a food",                   example: "broccoli" },
      { type: "plural-noun", label: "a plural noun",            example: "balloons" },
      { type: "exclamation", label: "something you shout",       example: "Surprise" }
    ],
    template:
      "Today was {0}'s {1}th birthday, and the party was totally {2}! Instead of a cake, " +
      "someone brought a giant {3}. When we lit the candles, everyone {4} so hard that the " +
      "{5} flew everywhere. We popped {6} until they were all gone, then shouted \"{7}!\" " +
      "It was the best mixed-up party ever."
  },

  {
    id: "robot-helper",
    title: "My Robot Helper",
    emoji: "🤖",
    color: "#38b6ff",
    blanks: [
      { type: "silly-word",  label: "a made-up silly word",     example: "Zorbo" },
      { type: "adjective",   label: "a silly adjective",        example: "squeaky" },
      { type: "verb",        label: "an action word",           example: "dance" },
      { type: "noun",        label: "a noun (a thing)",         example: "spoon" },
      { type: "body-part",   label: "a part of the body",       example: "nose" },
      { type: "color",       label: "a color",                  example: "green" },
      { type: "adverb",      label: "an adverb (ends in -ly)",  example: "carefully" },
      { type: "plural-noun", label: "a plural noun",            example: "cookies" }
    ],
    template:
      "I built a robot named {0} out of a {1} cardboard box. It could {2} and even fetch " +
      "my {3}. Its {4} lit up {5} whenever it was happy. Every morning it tiptoed {6} into " +
      "the kitchen and made me a stack of warm {7}. Best invention ever!"
  },

  {
    id: "pirate-teacher",
    title: "The Pirate Substitute",
    emoji: "🏴‍☠️",
    color: "#f4791f",
    blanks: [
      { type: "exclamation", label: "something you shout",       example: "Ahoy" },
      { type: "adjective",   label: "a silly adjective",         example: "crusty" },
      { type: "animal",      label: "an animal",                 example: "parrot" },
      { type: "verb",        label: "an action word",            example: "dig" },
      { type: "plural-noun", label: "a plural noun (more than one thing)", example: "pencils" },
      { type: "place",       label: "a place",                   example: "the playground" },
      { type: "food",        label: "a food",                    example: "spaghetti" },
      { type: "adverb",      label: "an adverb (ends in -ly)",   example: "bravely" }
    ],
    template:
      "\"{0}!\" boomed our substitute teacher as she stomped into class wearing a {1} " +
      "pirate hat, a {2} perched on her shoulder. For our first lesson she taught us how " +
      "to {3} for buried treasure. We found a chest stuffed with golden {4} hidden under " +
      "{5}! At lunch she cooked us pirate stew made of {6}, and we all sailed {7} home on " +
      "a cardboard ship. Best. School day. Ever."
  },

  {
    id: "pet-show",
    title: "The World's Weirdest Pet Show",
    emoji: "🐾",
    color: "#ffd166",
    blanks: [
      { type: "name",        label: "a person's name",           example: "Sam" },
      { type: "animal",      label: "an animal",                 example: "hamster" },
      { type: "silly-word",  label: "a made-up silly word (the pet's name)", example: "Floofington" },
      { type: "verb",        label: "an action word",            example: "juggle" },
      { type: "number",      label: "a number",                  example: "12" },
      { type: "body-part",   label: "a part of the body",        example: "nose" },
      { type: "adjective",   label: "a silly adjective",         example: "wiggly" },
      { type: "exclamation", label: "something you shout",       example: "Bravo" }
    ],
    template:
      "This year {0} entered the pet show with a {1} named {2}. For the talent round, " +
      "{2} could {3} while balancing {4} teacups on its {5}. The judges said it was the " +
      "most {6} trick they had ever seen and shouted \"{7}!\" as they handed over a giant " +
      "golden trophy. Then {2} ate the trophy. It was still the best pet show ever."
  },

  {
    id: "camping-chaos",
    title: "Camping Chaos",
    emoji: "🏕️",
    color: "#3ddc84",
    blanks: [
      { type: "adjective",   label: "a silly adjective",         example: "soggy" },
      { type: "place",       label: "a place",                   example: "the backyard" },
      { type: "plural-noun", label: "a plural noun (more than one thing)", example: "umbrellas" },
      { type: "animal",      label: "an animal",                 example: "raccoon" },
      { type: "food",        label: "a food",                    example: "hot dog" },
      { type: "verb-ed",     label: "an action word ending in -ed", example: "jumped" },
      { type: "body-part",   label: "a part of the body",        example: "knee" },
      { type: "adverb",      label: "an adverb (ends in -ly)",   example: "loudly" }
    ],
    template:
      "For our {0} camping trip we hiked all the way to {1}. Dad forgot the tent poles, " +
      "so we built a tent out of {2}. In the middle of the night a sneaky {3} unzipped " +
      "our cooler and gobbled every last {4}. Mom {5} so fast she bonked her {6} on a " +
      "marshmallow stick. We laughed {7} until the sun came up. Next year we're camping " +
      "in the living room."
  },

  {
    id: "grocery-dragon",
    title: "A Dragon at the Grocery Store",
    emoji: "🐉",
    color: "#9b3fc4",
    blanks: [
      { type: "color",       label: "a color",                   example: "turquoise" },
      { type: "verb-ing",    label: "an action word ending in -ing", example: "skipping" },
      { type: "food",        label: "a food",                    example: "pickles" },
      { type: "number",      label: "a number",                  example: "99" },
      { type: "plural-noun", label: "a plural noun (more than one thing)", example: "watermelons" },
      { type: "exclamation", label: "something you shout",       example: "Goodness" },
      { type: "verb",        label: "an action word",            example: "dance" },
      { type: "adjective",   label: "a silly adjective",         example: "polite" }
    ],
    template:
      "We were picking out cereal when a {0} dragon came {1} down aisle five. It filled " +
      "its cart with {2} — {3} boxes of it! — and knocked over a pyramid of {4} with its " +
      "tail. \"{5}!\" cried the manager. But the dragon just wanted someone to {6} with, " +
      "so we invited it home for dinner. Now every Sunday a very {7} dragon helps us do " +
      "the grocery shopping."
  },

  {
    id: "upside-down-park",
    title: "The Upside-Down Amusement Park",
    emoji: "🎢",
    color: "#38b6ff",
    blanks: [
      { type: "name",        label: "a person's name",           example: "Alex" },
      { type: "adjective",   label: "a silly adjective",         example: "bonkers" },
      { type: "noun",        label: "a noun (a thing)",          example: "banana" },
      { type: "verb",        label: "an action word",            example: "zoom" },
      { type: "plural-noun", label: "a plural noun (more than one thing)", example: "bathtubs" },
      { type: "adverb",      label: "an adverb (ends in -ly)",   example: "dizzily" },
      { type: "food",        label: "a food",                    example: "tacos" },
      { type: "exclamation", label: "something you shout",       example: "Wheee" }
    ],
    template:
      "{0} won two tickets to the world's most {1} amusement park. The roller coaster " +
      "was shaped like a giant {2}, and instead of going down, it could only {3} up. The " +
      "bumper cars had been replaced with bumper {4}, which spun {5} in circles. For a " +
      "snack we ate cotton candy that tasted exactly like {6}. \"{7}!\" we screamed on " +
      "every single ride — even the ones that never moved."
  }
];
