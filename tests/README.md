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
  - **Word Bridge** — the hand-drawn sprite sheet bakes, nonsense answers are
    refused, a real answer lays one plank per letter and walks the character
    forward, a whole race runs to the island (and takes a proper handful of
    answers) and pays coins, the shop changes the bridge skin, and Tap mode
    works for the pre-readers
  - **Crossword** — every puzzle opens with a real grid and clues, and filling
    every cell with the answer solves it
  - **The Post Office** — Ellie writes Cory a letter with quick words, a
    sticker and typed text, posts it, and it's waiting in Cory's mailbox with
    the flag up; he opens the envelope (greeting, message, closing, signature
    and a postmark all there), writes back, and the stamp lands in his album;
    Ellie's Sent tray shows it was opened and the mail survives a reload
  - **Word Strands** — every hunt's grid is fully lettered (catches bad
    generator output before the kids find it)
  - **Music Lab** — a song plays through key-by-key and is remembered, and
    Free Play, Echo, Find the Note & Read Music all score
  - **World Trek** — the world map and all 50 states build, continents,
    oceans, states & capitals score, and the Atlas reads a place out
  - **Craepets** — every sprite bakes, the Farm/Well/Pool pay for maths, words
    and world knowledge, the market asks for your change, a duel is won, a
    house is bought and furnished (and the furniture shows up in the nest),
    the prize wheel pays once a day and refuses a second spin, a shop is
    stocked at a price you set — and one player buying from another's shelf
    really does move the coins between their two saves. It also guards the
    ways a pet can be *washed*: soap is on the shelf every single day, the
    Pool washes bars up for free, a pet with a completely empty bag can
    still be rinsed clean, and a toast can never cover a sheet's Close button.
    Then the newer half of the valley: a food wish and a play wish are
    granted and paid, every hat, pair of glasses and scarf draws on every
    creature and a bought one goes on (and comes off) the pet, the window
    fills with stars at 10pm, the diary fills up and takes a written entry,
    and Shannon posts Cory a cookie that he finds waiting at his nest. A
    Zibbit's favourite popcorn is worth more joy than bread and the Farm is
    announced as its favourite place, the pet walks where it is pointed,
    Cory visits Shannon's house without touching her save, and the photo
    booth makes a real PNG. A petpet is bought, named and follows behind;
    the bank takes 100, pays 3 overnight and gives 103 back; a random event
    pays; Sky Catch starts, scores a right catch, ends and pays; and the
    map's markers really go places (the family's houses included).
    On Halloween a garland hangs, a present gives a pumpkin hat and every
    answer pays extra; autumn grows pumpkins and stocks a seasonal shelf;
    Advent counts the sleeps, it snows on Christmas Day, and a hatch-day
    gets a cake and a party hat. Memory Match is dealt and solved and pays, the first-steps list ticks
    off what was done, and rain streaks the window and pays extra at the Pool. The help sheet opens, a valley saved as a file loads back exactly (and a
    bad file is refused), and starting over needs the pet's name typed. A new pet is an egg that hatches after three right answers (or eight
    taps for a toddler), the Valley Times front page is printed, and the
    family records board credits the right pet
  - **Baby Taps** — the targets stay baby-sized (big!) on every screen, a tap
    pops & names a thing, the pit refills, and the count is saved
  - **Landing page** — the kid filter (every kid, baby included, has games)
    and the 🎲 Surprise me button, which must land on a real game

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
