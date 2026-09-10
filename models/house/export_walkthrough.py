"""Export the saved house into a compact, self-contained browser mesh.

Run with the same bpy Python as build.py. Source .blend stays fully editable.
World-space geometry is grouped by material/room to reduce draw calls. Selected
furniture keeps one-segment bevels and corner normals. Explicit finish and
practical-light descriptions drive code-authored browser shaders; the browser
never loads reference photographs or footage.
"""
import array
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import math
import shutil
import sys
import bpy
from mathutils import Matrix, Vector

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from browser_materials import material_finish, keep_bevel, practical_light, ramp_colliders
from browser_ao import VertexAO, architectural_receiver, benchmark_samples, occludes
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source', type=Path, default=HERE/'house.blend')
parser.add_argument('--output', type=Path, default=HERE.parent.parent/'house-test')
parser.add_argument('--ao', action='store_true', help='Opt-in static ambient-occlusion byte buffer; not yet the default')
parser.add_argument('--ao-rays', type=int, choices=[8, 12], default=8)
parser.add_argument('--ao-radius', type=float, default=1.0)
parser.add_argument('--ao-edge', type=float, default=.7, help='Floor/wall sample spacing target in metres')
parser.add_argument('--ao-max-extra-vertices', type=int, default=180000)
parser.add_argument('--ao-benchmark-samples', type=int, default=0,
                    help='With --ao, cast only 1..10000 deterministic samples and write no assets')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
if args.ao_benchmark_samples and (not args.ao or not 1 <= args.ao_benchmark_samples <= 10000):
    parser.error('--ao-benchmark-samples requires --ao and a count from 1 to 10000')
OUT = args.output.resolve()
OUT.mkdir(exist_ok=True)
if args.ao and shutil.disk_usage(OUT).free < 10 * 2**30 + 128 * 2**20:
    raise RuntimeError('AO export needs 10 GiB free plus a 128 MiB output allowance')
ao = VertexAO(rays=args.ao_rays, radius=args.ao_radius, edge=args.ao_edge,
              max_extra_vertices=args.ao_max_extra_vertices) if args.ao else None
bpy.ops.wm.open_mainfile(filepath=str(args.source.resolve()))
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
    occluder_triangles = []
    can_tessellate = bool(ao) and architectural_receiver(o.name, cname)
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
        corners = []
        for i, loop in zip(tri.vertices, tri.loops):
            # Vertex averages erase hard edges and weighted bevel normals.
            n = normal_matrix @ mesh.corner_normals[loop].vector
            n.normalize()
            corner = xyz(verts[i])+xyz(n)
            if ao:
                corners.append(tuple(corner))
            else:
                values.extend(corner)
        if ao:
            opaque = occludes(o.name, groups[key]['finish'])
            if opaque:
                occluder_triangles.append(tuple(tri.vertices))
            for refined in ao.tessellate(tuple(corners), can_tessellate and opaque):
                for corner in refined:
                    values.extend(round(v, 5) for v in corner)
    if ao:
        ao.add_occluder_mesh((xyz(v) for v in verts), occluder_triangles)
    if o.type == 'MESH' and o.get('browser_walk_ramp'):
        # The visual apron remains one sloped plane. A whole-plane AABB would
        # put its highest elevation across the driveway and act like a wall.
        colliders.extend(ramp_colliders(o.name, verts, o['browser_walk_ramp']))
    elif o.type == 'MESH' and not no_collision:
        mn = Vector(tuple(min(v[i] for v in verts) for i in range(3)))
        mx = Vector(tuple(max(v[i] for v in verts) for i in range(3)))
        size = mx-mn
        # Omit cosmetic trim; preserve glass, walls, floors, stairs and furniture.
        if size.z>.018 and max(size.x,size.y)>.18 and min(size.x,size.y)>.023:
            colliders.append({'name':o.name,'min':[mn.x,mn.z,-mx.y],
                              'max':[mx.x,mx.z,-mn.y]})
    source_objects += 1
    evaluated.to_mesh_clear()

if ao:
    print('AO_GEOMETRY', json.dumps(ao.stats), flush=True)
    ao.build()
    if args.ao_benchmark_samples:
        sample_values, unique = benchmark_samples(groups.values(), args.ao_benchmark_samples)
        sample_bytes = ao.bake_group(sample_values)
        print('AO_BENCHMARK', json.dumps(dict(ao.stats,
              source=str(args.source.resolve()), generator=scene['generator_sha256'],
              emittedVertices=sum(len(g['values'])//6 for g in groups.values()),
              totalUniqueSamples=unique, benchmarkSamples=len(sample_bytes),
              estimatedFullBakeSeconds=round(ao.bake_seconds*unique/max(1,len(sample_bytes)),2))), flush=True)
        sys.exit(0)

blob = bytearray()
ao_blob = bytearray()
manifest = {'version':2,'generator':scene['generator_sha256'],
            'exporter':hashlib.sha256((HERE/'export_walkthrough.py').read_bytes() +
                                      (HERE/'browser_materials.py').read_bytes() +
                                      (HERE/'browser_ao.py').read_bytes()).hexdigest(),
            'sourceObjects':source_objects,'groups':[],'colliders':colliders,
            'lights':lights,'sunlight':sunlight,'beveledObjects':beveled_objects,
            'note':'Estimated photo study. Browser export opens the front door and rear sliding panel.'}
for group in groups.values():
    values = group.pop('values')
    if ao:
        ao_blob.extend(ao.bake_group(values, receive=occludes('', group['finish'])))
    group['offset'] = len(blob)
    group['count'] = len(values)//6
    blob.extend(values.tobytes())
    manifest['groups'].append(group)
manifest['meshSha256'] = hashlib.sha256(blob).hexdigest()
if ao:
    if len(ao_blob) != len(blob)//24:
        raise RuntimeError('AO and mesh vertex counts disagree')
    manifest['ambientOcclusion'] = dict(url='house.ao.gz', encoding='uint8',
        vertexCount=len(ao_blob), meshSha256=manifest['meshSha256'],
        sha256=hashlib.sha256(ao_blob).hexdigest(), strength=.35, bake=ao.stats)
    with gzip.GzipFile(filename=str(OUT/'house.ao.gz'),mode='wb',mtime=0) as f:
        f.write(ao_blob)
    print('AO_BAKE', json.dumps(ao.stats), flush=True)
with gzip.GzipFile(filename=str(OUT/'house.mesh.gz'),mode='wb',mtime=0) as f:
    f.write(blob)
(OUT/'house.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n',encoding='utf-8')
print('EXPORTED',source_objects,'objects;',len(groups),'draw groups;',
      len(blob)//24,'vertices;',len(colliders),'collision boxes;',
      (OUT/'house.mesh.gz').stat().st_size,'compressed bytes',flush=True)
