"""Export the saved house into a compact, self-contained browser mesh.

Run with the same bpy Python as build.py. Source .blend stays fully editable.
World-space geometry is grouped by material/room to reduce draw calls. Selected
furniture keeps one-segment bevels and corner normals. Explicit finish and
practical-light descriptions drive code-authored browser shaders; the browser
never loads reference photographs or footage.
"""
import array
import gzip
import hashlib
import json
from pathlib import Path
import math
import sys
import bpy
from mathutils import Matrix, Vector

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from browser_materials import material_finish, keep_bevel, practical_light
OUT = HERE.parent.parent / 'house-test'
OUT.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(HERE/'house.blend'))
scene = bpy.context.scene
for c in bpy.data.collections:
    c.hide_viewport = c.hide_render = False
beveled_objects = 0
for o in scene.objects:
    o.hide_set(False)
    detail = o.type == 'MESH' and keep_bevel(o.name,
        o.users_collection[0].name if o.users_collection else '',
        tuple(o.dimensions), len(o.data.vertices))
    has_bevel = False
    for modifier in list(o.modifiers):
        if detail and modifier.type == 'BEVEL':
            modifier.segments = 1
            modifier.harden_normals = True
            has_bevel = True
        elif not (detail and modifier.type == 'WEIGHTED_NORMAL'):
            o.modifiers.remove(modifier)
    beveled_objects += int(has_bevel)
    if o.type == 'CURVE':
        o.data.bevel_resolution = 0
        o.data.resolution_u = 2
bpy.context.view_layer.update()

def xyz(v):
    return [round(v.x,5),round(v.z,5),round(-v.y,5)]

# Open the entry leaf and a sliding sunroom panel for continuous walking.
# Frames stay at their doorway; this affects only the testing export.
front_asset = bpy.data.objects['Red three-panel front door']
local_hinge = Vector((.49, 0, 0))  # half the local-X width of the .98 m slab
hinge = front_asset.matrix_world @ local_hinge
hinge_axis = front_asset.matrix_world.to_quaternion() @ Vector((0, 0, 1))
front_open = (Matrix.Translation(hinge) @ Matrix.Rotation(math.pi/2, 4, hinge_axis)
              @ Matrix.Translation(-hinge))
groups = {}
colliders = []
lights = []
sunlight = None
for obj in scene.objects:
    if obj.type != 'LIGHT':
        continue
    lamp = obj.data
    direction = obj.matrix_world.to_quaternion() @ Vector((0, 0, -1))
    if lamp.type == 'SUN' and obj.name == 'Soft daylight sun':
        sunlight = {'direction': xyz(direction), 'color': list(lamp.color),
                    'intensity': lamp.energy}
    elif practical_light(obj.name, lamp.type, lamp.energy):
        lights.append({'name': obj.name, 'type': lamp.type.lower(),
                       'position': xyz(obj.matrix_world.translation),
                       'direction': xyz(direction), 'color': list(lamp.color),
                       'power': round(lamp.energy, 3),
                       'size': round(lamp.size if lamp.type == 'AREA' else
                                     lamp.shadow_soft_size, 3),
                       'angle': round(lamp.spot_size / 2, 4) if lamp.type == 'SPOT' else 1.35})
depsgraph = bpy.context.evaluated_depsgraph_get()
source_objects = 0
for o in scene.objects:
    if o.type not in {'MESH','CURVE'} or o.get('export') is False:
        continue  # render-only dense leaves; coarse clusters stand in
    cname = o.users_collection[0].name
    if 'label' in cname.lower() or cname.startswith('15 |'):
        continue
    parent = o.parent.name if o.parent else ''
    matrix = o.matrix_world.copy()
    if parent == 'Red three-panel front door' and 'white' not in o.name.lower():
        matrix = front_open @ matrix
    if parent == 'Sunroom rear sliding bay 04':
        matrix = Matrix.Translation((-1.06,0,0)) @ matrix
    if parent == 'White upper stair safety gate':
        hinge = o.parent.matrix_world @ Vector((-.53,0,0))
        matrix = Matrix.Translation(hinge) @ Matrix.Rotation(math.pi/2,4,'Z') @ Matrix.Translation(-hinge) @ matrix
    # These are lightweight internal curtains and do not block a person.
    no_collision = any(s in o.name.lower() for s in [
        'curtain','blind','shade','pleat','sloped ceiling','sloped header','soffit',
        'leafy','net strand','quilt','pillow','duvet','ceiling fan','roof'])
    evaluated = o.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    if not mesh or not mesh.polygons:
        if mesh: evaluated.to_mesh_clear()
        continue
    mesh.calc_loop_triangles()
    verts = [matrix @ v.co for v in mesh.vertices]
    normal_matrix = matrix.to_3x3().inverted().transposed()
    materials = list(o.data.materials)
    for tri in mesh.loop_triangles:
        mat = materials[min(tri.material_index,len(materials)-1)] if materials else None
        matname = mat.name if mat else 'Default'
        color = list(mat.diffuse_color[:3]) if mat else [.65,.65,.6]
        key = (cname,matname)
        if key not in groups:
            finish = material_finish(mat)
            groups[key] = {'name': cname+' / '+matname,'color':color,
                           'glass':finish['surface'] == 'glass',
                           'finish':finish,'values':array.array('f')}
        values = groups[key]['values']
        for i, loop in zip(tri.vertices, tri.loops):
            # Vertex averages erase hard edges and weighted bevel normals.
            n = normal_matrix @ mesh.corner_normals[loop].vector
            n.normalize()
            values.extend(xyz(verts[i])+xyz(n))
    if o.type == 'MESH' and not no_collision:
        mn = Vector(tuple(min(v[i] for v in verts) for i in range(3)))
        mx = Vector(tuple(max(v[i] for v in verts) for i in range(3)))
        size = mx-mn
        # Omit cosmetic trim; preserve glass, walls, floors, stairs and furniture.
        if size.z>.018 and max(size.x,size.y)>.18 and min(size.x,size.y)>.023:
            colliders.append({'name':o.name,'min':[mn.x,mn.z,-mx.y],
                              'max':[mx.x,mx.z,-mn.y]})
    source_objects += 1
    evaluated.to_mesh_clear()

blob = bytearray()
manifest = {'version':2,'generator':scene['generator_sha256'],
            'exporter':hashlib.sha256((HERE/'export_walkthrough.py').read_bytes() +
                                      (HERE/'browser_materials.py').read_bytes()).hexdigest(),
            'sourceObjects':source_objects,'groups':[],'colliders':colliders,
            'lights':lights,'sunlight':sunlight,'beveledObjects':beveled_objects,
            'note':'Estimated photo study. Browser export opens the front door and rear sliding panel.'}
for group in groups.values():
    values = group.pop('values')
    group['offset'] = len(blob)
    group['count'] = len(values)//6
    blob.extend(values.tobytes())
    manifest['groups'].append(group)
manifest['meshSha256'] = hashlib.sha256(blob).hexdigest()
with gzip.GzipFile(filename=str(OUT/'house.mesh.gz'),mode='wb',mtime=0) as f:
    f.write(blob)
(OUT/'house.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n',encoding='utf-8')
print('EXPORTED',source_objects,'objects;',len(groups),'draw groups;',
      len(blob)//24,'vertices;',len(colliders),'collision boxes;',
      (OUT/'house.mesh.gz').stat().st_size,'compressed bytes',flush=True)
