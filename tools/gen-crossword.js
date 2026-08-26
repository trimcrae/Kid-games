/* Offline crossword compiler. Feed each theme a list of {answer, clue};
   greedily place words so they interlock (crossings only, no illegal
   adjacency). Output a normalized grid + numbered across/down entries.
   Deterministic (no randomness) so output is stable. */

/* place a given ordered list of words; multi-pass so words that can't
   cross anything yet get retried after more words land. Returns
   {grid, placed, unplaced}. */
function layout(orderedWords) {
  const grid = new Map();          // "r,c" -> letter
  const placed = [];               // {answer, clue, cells:[{r,c}], dir}
  const key = (r, c) => r + "," + c;
  const get = (r, c) => grid.get(key(r, c));

  function cellsFor(word, r0, c0, dir) {
    const cells = [];
    for (let i = 0; i < word.length; i++) {
      cells.push(dir === "across" ? { r: r0, c: c0 + i } : { r: r0 + i, c: c0 });
    }
    return cells;
  }

  function valid(word, r0, c0, dir) {
    const cells = cellsFor(word, r0, c0, dir);
    let crossings = 0;
    // cell just before start and just after end must be empty
    const before = dir === "across" ? { r: r0, c: c0 - 1 } : { r: r0 - 1, c: c0 };
    const afterCell = cells[cells.length - 1];
    const after = dir === "across" ? { r: afterCell.r, c: afterCell.c + 1 } : { r: afterCell.r + 1, c: afterCell.c };
    if (get(before.r, before.c)) return null;
    if (get(after.r, after.c)) return null;

    for (let i = 0; i < cells.length; i++) {
      const { r, c } = cells[i];
      const existing = get(r, c);
      if (existing) {
        if (existing !== word[i]) return null;     // conflict
        crossings++;
      } else {
        // perpendicular neighbours of a NON-crossing cell must be empty
        const n1 = dir === "across" ? get(r - 1, c) : get(r, c - 1);
        const n2 = dir === "across" ? get(r + 1, c) : get(r, c + 1);
        if (n1 || n2) return null;
      }
    }
    return { cells, crossings };
  }

  function apply(word, clue, r0, c0, dir, cells) {
    cells.forEach((cell, i) => grid.set(key(cell.r, cell.c), word[i]));
    placed.push({ answer: word, clue, cells, dir });
  }

  function tryPlace(item) {
    const word = item.answer;
    let best = null;
    for (const [k, L] of grid) {
      const [r, c] = k.split(",").map(Number);
      for (let i = 0; i < word.length; i++) {
        if (word[i] !== L) continue;
        for (const dir of ["down", "across"]) {
          const r0 = dir === "down" ? r - i : r;
          const c0 = dir === "across" ? c - i : c;
          const v = valid(word, r0, c0, dir);
          if (!v || v.crossings < 1) continue;
          const score = v.crossings * 100 - (Math.abs(r0) + Math.abs(c0));
          if (!best || score > best.score) best = { r0, c0, dir, cells: v.cells, score };
        }
      }
    }
    if (best) { apply(word, item.clue, best.r0, best.c0, best.dir, best.cells); return true; }
    return false;
  }

  // seed with the first word, then multi-pass over the rest until no progress
  apply(orderedWords[0].answer, orderedWords[0].clue, 0, 0, "across",
        cellsFor(orderedWords[0].answer, 0, 0, "across"));
  let remaining = orderedWords.slice(1);
  let progress = true;
  while (progress && remaining.length) {
    progress = false;
    const still = [];
    for (const item of remaining) {
      if (tryPlace(item)) progress = true; else still.push(item);
    }
    remaining = still;
  }
  return { grid, placed, unplaced: remaining.map(w => w.answer) };
}

function normalize(theme, placed, grid) {
  const key = (r, c) => r + "," + c;
  // normalize coordinates to start at 0,0
  let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
  for (const k of grid.keys()) {
    const [r, c] = k.split(",").map(Number);
    minR = Math.min(minR, r); minC = Math.min(minC, c);
    maxR = Math.max(maxR, r); maxC = Math.max(maxC, c);
  }
  const rows = maxR - minR + 1, cols = maxC - minC + 1;
  const cells = Array.from({ length: rows }, () => new Array(cols).fill(null));
  for (const [k, L] of grid) {
    const [r, c] = k.split(",").map(Number);
    cells[r - minR][c - minC] = L;
  }

  // numbering
  const numAt = {};
  let num = 0;
  const startsAcross = (r, c) => cells[r][c] && (c === 0 || !cells[r][c - 1]) && (c + 1 < cols && cells[r][c + 1]);
  const startsDown = (r, c) => cells[r][c] && (r === 0 || !cells[r - 1][c]) && (r + 1 < rows && cells[r + 1][c]);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (startsAcross(r, c) || startsDown(r, c)) { num++; numAt[r + "," + c] = num; }
  }

  // the optional "teach" tip travels with the answer word
  const teachOf = {};
  (theme.words || []).forEach(w => {
    teachOf[w.answer.toUpperCase().replace(/[^A-Z]/g, "")] = w.teach || "";
  });

  // entries with their numbers (match placed words by normalized start + dir)
  const entries = placed.map(p => {
    const first = p.cells[0];
    const r = first.r - minR, c = first.c - minC;
    return {
      num: numAt[r + "," + c], dir: p.dir, row: r, col: c,
      answer: p.answer, clue: p.clue, teach: teachOf[p.answer] || "",
    };
  }).sort((a, b) => a.num - b.num || (a.dir === "across" ? -1 : 1));

  return {
    name: theme.name, emoji: theme.emoji, blurb: theme.blurb,
    level: theme.level || "medium",
    rows, cols,
    cells,                       // letters or null
    numbers: numAt,              // "r,c" -> number
    entries,
  };
}

/* try every word as the seed; keep the layout that places the most
   words (tie-break: smallest grid area). */
function compile(theme) {
  const base = theme.words.map(w => ({
    answer: w.answer.toUpperCase().replace(/[^A-Z]/g, ""), clue: w.clue,
  }));
  let bestRun = null;
  for (let s = 0; s < base.length; s++) {
    const ordered = [base[s], ...base.filter((_, i) => i !== s).sort((a, b) => b.answer.length - a.answer.length)];
    const run = layout(ordered);
    const area = (() => {
      let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
      for (const k of run.grid.keys()) { const [r, c] = k.split(",").map(Number); minR = Math.min(minR, r); minC = Math.min(minC, c); maxR = Math.max(maxR, r); maxC = Math.max(maxC, c); }
      return (maxR - minR + 1) * (maxC - minC + 1);
    })();
    const placedCount = run.placed.length;
    if (!bestRun || placedCount > bestRun.placedCount || (placedCount === bestRun.placedCount && area < bestRun.area)) {
      bestRun = { run, area, placedCount };
    }
  }
  const norm = normalize(theme, bestRun.run.placed, bestRun.run.grid);
  norm.unplaced = bestRun.run.unplaced;
  return norm;
}

/* ---------------------------------------------------------------
   Keep this list in sync with the game's data, and ALWAYS ADD NEW
   THEMES AT THE END: each game saves a kid's progress by puzzle
   INDEX, so re-ordering (or re-generating an existing puzzle into
   a different grid) would attach their progress to the wrong
   puzzle. Appending is always safe.

   Each word can carry an optional `teach:` line. That's the FIRST
   hint the game gives — a nudge that teaches (a spelling rule, a
   fact, what the word means) instead of just handing over a
   letter. Only if the kid asks again does a letter appear.

   `level:` sorts the picker into tiers:
     easy      — 3-to-5-letter words, plain clues (Ellie & Cory)
     medium    — everyday words, a fact in the clue
     tricky    — longer words + trickier clues (Jeannie)
     grown-up  — a real adult puzzle (Shannon)
   --------------------------------------------------------------- */
const THEMES = [
  {
    name: "Minecraft Mash", emoji: "🟩", blurb: "Blocks, mobs and tools!", level: "medium",
    words: [
      { answer: "CREEPER", clue: "Green mob that goes SSSS… then BOOM!", teach: "Creep + er. Lots of English words add '-er' to a verb to mean 'the one that does it': a creeper creeps." },
      { answer: "DIAMOND", clue: "The shiny blue gem you dig for deep down.", teach: "Real diamonds are the hardest natural thing on Earth — that's why the pickaxe is so good." },
      { answer: "SWORD", clue: "You craft this to fight mobs.", teach: "Five letters, and the W is silent — you say it 'sord'." },
      { answer: "TORCH", clue: "Place this to keep the dark (and mobs) away.", teach: "Ends with the CH sound, like 'lunch' and 'match'." },
      { answer: "ZOMBIE", clue: "Green undead mob that moans at night.", teach: "One of the few English words that starts with Z. It ends in -IE, like 'cookie'." },
      { answer: "PICKAXE", clue: "The tool you mine stone and ore with.", teach: "A compound word: PICK + AXE squashed together into one." },
      { answer: "ENDER", clue: "An ___man teleports when you look at it.", teach: "'Teleport' means to vanish from one place and appear in another." },
    ],
  },
  {
    name: "Bluey Time", emoji: "🐶", blurb: "Play games with the Heeler family!", level: "easy",
    words: [
      { answer: "BLUEY", clue: "The big blue puppy this show is named after.", teach: "Blue + Y. Adding Y to a colour makes a name, like 'Bluey' and 'Ginger'." },
      { answer: "BINGO", clue: "Bluey's little orange sister.", teach: "Five letters, two of them O and I — and it's also the name of a number game." },
      { answer: "BANDIT", clue: "Bluey's dad who loves to play.", teach: "The Heelers are blue heeler dogs, a cattle dog from Australia." },
      { answer: "CHILLI", clue: "Bluey's mum.", teach: "Spelled with double L and an I at the end — same as the spicy red pepper." },
      { answer: "MUFFIN", clue: "Bluey's silly little cousin.", teach: "Double F in the middle, like 'puffin' and 'toffee'." },
      { answer: "DANCE", clue: "Move to music — there's a Bluey ___ mode!", teach: "The C sounds like an S here, because a C before E, I or Y goes soft." },
    ],
  },
  {
    name: "Animal Friends", emoji: "🦁", blurb: "Creatures big and small.", level: "easy",
    words: [
      { answer: "TIGER", clue: "A big orange cat with black stripes.", teach: "Every tiger's stripe pattern is different, like a fingerprint." },
      { answer: "ZEBRA", clue: "A horse-like animal in black and white.", teach: "Starts with Z — the very last letter of the alphabet." },
      { answer: "PANDA", clue: "A bear that munches bamboo.", teach: "A giant panda eats bamboo for about 12 hours a day." },
      { answer: "SNAKE", clue: "A long animal with no legs.", teach: "The 'magic E' on the end makes the A say its own name: snayk." },
      { answer: "EAGLE", clue: "A huge bird with sharp eyes.", teach: "An eagle can spot a rabbit from over a mile away." },
      { answer: "HORSE", clue: "An animal you can ride that says 'neigh'.", teach: "Horses can sleep standing up." },
      { answer: "OTTER", clue: "A playful river animal that floats on its back.", teach: "Sea otters hold hands while they sleep so they don't drift apart." },
    ],
  },
  {
    name: "Frozen Magic", emoji: "❄️", blurb: "Adventures in Arendelle.", level: "easy",
    words: [
      { answer: "ELSA", clue: "The queen with icy magic powers.", teach: "Four letters. It's a short form of the name Elisabeth." },
      { answer: "ANNA", clue: "Elsa's brave younger sister.", teach: "A palindrome — it reads the same forwards and backwards!" },
      { answer: "OLAF", clue: "The happy snowman who loves warm hugs.", teach: "An old Norwegian name — Arendelle is based on Norway." },
      { answer: "SVEN", clue: "Kristoff's reindeer buddy.", teach: "Reindeer are real, and they live in the freezing lands near the North Pole." },
      { answer: "SNOW", clue: "White fluffy stuff Elsa can make.", teach: "Every snowflake has six sides." },
      { answer: "MAGIC", clue: "Elsa's special icy power.", teach: "The G sounds like a J, because a G before E, I or Y usually goes soft." },
      { answer: "WINTER", clue: "The cold, snowy season.", teach: "The four seasons are spring, summer, autumn (fall) and winter." },
    ],
  },
  {
    name: "Book Heroes", emoji: "📚", blurb: "Stars from favourite kids' books.", level: "tricky",
    words: [
      { answer: "GREG", clue: "The main kid in 'Diary of a Wimpy Kid'.", teach: "His full name is Greg Heffley, and he tells the story himself — that's a 'first-person' narrator." },
      { answer: "ROWLEY", clue: "Greg's best friend in the Wimpy Kid books.", teach: "Six letters, ending in -EY, like 'monkey' and 'donkey'." },
      { answer: "CALVIN", clue: "The boy with a stuffed tiger named Hobbes.", teach: "'Calvin and Hobbes' is a comic strip — a story told in little boxes called panels." },
      { answer: "HOBBES", clue: "Calvin's tiger, real to him!", teach: "Double B in the middle. Everyone else sees just a stuffed toy — that's the whole joke." },
      { answer: "NORY", clue: "The wonky-magic hero of 'Upside Down Magic'.", teach: "Nory's magic goes 'wonky' — a word that means crooked or not quite right." },
      { answer: "DOGMAN", clue: "Part dog, part cop, all hero! (one word)", teach: "A compound word: DOG + MAN. The books are graphic novels — stories told in pictures." },
    ],
  },
  {
    name: "Taekwondo Class", emoji: "🥋", blurb: "Kicks, belts and respect!", level: "medium",
    words: [
      { answer: "WHITE", clue: "The belt colour you start with as a beginner.", teach: "White stands for a fresh start — you haven't learned anything yet, and that's fine." },
      { answer: "BELT", clue: "The coloured band tied around your uniform.", teach: "The uniform itself is called a dobok." },
      { answer: "KICK", clue: "Striking with your foot — taekwondo's specialty!", teach: "'Tae' actually means foot, 'kwon' means fist and 'do' means way." },
      { answer: "PUNCH", clue: "A straight strike with your fist.", teach: "Ends in -CH, and the N before it is why it sounds like 'punsh'." },
      { answer: "BOW", clue: "You do this to show respect before you spar.", teach: "One word, two sounds: a BOW you make (rhymes with 'cow') and a BOW in your hair (rhymes with 'go')." },
      { answer: "BLOCK", clue: "Move your arm to stop an attack.", teach: "BL is a blend — two letters you say quickly together, like in 'blue' and 'black'." },
      { answer: "KOREA", clue: "The country where taekwondo began.", teach: "Korea is in East Asia. Taekwondo became an Olympic sport in the year 2000." },
      { answer: "SPAR", clue: "To practice-fight a partner.", teach: "Sparring is gentle and controlled — the point is to practise, not to hurt anyone." },
      { answer: "FORM", clue: "A set pattern of moves you practice (a 'poomsae').", teach: "A form is like a dance of blocks and kicks that you memorise in order." },
    ],
  },
  {
    name: "Pokémon Party", emoji: "⚡", blurb: "Catch and battle your favourites!", level: "tricky",
    words: [
      { answer: "PIKACHU", clue: "The yellow electric mouse Pokémon.", teach: "Seven letters. In Japanese, 'pika' is the sound of a sparkle and 'chu' is a mouse squeak." },
      { answer: "EEVEE", clue: "A fluffy Pokémon that can evolve many ways.", teach: "Double E three times! To 'evolve' means to change into something new." },
      { answer: "CHARIZARD", clue: "A big orange fire-and-flying dragon Pokémon.", teach: "A blend of 'char' (to burn) and 'lizard'." },
      { answer: "SNORLAX", clue: "A huge Pokémon that loves to sleep.", teach: "From 'snore' plus 'relax' — the name tells you exactly what it does." },
      { answer: "POKEBALL", clue: "The red-and-white ball you catch Pokémon in.", teach: "A compound word: POKE + BALL." },
      { answer: "TRAINER", clue: "A person who catches and battles Pokémon.", teach: "Train + er. The '-er' ending means 'the person who does it', like teacher and painter." },
      { answer: "BULBASAUR", clue: "A grass Pokémon with a plant bulb on its back.", teach: "'Bulb' is the round root a plant grows from, and '-saur' means lizard." },
    ],
  },
  {
    name: "Gabby's Dollhouse", emoji: "🐱", blurb: "Welcome to the kitty house!", level: "easy",
    words: [
      { answer: "GABBY", clue: "The girl who shrinks down to visit the dollhouse.", teach: "Double B, then Y on the end — the Y sounds like a long E." },
      { answer: "PANDY", clue: "___ Paws, the cuddly panda-cat.", teach: "Pandy is a panda AND a cat — a mash-up of two animals." },
      { answer: "MERCAT", clue: "The half-mermaid, half-cat of the bathroom.", teach: "MER + CAT. 'Mer' comes from an old word for the sea." },
      { answer: "CATNIP", clue: "DJ ___, the music-loving green cat.", teach: "Catnip is a real herb — its smell makes many cats go bouncy." },
      { answer: "KITTY", clue: "A baby cat.", teach: "Double T then Y. A baby cat is really called a kitten." },
      { answer: "CARLITA", clue: "Gabby's toy car that's also a cat!", teach: "CAR + lita. In Spanish, adding '-ita' to a word means 'little'." },
    ],
  },
  {
    name: "Outer Space", emoji: "🚀", blurb: "Blast off to the stars!", level: "medium",
    words: [
      { answer: "PLANET", clue: "Earth, Mars and Jupiter are each one.", teach: "There are eight planets going around our Sun." },
      { answer: "ROCKET", clue: "A ship that blasts off into space.", teach: "A rocket pushes flames down so it goes up — every push has an equal push back." },
      { answer: "COMET", clue: "An icy space ball with a glowing tail.", teach: "The tail always points away from the Sun, because sunlight blows it back." },
      { answer: "SATURN", clue: "The planet famous for its rings.", teach: "Saturn's rings are made of billions of chunks of ice and rock." },
      { answer: "GALAXY", clue: "A huge swirl of millions of stars.", teach: "Ours is called the Milky Way. The X here sounds like 'ks'." },
      { answer: "ORBIT", clue: "The path a planet or moon travels around.", teach: "Earth takes one year to make one orbit of the Sun." },
      { answer: "ASTRONAUT", clue: "A person who travels into space.", teach: "Nine letters! It comes from Greek words meaning 'star sailor'." },
    ],
  },
  {
    name: "Soccer Stars", emoji: "⚽", blurb: "Kick, pass and score!", level: "easy",
    words: [
      { answer: "GOAL", clue: "What you score when the ball goes in the net.", teach: "OA together makes one long O sound, like in 'boat' and 'coat'." },
      { answer: "KICK", clue: "How you move the ball with your foot.", teach: "The CK ending comes after a short vowel, like 'sock', 'duck' and 'back'." },
      { answer: "TEAM", clue: "The group of players you play with.", teach: "EA together says a long E, like in 'dream' and 'beach'. A soccer team has 11 players." },
      { answer: "FIELD", clue: "The grassy place where you play.", teach: "I before E here — 'field', 'shield' and 'yield' all follow the same pattern." },
      { answer: "SCORE", clue: "The number of goals each team has.", teach: "The magic E makes the O say its name." },
      { answer: "COACH", clue: "The grown-up who teaches the team.", teach: "OA says long O, and CH finishes it — like 'roach' and 'poach'." },
      { answer: "STRIKER", clue: "The player whose job is to score goals.", teach: "Strike + er. When a word ends in silent E you drop the E before adding -ER." },
      { answer: "BALL", clue: "The round thing you kick around the field.", teach: "Double L at the end, like 'tall', 'wall' and 'small'." },
      { answer: "PASS", clue: "To kick the ball to a teammate.", teach: "Double S at the end, like 'grass' and 'class'." },
    ],
  },
  {
    name: "Dinosaur Dig", emoji: "🦕", blurb: "Stomp back to the age of dinos!", level: "medium",
    words: [
      { answer: "RAPTOR", clue: "A fast, clever hunting dinosaur.", teach: "'Raptor' means 'one who seizes' — it's also used for birds of prey like hawks." },
      { answer: "FOSSIL", clue: "Old bones that turned to stone.", teach: "Double S in the middle. Fossils take thousands of years to form." },
      { answer: "STEGOSAURUS", clue: "A dino with plates on its back and a spiky tail.", teach: "Eleven letters! It means 'roofed lizard', because of the plates." },
      { answer: "ROAR", clue: "The big loud sound a dinosaur makes.", teach: "Nobody actually knows what dinosaurs sounded like — scientists are still guessing." },
      { answer: "BONES", clue: "What scientists dig up to learn about dinos.", teach: "A scientist who digs up fossils is called a palaeontologist." },
      { answer: "EGG", clue: "A baby dinosaur hatches out of this.", teach: "Double G at the end. Real fossil dinosaur eggs have been found." },
      { answer: "REX", clue: "Tyrannosaurus ___, the giant meat-eater.", teach: "'Rex' is Latin for 'king' — so T. rex means 'king tyrant lizard'." },
    ],
  },
  {
    name: "Yummy Food", emoji: "🍕", blurb: "Snacks and treats we love!", level: "easy",
    words: [
      { answer: "PIZZA", clue: "A round, cheesy slice with toppings.", teach: "Double Z in the middle — an Italian word, and Italy is where pizza comes from." },
      { answer: "APPLE", clue: "A crunchy red or green fruit.", teach: "Double P. Apples float, because a fifth of an apple is air." },
      { answer: "COOKIE", clue: "A sweet treat that's great with milk.", teach: "Double O then -IE, like 'rookie' and 'bookie'." },
      { answer: "TACO", clue: "A folded shell stuffed with yummy fillings.", teach: "A Spanish word from Mexico. Four letters, no double anything." },
      { answer: "BANANA", clue: "A long yellow fruit monkeys love.", teach: "Three A's! Bananas grow on giant plants, not trees." },
      { answer: "JUICE", clue: "A sweet drink squeezed from fruit.", teach: "The tricky bit is UI in the middle, and the C sounds like an S." },
      { answer: "BREAD", clue: "You toast it or make a sandwich with it.", teach: "Here EA makes a short E sound — like 'head' and 'ready', not like 'bead'." },
    ],
  },
  {
    name: "Princess Party", emoji: "👑", blurb: "Crowns, castles and royal magic!", level: "easy",
    words: [
      { answer: "PRINCESS", clue: "A royal daughter of a king and queen.", teach: "Double S at the end. The '-ESS' ending used to mean 'a lady who…', like in 'lioness'." },
      { answer: "CROWN", clue: "The sparkly gold circle a queen wears on her head.", teach: "OW says 'ow!' here, like in 'down' and 'town'." },
      { answer: "WAND", clue: "A fairy godmother waves this to make magic.", teach: "The A sounds like the O in 'want' — W often bends the A that follows it." },
      { answer: "CASTLE", clue: "The giant stone home where royals live.", teach: "The T is silent! Same in 'listen', 'whistle' and 'thistle'." },
      { answer: "TIARA", clue: "A small jewelled half-crown for fancy parties.", teach: "Say it 'tee-AR-uh'. It's a Greek word for a fancy headband." },
      { answer: "BALL", clue: "A big fancy royal dance party.", teach: "Same spelling as a bouncy ball — one word, two very different meanings." },
      { answer: "DRESS", clue: "A twirly thing to wear to the ball.", teach: "Double S at the end, like 'press' and 'mess'." },
      { answer: "ROYAL", clue: "A word that means 'belonging to a king or queen'.", teach: "Roy-al. The '-AL' ending turns a thing into a describing word." },
    ],
  },
  {
    name: "Number Land", emoji: "🔢", blurb: "Spell the math words!", level: "medium",
    words: [
      { answer: "PLUS", clue: "The + sign means to add, or '___'.", teach: "3 plus 4 equals 7. Adding in any order gives the same answer: 4 plus 3 is 7 too." },
      { answer: "HUNDRED", clue: "Ten groups of ten make one ___.", teach: "100 has two zeros. Ten hundreds make a thousand." },
      { answer: "MINUS", clue: "The − sign means to take away, or '___'.", teach: "Unlike adding, order matters: 7 minus 3 is 4, but 3 minus 7 is below zero." },
      { answer: "SEVEN", clue: "How many days are in one week.", teach: "Seven is a prime number — only 1 and 7 divide into it evenly." },
      { answer: "TWELVE", clue: "The number after eleven — a dozen!", teach: "Twelve divides evenly by 1, 2, 3, 4, 6 and 12 — that's why eggs come in dozens." },
      { answer: "DOUBLE", clue: "To make twice as many — 4 becomes 8!", teach: "Doubling is the same as multiplying by 2." },
      { answer: "EQUAL", clue: "What the = sign means: the same amount.", teach: "QU always travel together in English — 'queen', 'quick', 'equal'." },
      { answer: "ZERO", clue: "The number that means 'nothing at all'.", teach: "Add zero to any number and it stays the same. Multiply by zero and it all disappears." },
    ],
  },
  {
    name: "Under the Sea", emoji: "🌊", blurb: "Dive down with the sea creatures!", level: "medium",
    words: [
      { answer: "SEAWEED", clue: "The green, slippery plant that grows in the ocean.", teach: "A compound word: SEA + WEED. Both halves use EA and EE for long E sounds." },
      { answer: "SHARK", clue: "A big fish with lots and lots of teeth.", teach: "Sharks grow new teeth their whole lives — some lose 30,000 in a lifetime." },
      { answer: "DOLPHIN", clue: "A smart, friendly sea animal that leaps and clicks.", teach: "PH says F — like 'phone' and 'elephant'. Dolphins are mammals, not fish." },
      { answer: "WAVE", clue: "It rolls across the ocean and crashes on the sand.", teach: "Waves are mostly made by wind pushing on the water's surface." },
      { answer: "WHALE", clue: "The biggest animal in the whole ocean.", teach: "WH at the start, like 'when' and 'wheel'. A blue whale's heart is the size of a car." },
      { answer: "CORAL", clue: "A colourful underwater reef is made of this.", teach: "Coral is alive! It's made of thousands of tiny animals called polyps." },
      { answer: "CRAB", clue: "A sideways-walking animal with two pinchy claws.", teach: "CR is a blend, like 'crash' and 'crack'. Crabs wear their skeleton on the outside." },
      { answer: "SHELL", clue: "You find these on the beach — some hide hermit crabs.", teach: "Double L at the end, like 'bell' and 'smell'." },
    ],
  },
  {
    name: "Weather Watch", emoji: "🌦️", blurb: "Sun, storms and rainbows!", level: "medium",
    words: [
      { answer: "STORM", clue: "Wild weather with wind, rain and thunder.", teach: "ST is a blend. Storms happen when warm wet air rushes upward fast." },
      { answer: "THUNDER", clue: "The big rumbling BOOM after lightning.", teach: "Light travels faster than sound — that's why you see the flash before you hear the boom." },
      { answer: "RAINBOW", clue: "The coloured arc in the sky after rain and sun.", teach: "RAIN + BOW. Raindrops split sunlight into seven colours." },
      { answer: "FROST", clue: "The sparkly ice that covers grass on cold mornings.", teach: "Frost forms when water vapour freezes straight onto a cold surface." },
      { answer: "SUNNY", clue: "A bright day with no clouds is this.", teach: "Sun + N + Y. Short words double the last letter before adding Y: sunny, funny, muddy." },
      { answer: "CLOUD", clue: "A white fluffy thing floating in the sky.", teach: "OU makes the 'ow' sound here, like 'loud' and 'proud'. Clouds are tiny water droplets." },
      { answer: "WINDY", clue: "The kind of day that's perfect for flying a kite.", teach: "Wind + Y. Wind is just air moving from a crowded place to an emptier one." },
    ],
  },
  {
    name: "Music Makers", emoji: "🎹", blurb: "Notes, beats and instruments!", level: "tricky",
    words: [
      { answer: "PIANO", clue: "Black and white keys you press to make notes.", teach: "A piano has 88 keys. Its full name, 'pianoforte', means 'soft-loud' in Italian." },
      { answer: "DRUM", clue: "You hit this one with sticks to keep the beat.", teach: "Drums are percussion instruments — you play them by hitting or shaking them." },
      { answer: "NOTE", clue: "One single sound in a song — A, B or C!", teach: "Music only uses seven letter names, A to G, then it starts over." },
      { answer: "SONG", clue: "Words and a tune you can sing.", teach: "The NG ending makes one sound, like 'ring' and 'long'." },
      { answer: "GUITAR", clue: "You strum its six strings.", teach: "The U is silent — it's only there to keep the G hard instead of soft." },
      { answer: "SHARP", clue: "The ♯ sign makes a note one step higher — a '___'.", teach: "Its opposite is a flat (♭), which lowers a note one step." },
      { answer: "TRUMPET", clue: "A shiny brass horn you blow.", teach: "You change the note with three valves and by buzzing your lips harder or softer." },
      { answer: "BEAT", clue: "The steady pulse you clap along to.", teach: "EA says long E here. Most pop songs group beats in fours: 1-2-3-4." },
    ],
  },
  {
    name: "Around the World", emoji: "🌍", blurb: "Continents, oceans and maps!", level: "tricky",
    words: [
      { answer: "AFRICA", clue: "The continent with the Sahara Desert and lions.", teach: "Africa has 54 countries — more than any other continent." },
      { answer: "OCEAN", clue: "A huge body of salty water — there are five.", teach: "The CE sounds like 'sh'. The five are Pacific, Atlantic, Indian, Southern and Arctic." },
      { answer: "ISLAND", clue: "Land with water all the way around it.", teach: "The S is silent — say it 'eye-land'." },
      { answer: "EUROPE", clue: "The continent with castles and the Alps.", teach: "Europe is the second-smallest continent but has around 44 countries." },
      { answer: "DESERT", clue: "A very dry place with hardly any rain.", teach: "One S = a dry place. Two S's (dessert) = pudding. Remember: dessert is so good you want two." },
      { answer: "RIVER", clue: "Water that flows all the way to the sea.", teach: "The Nile and the Amazon are the two longest rivers on Earth." },
      { answer: "MAP", clue: "A picture of a place from above.", teach: "A map's key (or legend) explains what each symbol and colour means." },
      { answer: "ASIA", clue: "The biggest continent of them all.", teach: "More than half of all the people on Earth live in Asia." },
    ],
  },
  {
    name: "Rock Hunter", emoji: "🪨", blurb: "Geology words for rock detectives!", level: "tricky",
    words: [
      { answer: "CRYSTAL", clue: "A mineral that grew in a shape with flat, shiny sides.", teach: "The Y does the vowel's job here, like in 'gym' and 'myth'." },
      { answer: "GEODE", clue: "A plain-looking rock that's full of crystals inside.", teach: "Say it 'JEE-ode'. It comes from a Greek word meaning 'earth-like'." },
      { answer: "LAVA", clue: "Melted rock that pours out of a volcano.", teach: "Underground it's called magma; once it pours out it's called lava." },
      { answer: "QUARTZ", clue: "A very common mineral, often clear or milky white.", teach: "Q is always followed by U, and this one ends in TZ — a rare English ending." },
      { answer: "FOSSIL", clue: "The shape of an old plant or animal left in stone.", teach: "Fossils are usually found in sedimentary rock, which forms in layers." },
      { answer: "MINERAL", clue: "The natural stuff rocks are made of.", teach: "A rock is a mixture; a mineral is one pure ingredient of it." },
      { answer: "SAND", clue: "Zillions of tiny bits of worn-down rock.", teach: "Wind and water grinding rock down for ages is called erosion." },
    ],
  },
  {
    name: "My Amazing Body", emoji: "🫀", blurb: "The parts that keep you going!", level: "medium",
    words: [
      { answer: "HEART", clue: "The muscle that pumps your blood all day and night.", teach: "It beats about 100,000 times a day and never gets a day off." },
      { answer: "BRAIN", clue: "The thinking part inside your head.", teach: "AI says long A, like 'rain' and 'train'. Your brain uses a fifth of all your energy." },
      { answer: "LUNGS", clue: "The two air bags you breathe with.", teach: "They pull oxygen out of the air and push carbon dioxide back out." },
      { answer: "BONES", clue: "The hard parts that hold you up — you have 206!", teach: "Babies are born with about 300 bones; some fuse together as you grow." },
      { answer: "MUSCLE", clue: "You flex this to lift and move.", teach: "The C is silent — say it 'muss-ul'. You have over 600 muscles." },
      { answer: "TEETH", clue: "You chew with these and brush them twice a day.", teach: "An odd plural: one tooth, two teeth — the vowel changes instead of adding S." },
      { answer: "ELBOW", clue: "The bendy joint in the middle of your arm.", teach: "A hinge joint — it bends one way only, like a door." },
    ],
  },
  {
    name: "Bug Hunt", emoji: "🐛", blurb: "Creepy crawlies in the garden!", level: "easy",
    words: [
      { answer: "SPIDER", clue: "Eight legs and a sticky web.", teach: "Spiders aren't insects — insects have six legs, spiders have eight." },
      { answer: "BEETLE", clue: "A bug with a hard shiny shell on its back.", teach: "Double E then -TLE, like 'kettle' and 'little'. Beetles are the biggest animal group on Earth." },
      { answer: "ANT", clue: "A tiny bug that marches in a line to your picnic.", teach: "Ants follow a smell trail left by the ant in front." },
      { answer: "LADYBUG", clue: "A little red beetle with black spots.", teach: "LADY + BUG. Gardeners love them because they eat the aphids that chew plants." },
      { answer: "WINGS", clue: "Bees and butterflies fly with these.", teach: "A bee's wings beat about 200 times every second." },
      { answer: "MOTH", clue: "A night-time flutterer drawn to a light.", teach: "TH at the end, like 'both' and 'cloth'. Moths fly at night; butterflies fly by day." },
      { answer: "WEB", clue: "The sticky trap a spider spins.", teach: "Only some of the threads are sticky — the spider walks on the dry ones." },
    ],
  },

  /* ----- added later: more tiers, from Ellie-sized to Shannon-sized ----- */
  {
    name: "Colour Crayons", emoji: "🎨", blurb: "Name every colour in the box!", level: "easy",
    words: [
      { answer: "PURPLE", clue: "Mix red and blue and you get this royal colour.", teach: "Six letters, and BOTH vowels are the same: P-U-R-P-L-E." },
      { answer: "ORANGE", clue: "A colour that is also a fruit.", teach: "Mix red and yellow to make it. Almost nothing rhymes with 'orange'!" },
      { answer: "YELLOW", clue: "The colour of the sun and a banana.", teach: "Double L in the middle, like 'pillow' and 'fellow'." },
      { answer: "GREEN", clue: "The colour of grass and leaves.", teach: "Double E. Mix blue and yellow to make it." },
      { answer: "BROWN", clue: "The colour of mud, bears and chocolate.", teach: "OWN here says 'ow-n', like 'clown' and 'frown'." },
      { answer: "PINK", clue: "Red mixed with white makes this soft colour.", teach: "The NK ending, like 'think' and 'sink'." },
      { answer: "BLUE", clue: "The colour of the sky on a sunny day.", teach: "BL is a blend, and the UE on the end says 'oo' — like 'glue' and 'true'." },
      { answer: "RED", clue: "The colour of a stop sign and a strawberry.", teach: "Red, yellow and blue are the primary colours — you can't mix any other colours to make them." },
    ],
  },
  {
    name: "Farm Friends", emoji: "🐄", blurb: "Who lives down on the farm?", level: "easy",
    words: [
      { answer: "TRACTOR", clue: "The big machine that pulls the plough.", teach: "It comes from 'traction', which means gripping and pulling." },
      { answer: "CHICKEN", clue: "The farm bird that lays your breakfast eggs.", teach: "CH at the start, CK in the middle. A girl chicken is a hen." },
      { answer: "SHEEP", clue: "Woolly animal that says 'baa'.", teach: "One sheep, two sheep — the plural doesn't change at all." },
      { answer: "HORSE", clue: "You can ride this one around the paddock.", teach: "A baby horse is a foal, and horses are measured in 'hands'." },
      { answer: "GOAT", clue: "A bouncy animal with horns that eats almost anything.", teach: "OA says long O, like 'boat' and 'coat'." },
      { answer: "BARN", clue: "The big red building where hay and animals are kept.", teach: "The AR makes an 'ar' sound, like 'car' and 'star'." },
      { answer: "DUCK", clue: "It waddles, swims and says 'quack'.", teach: "CK after a short vowel, like 'luck' and 'rock'. Duck feathers are waterproof." },
      { answer: "COW", clue: "It says 'moo' and gives us milk.", teach: "A cow has one stomach with four rooms so it can chew grass twice." },
    ],
  },
  {
    name: "Sneaky Silent Letters", emoji: "🤫", blurb: "Letters you write but never say!", level: "tricky",
    words: [
      { answer: "KNUCKLE", clue: "A bumpy joint in your finger — it starts with a silent K.", teach: "KN words all keep a silent K: knee, knight, knock, knife, know." },
      { answer: "WRINKLE", clue: "A crease in your shirt — the W at the front says nothing.", teach: "WR words hide the W: write, wrong, wrist, wrap, wreck." },
      { answer: "THUMB", clue: "Your shortest, fattest finger — with a silent B on the end.", teach: "MB words end with a silent B: lamb, comb, climb, crumb, numb." },
      { answer: "ISLAND", clue: "Land with sea all around it — and a silent S.", teach: "Say it 'eye-land'. The S was added by mistake hundreds of years ago and just stuck." },
      { answer: "GNOME", clue: "A little garden statue with a pointy hat and a silent G.", teach: "GN words start with a silent G: gnaw, gnat, gnash." },
      { answer: "HONEST", clue: "Telling the truth — but the H stays quiet.", teach: "Say it 'ON-est'. Same silent H in 'hour' and 'honour'." },
      { answer: "CASTLE", clue: "A stone fortress — the T in the middle is silent.", teach: "STLE words drop the T: listen, whistle, thistle, rustle." },
    ],
  },
  {
    name: "Shape Squad", emoji: "🔺", blurb: "Sides, corners and solid shapes!", level: "medium",
    words: [
      { answer: "TRIANGLE", clue: "A shape with three sides and three corners.", teach: "'Tri' means three — like tricycle and triplets." },
      { answer: "HEXAGON", clue: "A six-sided shape — bees build these in the hive.", teach: "'Hex' means six. A pentagon has five sides, an octagon has eight." },
      { answer: "SQUARE", clue: "Four equal sides and four square corners.", teach: "Every square is a rectangle, but not every rectangle is a square." },
      { answer: "CIRCLE", clue: "A perfectly round shape with no corners at all.", teach: "The line straight across the middle is the diameter; halfway is the radius." },
      { answer: "SPHERE", clue: "A ball shape — a solid, 3D circle.", teach: "Starts with SPH, and the PH says F. A globe is a sphere." },
      { answer: "PRISM", clue: "A solid with the same shape at both ends, joined by flat sides.", teach: "A glass prism splits white light into a rainbow." },
      { answer: "ANGLE", clue: "The corner where two lines meet.", teach: "A square corner is 90 degrees and is called a right angle." },
      { answer: "CUBE", clue: "A solid box with six square faces — like a dice.", teach: "6 faces, 12 edges and 8 corners. Cubing a number means times it by itself twice." },
    ],
  },
  {
    name: "Coding Club", emoji: "💻", blurb: "How computers follow instructions.", level: "medium",
    words: [
      { answer: "ALGORITHM", clue: "A step-by-step recipe a computer follows.", teach: "Nine letters, and TH in the middle. A recipe for pancakes is an algorithm too." },
      { answer: "LOOP", clue: "Code that repeats the same steps over and over.", teach: "Instead of writing 'jump' 100 times, you write a loop that says: repeat 100 times." },
      { answer: "DEBUG", clue: "To hunt down and fix a mistake in your code.", teach: "The very first computer 'bug' was a real moth stuck inside a machine in 1947." },
      { answer: "PIXEL", clue: "One tiny coloured dot in a picture on a screen.", teach: "Short for 'picture element'. Minecraft's blocky look is pixels made huge on purpose." },
      { answer: "ROBOT", clue: "A machine that follows a program to do a job.", teach: "The word comes from a Czech play in 1920 — it means 'forced work'." },
      { answer: "INPUT", clue: "Anything you give a computer: a tap, a key, a click.", teach: "Input goes in, output comes out — like a screen or a speaker." },
      { answer: "BINARY", clue: "The number system computers use, with only 0 and 1.", teach: "'Bi' means two. In binary, 1-0-1 means five." },
    ],
  },
  {
    name: "Grown-Up: Word Nerd", emoji: "🧠", blurb: "A real vocabulary puzzle for the grown-ups.", level: "grown-up",
    words: [
      { answer: "MEANDER", clue: "To wander along without hurrying, or the way a lazy river bends.", teach: "From the Maeander, a famously winding river in ancient Turkey." },
      { answer: "ELOQUENT", clue: "Fluent and persuasive in speech or writing.", teach: "Shares a root with 'loquacious' — Latin 'loqui', to speak." },
      { answer: "LUMINOUS", clue: "Giving off light; glowing.", teach: "From Latin 'lumen', light — the same root as illuminate and luminary." },
      { answer: "SERENE", clue: "Calm, peaceful and completely untroubled.", teach: "The noun is 'serenity', and a clear evening sky is where the word started." },
      { answer: "QUIRK", clue: "A small, odd habit that makes someone themselves.", teach: "Five letters starting QU. 'Quirky' is the adjective." },
      { answer: "TRIVIA", clue: "Small details of little importance — but great in a quiz.", teach: "Latin 'tri' + 'via' = three roads: gossip swapped where roads meet." },
      { answer: "ASTUTE", clue: "Shrewd; quick to see what's really going on.", teach: "From Latin 'astus', craft or cunning. 'Astutely' is the adverb." },
      { answer: "NOVEL", clue: "New and unusual — or a book-length story.", teach: "Both meanings come from Latin 'novus', new." },
    ],
  },
  {
    name: "Grown-Up: World Atlas", emoji: "🗺️", blurb: "Capitals, rivers and ranges.", level: "grown-up",
    words: [
      { answer: "ICELAND", clue: "North Atlantic island nation of volcanoes and geysers.", teach: "Its capital, Reykjavik, is the world's northernmost capital of a sovereign state." },
      { answer: "DANUBE", clue: "Europe's second-longest river, flowing past Vienna and Budapest.", teach: "It passes through ten countries — more than any other river on Earth." },
      { answer: "ANDES", clue: "The mountain range running down the western edge of South America.", teach: "About 7,000 km long — the longest continental mountain range there is." },
      { answer: "LISBON", clue: "The capital of Portugal, on the river Tagus.", teach: "In Portuguese it's Lisboa. It's the westernmost capital on mainland Europe." },
      { answer: "SAHARA", clue: "The vast desert across northern Africa.", teach: "Roughly the size of the United States, and it's still growing." },
      { answer: "NILE", clue: "The river that runs north through Egypt to the Mediterranean.", teach: "One of very few great rivers that flows northward." },
      { answer: "OSLO", clue: "The capital of Norway, at the head of a long fjord.", teach: "A fjord is a deep sea inlet carved out by an ancient glacier." },
      { answer: "PERU", clue: "The South American country that is home to Machu Picchu.", teach: "Its capital is Lima, and it shares Lake Titicaca with Bolivia." },
    ],
  },
];

const out = THEMES.map(compile);
console.log(JSON.stringify(out.map(o => ({
  name: o.name, emoji: o.emoji, blurb: o.blurb, level: o.level,
  rows: o.rows, cols: o.cols, cells: o.cells, numbers: o.numbers, entries: o.entries,
}))));
console.error("Generated crosswords:");
out.forEach(o => {
  console.error(`\n${o.name}: ${o.cols}x${o.rows}, ${o.entries.length} entries, unplaced: [${o.unplaced.join(", ")}]`);
  console.error(o.cells.map(row => row.map(x => x || ".").join(" ")).join("\n"));
});
