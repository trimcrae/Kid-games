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
from browser_materials import (material_finish, keep_bevel, practical_light, ramp_colliders,
                               oriented_triangle_corners, group_key, dressing_collection, browser_flag)
from browser_ao import VertexAO, architectural_receiver, benchmark_samples, occludes, peak_memory_mib
from browser_lightmap import Lightmap, DEFAULT_ROOMS, log as lightmap_log
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
parser.add_argument('--lightmap', action='store_true',
                    help='Opt-in Cycles indirect-diffuse lightmaps (day/night) for --lightmap-rooms')
parser.add_argument('--lightmap-rooms', default=','.join(DEFAULT_ROOMS))
parser.add_argument('--lightmap-size', type=int, default=2048)
parser.add_argument('--lightmap-samples', type=int, default=128)
parser.add_argument('--lightmap-margin', type=int, default=4)
parser.add_argument('--lightmap-blur', type=int, default=2,
                    help='Island-aware denoise passes (0 = raw bake)')
parser.add_argument('--lightmap-sigma', type=float, default=2.0, help='Denoise radius in texels')
parser.add_argument('--lightmap-raw', type=Path, default=None,
                    help='Private directory for raw float bakes and the island id map (.npy)')
parser.add_argument('--lightmap-preview', type=Path, default=None,
                    help='Private directory for tone-mapped sanity previews of each raw bake')
parser.add_argument('--lightmap-debug-cameras', default='',
                    help='With --lightmap-preview: low-res renders of these named views in the bake scene')
parser.add_argument('--lightmap-reuse-raw', type=Path, default=None,
                    help='Encode the raw bakes saved by --lightmap-raw instead of baking (layout must match)')
parser.add_argument('--lightmap-probe', default='',
                    help='Debug: "|"-separated receiver names to ray-probe (logged) in the bake scene')
parser.add_argument('--lightmap-prepare-only', action='store_true',
                    help='Select and unwrap, print diagnostics, write nothing')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
if args.ao_benchmark_samples and (not args.ao or not 1 <= args.ao_benchmark_samples <= 10000):
    parser.error('--ao-benchmark-samples requires --ao and a count from 1 to 10000')
OUT = args.output.resolve()
OUT.mkdir(exist_ok=True)
if args.ao and shutil.disk_usage(OUT).free < 10 * 2**30 + 128 * 2**20:
    raise RuntimeError('AO export needs 10 GiB free plus a 128 MiB output allowance')
if args.lightmap and shutil.disk_usage(OUT).free < 10 * 2**30 + 512 * 2**20:
    raise RuntimeError('Lightmap export needs 10 GiB free plus a 512 MiB working allowance')
lightmap = Lightmap([r.strip() for r in args.lightmap_rooms.split(',') if r.strip()],
                    args.lightmap_size, args.lightmap_samples, args.lightmap_margin,
                    args.lightmap_blur) if args.lightmap else None
if lightmap:
    lightmap.sigma = args.lightmap_sigma
    lightmap.raw_dir = args.lightmap_raw.resolve() if args.lightmap_raw else None
    lightmap.reuse_raw = args.lightmap_reuse_raw.resolve() if args.lightmap_reuse_raw else None
if lightmap and args.lightmap_preview:
    lightmap.preview_dir = args.lightmap_preview.resolve()
    lightmap.preview_tag = OUT.name
    lightmap.debug_cameras = tuple(c for c in args.lightmap_debug_cameras.split(',') if c)
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
# House Tour 44.007/90.525s: hinged on the south (street-side) jamb, the leaf
# swings in against the entry-window wall and leaves the foyer side clear.
local_hinge = Vector((-.49, 0, 0))  # half the local-X width of the .98 m slab
hinge = front_asset.matrix_world @ local_hinge
hinge_axis = front_asset.matrix_world.to_quaternion() @ Vector((0, 0, 1))
front_open = (Matrix.Translation(hinge) @ Matrix.Rotation(-math.pi/2, 4, hinge_axis)
              @ Matrix.Translation(-hinge))
# Things the browser moves on their own (interactions.mjs): each gets its own
# draw group(s) and collision boxes tagged with a prop key, so the page can
# swing a seat, open a fridge door, spin a fan or drive the burgundy car
# without touching the rest of the baked house.
def prop_key(o, verts):
    # `verts` are the evaluated world-space vertices: an object's origin may
    # sit at its parent's (curves, tubes), so which side it is on is read
    # from where its geometry actually is.
    parent = o.parent.name if o.parent else ''
    n = o.name
    if parent == 'Garage burgundy SUV':
        return 'car'
    if parent == 'Garage black SUV':
        return 'car2'
    centre_x = sum(v.x for v in verts) / max(1, len(verts))
    if parent == 'French-door refrigerator' and n.startswith(('French door', 'Curved vertical fridge handle')):
        # Turned with the kitchen, the two doors end up side by side along X.
        return 'fridge-' + ('a' if centre_x < o.parent.matrix_world.translation.x else 'b')
    if n.startswith('Kitchen fridge drawing'):
        # The kids' drawings magneted to the doors swing open with them.
        fridge = bpy.data.objects['French-door refrigerator']
        return 'fridge-' + ('a' if centre_x < fridge.matrix_world.translation.x else 'b')
    if parent == 'Rear swing frame' and n.startswith(('Swing suspension chains', 'Swing curved molded seat')):
        return 'swing-' + ('a' if centre_x < o.parent.matrix_world.translation.x else 'b')
    if parent == 'Lower ceiling fan' and n.startswith('Fan blade'):
        return 'fan-family'
    if parent == 'Primary white ceiling fan' and n.startswith('White fan blade'):
        return 'fan-primary'
    return None
props = {}
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
def exportable(o):
    if o.type not in {'MESH','CURVE'} or o.get('export') is False or o.get('lightmap_copy'):
        return False  # render-only dense leaves; coarse clusters stand in
    cname = o.users_collection[0].name if o.users_collection else ''
    return not ('label' in cname.lower() or cname.startswith('15 |'))

def export_matrix(o):
    parent = o.parent.name if o.parent else ''
    matrix = o.matrix_world.copy()
    if parent == 'Red three-panel front door' and 'white' not in o.name.lower():
        matrix = front_open @ matrix
    if parent == 'Sunroom rear sliding bay 04':
        matrix = Matrix.Translation((-1.06,0,0)) @ matrix
    if parent == 'White upper stair safety gate':
        hinge = o.parent.matrix_world @ Vector((-.53,0,0))
        matrix = Matrix.Translation(hinge) @ Matrix.Rotation(math.pi/2,4,'Z') @ Matrix.Translation(-hinge) @ matrix
    return matrix

if lightmap:
    lightmap_log('blend opened and export modifiers prepared')
    lightmap.prepare(scene, bpy.context.evaluated_depsgraph_get(), export_matrix, exportable,
                     prop_key, material_finish)
    if args.lightmap_prepare_only:
        # Private debugging aid: the joined receiver and floor proxy only.
        bpy.data.libraries.write(str(OUT/'lightmap-receivers.blend'), {lightmap.joined, lightmap.proxy})
        sys.exit(0)
depsgraph = bpy.context.evaluated_depsgraph_get()
source_objects = 0
for o in list(scene.objects):
    if not exportable(o):
        continue
    cname = o.users_collection[0].name
    matrix = export_matrix(o)
    # These are lightweight internal curtains and do not block a person.
    # An explicit browser_collide=False (object or parent empty) marks props a
    # pet walks past or through: rugs, wall art, shelf items, canopies.
    no_collision = browser_flag(o, 'browser_collide') is False or any(s in o.name.lower() for s in [
        'curtain','blind','shade','pleat','sloped ceiling','sloped header','soffit',
        'leafy','net strand','quilt','pillow','duvet','ceiling fan','roof',
        # The trampoline's thin tubes (poles, seams, zipper, hoop) boxed the
        # whole mat off, and the pad ring stood 8 cm proud of the mat, just out
        # of a jump's reach; only the mat, the ladder and the backboard are solid.
        'trampoline curved padded poles','trampoline blue spring pad','trampoline soft upper net seam','trampoline yellow zipper',
        'trampoline basketball rim','trampoline hoop net','trampoline backboard supports','trampoline rim mounting'])
    dressing = dressing_collection(cname)
    station_prop = browser_flag(o, 'browser_station_prop')
    evaluated = o.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    if not mesh or not mesh.polygons:
        if mesh: evaluated.to_mesh_clear()
        continue
    mesh.calc_loop_triangles()
    verts = [matrix @ v.co for v in mesh.vertices]
    prop = prop_key(o, verts)
    # Moving props keep live light: a bake would stay where they started.
    lm_uv = lightmap.object_uvs(o, mesh, verts) if lightmap and not prop else None
    lm_oid = lightmap.oid.get(o.name, 0) if lightmap else 0
    normal_matrix = matrix.to_3x3().inverted().transposed()
    mirrored = matrix.to_3x3().determinant() < 0
    materials = list(o.data.materials)
    occluder_triangles = []
    can_tessellate = bool(ao) and architectural_receiver(o.name, cname)
    for tri in mesh.loop_triangles:
        mat = materials[min(tri.material_index,len(materials)-1)] if materials else None
        matname = mat.name if mat else 'Default'
        color = list(mat.diffuse_color[:3]) if mat else [.65,.65,.6]
        key = ('prop:' + prop, matname) if prop else group_key(cname, matname)
        if key not in groups:
            finish = material_finish(mat)
            groups[key] = {'name': key[0]+' / '+matname,'color':color,
                           'glass':finish['surface'] == 'glass',
                           'finish':finish,'values':array.array('f')}
            if prop:
                groups[key]['prop'] = prop
            if lightmap:
                groups[key]['lightuv'] = array.array('H')
                groups[key]['lightowner'] = array.array('I')
        values = groups[key]['values']
        corners = []
        triangle_corners = oriented_triangle_corners(tri.vertices, tri.loops, mirrored)
        for i, loop in triangle_corners:
            # Vertex averages erase hard edges and weighted bevel normals.
            n = normal_matrix @ mesh.corner_normals[loop].vector
            n.normalize()
            corner = xyz(verts[i])+xyz(n)
            if ao or lightmap:
                corners.append(tuple(corner))
            if not ao:
                values.extend(corner)
        if lightmap:
            light, owner = groups[key]['lightuv'], groups[key]['lightowner']
            finish = groups[key]['finish']
            positions = [c[:3] for c in corners]
            tri_uvs = lightmap.triangle_uvs(lm_uv, triangle_corners, occludes(o.name, finish)
                                            and finish.get('emissiveIntensity', 0) <= .5)
            if not ao:
                kept_uvs = lightmap.clip_overlap(o.name, corners, tri_uvs)
                for corner in corners:
                    lightmap.extend(light, owner, lm_oid, corner, positions, kept_uvs)
        if ao:
            opaque = occludes(o.name, groups[key]['finish'])
            if opaque:
                occluder_triangles.append(tuple(i for i, _ in triangle_corners))
            for refined in ao.tessellate(tuple(corners), can_tessellate and opaque):
                kept_uvs = lightmap.clip_overlap(o.name, refined, tri_uvs) if lightmap else None
                for corner in refined:
                    values.extend(round(v, 5) for v in corner)
                    if lightmap:
                        lightmap.extend(light, owner, lm_oid, corner, positions, kept_uvs)
    if prop:
        # The prop's extent, in browser coordinates, for its pivot.
        lo = [min(xyz(v)[i] for v in verts) for i in range(3)]
        hi = [max(xyz(v)[i] for v in verts) for i in range(3)]
        entry = props.setdefault(prop, {'min': lo, 'max': hi})
        entry['min'] = [min(a, b) for a, b in zip(entry['min'], lo)]
        entry['max'] = [max(a, b) for a, b in zip(entry['max'], hi)]
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
            box = {'name':o.name,'min':[mn.x,mn.z,-mx.y],'max':[mx.x,mx.z,-mn.y]}
            if dressing:
                box['dressing'] = True
            if station_prop:
                box['stationProp'] = str(station_prop)
            if prop:
                box['prop'] = prop
            colliders.append(box)
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

if lightmap:
    lightmap_log('export loop done: %d objects' % source_objects)
    lightmap.probe_names = tuple(n for n in args.lightmap_probe.split('|') if n)
    lightmap.bake(scene, export_matrix, exportable, practical_light)

blob = bytearray()
ao_blob = bytearray()
uv_blob = bytearray()
manifest = {'version':2,'generator':scene['generator_sha256'],
            'exporter':hashlib.sha256((HERE/'export_walkthrough.py').read_bytes() +
                                      (HERE/'browser_materials.py').read_bytes() +
                                      (HERE/'browser_ao.py').read_bytes() +
                                      (HERE/'browser_lightmap.py').read_bytes()).hexdigest(),
            'sourceObjects':source_objects,'groups':[],'colliders':colliders,'props':props,
            'lights':lights,'sunlight':sunlight,'beveledObjects':beveled_objects,
            'note':'Estimated photo study. Browser export opens the front door and rear sliding panel.'}
for group in groups.values():
    values = group.pop('values')
    light = group.pop('lightuv', None)
    if light is not None:
        light = lightmap.finalize(light, group.pop('lightowner'))
        if len(light) != len(values)//3:
            raise RuntimeError('Lightmap UVs and vertices disagree in ' + group['name'])
        if sys.byteorder != 'little':
            light.byteswap()
        uv_blob.extend(light.tobytes())
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
if lightmap:
    manifest['bakedLight'] = lightmap.write(OUT, manifest['meshSha256'], len(blob)//24, bytes(uv_blob),
                                            peak_memory_mib())
    lightmap.cleanup()
    print('LIGHTMAP', json.dumps({k: v for k, v in manifest['bakedLight'].items() if k != 'bake'}), flush=True)
with gzip.GzipFile(filename=str(OUT/'house.mesh.gz'),mode='wb',mtime=0) as f:
    f.write(blob)
(OUT/'house.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n',encoding='utf-8')
print('EXPORTED',source_objects,'objects;',len(groups),'draw groups;',
      len(blob)//24,'vertices;',len(colliders),'collision boxes;',
      (OUT/'house.mesh.gz').stat().st_size,'compressed bytes',flush=True)
