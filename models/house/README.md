# House model — first photo study

Open **[house.blend](house.blend)** in Blender 4.5 LTS or newer. It opens with
an overview camera and an editable model organized into room collections.
This is a first architectural/furniture pass, with approximate dimensions;
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
| Lower family room | 9–10 | Carpet, timber wainscot, fireplace with white surround and mantel, TV, blue sofa, olive chair, dark recliner, coffee table, cubbies and storage drawers, ceiling fan, side windows |

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

The preview images are actual Cycles renders of the committed geometry.
The model also contains a `plan` camera for looking straight down.

## Editing

Collections `01`–`14` separate floors, walls, windows, each room's furniture,
stairs, and ceilings. Collection `15` contains lights and cameras; `16` holds
labels that appear only in the plan view.
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
  count are not established by the photos. The side wing's unseen rear extension
  and upper rooms are unfinished; the model is not an exterior footprint survey.
- The lower room's unseen corners, some chair shapes, dining seating, and
  piano/bench proportions are approximate. Repeated cabinetry and window
  details are simplified; this is not photogrammetry or a photoreal replica.
- Upper rooms, the rest of the house, exterior roof/entry, garden and neighboring
  buildings are intentionally unfinished because the supplied coverage does not
  establish them. No invented full upper floor is included.

Most useful references for the next pass: a rough floor plan with room widths,
depths and doorway locations; stair counts; and reverse-angle room photos.

## Orientation evidence

Confirmed by the homeowner: standing in the dining area and facing the red
front door, both stair flights lead into the side wing on the left, and the
kitchen is on the right. The current model uses this orientation.

The model uses these additional relationships from the photos:

| Reference | Relationship used in the model |
| --- | --- |
| 7 | Facing the red door from dining, stairs and drawer storage are on the left; the living room and kitchen opening are on the right. The flights leave the side of the main floor. |
| 8 | Front windows and the child sofa occupy one wall. The main sofa and large mirror occupy the adjoining perpendicular outside wall. The piano sits toward the kitchen partition; the floor lamp is by that partition. |
| 6 | Looking from dining into the kitchen, the fridge and range are on the left/front partition; the sink and dishwasher turn onto the adjoining outside wall. |
| 9–10 | Facing the flights, upstairs is left and downstairs is right. Both travel into the same side wing. The fireplace is ahead downstairs, with the blue sofa, olive chair and windows along the right side. |
| 1, 4–5 | From the main-house doorway into the sunroom, the gym/playhouse are left and wicker seating is right. The house-side window sits left of the doorway. The visible exterior split-level extension continues on the right. |

Dimensions remain estimates; the named `entry`, `living`, `kitchen`, `stairs`
and `family` cameras make these left/right relationships reviewable. The model
does not infer a complete upper floor from the small landing view.

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
uses a fixed random seed. `inventory.json` records the generator hash, Blender
version, object counts, cameras and furniture provenance.

This folder is an offline model asset. It has no game entry point, and nothing
is added to `assets/js/games.js`, the landing page, or service-worker precache.
