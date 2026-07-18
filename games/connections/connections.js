/* ===========================================================
   Connections — a kid-friendly version of the NYT grouping game.
   -----------------------------------------------------------
   Sixteen cards hide FOUR secret groups of four. Tap four cards
   you think belong together, then press Check. Find all four
   groups before you run out of guesses!

   Teaches: sorting, categories, vocabulary and a bit of logic
   (watch out — some cards look like they fit two groups!).

   Difficulty colours, like the grown-up game:
     🟨 easy   🟩 medium   🟦 tricky   🟪 trickiest

   To ADD A PUZZLE: copy a block in PUZZLES. Each puzzle has four
   groups; each group has a name, a colour and exactly four items.
   Safe pop-culture to draw from: Bluey, Minecraft, Pokémon,
   Frozen, Gabby's Dollhouse, Diary of a Wimpy Kid, Calvin &
   Hobbes, Upside Down Magic — plus plain kid knowledge.
   =========================================================== */

(function () {
  "use strict";

  const COLORS = {
    yellow: "#f4c542",
    green:  "#3ddc84",
    blue:   "#38b6ff",
    purple: "#a06cd5",
  };

  const PUZZLES = [
    {
      name: "Pop-Culture Pals",
      emoji: "🌟",
      groups: [
        { name: "Bluey family",     color: "yellow", items: ["Bluey", "Bingo", "Bandit", "Chilli"] },
        { name: "Minecraft mobs",   color: "green",  items: ["Creeper", "Zombie", "Skeleton", "Enderman"] },
        { name: "Pokémon",          color: "blue",   items: ["Pikachu", "Charizard", "Eevee", "Snorlax"] },
        { name: "Frozen friends",   color: "purple", items: ["Elsa", "Anna", "Olaf", "Sven"] },
      ],
    },
    {
      name: "Everyday Groups",
      emoji: "🍎",
      groups: [
        { name: "Colours",      color: "yellow", items: ["Red", "Blue", "Green", "Pink"] },
        { name: "Fruits",       color: "green",  items: ["Apple", "Banana", "Grape", "Cherry"] },
        { name: "Numbers",      color: "blue",   items: ["One", "Two", "Three", "Four"] },
        { name: "Farm animals", color: "purple", items: ["Cow", "Pig", "Sheep", "Goat"] },
      ],
    },
    {
      name: "Book Characters",
      emoji: "📖",
      groups: [
        { name: "Diary of a Wimpy Kid", color: "yellow", items: ["Greg", "Rodrick", "Manny", "Rowley"] },
        { name: "Calvin and Hobbes",    color: "green",  items: ["Calvin", "Hobbes", "Susie", "Moe"] },
        { name: "Upside Down Magic",     color: "blue",   items: ["Nory", "Elliott", "Andres", "Bax"] },
        { name: "Dog Man",               color: "purple", items: ["Dog Man", "Petey", "Chief", "Flippy"] },
      ],
    },
    {
      name: "Mix It Up",
      emoji: "🧩",
      groups: [
        { name: "Minecraft blocks", color: "yellow", items: ["Dirt", "Stone", "Sand", "Wood"] },
        { name: "Up in the sky",    color: "green",  items: ["Sun", "Moon", "Star", "Cloud"] },
        { name: "Shapes",           color: "blue",   items: ["Circle", "Square", "Heart", "Oval"] },
        { name: "Ocean animals",    color: "purple", items: ["Shark", "Whale", "Crab", "Octopus"] },
      ],
    },
    {
      name: "Princess Power",
      emoji: "👑",
      groups: [
        { name: "Frozen",          color: "yellow", items: ["Elsa", "Anna", "Kristoff", "Hans"] },
        { name: "Gabby's Dollhouse", color: "green", items: ["Gabby", "Pandy Paws", "MerCat", "DJ Catnip"] },
        { name: "Dresses can be…",  color: "blue",   items: ["Sparkly", "Pink", "Twirly", "Frilly"] },
        { name: "Royal things",    color: "purple", items: ["Crown", "Castle", "Throne", "Wand"] },
      ],
    },
    {
      name: "Game On",
      emoji: "⚽",
      groups: [
        { name: "Soccer words",  color: "yellow", items: ["Goal", "Pass", "Team", "Net"] },
        { name: "Outer space",   color: "green",  items: ["Planet", "Rocket", "Comet", "Moon"] },
        { name: "Taekwondo",     color: "blue",   items: ["Belt", "Punch", "Block", "Bow"] },
        { name: "Body parts",    color: "purple", items: ["Arm", "Leg", "Hand", "Foot"] },
      ],
    },
    {
      name: "Snack Attack",
      emoji: "🍦",
      groups: [
        { name: "Ice cream flavours", color: "yellow", items: ["Vanilla", "Chocolate", "Strawberry", "Mint"] },
        { name: "Breakfast foods",    color: "green",  items: ["Pancake", "Waffle", "Cereal", "Toast"] },
        { name: "Pizza toppings",     color: "blue",   items: ["Cheese", "Pepperoni", "Mushroom", "Olive"] },
        { name: "Cold drinks",        color: "purple", items: ["Juice", "Milk", "Water", "Soda"] },
      ],
    },
    {
      name: "Story Stars",
      emoji: "📚",
      groups: [
        { name: "Calvin and Hobbes", color: "yellow", items: ["Calvin", "Hobbes", "Susie", "Moe"] },
        { name: "Wimpy Kid",         color: "green",  items: ["Greg", "Rowley", "Manny", "Rodrick"] },
        { name: "Gabby's Dollhouse", color: "blue",   items: ["Gabby", "Pandy", "MerCat", "Catnip"] },
        { name: "Pokémon",           color: "purple", items: ["Pikachu", "Eevee", "Snorlax", "Charizard"] },
      ],
    },
    {
      name: "Wild Things",
      emoji: "🦁",
      groups: [
        { name: "Jungle animals", color: "yellow", items: ["Lion", "Tiger", "Monkey", "Zebra"] },
        { name: "Pets",           color: "green",  items: ["Dog", "Cat", "Hamster", "Goldfish"] },
        { name: "Birds",          color: "blue",   items: ["Robin", "Eagle", "Owl", "Parrot"] },
        { name: "Bugs",           color: "purple", items: ["Ant", "Bee", "Spider", "Ladybug"] },
      ],
    },
    {
      name: "Minecraft Master",
      emoji: "⛏️",
      groups: [
        { name: "Tools",       color: "yellow", items: ["Pickaxe", "Axe", "Shovel", "Hoe"] },
        { name: "Ores",        color: "green",  items: ["Diamond", "Gold", "Iron", "Coal"] },
        { name: "Biomes",      color: "blue",   items: ["Desert", "Jungle", "Taiga", "Swamp"] },
        { name: "Scary mobs",  color: "purple", items: ["Witch", "Ghast", "Blaze", "Phantom"] },
      ],
    },
    {
      name: "Weather Wonders",
      emoji: "🌦️",
      groups: [
        { name: "Seasons",    color: "yellow", items: ["Spring", "Summer", "Fall", "Winter"] },
        { name: "Weather",    color: "green",  items: ["Rain", "Snow", "Fog", "Thunder"] },
        { name: "Winter fun", color: "blue",   items: ["Sled", "Snowman", "Skating", "Mittens"] },
        { name: "Beach day",  color: "purple", items: ["Sand", "Wave", "Shell", "Towel"] },
      ],
    },
    {
      name: "Things That Go",
      emoji: "🚗",
      groups: [
        { name: "On the road",  color: "yellow", items: ["Car", "Truck", "Bus", "Bike"] },
        { name: "In the sky",   color: "green",  items: ["Plane", "Rocket", "Helicopter", "Balloon"] },
        { name: "On the water", color: "blue",   items: ["Boat", "Canoe", "Ship", "Raft"] },
        { name: "On a track",   color: "purple", items: ["Train", "Tram", "Subway", "Trolley"] },
      ],
    },
    {
      name: "Dino Days",
      emoji: "🦕",
      groups: [
        { name: "Dinosaurs",    color: "yellow", items: ["T-Rex", "Stego", "Raptor", "Bronto"] },
        { name: "Prehistoric",  color: "green",  items: ["Fossil", "Amber", "Bones", "Egg"] },
        { name: "Big & scary",  color: "blue",   items: ["Roar", "Teeth", "Claws", "Tail"] },
        { name: "Ways to move", color: "purple", items: ["Stomp", "Chomp", "Swim", "Fly"] },
      ],
    },
    {
      name: "Rhyme Time",
      emoji: "🎵",
      groups: [
        { name: "Rhymes with CAT", color: "yellow", items: ["Hat", "Bat", "Mat", "Rat"] },
        { name: "Rhymes with DOG", color: "green",  items: ["Log", "Frog", "Hog", "Fog"] },
        { name: "Rhymes with BEE", color: "blue",   items: ["Tree", "Key", "Sea", "Knee"] },
        { name: "Rhymes with CAKE",color: "purple", items: ["Lake", "Snake", "Rake", "Bake"] },
      ],
    },
    {
      name: "Body & Face",
      emoji: "🙂",
      groups: [
        { name: "On your face",  color: "yellow", items: ["Nose", "Eye", "Ear", "Mouth"] },
        { name: "On your hand",  color: "green",  items: ["Thumb", "Palm", "Knuckle", "Nail"] },
        { name: "Bendy joints",  color: "blue",   items: ["Elbow", "Knee", "Wrist", "Ankle"] },
        { name: "Inside you",    color: "purple", items: ["Heart", "Brain", "Lungs", "Bones"] },
      ],
    },
    {
      name: "Around the House",
      emoji: "🏠",
      groups: [
        { name: "In the kitchen",  color: "yellow", items: ["Fork", "Spoon", "Plate", "Cup"] },
        { name: "In the bedroom",  color: "green",  items: ["Bed", "Pillow", "Lamp", "Blanket"] },
        { name: "In the bathroom", color: "blue",   items: ["Soap", "Towel", "Brush", "Sink"] },
        { name: "Rooms",           color: "purple", items: ["Garage", "Attic", "Hallway", "Closet"] },
      ],
    },
    {
      name: "Sweet Treats",
      emoji: "🍭",
      groups: [
        { name: "Candy",        color: "yellow", items: ["Lollipop", "Gummy", "Chocolate", "Taffy"] },
        { name: "Baked goodies",color: "green",  items: ["Cookie", "Cupcake", "Brownie", "Muffin"] },
        { name: "Cold desserts",color: "blue",   items: ["Popsicle", "Sundae", "Sorbet", "Gelato"] },
        { name: "Tastes",       color: "purple", items: ["Sweet", "Sour", "Salty", "Bitter"] },
      ],
    },
    {
      name: "Super Heroes",
      emoji: "🦸",
      groups: [
        { name: "Superpowers", color: "yellow", items: ["Flying", "Strength", "Speed", "Invisible"] },
        { name: "Hero gear",   color: "blue",   items: ["Cape", "Mask", "Shield", "Belt"] },
        { name: "Bad guys",    color: "green",  items: ["Villain", "Robot", "Alien", "Monster"] },
        { name: "Save the day",color: "purple", items: ["Rescue", "Fight", "Protect", "Win"] },
      ],
    },
    {
      name: "Garden Grow",
      emoji: "🌻",
      groups: [
        { name: "Flowers",     color: "yellow", items: ["Rose", "Tulip", "Daisy", "Lily"] },
        { name: "Veggies",     color: "green",  items: ["Carrot", "Pea", "Corn", "Bean"] },
        { name: "In the dirt", color: "blue",   items: ["Seed", "Root", "Worm", "Bug"] },
        { name: "Garden tools",color: "purple", items: ["Rake", "Hose", "Shovel", "Gloves"] },
      ],
    },
    {
      name: "Music Makers",
      emoji: "🎸",
      groups: [
        { name: "String instruments", color: "yellow", items: ["Guitar", "Violin", "Harp", "Cello"] },
        { name: "You blow them",      color: "green",  items: ["Flute", "Trumpet", "Tuba", "Whistle"] },
        { name: "You hit them",       color: "blue",   items: ["Drum", "Cymbal", "Bell", "Xylophone"] },
        { name: "Music words",        color: "purple", items: ["Note", "Beat", "Song", "Tune"] },
      ],
    },
    {
      name: "Opposites",
      emoji: "↔️",
      groups: [
        { name: "Size words",  color: "yellow", items: ["Big", "Small", "Tall", "Short"] },
        { name: "Feeling hot & cold", color: "green", items: ["Hot", "Cold", "Warm", "Cool"] },
        { name: "Fast or slow",color: "blue",   items: ["Fast", "Slow", "Quick", "Lazy"] },
        { name: "Up & down",   color: "purple", items: ["Up", "Down", "High", "Low"] },
      ],
    },
    {
      name: "Job Squad",
      emoji: "👩‍🚒",
      groups: [
        { name: "They help you", color: "yellow", items: ["Doctor", "Nurse", "Dentist", "Vet"] },
        { name: "Keep us safe",  color: "green",  items: ["Police", "Firefighter", "Guard", "Lifeguard"] },
        { name: "At school",     color: "blue",   items: ["Teacher", "Principal", "Coach", "Librarian"] },
        { name: "They build & fix", color: "purple", items: ["Builder", "Plumber", "Farmer", "Chef"] },
      ],
    },
    {
      name: "Camping Trip",
      emoji: "🏕️",
      groups: [
        { name: "Bring these",   color: "yellow", items: ["Tent", "Sleeping bag", "Flashlight", "Backpack"] },
        { name: "By the fire",   color: "green",  items: ["Marshmallow", "Logs", "Sparks", "Smoke"] },
        { name: "In the woods",  color: "blue",   items: ["Trail", "River", "Rock", "Deer"] },
        { name: "Night sky",     color: "purple", items: ["Stars", "Moon", "Owl", "Bat"] },
      ],
    },
    {
      name: "Rainbow Colours",
      emoji: "🌈",
      groups: [
        { name: "Warm colours",  color: "yellow", items: ["Red", "Orange", "Yellow", "Pink"] },
        { name: "Cool colours",  color: "green",  items: ["Blue", "Green", "Purple", "Teal"] },
        { name: "Shades of grey",color: "blue",   items: ["Black", "White", "Grey", "Silver"] },
        { name: "Sparkly stuff", color: "purple", items: ["Gold", "Glitter", "Shine", "Gem"] },
      ],
    },
  ];

  const MAX_MISTAKES = 4;

  /* ---------- saved progress (per puzzle): "won" | "lost" | undefined ---------- */
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
    playControls: $("play-controls"), nextControls: $("next-controls"),
    next: $("next-btn"), retry: $("retry-btn"),
  };

  /* ---------- live state ---------- */
  let pi = 0;
  let tiles = [];        // {item, group, solved}
  let selected = [];     // items currently selected
  let solvedGroups = []; // group objects already found
  let mistakes = 0;
  let over = false;

  function shuffle(arr) {
    const a = arr.slice();
    for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; }
    return a;
  }
  function show(section) {
    el.puzzles.classList.toggle("hidden", section !== "puzzles");
    el.play.classList.toggle("hidden", section !== "play");
  }
  function groupOf(item) {
    return PUZZLES[pi].groups.find((g) => g.items.indexOf(item) !== -1);
  }

  /* ---------- picker ---------- */
  function renderPuzzles() {
    el.puzGrid.innerHTML = "";
    PUZZLES.forEach((p, i) => {
      const status = saved["p" + i];
      const card = document.createElement("button");
      card.type = "button";
      card.className = "puz-card" + (status === "won" ? " solved" : "");
      card.innerHTML =
        '<span class="pz-emoji" aria-hidden="true">' + p.emoji + "</span>" +
        "<h3>" + p.name + "</h3>" +
        '<span class="pz-progress">' +
          (status === "won" ? "Solved ✓" : status === "lost" ? "Try again!" : "16 cards") +
        "</span>";
      card.addEventListener("click", () => startPuzzle(i));
      el.puzGrid.appendChild(card);
    });
  }

  /* ---------- play ---------- */
  function startPuzzle(i) {
    pi = i;
    selected = [];
    solvedGroups = [];
    mistakes = 0;
    over = false;
    const items = [];
    PUZZLES[i].groups.forEach((g) => g.items.forEach((it) => items.push(it)));
    tiles = shuffle(items);
    el.feedback.textContent = "";
    el.playControls.classList.remove("hidden");
    el.nextControls.classList.add("hidden");
    renderSolved();
    renderBoard();
    renderLives();
    show("play");
  }

  function renderSolved() {
    el.solved.innerHTML = "";
    solvedGroups.forEach((g) => {
      const row = document.createElement("div");
      row.className = "solved-row";
      row.style.background = COLORS[g.color] || COLORS.purple;
      row.innerHTML =
        '<div class="grp-name">' + g.name + "</div>" +
        '<div class="grp-items">' + g.items.join(" · ") + "</div>";
      el.solved.appendChild(row);
    });
  }

  function renderBoard() {
    el.board.dataset.solution = JSON.stringify(PUZZLES[pi].groups.map((g) => g.items)); // play-test hook
    el.board.innerHTML = "";
    tiles.forEach((item) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tile" + (selected.indexOf(item) !== -1 ? " selected" : "");
      b.textContent = item;
      b.dataset.item = item;
      b.addEventListener("click", () => toggle(item, b));
      el.board.appendChild(b);
    });
    el.submit.disabled = over || selected.length !== 4;
  }

  function renderLives() {
    if (over) return;
    const left = MAX_MISTAKES - mistakes;
    el.lives.innerHTML = "Guesses left: " +
      '<span class="dot">' + "💜".repeat(left) + "🖤".repeat(mistakes) + "</span>";
  }

  function toggle(item, btn) {
    if (over) return;
    const idx = selected.indexOf(item);
    if (idx !== -1) { selected.splice(idx, 1); btn.classList.remove("selected"); }
    else {
      if (selected.length >= 4) return;
      selected.push(item); btn.classList.add("selected");
    }
    el.submit.disabled = selected.length !== 4;
  }

  function flash(msg, color) { el.feedback.style.color = color; el.feedback.textContent = msg; }

  function submit() {
    if (over || selected.length !== 4) return;
    // does the selection exactly match a group?
    const g = PUZZLES[pi].groups.find((grp) =>
      selected.every((it) => grp.items.indexOf(it) !== -1)
    );
    if (g) {
      solveGroup(g);
      return;
    }
    // not a group — is it "one away" (3 share a group)?
    let best = 0;
    PUZZLES[pi].groups.forEach((grp) => {
      const n = selected.filter((it) => grp.items.indexOf(it) !== -1).length;
      if (n > best) best = n;
    });
    mistakes += 1;
    if (window.SFX) SFX.nope();
    // shake the selected tiles
    [...el.board.children].forEach((b) => {
      if (selected.indexOf(b.dataset.item) !== -1) {
        b.classList.remove("wrong"); void b.offsetWidth; b.classList.add("wrong");
      }
    });
    if (mistakes >= MAX_MISTAKES) { flash("Out of guesses! Here are the answers 💛", "var(--pink)"); endGame(false); }
    else if (best === 3) { flash("So close — just one card off! 🤏", "var(--pink)"); renderLives(); }
    else { flash("Not a group — try again! 💪", "var(--pink)"); renderLives(); }
  }

  function solveGroup(g) {
    solvedGroups.push(g);
    // pop animation on the matched tiles, then remove from board
    [...el.board.children].forEach((b) => {
      if (g.items.indexOf(b.dataset.item) !== -1) b.classList.add("pop");
    });
    tiles = tiles.filter((it) => g.items.indexOf(it) === -1);
    selected = [];
    flash("Yes! " + g.name + " 🎉", "var(--green)");
    if (window.SFX) SFX.good();
    setTimeout(() => {
      renderSolved();
      renderBoard();
      if (solvedGroups.length === PUZZLES[pi].groups.length) endGame(true);
    }, 350);
  }

  function endGame(won) {
    over = true;
    el.submit.disabled = true;
    saved["p" + pi] = won ? "won" : "lost";
    save();
    // swap the play buttons for "what next?" choices
    el.playControls.classList.add("hidden");
    el.nextControls.classList.remove("hidden");
    el.retry.classList.toggle("hidden", won);
    const more = nextUnsolved() !== -1;
    el.next.textContent = more ? "Next puzzle ▶" : "🔗 All puzzles";
    if (won) {
      if (window.SFX) SFX.win();
      window.Confetti && Confetti.burst({ count: 100 });
      flash("🏆 You found all four groups! Amazing!", "var(--green)");
      el.lives.textContent = "Solved with " + (MAX_MISTAKES - mistakes) + " guesses to spare!";
    } else {
      // reveal every remaining group
      const found = new Set(solvedGroups);
      PUZZLES[pi].groups.forEach((g) => { if (!found.has(g)) solvedGroups.push(g); });
      tiles = [];
      renderSolved();
      renderBoard();
      el.lives.textContent = "Tap a puzzle to try again — you'll get it! 💪";
    }
    renderPuzzles();
  }

  // the next puzzle the kid hasn't beaten yet, searching forward from here
  function nextUnsolved() {
    for (let k = 1; k <= PUZZLES.length; k++) {
      const j = (pi + k) % PUZZLES.length;
      if (saved["p" + j] !== "won") return j;
    }
    return -1;
  }

  /* ---------- buttons ---------- */
  el.next.addEventListener("click", () => {
    const j = nextUnsolved();
    if (j === -1) { renderPuzzles(); show("puzzles"); }
    else startPuzzle(j);
  });
  el.retry.addEventListener("click", () => startPuzzle(pi));
  el.submit.addEventListener("click", submit);
  el.deselect.addEventListener("click", () => { if (!over) { selected = []; renderBoard(); } });
  el.shuffle.addEventListener("click", () => { if (!over) { tiles = shuffle(tiles); renderBoard(); } });
  el.quit.addEventListener("click", () => { renderPuzzles(); show("puzzles"); });

  /* ---------- go ---------- */
  renderPuzzles();
  show("puzzles");
})();
