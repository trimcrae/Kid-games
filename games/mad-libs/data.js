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

/* Kid-friendly grammar hints, one per blank type. Shown while the
   kid thinks of a word — this is where the "teaches parts of
   speech" actually happens. */
const MADLIB_HINTS = {
  "adjective":   "An adjective is a describing word — it tells what something is like (fuzzy, giant, sparkly).",
  "noun":        "A noun is a thing — a person, a place, or an object you could point at.",
  "plural-noun": "Plural means MORE than one — it usually ends in -s (cats, rockets, pickles).",
  "verb":        "A verb is a doing word — something you can act out (jump, wiggle, snore).",
  "verb-ed":     "A doing word that ALREADY happened — most end in -ed (jumped, wiggled).",
  "verb-ing":    "A doing word happening RIGHT NOW — it ends in -ing (jumping, wiggling).",
  "adverb":      "An adverb tells HOW you do something — it usually ends in -ly (slowly, bravely).",
  "body-part":   "Any part of you, from your head down to your toes.",
  "animal":      "Any creature at all — real ones or ones from your imagination.",
  "place":       "Anywhere you could go — near, far, or totally made up.",
  "food":        "Anything yummy (or yucky!) that someone could eat.",
  "color":       "Any colour of the rainbow — or invent a brand-new one.",
  "number":      "Any number — teeny-tiny, super-huge, or in between.",
  "name":        "A person's name — maybe someone in your family!",
  "exclamation": "A word you SHOUT when you're surprised, like WOW or YIKES.",
  "silly-word":  "Make one up! Any goofy sound counts (blorp, zizzlefish…).",
  "adjective-er":"A COMPARING word — it puts two things side by side and ends in -er (bigger, sillier, wigglier)."
};

/* Which part of speech each blank type really is. This is what the
   finished story gets colour-coded by, so a kid can SEE the nouns,
   verbs and adjectives they chose. */
const MADLIB_POS = {
  "adjective":    { pos: "adjective",   cls: "pos-adj" },
  "adjective-er": { pos: "adjective",   cls: "pos-adj" },
  "color":        { pos: "adjective",   cls: "pos-adj" },
  "noun":         { pos: "noun",        cls: "pos-noun" },
  "plural-noun":  { pos: "noun",        cls: "pos-noun" },
  "animal":       { pos: "noun",        cls: "pos-noun" },
  "place":        { pos: "noun",        cls: "pos-noun" },
  "food":         { pos: "noun",        cls: "pos-noun" },
  "body-part":    { pos: "noun",        cls: "pos-noun" },
  "name":         { pos: "noun",        cls: "pos-noun" },
  "verb":         { pos: "verb",        cls: "pos-verb" },
  "verb-ed":      { pos: "verb",        cls: "pos-verb" },
  "verb-ing":     { pos: "verb",        cls: "pos-verb" },
  "adverb":       { pos: "adverb",      cls: "pos-adv" },
  "number":       { pos: "number",      cls: "pos-num" },
  "exclamation":  { pos: "exclamation", cls: "pos-excl" },
  "silly-word":   { pos: "silly word",  cls: "pos-silly" }
};

/* The legend under a finished story: one row per part of speech. */
const MADLIB_POS_INFO = [
  { pos: "noun",        cls: "pos-noun",  label: "Noun",        what: "a naming word for a person, a place or a thing" },
  { pos: "verb",        cls: "pos-verb",  label: "Verb",        what: "a doing word — something you can act out" },
  { pos: "adjective",   cls: "pos-adj",   label: "Adjective",   what: "a describing word — it tells what something is like" },
  { pos: "adverb",      cls: "pos-adv",   label: "Adverb",      what: "a word that tells HOW something is done" },
  { pos: "number",      cls: "pos-num",   label: "Number",      what: "a counting word — it tells how many" },
  { pos: "exclamation", cls: "pos-excl",  label: "Exclamation", what: "a word you shout when you are surprised" },
  { pos: "silly word",  cls: "pos-silly", label: "Silly word",  what: "a word nobody had invented until you did" }
];

/* Live "you got it!" coaching while a kid types. Never blocks anything —
   any word is always allowed, this just points out the pattern. */
const MADLIB_COACH = {
  "adverb":       { test: /ly$/i,   ok: "Nice — it ends in -ly, so it tells HOW!",  tip: "Most adverbs end in -ly (slowly, bravely)." },
  "verb-ing":     { test: /ing$/i,  ok: "Nice — -ing means it's happening now!",     tip: "An -ing word is happening RIGHT NOW (jumping)." },
  "verb-ed":      { test: /ed$/i,   ok: "Nice — -ed means it already happened!",     tip: "An -ed word ALREADY happened (jumped, wiggled)." },
  "adjective-er": { test: /er$/i,   ok: "Nice — -er compares two things!",           tip: "Comparing words end in -er (bigger, sillier)." },
  "plural-noun":  { test: /(s|children|mice|teeth|feet|people|geese)$/i, ok: "Nice — that's more than one!", tip: "Plural means MORE than one — most end in -s." },
  "number":       { test: /^[0-9]/, ok: "Great, that's a number!",                   tip: "Try digits, like 7 or 42." }
};

/* A tap-a-word bank so a pre-reader (or anyone stuck) can play without
   typing. Every single word here is one you would be happy to hear a
   three-year-old read out loud. */
const MADLIB_BANK = {
  "adjective":    ["fuzzy","giant","sparkly","slimy","wiggly","bouncy","stinky","squeaky","gigantic","tiny","fluffy","silly","sleepy","spotty","bumpy","shiny","grumpy","cheerful","wobbly","fancy"],
  "adjective-er": ["bigger","sillier","fuzzier","louder","faster","sleepier","bouncier","taller","wigglier","wetter","braver","slower"],
  "noun":         ["toaster","rocket","pickle","sock","banana","dinosaur","umbrella","trombone","snowball","bathtub","castle","robot","pancake","wagon","teapot","cactus","mountain","volcano"],
  "plural-noun":  ["socks","cookies","bubbles","rockets","pickles","marshmallows","penguins","crayons","balloons","noodles","mittens","snowflakes","buttons","jellybeans","pillows","umbrellas"],
  "verb":         ["jump","wiggle","snore","dance","sneeze","giggle","zoom","tickle","hop","stomp","twirl","munch","wobble","gallop","tiptoe","juggle"],
  "verb-ed":      ["jumped","wiggled","giggled","zoomed","danced","snored","hopped","stomped","twirled","sneezed","wobbled","munched","tiptoed","wiggled"],
  "verb-ing":     ["jumping","wiggling","giggling","zooming","dancing","snoring","hopping","stomping","twirling","sneezing","tiptoeing","munching"],
  "adverb":       ["slowly","bravely","loudly","quietly","quickly","gently","happily","sleepily","wildly","politely","carefully","proudly","grumpily","cheerfully"],
  "body-part":    ["elbow","nose","toe","ear","knee","thumb","chin","ankle","eyebrow","pinky finger","tummy","shoulder","foot","eyelash"],
  "animal":       ["llama","penguin","hamster","dragon","walrus","poodle","octopus","kitten","hippo","flamingo","parrot","goat","moose","koala","otter","tortoise"],
  "place":        ["the library","the moon","the playground","Grandma's house","the beach","a volcano","the treehouse","the supermarket","the North Pole","under the bed","the jungle","the swimming pool"],
  "food":         ["noodles","pizza","broccoli","pancakes","jellybeans","spaghetti","popcorn","watermelon","tacos","cupcakes","pickles","porridge","toast","ice cream"],
  "color":        ["purple","turquoise","gold","lime green","hot pink","silver","sky blue","orange","rainbow","bright red"],
  "number":       ["3","7","8","11","12","21","42","99","100","1000"],
  "name":         ["Sam","Alex","Riley","Jo","Pip","Nina","Max","Ellie","Cory","Jeannie","Kieran","Mum"],
  "exclamation":  ["Wow","Yikes","Hooray","Woohoo","Oh no","Yippee","Bravo","Goodness","Wahoo","Zowie","Amazing"],
  "silly-word":   ["Blorp","Zizzlefish","Wobblenoodle","Snickerblob","Floofington","Bizzlebop","Kerfuffle","Doodlesnort","Pipsqueakle","Glumbo"]
};

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
  },

  {
    id: "superhero-neighbor",
    title: "The Superhero Next Door",
    emoji: "🦸",
    color: "#ff5d8f",
    blanks: [
      { type: "name",        label: "a person's name",           example: "Riley" },
      { type: "adjective",   label: "a silly adjective",         example: "sparkly" },
      { type: "animal",      label: "an animal",                 example: "goldfish" },
      { type: "verb",        label: "an action word",            example: "cartwheel" },
      { type: "color",       label: "a color",                   example: "orange" },
      { type: "plural-noun", label: "a plural noun (more than one thing)", example: "pillows" },
      { type: "body-part",   label: "a part of the body",        example: "pinky finger" },
      { type: "exclamation", label: "something you shout",       example: "Hooray" }
    ],
    template:
      "Not many people know it, but our neighbor {0} is secretly a superhero called " +
      "Captain {1}! By day they quietly walk their pet {2}, but the second trouble " +
      "strikes, they {3} into a {4} cape and zoom off to save the day. Yesterday they " +
      "caught a whole truckload of falling {5} using only one {6}. \"{7}!\" cheered the " +
      "entire street. Being a hero is hard work — but somebody's got to do it."
  },

  {
    id: "undersea-sleepover",
    title: "Sleepover Under the Sea",
    emoji: "🐙",
    color: "#38b6ff",
    blanks: [
      { type: "adjective",   label: "a silly adjective",         example: "bubbly" },
      { type: "animal",      label: "an animal",                 example: "walrus" },
      { type: "plural-noun", label: "a plural noun (more than one thing)", example: "buttons" },
      { type: "verb-ing",    label: "an action word ending in -ing", example: "twirling" },
      { type: "food",        label: "a food",                    example: "pancake" },
      { type: "number",      label: "a number",                  example: "14" },
      { type: "body-part",   label: "a part of the body",        example: "ear" },
      { type: "adverb",      label: "an adverb (ends in -ly)",   example: "gently" }
    ],
    template:
      "For my birthday I had a {0} sleepover at the bottom of the ocean. An octopus " +
      "braided my hair with four arms at once while a {1} told spooky stories about " +
      "dry land. We all wore pajamas covered in {2} and spent hours {3} with the " +
      "dolphins. At midnight we snacked on {4}-flavored seaweed — I ate {5} whole " +
      "bowls! I fell asleep with a starfish stuck to my {6}, snoring {7} into my " +
      "bubble pillow. Best underwater birthday ever."
  },

  {
    id: "cookie-bakeoff",
    title: "The Great Cookie Bake-Off",
    emoji: "🧁",
    color: "#ffd166",
    blanks: [
      { type: "name",        label: "a person's name",           example: "Jo" },
      { type: "food",        label: "a food",                    example: "pickle" },
      { type: "number",      label: "a number",                  example: "83" },
      { type: "verb-ed",     label: "an action word ending in -ed", example: "rattled" },
      { type: "adjective",   label: "a silly adjective",         example: "gloopy" },
      { type: "plural-noun", label: "a plural noun (more than one thing)", example: "sprinkles" },
      { type: "silly-word",  label: "a made-up silly word (the cookie's name)", example: "Snickerblob" },
      { type: "exclamation", label: "something you shout",       example: "Delicious" }
    ],
    template:
      "Welcome to the Great Cookie Bake-Off! Famous chef {0} stepped up with a secret " +
      "recipe: {1} cookies with exactly {2} spoonfuls of sugar. The mixer {3} so hard " +
      "that soon the whole kitchen was buried under {4} {5}. Chef {0} named the brand-new " +
      "cookie the \"{6}\", and the judges took one bite and hollered \"{7}!\" They awarded " +
      "it the gold medal — and then they ate the medal too, because it was also a cookie."
  },

  {
    id: "homework-alive",
    title: "My Homework Came Alive",
    emoji: "📚",
    color: "#8a5cff",
    blanks: [
      { type: "adjective",   label: "a silly adjective",         example: "grumpy" },
      { type: "noun",        label: "a noun (a thing)",          example: "volcano" },
      { type: "verb",        label: "an action word",            example: "tap-dance" },
      { type: "place",       label: "a place",                   example: "the supermarket" },
      { type: "animal",      label: "an animal",                 example: "poodle" },
      { type: "verb-ing",    label: "an action word ending in -ing", example: "honking" },
      { type: "number",      label: "a number",                  example: "17" },
      { type: "exclamation", label: "something you shout",       example: "Impossible" }
    ],
    template:
      "Teachers never believe me, but here is the honest truth: my {0} homework came " +
      "ALIVE. My report about the {1} hopped right off my desk, learned to {2}, and " +
      "chased me all the way to {3}. A passing {4} saw the whole thing and started " +
      "{5} — which only made it worse. In the end it took {6} firefighters to catch my " +
      "homework and staple it back together. \"{7}!\" gasped my teacher when I told her. " +
      "Then she gave me an A+ for adventure."
  },

  {
    id: "snowman-freezer",
    title: "The Snowman Who Wouldn't Melt",
    emoji: "⛄",
    color: "#38b6ff",
    blanks: [
      { type: "adjective",   label: "a silly adjective",         example: "lumpy" },
      { type: "noun",        label: "a noun (a thing)",          example: "carrot" },
      { type: "verb-ed",     label: "an action word ending in -ed", example: "hopped" },
      { type: "body-part",   label: "a part of the body",        example: "toes" },
      { type: "food",        label: "a food",                    example: "porridge" },
      { type: "plural-noun", label: "a plural noun (more than one thing)", example: "snowballs" },
      { type: "adverb",      label: "an adverb (ends in -ly)",   example: "calmly" },
      { type: "exclamation", label: "something you shout",       example: "Goodness" }
    ],
    template:
      "One morning I built a {0} snowman in the front yard and gave him a {1} for a nose. " +
      "That night he {2} right off the lawn and knocked on our door! He warmed his {3} by " +
      "the fire, ate a whole bowl of {4}, and juggled {5} for us until bedtime. When spring " +
      "came he refused to melt \u2014 he just walked {6} into the freezer and shut the door. " +
      "\"{7}!\" said Mum. He still lives in there, right next to the peas."
  },

  {
    id: "squeaky-castle",
    title: "The Castle with the Squeaky Door",
    emoji: "🏰",
    color: "#ff5d8f",
    blanks: [
      { type: "name",        label: "a person's name",           example: "Ellie" },
      { type: "adjective",   label: "a silly adjective",         example: "enormous" },
      { type: "color",       label: "a color",                   example: "sparkly pink" },
      { type: "animal",      label: "an animal",                 example: "llama" },
      { type: "verb",        label: "an action word",            example: "twirl" },
      { type: "plural-noun", label: "a plural noun (more than one thing)", example: "petals" },
      { type: "exclamation", label: "something you shout",       example: "Yikes" },
      { type: "adverb",      label: "an adverb (ends in -ly)",   example: "gently" }
    ],
    template:
      "Princess {0} lived in a {1} castle with a front door that squeaked louder than a " +
      "trumpet. Every morning she put on her {2} dress and rode her royal {3} down the " +
      "spiral stairs. Her favourite thing in the whole kingdom was to {4} across the throne " +
      "room while the guards tossed {5} into the air. When the squeaky door woke up the " +
      "entire village, everybody shouted \"{6}!\" \u2014 so the princess oiled the hinges {7}, " +
      "and the castle was peaceful again."
  },

  {
    id: "missing-socks",
    title: "The Missing Sock Mystery",
    emoji: "🧦",
    color: "#8a5cff",
    blanks: [
      { type: "adjective",   label: "a silly adjective",         example: "trickiest" },
      { type: "plural-noun", label: "a plural noun (more than one thing)", example: "socks" },
      { type: "place",       label: "a place",                   example: "the laundry room" },
      { type: "animal",      label: "an animal",                 example: "raccoon" },
      { type: "verb-ed",     label: "an action word ending in -ed", example: "squeaked" },
      { type: "number",      label: "a number",                  example: "11" },
      { type: "silly-word",  label: "a made-up silly word (the thief's name)", example: "Blorp" },
      { type: "adverb",      label: "an adverb (ends in -ly)",   example: "politely" }
    ],
    template:
      "Detective work is hard, but this was the {0} case of my whole career: every single " +
      "one of my {1} had vanished. I searched {2} and found nothing but fluff. Then a very " +
      "suspicious {3} strolled past wearing eleven socks at once. It {4} the moment it saw " +
      "me and dropped exactly {5} of them on the floor. The thief's name, it turns out, was " +
      "{6}, and it apologised {7}. Now we do the laundry together every Saturday."
  },

  {
    id: "family-talent-show",
    title: "Our Family Talent Show",
    emoji: "🎤",
    color: "#ffd166",
    blanks: [
      { type: "name",        label: "a person's name",           example: "Jeannie" },
      { type: "verb-ing",    label: "an action word ending in -ing", example: "cartwheeling" },
      { type: "adjective",   label: "a silly adjective",         example: "astonishing" },
      { type: "number",      label: "a number",                  example: "52" },
      { type: "animal",      label: "an animal",                 example: "hamster" },
      { type: "food",        label: "a food",                    example: "orange juice" },
      { type: "adverb",      label: "an adverb (ends in -ly)",   example: "wildly" },
      { type: "exclamation", label: "something you shout",       example: "Bravo" }
    ],
    template:
      "Welcome to the family talent show! First up was {0}, who went {1} across the living " +
      "room carpet without knocking over one single lamp. Next, Grandpa did a {2} magic " +
      "trick using {3} playing cards and one extremely surprised {4}. The baby's talent was " +
      "blowing bubbles into a cup of {5}. Everybody clapped {6} and the judges yelled " +
      "\"{7}!\" In the end we gave the trophy to the cat, who had done absolutely nothing."
  },

  {
    id: "snail-race",
    title: "The Great Snail Race",
    emoji: "🐌",
    color: "#3ddc84",
    blanks: [
      { type: "number",       label: "a number",                 example: "26" },
      { type: "adjective-er", label: "a comparing word ending in -er", example: "bouncier" },
      { type: "silly-word",   label: "a made-up silly word (the snail's name)", example: "Zizzlefish" },
      { type: "verb",         label: "an action word",           example: "cartwheel" },
      { type: "plural-noun",  label: "a plural noun (more than one thing)", example: "daisies" },
      { type: "food",         label: "a food",                   example: "lettuce" },
      { type: "adverb",       label: "an adverb (ends in -ly)",  example: "proudly" },
      { type: "exclamation",  label: "something you shout",      example: "Hooray" }
    ],
    template:
      "On your marks! {0} snails lined up at the start of the world's slowest race. " +
      "Everyone was certain the {1} snail would win, but one tiny snail named {2} had a " +
      "secret: it could {3} instead of crawl. Halfway round the track all the snails " +
      "stopped to admire some {4} and share a snack of {5}. Three whole hours later {2} " +
      "slid over the finish line {6}. \"{7}!\" roared the crowd, who had been waiting " +
      "patiently since Tuesday."
  },

  {
    id: "block-world",
    title: "The Block World Builder",
    emoji: "⛏️",
    color: "#3ddc84",
    blanks: [
      { type: "name",        label: "a person's name",           example: "Cory" },
      { type: "number",      label: "a number",                  example: "64" },
      { type: "noun",        label: "a noun (a thing)",          example: "waffle" },
      { type: "adjective",   label: "a silly adjective",         example: "glowing" },
      { type: "plural-noun", label: "a plural noun (more than one thing)", example: "ladders" },
      { type: "verb-ed",     label: "an action word ending in -ed", example: "sprinted" },
      { type: "animal",      label: "an animal",                 example: "bat" },
      { type: "exclamation", label: "something you shout",       example: "Phew" }
    ],
    template:
      "{0} logged into the block world and started digging straight down \u2014 {1} blocks " +
      "deep! At the very bottom was a cave shaped like a gigantic {2}, lit up by {3} lava. " +
      "{0} built a bridge out of {4}, then {5} all the way across it while a {6} flapped " +
      "along behind. \"{7}!\" they yelled when they finally popped back out at the surface " +
      "with a backpack stuffed full of diamonds."
  },

  {
    id: "ceiling-breakfast",
    title: "Breakfast on the Ceiling",
    emoji: "🥞",
    color: "#38b6ff",
    blanks: [
      { type: "adjective",   label: "a silly adjective",         example: "enormous" },
      { type: "food",        label: "a food",                    example: "pancakes" },
      { type: "verb-ed",     label: "an action word ending in -ed", example: "floated" },
      { type: "plural-noun", label: "a plural noun (more than one thing)", example: "lampshades" },
      { type: "body-part",   label: "a part of the body",        example: "eyebrow" },
      { type: "animal",      label: "an animal",                 example: "goldfish" },
      { type: "adverb",      label: "an adverb (ends in -ly)",   example: "dreamily" },
      { type: "exclamation", label: "something you shout",       example: "Whoa" }
    ],
    template:
      "We woke up one Tuesday to discover that gravity had gone on holiday. My {0} " +
      "breakfast lifted straight off the plate, and a whole stack of {1} stuck to the " +
      "ceiling like wallpaper. Dad {2} after it and got completely tangled in the curtains. " +
      "The milk rolled itself into wobbly balls that bounced off the {3} and landed on my " +
      "{4}. Even our {5} paddled {6} through the air like it was swimming. \"{7}!\" said my " +
      "little sister, who thought it was the best morning of her entire life."
  },

  {
    id: "talking-book",
    title: "The Library Book That Talked",
    emoji: "📖",
    color: "#9b3fc4",
    blanks: [
      { type: "adjective",   label: "a silly adjective",         example: "dusty" },
      { type: "noun",        label: "a noun (a thing)",          example: "octopus" },
      { type: "verb-ing",    label: "an action word ending in -ing", example: "sitting" },
      { type: "name",        label: "a person's name",           example: "Nina" },
      { type: "plural-noun", label: "a plural noun (more than one thing)", example: "bookmarks" },
      { type: "place",       label: "a place",                   example: "the playground" },
      { type: "adverb",      label: "an adverb (ends in -ly)",   example: "dramatically" },
      { type: "exclamation", label: "something you shout",       example: "Incredible" }
    ],
    template:
      "I pulled a very {0} book off the library shelf, and the second I opened it a tiny " +
      "voice said hello. It was a book all about a {1} \u2014 and it had got extremely bored " +
      "of {2} on the same page for eleven years. It begged me to read it to {3}, who was " +
      "busy sorting {4} at the front desk. Instead we snuck it out to {5}, where it read " +
      "ITSELF to us, {6}, until the sun went down. \"{7}!\" whispered the librarian when we " +
      "brought it back. Now that book has its very own library card."
  }
];
