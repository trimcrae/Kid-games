/* ===========================================================
   Spelling Bee — a kid-friendly version of the NYT word game.
   -----------------------------------------------------------
   Make as many words as you can from a honeycomb of 7 letters.
   • Every word must use the GOLDEN middle letter.
   • Words are at least 4 letters long, letters can repeat.
   • Use all 7 letters in one word for a "Pangram" bonus! 🌟
   • Little Bee mode 🐣 also accepts 3-letter words, so the
     smaller kids can join in on the same hives.

   Each hive has its OWN list of allowed words, so there's no
   giant dictionary to download — and we know every word is one
   the kids will actually know. Found words are saved in
   localStorage per hive (key spellingBee.v1) and the score is
   re-worked out from them on load, so old saves keep working.

   To ADD A HIVE: copy a block in PUZZLES and APPEND it to the
   END of the list (save slots are "p" + array index, so never
   re-order or insert). letters is [centre, ...six outer].
   List every accepted 4+ word in `words`, 3-letter words in
   `little`, and give it a `tier` (1 easy … 4 grown-up).
   =========================================================== */

(function () {
  "use strict";

  const MIN_LEN = 4;
  const LITTLE_LEN = 3;

  /* tier 1 = gentlest, 4 = a proper grown-up hive for Mum */
  const TIERS = {
    1: { label: "Easy", emoji: "🌱" },
    2: { label: "Medium", emoji: "🐝" },
    3: { label: "Tricky", emoji: "🔥" },
    4: { label: "Grown-up", emoji: "☕" },
  };

  /* ---------- the hives ----------
     letters[0] is the golden centre letter (required in every word). */
  const PUZZLES = [
    {
      name: "Dolphin Dive",
      emoji: "🐬",
      tier: 1,
      letters: ["o", "d", "l", "p", "h", "i", "n"],
      words: [
        "dolphin", "hold", "hood", "hoop", "idol", "lion", "loin",
        "loop", "plod", "polo", "pond", "pool", "hippo", "doll",
        "onion", "plop", "dodo", "noon", "loon", "poll", "pinion",
        "opinion", "lollipop", "hoodlin",
      ],
      little: ["nod", "pod", "hop", "pop", "lop", "oil", "old", "ion"],
    },
    {
      name: "Family Time",
      emoji: "👪",
      tier: 3,
      letters: ["a", "r", "t", "s", "p", "e", "n"],
      words: [
        "parents", "apart", "area", "arts", "ears", "near", "neat",
        "pant", "pants", "paper", "parent", "part", "parts", "past",
        "paste", "pasta", "pear", "pears", "rant", "rants", "rate",
        "rates", "tear", "tears", "treat", "treats", "spare", "spear",
        "star", "stare", "start", "snare", "eaten", "ants", "snap",
        "snaps", "trap", "traps", "strap", "straps", "eats", "east",
        "seat", "seats", "peas", "tarts", "arena", "papa", "nana",
        "pattern", "patterns", "partner", "partners", "apparent",
        "repeat", "repeats", "retreat", "retreats", "nearest",
        "eastern", "transparent", "aspen", "antenna", "antennas",
        "separate", "separates", "peasant", "peasants",
      ],
      little: ["ant", "art", "ate", "ear", "eat", "nap", "pan", "pat", "rat", "sat", "tan", "tap", "tar", "sea"],
    },
    {
      name: "Carrot Patch",
      emoji: "🥕",
      tier: 3,
      letters: ["t", "c", "a", "r", "o", "n", "s"],
      words: [
        "cartons", "actor", "actors", "carrot", "carrots", "cart",
        "carts", "cats", "coast", "coat", "coats", "cost", "oats",
        "rats", "roast", "rots", "sort", "start", "taco", "tacos",
        "tart", "toast", "tons", "torn", "carton", "ascot", "cotton",
        "cannot", "tractor", "tractors", "cartoon", "cartoons", "toss",
        "roost", "costs", "contrast", "contrasts", "contract",
        "contracts", "attract", "attracts", "constant", "contact",
        "contacts",
      ],
      little: ["act", "ant", "art", "cat", "cot", "oat", "rat", "rot", "sat", "tan", "tap", "tar", "ton", "toe"],
    },
    {
      name: "Rainbow Bright",
      emoji: "🌈",
      tier: 1,
      letters: ["n", "r", "a", "i", "b", "o", "w"],
      words: [
        "rainbow", "rain", "brain", "bran", "barn", "born",
        "iron", "warn", "worn", "brown", "robin", "brawn",
        "narrow", "banana", "onion", "bonbon", "ribbon",
        "baboon", "inborn", "noon", "bairn",
      ],
      little: ["ban", "bin", "inn", "ion", "nab", "nib", "nor", "own", "ran", "win"],
    },
    {
      name: "Treehouse",
      emoji: "🌳",
      tier: 3,
      letters: ["e", "t", "h", "o", "u", "s", "r"],
      words: [
        "treehouse", "treehouses", "house", "houses", "horse", "horses",
        "shore", "store", "stores", "those", "three", "threes", "tree",
        "trees", "hero", "heroes", "here", "hose", "rose", "roses",
        "rote", "ruse", "other", "others", "shoe", "shoes", "shorter",
        "shortest", "sore", "tore", "true", "truest", "user", "users",
        "route", "routes", "rouse", "rest", "test", "tester", "torte",
        "otters", "otter", "roster", "rooster", "roosters", "soothe",
        "teeth", "restore", "trouser", "trousers", "hotter", "hottest",
        "hostess", "utter", "utters", "outer", "outset",
      ],
      little: ["her", "hoe", "hot", "hue", "toe", "ore", "our", "set", "sue", "use", "rot", "the"],
    },
    {
      name: "In the Garden",
      emoji: "🌻",
      tier: 3,
      letters: ["a", "g", "r", "d", "e", "n", "s"],
      words: [
        "gardens", "garden", "gardener", "gardeners", "danger",
        "dangers", "dare", "dares", "dear", "dears", "drag", "drags",
        "earn", "earns", "grade", "grades", "grand", "grands", "near",
        "nears", "range", "ranges", "read", "reads", "sand", "sane",
        "sear", "snare", "anger", "angers", "sedan", "sedans", "area",
        "sander", "darn", "darns", "errand", "errands", "grass",
        "garage", "garages", "eager", "agree", "agrees", "gander",
        "ages", "rage", "rages", "sage", "sages", "snag", "snags",
        "seas", "agenda", "agendas", "grandad", "engage", "engages",
        "engaged", "endanger", "endangers", "regard", "regards",
      ],
      little: ["age", "and", "are", "ear", "end", "era", "gas", "nag", "ran", "rag", "sad", "sea"],
    },
    {
      name: "Birthday Party",
      emoji: "🎉",
      tier: 3,
      letters: ["t", "p", "a", "r", "i", "e", "s"],
      words: [
        "parties", "part", "parts", "past", "paste", "pirate", "pirates",
        "rate", "rates", "tear", "tears", "tire", "tires", "tart",
        "taste", "taper", "tapers", "trip", "trips", "trap", "traps",
        "treat", "treats", "stir", "strip", "stripe", "stripes", "spit",
        "spite", "star", "start", "taps", "tips", "pita", "pitas",
        "trait", "artist", "artists", "stairs", "tiara", "tiaras",
        "pastries", "sister", "sisters", "tarts", "pets", "rats",
        "eats", "east", "test", "tests", "sprite", "sprites", "spirit",
        "spirits", "strait", "straits", "repeat", "repeats",
        "prettiest", "tapestries", "parasite", "parasites", "irritate",
        "irritates",
      ],
      little: ["ate", "art", "eat", "sat", "sit", "tea", "tie", "tip", "top", "tap", "tar", "pat", "pit", "rat"],
    },
    {
      name: "Monster Mash",
      emoji: "👹",
      tier: 3,
      letters: ["s", "m", "o", "n", "t", "e", "r"],
      words: [
        "monster", "monsters", "most", "nest", "nests", "rest", "rests",
        "rose", "roses", "sent", "snore", "snores", "some", "sore",
        "sores", "sort", "sorts", "stem", "stems", "stern", "stone",
        "stones", "store", "stores", "storm", "storms", "toes", "tons",
        "moms", "noses", "tester", "rents", "stress", "snort", "snorts",
        "monsoon", "monsoons", "sonnet", "roost", "roosts", "remote",
        "remotes", "mentor", "mentors", "tremor", "tremors", "sermon",
        "sermons", "moment", "moments", "nonsense", "rooster",
        "roosters", "sooner", "tenor", "tenors", "torment", "torments",
        "restroom", "restrooms",
      ],
      little: ["ems", "net", "nos", "one", "ore", "set", "son", "sun", "ten", "toe", "ton", "met", "men", "sob"],
    },
    {
      name: "Unicorn Magic",
      emoji: "🦄",
      tier: 2,
      letters: ["n", "u", "i", "c", "o", "r", "s"],
      words: [
        "unicorns", "unicorn", "corn", "corns", "coin", "coins", "icon",
        "icons", "iron", "irons", "scorn", "scorns", "sonic", "cousin",
        "cousins", "onion", "onions", "union", "unions", "noun", "nouns",
        "ruin", "ruins", "incision", "incisor", "incisors", "unison",
        "scion", "conic", "cocoon", "cocoons", "soon", "noon", "incur",
        "incurs",
      ],
      little: ["con", "ion", "inn", "nor", "run", "sin", "son", "sun", "urn", "sun"],
    },
    {
      name: "Camping Trip",
      emoji: "🏕️",
      tier: 2,
      letters: ["a", "c", "m", "p", "i", "n", "g"],
      words: [
        "camping", "campaign", "campaigning", "camp", "main", "gain",
        "pain", "again", "panic", "magic", "manic", "mania", "maniac",
        "magma", "mama", "papa", "gang", "pang", "gaping", "aging",
        "napping", "mapping", "aiming", "gaining", "pacing", "gaming",
        "capping", "imagining",
      ],
      little: ["cap", "can", "cam", "gap", "map", "man", "nap", "pan", "pig", "amp", "gam", "nag"],
    },
    {
      name: "Royal Kingdom",
      emoji: "👑",
      tier: 1,
      letters: ["o", "k", "i", "n", "g", "d", "m"],
      words: [
        "kingdom", "komodo", "domino", "dingo", "indigo", "doing",
        "oink", "good", "mood", "moon", "noon", "doom", "gong", "monk",
        "kiddo", "onion", "kimono", "going", "dodo", "dodging",
        "nodding", "idiom",
      ],
      little: ["dog", "don", "goo", "moo", "nod", "odd", "kid", "din", "dim"],
    },
    {
      name: "Helping Hands",
      emoji: "🤝",
      tier: 1,
      letters: ["e", "h", "l", "p", "i", "n", "g"],
      words: [
        "helping", "helpline", "help", "heel", "peel", "pile", "pine",
        "line", "nine", "glee", "genie", "engine", "linen", "hinge",
        "pipeline", "peeling", "nipple", "pigpen", "hippie", "ninepin",
        "nineteen",
      ],
      little: ["eel", "gel", "hen", "leg", "pen", "peg", "pep", "hip", "lip", "pie"],
    },

    /* ---------- newer hives — always APPEND, never insert ---------- */
    {
      name: "Flower Meadow",
      emoji: "🌸",
      tier: 1,
      letters: ["o", "f", "l", "w", "e", "r", "s"],
      words: [
        "flowers", "flower", "follow", "follows", "floor", "floors",
        "fool", "fools", "wool", "wolf", "fowl", "fowls", "flow",
        "flows", "slow", "slower", "lower", "lowers", "owls", "role",
        "roles", "rose", "roses", "sore", "sores", "wore", "worse",
        "loose", "loser", "losers", "sole", "soles", "swore", "sorrow",
        "sorrows", "elbow", "flossed",
      ],
      little: ["low", "owl", "for", "foe", "ore", "row", "sow", "woe", "sew", "fro", "roe"],
    },
    {
      name: "Princess Dress",
      emoji: "👗",
      tier: 2,
      letters: ["e", "p", "r", "i", "n", "c", "s"],
      words: [
        "princess", "prince", "princes", "price", "prices", "precise",
        "spice", "spices", "since", "nice", "niece", "nieces", "piece",
        "pieces", "ripe", "ripen", "ripens", "snipe", "spine", "spines",
        "spire", "siren", "sirens", "sincere", "recipe", "recipes",
        "pierce", "pierces", "press", "presses", "epic", "epics",
        "creep", "creeps", "screen", "screens", "spree", "series",
        "spies", "seen", "pine", "pines", "nine", "nines", "incense",
        "pincers", "crispiness",
      ],
      little: ["ice", "pie", "pen", "pin", "rip", "sip", "see", "sir", "ire", "ice"],
    },
    {
      name: "Diamond Mine",
      emoji: "⛏️",
      tier: 2,
      letters: ["d", "i", "a", "m", "o", "n", "s"],
      words: [
        "diamonds", "diamond", "admission", "admissions", "dominos",
        "domain", "domains", "nomad", "nomads", "disdain", "disdains",
        "amid", "maid", "maids", "mind", "minds", "sand", "sands",
        "said", "madam", "madams", "dodo", "dodos", "moods", "mood",
        "dooms", "doom", "island", "islands", "mansion", "mansions",
        "damson",
      ],
      little: ["add", "aid", "and", "dad", "dim", "din", "mad", "mid", "nod", "odd", "sad", "did"],
    },
    {
      name: "Mum's Big Hive",
      emoji: "☕",
      tier: 4,
      letters: ["e", "p", "a", "r", "c", "l", "s"],
      words: [
        "parcels", "parcel", "place", "places", "palace", "palaces",
        "replace", "replaces", "escape", "escapes", "cereal", "cereals",
        "cleanse", "clear", "clears", "cellar", "cellars", "caller",
        "callers", "recall", "recalls", "career", "careers", "prance",
        "prances", "apple", "apples", "please", "pleases", "relapse",
        "relapses", "caper", "capers", "scale", "scales", "scarce",
        "seal", "seals", "sale", "sales", "real", "reel", "reels",
        "peel", "peels", "spell", "spells", "sleep", "sleeps", "asleep",
        "creep", "creeps", "crease", "creases", "cease", "ceases",
        "peace", "pace", "paces", "race", "races", "lace", "laces",
        "case", "cases", "cape", "capes", "care", "cares", "acre",
        "acres", "eels", "else", "lease", "leases", "recess", "spare",
        "spear", "spares", "spears", "clasp", "clasps", "carpels",
        "escapees", "peacefuls", "parallels", "sparkles",
      ],
      little: ["ace", "ale", "ape", "are", "arc", "car", "cap", "ear", "eel", "era", "lap", "pal", "par", "pea", "sea", "see", "sap"],
    },
  ];

  /* ---------- kid-friendly meanings for the trickier words ----------
     Shown when a word is found and when a found-chip is tapped, so the
     game teaches vocabulary, not just letter-juggling. Plurals fall
     back to the singular automatically. */
  const DEFS = {
    loin: "a cut of meat from an animal's side",
    idol: "someone lots of people look up to",
    plod: "to walk slowly with heavy steps",
    plop: "the sound of something dropping into water",
    polo: "a ball game played while riding horses",
    dodo: "a chunky bird that lived long ago and is gone now",
    loon: "a diving water bird with a spooky call",
    pinion: "a bird's wing — also a little cog in a machine",
    opinion: "what YOU think about something",
    lollipop: "a sweet on a stick",
    bran: "the healthy outside part of grain",
    brawn: "big strong muscles",
    bairn: "a Scottish word for a child",
    robin: "a little bird with a red-orange chest",
    ribbon: "a long strip of pretty cloth for tying bows",
    baboon: "a big monkey with a long dog-like face",
    inborn: "something you were born already knowing how to do",
    narrow: "thin — not wide at all",
    bonbon: "a small fancy candy",
    ascot: "a fancy scarf tied at the neck",
    carton: "a cardboard box for food or drink",
    contrast: "how different two things look next to each other",
    contract: "a promise written down and signed",
    constant: "staying exactly the same, never changing",
    attract: "to pull something towards you, like a magnet",
    tractor: "a strong farm machine that pulls things",
    torte: "a fancy layered cake",
    rote: "learning something by repeating it over and over",
    ruse: "a clever trick",
    rouse: "to wake someone up",
    roster: "a list of everyone on a team",
    rooster: "a boy chicken who crows at sunrise",
    roost: "the spot where birds sit and sleep",
    soothe: "to gently calm someone down",
    restore: "to fix something back to how it was",
    trouser: "the leg part of a pair of pants",
    hostess: "the lady who welcomes guests",
    outset: "the very beginning of something",
    utter: "to say something out loud",
    otter: "a playful river animal that floats on its back",
    sedan: "a family car with four doors",
    snare: "a trap for catching animals",
    gander: "a boy goose",
    gardener: "someone who looks after plants",
    errand: "a little job or trip, like picking up milk",
    eager: "excited and ready to go",
    sander: "a tool that makes wood smooth",
    sage: "a very wise person — also a tasty herb",
    snag: "to catch or grab something quickly",
    rage: "very, very big anger",
    agenda: "a list of things you plan to do",
    endanger: "to put something in danger",
    regard: "to look at something with care and respect",
    engage: "to join in and get really involved",
    arena: "a big place where games and shows happen",
    stern: "serious and strict",
    spite: "wanting to bother someone on purpose",
    pita: "a flat round pocket bread",
    trait: "one special thing about a person",
    taper: "to get thinner at one end",
    artist: "a person who makes art",
    pastries: "sweet baked treats, like croissants",
    sprite: "a tiny magical fairy",
    spirit: "the feeling inside you that keeps you going",
    strait: "a narrow strip of sea between two bits of land",
    tapestries: "big pictures woven out of coloured thread",
    parasite: "a creature that lives on another and takes its food",
    irritate: "to annoy or bother someone",
    pattern: "something that repeats in the same order again and again",
    partner: "the person you team up with",
    apparent: "easy to see — plain as day",
    nearest: "the closest one of all",
    eastern: "on the east side, where the sun comes up",
    transparent: "so clear you can see straight through it",
    aspen: "a tall tree whose leaves shiver in the wind",
    antenna: "a feeler on a bug's head, or a TV aerial",
    separate: "to move things apart from each other",
    peasant: "a farm worker in the old days",
    scorn: "to look down on something as not good enough",
    sonic: "about sound — speedy as sound itself",
    scion: "a young shoot cut from a plant to grow a new one",
    conic: "shaped like a cone",
    cocoon: "the silky case a caterpillar makes before turning into a moth",
    incision: "a neat little cut, like a doctor makes",
    incisor: "one of the flat front teeth you bite with",
    unison: "everyone doing or singing exactly the same thing at once",
    incur: "to end up with something you didn't want, like a fine",
    cousin: "your aunt or uncle's kid",
    union: "joining together as one team",
    noun: "a word that names a person, place or thing",
    ruin: "to wreck or spoil something",
    icon: "a small picture that stands for something",
    campaign: "a big plan to win something",
    panic: "sudden scary worry",
    manic: "wildly, jumpily excited",
    mania: "a crazy-big excitement for something",
    maniac: "someone acting wildly out of control",
    magma: "hot melted rock under a volcano",
    gaping: "wide, wide open",
    aging: "getting older",
    komodo: "the biggest lizard in the world",
    kimono: "a long Japanese robe with wide sleeves",
    indigo: "a deep blue-purple colour",
    dingo: "a wild dog from Australia",
    domino: "a dotted tile for stacking and toppling games",
    idiom: "a saying that doesn't mean what it says, like 'raining cats and dogs'",
    monk: "a quiet man who lives a simple, prayerful life",
    kiddo: "a friendly nickname for a kid",
    monsoon: "a season of giant rain storms",
    snort: "a loud breath out your nose, like a piggy",
    sonnet: "a little poem with exactly 14 lines",
    mentor: "a wise person who teaches and helps you",
    tremor: "a small shake, like a baby earthquake",
    sermon: "a talk about how to be good, given in church",
    tenor: "a singing man with a high voice",
    torment: "to keep bothering someone horribly",
    nonsense: "silly words that don't mean anything",
    remote: "far, far away — also the thing that changes the TV",
    linen: "light cloth made from a plant",
    hinge: "the metal joint that lets a door swing",
    genie: "a magical wish-granter from a lamp",
    glee: "big bubbly happiness",
    engine: "the machine part that makes things go",
    helpline: "a phone number you call to get help",
    pipeline: "a long tube that carries water or oil a long way",
    ninepin: "one of the pins you knock down in bowling",
    pigpen: "the muddy pen where pigs live",
    hippie: "a peace-loving person with flowery clothes",
    heel: "the back part of your foot",
    peel: "to take the skin off a fruit",
    fowl: "a bird that people keep, like a chicken or duck",
    sorrow: "a deep, heavy sadness",
    elbow: "the bendy middle of your arm",
    prince: "the son of a king or queen",
    princess: "the daughter of a king or queen",
    precise: "exactly right, down to the last bit",
    sincere: "really meaning what you say",
    recipe: "the instructions for cooking something",
    pierce: "to make a hole by pushing something sharp through",
    siren: "a loud wailing warning sound",
    spire: "the tall pointy top of a church",
    incense: "sweet-smelling smoke you burn",
    pincers: "the grabby claws on a crab",
    epic: "a huge, exciting story — or just brilliant",
    niece: "your brother or sister's daughter",
    diamond: "the hardest, sparkliest stone there is",
    domain: "the land or the subject that somebody rules over",
    nomad: "someone who moves from place to place instead of settling",
    disdain: "thinking something is beneath you",
    admission: "letting someone in — or owning up to something",
    madam: "a polite way to speak to a lady",
    mansion: "a very, very big house",
    damson: "a small dark-purple plum",
    island: "land with water all the way around it",
    parcel: "a package wrapped up for posting",
    palace: "the fancy house a king or queen lives in",
    cereal: "grain food — the stuff in your breakfast bowl",
    cleanse: "to wash something really thoroughly",
    cellar: "a room underneath a house",
    recall: "to remember something, or to call it back",
    career: "the job you do for years and years",
    prance: "to bounce along proudly, like a pony",
    relapse: "to slide back into how things were before",
    caper: "a playful leap — or a mischievous adventure",
    scarce: "hard to find because there is hardly any",
    crease: "a folded line pressed into cloth or paper",
    cease: "to stop completely",
    acre: "a big square of land, about the size of a footy field",
    lease: "renting something for an agreed time",
    recess: "a break from work — playtime at school",
    clasp: "a fastener that holds two things together",
    carpel: "the seed-making part in the middle of a flower",
    onion: "a veggie that makes you cry when you cut it",
    tiara: "a small sparkly crown for a princess",
    stress: "the squeezed feeling when there's too much to do",
    cotton: "a fluffy plant we make T-shirts from",
  };
  function defFor(w) {
    if (DEFS[w]) return DEFS[w];
    if (w.length > 4 && w.slice(-1) === "s" && DEFS[w.slice(0, -1)]) return DEFS[w.slice(0, -1)];
    if (w.length > 5 && w.slice(-2) === "es" && DEFS[w.slice(0, -2)]) return DEFS[w.slice(0, -2)];
    return null;
  }

  /* ---------- saved progress ----------
     Shape:  { p0: {found:[], score:N}, …, opts:{…}, streak:{…} }
     "p" + PUZZLE INDEX has been the slot key since v1, which is why
     new hives are only ever appended to the end of PUZZLES. */
  const SAVE_KEY = "spellingBee.v1";
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && typeof s === "object") return s;
    } catch (e) { /* ignore */ }
    return {};
  }
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(saved)); } catch (e) {} }
  const saved = load();
  if (!saved.opts || typeof saved.opts !== "object") saved.opts = {};
  if (typeof saved.opts.little !== "boolean") saved.opts.little = false;
  if (!saved.streak || typeof saved.streak !== "object") saved.streak = { days: 0, last: "" };

  /* normalise puzzle word lists: lowercase, unique, valid (uses only
     puzzle letters, contains centre, right length). This makes the data
     forgiving of typos in the lists above — a bad word is dropped
     rather than showing up as a word nobody can ever find. */
  function cleanList(p, list, minLen, maxLen) {
    const set = new Set(p.letters);
    const centre = p.letters[0];
    const ok = [];
    const seen = new Set();
    (list || []).forEach((w) => {
      w = String(w).toLowerCase();
      if (w.length < minLen || w.length > maxLen) return;
      if (w.indexOf(centre) === -1) return;
      if (![...w].every((c) => set.has(c))) return;
      if (seen.has(w)) return;
      seen.add(w);
      ok.push(w);
    });
    ok.sort();
    return ok;
  }
  PUZZLES.forEach((p) => {
    p.valid = cleanList(p, p.words, MIN_LEN, 24);
    p.little = cleanList(p, p.little, LITTLE_LEN, LITTLE_LEN);
    p.pangrams = p.valid.filter(isPangram);
    if (!TIERS[p.tier]) p.tier = 2;
  });
  function isPangram(w) { return new Set(w).size === 7; }

  /* ---------- what counts right now (Little Bee mode adds 3-letter words) ---------- */
  function littleOn() { return !!saved.opts.little; }
  function activeWords(p) { return littleOn() ? p.valid.concat(p.little) : p.valid; }

  /* ---------- scoring & ranks ---------- */
  function wordScore(w) {
    if (w.length <= MIN_LEN) return 1;   // 3- and 4-letter words = 1 point
    let s = w.length;                    // 5 letters = 5 pts, etc.
    if (isPangram(w)) s += 7;            // pangram bonus
    return s;
  }
  function maxScore(p) { return activeWords(p).reduce((t, w) => t + wordScore(w), 0); }

  const RANKS = [
    [0, "Beginner 🐣"], [0.05, "Good Start 🌱"], [0.12, "Nice 🙂"],
    [0.25, "Buzzing 🐝"], [0.4, "Great 😄"], [0.55, "Amazing 🤩"],
    [0.75, "Genius 🧠"], [1, "Queen Bee 👑"],
  ];
  function rankIndexFor(p, score) {
    const m = maxScore(p) || 1;
    const frac = score / m;
    let idx = 0;
    RANKS.forEach(([t], i) => { if (frac >= t) idx = i; });
    return idx;
  }
  function rankFor(p, score) { return RANKS[rankIndexFor(p, score)][1]; }
  /* how many points until the next rank (null when at the top) */
  function nextRankFor(p, score) {
    const m = maxScore(p) || 1;
    for (const [t, l] of RANKS) {
      const need = Math.ceil(t * m);
      if (score < need) return { label: l, pts: need - score };
    }
    return null;
  }

  /* ---------- element refs ---------- */
  const $ = (id) => document.getElementById(id);
  const el = {
    puzzles: $("puzzles"), puzGrid: $("puz-grid"), play: $("play"),
    score: $("score"), wordcount: $("wordcount"), rank: $("rank"),
    feedback: $("feedback"), entry: $("entry"), hive: $("hive"),
    del: $("delete-btn"), shuffle: $("shuffle-btn"), enter: $("enter-btn"),
    quit: $("quit-btn"), foundList: $("found-list"), hintBtn: $("hint-btn"),
    deffy: $("deffy"), pangrams: $("pangrams"), ladder: $("ladder"),
    ladderFill: $("ladder-fill"), hiveName: $("hive-name"),
    chart: $("chart"), chartBody: $("chart-body"), foundCount: $("found-count"),
    littleToggle: $("little-toggle"), streak: $("streak"), totals: $("totals"),
  };

  let pi = 0;           // current puzzle index
  let typed = "";       // the word being built
  let outerOrder = [];  // shuffled positions of the 6 outer letters
  let hintWord = null;  // the word the hint button is currently nudging towards
  let hintLevel = 0;

  function progressFor(i) {
    const id = "p" + i;
    if (!saved[id] || typeof saved[id] !== "object") saved[id] = { found: [], score: 0 };
    if (!Array.isArray(saved[id].found)) saved[id].found = [];
    return saved[id];
  }
  /* the found words that count under the CURRENT mode */
  function foundActive(i) {
    const set = new Set(activeWords(PUZZLES[i]));
    return progressFor(i).found.filter((w) => set.has(w));
  }
  /* score is always re-worked out from the found list, so it can never
     drift out of step with it (and old saves just carry on working). */
  function scoreFor(i) {
    const s = foundActive(i).reduce((t, w) => t + wordScore(w), 0);
    progressFor(i).score = s;
    return s;
  }

  function shuffleArr(arr) {
    const a = arr.slice();
    for (let k = a.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [a[k], a[j]] = [a[j], a[k]];
    }
    return a;
  }

  function show(section) {
    el.puzzles.classList.toggle("hidden", section !== "puzzles");
    el.play.classList.toggle("hidden", section !== "play");
  }

  const reduceMotion = () =>
    !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  function sparkleBurst() {
    if (reduceMotion()) return;
    const emojis = ["✨", "🍯", "🌟", "🐝"];
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    for (let i = 0; i < 10; i++) {
      const s = document.createElement("div");
      s.className = "sparkle";
      s.textContent = emojis[i % emojis.length];
      s.style.left = (cx + (Math.random() - 0.5) * 240) + "px";
      s.style.top = (cy + (Math.random() - 0.5) * 120) + "px";
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 900);
    }
  }

  /* ---------- daily hive & streak ---------- */
  function today() {
    const d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  function dailyIndex() {
    // a stable little hash of today's date → the same hive all day
    let h = 0;
    const s = today();
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h % PUZZLES.length;
  }
  function yesterday() {
    const d = new Date(Date.now() - 86400000);
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  function touchStreak() {
    const st = saved.streak;
    const t = today();
    if (st.last === t) return;
    st.days = st.last === yesterday() ? (st.days || 0) + 1 : 1;
    st.last = t;
    save();
    renderStreak();
  }
  function renderStreak() {
    const st = saved.streak;
    const alive = st.last === today() || st.last === yesterday();
    const n = alive ? (st.days || 0) : 0;
    el.streak.textContent = n > 1 ? "🔥 " + n + "-day streak!" : (n === 1 ? "🔥 Day 1 — come back tomorrow!" : "");
  }

  /* ---------- puzzle picker ---------- */
  function renderPuzzles() {
    el.puzGrid.innerHTML = "";
    const daily = dailyIndex();
    // gentlest hives first so the little ones meet an easy one; the
    // hive of the day always jumps to the front.
    const order = PUZZLES.map((p, i) => i)
      .sort((a, b) => (a === daily ? -1 : b === daily ? 1 : PUZZLES[a].tier - PUZZLES[b].tier || a - b));

    let honey = 0, hives = 0;
    order.forEach((i) => {
      const p = PUZZLES[i];
      const total = activeWords(p).length;
      const got = foundActive(i).length;
      honey += scoreFor(i);
      const done = total > 0 && got >= total;
      if (done) hives++;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "puz-card" + (done ? " done" : "") + (i === daily ? " daily" : "");
      const tier = TIERS[p.tier];
      card.setAttribute("aria-label",
        p.name + ", " + tier.label + " hive, " + got + " of " + total + " words found" +
        (i === daily ? ", hive of the day" : ""));
      card.innerHTML =
        (i === daily ? '<span class="pz-daily">🌟 Today\'s hive</span>' : "") +
        '<span class="pz-emoji" aria-hidden="true">' + p.emoji + "</span>" +
        "<h3>" + p.name + "</h3>" +
        '<span class="pz-tier t' + p.tier + '">' + tier.emoji + " " + tier.label + "</span>" +
        '<span class="pz-progress">' + got + " / " + total +
        " words" + (done ? " ✓" : "") + "</span>" +
        '<span class="pz-bar"><i style="width:' + (total ? Math.round((got / total) * 100) : 0) + '%"></i></span>';
      card.addEventListener("click", () => startPuzzle(i));
      el.puzGrid.appendChild(card);
    });
    el.totals.textContent = "🍯 " + honey + " honey in total · " + hives + " / " + PUZZLES.length + " hives finished";
    el.littleToggle.setAttribute("aria-pressed", littleOn() ? "true" : "false");
    el.littleToggle.classList.toggle("on", littleOn());
    el.littleToggle.textContent = littleOn() ? "🐣 Little Bee mode: ON (3-letter words count)"
                                             : "🐣 Little Bee mode: off (tap for 3-letter words)";
    renderStreak();
  }

  /* ---------- play ---------- */
  function startPuzzle(i) {
    pi = i;
    typed = "";
    hintWord = null; hintLevel = 0;
    outerOrder = shuffleArr([1, 2, 3, 4, 5, 6]);
    el.hiveName.textContent = PUZZLES[i].emoji + " " + PUZZLES[i].name;
    renderHive();
    renderEntry();
    renderFound();
    updateHud();
    el.feedback.textContent = "";
    el.deffy.textContent = "";
    show("play");
    // play-test / debug hook: a word that has NOT been found yet
    const left = activeWords(PUZZLES[pi]).filter((w) => progressFor(pi).found.indexOf(w) === -1);
    el.play.dataset.sample = left[0] || activeWords(PUZZLES[pi])[0] || "";
  }

  function renderHive() {
    const p = PUZZLES[pi];
    el.hive.innerHTML = "";
    // centre
    el.hive.appendChild(makeCell(p.letters[0], true, "center"));
    // six outer in their shuffled spots
    outerOrder.forEach((letterIdx, pos) => {
      el.hive.appendChild(makeCell(p.letters[letterIdx], false, "p" + pos));
    });
  }
  function makeCell(letter, isCenter, posClass) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "cell " + posClass + (isCenter ? " center" : "");
    b.dataset.letter = letter;
    b.setAttribute("aria-label", "Letter " + letter.toUpperCase() + (isCenter ? " (golden centre letter — every word needs it)" : ""));
    b.innerHTML = '<span class="hex">' + letter + "</span>";
    b.addEventListener("click", () => addLetter(letter));
    return b;
  }
  /* make the matching hex flash when a letter is typed on a keyboard,
     so kids connect the key they pressed with the cell on screen */
  function pulseCell(letter) {
    const c = el.hive.querySelector('.cell[data-letter="' + letter + '"]');
    if (!c || reduceMotion()) return;
    c.classList.remove("tapped");
    void c.offsetWidth;
    c.classList.add("tapped");
    setTimeout(() => c.classList.remove("tapped"), 200);
  }

  function renderEntry() {
    const p = PUZZLES[pi];
    if (!typed) {
      el.entry.innerHTML = '<span class="ghosttext">type or tap letters…</span>';
      return;
    }
    el.entry.innerHTML = [...typed].map((c) =>
      c === p.letters[0] ? '<span class="center">' + c + "</span>" : c
    ).join("");
  }

  function updateHud() {
    const p = PUZZLES[pi];
    const score = scoreFor(pi);
    const got = foundActive(pi);
    el.score.textContent = score;
    el.wordcount.textContent = got.length + " / " + activeWords(p).length;
    const pangramsGot = got.filter(isPangram).length;
    el.pangrams.textContent = pangramsGot + " / " + p.pangrams.length;
    const next = nextRankFor(p, score);
    el.rank.textContent = rankFor(p, score) +
      (next ? " · " + next.pts + " pts to " + next.label : " — you found it all!");
    renderLadder(p, score);
    renderChart();
  }

  /* a visible ladder of all eight ranks, so the goal is never a mystery */
  function renderLadder(p, score) {
    const idx = rankIndexFor(p, score);
    const m = maxScore(p) || 1;
    el.ladderFill.style.width = Math.min(100, Math.round((score / m) * 100)) + "%";
    if (el.ladder.childElementCount !== RANKS.length) {
      el.ladder.innerHTML = "";
      RANKS.forEach(([, label]) => {
        const d = document.createElement("span");
        d.className = "rung";
        d.title = label;
        el.ladder.appendChild(d);
      });
    }
    [...el.ladder.children].forEach((d, i) => d.classList.toggle("lit", i <= idx));
    el.ladder.setAttribute("aria-label", "Rank " + (idx + 1) + " of " + RANKS.length + ": " + RANKS[idx][1]);
  }

  /* ---------- the word chart: how many words are still out there ----------
     A little grid of "how many are left" by length and by first letter.
     It teaches kids to hunt patterns instead of guessing at random. */
  function renderChart() {
    const p = PUZZLES[pi];
    const foundSet = new Set(progressFor(pi).found);
    const left = activeWords(p).filter((w) => !foundSet.has(w));
    if (!left.length) {
      el.chartBody.innerHTML = '<p class="chart-none">Nothing left — you found every word! 🏆</p>';
      return;
    }
    const byLen = {}, byLetter = {};
    left.forEach((w) => {
      byLen[w.length] = (byLen[w.length] || 0) + 1;
      byLetter[w[0]] = (byLetter[w[0]] || 0) + 1;
    });
    const lens = Object.keys(byLen).map(Number).sort((a, b) => a - b);
    const letters = Object.keys(byLetter).sort();
    el.chartBody.innerHTML =
      '<p class="chart-row"><b>By length:</b> ' +
      lens.map((n) => '<span class="chart-chip">' + n + " letters × " + byLen[n] + "</span>").join("") +
      "</p>" +
      '<p class="chart-row"><b>Starting with:</b> ' +
      letters.map((c) => '<span class="chart-chip">' + c.toUpperCase() + " × " + byLetter[c] + "</span>").join("") +
      "</p>" +
      '<p class="chart-row"><b>Pangrams left:</b> <span class="chart-chip">' +
      left.filter(isPangram).length + "</span></p>";
  }

  function renderFound() {
    const prog = progressFor(pi);
    const active = new Set(activeWords(PUZZLES[pi]));
    el.foundList.innerHTML = "";
    el.foundCount.textContent = prog.found.length ? "(" + prog.found.length + ")" : "";
    if (!prog.found.length) {
      el.foundList.innerHTML = '<span class="found-empty">No words yet — tap the golden letter to start! 🍯</span>';
      return;
    }
    // newest first; chips with a meaning are tappable
    prog.found.slice().reverse().forEach((w) => {
      const def = defFor(w);
      const chip = document.createElement(def ? "button" : "span");
      if (def) chip.type = "button";
      chip.className = "found-chip" +
        (isPangram(w) ? " pangram" : "") +
        (def ? " has-def" : "") +
        (active.has(w) ? "" : " dormant");
      chip.textContent = w;
      if (!active.has(w)) chip.title = "3-letter word — turn on Little Bee mode for this to count";
      if (def) {
        chip.setAttribute("aria-label", w + " — tap to hear what it means");
        chip.addEventListener("click", () => {
          el.deffy.textContent = "📖 " + w.toUpperCase() + " — " + def;
        });
      }
      el.foundList.appendChild(chip);
    });
  }

  function addLetter(c) {
    if (typed.length >= 19) return;
    typed += c;
    renderEntry();
  }
  function deleteLetter() { typed = typed.slice(0, -1); renderEntry(); }
  function clearEntry() { typed = ""; renderEntry(); }

  function flash(msg, color) {
    el.feedback.style.color = color;
    el.feedback.textContent = msg;
  }
  function shakeEntry() {
    el.entry.classList.remove("shake");
    void el.entry.offsetWidth;
    el.entry.classList.add("shake");
    if (window.SFX) SFX.nope();
  }

  function submit() {
    const p = PUZZLES[pi];
    const w = typed.toLowerCase();
    const prog = progressFor(pi);
    const active = activeWords(p);
    if (w.length === 0) return;
    if (w.length < LITTLE_LEN) { flash("Too short — 4 letters or more! ✋", "var(--pink)"); shakeEntry(); return; }
    if (w.length === LITTLE_LEN && !littleOn()) {
      flash("3 letters! Turn on 🐣 Little Bee mode to use those.", "var(--pink)"); shakeEntry(); return;
    }
    if (w.length < MIN_LEN && !littleOn()) { flash("Too short — 4 letters or more! ✋", "var(--pink)"); shakeEntry(); return; }
    if (w.indexOf(p.letters[0]) === -1) { flash("Must use the golden letter 🟡", "var(--pink)"); shakeEntry(); return; }
    if (![...w].every((ch) => p.letters.indexOf(ch) !== -1)) { flash("Only use the hive letters!", "var(--pink)"); shakeEntry(); clearEntry(); return; }
    if (prog.found.indexOf(w) !== -1) { flash("Already found that one! 🙂", "#8a6d00"); clearEntry(); return; }
    if (active.indexOf(w) === -1) { flash("Hmm, not in this hive — keep trying! 🐝", "var(--pink)"); shakeEntry(); return; }

    // a good word!
    const pts = wordScore(w);
    const pangram = isPangram(w);
    prog.found.push(w);
    touchStreak();
    save();
    if (hintWord === w) { hintWord = null; hintLevel = 0; }
    clearEntry();
    renderFound();
    updateHud();
    // teach the word if we know what it means
    const def = defFor(w);
    el.deffy.textContent = def ? "📖 " + w.toUpperCase() + " — " + def : "";
    const complete = foundActive(pi).length >= active.length;
    if (complete) {
      flash("🏆 HIVE COMPLETE! You found every single word! 🏆", "var(--green)");
      sparkleBurst();
      if (window.SFX) SFX.win();
      window.Confetti && Confetti.burst({ count: 150 });
    } else if (pangram) {
      flash("🌟 PANGRAM! All 7 letters! +" + pts + " 🌟", "var(--green)");
      sparkleBurst();
      if (window.Voice) Voice.play("audio/pangram.mp3");
      if (window.SFX) SFX.win();
      window.Confetti && Confetti.burst({ count: 110 });
    } else {
      flash("Nice! +" + pts + " 🍯" + (w.length >= 6 ? " — a long one!" : ""), "var(--green)");
      if (window.SFX) SFX.good();
    }
  }

  /* ---------- hint: nudge towards ONE word, a bit more each tap ----------
     Tap 1 tells you the shape, tap 2 tells you what it means, tap 3
     gives you the opening letters. It teaches rather than just tells. */
  function giveHint() {
    const p = PUZZLES[pi];
    const prog = progressFor(pi);
    const foundSet = new Set(prog.found);
    const missing = activeWords(p).filter((w) => !foundSet.has(w));
    if (!missing.length) { flash("You've found them all! 🏆", "var(--green)"); return; }
    if (!hintWord || foundSet.has(hintWord) || missing.indexOf(hintWord) === -1) {
      // start with the shortest missing words — the friendliest ones
      const shortest = missing.slice().sort((a, b) => a.length - b.length);
      const pool = shortest.slice(0, Math.max(3, Math.ceil(shortest.length / 3)));
      hintWord = pool[Math.floor(Math.random() * pool.length)];
      hintLevel = 0;
    }
    hintLevel++;
    const w = hintWord;
    const def = defFor(w);
    if (hintLevel === 1) {
      flash("💡 There's a " + w.length + "-letter word starting with “" + w[0].toUpperCase() + "”", "var(--purple)");
      el.deffy.textContent = "Tap 💡 again for another clue about this word.";
    } else if (hintLevel === 2 && def) {
      flash("💡 " + w.length + " letters, starts with “" + w[0].toUpperCase() + "”", "var(--purple)");
      el.deffy.textContent = "📖 It means: " + def;
    } else if (hintLevel === 2) {
      flash("💡 " + w.length + " letters: “" + w[0].toUpperCase() + "” … ends with “" + w.slice(-1).toUpperCase() + "”", "var(--purple)");
      el.deffy.textContent = "Tap 💡 again for the opening letters.";
    } else {
      const peek = w.slice(0, Math.max(2, w.length - 2)).toUpperCase();
      flash("💡 It starts “" + peek + "” … (" + w.length + " letters)", "var(--purple)");
      el.deffy.textContent = def ? "📖 It means: " + def : "";
    }
  }

  /* ---------- keyboard ---------- */
  document.addEventListener("keydown", (e) => {
    if (el.play.classList.contains("hidden")) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;   // don't eat Cmd-R etc.
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (e.key === "Enter") {
      // let the keyboard-focused buttons do their own thing
      if (e.target && e.target.classList && e.target.classList.contains("cell")) return;
      if (tag === "BUTTON") return;
      e.preventDefault(); submit(); return;
    }
    if (e.key === "Backspace") { e.preventDefault(); deleteLetter(); return; }
    if (e.key === "Escape") { e.preventDefault(); clearEntry(); flash("", "var(--green)"); return; }
    const k = e.key.toLowerCase();
    if (k.length !== 1 || k < "a" || k > "z") return;
    e.preventDefault();
    if (PUZZLES[pi].letters.indexOf(k) !== -1) {
      addLetter(k);
      pulseCell(k);
    } else {
      flash("“" + k.toUpperCase() + "” isn't in this hive — try another letter!", "var(--pink)");
      shakeEntry();
    }
  });

  /* ---------- buttons ---------- */
  el.del.addEventListener("click", deleteLetter);
  el.enter.addEventListener("click", submit);
  el.shuffle.addEventListener("click", () => { outerOrder = shuffleArr(outerOrder); renderHive(); });
  el.hintBtn.addEventListener("click", giveHint);
  el.quit.addEventListener("click", () => { renderPuzzles(); show("puzzles"); });
  el.littleToggle.addEventListener("click", () => {
    saved.opts.little = !saved.opts.little;
    save();
    renderPuzzles();
  });

  /* ---------- go ---------- */
  renderPuzzles();
  show("puzzles");
})();
