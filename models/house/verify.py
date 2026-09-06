"""Reopen the saved Blender model and validate the deliverable, without rebuilding."""
import hashlib
import json
import math
from pathlib import Path

import bpy

HERE = Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(HERE / 'house.blend'))
scene = bpy.context.scene
inventory = json.loads((HERE / 'inventory.json').read_text(encoding='utf-8'))
expected_hash = hashlib.sha256(b''.join((HERE / name).read_bytes() for name in
    ['build.py', 'upstairs.py', 'extensions.py', 'basement_garage.py'])).hexdigest()
assert scene['generator_sha256'] == expected_hash == inventory['generator_sha256'], 'Stale model'
assert scene.unit_settings.system == 'METRIC'
assert scene.camera.data.type == 'ORTHO'
assert len(scene.objects) == inventory['objects']
assert len({entry['name'] for entry in inventory['assets']}) == len(inventory['assets']), 'Duplicate asset identities'
assert len([o for o in scene.objects if o.type == 'CAMERA']) == 29
assert 'START HERE - House study' in bpy.data.texts
assert not bpy.data.libraries, 'Unexpected linked library'
assert not [im for im in bpy.data.images if im.source == 'FILE'], 'Unexpected external image'
required = ['Wooden indoor climbing gym', 'Wicker sunroom loveseat', 'French-door refrigerator',
            'Double basin sink and gooseneck faucet', 'Dark wood dining table',
            'Main oatmeal three-seat sofa', 'Upright wood piano',
            'Parallel split-level stair bay', 'Fireplace with white surround and wood mantel',
            'White slatted nursery crib', 'Wood nursery rocking chair', 'Primary double bed',
            'End bedroom single bed', 'Green tile bathtub', 'White bathroom vanity',
            'Ensuite toilet', 'Primary open closet', 'Lower bedroom single bed',
            'Lower bathroom white vanity', 'Covered front porch slab',
            'Basement return staircase', 'Basement foosball table', 'Basement metal bunk bed',
            'Basement dual monitors', 'Basement top loading washer', 'Basement front loading dryer',
            'Basement laundry utility sink', 'Basement furnace and plenum',
            'Basement wall mounted water heater', 'Garage black SUV', 'Garage burgundy SUV',
            'Garage glazed side door', 'Pink bedroom double bed']
for name in required:
    obj = bpy.data.objects.get(name)
    assert obj is not None and obj.type == 'EMPTY', name
    assert obj.children, 'Empty furniture asset: ' + name
    assert obj.get('reference_photos'), 'Missing provenance: ' + name
for obj in scene.objects:
    assert all(math.isfinite(v) for row in obj.matrix_world for v in row), obj.name
    if obj.type == 'MESH':
        assert obj.data.vertices and obj.data.polygons, 'Empty mesh: ' + obj.name
for name in ['03 | Cutaway walls - enable for enclosure', '14 | Ceilings - hidden for dollhouse']:
    assert bpy.data.collections[name].hide_render
    assert bpy.data.collections[name].hide_viewport
registry = (HERE.parent.parent / 'assets/js/games.js').read_text(encoding='utf-8')
assert 'models/house' not in registry and 'house.blend' not in registry

# Photo-derived spatial constraints, independent of the generator's transforms.
# Blender does not evaluate world transforms for collections hidden on load.
# Expose the connected bedroom for these read-only position checks.
bpy.data.collections['39 | Pink curtain bedroom'].hide_viewport=False
bpy.data.objects['Basement staircase sloped ceiling'].hide_set(False)
bpy.context.view_layer.update()
def position(name):
    return bpy.data.objects[name].matrix_world.translation
upper = [o.matrix_world.translation for o in scene.objects if o.name.startswith('Upper stair carpet tread')]
lower = [o.matrix_world.translation for o in scene.objects if o.name.startswith('Lower stair carpet tread')]
assert len(upper) == len(lower) == 7
assert max(p.x for p in upper) - min(p.x for p in upper) > 1.5, 'Upper stairs must run sideways (+X)'
assert max(p.x for p in lower) - min(p.x for p in lower) > 1.5, 'Lower stairs must run sideways (+X)'
assert max(p.y for p in upper) - min(p.y for p in upper) < .01
assert min(p.y for p in upper) > max(p.y for p in lower), 'Up must be camera-left looking into the side wing'
assert abs(min(p.x for p in upper) - min(p.x for p in lower)) < .05, 'Flights should start together'
assert position('Fireplace with white surround and wood mantel').x > max(p.x for p in lower)
assert position('Lower blue sofa').y < position('Fireplace with white surround and wood mantel').y, 'Lower seating is to the right when descending'
assert position('Main oatmeal three-seat sofa').x < 1
assert position('Large framed living room mirror').x < .15, 'Mirror belongs on outside wall perpendicular to front windows'
assert position('Child-sized blue sofa').y < 1
assert position('Upright wood piano').y > 3.7, 'Piano belongs at the kitchen partition'
fridge, stove = position('French-door refrigerator'), position('Stainless range and oven')
sink, dishwasher = position('Double basin sink and gooseneck faucet'), position('Stainless dishwasher')
assert abs(fridge.y - stove.y) < .15 and 4.4 < fridge.y < 5.2
assert abs(sink.x - dishwasher.x) < .15 and sink.x < .6
assert position('Wooden indoor climbing gym').x < position('Wicker sunroom loveseat').x

def screen_x(camera_name, object_name):
    camera = bpy.data.objects['Camera | ' + camera_name]
    local = camera.matrix_world.inverted() @ position(object_name)
    assert local.z < 0, 'Photo anchor is behind camera: ' + object_name
    return local.x / -local.z

# Photo 7: storage/stairs left, entry in the middle, living and kitchen right.
assert screen_x('entry', 'Multi-drawer dining storage cabinet') < screen_x('entry', 'Red three-panel front door')
assert screen_x('entry', 'Red three-panel front door') < screen_x('entry', 'Main oatmeal three-seat sofa')
assert screen_x('entry', 'Red three-panel front door') < screen_x('entry', 'French-door refrigerator')
# Photo 8: windows left, main sofa/mirror ahead, piano toward the right.
assert screen_x('living', 'Front living left window') < screen_x('living', 'Large framed living room mirror')
assert screen_x('living', 'Large framed living room mirror') < screen_x('living', 'Upright wood piano')

# Homeowner: hallway goes straight from the upper flight, bathroom immediately left.
hall = position('Upstairs oak hallway')
assert abs(hall.y - upper[0].y) < .05
assert hall.x > max(p.x for p in upper)
assert position('Family bathroom doorway').y > hall.y + .5
assert position('Family bathroom doorway').x < position('Primary bedroom doorway').x
assert position('Primary bedroom doorway').y > hall.y
assert position('Blue nursery doorway').y < hall.y
assert position('End bedroom doorway').x > position('Blue nursery doorway').x
assert abs(position('End bedroom doorway').y - hall.y) < .01
assert abs(position('Green tile bathtub').z - (position('Primary double bed').z - .025)) < .001
assert position('Ensuite toilet').y > position('Primary double bed').y
assert position('Lower bedroom single bed').z < 0
assert position('Covered front porch slab').y == 0  # Group at origin; all porch children are in front.
assert all(o.matrix_world.translation.y < 0 for o in bpy.data.objects['Covered front porch slab'].children)
assert 'Upper closed white door' not in bpy.data.objects
# A straight corridor must not be blocked by the provisional door from v01.
depsgraph = bpy.context.evaluated_depsgraph_get()
from mathutils import Vector
hit = scene.ray_cast(depsgraph, Vector((11.05, hall.y, 2.0)), Vector((1, 0, 0)), distance=4.35)
assert not hit[0], 'Straight upper hall is obstructed by ' + (hit[4].name if hit[0] else '')

# W9: basement return descends beside the stairs up to the main floor.
basement = sorted([o.matrix_world.translation for o in scene.objects if o.name.startswith('Basement stair tread')], key=lambda p:p.x)
assert len(basement) == 12
assert basement[-1].x < 9.69 and basement[0].x < 7.8
assert all(b.z > a.z for a,b in zip(basement,basement[1:]))
assert basement[-1].y > lower[0].y, 'Basement flight belongs beside the main-floor return'
assert basement[-1].z < -1.05 and abs(basement[0].z - (-3.15)) < .04
for p in basement[:-1]:
    hit=scene.ray_cast(depsgraph,Vector((p.x,p.y,p.z+.03)),Vector((0,0,1)),distance=1.80)
    assert not hit[0], 'Basement stair headroom blocked by '+(hit[4].name if hit[0] else '')
assert position('Basement top loading washer').x > position('Basement laundry utility sink').x > position('Basement front loading dryer').x
assert abs(position('Basement top loading washer').y-position('Basement front loading dryer').y)<.05
assert position('Basement metal bunk bed').z < position('Lower bedroom single bed').z-1.5
assert position('Garage black SUV').x > position('Garage burgundy SUV').x
pink_door = position('Pink bedroom shared entry doorway')
assert 'Unseen lower room closed dark door' not in bpy.data.objects
white_door = position('Lower white bedroom shared entry doorway')
assert pink_door.x < 11.50 < white_door.x, 'V8: pink left, white-curtain room right'
assert position('Pink bedroom double bed').x < pink_door.x
assert position('Lower bedroom single bed').x > white_door.x
assert abs(position('Pink bedroom double bed').z-position('Lower bedroom single bed').z)<.01
assert 5.77 < pink_door.y < 6.63
# Walk from the common entry into all three rooms at ankle, waist and head height.
for z in [-.85,-.05,.75]:
    for start,end in [((11.45,5.70,z),(12.75,5.70,z)),
                      ((11.45,6.15,z),(9.80,6.15,z)),
                      ((11.45,6.15,z),(11.45,7.00,z))]:
        direction=Vector(end)-Vector(start)
        hit=scene.ray_cast(depsgraph,Vector(start),direction.normalized(),distance=direction.length)
        assert not hit[0], 'Shared downstairs entry blocked by '+(hit[4].name if hit[0] else '')

# Orientation audit: constraints read directly from all four photo sets.
def head_direction(name):
    return (bpy.data.objects[name].matrix_world.to_3x3() @ Vector((0,1,0))).normalized()
assert head_direction('Pink bedroom double bed').y < -.99, 'W10: pillows at the left wall on entry'
assert head_direction('Primary double bed').x > .99, 'U8: pillows at the right wall, not the TV wall'
assert head_direction('End bedroom single bed').y < -.99, 'U7: bed projects from the right window wall'
for name in ['Front porch wood rocking chair','Front porch white rocking chair']:
    facing=bpy.data.objects[name].matrix_world.to_3x3() @ Vector((0,-1,0))
    assert facing.x > .99, 'V4: porch chairs must face away from the siding'
assert screen_x('lower_entry','Pink bedroom shared entry doorway') < screen_x('lower_entry','Lower bathroom white vanity') < screen_x('lower_entry','Lower white bedroom shared entry doorway')
assert screen_x('nursery','Nursery wood drawer chest') < screen_x('nursery','Nursery window') < screen_x('nursery','Nursery white tall chest')
assert screen_x('nursery','White slatted nursery crib') > screen_x('nursery','Nursery window')
assert screen_x('bathroom','White bathroom vanity') < screen_x('bathroom','Green tile bathtub')
assert screen_x('basement_play','Basement foosball table') < screen_x('basement_play','Basement metal bunk bed')
assert abs(position('Basement dual monitors').y-position('Basement front loading dryer').y)<.05, 'W8: office continues along laundry wall'
assert screen_x('basement_entry','Basement dual monitors') < screen_x('basement_entry','Basement front loading dryer')
assert screen_x('basement_office','Basement metal storage shelving') < screen_x('basement_office','Basement dual monitors')
hit=scene.ray_cast(depsgraph,Vector((6.50,6.60,-2.05)),Vector((-1,0,0)),distance=4.40)
assert not hit[0], 'W6 office aisle blocked by '+(hit[4].name if hit[0] else '')
assert screen_x('kitchen_access','Kitchen glass cupboard') < screen_x('kitchen_access','Kitchen garage connecting doorway')
# W3 passage is checked at several heights, including where cabinets used to block it.
for z in [.15,.85,1.65]:
    hit=scene.ray_cast(depsgraph,Vector((1.00,7.56,z)),Vector((-1,0,0)),distance=1.60)
    assert not hit[0], 'Kitchen garage passage blocked by '+(hit[4].name if hit[0] else '')

for view in inventory['cameras']:
    path = HERE / 'previews' / (view + '.png')
    assert path.exists() and path.stat().st_size > 10000, 'Missing render: ' + view
print(f'PASS: reopened model; {len(scene.objects)} objects, {len(inventory["assets"])} asset groups; '
      f'{len(inventory["cameras"])} cameras/previews; confirmed hall/bath orientation and clear corridor; '
      'no external images/libraries; no game registration.')
