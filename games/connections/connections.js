/* ===========================================================
   Connections — a kid-friendly version of the NYT grouping game.
   -----------------------------------------------------------
   Sixteen cards hide FOUR secret groups of four. Tap four cards
   you think belong together, then press Check. Find all four
   groups before you run out of guesses!

   Teaches: sorting, categories, vocabulary, science, geography
   and maths — every solved group explains WHY those four belong
   together, which is the real teaching moment.

   Five difficulty tiers so everybody gets a fair puzzle:
     🧸 Tiny (3+, pictures on the cards)  → Ellie
     🌱 Easy (5+)                          → Cory
     ⭐ Medium (6+)                        → Cory & Jeannie
     🔥 Tricky (7+)                        → Jeannie
     🎓 Grown-up                           → Mum

   To ADD A PUZZLE: copy a block in PUZZLES. Give it a NEW, never
   reused `id` (saves are keyed on it), a `tier`, and four groups.
   Each group needs a name, a colour, a one-line `why` (the bit
   that teaches) and exactly four items. Optional `icons` puts a
   picture on each card — do that for `tier: "tot"` so a
   pre-reader can play too.

   RULES for a sound puzzle (checked by tools/validate below):
     • exactly 4 groups × 4 items, all 16 words different
     • no word that could honestly belong to two of the groups
     • every group solvable by the kid the tier is aimed at
   =========================================================== */

(function () {
  "use strict";

  /* Colour-blind-safe palette (Okabe–Ito). Colour is NEVER the only
     signal: every group also carries a shape glyph and its name. */
  const COLORS = {
    yellow: { bg: "#e69f00", ink: "#2b2440", shape: "●", label: "orange circle" },
    green:  { bg: "#009e73", ink: "#ffffff", shape: "▲", label: "green triangle" },
    blue:   { bg: "#0072b2", ink: "#ffffff", shape: "■", label: "blue square" },
    purple: { bg: "#cc79a7", ink: "#2b2440", shape: "★", label: "pink star" },
  };

  const TIERS = {
    tot:    { label: "Tiny",     emoji: "🧸", who: "Ellie",           lives: 6, order: 0 },
    easy:   { label: "Easy",     emoji: "🌱", who: "Cory",            lives: 5, order: 1 },
    medium: { label: "Medium",   emoji: "⭐", who: "Cory & Jeannie",  lives: 4, order: 2 },
    tricky: { label: "Tricky",   emoji: "🔥", who: "Jeannie",         lives: 4, order: 3 },
    expert: { label: "Grown-up", emoji: "🎓", who: "Mum",             lives: 4, order: 4 },
  };
  const TIER_ORDER = ["tot", "easy", "medium", "tricky", "expert"];

  const PUZZLES = [
    /* ---------------- 🧸 TINY (3+) — pictures on every card ---------------- */
    {
      id: "1", name: "Everyday Groups", emoji: "🍎", tier: "tot",
      groups: [
        { name: "Colours", color: "yellow", why: "Colours are what we SEE — they are not things you can hold.",
          items: ["Red", "Blue", "Green", "Pink"], icons: ["🟥", "🟦", "🟩", "🌸"] },
        { name: "Fruit", color: "green", why: "Fruit grows on plants and has seeds inside.",
          items: ["Apple", "Banana", "Grape", "Cherry"], icons: ["🍎", "🍌", "🍇", "🍒"] },
        { name: "Counting numbers", color: "blue", why: "1, 2, 3, 4 — the numbers we count with.",
          items: ["One", "Two", "Three", "Four"], icons: ["1️⃣", "2️⃣", "3️⃣", "4️⃣"] },
        { name: "Farm animals", color: "purple", why: "Farm animals live with farmers and give us milk, wool and eggs.",
          items: ["Cow", "Pig", "Sheep", "Goat"], icons: ["🐄", "🐖", "🐑", "🐐"] },
      ],
    },
    {
      id: "n1", name: "Shapes & Colours", emoji: "🎨", tier: "tot",
      groups: [
        { name: "Shapes", color: "yellow", why: "A shape is the OUTLINE of a thing — round, pointy or straight.",
          items: ["Circle", "Square", "Star", "Heart"], icons: ["⭕", "🟪", "⭐", "💜"] },
        { name: "Colours", color: "green", why: "Colours are what we see. Everything has one!",
          items: ["Red", "Blue", "Yellow", "Purple"], icons: ["🟥", "🟦", "🟨", "🟪"] },
        { name: "Pets", color: "blue", why: "Pets are animals that live in our houses with us.",
          items: ["Dog", "Cat", "Bunny", "Fish"], icons: ["🐶", "🐱", "🐰", "🐠"] },
        { name: "Yummy food", color: "purple", why: "These are all things we EAT.",
          items: ["Cake", "Pizza", "Bread", "Egg"], icons: ["🍰", "🍕", "🍞", "🥚"] },
      ],
    },
    {
      id: "n2", name: "Farm & Zoo", emoji: "🐮", tier: "tot",
      groups: [
        { name: "Farm animals", color: "yellow", why: "Farm animals live on a farm and help us get food.",
          items: ["Cow", "Pig", "Sheep", "Hen"], icons: ["🐄", "🐖", "🐑", "🐔"] },
        { name: "Zoo animals", color: "green", why: "These wild animals come from faraway places, so we see them at the zoo.",
          items: ["Lion", "Zebra", "Giraffe", "Hippo"], icons: ["🦁", "🦓", "🦒", "🦛"] },
        { name: "Sea animals", color: "blue", why: "They all live in the salty sea.",
          items: ["Whale", "Crab", "Seal", "Shark"], icons: ["🐋", "🦀", "🦭", "🦈"] },
        { name: "Tiny crawlers", color: "purple", why: "Little creepy-crawlies. (Only the ant and the bee are really insects!)",
          items: ["Ant", "Bee", "Snail", "Worm"], icons: ["🐜", "🐝", "🐌", "🪱"] },
      ],
    },
    {
      id: "n3", name: "Count With Me", emoji: "🔢", tier: "tot",
      groups: [
        { name: "Numbers", color: "yellow", why: "One, two, three, four — count them on your fingers!",
          items: ["One", "Two", "Three", "Four"], icons: ["1️⃣", "2️⃣", "3️⃣", "4️⃣"] },
        { name: "Size words", color: "green", why: "Size words tell us how BIG or how little something is.",
          items: ["Big", "Small", "Tall", "Tiny"], icons: ["🐘", "🐜", "🦒", "🐁"] },
        { name: "Body parts", color: "blue", why: "Every one of these is a part of YOU.",
          items: ["Nose", "Eye", "Hand", "Foot"], icons: ["👃", "👁️", "✋", "🦶"] },
        { name: "Things you wear", color: "purple", why: "Clothes go ON your body to keep you warm and comfy.",
          items: ["Hat", "Shoes", "Socks", "Coat"], icons: ["🎩", "👟", "🧦", "🧥"] },
      ],
    },
    {
      id: "n4", name: "Princess Party", emoji: "👑", tier: "tot",
      groups: [
        { name: "Royal things", color: "yellow", why: "Kings and queens live in castles and wear crowns.",
          items: ["Crown", "Wand", "Castle", "Throne"], icons: ["👑", "🪄", "🏰", "🪑"] },
        { name: "Dresses can be…", color: "green", why: "These are describing words — they tell you what a dress is LIKE.",
          items: ["Pink", "Sparkly", "Twirly", "Frilly"], icons: ["🌸", "✨", "💃", "🎀"] },
        { name: "Party treats", color: "blue", why: "Sweet things we eat at a party.",
          items: ["Cake", "Juice", "Cookie", "Candy"], icons: ["🎂", "🧃", "🍪", "🍬"] },
        { name: "Fluffy babies", color: "purple", why: "Baby animals with soft, fluffy fur.",
          items: ["Puppy", "Kitten", "Bunny", "Pony"], icons: ["🐶", "🐱", "🐰", "🐴"] },
      ],
    },
    {
      id: "n5", name: "Bath & Bed", emoji: "🛁", tier: "tot",
      groups: [
        { name: "Bath time", color: "yellow", why: "Things that help you get squeaky clean.",
          items: ["Soap", "Bubbles", "Towel", "Sponge"], icons: ["🧼", "🫧", "🧻", "🧽"] },
        { name: "Bed time", color: "green", why: "Cosy things for going to sleep.",
          items: ["Pillow", "Blanket", "Teddy", "Story"], icons: ["🛏️", "🧣", "🧸", "📖"] },
        { name: "Get dressed", color: "blue", why: "Clothes you put on in the morning.",
          items: ["Shirt", "Pants", "Shoes", "Hat"], icons: ["👕", "👖", "👟", "🎩"] },
        { name: "Breakfast", color: "purple", why: "Breakfast is the FIRST meal of the day.",
          items: ["Toast", "Eggs", "Milk", "Cereal"], icons: ["🍞", "🥚", "🥛", "🥣"] },
      ],
    },

    /* ---------------- 🌱 EASY (5+) ---------------- */
    {
      id: "3", name: "Mix It Up", emoji: "🧩", tier: "easy",
      groups: [
        { name: "Minecraft blocks", color: "yellow", why: "The blocks you dig up and build with in Minecraft.",
          items: ["Dirt", "Stone", "Sand", "Wood"] },
        { name: "Up in the sky", color: "green", why: "Look UP and you might see all four of these.",
          items: ["Sun", "Moon", "Star", "Cloud"] },
        { name: "Shapes", color: "blue", why: "Shapes describe an outline — no colour, no size, just the form.",
          items: ["Circle", "Square", "Heart", "Oval"] },
        { name: "Ocean animals", color: "purple", why: "All four live in the salty ocean.",
          items: ["Shark", "Whale", "Crab", "Octopus"] },
      ],
    },
    {
      id: "4", name: "Princess Power", emoji: "👑", tier: "easy",
      groups: [
        { name: "Frozen characters", color: "yellow", why: "People from the film Frozen, set in Arendelle.",
          items: ["Elsa", "Anna", "Kristoff", "Hans"] },
        { name: "Gabby's Dollhouse", color: "green", why: "Gabby's cat friends from her dollhouse.",
          items: ["Gabby", "Pandy Paws", "MerCat", "DJ Catnip"] },
        { name: "Dresses can be…", color: "blue", why: "Adjectives — describing words that tell you what a dress is like.",
          items: ["Sparkly", "Twirly", "Frilly", "Silky"] },
        { name: "Royal things", color: "purple", why: "Objects and places that belong to kings and queens.",
          items: ["Crown", "Castle", "Throne", "Wand"] },
      ],
    },
    {
      id: "5", name: "Game On", emoji: "⚽", tier: "easy",
      groups: [
        { name: "Soccer words", color: "yellow", why: "Words you hear on a soccer pitch.",
          items: ["Goal", "Pass", "Net", "Corner"] },
        { name: "Swimming words", color: "green", why: "Words you hear at the swimming pool.",
          items: ["Stroke", "Lap", "Dive", "Goggles"] },
        { name: "Outer space", color: "blue", why: "Space words — everything out beyond the sky.",
          items: ["Planet", "Rocket", "Comet", "Orbit"] },
        { name: "Body parts", color: "purple", why: "Parts of your body that help you play.",
          items: ["Arm", "Leg", "Hand", "Foot"] },
      ],
    },
    {
      id: "6", name: "Snack Attack", emoji: "🍦", tier: "easy",
      groups: [
        { name: "Ice cream flavours", color: "yellow", why: "Scoop-shop flavours — the taste, not the food itself.",
          items: ["Vanilla", "Chocolate", "Strawberry", "Mint"] },
        { name: "Breakfast foods", color: "green", why: "Breakfast is the first meal of the day.",
          items: ["Pancake", "Waffle", "Cereal", "Toast"] },
        { name: "Pizza toppings", color: "blue", why: "Things you sprinkle on top of a pizza before it bakes.",
          items: ["Pepperoni", "Mushroom", "Olive", "Ham"] },
        { name: "Cold drinks", color: "purple", why: "Drinks are liquids — you pour them, you don't chew them.",
          items: ["Juice", "Milk", "Water", "Soda"] },
      ],
    },
    {
      id: "8", name: "Wild Things", emoji: "🦁", tier: "easy",
      groups: [
        { name: "Big cats", color: "yellow", why: "Wild cats — big, fast hunters with claws and whiskers.",
          items: ["Lion", "Tiger", "Leopard", "Cheetah"] },
        { name: "Pets", color: "green", why: "Small animals people keep at home.",
          items: ["Dog", "Hamster", "Goldfish", "Rabbit"] },
        { name: "Birds", color: "blue", why: "Birds have feathers, beaks and lay eggs.",
          items: ["Robin", "Eagle", "Owl", "Penguin"] },
        { name: "Insects", color: "purple", why: "Insects have SIX legs and three body parts. (Spiders have eight — not insects!)",
          items: ["Ant", "Bee", "Beetle", "Butterfly"] },
      ],
    },
    {
      id: "10", name: "Weather Wonders", emoji: "🌦️", tier: "easy",
      groups: [
        { name: "Seasons", color: "yellow", why: "The four seasons repeat every single year.",
          items: ["Spring", "Summer", "Fall", "Winter"] },
        { name: "Wild weather", color: "green", why: "Weather is what the sky is doing right now.",
          items: ["Rain", "Hail", "Fog", "Thunder"] },
        { name: "Winter fun", color: "blue", why: "Things you only do when it's freezing outside.",
          items: ["Sled", "Snowman", "Skating", "Mittens"] },
        { name: "Beach day", color: "purple", why: "Things you find at a hot, sunny beach.",
          items: ["Sunscreen", "Wave", "Shell", "Towel"] },
      ],
    },
    {
      id: "11", name: "Things That Go", emoji: "🚗", tier: "easy",
      groups: [
        { name: "On the road", color: "yellow", why: "They roll on rubber tyres along a road.",
          items: ["Car", "Truck", "Bus", "Van"] },
        { name: "In the air", color: "green", why: "They fly — no wheels needed once they're up.",
          items: ["Plane", "Jet", "Rocket", "Helicopter"] },
        { name: "On the water", color: "blue", why: "They float. Water holds them up!",
          items: ["Boat", "Ship", "Canoe", "Kayak"] },
        { name: "On rails", color: "purple", why: "They can only go where the metal rails take them.",
          items: ["Train", "Tram", "Subway", "Monorail"] },
      ],
    },
    {
      id: "13", name: "Rhyme Time", emoji: "🎵", tier: "easy",
      groups: [
        { name: "Rhymes with CAT", color: "yellow", why: "Words rhyme when they END with the same sound: -at.",
          items: ["Hat", "Bat", "Mat", "Rat"] },
        { name: "Rhymes with DOG", color: "green", why: "These all end in the -og sound.",
          items: ["Log", "Frog", "Hog", "Fog"] },
        { name: "Rhymes with BEE", color: "blue", why: "Same ending SOUND (-ee) even though the spellings differ!",
          items: ["Tree", "Key", "Sea", "Knee"] },
        { name: "Rhymes with CAKE", color: "purple", why: "The -ake sound at the end makes them rhyme.",
          items: ["Lake", "Snake", "Rake", "Bake"] },
      ],
    },
    {
      id: "14", name: "Body & Face", emoji: "🙂", tier: "easy",
      groups: [
        { name: "On your face", color: "yellow", why: "Look in a mirror — these are all on the front of your head.",
          items: ["Nose", "Eye", "Ear", "Chin"] },
        { name: "Parts of a hand", color: "green", why: "Everything here is part of your hand.",
          items: ["Thumb", "Palm", "Finger", "Nail"] },
        { name: "Bendy joints", color: "blue", why: "A joint is where two bones meet — that's why it bends!",
          items: ["Elbow", "Knee", "Wrist", "Ankle"] },
        { name: "Inside your body", color: "purple", why: "Organs and bones you can't see from outside.",
          items: ["Heart", "Brain", "Lungs", "Ribs"] },
      ],
    },
    {
      id: "15", name: "Around the House", emoji: "🏠", tier: "easy",
      groups: [
        { name: "In the kitchen", color: "yellow", why: "Things you eat with, kept in the kitchen.",
          items: ["Fork", "Spoon", "Plate", "Cup"] },
        { name: "In the bedroom", color: "green", why: "Cosy sleeping things.",
          items: ["Bed", "Pillow", "Lamp", "Blanket"] },
        { name: "In the bathroom", color: "blue", why: "Things for washing.",
          items: ["Soap", "Towel", "Toothbrush", "Sink"] },
        { name: "Rooms & spaces", color: "purple", why: "These aren't objects at all — they are PLACES in a house.",
          items: ["Garage", "Attic", "Hallway", "Basement"] },
      ],
    },
    {
      id: "16", name: "Sweet Treats", emoji: "🍭", tier: "easy",
      groups: [
        { name: "Candy", color: "yellow", why: "Sugary sweets — no oven needed.",
          items: ["Lollipop", "Gummy", "Toffee", "Taffy"] },
        { name: "Baked goodies", color: "green", why: "These are all baked in an oven.",
          items: ["Cookie", "Cupcake", "Brownie", "Muffin"] },
        { name: "Frozen desserts", color: "blue", why: "Kept in a freezer — they melt if you're slow!",
          items: ["Popsicle", "Sundae", "Sorbet", "Gelato"] },
        { name: "Tastes", color: "purple", why: "Your tongue can taste sweet, sour, salty and bitter.",
          items: ["Sweet", "Sour", "Salty", "Bitter"] },
      ],
    },
    {
      id: "n6", name: "School Stuff", emoji: "✏️", tier: "easy",
      groups: [
        { name: "In your pencil case", color: "yellow", why: "Small tools for writing and drawing.",
          items: ["Pencil", "Eraser", "Ruler", "Crayon"] },
        { name: "School subjects", color: "green", why: "The different things you LEARN about at school.",
          items: ["Maths", "Reading", "Science", "Art"] },
        { name: "Places at school", color: "blue", why: "Rooms and spaces you walk to during the day.",
          items: ["Library", "Playground", "Gym", "Cafeteria"] },
        { name: "Playtime games", color: "purple", why: "Games kids play in the schoolyard.",
          items: ["Tag", "Hopscotch", "Marbles", "Skipping"] },
      ],
    },
    {
      id: "n7", name: "Sports Day", emoji: "🏅", tier: "easy",
      groups: [
        { name: "Ball sports", color: "yellow", why: "Every one of these is played with a ball.",
          items: ["Soccer", "Tennis", "Cricket", "Netball"] },
        { name: "Water sports", color: "green", why: "You need water to play these.",
          items: ["Swimming", "Surfing", "Rowing", "Diving"] },
        { name: "Track events", color: "blue", why: "Running races measured on an athletics track.",
          items: ["Sprint", "Relay", "Hurdles", "Marathon"] },
        { name: "Prizes", color: "purple", why: "What you take home when you do well.",
          items: ["Medal", "Trophy", "Ribbon", "Certificate"] },
      ],
    },

    /* ---------------- ⭐ MEDIUM (6+) ---------------- */
    {
      id: "0", name: "Pop-Culture Pals", emoji: "🌟", tier: "medium",
      groups: [
        { name: "Bluey's family", color: "yellow", why: "The Heeler family — two blue heeler parents and two pups.",
          items: ["Bluey", "Bingo", "Bandit", "Chilli"] },
        { name: "Minecraft mobs", color: "green", why: "Hostile mobs that spawn in the dark and chase you.",
          items: ["Creeper", "Zombie", "Skeleton", "Enderman"] },
        { name: "Pokémon", color: "blue", why: "Pocket monsters you catch in a Poké Ball.",
          items: ["Pikachu", "Charizard", "Eevee", "Snorlax"] },
        { name: "Frozen friends", color: "purple", why: "Elsa's world: a queen, a princess, a snowman and a reindeer.",
          items: ["Elsa", "Anna", "Olaf", "Sven"] },
      ],
    },
    {
      id: "2", name: "Book Characters", emoji: "📖", tier: "medium",
      groups: [
        { name: "Diary of a Wimpy Kid", color: "yellow", why: "Greg Heffley's family and his best friend Rowley.",
          items: ["Greg", "Rodrick", "Manny", "Rowley"] },
        { name: "Calvin and Hobbes", color: "green", why: "A comic strip about a boy and his (maybe real) tiger.",
          items: ["Calvin", "Hobbes", "Susie", "Moe"] },
        { name: "Upside Down Magic", color: "blue", why: "Kids whose magic comes out wonky — so they train together.",
          items: ["Nory", "Elliott", "Andres", "Bax"] },
        { name: "Dog Man", color: "purple", why: "Dav Pilkey's comic about a police dog-headed hero.",
          items: ["Dog Man", "Petey", "Chief", "Flippy"] },
      ],
    },
    {
      id: "9", name: "Minecraft Master", emoji: "⛏️", tier: "medium",
      groups: [
        { name: "Tools", color: "yellow", why: "Craft them at a table to mine, chop and dig faster.",
          items: ["Pickaxe", "Axe", "Shovel", "Hoe"] },
        { name: "Ores", color: "green", why: "Ores are hidden in stone — you must mine them out.",
          items: ["Diamond", "Gold", "Iron", "Coal"] },
        { name: "Biomes", color: "blue", why: "A biome is a whole region with its own weather, plants and mobs.",
          items: ["Desert", "Jungle", "Taiga", "Swamp"] },
        { name: "Scary mobs", color: "purple", why: "Hostile mobs that attack from a distance.",
          items: ["Witch", "Ghast", "Blaze", "Phantom"] },
      ],
    },
    {
      id: "12", name: "Dino Days", emoji: "🦕", tier: "medium",
      groups: [
        { name: "Dinosaurs", color: "yellow", why: "Real dinosaur names — they lived over 65 million years ago.",
          items: ["T-Rex", "Stegosaurus", "Triceratops", "Raptor"] },
        { name: "Fossil hunting", color: "green", why: "How we KNOW about dinosaurs: we dig up what they left behind.",
          items: ["Fossil", "Amber", "Dig", "Museum"] },
        { name: "Dino body parts", color: "blue", why: "Parts of a dinosaur's body.",
          items: ["Horns", "Claws", "Teeth", "Tail"] },
        { name: "Plant-eaters ate…", color: "purple", why: "Herbivores ate only plants — no meat at all.",
          items: ["Leaves", "Ferns", "Bark", "Seeds"] },
      ],
    },
    {
      id: "17", name: "Super Heroes", emoji: "🦸", tier: "medium",
      groups: [
        { name: "Superpowers", color: "yellow", why: "Amazing abilities an ordinary person doesn't have.",
          items: ["Flying", "Strength", "Speed", "Invisibility"] },
        { name: "Hero gear", color: "green", why: "Things a hero WEARS or carries.",
          items: ["Cape", "Mask", "Shield", "Boots"] },
        { name: "Secret hideouts", color: "blue", why: "Places a hero hides their secret base.",
          items: ["Cave", "Lair", "Tower", "Bunker"] },
        { name: "Save the day", color: "purple", why: "Verbs — action words for what a hero DOES.",
          items: ["Rescue", "Protect", "Defend", "Save"] },
      ],
    },
    {
      id: "18", name: "Garden Grow", emoji: "🌻", tier: "medium",
      groups: [
        { name: "Flowers", color: "yellow", why: "Flowers make seeds so new plants can grow.",
          items: ["Rose", "Tulip", "Daisy", "Lily"] },
        { name: "Vegetables", color: "green", why: "Vegetables are the parts of plants we eat that aren't fruit.",
          items: ["Carrot", "Pea", "Corn", "Bean"] },
        { name: "Under the soil", color: "blue", why: "Hidden underground, doing the work you can't see.",
          items: ["Root", "Seed", "Worm", "Bulb"] },
        { name: "Garden tools", color: "purple", why: "Tools a gardener holds in their hands.",
          items: ["Rake", "Hose", "Trowel", "Gloves"] },
      ],
    },
    {
      id: "19", name: "Music Makers", emoji: "🎸", tier: "medium",
      groups: [
        { name: "String instruments", color: "yellow", why: "Their sound comes from vibrating STRINGS.",
          items: ["Guitar", "Violin", "Harp", "Cello"] },
        { name: "You blow them", color: "green", why: "Wind instruments — your breath makes the air inside wobble.",
          items: ["Flute", "Trumpet", "Tuba", "Whistle"] },
        { name: "You hit them", color: "blue", why: "Percussion — you strike them to make a sound.",
          items: ["Drum", "Cymbal", "Bell", "Xylophone"] },
        { name: "Music words", color: "purple", why: "Not instruments at all — these are words ABOUT music.",
          items: ["Note", "Beat", "Song", "Tune"] },
      ],
    },
    {
      id: "20", name: "Word Twins", emoji: "🪞", tier: "medium",
      groups: [
        { name: "Means BIG", color: "yellow", why: "Synonyms — different words with almost the same meaning.",
          items: ["Enormous", "Huge", "Giant", "Massive"] },
        { name: "Means SMALL", color: "green", why: "All four are synonyms for little.",
          items: ["Tiny", "Little", "Mini", "Petite"] },
        { name: "Means HAPPY", color: "blue", why: "Different flavours of the same feeling: happy.",
          items: ["Glad", "Joyful", "Cheerful", "Merry"] },
        { name: "Means SCARED", color: "purple", why: "Synonyms for frightened — some stronger than others.",
          items: ["Afraid", "Nervous", "Terrified", "Spooked"] },
      ],
    },
    {
      id: "21", name: "Job Squad", emoji: "👩‍🚒", tier: "medium",
      groups: [
        { name: "Health helpers", color: "yellow", why: "They look after bodies — yours or your pet's.",
          items: ["Doctor", "Nurse", "Dentist", "Vet"] },
        { name: "Keep us safe", color: "green", why: "Emergency workers who come when something goes wrong.",
          items: ["Police", "Firefighter", "Lifeguard", "Paramedic"] },
        { name: "At school", color: "blue", why: "Grown-ups who work in a school.",
          items: ["Teacher", "Principal", "Coach", "Librarian"] },
        { name: "They make things", color: "purple", why: "They MAKE something with their hands every day.",
          items: ["Baker", "Builder", "Painter", "Potter"] },
      ],
    },
    {
      id: "22", name: "Camping Trip", emoji: "🏕️", tier: "medium",
      groups: [
        { name: "Pack your bag", color: "yellow", why: "Gear you bring FROM home.",
          items: ["Tent", "Lantern", "Compass", "Backpack"] },
        { name: "Around the campfire", color: "green", why: "What you see and smell at the fire.",
          items: ["Marshmallow", "Logs", "Sparks", "Smoke"] },
        { name: "Night creatures", color: "blue", why: "Nocturnal animals — they sleep by day and hunt at night.",
          items: ["Owl", "Bat", "Moth", "Firefly"] },
        { name: "In the night sky", color: "purple", why: "Things far, far above you in space.",
          items: ["Stars", "Moon", "Planets", "Comet"] },
      ],
    },
    {
      id: "23", name: "Colour Class", emoji: "🎨", tier: "medium",
      groups: [
        { name: "Warm colours", color: "yellow", why: "Warm colours remind us of fire and sunshine.",
          items: ["Red", "Orange", "Yellow", "Pink"] },
        { name: "Cool colours", color: "green", why: "Cool colours remind us of water, ice and leaves.",
          items: ["Blue", "Green", "Purple", "Teal"] },
        { name: "No-colour colours", color: "blue", why: "Black, white and grey are 'neutrals' — they have no hue at all.",
          items: ["Black", "White", "Grey", "Silver"] },
        { name: "Always green things", color: "purple", why: "These are THINGS, not colour words — and they're all green.",
          items: ["Grass", "Frog", "Pickle", "Leaf"] },
      ],
    },
    {
      id: "24", name: "Pokémon Types", emoji: "⚡", tier: "medium",
      groups: [
        { name: "Fire types", color: "yellow", why: "Fire types are strong against Grass — and weak to Water.",
          items: ["Charmander", "Vulpix", "Ponyta", "Flareon"] },
        { name: "Water types", color: "green", why: "Water beats Fire but loses to Electric and Grass.",
          items: ["Squirtle", "Psyduck", "Lapras", "Magikarp"] },
        { name: "Electric types", color: "blue", why: "Electric shocks Water types — but can't hurt Ground types at all.",
          items: ["Pikachu", "Raichu", "Jolteon", "Zapdos"] },
        { name: "Grass types", color: "purple", why: "Grass soaks up Water attacks but burns against Fire.",
          items: ["Bulbasaur", "Oddish", "Leafeon", "Tangela"] },
      ],
    },
    {
      id: "25", name: "Bluey & Friends", emoji: "🐾", tier: "medium",
      groups: [
        { name: "Heeler family", color: "yellow", why: "Mum, Dad and the two pups who live in the Brisbane house.",
          items: ["Bluey", "Bingo", "Bandit", "Chilli"] },
        { name: "Cousins & uncles", color: "green", why: "Bandit's brother Stripe, his wife Trixie, and their girls.",
          items: ["Muffin", "Socks", "Stripe", "Trixie"] },
        { name: "Bluey's school friends", color: "blue", why: "The pups from Bluey's class.",
          items: ["Honey", "Mackenzie", "Rusty", "Indy"] },
        { name: "Games they play", color: "purple", why: "Made-up games from famous Bluey episodes.",
          items: ["Keepy Uppy", "Grannies", "Shadowlands", "Sleepytime"] },
      ],
    },

    /* ---------------- 🔥 TRICKY (7+) ---------------- */
    {
      id: "7", name: "Story Stars", emoji: "📚", tier: "tricky",
      groups: [
        { name: "Fairy tales", color: "yellow", why: "Very old stories passed down for hundreds of years.",
          items: ["Cinderella", "Rapunzel", "Goldilocks", "Pinocchio"] },
        { name: "Roald Dahl books", color: "green", why: "Books by Roald Dahl, famous for nasty grown-ups and brave children.",
          items: ["Matilda", "The BFG", "The Twits", "The Witches"] },
        { name: "Dr. Seuss characters", color: "blue", why: "Dr. Seuss invented rhyming nonsense words and wild creatures.",
          items: ["Lorax", "Grinch", "Horton", "Sneetch"] },
        { name: "Harry Potter", color: "purple", why: "Students and staff at Hogwarts School.",
          items: ["Harry", "Hermione", "Ron", "Hagrid"] },
      ],
    },
    {
      id: "n8", name: "Around the World", emoji: "🌍", tier: "tricky",
      groups: [
        { name: "Countries", color: "yellow", why: "A country is a land with its own government and flag.",
          items: ["France", "Japan", "Brazil", "Kenya"] },
        { name: "Capital cities", color: "green", why: "A capital is the ONE city where a country's leaders work.",
          items: ["Paris", "Tokyo", "Cairo", "Ottawa"] },
        { name: "Oceans", color: "blue", why: "Earth's five great oceans — this is four of them.",
          items: ["Pacific", "Atlantic", "Indian", "Arctic"] },
        { name: "Continents", color: "purple", why: "A continent is a huge landmass holding many countries.",
          items: ["Africa", "Europe", "Asia", "Australia"] },
      ],
    },
    {
      id: "n9", name: "Space Cadet", emoji: "🚀", tier: "tricky",
      groups: [
        { name: "Rocky planets", color: "yellow", why: "The four inner planets have solid ground you could stand on.",
          items: ["Mercury", "Venus", "Earth", "Mars"] },
        { name: "Gas giants", color: "green", why: "Huge outer planets made of gas — no surface to land on.",
          items: ["Jupiter", "Saturn", "Uranus", "Neptune"] },
        { name: "Space travel", color: "blue", why: "What it takes to actually GET to space.",
          items: ["Rocket", "Astronaut", "Spacesuit", "Launch"] },
        { name: "Star words", color: "purple", why: "Words about stars: they group into galaxies, are born in nebulas and die in supernovas.",
          items: ["Galaxy", "Nebula", "Constellation", "Supernova"] },
      ],
    },
    {
      id: "n10", name: "Animal Classes", emoji: "🐸", tier: "tricky",
      groups: [
        { name: "Mammals", color: "yellow", why: "Mammals feed their babies milk — even whales and bats!",
          items: ["Whale", "Bat", "Dolphin", "Kangaroo"] },
        { name: "Reptiles", color: "green", why: "Reptiles have dry scales and are cold-blooded.",
          items: ["Snake", "Turtle", "Crocodile", "Lizard"] },
        { name: "Amphibians", color: "blue", why: "Amphibians start life in water with gills, then grow lungs.",
          items: ["Frog", "Toad", "Newt", "Salamander"] },
        { name: "Flightless birds", color: "purple", why: "They have feathers and lay eggs — but their wings can't lift them.",
          items: ["Penguin", "Ostrich", "Emu", "Kiwi"] },
      ],
    },
    {
      id: "n11", name: "Maths Class", emoji: "➗", tier: "tricky",
      groups: [
        { name: "Straight-sided shapes", color: "yellow", why: "Polygons: 3, 4, 5 and 6 straight sides.",
          items: ["Triangle", "Square", "Pentagon", "Hexagon"] },
        { name: "Operations", color: "green", why: "The four things you DO to numbers.",
          items: ["Add", "Subtract", "Multiply", "Divide"] },
        { name: "Multiples of five", color: "blue", why: "Count by fives: 5, 10, 15, 20 — they all end in 5 or 0.",
          items: ["Five", "Ten", "Fifteen", "Twenty"] },
        { name: "Units of measure", color: "purple", why: "Units tell you HOW MUCH: length, liquid, mass and time.",
          items: ["Metre", "Litre", "Gram", "Second"] },
      ],
    },
    {
      id: "n12", name: "Word Wizard", emoji: "🪄", tier: "tricky",
      groups: [
        { name: "Nouns", color: "yellow", why: "A noun is a person, place or thing.",
          items: ["Castle", "River", "Teacher", "Sandwich"] },
        { name: "Verbs", color: "green", why: "A verb is an action — something you DO.",
          items: ["Sprint", "Whisper", "Juggle", "Bake"] },
        { name: "Adjectives", color: "blue", why: "An adjective describes a noun.",
          items: ["Fluffy", "Ancient", "Slippery", "Brave"] },
        { name: "Adverbs", color: "purple", why: "Adverbs tell you HOW — most of them end in -ly.",
          items: ["Quickly", "Softly", "Rarely", "Boldly"] },
      ],
    },
    {
      id: "n13", name: "Body Systems", emoji: "🫀", tier: "tricky",
      groups: [
        { name: "Skeleton", color: "yellow", why: "Bones! An adult has 206 of them.",
          items: ["Skull", "Ribs", "Spine", "Femur"] },
        { name: "Blood & heart", color: "green", why: "The circulatory system pumps blood everywhere in about a minute.",
          items: ["Heart", "Artery", "Vein", "Pulse"] },
        { name: "Breathing", color: "blue", why: "The respiratory system swaps oxygen in for carbon dioxide out.",
          items: ["Lungs", "Windpipe", "Diaphragm", "Oxygen"] },
        { name: "The five senses", color: "purple", why: "Your senses send messages to your brain.",
          items: ["Sight", "Hearing", "Smell", "Taste"] },
      ],
    },
    {
      id: "n14", name: "Weather Science", emoji: "⛈️", tier: "tricky",
      groups: [
        { name: "Cloud types", color: "yellow", why: "Scientists name clouds by shape and height: puffy, wispy, flat or rainy.",
          items: ["Cumulus", "Cirrus", "Stratus", "Nimbus"] },
        { name: "Storm words", color: "green", why: "What a big storm throws at you.",
          items: ["Lightning", "Thunder", "Hail", "Gale"] },
        { name: "The water cycle", color: "blue", why: "Water goes up, cools, falls and gathers — over and over, forever.",
          items: ["Evaporation", "Condensation", "Precipitation", "Collection"] },
        { name: "Weather instruments", color: "purple", why: "Tools that MEASURE weather: heat, air pressure, rain and wind.",
          items: ["Thermometer", "Barometer", "Rain gauge", "Anemometer"] },
      ],
    },
    {
      id: "n15", name: "States of Matter", emoji: "🧊", tier: "tricky",
      groups: [
        { name: "Solids", color: "yellow", why: "A solid keeps its own shape — its particles are locked together.",
          items: ["Ice", "Rock", "Wood", "Metal"] },
        { name: "Liquids", color: "green", why: "A liquid takes the shape of its container and can be poured.",
          items: ["Water", "Milk", "Oil", "Juice"] },
        { name: "Gases", color: "blue", why: "A gas spreads out to fill any space it's in. Steam is water as a gas!",
          items: ["Oxygen", "Steam", "Helium", "Smoke"] },
        { name: "Changes of state", color: "purple", why: "Heat or cool something and it switches state — no new stuff is made.",
          items: ["Melting", "Freezing", "Boiling", "Condensing"] },
      ],
    },
    {
      id: "n16", name: "Ancient Egypt", emoji: "🔺", tier: "tricky",
      groups: [
        { name: "Egyptian wonders", color: "yellow", why: "Things the Egyptians built or made, still standing 4,000 years on.",
          items: ["Pyramid", "Sphinx", "Mummy", "Obelisk"] },
        { name: "Egyptian gods", color: "green", why: "Egyptians worshipped many gods, often with animal heads.",
          items: ["Ra", "Anubis", "Osiris", "Isis"] },
        { name: "The River Nile", color: "blue", why: "The Nile's yearly flood made the desert soil rich enough to farm.",
          items: ["Delta", "Flood", "Reeds", "Crocodile"] },
        { name: "Egyptian writing", color: "purple", why: "Hieroglyphs are picture-writing, copied out by trained scribes.",
          items: ["Hieroglyphs", "Scribe", "Scroll", "Ink"] },
      ],
    },

    /* ---------------- 🎓 GROWN-UP (Mum) ---------------- */
    {
      id: "n17", name: "Compound Chaos", emoji: "🧩", tier: "expert",
      groups: [
        { name: "___ BOARD", color: "yellow", why: "Keyboard, skateboard, surfboard, chessboard.",
          items: ["Key", "Skate", "Surf", "Chess"] },
        { name: "___ BERRY", color: "green", why: "Strawberry, raspberry, cranberry, blueberry.",
          items: ["Straw", "Rasp", "Cran", "Blue"] },
        { name: "___ FLY", color: "blue", why: "Dragonfly, horsefly, housefly, mayfly — and not one of them is a true fly's cousin.",
          items: ["Dragon", "Horse", "House", "May"] },
        { name: "___ BALL", color: "purple", why: "Cannonball, meatball, eyeball, oddball.",
          items: ["Cannon", "Meat", "Eye", "Odd"] },
      ],
    },
    {
      id: "n18", name: "Grown-Up Trivia", emoji: "🎓", tier: "expert",
      groups: [
        { name: "Shakespeare plays", color: "yellow", why: "Four of Shakespeare's tragedies and romances.",
          items: ["Hamlet", "Macbeth", "Othello", "Tempest"] },
        { name: "Greek gods", color: "green", why: "Olympians — the GREEK names, not their Roman copies.",
          items: ["Zeus", "Hera", "Apollo", "Athena"] },
        { name: "Roman gods", color: "blue", why: "The Roman gods the planets were named after.",
          items: ["Mars", "Venus", "Mercury", "Neptune"] },
        { name: "Famous rivers", color: "purple", why: "Four of the world's best-known rivers.",
          items: ["Nile", "Amazon", "Danube", "Thames"] },
      ],
    },
    {
      id: "n19", name: "Nature's Fine Print", emoji: "🍃", tier: "expert",
      groups: [
        { name: "Collective nouns", color: "yellow", why: "A pride of lions, a murder of crows, a gaggle of geese, a pod of whales.",
          items: ["Pride", "Murder", "Gaggle", "Pod"] },
        { name: "Baby animals", color: "green", why: "A joey (kangaroo), cygnet (swan), kit (fox) and fawn (deer).",
          items: ["Joey", "Cygnet", "Kit", "Fawn"] },
        { name: "Animal homes", color: "blue", why: "A warren (rabbits), sett (badgers), lodge (beavers), hive (bees).",
          items: ["Warren", "Sett", "Lodge", "Hive"] },
        { name: "Male animals", color: "purple", why: "A buck (rabbit), drake (duck), ram (sheep), stag (deer).",
          items: ["Buck", "Drake", "Ram", "Stag"] },
      ],
    },
    {
      id: "n20", name: "Tricky Trivia", emoji: "🧠", tier: "expert",
      groups: [
        { name: "Chemical elements", color: "yellow", why: "All four are noble-ish elements on the periodic table.",
          items: ["Argon", "Cobalt", "Krypton", "Radon"] },
        { name: "Currencies", color: "green", why: "Money used in Japan, India, Mexico and Sweden.",
          items: ["Yen", "Rupee", "Peso", "Krona"] },
        { name: "Musical terms", color: "blue", why: "Italian words written on sheet music to tell you how to play.",
          items: ["Allegro", "Forte", "Tempo", "Staccato"] },
        { name: "Fabrics", color: "purple", why: "Cloths woven from cotton, silk, flax and more.",
          items: ["Denim", "Velvet", "Linen", "Satin"] },
      ],
    },
    {
      id: "n21", name: "Two Meanings", emoji: "↔️", tier: "expert",
      groups: [
        { name: "Means TO LEAVE", color: "yellow", why: "Synonyms for departing.",
          items: ["Depart", "Exit", "Vacate", "Withdraw"] },
        { name: "Means TO HURRY", color: "green", why: "Synonyms for moving fast.",
          items: ["Dash", "Bolt", "Sprint", "Scurry"] },
        { name: "Fasteners", color: "blue", why: "Little bits of metal that hold things together.",
          items: ["Clip", "Screw", "Rivet", "Staple"] },
        { name: "Card games", color: "purple", why: "Four games played with a deck of cards.",
          items: ["Bridge", "Rummy", "Whist", "Canasta"] },
      ],
    },
  ];

  /* Expose for the validator / play-tests. */
  window.CONNECTIONS_PUZZLES = PUZZLES;

  /* ---------- saved progress ----------
     saved["p"+id] : "won" | "lost"    (v1 saves used the numeric index,
     saved["m"+id] : fewest mistakes    which is why the first 26 puzzles
                     on a win (0 = ⭐)  keep their ORIGINAL index as `id`)
     saved.streak / saved.best / saved.lastDay / saved.total : day streak
     saved.tier    : last tier filter chosen
     saved.cur     : the half-finished puzzle, so a reload doesn't lose it */
  const SAVE_KEY = "connections.v1";
  function load() {
    try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && typeof s === "object") return s; }
    catch (e) {}
    return {};
  }
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(saved)); } catch (e) {} }
  const saved = load();

  /* ---------- refs ---------- */
  const $ = (id) => document.getElementById(id);
  const el = {
    puzzles: $("puzzles"), puzGrid: $("puz-grid"), play: $("play"),
    solved: $("solved"), board: $("board"), lives: $("lives"), feedback: $("feedback"),
    shuffle: $("shuffle-btn"), deselect: $("deselect-btn"), submit: $("submit-btn"), quit: $("quit-btn"),
    hint: $("hint-btn"), progress: $("puz-progress"), stats: $("stats-line"),
    tierChips: $("tier-chips"), daily: $("daily-btn"), dailyBar: $("daily-bar"),
    resumeBar: $("resume-bar"), resume: $("resume-btn"), resumeDrop: $("resume-drop"),
    puzTitle: $("puz-title"),
    playControls: $("play-controls"), nextControls: $("next-controls"),
    next: $("next-btn"), retry: $("retry-btn"),
  };

  /* ---------- live state ---------- */
  let pi = 0;            // index into PUZZLES
  let tiles = [];        // items still on the board, in display order
  let selected = [];     // items currently selected
  let solvedIdx = [];    // indexes (into puzzle.groups) already found
  let mistakes = 0;
  let over = false;
  let tried = [];        // wrong combos already guessed (repeats are free)
  let hinted = [];       // group indexes whose NAME has been revealed
  let revealed = null;   // one card given away as a last-resort hint
  let filter = TIER_ORDER.indexOf(saved.tier) !== -1 ? saved.tier : "all";

  const puz = () => PUZZLES[pi];
  const livesFor = (p) => (TIERS[p.tier] || TIERS.medium).lives;

  function shuffle(arr) {
    const a = arr.slice();
    for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; }
    return a;
  }
  function show(section) {
    el.puzzles.classList.toggle("hidden", section !== "puzzles");
    el.play.classList.toggle("hidden", section !== "play");
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }
  function iconFor(item) {
    const p = puz();
    for (const g of p.groups) {
      const k = g.items.indexOf(item);
      if (k !== -1) return (g.icons && g.icons[k]) || "";
    }
    return "";
  }
  function groupIndexOf(item) {
    return puz().groups.findIndex((g) => g.items.indexOf(item) !== -1);
  }

  /* ---------- day streak ---------- */
  function dayKey(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function bumpStreak() {
    const today = dayKey(new Date());
    if (saved.lastDay === today) return;
    const y = new Date(); y.setDate(y.getDate() - 1);
    saved.streak = saved.lastDay === dayKey(y) ? (saved.streak || 0) + 1 : 1;
    saved.lastDay = today;
    if (!saved.best || saved.streak > saved.best) saved.best = saved.streak;
  }
  /* A different puzzle every day, the same one for everyone in the house. */
  function dailyIndex() {
    const s = dayKey(new Date());
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h % PUZZLES.length;
  }

  /* ---------- picker ---------- */
  function renderTierChips() {
    if (!el.tierChips) return;
    el.tierChips.innerHTML = "";
    const opts = [{ id: "all", label: "Everything", emoji: "🔗", who: "" }].concat(
      TIER_ORDER.map((t) => ({ id: t, label: TIERS[t].label, emoji: TIERS[t].emoji, who: TIERS[t].who }))
    );
    opts.forEach((o) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tier-chip" + (filter === o.id ? " on" : "");
      b.dataset.tier = o.id;
      b.setAttribute("aria-pressed", filter === o.id ? "true" : "false");
      b.innerHTML = '<span aria-hidden="true">' + o.emoji + "</span> " + esc(o.label) +
        (o.who ? ' <small>' + esc(o.who) + "</small>" : "");
      b.addEventListener("click", () => {
        filter = o.id; saved.tier = o.id; save(); renderPuzzles();
      });
      el.tierChips.appendChild(b);
    });
  }

  function renderPuzzles() {
    renderTierChips();
    el.puzGrid.innerHTML = "";
    let wins = 0, stars = 0, shown = 0;
    const daily = dailyIndex();

    PUZZLES.forEach((p, i) => {
      const status = saved["p" + p.id];
      if (status === "won") wins++;
      const perfect = status === "won" && saved["m" + p.id] === 0;
      if (perfect) stars++;
      if (filter !== "all" && p.tier !== filter) return;
      shown++;
      const t = TIERS[p.tier] || TIERS.medium;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "puz-card" + (status === "won" ? " solved" : "") + (perfect ? " perfect" : "") +
        (i === daily ? " today" : "");
      const state = perfect ? "⭐ Perfect!" : status === "won" ? "Solved ✓" : status === "lost" ? "Try again!" : "16 cards";
      card.setAttribute("aria-label",
        p.name + ", " + t.label + " level for " + t.who + ". " + state.replace(/[⭐✓]/g, "").trim());
      card.innerHTML =
        '<span class="pz-emoji" aria-hidden="true">' + p.emoji + "</span>" +
        "<h3>" + esc(p.name) + "</h3>" +
        '<span class="pz-tier tier-' + p.tier + '"><span aria-hidden="true">' + t.emoji + "</span> " + t.label + "</span>" +
        '<span class="pz-progress">' + state + "</span>" +
        (i === daily ? '<span class="pz-today">Today’s puzzle</span>' : "");
      card.addEventListener("click", () => startPuzzle(i));
      el.puzGrid.appendChild(card);
    });

    if (shown === 0) {
      const p = document.createElement("p");
      p.textContent = "No puzzles in that level yet.";
      el.puzGrid.appendChild(p);
    }

    if (el.progress) {
      el.progress.textContent = wins === 0
        ? "Pick a puzzle:"
        : wins === PUZZLES.length
          ? "🏆 All " + PUZZLES.length + " puzzles solved — wow!"
          : "Solved " + wins + " of " + PUZZLES.length + " — pick a puzzle:";
    }
    if (el.stats) {
      const bits = [];
      if (saved.streak) bits.push("🔥 " + saved.streak + "-day streak" + (saved.best > saved.streak ? " (best " + saved.best + ")" : ""));
      if (stars) bits.push("⭐ " + stars + " perfect");
      if (saved.total) bits.push("✅ " + saved.total + " puzzles finished");
      el.stats.textContent = bits.join("  ·  ");
    }
    if (el.daily) {
      const dp = PUZZLES[daily];
      const done = saved["p" + dp.id] === "won";
      el.daily.innerHTML = '<span aria-hidden="true">📅</span> Today’s puzzle: ' + esc(dp.name) +
        (done ? " ✓" : "");
      el.daily.onclick = () => startPuzzle(daily);
    }
    renderResumeBar();
  }

  function renderResumeBar() {
    if (!el.resumeBar) return;
    const c = saved.cur;
    const i = c ? PUZZLES.findIndex((p) => p.id === c.id) : -1;
    const usable = i !== -1 && Array.isArray(c.tiles) && c.tiles.length > 0 &&
      (c.solved || []).length < 4;
    el.resumeBar.classList.toggle("hidden", !usable);
    if (usable) {
      el.resume.innerHTML = '<span aria-hidden="true">↩️</span> Carry on with ' + esc(PUZZLES[i].name) +
        " (" + (c.solved || []).length + "/4 found)";
      el.resume.onclick = () => resumePuzzle(i);
    }
  }

  /* ---------- play ---------- */
  function startPuzzle(i, restore) {
    pi = i;
    selected = [];
    revealed = null;
    if (restore) {
      solvedIdx = restore.solved.slice();
      mistakes = restore.mistakes || 0;
      tried = (restore.tried || []).slice();
      hinted = (restore.hinted || []).slice();
      tiles = restore.tiles.slice();
    } else {
      solvedIdx = [];
      mistakes = 0;
      tried = [];
      hinted = [];
      const items = [];
      puz().groups.forEach((g) => g.items.forEach((it) => items.push(it)));
      tiles = shuffle(items);
    }
    over = false;
    el.feedback.textContent = "";
    el.playControls.classList.remove("hidden");
    el.nextControls.classList.add("hidden");
    updateHintBtn();
    renderTitle();
    renderSolved();
    renderBoard();
    renderLives();
    show("play");
    persist();
    if (!restore) window.scrollTo({ top: 0, behavior: "auto" });
  }

  function resumePuzzle(i) {
    const c = saved.cur;
    if (!c || PUZZLES[i].id !== c.id) { startPuzzle(i); return; }
    // guard against a corrupted save: every stored tile must be a real card
    const all = [];
    PUZZLES[i].groups.forEach((g) => g.items.forEach((it) => all.push(it)));
    const ok = c.tiles.every((t) => all.indexOf(t) !== -1) &&
      (c.solved || []).every((k) => k >= 0 && k < 4);
    if (!ok) { startPuzzle(i); return; }
    startPuzzle(i, { solved: c.solved || [], mistakes: c.mistakes || 0, tried: c.tried || [], hinted: c.hinted || [], tiles: c.tiles });
    flash("Welcome back — carry on! 👋", "var(--purple)");
  }

  function persist() {
    if (over || solvedIdx.length === 4) { delete saved.cur; }
    else saved.cur = { id: puz().id, tiles: tiles, solved: solvedIdx, mistakes: mistakes, tried: tried, hinted: hinted };
    save();
  }

  function renderTitle() {
    if (!el.puzTitle) return;
    const t = TIERS[puz().tier] || TIERS.medium;
    el.puzTitle.innerHTML = '<span aria-hidden="true">' + puz().emoji + "</span> " + esc(puz().name) +
      ' <span class="pz-tier tier-' + puz().tier + '"><span aria-hidden="true">' + t.emoji + "</span> " + t.label + "</span>";
  }

  function renderSolved() {
    el.solved.innerHTML = "";
    solvedIdx.forEach((k) => {
      const g = puz().groups[k];
      const c = COLORS[g.color] || COLORS.purple;
      const row = document.createElement("div");
      row.className = "solved-row";
      row.style.background = c.bg;
      row.style.color = c.ink;
      row.setAttribute("role", "group");
      row.setAttribute("aria-label", g.name + " — " + g.items.join(", ") + ". " + g.why);
      row.innerHTML =
        '<div class="grp-name"><span class="grp-shape" aria-hidden="true">' + c.shape + "</span>" + esc(g.name) + "</div>" +
        '<div class="grp-items">' + esc(g.items.join(" · ")) + "</div>" +
        '<div class="grp-why">' + esc(g.why) + "</div>";
      el.solved.appendChild(row);
    });
  }

  function renderBoard() {
    el.board.dataset.solution = JSON.stringify(puz().groups.map((g) => g.items)); // play-test hook
    el.board.innerHTML = "";
    tiles.forEach((item, n) => {
      const b = document.createElement("button");
      b.type = "button";
      const on = selected.indexOf(item) !== -1;
      const ic = iconFor(item);
      b.className = "tile" + (on ? " selected" : "") + (item.length > 9 ? " long" : "") +
        (ic ? " has-ic" : "") + (revealed === item ? " revealed" : "");
      b.innerHTML = (ic ? '<span class="ic" aria-hidden="true">' + ic + "</span>" : "") +
        '<span class="wd">' + esc(item) + "</span>";
      b.dataset.item = item;
      b.tabIndex = n === 0 ? 0 : -1;
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.setAttribute("aria-label", item + (revealed === item ? " (hint card)" : ""));
      b.addEventListener("click", () => toggle(item, b));
      el.board.appendChild(b);
    });
    el.submit.disabled = over || selected.length !== 4;
  }

  function renderLives() {
    if (over) return;
    const max = livesFor(puz());
    const left = Math.max(0, max - mistakes);
    el.lives.innerHTML = "Guesses left: " +
      '<span class="dot" aria-hidden="true">' + "💜".repeat(left) + "🖤".repeat(mistakes) + "</span>" +
      '<span class="sr-only">' + left + " of " + max + "</span>";
  }

  function toggle(item, btn) {
    if (over) return;
    const idx = selected.indexOf(item);
    if (idx !== -1) { selected.splice(idx, 1); btn.classList.remove("selected"); btn.setAttribute("aria-pressed", "false"); }
    else {
      if (selected.length >= 4) { flash("Four is the most you can pick — tap one to swap it out.", "var(--purple)"); return; }
      selected.push(item); btn.classList.add("selected"); btn.setAttribute("aria-pressed", "true");
      if (window.SFX) SFX.pop();
    }
    el.submit.disabled = selected.length !== 4;
  }

  function flash(msg, color) { el.feedback.style.color = color; el.feedback.textContent = msg; }

  /* ---------- hints ----------
     Step 1..n: reveal the NAME of a still-hidden group (the kid still
     does the sorting). Last resort: light up ONE card from a hidden
     group so nobody can get properly stuck. Hints never cost a guess. */
  function hiddenGroups() {
    return puz().groups.map((g, k) => k).filter((k) => solvedIdx.indexOf(k) === -1);
  }
  function updateHintBtn() {
    if (!el.hint) return;
    const hidden = hiddenGroups();
    const namesLeft = hidden.some((k) => hinted.indexOf(k) === -1);
    const canReveal = !revealed && hidden.length > 0;
    el.hint.disabled = over || (!namesLeft && !canReveal);
    el.hint.textContent = el.hint.disabled ? "💡 No more hints" : namesLeft ? "💡 Hint" : "💡 Show me a card";
  }
  function giveHint() {
    if (over) return;
    const hidden = hiddenGroups();
    const next = hidden.find((k) => hinted.indexOf(k) === -1);
    if (next !== undefined) {
      hinted.push(next);
      const names = hidden.filter((k) => hinted.indexOf(k) !== -1)
        .map((k) => "“" + puz().groups[k].name + "”");
      flash("🕵️ Look for: " + names.join(" and ") + " — which four cards fit?", "var(--blue)");
    } else if (!revealed && hidden.length) {
      const g = puz().groups[hidden[0]];
      revealed = g.items.find((it) => tiles.indexOf(it) !== -1) || null;
      renderBoard();
      flash("🔦 This glowing card belongs to “" + g.name + "” — find its three friends!", "var(--blue)");
    }
    updateHintBtn();
    persist();
  }

  function submit() {
    if (over || selected.length !== 4) return;
    const k = puz().groups.findIndex((grp) => selected.every((it) => grp.items.indexOf(it) !== -1));
    if (k !== -1) { solveGroup(k); return; }

    // already-guessed combos are free — no guess lost, just a reminder
    const combo = selected.slice().sort().join("|");
    if (tried.indexOf(combo) !== -1) {
      flash("You already tried those four — no guess used! 🔁", "var(--purple)");
      return;
    }
    tried.push(combo);

    // how close were they? (3 of 4 from one group = "one away")
    let best = 0;
    puz().groups.forEach((grp) => {
      const n = selected.filter((it) => grp.items.indexOf(it) !== -1).length;
      if (n > best) best = n;
    });
    mistakes += 1;
    if (window.SFX) SFX.nope();
    [...el.board.children].forEach((b) => {
      if (selected.indexOf(b.dataset.item) !== -1) {
        b.classList.remove("wrong"); void b.offsetWidth; b.classList.add("wrong");
      }
    });

    if (mistakes >= livesFor(puz())) {
      flash("Out of guesses — here are the answers 💛", "var(--pink)");
      endGame(false);
      return;
    }
    if (best === 3) flash("So close — just one card off! 🤏", "var(--pink)");
    else if (best === 2) flash("Two of those four go together — keep hunting! 💪", "var(--pink)");
    else flash("Not a group — try again! 💪", "var(--pink)");
    renderLives();

    // a kind nudge for the littlest players
    const tier = puz().tier;
    if ((tier === "tot" || tier === "easy") && mistakes === 2 && hinted.length === 0) {
      setTimeout(giveHint, 1200);
    }
    persist();
  }

  function solveGroup(k) {
    solvedIdx.push(k);
    const g = puz().groups[k];
    [...el.board.children].forEach((b) => {
      if (g.items.indexOf(b.dataset.item) !== -1) b.classList.add("pop");
    });
    tiles = tiles.filter((it) => g.items.indexOf(it) === -1);
    selected = [];
    if (revealed && g.items.indexOf(revealed) !== -1) revealed = null;
    flash("Yes! " + g.name + " — " + g.why, "var(--green)");
    if (window.SFX) SFX.good();
    updateHintBtn();
    persist();
    setTimeout(() => {
      renderSolved();
      renderBoard();
      updateHintBtn();
      if (solvedIdx.length === puz().groups.length) endGame(true);
      else if (tiles.length === 4) {
        // only one group left — hand it over rather than making them guess
        flash("Only one group left — you've got this! 🎯", "var(--green)");
      }
    }, 350);
  }

  function endGame(won) {
    over = true;
    el.submit.disabled = true;
    if (el.hint) el.hint.disabled = true;
    const id = puz().id;
    saved["p" + id] = won ? "won" : "lost";
    if (won && (typeof saved["m" + id] !== "number" || mistakes < saved["m" + id])) saved["m" + id] = mistakes;
    if (won) { saved.total = (saved.total || 0) + 1; bumpStreak(); }
    delete saved.cur;
    save();

    el.playControls.classList.add("hidden");
    el.nextControls.classList.remove("hidden");
    el.retry.classList.toggle("hidden", won);
    const more = nextUnsolved() !== -1;
    el.next.textContent = more ? "Next puzzle ▶" : "🔗 All puzzles";

    if (won) {
      if (window.SFX) SFX.win();
      const perfect = mistakes === 0;
      window.Confetti && Confetti.burst({ count: perfect ? 180 : 100 });
      flash(perfect ? "⭐ PERFECT — no wrong guesses at all! ⭐" : "🏆 You found all four groups! Amazing!", "var(--green)");
      const spare = livesFor(puz()) - mistakes;
      el.lives.textContent = perfect
        ? "A perfect star for this puzzle! ⭐" + (saved.streak > 1 ? "  🔥 " + saved.streak + "-day streak!" : "")
        : "Solved with " + spare + (spare === 1 ? " guess" : " guesses") + " to spare!" +
          (saved.streak > 1 ? "  🔥 " + saved.streak + "-day streak!" : "");
    } else {
      puz().groups.forEach((g, k) => { if (solvedIdx.indexOf(k) === -1) solvedIdx.push(k); });
      tiles = [];
      renderSolved();
      renderBoard();
      el.lives.textContent = "Read the groups above, then tap ↻ to try again — you'll get it! 💪";
    }
    renderPuzzles();
  }

  /* Next puzzle the kid hasn't beaten yet — same tier first, so a
     3-year-old never lands on the grown-up set. */
  function nextUnsolved() {
    const tier = puz().tier;
    for (let pass = 0; pass < 2; pass++) {
      for (let k = 1; k <= PUZZLES.length; k++) {
        const j = (pi + k) % PUZZLES.length;
        if (pass === 0 && PUZZLES[j].tier !== tier) continue;
        if (saved["p" + PUZZLES[j].id] !== "won") return j;
      }
    }
    return -1;
  }

  /* ---------- keyboard play ----------
     Arrow keys walk the 4×4 grid, Space/Enter picks a card,
     Enter checks when four are chosen. */
  el.board.addEventListener("keydown", (e) => {
    const btns = [...el.board.children];
    const i = btns.indexOf(document.activeElement);
    if (i === -1) return;
    const cols = 4;
    let j = -1;
    if (e.key === "ArrowRight") j = i + 1;
    else if (e.key === "ArrowLeft") j = i - 1;
    else if (e.key === "ArrowDown") j = i + cols;
    else if (e.key === "ArrowUp") j = i - cols;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = btns.length - 1;
    else return;
    e.preventDefault();
    if (j < 0 || j >= btns.length) return;
    btns.forEach((b) => (b.tabIndex = -1));
    btns[j].tabIndex = 0;
    btns[j].focus();
  });
  document.addEventListener("keydown", (e) => {
    if (el.play.classList.contains("hidden")) return;
    if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === "enter" && selected.length === 4 && !over) { e.preventDefault(); submit(); }
    else if (k === "s" && !over) { e.preventDefault(); doShuffle(); }
    else if (k === "c" && !over) { e.preventDefault(); clearPick(); }
    else if (k === "h" && !over) { e.preventDefault(); giveHint(); }
    else if (k === "escape") { e.preventDefault(); goPicker(); }
  });

  /* ---------- buttons ---------- */
  function doShuffle() {
    if (over) return;
    const focused = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.item : null;
    tiles = shuffle(tiles);
    renderBoard();
    persist();
    const again = focused && el.board.querySelector('[data-item="' + CSS.escape(focused) + '"]');
    if (again) { [...el.board.children].forEach((b) => (b.tabIndex = -1)); again.tabIndex = 0; again.focus(); }
    flash("Shuffled! Same cards, new places. 🔀", "var(--purple)");
  }
  function clearPick() { if (!over) { selected = []; renderBoard(); flash("", "var(--purple)"); } }
  function goPicker() { renderPuzzles(); show("puzzles"); window.scrollTo({ top: 0, behavior: "auto" }); }

  el.next.addEventListener("click", () => {
    const j = nextUnsolved();
    if (j === -1) goPicker();
    else startPuzzle(j);
  });
  el.retry.addEventListener("click", () => startPuzzle(pi));
  el.submit.addEventListener("click", submit);
  el.deselect.addEventListener("click", clearPick);
  el.shuffle.addEventListener("click", doShuffle);
  if (el.hint) el.hint.addEventListener("click", giveHint);
  el.quit.addEventListener("click", goPicker);
  if (el.resumeDrop) el.resumeDrop.addEventListener("click", () => { delete saved.cur; save(); renderPuzzles(); });

  /* ---------- go ---------- */
  renderPuzzles();
  show("puzzles");
})();
