"""Opt-in baked indirect light (UV lightmaps) for the browser export.

Interface: BAKED-LIGHTING-DESIGN.md (``bakedLight`` manifest block,
``house.lightuv.gz`` and ``house.light.<state>.png``). Cycles bakes the
*Diffuse Indirect* pass with *Color* off, the multiplier the diffuse albedo is
lit by, in two lighting states. Direct light stays real-time in the browser.

Selection rule (prototype, bounded to named rooms):

* every exportable mesh/curve in a room's own collections (Kitchen 07/08,
  Living room 09, Dining room 10, Ellie's pink-curtain bedroom 39/40);
* plus architecture (floors, walls, cutaway walls, windows/door, ceilings)
  and lived-in dressing whose world bounding-box centre lies inside the
  room's region box;
* minus moving props, all-glass/foliage/emitter objects, tiny parts (under
  4 cm or 40 cm^2; they keep live ambient) and slabs hidden under the floor.

Floors are not unwrapped piece by piece: every thin, level floor object
(boards, tiles and their decals, rugs) is projected from above onto one
rectangle per region, and a proxy plane just above the floor (visible to the
bake only, never to bounce or shadow rays) is baked for that rectangle. Boards and tile decals then share continuous
texels without hundreds of seams or overlapping bakes. Flat dressing (rugs)
is hidden while baking so it does not shade the floor below.

The other selected objects are joined into ONE temporary receiver mesh
(evaluated geometry in the exporter's walkthrough pose, original material
per face, custom corner normals), unwrapped with Smart UV Project + island
packing, and baked in a single Cycles pass per lighting state; the originals
are hidden from rays meanwhile. A loop map carries each face corner's UV
back to the exporter's loop order. The rest of the house stays visible and
posed, so it still occludes and bounces. Nothing is saved to the .blend.
"""
import gzip
import hashlib
import json
import math
import struct
import time
import zlib

SENTINEL = 65535
DEFAULT_ROOMS = ('Kitchen', 'Living room', 'Dining room', "Ellie's bedroom")
ROOMS = {
    'Kitchen': ('main', ('07', '08')),
    'Living room': ('main', ('09',)),
    'Dining room': ('main', ('10',)),
    "Ellie's bedroom": ('pink', ('39', '40')),
}
# Blender world boxes (Z up), the floor level, and the shared collections
# (architecture / dressing) filtered by bounding-box centre.
REGIONS = {
    'main': dict(box=((-.2, -1.95, -.2), (7.95, 8.12, 2.75)), level=0.0,
                 shared=('01', '02', '03', '04', '14', '44')),
    'pink': dict(box=((7.7, 5.4, -1.2), (11.0, 9.2, 1.2)), level=-1.05,
                 shared=('01', '26', '28', '46')),
}
DRESSING = ('44', '45', '46', '47', '48')
FLOOR_THICKNESS = .05
FLOOR_TOLERANCE = .06
MIN_SIZE, MIN_AREA = .04, .004
NIGHT_SKY = (.0012, .0016, .0030)
RAY_FLAGS = ('visible_camera', 'visible_diffuse', 'visible_glossy',
             'visible_transmission', 'visible_volume_scatter', 'visible_shadow')


def log(*parts):
    print(time.strftime('%H:%M:%S'), 'LIGHTMAP', *parts, flush=True)


def encode_uv(u, v):
    return (min(65533, max(0, round(u * 65535))), min(65533, max(0, round(v * 65535))))


def barycentric_uv(point, positions, uvs):
    """UV of a refined (AO-tessellated) corner inside its source triangle."""
    a, b, c = positions
    v0 = [b[k] - a[k] for k in range(3)]
    v1 = [c[k] - a[k] for k in range(3)]
    v2 = [point[k] - a[k] for k in range(3)]
    d00 = sum(x * x for x in v0); d01 = sum(x * y for x, y in zip(v0, v1))
    d11 = sum(x * x for x in v1); d20 = sum(x * y for x, y in zip(v2, v0))
    d21 = sum(x * y for x, y in zip(v2, v1))
    den = d00 * d11 - d01 * d01
    if abs(den) < 1e-18:
        return uvs[0]
    wb = min(1.0, max(0.0, (d11 * d20 - d01 * d21) / den))
    wc = min(1.0, max(0.0, (d00 * d21 - d01 * d20) / den))
    s = wb + wc
    if s > 1:
        wb, wc = wb / s, wc / s
    wa = 1 - wb - wc
    return tuple(wa * uvs[0][k] + wb * uvs[1][k] + wc * uvs[2][k] for k in range(2))


# ------------------------------------------------------------------ images

def island_denoise(rgb, ids, sigma=2.0):
    """Gaussian that only averages texels of the same UV island (id > 0).

    Islands never borrow light from a neighbour across the packing gap, so
    wall, cabinet and floor bakes stay separate however close they are packed.
    """
    import numpy as np
    r = int(math.ceil(2 * sigma))
    h, w = ids.shape
    pr = np.pad(rgb, ((r, r), (r, r), (0, 0)))
    pi = np.pad(ids, r)
    num = np.zeros_like(rgb)
    den = np.zeros((h, w), np.float32)
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            weight = math.exp(-(dy * dy + dx * dx) / (2 * sigma * sigma))
            if weight < .02:
                continue
            same = (pi[r + dy:r + dy + h, r + dx:r + dx + w] == ids).astype(np.float32) * np.float32(weight)
            num += same[..., None] * pr[r + dy:r + dy + h, r + dx:r + dx + w]
            den += same
    return np.where((ids > 0)[..., None], num / np.maximum(den, 1e-6)[..., None], rgb)


def dilate(rgb, mask, passes=8):
    import numpy as np
    out = rgb * mask[..., None]
    filled = mask.copy()
    h, w = mask.shape
    for _ in range(passes):
        if filled.all():
            break
        pv = np.pad(out, ((1, 1), (1, 1), (0, 0)))
        pm = np.pad(filled, 1).astype(np.float32)
        s = np.zeros_like(out); c = np.zeros((h, w), np.float32)
        for dy in (0, 1, 2):
            for dx in (0, 1, 2):
                if dy == dx == 1:
                    continue
                s += pv[dy:dy + h, dx:dx + w]
                c += pm[dy:dy + h, dx:dx + w]
        grow = ~filled & (c > 0)
        out[grow] = s[grow] / c[grow][:, None]
        filled |= grow
    return push_pull(out, filled)


def push_pull(rgb, mask):
    """Fill every remaining gutter texel from coarser averages (mip-safe)."""
    import numpy as np
    h, w = mask.shape
    if mask.all():
        return rgb
    if h < 2 or w < 2:
        fill = rgb[mask].mean(0) if mask.any() else np.zeros(3, rgb.dtype)
        return np.where(mask[..., None], rgb, fill)
    m = mask.astype(np.float32)
    hh, ww = h // 2, w // 2
    sv = (rgb * m[..., None])[:hh * 2, :ww * 2].reshape(hh, 2, ww, 2, 3).sum((1, 3))
    sm = m[:hh * 2, :ww * 2].reshape(hh, 2, ww, 2).sum((1, 3))
    coarse = push_pull(np.where(sm[..., None] > 0, sv / np.maximum(sm, 1)[..., None], 0).astype(rgb.dtype), sm > 0)
    up = np.repeat(np.repeat(coarse, 2, 0), 2, 1)
    up = np.pad(up, ((0, h - up.shape[0]), (0, w - up.shape[1]), (0, 0)), mode='edge')
    return np.where(mask[..., None], rgb, up)


def png_bytes(rgb8):
    """8-bit RGB PNG, no gAMA/sRGB/iCCP chunk: raw bytes, not colour managed."""
    import numpy as np
    h, w, _ = rgb8.shape
    flat = rgb8.reshape(h, w * 3).astype(np.int16)
    best = None
    for kind in (1, 2):  # Sub, Up
        f = flat.copy()
        if kind == 1:
            f[:, 3:] -= flat[:, :-3]
        else:
            f[1:] -= flat[:-1]
        raw = np.empty((h, w * 3 + 1), np.uint8)
        raw[:, 0] = kind
        raw[:, 1:] = (f % 256).astype(np.uint8)
        data = zlib.compress(raw.tobytes(), 9)
        if best is None or len(data) < len(best):
            best = data

    def chunk(tag, body):
        return struct.pack('>I', len(body)) + tag + body + struct.pack('>I', zlib.crc32(tag + body) & 0xffffffff)
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) +
            chunk(b'IDAT', best) + chunk(b'IEND', b''))


# ------------------------------------------------------------------ bake

class Lightmap:
    def __init__(self, rooms=DEFAULT_ROOMS, size=2048, samples=128, margin=4, blur=2):
        unknown = [r for r in rooms if r not in ROOMS]
        if unknown:
            raise ValueError('Unknown lightmap rooms: %s (known: %s)' % (unknown, sorted(ROOMS)))
        if size not in (256, 512, 1024, 2048, 4096) or not 1 <= samples <= 4096 or not 4 <= margin <= 32:
            raise ValueError('Lightmap needs size 256..4096, 1..4096 samples and margin 4..32 px')
        self.rooms, self.size, self.samples, self.margin, self.blur = tuple(rooms), size, samples, margin, blur
        self.regions = sorted({ROOMS[r][0] for r in self.rooms})
        self.loop_uvs = {}      # object name -> flat list of UVs in the object's own loop order
        self.planar = {}        # object name -> region
        self.region_affine = {}
        self.receivers = []     # originals replaced by the joined mesh while baking
        self.hide_for_bake = []
        self.joined = self.proxy = self.collection = None
        self.proxy_rects = {}
        self.stats = dict(objects=0, joinedObjects=0, floorObjects=0, hiddenFlatDressing=0,
                          skippedTiny=0, skippedProps=0, skippedTransparent=0, skippedUnderFloor=0,
                          bakedVertices=0, sentinelVertices=0)
        self.pages = {}
        self.preview_dir, self.preview_tag, self.debug_cameras = None, 'bake', ()
        self.raw_dir, self.sigma, self.id_map = None, 2.0, None
        self.oid, self.dark_ids, self.dark = {}, set(), {}
        self.probe_names, self.reuse_raw = (), None

    # -- selection ----------------------------------------------------
    @staticmethod
    def _box(o, matrix):
        from mathutils import Vector
        ws = [matrix @ Vector(c) for c in o.bound_box]
        return [min(p[i] for p in ws) for i in range(3)], [max(p[i] for p in ws) for i in range(3)]

    def classify(self, o, cname, matrix):
        prefix = cname[:2]
        lo, hi = self._box(o, matrix)
        centre = [(a + b) / 2 for a, b in zip(lo, hi)]
        for room in self.rooms:
            region, colls = ROOMS[room]
            reg = REGIONS[region]
            inside = all(reg['box'][0][i] <= centre[i] <= reg['box'][1][i] for i in range(3))
            if prefix in colls or (prefix in reg['shared'] and inside):
                level = reg['level']
                if hi[2] - lo[2] <= FLOOR_THICKNESS and abs(hi[2] - level) <= FLOOR_TOLERANCE \
                        and lo[2] >= level - FLOOR_TOLERANCE:
                    return 'floor', region, lo, hi
                if prefix in reg['shared'] and hi[2] < level - .005 and prefix not in DRESSING:
                    return 'under', region, lo, hi
                return 'object', region, lo, hi
        return None, None, lo, hi

    def prepare(self, scene, depsgraph, export_matrix, exportable, prop_key, finish_of):
        """Before the export loop: choose objects, build the joined receiver, unwrap."""
        import bpy
        import numpy as np
        from mathutils import Vector
        started = time.perf_counter()
        self.finish_of = finish_of
        log('select start')
        floor_boxes = {r: [] for r in self.regions}
        floor_tops = {r: [] for r in self.regions}
        default = None
        materials, material_index = [], {}
        parts = []
        V = L = F = 0
        self.faces, self.loop_pos = {}, {}
        self.stats['loopMismatches'] = []
        self.stats['containedReceivers'] = []
        self.stats['overlapPairs'] = []
        self.overlap_boxes = {}
        solids = []
        chosen = []
        for o in list(scene.objects):
            if not exportable(o):
                continue
            cname = o.users_collection[0].name
            matrix = export_matrix(o)
            kind, region, lo, hi = self.classify(o, cname, matrix)
            if kind is not None:
                chosen.append((o, cname, matrix, kind, region, lo, hi))
            if o.type == 'MESH' and not any(
                    finish_of(s.material)['surface'] in {'glass', 'foliage'} for s in o.material_slots):
                solids.append((o.name, lo, hi))
        # A receiver lying (almost) wholly inside a similar-sized solid bakes
        # black from inside it and z-fights in the browser: leave it unbaked.
        names = np.array([s[0] for s in solids])
        LO = np.array([s[1] for s in solids]) - .001
        HI = np.array([s[2] for s in solids]) + .001
        VOL = np.prod(HI - LO, axis=1)
        contained = set()
        for o, cname, matrix, kind, region, lo, hi in chosen:
            if kind == 'floor':
                continue
            lo_, hi_ = np.array(lo) - .001, np.array(hi) + .001
            vol = float(np.prod(hi_ - lo_))
            inter = np.prod(np.clip(np.minimum(HI, hi_) - np.maximum(LO, lo_), 0, None), axis=1)
            host = (inter >= .9 * vol) & (VOL <= 4 * vol) & (names != o.name) & (
                (VOL > vol * 1.001) | ((VOL >= vol * .999) & (names < o.name)))
            if host.any():
                contained.add(o.name)
                partner = str(names[np.flatnonzero(host)[0]])
                self.stats['containedReceivers'].append('%s in %s' % (o.name, partner))
                # The partner's faces inside this solid would z-fight a live copy.
                self.overlap_boxes.setdefault(partner, []).append((lo_ - .009, hi_ + .009))
                continue
            # Partly overlapping wall slabs: keep both faces there on live light.
            pair = (inter >= .5 * vol) & (VOL <= 4 * vol) & (VOL >= vol * .999) & (names != o.name)
            if 'wall' in o.name.lower():
                for k in np.flatnonzero(pair):
                    if 'wall' in names[k].lower():
                        self.overlap_boxes.setdefault(str(names[k]), []).append((lo_ - .009, hi_ + .009))
                        self.overlap_boxes.setdefault(o.name, []).append((LO[k] - .009, HI[k] + .009))
                        self.stats['overlapPairs'].append('%s / %s' % (o.name, names[k]))
        # The floor plane is the most common top of thin level pieces; raised
        # thin pieces (thresholds, mats) are ordinary receivers instead.
        dominant = {}
        for region in self.regions:
            tops = [round(c[6][2], 3) for c in chosen
                    if c[3] == 'floor' and c[4] == region and c[1][:2] not in DRESSING]
            dominant[region] = max(set(tops), key=tops.count) if tops else REGIONS[region]['level']
        self.stats['floorTop'] = dominant
        for o, cname, matrix, kind, region, lo, hi in chosen:
            if kind == 'floor' and cname[:2] not in DRESSING and hi[2] > dominant[region] + .012:
                kind = 'object'
            if kind == 'under':
                self.stats['skippedUnderFloor'] += 1
                continue
            if o.name in contained:
                continue
            slots = [s.material for s in o.material_slots]
            finishes = [finish_of(m) for m in (slots or [None])]
            if all(f['surface'] in {'glass', 'foliage'} or f.get('opacity', 1) < .95 or
                   f.get('emissiveIntensity', 0) > .5 for f in finishes):
                self.stats['skippedTransparent'] += 1
                continue
            evaluated = o.evaluated_get(depsgraph)
            mesh = evaluated.to_mesh()
            if not mesh or not mesh.polygons:
                if mesh:
                    evaluated.to_mesh_clear()
                continue
            nv, nl, npoly = len(mesh.vertices), len(mesh.loops), len(mesh.polygons)
            co = np.empty(nv * 3, np.float64); mesh.vertices.foreach_get('co', co)
            M = np.array(matrix, np.float64)
            co = co.reshape(-1, 3) @ M[:3, :3].T + M[:3, 3]
            if prop_key(o, [Vector(p) for p in co]):
                evaluated.to_mesh_clear()
                self.stats['skippedProps'] += 1
                continue
            if kind == 'floor':
                evaluated.to_mesh_clear()
                self.planar[o.name] = region
                floor_boxes[region].append((lo, hi))
                if cname[:2] in DRESSING:
                    self.hide_for_bake.append(o)
                    self.stats['hiddenFlatDressing'] += 1
                else:
                    floor_tops[region].append(hi[2])
                self.stats['floorObjects'] += 1
                continue
            area = np.empty(npoly, np.float64); mesh.polygons.foreach_get('area', area)
            det = float(np.linalg.det(M[:3, :3]))
            extent = max(b - a for a, b in zip(lo, hi))
            if extent < MIN_SIZE or area.sum() * abs(det) ** (2 / 3) < MIN_AREA:
                evaluated.to_mesh_clear()
                self.stats['skippedTiny'] += 1
                continue
            lv = np.empty(nl, np.int64); mesh.loops.foreach_get('vertex_index', lv)
            ls = np.empty(npoly, np.int64); mesh.polygons.foreach_get('loop_start', ls)
            lt = np.empty(npoly, np.int64); mesh.polygons.foreach_get('loop_total', lt)
            mi = np.empty(npoly, np.int64); mesh.polygons.foreach_get('material_index', mi)
            smooth = np.empty(npoly, bool); mesh.polygons.foreach_get('use_smooth', smooth)
            cn = np.empty(nl * 3, np.float64); mesh.corner_normals.foreach_get('vector', cn)
            evaluated.to_mesh_clear()
            N = np.linalg.inv(M[:3, :3]).T
            cn = cn.reshape(-1, 3) @ N.T
            cn /= np.maximum(np.linalg.norm(cn, axis=1), 1e-12)[:, None]
            # Joined loop order: polygon by polygon, reversed for mirrored
            # transforms so the joined faces keep outward winding.
            first = np.cumsum(lt) - lt
            within = np.arange(nl) - np.repeat(first, lt)
            if det < 0:
                within = np.repeat(lt, lt) - 1 - within
            src = np.repeat(ls, lt) + within
            inv = np.empty(nl, np.int64)
            inv[src] = np.arange(nl) + L
            # Faces keep their own material (mesh slots, or object-linked ones).
            slot_mats = slots or [None]
            remap = []
            for m in slot_mats:
                if m is None:
                    if default is None:
                        default = bpy.data.materials.new('Lightmap default (temporary)')
                    m = default
                if m.name not in material_index:
                    material_index[m.name] = len(materials)
                    materials.append(m)
                remap.append(material_index[m.name])
            remap = np.array(remap, np.int64)
            parts.append(dict(co=co, vi=lv[src] + V, start=first + L, mat=remap[np.minimum(mi, len(remap) - 1)],
                              smooth=smooth, normals=cn[src]))
            self.loop_uvs[o.name] = inv
            self.oid[o.name] = len(self.oid) + 1
            self.loop_pos[o.name] = co[lv].astype(np.float32)
            self.faces[o.name] = (F, npoly, float(area.sum() * abs(det) ** (2 / 3)))
            F += npoly
            self.receivers.append(o)
            V += nv
            L += nl
        log('select done: %d joined objects, %d floor objects, %d vertices, %d loops (%.1fs)'
            % (len(self.receivers), self.stats['floorObjects'], V, L, time.perf_counter() - started))
        self.stats['joinedObjects'] = len(self.receivers)
        self.stats['objects'] = len(self.receivers) + self.stats['floorObjects']
        coll = bpy.data.collections.new('Lightmap bake (temporary)')
        scene.collection.children.link(coll)
        self.collection = coll
        # One joined receiver mesh.
        t = time.perf_counter()
        mesh = bpy.data.meshes.new('LM receivers')
        mesh.vertices.add(V)
        mesh.vertices.foreach_set('co', np.concatenate([p['co'] for p in parts]).ravel().astype(np.float32))
        mesh.loops.add(L)
        mesh.loops.foreach_set('vertex_index', np.concatenate([p['vi'] for p in parts]).astype(np.int32))
        P = sum(len(p['start']) for p in parts)
        mesh.polygons.add(P)
        mesh.polygons.foreach_set('loop_start', np.concatenate([p['start'] for p in parts]).astype(np.int32))
        mesh.update(calc_edges=True)
        for m in materials:
            mesh.materials.append(m)
        mesh.polygons.foreach_set('material_index', np.concatenate([p['mat'] for p in parts]).astype(np.int32))
        mesh.polygons.foreach_set('use_smooth', np.concatenate([p['smooth'] for p in parts]))
        mesh.normals_split_custom_set(np.concatenate([p['normals'] for p in parts]).astype(np.float32))
        mesh.update()
        del parts
        joined = bpy.data.objects.new('LM receivers', mesh)
        joined['lightmap_copy'] = True
        coll.objects.link(joined)
        self.joined = joined
        self.stats['joinedTriangles'] = sum(len(p.vertices) - 2 for p in mesh.polygons)
        self.stats['materials'] = len(materials)
        # One proxy floor rectangle per region, invisible to rays.
        verts, faces = [], []
        for region in self.regions:
            boxes = floor_boxes[region]
            if not boxes:
                continue
            x0 = min(b[0][0] for b in boxes); y0 = min(b[0][1] for b in boxes)
            x1 = max(b[1][0] for b in boxes); y1 = max(b[1][1] for b in boxes)
            z = max(floor_tops[region] or [REGIONS[region]['level']]) + .0005
            base = len(verts)
            verts += [(x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z)]
            faces.append((base, base + 1, base + 2, base + 3))
            self.proxy_rects[region] = (len(faces) - 1, (x0, y0, x1, y1, z))
            log('floor', region, json.dumps(dict(rect=[round(v, 4) for v in (x0, y0, x1, y1)], proxyZ=round(z, 4),
                                                 tops=sorted({round(t_, 3) for t_ in floor_tops[region]}))))
        pmesh = bpy.data.meshes.new('LM floor proxy')
        pmesh.from_pydata(verts, [], faces)
        pmesh.materials.append(default or bpy.data.materials.new('Lightmap default (temporary)'))
        self.proxy = bpy.data.objects.new('LM floor proxy', pmesh)
        self.proxy['lightmap_copy'] = True
        # Cycles only bakes camera-visible objects; bounce and shadow rays
        # never see the proxy, so the real floors below still do the bouncing.
        for flag in RAY_FLAGS:
            setattr(self.proxy, flag, flag == 'visible_camera')
        coll.objects.link(self.proxy)
        bpy.context.view_layer.update()
        self.stats['joinSeconds'] = round(time.perf_counter() - t, 2)
        log('joined mesh built: %d triangles, %d materials (%.1fs)'
            % (self.stats['joinedTriangles'], len(materials), time.perf_counter() - t))
        self._unwrap()
        self.stats['prepareSeconds'] = round(time.perf_counter() - started, 2)
        log('prepare done', json.dumps(self.stats))

    def _unwrap(self):
        import bpy
        import numpy as np
        objs = [self.joined, self.proxy]
        for ob in objs:
            layer = ob.data.uv_layers.new(name='Lightmap', do_init=False)
            ob.data.uv_layers.active = layer
            layer.active_render = True
        view_layer = bpy.context.view_layer
        for ob in view_layer.objects:
            ob.select_set(False)
        for ob in objs:
            ob.select_set(True)
        view_layer.objects.active = self.joined
        r = bpy.ops.object.mode_set(mode='EDIT')
        log('edit mode', r, bpy.context.mode, [ob.mode for ob in objs],
            'hidden faces', sum(p.hide for p in self.joined.data.polygons))
        bpy.ops.mesh.reveal()
        bpy.ops.mesh.select_all(action='SELECT')
        t = time.perf_counter()
        # Smart UV Project keeps every island at its world scale (one texel
        # density for all objects). Its own island_margin is scaled by island
        # count and starves ~12k islands, so pack again with an exact gap.
        r = bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.0,
                                     area_weight=0.0, correct_aspect=False, scale_to_bounds=False)
        self.stats['smartProjectSeconds'] = round(time.perf_counter() - t, 2)
        log('smart project %.1fs' % (time.perf_counter() - t), r)
        gap = self.margin / self.size
        bpy.ops.uv.select_all(action='SELECT')
        t = time.perf_counter()
        r = bpy.ops.uv.pack_islands(udim_source='CLOSEST_UDIM', rotate=True, scale=True,
                                    margin_method='FRACTION', margin=gap, shape_method='AABB')
        self.stats['packSeconds'] = round(time.perf_counter() - t, 2)
        self.stats['packGapPixels'] = self.margin
        log('pack islands (exact %d px gap) %.1fs' % (self.margin, time.perf_counter() - t), r)
        bpy.ops.object.mode_set(mode='OBJECT')
        mesh = self.joined.data
        L = len(mesh.loops)
        uv = np.empty(L * 2, np.float64)
        mesh.uv_layers['Lightmap'].data.foreach_get('uv', uv)
        if not (uv.min() >= -1e-4 and uv.max() <= 1 + 1e-4 and uv.max() - uv.min() > .5):
            raise RuntimeError('Lightmap unwrap left UVs outside the atlas or collapsed: %.4f..%.4f'
                               % (uv.min(), uv.max()))
        uv = np.clip(uv.reshape(-1, 2), 0, 1 - 1e-6)
        # UV and 3D areas for the texel density.
        P = len(mesh.polygons)
        starts = np.empty(P, np.int64); mesh.polygons.foreach_get('loop_start', starts)
        totals = np.empty(P, np.int64); mesh.polygons.foreach_get('loop_total', totals)
        nxt = np.arange(1, L + 1)
        nxt[starts + totals - 1] = starts
        cross = uv[:, 0] * uv[nxt, 1] - uv[:, 1] * uv[nxt, 0]
        face_uv_area = np.abs(np.add.reduceat(cross, starts)) / 2
        uv_area = float(face_uv_area.sum())
        area = np.empty(P, np.float64); mesh.polygons.foreach_get('area', area)
        area3d = float(area.sum())
        # Per-object texel density; outliers point at collapsed or bloated islands.
        density = uv_area / max(area3d, 1e-12)
        outliers = []
        for obj, (first, count, _) in self.faces.items():
            a = float(area[first:first + count].sum())
            if a < 1e-6:
                continue
            ratio = float(face_uv_area[first:first + count].sum()) / a / density
            if not .5 <= ratio <= 2:
                outliers.append((round(ratio, 3), obj, round(a, 3)))
        outliers.sort()
        self.stats['densityOutliers'] = [o[1] for o in outliers][:40]
        log('density outliers (ratio to mean, object, m2): %d' % len(outliers), outliers[:12], outliers[-12:])
        self.face_uv = np.add.reduceat(uv, starts, axis=0) / totals[:, None]
        self.face_area = area
        for name, inv in list(self.loop_uvs.items()):
            self.loop_uvs[name] = uv[inv].ravel().tolist()
        # UV islands (faces sharing a vertex with the same UV) for the
        # island-aware denoise; the floor proxy faces follow as their own ids.
        t = time.perf_counter()
        vi = np.empty(L, np.int64); mesh.loops.foreach_get('vertex_index', vi)
        q = np.round(uv * (1 << 20)).astype(np.int64)
        key = (vi << 42) ^ (q[:, 0] << 21) ^ q[:, 1]
        poly_of = np.repeat(np.arange(P), totals)
        order = np.argsort(key, kind='stable')
        ks, ps = key[order], poly_of[order]
        same = np.flatnonzero(ks[1:] == ks[:-1])
        parent = np.arange(P)
        def find(a):
            root = a
            while parent[root] != root:
                root = parent[root]
            while parent[a] != root:
                parent[a], a = root, parent[a]
            return root
        for k in same:
            a, b = find(ps[k]), find(ps[k + 1])
            if a != b:
                parent[max(a, b)] = min(a, b)
        roots = np.array([find(p) for p in range(P)])
        _, self.face_island = np.unique(roots, return_inverse=True)
        self.islands = int(self.face_island.max()) + 1
        self.stats['islands'] = self.islands
        face_oid = np.zeros(P, np.int64)
        for obj, (first, count, _) in self.faces.items():
            face_oid[first:first + count] = self.oid[obj]
        # Island id (as baked: joined islands 1..n, floor proxy faces after) -> object id.
        self.island_owner = np.zeros(self.islands + 1 + len(self.proxy.data.polygons), np.int64)
        self.island_owner[self.face_island + 1] = face_oid
        log('islands: %d (%.1fs)' % (self.islands, time.perf_counter() - t))
        pdata = self.proxy.data
        puv = pdata.uv_layers['Lightmap'].data
        for region, (face, (x0, y0, x1, y1, z)) in self.proxy_rects.items():
            poly = pdata.polygons[face]
            corners = {pdata.loops[i].vertex_index - poly.vertices[0]: tuple(puv[i].uv) for i in poly.loop_indices}
            (u0, v0), (u1, v1), (u3, v3) = corners[0], corners[1], corners[3]
            # uv = P0 + s * (P1 - P0) + t * (P3 - P0), s/t across the rectangle
            self.region_affine[region] = (x0, y0, x1 - x0, y1 - y0, u0, v0, u1 - u0, v1 - v0, u3 - u0, v3 - v0)
            self.stats.setdefault('floorTexelsPerMetre', {})[region] = round(
                math.hypot(u1 - u0, v1 - v0) * self.size / (x1 - x0), 2)
            self.stats.setdefault('floorRectUV', {})[region] = [round(min(u0, u1, u3), 4), round(min(v0, v1, v3), 4),
                                                                round(max(u0, u1, u3), 4), round(max(v0, v1, v3), 4)]
            uv_area += abs((u1 - u0) * (v3 - v0) - (v1 - v0) * (u3 - u0))
            area3d += (x1 - x0) * (y1 - y0)
        self.stats['uvCoverage'] = round(uv_area, 4)
        self.stats['surfaceSquareMetres'] = round(area3d, 1)
        self.stats['texelsPerMetre'] = round(self.size * math.sqrt(uv_area / max(area3d, 1e-9)), 2)
        log('uv coverage %.4f of the atlas, %.1f m2, %.1f texels/m, floors %s'
            % (uv_area, area3d, self.stats['texelsPerMetre'], self.stats.get('floorTexelsPerMetre')))
        # Fail fast: never bake or write an empty or collapsed layout.
        if uv_area < .1 or self.stats['texelsPerMetre'] < 4 or any(
                v < 4 for v in self.stats.get('floorTexelsPerMetre', {}).values()):
            raise RuntimeError('Lightmap layout is degenerate: %s' % json.dumps(self.stats))

    # -- export-loop hooks --------------------------------------------
    def object_uvs(self, o, mesh, verts):
        """A function(vertex_index, loop_index) -> (u, v), or None if unbaked."""
        if o.name in self.planar:
            x0, y0, dx, dy, u0, v0, aux, avx, buy, bvy = self.region_affine[self.planar[o.name]]
            def planar(i, loop):
                p = verts[i]
                s, t = (p.x - x0) / dx, (p.y - y0) / dy
                return (min(1 - 1e-6, max(0.0, u0 + s * aux + t * buy)),
                        min(1 - 1e-6, max(0.0, v0 + s * avx + t * bvy)))
            return planar
        flat = self.loop_uvs.get(o.name)
        if flat is None:
            return None
        import numpy as np
        lv = np.empty(len(mesh.loops), np.int64)
        mesh.loops.foreach_get('vertex_index', lv)
        expected = self.loop_pos[o.name]
        exported = np.array([tuple(verts[i]) for i in lv], np.float32).reshape(-1, 3)
        if len(flat) != 2 * len(mesh.loops) or exported.shape != expected.shape or \
                float(np.abs(exported - expected).max(initial=0)) > 2e-4:
            # Never map a receiver whose export differs from its bake geometry.
            self.stats['loopMismatches'].append(o.name)
            log('loop mismatch, left unbaked:', o.name)
            return None
        return lambda i, loop: (flat[2 * loop], flat[2 * loop + 1])

    def triangle_uvs(self, fn, corners, usable):
        """Corner UVs of one source triangle, or None (sentinel) when the
        triangle is unbaked or has no area in the atlas (e.g. board sides)."""
        if fn is None or not usable:
            return None
        uvs = [fn(i, loop) for i, loop in corners]
        (u0, v0), (u1, v1), (u2, v2) = uvs
        if abs((u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0)) * self.size * self.size < 1e-6:
            self.stats['zeroAreaTriangles'] = self.stats.get('zeroAreaTriangles', 0) + 1
            return None
        return uvs

    def clip_overlap(self, name, triangle, uvs):
        """None for an (AO-refined) triangle lying where two solids overlap."""
        boxes = self.overlap_boxes.get(name)
        if uvs is None or not boxes:
            return uvs
        # Browser (X, Z, -Y) back to Blender (X, Y, Z).
        x = sum(c[0] for c in triangle) / 3
        y = -sum(c[2] for c in triangle) / 3
        z = sum(c[1] for c in triangle) / 3
        for lo, hi in boxes:
            if lo[0] <= x <= hi[0] and lo[1] <= y <= hi[1] and lo[2] <= z <= hi[2]:
                self.stats['overlapTriangles'] = self.stats.get('overlapTriangles', 0) + 1
                return None
        return uvs

    def extend(self, out, owner, oid, point, positions, uvs):
        if uvs is None:
            out.extend((SENTINEL, SENTINEL))
            owner.append(0)
        else:
            out.extend(encode_uv(*barycentric_uv(point, positions, uvs)))
            owner.append(oid)

    def finalize(self, light, owner):
        """After the bake: drop receivers dark in both states, and every
        triangle whose UV (centroid or inset corners) does not land on a texel
        of its own object's island (sub-texel slivers would read a gutter)."""
        import array
        import numpy as np
        uv = np.frombuffer(light.tobytes(), np.uint16).astype(np.int64).reshape(-1, 3, 2)
        own = np.frombuffer(owner.tobytes(), np.uint32).astype(np.int64).reshape(-1, 3)[:, 0]
        keep = (uv != SENTINEL).all(axis=(1, 2))
        if self.dark_ids:
            dark = keep & np.isin(own, sorted(self.dark_ids))
            self.stats['darkTriangles'] = self.stats.get('darkTriangles', 0) + int(dark.sum())
            keep &= ~dark
        if keep.any():
            idx = np.flatnonzero(keep)
            p = uv[idx].astype(np.float64) / 65535 * self.size
            c = p.mean(1, keepdims=True)
            pts = np.concatenate([c, c + .7 * (p - c)], axis=1)
            ij = np.clip(pts.astype(np.int64), 0, self.size - 1)
            ids = self.id_map[ij[..., 1], ij[..., 0]]
            o = own[idx][:, None]
            owner_of = self.island_owner[np.clip(ids, 0, len(self.island_owner) - 1)]
            on_object = (ids > 0) & (ids <= self.islands) & (owner_of == o) & (o > 0)
            on_floor = (o == 0) & (ids > self.islands)
            bad = ~(on_object | on_floor).any(1)
            self.stats['offIslandTriangles'] = self.stats.get('offIslandTriangles', 0) + int(bad.sum())
            keep[idx[bad]] = False
        uv[~keep] = SENTINEL
        baked = int(keep.sum()) * 3
        self.stats['bakedVertices'] += baked
        self.stats['sentinelVertices'] += len(own) * 3 - baked
        out = array.array('H')
        out.frombytes(uv.astype(np.uint16).tobytes())
        return out

    # -- bake -------------------------------------------------------------
    def bake(self, scene, export_matrix, exportable, practical_light):
        import bpy
        import numpy as np
        view_layer = bpy.context.view_layer
        state = {}
        log('bake setup')
        # Visibility: exactly what the browser export draws is visible to rays.
        for c in bpy.data.collections:
            if c is self.collection:
                continue
            state[('coll', c.name)] = c.hide_render
            c.hide_render = 'label' in c.name.lower()
        posed = 0
        for o in scene.objects:
            if o.get('lightmap_copy'):
                continue
            if o.type in {'MESH', 'CURVE'}:
                state[('obj', o.name)] = o.hide_render
                o.hide_render = not exportable(o)
                m = export_matrix(o)
                if m != o.matrix_world:
                    state[('mat', o.name)] = o.matrix_world.copy()
                    o.matrix_world = m
                    posed += 1
            elif o.type == 'FONT':
                state[('obj', o.name)] = o.hide_render
                o.hide_render = True
        for o in self.receivers + self.hide_for_bake:
            o.hide_render = True
        lights = [o for o in scene.objects if o.type == 'LIGHT']
        for o in lights:
            state[('obj', o.name)] = o.hide_render
        emitters = []
        for mat in bpy.data.materials:
            if not (mat.use_nodes and mat.node_tree):
                continue
            for n in mat.node_tree.nodes:
                if n.type == 'BSDF_PRINCIPLED':
                    s = n.inputs['Emission Strength']
                    if not s.is_linked and s.default_value > 0 and any(n.inputs['Emission Color'].default_value[:3]):
                        emitters.append((s, s.default_value))
        # Window panes: with refractive caustics off (photoreal.py) a glass BSDF
        # stops every diffuse -> glass -> sky path, so an indirect bake would
        # see almost no daylight indoors. While baking, panes become a clear
        # Transparent BSDF at 92 % (about a pane's loss); the browser draws them
        # as alpha panes too.
        glass = []
        for mat in bpy.data.materials:
            if mat.use_nodes and mat.node_tree and self.finish_of(mat)['surface'] == 'glass':
                out = next((n for n in mat.node_tree.nodes if n.type == 'OUTPUT_MATERIAL' and n.is_active_output), None)
                if out is None:
                    continue
                old = out.inputs['Surface'].links[0].from_socket if out.inputs['Surface'].is_linked else None
                clear = mat.node_tree.nodes.new('ShaderNodeBsdfTransparent')
                clear.inputs['Color'].default_value = (.92, .92, .92, 1)
                mat.node_tree.links.new(clear.outputs[0], out.inputs['Surface'])
                glass.append((mat, out, old, clear))
        self.stats['glassAsTransparent'] = sorted(m.name for m, *_ in glass)
        # Bake target: one float image, an active image node in every material.
        img = bpy.data.images.new('Lightmap bake (temporary)', self.size, self.size, alpha=True, float_buffer=True)
        nodes, converted = [], 0
        mats = {m for m in list(self.joined.data.materials) + list(self.proxy.data.materials) if m}
        for mat in mats:
            if not mat.use_nodes:
                mat.use_nodes = True
                converted += 1
            node = mat.node_tree.nodes.new('ShaderNodeTexImage')
            node.image = img
            node.interpolation = 'Closest'
            mat.node_tree.nodes.active = node
            nodes.append((mat, node))
        self.stats['materialsConvertedToNodes'] = converted
        self.stats['posedObjects'] = posed
        scene.render.engine = 'CYCLES'
        # photoreal.py keeps persistent render data; a bake after a render
        # would reuse that session and silently write nothing.
        state[('persistent', None)] = scene.render.use_persistent_data
        scene.render.use_persistent_data = False
        scene.cycles.samples = self.samples
        scene.cycles.use_denoising = False
        sun = scene.objects.get('Soft daylight sun')
        world_day = scene.world
        world_night = bpy.data.worlds.new('Lightmap night sky (temporary)')
        world_night.use_nodes = True
        bg = world_night.node_tree.nodes['Background']
        bg.inputs['Color'].default_value = (*NIGHT_SKY, 1)
        bg.inputs['Strength'].default_value = 1.0
        # Day = photoreal.py's interior views (photoreal_view(name, exterior=False)):
        # sky, sun, every practical lamp, ceiling fill and window-area light,
        # emissive bulbs on; only the cutaway/plan studio softboxes are off.
        practical = [o for o in lights if practical_light(o.name, o.data.type, o.data.energy)]
        day_lamps = practical + ([sun] if sun else [])
        night_lamps = [o for o in practical if 'daylight' not in o.name.lower()]
        self.stats['day'] = ('photoreal interior view: Nishita sky world "%s" (strength 1.4) + "Soft daylight sun" '
                             '+ %d practical/fill/window-area lamps + %d emissive shaders; studio softboxes off'
                             % (world_day.name, len(practical), len(emitters)))
        self.stats['night'] = ('%d practical lamps (daylight-named window-area lights and studio softboxes off) '
                               '+ %d emissive shaders (bulbs, diffusers, fairy lights); sun off; flat night sky %s'
                               % (len(night_lamps), len(emitters), list(NIGHT_SKY)))
        self.stats['dayOnlyLamps'] = sorted(o.name for o in day_lamps if o not in night_lamps)
        self.stats['nightLamps'] = sorted(o.name for o in night_lamps)
        self.stats['visibility'] = ('all collections render-visible as exported (ceilings, cutaway walls, roofs, '
                                    'basement/garage/pink ceilings); label collections, text, export=False '
                                    'render-only leaves, studio softboxes, replaced receivers and flat floor '
                                    'dressing hidden; walkthrough pose applied to %d objects' % posed)
        log('bake setup done: %d materials with bake node, %d posed objects, %d night lamps, %d emitters'
            % (len(mats), posed, len(night_lamps), len(emitters)))
        try:
            if self.probe_names:
                self.probe(scene, self.probe_names)
            self.id_map = self.bake_ids(scene, img)
            if self.reuse_raw:
                # Re-export/re-encode an earlier bake: only if the layout is identical.
                saved = np.load(self.reuse_raw / 'ids.npy')
                if saved.shape != self.id_map.shape or not np.array_equal(saved, self.id_map):
                    raise RuntimeError('Lightmap layout differs from %s; bake again' % self.reuse_raw)
                meta_path = self.reuse_raw / 'meta.json'
                meta = json.loads(meta_path.read_text()) if meta_path.exists() else {}
                for name in ('day', 'night'):
                    px = np.load(self.reuse_raw / ('%s.npy' % name))
                    self.receiver_report(px, name)
                    self.pages[name] = dict(pixels=px, seconds=meta.get(name, 0))
                self.stats['reusedRawBake'] = self.reuse_raw.name
                log('reused raw bake from', self.reuse_raw, '(island ids identical)')
                self.exclude_dark()
                return
            for name in ('day', 'night'):
                scene.world = world_day if name == 'day' else world_night
                on = day_lamps if name == 'day' else night_lamps
                for o in lights:
                    o.hide_render = o not in on
                if self.debug_cameras:
                    self.debug_render(scene, name)
                # One bake call per target: a multi-object bake into one image
                # keeps only the last object's texels. Composite by coverage.
                px = np.zeros((self.size, self.size, 4), np.float32)
                seconds = 0.0
                for target in (self.joined, self.proxy):
                    for ob in view_layer.objects:
                        ob.select_set(ob is target)
                    view_layer.objects.active = target
                    pixels = np.zeros(self.size * self.size * 4, np.float32)
                    img.pixels.foreach_set(pixels)
                    log('bake %s %s start (%d samples, %d px)' % (name, target.name, self.samples, self.size))
                    t = time.perf_counter()
                    bpy.ops.object.bake(type='DIFFUSE', pass_filter={'INDIRECT'}, margin=0,
                                        use_clear=False, target='IMAGE_TEXTURES', use_selected_to_active=False)
                    seconds += time.perf_counter() - t
                    img.pixels.foreach_get(pixels)
                    part = pixels.reshape(self.size, self.size, 4)
                    mask = part[..., 3] > .5
                    px[mask] = part[mask]
                    log('bake %s %s done %.1fs: %.4f of texels' % (name, target.name, time.perf_counter() - t, mask.mean()))
                written = px[..., 3] > .5
                lit = written & (px[..., :3].max(2) > 0)
                self.receiver_report(px, name)
                log('bake %s done %.1fs: %.4f of texels written, %.4f nonzero, mean %.5f'
                    % (name, seconds, written.mean(), lit.mean(), float(px[..., :3][written].mean()) if written.any() else 0))
                for region, rect in self.stats.get('floorRectUV', {}).items():
                    u0, v0, u1, v1 = (int(r * self.size) for r in rect)
                    w_ = written[v0 + 2:v1 - 2, u0 + 2:u1 - 2]
                    l_ = lit[v0 + 2:v1 - 2, u0 + 2:u1 - 2]
                    log('floor proxy %s: %.3f written, %.3f nonzero' % (region, w_.mean(), l_.mean()))
                if self.preview_dir:
                    self.preview(px, written, name)
                if written.mean() < .05 or lit.sum() < written.sum() * (.2 if name == 'day' else .05):
                    raise RuntimeError('Lightmap %s bake is empty; nothing written' % name)
                self.pages[name] = dict(pixels=px, seconds=round(seconds, 1))
            self.exclude_dark()
        finally:
            scene.world = world_day
            for mat, node in nodes:
                mat.node_tree.nodes.remove(node)
            for mat, out, old, clear in glass:
                mat.node_tree.nodes.remove(clear)
                if old is not None:
                    mat.node_tree.links.new(old, out.inputs['Surface'])
            for key, value in state.items():
                kind, name = key
                if kind == 'persistent':
                    scene.render.use_persistent_data = value
                elif kind == 'coll':
                    bpy.data.collections[name].hide_render = value
                elif kind == 'mat':
                    scene.objects[name].matrix_world = value
                else:
                    scene.objects[name].hide_render = value
            for o in self.hide_for_bake:
                o.hide_render = False
            bpy.data.images.remove(img)
            bpy.data.worlds.remove(world_night)

    def bake_ids(self, scene, img):
        """Bake a UV-island id map (emission of a face attribute), 1 sample."""
        import bpy
        import numpy as np
        t = time.perf_counter()
        mat = bpy.data.materials.new('Lightmap island id (temporary)')
        mat.use_nodes = True
        nt = mat.node_tree
        nt.nodes.clear()
        attr = nt.nodes.new('ShaderNodeAttribute')
        attr.attribute_name = 'lm_island'
        emit = nt.nodes.new('ShaderNodeEmission')
        out = nt.nodes.new('ShaderNodeOutputMaterial')
        node = nt.nodes.new('ShaderNodeTexImage')
        node.image = img
        node.interpolation = 'Closest'
        nt.nodes.active = node
        nt.links.new(attr.outputs['Color'], emit.inputs['Color'])
        nt.links.new(emit.outputs[0], out.inputs['Surface'])
        ids_px = np.zeros((self.size, self.size), np.int64)
        samples = scene.cycles.samples
        scene.cycles.samples = 1
        view_layer = bpy.context.view_layer
        made = []
        try:
            proxy_ids = self.islands + 1 + np.arange(len(self.proxy.data.polygons))
            for src, ids in ((self.joined, self.face_island + 1), (self.proxy, proxy_ids)):
                mesh = src.data.copy()
                mesh.materials.clear()
                mesh.materials.append(mat)
                mesh.polygons.foreach_set('material_index', np.zeros(len(mesh.polygons), np.int32))
                a = mesh.attributes.new('lm_island', 'FLOAT_COLOR', 'FACE')
                col = np.zeros((len(ids), 4), np.float32)
                col[:, 0] = (ids & 1023) / 1023
                col[:, 1] = ((ids >> 10) & 1023) / 1023
                col[:, 3] = 1
                a.data.foreach_set('color', col.ravel())
                ob = bpy.data.objects.new(src.name + ' ids', mesh)
                ob['lightmap_copy'] = True
                for flag in RAY_FLAGS:
                    setattr(ob, flag, flag == 'visible_camera')
                self.collection.objects.link(ob)
                made.append(ob)
                view_layer.update()
                for o in view_layer.objects:
                    o.select_set(o is ob)
                view_layer.objects.active = ob
                img.pixels.foreach_set(np.zeros(self.size * self.size * 4, np.float32))
                bpy.ops.object.bake(type='EMIT', margin=0, use_clear=False, target='IMAGE_TEXTURES')
                px = np.empty(self.size * self.size * 4, np.float32)
                img.pixels.foreach_get(px)
                px = px.reshape(self.size, self.size, 4)
                got = px[..., 3] > .5
                value = np.round(px[..., 0] * 1023).astype(np.int64) + (np.round(px[..., 1] * 1023).astype(np.int64) << 10)
                ids_px[got] = value[got]
                ob.hide_render = True
        finally:
            scene.cycles.samples = samples
            for ob in made:
                mesh = ob.data
                bpy.data.objects.remove(ob)
                bpy.data.meshes.remove(mesh)
            bpy.data.materials.remove(mat)
        log('island id bake %.1fs: %d ids on %.4f of texels' % (time.perf_counter() - t, len(np.unique(ids_px)) - 1,
                                                                (ids_px > 0).mean()))
        return ids_px

    def exclude_dark(self):
        excluded = sorted(obj for obj, d in self.dark.items() if len(d) == 2 and min(d) >= .9)
        self.dark_ids = {self.oid[obj] for obj in excluded}
        self.stats['excludedDark'] = excluded
        log('receivers dark in both states, left unbaked: %d' % len(excluded), excluded[:40])

    def probe(self, scene, names):
        """Debug: from the largest face of each named receiver, cast a few
        rays through the bake scene and print what they hit first."""
        import bpy
        from mathutils import Vector
        hidden = [o for o in self.receivers + self.hide_for_bake if not o.hide_viewport]
        for o in hidden:
            o.hide_viewport = True
        try:
            bpy.context.view_layer.update()
            dg = bpy.context.evaluated_depsgraph_get()
            mesh = self.joined.data
            for name in names:
                if name not in self.faces:
                    log('probe: not a receiver:', name)
                    continue
                first, count, _ = self.faces[name]
                best = max(range(first, first + count), key=lambda k: mesh.polygons[k].area)
                poly = mesh.polygons[best]
                c, n = Vector(poly.center), Vector(poly.normal)
                side = n.orthogonal().normalized()
                hits = []
                for d in (n, (n + side).normalized(), (n - side).normalized(),
                          (n + n.cross(side)).normalized(), (n - n.cross(side)).normalized()):
                    ok, loc, _, _, ob, _ = scene.ray_cast(dg, c + n * 1e-4, d)
                    hits.append('%s@%.3f' % (ob.name if ok else 'sky', (loc - c).length if ok else -1))
                log('probe %s face %d centre %s normal %s -> %s' % (
                    name, best, tuple(round(v, 3) for v in c), tuple(round(v, 2) for v in n), hits))
        finally:
            for o in hidden:
                o.hide_viewport = False
            bpy.context.view_layer.update()

    def receiver_report(self, px, name):
        """Per-object baked light at face centroids: find black or odd receivers."""
        import numpy as np
        ij = np.clip((self.face_uv * self.size).astype(np.int64), 0, self.size - 1)
        value = px[ij[:, 1], ij[:, 0], :3].max(1)
        rows = []
        for obj, (first, count, area) in self.faces.items():
            a = self.face_area[first:first + count]
            v = value[first:first + count]
            mean = float((a * v).sum() / max(a.sum(), 1e-12))
            dark = float(a[v <= 0].sum() / max(a.sum(), 1e-12))
            rows.append((area, obj, mean, dark))
            self.dark.setdefault(obj, []).append(dark)
        rows.sort(reverse=True)
        black = [r for r in rows if r[2] <= 0]
        log('%s receivers: %d of %d objects fully black (%.1f m2 of %.1f m2)'
            % (name, len(black), len(rows), sum(r[0] for r in black), sum(r[0] for r in rows)))
        for area, obj, mean, dark in rows[:20]:
            log('  %-48s %7.2f m2 mean %.4f dark %.2f' % (obj[:48], area, mean, dark))

    def debug_render(self, scene, name):
        """Private low-res camera check of the exact bake scene (receivers joined)."""
        import bpy
        r = scene.render
        saved = (scene.camera, r.resolution_x, r.resolution_y, r.resolution_percentage, r.filepath,
                 scene.cycles.samples, r.image_settings.file_format)
        self.proxy.visible_camera = False
        try:
            for cam in self.debug_cameras:
                camera = scene.objects.get('Camera | ' + cam)
                if camera is None:
                    log('debug render: no camera', cam)
                    continue
                scene.camera = camera
                r.resolution_x, r.resolution_y, r.resolution_percentage = 432, 300, 100
                scene.cycles.samples = 16
                r.image_settings.file_format = 'PNG'
                self.preview_dir.mkdir(parents=True, exist_ok=True)
                r.filepath = str(self.preview_dir / ('%s-render-%s-%s.png' % (self.preview_tag, name, cam)))
                t = time.perf_counter()
                bpy.ops.render.render(write_still=True)
                log('debug render %s %s %.1fs -> %s' % (name, cam, time.perf_counter() - t, r.filepath))
        finally:
            self.proxy.visible_camera = True
            (scene.camera, r.resolution_x, r.resolution_y, r.resolution_percentage, r.filepath,
             scene.cycles.samples, r.image_settings.file_format) = saved

    def preview(self, px, written, name):
        """Private sanity image: tone-mapped raw bake, unwritten texels magenta."""
        import numpy as np
        rgb = np.maximum(px[..., :3], 0)
        lum = rgb[written].max(1) if written.any() else np.ones(1)
        ref = max(float(np.percentile(lum, 95)), 1e-6)
        v = rgb / ref
        v = (v / (1 + v)) ** (1 / 2.2) * 1.6
        v[~written] = (.35, 0, .35)
        img = (np.clip(v, 0, 1) * 255 + .5).astype(np.uint8)[::-1]
        step = max(1, self.size // 1024)
        img = np.ascontiguousarray(img[::step, ::step])
        self.preview_dir.mkdir(parents=True, exist_ok=True)
        path = self.preview_dir / ('%s-%s-%dpx-%dspp.png' % (self.preview_tag, name, self.size, self.samples))
        path.write_bytes(png_bytes(img))
        log('preview', path, 'p95 %.5f' % ref)

    def write(self, out, mesh_sha, vertex_count, uv_bytes, peak_memory=None):
        import numpy as np
        if len(uv_bytes) != vertex_count * 4:
            raise RuntimeError('Lightmap UV and mesh vertex counts disagree')
        pages = []
        seconds = 0.0
        for name in ('day', 'night'):
            t = time.perf_counter()
            px = self.pages[name]['pixels']
            mask = px[..., 3] > .5
            rgb = np.maximum(px[..., :3], 0).astype(np.float32)
            if self.raw_dir:
                self.raw_dir.mkdir(parents=True, exist_ok=True)
                np.save(self.raw_dir / ('%s.npy' % name), px)
                np.save(self.raw_dir / 'ids.npy', self.id_map.astype(np.int32))
                (self.raw_dir / 'meta.json').write_text(json.dumps(
                    {k: v['seconds'] for k, v in self.pages.items()}))
            ids = np.where(mask, self.id_map, 0)
            self.stats[name + 'TexelsWithoutId'] = round(float((mask & (self.id_map == 0)).mean()), 5)
            for _ in range(self.blur):
                rgb = island_denoise(rgb, ids, self.sigma)
            lum = rgb[mask].max(1) if mask.any() else np.zeros(1)
            scale = float(max(np.percentile(lum, 99.7), 1e-4))
            clipped = float((lum > scale).mean())
            rgb = dilate(rgb, mask, max(8, self.margin))
            v = np.clip(rgb / scale, 0, 1) ** (1 / 2.2)
            rgb8 = (v * 255 + .5).astype(np.uint8)[::-1]  # PNG top row = v near 1
            data = png_bytes(np.ascontiguousarray(rgb8))
            path = out / ('house.light.%s.png' % name)
            path.write_bytes(data)
            seconds += self.pages[name]['seconds']
            pages.append(dict(id=name, url=path.name, width=self.size, height=self.size,
                              sha256=hashlib.sha256(data).hexdigest(), scale=round(scale, 6)))
            self.stats[name + 'Seconds'] = self.pages[name]['seconds']
            self.stats[name + 'Coverage'] = round(float(mask.mean()), 4)
            self.stats[name + 'Clipped'] = round(clipped, 5)
            self.stats[name + 'Median'] = round(float(np.median(lum)), 6)
            self.stats[name + 'Bytes'] = len(data)
            for region, rect in self.stats.get('floorRectUV', {}).items():
                u0, v0, u1, v1 = (int(r * self.size) for r in rect)
                self.stats.setdefault(name + 'FloorCoverage', {})[region] = round(
                    float(mask[v0 + 1:v1 - 1, u0 + 1:u1 - 1].mean()), 4)
            log('encode %s %.1fs scale %.5f, %d bytes' % (name, time.perf_counter() - t, scale, len(data)))
        with gzip.GzipFile(filename=str(out / 'house.lightuv.gz'), mode='wb', mtime=0) as f:
            f.write(uv_bytes)
        baked = self.stats['bakedVertices']
        skip = {'day', 'night', 'objects', 'texelsPerMetre', 'bakedVertices', 'sentinelVertices'}
        bake = dict(samples=self.samples, margin=self.margin, seconds=round(seconds, 1),
                    objects=self.stats['objects'], texelsPerMetre=self.stats['texelsPerMetre'],
                    day=self.stats['day'], night=self.stats['night'],
                    denoise=('island-aware gaussian (same UV island only), sigma %.1f px x %d passes'
                             % (self.sigma, self.blur)) if self.blur else 'none',
                    peakWorkingSetMiB=peak_memory,
                    **{k: v for k, v in self.stats.items() if k not in skip})
        return dict(version=1, meshSha256=mesh_sha,
                    uv=dict(url='house.lightuv.gz', encoding='uint16-pair', vertexCount=vertex_count,
                            bakedVertices=baked, sha256=hashlib.sha256(uv_bytes).hexdigest()),
                    pages=pages, encoding='gamma2.2', rooms=list(self.rooms), bake=bake)

    def cleanup(self):
        import bpy
        for ob in (self.joined, self.proxy):
            if ob is not None:
                mesh = ob.data
                bpy.data.objects.remove(ob)
                bpy.data.meshes.remove(mesh)
        if self.collection is not None:
            bpy.data.collections.remove(self.collection)
