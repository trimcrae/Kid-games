# Craepets at home

Standalone test URL: https://trimcrae.github.io/Kid-games/house-test/

This page is intentionally absent from the arcade registry and home page. It
includes `noindex,nofollow,noarchive`; that is a search-engine request, not
authentication. GitHub Pages and this repository remain public.

Control your own Craepet in third person with WASD or arrows. Move the mouse to aim
without dragging; starting the game captures the pointer. Hold Shift to move faster,
press E to choose a nearby activity, R for rooms, and F for family.
Escape releases the mouse and pauses. Touch devices have a movement pad and
drag-to-look. The Rooms menu offers directions (without teleporting) and quick
jumps to each floor and yard. Family pets and the activity hosts wander on their
own, follow collision boundaries and give the player space. Doors and the
upper stair gate are held open in the browser export. There is no analytics,
account, network service, or runtime CDN dependency.

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
the offline Blender fur renders. Equipped furniture appears as pet-sized
pieces in the living-room collection; changing wall/floor styles also colours
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
bounded set of practical lights provide depth. Adaptive resolution targets 30 fps;
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
python models/house/export_walkthrough.py
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
