# Photo orientation audit — September 6, 2026

Reviewed all 40 original photographs against the room renders and generator.
Photo numbers follow README: original 1–10, upstairs U1–U10, additional
V1–V10, basement/garage W1–W10. Original photos remain private and are not
included in this repository. This audit establishes visible relationships;
it does not establish measured room dimensions or the exterior footprint.

## Corrections

| References | Visible evidence | Model correction |
| --- | --- | --- |
| V8, W10, V9–V10 | Pink shelving, wall art and the road rug are visible through the **left** doorway beside the bathroom in V8. The homeowner confirms exactly two bedrooms and the bathroom share this entry. | Pink bedroom left, bathroom ahead, white-curtain bedroom right. The earlier identification of the dark right doorway as the pink room was wrong. Rotate rooms without reflecting their furniture; align real openings with the common entry. |
| W10 | Two windows meet in the far-left corner when entering; bed pillows are at the left wall, pink shelving on the far wall, wood dresser near the right side of entry. | Turn the bed toward the left wall and place the room on the correct side of the entry. Retain the window/shelving/dresser handedness and clear space inside the doorway. |
| U8, V1 | Main-bed pillows are against the right wall; TV and dresser occupy the adjoining wall. The reverse view shows the bassinet near the entry side. | Turn the bed a quarter turn; move the bassinet clear of its side and the entry furniture. |
| U7, U10 | Trellis curtain on the far wall, bookcase farther right, second window on the right wall; bed projects into the room from that right side. | Turn the bed to project from the right window wall. Exact head/foot positioning is less certain than the wall relationship because bedding obscures it. |
| 6, W1–W3; homeowner | W3 shows the kitchen glass cupboard to the left of the garage door and coat hooks to its right. W1 shows the black vehicle left of the burgundy one from the kitchen end; W2 shows the glazed outside door on the right wall. | Connect garage at the end of the sink wall. Adjust estimated cabinet widths to leave an actual doorway; remove the inferred end cabinet. Keep vehicle and exterior-door handedness. |
| W6–W8 | From the basement entrance, monitors continue leftward along the same wall as the dryer, sink and washer. Looking down the office aisle, desks are right and storage left. | Move the office onto the laundry wall, turn the storage to face the aisle, and leave the aisle clear of fabric screens. |
| W4–W5 | Foosball table at the foreground/left of the bunk bed in W4; slide beside the bunk and bookcase visible in the reverse view W5. | Move the table and correct the review camera so table/bunk ordering agrees; keep the main fixed play furniture. |
| V4–V5 | Rocking chairs sit against the siding and face toward the open porch. | Turn both porch chairs away from the siding. Their previous fronts faced the wall. |

## Relationships retained after review

| References | Relationship checked |
| --- | --- |
| 1–5 | Entering sunroom: gym/playhouse left; wicker seating and floor lamp right; three glazed sides and the house-side wall. |
| 6–8, V3 | From dining facing the red front door: stairs/storage left, kitchen/living right. Kitchen fridge/range on the left return; sink/dishwasher on the adjoining wall. Living-room front windows are left of the sofa/mirror wall; piano is toward the kitchen partition. |
| 9–10, U1–U2 | Parallel stair flights: upstairs left, downstairs right when approached from the main room. Fireplace ahead downstairs and blue sofa/window wall right. |
| U3–U5; homeowner | Green bathroom is first left from the top of the straight upstairs hall. Vanity/toilet left and tub right on entering the bathroom. |
| U6, U10, V1 | Nursery right of upstairs hall: wood chest left of its window, white chest right, crib along right wall; primary room opposite, end bedroom ahead. |
| U9, V2 | Ensuite accessed from primary room; shower at the far end. Vanity/toilet along one side, window on the opposite side, visible in the mirror in V2. Exact ensuite position within the exterior envelope remains estimated. |
| V4–V5 | Looking out the front door: rocking chairs/siding right, railing/open lawn side left, steps and curving path ahead. |
| V6–V7 | Lower family room: fireplace opposite the main-floor return; sofa/window wall right from the stairs. Piano and gym cushion/bar are near the stair end. |
| W9 | Basement flight descends beside the flight back to the living room; this doorway is separate from the three-room entry in V8. |

## Review views and checks

- `lower_entry` reproduces the left/bathroom/right ordering of V8.
- `kitchen_access` shows cupboard/garage-opening/hooks ordering from W3.
- `basement_entry` and `basement_office` expose the W8 and W6 wall relationships.
- `pink_bedroom`, `primary`, `bedroom`, `lower_bedroom` show corrected bed and window directions.
- `verify.py` checks these left/right relationships, bed axes, all three
  downstairs doorways, the kitchen/garage passage, and the office aisle,
  in addition to the existing stair, upstairs hall and deliverable checks.

The basement zones' absolute rotation beneath the house, the lower hall's
precise offset from the stair bay, exterior walls/roof, room sizes and door
spacing still need a floor plan or measurements. They are estimates, even
where the photo-relative furniture direction is now checked.
