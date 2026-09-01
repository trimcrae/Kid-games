/* ===========================================================
   Craepets — THE NARRATOR'S SCRIPT (and the picture words).
   -----------------------------------------------------------
   Everything the valley can SAY out loud, in one place, keyed
   by a short token:

       CPLines.T["q-how-many"]  ->  "How many?"

   The game asks for a token; the audio pipeline reads THIS file
   (tools/extract_texts.js) and renders every token to
   games/craepets/audio/<token>.mp3 with the same warm Piper
   storyteller voice the Spooky Stories use. The page then plays
   the clip — a real recording — instead of the phone's robotic
   built-in voice. A line with no clip yet falls back to the
   browser voice, reading the very same text, so nothing is ever
   silent while the pipeline catches up.

   The little tiers (Kieran and Ellie) are built from the word
   lists at the bottom — one picture per letter, the first
   sounds, the tiny words — so those lists live here too, next
   to the sentences that speak them. data.js reads them from
   CPLines; the narrator and the question maker can never drift
   apart.

   Rules for the sentences:
     · plain words a three-year-old knows; no emoji, no ALL CAPS
       (the phonemiser would spell a capitalised word out);
     · numbers as digits ("7"), which the voice reads correctly;
     · a lone letter always sits inside "the letter A", never on
       its own, so it is read as a name and not as a word.
   =========================================================== */
window.CPLines = (function () {
  "use strict";

  var T = {};
  function add(tok, text) { T[tok] = text; }

  /* ---------- the picture words the little tiers are made of ---------- */

  /* One picture per letter — the alphabet the pre-readers work from. */
  var ABC = [
    ["A", "🍎", "Apple"], ["B", "🐻", "Bear"], ["C", "🐱", "Cat"], ["D", "🐶", "Dog"],
    ["E", "🐘", "Elephant"], ["F", "🐸", "Frog"], ["G", "🍇", "Grapes"], ["H", "🏠", "House"],
    ["I", "🍦", "Ice cream"], ["J", "🫙", "Jar"], ["K", "🔑", "Key"], ["L", "🦁", "Lion"],
    ["M", "🌙", "Moon"], ["N", "👃", "Nose"], ["O", "🐙", "Octopus"], ["P", "🐧", "Penguin"],
    ["Q", "👑", "Queen"], ["R", "🌈", "Rainbow"], ["S", "☀️", "Sun"], ["T", "🌳", "Tree"],
    ["U", "☂️", "Umbrella"], ["V", "🎻", "Violin"], ["W", "🍉", "Watermelon"],
    ["X", "🩻", "X-ray"], ["Y", "🪀", "Yo-yo"], ["Z", "🦓", "Zebra"]
  ];

  /* Beginning SOUNDS, which is a different skill from letter NAMES:
     "b… b… ball" is how a four-year-old actually cracks reading. The
     fourth column is how the narrator says the sound itself. */
  var SOUNDS = [
    ["b", "🎈", "balloon", "buh"], ["c", "🥕", "carrot", "kuh"], ["d", "🦆", "duck", "duh"],
    ["f", "🐟", "fish", "fff"], ["g", "🐐", "goat", "guh"], ["h", "🎩", "hat", "huh"],
    ["j", "🧃", "juice", "juh"], ["l", "🍃", "leaf", "lll"], ["m", "🌝", "moon", "mmm"],
    ["n", "🪺", "nest", "nnn"], ["p", "🥧", "pie", "puh"], ["r", "🤖", "robot", "rrr"],
    ["s", "🧦", "sock", "sss"], ["t", "🚂", "train", "tuh"], ["v", "🚐", "van", "vvv"],
    ["w", "🌊", "wave", "wuh"]
  ];

  /* Little words a pre-reader can sound out, each with the picture that
     says what the word MEANS — so "which is spelled right" has an answer. */
  var TINY_WORDS = [
    ["cat", "🐱", ["kat", "cta", "cate"]],
    ["dog", "🐶", ["dawg", "dogg", "doog"]],
    ["sun", "☀️", ["sunn", "son", "sen"]],
    ["bed", "🛏️", ["bd", "bead", "bedd"]],
    ["fish", "🐟", ["fsh", "fich", "phish"]],
    ["hat", "🎩", ["haat", "hatt", "het"]],
    ["cup", "☕", ["kup", "cupp", "cop"]],
    ["bus", "🚌", ["buss", "bas", "bux"]],
    ["star", "⭐", ["stur", "starr", "sta"]],
    ["frog", "🐸", ["frogg", "farg", "flog"]],
    ["milk", "🥛", ["mik", "milck", "melk"]],
    ["tree", "🌳", ["tre", "trea", "tri"]]
  ];

  var RHYMES = [
    ["cat", ["hat", "bat", "mat"], ["dog", "sun", "cup"]],
    ["dog", ["log", "frog", "hog"], ["cat", "bed", "pin"]],
    ["star", ["car", "jar", "far"], ["moon", "tree", "hand"]],
    ["tree", ["bee", "knee", "sea"], ["cat", "door", "sock"]],
    ["sun", ["run", "bun", "fun"], ["star", "leaf", "milk"]],
    ["moon", ["spoon", "balloon", "soon"], ["sun", "dog", "hat"]],
    ["cake", ["lake", "snake", "rake"], ["pie", "book", "shoe"]],
    ["bug", ["rug", "mug", "hug"], ["ant", "sky", "door"]],
    ["fish", ["dish", "wish", "swish"], ["bird", "rock", "lamp"]],
    ["hop", ["top", "mop", "stop"], ["jump", "bird", "sand"]],
    ["bell", ["shell", "well", "tell"], ["ring", "door", "cake"]],
    ["night", ["light", "kite", "bright"], ["day", "moon", "sleep"]]
  ];

  /* [name, paint, picture, what the picture is] */
  var PAINTS = [
    ["Red", "#e8384f", "🍓", "a strawberry"], ["Orange", "#ff8c1a", "🍊", "an orange"],
    ["Yellow", "#ffd400", "🍋", "a lemon"], ["Green", "#2fbf4f", "🥦", "broccoli"],
    ["Blue", "#2b7fff", "🫐", "a blueberry"], ["Purple", "#8a3ffc", "🍇", "grapes"],
    ["Pink", "#ff6ec7", "🌸", "a blossom"], ["Brown", "#8a5a2b", "🐻", "a bear"],
    ["Black", "#22202e", "🐈‍⬛", "a black cat"], ["White", "#fdfdff", "🦢", "a swan"],
    ["Gray", "#9aa0b4", "🐘", "an elephant"]
  ];

  var SHAPES = [
    ["Circle", "⭕", "round all the way, with no corners at all"],
    ["Square", "🟥", "4 sides, all the same length"],
    ["Triangle", "🔺", "3 sides and 3 corners"],
    ["Star", "⭐", "5 points"],
    ["Heart", "💜", "two bumps and a point"],
    ["Diamond", "🔷", "a square balanced on its corner"],
    ["Moon", "🌙", "a curved crescent"]
  ];

  var ANIMAL_SOUNDS = [
    ["🐄", "Moo"], ["🐶", "Woof"], ["🐱", "Meow"], ["🐸", "Ribbit"], ["🦆", "Quack"],
    ["🐑", "Baa"], ["🐷", "Oink"], ["🦁", "Roar"], ["🐝", "Buzz"], ["🐴", "Neigh"], ["🐔", "Cluck"]
  ];

  var BABIES = [
    ["cat", "kitten"], ["dog", "puppy"], ["cow", "calf"], ["sheep", "lamb"], ["horse", "foal"],
    ["duck", "duckling"], ["frog", "tadpole"], ["bear", "cub"], ["kangaroo", "joey"], ["goat", "kid"],
    ["butterfly", "caterpillar"], ["chicken", "chick"]
  ];

  /* "Which one…?" — every one carries a REASON, because "nice spotting!"
     teaches a three-year-old absolutely nothing. */
  var SETS = [
    ["Which one flies?", "🦋", ["🐟", "🐌", "🐢"], "A butterfly has wings. Fish swim, and snails and turtles crawl."],
    ["Which one lives in water?", "🐠", ["🐪", "🦒", "🐿️"], "Fish breathe underwater with gills. Camels, giraffes and squirrels live on land."],
    ["Which one is a fruit?", "🍌", ["🥕", "🥦", "🧅"], "Fruit grows from a flower and carries seeds. Carrots are roots, broccoli is a flower bud, onions are bulbs."],
    ["Which one do you wear?", "👟", ["🍕", "🚗", "📚"], "Shoes go on your feet. Pizza you eat, a car you ride in, a book you read."],
    ["Which one is hot?", "🔥", ["❄️", "🧊", "⛄"], "Fire is hot. Snow, ice and snowmen are all freezing cold."],
    ["Which one comes out at night?", "🌙", ["☀️", "🌻", "🏖️"], "The moon shines at night. The sun, sunflowers and the beach belong to the daytime."],
    ["Which one is an animal?", "🐘", ["🌳", "🚗", "🏠"], "Animals eat, move and grow. Trees grow but can't walk; cars and houses aren't alive at all."],
    ["Which one do you use to hear?", "👂", ["👁️", "👃", "✋"], "Ears hear, eyes see, a nose smells and a hand touches."],
    ["Which one grows in the ground?", "🥔", ["🐟", "☁️", "🧦"], "Potatoes grow underground. Fish swim, clouds float and socks come from a drawer!"],
    ["Which one is round?", "⚽", ["📕", "🚪", "🧊"], "A ball is round everywhere, with no corners. Books, doors and ice cubes have straight edges."],
    ["Which one is the baby?", "🐣", ["🐔", "🦆", "🦢"], "A chick has just hatched. Hens, ducks and swans are all grown up."],
    ["Which one keeps you dry in the rain?", "☂️", ["🕶️", "🧤", "🎈"], "An umbrella covers you. Sunglasses are for bright sun and gloves are for cold hands."]
  ];

  var SEQS = [
    ["🌱", "🌿", "🌳", "A seed sprouts, grows leaves, then becomes a tree."],
    ["🥚", "🐣", "🐔", "An egg hatches into a chick, and the chick grows into a hen."],
    ["🌧️", "🌈", "☀️", "Rain, then a rainbow while the sun comes back out."]
  ];

  /* ---------- helpers ---------- */
  function slug(s) {
    return String(s).toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  /* =========================================================
     THE SCRIPT
     ========================================================= */

  /* --- numbers 0 to 100: the building blocks of every sum --- */
  for (var n = 0; n <= 100; n++) add("n-" + n, String(n));

  /* --- fragments that sums are stitched from --- */
  add("frag-plus", "plus");
  add("frag-minus", "take away");
  add("frag-times", "times");
  add("frag-and", "and");
  add("frag-then", "then");
  add("frag-more-makes", "more makes");
  add("frag-makes", "makes");
  add("frag-is", "is");
  add("frag-each", "each.");
  add("frag-more", "more.");
  add("frag-leaves", "leaves");
  add("frag-and-another", "and another");
  add("frag-you-have", "You have");
  add("frag-berries-and-eat", "berries, and you eat");
  add("frag-how-many-left", "How many are left?");
  add("frag-counting-up", "Counting up:");
  add("frag-counts-up-by", "This one counts up by");
  add("frag-each-time", "each time.");
  add("frag-plus-what-makes", "plus what makes");
  add("frag-doubling", "Doubling means two of the same.");
  add("frag-shared-between", "shared between");
  add("frag-the-answer-is", "The answer is");
  add("frag-touch-each", "Touch each one as you count.");
  add("frag-there-are", "There are");
  add("frag-count-one-at-a-time", "Count them one at a time.");
  add("frag-more-means", "More means a bigger pile.");
  add("frag-beats", "beats");
  add("frag-the-number", "The number");
  add("frag-means", "means");
  add("frag-things", "things.");
  add("frag-thing", "thing.");
  add("frag-friends-how-many-each", "friends. How many each?");
  add("frag-share-between", "Share these fairly between");

  /* --- the questions the little tiers ask --- */
  add("q-how-many", "How many?");
  add("q-how-many-altogether", "How many altogether?");
  add("q-which-pile", "Which pile is");
  add("q-more", "Which pile has more?");
  add("q-add-them", "Add them up!");
  add("q-next-number", "Which number comes next?");
  add("q-pattern", "Keep the pattern going!");
  add("q-make-10", "How many more to make 10?");
  add("q-make-20", "How many more to make 20?");
  add("q-double", "Double it!");
  add("q-which-shape-where", "Where is the shape?");
  add("q-starts-with-letter", "Which one starts with this letter?");
  add("q-find-letter", "Find the letter.");
  add("q-little-letter", "Which is the little version of this letter?");
  add("q-letter-missing", "Which letter is missing?");
  add("q-spells-this", "Which one spells this?");
  add("q-rhymes", "Which word rhymes with it?");
  add("q-paint-matches", "Which paint matches?");
  add("q-animal-say", "What does this animal say?");
  add("q-what-colour", "What color is this?");
  add("q-what-next", "What comes next?");
  add("q-baby", "What is the baby called?");
  add("q-add-it-up", "Add it up.");
  add("q-take-it-away", "Take it away.");
  add("q-times-tables", "Times tables!");
  add("q-share-them-out", "Share them out.");
  add("q-fill-the-gap", "Fill in the gap.");

  SHAPES.forEach(function (s) {
    var k = slug(s[0]);
    add("q-where-" + k, "Where is the " + s[0].toLowerCase() + "?");
    add("q-which-shape-" + k, "Which one is a " + s[0].toLowerCase() + "?");
    add("t-shape-" + k, "That's the " + s[0].toLowerCase() + "!");
    add("t-shape-is-" + k, "A " + s[0].toLowerCase() + " is " + s[2] + ".");
    add("w-" + k, s[0]);
  });
  ABC.forEach(function (a) {
    var L = a[0], k = L.toLowerCase(), w = a[2];
    add("q-starts-" + k, "Which one starts with the letter " + L + "?");
    add("q-find-" + k, "Find the letter " + L + ".");
    add("q-little-" + k, "Which is the little version of the letter " + L + "?");
    add("t-abc-" + k, w + " starts with the letter " + L + ".");
    add("t-little-" + k, "Big " + L + " and little " + L + " are the same letter, just different sizes.");
    add("w-" + slug(w), w);
    add("letter-" + k, "The letter " + L + ".");
  });
  SOUNDS.forEach(function (s) {
    var k = s[0];
    add("q-sound-" + k, "Which one starts with the " + s[3] + " sound?");
    add("t-sound-" + k, s[3] + ", " + s[2] + "! Say it slowly, and listen to the very first sound.");
    add("w-" + slug(s[2]), s[2]);
  });
  TINY_WORDS.forEach(function (w) {
    var k = slug(w[0]);
    add("q-spell-" + k, "Which one spells " + w[0] + "?");
    add("t-spell-" + k, "The word is " + w[0] + ". " + w[0].toUpperCase().split("").join(", ") + ".");
    add("w-" + k, w[0]);
  });
  RHYMES.forEach(function (r) {
    var k = slug(r[0]);
    add("q-rhyme-" + k, "Which word rhymes with " + r[0] + "?");
    add("t-rhyme-" + k, "Rhyming words end with the same sound as " + r[0] + ".");
    add("w-" + k, r[0]);
    r[1].forEach(function (x) { add("w-" + slug(x), x); });
    r[2].forEach(function (x) { add("w-" + slug(x), x); });
  });
  PAINTS.forEach(function (p) {
    var k = slug(p[0]);
    add("q-which-is-" + k, "Which one is " + p[0].toLowerCase() + "?");
    add("t-colour-" + k, p[0] + ", like " + p[3] + ".");
    add("w-" + k, p[0]);
  });
  ANIMAL_SOUNDS.forEach(function (a) {
    var k = slug(a[1]);
    add("t-says-" + k, "It says " + a[1] + "!");
    add("w-" + k, a[1]);
  });
  BABIES.forEach(function (b) {
    var k = slug(b[0]);
    add("q-baby-" + k, "What is a baby " + b[0] + " called?");
    add("t-baby-" + k, "A baby " + b[0] + " is called a " + b[1] + ".");
    add("w-" + slug(b[1]), b[1]);
  });
  SETS.forEach(function (s, i) {
    add("q-set-" + i, s[0]);
    add("t-set-" + i, s[3]);
  });
  SEQS.forEach(function (s, i) { add("t-seq-" + i, s[3]); });

  /* --- praise and the other things the valley says after an answer --- */
  var PRAISE = ["Yes!", "That's right!", "Brilliant!", "You got it!", "Super!", "Nice one!",
                "Exactly right!", "Yes! Well done!", "Wonderful!", "You clever thing!"];
  PRAISE.forEach(function (p, i) { add("p-" + i, p); });
  add("p-try-this", "Try this one.");
  add("p-not-quite", "Not quite.");
  add("p-fixed", "Fixed it! That one is out of your basket.");
  add("p-level-up", "Level up!");
  add("p-heating-up", "Heating up! The questions get harder, and they pay more.");
  add("p-cooling-off", "Taking it a little easier for a bit.");
  add("p-step-up", "Ooh, a step up! This one is from the level above.");
  add("p-basket-full", "The basket is full! Here comes the harvest.");
  add("p-brush", "The pool bubbled up a brand new paint brush!");
  add("p-read-aloud-on", "I will read the questions out loud.");
  add("p-hello", "Hello! Let's learn something.");

  /* --- what the Craepet says, by mood --- */
  var MOODS = {
    great:  ["I feel amazing!", "Best day ever!", "Let's learn something!", "I love it here."],
    good:   ["I'm doing okay!", "What's next?", "Nice to see you.", "Ready when you are."],
    hungry: ["My tummy is rumbling…", "Got any berries?", "I could eat a whole pie.", "Snack? Please?"],
    bored:  ["I'm a bit bored…", "Can we play?", "Let's do something!", "Where's my ball?"],
    tired:  ["I'm sleepy…", "Just five more minutes.", "Yawn.", "So… tired…"],
    dirty:  ["I'm all mucky.", "I need a wash!", "There's jam in my fur.", "Bath time?"]
  };
  Object.keys(MOODS).forEach(function (m) {
    MOODS[m].forEach(function (line, i) { add("m-" + m + "-" + i, line); });
  });
  add("m-yum", "Mmm, yummy!");
  add("m-wheee", "Wheee!");
  add("m-much-better", "Much better!");
  add("m-zzz", "Zzz…");
  add("m-aaah", "Aaah.");
  add("m-favourite", "My favourite!");
  add("m-look-at-me", "Look at me!");
  add("m-home-sweet-home", "Home sweet home!");
  /* --- wishes, the wardrobe and the post --- */
  add("w-granted", "You granted my wish! Thank you!");
  add("w-new", "I have a new wish. Can you guess what it is?");
  add("w-all-done", "That is all my wishes for today. You are the best.");
  add("m-dress-up", "Look at me! Do you like it?");
  add("post-arrived", "You have post! Somebody sent you a present.");
  add("post-open", "Let's open it!");
  add("post-sent", "Your present is on its way.");
  add("diary-intro", "Here is what I wrote in my diary.");
  add("egg-hello", "Your egg is here! Learn something, or tap it, and it will hatch.");
  add("egg-crack", "It's cracking!");
  /* --- the calendar: seasons, holidays and hatch-days --- */
  var CALENDAR = {
    "sea-spring": "It's spring! Everything is growing.", "sea-summer": "It's summer! Long days and ice cream.",
    "sea-autumn": "It's autumn! Leaves everywhere and pumpkins on the vine.", "sea-winter": "It's winter! Cold outside, cosy in.",
    "hol-newyear": "Happy New Year! A whole year of learning ahead.", "hol-valentine": "Happy Valentine's Day — give somebody a present!",
    "hol-stpatrick": "Happy St Patrick's Day! Everything green pays extra.", "hol-aprilfool": "April Fools! Don't believe a word your Craepet says today.",
    "hol-easter": "Happy Easter! Eggs everywhere — and you know all about those.", "hol-earthday": "Happy Earth Day! The Rainbow Pool knows all about the wide world.",
    "hol-mothers": "Happy Mother's Day! Post Mum a present.", "hol-fathers": "Happy Father's Day!",
    "hol-july4": "Happy Fourth of July! Fireworks over the valley tonight.", "hol-halloween": "Happy Halloween! The Shade is in a very good mood.",
    "hol-spooky": "Spooky Week! Halloween is nearly here.", "hol-thanksgiving": "Happy Thanksgiving! Say thank you to somebody — post them a present.",
    "hol-xmas": "Merry Christmas! There is a present under the tree.", "hol-nye": "Happy New Year's Eve! Stay up late (in the valley, at least).",
    "hol-present": "There's a present for you! Open it!", "hol-hatchday": "Happy hatch-day! It's my birthday!",
    "hol-months": "Look how big I'm getting!", "hol-birthday": "Happy birthday! Let's have cake.",
    "hol-sleeps": "Only a few more sleeps until Christmas!"
  };
  Object.keys(CALENDAR).forEach(function (k) { add(k, CALENDAR[k]); });

  /* --- the prize wheel --- */
  ["Ten coins.", "Forty coins!", "A snack and fifteen coins!", "Twenty coins.",
   "A big lump of experience!", "Seventy five coins!", "Fifteen coins.",
   "The jackpot! A hundred and fifty coins!"].forEach(function (s, i) { add("wheel-" + i, s); });

  /* --- the facts a book can teach --- */
  var FACTS = {
    tot:   ["Cows say moo!", "The sun is a star.", "Fish live in water.", "Bees make honey.", "Owls fly at night."],
    early: ["A baby frog is a tadpole.", "Rainbows have 7 colors.", "Spiders have 8 legs.", "Snow is frozen water.",
            "Bats sleep upside down.", "A butterfly starts as a caterpillar."],
    mid:   ["Honey never spoils — jars from ancient tombs were still edible.",
            "A group of crows is called a murder.",
            "Octopuses have three hearts and blue blood.",
            "Bananas are berries, but strawberries are not.",
            "Sharks existed before trees did.",
            "A day on Venus is longer than its year.",
            "Wombat poo is cube-shaped.",
            "Your bones are about four times stronger than concrete."],
    big:   ["The Eiffel Tower grows about 15 cm taller in summer as the iron expands.",
            "Sound cannot travel through space — there is nothing to carry the vibration.",
            "There are more trees on Earth than stars in the Milky Way.",
            "Antarctica is technically a desert: it almost never rains or snows there.",
            "Light from the Sun takes about 8 minutes and 20 seconds to reach us.",
            "The heart pumps roughly 7,500 litres of blood every single day.",
            "Venus spins backwards compared with almost every other planet.",
            "A teaspoon of neutron star would weigh about a billion tonnes."],
    grown: ["Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid.",
            "Oxford University is older than the Aztec Empire.",
            "The Fahrenheit and Celsius scales agree at exactly −40°.",
            "Norway knighted a penguin — Sir Nils Olav, colonel-in-chief of the Norwegian King's Guard.",
            "There is enough DNA in one human body to stretch from the Sun to Pluto and back — several times.",
            "The shortest war in history lasted 38 minutes (Britain vs Zanzibar, 1896).",
            "Bubble wrap was invented as textured wallpaper.",
            "Iceland has no mosquitoes at all."]
  };
  Object.keys(FACTS).forEach(function (t) {
    FACTS[t].forEach(function (f, i) { add("fact-" + t + "-" + i, f); });
  });
  add("fact-intro", "Did you know?");

  /* =========================================================
     THE ARENA — what the rivals say, and what The Shade says.
     The Shade gets the most lines because the kids fight him
     the most. Every line is a token so the narrator can do the
     voices.
     ========================================================= */
  var ARENA = {
    /* the sparring partners */
    "pip-intro": "Bet you can't beat me at counting!",
    "pip-hit": "Ow! Okay, you can count.",
    "pip-win": "I win! Come back when you've practised.",
    "pip-lose": "You beat me! That was brilliant.",
    "mossy-intro": "I have read every book in the valley.",
    "mossy-hit": "Hmm. You have read a few too.",
    "mossy-win": "Back to the library with you.",
    "mossy-lose": "Well read, my friend. Well read.",
    "splash-intro": "Numbers are my whole personality.",
    "splash-hit": "Ooh, quick sums!",
    "splash-win": "Splash! Numbers win again.",
    "splash-lose": "You out-counted me. Respect.",
    "ember-intro": "Warm up. You'll need it.",
    "ember-hit": "Hot! Very hot!",
    "ember-win": "Too hot to handle.",
    "ember-lose": "You're on fire! Not literally. Well done.",
    "orbit-intro": "Ask me anything about the sky.",
    "orbit-hit": "By the rings of Saturn!",
    "orbit-win": "Back to the observatory, student.",
    "orbit-lose": "Stellar. Simply stellar.",

    /* the shadow army — the floors of the tower */
    "umbra-intro": "Umbra, at your service. Now hold still.",
    "dusk-intro": "The light is going. Can you still think?",
    "gloom-intro": "Gloom hopes you brought a lantern.",
    "murk-intro": "Murk is small. Murk is mean.",
    "hush-intro": "Hush now. Only right answers count.",
    "wisp-intro": "Wisp knows every star. Do you?",
    "minion-hit": "Argh! The light burns!",
    "minion-hits": "Ha! The shadows grow.",
    "minion-lose": "The shadow fades. You may climb.",
    "minion-win": "The tower keeps you. Try again.",

    /* The Shade himself */
    "shade-intro": "Nobody has beaten me. Nobody.",
    "shade-intro-2": "You climbed all this way, just to lose?",
    "shade-intro-3": "Every answer you get wrong makes me stronger.",
    "shade-return": "You again? I have grown darker since we last met.",
    "shade-hit-1": "Impossible.",
    "shade-hit-2": "Lucky. That was luck.",
    "shade-hit-3": "Stop that. Stop knowing things.",
    "shade-hits-1": "Feel the dark.",
    "shade-hits-2": "Your Craepet looks tired.",
    "shade-hits-3": "Wrong. Delightfully wrong.",
    "shade-phase": "Enough. Now you meet my true shadow!",
    "shade-low": "This cannot be. I am the night itself.",
    "shade-lose": "You… you beat me. Take your prize, and remember this day.",
    "shade-lose-again": "Again? Fine. Fine! The tower is yours. For now.",
    "shade-win": "The valley's champion? I think not. Come back stronger.",
    "shade-trick-time": "My trick today: answer fast, or feel the dark.",
    "shade-trick-double": "My trick today: every hit counts double. Mine and yours.",
    "shade-trick-mirror": "My trick today: I ask you what you know least.",
    "shade-trick-heal": "My trick today: your mistakes are my medicine.",

    /* the narrator's battle calls */
    "b-charged": "Charged! Your next hit is a big one.",
    "b-crit": "Critical hit!",
    "b-quick": "Quick answer! Bonus damage.",
    "b-ally": "Your friend joins in!",
    "b-snack": "A snack! Health back.",
    "b-win": "You win!",
    "b-lose": "Worn out. Good try.",
    "b-floor-clear": "Floor cleared! Climb higher.",
    "b-new-rank": "A new arena rank!",
    "b-timer": "Quick! Time is running out."
  };
  Object.keys(ARENA).forEach(function (k) { add("a-" + k, ARENA[k]); });

  /* =========================================================
     THE PEOPLE OF THE VALLEY — what the shopkeepers say.
     ========================================================= */
  var NPC = {
    farm: ["Berries are ripe! Every sum you get right, I'll pick you one.", "Mind the bees — they're friendly, mostly.",
      "My Snorbits eat me out of carrots. Yours too?", "A full basket is worth a bonus. Don't stop at seven!"],
    well: ["Every word you know is a coin in the bucket, young one.", "I have read every book in this valley twice. Mossy read them once.",
      "Words are the oldest magic there is.", "Drop a word down the well and listen for the splash."],
    pool: ["The pool knows EVERYTHING. Ask it about the sea, the stars, the sky!", "Fifteen right and I'll bubble you up a brand new colour.",
      "Wet feet are happy feet.", "I washed up a bar of soap this morning. Somebody will want it."],
    market: ["Fresh stock every morning, dear, and nobody's shelf is the same as anybody else's.", "Work out your change and I'll tip you for it.",
      "A hat, a petpet, a bar of soap — something for everyone.", "The bank next door pays interest, you know. Three per cent!"],
    bank: ["Money that sits in the bank makes more money. That is the whole secret.", "Three per cent a night, compounded. Ask me what compounded means.",
      "Nothing in my vault can be spent by accident. That is the point of a vault.", "A hundred in tonight is a hundred and three tomorrow."],
    arena: ["Right answers hit. Wrong answers get hit. Simple.", "Three in a row and you're charged. Fourth one's a critical.",
      "The tower goes up for ever. So does The Shade's temper.", "Bring a friend. A family Craepet lands its own hits."],
    games: ["Quick fingers AND a quick mind — that's my games room!", "Sky Catch is all about the rule. Read it first, then run.",
      "Memory Match: every pair you keep is something you know.", "Best scores go on the wall. Beat your own!"],
    quests: ["Three quests a day, same three for the whole family. Race them.", "The wheel is eight slices, all the same size. One in eight, every time.",
      "Your gift grows every day you come back. Don't break the streak!", "Random events? Oh, they happen on the paths. Keep walking."]
  };
  Object.keys(NPC).forEach(function (k) { NPC[k].forEach(function (line, i) { add("npc-" + k + "-" + i, line); }); });

  /* The rules of the games room, so the littlest players can HEAR what to
     catch. These must match the strings in catch.js and match.js exactly
     — the play-test checks that they do. */
  var GAME_RULES = [
    "Catch the ⭐ stars!", "Catch the 🍓 strawberries!", "Catch the letter A!", "Catch the 🔴 red ones!",
    "Catch the numbers, not the letters!", "Catch the EVEN numbers!", "Catch the ODD numbers!", "Catch numbers BIGGER than 10!",
    "Catch the multiples of 5!", "Catch the multiples of 2!", "Catch the VOWELS!", "Catch the multiples of 3!",
    "Catch the multiples of 4!", "Catch the PRIME numbers!", "Catch the SQUARE numbers!", "Catch numbers whose digits add up to 9!",
    "Catch the multiples of 7!", "Catch the multiples of 8!", "Catch numbers whose digits add up to 10!", "Catch numbers that divide by 6!",
    "Find the two that are the same!", "Match each animal to the sound it makes!", "Match each colour to something that colour!",
    "Match each sum to its answer!", "Match each times table to its answer!", "Match each animal to its baby!",
    "Match each word to one that means the SAME!", "Match each word to its OPPOSITE!", "Match each fraction to its percentage!",
    "Match each country to its capital!", "Match each word to its meaning!", "Match each square root to its answer!",
    "Match each product to its answer!"
  ];
  GAME_RULES.forEach(function (r, i) { add("rule-" + i, r); });

  /* What the pet says about the day itself. */
  var CHATTER = [
    "Yawn… is it bedtime soon?", "Look at all the stars!", "Good morning! Is it breakfast?", "The sky's gone all orange!",
    "Listen to the rain!", "Splish splash!", "SNOW! Can we go out in it?", "Whoosh! Hold my hat!", "A rainbow! Did you see it?",
    "What a sunny day!"
  ];
  CHATTER.forEach(function (c, i) { add("chat-" + i, c); });
  var GAME_TALK = { "g-catch-go": "Ready? Catch!", "g-catch-over": "Time's up! Let's see how you did.", "g-match-found": "That's a pair!",
    "g-match-done": "You found them all!", "g-new-best": "A new best score!" };
  Object.keys(GAME_TALK).forEach(function (k) { add(k, GAME_TALK[k]); });

  /* =========================================================
     LOOK-UPS the game uses at play time.
     ========================================================= */
  function has(tok) { return Object.prototype.hasOwnProperty.call(T, tok); }
  /* Every line, findable by its exact text — so a rule or a shopkeeper's
     line written once here can be spoken from its recording. */
  var BY_TEXT = {};
  Object.keys(T).forEach(function (k) { if (BY_TEXT[T[k]] === undefined) BY_TEXT[T[k]] = k; });
  function spoken(text) {
    var s = String(text == null ? "" : text);
    return Object.prototype.hasOwnProperty.call(BY_TEXT, s) ? BY_TEXT[s] : s;
  }
  /* The token for a single answer: a number, a word from the lists, or
     nothing (the narrator then reads the plain text instead). */
  function tokenFor(text) {
    if (text === null || text === undefined) return null;
    var s = String(text).trim();
    if (/^-?\d+$/.test(s) && has("n-" + s)) return "n-" + s;
    var k = "w-" + slug(s);
    return has(k) ? k : null;
  }
  /* The plain words for a list of tokens, for the browser-voice fallback. */
  function textOf(tokens) {
    return (tokens || []).map(function (t) { return has(t) ? T[t] : String(t); }).join(" ")
      .replace(/\s+([,.!?])/g, "$1");
  }

  return {
    T: T,
    ABC: ABC, SOUNDS: SOUNDS, TINY_WORDS: TINY_WORDS, RHYMES: RHYMES,
    PAINTS: PAINTS, SHAPES: SHAPES, ANIMAL_SOUNDS: ANIMAL_SOUNDS, BABIES: BABIES,
    SETS: SETS, SEQS: SEQS, PRAISE: PRAISE, MOODS: MOODS, FACTS: FACTS, ARENA: ARENA,
    NPC: NPC, GAME_RULES: GAME_RULES, CHATTER: CHATTER,
    slug: slug, has: has, tokenFor: tokenFor, textOf: textOf, spoken: spoken,
    count: function () { return Object.keys(T).length; }
  };
})();
