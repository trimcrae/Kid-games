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
    ['build.py', 'upstairs.py', 'extensions.py'])).hexdigest()
assert scene['generator_sha256'] == expected_hash == inventory['generator_sha256'], 'Stale model'
assert scene.unit_settings.system == 'METRIC'
assert scene.camera.data.type == 'ORTHO'
assert len(scene.objects) == inventory['objects']
assert len({entry['name'] for entry in inventory['assets']}) == len(inventory['assets']), 'Duplicate asset identities'
assert len([o for o in scene.objects if o.type == 'CAMERA']) == 19
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
            'Lower bathroom white vanity', 'Covered front porch slab']
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

for view in inventory['cameras']:
    path = HERE / 'previews' / (view + '.png')
    assert path.exists() and path.stat().st_size > 10000, 'Missing render: ' + view
print(f'PASS: reopened model; {len(scene.objects)} objects, {len(inventory["assets"])} asset groups; '
      f'{len(inventory["cameras"])} cameras/previews; confirmed hall/bath orientation and clear corridor; '
      'no external images/libraries; no game registration.')
