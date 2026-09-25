# Craepets at home

Standalone test URL: https://trimcrae.github.io/Kid-games/house-test/

This page is intentionally absent from the arcade registry and home page. It
includes `noindex,nofollow,noarchive`; that is a search-engine request, not
authentication. GitHub Pages and this repository remain public.

Control your own Craepet in third person with the arrow keys: ↑/↓ walk forward
and back, and ←/→ turn. Hold Shift to run, press Space to jump, E to use what is
nearby, R for rooms, M for the Marauder's Map, F for family and C to say hello.
Escape pauses. The mouse clicks buttons and panels; moving or dragging it does
not steer the view. Touch devices have a movement pad, a 🐾 jump button and
swipe to look. Every pet is drawn at `PET_SCALE` (`creatures.mjs`), dog-sized
against the real-size furniture.

**Jumping** (`Body` in `physics.mjs`) clears about 89 cm, so the pet hops up
onto every bed, couch and table in the house but not the kitchen worktops, and
steers in the air so a kid can aim at the cushions. Walking off the edge of the
table it climbed drops it back to the floor; it will only walk off a drop of up
to 1.2 m of its own accord, and a jump won't carry it over a storey-high drop,
past the edge of the lawn or through a seam in the exported floor.
A petpet trots at the pet's heel but jumps and lands a beat after it, with
its own take-off and landing squash and quicker steps (`petpet-follow.mjs`,
`tests/house-petpet-follow.mjs`); a moth, wisp or starling drifts up after it.
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
- **Things to use** (`interactions.mjs`, `E`): a pill says what E does
  here. Swing on the back-yard swings, bounce on the trampoline (hold ↓ to
  stop), get in either car and drive it out of the garage and down the
  street (↑ accelerates, ↓ brakes then reverses, ←/→ steer, Space honks,
  E gets out; it parks where you leave it). Steering eases in and centers
  when released; lifting off the accelerator coasts to a stop. On touch
  screens the pad drives and steers, with partial pressure controlling speed,
  and the action button becomes a horn. A wider, smoothly turning driving
  camera shows more of the car and road; walking tips stay hidden while seated.
  It is a toy car, so it rides up onto anything flat up to
  80 cm — kerbs, the porch, bushes, the bus-stop bench — and drives
  straight over any *thing* lower than 110 cm (chairs, steps, bins, the
  toy house); only walls, sills, fences and rails, tall things (poles,
  trees, the mailbox, the swing frame, the other car) and the brink of the
  world stop it. Meeting a wall at an angle projects motion along its surface
  rather than making the car dart sideways; a direct impact stops it, and
  reversing backs it away. Small physics steps keep handling consistent at
  different frame rates. The
  engine is a quiet low hum that is silent while it stands still.
  Open the fridge (both doors swing out on the snacks), play the piano in
  the family room (1–8 or A–K play C to C, with the note named), switch the
  televisions and ceiling fans on, rock in the rocking chairs and flush the
  toilets. The parts that move come out of the export as their own draw
  groups and collision boxes tagged with a prop key (`props` in
  `house.json`); sounds are a tiny WebAudio synth, nothing downloaded.
  Swing on the sunroom monkey bars (`hang-bar.mjs`), set the Roomba going by
  the family-room fireplace (`roomba.mjs`), play today's Yoto Daily on the
  Yoto player in each kid's room (`yoto.mjs`).
- **Sleep in any bed** (`beds.mjs`, `E` beside or on a bed, including the
  crib, the bassinet and both bunks): the pet climbs on, curls up and sleeps
  under dimmed lights while its energy fills a little each second (through
  `HouseActivity.rest` in `engine.js`, so the game's save and its Rest wish
  see it); it wakes by itself once rested, or on E or any arrow, and lands
  back beside the bed. The Marauder's Map shows it asleep. Beds are found
  from the export's mattress boxes, so a new bed in `build.py` is a bed here.
- **The living-room computer** (`monitor.mjs`) is playing Craepets: its
  screen shows the very frame you are looking at, one frame behind, so the
  screen is on the screen and so on into the glow (the post pass's own frame
  texture on one quad; no second render).
- **Lighting** (`lighting.mjs`, `sky.mjs`, `materials.mjs`, `post-aa.mjs`):
  a game shading tier, warm room light with soft shadows, contact shadows,
  time of day and weather matching the HUD clock, and FXAA.
- **The sky** (`sky.mjs`): one shader, no textures. Over the time-of-day
  gradient it draws drifting cumulus (noise clouds lit on the sun side and
  shaded where thick; the game's weather sets the cover, so a cloudy or
  rainy day is a grey blanket and a windy one races), a bright sun with its
  glow, and after dark a cratered moon, a halo and twinkling stars. Colours
  per phase and cover per weather live in `lighting.mjs` (`PHASES.clouds`,
  `CLOUDS`). Still under `prefers-reduced-motion`.
- **The jungle** (`jungle.mjs`): the exported yard ends at the property
  line, so beyond the back fence and the side plantings there is now an
  imaginary rainforest, code-drawn like Craepet Street: palms, broad canopy
  trees, giant emergents with buttress roots, banana plants, ferns,
  flowering bushes, hanging lianas and five parrots on the crowns nearest
  the garden; a thinner scatter beside the front lawn and behind the
  cottages, misty hills on the horizon all round, and a ground plane so no
  direction ends in the void. Tree crowns and flowering bushes use clusters
  of individual folded leaves with open, irregular silhouettes; palms have
  feathered fronds and the canopy trees have bent, tapered branches.
  Everything is merged into four vertex-coloured draw calls (about 511k
  triangles), casts and takes the
  sun's shadow, follows the exterior dim and leaf fill after dark, and the
  leaves sway in the vertex shader. Nothing in it collides or is walkable;
  routes, the Marauder's Map and the camera guard are untouched. It is not
  the real neighbourhood.
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
### Baked bounce light (first iteration)

The Kitchen, Living room, Dining room and Ellie's bedroom carry Cycles-baked
bounce light: day and night lightmaps plus a lightmap UV per vertex. The
format and bake are described in `models/house/README.md`.

- **Loader.** `baked-light.mjs` checks the manifest's `bakedLight` block, the
  mesh hash, the vertex count, the file hashes and the image sizes. Its files
  download alongside the mesh. A ready house waits at most 3 s more for them
  (`?bakegrace=`); a missing, stale or broken bake just means the usual light,
  with a console warning. Any failure stops the other downloads and releases
  decoded images.
- **Shader.** In `materials.mjs` (`HOUSE_BAKED`), a baked fragment's
  bounce-light term replaces the ambient sky/fill guess, and the house AO
  isn't applied a second time there. Direct sun, sky and lamps stay live.
  Moving parts, the overlapping wall pairs, metals and the visible main
  ceiling stay unbaked, like every other room.
- **Time of day.** `lighting.mjs` blends day and night by phase and dims the
  day bake a little when overcast. Gains are calibrated from matched captures:
  day 0.75, night half of that again. For QA, `?bake=0` turns the bake off and
  `?bakegain=`, `?bakenight=`, `?phase=` and `?weather=` override the
  settings.
- **Caching.** The manifest is fetched by release, and the mesh, AO and
  lightmaps by their own hashes, so a new manifest never meets an old file
  from a browser or offline cache.
- **Tests.** `tests/house-baked-light.mjs`, `house-baked-light-data.mjs`,
  `house-baked-light-browser.cjs` and `models/house/test_browser_lightmap.mjs`.
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
screens are hidden (the game has its own Help → backups). The top bar, the pause
card and any loading or 3D failure offer **Back to the Craepets game**, which
finishes the current activity and saves first.

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
