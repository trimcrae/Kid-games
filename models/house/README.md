# House model — photo study, including upstairs

Open **[house.blend](house.blend)** in Blender 4.5 LTS or newer. It opens with
an overview camera and an editable model organized into room collections.
This is an architectural/furniture study, with approximate dimensions;
it is not a surveyed floor plan or a finished house reconstruction.

![Cutaway overview](previews/overview.png)

## What is modeled

| Area | Photo references | Included |
| --- | --- | --- |
| Sunroom | 1–5 | Three glazed sides, sliding frames and handles, house siding, ceiling panels, clean foam flooring, wooden climbing gym with monkey bars/ladder/net/holds/swing, green-roof playhouse, wicker loveseat/chair/table, arched shelf, two-cup floor lamp |
| Kitchen | 6 | L-shaped white raised-panel cabinets, glass cupboard, subway backsplash, patterned floor, stone counters, double sink and gooseneck faucet, French-door refrigerator, range/oven, microwave, dishwasher |
| Dining and entry | 6–7 | Dark dining table, estimated dining chairs, multi-drawer cabinet, entry chest, playpen, simplified gallery frames, thermostat, red three-panel front door |
| Living room | 7–8 | Oatmeal sofa and armchair, small blue sofa, white activity table, side table, TV/stand, lamps, large mirror, upright piano/bench, baby swing |
| Split-level stairs | 7, 9–10 | Parallel up/down flights, beige carpet, black iron rails with twisted details, white upper gate, upper landing and door |
| Lower family room | 9–10, V6–V7 | Carpet, timber wainscot, fireplace with white surround and mantel, TV, blue sofa, green floor cushion, tan armless seat, dark recliner, coffee table, cubbies and storage drawers, ceiling fan, side windows |

The second and third photo sets add:

| Area | References | Included |
| --- | --- | --- |
| Upstairs hall | U1, U10; homeowner directions | Straight from the upper landing; green bathroom first left, main bedroom left, nursery right, other bedroom at the end; oak floor and empty coat hooks |
| Green family bathroom | U3–U5 | Sea-green tub tile, pale accent band, white tap-wall patch, bathtub, chrome fittings, curtain, white vanity, basin, mirror, toilet, linen shelves and patterned floor |
| Blue nursery | U6 | Blue walls, blind and grey curtains, white crib, cushioned wood rocking chair, footstool, wood chest, white chest and closed drawer organizer |
| End bedroom | U7, U10 | Made single bed and folded colorful quilt, rug, trellis curtains, desk/drawers, narrow bookcase, ottoman, empty hammock and wall handles |
| Main bedroom and ensuite | U8–U9, V1–V2 | Made double bed, bassinet, dressers, hamper, closet shelf/rail and drawer units, TV and ceiling fan; separate shower, vanity, mirror, toilet, window and empty wall baskets |
| Lower bedroom and bathroom | V6, V8–V10 | Connecting hall, corner-window bedroom, made bed, bookcase, low cabinet, bedside drawers and curtained closet; bathroom with vanity, toilet and window |
| Lower-room additions | V6–V7 | Second piano, adjustable gymnastics bar and green floor cushion, rear-hall opening |
| Front porch | V4–V5 | Covered concrete porch, iron railings and steps, two rocking chairs, clean foam mats, mailbox and curved paver walk with a simple lawn base |

Photo numbering preserves the uploads: **1–10** is the original set;
**U1–U10** is the upstairs set ending with the hallway; **V1–V10** is the latest
set starting with the main-bedroom closet and ending with the lower bedroom.

Furniture is modeled as clean, assembled objects. Counters, dining and activity
tables are cleared. Loose toys, clothing, packages, papers, food, trash, and
people are omitted. Fixed play equipment and baby furniture are retained.
Picture frames use simple color inserts rather than copies of personal images.
The source photographs are neither committed nor packed into the Blender file.

## Views

- [Labeled floor plan](previews/plan.png)
- [Dining toward the entry and stair side, matching Photo 7](previews/entry.png)
- [Sunroom](previews/sunroom.png)
- [Kitchen](previews/kitchen.png)
- [Living room](previews/living.png)
- [Lower family room](previews/family.png)
- [Stairs](previews/stairs.png)
- [Upstairs cutaway](previews/upper_overview.png)
- [Labeled upstairs plan](previews/upper_plan.png)
- [Hall continuing straight from the stairs](previews/hall.png)
- [Green family bathroom](previews/bathroom.png)
- [Blue nursery](previews/nursery.png)
- [End bedroom](previews/bedroom.png)
- [Main bedroom](previews/primary.png)
- [Ensuite](previews/ensuite.png)
- [Front porch](previews/porch.png)
- [Lower bedroom](previews/lower_bedroom.png)
- [Lower bathroom](previews/lower_bathroom.png)

The preview images are actual Cycles renders of the committed geometry.
The `plan` camera shows the original main/lower layout with the upper rooms
hidden. `upper_plan` isolates upstairs. The overview includes all levels; the
upper floor naturally covers part of the lower family room in that view.

## Editing

Collections `01`–`14` separate floors, walls, windows, each room's furniture,
stairs, and ceilings. Collection `15` contains lights and cameras; `16` holds
labels that appear only in the plan view.
Collections `17`–`24` hold upstairs rooms and ceilings; `25`–`28` hold the porch
and additional lower rooms; `29` holds upstairs plan labels. For an open top
view keep ceiling collections `14`, `24` and `28` hidden. The generator's named
views automatically isolate the appropriate level and toggle ceilings.
Each furniture piece has a named parent empty: move/rotate that empty to move
the complete piece. Individual components and materials remain editable.
Reference photo numbers and confidence notes are stored on the parent empties.
The text block **START HERE - House study** is embedded in the `.blend` file.

For the default dollhouse view, collection `03 | Cutaway walls` and collection
`14 | Ceilings` are disabled in both the viewport and rendering. Enable both
toggles to view enclosed interiors, and choose an interior camera. The generator
sets these toggles automatically when rendering its named views.

All materials are procedural Blender materials. There are no linked libraries,
downloaded models, image textures, or required photo files.

## Scale and open questions

- Units are metres, with +Z up, the front toward -Y, the sunroom toward +Y,
  and the split-level side wing toward +X. These are model axes, not compass bearings.
- The main area is provisionally 7.8 × 8.0 m, the sunroom
  6.6 × 3.4 m, and the lower room 4.6 × 5.0 m. These are modeling estimates.
- Main floor elevation is 0 m, sunroom approximately -0.10 m, lower room
  -1.05 m, and upper landing +1.26 m. Stair counts/rises need measurement.
- The exact footprint, offsets, window widths, ceiling heights and sunroom bay
  count are not established by the photos. Upstairs room rectangles and the
  additional lower rooms are estimates; this is not an exterior footprint survey.
- The lower room's unseen corners, some chair shapes, dining seating, and
  piano/bench proportions are approximate. Repeated cabinetry and window
  details are simplified; this is not photogrammetry or a photoreal replica.
- Upstairs hall direction and the bathroom's side are confirmed. Room ordering
  follows U10, with the ensuite accessed from the main bedroom. Door spacing,
  room depths, closet width and overall exterior envelope need measurements.
- The lower hall's dark doorway remains closed with no invented room behind
  it. Lower bedroom/bathroom connections follow V6 and V8; dimensions are estimated.
- Exterior roofs beyond the front porch, unseen rooms, most landscaping and
  neighboring buildings remain unfinished. The lawn is a base for the front
  path; these additions do not establish a surveyed lot plan.

Most useful references for the next pass: a rough floor plan with room widths,
depths and doorway locations; stair counts; and reverse-angle room photos.

## Orientation evidence

Confirmed by the homeowner: standing in the dining area and facing the red
front door, both stair flights lead into the side wing on the left, and the
kitchen is on the right. The current model uses this orientation.

Also confirmed by the homeowner: **the upstairs hallway continues straight off
the stairs, and the green bathroom is on the left as you reach the top.** This
connects to the existing upper landing at +1.26 m in the model.

The model uses these additional relationships from the photos:

| Reference | Relationship used in the model |
| --- | --- |
| 7 | Facing the red door from dining, stairs and drawer storage are on the left; the living room and kitchen opening are on the right. The flights leave the side of the main floor. |
| 8 | Front windows and the child sofa occupy one wall. The main sofa and large mirror occupy the adjoining perpendicular outside wall. The piano sits toward the kitchen partition; the floor lamp is by that partition. |
| 6 | Looking from dining into the kitchen, the fridge and range are on the left/front partition; the sink and dishwasher turn onto the adjoining outside wall. |
| 9–10 | Facing the flights, upstairs is left and downstairs is right. Both travel into the same side wing. The fireplace is ahead downstairs, with the blue sofa, olive chair and windows along the right side. |
| 1, 4–5 | From the main-house doorway into the sunroom, the gym/playhouse are left and wicker seating is right. The house-side window sits left of the doorway. The visible exterior split-level extension continues on the right. |

Additional evidence:

- V6 clarifies that the green piece first modeled as an upright lounge chair is
  a low floor cushion by the gymnastics bar; the updated geometry replaces it.

- U10 and V1: main bedroom left, blue nursery right, trellis-curtain bedroom
  straight ahead; V1 shows the reverse view from the main bedroom to the nursery.
- U3–U5: vanity/toilet left of the bathroom entrance, bathtub right.
- U6: wood chest left of the nursery window, white chest right, rocker near the
  window and crib on the right-hand wall.
- U9 and V2: separate shower room off the main bedroom, with vanity, toilet,
  mirror, window and wall baskets visible in the second angle.
- V6 and V8–V10: piano and hall beside the stair return; lower bathroom ahead,
  bedroom left and a dark doorway to an unseen room right.

Dimensions remain estimates. The named room cameras and the two floor plans
make the modeled left/right relationships reviewable.

## Rebuilding and verification

From the repository root, using Blender 4.5 LTS:

```sh
blender --background --threads 8 --python models/house/build.py
blender --background --threads 8 --python models/house/build.py -- --render --samples 48
blender --background --python models/house/verify.py
```

Or use **Python 3.11** with the native Blender Python package:

```sh
python -m pip install bpy==4.5.3
python models/house/build.py -- --render --samples 48
python models/house/verify.py
```

`--views sunroom,kitchen` selects a subset of renders; `--views plan` renders the
top view. `--preview-scale 50 --samples 4` makes quick layout previews.
Rebuilding **replaces** `house.blend` and `inventory.json`, so
save manual edits under a different filename before regenerating. The script
uses a fixed random seed. `build.py` loads `upstairs.py` and `extensions.py`;
all three files contribute to the generator hash. `inventory.json` records it, Blender
version, object counts, cameras and furniture provenance.

This folder is an offline model asset. It has no game entry point, and nothing
is added to `assets/js/games.js`, the landing page, or service-worker precache.
