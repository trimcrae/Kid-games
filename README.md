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
└── games/
    ├── _template/          ← copy this folder to start a new game
    └── bubble-pop/         ← our first game 🫧
```

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

Designed with big tap targets, bright colours, and games that work with a finger,
a mouse, or a trackpad.

## 🛠️ Running locally (optional)

Just open `index.html` in a browser. For everything to work exactly like the live
site, you can serve the folder with any static server, e.g.:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```
