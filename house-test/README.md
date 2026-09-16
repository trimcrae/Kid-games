# Craepets at home

Standalone test URL: https://trimcrae.github.io/Kid-games/house-test/

This page is intentionally absent from the arcade registry and home page. It
includes `noindex,nofollow,noarchive`; that is a search-engine request, not
authentication. GitHub Pages and this repository remain public.

Control your own Craepet in third person with WASD or arrows. Starting the game
(or clicking the view) captures the pointer, like any first-person game: the
cursor disappears and moving the mouse turns the view as far as you like.
Hold Shift to move faster, press Space to jump, E to choose a nearby activity, R for rooms,
M for the Marauder's Map and F for family. Escape releases the mouse and pauses. If a browser refuses
capture (some in-app or embedded browsers can), the footer says so, hold-and-drag
looking takes over, and a normal Chrome or Edge tab gives full mouse look.
Touch devices have a movement pad, a 🐾 jump button and drag-to-look. Every pet
is drawn at `PET_SCALE` (`creatures.mjs`), dog-sized against the real-size
furniture.

**Jumping** (`Body` in `physics.mjs`) clears about 89 cm, so the pet hops up
onto every bed, couch and table in the house but not the kitchen worktops, and
steers in the air so a kid can aim at the cushions. Walking off the edge of the
table it climbed drops it back to the floor; it will only walk off a drop of up
to 1.2 m of its own accord, and a jump won't carry it over a storey-high drop,
past the edge of the lawn or through a seam in the exported floor.
`models/house/test_walkthrough.mjs` replays those hops against the real
colliders at the same 30 fps the browser runs.

The house is presented as a lived-in game world rather than an architectural
study:
- **Follow camera** (`camera-guard.mjs`, `walkthrough.js`): a game lens chosen
  from the screen shape, about 25° above and behind the pet on the player's own
  sightline, turning exactly with the arrows. Walls only shorten the boom (it
  pulls in at once and eases back out); close in, the lens widens, the view
  tips up past the pet and the pet fades by how much of the screen it would
  cover. It never cranes up to look down from above. It still tests its sightline against the drawn
  triangles, so it never ends up behind a wall, floor, ceiling or window; it
  may look over low furniture only from well above it. Jumps arrive at a spot
  inside each room (`rooms.mjs`) with a clear view.
- **HUD** (`index.html`, `style.css`): a player chip, needs meters, a
  contextual action pill, one-off tips, a pause sheet, a Rooms travel board and
  paw-print directions (`wayfinding.mjs`) along a walkable route. Activity
  spots show small bubbles for the room you're in; there are no floor rings or
  floating signs.
- **Pets and neighbours** (`creatures.mjs`, `pet-behaviour.mjs`,
  `companions.mjs`, `aftermath.mjs`): rigged, furry creatures with faces,
  moods and needs you can see; the family's other adopted pets (only theirs:
  no shopkeepers or visitors) keep routines tied to real furniture (napping on
  their owners' beds at night), walk real routes between them and greet you.
  The house cats, **Bubba** (orange and white) and **Beebs** (black and
  white), live here whoever is playing (`HOUSE_CATS`): a four-legged body on
  the same rig, by day sitting side by side on the mat at the sunroom's back
  door watching the garden, at night curled up on the family's beds.
- **The Marauder's Map** (`marauders-map.mjs`, `M` or the 📜 button): a
  parchment plan of each floor drawn in ink from the walking boxes (floors,
  walls, furniture, room names), with everyone in the house — your pet, the
  family's pets and the cats — as paw prints that pad along where they've
  walked, under a name banner. It opens with the oath and closes with
  "Mischief managed".
- **The living-room computer** (`monitor.mjs`) is playing Craepets: its
  screen shows the very frame you are looking at, one frame behind, so the
  screen is on the screen and so on into the glow (the post pass's own frame
  texture on one quad; no second render).
- **Lighting** (`lighting.mjs`, `sky.mjs`, `materials.mjs`, `post-aa.mjs`):
  a game shading tier, warm room light with soft shadows, contact shadows,
  time of day and weather matching the HUD clock, and FXAA.
- **Frame cost** (`depth-prepass.mjs`, `gpu-timer.mjs`): a depth-only draw of
  the house's big surfaces before each frame, so hidden rooms and floors are
  never shaded; the GPU-timed resolution controller spends the saving on a
  sharper render scale (clean bevels and trim instead of dotted lines).
- **Dressing**: rugs, cushions, plants, kids' drawings, toys and wall pieces
  are code-drawn in `models/house/dressing.py` (walk-past props don't
  collide); Craepet Street's cottages are code-built in `neighborhood.mjs`.

The Rooms menu offers directions (without teleporting) and quick jumps to each
floor and yard. Doors and the upper stair gate are held open in the browser
export. There is no analytics, account, network service, or runtime CDN
dependency.

## Activities and save isolation

| Room | Craepets activities |
| --- | --- |
| Living room | Pet, egg, wishes, mail, review, celebrations, levels; furniture, homes and decorating |
| Kitchen | Food and favourite snacks |
| Back yard | Farm: maths and growing food |
| Mom & Dad's office | Word Well, reading books, bank deposits and withdrawals |
| Sunroom | Rainbow Pool: wonder questions, brushes and colours |
| Green bathroom | Washing and free rinses |
| Kieran's bedroom | Rest, pillows and energy |
| Mom & Dad's bedroom | Wardrobe |
| Cory's bedroom | Upstairs room and Cory's family pet |
| Family room | Toys and play |
| Basement playroom | Sky Catch and Memory Match |
| Garage | Market, rare stock and family shops |
| Front porch | Stocking and running your stall |
| Front yard | Arena, Shadow Tower, allies and rewards |
| Shared bedroom entry | Bag, petpets and other belongings |
| Dining room | Daily quests, gifts and prize wheel |
| Ellie's bedroom | Diary, writing, drawing and narration |
| Jeannie's bedroom | Trophies, records, family visits and gifting |
| Craepet street | Seven family plots: saved homes, decorating, visiting and presents |

### Steering: the arrow keys

On a desktop the pet is steered with the arrow keys only. ↑ walks forward, ↓
backs up, and ←/→ turn at about 110° a second. A tap turns a little, turning
stops the moment the key is let go, and ← with → cancels. Shift runs. E, R, F,
C and Esc work as before.

The mouse clicks buttons and panels and never steers: there is no pointer
capture, and moving or dragging over the view turns nothing. An old
`craepets.house.controls` preference from the mouse-look days is ignored.
Phones and tablets walk with the pad and swipe to look.

A lost window clears keys, the pad and speed. Tests:
`tests/house-keyboard-controls.cjs` and
`models/house/test_browser_house_controls.mjs`.
### Loading never waits for ever

`boot.js` is a classic script that runs even if the 3D modules never do.
`walkthrough.js` reports each loading step to it: the house plan, the rooms
(with download %), the lights and colours, the Craepets, and ready. If a step
goes quiet for 25 s the card says it is still working and offers **Try again**
and **Back to the Craepets game**. After 90 s without progress it says loading
has stopped. It still opens the house if the step then finishes. A part that
fails to download or throws while starting is explained straight away, with the
error kept in `window.houseBoot.errors` and the console. The shader warm-up is
only a head start, so it is capped at 40 s (then 3 s): three.js's
`compileAsync` otherwise waits for ever when a driver never reports a finished
compile. A lost WebGL context (a graphics reset) is explained with a reload
instead of leaving a blank house. `?bootwatch=fast` shortens the timings for
`tests/house-loading.cjs`.
### NEW: walking round the house from the Craepets game

The Craepets game (`games/craepets/`) now invites players to walk round the
house: a NEW card on the nest (until they have been, or tap "Maybe later") and a
**Walk** button beside Nest in the menu. Both open `house-test/?from=game`.
Nothing in the game was removed; the 3D house loads only when chosen.

Opened that way (game mode, `play-mode.mjs`, `save-mode.js`) the house plays on
the game's **own** saves: `craepets.who`, `craepets.v1.<who>` and
`craepets.voice`. The same player, pet, coins and things go there and back; nothing
is copied, the house edition's `craepets.house.*` saves are not touched, the
"Who's playing?" picker is skipped (the game already knows) and the save-transfer
screens are hidden (the game has its own Help → backups). The top bar (touch, or
with the mouse released), the pause card and any loading or 3D failure offer
**Back to the Craepets game**, which finishes the current activity and saves first.

Opened on its own (`house-test/`), it is the separate house edition exactly as
before, with its own saves; the notes below describe that mode.

Both engines follow a save made in another tab (`syncFromElsewhere` in
`craepets.js`, inherited by the fork): a tab left open never writes older progress
over newer, and a repaint after such a sync does not save straight back.
`tests/house-game-mode.cjs` covers the whole round trip.
`activity.html` and `engine.js` are a separate fork of the original game. They
reuse the original read-only content, art and audio. The original HTML, engine,
registry and saves are untouched. The iframe contains the activity widgets;
the old navigation is not rendered. Cross-room links return to walking with a
destination guide. The furnishing editor and family visits retain their small
room previews. Photos capture the actual 3D house.

On every visit, `save-copy.js` copies missing or empty family saves to
`craepets.house.v1.<profile>`. Profile choice, voice settings and last floor
position also use `craepets.house.*`. Per-profile reset flags prevent intentional
resets from bringing an original save back. An old global migration flag no longer
blocks newly discovered profiles. Existing house progress is never auto-overwritten.
Family → Load existing saves can deliberately restore complete original saves or
import a JSON backup, keeping a pre-import snapshot. `saves.html` exports all family
profiles from the original or house edition, for transfer between browsers/devices.
Browser storage cannot be read across browsers. Family gifts and shop transactions
stay inside the house edition. Backups/import/reset also remain in activity Help.

Seven code-built 3D species use each pet's palette (including patterned
palettes), equipment and petpet. The live models are simplified geometry, not
the offline Blender fur renders. Equipped furniture stands as pet-sized
pieces in fixed spots around the living room and foyer (`decor-slots.mjs`); changing wall/floor styles also colours
the main room. All original ownership, home capacity and furniture bonuses
remain in the activity engine.

Craepet Street is an imaginary extension beyond the front yard, with a walkable
doorway for every family profile. The houses show each saved resident's home name,
wall/floor colours and equipped furnishings. Entering your own opens the full home
collection/editor; visiting someone else opens their saved home and gifting controls.
Empty plots lead to save recovery. The common 3D shells are simplified street houses;
the activity preview retains each selected home's specific design. This extension
does not represent the actual neighboring properties.

The geometry comes from `models/house/house.blend`, with furniture and layout
revised against the private narrated walkthroughs. The browser retains selected
bevels and physical material properties, using shared code-generated finish tiles
for wood, cloth, stone and other surfaces. Sun shadows, room reflections and a
bounded set of practical lights provide depth. Baked ambient contact shading
adds gentle separation around furniture and corners. Adaptive resolution targets 30 fps;
slower hardware trades some sharpness for movement responsiveness. Blender's
Cycles previews remain the higher-quality rendering reference.
The source photographs, people, personal pictures, street addresses and
neighbouring homes are not included. Yard limits and unseen dimensions remain
estimates. Sampled connecting views from the walkthrough support the master
bathroom's closet-side attachment and rear window; its dimensions remain estimates.

## Rebuild

Run with a Python that has Blender's `bpy` module:

```sh
python models/house/build.py
python models/house/export_walkthrough.py -- --ao
node models/house/test_walkthrough.mjs
python -m http.server 8765
```

Visit `http://localhost:8765/house-test/`. The exporter produces a gzip-compressed
interleaved position/normal buffer, material groups and spatial collision boxes.
It never edits the source Blender file. Walking uses a spatial grid, wall
sliding and small movement steps; the floor height follows stair treads. This
uses a Craepet-sized collider; the original human-height collision tests remain
available. A swept camera sightline keeps the orbit camera in front of walls.

## Updating and verifying the game fork

Only run the clone generator when deliberately updating from the main game:

```sh
node house-test/make-activity-clone.cjs
node --check house-test/engine.js
node models/house/test_walkthrough.mjs
node tests/house-routes.mjs
node tests/house-saves.cjs
node tests/house-craepets.cjs
```

The browser test uses Playwright and a local server at port 8765. Install the
`playwright` package or expose the bundled runtime's node modules via
`NODE_PATH`. Set `CHROMIUM_PATH` for a browser outside the Windows Chrome
default, and `HOUSE_BASE` for another server. Screenshots are written under
`tests/house-*.png` and ignored by Git.

`house-routes.mjs` floods the real collision world from the front entry and
proves all 27 activity addresses are reachable on foot, including the basement and street.
The browser suite tests desktop and phone controls, room activity coverage,
learning rewards, care, buying, banking, games, battles, furniture, outfits,
diary writing, visits, stalls, family switching, autonomous roaming, save
migration and reload. It checks that original saves remain byte-for-byte
unchanged. The original tour stays outside the arcade registry.

The vendored rendering library is [Three.js r180](https://github.com/mrdoob/three.js/tree/r180),
under its included MIT license in `vendor/THREE-LICENSE.txt`.
