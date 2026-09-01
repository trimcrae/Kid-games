# 🎮 The McRae Family Arcade

A little collection of **educational** browser games made for our kids — built to run
for free on **GitHub Pages**, playable on any phone, tablet, or computer. No installs,
no logins.

> 🎓 **Ground rule:** every game should teach something — counting, letters, spelling,
> shapes, music, geography, logic… learning disguised as fun.

👉 **Live site:** `https://trimcrae.github.io/kid-games/`
*(enable Pages once — see below — and it goes live automatically on every push.)*

---

## 📁 How it's laid out

```
.
├── index.html              ← the arcade landing page
├── .nojekyll               ← tells GitHub Pages to serve files as-is
├── assets/
│   ├── css/style.css       ← shared look & feel for every page
│   └── js/
│       ├── games.js        ← ⭐ the LIST of games (edit this to add one)
│       └── app.js          ← builds the cards (you won't need to touch this)
├── games/
│   ├── _template/          ← copy this folder to start a new game
│   ├── craepets/           ← adopt & raise a learning pet 🥚
│   ├── bubble-pop/         ← our first game 🫧
│   ├── crossword/          ← themed mini crosswords ✏️
│   ├── strands/            ← trace hidden theme words 🧶
│   ├── spelling-bee/       ← make words from a honeycomb 🐝
│   ├── connections/        ← sort 16 cards into 4 groups 🔗
│   └── word-guess/         ← a kid-friendly Wordle 🟩
└── tools/                  ← offline puzzle generators (Node) for
                              crossword & strands — run, then paste output
```

> **🥚 Craepets** is the big one: a virtual-pet world where the whole
> economy runs on learning. You adopt a pixel creature, then every coin
> you spend on its food, toys, books and paint brushes was earned by
> answering a question — maths at the Berry Farm, words at the Word Well,
> science and geography at the Rainbow Pool, and any of the three in the
> Quiz Arena. It has **five learning levels** (Tiny → Grown-up) so the
> toddler and the grown-ups can play the same game, and **every person on
> the device gets their own pet, coins and trophy case**. What you do with
> the coins is a lesson too: **furnish your own house** (each piece really
> does slow boredom, speed up sleep or earn extra XP), **open your own shop**
> and set your own prices — everybody else in the family sees your shelf in
> their Market and buys from it, and the coins land in your purse — and take
> a **free spin of the prize wheel** every day, which is eight equal slices
> and tells you the odds every time it stops.
> The questions **heat up** as you get better (five right in a row turns a
> subject up a rung: bigger sums, more coins, and at the top a peek at the
> level above), the **Shadow Tower** is an endless climb through The Shade's
> army to The Shade himself, and the little levels are **read aloud in a real
> storyteller's voice** — every line is in `games/craepets/lines.js` and
> rendered by the audio pipeline in `tools/`.
> The pet is also a *pet*: **dress it up** in pixel hats, glasses and scarves
> (drawn straight onto the sprite, so it wears them in the arena and on the
> family board), **grant its wishes** ("I'd love a blueberry!" — read it, do
> it, get paid), **read the diary** it writes about its day and write in it
> yourself, **post presents** with a note to anyone else in the family or
> **visit their house** to see their room and their pet, and watch the window
> fill with stars after dark — the valley follows the real clock. Every
> species has **favourite foods and a favourite place** (worth reading the
> card for), the pet **wanders about its room** and grows with every level,
> and the **photo booth** makes a picture of it to keep.
> There is a **painted map** you tap to travel, **petpets** (a pet for your
> pet, trotting along behind it), a **bank** that pays 3% a night (the
> compounding lesson, told in numbers a child can check), **random events**
> on the paths, and **Sky Catch** — a proper arcade mini-game where you run
> your Craepet under the falling sky and catch only what the rule asks for
> (even numbers, primes, vowels, the letter A, the stars), at your level.
> **Memory Match** is the second game in the games room (pairs are a sum
> and its answer, an animal and its baby, a word and its opposite, a
> country and its capital), the **weather** changes daily and rains on the
> window, every place has a **named shopkeeper** with something to say,
> and new players get a **first-steps** list that pays as they go.

> **NYT-style games for the kids:** Crossword, Word Strands, Spelling Bee,
> Connections and Word Guess are friendly versions of the New York Times
> daily games. Crossword & Strands puzzles are built by the small Node
> generators in `tools/` — to add a theme, add a word/clue list there and
> re-run it (no randomness, so the output is stable to paste in).

---

## ➕ How to add a new game (the easy way)

1. **Copy** the `games/_template/` folder and rename it, e.g. `games/dino-run/`.
2. **Build** your game inside that folder (`index.html`, plus a `.js` file if you like).
3. **Add it to the menu** by opening `assets/js/games.js` and adding a block at the top:

   ```js
   {
     title: "Dino Run",                  // name on the card
     emoji: "🦖",                        // a fun icon
     blurb: "Add numbers to keep running!",  // what it teaches
     url:   "games/dino-run/",           // the folder you made
     ages:  "7+",                        // who it's for
     color: "#3ddc84",                   // card highlight colour
     ready: true                         // false = shows "Coming soon"
   },
   ```

4. **Save, commit, push.** It's live in about a minute. 🎉

> Tip: set `ready: false` to park an idea on the page as a "Coming soon" card
> before the game itself exists.

---

## 🚀 One-time setup: turn on GitHub Pages

1. Go to the repo on GitHub → **Settings** → **Pages**.
2. Under **Build and deployment → Source**, choose **Deploy from a branch**.
3. Pick branch **`main`** and folder **`/ (root)`**, then **Save**.
4. Wait ~1 minute, then visit the URL shown at the top of that Pages screen.

That's it — every future push to `main` redeploys automatically.

---

## 🧒 Made for

- **Jeannie** (7) — loves reading, reads at ~4th-grade level → word & vocabulary games
- **Cory** (6) — loves math, grids & Minecraft, ~4th-grade math → number, logic & grid games
- **Ellie** (3) — loves dresses & princesses → bright letter/colour/counting games
- **Kieran** — the baby 👶 (here for the snuggles)
- **Shannon** — mum 👩, and a player in her own right: the grown-up level
  in Craepets is real vocabulary, mental maths and general knowledge

Designed with big tap targets, bright colours, and games that work with a finger,
a mouse, or a trackpad.

## 🛠️ Running locally (optional)

Just open `index.html` in a browser. For everything to work exactly like the live
site, you can serve the folder with any static server, e.g.:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## 🧪 Play-testing the games

There's an automated play-tester in [`tests/`](tests/) that opens **every game**
in a real browser at **Desktop, iPad and iPhone** sizes and checks each one
loads with no errors, fits the screen, and actually plays:

```bash
cd tests
npm install   # one-time
npm test
```

See [`tests/README.md`](tests/README.md) for details. The games themselves stay
dependency-free — the test robot is the only thing that uses `npm`.
