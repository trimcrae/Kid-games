"""Export the saved house into a compact, self-contained browser mesh.

Run with the same bpy Python as build.py. Source .blend stays fully editable.
World-space geometry is grouped by material/room to reduce draw calls. Tiny
bevels and procedural textures are omitted; furniture, curves and room shells
are retained. The browser never loads reference photographs.
"""
import array
import gzip
import hashlib
import json
from pathlib import Path
import math
import bpy
from mathutils import Matrix, Vector

HERE = Path(__file__).resolve().parent
OUT = HERE.parent.parent / 'house-test'
OUT.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(HERE/'house.blend'))
scene = bpy.context.scene
for c in bpy.data.collections:
    c.hide_viewport = c.hide_render = False
for o in scene.objects:
    o.hide_set(False)
    for modifier in list(o.modifiers):
        o.modifiers.remove(modifier)
    if o.type == 'CURVE':
        o.data.bevel_resolution = 0
        o.data.resolution_u = 2
bpy.context.view_layer.update()

def xyz(v):
    return [round(v.x,5),round(v.z,5),round(-v.y,5)]

# Open the entry leaf and a sliding sunroom panel for continuous walking.
# Frames stay at their doorway; this affects only the testing export.
hinge = Vector((5.11,-.03,0))
front_open = Matrix.Translation(hinge) @ Matrix.Rotation(math.pi/2,4,'Z') @ Matrix.Translation(-hinge)
groups = {}
colliders = []
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
        'leafy','net strand','quilt','pillow','duvet','ceiling fan'])
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
        glass = 'glass' in matname.lower() and 'frosted' not in matname.lower()
        key = (cname,matname)
        if key not in groups:
            groups[key] = {'name': cname+' / '+matname,'color':color,
                           'glass':glass,'values':array.array('f')}
        values = groups[key]['values']
        smooth = mesh.polygons[tri.polygon_index].use_smooth
        for i in tri.vertices:
            n = normal_matrix @ (mesh.vertices[i].normal if smooth else tri.normal)
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
manifest = {'version':1,'generator':scene['generator_sha256'],
            'sourceObjects':source_objects,'groups':[],'colliders':colliders,
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
