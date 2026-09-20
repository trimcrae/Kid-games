/* ===========================================================
   Photo Expedition — the world, the animals and the facts.
   -----------------------------------------------------------
   Nine expeditions, one on every continent. Each has:

     lat / lon      real coordinates (the map pins use them)
     biome          which 3D world is built (world.mjs)
     subjects       what there is to photograph — every subject has
                    a TRUE fact a 6-year-old can repeat at dinner
     treasure       one hidden thing to find with the grid map
     gate           what you must do on the world map to unlock it

   Every fact was written to be correct; if you change one, keep it
   true — the point of the game is that Cory learns real things.
   =========================================================== */

const CONTINENTS = {
  africa:       { name: "Africa",        emoji: "🦁" },
  asia:         { name: "Asia",          emoji: "🐼" },
  europe:       { name: "Europe",        emoji: "🏰" },
  namerica:     { name: "North America", emoji: "🦬" },
  samerica:     { name: "South America", emoji: "🦜" },
  oceania:      { name: "Oceania",       emoji: "🐨" },
  antarctica:   { name: "Antarctica",    emoji: "🐧" }
};

/* Rough continent boxes on the map, used for "tap the continent"
   unlock questions: [minLon, maxLon, minLat, maxLat] tests, checked
   in order (the first box that contains the tap wins). */
const CONTINENT_BOXES = [
  ["antarctica", -180, 180, -90, -60],
  ["oceania",    110, 180, -50, -8],
  ["oceania",    155, 180, -50, 0],
  ["samerica",   -92, -32, -57, 13],
  ["namerica",   -170, -50, 13, 84],
  ["namerica",   -170, -105, 7, 13],
  ["europe",     -25, 40, 36, 82],
  ["europe",     -12, 30, 30, 36],   // Mediterranean edge (Spain/Italy toe)
  ["africa",     -20, 52, -36, 37.5],
  ["asia",       25, 180, -11, 82],
  ["asia",       40, 60, 12, 30]
];

/* -------------- the nine expeditions -------------- */
const SITES = [
  {
    id: "serengeti",
    name: "The Serengeti",
    place: "Tanzania · Africa",
    continent: "africa",
    country: "Tanzania",
    flag: "🇹🇿",
    lat: -2.33, lon: 34.83,
    emoji: "🦁",
    biome: "savanna",
    color: "#e0a458",
    intro: "Golden grass as far as you can see, flat-topped acacia trees and more big animals than anywhere on Earth. Keep quiet, keep low, and wait for the light.",
    tip: "The best safari photos are taken early and late — the low sun paints everything gold.",
    subjects: ["lion", "elephant", "giraffe", "zebra", "baobab"],
    treasure: {
      id: "compass", name: "The Explorer's Lost Compass", emoji: "🧭",
      clue: "An old explorer dropped her brass compass under the biggest baobab tree. Find the baobab on your map and search the ground around its trunk.",
      pro: "From the water hole, walk 140 m on a bearing of 060° (east-north-east). The compass is buried where the shade of a baobab falls at noon.",
      fact: "A compass needle always points north because it is a tiny magnet — and the whole Earth is a giant one."
    },
    gate: null
  },
  {
    id: "amazon",
    name: "The Amazon Rainforest",
    place: "Brazil · South America",
    continent: "samerica",
    country: "Brazil",
    flag: "🇧🇷",
    lat: -3.47, lon: -62.2,
    emoji: "🦜",
    biome: "rainforest",
    color: "#2f9e44",
    intro: "The biggest rainforest on the planet, steamy and loud with birds. Half of everything here is hiding — look up into the trees and down at the river.",
    tip: "In a dark forest, get close and zoom in: a bright bird against dark leaves makes a brilliant picture.",
    subjects: ["jaguar", "toucan", "macaw", "capybara", "morpho"],
    treasure: {
      id: "idol", name: "The Golden Jaguar Idol", emoji: "🗿",
      clue: "A stone temple is lost in the trees. Its golden idol lies where the river makes a big bend — find the bend on your map, then look for old stone steps.",
      pro: "From where the river meets the north edge of the map, follow the water 200 m downstream. The steps are 40 m east of the bank.",
      fact: "The Amazon river carries more water than the next seven biggest rivers put together."
    },
    gate: { stars: 4 }
  },
  {
    id: "reef",
    name: "The Great Barrier Reef",
    place: "Australia · Oceania",
    continent: "oceania",
    country: "Australia",
    flag: "🇦🇺",
    lat: -18.29, lon: 147.7,
    emoji: "🐢",
    biome: "reef",
    color: "#22b8cf",
    intro: "Snorkel time! The reef is the biggest thing ever built by living creatures — you can see it from space. Swim slowly and the fish will come to you.",
    tip: "Under water, everything looks blue from far away. Get close so the real colours show.",
    subjects: ["turtle", "clownfish", "reefshark", "manta", "coral"],
    treasure: {
      id: "chest", name: "The Shipwreck's Chest", emoji: "⚓",
      clue: "A sailing ship sank here long ago. Wrecks settle in the deepest, darkest water — find the deep blue part of your map and swim down to the mast.",
      pro: "The wreck lies in the deep channel on the west side. Swim 150 m on a bearing of 240° from the big coral head at the centre of the map.",
      fact: "More than 1,600 ships have been wrecked on the Great Barrier Reef — the old sailors could not see the coral under the waves."
    },
    gate: { stars: 9 }
  },
  {
    id: "arctic",
    name: "Svalbard, the Arctic",
    place: "Norway · Europe",
    continent: "europe",
    country: "Norway",
    flag: "🇳🇴",
    lat: 78.2, lon: 15.6,
    emoji: "🐻‍❄️",
    biome: "arctic",
    color: "#a5d8ff",
    emit: true,
    intro: "Islands of ice and snow at the very top of the world, halfway between Norway and the North Pole. Polar bears rule here — photograph them from a long way off!",
    tip: "Snow is so bright that pictures come out grey. Real photographers turn the exposure UP a little in the snow.",
    subjects: ["polarbear", "walrus", "arcticfox", "reindeer", "aurora"],
    treasure: {
      id: "sledge", name: "The Polar Explorer's Sledge", emoji: "🛷",
      clue: "A hundred years ago an explorer left a wooden sledge on the ice. Sledges are pulled across the FLAT snow, never up the mountains — search the flat white part of your map, near the sea.",
      pro: "The sledge sits on the sea-ice shelf. From the highest peak, head 260 m due south, then 60 m west.",
      fact: "In Svalbard the sun does not set at all from April to August, and does not rise at all from November to January."
    },
    gate: { stars: 14 }
  },
  {
    id: "galapagos",
    name: "The Galápagos Islands",
    place: "Ecuador · South America",
    continent: "samerica",
    country: "Ecuador",
    flag: "🇪🇨",
    lat: -0.8, lon: -91.1,
    emoji: "🐢",
    biome: "volcanic",
    color: "#495057",
    intro: "Volcanic islands right on the equator, 1,000 km out in the Pacific. The animals here have never learned to be scared of people, so you can get amazingly close.",
    tip: "When an animal lets you get close, kneel down to its eye level — pictures from a kid's height look way more exciting.",
    subjects: ["tortoise", "iguana", "booby", "sealion", "volcano"],
    treasure: {
      id: "pirate", name: "The Pirate's Chest", emoji: "🏴‍☠️",
      clue: "Real pirates hid on these islands 300 years ago! They buried their chest in the black sand of a beach on the EAST side, behind a rock shaped like a whale.",
      pro: "The chest is on the eastern beach. Take a bearing of 095° from the volcano's crater rim and walk 210 m.",
      fact: "Charles Darwin visited the Galápagos in 1835. Seeing the different finches on each island helped him work out how animals evolve."
    },
    gate: { stars: 19 }
  },
  {
    id: "himalaya",
    name: "The Himalayas",
    place: "Nepal · Asia",
    continent: "asia",
    country: "Nepal",
    flag: "🇳🇵",
    lat: 27.99, lon: 86.93,
    emoji: "🏔️",
    emit: true,
    biome: "mountain",
    color: "#7c8ea0",
    intro: "The highest mountains on Earth. The air is thin, the sun is strong, and the rarest cat in the world lives up here — the ghost of the mountains.",
    tip: "Snow leopards come out at dawn and dusk. Wait patiently at one spot and let the animal come to you.",
    subjects: ["snowleopard", "yak", "monal", "redpanda", "everest"],
    treasure: {
      id: "fossil", name: "The Spiral Sea-Shell Fossil", emoji: "🐚",
      clue: "Millions of years ago these mountains were the bottom of the sea! Sea-shell fossils are found in the rocky river valley — look at the LOWEST part of your map, where the stream runs.",
      pro: "Ammonite fossils weather out of the black shale in the stream bed. Follow the stream 180 m upstream from the south edge of the map.",
      fact: "The Himalayas are still growing about 4 millimetres a year, because India is pushing into Asia."
    },
    gate: { stars: 24 }
  },
  {
    id: "sahara",
    name: "The Sahara & the Pyramids",
    place: "Egypt · Africa",
    continent: "africa",
    country: "Egypt",
    flag: "🇪🇬",
    lat: 29.98, lon: 31.13,
    emoji: "🐪",
    biome: "desert",
    color: "#f4a261",
    intro: "The biggest hot desert in the world, and at its edge the pyramids — the oldest of the great wonders, and still standing after 4,500 years.",
    tip: "In the desert the midday light is harsh and flat. Sunrise and sunset make long shadows on the dunes — that's when to shoot.",
    subjects: ["camel", "fennec", "vulture", "pyramids", "sphinx"],
    treasure: {
      id: "scarab", name: "The Pharaoh's Golden Scarab", emoji: "🪲",
      clue: "A golden beetle charm was lost in the sand thousands of years ago. It lies exactly halfway between the Great Pyramid and the Sphinx — find both on your map and search the middle.",
      pro: "Take the midpoint of the Great Pyramid and the Sphinx, then walk 30 m south of it. The scarab glints only when the sun is low.",
      fact: "The Great Pyramid was the tallest building in the world for about 3,800 years, and is made of around 2.3 million stone blocks."
    },
    gate: { stars: 29 }
  },
  {
    id: "yellowstone",
    name: "Yellowstone",
    place: "USA · North America",
    continent: "namerica",
    country: "United States",
    flag: "🇺🇸",
    lat: 44.6, lon: -110.5,
    emoji: "🦬",
    biome: "yellowstone",
    color: "#74b816",
    intro: "The world's first national park, on top of a giant sleeping volcano. Geysers shoot boiling water into the sky and the biggest animals in America roam the valleys.",
    tip: "Old Faithful erupts about every 90 minutes. Real photographers check the time, set up early, and wait.",
    subjects: ["bison", "elk", "grizzly", "eagle", "geyser"],
    treasure: {
      id: "journal", name: "The Lost Explorer's Journal", emoji: "📓",
      clue: "In 1870 an explorer got lost here for 37 days. His notebook lies in the pine forest on the NORTH edge of your map, at the foot of the tallest tree.",
      pro: "The journal is in the northern pines. From the geyser, walk 220 m on a bearing of 350°.",
      fact: "Yellowstone has more geysers than the rest of the world put together — over 500 of them."
    },
    gate: { stars: 34 }
  },
  {
    id: "antarctica",
    name: "Antarctica",
    place: "The frozen continent",
    continent: "antarctica",
    country: "Antarctica (no country owns it)",
    flag: "🇦🇶",
    lat: -77.85, lon: 166.67,
    emoji: "🐧",
    biome: "antarctic",
    color: "#e7f5ff",
    emit: true,
    intro: "The coldest, windiest, emptiest place on Earth — and your seventh continent. Nobody lives here except scientists, penguins, seals and whales.",
    tip: "Penguins are curious. Sit still on the ice and they may waddle right up to your camera.",
    subjects: ["emperor", "seal", "humpback", "iceberg"],
    treasure: {
      id: "tin", name: "The Hundred-Year-Old Biscuit Tin", emoji: "🍪",
      clue: "Explorers who came here 100 years ago left a wooden hut, and inside it, tins of biscuits that are STILL there because it's too cold for them to rot. The hut is on the rocky shore, away from the ice — find the brown part of your map.",
      pro: "Scott's hut stands on the bare rock of the point. From the centre of the penguin colony, walk 250 m on a bearing of 120°.",
      fact: "Antarctica is a desert! It gets less rain and snow than the Sahara — the ice is just very, very old."
    },
    gate: { stars: 38 }
  }
];

/* -------------- everything you can photograph -------------- */
/* kind:  animal | bird | swimmer | landmark | moment
   when:  any | day | dawn | dusk | night   (time of the expedition day)
   rare:  rarer animals are worth more stars and are harder to find
   photo: search terms for the real, professional photograph shown in
          the field guide (fetched by tools/fetch-expedition-photos.mjs)   */
const SUBJECTS = {
  /* --- Serengeti --- */
  lion:      { name: "Lion", emoji: "🦁", kind: "animal", when: "any", rare: 2, size: 1.2,
               fact: "A lion's roar can be heard from 8 kilometres away. Lions are the only cats that live in families, called prides — and they sleep up to 20 hours a day.",
               tip: "Lions rest in the shade at midday. Look for the flick of a tail in the long grass." },
  elephant:  { name: "African elephant", emoji: "🐘", kind: "animal", when: "any", rare: 1, size: 3.2,
               fact: "The biggest animal that walks on land — a grown-up weighs as much as four cars. Its trunk has about 40,000 muscles, and its ears are shaped like Africa.",
               tip: "Elephants are huge, so a wide shot shows the whole herd. Ears out means 'you're too close'." },
  giraffe:   { name: "Giraffe", emoji: "🦒", kind: "animal", when: "day", rare: 1, size: 5,
               fact: "The tallest animal in the world — as tall as three grown-ups standing on each other's shoulders. Its tongue is blue-black and 45 cm long, and it has only seven neck bones, the same as you.",
               tip: "Tilt the camera up to fit the whole giraffe in, or zoom in on the face for a portrait." },
  zebra:     { name: "Zebra", emoji: "🦓", kind: "animal", when: "any", rare: 1, size: 1.4,
               fact: "Every zebra's stripes are different, like your fingerprints. Scientists think the stripes confuse biting flies so they can't land.",
               tip: "A whole herd of stripes makes a great pattern photo." },
  baobab:    { name: "Giant baobab", emoji: "🌳", kind: "landmark", when: "any", rare: 1, size: 14,
               fact: "Baobab trees can live 2,000 years and store thousands of litres of water in their fat trunks to survive the dry season. Upside down, they look like their roots are in the air.",
               tip: "Shoot it at sunset with the sky behind it for a silhouette." },

  /* --- Amazon --- */
  jaguar:    { name: "Jaguar", emoji: "🐆", kind: "animal", when: "dawn", rare: 3, size: 1,
               fact: "The biggest cat in the Americas, with the strongest bite of any big cat — it can crunch through a turtle shell. Unlike most cats, jaguars love swimming. Their spots have little dots inside them; a leopard's don't.",
               tip: "Jaguars hunt near the river at dawn and dusk. Be patient and quiet." },
  toucan:    { name: "Toco toucan", emoji: "🐦", kind: "bird", when: "day", rare: 1, size: 0.6,
               fact: "Its giant orange beak is a third of its whole length, but it's hollow and light like a honeycomb. Toucans use it to reach fruit on thin branches, and to keep cool.",
               tip: "Look UP: toucans sit high in the canopy. Zoom right in." },
  macaw:     { name: "Scarlet macaw", emoji: "🦜", kind: "bird", when: "day", rare: 1, size: 0.8,
               fact: "Scarlet macaws can live for more than 50 years and pick one partner for life. They are so clever they can learn to copy human words.",
               tip: "Catch them in flight for an action shot — hold the shutter as they cross the frame." },
  capybara:  { name: "Capybara", emoji: "🦫", kind: "animal", when: "any", rare: 1, size: 1.1,
               fact: "The biggest rodent in the world — a guinea pig as heavy as a grown-up. Capybaras have webbed feet, love swimming, and are so calm that birds and even monkeys ride on their backs.",
               tip: "Capybaras sit by the water. Get down low to their level." },
  morpho:    { name: "Blue morpho butterfly", emoji: "🦋", kind: "flutter", when: "day", rare: 2, size: 0.18,
               fact: "Its wings are as wide as your hand — and they're not really blue! Tiny scales bend the light to make the colour, like a rainbow does. Underneath, the wings are brown so it can hide.",
               tip: "Butterflies are tiny: get close, zoom in, and wait for it to land." },

  /* --- Reef --- */
  turtle:    { name: "Green sea turtle", emoji: "🐢", kind: "swimmer", when: "any", rare: 1, size: 1.1,
               fact: "Sea turtles can hold their breath for hours while resting. When a mother turtle is grown up, she swims thousands of kilometres back to lay her eggs on the very beach where she hatched.",
               tip: "Swim alongside a turtle, never in front of it, and it will keep gliding calmly." },
  clownfish: { name: "Clownfish", emoji: "🐠", kind: "swimmer", when: "any", rare: 1, size: 0.12,
               fact: "Clownfish live inside a stinging anemone — a slimy coat means it can't sting them, and the anemone keeps them safe. Every clownfish is born a boy; the biggest one turns into a girl.",
               tip: "They never leave their anemone, so get close and fill the frame with orange." },
  reefshark: { name: "Blacktip reef shark", emoji: "🦈", kind: "swimmer", when: "any", rare: 2, size: 1.5,
               fact: "About as long as a bed, with black tips on its fins. It hunts small fish over the reef and is shy of people — the sharks are far more scared of you than you are of them.",
               tip: "A shark from the side shows its shape best." },
  manta:     { name: "Manta ray", emoji: "🌊", kind: "swimmer", when: "any", rare: 3, size: 4.5,
               fact: "Wings as wide as a car is long — the biggest ray in the sea, and the fish with the biggest brain. Mantas eat only tiny plankton, filtering it through their mouths as they fly through the water.",
               tip: "Look up as it glides over you — a manta against the sunlight is a classic shot." },
  coral:     { name: "Coral garden", emoji: "🪸", kind: "landmark", when: "any", rare: 1, size: 3,
               fact: "Coral looks like rock but it's millions of tiny animals, each one building a stone cup to live in. The Great Barrier Reef is 2,300 km long — the biggest thing ever built by living creatures.",
               tip: "Shoot the coral with the sunlight coming from behind you so the colours pop." },

  /* --- Arctic --- */
  polarbear: { name: "Polar bear", emoji: "🐻‍❄️", kind: "animal", when: "any", rare: 2, size: 1.5,
               fact: "The biggest bear on Earth. Under its white fur its skin is black, and each hair is hollow to trap heat. It can smell a seal through a metre of ice from a kilometre away.",
               tip: "Real photographers use a long lens for bears. Stay far away and zoom in." },
  walrus:    { name: "Walrus", emoji: "🦭", kind: "animal", when: "any", rare: 1, size: 2,
               fact: "Tusks up to a metre long, which it uses like ice-picks to haul its two-tonne body out of the sea. Its whiskers can feel a clam on the sea floor in the dark.",
               tip: "Walruses pile up on the shore in huge, snoring heaps." },
  arcticfox: { name: "Arctic fox", emoji: "🦊", kind: "animal", when: "any", rare: 2, size: 0.55,
               fact: "Its coat is white in winter and brown in summer, so it always matches the ground. Its thick fur keeps it warm at minus 50 degrees, and it can hear a mouse moving under the snow.",
               tip: "A white fox on white snow is tricky. Wait for it to look at you — the dark eyes and nose give the picture its focus." },
  reindeer:  { name: "Svalbard reindeer", emoji: "🦌", kind: "animal", when: "any", rare: 1, size: 1,
               fact: "The smallest reindeer in the world, with short legs and a round tummy to keep warm. Both mums and dads grow antlers, and they dig through snow to find moss.",
               tip: "Reindeer are calm — get their antlers against the sky." },
  aurora:    { name: "The northern lights", emoji: "🌌", kind: "moment", when: "night", rare: 3, size: 100,
               fact: "The aurora is made by tiny bits of the sun hitting the air 100 km above the Earth and making it glow green and purple. It can only be seen near the poles, when it is dark.",
               tip: "Wait for night. Point the camera up at the sky and hold very still." },

  /* --- Galápagos --- */
  tortoise:  { name: "Giant tortoise", emoji: "🐢", kind: "animal", when: "any", rare: 1, size: 1.3,
               fact: "The biggest tortoise in the world, as heavy as three grown-ups, and one of the longest-living animals — some are over 150 years old. They can go a whole year without food or water.",
               tip: "Tortoises are slow, so take your time and get the shell and the face in the picture." },
  iguana:    { name: "Marine iguana", emoji: "🦎", kind: "animal", when: "day", rare: 2, size: 0.8,
               fact: "The only lizard in the world that swims in the sea. It dives to eat seaweed off the rocks, then lies on the black lava to warm up — and it sneezes out the salt!",
               tip: "They lie in big black piles on the rocks by the sea." },
  booby:     { name: "Blue-footed booby", emoji: "🐦", kind: "bird", when: "day", rare: 1, size: 0.6,
               fact: "Its feet really are bright blue! Boobies do a silly dance, lifting one blue foot and then the other. The bluer the feet, the healthier the bird.",
               tip: "Get the feet in the shot — that's the whole point!" },
  sealion:   { name: "Galápagos sea lion", emoji: "🦭", kind: "animal", when: "any", rare: 1, size: 1.4,
               fact: "The playful puppies of the sea. Sea lions have ears you can see and can walk on their flippers — seals can't. They love to swim up and blow bubbles at snorkellers.",
               tip: "Sea lions come right up to you. Get down on the sand at their level." },
  volcano:   { name: "The volcano", emoji: "🌋", kind: "landmark", when: "any", rare: 1, size: 60,
               fact: "The Galápagos Islands were all made by volcanoes pushing up out of the sea, and some are still erupting. The islands are only a few million years old — babies, for islands.",
               tip: "Put the crater on the top third of your photo and the sea on the bottom." },

  /* --- Himalayas --- */
  snowleopard: { name: "Snow leopard", emoji: "🐆", kind: "animal", when: "dawn", rare: 3, size: 1,
               fact: "The ghost of the mountains — so well hidden that hardly anyone ever sees one. Its tail is nearly as long as its body and it wraps it round its face like a scarf. It can leap 6 metres in one jump, but it cannot roar.",
               tip: "Look on the rocky ridges at dawn and dusk. Zoom all the way in — you'll never get close." },
  yak:       { name: "Yak", emoji: "🐂", kind: "animal", when: "any", rare: 1, size: 1.6,
               fact: "A shaggy cow that lives higher than any other cow — above 4,000 metres, where the air has half as much oxygen. Its thick skirt of hair keeps it warm at minus 40.",
               tip: "A yak against the snowy peaks tells the whole story of the mountains." },
  monal:     { name: "Himalayan monal", emoji: "🦚", kind: "bird", when: "day", rare: 2, size: 0.6,
               fact: "The national bird of Nepal, shining with nine different colours — blue, green, copper, purple and more. It digs for roots in the snow with its strong beak.",
               tip: "The colours only shine when the sun hits them. Wait for the bird to step into the light." },
  redpanda:  { name: "Red panda", emoji: "🐾", kind: "animal", when: "day", rare: 2, size: 0.55,
               fact: "About the size of a cat, with a fluffy striped tail it uses as a blanket. It eats bamboo like a giant panda, but it isn't a bear at all — it has its own family, all to itself.",
               tip: "Red pandas sleep in trees during the hottest part of the day. Look in the branches." },
  everest:   { name: "Mount Everest", emoji: "🏔️", kind: "landmark", when: "dawn", rare: 2, size: 200,
               fact: "The highest mountain on Earth: 8,849 metres, and still growing about 4 millimetres every year. At the top there is so little air that climbers carry oxygen bottles.",
               tip: "At sunrise the very top turns pink before anything else. Be ready." },

  /* --- Sahara --- */
  camel:     { name: "Dromedary camel", emoji: "🐪", kind: "animal", when: "any", rare: 1, size: 1.9,
               fact: "Its one hump is full of fat, not water — that's its packed lunch for a long desert crossing. A thirsty camel can drink 100 litres in ten minutes, and it can shut its nostrils to keep the sand out.",
               tip: "A line of camels on a dune at sunset is one of the most famous pictures in the world." },
  fennec:    { name: "Fennec fox", emoji: "🦊", kind: "animal", when: "dusk", rare: 3, size: 0.35,
               fact: "The smallest fox in the world, with the biggest ears — 15 cm long. The ears let out heat to keep it cool, and they can hear a beetle moving under the sand.",
               tip: "Fennecs sleep underground all day and come out at dusk. Kneel in the sand and wait." },
  vulture:   { name: "Egyptian vulture", emoji: "🦅", kind: "bird", when: "day", rare: 2, size: 0.7,
               fact: "One of the few birds that uses tools: it picks up a stone in its beak and throws it at an egg to crack it open. The ancient Egyptians drew it in their writing.",
               tip: "Vultures circle high in the sky. Follow one with the camera and shoot when its wings are spread." },
  pyramids:  { name: "The Great Pyramid", emoji: "🔺", kind: "landmark", when: "any", rare: 1, size: 140,
               fact: "Built 4,500 years ago from about 2.3 million blocks of stone, each heavier than a car. It was the tallest building in the world for 3,800 years.",
               tip: "Put the pyramid's point on the top-third line of your frame." },
  sphinx:    { name: "The Great Sphinx", emoji: "🗿", kind: "landmark", when: "any", rare: 1, size: 20,
               fact: "A lion with a king's head, carved from one single piece of rock. It is 73 metres long — longer than a jumbo jet — and its nose has been missing for hundreds of years.",
               tip: "Stand to the side so you get the lion body AND the face." },

  /* --- Yellowstone --- */
  bison:     { name: "Bison", emoji: "🦬", kind: "animal", when: "any", rare: 1, size: 1.8,
               fact: "The heaviest land animal in North America — a bull weighs as much as a small car — but it can still run at 55 km an hour. Yellowstone's bison have lived here since before there were roads, or countries.",
               tip: "Bison look calm but they charge. Stay far back and zoom in. The steam from their breath on a cold morning is a great shot." },
  elk:       { name: "Elk", emoji: "🦌", kind: "animal", when: "any", rare: 1, size: 1.5,
               fact: "Big deer with antlers as wide as your arms can stretch. Every spring the males drop their antlers and grow new ones in only a few months. In autumn they make a whistling call called a bugle.",
               tip: "Antlers against the sky look amazing." },
  grizzly:   { name: "Grizzly bear", emoji: "🐻", kind: "animal", when: "dawn", rare: 2, size: 1.3,
               fact: "The big hump on its shoulders is pure muscle for digging. Grizzlies sleep in a den for about five months every winter without eating, drinking or going to the toilet.",
               tip: "Grizzlies dig for roots in the meadows at dawn. Keep 100 metres away — use the zoom." },
  eagle:     { name: "Bald eagle", emoji: "🦅", kind: "bird", when: "day", rare: 2, size: 0.9,
               fact: "It isn't bald — it has white feathers on its head. Its wings stretch two metres and its eyes are four times sharper than yours: it can spot a fish from a kilometre up.",
               tip: "Eagles perch in the tallest dead trees by the river. Zoom in on the white head." },
  geyser:    { name: "Old Faithful erupting", emoji: "⛲", kind: "moment", when: "any", rare: 2, size: 40,
               fact: "Every 90 minutes or so, Old Faithful shoots boiling water up to 55 metres into the air — as high as a 15-storey building. Yellowstone has over 500 geysers, more than the whole rest of the world.",
               tip: "The eruption only lasts a couple of minutes. Stand ready, and shoot when the water is highest." },

  /* --- Antarctica --- */
  emperor:   { name: "Emperor penguin", emoji: "🐧", kind: "animal", when: "any", rare: 1, size: 1.1,
               fact: "The tallest penguin — as tall as a six-year-old. The dads stand through the whole dark winter at minus 60 degrees with an egg balanced on their feet, and they can dive 500 metres deep.",
               tip: "Lie on the ice and shoot at penguin eye level — they'll waddle right over to see what you are." },
  seal:      { name: "Weddell seal", emoji: "🦭", kind: "animal", when: "any", rare: 1, size: 2.5,
               fact: "It lives further south than any other mammal. It can hold its breath for 80 minutes and dive 600 metres down, and it keeps its breathing holes open by chewing the ice with its teeth.",
               tip: "Seals lie on the ice like big sausages. Get close — they hardly ever move." },
  humpback:  { name: "Humpback whale", emoji: "🐋", kind: "swimmer", when: "any", rare: 3, size: 14,
               fact: "As long as a bus, and it can jump right out of the sea — that's called breaching. Humpbacks sing songs that last for hours, and swim 8,000 km every year to reach Antarctica's krill.",
               tip: "Watch the water for a blow of spray, then be ready: the jump comes seconds later." },
  iceberg:   { name: "Iceberg", emoji: "🧊", kind: "landmark", when: "any", rare: 1, size: 30,
               fact: "Only a tenth of an iceberg shows above the water — nine tenths is hidden underneath. Some Antarctic icebergs are bigger than whole countries, and the ice inside can be 100,000 years old.",
               tip: "Blue ice glows best in cloudy light. Try a low angle from the shore." }
};

/* -------------- explorers & difficulty tiers -------------- */
/* Little: any picture with the animal in it scores. Explorer: real
   photo scoring and grid-map treasure clues. Pro: the animals are shyer,
   the clues are compass bearings, and the map asks for coordinates.    */
const EXPLORERS = [
  { id: "cory",    name: "Cory",    emoji: "🧭", tier: "explorer" },
  { id: "jeannie", name: "Jeannie", emoji: "📓", tier: "explorer" },
  { id: "ellie",   name: "Ellie",   emoji: "🌸", tier: "little" },
  { id: "shannon", name: "Shannon", emoji: "📷", tier: "pro" },
  { id: "tristan", name: "Tristan", emoji: "🎒", tier: "pro" },
  { id: "guest",   name: "Guest",   emoji: "🧢", tier: "explorer" }
];

const TIERS = {
  little:   { name: "Little Explorer", passStars: 1, shy: 0.6, gates: false },
  explorer: { name: "Explorer",        passStars: 3, shy: 1.0, gates: true  },
  pro:      { name: "Pro",             passStars: 4, shy: 1.4, gates: true  }
};

/* ranks by total stars — the "career ladder" */
const RANKS = [
  [0,   "Camp Helper",          "🎒"],
  [5,   "Junior Explorer",      "🧢"],
  [12,  "Field Photographer",   "📷"],
  [22,  "Expedition Leader",    "🧭"],
  [34,  "Wildlife Photographer","🦁"],
  [48,  "World Explorer",       "🌍"],
  [64,  "Legend of the Lens",   "🏆"]
];

const PHOTO_SUBJECT_ORDER = Object.keys(SUBJECTS);
