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
   --------------------------------------------------------------- */
const PUZZLES = [
  {
    name: "Minecraft World", emoji: "🟩", width: 6,
    clue: "Blocky adventures, mobs & loot!",
    words: [
      { word: "MINECRAFT", spangram: true },
      { word: "CREEPER" }, { word: "DIAMOND" }, { word: "ZOMBIE" },
      { word: "SWORD" }, { word: "TORCH" }, { word: "TNT" },
    ],
  },
  {
    name: "Frozen Friends", emoji: "❄️", width: 5,
    clue: "The snowy kingdom of Arendelle.",
    words: [
      { word: "FROZEN", spangram: true },
      { word: "KRISTOFF" }, { word: "ELSA" }, { word: "ANNA" },
      { word: "OLAF" }, { word: "SVEN" },
    ],
  },
  {
    name: "Under the Sea", emoji: "🌊", width: 5,
    clue: "Animals that swim in the ocean.",
    words: [
      { word: "OCEAN", spangram: true },
      { word: "DOLPHIN" }, { word: "OCTOPUS" }, { word: "WHALE" },
      { word: "SHARK" }, { word: "TURTLE" },
    ],
  },
  {
    name: "The Heeler Family", emoji: "🐶", width: 5,
    clue: "Bluey's family and friends.",
    words: [
      { word: "HEELERS", spangram: true },
      { word: "BANDIT" }, { word: "CHILLI" }, { word: "MUFFIN" },
      { word: "BLUEY" }, { word: "BINGO" },
    ],
  },
  {
    name: "Gotta Catch 'Em", emoji: "⚡", clue: "Pokémon to catch and train.",
    words: [
      { word: "POKEMON", spangram: true },
      { word: "PIKACHU" }, { word: "BULBASAUR" }, { word: "EEVEE" },
      { word: "SNORLAX" },
    ],
  },
  {
    name: "Gabby's Cats", emoji: "🐱", clue: "Kitties from Gabby's Dollhouse.",
    words: [
      { word: "GABBY", spangram: true },
      { word: "PANDY" }, { word: "CAKEY" }, { word: "KITTY" },
      { word: "PURRS" }, { word: "MEOWS" },
    ],
  },
  {
    name: "Sweet Treats", emoji: "🍩", clue: "Yummy desserts and snacks.",
    words: [
      { word: "SWEETS", spangram: true },
      { word: "DONUT" }, { word: "CANDY" }, { word: "JELLY" },
      { word: "FUDGE" }, { word: "CAKE" },
    ],
  },
  {
    name: "Blast Off!", emoji: "🚀", clue: "Things you'd find in outer space.",
    words: [
      { word: "SPACE", spangram: true },
      { word: "PLANET" }, { word: "ROCKET" }, { word: "COMET" },
      { word: "MOON" }, { word: "STAR" },
    ],
  },
  {
    name: "Taekwondo!", emoji: "🥋", clue: "Kicks, belts and respect.",
    words: [
      { word: "TAEKWONDO", spangram: true },
      { word: "KICK" }, { word: "PUNCH" }, { word: "BELT" },
      { word: "BLOCK" }, { word: "BOW" },
    ],
  },
  {
    name: "Princess Party", emoji: "👑", width: 5, clue: "Crowns, castles and royal magic.",
    words: [
      { word: "PRINCESS", spangram: true },
      { word: "CROWN" }, { word: "DRESS" }, { word: "CASTLE" },
      { word: "TIARA" }, { word: "PALACE" },
    ],
  },
  {
    name: "Dino Dig", emoji: "🦕", width: 6, clue: "Giants from long, long ago.",
    words: [
      { word: "DINOSAUR", spangram: true },
      { word: "TREX" }, { word: "RAPTOR" }, { word: "FOSSIL" },
      { word: "BONES" }, { word: "ROAR" }, { word: "EGG" },
    ],
  },
  {
    name: "On the Farm", emoji: "🐄", width: 5, clue: "Animals you'd meet at a farm.",
    words: [
      { word: "BARNYARD", spangram: true },
      { word: "HORSE" }, { word: "SHEEP" }, { word: "GOAT" },
      { word: "DUCK" }, { word: "PIG" }, { word: "COW" }, { word: "HEN" },
    ],
  },
  {
    name: "Book Nook", emoji: "📖", width: 5, clue: "Everything about reading.",
    words: [
      { word: "READING", spangram: true },
      { word: "STORY" }, { word: "PAGES" }, { word: "BOOKS" },
      { word: "HERO" }, { word: "PLOT" },
    ],
  },
  {
    name: "Math Magic", emoji: "🔢", width: 5, clue: "Numbers and what you do with them.",
    words: [
      { word: "NUMBERS", spangram: true },
      { word: "PLUS" }, { word: "MINUS" }, { word: "COUNT" }, { word: "MATH" },
    ],
  },
  {
    name: "Music Lab", emoji: "🎹", width: 5, clue: "Instruments and the sounds they make.",
    words: [
      { word: "MUSIC", spangram: true },
      { word: "PIANO" }, { word: "DRUMS" }, { word: "NOTES" },
      { word: "FLUTE" }, { word: "SONGS" }, { word: "BEATS" },
    ],
  },
  {
    name: "Seven Continents", emoji: "🌍", width: 5, clue: "The big pieces of land on Earth.",
    words: [
      { word: "CONTINENT", spangram: true },
      { word: "AFRICA" }, { word: "EUROPE" }, { word: "ASIA" }, { word: "OCEAN" },
    ],
  },
  {
    name: "Fifty States", emoji: "🗺️", width: 5, clue: "States of the USA.",
    words: [
      { word: "STATES", spangram: true },
      { word: "ALASKA" }, { word: "FLORIDA" }, { word: "TEXAS" },
      { word: "NEVADA" }, { word: "IDAHO" },
    ],
  },
  {
    name: "My Body", emoji: "🫀", width: 6, clue: "Parts of you, inside and out.",
    words: [
      { word: "MYBODY", spangram: true },
      { word: "HEART" }, { word: "BRAIN" }, { word: "LUNGS" },
      { word: "BONES" }, { word: "TEETH" }, { word: "ELBOW" },
    ],
  },
];

const result = PUZZLES.map(p => {
  const b = build(p.width, p.words);
  return {
    name: p.name, emoji: p.emoji, clue: p.clue,
    width: b.width, height: b.height,
    grid: b.grid,
    words: b.words.map(w => ({ word: w.word, spangram: w.spangram, path: w.path })),
  };
});

console.log(JSON.stringify(result, null, 0));
console.error("OK — generated " + result.length + " puzzles");
result.forEach(r => console.error(`  ${r.name}: ${r.width}x${r.height}, ${r.words.length} words`));
