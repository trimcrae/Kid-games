# Guidance for Claude Code agents working in this repo

This file is read automatically by Claude Code. Follow it on every task.

## ⭐ Branching & merging — ALWAYS MERGE TO MAIN

**Every change must end up on `main`.** Do your work on a feature branch if
one is assigned, but you are **not finished until the work is merged into
`main` and `main` is pushed to origin.** Do not leave changes parked on a
feature branch waiting for a human to merge.

Standard flow:

```bash
# 1. develop on your branch and commit
git checkout -b <feature-branch>   # if not already on it
git add -A && git commit -m "…"

# 2. merge into main
git checkout main
git pull origin main               # get latest first
git merge --no-ff <feature-branch>

# 3. push main
git push -u origin main
```

GitHub Pages deploys from `main`, so merging to `main` is what actually
publishes a game to the live site (https://trimcrae.github.io/kid-games/).

You do **not** need to open a pull request unless the user explicitly asks
for one — merging straight to `main` is the expected workflow here.

## About this project

The McRae Family Arcade — a collection of free, browser-based **educational**
games for the kids, served as static files on GitHub Pages. No build step, no
dependencies, no logins.

- **Every game must teach something** (counting, letters, spelling, shapes,
  music, geography, logic, storytelling, …). Put what it teaches in the blurb.
- Plain HTML/CSS/vanilla JS only. No frameworks, no bundlers.
- Big tap targets, bright colours; must work with finger, mouse, or trackpad.

## How to add a game

1. Create a folder under `games/` (copy `games/_template/` to start).
2. Build `index.html` (+ a `.js` file if needed) inside it. Link the shared
   stylesheet at `../../assets/css/style.css` and reuse its classes/variables.
3. Register it by adding a block to the top of `assets/js/games.js`
   (the `GAMES` list) — that's the only file that controls the menu.
4. Save browser state with `localStorage` so kids keep their progress.

## The kids (tailor games to them)

- **Jeannie** (7) — strong reader (~4th grade) → words, vocabulary, stories.
- **Cory** (6) — loves math, grids & Minecraft (~4th-grade math) → number,
  logic & grid games.
- **Ellie** (3) — loves dresses & princesses → bright letter/colour/counting.
- **Kieran** — the baby 👶.

## Verify before you finish

Serve locally and click through the change (a headless browser check is great):

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

Confirm there are no console/JS errors and the new game both renders and
appears on the landing page before merging to `main`.
