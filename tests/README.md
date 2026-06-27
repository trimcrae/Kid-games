# 🎮 Play-tests for the McRae Family Arcade

A little robot that **plays every game** in a real browser at three screen
sizes — **Desktop, iPad and iPhone** — and shouts if anything is broken.

It's the automated version of the "serve it and click through it" check in
[`CLAUDE.md`](../CLAUDE.md): start a game, press the buttons, and make sure
it actually works with no errors.

## What it checks

For **every game** (and the landing page), at **each of the three sizes**:

- ✅ loads with **no JavaScript / console errors**
- ✅ makes **no failed network requests** (missing files, etc.)
- ✅ **fits the screen** — nothing spills off the right edge (a classic phone bug)
- ✅ **actually plays**, e.g.
  - **Bubble Pop** — bubbles appear and popping the right number scores
  - **Color Grid** — typing a word adds it; starter words load; chips delete
  - **Princess Dress-Up** — correct answers reveal outfit pieces
  - **Spooky Stories** — a book opens, pages turn, and the story finishes
  - **Comic Maker** — stickers add, drag, talk-bubbles, new pages and Undo work
  - **Math Mob Run** — the run starts, steering moves you, the shop is coin-gated
  - **Spelling Bee** — a hive opens and a valid word is accepted & counted
  - **Connections** — picking a correct group of four locks it in
  - **Word Guess** — a guess is scored with green/yellow/grey colour clues
  - **Word Strands** — tracing a theme word's path registers it as found
  - **Crossword** — filling every cell with the answer solves the puzzle

## How to run it

```bash
cd tests
npm install      # one-time — downloads playwright-core
npm test
```

You'll see a ✓ for each game/size and a final summary. The command exits with
status **0** when everything passes and **1** if anything fails, so it also
works as a pre-merge / CI gate.

### Notes

- The harness starts its **own** little web-server, so you don't need to run
  `python3 -m http.server` separately.
- It uses the **Chromium that comes with Playwright**. If you'd rather point it
  at a Chrome you already have, set `CHROMIUM_PATH`:

  ```bash
  CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm test
  ```

- The three "devices" are emulated (viewport size, touch, mobile user-agent) in
  Chromium. That catches layout and interaction bugs, but for the final word on
  real iOS Safari quirks, a quick check on an actual iPad/iPhone is still worth
  it.

> This folder is the **only** part of the repo with a dependency. The games
> themselves stay pure HTML/CSS/vanilla JS with no build step — `node_modules`
> here is just for the test robot and is git-ignored.
