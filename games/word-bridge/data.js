/* ===========================================================
   Word Bridge — the question bank
   -----------------------------------------------------------
   Every round asks a question like "Name an animal that lives
   in the ocean". You answer with a word, and EVERY LETTER of
   your answer becomes a plank of your bridge — so a long
   answer carries you further across the canyon.

   Each question has:
     q     the question
     e     a picture for it
     ok    the answers the game knows (add as many as you like —
           the more it knows, the fairer it feels)
     pics  OPTIONAL. Answers with an emoji, for the little kids
           who tap a picture instead of typing. A question needs
           at least 3 to show up in Tap mode.

   Answers are matched loosely: capital letters, spaces,
   hyphens and a trailing "s" don't matter, so "Ice Cream",
   "icecream" and "ice creams" all count.
   =========================================================== */

const WB_QUESTIONS = [
  {
    q: "Name an animal that lives in the ocean", e: "🌊",
    ok: ["whale", "shark", "dolphin", "octopus", "jellyfish", "squid", "crab", "lobster",
         "seahorse", "starfish", "sea turtle", "turtle", "eel", "stingray", "ray", "seal",
         "walrus", "narwhal", "clownfish", "swordfish", "tuna", "salmon", "shrimp",
         "sea urchin", "manatee", "orca", "killer whale", "pufferfish", "anglerfish",
         "sardine", "barnacle", "sea otter", "penguin", "dugong", "hammerhead", "blue whale",
         "humpback whale", "great white shark", "sea lion", "cuttlefish", "nautilus", "krill"],
    pics: [["Whale", "🐳"], ["Octopus", "🐙"], ["Crab", "🦀"], ["Shark", "🦈"], ["Dolphin", "🐬"], ["Turtle", "🐢"]]
  },
  {
    q: "Name a fruit", e: "🍎",
    ok: ["apple", "banana", "orange", "grape", "strawberry", "blueberry", "raspberry",
         "blackberry", "watermelon", "melon", "cantaloupe", "pineapple", "mango", "peach",
         "pear", "plum", "cherry", "kiwi", "lemon", "lime", "apricot", "coconut", "papaya",
         "pomegranate", "nectarine", "fig", "date", "grapefruit", "tangerine", "clementine",
         "cranberry", "dragon fruit", "passion fruit", "guava", "lychee", "persimmon", "olive"],
    pics: [["Banana", "🍌"], ["Strawberry", "🍓"], ["Pineapple", "🍍"], ["Grapes", "🍇"], ["Watermelon", "🍉"], ["Cherry", "🍒"]]
  },
  {
    q: "Name a vegetable", e: "🥕",
    ok: ["carrot", "potato", "broccoli", "cauliflower", "cabbage", "lettuce", "spinach",
         "tomato", "cucumber", "pepper", "onion", "garlic", "celery", "corn", "pea", "bean",
         "green bean", "pumpkin", "zucchini", "squash", "radish", "beet", "asparagus",
         "mushroom", "kale", "turnip", "parsnip", "eggplant", "artichoke", "leek",
         "sweet potato", "brussels sprout", "cabbage", "okra", "yam"],
    pics: [["Carrot", "🥕"], ["Broccoli", "🥦"], ["Corn", "🌽"], ["Potato", "🥔"], ["Cucumber", "🥒"], ["Pepper", "🫑"]]
  },
  {
    q: "Name something you find in a kitchen", e: "🍳",
    ok: ["fridge", "refrigerator", "oven", "stove", "microwave", "toaster", "blender",
         "kettle", "sink", "dishwasher", "spoon", "fork", "knife", "plate", "bowl", "cup",
         "mug", "pot", "pan", "spatula", "whisk", "cutting board", "freezer", "mixer",
         "apron", "napkin", "colander", "ladle", "timer", "counter", "cupboard", "cabinet",
         "teapot", "grater", "peeler", "rolling pin", "measuring cup", "chopsticks", "tongs",
         "table", "chair", "food", "milk", "bread", "salt", "pepper"],
    pics: [["Spoon", "🥄"], ["Fork", "🍴"], ["Kettle", "🫖"], ["Plate", "🍽️"], ["Fridge", "🧊"], ["Pan", "🍳"]]
  },
  {
    q: "Name a kind of bread", e: "🍞",
    ok: ["sourdough", "baguette", "brioche", "ciabatta", "focaccia", "cornbread",
         "flatbread", "pita", "naan", "rye", "wheat", "white bread", "banana bread", "bagel",
         "croissant", "tortilla", "pretzel", "biscuit", "muffin", "roll", "bun", "challah",
         "pumpernickel", "garlic bread", "toast", "brown bread", "soda bread", "milk bread"]
  },
  {
    q: "Name a 3D shape", e: "🧊",
    ok: ["cube", "sphere", "cylinder", "cone", "pyramid", "prism", "cuboid", "tetrahedron",
         "octahedron", "dodecahedron", "icosahedron", "torus", "hemisphere",
         "rectangular prism", "triangular prism", "square pyramid", "ball", "box"]
  },
  {
    q: "Name a country", e: "🌍",
    ok: ["canada", "mexico", "brazil", "france", "germany", "spain", "italy", "england",
         "ireland", "scotland", "wales", "japan", "china", "india", "egypt", "kenya",
         "nigeria", "australia", "argentina", "chile", "peru", "norway", "sweden", "finland",
         "denmark", "poland", "portugal", "greece", "turkey", "russia", "thailand", "vietnam",
         "korea", "iceland", "jamaica", "cuba", "morocco", "ethiopia", "switzerland",
         "netherlands", "belgium", "austria", "hungary", "ukraine", "israel", "jordan",
         "pakistan", "bangladesh", "indonesia", "philippines", "malaysia", "singapore",
         "new zealand", "united states", "america", "colombia", "venezuela", "ecuador",
         "bolivia", "uruguay", "paraguay", "panama", "guatemala", "honduras", "nicaragua",
         "costa rica", "madagascar", "tanzania", "uganda", "ghana", "senegal", "algeria",
         "tunisia", "libya", "sudan", "somalia", "zimbabwe", "zambia", "botswana", "namibia",
         "angola", "mozambique", "south africa", "nepal", "mongolia", "cambodia", "laos"]
  },
  {
    q: "Name a dinosaur", e: "🦖",
    ok: ["trex", "tyrannosaurus", "tyrannosaurus rex", "triceratops", "stegosaurus",
         "velociraptor", "brachiosaurus", "brontosaurus", "ankylosaurus", "spinosaurus",
         "pterodactyl", "diplodocus", "allosaurus", "raptor", "iguanodon", "apatosaurus",
         "parasaurolophus", "dilophosaurus", "archaeopteryx", "protoceratops", "gallimimus",
         "pachycephalosaurus", "carnotaurus", "compsognathus", "megalosaurus", "plesiosaur"]
  },
  {
    q: "Name something you find in space", e: "🚀",
    ok: ["star", "planet", "moon", "sun", "comet", "asteroid", "meteor", "galaxy", "rocket",
         "satellite", "astronaut", "black hole", "nebula", "spaceship", "mars", "jupiter",
         "saturn", "venus", "mercury", "neptune", "uranus", "pluto", "telescope",
         "space station", "alien", "constellation", "supernova", "crater", "milky way",
         "meteorite", "solar system", "space rock", "orbit", "rover", "space suit"],
    pics: [["Star", "⭐"], ["Rocket", "🚀"], ["Moon", "🌙"], ["Planet", "🪐"], ["Comet", "☄️"], ["Astronaut", "🧑‍🚀"]]
  },
  {
    q: "Name a musical instrument", e: "🎸",
    ok: ["piano", "guitar", "violin", "drum", "drums", "flute", "trumpet", "trombone",
         "clarinet", "saxophone", "cello", "harp", "banjo", "ukulele", "tuba", "oboe",
         "bassoon", "accordion", "keyboard", "xylophone", "tambourine", "triangle",
         "maracas", "bagpipes", "organ", "harmonica", "recorder", "cymbals", "bongos",
         "viola", "double bass", "french horn", "kazoo", "sitar", "mandolin", "glockenspiel"],
    pics: [["Piano", "🎹"], ["Guitar", "🎸"], ["Drum", "🥁"], ["Trumpet", "🎺"], ["Violin", "🎻"], ["Saxophone", "🎷"]]
  },
  {
    q: "Name a colour", e: "🎨",
    ok: ["red", "blue", "green", "yellow", "orange", "purple", "pink", "black", "white",
         "brown", "grey", "gray", "violet", "indigo", "turquoise", "magenta", "maroon",
         "gold", "silver", "beige", "teal", "lavender", "crimson", "scarlet", "navy",
         "olive", "peach", "coral", "amber", "ivory", "tan", "lime", "aqua", "cyan",
         "mint", "rose", "bronze", "copper", "charcoal", "cream", "emerald", "sapphire"],
    pics: [["Red", "🟥"], ["Blue", "🟦"], ["Green", "🟩"], ["Yellow", "🟨"], ["Purple", "🟪"], ["Orange", "🟧"]]
  },
  {
    q: "Name a sport", e: "⚽",
    ok: ["soccer", "football", "basketball", "baseball", "tennis", "hockey", "golf",
         "swimming", "running", "cycling", "skiing", "snowboarding", "skateboarding",
         "volleyball", "badminton", "cricket", "rugby", "boxing", "wrestling", "gymnastics",
         "karate", "judo", "fencing", "archery", "bowling", "surfing", "sailing", "rowing",
         "climbing", "dancing", "lacrosse", "softball", "ping pong", "table tennis",
         "track", "diving", "skating", "horse riding", "netball", "handball", "curling"],
    pics: [["Soccer", "⚽"], ["Basketball", "🏀"], ["Tennis", "🎾"], ["Swimming", "🏊"], ["Skiing", "⛷️"], ["Baseball", "⚾"]]
  },
  {
    q: "Name something in a bathroom", e: "🛁",
    ok: ["toilet", "sink", "bathtub", "tub", "shower", "mirror", "towel", "toothbrush",
         "toothpaste", "soap", "shampoo", "conditioner", "comb", "brush", "razor", "tissue",
         "toilet paper", "scale", "bath mat", "rug", "curtain", "faucet", "tap", "drain",
         "sponge", "lotion", "floss", "hairdryer", "bubble bath", "rubber duck", "bin"]
  },
  {
    q: "Name a job people do", e: "👩‍🚒",
    ok: ["teacher", "doctor", "nurse", "firefighter", "police officer", "chef", "cook",
         "farmer", "pilot", "driver", "engineer", "scientist", "artist", "painter", "singer",
         "dancer", "actor", "writer", "author", "lawyer", "judge", "dentist", "vet",
         "veterinarian", "plumber", "electrician", "carpenter", "builder", "baker",
         "butcher", "librarian", "astronaut", "soldier", "sailor", "mechanic", "programmer",
         "photographer", "journalist", "architect", "accountant", "waiter", "barber",
         "gardener", "coach", "referee", "postman", "cleaner", "scientist", "musician"],
    pics: [["Doctor", "🧑‍⚕️"], ["Chef", "🧑‍🍳"], ["Farmer", "🧑‍🌾"], ["Firefighter", "🧑‍🚒"], ["Teacher", "🧑‍🏫"], ["Pilot", "🧑‍✈️"]]
  },
  {
    q: "Name an animal with four legs", e: "🐕",
    ok: ["dog", "cat", "horse", "cow", "pig", "sheep", "goat", "lion", "tiger", "bear",
         "elephant", "giraffe", "zebra", "rhino", "rhinoceros", "hippo", "hippopotamus",
         "deer", "moose", "wolf", "fox", "rabbit", "mouse", "rat", "squirrel", "raccoon",
         "skunk", "badger", "camel", "llama", "alpaca", "donkey", "mule", "panda", "koala",
         "leopard", "cheetah", "jaguar", "panther", "hyena", "buffalo", "bison", "antelope",
         "gazelle", "ox", "yak", "hedgehog", "porcupine", "armadillo", "beaver", "otter",
         "ferret", "hamster", "guinea pig", "chipmunk", "meerkat", "lizard", "crocodile",
         "alligator", "turtle", "tortoise", "elk", "warthog", "wildebeest", "lemur"],
    pics: [["Elephant", "🐘"], ["Zebra", "🦓"], ["Tiger", "🐅"], ["Horse", "🐴"], ["Panda", "🐼"], ["Rabbit", "🐰"]]
  },
  {
    q: "Name something that can fly", e: "✈️",
    ok: ["bird", "plane", "airplane", "aeroplane", "helicopter", "rocket", "butterfly",
         "bee", "bat", "dragonfly", "eagle", "hawk", "owl", "kite", "balloon",
         "hot air balloon", "drone", "jet", "glider", "moth", "mosquito", "fly", "ladybug",
         "parrot", "pigeon", "seagull", "sparrow", "falcon", "vulture", "flamingo", "swan",
         "goose", "duck", "superman", "fairy", "dragon", "wasp", "hummingbird",
         "pterodactyl", "spaceship", "frisbee", "boomerang", "witch", "crow", "robin"],
    pics: [["Butterfly", "🦋"], ["Eagle", "🦅"], ["Airplane", "✈️"], ["Bee", "🐝"], ["Helicopter", "🚁"], ["Owl", "🦉"]]
  },
  {
    q: "Name a body part", e: "🦴",
    ok: ["head", "arm", "leg", "hand", "foot", "finger", "toe", "knee", "elbow", "shoulder",
         "nose", "ear", "eye", "mouth", "tooth", "tongue", "hair", "neck", "back", "chest",
         "stomach", "heart", "brain", "lung", "liver", "kidney", "bone", "muscle", "skin",
         "ankle", "wrist", "thumb", "chin", "cheek", "forehead", "eyebrow", "eyelash",
         "spine", "rib", "hip", "thigh", "calf", "heel", "palm", "knuckle", "jaw", "throat"],
    pics: [["Hand", "✋"], ["Eye", "👁️"], ["Nose", "👃"], ["Ear", "👂"], ["Foot", "🦶"], ["Tooth", "🦷"]]
  },
  {
    q: "Name a kind of weather", e: "☀️",
    ok: ["sunny", "rainy", "cloudy", "windy", "snowy", "stormy", "foggy", "hail", "thunder",
         "lightning", "tornado", "hurricane", "blizzard", "drizzle", "sleet", "rainbow",
         "frost", "ice", "heatwave", "humid", "breezy", "misty", "monsoon", "typhoon",
         "sunshine", "downpour", "snow", "rain", "wind", "cloud", "storm", "thunderstorm",
         "showers", "overcast", "freezing", "hot", "cold", "warm", "chilly"],
    pics: [["Sunny", "☀️"], ["Rainy", "🌧️"], ["Snowy", "❄️"], ["Stormy", "⛈️"], ["Windy", "🌬️"], ["Rainbow", "🌈"]]
  },
  {
    q: "Name something you wear", e: "👕",
    ok: ["shirt", "tshirt", "pants", "trousers", "jeans", "dress", "skirt", "shorts",
         "jacket", "coat", "sweater", "jumper", "hoodie", "sock", "shoe", "boot", "sandal",
         "sneaker", "hat", "cap", "scarf", "glove", "mitten", "belt", "tie", "pyjamas",
         "pajamas", "sweatshirt", "vest", "blouse", "leggings", "tights", "uniform",
         "costume", "swimsuit", "raincoat", "slipper", "glasses", "watch", "necklace",
         "bracelet", "ring", "earring", "backpack", "crown", "helmet", "apron", "cardigan"],
    pics: [["Shirt", "👕"], ["Dress", "👗"], ["Hat", "🎩"], ["Boot", "👢"], ["Sock", "🧦"], ["Crown", "👑"]]
  },
  {
    q: "Name a Minecraft mob", e: "🟩",
    ok: ["creeper", "zombie", "skeleton", "spider", "enderman", "pig", "cow", "chicken",
         "sheep", "villager", "witch", "slime", "ghast", "blaze", "wither", "ender dragon",
         "dragon", "wolf", "cat", "ocelot", "horse", "llama", "bee", "fox", "panda",
         "dolphin", "turtle", "squid", "guardian", "phantom", "drowned", "husk", "stray",
         "pillager", "ravager", "piglin", "hoglin", "strider", "axolotl", "goat", "frog",
         "allay", "warden", "sniffer", "camel", "silverfish", "endermite", "magma cube",
         "zombie pigman", "snow golem", "iron golem", "mooshroom", "bat", "parrot", "rabbit",
         "polar bear", "salmon", "cod", "pufferfish", "tropical fish", "vex", "evoker",
         "vindicator", "shulker", "wandering trader", "cave spider", "zombie villager", "breeze"]
  },
  {
    q: "Name a princess", e: "👑",
    ok: ["cinderella", "ariel", "belle", "jasmine", "aurora", "snow white", "rapunzel",
         "tiana", "merida", "moana", "elsa", "anna", "mulan", "pocahontas", "sofia",
         "peach", "zelda", "leia", "diana", "kate", "fiona", "odette", "giselle", "vanellope"]
  },
  {
    q: "Name a school subject", e: "📚",
    ok: ["math", "maths", "mathematics", "science", "reading", "writing", "english",
         "history", "geography", "art", "music", "spelling", "gym", "pe", "computers",
         "coding", "biology", "chemistry", "physics", "spanish", "french", "german",
         "drama", "health", "social studies", "handwriting", "poetry", "grammar"]
  },
  {
    q: "Name something you find in a park", e: "🌳",
    ok: ["tree", "swing", "slide", "bench", "grass", "flower", "pond", "duck", "dog",
         "path", "sandbox", "seesaw", "fountain", "picnic table", "playground",
         "monkey bars", "squirrel", "bird", "bin", "gate", "fence", "statue", "bridge",
         "trail", "kite", "frisbee", "ball", "blanket", "lake", "bush", "leaf", "climbing frame"]
  },
  {
    q: "Name a way to travel", e: "🚗",
    ok: ["car", "bus", "train", "plane", "airplane", "bike", "bicycle", "scooter",
         "motorbike", "motorcycle", "truck", "van", "taxi", "tram", "subway", "boat",
         "ship", "ferry", "canoe", "kayak", "helicopter", "rocket", "skateboard",
         "rollerblades", "hovercraft", "submarine", "sled", "sleigh", "wagon", "tractor",
         "ambulance", "fire truck", "jet", "gondola", "unicycle", "horse", "walking",
         "running", "hot air balloon", "cable car", "monorail"],
    pics: [["Car", "🚗"], ["Train", "🚂"], ["Airplane", "✈️"], ["Bicycle", "🚲"], ["Boat", "⛵"], ["Rocket", "🚀"]]
  },
  {
    q: "Name a bug or insect", e: "🐞",
    ok: ["ant", "bee", "wasp", "beetle", "ladybug", "ladybird", "butterfly", "moth",
         "dragonfly", "grasshopper", "cricket", "spider", "caterpillar", "centipede",
         "millipede", "cockroach", "termite", "mosquito", "fly", "firefly", "mantis",
         "praying mantis", "scorpion", "snail", "slug", "worm", "earthworm", "tick",
         "flea", "aphid", "hornet", "bumblebee", "stick insect", "cicada", "locust", "weevil"],
    pics: [["Ant", "🐜"], ["Bee", "🐝"], ["Ladybug", "🐞"], ["Butterfly", "🦋"], ["Spider", "🕷️"], ["Caterpillar", "🐛"]]
  },
  {
    q: "Name a dessert", e: "🍰",
    ok: ["cake", "cookie", "brownie", "pie", "ice cream", "cupcake", "donut", "doughnut",
         "pudding", "jelly", "custard", "cheesecake", "pancake", "waffle", "muffin", "tart",
         "macaron", "cannoli", "tiramisu", "sundae", "milkshake", "popsicle", "candy",
         "chocolate", "fudge", "truffle", "mousse", "eclair", "croissant", "scone",
         "gingerbread", "shortcake", "trifle", "parfait", "sorbet", "gelato", "banana split"],
    pics: [["Cake", "🍰"], ["Cookie", "🍪"], ["Ice cream", "🍦"], ["Donut", "🍩"], ["Pie", "🥧"], ["Cupcake", "🧁"]]
  },
  {
    q: "Name something you find at the beach", e: "🏖️",
    ok: ["sand", "shell", "seashell", "crab", "wave", "water", "ocean", "sea", "umbrella",
         "towel", "sunscreen", "bucket", "spade", "shovel", "sandcastle", "surfboard",
         "seagull", "starfish", "seaweed", "driftwood", "lifeguard", "boat", "pier", "dune",
         "pebble", "rock", "jellyfish", "flip flops", "swimsuit", "cooler", "kite", "sun",
         "beach ball", "deck chair", "palm tree"]
  },
  {
    q: "Name a farm animal", e: "🐄",
    ok: ["cow", "pig", "sheep", "goat", "chicken", "rooster", "hen", "duck", "goose",
         "turkey", "horse", "donkey", "llama", "alpaca", "rabbit", "dog", "cat", "mouse",
         "bull", "calf", "lamb", "piglet", "foal", "chick", "ox", "bee", "peacock", "pony"],
    pics: [["Cow", "🐄"], ["Pig", "🐖"], ["Sheep", "🐑"], ["Chicken", "🐓"], ["Horse", "🐴"], ["Goat", "🐐"]]
  },
  {
    q: "Name a planet", e: "🪐",
    ok: ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"]
  },
  {
    q: "Name a kind of tree", e: "🌲",
    ok: ["oak", "pine", "maple", "birch", "willow", "redwood", "spruce", "fir", "cedar",
         "palm", "apple tree", "cherry tree", "elm", "ash", "beech", "chestnut", "walnut",
         "sycamore", "magnolia", "dogwood", "aspen", "poplar", "hickory", "cypress",
         "bamboo", "banyan", "baobab", "sequoia", "mango tree", "olive tree", "christmas tree"]
  },
  {
    q: "Name a flat shape", e: "🔷",
    ok: ["circle", "square", "triangle", "rectangle", "oval", "diamond", "star", "heart",
         "pentagon", "hexagon", "octagon", "rhombus", "trapezoid", "crescent", "semicircle",
         "parallelogram", "nonagon", "decagon", "quadrilateral", "heptagon", "ellipse", "kite"]
  },
  {
    q: "Name something cold", e: "❄️",
    ok: ["ice", "snow", "ice cream", "freezer", "iceberg", "popsicle", "winter", "snowman",
         "icicle", "fridge", "refrigerator", "arctic", "antarctica", "milkshake", "slush",
         "snowflake", "frost", "hail", "glacier", "igloo", "penguin", "polar bear",
         "north pole", "south pole", "ice cube", "snowball", "frozen yogurt", "iced tea"]
  },
  {
    q: "Name a drink", e: "🥤",
    ok: ["water", "milk", "juice", "lemonade", "soda", "tea", "coffee", "cocoa",
         "hot chocolate", "smoothie", "milkshake", "punch", "cider", "root beer", "cola",
         "orange juice", "apple juice", "iced tea", "coconut water", "sparkling water",
         "ginger ale", "eggnog", "slushie"]
  },
  {
    q: "Name a US state", e: "🗽",
    ok: ["alabama", "alaska", "arizona", "arkansas", "california", "colorado", "connecticut",
         "delaware", "florida", "georgia", "hawaii", "idaho", "illinois", "indiana", "iowa",
         "kansas", "kentucky", "louisiana", "maine", "maryland", "massachusetts", "michigan",
         "minnesota", "mississippi", "missouri", "montana", "nebraska", "nevada",
         "new hampshire", "new jersey", "new mexico", "new york", "north carolina",
         "north dakota", "ohio", "oklahoma", "oregon", "pennsylvania", "rhode island",
         "south carolina", "south dakota", "tennessee", "texas", "utah", "vermont",
         "virginia", "washington", "west virginia", "wisconsin", "wyoming"]
  },
  {
    q: "Name something in a classroom", e: "🏫",
    ok: ["desk", "chair", "board", "whiteboard", "blackboard", "chalk", "pencil", "pen",
         "eraser", "rubber", "ruler", "book", "notebook", "paper", "glue", "scissors",
         "crayon", "marker", "backpack", "computer", "tablet", "clock", "map", "globe",
         "calendar", "teacher", "student", "poster", "bookshelf", "calculator", "stapler",
         "sharpener", "folder", "lunchbox", "water bottle"]
  }
];
