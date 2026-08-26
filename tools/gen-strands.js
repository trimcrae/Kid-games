/* Generate Strands puzzles via a boustrophedon (snake) tiling.
   Letters of the words are laid in serpentine order across a W-wide
   grid: row0 L->R, row1 R->L, row2 L->R ... Every contiguous segment
   of that path is a valid 8-adjacent, non-repeating word path, and
   the words partition all cells. So the tiling is always valid. */

function build(width, words) {
  const letters = words.map(w => w.word.toUpperCase()).join("");
  const total = letters.length;
  if (!width) {
    // auto-pick a width that divides the total, preferring 5, then 6, 7, 4
    for (const w of [5, 6, 7, 4]) { if (total % w === 0) { width = w; break; } }
    if (!width) throw new Error(`no good width for total ${total}: ${words.map(w => w.word)}`);
  }
  if (total % width !== 0) throw new Error(`total ${total} not divisible by width ${width} for ${words.map(w=>w.word)}`);
  const height = total / width;

  // serpentine cell order
  const order = [];
  for (let r = 0; r < height; r++) {
    if (r % 2 === 0) for (let c = 0; c < width; c++) order.push([r, c]);
    else for (let c = width - 1; c >= 0; c--) order.push([r, c]);
  }

  // grid
  const grid = Array.from({ length: height }, () => new Array(width).fill(""));
  for (let i = 0; i < total; i++) {
    const [r, c] = order[i];
    grid[r][c] = letters[i];
  }

  // each word's path
  const out = [];
  let idx = 0;
  for (const w of words) {
    const path = [];
    for (let k = 0; k < w.word.length; k++) path.push(order[idx + k]);
    out.push({ word: w.word.toUpperCase(), spangram: !!w.spangram, path });
    idx += w.word.length;
  }

  // sanity: 8-adjacency + full cover + letters match
  const seen = new Set();
  for (const wd of out) {
    for (let k = 0; k < wd.path.length; k++) {
      const [r, c] = wd.path[k];
      const key = r + "," + c;
      if (seen.has(key)) throw new Error("cell reused " + key);
      seen.add(key);
      if (grid[r][c] !== wd.word[k]) throw new Error("letter mismatch " + wd.word);
      if (k > 0) {
        const [pr, pc] = wd.path[k - 1];
        if (Math.max(Math.abs(pr - r), Math.abs(pc - c)) !== 1) throw new Error("not adjacent in " + wd.word);
      }
    }
  }
  if (seen.size !== total) throw new Error("not all cells covered");

  return { width, height, grid: grid.map(row => row.join("")), words: out };
}

/* ---------------------------------------------------------------
   Keep this list in sync with the game's data, and ALWAYS ADD NEW
   THEMES AT THE END: each game saves a kid's progress by puzzle
   INDEX, so re-ordering (or re-generating an existing puzzle into
   a different grid) would attach their progress to the wrong
   puzzle. Appending is always safe.

   Each puzzle carries:
     tier  1 = Easy, 2 = Medium, 3 = Tricky (drives the picker filter)
     defs  WORD -> one-line kid definition, shown when the word is
           found and used as the first (vocabulary) hint.  EVERY word
           needs one; the checks below fail the build otherwise.
   --------------------------------------------------------------- */
const PUZZLES = [
  {
    name: "Minecraft World", emoji: "🟩", width: 6, tier: 2,
    clue: "Blocky adventures, mobs & loot!",
    words: [
      { word: "MINECRAFT", spangram: true },
      { word: "CREEPER" }, { word: "DIAMOND" }, { word: "ZOMBIE" },
      { word: "SWORD" }, { word: "TORCH" }, { word: "TNT" },
    ],
    defs: {
      MINECRAFT: "A game where the whole world is made of blocks you can mine and build with.",
      CREEPER: "A green mob that sneaks up quietly, then hisses and explodes.",
      DIAMOND: "A rare, super-hard gem — deep underground, and the best gear is made of it.",
      ZOMBIE: "An undead mob that shuffles about at night and burns in the sunlight.",
      SWORD: "A long sharp blade you swing — a weapon, not a tool.",
      TORCH: "A stick with fire on top that gives off light so mobs can't spawn.",
      TNT: "Short for 'trinitrotoluene' — an explosive. Light it and run!",
    },
  },
  {
    name: "Frozen Friends", emoji: "❄️", width: 5, tier: 1,
    clue: "The snowy kingdom of Arendelle.",
    words: [
      { word: "FROZEN", spangram: true },
      { word: "KRISTOFF" }, { word: "ELSA" }, { word: "ANNA" },
      { word: "OLAF" }, { word: "SVEN" },
    ],
    defs: {
      FROZEN: "Turned to ice by the cold. Water freezes at 0 degrees Celsius.",
      KRISTOFF: "The ice harvester who sells ice — and talks for his reindeer.",
      ELSA: "The older sister and queen, whose magic turns things to ice and snow.",
      ANNA: "The brave younger sister who goes looking for Elsa.",
      OLAF: "The snowman who dreams of summer. Snow is frozen water crystals.",
      SVEN: "Kristoff's reindeer. Real reindeer live where it snows, up near the Arctic.",
    },
  },
  {
    name: "Under the Sea", emoji: "🌊", width: 5, tier: 1,
    clue: "Animals that swim in the ocean.",
    words: [
      { word: "OCEAN", spangram: true },
      { word: "DOLPHIN" }, { word: "OCTOPUS" }, { word: "WHALE" },
      { word: "SHARK" }, { word: "TURTLE" },
    ],
    defs: {
      OCEAN: "A huge body of salt water. Oceans cover about 7 out of every 10 parts of Earth.",
      DOLPHIN: "A clever mammal that breathes air through a blowhole and clicks to 'see' sound.",
      OCTOPUS: "Eight arms, three hearts, blue blood — and it can change colour to hide.",
      WHALE: "The biggest animal on Earth. A blue whale is longer than three buses.",
      SHARK: "A fish with a skeleton made of bendy cartilage instead of bone.",
      TURTLE: "A reptile in a shell. Sea turtles come ashore only to lay their eggs.",
    },
  },
  {
    name: "The Heeler Family", emoji: "🐶", width: 5, tier: 1,
    clue: "Bluey's family and friends.",
    words: [
      { word: "HEELERS", spangram: true },
      { word: "BANDIT" }, { word: "CHILLI" }, { word: "MUFFIN" },
      { word: "BLUEY" }, { word: "BINGO" },
    ],
    defs: {
      HEELERS: "The family's surname — and a real dog breed, the Australian cattle dog.",
      BANDIT: "Bluey's dad, an archaeologist — someone who digs up things from the past.",
      CHILLI: "Bluey's mum, who works at airport security.",
      MUFFIN: "The loud little cousin. A muffin is also a small cake you bake in a tin.",
      BLUEY: "The six-year-old blue heeler who invents a new game every day.",
      BINGO: "Bluey's little sister — and a game where you match numbers on a card.",
    },
  },
  {
    name: "Gotta Catch 'Em", emoji: "⚡", tier: 2, clue: "Pokémon to catch and train.",
    words: [
      { word: "POKEMON", spangram: true },
      { word: "PIKACHU" }, { word: "BULBASAUR" }, { word: "EEVEE" },
      { word: "SNORLAX" },
    ],
    defs: {
      POKEMON: "Short for 'pocket monsters' — creatures you catch, train and battle.",
      PIKACHU: "The yellow electric mouse. Electricity is moving electric charge.",
      BULBASAUR: "Grass and poison type, with a plant bulb growing on its back.",
      EEVEE: "It can evolve into eight different Pokémon — more than any other.",
      SNORLAX: "A giant that sleeps almost all day and blocks the road while it does.",
    },
  },
  {
    name: "Gabby's Cats", emoji: "🐱", tier: 1, clue: "Kitties from Gabby's Dollhouse.",
    words: [
      { word: "GABBY", spangram: true },
      { word: "PANDY" }, { word: "CAKEY" }, { word: "KITTY" },
      { word: "PURRS" }, { word: "MEOWS" },
    ],
    defs: {
      GABBY: "The girl who shrinks down and visits the cats inside her dollhouse.",
      PANDY: "Pandy Paws — half cat, half panda, and Gabby's best friend.",
      CAKEY: "The cat who is a cupcake and loves to bake.",
      KITTY: "A baby cat. Kittens are born with their eyes shut for about nine days.",
      PURRS: "The rumbling sound a happy cat makes in its throat.",
      MEOWS: "Cats mostly meow at people, hardly ever at other cats!",
    },
  },
  {
    name: "Sweet Treats", emoji: "🍩", tier: 1, clue: "Yummy desserts and snacks.",
    words: [
      { word: "SWEETS", spangram: true },
      { word: "DONUT" }, { word: "CANDY" }, { word: "JELLY" },
      { word: "FUDGE" }, { word: "CAKE" },
    ],
    defs: {
      SWEETS: "Sugary treats. Sugar gives you fast energy — that's why it tastes so good.",
      DONUT: "A ring of fried dough. The hole helps the middle cook through.",
      CANDY: "Boiled sugar, cooled hard. In Australia it's called a lolly.",
      JELLY: "A wobbly dessert set with gelatine, which traps water in a mesh.",
      FUDGE: "Sugar, butter and milk cooked and beaten until it turns soft and creamy.",
      CAKE: "Batter puffed up by baking powder making tiny bubbles of gas.",
    },
  },
  {
    name: "Blast Off!", emoji: "🚀", tier: 2, clue: "Things you'd find in outer space.",
    words: [
      { word: "SPACE", spangram: true },
      { word: "PLANET" }, { word: "ROCKET" }, { word: "COMET" },
      { word: "MOON" }, { word: "STAR" },
    ],
    defs: {
      SPACE: "The almost-empty vacuum beyond Earth's air. No air means no sound out there.",
      PLANET: "A big round world that orbits a star. Ours is the third one from the Sun.",
      ROCKET: "It flies by throwing gas out the back — push one way, go the other.",
      COMET: "A ball of ice and dust that grows a glowing tail near the Sun.",
      MOON: "A world that orbits a planet. Ours controls the ocean tides.",
      STAR: "A giant ball of burning gas. The Sun is our nearest star.",
    },
  },
  {
    name: "Taekwondo!", emoji: "🥋", tier: 2, clue: "Kicks, belts and respect.",
    words: [
      { word: "TAEKWONDO", spangram: true },
      { word: "KICK" }, { word: "PUNCH" }, { word: "BELT" },
      { word: "BLOCK" }, { word: "BOW" },
    ],
    defs: {
      TAEKWONDO: "Korean for 'the way of the foot and fist' — a martial art of high kicks.",
      KICK: "A strike with the foot. Taekwondo is famous for its jumping kicks.",
      PUNCH: "A straight strike with the front two knuckles of your fist.",
      BELT: "Its colour shows your rank — white first, black after years of practice.",
      BLOCK: "Moving your arm to stop an attack before it lands.",
      BOW: "Bending forward to show respect, before and after every match.",
    },
  },
  {
    name: "Princess Party", emoji: "👸", width: 5, tier: 1, clue: "Everything a royal princess needs.",
    words: [
      { word: "PRINCESS", spangram: true },
      { word: "CROWN" }, { word: "DRESS" }, { word: "CASTLE" },
      { word: "TIARA" }, { word: "PALACE" },
    ],
    defs: {
      PRINCESS: "The daughter of a king or queen.",
      CROWN: "The heavy jewelled hat a ruler wears. 'To crown' means to make someone king.",
      DRESS: "A one-piece outfit. A ballgown is a dress with a huge sweeping skirt.",
      CASTLE: "A stone fortress built to be defended, with thick walls and a moat.",
      TIARA: "A small half-crown worn in the hair. The word is Ancient Greek.",
      PALACE: "A grand house a royal family lives in — comfy, not built for battle.",
    },
  },
  {
    name: "Dino Dig", emoji: "🦖", width: 6, tier: 2, clue: "Prehistoric giants and their bones.",
    words: [
      { word: "DINOSAUR", spangram: true },
      { word: "TREX" }, { word: "RAPTOR" }, { word: "FOSSIL" },
      { word: "BONES" }, { word: "ROAR" }, { word: "EGG" },
    ],
    defs: {
      DINOSAUR: "Greek for 'terrible lizard'. They ruled Earth for over 150 million years.",
      TREX: "Tyrannosaurus rex — teeth as long as bananas and tiny two-fingered arms.",
      RAPTOR: "A fast, feathered hunter with one huge sickle claw on each foot.",
      FOSSIL: "Bone slowly turned to stone in the ground — how we know dinosaurs existed.",
      BONES: "The hard frame inside you. Fossil bones are what palaeontologists dig up.",
      ROAR: "A deep loud call. Nobody really knows what noise dinosaurs made!",
      EGG: "Dinosaurs hatched from eggs, just like their living relatives — birds.",
    },
  },
  {
    name: "On the Farm", emoji: "🚜", width: 5, tier: 1, clue: "Animals in the barnyard.",
    words: [
      { word: "BARNYARD", spangram: true },
      { word: "HORSE" }, { word: "SHEEP" }, { word: "GOAT" },
      { word: "DUCK" }, { word: "PIG" }, { word: "COW" }, { word: "HEN" },
    ],
    defs: {
      BARNYARD: "The fenced yard around the barn where the farm animals wander.",
      HORSE: "It sleeps standing up and can gallop within hours of being born.",
      SHEEP: "Grown for wool. One sheep can grow a whole jumper's worth in a year.",
      GOAT: "A nimble climber with rectangular pupils, so it can see nearly all around.",
      DUCK: "A water bird with oily feathers, so the water rolls straight off.",
      PIG: "Very clever — cleverer than a dog — and it rolls in mud to keep cool.",
      COW: "It chews its food twice: swallows, brings it back up, and chews the cud.",
      HEN: "A female chicken. She lays about 300 eggs a year.",
    },
  },
  {
    name: "Book Nook", emoji: "📚", width: 5, tier: 1, clue: "Curl up with a good story.",
    words: [
      { word: "READING", spangram: true },
      { word: "STORY" }, { word: "PAGES" }, { word: "BOOKS" },
      { word: "HERO" }, { word: "PLOT" },
    ],
    defs: {
      READING: "Turning marks on a page into words and pictures inside your head.",
      STORY: "A telling of what happened — with a beginning, a middle and an end.",
      PAGES: "The leaves of a book. Each sheet of paper makes two pages.",
      BOOKS: "Pages bound together. The oldest ones were hand-copied by monks.",
      HERO: "The main character, the one whose problem the story is about.",
      PLOT: "The chain of events in a story — what happens, and why it happens.",
    },
  },
  {
    name: "Math Magic", emoji: "➗", width: 5, tier: 2, clue: "Things you do in math class.",
    words: [
      { word: "NUMBERS", spangram: true },
      { word: "PLUS" }, { word: "MINUS" }, { word: "COUNT" }, { word: "MATH" },
    ],
    defs: {
      NUMBERS: "Symbols for how many. Zero was invented last — it took thousands of years.",
      PLUS: "The + sign: add these together and say how many there are altogether.",
      MINUS: "The - sign: take away, and say how many are left.",
      COUNT: "Saying the numbers in order, one for each thing, to find how many.",
      MATH: "The study of numbers, shapes and patterns — short for mathematics.",
    },
  },
  {
    name: "Music Lab", emoji: "🎹", width: 5, tier: 2, clue: "Instruments and the sounds they make.",
    words: [
      { word: "MUSIC", spangram: true },
      { word: "PIANO" }, { word: "DRUMS" }, { word: "NOTES" },
      { word: "FLUTE" }, { word: "SONGS" }, { word: "BEATS" },
    ],
    defs: {
      MUSIC: "Sound arranged in patterns of pitch and rhythm on purpose.",
      PIANO: "88 keys, each swinging a little hammer at a tight string.",
      DRUMS: "You hit a stretched skin and it vibrates — the oldest instrument there is.",
      NOTES: "Single sounds of one pitch. Written down, they tell you what to play.",
      FLUTE: "You blow across a hole; the air inside the tube wobbles and sings.",
      SONGS: "Music with words to sing. A tune plus lyrics.",
      BEATS: "The steady pulse you clap or tap your foot along to.",
    },
  },
  {
    name: "Seven Continents", emoji: "🌍", width: 5, tier: 2, clue: "The big pieces of land on Earth.",
    words: [
      { word: "CONTINENT", spangram: true },
      { word: "AFRICA" }, { word: "EUROPE" }, { word: "ASIA" }, { word: "OCEAN" },
    ],
    defs: {
      CONTINENT: "One of Earth's seven great landmasses. Australia is the smallest.",
      AFRICA: "The second-biggest continent, home to the Sahara and the Nile.",
      EUROPE: "A small continent joined to Asia, packed with about 44 countries.",
      ASIA: "The biggest continent, with more people than all the others put together.",
      OCEAN: "Careful — not a continent! It's the salt water in between them.",
    },
  },
  {
    name: "Fifty States", emoji: "🗺️", width: 5, tier: 3, clue: "States of the USA.",
    words: [
      { word: "STATES", spangram: true },
      { word: "ALASKA" }, { word: "FLORIDA" }, { word: "TEXAS" },
      { word: "NEVADA" }, { word: "IDAHO" },
    ],
    defs: {
      STATES: "The USA is 50 states, each with its own laws, capital and flag.",
      ALASKA: "The biggest state, up in the far north-west — and the coldest.",
      FLORIDA: "The long peninsula in the south-east, poking into warm sea.",
      TEXAS: "The second-biggest state, on the southern border with Mexico.",
      NEVADA: "A desert state. Its name is Spanish for 'snow-capped'.",
      IDAHO: "A mountain state famous for growing potatoes.",
    },
  },
  {
    name: "My Body", emoji: "🫀", width: 6, tier: 2, clue: "Parts of you, inside and out.",
    words: [
      { word: "MYBODY", spangram: true },
      { word: "HEART" }, { word: "BRAIN" }, { word: "LUNGS" },
      { word: "BONES" }, { word: "TEETH" }, { word: "ELBOW" },
    ],
    defs: {
      MYBODY: "Every part of you — about 37 trillion tiny cells working together.",
      HEART: "The muscle that pumps your blood. It beats around 100,000 times a day.",
      BRAIN: "Your control centre. It uses a fifth of all the energy you eat.",
      LUNGS: "Two spongy bags that swap the oxygen in for the carbon dioxide out.",
      BONES: "You were born with about 300; some fuse, so grown-ups have 206.",
      TEETH: "Enamel, the coating on teeth, is the hardest stuff in your whole body.",
      ELBOW: "The hinge joint in the middle of your arm — it bends only one way.",
    },
  },

  /* ---- appended 2026: teaching hunts, easy -> tricky ---- */

  {
    name: "Rhyme Time", emoji: "🐈", width: 5, tier: 1,
    clue: "Every word ends in -AT. Say them out loud!",
    words: [
      { word: "RHYME", spangram: true },
      { word: "CAT" }, { word: "HAT" }, { word: "BAT" }, { word: "MAT" }, { word: "RAT" },
    ],
    defs: {
      RHYME: "Words that end with the same sound. Swap the first letter and you get a new one!",
      CAT: "C-A-T. A furry pet that purrs.",
      HAT: "H-A-T. You wear it on your head.",
      BAT: "B-A-T. A flying animal — or the stick you hit a ball with.",
      MAT: "M-A-T. A flat rug you wipe your feet on.",
      RAT: "R-A-T. A long-tailed animal, bigger than a mouse.",
    },
  },
  {
    name: "Colours Everywhere", emoji: "🌈", width: 7, tier: 1,
    clue: "Every colour of the rainbow and more.",
    words: [
      { word: "COLOURS", spangram: true },
      { word: "PINK" }, { word: "BLUE" }, { word: "GREEN" },
      { word: "PURPLE" }, { word: "ORANGE" }, { word: "RED" },
    ],
    defs: {
      COLOURS: "What your eyes see when different light bounces off a thing.",
      PINK: "Red mixed with white. It is the only colour with no place in the rainbow.",
      BLUE: "The colour of the sky, because air scatters blue light the most.",
      GREEN: "Blue and yellow mixed. Leaves are green because of chlorophyll.",
      PURPLE: "Red and blue mixed. Long ago it was so costly only kings wore it.",
      ORANGE: "Red and yellow mixed. The fruit got the name first, then the colour!",
      RED: "The colour of blood and of the light that bends the least in a rainbow.",
    },
  },
  {
    name: "Weather Watch", emoji: "⛈️", width: 5, tier: 2,
    clue: "What the sky is doing today.",
    words: [
      { word: "WEATHER", spangram: true },
      { word: "THUNDER" }, { word: "CLOUDS" }, { word: "RAINBOW" },
      { word: "STORM" }, { word: "FOG" },
    ],
    defs: {
      WEATHER: "What the air outside is doing right now — hot, wet, windy or still.",
      THUNDER: "The bang of air blasted apart by lightning. Light is faster, so you see it first.",
      CLOUDS: "Millions of tiny water droplets floating together, high in the cold air.",
      RAINBOW: "Raindrops split sunlight into its colours. Stand with the Sun behind you.",
      STORM: "Wild weather all at once: heavy rain, strong wind, thunder and lightning.",
      FOG: "A cloud sitting on the ground, which is why you cannot see very far.",
    },
  },
  {
    name: "Shapes & Solids", emoji: "🔷", width: 5, tier: 2,
    clue: "Flat shapes and solid ones. How many sides?",
    words: [
      { word: "SHAPES", spangram: true },
      { word: "TRIANGLE" }, { word: "CIRCLE" }, { word: "SQUARE" },
      { word: "PRISM" }, { word: "CUBE" },
    ],
    defs: {
      SHAPES: "Flat shapes are 2D — length and width. Solids are 3D and take up space.",
      TRIANGLE: "Three straight sides, three corners. The strongest shape for building.",
      CIRCLE: "Every point exactly the same distance from the middle. No corners at all.",
      SQUARE: "Four equal sides and four right angles — corners of exactly 90 degrees.",
      PRISM: "A solid with the same shape at both ends. A glass one splits light.",
      CUBE: "A solid with 6 square faces, 12 edges and 8 corners. A dice is a cube.",
    },
  },
  {
    name: "Butterfly Life Cycle", emoji: "🦋", width: 5, tier: 2,
    clue: "How a caterpillar turns into a butterfly.",
    words: [
      { word: "BUTTERFLY", spangram: true },
      { word: "EGG" }, { word: "LARVA" }, { word: "CHRYSALIS" },
      { word: "PUPA" }, { word: "WINGS" },
    ],
    defs: {
      BUTTERFLY: "Stage 4, the adult. It tastes with its feet and drinks through a straw.",
      EGG: "Stage 1. Mum lays it on the exact leaf her babies are able to eat.",
      LARVA: "Stage 2, the caterpillar. Its only job is eating and growing.",
      CHRYSALIS: "The hard case a butterfly pupa makes. Moths spin a silk cocoon instead.",
      PUPA: "Stage 3. Inside, the caterpillar melts down and rebuilds into a butterfly.",
      WINGS: "Covered in tiny overlapping scales — that is the dust on your fingers.",
    },
  },
  {
    name: "Five Oceans", emoji: "🐋", width: 5, tier: 2,
    clue: "Name all five oceans of the world.",
    words: [
      { word: "OCEAN", spangram: true },
      { word: "PACIFIC" }, { word: "ATLANTIC" }, { word: "INDIAN" },
      { word: "ARCTIC" }, { word: "SOUTHERN" },
    ],
    defs: {
      OCEAN: "There are five, and really they are all one big connected body of salt water.",
      PACIFIC: "The biggest and deepest. It is wider than all the land on Earth.",
      ATLANTIC: "The second biggest, between the Americas and Europe and Africa.",
      INDIAN: "The warmest ocean, south of Asia and west of Australia.",
      ARCTIC: "The smallest and coldest, at the North Pole, capped with floating sea ice.",
      SOUTHERN: "The newest name — the ring of stormy water all the way round Antarctica.",
    },
  },
  {
    name: "Redstone Logic", emoji: "🔴", width: 5, tier: 3,
    clue: "Minecraft circuits — power in, machine out.",
    words: [
      { word: "REDSTONE", spangram: true },
      { word: "PISTON" }, { word: "HOPPER" }, { word: "LEVER" },
      { word: "OBSERVER" }, { word: "DROPPER" },
    ],
    defs: {
      REDSTONE: "Minecraft's electricity. Dust carries a signal 15 blocks, then it fades.",
      PISTON: "Powered, it shoves a block forward. A sticky one pulls the block back too.",
      HOPPER: "Sucks items in from above and passes them along — a conveyor belt.",
      LEVER: "A switch that stays on until you flip it. A button turns itself off again.",
      OBSERVER: "Watches the block in front and sends a pulse the moment it changes.",
      DROPPER: "Fires one item out each time it is pulsed. A dispenser uses the item instead.",
    },
  },
  {
    name: "Ancient Egypt", emoji: "🔺", width: 6, tier: 3,
    clue: "Pharaohs, pyramids and the great river.",
    words: [
      { word: "EGYPT", spangram: true },
      { word: "PYRAMID" }, { word: "PHARAOH" }, { word: "MUMMY" },
      { word: "SPHINX" }, { word: "NILE" }, { word: "TOMB" }, { word: "GOLD" },
    ],
    defs: {
      EGYPT: "A country in north-east Africa with a civilisation over 5,000 years old.",
      PYRAMID: "A giant stone tomb with a square base and four triangle sides meeting at a point.",
      PHARAOH: "The ruler of Egypt, believed to be a living god. Cleopatra was the last.",
      MUMMY: "A body dried with salt and wrapped in linen so it would last forever.",
      SPHINX: "A stone guardian with a lion's body and a human head.",
      NILE: "The great river whose yearly flood left mud that made the desert farmable.",
      TOMB: "A room built for the dead. Tutankhamun's was found almost untouched in 1922.",
      GOLD: "A metal that never rusts or tarnishes — which is why it means 'forever'.",
    },
  },
  {
    name: "Greek Myths", emoji: "⚡", width: 5, tier: 3,
    clue: "Gods, monsters and heroes of Ancient Greece.",
    words: [
      { word: "MYTHS", spangram: true },
      { word: "ZEUS" }, { word: "ATHENA" }, { word: "MEDUSA" },
      { word: "PEGASUS" }, { word: "OLYMPUS" },
    ],
    defs: {
      MYTHS: "Very old stories a people told to explain the world and its wonders.",
      ZEUS: "King of the gods, who ruled the sky and threw thunderbolts.",
      ATHENA: "Goddess of wisdom and battle strategy. Athens is named after her.",
      MEDUSA: "A monster with snakes for hair; one look turned you to stone.",
      PEGASUS: "The white winged horse. There is a constellation named after him.",
      OLYMPUS: "Greece's highest mountain, where the twelve great gods were said to live.",
    },
  },
];

/* ---------- build + verify ---------- */

// Count every 8-adjacent simple path in the grid that spells `word`.
// The runtime accepts any of them (it matches on LETTERS, then snaps to the
// canonical path), so extras are fine — but a word that cannot be traced at
// all, or a word that is a prefix of another word in the same hunt, is a bug.
function tracePathCount(grid, W, H, word) {
  let n = 0;
  const used = new Set();
  function walk(r, c, k) {
    if (n > 50) return;
    if (k === word.length) { n++; return; }
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= H || nc < 0 || nc >= W) continue;
      const key = nr + "," + nc;
      if (used.has(key) || grid[nr][nc] !== word[k]) continue;
      used.add(key); walk(nr, nc, k + 1); used.delete(key);
    }
  }
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    if (grid[r][c] !== word[0]) continue;
    used.clear(); used.add(r + "," + c); walk(r, c, 1);
  }
  used.clear();
  return n;
}

const problems = [];
const result = PUZZLES.map((p, pi) => {
  const b = build(p.width, p.words);
  const label = `#${pi} ${p.name}`;
  if (!p.tier) problems.push(`${label}: missing tier`);
  if (p.words.filter(w => w.spangram).length !== 1) problems.push(`${label}: needs exactly one spangram`);

  const names = b.words.map(w => w.word);
  names.forEach(w => {
    // the runtime needs >= 3 letters before it will test a selection
    if (w.length < 3) problems.push(`${label}: ${w} is shorter than 3 letters`);
    if (!p.defs || !p.defs[w]) problems.push(`${label}: ${w} has no definition`);
    if (tracePathCount(b.grid, b.width, b.height, w) < 1) problems.push(`${label}: ${w} is not traceable!`);
    // a word that is a prefix of a longer one in the same hunt confuses
    // the runtime's tap-by-tap matcher, which waits for the longer word
    names.forEach(o => {
      if (o !== w && o.length > w.length && o.indexOf(w) === 0 && names.indexOf(w) < names.indexOf(o))
        problems.push(`${label}: ${w} is a prefix of ${o}`);
    });
  });
  Object.keys(p.defs || {}).forEach(k => {
    if (names.indexOf(k) === -1) problems.push(`${label}: stray definition for ${k}`);
  });

  return {
    name: p.name, emoji: p.emoji, clue: p.clue, tier: p.tier,
    width: b.width, height: b.height,
    grid: b.grid,
    words: b.words.map(w => ({ word: w.word, spangram: w.spangram, path: w.path, def: p.defs[w.word] })),
  };
});

if (problems.length) {
  problems.forEach(m => console.error("PROBLEM  " + m));
  console.error(`\n${problems.length} problem(s) — not printing puzzle data.`);
  process.exit(1);
}

console.log(JSON.stringify(result, null, 0));
console.error("OK — generated " + result.length + " puzzles, all grids full & every word traceable");
result.forEach((r, i) => console.error(
  `  #${i} ${r.name}: ${r.width}x${r.height} = ${r.width * r.height} cells, ${r.words.length} words, tier ${r.tier}`));
